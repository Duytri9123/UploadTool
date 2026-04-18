/**
 * Utility Functions Module
 * 
 * This module provides common utility functions used throughout the application:
 * - Performance utilities (debounce, throttle)
 * - Formatting utilities (bytes, duration, dates)
 * - DOM manipulation helpers
 * 
 * @module utils
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} The debounced function
 * 
 * @example
 * const debouncedSearch = debounce((query) => {
 *   console.log('Searching for:', query);
 * }, 300);
 * 
 * input.addEventListener('input', (e) => debouncedSearch(e.target.value));
 */
export function debounce(func, wait) {
  let timeoutId;
  
  return function debounced(...args) {
    const context = this;
    
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * 
 * @param {Function} func - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle invocations to
 * @returns {Function} The throttled function
 * 
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll position:', window.scrollY);
 * }, 100);
 * 
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle(func, wait) {
  let timeoutId;
  let lastRan;
  
  return function throttled(...args) {
    const context = this;
    
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        if (Date.now() - lastRan >= wait) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, wait - (Date.now() - lastRan));
    }
  };
}

/**
 * Formats bytes into human-readable file size string.
 * 
 * @param {number} bytes - The number of bytes
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 * 
 * @example
 * formatBytes(1024);        // "1 KB"
 * formatBytes(1536);        // "1.5 KB"
 * formatBytes(1048576);     // "1 MB"
 * formatBytes(1234567890);  // "1.15 GB"
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || bytes < 0) return 'N/A';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats duration in seconds into human-readable time string.
 * 
 * @param {number} seconds - Duration in seconds
 * @param {boolean} [showHours=true] - Whether to show hours even if 0
 * @returns {string} Formatted duration (e.g., "1:23:45" or "23:45")
 * 
 * @example
 * formatDuration(65);      // "1:05"
 * formatDuration(3665);    // "1:01:05"
 * formatDuration(45);      // "0:45"
 */
export function formatDuration(seconds, showHours = true) {
  if (!seconds || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const pad = (num) => String(num).padStart(2, '0');
  
  if (hours > 0 || showHours) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  
  return `${minutes}:${pad(secs)}`;
}

/**
 * Formats a date object or timestamp into a readable string.
 * 
 * @param {Date|number|string} date - Date object, timestamp, or date string
 * @param {string} [format='datetime'] - Format type: 'date', 'time', 'datetime', 'relative'
 * @returns {string} Formatted date string
 * 
 * @example
 * formatDate(new Date(), 'date');      // "2024-01-15"
 * formatDate(new Date(), 'time');      // "14:30:45"
 * formatDate(new Date(), 'datetime');  // "2024-01-15 14:30:45"
 * formatDate(Date.now() - 60000, 'relative'); // "1 minute ago"
 */
export function formatDate(date, format = 'datetime') {
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const pad = (num) => String(num).padStart(2, '0');
  
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  
  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`;
    
    case 'time':
      return `${hours}:${minutes}:${seconds}`;
    
    case 'datetime':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    case 'relative':
      return formatRelativeTime(d);
    
    default:
      return d.toLocaleString();
  }
}

/**
 * Formats a date as relative time (e.g., "2 hours ago").
 * 
 * @param {Date|number} date - Date object or timestamp
 * @returns {string} Relative time string
 * 
 * @example
 * formatRelativeTime(Date.now() - 1000);     // "just now"
 * formatRelativeTime(Date.now() - 60000);    // "1 minute ago"
 * formatRelativeTime(Date.now() - 3600000);  // "1 hour ago"
 */
export function formatRelativeTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 10) return 'just now';
  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  
  return formatDate(d, 'date');
}

/**
 * Creates a DOM element with specified attributes and children.
 * 
 * @param {string} tag - HTML tag name
 * @param {Object} [attributes={}] - Element attributes (className, id, etc.)
 * @param {Array<Node|string>} [children=[]] - Child elements or text
 * @returns {HTMLElement} Created element
 * 
 * @example
 * const button = createElement('button', 
 *   { className: 'btn btn--primary', id: 'submit-btn' },
 *   ['Submit']
 * );
 * 
 * const div = createElement('div',
 *   { className: 'card' },
 *   [
 *     createElement('h2', {}, ['Title']),
 *     createElement('p', {}, ['Content'])
 *   ]
 * );
 */
export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Append children
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });
  
  return element;
}

/**
 * Adds one or more CSS classes to an element.
 * 
 * @param {HTMLElement} element - Target element
 * @param {...string} classNames - Class names to add
 * 
 * @example
 * addClass(button, 'active');
 * addClass(button, 'btn', 'btn--primary', 'btn--large');
 */
export function addClass(element, ...classNames) {
  if (!element || !(element instanceof HTMLElement)) {
    console.warn('addClass: Invalid element provided');
    return;
  }
  
  element.classList.add(...classNames);
}

/**
 * Removes one or more CSS classes from an element.
 * 
 * @param {HTMLElement} element - Target element
 * @param {...string} classNames - Class names to remove
 * 
 * @example
 * removeClass(button, 'active');
 * removeClass(button, 'btn--primary', 'btn--large');
 */
export function removeClass(element, ...classNames) {
  if (!element || !(element instanceof HTMLElement)) {
    console.warn('removeClass: Invalid element provided');
    return;
  }
  
  element.classList.remove(...classNames);
}

/**
 * Toggles a CSS class on an element.
 * 
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to toggle
 * @param {boolean} [force] - Force add (true) or remove (false)
 * @returns {boolean} True if class is now present, false otherwise
 * 
 * @example
 * toggleClass(button, 'active');
 * toggleClass(button, 'hidden', false); // Force remove
 */
export function toggleClass(element, className, force) {
  if (!element || !(element instanceof HTMLElement)) {
    console.warn('toggleClass: Invalid element provided');
    return false;
  }
  
  return element.classList.toggle(className, force);
}

/**
 * Checks if an element has a CSS class.
 * 
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to check
 * @returns {boolean} True if element has the class
 * 
 * @example
 * if (hasClass(button, 'active')) {
 *   console.log('Button is active');
 * }
 */
export function hasClass(element, className) {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }
  
  return element.classList.contains(className);
}

/**
 * Gets or sets element attributes.
 * 
 * @param {HTMLElement} element - Target element
 * @param {string|Object} attr - Attribute name or object of attributes
 * @param {*} [value] - Attribute value (if attr is string)
 * @returns {string|null|undefined} Attribute value if getting, undefined if setting
 * 
 * @example
 * // Get attribute
 * const id = attr(button, 'id');
 * 
 * // Set single attribute
 * attr(button, 'disabled', 'true');
 * 
 * // Set multiple attributes
 * attr(button, { id: 'submit', type: 'button' });
 */
export function attr(element, attr, value) {
  if (!element || !(element instanceof HTMLElement)) {
    console.warn('attr: Invalid element provided');
    return null;
  }
  
  // Get attribute
  if (typeof attr === 'string' && value === undefined) {
    return element.getAttribute(attr);
  }
  
  // Set single attribute
  if (typeof attr === 'string') {
    element.setAttribute(attr, value);
    return;
  }
  
  // Set multiple attributes
  if (typeof attr === 'object') {
    Object.entries(attr).forEach(([key, val]) => {
      element.setAttribute(key, val);
    });
  }
}

/**
 * Removes element attributes.
 * 
 * @param {HTMLElement} element - Target element
 * @param {...string} attributes - Attribute names to remove
 * 
 * @example
 * removeAttr(button, 'disabled');
 * removeAttr(input, 'readonly', 'disabled');
 */
export function removeAttr(element, ...attributes) {
  if (!element || !(element instanceof HTMLElement)) {
    console.warn('removeAttr: Invalid element provided');
    return;
  }
  
  attributes.forEach(attr => element.removeAttribute(attr));
}

/**
 * Safely queries for a single element.
 * 
 * @param {string} selector - CSS selector
 * @param {HTMLElement|Document} [context=document] - Context to search within
 * @returns {HTMLElement|null} Found element or null
 * 
 * @example
 * const button = qs('#submit-btn');
 * const input = qs('.form__input', formElement);
 */
export function qs(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * Safely queries for multiple elements.
 * 
 * @param {string} selector - CSS selector
 * @param {HTMLElement|Document} [context=document] - Context to search within
 * @returns {Array<HTMLElement>} Array of found elements
 * 
 * @example
 * const buttons = qsa('.btn');
 * const inputs = qsa('input', formElement);
 */
export function qsa(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * Waits for an element to appear in the DOM.
 * 
 * @param {string} selector - CSS selector
 * @param {number} [timeout=5000] - Timeout in milliseconds
 * @returns {Promise<HTMLElement>} Promise that resolves with the element
 * 
 * @example
 * waitForElement('.modal').then(modal => {
 *   console.log('Modal appeared:', modal);
 * });
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = qs(selector);
    
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = qs(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Generates a unique ID.
 * 
 * @param {string} [prefix=''] - Optional prefix for the ID
 * @returns {string} Unique ID
 * 
 * @example
 * const id = generateId();        // "a1b2c3d4"
 * const id = generateId('btn');   // "btn-a1b2c3d4"
 */
export function generateId(prefix = '') {
  const random = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}-${random}` : random;
}

/**
 * Deep clones an object or array.
 * 
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 * 
 * @example
 * const original = { a: 1, b: { c: 2 } };
 * const cloned = deepClone(original);
 * cloned.b.c = 3;
 * console.log(original.b.c); // 2
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof Object) {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object).
 * 
 * @param {*} value - Value to check
 * @returns {boolean} True if value is empty
 * 
 * @example
 * isEmpty(null);        // true
 * isEmpty('');          // true
 * isEmpty([]);          // true
 * isEmpty({});          // true
 * isEmpty('hello');     // false
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}
