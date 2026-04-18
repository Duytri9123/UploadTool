/**
 * Constants Module Usage Examples
 * 
 * This file demonstrates how to use the constants module in your code
 */

import {
  API_ENDPOINTS,
  BREAKPOINTS,
  MEDIA_QUERIES,
  COLORS,
  THEMES,
  CONFIG_KEYS,
  LAYOUT,
  TIMING,
  HTTP_STATUS,
} from './constants.js';

// ============================================================================
// Example 1: Using API Endpoints
// ============================================================================

async function fetchConfig() {
  try {
    const response = await fetch(API_ENDPOINTS.CONFIG);
    if (response.status === HTTP_STATUS.OK) {
      const config = await response.json();
      console.log('Config loaded:', config);
      return config;
    }
  } catch (error) {
    console.error('Failed to fetch config:', error);
  }
}

async function addToQueue(videoUrl) {
  try {
    const response = await fetch(API_ENDPOINTS.QUEUE_ADD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: videoUrl }),
    });
    
    if (response.status === HTTP_STATUS.OK) {
      const result = await response.json();
      console.log('Added to queue:', result);
      return result;
    }
  } catch (error) {
    console.error('Failed to add to queue:', error);
  }
}

// ============================================================================
// Example 2: Using Breakpoints for Responsive Design
// ============================================================================

function checkViewport() {
  const width = window.innerWidth;
  
  if (width < BREAKPOINTS.MD) {
    console.log('Mobile view');
    return 'mobile';
  } else if (width < BREAKPOINTS.LG) {
    console.log('Tablet view');
    return 'tablet';
  } else {
    console.log('Desktop view');
    return 'desktop';
  }
}

// Using media queries
function setupMediaQueryListeners() {
  const mobileQuery = window.matchMedia(MEDIA_QUERIES.MOBILE);
  const tabletQuery = window.matchMedia(MEDIA_QUERIES.TABLET);
  const desktopQuery = window.matchMedia(MEDIA_QUERIES.DESKTOP);
  
  mobileQuery.addEventListener('change', (e) => {
    if (e.matches) {
      console.log('Switched to mobile view');
      // Update UI for mobile
    }
  });
  
  tabletQuery.addEventListener('change', (e) => {
    if (e.matches) {
      console.log('Switched to tablet view');
      // Update UI for tablet
    }
  });
  
  desktopQuery.addEventListener('change', (e) => {
    if (e.matches) {
      console.log('Switched to desktop view');
      // Update UI for desktop
    }
  });
}

// ============================================================================
// Example 3: Using Theme Colors
// ============================================================================

function createButton(type = 'primary') {
  const button = document.createElement('button');
  
  switch (type) {
    case 'primary':
      button.style.backgroundColor = COLORS.PRIMARY;
      button.style.color = '#ffffff';
      break;
    case 'success':
      button.style.backgroundColor = COLORS.SUCCESS;
      button.style.color = '#ffffff';
      break;
    case 'danger':
      button.style.backgroundColor = COLORS.DANGER;
      button.style.color = '#ffffff';
      break;
    default:
      button.style.backgroundColor = COLORS.GRAY_200;
      button.style.color = COLORS.GRAY_900;
  }
  
  return button;
}

// ============================================================================
// Example 4: Using Config Keys
// ============================================================================

function getConfigValue(config, key) {
  // Helper to get nested config values using dot notation
  const keys = key.split('.');
  let value = config;
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return undefined;
    }
  }
  
  return value;
}

function updateTranscriptSettings(config) {
  const transcriptEnabled = getConfigValue(config, CONFIG_KEYS.TRANSCRIPT_ENABLED);
  const transcriptModel = getConfigValue(config, CONFIG_KEYS.TRANSCRIPT_MODEL);
  
  console.log('Transcript enabled:', transcriptEnabled);
  console.log('Transcript model:', transcriptModel);
  
  // Update UI based on config
}

// ============================================================================
// Example 5: Using Layout Constants
// ============================================================================

function setupSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  
  const width = window.innerWidth;
  
  if (width < BREAKPOINTS.MD) {
    // Mobile: hide sidebar
    sidebar.style.width = '0';
  } else if (width < BREAKPOINTS.LG) {
    // Tablet: collapsed sidebar
    sidebar.style.width = `${LAYOUT.SIDEBAR_COLLAPSED_WIDTH}px`;
  } else {
    // Desktop: full sidebar
    sidebar.style.width = `${LAYOUT.SIDEBAR_WIDTH}px`;
  }
}

// ============================================================================
// Example 6: Using Timing Constants for Debouncing
// ============================================================================

function debounce(func, delay = TIMING.DEBOUNCE_DEFAULT) {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Usage: debounce search input
const searchInput = document.querySelector('#search');
if (searchInput) {
  searchInput.addEventListener('input', debounce((e) => {
    console.log('Searching for:', e.target.value);
    // Perform search
  }, TIMING.DEBOUNCE_SEARCH));
}

// ============================================================================
// Example 7: Using Theme Constants
// ============================================================================

function getCurrentTheme() {
  return localStorage.getItem('app-theme') || THEMES.LIGHT;
}

function setTheme(theme) {
  if (theme !== THEMES.LIGHT && theme !== THEMES.DARK) {
    console.error('Invalid theme:', theme);
    return;
  }
  
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('app-theme', theme);
  console.log('Theme set to:', theme);
}

function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  setTheme(newTheme);
}

// ============================================================================
// Export examples for demonstration
// ============================================================================

export {
  fetchConfig,
  addToQueue,
  checkViewport,
  setupMediaQueryListeners,
  createButton,
  getConfigValue,
  updateTranscriptSettings,
  setupSidebar,
  debounce,
  getCurrentTheme,
  setTheme,
  toggleTheme,
};
