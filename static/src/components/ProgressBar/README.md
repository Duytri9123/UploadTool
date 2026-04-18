# ProgressBar Component

A reusable progress bar component with determinate and indeterminate modes, supporting percentage labels, custom labels, smooth transitions, and WCAG AA accessibility.

## Features

- **Determinate Mode**: Shows specific progress from 0-100%
- **Indeterminate Mode**: Shows loading animation without specific progress
- **Custom Labels**: Support for custom text labels (e.g., "Uploading...", "Processing...")
- **Percentage Display**: Optional percentage label
- **Color Variants**: Primary, success, warning, danger
- **Size Variants**: Small, medium, large
- **Smooth Transitions**: Animated progress changes
- **Accessibility**: Full ARIA support and keyboard navigation
- **Dark Mode**: Automatic theme support
- **Callbacks**: onChange and onComplete events

## Usage

### Basic Usage

```javascript
import { ProgressBar } from './components/ProgressBar/ProgressBar.js';

// Create a basic progress bar
const progressBar = new ProgressBar({
  progress: 50,
  label: 'Uploading...',
  showPercentage: true
});

// Mount to DOM
progressBar.mount(document.getElementById('container'));

// Update progress
progressBar.setProgress(75);
```

### Determinate Mode

```javascript
const progressBar = new ProgressBar({
  mode: 'determinate',
  progress: 0,
  label: 'Downloading...',
  showPercentage: true,
  variant: 'primary',
  onChange: (progress) => {
    console.log('Progress:', progress);
  },
  onComplete: () => {
    console.log('Download complete!');
  }
});

// Simulate progress
let progress = 0;
const interval = setInterval(() => {
  progress += 10;
  progressBar.setProgress(progress);
  
  if (progress >= 100) {
    clearInterval(interval);
  }
}, 500);
```

### Indeterminate Mode

```javascript
const progressBar = new ProgressBar({
  mode: 'indeterminate',
  label: 'Loading...',
  variant: 'primary'
});

progressBar.mount(document.getElementById('container'));
```

### Color Variants

```javascript
// Primary (default)
const primary = new ProgressBar({ variant: 'primary', progress: 50 });

// Success
const success = new ProgressBar({ variant: 'success', progress: 100 });

// Warning
const warning = new ProgressBar({ variant: 'warning', progress: 75 });

// Danger
const danger = new ProgressBar({ variant: 'danger', progress: 25 });
```

### Size Variants

```javascript
// Small
const small = new ProgressBar({ size: 'small', progress: 50 });

// Medium (default)
const medium = new ProgressBar({ size: 'medium', progress: 50 });

// Large
const large = new ProgressBar({ size: 'large', progress: 50 });
```

## API

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | string | `'determinate'` | Progress mode: `'determinate'` or `'indeterminate'` |
| `progress` | number | `0` | Initial progress value (0-100) for determinate mode |
| `label` | string | `null` | Custom label text |
| `showPercentage` | boolean | `true` | Whether to show percentage label |
| `variant` | string | `'primary'` | Color variant: `'primary'`, `'success'`, `'warning'`, `'danger'` |
| `size` | string | `'medium'` | Size variant: `'small'`, `'medium'`, `'large'` |
| `className` | string | `''` | Additional CSS classes |
| `onChange` | function | `null` | Callback when progress changes: `(progress) => {}` |
| `onComplete` | function | `null` | Callback when progress reaches 100%: `() => {}` |

### Methods

#### `setProgress(progress: number): void`
Update progress value (0-100). Only works in determinate mode.

```javascript
progressBar.setProgress(75);
```

#### `setLabel(label: string): void`
Update custom label text.

```javascript
progressBar.setLabel('Processing...');
```

#### `setMode(mode: string): void`
Switch between determinate and indeterminate modes.

```javascript
progressBar.setMode('indeterminate');
```

#### `setVariant(variant: string): void`
Update color variant.

```javascript
progressBar.setVariant('success');
```

#### `setSize(size: string): void`
Update size variant.

```javascript
progressBar.setSize('large');
```

#### `reset(): void`
Reset progress to 0.

```javascript
progressBar.reset();
```

#### `mount(parent: HTMLElement): void`
Mount the progress bar to a parent element.

```javascript
progressBar.mount(document.getElementById('container'));
```

#### `unmount(): void`
Unmount the progress bar from its parent.

```javascript
progressBar.unmount();
```

#### `destroy(): void`
Destroy the progress bar and clean up.

```javascript
progressBar.destroy();
```

### Properties

#### `element: HTMLElement` (read-only)
Get the progress bar DOM element.

```javascript
const element = progressBar.element;
```

#### `mounted: boolean` (read-only)
Check if progress bar is mounted.

```javascript
if (progressBar.mounted) {
  console.log('Progress bar is mounted');
}
```

#### `progress: number` (read-only)
Get current progress value.

```javascript
console.log('Current progress:', progressBar.progress);
```

#### `mode: string` (read-only)
Get current mode.

```javascript
console.log('Current mode:', progressBar.mode);
```

#### `completed: boolean` (read-only)
Check if progress is complete (100%).

```javascript
if (progressBar.completed) {
  console.log('Progress is complete!');
}
```

## Examples

### File Upload Progress

```javascript
const uploadProgress = new ProgressBar({
  progress: 0,
  label: 'Uploading file...',
  variant: 'primary',
  onComplete: () => {
    uploadProgress.setLabel('Upload complete!');
    uploadProgress.setVariant('success');
  }
});

uploadProgress.mount(document.getElementById('upload-container'));

// Simulate upload
fetch('/api/upload', {
  method: 'POST',
  body: formData
}).then(response => {
  // Update progress based on response
  uploadProgress.setProgress(100);
});
```

### Video Processing

```javascript
const processingProgress = new ProgressBar({
  mode: 'indeterminate',
  label: 'Processing video...',
  variant: 'warning'
});

processingProgress.mount(document.getElementById('processing-container'));

// When processing completes
processingProgress.setMode('determinate');
processingProgress.setProgress(100);
processingProgress.setLabel('Processing complete!');
processingProgress.setVariant('success');
```

### Multiple Progress Bars

```javascript
const downloads = [
  { id: 1, name: 'video1.mp4' },
  { id: 2, name: 'video2.mp4' },
  { id: 3, name: 'video3.mp4' }
];

downloads.forEach(download => {
  const progressBar = new ProgressBar({
    progress: 0,
    label: `Downloading ${download.name}`,
    variant: 'primary',
    onComplete: () => {
      progressBar.setLabel(`${download.name} complete!`);
      progressBar.setVariant('success');
    }
  });
  
  progressBar.mount(document.getElementById(`download-${download.id}`));
  
  // Simulate download progress
  simulateDownload(download.id, (progress) => {
    progressBar.setProgress(progress);
  });
});
```

## Styling

The component uses BEM naming convention:

- `.progress-bar` - Container
- `.progress-bar__track` - Progress track
- `.progress-bar__fill` - Progress fill
- `.progress-bar__label` - Label container
- `.progress-bar__label-text` - Custom label text
- `.progress-bar__label-percentage` - Percentage label

### Modifiers

- `.progress-bar--determinate` - Determinate mode
- `.progress-bar--indeterminate` - Indeterminate mode
- `.progress-bar--primary` - Primary color
- `.progress-bar--success` - Success color
- `.progress-bar--warning` - Warning color
- `.progress-bar--danger` - Danger color
- `.progress-bar--small` - Small size
- `.progress-bar--medium` - Medium size
- `.progress-bar--large` - Large size

## Accessibility

The component follows WCAG AA guidelines:

- Proper ARIA attributes (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`)
- Semantic HTML structure
- Color contrast ratios meet WCAG AA standards
- Supports reduced motion preferences
- Works with screen readers

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Demo

See `static/progressbar-demo.html` for a live demo with all features.
