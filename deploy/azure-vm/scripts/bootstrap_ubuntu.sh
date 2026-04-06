#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
    echo "Run as root: sudo bash $0"
    exit 1
fi

APP_USER="${APP_USER:-${SUDO_USER:-azureuser}}"
APP_ROOT="${APP_ROOT:-/var/www/docqa}"
NODE_MAJOR="${NODE_MAJOR:-20}"

echo "==> Installing base packages"
apt-get update
apt-get install -y \
    build-essential \
    ca-certificates \
    curl \
    git \
    nginx \
    postgresql \
    postgresql-contrib \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    libpq-dev

echo "==> Installing Node.js ${NODE_MAJOR}.x"
if ! command -v node >/dev/null 2>&1 || ! node --version | grep -qE "^v${NODE_MAJOR}\."; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y nodejs
fi

echo "==> Creating runtime directories"
mkdir -p "${APP_ROOT}" /etc/docqa /var/log/docqa
chown -R "${APP_USER}:${APP_USER}" "${APP_ROOT}" /var/log/docqa

echo "==> Enabling services"
systemctl enable nginx
systemctl enable postgresql

echo
echo "Bootstrap complete."
echo "Next:"
echo "1) Copy and edit /etc/docqa/backend.env"
echo "2) Run deploy/azure-vm/scripts/install_systemd_and_nginx.sh"
echo "3) Run deploy/azure-vm/scripts/deploy_app.sh"
