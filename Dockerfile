FROM python:3.12-slim

RUN apt-get update && apt-get install -y nodejs npm ffmpeg libpq-dev gcc && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY frontend/ ./frontend/
RUN cd frontend && npm install && npm run build

COPY backend/ ./backend/
RUN pip install --no-cache-dir fastapi uvicorn aiogram pillow pillow-heif ffmpeg-python python-multipart psycopg2-binary

RUN mkdir -p /app/media_storage

EXPOSE 8000

CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
