# Frontend Architecture — Douyin Downloader

Modern component-based frontend built with ES6 modules, SCSS/BEM, and Vite.

## Setup

```bash
npm install
npm run dev      # Development server with HMR
npm run build    # Production build → static/dist/
npm run preview  # Preview production build
npm run test:run # Run tests once
```

## Directory Structure

```
static/src/
├── assets/              Static assets (images, fonts)
├── components/          Reusable UI components (BEM + SCSS)
│   ├── Button/
│   ├── Card/
│   ├── FileUploader/
│   ├── Input/
│   ├── LogBox/
│   ├── Modal/
│   ├── ProgressBar/
│   ├── Sidebar/
│   └── Topbar/
├── modules/             Business logic modules
│   ├── accessibility.js  Skip links, ARIA, focus management
│   ├── api-client.js     HTTP client with retry/timeout
│   ├── constants.js      App-wide constants
│   ├── form-validator.js DOM form validation + toast
│   ├── formatters.js     Date, number, file size formatters
│   ├── i18n.js           Vietnamese/English translations
│   ├── performance.js    Lazy loading, virtual scroll, cache
│   ├── queue-manager.js  Queue state ↔ backend sync
│   ├── state-manager.js  Centralized state (observer pattern)
│   ├── theme-manager.js  Dark/light mode (re-exports theme.js)
│   ├── theme.js          ThemeManager implementation
│   ├── utils.js          debounce, throttle, DOM helpers
│   ├── validators.js     URL, form, file validators
│   └── websocket.js      Socket.IO wrapper
├── pages/               Page-level components
│   ├── ConfigPage/
│   ├── CookiesPage/
│   ├── HistoryPage/
│   ├── ProcessPage/
│   ├── TranscribePage/
│   └── UserPage/
├── styles/              Global SCSS
│   ├── _base.scss        CSS reset, custom properties, utilities
│   ├── _mixins.scss      Responsive, flexbox, animation mixins
│   ├── _responsive.scss  Layout breakpoints and responsive utilities
│   ├── _variables.scss   Design tokens (colors, spacing, typography)
│   └── main.scss         Entry point — imports all partials
└── main.js              App bootstrap (theme → a11y → layout → routing)
```

## Key Concepts

### Theme System
- CSS custom properties in `:root` (light) and `[data-theme="dark"]`
- `ThemeManager` reads localStorage / `prefers-color-scheme`
- Toggle via `themeManager.toggleTheme()`

### State Management
- `StateManager` singleton with observer pattern
- Slices: `queue`, `progress`, `config`, `auth`, `theme`, `ui`
- Critical state persisted to localStorage

### Routing
- Hash-based: `#user`, `#process`, `#transcribe`, `#history`, `#config`, `#cookies`
- Each page is a class with `mount(parent)` / `unmount()` lifecycle

### Form Validation
- `FormValidator` class — attach to any `<form>` element
- Real-time debounced validation (300ms)
- Inline error messages + toast for API errors

### Performance
- `VirtualScroller` for long lists (history, queue)
- `ResponseCache` for API responses (5 min TTL)
- Lazy image loading via `IntersectionObserver`
- Debounced inputs, throttled scroll/resize

## Build Output

Vite outputs to `static/dist/assets/`:
- `main.js` — bundled ES module
- `main.css` — compiled SCSS

Flask template `templates/spa_new.html` loads these assets.

## Testing

```bash
npm run test:run   # Run all tests once
npm run test       # Watch mode
```

Tests use Vitest + jsdom. Each module has a co-located `.test.js` file.
