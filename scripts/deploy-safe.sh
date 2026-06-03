#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-safe.sh — collision-proof production deploy for RUBLI.
#
# WHY THIS EXISTS: multiple agent sessions sometimes deploy to the same VPS at
# once. Two concurrent `docker compose up` runs race and collide on container
# names ("name already in use") and the bridge network ("already exists"), and
# the classic `down && up` pattern opens a window where the site is fully down.
# This script serializes deploys with an flock(1) lock so only one runs at a
# time, does an in-place `up` (no down-window), and auto-recovers from a
# collision by force-removing stale containers and retrying once.
#
# USAGE (on the VPS):   bash /opt/rubli/scripts/deploy-safe.sh
# It is idempotent and safe to run repeatedly / concurrently — extra callers
# queue on the lock (up to 10 min) instead of racing.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

REPO=/opt/rubli
LOCK="$REPO/.deploy.lock"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"
HEALTH_URL="https://rubli.xyz/api/v1/health"

cd "$REPO" || { echo "[deploy] cannot cd $REPO"; exit 1; }

# ── Serialize: acquire an exclusive lock; queued deploys wait up to 600s ──────
exec 9>"$LOCK"
echo "[deploy] acquiring lock…"
if ! flock -w 600 9; then
  echo "[deploy] FAILED to acquire deploy lock within 600s — another deploy is stuck"
  exit 1
fi
echo "[deploy] lock acquired ($(date -u +%H:%M:%SZ))"

# ── Sync code (VPS tracks origin/main, HEAD is master) ────────────────────────
git fetch origin -q
git reset --hard origin/main
echo "[deploy] at $(git log --oneline -1)"

# ── Force a clean frontend image FIRST. Docker layer-caching has repeatedly
#    served a STALE bundle (source changed but the cached `npm run build` layer
#    was reused) — a fresh hash that silently lacks the latest code. --no-cache
#    on the frontend guarantees the bundle reflects the checked-out source.
$COMPOSE build --no-cache frontend || { echo "[deploy] frontend --no-cache build FAILED"; exit 1; }

# ── In-place recreate (no down-window). Retry once with cleanup on collision ──
if ! $COMPOSE up -d --build --remove-orphans; then
  echo "[deploy] up failed (likely a stale-container collision) — cleaning + retrying"
  docker rm -f rubli-frontend rubli-backend rubli-caddy rubli-aria-cron rubli-backup-cron 2>/dev/null || true
  docker network rm rubli_rubli-network 2>/dev/null || true
  $COMPOSE up -d --remove-orphans || { echo "[deploy] retry FAILED"; docker ps -a --format '{{.Names}}\t{{.Status}}'; exit 1; }
fi

# ── Verify edge + backend health ──────────────────────────────────────────────
sleep 4
for i in 1 2 3 4 5; do
  if curl -sf -o /dev/null "$HEALTH_URL"; then
    echo "[deploy] OK — backend healthy"
    break
  fi
  [ "$i" = 5 ] && echo "[deploy] WARN — health check still failing after retries"
  sleep 3
done

echo "[deploy] containers:"
docker ps --format '{{.Names}}\t{{.Status}}'
echo "[deploy] done ($(date -u +%H:%M:%SZ))"
