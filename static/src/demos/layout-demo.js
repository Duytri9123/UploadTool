/**
 * Layout Components Demo
 * Demonstrates Sidebar and Topbar components with responsive behavior
 */

import { Sidebar } from '../components/Sidebar/Sidebar.js';
import { Topbar } from '../components/Topbar/Topbar.js';

// ============================================================================
// Theme Management
// ============================================================================

let currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

// ============================================================================
// Navigation Items
// ============================================================================

const navigationItems = [
  {
    id: 'user',
    label: 'User Videos',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <polyline points="17 11 19 13 23 9"></polyline>
      </svg>
    `,
    href: '#user'
  },
  {
    id: 'process',
    label: 'Process Video',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
        <line x1="7" y1="2" x2="7" y2="22"></line>
        <line x1="17" y1="2" x2="17" y2="22"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <line x1="2" y1="7" x2="7" y2="7"></line>
        <line x1="2" y1="17" x2="7" y2="17"></line>
        <line x1="17" y1="17" x2="22" y2="17"></line>
        <line x1="17" y1="7" x2="22" y2="7"></line>
      </svg>
    `,
    href: '#process'
  },
  {
    id: 'transcribe',
    label: 'Transcribe',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    `,
    href: '#transcribe'
  },
  {
    id: 'history',
    label: 'History',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    `,
    href: '#history'
  },
  {
    id: 'config',
    label: 'Configuration',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M1 12h6m6 0h6m-13.2 5.2l4.2-4.2m0-6l-4.2-4.2"></path>
      </svg>
    `,
    href: '#config'
  },
  {
    id: 'cookies',
    label: 'Cookies',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `,
    href: '#cookies'
  }
];

// ============================================================================
// Initialize Sidebar
// ============================================================================

const sidebar = new Sidebar({
  items: navigationItems,
  activeItem: 'user',
  onItemClick: (item, event) => {
    console.log('Navigation item clicked:', item);
    
    // Update page title based on selected item
    topbar.setTitle(item.label);
    
    // In a real app, you would navigate to the page here
    // For demo, we just update the active state
  },
  onToggle: (state) => {
    console.log('Sidebar state changed:', state);
  }
});

sidebar.mount(document.getElementById('sidebar-container'));

// ============================================================================
// Initialize Topbar
// ============================================================================

const topbar = new Topbar({
  title: 'User Videos',
  showThemeToggle: true,
  showHamburger: true,
  currentTheme: currentTheme,
  onThemeToggle: (theme) => {
    console.log('Theme toggled:', theme);
    
    // Update theme
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  },
  onHamburgerClick: (isExpanded) => {
    console.log('Hamburger clicked, menu expanded:', isExpanded);
    
    // Toggle sidebar visibility (mobile)
    sidebar.toggleVisibility();
  }
});

topbar.mount(document.getElementById('topbar-container'));

// ============================================================================
// Demo Controls
// ============================================================================

// Toggle sidebar
document.getElementById('toggle-sidebar').addEventListener('click', () => {
  sidebar.toggle();
  console.log('Sidebar toggled');
});

// Collapse sidebar
document.getElementById('collapse-sidebar').addEventListener('click', () => {
  sidebar.collapse();
  console.log('Sidebar collapsed');
});

// Expand sidebar
document.getElementById('expand-sidebar').addEventListener('click', () => {
  sidebar.expand();
  console.log('Sidebar expanded');
});

// Change page title
document.getElementById('change-title').addEventListener('click', () => {
  const titles = ['Dashboard', 'Analytics', 'Settings', 'Profile', 'Reports'];
  const randomTitle = titles[Math.floor(Math.random() * titles.length)];
  topbar.setTitle(randomTitle);
  console.log('Title changed to:', randomTitle);
});

// Set active item
document.getElementById('set-active-process').addEventListener('click', () => {
  sidebar.setActiveItem('process');
  topbar.setTitle('Process Video');
  console.log('Active item set to: process');
});

// ============================================================================
// Keyboard Shortcuts Demo
// ============================================================================

document.addEventListener('keydown', (event) => {
  // Ctrl/Cmd + B: Toggle sidebar
  if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
    event.preventDefault();
    sidebar.toggle();
    console.log('Keyboard shortcut: Sidebar toggled');
  }
  
  // Ctrl/Cmd + T: Toggle theme
  if ((event.ctrlKey || event.metaKey) && event.key === 't') {
    event.preventDefault();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    topbar.setTheme(newTheme);
    currentTheme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('Keyboard shortcut: Theme toggled to', newTheme);
  }
});

// ============================================================================
// Responsive Behavior Demo
// ============================================================================

// Log viewport changes
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  const currentWidth = window.innerWidth;
  
  // Only log when crossing breakpoints
  if (
    (lastWidth < 768 && currentWidth >= 768) ||
    (lastWidth >= 768 && currentWidth < 768) ||
    (lastWidth < 1024 && currentWidth >= 1024) ||
    (lastWidth >= 1024 && currentWidth < 1024)
  ) {
    console.log('Viewport breakpoint crossed:', {
      width: currentWidth,
      breakpoint: currentWidth < 768 ? 'mobile' : currentWidth < 1024 ? 'tablet' : 'desktop'
    });
  }
  
  lastWidth = currentWidth;
});

// ============================================================================
// Console Info
// ============================================================================

console.log('Layout demo initialized');
console.log('Keyboard shortcuts:');
console.log('  - Ctrl/Cmd + B: Toggle sidebar');
console.log('  - Ctrl/Cmd + T: Toggle theme');
console.log('  - Tab: Navigate between interactive elements');
console.log('  - Arrow keys: Navigate sidebar items');
console.log('  - Enter/Space: Activate focused element');
console.log('\nTry resizing the window to see responsive behavior!');

