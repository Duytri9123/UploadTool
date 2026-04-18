/**
 * LogBox Component
 * 
 * A reusable log display component with multiple log levels, filtering, and auto-scroll.
 * Supports timestamps, log filtering by level, export functionality, and accessibility.
 * 
 * @example
 * import { LogBox } from './components/LogBox/LogBox.js';
 * 
 * const logBox = new LogBox({
 *   maxEntries: 1000,
 *   autoScroll: true,
 *   density: 'comfortable',
 *   onLogAdded: (log) => console.log('Log added:', log)
 * });
 * 
 * logBox.addLog('info', 'Application started');
 * logBox.addLog('success', 'Video processed successfully');
 * logBox.addLog('warning', 'Low disk space');
 * logBox.addLog('error', 'Failed to connect to server');
 * 
 * document.body.appendChild(logBox.element);
 */

import { formatDate } from '../../modules/formatters.js';

export class LogBox {
  /**
   * Create a LogBox instance
   * @param {Object} options - LogBox configuration
   * @param {number} [options.maxEntries=1000] - Maximum number of log entries to keep
   * @param {boolean} [options.autoScroll=true] - Whether to auto-scroll to bottom on new logs
   * @param {string} [options.density='comfortable'] - Display density: compact, comfortable
   * @param {boolean} [options.showTimestamp=true] - Whether to show timestamps
   * @param {string} [options.timestampFormat='time'] - Timestamp format: time, datetime, relative
   * @param {Array<string>} [options.visibleLevels] - Initially visible log levels (null = all)
   * @param {string} [options.className] - Additional CSS classes
   * @param {Function} [options.onLogAdded] - Callback when log is added
   * @param {Function} [options.onCleared] - Callback when logs are cleared
   * @param {Function} [options.onFilterChanged] - Callback when filter changes
   */
  constructor(options = {}) {
    this.options = {
      maxEntries: 1000,
      autoScroll: true,
      density: 'comfortable',
      showTimestamp: true,
      timestampFormat: 'time',
      visibleLevels: null, // null means all levels visible
      className: '',
      onLogAdded: null,
      onCleared: null,
      onFilterChanged: null,
      ...options
    };

    this._element = null;
    this._containerElement = null;
    this._logs = [];
    this._mounted = false;
    this._visibleLevels = new Set(this.options.visibleLevels || ['info', 'success', 'warning', 'error']);
    
    this._init();
  }

  /**
   * Initialize the logbox element
   * @private
   */
  _init() {
    this._element = this._createElement();
  }

  /**
   * Create the logbox DOM element
   * @private
   * @returns {HTMLElement}
   */
  _createElement() {
    const logBox = document.createElement('div');
    
    // Build BEM class names
    const classes = ['log-box'];
    classes.push(`log-box--${this.options.density}`);
    
    if (this.options.className) {
      classes.push(this.options.className);
    }
    
    logBox.className = classes.join(' ');
    
    // Set ARIA attributes
    logBox.setAttribute('role', 'log');
    logBox.setAttribute('aria-live', 'polite');
    logBox.setAttribute('aria-atomic', 'false');
    logBox.setAttribute('aria-label', 'Application logs');
    
    // Create container for log entries
    this._containerElement = document.createElement('div');
    this._containerElement.className = 'log-box__container';
    
    logBox.appendChild(this._containerElement);
    
    return logBox;
  }

  /**
   * Add a log entry
   * @param {string} level - Log level: info, success, warning, error
   * @param {string} message - Log message
   * @param {Object} [options={}] - Additional options
   * @param {Date} [options.timestamp] - Custom timestamp (defaults to now)
   * @param {Object} [options.data] - Additional data to attach to log
   * @returns {Object} The created log entry
   */
  addLog(level, message, options = {}) {
    if (!['info', 'success', 'warning', 'error'].includes(level)) {
      console.warn(`Invalid log level: ${level}. Using 'info' instead.`);
      level = 'info';
    }

    const timestamp = options.timestamp || new Date();
    
    const logEntry = {
      id: this._generateId(),
      level,
      message,
      timestamp,
      data: options.data || null
    };

    // Add to logs array
    this._logs.push(logEntry);

    // Enforce max entries limit
    if (this._logs.length > this.options.maxEntries) {
      const removed = this._logs.shift();
      const removedElement = this._containerElement.querySelector(`[data-log-id="${removed.id}"]`);
      if (removedElement) {
        removedElement.remove();
      }
    }

    // Create and append log element if level is visible
    if (this._visibleLevels.has(level)) {
      const logElement = this._createLogElement(logEntry);
      this._containerElement.appendChild(logElement);
    }

    // Auto-scroll to bottom
    if (this.options.autoScroll) {
      this.scrollToBottom();
    }

    // Call onLogAdded callback
    if (typeof this.options.onLogAdded === 'function') {
      this.options.onLogAdded(logEntry);
    }

    return logEntry;
  }

  /**
   * Create a log entry DOM element
   * @private
   * @param {Object} logEntry - Log entry object
   * @returns {HTMLElement}
   */
  _createLogElement(logEntry) {
    const entry = document.createElement('div');
    entry.className = `log-box__entry log-box__entry--${logEntry.level}`;
    entry.setAttribute('data-log-id', logEntry.id);
    entry.setAttribute('data-log-level', logEntry.level);

    // Create level icon
    const icon = document.createElement('span');
    icon.className = 'log-box__level-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = this._getLevelIcon(logEntry.level);
    entry.appendChild(icon);

    // Create timestamp
    if (this.options.showTimestamp) {
      const timestamp = document.createElement('span');
      timestamp.className = 'log-box__timestamp';
      timestamp.textContent = this._formatTimestamp(logEntry.timestamp);
      entry.appendChild(timestamp);
    }

    // Create message
    const message = document.createElement('span');
    message.className = 'log-box__message';
    message.textContent = logEntry.message;
    entry.appendChild(message);

    return entry;
  }

  /**
   * Get icon SVG for log level
   * @private
   * @param {string} level - Log level
   * @returns {string} SVG icon HTML
   */
  _getLevelIcon(level) {
    const icons = {
      info: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 7V11M8 5V5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
      success: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      warning: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 2L14.5 13H1.5L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M8 6V9M8 11V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
      error: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10 6L6 10M6 6L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`
    };

    return icons[level] || icons.info;
  }

  /**
   * Format timestamp based on options
   * @private
   * @param {Date} timestamp - Timestamp to format
   * @returns {string} Formatted timestamp
   */
  _formatTimestamp(timestamp) {
    return formatDate(timestamp, { format: this.options.timestampFormat });
  }

  /**
   * Generate unique ID for log entry
   * @private
   * @returns {string} Unique ID
   */
  _generateId() {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this._logs = [];
    this._containerElement.innerHTML = '';

    // Call onCleared callback
    if (typeof this.options.onCleared === 'function') {
      this.options.onCleared();
    }
  }

  /**
   * Set filter to show/hide specific log levels
   * @param {Array<string>} levels - Array of log levels to show (empty = show all)
   */
  setFilter(levels) {
    if (!Array.isArray(levels)) {
      console.warn('setFilter expects an array of log levels');
      return;
    }

    // Update visible levels
    if (levels.length === 0) {
      this._visibleLevels = new Set(['info', 'success', 'warning', 'error']);
    } else {
      this._visibleLevels = new Set(levels);
    }

    // Re-render all logs
    this._renderLogs();

    // Call onFilterChanged callback
    if (typeof this.options.onFilterChanged === 'function') {
      this.options.onFilterChanged(Array.from(this._visibleLevels));
    }
  }

  /**
   * Toggle visibility of a specific log level
   * @param {string} level - Log level to toggle
   */
  toggleLevel(level) {
    if (this._visibleLevels.has(level)) {
      this._visibleLevels.delete(level);
    } else {
      this._visibleLevels.add(level);
    }

    this._renderLogs();

    // Call onFilterChanged callback
    if (typeof this.options.onFilterChanged === 'function') {
      this.options.onFilterChanged(Array.from(this._visibleLevels));
    }
  }

  /**
   * Re-render all logs based on current filter
   * @private
   */
  _renderLogs() {
    this._containerElement.innerHTML = '';

    this._logs.forEach(logEntry => {
      if (this._visibleLevels.has(logEntry.level)) {
        const logElement = this._createLogElement(logEntry);
        this._containerElement.appendChild(logElement);
      }
    });

    if (this.options.autoScroll) {
      this.scrollToBottom();
    }
  }

  /**
   * Scroll to bottom of log container
   */
  scrollToBottom() {
    if (this._containerElement) {
      this._containerElement.scrollTop = this._containerElement.scrollHeight;
    }
  }

  /**
   * Scroll to top of log container
   */
  scrollToTop() {
    if (this._containerElement) {
      this._containerElement.scrollTop = 0;
    }
  }

  /**
   * Set auto-scroll behavior
   * @param {boolean} enabled - Whether to enable auto-scroll
   */
  setAutoScroll(enabled) {
    this.options.autoScroll = enabled;
  }

  /**
   * Set display density
   * @param {string} density - Density: compact, comfortable
   */
  setDensity(density) {
    if (!['compact', 'comfortable'].includes(density)) {
      console.warn(`Invalid density: ${density}. Using 'comfortable' instead.`);
      density = 'comfortable';
    }

    this._element.classList.remove(`log-box--${this.options.density}`);
    this.options.density = density;
    this._element.classList.add(`log-box--${density}`);
  }

  /**
   * Export logs as text
   * @param {Object} [options={}] - Export options
   * @param {Array<string>} [options.levels] - Log levels to export (null = all)
   * @param {boolean} [options.includeTimestamp=true] - Include timestamps
   * @returns {string} Logs as text
   */
  exportAsText(options = {}) {
    const levels = options.levels || null;
    const includeTimestamp = options.includeTimestamp !== false;

    const filteredLogs = levels
      ? this._logs.filter(log => levels.includes(log.level))
      : this._logs;

    return filteredLogs.map(log => {
      const parts = [];
      
      if (includeTimestamp) {
        parts.push(`[${this._formatTimestamp(log.timestamp)}]`);
      }
      
      parts.push(`[${log.level.toUpperCase()}]`);
      parts.push(log.message);
      
      return parts.join(' ');
    }).join('\n');
  }

  /**
   * Export logs as JSON
   * @param {Object} [options={}] - Export options
   * @param {Array<string>} [options.levels] - Log levels to export (null = all)
   * @returns {string} Logs as JSON string
   */
  exportAsJSON(options = {}) {
    const levels = options.levels || null;

    const filteredLogs = levels
      ? this._logs.filter(log => levels.includes(log.level))
      : this._logs;

    return JSON.stringify(filteredLogs, null, 2);
  }

  /**
   * Copy logs to clipboard
   * @param {Object} [options={}] - Export options
   * @returns {Promise<void>}
   */
  async copyToClipboard(options = {}) {
    const text = this.exportAsText(options);
    
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy logs to clipboard:', error);
      return false;
    }
  }

  /**
   * Download logs as file
   * @param {string} filename - Filename for download
   * @param {Object} [options={}] - Export options
   * @param {string} [options.format='text'] - Format: text, json
   */
  downloadLogs(filename, options = {}) {
    const format = options.format || 'text';
    const content = format === 'json' 
      ? this.exportAsJSON(options)
      : this.exportAsText(options);

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get all logs
   * @param {Object} [options={}] - Filter options
   * @param {Array<string>} [options.levels] - Log levels to get (null = all)
   * @returns {Array<Object>} Array of log entries
   */
  getLogs(options = {}) {
    const levels = options.levels || null;

    if (levels) {
      return this._logs.filter(log => levels.includes(log.level));
    }

    return [...this._logs];
  }

  /**
   * Get log count
   * @param {string} [level] - Specific level to count (null = all)
   * @returns {number} Number of logs
   */
  getLogCount(level = null) {
    if (level) {
      return this._logs.filter(log => log.level === level).length;
    }
    return this._logs.length;
  }

  /**
   * Mount the logbox to a parent element
   * @param {HTMLElement} parent - Parent element
   */
  mount(parent) {
    if (this._mounted) {
      console.warn('LogBox is already mounted');
      return;
    }

    parent.appendChild(this._element);
    this._mounted = true;
  }

  /**
   * Unmount the logbox from its parent
   */
  unmount() {
    if (!this._mounted) {
      console.warn('LogBox is not mounted');
      return;
    }

    if (this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }

    this._mounted = false;
  }

  /**
   * Destroy the logbox and clean up
   */
  destroy() {
    this.unmount();
    this._logs = [];
    this._element = null;
    this._containerElement = null;
    this.options = null;
  }

  /**
   * Get the logbox DOM element
   * @returns {HTMLElement}
   */
  get element() {
    return this._element;
  }

  /**
   * Check if logbox is mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._mounted;
  }

  /**
   * Get current visible levels
   * @returns {Array<string>}
   */
  get visibleLevels() {
    return Array.from(this._visibleLevels);
  }

  /**
   * Get auto-scroll state
   * @returns {boolean}
   */
  get autoScroll() {
    return this.options.autoScroll;
  }
}

export default LogBox;
