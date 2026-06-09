import uuid

from app.db.session import SessionLocal
from app.models.chat import ChatMessage, ChatSession, MessageRole
from app.services.chat_service import process_chat_message


def _create_session_with_messages():
    db = SessionLocal()
    try:
        session, _, _ = process_chat_message(
            db,
            message="What are your business hours?",
            session_id=None,
            language="en",
        )
        return session.id
    finally:
        db.close()


def test_list_chat_logs_requires_auth(client):
    response = client.get("/api/v1/admin/chat-logs")
    assert response.status_code == 403


def test_list_chat_logs(client, auth_headers):
    session_id = _create_session_with_messages()

    response = client.get("/api/v1/admin/chat-logs", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(item["id"] == str(session_id) for item in data)


def test_get_chat_session_detail(client, auth_headers):
    session_id = _create_session_with_messages()

    response = client.get(
        f"/api/v1/admin/chat-logs/{session_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(session_id)
    assert len(data["messages"]) >= 2
    roles = {msg["role"] for msg in data["messages"]}
    assert "user" in roles
    assert "assistant" in roles


def test_get_chat_session_not_found(client, auth_headers):
    response = client.get(
        f"/api/v1/admin/chat-logs/{uuid.uuid4()}",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_public_get_session(client):
    db = SessionLocal()
    try:
        session = ChatSession(session_token="test-token-" + uuid.uuid4().hex[:8], language="en")
        db.add(session)
        db.commit()
        db.refresh(session)

        db.add(
            ChatMessage(
                session_id=session.id,
                role=MessageRole.user,
                content="Hello",
                language="en",
            )
        )
        db.commit()
        session_id = session.id
    finally:
        db.close()

    response = client.get(f"/api/v1/chat/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(session_id)
    assert len(data["messages"]) == 1
