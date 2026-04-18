/**
 * API Client Module
 * 
 * Centralized HTTP client for all backend API communication.
 * Features:
 * - Request/response interceptors
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - FormData upload with progress tracking
 * - Typed error handling
 * 
 * @module api-client
 */

import { API_ENDPOINTS } from './constants.js';

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {Object} data - Response data
   */
  constructor(message, status, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * API Client class for handling all HTTP requests to the backend
 */
export class APIClient {
  /**
   * @param {Object} config - Configuration options
   * @param {number} config.timeout - Default request timeout in milliseconds (default: 30000)
   * @param {number} config.maxRetries - Maximum number of retry attempts (default: 3)
   * @param {number} config.retryDelay - Initial retry delay in milliseconds (default: 1000)
   */
  constructor(config = {}) {
    this.config = {
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };
    
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    // Add default interceptors
    this._addDefaultInterceptors();
  }

  /**
   * Add default request and response interceptors
   * @private
   */
  _addDefaultInterceptors() {
    // Default request interceptor: add common headers
    this.addRequestInterceptor((config) => {
      if (!config.headers) {
        config.headers = {};
      }
      
      // Add Content-Type for JSON requests (unless FormData)
      if (config.body && !(config.body instanceof FormData) && !config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
      
      return config;
    });

    // Default response interceptor: handle common errors
    this.addResponseInterceptor(
      (response) => response,
      (error) => {
        // Handle common HTTP errors
        if (error.status === 401) {
          console.error('Unauthorized: Authentication required');
          // Could dispatch an event here for auth handling
        } else if (error.status === 403) {
          console.error('Forbidden: Access denied');
        } else if (error.status === 500) {
          console.error('Internal Server Error');
        }
        
        throw error;
      }
    );
  }

  /**
   * Add a request interceptor
   * @param {Function} interceptor - Function that receives and returns request config
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   * @param {Function} onSuccess - Function to handle successful responses
   * @param {Function} onError - Function to handle errors
   */
  addResponseInterceptor(onSuccess, onError) {
    this.responseInterceptors.push({ onSuccess, onError });
  }

  /**
   * Apply request interceptors to config
   * @private
   * @param {Object} config - Request configuration
   * @returns {Object} Modified configuration
   */
  _applyRequestInterceptors(config) {
    let modifiedConfig = { ...config };
    
    for (const interceptor of this.requestInterceptors) {
      modifiedConfig = interceptor(modifiedConfig);
    }
    
    return modifiedConfig;
  }

  /**
   * Apply response interceptors
   * @private
   * @param {Response|Error} responseOrError - Response or error object
   * @param {boolean} isError - Whether this is an error
   * @returns {Promise<Response>} Modified response
   */
  async _applyResponseInterceptors(responseOrError, isError = false) {
    let result = responseOrError;
    
    for (const { onSuccess, onError } of this.responseInterceptors) {
      try {
        if (isError && onError) {
          result = await onError(result);
        } else if (!isError && onSuccess) {
          result = await onSuccess(result);
        }
      } catch (error) {
        result = error;
        isError = true;
      }
    }
    
    if (isError) {
      throw result;
    }
    
    return result;
  }

  /**
   * Calculate exponential backoff delay
   * @private
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  _getRetryDelay(attempt) {
    // Exponential backoff: delay * (2 ^ attempt)
    // attempt 0: 1s, attempt 1: 2s, attempt 2: 4s
    return this.config.retryDelay * Math.pow(2, attempt);
  }

  /**
   * Sleep for specified milliseconds
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} Whether the error is retryable
   */
  _isRetryableError(error) {
    // Retry on network errors or 5xx server errors
    if (!error.status) return true; // Network error
    return error.status >= 500 && error.status < 600;
  }

  /**
   * Make HTTP request with timeout
   * @private
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Response>} Fetch response
   */
  async _fetchWithTimeout(url, options, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      
      throw error;
    }
  }

  /**
   * Parse response based on content type
   * @private
   * @param {Response} response - Fetch response
   * @returns {Promise<any>} Parsed response data
   */
  async _parseResponse(response) {
    const contentType = response.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (error) {
        throw new APIError(
          `Failed to parse JSON response (HTTP ${response.status})`,
          response.status
        );
      }
    }
    
    if (contentType.includes('text/')) {
      return await response.text();
    }
    
    // For other content types, return blob
    return await response.blob();
  }

  /**
   * Make HTTP request with retry logic
   * @private
   * @param {string} url - Request URL
   * @param {Object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async _request(url, config = {}) {
    // Apply request interceptors
    const modifiedConfig = this._applyRequestInterceptors(config);
    
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = this.config.timeout,
      maxRetries = this.config.maxRetries,
      onProgress = null,
    } = modifiedConfig;

    let lastError;
    
    // Retry loop
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Prepare fetch options
        const fetchOptions = {
          method,
          headers,
        };
        
        // Handle body
        if (body) {
          if (body instanceof FormData) {
            fetchOptions.body = body;
            // Don't set Content-Type for FormData (browser sets it with boundary)
            delete fetchOptions.headers['Content-Type'];
          } else if (typeof body === 'object') {
            fetchOptions.body = JSON.stringify(body);
          } else {
            fetchOptions.body = body;
          }
        }
        
        // Make request with timeout
        const response = await this._fetchWithTimeout(url, fetchOptions, timeout);
        
        // Parse response
        const data = await this._parseResponse(response);
        
        // Check if response is ok
        if (!response.ok) {
          const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
          const error = new APIError(errorMessage, response.status, data);
          
          // Apply response error interceptors
          await this._applyResponseInterceptors(error, true);
          
          // Check if we should retry
          if (attempt < maxRetries && this._isRetryableError(error)) {
            lastError = error;
            const delay = this._getRetryDelay(attempt);
            console.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
            await this._sleep(delay);
            continue;
          }
          
          throw error;
        }
        
        // Apply response success interceptors
        await this._applyResponseInterceptors(response, false);
        
        return data;
        
      } catch (error) {
        lastError = error;
        
        // If it's not retryable or we've exhausted retries, throw
        if (attempt >= maxRetries || !this._isRetryableError(error)) {
          throw error;
        }
        
        // Wait before retry
        const delay = this._getRetryDelay(attempt);
        console.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
        await this._sleep(delay);
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }

  /**
   * Make GET request
   * @param {string} url - Request URL
   * @param {Object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async get(url, config = {}) {
    return this._request(url, { ...config, method: 'GET' });
  }

  /**
   * Make POST request
   * @param {string} url - Request URL
   * @param {any} body - Request body
   * @param {Object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async post(url, body = null, config = {}) {
    return this._request(url, { ...config, method: 'POST', body });
  }

  /**
   * Make PUT request
   * @param {string} url - Request URL
   * @param {any} body - Request body
   * @param {Object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async put(url, body = null, config = {}) {
    return this._request(url, { ...config, method: 'PUT', body });
  }

  /**
   * Make DELETE request
   * @param {string} url - Request URL
   * @param {Object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async delete(url, config = {}) {
    return this._request(url, { ...config, method: 'DELETE' });
  }

  /**
   * Upload file with progress tracking
   * @param {string} url - Upload URL
   * @param {FormData} formData - Form data containing file
   * @param {Object} config - Request configuration
   * @param {Function} config.onProgress - Progress callback (receives ProgressEvent)
   * @returns {Promise<any>} Response data
   */
  async upload(url, formData, config = {}) {
    const { onProgress, ...restConfig } = config;
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Setup progress tracking
      if (onProgress && xhr.upload) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            onProgress(progress);
          }
        });
      }
      
      // Setup completion handler
      xhr.addEventListener('load', async () => {
        try {
          const contentType = xhr.getResponseHeader('Content-Type') || '';
          let data;
          
          if (contentType.includes('application/json')) {
            data = JSON.parse(xhr.responseText);
          } else {
            data = xhr.responseText;
          }
          
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            const errorMessage = data?.error || data?.message || `HTTP ${xhr.status}`;
            reject(new APIError(errorMessage, xhr.status, data));
          }
        } catch (error) {
          reject(new APIError('Failed to parse response', xhr.status));
        }
      });
      
      // Setup error handler
      xhr.addEventListener('error', () => {
        reject(new APIError('Network error', 0));
      });
      
      // Setup timeout handler
      xhr.addEventListener('timeout', () => {
        reject(new APIError('Request timeout', 408));
      });
      
      // Apply request interceptors to get headers
      const modifiedConfig = this._applyRequestInterceptors({
        ...restConfig,
        body: formData,
      });
      
      // Open request
      xhr.open('POST', url);
      
      // Set timeout
      xhr.timeout = restConfig.timeout || this.config.timeout;
      
      // Set headers (except Content-Type for FormData)
      if (modifiedConfig.headers) {
        Object.entries(modifiedConfig.headers).forEach(([key, value]) => {
          if (key !== 'Content-Type') {
            xhr.setRequestHeader(key, value);
          }
        });
      }
      
      // Send request
      xhr.send(formData);
    });
  }

  // ============================================================================
  // API Endpoint Methods
  // ============================================================================

  /**
   * Get application configuration
   * @returns {Promise<Object>} Configuration object
   */
  async getConfig() {
    return this.get(API_ENDPOINTS.CONFIG);
  }

  /**
   * Save application configuration
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} Updated configuration
   */
  async saveConfig(config) {
    return this.post(API_ENDPOINTS.CONFIG, config);
  }

  /**
   * Get current queue
   * @returns {Promise<Array>} Queue items
   */
  async getQueue() {
    return this.get(API_ENDPOINTS.QUEUE);
  }

  /**
   * Add item to queue
   * @param {Object} item - Queue item
   * @returns {Promise<Object>} Added item
   */
  async addToQueue(item) {
    return this.post(API_ENDPOINTS.QUEUE_ADD, item);
  }

  /**
   * Remove item from queue
   * @param {string} id - Item ID
   * @returns {Promise<Object>} Response
   */
  async removeFromQueue(id) {
    return this.post(API_ENDPOINTS.QUEUE_REMOVE, { id });
  }

  /**
   * Reorder queue items
   * @param {Array<string>} order - Array of item IDs in new order
   * @returns {Promise<Object>} Response
   */
  async reorderQueue(order) {
    return this.post(API_ENDPOINTS.QUEUE_REORDER, { order });
  }

  /**
   * Update queue item
   * @param {string} id - Item ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated item
   */
  async updateQueue(id, updates) {
    return this.post(API_ENDPOINTS.QUEUE_UPDATE, { id, ...updates });
  }

  /**
   * Clear all queue items
   * @returns {Promise<Object>} Response
   */
  async clearQueue() {
    return this.post(API_ENDPOINTS.QUEUE_CLEAR);
  }

  /**
   * Get cookies
   * @returns {Promise<Object>} Cookies object
   */
  async getCookies() {
    return this.get(API_ENDPOINTS.COOKIES);
  }

  /**
   * Save cookies
   * @param {Object} cookies - Cookies object
   * @returns {Promise<Object>} Response
   */
  async saveCookies(cookies) {
    return this.post(API_ENDPOINTS.COOKIES, cookies);
  }

  /**
   * Get cookie mode
   * @returns {Promise<Object>} Cookie mode
   */
  async getCookieMode() {
    return this.get(API_ENDPOINTS.COOKIE_MODE);
  }

  /**
   * Set cookie mode
   * @param {string} mode - Cookie mode (default/custom)
   * @returns {Promise<Object>} Response
   */
  async setCookieMode(mode) {
    return this.post(API_ENDPOINTS.COOKIE_MODE, { mode });
  }

  /**
   * Parse cookie string
   * @param {string} cookieString - Cookie string to parse
   * @returns {Promise<Object>} Parsed cookie
   */
  async parseCookie(cookieString) {
    return this.post(API_ENDPOINTS.PARSE_COOKIE, { cookie: cookieString });
  }

  /**
   * Validate cookie
   * @param {Object} cookie - Cookie object to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateCookie(cookie) {
    return this.post(API_ENDPOINTS.VALIDATE_COOKIE, cookie);
  }

  /**
   * Auto-fetch cookie
   * @returns {Promise<Object>} Fetched cookie
   */
  async autoFetchCookie() {
    return this.post(API_ENDPOINTS.AUTO_FETCH_COOKIE);
  }

  /**
   * Fetch user videos
   * @param {string} url - User URL
   * @param {number} page - Page number (default: 1)
   * @returns {Promise<Object>} User videos data
   */
  async fetchUserVideos(url, page = 1) {
    return this.post(API_ENDPOINTS.USER_VIDEOS_PAGE, { url, page });
  }

  /**
   * Get user info
   * @param {string} url - User URL
   * @returns {Promise<Object>} User info
   */
  async getUserInfo(url) {
    return this.post(API_ENDPOINTS.USER_INFO, { url });
  }

  /**
   * Get history
   * @returns {Promise<Array>} History items
   */
  async getHistory() {
    return this.get(API_ENDPOINTS.HISTORY);
  }

  /**
   * Clear history
   * @returns {Promise<Object>} Response
   */
  async clearHistory() {
    return this.post(API_ENDPOINTS.HISTORY_CLEAR);
  }

  /**
   * Process video
   * @param {Object} data - Video processing data
   * @returns {Promise<Object>} Processing result
   */
  async processVideo(data) {
    return this.post(API_ENDPOINTS.PROCESS_VIDEO, data, {
      timeout: 300000 // 5 minutes
    });
  }

  /**
   * Proxy image
   * @param {string} url - Image URL to proxy
   * @returns {Promise<Object>} Proxied image data
   */
  async proxyImage(url) {
    return this.post(API_ENDPOINTS.PROXY_IMAGE, { url });
  }

  /**
   * Upload anti-fingerprint image
   * @param {FormData} formData - Form data containing image
   * @returns {Promise<Object>} Upload result
   */
  async uploadAntiFingerprint(formData) {
    return this.upload(API_ENDPOINTS.UPLOAD_ANTI_FP_IMAGE, formData);
  }

  /**
   * Upload image
   * @param {FormData} formData - Form data containing image
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result
   */
  async uploadImage(formData, onProgress) {
    return this.upload(API_ENDPOINTS.UPLOAD_IMAGE, formData, { onProgress });
  }

  /**
   * Browse file
   * @param {string} path - File path to browse
   * @returns {Promise<Object>} File data
   */
  async browseFile(path) {
    return this.post(API_ENDPOINTS.BROWSE_FILE, { path });
  }

  /**
   * Transcribe audio/video
   * @param {FormData} formData - Form data containing audio/video file
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(formData, onProgress) {
    return this.upload(API_ENDPOINTS.TRANSCRIBE, formData, {
      onProgress,
      timeout: 600000 // 10 minutes
    });
  }

  /**
   * Extract audio from video
   * @param {string} videoPath - Video file path
   * @returns {Promise<Object>} Extracted audio data
   */
  async extractAudio(videoPath) {
    return this.post(API_ENDPOINTS.EXTRACT_AUDIO, { video_path: videoPath });
  }

  /**
   * Translate text
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language code
   * @returns {Promise<Object>} Translation result
   */
  async translate(text, targetLang) {
    return this.post(API_ENDPOINTS.TRANSLATE, { text, target_lang: targetLang });
  }

  /**
   * Translate batch of texts
   * @param {Array<string>} texts - Texts to translate
   * @param {string} targetLang - Target language code
   * @returns {Promise<Object>} Translation results
   */
  async translateBatch(texts, targetLang) {
    return this.post(API_ENDPOINTS.TRANSLATE_BATCH, { texts, target_lang: targetLang });
  }

  /**
   * Get translation status
   * @param {string} taskId - Translation task ID
   * @returns {Promise<Object>} Translation status
   */
  async getTranslationStatus(taskId) {
    return this.get(`${API_ENDPOINTS.TRANSLATION_STATUS}/${taskId}`);
  }

  /**
   * Get TTS preview
   * @param {string} text - Text to convert to speech
   * @param {string} voice - Voice ID
   * @returns {Promise<Object>} TTS preview data
   */
  async getTTSPreview(text, voice) {
    return this.post(API_ENDPOINTS.TTS_PREVIEW, { text, voice });
  }

  /**
   * Generate TTS from ASS file
   * @param {string} assFile - ASS file path
   * @param {string} voice - Voice ID
   * @returns {Promise<Object>} TTS generation result
   */
  async generateTTSFromASS(assFile, voice) {
    return this.post(API_ENDPOINTS.TTS_FROM_ASS, { ass_file: assFile, voice });
  }

  /**
   * Get HuggingFace TTS models
   * @returns {Promise<Array>} Available TTS models
   */
  async getHFTTSModels() {
    return this.get(API_ENDPOINTS.HF_TTS_MODELS);
  }

  /**
   * Get HuggingFace voices
   * @returns {Promise<Array>} Available voices
   */
  async getHFVoices() {
    return this.get(API_ENDPOINTS.HF_VOICES);
  }

  /**
   * Upload HuggingFace voice
   * @param {FormData} formData - Form data containing voice file
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result
   */
  async uploadHFVoice(formData, onProgress) {
    return this.upload(API_ENDPOINTS.HF_VOICES_UPLOAD, formData, { onProgress });
  }

  /**
   * Delete HuggingFace voice
   * @param {string} name - Voice name
   * @returns {Promise<Object>} Delete result
   */
  async deleteHFVoice(name) {
    return this.delete(API_ENDPOINTS.HF_VOICES_DELETE(name));
  }

  /**
   * Initiate YouTube authentication
   * @returns {Promise<Object>} Auth URL and data
   */
  async initiateYouTubeAuth() {
    return this.get(API_ENDPOINTS.YOUTUBE_AUTH);
  }

  /**
   * Initiate TikTok authentication
   * @returns {Promise<Object>} Auth URL and data
   */
  async initiateTikTokAuth() {
    return this.get(API_ENDPOINTS.TIKTOK_AUTH);
  }

  /**
   * Logout from TikTok
   * @returns {Promise<Object>} Logout result
   */
  async tiktokLogout() {
    return this.post(API_ENDPOINTS.TIKTOK_LOGOUT);
  }

  /**
   * Get TikTok credentials status
   * @returns {Promise<Object>} Credentials status
   */
  async getTikTokCredentialsStatus() {
    return this.get(API_ENDPOINTS.TIKTOK_CREDENTIALS_STATUS);
  }

  /**
   * Get Ngrok status
   * @returns {Promise<Object>} Ngrok status
   */
  async getNgrokStatus() {
    return this.get(API_ENDPOINTS.NGROK_STATUS);
  }
}

/**
 * Create and export a default API client instance
 */
export const api = new APIClient();

/**
 * Export default instance
 */
export default api;
