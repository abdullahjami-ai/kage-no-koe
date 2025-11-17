from typing import List, Dict, Optional
from backend.database import Database

class ContextManager:
    """
    Manages context windows for chat conversations
    - Handles token limits
    - Maintains conversation history
    - Integrates file content into context
    """

    def __init__(self, db: Database, max_tokens: int = 4096):
        self.db = db
        self.max_tokens = max_tokens
        self.avg_chars_per_token = 4  # Rough estimate: 1 token H 4 chars

    def estimate_tokens(self, text: str) -> int:
        """Estimate token count from text length"""
        return len(text) // self.avg_chars_per_token

    def get_chat_context(self, chat_id: int, include_files: bool = True) -> List[Dict]:
        """
        Build context for a chat conversation

        Args:
            chat_id: Chat ID
            include_files: Whether to include file contents in context

        Returns:
            List of message dicts ready for Ollama
        """
        messages = []
        total_tokens = 0

        # 1. Get chat metadata
        chat = self.db.get_chat(chat_id)
        if not chat:
            return messages

        # 2. Add system message if exists
        if chat.get('system_message'):
            system_msg = {
                "role": "system",
                "content": chat['system_message']
            }
            messages.append(system_msg)
            total_tokens += self.estimate_tokens(chat['system_message'])

        # 3. Add file context if requested
        if include_files:
            files = self.db.get_files(chat_id)
            if files:
                file_context = self._build_file_context(files)
                if file_context:
                    messages.append({
                        "role": "system",
                        "content": file_context
                    })
                    total_tokens += self.estimate_tokens(file_context)

        # 4. Get conversation history
        chat_messages = self.db.get_messages(chat_id)

        # 5. Trim messages to fit token limit (keep recent messages)
        trimmed_messages = self._trim_messages(
            chat_messages,
            self.max_tokens - total_tokens
        )

        # 6. Convert to Ollama format
        for msg in trimmed_messages:
            messages.append({
                "role": msg['role'],
                "content": msg['content']
            })

        return messages

    def _build_file_context(self, files: List[Dict]) -> Optional[str]:
        """Build context string from uploaded files"""
        if not files:
            return None

        file_contents = []
        for file in files:
            if file.get('processed_content'):
                file_contents.append(
                    f"--- File: {file['filename']} ---\n"
                    f"{file['processed_content']}\n"
                )

        if not file_contents:
            return None

        context = (
            "The following files have been uploaded for reference:\n\n"
            + "\n".join(file_contents)
        )

        return context

    def _trim_messages(self, messages: List[Dict], available_tokens: int) -> List[Dict]:
        """
        Trim messages to fit within token budget
        Keep most recent messages
        """
        if not messages:
            return []

        trimmed = []
        tokens_used = 0

        # Iterate from most recent to oldest
        for msg in reversed(messages):
            msg_tokens = self.estimate_tokens(msg['content'])

            if tokens_used + msg_tokens > available_tokens:
                break

            trimmed.insert(0, msg)  # Add to beginning to maintain order
            tokens_used += msg_tokens

        return trimmed

    def add_message_with_context(self, chat_id: int, user_message: str,
                                  ai_response: str, model_used: str) -> None:
        """
        Add both user message and AI response to database
        Updates context window
        """
        # Add user message
        self.db.add_message(
            chat_id=chat_id,
            role="user",
            content=user_message,
            model_used=model_used
        )

        # Add assistant response
        self.db.add_message(
            chat_id=chat_id,
            role="assistant",
            content=ai_response,
            model_used=model_used
        )

    def get_context_summary(self, chat_id: int) -> Dict:
        """Get summary of current context usage"""
        messages = self.db.get_messages(chat_id)
        files = self.db.get_files(chat_id)

        total_tokens = 0
        for msg in messages:
            total_tokens += self.estimate_tokens(msg['content'])

        for file in files:
            if file.get('processed_content'):
                total_tokens += self.estimate_tokens(file['processed_content'])

        return {
            'total_messages': len(messages),
            'total_files': len(files),
            'estimated_tokens': total_tokens,
            'max_tokens': self.max_tokens,
            'utilization_percent': (total_tokens / self.max_tokens) * 100
        }


# Test the context manager
if __name__ == '__main__':
    from backend.database import Database

    print("=== Testing Context Manager ===\n")

    db = Database()
    cm = ContextManager(db)

    # Create test chat
    chat_id = db.create_chat(
        title="Test Context",
        model_name="llama3.2:1b",
        system_message="You are a helpful assistant."
    )

    # Add messages
    db.add_message(chat_id, "user", "What is Python?")
    db.add_message(chat_id, "assistant", "Python is a programming language.")
    db.add_message(chat_id, "user", "Tell me more")

    # Get context
    context = cm.get_chat_context(chat_id)

    print("Context messages:")
    for msg in context:
        print(f"  {msg['role']}: {msg['content'][:50]}...")

    # Get summary
    summary = cm.get_context_summary(chat_id)
    print(f"\nContext Summary:")
    print(f"  Messages: {summary['total_messages']}")
    print(f"  Tokens: {summary['estimated_tokens']}/{summary['max_tokens']}")
    print(f"  Utilization: {summary['utilization_percent']:.1f}%")

    # Cleanup
    db.delete_chat(chat_id)

    print("\n=== Context Manager Test Complete ===")
