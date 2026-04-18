# Frontend Architecture Rebuild - Implementation Guide

## 📊 Current Progress: 8/62 Tasks Complete (13%)

This guide provides detailed instructions for completing the remaining 54 tasks of the frontend architecture rebuild.

---

## ✅ Completed Tasks (1-8)

### Task 1: Build System ✅
- Vite 5.x configured with SCSS support
- Directory structure created: `static/src/{components,pages,modules,styles,assets}`
- NPM scripts: `dev`, `build`, `preview`
- Output: `static/dist/`

### Tasks 2.1-2.3: SCSS Foundation ✅
- `_variables.scss`: Colors, spacing, typography, breakpoints
- `_mixins.scss`: Responsive, flexbox, animation mixins
- `_base.scss`: CSS reset, theme system with CSS custom properties
- `main.scss`: Proper import order
- WCAG AA compliant colors verified

### Tasks 3.1-3.4: Core Modules ✅
- `constants.js`: 40+ API endpoints, breakpoints, colors, config keys
- `utils.js`: debounce, throttle, DOM helpers, formatters
- `validators.js`: URL, form, file validation with real-time debouncing
- `formatters.js`: i18n support for numbers, dates, currency

### Task 4.1: API Client Base ✅
- `api-client.js`: Request/response interceptors, retry logic, timeout, FormData upload

---

## 🔄 Next Priority Tasks

### Task 4.2: Add API Endpoint Methods (HIGH PRIORITY)

**File:** `static/src/modules/api-client.js`

**Add these methods to the APIClient class:**

```javascript
// Configuration
async getConfig() {
  return this.get(API_ENDPOINTS.CONFIG);
}

async saveConfig(config) {
  return this.post(API_ENDPOINTS.CONFIG, config);
}

// Queue Management
async getQueue() {
  return this.get(API_ENDPOINTS.QUEUE);
}

async addToQueue(item) {
  return this.post(API_ENDPOINTS.QUEUE_ADD, item);
}

async removeFromQueue(id) {
  return this.post(API_ENDPOINTS.QUEUE_REMOVE, { id });
}

async reorderQueue(order) {
  return this.post(API_ENDPOINTS.QUEUE_REORDER, { order });
}

async updateQueue(id, updates) {
  return this.post(API_ENDPOINTS.QUEUE_UPDATE, { id, ...updates });
}

async clearQueue() {
  return this.post(API_ENDPOINTS.QUEUE_CLEAR);
}

// Cookie Management
async getCookies() {
  return this.get(API_ENDPOINTS.COOKIES);
}

async saveCookies(cookies) {
  return this.post(API_ENDPOINTS.COOKIES, cookies);
}

async getCookieMode() {
  return this.get(API_ENDPOINTS.COOKIE_MODE);
}

async setCookieMode(mode) {
  return this.post(API_ENDPOINTS.COOKIE_MODE, { mode });
}

async parseCookie(cookieString) {
  return this.post(API_ENDPOINTS.PARSE_COOKIE, { cookie: cookieString });
}

async validateCookie(cookie) {
  return this.post(API_ENDPOINTS.VALIDATE_COOKIE, cookie);
}

async autoFetchCookie() {
  return this.post(API_ENDPOINTS.AUTO_FETCH_COOKIE);
}

// User Videos
async fetchUserVideos(url, page = 1) {
  return this.post(API_ENDPOINTS.USER_VIDEOS_PAGE, { url, page });
}

async getUserInfo(url) {
  return this.post(API_ENDPOINTS.USER_INFO, { url });
}

// History
async getHistory() {
  return this.get(API_ENDPOINTS.HISTORY);
}

async clearHistory() {
  return this.post(API_ENDPOINTS.HISTORY_CLEAR);
}

// Video Processing
async processVideo(data) {
  return this.post(API_ENDPOINTS.PROCESS_VIDEO, data, {
    timeout: 300000 // 5 minutes
  });
}

async proxyImage(url) {
  return this.post(API_ENDPOINTS.PROXY_IMAGE, { url });
}

async uploadAntiFingerprint(formData) {
  return this.upload(API_ENDPOINTS.UPLOAD_ANTI_FP_IMAGE, formData);
}

async uploadImage(formData, onProgress) {
  return this.upload(API_ENDPOINTS.UPLOAD_IMAGE, formData, { onProgress });
}

async browseFile(path) {
  return this.post(API_ENDPOINTS.BROWSE_FILE, { path });
}

// Transcription
async transcribe(formData, onProgress) {
  return this.upload(API_ENDPOINTS.TRANSCRIBE, formData, {
    onProgress,
    timeout: 600000 // 10 minutes
  });
}

async extractAudio(videoPath) {
  return this.post(API_ENDPOINTS.EXTRACT_AUDIO, { video_path: videoPath });
}

// Translation
async translate(text, targetLang) {
  return this.post(API_ENDPOINTS.TRANSLATE, { text, target_lang: targetLang });
}

async translateBatch(texts, targetLang) {
  return this.post(API_ENDPOINTS.TRANSLATE_BATCH, { texts, target_lang: targetLang });
}

async getTranslationStatus(taskId) {
  return this.get(`${API_ENDPOINTS.TRANSLATION_STATUS}/${taskId}`);
}

// TTS (Text-to-Speech)
async getTTSPreview(text, voice) {
  return this.post(API_ENDPOINTS.TTS_PREVIEW, { text, voice });
}

async generateTTSFromASS(assFile, voice) {
  return this.post(API_ENDPOINTS.TTS_FROM_ASS, { ass_file: assFile, voice });
}

async getHFTTSModels() {
  return this.get(API_ENDPOINTS.HF_TTS_MODELS);
}

async getHFVoices() {
  return this.get(API_ENDPOINTS.HF_VOICES);
}

async uploadHFVoice(formData, onProgress) {
  return this.upload(API_ENDPOINTS.HF_VOICES_UPLOAD, formData, { onProgress });
}

async deleteHFVoice(name) {
  return this.delete(API_ENDPOINTS.HF_VOICES_DELETE(name));
}

// YouTube Upload
async initiateYouTubeAuth() {
  return this.get(API_ENDPOINTS.YOUTUBE_AUTH);
}

// TikTok Upload
async initiateTikTokAuth() {
  return this.get(API_ENDPOINTS.TIKTOK_AUTH);
}

async tiktokLogout() {
  return this.post(API_ENDPOINTS.TIKTOK_LOGOUT);
}

async getTikTokCredentialsStatus() {
  return this.get(API_ENDPOINTS.TIKTOK_CREDENTIALS_STATUS);
}

// Ngrok
async getNgrokStatus() {
  return this.get(API_ENDPOINTS.NGROK_STATUS);
}
```

**Export the enhanced client:**
```javascript
export const api = new APIClient();
export default api;
```

---

### Tasks 5.1-5.2: State Manager (HIGH PRIORITY)

**File:** `static/src/modules/state-manager.js`

**Implementation:**

```javascript
/**
 * State Manager Module
 * Centralized state management with observer pattern
 */

export class StateManager {
  constructor() {
    this.state = {
      queue: [],
      progress: {},
      config: {},
      auth: {
        youtube: false,
        tiktok: false,
      },
      theme: 'light',
      ui: {
        sidebarCollapsed: false,
        activeTab: 'process',
      },
    };
    
    this.observers = {};
    this.persistKeys = ['theme', 'config', 'auth', 'ui'];
    
    this._loadPersistedState();
  }

  // Load state from localStorage
  _loadPersistedState() {
    this.persistKeys.forEach(key => {
      const stored = localStorage.getItem(`app-state-${key}`);
      if (stored) {
        try {
          this.state[key] = JSON.parse(stored);
        } catch (e) {
          console.warn(`Failed to parse stored state for ${key}:`, e);
        }
      }
    });
  }

  // Persist state to localStorage
  _persistState(key) {
    if (this.persistKeys.includes(key)) {
      try {
        localStorage.setItem(`app-state-${key}`, JSON.stringify(this.state[key]));
      } catch (e) {
        console.warn(`Failed to persist state for ${key}:`, e);
      }
    }
  }

  // Get state slice
  get(key) {
    return this.state[key];
  }

  // Set state slice
  set(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;
    this._persistState(key);
    this._notify(key, value, oldValue);
  }

  // Update state slice (merge for objects)
  update(key, updates) {
    if (typeof this.state[key] === 'object' && !Array.isArray(this.state[key])) {
      this.set(key, { ...this.state[key], ...updates });
    } else {
      this.set(key, updates);
    }
  }

  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.observers[key]) {
      this.observers[key] = [];
    }
    this.observers[key].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.observers[key] = this.observers[key].filter(cb => cb !== callback);
    };
  }

  // Notify observers
  _notify(key, newValue, oldValue) {
    if (this.observers[key]) {
      this.observers[key].forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (e) {
          console.error(`Error in state observer for ${key}:`, e);
        }
      });
    }
  }

  // Queue methods
  addToQueue(item) {
    const queue = [...this.state.queue, item];
    this.set('queue', queue);
  }

  removeFromQueue(id) {
    const queue = this.state.queue.filter(item => item.id !== id);
    this.set('queue', queue);
  }

  updateQueueItem(id, updates) {
    const queue = this.state.queue.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    this.set('queue', queue);
  }

  clearQueue() {
    this.set('queue', []);
  }

  // Progress methods
  setProgress(id, progress) {
    this.update('progress', { [id]: progress });
  }

  clearProgress(id) {
    const progress = { ...this.state.progress };
    delete progress[id];
    this.set('progress', progress);
  }

  // Config methods
  getConfig(key) {
    return key ? this.state.config[key] : this.state.config;
  }

  setConfig(key, value) {
    if (typeof key === 'object') {
      this.set('config', key);
    } else {
      this.update('config', { [key]: value });
    }
  }

  // Theme methods
  getTheme() {
    return this.state.theme;
  }

  setTheme(theme) {
    this.set('theme', theme);
  }

  // Auth methods
  setAuth(platform, status) {
    this.update('auth', { [platform]: status });
  }

  isAuthenticated(platform) {
    return this.state.auth[platform];
  }

  // UI methods
  setSidebarCollapsed(collapsed) {
    this.update('ui', { sidebarCollapsed: collapsed });
  }

  setActiveTab(tab) {
    this.update('ui', { activeTab: tab });
  }
}

export const stateManager = new StateManager();
export default stateManager;
```

---

## 📝 Remaining Tasks Overview

### Task 6: UI Components (7 sub-tasks)
Create reusable UI components with BEM naming:
- 6.1: Button (variants, sizes, states, ripple effect)
- 6.2: Input (types, validation, error display)
- 6.3: Card (collapsible, header/body/footer)
- 6.4: Modal (backdrop, keyboard nav, focus trap)
- 6.5: ProgressBar (determinate/indeterminate)
- 6.6: LogBox (log levels, auto-scroll, filtering)
- 6.7: FileUploader (drag-drop, validation, preview)

### Task 7: Layout Components (2 sub-tasks)
- 7.1: Sidebar (responsive, navigation, keyboard nav)
- 7.2: Topbar (title, theme toggle, hamburger menu)

### Task 8: Theme Toggle (2 sub-tasks)
- 8.1: Theme manager module (already exists, verify)
- 8.2: Integrate theme toggle in Topbar

### Task 9: Page Components (6 sub-tasks)
- 9.1: UserPage (video fetching, grid, lazy loading)
- 9.2: ProcessPage (video processing, progress tracking)
- 9.3: TranscribePage (transcription, file upload)
- 9.4: HistoryPage (virtual scrolling, search/filter)
- 9.5: ConfigPage (settings form, validation)
- 9.6: CookiesPage (cookie editor, mode toggle)

### Task 10: Responsive Design (3 sub-tasks)
- 10.1: Add responsive breakpoints (already in _variables.scss)
- 10.2: Implement mobile-first responsive styles
- 10.3: Implement responsive layout adjustments

### Task 11: Form Validation (3 sub-tasks)
- 11.1: Create validation rules (already in validators.js)
- 11.2: Integrate validation into Input component
- 11.3: Implement form-level validation

### Task 12: Accessibility (3 sub-tasks)
- 12.1: Add semantic HTML and ARIA attributes
- 12.2: Implement keyboard navigation
- 12.3: Ensure color contrast compliance (already done)

### Task 13: Performance Optimizations (4 sub-tasks)
- 13.1: Add lazy loading for images/components
- 13.2: Implement virtual scrolling
- 13.3: Optimize event handlers (debounce/throttle)
- 13.4: Implement API response caching

### Task 14: Vercel Deployment Fixes (3 sub-tasks)
- 14.1: Analyze and fix Vercel 500 error
- 14.2: Optimize for serverless environment
- 14.3: Test and document deployment

### Task 15: Main App Entry Point (2 sub-tasks)
- 15.1: Create app initialization module
- 15.2: Update Flask templates

### Task 16: Migration (3 sub-tasks)
- 16.1: Migrate queue management
- 16.2: Migrate WebSocket integration
- 16.3: Migrate internationalization

### Task 17: Testing (5 sub-tasks)
- 17.1-17.5: Test responsive, theme, validation, accessibility, performance

### Task 18: Documentation (4 sub-tasks)
- 18.1-18.4: README, ARCHITECTURE, code docs, style guide

### Task 19: Final Integration (3 sub-tasks)
- 19.1: Remove old code
- 19.2: Final testing
- 19.3: Production build and deployment

---

## 🎯 Quick Start for Next Developer

1. **Review completed work:**
   ```bash
   npm run dev
   # Open http://localhost:3000/theme-demo.html
   # Open http://localhost:3000/validators-demo.html
   ```

2. **Start with Task 4.2** (API endpoint methods) - copy code above

3. **Then Task 5** (State Manager) - copy code above

4. **Then Task 6.1** (Button component):
   ```bash
   mkdir -p static/src/components/Button
   touch static/src/components/Button/Button.js
   touch static/src/components/Button/Button.scss
   ```

5. **Follow BEM naming convention:**
   ```scss
   .button { }
   .button--primary { }
   .button--large { }
   .button__icon { }
   ```

---

## 📚 Key Resources

- **Spec files:** `.kiro/specs/frontend-architecture-rebuild/`
- **Completed modules:** `static/src/modules/`
- **SCSS foundation:** `static/src/styles/`
- **Build config:** `vite.config.js`
- **Package config:** `package.json`

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Development server (HMR enabled)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Verify WCAG contrast
npm run verify-contrast

# Run tests (when configured)
npm test
```

---

## ✨ Best Practices

1. **Use existing modules:** Import from `constants.js`, `utils.js`, `validators.js`, `formatters.js`, `api-client.js`
2. **Follow BEM naming:** `.block`, `.block__element`, `.block--modifier`
3. **Use CSS variables:** `var(--color-primary)`, `var(--spacing-4)`
4. **Add JSDoc comments:** Document all public functions
5. **Write tests:** Add `.test.js` files for new modules
6. **Mobile-first:** Write CSS for mobile, then use `@include respond-to('tablet')`
7. **Accessibility:** Add ARIA labels, keyboard navigation, focus indicators
8. **Performance:** Use debounce/throttle, lazy loading, virtual scrolling

---

## 🎉 Summary

**Completed:** 8/62 tasks (13%)
**Next Priority:** Tasks 4.2, 5.1-5.2 (API methods + State Manager)
**Estimated Remaining:** ~40-50 hours of development work

The foundation is solid. All core utilities are in place. The next developer can focus on building UI components and pages using the established patterns.
