#!/usr/bin/env bash
# RUBLI Hetzner Deployment Script
#
# Usage:
#   ./scripts/deploy-hetzner.sh <server-ip>
#
# Prerequisites:
#   - SSH key set up for root@<server-ip>
#   - .env.prod exists with CORS_ORIGINS set
#   - backend/RUBLI_DEPLOY.db exists
#   - Docker installed on server (see: apt install docker.io docker-compose-plugin)

set -euo pipefail

SERVER_IP="${1:-}"
if [[ -z "$SERVER_IP" ]]; then
  echo "Usage: $0 <server-ip>"
  exit 1
fi

REMOTE="root@${SERVER_IP}"
REMOTE_DIR="/opt/rubli"

echo "=== RUBLI Deploy to ${SERVER_IP} ==="

# 1. Check prerequisites
if [[ ! -f .env.prod ]]; then
  echo "ERROR: .env.prod not found. Copy .env.prod.example and fill in CORS_ORIGINS."
  exit 1
fi
if [[ ! -f backend/RUBLI_DEPLOY.db ]]; then
  echo "ERROR: backend/RUBLI_DEPLOY.db not found."
  echo "  Run: python backend/scripts/create_deploy_db.py"
  exit 1
fi

echo "[1/5] Creating remote directory..."
ssh "$REMOTE" "mkdir -p ${REMOTE_DIR}/backend"

echo "[2/5] Uploading deploy database (~2.4GB, this will take a while)..."
rsync -avz --progress \
  backend/RUBLI_DEPLOY.db \
  "${REMOTE}:${REMOTE_DIR}/backend/RUBLI_DEPLOY.db"

echo "[3/5] Uploading project files (excluding dev DB and node_modules)..."
rsync -avz --progress \
  --exclude='backend/RUBLI_NORMALIZED.db*' \
  --exclude='backend/RUBLI_DEPLOY.db' \
  --exclude='backend/*.db.backup*' \
  --exclude='backend/original_data/' \
  --exclude='frontend/node_modules/' \
  --exclude='frontend/dist/' \
  --exclude='.git/' \
  --exclude='*.pyc' \
  --exclude='__pycache__/' \
  . \
  "${REMOTE}:${REMOTE_DIR}/"

echo "[4/5] Uploading .env.prod..."
scp .env.prod "${REMOTE}:${REMOTE_DIR}/.env.prod"

echo "[5/5] Building and starting containers on server..."
ssh "$REMOTE" "
  cd ${REMOTE_DIR}
  docker compose -f docker-compose.prod.yml --env-file .env.prod pull 2>/dev/null || true
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
  echo ''
  echo 'Container status:'
  docker compose -f docker-compose.prod.yml ps
"

echo ""
echo "=== Deployment complete ==="
echo "   App: http://${SERVER_IP}"
echo "   API: http://${SERVER_IP}/api/v1/health"
echo ""
echo "To check logs:"
echo "   ssh ${REMOTE} 'docker compose -f ${REMOTE_DIR}/docker-compose.prod.yml logs -f'"
