from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from backend.config import PORT, FLASK_DEBUG, UPLOAD_FOLDER, MAX_FILE_SIZE_BYTES
from backend.ollama_handler import OllamaHandler
from backend.database import Database
from backend.context_manager import ContextManager
from backend.utils.file_processor import FileProcessor
import os
from werkzeug.utils import secure_filename
from datetime import datetime

# Initialize Flask app
# Configure to serve static files from frontend directory
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE_BYTES  # Max upload size
app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
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

# ============= FILE UPLOAD ROUTES =============

@app.route('/api/chats/<int:chat_id>/files', methods=['POST'])
def upload_file(chat_id):
    """Upload and process a file"""
    try:
        # Check if chat exists
        chat = db.get_chat(chat_id)
        if not chat:
            return jsonify({
                'success': False,
                'error': 'Chat not found'
            }), 404

        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400

        file = request.files['file']

        # Check if filename is empty
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        # Check if file type is supported
        if not FileProcessor.is_supported(file.filename):
            return jsonify({
                'success': False,
                'error': f'Unsupported file type. Supported types: {", ".join(FileProcessor.SUPPORTED_EXTENSIONS.keys())}'
            }), 400

        # Secure the filename
        filename = secure_filename(file.filename)

        # Create unique filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{timestamp}{ext}"

        # Save file to uploads folder
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)

        # Get file size
        file_size = os.path.getsize(filepath)

        # Process file to extract content
        result = FileProcessor.process_file(filepath, filename)

        if not result['success']:
            # Delete file if processing failed
            os.remove(filepath)
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        # Get MIME type
        mime_type = FileProcessor.get_mime_type(filename)

        # Save file info to database
        file_id = db.add_file(
            chat_id=chat_id,
            filename=filename,
            filepath=filepath,
            file_type=mime_type,
            file_size=file_size,
            processed_content=result['content']
        )

        # Generate summary
        summary = FileProcessor.get_file_summary(result, filename)

        return jsonify({
            'success': True,
            'file': {
                'id': file_id,
                'filename': filename,
                'file_type': mime_type,
                'file_size': file_size,
                'word_count': result.get('word_count', 0),
                'pages': result.get('pages'),
                'sheets': result.get('sheets'),
                'summary': summary
            }
        })

    except Exception as e:
        print(f"❌ File upload error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>/files', methods=['GET'])
def get_files(chat_id):
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

@app.route('/api/files/<int:file_id>', methods=['GET'])
def get_file(file_id):
    """Get file details including processed content"""
    try:
        # This would need a new database method
        # For now, return placeholder
        return jsonify({
            'success': False,
            'error': 'Not implemented yet'
        }), 501
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/files/<int:file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Delete a file"""
    try:
        # Get file info
        files = db.get_files(0)  # This needs a better method
        file_info = None
        for f in files:
            if f['id'] == file_id:
                file_info = f
                break

        if not file_info:
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404

        # Delete file from filesystem
        if os.path.exists(file_info['filepath']):
            os.remove(file_info['filepath'])

        # Delete from database (need to add this method)
        # db.delete_file(file_id)

        return jsonify({
            'success': True
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

        # 3.5. Add file context if files are attached
        files = db.get_files(chat_id)
        if files:
            # Add file contents to context
            for file in files:
                if file.get('processed_content'):
                    cm.add_file_context(
                        filename=file['filename'],
                        content=file['processed_content'],
                        max_chars=2000  # Limit context size per file
                    )
            # Rebuild context with files
            context = cm.get_context_for_llm()

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