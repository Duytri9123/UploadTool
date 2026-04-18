/**
 * LogBox Component Tests
 * 
 * Unit tests for the LogBox component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogBox } from './LogBox.js';

describe('LogBox Component', () => {
  let logBox;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    logBox = new LogBox();
  });

  afterEach(() => {
    if (logBox) {
      logBox.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Initialization', () => {
    it('should create a LogBox instance', () => {
      expect(logBox).toBeInstanceOf(LogBox);
      expect(logBox.element).toBeTruthy();
    });

    it('should have correct default options', () => {
      expect(logBox.options.maxEntries).toBe(1000);
      expect(logBox.options.autoScroll).toBe(true);
      expect(logBox.options.density).toBe('comfortable');
      expect(logBox.options.showTimestamp).toBe(true);
    });

    it('should accept custom options', () => {
      const customLogBox = new LogBox({
        maxEntries: 500,
        autoScroll: false,
        density: 'compact'
      });

      expect(customLogBox.options.maxEntries).toBe(500);
      expect(customLogBox.options.autoScroll).toBe(false);
      expect(customLogBox.options.density).toBe('compact');

      customLogBox.destroy();
    });

    it('should have correct ARIA attributes', () => {
      expect(logBox.element.getAttribute('role')).toBe('log');
      expect(logBox.element.getAttribute('aria-live')).toBe('polite');
      expect(logBox.element.getAttribute('aria-atomic')).toBe('false');
    });
  });

  describe('Adding Logs', () => {
    it('should add info log', () => {
      const log = logBox.addLog('info', 'Test info message');
      
      expect(log.level).toBe('info');
      expect(log.message).toBe('Test info message');
      expect(logBox.getLogCount()).toBe(1);
    });

    it('should add success log', () => {
      const log = logBox.addLog('success', 'Test success message');
      
      expect(log.level).toBe('success');
      expect(log.message).toBe('Test success message');
      expect(logBox.getLogCount()).toBe(1);
    });

    it('should add warning log', () => {
      const log = logBox.addLog('warning', 'Test warning message');
      
      expect(log.level).toBe('warning');
      expect(log.message).toBe('Test warning message');
      expect(logBox.getLogCount()).toBe(1);
    });

    it('should add error log', () => {
      const log = logBox.addLog('error', 'Test error message');
      
      expect(log.level).toBe('error');
      expect(log.message).toBe('Test error message');
      expect(logBox.getLogCount()).toBe(1);
    });

    it('should add multiple logs', () => {
      logBox.addLog('info', 'Message 1');
      logBox.addLog('success', 'Message 2');
      logBox.addLog('warning', 'Message 3');
      
      expect(logBox.getLogCount()).toBe(3);
    });

    it('should call onLogAdded callback', () => {
      const callback = vi.fn();
      const customLogBox = new LogBox({ onLogAdded: callback });
      
      customLogBox.addLog('info', 'Test message');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: 'Test message'
        })
      );

      customLogBox.destroy();
    });

    it('should handle invalid log level', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const log = logBox.addLog('invalid', 'Test message');
      
      expect(log.level).toBe('info'); // Should default to info
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should add custom timestamp', () => {
      const customDate = new Date('2024-01-01T12:00:00Z');
      const log = logBox.addLog('info', 'Test message', { timestamp: customDate });
      
      expect(log.timestamp).toEqual(customDate);
    });

    it('should add custom data', () => {
      const customData = { userId: 123, action: 'login' };
      const log = logBox.addLog('info', 'User logged in', { data: customData });
      
      expect(log.data).toEqual(customData);
    });
  });

  describe('Max Entries Limit', () => {
    it('should enforce max entries limit', () => {
      const customLogBox = new LogBox({ maxEntries: 5 });
      
      for (let i = 0; i < 10; i++) {
        customLogBox.addLog('info', `Message ${i}`);
      }
      
      expect(customLogBox.getLogCount()).toBe(5);
      
      customLogBox.destroy();
    });

    it('should remove oldest log when limit exceeded', () => {
      const customLogBox = new LogBox({ maxEntries: 3 });
      
      customLogBox.addLog('info', 'Message 1');
      customLogBox.addLog('info', 'Message 2');
      customLogBox.addLog('info', 'Message 3');
      customLogBox.addLog('info', 'Message 4');
      
      const logs = customLogBox.getLogs();
      expect(logs[0].message).toBe('Message 2');
      expect(logs[logs.length - 1].message).toBe('Message 4');
      
      customLogBox.destroy();
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      logBox.addLog('info', 'Info message');
      logBox.addLog('success', 'Success message');
      logBox.addLog('warning', 'Warning message');
      logBox.addLog('error', 'Error message');
    });

    it('should filter by single level', () => {
      logBox.setFilter(['info']);
      
      expect(logBox.visibleLevels).toEqual(['info']);
    });

    it('should filter by multiple levels', () => {
      logBox.setFilter(['info', 'error']);
      
      expect(logBox.visibleLevels).toEqual(['info', 'error']);
    });

    it('should show all levels when filter is empty', () => {
      logBox.setFilter([]);
      
      expect(logBox.visibleLevels).toEqual(['info', 'success', 'warning', 'error']);
    });

    it('should toggle level visibility', () => {
      logBox.toggleLevel('info');
      
      expect(logBox.visibleLevels).not.toContain('info');
      
      logBox.toggleLevel('info');
      
      expect(logBox.visibleLevels).toContain('info');
    });

    it('should call onFilterChanged callback', () => {
      const callback = vi.fn();
      const customLogBox = new LogBox({ onFilterChanged: callback });
      
      customLogBox.setFilter(['info', 'error']);
      
      expect(callback).toHaveBeenCalledWith(['info', 'error']);
      
      customLogBox.destroy();
    });
  });

  describe('Clearing Logs', () => {
    it('should clear all logs', () => {
      logBox.addLog('info', 'Message 1');
      logBox.addLog('success', 'Message 2');
      
      logBox.clearLogs();
      
      expect(logBox.getLogCount()).toBe(0);
    });

    it('should call onCleared callback', () => {
      const callback = vi.fn();
      const customLogBox = new LogBox({ onCleared: callback });
      
      customLogBox.addLog('info', 'Test message');
      customLogBox.clearLogs();
      
      expect(callback).toHaveBeenCalledTimes(1);
      
      customLogBox.destroy();
    });
  });

  describe('Log Count', () => {
    beforeEach(() => {
      logBox.addLog('info', 'Info 1');
      logBox.addLog('info', 'Info 2');
      logBox.addLog('success', 'Success 1');
      logBox.addLog('error', 'Error 1');
    });

    it('should get total log count', () => {
      expect(logBox.getLogCount()).toBe(4);
    });

    it('should get log count by level', () => {
      expect(logBox.getLogCount('info')).toBe(2);
      expect(logBox.getLogCount('success')).toBe(1);
      expect(logBox.getLogCount('warning')).toBe(0);
      expect(logBox.getLogCount('error')).toBe(1);
    });
  });

  describe('Getting Logs', () => {
    beforeEach(() => {
      logBox.addLog('info', 'Info message');
      logBox.addLog('success', 'Success message');
      logBox.addLog('error', 'Error message');
    });

    it('should get all logs', () => {
      const logs = logBox.getLogs();
      
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Info message');
      expect(logs[1].message).toBe('Success message');
      expect(logs[2].message).toBe('Error message');
    });

    it('should get logs by level', () => {
      const infoLogs = logBox.getLogs({ levels: ['info'] });
      
      expect(infoLogs).toHaveLength(1);
      expect(infoLogs[0].level).toBe('info');
    });

    it('should get logs by multiple levels', () => {
      const logs = logBox.getLogs({ levels: ['info', 'error'] });
      
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe('info');
      expect(logs[1].level).toBe('error');
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      logBox.addLog('info', 'Info message');
      logBox.addLog('success', 'Success message');
      logBox.addLog('error', 'Error message');
    });

    it('should export logs as text', () => {
      const text = logBox.exportAsText();
      
      expect(text).toContain('[INFO]');
      expect(text).toContain('[SUCCESS]');
      expect(text).toContain('[ERROR]');
      expect(text).toContain('Info message');
      expect(text).toContain('Success message');
      expect(text).toContain('Error message');
    });

    it('should export logs as text without timestamps', () => {
      const text = logBox.exportAsText({ includeTimestamp: false });
      
      expect(text).toContain('[INFO]');
      expect(text).toContain('[SUCCESS]');
      expect(text).toContain('Info message');
      expect(text).not.toContain('12:'); // Should not contain time format
    });

    it('should export filtered logs as text', () => {
      const text = logBox.exportAsText({ levels: ['info', 'error'] });
      
      expect(text).toContain('Info message');
      expect(text).toContain('Error message');
      expect(text).not.toContain('Success message');
    });

    it('should export logs as JSON', () => {
      const json = logBox.exportAsJSON();
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveLength(3);
      expect(parsed[0].level).toBe('info');
      expect(parsed[1].level).toBe('success');
      expect(parsed[2].level).toBe('error');
    });

    it('should export filtered logs as JSON', () => {
      const json = logBox.exportAsJSON({ levels: ['info'] });
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].level).toBe('info');
    });
  });

  describe('Display Options', () => {
    it('should set auto-scroll', () => {
      logBox.setAutoScroll(false);
      expect(logBox.autoScroll).toBe(false);
      
      logBox.setAutoScroll(true);
      expect(logBox.autoScroll).toBe(true);
    });

    it('should set density', () => {
      logBox.setDensity('compact');
      expect(logBox.element.classList.contains('log-box--compact')).toBe(true);
      
      logBox.setDensity('comfortable');
      expect(logBox.element.classList.contains('log-box--comfortable')).toBe(true);
    });

    it('should handle invalid density', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      logBox.setDensity('invalid');
      expect(logBox.element.classList.contains('log-box--comfortable')).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Mounting and Unmounting', () => {
    it('should mount to parent element', () => {
      logBox.mount(container);
      
      expect(logBox.mounted).toBe(true);
      expect(container.contains(logBox.element)).toBe(true);
    });

    it('should not mount twice', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      logBox.mount(container);
      logBox.mount(container);
      
      expect(consoleSpy).toHaveBeenCalledWith('LogBox is already mounted');
      
      consoleSpy.mockRestore();
    });

    it('should unmount from parent', () => {
      logBox.mount(container);
      logBox.unmount();
      
      expect(logBox.mounted).toBe(false);
      expect(container.contains(logBox.element)).toBe(false);
    });

    it('should not unmount if not mounted', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      logBox.unmount();
      
      expect(consoleSpy).toHaveBeenCalledWith('LogBox is not mounted');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Destruction', () => {
    it('should destroy and clean up', () => {
      logBox.mount(container);
      logBox.addLog('info', 'Test message');
      
      logBox.destroy();
      
      expect(logBox.element).toBeNull();
      expect(logBox.options).toBeNull();
    });
  });
});
