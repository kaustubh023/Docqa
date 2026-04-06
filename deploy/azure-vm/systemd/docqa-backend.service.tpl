[Unit]
Description=DocQA Backend (Gunicorn)
After=network.target

[Service]
Type=simple
User=__APP_USER__
Group=www-data
SupplementaryGroups=www-data
WorkingDirectory=__APP_ROOT__/backend
EnvironmentFile=__ENV_FILE__
Environment=PYTHONUNBUFFERED=1
Environment=DOCQA_EMBEDDINGS_CACHE_DIR=__APP_ROOT__/backend/vector_db/.hf_cache
RuntimeDirectory=docqa
RuntimeDirectoryMode=0755
UMask=0007
ExecStart=__APP_ROOT__/.venv/bin/gunicorn config.wsgi:application --name docqa --workers 3 --bind unix:__SOCKET_PATH__ --timeout 180 --access-logfile /var/log/docqa/gunicorn-access.log --error-logfile /var/log/docqa/gunicorn-error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
