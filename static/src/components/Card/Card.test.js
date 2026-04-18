/**
 * Card Component Tests
 * 
 * Tests for Card component functionality, accessibility, and interactions
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Card } from './Card.js';

describe('Card Component', () => {
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
    test('should create card with default options', () => {
      const card = new Card({ body: 'Test content' });
      
      expect(card.element).toBeInstanceOf(HTMLElement);
      expect(card.element.classList.contains('card')).toBe(true);
      expect(card.element.classList.contains('card--default')).toBe(true);
    });

    test('should create card with header, body, and footer', () => {
      const card = new Card({
        header: 'Card Title',
        body: 'Card content',
        footer: 'Card footer'
      });
      
      expect(card.element.querySelector('.card__header')).toBeTruthy();
      expect(card.element.querySelector('.card__body')).toBeTruthy();
      expect(card.element.querySelector('.card__footer')).toBeTruthy();
    });

    test('should create card with only body', () => {
      const card = new Card({ body: 'Just body' });
      
      expect(card.element.querySelector('.card__header')).toBeFalsy();
      expect(card.element.querySelector('.card__body')).toBeTruthy();
      expect(card.element.querySelector('.card__footer')).toBeFalsy();
    });

    test('should create collapsible card', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true
      });
      
      expect(card.element.classList.contains('card--collapsible')).toBe(true);
      expect(card.element.querySelector('.card__toggle')).toBeTruthy();
    });

    test('should create collapsed card', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: true
      });
      
      expect(card.element.classList.contains('card--collapsed')).toBe(true);
      expect(card.collapsed).toBe(true);
    });
  });

  describe('Variants', () => {
    test.each([
      ['default'],
      ['bordered'],
      ['elevated']
    ])('should create %s variant card', (variant) => {
      const card = new Card({ body: 'Test', variant });
      
      expect(card.element.classList.contains(`card--${variant}`)).toBe(true);
    });
  });

  describe('Content Management', () => {
    test('should accept string content', () => {
      const card = new Card({
        header: 'String Header',
        body: 'String Body',
        footer: 'String Footer'
      });
      
      expect(card.element.querySelector('.card__header').textContent).toContain('String Header');
      expect(card.element.querySelector('.card__body').textContent).toBe('String Body');
      expect(card.element.querySelector('.card__footer').textContent).toBe('String Footer');
    });

    test('should accept HTML element content', () => {
      const headerEl = document.createElement('h2');
      headerEl.textContent = 'Element Header';
      
      const bodyEl = document.createElement('p');
      bodyEl.textContent = 'Element Body';
      
      const footerEl = document.createElement('div');
      footerEl.textContent = 'Element Footer';
      
      const card = new Card({
        header: headerEl,
        body: bodyEl,
        footer: footerEl
      });
      
      expect(card.element.querySelector('.card__header h2')).toBeTruthy();
      expect(card.element.querySelector('.card__body p')).toBeTruthy();
      expect(card.element.querySelector('.card__footer div')).toBeTruthy();
    });

    test('should update header content', () => {
      const card = new Card({ header: 'Original', body: 'Content' });
      
      card.setHeader('Updated Header');
      
      expect(card.element.querySelector('.card__header').textContent).toContain('Updated Header');
    });

    test('should update body content', () => {
      const card = new Card({ body: 'Original' });
      
      card.setBody('Updated Body');
      
      expect(card.element.querySelector('.card__body').textContent).toBe('Updated Body');
    });

    test('should update footer content', () => {
      const card = new Card({ body: 'Content', footer: 'Original' });
      
      card.setFooter('Updated Footer');
      
      expect(card.element.querySelector('.card__footer').textContent).toBe('Updated Footer');
    });
  });

  describe('Collapsible Functionality', () => {
    test('should toggle card state', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: false
      });
      
      card.toggle();
      
      expect(card.collapsed).toBe(true);
      expect(card.element.classList.contains('card--collapsed')).toBe(true);
      
      card.toggle();
      
      expect(card.collapsed).toBe(false);
      expect(card.element.classList.contains('card--collapsed')).toBe(false);
    });

    test('should expand collapsed card', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: true
      });
      
      card.expand();
      
      expect(card.collapsed).toBe(false);
      expect(card.element.classList.contains('card--collapsed')).toBe(false);
    });

    test('should collapse expanded card', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: false
      });
      
      card.collapse();
      
      expect(card.collapsed).toBe(true);
      expect(card.element.classList.contains('card--collapsed')).toBe(true);
    });

    test('should not toggle non-collapsible card', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: false
      });
      
      card.toggle();
      
      expect(card.collapsed).toBe(false);
    });

    test('should call onToggle callback', () => {
      const onToggle = vi.fn();
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        onToggle
      });
      
      card.toggle();
      
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    test('should call onExpand callback', () => {
      const onExpand = vi.fn();
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: true,
        onExpand
      });
      
      card.expand();
      
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    test('should call onCollapse callback', () => {
      const onCollapse = vi.fn();
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: false,
        onCollapse
      });
      
      card.collapse();
      
      expect(onCollapse).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggle Button Interaction', () => {
    test('should toggle on button click', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: false
      });
      
      const toggleButton = card.element.querySelector('.card__toggle');
      toggleButton.click();
      
      expect(card.collapsed).toBe(true);
    });

    test('should toggle on Enter key', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: false
      });
      
      const toggleButton = card.element.querySelector('.card__toggle');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      toggleButton.dispatchEvent(event);
      
      expect(card.collapsed).toBe(true);
    });

    test('should toggle on Space key', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: false
      });
      
      const toggleButton = card.element.querySelector('.card__toggle');
      const event = new KeyboardEvent('keydown', { key: ' ' });
      toggleButton.dispatchEvent(event);
      
      expect(card.collapsed).toBe(true);
    });

    test('should not toggle on other keys', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: false
      });
      
      const toggleButton = card.element.querySelector('.card__toggle');
      const event = new KeyboardEvent('keydown', { key: 'a' });
      toggleButton.dispatchEvent(event);
      
      expect(card.collapsed).toBe(false);
    });
  });

  describe('Accessibility', () => {
    test('should have role="article"', () => {
      const card = new Card({ body: 'Content' });
      
      expect(card.element.getAttribute('role')).toBe('article');
    });

    test('should have aria-expanded on toggle button', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: false
      });
      
      const toggleButton = card.element.querySelector('.card__toggle');
      expect(toggleButton.getAttribute('aria-expanded')).toBe('true');
      
      card.collapse();
      expect(toggleButton.getAttribute('aria-expanded')).toBe('false');
    });

    test('should have aria-label on toggle button', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: false
      });
      
      const toggleButton = card.element.querySelector('.card__toggle');
      expect(toggleButton.getAttribute('aria-label')).toBe('Collapse card');
      
      card.collapse();
      expect(toggleButton.getAttribute('aria-label')).toBe('Expand card');
    });

    test('should have aria-hidden on body when collapsed', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: true
      });
      
      const body = card.element.querySelector('.card__body');
      expect(body.getAttribute('aria-hidden')).toBe('true');
      
      card.expand();
      expect(body.getAttribute('aria-hidden')).toBe('false');
    });

    test('should have aria-hidden on footer when collapsed', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        footer: 'Footer',
        collapsible: true,
        collapsed: true
      });
      
      const footer = card.element.querySelector('.card__footer');
      expect(footer.getAttribute('aria-hidden')).toBe('true');
      
      card.expand();
      expect(footer.getAttribute('aria-hidden')).toBe('false');
    });

    test('should have toggle icon with aria-hidden', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true
      });
      
      const icon = card.element.querySelector('.card__toggle-icon');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Mounting and Unmounting', () => {
    test('should mount to parent element', () => {
      const card = new Card({ body: 'Content' });
      
      card.mount(container);
      
      expect(card.mounted).toBe(true);
      expect(container.contains(card.element)).toBe(true);
    });

    test('should not mount twice', () => {
      const card = new Card({ body: 'Content' });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      card.mount(container);
      card.mount(container);
      
      expect(consoleSpy).toHaveBeenCalledWith('Card is already mounted');
      consoleSpy.mockRestore();
    });

    test('should unmount from parent', () => {
      const card = new Card({ body: 'Content' });
      card.mount(container);
      
      card.unmount();
      
      expect(card.mounted).toBe(false);
      expect(container.contains(card.element)).toBe(false);
    });

    test('should not unmount when not mounted', () => {
      const card = new Card({ body: 'Content' });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      card.unmount();
      
      expect(consoleSpy).toHaveBeenCalledWith('Card is not mounted');
      consoleSpy.mockRestore();
    });

    test('should destroy card', () => {
      const card = new Card({ body: 'Content' });
      card.mount(container);
      
      card.destroy();
      
      expect(card.element).toBeNull();
      expect(card.options).toBeNull();
    });
  });

  describe('Custom Classes', () => {
    test('should add custom className', () => {
      const card = new Card({ body: 'Content', className: 'custom-card' });
      
      expect(card.element.classList.contains('custom-card')).toBe(true);
    });
  });

  describe('Getters', () => {
    test('should return element via getter', () => {
      const card = new Card({ body: 'Content' });
      
      expect(card.element).toBeInstanceOf(HTMLElement);
    });

    test('should return mounted state via getter', () => {
      const card = new Card({ body: 'Content' });
      
      expect(card.mounted).toBe(false);
      
      card.mount(container);
      
      expect(card.mounted).toBe(true);
    });

    test('should return collapsed state via getter', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: true
      });
      
      expect(card.collapsed).toBe(true);
    });

    test('should return collapsible state via getter', () => {
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true
      });
      
      expect(card.collapsible).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty content gracefully', () => {
      const card = new Card({});
      
      expect(card.element).toBeTruthy();
      expect(card.element.querySelector('.card__header')).toBeFalsy();
      expect(card.element.querySelector('.card__body')).toBeFalsy();
      expect(card.element.querySelector('.card__footer')).toBeFalsy();
    });

    test('should not expand already expanded card', () => {
      const onExpand = vi.fn();
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: false,
        onExpand
      });
      
      card.expand();
      
      expect(onExpand).not.toHaveBeenCalled();
    });

    test('should not collapse already collapsed card', () => {
      const onCollapse = vi.fn();
      const card = new Card({
        header: 'Title',
        body: 'Content',
        collapsible: true,
        collapsed: true,
        onCollapse
      });
      
      card.collapse();
      
      expect(onCollapse).not.toHaveBeenCalled();
    });

    test('should update header in collapsible card', () => {
      const card = new Card({
        header: 'Original',
        body: 'Content',
        collapsible: true
      });
      
      card.setHeader('Updated');
      
      const headerContent = card.element.querySelector('.card__header-content');
      expect(headerContent.textContent).toContain('Updated');
    });
  });
});
