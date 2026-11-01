# =============================================================================
# BakeConnect & YouPi PG Autonomous Ecosystem — Hugging Face Spaces Dockerfile
# =============================================================================

# ── Stage 1: Build BakeConnect Backend JAR (Java 21) ──────────────────────────
FROM maven:3.9.9-eclipse-temurin-21-alpine AS backend-builder
WORKDIR /app
COPY backend/pom.xml .
COPY backend/src ./src
RUN mvn clean package -DskipTests

# ── Stage 2: Build YouPi PG Packages (Node.js 22) ─────────────────────────────
FROM node:22-bookworm-slim AS youpi-builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY integrations/youpi-pg/package.json integrations/youpi-pg/package-lock.json ./
COPY integrations/youpi-pg/packages/ ./packages/
COPY integrations/youpi-pg/apps/ ./apps/
COPY integrations/youpi-pg/scripts/ ./scripts/
COPY integrations/youpi-pg/tsconfig.json ./tsconfig.json
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3 && (npm run build || true) && npm prune --omit=dev

# ── Stage 3: Runtime Environment ──────────────────────────────────────────────
FROM debian:bookworm-slim AS runner

# Avoid interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies: Java 21, Node.js 22, Chromium, PostgreSQL, Redis, Nginx
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    procps \
    tar \
    gzip \
    nginx \
    redis-server \
    postgresql \
    postgresql-client \
    openjdk-21-jre-headless \
    chromium \
    chromium-driver \
    fonts-liberation \
    fonts-noto-color-emoji \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Environment for Chromium headless execution
ENV CHROME_BIN=/usr/bin/chromium \
    CHROMIUM_BIN=/usr/bin/chromium \
    NODE_ENV=production

# Hugging Face Spaces expects user 1000 (user)
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /app

# Copy built application artifacts
COPY --from=backend-builder /app/target/bakeconnect-*.jar /app/bakeconnect.jar
COPY --from=youpi-builder /app /app/youpi-pg

# Copy Google Messages pre-paired backup archive and configurations
COPY integrations/youpi-pg/apps/sms-observer/assets/google-messages-paired-backup.tar.gz /app/assets/google-messages-paired-backup.tar.gz
COPY deploy/huggingface/nginx.conf /app/nginx.conf
COPY deploy/huggingface/entrypoint.sh /app/entrypoint.sh
COPY deploy/huggingface/public/ /app/public/

# Copy pre-configured SQLite DB if available
RUN if [ -f /app/youpi-pg/data/youpi_pg.sqlite ]; then cp /app/youpi-pg/data/youpi_pg.sqlite /app/assets/youpi_pg.sqlite; fi || true

# Grant permissions to user 1000
RUN chmod +x /app/entrypoint.sh \
 && mkdir -p /home/user/data /tmp/client_temp /tmp/proxy_temp_path /var/log/nginx /var/lib/nginx \
 && chown -R user:user /app /home/user /tmp /var/log/nginx /var/lib/nginx

USER user
WORKDIR /home/user

# Hugging Face Spaces listens on Port 7860
EXPOSE 7860

CMD ["/app/entrypoint.sh"]
