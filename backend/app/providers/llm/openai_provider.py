from openai import APIConnectionError, AuthenticationError, OpenAI, OpenAIError, RateLimitError

from app.config import get_settings
from app.exceptions import OpenAIConfigurationError, OpenAIServiceError
from app.providers.llm.base import LLMProvider

settings = get_settings()


class OpenAILLMProvider(LLMProvider):
    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or settings.openai_api_key
        if not key.strip():
            raise OpenAIConfigurationError(
                "OPENAI_API_KEY is not configured. Add your API key to backend/.env"
            )
        self._client = OpenAI(api_key=key)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = self._client.chat.completions.create(
                model=settings.openai_chat_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
            )
        except AuthenticationError as exc:
            raise OpenAIConfigurationError(
                "OPENAI_API_KEY is invalid. Check your API key in backend/.env"
            ) from exc
        except RateLimitError as exc:
            if "insufficient_quota" in str(exc).lower():
                raise OpenAIServiceError(
                    "OpenAI account has no remaining quota. Add billing/credits at platform.openai.com"
                ) from exc
            raise OpenAIServiceError("OpenAI rate limit reached. Please try again later.") from exc
        except (APIConnectionError, OpenAIError) as exc:
            raise OpenAIServiceError("Unable to reach OpenAI chat service") from exc
        return response.choices[0].message.content or ""
