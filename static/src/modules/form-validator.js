/**
 * FormValidator - Integrates validation rules with DOM form elements.
 * Provides inline error display, real-time debounced validation,
 * form-level submit validation, and API error toast display.
 *
 * @module form-validator
 * @example
 * import { FormValidator } from './modules/form-validator.js';
 *
 * const validator = new FormValidator(formElement, {
 *   fields: {
 *     'url-input': { required: true, url: true, label: 'URL' },
 *     'count-input': { required: true, min: 1, max: 100, label: 'Count' },
 *   },
 *   onSubmit: async (values) => { ... }
 * });
 */

import {
  validateRequired,
  validateURL,
  validateTikTokURL,
  validateYouTubeURL,
  validateEmail,
  validateNumberRange,
  validateFile,
  isFormValid,
} from './validators.js';
import { debounce } from './utils.js';

export class FormValidator {
  /**
   * @param {HTMLFormElement} form
   * @param {Object} options
   * @param {Object} options.fields - Field rules keyed by element id
   * @param {Function} [options.onSubmit] - Called with field values when form is valid
   * @param {number} [options.debounceMs=300] - Debounce delay for real-time validation
   */
  constructor(form, options = {}) {
    if (!form) throw new Error('FormValidator: form element is required');
    this._form = form;
    this._options = { debounceMs: 300, ...options };
    this._fields = options.fields || {};
    this._results = {};
    this._cleanups = [];

    this._init();
  }

  _init() {
    this._attachRealTimeValidation();
    this._attachSubmitHandler();
  }

  _attachRealTimeValidation() {
    Object.entries(this._fields).forEach(([id, rules]) => {
      const el = this._form.querySelector(`#${id}`);
      if (!el) return;

      const debouncedValidate = debounce(() => {
        const result = this._validateField(id, el.value, rules);
        this._results[id] = result;
        this._showFieldError(el, result);
        this._updateSubmitButton();
      }, this._options.debounceMs);

      const onInput = () => {
        // Clear error immediately when user starts typing
        this._clearFieldError(el);
        debouncedValidate();
      };

      el.addEventListener('input', onInput);
      el.addEventListener('change', onInput);
      this._cleanups.push(() => {
        el.removeEventListener('input', onInput);
        el.removeEventListener('change', onInput);
      });
    });
  }

  _attachSubmitHandler() {
    const onSubmit = (e) => {
      e.preventDefault();
      if (this.validateAll()) {
        const values = this._collectValues();
        if (typeof this._options.onSubmit === 'function') {
          this._options.onSubmit(values);
        }
      }
    };
    this._form.addEventListener('submit', onSubmit);
    this._cleanups.push(() => this._form.removeEventListener('submit', onSubmit));
  }

  /**
   * Validate a single field value against its rules
   * @param {string} id
   * @param {*} value
   * @param {Object} rules
   * @returns {{ valid: boolean, error?: string }}
   */
  _validateField(id, value, rules) {
    const label = rules.label || id;

    if (rules.required) {
      const r = validateRequired(value, label);
      if (!r.valid) return r;
    }

    // Skip further checks if empty and not required
    if (!rules.required && (!value || String(value).trim() === '')) {
      return { valid: true };
    }

    if (rules.url) {
      const r = validateURL(value);
      if (!r.valid) return r;
    }
    if (rules.tiktokUrl) {
      const r = validateTikTokURL(value);
      if (!r.valid) return r;
    }
    if (rules.youtubeUrl) {
      const r = validateYouTubeURL(value);
      if (!r.valid) return r;
    }
    if (rules.email) {
      const r = validateEmail(value);
      if (!r.valid) return r;
    }
    if (rules.min !== undefined || rules.max !== undefined) {
      const r = validateNumberRange(value, rules.min, rules.max, label);
      if (!r.valid) return r;
    }
    if (rules.file && value instanceof File) {
      const r = validateFile(value, rules.file);
      if (!r.valid) return r;
    }
    if (typeof rules.custom === 'function') {
      const r = rules.custom(value, label);
      if (!r.valid) return r;
    }

    return { valid: true };
  }

  /**
   * Show inline error message below a field
   * @param {HTMLElement} el
   * @param {{ valid: boolean, error?: string }} result
   */
  _showFieldError(el, result) {
    // Remove existing error
    this._clearFieldError(el);

    if (result.valid) {
      el.classList.remove('input--error');
      el.removeAttribute('aria-invalid');
      return;
    }

    el.classList.add('input--error');
    el.setAttribute('aria-invalid', 'true');

    const errorId = `${el.id}-error`;
    el.setAttribute('aria-describedby', errorId);

    const errorEl = document.createElement('span');
    errorEl.id = errorId;
    errorEl.className = 'form-error';
    errorEl.setAttribute('role', 'alert');
    errorEl.textContent = result.error || 'Invalid value';

    el.insertAdjacentElement('afterend', errorEl);
  }

  _clearFieldError(el) {
    el.classList.remove('input--error');
    el.removeAttribute('aria-invalid');
    const errorId = `${el.id}-error`;
    const existing = this._form.querySelector(`#${errorId}`);
    if (existing) existing.remove();
  }

  _updateSubmitButton() {
    const submitBtn = this._form.querySelector('[type="submit"], .btn--primary');
    if (!submitBtn) return;
    const allValid = Object.values(this._results).every(r => r.valid);
    submitBtn.disabled = !allValid;
  }

  /**
   * Validate all fields at once (used on submit)
   * @returns {boolean}
   */
  validateAll() {
    let allValid = true;

    Object.entries(this._fields).forEach(([id, rules]) => {
      const el = this._form.querySelector(`#${id}`);
      if (!el) return;

      const value = el.type === 'file' ? el.files?.[0] : el.value;
      const result = this._validateField(id, value, rules);
      this._results[id] = result;
      this._showFieldError(el, result);

      if (!result.valid) allValid = false;
    });

    this._updateSubmitButton();
    return allValid;
  }

  _collectValues() {
    const values = {};
    Object.keys(this._fields).forEach(id => {
      const el = this._form.querySelector(`#${id}`);
      if (!el) return;
      if (el.type === 'checkbox') values[id] = el.checked;
      else if (el.type === 'file') values[id] = el.files?.[0] || null;
      else values[id] = el.value;
    });
    return values;
  }

  /**
   * Show a toast notification for API errors
   * @param {string} message
   * @param {'error'|'warning'|'info'|'success'} [type='error']
   */
  static showToast(message, type = 'error') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.innerHTML = `
      <span class="toast__message">${message}</span>
      <button class="toast__close" type="button" aria-label="Đóng thông báo">✕</button>
    `;

    toast.querySelector('.toast__close')?.addEventListener('click', () => toast.remove());

    document.body.appendChild(toast);

    // Auto-remove after 5s
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
  }

  /**
   * Parse API error response and show user-friendly toast
   * @param {Error|Response|Object} error
   */
  static handleApiError(error) {
    let message = 'Đã xảy ra lỗi. Vui lòng thử lại.';

    if (error?.message) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error?.error) {
      message = error.error;
    }

    FormValidator.showToast(message, 'error');
  }

  /** Clean up all event listeners */
  destroy() {
    this._cleanups.forEach(fn => fn());
    this._cleanups = [];
  }
}

export default FormValidator;
