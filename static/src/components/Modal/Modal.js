/**
 * Modal Component
 * 
 * A reusable modal dialog component with backdrop, keyboard navigation, and focus trap.
 * Supports header, body, and footer sections with accessibility features.
 * 
 * @example
 * import { Modal } from './components/Modal/Modal.js';
 * 
 * const modal = new Modal({
 *   title: 'Confirm Action',
 *   body: 'Are you sure you want to proceed?',
 *   size: 'medium',
 *   onClose: () => console.log('Modal closed')
 * });
 * 
 * modal.open();
 */

export class Modal {
  /**
   * Create a Modal instance
   * @param {Object} options - Modal configuration
   * @param {string|HTMLElement} [options.title] - Modal title (header content)
   * @param {string|HTMLElement} [options.body] - Modal body content
   * @param {string|HTMLElement} [options.footer] - Modal footer content
   * @param {string} [options.size='medium'] - Modal size: small, medium, large, full
   * @param {boolean} [options.closeOnBackdrop=true] - Close modal when clicking backdrop
   * @param {boolean} [options.closeOnEscape=true] - Close modal when pressing Escape
   * @param {boolean} [options.showCloseButton=true] - Show close button in header
   * @param {string} [options.className] - Additional CSS classes
   * @param {Function} [options.onOpen] - Callback when modal opens
   * @param {Function} [options.onClose] - Callback when modal closes
   * @param {Function} [options.onBackdropClick] - Callback when backdrop is clicked
   */
  constructor(options = {}) {
    this.options = {
      title: null,
      body: null,
      footer: null,
      size: 'medium',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
      className: '',
      onOpen: null,
      onClose: null,
      onBackdropClick: null,
      ...options
    };

    this._element = null;
    this._backdrop = null;
    this._dialog = null;
    this._headerElement = null;
    this._bodyElement = null;
    this._footerElement = null;
    this._closeButton = null;
    this._isOpen = false;
    this._previousActiveElement = null;
    this._focusableElements = [];
    this._firstFocusableElement = null;
    this._lastFocusableElement = null;
    
    this._backdropClickHandler = this._handleBackdropClick.bind(this);
    this._escapeKeyHandler = this._handleEscapeKey.bind(this);
    this._focusTrapHandler = this._handleFocusTrap.bind(this);
    this._closeHandler = this._handleClose.bind(this);
    
    this._init();
  }

  /**
   * Initialize the modal element
   * @private
   */
  _init() {
    this._element = this._createElement();
  }

  /**
   * Create the modal DOM element
   * @private
   * @returns {HTMLElement}
   */
  _createElement() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    
    if (this.options.title) {
      modal.setAttribute('aria-labelledby', 'modal-title');
    }
    
    if (this.options.body) {
      modal.setAttribute('aria-describedby', 'modal-body');
    }
    
    // Create backdrop
    this._backdrop = document.createElement('div');
    this._backdrop.className = 'modal__backdrop';
    this._backdrop.setAttribute('aria-hidden', 'true');
    modal.appendChild(this._backdrop);
    
    // Create dialog
    this._dialog = document.createElement('div');
    const dialogClasses = ['modal__dialog'];
    dialogClasses.push(`modal__dialog--${this.options.size}`);
    
    if (this.options.className) {
      dialogClasses.push(this.options.className);
    }
    
    this._dialog.className = dialogClasses.join(' ');
    
    // Build dialog structure
    if (this.options.title || this.options.showCloseButton) {
      this._dialog.appendChild(this._createHeader());
    }
    
    if (this.options.body) {
      this._dialog.appendChild(this._createBody());
    }
    
    if (this.options.footer) {
      this._dialog.appendChild(this._createFooter());
    }
    
    modal.appendChild(this._dialog);
    
    return modal;
  }

  /**
   * Create modal header element
   * @private
   * @returns {HTMLElement}
   */
  _createHeader() {
    const header = document.createElement('div');
    header.className = 'modal__header';
    
    if (this.options.title) {
      const title = document.createElement('h2');
      title.id = 'modal-title';
      title.className = 'modal__title';
      
      if (typeof this.options.title === 'string') {
        title.textContent = this.options.title;
      } else {
        title.appendChild(this.options.title);
      }
      
      header.appendChild(title);
    }
    
    if (this.options.showCloseButton) {
      this._closeButton = document.createElement('button');
      this._closeButton.type = 'button';
      this._closeButton.className = 'modal__close';
      this._closeButton.setAttribute('aria-label', 'Close modal');
      this._closeButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      header.appendChild(this._closeButton);
    }
    
    this._headerElement = header;
    return header;
  }

  /**
   * Create modal body element
   * @private
   * @returns {HTMLElement}
   */
  _createBody() {
    const body = document.createElement('div');
    body.id = 'modal-body';
    body.className = 'modal__body';
    
    if (typeof this.options.body === 'string') {
      body.innerHTML = this.options.body;
    } else {
      body.appendChild(this.options.body);
    }
    
    this._bodyElement = body;
    return body;
  }

  /**
   * Create modal footer element
   * @private
   * @returns {HTMLElement}
   */
  _createFooter() {
    const footer = document.createElement('div');
    footer.className = 'modal__footer';
    
    if (typeof this.options.footer === 'string') {
      footer.innerHTML = this.options.footer;
    } else {
      footer.appendChild(this.options.footer);
    }
    
    this._footerElement = footer;
    return footer;
  }

  /**
   * Get all focusable elements within the modal
   * @private
   */
  _updateFocusableElements() {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    this._focusableElements = Array.from(
      this._dialog.querySelectorAll(focusableSelectors)
    );
    
    this._firstFocusableElement = this._focusableElements[0];
    this._lastFocusableElement = this._focusableElements[this._focusableElements.length - 1];
  }

  /**
   * Handle focus trap (keep focus within modal)
   * @private
   * @param {KeyboardEvent} event
   */
  _handleFocusTrap(event) {
    if (event.key !== 'Tab') {
      return;
    }
    
    if (this._focusableElements.length === 0) {
      event.preventDefault();
      return;
    }
    
    if (event.shiftKey) {
      // Shift + Tab: moving backwards
      if (document.activeElement === this._firstFocusableElement) {
        event.preventDefault();
        this._lastFocusableElement.focus();
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === this._lastFocusableElement) {
        event.preventDefault();
        this._firstFocusableElement.focus();
      }
    }
  }

  /**
   * Handle Escape key press
   * @private
   * @param {KeyboardEvent} event
   */
  _handleEscapeKey(event) {
    if (event.key === 'Escape' && this.options.closeOnEscape) {
      this.close();
    }
  }

  /**
   * Handle backdrop click
   * @private
   * @param {MouseEvent} event
   */
  _handleBackdropClick(event) {
    if (event.target === this._backdrop) {
      // Call onBackdropClick callback
      if (typeof this.options.onBackdropClick === 'function') {
        this.options.onBackdropClick();
      }
      
      if (this.options.closeOnBackdrop) {
        this.close();
      }
    }
  }

  /**
   * Handle close button click
   * @private
   */
  _handleClose() {
    this.close();
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this._backdrop.addEventListener('click', this._backdropClickHandler);
    document.addEventListener('keydown', this._escapeKeyHandler);
    document.addEventListener('keydown', this._focusTrapHandler);
    
    if (this._closeButton) {
      this._closeButton.addEventListener('click', this._closeHandler);
    }
  }

  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    this._backdrop.removeEventListener('click', this._backdropClickHandler);
    document.removeEventListener('keydown', this._escapeKeyHandler);
    document.removeEventListener('keydown', this._focusTrapHandler);
    
    if (this._closeButton) {
      this._closeButton.removeEventListener('click', this._closeHandler);
    }
  }

  /**
   * Prevent body scroll
   * @private
   */
  _preventBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = this._getScrollbarWidth() + 'px';
  }

  /**
   * Restore body scroll
   * @private
   */
  _restoreBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  /**
   * Get scrollbar width to prevent layout shift
   * @private
   * @returns {number}
   */
  _getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  }

  /**
   * Open the modal
   */
  open() {
    if (this._isOpen) {
      return;
    }
    
    // Append modal to body if not already
    if (!this._element.parentNode) {
      document.body.appendChild(this._element);
    }
    
    // Store currently focused element
    this._previousActiveElement = document.activeElement;
    
    // Prevent body scroll
    this._preventBodyScroll();
    
    // Show modal
    this._element.classList.add('modal--open');
    this._element.setAttribute('aria-hidden', 'false');
    
    // Update focusable elements
    this._updateFocusableElements();
    
    // Focus first focusable element or close button
    setTimeout(() => {
      if (this._firstFocusableElement) {
        this._firstFocusableElement.focus();
      } else if (this._closeButton) {
        this._closeButton.focus();
      }
    }, 100);
    
    // Attach event listeners
    this._attachEventListeners();
    
    this._isOpen = true;
    
    // Call onOpen callback
    if (typeof this.options.onOpen === 'function') {
      this.options.onOpen();
    }
  }

  /**
   * Close the modal
   */
  close() {
    if (!this._isOpen) {
      return;
    }
    
    // Hide modal
    this._element.classList.remove('modal--open');
    this._element.setAttribute('aria-hidden', 'true');
    
    // Restore body scroll
    this._restoreBodyScroll();
    
    // Remove event listeners
    this._removeEventListeners();
    
    // Restore focus to previously focused element
    if (this._previousActiveElement) {
      this._previousActiveElement.focus();
      this._previousActiveElement = null;
    }
    
    this._isOpen = false;
    
    // Call onClose callback
    if (typeof this.options.onClose === 'function') {
      this.options.onClose();
    }
  }

  /**
   * Toggle modal open/close
   */
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Update modal title
   * @param {string|HTMLElement} title - New title content
   */
  setTitle(title) {
    this.options.title = title;
    
    if (this._headerElement) {
      const titleElement = this._headerElement.querySelector('.modal__title');
      if (titleElement) {
        if (typeof title === 'string') {
          titleElement.textContent = title;
        } else {
          titleElement.innerHTML = '';
          titleElement.appendChild(title);
        }
      }
    }
  }

  /**
   * Update modal body
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
      
      // Update focusable elements if modal is open
      if (this._isOpen) {
        this._updateFocusableElements();
      }
    }
  }

  /**
   * Update modal footer
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
      
      // Update focusable elements if modal is open
      if (this._isOpen) {
        this._updateFocusableElements();
      }
    }
  }

  /**
   * Destroy the modal and clean up
   */
  destroy() {
    if (this._isOpen) {
      this.close();
    }
    
    if (this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    
    this._element = null;
    this._backdrop = null;
    this._dialog = null;
    this._headerElement = null;
    this._bodyElement = null;
    this._footerElement = null;
    this._closeButton = null;
    this._focusableElements = [];
    this._firstFocusableElement = null;
    this._lastFocusableElement = null;
    this.options = null;
  }

  /**
   * Get the modal DOM element
   * @returns {HTMLElement}
   */
  get element() {
    return this._element;
  }

  /**
   * Check if modal is open
   * @returns {boolean}
   */
  get isOpen() {
    return this._isOpen;
  }
}

export default Modal;
