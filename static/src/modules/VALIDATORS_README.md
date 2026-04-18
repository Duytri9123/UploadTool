# Validators Module

The validators module provides comprehensive validation functions for forms, URLs, and file uploads with support for real-time validation using debouncing.

## Features

- **URL Validation**: Validate general URLs, TikTok URLs, and YouTube URLs
- **Form Validation**: Required fields, email, number ranges
- **File Validation**: File type and size validation
- **Real-time Validation**: Debounced validation for better UX
- **Error Messages**: User-friendly error message generators
- **Form-level Validation**: Validate entire forms with multiple fields

## Installation

```javascript
import {
  validateURL,
  validateTikTokURL,
  validateYouTubeURL,
  validateRequired,
  validateEmail,
  validateNumberRange,
  validateFile,
  validateForm,
  attachValidator,
  ErrorMessages
} from './modules/validators.js';
```

## URL Validation

### validateURL(url)

Validates if a string is a valid HTTP/HTTPS URL.

```javascript
const result = validateURL('https://example.com');
// { valid: true }

const result = validateURL('not a url');
// { valid: false, error: 'Invalid URL format' }
```

### validateTikTokURL(url)

Validates if a URL is from TikTok.

```javascript
const result = validateTikTokURL('https://www.tiktok.com/@user/video/123');
// { valid: true }

const result = validateTikTokURL('https://youtube.com/watch?v=123');
// { valid: false, error: 'URL must be from TikTok (tiktok.com)' }
```

### validateYouTubeURL(url)

Validates if a URL is from YouTube.

```javascript
const result = validateYouTubeURL('https://www.youtube.com/watch?v=abc123');
// { valid: true }

const result = validateYouTubeURL('https://youtu.be/abc123');
// { valid: true }
```

## Form Field Validation

### validateRequired(value, fieldName)

Validates that a field is not empty.

```javascript
const result = validateRequired('hello', 'Username');
// { valid: true }

const result = validateRequired('', 'Username');
// { valid: false, error: 'Username is required' }
```

### validateEmail(email)

Validates email format.

```javascript
const result = validateEmail('user@example.com');
// { valid: true }

const result = validateEmail('invalid-email');
// { valid: false, error: 'Invalid email format' }
```

### validateNumberRange(value, min, max, fieldName)

Validates that a number is within a specified range.

```javascript
const result = validateNumberRange(25, 18, 100, 'Age');
// { valid: true }

const result = validateNumberRange(15, 18, 100, 'Age');
// { valid: false, error: 'Age must be between 18 and 100' }

// Only min
const result = validateNumberRange(5, 1);
// { valid: true }

// Only max
const result = validateNumberRange(5, undefined, 10);
// { valid: true }
```

## File Validation

### validateFileType(file, allowedTypes)

Validates file type using MIME types or extensions.

```javascript
const file = document.querySelector('input[type="file"]').files[0];

// Using MIME types
const result = validateFileType(file, ['image/jpeg', 'image/png']);

// Using extensions
const result = validateFileType(file, ['.jpg', '.png', '.gif']);

// Using wildcards
const result = validateFileType(file, ['image/*', 'video/*']);
```

### validateFileSize(file, maxSize, minSize)

Validates file size in bytes.

```javascript
const file = document.querySelector('input[type="file"]').files[0];

// Max 5MB
const result = validateFileSize(file, 5 * 1024 * 1024);

// Between 1MB and 10MB
const result = validateFileSize(file, 10 * 1024 * 1024, 1 * 1024 * 1024);
```

### validateFile(file, options)

Combines type and size validation.

```javascript
const file = document.querySelector('input[type="file"]').files[0];

const result = validateFile(file, {
  allowedTypes: ['image/jpeg', 'image/png', '.gif'],
  maxSize: 5 * 1024 * 1024,  // 5MB
  minSize: 100 * 1024         // 100KB
});
```

## Form Validation

### validateForm(fields, rules)

Validates multiple fields at once.

```javascript
const fields = {
  username: 'john',
  email: 'john@example.com',
  age: 25,
  website: 'https://example.com'
};

const rules = {
  username: { required: true },
  email: { required: true, email: true },
  age: { required: true, min: 18, max: 100 },
  website: { url: true }
};

const results = validateForm(fields, rules);
// {
//   username: { valid: true },
//   email: { valid: true },
//   age: { valid: true },
//   website: { valid: true }
// }
```

### Supported Rule Types

- `required`: Field must not be empty
- `email`: Must be valid email format
- `url`: Must be valid URL
- `tiktokUrl`: Must be valid TikTok URL
- `youtubeUrl`: Must be valid YouTube URL
- `min`: Minimum value for numbers
- `max`: Maximum value for numbers
- `custom`: Custom validation function

### Custom Validation

```javascript
const rules = {
  password: {
    required: true,
    custom: (value, fieldName) => {
      if (value.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters' };
      }
      if (!/[A-Z]/.test(value)) {
        return { valid: false, error: 'Password must contain uppercase letter' };
      }
      return { valid: true };
    }
  }
};
```

### isFormValid(validationResults)

Checks if all validations passed.

```javascript
const results = validateForm(fields, rules);

if (isFormValid(results)) {
  console.log('Form is valid!');
  submitForm();
} else {
  console.log('Form has errors');
}
```

### getValidationErrors(validationResults)

Extracts error messages from validation results.

```javascript
const results = validateForm(fields, rules);
const errors = getValidationErrors(results);
// { email: 'Invalid email format', age: 'Age must be at least 18' }

// Display errors
Object.entries(errors).forEach(([field, error]) => {
  showError(field, error);
});
```

## Real-time Validation

### attachValidator(input, validatorFn, onValidate, delay)

Attaches debounced validation to an input element.

```javascript
const urlInput = document.querySelector('#url-input');
const errorElement = document.querySelector('#url-error');

const cleanup = attachValidator(
  urlInput,
  validateURL,
  (result) => {
    if (!result.valid) {
      errorElement.textContent = result.error;
      errorElement.style.display = 'block';
      urlInput.classList.add('input--error');
    } else {
      errorElement.style.display = 'none';
      urlInput.classList.remove('input--error');
    }
  },
  300  // 300ms debounce delay
);

// Later, to remove the validator:
cleanup();
```

### createDebouncedValidator(validatorFn, delay)

Creates a debounced validator function.

```javascript
const debouncedEmailValidator = createDebouncedValidator(validateEmail, 300);

emailInput.addEventListener('input', (e) => {
  debouncedEmailValidator(e.target.value, (result) => {
    updateUI(result);
  });
});
```

## Error Messages

The `ErrorMessages` object provides helper functions for generating consistent error messages.

```javascript
ErrorMessages.required('Username');
// "Username is required"

ErrorMessages.invalidFormat('Email');
// "Invalid Email format"

ErrorMessages.tooShort('Password', 8);
// "Password must be at least 8 characters"

ErrorMessages.tooLong('Bio', 500);
// "Bio must not exceed 500 characters"

ErrorMessages.outOfRange('Age', 18, 100);
// "Age must be between 18 and 100"

ErrorMessages.invalidEmail();
// "Invalid email address"

ErrorMessages.invalidURL();
// "Invalid URL format"

ErrorMessages.invalidTikTokURL();
// "Invalid TikTok URL"

ErrorMessages.invalidYouTubeURL();
// "Invalid YouTube URL"

ErrorMessages.fileTooLarge(5 * 1024 * 1024);
// "File size must not exceed 5.00 MB"

ErrorMessages.fileTooSmall(1 * 1024 * 1024);
// "File size must be at least 1.00 MB"

ErrorMessages.invalidFileType(['.jpg', '.png']);
// "File type not allowed. Allowed types: .jpg, .png"
```

## Complete Example

```javascript
import {
  validateForm,
  isFormValid,
  getValidationErrors,
  attachValidator,
  validateURL
} from './modules/validators.js';

// Form validation on submit
const form = document.querySelector('#video-form');
const urlInput = document.querySelector('#url-input');
const submitButton = document.querySelector('#submit-button');

// Real-time URL validation
attachValidator(
  urlInput,
  validateURL,
  (result) => {
    const errorElement = urlInput.nextElementSibling;
    if (!result.valid) {
      errorElement.textContent = result.error;
      errorElement.style.display = 'block';
      urlInput.classList.add('input--error');
      submitButton.disabled = true;
    } else {
      errorElement.style.display = 'none';
      urlInput.classList.remove('input--error');
      submitButton.disabled = false;
    }
  },
  300
);

// Form submission
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const fields = {
    url: urlInput.value,
    quality: document.querySelector('#quality').value,
    format: document.querySelector('#format').value
  };
  
  const rules = {
    url: { required: true, url: true },
    quality: { required: true },
    format: { required: true }
  };
  
  const results = validateForm(fields, rules);
  
  if (isFormValid(results)) {
    // Submit form
    submitForm(fields);
  } else {
    // Show errors
    const errors = getValidationErrors(results);
    Object.entries(errors).forEach(([field, error]) => {
      showFieldError(field, error);
    });
  }
});
```

## Validation Result Object

All validation functions return a `ValidationResult` object:

```typescript
{
  valid: boolean;      // Whether validation passed
  error?: string;      // Error message if validation failed
}
```

## Best Practices

1. **Use debouncing for real-time validation** - Prevents excessive validation calls while user is typing
2. **Validate on both client and server** - Client-side validation is for UX, server-side is for security
3. **Provide clear error messages** - Tell users exactly what's wrong and how to fix it
4. **Clear errors when user starts editing** - Don't show stale error messages
5. **Disable submit button when form is invalid** - Prevent invalid form submissions
6. **Use appropriate debounce delays** - 300ms is a good default for text inputs

## Testing

The validators module includes comprehensive unit tests. Run tests with:

```bash
npm run test:run -- validators.test.js
```

## Requirements Satisfied

This module satisfies the following requirements from the spec:

- **5.7**: Module `validators.js` with validation logic
- **9.1**: Validate all form inputs before submit
- **9.3**: Validate URL format real-time
- **9.5**: Validate required fields, URL format, number ranges, file types, file sizes
- **9.8**: Implement debounced validation for text inputs (300ms delay)
