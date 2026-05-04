#!/bin/bash
set -e
cd /opt/rubli
echo "=== RUBLI Deploy $(date -u '+%Y-%m-%d %H:%M UTC') ==="
git fetch origin
git reset --hard origin/main

# Step 1: stop and remove the stack cleanly (down --remove-orphans is best-effort
# but sometimes leaves orphan containers around because of HUP-killed prior runs).
docker compose -f docker-compose.prod.yml --env-file .env.prod down --remove-orphans || true

# Step 2: nuke any lingering containers/networks by name. Defensive — handles
# the case where a previous deploy was HUP-killed mid-flight and left containers
# without their compose project metadata. Suppresses errors when nothing exists.
docker rm -f rubli-backend rubli-frontend rubli-caddy rubli-aria-cron rubli-backup-cron 2>/dev/null || true
docker network rm rubli_rubli-network 2>/dev/null || true

# Step 3: build + bring up
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo "=== Deploy complete ==="
docker ps --format 'table {{.Names}}\t{{.Status}}'
