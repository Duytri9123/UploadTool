/**
 * Unit tests for Theme System Module
 */

import { ThemeManager, THEMES } from './theme.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = localStorageMock;

// Mock matchMedia
global.matchMedia = (query) => ({
  matches: query === '(prefers-color-scheme: dark)',
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {}
});

describe('ThemeManager', () => {
  let themeManager;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    themeManager = new ThemeManager();
  });

  describe('initialization', () => {
    test('should initialize with system theme when no stored preference', () => {
      themeManager.init();
      expect(themeManager.getTheme()).toBe(THEMES.DARK);
    });

    test('should initialize with stored theme when available', () => {
      localStorage.setItem('app-theme', THEMES.LIGHT);
      themeManager = new ThemeManager();
      themeManager.init();
      expect(themeManager.getTheme()).toBe(THEMES.LIGHT);
    });
  });

  describe('theme switching', () => {
    test('should toggle from light to dark', () => {
      themeManager.setTheme(THEMES.LIGHT);
      const newTheme = themeManager.toggleTheme();
      expect(newTheme).toBe(THEMES.DARK);
      expect(themeManager.getTheme()).toBe(THEMES.DARK);
    });

    test('should toggle from dark to light', () => {
      themeManager.setTheme(THEMES.DARK);
      const newTheme = themeManager.toggleTheme();
      expect(newTheme).toBe(THEMES.LIGHT);
      expect(themeManager.getTheme()).toBe(THEMES.LIGHT);
    });

    test('should apply dark theme to document', () => {
      themeManager.setTheme(THEMES.DARK);
      expect(document.documentElement.getAttribute('data-theme')).toBe(THEMES.DARK);
    });

    test('should remove attribute for light theme', () => {
      themeManager.setTheme(THEMES.LIGHT);
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });

  describe('persistence', () => {
    test('should save theme to localStorage', () => {
      themeManager.setTheme(THEMES.DARK);
      expect(localStorage.getItem('app-theme')).toBe(THEMES.DARK);
    });

    test('should persist theme across instances', () => {
      themeManager.setTheme(THEMES.DARK);
      const newManager = new ThemeManager();
      expect(newManager.getStoredTheme()).toBe(THEMES.DARK);
    });

    test('should clear stored theme', () => {
      themeManager.setTheme(THEMES.DARK);
      themeManager.clearStoredTheme();
      expect(localStorage.getItem('app-theme')).toBeNull();
    });
  });

  describe('theme queries', () => {
    test('isDark should return true for dark theme', () => {
      themeManager.setTheme(THEMES.DARK);
      expect(themeManager.isDark()).toBe(true);
      expect(themeManager.isLight()).toBe(false);
    });

    test('isLight should return true for light theme', () => {
      themeManager.setTheme(THEMES.LIGHT);
      expect(themeManager.isLight()).toBe(true);
      expect(themeManager.isDark()).toBe(false);
    });
  });

  describe('observers', () => {
    test('should notify observers on theme change', () => {
      const callback = jest.fn();
      themeManager.subscribe(callback);
      
      themeManager.setTheme(THEMES.DARK);
      expect(callback).toHaveBeenCalledWith(THEMES.DARK);
    });

    test('should support multiple observers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      themeManager.subscribe(callback1);
      themeManager.subscribe(callback2);
      
      themeManager.setTheme(THEMES.LIGHT);
      
      expect(callback1).toHaveBeenCalledWith(THEMES.LIGHT);
      expect(callback2).toHaveBeenCalledWith(THEMES.LIGHT);
    });

    test('should allow unsubscribing', () => {
      const callback = jest.fn();
      const unsubscribe = themeManager.subscribe(callback);
      
      unsubscribe();
      themeManager.setTheme(THEMES.DARK);
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('should handle observer errors gracefully', () => {
      const errorCallback = jest.fn(() => { throw new Error('Test error'); });
      const normalCallback = jest.fn();
      
      themeManager.subscribe(errorCallback);
      themeManager.subscribe(normalCallback);
      
      expect(() => themeManager.setTheme(THEMES.DARK)).not.toThrow();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle invalid theme values', () => {
      themeManager.applyTheme('invalid');
      expect(themeManager.getTheme()).toBe(THEMES.LIGHT);
    });

    test('should handle localStorage errors gracefully', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('Storage error'); };
      
      expect(() => themeManager.setTheme(THEMES.DARK)).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });
  });
});
