/**
 * FileUploader Component Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileUploader } from './FileUploader.js';

describe('FileUploader', () => {
  let container;
  let uploader;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (uploader) {
      uploader.destroy();
    }
    document.body.removeChild(container);
  });

  describe('Initialization', () => {
    it('should create a FileUploader instance', () => {
      uploader = new FileUploader();
      expect(uploader).toBeInstanceOf(FileUploader);
      expect(uploader.element).toBeTruthy();
    });

    it('should have correct default options', () => {
      uploader = new FileUploader();
      expect(uploader.options.multiple).toBe(false);
      expect(uploader.options.showPreview).toBe(true);
      expect(uploader.options.accept).toBeNull();
      expect(uploader.options.maxSize).toBeNull();
    });

    it('should accept custom options', () => {
      uploader = new FileUploader({
        multiple: true,
        accept: ['image/*'],
        maxSize: 5 * 1024 * 1024
      });
      expect(uploader.options.multiple).toBe(true);
      expect(uploader.options.accept).toEqual(['image/*']);
      expect(uploader.options.maxSize).toBe(5 * 1024 * 1024);
    });

    it('should create dropzone element', () => {
      uploader = new FileUploader();
      const dropzone = uploader.element.querySelector('.file-uploader__dropzone');
      expect(dropzone).toBeTruthy();
    });

    it('should create file list element', () => {
      uploader = new FileUploader();
      const fileList = uploader.element.querySelector('.file-uploader__file-list');
      expect(fileList).toBeTruthy();
    });

    it('should create hidden file input', () => {
      uploader = new FileUploader();
      const input = uploader.element.querySelector('.file-uploader__input');
      expect(input).toBeTruthy();
      expect(input.type).toBe('file');
    });
  });

  describe('Mounting', () => {
    it('should mount to parent element', () => {
      uploader = new FileUploader();
      uploader.mount(container);
      expect(uploader.mounted).toBe(true);
      expect(container.contains(uploader.element)).toBe(true);
    });

    it('should not mount twice', () => {
      uploader = new FileUploader();
      uploader.mount(container);
      const consoleSpy = vi.spyOn(console, 'warn');
      uploader.mount(container);
      expect(consoleSpy).toHaveBeenCalledWith('FileUploader is already mounted');
    });

    it('should unmount from parent', () => {
      uploader = new FileUploader();
      uploader.mount(container);
      uploader.unmount();
      expect(uploader.mounted).toBe(false);
      expect(container.contains(uploader.element)).toBe(false);
    });
  });

  describe('File Selection', () => {
    it('should accept files through input', () => {
      const onFilesSelected = vi.fn();
      uploader = new FileUploader({ onFilesSelected });
      uploader.mount(container);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const input = uploader.element.querySelector('.file-uploader__input');
      
      // Simulate file selection
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false
      });
      
      input.dispatchEvent(new Event('change'));
      
      expect(onFilesSelected).toHaveBeenCalledWith([file]);
      expect(uploader.getFileCount()).toBe(1);
    });

    it('should validate file types', () => {
      uploader = new FileUploader({
        accept: ['image/jpeg', 'image/png']
      });
      uploader.mount(container);

      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      
      // Test valid file
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
        configurable: true
      });
      input.dispatchEvent(new Event('change'));
      expect(uploader.getFileCount()).toBe(1);
      
      // Clear and test invalid file
      uploader.clearFiles();
      Object.defineProperty(input, 'files', {
        value: [invalidFile],
        writable: false,
        configurable: true
      });
      input.dispatchEvent(new Event('change'));
      expect(uploader.getFileCount()).toBe(0);
    });

    it('should validate file size', () => {
      uploader = new FileUploader({
        maxSize: 100 // 100 bytes
      });
      uploader.mount(container);

      const smallFile = new File(['x'], 'small.txt', { type: 'text/plain' });
      const largeFile = new File(['x'.repeat(200)], 'large.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      
      // Test small file (should pass)
      Object.defineProperty(input, 'files', {
        value: [smallFile],
        writable: false,
        configurable: true
      });
      input.dispatchEvent(new Event('change'));
      expect(uploader.getFileCount()).toBe(1);
      
      // Clear and test large file (should fail)
      uploader.clearFiles();
      Object.defineProperty(input, 'files', {
        value: [largeFile],
        writable: false,
        configurable: true
      });
      input.dispatchEvent(new Event('change'));
      expect(uploader.getFileCount()).toBe(0);
    });

    it('should handle multiple files when enabled', () => {
      uploader = new FileUploader({ multiple: true });
      uploader.mount(container);

      const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      Object.defineProperty(input, 'files', {
        value: [file1, file2],
        writable: false
      });
      
      input.dispatchEvent(new Event('change'));
      
      expect(uploader.getFileCount()).toBe(2);
    });

    it('should replace file when multiple is disabled', () => {
      uploader = new FileUploader({ multiple: false });
      uploader.mount(container);

      const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      
      // Add first file
      Object.defineProperty(input, 'files', {
        value: [file1],
        writable: false,
        configurable: true
      });
      input.dispatchEvent(new Event('change'));
      expect(uploader.getFileCount()).toBe(1);
      
      // Add second file (should replace first)
      Object.defineProperty(input, 'files', {
        value: [file2],
        writable: false,
        configurable: true
      });
      input.dispatchEvent(new Event('change'));
      expect(uploader.getFileCount()).toBe(1);
    });
  });

  describe('File Management', () => {
    it('should get all files', () => {
      uploader = new FileUploader({ multiple: true });
      uploader.mount(container);

      const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      Object.defineProperty(input, 'files', {
        value: [file1, file2],
        writable: false
      });
      input.dispatchEvent(new Event('change'));
      
      const files = uploader.getFiles();
      expect(files).toHaveLength(2);
      expect(files[0].name).toBe('test1.txt');
      expect(files[1].name).toBe('test2.txt');
    });

    it('should clear all files', () => {
      uploader = new FileUploader({ multiple: true });
      uploader.mount(container);

      const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      Object.defineProperty(input, 'files', {
        value: [file1, file2],
        writable: false
      });
      input.dispatchEvent(new Event('change'));
      
      expect(uploader.getFileCount()).toBe(2);
      
      uploader.clearFiles();
      expect(uploader.getFileCount()).toBe(0);
    });

    it('should remove individual file', () => {
      uploader = new FileUploader({ multiple: true });
      uploader.mount(container);

      const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      Object.defineProperty(input, 'files', {
        value: [file1, file2],
        writable: false
      });
      input.dispatchEvent(new Event('change'));
      
      expect(uploader.getFileCount()).toBe(2);
      
      // Get first file ID from the DOM
      const firstFileItem = uploader.element.querySelector('.file-uploader__file-item');
      const fileId = parseInt(firstFileItem.getAttribute('data-file-id'));
      
      uploader.removeFile(fileId);
      expect(uploader.getFileCount()).toBe(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      uploader = new FileUploader();
      expect(uploader.element.getAttribute('role')).toBe('region');
      expect(uploader.element.getAttribute('aria-label')).toBe('File uploader');
    });

    it('should have keyboard accessible dropzone', () => {
      uploader = new FileUploader();
      const dropzone = uploader.element.querySelector('.file-uploader__dropzone');
      expect(dropzone.getAttribute('role')).toBe('button');
      expect(dropzone.getAttribute('tabindex')).toBe('0');
    });

    it('should have accessible file list', () => {
      uploader = new FileUploader();
      const fileList = uploader.element.querySelector('.file-uploader__file-list');
      expect(fileList.getAttribute('role')).toBe('list');
      expect(fileList.getAttribute('aria-label')).toBe('Selected files');
    });
  });

  describe('Drag and Drop', () => {
    it('should add active class on drag over', () => {
      uploader = new FileUploader();
      uploader.mount(container);
      
      const dropzone = uploader.element.querySelector('.file-uploader__dropzone');
      const event = new DragEvent('dragover', { bubbles: true });
      
      dropzone.dispatchEvent(event);
      expect(dropzone.classList.contains('file-uploader__dropzone--active')).toBe(true);
    });

    it('should remove active class on drag leave', () => {
      uploader = new FileUploader();
      uploader.mount(container);
      
      const dropzone = uploader.element.querySelector('.file-uploader__dropzone');
      
      // First trigger dragover
      dropzone.dispatchEvent(new DragEvent('dragover', { bubbles: true }));
      expect(dropzone.classList.contains('file-uploader__dropzone--active')).toBe(true);
      
      // Then trigger dragleave
      const leaveEvent = new DragEvent('dragleave', { bubbles: true });
      Object.defineProperty(leaveEvent, 'target', { value: dropzone, writable: false });
      dropzone.dispatchEvent(leaveEvent);
      expect(dropzone.classList.contains('file-uploader__dropzone--active')).toBe(false);
    });
  });

  describe('Upload', () => {
    it('should call upload function for each file', async () => {
      const uploadFunction = vi.fn((file, onProgress) => {
        onProgress(100);
        return Promise.resolve({ success: true });
      });
      
      uploader = new FileUploader({
        multiple: true,
        uploadFunction
      });
      uploader.mount(container);

      const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      Object.defineProperty(input, 'files', {
        value: [file1, file2],
        writable: false
      });
      input.dispatchEvent(new Event('change'));
      
      await uploader.uploadFiles();
      
      expect(uploadFunction).toHaveBeenCalledTimes(2);
    });

    it('should call onUploadProgress callback', async () => {
      const onUploadProgress = vi.fn();
      const uploadFunction = vi.fn((file, onProgress) => {
        onProgress(50);
        onProgress(100);
        return Promise.resolve({ success: true });
      });
      
      uploader = new FileUploader({
        uploadFunction,
        onUploadProgress
      });
      uploader.mount(container);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false
      });
      input.dispatchEvent(new Event('change'));
      
      await uploader.uploadFiles();
      
      expect(onUploadProgress).toHaveBeenCalled();
    });

    it('should call onUploadComplete callback', async () => {
      const onUploadComplete = vi.fn();
      const uploadFunction = vi.fn((file, onProgress) => {
        onProgress(100);
        return Promise.resolve({ success: true });
      });
      
      uploader = new FileUploader({
        uploadFunction,
        onUploadComplete
      });
      uploader.mount(container);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false
      });
      input.dispatchEvent(new Event('change'));
      
      await uploader.uploadFiles();
      
      expect(onUploadComplete).toHaveBeenCalled();
    });

    it('should call onUploadError callback on failure', async () => {
      const onUploadError = vi.fn();
      const uploadFunction = vi.fn(() => {
        return Promise.reject(new Error('Upload failed'));
      });
      
      uploader = new FileUploader({
        uploadFunction,
        onUploadError
      });
      uploader.mount(container);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      const input = uploader.element.querySelector('.file-uploader__input');
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false
      });
      input.dispatchEvent(new Event('change'));
      
      await uploader.uploadFiles();
      
      expect(onUploadError).toHaveBeenCalled();
    });
  });
});
