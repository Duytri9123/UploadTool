// ── SocketIO + download progress ─────────────────────────────────────────────
const socket = io();

socket.on('log', d => appendLog('dl-log', d.msg, d.level));

socket.on('progress', d => {
  const map = {
    overall: ['pb-overall','lbl-overall'],
    step:    ['pb-step',   'lbl-step'],
    item:    ['pb-item',   'lbl-item'],
  };
  const [pbId, lblId] = map[d.type] || [];
  if (pbId) setProgress(pbId, lblId, d.pct, d.label);
});

socket.on('done', d => {
  const btn = document.getElementById('btn-dl');
  if (btn) { btn.disabled = false; btn.textContent = '▶ Start Download'; }
  toast(d.ok ? 'Download complete' : 'Download finished with errors', d.ok ? 'success' : 'error');
});

function startDownload() {
  const btn = document.getElementById('btn-dl');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Running…'; }
  clearLog('dl-log');
  ['pb-overall','pb-step','pb-item'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.width = '0%';
  });
  ['lbl-overall','lbl-step','lbl-item'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '—';
  });
  const extra = document.getElementById('dl-url');
  socket.emit('start_download', {extra_url: extra ? extra.value : ''});
}
