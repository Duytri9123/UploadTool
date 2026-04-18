# LogBox Component

A reusable log display component with multiple log levels, filtering, auto-scroll, and export functionality.

## Features

- **Multiple Log Levels**: info, success, warning, error
- **Timestamps**: Configurable timestamp display with multiple formats
- **Filtering**: Show/hide specific log levels
- **Auto-scroll**: Automatically scroll to bottom on new logs
- **Export**: Copy to clipboard or download as text/JSON
- **Density Options**: Compact and comfortable display modes
- **Max Entries**: Configurable maximum log entries with automatic cleanup
- **Accessibility**: Full ARIA support and keyboard navigation
- **Dark Mode**: Full dark mode support
- **Responsive**: Works on mobile, tablet, and desktop

## Installation

```javascript
import { LogBox } from './components/LogBox/LogBox.js';
```

## Basic Usage

```javascript
// Create a LogBox instance
const logBox = new LogBox({
  maxEntries: 1000,
  autoScroll: true,
  density: 'comfortable'
});

// Mount to DOM
document.getElementById('container').appendChild(logBox.element);

// Add logs
logBox.addLog('info', 'Application started');
logBox.addLog('success', 'Video processed successfully');
logBox.addLog('warning', 'Low disk space');
logBox.addLog('error', 'Failed to connect to server');
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxEntries` | number | 1000 | Maximum number of log entries to keep |
| `autoScroll` | boolean | true | Auto-scroll to bottom on new logs |
| `density` | string | 'comfortable' | Display density: 'compact', 'comfortable' |
| `showTimestamp` | boolean | true | Show timestamps for each log |
| `timestampFormat` | string | 'time' | Timestamp format: 'time', 'datetime', 'relative' |
| `visibleLevels` | Array | null | Initially visible log levels (null = all) |
| `className` | string | '' | Additional CSS classes |
| `onLogAdded` | Function | null | Callback when log is added |
| `onCleared` | Function | null | Callback when logs are cleared |
| `onFilterChanged` | Function | null | Callback when filter changes |

## Methods

### Adding Logs

```javascript
// Add a log entry
logBox.addLog(level, message, options);

// Examples
logBox.addLog('info', 'Processing started');
logBox.addLog('success', 'Task completed', {
  timestamp: new Date(),
  data: { taskId: 123 }
});
```

### Filtering

```javascript
// Set filter to show specific levels
logBox.setFilter(['info', 'error']);

// Show all levels
logBox.setFilter([]);

// Toggle a specific level
logBox.toggleLevel('warning');

// Get current visible levels
console.log(logBox.visibleLevels); // ['info', 'success', 'warning', 'error']
```

### Clearing Logs

```javascript
// Clear all logs
logBox.clearLogs();
```

### Scrolling

```javascript
// Scroll to bottom
logBox.scrollToBottom();

// Scroll to top
logBox.scrollToTop();

// Enable/disable auto-scroll
logBox.setAutoScroll(true);
```

### Display Options

```javascript
// Set density
logBox.setDensity('compact'); // or 'comfortable'

// Get current auto-scroll state
console.log(logBox.autoScroll); // true or false
```

### Getting Logs

```javascript
// Get all logs
const allLogs = logBox.getLogs();

// Get logs by level
const errorLogs = logBox.getLogs({ levels: ['error'] });

// Get log count
const totalCount = logBox.getLogCount();
const errorCount = logBox.getLogCount('error');
```

### Export Functionality

```javascript
// Export as text
const text = logBox.exportAsText();
const textNoTimestamp = logBox.exportAsText({ includeTimestamp: false });
const errorText = logBox.exportAsText({ levels: ['error'] });

// Export as JSON
const json = logBox.exportAsJSON();
const errorJson = logBox.exportAsJSON({ levels: ['error'] });

// Copy to clipboard
await logBox.copyToClipboard();

// Download as file
logBox.downloadLogs('logs.txt'); // Text format
logBox.downloadLogs('logs.json', { format: 'json' }); // JSON format
```

### Lifecycle

```javascript
// Mount to parent element
logBox.mount(parentElement);

// Unmount from parent
logBox.unmount();

// Destroy and clean up
logBox.destroy();

// Check if mounted
console.log(logBox.mounted); // true or false
```

## Advanced Usage

### With Callbacks

```javascript
const logBox = new LogBox({
  onLogAdded: (log) => {
    console.log('New log:', log);
    // Update statistics, send to analytics, etc.
  },
  onCleared: () => {
    console.log('Logs cleared');
  },
  onFilterChanged: (visibleLevels) => {
    console.log('Filter changed:', visibleLevels);
  }
});
```

### Custom Timestamps

```javascript
// Add log with custom timestamp
logBox.addLog('info', 'Historical event', {
  timestamp: new Date('2024-01-01T12:00:00Z')
});

// Change timestamp format
logBox.options.timestampFormat = 'datetime'; // Show full date and time
logBox.options.timestampFormat = 'relative'; // Show "2 minutes ago"
```

### With Custom Data

```javascript
// Add log with custom data
logBox.addLog('error', 'API request failed', {
  data: {
    endpoint: '/api/users',
    statusCode: 500,
    errorMessage: 'Internal Server Error'
  }
});

// Access custom data later
const logs = logBox.getLogs();
console.log(logs[0].data); // { endpoint: '/api/users', ... }
```

### Real-time Logging

```javascript
// Example: Log WebSocket messages
socket.on('message', (data) => {
  logBox.addLog('info', `Received: ${data.message}`);
});

// Example: Log API requests
async function fetchData() {
  logBox.addLog('info', 'Fetching data from API...');
  
  try {
    const response = await fetch('/api/data');
    logBox.addLog('success', 'Data fetched successfully');
  } catch (error) {
    logBox.addLog('error', `Failed to fetch data: ${error.message}`);
  }
}
```

## Styling

The LogBox component uses BEM naming convention and CSS custom properties for theming.

### CSS Classes

- `.log-box` - Main container
- `.log-box--compact` - Compact density variant
- `.log-box--comfortable` - Comfortable density variant
- `.log-box__container` - Scrollable log container
- `.log-box__entry` - Individual log entry
- `.log-box__entry--info` - Info level entry
- `.log-box__entry--success` - Success level entry
- `.log-box__entry--warning` - Warning level entry
- `.log-box__entry--error` - Error level entry
- `.log-box__level-icon` - Log level icon
- `.log-box__timestamp` - Timestamp text
- `.log-box__message` - Log message text

### Custom Styling

```scss
// Override default styles
.log-box {
  height: 600px; // Custom height
  border-radius: 12px; // Custom border radius
}

.log-box__entry--error {
  background-color: rgba(255, 0, 0, 0.1); // Custom error background
}
```

## Accessibility

The LogBox component is fully accessible:

- **ARIA Attributes**: `role="log"`, `aria-live="polite"`, `aria-atomic="false"`
- **Keyboard Navigation**: Full keyboard support for scrolling
- **Screen Readers**: Announces new log entries
- **Color Contrast**: WCAG AA compliant colors
- **Focus Indicators**: Visible focus states

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Demo

See `static/logbox-demo.html` for a complete interactive demo.

## License

MIT
