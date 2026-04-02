let _queue = [];
let _currentIdx = -1;

// ── load queue on page load ───────────────────────────────────────────────────
async function loadQueue() {
  const data = await API.get('/api/queue');
  _queue = data || [];
  renderQueue();
}

// ── socket: queue updates from server ────────────────────────────────────────
socket.on('queue_update', data => {
  _queue = data || [];
  renderQueue();
});

// ── render queue list ─────────────────────────────────────────────────────────
function renderQueue() {
  const el = document.getElementById('queue-list');
  document.getElementById('queue-count').textContent = `(${_queue.length})`;
  if (!_queue.length) {
    el.innerHTML = '<div class="empty-queue">No items in queue.<br>Select videos from User Search.</div>';
    return;
  }
  el.innerHTML = _queue.map((item, i) => {
    const thumb = item.cover
      ? `/api/proxy_image?url=${encodeURIComponent(item.cover)}`
      : '';
    const isDl  = i === _currentIdx;
    return `
    <div class="queue-item${isDl?' downloading':''}" id="qi-${i}" draggable="true"
         ondragstart="dragStart(${i})" ondragover="dragOver(event,${i})" ondrop="dragDrop(event,${i})">
      <span class="queue-drag">⠿</span>
      ${thumb
        ? `<img class="queue-thumb" src="${thumb}" onerror="this.outerHTML='<div class=queue-thumb-ph>🎬</div>'">`
        : '<div class="queue-thumb-ph">🎬</div>'}
      <div style="flex:1;min-width:0">
        <div class="queue-desc" title="${item.desc||''}">${item.desc||item.url}</div>
        <div class="queue-date">${item.date||''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px">
        <button class="priority-btn" onclick="moveUp(${i})" title="Move up">▲</button>
        <button class="priority-btn" onclick="moveDown(${i})" title="Move down">▼</button>
      </div>
      <div class="queue-status" style="color:${isDl?'var(--cyan)':'var(--dim)'}">
        ${isDl ? '⏳ Downloading' : `#${i+1}`}
      </div>
      <button class="queue-remove" onclick="removeFromQueue('${item.url}')" title="Remove">✕</button>
    </div>`;
  }).join('');
}

// ── drag & drop reorder ───────────────────────────────────────────────────────
let _dragIdx = -1;
function dragStart(i) { _dragIdx = i; }
function dragOver(e, i) { e.preventDefault(); }
async function dragDrop(e, i) {
  e.preventDefault();
  if (_dragIdx === i) return;
  const item = _queue.splice(_dragIdx, 1)[0];
  _queue.splice(i, 0, item);
  await API.post('/api/queue/reorder', _queue.map(q => q.url));
  renderQueue();
}

function moveUp(i) {
  if (i === 0) return;
  [_queue[i-1], _queue[i]] = [_queue[i], _queue[i-1]];
  API.post('/api/queue/reorder', _queue.map(q => q.url));
  renderQueue();
}
function moveDown(i) {
  if (i >= _queue.length-1) return;
  [_queue[i], _queue[i+1]] = [_queue[i+1], _queue[i]];
  API.post('/api/queue/reorder', _queue.map(q => q.url));
  renderQueue();
}

async function removeFromQueue(url) {
  await API.post('/api/queue/remove', {url});
}
async function clearQueue() {
  if (!confirm('Clear all queue items?')) return;
  await API.post('/api/queue/clear', {});
}

async function addManualUrl() {
  const input = document.getElementById('manual-url');
  const url = input.value.trim();
  if (!url) return;
  await API.post('/api/queue/add', [{url, desc: url, cover:'', date:''}]);
  input.value = '';
}

// ── start download ────────────────────────────────────────────────────────────
function startQueueDownload() {
  if (!_queue.length) {
    toast('Queue is empty', 'error'); return;
  }
  const btn = document.getElementById('btn-dl');
  btn.disabled = true; btn.textContent = '⏳ Running…';
  clearLog('dl-log');
  ['pb-overall','pb-step','pb-item'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.width = '0%';
  });
  ['lbl-overall','lbl-step','lbl-item'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '—';
  });
  socket.emit('start_download', {use_queue: true});
}

// override done handler to re-enable button
socket.on('done', d => {
  const btn = document.getElementById('btn-dl');
  if (btn) { btn.disabled = false; btn.textContent = '▶ Start Download'; }
  _currentIdx = -1;
  toast(d.ok ? 'Download complete' : 'Finished with errors', d.ok ? 'success' : 'error');
});

// ── handle redirect from user search ─────────────────────────────────────────
const dlMsg = sessionStorage.getItem('dlMsg');
if (dlMsg) { sessionStorage.removeItem('dlMsg'); toast(dlMsg, 'info'); }
const dlUrl = sessionStorage.getItem('dlUrl');
if (dlUrl) { sessionStorage.removeItem('dlUrl'); document.getElementById('manual-url').value = dlUrl; }

loadQueue();
