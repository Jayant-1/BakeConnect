#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🥐 STARTING BAKECONNECT & YOUPI PG ON HUGGING FACE SPACES"
echo "=========================================================="

# Create necessary directories in user home
mkdir -p /home/user/data/postgres
mkdir -p /home/user/data/browser-sessions/google-messages
mkdir -p /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

# Clean shutdown handler
cleanup() {
  echo "Shutting down gracefully..."
  nginx -s quit 2>/dev/null || true
  pg_ctl -D /home/user/data/postgres stop -m fast 2>/dev/null || true
  redis-cli shutdown nosave 2>/dev/null || true
  pkill -P $$ || true
  exit 0
}
trap cleanup SIGTERM SIGINT

# -----------------------------------------------------------------------------
# 1. Start PostgreSQL 16
# -----------------------------------------------------------------------------
echo "[1/6] Initializing & starting PostgreSQL 16..."
if [ ! -f /home/user/data/postgres/PG_VERSION ]; then
  echo "  -> Initializing fresh PostgreSQL cluster in /home/user/data/postgres..."
  initdb -D /home/user/data/postgres -E UTF8 --no-locale -U postgres > /dev/null
  echo "listen_addresses = '127.0.0.1'" >> /home/user/data/postgres/postgresql.conf
  echo "port = 5432" >> /home/user/data/postgres/postgresql.conf
  echo "host all all 127.0.0.1/32 trust" > /home/user/data/postgres/pg_hba.conf
  echo "local all all trust" >> /home/user/data/postgres/pg_hba.conf
fi

pg_ctl -D /home/user/data/postgres -o "-k /tmp" -l /tmp/postgres.log start

# Wait for PostgreSQL to become ready
until pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; do
  sleep 0.5
done
echo "  [✓] PostgreSQL is online."

# Create database if not present
psql -h 127.0.0.1 -p 5432 -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'bakeconnect_db'" | grep -q 1 || \
  psql -h 127.0.0.1 -p 5432 -U postgres -c "CREATE DATABASE bakeconnect_db;" > /dev/null
echo "  [✓] Database bakeconnect_db confirmed."

# -----------------------------------------------------------------------------
# 2. Start Redis Server
# -----------------------------------------------------------------------------
echo "[2/6] Starting Redis Server..."
redis-server --daemonize yes --port 6379 --dir /tmp --save "" --appendonly no > /dev/null
until redis-cli ping >/dev/null 2>&1; do
  sleep 0.5
done
echo "  [✓] Redis is online (PONG)."

# -----------------------------------------------------------------------------
# 3. Restore Pre-Paired Google Messages Web Session (Zero QR scanning needed)
# -----------------------------------------------------------------------------
echo "[3/6] Configuring Autonomous Google Messages Observer..."
PROFILE_DIR="/home/user/data/browser-sessions/google-messages"
if [ ! -d "$PROFILE_DIR/Default" ]; then
  if [ -f "/app/assets/google-messages-paired-backup.tar.gz" ]; then
    echo "  -> Extracting pre-paired Google Messages profile from backup archive..."
    tar -xzf /app/assets/google-messages-paired-backup.tar.gz -C "$PROFILE_DIR"
    echo "  [✓] Google Messages authenticated profile restored successfully."
  else
    echo "  [!] Warning: Backup archive not found at /app/assets/google-messages-paired-backup.tar.gz"
  fi
else
  echo "  [✓] Existing Google Messages session profile detected."
fi

# -----------------------------------------------------------------------------
# 4. Start YouPi PG Multi-Service Stack
# -----------------------------------------------------------------------------
echo "[4/6] Launching YouPi PG Gateway (Payment API, Checkout & Observer)..."
export YOUPI_ALLOW_LOCALHOST_MODE=true
export YOUPI_MODE=localhost
export ENABLE_GOOGLE_MESSAGES_SERVER=true
export GOOGLE_MESSAGES_DEBUGGING_PORT=9225
export CHROME_USER_DATA_DIR="$PROFILE_DIR"
export SQLITE_DB_PATH="/home/user/data/youpi_pg.sqlite"
export USE_SQLITE_FALLBACK=true
export PORT_PAYMENT_API=6100
export PORT_CHECKOUT=7000
export PORT_ADMIN=6001
export PORT_OBSERVER=6002
export ACTIVE_UPI_VPA="9699197282@ibl"
export ACTIVE_PAYEE_NAME="MRUNAL KAILASH JADHAV"

# Copy pre-configured SQLite DB if present in assets
if [ ! -f "$SQLITE_DB_PATH" ] && [ -f "/app/assets/youpi_pg.sqlite" ]; then
  cp /app/assets/youpi_pg.sqlite "$SQLITE_DB_PATH"
fi

cd /app/youpi-pg
node scripts/start.js > /tmp/youpi.log 2>&1 &

echo "  -> Waiting for YouPi Payment Core API (:6100)..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:6100/health | grep -q "UP"; then
    echo "  [✓] YouPi Payment API is UP."
    break
  fi
  sleep 1
done

# -----------------------------------------------------------------------------
# 5. Start BakeConnect Spring Boot Backend
# -----------------------------------------------------------------------------
echo "[5/6] Starting BakeConnect Spring Boot Backend..."
export SPRING_DATASOURCE_URL="jdbc:postgresql://127.0.0.1:5432/bakeconnect_db"
export SPRING_DATASOURCE_USERNAME="postgres"
export SPRING_DATASOURCE_PASSWORD=""
export REDIS_HOST="127.0.0.1"
export REDIS_PORT="6379"
export PAYMENT_PROVIDER="YOUPI_PG"
export PAYMENT_MODE="dev"
export YOUPI_PG_BASE_URL="http://127.0.0.1:6100"
export YOUPI_PG_API_KEY="mock_key"
export JWT_SECRET="404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
export YOUPI_PG_WEBHOOK_SECRET="mock_webhook_secret_32_bytes_long!"
export CORS_ALLOWED_ORIGINS="*"

cd /app
java -XX:+UseZGC -XX:+ZGenerational -Dnet.bytebuddy.experimental=true -jar /app/bakeconnect.jar > /tmp/backend.log 2>&1 &

echo "  -> Waiting for BakeConnect Backend (:8080) to run Flyway migrations & boot..."
for i in {1..45}; do
  if curl -s http://127.0.0.1:8080/actuator/health | grep -q "UP"; then
    echo "  [✓] BakeConnect Backend is UP (Flyway migrations applied)."
    break
  fi
  sleep 1
done

# -----------------------------------------------------------------------------
# 6. Start Internal Nginx Router on Port 7860
# -----------------------------------------------------------------------------
echo "[6/6] Starting Nginx on Hugging Face port 7860..."
nginx -c /app/nginx.conf

echo "=========================================================="
echo "🟢 BAKECONNECT & YOUPI PG ACTIVE ON PORT 7860"
echo "=========================================================="
echo "• Health Probe:    http://127.0.0.1:7860/health"
echo "• Backend API:     http://127.0.0.1:7860/api/v1/products"
echo "• Checkout Portal: http://127.0.0.1:7860/checkout/"
echo "• Status Portal:   http://127.0.0.1:7860/"
echo "=========================================================="

# Tail service logs to standard out
tail -f /tmp/nginx_access.log /tmp/nginx_error.log /tmp/backend.log /tmp/youpi.log
