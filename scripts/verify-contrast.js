/**
 * WCAG AA Contrast Ratio Verification Script
 * Verifies that color combinations meet WCAG AA standards:
 * - 4.5:1 for normal text
 * - 3:1 for large text and UI components
 */

// Color definitions from _variables.scss
const colors = {
  // Light Mode
  light: {
    bg: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6'
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280'
    },
    border: '#6b7280',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    secondary: '#7c3aed',
    secondaryHover: '#6d28d9',
    success: '#047857',
    successHover: '#065f46',
    warning: '#b45309',
    warningHover: '#92400e',
    danger: '#dc2626',
    dangerHover: '#b91c1c',
    info: '#06b6d4',
    infoHover: '#0891b2'
  },
  // Dark Mode
  dark: {
    bg: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155'
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1'
    },
    border: '#64748b',
    primary: '#60a5fa',
    primaryHover: '#3b82f6',
    secondary: '#a78bfa',
    secondaryHover: '#8b5cf6',
    success: '#34d399',
    successHover: '#10b981',
    warning: '#fbbf24',
    warningHover: '#f59e0b',
    danger: '#f87171',
    dangerHover: '#ef4444',
    info: '#22d3ee',
    infoHover: '#06b6d4'
  }
};

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color code
 * @returns {object} RGB values
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance
 * @param {object} rgb - RGB color object
 * @returns {number} Relative luminance
 */
function getLuminance(rgb) {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {number} Contrast ratio
 */
function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    throw new Error(`Invalid color format: ${color1} or ${color2}`);
  }
  
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param {number} ratio - Contrast ratio
 * @param {string} type - 'text' or 'ui'
 * @returns {object} Pass/fail result
 */
function meetsWCAG_AA(ratio, type = 'text') {
  const threshold = type === 'text' ? 4.5 : 3.0;
  return {
    passes: ratio >= threshold,
    ratio: ratio.toFixed(2),
    threshold,
    type
  };
}

/**
 * Verify all color combinations
 */
function verifyAllContrasts() {
  console.log('='.repeat(70));
  console.log('WCAG AA Contrast Ratio Verification');
  console.log('='.repeat(70));
  console.log('Standards:');
  console.log('  - Normal text: 4.5:1 minimum');
  console.log('  - UI components: 3:1 minimum');
  console.log('='.repeat(70));
  
  let allPassed = true;
  const failures = [];

  // Test configurations
  const tests = [
    // Light Mode Tests
    { mode: 'Light Mode', theme: 'light', label: 'Primary text on primary bg', fg: 'text.primary', bg: 'bg.primary', type: 'text' },
    { mode: 'Light Mode', theme: 'light', label: 'Secondary text on primary bg', fg: 'text.secondary', bg: 'bg.primary', type: 'text' },
    { mode: 'Light Mode', theme: 'light', label: 'Primary text on secondary bg', fg: 'text.primary', bg: 'bg.secondary', type: 'text' },
    { mode: 'Light Mode', theme: 'light', label: 'Primary button (white on primary)', fg: '#ffffff', bg: 'primary', type: 'text' },
    { mode: 'Light Mode', theme: 'light', label: 'Success button (white on success)', fg: '#ffffff', bg: 'success', type: 'text' },
    { mode: 'Light Mode', theme: 'light', label: 'Warning button (white on warning)', fg: '#ffffff', bg: 'warning', type: 'text' },
    { mode: 'Light Mode', theme: 'light', label: 'Danger button (white on danger)', fg: '#ffffff', bg: 'danger', type: 'text' },
    { mode: 'Light Mode', theme: 'light', label: 'Border on primary bg', fg: 'border', bg: 'bg.primary', type: 'ui' },
    
    // Dark Mode Tests
    { mode: 'Dark Mode', theme: 'dark', label: 'Primary text on primary bg', fg: 'text.primary', bg: 'bg.primary', type: 'text' },
    { mode: 'Dark Mode', theme: 'dark', label: 'Secondary text on primary bg', fg: 'text.secondary', bg: 'bg.primary', type: 'text' },
    { mode: 'Dark Mode', theme: 'dark', label: 'Primary text on secondary bg', fg: 'text.primary', bg: 'bg.secondary', type: 'text' },
    { mode: 'Dark Mode', theme: 'dark', label: 'Primary button (dark bg on primary)', fg: 'bg.primary', bg: 'primary', type: 'text' },
    { mode: 'Dark Mode', theme: 'dark', label: 'Success button (dark bg on success)', fg: 'bg.primary', bg: 'success', type: 'text' },
    { mode: 'Dark Mode', theme: 'dark', label: 'Warning button (dark bg on warning)', fg: 'bg.primary', bg: 'warning', type: 'text' },
    { mode: 'Dark Mode', theme: 'dark', label: 'Danger button (dark bg on danger)', fg: 'bg.primary', bg: 'danger', type: 'text' },
    { mode: 'Dark Mode', theme: 'dark', label: 'Border on primary bg', fg: 'border', bg: 'bg.primary', type: 'ui' }
  ];

  // Helper to get color value from path
  const getColor = (theme, path) => {
    if (path.startsWith('#')) return path;
    const parts = path.split('.');
    let value = colors[theme];
    for (const part of parts) {
      value = value[part];
    }
    return value;
  };

  // Group by mode
  let currentMode = '';
  
  tests.forEach(test => {
    if (test.mode !== currentMode) {
      currentMode = test.mode;
      console.log('\n' + currentMode);
      console.log('-'.repeat(70));
    }

    const fgColor = getColor(test.theme, test.fg);
    const bgColor = getColor(test.theme, test.bg);
    const ratio = getContrastRatio(fgColor, bgColor);
    const result = meetsWCAG_AA(ratio, test.type);
    
    const status = result.passes ? '✓ PASS' : '✗ FAIL';
    const statusColor = result.passes ? '' : '';
    
    console.log(`  ${status} ${test.label}`);
    console.log(`       Ratio: ${result.ratio}:1 (threshold: ${result.threshold}:1)`);
    
    if (!result.passes) {
      allPassed = false;
      failures.push({
        mode: test.mode,
        label: test.label,
        ratio: result.ratio,
        threshold: result.threshold,
        fg: fgColor,
        bg: bgColor
      });
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('Summary');
  console.log('='.repeat(70));
  
  if (allPassed) {
    console.log('✓ All color combinations meet WCAG AA standards!');
  } else {
    console.log(`✗ ${failures.length} color combination(s) failed WCAG AA standards:\n`);
    failures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure.mode} - ${failure.label}`);
      console.log(`   Ratio: ${failure.ratio}:1 (needs ${failure.threshold}:1)`);
      console.log(`   FG: ${failure.fg}, BG: ${failure.bg}`);
    });
  }
  
  console.log('='.repeat(70));
  
  return allPassed;
}

// Run verification
const passed = verifyAllContrasts();
process.exit(passed ? 0 : 1);
