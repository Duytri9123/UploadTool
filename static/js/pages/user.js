// user.js - Douyin User Search (SPA mode)
let currentUser=null,pages=[],currentPage=0,_hasMore=false,_cursor=0,_currentUrl='';
let _loadingPage=false,selected=new Set(),_showVi=false,_viCache={},_elapsedInterval=null;
let _activeProvider='google';
const PAGE_SIZE=20;

// ── localStorage translate cache ──────────────────────────────────────────────
var _PROVIDER_RANK={deepseek:3,openai:2,huggingface:1,google:0};
function _providerRank(p){return _PROVIDER_RANK[p]||0;}
function _cacheKey(uid){return 'viCache_'+(uid||'_');}
function _loadViCache(uid){
  try{var r=localStorage.getItem(_cacheKey(uid));return r?JSON.parse(r):{provider:'',data:{}};}
  catch(e){return {provider:'',data:{}};}
}
function _saveViCache(uid,provider,data){
  try{localStorage.setItem(_cacheKey(uid),JSON.stringify({provider,data}));}catch(e){}
}

// ── helpers ───────────────────────────────────────────────────────────────────
function $id(id){return document.getElementById(id);}
function hide(id){var e=$id(id);if(e)e.style.display='none';}
function show(id,d){var e=$id(id);if(e)e.style.display=d||'block';}
function showError(msg){var e=$id('user-error');if(e){e.textContent='✗ '+msg;e.style.display='block';}}

function startElapsed(lbl,bar,timer){
  var start=Date.now();
  var stages=[{at:0,l:'Kết nối...',p:5},{at:1500,l:'Lấy user...',p:30},{at:3000,l:'Tải video...',p:60},{at:5000,l:'Xử lý...',p:85}];
  var i=0;
  _elapsedInterval=setInterval(function(){
    var ms=Date.now()-start;
    if(timer)timer.textContent=(ms/1000).toFixed(1)+'s';
    while(i<stages.length&&ms>=stages[i].at){if(lbl)lbl.textContent=stages[i].l;if(bar)bar.style.width=stages[i].p+'%';i++;}
  },100);
}
function stopElapsed(bar){clearInterval(_elapsedInterval);if(bar)bar.style.width='100%';}

function fmtNum(n){if(!n)return '0';if(n>=1e6)return (n/1e6).toFixed(1)+'M';if(n>=1e3)return (n/1e3).toFixed(1)+'K';return ''+n;}
function fmtDur(ms){
  if(!ms)return '';
  var sec=ms>1000?Math.round(ms/1000):ms;
  if(sec<=0)return '';
  var m=Math.floor(sec/60),s=sec%60;
  return m>0?m+':'+('0'+s).slice(-2):'0:'+('0'+s).slice(-2);
}

// ── search ────────────────────────────────────────────────────────────────────
async function searchUser(){
  var urlEl=$id('user-url');
  var url=urlEl?urlEl.value.trim():'';
  if(!url){toast('Nhập URL trước','error');return;}
  pages=[];currentPage=0;selected=new Set();_hasMore=false;_cursor=0;_currentUrl=url;
  hide('user-result');hide('user-videos');hide('user-error');show('user-loading');
  var btn=$id('btn-search');if(btn)btn.disabled=true;
  var bar=$id('loading-bar-fill');
  startElapsed($id('loading-label'),bar,$id('elapsed-timer'));
  try{
    var r=await API.postRaw('/api/user_info',{url});
    stopElapsed(bar);
    if(!r.ok){var e=await r.json();showError(e.error||'Lỗi');return;}
    var u=await r.json();
    currentUser=u;
    renderUserCard(u);
    show('user-result');show('user-videos');
    if(u.videos&&u.videos.length){
      pages.push(u.videos);
      _hasMore=u.has_more!=null?u.has_more:(u.videos.length>=PAGE_SIZE);
      _cursor=u.next_cursor||0;
    }
    // Load localStorage cache cho user này
    var uid=u.sec_uid||u.uid||url;
    var cached=_loadViCache(uid);
    _viCache=cached.data||{};
    var cachedProvider=cached.provider||'';
    // Nếu provider hiện tại tốt hơn cache thì xóa cache để re-translate
    if(cachedProvider&&_providerRank(_activeProvider)>_providerRank(cachedProvider)){
      _viCache={};
    }
    _showVi=true;
    var tog=$id('toggle-vi');if(tog)tog.checked=true;
    renderPage(0);
    translateCurrentPage();
  }catch(e){stopElapsed(bar);showError(e.message);}
  finally{hide('user-loading');if(btn)btn.disabled=false;}
}

function renderUserCard(u){
  function s(id,v){var e=$id(id);if(e)e.textContent=v;}
  s('u-name',u.nickname||'--');s('u-sig-zh',u.signature||'');s('u-sig-vi','');
  s('u-aweme',(u.aweme_count||0).toLocaleString());
  s('u-follower',(u.follower||0).toLocaleString());
  s('u-following',(u.following||0).toLocaleString());
  var wrap=$id('user-avatar-wrap');
  if(wrap){
    if(u.avatar){
      var img=document.createElement('img');
      img.className='user-avatar';img.referrerPolicy='no-referrer';img.src=u.avatar;
      img.onerror=function(){
        if(!this.dataset.t){this.dataset.t='1';this.src='/api/proxy_image?url='+encodeURIComponent(u.avatar);}
        else{this.parentNode.innerHTML='<div class="user-avatar-placeholder">?</div>';}
      };
      wrap.innerHTML='';wrap.appendChild(img);
    }else{wrap.innerHTML='<div class="user-avatar-placeholder">?</div>';}
  }
  if(u.signature){
    API.post('/api/translate',[u.signature]).then(function(r){
      if(r&&r[0]){var e=$id('u-sig-vi');if(e)e.textContent='🇻🇳 '+r[0];}
    }).catch(function(){});
  }
}

function totalPages(){
  var cnt=currentUser?currentUser.aweme_count||0:0;
  if(cnt>0)return Math.ceil(cnt/PAGE_SIZE);
  return pages.length+(_hasMore?1:0);
}

function renderPage(idx){
  currentPage=idx;
  var grid=$id('video-grid');if(!grid)return;
  grid.innerHTML='';
  var frag=document.createDocumentFragment();
  (pages[idx]||[]).forEach(function(v){frag.appendChild(createVideoCard(v));});
  grid.appendChild(frag);
  updatePagination();
  var sec=$id('user-videos');if(sec)sec.scrollIntoView({behavior:'smooth',block:'start'});
}

function updatePagination(){
  var loaded=pages.reduce(function(s,p){return s+p.length;},0);
  var tp=totalPages();
  var vc=$id('video-count');if(vc)vc.textContent='('+loaded+(_hasMore?'+':'')+')';
  var ls=$id('load-status');if(ls)ls.textContent='trang '+(currentPage+1)+'/'+tp;
  var pg=$id('pagination');if(pg)pg.style.display=(tp>1||_hasMore)?'flex':'none';
  var pi=$id('page-info');if(pi)pi.textContent='Trang '+(currentPage+1)+' / '+tp;
  var bp=$id('btn-prev');if(bp)bp.disabled=currentPage===0;
  var bn=$id('btn-next');if(bn)bn.disabled=!_hasMore&&currentPage>=pages.length-1;
}

async function goNext(){
  if(_loadingPage)return;
  var ni=currentPage+1;
  if(pages[ni]){renderPage(ni);if(_showVi)translateCurrentPage();return;}
  if(!_hasMore)return;
  _loadingPage=true;
  var sp=$id('page-spinner-inline'),bn=$id('btn-next');
  if(sp)sp.style.display='inline';if(bn)bn.disabled=true;
  try{
    var r=await fetch('/api/user_videos_page',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({url:_currentUrl,cursor:_cursor,count:PAGE_SIZE})});
    var d=await r.json();
    if(d.error){showError(d.error);return;}
    if(d.videos&&d.videos.length)pages.push(d.videos);
    _hasMore=d.has_more||false;_cursor=d.next_cursor||0;
    renderPage(ni);if(_showVi)translateCurrentPage();
  }catch(e){toast('Lỗi: '+e.message,'error');}
  finally{_loadingPage=false;if(sp)sp.style.display='none';updatePagination();}
}
function goPrev(){if(currentPage>0){renderPage(currentPage-1);if(_showVi)translateCurrentPage();}}

function toggleVietnamese(){
  _showVi=$id('toggle-vi')?$id('toggle-vi').checked:false;
  if(_showVi)translateCurrentPage();
  else{
    document.querySelectorAll('.video-desc-vi').forEach(function(e){e.style.display='none';});
    document.querySelectorAll('.video-desc-zh').forEach(function(e){e.style.display='block';});
  }
}

async function translateCurrentPage(){
  var videos=pages[currentPage]||[];
  var todo=videos.filter(function(v){return v.desc&&!_viCache[v.aweme_id];});
  if(todo.length){
    try{
      var res=await API.post('/api/translate',todo.map(function(v){return v.desc;}));
      todo.forEach(function(v,i){if(res&&res[i])_viCache[v.aweme_id]=res[i];});
      if(currentUser){
        var uid=currentUser.sec_uid||currentUser.uid||_currentUrl;
        _saveViCache(uid,_activeProvider,_viCache);
      }
    }catch(e){}
  }
  applyViToGrid();
}

function applyViToGrid(){
  (pages[currentPage]||[]).forEach(function(v){
    var vi=$id('vi-'+v.aweme_id),zh=$id('zh-'+v.aweme_id);
    var txt=_viCache[v.aweme_id]||'';
    if(vi){vi.textContent=txt?'🇻🇳 '+txt:'';vi.style.display=(_showVi&&txt)?'block':'none';}
    if(zh){zh.style.display=(_showVi&&txt)?'none':'block';}
  });
}

function createVideoCard(v){
  var isSel=selected.has(v.aweme_id);
  var dur=fmtDur(v.duration);
  var viText=_viCache[v.aweme_id]||'';
  var showZh=!(_showVi&&viText);

  var div=document.createElement('div');
  div.className='video-card'+(isSel?' selected':'');
  div.id='vc-'+v.aweme_id;
  div.onclick=function(e){toggleSelect(v.aweme_id,e);};

  var tw=document.createElement('div');
  tw.style.cssText='position:relative;width:100%;aspect-ratio:16/9;background:var(--surf3);overflow:hidden;';

  if(v.cover){
    var img=document.createElement('img');
    img.style.cssText='width:100%;height:100%;object-fit:cover;display:block;';
    img.loading='lazy';img.referrerPolicy='no-referrer';img.src=v.cover;
    img.onerror=function(){
      if(!this.dataset.t){this.dataset.t='1';this.src='/api/proxy_image?url='+encodeURIComponent(v.cover);}
      else{
        this.style.display='none';
        var ph=document.createElement('div');
        ph.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--dim);';
        ph.textContent='🎬';tw.appendChild(ph);
      }
    };
    tw.appendChild(img);
  }

  var sb=document.createElement('div');
  sb.className='video-select-box'+(isSel?' checked':'');
  sb.innerHTML='<span>'+(isSel?'✓':'')+'</span>';
  tw.appendChild(sb);

  var tb=document.createElement('span');
  tb.className='video-type-badge';
  tb.textContent=v.type==='gallery'?'Gallery':'Video';
  tw.appendChild(tb);

  if(dur){
    var db=document.createElement('span');
    db.className='video-duration-badge';db.textContent=dur;
    tw.appendChild(db);
  }
  div.appendChild(tw);

  var meta=document.createElement('div');
  meta.className='video-meta';
  meta.innerHTML=
    '<div class="video-desc-zh" id="zh-'+v.aweme_id+'" style="font-size:12px;display:'+(showZh?'block':'none')+'">'+escHtml(v.desc||'(no title)')+'</div>'+
    '<div class="video-desc-vi" id="vi-'+v.aweme_id+'" style="font-size:12px;color:var(--cyan);display:'+(_showVi&&viText?'block':'none')+'">'+
      (viText?'🇻🇳 '+escHtml(viText):'')+
    '</div>'+
    '<div class="video-stats" style="margin-top:4px;font-size:11px;color:var(--dim)">'+
      '<span>▶ '+fmtNum(v.play)+'</span> <span>❤ '+fmtNum(v.like)+'</span>'+
    '</div>'+
    '<div style="font-size:11px;color:var(--dim);margin-top:2px">'+v.date+'</div>';
  div.appendChild(meta);
  return div;
}

function escHtml(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function applyFilter(){
  var type=$id('filter-type')?$id('filter-type').value:'all';
  var sort=$id('filter-sort')?$id('filter-sort').value:'newest';
  var search=($id('filter-search')?$id('filter-search').value:'').toLowerCase();
  var vids=(pages[currentPage]||[]).slice();
  if(type!=='all')vids=vids.filter(function(v){return v.type===type;});
  if(search)vids=vids.filter(function(v){
    return (v.desc||'').toLowerCase().indexOf(search)>=0||(_viCache[v.aweme_id]||'').toLowerCase().indexOf(search)>=0;
  });
  vids.sort(function(a,b){return sort==='newest'?b.ts-a.ts:sort==='oldest'?a.ts-b.ts:sort==='most_play'?b.play-a.play:b.like-a.like;});
  var grid=$id('video-grid');if(!grid)return;
  grid.innerHTML='';
  var frag=document.createDocumentFragment();
  vids.forEach(function(v){frag.appendChild(createVideoCard(v));});
  grid.appendChild(frag);
}

function toggleSelect(id,e){
  if(e.detail===2){window.open('https://www.douyin.com/video/'+id,'_blank');return;}
  if(selected.has(id))selected.delete(id);else selected.add(id);
  var card=$id('vc-'+id),box=card?card.querySelector('.video-select-box'):null;
  if(card)card.classList.toggle('selected',selected.has(id));
  if(box){box.classList.toggle('checked',selected.has(id));var sp=box.querySelector('span');if(sp)sp.textContent=selected.has(id)?'✓':'';}
  updateSelCount();
}
function selectAll(){(pages[currentPage]||[]).forEach(function(v){selected.add(v.aweme_id);});renderPage(currentPage);updateSelCount();}
function selectNone(){selected.clear();renderPage(currentPage);updateSelCount();}
function updateSelCount(){
  var btn=$id('btn-dl-selected'),sc=$id('sel-count');
  if(sc)sc.textContent=selected.size;
  if(btn)btn.style.display=selected.size>0?'inline-flex':'none';
}

async function downloadSelected(){
  if(!selected.size)return;
  var all=pages.flat();
  var items=Array.from(selected).map(function(id){
    var v=all.find(function(x){return x.aweme_id===id;});
    return{url:'https://www.douyin.com/video/'+id,desc:v?v.desc:id,cover:v?v.cover:'',date:v?v.date:''};
  });
  var res=await API.post('/api/queue/add',items);
  toast('Đã thêm '+(res.added||0)+' video vào hàng đợi','success');
}

// SPA navigation - overridable từ spa.html
function downloadUser(){
  var url=$id('user-url')?$id('user-url').value.trim():'';
  if(typeof showTab==='function'){
    var dlInput=$id('dl-url');if(dlInput)dlInput.value=url;
    showTab('download',document.querySelector('[data-tab=download]'));
  }
}
function addUserToConfig(){
  var url=$id('user-url')?$id('user-url').value.trim():'';
  if(typeof showTab==='function'){
    var ta=$id('cfg-urls');
    if(ta&&url){
      var lines=ta.value.split('\n').map(function(s){return s.trim();}).filter(Boolean);
      if(!lines.includes(url)){lines.push(url);ta.value=lines.join('\n');}
    }
    showTab('config',document.querySelector('[data-tab=config]'));
    toast('URL đã thêm vào Config','success');
  }
}

async function loadTranslateProvider(){
  try{
    var r=await fetch('/api/translate_config');
    var d=await r.json();
    _activeProvider=d.active||'google';
    var lbl=$id('translate-provider-label'),icon=$id('translate-provider-icon');
    if(!lbl)return;
    var map={deepseek:['🤖','DeepSeek AI'],openai:['🤖','OpenAI GPT'],huggingface:['🤗','HuggingFace'],google:['🌐','Google Translate (free)']};
    var info=map[_activeProvider]||['🌐',_activeProvider];
    if(icon)icon.textContent=info[0];
    lbl.textContent='Translation: '+info[1];
  }catch(e){}
}

(function(){
  function on(id,ev,fn){var e=document.getElementById(id);if(e)e.addEventListener(ev,fn);}
  on('btn-search','click',searchUser);
  on('user-url','keydown',function(e){if(e.key==='Enter')searchUser();});
  on('btn-add-config','click',addUserToConfig);
  on('btn-dl-user','click',downloadUser);
  on('btn-select-all','click',selectAll);
  on('btn-select-none','click',selectNone);
  on('btn-dl-selected','click',downloadSelected);
  on('btn-prev','click',goPrev);
  on('btn-next','click',goNext);
  on('filter-type','change',applyFilter);
  on('filter-sort','change',applyFilter);
  on('filter-search','input',applyFilter);
  on('toggle-vi','change',toggleVietnamese);
  loadTranslateProvider();
})();
