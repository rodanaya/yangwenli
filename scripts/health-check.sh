#!/usr/bin/env bash
# RUBLI Post-Deploy Health Check
# Usage: ./scripts/health-check.sh [base_url]
# Example: ./scripts/health-check.sh http://37.60.232.109

set -euo pipefail

BASE="${1:-http://37.60.232.109}"
PASS=0
FAIL=0

check() {
  local path="$1"
  local desc="$2"
  local expected="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path" --max-time 10 2>/dev/null || echo "000")
  if [[ "$code" == "$expected" ]]; then
    echo "[OK]   $desc"
    ((PASS++))
  else
    echo "[FAIL] $desc — expected $expected, got $code"
    ((FAIL++))
  fi
}

echo ""
echo "RUBLI Health Check"
echo "=================="
echo "Target: $BASE"
echo ""

check "/health"                                          "API root health"
check "/api/v1/health"                                   "API v1 health"
check "/api/v1/stats/dashboard/fast"                     "Dashboard stats"
check "/api/v1/executive/summary"                        "Executive summary"
check "/api/v1/aria/stats"                               "ARIA stats"
check "/api/v1/sectors"                                  "Sectors list"
check "/api/v1/search?q=pemex&limit=3"                   "Global search"
check "/api/v1/alerts/feed?days=30&limit=5"              "Alerts feed"
check "/api/v1/analysis/model/metadata"                  "Model metadata"
check "/api/v1/cases/stats"                              "Cases stats"

echo ""
echo "=================="
echo "Results: $PASS passed, $FAIL failed"
echo ""

if [[ $FAIL -eq 0 ]]; then
  echo "All checks passed."
  exit 0
else
  echo "$FAIL check(s) failed."
  exit 1
fi
