/**
 * API Service Layer for Kage no Koe
 * Handles all HTTP requests to Flask backend
 */

import axios from 'axios';

// Use relative URLs - Vite proxy will route to Flask backend
const API_BASE = '';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

// ============= HEALTH API =============

export const healthAPI = {
  /**
   * Check backend health and Ollama connection
   */
  check: () => api.get('/health'),

  /**
   * Get list of available Ollama models
   */
  getModels: () => api.get('/api/models'),
};

// ============= CHAT API =============

export const chatAPI = {
  /**
   * List all chats
   */
  list: () => api.get('/api/chats'),

  /**
   * Create a new chat
   * @param {Object} data - { title, model_name, system_message }
   */
  create: (data) => api.post('/api/chats', data),

  /**
   * Get a specific chat with messages
   * @param {number} chatId - Chat ID
   */
  get: (chatId) => api.get(`/api/chats/${chatId}`),

  /**
   * Update chat (title, system message, etc.)
   * @param {number} chatId - Chat ID
   * @param {Object} data - Updated fields
   */
  update: (chatId, data) => api.put(`/api/chats/${chatId}`, data),

  /**
   * Delete a chat
   * @param {number} chatId - Chat ID
   */
  delete: (chatId) => api.delete(`/api/chats/${chatId}`),
};

// ============= MESSAGE API =============

export const messageAPI = {
  /**
   * Send a message (for non-streaming requests)
   * Note: For real-time streaming, use WebSocket instead
   * @param {number} chatId - Chat ID
   * @param {Object} message - { content }
   */
  send: (chatId, message) => api.post(`/api/chats/${chatId}/messages`, message),

  /**
   * Get messages for a chat
   * @param {number} chatId - Chat ID
   */
  list: (chatId) => api.get(`/api/chats/${chatId}/messages`),
};

// ============= TEST API =============

export const testAPI = {
  /**
   * Test chat endpoint with a simple message
   * @param {string} message - Test message
   */
  testChat: (message) => api.post('/api/test', { message }),
};

export default api;
