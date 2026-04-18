/**
 * HistoryPage Component
 * Displays download history with search, filter, and virtual scrolling for long lists.
 */

import apiClient from '../../modules/api-client.js';

export class HistoryPage {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.container] - Mount target
   */
  constructor(options = {}) {
    this.options = options;
    this._element = null;
    this._allRows = [];
    this._filteredRows = [];
    this._searchQuery = '';
    this._filterType = 'all';
    this._mounted = false;
    this._searchDebounceTimer = null;

    // Virtual scroll state
    this._rowHeight = 48;
    this._visibleBuffer = 5;
    this._scrollContainer = null;

    this._init();
  }

  _init() {
    this._element = this._createElement();
    this._attachListeners();
  }

  _createElement() {
    const section = document.createElement('section');
    section.className = 'history-page';
    section.setAttribute('aria-labelledby', 'history-page-title');
    section.innerHTML = this._buildHTML();
    return section;
  }

  _buildHTML() {
    return `
      <div class="history-page__header">
        <h2 id="history-page-title" class="history-page__title">Lịch Sử Tải Xuống</h2>
        <div class="history-page__actions">
          <button id="btn-history-refresh" class="btn btn--secondary btn--small" type="button" aria-label="Làm mới lịch sử">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            Làm mới
          </button>
          <button id="btn-history-clear" class="btn btn--danger btn--small" type="button" aria-label="Xóa lịch sử">
            Xóa lịch sử
          </button>
        </div>
      </div>

      <div class="history-page__toolbar">
        <div class="history-page__search">
          <label for="history-search" class="sr-only">Tìm kiếm lịch sử</label>
          <input
            id="history-search"
            class="input history-page__search-input"
            type="search"
            placeholder="Tìm kiếm URL, loại..."
            aria-label="Tìm kiếm lịch sử"
          />
        </div>
        <div class="history-page__filter">
          <label for="history-filter" class="sr-only">Lọc theo loại</label>
          <select id="history-filter" class="input history-page__filter-select" aria-label="Lọc theo loại">
            <option value="all">Tất cả loại</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="user">User</option>
          </select>
        </div>
        <span id="history-count" class="history-page__count" aria-live="polite"></span>
      </div>

      <div class="history-page__table-wrapper" role="region" aria-label="Bảng lịch sử tải xuống">
        <table class="history-page__table" aria-label="Lịch sử tải xuống">
          <thead>
            <tr>
              <th scope="col" class="history-page__th">Thời gian</th>
              <th scope="col" class="history-page__th history-page__th--url">URL</th>
              <th scope="col" class="history-page__th">Loại</th>
              <th scope="col" class="history-page__th">Tổng</th>
              <th scope="col" class="history-page__th">Thành công</th>
            </tr>
          </thead>
        </table>
        <div
          id="history-scroll-container"
          class="history-page__scroll-container"
          role="rowgroup"
          aria-label="Danh sách lịch sử"
          tabindex="0"
        >
          <div id="history-spacer-top" class="history-page__spacer"></div>
          <table class="history-page__table history-page__table--body" aria-hidden="true">
            <tbody id="history-body"></tbody>
          </table>
          <div id="history-spacer-bottom" class="history-page__spacer"></div>
        </div>
      </div>

      <div id="history-empty" class="history-page__empty" hidden aria-live="polite">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Chưa có lịch sử tải xuống</p>
      </div>

      <div id="history-loading" class="history-page__loading" hidden aria-live="polite" aria-label="Đang tải...">
        <div class="history-page__spinner" aria-hidden="true"></div>
        <span>Đang tải lịch sử...</span>
      </div>
    `;
  }

  _attachListeners() {
    this._element.querySelector('#btn-history-refresh')?.addEventListener('click', () => this.load());
    this._element.querySelector('#btn-history-clear')?.addEventListener('click', () => this.clearHistory());

    const searchInput = this._element.querySelector('#history-search');
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = setTimeout(() => {
        this._searchQuery = e.target.value.toLowerCase();
        this._applyFilters();
      }, 300);
    });

    const filterSelect = this._element.querySelector('#history-filter');
    filterSelect?.addEventListener('change', (e) => {
      this._filterType = e.target.value;
      this._applyFilters();
    });

    this._scrollContainer = this._element.querySelector('#history-scroll-container');
    this._scrollContainer?.addEventListener('scroll', () => this._renderVirtualRows());
  }

  async load() {
    this._setLoading(true);
    try {
      const rows = await apiClient.get('/api/history');
      this._allRows = Array.isArray(rows) ? rows : [];
      this._applyFilters();
    } catch (err) {
      console.error('Failed to load history:', err);
      this._allRows = [];
      this._applyFilters();
    } finally {
      this._setLoading(false);
    }
  }

  async clearHistory() {
    if (!confirm('Xóa toàn bộ lịch sử tải xuống?')) return;
    try {
      await apiClient.post('/api/history/clear', {});
      this._allRows = [];
      this._applyFilters();
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }

  _applyFilters() {
    let rows = this._allRows;

    // Filter by type
    if (this._filterType !== 'all') {
      rows = rows.filter(r => (r.type || '').toLowerCase().includes(this._filterType));
    }

    // Filter by search query
    if (this._searchQuery) {
      rows = rows.filter(r =>
        (r.url || '').toLowerCase().includes(this._searchQuery) ||
        (r.type || '').toLowerCase().includes(this._searchQuery) ||
        (r.time || '').toLowerCase().includes(this._searchQuery)
      );
    }

    this._filteredRows = rows;
    this._updateCount();
    this._renderVirtualRows();
    this._toggleEmpty(rows.length === 0);
  }

  _updateCount() {
    const countEl = this._element.querySelector('#history-count');
    if (countEl) {
      countEl.textContent = this._filteredRows.length > 0
        ? `${this._filteredRows.length} kết quả`
        : '';
    }
  }

  _renderVirtualRows() {
    const container = this._scrollContainer;
    const tbody = this._element.querySelector('#history-body');
    const spacerTop = this._element.querySelector('#history-spacer-top');
    const spacerBottom = this._element.querySelector('#history-spacer-bottom');

    if (!container || !tbody) return;

    const rows = this._filteredRows;
    const totalRows = rows.length;

    if (totalRows === 0) {
      tbody.innerHTML = '';
      if (spacerTop) spacerTop.style.height = '0px';
      if (spacerBottom) spacerBottom.style.height = '0px';
      return;
    }

    const containerHeight = container.clientHeight || 400;
    const scrollTop = container.scrollTop;
    const rowH = this._rowHeight;
    const buffer = this._visibleBuffer;

    const startIdx = Math.max(0, Math.floor(scrollTop / rowH) - buffer);
    const visibleCount = Math.ceil(containerHeight / rowH) + buffer * 2;
    const endIdx = Math.min(totalRows, startIdx + visibleCount);

    const topHeight = startIdx * rowH;
    const bottomHeight = (totalRows - endIdx) * rowH;

    if (spacerTop) spacerTop.style.height = topHeight + 'px';
    if (spacerBottom) spacerBottom.style.height = bottomHeight + 'px';

    tbody.innerHTML = rows.slice(startIdx, endIdx).map(r => `
      <tr class="history-page__row">
        <td class="history-page__td">${this._escHtml(r.time || '')}</td>
        <td class="history-page__td history-page__td--url" title="${this._escHtml(r.url || '')}">
          <a href="${this._escHtml(r.url || '')}" target="_blank" rel="noopener noreferrer" class="history-page__link">
            ${this._escHtml(this._truncateUrl(r.url || ''))}
          </a>
        </td>
        <td class="history-page__td">
          <span class="history-page__badge history-page__badge--${(r.type || 'unknown').toLowerCase()}">
            ${this._escHtml(r.type || 'unknown')}
          </span>
        </td>
        <td class="history-page__td">${r.total ?? 0}</td>
        <td class="history-page__td">
          <span class="${r.success === r.total ? 'history-page__success' : 'history-page__partial'}">
            ${r.success ?? 0}
          </span>
        </td>
      </tr>
    `).join('');
  }

  _toggleEmpty(isEmpty) {
    const emptyEl = this._element.querySelector('#history-empty');
    const tableWrapper = this._element.querySelector('.history-page__table-wrapper');
    if (emptyEl) emptyEl.hidden = !isEmpty;
    if (tableWrapper) tableWrapper.style.display = isEmpty ? 'none' : '';
  }

  _setLoading(loading) {
    const loadingEl = this._element.querySelector('#history-loading');
    if (loadingEl) loadingEl.hidden = !loading;
  }

  _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _truncateUrl(url, maxLen = 60) {
    return url.length > maxLen ? url.slice(0, maxLen) + '…' : url;
  }

  mount(parent) {
    if (this._mounted) return;
    parent.appendChild(this._element);
    this._mounted = true;
    this.load();
  }

  unmount() {
    if (!this._mounted) return;
    clearTimeout(this._searchDebounceTimer);
    if (this._element.parentNode) this._element.parentNode.removeChild(this._element);
    this._mounted = false;
  }

  destroy() {
    this.unmount();
    this._element = null;
  }

  get element() { return this._element; }
}

export default HistoryPage;
