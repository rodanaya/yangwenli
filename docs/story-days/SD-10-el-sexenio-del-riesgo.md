# Story Day 10 — `el-sexenio-del-riesgo` («El Libro Mayor de Cinco Sexenios»)

Story: `frontend/src/lib/story-content.ts` slug `el-sexenio-del-riesgo` (5 chapters: ch1 "Opening the Books" (no chart; pullquote `breach-ceiling`), ch2 "The Largest Entry: AMLO's Books, Reorganized" (typed `inline-stacked-bar` `amlo-vs-pena-sectors`, 9 sectors), ch3 "The Army's Monotonic Climb" (typed `inline-multi-line` SEDENA 2015–2025), ch4 "Reading the Hot Lines" (typed `editorial-cleveland-pair` `amlo-categories-risk`, 8 categories vs OECD 15%), ch5 "The Account Still Open"; leadStat 12.6%; kickers `7.5% → 12.6%` · `+5.1pp` · `79.4%`); card on `/journalists`.
Plumbing from Days 1–9 (SeriesLine with band + overlay labels, StickyStepFigure, ChartCard, `useYearOverYear`, the Day 2/9 sector dumbbell, Day 8's sector rows with chips, Day 9's per-term bars if it shipped one).

## Audit (prod, 2026-09-19 ≈10:00 CET — every number below recomputed from the endpoints)

| Claim | Live source | Verdict |
|---|---|---|
| Fox 7.50% (15,479 of 206,333) · Calderón 8.15% (481,450) · Peña 11.18% (1,228,625) · AMLO 12.62% (131,640 of 1,043,097) | `/analysis/year-over-year` `{data:[{year, contracts, high_risk_pct, direct_award_pct, total_value, …}]}` — term rate = Σ(high_risk_pct × contracts)/Σ contracts over `lib/administrations.ts` ranges (Fox 2002–06 in data, Calderón 2007–12, Peña 2013–18, AMLO 2019–24, Sheinbaum 2025) | Fox **7.50** / 206,314 · Calderón **8.15** / 481,450 · Peña **11.18** / 1,228,625 · AMLO **12.53** / **1,050,552** (the Sep 18 gap refresh added rows) · Sheinbaum **11.18** / 92,631. Story's AMLO 12.62 → 12.53; drift "+5.1pp" → **+5.0pp**; lead "12.6%" → **12.5%** |
| "Sheinbaum … already posts 12.9 percent" (subheadline, leadStat sublabel, ch5) | same | **11.18%** — still "below the AMLO peak, above the Calderón baseline" (8.15 < 11.18 < 12.53), but it is also below Peña; say so |
| AMLO 79.4% direct award · 2.76T total | year-over-year contract-weighted DA = **79.41%** · Σ total_value 2019–24 = **2.758T** | holds |
| "1,063 of 2,758 billion pesos without competition" (ch5) | no endpoint carries direct-award **value** by year (year-over-year has the count rate only) | keep the 79.4% count rate; drop or date the peso split unless the executor finds a live source |
| ch2 sector ledger Peña → AMLO (typed: Salud 816→1,201.4 +47 · Infra 937.1→326.4 −65 · Hacienda 231.1→392.9 +70 · Defensa 59.2→168.9 +186 · Gobernación 95.2→190.4 +100 · Agricultura 122.2→166.2 +36 · Educación 155.3→114.9 −26 · Ambiente 136.5→94.2 −31 · Energía 435.2→50.1 −88) | `/analysis/sector-year-breakdown` `{data:[{year, sector_id, contracts, total_value, high_risk_pct, direct_award_pct, …}]}` (288 rows, one call), Σ total_value per sector per term | **materially different**: Salud 823.7→1,194.7 **+45** · Infra 1,024.4→559.7 **−45** · Hacienda 201.4→241.0 **+20** · Defensa 56.4→170.8 **+203** · Gobernación 85.1→139.4 **+64** · Agricultura 118.3→137.2 **+16** · Educación 129.7→108.7 **−16** · Ambiente 94.5→69.8 **−26** · Energía 444.4→67.9 **−85** · Tecnología 30.4→29.5 −3 · Trabajo 42.2→33.2 −21 · Otros 12.7→5.9 −54. Peña total 3.063T · AMLO 2.758T. Direction holds for every sector; the magnitudes in prose, pullquote ("+186%", "−65%") and subheadline must be rewritten from the endpoint. The typed figures came from an April query with a different sector mapping — the canonical stats endpoint wins |
| ch3 SEDENA "monotonic climb": 2.2% (2018) → 5.4% (2024), 9.94B → 22.43B, "every year of the AMLO sexenio expanded the army's footprint", "five times its 2015 share" | `/institutions/384/risk-timeline` `{timeline:[{year, contract_count, total_value, avg_risk_score}]}` ÷ year-over-year `total_value` | 2015 5.78B/1.07% · 2016 5.99/1.28 · 2017 4.83/0.78 · 2018 **9.94/2.23** · 2019 9.69/2.75 · 2020 15.16/2.98 · 2021 18.00/3.62 · **2022 12.49/2.18** · 2023 19.55/4.73 · 2024 **22.43/5.43** · 2025 12.06/1.68 (partial). End points hold; **"monotonic" is false** (2019 pesos dip, 2022 both dip). 5.43/1.07 = 5.1× holds. Retitle ch3 (e.g. "The Army's Climb, With One Step Back" / «La escalada del ejército, con un escalón atrás») and rewrite the "every year" sentence |
| ch4 categories: Alimentos y Víveres 32.4% high-risk on 224.9B; Medicamentos 327.6B at 22.4%; Construcción de Edificios 269.4B; Servicios Hospitalarios 19.4% | `/categories/sexenio` `{data:[{category_id, name_es, name_en, sector_code, lifetime_value, administrations:{Fox|Calderón|Peña Nieto|AMLO|Sheinbaum:{value, contracts, avg_risk}}}], administrations, total:72}` | values hold (Alimentos 224.9B/153,184 contracts · Medicamentos 327.6B · Construcción 269.4B · Hospitalarios 164.4B). **No live high-risk rate per category × term** — the endpoint carries `avg_risk` only (Alimentos 0.335 Peña → 0.414 AMLO; Hospitalarios 0.259 → 0.325; Medicamentos 0.350 → 0.330; Construcción 0.214 → 0.261). The figure goes live on the risk indicator; the typed high-risk percentages stay in prose only with an explicit "computed from the register, April 2026" source line, or are replaced by the live indicator — executor's call, honesty first |
| Segalmex "1,258 contracts at a 1.000 risk score"; TOKA 40.6B under AMLO, 897 contracts, 0.78 | `/institutions/search?q=SEGALMEX` → `/institutions/{id}/contracts`; `/vendors/search?q=TOKA` → `/vendors/{id}` (+ `/vendors/{id}/contracts?year_from=2019`) | verify or soften; entity chips for TOKA (vendor) and Segalmex (institution) per rule 1 |
| Tren Maya 465 contracts / 125.3B; ASF "> 500B" | `/contracts?q=Tren Maya` if the list endpoint supports a title search; ASF figure is external | verify the count if cheap; keep the ASF line with its source |
| OECD 2–15% benchmark; "23 years of data" | external; register 2002–2025 = 24 years | "23 years" → **24 years** (or "since 2002") |
| `/analysis/admin-breakdown` | eras are **off by one** vs `lib/administrations.ts` (fox 2002–05, calderon 2006–11, pena_nieto 2012–17, amlo 2018–24) | **do not use** for this story — QC item |

Chart forms: five-term comparison → horizontal bars with the term's years and contract count printed (hero scrolly); two-term sector ledger → paired horizontal bars (Peña muted / AMLO sector colour), Δ% printed, sorted by Δ, 12 sectors; an institution's share over time → dual-read line (pesos + share of federal total), dips labelled; category risk shift → dumbbell Peña→AMLO on the risk indicator, top 10 AMLO categories by value; the long series → yearly line 2002–2025 with five term bands and the partial year marked.

## Keep
Five chapters, ledger voice ("debits and credits"), ClosingCoda, chrome, the pullquotes (numbers refreshed). The thesis "every administration through AMLO scored riskier than the last" holds on the live numbers; Sheinbaum's partial account is the first to fall below its predecessor — say it plainly.

## Change 0 — verification (EN + ES; ledger in the commit)
Every number vs the endpoint (all five term rates and contract counts, the sector ledger, SEDENA series, category values, 2.758T, 79.4%, 92,631, 24 years); card fields (`/journalists`) match; card headline == story h1; entities as chips (SEDENA institution 384; TOKA vendor; Segalmex institution). Retire the typed chart data for ch2–ch4. Keep "indicador de riesgo" / "risk indicator" wording; never "probability of corruption".

## Figures (5)

### F1 · Ch1 (hero, scrolly) «Cinco columnas» — high-risk rate per administration (live: `era-terms`)
- Five horizontal bars (Fox 2002–06 data · Calderón 2007–12 · Peña Nieto 2013–18 · AMLO 2019–24 · Sheinbaum 2025 partial, hatched) with rate, flagged/total contracts and the OECD 2–15% band; stages driven by the four ch1 paragraphs: 0 = Fox + Calderón; 1 = + Peña; 2 = + AMLO with the "+5.0pp since Fox" callout; 3 = + Sheinbaum partial with the "first term below its predecessor — 9 months of data" note. Anchor = AMLO 12.53% (rendered "12.5%"). Annotation: contract-weighted mean of yearly high-risk rates; Structure A caveat for Fox.
- Accept: five rates equal Σ(high_risk_pct×contracts)/Σcontracts from the endpoint; stages 0→3.

### F2 · Ch2 «El libro reorganizado» — sector ledger, Peña Nieto vs AMLO (live: `era-sectors`) replaces the typed stacked bar
- 12 sector rows (chips), paired bars on one scale (Peña muted, AMLO sector colour), Δ% printed, sorted by Δ descending; the two term totals printed (`formatDualCurrency`); anchor = Defensa +203%. Annotation: Σ `total_value` per sector 2013–18 vs 2019–24 from `sector-year-breakdown`; sector = the contract's sector.
- Accept: 24 values equal the endpoint sums; the prose percentages equal the figure's.

### F3 · Ch3 «La escalada del ejército» — SEDENA yearly pesos and share of federal contracting, 2015–2025 (live: `era-sedena`) replaces the typed multi-line
- `SeriesLine` of the share (%) with the peso value printed at each point (or a second, lighter series), the 2022 dip and the 2024 peak labelled, 2025 marked partial; anchor = 5.43% (2024). Source: `/institutions/384/risk-timeline` ÷ `year-over-year` total_value.
- Accept: 11 shares equal the probe's; the dips are labelled; the word "monotonic" is gone from title, prose and pullquote (EN + ES).

### F4 · Ch4 «Las partidas calientes» — category risk indicator, Peña → AMLO (live: `era-categories`) replaces the typed cleveland pair
- Top 10 AMLO-era categories by value from `/categories/sexenio` (category chips), dumbbell of `avg_risk` Peña Nieto → AMLO, Δ printed, sorted by AMLO indicator; anchor = Alimentos y Víveres 0.414 (+0.079). Annotation states this is the mean risk indicator, not a high-risk rate, and that the high-risk percentages in the prose were computed from the register in April 2026 (if kept).
- Accept: 20 values equal the endpoint; no "% probability" wording.

### F5 · Ch5 (closing) «La cuenta abierta» — yearly high-risk rate 2002–2025 with the five term bands (live: `era-years`)
- `SeriesLine` of `high_risk_pct` by year, five shaded term bands labelled with the term means from F1, 2025 point marked partial (92,631 contracts); anchor = 11.18% (2025). Caption: what nine months of data can and cannot say.
- Accept: 24 points equal the endpoint; band means equal F1's.

## Story data changes
ch1 `live: 'era-terms', scrolly: true`; ch2 `live: 'era-sectors'` (typed stacked removed); ch3 `live: 'era-sedena'` (typed multi-line removed); ch4 `live: 'era-categories'` (typed cleveland removed); ch5 `live: 'era-years'`. Card: `contracts`, `yearSpan` refreshed.

## Acceptance (`sd10.mjs`, 1440 + 390, EN + ES)
5 live figures; numbers equal the endpoints; stages 0→3; Days 1–9 scrollies step; `clipcensus.mjs` 0 (EN + ES, four widths) on the story and `/journalists`; 0 console errors; no request to `/stories/administration-comparison` or `/analysis/admin-breakdown`; card headline == story h1; "monotonic"/"monotónic" absent; "12.9" absent.

## Result + Deploy

Built by `story-day10` (report `_parallax_shots/story-days/sd10-report.md`, commit `0cdcc2c6`, `EraFigures.tsx` + `useEraData.ts`); judged by Fable on `sd10/after/` (f1-stage3 1440 EN, f2 1440 ES) against the morning recomputation in this brief — five term rates, sector ledger and SEDENA series all exact. Where the endpoint beat the brief: Sheinbaum 11.1800 vs Peña 11.1788 is "level with", not below. Unverifiable claims withdrawn rather than dated (per-category high-risk %, 1,063B DA value split, Segalmex 1,258 @ 1.000, TOKA 40.6B — the register contradicts both). Executor fixed F2's value column escaping the figure box (census catch) and the typed `ChapterDivider` era strip. Gates: tsc 0 · build OK · lint:tokens PASS · probe 3 consecutive clean runs (1440 + 390, EN + ES) · census 0/0 · Days 1–9 still step. Eight QC items logged in STORY_DAYS.

Deployed 2026-09-19 ≈12:30 CET via `deploy-safe.sh`. Commits `0cdcc2c6` · docs · BUILD_ID `2026-09-19-story-d10-sexenio` (hash in STORY_DAYS row).

## Build notes
Branch `story/day-10-sexenio` off origin/main after Day 9 ships. Same rules as Days 1–9; report file `_parallax_shots/story-days/sd10-report.md`. Commit: `feat(stories § SD-10 el-sexenio-del-riesgo): live ledger figures — term bars scrolly, sector ledger, SEDENA share, category indicator, yearly line; ledger and SEDENA claims corrected`. Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No BUILD_ID, push or deploy.
