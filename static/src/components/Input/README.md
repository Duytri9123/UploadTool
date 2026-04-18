# Input Component

A reusable, accessible input component with validation, multiple types, states, and real-time feedback.

## Features

- ✅ Multiple input types: text, number, url, email, password, file, textarea
- ✅ Real-time validation with debouncing (300ms default)
- ✅ Built-in validators: required, URL, email, number range
- ✅ Custom validation support
- ✅ Inline error messages
- ✅ Icon support (left/right placement)
- ✅ Multiple states: default, focus, error, disabled, readonly
- ✅ WCAG AA accessibility compliant
- ✅ Full keyboard navigation
- ✅ BEM naming convention
- ✅ Dark mode support
- ✅ Responsive design

## Installation

```javascript
import { Input } from './components/Input/Input.js';
```

## Basic Usage

```javascript
const input = new Input({
  type: 'text',
  label: 'Username',
  placeholder: 'Enter username',
  required: true,
  onChange: (value) => console.log('Value:', value)
});

document.body.appendChild(input.element);
```

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | string | `'text'` | Input type: text, number, url, email, password, file, textarea |
| `label` | string | `null` | Label text |
| `placeholder` | string | `''` | Placeholder text |
| `value` | string | `''` | Initial value |
| `required` | boolean | `false` | Whether input is required |
| `disabled` | boolean | `false` | Whether input is disabled |
| `readonly` | boolean | `false` | Whether input is readonly |
| `name` | string | `null` | Input name attribute |
| `id` | string | `null` | Input id attribute (auto-generated if not provided) |
| `errorMessage` | string | `null` | Custom error message |
| `helpText` | string | `null` | Help text displayed below input |
| `validator` | function | `null` | Custom validator function |
| `onChange` | function | `null` | Change handler function |
| `onFocus` | function | `null` | Focus handler function |
| `onBlur` | function | `null` | Blur handler function |
| `icon` | string | `null` | Icon HTML or emoji |
| `iconPosition` | string | `'left'` | Icon position: left, right |
| `debounceDelay` | number | `300` | Debounce delay for validation (ms) |
| `min` | number | `null` | Minimum value (for number type) |
| `max` | number | `null` | Maximum value (for number type) |
| `rows` | number | `4` | Number of rows (for textarea type) |
| `accept` | string | `null` | Accepted file types (for file type) |
| `className` | string | `''` | Additional CSS classes |

### Methods

#### `getValue()`
Get the current input value.

```javascript
const value = input.getValue();
```

#### `setValue(value)`
Set the input value.

```javascript
input.setValue('new value');
```

#### `validate()`
Validate the input and return true if valid.

```javascript
const isValid = input.validate();
```

#### `isValid()`
Check if the input is currently valid.

```javascript
if (input.isValid()) {
  console.log('Input is valid');
}
```

#### `setError(message)`
Set error state with a message.

```javascript
input.setError('This field is required');
```

#### `clearError()`
Clear error state.

```javascript
input.clearError();
```

#### `setDisabled(disabled)`
Set disabled state.

```javascript
input.setDisabled(true);
```

#### `setReadonly(readonly)`
Set readonly state.

```javascript
input.setReadonly(true);
```

#### `setPlaceholder(placeholder)`
Update placeholder text.

```javascript
input.setPlaceholder('New placeholder');
```

#### `setLabel(label)`
Update label text.

```javascript
input.setLabel('New Label');
```

#### `setHelpText(helpText)`
Update help text.

```javascript
input.setHelpText('New help text');
```

#### `focus()`
Focus the input.

```javascript
input.focus();
```

#### `blur()`
Blur the input.

```javascript
input.blur();
```

#### `reset()`
Reset the input to its initial value.

```javascript
input.reset();
```

#### `mount(parent)`
Mount the input to a parent element.

```javascript
input.mount(document.getElementById('container'));
```

#### `unmount()`
Unmount the input from its parent.

```javascript
input.unmount();
```

#### `destroy()`
Destroy the input and clean up.

```javascript
input.destroy();
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `element` | HTMLElement | The input container element |
| `inputElement` | HTMLInputElement/HTMLTextAreaElement | The input field element |
| `mounted` | boolean | Whether the input is mounted |
| `hasError` | boolean | Whether the input has an error |
| `focused` | boolean | Whether the input is focused |
| `disabled` | boolean | Whether the input is disabled |
| `readonly` | boolean | Whether the input is readonly |

## Examples

### Required Text Input

```javascript
const input = new Input({
  type: 'text',
  label: 'Username',
  placeholder: 'Enter username',
  required: true,
  helpText: 'Username is required'
});
```

### URL Input with Validation

```javascript
const urlInput = new Input({
  type: 'url',
  label: 'Website',
  placeholder: 'https://example.com',
  required: true,
  onChange: (value) => {
    console.log('URL:', value);
  }
});
```

### Email Input

```javascript
const emailInput = new Input({
  type: 'email',
  label: 'Email',
  placeholder: 'user@example.com',
  required: true
});
```

### Number Input with Range

```javascript
const ageInput = new Input({
  type: 'number',
  label: 'Age',
  placeholder: 'Enter age',
  min: 18,
  max: 100,
  helpText: 'Must be between 18 and 100'
});
```

### Password Input with Custom Validation

```javascript
const passwordInput = new Input({
  type: 'password',
  label: 'Password',
  placeholder: 'Enter password',
  required: true,
  validator: (value) => {
    if (value.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(value)) {
      return { valid: false, error: 'Password must contain uppercase letter' };
    }
    return { valid: true };
  },
  helpText: 'Minimum 8 characters with uppercase letter'
});
```

### Textarea

```javascript
const textareaInput = new Input({
  type: 'textarea',
  label: 'Description',
  placeholder: 'Enter description',
  rows: 6,
  helpText: 'Maximum 500 characters',
  validator: (value) => value.length <= 500,
  errorMessage: 'Description is too long'
});
```

### Input with Icon

```javascript
const searchInput = new Input({
  type: 'text',
  label: 'Search',
  placeholder: 'Search...',
  icon: '🔍',
  iconPosition: 'left'
});
```

### File Input

```javascript
const fileInput = new Input({
  type: 'file',
  label: 'Upload Image',
  accept: '.jpg,.png,.gif',
  helpText: 'Max size: 5MB',
  onChange: (files) => {
    if (files && files.length > 0) {
      console.log('Selected file:', files[0].name);
    }
  }
});
```

### Custom Validation with Boolean Return

```javascript
const usernameInput = new Input({
  type: 'text',
  label: 'Username',
  validator: (value) => value.length >= 3 && value.length <= 20,
  errorMessage: 'Username must be 3-20 characters'
});
```

### Custom Validation with ValidationResult Return

```javascript
const usernameInput = new Input({
  type: 'text',
  label: 'Username',
  validator: (value) => {
    if (value.length < 3) {
      return { valid: false, error: 'Too short (min 3 characters)' };
    }
    if (value.length > 20) {
      return { valid: false, error: 'Too long (max 20 characters)' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return { valid: false, error: 'Only letters, numbers, and underscores allowed' };
    }
    return { valid: true };
  }
});
```

### Disabled Input

```javascript
const disabledInput = new Input({
  type: 'text',
  label: 'Disabled',
  value: 'Cannot edit',
  disabled: true
});
```

### Readonly Input

```javascript
const readonlyInput = new Input({
  type: 'text',
  label: 'Readonly',
  value: 'Cannot edit but can copy',
  readonly: true
});
```

## Validation

The Input component supports multiple validation types:

### Built-in Validation

- **Required**: Validates that the field is not empty
- **URL**: Validates URL format (for `type="url"`)
- **Email**: Validates email format (for `type="email"`)
- **Number Range**: Validates number is within min/max range (for `type="number"`)

### Custom Validation

You can provide a custom validator function that returns either:

1. **Boolean**: `true` if valid, `false` if invalid
2. **ValidationResult**: `{ valid: boolean, error?: string }`

```javascript
// Boolean return
validator: (value) => value.length >= 3

// ValidationResult return
validator: (value) => {
  if (value.length < 3) {
    return { valid: false, error: 'Too short' };
  }
  return { valid: true };
}
```

### Debounced Validation

Validation is debounced by default (300ms) to avoid excessive validation during typing. You can customize the delay:

```javascript
const input = new Input({
  type: 'text',
  debounceDelay: 500, // 500ms delay
  validator: (value) => value.length >= 3
});
```

## Styling

The component uses BEM naming convention:

```scss
.input                    // Container
.input--error            // Error state
.input--disabled         // Disabled state
.input--readonly         // Readonly state
.input--focus            // Focus state
.input--icon-left        // Has left icon
.input--icon-right       // Has right icon

.input__label            // Label
.input__required         // Required indicator (*)
.input__wrapper          // Input wrapper
.input__field            // Input/textarea field
.input__icon             // Icon
.input__icon--left       // Left icon
.input__icon--right      // Right icon
.input__help             // Help text
.input__error            // Error message
```

### Custom Styling

You can add custom classes:

```javascript
const input = new Input({
  className: 'my-custom-input'
});
```

## Accessibility

The Input component is WCAG AA compliant:

- ✅ Proper semantic HTML
- ✅ ARIA attributes (`aria-required`, `aria-invalid`, `aria-disabled`, `aria-readonly`)
- ✅ Error messages with `role="alert"` and `aria-live="polite"`
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Screen reader support
- ✅ Minimum touch target size (44x44px)
- ✅ Color contrast ratios meet WCAG AA standards

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing

Run tests:

```bash
npm test -- Input.test.js
```

## Demo

Open `demo.html` in a browser to see all input variants and features in action.

## Requirements Mapping

This component satisfies the following requirements from the spec:

- **1.4**: Component-based architecture with clear interface
- **2.2**: SCSS with BEM naming convention
- **2.3**: Responsive design
- **9.2**: Form validation
- **9.3**: Inline error messages
- **9.4**: Real-time validation with debouncing
- **9.8**: Proper ARIA attributes
- **9.9**: Keyboard navigation support

## License

MIT
