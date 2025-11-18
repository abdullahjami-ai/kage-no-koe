/* ============================================
   KAGE NO KOE - MAIN APPLICATION
   UI Interactions & API Integration
   ============================================ */

// API Base URL
const API_BASE = 'http://localhost:5000';

// ============= SOCKETIO INITIALIZATION =============

let socket = null;
let currentStreamingMessage = '';

function initializeSocket() {
    socket = io(API_BASE);

    socket.on('connect', () => {
        console.log('✅ SocketIO connected');
        appState.set('connected', true);
    });

    socket.on('disconnect', () => {
        console.log('❌ SocketIO disconnected');
        appState.set('connected', false);
    });

    socket.on('connection_response', (data) => {
        console.log('🔌 Connection response:', data);
    });

    socket.on('message_start', (data) => {
        console.log('📨 Message streaming started');
        currentStreamingMessage = '';
        appState.setTyping(true);
    });

    socket.on('message_token', (data) => {
        currentStreamingMessage += data.token;

        // Update the assistant message in real-time
        const messages = appState.get('messages');
        const lastMessage = messages[messages.length - 1];

        if (lastMessage && lastMessage.role === 'assistant') {
            // Update existing message
            lastMessage.content = currentStreamingMessage;
            appState.set('messages', [...messages]);
        } else {
            // Add new assistant message
            appState.addMessage({
                role: 'assistant',
                content: currentStreamingMessage,
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('message_complete', (data) => {
        console.log('✅ Message complete');
        appState.setTyping(false);
        currentStreamingMessage = '';

        // Reload chat to sync with backend
        const currentChat = appState.get('currentChat');
        if (currentChat) {
            loadChatMessages(currentChat);
        }
    });

    socket.on('error', (data) => {
        console.error('❌ SocketIO error:', data.error);
        appState.setTyping(false);
        appState.addMessage({
            role: 'assistant',
            content: `Error: ${data.error}`,
            timestamp: new Date().toISOString()
        });
    });
}

// ============= INITIALIZATION =============

document.addEventListener('DOMContentLoaded', () => {
    console.log('🧠 Kage no Koe - Initializing...');

    // Initialize UI
    initializeUI();

    // Initialize SocketIO
    initializeSocket();

    // Setup event listeners
    setupEventListeners();

    // Setup state observers
    setupStateObservers();

    // Check backend connection
    checkHealth();

    // Load chats
    loadChats();

    console.log('✅ Initialization complete');
});

// ============= UI INITIALIZATION =============

function initializeUI() {
    // Apply saved theme
    const theme = appState.get('theme');
    document.body.className = `theme-${theme}`;
    updateThemeIcon(theme);
    
    // Set initial UI state
    updateSidebarState();
}

// ============= EVENT LISTENERS =============

function setupEventListeners() {
    // Sidebar toggle
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            appState.toggleSidebar();
        });
    }
    
    // New chat button
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', createNewChat);
    }
    
    // Start chatting button (welcome screen)
    const startChatBtn = document.getElementById('startChatBtn');
    if (startChatBtn) {
        startChatBtn.addEventListener('click', createNewChat);
    }
    
    // Theme toggle
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            appState.toggleTheme();
        });
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            appState.openModal('settings');
        });
    }
    
    // Models button
    const modelsBtn = document.getElementById('modelsBtn');
    if (modelsBtn) {
        modelsBtn.addEventListener('click', () => {
            appState.openModal('models');
            loadModels();
        });
    }
    
    // Close modals
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const closeModelsBtn = document.getElementById('closeModelsBtn');
    
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => appState.closeModal());
    if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', () => appState.closeModal());
    if (closeModelsBtn) closeModelsBtn.addEventListener('click', () => appState.closeModal());
    
    // Save settings
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    // Message input
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (messageInput) {
        // Auto-resize textarea
        messageInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
            
            // Update send button state
            const hasText = e.target.value.trim().length > 0;
            if (sendBtn) {
                sendBtn.disabled = !hasText;
            }
        });
        
        // Handle Enter key (send) and Shift+Enter (new line)
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (messageInput.value.trim()) {
                    sendMessage();
                }
            }
        });
    }
    
    // Send button
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    // File attachment
    const attachFileBtn = document.getElementById('attachFileBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (attachFileBtn && fileInput) {
        attachFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Close modal on background click
    const settingsModal = document.getElementById('settingsModal');
    const modelsModal = document.getElementById('modelsModal');
    
    [settingsModal, modelsModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    appState.closeModal();
                }
            });
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K: New chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            createNewChat();
        }
        
        // Ctrl/Cmd + B: Toggle sidebar
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            appState.toggleSidebar();
        }
        
        // Escape: Close modal
        if (e.key === 'Escape') {
            appState.closeModal();
        }
    });
}

// ============= STATE OBSERVERS =============

function setupStateObservers() {
    // Theme changes
    appState.subscribe('theme', (theme) => {
        document.body.className = `theme-${theme}`;
        updateThemeIcon(theme);
    });
    
    // Sidebar toggle
    appState.subscribe('sidebarOpen', (isOpen) => {
        updateSidebarState();
    });
    
    // Modal changes
    appState.subscribe('currentModal', (modalName) => {
        // Hide all modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Show requested modal
        if (modalName) {
            const modal = document.getElementById(`${modalName}Modal`);
            if (modal) {
                modal.style.display = 'flex';
            }
        }
    });
    
    // Connection status
    appState.subscribe('connected', (connected) => {
        updateConnectionStatus(connected);
    });
    
    // Current chat changes
    appState.subscribe('currentChat', (chatId) => {
        if (chatId) {
            loadChatMessages(chatId);
            hideWelcomeScreen();
        } else {
            showWelcomeScreen();
        }
    });
    
    // Messages update
    appState.subscribe('messages', (messages) => {
        renderMessages(messages);
    });
    
    // Chats list update
    appState.subscribe('chats', (chats) => {
        renderChatsList(chats);
    });
}

// ============= UI UPDATE FUNCTIONS =============

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

function updateSidebarState() {
    const sidebar = document.getElementById('sidebar');
    const isOpen = appState.get('sidebarOpen');
    
    if (sidebar) {
        if (isOpen) {
            sidebar.classList.remove('collapsed');
        } else {
            sidebar.classList.add('collapsed');
        }
    }
}

function updateConnectionStatus(connected) {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusDot = statusIndicator?.querySelector('.status-dot');
    const statusText = statusIndicator?.querySelector('.status-text');
    
    if (statusDot && statusText) {
        if (connected) {
            statusDot.style.background = 'var(--success)';
            statusText.textContent = 'Connected';
        } else {
            statusDot.style.background = 'var(--error)';
            statusText.textContent = 'Disconnected';
        }
    }
}

function showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    if (messagesContainer) messagesContainer.style.display = 'none';
}

function hideWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'block';
}

// ============= API FUNCTIONS =============

async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        appState.setConnected(data.ollama_connected && data.model_available);
        appState.set('currentModel', data.model_name);
        
        console.log('✅ Health check:', data);
    } catch (error) {
        console.error('❌ Health check failed:', error);
        appState.setConnected(false);
    }
}

async function loadChats() {
    try {
        const response = await fetch(`${API_BASE}/api/chats`);
        const data = await response.json();
        
        if (data.success) {
            appState.set('chats', data.chats);
            console.log(`✅ Loaded ${data.chats.length} chats`);
        }
    } catch (error) {
        console.error('❌ Failed to load chats:', error);
    }
}

async function createNewChat() {
    try {
        const response = await fetch(`${API_BASE}/api/chats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'New Chat',
                model_name: appState.get('currentModel')
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ New chat created:', data.chat);
            await loadChats(); // Reload chat list
            appState.setCurrentChat(data.chat.id);
        }
    } catch (error) {
        console.error('❌ Failed to create chat:', error);
    }
}

async function loadChatMessages(chatId) {
    try {
        const response = await fetch(`${API_BASE}/api/chats/${chatId}`);
        const data = await response.json();
        
        if (data.success) {
            appState.set('messages', data.chat.messages || []);
            
            // Update header
            const chatTitle = document.getElementById('currentChatTitle');
            const chatModel = document.getElementById('currentChatModel');
            
            if (chatTitle) chatTitle.textContent = data.chat.title;
            if (chatModel) chatModel.textContent = data.chat.model_name;
            
            console.log(`✅ Loaded chat ${chatId}`);
        }
    } catch (error) {
        console.error('❌ Failed to load chat messages:', error);
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    let currentChat = appState.get('currentChat');

    // If no chat is active, create one
    if (!currentChat) {
        await createNewChat();
        // Wait a bit for chat to be created
        await new Promise(resolve => setTimeout(resolve, 200));
        currentChat = appState.get('currentChat');
    }

    // Clear input and refocus for next message
    messageInput.value = '';
    messageInput.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;
    messageInput.focus();

    // Add user message to UI
    appState.addMessage({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });

    // Send via SocketIO for streaming response
    console.log('📤 Sending message via SocketIO:', message);

    if (socket && socket.connected) {
        socket.emit('send_message', {
            chat_id: currentChat,
            message: message
        });
    } else {
        console.error('❌ SocketIO not connected');
        appState.addMessage({
            role: 'assistant',
            content: 'Error: Not connected to server. Please refresh the page.',
            timestamp: new Date().toISOString()
        });
    }
}

async function loadModels() {
    try {
        const response = await fetch(`${API_BASE}/api/models`);
        const data = await response.json();
        
        if (data.success) {
            renderModels(data.models, data.current_model);
        }
    } catch (error) {
        console.error('❌ Failed to load models:', error);
    }
}

function saveSettings() {
    const globalContext = document.getElementById('globalContext')?.value || '';
    appState.set('globalContext', globalContext);
    
    // TODO: Save to backend in Phase 5
    console.log('💾 Settings saved');
    
    appState.closeModal();
}

async function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    const currentChat = appState.get('currentChat');

    if (!currentChat) {
        alert('Please create or select a chat first');
        return;
    }

    for (const file of files) {
        console.log(`📎 Uploading file: ${file.name}`);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE}/api/chats/${currentChat}/files`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                console.log(`✅ File uploaded: ${file.name}`);

                // Add system message to chat
                appState.addMessage({
                    role: 'system',
                    content: `📎 File uploaded: ${file.name} (${formatFileSize(file.size)})`,
                    timestamp: new Date().toISOString()
                });
            } else {
                console.error(`❌ Upload failed: ${data.error}`);
                alert(`Failed to upload ${file.name}: ${data.error}`);
            }
        } catch (error) {
            console.error(`❌ Upload error:`, error);
            alert(`Error uploading ${file.name}: ${error.message}`);
        }
    }

    // Clear file input
    event.target.value = '';
}

// Helper function to format file sizes
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============= RENDER FUNCTIONS =============

function renderChatsList(chats) {
    const chatList = document.getElementById('chatList');
    if (!chatList) return;
    
    if (chats.length === 0) {
        chatList.innerHTML = `
            <div class="chat-list-empty">
                <p>No chats yet</p>
                <p class="text-muted">Start a new conversation</p>
            </div>
        `;
        return;
    }
    
    chatList.innerHTML = chats.map(chat => `
        <div class="chat-item ${chat.id === appState.get('currentChat') ? 'active' : ''}"
             data-chat-id="${chat.id}">
            <div class="chat-item-content">
                <div class="chat-item-title">${escapeHtml(chat.title)}</div>
                <div class="chat-item-preview">${formatDate(chat.updated_at)}</div>
            </div>
            <div class="chat-item-actions">
                <button class="chat-item-action rename-chat" title="Rename">✏️</button>
                <button class="chat-item-action delete-chat" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');

    // Add click listeners
    chatList.querySelectorAll('.chat-item').forEach(item => {
        const chatId = parseInt(item.dataset.chatId);

        // Click on chat item to select
        item.addEventListener('click', (e) => {
            // Don't select if clicking on action buttons
            if (e.target.closest('.chat-item-action')) return;
            appState.setCurrentChat(chatId);
        });

        // Rename button
        item.querySelector('.rename-chat').addEventListener('click', (e) => {
            e.stopPropagation();
            renameChat(chatId);
        });

        // Delete button
        item.querySelector('.delete-chat').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChatConfirm(chatId);
        });
    });
}

function renderMessages(messages) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = messages.map(msg => `
        <div class="message ${msg.role}">
            <div class="message-avatar">
                ${msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div class="message-content">
                <div class="message-role">${msg.role}</div>
                <div class="message-text">${escapeHtml(msg.content)}</div>
            </div>
        </div>
    `).join('');
    
    // Add typing indicator if needed
    if (appState.get('isTyping')) {
        messagesContainer.innerHTML += `
            <div class="message assistant">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderModels(models, currentModel) {
    const modelsList = document.getElementById('modelsList');
    if (!modelsList) return;
    
    if (models.length === 0) {
        modelsList.innerHTML = '<p class="text-muted">No models found</p>';
        return;
    }
    
    modelsList.innerHTML = models.map(model => `
        <div class="model-item ${model.name === currentModel ? 'active' : ''}">
            <div class="model-name">${escapeHtml(model.name)}</div>
            <div class="model-size">${formatBytes(model.size)}</div>
        </div>
    `).join('');
}

// ============= UTILITY FUNCTIONS =============

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============= CHAT ACTIONS =============

async function renameChat(chatId) {
    const chat = appState.get('chats').find(c => c.id === chatId);
    if (!chat) return;

    const newTitle = prompt('Rename chat:', chat.title);
    if (!newTitle || newTitle.trim() === '' || newTitle === chat.title) return;

    try {
        const response = await fetch(`${API_BASE}/api/chats/${chatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle.trim() })
        });

        if (response.ok) {
            // Reload chats to reflect change
            await loadChats();
        } else {
            alert('Failed to rename chat');
        }
    } catch (error) {
        console.error('Error renaming chat:', error);
        alert('Error renaming chat');
    }
}

async function deleteChatConfirm(chatId) {
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
        const response = await fetch(`${API_BASE}/api/chats/${chatId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            // If deleted chat was active, clear it
            if (appState.get('currentChat') === chatId) {
                appState.setCurrentChat(null);
            }

            // Reload chats
            await loadChats();
        } else {
            alert('Failed to delete chat');
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Error deleting chat');
    }
}