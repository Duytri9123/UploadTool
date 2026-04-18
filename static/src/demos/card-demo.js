/**
 * Card Component Demo
 * Demonstrates various Card component configurations
 */

// Import styles
import './card-demo.scss';

import { Card } from '../components/Card/Card.js';

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('.theme-toggle__icon');
let currentTheme = localStorage.getItem('theme') || 'light';

// Apply initial theme
document.documentElement.setAttribute('data-theme', currentTheme);
themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
});

// ============================================================================
// Basic Card
// ============================================================================

const basicCard = new Card({
  title: 'Basic Card',
  bodyContent: `
    <p>This is a basic card with a title and body content.</p>
    <p>Cards are great for organizing content into distinct sections.</p>
  `
});
basicCard.mount(document.getElementById('basic-card'));

// ============================================================================
// Card with Icon
// ============================================================================

const iconCard = new Card({
  title: 'Card with Icon',
  icon: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  `,
  bodyContent: `
    <p>This card includes an icon in the header.</p>
    <p>Icons help users quickly identify the card's purpose.</p>
  `
});
iconCard.mount(document.getElementById('icon-card'));

// ============================================================================
// Collapsible Card
// ============================================================================

const collapsibleCard = new Card({
  title: 'Collapsible Card',
  collapsible: true,
  bodyContent: `
    <p>This card can be collapsed and expanded.</p>
    <p>Click the toggle button in the header to collapse/expand.</p>
    <p>You can also use keyboard navigation (Enter or Space) when the toggle button is focused.</p>
    <ul>
      <li>Smooth animation on collapse/expand</li>
      <li>ARIA attributes for accessibility</li>
      <li>Keyboard navigation support</li>
    </ul>
  `,
  onToggle: (collapsed) => {
    console.log('Collapsible card toggled:', collapsed ? 'collapsed' : 'expanded');
  }
});
collapsibleCard.mount(document.getElementById('collapsible-card'));

// ============================================================================
// Card with Header Actions
// ============================================================================

const actionsCard = new Card({
  title: 'Card with Actions',
  headerContent: `
    <button class="demo-button demo-button--small" onclick="alert('Edit clicked')">Edit</button>
    <button class="demo-button demo-button--small demo-button--danger" onclick="alert('Delete clicked')">Delete</button>
  `,
  bodyContent: `
    <p>This card has action buttons in the header.</p>
    <p>You can add any HTML content to the header actions area.</p>
  `
});
actionsCard.mount(document.getElementById('actions-card'));

// ============================================================================
// Card with Footer
// ============================================================================

const footerCard = new Card({
  title: 'Card with Footer',
  bodyContent: `
    <p>This card includes a footer section.</p>
    <p>Footers are useful for action buttons or additional information.</p>
  `,
  footerContent: `
    <button class="demo-button demo-button--secondary" onclick="alert('Cancel clicked')">Cancel</button>
    <button class="demo-button demo-button--primary" onclick="alert('Save clicked')">Save</button>
  `
});
footerCard.mount(document.getElementById('footer-card'));

// ============================================================================
// Initially Collapsed Card
// ============================================================================

const collapsedCard = new Card({
  title: 'Initially Collapsed',
  collapsible: true,
  collapsed: true,
  bodyContent: `
    <p>This card starts in a collapsed state.</p>
    <p>Click the toggle button to expand and see this content.</p>
  `
});
collapsedCard.mount(document.getElementById('collapsed-card'));

// ============================================================================
// Complex Card (All Features)
// ============================================================================

const complexCard = new Card({
  title: 'Complex Card',
  collapsible: true,
  icon: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  `,
  headerContent: `
    <span class="demo-badge">New</span>
    <button class="demo-button demo-button--small" onclick="alert('Settings clicked')">⚙️</button>
  `,
  bodyContent: `
    <p><strong>This card demonstrates all available features:</strong></p>
    <ul>
      <li>✅ Title with icon</li>
      <li>✅ Collapsible functionality</li>
      <li>✅ Header actions (badge and button)</li>
      <li>✅ Rich body content</li>
      <li>✅ Footer with multiple buttons</li>
      <li>✅ Keyboard navigation</li>
      <li>✅ ARIA attributes</li>
      <li>✅ Smooth animations</li>
    </ul>
    <p>Try collapsing and expanding this card to see the smooth animation!</p>
  `,
  footerContent: `
    <button class="demo-button demo-button--ghost" onclick="alert('Learn More clicked')">Learn More</button>
    <button class="demo-button demo-button--secondary" onclick="alert('Cancel clicked')">Cancel</button>
    <button class="demo-button demo-button--primary" onclick="alert('Apply clicked')">Apply</button>
  `,
  onToggle: (collapsed) => {
    console.log('Complex card toggled:', collapsed ? 'collapsed' : 'expanded');
  }
});
complexCard.mount(document.getElementById('complex-card'));

// ============================================================================
// Multiple Cards
// ============================================================================

const card1 = new Card({
  title: 'Card 1',
  collapsible: true,
  bodyContent: `
    <p>First card in a grid layout.</p>
    <p>Cards work great in grid or flex layouts.</p>
  `
});
card1.mount(document.getElementById('card-1'));

const card2 = new Card({
  title: 'Card 2',
  collapsible: true,
  bodyContent: `
    <p>Second card in a grid layout.</p>
    <p>Each card is independent and can be collapsed separately.</p>
  `
});
card2.mount(document.getElementById('card-2'));

const card3 = new Card({
  title: 'Card 3',
  collapsible: true,
  bodyContent: `
    <p>Third card in a grid layout.</p>
    <p>Responsive design ensures cards stack on mobile devices.</p>
  `
});
card3.mount(document.getElementById('card-3'));

// ============================================================================
// Dynamic Content Demo
// ============================================================================

// Add a button to demonstrate dynamic content updates
setTimeout(() => {
  const dynamicButton = document.createElement('button');
  dynamicButton.className = 'demo-button demo-button--primary';
  dynamicButton.textContent = 'Update Card Content';
  dynamicButton.style.marginTop = '20px';
  
  dynamicButton.addEventListener('click', () => {
    basicCard.setTitle('Updated Title');
    basicCard.setBodyContent(`
      <p><strong>Content updated dynamically!</strong></p>
      <p>You can update card content at any time using the API methods.</p>
      <p>Timestamp: ${new Date().toLocaleTimeString()}</p>
    `);
  });
  
  document.getElementById('basic-card').appendChild(dynamicButton);
}, 1000);

console.log('Card demo initialized');
console.log('Try interacting with the cards and check the console for toggle events');
