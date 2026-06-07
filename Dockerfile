FROM node:20-bookworm AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml backend/uv.lock* ./backend/
WORKDIR /app/backend
RUN pip install --no-cache-dir .

WORKDIR /app
COPY backend/ ./backend/
COPY docs/ ./docs/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /data/uploads

ENV DATABASE_URL=sqlite:////data/sandbox.db
ENV UPLOAD_DIR=/data/uploads

WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
