#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
    echo "Run as root: sudo bash $0"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_ROOT="${APP_ROOT:-/var/www/docqa}"
APP_USER="${APP_USER:-${SUDO_USER:-azureuser}}"
ENV_FILE="${ENV_FILE:-/etc/docqa/backend.env}"
SERVER_NAME="${SERVER_NAME:-_}"
SOCKET_PATH="${SOCKET_PATH:-/run/docqa/gunicorn.sock}"

SERVICE_TEMPLATE="${DEPLOY_DIR}/systemd/docqa-backend.service.tpl"
NGINX_TEMPLATE="${DEPLOY_DIR}/nginx/docqa.conf.tpl"

if [[ ! -f "${SERVICE_TEMPLATE}" || ! -f "${NGINX_TEMPLATE}" ]]; then
    echo "Template files are missing under deploy/azure-vm."
    exit 1
fi

mkdir -p /var/log/docqa
chown -R "${APP_USER}:www-data" /var/log/docqa
mkdir -p "${APP_ROOT}/backend/vector_db/.hf_cache/transformers"
mkdir -p "${APP_ROOT}/backend/vector_db/.hf_cache/sentence_transformers"
chown -R "${APP_USER}:www-data" "${APP_ROOT}/backend/vector_db/.hf_cache"
chmod -R ug+rwX "${APP_ROOT}/backend/vector_db/.hf_cache"

echo "==> Installing systemd service"
sed \
    -e "s|__APP_ROOT__|${APP_ROOT}|g" \
    -e "s|__APP_USER__|${APP_USER}|g" \
    -e "s|__ENV_FILE__|${ENV_FILE}|g" \
    -e "s|__SOCKET_PATH__|${SOCKET_PATH}|g" \
    "${SERVICE_TEMPLATE}" > /etc/systemd/system/docqa-backend.service

echo "==> Installing Nginx site config"
sed \
    -e "s|__APP_ROOT__|${APP_ROOT}|g" \
    -e "s|__SERVER_NAME__|${SERVER_NAME}|g" \
    -e "s|__SOCKET_PATH__|${SOCKET_PATH}|g" \
    "${NGINX_TEMPLATE}" > /etc/nginx/sites-available/docqa

ln -sf /etc/nginx/sites-available/docqa /etc/nginx/sites-enabled/docqa
rm -f /etc/nginx/sites-enabled/default

echo "==> Validating Nginx configuration"
nginx -t

echo "==> Reloading services"
systemctl daemon-reload
systemctl enable docqa-backend
systemctl enable nginx
systemctl restart nginx

if [[ -f "${ENV_FILE}" ]]; then
    systemctl restart docqa-backend
else
    echo "Skipped backend restart because ${ENV_FILE} does not exist yet."
fi

echo "Systemd and Nginx configuration installed."
