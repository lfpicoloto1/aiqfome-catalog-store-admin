#!/bin/sh
set -e
PORT="${PORT:-8080}"
rm -f /etc/nginx/conf.d/default.conf
cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen ${PORT};
    root /usr/share/nginx/html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
EOF
exec nginx -g "daemon off;"
