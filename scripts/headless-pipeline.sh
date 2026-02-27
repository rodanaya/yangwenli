#!/bin/bash
# Run a RUBLI pipeline task non-interactively (headless Claude Code)
# Usage: ./scripts/headless-pipeline.sh "score contracts starting from id 1500000"
# Usage: ./scripts/headless-pipeline.sh "run precompute_stats"
#
# Logs output to .claude/headless-runs/TIMESTAMP.log

TASK="${1:-}"
if [ -z "$TASK" ]; then
    echo "Usage: $0 '<task description>'"
    echo ""
    echo "Examples:"
    echo "  $0 'run /score-contracts --start-id 1500000'"
    echo "  $0 'run python -m scripts.precompute_stats from backend dir'"
    echo "  $0 'validate and load original_data/Contratos2025.csv'"
    exit 1
fi

LOGDIR="$(dirname "$0")/../.claude/headless-runs"
mkdir -p "$LOGDIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SLUG=$(echo "$TASK" | tr ' /\' '___' | cut -c1-40)
LOGFILE="$LOGDIR/${TIMESTAMP}_${SLUG}.log"

echo "Starting headless: $TASK"
echo "Log: $LOGFILE"
echo ""

claude --dangerously-skip-permissions \
    -p "RUBLI project at D:/Python/yangwenli. Task: $TASK. Implement directly — no planning. Report progress. Summarize in 3 bullets when done." \
    --allowedTools "Bash,Read,Glob,Grep,mcp__sqlite__read_query,mcp__sqlite__write_query" \
    2>&1 | tee "$LOGFILE"

echo ""
echo "Completed. Log: $LOGFILE"
