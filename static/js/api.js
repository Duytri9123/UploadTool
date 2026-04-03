/* ── Loading overlay ─────────────────────────────────────────────────────── */
const LoadingUI = (() => {
  let n = 0, t0 = 0, timer = null;
  const root = () => document.getElementById('global-loading');
  const txt  = () => document.getElementById('gl-text');
  const time = () => document.getElementById('gl-time');
  function tick() { const el = time(); if (el && t0) el.textContent = ((Date.now() - t0) / 1000).toFixed(1) + 's'; }
  return {
    start(label) {
      n++;
      if (txt()) txt().textContent = label || t('lbl_translating');
      if (n === 1) { t0 = Date.now(); timer = setInterval(tick, 100); root()?.classList.add('show'); }
    },
    stop() {
      n = Math.max(0, n - 1);
      if (n === 0) { clearInterval(timer); timer = null; t0 = 0; root()?.classList.remove('show'); }
    }
  };
})();

/* ── API wrapper ─────────────────────────────────────────────────────────── */
const API = {
  async get(url) {
    LoadingUI.start();
    try { const r = await fetch(url); return r.json(); }
    finally { LoadingUI.stop(); }
  },
  async post(url, data) {
    LoadingUI.start();
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      return r.json();
    } finally { LoadingUI.stop(); }
  },
  async postRaw(url, data) {
    LoadingUI.start();
    try {
      return await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } finally { LoadingUI.stop(); }
  }
};
