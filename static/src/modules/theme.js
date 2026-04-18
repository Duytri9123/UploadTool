/**
 * Theme System Module
 * Handles dark/light mode switching and theme persistence
 */

const THEME_KEY = 'app-theme';
const THEME_ATTRIBUTE = 'data-theme';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.observers = [];
  }

  /**
   * Initialize theme system
   * Should be called on page load
   */
  init() {
    this.applyTheme(this.currentTheme);
    this.setupSystemThemeListener();
  }

  /**
   * Get theme from localStorage
   * @returns {string|null} Stored theme or null
   */
  getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
      return null;
    }
  }

  /**
   * Get system theme preference
   * @returns {string} 'dark' or 'light'
   */
  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEMES.DARK;
    }
    return THEMES.LIGHT;
  }

  /**
   * Apply theme to document
   * @param {string} theme - Theme name ('light' or 'dark')
   */
  applyTheme(theme) {
    const validTheme = theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
    
    if (validTheme === THEMES.DARK) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, THEMES.DARK);
    } else {
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    }
    
    this.currentTheme = validTheme;
    this.notifyObservers(validTheme);
  }

  /**
   * Toggle between light and dark theme
   * @returns {string} New theme
   */
  toggleTheme() {
    const newTheme = this.currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Set specific theme
   * @param {string} theme - Theme name ('light' or 'dark')
   */
  setTheme(theme) {
    this.applyTheme(theme);
    this.saveTheme(theme);
  }

  /**
   * Save theme to localStorage
   * @param {string} theme - Theme name
   */
  saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  }

  /**
   * Get current theme
   * @returns {string} Current theme ('light' or 'dark')
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Check if current theme is dark
   * @returns {boolean}
   */
  isDark() {
    return this.currentTheme === THEMES.DARK;
  }

  /**
   * Check if current theme is light
   * @returns {boolean}
   */
  isLight() {
    return this.currentTheme === THEMES.LIGHT;
  }

  /**
   * Listen to system theme changes
   */
  setupSystemThemeListener() {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only apply system theme if user hasn't set a preference
      if (!this.getStoredTheme()) {
        const systemTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
        this.applyTheme(systemTheme);
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      // Legacy browsers
      mediaQuery.addListener(handleChange);
    }
  }

  /**
   * Subscribe to theme changes
   * @param {Function} callback - Called when theme changes with new theme
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.observers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }

  /**
   * Notify all observers of theme change
   * @param {string} theme - New theme
   */
  notifyObservers(theme) {
    this.observers.forEach(callback => {
      try {
        callback(theme);
      } catch (e) {
        console.error('Error in theme observer:', e);
      }
    });
  }

  /**
   * Clear stored theme preference
   * Will revert to system preference
   */
  clearStoredTheme() {
    try {
      localStorage.removeItem(THEME_KEY);
      const systemTheme = this.getSystemTheme();
      this.applyTheme(systemTheme);
    } catch (e) {
      console.warn('Failed to clear theme from localStorage:', e);
    }
  }
}

// Create singleton instance
const themeManager = new ThemeManager();

// Export both the instance and the class
export { themeManager, ThemeManager, THEMES };
export default themeManager;
