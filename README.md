# DocQA

DocQA is a full-stack document Q&A app.

- Backend: Django + DRF + JWT auth + PostgreSQL
- Frontend: React + Vite + Tailwind
- AI flow: extract file text -> chunk -> embed -> retrieve from Chroma -> answer with LLM

## Features

- Register/login with JWT access token + refresh cookie flow
- Upload and track document processing (`uploaded`, `processing`, `ready`, `failed`)
- Supported file types: `.pdf`, `.doc`, `.docx`, `.txt`, `.csv`
- Semantic retrieval using `all-MiniLM-L6-v2` embeddings
- LLM fallback chain:
  - Primary: Groq (`llama-3.3-70b-versatile`)
  - Fallback: Gemini (`gemini-1.5-flash`)
- Per-document chat history
- Admin-only stats endpoint

## Project Structure

```text
docqa/
  backend/
    apps/
    config/
    .env.example
    manage.py
  frontend/
    src/
    .env.example
  deploy/
    azure-vm/
  requirements.txt
```

## Local Setup

### 1) Backend

From repo root:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item backend\.env.example backend\.env
python backend\manage.py migrate
python backend\manage.py runserver
```

Backend URL: `http://127.0.0.1:8000`

### 2) Frontend

In a new terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

## Required Backend Env Values

Set these in `backend/.env`:

- `SECRET_KEY`
- `DEBUG` (`True` or `False`)
- `ALLOWED_HOSTS`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `GROQ_API_KEY`
- `GOOGLE_API_KEY`

Optional:

- `DOCQA_EMBEDDINGS_CACHE_DIR`

## API Routes

Users:

- `POST /api/users/register/`
- `POST /api/users/login/`
- `POST /api/users/logout/`
- `POST /api/users/token/refresh/`
- `GET /api/users/me/`

Documents:

- `GET /api/documents/`
- `POST /api/documents/`
- `DELETE /api/documents/<id>/`
- `POST /api/documents/<id>/reprocess/`
- `GET /api/documents/chat/?filename=<name>`
- `POST /api/documents/chat/`
- `GET /api/documents/admin-stats/` (staff only)

## Processing Flow

1. User uploads a file.
2. File is stored under `backend/media/documents/user_<id>/`.
3. Background thread extracts text and chunks it.
4. Chunks are embedded and saved in `backend/vector_db/`.
5. Chat request retrieves relevant chunks and asks the LLM.
6. Messages are saved in PostgreSQL.

## Deployment

Production templates/scripts are in `deploy/azure-vm/`:

- `scripts/bootstrap_ubuntu.sh`
- `scripts/setup_postgres.sh`
- `scripts/install_systemd_and_nginx.sh`
- `scripts/deploy_app.sh`
- `env/backend.env.example`

Refer to [deploy/azure-vm/README.md](deploy/azure-vm/README.md) for VM deployment steps.

## Notes

- Frontend API target comes from `VITE_API_BASE_URL` (`frontend/.env`).
- Local default: `http://127.0.0.1:8000/api/`
- If boolean env parsing fails at startup, verify values like `DEBUG` are valid (`True`/`False`).
