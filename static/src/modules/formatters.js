/**
 * Formatters Module
 * 
 * This module provides advanced formatting functions with internationalization support:
 * - Date formatting with locale support
 * - Number formatting with locale support
 * - Currency formatting
 * - File size formatting
 * - Duration formatting
 * - Percentage formatting
 * 
 * @module formatters
 */

/**
 * Default locale for formatting operations.
 * Can be overridden by passing locale parameter to individual functions.
 */
let defaultLocale = 'en-US';

/**
 * Sets the default locale for all formatting operations.
 * 
 * @param {string} locale - BCP 47 language tag (e.g., 'en-US', 'vi-VN', 'fr-FR')
 * 
 * @example
 * setDefaultLocale('vi-VN');
 * formatNumber(1234.56); // "1.234,56" in Vietnamese locale
 */
export function setDefaultLocale(locale) {
  defaultLocale = locale;
}

/**
 * Gets the current default locale.
 * 
 * @returns {string} Current default locale
 */
export function getDefaultLocale() {
  return defaultLocale;
}

/**
 * Formats a number with locale-specific formatting.
 * 
 * @param {number} value - Number to format
 * @param {Object} [options={}] - Formatting options
 * @param {string} [options.locale] - Locale to use (defaults to defaultLocale)
 * @param {number} [options.minimumFractionDigits] - Minimum decimal places
 * @param {number} [options.maximumFractionDigits] - Maximum decimal places
 * @param {boolean} [options.useGrouping=true] - Whether to use grouping separators
 * @returns {string} Formatted number
 * 
 * @example
 * formatNumber(1234.56);                           // "1,234.56" (en-US)
 * formatNumber(1234.56, { locale: 'vi-VN' });      // "1.234,56"
 * formatNumber(1234.56, { locale: 'de-DE' });      // "1.234,56"
 * formatNumber(1234.5, { minimumFractionDigits: 2 }); // "1,234.50"
 */
export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const locale = options.locale || defaultLocale;
  
  const formatOptions = {
    useGrouping: options.useGrouping !== false,
  };

  if (options.minimumFractionDigits !== undefined) {
    formatOptions.minimumFractionDigits = options.minimumFractionDigits;
  }
  
  if (options.maximumFractionDigits !== undefined) {
    formatOptions.maximumFractionDigits = options.maximumFractionDigits;
  }

  try {
    return new Intl.NumberFormat(locale, formatOptions).format(value);
  } catch (error) {
    console.warn(`Error formatting number with locale ${locale}:`, error);
    return String(value);
  }
}

/**
 * Formats a number as currency with locale-specific formatting.
 * 
 * @param {number} value - Amount to format
 * @param {Object} [options={}] - Formatting options
 * @param {string} [options.currency='USD'] - Currency code (ISO 4217)
 * @param {string} [options.locale] - Locale to use (defaults to defaultLocale)
 * @param {string} [options.display='symbol'] - How to display currency: 'symbol', 'code', 'name'
 * @returns {string} Formatted currency
 * 
 * @example
 * formatCurrency(1234.56);                                    // "$1,234.56"
 * formatCurrency(1234.56, { currency: 'VND', locale: 'vi-VN' }); // "1.235 ₫"
 * formatCurrency(1234.56, { currency: 'EUR', locale: 'de-DE' }); // "1.234,56 €"
 * formatCurrency(1234.56, { display: 'code' });               // "USD 1,234.56"
 */
export function formatCurrency(value, options = {}) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const locale = options.locale || defaultLocale;
  const currency = options.currency || 'USD';
  const display = options.display || 'symbol';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      currencyDisplay: display,
    }).format(value);
  } catch (error) {
    console.warn(`Error formatting currency with locale ${locale}:`, error);
    return `${currency} ${value}`;
  }
}

/**
 * Formats a number as a percentage.
 * 
 * @param {number} value - Value to format (0.5 = 50%)
 * @param {Object} [options={}] - Formatting options
 * @param {string} [options.locale] - Locale to use (defaults to defaultLocale)
 * @param {number} [options.minimumFractionDigits=0] - Minimum decimal places
 * @param {number} [options.maximumFractionDigits=2] - Maximum decimal places
 * @returns {string} Formatted percentage
 * 
 * @example
 * formatPercentage(0.1234);                              // "12.34%"
 * formatPercentage(0.5);                                 // "50%"
 * formatPercentage(0.1234, { minimumFractionDigits: 2 }); // "12.34%"
 * formatPercentage(0.1234, { maximumFractionDigits: 0 }); // "12%"
 */
export function formatPercentage(value, options = {}) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const locale = options.locale || defaultLocale;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
    }).format(value);
  } catch (error) {
    console.warn(`Error formatting percentage with locale ${locale}:`, error);
    return `${(value * 100).toFixed(2)}%`;
  }
}

/**
 * Formats bytes into human-readable file size with locale support.
 * 
 * @param {number} bytes - Number of bytes
 * @param {Object} [options={}] - Formatting options
 * @param {string} [options.locale] - Locale to use (defaults to defaultLocale)
 * @param {number} [options.decimals=2] - Number of decimal places
 * @param {boolean} [options.binary=false] - Use binary (1024) vs decimal (1000) units
 * @returns {string} Formatted file size
 * 
 * @example
 * formatFileSize(1024);                        // "1 KB"
 * formatFileSize(1536);                        // "1.5 KB"
 * formatFileSize(1048576);                     // "1 MB"
 * formatFileSize(1024, { binary: true });      // "1 KiB"
 * formatFileSize(1536, { locale: 'vi-VN' });   // "1,5 KB"
 */
export function formatFileSize(bytes, options = {}) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || bytes < 0 || isNaN(bytes)) return 'N/A';

  const locale = options.locale || defaultLocale;
  const decimals = options.decimals ?? 2;
  const binary = options.binary || false;

  const k = binary ? 1024 : 1000;
  const sizes = binary
    ? ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    : ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  try {
    const formattedValue = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(value);

    return `${formattedValue} ${sizes[i]}`;
  } catch (error) {
    console.warn(`Error formatting file size with locale ${locale}:`, error);
    return `${value.toFixed(decimals)} ${sizes[i]}`;
  }
}

/**
 * Formats duration in seconds into human-readable time with locale support.
 * 
 * @param {number} seconds - Duration in seconds
 * @param {Object} [options={}] - Formatting options
 * @param {string} [options.format='auto'] - Format: 'auto', 'short', 'long', 'clock'
 * @param {string} [options.locale] - Locale to use (defaults to defaultLocale)
 * @returns {string} Formatted duration
 * 
 * @example
 * formatDuration(65);                           // "1:05"
 * formatDuration(3665);                         // "1:01:05"
 * formatDuration(65, { format: 'short' });      // "1m 5s"
 * formatDuration(65, { format: 'long' });       // "1 minute 5 seconds"
 * formatDuration(3665, { format: 'long' });     // "1 hour 1 minute 5 seconds"
 */
export function formatDuration(seconds, options = {}) {
  if (!seconds || seconds < 0 || isNaN(seconds)) return '0:00';

  const format = options.format || 'auto';
  const locale = options.locale || defaultLocale;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (format === 'clock' || format === 'auto') {
    const pad = (num) => String(num).padStart(2, '0');
    
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${minutes}:${pad(secs)}`;
  }

  if (format === 'short') {
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
  }

  if (format === 'long') {
    const parts = [];
    
    if (hours > 0) {
      const unit = hours === 1 ? 'hour' : 'hours';
      parts.push(`${hours} ${unit}`);
    }
    
    if (minutes > 0) {
      const unit = minutes === 1 ? 'minute' : 'minutes';
      parts.push(`${minutes} ${unit}`);
    }
    
    if (secs > 0 || parts.length === 0) {
      const unit = secs === 1 ? 'second' : 'seconds';
      parts.push(`${secs} ${unit}`);
    }
    
    return parts.join(' ');
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Formats a date with locale-specific formatting.
 * 
 * @param {Date|number|string} date - Date to format
 * @param {Object} [options={}] - Formatting options
 * @param {string} [options.locale] - Locale to use (defaults to defaultLocale)
 * @param {string} [options.dateStyle] - Date style: 'full', 'long', 'medium', 'short'
 * @param {string} [options.timeStyle] - Time style: 'full', 'long', 'medium', 'short'
 * @param {string} [options.format] - Custom format: 'date', 'time', 'datetime', 'relative'
 * @returns {string} Formatted date
 * 
 * @example
 * formatDate(new Date());                                    // "1/15/2024, 2:30:45 PM"
 * formatDate(new Date(), { dateStyle: 'full' });             // "Monday, January 15, 2024"
 * formatDate(new Date(), { format: 'date' });                // "1/15/2024"
 * formatDate(new Date(), { format: 'time' });                // "2:30:45 PM"
 * formatDate(new Date(), { locale: 'vi-VN' });               // "15/1/2024 14:30:45"
 * formatDate(Date.now() - 60000, { format: 'relative' });    // "1 minute ago"
 */
export function formatDate(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return 'Invalid Date';

  const locale = options.locale || defaultLocale;
  const format = options.format;

  // Handle relative time format
  if (format === 'relative') {
    return formatRelativeTime(d, { locale });
  }

  // Handle simple formats
  if (format === 'date') {
    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).format(d);
    } catch (error) {
      console.warn(`Error formatting date with locale ${locale}:`, error);
      return d.toLocaleDateString();
    }
  }

  if (format === 'time') {
    try {
      return new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      }).format(d);
    } catch (error) {
      console.warn(`Error formatting time with locale ${locale}:`, error);
      return d.toLocaleTimeString();
    }
  }

  if (format === 'datetime') {
    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      }).format(d);
    } catch (error) {
      console.warn(`Error formatting datetime with locale ${locale}:`, error);
      return d.toLocaleString();
    }
  }

  // Use dateStyle and timeStyle if provided
  const formatOptions = {};
  
  if (options.dateStyle) {
    formatOptions.dateStyle = options.dateStyle;
  }
  
  if (options.timeStyle) {
    formatOptions.timeStyle = options.timeStyle;
  }

  // Default to datetime if no specific options
  if (Object.keys(formatOptions).length === 0) {
    formatOptions.dateStyle = 'short';
    formatOptions.timeStyle = 'medium';
  }

  try {
    return new Intl.DateTimeFormat(locale, formatOptions).format(d);
  } catch (error) {
    console.warn(`Error formatting date with locale ${locale}:`, error);
    return d.toLocaleString();
  }
}

/**
 * Formats a date as relative time with locale support.
 * 
 * @param {Date|number} date - Date to format
 * @param {Object} [options={}] - Formatting options
 * @param {string} [options.locale] - Locale to use (defaults to defaultLocale)
 * @param {string} [options.style='long'] - Style: 'long', 'short', 'narrow'
 * @returns {string} Relative time string
 * 
 * @example
 * formatRelativeTime(Date.now() - 1000);                    // "1 second ago"
 * formatRelativeTime(Date.now() - 60000);                   // "1 minute ago"
 * formatRelativeTime(Date.now() - 3600000);                 // "1 hour ago"
 * formatRelativeTime(Date.now() - 60000, { style: 'short' }); // "1 min. ago"
 */
export function formatRelativeTime(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);

  const locale = options.locale || defaultLocale;
  const style = options.style || 'long';

  // For very recent times, return "just now"
  if (diffSecs < 10) return 'just now';

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style });

    // Seconds
    if (diffSecs < 60) {
      return rtf.format(-diffSecs, 'second');
    }

    // Minutes
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) {
      return rtf.format(-diffMins, 'minute');
    }

    // Hours
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return rtf.format(-diffHours, 'hour');
    }

    // Days
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
      return rtf.format(-diffDays, 'day');
    }

    // Months
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return rtf.format(-diffMonths, 'month');
    }

    // Years
    const diffYears = Math.floor(diffMonths / 12);
    return rtf.format(-diffYears, 'year');
  } catch (error) {
    console.warn(`Error formatting relative time with locale ${locale}:`, error);
    
    // Fallback to simple English format
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
}

/**
 * Formats a list of items with locale-specific formatting.
 * 
 * @param {Array<string>} items - Items to format
 * @param {Object} [options={}] - Formatting options
 * @param {string} [options.locale] - Locale to use (defaults to defaultLocale)
 * @param {string} [options.type='conjunction'] - Type: 'conjunction' (and), 'disjunction' (or)
 * @param {string} [options.style='long'] - Style: 'long', 'short', 'narrow'
 * @returns {string} Formatted list
 * 
 * @example
 * formatList(['apple', 'banana', 'orange']);                    // "apple, banana, and orange"
 * formatList(['apple', 'banana'], { type: 'disjunction' });     // "apple or banana"
 * formatList(['apple', 'banana', 'orange'], { style: 'short' }); // "apple, banana, & orange"
 */
export function formatList(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  const locale = options.locale || defaultLocale;
  const type = options.type || 'conjunction';
  const style = options.style || 'long';

  try {
    const formatter = new Intl.ListFormat(locale, { type, style });
    return formatter.format(items);
  } catch (error) {
    console.warn(`Error formatting list with locale ${locale}:`, error);
    
    // Fallback to simple comma-separated list
    if (items.length === 2) {
      return items.join(type === 'disjunction' ? ' or ' : ' and ');
    }
    
    const last = items[items.length - 1];
    const rest = items.slice(0, -1);
    const separator = type === 'disjunction' ? ', or ' : ', and ';
    return rest.join(', ') + separator + last;
  }
}
