/**
 * Queue Manager
 * Bridges the StateManager queue state with the backend API.
 * Replaces the old static/js/queue.js logic.
 *
 * @module queue-manager
 */

import stateManager from './state-manager.js';
import apiClient from './api-client.js';

export class QueueManager {
  constructor() {
    this._syncing = false;
  }

  /**
   * Load queue from backend and sync to StateManager
   */
  async load() {
    try {
      const items = await apiClient.get('/api/queue');
      stateManager.set('queue', Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('[QueueManager] Failed to load queue:', err);
    }
  }

  /**
   * Add items to queue (backend + state)
   * @param {Object|Object[]} items
   */
  async add(items) {
    const list = Array.isArray(items) ? items : [items];
    try {
      await apiClient.post('/api/queue/add', list);
      await this.load();
    } catch (err) {
      console.error('[QueueManager] Failed to add to queue:', err);
    }
  }

  /**
   * Remove an item from queue by URL
   * @param {string} url
   */
  async remove(url) {
    try {
      await apiClient.post('/api/queue/remove', { url });
      stateManager.set('queue', stateManager.get('queue').filter(i => i.url !== url));
    } catch (err) {
      console.error('[QueueManager] Failed to remove from queue:', err);
    }
  }

  /**
   * Clear all items from queue
   */
  async clear() {
    try {
      await apiClient.post('/api/queue/clear', {});
      stateManager.clearQueue();
    } catch (err) {
      console.error('[QueueManager] Failed to clear queue:', err);
    }
  }

  /**
   * Reorder queue items
   * @param {string[]} urls - Ordered list of URLs
   */
  async reorder(urls) {
    try {
      await apiClient.post('/api/queue/reorder', urls);
      await this.load();
    } catch (err) {
      console.error('[QueueManager] Failed to reorder queue:', err);
    }
  }

  /**
   * Subscribe to queue state changes
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  subscribe(callback) {
    return stateManager.subscribe('queue', callback);
  }

  /** Get current queue from state */
  get items() {
    return stateManager.get('queue') || [];
  }
}

export const queueManager = new QueueManager();
export default queueManager;
