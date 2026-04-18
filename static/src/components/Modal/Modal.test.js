/**
 * Modal Component Tests
 * 
 * Basic tests to verify Modal component functionality
 */

import { Modal } from './Modal.js';

describe('Modal Component', () => {
  let modal;
  
  beforeEach(() => {
    // Clean up any existing modals
    document.body.innerHTML = '';
  });
  
  afterEach(() => {
    if (modal) {
      modal.destroy();
      modal = null;
    }
  });
  
  describe('Initialization', () => {
    test('should create modal with default options', () => {
      modal = new Modal();
      expect(modal).toBeDefined();
      expect(modal.element).toBeDefined();
      expect(modal.isOpen).toBe(false);
    });
    
    test('should create modal with custom title and body', () => {
      modal = new Modal({
        title: 'Test Modal',
        body: 'Test content'
      });
      
      const titleElement = modal.element.querySelector('.modal__title');
      const bodyElement = modal.element.querySelector('.modal__body');
      
      expect(titleElement.textContent).toBe('Test Modal');
      expect(bodyElement.textContent).toBe('Test content');
    });
    
    test('should apply correct size class', () => {
      modal = new Modal({ size: 'large' });
      const dialog = modal.element.querySelector('.modal__dialog');
      expect(dialog.classList.contains('modal__dialog--large')).toBe(true);
    });
    
    test('should show close button by default', () => {
      modal = new Modal({ title: 'Test' });
      const closeButton = modal.element.querySelector('.modal__close');
      expect(closeButton).toBeDefined();
    });
    
    test('should hide close button when showCloseButton is false', () => {
      modal = new Modal({ 
        title: 'Test',
        showCloseButton: false 
      });
      const closeButton = modal.element.querySelector('.modal__close');
      expect(closeButton).toBeNull();
    });
  });
  
  describe('Open/Close functionality', () => {
    test('should open modal', () => {
      modal = new Modal({ title: 'Test' });
      modal.open();
      
      expect(modal.isOpen).toBe(true);
      expect(modal.element.classList.contains('modal--open')).toBe(true);
      expect(modal.element.getAttribute('aria-hidden')).toBe('false');
    });
    
    test('should close modal', () => {
      modal = new Modal({ title: 'Test' });
      modal.open();
      modal.close();
      
      expect(modal.isOpen).toBe(false);
      expect(modal.element.classList.contains('modal--open')).toBe(false);
      expect(modal.element.getAttribute('aria-hidden')).toBe('true');
    });
    
    test('should toggle modal', () => {
      modal = new Modal({ title: 'Test' });
      
      modal.toggle();
      expect(modal.isOpen).toBe(true);
      
      modal.toggle();
      expect(modal.isOpen).toBe(false);
    });
    
    test('should call onOpen callback when opened', () => {
      const onOpen = jest.fn();
      modal = new Modal({ 
        title: 'Test',
        onOpen 
      });
      
      modal.open();
      expect(onOpen).toHaveBeenCalled();
    });
    
    test('should call onClose callback when closed', () => {
      const onClose = jest.fn();
      modal = new Modal({ 
        title: 'Test',
        onClose 
      });
      
      modal.open();
      modal.close();
      expect(onClose).toHaveBeenCalled();
    });
  });
  
  describe('Body scroll prevention', () => {
    test('should prevent body scroll when modal opens', () => {
      modal = new Modal({ title: 'Test' });
      modal.open();
      
      expect(document.body.style.overflow).toBe('hidden');
    });
    
    test('should restore body scroll when modal closes', () => {
      modal = new Modal({ title: 'Test' });
      modal.open();
      modal.close();
      
      expect(document.body.style.overflow).toBe('');
    });
  });
  
  describe('Keyboard navigation', () => {
    test('should close modal on Escape key when closeOnEscape is true', () => {
      modal = new Modal({ 
        title: 'Test',
        closeOnEscape: true 
      });
      modal.open();
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      expect(modal.isOpen).toBe(false);
    });
    
    test('should not close modal on Escape key when closeOnEscape is false', () => {
      modal = new Modal({ 
        title: 'Test',
        closeOnEscape: false 
      });
      modal.open();
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      expect(modal.isOpen).toBe(true);
    });
  });
  
  describe('Backdrop interaction', () => {
    test('should call onBackdropClick when backdrop is clicked', () => {
      const onBackdropClick = jest.fn();
      modal = new Modal({ 
        title: 'Test',
        onBackdropClick 
      });
      modal.open();
      
      const backdrop = modal.element.querySelector('.modal__backdrop');
      backdrop.click();
      
      expect(onBackdropClick).toHaveBeenCalled();
    });
    
    test('should close modal when backdrop is clicked and closeOnBackdrop is true', () => {
      modal = new Modal({ 
        title: 'Test',
        closeOnBackdrop: true 
      });
      modal.open();
      
      const backdrop = modal.element.querySelector('.modal__backdrop');
      backdrop.click();
      
      expect(modal.isOpen).toBe(false);
    });
    
    test('should not close modal when backdrop is clicked and closeOnBackdrop is false', () => {
      modal = new Modal({ 
        title: 'Test',
        closeOnBackdrop: false 
      });
      modal.open();
      
      const backdrop = modal.element.querySelector('.modal__backdrop');
      backdrop.click();
      
      expect(modal.isOpen).toBe(true);
    });
  });
  
  describe('Content updates', () => {
    test('should update title', () => {
      modal = new Modal({ title: 'Original Title' });
      modal.setTitle('New Title');
      
      const titleElement = modal.element.querySelector('.modal__title');
      expect(titleElement.textContent).toBe('New Title');
    });
    
    test('should update body', () => {
      modal = new Modal({ body: 'Original Body' });
      modal.setBody('New Body');
      
      const bodyElement = modal.element.querySelector('.modal__body');
      expect(bodyElement.textContent).toBe('New Body');
    });
    
    test('should update footer', () => {
      modal = new Modal({ footer: 'Original Footer' });
      modal.setFooter('New Footer');
      
      const footerElement = modal.element.querySelector('.modal__footer');
      expect(footerElement.textContent).toBe('New Footer');
    });
  });
  
  describe('Accessibility', () => {
    test('should have correct ARIA attributes', () => {
      modal = new Modal({ 
        title: 'Test Modal',
        body: 'Test content' 
      });
      
      expect(modal.element.getAttribute('role')).toBe('dialog');
      expect(modal.element.getAttribute('aria-modal')).toBe('true');
      expect(modal.element.getAttribute('aria-labelledby')).toBe('modal-title');
      expect(modal.element.getAttribute('aria-describedby')).toBe('modal-body');
    });
    
    test('should update aria-hidden when opening/closing', () => {
      modal = new Modal({ title: 'Test' });
      
      expect(modal.element.getAttribute('aria-hidden')).toBe('true');
      
      modal.open();
      expect(modal.element.getAttribute('aria-hidden')).toBe('false');
      
      modal.close();
      expect(modal.element.getAttribute('aria-hidden')).toBe('true');
    });
  });
  
  describe('Cleanup', () => {
    test('should clean up when destroyed', () => {
      modal = new Modal({ title: 'Test' });
      modal.open();
      
      const element = modal.element;
      document.body.appendChild(element);
      
      modal.destroy();
      
      expect(modal.element).toBeNull();
      expect(document.body.contains(element)).toBe(false);
    });
  });
});
