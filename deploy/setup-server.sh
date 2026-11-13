#!/usr/bin/env bash
# Setup awal VPS Ubuntu kosong untuk landing + admin Garda Hijau.
# Jalankan SEKALI sebagai root:  sudo bash setup-server.sh
# Aman dijalankan ulang: langkah yang sudah selesai akan dilewati.
set -euo pipefail

DOMAIN="${DOMAIN:-gardahijaukemdiktisaintek.digital}"
REPO_URL="${REPO_URL:-https://github.com/favjiw/smartmaggot-landing-spec.git}"
BRANCH="${BRANCH:-main}"
GARDAHIJAU_API_URL="${GARDAHIJAU_API_URL:-https://gardahijau.codelabspace.or.id}"

APP_USER=gardahijau
APP_HOME=/srv/gardahijau
APP_DIR=$APP_HOME/app
ENV_FILE=$APP_DIR/.env.local
SERVICE=gardahijau-web
DB_NAME=gardahijau
DB_USER=gardahijau
PORT=3000
NODE_MAJOR=24
CRED_FILE=/root/gardahijau-admin.txt

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }
as_app() { sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && $*"; }

[ "$(id -u)" -eq 0 ] || { echo "Jalankan dengan sudo: sudo bash $0"; exit 1; }

# ---------------------------------------------------------------- input
read -rp "Email untuk sertifikat HTTPS (Let's Encrypt): " CERTBOT_EMAIL </dev/tty
if [ ! -f "$ENV_FILE" ]; then
  read -rp "Email login admin web [admin@$DOMAIN]: " ADMIN_EMAIL </dev/tty
  ADMIN_EMAIL=${ADMIN_EMAIL:-admin@$DOMAIN}
  echo "Akun layanan API Garda Hijau (untuk angka dampak). Kosongkan jika ingin diisi nanti."
  read -rp "  GARDAHIJAU_API_USERNAME: " API_USER </dev/tty
  read -rsp "  GARDAHIJAU_API_PASSWORD: " API_PASS </dev/tty; echo
fi

# ---------------------------------------------------------------- paket
step "Memasang paket sistem (nginx, PostgreSQL, certbot, firewall)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg git openssl dnsutils nginx postgresql ufw certbot python3-certbot-nginx

step "Menyiapkan swap (agar build Next.js tidak kehabisan RAM)"
if [ -z "$(swapon --show --noheadings)" ] && [ "$(free -m | awk '/^Mem:/{print $2}')" -lt 3500 ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  echo "Swap sudah ada atau RAM cukup, dilewati."
fi

step "Memasang Node.js $NODE_MAJOR"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v
NPM_BIN=$(command -v npm)

# ---------------------------------------------------------------- kode
step "Membuat user aplikasi dan mengambil kode"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir "$APP_HOME" --shell /bin/bash "$APP_USER"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" -H git -C "$APP_DIR" pull --ff-only
else
  sudo -u "$APP_USER" -H git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

# ---------------------------------------------------------------- database + env
if [ -f "$ENV_FILE" ]; then
  step ".env.local sudah ada, database dan rahasia tidak diubah"
else
  step "Membuat database PostgreSQL dan .env.local"
  DB_PASS=$(openssl rand -hex 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN CREATE ROLE $DB_USER LOGIN; END IF;
END \$\$;
ALTER ROLE $DB_USER WITH PASSWORD '$DB_PASS';
SQL
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 \
    || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

  ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)

  # Nilai berisi karakter khusus bisa salah dibaca parser .env (mis. "$" dianggap variabel).
  UNSAFE_RE='[[:space:]$"\\#'"'"']'
  unsafe() { [[ "$1" =~ $UNSAFE_RE ]]; }
  if unsafe "${API_USER:-}" || unsafe "${API_PASS:-}"; then
    warn "Username/password API berisi karakter khusus. Isi manual di $ENV_FILE (lihat DEPLOY.md)."
    API_USER=""; API_PASS=""
  fi

  install -o "$APP_USER" -g "$APP_USER" -m 600 /dev/null "$ENV_FILE"
  cat > "$ENV_FILE" <<ENV
# Dibuat oleh deploy/setup-server.sh pada $(date -u +%Y-%m-%dT%H:%MZ). Jangan commit file ini.
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME
DATABASE_SSL=false

JWT_SECRET=$(openssl rand -hex 32)
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD

NEXT_PUBLIC_SITE_URL=https://$DOMAIN

GARDAHIJAU_API_URL=$GARDAHIJAU_API_URL
GARDAHIJAU_API_USERNAME=${API_USER:-}
GARDAHIJAU_API_PASSWORD=${API_PASS:-}
GARDAHIJAU_API_DISABLED=false
ENV

  install -m 600 /dev/null "$CRED_FILE"
  printf 'Admin web : https://%s/admin/login\nEmail     : %s\nPassword  : %s\n' "$DOMAIN" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" > "$CRED_FILE"
fi

# ---------------------------------------------------------------- build
step "Install dependency, migrasi database, dan build"
as_app "npm ci --no-audit --no-fund"
as_app "npm run db:setup"
as_app "npm run build"

# ---------------------------------------------------------------- service
step "Mendaftarkan service systemd ($SERVICE)"
cat > /etc/systemd/system/$SERVICE.service <<UNIT
[Unit]
Description=Garda Hijau landing + admin (Next.js)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=$NPM_BIN run start -- -H 127.0.0.1 -p $PORT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable "$SERVICE"
systemctl restart "$SERVICE"

# ---------------------------------------------------------------- nginx
step "Mengatur Nginx untuk $DOMAIN"
NGINX_SITE=/etc/nginx/sites-available/$SERVICE
if [ -f "$NGINX_SITE" ]; then
  echo "Konfigurasi Nginx sudah ada (mungkin sudah diubah certbot), tidak ditimpa."
else
  cat > "$NGINX_SITE" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Admin bisa mengunggah beberapa foto (maks. 2 MB per foto) sekaligus.
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
}
NGINX
fi
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/$SERVICE
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---------------------------------------------------------------- firewall
step "Mengaktifkan firewall (SSH, HTTP, HTTPS)"
SSH_PORT=$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}')
ufw allow "${SSH_PORT:-22}/tcp"
ufw allow 'Nginx Full'
ufw --force enable

# ---------------------------------------------------------------- backup
step "Menjadwalkan backup database harian (02:30, disimpan 14 hari)"
install -d -o postgres -g postgres -m 700 /var/backups/gardahijau
cat > /etc/cron.d/gardahijau-backup <<'CRON'
30 2 * * * postgres pg_dump -Fc gardahijau > /var/backups/gardahijau/gardahijau-$(date +\%F).dump && find /var/backups/gardahijau -name '*.dump' -mtime +14 -delete
CRON

# ---------------------------------------------------------------- https
step "Memasang sertifikat HTTPS"
SERVER_IP=$(curl -fsS4 --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
CERT_DOMAINS=()
for name in "$DOMAIN" "www.$DOMAIN"; do
  if dig +short A "$name" | grep -qx "$SERVER_IP"; then CERT_DOMAINS+=(-d "$name"); else warn "$name belum mengarah ke $SERVER_IP"; fi
done
if [ ${#CERT_DOMAINS[@]} -gt 0 ]; then
  certbot --nginx --non-interactive --agree-tos --redirect -m "$CERTBOT_EMAIL" "${CERT_DOMAINS[@]}"
else
  warn "DNS belum mengarah ke server ini. Setelah DNS aktif, jalankan:"
  echo "  sudo certbot --nginx --redirect -d $DOMAIN -d www.$DOMAIN"
fi

# ---------------------------------------------------------------- cek
step "Pemeriksaan"
sleep 3
curl -fsS "http://127.0.0.1:$PORT/web-api/health" && echo \
  || warn "Aplikasi belum merespons. Cek log: sudo journalctl -u $SERVICE -n 50"
echo
echo "Selesai. Situs: https://$DOMAIN"
[ -f "$CRED_FILE" ] && { echo "Login admin (juga tersimpan di $CRED_FILE):"; cat "$CRED_FILE"; }
grep -q '^GARDAHIJAU_API_USERNAME=$' "$ENV_FILE" && warn "Akun layanan API belum diisi: angka dampak belum muncul. Lihat DEPLOY.md bagian 5."
exit 0
