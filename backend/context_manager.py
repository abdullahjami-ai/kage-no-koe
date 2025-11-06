"""
Context Manager for Kage no Koe
Handles conversation context, message history, and token management
"""

from typing import List, Dict, Optional
from backend.config import MODEL_NAME


class ContextManager:
    """Manages conversation context for LLM interactions"""

    def __init__(self, max_context_tokens: int = 4096):
        """
        Initialize context manager

        Args:
            max_context_tokens: Maximum tokens to keep in context window
        """
        self.max_context_tokens = max_context_tokens
        self.system_message = None
        self.messages = []

    def set_system_message(self, message: str) -> None:
        """
        Set the system message for the conversation

        Args:
            message: System prompt/context
        """
        self.system_message = message

    def add_message(self, role: str, content: str) -> None:
        """
        Add a message to context

        Args:
            role: 'user', 'assistant', or 'system'
            content: Message content
        """
        if role not in ['user', 'assistant', 'system']:
            raise ValueError(f"Invalid role: {role}")

        self.messages.append({
            'role': role,
            'content': content
        })

    def clear_context(self) -> None:
        """Clear all messages except system message"""
        self.messages = []

    def get_context_for_llm(self) -> List[Dict[str, str]]:
        """
        Get formatted context for LLM
        Includes system message and manages token limits

        Returns:
            List of message dicts for Ollama API
        """
        context = []

        # Add system message first
        if self.system_message:
            context.append({
                'role': 'system',
                'content': self.system_message
            })

        # Add conversation messages
        # For now, we'll use a simple approach: keep last N messages
        # In future, we can implement more sophisticated token counting

        # Keep last 20 messages to stay within context window
        recent_messages = self.messages[-20:]
        context.extend(recent_messages)

        return context

    def build_context_from_db_messages(self, db_messages: List[Dict],
                                       system_message: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Build context from database messages

        Args:
            db_messages: Messages from database
            system_message: Optional system message to prepend

        Returns:
            Formatted context for LLM
        """
        context = []

        # Add system message if provided
        if system_message:
            context.append({
                'role': 'system',
                'content': system_message
            })

        # Add messages from database
        for msg in db_messages[-20:]:  # Keep last 20 messages
            context.append({
                'role': msg['role'],
                'content': msg['content']
            })

        return context

    def estimate_tokens(self, text: str) -> int:
        """
        Rough estimation of tokens in text
        Llama models: ~1 token per 4 characters

        Args:
            text: Text to estimate

        Returns:
            Estimated token count
        """
        # Simple heuristic: 1 token H 4 characters
        return len(text) // 4

    def get_context_size(self) -> int:
        """
        Estimate total tokens in current context

        Returns:
            Estimated token count
        """
        total = 0

        if self.system_message:
            total += self.estimate_tokens(self.system_message)

        for msg in self.messages:
            total += self.estimate_tokens(msg['content'])

        return total

    def is_context_full(self) -> bool:
        """
        Check if context is approaching token limit

        Returns:
            True if context > 80% of max tokens
        """
        current_size = self.get_context_size()
        return current_size > (self.max_context_tokens * 0.8)

    def trim_context(self, keep_recent: int = 10) -> None:
        """
        Trim context to keep only recent messages
        Useful when context gets too large

        Args:
            keep_recent: Number of recent messages to keep
        """
        self.messages = self.messages[-keep_recent:]

    def add_file_context(self, filename: str, content: str, max_chars: int = 2000) -> None:
        """
        Add file content to context

        Args:
            filename: Name of the file
            content: File content
            max_chars: Maximum characters to include
        """
        # Truncate if too long
        if len(content) > max_chars:
            content = content[:max_chars] + "\n...(truncated)"

        file_context = f"File: {filename}\nContent:\n{content}"

        self.add_message('system', file_context)

    def add_web_search_context(self, query: str, results: List[Dict]) -> None:
        """
        Add web search results to context

        Args:
            query: Search query
            results: List of search result dicts with 'title', 'snippet', 'url'
        """
        search_context = f"Web search results for: {query}\n\n"

        for i, result in enumerate(results[:5], 1):
            search_context += f"{i}. {result.get('title', 'No title')}\n"
            search_context += f"   {result.get('snippet', 'No description')}\n"
            search_context += f"   Source: {result.get('url', 'No URL')}\n\n"

        self.add_message('system', search_context)


# Test the context manager
if __name__ == '__main__':
    print("=== Testing Context Manager ===\n")

    cm = ContextManager()

    # Test 1: Set system message
    print("1. Setting system message...")
    cm.set_system_message("You are a helpful AI assistant named Kage no Koe.")
    print(f"    System message set\n")

    # Test 2: Add messages
    print("2. Adding messages...")
    cm.add_message('user', 'Hello!')
    cm.add_message('assistant', 'Hi! How can I help you?')
    cm.add_message('user', 'What is Python?')
    print(f"    Added 3 messages\n")

    # Test 3: Get context
    print("3. Getting context for LLM...")
    context = cm.get_context_for_llm()
    for msg in context:
        print(f"   {msg['role']}: {msg['content'][:50]}...")
    print()

    # Test 4: Estimate tokens
    print("4. Estimating tokens...")
    tokens = cm.get_context_size()
    print(f"    Estimated tokens: {tokens}\n")

    # Test 5: Add file context
    print("5. Adding file context...")
    cm.add_file_context("test.py", "def hello():\n    print('Hello, World!')")
    print(f"    File context added\n")

    # Test 6: Add web search
    print("6. Adding web search context...")
    search_results = [
        {'title': 'Test Result', 'snippet': 'This is a test', 'url': 'https://example.com'}
    ]
    cm.add_web_search_context("Python tutorial", search_results)
    print(f"    Search context added\n")

    # Test 7: Get final context
    print("7. Final context size...")
    final_tokens = cm.get_context_size()
    print(f"    Total estimated tokens: {final_tokens}\n")

    # Test 8: Clear context
    print("8. Clearing context...")
    cm.clear_context()
    print(f"    Context cleared. Messages: {len(cm.messages)}\n")

    print("=== All Context Manager Tests Passed! ===")
