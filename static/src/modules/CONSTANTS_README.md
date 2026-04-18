# Constants Module

The constants module provides centralized constants for the entire application, ensuring consistency and making it easy to update values across the codebase.

## Overview

This module exports all application constants as named exports, organized into logical groups:

- **API Endpoints**: All backend API routes
- **Responsive Breakpoints**: Screen size breakpoints for responsive design
- **Theme Colors**: Color palette for light and dark modes
- **Configuration Keys**: Keys for accessing config values
- **Layout Constants**: UI layout dimensions
- **Timing Constants**: Animation and debouncing timings
- **HTTP Status Codes**: Common HTTP status codes
- **Enums**: Various enumeration constants

## Installation

The constants module is part of the core modules and doesn't require separate installation.

## Usage

### Importing Constants

```javascript
// Import specific constants
import { API_ENDPOINTS, BREAKPOINTS, COLORS } from './modules/constants.js';

// Import all constants
import * as CONSTANTS from './modules/constants.js';
```

### API Endpoints

Use API endpoints for making requests to the backend:

```javascript
import { API_ENDPOINTS, HTTP_STATUS } from './modules/constants.js';

// Fetch configuration
const response = await fetch(API_ENDPOINTS.CONFIG);
if (response.status === HTTP_STATUS.OK) {
  const config = await response.json();
}

// Add item to queue
await fetch(API_ENDPOINTS.QUEUE_ADD, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: videoUrl }),
});

// Delete HuggingFace voice (dynamic endpoint)
await fetch(API_ENDPOINTS.HF_VOICES_DELETE('voice-name'), {
  method: 'DELETE',
});
```

### Responsive Breakpoints

Use breakpoints for responsive design logic:

```javascript
import { BREAKPOINTS, MEDIA_QUERIES } from './modules/constants.js';

// Check viewport size
function isMobile() {
  return window.innerWidth < BREAKPOINTS.MD;
}

// Use media queries
const mobileQuery = window.matchMedia(MEDIA_QUERIES.MOBILE);
mobileQuery.addEventListener('change', (e) => {
  if (e.matches) {
    // Mobile view
  }
});
```

### Theme Colors

Use colors for consistent styling:

```javascript
import { COLORS } from './modules/constants.js';

// Apply colors programmatically
button.style.backgroundColor = COLORS.PRIMARY;
button.style.color = '#ffffff';

// Use in canvas/chart libraries
const chartColors = {
  primary: COLORS.PRIMARY,
  success: COLORS.SUCCESS,
  danger: COLORS.DANGER,
};
```

### Configuration Keys

Use config keys to access nested configuration values:

```javascript
import { CONFIG_KEYS } from './modules/constants.js';

// Access nested config values
const transcriptEnabled = config[CONFIG_KEYS.TRANSCRIPT_ENABLED];
const ttsEngine = config[CONFIG_KEYS.VIDEO_PROCESS_TTS_ENGINE];

// Helper function for dot notation access
function getConfigValue(config, key) {
  const keys = key.split('.');
  return keys.reduce((obj, k) => obj?.[k], config);
}

const model = getConfigValue(config, CONFIG_KEYS.TRANSCRIPT_MODEL);
```

### Layout Constants

Use layout constants for UI dimensions:

```javascript
import { LAYOUT } from './modules/constants.js';

// Set sidebar width
sidebar.style.width = `${LAYOUT.SIDEBAR_WIDTH}px`;

// Ensure touch targets meet accessibility standards
button.style.minWidth = `${LAYOUT.TOUCH_TARGET_MIN}px`;
button.style.minHeight = `${LAYOUT.TOUCH_TARGET_MIN}px`;
```

### Timing Constants

Use timing constants for animations and debouncing:

```javascript
import { TIMING } from './modules/constants.js';

// Debounce function
function debounce(func, delay = TIMING.DEBOUNCE_DEFAULT) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Use in search
searchInput.addEventListener('input', debounce((e) => {
  performSearch(e.target.value);
}, TIMING.DEBOUNCE_SEARCH));

// CSS transitions
element.style.transition = `all ${TIMING.TRANSITION_BASE}ms ease-in-out`;
```

### Theme Management

Use theme constants for theme switching:

```javascript
import { THEMES, THEME_STORAGE_KEY } from './modules/constants.js';

// Get current theme
const currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || THEMES.LIGHT;

// Toggle theme
function toggleTheme() {
  const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_STORAGE_KEY, newTheme);
}
```

### Enums

Use enum constants for type-safe values:

```javascript
import {
  COOKIE_MODES,
  UPLOAD_PLATFORMS,
  PRIVACY_STATUS,
  TTS_ENGINES,
  VIDEO_PROCESS_MODES,
  BLUR_ZONES,
  LOG_LEVELS,
} from './modules/constants.js';

// Cookie mode selection
if (cookieMode === COOKIE_MODES.CUSTOM) {
  // Show custom cookie editor
}

// Upload platform selection
if (platform === UPLOAD_PLATFORMS.YOUTUBE) {
  // YouTube upload logic
}

// Log with level
function log(message, level = LOG_LEVELS.INFO) {
  console.log(`[${level.toUpperCase()}] ${message}`);
}
```

## Available Constants

### API_ENDPOINTS

All backend API routes:

- `CONFIG` - Get/save configuration
- `QUEUE`, `QUEUE_ADD`, `QUEUE_REMOVE`, `QUEUE_REORDER`, `QUEUE_UPDATE`, `QUEUE_CLEAR` - Queue management
- `COOKIES`, `COOKIE_MODE`, `PARSE_COOKIE`, `VALIDATE_COOKIE`, `AUTO_FETCH_COOKIE` - Cookie management
- `USER_VIDEOS_PAGE`, `USER_INFO` - User video fetching
- `HISTORY`, `HISTORY_CLEAR` - History management
- `PROCESS_VIDEO`, `PROXY_IMAGE`, `UPLOAD_ANTI_FP_IMAGE`, `UPLOAD_IMAGE`, `BROWSE_FILE` - Video processing
- `TRANSCRIBE`, `EXTRACT_AUDIO` - Transcription
- `TRANSLATE`, `TRANSLATE_BATCH`, `TRANSLATION_STATUS` - Translation
- `TTS_PREVIEW`, `TTS_FROM_ASS`, `HF_TTS_MODELS`, `HF_VOICES`, `HF_VOICES_UPLOAD`, `HF_VOICES_DELETE` - TTS
- `YOUTUBE_AUTH`, `YOUTUBE_CALLBACK` - YouTube upload
- `TIKTOK_AUTH`, `TIKTOK_LOGOUT`, `TIKTOK_CALLBACK`, `TIKTOK_CREDENTIALS_STATUS` - TikTok upload
- `NGROK_STATUS` - Ngrok tunnel status

### BREAKPOINTS

Responsive breakpoints (in pixels):

- `XS: 320` - Small mobile
- `SM: 375` - Mobile
- `MD: 768` - Tablet
- `LG: 1024` - Desktop
- `XL: 1440` - Large desktop

### MEDIA_QUERIES

Media query strings for JavaScript:

- `XS`, `SM`, `MD`, `LG`, `XL` - Min-width queries
- `MOBILE` - Max-width for mobile
- `TABLET` - Tablet range
- `DESKTOP` - Min-width for desktop

### COLORS

Complete color palette matching SCSS variables:

- Primary: `PRIMARY`, `PRIMARY_LIGHT`, `PRIMARY_DARK`
- Secondary: `SECONDARY`, `SECONDARY_LIGHT`, `SECONDARY_DARK`
- Semantic: `SUCCESS`, `WARNING`, `DANGER`, `INFO` (with light/dark variants)
- Neutral: `GRAY_50` through `GRAY_900`
- Dark mode: `DARK_BG`, `DARK_TEXT`, `DARK_BORDER` (with variants)
- Light mode: `LIGHT_BG`, `LIGHT_TEXT`, `LIGHT_BORDER` (with variants)

### CONFIG_KEYS

All configuration keys with dot notation for nested values:

- Download settings: `PATH`, `MUSIC`, `COVER`, `THREAD`, etc.
- Transcript settings: `TRANSCRIPT_ENABLED`, `TRANSCRIPT_MODEL`, etc.
- Translation settings: `TRANSLATION_DEEPSEEK_KEY`, `TRANSLATION_PREFERRED_PROVIDER`, etc.
- Upload settings: `UPLOAD_YOUTUBE_TITLE_TEMPLATE`, `UPLOAD_TIKTOK_PRIVACY_STATUS`, etc.
- Video processing: `VIDEO_PROCESS_ENABLED`, `VIDEO_PROCESS_TTS_ENGINE`, etc.

### LAYOUT

UI layout dimensions:

- `SIDEBAR_WIDTH: 280` - Full sidebar width
- `SIDEBAR_COLLAPSED_WIDTH: 72` - Collapsed sidebar width
- `TOPBAR_HEIGHT: 64` - Top bar height
- `CONTAINER_MAX_WIDTH: 1280` - Max container width
- `TOUCH_TARGET_MIN: 44` - Minimum touch target size

### TIMING

Animation and debouncing timings (in milliseconds):

- Transitions: `TRANSITION_FAST: 150`, `TRANSITION_BASE: 200`, `TRANSITION_SLOW: 300`
- Debouncing: `DEBOUNCE_DEFAULT: 300`, `DEBOUNCE_SEARCH: 500`
- Throttling: `THROTTLE_DEFAULT: 100`, `THROTTLE_SCROLL: 100`, `THROTTLE_RESIZE: 200`

### HTTP_STATUS

Common HTTP status codes:

- `OK: 200`, `CREATED: 201`, `NO_CONTENT: 204`
- `BAD_REQUEST: 400`, `UNAUTHORIZED: 401`, `FORBIDDEN: 403`, `NOT_FOUND: 404`
- `INTERNAL_SERVER_ERROR: 500`, `SERVICE_UNAVAILABLE: 503`

### Enums

Various enumeration constants:

- `THEMES`: `LIGHT`, `DARK`
- `COOKIE_MODES`: `DEFAULT`, `CUSTOM`
- `UPLOAD_PLATFORMS`: `YOUTUBE`, `TIKTOK`
- `PRIVACY_STATUS`: `PUBLIC`, `PRIVATE`, `UNLISTED`
- `TTS_ENGINES`: `EDGE_TTS`, `FPT_TTS`, `HUGGINGFACE`
- `VIDEO_PROCESS_MODES`: `AI`, `MANUAL`
- `BLUR_ZONES`: `TOP`, `BOTTOM`, `FULL`
- `LOG_LEVELS`: `INFO`, `SUCCESS`, `WARNING`, `ERROR`, `DEBUG`

## Best Practices

1. **Always use constants instead of hardcoded values**
   ```javascript
   // ❌ Bad
   fetch('/api/config')
   
   // ✅ Good
   fetch(API_ENDPOINTS.CONFIG)
   ```

2. **Use breakpoints for responsive logic**
   ```javascript
   // ❌ Bad
   if (window.innerWidth < 768) { }
   
   // ✅ Good
   if (window.innerWidth < BREAKPOINTS.MD) { }
   ```

3. **Use config keys for nested access**
   ```javascript
   // ❌ Bad
   const enabled = config.transcript.enabled;
   
   // ✅ Good
   const enabled = getConfigValue(config, CONFIG_KEYS.TRANSCRIPT_ENABLED);
   ```

4. **Use timing constants for consistency**
   ```javascript
   // ❌ Bad
   setTimeout(() => {}, 300);
   
   // ✅ Good
   setTimeout(() => {}, TIMING.DEBOUNCE_DEFAULT);
   ```

## Maintenance

When adding new constants:

1. Add them to the appropriate section in `constants.js`
2. Export them as named exports
3. Add JSDoc comments for documentation
4. Update this README with the new constants
5. Add tests in `constants.test.js`
6. Add usage examples in `constants.example.js`

## Related Files

- `constants.js` - Main constants module
- `constants.test.js` - Unit tests
- `constants.example.js` - Usage examples
- `_variables.scss` - SCSS variables (should match color/layout constants)

## Requirements

This module satisfies **Requirement 5.9** from the spec:
- ✅ Contains all API endpoints
- ✅ Contains responsive breakpoints
- ✅ Contains theme colors
- ✅ Contains configuration keys
- ✅ Exports all constants as named exports
