#!/bin/sh
# ARIA Daily Pipeline + Memo Generation
# Runs inside the backend container via the cron service.
# Triggered daily at 03:00 UTC by docker-compose cron container.
#
# Usage:
#   docker exec rubli-backend sh /app/scripts/aria_cron.sh

set -e

cd /app

echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — ARIA daily pipeline starting"

# Phase 1: Run the ARIA pipeline (IPS scoring + pattern classification + FP screening)
python -m scripts.aria_pipeline 2>&1
PIPELINE_RC=$?

if [ $PIPELINE_RC -ne 0 ]; then
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — ARIA pipeline FAILED (rc=$PIPELINE_RC)"
    exit $PIPELINE_RC
fi

echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — ARIA pipeline completed, generating memos"

# Phase 2: Generate memos for Tier 1 (top priority)
python -m scripts.aria_generate_memos --tier 1 --limit 20 2>&1 || true

# Phase 3: Generate memos for Tier 2
python -m scripts.aria_generate_memos --tier 2 --limit 30 2>&1 || true

echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — ARIA daily run complete"
