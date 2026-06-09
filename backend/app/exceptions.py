class OpenAIConfigurationError(Exception):
    """Raised when OpenAI API key is missing or invalid for configuration."""


class OpenAIServiceError(Exception):
    """Raised when OpenAI API call fails at runtime."""
