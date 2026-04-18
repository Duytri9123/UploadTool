# Theme System Documentation

## Overview

The theme system provides a robust dark/light mode implementation with WCAG AA compliant colors, smooth transitions, and persistent user preferences.

## Features

- ✅ WCAG AA compliant color contrast ratios
  - Text: 4.5:1 minimum
  - UI components: 3:1 minimum
- ✅ Automatic system theme detection
- ✅ Persistent theme preference (localStorage)
- ✅ Smooth theme transitions
- ✅ Observable pattern for theme changes
- ✅ TypeScript-ready with JSDoc comments

## Usage

### Basic Setup

```javascript
import themeManager from './modules/theme.js';

// Initialize theme system on page load
themeManager.init();
```

### Toggle Theme

```javascript
// Toggle between light and dark
const newTheme = themeManager.toggleTheme();
console.log('New theme:', newTheme); // 'light' or 'dark'
```

### Set Specific Theme

```javascript
import { THEMES } from './modules/theme.js';

// Set to dark mode
themeManager.setTheme(THEMES.DARK);

// Set to light mode
themeManager.setTheme(THEMES.LIGHT);
```

### Check Current Theme

```javascript
// Get current theme
const currentTheme = themeManager.getTheme(); // 'light' or 'dark'

// Check if dark mode
if (themeManager.isDark()) {
  console.log('Dark mode is active');
}

// Check if light mode
if (themeManager.isLight()) {
  console.log('Light mode is active');
}
```

### Subscribe to Theme Changes

```javascript
// Subscribe to theme changes
const unsubscribe = themeManager.subscribe((theme) => {
  console.log('Theme changed to:', theme);
  // Update UI components that need to react to theme changes
});

// Later, unsubscribe when no longer needed
unsubscribe();
```

### Clear Stored Preference

```javascript
// Clear stored theme and revert to system preference
themeManager.clearStoredTheme();
```

## CSS Custom Properties

The theme system uses CSS custom properties (CSS variables) that automatically update when the theme changes.

### Available Variables

#### Colors

**Background Colors:**
- `--color-bg-primary`: Main background
- `--color-bg-secondary`: Cards, panels
- `--color-bg-tertiary`: Subtle highlights

**Text Colors:**
- `--color-text-primary`: Main text
- `--color-text-secondary`: Supporting text
- `--color-text-inverse`: Inverse text (for dark backgrounds in light mode)

**Border Colors:**
- `--color-border`: Default borders
- `--color-border-hover`: Hover state borders

**Brand Colors:**
- `--color-primary`: Primary brand color
- `--color-primary-hover`: Primary hover state
- `--color-secondary`: Secondary brand color
- `--color-secondary-hover`: Secondary hover state

**Semantic Colors:**
- `--color-success`: Success states
- `--color-success-hover`: Success hover
- `--color-warning`: Warning states
- `--color-warning-hover`: Warning hover
- `--color-danger`: Error/danger states
- `--color-danger-hover`: Danger hover
- `--color-info`: Info states
- `--color-info-hover`: Info hover

**Component Colors:**
- `--color-input-bg`: Input backgrounds
- `--color-input-border`: Input borders
- `--color-input-focus`: Input focus state
- `--color-card-bg`: Card backgrounds
- `--color-sidebar-bg`: Sidebar background
- `--color-topbar-bg`: Top bar background

**Shadows:**
- `--shadow-sm`: Small shadow
- `--shadow-base`: Base shadow
- `--shadow-md`: Medium shadow
- `--shadow-lg`: Large shadow
- `--shadow-xl`: Extra large shadow

### Using CSS Variables

```css
.my-component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-base);
}

.my-button {
  background: var(--color-primary);
  color: white;
  transition: background 0.2s;
}

.my-button:hover {
  background: var(--color-primary-hover);
}
```

## WCAG AA Compliance

All color combinations have been verified to meet WCAG AA standards:

### Light Mode
- Primary text on primary bg: **17.74:1** ✓
- Secondary text on primary bg: **4.83:1** ✓
- Primary button (white on primary): **5.17:1** ✓
- Success button (white on success): **5.48:1** ✓
- Warning button (white on warning): **5.02:1** ✓
- Danger button (white on danger): **4.83:1** ✓
- Border on primary bg: **4.83:1** ✓

### Dark Mode
- Primary text on primary bg: **16.30:1** ✓
- Secondary text on primary bg: **12.02:1** ✓
- Primary button (dark bg on primary): **7.02:1** ✓
- Success button (dark bg on success): **9.29:1** ✓
- Warning button (dark bg on warning): **10.69:1** ✓
- Danger button (dark bg on danger): **6.45:1** ✓
- Border on primary bg: **3.75:1** ✓

## Verification

Run the contrast verification script to check WCAG compliance:

```bash
node scripts/verify-contrast.js
```

## Demo

Open `static/src/theme-demo.html` in a browser to see the theme system in action.

## Architecture

### ThemeManager Class

The `ThemeManager` class is a singleton that manages the theme state and provides methods for theme manipulation.

**Key Methods:**
- `init()`: Initialize theme system
- `toggleTheme()`: Toggle between light and dark
- `setTheme(theme)`: Set specific theme
- `getTheme()`: Get current theme
- `isDark()`: Check if dark mode
- `isLight()`: Check if light mode
- `subscribe(callback)`: Subscribe to theme changes
- `clearStoredTheme()`: Clear stored preference

**Storage:**
- Theme preference is stored in `localStorage` with key `app-theme`
- Falls back to system preference if no stored value

**System Theme Detection:**
- Uses `prefers-color-scheme` media query
- Automatically updates when system theme changes (if no stored preference)

## Browser Support

- Modern browsers with CSS custom properties support
- localStorage support
- matchMedia API support (for system theme detection)

## Best Practices

1. **Always use CSS variables** instead of hardcoded colors
2. **Initialize theme early** in your application lifecycle
3. **Subscribe to theme changes** for components that need to react
4. **Test both themes** when developing new components
5. **Verify contrast ratios** when adding new colors

## Example: Theme Toggle Button

```html
<button id="themeToggle" class="theme-toggle">
  Toggle Theme
</button>

<script type="module">
  import themeManager from './modules/theme.js';

  themeManager.init();

  const toggleBtn = document.getElementById('themeToggle');
  
  toggleBtn.addEventListener('click', () => {
    const newTheme = themeManager.toggleTheme();
    toggleBtn.textContent = newTheme === 'dark' 
      ? '☀️ Light Mode' 
      : '🌙 Dark Mode';
  });

  // Set initial button text
  toggleBtn.textContent = themeManager.isDark() 
    ? '☀️ Light Mode' 
    : '🌙 Dark Mode';
</script>
```

## Troubleshooting

### Theme not persisting
- Check if localStorage is available and not blocked
- Verify browser privacy settings allow localStorage

### Colors not updating
- Ensure CSS custom properties are used instead of hardcoded colors
- Check that `themeManager.init()` is called on page load

### System theme not detected
- Verify browser supports `prefers-color-scheme` media query
- Check that no stored preference is overriding system theme

## Future Enhancements

Potential improvements for future versions:
- Additional theme variants (high contrast, custom themes)
- Theme scheduling (auto-switch based on time of day)
- Per-component theme overrides
- Theme animation customization
- CSS-in-JS integration helpers
