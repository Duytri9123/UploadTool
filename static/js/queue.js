/* ── Download Queue ──────────────────────────────────────────────────────── */
let _queue = [], _dlRunning = false;
let _downloadingUrl = null; // URL đang được tải
let _queueItemProgress = Object.create(null);
let _queueItemState = Object.create(null);

function syncDownloadPostProcessControls() {
  const enabled = document.getElementById('dl-vp-enabled')?.checked !== false;
  const burn = document.getElementById('dl-vp-burn-vi');
  const voice = document.getElementById('dl-vp-voice');
  const transWrap = document.getElementById('dl-translate-wrap');
  if (burn) burn.disabled = !enabled;
  if (voice) voice.disabled = !enabled;
  if (transWrap) transWrap.style.display = enabled ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const master = document.getElementById('dl-vp-enabled');
  const burn = document.getElementById('dl-vp-burn-vi');
  const voice = document.getElementById('dl-vp-voice');
  if (master) master.addEventListener('change', syncDownloadPostProcessControls);
  if (burn) burn.addEventListener('change', syncDownloadPostProcessControls);
  if (voice) voice.addEventListener('change', syncDownloadPostProcessControls);
  syncDownloadPostProcessControls();
});

function setQueueItemProgress(url, pct, label) {
  if (!url) return;
  _queueItemProgress[url] = {
    pct: Math.max(0, Math.min(100, Number(pct) || 0)),
    label: label || '',
    ts: Date.now(),
  };
  renderQueue();
}

function markQueueItemState(url, state) {
  if (!url) return;
  _queueItemState[url] = state || '';
  renderQueue();
}

function _cleanupQueueRuntimeState() {
  const urls = new Set(_queue.map(i => i.url));
  Object.keys(_queueItemProgress).forEach(url => {
    if (!urls.has(url) && url !== _downloadingUrl) delete _queueItemProgress[url];
  });
  Object.keys(_queueItemState).forEach(url => {
    if (!urls.has(url) && url !== _downloadingUrl) delete _queueItemState[url];
  });
}

async function loadQueue() {
  const data = await API.get('/api/queue');
  _queue = data || [];
  renderQueue();
  await loadQueueProcessSettings();
}

async function loadQueueProcessSettings() {
  const cfg = await API.get('/api/config');
  if (!cfg) return;

  const tr = cfg.translation || {};
  const set = (id, val) => { const el = document.getElementById(id); if (el && (el.value === '' || el.value == null)) el.value = val ?? ''; };

  set('dl-translate-provider', tr.preferred_provider || 'deepseek');
}

function renderQueue() {
  const el = document.getElementById('queue-list');
  const cnt = document.getElementById('queue-count');
  _cleanupQueueRuntimeState();
  if (cnt) cnt.textContent = _queue.length;
  if (!el) return;
  if (!_queue.length) {
    el.innerHTML = '<div class="empty-state">' + t('lbl_queue_empty') + '</div>';
    return;
  }
  el.innerHTML = _queue.map((item, idx) => {
    const thumb = item.cover ? '/api/proxy_image?url=' + encodeURIComponent(item.cover) : '';
    const isDownloading = _downloadingUrl && item.url === _downloadingUrl;
    const isNext = !isDownloading && _downloadingUrl && idx === _queue.findIndex(q => q.url !== _downloadingUrl && _queue.indexOf(q) > _queue.findIndex(q2 => q2.url === _downloadingUrl));

    let statusBadge = '';
    const state = _queueItemState[item.url] || '';
    const itemProg = _queueItemProgress[item.url];
    if (isDownloading) {
      statusBadge = '<span class="queue-status downloading"><span class="spinner-sm"></span> ' + t('lbl_queue_downloading') + '</span>';
    } else if (state === 'failed') {
      statusBadge = '<span class="queue-status failed">' + t('lbl_queue_failed') + '</span>';
    } else if (_dlRunning && idx === _getNextIndex()) {
      statusBadge = '<span class="queue-status next">' + t('lbl_queue_next') + '</span>';
    }

    const progressHtml = (isDownloading || itemProg)
      ? '<div class="queue-item-progress">' +
          '<div class="queue-item-progress-head">' + t('lbl_queue_item_progress') + '</div>' +
          '<div class="queue-item-progress-bar"><div class="queue-item-progress-fill" style="width:' + Math.round(itemProg?.pct || 0) + '%"></div></div>' +
          '<div class="queue-item-progress-label">' + escHtml(itemProg?.label || '') + '</div>' +
        '</div>'
      : '';

    return '<div class="queue-item' + (isDownloading ? ' queue-item-active' : '') + '">' +
      (thumb ? '<img class="queue-thumb" src="' + thumb + '">' : '<div class="queue-thumb-ph">&#127916;</div>') +
      '<div style="flex:1;min-width:0">' +
        (isDownloading
          ? '<div class="queue-desc">' + escHtml(item.desc || item.url) + '</div>'
          : '<div class="queue-desc queue-desc-edit" data-url="' + escHtml(item.url) + '" contenteditable="true" spellcheck="false">' + escHtml(item.desc || item.url) + '</div>') +
        '<div class="queue-meta">' +
          (item.date ? '<span class="queue-date">' + item.date + '</span>' : '') +
          statusBadge +
        '</div>' +
        progressHtml +
      '</div>' +
      // Ẩn nút xóa khi đang tải item đó
      (!isDownloading
        ? '<button class="btn btn-sm btn-danger" onclick="removeFromQueue(\'' + escHtml(item.url) + '\')" title="' + escHtml(t('ttl_remove_queue_item')) + '">×</button>'
        : '<span class="queue-lock" title="' + escHtml(t('ttl_queue_item_locked')) + '">&#128274;</span>'
      ) +
    '</div>';
  }).join('');

  el.querySelectorAll('.queue-desc-edit').forEach(node => {
    node.addEventListener('click', e => e.stopPropagation());
    node.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        node.blur();
      }
    });
    node.addEventListener('blur', () => {
      const url = node.dataset.url || '';
      const text = (node.textContent || '').trim();
      updateQueueItemDesc(url, text);
    });
  });
}

// Tìm index của item tiếp theo sẽ được tải
function _getNextIndex() {
  if (!_downloadingUrl) return 0;
  const curIdx = _queue.findIndex(q => q.url === _downloadingUrl);
  return curIdx >= 0 ? curIdx + 1 : 0;
}

async function removeFromQueue(url) {
  if (url === _downloadingUrl) return; // không xóa item đang tải
  await API.post('/api/queue/remove', { url });
}

async function clearQueue() {
  if (!confirm(t('confirm_clear_queue'))) return;
  await API.post('/api/queue/clear', {});
  toast(t('toast_queue_cleared'), 'info');
}

async function addManualUrl() {
  const input = document.getElementById('manual-url');
  const url = (input?.value || '').trim();
  if (!url) return;
  const res = await API.post('/api/queue/add', [{ url, desc: url, cover: '', date: '' }]);
  input.value = '';
  if (res?.added > 0) toast(t('toast_added_queue') + ' (' + res.added + ')', 'success');
  else toast(t('toast_url_exists'), 'warning');
  loadQueue();
}

async function updateQueueItemDesc(url, desc) {
  if (!url) return;
  const safeDesc = (desc || '').trim() || url;
  const item = _queue.find(i => i.url === url);
  if (!item || (item.desc || '') === safeDesc) return;
  item.desc = safeDesc;
  await API.post('/api/queue/update', { url, desc: safeDesc });
}

function startQueueDownload() {
  if (!_queue.length) { toast(t('lbl_queue_empty'), 'error'); return; }
  if (_dlRunning) return;
  _dlRunning = true;
  _queueItemProgress = Object.create(null);
  _queueItemState = Object.create(null);

  const vpEnabled = document.getElementById('dl-vp-enabled')?.checked !== false;
  const burnVi = document.getElementById('dl-vp-burn-vi')?.checked !== false;
  const voiceVi = document.getElementById('dl-vp-voice')?.checked !== false;
  const hasPostProcess = vpEnabled && (burnVi || voiceVi);
  const translateProvider = document.getElementById('dl-translate-provider')?.value || 'deepseek';

  const btn = document.getElementById('btn-dl');
  if (btn) { btn.disabled = true; btn.textContent = t('lbl_queue_running'); }
  clearLog('dl-log');
  if (typeof resetDownloadProgressBars === 'function') resetDownloadProgressBars();
  socket.emit('start_download', {
    use_queue: true,
    post_process: {
      enabled: hasPostProcess,
      burn_subs: burnVi,
      translate_subs: burnVi || voiceVi,
      burn_vi_subs: burnVi,
      voice_convert: voiceVi,
      keep_bg_music: false,
      translate_provider: translateProvider,
    }
  });
}
