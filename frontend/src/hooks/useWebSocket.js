/**
 * WebSocket Hook for Kage no Koe
 * Manages Socket.io connection for real-time chat
 */

import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export const useWebSocket = () => {
  const socketRef = useRef(null);
  const listenersRef = useRef({});

  useEffect(() => {
    // Initialize Socket.io connection
    console.log('🔌 Connecting to WebSocket:', SOCKET_URL);
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    socketRef.current.on('connection_response', (data) => {
      console.log('🔗 Connection response:', data);
    });

    socketRef.current.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting WebSocket');
      socketRef.current?.disconnect();
    };
  }, []);

  /**
   * Send an event to the server
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  const sendMessage = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      console.log(`📤 Sending: ${event}`, data);
      socketRef.current.emit(event, data);
    } else {
      console.error('❌ Socket not connected');
    }
  }, []);

  /**
   * Listen to an event from the server
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  const onMessage = useCallback((event, callback) => {
    if (socketRef.current) {
      console.log(`📥 Listening to: ${event}`);
      socketRef.current.on(event, callback);

      // Store listener for cleanup
      if (!listenersRef.current[event]) {
        listenersRef.current[event] = [];
      }
      listenersRef.current[event].push(callback);
    }
  }, []);

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  const offMessage = useCallback((event, callback) => {
    if (socketRef.current) {
      console.log(`🔇 Removing listener: ${event}`);
      socketRef.current.off(event, callback);

      // Remove from stored listeners
      if (listenersRef.current[event]) {
        listenersRef.current[event] = listenersRef.current[event].filter(
          (cb) => cb !== callback
        );
      }
    }
  }, []);

  /**
   * Check if socket is connected
   */
  const isConnected = useCallback(() => {
    return socketRef.current?.connected || false;
  }, []);

  /**
   * Test connection
   */
  const testConnection = useCallback(() => {
    sendMessage('test_connection', { timestamp: Date.now() });
  }, [sendMessage]);

  return {
    sendMessage,
    onMessage,
    offMessage,
    isConnected,
    testConnection,
    socket: socketRef.current,
  };
};

export default useWebSocket;
