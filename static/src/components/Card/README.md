# Card Component

A reusable, accessible card component with optional header, body, and footer sections. Supports collapsible functionality with smooth animations and full keyboard navigation.

## Features

- ✅ Flexible content sections (header, body, footer)
- ✅ Multiple variants (default, bordered, elevated)
- ✅ Collapsible functionality with smooth animations
- ✅ Full keyboard navigation support
- ✅ WCAG AA accessibility compliant
- ✅ BEM naming convention
- ✅ Responsive design
- ✅ Dark mode support
- ✅ TypeScript-ready with JSDoc

## Installation

```javascript
import { Card } from './components/Card/Card.js';
```

## Basic Usage

### Simple Card

```javascript
const card = new Card({
  body: 'Simple card content'
});

document.body.appendChild(card.element);
```

### Card with All Sections

```javascript
const card = new Card({
  header: 'Card Title',
  body: 'Card content goes here',
  footer: 'Card footer'
});

document.body.appendChild(card.element);
```

### Collapsible Card

```javascript
const card = new Card({
  header: 'Collapsible Card',
  body: 'Click the header to toggle',
  collapsible: true,
  collapsed: false
});

document.body.appendChild(card.element);
```

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `header` | `string\|HTMLElement` | `null` | Card header content |
| `body` | `string\|HTMLElement` | `null` | Card body content |
| `footer` | `string\|HTMLElement` | `null` | Card footer content |
| `collapsible` | `boolean` | `false` | Whether card can be collapsed |
| `collapsed` | `boolean` | `false` | Initial collapsed state |
| `variant` | `string` | `'default'` | Card variant: `default`, `bordered`, `elevated` |
| `className` | `string` | `''` | Additional CSS classes |
| `onToggle` | `Function` | `null` | Callback when card is toggled |
| `onExpand` | `Function` | `null` | Callback when card is expanded |
| `onCollapse` | `Function` | `null` | Callback when card is collapsed |

### Methods

#### `toggle()`
Toggle the card's collapsed state.

```javascript
card.toggle();
```

#### `expand()`
Expand the card (only works if `collapsible: true`).

```javascript
card.expand();
```

#### `collapse()`
Collapse the card (only works if `collapsible: true`).

```javascript
card.collapse();
```

#### `setHeader(header)`
Update the card header content.

```javascript
card.setHeader('New Header');
// or with HTML element
const headerEl = document.createElement('h2');
headerEl.textContent = 'New Header';
card.setHeader(headerEl);
```

#### `setBody(body)`
Update the card body content.

```javascript
card.setBody('New body content');
```

#### `setFooter(footer)`
Update the card footer content.

```javascript
card.setFooter('New footer content');
```

#### `mount(parent)`
Mount the card to a parent element.

```javascript
card.mount(document.getElementById('container'));
```

#### `unmount()`
Unmount the card from its parent.

```javascript
card.unmount();
```

#### `destroy()`
Destroy the card and clean up resources.

```javascript
card.destroy();
```

### Properties (Getters)

| Property | Type | Description |
|----------|------|-------------|
| `element` | `HTMLElement` | The card DOM element |
| `mounted` | `boolean` | Whether the card is mounted |
| `collapsed` | `boolean` | Whether the card is collapsed |
| `collapsible` | `boolean` | Whether the card is collapsible |

## Variants

### Default
Standard card with base shadow.

```javascript
const card = new Card({
  header: 'Default Card',
  body: 'Standard appearance',
  variant: 'default'
});
```

### Bordered
Card with border instead of shadow.

```javascript
const card = new Card({
  header: 'Bordered Card',
  body: 'Has a border',
  variant: 'bordered'
});
```

### Elevated
Card with stronger shadow and hover effect.

```javascript
const card = new Card({
  header: 'Elevated Card',
  body: 'Stronger shadow',
  variant: 'elevated'
});
```

## Examples

### Card with Callbacks

```javascript
const card = new Card({
  header: 'Interactive Card',
  body: 'Content here',
  collapsible: true,
  onToggle: (collapsed) => {
    console.log(`Card is now ${collapsed ? 'collapsed' : 'expanded'}`);
  },
  onExpand: () => {
    console.log('Card expanded');
  },
  onCollapse: () => {
    console.log('Card collapsed');
  }
});
```

### Card with Rich Content

```javascript
const bodyElement = document.createElement('div');
bodyElement.innerHTML = `
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
`;

const card = new Card({
  header: '<h2>Task List</h2>',
  body: bodyElement,
  footer: '<small>3 items total</small>'
});
```

### Dynamic Updates

```javascript
const card = new Card({
  header: 'Dynamic Card',
  body: 'Original content',
  collapsible: true
});

// Update content dynamically
setTimeout(() => {
  card.setHeader('Updated Header');
  card.setBody('New content loaded!');
}, 2000);

// Toggle programmatically
setTimeout(() => {
  card.collapse();
}, 4000);
```

### Statistics Card

```javascript
const card = new Card({
  header: '<h3>📊 Statistics</h3>',
  body: `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
      <div>
        <div style="font-size: 2rem; font-weight: bold;">1,234</div>
        <div>Total Users</div>
      </div>
      <div>
        <div style="font-size: 2rem; font-weight: bold;">98%</div>
        <div>Success Rate</div>
      </div>
    </div>
  `,
  variant: 'elevated'
});
```

## Styling

The Card component uses BEM naming convention:

```scss
.card                    // Base card
.card--default          // Default variant
.card--bordered         // Bordered variant
.card--elevated         // Elevated variant
.card--collapsible      // Collapsible card
.card--collapsed        // Collapsed state
.card__header           // Header section
.card__body             // Body section
.card__footer           // Footer section
.card__toggle           // Toggle button (collapsible only)
.card__toggle-icon      // Toggle icon
.card__header-content   // Header content wrapper
```

### Custom Styling

You can add custom classes:

```javascript
const card = new Card({
  header: 'Custom Card',
  body: 'Content',
  className: 'my-custom-card'
});
```

Then style with CSS:

```css
.my-custom-card {
  border: 2px solid blue;
}

.my-custom-card .card__header {
  background-color: lightblue;
}
```

## Accessibility

The Card component is fully accessible:

- ✅ Semantic HTML with `role="article"`
- ✅ ARIA attributes (`aria-expanded`, `aria-hidden`, `aria-label`)
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Focus indicators
- ✅ Screen reader support
- ✅ Reduced motion support
- ✅ High contrast mode support

### Keyboard Navigation

For collapsible cards:
- **Tab**: Focus the toggle button
- **Enter** or **Space**: Toggle the card
- **Shift + Tab**: Move focus backward

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing

Run the test suite:

```bash
npm test -- Card.test.js --run
```

## Demo

Open `demo.html` in your browser to see live examples:

```bash
# From the project root
open static/src/components/Card/demo.html
```

## Related Components

- [Button](../Button/README.md) - Button component
- [Input](../Input/README.md) - Input component
- [Modal](../Modal/README.md) - Modal component

## License

MIT
