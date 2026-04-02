// ── API helpers ───────────────────────────────────────────────────────────────
const API = {
  async get(url) {
    const r = await fetch(url); return r.json();
  },
  async post(url, data) {
    const r = await fetch(url, {method:'POST',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    return r.json();
  },
  async postRaw(url, data) {
    return fetch(url, {method:'POST',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
  }
};

// ── toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type='info') {
  const c = document.getElementById('toasts');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = {info:'ℹ️', success:'✅', error:'❌', warning:'⚠️'};
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── log ───────────────────────────────────────────────────────────────────────
function appendLog(boxId, msg, level) {
  const box = document.getElementById(boxId);
  if (!box) return;
  const line = document.createElement('div');
  line.className = 'log-' + (level||'info');
  line.textContent = msg;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}
function clearLog(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '';
}

// ── progress bar ──────────────────────────────────────────────────────────────
function setProgress(pbId, lblId, pct, label) {
  const pb = document.getElementById(pbId);
  const lb = document.getElementById(lblId);
  if (pb) pb.style.width = pct + '%';
  if (lb) lb.textContent = label;
}

// ── number format ─────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (!n) return '0';
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return n.toString();
}

// ── duration format ───────────────────────────────────────────────────────────
function fmtDuration(ms) {
  if (!ms) return '';
  // Douyin trả ms (>1000) hoặc giây (<1000) tùy version
  const totalSec = ms > 1000 ? Math.round(ms / 1000) : ms;
  if (totalSec <= 0) return '';
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2,'0')}` : `0:${String(s).padStart(2,'0')}`;
}
