#!/bin/bash
# Run this ONCE on the fresh DigitalOcean droplet to set everything up.
# ssh root@64.226.90.94 'bash -s' < server-setup.sh
set -e

echo "==> Updating system..."
apt-get update && apt-get upgrade -y

echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker

echo "==> Installing nginx..."
apt-get install -y nginx python3 python3-pip

echo "==> Creating app directory..."
mkdir -p /opt/ufo-tracker/data

echo "==> Writing nginx config..."
cat > /etc/nginx/sites-available/ufo-tracker << 'NGINX'
server {
    listen 80;
    server_name _;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/javascript;

    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/ufo-tracker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

echo "==> Installing Node.js 20 (for scraper cron)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "==> Installing Playwright system deps..."
apt-get install -y \
  libglib2.0-0 libnss3 libnspr4 libdbus-1-3 \
  libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libasound2

echo "==> Setting up nightly scraper cron..."
cat > /etc/cron.d/ufo-scraper << 'CRON'
# Run NUFORC scraper nightly at 3am UTC
0 3 * * * root cd /opt/ufo-tracker && node scripts/scrape_nuforc_playwright.js >> /var/log/ufo-scraper.log 2>&1
CRON

chmod 644 /etc/cron.d/ufo-scraper

echo ""
echo "==> Server setup complete!"
echo "    Now run ./deploy.sh from your local machine to push the app."
