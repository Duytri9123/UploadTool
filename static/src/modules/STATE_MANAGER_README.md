# State Manager Module

## Overview

The State Manager module provides centralized state management with an observer pattern for reactive updates. It manages application state across different slices (queue, progress, config, auth, theme, UI) and automatically persists critical state to localStorage.

## Features

- ✅ **Observer Pattern**: Subscribe to state changes with automatic notifications
- ✅ **State Persistence**: Automatic localStorage persistence for theme, config, auth, and UI state
- ✅ **Type Safety**: Well-documented API with JSDoc comments
- ✅ **Error Handling**: Graceful handling of localStorage errors and observer exceptions
- ✅ **Immutable Updates**: Prevents direct state mutation
- ✅ **Helper Methods**: Convenient methods for common operations

## State Slices

### 1. Queue
Array of video items in the processing queue.

```javascript
{
  queue: [
    { id: 1, url: 'https://...', status: 'pending' },
    { id: 2, url: 'https://...', status: 'processing' }
  ]
}
```

### 2. Progress
Object mapping item IDs to progress percentages (0-100).

```javascript
{
  progress: {
    1: 45,
    2: 78
  }
}
```

### 3. Config
Application configuration settings.

```javascript
{
  config: {
    downloadPath: '/downloads',
    quality: 'high',
    autoUpload: true
  }
}
```

### 4. Auth
Authentication status for platforms.

```javascript
{
  auth: {
    youtube: true,
    tiktok: false
  }
}
```

### 5. Theme
Current theme setting.

```javascript
{
  theme: 'dark' // or 'light'
}
```

### 6. UI
UI state preferences.

```javascript
{
  ui: {
    sidebarCollapsed: false,
    activeTab: 'process'
  }
}
```

## Usage

### Basic Usage

```javascript
import { stateManager } from './modules/state-manager.js';

// Get state
const theme = stateManager.getTheme();
const queue = stateManager.get('queue');

// Set state
stateManager.setTheme('dark');
stateManager.set('queue', [{ id: 1, url: 'test.com' }]);

// Update state (merge for objects)
stateManager.update('config', { quality: 'high' });
```

### Observer Pattern

```javascript
// Subscribe to state changes
const unsubscribe = stateManager.subscribe('theme', (newTheme, oldTheme) => {
  console.log(`Theme changed from ${oldTheme} to ${newTheme}`);
  document.body.className = newTheme;
});

// Change state (triggers observer)
stateManager.setTheme('dark');

// Unsubscribe when done
unsubscribe();
```

### Queue Management

```javascript
// Add item to queue
stateManager.addToQueue({
  id: Date.now(),
  url: 'https://tiktok.com/@user/video/123',
  status: 'pending'
});

// Update queue item
stateManager.updateQueueItem(123, { status: 'processing' });

// Remove item from queue
stateManager.removeFromQueue(123);

// Clear entire queue
stateManager.clearQueue();
```

### Progress Tracking

```javascript
// Set progress for an item
stateManager.setProgress(123, 45); // 45%

// Update progress
stateManager.setProgress(123, 78); // 78%

// Clear progress when done
stateManager.clearProgress(123);
```

### Configuration

```javascript
// Set single config value
stateManager.setConfig('downloadPath', '/downloads');

// Set multiple config values
stateManager.setConfig({
  downloadPath: '/downloads',
  quality: 'high',
  autoUpload: true
});

// Get config value
const path = stateManager.getConfig('downloadPath');

// Get all config
const config = stateManager.getConfig();
```

### Theme Management

```javascript
// Get current theme
const theme = stateManager.getTheme(); // 'light' or 'dark'

// Set theme
stateManager.setTheme('dark');

// Subscribe to theme changes
stateManager.subscribe('theme', (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
});
```

### Authentication

```javascript
// Set auth status
stateManager.setAuth('youtube', true);
stateManager.setAuth('tiktok', false);

// Check auth status
if (stateManager.isAuthenticated('youtube')) {
  // User is authenticated with YouTube
}

// Subscribe to auth changes
stateManager.subscribe('auth', (newAuth) => {
  updateAuthUI(newAuth);
});
```

### UI State

```javascript
// Toggle sidebar
const collapsed = stateManager.get('ui').sidebarCollapsed;
stateManager.setSidebarCollapsed(!collapsed);

// Change active tab
stateManager.setActiveTab('config');

// Subscribe to UI changes
stateManager.subscribe('ui', (newUI) => {
  if (newUI.sidebarCollapsed) {
    sidebar.classList.add('collapsed');
  } else {
    sidebar.classList.remove('collapsed');
  }
});
```

## Advanced Patterns

### Multiple Observers

```javascript
// Multiple components can observe the same state
const unsubscribe1 = stateManager.subscribe('queue', updateQueueUI);
const unsubscribe2 = stateManager.subscribe('queue', updateQueueCount);
const unsubscribe3 = stateManager.subscribe('queue', saveQueueToBackend);

// All three observers will be notified on queue changes
stateManager.addToQueue({ id: 1, url: 'test.com' });
```

### Derived State

```javascript
// Calculate derived state from multiple slices
function getQueueStats() {
  const queue = stateManager.get('queue');
  const progress = stateManager.get('progress');
  
  return {
    total: queue.length,
    pending: queue.filter(item => item.status === 'pending').length,
    processing: queue.filter(item => item.status === 'processing').length,
    completed: queue.filter(item => item.status === 'completed').length,
    averageProgress: Object.values(progress).reduce((a, b) => a + b, 0) / Object.keys(progress).length
  };
}
```

### State Synchronization

```javascript
// Sync state with backend
stateManager.subscribe('config', async (newConfig) => {
  try {
    await api.saveConfig(newConfig);
  } catch (error) {
    console.error('Failed to sync config:', error);
  }
});

// Load initial state from backend
async function initializeState() {
  try {
    const config = await api.getConfig();
    stateManager.setConfig(config);
    
    const queue = await api.getQueue();
    stateManager.set('queue', queue);
  } catch (error) {
    console.error('Failed to load initial state:', error);
  }
}
```

### Undo/Redo Pattern

```javascript
class UndoableStateManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.history = [];
    this.currentIndex = -1;
  }
  
  execute(action) {
    // Remove any future history
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Save current state
    const snapshot = {
      queue: this.stateManager.get('queue'),
      config: this.stateManager.get('config')
    };
    
    this.history.push({ snapshot, action });
    this.currentIndex++;
    
    // Execute action
    action();
  }
  
  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const { snapshot } = this.history[this.currentIndex];
      this.stateManager.set('queue', snapshot.queue);
      this.stateManager.set('config', snapshot.config);
    }
  }
  
  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const { action } = this.history[this.currentIndex];
      action();
    }
  }
}
```

## LocalStorage Persistence

The following state slices are automatically persisted to localStorage:

- `theme` → `app-state-theme`
- `config` → `app-state-config`
- `auth` → `app-state-auth`
- `ui` → `app-state-ui`

State is loaded on initialization and saved on every update.

### Manual Persistence Control

```javascript
// Clear persisted state
localStorage.removeItem('app-state-theme');
localStorage.removeItem('app-state-config');
localStorage.removeItem('app-state-auth');
localStorage.removeItem('app-state-ui');

// Reload state from localStorage
const newStateManager = new StateManager();
```

## Error Handling

The StateManager handles errors gracefully:

```javascript
// Corrupted localStorage data
// Falls back to default state and logs warning
localStorage.setItem('app-state-theme', 'invalid-json');
const manager = new StateManager(); // Logs warning, uses default 'light' theme

// Observer errors
// Catches errors in observers and logs them without breaking other observers
stateManager.subscribe('theme', () => {
  throw new Error('Observer error');
});
stateManager.setTheme('dark'); // Logs error but continues
```

## Testing

The module includes comprehensive tests covering:

- ✅ Initialization and default state
- ✅ Get/set operations
- ✅ Observer pattern and subscriptions
- ✅ Queue management methods
- ✅ Progress tracking methods
- ✅ Config management methods
- ✅ Theme management methods
- ✅ Auth management methods
- ✅ UI state methods
- ✅ LocalStorage persistence
- ✅ Error handling

Run tests:

```bash
npm test -- state-manager.test.js
```

## Demo

Open `state-manager-demo.html` in your browser to see an interactive demonstration of all StateManager features.

## API Reference

### Constructor

```javascript
new StateManager()
```

Creates a new StateManager instance with default state.

### Core Methods

#### `get(key: string): any`
Get state slice by key.

#### `set(key: string, value: any): void`
Set state slice. Triggers observers and persists if applicable.

#### `update(key: string, updates: any): void`
Update state slice. Merges updates for objects, replaces for primitives/arrays.

#### `subscribe(key: string, callback: Function): Function`
Subscribe to state changes. Returns unsubscribe function.

### Queue Methods

#### `addToQueue(item: Object): void`
Add item to queue.

#### `removeFromQueue(id: string|number): void`
Remove item from queue by ID.

#### `updateQueueItem(id: string|number, updates: Object): void`
Update queue item by ID.

#### `clearQueue(): void`
Clear all items from queue.

### Progress Methods

#### `setProgress(id: string|number, progress: number): void`
Set progress for an item (0-100).

#### `clearProgress(id: string|number): void`
Clear progress for an item.

### Config Methods

#### `getConfig(key?: string): any`
Get config value by key, or entire config if no key provided.

#### `setConfig(key: string|Object, value?: any): void`
Set config value by key, or entire config object.

### Theme Methods

#### `getTheme(): string`
Get current theme ('light' or 'dark').

#### `setTheme(theme: string): void`
Set theme.

### Auth Methods

#### `setAuth(platform: string, status: boolean): void`
Set authentication status for a platform.

#### `isAuthenticated(platform: string): boolean`
Check if authenticated for a platform.

### UI Methods

#### `setSidebarCollapsed(collapsed: boolean): void`
Set sidebar collapsed state.

#### `setActiveTab(tab: string): void`
Set active tab.

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 7.1**: ✅ StateManager class manages application state
- **Requirement 7.2**: ✅ Manages state slices: queue, progress, config, auth, theme, ui
- **Requirement 7.3**: ✅ Implements observer pattern with subscribe/notify
- **Requirement 7.4**: ✅ Persists critical state to localStorage
- **Requirement 7.7**: ✅ Provides getters and setters for each state slice

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE11: ❌ Not supported (requires ES6 modules)

## Performance Considerations

- State updates are synchronous
- Observer notifications are synchronous
- localStorage writes are synchronous (may block on large data)
- Consider debouncing frequent updates to localStorage

## Best Practices

1. **Subscribe in component mount, unsubscribe in unmount**
   ```javascript
   class Component {
     mount() {
       this.unsubscribe = stateManager.subscribe('theme', this.onThemeChange);
     }
     
     unmount() {
       this.unsubscribe();
     }
   }
   ```

2. **Use helper methods instead of direct get/set**
   ```javascript
   // Good
   stateManager.addToQueue(item);
   
   // Avoid
   const queue = stateManager.get('queue');
   queue.push(item);
   stateManager.set('queue', queue);
   ```

3. **Keep observers lightweight**
   ```javascript
   // Good - quick update
   stateManager.subscribe('theme', (theme) => {
     document.body.className = theme;
   });
   
   // Avoid - heavy computation in observer
   stateManager.subscribe('queue', (queue) => {
     // Heavy processing...
   });
   ```

4. **Batch related updates**
   ```javascript
   // Good - single update
   stateManager.setConfig({
     key1: 'value1',
     key2: 'value2',
     key3: 'value3'
   });
   
   // Avoid - multiple updates
   stateManager.setConfig('key1', 'value1');
   stateManager.setConfig('key2', 'value2');
   stateManager.setConfig('key3', 'value3');
   ```

## License

Part of the TikTok/YouTube Downloader project.
