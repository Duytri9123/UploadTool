# Utils Module

The `utils.js` module provides common utility functions used throughout the application.

## Features

### Performance Utilities

- **`debounce(func, wait)`** - Delays function execution until after wait milliseconds have elapsed since the last call
- **`throttle(func, wait)`** - Limits function execution to at most once per wait milliseconds

### Formatting Utilities

- **`formatBytes(bytes, decimals)`** - Formats bytes into human-readable file size (e.g., "1.5 MB")
- **`formatDuration(seconds, showHours)`** - Formats duration in seconds into time string (e.g., "1:23:45")
- **`formatDate(date, format)`** - Formats date into readable string with multiple format options
- **`formatRelativeTime(date)`** - Formats date as relative time (e.g., "2 hours ago")

### DOM Manipulation Utilities

- **`createElement(tag, attributes, children)`** - Creates DOM element with attributes and children
- **`addClass(element, ...classNames)`** - Adds CSS classes to element
- **`removeClass(element, ...classNames)`** - Removes CSS classes from element
- **`toggleClass(element, className, force)`** - Toggles CSS class on element
- **`hasClass(element, className)`** - Checks if element has CSS class
- **`attr(element, attr, value)`** - Gets or sets element attributes
- **`removeAttr(element, ...attributes)`** - Removes element attributes
- **`qs(selector, context)`** - Safely queries for single element
- **`qsa(selector, context)`** - Safely queries for multiple elements
- **`waitForElement(selector, timeout)`** - Waits for element to appear in DOM

### General Utilities

- **`generateId(prefix)`** - Generates unique ID with optional prefix
- **`deepClone(obj)`** - Deep clones object or array
- **`isEmpty(value)`** - Checks if value is empty

## Usage Examples

### Debounce Search Input

```javascript
import { debounce } from './modules/utils.js';

const searchInput = document.querySelector('#search');
const debouncedSearch = debounce((query) => {
  console.log('Searching for:', query);
  // Perform search API call
}, 300);

searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

### Throttle Scroll Event

```javascript
import { throttle } from './modules/utils.js';

const throttledScroll = throttle(() => {
  console.log('Scroll position:', window.scrollY);
  // Update UI based on scroll position
}, 100);

window.addEventListener('scroll', throttledScroll);
```

### Format File Size

```javascript
import { formatBytes } from './modules/utils.js';

const fileSize = 1536000; // bytes
console.log(formatBytes(fileSize)); // "1.5 MB"
```

### Format Duration

```javascript
import { formatDuration } from './modules/utils.js';

const videoDuration = 3665; // seconds
console.log(formatDuration(videoDuration)); // "1:01:05"
```

### Create DOM Elements

```javascript
import { createElement } from './modules/utils.js';

const button = createElement('button', 
  { 
    className: 'btn btn--primary',
    id: 'submit-btn',
    type: 'button'
  },
  ['Submit']
);

document.body.appendChild(button);
```

### Create Complex DOM Structure

```javascript
import { createElement } from './modules/utils.js';

const card = createElement('div',
  { className: 'card' },
  [
    createElement('div', { className: 'card__header' }, [
      createElement('h2', {}, ['Card Title'])
    ]),
    createElement('div', { className: 'card__body' }, [
      createElement('p', {}, ['Card content goes here'])
    ]),
    createElement('div', { className: 'card__footer' }, [
      createElement('button', { className: 'btn' }, ['Action'])
    ])
  ]
);
```

### DOM Class Manipulation

```javascript
import { addClass, removeClass, toggleClass, hasClass } from './modules/utils.js';

const button = document.querySelector('.btn');

// Add classes
addClass(button, 'active', 'highlighted');

// Remove classes
removeClass(button, 'highlighted');

// Toggle class
toggleClass(button, 'active');

// Check class
if (hasClass(button, 'active')) {
  console.log('Button is active');
}
```

### Query DOM Elements

```javascript
import { qs, qsa } from './modules/utils.js';

// Query single element
const header = qs('.header');

// Query multiple elements
const buttons = qsa('.btn');
buttons.forEach(btn => {
  console.log(btn.textContent);
});

// Query within context
const form = qs('#my-form');
const inputs = qsa('input', form);
```

### Wait for Element

```javascript
import { waitForElement } from './modules/utils.js';

waitForElement('.modal')
  .then(modal => {
    console.log('Modal appeared:', modal);
    // Initialize modal
  })
  .catch(error => {
    console.error('Modal did not appear:', error);
  });
```

### Format Dates

```javascript
import { formatDate, formatRelativeTime } from './modules/utils.js';

const now = new Date();

console.log(formatDate(now, 'date'));      // "2024-01-15"
console.log(formatDate(now, 'time'));      // "14:30:45"
console.log(formatDate(now, 'datetime'));  // "2024-01-15 14:30:45"

const pastDate = Date.now() - 3600000; // 1 hour ago
console.log(formatRelativeTime(pastDate)); // "1 hour ago"
```

### Deep Clone Objects

```javascript
import { deepClone } from './modules/utils.js';

const original = {
  name: 'John',
  settings: {
    theme: 'dark',
    notifications: true
  }
};

const cloned = deepClone(original);
cloned.settings.theme = 'light';

console.log(original.settings.theme); // "dark" (unchanged)
console.log(cloned.settings.theme);   // "light"
```

### Check Empty Values

```javascript
import { isEmpty } from './modules/utils.js';

console.log(isEmpty(''));           // true
console.log(isEmpty([]));           // true
console.log(isEmpty({}));           // true
console.log(isEmpty(null));         // true
console.log(isEmpty('hello'));      // false
console.log(isEmpty([1, 2]));       // false
console.log(isEmpty({ a: 1 }));     // false
```

## Requirements Satisfied

This module satisfies the following requirements from the spec:

- **Requirement 5.6**: Module with helper functions (debounce, throttle, formatBytes, formatDuration)
- **Requirement 13.4**: Debounce search inputs and scroll events
- **Requirement 13.5**: Throttle resize events

## Testing

Unit tests are provided in `utils.test.js`. The tests cover:

- Performance utilities (debounce, throttle)
- Formatting utilities (formatBytes, formatDuration, formatDate, formatRelativeTime)
- DOM manipulation utilities (createElement, addClass, removeClass, toggleClass, hasClass, attr, removeAttr, qs, qsa)
- General utilities (generateId, deepClone, isEmpty)

To run tests (once Vitest is configured):

```bash
npm test -- utils.test.js
```

## Notes

- All DOM manipulation functions include null/undefined checks and fail gracefully
- Formatting functions handle edge cases (null, undefined, negative values)
- Performance utilities preserve function context (`this`) and arguments
- All functions are pure and have no side effects (except DOM manipulation functions)
- Functions are well-documented with JSDoc comments
