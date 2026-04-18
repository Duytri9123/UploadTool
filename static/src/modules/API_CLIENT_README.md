# API Client Module

The API Client module provides a centralized, robust HTTP client for all backend API communication in the TikTok/YouTube Downloader application.

## Features

- **Request/Response Interceptors**: Modify requests before sending and responses before processing
- **Automatic Retry**: Exponential backoff retry logic for failed requests (max 3 retries)
- **Timeout Handling**: Configurable request timeout (default 30s)
- **Progress Tracking**: Upload progress events for file uploads
- **Error Handling**: Typed errors with status codes and response data
- **FormData Support**: Automatic handling of FormData for file uploads

## Installation

```javascript
import { APIClient, apiClient, APIError } from './modules/api-client.js';
```

## Basic Usage

### Using the Default Instance

The module exports a pre-configured default instance:

```javascript
import apiClient from './modules/api-client.js';

// GET request
const data = await apiClient.get('/api/config');

// POST request
const result = await apiClient.post('/api/queue/add', {
  url: 'https://example.com/video',
  mode: 'video'
});

// PUT request
await apiClient.put('/api/config', { theme: 'dark' });

// DELETE request
await apiClient.delete('/api/queue/remove/123');
```

### Creating a Custom Instance

```javascript
import { APIClient } from './modules/api-client.js';

const customClient = new APIClient({
  timeout: 60000,      // 60 seconds
  maxRetries: 5,       // 5 retry attempts
  retryDelay: 2000,    // 2 second initial delay
});
```

## Advanced Features

### Request Interceptors

Add custom headers or modify requests before they're sent:

```javascript
apiClient.addRequestInterceptor((config) => {
  // Add authentication token
  config.headers = {
    ...config.headers,
    'Authorization': `Bearer ${getAuthToken()}`,
  };
  
  return config;
});
```

### Response Interceptors

Handle responses or errors globally:

```javascript
apiClient.addResponseInterceptor(
  // Success handler
  (response) => {
    console.log('Request succeeded:', response);
    return response;
  },
  // Error handler
  (error) => {
    if (error.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    throw error;
  }
);
```

### File Upload with Progress

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'my-file');

try {
  const result = await apiClient.upload('/api/upload', formData, {
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress.percentage}%`);
      console.log(`Loaded: ${progress.loaded} / ${progress.total} bytes`);
      
      // Update UI
      progressBar.style.width = `${progress.percentage}%`;
    },
    timeout: 120000, // 2 minutes for large files
  });
  
  console.log('Upload complete:', result);
} catch (error) {
  console.error('Upload failed:', error.message);
}
```

### Error Handling

```javascript
import { APIError } from './modules/api-client.js';

try {
  const data = await apiClient.get('/api/user_videos');
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API Error ${error.status}: ${error.message}`);
    console.error('Response data:', error.data);
    
    // Handle specific errors
    switch (error.status) {
      case 404:
        showNotification('Resource not found');
        break;
      case 500:
        showNotification('Server error, please try again');
        break;
      default:
        showNotification(error.message);
    }
  } else {
    console.error('Network error:', error);
  }
}
```

### Custom Timeout per Request

```javascript
// Short timeout for quick operations
const config = await apiClient.get('/api/config', {
  timeout: 5000, // 5 seconds
});

// Long timeout for heavy operations
const result = await apiClient.post('/api/process_video', videoData, {
  timeout: 300000, // 5 minutes
});
```

## Retry Logic

The API client automatically retries failed requests with exponential backoff:

- **Retryable errors**: Network errors and 5xx server errors
- **Non-retryable errors**: 4xx client errors (bad request, not found, etc.)
- **Retry schedule**: 1s → 2s → 4s (exponential backoff)
- **Max retries**: 3 attempts (configurable)

```javascript
// This will retry up to 3 times on 5xx errors
try {
  const data = await apiClient.get('/api/unstable-endpoint');
} catch (error) {
  // Only throws after all retries are exhausted
  console.error('All retries failed:', error);
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | number | 30000 | Request timeout in milliseconds |
| `maxRetries` | number | 3 | Maximum number of retry attempts |
| `retryDelay` | number | 1000 | Initial retry delay in milliseconds |

## API Reference

### APIClient Class

#### Constructor

```javascript
new APIClient(config)
```

**Parameters:**
- `config` (Object, optional): Configuration options
  - `timeout` (number): Request timeout in ms
  - `maxRetries` (number): Max retry attempts
  - `retryDelay` (number): Initial retry delay in ms

#### Methods

##### `get(url, config)`

Make a GET request.

**Parameters:**
- `url` (string): Request URL
- `config` (Object, optional): Request configuration

**Returns:** Promise<any>

##### `post(url, body, config)`

Make a POST request.

**Parameters:**
- `url` (string): Request URL
- `body` (any): Request body (Object, FormData, or string)
- `config` (Object, optional): Request configuration

**Returns:** Promise<any>

##### `put(url, body, config)`

Make a PUT request.

**Parameters:**
- `url` (string): Request URL
- `body` (any): Request body
- `config` (Object, optional): Request configuration

**Returns:** Promise<any>

##### `delete(url, config)`

Make a DELETE request.

**Parameters:**
- `url` (string): Request URL
- `config` (Object, optional): Request configuration

**Returns:** Promise<any>

##### `upload(url, formData, config)`

Upload file with progress tracking.

**Parameters:**
- `url` (string): Upload URL
- `formData` (FormData): Form data containing file
- `config` (Object, optional): Request configuration
  - `onProgress` (Function): Progress callback

**Returns:** Promise<any>

##### `addRequestInterceptor(interceptor)`

Add a request interceptor.

**Parameters:**
- `interceptor` (Function): Function that receives and returns request config

##### `addResponseInterceptor(onSuccess, onError)`

Add a response interceptor.

**Parameters:**
- `onSuccess` (Function): Success handler
- `onError` (Function): Error handler

### APIError Class

Custom error class for API errors.

**Properties:**
- `message` (string): Error message
- `status` (number): HTTP status code
- `data` (any): Response data

## Integration with Constants

The API client works seamlessly with the constants module:

```javascript
import apiClient from './modules/api-client.js';
import { API_ENDPOINTS } from './modules/constants.js';

// Fetch user videos
const videos = await apiClient.get(API_ENDPOINTS.USER_VIDEOS_PAGE);

// Process video
const result = await apiClient.post(API_ENDPOINTS.PROCESS_VIDEO, {
  url: videoUrl,
  options: processOptions,
});

// Upload to YouTube
await apiClient.post(API_ENDPOINTS.YOUTUBE_AUTH, authData);
```

## Best Practices

1. **Use the default instance** for most cases to share interceptors and configuration
2. **Add interceptors early** in your application initialization
3. **Handle errors gracefully** with try-catch blocks
4. **Use appropriate timeouts** based on operation type
5. **Track upload progress** for better UX on file uploads
6. **Don't retry on 4xx errors** (they won't succeed on retry)
7. **Use FormData** for file uploads, not JSON

## Examples

### Complete Example: Video Processing

```javascript
import apiClient from './modules/api-client.js';
import { API_ENDPOINTS } from './modules/constants.js';

async function processVideo(videoUrl, options) {
  try {
    // Start processing
    const result = await apiClient.post(
      API_ENDPOINTS.PROCESS_VIDEO,
      { url: videoUrl, ...options },
      { timeout: 300000 } // 5 minutes
    );
    
    return result;
  } catch (error) {
    if (error.status === 400) {
      throw new Error('Invalid video URL');
    } else if (error.status === 500) {
      throw new Error('Server error, please try again');
    } else {
      throw new Error('Failed to process video');
    }
  }
}

// Usage
try {
  const result = await processVideo('https://tiktok.com/@user/video/123', {
    quality: 'high',
    format: 'mp4',
  });
  
  console.log('Video processed:', result);
} catch (error) {
  console.error('Processing failed:', error.message);
}
```

### Complete Example: File Upload with Progress

```javascript
import apiClient from './modules/api-client.js';
import { API_ENDPOINTS } from './modules/constants.js';

async function uploadImage(file, progressCallback) {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const result = await apiClient.upload(
      API_ENDPOINTS.UPLOAD_IMAGE,
      formData,
      {
        onProgress: progressCallback,
        timeout: 120000, // 2 minutes
      }
    );
    
    return result;
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

// Usage
const fileInput = document.getElementById('file-input');
const progressBar = document.getElementById('progress-bar');

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  try {
    const result = await uploadImage(file, (progress) => {
      progressBar.style.width = `${progress.percentage}%`;
      progressBar.textContent = `${progress.percentage}%`;
    });
    
    console.log('Upload complete:', result);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
});
```

## Testing

The module includes comprehensive unit tests. Run tests with:

```bash
npm test api-client.test.js
```

## Requirements Validation

This implementation satisfies the following requirements from the spec:

- **6.1**: ✅ APIClient class handles all HTTP requests
- **6.3**: ✅ Request interceptor for common headers
- **6.4**: ✅ Response interceptor for common errors (401, 403, 500)
- **6.6**: ✅ Retry with exponential backoff (max 3 retries)
- **6.7**: ✅ Request timeout (default 30s, configurable)
- **6.9**: ✅ FormData upload support
- **6.10**: ✅ Progress events for file uploads

## Future Enhancements

- WebSocket support for real-time updates
- Request cancellation
- Request deduplication
- Response caching
- Request queuing
