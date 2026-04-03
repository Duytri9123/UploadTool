/* ── Cookies page ────────────────────────────────────────────────────────── */
const CK_FIELDS = ['ttwid','odin_tt','passport_csrf_token','msToken','sid_guard','s_v_web_id','__ac_nonce','__ac_signature'];

async function loadCookieMode() {
  const data = await API.get('/api/cookie_mode');
  const isCustom = data?.mode === 'custom';
  const toggle = document.getElementById('ck-mode-toggle');
  const badge = document.getElementById('ck-mode-badge');
  const desc = document.getElementById('ck-mode-desc');
  const wrap = document.getElementById('ck-custom-wrap');
  if (toggle) toggle.checked = isCustom;
  if (badge) { badge.setAttribute('data-i18n', isCustom ? 'lbl_cookie_custom' : 'lbl_cookie_default'); badge.textContent = t(isCustom ? 'lbl_cookie_custom' : 'lbl_cookie_default'); }
  if (desc) { desc.setAttribute('data-i18n', isCustom ? 'lbl_cookie_custom_desc' : 'lbl_cookie_default_desc'); desc.textContent = t(isCustom ? 'lbl_cookie_custom_desc' : 'lbl_cookie_default_desc'); }
  if (wrap) wrap.style.display = isCustom ? '' : 'none';
}

async function loadCookieFields() {
  const cfg = await API.get('/api/config');
  const ck = cfg?.cookies || {};
  CK_FIELDS.forEach(f => {
    const el = document.getElementById('ck-' + f);
    if (el) el.value = ck[f] || '';
  });
}

async function onCookieModeChange() {
  const isCustom = document.getElementById('ck-mode-toggle')?.checked;
  await API.post('/api/cookie_mode', { mode: isCustom ? 'custom' : 'default' });
  loadCookieMode();
}

async function saveCookies() {
  const data = {};
  CK_FIELDS.forEach(f => {
    const el = document.getElementById('ck-' + f);
    if (el) data[f] = el.value.trim();
  });
  await API.post('/api/cookies', data);
  toast(t('toast_cookies_saved'), 'success');
}

async function validateCookie() {
  const data = {};
  CK_FIELDS.forEach(f => {
    const el = document.getElementById('ck-' + f);
    if (el) data[f] = el.value.trim();
  });
  const res = await API.post('/api/validate_cookie', data);
  const status = document.getElementById('ck-status');
  if (status) {
    status.innerHTML = res?.ok
      ? '<span class="dot dot-green"></span><span>Valid</span>'
      : '<span class="dot dot-red"></span><span>Invalid</span>';
  }
}

async function parseCookie() {
  const raw = document.getElementById('ck-raw')?.value || '';
  if (!raw.trim()) return;
  const parsed = await API.post('/api/parse_cookie', { raw });
  CK_FIELDS.forEach(f => {
    const el = document.getElementById('ck-' + f);
    if (el && parsed[f]) el.value = parsed[f];
  });
}

async function autoFetch() {
  toast('Auto fetching...', 'info');
  // placeholder — implement if backend supports it
}
