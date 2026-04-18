/**
 * Tests for FormValidator module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormValidator } from './form-validator.js';

// Mock validators and utils modules
vi.mock('./validators.js', () => ({
  validateRequired: (v, label) => v ? { valid: true } : { valid: false, error: `${label} is required` },
  validateURL: (v) => {
    try { new URL(v); return { valid: true }; } catch { return { valid: false, error: 'Invalid URL' }; }
  },
  validateTikTokURL: (v) => ({ valid: true }),
  validateYouTubeURL: (v) => ({ valid: true }),
  validateEmail: (v) => (/\S+@\S+\.\S+/.test(v) ? { valid: true } : { valid: false, error: 'Invalid email' }),
  validateNumberRange: (v, min, max) => {
    const n = Number(v);
    if (min !== undefined && n < min) return { valid: false, error: `Must be >= ${min}` };
    if (max !== undefined && n > max) return { valid: false, error: `Must be <= ${max}` };
    return { valid: true };
  },
  validateFile: () => ({ valid: true }),
  isFormValid: (results) => Object.values(results).every(r => r.valid),
}));

vi.mock('./utils.js', () => ({
  debounce: (fn) => fn,
}));

function createForm(html) {
  const form = document.createElement('form');
  form.innerHTML = html;
  document.body.appendChild(form);
  return form;
}

describe('FormValidator', () => {
  let form;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('validates required fields on validateAll()', () => {
    form = createForm('<input id="name" type="text" value="" />');
    const validator = new FormValidator(form, {
      fields: { name: { required: true, label: 'Name' } },
    });

    const valid = validator.validateAll();
    expect(valid).toBe(false);

    const errorEl = form.querySelector('#name-error');
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toContain('required');

    validator.destroy();
  });

  it('passes validation when required field has value', () => {
    form = createForm('<input id="name" type="text" value="John" />');
    const validator = new FormValidator(form, {
      fields: { name: { required: true, label: 'Name' } },
    });

    const valid = validator.validateAll();
    expect(valid).toBe(true);
    validator.destroy();
  });

  it('shows toast via static method', () => {
    FormValidator.showToast('Test error', 'error');
    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Test error');
  });

  it('handles API errors', () => {
    FormValidator.handleApiError(new Error('Server error'));
    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Server error');
  });
});
