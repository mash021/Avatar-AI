import os
import uuid

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://avatar:avatar_dev_password@localhost:5433/avatar_db",
)
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-pytest")
os.environ.setdefault("CELERY_TASK_ALWAYS_EAGER", "true")

from app.db.session import SessionLocal
from app.main import app
from app.models.document import Document
from app.models.ingestion_job import IngestionJob
from app.models.user import User
from app.models.website_url import WebsiteUrl
from app.services.auth_service import create_user


@pytest.fixture(autouse=True)
def mock_embeddings(monkeypatch):
    def fake_embed(texts):
        return [[0.01] * 1536 for _ in texts]

    monkeypatch.setattr("app.services.embedding_service.embed_texts", fake_embed)
    monkeypatch.setattr("app.services.rag_service.embed_texts", fake_embed)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def admin_credentials() -> dict[str, str]:
    uid = uuid.uuid4().hex[:8]
    return {
        "email": f"admin-{uid}@test.com",
        "password": "testpass123",
        "full_name": "Test Admin",
    }


@pytest.fixture
def admin_user(db, admin_credentials):
    user = create_user(
        db,
        email=admin_credentials["email"],
        password=admin_credentials["password"],
        full_name=admin_credentials["full_name"],
    )
    yield user
    from app.models.knowledge_chunk import KnowledgeChunk

    doc_ids = [row[0] for row in db.query(Document.id).filter(Document.uploaded_by == user.id).all()]
    if doc_ids:
        db.query(KnowledgeChunk).filter(KnowledgeChunk.source_id.in_(doc_ids)).delete(
            synchronize_session=False
        )
        db.query(IngestionJob).filter(IngestionJob.source_id.in_(doc_ids)).delete(
            synchronize_session=False
        )
    from app.models.response_override import ResponseOverride

    db.query(ResponseOverride).filter(ResponseOverride.created_by == user.id).delete()
    db.query(Document).filter(Document.uploaded_by == user.id).delete()
    db.query(WebsiteUrl).filter(WebsiteUrl.created_by == user.id).delete()
    db.query(User).filter(User.id == user.id).delete()
    db.commit()


@pytest.fixture
def auth_headers(client, admin_credentials, admin_user) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": admin_credentials["email"],
            "password": admin_credentials["password"],
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
