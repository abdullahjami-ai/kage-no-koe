from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from pathlib import Path
from backend.config import PORT, FLASK_DEBUG, UPLOAD_FOLDER, MAX_FILE_SIZE_BYTES
from backend.ollama_handler import OllamaHandler
from backend.database import Database
from backend.context_manager import ContextManager
from backend.utils.file_processor import FileProcessor

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE_BYTES
CORS(app)

# Frontend path
FRONTEND_DIR = Path(__file__).parent.parent / 'frontend'

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize Ollama handler
ollama = OllamaHandler()

# Initialize Database
db = Database()

# Initialize Context Manager
context_manager = ContextManager(db)

# Initialize File Processor
file_processor = FileProcessor(UPLOAD_FOLDER, MAX_FILE_SIZE_BYTES)

# ============= FRONTEND ROUTES =============

@app.route('/')
def index():
    """Serve the frontend"""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static frontend files"""
    return send_from_directory(FRONTEND_DIR, path)

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

# ============= FILE UPLOAD ROUTES =============

@app.route('/api/chats/<int:chat_id>/files', methods=['POST'])
def upload_file(chat_id):
    """Upload a file to a chat"""
    try:
        # Check if chat exists
        chat = db.get_chat(chat_id)
        if not chat:
            return jsonify({
                'success': False,
                'error': 'Chat not found'
            }), 404

        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        # Process file
        file_data = file.read()
        result = file_processor.process_upload(file_data, file.filename, chat_id)

        if not result['success']:
            return jsonify(result), 400

        # Save to database
        file_id = db.add_file(
            chat_id=chat_id,
            filename=result['file_info']['filename'],
            filepath=result['file_path'],
            file_type=result['file_info']['file_type'],
            file_size=result['file_info']['file_size'],
            processed_content=result['processed_content']
        )

        return jsonify({
            'success': True,
            'file_id': file_id,
            'file_info': result['file_info']
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>/files', methods=['GET'])
def get_chat_files(chat_id):
    """Get all files for a chat"""
    try:
        files = db.get_files(chat_id)
        return jsonify({
            'success': True,
            'files': files
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>/context', methods=['GET'])
def get_context_summary(chat_id):
    """Get context summary for a chat"""
    try:
        summary = context_manager.get_context_summary(chat_id)
        return jsonify({
            'success': True,
            'summary': summary
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============= SOCKETIO EVENTS =============

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print('Client connected')
    emit('connection_response', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnect"""
    print('Client disconnected')

@socketio.on('send_message')
def handle_message(data):
    """
    Handle streaming chat messages

    Expected data:
    {
        'chat_id': int,
        'message': str,
        'model': str (optional)
    }
    """
    try:
        chat_id = data.get('chat_id')
        user_message = data.get('message')
        model = data.get('model', ollama.model)

        if not chat_id or not user_message:
            emit('error', {'error': 'Missing chat_id or message'})
            return

        # Get chat context
        messages = context_manager.get_chat_context(chat_id)

        # Add current user message
        messages.append({
            'role': 'user',
            'content': user_message
        })

        # Stream response
        emit('message_start', {'chat_id': chat_id})

        full_response = ""
        for token in ollama.chat_stream(messages, model):
            full_response += token
            emit('message_token', {'token': token})

        emit('message_complete', {
            'chat_id': chat_id,
            'response': full_response
        })

        # Save to database
        context_manager.add_message_with_context(
            chat_id=chat_id,
            user_message=user_message,
            ai_response=full_response,
            model_used=model
        )

    except Exception as e:
        emit('error', {'error': str(e)})

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