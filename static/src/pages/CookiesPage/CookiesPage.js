/**
 * CookiesPage Component
 * Cookie editor with mode toggle (default/custom), validation, and parse from raw string.
 */

import apiClient from '../../modules/api-client.js';

const CK_FIELDS = [
  'ttwid', 'odin_tt', 'passport_csrf_token', 'msToken',
  'sid_guard', 's_v_web_id', '__ac_nonce', '__ac_signature',
];

export class CookiesPage {
  constructor(options = {}) {
    this.options = options;
    this._element = null;
    this._mounted = false;
    this._isCustomMode = false;

    this._init();
  }

  _init() {
    this._element = this._createElement();
    this._attachListeners();
  }

  _createElement() {
    const section = document.createElement('section');
    section.className = 'cookies-page';
    section.setAttribute('aria-labelledby', 'cookies-page-title');
    section.innerHTML = this._buildHTML();
    return section;
  }

  _buildHTML() {
    return `
      <div class="cookies-page__header">
        <h2 id="cookies-page-title" class="cookies-page__title">Quản Lý Cookies</h2>
        <div id="ck-status" class="cookies-page__status" aria-live="polite"></div>
      </div>

      <!-- Mode Toggle -->
      <div class="card cookies-page__card">
        <div class="card__body cookies-page__mode-row">
          <div class="cookies-page__mode-info">
            <span id="ck-mode-badge" class="cookies-page__badge cookies-page__badge--default">Mặc định</span>
            <p id="ck-mode-desc" class="cookies-page__mode-desc">
              Sử dụng cookies mặc định từ file cấu hình
            </p>
          </div>
          <label class="cookies-page__toggle-label" for="ck-mode-toggle" aria-label="Chuyển sang cookies tùy chỉnh">
            <input id="ck-mode-toggle" type="checkbox" class="cookies-page__toggle-input" role="switch" aria-checked="false" />
            <span class="cookies-page__toggle-track" aria-hidden="true"></span>
            <span class="cookies-page__toggle-text">Cookies tùy chỉnh</span>
          </label>
        </div>
      </div>

      <!-- Custom Cookie Fields -->
      <div id="ck-custom-wrap" class="cookies-page__custom" hidden>

        <!-- Raw Cookie Parser -->
        <div class="card cookies-page__card">
          <div class="card__header"><h3 class="card__title">Dán Cookie Thô</h3></div>
          <div class="card__body">
            <label class="cookies-page__label" for="ck-raw">Dán chuỗi cookie từ trình duyệt</label>
            <textarea
              id="ck-raw"
              class="input cookies-page__textarea"
              rows="3"
              placeholder="ttwid=xxx; odin_tt=yyy; ..."
              aria-label="Chuỗi cookie thô"
            ></textarea>
            <div class="cookies-page__parse-actions">
              <button id="btn-ck-parse" class="btn btn--secondary btn--small" type="button">
                Phân tích & Điền
              </button>
            </div>
          </div>
        </div>

        <!-- Cookie Fields -->
        <div class="card cookies-page__card">
          <div class="card__header">
            <h3 class="card__title">Các Trường Cookie</h3>
          </div>
          <div class="card__body cookies-page__fields-grid">
            ${CK_FIELDS.map(f => `
              <div class="cookies-page__field">
                <label class="cookies-page__label" for="ck-${f}">${f}</label>
                <input
                  id="ck-${f}"
                  class="input cookies-page__field-input"
                  type="text"
                  placeholder="${f}"
                  aria-label="${f}"
                  autocomplete="off"
                  spellcheck="false"
                />
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Actions -->
        <div class="cookies-page__footer">
          <button id="btn-ck-validate" class="btn btn--secondary" type="button">Kiểm tra Cookie</button>
          <button id="btn-ck-save" class="btn btn--primary" type="button">Lưu Cookie</button>
        </div>

      </div>
    `;
  }

  _attachListeners() {
    const toggle = this._element.querySelector('#ck-mode-toggle');
    toggle?.addEventListener('change', () => this._onModeChange());

    this._element.querySelector('#btn-ck-parse')?.addEventListener('click', () => this.parseCookie());
    this._element.querySelector('#btn-ck-validate')?.addEventListener('click', () => this.validateCookie());
    this._element.querySelector('#btn-ck-save')?.addEventListener('click', () => this.saveCookies());
  }

  async load() {
    await Promise.all([this._loadMode(), this._loadFields()]);
  }

  async _loadMode() {
    try {
      const data = await apiClient.get('/api/cookie_mode');
      this._isCustomMode = data?.mode === 'custom';
      this._applyMode();
    } catch (err) {
      console.error('Failed to load cookie mode:', err);
    }
  }

  async _loadFields() {
    try {
      const cfg = await apiClient.get('/api/config');
      const ck = cfg?.cookies || {};
      CK_FIELDS.forEach(f => {
        const el = this._element.querySelector(`#ck-${f}`);
        if (el) el.value = ck[f] || '';
      });
    } catch (err) {
      console.error('Failed to load cookie fields:', err);
    }
  }

  _applyMode() {
    const isCustom = this._isCustomMode;
    const toggle = this._element.querySelector('#ck-mode-toggle');
    const badge = this._element.querySelector('#ck-mode-badge');
    const desc = this._element.querySelector('#ck-mode-desc');
    const wrap = this._element.querySelector('#ck-custom-wrap');

    if (toggle) {
      toggle.checked = isCustom;
      toggle.setAttribute('aria-checked', String(isCustom));
    }
    if (badge) {
      badge.textContent = isCustom ? 'Tùy chỉnh' : 'Mặc định';
      badge.className = `cookies-page__badge cookies-page__badge--${isCustom ? 'custom' : 'default'}`;
    }
    if (desc) {
      desc.textContent = isCustom
        ? 'Sử dụng cookies tùy chỉnh bạn đã nhập'
        : 'Sử dụng cookies mặc định từ file cấu hình';
    }
    if (wrap) wrap.hidden = !isCustom;
  }

  async _onModeChange() {
    const toggle = this._element.querySelector('#ck-mode-toggle');
    this._isCustomMode = toggle?.checked ?? false;

    try {
      await apiClient.post('/api/cookie_mode', { mode: this._isCustomMode ? 'custom' : 'default' });
      this._applyMode();
    } catch (err) {
      console.error('Failed to update cookie mode:', err);
      // Revert toggle on error
      this._isCustomMode = !this._isCustomMode;
      this._applyMode();
    }
  }

  async saveCookies() {
    const data = {};
    CK_FIELDS.forEach(f => {
      const el = this._element.querySelector(`#ck-${f}`);
      if (el) data[f] = el.value.trim();
    });

    const btn = this._element.querySelector('#btn-ck-save');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }

    try {
      await apiClient.post('/api/cookies', data);
      this._showStatus('✅ Đã lưu cookies', 'success');
    } catch (err) {
      this._showStatus('❌ Lỗi lưu cookies: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Lưu Cookie'; }
    }
  }

  async validateCookie() {
    const data = {};
    CK_FIELDS.forEach(f => {
      const el = this._element.querySelector(`#ck-${f}`);
      if (el) data[f] = el.value.trim();
    });

    const btn = this._element.querySelector('#btn-ck-validate');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang kiểm tra...'; }

    try {
      const res = await apiClient.post('/api/validate_cookie', data);
      const statusEl = this._element.querySelector('#ck-status');
      if (statusEl) {
        if (res?.ok) {
          statusEl.innerHTML = '<span class="cookies-page__dot cookies-page__dot--green" aria-hidden="true"></span><span>Cookie hợp lệ</span>';
          statusEl.className = 'cookies-page__status cookies-page__status--valid';
        } else {
          statusEl.innerHTML = '<span class="cookies-page__dot cookies-page__dot--red" aria-hidden="true"></span><span>Cookie không hợp lệ</span>';
          statusEl.className = 'cookies-page__status cookies-page__status--invalid';
        }
      }
    } catch (err) {
      this._showStatus('❌ Lỗi kiểm tra: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Kiểm tra Cookie'; }
    }
  }

  async parseCookie() {
    const raw = this._element.querySelector('#ck-raw')?.value || '';
    if (!raw.trim()) return;

    try {
      const parsed = await apiClient.post('/api/parse_cookie', { raw });
      CK_FIELDS.forEach(f => {
        const el = this._element.querySelector(`#ck-${f}`);
        if (el && parsed[f]) el.value = parsed[f];
      });
      this._showStatus('✅ Đã phân tích cookie', 'success');
    } catch (err) {
      this._showStatus('❌ Lỗi phân tích: ' + err.message, 'error');
    }
  }

  _showStatus(msg, type = 'info') {
    const el = this._element.querySelector('#ck-status');
    if (!el) return;
    el.textContent = msg;
    el.className = `cookies-page__status cookies-page__status--${type}`;
    setTimeout(() => {
      el.textContent = '';
      el.className = 'cookies-page__status';
    }, 3000);
  }

  mount(parent) {
    if (this._mounted) return;
    parent.appendChild(this._element);
    this._mounted = true;
    this.load();
  }

  unmount() {
    if (!this._mounted) return;
    if (this._element.parentNode) this._element.parentNode.removeChild(this._element);
    this._mounted = false;
  }

  destroy() {
    this.unmount();
    this._element = null;
  }

  get element() { return this._element; }
}

export default CookiesPage;
