# Design Document: Frontend Architecture Rebuild

## Overview

This design document outlines the comprehensive frontend architecture rebuild for the TikTok/YouTube Downloader application. The current frontend uses inline JavaScript, unstructured CSS, and lacks modern development practices. This rebuild will transform it into a maintainable, scalable, component-based architecture while preserving the existing Python Flask backend.

### Goals

- Implement component-based architecture with clear separation of concerns
- Adopt SCSS with BEM methodology for maintainable styling
- Ensure responsive design across mobile, tablet, and desktop devices
- Improve dark/light mode implementation with proper theme system
- Modularize JavaScript using ES6 modules
- Centralize API communication through dedicated client module
- Implement proper state management
- Fix Vercel deployment 500 FUNCTION_INVOCATION_FAILED error
- Maintain backward compatibility with Flask backend

### Non-Goals

- Rewriting the Python Flask backend
- Migrating to a frontend framework (React, Vue, Angular)
- Implementing server-side rendering
- Adding real-time collaboration features

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Application Layer                    │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Pages     │  │  Components  │  │   Modules   │  │  │
│  │  │  - User     │  │  - Button    │  │  - API      │  │  │
│  │  │  - Process  │  │  - Input     │  │  - State    │  │  │
│  │  │  - Config   │  │  - Modal     │  │  - Utils    │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │            State Manager (Observable)            │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │         API Client (HTTP + WebSocket)            │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Flask Backend (Unchanged)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Routes: /api/user_videos, /api/process_video    │  │
│  │  WebSocket: SocketIO for real-time progress          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

