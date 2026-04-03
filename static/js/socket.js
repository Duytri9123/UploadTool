/* ── Socket.IO setup ─────────────────────────────────────────────────────── */
const socket = io();

function _clampPct(v) {
  return Math.max(0, Math.min(100, Number(v) || 0));
}

function resetDownloadProgressBars() {
  setProgress('pb-download', 'lbl-download', 0, '--');
  setProgress('pb-subtitle', 'lbl-subtitle', 0, '--');
  setProgress('pb-voice', 'lbl-voice', 0, '--');
}

window.resetDownloadProgressBars = resetDownloadProgressBars;

socket.on('log', d => { appendLog('dl-log', d.msg, d.level || 'info'); });

socket.on('progress', d => {
  if (d.type === 'overall' || d.type === 'step' || d.type === 'item') {
    setProgress('pb-download', 'lbl-download', _clampPct(d.pct), d.label || '');
    const targetUrl = d.url || _downloadingUrl;
    if (targetUrl && typeof setQueueItemProgress === 'function') {
      setQueueItemProgress(targetUrl, d.pct, d.label || '');
    }
  } else if (d.type === 'post') {
    const label = String(d.label || '');
    const lower = label.toLowerCase();
    const isVoice = lower.includes('giọng') || lower.includes('voice') || d.pct >= 90;
    if (isVoice) {
      const voicePct = _clampPct((Number(d.pct) - 90) * 10);
      setProgress('pb-voice', 'lbl-voice', voicePct, label);
      if (voicePct > 0) {
        setProgress('pb-subtitle', 'lbl-subtitle', 100, 'Hoàn tất phụ đề');
      }
    } else {
      const subtitlePct = _clampPct((Number(d.pct) / 90) * 100);
      setProgress('pb-subtitle', 'lbl-subtitle', subtitlePct, label);
    }
    const targetUrl = d.url || _downloadingUrl;
    if (targetUrl && typeof setQueueItemProgress === 'function') {
      setQueueItemProgress(targetUrl, d.pct, d.label || '');
    }
  }
});

// Nhận thông báo URL nào đang được tải
socket.on('downloading_url', d => {
  _downloadingUrl = d.url || null;
  if (_downloadingUrl && typeof markQueueItemState === 'function') {
    markQueueItemState(_downloadingUrl, 'running');
  }
  renderQueue();

  // Hiển thị "Đang tải X/Y" trên topbar queue
  const cnt = document.getElementById('queue-count');
  if (cnt && d.total) cnt.textContent = _queue.length + ' (' + d.index + '/' + d.total + ')';
});

socket.on('queue_item_state', d => {
  const url = d?.url || '';
  if (!url || typeof markQueueItemState !== 'function') return;
  markQueueItemState(url, d.state || '');
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
