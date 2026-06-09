import io

import fitz

from app.db.session import SessionLocal
from app.models.document import Document, DocumentStatus
from app.models.ingestion_job import IngestionJob, JobStatus
from app.models.knowledge_chunk import KnowledgeChunk


def _create_pdf_bytes() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Test PDF document with enough content for ingestion.")
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_list_documents(client, auth_headers):
    response = client.get("/api/v1/admin/documents", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_upload_pdf(client, auth_headers, admin_user):
    files = {"file": ("test.pdf", io.BytesIO(_create_pdf_bytes()), "application/pdf")}

    response = client.post(
        "/api/v1/admin/documents",
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "test.pdf"
    assert data["file_type"] == "pdf"
    assert data["job_id"] is not None

    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == data["id"]).first()
        job = db.query(IngestionJob).filter(IngestionJob.id == data["job_id"]).first()
        assert doc is not None
        assert job is not None
        assert job.status == JobStatus.completed
        assert doc.status == DocumentStatus.indexed

        chunks = db.query(KnowledgeChunk).filter(KnowledgeChunk.source_id == doc.id).all()
        assert len(chunks) >= 1
    finally:
        db.close()


def test_upload_invalid_type(client, auth_headers):
    files = {"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
    response = client.post(
        "/api/v1/admin/documents",
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_documents_require_auth(client):
    response = client.get("/api/v1/admin/documents")
    assert response.status_code == 403


def test_dashboard_stats(client, auth_headers):
    response = client.get("/api/v1/admin/dashboard/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_urls" in data
    assert "total_documents" in data
    assert "active_jobs" in data
