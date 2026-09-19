# Story Day 4 — `captura-institucional` («El edificio que construyó la captura»)

Story: `frontend/src/lib/story-content.ts` slug `captura-institucional` (5 chapters: ch1 "The Worst Address" (IMSS), ch2 "1.06 Trillion Pesos" (seven institutions, typed `inline-bar`), ch3 "The Toll Booths" (intermediaries, typed `editorial-cleveland-pair`), ch4 "Mexico Already Prosecuted This" (La Estafa Maestra), ch5 "The Keys Hang Unused" (18,897 flagged vendors)); front-page card "Inside Institutional Capture: 15,923 Vendors at Three Agencies" (sub "IMSS · CFE · PEMEX", amount 787, contracts 530000).
Plumbing from Days 1–3 (`components/stories/live/*`, `StickyStepFigure`, `SeriesLine`, `ChartCard` wrapping eyebrow row, zero-clip gate § 7).

## Audit (prod, 2026-09-18)

| Claim | Live source |
|---|---|
| "IMSS: 3,415 flagged vendors, 401.8B pesos, one pattern (P6)"; "seven institutions… 1.06 trillion"; leadStat 15,923; "18,897 flagged vendors" | ARIA P6 = "Captura institucional", **15,939 vendors, 1.29T MXN** (`/atlas/cluster-stats?lens=patterns`; `/aria/stats` pattern_counts P6 15939). Per-institution P6 sums have **no endpoint** — `/aria/queue?pattern=P6` rows carry `top_institution` + `total_value_mxn` but 15,939 rows × 100/page is not a client-side job. → Day 4 adds ONE backend aggregate (below). |
| capture trajectories, crossing years, "captured now" | `/capture/top?limit=200[&sector_id]` → per (institution, vendor): `earliest/peak/latest_share_pct`, `peak_year`, `cumulative_value_mxn`, `institution_total_window`, `score`, `timeline[{year, share_pct, value_mxn}]`, `aria`; `/capture/landscape` → `qualifying_count` 1,424, `captured_now_count` 119, `antesala_count` 46, `aria_p6_total` 15,939, `thresholds {floor 25%, ceil 50%}`, `monotonic_institution_ids`, `ticks`. Live components on `/captura`: `CaptureFilm` (data, thresholds, landscape, lang), `CaptureTrajectory` (timeline, ceil, peakYear, peakSharePct, latestSharePct, lang, variant), `CaptureNowLedger` (landscape, lang), `FunnelStrip`, `MoneySledgehammer`, `captureAxis` (shareBand, ThresholdRules). |
| institution ids | IMSS **251** (662,001 contracts) · CFE **104** · PEMEX corporate **1201** / Refinación **314** / Exploración **311** · SCT **345** (+ SICT 3671) · CONAGUA **117** |
| ch3 intermediaries "19.6% of infrastructure at-risk spend", 179.5B | P3 cohort: `/atlas/cluster-stats?lens=patterns` P3 = 2,972 vendors, 556.5B; per-sector P3 split needs `/aria/queue?pattern=P3&sector_id=3` (paged) — the executor computes the infrastructure share from the queue with a page cap and prints "computed from N of M rows" if capped, or uses the aggregate endpoint below with `pattern=P3` grouped by `sector_id`. |
| ch4 La Estafa Maestra "79–158B" | documented case — `/cases?search=estafa` (check `caseApi`), else keep typed with its source citation; a case chip is allowed only with a verified case slug (Day 1 rule). |

Chart forms: institution × vendor share over time → small multiples of share trajectories with the 25/50% threshold rules (the `/captura` grammar); ranking of institutions by pattern value → horizontal bar with a printed mean rule; nested counts → funnel; two-period per-sector share → dumbbell; a case timeline → the existing `FraudTimelineRibbon` if the case has dated events (else none).

## Keep
Five chapters, headlines/deks where true, the ASF citation, the newsroom voice, ClosingCoda, folio chrome.

## Backend (allowed, minimal, tested) — `GET /api/v1/aria/patterns/{code}/institutions`
`backend/api/routers/aria.py`: `code` ∈ P1–P7; returns `{ code, label_es, label_en, total_vendors, total_value_mxn, rows: [{ institution_id, institution, vendor_count, total_value_mxn }] }` ordered by value desc, `limit` (default 12, ≤ 50), computed from `aria_queue` rows where `primary_pattern = code` grouped by `top_institution` (check the actual column names in the aria_queue schema — `top_institution` may be a name string; if an id exists, return both). Parameterized SQL only. Cache 10 min like the other aria endpoints. Test `backend/tests/test_aria_pattern_institutions.py` (3 cases: known code, unknown code → 404, limit bound). Run `python -m pytest backend/tests/test_aria*.py -q -p no:cacheprovider`. Add `ariaApi.getPatternInstitutions(code, limit)` in `client.ts` + the type in `types.ts`. Note: prod must pick this up on deploy (full stack deploy does).

## Change 0 — fact refresh (EN + ES; before → after ledger in the commit)
Every number in the story that the new endpoint / `/capture/*` / `/atlas/cluster-stats` carries: P6 cohort size (15,923 → live), P6 total, per-institution P6 values (401.8B IMSS, 1.06T seven institutions → live top-7), "3,415 flagged vendors at IMSS" → live vendor_count for IMSS, the ch2 bar data, ch3 intermediaries figures (recomputed or removed if not computable), the card (`contracts` 530000, `amount` 787, sub, brief). Where a claim cannot be sourced (e.g. "twelve percent of an annual federal budget" — keep only if the budget figure is cited), drop or cite. Entities: IMSS (251), CFE (104), PEMEX (1201), SCT (345), CONAGUA (117) as institution chips + the top captured vendors per `/capture/top` for IMSS (vendor chips with ids).

## Figures (5)

### F1 · Ch1 (hero, scrolly) «La dirección» — IMSS capture trajectories (live: `capture-imss`)
- From `/capture/top?limit=200` filtered to `institution_id === 251` (if fewer than 3 rows, widen to sector 1 and say so): small multiples of `CaptureTrajectory` (variant `card`) for the top 6 vendors by `cumulative_value_mxn`, each with the 25% / 50% `ThresholdRules`, crossing year and peak share printed; vendor chips in the card headers. Stages: 0 = the field (all six, muted); 1 = highlight the ones that crossed 50% (`shareBand === 'captured'`) ; 2 = label crossing years; 3 = the sum line. Anchor = the IMSS P6 value from the new endpoint + "in P6 capture-pattern contracting at IMSS" / ES. Annotation: what share means (vendor's share of the institution's annual spend), honesty on the 25/50 thresholds.
- Accept: ≥ 3 trajectories; every printed share/peak/crossing equals `/capture/top`; anchor equals the endpoint; stages 0→3.

### F2 · Ch2 «Las siete direcciones» — P6 value by institution, live (live: `capture-institutions`)
- Horizontal ranked bars, top 7 from the new endpoint (+ "others" bar for the remainder of the cohort total), a printed mean rule, IMSS highlighted, institution chips (`EntityIdentityChip type="institution"`) where an id is available; below: the cohort funnel (`FunnelStrip`: P6 vendors 15,939 → qualifying captures 1,424 → captured now 119 from `/capture/landscape`). Anchor = the seven-institution total + "across the seven most captured buyers" / ES.
- Accept: bars equal the endpoint; funnel equals landscape; the typed `inline-bar` removed.

### F3 · Ch3 «Las casetas» — intermediaries by sector (live: `capture-intermediaries`)
- P3 vendors' value per sector from the aggregate endpoint with `pattern=P3` grouped by sector (add a `group=sector` option to the new endpoint, same query shape) → 12-row dumbbell or bar of P3 share of each sector's P6+P3 flagged value — the executor picks the form the data supports and writes the caption from data; infrastructure highlighted. If the data cannot support "19.6% of at-risk spend", the chapter's dek and pull-quote change to what it does support.
- Accept: rows equal the endpoint; no unsourced percentage remains in ch3.

### F4 · Ch4 «El plano» — La Estafa Maestra, documented (live only if `/cases` has it: `capture-estafa`)
- If `caseApi` returns the case (slug verified): a `FraudTimelineRibbon` (existing component, check its props) of the case's dated events + the case chip; the "79–158B" stays only with its source line. If no case record: no new figure; the chapter keeps its pull-quote and gains the two successor-vendor chips named in prose (verify ids by `/vendors?search=`).

### F5 · Ch5 (closing) «Las llaves» — the queue that no one opens (live: `capture-queue`)
- From `/aria/stats` + `/aria/queue?pattern=P6&tier=1&per_page=…`: a two-row ledger — P6 cohort 15,939 · Tier 1 among them (count from `/aria/queue?pattern=P6&tier=1` pagination.total) · in ground truth (`novel_only` complement) · reviewed / confirmed (`/aria/stats` review_stats) — as a horizontal "what the state could open" strip (FunnelStrip reuse) with the counts printed; anchor = the number of P6 T1 vendors not yet in ground truth ("leads no one has picked up" / ES). Replaces the "18,897" claim with the live figure.
- Accept: every count equals the endpoints at probe time.

## Story data changes
ch1 `live: 'capture-imss', scrolly: true`; ch2 `live: 'capture-institutions'` (typed bar removed); ch3 `live: 'capture-intermediaries'` (typed cleveland pair removed unless its numbers are re-sourced); ch4 `live: 'capture-estafa'` only if the case exists; ch5 `live: 'capture-queue'`. Entities as in Change 0.

## Acceptance (`sd04.mjs`, 1440 + 390, EN + ES)
≥ 4 live figures; numbers equal the endpoints (probe recomputes, including the new aggregate); retired numbers absent (15,923 / 401.8 / 1.06T / 3,415 / 18,897 / 530,000 / 787 unless they still hold); stages 0→3; Days 1–3 scrollies still step; `clipcensus.mjs` 0 (EN + ES, 4 widths) on the story and on `/captura` (shared components); `/captura` renders unchanged (probe its top ledger counts before/after); backend tests green; 0 console errors; card headline == story h1.

## Result + Deploy

Built by `story-day04` (stalled in a hung tool call after building; stopped) and finished by `story-day04-b` from the dirty tree. Judged by Fable on `_parallax_shots/story-days/sd04/after/` (f1–f5 at 1440/390, chapters, sticky). The story had the arrow backwards: `top_institution_ratio` is a vendor's dependence on a buyer (≥ 0.80 across the cohort, mean 0.96), not a buyer's captured budget — 3,468 flagged vendors route ≥ 80% of their contracting to IMSS, and IMSS is not among the 13 buyers where one supplier climbed floor to ceiling. Headline "The Suppliers Who Cannot Leave" / "Los proveedores que no pueden irse"; ch4 states La Estafa Maestra's acquittal (SCJN 2024, 7.67B, 2013–14). Ledger: 15,923 → 15,939 · 3,415 → 3,468 · 401.8B → 405.3B (as anchor) · 1.06T → 1.08T · 526B → 556.5B · 19.6% → 12.1% · 18,897 → 18,242 · card 787 → 1,077, 530,000 dropped. Judge round: F1's two "Baxter" rows now carry register numbers, value and contract count (`aa072940`). `CaptureTrajectory` callouts clamped into the plot (`/captura` 4 → 0 clips). Gates: tsc 0 · build OK · lint:tokens PASS · pytest test_aria* 92 passed · sd04 probe ALL PASS · census 0 (story + `/captura`, EN + ES, 4 widths).

Deployed 2026-09-19 ≈03:15 CET via `deploy-safe.sh` (VPS HEAD `55833ffd`). Commits `b01cf625` (api) · `32ed926e` · `aa072940` · docs · BUILD_ID `55833ffd` (`2026-09-19-story-d4-captura`). Entry `index-BK4oYxLc.js` → `index-CjEQ0Jbo.js`; BUILD_ID string served; health OK; `GET /api/v1/aria/patterns/P6/institutions` live on prod (cohort 15,939 · 1.29T · GT 217 · reviewed 388 · confirmed 54).

## Build notes
Branch `story/day-04-captura` off origin/main after Day 3 ships. Backend: run the tests; the local backend for the new endpoint needs `DATABASE_PATH=D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db` + `uvicorn api.main:app --port 8002` from `backend/` — the dev frontend points at prod (`VITE_API_URL=https://rubli.xyz`), so for the new endpoint either run the frontend against the local backend on 8002 (`VITE_API_URL=http://127.0.0.1:8002`) for the probe, or stub the probe's expectation from the local endpoint and re-verify on prod after deploy. Cold start scans 3.1M rows (30–60 s). Commit: `feat(stories § SD-04 captura-institucional): live capture figures — IMSS trajectories scrolly, P6 by institution (new aggregate endpoint), intermediaries by sector, the unopened queue; facts refreshed` (+ a separate `feat(api § aria): pattern institutions aggregate` commit first). Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No BUILD_ID, push or deploy.
