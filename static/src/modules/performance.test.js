/**
 * Tests for performance module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponseCache, VirtualScroller } from './performance.js';

vi.mock('./utils.js', () => ({
  debounce: (fn) => fn,
  throttle: (fn) => fn,
}));

describe('ResponseCache', () => {
  let cache;

  beforeEach(() => {
    cache = new ResponseCache({ ttl: 1000, maxSize: 3 });
  });

  it('stores and retrieves values', () => {
    cache.set('/api/config', { theme: 'dark' });
    expect(cache.get('/api/config')).toEqual({ theme: 'dark' });
  });

  it('returns null for missing keys', () => {
    expect(cache.get('/api/missing')).toBeNull();
  });

  it('evicts oldest entry when at capacity', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // should evict 'a'
    expect(cache.get('a')).toBeNull();
    expect(cache.get('d')).toBe(4);
  });

  it('invalidates by prefix', () => {
    cache.set('/api/config', 1);
    cache.set('/api/config/sub', 2);
    cache.set('/api/other', 3);
    cache.invalidate('/api/config');
    expect(cache.get('/api/config')).toBeNull();
    expect(cache.get('/api/config/sub')).toBeNull();
    expect(cache.get('/api/other')).toBe(3);
  });

  it('clears all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe('VirtualScroller', () => {
  it('renders visible rows', () => {
    const container = document.createElement('div');
    container.style.height = '200px';
    document.body.appendChild(container);

    const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    const scroller = new VirtualScroller({
      container,
      items,
      rowHeight: 48,
      renderRow: (item) => `<span>${item.name}</span>`,
    });

    scroller.render();

    // Should render some rows but not all 100
    const rendered = container.querySelectorAll('span').length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(100);

    scroller.destroy();
  });
});
