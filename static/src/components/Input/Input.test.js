/**
 * Input Component Tests
 * 
 * Tests for the Input component covering:
 * - Component initialization
 * - Value management
 * - Validation (required, URL, email, number range, custom)
 * - State management (disabled, readonly, error, focus)
 * - Event handling (input, change, focus, blur)
 * - Debounced validation
 * - Accessibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Input } from './Input.js';

describe('Input Component', () => {
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
    it('should create input with default options', () => {
      const input = new Input();
      expect(input.element).toBeDefined();
      expect(input.element.classList.contains('input')).toBe(true);
    });
    
    it('should create input with custom options', () => {
      const input = new Input({
        type: 'email',
        label: 'Email Address',
        placeholder: 'Enter email',
        required: true
      });
      
      expect(input.element.querySelector('.input__label').textContent).toContain('Email Address');
      expect(input.inputElement.type).toBe('email');
      expect(input.inputElement.placeholder).toBe('Enter email');
      expect(input.inputElement.required).toBe(true);
    });
    
    it('should create textarea when type is textarea', () => {
      const input = new Input({ type: 'textarea', rows: 5 });
      expect(input.inputElement.tagName).toBe('TEXTAREA');
      expect(input.inputElement.rows).toBe(5);
    });
    
    it('should add custom className', () => {
      const input = new Input({ className: 'custom-input' });
      expect(input.element.classList.contains('custom-input')).toBe(true);
    });
  });
  
  describe('Value Management', () => {
    it('should get and set value', () => {
      const input = new Input();
      input.setValue('test value');
      expect(input.getValue()).toBe('test value');
    });
    
    it('should set initial value', () => {
      const input = new Input({ value: 'initial' });
      expect(input.getValue()).toBe('initial');
    });
    
    it('should handle empty value', () => {
      const input = new Input();
      expect(input.getValue()).toBe('');
    });
    
    it('should reset to initial value', () => {
      const input = new Input({ value: 'initial' });
      input.setValue('changed');
      input.reset();
      expect(input.getValue()).toBe('initial');
    });
  });
  
  describe('Required Validation', () => {
    it('should validate required field', () => {
      const input = new Input({ required: true, label: 'Username' });
      expect(input.validate()).toBe(false);
      expect(input.hasError).toBe(true);
    });
    
    it('should pass validation when required field has value', () => {
      const input = new Input({ required: true });
      input.setValue('value');
      expect(input.validate()).toBe(true);
      expect(input.hasError).toBe(false);
    });
    
    it('should not validate non-required empty field', () => {
      const input = new Input({ required: false });
      expect(input.validate()).toBe(true);
    });
  });
  
  describe('URL Validation', () => {
    it('should validate URL type', () => {
      const input = new Input({ type: 'url' });
      
      input.setValue('https://example.com');
      expect(input.validate()).toBe(true);
      
      input.setValue('not a url');
      expect(input.validate()).toBe(false);
      expect(input.hasError).toBe(true);
    });
    
    it('should allow empty URL when not required', () => {
      const input = new Input({ type: 'url', required: false });
      input.setValue('');
      expect(input.validate()).toBe(true);
    });
  });
  
  describe('Email Validation', () => {
    it('should validate email type', () => {
      const input = new Input({ type: 'email' });
      
      input.setValue('user@example.com');
      expect(input.validate()).toBe(true);
      
      input.setValue('invalid-email');
      expect(input.validate()).toBe(false);
      expect(input.hasError).toBe(true);
    });
  });
  
  describe('Number Range Validation', () => {
    it('should validate number within range', () => {
      const input = new Input({ type: 'number', min: 1, max: 10 });
      
      input.setValue('5');
      expect(input.validate()).toBe(true);
      
      input.setValue('15');
      expect(input.validate()).toBe(false);
      
      input.setValue('0');
      expect(input.validate()).toBe(false);
    });
    
    it('should validate minimum value only', () => {
      const input = new Input({ type: 'number', min: 0 });
      
      input.setValue('5');
      expect(input.validate()).toBe(true);
      
      input.setValue('-1');
      expect(input.validate()).toBe(false);
    });
    
    it('should validate maximum value only', () => {
      const input = new Input({ type: 'number', max: 100 });
      
      input.setValue('50');
      expect(input.validate()).toBe(true);
      
      input.setValue('150');
      expect(input.validate()).toBe(false);
    });
  });
  
  describe('Custom Validation', () => {
    it('should use custom validator function (boolean return)', () => {
      const input = new Input({
        validator: (value) => value.length >= 3,
        errorMessage: 'Must be at least 3 characters'
      });
      
      input.setValue('ab');
      expect(input.validate()).toBe(false);
      expect(input.hasError).toBe(true);
      
      input.setValue('abc');
      expect(input.validate()).toBe(true);
      expect(input.hasError).toBe(false);
    });
    
    it('should use custom validator function (ValidationResult return)', () => {
      const input = new Input({
        validator: (value) => {
          if (value.length < 3) {
            return { valid: false, error: 'Too short' };
          }
          return { valid: true };
        }
      });
      
      input.setValue('ab');
      expect(input.validate()).toBe(false);
      
      input.setValue('abc');
      expect(input.validate()).toBe(true);
    });
  });
  
  describe('Error Management', () => {
    it('should set error message', () => {
      const input = new Input();
      input.setError('Custom error');
      
      expect(input.hasError).toBe(true);
      expect(input.element.classList.contains('input--error')).toBe(true);
      expect(input.inputElement.getAttribute('aria-invalid')).toBe('true');
    });
    
    it('should clear error', () => {
      const input = new Input();
      input.setError('Error');
      input.clearError();
      
      expect(input.hasError).toBe(false);
      expect(input.element.classList.contains('input--error')).toBe(false);
      expect(input.inputElement.getAttribute('aria-invalid')).toBe('false');
    });
    
    it('should clear error on input', () => {
      const input = new Input({ required: true });
      input.mount(container);
      
      input.validate(); // Trigger error
      expect(input.hasError).toBe(true);
      
      input.inputElement.value = 'value';
      input.inputElement.dispatchEvent(new Event('input'));
      
      // Error should be cleared immediately on input
      expect(input.hasError).toBe(false);
    });
  });
  
  describe('State Management', () => {
    it('should set disabled state', () => {
      const input = new Input();
      input.setDisabled(true);
      
      expect(input.disabled).toBe(true);
      expect(input.inputElement.disabled).toBe(true);
      expect(input.element.classList.contains('input--disabled')).toBe(true);
    });
    
    it('should set readonly state', () => {
      const input = new Input();
      input.setReadonly(true);
      
      expect(input.readonly).toBe(true);
      expect(input.inputElement.readOnly).toBe(true);
      expect(input.element.classList.contains('input--readonly')).toBe(true);
    });
    
    it('should update placeholder', () => {
      const input = new Input();
      input.setPlaceholder('New placeholder');
      expect(input.inputElement.placeholder).toBe('New placeholder');
    });
    
    it('should update label', () => {
      const input = new Input({ label: 'Old Label' });
      input.setLabel('New Label');
      expect(input.element.querySelector('.input__label').textContent).toContain('New Label');
    });
    
    it('should update help text', () => {
      const input = new Input({ helpText: 'Old help' });
      input.setHelpText('New help');
      expect(input.element.querySelector('.input__help').textContent).toBe('New help');
    });
  });
  
  describe('Event Handling', () => {
    it('should call onChange handler', () => {
      const onChange = vi.fn();
      const input = new Input({ onChange });
      input.mount(container);
      
      input.inputElement.value = 'test';
      input.inputElement.dispatchEvent(new Event('input'));
      
      expect(onChange).toHaveBeenCalledWith('test', expect.any(Event));
    });
    
    it('should call onFocus handler', () => {
      const onFocus = vi.fn();
      const input = new Input({ onFocus });
      input.mount(container);
      
      input.inputElement.dispatchEvent(new Event('focus'));
      
      expect(onFocus).toHaveBeenCalled();
      expect(input.focused).toBe(true);
      expect(input.element.classList.contains('input--focus')).toBe(true);
    });
    
    it('should call onBlur handler', () => {
      const onBlur = vi.fn();
      const input = new Input({ onBlur });
      input.mount(container);
      
      input.inputElement.dispatchEvent(new Event('blur'));
      
      expect(onBlur).toHaveBeenCalled();
      expect(input.focused).toBe(false);
      expect(input.element.classList.contains('input--focus')).toBe(false);
    });
    
    it('should validate on blur', () => {
      const input = new Input({ required: true });
      input.mount(container);
      
      input.inputElement.dispatchEvent(new Event('blur'));
      
      expect(input.hasError).toBe(true);
    });
    
    it('should validate on change', () => {
      const input = new Input({ required: true });
      input.mount(container);
      
      input.inputElement.value = 'value';
      input.inputElement.dispatchEvent(new Event('change'));
      
      expect(input.hasError).toBe(false);
    });
  });
  
  describe('Debounced Validation', () => {
    it('should debounce validation on input', async () => {
      const input = new Input({
        required: true,
        debounceDelay: 100
      });
      input.mount(container);
      
      // Trigger multiple inputs quickly
      input.inputElement.value = 'a';
      input.inputElement.dispatchEvent(new Event('input'));
      
      input.inputElement.value = 'ab';
      input.inputElement.dispatchEvent(new Event('input'));
      
      input.inputElement.value = 'abc';
      input.inputElement.dispatchEvent(new Event('input'));
      
      // Validation should not happen immediately
      expect(input.hasError).toBe(false);
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Now validation should have occurred
      expect(input.hasError).toBe(false);
    });
  });
  
  describe('Focus Management', () => {
    it('should focus input', () => {
      const input = new Input();
      input.mount(container);
      
      input.focus();
      expect(document.activeElement).toBe(input.inputElement);
    });
    
    it('should blur input', () => {
      const input = new Input();
      input.mount(container);
      
      input.focus();
      input.blur();
      expect(document.activeElement).not.toBe(input.inputElement);
    });
  });
  
  describe('Mounting and Unmounting', () => {
    it('should mount to parent element', () => {
      const input = new Input();
      input.mount(container);
      
      expect(input.mounted).toBe(true);
      expect(container.contains(input.element)).toBe(true);
    });
    
    it('should unmount from parent', () => {
      const input = new Input();
      input.mount(container);
      input.unmount();
      
      expect(input.mounted).toBe(false);
      expect(container.contains(input.element)).toBe(false);
    });
    
    it('should not mount if already mounted', () => {
      const input = new Input();
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      input.mount(container);
      input.mount(container);
      
      expect(spy).toHaveBeenCalledWith('Input is already mounted');
      spy.mockRestore();
    });
    
    it('should not unmount if not mounted', () => {
      const input = new Input();
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      input.unmount();
      
      expect(spy).toHaveBeenCalledWith('Input is not mounted');
      spy.mockRestore();
    });
  });
  
  describe('Cleanup', () => {
    it('should destroy input and clean up', () => {
      const input = new Input();
      input.mount(container);
      input.destroy();
      
      expect(input.element).toBeNull();
      expect(input.mounted).toBe(false);
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const input = new Input({
        label: 'Username',
        required: true
      });
      
      expect(input.inputElement.getAttribute('aria-required')).toBe('true');
      expect(input.inputElement.getAttribute('aria-invalid')).toBe('false');
    });
    
    it('should update aria-invalid on error', () => {
      const input = new Input();
      
      input.setError('Error');
      expect(input.inputElement.getAttribute('aria-invalid')).toBe('true');
      
      input.clearError();
      expect(input.inputElement.getAttribute('aria-invalid')).toBe('false');
    });
    
    it('should have aria-disabled when disabled', () => {
      const input = new Input({ disabled: true });
      expect(input.inputElement.getAttribute('aria-disabled')).toBe('true');
    });
    
    it('should have aria-readonly when readonly', () => {
      const input = new Input({ readonly: true });
      expect(input.inputElement.getAttribute('aria-readonly')).toBe('true');
    });
    
    it('should have role="alert" on error element', () => {
      const input = new Input();
      const errorElement = input.element.querySelector('.input__error');
      expect(errorElement.getAttribute('role')).toBe('alert');
      expect(errorElement.getAttribute('aria-live')).toBe('polite');
    });
  });
  
  describe('Icons', () => {
    it('should render left icon', () => {
      const input = new Input({
        icon: '<svg>icon</svg>',
        iconPosition: 'left'
      });
      
      const icon = input.element.querySelector('.input__icon--left');
      expect(icon).toBeDefined();
      expect(icon.innerHTML).toContain('icon');
    });
    
    it('should render right icon', () => {
      const input = new Input({
        icon: '<svg>icon</svg>',
        iconPosition: 'right'
      });
      
      const icon = input.element.querySelector('.input__icon--right');
      expect(icon).toBeDefined();
      expect(icon.innerHTML).toContain('icon');
    });
    
    it('should add icon class to container', () => {
      const input = new Input({
        icon: '<svg>icon</svg>',
        iconPosition: 'left'
      });
      
      expect(input.element.classList.contains('input--icon-left')).toBe(true);
    });
  });
  
  describe('File Input', () => {
    it('should create file input', () => {
      const input = new Input({
        type: 'file',
        accept: '.jpg,.png'
      });
      
      expect(input.inputElement.type).toBe('file');
      expect(input.inputElement.accept).toBe('.jpg,.png');
    });
    
    it('should return FileList for file input', () => {
      const input = new Input({ type: 'file' });
      input.mount(container);
      
      const value = input.getValue();
      expect(value).toBeInstanceOf(FileList);
    });
  });
  
  describe('Textarea', () => {
    it('should create textarea with rows', () => {
      const input = new Input({
        type: 'textarea',
        rows: 6
      });
      
      expect(input.inputElement.tagName).toBe('TEXTAREA');
      expect(input.inputElement.rows).toBe(6);
    });
    
    it('should set textarea value', () => {
      const input = new Input({
        type: 'textarea',
        value: 'Initial text'
      });
      
      expect(input.getValue()).toBe('Initial text');
    });
  });
  
  describe('isValid Method', () => {
    it('should return true when valid', () => {
      const input = new Input({ required: true });
      input.setValue('value');
      expect(input.isValid()).toBe(true);
    });
    
    it('should return false when invalid', () => {
      const input = new Input({ required: true });
      expect(input.isValid()).toBe(false);
    });
  });
});
