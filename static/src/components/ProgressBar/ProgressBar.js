/**
 * ProgressBar Component
 * 
 * A reusable progress bar component with determinate and indeterminate modes.
 * Supports percentage labels, custom labels, smooth transitions, and WCAG AA accessibility.
 * 
 * @example
 * import { ProgressBar } from './components/ProgressBar/ProgressBar.js';
 * 
 * const progressBar = new ProgressBar({
 *   mode: 'determinate',
 *   progress: 50,
 *   label: 'Uploading...',
 *   showPercentage: true,
 *   variant: 'primary'
 * });
 * 
 * document.body.appendChild(progressBar.element);
 */

export class ProgressBar {
  /**
   * Create a ProgressBar instance
   * @param {Object} options - ProgressBar configuration
   * @param {string} [options.mode='determinate'] - Progress mode: determinate, indeterminate
   * @param {number} [options.progress=0] - Progress value (0-100) for determinate mode
   * @param {string} [options.label] - Custom label text (e.g., "Uploading...", "Processing...")
   * @param {boolean} [options.showPercentage=true] - Whether to show percentage label
   * @param {string} [options.variant='primary'] - Color variant: primary, success, warning, danger
   * @param {string} [options.size='medium'] - Size variant: small, medium, large
   * @param {string} [options.className] - Additional CSS classes
   * @param {Function} [options.onChange] - Callback when progress changes
   * @param {Function} [options.onComplete] - Callback when progress reaches 100%
   */
  constructor(options = {}) {
    this.options = {
      mode: 'determinate',
      progress: 0,
      label: null,
      showPercentage: true,
      variant: 'primary',
      size: 'medium',
      className: '',
      onChange: null,
      onComplete: null,
      ...options
    };

    this._element = null;
    this._trackElement = null;
    this._fillElement = null;
    this._labelElement = null;
    this._mounted = false;
    this._progress = Math.max(0, Math.min(100, this.options.progress));
    this._completed = this._progress === 100;
    
    this._init();
  }

  /**
   * Initialize the progress bar element
   * @private
   */
  _init() {
    this._element = this._createElement();
  }

  /**
   * Create the progress bar DOM element
   * @private
   * @returns {HTMLElement}
   */
  _createElement() {
    const container = document.createElement('div');
    
    // Build BEM class names
    const classes = ['progress-bar'];
    classes.push(`progress-bar--${this.options.mode}`);
    classes.push(`progress-bar--${this.options.variant}`);
    classes.push(`progress-bar--${this.options.size}`);
    
    if (this.options.className) {
      classes.push(this.options.className);
    }
    
    container.className = classes.join(' ');
    
    // Set ARIA attributes
    container.setAttribute('role', 'progressbar');
    container.setAttribute('aria-valuemin', '0');
    container.setAttribute('aria-valuemax', '100');
    
    if (this.options.mode === 'determinate') {
      container.setAttribute('aria-valuenow', this._progress);
    } else {
      // Indeterminate mode doesn't have a specific value
      container.removeAttribute('aria-valuenow');
    }
    
    if (this.options.label) {
      container.setAttribute('aria-label', this.options.label);
    }
    
    // Build progress bar structure
    container.appendChild(this._createTrack());
    
    if (this.options.label || this.options.showPercentage) {
      container.appendChild(this._createLabel());
    }
    
    return container;
  }

  /**
   * Create progress bar track element
   * @private
   * @returns {HTMLElement}
   */
  _createTrack() {
    const track = document.createElement('div');
    track.className = 'progress-bar__track';
    
    track.appendChild(this._createFill());
    
    this._trackElement = track;
    return track;
  }

  /**
   * Create progress bar fill element
   * @private
   * @returns {HTMLElement}
   */
  _createFill() {
    const fill = document.createElement('div');
    fill.className = 'progress-bar__fill';
    
    if (this.options.mode === 'determinate') {
      fill.style.width = `${this._progress}%`;
    }
    
    this._fillElement = fill;
    return fill;
  }

  /**
   * Create label element
   * @private
   * @returns {HTMLElement}
   */
  _createLabel() {
    const label = document.createElement('div');
    label.className = 'progress-bar__label';
    
    label.innerHTML = this._buildLabelContent();
    
    this._labelElement = label;
    return label;
  }

  /**
   * Build label content HTML
   * @private
   * @returns {string}
   */
  _buildLabelContent() {
    const parts = [];
    
    if (this.options.label) {
      parts.push(`<span class="progress-bar__label-text">${this.options.label}</span>`);
    }
    
    if (this.options.showPercentage && this.options.mode === 'determinate') {
      parts.push(`<span class="progress-bar__label-percentage">${Math.round(this._progress)}%</span>`);
    }
    
    return parts.join('');
  }

  /**
   * Update progress value (determinate mode only)
   * @param {number} progress - Progress value (0-100)
   */
  setProgress(progress) {
    if (this.options.mode !== 'determinate') {
      console.warn('setProgress() only works in determinate mode');
      return;
    }
    
    const oldProgress = this._progress;
    this._progress = Math.max(0, Math.min(100, progress));
    
    // Update fill width
    if (this._fillElement) {
      this._fillElement.style.width = `${this._progress}%`;
    }
    
    // Update ARIA attribute
    this._element.setAttribute('aria-valuenow', this._progress);
    
    // Update percentage label
    if (this.options.showPercentage && this._labelElement) {
      const percentageElement = this._labelElement.querySelector('.progress-bar__label-percentage');
      if (percentageElement) {
        percentageElement.textContent = `${Math.round(this._progress)}%`;
      }
    }
    
    // Call onChange callback
    if (typeof this.options.onChange === 'function' && oldProgress !== this._progress) {
      this.options.onChange(this._progress);
    }
    
    // Call onComplete callback when reaching 100%
    if (this._progress === 100 && !this._completed) {
      this._completed = true;
      if (typeof this.options.onComplete === 'function') {
        this.options.onComplete();
      }
    } else if (this._progress < 100) {
      this._completed = false;
    }
  }

  /**
   * Update custom label text
   * @param {string} label - New label text
   */
  setLabel(label) {
    this.options.label = label;
    
    if (this._labelElement) {
      const labelTextElement = this._labelElement.querySelector('.progress-bar__label-text');
      
      if (labelTextElement) {
        labelTextElement.textContent = label;
      } else if (label) {
        // Create label text element if it doesn't exist
        const newLabelText = document.createElement('span');
        newLabelText.className = 'progress-bar__label-text';
        newLabelText.textContent = label;
        this._labelElement.insertBefore(newLabelText, this._labelElement.firstChild);
      }
    } else if (label || this.options.showPercentage) {
      // Create label element if it doesn't exist
      this._element.appendChild(this._createLabel());
    }
    
    // Update ARIA label
    if (label) {
      this._element.setAttribute('aria-label', label);
    } else {
      this._element.removeAttribute('aria-label');
    }
  }

  /**
   * Switch between determinate and indeterminate modes
   * @param {string} mode - Mode: determinate, indeterminate
   */
  setMode(mode) {
    if (mode !== 'determinate' && mode !== 'indeterminate') {
      console.warn('Invalid mode. Use "determinate" or "indeterminate"');
      return;
    }
    
    const oldMode = this.options.mode;
    this.options.mode = mode;
    
    // Update class
    this._element.classList.remove(`progress-bar--${oldMode}`);
    this._element.classList.add(`progress-bar--${mode}`);
    
    // Update ARIA attributes
    if (mode === 'determinate') {
      this._element.setAttribute('aria-valuenow', this._progress);
      
      // Update fill width
      if (this._fillElement) {
        this._fillElement.style.width = `${this._progress}%`;
      }
    } else {
      this._element.removeAttribute('aria-valuenow');
      
      // Remove inline width for indeterminate animation
      if (this._fillElement) {
        this._fillElement.style.width = '';
      }
    }
    
    // Update label
    if (this._labelElement) {
      this._labelElement.innerHTML = this._buildLabelContent();
    }
  }

  /**
   * Update color variant
   * @param {string} variant - Color variant: primary, success, warning, danger
   */
  setVariant(variant) {
    // Remove old variant class
    this._element.classList.remove(`progress-bar--${this.options.variant}`);
    
    // Add new variant class
    this.options.variant = variant;
    this._element.classList.add(`progress-bar--${variant}`);
  }

  /**
   * Update size variant
   * @param {string} size - Size variant: small, medium, large
   */
  setSize(size) {
    // Remove old size class
    this._element.classList.remove(`progress-bar--${this.options.size}`);
    
    // Add new size class
    this.options.size = size;
    this._element.classList.add(`progress-bar--${size}`);
  }

  /**
   * Reset progress to 0
   */
  reset() {
    this.setProgress(0);
    this._completed = false;
  }

  /**
   * Mount the progress bar to a parent element
   * @param {HTMLElement} parent - Parent element
   */
  mount(parent) {
    if (this._mounted) {
      console.warn('ProgressBar is already mounted');
      return;
    }
    
    parent.appendChild(this._element);
    this._mounted = true;
  }

  /**
   * Unmount the progress bar from its parent
   */
  unmount() {
    if (!this._mounted) {
      console.warn('ProgressBar is not mounted');
      return;
    }
    
    if (this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    
    this._mounted = false;
  }

  /**
   * Destroy the progress bar and clean up
   */
  destroy() {
    this.unmount();
    this._element = null;
    this._trackElement = null;
    this._fillElement = null;
    this._labelElement = null;
    this.options = null;
  }

  /**
   * Get the progress bar DOM element
   * @returns {HTMLElement}
   */
  get element() {
    return this._element;
  }

  /**
   * Check if progress bar is mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._mounted;
  }

  /**
   * Get current progress value
   * @returns {number}
   */
  get progress() {
    return this._progress;
  }

  /**
   * Get current mode
   * @returns {string}
   */
  get mode() {
    return this.options.mode;
  }

  /**
   * Check if progress is complete (100%)
   * @returns {boolean}
   */
  get completed() {
    return this._completed;
  }
}

export default ProgressBar;
