# VoxNote - Project Documentation

## Overview

VoxNote is a voice recording management application that allows users to upload audio recordings, automatically transcribe them using OpenAI Whisper, and generate structured summaries using GPT-4o-mini.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI 0.115 (Python 3.12) |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Task Queue | Celery 5.4 + Redis 7 |
| Database | PostgreSQL 16 |
| Auth | JWT via python-jose + passlib/bcrypt |
| STT | OpenAI Whisper API (whisper-1) |
| Summary | OpenAI GPT-4o-mini |
| Frontend | React 18 + Vite 5 + TypeScript |
| State | Zustand (auth) + TanStack Query (server state) |
| Routing | React Router v6 |
| HTTP client | Axios |
| Containerization | Docker Compose |

## Project Structure

```
VoxNote/
├── docker-compose.yml          # All services
├── .env.example                # Environment variable template
├── .gitignore
├── CLAUDE.md                   # This file
├── uploads/                    # Audio file storage (bind mount)
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/           # Migration files
│   └── app/
│       ├── main.py             # FastAPI app entry point
│       ├── config.py           # Pydantic Settings
│       ├── database.py         # SQLAlchemy engine + session
│       ├── models/
│       │   ├── user.py         # User ORM model
│       │   └── recording.py    # Recording ORM model
│       ├── schemas/
│       │   ├── user.py         # Pydantic schemas for auth
│       │   └── recording.py    # Pydantic schemas for recordings
│       ├── api/
│       │   ├── deps.py         # FastAPI dependencies (get_current_user)
│       │   └── routes/
│       │       ├── auth.py     # /auth endpoints
│       │       ├── recordings.py # /recordings endpoints
│       │       └── health.py   # /health endpoint
│       ├── services/
│       │   ├── auth.py         # JWT + bcrypt helpers
│       │   ├── transcription.py # Whisper API + title generation
│       │   └── summary.py      # GPT-4o-mini summary generation
│       └── tasks/
│           ├── celery_app.py   # Celery instance
│           └── tasks.py        # Celery task definitions
│
└── frontend/
    ├── Dockerfile              # Multi-stage: build + nginx
    ├── nginx.conf              # SPA routing + API proxy
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx            # React 18 entry point
        ├── App.tsx             # Router + route definitions
        ├── api/
        │   ├── client.ts       # Axios instance with interceptors
        │   ├── auth.ts         # Auth API calls
        │   └── recordings.ts   # Recordings API calls
        ├── store/
        │   └── authStore.ts    # Zustand auth store
        ├── components/
        │   ├── Layout.tsx      # App shell with header/footer
        │   ├── ProtectedRoute.tsx
        │   ├── StatusBadge.tsx
        │   └── AudioPlayer.tsx
        └── pages/
            ├── LoginPage.tsx
            ├── RegisterPage.tsx
            ├── DashboardPage.tsx
            └── RecordingDetailPage.tsx
```

## Architecture Decisions

### Async task processing
Transcription and summarization are long-running operations (can take 10-60+ seconds). These are offloaded to Celery workers so API responses are immediate. The frontend polls the recording status every 5 seconds to check for completion.

### File storage
Audio files are stored on the filesystem at `UPLOAD_DIR` (`/uploads` in Docker, mounted as `./uploads` on the host). This is a simple approach suitable for single-node deployments. For production scale, replace with S3 or similar object storage.

### Authentication
Stateless JWT authentication. Tokens are stored in localStorage on the frontend. The `ACCESS_TOKEN_EXPIRE_MINUTES` default is 1440 (24 hours). On 401 responses the frontend clears the token and redirects to login.

### Recording status flow
```
uploaded -> transcribing -> transcribed -> summarizing -> summarized
                                    \-> error (at any step)
```

### API proxy
In development, Vite proxies `/api/*` to the backend. In production (Docker), nginx proxies `/api/*` to `http://backend:8000/`.

### CORS
In development mode all origins are allowed. For production, set allowed origins via environment variable.

## Getting Started

1. Copy the environment file and set your OpenAI API key:
   ```bash
   cp .env.example .env
   # Edit .env and set OPENAI_API_KEY and SECRET_KEY
   # Generate SECRET_KEY with: openssl rand -hex 32
   ```

2. Start all services:
   ```bash
   docker compose up --build
   ```

3. Run database migrations:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

4. Open http://localhost:3000

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login, get JWT |
| GET | /auth/me | Current user info |
| GET | /recordings | List recordings (paginated) |
| POST | /recordings | Upload audio file |
| GET | /recordings/{id} | Recording detail |
| PATCH | /recordings/{id} | Update title |
| DELETE | /recordings/{id} | Delete recording |
| POST | /recordings/{id}/summarize | Trigger summary generation |
| GET | /recordings/{id}/summary/download | Download summary as .md |
| GET | /health | Health check |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SECRET_KEY` | JWT signing secret (use `openssl rand -hex 32`) |
| `ALGORITHM` | JWT algorithm (default: HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token TTL (default: 1440 = 24h) |
| `OPENAI_API_KEY` | OpenAI API key for Whisper + GPT |
| `UPLOAD_DIR` | Directory for audio file storage |
| `MAX_UPLOAD_SIZE_MB` | Maximum upload file size in MB |
