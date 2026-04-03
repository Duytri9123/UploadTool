/* ── Socket.IO setup ─────────────────────────────────────────────────────── */
const socket = io();

socket.on('log', d => { appendLog('dl-log', d.msg, d.level || 'info'); });

socket.on('progress', d => {
  if (d.type === 'overall') setProgress('pb-overall', 'lbl-overall', d.pct, d.label);
  else if (d.type === 'step') setProgress('pb-step', 'lbl-step', d.pct, d.label);
  else if (d.type === 'item') setProgress('pb-item', 'lbl-item', d.pct, d.label);
});

// Nhận thông báo URL nào đang được tải
socket.on('downloading_url', d => {
  _downloadingUrl = d.url || null;
  renderQueue();

  // Hiển thị "Đang tải X/Y" trên topbar queue
  const cnt = document.getElementById('queue-count');
  if (cnt && d.total) cnt.textContent = _queue.length + ' (' + d.index + '/' + d.total + ')';
});

socket.on('queue_update', data => {
  _queue = data || [];
  renderQueue();
  if (typeof onQueueStateChanged === 'function') onQueueStateChanged();
});

socket.on('done', d => {
  const btn = document.getElementById('btn-dl');
  if (btn) { btn.disabled = false; btn.setAttribute('data-i18n', 'btn_start_dl'); btn.textContent = t('btn_start_dl'); }
  _dlRunning = false;
  _downloadingUrl = null;
  renderQueue();
  if (typeof onQueueStateChanged === 'function') onQueueStateChanged();
  toast(d.ok ? t('toast_dl_done') : t('toast_dl_error'), d.ok ? 'success' : 'error');
});
