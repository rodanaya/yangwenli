# Story Day 8 — `la-ilusion-competitiva` («Ahora Ve Usted la Competencia»)

Story: `frontend/src/lib/story-content.ts` slug `la-ilusion-competitiva` (5 chapters: ch1 "One Bidder, 800,000 Times", ch2 "The Reform That Made It Worse" (typed `inline-area`), ch3 (typed `editorial-cleveland-pair`), ch4 (typed `editorial-threshold`), ch5; leadStat 64.4% "peak single-bidder rate"; kickers 45%+ · 800,000+; entities Edenred 44372 "1,679 single-bid wins", TOKA 102627 "1,290", Efectivale **64** "2,210"); card "The Competition That Never Was".
Plumbing from Days 1–7 (incl. Day 7's `amount-histogram` if useful, and Day 3's voucher data hooks).

## Audit (prod, 2026-09-19)

| Claim | Live source |
|---|---|
| "more than 45% single-bid for fourteen straight years"; "peak 64.4% in 2011" | `/analysis/year-over-year` `single_bid_pct`: 2010 51.6 · **2011 64.4** · 2012 60.9 · 2013 62.7 · **2014 65.65 (the true peak)** · 2015 61.7 · 2016 62.5 · 2017 59.5 · 2018 58.5 · 2019 46.5 · 2020 48.0 · 2021 46.5 · 2022 45.9 · 2023 49.4 · 2024 47.8 → the 14-year ≥ 45% claim holds (2011–2024, min 45.89); the peak is **2014, 65.65%**, not 2011 — Change 0 |
| "800,000+ single-bid procedures over fourteen years" | Σ over 2011–2024 of `single_bid_count` (from `/analysis/monthly-breakdown/{year}` months, or `contracts × single_bid_pct`) — recompute; note single-bid is defined on competitive procedures only (rule in `.claude/rules/data-validation.md`) |
| by sector | `/analysis/single-bid-rate` → 12 rows `metric_value` (Infraestructura 61.1 · Medio Ambiente 44.4 · Otros 26.0 · Energía 25.5 · Gobernación 18.8 …) ; `/sectors` carries `single_bid_count`, `single_bid_pct`, `direct_award_pct` per sector; `/sectors/{id}/trends` per year (used by `CompetitionSlopeChart`, self-fetching) |
| the three voucher entities' single-bid wins | Day 3 endpoints: Edenred 57.9% × 2,898 = 1,678 ✓ · Toka 66.4% × 1,944 = 1,291 ✓ · **Efectivale entity 64: 91.7% × 1,150 = 1,055, not 2,210** (2,210 was the retired Day 3 number) → Change 0; use entity 45016 (+64) as Day 3 did and print the live product |
| OECD 15% ceiling; the 2009/2010 reform | external, keep only with the story's own source lines |

Chart forms: annual rate with a threshold → line with the ≥ 45% band and the OECD rule; two-period change per sector → the existing `CompetitionSlopeChart` (live); ranking → horizontal bars; counts per year → bars with a running total; entity comparison → paired-dot rows with chips.

## Keep
Five chapters, voice, ClosingCoda, chrome. The "One Bidder, 800,000 Times" framing if the recomputed sum still clears 800,000; otherwise the number in the title moves with it (EN + ES).

## Change 0 — fact refresh (EN + ES; ledger in the commit)
Peak year/value (2011/64.4 → 2014/65.65 unless the endpoint says otherwise at build — say which year, and keep 2011 as "the first year above 60" if the prose needs a 2011 hook); the 800,000 sum; the 14-year band's min and the years it spans; Efectivale's single-bid wins (and the entity id used: prefer 45016 with the 64 note, as Day 3); any "since 2010" / "23 years" claim against Structure A's missing procedure type (2002–2009 single-bid rates are unreliable — state the 2010+ window like Days 2–3 did); card headline == story h1 (keep "Now You See Competition" / "Ahora Ve Usted la Competencia" unless a number in the subheadline moved); `nextSteps` mentioning "the 2011 single-bid peak (64.4%)" → the live peak.

## Figures (5)

### F1 · Ch1 (hero, scrolly) «Catorce años arriba de la línea» — annual single-bid rate 2010–2024 (live: `sb-years`)
- `SeriesLine` (Day 2 renderer) with the OECD 15% rule (sourced), a shaded band from 45% up across the 14-year run, the peak year labelled with its value, the 2019 step-down labelled (58.5 → 46.5). Stages: 0 = the line; 1 = the OECD rule + the gap printed for the latest year; 2 = the peak; 3 = the ≥ 45% band with "N straight years" computed. Anchor = the peak value + year.
- Accept: 15 points equal the endpoint; peak/years computed by the probe match; stages 0→3.

### F2 · Ch2 «La reforma» — sector competition slope, live (live: `sb-slope`)
- Reuse `CompetitionSlopeChart` (`components/sectors/`, self-fetching `/sectors/{id}/trends`) inside `ChartCard`; check its labels for clips at 390 and its glyphs ≥ 10.5px (wrap in `ScrollSvgFrame` or fix its label layout if needed; no fork). If its two periods are not the reform's before/after, print what they are. Anchor = the sector with the largest rise in single-bid share.
- Accept: values equal `/sectors/{id}/trends`; census 0.

### F3 · Ch3 «Dónde se licita a solas» — single-bid rate by sector, today (live: `sb-sectors`) replaces the typed cleveland pair
- 12 horizontal bars from `/analysis/single-bid-rate` (sector palette allowed — it is a sector chart), value printed, the OECD 15% rule as a vertical line, `single_bid_count` from `/sectors` printed under each bar. Anchor = Infraestructura's rate.
- Accept: 12 values equal the endpoint.

### F4 · Ch4 «Los ganadores de la oferta única» — the named vendors (live: `sb-vendors`) replaces the typed threshold viz
- Rows for Edenred, Toka, Efectivale (45016 + 64 merged as Day 3), plus the next 5 vendors by single-bid wins if an endpoint can rank them (`/vendors?sort_by=single_bid_pct&per_page=…` — check `VendorFilterParams`; if only a rate sort exists, rank by `single_bid_pct × total_contracts` client-side over a `per_page=100` page filtered to `total_contracts ≥ 500` and say so). Each row: chip · single-bid wins (pct × contracts, printed as a computed figure) · single-bid % · direct-award % · lifetime value. Anchor = the largest win count.
- Accept: every product equals the two endpoint fields.

### F5 · Ch5 (closing) «800,000 veces» — single-bid procedures per year with the running total (live: `sb-count`)
- Bars 2011–2024 of `single_bid_count` (Σ of the year's months from `monthly-breakdown`, 14 requests, `useQueries`, `staleTime` 1h — or `contracts × single_bid_pct/100` if the monthly totals disagree with year-over-year by > 1%, state which), running total printed at the last bar. Anchor = the 14-year sum + "competitive procedures that drew one bid, 2011–2024" / ES.
- Accept: sum equals the probe's recomputation; the chapter/card number equals it (Change 0).

## Story data changes
ch1 `live: 'sb-years', scrolly: true`; ch2 `live: 'sb-slope'` (typed area removed); ch3 `live: 'sb-sectors'` (typed pair removed); ch4 `live: 'sb-vendors'` (typed threshold removed); ch5 `live: 'sb-count'`.

## Acceptance (`sd08.mjs`, 1440 + 390, EN + ES)
≥ 5 live figures; numbers equal the endpoints; retired numbers absent (2011-as-peak, 2,210); stages 0→3; Days 1–7 scrollies step; `clipcensus.mjs` 0 (EN + ES, four widths) on the story and on `/sectors` if `CompetitionSlopeChart` was touched; 0 console errors; card headline == story h1.

## Result + Deploy

Built by `story-day08` (report `_parallax_shots/story-days/sd08-report.md`); judged by Fable on `sd08/after/` (f1-stage3, f2, f4 at 1440 EN) with 2014 65.65 / 2022 45.89 / 2024 47.80 re-checked against `/analysis/year-over-year`. The brief's Efectivale note was wrong and the executor right: 2,210 was the merged 45016+64 figure; the canonical three-identity set is 2,267. The story's real defect was a denominator: `/analysis/single-bid-rate` divides by all contracts, `year-over-year` by competitive procedures, and the typed prose used both. Every figure now states the competitive-procedure rate and F2 draws both lines so the 2010 "reform" reads as the register starting to code procedure type (all-contracts rate 37.4 → 19.2% that year). Corrections: peak 2011/64.4 → 2014/65.65; fourteen years → fifteen (2010–2024, floor 45.89% in 2022); "800,000+" → 376,324; ch1 title "One Bidder, 376,000 Times"; ch2 "The Reform That Was a Denominator"; card headline = story h1. `CompetitionSlopeChart` left untouched (different metric). Gates: tsc 0 · build OK · lint:tokens PASS · pytest 17 · probe 131/0 · census 0/0 (EN + ES, 4 widths) · Days 1–7 scrollies still step.

Deployed 2026-09-19 ≈10:15 CET via `deploy-safe.sh`. Commits `b5e498a4` (cache TTL) · `e63320ce` · docs · BUILD_ID `2026-09-19-story-d8-ilusion` (hash in STORY_DAYS row). Four QC items added to STORY_DAYS (single-bid-rate docstring, ArqueoMesa ES clip, unaccented sector names, dead Cache-Control assignments).

## Build notes
Branch `story/day-08-ilusion` off origin/main after Day 7 ships. Same rules as Days 1–7; report file `_parallax_shots/story-days/sd08-report.md`. Commit: `feat(stories § SD-08 la-ilusion-competitiva): live single-bid figures — 14-year band scrolly, sector slope, sector rates, named winners, yearly counts; peak year and vendor wins corrected`. Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No BUILD_ID, push or deploy.
