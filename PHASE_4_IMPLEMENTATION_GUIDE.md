# Phase 4 Implementation Guide - React Frontend
## Kage no Koe (影の声)

---

## 📍 YOUR CURRENT STATUS

### ✅ Completed Phases

**Phase 0: Project Setup (100%)**
- ✅ Project structure created
- ✅ Python virtual environment
- ✅ Ollama installed with llama3.2:1b model
- ✅ Configuration system (config.json)

**Phase 1: Backend Core (100%)**
- ✅ Flask application structure
- ✅ CORS configured
- ✅ Health check routes
- ✅ Basic API endpoints

**Phase 2: Database Layer (100%)**
- ✅ SQLite database with full schema
- ✅ All CRUD operations implemented
- ✅ Database routes created
- ✅ Testing: All database operations work

**Phase 3: Ollama Integration (100%)**
- ✅ Phase 3.1: Ollama handler implemented (ollama_handler.py)
- ✅ Phase 3.2: Basic message routes
- ✅ Phase 3.3: Context manager implemented (context_manager.py)
- ✅ Phase 3.4: WebSocket streaming added to app.py

**Phase 4: React Frontend Setup (75%)**
- ✅ Phase 4.1: Directory structure created
- ✅ Phase 4.2: Package.json and Vite config
- ✅ Phase 4.3: API service layer (services/api.js)
- ✅ Phase 4.4: WebSocket hook (hooks/useWebSocket.js)
- ✅ Phase 4.5: Context API state management (context/AppContext.jsx)
- ✅ Phase 4.6: Basic App component
- 🚧 Phase 4.7: Install dependencies (NEXT STEP)
- ⏳ Phase 4.8: Build UI components (Sidebar, Chat Area)

---

## 🎯 PHASE 4.7: Install Dependencies & Start Development

### Step 1: Install Backend Dependencies

```bash
# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install updated requirements
pip install -r requirements.txt
```

**What changed in requirements.txt:**
- Added `werkzeug==3.0.1` (Flask dependency)
- Added `python-engineio==4.8.0` (SocketIO dependency)
- Added `eventlet==0.33.3` (Async server for WebSocket)
- Added `python-dateutil==2.8.2` (Date utilities)
- All versions pinned for reproducibility

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install
```

This will install:
- React 18.2.0
- React DOM 18.2.0
- React Router 6.20.1
- Axios 1.6.2 (HTTP client)
- Socket.io-client 4.7.2 (WebSocket)
- Vite 5.0.8 (Build tool)
- ESLint (Code quality)

**Installation time:** ~2-3 minutes

### Step 3: Test Backend

```bash
# In terminal 1 (from project root)
source venv/bin/activate
python -m backend.app
```

**Expected output:**
```
🚀 LocalMind Backend Starting...
✅ Ollama connected
✅ Model: llama3.2:1b
🌐 Server starting on http://localhost:5000
```

**Test the backend:**
```bash
# In terminal 2
curl http://localhost:5000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "ollama_connected": true,
  "model_available": true,
  "model_name": "llama3.2:1b"
}
```

### Step 4: Test Frontend

```bash
# In terminal 2 (from frontend directory)
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v5.0.8  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

**Open browser:** http://localhost:5173

**You should see:**
- "Kage no Koe" welcome screen
- "Phase 4 Setup Complete!" message
- Next steps instructions

---

## 🚧 PHASE 4.8: Build UI Components (Next Mini-Phases)

### Phase 4.8.1: Create Sidebar Component

**File:** `frontend/src/components/Sidebar/Sidebar.jsx`

**What it does:**
- Shows app logo and title
- "New Chat" button
- List of existing chats
- Settings and Models buttons

**Implementation:**
```jsx
import React from 'react';
import { useAppContext, actions } from '../../context/AppContext';
import './Sidebar.css';

function Sidebar() {
  const { state, dispatch } = useAppContext();

  return (
    <aside className={`sidebar ${state.sidebarOpen ? 'open' : 'closed'}`}>
      {/* Sidebar header */}
      <div className="sidebar-header">
        <h1>Kage no Koe</h1>
        <button onClick={() => {/* TODO: Create new chat */}}>
          + New Chat
        </button>
      </div>

      {/* Chat list */}
      <div className="chat-list">
        {state.chats.length === 0 ? (
          <p>No chats yet</p>
        ) : (
          state.chats.map(chat => (
            <div key={chat.id} className="chat-item">
              {chat.title}
            </div>
          ))
        )}
      </div>

      {/* Sidebar footer */}
      <div className="sidebar-footer">
        <button>⚙️ Settings</button>
        <button>🤖 Models</button>
      </div>
    </aside>
  );
}

export default Sidebar;
```

**Test:**
1. Import Sidebar in App.jsx
2. Verify it renders
3. Click "New Chat" (will error - that's ok for now)

### Phase 4.8.2: Create Chat Area Component

**File:** `frontend/src/components/Chat/ChatArea.jsx`

**What it does:**
- Shows current chat title
- Displays messages
- Message input box

**Implementation:**
```jsx
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import './ChatArea.css';

function ChatArea() {
  const { state } = useAppContext();

  if (!state.currentChat) {
    return (
      <div className="chat-area">
        <div className="welcome">
          <h2>Welcome to Kage no Koe</h2>
          <p>Start a new chat to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      {/* Chat header */}
      <header className="chat-header">
        <h2>Chat Title</h2>
      </header>

      {/* Messages */}
      <div className="messages-container">
        {state.messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="message-input">
        <textarea placeholder="Type a message..." />
        <button>Send</button>
      </div>
    </div>
  );
}

export default ChatArea;
```

**Test:**
1. Import ChatArea in App.jsx
2. Verify it shows welcome message
3. Verify input box renders

### Phase 4.8.3: Create useChat Hook

**File:** `frontend/src/hooks/useChat.js`

**What it does:**
- Loads chats from backend
- Creates new chats
- Sends messages via WebSocket
- Handles streaming responses

**Implementation:**
```jsx
import { useEffect, useCallback } from 'react';
import { useAppContext, actions } from '../context/AppContext';
import { chatAPI } from '../services/api';
import { useWebSocket } from './useWebSocket';

export function useChat() {
  const { state, dispatch } = useAppContext();
  const { sendMessage, onMessage } = useWebSocket();

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await chatAPI.list();
      dispatch(actions.setChats(response.data.chats));
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const createNewChat = async (title = 'New Chat') => {
    try {
      const response = await chatAPI.create({ title });
      const chat = response.data.chat;
      dispatch(actions.addChat(chat));
      dispatch(actions.setCurrentChat(chat.id));
      return chat;
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const sendChatMessage = useCallback((content) => {
    if (!state.currentChat) return;

    // Add user message to UI
    dispatch(actions.addMessage({
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }));

    // Send via WebSocket
    sendMessage('send_message', {
      chat_id: state.currentChat,
      content,
    });

    dispatch(actions.setTyping(true));
  }, [state.currentChat]);

  // Listen for AI responses
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
  }, [state.currentChat]);

  return {
    chats: state.chats,
    currentChat: state.currentChat,
    createNewChat,
    sendChatMessage,
    loadChats,
  };
}
```

**Test:**
1. Use hook in App.jsx
2. Test createNewChat()
3. Test sendChatMessage()
4. Verify WebSocket streaming works

---

## 📋 COMPLETE PHASE 4 CHECKLIST

### Phase 4.7: Setup & Install
- [ ] Install backend dependencies (pip install -r requirements.txt)
- [ ] Install frontend dependencies (npm install)
- [ ] Test backend starts (python -m backend.app)
- [ ] Test frontend starts (npm run dev)
- [ ] Test /health endpoint returns 200
- [ ] Verify Ollama is running

### Phase 4.8: Build Components
- [ ] Create Sidebar component
- [ ] Create ChatArea component
- [ ] Create Message component
- [ ] Create MessageInput component
- [ ] Create WelcomeScreen component
- [ ] Add CSS styling for all components

### Phase 4.9: Integrate Hooks
- [ ] Implement useChat hook
- [ ] Connect Sidebar to useChat
- [ ] Connect ChatArea to useChat
- [ ] Test create new chat
- [ ] Test load chats from database
- [ ] Test select chat

### Phase 4.10: WebSocket Integration
- [ ] Test WebSocket connection
- [ ] Test sending messages
- [ ] Test receiving streaming tokens
- [ ] Test message completion
- [ ] Handle connection errors
- [ ] Add reconnection logic

---

## 🔧 TROUBLESHOOTING

### Backend won't start

**Error:** `ModuleNotFoundError: No module named 'eventlet'`
**Fix:** `pip install -r requirements.txt`

**Error:** `Ollama not connected`
**Fix:** Start Ollama in another terminal: `ollama serve`

### Frontend won't start

**Error:** `Cannot find module 'react'`
**Fix:** `cd frontend && npm install`

**Error:** `Port 5173 already in use`
**Fix:** Kill existing process or change port in vite.config.js

### WebSocket not connecting

**Check:**
1. Backend is running on port 5000
2. Frontend proxy is configured in vite.config.js
3. Check browser console for errors
4. Test with: `curl http://localhost:5000/health`

### CORS errors

**Fix:** Already configured in backend/app.py with:
```python
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')
```

---

## 🚀 QUICK START COMMANDS

### Start Development

```bash
# Terminal 1: Start backend
source venv/bin/activate
python -m backend.app

# Terminal 2: Start frontend
cd frontend
npm run dev

# Open browser: http://localhost:5173
```

### Test Backend API

```bash
# Health check
curl http://localhost:5000/health

# List chats
curl http://localhost:5000/api/chats

# Create chat
curl -X POST http://localhost:5000/api/chats \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Chat"}'
```

---

## 📚 NEXT PHASES PREVIEW

**Phase 5: Sidebar UI (Complete)**
- Mini-phase 5.1: Sidebar header
- Mini-phase 5.2: Chat list with data
- Mini-phase 5.3: Chat selection
- Mini-phase 5.4: New chat button functionality
- Mini-phase 5.5: Delete chat

**Phase 6: Chat Area UI (Complete)**
- Mini-phase 6.1: Chat header
- Mini-phase 6.2: Messages display
- Mini-phase 6.3: Message input
- Mini-phase 6.4: Send message functionality
- Mini-phase 6.5: Streaming display

**Phase 7: Real-time Chat Integration**
- Complete WebSocket integration
- Token-by-token streaming
- Error handling
- Reconnection logic

**Phase 8: File Upload & Processing**
- File upload UI
- Backend file processing
- Display file content in context

---

## 🎓 LEARNING RESOURCES

### React Concepts Used:
- Hooks (useState, useEffect, useContext, useReducer)
- Context API for global state
- Custom hooks (useChat, useWebSocket)
- Component composition

### API Integration:
- Axios for HTTP requests
- Socket.io for WebSocket
- Proxy configuration in Vite

### Recommended Reading:
- React docs: https://react.dev/
- Socket.io docs: https://socket.io/docs/
- Vite docs: https://vitejs.dev/

---

## ✅ PHASE 4 COMPLETION CRITERIA

Phase 4 is complete when:
- [ ] npm install works without errors
- [ ] Frontend dev server starts
- [ ] Backend server starts
- [ ] Welcome screen displays correctly
- [ ] No console errors in browser
- [ ] Can navigate to http://localhost:5173
- [ ] Health check returns 200

**Current Status:** 75% Complete
**Next Step:** Run `npm install` in frontend folder

---

**Last Updated:** [Current Date]
**Phase:** 4.7 (Setup & Install)
**Next Phase:** 4.8 (Build UI Components)
