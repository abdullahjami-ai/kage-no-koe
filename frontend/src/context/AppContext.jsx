/**
 * Global Application Context for Kage no Koe
 * Manages application state using React Context API + useReducer
 */

import React, { createContext, useReducer, useContext, useEffect } from 'react';

// ============= CONTEXT =============

const AppContext = createContext();

// ============= INITIAL STATE =============

const initialState = {
  // Chat data
  currentChat: null,
  chats: [],
  messages: [],

  // UI state
  sidebarOpen: true,
  currentModal: null,
  theme: localStorage.getItem('kage-theme') || 'dark',

  // Connection state
  connected: false,
  currentModel: 'llama3.2:1b',
  availableModels: [],

  // Message input
  inputText: '',
  isTyping: false,
  streamingMessage: '',

  // Settings
  globalContext: '',

  // Files
  attachedFiles: [],

  // Errors
  error: null,
};

// ============= REDUCER =============

function appReducer(state, action) {
  switch (action.type) {
    // Chat actions
    case 'SET_CHATS':
      return { ...state, chats: action.payload };

    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload, messages: [] };

    case 'ADD_CHAT':
      return { ...state, chats: [action.payload, ...state.chats] };

    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === action.payload.id ? action.payload : chat
        ),
      };

    case 'DELETE_CHAT':
      return {
        ...state,
        chats: state.chats.filter((chat) => chat.id !== action.payload),
        currentChat: state.currentChat === action.payload ? null : state.currentChat,
      };

    // Message actions
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'UPDATE_LAST_MESSAGE':
      const newMessages = [...state.messages];
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          ...action.payload,
        };
      }
      return { ...state, messages: newMessages };

    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };

    // UI actions
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };

    case 'OPEN_MODAL':
      return { ...state, currentModal: action.payload };

    case 'CLOSE_MODAL':
      return { ...state, currentModal: null };

    case 'SET_THEME':
      localStorage.setItem('kage-theme', action.payload);
      return { ...state, theme: action.payload };

    case 'TOGGLE_THEME':
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('kage-theme', newTheme);
      return { ...state, theme: newTheme };

    // Connection actions
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };

    case 'SET_MODELS':
      return { ...state, availableModels: action.payload };

    case 'SET_CURRENT_MODEL':
      return { ...state, currentModel: action.payload };

    // Input actions
    case 'SET_INPUT_TEXT':
      return { ...state, inputText: action.payload };

    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };

    case 'SET_STREAMING_MESSAGE':
      return { ...state, streamingMessage: action.payload };

    case 'APPEND_STREAMING_TOKEN':
      return { ...state, streamingMessage: state.streamingMessage + action.payload };

    case 'CLEAR_STREAMING':
      return { ...state, streamingMessage: '' };

    // File actions
    case 'ADD_FILE':
      return { ...state, attachedFiles: [...state.attachedFiles, action.payload] };

    case 'REMOVE_FILE':
      return {
        ...state,
        attachedFiles: state.attachedFiles.filter((_, index) => index !== action.payload),
      };

    case 'CLEAR_FILES':
      return { ...state, attachedFiles: [] };

    // Error actions
    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    // Settings
    case 'SET_GLOBAL_CONTEXT':
      return { ...state, globalContext: action.payload };

    default:
      return state;
  }
}

// ============= PROVIDER =============

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Apply theme on mount and changes
  useEffect(() => {
    document.body.className = `theme-${state.theme}`;
  }, [state.theme]);

  const value = { state, dispatch };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ============= CUSTOM HOOK =============

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

// ============= ACTION CREATORS (optional helpers) =============

export const actions = {
  // Chats
  setChats: (chats) => ({ type: 'SET_CHATS', payload: chats }),
  setCurrentChat: (chatId) => ({ type: 'SET_CURRENT_CHAT', payload: chatId }),
  addChat: (chat) => ({ type: 'ADD_CHAT', payload: chat }),
  updateChat: (chat) => ({ type: 'UPDATE_CHAT', payload: chat }),
  deleteChat: (chatId) => ({ type: 'DELETE_CHAT', payload: chatId }),

  // Messages
  setMessages: (messages) => ({ type: 'SET_MESSAGES', payload: messages }),
  addMessage: (message) => ({ type: 'ADD_MESSAGE', payload: message }),
  updateLastMessage: (update) => ({ type: 'UPDATE_LAST_MESSAGE', payload: update }),
  clearMessages: () => ({ type: 'CLEAR_MESSAGES' }),

  // UI
  toggleSidebar: () => ({ type: 'TOGGLE_SIDEBAR' }),
  setSidebar: (open) => ({ type: 'SET_SIDEBAR', payload: open }),
  openModal: (modal) => ({ type: 'OPEN_MODAL', payload: modal }),
  closeModal: () => ({ type: 'CLOSE_MODAL' }),
  setTheme: (theme) => ({ type: 'SET_THEME', payload: theme }),
  toggleTheme: () => ({ type: 'TOGGLE_THEME' }),

  // Connection
  setConnected: (connected) => ({ type: 'SET_CONNECTED', payload: connected }),
  setModels: (models) => ({ type: 'SET_MODELS', payload: models }),
  setCurrentModel: (model) => ({ type: 'SET_CURRENT_MODEL', payload: model }),

  // Input
  setInputText: (text) => ({ type: 'SET_INPUT_TEXT', payload: text }),
  setTyping: (isTyping) => ({ type: 'SET_TYPING', payload: isTyping }),
  setStreamingMessage: (message) => ({ type: 'SET_STREAMING_MESSAGE', payload: message }),
  appendStreamingToken: (token) => ({ type: 'APPEND_STREAMING_TOKEN', payload: token }),
  clearStreaming: () => ({ type: 'CLEAR_STREAMING' }),

  // Files
  addFile: (file) => ({ type: 'ADD_FILE', payload: file }),
  removeFile: (index) => ({ type: 'REMOVE_FILE', payload: index }),
  clearFiles: () => ({ type: 'CLEAR_FILES' }),

  // Errors
  setError: (error) => ({ type: 'SET_ERROR', payload: error }),
  clearError: () => ({ type: 'CLEAR_ERROR' }),

  // Settings
  setGlobalContext: (context) => ({ type: 'SET_GLOBAL_CONTEXT', payload: context }),
};

export default AppContext;
