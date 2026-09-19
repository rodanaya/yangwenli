# Story Day 9 — `marea-de-adjudicaciones` («La regla del 82 por ciento»)

Story: `frontend/src/lib/story-content.ts` slug `marea-de-adjudicaciones` (5 chapters: ch1 "Every Government Promised Competition…" (typed `editorial-threshold` `da-rate-by-admin`), ch2 "Fourteen Years, One Direction" (typed `inline-area` `da-rate-trend` 2010–2024, peak 82.2), ch3 "The Peak Came After the Emergency, Not During It" (typed `editorial-threshold`), ch4 (typed `inline-bar`), ch5; leadStat 82.2%; "14 consecutive years above 60% — the OECD ceiling is 30%"); card "The Direct-Award Tide: From 60% to 82%".
Plumbing from Days 1–8 (SeriesLine, StickyStepFigure, ChartCard, the Day 2 `useYearOverYear`, the Day 2 sector dumbbell renderer).

## Audit (prod, 2026-09-19)

| Claim | Live source |
|---|---|
| 2010 62.7 → 2023 peak 82.2; never below 60 since 2010; 14 consecutive years | `/analysis/year-over-year` `direct_award_pct`: 2010 62.7 · 2011 60.05 · 2012 60.52 · 2013 68.4 · 2014 67.7 · 2015 73.0 · 2016 74.8 · 2017 77.1 · 2018 76.2 · 2019 77.8 · 2020 78.1 · 2021 80.0 · 2022 79.1 · **2023 82.18** · 2024 79.4 — all claims hold at build (recheck) |
| per-administration averages (Calderón 2010–12 · Peña 2013–18 · AMLO 2019–24 · Sheinbaum 2025 partial) | compute client-side from year-over-year with `lib/administrations.ts` term ranges (contract-weighted mean of `direct_award_count/contracts`, i.e. Σ DA / Σ contracts per term — `year-over-year` carries `contracts` and `direct_award_pct`; use `direct_award_pct × contracts` per year). **Do not use `/stories/administration-comparison`** — that endpoint scans 3.1M rows and 502'd prod (its precompute is staged, not deployed) |
| "the peak came after the emergency" | 2020 78.1 < 2021 80.0 < 2023 82.2 — holds (Day 2 established there was no 2020 spike) |
| sector view | `/sectors?year=YYYY` per sector `direct_award_count`/`total_contracts` (Day 2's F5 dumbbell code; extend to two chosen years, e.g. 2010 → 2023) |
| OECD 30% ceiling | external; keep only with the story's own source line (Day 5 dropped an unsourced "30%"; check `sources`) |
| Structure A | procedure type not coded before 2010 — the story already starts in 2010; keep that framing explicit in every figure caption |

Chart forms: annual rate with a threshold band → line with the ≥ 60% band, peak and latest labelled; per-term comparison → four horizontal bars (contract-weighted) with the term's years printed; before/after per sector → dumbbell; year-over-year counts → bars.

## Keep
Five chapters, voice, ClosingCoda, chrome; the "14 years, one direction" framing (it holds).

## Change 0 — verification (EN + ES; ledger in the commit)
Every number vs the endpoint (2010 62.7 · peak year/value · the 14-year count · per-term means · 2024 79.4 · card "From 60% to 82%"); the typed chart data retired; card headline == story h1 ("The 82 Percent Rule" / "La regla del 82 por ciento" — keep). Entities: none required; if ch4 names institutions, chips with ids.

## Figures (5)

### F1 · Ch1 (hero, scrolly) «Cuatro gobiernos, un promedio» — direct-award share per administration (live: `da-terms`)
- Four horizontal bars (Calderón 2010–12 partial term, Peña Nieto 2013–18, AMLO 2019–24, Sheinbaum 2025 partial) with contract-weighted DA share printed, the term's contract count, and the 60% rule; stages: 0 = Calderón; 1 = + Peña; 2 = + AMLO; 3 = + Sheinbaum (partial, labelled) and the "each higher than the last" callout computed (or its truthful variant). Anchor = AMLO's term share. Annotation: how the term mean is computed and why 2010 is the first year (Structure A).
- Accept: four values equal Σ(pct×contracts)/Σ contracts per term from the endpoint; stages 0→3.

### F2 · Ch2 «Catorce años» — the annual line 2010–2024, live (live: `da-line`) replaces the typed area
- `SeriesLine` with the ≥ 60% band, the 2023 peak and 2024 latest labelled, the 2020 point marked "no spike" (Day 2's finding, one label). Anchor = the peak.
- Accept: 15 points equal the endpoint.

### F3 · Ch3 «Después, no durante» — 2019–2024 zoom with the decree marker (live: `da-emergency`)
- Six points 2019–2024 at a y-range that makes the +0.3 (2020) vs +4.1 (2023) legible, the Mar-2020 decree marker, both deltas printed. Anchor = the 2023 − 2019 delta in points. (Reuse Day 2's decree-marker code if it is shared; else replicate the single marker in `SeriesLine`.)
- Accept: values equal the endpoint; deltas equal the probe's.

### F4 · Ch4 «Por sector» — DA share by sector, 2010 → 2023 dumbbell (live: `da-sectors`) replaces the typed bar
- 12 sectors, hollow 2010 / filled 2023 dots, Δ printed, sorted by Δ; anchor = the largest rise. `/sectors?year=2010` and `?year=2023` (the live-query "slow path" — cache them with `staleTime` 1h and expect ~1–3 s the first time; show the skeleton).
- Accept: 24 values equal the endpoints.

### F5 · Ch5 (closing) «El número, no la tasa» — direct awards per year, count (live: `da-count`)
- Bars 2010–2024 of `direct_award_count` (= pct × contracts from year-over-year; if `direct_award_count` is a field, use it) with the total printed. Anchor = the 2010–2024 total of direct awards. Caption ties count to rate: contracts fell while the share rose (Day 2).
- Accept: sum equals the probe's.

## Story data changes
ch1 `live: 'da-terms', scrolly: true`; ch2 `live: 'da-line'`; ch3 `live: 'da-emergency'`; ch4 `live: 'da-sectors'`; ch5 `live: 'da-count'`. Typed configs retired.

## Acceptance (`sd09.mjs`, 1440 + 390, EN + ES)
5 live figures; numbers equal the endpoints; stages 0→3; Days 1–8 scrollies step; `clipcensus.mjs` 0 (EN + ES, four widths); 0 console errors; card headline == story h1; no request to `/stories/administration-comparison` in the page's network log (probe asserts).

## Result + Deploy

Built by `story-day09` (report `_parallax_shots/story-days/sd09-report.md`, commit `7664fc1d`, 5 files +1,192 / −352, `DirectAwardFigures.tsx` + hook); judged by Fable on `sd09/after/` (f1-stage3 1440 EN, f4 1440 ES) with the four term shares rechecked against `/analysis/year-over-year` (Calderón 2010–12 61.90 · Peña 73.10 · AMLO 79.41 · Sheinbaum 68.26, exact) and the 2023 register total (413.0B) confirming the 720B retraction. The brief's per-term instruction was right; the story's Calderón base was averaged over three zero-coded years. Corrections as in the STORY_DAYS row; ch4 changed subject to the sector cut (its vendor roster had drifted and Televisa is five identities — QC). `/sectors?year=2023` publishes Hacienda at 125.21% direct award, so F4 reads `sector-year-breakdown` (QC). OECD ~30% kept as a cited external benchmark, flagged for verification. Gates: tsc 0 · build OK · lint:tokens PASS · probe 151/0 · census 0/0 (EN + ES, 4 widths) · Days 1–8 still step.

Deployed 2026-09-19 ≈11:05 CET via `deploy-safe.sh`. Commits `7664fc1d` · docs · BUILD_ID `2026-09-19-story-d9-marea` (hash in STORY_DAYS row).

## Build notes
Branch `story/day-09-marea` off origin/main after Day 8 ships. Same rules as Days 1–8; report file `_parallax_shots/story-days/sd09-report.md`. Commit: `feat(stories § SD-09 marea-de-adjudicaciones): live direct-award figures — term bars scrolly, 2010–2024 line, post-emergency zoom, sector dumbbell, yearly counts; numbers verified`. Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No BUILD_ID, push or deploy.
