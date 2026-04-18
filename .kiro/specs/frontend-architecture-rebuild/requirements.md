# Requirements Document

## Introduction

Dự án TikTok/YouTube Downloader hiện tại có frontend được xây dựng với HTML templates, JavaScript inline và CSS không có cấu trúc rõ ràng. Feature này sẽ tái cấu trúc toàn bộ frontend với kiến trúc component-based hiện đại, SCSS modular, responsive design và dark/light mode được cải thiện, đồng thời giữ nguyên backend Python Flask và sửa lỗi 500 FUNCTION_INVOCATION_FAILED từ Vercel.

## Glossary

- **Frontend_System**: Hệ thống giao diện người dùng của ứng dụng TikTok/YouTube Downloader
- **Component**: Một đơn vị UI độc lập, tái sử dụng được với logic và style riêng
- **Module**: File JavaScript ES6 chứa logic nghiệp vụ cụ thể
- **SCSS**: CSS preprocessor cho phép viết CSS có cấu trúc, biến và nesting
- **BEM**: Block Element Modifier - phương pháp đặt tên class CSS
- **Responsive_Breakpoint**: Điểm chuyển đổi layout theo kích thước màn hình
- **Theme_System**: Hệ thống quản lý dark mode và light mode
- **API_Client**: Module xử lý tất cả các request đến backend
- **State_Manager**: Module quản lý trạng thái ứng dụng
- **Backend_Flask**: Server Python Flask hiện tại (giữ nguyên)
- **Vercel_Error**: Lỗi 500 FUNCTION_INVOCATION_FAILED khi deploy lên Vercel

## Requirements

### Requirement 1: Kiến trúc Component-Based

**User Story:** Là một developer, tôi muốn frontend được tổ chức theo kiến trúc component-based, để code dễ bảo trì, mở rộng và tái sử dụng.

#### Acceptance Criteria

1. THE Frontend_System SHALL tổ chức code theo cấu trúc component-based với các thư mục riêng biệt cho components, pages, modules, styles và assets
2. WHEN một component được tạo, THE Frontend_System SHALL bao gồm file JavaScript, SCSS và template HTML (nếu cần) trong cùng một thư mục component
3. THE Frontend_System SHALL sử dụng ES6 modules với import/export để tổ chức code
4. THE Frontend_System SHALL tách các component UI thành: Button, Input, Card, Modal, Sidebar, Topbar, ProgressBar, LogBox, FileUploader
5. THE Frontend_System SHALL tách các page components thành: UserPage, ProcessPage, TranscribePage, HistoryPage, ConfigPage, CookiesPage
6. FOR ALL components, THE Frontend_System SHALL đảm bảo mỗi component có interface rõ ràng với props/parameters được định nghĩa
7. THE Frontend_System SHALL implement component lifecycle methods (init, mount, unmount, update) khi cần thiết

### Requirement 2: SCSS Modular với BEM Methodology

**User Story:** Là một developer, tôi muốn CSS được viết bằng SCSS với BEM methodology, để styles có cấu trúc rõ ràng, dễ maintain và tránh conflict.

#### Acceptance Criteria

1. THE Frontend_System SHALL sử dụng SCSS thay vì CSS thuần
2. THE Frontend_System SHALL áp dụng BEM naming convention cho tất cả CSS classes
3. WHEN một component được tạo, THE Frontend_System SHALL có file SCSS riêng cho component đó
4. THE Frontend_System SHALL có file `_variables.scss` chứa tất cả CSS variables (colors, spacing, typography, breakpoints)
5. THE Frontend_System SHALL có file `_mixins.scss` chứa các SCSS mixins tái sử dụng (responsive, flexbox, animations)
6. THE Frontend_System SHALL có file `_base.scss` chứa reset CSS và base styles
7. THE Frontend_System SHALL có file `main.scss` import tất cả các file SCSS khác theo thứ tự: variables → mixins → base → components → pages
8. THE Frontend_System SHALL compile SCSS thành CSS với source maps để debug
9. FOR ALL SCSS files, THE Frontend_System SHALL sử dụng nesting tối đa 3 levels để tránh specificity issues

### Requirement 3: Responsive Design cho Multiple Devices

**User Story:** Là một user, tôi muốn ứng dụng hoạt động tốt trên mọi thiết bị (mobile, tablet, desktop), để tôi có thể sử dụng ở bất kỳ đâu.

#### Acceptance Criteria

1. THE Frontend_System SHALL định nghĩa 3 responsive breakpoints: mobile (<768px), tablet (768px-1024px), desktop (>1024px)
2. WHEN viewport width thay đổi, THE Frontend_System SHALL tự động điều chỉnh layout phù hợp với breakpoint
3. THE Frontend_System SHALL sử dụng mobile-first approach (viết CSS cho mobile trước, sau đó mở rộng cho tablet/desktop)
4. WHEN ở mobile view, THE Frontend_System SHALL collapse sidebar thành hamburger menu
5. WHEN ở mobile view, THE Frontend_System SHALL stack các grid columns thành single column
6. WHEN ở tablet view, THE Frontend_System SHALL hiển thị sidebar dạng collapsed với icons only
7. WHEN ở desktop view, THE Frontend_System SHALL hiển thị full sidebar với labels
8. THE Frontend_System SHALL sử dụng relative units (rem, em, %, vw, vh) thay vì fixed pixels cho sizing
9. THE Frontend_System SHALL đảm bảo touch targets có kích thước tối thiểu 44x44px trên mobile
10. THE Frontend_System SHALL test responsive design trên các breakpoints: 320px, 375px, 768px, 1024px, 1440px

### Requirement 4: Dark Mode và Light Mode

**User Story:** Là một user, tôi muốn có dark mode và light mode hoạt động tốt, để tôi có thể sử dụng ứng dụng thoải mái trong mọi điều kiện ánh sáng.

#### Acceptance Criteria

1. THE Frontend_System SHALL implement theme system với CSS custom properties (CSS variables)
2. THE Frontend_System SHALL định nghĩa color palette cho cả dark mode và light mode trong `_variables.scss`
3. WHEN user toggle theme, THE Frontend_System SHALL chuyển đổi theme mượt mà với transition animation
4. THE Frontend_System SHALL lưu theme preference vào localStorage
5. WHEN ứng dụng load, THE Frontend_System SHALL đọc theme preference từ localStorage hoặc sử dụng system preference (prefers-color-scheme)
6. THE Frontend_System SHALL đảm bảo contrast ratio đạt WCAG AA standard (4.5:1 cho text, 3:1 cho UI components)
7. THE Frontend_System SHALL cập nhật tất cả components để support cả dark và light mode
8. THE Frontend_System SHALL có toggle button rõ ràng để switch giữa dark/light mode
9. FOR ALL colors, THE Frontend_System SHALL sử dụng CSS variables thay vì hardcoded colors

### Requirement 5: Modular JavaScript với ES6 Modules

**User Story:** Là một developer, tôi muốn JavaScript được tổ chức thành các modules riêng biệt, để code dễ đọc, test và maintain.

#### Acceptance Criteria

1. THE Frontend_System SHALL tách JavaScript thành các modules: api-client, state-manager, ui-components, utils, validators, formatters
2. THE Frontend_System SHALL sử dụng ES6 import/export syntax cho tất cả modules
3. THE Frontend_System SHALL có module `api-client.js` xử lý tất cả HTTP requests đến backend
4. THE Frontend_System SHALL có module `state-manager.js` quản lý application state (queue, progress, config, auth)
5. THE Frontend_System SHALL có module `ui-components.js` chứa logic cho các UI components
6. THE Frontend_System SHALL có module `utils.js` chứa helper functions (debounce, throttle, formatBytes, formatDuration)
7. THE Frontend_System SHALL có module `validators.js` chứa validation logic (URL validation, form validation)
8. THE Frontend_System SHALL có module `formatters.js` chứa formatting functions (date, number, file size)
9. THE Frontend_System SHALL có module `constants.js` chứa tất cả constants (API endpoints, breakpoints, theme colors)
10. WHEN một module được import, THE Frontend_System SHALL chỉ expose public API và hide internal implementation
11. THE Frontend_System SHALL sử dụng async/await cho tất cả asynchronous operations
12. THE Frontend_System SHALL implement proper error handling với try-catch trong tất cả async functions

### Requirement 6: API Client Module

**User Story:** Là một developer, tôi muốn có một API client module tập trung, để tất cả API calls được quản lý ở một nơi và dễ dàng thay đổi.

#### Acceptance Criteria

1. THE Frontend_System SHALL có class `APIClient` xử lý tất cả HTTP requests
2. THE APIClient SHALL có methods cho tất cả API endpoints: `fetchUserVideos()`, `processVideo()`, `transcribe()`, `uploadToYouTube()`, `uploadToTikTok()`, `getConfig()`, `saveConfig()`
3. THE APIClient SHALL implement request interceptor để add common headers (Content-Type, Authorization)
4. THE APIClient SHALL implement response interceptor để handle common errors (401, 403, 500)
5. THE APIClient SHALL support streaming responses cho long-running operations (video processing, transcription)
6. WHEN API request fails, THE APIClient SHALL retry với exponential backoff (max 3 retries)
7. THE APIClient SHALL implement request timeout (default 30s, configurable per endpoint)
8. THE APIClient SHALL parse JSON responses và throw typed errors
9. THE APIClient SHALL support FormData upload cho file uploads
10. THE APIClient SHALL emit progress events cho file uploads và streaming operations

### Requirement 7: State Management

**User Story:** Là một developer, tôi muốn có state management rõ ràng, để application state được quản lý tập trung và predictable.

#### Acceptance Criteria

1. THE Frontend_System SHALL có class `StateManager` quản lý application state
2. THE StateManager SHALL quản lý các state slices: `queue`, `progress`, `config`, `auth`, `theme`, `ui`
3. THE StateManager SHALL implement observer pattern để components subscribe vào state changes
4. WHEN state thay đổi, THE StateManager SHALL notify tất cả subscribers
5. THE StateManager SHALL persist critical state vào localStorage (theme, config, auth tokens)
6. THE StateManager SHALL implement state validation trước khi update
7. THE StateManager SHALL provide getters và setters cho từng state slice
8. THE StateManager SHALL implement undo/redo cho critical operations (queue management)
9. THE StateManager SHALL log state changes trong development mode
10. THE StateManager SHALL prevent direct state mutation (immutable updates)

### Requirement 8: Button Components

**User Story:** Là một developer, tôi muốn có button components tái sử dụng, để UI consistent và code không bị duplicate.

#### Acceptance Criteria

1. THE Frontend_System SHALL có class `Button` component với variants: primary, secondary, danger, success, ghost
2. THE Button SHALL support sizes: small, medium, large
3. THE Button SHALL support states: default, hover, active, disabled, loading
4. WHEN button ở loading state, THE Button SHALL hiển thị spinner và disable interaction
5. THE Button SHALL support icon placement: left, right, icon-only
6. THE Button SHALL có ripple effect khi click
7. THE Button SHALL support keyboard navigation (Enter, Space)
8. THE Button SHALL có proper ARIA attributes (role, aria-label, aria-disabled)
9. THE Button SHALL có consistent padding, border-radius và typography theo design system
10. THE Button SHALL support custom onClick handlers và prevent double-click

### Requirement 9: Form Validation và Error Handling

**User Story:** Là một user, tôi muốn form validation rõ ràng và error messages hữu ích, để tôi biết chính xác lỗi gì và cách sửa.

#### Acceptance Criteria

1. THE Frontend_System SHALL validate tất cả form inputs trước khi submit
2. THE Frontend_System SHALL hiển thị inline error messages ngay dưới input field
3. WHEN user nhập URL, THE Frontend_System SHALL validate URL format real-time
4. WHEN validation fails, THE Frontend_System SHALL highlight input field với border màu đỏ và hiển thị error message
5. THE Frontend_System SHALL validate required fields, URL format, number ranges, file types, file sizes
6. THE Frontend_System SHALL hiển thị error toast cho API errors với message rõ ràng
7. WHEN API returns error, THE Frontend_System SHALL parse error response và hiển thị user-friendly message
8. THE Frontend_System SHALL implement debounced validation cho text inputs (300ms delay)
9. THE Frontend_System SHALL clear error messages khi user bắt đầu sửa input
10. THE Frontend_System SHALL disable submit button khi form có validation errors

### Requirement 10: Sửa lỗi Vercel 500 FUNCTION_INVOCATION_FAILED

**User Story:** Là một developer, tôi muốn ứng dụng deploy thành công lên Vercel, để users có thể truy cập ứng dụng online.

#### Acceptance Criteria

1. THE Frontend_System SHALL phân tích root cause của lỗi 500 FUNCTION_INVOCATION_FAILED
2. WHEN deploy lên Vercel, THE Frontend_System SHALL đảm bảo tất cả dependencies được install đúng
3. THE Frontend_System SHALL đảm bảo Python runtime version tương thích với Vercel
4. THE Frontend_System SHALL đảm bảo Flask app được configure đúng cho serverless environment
5. THE Frontend_System SHALL implement proper error logging để debug Vercel errors
6. THE Frontend_System SHALL optimize cold start time cho serverless functions
7. THE Frontend_System SHALL đảm bảo file paths sử dụng relative paths thay vì absolute paths
8. WHEN có long-running operations, THE Frontend_System SHALL implement proper timeout handling
9. THE Frontend_System SHALL test deployment trên Vercel staging environment trước khi deploy production
10. THE Frontend_System SHALL document deployment process và troubleshooting steps

### Requirement 11: Build System và Tooling

**User Story:** Là một developer, tôi muốn có build system tự động, để SCSS compile, JS bundle và assets được optimize.

#### Acceptance Criteria

1. THE Frontend_System SHALL sử dụng build tool (Vite hoặc Webpack) để bundle JavaScript modules
2. THE Frontend_System SHALL compile SCSS thành CSS với autoprefixer
3. THE Frontend_System SHALL minify CSS và JavaScript cho production
4. THE Frontend_System SHALL generate source maps cho development
5. THE Frontend_System SHALL implement hot module replacement (HMR) cho development
6. THE Frontend_System SHALL optimize images (compress, convert to WebP)
7. THE Frontend_System SHALL implement code splitting để reduce initial bundle size
8. THE Frontend_System SHALL generate cache-busting hashes cho static assets
9. THE Frontend_System SHALL có npm scripts: `dev` (development server), `build` (production build), `preview` (preview production build)
10. THE Frontend_System SHALL document build process trong README

### Requirement 12: Accessibility (A11y)

**User Story:** Là một user với disabilities, tôi muốn ứng dụng accessible, để tôi có thể sử dụng với screen readers và keyboard navigation.

#### Acceptance Criteria

1. THE Frontend_System SHALL có proper semantic HTML (header, nav, main, section, article, footer)
2. THE Frontend_System SHALL có proper heading hierarchy (h1 → h2 → h3, không skip levels)
3. THE Frontend_System SHALL có ARIA labels cho tất cả interactive elements
4. THE Frontend_System SHALL support full keyboard navigation (Tab, Shift+Tab, Enter, Space, Escape)
5. THE Frontend_System SHALL có visible focus indicators cho tất cả focusable elements
6. THE Frontend_System SHALL có proper color contrast (WCAG AA: 4.5:1 cho text, 3:1 cho UI)
7. THE Frontend_System SHALL có alt text cho tất cả images
8. THE Frontend_System SHALL announce dynamic content changes cho screen readers (aria-live)
9. THE Frontend_System SHALL có skip links để bypass navigation
10. THE Frontend_System SHALL test với screen readers (NVDA, JAWS, VoiceOver)

### Requirement 13: Performance Optimization

**User Story:** Là một user, tôi muốn ứng dụng load nhanh và responsive, để tôi không phải chờ đợi lâu.

#### Acceptance Criteria

1. THE Frontend_System SHALL có initial page load time < 3 seconds trên 3G connection
2. THE Frontend_System SHALL implement lazy loading cho images và heavy components
3. THE Frontend_System SHALL implement virtual scrolling cho long lists (video queue, history)
4. THE Frontend_System SHALL debounce search inputs và scroll events
5. THE Frontend_System SHALL throttle resize events
6. THE Frontend_System SHALL cache API responses khi appropriate
7. THE Frontend_System SHALL implement service worker cho offline support (optional)
8. THE Frontend_System SHALL minimize DOM manipulations (batch updates)
9. THE Frontend_System SHALL use CSS transforms thay vì position changes cho animations
10. THE Frontend_System SHALL measure performance với Lighthouse và đạt score > 90

### Requirement 14: Testing Strategy

**User Story:** Là một developer, tôi muốn có tests cho frontend code, để đảm bảo code quality và prevent regressions.

#### Acceptance Criteria

1. THE Frontend_System SHALL có unit tests cho utility functions (validators, formatters, utils)
2. THE Frontend_System SHALL có integration tests cho API client
3. THE Frontend_System SHALL có component tests cho UI components
4. THE Frontend_System SHALL có E2E tests cho critical user flows (download video, process video, upload)
5. THE Frontend_System SHALL có test coverage > 70%
6. THE Frontend_System SHALL run tests automatically trên CI/CD pipeline
7. THE Frontend_System SHALL use testing framework (Jest, Vitest) cho unit/integration tests
8. THE Frontend_System SHALL use E2E framework (Playwright, Cypress) cho E2E tests
9. THE Frontend_System SHALL mock API calls trong tests
10. THE Frontend_System SHALL document testing strategy trong README

### Requirement 15: Documentation

**User Story:** Là một developer mới, tôi muốn có documentation đầy đủ, để tôi có thể hiểu codebase và contribute nhanh chóng.

#### Acceptance Criteria

1. THE Frontend_System SHALL có README.md với project overview, setup instructions, build commands
2. THE Frontend_System SHALL có ARCHITECTURE.md giải thích folder structure và design decisions
3. THE Frontend_System SHALL có CONTRIBUTING.md với coding standards và PR guidelines
4. THE Frontend_System SHALL có JSDoc comments cho tất cả public functions và classes
5. THE Frontend_System SHALL có inline comments giải thích complex logic
6. THE Frontend_System SHALL có component documentation với props, events, examples
7. THE Frontend_System SHALL có API documentation với endpoints, request/response formats
8. THE Frontend_System SHALL có style guide với color palette, typography, spacing system
9. THE Frontend_System SHALL có changelog tracking major changes
10. THE Frontend_System SHALL keep documentation up-to-date với code changes
