/**
 * Tests for theme-manager.js (re-export of theme.js)
 * Verifies the canonical module name works correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import themeManager, { ThemeManager, THEMES } from './theme-manager.js';

describe('theme-manager module', () => {
  it('exports a default themeManager singleton', () => {
    expect(themeManager).toBeDefined();
    expect(typeof themeManager.toggleTheme).toBe('function');
  });

  it('exports ThemeManager class', () => {
    expect(ThemeManager).toBeDefined();
    const instance = new ThemeManager();
    expect(instance).toBeInstanceOf(ThemeManager);
  });

  it('exports THEMES constants', () => {
    expect(THEMES.LIGHT).toBe('light');
    expect(THEMES.DARK).toBe('dark');
  });
});
