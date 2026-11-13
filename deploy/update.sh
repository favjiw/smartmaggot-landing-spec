#!/usr/bin/env bash
# Menarik versi terbaru dari GitHub lalu build ulang dan restart.
# Jalankan di server:  sudo bash /srv/gardahijau/app/deploy/update.sh
set -euo pipefail

APP_USER=gardahijau
APP_DIR=/srv/gardahijau/app
SERVICE=gardahijau-web

[ "$(id -u)" -eq 0 ] || { echo "Jalankan dengan sudo: sudo bash $0"; exit 1; }

sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' \
  && git pull --ff-only \
  && npm ci --no-audit --no-fund \
  && npm run db:migrate \
  && npm run build"

systemctl restart "$SERVICE"
sleep 3
curl -fsS http://127.0.0.1:3000/web-api/health && echo
echo "Versi aktif: $(sudo -u "$APP_USER" git -C "$APP_DIR" log -1 --format='%h %s')"
