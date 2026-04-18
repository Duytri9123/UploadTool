/**
 * ProgressBar Component Tests
 * 
 * Unit tests for the ProgressBar component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressBar } from './ProgressBar.js';

describe('ProgressBar Component', () => {
  let container;
  
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    document.body.removeChild(container);
  });
  
  describe('Initialization', () => {
    it('should create a progress bar with default options', () => {
      const progressBar = new ProgressBar();
      
      expect(progressBar.element).toBeTruthy();
      expect(progressBar.element.classList.contains('progress-bar')).toBe(true);
      expect(progressBar.element.classList.contains('progress-bar--determinate')).toBe(true);
      expect(progressBar.element.classList.contains('progress-bar--primary')).toBe(true);
      expect(progressBar.element.classList.contains('progress-bar--medium')).toBe(true);
    });
    
    it('should create a progress bar with custom options', () => {
      const progressBar = new ProgressBar({
        mode: 'indeterminate',
        variant: 'success',
        size: 'large',
        label: 'Loading...'
      });
      
      expect(progressBar.element.classList.contains('progress-bar--indeterminate')).toBe(true);
      expect(progressBar.element.classList.contains('progress-bar--success')).toBe(true);
      expect(progressBar.element.classList.contains('progress-bar--large')).toBe(true);
      expect(progressBar.element.getAttribute('aria-label')).toBe('Loading...');
    });
    
    it('should set initial progress value', () => {
      const progressBar = new ProgressBar({ progress: 50 });
      
      expect(progressBar.progress).toBe(50);
      expect(progressBar.element.getAttribute('aria-valuenow')).toBe('50');
    });
    
    it('should clamp progress value between 0 and 100', () => {
      const progressBar1 = new ProgressBar({ progress: -10 });
      expect(progressBar1.progress).toBe(0);
      
      const progressBar2 = new ProgressBar({ progress: 150 });
      expect(progressBar2.progress).toBe(100);
    });
  });
  
  describe('ARIA Attributes', () => {
    it('should have proper ARIA attributes for determinate mode', () => {
      const progressBar = new ProgressBar({ progress: 50 });
      
      expect(progressBar.element.getAttribute('role')).toBe('progressbar');
      expect(progressBar.element.getAttribute('aria-valuemin')).toBe('0');
      expect(progressBar.element.getAttribute('aria-valuemax')).toBe('100');
      expect(progressBar.element.getAttribute('aria-valuenow')).toBe('50');
    });
    
    it('should not have aria-valuenow in indeterminate mode', () => {
      const progressBar = new ProgressBar({ mode: 'indeterminate' });
      
      expect(progressBar.element.getAttribute('aria-valuenow')).toBeNull();
    });
    
    it('should set aria-label when label is provided', () => {
      const progressBar = new ProgressBar({ label: 'Uploading...' });
      
      expect(progressBar.element.getAttribute('aria-label')).toBe('Uploading...');
    });
  });
  
  describe('Progress Updates', () => {
    it('should update progress value', () => {
      const progressBar = new ProgressBar({ progress: 0 });
      
      progressBar.setProgress(50);
      
      expect(progressBar.progress).toBe(50);
      expect(progressBar.element.getAttribute('aria-valuenow')).toBe('50');
    });
    
    it('should update fill width when progress changes', () => {
      const progressBar = new ProgressBar({ progress: 0 });
      progressBar.mount(container);
      
      progressBar.setProgress(75);
      
      const fill = progressBar.element.querySelector('.progress-bar__fill');
      expect(fill.style.width).toBe('75%');
    });
    
    it('should call onChange callback when progress changes', () => {
      const onChange = vi.fn();
      const progressBar = new ProgressBar({ progress: 0, onChange });
      
      progressBar.setProgress(50);
      
      expect(onChange).toHaveBeenCalledWith(50);
    });
    
    it('should call onComplete callback when reaching 100%', () => {
      const onComplete = vi.fn();
      const progressBar = new ProgressBar({ progress: 0, onComplete });
      
      progressBar.setProgress(100);
      
      expect(onComplete).toHaveBeenCalled();
      expect(progressBar.completed).toBe(true);
    });
    
    it('should only call onComplete once', () => {
      const onComplete = vi.fn();
      const progressBar = new ProgressBar({ progress: 0, onComplete });
      
      progressBar.setProgress(100);
      progressBar.setProgress(100);
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    
    it('should reset completed flag when progress goes below 100%', () => {
      const progressBar = new ProgressBar({ progress: 100 });
      
      expect(progressBar.completed).toBe(true);
      
      progressBar.setProgress(50);
      
      expect(progressBar.completed).toBe(false);
    });
  });
  
  describe('Label Updates', () => {
    it('should update label text', () => {
      const progressBar = new ProgressBar({ label: 'Loading...' });
      progressBar.mount(container);
      
      progressBar.setLabel('Processing...');
      
      const labelText = progressBar.element.querySelector('.progress-bar__label-text');
      expect(labelText.textContent).toBe('Processing...');
      expect(progressBar.element.getAttribute('aria-label')).toBe('Processing...');
    });
    
    it('should show percentage label when enabled', () => {
      const progressBar = new ProgressBar({ 
        progress: 50, 
        showPercentage: true 
      });
      progressBar.mount(container);
      
      const percentage = progressBar.element.querySelector('.progress-bar__label-percentage');
      expect(percentage).toBeTruthy();
      expect(percentage.textContent).toBe('50%');
    });
    
    it('should update percentage when progress changes', () => {
      const progressBar = new ProgressBar({ 
        progress: 0, 
        showPercentage: true 
      });
      progressBar.mount(container);
      
      progressBar.setProgress(75);
      
      const percentage = progressBar.element.querySelector('.progress-bar__label-percentage');
      expect(percentage.textContent).toBe('75%');
    });
  });
  
  describe('Mode Switching', () => {
    it('should switch from determinate to indeterminate mode', () => {
      const progressBar = new ProgressBar({ mode: 'determinate', progress: 50 });
      
      progressBar.setMode('indeterminate');
      
      expect(progressBar.mode).toBe('indeterminate');
      expect(progressBar.element.classList.contains('progress-bar--indeterminate')).toBe(true);
      expect(progressBar.element.classList.contains('progress-bar--determinate')).toBe(false);
      expect(progressBar.element.getAttribute('aria-valuenow')).toBeNull();
    });
    
    it('should switch from indeterminate to determinate mode', () => {
      const progressBar = new ProgressBar({ mode: 'indeterminate' });
      
      progressBar.setMode('determinate');
      
      expect(progressBar.mode).toBe('determinate');
      expect(progressBar.element.classList.contains('progress-bar--determinate')).toBe(true);
      expect(progressBar.element.classList.contains('progress-bar--indeterminate')).toBe(false);
      expect(progressBar.element.getAttribute('aria-valuenow')).toBe('0');
    });
  });
  
  describe('Variant Updates', () => {
    it('should update color variant', () => {
      const progressBar = new ProgressBar({ variant: 'primary' });
      
      progressBar.setVariant('success');
      
      expect(progressBar.element.classList.contains('progress-bar--success')).toBe(true);
      expect(progressBar.element.classList.contains('progress-bar--primary')).toBe(false);
    });
  });
  
  describe('Size Updates', () => {
    it('should update size variant', () => {
      const progressBar = new ProgressBar({ size: 'medium' });
      
      progressBar.setSize('large');
      
      expect(progressBar.element.classList.contains('progress-bar--large')).toBe(true);
      expect(progressBar.element.classList.contains('progress-bar--medium')).toBe(false);
    });
  });
  
  describe('Reset', () => {
    it('should reset progress to 0', () => {
      const progressBar = new ProgressBar({ progress: 75 });
      
      progressBar.reset();
      
      expect(progressBar.progress).toBe(0);
      expect(progressBar.completed).toBe(false);
    });
  });
  
  describe('Mount and Unmount', () => {
    it('should mount to parent element', () => {
      const progressBar = new ProgressBar();
      
      progressBar.mount(container);
      
      expect(progressBar.mounted).toBe(true);
      expect(container.contains(progressBar.element)).toBe(true);
    });
    
    it('should unmount from parent element', () => {
      const progressBar = new ProgressBar();
      progressBar.mount(container);
      
      progressBar.unmount();
      
      expect(progressBar.mounted).toBe(false);
      expect(container.contains(progressBar.element)).toBe(false);
    });
    
    it('should warn when mounting already mounted component', () => {
      const progressBar = new ProgressBar();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      progressBar.mount(container);
      progressBar.mount(container);
      
      expect(consoleSpy).toHaveBeenCalledWith('ProgressBar is already mounted');
      consoleSpy.mockRestore();
    });
  });
  
  describe('Destroy', () => {
    it('should destroy and clean up', () => {
      const progressBar = new ProgressBar();
      progressBar.mount(container);
      
      progressBar.destroy();
      
      expect(progressBar.element).toBeNull();
      expect(progressBar.mounted).toBe(false);
      expect(container.children.length).toBe(0);
    });
  });
});
