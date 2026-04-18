/**
 * Constants Module
 * 
 * Centralized constants for the application including:
 * - API endpoints
 * - Responsive breakpoints
 * - Theme colors
 * - Configuration keys
 * 
 * @module constants
 */

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Base API path
 */
export const API_BASE = '/api';

/**
 * API endpoints for all backend routes
 */
export const API_ENDPOINTS = {
  // Configuration
  CONFIG: `${API_BASE}/config`,
  
  // Queue Management
  QUEUE: `${API_BASE}/queue`,
  QUEUE_ADD: `${API_BASE}/queue/add`,
  QUEUE_REMOVE: `${API_BASE}/queue/remove`,
  QUEUE_REORDER: `${API_BASE}/queue/reorder`,
  QUEUE_UPDATE: `${API_BASE}/queue/update`,
  QUEUE_CLEAR: `${API_BASE}/queue/clear`,
  
  // Cookie Management
  COOKIES: `${API_BASE}/cookies`,
  COOKIE_MODE: `${API_BASE}/cookie_mode`,
  PARSE_COOKIE: `${API_BASE}/parse_cookie`,
  VALIDATE_COOKIE: `${API_BASE}/validate_cookie`,
  AUTO_FETCH_COOKIE: `${API_BASE}/auto_fetch_cookie`,
  
  // User Videos
  USER_VIDEOS_PAGE: `${API_BASE}/user_videos_page`,
  USER_INFO: `${API_BASE}/user_info`,
  
  // History
  HISTORY: `${API_BASE}/history`,
  HISTORY_CLEAR: `${API_BASE}/history/clear`,
  
  // Video Processing
  PROCESS_VIDEO: `${API_BASE}/process_video`,
  PROXY_IMAGE: `${API_BASE}/proxy_image`,
  UPLOAD_ANTI_FP_IMAGE: `${API_BASE}/upload_anti_fp_image`,
  UPLOAD_IMAGE: `${API_BASE}/upload-image`,
  BROWSE_FILE: `${API_BASE}/browse-file`,
  
  // Transcription
  TRANSCRIBE: `${API_BASE}/transcribe`,
  EXTRACT_AUDIO: `${API_BASE}/extract_audio`,
  
  // Translation
  TRANSLATE: `${API_BASE}/translate`,
  TRANSLATE_BATCH: `${API_BASE}/translate_batch`,
  TRANSLATION_STATUS: `${API_BASE}/translation_status`,
  
  // TTS (Text-to-Speech)
  TTS_PREVIEW: `${API_BASE}/tts_preview`,
  TTS_FROM_ASS: `${API_BASE}/tts_from_ass`,
  HF_TTS_MODELS: `${API_BASE}/hf-tts/models`,
  HF_VOICES: `${API_BASE}/hf_voices`,
  HF_VOICES_UPLOAD: `${API_BASE}/hf_voices/upload`,
  HF_VOICES_DELETE: (name) => `${API_BASE}/hf_voices/${name}`,
  
  // YouTube Upload
  YOUTUBE_AUTH: `${API_BASE}/youtube_auth`,
  YOUTUBE_CALLBACK: '/oauth2callback',
  
  // TikTok Upload
  TIKTOK_AUTH: `${API_BASE}/tiktok_auth`,
  TIKTOK_LOGOUT: `${API_BASE}/tiktok_logout`,
  TIKTOK_CALLBACK: `${API_BASE}/tiktok/callback`,
  TIKTOK_CREDENTIALS_STATUS: `${API_BASE}/tiktok/credentials_status`,
  
  // Ngrok
  NGROK_STATUS: `${API_BASE}/ngrok/status`,
};

// ============================================================================
// Responsive Breakpoints
// ============================================================================

/**
 * Responsive breakpoints (in pixels)
 * Mobile-first approach: design for mobile first, then scale up
 */
export const BREAKPOINTS = {
  XS: 320,    // Small mobile
  SM: 375,    // Mobile
  MD: 768,    // Tablet
  LG: 1024,   // Desktop
  XL: 1440,   // Large desktop
};

/**
 * Legacy breakpoint names for compatibility
 */
export const BREAKPOINT_MOBILE = BREAKPOINTS.MD;
export const BREAKPOINT_TABLET = BREAKPOINTS.LG;

/**
 * Media query strings for use in JavaScript
 */
export const MEDIA_QUERIES = {
  XS: `(min-width: ${BREAKPOINTS.XS}px)`,
  SM: `(min-width: ${BREAKPOINTS.SM}px)`,
  MD: `(min-width: ${BREAKPOINTS.MD}px)`,
  LG: `(min-width: ${BREAKPOINTS.LG}px)`,
  XL: `(min-width: ${BREAKPOINTS.XL}px)`,
  MOBILE: `(max-width: ${BREAKPOINTS.MD - 1}px)`,
  TABLET: `(min-width: ${BREAKPOINTS.MD}px) and (max-width: ${BREAKPOINTS.LG - 1}px)`,
  DESKTOP: `(min-width: ${BREAKPOINTS.LG}px)`,
};

// ============================================================================
// Theme Colors
// ============================================================================

/**
 * Theme color palette
 * These match the SCSS variables in _variables.scss
 */
export const COLORS = {
  // Primary Colors
  PRIMARY: '#2563eb',
  PRIMARY_LIGHT: '#60a5fa',
  PRIMARY_DARK: '#1d4ed8',
  
  // Secondary Colors
  SECONDARY: '#7c3aed',
  SECONDARY_LIGHT: '#a78bfa',
  SECONDARY_DARK: '#6d28d9',
  
  // Semantic Colors
  SUCCESS: '#047857',
  SUCCESS_LIGHT: '#34d399',
  SUCCESS_DARK: '#065f46',
  
  WARNING: '#b45309',
  WARNING_LIGHT: '#fbbf24',
  WARNING_DARK: '#92400e',
  
  DANGER: '#dc2626',
  DANGER_LIGHT: '#f87171',
  DANGER_DARK: '#b91c1c',
  
  INFO: '#06b6d4',
  INFO_LIGHT: '#22d3ee',
  INFO_DARK: '#0891b2',
  
  // Neutral Colors (Light Mode)
  GRAY_50: '#f9fafb',
  GRAY_100: '#f3f4f6',
  GRAY_200: '#e5e7eb',
  GRAY_300: '#d1d5db',
  GRAY_400: '#9ca3af',
  GRAY_500: '#6b7280',
  GRAY_600: '#4b5563',
  GRAY_700: '#374151',
  GRAY_800: '#1f2937',
  GRAY_900: '#0f172a',
  
  // Dark Mode Colors
  DARK_BG: '#0f172a',
  DARK_BG_SECONDARY: '#1e293b',
  DARK_BG_TERTIARY: '#334155',
  DARK_TEXT: '#f1f5f9',
  DARK_TEXT_SECONDARY: '#cbd5e1',
  DARK_BORDER: '#64748b',
  
  // Light Mode Colors
  LIGHT_BG: '#ffffff',
  LIGHT_BG_SECONDARY: '#f9fafb',
  LIGHT_BG_TERTIARY: '#f3f4f6',
  LIGHT_TEXT: '#111827',
  LIGHT_TEXT_SECONDARY: '#6b7280',
  LIGHT_BORDER: '#6b7280',
};

// ============================================================================
// Theme Configuration
// ============================================================================

/**
 * Theme modes
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

/**
 * Theme storage key in localStorage
 */
export const THEME_STORAGE_KEY = 'app-theme';

// ============================================================================
// Configuration Keys
// ============================================================================

/**
 * Configuration keys matching the backend config structure
 */
export const CONFIG_KEYS = {
  // Download Settings
  PATH: 'path',
  MUSIC: 'music',
  COVER: 'cover',
  AVATAR: 'avatar',
  JSON: 'json',
  START_TIME: 'start_time',
  END_TIME: 'end_time',
  FOLDERSTYLE: 'folderstyle',
  MODE: 'mode',
  NUMBER: 'number',
  INCREASE: 'increase',
  THREAD: 'thread',
  RATE_LIMIT: 'rate_limit',
  RETRY_TIMES: 'retry_times',
  PROXY: 'proxy',
  DATABASE: 'database',
  DATABASE_PATH: 'database_path',
  
  // Progress Settings
  PROGRESS: 'progress',
  PROGRESS_QUIET_LOGS: 'progress.quiet_logs',
  
  // Transcript Settings
  TRANSCRIPT: 'transcript',
  TRANSCRIPT_ENABLED: 'transcript.enabled',
  TRANSCRIPT_MODEL: 'transcript.model',
  TRANSCRIPT_GROQ_API_KEY: 'transcript.groq_api_key',
  TRANSCRIPT_GROQ_MODEL: 'transcript.groq_model',
  TRANSCRIPT_GROQ_MAX_MB: 'transcript.groq_max_mb',
  TRANSCRIPT_OUTPUT_DIR: 'transcript.output_dir',
  TRANSCRIPT_RESPONSE_FORMATS: 'transcript.response_formats',
  TRANSCRIPT_API_URL: 'transcript.api_url',
  TRANSCRIPT_API_KEY_ENV: 'transcript.api_key_env',
  TRANSCRIPT_API_KEY: 'transcript.api_key',
  
  // Cookie Settings
  AUTO_COOKIE: 'auto_cookie',
  COOKIE_MODE: 'cookie_mode',
  COOKIES: 'cookies',
  
  // Browser Fallback Settings
  BROWSER_FALLBACK: 'browser_fallback',
  BROWSER_FALLBACK_ENABLED: 'browser_fallback.enabled',
  BROWSER_FALLBACK_HEADLESS: 'browser_fallback.headless',
  BROWSER_FALLBACK_MAX_SCROLLS: 'browser_fallback.max_scrolls',
  BROWSER_FALLBACK_IDLE_ROUNDS: 'browser_fallback.idle_rounds',
  BROWSER_FALLBACK_WAIT_TIMEOUT: 'browser_fallback.wait_timeout_seconds',
  
  // Translation Settings
  TRANSLATION: 'translation',
  TRANSLATION_DEEPSEEK_KEY: 'translation.deepseek_key',
  TRANSLATION_OPENAI_KEY: 'translation.openai_key',
  TRANSLATION_GROQ_KEY: 'translation.groq_key',
  TRANSLATION_GROQ_MODEL: 'translation.groq_model',
  TRANSLATION_HF_TOKEN: 'translation.hf_token',
  TRANSLATION_PREFERRED_PROVIDER: 'translation.preferred_provider',
  TRANSLATION_NAMING_ENABLED: 'translation.naming_enabled',
  
  // Upload Settings
  UPLOAD: 'upload',
  UPLOAD_PLATFORM: 'upload.platform',
  UPLOAD_AUTO_UPLOAD: 'upload.auto_upload',
  
  // YouTube Upload Settings
  UPLOAD_YOUTUBE: 'upload.youtube',
  UPLOAD_YOUTUBE_TITLE_TEMPLATE: 'upload.youtube.title_template',
  UPLOAD_YOUTUBE_DESCRIPTION_TEMPLATE: 'upload.youtube.description_template',
  UPLOAD_YOUTUBE_PRIVACY_STATUS: 'upload.youtube.privacy_status',
  
  // TikTok Upload Settings
  UPLOAD_TIKTOK: 'upload.tiktok',
  UPLOAD_TIKTOK_TITLE_TEMPLATE: 'upload.tiktok.title_template',
  UPLOAD_TIKTOK_CAPTION_TEMPLATE: 'upload.tiktok.caption_template',
  UPLOAD_TIKTOK_PRIVACY_STATUS: 'upload.tiktok.privacy_status',
  UPLOAD_TIKTOK_SCOPES: 'upload.tiktok.scopes',
  UPLOAD_TIKTOK_CLIENT_KEY: 'upload.tiktok.client_key',
  UPLOAD_TIKTOK_CLIENT_SECRET: 'upload.tiktok.client_secret',
  UPLOAD_TIKTOK_CLIENT_KEY_ENV: 'upload.tiktok.client_key_env',
  UPLOAD_TIKTOK_CLIENT_SECRET_ENV: 'upload.tiktok.client_secret_env',
  UPLOAD_TIKTOK_REDIRECT_URI: 'upload.tiktok.redirect_uri',
  
  // Ngrok Settings
  NGROK: 'ngrok',
  NGROK_ENABLED: 'ngrok.enabled',
  NGROK_AUTHTOKEN: 'ngrok.authtoken',
  NGROK_DOMAIN: 'ngrok.domain',
  NGROK_BIND_TLS: 'ngrok.bind_tls',
  NGROK_PUBLIC_URL: 'ngrok.public_url',
  
  // HuggingFace Settings
  HUGGINGFACE: 'huggingface',
  HUGGINGFACE_HF_TOKEN: 'huggingface.hf_token',
  HUGGINGFACE_TTS_MODEL: 'huggingface.tts_model',
  HUGGINGFACE_TTS_SPEAKER_EMBEDDINGS: 'huggingface.tts_speaker_embeddings',
  HUGGINGFACE_DEVICE: 'huggingface.device',
  
  // Video Processing Settings
  VIDEO_PROCESS: 'video_process',
  VIDEO_PROCESS_ENABLED: 'video_process.enabled',
  VIDEO_PROCESS_MODEL: 'video_process.model',
  VIDEO_PROCESS_LANGUAGE: 'video_process.language',
  VIDEO_PROCESS_MODE: 'video_process.process_mode',
  VIDEO_PROCESS_BURN_SUBS: 'video_process.burn_subs',
  VIDEO_PROCESS_BLUR_ORIGINAL: 'video_process.blur_original',
  VIDEO_PROCESS_TRANSLATE: 'video_process.translate',
  VIDEO_PROCESS_BURN_VI_SUBS: 'video_process.burn_vi_subs',
  VIDEO_PROCESS_VOICE_CONVERT: 'video_process.voice_convert',
  VIDEO_PROCESS_KEEP_BG_MUSIC: 'video_process.keep_bg_music',
  VIDEO_PROCESS_KEEP_BG: 'video_process.keep_bg',
  VIDEO_PROCESS_BLUR_ZONE: 'video_process.blur_zone',
  VIDEO_PROCESS_TTS_VOICE: 'video_process.tts_voice',
  VIDEO_PROCESS_TTS_ENGINE: 'video_process.tts_engine',
  VIDEO_PROCESS_TTS_SPEED: 'video_process.tts_speed',
  VIDEO_PROCESS_AUTO_SPEED: 'video_process.auto_speed',
  VIDEO_PROCESS_PITCH_SEMITONES: 'video_process.pitch_semitones',
  VIDEO_PROCESS_FPT_API_KEY: 'video_process.fpt_api_key',
  VIDEO_PROCESS_BG_VOLUME: 'video_process.bg_volume',
  VIDEO_PROCESS_FONT_SIZE: 'video_process.font_size',
  VIDEO_PROCESS_BLUR_HEIGHT: 'video_process.blur_height',
  VIDEO_PROCESS_SUBTITLE_FORMAT: 'video_process.subtitle_format',
  VIDEO_PROCESS_MAX_WORDS_PER_SEGMENT: 'video_process.max_words_per_segment',
  VIDEO_PROCESS_MAX_CHARS_PER_SEGMENT: 'video_process.max_chars_per_segment',
  
  // CapCut Settings
  CAPCUT: 'capcut',
  CAPCUT_ENABLED: 'capcut.enabled',
  CAPCUT_AUTO_IMPORT: 'capcut.auto_import',
  CAPCUT_PATH: 'capcut.capcut_path',
  CAPCUT_AUTO_OPEN: 'capcut.auto_open',
};

// ============================================================================
// Layout Constants
// ============================================================================

/**
 * Layout dimensions
 */
export const LAYOUT = {
  SIDEBAR_WIDTH: 280,
  SIDEBAR_COLLAPSED_WIDTH: 72,
  TOPBAR_HEIGHT: 64,
  CONTAINER_MAX_WIDTH: 1280,
  TOUCH_TARGET_MIN: 44, // Minimum touch target size for mobile accessibility
};

// ============================================================================
// Timing Constants
// ============================================================================

/**
 * Timing constants for animations and debouncing
 */
export const TIMING = {
  TRANSITION_FAST: 150,
  TRANSITION_BASE: 200,
  TRANSITION_SLOW: 300,
  DEBOUNCE_DEFAULT: 300,
  DEBOUNCE_SEARCH: 500,
  THROTTLE_DEFAULT: 100,
  THROTTLE_SCROLL: 100,
  THROTTLE_RESIZE: 200,
};

// ============================================================================
// HTTP Status Codes
// ============================================================================

/**
 * Common HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// ============================================================================
// Cookie Modes
// ============================================================================

/**
 * Cookie modes
 */
export const COOKIE_MODES = {
  DEFAULT: 'default',
  CUSTOM: 'custom',
};

// ============================================================================
// Upload Platforms
// ============================================================================

/**
 * Upload platforms
 */
export const UPLOAD_PLATFORMS = {
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok',
};

// ============================================================================
// Privacy Status Options
// ============================================================================

/**
 * Privacy status options for uploads
 */
export const PRIVACY_STATUS = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  UNLISTED: 'unlisted',
};

// ============================================================================
// TTS Engines
// ============================================================================

/**
 * Text-to-Speech engines
 */
export const TTS_ENGINES = {
  EDGE_TTS: 'edge-tts',
  FPT_TTS: 'fpt-tts',
  HUGGINGFACE: 'huggingface',
};

// ============================================================================
// Video Process Modes
// ============================================================================

/**
 * Video processing modes
 */
export const VIDEO_PROCESS_MODES = {
  AI: 'ai',
  MANUAL: 'manual',
};

// ============================================================================
// Blur Zones
// ============================================================================

/**
 * Blur zones for video processing
 */
export const BLUR_ZONES = {
  TOP: 'top',
  BOTTOM: 'bottom',
  FULL: 'full',
};

// ============================================================================
// Log Levels
// ============================================================================

/**
 * Log levels for console and UI logging
 */
export const LOG_LEVELS = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  DEBUG: 'debug',
};
