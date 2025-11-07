/**
 * Sidebar Component - ChatGPT Style
 * Features: Compact chat items, date grouping, smooth animations
 */

import React, { useEffect, useState } from 'react';
import { useAppContext, actions } from '../../context/AppContext';
import { chatAPI } from '../../services/api';
import './Sidebar.css';

// Helper function to group chats by date
function groupChatsByDate(chats) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: []
  };

  chats.forEach(chat => {
    const chatDate = new Date(chat.updated_at || chat.created_at);
    const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

    if (chatDay.getTime() === today.getTime()) {
      groups.today.push(chat);
    } else if (chatDay.getTime() === yesterday.getTime()) {
      groups.yesterday.push(chat);
    } else if (chatDay >= sevenDaysAgo) {
      groups.previous7Days.push(chat);
    } else {
      groups.older.push(chat);
    }
  });

  return groups;
}

function ChatItem({ chat, isActive, onClick, onDelete }) {
  return (
    <div
      className={`chat-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="chat-item-bullet">⚬</span>
      <span className="chat-item-text">{chat.title}</span>
      <div className="chat-item-actions">
        <button
          className="chat-item-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Rename chat
          }}
          title="Rename"
        >
          ✏️
        </button>
        <button
          className="chat-item-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat.id);
          }}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function Sidebar({ onSettingsClick, onModelsClick }) {
  const { state, dispatch } = useAppContext();
  const [groupedChats, setGroupedChats] = useState({
    today: [],
    yesterday: [],
    previous7Days: [],
    older: []
  });

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (state.chats.length > 0) {
      setGroupedChats(groupChatsByDate(state.chats));
    }
  }, [state.chats]);

  const loadChats = async () => {
    try {
      const response = await chatAPI.list();
      dispatch(actions.setChats(response.data.chats));
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const createNewChat = async () => {
    try {
      const response = await chatAPI.create({
        title: 'New Chat',
        model_name: state.currentModel
      });

      const newChat = response.data.chat;
      dispatch(actions.addChat(newChat));
      dispatch(actions.setCurrentChat(newChat.id));
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const selectChat = (chatId) => {
    dispatch(actions.setCurrentChat(chatId));
  };

  const deleteChat = async (chatId) => {
    if (!confirm('Delete this chat?')) return;

    try {
      await chatAPI.delete(chatId);
      dispatch(actions.deleteChat(chatId));
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  return (
    <aside className={`sidebar ${state.sidebarOpen ? '' : 'collapsed'}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="app-title">
          <span className="app-icon">👤</span>
          <div className="title-text">
            <span className="main-title">Kage no Koe</span>
            <span className="subtitle">LocalMind</span>
          </div>
        </div>

        <button className="new-chat-btn" onClick={createNewChat}>
          <span>+</span>
          <span>New Chat</span>
        </button>
      </div>

      {/* Chat List */}
      <div className="chat-list-container">
        {state.chats.length === 0 ? (
          <div className="chat-list-empty">
            <p>No chats yet</p>
            <p style={{ fontSize: '10px', marginTop: '4px' }}>Start a new conversation</p>
          </div>
        ) : (
          <>
            {/* Today */}
            {groupedChats.today.length > 0 && (
              <>
                <div className="date-separator">Today</div>
                {groupedChats.today.map(chat => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={state.currentChat === chat.id}
                    onClick={() => selectChat(chat.id)}
                    onDelete={deleteChat}
                  />
                ))}
              </>
            )}

            {/* Yesterday */}
            {groupedChats.yesterday.length > 0 && (
              <>
                <div className="date-separator">Yesterday</div>
                {groupedChats.yesterday.map(chat => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={state.currentChat === chat.id}
                    onClick={() => selectChat(chat.id)}
                    onDelete={deleteChat}
                  />
                ))}
              </>
            )}

            {/* Previous 7 Days */}
            {groupedChats.previous7Days.length > 0 && (
              <>
                <div className="date-separator">Previous 7 Days</div>
                {groupedChats.previous7Days.map(chat => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={state.currentChat === chat.id}
                    onClick={() => selectChat(chat.id)}
                    onDelete={deleteChat}
                  />
                ))}
              </>
            )}

            {/* Older */}
            {groupedChats.older.length > 0 && (
              <>
                <div className="date-separator">Older</div>
                {groupedChats.older.map(chat => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={state.currentChat === chat.id}
                    onClick={() => selectChat(chat.id)}
                    onDelete={deleteChat}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-btn" onClick={onSettingsClick}>
          <span className="btn-icon">⚙️</span>
          <span className="btn-text">Settings</span>
        </button>
        <button className="sidebar-btn" onClick={onModelsClick}>
          <span className="btn-icon">🤖</span>
          <span className="btn-text">Models</span>
        </button>
        <button className="sidebar-btn">
          <span className="btn-icon">📤</span>
          <span className="btn-text">Import/Export</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
