const CK_FIELDS = ['ttwid','odin_tt','passport_csrf_token','msToken',
                   'sid_guard','s_v_web_id','__ac_nonce','__ac_signature'];

async function loadCookieMode() {
  const {mode} = await API.get('/api/cookie_mode');
  applyCookieMode(mode);
}

function applyCookieMode(mode) {
  const isCustom = mode === 'custom';
  document.getElementById('ck-mode-toggle').checked = isCustom;
  document.getElementById('ck-custom-wrap').style.display = isCustom ? 'block' : 'none';
  document.getElementById('ck-mode-badge').textContent = isCustom ? 'Custom' : 'Default';
  document.getElementById('ck-mode-badge').style.color = isCustom ? 'var(--accent2)' : 'var(--dim)';
  document.getElementById('ck-mode-desc').textContent = isCustom
    ? 'Using your custom cookies from config'
    : 'Using built-in default cookies (auto-fallback)';
}

async function onCookieModeChange() {
  const isCustom = document.getElementById('ck-mode-toggle').checked;
  const mode = isCustom ? 'custom' : 'default';
  await API.post('/api/cookie_mode', {mode});
  applyCookieMode(mode);
  toast(isCustom ? 'Switched to custom cookies' : 'Switched to default cookies', 'info');
}

async function parseCookie() {
  const raw = document.getElementById('ck-raw').value;
  const parsed = await API.post('/api/parse_cookie', {raw});
  CK_FIELDS.forEach(k => { const el=document.getElementById('ck-'+k); if(el&&parsed[k]) el.value=parsed[k]; });
  toast(`Parsed ${Object.keys(parsed).length} cookies`, 'success');
}

async function validateCookie() {
  const data = {};
  CK_FIELDS.forEach(k => { const el=document.getElementById('ck-'+k); if(el) data[k]=el.value; });
  const res = await API.post('/api/validate_cookie', data);
  const el = document.getElementById('ck-status');
  el.innerHTML = res.ok
    ? '<span class="dot dot-green"></span>Cookies look valid'
    : '<span class="dot dot-red"></span>Missing: ttwid / odin_tt / passport_csrf_token';
}

async function saveCookies() {
  const data = {};
  CK_FIELDS.forEach(k => { const el=document.getElementById('ck-'+k); if(el&&el.value) data[k]=el.value; });
  await API.post('/api/cookies', data);
  toast('Cookies saved', 'success');
}

async function loadCookieFields() {
  const cfg = await API.get('/api/config');
  const ck = cfg.cookies || {};
  CK_FIELDS.forEach(k => { const el=document.getElementById('ck-'+k); if(el) el.value=ck[k]||''; });
}

function autoFetch() {
  toast('Opening browser — log in then press Enter in terminal…', 'info');
  API.post('/api/auto_fetch_cookie', {});
}

loadCookieMode();
loadCookieFields();
