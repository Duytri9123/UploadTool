/**
 * Sidebar Component
 * 
 * A responsive sidebar navigation component with three states:
 * - Full width with labels (desktop)
 * - Collapsed with icons only (tablet)
 * - Hidden with hamburger menu (mobile)
 * 
 * Supports keyboard navigation, active state tracking, and WCAG AA accessibility.
 * 
 * @example
 * import { Sidebar } from './components/Sidebar/Sidebar.js';
 * 
 * const sidebar = new Sidebar({
 *   items: [
 *     { id: 'user', label: 'User', icon: '<svg>...</svg>', href: '/user' },
 *     { id: 'process', label: 'Process', icon: '<svg>...</svg>', href: '/process' }
 *   ],
 *   activeItem: 'user',
 *   onItemClick: (item) => console.log('Clicked:', item)
 * });
 * 
 * document.body.appendChild(sidebar.element);
 */

export class Sidebar {
  /**
   * Create a Sidebar instance
   * @param {Object} options - Sidebar configuration
   * @param {Array} options.items - Navigation items array
   * @param {string} options.items[].id - Item unique identifier
   * @param {string} options.items[].label - Item label text
   * @param {string} options.items[].icon - Item icon HTML
   * @param {string} options.items[].href - Item link href
   * @param {string} [options.activeItem] - Currently active item id
   * @param {boolean} [options.collapsed=false] - Whether sidebar starts collapsed
   * @param {boolean} [options.hidden=false] - Whether sidebar starts hidden (mobile)
   * @param {Function} [options.onItemClick] - Item click handler
   * @param {Function} [options.onToggle] - Toggle handler (collapsed/expanded)
   * @param {string} [options.className] - Additional CSS classes
   */
  constructor(options = {}) {
    this.options = {
      items: [],
      activeItem: null,
      collapsed: false,
      hidden: false,
      onItemClick: null,
      onToggle: null,
      className: '',
      ...options
    };

    this._element = null;
    this._navElement = null;
    this._mounted = false;
    this._activeItemId = this.options.activeItem;
    this._collapsed = this.options.collapsed;
    this._hidden = this.options.hidden;
    
    // Bind event handlers
    this._itemClickHandler = this._handleItemClick.bind(this);
    this._keydownHandler = this._handleKeydown.bind(this);
    this._resizeHandler = this._handleResize.bind(this);
    
    this._init();
  }

  /**
   * Initialize the sidebar element
   * @private
   */
  _init() {
    this._element = this._createElement();
    this._attachEventListeners();
    // Don't call _updateResponsiveState() here - it will be called on mount
  }

  /**
   * Create the sidebar DOM element
   * @private
   * @returns {HTMLElement}
   */
  _createElement() {
    const aside = document.createElement('aside');
    
    // Build BEM class names
    const classes = ['sidebar'];
    
    if (this._collapsed) {
      classes.push('sidebar--collapsed');
    }
    
    if (this._hidden) {
      classes.push('sidebar--hidden');
    }
    
    if (this.options.className) {
      classes.push(this.options.className);
    }
    
    aside.className = classes.join(' ');
    
    // Set ARIA attributes
    aside.setAttribute('role', 'navigation');
    aside.setAttribute('aria-label', 'Main navigation');
    
    // Build sidebar content
    aside.innerHTML = this._buildContent();
    
    // Store reference to nav element
    this._navElement = aside.querySelector('.sidebar__nav');
    
    return aside;
  }

  /**
   * Build sidebar inner HTML content
   * @private
   * @returns {string}
   */
  _buildContent() {
    const parts = [];
    
    // Sidebar header (optional logo/brand)
    parts.push('<div class="sidebar__header">');
    parts.push('<div class="sidebar__brand">');
    parts.push('<div class="sidebar__brand-logo" aria-hidden="true">TK</div>');
    parts.push('<span class="sidebar__brand-text">TikTok DL</span>');
    parts.push('</div>');
    parts.push('<button class="sidebar__close-btn" aria-label="Đóng menu" type="button">');
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>');
    parts.push('</button>');
    parts.push('</div>');
    
    // Navigation items
    parts.push('<nav class="sidebar__nav">');
    parts.push('<ul class="sidebar__list" role="list">');
    
    this.options.items.forEach(item => {
      parts.push(this._buildNavItem(item));
    });
    
    parts.push('</ul>');
    parts.push('</nav>');
    
    return parts.join('');
  }

  /**
   * Build a single navigation item
   * @private
   * @param {Object} item - Navigation item
   * @returns {string}
   */
  _buildNavItem(item) {
    const isActive = item.id === this._activeItemId;
    const itemClasses = ['sidebar__item'];
    
    if (isActive) {
      itemClasses.push('sidebar__item--active');
    }
    
    return `
      <li class="sidebar__list-item">
        <a 
          href="${item.href || '#'}" 
          class="${itemClasses.join(' ')}"
          data-item-id="${item.id}"
          role="menuitem"
          aria-current="${isActive ? 'page' : 'false'}"
          tabindex="0"
        >
          <span class="sidebar__item-icon" aria-hidden="true">
            ${item.icon || ''}
          </span>
          <span class="sidebar__item-label">
            ${item.label}
          </span>
        </a>
      </li>
    `;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    // Delegate click events to sidebar element
    this._element.addEventListener('click', this._itemClickHandler);
    
    // Keyboard navigation
    this._element.addEventListener('keydown', this._keydownHandler);
    
    // Responsive behavior
    window.addEventListener('resize', this._resizeHandler);

    // Mobile close button
    const closeBtn = this._element.querySelector('.sidebar__close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
  }

  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    this._element.removeEventListener('click', this._itemClickHandler);
    this._element.removeEventListener('keydown', this._keydownHandler);
    window.removeEventListener('resize', this._resizeHandler);
  }

  /**
   * Handle item click events
   * @private
   * @param {MouseEvent} event
   */
  _handleItemClick(event) {
    const itemElement = event.target.closest('.sidebar__item');
    
    if (!itemElement) return;
    
    const itemId = itemElement.getAttribute('data-item-id');
    const item = this.options.items.find(i => i.id === itemId);
    
    if (!item) return;
    
    // Prevent default if handler is provided
    if (typeof this.options.onItemClick === 'function') {
      event.preventDefault();
      this.options.onItemClick(item, event);
    }
    
    // Update active state
    this.setActiveItem(itemId);
  }

  /**
   * Handle keyboard navigation
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeydown(event) {
    const itemElement = event.target.closest('.sidebar__item');
    
    if (!itemElement) return;
    
    const items = Array.from(this._element.querySelectorAll('.sidebar__item'));
    const currentIndex = items.indexOf(itemElement);
    
    let nextIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].focus();
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        items[nextIndex].focus();
        break;
        
      case 'Home':
        event.preventDefault();
        items[0].focus();
        break;
        
      case 'End':
        event.preventDefault();
        items[items.length - 1].focus();
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        itemElement.click();
        break;
    }
  }

  /**
   * Handle window resize for responsive behavior
   * @private
   */
  _handleResize() {
    this._updateResponsiveState();
  }

  /**
   * Update sidebar state based on viewport width
   * @private
   */
  _updateResponsiveState() {
    const width = window.innerWidth;
    
    // Mobile: < 768px - hidden by default
    if (width < 768) {
      if (!this._hidden) {
        this.hide();
      }
    }
    // Tablet: 768px - 1024px - collapsed
    else if (width >= 768 && width < 1024) {
      if (this._hidden) {
        this.show();
      }
      if (!this._collapsed) {
        this.collapse();
      }
    }
    // Desktop: >= 1024px - full
    else {
      if (this._hidden) {
        this.show();
      }
      if (this._collapsed) {
        this.expand();
      }
    }
  }

  /**
   * Set active navigation item
   * @param {string} itemId - Item id to set as active
   */
  setActiveItem(itemId) {
    // Remove active class from all items
    const items = this._element.querySelectorAll('.sidebar__item');
    items.forEach(item => {
      item.classList.remove('sidebar__item--active');
      item.setAttribute('aria-current', 'false');
    });
    
    // Add active class to selected item
    const activeItem = this._element.querySelector(`[data-item-id="${itemId}"]`);
    if (activeItem) {
      activeItem.classList.add('sidebar__item--active');
      activeItem.setAttribute('aria-current', 'page');
    }
    
    this._activeItemId = itemId;
  }

  /**
   * Collapse sidebar (show icons only)
   */
  collapse() {
    this._collapsed = true;
    this._element.classList.add('sidebar--collapsed');
    this._element.setAttribute('aria-expanded', 'false');
    
    if (typeof this.options.onToggle === 'function') {
      this.options.onToggle({ collapsed: true, hidden: this._hidden });
    }
  }

  /**
   * Expand sidebar (show full width with labels)
   */
  expand() {
    this._collapsed = false;
    this._element.classList.remove('sidebar--collapsed');
    this._element.setAttribute('aria-expanded', 'true');
    
    if (typeof this.options.onToggle === 'function') {
      this.options.onToggle({ collapsed: false, hidden: this._hidden });
    }
  }

  /**
   * Toggle sidebar collapsed state
   */
  toggle() {
    if (this._collapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  /**
   * Hide sidebar (mobile)
   */
  hide() {
    this._hidden = true;
    this._element.classList.add('sidebar--hidden');
    this._element.setAttribute('aria-hidden', 'true');

    // Hide backdrop
    if (this._backdrop) {
      this._backdrop.classList.remove('sidebar__backdrop--visible');
    }
    
    if (typeof this.options.onToggle === 'function') {
      this.options.onToggle({ collapsed: this._collapsed, hidden: true });
    }
  }

  /**
   * Show sidebar (mobile)
   */
  show() {
    this._hidden = false;
    this._element.classList.remove('sidebar--hidden');
    this._element.setAttribute('aria-hidden', 'false');

    // Show backdrop on mobile
    if (this._backdrop && window.innerWidth < 768) {
      this._backdrop.classList.add('sidebar__backdrop--visible');
    }
    
    if (typeof this.options.onToggle === 'function') {
      this.options.onToggle({ collapsed: this._collapsed, hidden: false });
    }
  }

  /**
   * Toggle sidebar visibility (mobile)
   */
  toggleVisibility() {
    if (this._hidden) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Update navigation items
   * @param {Array} items - New navigation items
   */
  setItems(items) {
    this.options.items = items;
    
    // Rebuild nav content
    const navList = this._element.querySelector('.sidebar__list');
    if (navList) {
      navList.innerHTML = items.map(item => this._buildNavItem(item)).join('');
    }
  }

  /**
   * Get current active item id
   * @returns {string|null}
   */
  getActiveItem() {
    return this._activeItemId;
  }

  /**
   * Check if sidebar is collapsed
   * @returns {boolean}
   */
  isCollapsed() {
    return this._collapsed;
  }

  /**
   * Check if sidebar is hidden
   * @returns {boolean}
   */
  isHidden() {
    return this._hidden;
  }

  /**
   * Mount the sidebar to a parent element
   * @param {HTMLElement} parent - Parent element
   */
  mount(parent) {
    if (this._mounted) {
      console.warn('Sidebar is already mounted');
      return;
    }
    
    parent.appendChild(this._element);

    // Create backdrop for mobile overlay
    this._backdrop = document.createElement('div');
    this._backdrop.className = 'sidebar__backdrop';
    this._backdrop.setAttribute('aria-hidden', 'true');
    this._backdrop.addEventListener('click', () => this.hide());
    document.body.appendChild(this._backdrop);

    this._mounted = true;
    
    // Update responsive state after mounting
    this._updateResponsiveState();
  }

  /**
   * Unmount the sidebar from its parent
   */
  unmount() {
    if (!this._mounted) {
      console.warn('Sidebar is not mounted');
      return;
    }
    
    this._removeEventListeners();
    
    if (this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }

    if (this._backdrop && this._backdrop.parentNode) {
      this._backdrop.parentNode.removeChild(this._backdrop);
      this._backdrop = null;
    }
    
    this._mounted = false;
  }

  /**
   * Destroy the sidebar and clean up
   */
  destroy() {
    this.unmount();
    this._element = null;
    this._navElement = null;
    this.options = null;
  }

  /**
   * Get the sidebar DOM element
   * @returns {HTMLElement}
   */
  get element() {
    return this._element;
  }

  /**
   * Check if sidebar is mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._mounted;
  }
}

export default Sidebar;
