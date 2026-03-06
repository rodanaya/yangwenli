#!/usr/bin/env bash
# Quick redeploy after code changes.
# Usage: ./scripts/redeploy.sh

set -euo pipefail

SERVER="root@37.60.232.109"
REMOTE_DIR="/opt/rubli"

echo "=== Redeploying RUBLI ==="

echo "[1/3] Pulling latest code on server..."
ssh "$SERVER" "cd $REMOTE_DIR && git pull origin main"

echo "[2/3] Rebuilding and restarting containers..."
ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --no-deps backend frontend"

echo "[3/3] Checking status..."
ssh "$SERVER" "docker compose -f $REMOTE_DIR/docker-compose.prod.yml ps"

echo ""
echo "=== Done ==="
echo "   http://37.60.232.109"
