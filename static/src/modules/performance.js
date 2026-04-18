/**
 * Performance Module
 * Lazy loading, virtual scrolling helper, event optimization, and API response caching.
 *
 * @module performance
 */

import { debounce, throttle } from './utils.js';

// ============================================================================
// Lazy Loading (Intersection Observer)
// ============================================================================

/**
 * Lazily load images using IntersectionObserver.
 * Images must have `data-src` attribute; `src` is set when they enter the viewport.
 *
 * @param {string} [selector='[data-src]'] - CSS selector for lazy images
 * @param {IntersectionObserverInit} [options]
 * @returns {IntersectionObserver}
 *
 * @example
 * initLazyImages();
 * // <img data-src="/path/to/image.jpg" alt="..." />
 */
export function initLazyImages(selector = '[data-src]', options = {}) {
  const defaultOptions = { rootMargin: '200px 0px', threshold: 0.01, ...options };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
        img.classList.add('lazy--loaded');
      }
      observer.unobserve(img);
    });
  }, defaultOptions);

  document.querySelectorAll(selector).forEach(img => observer.observe(img));
  return observer;
}

/**
 * Observe a single element for lazy loading.
 * @param {HTMLElement} el
 * @param {Function} onVisible - Called when element enters viewport
 * @returns {IntersectionObserver}
 */
export function observeVisibility(el, onVisible) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        onVisible(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '100px' });

  observer.observe(el);
  return observer;
}

// ============================================================================
// Virtual Scroll Helper
// ============================================================================

/**
 * VirtualScroller - renders only visible rows in a scrollable container.
 * Used for long lists (queue, history) to keep DOM size small.
 *
 * @example
 * const scroller = new VirtualScroller({
 *   container: document.querySelector('#list'),
 *   items: myItems,
 *   rowHeight: 48,
 *   renderRow: (item) => `<div class="row">${item.name}</div>`,
 * });
 * scroller.render();
 */
export class VirtualScroller {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - Scrollable container
   * @param {Array} options.items - Full data array
   * @param {number} options.rowHeight - Fixed row height in px
   * @param {Function} options.renderRow - (item, index) => HTML string
   * @param {number} [options.buffer=5] - Extra rows to render above/below viewport
   */
  constructor(options) {
    this._container = options.container;
    this._items = options.items || [];
    this._rowHeight = options.rowHeight || 48;
    this._renderRow = options.renderRow;
    this._buffer = options.buffer || 5;

    this._inner = document.createElement('div');
    this._inner.style.position = 'relative';
    this._container.appendChild(this._inner);

    this._onScroll = throttle(() => this.render(), 16);
    this._container.addEventListener('scroll', this._onScroll);
  }

  setItems(items) {
    this._items = items;
    this.render();
  }

  render() {
    const total = this._items.length;
    const containerH = this._container.clientHeight || 400;
    const scrollTop = this._container.scrollTop;
    const rowH = this._rowHeight;
    const buffer = this._buffer;

    this._inner.style.height = total * rowH + 'px';

    const startIdx = Math.max(0, Math.floor(scrollTop / rowH) - buffer);
    const visibleCount = Math.ceil(containerH / rowH) + buffer * 2;
    const endIdx = Math.min(total, startIdx + visibleCount);

    const html = this._items.slice(startIdx, endIdx).map((item, i) => {
      const top = (startIdx + i) * rowH;
      return `<div style="position:absolute;top:${top}px;left:0;right:0;height:${rowH}px">
        ${this._renderRow(item, startIdx + i)}
      </div>`;
    }).join('');

    this._inner.innerHTML = html;
  }

  destroy() {
    this._container.removeEventListener('scroll', this._onScroll);
    this._inner.remove();
  }
}

// ============================================================================
// API Response Cache
// ============================================================================

/**
 * Simple in-memory cache with TTL for API responses.
 *
 * @example
 * const cache = new ResponseCache({ ttl: 60000 }); // 1 minute TTL
 * cache.set('/api/config', configData);
 * const data = cache.get('/api/config'); // returns data or null if expired
 */
export class ResponseCache {
  /**
   * @param {Object} [options]
   * @param {number} [options.ttl=300000] - Time-to-live in ms (default 5 min)
   * @param {number} [options.maxSize=50] - Max number of cached entries
   */
  constructor(options = {}) {
    this._ttl = options.ttl ?? 300_000;
    this._maxSize = options.maxSize ?? 50;
    this._store = new Map();
  }

  /**
   * Get a cached value. Returns null if missing or expired.
   * @param {string} key
   * @returns {*|null}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this._ttl) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Store a value in the cache.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    // Evict oldest entry if at capacity
    if (this._store.size >= this._maxSize) {
      const firstKey = this._store.keys().next().value;
      this._store.delete(firstKey);
    }
    this._store.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Invalidate a specific key or all keys matching a prefix.
   * @param {string} keyOrPrefix
   */
  invalidate(keyOrPrefix) {
    for (const key of this._store.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this._store.delete(key);
      }
    }
  }

  /** Clear all cached entries. */
  clear() {
    this._store.clear();
  }

  get size() { return this._store.size; }
}

// Singleton cache instance for the app
export const apiCache = new ResponseCache({ ttl: 300_000 });

// ============================================================================
// Optimized Event Handlers
// ============================================================================

/**
 * Attach a debounced input handler (for search fields).
 * @param {HTMLElement} el
 * @param {Function} handler
 * @param {number} [delay=300]
 * @returns {Function} cleanup
 */
export function attachDebouncedInput(el, handler, delay = 300) {
  const debouncedHandler = debounce(handler, delay);
  el.addEventListener('input', debouncedHandler);
  return () => el.removeEventListener('input', debouncedHandler);
}

/**
 * Attach a throttled scroll handler.
 * @param {HTMLElement|Window} target
 * @param {Function} handler
 * @param {number} [interval=100]
 * @returns {Function} cleanup
 */
export function attachThrottledScroll(target, handler, interval = 100) {
  const throttledHandler = throttle(handler, interval);
  target.addEventListener('scroll', throttledHandler, { passive: true });
  return () => target.removeEventListener('scroll', throttledHandler);
}

/**
 * Attach a throttled resize handler.
 * @param {Function} handler
 * @param {number} [interval=200]
 * @returns {Function} cleanup
 */
export function attachThrottledResize(handler, interval = 200) {
  const throttledHandler = throttle(handler, interval);
  window.addEventListener('resize', throttledHandler, { passive: true });
  return () => window.removeEventListener('resize', throttledHandler);
}

export default {
  initLazyImages,
  observeVisibility,
  VirtualScroller,
  ResponseCache,
  apiCache,
  attachDebouncedInput,
  attachThrottledScroll,
  attachThrottledResize,
};
