/**
 * State Manager Tests
 * Tests for the StateManager class and observer pattern
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager } from './state-manager.js';

describe('StateManager', () => {
  let stateManager;
  let localStorageMock;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {
      store: {},
      getItem(key) {
        return this.store[key] || null;
      },
      setItem(key, value) {
        this.store[key] = value;
      },
      clear() {
        this.store = {};
      }
    };
    global.localStorage = localStorageMock;

    // Create fresh instance
    stateManager = new StateManager();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      expect(stateManager.get('queue')).toEqual([]);
      expect(stateManager.get('progress')).toEqual({});
      expect(stateManager.get('config')).toEqual({});
      expect(stateManager.get('auth')).toEqual({ youtube: false, tiktok: false });
      expect(stateManager.get('theme')).toBe('light');
      expect(stateManager.get('ui')).toEqual({ sidebarCollapsed: false, activeTab: 'process' });
    });

    it('should load persisted state from localStorage', () => {
      localStorageMock.setItem('app-state-theme', JSON.stringify('dark'));
      localStorageMock.setItem('app-state-config', JSON.stringify({ key: 'value' }));
      
      const manager = new StateManager();
      expect(manager.getTheme()).toBe('dark');
      expect(manager.getConfig('key')).toBe('value');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('app-state-theme', 'invalid-json');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const manager = new StateManager();
      expect(manager.getTheme()).toBe('light'); // Falls back to default
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Get and Set', () => {
    it('should get state slice', () => {
      expect(stateManager.get('theme')).toBe('light');
    });

    it('should set state slice', () => {
      stateManager.set('theme', 'dark');
      expect(stateManager.get('theme')).toBe('dark');
    });

    it('should persist state to localStorage', () => {
      stateManager.set('theme', 'dark');
      expect(localStorageMock.getItem('app-state-theme')).toBe(JSON.stringify('dark'));
    });

    it('should not persist non-persist keys', () => {
      stateManager.set('queue', [{ id: 1 }]);
      expect(localStorageMock.getItem('app-state-queue')).toBeNull();
    });
  });

  describe('Update', () => {
    it('should merge updates for object state', () => {
      stateManager.set('config', { key1: 'value1' });
      stateManager.update('config', { key2: 'value2' });
      expect(stateManager.get('config')).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should replace non-object state', () => {
      stateManager.set('queue', [{ id: 1 }, { id: 2 }, { id: 3 }]);
      stateManager.update('queue', [{ id: 4 }, { id: 5 }, { id: 6 }]);
      expect(stateManager.get('queue')).toEqual([{ id: 4 }, { id: 5 }, { id: 6 }]);
    });
  });

  describe('Observer Pattern', () => {
    it('should notify observers on state change', () => {
      const callback = vi.fn();
      stateManager.subscribe('theme', callback);
      
      stateManager.set('theme', 'dark');
      
      expect(callback).toHaveBeenCalledWith('dark', 'light');
    });

    it('should support multiple observers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      stateManager.subscribe('theme', callback1);
      stateManager.subscribe('theme', callback2);
      
      stateManager.set('theme', 'dark');
      
      expect(callback1).toHaveBeenCalledWith('dark', 'light');
      expect(callback2).toHaveBeenCalledWith('dark', 'light');
    });

    it('should unsubscribe correctly', () => {
      const callback = vi.fn();
      const unsubscribe = stateManager.subscribe('theme', callback);
      
      unsubscribe();
      stateManager.set('theme', 'dark');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle observer errors gracefully', () => {
      const errorCallback = vi.fn(() => { throw new Error('Observer error'); });
      const goodCallback = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.subscribe('theme', errorCallback);
      stateManager.subscribe('theme', goodCallback);
      
      stateManager.set('theme', 'dark');
      
      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Queue Methods', () => {
    it('should add item to queue', () => {
      const item = { id: 1, url: 'test.com' };
      stateManager.addToQueue(item);
      expect(stateManager.get('queue')).toEqual([item]);
    });

    it('should remove item from queue', () => {
      stateManager.set('queue', [{ id: 1 }, { id: 2 }, { id: 3 }]);
      stateManager.removeFromQueue(2);
      expect(stateManager.get('queue')).toEqual([{ id: 1 }, { id: 3 }]);
    });

    it('should update queue item', () => {
      stateManager.set('queue', [{ id: 1, status: 'pending' }]);
      stateManager.updateQueueItem(1, { status: 'processing' });
      expect(stateManager.get('queue')).toEqual([{ id: 1, status: 'processing' }]);
    });

    it('should clear queue', () => {
      stateManager.set('queue', [{ id: 1 }, { id: 2 }]);
      stateManager.clearQueue();
      expect(stateManager.get('queue')).toEqual([]);
    });
  });

  describe('Progress Methods', () => {
    it('should set progress', () => {
      stateManager.setProgress(1, 50);
      expect(stateManager.get('progress')).toEqual({ 1: 50 });
    });

    it('should update existing progress', () => {
      stateManager.setProgress(1, 50);
      stateManager.setProgress(1, 75);
      expect(stateManager.get('progress')).toEqual({ 1: 75 });
    });

    it('should clear progress', () => {
      stateManager.setProgress(1, 50);
      stateManager.setProgress(2, 75);
      stateManager.clearProgress(1);
      expect(stateManager.get('progress')).toEqual({ 2: 75 });
    });
  });

  describe('Config Methods', () => {
    it('should get config value by key', () => {
      stateManager.set('config', { key1: 'value1', key2: 'value2' });
      expect(stateManager.getConfig('key1')).toBe('value1');
    });

    it('should get entire config when no key provided', () => {
      const config = { key1: 'value1', key2: 'value2' };
      stateManager.set('config', config);
      expect(stateManager.getConfig()).toEqual(config);
    });

    it('should set config value by key', () => {
      stateManager.setConfig('key1', 'value1');
      expect(stateManager.getConfig('key1')).toBe('value1');
    });

    it('should set entire config object', () => {
      const config = { key1: 'value1', key2: 'value2' };
      stateManager.setConfig(config);
      expect(stateManager.getConfig()).toEqual(config);
    });
  });

  describe('Theme Methods', () => {
    it('should get theme', () => {
      expect(stateManager.getTheme()).toBe('light');
    });

    it('should set theme', () => {
      stateManager.setTheme('dark');
      expect(stateManager.getTheme()).toBe('dark');
    });

    it('should persist theme to localStorage', () => {
      stateManager.setTheme('dark');
      expect(localStorageMock.getItem('app-state-theme')).toBe(JSON.stringify('dark'));
    });
  });

  describe('Auth Methods', () => {
    it('should set auth status', () => {
      stateManager.setAuth('youtube', true);
      expect(stateManager.get('auth')).toEqual({ youtube: true, tiktok: false });
    });

    it('should check authentication status', () => {
      stateManager.setAuth('youtube', true);
      expect(stateManager.isAuthenticated('youtube')).toBe(true);
      expect(stateManager.isAuthenticated('tiktok')).toBe(false);
    });

    it('should persist auth to localStorage', () => {
      stateManager.setAuth('youtube', true);
      const stored = JSON.parse(localStorageMock.getItem('app-state-auth'));
      expect(stored.youtube).toBe(true);
    });
  });

  describe('UI Methods', () => {
    it('should set sidebar collapsed state', () => {
      stateManager.setSidebarCollapsed(true);
      expect(stateManager.get('ui').sidebarCollapsed).toBe(true);
    });

    it('should set active tab', () => {
      stateManager.setActiveTab('config');
      expect(stateManager.get('ui').activeTab).toBe('config');
    });

    it('should persist UI state to localStorage', () => {
      stateManager.setSidebarCollapsed(true);
      const stored = JSON.parse(localStorageMock.getItem('app-state-ui'));
      expect(stored.sidebarCollapsed).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should handle complex state updates with observers', () => {
      const queueCallback = vi.fn();
      const progressCallback = vi.fn();
      
      stateManager.subscribe('queue', queueCallback);
      stateManager.subscribe('progress', progressCallback);
      
      // Add item to queue
      stateManager.addToQueue({ id: 1, url: 'test.com' });
      expect(queueCallback).toHaveBeenCalledTimes(1);
      
      // Set progress
      stateManager.setProgress(1, 50);
      expect(progressCallback).toHaveBeenCalledTimes(1);
      
      // Update queue item
      stateManager.updateQueueItem(1, { status: 'processing' });
      expect(queueCallback).toHaveBeenCalledTimes(2);
    });

    it('should maintain state consistency across operations', () => {
      stateManager.addToQueue({ id: 1, url: 'test1.com' });
      stateManager.addToQueue({ id: 2, url: 'test2.com' });
      stateManager.setProgress(1, 50);
      stateManager.setProgress(2, 25);
      
      expect(stateManager.get('queue').length).toBe(2);
      expect(Object.keys(stateManager.get('progress')).length).toBe(2);
      
      stateManager.removeFromQueue(1);
      stateManager.clearProgress(1);
      
      expect(stateManager.get('queue').length).toBe(1);
      expect(Object.keys(stateManager.get('progress')).length).toBe(1);
    });
  });

  describe('State Validation', () => {
    it('should validate queue as array', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('queue', 'not-an-array');
      expect(stateManager.get('queue')).toEqual([]); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should validate queue items have id property', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('queue', [{ url: 'test.com' }]); // Missing id
      expect(stateManager.get('queue')).toEqual([]); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should accept valid queue', () => {
      stateManager.set('queue', [{ id: 1, url: 'test.com' }]);
      expect(stateManager.get('queue')).toEqual([{ id: 1, url: 'test.com' }]);
    });

    it('should validate progress as object', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('progress', 'not-an-object');
      expect(stateManager.get('progress')).toEqual({}); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should validate progress values are numbers between 0-100', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('progress', { 1: 150 }); // Out of range
      expect(stateManager.get('progress')).toEqual({}); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should accept valid progress', () => {
      stateManager.set('progress', { 1: 50, 2: 75 });
      expect(stateManager.get('progress')).toEqual({ 1: 50, 2: 75 });
    });

    it('should validate config as object', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('config', 'not-an-object');
      expect(stateManager.get('config')).toEqual({}); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should validate auth as object', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('auth', 'not-an-object');
      expect(stateManager.get('auth')).toEqual({ youtube: false, tiktok: false }); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should validate auth platform values are booleans', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('auth', { youtube: 'yes', tiktok: false }); // Invalid type
      expect(stateManager.get('auth')).toEqual({ youtube: false, tiktok: false }); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should accept valid auth', () => {
      stateManager.set('auth', { youtube: true, tiktok: false });
      expect(stateManager.get('auth')).toEqual({ youtube: true, tiktok: false });
    });

    it('should validate theme as string', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('theme', 123); // Not a string
      expect(stateManager.get('theme')).toBe('light'); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should validate theme is light or dark', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('theme', 'invalid-theme');
      expect(stateManager.get('theme')).toBe('light'); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should accept valid theme', () => {
      stateManager.set('theme', 'dark');
      expect(stateManager.get('theme')).toBe('dark');
    });

    it('should validate UI as object', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('ui', 'not-an-object');
      expect(stateManager.get('ui')).toEqual({ sidebarCollapsed: false, activeTab: 'process' }); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should validate UI.sidebarCollapsed is boolean', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('ui', { sidebarCollapsed: 'yes', activeTab: 'process' });
      expect(stateManager.get('ui')).toEqual({ sidebarCollapsed: false, activeTab: 'process' }); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should validate UI.activeTab is string', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.set('ui', { sidebarCollapsed: false, activeTab: 123 });
      expect(stateManager.get('ui')).toEqual({ sidebarCollapsed: false, activeTab: 'process' }); // Should not update
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should accept valid UI', () => {
      stateManager.set('ui', { sidebarCollapsed: true, activeTab: 'config' });
      expect(stateManager.get('ui')).toEqual({ sidebarCollapsed: true, activeTab: 'config' });
    });
  });

  describe('Immutability', () => {
    it('should prevent direct state mutation for objects', () => {
      const config = { key1: 'value1' };
      stateManager.set('config', config);
      
      // Mutate original object
      config.key1 = 'modified';
      
      // State should not be affected
      expect(stateManager.get('config').key1).toBe('value1');
    });

    it('should prevent direct state mutation for arrays', () => {
      const queue = [{ id: 1, url: 'test.com' }];
      stateManager.set('queue', queue);
      
      // Mutate original array
      queue.push({ id: 2, url: 'test2.com' });
      
      // State should not be affected
      expect(stateManager.get('queue').length).toBe(1);
    });

    it('should deep clone nested objects', () => {
      const config = { nested: { key: 'value' } };
      stateManager.set('config', config);
      
      // Mutate nested object
      config.nested.key = 'modified';
      
      // State should not be affected
      expect(stateManager.get('config').nested.key).toBe('value');
    });

    it('should deep clone nested arrays', () => {
      const queue = [{ id: 1, tags: ['tag1', 'tag2'] }];
      stateManager.set('queue', queue);
      
      // Mutate nested array
      queue[0].tags.push('tag3');
      
      // State should not be affected
      expect(stateManager.get('queue')[0].tags.length).toBe(2);
    });

    it('should handle Date objects correctly', () => {
      const date = new Date('2024-01-01');
      const config = { timestamp: date };
      stateManager.set('config', config);
      
      // Mutate original date
      date.setFullYear(2025);
      
      // State should not be affected
      expect(stateManager.get('config').timestamp.getFullYear()).toBe(2024);
    });

    it('should ensure update method creates immutable copies', () => {
      stateManager.set('config', { key1: 'value1' });
      const updates = { key2: 'value2' };
      
      stateManager.update('config', updates);
      
      // Mutate updates object
      updates.key2 = 'modified';
      
      // State should not be affected
      expect(stateManager.get('config').key2).toBe('value2');
    });
  });

  describe('Development Mode Logging', () => {
    it('should log state changes when debug is enabled', () => {
      localStorageMock.setItem('debug', 'true');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      stateManager.set('theme', 'dark');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[StateManager] theme:',
        'light',
        '→',
        'dark'
      );
      
      consoleSpy.mockRestore();
    });

    it('should not log when debug is disabled', () => {
      // Ensure debug is disabled
      localStorageMock.setItem('debug', 'false');
      
      // Mock process.env to be production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      stateManager.set('theme', 'dark');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      
      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });
  });
});
