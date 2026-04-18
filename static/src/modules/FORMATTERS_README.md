# Formatters Module

The formatters module provides advanced formatting functions with internationalization (i18n) support for displaying data in user-friendly formats across different locales.

## Features

- **Number Formatting**: Format numbers with locale-specific separators and decimal points
- **Currency Formatting**: Format monetary values with proper currency symbols and locale conventions
- **Percentage Formatting**: Format decimal values as percentages
- **File Size Formatting**: Convert bytes to human-readable file sizes (KB, MB, GB, etc.)
- **Duration Formatting**: Format time durations in multiple formats (clock, short, long)
- **Date Formatting**: Format dates with locale-specific conventions
- **Relative Time Formatting**: Display dates as relative time (e.g., "2 hours ago")
- **List Formatting**: Format arrays as human-readable lists with proper conjunctions

## Installation

```javascript
import {
  setDefaultLocale,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  formatDuration,
  formatDate,
  formatRelativeTime,
  formatList
} from './modules/formatters.js';
```

## Usage

### Setting Default Locale

```javascript
// Set default locale for all formatting operations
setDefaultLocale('vi-VN');

// Get current default locale
const locale = getDefaultLocale(); // 'vi-VN'
```

### Number Formatting

```javascript
// Basic number formatting
formatNumber(1234.56); // "1,234.56" (en-US)

// With specific locale
formatNumber(1234.56, { locale: 'vi-VN' }); // "1.234,56"
formatNumber(1234.56, { locale: 'de-DE' }); // "1.234,56"

// Control decimal places
formatNumber(1234.5, { minimumFractionDigits: 2 }); // "1,234.50"
formatNumber(1234.5678, { maximumFractionDigits: 2 }); // "1,234.57"

// Disable grouping separators
formatNumber(1234.56, { useGrouping: false }); // "1234.56"
```

### Currency Formatting

```javascript
// Default USD currency
formatCurrency(1234.56); // "$1,234.56"

// Different currencies
formatCurrency(1234.56, { currency: 'EUR', locale: 'de-DE' }); // "1.234,56 €"
formatCurrency(1234.56, { currency: 'VND', locale: 'vi-VN' }); // "1.235 ₫"

// Display modes
formatCurrency(1234.56, { display: 'symbol' }); // "$1,234.56"
formatCurrency(1234.56, { display: 'code' }); // "USD 1,234.56"
formatCurrency(1234.56, { display: 'name' }); // "1,234.56 US dollars"
```

### Percentage Formatting

```javascript
// Basic percentage
formatPercentage(0.1234); // "12.34%"
formatPercentage(0.5); // "50%"

// Control decimal places
formatPercentage(0.1234, { minimumFractionDigits: 2 }); // "12.34%"
formatPercentage(0.1234, { maximumFractionDigits: 0 }); // "12%"

// With locale
formatPercentage(0.1234, { locale: 'de-DE' }); // "12,34 %"
```

### File Size Formatting

```javascript
// Decimal units (default)
formatFileSize(1024); // "1.02 KB"
formatFileSize(1048576); // "1.05 MB"
formatFileSize(1073741824); // "1.07 GB"

// Binary units (1024-based)
formatFileSize(1024, { binary: true }); // "1 KiB"
formatFileSize(1048576, { binary: true }); // "1 MiB"

// Control decimal places
formatFileSize(1536, { decimals: 0 }); // "2 KB"
formatFileSize(1536, { decimals: 3 }); // "1.536 KB"

// With locale
formatFileSize(1536, { locale: 'de-DE' }); // "1,54 KB"
```

### Duration Formatting

```javascript
// Clock format (default)
formatDuration(65); // "1:05"
formatDuration(3665); // "1:01:05"

// Short format
formatDuration(65, { format: 'short' }); // "1m 5s"
formatDuration(3665, { format: 'short' }); // "1h 1m 5s"

// Long format
formatDuration(65, { format: 'long' }); // "1 minute 5 seconds"
formatDuration(3665, { format: 'long' }); // "1 hour 1 minute 5 seconds"
```

### Date Formatting

```javascript
const date = new Date('2024-01-15T14:30:45');

// Default format
formatDate(date); // "1/15/24, 2:30:45 PM" (en-US)

// Date only
formatDate(date, { format: 'date' }); // "1/15/2024"

// Time only
formatDate(date, { format: 'time' }); // "2:30:45 PM"

// Date and time
formatDate(date, { format: 'datetime' }); // "1/15/2024, 2:30:45 PM"

// With date style
formatDate(date, { dateStyle: 'full' }); // "Monday, January 15, 2024"
formatDate(date, { dateStyle: 'long' }); // "January 15, 2024"
formatDate(date, { dateStyle: 'medium' }); // "Jan 15, 2024"
formatDate(date, { dateStyle: 'short' }); // "1/15/24"

// With locale
formatDate(date, { locale: 'vi-VN', format: 'date' }); // "15/1/2024"
formatDate(date, { locale: 'de-DE', format: 'date' }); // "15.1.2024"
```

### Relative Time Formatting

```javascript
// Recent times
formatRelativeTime(Date.now() - 5000); // "just now"
formatRelativeTime(Date.now() - 30000); // "30 seconds ago"
formatRelativeTime(Date.now() - 120000); // "2 minutes ago"
formatRelativeTime(Date.now() - 7200000); // "2 hours ago"
formatRelativeTime(Date.now() - 172800000); // "2 days ago"

// Different styles
formatRelativeTime(Date.now() - 60000, { style: 'long' }); // "1 minute ago"
formatRelativeTime(Date.now() - 60000, { style: 'short' }); // "1 min. ago"
formatRelativeTime(Date.now() - 60000, { style: 'narrow' }); // "1m ago"

// With locale
formatRelativeTime(Date.now() - 60000, { locale: 'de-DE' }); // "vor 1 Minute"
```

### List Formatting

```javascript
// Conjunction (and)
formatList(['apple', 'banana', 'orange']); // "apple, banana, and orange"

// Disjunction (or)
formatList(['apple', 'banana'], { type: 'disjunction' }); // "apple or banana"

// Different styles
formatList(['apple', 'banana', 'orange'], { style: 'long' }); // "apple, banana, and orange"
formatList(['apple', 'banana', 'orange'], { style: 'short' }); // "apple, banana, & orange"
formatList(['apple', 'banana', 'orange'], { style: 'narrow' }); // "apple, banana, orange"

// With locale
formatList(['apple', 'banana'], { locale: 'de-DE' }); // "apple und banana"
```

## Supported Locales

The formatters module uses the browser's built-in `Intl` API, which supports a wide range of locales. Common locales include:

- `en-US` - English (United States)
- `en-GB` - English (United Kingdom)
- `vi-VN` - Vietnamese (Vietnam)
- `de-DE` - German (Germany)
- `fr-FR` - French (France)
- `es-ES` - Spanish (Spain)
- `ja-JP` - Japanese (Japan)
- `zh-CN` - Chinese (China)
- `ko-KR` - Korean (Korea)

## Error Handling

All formatters include error handling and will:
1. Return `'N/A'` for invalid numeric inputs (null, undefined, NaN)
2. Return `'Invalid Date'` for invalid date inputs
3. Fall back to simple formatting if locale is not supported
4. Log warnings to console when errors occur

## Browser Compatibility

The formatters module uses the `Intl` API which is supported in all modern browsers:
- Chrome 24+
- Firefox 29+
- Safari 10+
- Edge 12+

For older browsers, consider using a polyfill like `@formatjs/intl`.

## Integration with Existing Code

This module extends the basic formatters in `utils.js`:
- `formatBytes()` in utils.js → `formatFileSize()` with i18n support
- `formatDuration()` in utils.js → `formatDuration()` with multiple formats
- `formatDate()` in utils.js → `formatDate()` with locale support

You can gradually migrate from utils.js formatters to this module for enhanced i18n support.

## Examples

### Multi-language Application

```javascript
// Detect user's preferred language
const userLocale = navigator.language || 'en-US';
setDefaultLocale(userLocale);

// All formatters will now use the user's locale
const price = formatCurrency(1234.56, { currency: 'USD' });
const size = formatFileSize(1048576);
const date = formatDate(new Date());
```

### Vietnamese Locale Example

```javascript
setDefaultLocale('vi-VN');

formatNumber(1234.56); // "1.234,56"
formatCurrency(1234.56, { currency: 'VND' }); // "1.235 ₫"
formatFileSize(1048576); // "1,05 MB"
formatDate(new Date('2024-01-15')); // "15/1/2024"
formatList(['táo', 'chuối', 'cam']); // "táo, chuối và cam"
```

## Testing

Run the test suite:

```bash
npm test -- formatters.test.js
```

The test suite includes 48 tests covering:
- Locale management
- Number formatting with various options
- Currency formatting with different currencies
- Percentage formatting
- File size formatting (decimal and binary)
- Duration formatting (clock, short, long)
- Date formatting with various styles
- Relative time formatting
- List formatting with conjunctions and disjunctions
- Error handling for invalid inputs

## Performance Considerations

- Formatters use the native `Intl` API which is highly optimized
- Consider caching formatter instances for repeated use with the same options
- The `Intl` API is lazy-loaded by browsers, so first use may be slightly slower

## Future Enhancements

Potential improvements for future versions:
- Custom format patterns (e.g., "YYYY-MM-DD")
- Timezone support for date formatting
- Compact number notation (e.g., "1.2K", "1.5M")
- Unit formatting (e.g., "5 meters", "10 kilograms")
- Ordinal number formatting (e.g., "1st", "2nd", "3rd")
