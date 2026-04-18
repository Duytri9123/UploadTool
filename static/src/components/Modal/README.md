# Modal Component

A reusable modal dialog component with backdrop, keyboard navigation, focus trap, and accessibility features.

## Features

- ✅ Multiple sizes (small, medium, large, full)
- ✅ Backdrop with click-to-close
- ✅ Keyboard navigation (Escape to close)
- ✅ Focus trap (keeps focus within modal)
- ✅ Body scroll prevention
- ✅ Smooth animations
- ✅ Responsive design (full screen on mobile)
- ✅ Dark mode support
- ✅ WCAG AA accessibility compliant
- ✅ BEM naming convention

## Usage

### Basic Example

```javascript
import { Modal } from './components/Modal/Modal.js';

const modal = new Modal({
  title: 'Confirm Action',
  body: 'Are you sure you want to proceed?',
  size: 'medium'
});

modal.open();
```

### With Footer Buttons

```javascript
const modal = new Modal({
  title: 'Delete Item',
  body: 'This action cannot be undone.',
  footer: `
    <button class="button button--ghost" onclick="modal.close()">Cancel</button>
    <button class="button button--danger" onclick="handleDelete()">Delete</button>
  `,
  size: 'small'
});
```

### With Form Content

```javascript
const modal = new Modal({
  title: 'Contact Form',
  body: `
    <form id="contactForm">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" required>
      </div>
    </form>
  `,
  footer: `
    <button class="button button--ghost" onclick="modal.close()">Cancel</button>
    <button class="button button--primary" onclick="submitForm()">Submit</button>
  `
});
```

### With Callbacks

```javascript
const modal = new Modal({
  title: 'Welcome',
  body: 'Welcome to our application!',
  onOpen: () => console.log('Modal opened'),
  onClose: () => console.log('Modal closed'),
  onBackdropClick: () => console.log('Backdrop clicked')
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string\|HTMLElement | `null` | Modal title (header content) |
| `body` | string\|HTMLElement | `null` | Modal body content |
| `footer` | string\|HTMLElement | `null` | Modal footer content |
| `size` | string | `'medium'` | Modal size: `small`, `medium`, `large`, `full` |
| `closeOnBackdrop` | boolean | `true` | Close modal when clicking backdrop |
| `closeOnEscape` | boolean | `true` | Close modal when pressing Escape |
| `showCloseButton` | boolean | `true` | Show close button in header |
| `className` | string | `''` | Additional CSS classes |
| `onOpen` | function | `null` | Callback when modal opens |
| `onClose` | function | `null` | Callback when modal closes |
| `onBackdropClick` | function | `null` | Callback when backdrop is clicked |

## Methods

### `open()`
Opens the modal.

```javascript
modal.open();
```

### `close()`
Closes the modal.

```javascript
modal.close();
```

### `toggle()`
Toggles the modal open/close state.

```javascript
modal.toggle();
```

### `setTitle(title)`
Updates the modal title.

```javascript
modal.setTitle('New Title');
```

### `setBody(body)`
Updates the modal body content.

```javascript
modal.setBody('<p>New content</p>');
```

### `setFooter(footer)`
Updates the modal footer content.

```javascript
modal.setFooter('<button>OK</button>');
```

### `destroy()`
Destroys the modal and cleans up resources.

```javascript
modal.destroy();
```

## Properties

### `element`
Returns the modal DOM element.

```javascript
const element = modal.element;
```

### `isOpen`
Returns whether the modal is currently open.

```javascript
if (modal.isOpen) {
  console.log('Modal is open');
}
```

## Keyboard Navigation

- **Tab**: Move focus forward through focusable elements
- **Shift + Tab**: Move focus backward through focusable elements
- **Escape**: Close modal (if `closeOnEscape` is true)

## Focus Trap

When the modal is open, focus is trapped within the modal. Pressing Tab will cycle through focusable elements within the modal, and pressing Shift+Tab will cycle backwards. Focus cannot leave the modal until it is closed.

## Accessibility

The Modal component follows WCAG AA accessibility guidelines:

- Uses semantic HTML with proper ARIA attributes
- Implements focus trap to keep focus within modal
- Supports keyboard navigation
- Prevents body scroll when open
- Restores focus to previously focused element when closed
- Has proper color contrast in both light and dark modes
- Announces modal state to screen readers

### ARIA Attributes

- `role="dialog"`: Identifies the element as a dialog
- `aria-modal="true"`: Indicates the modal is modal
- `aria-labelledby`: References the modal title
- `aria-describedby`: References the modal body
- `aria-hidden`: Indicates visibility state

## Responsive Design

The modal is fully responsive:

- **Mobile (<768px)**: Full screen modal
- **Tablet (768px-1024px)**: Sized modal with margins
- **Desktop (>1024px)**: Sized modal centered on screen

## Dark Mode

The modal automatically adapts to dark mode when `[data-theme="dark"]` is set on the document root.

## BEM Class Structure

```
.modal
├── .modal--open
├── .modal__backdrop
├── .modal__dialog
│   ├── .modal__dialog--small
│   ├── .modal__dialog--medium
│   ├── .modal__dialog--large
│   └── .modal__dialog--full
├── .modal__header
│   ├── .modal__title
│   └── .modal__close
├── .modal__body
└── .modal__footer
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Demo

See `static/modal-demo.html` for a comprehensive demo of all modal features.
