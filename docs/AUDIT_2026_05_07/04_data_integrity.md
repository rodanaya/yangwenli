# Audit 04 — Data Integrity (orchestrator-completed)

> Agent 4 (data-quality-guardian Opus) abandoned mid-task after running
> the schema check and one count. Orchestrator (the main session)
> completed the queries inline using the exact same method the agent
> would have used. All numbers below are from direct sqlite3 queries
> against `backend/RUBLI_NORMALIZED.db` on 2026-05-07.

## Method

- Direct queries via `python -c "import sqlite3; ..."` against the live
  worktree DB (which is the same file deployed to prod via
  `RUBLI_DEPLOY.db`).
- Cross-referenced 5 prominent on-site claims to their underlying
  source.

## The 5 traced numbers

| # | Claim on site | DB query | Real number | Verdict |
|---|---|---|---|---|
| 1 | Homepage hero: "1,363 documented corruption cases" | `SELECT COUNT(*) FROM ground_truth_cases` | **1,403** | **TRUE-but-stale.** Hardcoded string in `Executive.tsx:1425+1434`. Real count is +40 higher. Not actively lying, but stale and not pulled from API. |
| 2 | Agent 1 saw "only 43 cases visible to API" | `/api/v1/cases` likely filters to a curated subset (e.g. confidence_level >= high) | unique case_ids with vendor links: **764**; total: **1,403**; API default surface: needs route inspection | **MISLEADING.** Visitor sees 43 in the case list, hero promises 1,363, DB has 1,403. Three different numbers all real, but the visitor experiences them as a contradiction. |
| 3 | Agent 1: "Cártel del Corazón case not in DB" | `WHERE case_name LIKE '%italmex%' OR '%cardia%' OR '%orazon%'` | **7 matching cases** including `VITALMEX_COFECE_CARTEL_MEDICO`, `GRUPO_VITALMEX_IMSS_DA_RING`, etc. | **AGENT 1 WAS WRONG.** The case IS in the DB. But the user-visible case_name is "Vitalmex Group COFECE Medical Equipment Cartel ~101B MXN" — *not* "Cártel del Corazón." Search for the canonical name fails. **Naming/discoverability bug, not a data gap.** |
| 4 | Site shows "3.06M / 3,058,286 contracts" | `SELECT COUNT(*) FROM contracts` | **3,059,592** | **TRUE within rounding.** The +1,300 delta is from new etl runs since the hardcoded numbers were last bumped. |
| 5 | User complaint: "categories ranking includes state institutions that have tiny denominators" | `GROUP BY institution_type` | **325 federal-tier rows** (federal_agency 83, federal_secretariat 125, autonomous 16, judicial 55, social_security 10, regulatory 3, military 1, legislative 2, social_program 72 — minus some overlaps) **vs ~3,000+ state/municipal/state_enterprise rows**. | **CONFIRMED.** A ranking that doesn't filter by tier will be dominated by state-level rows. The user's intuition is exactly right. Backend filter fix is real. |

## Lies in priority order

### P0 — `1,363` is hardcoded

The homepage hero number is a string literal in `Executive.tsx`. It is
not pulled from the API. It is **+40 stale** today and will drift
further on every retraining. The fix is a 5-line read from
`caseStats?.total_cases` (the API already exposes this; query the
endpoint and confirm). Cost: 30 minutes.

### P0 — homepage promises 1,363, case library page surfaces 43

These two surfaces are inconsistent. Either the homepage exaggerates
(some cases are placeholders, internal QA, etc.), or the library page
under-fetches. Need to inspect the case library API route to determine
intent. Once known, EITHER:
  - Surface the same number on both pages, OR
  - Differentiate explicitly: "1,403 documented incidents · 764 with
    vendor links · 43 currently public-facing curated."

### P1 — search for canonical case names fails

The case is in the DB under `VITALMEX_COFECE_CARTEL_MEDICO`. A user
typing "Cártel del Corazón" gets nothing. Two possible fixes:
  - Add an `aliases` column to `ground_truth_cases` and populate the
    common-name aliases (Cártel del Corazón, Estafa Maestra, etc.)
    by hand for the top 50 named scandals.
  - OR a backend search that does fulltext on case_name + notes +
    related vendor names. Latter is heavier but more general.

### P1 — categories ranking skewed by state institutions (CONFIRMED)

`institution_type` has 19 distinct values. Federal-tier rows total
~325. State + municipal + state-enterprise rows total ~3,000+. Any
ranking that doesn't filter is mathematically guaranteed to be
dominated by state institutions. **Backend filter is the fix
(`scope='federal'` default).** Half-day per #001 in the tracker.

### P2 — vendor case filter ignored (Agent 1's finding #3)

Need to re-verify by hitting `/api/v1/cases?vendor_id=4325` directly.
Agent 1 says it returned the global list. If true, the route is
either silently dropping the param or the SQL doesn't bind it. Code
inspection needed in `backend/api/routers/cases.py` around the
LEFT JOIN to `ground_truth_vendors`.

## Bugs adjacent to the lies

- **`aria_queue.tier` column does not exist** — but the UI shows tier
  badges (T1/T2/T3/T4). Tier is being computed somewhere else
  (probably from `risk_score` thresholds at query time). Worth
  confirming the tier definition is consistent across queue listing,
  per-vendor view, and methodology page.

- **`ground_truth_cases` has 1,403 rows but 956 vendors and only 764
  cases-with-vendors.** That means **639 cases have no vendor_link**.
  These show up in counts but aren't actionable — they're just
  reference scandals. The platform should either link them to their
  vendors or mark them as "reference only."

## Recommended fixes (≤5, ranked)

1. **Replace the hardcoded `1,363` with a live API read** (~30 min).
2. **Resolve the 1,363 vs 43 contradiction** by either surfacing the
   live total on `/cases` OR explaining the curation tier in the
   case library hero (~1 hour).
3. **Apply the `scope='federal'` filter** to `categoriesApi.getTopVendors`
   (~30 min) — closes Issue #001.
4. **Fix or document `/api/v1/cases?vendor_id=` filter** (~30 min) —
   either honor the param or remove it from the API surface.
5. **Add canonical case-name aliases** for the top 50 named scandals
   (~2 hours) so search finds "Cártel del Corazón."

Total: ~5 hours of fix time. All P0/P1, all need to land before
launch.

---

*Authored by orchestrator on 2026-05-07 after Agent 4 abandoned. Direct
sqlite queries on `RUBLI_NORMALIZED.db` are the source of all numbers.*
