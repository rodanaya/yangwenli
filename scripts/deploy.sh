#!/usr/bin/env bash
# RUBLI Deployment Script
#
# Usage:
#   ./scripts/deploy-hetzner.sh <server-ip> [--user ubuntu]
#
# Defaults:   --user root   (Hetzner, Vultr, Contabo)
# Oracle:     --user ubuntu (Oracle Cloud Free Tier)
#
# Prerequisites:
#   - SSH key set up for <user>@<server-ip>
#   - .env.prod exists with CORS_ORIGINS set
#   - backend/RUBLI_DEPLOY.db exists

set -euo pipefail

SERVER_IP="${1:-}"
SSH_USER="root"

# Parse optional --user flag
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --user) SSH_USER="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$SERVER_IP" ]]; then
  echo "Usage: $0 <server-ip> [--user ubuntu]"
  exit 1
fi

REMOTE="${SSH_USER}@${SERVER_IP}"
# Use home dir for non-root users (Oracle), /opt for root
if [[ "$SSH_USER" == "root" ]]; then
  REMOTE_DIR="/opt/rubli"
else
  REMOTE_DIR="/home/${SSH_USER}/rubli"
fi

echo "=== RUBLI Deploy to ${SERVER_IP} (user: ${SSH_USER}) ==="

# 1. Check prerequisites
if [[ ! -f .env.prod ]]; then
  echo "ERROR: .env.prod not found."
  echo "  Create it with: echo 'CORS_ORIGINS=http://${SERVER_IP}' > .env.prod"
  exit 1
fi
if [[ ! -f backend/RUBLI_DEPLOY.db ]]; then
  echo "ERROR: backend/RUBLI_DEPLOY.db not found."
  echo "  Run: cp backend/RUBLI_NORMALIZED.db backend/RUBLI_DEPLOY.db"
  exit 1
fi

echo "[1/6] Creating remote directory..."
ssh "$REMOTE" "mkdir -p ${REMOTE_DIR}/backend"

echo "[2/6] Installing Docker (if not present)..."
ssh "$REMOTE" "
  if ! command -v docker &>/dev/null; then
    echo 'Installing Docker...'
    curl -fsSL https://get.docker.com | sh
    if [[ '$(whoami)' != 'root' ]]; then
      sudo usermod -aG docker \$(whoami)
      newgrp docker
    fi
  else
    echo 'Docker already installed.'
  fi
"

echo "[3/6] Opening firewall port 80..."
ssh "$REMOTE" "
  # UFW (Ubuntu default)
  if command -v ufw &>/dev/null; then
    sudo ufw allow 80/tcp 2>/dev/null || true
  fi
  # Oracle Cloud iptables (blocks port 80 even after security list change)
  if sudo iptables -L INPUT -n 2>/dev/null | grep -q 'REJECT\|DROP'; then
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
    sudo sh -c 'iptables-save > /etc/iptables/rules.v4' 2>/dev/null || true
  fi
"

echo "[4/6] Uploading deploy database (~3.9GB, this will take a while)..."
if command -v rsync &>/dev/null; then
  rsync -avz --progress \
    backend/RUBLI_DEPLOY.db \
    "${REMOTE}:${REMOTE_DIR}/backend/RUBLI_DEPLOY.db"
else
  echo "  rsync not found — using scp (slower, no delta)"
  scp -o ServerAliveInterval=30 -o ServerAliveCountMax=20 \
    backend/RUBLI_DEPLOY.db \
    "${REMOTE}:${REMOTE_DIR}/backend/RUBLI_DEPLOY.db"
fi

echo "[5/6] Uploading project files via git pull..."
# Use git push/pull for source code (faster than scp on Windows where rsync is unavailable)
git push origin HEAD:main 2>/dev/null || true
ssh "$REMOTE" "cd ${REMOTE_DIR} && git pull origin main 2>&1 | tail -5"

# Upload .env.prod and fix any Windows encoding issues
scp .env.prod "${REMOTE}:${REMOTE_DIR}/.env.prod"
ssh "$REMOTE" "cd ${REMOTE_DIR} && tr -d '\0' < .env.prod > .env.prod.clean && mv .env.prod.clean .env.prod && sed -i 's/\r//' .env.prod"

echo "[6/6] Building and starting containers on server..."
ssh "$REMOTE" "
  cd ${REMOTE_DIR}
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
echo ""
echo "To redeploy after code changes:"
echo "   $0 ${SERVER_IP} --user ${SSH_USER}"
