/**
 * ChatArea Component - ChatGPT Style
 * Features: Messages display, input, typing indicator, welcome screen
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext, actions } from '../../context/AppContext';
import { chatAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import './ChatArea.css';

function Message({ message, onCopy, onEdit, onDelete }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="message-wrapper">
      <div className={`message ${message.role}`}>
        <div className="message-avatar">
          {message.role === 'user' ? '👤' : '🤖'}
        </div>
        <div className="message-content">
          <div className="message-header">
            <span className="message-role">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </span>
            {message.timestamp && (
              <span className="message-time">{formatTime(message.timestamp)}</span>
            )}
          </div>
          <div className="message-text">{message.content}</div>
          <div className="message-actions">
            <button className="message-action-btn" onClick={() => onCopy(message.content)}>
              📋 Copy
            </button>
            {message.role === 'user' && (
              <button className="message-action-btn" onClick={() => onEdit(message)}>
                ✏️ Edit
              </button>
            )}
            <button className="message-action-btn" onClick={() => onDelete(message.id)}>
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message-wrapper">
      <div className="message assistant">
        <div className="message-avatar">🤖</div>
        <div className="message-content">
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onNewChat }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-icon">👤</div>
      <h1 className="welcome-title gradient-text">Kage no Koe</h1>
      <p className="welcome-subtitle">影の声 - Voice of the Shadow</p>
      <p className="welcome-subtitle">LocalMind AI Assistant powered by Ollama</p>

      <div className="welcome-features">
        <div className="feature-card">
          <div className="feature-icon">💬</div>
          <h3>Natural Conversations</h3>
          <p>Chat naturally with AI running locally on your machine</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Privacy First</h3>
          <p>All data stays on your device - no cloud, no tracking</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Fast & Efficient</h3>
          <p>Optimized for laptop hardware with 1B parameter model</p>
        </div>
      </div>

      <button
        className="new-chat-btn"
        onClick={onNewChat}
        style={{ marginTop: 'var(--space-xl)', maxWidth: '200px' }}
      >
        Start New Chat
      </button>
    </div>
  );
}

function ChatArea({ onSettingsClick }) {
  const { state, dispatch } = useAppContext();
  const [inputText, setInputText] = useState('');
  const { sendMessage, onMessage } = useWebSocket();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.streamingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  // Listen for WebSocket messages
  useEffect(() => {
    onMessage('message_token', (data) => {
      if (data.chat_id === state.currentChat) {
        dispatch(actions.appendStreamingToken(data.token));
      }
    });

    onMessage('message_complete', (data) => {
      if (data.chat_id === state.currentChat) {
        dispatch(actions.addMessage(data.message));
        dispatch(actions.clearStreaming());
        dispatch(actions.setTyping(false));
      }
    });

    onMessage('message_saved', (data) => {
      if (data.chat_id === state.currentChat) {
        dispatch(actions.addMessage(data.message));
      }
    });
  }, [state.currentChat]);

  // Load messages when chat changes
  useEffect(() => {
    if (state.currentChat) {
      loadMessages(state.currentChat);
    }
  }, [state.currentChat]);

  const loadMessages = async (chatId) => {
    try {
      const response = await chatAPI.get(chatId);
      dispatch(actions.setMessages(response.data.chat.messages || []));
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !state.currentChat) return;

    // Send message via WebSocket
    sendMessage('send_message', {
      chat_id: state.currentChat,
      content: inputText.trim(),
    });

    dispatch(actions.setTyping(true));
    setInputText('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    // TODO: Show toast notification
  };

  const editMessage = (message) => {
    // TODO: Implement message editing
    console.log('Edit message:', message);
  };

  const deleteMessage = (messageId) => {
    // TODO: Implement message deletion
    console.log('Delete message:', messageId);
  };

  const toggleTheme = () => {
    dispatch(actions.toggleTheme());
  };

  const toggleSidebar = () => {
    dispatch(actions.toggleSidebar());
  };

  const currentChat = state.chats.find(c => c.id === state.currentChat);

  return (
    <div className="chat-area">
      {/* Header */}
      <header className="chat-header">
        <div className="header-left">
          <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
            ☰
          </button>
          <div className="chat-title-area">
            <h2>{currentChat?.title || 'New Chat'}</h2>
          </div>
        </div>
        <div className="header-right">
          <span className="chat-model-badge">{state.currentModel}</span>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {state.theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <div className="status-indicator">
            <span className="status-dot"></span>
          </div>
        </div>
      </header>

      {/* Messages or Welcome Screen */}
      {!state.currentChat ? (
        <WelcomeScreen onNewChat={() => {/* Will be handled by Sidebar */}} />
      ) : (
        <>
          <div className="messages-container">
            {state.messages.map((msg, idx) => (
              <Message
                key={idx}
                message={msg}
                onCopy={copyMessage}
                onEdit={editMessage}
                onDelete={deleteMessage}
              />
            ))}

            {/* Show streaming message */}
            {state.streamingMessage && (
              <div className="message-wrapper">
                <div className="message assistant">
                  <div className="message-avatar">🤖</div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-role">Assistant</span>
                    </div>
                    <div className="message-text">{state.streamingMessage}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {state.isTyping && !state.streamingMessage && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="input-area">
            <div className="input-container">
              <div className="input-wrapper">
                <button className="attach-btn">📎</button>
                <textarea
                  ref={textareaRef}
                  className="message-input"
                  placeholder="Type your message here..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows={1}
                />
                <button
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                >
                  ➤
                </button>
              </div>
              <div className="input-hint">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatArea;
