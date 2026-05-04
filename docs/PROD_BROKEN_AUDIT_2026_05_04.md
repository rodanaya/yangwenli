# Production Broken Endpoint Audit — 2026-05-04

Backend: https://rubli.xyz · Health: OK · DB: connected (3,058,286 contracts, 6.4 GB)

---

## Endpoint Triage Table

| endpoint | HTTP | symptom | root cause | fix complexity |
|---|---|---|---|---|
| `GET /api/v1/sectors/{id}/model-coefficients` | 500 | `TypeError: bad operand type for abs(): 'list'` | In `sectors.py:1240`, `sorted_coefs` lambda calls `abs(x["coefficient"])` but `coefficient` is a list (v0.8.5 calibration stores CI bounds as a list alongside the float). | Low — unwrap float before sorting |
| `GET /api/v1/analysis/flash-vendors` | 503 | `DB error: no such column: i.institution_name` | Query references `i.institution_name` but the institutions table likely uses `name`. Column rename not reflected in query. | Low — fix column alias in SQL query |
| `GET /api/v1/analysis/value-concentration` | 503 | `DB error: no such column: v.vendor_name` | Same pattern — query references `v.vendor_name`; actual column is probably `name`. | Low — fix column alias in SQL query |
| `GET /api/v1/investigation/feature-importance` | 404 | `No feature importance found for global model with method shap` | Data not seeded — `investigation_feature_importance.py` was never run against the deployed DB. Route exists; table is empty. | Low — run seed script on VPS |
| `GET /api/v1/investigation/model-comparison` | 422 | `Field required: sector_id` | Backend requires `?sector_id=N` but client calls it without. The `analysisApi.getModelComparison()` in client.ts hits `/investigation/model-comparison` with no params. | Low — add `sector_id` as optional or make backend default to global |
| `GET /api/v1/networks?limit=10` | 404 | Route does not exist | Frontend tested wrong path. Actual prefix is `/network` (singular). Backend routes are `/network/graph`, `/network/co-bidders/{id}`, `/network/communities`. All those return 200. | None — frontend uses correct `networkApi` (which uses `/network`) |
| `GET /api/v1/network/communities/{id}` | 000 (timeout) | Request hangs; never returns | Community detail query likely unindexed or scans full edge table. Backend logs show communities list at 200 OK, but detail by ID times out. | Medium — investigate query plan, add index |
| `GET /api/v1/stats/overview` | 404 | Route does not exist | Client.ts uses `getFastDashboard` → `/stats/dashboard/fast` (200 OK). `/stats/overview` is a stale path — no frontend code calls it. | None — dead path, not used |
| `GET /api/v1/reports/sector/{id}` | 000 (timeout) | **346 seconds** before response | Sector report aggregates across 3M rows with no cache. Backend logs confirm `slow_request 346531ms`. Frontend 30s axios timeout fires first — user sees error. | High — add server-side cache or precompute |
| `GET /api/v1/analysis/admin-breakdown` | 000 (timeout) | 64–80 seconds | Crosses 23 years × 12 sectors. Backend eventually returns 200, but axios 30s timeout fires first. | Medium — add Redis/in-memory cache |
| `GET /api/v1/analysis/political-cycle` | 000 (timeout) | 56–85 seconds | Full 23-year political cycle aggregation, no cache. | Medium — add cache |
| `GET /api/v1/analysis/leads?limit=N` | 000 (timeout) | **169 seconds** | Investigation leads query is the slowest non-report endpoint. Always exceeds 30s client timeout. | High — precompute or paginate differently |
| `GET /api/v1/analysis/patterns/concentration` | 000 (timeout) | >30 seconds | Pattern scan across entire contract table. | Medium — add cache |
| `GET /api/v1/analysis/validation/factor-lift` | 000 (timeout) | 76 seconds | GT cross-join against 3M contracts. | Medium — precompute at scoring time |
| `GET /api/v1/cases/{id}` | 404 | `Case '1' not found` | Cases use slug IDs (`/cases/{slug}`), not integer IDs. Route `/cases/{slug}` works correctly. The integer route is a 404. | None — frontend pages should already use slugs; confirm no page calls `/cases/1` |
| `GET /api/v1/stories` | 404 | Route does not exist | Backend has `/stories/packages`, `/stories/ghost-companies`, etc. No bare `/stories` index. | Low — if a page needs it, add an index route or point to `/stories/packages` |
| `GET /api/v1/vendors/1/similar-cases` | 200 but slow | 6,992ms — triggers `slow_request` warn | Full-table similarity scan. Returns data but is near the timeout boundary. | Medium — index or cache |

---

## Confirmed Working (sample)

All core data endpoints are healthy:

- `/api/v1/health` — 200, DB connected, 3.06M contracts
- `/api/v1/sectors`, `/api/v1/sectors/{id}` — 200
- `/api/v1/sectors/{id}/trends`, `/api/v1/sectors/{id}/temporal-anomaly` — 200
- `/api/v1/vendors`, `/api/v1/vendors/{id}` and all sub-endpoints — 200
- `/api/v1/institutions` and all sub-endpoints — 200
- `/api/v1/aria/queue`, `/api/v1/aria/stats` — 200
- `/api/v1/cases` (list), `/api/v1/cases/stats`, `/api/v1/cases/{slug}` — 200
- `/api/v1/analysis/overview`, `/api/v1/stats/dashboard/fast` — 200
- `/api/v1/analysis/risk-distribution`, `/api/v1/analysis/year-over-year` — 200
- `/api/v1/network/graph`, `/api/v1/network/co-bidders/{id}`, `/api/v1/network/communities` — 200
- `/api/v1/collusion/pairs`, `/api/v1/collusion/stats` — 200
- `/api/v1/analysis/feature-importance` (global SHAP, correct path) — 200
- `/api/v1/reports/vendor/{id}`, `/api/v1/reports/institution/{id}` — 200

---

## TOP 5 Things to Fix First (ranked by user-visible impact)

### 1. `GET /api/v1/sectors/{id}/model-coefficients` — 500 on every Sector dossier
**Impact**: The Sector detail page (`/sectors/:id`) renders `<SectorModelCoefficients>` which always throws. Every sector page is partially broken.
**Fix**: In `backend/api/routers/sectors.py:1240`, extract the scalar from the coefficient before `abs()`:
```python
key=lambda x: abs(x["coefficient"] if isinstance(x["coefficient"], (int, float)) else x["coefficient"][0])
```

### 2. `GET /api/v1/analysis/flash-vendors` + `value-concentration` — 503 (DB column errors)
**Impact**: Vendors tab and Institutions tab each render a broken widget. The Explore page is visually degraded.
**Fix**: In `backend/api/routers/analysis_vendor_sector.py`, change `i.institution_name` → `i.name` and `v.vendor_name` → `v.name` (or whatever the actual column is).

### 3. `GET /api/v1/analysis/leads` — 169s timeout (investigation leads widget dead)
**Impact**: Any page that shows investigation leads (Dashboard summary panel, ARIA queue) silently fails — users see a spinner that never resolves. This is the highest-latency endpoint in the system.
**Fix**: Precompute lead scores into a materialized table at pipeline run time; endpoint becomes a simple SELECT.

### 4. `GET /api/v1/reports/sector/{id}` — 346s timeout
**Impact**: Sector report page is completely unusable. 346 seconds is 11× the 30s axios timeout.
**Fix**: Cache the sector report at container startup (or on first request with background computation + 202 Accepted → poll pattern).

### 5. `GET /api/v1/analysis/admin-breakdown` + `political-cycle` — 64–85s timeouts
**Impact**: The Administrations page (`/administraciones`) and any political-cycle chart consistently hit the frontend 30s timeout, rendering blank or error state.
**Fix**: Both endpoints are pure aggregations that don't change without a new ETL run — add a simple server-side in-memory LRU cache (TTL = 1 hour). No DB changes required.

---

## Bonus: Not a bug, but worth noting

- `GET /api/v1/investigation/feature-importance` returns a correct 404-with-message ("run seed script"). The route exists — `investigation_feature_importance.py` just needs to be executed on the VPS once.
- `GET /api/v1/investigation/model-comparison` returns 422 because `sector_id` is required. The global comparison needs a default or `sector_id=0` convention.
- `/api/v1/network/communities/{id}` (community detail) times out — lower priority as community detail is not on a critical user path.
