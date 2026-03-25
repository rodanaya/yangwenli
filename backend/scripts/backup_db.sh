#!/usr/bin/env bash
# backup_db.sh — Activate venv (if present) and run the Python backup script.
#
# Usage:
#   bash backend/scripts/backup_db.sh
#
# Cron example (daily at 02:30 local time):
#   30 2 * * * /path/to/project/backend/scripts/backup_db.sh >> /var/log/rubli_backup.log 2>&1
#
# The script is intentionally minimal: it just sets up the Python environment
# and delegates all logic to backup_db.py.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$BACKEND_DIR")"

echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — RUBLI backup starting"

# Activate virtual environment if it exists (common locations)
if [ -f "$PROJECT_DIR/.venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_DIR/.venv/bin/activate"
elif [ -f "$BACKEND_DIR/.venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source "$BACKEND_DIR/.venv/bin/activate"
elif [ -n "${VIRTUAL_ENV:-}" ]; then
    : # Already inside a venv
fi

# Run backup
python "$SCRIPT_DIR/backup_db.py"
EXIT_CODE=$?

echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — RUBLI backup finished (exit $EXIT_CODE)"
exit $EXIT_CODE
