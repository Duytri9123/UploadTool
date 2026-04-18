/**
 * Topbar Component
 *
 * A responsive topbar component with page title, theme toggle, and hamburger menu.
 * Integrates with ThemeManager for automatic theme detection and persistence.
 * Supports keyboard navigation and WCAG AA accessibility.
 *
 * @example
 * import { Topbar } from './components/Topbar/Topbar.js';
 * import themeManager from '../../modules/theme-manager.js';
 *
 * const topbar = new Topbar({
 *   title: 'Dashboard',
 *   showThemeToggle: true,
 *   showHamburger: true,
 *   onHamburgerClick: () => sidebar.toggle()
 * });
 *
 * document.body.appendChild(topbar.element);
 * topbar.connectThemeManager(themeManager);
 */

import themeManager from '../../modules/theme-manager.js';

export class Topbar {
  /**
   * Create a Topbar instance
   * @param {Object} options - Topbar configuration
   * @param {string} [options.title=''] - Page title to display
   * @param {boolean} [options.showThemeToggle=true] - Whether to show theme toggle button
   * @param {boolean} [options.showHamburger=true] - Whether to show hamburger menu button
   * @param {string} [options.currentTheme='light'] - Current theme: light, dark
   * @param {Function} [options.onThemeToggle] - Theme toggle handler
   * @param {Function} [options.onHamburgerClick] - Hamburger click handler
   * @param {string} [options.className] - Additional CSS classes
   */
  constructor(options = {}) {
    this.options = {
      title: '',
      showThemeToggle: true,
      showHamburger: true,
      currentTheme: 'light',
      onThemeToggle: null,
      onHamburgerClick: null,
      className: '',
      ...options
    };

    this._element = null;
    this._titleElement = null;
    this._themeToggleButton = null;
    this._hamburgerButton = null;
    this._mounted = false;
    this._currentTheme = this.options.currentTheme;
    this._themeUnsubscribe = null;

    // Bind event handlers
    this._themeToggleHandler = this._handleThemeToggle.bind(this);
    this._hamburgerClickHandler = this._handleHamburgerClick.bind(this);
    this._keydownHandler = this._handleKeydown.bind(this);

    this._init();
  }

  /**
   * Initialize the topbar element and connect to the global theme manager
   * @private
   */
  _init() {
    // Sync initial theme from the global theme manager
    this._currentTheme = themeManager.getTheme();
    this.options.currentTheme = this._currentTheme;

    this._element = this._createElement();
    this._attachEventListeners();

    // Subscribe to theme manager so the button icon stays in sync
    this._themeUnsubscribe = themeManager.subscribe((theme) => {
      this.setTheme(theme);
    });
  }

  /**
   * Create the topbar DOM element
   * @private
   * @returns {HTMLElement}
   */
  _createElement() {
    const header = document.createElement('header');
    
    // Build BEM class names
    const classes = ['topbar'];
    
    if (this.options.className) {
      classes.push(this.options.className);
    }
    
    header.className = classes.join(' ');
    
    // Set ARIA attributes
    header.setAttribute('role', 'banner');
    
    // Build topbar content
    header.innerHTML = this._buildContent();
    
    // Store references to key elements
    this._titleElement = header.querySelector('.topbar__title');
    this._themeToggleButton = header.querySelector('.topbar__theme-toggle');
    this._hamburgerButton = header.querySelector('.topbar__hamburger');
    
    return header;
  }

  /**
   * Build topbar inner HTML content
   * @private
   * @returns {string}
   */
  _buildContent() {
    const parts = [];
    
    parts.push('<div class="topbar__container">');
    
    // Left section: Hamburger + Title
    parts.push('<div class="topbar__left">');
    
    // Hamburger menu button (mobile)
    if (this.options.showHamburger) {
      parts.push(this._buildHamburgerButton());
    }
    
    // Page title
    parts.push(`<h1 class="topbar__title">${this.options.title}</h1>`);
    
    parts.push('</div>'); // Close topbar__left
    
    // Right section: Theme toggle
    parts.push('<div class="topbar__right">');
    
    if (this.options.showThemeToggle) {
      parts.push(this._buildThemeToggle());
    }
    
    parts.push('</div>'); // Close topbar__right
    
    parts.push('</div>'); // Close topbar__container
    
    return parts.join('');
  }

  /**
   * Build hamburger menu button
   * @private
   * @returns {string}
   */
  _buildHamburgerButton() {
    return `
      <button 
        class="topbar__hamburger" 
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded="false"
        aria-controls="sidebar"
      >
        <span class="topbar__hamburger-line"></span>
        <span class="topbar__hamburger-line"></span>
        <span class="topbar__hamburger-line"></span>
      </button>
    `;
  }

  /**
   * Build theme toggle button
   * @private
   * @returns {string}
   */
  _buildThemeToggle() {
    const isDark = this._currentTheme === 'dark';
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    
    // Sun icon (for light mode)
    const sunIcon = `
      <svg class="topbar__theme-icon topbar__theme-icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;
    
    // Moon icon (for dark mode)
    const moonIcon = `
      <svg class="topbar__theme-icon topbar__theme-icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
    
    return `
      <button 
        class="topbar__theme-toggle" 
        type="button"
        aria-label="${label}"
        data-theme="${this._currentTheme}"
      >
        ${sunIcon}
        ${moonIcon}
      </button>
    `;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    if (this._themeToggleButton) {
      this._themeToggleButton.addEventListener('click', this._themeToggleHandler);
      this._themeToggleButton.addEventListener('keydown', this._keydownHandler);
    }
    
    if (this._hamburgerButton) {
      this._hamburgerButton.addEventListener('click', this._hamburgerClickHandler);
      this._hamburgerButton.addEventListener('keydown', this._keydownHandler);
    }
  }

  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    if (this._themeToggleButton) {
      this._themeToggleButton.removeEventListener('click', this._themeToggleHandler);
      this._themeToggleButton.removeEventListener('keydown', this._keydownHandler);
    }
    
    if (this._hamburgerButton) {
      this._hamburgerButton.removeEventListener('click', this._hamburgerClickHandler);
      this._hamburgerButton.removeEventListener('keydown', this._keydownHandler);
    }
  }

  /**
   * Handle theme toggle button click — delegates to ThemeManager
   * @private
   * @param {MouseEvent} event
   */
  _handleThemeToggle(event) {
    event.preventDefault();

    // Let ThemeManager own the toggle; it will notify our subscriber
    const newTheme = themeManager.toggleTheme();

    // Call optional external handler
    if (typeof this.options.onThemeToggle === 'function') {
      this.options.onThemeToggle(newTheme, event);
    }
  }

  /**
   * Handle hamburger button click
   * @private
   * @param {MouseEvent} event
   */
  _handleHamburgerClick(event) {
    event.preventDefault();
    
    // Toggle aria-expanded
    const isExpanded = this._hamburgerButton.getAttribute('aria-expanded') === 'true';
    this._hamburgerButton.setAttribute('aria-expanded', !isExpanded);
    
    // Toggle active class
    this._hamburgerButton.classList.toggle('topbar__hamburger--active');
    
    // Call handler
    if (typeof this.options.onHamburgerClick === 'function') {
      this.options.onHamburgerClick(!isExpanded, event);
    }
  }

  /**
   * Handle keyboard events
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeydown(event) {
    // Handle Enter and Space keys
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.target.click();
    }
  }

  /**
   * Set page title
   * @param {string} title - New page title
   */
  setTitle(title) {
    this.options.title = title;
    if (this._titleElement) {
      this._titleElement.textContent = title;
    }
  }

  /**
   * Set theme
   * @param {string} theme - Theme name: light, dark
   */
  setTheme(theme) {
    this._currentTheme = theme;
    
    if (this._themeToggleButton) {
      this._themeToggleButton.setAttribute('data-theme', theme);
      
      const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      this._themeToggleButton.setAttribute('aria-label', label);
    }
  }

  /**
   * Get current theme
   * @returns {string} Current theme
   */
  getTheme() {
    return this._currentTheme;
  }

  /**
   * Set hamburger expanded state
   * @param {boolean} expanded - Whether hamburger menu is expanded
   */
  setHamburgerExpanded(expanded) {
    if (this._hamburgerButton) {
      this._hamburgerButton.setAttribute('aria-expanded', expanded);
      
      if (expanded) {
        this._hamburgerButton.classList.add('topbar__hamburger--active');
      } else {
        this._hamburgerButton.classList.remove('topbar__hamburger--active');
      }
    }
  }

  /**
   * Show theme toggle button
   */
  showThemeToggle() {
    this.options.showThemeToggle = true;
    if (this._themeToggleButton) {
      this._themeToggleButton.style.display = 'flex';
    }
  }

  /**
   * Hide theme toggle button
   */
  hideThemeToggle() {
    this.options.showThemeToggle = false;
    if (this._themeToggleButton) {
      this._themeToggleButton.style.display = 'none';
    }
  }

  /**
   * Show hamburger button
   */
  showHamburger() {
    this.options.showHamburger = true;
    if (this._hamburgerButton) {
      this._hamburgerButton.style.display = 'flex';
    }
  }

  /**
   * Hide hamburger button
   */
  hideHamburger() {
    this.options.showHamburger = false;
    if (this._hamburgerButton) {
      this._hamburgerButton.style.display = 'none';
    }
  }

  /**
   * Mount the topbar to a parent element
   * @param {HTMLElement} parent - Parent element
   */
  mount(parent) {
    if (this._mounted) {
      console.warn('Topbar is already mounted');
      return;
    }
    
    parent.appendChild(this._element);
    this._mounted = true;
  }

  /**
   * Unmount the topbar from its parent
   */
  unmount() {
    if (!this._mounted) {
      console.warn('Topbar is not mounted');
      return;
    }

    this._removeEventListeners();

    // Unsubscribe from theme manager
    if (this._themeUnsubscribe) {
      this._themeUnsubscribe();
      this._themeUnsubscribe = null;
    }

    if (this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }

    this._mounted = false;
  }

  /**
   * Destroy the topbar and clean up
   */
  destroy() {
    this.unmount();
    this._element = null;
    this._titleElement = null;
    this._themeToggleButton = null;
    this._hamburgerButton = null;
    this.options = null;
  }

  /**
   * Connect a custom ThemeManager instance (optional — auto-connects to global by default)
   * @param {ThemeManager} manager - ThemeManager instance
   */
  connectThemeManager(manager) {
    // Remove previous subscription
    if (this._themeUnsubscribe) {
      this._themeUnsubscribe();
    }

    // Sync current theme
    this.setTheme(manager.getTheme());

    // Subscribe to new manager
    this._themeUnsubscribe = manager.subscribe((theme) => {
      this.setTheme(theme);
    });
  }

  /**
   * Get the topbar DOM element
   * @returns {HTMLElement}
   */
  get element() {
    return this._element;
  }

  /**
   * Check if topbar is mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._mounted;
  }
}

export default Topbar;
