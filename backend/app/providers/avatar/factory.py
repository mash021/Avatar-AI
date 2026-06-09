from app.providers.avatar.base import AvatarProvider
from app.providers.avatar.did_provider import DIDAvatarProvider
from app.providers.avatar.heygen_provider import HeyGenAvatarProvider
from app.providers.avatar.mock_provider import MockAvatarProvider

_PROVIDERS: dict[str, AvatarProvider] = {
    "mock": MockAvatarProvider(),
    "heygen": HeyGenAvatarProvider(),
    "d-id": DIDAvatarProvider(),
}


def get_avatar_provider(provider_name: str) -> AvatarProvider:
    return _PROVIDERS.get(provider_name, _PROVIDERS["mock"])
