# Frontend Architecture

## Overview

The frontend is a vanilla JavaScript SPA (Single Page Application) built without a framework. It uses ES6 modules, SCSS with BEM methodology, and Vite as the build tool.

## Design Decisions

### No Framework
Chosen to keep the bundle small and avoid framework overhead. The app is primarily a tool UI, not a complex interactive application.

### ES6 Modules
All JavaScript is organized as ES6 modules with explicit imports/exports. Vite handles bundling and tree-shaking.

### SCSS + BEM
- BEM (Block__Element--Modifier) naming prevents CSS conflicts
- SCSS variables and mixins ensure design consistency
- CSS custom properties enable runtime theme switching

### Observer Pattern for State
`StateManager` uses a simple observer pattern instead of a reactive framework. Components subscribe to specific state slices and re-render only when their slice changes.

### Hash-based Routing
Simple `window.location.hash` routing. No history API needed since the app is a single page with tab-like navigation.

## Component Lifecycle

Each component/page class follows this interface:

```js
class MyComponent {
  constructor(options) { /* init */ }
  mount(parent)        { /* append to DOM, start listeners */ }
  unmount()            { /* remove from DOM, cleanup */ }
  destroy()            { /* full cleanup, null refs */ }
  get element()        { /* return root HTMLElement */ }
}
```

## Data Flow

```
User Action
    │
    ▼
Page Component
    │ calls
    ▼
APIClient.post('/api/...')
    │ response
    ▼
StateManager.set('queue', [...])
    │ notifies
    ▼
Subscribed Components re-render
```

## Theme System

```
localStorage / prefers-color-scheme
    │
    ▼
ThemeManager.init()
    │ sets
    ▼
document.documentElement[data-theme="dark"]
    │ triggers
    ▼
CSS custom properties switch (--color-bg-primary, etc.)
    │ notifies
    ▼
Topbar updates icon
```

## Module Dependencies

```
main.js
├── theme-manager.js → theme.js
├── state-manager.js
├── api-client.js
├── accessibility.js
├── performance.js → utils.js
├── Sidebar.js
├── Topbar.js → theme-manager.js
└── Pages → api-client.js, state-manager.js, components
```

## SCSS Import Order

```scss
// main.scss
@import 'variables';   // Design tokens
@import 'mixins';      // Reusable mixins
@import 'base';        // Reset + CSS custom properties
@import 'responsive';  // Layout breakpoints
// Components (alphabetical)
// Pages (alphabetical)
```

## Vercel Deployment

- `vercel.json` routes all requests to `app.py` (Flask)
- Static assets served directly from `static/`
- `wsgi.py` provides the WSGI entry point
- Long-running operations (transcription, processing) use streaming responses
