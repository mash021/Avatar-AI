# AI-Powered Interactive Avatar — Project Plan

> **Status:** Phase 4 — RAG Knowledge Base ✅ Complete  
> **Last updated:** 2026-06-09  
> **Owner:** Engineering team

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Main Goals](#main-goals)
3. [Non-Goals](#non-goals)
4. [Technical Assumptions](#technical-assumptions)
5. [Recommended Tech Stack](#recommended-tech-stack)
6. [Full Project Architecture](#full-project-architecture)
7. [Database Design](#database-design)
8. [Folder Structure](#folder-structure)
9. [API Route Plan](#api-route-plan)
10. [RAG Pipeline Design](#rag-pipeline-design)
11. [Caching Strategy](#caching-strategy)
12. [Admin Dashboard Features](#admin-dashboard-features)
13. [Frontend Features](#frontend-features)
14. [Avatar Integration Strategy](#avatar-integration-strategy)
15. [Security Considerations](#security-considerations)
16. [Deployment Plan](#deployment-plan)
17. [Phase-by-Phase Roadmap](#phase-by-phase-roadmap)
18. [Testing Strategy](#testing-strategy)
19. [Current Progress](#current-progress)
20. [Decisions Log](#decisions-log)
21. [Known Risks](#known-risks)
22. [Next Actions](#next-actions)

---

## Project Overview

Build a bilingual (Arabic/English) AI-powered interactive avatar web application that answers user questions **exclusively** from company-provided knowledge: scraped website URLs and uploaded documents (PDF, Word, Excel). The product must work as a standalone web app, an embeddable widget for external company websites, and a fullscreen interactive screen mode.

The MVP uses third-party avatar providers (HeyGen, D-ID, Tavus, or similar) rather than building a custom 3D avatar. Voice input/output and lip-sync are architected behind provider-agnostic abstractions so services can be swapped without rewriting core logic.

### Key User Personas

| Persona | Needs |
|---------|-------|
| **End user** | Ask questions in Arabic or English via text or voice; receive accurate, grounded answers |
| **Company admin** | Manage knowledge sources, monitor ingestion, review chat logs, refine responses |
| **Integrator** | Embed the avatar widget into an existing company website with minimal configuration |

---

## Main Goals

1. **Bilingual interaction** — Arabic and English reading, writing, and speaking with automatic language detection and optional manual toggle.
2. **Grounded answers only** — RAG over company data; explicit fallback when information is unavailable.
3. **Multi-source ingestion** — Web scraping + document upload (PDF, Word, Excel) into a searchable knowledge base.
4. **Admin control** — Dashboard to manage sources, monitor processing, review logs, and refine content.
5. **Embeddable delivery** — Widget and fullscreen modes for website embedding and interactive screens.
6. **Avatar-ready architecture** — Third-party avatar integration with STT/TTS/lip-sync abstractions.
7. **Source-aware answers** — Internal tracking of which chunks/sources informed each response (not necessarily shown to end users in MVP).

---

## Non-Goals

- No integration with internal company databases, ERP, CRM, booking systems, or private backend APIs in MVP.
- No custom 3D avatar built from scratch in MVP.
- No multi-tenant SaaS billing or subscription management in MVP.
- No real-time collaborative admin editing of knowledge base content.
- No offline mode or on-device LLM inference.
- No public-facing source citations in chat UI (internal only for MVP; may be added later).

---

## Technical Assumptions

| # | Assumption |
|---|------------|
| 1 | Company website URLs are publicly accessible or credentials will be provided separately (out of MVP scope). |
| 2 | OpenAI API (or compatible endpoint) is available for chat completions and embeddings. |
| 3 | Arabic content may be RTL; UI must support bidirectional layout. |
| 4 | Document sizes are reasonable for MVP (< 50 MB per file, < 500 pages per PDF). |
| 5 | Single-tenant deployment per company instance in MVP (one knowledge base per deployment). |
| 6 | Admin users are a small trusted group (< 10 users). |
| 7 | Avatar provider API keys and quotas are managed by the deploying organization. |
| 8 | PostgreSQL is available locally (Docker) and in production. |
| 9 | Scraped websites are primarily HTML; JavaScript-heavy SPAs may require Playwright (slower, higher cost). |
| 10 | Chat logs are stored for admin review; retention policy TBD per deployment. |

---

## Recommended Tech Stack

### Selected Stack

| Layer | Technology | Version Target |
|-------|-----------|----------------|
| **Frontend** | Next.js (App Router) | 15.x |
| **Frontend language** | TypeScript | 5.x |
| **UI** | Tailwind CSS + shadcn/ui | Latest stable |
| **Backend** | FastAPI (Python) | 3.11+ / 0.115+ |
| **ORM** | SQLAlchemy 2.x + Alembic | — |
| **Primary DB** | PostgreSQL | 16+ |
| **Vector search** | pgvector extension | 0.7+ |
| **Task queue** | Celery + Redis | — |
| **File storage** | Local filesystem (dev) / S3-compatible (prod) | — |
| **LLM** | OpenAI API (GPT-4o or GPT-4o-mini) | — |
| **Embeddings** | OpenAI `text-embedding-3-small` | — |
| **STT** | OpenAI Whisper API | — |
| **TTS** | OpenAI TTS API (with Azure Speech as fallback option) | — |
| **PDF parsing** | PyMuPDF (`fitz`) | — |
| **Word parsing** | `python-docx` | — |
| **Excel parsing** | `pandas` + `openpyxl` | — |
| **Web scraping** | BeautifulSoup4 (static) + Playwright (dynamic) | — |
| **Auth (admin)** | JWT + bcrypt (MVP); upgrade path to OAuth/SSO | — |
| **Containerization** | Docker + Docker Compose | — |

### Why This Stack

| Decision | Rationale |
|----------|-----------|
| **FastAPI backend** | Python ecosystem is strongest for document parsing, scraping, and RAG pipelines. FastAPI provides async I/O, automatic OpenAPI docs, and excellent performance for API-heavy workloads. |
| **Next.js frontend** | Server-side rendering, API routes for BFF patterns, excellent TypeScript support, and easy embeddable widget packaging. App Router enables clean layout separation for admin vs. public chat. |
| **PostgreSQL + pgvector** | Single database for relational data and vector search reduces operational complexity vs. running a separate vector DB. pgvector performs well at MVP scale (< 1M chunks). |
| **Celery + Redis** | Document ingestion and scraping are long-running; async job queue prevents blocking API requests and provides retry/status tracking. |
| **OpenAI for LLM + embeddings + voice** | Unified provider reduces integration surface in MVP. Whisper and TTS both support Arabic and English. |
| **Monorepo (frontend + backend folders)** | Keeps related code together without over-engineering; each service has its own dependencies and deploy artifact. |

### Alternatives Considered (Not Selected for MVP)

| Alternative | Why Not (MVP) |
|-------------|---------------|
| Node.js/Express backend | Weaker document parsing ecosystem; would require calling Python subprocesses anyway. |
| Pinecone / Qdrant | Additional service to operate; pgvector is sufficient at MVP scale. |
| Supabase full platform | Adds vendor lock-in; we only need pgvector capability. |
| LangChain | Useful but adds abstraction overhead; direct OpenAI + pgvector is simpler for MVP. |
| tRPC | Backend is Python; REST + OpenAPI is the natural contract. |

---

## Full Project Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Chat UI     │  │  Admin       │  │  Embed       │  │  Interactive    │ │
│  │  (Next.js)   │  │  Dashboard   │  │  Widget      │  │  Screen Mode    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
└─────────┼─────────────────┼─────────────────┼───────────────────┼─────────┘
          │                 │                 │                   │
          ▼                 ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (FastAPI)                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │ /chat   │ │ /admin  │ │ /ingest │ │ /voice  │ │ /avatar │ │ /health  │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └──────────┘ │
└───────┼───────────┼───────────┼───────────┼───────────┼───────────────────┘
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
┌───────────┐ ┌──────────┐ ┌──────────────────────────────────────────────┐
│ RAG       │ │ Auth     │ │           SERVICE LAYER                      │
│ Engine    │ │ Service  │ │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│           │ │          │ │  │ Scraper  │ │ Document │ │ Language     │  │
│ - Retrieve│ │          │ │  │ Service  │ │ Parser   │ │ Detector     │  │
│ - Generate│ │          │ │  └──────────┘ └──────────┘ └──────────────┘  │
│ - Fallback│ │          │ │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
└─────┬─────┘ └──────────┘ │  │ Chunker  │ │ Embedder │ │ Chat Logger  │  │
      │                    │  └──────────┘ └──────────┘ └──────────────┘  │
      │                    └──────────────────────────────────────────────┘
      ▼                                    │
┌──────────────────────────────────────────┼──────────────────────────────────┐
│              DATA LAYER                  │                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──┴───────────┐  ┌───────────────┐ │
│  │ PostgreSQL   │  │ pgvector     │  │ Redis        │  │ File Storage  │ │
│  │ (relational) │  │ (embeddings) │  │ (job queue)  │  │ (uploads)     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ OpenAI   │  │ OpenAI   │  │ OpenAI   │  │ Avatar   │  │ Azure Speech │ │
│  │ Chat API │  │ Embed API│  │ Whisper/ │  │ Provider │  │ (TTS backup) │ │
│  │          │  │          │  │ TTS      │  │ (HeyGen) │  │              │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow — Chat (Text)

```
User message
  → Language detection (auto or manual override)
  → Embed user query
  → Vector similarity search (pgvector, top-k chunks)
  → Relevance threshold check
      ├── Below threshold → Return "information not available" fallback
      └── Above threshold → Build prompt with retrieved context + system rules
          → OpenAI chat completion (language-matched response)
          → Log conversation + source chunk IDs
          → Return response to client
```

### Request Flow — Voice

```
User speaks (mic)
  → Browser MediaRecorder OR direct API upload
  → STT (Whisper) with language hint
  → Same RAG chat flow as text
  → TTS (OpenAI) in detected/selected language
  → Audio playback in UI
  → (Phase 7) Forward audio to avatar provider for lip-sync video stream
```

### Request Flow — Document Ingestion

```
Admin uploads file / adds URL
  → API stores metadata, enqueues Celery job
  → Worker: parse → clean → chunk → embed → store in pgvector
  → Update job status (pending → processing → completed / failed)
  → Admin dashboard polls or receives status update
```

---

## Database Design

### Entity Relationship Overview

```
users ──────────────< chat_sessions ──────────────< chat_messages
  │                                                    │
  │                                                    └──> message_sources >── knowledge_chunks
  │
  ├── manages ──> website_urls
  ├── manages ──> documents
  └── manages ──> knowledge_chunks (via ingestion)

website_urls ──> ingestion_jobs
documents    ──> ingestion_jobs
ingestion_jobs ──> knowledge_chunks

knowledge_chunks ──> chunk_embeddings (pgvector)
```

### Tables

#### `users` (admin accounts)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | |
| password_hash | VARCHAR(255) | bcrypt |
| full_name | VARCHAR(255) | |
| role | ENUM('admin', 'superadmin') | |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `website_urls`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| url | TEXT | Full URL |
| label | VARCHAR(255) | Admin-friendly name |
| scrape_depth | INT | default 1 (links to follow) |
| last_scraped_at | TIMESTAMPTZ | nullable |
| status | ENUM('active', 'inactive', 'error') | |
| created_by | UUID FK → users | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `documents`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| filename | VARCHAR(500) | Original filename |
| file_path | TEXT | Storage path |
| file_type | ENUM('pdf', 'docx', 'xlsx') | |
| file_size_bytes | BIGINT | |
| status | ENUM('uploaded', 'processing', 'indexed', 'failed') | |
| error_message | TEXT | nullable |
| page_count | INT | nullable |
| uploaded_by | UUID FK → users | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `ingestion_jobs`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| source_type | ENUM('url', 'document') | |
| source_id | UUID | FK to website_urls or documents |
| status | ENUM('queued', 'processing', 'completed', 'failed') | |
| progress_pct | INT | 0–100 |
| chunks_created | INT | default 0 |
| error_message | TEXT | nullable |
| started_at | TIMESTAMPTZ | nullable |
| completed_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | |

#### `knowledge_chunks`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| source_type | ENUM('url', 'document') | |
| source_id | UUID | |
| source_url | TEXT | nullable, for URL chunks |
| source_page | INT | nullable, for doc page/sheet |
| content | TEXT | Chunk text |
| content_hash | VARCHAR(64) | SHA-256 for dedup |
| token_count | INT | |
| language | VARCHAR(10) | 'ar', 'en', or 'mixed' |
| metadata | JSONB | title, headings, sheet name, etc. |
| is_active | BOOLEAN | soft delete / disable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `chunk_embeddings`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| chunk_id | UUID FK → knowledge_chunks UNIQUE | |
| embedding | VECTOR(1536) | OpenAI text-embedding-3-small |
| model | VARCHAR(100) | |
| created_at | TIMESTAMPTZ | |

**Index:** `CREATE INDEX ON chunk_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`

#### `chat_sessions`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| session_token | VARCHAR(64) UNIQUE | Anonymous session identifier |
| language | VARCHAR(10) | Last detected/selected language |
| user_agent | TEXT | nullable |
| ip_hash | VARCHAR(64) | hashed for privacy |
| started_at | TIMESTAMPTZ | |
| ended_at | TIMESTAMPTZ | nullable |

#### `chat_messages`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| session_id | UUID FK → chat_sessions | |
| role | ENUM('user', 'assistant', 'system') | |
| content | TEXT | |
| language | VARCHAR(10) | |
| had_context | BOOLEAN | Whether RAG found relevant chunks |
| fallback_used | BOOLEAN | Whether "not available" response was given |
| token_count | INT | nullable |
| created_at | TIMESTAMPTZ | |

#### `message_sources` (internal source tracking)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| message_id | UUID FK → chat_messages | |
| chunk_id | UUID FK → knowledge_chunks | |
| similarity_score | FLOAT | |
| rank | INT | Retrieval rank |

#### `response_overrides` (admin refinements)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| original_message_id | UUID FK → chat_messages | |
| improved_content | TEXT | Admin-edited better answer |
| notes | TEXT | nullable |
| created_by | UUID FK → users | |
| is_active | BOOLEAN | Injected into RAG context when relevant |
| created_at | TIMESTAMPTZ | |

#### `avatar_config` (singleton / per-deployment)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| provider | VARCHAR(50) | 'heygen', 'd-id', 'tavus', 'none' |
| provider_config | JSONB | API keys, avatar ID, voice ID |
| is_enabled | BOOLEAN | |
| updated_at | TIMESTAMPTZ | |

---

## Folder Structure

```
freelancer/
├── PROJECT_PLAN.md                 # This file — living project document
├── README.md                       # Quick start guide (Phase 1)
├── docker-compose.yml              # PostgreSQL, Redis, services (Phase 1)
├── .gitignore
│
├── backend/                        # FastAPI Python backend
│   ├── pyproject.toml              # Dependencies (Poetry or pip)
│   ├── requirements.txt            # Pip-compatible deps list
│   ├── alembic.ini
│   ├── .env.example
│   ├── Dockerfile
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry, CORS, routers
│   │   ├── config.py               # Settings via pydantic-settings
│   │   ├── dependencies.py         # DB session, auth deps
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py           # Aggregates all route modules
│   │   │   ├── health.py           # GET /health
│   │   │   ├── auth.py             # POST /auth/login, /auth/refresh
│   │   │   ├── chat.py             # POST /chat, GET /chat/sessions
│   │   │   ├── admin_urls.py       # CRUD /admin/urls
│   │   │   ├── admin_documents.py  # Upload, list /admin/documents
│   │   │   ├── admin_knowledge.py  # Manage chunks /admin/knowledge
│   │   │   ├── admin_chat_logs.py  # GET /admin/chat-logs
│   │   │   ├── admin_overrides.py  # Response refinements
│   │   │   ├── voice.py            # POST /voice/stt, /voice/tts
│   │   │   └── avatar.py           # POST /avatar/session, /avatar/stream
│   │   │
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── website_url.py
│   │   │   ├── document.py
│   │   │   ├── ingestion_job.py
│   │   │   ├── knowledge_chunk.py
│   │   │   ├── chat.py
│   │   │   └── avatar_config.py
│   │   │
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── chat.py
│   │   │   ├── document.py
│   │   │   ├── url.py
│   │   │   ├── knowledge.py
│   │   │   └── voice.py
│   │   │
│   │   ├── services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── chat_service.py
│   │   │   ├── rag_service.py
│   │   │   ├── language_service.py
│   │   │   ├── scraper_service.py
│   │   │   ├── parser/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── pdf_parser.py
│   │   │   │   ├── docx_parser.py
│   │   │   │   └── xlsx_parser.py
│   │   │   ├── chunking_service.py
│   │   │   ├── embedding_service.py
│   │   │   ├── ingestion_service.py
│   │   │   └── voice_service.py
│   │   │
│   │   ├── providers/              # External service abstractions
│   │   │   ├── __init__.py
│   │   │   ├── llm/
│   │   │   │   ├── base.py
│   │   │   │   └── openai_provider.py
│   │   │   ├── stt/
│   │   │   │   ├── base.py
│   │   │   │   └── openai_whisper.py
│   │   │   ├── tts/
│   │   │   │   ├── base.py
│   │   │   │   ├── openai_tts.py
│   │   │   │   └── azure_speech.py
│   │   │   └── avatar/
│   │   │       ├── base.py
│   │   │       ├── heygen.py
│   │   │       ├── did.py
│   │   │       └── tavus.py
│   │   │
│   │   ├── workers/                # Celery tasks
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py
│   │   │   ├── scrape_tasks.py
│   │   │   └── ingest_tasks.py
│   │   │
│   │   └── db/
│   │       ├── __init__.py
│   │       ├── session.py          # Engine, SessionLocal
│   │       └── migrations/         # Alembic versions
│   │
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_health.py
│       ├── test_rag.py
│       └── test_parsers.py
│
├── frontend/                       # Next.js TypeScript frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── .env.example
│   ├── Dockerfile
│   │
│   ├── public/
│   │   ├── embed.js                # Lightweight embed loader (Phase 8)
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout, fonts, RTL support
│   │   │   ├── page.tsx            # Landing / redirect to chat
│   │   │   ├── globals.css
│   │   │   │
│   │   │   ├── chat/
│   │   │   │   ├── page.tsx        # Public chat interface
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx      # Admin shell with sidebar
│   │   │   │   ├── page.tsx        # Dashboard overview
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── urls/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── documents/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── knowledge/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── chat-logs/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── embed/
│   │   │   │   └── page.tsx        # Embeddable widget page (Phase 8)
│   │   │   │
│   │   │   └── screen/
│   │   │       └── page.tsx        # Fullscreen interactive screen (Phase 8)
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui primitives
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── VoiceButton.tsx
│   │   │   │   ├── LanguageToggle.tsx
│   │   │   │   └── AvatarPanel.tsx
│   │   │   ├── admin/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── UrlManager.tsx
│   │   │   │   ├── DocumentUpload.tsx
│   │   │   │   ├── JobStatusBadge.tsx
│   │   │   │   ├── ChatLogTable.tsx
│   │   │   │   └── KnowledgeEditor.tsx
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       └── RTLWrapper.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts              # API client (fetch wrapper)
│   │   │   ├── auth.ts             # Token management
│   │   │   ├── i18n.ts             # Language utilities
│   │   │   └── utils.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   ├── useVoice.ts
│   │   │   ├── useLanguage.ts
│   │   │   └── useAvatar.ts
│   │   │
│   │   └── types/
│   │       ├── chat.ts
│   │       ├── admin.ts
│   │       └── api.ts
│   │
│   └── tests/
│       └── ...
│
└── scripts/
    ├── init-db.sh                  # Enable pgvector, run migrations
    ├── seed-admin.sh               # Create default admin user
    └── dev.sh                      # Start all services locally
```

---

## API Route Plan

Base URL: `http://localhost:8000/api/v1`

### Public Routes

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| GET | `/health` | Service health check | 1 |
| POST | `/chat` | Send message, receive RAG-grounded reply | 5 |
| POST | `/chat/sessions` | Create anonymous chat session | 5 |
| GET | `/chat/sessions/{id}` | Get session history | 5 |
| POST | `/voice/stt` | Speech-to-text (audio upload) | 6 |
| POST | `/voice/tts` | Text-to-speech (returns audio) | 6 |
| POST | `/avatar/session` | Initialize avatar streaming session | 7 |
| GET | `/avatar/stream/{id}` | Avatar video stream endpoint | 7 |

### Admin Routes (JWT required)

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| POST | `/auth/login` | Admin login, returns JWT | 2 |
| POST | `/auth/refresh` | Refresh JWT token | 2 |
| GET | `/admin/urls` | List website URLs | 2 |
| POST | `/admin/urls` | Add website URL | 2 |
| PUT | `/admin/urls/{id}` | Update URL config | 2 |
| DELETE | `/admin/urls/{id}` | Remove URL | 2 |
| POST | `/admin/urls/{id}/scrape` | Trigger re-scrape | 3 |
| GET | `/admin/documents` | List uploaded documents | 2 |
| POST | `/admin/documents` | Upload document (multipart) | 2 |
| DELETE | `/admin/documents/{id}` | Delete document + chunks | 2 |
| POST | `/admin/documents/{id}/reindex` | Re-process document | 3 |
| GET | `/admin/jobs` | List ingestion jobs + status | 2 |
| GET | `/admin/jobs/{id}` | Job detail + progress | 2 |
| GET | `/admin/knowledge` | Browse knowledge chunks | 4 |
| PUT | `/admin/knowledge/{id}` | Edit/disable chunk | 4 |
| DELETE | `/admin/knowledge/{id}` | Soft-delete chunk | 4 |
| GET | `/admin/chat-logs` | Paginated chat log review | 5 |
| GET | `/admin/chat-logs/{session_id}` | Full session transcript | 5 |
| POST | `/admin/overrides` | Create response refinement | 5 |
| GET | `/admin/overrides` | List overrides | 5 |
| PUT | `/admin/avatar/config` | Update avatar provider config | 7 |
| GET | `/admin/dashboard/stats` | Overview metrics | 2 |

### API Contract Examples

#### POST `/chat`

```json
// Request
{
  "session_id": "uuid-or-null",
  "message": "What are your business hours?",
  "language": "auto"  // "auto" | "ar" | "en"
}

// Response
{
  "session_id": "uuid",
  "message_id": "uuid",
  "reply": "Our business hours are...",
  "language": "en",
  "had_context": true,
  "fallback_used": false
}
```

#### POST `/admin/documents`

```
Content-Type: multipart/form-data
file: <binary>
```

```json
// Response
{
  "id": "uuid",
  "filename": "company-brochure.pdf",
  "file_type": "pdf",
  "status": "uploaded",
  "job_id": "uuid"
}
```

---

## RAG Pipeline Design

### Overview

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Source  │───>│  Parse   │───>│  Clean   │───>│  Chunk   │───>│  Embed   │
│  (URL/   │    │  Extract │    │  Normal- │    │  Split   │    │  Store   │
│   Doc)   │    │  Text    │    │  ize     │    │  Tokenize│    │  pgvector│
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Ingestion Pipeline (Indexing)

| Step | Detail |
|------|--------|
| **1. Parse** | Extract raw text per source type (HTML, PDF pages, DOCX paragraphs, XLSX sheets). |
| **2. Clean** | Strip boilerplate, normalize whitespace, detect language per section, remove duplicate content via `content_hash`. |
| **3. Chunk** | Split into overlapping chunks (see strategy below). Attach metadata (source URL, page number, heading hierarchy, sheet name). |
| **4. Embed** | Generate embeddings via OpenAI `text-embedding-3-small` (1536 dimensions). Batch requests (max 100 chunks per batch). |
| **5. Store** | Insert into `knowledge_chunks` + `chunk_embeddings`. Update `ingestion_jobs` status. |

### Chunking Strategy

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Target chunk size | 500 tokens | Balances context richness vs. retrieval precision |
| Overlap | 50 tokens | Preserves context across chunk boundaries |
| Splitter | Recursive character splitter | Respects paragraph/sentence boundaries |
| Arabic handling | Language-aware splitting | Avoid splitting mid-Arabic-word where possible |
| Metadata preserved | Title, H1–H3, page, URL, sheet name | Improves retrieval relevance and source tracking |

### Retrieval Pipeline (Query Time)

| Step | Detail |
|------|--------|
| **1. Language detect** | Detect query language (or use manual override). |
| **2. Query embed** | Embed user query with same model as indexing. |
| **3. Vector search** | Cosine similarity search in pgvector, `top_k = 8`. |
| **4. Threshold filter** | Discard chunks with similarity < 0.72 (tunable). |
| **5. Re-rank** | Optional: lightweight re-ranker or MMR for diversity. |
| **6. Override check** | Check `response_overrides` for admin-refined answers matching query. |
| **7. Context assembly** | Build prompt with top chunks, source metadata (internal), and language instruction. |
| **8. LLM generation** | GPT-4o-mini with strict system prompt (see below). |
| **9. Fallback** | If no chunks pass threshold → return localized "information not available" message. |
| **10. Log** | Store message, linked chunk IDs, scores in `message_sources`. |

### System Prompt (Core Rules)

```
You are a company assistant. Answer ONLY using the provided context.
- If the context does not contain enough information, respond with:
  EN: "I'm sorry, I don't have that information in our company knowledge base."
  AR: "عذراً، لا تتوفر لدي هذه المعلومات في قاعدة معرفة الشركة."
- Do not use outside knowledge. Do not guess or hallucinate.
- Respond in the same language as the user's question.
- Be concise, professional, and helpful.
- Do not mention that you are reading from "context" or "documents".
```

### Embedding Model & Dimensions

| Model | Dimensions | Cost Profile |
|-------|-----------|--------------|
| `text-embedding-3-small` | 1536 | Low cost, good multilingual performance including Arabic |

### Re-indexing Strategy

- URL re-scrape: delete old chunks for that URL, re-ingest fresh content.
- Document re-upload: version by `content_hash`; skip if unchanged.
- Global re-embed: only needed if embedding model changes (migration script).

> See [Caching Strategy](#caching-strategy) for full deduplication, invalidation, and storage rules.

---

## Caching Strategy

Caching reduces cost, latency, and redundant processing. The system uses **content-hash-based invalidation** as the primary strategy: if underlying content has not changed, skip re-processing.

### Caching Layers Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CACHING LAYERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 1 — Ingestion (persistent)     │  PostgreSQL + local/S3 files      │
│  Layer 2 — Embeddings (persistent)    │  pgvector (content_hash keyed)    │
│  Layer 3 — RAG retrieval (ephemeral)  │  Redis, TTL 5–30 min              │
│  Layer 4 — TTS audio (persistent)     │  File storage, hash keyed          │
│  Layer 5 — Frontend (static)          │  Browser cache + CDN              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. File Upload Caching

**Goal:** Never re-process an unchanged uploaded file.

| Cache Item | Storage | Key / Identifier | Invalidation |
|------------|---------|------------------|--------------|
| Original file | `FILE_STORAGE_PATH` (MVP) / S3 (prod) | `documents.file_path` + file UUID | Admin deletes document or uploads new version |
| Extracted text | `knowledge_chunks.content` | Per page/section row | `content_hash` changes on re-parse |
| Chunks | `knowledge_chunks` table | `content_hash` (SHA-256) | Chunk text changes or admin reindex |
| Embeddings | `chunk_embeddings` table | `chunk_id` + `content_hash` | Chunk text changes or embedding model changes |

**Processing rules:**

```
Upload received
  → Compute file_hash (SHA-256 of raw bytes)
  → If file_hash matches existing document for same filename/source:
      ├── Skip parse, chunk, embed
      └── Return existing document + job status
  → Else:
      ├── Store original file (never overwrite; use UUID filename)
      ├── Parse → clean → chunk → store in knowledge_chunks
      ├── Embed only new/changed chunks (compare content_hash)
      └── Mark document status = indexed
```

**Implementation notes:**

- `documents` table should track `file_hash` (add in Phase 4 migration).
- Before ingestion, compare incoming `file_hash` with stored value.
- On reindex: re-parse only if file on disk changed or admin forces refresh.
- Chunks with identical `content_hash` across re-runs are skipped (no duplicate rows).

**Phase:** Partially implemented in Phase 3 (`content_hash` on chunks). Full `file_hash` dedup in Phase 4.

---

### 2. Website Scraping Cache

**Goal:** Re-scrape only when content actually changes or admin manually requests refresh.

| Cache Item | Storage | Key / Identifier | Invalidation |
|------------|---------|------------------|--------------|
| Scraped page content | `knowledge_chunks` (per URL/page) | `source_id` + `source_url` + `content_hash` | Content hash mismatch on re-scrape |
| URL metadata | `website_urls` table | `url` UUID | Admin edits or deletes URL |
| Last scrape timestamp | `website_urls.last_scraped_at` | Per URL record | Updated after successful scrape |

**Processing rules:**

```
Scrape triggered (scheduled or manual)
  → Fetch page HTML
  → Extract and clean text
  → Compute content_hash
  → Compare with existing chunks for same source_url:
      ├── Hash unchanged → skip update, mark job completed (0 new chunks)
      └── Hash changed → delete old chunks for that URL, store new chunks
  → Update website_urls.last_scraped_at
```

**Re-scrape triggers:**

| Trigger | Behavior |
|---------|----------|
| Admin clicks "Scrape" | Always fetch; update only if `content_hash` differs |
| Scheduled re-scrape (future) | Same hash-check logic; skip unchanged pages |
| Admin edits URL config | Does not auto-scrape; admin must trigger manually |

**Phase:** Hash-based skip logic in Phase 4; scheduled scraping deferred post-MVP.

---

### 3. Embedding Cache

**Goal:** Generate embeddings only once per unchanged chunk.

| Rule | Detail |
|------|--------|
| Cache key | `content_hash` + `embedding_model` (e.g. `text-embedding-3-small`) |
| Storage | `chunk_embeddings` table linked to `knowledge_chunks.id` |
| Skip condition | If `chunk_embeddings` row exists for chunk AND `content_hash` unchanged AND model unchanged → skip API call |
| Re-embed triggers | Chunk text changes, chunk deleted/recreated, embedding model version bump |

**Processing rules:**

```
For each chunk after ingestion:
  → Lookup existing embedding by chunk_id
  → If embedding exists AND content_hash matches AND model matches:
      └── Skip (embedding cache hit)
  → Else:
      ├── Call OpenAI embeddings API
      ├── Upsert into chunk_embeddings
      └── Store model name for future invalidation
```

**Cost impact:** Embedding API calls are the highest recurring ingestion cost. Hash-based skip typically reduces re-index cost by 80–95% for unchanged documents.

**Phase:** Implement in Phase 4 with `chunk_embeddings` table.

---

### 4. RAG Retrieval Cache

**Goal:** Speed up repeated identical questions without serving stale answers when knowledge changes.

| Cache Item | Storage | TTL | Cache? |
|------------|---------|-----|--------|
| Query embedding | Redis | 15 min | Yes |
| Retrieved chunk IDs + scores | Redis | 10 min | Yes |
| Final LLM answer | Redis | 5 min (optional) | **Careful — see rules below** |
| Full chat response | — | — | **No (default)** |

**Cache key format:**

```
rag:query_embed:{sha256(normalized_query + language)}
rag:retrieval:{sha256(normalized_query + language + kb_version)}
rag:answer:{sha256(normalized_query + language + chunk_ids_hash)}  # optional, short TTL
```

**`kb_version`:** Incrementing counter bumped whenever any chunk is added, updated, or deleted. Ensures retrieval cache invalidates when knowledge base changes.

**Rules — do NOT blindly cache final LLM answers:**

- Default: cache **retrieval results** (chunk IDs + scores), not final LLM text.
- LLM answer cache (if enabled): max TTL **5 minutes**, only when `kb_version` matches.
- Never cache answers for admin override scenarios.
- Invalidate all RAG caches when admin uploads document, reindexes, or scrapes URL.

**Recommended TTLs:**

| Cache type | TTL | Rationale |
|------------|-----|-----------|
| Query embedding | 15 min | Same question asked repeatedly in a session |
| Retrieval results | 10 min | Balances speed vs. freshness |
| LLM answer (optional) | 5 min | Only for high-traffic identical queries |

**Phase:** Redis retrieval cache in Phase 9 (hardening/performance). `kb_version` counter added in Phase 4.

---

### 5. TTS Audio Cache

**Goal:** Reuse generated audio when the same text is spoken again with the same voice.

| Cache Item | Storage | Key | Invalidation |
|------------|---------|-----|--------------|
| Generated audio file | `FILE_STORAGE_PATH/tts/` (MVP) / S3 (prod) | `sha256(text + language + voice_id + tts_provider)` | Manual cache clear or TTL (30 days) |

**Processing rules:**

```
TTS request (text, language, voice_id)
  → cache_key = sha256(text + language + voice_id + provider)
  → If audio file exists at cache path:
      └── Return cached file (cache hit)
  → Else:
      ├── Call TTS API (OpenAI / Azure)
      ├── Save audio file (MP3/WAV)
      └── Return file path / stream
```

**Notes:**

- Cache key must include `voice_id` because different voices produce different audio for the same text.
- Arabic and English are separate cache entries (language in key).
- Do not cache streaming avatar responses (Phase 7) — only standalone TTS output.
- Estimated cache hit rate: 30–50% for FAQ-style repeated responses.

**Phase:** Implement in Phase 6 (Voice Support).

---

### 6. Frontend Cache

**Goal:** Fast page loads and minimal bandwidth for static assets.

| Asset type | Strategy | TTL |
|------------|----------|-----|
| JS/CSS bundles (`/_next/static/`) | CDN + `Cache-Control: public, max-age=31536000, immutable` | 1 year |
| Images, fonts, icons | CDN + long TTL with content hash in filename | 1 year |
| HTML pages (SSR) | `Cache-Control: no-store` for chat and admin | No cache |
| API responses | `Cache-Control: no-store` | No cache |
| Embed widget (`embed.js`) | CDN, `max-age=3600` (1 hour) | 1 hour |

**Next.js configuration (production):**

- Static assets automatically get content-hashed filenames → safe for long CDN TTL.
- Chat and admin routes: always fetch fresh (no SSR cache).
- `next.config.ts`: configure `headers()` for `/embed/*` and static paths.

**Phase:** Basic headers in Phase 9 deployment; CDN configured at production deploy.

---

### 7. Recommended MVP Approach

| Component | MVP Choice | Notes |
|-----------|-----------|-------|
| Knowledge base | PostgreSQL + pgvector | Single DB for relational + vector data |
| Original files | Local filesystem (`./uploads/`) | Simple; migrate to S3 later |
| Extracted text + chunks | PostgreSQL (`knowledge_chunks`) | Already implemented (Phase 3) |
| Embeddings | PostgreSQL pgvector (`chunk_embeddings`) | Phase 4 |
| Job queue | Celery + Redis | Already running (Phase 3) |
| RAG retrieval cache | **Skip in MVP** | Add in Phase 9 |
| TTS audio cache | Local filesystem (`./uploads/tts/`) | Phase 6 |
| Redis (general cache) | **Optional in MVP** | Redis already used for Celery broker; RAG cache deferred |
| Frontend CDN | Vercel default | Automatic for static assets on deploy |

**MVP caching priorities (implement first):**

1. `content_hash` on chunks — skip duplicate chunk storage ✅ (Phase 3, done)
2. `file_hash` on documents — skip re-processing unchanged uploads (Phase 4)
3. Embedding cache via `content_hash` — skip re-embedding unchanged chunks (Phase 4)
4. Scrape hash-check — skip storing unchanged URL content (Phase 4)
5. TTS audio file cache (Phase 6)

---

### 8. Recommended Production Approach

| Component | Production Choice | Notes |
|-----------|------------------|-------|
| Knowledge base | PostgreSQL + pgvector or Qdrant | Qdrant if > 1M vectors or need dedicated vector ops |
| Original files + TTS audio | S3 or Supabase Storage | Durable, scalable, CDN-friendly |
| Extracted text + chunks | PostgreSQL | Source of truth for content |
| Embeddings | pgvector (or Qdrant if migrated) | Same DB simplifies transactions |
| RAG retrieval cache | Redis (ElastiCache / Upstash) | TTL 5–30 min; `kb_version` invalidation |
| TTS audio cache | S3 with hash-based keys | Same key scheme as MVP |
| Background processing | Celery workers (separate service) | Horizontally scalable |
| Frontend static assets | Vercel CDN or Cloudflare | Global edge caching |
| Cache invalidation | `kb_version` counter + admin event hooks | Bump on any knowledge change |

**Production cache invalidation flow:**

```
Admin uploads document / scrapes URL / deletes chunk
  → kb_version += 1
  → Redis: DELETE rag:retrieval:*
  → Redis: DELETE rag:answer:*
  → Celery: process ingestion job
  → On completion: log cache stats
```

---

### Caching Implementation by Phase

| Phase | Caching features to implement |
|-------|------------------------------|
| Phase 3 ✅ | `content_hash` on chunks; original file storage; skip duplicate chunk text |
| Phase 4 | `file_hash` on documents; embedding cache; scrape hash-check; `kb_version` counter |
| Phase 6 | TTS audio file cache (local storage) |
| Phase 9 | Redis RAG retrieval cache; CDN headers; S3 migration; cache invalidation hooks |
| Post-MVP | Scheduled scrape with hash-check; Qdrant migration if needed; LLM answer cache (optional) |

---

### Cache Monitoring (Phase 9)

| Metric | Target |
|--------|--------|
| Embedding cache hit rate | > 80% on re-index operations |
| TTS cache hit rate | > 30% in production |
| RAG retrieval cache hit rate | > 40% for repeated queries |
| Stale cache incidents | 0 (enforced by `kb_version`) |

---

## Admin Dashboard Features

### Phase 2 (MVP UI)

- [ ] Login page (email + password)
- [ ] Dashboard overview (source count, job status summary)
- [ ] Website URL management (add, edit, delete, list)
- [ ] Document upload (drag-and-drop, file type validation)
- [ ] Document list with status badges (uploaded, processing, indexed, failed)
- [ ] Ingestion job list with progress indicators

### Phase 4+

- [ ] Knowledge base browser (search/filter chunks)
- [ ] Chunk enable/disable toggle
- [ ] Manual chunk edit

### Phase 5+

- [x] Chat log viewer (session list)
- [x] Session detail view with full transcript
- [x] Response override creation (improve a bad answer)
- [x] Override list management

### Phase 7+

- [x] Avatar provider configuration
- [x] Avatar preview/test

### Phase 9

- [ ] System settings (API keys, rate limits)
- [ ] Admin user management

---

## Frontend Features

### Chat Interface (Public)

| Feature | Phase | Notes |
|---------|-------|-------|
| Message list with scroll | 5 | User and assistant bubbles |
| Text input with send | 5 | Enter to send, Shift+Enter for newline |
| Typing/loading indicator | 5 | While waiting for RAG response |
| Auto language detection | 5 | Based on user input |
| Manual language toggle (AR/EN) | 5 | Persists per session |
| RTL layout for Arabic | 5 | `dir="rtl"` on Arabic messages |
| Session persistence | 5 | localStorage session token |
| Error states | 5 | Network error, server error messages |
| Microphone button | 6 | Push-to-talk or toggle |
| Audio playback for responses | 6 | TTS output |
| Avatar video panel | 7 | Embedded stream from provider |
| Responsive mobile layout | 8 | Touch-friendly |

### Embed Widget (Phase 8)

- Floating chat bubble button (bottom-right configurable)
- Expandable chat panel (iframe or web component)
- Minimal CSS footprint, no style conflicts with host site
- Configurable via `data-*` attributes: `data-api-url`, `data-language`, `data-theme`
- Lazy-loaded JS (`embed.js` ~15 KB gzipped target)

### Interactive Screen Mode (Phase 8)

- Fullscreen layout optimized for kiosk/touchscreen
- Large avatar display area
- Prominent microphone button
- Idle attract loop (optional)
- Auto-reset session after inactivity timeout

### Admin Dashboard

- Sidebar navigation
- Data tables with sorting/filtering
- File upload with progress
- Status badges (color-coded)
- Toast notifications for actions

---

## Avatar Integration Strategy

### Design Principle: Provider Abstraction

All avatar interactions go through `AvatarProvider` base class:

```python
class AvatarProvider(ABC):
    @abstractmethod
    async def create_session(self, config: AvatarConfig) -> AvatarSession: ...

    @abstractmethod
    async def speak(self, session_id: str, text: str, language: str) -> AsyncIterator[bytes]: ...

    @abstractmethod
    async def close_session(self, session_id: str) -> None: ...
```

### Provider Evaluation (MVP Priority)

| Provider | Arabic Support | Lip-sync | Streaming | API Maturity | MVP Priority |
|----------|---------------|----------|-----------|--------------|--------------|
| **HeyGen** | Yes (limited voices) | Yes | WebRTC/stream | High | **Primary candidate** |
| **D-ID** | Limited | Yes | Stream | High | Secondary |
| **Tavus** | Yes | Yes | Stream | Medium | Tertiary |

**Decision:** Start with HeyGen for MVP; keep D-ID and Tavus as pluggable alternatives behind the abstraction layer.

### Integration Flow

```
Chat response text
  → TTS generates audio (OpenAI)
  → Avatar provider receives text + audio
  → Provider returns video stream with lip-sync
  → Frontend renders in AvatarPanel component
```

### Frontend Avatar Component

- `AvatarPanel.tsx` — renders provider stream (video element or iframe)
- `useAvatar.ts` — hook managing session lifecycle
- Provider-agnostic: reads config from backend `/admin/avatar/config`
- Graceful degradation: if avatar disabled, show static image or TTS-only mode

### Configuration (Admin)

- Select provider (dropdown)
- Enter API key (encrypted at rest)
- Select avatar ID / presenter
- Select voice ID per language (AR, EN)
- Enable/disable toggle
- Test button (preview short clip)

---

## Security Considerations

| Area | Measure | Phase |
|------|---------|-------|
| **Admin auth** | JWT with short expiry (15 min) + refresh token; bcrypt password hashing | 2 |
| **API auth** | Bearer token on all `/admin/*` routes | 2 |
| **CORS** | Whitelist frontend origin; separate config for embed widget origins | 1, 8 |
| **File uploads** | Validate MIME type + extension; max size 50 MB; scan filename; store outside web root | 2, 9 |
| **Input validation** | Pydantic schemas on all endpoints; sanitize URL inputs | 1, 9 |
| **Rate limiting** | Per-IP rate limit on `/chat` and `/voice` (e.g., 30 req/min) | 9 |
| **SQL injection** | SQLAlchemy ORM (parameterized queries only) | 1 |
| **XSS** | React auto-escaping; CSP headers | 1, 9 |
| **Secrets** | Environment variables only; never in code or git | 1 |
| **Chat privacy** | IP addresses hashed; no PII collected from end users | 5 |
| **Embed security** | `postMessage` origin validation; sandboxed iframe | 8 |
| **HTTPS** | Enforce TLS in production | 9 |
| **Dependency scanning** | `pip audit` + `npm audit` in CI | 9 |

---

## Deployment Plan

### Local Development

```bash
docker compose up -d          # PostgreSQL + Redis
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
celery -A app.workers.celery_app worker --loglevel=info
```

### Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `REDIS_URL` | Backend | Redis for Celery |
| `OPENAI_API_KEY` | Backend | OpenAI API key |
| `JWT_SECRET` | Backend | Token signing secret |
| `FILE_STORAGE_PATH` | Backend | Local upload directory |
| `CORS_ORIGINS` | Backend | Allowed frontend origins |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL |
| `AVATAR_PROVIDER` | Backend | heygen / d-id / tavus / none |
| `AVATAR_API_KEY` | Backend | Provider API key |

### Production Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CDN       │────>│  Frontend   │     │  Backend    │
│  (static)   │     │  (Vercel /  │     │  (Railway / │
│             │     │   Docker)   │     │   Fly.io)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────┬───────────┼───────────┐
                    ▼              ▼           ▼           ▼
              ┌──────────┐  ┌──────────┐ ┌────────┐ ┌──────────┐
              │ PostgreSQL│  │  Redis   │ │ Celery │ │ S3       │
              │ + pgvector│  │          │ │ Worker │ │ Storage  │
              └──────────┘  └──────────┘ └────────┘ └──────────┘
```

### Recommended Hosting

| Component | Provider | Rationale |
|-----------|----------|-----------|
| Frontend | Vercel | Native Next.js support, edge CDN, easy preview deploys |
| Backend API | Railway or Fly.io | Docker deploy, persistent processes, reasonable pricing |
| PostgreSQL | Railway PostgreSQL or Supabase (DB only) | Managed, pgvector support |
| Redis | Railway Redis or Upstash | Managed, low ops |
| File storage | AWS S3 or Cloudflare R2 | Scalable, cheap |
| Celery worker | Same host as backend or separate Railway service | Co-located with Redis |

### CI/CD Pipeline (Phase 9)

1. Push to `main` → GitHub Actions
2. Lint + type check (ruff, mypy, eslint, tsc)
3. Run tests (pytest, vitest)
4. Build Docker images
5. Deploy backend + worker to Railway
6. Deploy frontend to Vercel
7. Run Alembic migrations

### Production Checklist (Phase 9)

- [ ] All secrets in environment variables (not in repo)
- [ ] HTTPS enforced on all endpoints
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Database backups configured
- [ ] File upload size limits enforced
- [ ] Error logging (structured JSON logs)
- [ ] Health check endpoint monitored
- [ ] pgvector index tuned for data volume
- [ ] OpenAI API usage alerts configured
- [ ] Admin default password changed

---

## Phase-by-Phase Roadmap

### Phase 0 — Planning and Architecture ✅

**Goal:** Define everything before writing production code.

| # | Task | Status |
|---|------|--------|
| 0.1 | Create PROJECT_PLAN.md | ✅ Done |
| 0.2 | Define tech stack | ✅ Done |
| 0.3 | Define architecture | ✅ Done |
| 0.4 | Define database schema | ✅ Done |
| 0.5 | Define folder structure | ✅ Done |
| 0.6 | Define API contracts | ✅ Done |
| 0.7 | Define RAG pipeline | ✅ Done |
| 0.8 | Do NOT implement app features | ✅ Done |

---

### Phase 1 — Basic Full-Stack Foundation ✅

**Goal:** Runnable skeleton with health check, DB connection, and basic UI layout.

| # | Task | Status |
|---|------|--------|
| 1.1 | Initialize git repo + .gitignore | ✅ Done |
| 1.2 | Create `docker-compose.yml` (PostgreSQL + Redis) | ✅ Done |
| 1.3 | Scaffold FastAPI backend (`backend/`) | ✅ Done |
| 1.4 | Add `app/config.py` with pydantic-settings | ✅ Done |
| 1.5 | Add `app/db/session.py` + SQLAlchemy setup | ✅ Done |
| 1.6 | Add Alembic init + initial empty migration | ✅ Done |
| 1.7 | Add `GET /api/v1/health` endpoint | ✅ Done |
| 1.8 | Add CORS middleware | ✅ Done |
| 1.9 | Create `backend/.env.example` | ✅ Done |
| 1.10 | Scaffold Next.js frontend (`frontend/`) | ✅ Done |
| 1.11 | Install Tailwind CSS + shadcn/ui | ✅ Done |
| 1.12 | Create root layout with basic navigation | ✅ Done |
| 1.13 | Create placeholder pages (chat, admin) | ✅ Done |
| 1.14 | Create `frontend/.env.example` | ✅ Done |
| 1.15 | Create `README.md` with quick start | ✅ Done |
| 1.16 | Create `scripts/dev.sh` to start all services | ✅ Done |
| 1.17 | Verify: `docker compose up` + backend health + frontend build | ✅ Done |
| 1.18 | Backend tests: health endpoint + DB connection (pytest) | ✅ Done |
| 1.19 | Frontend tests: Header component + API client (vitest) | ✅ Done |
| 1.20 | Update PROJECT_PLAN.md progress | ✅ Done |

---

### Phase 2 — Admin Dashboard MVP ✅

**Goal:** Admin can log in, add URLs, upload documents, and see processing status.

| # | Task | Status |
|---|------|--------|
| 2.1 | Create `users` table + Alembic migration | ✅ Done |
| 2.2 | Create `website_urls`, `documents`, `ingestion_jobs` tables | ✅ Done |
| 2.3 | Implement JWT auth (login, refresh) | ✅ Done |
| 2.4 | Seed default admin user script | ✅ Done |
| 2.5 | Backend: CRUD routes for `/admin/urls` | ✅ Done |
| 2.6 | Backend: upload + list routes for `/admin/documents` | ✅ Done |
| 2.7 | Backend: `GET /admin/jobs` status endpoint | ✅ Done |
| 2.8 | Backend: `GET /admin/dashboard/stats` | ✅ Done |
| 2.9 | Frontend: admin login page | ✅ Done |
| 2.10 | Frontend: admin layout with sidebar | ✅ Done |
| 2.11 | Frontend: URL management page | ✅ Done |
| 2.12 | Frontend: document upload page with drag-and-drop | ✅ Done |
| 2.13 | Frontend: job status list | ✅ Done |
| 2.14 | Frontend: dashboard overview page | ✅ Done |
| 2.15 | Backend tests: auth, URL CRUD, document upload routes | ✅ Done |
| 2.16 | Frontend tests: admin login, URL manager, document upload UI | ✅ Done |
| 2.17 | Update PROJECT_PLAN.md progress | ✅ Done |

---

### Phase 3 — Data Ingestion ✅

**Goal:** Scrape URLs and parse documents; store extracted text.

| # | Task | Status |
|---|------|--------|
| 3.1 | Set up Celery + Redis worker | ✅ Done |
| 3.2 | Implement BeautifulSoup scraper (static pages) | ✅ Done |
| 3.3 | Implement Playwright scraper (dynamic pages) | ✅ Done |
| 3.4 | Implement PDF parser (PyMuPDF) | ✅ Done |
| 3.5 | Implement Word parser (python-docx) | ✅ Done |
| 3.6 | Implement Excel parser (pandas/openpyxl) | ✅ Done |
| 3.7 | Implement text cleaning + normalization | ✅ Done |
| 3.8 | Implement language detection per section | ✅ Done |
| 3.9 | Store extracted content in `knowledge_chunks` (text only, no embeddings yet) | ✅ Done |
| 3.10 | Wire ingestion jobs: queued → processing → completed/failed | ✅ Done |
| 3.11 | Backend: trigger scrape/reindex endpoints | ✅ Done |
| 3.12 | Tests: parsers, scraper, ingestion pipeline | ✅ Done |
| 3.13 | Update PROJECT_PLAN.md progress | ✅ Done |

---

### Phase 4 — RAG Knowledge Base ✅

**Goal:** Embeddings, vector search, and grounded answer generation.

| # | Task | Status |
|---|------|--------|
| 4.1 | Enable pgvector extension + `chunk_embeddings` table | ✅ Done |
| 4.2 | Implement chunking service (500 tokens, 50 overlap) | ✅ Done |
| 4.3 | Implement embedding service (OpenAI batch) | ✅ Done |
| 4.4 | Implement vector similarity search | ✅ Done |
| 4.5 | Implement relevance threshold filtering | ✅ Done |
| 4.6 | Implement RAG prompt assembly | ✅ Done |
| 4.7 | Implement LLM answer generation with fallback | ✅ Done |
| 4.8 | Implement source tracking (`message_sources`) | ✅ Done |
| 4.9 | Backend: `POST /chat` endpoint | ✅ Done |
| 4.10 | Backend: knowledge chunk management routes | ✅ Done |
| 4.11 | Frontend: knowledge browser page (admin) | ✅ Done |
| 4.12 | Tests: RAG, chunking, fallback, chat endpoint | ✅ Done |
| 4.13 | `file_hash` dedup + `kb_version` counter | ✅ Done |
| 4.14 | Update PROJECT_PLAN.md progress | ✅ Done |

---

### Phase 5 — Chat Interface

**Goal:** Public bilingual chat UI connected to RAG backend.

| # | Task | Status |
|---|------|--------|
| 5.1 | Create `chat_sessions`, `chat_messages` tables | ✅ Done (Phase 4) |
| 5.2 | Implement chat service (session management, message flow) | ✅ Done (Phase 4) |
| 5.3 | Implement language detection service | ✅ Done (Phase 4) |
| 5.4 | Backend: `POST /chat` public endpoint | ✅ Done (Phase 4) |
| 5.5 | Backend: chat log routes for admin | ✅ Done |
| 5.6 | Backend: response override routes | ✅ Done |
| 5.7 | Frontend: ChatWindow, MessageBubble, ChatInput components | ✅ Done |
| 5.8 | Frontend: LanguageToggle component | ✅ Done |
| 5.9 | Frontend: RTL support for Arabic messages | ✅ Done |
| 5.10 | Frontend: connect chat to backend API | ✅ Done |
| 5.11 | Frontend: admin chat log viewer | ✅ Done |
| 5.12 | Frontend: response override UI | ✅ Done |
| 5.13 | Test: full conversation flow in AR and EN | ✅ Done |
| 5.14 | Update PROJECT_PLAN.md progress | ✅ Done |

---

### Phase 6 — Voice Support

**Goal:** Speech-to-text input and text-to-speech output in Arabic and English.

| # | Task | Status |
|---|------|--------|
| 6.1 | Implement STT provider abstraction | ✅ Done |
| 6.2 | Implement OpenAI Whisper STT provider | ✅ Done |
| 6.3 | Implement TTS provider abstraction | ✅ Done |
| 6.4 | Implement OpenAI TTS provider (AR + EN voices) | ✅ Done |
| 6.5 | Backend: `POST /voice/stt` endpoint | ✅ Done |
| 6.6 | Backend: `POST /voice/tts` endpoint | ✅ Done |
| 6.7 | Frontend: VoiceButton component (mic input) | ✅ Done |
| 6.8 | Frontend: audio recording + upload | ✅ Done |
| 6.9 | Frontend: audio playback for TTS responses | ✅ Done |
| 6.10 | Frontend: integrate voice into chat flow | ✅ Done |
| 6.11 | Test: Arabic and English voice round-trip | ✅ Done |
| 6.12 | Update PROJECT_PLAN.md progress | ✅ Done |

---

### Phase 7 — Avatar Integration

**Goal:** Third-party avatar with lip-sync, provider-agnostic.

| # | Task | Status |
|---|------|--------|
| 7.1 | Implement `AvatarProvider` base class | ✅ Done |
| 7.2 | Implement HeyGen provider | ✅ Done |
| 7.3 | Implement D-ID provider (stub/alternative) | ✅ Done |
| 7.4 | Create `avatar_config` table | ✅ Done |
| 7.5 | Backend: avatar session + stream endpoints | ✅ Done |
| 7.6 | Backend: admin avatar config routes | ✅ Done |
| 7.7 | Frontend: AvatarPanel component | ✅ Done |
| 7.8 | Frontend: useAvatar hook | ✅ Done |
| 7.9 | Frontend: integrate avatar into chat page | ✅ Done |
| 7.10 | Frontend: admin avatar settings page | ✅ Done |
| 7.11 | Test: avatar speaks RAG response with lip-sync | ✅ Done |
| 7.12 | Update PROJECT_PLAN.md progress | ✅ Done |

---

### Phase 8 — Embedding and Interactive Screen Mode

**Goal:** Embeddable widget and fullscreen kiosk mode.

| # | Task | Status |
|---|------|--------|
| 8.1 | Create `/embed` page (minimal chrome) | ⬜ Pending |
| 8.2 | Create `public/embed.js` loader script | ⬜ Pending |
| 8.3 | Implement iframe/postMessage communication | ⬜ Pending |
| 8.4 | Create `/screen` fullscreen page | ⬜ Pending |
| 8.5 | Large avatar + mic layout for kiosk | ⬜ Pending |
| 8.6 | Session auto-reset on inactivity | ⬜ Pending |
| 8.7 | Responsive layout improvements (mobile, tablet) | ⬜ Pending |
| 8.8 | CORS configuration for embed origins | ⬜ Pending |
| 8.9 | Document embed integration guide | ⬜ Pending |
| 8.10 | Test: embed in sample HTML page | ⬜ Pending |
| 8.11 | Update PROJECT_PLAN.md progress | ⬜ Pending |

---

### Phase 9 — Hardening and Deployment

**Goal:** Production-ready with security, monitoring, and deployment config.

| # | Task | Status |
|---|------|--------|
| 9.1 | Input validation audit (all endpoints) | ⬜ Pending |
| 9.2 | File upload security (MIME, size, path traversal) | ⬜ Pending |
| 9.3 | Rate limiting middleware | ⬜ Pending |
| 9.4 | Structured logging (JSON) | ⬜ Pending |
| 9.5 | Error handling middleware + consistent error responses | ⬜ Pending |
| 9.6 | Backend Dockerfile (production) | ⬜ Pending |
| 9.7 | Frontend Dockerfile (production) | ⬜ Pending |
| 9.8 | GitHub Actions CI pipeline | ⬜ Pending |
| 9.9 | Production environment documentation | ⬜ Pending |
| 9.10 | Production checklist verification | ⬜ Pending |
| 9.11 | Load test chat endpoint (basic) | ⬜ Pending |
| 9.12 | Update PROJECT_PLAN.md progress | ⬜ Pending |

---

## Testing Strategy

Each phase includes automated tests before moving to the next phase.

| Phase | Backend (pytest) | Frontend (vitest) |
|-------|------------------|-------------------|
| 1 | Health endpoint, DB connection | Header, API client |
| 2 | Auth, URL CRUD, document upload | Admin login, URL manager, upload UI |
| 3 | Scrapers, parsers, ingestion jobs | Job status polling |
| 4 | Chunking, embedding, RAG retrieval, fallback | — |
| 5 | Chat sessions, language detection, chat logs | Chat UI, language toggle, RTL |
| 6 | STT/TTS endpoints | Voice button, audio playback |
| 7 | Avatar provider abstraction | AvatarPanel component |
| 8 | Embed CORS config | Embed widget, screen mode layout |
| 9 | Rate limiting, upload security, validation | — |

**Run all tests:**

```bash
cd backend && ../backend/.venv/bin/pytest
cd frontend && npm test
```

---

## Current Progress

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 0 — Planning and Architecture | ✅ Complete | 100% |
| Phase 1 — Basic Full-Stack Foundation | ✅ Complete | 100% |
| Phase 2 — Admin Dashboard MVP | ✅ Complete | 100% |
| Phase 3 — Data Ingestion | ✅ Complete | 100% |
| Phase 4 — RAG Knowledge Base | ✅ Complete | 100% |
| Phase 5 — Chat Interface | ✅ Complete | 100% |
| Phase 6 — Voice Support | ✅ Complete | 100% |
| Phase 7 — Avatar Integration | ✅ Complete | 100% |
| Phase 8 — Embedding and Screen Mode | **Next** | 0% |
| Phase 9 — Hardening and Deployment | Not started | 0% |

### Completed

- **Phase 0:** PROJECT_PLAN.md with full architecture, schema, API plan, RAG design, and phased roadmap.
- **Phase 1:** FastAPI backend with health check, PostgreSQL + pgvector, Alembic migrations, CORS.
- **Phase 1:** Next.js frontend with Tailwind, shadcn/ui Button, Header navigation, placeholder chat/admin pages.
- **Phase 1:** Docker Compose (PostgreSQL on port 5433, Redis), `scripts/dev.sh`, `README.md`.
- **Phase 1 tests:** 4 backend tests passed, 4 frontend tests passed, production build succeeded.
- **Phase 2:** JWT auth, admin CRUD for URLs/documents, ingestion jobs, dashboard stats.
- **Phase 2:** Admin UI — login, sidebar, URL manager, document upload, job list, dashboard.
- **Phase 2 tests:** 19 backend tests passed, 10 frontend tests passed.
- **Phase 3:** Celery workers, parsers (PDF/DOCX/XLSX), web scraper, `knowledge_chunks` table, ingestion pipeline.
- **Phase 3:** Scrape/reindex API endpoints + admin UI buttons.
- **Phase 3 tests:** 32 backend tests passed.
- **Phase 4:** pgvector embeddings, RAG pipeline, `POST /chat`, knowledge admin API, `kb_version`, `file_hash`.
- **Phase 4:** Admin knowledge browser UI at `/admin/knowledge`.
- **Phase 4 tests:** 40 backend tests passed, 10 frontend tests passed.
- **Phase 5:** Bilingual chat UI at `/chat` with language toggle, RTL, session persistence.
- **Phase 5:** Admin chat logs at `/admin/chat-logs`, response overrides API + UI.
- **Phase 5:** `GET /chat/sessions/{id}`, `response_overrides` table (migration 005), RAG override injection.
- **Phase 5 tests:** 49 backend tests passed, 17 frontend tests passed.
- **Phase 6:** OpenAI Whisper STT + TTS, `POST /voice/stt` and `/voice/tts`, TTS file cache.
- **Phase 6:** Chat mic input, voice-to-text flow, Listen button for assistant replies.
- **Phase 6 tests:** 55 backend tests passed, 25 frontend tests passed.
- **Phase 7:** Avatar provider abstraction (mock, HeyGen, D-ID stub), `avatar_config` table, session/speak/stream APIs.
- **Phase 7:** `AvatarPanel` + `useAvatar` on chat page, admin avatar settings at `/admin/avatar`.
- **Phase 7 tests:** 63 backend tests passed, 27 frontend tests passed.

### In Progress

- Nothing — ready to start Phase 8.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-09 | **FastAPI (Python) for backend** | Best ecosystem for document parsing, scraping, and ML/RAG pipelines. |
| 2026-06-09 | **Next.js (TypeScript) for frontend** | SSR, App Router, strong TS support, easy embeddable widget packaging. |
| 2026-06-09 | **PostgreSQL + pgvector for vector search** | Single DB reduces ops complexity; sufficient for MVP scale. |
| 2026-06-09 | **OpenAI for LLM, embeddings, STT, and TTS** | Unified provider; strong Arabic support across services. |
| 2026-06-09 | **Celery + Redis for async jobs** | Document ingestion and scraping are long-running; need reliable job queue. |
| 2026-06-09 | **HeyGen as primary avatar provider** | Best API maturity and streaming support; abstraction allows switching. |
| 2026-06-09 | **Monorepo with `backend/` and `frontend/` folders** | Simple structure without workspace tooling overhead. |
| 2026-06-09 | **JWT auth for admin (not OAuth) in MVP** | Simpler to implement; OAuth can be added in Phase 9+. |
| 2026-06-09 | **Single-tenant per deployment** | MVP scope; multi-tenancy deferred. |
| 2026-06-09 | **Similarity threshold 0.72 for RAG fallback** | Starting point; will tune based on testing. |
| 2026-06-09 | **No LangChain** | Direct OpenAI + pgvector is simpler and more maintainable for MVP. |
| 2026-06-09 | **psycopg3 instead of psycopg2** | Python 3.14 compatibility; modern driver with SQLAlchemy 2.x support. |
| 2026-06-09 | **PostgreSQL exposed on port 5433** | Port 5432 already in use on dev machine; avoids Docker bind conflict. |
| 2026-06-09 | **Tests required per phase** | pytest (backend) + vitest (frontend) run before advancing to next phase. |
| 2026-06-09 | **SQLAlchemy 2.0.41** | Required for Python 3.14 compatibility with ORM mapped types. |
| 2026-06-09 | **Default admin seed** | `admin@example.com` / `admin123` via `scripts/seed-admin.py`. |
| 2026-06-09 | **Content-hash-based caching** | Primary cache invalidation strategy across ingestion, embeddings, and scraping. |
| 2026-06-09 | **Defer RAG answer caching to Phase 9** | Cache retrieval results only; avoid stale LLM answers when knowledge changes. |
| 2026-06-09 | **Redis optional for MVP caching** | Redis used for Celery broker; RAG/TTS caches added in later phases. |
| 2026-06-09 | **Local file storage for MVP** | S3/Supabase Storage deferred to production deployment. |
| 2026-06-09 | **Character-based chunking (no tiktoken)** | Python 3.14 lacks tiktoken wheels; ~4 chars/token estimate used instead. |
| 2026-06-09 | **HNSW index for pgvector** | Preferred over IVFFlat for MVP (works on small datasets). |

---

## Known Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | **Arabic NLP quality** — Embedding and LLM performance may vary for Arabic dialects | Medium | Test with real Arabic content early (Phase 4); tune chunking and prompts; consider Arabic-specific embedding model if needed. |
| R2 | **Web scraping reliability** — Sites may block scrapers, use heavy JS, or change structure | High | Support both BeautifulSoup and Playwright; respect robots.txt; admin notification on scrape failures. |
| R3 | **Avatar provider Arabic lip-sync** — Not all providers support Arabic voices well | Medium | Abstraction layer allows provider switching; TTS-only fallback mode. |
| R4 | **OpenAI API costs** — High chat volume + embeddings + voice can be expensive | Medium | Use GPT-4o-mini for chat; cache embeddings; rate limiting; usage alerts. |
| R5 | **pgvector scale limits** — Performance degrades beyond ~1M vectors | Low (MVP) | Monitor query latency; migration path to dedicated vector DB documented. |
| R6 | **Large document processing** — 500-page PDFs may timeout or consume memory | Medium | Chunk processing in Celery; page-by-page parsing; file size limits. |
| R7 | **RTL UI complexity** — Arabic layout requires careful CSS/logical property usage | Medium | Use Tailwind logical properties; test early in Phase 5. |
| R8 | **Embed widget CSS conflicts** — Host site styles may interfere with widget | Medium | Shadow DOM or iframe isolation; minimal global CSS. |
| R9 | **RAG hallucination** — LLM may answer despite weak context | High | Strict system prompt; hard similarity threshold; fallback response; admin override system. |
| R10 | **Voice latency** — STT + RAG + TTS + avatar pipeline may feel slow | Medium | Stream TTS audio while generating; show loading states; optimize RAG retrieval speed. |

---

## Next Actions

1. **Begin Phase 8** — Embedding and Interactive Screen Mode.
2. Create `/embed` page and `public/embed.js` loader.
3. Build `/screen` fullscreen kiosk layout with large avatar.
4. Add session auto-reset on inactivity.
5. Write Phase 8 tests and update PROJECT_PLAN.md.

---

*This is a living document. Update after every phase completion or major technical decision.*
