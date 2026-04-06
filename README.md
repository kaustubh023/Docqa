# DocQA

DocQA is a full-stack document Q&A app:
- Backend: Django + DRF + JWT auth + PostgreSQL
- Frontend: React + Vite + Tailwind
- AI pipeline: file text extraction -> chunking -> embeddings -> Chroma vector search -> LLM answer

## Features

- User registration/login with JWT access token + refresh cookie flow
- Document upload and processing status tracking (`processing`, `ready`, `failed`)
- Supported upload formats: `.pdf`, `.doc`, `.docx`, `.txt`, `.csv`
- Semantic retrieval with HuggingFace embeddings (`all-MiniLM-L6-v2`)
- AI answers with provider fallback:
  - Primary: Groq (`llama-3.3-70b-versatile`)
  - Fallback: Google Gemini (`gemini-1.5-flash`)
- Persistent chat history per document
- Admin stats endpoint for staff users

## Project Structure

```text
docqa/
  backend/
    apps/
      documents/
      users/
    config/
    manage.py
  frontend/
    src/
  requirements.txt
```

## Prerequisites

- Python 3.11+ (project currently runs in Python 3.13 environment)
- Node.js 20+ and npm
- PostgreSQL 14+ (or compatible)

## Backend Setup

1. Create and activate virtual environment (from repo root):

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Create backend env file:

```powershell
Copy-Item backend\.env.example backend\.env
```

3. Update `backend/.env` values:
- `SECRET_KEY`
- `DEBUG` (must be `True` or `False`)
- `ALLOWED_HOSTS`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `GROQ_API_KEY`
- `GOOGLE_API_KEY`

4. Run migrations:

```powershell
python backend\manage.py makemigrations
python backend\manage.py migrate
```

5. (Optional) Create admin user:

```powershell
python backend\manage.py createsuperuser
```

6. Start backend server:

```powershell
python backend\manage.py runserver
```

Backend runs at `http://127.0.0.1:8000`.

## Frontend Setup

1. Install dependencies:

```powershell
cd frontend
npm install
```

2. Start dev server:

```powershell
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`.

## Main API Routes

- `POST /api/users/register/`
- `POST /api/users/login/`
- `POST /api/users/logout/`
- `POST /api/users/token/refresh/`
- `GET /api/users/me/`
- `GET /api/documents/` (list current user docs)
- `POST /api/documents/` (upload)
- `DELETE /api/documents/<id>/`
- `GET /api/documents/chat/?filename=<name>`
- `POST /api/documents/chat/`
- `GET /api/documents/admin-stats/` (staff only)

## How Processing Works

1. User uploads a file.
2. Backend stores it under `backend/media/documents/user_<id>/`.
3. A background thread extracts text and chunks it.
4. Chunks are embedded and stored in Chroma (`backend/vector_db/`).
5. Chat requests retrieve relevant chunks and send context to LLM.
6. Q&A history is saved in PostgreSQL.

## Notes

- CORS is configured for `http://localhost:5173` and `http://127.0.0.1:5173`.
- Refresh token cookie is currently set with `secure=False` (development-friendly setting).
- If you get `ValueError: Invalid truth value` at startup, check that `DEBUG` in `.env` is a valid boolean string.
