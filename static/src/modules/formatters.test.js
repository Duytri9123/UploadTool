/**
 * Unit tests for formatters module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setDefaultLocale,
  getDefaultLocale,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  formatDuration,
  formatDate,
  formatRelativeTime,
  formatList,
} from './formatters.js';

describe('Locale Management', () => {
  beforeEach(() => {
    setDefaultLocale('en-US');
  });

  it('should set and get default locale', () => {
    setDefaultLocale('vi-VN');
    expect(getDefaultLocale()).toBe('vi-VN');
  });

  it('should start with en-US as default', () => {
    expect(getDefaultLocale()).toBe('en-US');
  });
});

describe('formatNumber', () => {
  beforeEach(() => {
    setDefaultLocale('en-US');
  });

  it('should format numbers with default locale', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('should format numbers with different locales', () => {
    expect(formatNumber(1234.56, { locale: 'de-DE' })).toBe('1.234,56');
    expect(formatNumber(1234.56, { locale: 'fr-FR' })).toMatch(/1[\s\u202F]234,56/); // French uses narrow no-break space
  });

  it('should respect minimum fraction digits', () => {
    expect(formatNumber(1234, { minimumFractionDigits: 2 })).toBe('1,234.00');
    expect(formatNumber(1234.5, { minimumFractionDigits: 2 })).toBe('1,234.50');
  });

  it('should respect maximum fraction digits', () => {
    expect(formatNumber(1234.5678, { maximumFractionDigits: 2 })).toBe('1,234.57');
    expect(formatNumber(1234.5678, { maximumFractionDigits: 0 })).toBe('1,235');
  });

  it('should handle grouping option', () => {
    expect(formatNumber(1234.56, { useGrouping: false })).toBe('1234.56');
    expect(formatNumber(1234.56, { useGrouping: true })).toBe('1,234.56');
  });

  it('should handle invalid input', () => {
    expect(formatNumber(null)).toBe('N/A');
    expect(formatNumber(undefined)).toBe('N/A');
    expect(formatNumber(NaN)).toBe('N/A');
  });
});

describe('formatCurrency', () => {
  beforeEach(() => {
    setDefaultLocale('en-US');
  });

  it('should format currency with default options', () => {
    const result = formatCurrency(1234.56);
    expect(result).toMatch(/\$1,234\.56/);
  });

  it('should format currency with different currencies', () => {
    const eur = formatCurrency(1234.56, { currency: 'EUR', locale: 'de-DE' });
    expect(eur).toMatch(/1\.234,56/);
    expect(eur).toMatch(/€/);
  });

  it('should format Vietnamese currency', () => {
    const vnd = formatCurrency(1234.56, { currency: 'VND', locale: 'vi-VN' });
    expect(vnd).toMatch(/1\.235/); // VND rounds to whole numbers
    expect(vnd).toMatch(/₫/);
  });

  it('should support different display modes', () => {
    const symbol = formatCurrency(1234.56, { display: 'symbol' });
    expect(symbol).toMatch(/\$/);

    const code = formatCurrency(1234.56, { display: 'code' });
    expect(code).toMatch(/USD/);
  });

  it('should handle invalid input', () => {
    expect(formatCurrency(null)).toBe('N/A');
    expect(formatCurrency(undefined)).toBe('N/A');
    expect(formatCurrency(NaN)).toBe('N/A');
  });
});

describe('formatPercentage', () => {
  beforeEach(() => {
    setDefaultLocale('en-US');
  });

  it('should format percentages correctly', () => {
    expect(formatPercentage(0.1234)).toBe('12.34%');
    expect(formatPercentage(0.5)).toBe('50%');
    expect(formatPercentage(1)).toBe('100%');
  });

  it('should respect minimum fraction digits', () => {
    expect(formatPercentage(0.5, { minimumFractionDigits: 2 })).toBe('50.00%');
  });

  it('should respect maximum fraction digits', () => {
    expect(formatPercentage(0.1234, { maximumFractionDigits: 0 })).toBe('12%');
    expect(formatPercentage(0.1234, { maximumFractionDigits: 1 })).toBe('12.3%');
  });

  it('should format with different locales', () => {
    const result = formatPercentage(0.1234, { locale: 'de-DE' });
    expect(result).toMatch(/12,34/);
  });

  it('should handle invalid input', () => {
    expect(formatPercentage(null)).toBe('N/A');
    expect(formatPercentage(undefined)).toBe('N/A');
    expect(formatPercentage(NaN)).toBe('N/A');
  });
});

describe('formatFileSize', () => {
  beforeEach(() => {
    setDefaultLocale('en-US');
  });

  it('should format file sizes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1.02 KB'); // 1024 / 1000 = 1.024
    expect(formatFileSize(1536)).toBe('1.54 KB'); // 1536 / 1000 = 1.536
    expect(formatFileSize(1048576)).toBe('1.05 MB'); // 1048576 / 1000000 = 1.048576
    expect(formatFileSize(1073741824)).toBe('1.07 GB'); // Uses decimal (1000) by default
  });

  it('should support binary units', () => {
    expect(formatFileSize(1024, { binary: true })).toBe('1 KiB');
    expect(formatFileSize(1048576, { binary: true })).toBe('1 MiB');
  });

  it('should respect decimal places', () => {
    expect(formatFileSize(1536, { decimals: 0 })).toBe('2 KB');
    expect(formatFileSize(1536, { decimals: 1 })).toBe('1.5 KB');
    expect(formatFileSize(1536, { decimals: 3 })).toBe('1.536 KB');
  });

  it('should format with different locales', () => {
    const result = formatFileSize(1536, { locale: 'de-DE' });
    expect(result).toMatch(/1,54 KB/); // 1536 / 1000 = 1.536, rounded to 1.54
  });

  it('should handle invalid input', () => {
    expect(formatFileSize(-1)).toBe('N/A');
    expect(formatFileSize(null)).toBe('N/A');
    expect(formatFileSize(undefined)).toBe('N/A');
    expect(formatFileSize(NaN)).toBe('N/A');
  });
});

describe('formatDuration', () => {
  it('should format duration in clock format', () => {
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3665)).toBe('1:01:05');
  });

  it('should format duration in short format', () => {
    expect(formatDuration(65, { format: 'short' })).toBe('1m 5s');
    expect(formatDuration(3665, { format: 'short' })).toBe('1h 1m 5s');
    expect(formatDuration(3600, { format: 'short' })).toBe('1h');
  });

  it('should format duration in long format', () => {
    expect(formatDuration(1, { format: 'long' })).toBe('1 second');
    expect(formatDuration(65, { format: 'long' })).toBe('1 minute 5 seconds');
    expect(formatDuration(3665, { format: 'long' })).toBe('1 hour 1 minute 5 seconds');
    expect(formatDuration(7200, { format: 'long' })).toBe('2 hours');
  });

  it('should handle zero and invalid input', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(-1)).toBe('0:00');
    expect(formatDuration(null)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
  });
});

describe('formatDate', () => {
  beforeEach(() => {
    setDefaultLocale('en-US');
  });

  it('should format date with default options', () => {
    const date = new Date('2024-01-15T14:30:45');
    const result = formatDate(date);
    // Default format uses short date style which shows 2-digit year in en-US
    expect(result).toMatch(/1\/15\/24/);
    expect(result).toMatch(/2:30/);
  });

  it('should format date only', () => {
    const date = new Date('2024-01-15T14:30:45');
    const result = formatDate(date, { format: 'date' });
    expect(result).toMatch(/1\/15\/2024/);
  });

  it('should format time only', () => {
    const date = new Date('2024-01-15T14:30:45');
    const result = formatDate(date, { format: 'time' });
    expect(result).toMatch(/2:30:45/);
  });

  it('should format datetime', () => {
    const date = new Date('2024-01-15T14:30:45');
    const result = formatDate(date, { format: 'datetime' });
    expect(result).toMatch(/1\/15\/2024/);
    expect(result).toMatch(/2:30:45/);
  });

  it('should support dateStyle option', () => {
    const date = new Date('2024-01-15T14:30:45');
    const full = formatDate(date, { dateStyle: 'full' });
    expect(full).toMatch(/Monday/);
    expect(full).toMatch(/January/);
  });

  it('should format with different locales', () => {
    const date = new Date('2024-01-15T14:30:45');
    const result = formatDate(date, { locale: 'de-DE', format: 'date' });
    expect(result).toMatch(/15\.1\.2024/);
  });

  it('should handle timestamp input', () => {
    const timestamp = new Date('2024-01-15T14:30:45').getTime();
    const result = formatDate(timestamp, { format: 'date' });
    expect(result).toMatch(/1\/15\/2024/);
  });

  it('should handle invalid date', () => {
    expect(formatDate('invalid')).toBe('Invalid Date');
    expect(formatDate(NaN)).toBe('Invalid Date');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    setDefaultLocale('en-US');
  });

  it('should format recent times as "just now"', () => {
    expect(formatRelativeTime(Date.now() - 5000)).toBe('just now');
  });

  it('should format seconds ago', () => {
    const result = formatRelativeTime(Date.now() - 30000);
    expect(result).toMatch(/30 seconds ago/);
  });

  it('should format minutes ago', () => {
    const result = formatRelativeTime(Date.now() - 120000);
    expect(result).toMatch(/2 minutes ago/);
  });

  it('should format hours ago', () => {
    const result = formatRelativeTime(Date.now() - 7200000);
    expect(result).toMatch(/2 hours ago/);
  });

  it('should format days ago', () => {
    const result = formatRelativeTime(Date.now() - 172800000);
    expect(result).toMatch(/2 days ago/);
  });

  it('should support different styles', () => {
    const long = formatRelativeTime(Date.now() - 60000, { style: 'long' });
    const short = formatRelativeTime(Date.now() - 60000, { style: 'short' });
    
    expect(long).toBeTruthy();
    expect(short).toBeTruthy();
  });

  it('should format with different locales', () => {
    const result = formatRelativeTime(Date.now() - 60000, { locale: 'de-DE' });
    expect(result).toBeTruthy();
  });
});

describe('formatList', () => {
  beforeEach(() => {
    setDefaultLocale('en-US');
  });

  it('should format list with conjunction (and)', () => {
    expect(formatList(['apple'])).toBe('apple');
    expect(formatList(['apple', 'banana'])).toMatch(/apple.*banana/);
    
    const result = formatList(['apple', 'banana', 'orange']);
    expect(result).toMatch(/apple/);
    expect(result).toMatch(/banana/);
    expect(result).toMatch(/orange/);
  });

  it('should format list with disjunction (or)', () => {
    const result = formatList(['apple', 'banana'], { type: 'disjunction' });
    expect(result).toMatch(/apple.*or.*banana/);
  });

  it('should support different styles', () => {
    const long = formatList(['apple', 'banana', 'orange'], { style: 'long' });
    const short = formatList(['apple', 'banana', 'orange'], { style: 'short' });
    
    expect(long).toBeTruthy();
    expect(short).toBeTruthy();
  });

  it('should handle empty array', () => {
    expect(formatList([])).toBe('');
  });

  it('should handle single item', () => {
    expect(formatList(['apple'])).toBe('apple');
  });

  it('should handle non-array input', () => {
    expect(formatList(null)).toBe('');
    expect(formatList(undefined)).toBe('');
  });
});
