/**
 * Accessibility Module
 * Provides skip links, focus management, ARIA live regions, and keyboard navigation helpers.
 *
 * @module accessibility
 */

/**
 * Inject a skip-to-main-content link as the first element in <body>.
 * Keyboard users can press Tab then Enter to jump past navigation.
 * @param {string} [mainId='main-content'] - ID of the main content element
 */
export function injectSkipLink(mainId = 'main-content') {
  if (document.querySelector('.skip-link')) return;

  const link = document.createElement('a');
  link.href = `#${mainId}`;
  link.className = 'skip-link';
  link.textContent = 'Bỏ qua điều hướng';
  link.setAttribute('tabindex', '0');

  document.body.insertBefore(link, document.body.firstChild);
}

/**
 * Create an ARIA live region for announcing dynamic content to screen readers.
 * @param {string} [id='aria-live-region'] - Element ID
 * @param {'polite'|'assertive'} [politeness='polite']
 * @returns {HTMLElement} The live region element
 */
export function createLiveRegion(id = 'aria-live-region', politeness = 'polite') {
  let region = document.getElementById(id);
  if (region) return region;

  region = document.createElement('div');
  region.id = id;
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.className = 'sr-only';
  document.body.appendChild(region);
  return region;
}

/**
 * Announce a message to screen readers via an ARIA live region.
 * @param {string} message
 * @param {'polite'|'assertive'} [politeness='polite']
 */
export function announce(message, politeness = 'polite') {
  const id = politeness === 'assertive' ? 'aria-live-assertive' : 'aria-live-polite';
  const region = createLiveRegion(id, politeness);

  // Clear then set to trigger re-announcement
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/**
 * Trap focus within a container element (for modals, dialogs).
 * Returns a cleanup function to remove the trap.
 * @param {HTMLElement} container
 * @returns {Function} cleanup
 */
export function trapFocus(container) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const getFocusable = () => Array.from(container.querySelectorAll(focusableSelectors));

  const handleKeydown = (e) => {
    if (e.key !== 'Tab') return;

    const focusable = getFocusable();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeydown);

  // Focus first focusable element
  const focusable = getFocusable();
  if (focusable.length > 0) focusable[0].focus();

  return () => container.removeEventListener('keydown', handleKeydown);
}

/**
 * Restore focus to a previously focused element (used when closing modals).
 * @param {HTMLElement} element - Element to restore focus to
 */
export function restoreFocus(element) {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
}

/**
 * Add visible focus indicators to all focusable elements in a container.
 * @param {HTMLElement} [container=document]
 */
export function enhanceFocusIndicators(container = document) {
  const style = document.createElement('style');
  style.id = 'focus-indicators';
  if (document.getElementById('focus-indicators')) return;

  style.textContent = `
    :focus-visible {
      outline: 2px solid var(--color-primary, #2563eb) !important;
      outline-offset: 2px !important;
    }
    :focus:not(:focus-visible) {
      outline: none !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialize all accessibility features for the application.
 * Call once on app startup.
 */
export function initAccessibility() {
  injectSkipLink('main-content');
  createLiveRegion('aria-live-polite', 'polite');
  createLiveRegion('aria-live-assertive', 'assertive');
  enhanceFocusIndicators();
}

export default { initAccessibility, announce, trapFocus, restoreFocus, injectSkipLink };
