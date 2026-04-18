/**
 * Topbar Component Tests
 * 
 * Tests for Topbar component functionality, accessibility, and interactions
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Topbar } from './Topbar.js';

describe('Topbar Component', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  describe('Initialization', () => {
    test('should create topbar with default options', () => {
      const topbar = new Topbar({ title: 'Dashboard' });
      
      expect(topbar.element).toBeInstanceOf(HTMLElement);
      expect(topbar.element.tagName).toBe('HEADER');
      expect(topbar.element.classList.contains('topbar')).toBe(true);
      expect(topbar.element.getAttribute('role')).toBe('banner');
    });

    test('should display page title', () => {
      const topbar = new Topbar({ title: 'Dashboard' });
      
      const titleElement = topbar.element.querySelector('.topbar__title');
      expect(titleElement.textContent).toBe('Dashboard');
    });

    test('should show theme toggle by default', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      expect(themeToggle).toBeTruthy();
    });

    test('should show hamburger by default', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      expect(hamburger).toBeTruthy();
    });

    test('should hide theme toggle when showThemeToggle is false', () => {
      const topbar = new Topbar({ title: 'Test', showThemeToggle: false });
      
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      expect(themeToggle).toBeFalsy();
    });

    test('should hide hamburger when showHamburger is false', () => {
      const topbar = new Topbar({ title: 'Test', showHamburger: false });
      
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      expect(hamburger).toBeFalsy();
    });
  });

  describe('Title Management', () => {
    test('should set title', () => {
      const topbar = new Topbar({ title: 'Original' });
      
      topbar.setTitle('Updated');
      
      const titleElement = topbar.element.querySelector('.topbar__title');
      expect(titleElement.textContent).toBe('Updated');
    });

    test('should handle empty title', () => {
      const topbar = new Topbar({ title: '' });
      
      const titleElement = topbar.element.querySelector('.topbar__title');
      expect(titleElement.textContent).toBe('');
    });
  });

  describe('Theme Toggle', () => {
    test('should have correct initial theme', () => {
      const topbar = new Topbar({ title: 'Test', currentTheme: 'dark' });
      
      expect(topbar.getTheme()).toBe('dark');
      
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      expect(themeToggle.getAttribute('data-theme')).toBe('dark');
    });

    test('should toggle theme on click', () => {
      const onThemeToggle = vi.fn();
      const topbar = new Topbar({ 
        title: 'Test', 
        currentTheme: 'light',
        onThemeToggle 
      });
      
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      themeToggle.click();
      
      expect(onThemeToggle).toHaveBeenCalledWith('dark', expect.any(MouseEvent));
      expect(topbar.getTheme()).toBe('dark');
    });

    test('should update theme programmatically', () => {
      const topbar = new Topbar({ title: 'Test', currentTheme: 'light' });
      
      topbar.setTheme('dark');
      
      expect(topbar.getTheme()).toBe('dark');
      
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      expect(themeToggle.getAttribute('data-theme')).toBe('dark');
    });

    test('should update aria-label when theme changes', () => {
      const topbar = new Topbar({ title: 'Test', currentTheme: 'light' });
      
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      expect(themeToggle.getAttribute('aria-label')).toBe('Switch to dark mode');
      
      topbar.setTheme('dark');
      expect(themeToggle.getAttribute('aria-label')).toBe('Switch to light mode');
    });

    test('should show/hide theme toggle', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      topbar.hideThemeToggle();
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      expect(themeToggle.style.display).toBe('none');
      
      topbar.showThemeToggle();
      expect(themeToggle.style.display).toBe('flex');
    });
  });

  describe('Hamburger Menu', () => {
    test('should have correct initial state', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(hamburger.classList.contains('topbar__hamburger--active')).toBe(false);
    });

    test('should toggle on click', () => {
      const onHamburgerClick = vi.fn();
      const topbar = new Topbar({ title: 'Test', onHamburgerClick });
      
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      hamburger.click();
      
      expect(onHamburgerClick).toHaveBeenCalledWith(true, expect.any(MouseEvent));
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      expect(hamburger.classList.contains('topbar__hamburger--active')).toBe(true);
    });

    test('should toggle back to closed state', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      
      // Open
      hamburger.click();
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      
      // Close
      hamburger.click();
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(hamburger.classList.contains('topbar__hamburger--active')).toBe(false);
    });

    test('should set expanded state programmatically', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      topbar.setHamburgerExpanded(true);
      
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      expect(hamburger.classList.contains('topbar__hamburger--active')).toBe(true);
    });

    test('should show/hide hamburger', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      topbar.hideHamburger();
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      expect(hamburger.style.display).toBe('none');
      
      topbar.showHamburger();
      expect(hamburger.style.display).toBe('flex');
    });

    test('should have correct aria attributes', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      expect(hamburger.getAttribute('aria-label')).toBe('Toggle navigation menu');
      expect(hamburger.getAttribute('aria-controls')).toBe('sidebar');
    });
  });

  describe('Keyboard Navigation', () => {
    test('should activate theme toggle with Enter', () => {
      const onThemeToggle = vi.fn();
      const topbar = new Topbar({ title: 'Test', onThemeToggle });
      
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      themeToggle.dispatchEvent(event);
      
      expect(onThemeToggle).toHaveBeenCalledTimes(1);
    });

    test('should activate theme toggle with Space', () => {
      const onThemeToggle = vi.fn();
      const topbar = new Topbar({ title: 'Test', onThemeToggle });
      
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      themeToggle.dispatchEvent(event);
      
      expect(onThemeToggle).toHaveBeenCalledTimes(1);
    });

    test('should activate hamburger with Enter', () => {
      const onHamburgerClick = vi.fn();
      const topbar = new Topbar({ title: 'Test', onHamburgerClick });
      
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      hamburger.dispatchEvent(event);
      
      expect(onHamburgerClick).toHaveBeenCalledTimes(1);
    });

    test('should activate hamburger with Space', () => {
      const onHamburgerClick = vi.fn();
      const topbar = new Topbar({ title: 'Test', onHamburgerClick });
      
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      hamburger.dispatchEvent(event);
      
      expect(onHamburgerClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    test('should have role="banner"', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      expect(topbar.element.getAttribute('role')).toBe('banner');
    });

    test('should have proper heading structure', () => {
      const topbar = new Topbar({ title: 'Dashboard' });
      
      const heading = topbar.element.querySelector('h1');
      expect(heading).toBeTruthy();
      expect(heading.textContent).toBe('Dashboard');
    });

    test('should have aria-label on buttons', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      
      expect(themeToggle.getAttribute('aria-label')).toBeTruthy();
      expect(hamburger.getAttribute('aria-label')).toBeTruthy();
    });

    test('should have type="button" on buttons', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      const themeToggle = topbar.element.querySelector('.topbar__theme-toggle');
      const hamburger = topbar.element.querySelector('.topbar__hamburger');
      
      expect(themeToggle.getAttribute('type')).toBe('button');
      expect(hamburger.getAttribute('type')).toBe('button');
    });
  });

  describe('Mounting and Unmounting', () => {
    test('should mount to parent element', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      topbar.mount(container);
      
      expect(topbar.mounted).toBe(true);
      expect(container.contains(topbar.element)).toBe(true);
    });

    test('should not mount twice', () => {
      const topbar = new Topbar({ title: 'Test' });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      topbar.mount(container);
      topbar.mount(container);
      
      expect(consoleSpy).toHaveBeenCalledWith('Topbar is already mounted');
      consoleSpy.mockRestore();
    });

    test('should unmount from parent', () => {
      const topbar = new Topbar({ title: 'Test' });
      topbar.mount(container);
      
      topbar.unmount();
      
      expect(topbar.mounted).toBe(false);
      expect(container.contains(topbar.element)).toBe(false);
    });

    test('should destroy topbar', () => {
      const topbar = new Topbar({ title: 'Test' });
      topbar.mount(container);
      
      topbar.destroy();
      
      expect(topbar.element).toBeNull();
      expect(topbar.options).toBeNull();
    });
  });

  describe('Custom Classes', () => {
    test('should add custom className', () => {
      const topbar = new Topbar({ title: 'Test', className: 'custom-topbar' });
      
      expect(topbar.element.classList.contains('custom-topbar')).toBe(true);
    });
  });

  describe('Getters', () => {
    test('should return element via getter', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      expect(topbar.element).toBeInstanceOf(HTMLElement);
    });

    test('should return mounted state via getter', () => {
      const topbar = new Topbar({ title: 'Test' });
      
      expect(topbar.mounted).toBe(false);
      
      topbar.mount(container);
      
      expect(topbar.mounted).toBe(true);
    });

    test('should return current theme via getter', () => {
      const topbar = new Topbar({ title: 'Test', currentTheme: 'dark' });
      
      expect(topbar.getTheme()).toBe('dark');
    });
  });
});
