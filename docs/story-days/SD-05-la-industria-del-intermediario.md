# Story Day 5 — `la-industria-del-intermediario` («Sigan al Intermediario»)

Story: `frontend/src/lib/story-content.ts` slug `la-industria-del-intermediario` (4 chapters: ch1 "The Peso and the Broker", ch2 "The Channels the Money Runs Through" (typed `inline-bar` `p3-intermediary-sectors`), ch3 "Where the Margin Is Skimmed" (typed `inline-bar` `p3-top-vendors`), ch4 "Where It Lands"; `entities: []`; leadStat 2,974; kickers 2,974 / 526.8B / 0); front-page card "The Intermediary Industry" (sub "P3 pass-through vendors").
Plumbing from Days 1–4: `components/stories/live/*`, `StickyStepFigure`, `ChartCard` chrome rules (§ 7), the Day 4 aggregate `GET /aria/patterns/{code}/institutions[?group=sector]` (`ariaApi.getPatternInstitutions`), `CaptureFigures.tsx` F3 (P3 share by sector) as a reference implementation.

## Audit (prod, 2026-09-19)

| Claim | Live source |
|---|---|
| 2,974 P3 vendors · 526.8B | `/atlas/cluster-stats?lens=patterns` P3 = **2,972 vendors · 556.5B MXN**; `/aria/stats` pattern_counts P3 2972 |
| Infrastructure 1,128 P3 vendors · 179.5B; Energy 463 …; "three sectors 414B" | `/aria/patterns/P3/institutions?group=sector` (Day 4): infrastructure 1,128 · 179.5B ✓, energy 462 · 130.5B, health 476 · 104.3B → three sectors ≈ 414.3B ✓ (recompute at build) |
| **CONSTRUCTORA ARHNOS "32 billion across six contracts, average ticket 5.3B" as the prototype broker** | `/aria/queue?search=ARHNOS`: vendor 28111 is **Tier 3, `review_status = false_positive`**, P3 0.63; GRUPO CONSTRUCTOR MARHNOS 196903 T2 P5-primary `false_positive`. The story's lead example is a reviewed false positive — it must go. Verified P3 leads by value (`/aria/queue?pattern=P3&sort=value`): MANEJO INTEGRAL EN CONSULTA EMPRESARIAL 136648 (T1, P3 0.785, 6.3B in 2 contracts, top buyer CFE 100%, GT), LAMAP 308216 (T1, 4.7B/17, IMSS-Bienestar), UAB JORINIS 266933 (T1, 2.0B/5, BIRMEX 100%, GT), CONSTRUCCIONES E INMOBILIARIAS C… 224275 (1.7B/4, SLP 100%), PNPDMI 267977 (1.4B/12, SEGALMEX), GRUPO LABORATORIOS IMPERIALES 236035 (1.3B/24, SSA), WHITEMED 312747 (1.1B/34, IMSS) |
| ch4 "0 major COFECE procurement cartel cases, last 5 years" | external claim, unsourced in the story — keep only with a citation the executor can add from the story's own `sources`; otherwise replace with the ARIA review funnel for P3 (live) |
| flows "agency → intermediary" | `/aria/queue?pattern=P3&sort=value&per_page=…` rows carry `top_institution` + `top_institution_ratio` + `total_value_mxn` → institution → vendor flows for a Sankey (`components/charts/MoneySankeyChart.tsx`, props `flows: {source,target,value,contracts}[]`) |

Chart forms: share by category → the Day 4 sector bar (reuse); ticket size vs norm → dot plot on a log axis with the sector's mean contract value as the reference; flow → Sankey (≤ 12 flows, printed values); ranking → live roster; nested review counts → funnel.

## Keep
Four chapters, the "a peso enters, a peso leaves" thesis, the chapter grammar (signature → channels → named brokers → enforcement void), the newsroom voice, ClosingCoda, folio chrome.

## Change 0 — fact refresh + the false-positive lead (EN + ES; ledger in the commit)
- Cohort numbers from the endpoints (2,974 → live, 526.8B → live, sector splits → live).
- **Remove CONSTRUCTORA ARHNOS as the prototype** everywhere (subheadline, ch3 prose, pull-quote "5.3B average ticket", card brief) — ARIA reviewed it as a false positive and the story may not name a cleared vendor as a broker. Replace with the verified top-value P3 vendor whose ticket signature the data supports (compute `total_value_mxn / total_contracts` for the live top-10; pick the one with the largest ticket among GT-confirmed or T1 rows; name it, its buyer, its contract count and ticket) and say plainly that ARIA files it under P3 at confidence x, Tier y. Keep "matches the pattern", never "is a front".
- "Three signals describe a firm built to do nothing" stays if the three signals are the P3 definition in `docs/ARIA_SPEC.md` (check § P3) — quote the spec's actual signals.
- ch4: the COFECE claim stays only with a source line; the enforcement-void argument is carried by F5's live funnel.
- `entities`: the live top-5 P3 vendors (ids above, re-fetched) + their top institutions where an institution id can be resolved (`/institutions?search=`).
- Headline: the current "Follow the Middleman" / "Sigan al Intermediario" may stand if the rewritten story still supports it; propose in the report either way; the card must match the story h1.

## Figures (5) — `components/stories/live/IntermediaryFigures.tsx`, one chunk, `useQueries`

### F1 · Ch1 (hero, scrolly) «La firma» — P3 share of flagged spend by sector (live: `p3-sectors`)
- Reuse Day 4's sector share renderer (import, do not fork; parametrise pattern = P3) as the hero figure with stages: 0 = all 12 sectors ordered by share; 1 = the three named sectors (infrastructure, energy, health) highlighted with their P3 value printed; 2 = the three-sector sum callout (the "414B" recomputed); 3 = the cohort total and count. Anchor = P3 cohort value + "in contracts won by {n} intermediary-pattern vendors" / ES.
- Accept: 12 rows equal the endpoint; sum callout equals the three rows' sum at 0.1B; stages 0→3.

### F2 · Ch2 «Los canales» — institution → intermediary flows (live: `p3-flows`)
- `MoneySankeyChart` with ≤ 12 flows: top P3 vendors by value (`/aria/queue?pattern=P3&sort=value&per_page=12`) as targets, their `top_institution` as sources, `value = total_value_mxn × top_institution_ratio`, `contracts = total_contracts`; institutions with one flow merge nothing; a printed table under the chart (source · vendor · value · share) so nothing depends on the ribbon widths; HTML labels; check the Sankey's own label rendering for clips at 390 (if it uses SVG text that scales, wrap it in `ScrollSvgFrame` or render labels in HTML). Anchor = the largest flow.
- Accept: 12 flows equal the endpoint rows; census 0.

### F3 · Ch3 «El ticket» — contract value per contract, P3 leads vs sector norm (live: `p3-ticket`)
- Dot plot, log x-axis (10M → 10B): one row per top-10 P3 vendor (chips), the dot = `total_value_mxn / total_contracts`, a hollow reference dot = the vendor's primary sector `avg_contract_value` from `/sectors` (all-years); printed both values and the multiple ("×"). Anchor = the largest multiple + the vendor. Annotation says what a ticket is and why a broker's is large.
- Accept: 10 rows; every multiple equals the two endpoints' ratio at 0.1; vendor chips resolve.

### F4 · Ch3 «El registro» — live roster (live: `p3-roster`) replaces the typed `p3-top-vendors` bar
- Top-10 by value: rank · chip · value · contracts · top institution + ratio · tier · GT/confirmed badge · P3 confidence. Any vendor whose `review_status` is `false_positive` or `dismissed` is **excluded** and the annotation says so.
- Accept: rows equal the endpoint; no false-positive row.

### F5 · Ch4 (closing) «Adónde aterriza» — the P3 review funnel (live: `p3-queue`)
- `FunnelStrip`: P3 cohort → Tier 1–2 → in ground truth → reviewed → confirmed (from `/aria/queue?pattern=P3&tier=…` pagination totals and `/aria/stats` where filterable; state exactly which endpoint each count comes from). Anchor = P3 vendors with no review disposition. If the COFECE line survives with a source, it becomes the annotation's last sentence.
- Accept: counts equal the endpoints.

## Story data changes
ch1 `live: 'p3-sectors', scrolly: true`; ch2 `live: 'p3-flows'` (typed bar removed); ch3 `live: 'p3-ticket'`, `live2: 'p3-roster'` (typed bar removed); ch4 `live: 'p3-queue'`. Entities per Change 0.

## Acceptance (`sd05.mjs`, 1440 + 390, EN + ES)
≥ 5 live figures; numbers equal the endpoints; "ARHNOS" absent from the page text in both languages (unless mentioned as a cleared false positive — not recommended); retired numbers absent; stages 0→3; Days 1–4 scrollies step; `clipcensus.mjs` 0 clips + 0 narrow captions (EN + ES, 1440/1280/1024/390) on the story; figures 760 on the axis; 0 console errors; card headline == story h1.

## Build notes
Branch `story/day-05-intermediario` off origin/main after Day 4 ships. Same rules (read fully, ≤3 edits per re-read, no bare stash, no junction, temp under D:\, sticky chrome hidden in crops, unbreakable value+unit only where it fits the narrowest line). Local backend not needed (the aggregate is on prod after Day 4's deploy — verify with curl first; if not yet live, run the local backend on 8002 as Day 4 did). Commit: `feat(stories § SD-05 la-industria-del-intermediario): live P3 figures — sector share scrolly, institution→intermediary flows, ticket signature, roster, review funnel; false-positive lead removed, facts refreshed`. Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No BUILD_ID, push or deploy.
