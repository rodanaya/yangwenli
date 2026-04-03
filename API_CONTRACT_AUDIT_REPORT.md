# API CONTRACT AUDIT REPORT - RUBLI PLATFORM

Date: April 3, 2026
Status: CRITICAL ISSUES FOUND

## EXECUTIVE SUMMARY

Found 2 BLOCKER issues and 1 CRITICAL issue that will cause frontend-backend failures:

1. BLOCKER: Parameter name mismatch on /analysis/patterns/co-bidding
2. BLOCKER: Parameter name mismatch on /analysis/patterns/concentration  
3. CRITICAL: Per_page limit mismatch on /contracts (5000 vs 100)

---

## BLOCKER ISSUE #1: Co-bidding Parameter Name Mismatch

File: frontend/src/api/client.ts line 1099
File: backend/api/routers/analysis_patterns.py line 162

Frontend sends: min_co_bid_rate
Backend expects: min_rate

Frontend Code:
  const { data } = await api.get(`/analysis/patterns/co-bidding?min_co_bid_rate=${minCoBidRate}`)

Backend Code:
  min_rate: float = Query(50.0, ge=0, le=100, ...)

Impact: Frontend parameter is ignored, backend always uses default 50%

Fix: Change backend parameter to min_co_bid_rate

---

## BLOCKER ISSUE #2: Concentration Parameter Name Mismatch

File: frontend/src/api/client.ts line 1104
File: backend/api/routers/analysis_patterns.py line 261

Frontend sends: min_share_pct
Backend expects: min_share

Frontend Code:
  const { data } = await api.get(`/analysis/patterns/concentration?min_share_pct=${minSharePct}`)

Backend Code:
  min_share: float = Query(25.0, ge=10, le=100, ...)

Impact: Concentration analysis always uses default 25%, user input ignored

Fix: Change backend parameter to min_share_pct

---

## CRITICAL ISSUE: Per_page Limit Mismatch on /contracts Export

File: frontend/src/api/client.ts line 386
File: backend/api/routers/contracts.py line 74

Frontend tries: per_page=5000
Backend maximum: per_page=100

Frontend Code:
  per_page: filters.limit ?? 5000

Backend Code:
  per_page: int = Query(50, ge=1, le=100, ...)

Impact: Export requests silently capped at 100 records

Fix Options:
  A) Increase backend limit to 5000 (with performance review)
  B) Implement pagination loop in frontend

---

## WARNINGS

1. Inconsistent pagination parameter names across endpoints
   - Some use "per_page", others use "limit"
   - Causes API confusion

2. Parameter range validation ambiguity
   - Percentage params (0-100) vs decimal (0-1)
   - No clear documentation

---

## VALIDATION SUMMARY

✓ All 238+ backend endpoints exist
✓ Route prefixes correctly configured
✓ All routers properly included

✗ 2 BLOCKER parameter mismatches
✗ 1 CRITICAL per_page limit violation
⚠ 2+ WARNING issues

---

## REQUIRED ACTIONS

IMMEDIATE (before production):
1. Fix co-bidding parameter: min_rate -> min_co_bid_rate
2. Fix concentration parameter: min_share -> min_share_pct
3. Resolve per_page conflict: increase to 5000 or implement pagination

SOON:
4. Standardize pagination parameter names
5. Add comprehensive API documentation
6. Add integration tests

---

RECOMMENDATION: DO NOT DEPLOY export/analysis features until fixed.

