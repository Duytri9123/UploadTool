/**
 * State Manager Module
 * Centralized state management with observer pattern
 * 
 * @module state-manager
 * @description Manages application state with observer pattern for reactive updates.
 * Persists critical state to localStorage for theme, config, auth, and UI preferences.
 * 
 * State Slices:
 * - queue: Array of video items in processing queue
 * - progress: Object mapping item IDs to progress percentages
 * - config: Application configuration settings
 * - auth: Authentication status for YouTube and TikTok
 * - theme: Current theme ('light' or 'dark')
 * - ui: UI state (sidebar collapsed, active tab)
 * 
 * @example
 * import { stateManager } from './state-manager.js';
 * 
 * // Subscribe to state changes
 * const unsubscribe = stateManager.subscribe('theme', (newTheme, oldTheme) => {
 *   console.log(`Theme changed from ${oldTheme} to ${newTheme}`);
 * });
 * 
 * // Update state
 * stateManager.setTheme('dark');
 * 
 * // Unsubscribe when done
 * unsubscribe();
 */

export class StateManager {
  constructor() {
    this.state = {
      queue: [],
      progress: {},
      config: {},
      auth: {
        youtube: false,
        tiktok: false,
      },
      theme: 'light',
      ui: {
        sidebarCollapsed: false,
        activeTab: 'process',
      },
    };
    
    this.observers = {};
    this.persistKeys = ['theme', 'config', 'auth', 'ui'];
    
    this._loadPersistedState();
  }

  /**
   * Load persisted state from localStorage
   * @private
   */
  _loadPersistedState() {
    this.persistKeys.forEach(key => {
      const stored = localStorage.getItem(`app-state-${key}`);
      if (stored) {
        try {
          this.state[key] = JSON.parse(stored);
        } catch (e) {
          console.warn(`Failed to parse stored state for ${key}:`, e);
        }
      }
    });
  }

  /**
   * Persist state slice to localStorage
   * @private
   * @param {string} key - State slice key
   */
  _persistState(key) {
    if (this.persistKeys.includes(key)) {
      try {
        localStorage.setItem(`app-state-${key}`, JSON.stringify(this.state[key]));
      } catch (e) {
        console.warn(`Failed to persist state for ${key}:`, e);
      }
    }
  }

  /**
   * Get state slice
   * @param {string} key - State slice key
   * @returns {*} State slice value
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Set state slice
   * @param {string} key - State slice key
   * @param {*} value - New value for state slice
   */
  set(key, value) {
    // Validate state before update
    if (!this._validateState(key, value)) {
      console.error(`State validation failed for ${key}:`, value);
      return;
    }

    const oldValue = this.state[key];
    
    // Deep clone to ensure immutability
    const clonedValue = this._deepClone(value);
    
    this.state[key] = clonedValue;
    this._persistState(key);
    this._logStateChange(key, oldValue, clonedValue);
    this._notify(key, clonedValue, oldValue);
  }

  /**
   * Update state slice (merge for objects)
   * @param {string} key - State slice key
   * @param {*} updates - Updates to merge into state slice
   */
  update(key, updates) {
    if (typeof this.state[key] === 'object' && !Array.isArray(this.state[key])) {
      // Deep clone both existing state and updates to ensure immutability
      const clonedState = this._deepClone(this.state[key]);
      const clonedUpdates = this._deepClone(updates);
      this.set(key, { ...clonedState, ...clonedUpdates });
    } else {
      this.set(key, updates);
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State slice key to observe
   * @param {Function} callback - Callback function (newValue, oldValue) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.observers[key]) {
      this.observers[key] = [];
    }
    this.observers[key].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.observers[key] = this.observers[key].filter(cb => cb !== callback);
    };
  }

  /**
   * Notify observers of state changes
   * @private
   * @param {string} key - State slice key
   * @param {*} newValue - New value
   * @param {*} oldValue - Old value
   */
  _notify(key, newValue, oldValue) {
    if (this.observers[key]) {
      this.observers[key].forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (e) {
          console.error(`Error in state observer for ${key}:`, e);
        }
      });
    }
  }

  /**
   * Deep clone an object or array to ensure immutability
   * @private
   * @param {*} value - Value to clone
   * @returns {*} Cloned value
   */
  _deepClone(value) {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    if (value instanceof Date) {
      return new Date(value.getTime());
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this._deepClone(item));
    }
    
    const cloned = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        cloned[key] = this._deepClone(value[key]);
      }
    }
    return cloned;
  }

  /**
   * Log state changes in development mode
   * @private
   * @param {string} key - State slice key
   * @param {*} oldValue - Old value
   * @param {*} newValue - New value
   */
  _logStateChange(key, oldValue, newValue) {
    // Check if we're in development mode or debug is enabled
    const isDevelopment = typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';
    const isDebugMode = typeof localStorage !== 'undefined' && localStorage.getItem('debug') === 'true';
    
    if (isDevelopment || isDebugMode) {
      console.log(`[StateManager] ${key}:`, oldValue, '→', newValue);
    }
  }

  /**
   * Validate state before update
   * @private
   * @param {string} key - State slice key
   * @param {*} value - Value to validate
   * @returns {boolean} Whether validation passed
   */
  _validateState(key, value) {
    switch (key) {
      case 'queue':
        return this._validateQueue(value);
      case 'progress':
        return this._validateProgress(value);
      case 'config':
        return this._validateConfig(value);
      case 'auth':
        return this._validateAuth(value);
      case 'theme':
        return this._validateTheme(value);
      case 'ui':
        return this._validateUI(value);
      default:
        // Unknown keys are allowed
        return true;
    }
  }

  /**
   * Validate queue array structure
   * @private
   * @param {*} queue - Queue to validate
   * @returns {boolean} Whether validation passed
   */
  _validateQueue(queue) {
    if (!Array.isArray(queue)) {
      console.error('Queue must be an array');
      return false;
    }
    
    for (const item of queue) {
      if (typeof item !== 'object' || item === null) {
        console.error('Queue item must be an object:', item);
        return false;
      }
      
      if (!item.hasOwnProperty('id')) {
        console.error('Queue item must have an id property:', item);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate progress object
   * @private
   * @param {*} progress - Progress to validate
   * @returns {boolean} Whether validation passed
   */
  _validateProgress(progress) {
    if (typeof progress !== 'object' || progress === null || Array.isArray(progress)) {
      console.error('Progress must be an object');
      return false;
    }
    
    for (const key in progress) {
      const value = progress[key];
      if (typeof value !== 'number' || value < 0 || value > 100) {
        console.error(`Progress value must be a number between 0-100, got ${value} for key ${key}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate config object
   * @private
   * @param {*} config - Config to validate
   * @returns {boolean} Whether validation passed
   */
  _validateConfig(config) {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      console.error('Config must be an object');
      return false;
    }
    
    // Config can have any properties, just ensure it's an object
    return true;
  }

  /**
   * Validate auth object structure
   * @private
   * @param {*} auth - Auth to validate
   * @returns {boolean} Whether validation passed
   */
  _validateAuth(auth) {
    if (typeof auth !== 'object' || auth === null || Array.isArray(auth)) {
      console.error('Auth must be an object');
      return false;
    }
    
    // Check for required platform properties
    const validPlatforms = ['youtube', 'tiktok'];
    for (const platform of validPlatforms) {
      if (auth.hasOwnProperty(platform) && typeof auth[platform] !== 'boolean') {
        console.error(`Auth.${platform} must be a boolean, got ${typeof auth[platform]}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate theme value
   * @private
   * @param {*} theme - Theme to validate
   * @returns {boolean} Whether validation passed
   */
  _validateTheme(theme) {
    const validThemes = ['light', 'dark'];
    
    if (typeof theme !== 'string') {
      console.error('Theme must be a string');
      return false;
    }
    
    if (!validThemes.includes(theme)) {
      console.error(`Theme must be one of: ${validThemes.join(', ')}, got ${theme}`);
      return false;
    }
    
    return true;
  }

  /**
   * Validate UI object structure
   * @private
   * @param {*} ui - UI to validate
   * @returns {boolean} Whether validation passed
   */
  _validateUI(ui) {
    if (typeof ui !== 'object' || ui === null || Array.isArray(ui)) {
      console.error('UI must be an object');
      return false;
    }
    
    // Validate sidebarCollapsed if present
    if (ui.hasOwnProperty('sidebarCollapsed') && typeof ui.sidebarCollapsed !== 'boolean') {
      console.error(`UI.sidebarCollapsed must be a boolean, got ${typeof ui.sidebarCollapsed}`);
      return false;
    }
    
    // Validate activeTab if present
    if (ui.hasOwnProperty('activeTab') && typeof ui.activeTab !== 'string') {
      console.error(`UI.activeTab must be a string, got ${typeof ui.activeTab}`);
      return false;
    }
    
    return true;
  }

  // ============================================================================
  // Queue Methods
  // ============================================================================

  /**
   * Add item to queue
   * @param {Object} item - Queue item to add
   */
  addToQueue(item) {
    const queue = [...this.state.queue, item];
    this.set('queue', queue);
  }

  /**
   * Remove item from queue by ID
   * @param {string|number} id - Item ID to remove
   */
  removeFromQueue(id) {
    const queue = this.state.queue.filter(item => item.id !== id);
    this.set('queue', queue);
  }

  /**
   * Update queue item by ID
   * @param {string|number} id - Item ID to update
   * @param {Object} updates - Updates to apply to item
   */
  updateQueueItem(id, updates) {
    const queue = this.state.queue.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    this.set('queue', queue);
  }

  /**
   * Clear all items from queue
   */
  clearQueue() {
    this.set('queue', []);
  }

  // ============================================================================
  // Progress Methods
  // ============================================================================

  /**
   * Set progress for an item
   * @param {string|number} id - Item ID
   * @param {number} progress - Progress percentage (0-100)
   */
  setProgress(id, progress) {
    this.update('progress', { [id]: progress });
  }

  /**
   * Clear progress for an item
   * @param {string|number} id - Item ID
   */
  clearProgress(id) {
    const progress = { ...this.state.progress };
    delete progress[id];
    this.set('progress', progress);
  }

  // ============================================================================
  // Config Methods
  // ============================================================================

  /**
   * Get config value
   * @param {string} [key] - Config key (optional, returns all config if omitted)
   * @returns {*} Config value or entire config object
   */
  getConfig(key) {
    return key ? this.state.config[key] : this.state.config;
  }

  /**
   * Set config value
   * @param {string|Object} key - Config key or entire config object
   * @param {*} [value] - Config value (required if key is string)
   */
  setConfig(key, value) {
    if (typeof key === 'object') {
      this.set('config', key);
    } else {
      this.update('config', { [key]: value });
    }
  }

  // ============================================================================
  // Theme Methods
  // ============================================================================

  /**
   * Get current theme
   * @returns {string} Current theme ('light' or 'dark')
   */
  getTheme() {
    return this.state.theme;
  }

  /**
   * Set theme
   * @param {string} theme - Theme to set ('light' or 'dark')
   */
  setTheme(theme) {
    this.set('theme', theme);
  }

  // ============================================================================
  // Auth Methods
  // ============================================================================

  /**
   * Set authentication status for a platform
   * @param {string} platform - Platform name ('youtube' or 'tiktok')
   * @param {boolean} status - Authentication status
   */
  setAuth(platform, status) {
    this.update('auth', { [platform]: status });
  }

  /**
   * Check if authenticated for a platform
   * @param {string} platform - Platform name ('youtube' or 'tiktok')
   * @returns {boolean} Authentication status
   */
  isAuthenticated(platform) {
    return this.state.auth[platform];
  }

  // ============================================================================
  // UI Methods
  // ============================================================================

  /**
   * Set sidebar collapsed state
   * @param {boolean} collapsed - Whether sidebar is collapsed
   */
  setSidebarCollapsed(collapsed) {
    this.update('ui', { sidebarCollapsed: collapsed });
  }

  /**
   * Set active tab
   * @param {string} tab - Active tab name
   */
  setActiveTab(tab) {
    this.update('ui', { activeTab: tab });
  }
}

// Export singleton instance
export const stateManager = new StateManager();
export default stateManager;
