server {
    listen 80;
    server_name __SERVER_NAME__;

    client_max_body_size 50M;

    root __APP_ROOT__/frontend/dist;
    index index.html;

    location /static/ {
        alias __APP_ROOT__/backend/staticfiles/;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

    location /media/ {
        alias __APP_ROOT__/backend/media/;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

    location /api/ {
        include proxy_params;
        proxy_pass http://unix:__SOCKET_PATH__;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    location /admin/ {
        include proxy_params;
        proxy_pass http://unix:__SOCKET_PATH__;
    }

    location / {
        try_files $uri /index.html;
    }
}
