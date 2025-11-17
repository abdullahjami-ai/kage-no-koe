import os
from pathlib import Path
from typing import Optional, Dict
import mimetypes

class FileProcessor:
    """
    Handles file uploads and processing
    - Validates file types and sizes
    - Extracts text content from various file types
    - Stores files securely
    """

    ALLOWED_EXTENSIONS = {
        'txt', 'md', 'py', 'js', 'json', 'csv', 'html', 'css',
        'java', 'cpp', 'c', 'h', 'go', 'rs', 'ts', 'tsx', 'jsx',
        'xml', 'yaml', 'yml', 'sh', 'bat', 'sql', 'log'
    }

    def __init__(self, upload_folder: Path, max_size_bytes: int):
        self.upload_folder = Path(upload_folder)
        self.max_size_bytes = max_size_bytes
        self.upload_folder.mkdir(parents=True, exist_ok=True)

    def is_allowed_file(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.ALLOWED_EXTENSIONS

    def validate_file(self, file_size: int, filename: str) -> Dict[str, any]:
        """
        Validate file before processing

        Returns:
            Dict with 'valid' (bool) and 'error' (str) keys
        """
        # Check size
        if file_size > self.max_size_bytes:
            max_mb = self.max_size_bytes / (1024 * 1024)
            return {
                'valid': False,
                'error': f'File too large. Max size: {max_mb}MB'
            }

        # Check extension
        if not self.is_allowed_file(filename):
            return {
                'valid': False,
                'error': f'File type not allowed. Allowed: {", ".join(sorted(self.ALLOWED_EXTENSIONS))}'
            }

        return {'valid': True, 'error': None}

    def save_file(self, file_data: bytes, filename: str, chat_id: int) -> Path:
        """
        Save uploaded file to disk

        Args:
            file_data: File binary data
            filename: Original filename
            chat_id: Associated chat ID

        Returns:
            Path to saved file
        """
        # Create chat-specific folder
        chat_folder = self.upload_folder / f"chat_{chat_id}"
        chat_folder.mkdir(exist_ok=True)

        # Save file
        file_path = chat_folder / filename
        with open(file_path, 'wb') as f:
            f.write(file_data)

        return file_path

    def process_text_file(self, file_path: Path) -> str:
        """
        Extract text content from file

        Args:
            file_path: Path to file

        Returns:
            Extracted text content
        """
        encodings = ['utf-8', 'latin-1', 'cp1252']

        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                return content
            except UnicodeDecodeError:
                continue
            except Exception as e:
                return f"Error reading file: {str(e)}"

        return "Error: Could not decode file with supported encodings"

    def get_file_info(self, file_path: Path) -> Dict:
        """
        Get metadata about a file

        Returns:
            Dict with file information
        """
        stat = file_path.stat()

        return {
            'filename': file_path.name,
            'file_size': stat.st_size,
            'file_type': file_path.suffix.lstrip('.'),
            'mime_type': mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream'
        }

    def process_upload(self, file_data: bytes, filename: str, chat_id: int) -> Dict:
        """
        Complete file upload pipeline

        Args:
            file_data: File binary data
            filename: Original filename
            chat_id: Associated chat ID

        Returns:
            Dict with processing results
        """
        # Validate
        validation = self.validate_file(len(file_data), filename)
        if not validation['valid']:
            return {
                'success': False,
                'error': validation['error']
            }

        try:
            # Save file
            file_path = self.save_file(file_data, filename, chat_id)

            # Get info
            file_info = self.get_file_info(file_path)

            # Extract content
            content = self.process_text_file(file_path)

            return {
                'success': True,
                'file_path': str(file_path),
                'file_info': file_info,
                'processed_content': content
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'File processing error: {str(e)}'
            }

    def delete_file(self, file_path: str) -> bool:
        """Delete a file from disk"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception:
            return False


# Test the file processor
if __name__ == '__main__':
    from backend.config import UPLOAD_FOLDER, MAX_FILE_SIZE_BYTES

    print("=== Testing File Processor ===\n")

    processor = FileProcessor(UPLOAD_FOLDER, MAX_FILE_SIZE_BYTES)

    # Test 1: Create test file
    test_content = b"Hello, this is a test file!\nLine 2\nLine 3"
    test_filename = "test.txt"

    print("1. Processing test file...")
    result = processor.process_upload(test_content, test_filename, chat_id=1)

    if result['success']:
        print(f"    File saved: {result['file_path']}")
        print(f"    Size: {result['file_info']['file_size']} bytes")
        print(f"    Content preview: {result['processed_content'][:50]}...")
    else:
        print(f"   L Error: {result['error']}")

    # Test 2: Invalid file
    print("\n2. Testing invalid file type...")
    result = processor.process_upload(b"data", "test.exe", chat_id=1)
    if not result['success']:
        print(f"    Correctly rejected: {result['error']}")

    print("\n=== File Processor Test Complete ===")
