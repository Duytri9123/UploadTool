/**
 * Validators Module
 * 
 * This module provides validation functions for forms, URLs, and file uploads:
 * - URL validation (TikTok, YouTube, general URLs)
 * - Form field validation (required, email, number ranges)
 * - File validation (type, size)
 * - Real-time validation with debouncing
 * 
 * @module validators
 */

import { debounce } from './utils.js';

/**
 * Validation result object.
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the validation passed
 * @property {string} [error] - Error message if validation failed
 */

/**
 * Validates if a string is a valid URL.
 * 
 * @param {string} url - URL to validate
 * @returns {ValidationResult} Validation result
 * 
 * @example
 * validateURL('https://example.com');  // { valid: true }
 * validateURL('not a url');            // { valid: false, error: 'Invalid URL format' }
 */
export function validateURL(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }
  
  const trimmed = url.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'URL is required' };
  }
  
  try {
    const urlObj = new URL(trimmed);
    
    // Check if protocol is http or https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates if a URL is a valid TikTok URL.
 * 
 * @param {string} url - URL to validate
 * @returns {ValidationResult} Validation result
 * 
 * @example
 * validateTikTokURL('https://www.tiktok.com/@user/video/123');  // { valid: true }
 * validateTikTokURL('https://vm.tiktok.com/abc123/');           // { valid: true }
 * validateTikTokURL('https://youtube.com/watch?v=123');         // { valid: false, error: '...' }
 */
export function validateTikTokURL(url) {
  const urlValidation = validateURL(url);
  if (!urlValidation.valid) {
    return urlValidation;
  }
  
  try {
    const urlObj = new URL(url.trim());
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's a TikTok domain
    const tiktokDomains = ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'];
    const isTikTok = tiktokDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (!isTikTok) {
      return { valid: false, error: 'URL must be from TikTok (tiktok.com)' };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid TikTok URL' };
  }
}

/**
 * Validates if a URL is a valid YouTube URL.
 * 
 * @param {string} url - URL to validate
 * @returns {ValidationResult} Validation result
 * 
 * @example
 * validateYouTubeURL('https://www.youtube.com/watch?v=abc123');  // { valid: true }
 * validateYouTubeURL('https://youtu.be/abc123');                 // { valid: true }
 * validateYouTubeURL('https://tiktok.com/@user');                // { valid: false, error: '...' }
 */
export function validateYouTubeURL(url) {
  const urlValidation = validateURL(url);
  if (!urlValidation.valid) {
    return urlValidation;
  }
  
  try {
    const urlObj = new URL(url.trim());
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's a YouTube domain
    const youtubeDomains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
    const isYouTube = youtubeDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (!isYouTube) {
      return { valid: false, error: 'URL must be from YouTube (youtube.com or youtu.be)' };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid YouTube URL' };
  }
}

/**
 * Validates if a field is not empty (required field validation).
 * 
 * @param {*} value - Value to validate
 * @param {string} [fieldName='Field'] - Name of the field for error message
 * @returns {ValidationResult} Validation result
 * 
 * @example
 * validateRequired('hello');           // { valid: true }
 * validateRequired('', 'Username');    // { valid: false, error: 'Username is required' }
 * validateRequired(null);              // { valid: false, error: 'Field is required' }
 */
export function validateRequired(value, fieldName = 'Field') {
  if (value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (typeof value === 'string' && value.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  return { valid: true };
}

/**
 * Validates if a value is a valid email address.
 * 
 * @param {string} email - Email to validate
 * @returns {ValidationResult} Validation result
 * 
 * @example
 * validateEmail('user@example.com');  // { valid: true }
 * validateEmail('invalid-email');     // { valid: false, error: 'Invalid email format' }
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmed = email.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Email is required' };
  }
  
  // Basic email regex pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

/**
 * Validates if a number is within a specified range.
 * 
 * @param {number|string} value - Value to validate
 * @param {number} [min] - Minimum value (inclusive)
 * @param {number} [max] - Maximum value (inclusive)
 * @param {string} [fieldName='Value'] - Name of the field for error message
 * @returns {ValidationResult} Validation result
 * 
 * @example
 * validateNumberRange(5, 1, 10);              // { valid: true }
 * validateNumberRange(15, 1, 10);             // { valid: false, error: 'Value must be between 1 and 10' }
 * validateNumberRange(-5, 0);                 // { valid: false, error: 'Value must be at least 0' }
 * validateNumberRange(100, undefined, 50);    // { valid: false, error: 'Value must be at most 50' }
 */
export function validateNumberRange(value, min, max, fieldName = 'Value') {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (min !== undefined && num < min) {
    if (max !== undefined) {
      return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
    }
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    if (min !== undefined) {
      return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
    }
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }
  
  return { valid: true };
}

/**
 * Validates if a file has an allowed type.
 * 
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types or extensions (e.g., ['image/jpeg', '.png'])
 * @returns {ValidationResult} Validation result
 * 
 * @example
 * validateFileType(file, ['image/jpeg', 'image/png']);  // { valid: true }
 * validateFileType(file, ['.mp4', '.avi']);             // { valid: true }
 * validateFileType(file, ['image/jpeg']);               // { valid: false, error: '...' }
 */
export function validateFileType(file, allowedTypes) {
  if (!file || !(file instanceof File)) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (!allowedTypes || !Array.isArray(allowedTypes) || allowedTypes.length === 0) {
    return { valid: true }; // No restrictions
  }
  
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  // Check if file matches any allowed type
  const isAllowed = allowedTypes.some(type => {
    const lowerType = type.toLowerCase();
    
    // Check if it's an extension (starts with .)
    if (lowerType.startsWith('.')) {
      return fileName.endsWith(lowerType);
    }
    
    // Check if it's a MIME type
    if (lowerType.includes('/')) {
      // Support wildcards like "image/*"
      if (lowerType.endsWith('/*')) {
        const category = lowerType.split('/')[0];
        return fileType.startsWith(category + '/');
      }
      return fileType === lowerType;
    }
    
    return false;
  });
  
  if (!isAllowed) {
    const typesStr = allowedTypes.join(', ');
    return { valid: false, error: `File type not allowed. Allowed types: ${typesStr}` };
  }
  
  return { valid: true };
}

/**
 * Validates if a file size is within allowed limits.
 * 
 * @param {File} file - File to validate
 * @param {number} [maxSize] - Maximum file size in bytes
 * @param {number} [minSize] - Minimum file size in bytes
 * @returns {ValidationResult} Validation result
 * 
 * @example
 * validateFileSize(file, 5 * 1024 * 1024);  // Max 5MB - { valid: true }
 * validateFileSize(file, 1024 * 1024);      // Max 1MB - { valid: false, error: '...' }
 */
export function validateFileSize(file, maxSize, minSize) {
  if (!file || !(file instanceof File)) {
    return { valid: false, error: 'No file provided' };
  }
  
  const fileSize = file.size;
  
  if (minSize !== undefined && fileSize < minSize) {
    const minMB = (minSize / (1024 * 1024)).toFixed(2);
    return { valid: false, error: `File size must be at least ${minMB} MB` };
  }
  
  if (maxSize !== undefined && fileSize > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(2);
    return { valid: false, error: `File size must not exceed ${maxMB} MB` };
  }
  
  return { valid: true };
}

/**
 * Validates a file (combines type and size validation).
 * 
 * @param {File} file - File to validate
 * @param {Object} [options={}] - Validation options
 * @param {string[]} [options.allowedTypes] - Allowed file types
 * @param {number} [options.maxSize] - Maximum file size in bytes
 * @param {number} [options.minSize] - Minimum file size in bytes
 * @returns {ValidationResult} Validation result
 * 
 * @example
 * validateFile(file, {
 *   allowedTypes: ['image/jpeg', 'image/png'],
 *   maxSize: 5 * 1024 * 1024  // 5MB
 * });
 */
export function validateFile(file, options = {}) {
  const { allowedTypes, maxSize, minSize } = options;
  
  // Validate file type
  if (allowedTypes) {
    const typeValidation = validateFileType(file, allowedTypes);
    if (!typeValidation.valid) {
      return typeValidation;
    }
  }
  
  // Validate file size
  const sizeValidation = validateFileSize(file, maxSize, minSize);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  
  return { valid: true };
}

/**
 * Validates multiple fields in a form.
 * 
 * @param {Object} fields - Object with field names as keys and values to validate
 * @param {Object} rules - Validation rules for each field
 * @returns {Object} Object with field names as keys and ValidationResult as values
 * 
 * @example
 * const fields = {
 *   username: 'john',
 *   email: 'john@example.com',
 *   age: 25
 * };
 * 
 * const rules = {
 *   username: { required: true },
 *   email: { required: true, email: true },
 *   age: { required: true, min: 18, max: 100 }
 * };
 * 
 * const results = validateForm(fields, rules);
 * // {
 * //   username: { valid: true },
 * //   email: { valid: true },
 * //   age: { valid: true }
 * // }
 */
export function validateForm(fields, rules) {
  const results = {};
  
  Object.keys(rules).forEach(fieldName => {
    const value = fields[fieldName];
    const fieldRules = rules[fieldName];
    
    // Required validation
    if (fieldRules.required) {
      const result = validateRequired(value, fieldName);
      if (!result.valid) {
        results[fieldName] = result;
        return;
      }
    }
    
    // Skip other validations if value is empty and not required
    if (!fieldRules.required && (value === null || value === undefined || value === '')) {
      results[fieldName] = { valid: true };
      return;
    }
    
    // Email validation
    if (fieldRules.email) {
      const result = validateEmail(value);
      if (!result.valid) {
        results[fieldName] = result;
        return;
      }
    }
    
    // URL validation
    if (fieldRules.url) {
      const result = validateURL(value);
      if (!result.valid) {
        results[fieldName] = result;
        return;
      }
    }
    
    // TikTok URL validation
    if (fieldRules.tiktokUrl) {
      const result = validateTikTokURL(value);
      if (!result.valid) {
        results[fieldName] = result;
        return;
      }
    }
    
    // YouTube URL validation
    if (fieldRules.youtubeUrl) {
      const result = validateYouTubeURL(value);
      if (!result.valid) {
        results[fieldName] = result;
        return;
      }
    }
    
    // Number range validation
    if (fieldRules.min !== undefined || fieldRules.max !== undefined) {
      const result = validateNumberRange(value, fieldRules.min, fieldRules.max, fieldName);
      if (!result.valid) {
        results[fieldName] = result;
        return;
      }
    }
    
    // Custom validation function
    if (typeof fieldRules.custom === 'function') {
      const result = fieldRules.custom(value, fieldName);
      if (!result.valid) {
        results[fieldName] = result;
        return;
      }
    }
    
    results[fieldName] = { valid: true };
  });
  
  return results;
}

/**
 * Checks if all validation results are valid.
 * 
 * @param {Object} validationResults - Results from validateForm
 * @returns {boolean} True if all validations passed
 * 
 * @example
 * const results = validateForm(fields, rules);
 * if (isFormValid(results)) {
 *   console.log('Form is valid!');
 * }
 */
export function isFormValid(validationResults) {
  return Object.values(validationResults).every(result => result.valid);
}

/**
 * Gets all error messages from validation results.
 * 
 * @param {Object} validationResults - Results from validateForm
 * @returns {Object} Object with field names as keys and error messages as values
 * 
 * @example
 * const results = validateForm(fields, rules);
 * const errors = getValidationErrors(results);
 * // { email: 'Invalid email format', age: 'Age must be at least 18' }
 */
export function getValidationErrors(validationResults) {
  const errors = {};
  
  Object.entries(validationResults).forEach(([field, result]) => {
    if (!result.valid && result.error) {
      errors[field] = result.error;
    }
  });
  
  return errors;
}

/**
 * Creates a debounced validator function for real-time validation.
 * 
 * @param {Function} validatorFn - Validator function to debounce
 * @param {number} [delay=300] - Debounce delay in milliseconds
 * @returns {Function} Debounced validator function
 * 
 * @example
 * const debouncedURLValidator = createDebouncedValidator(validateURL, 300);
 * 
 * input.addEventListener('input', (e) => {
 *   debouncedURLValidator(e.target.value, (result) => {
 *     if (!result.valid) {
 *       showError(result.error);
 *     }
 *   });
 * });
 */
export function createDebouncedValidator(validatorFn, delay = 300) {
  const debouncedFn = debounce((value, callback) => {
    const result = validatorFn(value);
    if (typeof callback === 'function') {
      callback(result);
    }
  }, delay);
  
  return debouncedFn;
}

/**
 * Attaches real-time validation to an input element.
 * 
 * @param {HTMLInputElement} input - Input element to validate
 * @param {Function} validatorFn - Validator function
 * @param {Function} onValidate - Callback function called with validation result
 * @param {number} [delay=300] - Debounce delay in milliseconds
 * @returns {Function} Cleanup function to remove event listener
 * 
 * @example
 * const cleanup = attachValidator(
 *   document.querySelector('#url-input'),
 *   validateURL,
 *   (result) => {
 *     if (!result.valid) {
 *       showError(result.error);
 *     } else {
 *       clearError();
 *     }
 *   }
 * );
 * 
 * // Later, to remove the validator:
 * cleanup();
 */
export function attachValidator(input, validatorFn, onValidate, delay = 300) {
  if (!input || !(input instanceof HTMLInputElement)) {
    console.warn('attachValidator: Invalid input element provided');
    return () => {};
  }
  
  const debouncedValidator = createDebouncedValidator(validatorFn, delay);
  
  const handleInput = (e) => {
    debouncedValidator(e.target.value, onValidate);
  };
  
  input.addEventListener('input', handleInput);
  
  // Return cleanup function
  return () => {
    input.removeEventListener('input', handleInput);
  };
}

/**
 * Error message generators for common validation scenarios.
 */
export const ErrorMessages = {
  required: (fieldName) => `${fieldName} is required`,
  invalidFormat: (fieldName) => `Invalid ${fieldName} format`,
  tooShort: (fieldName, min) => `${fieldName} must be at least ${min} characters`,
  tooLong: (fieldName, max) => `${fieldName} must not exceed ${max} characters`,
  outOfRange: (fieldName, min, max) => `${fieldName} must be between ${min} and ${max}`,
  invalidEmail: () => 'Invalid email address',
  invalidURL: () => 'Invalid URL format',
  invalidTikTokURL: () => 'Invalid TikTok URL',
  invalidYouTubeURL: () => 'Invalid YouTube URL',
  fileTooLarge: (maxSize) => `File size must not exceed ${(maxSize / (1024 * 1024)).toFixed(2)} MB`,
  fileTooSmall: (minSize) => `File size must be at least ${(minSize / (1024 * 1024)).toFixed(2)} MB`,
  invalidFileType: (allowedTypes) => `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
};
