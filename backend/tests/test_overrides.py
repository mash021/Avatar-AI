import uuid

from app.db.session import SessionLocal
from app.models.chat import ChatMessage, ChatSession, MessageRole
from app.models.response_override import ResponseOverride
from app.services.rag_service import _get_relevant_overrides


def _create_assistant_message(content: str = "Wrong answer about pricing") -> uuid.UUID:
    db = SessionLocal()
    try:
        session = ChatSession(session_token="override-" + uuid.uuid4().hex[:8], language="en")
        db.add(session)
        db.commit()
        db.refresh(session)

        message = ChatMessage(
            session_id=session.id,
            role=MessageRole.assistant,
            content=content,
            language="en",
            had_context=True,
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return message.id
    finally:
        db.close()


def test_create_override(client, auth_headers):
    message_id = _create_assistant_message()

    response = client.post(
        "/api/v1/admin/overrides",
        headers=auth_headers,
        json={
            "original_message_id": str(message_id),
            "improved_content": "Our pricing starts at 500 dollars for Widget Pro.",
            "notes": "pricing widget",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["original_message_id"] == str(message_id)
    assert "500 dollars" in data["improved_content"]
    assert data["is_active"] is True


def test_list_overrides(client, auth_headers):
    message_id = _create_assistant_message()

    client.post(
        "/api/v1/admin/overrides",
        headers=auth_headers,
        json={
            "original_message_id": str(message_id),
            "improved_content": "Corrected answer about enterprise support plans.",
            "notes": "support",
        },
    )

    response = client.get("/api/v1/admin/overrides", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_create_override_invalid_message(client, auth_headers):
    response = client.post(
        "/api/v1/admin/overrides",
        headers=auth_headers,
        json={
            "original_message_id": str(uuid.uuid4()),
            "improved_content": "This override has no linked message.",
        },
    )
    assert response.status_code == 404


def test_relevant_overrides_keyword_match():
    db = SessionLocal()
    try:
        message_id = _create_assistant_message()
        override = ResponseOverride(
            original_message_id=message_id,
            improved_content="Enterprise pricing for Widget Pro starts at 500 dollars.",
            notes="pricing",
            is_active=True,
        )
        db.add(override)
        db.commit()

        matches = _get_relevant_overrides(db, "What is the pricing for Widget Pro?")
        assert len(matches) >= 1
        assert "500 dollars" in matches[0]
    finally:
        db.close()
