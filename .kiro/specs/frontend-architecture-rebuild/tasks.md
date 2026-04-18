# Implementation Plan: Frontend Architecture Rebuild

## Overview

This implementation plan transforms the TikTok/YouTube Downloader frontend from inline JavaScript and unstructured CSS into a modern, maintainable component-based architecture. The rebuild uses ES6 modules, SCSS with BEM methodology, responsive design, improved dark/light mode, centralized state management, and fixes Vercel deployment issues while preserving the Flask backend.

**Implementation Language:** JavaScript (ES6+) with SCSS for styling

**Key Technologies:**
- JavaScript ES6 Modules
- SCSS with BEM naming convention
- CSS Custom Properties for theming
- Vite for build tooling
- Flask backend (unchanged)

## Tasks

- [x] 1. Setup build system and project structure
  - Initialize Vite build configuration with SCSS support
  - Create new directory structure: `static/src/{components,pages,modules,styles,assets}`
  - Configure SCSS compilation with autoprefixer and source maps
  - Setup development server with hot module replacement
  - Add npm scripts: `dev`, `build`, `preview`
  - Configure build output to `static/dist/`
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.9_

- [x] 2. Create SCSS foundation and theme system
  - [x] 2.1 Create SCSS variables and base styles
    - Create `static/src/styles/_variables.scss` with color palette, spacing scale, typography, breakpoints
    - Define CSS custom properties for dark/light mode colors
    - Create `static/src/styles/_base.scss` with CSS reset and base element styles
    - Create `static/src/styles/_mixins.scss` with responsive, flexbox, and animation mixins
    - _Requirements: 2.4, 2.5, 2.6, 4.2_
  
  - [x] 2.2 Implement theme system with CSS custom properties
    - Define light mode color palette in `:root`
    - Define dark mode color palette in `[data-theme="dark"]`
    - Ensure WCAG AA contrast ratios (4.5:1 text, 3:1 UI)
    - Create theme toggle utility functions
    - _Requirements: 4.1, 4.2, 4.6, 4.9_
  
  - [x] 2.3 Create main SCSS entry point
    - Create `static/src/styles/main.scss` importing: variables → mixins → base → components → pages
    - Configure proper import order for cascade
    - _Requirements: 2.7_

- [x] 3. Build core JavaScript modules
  - [x] 3.1 Create constants module
    - Create `static/src/modules/constants.js` with API endpoints, breakpoints, theme colors, config keys
    - Export all constants as named exports
    - _Requirements: 5.9_
  
  - [x] 3.2 Create utilities module
    - Create `static/src/modules/utils.js` with debounce, throttle, formatBytes, formatDuration helpers
    - Add DOM manipulation helpers (createElement, addClass, removeClass)
    - Add date/time formatting utilities
    - _Requirements: 5.6, 13.4, 13.5_
  
  - [x] 3.3 Create validators module
    - Create `static/src/modules/validators.js` with URL validation, form validation, file type validation
    - Implement real-time validation with debouncing
    - Export validation functions and error message generators
    - _Requirements: 5.7, 9.1, 9.3, 9.5, 9.8_
  
  - [x] 3.4 Create formatters module
    - Create `static/src/modules/formatters.js` with date, number, file size, duration formatters
    - Support internationalization for number/date formats
    - _Requirements: 5.8_

- [x] 4. Implement API Client module
  - [x] 4.1 Create base APIClient class
    - Create `static/src/modules/api-client.js` with APIClient class
    - Implement request/response interceptors for headers and error handling
    - Add retry logic with exponential backoff (max 3 retries)
    - Implement request timeout (default 30s, configurable)
    - Support FormData uploads with progress events
    - _Requirements: 6.1, 6.3, 6.4, 6.6, 6.7, 6.9, 6.10_
  
  - [x] 4.2 Add API endpoint methods
    - Implement methods: `fetchUserVideos()`, `processVideo()`, `transcribe()`, `uploadToYouTube()`, `uploadToTikTok()`, `getConfig()`, `saveConfig()`, `getCookies()`, `saveCookies()`, `getQueue()`, `addToQueue()`, `removeFromQueue()`
    - Support streaming responses for long-running operations
    - Parse JSON responses and throw typed errors
    - _Requirements: 6.2, 6.5, 6.8_

- [x] 5. Implement State Manager module
  - [x] 5.1 Create StateManager class with observer pattern
    - Create `static/src/modules/state-manager.js` with StateManager class
    - Implement observer pattern for state subscriptions
    - Define state slices: queue, progress, config, auth, theme, ui
    - Implement getters and setters for each state slice
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7_
  
  - [x] 5.2 Add state persistence and validation
    - Persist critical state to localStorage (theme, config, auth tokens)
    - Implement state validation before updates
    - Prevent direct state mutation (immutable updates)
    - Add development mode state change logging
    - _Requirements: 7.5, 7.6, 7.9, 7.10_

- [x] 6. Create UI component system
  - [x] 6.1 Create Button component
    - Create `static/src/components/Button/Button.js` and `Button.scss`
    - Support variants: primary, secondary, danger, success, ghost
    - Support sizes: small, medium, large
    - Support states: default, hover, active, disabled, loading
    - Add ripple effect on click
    - Implement keyboard navigation (Enter, Space)
    - Add ARIA attributes (role, aria-label, aria-disabled)
    - Apply BEM naming convention for CSS classes
    - _Requirements: 1.4, 2.2, 2.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [x] 6.2 Create Input component
    - Create `static/src/components/Input/Input.js` and `Input.scss`
    - Support types: text, number, url, file, textarea
    - Support states: default, focus, error, disabled
    - Implement inline error message display
    - Add real-time validation with debouncing
    - Support icons (left/right placement)
    - Apply BEM naming convention
    - _Requirements: 1.4, 2.2, 2.3, 9.2, 9.3, 9.4, 9.8, 9.9_
  
  - [x] 6.3 Create Card component
    - Create `static/src/components/Card/Card.js` and `Card.scss`
    - Support collapsible cards with toggle functionality
    - Add card header, body, footer sections
    - Apply BEM naming convention
    - _Requirements: 1.4, 2.2, 2.3_
  
  - [x] 6.4 Create Modal component
    - Create `static/src/components/Modal/Modal.js` and `Modal.scss`
    - Implement modal open/close with backdrop
    - Support keyboard navigation (Escape to close)
    - Add focus trap for accessibility
    - Prevent body scroll when modal is open
    - Apply BEM naming convention
    - _Requirements: 1.4, 2.2, 2.3, 12.4_
  
  - [x] 6.5 Create ProgressBar component
    - Create `static/src/components/ProgressBar/ProgressBar.js` and `ProgressBar.scss`
    - Support determinate and indeterminate modes
    - Add percentage label and custom label support
    - Implement smooth transitions
    - Apply BEM naming convention
    - _Requirements: 1.4, 2.2, 2.3_
  
  - [x] 6.6 Create LogBox component
    - Create `static/src/components/LogBox/LogBox.js` and `LogBox.scss`
    - Support log levels: info, success, warning, error
    - Implement auto-scroll to bottom
    - Add timestamp to each log entry
    - Support log filtering by level
    - Apply BEM naming convention
    - _Requirements: 1.4, 2.2, 2.3_
  
  - [x] 6.7 Create FileUploader component
    - Create `static/src/components/FileUploader/FileUploader.js` and `FileUploader.scss`
    - Support drag-and-drop file upload
    - Validate file types and sizes
    - Show upload progress
    - Display file preview for images/videos
    - Apply BEM naming convention
    - _Requirements: 1.4, 2.2, 2.3, 9.5_

- [x] 7. Create layout components
  - [x] 7.1 Create Sidebar component
    - Create `static/src/components/Sidebar/Sidebar.js` and `Sidebar.scss`
    - Implement responsive behavior: full (desktop), collapsed (tablet), hamburger (mobile)
    - Add navigation items with active state
    - Support keyboard navigation
    - Apply BEM naming convention
    - _Requirements: 1.4, 2.2, 2.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x] 7.2 Create Topbar component
    - Create `static/src/components/Topbar/Topbar.js` and `Topbar.scss`
    - Add page title display
    - Add theme toggle button
    - Add hamburger menu button for mobile
    - Apply BEM naming convention
    - _Requirements: 1.4, 2.2, 2.3, 4.8_

- [x] 8. Implement theme toggle functionality
  - [x] 8.1 Create theme manager module
    - Create `static/src/modules/theme-manager.js`
    - Implement theme detection from localStorage or system preference (prefers-color-scheme)
    - Add theme toggle function with smooth transition
    - Save theme preference to localStorage
    - Emit theme change events for components
    - _Requirements: 4.3, 4.4, 4.5_
  
  - [x] 8.2 Integrate theme toggle in Topbar
    - Add theme toggle button to Topbar component
    - Connect button to theme manager
    - Update button icon based on current theme
    - _Requirements: 4.8_

- [x] 9. Create page components
  - [x] 9.1 Create UserPage component
    - Create `static/src/pages/UserPage/UserPage.js` and `UserPage.scss`
    - Migrate user video fetching logic from `static/js/user.js`
    - Implement video grid with lazy loading
    - Add URL input with validation
    - Integrate with APIClient for fetching user videos
    - Apply BEM naming convention
    - _Requirements: 1.5, 2.2, 2.3, 5.3, 9.3_
  
  - [x] 9.2 Create ProcessPage component
    - Create `static/src/pages/ProcessPage/ProcessPage.js` and `ProcessPage.scss`
    - Migrate video processing logic from `static/js/app.js`
    - Implement form with validation
    - Add progress tracking with ProgressBar and LogBox components
    - Integrate with APIClient for video processing
    - Apply BEM naming convention
    - _Requirements: 1.5, 2.2, 2.3, 5.3, 9.1, 9.2_
  
  - [x] 9.3 Create TranscribePage component
    - Create `static/src/pages/TranscribePage/TranscribePage.js` and `TranscribePage.scss`
    - Migrate transcription logic from `static/js/app.js`
    - Implement form with file upload and validation
    - Add progress tracking
    - Integrate with APIClient
    - Apply BEM naming convention
    - _Requirements: 1.5, 2.2, 2.3, 5.3_
  
  - [x] 9.4 Create HistoryPage component
    - Create `static/src/pages/HistoryPage/HistoryPage.js` and `HistoryPage.scss`
    - Migrate history logic from `static/js/history.js`
    - Implement virtual scrolling for long lists
    - Add search and filter functionality
    - Apply BEM naming convention
    - _Requirements: 1.5, 2.2, 2.3, 13.3_
  
  - [x] 9.5 Create ConfigPage component
    - Create `static/src/pages/ConfigPage/ConfigPage.js` and `ConfigPage.scss`
    - Migrate config logic from `static/js/config.js`
    - Implement form with validation
    - Add save/reset functionality
    - Integrate with StateManager for config state
    - Apply BEM naming convention
    - _Requirements: 1.5, 2.2, 2.3, 9.1_
  
  - [x] 9.6 Create CookiesPage component
    - Create `static/src/pages/CookiesPage/CookiesPage.js` and `CookiesPage.scss`
    - Migrate cookies logic from `static/js/cookies.js`
    - Implement cookie editor with validation
    - Add cookie mode toggle (default/custom)
    - Apply BEM naming convention
    - _Requirements: 1.5, 2.2, 2.3_

- [x] 10. Implement responsive design
  - [x] 10.1 Add responsive breakpoints to SCSS variables
    - Define breakpoints: mobile (<768px), tablet (768px-1024px), desktop (>1024px)
    - Create responsive mixins for media queries
    - _Requirements: 3.1, 3.8_
  
  - [x] 10.2 Implement mobile-first responsive styles
    - Apply mobile-first approach to all components and pages
    - Use relative units (rem, em, %, vw, vh) instead of fixed pixels
    - Ensure touch targets are minimum 44x44px on mobile
    - Test responsive design at breakpoints: 320px, 375px, 768px, 1024px, 1440px
    - _Requirements: 3.2, 3.3, 3.8, 3.9, 3.10_
  
  - [x] 10.3 Implement responsive layout adjustments
    - Mobile: collapse sidebar to hamburger menu, stack grid columns
    - Tablet: show collapsed sidebar with icons only
    - Desktop: show full sidebar with labels
    - _Requirements: 3.4, 3.5, 3.6, 3.7_

- [x] 11. Implement form validation and error handling
  - [x] 11.1 Create validation rules and error messages
    - Define validation rules for URL format, required fields, number ranges, file types, file sizes
    - Create user-friendly error messages
    - _Requirements: 9.5, 9.6_
  
  - [x] 11.2 Integrate validation into Input component
    - Add real-time validation with debouncing (300ms)
    - Display inline error messages
    - Highlight invalid fields with red border
    - Clear errors when user starts editing
    - _Requirements: 9.2, 9.3, 9.4, 9.8, 9.9_
  
  - [x] 11.3 Implement form-level validation
    - Validate entire form before submit
    - Disable submit button when form has errors
    - Show error toast for API errors
    - Parse API error responses and display user-friendly messages
    - _Requirements: 9.1, 9.6, 9.7, 9.10_

- [x] 12. Implement accessibility features
  - [x] 12.1 Add semantic HTML and ARIA attributes
    - Use proper semantic HTML (header, nav, main, section, article, footer)
    - Maintain proper heading hierarchy (h1 → h2 → h3)
    - Add ARIA labels to all interactive elements
    - Add alt text to all images
    - Implement aria-live regions for dynamic content
    - _Requirements: 12.1, 12.2, 12.3, 12.7, 12.8_
  
  - [x] 12.2 Implement keyboard navigation
    - Support full keyboard navigation (Tab, Shift+Tab, Enter, Space, Escape)
    - Add visible focus indicators to all focusable elements
    - Implement skip links to bypass navigation
    - _Requirements: 12.4, 12.5, 12.9_
  
  - [x] 12.3 Ensure color contrast compliance
    - Verify all text meets WCAG AA contrast ratio (4.5:1)
    - Verify all UI components meet WCAG AA contrast ratio (3:1)
    - Test with color contrast analyzer tools
    - _Requirements: 12.6_

- [x] 13. Implement performance optimizations
  - [x] 13.1 Add lazy loading for images and components
    - Implement lazy loading for images using Intersection Observer
    - Implement code splitting for heavy components
    - _Requirements: 13.2, 13.7_
  
  - [x] 13.2 Implement virtual scrolling for long lists
    - Add virtual scrolling to video queue and history lists
    - Render only visible items plus buffer
    - _Requirements: 13.3_
  
  - [x] 13.3 Optimize event handlers and animations
    - Debounce search inputs and scroll events
    - Throttle resize events
    - Use CSS transforms for animations instead of position changes
    - Minimize DOM manipulations with batch updates
    - _Requirements: 13.4, 13.5, 13.8, 13.9_
  
  - [x] 13.4 Implement API response caching
    - Cache API responses where appropriate (config, user info)
    - Implement cache invalidation strategy
    - _Requirements: 13.6_

- [x] 14. Fix Vercel deployment issues
  - [x] 14.1 Analyze and fix Vercel 500 error
    - Review Vercel logs to identify root cause of FUNCTION_INVOCATION_FAILED
    - Ensure Python runtime version is compatible with Vercel
    - Verify all dependencies are in requirements.txt
    - Check Flask app configuration for serverless environment
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 14.2 Optimize for serverless environment
    - Use relative paths instead of absolute paths
    - Implement proper timeout handling for long-running operations
    - Optimize cold start time
    - Add proper error logging for debugging
    - _Requirements: 10.5, 10.6, 10.7, 10.8_
  
  - [x] 14.3 Test and document deployment
    - Test deployment on Vercel staging environment
    - Document deployment process and troubleshooting steps
    - _Requirements: 10.9, 10.10_

- [x] 15. Create main application entry point
  - [x] 15.1 Create app initialization module
    - Create `static/src/main.js` as main entry point
    - Initialize StateManager, APIClient, ThemeManager
    - Setup page routing and navigation
    - Initialize all page components
    - Setup WebSocket connection for real-time updates
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 15.2 Update Flask templates to use new build output
    - Update `templates/spa.html` to load bundled JavaScript and CSS from `static/dist/`
    - Remove old inline scripts and styles
    - Add cache-busting hashes to asset URLs
    - _Requirements: 11.8_

- [x] 16. Migrate existing functionality
  - [x] 16.1 Migrate queue management
    - Move queue logic from `static/js/queue.js` to StateManager
    - Update UI to use new queue state
    - _Requirements: 7.2, 7.3_
  
  - [x] 16.2 Migrate WebSocket integration
    - Move WebSocket logic from `static/js/socket.js` to APIClient
    - Integrate with StateManager for real-time progress updates
    - _Requirements: 6.5, 6.10_
  
  - [x] 16.3 Migrate internationalization
    - Move i18n logic from `static/js/i18n.js` to utils module
    - Integrate with all components and pages
    - _Requirements: 5.6_

- [x] 17. Testing and quality assurance
  - [x] 17.1 Test responsive design across devices
    - Test on mobile devices (320px, 375px, 414px)
    - Test on tablets (768px, 1024px)
    - Test on desktop (1440px, 1920px)
    - Verify touch targets on mobile
    - _Requirements: 3.10_
  
  - [x] 17.2 Test theme switching
    - Test dark/light mode toggle
    - Verify theme persistence across page reloads
    - Check color contrast in both themes
    - _Requirements: 4.3, 4.4, 4.6_
  
  - [x] 17.3 Test form validation
    - Test all validation rules
    - Verify error messages display correctly
    - Test form submission with valid/invalid data
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 17.4 Test accessibility
    - Test keyboard navigation
    - Test with screen readers (NVDA, JAWS, VoiceOver)
    - Verify ARIA attributes
    - Check focus indicators
    - _Requirements: 12.4, 12.5, 12.10_
  
  - [x] 17.5 Test performance
    - Run Lighthouse audit (target score > 90)
    - Measure initial page load time (target < 3s on 3G)
    - Test lazy loading and virtual scrolling
    - _Requirements: 13.1, 13.2, 13.3, 13.10_

- [x] 18. Documentation
  - [x] 18.1 Create README.md
    - Document project overview
    - Add setup instructions
    - List build commands (dev, build, preview)
    - _Requirements: 15.1, 11.10_
  
  - [x] 18.2 Create ARCHITECTURE.md
    - Document folder structure
    - Explain design decisions
    - Describe component architecture
    - _Requirements: 15.2_
  
  - [x] 18.3 Add code documentation
    - Add JSDoc comments to all public functions and classes
    - Add inline comments for complex logic
    - Document component props, events, and examples
    - _Requirements: 15.4, 15.5, 15.6_
  
  - [x] 18.4 Create style guide
    - Document color palette
    - Document typography system
    - Document spacing scale
    - Document component usage examples
    - _Requirements: 15.8_

- [x] 19. Final integration and cleanup
  - [x] 19.1 Remove old code
    - Remove old inline JavaScript from templates
    - Remove old CSS files
    - Clean up unused files
    - _Requirements: 1.1, 1.2_
  
  - [x] 19.2 Final testing
    - Test all pages and features end-to-end
    - Verify no regressions in existing functionality
    - Test on multiple browsers (Chrome, Firefox, Safari, Edge)
    - _Requirements: 14.4_
  
  - [x] 19.3 Production build and deployment
    - Create production build with minification
    - Verify build output
    - Deploy to Vercel
    - Monitor for errors
    - _Requirements: 11.3, 10.9_

## Notes

- This is a comprehensive frontend rebuild that maintains backward compatibility with the Flask backend
- All tasks build incrementally - each task should result in working, testable code
- The build system (Vite) should be set up first to enable hot module replacement during development
- Components should be developed in isolation and tested before integration
- Responsive design should be tested continuously throughout development
- Accessibility should be built in from the start, not added later
- Performance optimizations should be implemented as features are built, not as an afterthought
- The Vercel deployment fix may require backend changes if the issue is related to serverless function configuration


