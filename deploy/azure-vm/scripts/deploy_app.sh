#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/docqa}"
APP_USER="${APP_USER:-${SUDO_USER:-azureuser}}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_PATH="${VENV_PATH:-${APP_ROOT}/.venv}"
BACKEND_DIR="${APP_ROOT}/backend"
FRONTEND_DIR="${APP_ROOT}/frontend"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-/etc/docqa/backend.env}"
FRONTEND_ENV_FILE="${FRONTEND_ENV_FILE:-}"
EMBEDDINGS_CACHE_DIR="${EMBEDDINGS_CACHE_DIR:-${BACKEND_DIR}/vector_db/.hf_cache}"

if [[ ! -d "${APP_ROOT}/.git" ]]; then
    if [[ -z "${REPO_URL}" ]]; then
        echo "APP_ROOT does not contain a git repo. Set REPO_URL to clone."
        exit 1
    fi
    echo "==> Cloning repository"
    git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_ROOT}"
else
    echo "==> Updating repository (${BRANCH})"
    git -C "${APP_ROOT}" fetch origin "${BRANCH}"
    git -C "${APP_ROOT}" checkout "${BRANCH}"
    git -C "${APP_ROOT}" pull --ff-only origin "${BRANCH}"
fi

echo "==> Preparing Python virtual environment"
"${PYTHON_BIN}" -m venv "${VENV_PATH}"
"${VENV_PATH}/bin/pip" install --upgrade pip
"${VENV_PATH}/bin/pip" install -r "${APP_ROOT}/requirements.txt"

if [[ ! -f "${BACKEND_ENV_FILE}" ]]; then
    echo "Missing backend env file: ${BACKEND_ENV_FILE}"
    echo "Create it from deploy/azure-vm/env/backend.env.example and retry."
    exit 1
fi

echo "==> Running Django migrations and collectstatic"
set -a
# shellcheck disable=SC1090
source "${BACKEND_ENV_FILE}"
set +a

mkdir -p \
    "${BACKEND_DIR}/media" \
    "${BACKEND_DIR}/vector_db" \
    "${BACKEND_DIR}/staticfiles" \
    "${EMBEDDINGS_CACHE_DIR}/transformers" \
    "${EMBEDDINGS_CACHE_DIR}/sentence_transformers"
if [[ "${EUID}" -eq 0 ]]; then
    chown -R "${APP_USER}:www-data" \
        "${BACKEND_DIR}/media" \
        "${BACKEND_DIR}/vector_db" \
        "${BACKEND_DIR}/staticfiles"
    chmod -R ug+rwX "${EMBEDDINGS_CACHE_DIR}"
fi
"${VENV_PATH}/bin/python" "${BACKEND_DIR}/manage.py" migrate --noinput
"${VENV_PATH}/bin/python" "${BACKEND_DIR}/manage.py" collectstatic --noinput

echo "==> Building frontend"
if [[ -n "${FRONTEND_ENV_FILE}" && -f "${FRONTEND_ENV_FILE}" ]]; then
    cp "${FRONTEND_ENV_FILE}" "${FRONTEND_DIR}/.env.production"
elif [[ ! -f "${FRONTEND_DIR}/.env.production" && -f "${APP_ROOT}/deploy/azure-vm/env/frontend.env.production.example" ]]; then
    cp "${APP_ROOT}/deploy/azure-vm/env/frontend.env.production.example" "${FRONTEND_DIR}/.env.production"
fi

npm --prefix "${FRONTEND_DIR}" ci
npm --prefix "${FRONTEND_DIR}" run build

echo "==> Restarting backend service and reloading Nginx"
if [[ "${EUID}" -eq 0 ]]; then
    systemctl restart docqa-backend
    systemctl reload nginx
else
    sudo systemctl restart docqa-backend
    sudo systemctl reload nginx
fi

echo "Deployment complete."
