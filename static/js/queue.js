/* ── Download Queue ──────────────────────────────────────────────────────── */
let _queue = [], _dlRunning = false;
let _downloadingUrl = null; // URL đang được tải

async function loadQueue() {
  const data = await API.get('/api/queue');
  _queue = data || [];
  renderQueue();
}

function renderQueue() {
  const el = document.getElementById('queue-list');
  const cnt = document.getElementById('queue-count');
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
    if (isDownloading) {
      statusBadge = '<span class="queue-status downloading"><span class="spinner-sm"></span> Đang tải...</span>';
    } else if (_dlRunning && idx === _getNextIndex()) {
      statusBadge = '<span class="queue-status next">Tiếp theo</span>';
    }

    return '<div class="queue-item' + (isDownloading ? ' queue-item-active' : '') + '">' +
      (thumb ? '<img class="queue-thumb" src="' + thumb + '">' : '<div class="queue-thumb-ph">&#127916;</div>') +
      '<div style="flex:1;min-width:0">' +
        '<div class="queue-desc">' + escHtml(item.desc || item.url) + '</div>' +
        '<div class="queue-meta">' +
          (item.date ? '<span class="queue-date">' + item.date + '</span>' : '') +
          statusBadge +
        '</div>' +
      '</div>' +
      // Ẩn nút xóa khi đang tải item đó
      (!isDownloading
        ? '<button class="btn btn-sm btn-danger" onclick="removeFromQueue(\'' + escHtml(item.url) + '\')" title="Xóa">×</button>'
        : '<span class="queue-lock" title="Đang tải">&#128274;</span>'
      ) +
    '</div>';
  }).join('');
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
  await API.post('/api/queue/add', [{ url, desc: url, cover: '', date: '' }]);
  input.value = '';
  toast(t('toast_added_queue'), 'success');
}

function startQueueDownload() {
  if (!_queue.length) { toast(t('lbl_queue_empty'), 'error'); return; }
  if (_dlRunning) return;
  _dlRunning = true;
  const btn = document.getElementById('btn-dl');
  if (btn) { btn.disabled = true; btn.textContent = t('lbl_queue_running'); }
  clearLog('dl-log');
  socket.emit('start_download', { use_queue: true });
}
