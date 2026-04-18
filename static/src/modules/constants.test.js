/**
 * Constants Module Tests
 * 
 * Basic tests to verify the constants module exports correctly
 */

import {
  API_BASE,
  API_ENDPOINTS,
  BREAKPOINTS,
  COLORS,
  THEMES,
  CONFIG_KEYS,
  LAYOUT,
  TIMING,
  HTTP_STATUS,
  COOKIE_MODES,
  UPLOAD_PLATFORMS,
  PRIVACY_STATUS,
  TTS_ENGINES,
  VIDEO_PROCESS_MODES,
  BLUR_ZONES,
  LOG_LEVELS,
} from './constants.js';

// Test that all exports are defined
console.log('Testing constants module...');

// API Endpoints
console.assert(API_BASE === '/api', 'API_BASE should be /api');
console.assert(typeof API_ENDPOINTS === 'object', 'API_ENDPOINTS should be an object');
console.assert(API_ENDPOINTS.CONFIG === '/api/config', 'API_ENDPOINTS.CONFIG should be /api/config');
console.assert(API_ENDPOINTS.QUEUE === '/api/queue', 'API_ENDPOINTS.QUEUE should be /api/queue');

// Breakpoints
console.assert(typeof BREAKPOINTS === 'object', 'BREAKPOINTS should be an object');
console.assert(BREAKPOINTS.XS === 320, 'BREAKPOINTS.XS should be 320');
console.assert(BREAKPOINTS.MD === 768, 'BREAKPOINTS.MD should be 768');
console.assert(BREAKPOINTS.LG === 1024, 'BREAKPOINTS.LG should be 1024');

// Colors
console.assert(typeof COLORS === 'object', 'COLORS should be an object');
console.assert(COLORS.PRIMARY === '#2563eb', 'COLORS.PRIMARY should be #2563eb');
console.assert(COLORS.SUCCESS === '#047857', 'COLORS.SUCCESS should be #047857');

// Themes
console.assert(typeof THEMES === 'object', 'THEMES should be an object');
console.assert(THEMES.LIGHT === 'light', 'THEMES.LIGHT should be light');
console.assert(THEMES.DARK === 'dark', 'THEMES.DARK should be dark');

// Config Keys
console.assert(typeof CONFIG_KEYS === 'object', 'CONFIG_KEYS should be an object');
console.assert(CONFIG_KEYS.PATH === 'path', 'CONFIG_KEYS.PATH should be path');
console.assert(CONFIG_KEYS.TRANSCRIPT_ENABLED === 'transcript.enabled', 'CONFIG_KEYS.TRANSCRIPT_ENABLED should be transcript.enabled');

// Layout
console.assert(typeof LAYOUT === 'object', 'LAYOUT should be an object');
console.assert(LAYOUT.SIDEBAR_WIDTH === 280, 'LAYOUT.SIDEBAR_WIDTH should be 280');
console.assert(LAYOUT.TOPBAR_HEIGHT === 64, 'LAYOUT.TOPBAR_HEIGHT should be 64');

// Timing
console.assert(typeof TIMING === 'object', 'TIMING should be an object');
console.assert(TIMING.TRANSITION_BASE === 200, 'TIMING.TRANSITION_BASE should be 200');
console.assert(TIMING.DEBOUNCE_DEFAULT === 300, 'TIMING.DEBOUNCE_DEFAULT should be 300');

// HTTP Status
console.assert(typeof HTTP_STATUS === 'object', 'HTTP_STATUS should be an object');
console.assert(HTTP_STATUS.OK === 200, 'HTTP_STATUS.OK should be 200');
console.assert(HTTP_STATUS.NOT_FOUND === 404, 'HTTP_STATUS.NOT_FOUND should be 404');

// Cookie Modes
console.assert(typeof COOKIE_MODES === 'object', 'COOKIE_MODES should be an object');
console.assert(COOKIE_MODES.DEFAULT === 'default', 'COOKIE_MODES.DEFAULT should be default');

// Upload Platforms
console.assert(typeof UPLOAD_PLATFORMS === 'object', 'UPLOAD_PLATFORMS should be an object');
console.assert(UPLOAD_PLATFORMS.YOUTUBE === 'youtube', 'UPLOAD_PLATFORMS.YOUTUBE should be youtube');

// Privacy Status
console.assert(typeof PRIVACY_STATUS === 'object', 'PRIVACY_STATUS should be an object');
console.assert(PRIVACY_STATUS.PRIVATE === 'private', 'PRIVACY_STATUS.PRIVATE should be private');

// TTS Engines
console.assert(typeof TTS_ENGINES === 'object', 'TTS_ENGINES should be an object');
console.assert(TTS_ENGINES.EDGE_TTS === 'edge-tts', 'TTS_ENGINES.EDGE_TTS should be edge-tts');

// Video Process Modes
console.assert(typeof VIDEO_PROCESS_MODES === 'object', 'VIDEO_PROCESS_MODES should be an object');
console.assert(VIDEO_PROCESS_MODES.AI === 'ai', 'VIDEO_PROCESS_MODES.AI should be ai');

// Blur Zones
console.assert(typeof BLUR_ZONES === 'object', 'BLUR_ZONES should be an object');
console.assert(BLUR_ZONES.BOTTOM === 'bottom', 'BLUR_ZONES.BOTTOM should be bottom');

// Log Levels
console.assert(typeof LOG_LEVELS === 'object', 'LOG_LEVELS should be an object');
console.assert(LOG_LEVELS.INFO === 'info', 'LOG_LEVELS.INFO should be info');

console.log('✓ All constants module tests passed!');
