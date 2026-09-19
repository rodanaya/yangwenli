# Story Day 7 — `el-umbral-de-los-300k` («Una línea en la ley, y la multitud debajo de ella»)

Story: `frontend/src/lib/story-content.ts` slug `el-umbral-de-los-300k` (3 chapters: ch1 "Stand at the Line" (typed `inline-spike`, 200K–400K in 10K buckets), ch2 (typed `inline-roster`), ch3; leadStat 28,264; the typed numbers: 210K = 28,264 vs 200K = 16,075 (+76%), 250K = 24,966 vs 240K 23,331 / 260K 24,841, 300K = 22,064 vs 290K 18,925, 3.05M contracts); card "The 300,000-Peso Threshold".
Plumbing from Days 1–6. `GET /analysis/threshold-gaming` exists but returns zeros (`total_flagged 0`) — **degraded, do not use**.

## Backend (allowed, minimal, tested, cached) — `GET /api/v1/analysis/amount-histogram`
`backend/api/routers/analysis.py`. Params: `min` (default 200000), `max` (default 400000), `bucket` (default 10000, ≥ 1000), `exact` (comma list, default `210000,250000,300000`), `year_from`/`year_to` optional, `institution_id` optional. Response: `{ buckets: [{ from, to, count, direct_award_count }], exact: [{ amount, count, direct_award_count, neighbours: { minus_1000: count, plus_1000: count } }], by_year: [{ year, exact_total, contracts_in_range }], top_institutions: [{ institution_id, institution, exact_count, range_count }] (limit 20), total_contracts, total_in_range, computed_at }`. Parameterized SQL over `contracts` (`amount_mxn` ≤ `MAX_CONTRACT_VALUE` guard as elsewhere; check whether an index on `amount_mxn` exists — if not, note the scan time and rely on the 10-min cache like `monthly-breakdown`). Test `backend/tests/test_amount_histogram.py` (shape, bucket arithmetic on a fixture, `exact` parsing, bounds). `analysisApi.getAmountHistogram(params)` + types. Verify the three spike counts against the story's typed numbers in the report (they may have moved with the September data).

## Audit
The story's argument is sound and its numbers were computed from the register in May; the risk is drift, not falsehood. Change 0 = recompute every count from the endpoint and update prose/pull-quotes/kickers/card in EN + ES where they moved (the "+76%" and each bucket count). Entities: the top-5 institutions by exact-threshold count (institution chips).

Chart forms: distribution with spikes → histogram (bars, 20 buckets) with the three spikes labelled; exact-vs-neighbour → paired bars per threshold (exact / −1K / +1K); ranking → horizontal bars with chips; over time → line of exact-threshold share per year with the 2018 rule-change annotated if the story cites one (only if sourced).

## Keep
Three chapters, the "walk the silhouette" voice, the pull-quotes (numbers refreshed), ClosingCoda, chrome.

## Figures (4)

### F1 · Ch1 (hero, scrolly) «La silueta» — 200K–400K histogram, live (live: `threshold-histogram`)
- 20 bars (10K buckets) from the endpoint, HTML-labelled; a **threshold selector** (three buttons 210K · 250K · 300K, keyboard-reachable) that highlights the chosen spike and prints its count vs the neighbour mean; stages driven by the four ch1 paragraphs: 0 = silhouette only; 1 = 210K highlighted with "+x% vs 200K"; 2 = 250K and 300K highlighted; 3 = the excess printed (spike − mean of the two neighbours, for the three). Anchor = the 210K count + "contracts written for exactly 210,000 pesos" / ES. Direct-award share of each bucket printed under the bar on hover/focus (and always for the three spikes).
- Accept: 20 bars equal the endpoint; excess numbers equal the probe's recomputation; stages 0→3; selector works with keyboard.

### F2 · Ch1 «Exacto, no cerca» — exact amount vs ±1,000 (live: `threshold-exact`)
- Three groups of three bars (−1,000 · exact · +1,000) with counts printed; anchor = the largest exact/neighbour ratio. Annotation: "real prices spread; a price that lands on the line is a decision" (from the story's own sentence).
- Accept: nine counts equal the endpoint.

### F3 · Ch2 «Quién se para en la línea» — institutions (live: `threshold-institutions`) replaces the typed roster
- Top-15 institutions by exact-threshold count: chip · exact count · share of that institution's contracts in the range · direct-award share; sorted by exact count. Anchor = the top institution + its count.
- Accept: rows equal the endpoint; chips resolve.

### F4 · Ch3 (closing) «La línea en el tiempo» — exact-threshold contracts per year (live: `threshold-years`)
- Line 2010–2024 of exact-threshold contracts as a share of contracts in the range (both printed at the peak and the latest year); annotation written from data (rising / flat / falling). Anchor = the peak year's share.
- Accept: points equal the endpoint.

## Story data changes
ch1 `live: 'threshold-histogram', scrolly: true`, `live2: 'threshold-exact'` (typed spike removed); ch2 `live: 'threshold-institutions'` (typed roster removed); ch3 `live: 'threshold-years'`.

## Acceptance (`sd07.mjs`, 1440 + 390, EN + ES)
≥ 4 live figures; numbers equal the endpoint (probe recomputes excess and ratios); prose numbers equal the figures (Change 0); stages 0→3; Days 1–6 scrollies step; `clipcensus.mjs` 0 (EN + ES, four widths); backend tests green; 0 console errors; card headline == story h1.

## Build notes
Branch `story/day-07-umbral` off origin/main after Day 6 ships. Backend first (own commit `feat(api § analysis): amount histogram with exact-threshold counts (SD-07)`), local backend on 8002 as Day 4 (`DATABASE_PATH=D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db uvicorn api.main:app --port 8002 --reload` from `backend/`; cold start 30–60 s), frontend dev server 3012 pointed at it for the probe; re-verify on prod after deploy. Same rules as Days 1–6; report file `_parallax_shots/story-days/sd07-report.md`. Frontend commit: `feat(stories § SD-07 el-umbral-de-los-300k): live threshold figures — histogram scrolly with selector, exact-vs-neighbour, institutions, by year; numbers refreshed`. Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No BUILD_ID, push or deploy.
