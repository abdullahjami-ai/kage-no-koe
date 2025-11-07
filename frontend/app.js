/* ============================================
   KAGE NO KOE - MAIN APPLICATION
   UI Interactions & API Integration
   ============================================ */

// API Base URL
const API_BASE = 'http://localhost:5000';

// WebSocket connection
let socket = null;
let streamingMessage = '';

// ============= INITIALIZATION =============

document.addEventListener('DOMContentLoaded', () => {
    console.log('🧠 Kage no Koe - Initializing...');

    // Initialize UI
    initializeUI();

    // Setup event listeners
    setupEventListeners();

    // Setup state observers
    setupStateObservers();

    // Connect WebSocket
    connectWebSocket();

    // Check backend connection
    checkHealth();

    // Load chats
    loadChats();

    console.log('✅ Initialization complete');
});

// ============= WEBSOCKET CONNECTION =============

function connectWebSocket() {
    console.log('🔌 Connecting to WebSocket...');

    socket = io(API_BASE);

    socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        appState.set('connected', true);
        updateConnectionStatus(true);
    });

    socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        appState.set('connected', false);
        updateConnectionStatus(false);
    });

    socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });

    // Handle AI response events
    socket.on('ai_response_start', (data) => {
        console.log('🤖 AI response starting...');
        streamingMessage = '';
        appState.setTyping(true);
    });

    socket.on('message_token', (data) => {
        streamingMessage += data.token;

        // Update or add streaming message in UI
        const messages = appState.get('messages');
        const lastMessage = messages[messages.length - 1];

        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.streaming) {
            // Update existing streaming message
            lastMessage.content = streamingMessage;
            appState.set('messages', [...messages]);
        } else {
            // Add new streaming message
            appState.addMessage({
                role: 'assistant',
                content: streamingMessage,
                streaming: true,
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('message_complete', (data) => {
        console.log('✅ AI response complete');
        appState.setTyping(false);

        // Replace streaming message with final message
        const messages = appState.get('messages');
        const lastMessage = messages[messages.length - 1];

        if (lastMessage && lastMessage.streaming) {
            lastMessage.content = data.message.content;
            lastMessage.streaming = false;
            lastMessage.id = data.message.id;
            appState.set('messages', [...messages]);
        }

        streamingMessage = '';
    });

    socket.on('message_saved', (data) => {
        console.log('💾 Message saved to database');
    });

    socket.on('connection_response', (data) => {
        console.log('🔗 Connection response:', data);
    });
}

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

    // Files update
    appState.subscribe('files', (files) => {
        renderFiles(files);
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
        await new Promise(resolve => setTimeout(resolve, 100));
        currentChat = appState.get('currentChat');
    }

    if (!currentChat) {
        console.error('❌ No chat available');
        return;
    }

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;

    // Add user message to UI
    appState.addMessage({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });

    // Show typing indicator
    appState.setTyping(true);

    // Send to backend via WebSocket
    console.log('📤 Sending message via WebSocket...');
    socket.emit('send_message', {
        chat_id: currentChat,
        content: message
    });
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
        console.error('❌ No active chat for file upload');
        alert('Please create a chat first before uploading files');
        return;
    }

    console.log('📎 Uploading files:', files.map(f => f.name));

    for (const file of files) {
        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);

            // Upload to backend
            const response = await fetch(`${API_BASE}/api/chats/${currentChat}/files`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ File uploaded:', file.name);

                // Add file to state
                appState.addFile({
                    id: data.file.id,
                    name: data.file.filename,
                    size: data.file.file_size,
                    type: data.file.file_type,
                    word_count: data.file.word_count,
                    summary: data.file.summary
                });
            } else {
                console.error('❌ File upload failed:', data.error);
                alert(`Failed to upload ${file.name}: ${data.error}`);
            }
        } catch (error) {
            console.error('❌ File upload error:', error);
            alert(`Error uploading ${file.name}`);
        }
    }

    // Clear file input
    event.target.value = '';
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
            <div class="chat-item-title">${escapeHtml(chat.title)}</div>
            <div class="chat-item-preview">${formatDate(chat.updated_at)}</div>
        </div>
    `).join('');
    
    // Add click listeners
    chatList.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = parseInt(item.dataset.chatId);
            appState.setCurrentChat(chatId);
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

function renderFiles(files) {
    const attachedFilesContainer = document.getElementById('attachedFiles');
    if (!attachedFilesContainer) return;

    if (files.length === 0) {
        attachedFilesContainer.style.display = 'none';
        attachedFilesContainer.innerHTML = '';
        return;
    }

    attachedFilesContainer.style.display = 'flex';
    attachedFilesContainer.innerHTML = files.map(file => `
        <div class="file-chip" data-file-id="${file.id || ''}">
            <span class="file-icon">📄</span>
            <div class="file-info">
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-size">${formatBytes(file.size)}${file.word_count ? ` • ${file.word_count} words` : ''}</div>
            </div>
            <button class="file-remove" onclick="removeFile(${file.id || 0})" title="Remove file">
                <span>×</span>
            </button>
        </div>
    `).join('');
}

function removeFile(fileId) {
    const files = appState.get('files');
    const updatedFiles = files.filter(f => f.id !== fileId);
    appState.set('files', updatedFiles);

    // TODO: Also delete from backend
    console.log('🗑️ File removed:', fileId);
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