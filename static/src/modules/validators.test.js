/**
 * Unit tests for validators module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateURL,
  validateTikTokURL,
  validateYouTubeURL,
  validateRequired,
  validateEmail,
  validateNumberRange,
  validateFileType,
  validateFileSize,
  validateFile,
  validateForm,
  isFormValid,
  getValidationErrors,
  createDebouncedValidator,
  attachValidator,
  ErrorMessages
} from './validators.js';

describe('validators', () => {
  describe('validateURL', () => {
    it('should validate valid HTTP URLs', () => {
      expect(validateURL('http://example.com')).toEqual({ valid: true });
      expect(validateURL('https://example.com')).toEqual({ valid: true });
      expect(validateURL('https://example.com/path')).toEqual({ valid: true });
      expect(validateURL('https://example.com/path?query=value')).toEqual({ valid: true });
    });

    it('should reject invalid URLs', () => {
      expect(validateURL('not a url').valid).toBe(false);
      expect(validateURL('').valid).toBe(false);
      expect(validateURL('   ').valid).toBe(false);
      expect(validateURL(null).valid).toBe(false);
      expect(validateURL(undefined).valid).toBe(false);
    });

    it('should reject non-HTTP protocols', () => {
      const result = validateURL('ftp://example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTP or HTTPS');
    });

    it('should trim whitespace', () => {
      expect(validateURL('  https://example.com  ')).toEqual({ valid: true });
    });
  });

  describe('validateTikTokURL', () => {
    it('should validate valid TikTok URLs', () => {
      expect(validateTikTokURL('https://www.tiktok.com/@user/video/123')).toEqual({ valid: true });
      expect(validateTikTokURL('https://tiktok.com/@user')).toEqual({ valid: true });
      expect(validateTikTokURL('https://vm.tiktok.com/abc123/')).toEqual({ valid: true });
      expect(validateTikTokURL('https://vt.tiktok.com/abc123/')).toEqual({ valid: true });
      expect(validateTikTokURL('https://m.tiktok.com/@user')).toEqual({ valid: true });
    });

    it('should reject non-TikTok URLs', () => {
      const result = validateTikTokURL('https://youtube.com/watch?v=123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('TikTok');
    });

    it('should reject invalid URLs', () => {
      expect(validateTikTokURL('not a url').valid).toBe(false);
      expect(validateTikTokURL('').valid).toBe(false);
    });
  });

  describe('validateYouTubeURL', () => {
    it('should validate valid YouTube URLs', () => {
      expect(validateYouTubeURL('https://www.youtube.com/watch?v=abc123')).toEqual({ valid: true });
      expect(validateYouTubeURL('https://youtube.com/watch?v=abc123')).toEqual({ valid: true });
      expect(validateYouTubeURL('https://youtu.be/abc123')).toEqual({ valid: true });
      expect(validateYouTubeURL('https://m.youtube.com/watch?v=abc123')).toEqual({ valid: true });
    });

    it('should reject non-YouTube URLs', () => {
      const result = validateYouTubeURL('https://tiktok.com/@user');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('YouTube');
    });

    it('should reject invalid URLs', () => {
      expect(validateYouTubeURL('not a url').valid).toBe(false);
      expect(validateYouTubeURL('').valid).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      expect(validateRequired('hello')).toEqual({ valid: true });
      expect(validateRequired('0')).toEqual({ valid: true });
      expect(validateRequired(0)).toEqual({ valid: true });
      expect(validateRequired(false)).toEqual({ valid: true });
      expect(validateRequired(['item'])).toEqual({ valid: true });
    });

    it('should reject empty values', () => {
      expect(validateRequired('').valid).toBe(false);
      expect(validateRequired('   ').valid).toBe(false);
      expect(validateRequired(null).valid).toBe(false);
      expect(validateRequired(undefined).valid).toBe(false);
      expect(validateRequired([]).valid).toBe(false);
    });

    it('should use custom field name in error message', () => {
      const result = validateRequired('', 'Username');
      expect(result.error).toContain('Username');
    });
  });

  describe('validateEmail', () => {
    it('should validate valid email addresses', () => {
      expect(validateEmail('user@example.com')).toEqual({ valid: true });
      expect(validateEmail('test.user@example.co.uk')).toEqual({ valid: true });
      expect(validateEmail('user+tag@example.com')).toEqual({ valid: true });
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid').valid).toBe(false);
      expect(validateEmail('invalid@').valid).toBe(false);
      expect(validateEmail('@example.com').valid).toBe(false);
      expect(validateEmail('user@').valid).toBe(false);
      expect(validateEmail('').valid).toBe(false);
      expect(validateEmail(null).valid).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(validateEmail('  user@example.com  ')).toEqual({ valid: true });
    });
  });

  describe('validateNumberRange', () => {
    it('should validate numbers within range', () => {
      expect(validateNumberRange(5, 1, 10)).toEqual({ valid: true });
      expect(validateNumberRange(1, 1, 10)).toEqual({ valid: true });
      expect(validateNumberRange(10, 1, 10)).toEqual({ valid: true });
      expect(validateNumberRange('5', 1, 10)).toEqual({ valid: true });
    });

    it('should reject numbers outside range', () => {
      expect(validateNumberRange(0, 1, 10).valid).toBe(false);
      expect(validateNumberRange(11, 1, 10).valid).toBe(false);
      expect(validateNumberRange(-5, 0, 10).valid).toBe(false);
    });

    it('should validate with only min', () => {
      expect(validateNumberRange(5, 1)).toEqual({ valid: true });
      expect(validateNumberRange(0, 1).valid).toBe(false);
    });

    it('should validate with only max', () => {
      expect(validateNumberRange(5, undefined, 10)).toEqual({ valid: true });
      expect(validateNumberRange(11, undefined, 10).valid).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(validateNumberRange('abc', 1, 10).valid).toBe(false);
      expect(validateNumberRange(NaN, 1, 10).valid).toBe(false);
    });

    it('should use custom field name in error message', () => {
      const result = validateNumberRange(0, 1, 10, 'Age');
      expect(result.error).toContain('Age');
    });
  });

  describe('validateFileType', () => {
    it('should validate files with allowed MIME types', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFileType(file, ['image/jpeg', 'image/png'])).toEqual({ valid: true });
    });

    it('should validate files with allowed extensions', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFileType(file, ['.jpg', '.png'])).toEqual({ valid: true });
    });

    it('should validate files with wildcard MIME types', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFileType(file, ['image/*'])).toEqual({ valid: true });
    });

    it('should reject files with disallowed types', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFileType(file, ['image/jpeg', 'image/png']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should allow any type if no restrictions', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(validateFileType(file, [])).toEqual({ valid: true });
      expect(validateFileType(file, null)).toEqual({ valid: true });
    });

    it('should reject non-file values', () => {
      expect(validateFileType(null, ['image/*']).valid).toBe(false);
      expect(validateFileType(undefined, ['image/*']).valid).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should validate files within size limits', () => {
      const file = new File(['x'.repeat(1000)], 'test.txt');
      expect(validateFileSize(file, 2000)).toEqual({ valid: true });
      expect(validateFileSize(file, 2000, 500)).toEqual({ valid: true });
    });

    it('should reject files exceeding max size', () => {
      const file = new File(['x'.repeat(2000)], 'test.txt');
      const result = validateFileSize(file, 1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed');
    });

    it('should reject files below min size', () => {
      const file = new File(['x'.repeat(500)], 'test.txt');
      const result = validateFileSize(file, undefined, 1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should reject non-file values', () => {
      expect(validateFileSize(null, 1000).valid).toBe(false);
      expect(validateFileSize(undefined, 1000).valid).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should validate file with both type and size', () => {
      const file = new File(['x'.repeat(1000)], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFile(file, {
        allowedTypes: ['image/jpeg', 'image/png'],
        maxSize: 2000
      })).toEqual({ valid: true });
    });

    it('should reject file with invalid type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFile(file, {
        allowedTypes: ['image/jpeg'],
        maxSize: 2000
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject file with invalid size', () => {
      const file = new File(['x'.repeat(2000)], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFile(file, {
        allowedTypes: ['image/jpeg'],
        maxSize: 1000
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed');
    });
  });

  describe('validateForm', () => {
    it('should validate all fields in a form', () => {
      const fields = {
        username: 'john',
        email: 'john@example.com',
        age: 25
      };

      const rules = {
        username: { required: true },
        email: { required: true, email: true },
        age: { required: true, min: 18, max: 100 }
      };

      const results = validateForm(fields, rules);
      expect(results.username.valid).toBe(true);
      expect(results.email.valid).toBe(true);
      expect(results.age.valid).toBe(true);
    });

    it('should detect validation errors', () => {
      const fields = {
        username: '',
        email: 'invalid-email',
        age: 15
      };

      const rules = {
        username: { required: true },
        email: { required: true, email: true },
        age: { required: true, min: 18, max: 100 }
      };

      const results = validateForm(fields, rules);
      expect(results.username.valid).toBe(false);
      expect(results.email.valid).toBe(false);
      expect(results.age.valid).toBe(false);
    });

    it('should validate URL fields', () => {
      const fields = {
        website: 'https://example.com',
        tiktok: 'https://tiktok.com/@user',
        youtube: 'https://youtube.com/watch?v=123'
      };

      const rules = {
        website: { url: true },
        tiktok: { tiktokUrl: true },
        youtube: { youtubeUrl: true }
      };

      const results = validateForm(fields, rules);
      expect(results.website.valid).toBe(true);
      expect(results.tiktok.valid).toBe(true);
      expect(results.youtube.valid).toBe(true);
    });

    it('should support custom validation functions', () => {
      const fields = {
        password: 'short'
      };

      const rules = {
        password: {
          custom: (value) => {
            if (value.length < 8) {
              return { valid: false, error: 'Password must be at least 8 characters' };
            }
            return { valid: true };
          }
        }
      };

      const results = validateForm(fields, rules);
      expect(results.password.valid).toBe(false);
      expect(results.password.error).toContain('8 characters');
    });

    it('should skip validation for optional empty fields', () => {
      const fields = {
        username: 'john',
        nickname: ''
      };

      const rules = {
        username: { required: true },
        nickname: { min: 3 }  // Optional field
      };

      const results = validateForm(fields, rules);
      expect(results.username.valid).toBe(true);
      expect(results.nickname.valid).toBe(true);  // Empty but optional
    });
  });

  describe('isFormValid', () => {
    it('should return true when all validations pass', () => {
      const results = {
        username: { valid: true },
        email: { valid: true }
      };
      expect(isFormValid(results)).toBe(true);
    });

    it('should return false when any validation fails', () => {
      const results = {
        username: { valid: true },
        email: { valid: false, error: 'Invalid email' }
      };
      expect(isFormValid(results)).toBe(false);
    });
  });

  describe('getValidationErrors', () => {
    it('should extract error messages', () => {
      const results = {
        username: { valid: true },
        email: { valid: false, error: 'Invalid email' },
        age: { valid: false, error: 'Age must be at least 18' }
      };

      const errors = getValidationErrors(results);
      expect(errors).toEqual({
        email: 'Invalid email',
        age: 'Age must be at least 18'
      });
    });

    it('should return empty object when no errors', () => {
      const results = {
        username: { valid: true },
        email: { valid: true }
      };

      const errors = getValidationErrors(results);
      expect(errors).toEqual({});
    });
  });

  describe('createDebouncedValidator', () => {
    it('should create a debounced validator', async () => {
      vi.useFakeTimers();
      
      const mockValidator = vi.fn((value) => ({ valid: true }));
      const mockCallback = vi.fn();
      
      const debouncedValidator = createDebouncedValidator(mockValidator, 300);
      
      debouncedValidator('test1', mockCallback);
      debouncedValidator('test2', mockCallback);
      debouncedValidator('test3', mockCallback);
      
      expect(mockValidator).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(300);
      
      expect(mockValidator).toHaveBeenCalledTimes(1);
      expect(mockValidator).toHaveBeenCalledWith('test3');
      expect(mockCallback).toHaveBeenCalledWith({ valid: true });
      
      vi.useRealTimers();
    });
  });

  describe('attachValidator', () => {
    it('should attach validator to input element', () => {
      const input = document.createElement('input');
      const mockValidator = vi.fn(() => ({ valid: true }));
      const mockCallback = vi.fn();
      
      const cleanup = attachValidator(input, mockValidator, mockCallback, 0);
      
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      
      // Wait for debounce
      setTimeout(() => {
        expect(mockCallback).toHaveBeenCalled();
        cleanup();
      }, 10);
    });

    it('should return cleanup function', () => {
      const input = document.createElement('input');
      const mockValidator = vi.fn(() => ({ valid: true }));
      const mockCallback = vi.fn();
      
      const cleanup = attachValidator(input, mockValidator, mockCallback);
      expect(typeof cleanup).toBe('function');
      
      cleanup();
    });

    it('should handle invalid input element', () => {
      const cleanup = attachValidator(null, () => {}, () => {});
      expect(typeof cleanup).toBe('function');
    });
  });

  describe('ErrorMessages', () => {
    it('should generate error messages', () => {
      expect(ErrorMessages.required('Username')).toBe('Username is required');
      expect(ErrorMessages.invalidFormat('Email')).toBe('Invalid Email format');
      expect(ErrorMessages.tooShort('Password', 8)).toBe('Password must be at least 8 characters');
      expect(ErrorMessages.tooLong('Bio', 500)).toBe('Bio must not exceed 500 characters');
      expect(ErrorMessages.outOfRange('Age', 18, 100)).toBe('Age must be between 18 and 100');
      expect(ErrorMessages.invalidEmail()).toBe('Invalid email address');
      expect(ErrorMessages.invalidURL()).toBe('Invalid URL format');
      expect(ErrorMessages.invalidTikTokURL()).toBe('Invalid TikTok URL');
      expect(ErrorMessages.invalidYouTubeURL()).toBe('Invalid YouTube URL');
      expect(ErrorMessages.fileTooLarge(5 * 1024 * 1024)).toContain('5.00 MB');
      expect(ErrorMessages.fileTooSmall(1 * 1024 * 1024)).toContain('1.00 MB');
      expect(ErrorMessages.invalidFileType(['.jpg', '.png'])).toContain('.jpg, .png');
    });
  });
});
