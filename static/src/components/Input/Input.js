/**
 * Input Component
 * 
 * A reusable input component with multiple types, validation, and states.
 * Supports text, number, url, file, textarea types with real-time validation,
 * debouncing, error messages, icons, and WCAG AA accessibility.
 * 
 * @example
 * import { Input } from './components/Input/Input.js';
 * 
 * const input = new Input({
 *   type: 'text',
 *   placeholder: 'Enter text',
 *   label: 'Username',
 *   required: true,
 *   validator: (value) => value.length >= 3,
 *   errorMessage: 'Must be at least 3 characters',
 *   onChange: (value) => console.log(value)
 * });
 * 
 * document.body.appendChild(input.element);
 */

import { debounce } from '../../modules/utils.js';
import { validateRequired, validateURL, validateEmail, validateNumberRange } from '../../modules/validators.js';

export class Input {
  /**
   * Create an Input instance
   * @param {Object} options - Input configuration
   * @param {string} [options.type='text'] - Input type: text, number, url, file, textarea, email, password
   * @param {string} [options.label] - Label text
   * @param {string} [options.placeholder] - Placeholder text
   * @param {string} [options.value=''] - Initial value
   * @param {boolean} [options.required=false] - Whether input is required
   * @param {boolean} [options.disabled=false] - Whether input is disabled
   * @param {boolean} [options.readonly=false] - Whether input is readonly
   * @param {string} [options.name] - Input name attribute
   * @param {string} [options.id] - Input id attribute
   * @param {string} [options.errorMessage] - Custom error message
   * @param {string} [options.helpText] - Help text displayed below input
   * @param {Function} [options.validator] - Custom validator function
   * @param {Function} [options.onChange] - Change handler function
   * @param {Function} [options.onFocus] - Focus handler function
   * @param {Function} [options.onBlur] - Blur handler function
   * @param {string} [options.icon] - Icon HTML or class name
   * @param {string} [options.iconPosition='left'] - Icon position: left, right
   * @param {number} [options.debounceDelay=300] - Debounce delay for validation in ms
   * @param {number} [options.min] - Minimum value (for number type)
   * @param {number} [options.max] - Maximum value (for number type)
   * @param {number} [options.rows=4] - Number of rows (for textarea type)
   * @param {string} [options.accept] - Accepted file types (for file type)
   * @param {string} [options.className] - Additional CSS classes
   */
  constructor(options = {}) {
    this.options = {
      type: 'text',
      label: null,
      placeholder: '',
      value: '',
      required: false,
      disabled: false,
      readonly: false,
      name: null,
      id: null,
      errorMessage: null,
      helpText: null,
      validator: null,
      onChange: null,
      onFocus: null,
      onBlur: null,
      icon: null,
      iconPosition: 'left',
      debounceDelay: 300,
      min: null,
      max: null,
      rows: 4,
      accept: null,
      className: '',
      ...options
    };

    this._element = null;
    this._inputElement = null;
    this._labelElement = null;
    this._errorElement = null;
    this._helpElement = null;
    this._mounted = false;
    this._hasError = false;
    this._isFocused = false;
    this._initialValue = this.options.value || '';
    
    // Bind event handlers
    this._inputHandler = this._handleInput.bind(this);
    this._changeHandler = this._handleChange.bind(this);
    this._focusHandler = this._handleFocus.bind(this);
    this._blurHandler = this._handleBlur.bind(this);
    
    // Create debounced validation
    this._debouncedValidate = debounce(this._validate.bind(this), this.options.debounceDelay);
    
    this._init();
  }

  /**
   * Initialize the input element
   * @private
   */
  _init() {
    this._element = this._createElement();
    this._attachEventListeners();
  }

  /**
   * Create the input DOM structure
   * @private
   * @returns {HTMLElement}
   */
  _createElement() {
    const container = document.createElement('div');
    
    // Build BEM class names
    const classes = ['input'];
    
    if (this.options.disabled) {
      classes.push('input--disabled');
    }
    
    if (this.options.readonly) {
      classes.push('input--readonly');
    }
    
    if (this.options.icon) {
      classes.push(`input--icon-${this.options.iconPosition}`);
    }
    
    if (this.options.className) {
      classes.push(this.options.className);
    }
    
    container.className = classes.join(' ');
    
    // Build inner HTML
    container.innerHTML = this._buildHTML();
    
    // Store references to key elements
    this._inputElement = container.querySelector('.input__field');
    this._labelElement = container.querySelector('.input__label');
    this._errorElement = container.querySelector('.input__error');
    this._helpElement = container.querySelector('.input__help');
    
    return container;
  }

  /**
   * Build input inner HTML
   * @private
   * @returns {string}
   */
  _buildHTML() {
    const parts = [];
    const inputId = this.options.id || `input-${Math.random().toString(36).substring(2, 10)}`;
    
    // Label
    if (this.options.label) {
      parts.push(`
        <label class="input__label" for="${inputId}">
          ${this.options.label}
          ${this.options.required ? '<span class="input__required" aria-label="required">*</span>' : ''}
        </label>
      `);
    }
    
    // Input wrapper
    parts.push('<div class="input__wrapper">');
    
    // Left icon
    if (this.options.icon && this.options.iconPosition === 'left') {
      parts.push(`<span class="input__icon input__icon--left" aria-hidden="true">${this.options.icon}</span>`);
    }
    
    // Input field or textarea
    if (this.options.type === 'textarea') {
      parts.push(this._buildTextarea(inputId));
    } else {
      parts.push(this._buildInput(inputId));
    }
    
    // Right icon
    if (this.options.icon && this.options.iconPosition === 'right') {
      parts.push(`<span class="input__icon input__icon--right" aria-hidden="true">${this.options.icon}</span>`);
    }
    
    parts.push('</div>'); // Close input__wrapper
    
    // Help text
    if (this.options.helpText) {
      parts.push(`<div class="input__help">${this.options.helpText}</div>`);
    }
    
    // Error message
    parts.push('<div class="input__error" role="alert" aria-live="polite"></div>');
    
    return parts.join('');
  }

  /**
   * Build input element HTML
   * @private
   * @param {string} inputId
   * @returns {string}
   */
  _buildInput(inputId) {
    const attrs = [];
    
    attrs.push(`type="${this.options.type}"`);
    attrs.push(`id="${inputId}"`);
    attrs.push(`class="input__field"`);
    
    if (this.options.name) {
      attrs.push(`name="${this.options.name}"`);
    }
    
    if (this.options.placeholder) {
      attrs.push(`placeholder="${this.options.placeholder}"`);
    }
    
    if (this.options.value) {
      attrs.push(`value="${this.options.value}"`);
    }
    
    if (this.options.required) {
      attrs.push('required');
      attrs.push('aria-required="true"');
    }
    
    if (this.options.disabled) {
      attrs.push('disabled');
      attrs.push('aria-disabled="true"');
    }
    
    if (this.options.readonly) {
      attrs.push('readonly');
      attrs.push('aria-readonly="true"');
    }
    
    if (this.options.min !== null) {
      attrs.push(`min="${this.options.min}"`);
    }
    
    if (this.options.max !== null) {
      attrs.push(`max="${this.options.max}"`);
    }
    
    if (this.options.accept && this.options.type === 'file') {
      attrs.push(`accept="${this.options.accept}"`);
    }
    
    attrs.push('aria-invalid="false"');
    
    return `<input ${attrs.join(' ')} />`;
  }

  /**
   * Build textarea element HTML
   * @private
   * @param {string} inputId
   * @returns {string}
   */
  _buildTextarea(inputId) {
    const attrs = [];
    
    attrs.push(`id="${inputId}"`);
    attrs.push(`class="input__field"`);
    attrs.push(`rows="${this.options.rows}"`);
    
    if (this.options.name) {
      attrs.push(`name="${this.options.name}"`);
    }
    
    if (this.options.placeholder) {
      attrs.push(`placeholder="${this.options.placeholder}"`);
    }
    
    if (this.options.required) {
      attrs.push('required');
      attrs.push('aria-required="true"');
    }
    
    if (this.options.disabled) {
      attrs.push('disabled');
      attrs.push('aria-disabled="true"');
    }
    
    if (this.options.readonly) {
      attrs.push('readonly');
      attrs.push('aria-readonly="true"');
    }
    
    attrs.push('aria-invalid="false"');
    
    return `<textarea ${attrs.join(' ')}>${this.options.value}</textarea>`;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this._inputElement.addEventListener('input', this._inputHandler);
    this._inputElement.addEventListener('change', this._changeHandler);
    this._inputElement.addEventListener('focus', this._focusHandler);
    this._inputElement.addEventListener('blur', this._blurHandler);
  }

  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    this._inputElement.removeEventListener('input', this._inputHandler);
    this._inputElement.removeEventListener('change', this._changeHandler);
    this._inputElement.removeEventListener('focus', this._focusHandler);
    this._inputElement.removeEventListener('blur', this._blurHandler);
  }

  /**
   * Handle input events (real-time validation with debouncing)
   * @private
   * @param {Event} event
   */
  _handleInput(event) {
    const value = this.getValue();
    
    // Clear error on input
    if (this._hasError) {
      this.clearError();
    }
    
    // Debounced validation
    this._debouncedValidate();
    
    // Call onChange handler
    if (typeof this.options.onChange === 'function') {
      this.options.onChange(value, event);
    }
  }

  /**
   * Handle change events
   * @private
   * @param {Event} event
   */
  _handleChange(event) {
    // Immediate validation on change
    this._validate();
  }

  /**
   * Handle focus events
   * @private
   * @param {Event} event
   */
  _handleFocus(event) {
    this._isFocused = true;
    this._element.classList.add('input--focus');
    
    if (typeof this.options.onFocus === 'function') {
      this.options.onFocus(event);
    }
  }

  /**
   * Handle blur events
   * @private
   * @param {Event} event
   */
  _handleBlur(event) {
    this._isFocused = false;
    this._element.classList.remove('input--focus');
    
    // Validate on blur
    this._validate();
    
    if (typeof this.options.onBlur === 'function') {
      this.options.onBlur(event);
    }
  }

  /**
   * Validate input value
   * @private
   * @returns {boolean} True if valid
   */
  _validate() {
    const value = this.getValue();
    
    // Required validation
    if (this.options.required) {
      const result = validateRequired(value, this.options.label || 'Field');
      if (!result.valid) {
        this.setError(result.error);
        return false;
      }
    }
    
    // Skip other validations if empty and not required
    if (!value && !this.options.required) {
      this.clearError();
      return true;
    }
    
    // Type-specific validation
    if (this.options.type === 'url' && value) {
      const result = validateURL(value);
      if (!result.valid) {
        this.setError(result.error);
        return false;
      }
    }
    
    if (this.options.type === 'email' && value) {
      const result = validateEmail(value);
      if (!result.valid) {
        this.setError(result.error);
        return false;
      }
    }
    
    if (this.options.type === 'number' && value) {
      // Only validate if min or max is set
      if (this.options.min !== null || this.options.max !== null) {
        const min = this.options.min !== null ? this.options.min : undefined;
        const max = this.options.max !== null ? this.options.max : undefined;
        const result = validateNumberRange(value, min, max, this.options.label || 'Value');
        if (!result.valid) {
          this.setError(result.error);
          return false;
        }
      }
    }
    
    // Custom validator
    if (typeof this.options.validator === 'function') {
      const result = this.options.validator(value);
      
      // Handle boolean return
      if (typeof result === 'boolean') {
        if (!result) {
          this.setError(this.options.errorMessage || 'Invalid value');
          return false;
        }
      }
      // Handle ValidationResult object
      else if (result && typeof result === 'object') {
        if (!result.valid) {
          this.setError(result.error || this.options.errorMessage || 'Invalid value');
          return false;
        }
      }
    }
    
    this.clearError();
    return true;
  }

  /**
   * Set error state and message
   * @param {string} message - Error message
   */
  setError(message) {
    this._hasError = true;
    this._element.classList.add('input--error');
    this._inputElement.setAttribute('aria-invalid', 'true');
    
    if (this._errorElement && message) {
      this._errorElement.textContent = message;
      this._errorElement.style.display = 'block';
    }
  }

  /**
   * Clear error state
   */
  clearError() {
    this._hasError = false;
    this._element.classList.remove('input--error');
    this._inputElement.setAttribute('aria-invalid', 'false');
    
    if (this._errorElement) {
      this._errorElement.textContent = '';
      this._errorElement.style.display = 'none';
    }
  }

  /**
   * Get input value
   * @returns {string|File|FileList} Input value
   */
  getValue() {
    if (this.options.type === 'file') {
      return this._inputElement.files;
    }
    return this._inputElement.value;
  }

  /**
   * Set input value
   * @param {string} value - New value
   */
  setValue(value) {
    if (this.options.type !== 'file') {
      this._inputElement.value = value;
      this.options.value = value;
      
      // Validate after setting value
      this._validate();
    }
  }

  /**
   * Set disabled state
   * @param {boolean} disabled - Whether input should be disabled
   */
  setDisabled(disabled) {
    this.options.disabled = disabled;
    this._inputElement.disabled = disabled;
    this._inputElement.setAttribute('aria-disabled', disabled);
    
    if (disabled) {
      this._element.classList.add('input--disabled');
    } else {
      this._element.classList.remove('input--disabled');
    }
  }

  /**
   * Set readonly state
   * @param {boolean} readonly - Whether input should be readonly
   */
  setReadonly(readonly) {
    this.options.readonly = readonly;
    this._inputElement.readOnly = readonly;
    this._inputElement.setAttribute('aria-readonly', readonly);
    
    if (readonly) {
      this._element.classList.add('input--readonly');
    } else {
      this._element.classList.remove('input--readonly');
    }
  }

  /**
   * Set placeholder text
   * @param {string} placeholder - New placeholder
   */
  setPlaceholder(placeholder) {
    this.options.placeholder = placeholder;
    this._inputElement.placeholder = placeholder;
  }

  /**
   * Set label text
   * @param {string} label - New label
   */
  setLabel(label) {
    this.options.label = label;
    if (this._labelElement) {
      this._labelElement.textContent = label;
    }
  }

  /**
   * Set help text
   * @param {string} helpText - New help text
   */
  setHelpText(helpText) {
    this.options.helpText = helpText;
    if (this._helpElement) {
      this._helpElement.textContent = helpText;
      this._helpElement.style.display = helpText ? 'block' : 'none';
    }
  }

  /**
   * Validate the input
   * @returns {boolean} True if valid
   */
  validate() {
    return this._validate();
  }

  /**
   * Check if input is valid
   * @returns {boolean} True if valid
   */
  isValid() {
    return !this._hasError && this._validate();
  }

  /**
   * Focus the input
   */
  focus() {
    this._inputElement.focus();
  }

  /**
   * Blur the input
   */
  blur() {
    this._inputElement.blur();
  }

  /**
   * Reset the input to initial state
   */
  reset() {
    // Store initial value when component is created
    if (!this._initialValue) {
      this._initialValue = this.options.value || '';
    }
    this.setValue(this._initialValue);
    this.clearError();
  }

  /**
   * Mount the input to a parent element
   * @param {HTMLElement} parent - Parent element
   */
  mount(parent) {
    if (this._mounted) {
      console.warn('Input is already mounted');
      return;
    }
    
    parent.appendChild(this._element);
    this._mounted = true;
  }

  /**
   * Unmount the input from its parent
   */
  unmount() {
    if (!this._mounted) {
      console.warn('Input is not mounted');
      return;
    }
    
    this._removeEventListeners();
    
    if (this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    
    this._mounted = false;
  }

  /**
   * Destroy the input and clean up
   */
  destroy() {
    this.unmount();
    this._element = null;
    this._inputElement = null;
    this._labelElement = null;
    this._errorElement = null;
    this._helpElement = null;
    this.options = null;
  }

  /**
   * Get the input container DOM element
   * @returns {HTMLElement}
   */
  get element() {
    return this._element;
  }

  /**
   * Get the input field DOM element
   * @returns {HTMLInputElement|HTMLTextAreaElement}
   */
  get inputElement() {
    return this._inputElement;
  }

  /**
   * Check if input is mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._mounted;
  }

  /**
   * Check if input has error
   * @returns {boolean}
   */
  get hasError() {
    return this._hasError;
  }

  /**
   * Check if input is focused
   * @returns {boolean}
   */
  get focused() {
    return this._isFocused;
  }

  /**
   * Check if input is disabled
   * @returns {boolean}
   */
  get disabled() {
    return this.options.disabled;
  }

  /**
   * Check if input is readonly
   * @returns {boolean}
   */
  get readonly() {
    return this.options.readonly;
  }
}

export default Input;
