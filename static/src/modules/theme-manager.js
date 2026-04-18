/**
 * Theme Manager Module
 *
 * Canonical entry point for the theme system as specified in the architecture.
 * Re-exports from theme.js which contains the full ThemeManager implementation.
 *
 * Features:
 * - Theme detection from localStorage or system preference (prefers-color-scheme)
 * - Smooth theme transitions via CSS custom properties
 * - Theme preference persistence to localStorage
 * - Observer pattern for components to react to theme changes
 *
 * @module theme-manager
 * @example
 * import themeManager, { ThemeManager, THEMES } from './modules/theme-manager.js';
 *
 * // Initialize on page load
 * themeManager.init();
 *
 * // Toggle theme
 * themeManager.toggleTheme();
 *
 * // Subscribe to changes
 * const unsubscribe = themeManager.subscribe((theme) => {
 *   console.log('Theme changed to:', theme);
 * });
 */

export { themeManager as default, themeManager, ThemeManager, THEMES } from './theme.js';
