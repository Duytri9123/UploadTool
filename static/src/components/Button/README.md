# Button Component

A reusable, accessible button component with multiple variants, sizes, states, and full keyboard navigation support.

## Features

- ✅ **5 Variants**: primary, secondary, danger, success, ghost
- ✅ **3 Sizes**: small, medium, large
- ✅ **Multiple States**: default, hover, active, disabled, loading
- ✅ **Icon Support**: left, right, icon-only positions
- ✅ **Ripple Effect**: Material Design-inspired click animation
- ✅ **Keyboard Navigation**: Full support for Enter and Space keys
- ✅ **Accessibility**: WCAG AA compliant with proper ARIA attributes
- ✅ **BEM Naming**: Clean, maintainable CSS class structure
- ✅ **Theme Support**: Works with dark and light modes
- ✅ **Responsive**: Mobile-first design with touch-friendly targets

## Installation

```javascript
import { Button } from './components/Button/Button.js';
```

## Basic Usage

```javascript
// Create a simple button
const button = new Button({
  text: 'Click me',
  variant: 'primary',
  onClick: () => console.log('Button clicked!')
});

// Mount to DOM
document.body.appendChild(button.element);
// or
button.mount(document.body);
```

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `text` | `string` | `''` | Button text content |
| `variant` | `string` | `'primary'` | Button variant: `primary`, `secondary`, `danger`, `success`, `ghost` |
| `size` | `string` | `'medium'` | Button size: `small`, `medium`, `large` |
| `disabled` | `boolean` | `false` | Whether button is disabled |
| `loading` | `boolean` | `false` | Whether button shows loading state |
| `icon` | `string` | `null` | Icon HTML or emoji |
| `iconPosition` | `string` | `'left'` | Icon position: `left`, `right`, `only` |
| `type` | `string` | `'button'` | Button type: `button`, `submit`, `reset` |
| `ariaLabel` | `string` | `null` | ARIA label for accessibility |
| `onClick` | `Function` | `null` | Click handler function |
| `className` | `string` | `''` | Additional CSS classes |

### Methods

#### `setText(text: string)`
Update button text content.

```javascript
button.setText('New Text');
```

#### `setVariant(variant: string)`
Change button variant.

```javascript
button.setVariant('danger');
```

#### `setSize(size: string)`
Change button size.

```javascript
button.setSize('large');
```

#### `setDisabled(disabled: boolean)`
Enable or disable the button.

```javascript
button.setDisabled(true);
```

#### `setLoading(loading: boolean)`
Show or hide loading state.

```javascript
button.setLoading(true);
```

#### `setOnClick(handler: Function)`
Update click handler.

```javascript
button.setOnClick(() => console.log('New handler'));
```

#### `focus()`
Programmatically focus the button.

```javascript
button.focus();
```

#### `blur()`
Programmatically blur the button.

```javascript
button.blur();
```

#### `mount(parent: HTMLElement)`
Mount button to a parent element.

```javascript
button.mount(document.getElementById('container'));
```

#### `unmount()`
Remove button from its parent.

```javascript
button.unmount();
```

#### `destroy()`
Destroy button and clean up resources.

```javascript
button.destroy();
```

### Properties (Getters)

#### `element: HTMLButtonElement`
Get the button DOM element.

```javascript
const el = button.element;
```

#### `mounted: boolean`
Check if button is mounted.

```javascript
if (button.mounted) {
  console.log('Button is mounted');
}
```

#### `disabled: boolean`
Check if button is disabled.

```javascript
if (button.disabled) {
  console.log('Button is disabled');
}
```

#### `loading: boolean`
Check if button is loading.

```javascript
if (button.loading) {
  console.log('Button is loading');
}
```

## Examples

### Variants

```javascript
// Primary button (default)
const primaryBtn = new Button({
  text: 'Primary',
  variant: 'primary'
});

// Secondary button
const secondaryBtn = new Button({
  text: 'Secondary',
  variant: 'secondary'
});

// Danger button
const dangerBtn = new Button({
  text: 'Delete',
  variant: 'danger'
});

// Success button
const successBtn = new Button({
  text: 'Save',
  variant: 'success'
});

// Ghost button (transparent)
const ghostBtn = new Button({
  text: 'Cancel',
  variant: 'ghost'
});
```

### Sizes

```javascript
// Small button
const smallBtn = new Button({
  text: 'Small',
  size: 'small'
});

// Medium button (default)
const mediumBtn = new Button({
  text: 'Medium',
  size: 'medium'
});

// Large button
const largeBtn = new Button({
  text: 'Large',
  size: 'large'
});
```

### With Icons

```javascript
// Icon on the left
const saveBtn = new Button({
  text: 'Save',
  icon: '💾',
  iconPosition: 'left'
});

// Icon on the right
const nextBtn = new Button({
  text: 'Next',
  icon: '→',
  iconPosition: 'right'
});

// Icon only (no text)
const closeBtn = new Button({
  icon: '✕',
  iconPosition: 'only',
  ariaLabel: 'Close dialog'
});
```

### States

```javascript
// Disabled button
const disabledBtn = new Button({
  text: 'Disabled',
  disabled: true
});

// Loading button
const loadingBtn = new Button({
  text: 'Loading',
  loading: true
});

// Toggle loading state
const submitBtn = new Button({
  text: 'Submit',
  onClick: async () => {
    submitBtn.setLoading(true);
    await someAsyncOperation();
    submitBtn.setLoading(false);
  }
});
```

### Form Buttons

```javascript
// Submit button
const submitBtn = new Button({
  text: 'Submit Form',
  type: 'submit',
  variant: 'primary'
});

// Reset button
const resetBtn = new Button({
  text: 'Reset Form',
  type: 'reset',
  variant: 'ghost'
});
```

### Dynamic Updates

```javascript
const button = new Button({
  text: 'Click me',
  variant: 'primary'
});

// Update text
button.setText('Clicked!');

// Change variant
button.setVariant('success');

// Change size
button.setSize('large');

// Disable
button.setDisabled(true);

// Show loading
button.setLoading(true);
```

### Async Operations

```javascript
const downloadBtn = new Button({
  text: 'Download',
  variant: 'primary',
  onClick: async () => {
    try {
      downloadBtn.setLoading(true);
      downloadBtn.setText('Downloading...');
      
      await downloadFile();
      
      downloadBtn.setVariant('success');
      downloadBtn.setText('Downloaded!');
      
      setTimeout(() => {
        downloadBtn.setVariant('primary');
        downloadBtn.setText('Download');
      }, 2000);
    } catch (error) {
      downloadBtn.setVariant('danger');
      downloadBtn.setText('Failed');
    } finally {
      downloadBtn.setLoading(false);
    }
  }
});
```

## Accessibility

The Button component follows WCAG AA accessibility guidelines:

### ARIA Attributes

- `role="button"` - Identifies the element as a button
- `aria-label` - Provides accessible name (especially for icon-only buttons)
- `aria-disabled` - Indicates disabled state
- `aria-busy` - Indicates loading state

### Keyboard Navigation

- **Tab** - Focus the button
- **Shift + Tab** - Focus previous element
- **Enter** - Activate the button
- **Space** - Activate the button

### Visual Indicators

- Clear focus ring for keyboard navigation
- Minimum touch target size of 44x44px
- WCAG AA color contrast ratios (4.5:1 for text, 3:1 for UI)

### Screen Reader Support

```javascript
// Icon-only button with proper label
const closeBtn = new Button({
  icon: '✕',
  iconPosition: 'only',
  ariaLabel: 'Close dialog'
});

// Loading button announces busy state
const loadingBtn = new Button({
  text: 'Processing',
  loading: true // Sets aria-busy="true"
});
```

## Styling

The component uses BEM naming convention:

```scss
.button                    // Block
.button--primary          // Modifier (variant)
.button--medium           // Modifier (size)
.button--loading          // Modifier (state)
.button--icon-only        // Modifier (layout)
.button__text             // Element
.button__icon             // Element
.button__icon--left       // Element modifier
.button__spinner          // Element
.button__ripple           // Element
.button__ripple-circle    // Element
```

### Custom Styling

Add custom classes:

```javascript
const customBtn = new Button({
  text: 'Custom',
  className: 'my-custom-class'
});
```

Or override CSS:

```css
.my-custom-class {
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
  border: none;
}
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing

Run tests:

```bash
npm test Button.test.js
```

The component includes comprehensive tests for:
- Initialization and configuration
- All variants and sizes
- State management (disabled, loading)
- Icon support
- Click handling
- Keyboard navigation
- Ripple effects
- Accessibility features
- Mounting/unmounting
- Dynamic updates

## Demo

Open `demo.html` in a browser to see all button variants, sizes, and features in action.

## Requirements Validation

This component satisfies the following requirements:

- **1.4**: Component-based architecture with clear interface
- **2.2**: SCSS with BEM naming convention
- **2.3**: Responsive design with mobile-first approach
- **8.1**: Button component with multiple variants
- **8.2**: Support for small, medium, large sizes
- **8.3**: Support for all required states
- **8.4**: Loading state with spinner
- **8.5**: Icon support (left, right, icon-only)
- **8.6**: Ripple effect on click
- **8.7**: Full keyboard navigation (Enter, Space)
- **8.8**: Proper ARIA attributes
- **8.9**: Consistent design system integration
- **8.10**: Custom onClick handlers with double-click prevention

## License

Part of the TikTok/YouTube Downloader frontend architecture rebuild.
