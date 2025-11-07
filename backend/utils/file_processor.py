"""
File Processor - Extract text content from various file types
Supports: PDF, Word, Excel, Images (OCR), and plain text
"""

import os
import mimetypes
from typing import Dict, Optional
from pathlib import Path

# Optional imports (will check availability)
try:
    from PyPDF2 import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("WARNING: PyPDF2 not available - PDF processing disabled")

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    print("WARNING: python-docx not available - Word processing disabled")

try:
    from openpyxl import load_workbook
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False
    print("WARNING: openpyxl not available - Excel processing disabled")

try:
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("WARNING: PIL/pytesseract not available - Image OCR disabled")


class FileProcessor:
    """Process and extract text from various file types"""

    SUPPORTED_EXTENSIONS = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
    }

    @classmethod
    def is_supported(cls, filename: str) -> bool:
        """Check if file type is supported"""
        ext = Path(filename).suffix.lstrip('.').lower()
        return ext in cls.SUPPORTED_EXTENSIONS

    @classmethod
    def get_mime_type(cls, filename: str) -> str:
        """Get MIME type for filename"""
        ext = Path(filename).suffix.lstrip('.').lower()
        return cls.SUPPORTED_EXTENSIONS.get(ext, mimetypes.guess_type(filename)[0] or 'application/octet-stream')

    @classmethod
    def process_file(cls, filepath: str, filename: str = None) -> Dict:
        """
        Process a file and extract its content

        Returns:
            Dict with keys:
                - success: bool
                - content: str (extracted text)
                - error: str (if failed)
                - pages: int (for PDFs)
                - word_count: int
        """
        if not os.path.exists(filepath):
            return {
                'success': False,
                'error': 'File not found',
                'content': ''
            }

        if filename is None:
            filename = os.path.basename(filepath)

        ext = Path(filename).suffix.lstrip('.').lower()

        try:
            # Route to appropriate processor
            if ext == 'pdf':
                result = cls._process_pdf(filepath)
            elif ext in ['docx', 'doc']:
                result = cls._process_docx(filepath)
            elif ext in ['xlsx', 'xls']:
                result = cls._process_excel(filepath)
            elif ext in ['txt', 'md']:
                result = cls._process_text(filepath)
            elif ext in ['png', 'jpg', 'jpeg']:
                result = cls._process_image(filepath)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported file type: {ext}',
                    'content': ''
                }

            # Add word count
            if result.get('success') and result.get('content'):
                result['word_count'] = len(result['content'].split())

            return result

        except Exception as e:
            return {
                'success': False,
                'error': f'Error processing file: {str(e)}',
                'content': ''
            }

    @classmethod
    def _process_pdf(cls, filepath: str) -> Dict:
        """Extract text from PDF file"""
        if not PDF_AVAILABLE:
            return {
                'success': False,
                'error': 'PyPDF2 not installed. Install with: pip install pypdf2',
                'content': ''
            }

        try:
            reader = PdfReader(filepath)
            pages = len(reader.pages)

            text_parts = []
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                if text.strip():
                    text_parts.append(f"--- Page {page_num} ---\n{text}\n")

            content = '\n'.join(text_parts)

            return {
                'success': True,
                'content': content,
                'pages': pages
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'PDF processing error: {str(e)}',
                'content': ''
            }

    @classmethod
    def _process_docx(cls, filepath: str) -> Dict:
        """Extract text from Word document"""
        if not DOCX_AVAILABLE:
            return {
                'success': False,
                'error': 'python-docx not installed. Install with: pip install python-docx',
                'content': ''
            }

        try:
            doc = Document(filepath)

            # Extract paragraphs
            paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]

            # Extract tables
            table_texts = []
            for table in doc.tables:
                for row in table.rows:
                    row_text = ' | '.join(cell.text for cell in row.cells)
                    table_texts.append(row_text)

            content = '\n\n'.join(paragraphs)
            if table_texts:
                content += '\n\n--- Tables ---\n' + '\n'.join(table_texts)

            return {
                'success': True,
                'content': content
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Word document processing error: {str(e)}',
                'content': ''
            }

    @classmethod
    def _process_excel(cls, filepath: str) -> Dict:
        """Extract data from Excel file"""
        if not EXCEL_AVAILABLE:
            return {
                'success': False,
                'error': 'openpyxl not installed. Install with: pip install openpyxl',
                'content': ''
            }

        try:
            workbook = load_workbook(filepath, read_only=True, data_only=True)

            content_parts = []

            for sheet_name in workbook.sheetnames:
                sheet = workbook[sheet_name]
                content_parts.append(f"--- Sheet: {sheet_name} ---")

                rows = []
                for row in sheet.iter_rows(values_only=True):
                    # Skip empty rows
                    if any(cell is not None for cell in row):
                        row_text = ' | '.join(str(cell) if cell is not None else '' for cell in row)
                        rows.append(row_text)

                content_parts.append('\n'.join(rows))

            content = '\n\n'.join(content_parts)

            return {
                'success': True,
                'content': content,
                'sheets': len(workbook.sheetnames)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Excel processing error: {str(e)}',
                'content': ''
            }

    @classmethod
    def _process_text(cls, filepath: str) -> Dict:
        """Read plain text file"""
        try:
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'cp1252']

            for encoding in encodings:
                try:
                    with open(filepath, 'r', encoding=encoding) as f:
                        content = f.read()

                    return {
                        'success': True,
                        'content': content
                    }
                except UnicodeDecodeError:
                    continue

            return {
                'success': False,
                'error': 'Could not decode text file with any supported encoding',
                'content': ''
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Text file processing error: {str(e)}',
                'content': ''
            }

    @classmethod
    def _process_image(cls, filepath: str) -> Dict:
        """Extract text from image using OCR"""
        if not OCR_AVAILABLE:
            return {
                'success': False,
                'error': 'PIL/pytesseract not installed. Install with: pip install pillow pytesseract',
                'content': ''
            }

        try:
            image = Image.open(filepath)

            # Perform OCR
            text = pytesseract.image_to_string(image)

            if not text.strip():
                return {
                    'success': True,
                    'content': '[No text detected in image]',
                    'warning': 'OCR found no text'
                }

            return {
                'success': True,
                'content': text,
                'ocr': True
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Image OCR error: {str(e)}',
                'content': ''
            }

    @classmethod
    def get_file_summary(cls, result: Dict, filename: str) -> str:
        """Generate a human-readable summary of processed file"""
        if not result.get('success'):
            return f"Error: Failed to process {filename}: {result.get('error')}"

        content = result.get('content', '')
        word_count = result.get('word_count', 0)

        summary_parts = [f"File: {filename}"]

        if result.get('pages'):
            summary_parts.append(f"{result['pages']} pages")

        if result.get('sheets'):
            summary_parts.append(f"{result['sheets']} sheets")

        if word_count:
            summary_parts.append(f"{word_count:,} words")

        if result.get('ocr'):
            summary_parts.append("(OCR)")

        summary = ' - '.join(summary_parts)

        # Add preview
        preview_length = 200
        if len(content) > preview_length:
            preview = content[:preview_length].strip() + '...'
        else:
            preview = content.strip()

        return f"{summary}\n\nPreview:\n{preview}"


# Convenience function
def process_file(filepath: str, filename: str = None) -> Dict:
    """Process a file and return extracted content"""
    return FileProcessor.process_file(filepath, filename)
