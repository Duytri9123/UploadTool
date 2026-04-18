/**
 * Main application entry point
 */

import './styles/main.scss';

import themeManager from './modules/theme-manager.js';
import stateManager from './modules/state-manager.js';
import apiClient from './modules/api-client.js';
import { initAccessibility, announce } from './modules/accessibility.js';

import { Sidebar } from './components/Sidebar/Sidebar.js';
import { Topbar } from './components/Topbar/Topbar.js';

import { UserPage } from './pages/UserPage/UserPage.js';
import { ProcessPage } from './pages/ProcessPage/ProcessPage.js';
import { TranscribePage } from './pages/TranscribePage/TranscribePage.js';
import { HistoryPage } from './pages/HistoryPage/HistoryPage.js';
import { ConfigPage } from './pages/ConfigPage/ConfigPage.js';
import { CookiesPage } from './pages/CookiesPage/CookiesPage.js';

// ── Icons (Lucide-style SVG) ──────────────────────────────────────────────────
const ICONS = {
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  process: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
  transcribe: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  history: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,
  config: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  cookies: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>`,
};

// ── Page registry ─────────────────────────────────────────────────────────────
const PAGES = {
  user:       { label: 'Tìm người dùng', Class: UserPage },
  process:    { label: 'Xử lý Video',    Class: ProcessPage },
  transcribe: { label: 'Phiên Âm',       Class: TranscribePage },
  history:    { label: 'Lịch Sử',        Class: HistoryPage },
  config:     { label: 'Cấu Hình',       Class: ConfigPage },
  cookies:    { label: 'Cookies',        Class: CookiesPage },
};

// ── App state ─────────────────────────────────────────────────────────────────
let currentPage = null;
let sidebar = null;
let topbar = null;

// ── Navigation ────────────────────────────────────────────────────────────────
function navigateTo(pageId) {
  const info = PAGES[pageId];
  if (!info) { console.warn('[App] Unknown page:', pageId); return; }

  const mainEl = document.getElementById('main-content');
  if (!mainEl) { console.error('[App] #main-content not found'); return; }

  // Unmount previous page
  if (currentPage) {
    try { currentPage.unmount(); } catch (e) { console.warn(e); }
    currentPage = null;
  }

  // Clear container
  mainEl.innerHTML = '';

  // Mount new page
  try {
    const page = new info.Class();
    page.mount(mainEl);
    currentPage = page;
  } catch (e) {
    console.error('[App] Failed to mount page:', pageId, e);
    mainEl.innerHTML = `<div style="padding:2rem;color:red">Error loading page: ${e.message}</div>`;
    return;
  }

  // Update topbar title
  topbar?.setTitle(info.label);

  // Update sidebar active item
  sidebar?.setActiveItem(pageId);

  // Announce to screen readers
  try { announce(`Đã chuyển đến trang ${info.label}`); } catch (_) {}

  console.log('[App] Navigated to:', pageId);
}

// ── Layout ────────────────────────────────────────────────────────────────────
function initLayout() {
  const appEl = document.getElementById('app');
  if (!appEl) { console.error('[App] #app not found'); return; }

  appEl.innerHTML = `
    <div id="sidebar-container"></div>
    <div class="app-main">
      <div id="topbar-container"></div>
      <main id="main-content" class="page-content" tabindex="-1" aria-label="Nội dung chính"></main>
    </div>
  `;

  // Build nav items
  const items = Object.entries(PAGES).map(([id, info]) => ({
    id,
    label: info.label,
    icon: ICONS[id] || '',
    href: `#${id}`,
  }));

  // Sidebar
  sidebar = new Sidebar({
    items,
    activeItem: 'user',
    onItemClick: (item) => {
      navigateTo(item.id);
    },
  });
  sidebar.mount(document.getElementById('sidebar-container'));

  // Topbar
  topbar = new Topbar({
    title: PAGES['user'].label,
    showThemeToggle: true,
    showHamburger: true,
    onHamburgerClick: () => sidebar.toggleVisibility(),
  });
  topbar.mount(document.getElementById('topbar-container'));
}

// ── Routing ───────────────────────────────────────────────────────────────────
function handleRouting() {
  const hash = window.location.hash.replace('#', '').trim();
  const pageId = PAGES[hash] ? hash : 'user';
  navigateTo(pageId);
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
function initWebSocket() {
  if (typeof io === 'undefined') return;
  try {
    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => stateManager.update('ui', { wsConnected: true }));
    socket.on('disconnect', () => stateManager.update('ui', { wsConnected: false }));
    socket.on('queue_update', (q) => { if (Array.isArray(q)) stateManager.set('queue', q); });
    socket.on('progress', (d) => stateManager.update('ui', { lastProgress: d }));
    socket.on('log', (d) => stateManager.update('ui', { lastLog: d }));
  } catch (e) {
    console.warn('[WS] Failed to connect:', e);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  console.log('[App] Bootstrapping...');

  // 1. Theme first (prevent flash)
  themeManager.init();

  // 2. Accessibility
  try { initAccessibility(); } catch (_) {}

  // 3. Layout
  initLayout();

  // 4. Initial route
  handleRouting();
  window.addEventListener('hashchange', handleRouting);

  // 5. WebSocket
  initWebSocket();

  // 6. Load config
  try {
    const config = await apiClient.get('/api/config');
    if (config) stateManager.setConfig(config);
  } catch (_) {}

  console.log('[App] Ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
