#!/bin/sh
set -e
PORT="${PORT:-8080}"
rm -f /etc/nginx/conf.d/default.conf
cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen ${PORT};
    root /usr/share/nginx/html;

    gzip on;
    gzip_types text/css application/javascript text/javascript application/json image/svg+xml;

    # Ficheiros com hash no nome: cache longo. Pedidos inexistentes = 404 (não servir index.html).
    location /assets/ {
        try_files \$uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    # Evita HTML antigo a pedir chunks de outro deploy (browser/CDN).
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
exec nginx -g "daemon off;"
