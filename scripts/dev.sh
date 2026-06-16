#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting Docker services (PostgreSQL + Redis)..."
docker compose up -d

echo "Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U avatar -d avatar_db > /dev/null 2>&1; do
  sleep 1
done

if [ ! -f backend/.env ]; then
  echo "Creating backend/.env from .env.example..."
  cp backend/.env.example backend/.env
fi

if [ ! -d backend/.venv ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv backend/.venv
fi

echo "Installing backend dependencies..."
backend/.venv/bin/pip install -q -r backend/requirements.txt

echo "Running database migrations..."
cd backend && ../backend/.venv/bin/alembic upgrade head && cd ..

echo "Seeding default admin user..."
backend/.venv/bin/python scripts/seed-admin.py

if [ ! -f frontend/.env.local ]; then
  echo "Creating frontend/.env.local from .env.example..."
  cp frontend/.env.example frontend/.env.local
fi

if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

echo ""
echo "All services ready. Start in separate terminals:"
echo "  Backend:  cd backend && ../backend/.venv/bin/uvicorn app.main:app --reload --port 8000"
echo "  Worker:   cd backend && ../backend/.venv/bin/celery -A app.workers.celery_app worker --loglevel=info"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "URLs:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo "  Health:    http://localhost:8000/api/v1/health"
