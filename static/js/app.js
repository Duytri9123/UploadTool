/* ── app.js — Entry point ────────────────────────────────────────────────── */

function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  const nav  = document.querySelector('.nav-item[data-page="' + name + '"]');
  if (page) page.classList.add('active');
  if (nav)  nav.classList.add('active');
  const el = document.getElementById('topbar-title');
  if (el) el.textContent = t('title_' + name);
  if (name === 'config' && !window._configLoaded) { loadConfig(); window._configLoaded = true; }
  if (name === 'cookies' && !window._cookiesLoaded) { loadCookieMode(); loadCookieFields(); window._cookiesLoaded = true; }
  if (name === 'history') loadHistory();
  if (name === 'download') loadQueue();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

document.addEventListener('DOMContentLoaded', () => {
  applyI18n();
  switchPage('user');
  document.getElementById('manual-url')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addManualUrl();
  });
  _initUserPageListeners();
});
