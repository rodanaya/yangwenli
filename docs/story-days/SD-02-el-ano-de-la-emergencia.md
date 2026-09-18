# Story Day 2 — `el-ano-de-la-emergencia` («2020: El Año en que la Competencia se Detuvo»)

Story: `frontend/src/lib/story-content.ts` slug `el-ano-de-la-emergencia` (3 chapters: ch1 "The System Before", ch2 "The Day the Rule Vanished", ch3 "What Never Came Back"; 1 typed `inline-line` in ch3; `entities: []`) · front-page entry `Journalists.tsx` `INVESTIGATIONS` slug `el-ano-de-la-emergencia` (amount 17.2, contracts 215000).
Day 1 plumbing to reuse: `components/stories/live/` (`useGapSummary` pattern), `chartConfig.live` + `type: 'live'`, `LIVE_CHART_MAP` in `StoryNarrative.tsx`, the stepped-figure mechanic in `HeroChapter` (`data-stage`, sticky at lg via `lg:overflow-x-clip`), `ChartCard` chrome, 760 on the text axis.

## Audit (prod, 2026-09-18)

| Chapter | Claim | Figure now | Live data |
|---|---|---|---|
| 1 The System Before (hero) | 72.3% direct award in 2019; floor never below 60% in 23 years; OECD 15–20% | none | `GET /analysis/year-over-year` → per year `direct_award_pct`, `contracts`, `single_bid_pct` (2000–2025) |
| 2 The Day the Rule Vanished | decree 30 Mar 2020; 215,000 contracts in 2020 (+23%); 87% DA; HEMOSER (P2) "took MX$17.2B from IMSS during the emergency, much of it same-day" | none | `GET /analysis/monthly-breakdown/{year}` (per month `contracts`, `direct_award_count`, `single_bid_count`, `value`, `avg_risk`; optional `sector_id`, `institution_id`) for 2019/2020/2021 · HEMOSER = vendor **6038** (`/vendors?search=HEMOSER`): `/vendors/6038/contracts?year=2020&per_page=200` (`contract_date`, `amount_mxn`, `institution_name`, `is_direct_award`, `risk_score`), `/vendors/6038/risk-timeline` (year × count × value 2002–2025) |
| 3 What Never Came Back | 81.2 / 79.4 / 82.2 / 80.1 after; baseline 71.2 (5-yr avg 72.7); the 87% ratchet | typed `inline-line` DA rate by year with two reference lines | `year-over-year` (same series, live) · `GET /sectors?year=2019` and `?year=2020` → per sector `direct_award_count`, `total_contracts`, `total_value_mxn` |

**Fact problem.** `/vendors/6038` reports `total_value_mxn` 17,160,651,868 across 391 contracts, **2002–2025** — the story's "MX$17.2 billion from IMSS during the emergency" is HEMOSER's lifetime total, not its COVID take, and its largest 2020 award is from ISSSTE, not IMSS. Change 0 fixes this from the endpoint.

Chart forms (ui-ux-pro-max `--domain chart`): time series with an interruption → line with highlights (annotated event, reference lines); intensity by day across a year → calendar heat map (print values, never colour alone); change between two periods per category → dumbbell (paired dots + connector), ≤15 categories.

## Keep
Three chapters, headlines, deks, prose voice, pull-quotes (stats refreshed), the ch3 line chart's argument (baseline below, ratchet window above, before-and-after), ClosingCoda, the folio chrome.

## Change 0 — fact refresh (bilingual, surgical; before → after list in the commit body)
Executor fetches and computes, then replaces figures only (no sentence rewrites unless a claim is false):
- Annual DA rate 2019, 2020, 2021–2024 and the 2002–2019 min (the "never below 60%" floor), the 2015–2019 average ("five-year average of 72.7%") and the 2019 value ("71.2% baseline" in ch3 — reconcile: the prose uses both 72.3 and 71.2 for 2019; pick what `year-over-year` says and use ONE number), 2020 `contracts` (215,000, "+23%"), "roughly 31,000 contracts that would have required competition" = (DA₂₀₂₀ − DA₂₀₁₉) × contracts₂₀₂₀ — recompute.
- HEMOSER: from `/vendors/6038/contracts?year=2020` (and 2021 if the story means the emergency window — use 2020 unless the sum is trivial): total 2020 value, count, share from IMSS (group by `institution_name`), share direct award. Rewrite the one sentence in ch2 ¶3 (EN + ES), the ch2 pull-quote stat + statLabel, the hero kicker line, and the `/journalists` card `amount`/`brief` so that the number is the 2020 (emergency-year) figure and the buyer is whoever the endpoint says. If IMSS is not the main 2020 buyer, say who is. Keep "matches the P2 ghost-company signature" (that is from ARIA, verify `aria_tier`/pattern on `/vendors/6038` if exposed; if not exposed, keep the claim as is — it predates this day).
- "same-day awards": the contract list has no request date; the same-day count is a model feature. Keep the claim but the figure caption says "award dates shown; same-day timing is a model feature (z_same_day_count), not drawn".
- Add `entities: [{ type: 'vendor', id: 6038, name: 'HEMOSER, S.A. DE C.V.', role: …, role_es: …, riskScore: <from /vendors/6038 avg_risk_score>, ariaTier: <if available> }]` so Dramatis Personae + coda chips render (CLAUDE.md rule 1: chips only).

## Figures (5) — `components/stories/live/EmergencyFigures.tsx` (+ shared helpers), all `ChartCard`, 760, one lazy chunk

Shared: `useYearOverYear()` (`['analysis','year-over-year']`), `useMonthly(year)` (`['monthly-breakdown', year]` — same key as `RiskCalendarHeatmap` so caches are shared), `useVendorYearContracts(6038, 2020)`, `useSectorsYear(y)`. Line/dumbbell geometry in SVG with **measured-width viewBox** (Day 3 `useMeasuredWidth` / `ScrollSvgFrame` in InlineCharts) and **all labels as HTML** positioned over the plot (glyphs never scale). Colours: `var(--color-risk-critical)` for the emergency line, `var(--color-accent)` for the decree/ratchet annotations, `var(--color-text-muted)` for baselines; OECD band as a 6%-opacity accent fill. No green.

### F1 · Ch1 (hero) «El piso» — annual direct-award rate 2002–2019 (live: `covid-floor`)
- Line of `direct_award_pct` 2002–2019 from `year-over-year` (drop years with < 1,000 contracts, i.e. 2000–2001), a dashed 60% "floor" rule, the OECD 15–20% band shaded at the bottom, the 2019 point labelled with its value. Eyebrow `FIGURE I · THE FLOOR`, title "Eighteen years above the line" / "Dieciocho años por encima de la línea", anchor = 2019 DA % + "direct award in 2019, the before-state baseline" / "adjudicación directa en 2019, la línea base". Annotation: "Every year since 2002 sits above 60%; the OECD treats 15–20% as the ceiling of a competitive system." (ES equivalent).
- Not a scrolly (the hero scrolly is used by F2's chapter instead — the mechanic must therefore be generalised, see F2).
- Accept: 18 points rendered; the 2019 label equals the endpoint value at 0.1; min of the series ≥ 60 (else the annotation text changes to the real floor — executor writes the copy from data: "never below {min}%").

### F2 · Ch2 «Los 36 meses» — monthly direct-award rate Jan 2019 → Dec 2021, stepped (live: `covid-months`, scrolly)
- Series = `direct_award_count / contracts` per month from three `monthly-breakdown` calls (2019, 2020, 2021) → 36 points; x = month, y = 0–100%. Reference: horizontal dashed line at the 2019 mean; vertical accent marker at the end of March 2020 labelled "30 MAR 2020 · emergency decree" / "30 MAR 2020 · decreto de emergencia". Stages (driven by ch2's four paragraphs crossing mid-viewport, sticky above the prose at lg+; stage 3 and not sticky below lg): 0 = 2019 only + 2019-mean rule; 1 = adds Jan–Mar 2020; 2 = adds the decree marker and Apr–Dec 2020 with the peak month labelled (value + month name); 3 = adds 2021 and the annotation "the rate never returns to the 2019 mean" (or the truthful variant if it does dip below — compute). Eyebrow `FIGURE II · THE 36 MONTHS`, title "The month competition stopped" / "El mes en que la competencia se detuvo", anchor = the peak month's DA % + "{Month} 2020, the highest month in the series" / "{mes} de 2020, el mes más alto de la serie".
- Generalise the Day-1 stepped mechanic into `components/stories/live/StickyStepFigure.tsx` ({ figure(stage), paragraphs }) used by BOTH the hero (F1 of Day 1 keeps working — re-verify `el-vacio` stage 0→3) and by `StandardChapter`/`FeatureChapter` when `chartConfig.scrolly === true`. Keep `data-stage` on the wrapper.
- Accept (1440): `data-stage` 0→1→2→3 while scrolling ch2; 36 points; the peak label equals max(series) to 0.1; the decree marker sits between the Mar and Apr 2020 points; at 390 stage 3, not sticky, no overflow, every label ≥ 11px.

### F3 · Ch2 «El calendario de HEMOSER» — 2020 award calendar (live: `covid-hemoser-calendar`)
- 12 month rows × up to 31 day cells (HTML grid, cells 14–16px at 760, ~9px at 390 with the row label kept ≥ 11px and the month label outside the grid). A cell is filled when HEMOSER has ≥ 1 award with `contract_date` that day: fill = critical if all awards that day are direct award, muted otherwise; opacity/size step by that day's summed `amount_mxn` (3 steps, legend printed with the thresholds). Weekends get a faint background so a Sunday award reads at a glance. The decree day 30 Mar is outlined in accent. Under the grid: a mono line "N awards on D days · X MXN · Y% direct award · top buyer: …" computed from the same list; a printed list of the 5 biggest days (date · count · amount · buyer) so nothing depends on colour alone. Eyebrow `FIGURE III · ONE VENDOR'S YEAR`, title "HEMOSER's 2020, day by day" / "El 2020 de HEMOSER, día por día", anchor = 2020 total value (`formatCompactMXN`) + "awarded to HEMOSER in 2020" / "adjudicados a HEMOSER en 2020". Caption states the same-day caveat (Change 0). Vendor chip `<EntityIdentityChip type="vendor" id={6038} …>` in the card header.
- Fetch: `/vendors/6038/contracts?year=2020&per_page=200` (paginate if `total` > 200).
- Accept: the count/sum line equals the fetched list; the 5-biggest-days list is sorted desc; cells with awards === distinct `contract_date`s in the list; 0 sub-10px text; at 390 the grid fits without horizontal scroll (cells shrink, labels do not).

### F4 · Ch3 «El trinquete» — annual DA rate 2002–2024, live, replaces the typed line (live: `covid-ratchet`)
- Same renderer as F1 with the full series 2002–2024 (drop 2025 partial or label it "partial"), plus: baseline rule = 2015–2019 mean (label with the value), the 2020 point labelled, a shaded "post-emergency floor" band from min(2021–2024) to max(2021–2024) with both values printed, and the pull-quote's "every post-emergency year higher than the trough" annotation written from data. Eyebrow `FIGURE IV · THE RATCHET`, title "It never came back" / "Nunca regresó", anchor = min(2021–2024) DA % + "the lowest post-emergency year — still {x} points above the 2015–19 mean" / ES.
- Remove the typed `inline-line` chartConfig from ch3 (its data is replaced by the live series; keep `chartId` retired in a comment).
- Accept: 23 points; annotations computed from the endpoint (probe recomputes); the ch3 prose numbers (Change 0) equal the plotted values.

### F5 · Ch3 «Quién se movió» — direct-award rate by sector, 2019 → 2020 dumbbell (live: `covid-sectors`)
- 12 rows (sector order by Δ desc): dot 2019 (muted) → dot 2020 (critical if Δ > 0, muted if ≤ 0), connector, printed values at both ends and Δ in pp; sector label = the sector name in the page language (`SECTORS` from `@/lib/constants`), row colour rule: only the dots carry colour; the sector palette is NOT used (this is a risk story). Eyebrow `FIGURE V · WHO MOVED`, title "Where the tripwire mattered" / "Dónde importaba el cable trampa", anchor = the sector with the largest Δ + "+{Δ} points, {sector}" / ES. Data: `/sectors?year=2019` and `?year=2020` → `direct_award_count / total_contracts` per sector.
- Accept: 12 rows, each Δ equals the two endpoints' values; the anchor equals the max Δ row; at 390 rows wrap the label above the dumbbell, no overflow.

## Story data changes (`el-ano-de-la-emergencia` only)
- ch1 `chartConfig: { type: 'live', live: 'covid-floor', title, title_es }`.
- ch2 `chartConfig: { type: 'live', live: 'covid-months', scrolly: true, title, title_es }` + second figure `live2: 'covid-hemoser-calendar'` — extend `StoryChartConfig` with `live2?: string` rendered after the first (or make `live` accept `string | string[]`; executor's call, keep it simple and typed) and ch3 `live: 'covid-ratchet'`, `live2: 'covid-sectors'`.
- `pickChapterVariant`: ch1 stays hero, ch3 closing, ch2 whatever it is today (check; a `live` chartConfig counts as `hasChart`).
- `entities` as in Change 0.

## Out of scope (backlog)
- Same-day-award daily counts need a backend endpoint (`contracts` has no request date column exposed); the calendar shows award dates only.
- `RiskCalendarHeatmap` keeps its 7px annotation text (a `/dashboard` Day-10 item).

## Acceptance (probe `_parallax_shots/story-days/sd02.mjs`, 1440 + 390, EN + ES, dev server 3011 with `VITE_API_URL=https://rubli.xyz`)
- `/stories/el-ano-de-la-emergencia`: `figure[role=img]` ≥ 5 live figures (+ pull-quote tiles); every anchor/label number equals the value the probe recomputes from the same endpoints; old numbers that Change 0 replaced are absent from the page text (EN + ES); F2 `data-stage` 0→1→2→3; `el-vacio` F1 stage sequence still 0→1→2→3 (regression); Dramatis Personae renders HEMOSER as a chip linking to `/vendors/6038`; 0 sub-10px leaves; 0 SVG glyphs < 10px at 390; no document overflow; figures 760 on the text axis at 1440 (`align3.mjs` census); 0 console errors; `/journalists` card refreshed.

## Build notes for the executor
- Worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, branch **`story/day-02-emergencia`** (already checked out at origin/main `3983411f`). Never bare `git stash`, never junction node_modules, temp under D:\. Ignore untracked `frontend/Python.npm-cache/`, `_parallax_shots/`.
- Read fully first: the story block in `story-content.ts`, `components/stories/live/*` (Day 1), `StoryNarrative.tsx` `renderChartBlock` + `HeroChapter` + the chapter variants + `LIVE_CHART_MAP`, `InlineCharts.tsx` `ChartCard` / `useMeasuredWidth` / `ScrollSvgFrame`, `RiskCalendarHeatmap.tsx` (for the monthly-breakdown query shape), `analysisApi` + `vendorApi` + `sectorApi` in `client.ts`, `Journalists.tsx` entry.
- Rules: CLAUDE.md 1–8; no italic; no dot-grid; no green; HTML owns glyphs; currency helpers by surface; `getRiskLevelFromScore` for the chip.
- Gates from `frontend/`: tsc (`-p tsconfig.app.json`) · `npm run build` · `npm run lint:tokens`. Backend untouched.
- Reviews: `rubli-bilingual-audit` on every touched file; `vercel-react-best-practices` on the diff (queries in parallel via `useQueries`, one chunk).
- Crops: each figure at 1440 + 390, F2 mid-scroll, Dramatis, into `_parallax_shots/story-days/sd02/after/`. Read them.
- Commits: `feat(stories § SD-02 el-ano-de-la-emergencia): live figures — DA floor, 36-month scrolly, HEMOSER 2020 calendar, ratchet, sector dumbbell; facts refreshed from the endpoints` with the before → after list (incl. the HEMOSER correction) in the body, citing `docs/story-days/SD-02-el-ano-de-la-emergencia.md`. Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No BUILD_ID bump, push or deploy — Fable judges first.
- Report: per-figure PASS/FAIL with API-vs-rendered numbers, the fact-refresh list, gate outputs, commit hash, crop list.

## Result

Built by Opus executor on branch `story/day-02-emergencia`. Five live figures, one lazy chunk (`EmergencyFigures-*.js`, separate from `GapFigures-*.js`).

| Figure | Rendered = endpoint at build (2026-09-18) |
|---|---|
| F1 covid-floor (ch1) | 10 points 2010–2019; anchor 77.8% (2019); floor rule 60.0% (2011); OECD 15–20% band |
| F2 covid-months (ch2, scrolly) | 36 points; 2019 rule 77.8%; peak **Oct 2021 84.8%**; decree marker between Mar and Apr 2020; stages 0→1→2→3; RATE/VALUE lens toggle |
| F3 covid-hemoser-calendar (ch2) | 54 awards on 31 days · 4.5B MXN · 85.2% direct by count carrying 4.6% of value · top buyer IMSS 97.0%; five biggest days printed |
| F4 covid-ratchet (ch3) | 15 points 2010–2024; 2015–19 mean 75.8%; 2020 labelled 78.1%; post-emergency band 79.1%–82.2%; pre-2020 max 77.8% |
| F5 covid-sectors (ch3) | 12 rows by Δ desc; anchor **+3.3 pp Salud**; only 3 of 12 sectors rose; Energía −12.0 |

**The story's thesis did not survive the endpoints.** There was no 2020 spike: the direct-award rate moved +0.3 points, and 2020 had 18% FEWER contracts than 2019 on 45% more money. The ratchet the headline names is real and is now the whole argument. The HEMOSER paragraph was rebuilt from `/vendors/6038` and the ARIA queue: it is a Tier-2, `review_status = confirmed_corrupt`, ground-truth vendor whose primary pattern is **P7 (conflict of interest) with P2 confidence exactly 0.0** — the "P2 ghost signature" claim was false — and whose two biggest 2020 awards came through **public tenders**, not the emergency gap.

Fact refresh (EN + ES + `/journalists` card), before → after:

| Was | Now |
|---|---|
| 2019 direct award 72.3% (and 71.2% in ch3) | **77.8%** |
| 2020 direct award 87% | **78.1%** |
| 2019 competitive 27.7% | **22.2%** |
| 2020 competitive 13%, "one contract in eight" | **21.9%**, phrase cut |
| 215,000 contracts in 2020, "+23%" | **158,309**, **−18%** |
| — (value never stated) | **509B MXN vs 352B, +45%** (added) |
| "+14.7 points ≈ 31,000 contracts" | **+0.3 points ≈ 460 contracts** |
| "floor never below 60% across 23 years / five administrations" | **never below 60.1% since 2010**; 2002–2009 record no procedure |
| 2015–19 average 72.7% | **75.8%** |
| 2021/22/23/24 = 81.2 / 79.4 / 82.2 / 80.1 | **80.0 / 79.1 / 82.2 / 79.4** |
| post-COVID trough "79.4%, 7 points above" | **79.1%, 3.3 points above** |
| leadStat 87% | **79.1%** (the lowest post-emergency year, above every year on record before it) |
| HEMOSER "MX$17.2B from IMSS during the emergency" (lifetime total) | **MX$4.48B in 2020, 54 awards, 97% from IMSS** |
| HEMOSER "matches the P2 ghost-company signature" | **ARIA Tier 2 · primary pattern P7 · confirmed corrupt · in ground truth** (P2 confidence 0.0) |
| "much of it in same-day awards" | 85% direct **by count**, under 5% **by value**; the two biggest went through public tenders; same-day is a model feature, stated as such |
| ch2 pull-quote "same-day means selected before the paperwork" | rewritten to the direct-vs-value split |
| ch3 pull-quote 82.2% | **79.1%** |
| `/journalists`: 87% direct award · 17.2 · 215,000 | **78.1% · 4.5 · 158,309** + rewritten brief |
| `entities: []` | HEMOSER vendor 6038 (risk 0.4988, ARIA T2) → Dramatis Personae chip |

Deviations from the plan, with reasons:
- **F1 and F4 start at 2010, not 2002.** Structure A (2002–2009) reports `direct_award_pct ≈ 0.0` because it does not record the procedure type. Plotting it would have drawn a competitive decade that never existed and crushed the y-scale. Both annotations say so; ch1 and ch3 prose say so.
- **F2 gained a RATE / VALUE lens toggle.** The direct-award rate is flat across the decree, so a rate-only line does not advance ch2's argument. The value lens is where the emergency actually shows (April 2020: 94.2B against 35.6B in April 2019).
- **F2's stage-3 sentence is computed, not asserted**: the rate does fall back below the 2019 line, in 6 of the 21 months after the decree, and the figure says that.
- **`StickyStepFigure` exports the hook and the frame, not `{ figure, paragraphs }`.** Both callers render their own paragraphs (hero drop cap + pull-quote, standard + source superscripts); passing those in would have been more code than it saved.

Plumbing: `StoryChartLive` union moved to `story-content.ts` and routed by prefix; `chartConfig.live2` (second exhibit, always last) and `chartConfig.scrolly` added; `renderChartBlock` gained `only: 'primary' | 'secondary'` so a scrolly chapter pins its first plate and lets the second flow below; `useProseStage` moved out of `StoryNarrative.tsx` into `components/stories/live/StickyStepFigure.tsx` and `HeroChapter` now keys on `scrolly` rather than the literal `'gap-blackout'`; `sectorApi.getAll({ year })`.

Acceptance (`_parallax_shots/story-days/sd02.mjs`, 1440 + 390, EN + ES): **ALL PASS**. 5 `figure[role=img]`, each 760 on the text axis at 1440; every anchor, rule, band and summary number equals the value the probe recomputes from the same endpoints; 0 of the 13 retired numbers present in either locale; F2 `data-stage` 0→1→2→3 and sticky at 1440, stage 3 and static at 390; HEMOSER chip → `/vendors/6038`; 0 sub-10px leaves, 0 sub-10px SVG glyphs, 0 document overflow, 0 console errors. Regression: `el-vacio` F1 still steps 0→1→2→3 with its 7 figures, and `sd01.mjs` passes end to end unchanged.

Judge fixes taken during the build, from reading the crops: reference-rule captions moved right-and-below with a card-coloured chip and band captions left-and-above (they had been colliding with the polyline and with each other in F4); the x-axis thinner now REPLACES the last caption instead of appending it (it printed "20182019" at 390); F3's five-biggest-days buyer column drops to its own line below `sm` (it truncated IMSS to "Instit…" at 390).

Gates: tsc 0 · `npm run build` OK · `lint:tokens` PASS (82 pre-existing warnings, none in the new files). Backend untouched. Reviews: bilingual audit clean (every string paired; `SeriesLine` and `StickyStepFigure` take all copy as props and hold none); React review — parallel `useQueries` for the three monthly years and the two sector cuts, per-figure `enabled` so a figure fetches only its own endpoint, shared query keys with `RiskCalendarHeatmap` and `/sectors`, one lazy chunk, no inline component definitions, passive scroll listener.

Crops in `_parallax_shots/story-days/sd02/after/`: `f1`–`f5` × 1440/390, `ch1`–`ch3` × 1440/390, `f2-sticky-mid-1440.png`, `dramatis` × 1440/390.
