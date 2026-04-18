/**
 * Sidebar Component Tests
 * 
 * Tests for Sidebar component functionality, accessibility, and responsive behavior
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Sidebar } from './Sidebar.js';

describe('Sidebar Component', () => {
  let container;
  const mockItems = [
    { id: 'user', label: 'User', icon: '<svg>user</svg>', href: '/user' },
    { id: 'process', label: 'Process', icon: '<svg>process</svg>', href: '/process' },
    { id: 'config', label: 'Config', icon: '<svg>config</svg>', href: '/config' }
  ];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  describe('Initialization', () => {
    test('should create sidebar with default options', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      expect(sidebar.element).toBeInstanceOf(HTMLElement);
      expect(sidebar.element.tagName).toBe('ASIDE');
      expect(sidebar.element.classList.contains('sidebar')).toBe(true);
      expect(sidebar.element.getAttribute('role')).toBe('navigation');
    });

    test('should create sidebar with navigation items', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      const items = sidebar.element.querySelectorAll('.sidebar__item');
      expect(items.length).toBe(3);
    });

    test('should create sidebar with active item', () => {
      const sidebar = new Sidebar({ items: mockItems, activeItem: 'process' });
      
      const activeItem = sidebar.element.querySelector('[data-item-id="process"]');
      expect(activeItem.classList.contains('sidebar__item--active')).toBe(true);
      expect(activeItem.getAttribute('aria-current')).toBe('page');
    });

    test('should create collapsed sidebar', () => {
      const sidebar = new Sidebar({ items: mockItems, collapsed: true });
      
      expect(sidebar.element.classList.contains('sidebar--collapsed')).toBe(true);
      expect(sidebar.isCollapsed()).toBe(true);
    });

    test('should create hidden sidebar', () => {
      const sidebar = new Sidebar({ items: mockItems, hidden: true });
      
      expect(sidebar.element.classList.contains('sidebar--hidden')).toBe(true);
      expect(sidebar.isHidden()).toBe(true);
    });
  });

  describe('Navigation Items', () => {
    test('should render all navigation items', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      mockItems.forEach(item => {
        const element = sidebar.element.querySelector(`[data-item-id="${item.id}"]`);
        expect(element).toBeTruthy();
        expect(element.textContent).toContain(item.label);
      });
    });

    test('should render item icons', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      const icons = sidebar.element.querySelectorAll('.sidebar__item-icon');
      expect(icons.length).toBe(mockItems.length);
    });

    test('should set correct href for items', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      mockItems.forEach(item => {
        const element = sidebar.element.querySelector(`[data-item-id="${item.id}"]`);
        expect(element.getAttribute('href')).toBe(item.href);
      });
    });
  });

  describe('Active Item', () => {
    test('should set active item', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      sidebar.setActiveItem('config');
      
      const activeItem = sidebar.element.querySelector('[data-item-id="config"]');
      expect(activeItem.classList.contains('sidebar__item--active')).toBe(true);
      expect(sidebar.getActiveItem()).toBe('config');
    });

    test('should remove previous active item', () => {
      const sidebar = new Sidebar({ items: mockItems, activeItem: 'user' });
      
      sidebar.setActiveItem('process');
      
      const previousActive = sidebar.element.querySelector('[data-item-id="user"]');
      const newActive = sidebar.element.querySelector('[data-item-id="process"]');
      
      expect(previousActive.classList.contains('sidebar__item--active')).toBe(false);
      expect(newActive.classList.contains('sidebar__item--active')).toBe(true);
    });

    test('should update aria-current attribute', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      sidebar.setActiveItem('process');
      
      const activeItem = sidebar.element.querySelector('[data-item-id="process"]');
      expect(activeItem.getAttribute('aria-current')).toBe('page');
    });
  });

  describe('Collapse/Expand', () => {
    test('should collapse sidebar', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      sidebar.collapse();
      
      expect(sidebar.element.classList.contains('sidebar--collapsed')).toBe(true);
      expect(sidebar.isCollapsed()).toBe(true);
    });

    test('should expand sidebar', () => {
      const sidebar = new Sidebar({ items: mockItems, collapsed: true });
      
      sidebar.expand();
      
      expect(sidebar.element.classList.contains('sidebar--collapsed')).toBe(false);
      expect(sidebar.isCollapsed()).toBe(false);
    });

    test('should toggle sidebar', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      sidebar.toggle();
      expect(sidebar.isCollapsed()).toBe(true);
      
      sidebar.toggle();
      expect(sidebar.isCollapsed()).toBe(false);
    });

    test('should call onToggle callback on collapse', () => {
      const onToggle = vi.fn();
      const sidebar = new Sidebar({ items: mockItems, onToggle });
      
      sidebar.collapse();
      
      expect(onToggle).toHaveBeenCalledWith({ collapsed: true, hidden: false });
    });

    test('should call onToggle callback on expand', () => {
      const onToggle = vi.fn();
      const sidebar = new Sidebar({ items: mockItems, collapsed: true, onToggle });
      
      sidebar.expand();
      
      expect(onToggle).toHaveBeenCalledWith({ collapsed: false, hidden: false });
    });
  });

  describe('Show/Hide', () => {
    test('should hide sidebar', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      sidebar.hide();
      
      expect(sidebar.element.classList.contains('sidebar--hidden')).toBe(true);
      expect(sidebar.isHidden()).toBe(true);
    });

    test('should show sidebar', () => {
      const sidebar = new Sidebar({ items: mockItems, hidden: true });
      
      sidebar.show();
      
      expect(sidebar.element.classList.contains('sidebar--hidden')).toBe(false);
      expect(sidebar.isHidden()).toBe(false);
    });

    test('should toggle visibility', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      sidebar.toggleVisibility();
      expect(sidebar.isHidden()).toBe(true);
      
      sidebar.toggleVisibility();
      expect(sidebar.isHidden()).toBe(false);
    });
  });

  describe('Item Click Handling', () => {
    test('should call onItemClick when item is clicked', () => {
      const onItemClick = vi.fn();
      const sidebar = new Sidebar({ items: mockItems, onItemClick });
      container.appendChild(sidebar.element);
      
      const item = sidebar.element.querySelector('[data-item-id="user"]');
      item.click();
      
      expect(onItemClick).toHaveBeenCalledTimes(1);
      expect(onItemClick).toHaveBeenCalledWith(
        mockItems[0],
        expect.any(MouseEvent)
      );
    });

    test('should update active item on click', () => {
      const sidebar = new Sidebar({ items: mockItems, activeItem: 'user' });
      container.appendChild(sidebar.element);
      
      const item = sidebar.element.querySelector('[data-item-id="process"]');
      item.click();
      
      expect(sidebar.getActiveItem()).toBe('process');
    });
  });

  describe('Keyboard Navigation', () => {
    test('should navigate down with ArrowDown', () => {
      const sidebar = new Sidebar({ items: mockItems });
      container.appendChild(sidebar.element);
      
      const firstItem = sidebar.element.querySelector('[data-item-id="user"]');
      const secondItem = sidebar.element.querySelector('[data-item-id="process"]');
      
      firstItem.focus();
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      firstItem.dispatchEvent(event);
      
      expect(document.activeElement).toBe(secondItem);
    });

    test('should navigate up with ArrowUp', () => {
      const sidebar = new Sidebar({ items: mockItems });
      container.appendChild(sidebar.element);
      
      const firstItem = sidebar.element.querySelector('[data-item-id="user"]');
      const secondItem = sidebar.element.querySelector('[data-item-id="process"]');
      
      secondItem.focus();
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      secondItem.dispatchEvent(event);
      
      expect(document.activeElement).toBe(firstItem);
    });

    test('should navigate to first item with Home', () => {
      const sidebar = new Sidebar({ items: mockItems });
      container.appendChild(sidebar.element);
      
      const firstItem = sidebar.element.querySelector('[data-item-id="user"]');
      const lastItem = sidebar.element.querySelector('[data-item-id="config"]');
      
      lastItem.focus();
      
      const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
      lastItem.dispatchEvent(event);
      
      expect(document.activeElement).toBe(firstItem);
    });

    test('should navigate to last item with End', () => {
      const sidebar = new Sidebar({ items: mockItems });
      container.appendChild(sidebar.element);
      
      const firstItem = sidebar.element.querySelector('[data-item-id="user"]');
      const lastItem = sidebar.element.querySelector('[data-item-id="config"]');
      
      firstItem.focus();
      
      const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
      firstItem.dispatchEvent(event);
      
      expect(document.activeElement).toBe(lastItem);
    });

    test('should activate item with Enter', () => {
      const onItemClick = vi.fn();
      const sidebar = new Sidebar({ items: mockItems, onItemClick });
      container.appendChild(sidebar.element);
      
      const item = sidebar.element.querySelector('[data-item-id="user"]');
      item.focus();
      
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      item.dispatchEvent(event);
      
      expect(onItemClick).toHaveBeenCalledTimes(1);
    });

    test('should activate item with Space', () => {
      const onItemClick = vi.fn();
      const sidebar = new Sidebar({ items: mockItems, onItemClick });
      container.appendChild(sidebar.element);
      
      const item = sidebar.element.querySelector('[data-item-id="user"]');
      item.focus();
      
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      item.dispatchEvent(event);
      
      expect(onItemClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dynamic Updates', () => {
    test('should update navigation items', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      const newItems = [
        { id: 'new1', label: 'New 1', icon: '<svg>new1</svg>', href: '/new1' },
        { id: 'new2', label: 'New 2', icon: '<svg>new2</svg>', href: '/new2' }
      ];
      
      sidebar.setItems(newItems);
      
      const items = sidebar.element.querySelectorAll('.sidebar__item');
      expect(items.length).toBe(2);
      
      const firstItem = sidebar.element.querySelector('[data-item-id="new1"]');
      expect(firstItem).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    test('should have role="navigation"', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      expect(sidebar.element.getAttribute('role')).toBe('navigation');
    });

    test('should have aria-label', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      expect(sidebar.element.getAttribute('aria-label')).toBe('Main navigation');
    });

    test('should have role="menuitem" on items', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      const items = sidebar.element.querySelectorAll('.sidebar__item');
      items.forEach(item => {
        expect(item.getAttribute('role')).toBe('menuitem');
      });
    });

    test('should have tabindex="0" on items', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      const items = sidebar.element.querySelectorAll('.sidebar__item');
      items.forEach(item => {
        expect(item.getAttribute('tabindex')).toBe('0');
      });
    });
  });

  describe('Mounting and Unmounting', () => {
    test('should mount to parent element', () => {
      const sidebar = new Sidebar({ items: mockItems });
      
      sidebar.mount(container);
      
      expect(sidebar.mounted).toBe(true);
      expect(container.contains(sidebar.element)).toBe(true);
    });

    test('should not mount twice', () => {
      const sidebar = new Sidebar({ items: mockItems });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      sidebar.mount(container);
      sidebar.mount(container);
      
      expect(consoleSpy).toHaveBeenCalledWith('Sidebar is already mounted');
      consoleSpy.mockRestore();
    });

    test('should unmount from parent', () => {
      const sidebar = new Sidebar({ items: mockItems });
      sidebar.mount(container);
      
      sidebar.unmount();
      
      expect(sidebar.mounted).toBe(false);
      expect(container.contains(sidebar.element)).toBe(false);
    });

    test('should destroy sidebar', () => {
      const sidebar = new Sidebar({ items: mockItems });
      sidebar.mount(container);
      
      sidebar.destroy();
      
      expect(sidebar.element).toBeNull();
      expect(sidebar.options).toBeNull();
    });
  });
});
