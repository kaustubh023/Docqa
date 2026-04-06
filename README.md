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
  deploy/
    azure-vm/
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
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
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
Copy-Item .env.example .env
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

- `VITE_API_BASE_URL` controls frontend API target. Use `http://127.0.0.1:8000/api/` for local dev.
- Production can use same-domain routing via `VITE_API_BASE_URL=/api/`.
- If you get `ValueError: Invalid truth value` at startup, check that `DEBUG` in `.env` is a valid boolean string.

## Azure VM Deployment (Ubuntu)

Deployment assets are included under `deploy/azure-vm/`.

1. Bootstrap VM dependencies:
```bash
sudo bash deploy/azure-vm/scripts/bootstrap_ubuntu.sh
```

2. Configure PostgreSQL locally on the VM (optional if using managed DB):
```bash
sudo DB_NAME=docqa_db DB_USER=docqa_user DB_PASSWORD='strong-password' \
  bash deploy/azure-vm/scripts/setup_postgres.sh
```

3. Create backend production env file:
```bash
sudo mkdir -p /etc/docqa
sudo cp deploy/azure-vm/env/backend.env.example /etc/docqa/backend.env
sudo nano /etc/docqa/backend.env
sudo chmod 600 /etc/docqa/backend.env
```

4. Install systemd service + Nginx config:
```bash
sudo APP_ROOT=/var/www/docqa APP_USER=azureuser SERVER_NAME=your-domain.com \
  bash deploy/azure-vm/scripts/install_systemd_and_nginx.sh
```

5. Deploy or update the app:
```bash
APP_ROOT=/var/www/docqa REPO_URL='https://your-repo-url.git' BRANCH=main \
  bash deploy/azure-vm/scripts/deploy_app.sh
```

6. Verify:
```bash
sudo systemctl status docqa-backend
sudo nginx -t
curl -I http://127.0.0.1
```
