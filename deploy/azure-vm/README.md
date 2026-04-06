# Azure VM Deployment (Ubuntu + Nginx + Gunicorn)

This folder contains production deployment templates/scripts for deploying DocQA to an Azure Linux VM.

## Files

- `scripts/bootstrap_ubuntu.sh`: install system packages (Python, Node, Nginx, PostgreSQL).
- `scripts/setup_postgres.sh`: create PostgreSQL DB/user locally on the VM.
- `scripts/install_systemd_and_nginx.sh`: install systemd service and Nginx config from templates.
- `scripts/deploy_app.sh`: clone/update app, install deps, migrate, collectstatic, build frontend, restart services.
- `systemd/docqa-backend.service.tpl`: Gunicorn systemd service template.
- `nginx/docqa.conf.tpl`: Nginx site template.
- `env/backend.env.example`: backend env template for `/etc/docqa/backend.env`.
- `env/frontend.env.production.example`: frontend env template.

## Quick Start

1. Bootstrap VM (run as root):
```bash
sudo bash deploy/azure-vm/scripts/bootstrap_ubuntu.sh
```

2. Create PostgreSQL DB/user (optional, if DB is local):
```bash
sudo DB_NAME=docqa_db DB_USER=docqa_user DB_PASSWORD='strong-password' \
  bash deploy/azure-vm/scripts/setup_postgres.sh
```

3. Prepare backend env:
```bash
sudo mkdir -p /etc/docqa
sudo cp deploy/azure-vm/env/backend.env.example /etc/docqa/backend.env
sudo nano /etc/docqa/backend.env
sudo chmod 600 /etc/docqa/backend.env
```

4. Install service + Nginx config:
```bash
sudo APP_ROOT=/var/www/docqa APP_USER=azureuser SERVER_NAME=your-domain.com \
  bash deploy/azure-vm/scripts/install_systemd_and_nginx.sh
```

5. Deploy app code:
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
