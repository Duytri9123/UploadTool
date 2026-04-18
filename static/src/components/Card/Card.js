/**
 * Card Component
 * 
 * A reusable card component with optional header, body, and footer sections.
 * Supports collapsible functionality with smooth animations and keyboard navigation.
 * 
 * @example
 * import { Card } from './components/Card/Card.js';
 * 
 * const card = new Card({
 *   header: 'Card Title',
 *   body: 'Card content goes here',
 *   footer: 'Card footer',
 *   collapsible: true,
 *   collapsed: false
 * });
 * 
 * document.body.appendChild(card.element);
 */

export class Card {
  /**
   * Create a Card instance
   * @param {Object} options - Card configuration
   * @param {string|HTMLElement} [options.header] - Card header content
   * @param {string|HTMLElement} [options.body] - Card body content
   * @param {string|HTMLElement} [options.footer] - Card footer content
   * @param {boolean} [options.collapsible=false] - Whether card can be collapsed
   * @param {boolean} [options.collapsed=false] - Initial collapsed state
   * @param {string} [options.variant='default'] - Card variant: default, bordered, elevated
   * @param {string} [options.className] - Additional CSS classes
   * @param {Function} [options.onToggle] - Callback when card is toggled
   * @param {Function} [options.onExpand] - Callback when card is expanded
   * @param {Function} [options.onCollapse] - Callback when card is collapsed
   */
  constructor(options = {}) {
    this.options = {
      header: null,
      body: null,
      footer: null,
      collapsible: false,
      collapsed: false,
      variant: 'default',
      className: '',
      onToggle: null,
      onExpand: null,
      onCollapse: null,
      ...options
    };

    this._element = null;
    this._headerElement = null;
    this._bodyElement = null;
    this._footerElement = null;
    this._toggleButton = null;
    this._mounted = false;
    this._collapsed = this.options.collapsed;
    
    this._toggleHandler = this._handleToggle.bind(this);
    this._keyHandler = this._handleKeyPress.bind(this);
    
    this._init();
  }

  /**
   * Initialize the card element
   * @private
   */
  _init() {
    this._element = this._createElement();
    if (this.options.collapsible) {
      this._attachEventListeners();
    }
  }

  /**
   * Create the card DOM element
   * @private
   * @returns {HTMLElement}
   */
  _createElement() {
    const card = document.createElement('div');
    
    // Build BEM class names
    const classes = ['card'];
    classes.push(`card--${this.options.variant}`);
    
    if (this.options.collapsible) {
      classes.push('card--collapsible');
    }
    
    if (this._collapsed) {
      classes.push('card--collapsed');
    }
    
    if (this.options.className) {
      classes.push(this.options.className);
    }
    
    card.className = classes.join(' ');
    
    // Set ARIA attributes
    card.setAttribute('role', 'article');
    
    // Build card structure
    if (this.options.header) {
      card.appendChild(this._createHeader());
    }
    
    if (this.options.body) {
      card.appendChild(this._createBody());
    }
    
    if (this.options.footer) {
      card.appendChild(this._createFooter());
    }
    
    return card;
  }

  /**
   * Create card header element
   * @private
   * @returns {HTMLElement}
   */
  _createHeader() {
    const header = document.createElement('div');
    header.className = 'card__header';
    
    if (this.options.collapsible) {
      // Create toggle button
      this._toggleButton = document.createElement('button');
      this._toggleButton.className = 'card__toggle';
      this._toggleButton.type = 'button';
      this._toggleButton.setAttribute('aria-expanded', !this._collapsed);
      this._toggleButton.setAttribute('aria-label', this._collapsed ? 'Expand card' : 'Collapse card');
      
      // Create header content wrapper
      const headerContent = document.createElement('div');
      headerContent.className = 'card__header-content';
      
      if (typeof this.options.header === 'string') {
        headerContent.innerHTML = this.options.header;
      } else {
        headerContent.appendChild(this.options.header);
      }
      
      // Create toggle icon
      const toggleIcon = document.createElement('span');
      toggleIcon.className = 'card__toggle-icon';
      toggleIcon.setAttribute('aria-hidden', 'true');
      toggleIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      
      this._toggleButton.appendChild(headerContent);
      this._toggleButton.appendChild(toggleIcon);
      header.appendChild(this._toggleButton);
    } else {
      if (typeof this.options.header === 'string') {
        header.innerHTML = this.options.header;
      } else {
        header.appendChild(this.options.header);
      }
    }
    
    this._headerElement = header;
    return header;
  }

  /**
   * Create card body element
   * @private
   * @returns {HTMLElement}
   */
  _createBody() {
    const body = document.createElement('div');
    body.className = 'card__body';
    
    if (this.options.collapsible) {
      body.setAttribute('aria-hidden', this._collapsed);
    }
    
    if (typeof this.options.body === 'string') {
      body.innerHTML = this.options.body;
    } else {
      body.appendChild(this.options.body);
    }
    
    this._bodyElement = body;
    return body;
  }

  /**
   * Create card footer element
   * @private
   * @returns {HTMLElement}
   */
  _createFooter() {
    const footer = document.createElement('div');
    footer.className = 'card__footer';
    
    if (this.options.collapsible) {
      footer.setAttribute('aria-hidden', this._collapsed);
    }
    
    if (typeof this.options.footer === 'string') {
      footer.innerHTML = this.options.footer;
    } else {
      footer.appendChild(this.options.footer);
    }
    
    this._footerElement = footer;
    return footer;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    if (this._toggleButton) {
      this._toggleButton.addEventListener('click', this._toggleHandler);
      this._toggleButton.addEventListener('keydown', this._keyHandler);
    }
  }

  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    if (this._toggleButton) {
      this._toggleButton.removeEventListener('click', this._toggleHandler);
      this._toggleButton.removeEventListener('keydown', this._keyHandler);
    }
  }

  /**
   * Handle toggle button click
   * @private
   * @param {MouseEvent} event
   */
  _handleToggle(event) {
    event.preventDefault();
    this.toggle();
  }

  /**
   * Handle keyboard events (Enter and Space)
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeyPress(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle();
    }
  }

  /**
   * Toggle card collapsed state
   */
  toggle() {
    if (this._collapsed) {
      this.expand();
    } else {
      this.collapse();
    }
    
    // Call onToggle callback
    if (typeof this.options.onToggle === 'function') {
      this.options.onToggle(this._collapsed);
    }
  }

  /**
   * Expand the card
   */
  expand() {
    if (!this.options.collapsible || !this._collapsed) {
      return;
    }
    
    this._collapsed = false;
    this._element.classList.remove('card--collapsed');
    
    // Update ARIA attributes
    if (this._toggleButton) {
      this._toggleButton.setAttribute('aria-expanded', 'true');
      this._toggleButton.setAttribute('aria-label', 'Collapse card');
    }
    
    if (this._bodyElement) {
      this._bodyElement.setAttribute('aria-hidden', 'false');
    }
    
    if (this._footerElement) {
      this._footerElement.setAttribute('aria-hidden', 'false');
    }
    
    // Call onExpand callback
    if (typeof this.options.onExpand === 'function') {
      this.options.onExpand();
    }
  }

  /**
   * Collapse the card
   */
  collapse() {
    if (!this.options.collapsible || this._collapsed) {
      return;
    }
    
    this._collapsed = true;
    this._element.classList.add('card--collapsed');
    
    // Update ARIA attributes
    if (this._toggleButton) {
      this._toggleButton.setAttribute('aria-expanded', 'false');
      this._toggleButton.setAttribute('aria-label', 'Expand card');
    }
    
    if (this._bodyElement) {
      this._bodyElement.setAttribute('aria-hidden', 'true');
    }
    
    if (this._footerElement) {
      this._footerElement.setAttribute('aria-hidden', 'true');
    }
    
    // Call onCollapse callback
    if (typeof this.options.onCollapse === 'function') {
      this.options.onCollapse();
    }
  }

  /**
   * Update card header
   * @param {string|HTMLElement} header - New header content
   */
  setHeader(header) {
    this.options.header = header;
    
    if (this._headerElement) {
      if (this.options.collapsible && this._toggleButton) {
        const headerContent = this._toggleButton.querySelector('.card__header-content');
        if (headerContent) {
          if (typeof header === 'string') {
            headerContent.innerHTML = header;
          } else {
            headerContent.innerHTML = '';
            headerContent.appendChild(header);
          }
        }
      } else {
        if (typeof header === 'string') {
          this._headerElement.innerHTML = header;
        } else {
          this._headerElement.innerHTML = '';
          this._headerElement.appendChild(header);
        }
      }
    }
  }

  /**
   * Update card body
   * @param {string|HTMLElement} body - New body content
   */
  setBody(body) {
    this.options.body = body;
    
    if (this._bodyElement) {
      if (typeof body === 'string') {
        this._bodyElement.innerHTML = body;
      } else {
        this._bodyElement.innerHTML = '';
        this._bodyElement.appendChild(body);
      }
    }
  }

  /**
   * Update card footer
   * @param {string|HTMLElement} footer - New footer content
   */
  setFooter(footer) {
    this.options.footer = footer;
    
    if (this._footerElement) {
      if (typeof footer === 'string') {
        this._footerElement.innerHTML = footer;
      } else {
        this._footerElement.innerHTML = '';
        this._footerElement.appendChild(footer);
      }
    }
  }

  /**
   * Mount the card to a parent element
   * @param {HTMLElement} parent - Parent element
   */
  mount(parent) {
    if (this._mounted) {
      console.warn('Card is already mounted');
      return;
    }
    
    parent.appendChild(this._element);
    this._mounted = true;
  }

  /**
   * Unmount the card from its parent
   */
  unmount() {
    if (!this._mounted) {
      console.warn('Card is not mounted');
      return;
    }
    
    this._removeEventListeners();
    
    if (this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    
    this._mounted = false;
  }

  /**
   * Destroy the card and clean up
   */
  destroy() {
    this.unmount();
    this._element = null;
    this._headerElement = null;
    this._bodyElement = null;
    this._footerElement = null;
    this._toggleButton = null;
    this.options = null;
  }

  /**
   * Get the card DOM element
   * @returns {HTMLElement}
   */
  get element() {
    return this._element;
  }

  /**
   * Check if card is mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._mounted;
  }

  /**
   * Check if card is collapsed
   * @returns {boolean}
   */
  get collapsed() {
    return this._collapsed;
  }

  /**
   * Check if card is collapsible
   * @returns {boolean}
   */
  get collapsible() {
    return this.options.collapsible;
  }
}

export default Card;
