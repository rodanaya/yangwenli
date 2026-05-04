#!/bin/bash
set -e
cd /opt/rubli
echo "=== RUBLI Deploy $(date -u '+%Y-%m-%d %H:%M UTC') ==="
git fetch origin
git reset --hard origin/main
docker compose -f docker-compose.prod.yml --env-file .env.prod down --remove-orphans
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
echo "=== Deploy complete ==="
docker ps --format 'table {{.Names}}\t{{.Status}}'
