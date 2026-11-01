#!/usr/bin/env bash
# =============================================================================
# BakeConnect & YouPi PG — Deploy to Hugging Face Spaces Script
# =============================================================================
set -e

SPACE_REPO_URL="$1"

echo "=========================================================="
echo "🥐 BAKECONNECT & YOUPI PG · HUGGING FACE SPACE DEPLOYER"
echo "=========================================================="

if [ -z "$SPACE_REPO_URL" ]; then
  echo "Usage: ./deploy/huggingface/deploy-to-hf.sh <HF_SPACE_GIT_URL>"
  echo ""
  echo "Example:"
  echo "  ./deploy/huggingface/deploy-to-hf.sh https://huggingface.co/spaces/jayant/bakeconnect-gateway"
  echo ""
  read -p "Enter your Hugging Face Space Git URL: " SPACE_REPO_URL
fi

if [ -z "$SPACE_REPO_URL" ]; then
  echo "❌ Error: Space repository URL is required."
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="/tmp/hf-bakeconnect-space"

echo "-> Preparing deployment workspace in $BUILD_DIR..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "-> Cloning Hugging Face Space repository..."
git clone "$SPACE_REPO_URL" "$BUILD_DIR" || {
  echo "Initialized fresh local git repository..."
  cd "$BUILD_DIR"
  git init
  git remote add origin "$SPACE_REPO_URL"
}

cd "$BUILD_DIR"

echo "-> Copying deployment manifests and configurations..."
cp "$PROJECT_ROOT/deploy/huggingface/Dockerfile" "$BUILD_DIR/Dockerfile"
cp "$PROJECT_ROOT/deploy/huggingface/README.md" "$BUILD_DIR/README.md"
cp "$PROJECT_ROOT/deploy/huggingface/nginx.conf" "$BUILD_DIR/nginx.conf"
cp "$PROJECT_ROOT/deploy/huggingface/entrypoint.sh" "$BUILD_DIR/entrypoint.sh"
chmod +x "$BUILD_DIR/entrypoint.sh"

mkdir -p "$BUILD_DIR/deploy/huggingface"
cp -r "$PROJECT_ROOT/deploy/huggingface/public" "$BUILD_DIR/deploy/huggingface/public"
cp "$PROJECT_ROOT/deploy/huggingface/nginx.conf" "$BUILD_DIR/deploy/huggingface/nginx.conf"
cp "$PROJECT_ROOT/deploy/huggingface/entrypoint.sh" "$BUILD_DIR/deploy/huggingface/entrypoint.sh"

echo "-> Syncing BakeConnect backend source..."
mkdir -p "$BUILD_DIR/backend"
rsync -av --exclude "target" --exclude ".git" "$PROJECT_ROOT/backend/" "$BUILD_DIR/backend/"

echo "-> Syncing YouPi PG ecosystem & Google Messages archive..."
mkdir -p "$BUILD_DIR/integrations/youpi-pg"
rsync -av --exclude "node_modules" --exclude ".git" "$PROJECT_ROOT/integrations/youpi-pg/" "$BUILD_DIR/integrations/youpi-pg/"

# Ensure Git LFS tracks tar.gz
if command -v git-lfs >/dev/null 2>&1; then
  git lfs install
  git lfs track "*.tar.gz"
  git add .gitattributes
fi

echo "-> Committing changes..."
git add -A
git commit -m "Deploy BakeConnect & Autonomous YouPi PG Gateway (Port 7860)" || echo "No changes to commit."

echo "-> Pushing to Hugging Face Spaces (main branch)..."
git push -u origin main || git push -u origin master || {
  echo "⚠️ Git push required authentication. If prompted, use your Hugging Face Access Token with WRITE permissions."
}

echo "=========================================================="
echo "🟢 DEPLOYMENT PUSH COMPLETE"
echo "=========================================================="
echo "Your Hugging Face Space is now building container image."
echo "Space URL: $SPACE_REPO_URL"
echo "=========================================================="
