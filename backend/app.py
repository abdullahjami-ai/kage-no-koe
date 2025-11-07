from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from backend.config import PORT, FLASK_DEBUG
from backend.ollama_handler import OllamaHandler
from backend.database import Database
from backend.context_manager import ContextManager
import os

# Initialize Flask app
# Configure to serve static files from frontend directory
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
CORS(app)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Initialize Ollama handler
ollama = OllamaHandler()

# Initialize Database
db = Database()

# ============= FRONTEND ROUTES =============

@app.route('/')
def serve_frontend():
    """Serve the frontend index.html"""
    return send_from_directory(app.static_folder, 'index.html')

# ============= BASIC ROUTES =============

@app.route('/health', methods=['GET'])
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

@app.route('/api/models', methods=['GET'])
def get_models():
    """Get list of available models"""
    try:
        models = ollama.get_available_models()
        return jsonify({
            'success': True,
            'models': models,
            'current_model': ollama.model
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test', methods=['POST'])
def test_chat():
    """Test endpoint for quick chat"""
    try:
        data = request.json
        message = data.get('message', 'Hello!')
        
        messages = [{"role": "user", "content": message}]
        response = ollama.chat_complete(messages)
        
        return jsonify({
            'success': True,
            'response': response
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============= CHAT ROUTES =============

@app.route('/api/chats', methods=['GET'])
def get_chats():
    """Get all chats"""
    try:
        chats = db.list_chats()
        return jsonify({
            'success': True,
            'chats': chats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats', methods=['POST'])
def create_chat():
    """Create a new chat"""
    try:
        data = request.json
        title = data.get('title', 'New Chat')
        model_name = data.get('model_name', ollama.model)
        system_message = data.get('system_message')
        
        chat_id = db.create_chat(title, model_name, system_message)
        chat = db.get_chat(chat_id)
        
        return jsonify({
            'success': True,
            'chat': chat
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>', methods=['GET'])
def get_chat(chat_id):
    """Get a specific chat with messages"""
    try:
        chat = db.get_chat(chat_id)
        if not chat:
            return jsonify({
                'success': False,
                'error': 'Chat not found'
            }), 404
        
        messages = db.get_messages(chat_id)
        chat['messages'] = messages
        
        return jsonify({
            'success': True,
            'chat': chat
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>', methods=['DELETE'])
def delete_chat_route(chat_id):
    """Delete a chat"""
    try:
        success = db.delete_chat(chat_id)
        return jsonify({
            'success': success
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============= WEBSOCKET EVENTS =============

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'✅ Client connected')
    emit('connection_response', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'❌ Client disconnected')

@socketio.on('send_message')
def handle_send_message(data):
    """
    Handle incoming message and stream AI response
    Expected data: {
        'chat_id': int,
        'content': str
    }
    """
    try:
        chat_id = data.get('chat_id')
        content = data.get('content')

        if not chat_id or not content:
            emit('error', {'message': 'Missing chat_id or content'})
            return

        # 1. Save user message to database
        user_message = db.add_message(chat_id, 'user', content)

        # Emit user message confirmation
        emit('message_saved', {
            'chat_id': chat_id,
            'message': {
                'id': user_message,
                'role': 'user',
                'content': content
            }
        })

        # 2. Get chat context
        chat = db.get_chat(chat_id)
        messages = db.get_messages(chat_id)

        # 3. Build context for LLM
        cm = ContextManager()
        if chat and chat.get('system_message'):
            cm.set_system_message(chat['system_message'])

        context = cm.build_context_from_db_messages(messages, chat.get('system_message'))

        # 4. Stream response from Ollama
        emit('ai_response_start', {'chat_id': chat_id})

        full_response = ''
        for token in ollama.chat_stream(context):
            full_response += token
            emit('message_token', {
                'chat_id': chat_id,
                'token': token
            })

        # 5. Save assistant response to database
        assistant_message_id = db.add_message(
            chat_id,
            'assistant',
            full_response,
            model_used=ollama.model
        )

        # 6. Emit completion
        emit('message_complete', {
            'chat_id': chat_id,
            'message': {
                'id': assistant_message_id,
                'role': 'assistant',
                'content': full_response,
                'model_used': ollama.model
            }
        })

    except Exception as e:
        print(f"❌ Error in send_message: {e}")
        emit('error', {'message': str(e)})

@socketio.on('test_connection')
def handle_test_connection(data):
    """Test WebSocket connection"""
    print(f'🔍 Test connection: {data}')
    emit('test_response', {'status': 'ok', 'received': data})

# ============= MAIN =============

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 LocalMind Backend Starting...")
    print("="*50)
    
    # Check Ollama connection
    if ollama.check_connection():
        print("✅ Ollama connected")
        print(f"✅ Model: {ollama.model}")
    else:
        print("❌ WARNING: Ollama not connected!")
        print("   Run 'ollama serve' in another terminal")
    
    print(f"\n🌐 Server starting on http://localhost:{PORT}")
    print("="*50 + "\n")
    
    # Start server
    socketio.run(app, host='0.0.0.0', port=PORT, debug=FLASK_DEBUG)