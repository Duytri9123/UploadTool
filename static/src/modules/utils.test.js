/**
 * Unit tests for utils module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  debounce,
  throttle,
  formatBytes,
  formatDuration,
  formatDate,
  formatRelativeTime,
  createElement,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  attr,
  removeAttr,
  qs,
  qsa,
  generateId,
  deepClone,
  isEmpty
} from './utils.js';

describe('Performance Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const func = vi.fn();
      const debounced = debounce(func, 300);

      debounced();
      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on subsequent calls', () => {
      const func = vi.fn();
      const debounced = debounce(func, 300);

      debounced();
      vi.advanceTimersByTime(200);
      debounced();
      vi.advanceTimersByTime(200);
      debounced();
      vi.advanceTimersByTime(300);

      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
      const func = vi.fn();
      const debounced = debounce(func, 300);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(300);

      expect(func).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('throttle', () => {
    it('should execute function immediately on first call', () => {
      const func = vi.fn();
      const throttled = throttle(func, 300);

      throttled();
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should throttle subsequent calls', () => {
      const func = vi.fn();
      const throttled = throttle(func, 300);

      throttled();
      throttled();
      throttled();

      expect(func).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(300);
      expect(func).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Formatting Utilities', () => {
  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle invalid input', () => {
      expect(formatBytes(-1)).toBe('N/A');
      expect(formatBytes(null)).toBe('N/A');
      expect(formatBytes(undefined)).toBe('N/A');
    });

    it('should respect decimal places', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 3)).toBe('1.5 KB');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(45)).toBe('0:45');
      expect(formatDuration(65)).toBe('0:01:05');
      expect(formatDuration(3665)).toBe('1:01:05');
    });

    it('should handle showHours parameter', () => {
      expect(formatDuration(65, false)).toBe('1:05');
      expect(formatDuration(65, true)).toBe('0:01:05');
    });

    it('should handle invalid input', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(-1)).toBe('0:00');
      expect(formatDuration(null)).toBe('0:00');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T14:30:45');
      
      expect(formatDate(date, 'date')).toBe('2024-01-15');
      expect(formatDate(date, 'time')).toBe('14:30:45');
      expect(formatDate(date, 'datetime')).toBe('2024-01-15 14:30:45');
    });

    it('should handle timestamp input', () => {
      const timestamp = new Date('2024-01-15T14:30:45').getTime();
      expect(formatDate(timestamp, 'date')).toBe('2024-01-15');
    });

    it('should handle invalid date', () => {
      expect(formatDate('invalid')).toBe('Invalid Date');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format relative time correctly', () => {
      const now = Date.now();
      
      expect(formatRelativeTime(now - 5000)).toBe('5 seconds ago');
      expect(formatRelativeTime(now - 60000)).toBe('1 minute ago');
      expect(formatRelativeTime(now - 120000)).toBe('2 minutes ago');
      expect(formatRelativeTime(now - 3600000)).toBe('1 hour ago');
      expect(formatRelativeTime(now - 7200000)).toBe('2 hours ago');
      expect(formatRelativeTime(now - 86400000)).toBe('1 day ago');
    });

    it('should show "just now" for very recent times', () => {
      expect(formatRelativeTime(Date.now() - 5000)).toBe('5 seconds ago');
      expect(formatRelativeTime(Date.now() - 500)).toBe('just now');
    });
  });
});

describe('DOM Utilities', () => {
  describe('createElement', () => {
    it('should create element with tag name', () => {
      const div = createElement('div');
      expect(div.tagName).toBe('DIV');
    });

    it('should set className attribute', () => {
      const div = createElement('div', { className: 'test-class' });
      expect(div.className).toBe('test-class');
    });

    it('should set multiple attributes', () => {
      const input = createElement('input', {
        id: 'test-input',
        type: 'text',
        placeholder: 'Enter text'
      });
      
      expect(input.id).toBe('test-input');
      expect(input.type).toBe('text');
      expect(input.placeholder).toBe('Enter text');
    });

    it('should append text children', () => {
      const div = createElement('div', {}, ['Hello World']);
      expect(div.textContent).toBe('Hello World');
    });

    it('should append element children', () => {
      const child = createElement('span', {}, ['Child']);
      const parent = createElement('div', {}, [child]);
      
      expect(parent.children.length).toBe(1);
      expect(parent.children[0].tagName).toBe('SPAN');
    });

    it('should set dataset attributes', () => {
      const div = createElement('div', {
        dataset: { id: '123', name: 'test' }
      });
      
      expect(div.dataset.id).toBe('123');
      expect(div.dataset.name).toBe('test');
    });
  });

  describe('addClass', () => {
    it('should add single class', () => {
      const div = document.createElement('div');
      addClass(div, 'test-class');
      expect(div.classList.contains('test-class')).toBe(true);
    });

    it('should add multiple classes', () => {
      const div = document.createElement('div');
      addClass(div, 'class1', 'class2', 'class3');
      expect(div.classList.contains('class1')).toBe(true);
      expect(div.classList.contains('class2')).toBe(true);
      expect(div.classList.contains('class3')).toBe(true);
    });

    it('should handle invalid element gracefully', () => {
      expect(() => addClass(null, 'test')).not.toThrow();
    });
  });

  describe('removeClass', () => {
    it('should remove single class', () => {
      const div = document.createElement('div');
      div.className = 'class1 class2';
      removeClass(div, 'class1');
      expect(div.classList.contains('class1')).toBe(false);
      expect(div.classList.contains('class2')).toBe(true);
    });

    it('should remove multiple classes', () => {
      const div = document.createElement('div');
      div.className = 'class1 class2 class3';
      removeClass(div, 'class1', 'class2');
      expect(div.classList.contains('class1')).toBe(false);
      expect(div.classList.contains('class2')).toBe(false);
      expect(div.classList.contains('class3')).toBe(true);
    });
  });

  describe('toggleClass', () => {
    it('should toggle class', () => {
      const div = document.createElement('div');
      toggleClass(div, 'active');
      expect(div.classList.contains('active')).toBe(true);
      toggleClass(div, 'active');
      expect(div.classList.contains('active')).toBe(false);
    });

    it('should force add class', () => {
      const div = document.createElement('div');
      toggleClass(div, 'active', true);
      expect(div.classList.contains('active')).toBe(true);
      toggleClass(div, 'active', true);
      expect(div.classList.contains('active')).toBe(true);
    });

    it('should force remove class', () => {
      const div = document.createElement('div');
      div.className = 'active';
      toggleClass(div, 'active', false);
      expect(div.classList.contains('active')).toBe(false);
    });
  });

  describe('hasClass', () => {
    it('should check if element has class', () => {
      const div = document.createElement('div');
      div.className = 'test-class';
      expect(hasClass(div, 'test-class')).toBe(true);
      expect(hasClass(div, 'other-class')).toBe(false);
    });

    it('should return false for invalid element', () => {
      expect(hasClass(null, 'test')).toBe(false);
    });
  });

  describe('attr', () => {
    it('should get attribute', () => {
      const div = document.createElement('div');
      div.setAttribute('data-id', '123');
      expect(attr(div, 'data-id')).toBe('123');
    });

    it('should set single attribute', () => {
      const div = document.createElement('div');
      attr(div, 'data-id', '123');
      expect(div.getAttribute('data-id')).toBe('123');
    });

    it('should set multiple attributes', () => {
      const div = document.createElement('div');
      attr(div, { 'data-id': '123', 'data-name': 'test' });
      expect(div.getAttribute('data-id')).toBe('123');
      expect(div.getAttribute('data-name')).toBe('test');
    });
  });

  describe('removeAttr', () => {
    it('should remove single attribute', () => {
      const div = document.createElement('div');
      div.setAttribute('data-id', '123');
      removeAttr(div, 'data-id');
      expect(div.hasAttribute('data-id')).toBe(false);
    });

    it('should remove multiple attributes', () => {
      const div = document.createElement('div');
      div.setAttribute('data-id', '123');
      div.setAttribute('data-name', 'test');
      removeAttr(div, 'data-id', 'data-name');
      expect(div.hasAttribute('data-id')).toBe(false);
      expect(div.hasAttribute('data-name')).toBe(false);
    });
  });

  describe('qs and qsa', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="container">
          <button class="btn">Button 1</button>
          <button class="btn">Button 2</button>
        </div>
      `;
    });

    it('should query single element', () => {
      const container = qs('.container');
      expect(container).not.toBeNull();
      expect(container.className).toBe('container');
    });

    it('should query multiple elements', () => {
      const buttons = qsa('.btn');
      expect(buttons.length).toBe(2);
      expect(Array.isArray(buttons)).toBe(true);
    });

    it('should query within context', () => {
      const container = qs('.container');
      const buttons = qsa('.btn', container);
      expect(buttons.length).toBe(2);
    });
  });
});

describe('Utility Functions', () => {
  describe('generateId', () => {
    it('should generate unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate ID with prefix', () => {
      const id = generateId('btn');
      expect(id.startsWith('btn-')).toBe(true);
    });
  });

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
    });

    it('should clone arrays', () => {
      const original = [1, 2, [3, 4]];
      const cloned = deepClone(original);
      cloned[2][0] = 99;
      expect(original[2][0]).toBe(3);
    });

    it('should clone objects', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);
      cloned.b.c = 99;
      expect(original.b.c).toBe(2);
    });

    it('should clone dates', () => {
      const original = new Date('2024-01-15');
      const cloned = deepClone(original);
      expect(cloned.getTime()).toBe(original.getTime());
      expect(cloned).not.toBe(original);
    });
  });

  describe('isEmpty', () => {
    it('should detect empty values', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    it('should detect non-empty values', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty([1, 2])).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });
});
