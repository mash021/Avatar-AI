from app.services import avatar_service


def _enable_mock_avatar(db):
    row = avatar_service.get_or_create_avatar_config(db)
    row.provider = "mock"
    row.is_enabled = True
    row.provider_config = {"avatar_id": "default"}
    db.commit()
    db.refresh(row)
    return row


def test_public_avatar_config_disabled(client, db):
    row = avatar_service.get_or_create_avatar_config(db)
    row.is_enabled = False
    db.commit()

    response = client.get("/api/v1/avatar/config")
    assert response.status_code == 200
    data = response.json()
    assert data["is_enabled"] is False


def test_create_avatar_session(client, db):
    avatar_service.clear_runtime_sessions()
    _enable_mock_avatar(db)

    response = client.post("/api/v1/avatar/session", json={"language": "en"})
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"]
    assert data["provider"] == "mock"
    assert data["is_enabled"] is True


def test_avatar_speak_with_mock(client, db, monkeypatch):
    avatar_service.clear_runtime_sessions()
    _enable_mock_avatar(db)

    def fake_synthesize(text, language="auto", voice_id=None, provider=None):
        from app.providers.tts.base import SynthesisResult

        return SynthesisResult(
            audio_bytes=b"mock-audio-bytes",
            content_type="audio/mpeg",
            cache_hit=False,
        )

    monkeypatch.setattr("app.services.avatar_service.synthesize_speech", fake_synthesize)

    session = client.post("/api/v1/avatar/session", json={"language": "en"}).json()

    response = client.post(
        "/api/v1/avatar/speak",
        json={
            "session_id": session["session_id"],
            "text": "Our business hours are 9 to 5.",
            "language": "en",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_audio"] is True
    assert data["status"] == "completed"


def test_avatar_speak_audio_endpoint(client, db, monkeypatch):
    avatar_service.clear_runtime_sessions()
    _enable_mock_avatar(db)
    monkeypatch.setattr(
        "app.services.avatar_service.synthesize_speech",
        lambda *args, **kwargs: type(
            "R",
            (),
            {"audio_bytes": b"mp3-bytes", "content_type": "audio/mpeg", "cache_hit": False},
        )(),
    )

    session = client.post("/api/v1/avatar/session", json={"language": "en"}).json()
    response = client.post(
        "/api/v1/avatar/speak/audio",
        json={
            "session_id": session["session_id"],
            "text": "Hello from avatar",
            "language": "en",
        },
    )
    assert response.status_code == 200
    assert response.content == b"mp3-bytes"


def test_admin_get_avatar_config(client, auth_headers, db):
    _enable_mock_avatar(db)
    response = client.get("/api/v1/admin/avatar/config", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["is_enabled"] is True


def test_admin_update_avatar_config(client, auth_headers, db):
    response = client.put(
        "/api/v1/admin/avatar/config",
        headers=auth_headers,
        json={
            "provider": "mock",
            "is_enabled": True,
            "provider_config": {
                "avatar_id": "presenter-1",
                "api_key": "secret-key",
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_enabled"] is True
    assert data["provider_config"]["api_key"] == "***"
    assert data["has_api_key"] is True


def test_admin_update_did_rejected(client, auth_headers):
    response = client.put(
        "/api/v1/admin/avatar/config",
        headers=auth_headers,
        json={"provider": "d-id", "is_enabled": True, "provider_config": {}},
    )
    assert response.status_code == 400


def test_did_provider_not_implemented():
    from app.providers.avatar.did_provider import DIDAvatarProvider

    provider = DIDAvatarProvider()
    try:
        provider.create_session({})
        assert False, "expected NotImplementedError"
    except NotImplementedError:
        pass
