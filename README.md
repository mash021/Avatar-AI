# Avatar-AI

Bilingual (Arabic/English) AI avatar web application with RAG-grounded answers from company website content and uploaded documents.

## Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Node.js 20+

## Quick Start

```bash
# Start infrastructure and prepare dependencies
./scripts/dev.sh

# Terminal 1 — Backend
cd backend
../backend/.venv/bin/uvicorn app.main:app --reload --port 8000

# Terminal 2 — Celery Worker (required for document/URL ingestion)
cd backend
../backend/.venv/bin/celery -A app.workers.celery_app worker --loglevel=info

# Terminal 3 — Frontend
cd frontend
npm run dev
```

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/api/v1/health |

## Environment Variables

Copy example files before running:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

## Default Admin Credentials

After running `./scripts/dev.sh`, a default admin is seeded:

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `admin123` |

Login at http://localhost:3000/admin/login

## Running Tests

```bash
# Backend
cd backend
../backend/.venv/bin/pytest

# Frontend
cd frontend
npm test
```

### Test Coverage

The backend ships with a pytest suite covering the core services and API endpoints:

| Area | Test file |
|------|-----------|
| Auth (login, password hashing) | `test_auth.py` |
| Health check | `test_health.py` |
| Database connectivity | `test_database.py` |
| Language detection | `test_language_service.py` |
| Text cleaning | `test_text_cleaning.py` |
| Chunking | `test_chunking.py` |
| Document/URL parsers | `test_parsers.py` |
| Web scraper | `test_scraper.py` |
| Ingestion pipeline | `test_ingestion.py` |
| RAG retrieval & answers | `test_rag.py` |
| Embedding service (init + idempotency) | `test_embedding_service.py` |
| Chat service (sessions, persistence, language) | `test_chat_service.py` |
| KB version counter | `test_kb_version_service.py` |
| Response overrides | `test_overrides.py` |
| Avatar config | `test_avatar.py` |
| Voice (STT/TTS) | `test_voice.py` |
| Admin: documents / URLs / chat logs | `test_admin_*.py` |

Tests mock OpenAI embeddings and LLM calls (see `tests/conftest.py`), so most run
without an `OPENAI_API_KEY`. A few endpoint tests that exercise a live LLM call
require a valid key to be set in `backend/.env`.

## Project Structure

```
freelancer/
├── backend/          # FastAPI Python API
├── frontend/         # Next.js TypeScript UI
├── scripts/          # Dev helper scripts
├── docker-compose.yml
└── PROJECT_PLAN.md   # Living project plan
```

## Development Phases

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the full phased roadmap.

| Phase | Status |
|-------|--------|
| 0 — Planning | Complete |
| 1 — Foundation | Complete |
| 2 — Admin Dashboard | Complete |
| 3 — Data Ingestion | Complete |
| 4 — RAG Knowledge Base | Complete |
| 5 — Chat Interface | Complete |
| 6 — Voice Support | Complete |
| 7 — Avatar Integration | Complete |
| 8 — Embed & Screen Mode | Next |
