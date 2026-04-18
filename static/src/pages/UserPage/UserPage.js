/**
 * UserPage Component
 *
 * Page component for browsing and downloading user videos.
 * Migrated from static/js/user.js with ES6 module architecture.
 *
 * Features:
 * - URL input with real-time validation
 * - User profile display
 * - Video grid with lazy loading via Intersection Observer
 * - Pagination and filtering
 * - Video selection and batch download
 *
 * @module pages/UserPage
 */

import apiClient from '../../modules/api-client.js';
import { validateURL } from '../../modules/validators.js';
import { debounce } from '../../modules/utils.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── UserPage Class ───────────────────────────────────────────────────────────

export class UserPage {
  /**
   * @param {Object} [options={}]
   * @param {HTMLElement} [options.container] - Mount target element
   */
  constructor(options = {}) {
    this.options = options;

    // State
    this._videos = [];
    this._page = 1;
    this._hasMore = false;
    this._nextCursor = 0;
    this._awemeCount = 0;
    this._loadedOffset = 0;
    this._selectedIds = new Set();
    this._queuedAwemeIds = new Set();
    this._isLoading = false;
    this._userInfo = null;

    // DOM refs
    this._element = null;
    this._gridEl = null;
    this._urlInput = null;
    this._urlError = null;
    this._profileEl = null;
    this._statusEl = null;
    this._paginationEl = null;

    // Lazy loading
    this._observer = null;

    // Bound handlers
    this._handleSearch = this._handleSearch.bind(this);
    this._handleUrlInput = debounce(this._validateUrlInput.bind(this), 300);
    this._handleFilterChange = this._handleFilterChange.bind(this);
    this._handleSelectAll = this._handleSelectAll.bind(this);
    this._handleSelectNone = this._handleSelectNone.bind(this);
    this._handleDownloadSelected = this._handleDownloadSelected.bind(this);
    this._handlePrev = this._handlePrev.bind(this);
    this._handleNext = this._handleNext.bind(this);

    this._mounted = false;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialise the component (create DOM, attach listeners).
   */
  init() {
    this._element = this._createElement();
    this._cacheRefs();
    this._attachListeners();
    this._initLazyObserver();
  }

  /**
   * Mount the component into a parent element.
   * @param {HTMLElement} parent
   */
  mount(parent) {
    if (!this._element) this.init();
    parent.appendChild(this._element);
    this._mounted = true;
    this._refreshQueuedIds();
  }

  /**
   * Unmount and clean up.
   */
  unmount() {
    if (!this._mounted) return;
    this._detachListeners();
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    this._mounted = false;
  }

  // ─── DOM Construction ───────────────────────────────────────────────────────

  /** @private */
  _createElement() {
    const page = document.createElement('div');
    page.className = 'user-page';
    page.innerHTML = this._template();
    return page;
  }

  /** @private */
  _template() {
    return `
      <div class="user-page__header">
        <div class="user-page__header-left">
          <h1 class="user-page__title">Video người dùng</h1>
          <div class="user-page__translate-row">
            <label class="user-page__translate-label" for="up-translate-provider">Dịch tiêu đề:</label>
            <select id="up-translate-provider" class="user-page__select" aria-label="Provider dịch">
              <option value="">Không dịch</option>
              <option value="deepseek">DeepSeek</option>
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
        </div>
        <div class="user-page__search">
          <div class="user-page__input-wrap">
            <input
              type="url"
              id="up-url"
              class="user-page__url-input"
              placeholder="Dán URL người dùng TikTok / Douyin..."
              aria-label="URL trang người dùng"
              autocomplete="off"
            />
            <span class="user-page__url-error" id="up-url-error" role="alert" aria-live="polite"></span>
          </div>
          <button
            type="button"
            id="up-search-btn"
            class="user-page__search-btn"
            aria-label="Tìm kiếm người dùng"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Tìm kiếm
          </button>
        </div>
      </div>

      <div class="user-page__profile user-page__profile--hidden" id="up-profile" aria-live="polite">
        <div class="user-page__avatar" id="up-avatar"></div>
        <div class="user-page__profile-info">
          <div class="user-page__profile-name" id="up-name"></div>
          <div class="user-page__profile-sig" id="up-sig"></div>
          <div class="user-page__profile-stats">
            <span class="user-page__stat"><strong id="up-posts">0</strong> bài đăng</span>
            <span class="user-page__stat"><strong id="up-followers">0</strong> người theo dõi</span>
            <span class="user-page__stat"><strong id="up-following">0</strong> đang theo dõi</span>
          </div>
        </div>
      </div>

      <div class="user-page__toolbar user-page__toolbar--hidden" id="up-toolbar">
        <div class="user-page__filters">
          <select id="up-filter-type" class="user-page__select" aria-label="Lọc theo loại">
            <option value="all">Tất cả</option>
            <option value="video">Video</option>
            <option value="gallery">Ảnh</option>
          </select>
          <select id="up-filter-sort" class="user-page__select" aria-label="Sắp xếp">
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="most_play">Xem nhiều nhất</option>
            <option value="most_like">Thích nhiều nhất</option>
          </select>
          <input
            type="search"
            id="up-filter-search"
            class="user-page__search-filter"
            placeholder="Tìm tiêu đề..."
            aria-label="Tìm kiếm mô tả video"
          />
        </div>
        <div class="user-page__actions">
          <span class="user-page__status" id="up-status"></span>
          <button type="button" id="up-select-all" class="user-page__action-btn">Chọn tất cả</button>
          <button type="button" id="up-select-none" class="user-page__action-btn">Bỏ chọn</button>
          <button type="button" id="up-dl-selected" class="user-page__action-btn user-page__action-btn--primary user-page__action-btn--hidden" aria-label="Thêm vào hàng chờ">
            Thêm hàng chờ (<span id="up-sel-count">0</span>)
          </button>
        </div>
      </div>

      <div class="user-page__loading user-page__loading--hidden" id="up-loading" role="status" aria-live="polite">
        <div class="user-page__spinner" aria-hidden="true"></div>
        <span>Đang tải...</span>
      </div>

      <div class="user-page__grid" id="up-grid" role="list" aria-label="Video list"></div>

      <div class="user-page__pagination user-page__pagination--hidden" id="up-pagination">
        <button type="button" id="up-prev" class="user-page__page-btn" aria-label="Trang trước">&#8592; Trước</button>
        <span class="user-page__page-info" id="up-page-info"></span>
        <button type="button" id="up-next" class="user-page__page-btn" aria-label="Trang tiếp">Tiếp &#8594;</button>
      </div>
    `;
  }

  /** @private */
  _cacheRefs() {
    const q = (id) => this._element.querySelector(`#${id}`);
    this._urlInput = q('up-url');
    this._urlError = q('up-url-error');
    this._profileEl = q('up-profile');
    this._gridEl = q('up-grid');
    this._statusEl = q('up-status');
    this._paginationEl = q('up-pagination');
    this._toolbarEl = q('up-toolbar');
    this._loadingEl = q('up-loading');
  }

  // ─── Event Listeners ────────────────────────────────────────────────────────

  /** @private */
  _attachListeners() {
    const q = (id) => this._element.querySelector(`#${id}`);

    q('up-search-btn').addEventListener('click', this._handleSearch);
    this._urlInput.addEventListener('input', this._handleUrlInput);
    this._urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSearch();
    });

    q('up-filter-type').addEventListener('change', this._handleFilterChange);
    q('up-filter-sort').addEventListener('change', this._handleFilterChange);
    q('up-filter-search').addEventListener('input', this._handleFilterChange);

    q('up-select-all').addEventListener('click', this._handleSelectAll);
    q('up-select-none').addEventListener('click', this._handleSelectNone);
    q('up-dl-selected').addEventListener('click', this._handleDownloadSelected);

    q('up-prev').addEventListener('click', this._handlePrev);
    q('up-next').addEventListener('click', this._handleNext);

    // Grid click delegation — select card or add to queue
    this._gridEl.addEventListener('click', (e) => {
      // Nút "Thêm vào hàng chờ"
      const queueBtn = e.target.closest('.user-page__card-queue-btn');
      if (queueBtn) {
        e.stopPropagation();
        this._addSingleToQueue(queueBtn.dataset.queueId);
        return;
      }
      // Click card để chọn
      const card = e.target.closest('.user-page__card');
      if (card) this._toggleSelect(card.dataset.awemeId);
    });
  }

  /** @private */
  _detachListeners() {
    // Cloning the element removes all listeners; handled by unmount removing from DOM.
  }

  // ─── Lazy Loading ────────────────────────────────────────────────────────────

  /** @private */
  _initLazyObserver() {
    if (!('IntersectionObserver' in window)) return;

    this._observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              this._observer.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '200px' }
    );
  }

  /** @private */
  _observeLazyImages() {
    if (!this._observer) return;
    this._gridEl.querySelectorAll('img[data-src]').forEach((img) => {
      this._observer.observe(img);
    });
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  /** @private */
  async _handleSearch() {
    const url = this._urlInput.value.trim();
    const validation = validateURL(url);
    if (!validation.valid) {
      this._showUrlError(validation.error);
      return;
    }
    this._clearUrlError();
    await this._searchUser(url);
  }

  /** @private */
  _validateUrlInput() {
    const url = this._urlInput.value.trim();
    if (!url) { this._clearUrlError(); return; }
    const result = validateURL(url);
    if (!result.valid) {
      this._showUrlError(result.error);
    } else {
      this._clearUrlError();
    }
  }

  /** @private */
  _handleFilterChange() {
    this._page = 1;
    this._renderGrid();
  }

  /** @private */
  _handleSelectAll() {
    this._applyFilters().forEach((v) => {
      if (!this._queuedAwemeIds.has(String(v.aweme_id))) {
        this._selectedIds.add(String(v.aweme_id));
      }
    });
    this._renderGrid();
  }

  /** @private */
  _handleSelectNone() {
    this._selectedIds.clear();
    this._renderGrid();
  }

  /** @private */
  async _addSingleToQueue(awemeId) {
    const v = this._videos.find(v => String(v.aweme_id) === String(awemeId));
    if (!v) return;
    const item = {
      url: `https://www.douyin.com/video/${awemeId}`,
      desc: v.desc || '',
      cover: v.cover || '',
      date: v.date || '',
    };
    try {
      const res = await apiClient.post('/api/queue/add', [item]);
      if (res?.added > 0) {
        this._queuedAwemeIds.add(String(awemeId));
        await this._refreshQueuedIds();
        this._renderGrid();
        this._showToast('Đã thêm vào hàng chờ', 'success');
      } else {
        this._showToast('Video đã có trong hàng chờ', 'info');
      }
    } catch (e) {
      this._showToast(`Lỗi: ${e.message}`, 'error');
    }
  }

  /** @private */
  async _handleDownloadSelected() {
    const selected = this._videos.filter((v) => this._selectedIds.has(String(v.aweme_id)));
    if (!selected.length) return;

    const items = selected.map((v) => ({
      url: `https://www.douyin.com/video/${v.aweme_id}`,
      desc: v.desc,
      cover: v.cover,
      date: v.date,
    }));

    try {
      const res = await apiClient.post('/api/queue/add', items);
      if (res?.added > 0) {
        this._showToast(`Đã thêm ${res.added} video vào hàng chờ`, 'success');
      } else {
        this._showToast('Không có video mới được thêm (có thể đã tồn tại)', 'warning');
      }
    } catch (e) {
      this._showToast(`Lỗi: ${e.message}`, 'error');
    }

    this._selectedIds.clear();
    this._renderGrid();
  }

  /** @private */
  _handlePrev() {
    if (this._page > 1) {
      this._page--;
      this._renderGrid();
    }
  }

  /** @private */
  async _handleNext() {
    const filtered = this._applyFilters();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    if (this._page < totalPages) {
      this._page++;
      this._renderGrid();
      return;
    }

    if (this._hasMore) {
      await this._loadMoreVideos();
      const refreshed = this._applyFilters();
      const refreshedPages = Math.max(1, Math.ceil(refreshed.length / PAGE_SIZE));
      if (this._page < refreshedPages) this._page++;
      this._renderGrid();
    }
  }

  // ─── API Calls ───────────────────────────────────────────────────────────────

  /** @private */
  async _searchUser(url) {
    this._setLoading(true);
    this._hideProfile();
    this._hideToolbar();

    try {
      const translateProvider = this._element.querySelector('#up-translate-provider')?.value || '';
      const body = { url };
      if (translateProvider) body.translate_provider = translateProvider;

      const info = await apiClient.post('/api/user_info', body);
      if (info.error) { this._showToast(info.error, 'error'); return; }

      this._userInfo = info;
      this._renderProfile(info);

      // Initialise video state
      this._videos = info.videos || [];
      this._hasMore = false;
      this._nextCursor = 0;
      this._awemeCount = parseInt(info.aweme_count, 10) || this._videos.length;
      this._loadedOffset = this._videos.length;
      this._page = 1;
      this._selectedIds.clear();
      this._syncQueuedIds();

      this._updateStatus();
      this._showToolbar();
      this._renderGrid();
    } catch (e) {
      this._showToast(`Lỗi: ${e.message}`, 'error');
    } finally {
      this._setLoading(false);
    }
  }

  /** @private */
  async _loadMoreVideos() {
    if (this._isLoading) return;
    this._isLoading = true;
    try {
      const res = await apiClient.post('/api/user_videos_page', {
        url: this._urlInput.value.trim(),
        cursor: this._nextCursor,
        count: 20,
        offset: this._nextCursor === 0 ? this._loadedOffset : 0,
      });
      if (!res) return;

      const merged = this._videos.concat(res.videos || []);
      const seen = new Set();
      this._videos = merged.filter((v) => {
        const key = String(v?.aweme_id || '');
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      this._hasMore = !!res.has_more;
      this._nextCursor = Number(res.next_cursor) || 0;
      if (res.offset !== undefined) this._loadedOffset = res.offset;

      this._updateStatus();
    } catch (e) {
      this._showToast(`Lỗi tải thêm: ${e.message}`, 'error');
    } finally {
      this._isLoading = false;
    }
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────

  /** @private */
  _renderProfile(info) {
    const q = (id) => this._element.querySelector(`#${id}`);

    const avatarEl = q('up-avatar');
    if (avatarEl) {
      avatarEl.innerHTML = info.avatar
        ? `<img class="user-page__avatar-img" src="/api/proxy_image?url=${encodeURIComponent(info.avatar)}" alt="${this._escHtml(info.nickname || '')} avatar" loading="lazy">`
        : `<div class="user-page__avatar-placeholder" aria-hidden="true">?</div>`;
    }

    const set = (id, val) => { const el = q(id); if (el) el.textContent = val || ''; };
    set('up-name', info.nickname);
    set('up-sig', info.signature);
    set('up-posts', this._fmtNum(info.aweme_count));
    set('up-followers', this._fmtNum(info.follower));
    set('up-following', this._fmtNum(info.following));

    this._profileEl.classList.remove('user-page__profile--hidden');
  }

  /** @private */
  _renderGrid() {
    this._syncQueuedIds();
    const filtered = this._applyFilters();
    const start = (this._page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    if (!pageItems.length) {
      this._gridEl.innerHTML = '<div class="user-page__empty" role="status">Không tìm thấy video</div>';
      this._renderPagination(filtered.length);
      return;
    }

    this._gridEl.innerHTML = pageItems.map((v) => this._cardTemplate(v)).join('');
    this._observeLazyImages();
    this._renderPagination(filtered.length);
    this._updateSelCount();
  }

  /** @private */
  _cardTemplate(v) {
    const awemeId = String(v.aweme_id || '');
    const inQueue = this._queuedAwemeIds.has(awemeId);
    const selected = !inQueue && this._selectedIds.has(awemeId);
    const thumb = v.cover ? `/api/proxy_image?url=${encodeURIComponent(v.cover)}` : '';
    const desc = this._escHtml(v.desc || '');
    const dur = v.type === 'video' ? this._fmtDur(v.duration) : '';

    const modifiers = [
      selected ? 'user-page__card--selected' : '',
      inQueue ? 'user-page__card--in-queue' : '',
    ].filter(Boolean).join(' ');

    return `
      <div
        class="user-page__card ${modifiers}"
        role="listitem"
        data-aweme-id="${awemeId}"
        tabindex="0"
        aria-label="${desc || 'Video'}"
        aria-pressed="${selected}"
      >
        <div class="user-page__card-thumb">
          ${thumb
            ? `<img data-src="${thumb}" alt="${desc}" class="user-page__card-img" loading="lazy">`
            : `<div class="user-page__card-thumb-ph" aria-hidden="true">&#127916;</div>`
          }
          <div class="user-page__card-check" aria-hidden="true">${selected ? '&#10003;' : ''}</div>
          ${inQueue ? `<span class="user-page__card-lock" aria-label="Đã có trong hàng chờ">&#128274;</span>` : ''}
          ${v.type === 'gallery' ? `<span class="user-page__card-badge user-page__card-badge--gallery">Ảnh</span>` : ''}
          ${dur ? `<span class="user-page__card-dur">${dur}</span>` : ''}
          ${!inQueue ? `
            <button
              type="button"
              class="user-page__card-queue-btn"
              data-queue-id="${awemeId}"
              aria-label="Thêm vào hàng chờ"
            >+ Hàng chờ</button>
          ` : ''}
        </div>
        <div class="user-page__card-meta">
          <div class="user-page__card-desc">${desc}</div>
          <div class="user-page__card-stats">
            <span>&#9654; ${this._fmtNum(v.play)}</span>
            <span>&#10084; ${this._fmtNum(v.like)}</span>
            ${dur ? `<span>&#9201; ${dur}</span>` : ''}
          </div>
          <div class="user-page__card-date">${v.date || ''}</div>
        </div>
      </div>
    `;
  }

  /** @private */
  _renderPagination(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const pageInfo = this._element.querySelector('#up-page-info');
    if (pageInfo) pageInfo.textContent = `Trang ${this._page} / ${totalPages}`;

    const prevBtn = this._element.querySelector('#up-prev');
    const nextBtn = this._element.querySelector('#up-next');
    if (prevBtn) prevBtn.disabled = this._page <= 1;
    if (nextBtn) nextBtn.disabled = this._page >= totalPages && !this._hasMore;

    this._paginationEl.classList.remove('user-page__pagination--hidden');
  }

  // ─── Filtering ───────────────────────────────────────────────────────────────

  /** @private */
  _applyFilters() {
    const q = (id) => this._element.querySelector(`#${id}`);
    const type = q('up-filter-type')?.value || 'all';
    const sort = q('up-filter-sort')?.value || 'newest';
    const search = (q('up-filter-search')?.value || '').toLowerCase();

    let list = this._videos.filter((v) => {
      if (type !== 'all' && v.type !== type) return false;
      if (search && !(v.desc || '').toLowerCase().includes(search)) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sort === 'newest') return (b.ts || 0) - (a.ts || 0);
      if (sort === 'oldest') return (a.ts || 0) - (b.ts || 0);
      if (sort === 'most_play') return (b.play || 0) - (a.play || 0);
      if (sort === 'most_like') return (b.like || 0) - (a.like || 0);
      return 0;
    });

    return list;
  }

  // ─── Selection ───────────────────────────────────────────────────────────────

  /** @private */
  _toggleSelect(awemeId) {
    if (!awemeId || this._queuedAwemeIds.has(String(awemeId))) return;
    const id = String(awemeId);
    if (this._selectedIds.has(id)) {
      this._selectedIds.delete(id);
    } else {
      this._selectedIds.add(id);
    }
    this._renderGrid();
  }

  /** @private */
  _syncQueuedIds() {
    const queue = Array.isArray(window._queue) ? window._queue : [];
    const next = new Set();
    queue.forEach((item) => {
      const m = String(item?.url || '').match(/\/video\/(\d+)/);
      if (m) next.add(m[1]);
    });
    // Merge with already-fetched ids (don't overwrite async fetch results)
    next.forEach(id => this._queuedAwemeIds.add(id));
  }

  /** @private */
  async _refreshQueuedIds() {
    try {
      const items = await fetch('/api/queue').then(r => r.json());
      const arr = Array.isArray(items) ? items : [];
      const next = new Set();
      arr.forEach(item => {
        const m = String(item?.url || '').match(/\/video\/(\d+)/);
        if (m) next.add(m[1]);
        if (item?.aweme_id) next.add(String(item.aweme_id));
      });
      this._queuedAwemeIds = next;
    } catch (_) {}
  }

  // ─── UI Helpers ──────────────────────────────────────────────────────────────

  /** @private */
  _setLoading(on) {
    this._isLoading = on;
    if (this._loadingEl) {
      this._loadingEl.classList.toggle('user-page__loading--hidden', !on);
    }
  }

  /** @private */
  _showProfile() {
    this._profileEl?.classList.remove('user-page__profile--hidden');
  }

  /** @private */
  _hideProfile() {
    this._profileEl?.classList.add('user-page__profile--hidden');
  }

  /** @private */
  _showToolbar() {
    this._toolbarEl?.classList.remove('user-page__toolbar--hidden');
  }

  /** @private */
  _hideToolbar() {
    this._toolbarEl?.classList.add('user-page__toolbar--hidden');
  }

  /** @private */
  _showUrlError(msg) {
    if (this._urlError) {
      this._urlError.textContent = msg;
      this._urlInput.classList.add('user-page__url-input--error');
    }
  }

  /** @private */
  _clearUrlError() {
    if (this._urlError) {
      this._urlError.textContent = '';
      this._urlInput.classList.remove('user-page__url-input--error');
    }
  }

  /** @private */
  _updateStatus() {
    if (!this._statusEl) return;
    const total = this._awemeCount > 0 ? this._awemeCount : '?';
    this._statusEl.textContent = `${this._videos.length}/${total} video${this._hasMore ? ' (còn thêm)' : ''}`;
  }

  /** @private */
  _updateSelCount() {
    const countEl = this._element.querySelector('#up-sel-count');
    if (countEl) countEl.textContent = this._selectedIds.size;
    const dlBtn = this._element.querySelector('#up-dl-selected');
    if (dlBtn) dlBtn.classList.toggle('user-page__action-btn--hidden', this._selectedIds.size === 0);
  }

  /** @private */
  _showToast(message, type = 'info') {
    // Delegate to global toast if available, otherwise console
    if (typeof window.toast === 'function') {
      window.toast(message, type);
    } else {
      console[type === 'error' ? 'error' : 'log'](`[UserPage] ${message}`);
    }
  }

  // ─── Formatters ──────────────────────────────────────────────────────────────

  /** @private */
  _fmtNum(n) {
    if (!n && n !== 0) return '0';
    const num = Number(n);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return String(num);
  }

  /** @private */
  _fmtDur(seconds) {
    if (!seconds) return '';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) return `${h}:${pad(m % 60)}:${pad(s % 60)}`;
    return `${m}:${pad(s % 60)}`;
  }

  /** @private */
  _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /** @returns {HTMLElement} */
  get element() { return this._element; }

  /** @returns {boolean} */
  get mounted() { return this._mounted; }
}

export default UserPage;
