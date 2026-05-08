#!/bin/bash
# Deploy UFO Tracker to DigitalOcean droplet
# Usage: ./deploy.sh
set -e

SERVER="root@64.226.90.94"
REMOTE_DIR="/opt/ufo-tracker"

echo "==> Syncing files to server..."
rsync -avz --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'data/*.csv' \
  --exclude '*.log' \
  . "$SERVER:$REMOTE_DIR/"

echo "==> Syncing database..."
rsync -avz --progress \
  data/sightings.db \
  "$SERVER:$REMOTE_DIR/data/sightings.db"

echo "==> Building and restarting on server..."
ssh "$SERVER" "cd $REMOTE_DIR && docker compose up -d --build"

echo "==> Done. App running at http://64.226.90.94"
