/**
 * Button Component Tests
 * 
 * Tests for Button component functionality, accessibility, and interactions
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Button } from './Button.js';

describe('Button Component', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  describe('Initialization', () => {
    test('should create button with default options', () => {
      const button = new Button({ text: 'Click me' });
      
      expect(button.element).toBeInstanceOf(HTMLButtonElement);
      expect(button.element.textContent).toContain('Click me');
      expect(button.element.classList.contains('button')).toBe(true);
      expect(button.element.classList.contains('button--primary')).toBe(true);
      expect(button.element.classList.contains('button--medium')).toBe(true);
    });

    test('should create button with custom variant', () => {
      const button = new Button({ text: 'Delete', variant: 'danger' });
      
      expect(button.element.classList.contains('button--danger')).toBe(true);
    });

    test('should create button with custom size', () => {
      const button = new Button({ text: 'Small', size: 'small' });
      
      expect(button.element.classList.contains('button--small')).toBe(true);
    });

    test('should create disabled button', () => {
      const button = new Button({ text: 'Disabled', disabled: true });
      
      expect(button.element.disabled).toBe(true);
      expect(button.element.getAttribute('aria-disabled')).toBe('true');
    });

    test('should create loading button', () => {
      const button = new Button({ text: 'Loading', loading: true });
      
      expect(button.element.disabled).toBe(true);
      expect(button.element.classList.contains('button--loading')).toBe(true);
      expect(button.element.getAttribute('aria-busy')).toBe('true');
      expect(button.element.querySelector('.button__spinner')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    test.each([
      ['primary'],
      ['secondary'],
      ['danger'],
      ['success'],
      ['ghost']
    ])('should create %s variant button', (variant) => {
      const button = new Button({ text: 'Test', variant });
      
      expect(button.element.classList.contains(`button--${variant}`)).toBe(true);
    });

    test('should change variant dynamically', () => {
      const button = new Button({ text: 'Test', variant: 'primary' });
      
      button.setVariant('danger');
      
      expect(button.element.classList.contains('button--primary')).toBe(false);
      expect(button.element.classList.contains('button--danger')).toBe(true);
    });
  });

  describe('Sizes', () => {
    test.each([
      ['small'],
      ['medium'],
      ['large']
    ])('should create %s size button', (size) => {
      const button = new Button({ text: 'Test', size });
      
      expect(button.element.classList.contains(`button--${size}`)).toBe(true);
    });

    test('should change size dynamically', () => {
      const button = new Button({ text: 'Test', size: 'medium' });
      
      button.setSize('large');
      
      expect(button.element.classList.contains('button--medium')).toBe(false);
      expect(button.element.classList.contains('button--large')).toBe(true);
    });
  });

  describe('Icon Support', () => {
    test('should create button with left icon', () => {
      const button = new Button({
        text: 'Save',
        icon: '<svg>icon</svg>',
        iconPosition: 'left'
      });
      
      const icon = button.element.querySelector('.button__icon--left');
      expect(icon).toBeTruthy();
      expect(icon.innerHTML).toContain('svg');
    });

    test('should create button with right icon', () => {
      const button = new Button({
        text: 'Next',
        icon: '<svg>icon</svg>',
        iconPosition: 'right'
      });
      
      const icon = button.element.querySelector('.button__icon--right');
      expect(icon).toBeTruthy();
    });

    test('should create icon-only button', () => {
      const button = new Button({
        icon: '<svg>icon</svg>',
        iconPosition: 'only',
        ariaLabel: 'Close'
      });
      
      expect(button.element.classList.contains('button--icon-only')).toBe(true);
      expect(button.element.querySelector('.button__text')).toBeFalsy();
      expect(button.element.getAttribute('aria-label')).toBe('Close');
    });
  });

  describe('States', () => {
    test('should set disabled state', () => {
      const button = new Button({ text: 'Test' });
      
      button.setDisabled(true);
      
      expect(button.element.disabled).toBe(true);
      expect(button.disabled).toBe(true);
      expect(button.element.getAttribute('aria-disabled')).toBe('true');
    });

    test('should set loading state', () => {
      const button = new Button({ text: 'Test' });
      
      button.setLoading(true);
      
      expect(button.element.disabled).toBe(true);
      expect(button.loading).toBe(true);
      expect(button.element.classList.contains('button--loading')).toBe(true);
      expect(button.element.getAttribute('aria-busy')).toBe('true');
      expect(button.element.querySelector('.button__spinner')).toBeTruthy();
    });

    test('should remove loading state', () => {
      const button = new Button({ text: 'Test', loading: true });
      
      button.setLoading(false);
      
      expect(button.element.disabled).toBe(false);
      expect(button.loading).toBe(false);
      expect(button.element.classList.contains('button--loading')).toBe(false);
      expect(button.element.hasAttribute('aria-busy')).toBe(false);
      expect(button.element.querySelector('.button__spinner')).toBeFalsy();
    });
  });

  describe('Text Updates', () => {
    test('should update button text', () => {
      const button = new Button({ text: 'Original' });
      
      button.setText('Updated');
      
      const textElement = button.element.querySelector('.button__text');
      expect(textElement.textContent).toBe('Updated');
    });
  });

  describe('Click Handling', () => {
    test('should call onClick handler when clicked', () => {
      const onClick = vi.fn();
      const button = new Button({ text: 'Click me', onClick });
      
      button.element.click();
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('should not call onClick when disabled', () => {
      const onClick = vi.fn();
      const button = new Button({ text: 'Click me', disabled: true, onClick });
      
      button.element.click();
      
      expect(onClick).not.toHaveBeenCalled();
    });

    test('should not call onClick when loading', () => {
      const onClick = vi.fn();
      const button = new Button({ text: 'Click me', loading: true, onClick });
      
      button.element.click();
      
      expect(onClick).not.toHaveBeenCalled();
    });

    test('should update onClick handler', () => {
      const onClick1 = vi.fn();
      const onClick2 = vi.fn();
      const button = new Button({ text: 'Click me', onClick: onClick1 });
      
      button.setOnClick(onClick2);
      button.element.click();
      
      expect(onClick1).not.toHaveBeenCalled();
      expect(onClick2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Navigation', () => {
    test('should trigger click on Enter key', () => {
      const onClick = vi.fn();
      const button = new Button({ text: 'Press Enter', onClick });
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      button.element.dispatchEvent(event);
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('should trigger click on Space key', () => {
      const onClick = vi.fn();
      const button = new Button({ text: 'Press Space', onClick });
      
      const event = new KeyboardEvent('keydown', { key: ' ' });
      button.element.dispatchEvent(event);
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('should not trigger click on other keys', () => {
      const onClick = vi.fn();
      const button = new Button({ text: 'Test', onClick });
      
      const event = new KeyboardEvent('keydown', { key: 'a' });
      button.element.dispatchEvent(event);
      
      expect(onClick).not.toHaveBeenCalled();
    });

    test('should not trigger click on Enter when disabled', () => {
      const onClick = vi.fn();
      const button = new Button({ text: 'Test', disabled: true, onClick });
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      button.element.dispatchEvent(event);
      
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Ripple Effect', () => {
    test('should create ripple on click', () => {
      const button = new Button({ text: 'Ripple' });
      container.appendChild(button.element);
      
      // Mock getBoundingClientRect
      button.element.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 100,
        height: 40
      }));
      
      const event = new MouseEvent('click', {
        clientX: 50,
        clientY: 20,
        bubbles: true
      });
      
      button.element.dispatchEvent(event);
      
      const ripple = button.element.querySelector('.button__ripple-circle');
      expect(ripple).toBeTruthy();
    });

    test('should remove ripple after animation', (done) => {
      const button = new Button({ text: 'Ripple' });
      container.appendChild(button.element);
      
      button.element.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 100,
        height: 40
      }));
      
      const event = new MouseEvent('click', {
        clientX: 50,
        clientY: 20,
        bubbles: true
      });
      
      button.element.dispatchEvent(event);
      
      setTimeout(() => {
        const ripple = button.element.querySelector('.button__ripple-circle');
        expect(ripple).toBeFalsy();
        done();
      }, 700);
    });
  });

  describe('Accessibility', () => {
    test('should have role="button"', () => {
      const button = new Button({ text: 'Test' });
      
      expect(button.element.getAttribute('role')).toBe('button');
    });

    test('should have aria-label when provided', () => {
      const button = new Button({ text: 'Test', ariaLabel: 'Custom label' });
      
      expect(button.element.getAttribute('aria-label')).toBe('Custom label');
    });

    test('should have aria-disabled when disabled', () => {
      const button = new Button({ text: 'Test', disabled: true });
      
      expect(button.element.getAttribute('aria-disabled')).toBe('true');
    });

    test('should have aria-busy when loading', () => {
      const button = new Button({ text: 'Test', loading: true });
      
      expect(button.element.getAttribute('aria-busy')).toBe('true');
    });

    test('should be focusable', () => {
      const button = new Button({ text: 'Test' });
      container.appendChild(button.element);
      
      button.focus();
      
      expect(document.activeElement).toBe(button.element);
    });

    test('should support blur', () => {
      const button = new Button({ text: 'Test' });
      container.appendChild(button.element);
      
      button.focus();
      button.blur();
      
      expect(document.activeElement).not.toBe(button.element);
    });
  });

  describe('Mounting and Unmounting', () => {
    test('should mount to parent element', () => {
      const button = new Button({ text: 'Test' });
      
      button.mount(container);
      
      expect(button.mounted).toBe(true);
      expect(container.contains(button.element)).toBe(true);
    });

    test('should not mount twice', () => {
      const button = new Button({ text: 'Test' });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      button.mount(container);
      button.mount(container);
      
      expect(consoleSpy).toHaveBeenCalledWith('Button is already mounted');
      consoleSpy.mockRestore();
    });

    test('should unmount from parent', () => {
      const button = new Button({ text: 'Test' });
      button.mount(container);
      
      button.unmount();
      
      expect(button.mounted).toBe(false);
      expect(container.contains(button.element)).toBe(false);
    });

    test('should not unmount when not mounted', () => {
      const button = new Button({ text: 'Test' });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      button.unmount();
      
      expect(consoleSpy).toHaveBeenCalledWith('Button is not mounted');
      consoleSpy.mockRestore();
    });

    test('should destroy button', () => {
      const button = new Button({ text: 'Test' });
      button.mount(container);
      
      button.destroy();
      
      expect(button.element).toBeNull();
      expect(button.options).toBeNull();
    });
  });

  describe('Button Types', () => {
    test('should create button with type="button" by default', () => {
      const button = new Button({ text: 'Test' });
      
      expect(button.element.type).toBe('button');
    });

    test('should create button with type="submit"', () => {
      const button = new Button({ text: 'Submit', type: 'submit' });
      
      expect(button.element.type).toBe('submit');
    });

    test('should create button with type="reset"', () => {
      const button = new Button({ text: 'Reset', type: 'reset' });
      
      expect(button.element.type).toBe('reset');
    });
  });

  describe('Custom Classes', () => {
    test('should add custom className', () => {
      const button = new Button({ text: 'Test', className: 'custom-class' });
      
      expect(button.element.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('Getters', () => {
    test('should return element via getter', () => {
      const button = new Button({ text: 'Test' });
      
      expect(button.element).toBeInstanceOf(HTMLButtonElement);
    });

    test('should return mounted state via getter', () => {
      const button = new Button({ text: 'Test' });
      
      expect(button.mounted).toBe(false);
      
      button.mount(container);
      
      expect(button.mounted).toBe(true);
    });

    test('should return disabled state via getter', () => {
      const button = new Button({ text: 'Test', disabled: true });
      
      expect(button.disabled).toBe(true);
    });

    test('should return loading state via getter', () => {
      const button = new Button({ text: 'Test', loading: true });
      
      expect(button.loading).toBe(true);
    });
  });
});
