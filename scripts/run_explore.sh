#!/usr/bin/env bash
# run_explore.sh — launcher for the 12-hour autonomous explore harness.
#
# Usage:
#   bash scripts/run_explore.sh                  # 12 hours, headless, default out dir
#   bash scripts/run_explore.sh --hours 1        # short test run
#   bash scripts/run_explore.sh --headed         # watch the browser navigate
#
# The script ensures the output directory is unique per run and tees a log
# so you can see progress in real time without cluttering the JSONL streams.

set -euo pipefail
cd "$(dirname "$0")/.."

# Args: forward everything to the python script, but pre-fill --out with a
# timestamped directory if the user didn't pass one.
HAS_OUT=0
for a in "$@"; do
  if [ "$a" = "--out" ]; then HAS_OUT=1; fi
done

EXTRA=()
if [ $HAS_OUT -eq 0 ]; then
  STAMP=$(date +%Y%m%d_%H%M%S)
  EXTRA+=(--out "data/explore_runs/${STAMP}")
  mkdir -p "data/explore_runs/${STAMP}"
fi

# Preflight: confirm playwright is installed
if ! python -c "import playwright" 2>/dev/null; then
  echo "playwright not installed. Run:"
  echo "    pip install playwright"
  echo "    python -m playwright install chromium"
  exit 1
fi

LOG_FILE="${EXTRA[1]:-data/explore_runs/latest}/run.log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "Starting explore. Logs streaming to $LOG_FILE"
echo "Tail with: tail -f $LOG_FILE"

# Launch detached so the user can close their terminal and the run continues.
# nohup + & + disown means it persists across logout. On Windows this won't
# work — use Windows Terminal in a dedicated window or `start /b python ...`
nohup python scripts/automated_explore.py "${EXTRA[@]}" "$@" \
  >> "$LOG_FILE" 2>&1 &
PID=$!
echo "Launched as PID $PID."
echo "Kill with: kill $PID"
disown $PID || true
