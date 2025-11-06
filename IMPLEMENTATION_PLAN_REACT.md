# Kage no Koe - Phase by Phase Implementation Plan
## Flask Backend + React Frontend Architecture

---

## 🎯 PROJECT OVERVIEW

**Project Name:** Kage no Koe (影の声 - Voice of the Shadow)
**Alternative Name:** LocalMind
**Purpose:** Privacy-focused local AI chat application using Ollama
**Architecture:** Flask REST API Backend + React SPA Frontend
**Target Hardware:** Laptop (optimized for resource efficiency)
**Model:** Llama 3.2 1B (lightweight, fast)

---

## 📋 TECHNOLOGY STACK

### Backend
- **Framework:** Flask + Flask-CORS + Flask-SocketIO
- **Database:** SQLite3
- **AI Engine:** Ollama (llama3.2:1b)
- **File Processing:** PyPDF2, python-docx, openpyxl, Pillow, pytesseract
- **Web Search:** DuckDuckGo Search API
- **Environment:** Python 3.10+

### Frontend
- **Framework:** React 18+ with Hooks
- **Build Tool:** Vite (fast development and building)
- **State Management:** React Context API + useReducer
- **HTTP Client:** Axios
- **Real-time:** Socket.io-client
- **Styling:** CSS Modules or Tailwind CSS
- **UI Components:** Custom components (lightweight approach)
- **Routing:** React Router v6

### Development Tools
- **Backend:** Python virtual environment, pip
- **Frontend:** Node.js 18+, npm/yarn
- **Code Quality:** ESLint, Prettier (frontend), Black (backend)
- **Version Control:** Git

---

## 🚀 IMPLEMENTATION PHASES

---

## **PHASE 0: Project Setup & Environment**

### 0.1 Project Structure Setup
```
kage-no-koe/
├── backend/
│   ├── __init__.py
│   ├── app.py                 # Flask application entry
│   ├── config.py              # Configuration management
│   ├── database.py            # Database operations
│   ├── ollama_handler.py      # Ollama API integration
│   ├── context_manager.py     # Conversation context handling
│   ├── models/
│   │   ├── __init__.py
│   │   ├── chat.py           # Chat model
│   │   └── message.py        # Message model
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── chat_routes.py    # Chat endpoints
│   │   ├── message_routes.py # Message endpoints
│   │   ├── file_routes.py    # File upload endpoints
│   │   └── health_routes.py  # Health/status endpoints
│   └── utils/
│       ├── __init__.py
│       ├── file_processor.py  # Document processing
│       └── web_search.py      # Web search integration
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   ├── Sidebar/
│   │   │   ├── Message/
│   │   │   └── Common/
│   │   ├── context/
│   │   │   └── AppContext.jsx
│   │   ├── hooks/
│   │   │   ├── useChat.js
│   │   │   └── useWebSocket.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── data/
│   ├── app.db               # SQLite database
│   └── uploads/             # Uploaded files
├── scripts/
│   ├── setup.sh            # Initial setup script
│   ├── install_ollama.sh   # Ollama installation
│   └── launch.sh           # Application launcher
├── config.json             # Application configuration
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── .gitignore
└── README.md
```

### 0.2 Backend Dependencies
**requirements.txt:**
```
flask==3.0.0
flask-socketio==5.3.5
flask-cors==4.0.0
python-socketio==5.10.0
pypdf2==3.0.1
python-docx==1.1.0
openpyxl==3.1.2
pillow==10.1.0
pytesseract==0.3.10
duckduckgo-search==4.1.1
requests==2.31.0
python-dotenv==1.0.0
```

**Setup Commands:**
```bash
cd kage-no-koe
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 0.3 Frontend Dependencies
**Navigate to frontend and initialize:**
```bash
cd frontend
npm create vite@latest . -- --template react
npm install axios socket.io-client react-router-dom
npm install -D tailwindcss postcss autoprefixer  # Optional
```

**Key packages:**
- `react` & `react-dom`: Core React
- `axios`: HTTP requests
- `socket.io-client`: WebSocket for streaming
- `react-router-dom`: Routing
- `tailwindcss`: Styling (optional, can use CSS modules)

### 0.4 Ollama Setup
```bash
# Install Ollama (if not installed)
curl -fsSL https://ollama.com/install.sh | sh

# Download and verify model
ollama pull llama3.2:1b

# Start Ollama service
ollama serve
```

### 0.5 Configuration File
**config.json:**
```json
{
  "model_name": "llama3.2:1b",
  "hardware_profile": "laptop",
  "database_path": "data/app.db",
  "upload_folder": "data/uploads",
  "max_file_size_mb": 50,
  "backend_port": 5000,
  "frontend_dev_port": 5173,
  "ollama_host": "http://localhost:11434",
  "context_window_size": 4096,
  "max_tokens": 2048
}
```

**✅ Phase 0 Completion Checklist:**
- [ ] Project structure created
- [ ] Python virtual environment set up
- [ ] Backend dependencies installed
- [ ] Frontend initialized with Vite + React
- [ ] Frontend dependencies installed
- [ ] Ollama installed and model downloaded
- [ ] Configuration files created
- [ ] Git repository initialized

---

## **PHASE 1: Backend Core - Flask API Setup**

### 1.1 Flask Application Structure

**backend/app.py:**
```python
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from backend.config import PORT, FLASK_DEBUG
from backend.routes import chat_routes, message_routes, health_routes

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'your-secret-key-change-this'

    # Enable CORS for React dev server
    CORS(app, origins=["http://localhost:5173"])

    # Initialize SocketIO
    socketio = SocketIO(app, cors_allowed_origins="*")

    # Register blueprints
    app.register_blueprint(health_routes.bp)
    app.register_blueprint(chat_routes.bp)
    app.register_blueprint(message_routes.bp)

    return app, socketio

app, socketio = create_app()

if __name__ == '__main__':
    print("🚀 Kage no Koe Backend Starting...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
```

### 1.2 Configuration Management

**backend/config.py:**
- Load from config.json
- Environment variable support
- Path management
- Hardware profile settings

### 1.3 Health Check Routes

**backend/routes/health_routes.py:**
```python
from flask import Blueprint, jsonify
from backend.ollama_handler import OllamaHandler

bp = Blueprint('health', __name__)
ollama = OllamaHandler()

@bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    ollama_connected = ollama.check_connection()
    model_available = ollama.check_model_exists()

    return jsonify({
        'status': 'healthy' if ollama_connected else 'degraded',
        'ollama_connected': ollama_connected,
        'model_available': model_available,
        'model_name': ollama.model
    })

@bp.route('/api/models', methods=['GET'])
def get_models():
    """Get available Ollama models"""
    models = ollama.get_available_models()
    return jsonify({
        'success': True,
        'models': models,
        'current_model': ollama.model
    })
```

**✅ Phase 1 Completion Checklist:**
- [ ] Flask app structure created
- [ ] CORS configured for React
- [ ] Blueprint architecture implemented
- [ ] Health check endpoints working
- [ ] Configuration system functional
- [ ] Backend runs without errors

---

## **PHASE 2: Database Layer**

### 2.1 Database Schema

**Tables:**
1. **chats** - Chat sessions
2. **messages** - Chat messages
3. **files** - Uploaded files
4. **settings** - User settings
5. **search_folders** - Local search directories

### 2.2 Database Manager

**backend/database.py:**
- Connection management
- Schema initialization
- CRUD operations for all tables
- Indexes for performance
- Foreign key constraints

**Key Methods:**
- `create_chat()`, `get_chat()`, `list_chats()`, `update_chat()`, `delete_chat()`
- `add_message()`, `get_messages()`
- `add_file()`, `get_files()`
- `set_setting()`, `get_setting()`

### 2.3 Database API Routes

**backend/routes/chat_routes.py:**
```python
@bp.route('/api/chats', methods=['GET'])
def get_chats():
    """List all chats"""

@bp.route('/api/chats', methods=['POST'])
def create_chat():
    """Create new chat"""

@bp.route('/api/chats/<int:chat_id>', methods=['GET'])
def get_chat(chat_id):
    """Get specific chat with messages"""

@bp.route('/api/chats/<int:chat_id>', methods=['PUT'])
def update_chat(chat_id):
    """Update chat title/settings"""

@bp.route('/api/chats/<int:chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    """Delete chat"""
```

**✅ Phase 2 Completion Checklist:**
- [ ] Database schema implemented
- [ ] All tables created with proper constraints
- [ ] CRUD operations implemented
- [ ] Database routes created
- [ ] Testing: Create, read, update, delete operations work
- [ ] Data persists across restarts

---

## **PHASE 3: Ollama Integration**

### 3.1 Ollama Handler

**backend/ollama_handler.py:**

**Key Features:**
- Connection management
- Streaming responses
- Non-streaming responses
- Model management
- Error handling

**Methods:**
```python
- check_connection() -> bool
- get_available_models() -> List[Dict]
- check_model_exists(model_name) -> bool
- chat_stream(messages, model) -> Generator[str]
- chat_complete(messages, model) -> str
```

### 3.2 Context Manager

**backend/context_manager.py:**

**Responsibilities:**
- Manage conversation history
- Context window management (4096 tokens)
- System message handling
- Message truncation for token limits

**Methods:**
```python
- add_message(role, content)
- get_context_for_llm() -> List[Dict]
- clear_context()
- set_system_message(message)
- estimate_tokens(text) -> int
```

### 3.3 Message Routes with Streaming

**backend/routes/message_routes.py:**

```python
@bp.route('/api/chats/<int:chat_id>/messages', methods=['POST'])
def send_message(chat_id):
    """Send message and get response"""
    # 1. Save user message to database
    # 2. Get conversation context
    # 3. Stream response from Ollama
    # 4. Save assistant response
    # 5. Return message ID

@socketio.on('send_message')
def handle_message_stream(data):
    """WebSocket handler for streaming responses"""
    # Real-time token streaming
```

**✅ Phase 3 Completion Checklist:**
- [ ] Ollama handler implemented
- [ ] Connection checking works
- [ ] Streaming responses functional
- [ ] Context manager implemented
- [ ] Message routes created
- [ ] WebSocket streaming works
- [ ] Testing: Can send messages and get AI responses

---

## **PHASE 4: React Frontend Foundation**

### 4.1 Project Setup

**frontend/vite.config.js:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      }
    }
  }
})
```

### 4.2 API Service Layer

**frontend/src/services/api.js:**
```javascript
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const healthAPI = {
  check: () => api.get('/health'),
  getModels: () => api.get('/api/models'),
};

export const chatAPI = {
  list: () => api.get('/api/chats'),
  create: (data) => api.post('/api/chats', data),
  get: (chatId) => api.get(`/api/chats/${chatId}`),
  update: (chatId, data) => api.put(`/api/chats/${chatId}`, data),
  delete: (chatId) => api.delete(`/api/chats/${chatId}`),
};

export const messageAPI = {
  send: (chatId, message) => api.post(`/api/chats/${chatId}/messages`, message),
  list: (chatId) => api.get(`/api/chats/${chatId}/messages`),
};

export default api;
```

### 4.3 WebSocket Hook

**frontend/src/hooks/useWebSocket.js:**
```javascript
import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

export const useWebSocket = (url = 'http://localhost:5000') => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(url);

    return () => {
      socketRef.current?.disconnect();
    };
  }, [url]);

  const sendMessage = (event, data) => {
    socketRef.current?.emit(event, data);
  };

  const onMessage = (event, callback) => {
    socketRef.current?.on(event, callback);
  };

  return { sendMessage, onMessage, socket: socketRef.current };
};
```

### 4.4 Global State Management

**frontend/src/context/AppContext.jsx:**
```javascript
import React, { createContext, useReducer, useContext } from 'react';

const AppContext = createContext();

const initialState = {
  currentChat: null,
  chats: [],
  messages: [],
  sidebarOpen: true,
  theme: 'dark',
  connected: false,
  currentModel: 'llama3.2:1b',
  isTyping: false,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
```

### 4.5 Main App Structure

**frontend/src/App.jsx:**
```javascript
import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar/Sidebar';
import ChatArea from './components/Chat/ChatArea';
import './App.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-container">
          <Sidebar />
          <ChatArea />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
```

**✅ Phase 4 Completion Checklist:**
- [ ] Vite + React project initialized
- [ ] Proxy configuration for API calls
- [ ] API service layer created
- [ ] WebSocket hook implemented
- [ ] Context API setup for state management
- [ ] Main App component structure
- [ ] Development server runs on port 5173

---

## **PHASE 5: React UI Components - Sidebar**

### 5.1 Sidebar Component

**frontend/src/components/Sidebar/Sidebar.jsx:**

**Features:**
- App logo and title
- New chat button
- Chat list with search
- Settings button
- Models button
- Collapsible on mobile

**Sub-components:**
- `ChatListItem.jsx` - Individual chat in list
- `SidebarHeader.jsx` - Logo and new chat button
- `SidebarFooter.jsx` - Settings/models buttons

### 5.2 Chat List Component

**frontend/src/components/Sidebar/ChatList.jsx:**
```javascript
import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { chatAPI } from '../../services/api';
import ChatListItem from './ChatListItem';

function ChatList() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await chatAPI.list();
      dispatch({ type: 'SET_CHATS', payload: response.data.chats });
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  return (
    <div className="chat-list">
      {state.chats.map(chat => (
        <ChatListItem key={chat.id} chat={chat} />
      ))}
    </div>
  );
}
```

**✅ Phase 5 Completion Checklist:**
- [ ] Sidebar component created
- [ ] Chat list displays all chats
- [ ] New chat button works
- [ ] Chat selection works
- [ ] Sidebar responsive on mobile
- [ ] Empty state for no chats

---

## **PHASE 6: React UI Components - Chat Area**

### 6.1 Chat Area Component

**frontend/src/components/Chat/ChatArea.jsx:**

**Structure:**
- Header with chat title
- Messages container
- Message input area
- Welcome screen (when no chat selected)

### 6.2 Message Components

**frontend/src/components/Message/Message.jsx:**
```javascript
function Message({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="message-content">
        <div className="message-text">{message.content}</div>
        <div className="message-time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
```

**Sub-components:**
- `UserMessage.jsx`
- `AssistantMessage.jsx`
- `SystemMessage.jsx`
- `TypingIndicator.jsx`

### 6.3 Message Input Component

**frontend/src/components/Chat/MessageInput.jsx:**
```javascript
import React, { useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

function MessageInput({ chatId }) {
  const [input, setInput] = useState('');
  const { sendMessage } = useWebSocket();

  const handleSend = () => {
    if (!input.trim()) return;

    sendMessage('send_message', {
      chat_id: chatId,
      content: input,
    });

    setInput('');
  };

  return (
    <div className="message-input-container">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Type a message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

### 6.4 Welcome Screen Component

**frontend/src/components/Chat/WelcomeScreen.jsx:**
- Kage no Koe branding
- Feature highlights
- "Start chatting" button
- Quick start tips

**✅ Phase 6 Completion Checklist:**
- [ ] Chat area component complete
- [ ] Message components render correctly
- [ ] User vs assistant message styling
- [ ] Message input functional
- [ ] Send message on Enter key
- [ ] Welcome screen displays
- [ ] Typing indicator works
- [ ] Auto-scroll to new messages

---

## **PHASE 7: Real-time Chat Integration**

### 7.1 Custom Chat Hook

**frontend/src/hooks/useChat.js:**
```javascript
import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { chatAPI, messageAPI } from '../services/api';
import { useWebSocket } from './useWebSocket';

export function useChat(chatId) {
  const { state, dispatch } = useAppContext();
  const { onMessage, sendMessage } = useWebSocket();
  const [streamingMessage, setStreamingMessage] = useState('');

  useEffect(() => {
    if (!chatId) return;

    // Load messages
    loadMessages(chatId);

    // Listen for streaming tokens
    onMessage('message_token', (data) => {
      if (data.chat_id === chatId) {
        setStreamingMessage(prev => prev + data.token);
      }
    });

    // Listen for message complete
    onMessage('message_complete', (data) => {
      if (data.chat_id === chatId) {
        dispatch({ type: 'ADD_MESSAGE', payload: data.message });
        setStreamingMessage('');
        dispatch({ type: 'SET_TYPING', payload: false });
      }
    });
  }, [chatId]);

  const loadMessages = async (id) => {
    const response = await messageAPI.list(id);
    dispatch({ type: 'SET_MESSAGES', payload: response.data.messages });
  };

  const sendChatMessage = (content) => {
    // Add user message immediately
    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_TYPING', payload: true });

    // Send via WebSocket
    sendMessage('send_message', {
      chat_id: chatId,
      content,
    });
  };

  return { sendChatMessage, streamingMessage };
}
```

### 7.2 Backend WebSocket Handler

**backend/app.py (add SocketIO events):**
```python
@socketio.on('send_message')
def handle_send_message(data):
    chat_id = data['chat_id']
    content = data['content']

    # Save user message
    db.add_message(chat_id, 'user', content)

    # Get context
    messages = db.get_messages(chat_id)
    context = context_manager.build_context(messages)

    # Stream response
    full_response = ''
    for token in ollama.chat_stream(context):
        full_response += token
        emit('message_token', {
            'chat_id': chat_id,
            'token': token
        })

    # Save assistant message
    message = db.add_message(chat_id, 'assistant', full_response,
                             model_used=ollama.model)

    emit('message_complete', {
        'chat_id': chat_id,
        'message': message
    })
```

**✅ Phase 7 Completion Checklist:**
- [ ] WebSocket connection established
- [ ] Real-time message streaming works
- [ ] Tokens appear as they're generated
- [ ] Messages saved to database
- [ ] Context preserved across messages
- [ ] Error handling for disconnections
- [ ] Reconnection logic implemented

---

## **PHASE 8: File Upload & Processing**

### 8.1 File Upload Component

**frontend/src/components/Chat/FileUpload.jsx:**
```javascript
import React, { useRef } from 'react';

function FileUpload({ onFileSelect }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    onFileSelect(files);
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.xlsx"
        style={{ display: 'none' }}
      />
      <button onClick={() => fileInputRef.current?.click()}>
        📎 Attach Files
      </button>
    </div>
  );
}
```

### 8.2 File Processor Backend

**backend/utils/file_processor.py:**

**Supported Formats:**
- PDF (PyPDF2)
- Word (python-docx)
- Excel (openpyxl)
- Images with OCR (Pillow + pytesseract)
- Plain text

**Methods:**
```python
class FileProcessor:
    def process_file(filepath: str) -> Dict:
        """Process file and extract text content"""

    def extract_pdf(filepath: str) -> str:
        """Extract text from PDF"""

    def extract_docx(filepath: str) -> str:
        """Extract text from Word document"""

    def extract_xlsx(filepath: str) -> str:
        """Extract data from Excel"""

    def extract_image_text(filepath: str) -> str:
        """OCR text from image"""
```

### 8.3 File Upload Routes

**backend/routes/file_routes.py:**
```python
@bp.route('/api/chats/<int:chat_id>/files', methods=['POST'])
def upload_file(chat_id):
    """Upload and process file"""
    file = request.files['file']

    # Save file
    filepath = save_uploaded_file(file)

    # Process file
    processed_content = file_processor.process_file(filepath)

    # Save to database
    db.add_file(chat_id, file.filename, filepath,
                file.content_type, file.size, processed_content)

    return jsonify({'success': True, 'content': processed_content})
```

**✅ Phase 8 Completion Checklist:**
- [ ] File upload UI component
- [ ] Drag-and-drop support
- [ ] File processor for all formats
- [ ] PDF text extraction works
- [ ] Word document extraction works
- [ ] Excel data extraction works
- [ ] Image OCR functional
- [ ] Files saved to database
- [ ] File content included in chat context

---

## **PHASE 9: Advanced Features - Web Search**

### 9.1 Web Search Integration

**backend/utils/web_search.py:**
```python
from duckduckgo_search import DDGS

class WebSearch:
    def __init__(self):
        self.ddgs = DDGS()

    def search(self, query: str, max_results: int = 5) -> List[Dict]:
        """Search the web and return results"""
        results = []
        for r in self.ddgs.text(query, max_results=max_results):
            results.append({
                'title': r['title'],
                'url': r['link'],
                'snippet': r['body']
            })
        return results

    def search_and_summarize(self, query: str) -> str:
        """Search and create summary for LLM context"""
        results = self.search(query)
        summary = "Web search results:\n\n"
        for i, r in enumerate(results, 1):
            summary += f"{i}. {r['title']}\n"
            summary += f"   {r['snippet']}\n"
            summary += f"   Source: {r['url']}\n\n"
        return summary
```

### 9.2 Search Command Detection

**backend/context_manager.py (enhancement):**
```python
def detect_search_intent(message: str) -> bool:
    """Detect if user wants web search"""
    search_keywords = ['search', 'look up', 'find information',
                      'what is', 'who is', 'latest news']
    return any(keyword in message.lower() for keyword in search_keywords)
```

### 9.3 Frontend Search Toggle

**Add search toggle in chat settings:**
- Enable/disable web search per chat
- Manual search trigger button
- Display search results in chat

**✅ Phase 9 Completion Checklist:**
- [ ] Web search utility implemented
- [ ] DuckDuckGo integration working
- [ ] Search intent detection
- [ ] Search results formatting
- [ ] Search toggle in UI
- [ ] Results displayed in chat
- [ ] Search context added to LLM

---

## **PHASE 10: Local File Search & RAG**

### 10.1 File Indexing

**backend/utils/file_indexer.py:**
```python
class FileIndexer:
    def index_folder(folder_path: str):
        """Index all files in folder"""

    def search_files(query: str) -> List[str]:
        """Search indexed files"""

    def get_relevant_content(filepaths: List[str], query: str) -> str:
        """Get relevant content from files for context"""
```

### 10.2 RAG Implementation

**Simple RAG approach:**
1. User asks question
2. Search local indexed files
3. Extract relevant chunks
4. Add to context window
5. LLM generates answer with sources

### 10.3 Search Folders Management

**UI for managing search folders:**
- Add/remove folders to index
- Enable/disable folders
- Re-index button
- Show indexing status

**✅ Phase 10 Completion Checklist:**
- [ ] File indexing system
- [ ] Local file search functional
- [ ] RAG context injection
- [ ] Search folder management UI
- [ ] Source attribution in responses
- [ ] Efficient chunk retrieval

---

## **PHASE 11: Settings & Customization**

### 11.1 Settings Modal Component

**frontend/src/components/Settings/SettingsModal.jsx:**

**Settings Categories:**
1. **Model Settings**
   - Model selection
   - Temperature
   - Max tokens
   - Context window size

2. **System Message**
   - Global system prompt
   - Per-chat system prompt

3. **Appearance**
   - Theme (dark/light)
   - Font size
   - Message density

4. **Search Folders**
   - Add/remove folders
   - Enable/disable indexing

5. **Privacy**
   - Clear all data
   - Export/import chats

### 11.2 Settings Persistence

**Backend:**
- Save settings to database
- Per-user settings support
- Default settings

**Frontend:**
- Save UI preferences to localStorage
- Sync with backend

**✅ Phase 11 Completion Checklist:**
- [ ] Settings modal complete
- [ ] All settings functional
- [ ] Settings persist to database
- [ ] Settings apply immediately
- [ ] Default settings work
- [ ] Export/import functionality

---

## **PHASE 12: Polish & Optimization**

### 12.1 UI/UX Enhancements

**Visual Polish:**
- Smooth animations
- Loading states
- Error messages
- Toast notifications
- Keyboard shortcuts

**Accessibility:**
- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode

### 12.2 Performance Optimization

**Frontend:**
- React.memo for components
- Virtualized chat list (react-window)
- Lazy loading for old messages
- Code splitting

**Backend:**
- Database query optimization
- Caching frequently accessed data
- Connection pooling
- Async processing

### 12.3 Error Handling

**Comprehensive error handling:**
- Network errors
- Ollama connection errors
- File processing errors
- Database errors
- User-friendly error messages

### 12.4 Testing

**Frontend:**
- Component tests (React Testing Library)
- Integration tests
- E2E tests (Playwright/Cypress)

**Backend:**
- Unit tests (pytest)
- API tests
- Database tests

**✅ Phase 12 Completion Checklist:**
- [ ] All animations smooth
- [ ] Loading states everywhere
- [ ] Error handling comprehensive
- [ ] Keyboard shortcuts work
- [ ] Accessibility features
- [ ] Performance optimized
- [ ] Tests written and passing
- [ ] No console errors

---

## **PHASE 13: Deployment & Launch Scripts**

### 13.1 Setup Script

**scripts/setup.sh:**
```bash
#!/bin/bash
# Complete setup script
# - Check dependencies
# - Install Ollama if needed
# - Download model
# - Create virtual environment
# - Install Python packages
# - Install Node packages
# - Create data directories
# - Initialize database
```

### 13.2 Launch Script

**scripts/launch.sh:**
```bash
#!/bin/bash
# Launch both backend and frontend
# - Start Ollama if not running
# - Activate venv
# - Start Flask backend
# - Start Vite dev server
# - Open browser
```

### 13.3 Production Build

**Build for production:**
```bash
# Frontend build
cd frontend
npm run build

# Backend serve static files
# Configure Flask to serve React build
```

**✅ Phase 13 Completion Checklist:**
- [ ] Setup script complete
- [ ] Launch script works
- [ ] Production build process
- [ ] Docker support (optional)
- [ ] Documentation complete
- [ ] README updated

---

## **PHASE 14: Future Enhancements**

### Potential Features:
1. **Voice Input/Output**
   - Speech-to-text for input
   - Text-to-speech for responses

2. **Multi-modal Support**
   - Image generation (if using multi-modal models)
   - Image understanding

3. **Plugin System**
   - Custom tools/functions
   - External API integrations

4. **Collaborative Features**
   - Share chats
   - Multi-user support

5. **Advanced RAG**
   - Vector database (ChromaDB)
   - Semantic search
   - Better chunking strategies

6. **Model Management**
   - Download models from UI
   - Switch models per message
   - Model comparison

7. **Export/Import**
   - Export chats as markdown
   - Import from ChatGPT
   - PDF export

---

## 📊 PROGRESS TRACKING

### Phase Status Legend:
- ⏳ Not Started
- 🚧 In Progress
- ✅ Completed
- ⚠️ Blocked

### Current Status:
| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Project Setup | ⏳ |
| 1 | Backend Core | ⏳ |
| 2 | Database Layer | ⏳ |
| 3 | Ollama Integration | ⏳ |
| 4 | React Foundation | ⏳ |
| 5 | Sidebar UI | ⏳ |
| 6 | Chat Area UI | ⏳ |
| 7 | Real-time Chat | ⏳ |
| 8 | File Upload | ⏳ |
| 9 | Web Search | ⏳ |
| 10 | RAG System | ⏳ |
| 11 | Settings | ⏳ |
| 12 | Polish | ⏳ |
| 13 | Deployment | ⏳ |

---

## 🎯 DEVELOPMENT WORKFLOW

### Daily Development Flow:
1. Start Ollama: `ollama serve`
2. Activate venv: `source venv/bin/activate`
3. Start backend: `python -m backend.app`
4. Start frontend: `cd frontend && npm run dev`
5. Open browser: `http://localhost:5173`

### Git Workflow:
```bash
# Feature development
git checkout -b feature/phase-X-description
# ... make changes ...
git add .
git commit -m "Phase X: Description of changes"
git push origin feature/phase-X-description

# After testing
git checkout main
git merge feature/phase-X-description
git tag phase-X-complete
```

---

## 📚 RESOURCES & REFERENCES

### Documentation:
- **React:** https://react.dev/
- **Vite:** https://vitejs.dev/
- **Flask:** https://flask.palletsprojects.com/
- **Ollama API:** https://github.com/ollama/ollama/blob/main/docs/api.md
- **Socket.io:** https://socket.io/docs/

### Design Inspiration:
- ChatGPT interface
- Claude interface
- Notion AI

---

## 🔧 TROUBLESHOOTING

### Common Issues:

**Ollama not connecting:**
- Check if Ollama is running: `curl http://localhost:11434`
- Restart Ollama: `pkill ollama && ollama serve`

**React not connecting to Flask:**
- Check Vite proxy configuration
- Verify CORS settings in Flask
- Check if backend is running on port 5000

**Database errors:**
- Delete `data/app.db` and restart to rebuild
- Check file permissions on data folder

**WebSocket not working:**
- Verify Socket.io versions match
- Check firewall settings
- Test with browser console

---

## 🎉 PROJECT COMPLETION CRITERIA

### MVP (Minimum Viable Product):
- [x] Project structure complete
- [ ] Backend API functional
- [ ] React frontend running
- [ ] Can create and list chats
- [ ] Can send messages and get AI responses
- [ ] Messages persist to database
- [ ] Real-time streaming works

### Full Feature Set:
- [ ] All MVP features
- [ ] File upload and processing
- [ ] Web search integration
- [ ] Local file search (RAG)
- [ ] Settings persistence
- [ ] Theme switching
- [ ] Error handling
- [ ] Performance optimized

### Production Ready:
- [ ] All features working
- [ ] Tests passing
- [ ] Documentation complete
- [ ] Setup scripts work
- [ ] No critical bugs
- [ ] Optimized for laptop hardware
- [ ] User guide written

---

**End of Implementation Plan**

*Last Updated: [Current Date]*
*Author: Development Team*
*Project: Kage no Koe - LocalMind AI Assistant*
