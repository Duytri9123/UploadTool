let currentUser  = null;
let allVideos    = [];   // tất cả video đã load
let filtered     = [];   // sau filter
let selected     = new Set();
let _elapsedInterval = null;
let _loadingVideos   = false;
let _hasMore         = false;
let _cursor          = 0;
let _page            = 0;
let _currentUrl      = '';
let _observer        = null;

// ── elapsed timer ─────────────────────────────────────────────────────────────
function startElapsed(labelEl, barEl, timerEl) {
  const start = Date.now();
  const stages = [
    {at:0,    label:'Connecting to Douyin API…', pct:5},
    {at:1500, label:'Fetching user profile…',    pct:30},
    {at:3000, label:'Loading recent videos…',    pct:60},
    {at:5000, label:'Processing data…',          pct:85},
  ];
  let idx = 0;
  _elapsedInterval = setInterval(() => {
    const ms = Date.now() - start;
    timerEl.textContent = (ms/1000).toFixed(1) + 's';
    while (idx < stages.length && ms >= stages[idx].at) {
      labelEl.textContent = stages[idx].label;
      barEl.style.width   = stages[idx].pct + '%';
      idx++;
    }
  }, 100);
}
function stopElapsed(barEl) { clearInterval(_elapsedInterval); barEl.style.width = '100%'; }

// ── search user ───────────────────────────────────────────────────────────────
async function searchUser() {
  const url = document.getElementById('user-url').value.trim();
  if (!url) { toast('Enter a URL first', 'error'); return; }

  // reset state
  allVideos = []; filtered = []; selected = new Set();
  _hasMore = false; _cursor = 0; _page = 0; _currentUrl = url;
  disconnectObserver();

  document.getElementById('user-result').style.display  = 'none';
  document.getElementById('user-videos').style.display  = 'none';
  document.getElementById('user-error').style.display   = 'none';
  document.getElementById('user-loading').style.display = 'block';
  document.getElementById('video-grid').innerHTML       = '';
  document.getElementById('btn-search').disabled = true;

  const barFill = document.getElementById('loading-bar-fill');
  startElapsed(document.getElementById('loading-label'), barFill, document.getElementById('elapsed-timer'));

  try {
    const r = await API.postRaw('/api/user_info', {url});
    stopElapsed(barFill);
    if (!r.ok) { const e = await r.json(); showError(e.error||'Unknown error'); return; }
    const u = await r.json();
    currentUser = u;
    renderUserCard(u);
    document.getElementById('user-result').style.display = 'block';
    document.getElementById('user-videos').style.display = 'block';
    // render first page from user_info response
    if (u.videos?.length) {
      appendVideos(u.videos);
      _hasMore = u.has_more ?? (u.videos.length >= 20);
      _cursor  = u.next_cursor ?? 0;
    }
    setupScrollObserver();
  } catch(e) {
    stopElapsed(barFill);
    showError(e.message);
  } finally {
    document.getElementById('user-loading').style.display = 'none';
    document.getElementById('btn-search').disabled = false;
  }
}

function showError(msg) {
  document.getElementById('user-error').textContent = '✗ ' + msg;
  document.getElementById('user-error').style.display = 'block';
}

function renderUserCard(u) {
  document.getElementById('u-name').textContent      = u.nickname || '—';
  document.getElementById('u-sig').textContent       = u.signature || '';
  document.getElementById('u-aweme').textContent     = (u.aweme_count||0).toLocaleString();
  document.getElementById('u-follower').textContent  = (u.follower||0).toLocaleString();
  document.getElementById('u-following').textContent = (u.following||0).toLocaleString();
  const wrap = document.getElementById('user-avatar-wrap');
  wrap.innerHTML = u.avatar
    ? `<img class="user-avatar" src="/api/proxy_image?url=${encodeURIComponent(u.avatar)}"
        onerror="this.parentNode.innerHTML='<div class=user-avatar-placeholder>👤</div>'">`
    : '<div class="user-avatar-placeholder">👤</div>';
}

// ── infinite scroll observer ──────────────────────────────────────────────────
function setupScrollObserver() {
  disconnectObserver();
  const sentinel = document.getElementById('scroll-sentinel');
  if (!sentinel) return;
  _observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && _hasMore && !_loadingVideos) {
      loadNextPage();
    }
  }, {root: null, rootMargin: '400px', threshold: 0});
  _observer.observe(sentinel);
}

function disconnectObserver() {
  if (_observer) { _observer.disconnect(); _observer = null; }
}

// ── load next page ────────────────────────────────────────────────────────────
async function loadNextPage() {
  if (_loadingVideos || !_hasMore) return;
  _loadingVideos = true;
  _page++;

  const spinner = document.getElementById('page-spinner');
  if (spinner) spinner.style.display = 'flex';

  try {
    const r = await fetch('/api/user_videos_page', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({url: _currentUrl, cursor: _cursor, count: 20})
    });
    const data = await r.json();
    if (data.error) { showError(data.error); return; }

    if (data.videos?.length) {
      appendVideos(data.videos);
    }
    _hasMore = data.has_more ?? false;
    _cursor  = data.next_cursor ?? 0;

    const total = allVideos.length;
    document.getElementById('video-count').textContent = `(${total}${_hasMore ? '+' : ''})`;
    document.getElementById('load-status').textContent = _hasMore ? `page ${_page}…` : '✓ All loaded';
  } catch(e) {
    toast('Failed to load more: ' + e.message, 'error');
  } finally {
    _loadingVideos = false;
    const spinner = document.getElementById('page-spinner');
    if (spinner) spinner.style.display = 'none';
  }
}

// ── append videos to grid ─────────────────────────────────────────────────────
function appendVideos(videos) {
  allVideos.push(...videos);
  const grid = document.getElementById('video-grid');
  const frag = document.createDocumentFragment();
  videos.forEach(v => frag.appendChild(createVideoCard(v)));
  grid.appendChild(frag);
  document.getElementById('video-count').textContent = `(${allVideos.length}${_hasMore?'+':''})`;
}

function createVideoCard(v) {
  const thumb = v.cover ? `/api/proxy_image?url=${encodeURIComponent(v.cover)}` : '';
  const isSel = selected.has(v.aweme_id);
  const div = document.createElement('div');
  div.className = `video-card${isSel?' selected':''}`;
  div.id = 'vc-' + v.aweme_id;
  div.onclick = (e) => toggleSelect(v.aweme_id, e);
  div.innerHTML = `
    <div class="video-select-box${isSel?' checked':''}"><span>${isSel?'✓':''}</span></div>
    ${thumb
      ? `<img class="video-thumb" src="${thumb}" loading="lazy"
          onerror="this.outerHTML='<div class=video-thumb-placeholder>🎬</div>'">`
      : '<div class="video-thumb-placeholder">🎬</div>'}
    <span class="video-type-badge">${v.type==='gallery'?'🖼':'▶'} ${v.type}</span>
    ${v.duration ? `<span class="video-duration-badge">${fmtDuration(v.duration)}</span>` : ''}
    <div class="video-meta">
      <div class="video-desc">${v.desc||'(no title)'}</div>
      <div class="video-stats">
        <span>▶ ${fmtNum(v.play)}</span>
        <span>❤ ${fmtNum(v.like)}</span>
        <span>💬 ${fmtNum(v.comment)}</span>
      </div>
      <div class="video-date">${v.date}</div>
    </div>`;
  return div;
}

// ── filter (re-render from allVideos) ─────────────────────────────────────────
function applyFilter() {
  const type   = document.getElementById('filter-type').value;
  const sort   = document.getElementById('filter-sort').value;
  const search = document.getElementById('filter-search').value.toLowerCase();

  filtered = allVideos.filter(v => {
    if (type !== 'all' && v.type !== type) return false;
    if (search && !v.desc.toLowerCase().includes(search)) return false;
    return true;
  });
  filtered.sort((a,b) => {
    if (sort === 'newest')    return b.ts - a.ts;
    if (sort === 'oldest')    return a.ts - b.ts;
    if (sort === 'most_play') return b.play - a.play;
    if (sort === 'most_like') return b.like - a.like;
    return 0;
  });

  // full re-render when filter active
  const grid = document.getElementById('video-grid');
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  filtered.forEach(v => frag.appendChild(createVideoCard(v)));
  grid.appendChild(frag);
}

// ── select ────────────────────────────────────────────────────────────────────
function toggleSelect(id, e) {
  if (e.detail === 2) { window.open(`https://www.douyin.com/video/${id}`,'_blank'); return; }
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  const card = document.getElementById('vc-'+id);
  const box  = card?.querySelector('.video-select-box');
  if (card) card.classList.toggle('selected', selected.has(id));
  if (box)  { box.classList.toggle('checked', selected.has(id)); box.querySelector('span').textContent = selected.has(id)?'✓':''; }
  updateSelCount();
}

function selectAll() {
  const src = filtered.length ? filtered : allVideos;
  src.forEach(v => selected.add(v.aweme_id));
  applyFilter(); updateSelCount();
}
function selectNone() {
  selected.clear(); applyFilter(); updateSelCount();
}
function updateSelCount() {
  const btn = document.getElementById('btn-dl-selected');
  document.getElementById('sel-count').textContent = selected.size;
  btn.style.display = selected.size > 0 ? 'inline-flex' : 'none';
}

// ── download ──────────────────────────────────────────────────────────────────
async function downloadSelected() {
  if (!selected.size) return;
  const items = [...selected].map(id => {
    const v = allVideos.find(x => x.aweme_id === id);
    return {
      url:   `https://www.douyin.com/video/${id}`,
      desc:  v?.desc  || id,
      cover: v?.cover || '',
      date:  v?.date  || '',
    };
  });
  const res = await API.post('/api/queue/add', items);
  toast(`Added ${res.added} video(s) to queue`, 'success');
  // redirect to download page (don't auto-start)
  setTimeout(() => { window.location.href = '/download'; }, 800);
}
function downloadUser() {
  sessionStorage.setItem('dlUrl', document.getElementById('user-url').value.trim());
  window.location.href = '/download';
}
function addUserToConfig() {
  sessionStorage.setItem('addUrl', document.getElementById('user-url').value.trim());
  window.location.href = '/config';
}
