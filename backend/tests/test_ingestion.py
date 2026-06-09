import io
import fitz

from app.db.session import SessionLocal
from app.models.document import Document, DocumentStatus
from app.models.ingestion_job import IngestionJob, JobStatus, SourceType
from app.models.knowledge_chunk import ChunkSourceType, KnowledgeChunk
def _create_pdf_bytes() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Knowledge base test content for document ingestion phase three.")
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_document_ingestion_pipeline(client, auth_headers):
    files = {"file": ("pipeline.pdf", io.BytesIO(_create_pdf_bytes()), "application/pdf")}
    upload = client.post(
        "/api/v1/admin/documents",
        files=files,
        headers=auth_headers,
    )
    assert upload.status_code == 201
    data = upload.json()
    assert data["job_id"] is not None

    db = SessionLocal()
    try:
        job = db.query(IngestionJob).filter(IngestionJob.id == data["job_id"]).first()
        document = db.query(Document).filter(Document.id == data["id"]).first()
        assert job is not None
        assert document is not None

        assert job.status == JobStatus.completed
        assert document.status == DocumentStatus.indexed

        chunks = (
            db.query(KnowledgeChunk)
            .filter(
                KnowledgeChunk.source_type == ChunkSourceType.document,
                KnowledgeChunk.source_id == document.id,
            )
            .all()
        )
        assert len(chunks) >= 1
        assert "Knowledge base test content" in chunks[0].content
    finally:
        db.close()


def test_reindex_document_endpoint(client, auth_headers):
    upload = client.post(
        "/api/v1/admin/documents",
        files={"file": ("reindex.pdf", io.BytesIO(_create_pdf_bytes()), "application/pdf")},
        headers=auth_headers,
    )
    document_id = upload.json()["id"]

    response = client.post(
        f"/api/v1/admin/documents/{document_id}/reindex",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Document reindex queued"
    assert response.json()["job"]["status"] == "completed"
