/**
 * WebSocket Module
 * Wraps Socket.IO connection and integrates with StateManager for real-time updates.
 * Replaces the old static/js/socket.js logic.
 *
 * @module websocket
 */

import stateManager from './state-manager.js';

export class WebSocketManager {
  constructor() {
    this._socket = null;
    this._connected = false;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 5;
  }

  /**
   * Connect to the Socket.IO server.
   * Requires socket.io client to be loaded globally (via CDN in HTML).
   */
  connect() {
    if (typeof io === 'undefined') {
      console.warn('[WS] socket.io not available');
      return;
    }

    if (this._socket) return;

    this._socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: this._maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this._socket.on('connect', () => {
      this._connected = true;
      this._reconnectAttempts = 0;
      stateManager.update('ui', { wsConnected: true });
      console.log('[WS] Connected:', this._socket.id);
    });

    this._socket.on('disconnect', (reason) => {
      this._connected = false;
      stateManager.update('ui', { wsConnected: false });
      console.log('[WS] Disconnected:', reason);
    });

    this._socket.on('connect_error', (err) => {
      this._reconnectAttempts++;
      console.warn('[WS] Connection error:', err.message);
    });

    // Progress updates from backend
    this._socket.on('progress', (data) => {
      stateManager.update('ui', { lastProgress: data });
    });

    // Queue updates from backend
    this._socket.on('queue_update', (queue) => {
      if (Array.isArray(queue)) {
        stateManager.set('queue', queue);
      }
    });

    // Log messages from backend
    this._socket.on('log', (data) => {
      stateManager.update('ui', { lastLog: data });
    });
  }

  /**
   * Emit an event to the server
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    if (!this._socket || !this._connected) {
      console.warn('[WS] Not connected, cannot emit:', event);
      return;
    }
    this._socket.emit(event, data);
  }

  /**
   * Subscribe to a socket event
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} unsubscribe
   */
  on(event, handler) {
    this._socket?.on(event, handler);
    return () => this._socket?.off(event, handler);
  }

  /** Disconnect from server */
  disconnect() {
    this._socket?.disconnect();
    this._socket = null;
    this._connected = false;
  }

  get connected() { return this._connected; }
}

export const wsManager = new WebSocketManager();
export default wsManager;
