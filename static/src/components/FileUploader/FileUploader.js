/**
 * FileUploader Component
 * 
 * A reusable file uploader component with drag-and-drop support, file validation,
 * upload progress tracking, and file previews for images/videos.
 * Supports WCAG AA accessibility standards.
 * 
 * @example
 * import { FileUploader } from './components/FileUploader/FileUploader.js';
 * 
 * const uploader = new FileUploader({
 *   accept: ['image/*', 'video/*'],
 *   maxSize: 100 * 1024 * 1024, // 100MB
 *   multiple: true,
 *   onFilesSelected: (files) => console.log('Selected:', files),
 *   onUploadComplete: (results) => console.log('Uploaded:', results)
 * });
 * 
 * document.body.appendChild(uploader.element);
 */

import { validateFile } from '../../modules/validators.js';
import { formatBytes } from '../../modules/utils.js';
import { ProgressBar } from '../ProgressBar/ProgressBar.js';

export class FileUploader {
  /**
   * Create a FileUploader instance
   * @param {Object} options - FileUploader configuration
   * @param {string[]} [options.accept] - Allowed file types (MIME types or extensions)
   * @param {number} [options.maxSize] - Maximum file size in bytes
   * @param {number} [options.minSize] - Minimum file size in bytes
   * @param {boolean} [options.multiple=false] - Allow multiple file selection
   * @param {boolean} [options.showPreview=true] - Show file previews for images/videos
   * @param {string} [options.dropzoneText='Drag & drop files here or click to browse'] - Dropzone text
   * @param {string} [options.className] - Additional CSS classes
   * @param {Function} [options.onFilesSelected] - Callback when files are selected
   * @param {Function} [options.onUploadProgress] - Callback for upload progress (file, progress)
   * @param {Function} [options.onUploadComplete] - Callback when upload completes
   * @param {Function} [options.onUploadError] - Callback when upload fails
   * @param {Function} [options.uploadFunction] - Custom upload function (file) => Promise
   */
  constructor(options = {}) {
    this.options = {
      accept: null,
      maxSize: null,
      minSize: null,
      multiple: false,
      showPreview: true,
      dropzoneText: 'Drag & drop files here or click to browse',
      className: '',
      onFilesSelected: null,
      onUploadProgress: null,
      onUploadComplete: null,
      onUploadError: null,
      uploadFunction: null,
      ...options
    };

    this._element = null;
    this._dropzoneElement = null;
    this._inputElement = null;
    this._fileListElement = null;
    this._mounted = false;
    this._files = new Map(); // Map<fileId, fileData>
    this._fileIdCounter = 0;
    this._isDragging = false;
    
    // Bind event handlers
    this._handleDragOver = this._onDragOver.bind(this);
    this._handleDragLeave = this._onDragLeave.bind(this);
    this._handleDrop = this._onDrop.bind(this);
    this._handleClick = this._onClick.bind(this);
    this._handleInputChange = this._onInputChange.bind(this);
    
    this._init();
  }

  /**
   * Initialize the file uploader element
   * @private
   */
  _init() {
    this._element = this._createElement();
    this._attachEventListeners();
  }

  /**
   * Create the file uploader DOM element
   * @private
   * @returns {HTMLElement}
   */
  _createElement() {
    const container = document.createElement('div');
    
    // Build BEM class names
    const classes = ['file-uploader'];
    
    if (this.options.className) {
      classes.push(this.options.className);
    }
    
    container.className = classes.join(' ');
    
    // Set ARIA attributes
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'File uploader');
    
    // Build structure
    container.appendChild(this._createDropzone());
    container.appendChild(this._createFileList());
    
    return container;
  }

  /**
   * Create dropzone element
   * @private
   * @returns {HTMLElement}
   */
  _createDropzone() {
    const dropzone = document.createElement('div');
    dropzone.className = 'file-uploader__dropzone';
    dropzone.setAttribute('role', 'button');
    dropzone.setAttribute('tabindex', '0');
    dropzone.setAttribute('aria-label', 'Click or drag files to upload');
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'file';
    input.className = 'file-uploader__input';
    input.setAttribute('aria-hidden', 'true');
    
    if (this.options.multiple) {
      input.multiple = true;
    }
    
    if (this.options.accept && Array.isArray(this.options.accept)) {
      input.accept = this.options.accept.join(',');
    }
    
    this._inputElement = input;
    
    // Create dropzone content
    const content = document.createElement('div');
    content.className = 'file-uploader__dropzone-content';
    content.innerHTML = `
      <svg class="file-uploader__dropzone-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <p class="file-uploader__dropzone-text">${this.options.dropzoneText}</p>
      <p class="file-uploader__dropzone-hint">
        ${this._buildDropzoneHint()}
      </p>
    `;
    
    dropzone.appendChild(input);
    dropzone.appendChild(content);
    
    this._dropzoneElement = dropzone;
    return dropzone;
  }

  /**
   * Build dropzone hint text
   * @private
   * @returns {string}
   */
  _buildDropzoneHint() {
    const hints = [];
    
    if (this.options.accept) {
      const types = this.options.accept.map(type => {
        if (type.startsWith('.')) return type;
        if (type.includes('/*')) return type.split('/')[0];
        return type.split('/')[1] || type;
      }).join(', ');
      hints.push(`Accepted: ${types}`);
    }
    
    if (this.options.maxSize) {
      hints.push(`Max size: ${formatBytes(this.options.maxSize)}`);
    }
    
    if (this.options.multiple) {
      hints.push('Multiple files allowed');
    }
    
    return hints.join(' • ') || 'Select files to upload';
  }

  /**
   * Create file list element
   * @private
   * @returns {HTMLElement}
   */
  _createFileList() {
    const fileList = document.createElement('div');
    fileList.className = 'file-uploader__file-list';
    fileList.setAttribute('role', 'list');
    fileList.setAttribute('aria-label', 'Selected files');
    
    this._fileListElement = fileList;
    return fileList;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    // Dropzone events
    this._dropzoneElement.addEventListener('dragover', this._handleDragOver);
    this._dropzoneElement.addEventListener('dragleave', this._handleDragLeave);
    this._dropzoneElement.addEventListener('drop', this._handleDrop);
    this._dropzoneElement.addEventListener('click', this._handleClick);
    
    // Keyboard support for dropzone
    this._dropzoneElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._inputElement.click();
      }
    });
    
    // Input change event
    this._inputElement.addEventListener('change', this._handleInputChange);
  }

  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    this._dropzoneElement.removeEventListener('dragover', this._handleDragOver);
    this._dropzoneElement.removeEventListener('dragleave', this._handleDragLeave);
    this._dropzoneElement.removeEventListener('drop', this._handleDrop);
    this._dropzoneElement.removeEventListener('click', this._handleClick);
    this._inputElement.removeEventListener('change', this._handleInputChange);
  }

  /**
   * Handle drag over event
   * @private
   * @param {DragEvent} event
   */
  _onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this._isDragging) {
      this._isDragging = true;
      this._dropzoneElement.classList.add('file-uploader__dropzone--active');
    }
  }

  /**
   * Handle drag leave event
   * @private
   * @param {DragEvent} event
   */
  _onDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Only remove active state if leaving the dropzone entirely
    if (event.target === this._dropzoneElement) {
      this._isDragging = false;
      this._dropzoneElement.classList.remove('file-uploader__dropzone--active');
    }
  }

  /**
   * Handle drop event
   * @private
   * @param {DragEvent} event
   */
  _onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    this._isDragging = false;
    this._dropzoneElement.classList.remove('file-uploader__dropzone--active');
    
    const files = Array.from(event.dataTransfer.files);
    this._handleFiles(files);
  }

  /**
   * Handle click event
   * @private
   */
  _onClick() {
    this._inputElement.click();
  }

  /**
   * Handle input change event
   * @private
   * @param {Event} event
   */
  _onInputChange(event) {
    const files = Array.from(event.target.files);
    this._handleFiles(files);
    
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  }

  /**
   * Handle selected files
   * @private
   * @param {File[]} files
   */
  _handleFiles(files) {
    if (!files || files.length === 0) return;
    
    // If not multiple, clear existing files
    if (!this.options.multiple) {
      this.clearFiles();
    }
    
    // Validate and add files
    const validFiles = [];
    const errors = [];
    
    files.forEach(file => {
      const validation = this._validateFile(file);
      
      if (validation.valid) {
        const fileId = this._addFile(file);
        validFiles.push({ id: fileId, file });
      } else {
        errors.push({ file, error: validation.error });
      }
    });
    
    // Show errors if any
    if (errors.length > 0) {
      this._showErrors(errors);
    }
    
    // Call onFilesSelected callback
    if (validFiles.length > 0 && typeof this.options.onFilesSelected === 'function') {
      this.options.onFilesSelected(validFiles.map(f => f.file));
    }
  }

  /**
   * Validate a file
   * @private
   * @param {File} file
   * @returns {Object} Validation result
   */
  _validateFile(file) {
    return validateFile(file, {
      allowedTypes: this.options.accept,
      maxSize: this.options.maxSize,
      minSize: this.options.minSize
    });
  }

  /**
   * Add a file to the list
   * @private
   * @param {File} file
   * @returns {number} File ID
   */
  _addFile(file) {
    const fileId = this._fileIdCounter++;
    
    const fileData = {
      id: fileId,
      file: file,
      progress: 0,
      status: 'pending', // pending, uploading, completed, error
      error: null,
      element: null,
      progressBar: null
    };
    
    this._files.set(fileId, fileData);
    
    // Create file item element
    const fileElement = this._createFileItem(fileData);
    fileData.element = fileElement;
    
    this._fileListElement.appendChild(fileElement);
    
    return fileId;
  }

  /**
   * Create file item element
   * @private
   * @param {Object} fileData
   * @returns {HTMLElement}
   */
  _createFileItem(fileData) {
    const item = document.createElement('div');
    item.className = 'file-uploader__file-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('data-file-id', fileData.id);
    
    // Create preview if applicable
    if (this.options.showPreview && this._isPreviewable(fileData.file)) {
      const preview = this._createPreview(fileData.file);
      item.appendChild(preview);
    }
    
    // Create file info
    const info = document.createElement('div');
    info.className = 'file-uploader__file-info';
    
    const name = document.createElement('div');
    name.className = 'file-uploader__file-name';
    name.textContent = fileData.file.name;
    name.title = fileData.file.name;
    
    const size = document.createElement('div');
    size.className = 'file-uploader__file-size';
    size.textContent = formatBytes(fileData.file.size);
    
    info.appendChild(name);
    info.appendChild(size);
    item.appendChild(info);
    
    // Create progress bar
    const progressBar = new ProgressBar({
      mode: 'determinate',
      progress: 0,
      size: 'small',
      variant: 'primary',
      showPercentage: true
    });
    
    fileData.progressBar = progressBar;
    item.appendChild(progressBar.element);
    
    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'file-uploader__file-remove';
    removeBtn.setAttribute('aria-label', `Remove ${fileData.file.name}`);
    removeBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    
    removeBtn.addEventListener('click', () => {
      this.removeFile(fileData.id);
    });
    
    item.appendChild(removeBtn);
    
    return item;
  }

  /**
   * Check if file is previewable (image or video)
   * @private
   * @param {File} file
   * @returns {boolean}
   */
  _isPreviewable(file) {
    return file.type.startsWith('image/') || file.type.startsWith('video/');
  }

  /**
   * Create preview element for image/video
   * @private
   * @param {File} file
   * @returns {HTMLElement}
   */
  _createPreview(file) {
    const preview = document.createElement('div');
    preview.className = 'file-uploader__preview';
    
    const url = URL.createObjectURL(file);
    
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = file.name;
      img.className = 'file-uploader__preview-image';
      
      // Revoke URL after image loads
      img.onload = () => URL.revokeObjectURL(url);
      
      preview.appendChild(img);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = url;
      video.className = 'file-uploader__preview-video';
      video.muted = true;
      
      // Revoke URL after video loads
      video.onloadeddata = () => URL.revokeObjectURL(url);
      
      preview.appendChild(video);
    }
    
    return preview;
  }

  /**
   * Show validation errors
   * @private
   * @param {Array} errors
   */
  _showErrors(errors) {
    errors.forEach(({ file, error }) => {
      console.error(`File validation error for ${file.name}:`, error);
      
      // You can implement a toast notification here
      // For now, we'll just log to console
    });
  }

  /**
   * Remove a file from the list
   * @param {number} fileId - File ID to remove
   */
  removeFile(fileId) {
    const fileData = this._files.get(fileId);
    if (!fileData) return;
    
    // Remove element from DOM
    if (fileData.element && fileData.element.parentNode) {
      fileData.element.parentNode.removeChild(fileData.element);
    }
    
    // Destroy progress bar
    if (fileData.progressBar) {
      fileData.progressBar.destroy();
    }
    
    // Remove from map
    this._files.delete(fileId);
  }

  /**
   * Clear all files
   */
  clearFiles() {
    this._files.forEach((fileData, fileId) => {
      this.removeFile(fileId);
    });
    
    this._files.clear();
  }

  /**
   * Upload all pending files
   * @returns {Promise<Array>} Upload results
   */
  async uploadFiles() {
    if (!this.options.uploadFunction) {
      console.error('No upload function provided');
      return [];
    }
    
    const pendingFiles = Array.from(this._files.values()).filter(
      fileData => fileData.status === 'pending'
    );
    
    if (pendingFiles.length === 0) {
      return [];
    }
    
    const results = await Promise.allSettled(
      pendingFiles.map(fileData => this._uploadFile(fileData))
    );
    
    // Call onUploadComplete callback
    if (typeof this.options.onUploadComplete === 'function') {
      this.options.onUploadComplete(results);
    }
    
    return results;
  }

  /**
   * Upload a single file
   * @private
   * @param {Object} fileData
   * @returns {Promise}
   */
  async _uploadFile(fileData) {
    fileData.status = 'uploading';
    fileData.element.classList.add('file-uploader__file-item--uploading');
    
    try {
      // Call custom upload function with progress callback
      const result = await this.options.uploadFunction(fileData.file, (progress) => {
        this._updateFileProgress(fileData.id, progress);
      });
      
      fileData.status = 'completed';
      fileData.element.classList.remove('file-uploader__file-item--uploading');
      fileData.element.classList.add('file-uploader__file-item--completed');
      
      if (fileData.progressBar) {
        fileData.progressBar.setVariant('success');
      }
      
      return result;
    } catch (error) {
      fileData.status = 'error';
      fileData.error = error.message || 'Upload failed';
      fileData.element.classList.remove('file-uploader__file-item--uploading');
      fileData.element.classList.add('file-uploader__file-item--error');
      
      if (fileData.progressBar) {
        fileData.progressBar.setVariant('danger');
      }
      
      // Call onUploadError callback
      if (typeof this.options.onUploadError === 'function') {
        this.options.onUploadError(fileData.file, error);
      }
      
      throw error;
    }
  }

  /**
   * Update file upload progress
   * @private
   * @param {number} fileId
   * @param {number} progress - Progress percentage (0-100)
   */
  _updateFileProgress(fileId, progress) {
    const fileData = this._files.get(fileId);
    if (!fileData) return;
    
    fileData.progress = progress;
    
    if (fileData.progressBar) {
      fileData.progressBar.setProgress(progress);
    }
    
    // Call onUploadProgress callback
    if (typeof this.options.onUploadProgress === 'function') {
      this.options.onUploadProgress(fileData.file, progress);
    }
  }

  /**
   * Get all files
   * @returns {File[]}
   */
  getFiles() {
    return Array.from(this._files.values()).map(fileData => fileData.file);
  }

  /**
   * Get file count
   * @returns {number}
   */
  getFileCount() {
    return this._files.size;
  }

  /**
   * Mount the file uploader to a parent element
   * @param {HTMLElement} parent - Parent element
   */
  mount(parent) {
    if (this._mounted) {
      console.warn('FileUploader is already mounted');
      return;
    }
    
    parent.appendChild(this._element);
    this._mounted = true;
  }

  /**
   * Unmount the file uploader from its parent
   */
  unmount() {
    if (!this._mounted) {
      console.warn('FileUploader is not mounted');
      return;
    }
    
    this._removeEventListeners();
    
    if (this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    
    this._mounted = false;
  }

  /**
   * Destroy the file uploader and clean up
   */
  destroy() {
    this.clearFiles();
    this.unmount();
    this._element = null;
    this._dropzoneElement = null;
    this._inputElement = null;
    this._fileListElement = null;
    this.options = null;
  }

  /**
   * Get the file uploader DOM element
   * @returns {HTMLElement}
   */
  get element() {
    return this._element;
  }

  /**
   * Check if file uploader is mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._mounted;
  }
}

export default FileUploader;
