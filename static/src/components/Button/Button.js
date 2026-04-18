/**
 * Button Component
 * 
 * A reusable button component with multiple variants, sizes, and states.
 * Supports keyboard navigation, loading state, ripple effect, and WCAG AA accessibility.
 * 
 * @example
 * import { Button } from './components/Button/Button.js';
 * 
 * const button = new Button({
 *   text: 'Click me',
 *   variant: 'primary',
 *   size: 'medium',
 *   onClick: () => console.log('clicked')
 * });
 * 
 * document.body.appendChild(button.element);
 */

export class Button {
  /**
   * Create a Button instance
   * @param {Object} options - Button configuration
   * @param {string} options.text - Button text content
   * @param {string} [options.variant='primary'] - Button variant: primary, secondary, danger, success, ghost
   * @param {string} [options.size='medium'] - Button size: small, medium, large
   * @param {boolean} [options.disabled=false] - Whether button is disabled
   * @param {boolean} [options.loading=false] - Whether button is in loading state
   * @param {string} [options.icon] - Icon HTML or class name
   * @param {string} [options.iconPosition='left'] - Icon position: left, right, only
   * @param {string} [options.type='button'] - Button type: button, submit, reset
   * @param {string} [options.ariaLabel] - ARIA label for accessibility
   * @param {Function} [options.onClick] - Click handler function
   * @param {string} [options.className] - Additional CSS classes
   */
  constructor(options = {}) {
    this.options = {
      text: '',
      variant: 'primary',
      size: 'medium',
      disabled: false,
      loading: false,
      icon: null,
      iconPosition: 'left',
      type: 'button',
      ariaLabel: null,
      onClick: null,
      className: '',
      ...options
    };

    this._element = null;
    this._mounted = false;
    this._clickHandler = this._handleClick.bind(this);
    this._keyHandler = this._handleKeyPress.bind(this);
    
    this._init();
  }

  /**
   * Initialize the button element
   * @private
   */
  _init() {
    this._element = this._createElement();
    this._attachEventListeners();
  }

  /**
   * Create the button DOM element
   * @private
   * @returns {HTMLButtonElement}
   */
  _createElement() {
    const button = document.createElement('button');
    button.type = this.options.type;
    
    // Build BEM class names
    const classes = ['button'];
    classes.push(`button--${this.options.variant}`);
    classes.push(`button--${this.options.size}`);
    
    if (this.options.loading) {
      classes.push('button--loading');
    }
    
    if (this.options.iconPosition === 'only') {
      classes.push('button--icon-only');
    }
    
    if (this.options.className) {
      classes.push(this.options.className);
    }
    
    button.className = classes.join(' ');
    
    // Set disabled state
    if (this.options.disabled || this.options.loading) {
      button.disabled = true;
    }
    
    // Set ARIA attributes
    button.setAttribute('role', 'button');
    button.setAttribute('aria-disabled', this.options.disabled || this.options.loading);
    
    if (this.options.ariaLabel) {
      button.setAttribute('aria-label', this.options.ariaLabel);
    }
    
    if (this.options.loading) {
      button.setAttribute('aria-busy', 'true');
    }
    
    // Build button content
    button.innerHTML = this._buildContent();
    
    return button;
  }

  /**
   * Build button inner HTML content
   * @private
   * @returns {string}
   */
  _buildContent() {
    const parts = [];
    
    // Add loading spinner
    if (this.options.loading) {
      parts.push('<span class="button__spinner" aria-hidden="true"></span>');
    }
    
    // Add icon (left position or icon-only)
    if (this.options.icon && (this.options.iconPosition === 'left' || this.options.iconPosition === 'only')) {
      parts.push(`<span class="button__icon button__icon--left" aria-hidden="true">${this.options.icon}</span>`);
    }
    
    // Add text (unless icon-only)
    if (this.options.iconPosition !== 'only' && this.options.text) {
      parts.push(`<span class="button__text">${this.options.text}</span>`);
    }
    
    // Add icon (right position)
    if (this.options.icon && this.options.iconPosition === 'right') {
      parts.push(`<span class="button__icon button__icon--right" aria-hidden="true">${this.options.icon}</span>`);
    }
    
    // Add ripple container
    parts.push('<span class="button__ripple" aria-hidden="true"></span>');
    
    return parts.join('');
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this._element.addEventListener('click', this._clickHandler);
    this._element.addEventListener('keydown', this._keyHandler);
  }

  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    this._element.removeEventListener('click', this._clickHandler);
    this._element.removeEventListener('keydown', this._keyHandler);
  }

  /**
   * Handle click events
   * @private
   * @param {MouseEvent} event
   */
  _handleClick(event) {
    if (this.options.disabled || this.options.loading) {
      event.preventDefault();
      return;
    }
    
    // Create ripple effect
    this._createRipple(event);
    
    // Call onClick handler
    if (typeof this.options.onClick === 'function') {
      this.options.onClick(event);
    }
  }

  /**
   * Handle keyboard events (Enter and Space)
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeyPress(event) {
    if (this.options.disabled || this.options.loading) {
      event.preventDefault();
      return;
    }
    
    // Handle Enter and Space keys
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._element.click();
    }
  }

  /**
   * Create ripple effect on click
   * @private
   * @param {MouseEvent} event
   */
  _createRipple(event) {
    const rippleContainer = this._element.querySelector('.button__ripple');
    if (!rippleContainer) return;
    
    // Remove existing ripples
    const existingRipples = rippleContainer.querySelectorAll('.button__ripple-circle');
    existingRipples.forEach(ripple => ripple.remove());
    
    // Create new ripple
    const ripple = document.createElement('span');
    ripple.className = 'button__ripple-circle';
    
    // Calculate ripple position
    const rect = this._element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    rippleContainer.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * Update button text
   * @param {string} text - New button text
   */
  setText(text) {
    this.options.text = text;
    const textElement = this._element.querySelector('.button__text');
    if (textElement) {
      textElement.textContent = text;
    }
  }

  /**
   * Update button variant
   * @param {string} variant - New variant: primary, secondary, danger, success, ghost
   */
  setVariant(variant) {
    // Remove old variant class
    this._element.classList.remove(`button--${this.options.variant}`);
    
    // Add new variant class
    this.options.variant = variant;
    this._element.classList.add(`button--${variant}`);
  }

  /**
   * Update button size
   * @param {string} size - New size: small, medium, large
   */
  setSize(size) {
    // Remove old size class
    this._element.classList.remove(`button--${this.options.size}`);
    
    // Add new size class
    this.options.size = size;
    this._element.classList.add(`button--${size}`);
  }

  /**
   * Set disabled state
   * @param {boolean} disabled - Whether button should be disabled
   */
  setDisabled(disabled) {
    this.options.disabled = disabled;
    this._element.disabled = disabled || this.options.loading;
    this._element.setAttribute('aria-disabled', disabled || this.options.loading);
    
    if (disabled) {
      this._element.classList.add('button--disabled');
    } else {
      this._element.classList.remove('button--disabled');
    }
  }

  /**
   * Set loading state
   * @param {boolean} loading - Whether button should show loading state
   */
  setLoading(loading) {
    this.options.loading = loading;
    this._element.disabled = loading || this.options.disabled;
    this._element.setAttribute('aria-disabled', loading || this.options.disabled);
    
    if (loading) {
      this._element.classList.add('button--loading');
      this._element.setAttribute('aria-busy', 'true');
      
      // Add spinner if not exists
      if (!this._element.querySelector('.button__spinner')) {
        const spinner = document.createElement('span');
        spinner.className = 'button__spinner';
        spinner.setAttribute('aria-hidden', 'true');
        this._element.insertBefore(spinner, this._element.firstChild);
      }
    } else {
      this._element.classList.remove('button--loading');
      this._element.removeAttribute('aria-busy');
      
      // Remove spinner
      const spinner = this._element.querySelector('.button__spinner');
      if (spinner) {
        spinner.remove();
      }
    }
  }

  /**
   * Set click handler
   * @param {Function} handler - Click handler function
   */
  setOnClick(handler) {
    this.options.onClick = handler;
  }

  /**
   * Focus the button
   */
  focus() {
    this._element.focus();
  }

  /**
   * Blur the button
   */
  blur() {
    this._element.blur();
  }

  /**
   * Mount the button to a parent element
   * @param {HTMLElement} parent - Parent element
   */
  mount(parent) {
    if (this._mounted) {
      console.warn('Button is already mounted');
      return;
    }
    
    parent.appendChild(this._element);
    this._mounted = true;
  }

  /**
   * Unmount the button from its parent
   */
  unmount() {
    if (!this._mounted) {
      console.warn('Button is not mounted');
      return;
    }
    
    this._removeEventListeners();
    
    if (this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    
    this._mounted = false;
  }

  /**
   * Destroy the button and clean up
   */
  destroy() {
    this.unmount();
    this._element = null;
    this.options = null;
  }

  /**
   * Get the button DOM element
   * @returns {HTMLButtonElement}
   */
  get element() {
    return this._element;
  }

  /**
   * Check if button is mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._mounted;
  }

  /**
   * Check if button is disabled
   * @returns {boolean}
   */
  get disabled() {
    return this.options.disabled;
  }

  /**
   * Check if button is loading
   * @returns {boolean}
   */
  get loading() {
    return this.options.loading;
  }
}

export default Button;
