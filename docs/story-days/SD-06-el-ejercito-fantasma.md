# Story Day 6 — `el-ejercito-fantasma` («El Hombre Que Ganó 370 Millones de Pesos y Desapareció»)

Story: `frontend/src/lib/story-content.ts` slug `el-ejercito-fantasma` (4 chapters: ch1 "The Vendor With No Past and No Future" (typed `inline-roster`, five named P2 vendors), ch2 "Pull Back the Camera", ch3 "Why the Official List Is Always Late" (typed `editorial-cleveland-pair`, SAT vs RUBLI latency), ch4 "The Name We Have, the Name We Don't"); leadStat 6,118; kickers 370M / 6,118 / 42; the June remake's approved proof story — **voice is untouchable**; the dot-grid (42 vs 6,076) was banned by the user and must not return in any form.
Plumbing from Days 1–5; the Day 4 aggregate; `/aria/ghost-suspects`.

## Audit (prod, 2026-09-19)

| Claim | Live source |
|---|---|
| Emilio Carranza Obersohn, one person, two contracts ≈ 370M, 2011 only | `/vendors?search=CARRANZA OBERSOHN` → **65586**, 2 contracts, 376M, 2011–2011, risk 1.0, not EFOS ✓ |
| 6,118 P2 vendors; 42 confirmed on SAT's EFOS list; 6,076 not; EFOS list 13,960 entities (Apr 2026); SAT latency vs RUBLI | `/atlas/cluster-stats?lens=patterns` P2 = 6,118 · 39.6B ✓; `/aria/patterns/P2/institutions` cohort {GT 52, reviewed 49, confirmed 38, T1 40, T2 386, T3 1,126, T4 4,566}; `/aria/queue?pattern=P2&efos_only=true` → pagination.total = the live EFOS-confirmed count (verify the "42"); `/aria/ghost-suspects` → per vendor `ghost_signal_count`, `ghost_confidence_tier`, `sig_efos_definitivo`, `sig_sfp_sanctioned`, `sig_disappeared`, `sig_young_company`, `sig_ultra_micro`, `sig_short_lived`, `sig_temporal_burst`, `shell_flags[]`, `years_active`, `total_value_mxn` (paginated) |
| five named P2 vendors (Carranza, Pueblita, Fernández…, two foreign entities) | `/aria/queue?pattern=P2&sort=value`: top by value RAPISCAN SYSTEMS 205012 (T1, 2.51B/2, needs_review, GT), APIS FOOD BV 124418 (0.73B/3, confirmed, GT), FERROCLIN 236078 (0.30B/7, EFOS, confirmed), GRUPO CONSTRUCTOR RAIZA 232553 (EFOS, confirmed)… — the story's five must be re-verified by name (`/vendors?search=`) and by their ARIA row; any `false_positive`/`dismissed` row leaves the roster |
| SAT latency ("2 wks") | the pull-quote's own sources; no endpoint — keep typed with its citation, or drop the chart if the numbers cannot be traced |

Chart forms: a lifecycle (appear → win → vanish) → a year strip per vendor with the active years filled (`years_active`, first–last year); population by two continuous attributes → beeswarm/strip plot (`RiskSpendBeeswarm` exists in `components/sectors/` — check its API; else a measured-width dot strip with HTML labels); a matched/unmatched split → the Two-Worlds proportional ledger (Day 2b, `TwoWorldsExhibit.tsx` in `components/methodology/`), never a dot field; ranking → live roster; signals per vendor → a small binary matrix (HTML grid, printed ✓/—), never colour alone.

## Keep
The voice and structure of all four chapters (this is the user-approved proof story), the Carranza lede, the three-signal explanation of P2, the SAT-latency argument, pull-quotes, ClosingCoda, chrome. **No dot-grid.**

## Change 0 — verification, not rewrite (EN + ES; ledger in the commit)
- Verify every number against the endpoints (6,118 · 42 · 6,076 · 370M · 13,960 · each named vendor's contracts/value/years). Replace only what the endpoints contradict; the story's prose stays otherwise. If the live EFOS-confirmed count differs from 42, update the number everywhere it appears (ch4 "42 confirmed, 6,076 not", pull-quotes, kickers, card).
- Named vendors: confirm each of the five has a vendor id and an ARIA row that is not `false_positive`/`dismissed`; if one fails, replace it with the next verified P2 vendor by value and say so in the ledger.
- `entities`: Carranza (65586) + the verified named vendors, with `riskScore`/`ariaTier`.

## Figures (5) — `components/stories/live/GhostFigures.tsx`, one chunk

### F1 · Ch1 (hero, scrolly) «Aparece, gana, desaparece» — lifecycle strips (live: `p2-lifecycle`)
- For Carranza + the four verified named vendors: a 2002–2025 year strip per vendor (24 cells, HTML), active years filled (from `/vendors/:id/risk-timeline`), the win value printed on the active cell(s), grey before/after; chips as row labels. Stages: 0 = Carranza only; 1 = the persons (rows 3–5 of the roster); 2 = the foreign entities; 3 = the caption "N vendors, M active years in total, all gone by {year}". Anchor = Carranza's 376M + "two contracts, one year, then nothing" / ES.
- Accept: strips equal each vendor's timeline; stages 0→3; zero-clip.

### F2 · Ch2 «Retrocede la cámara» — the 6,118 as a population (live: `p2-population`)
- From `/aria/ghost-suspects` (paginate; if the endpoint caps, use the first 1,000 by confidence and print "first 1,000 of N"): a strip plot, x = lifetime value (log, 10K → 10B), y jittered, one small mark per vendor, marks with `sig_efos_definitivo` in critical, others muted; printed summary row (count, median value, share with ≤ 1 active year, share EFOS). HTML axis labels; the marks are SVG circles ≤ 3px — this is a distribution, not a dot-grid tally (say so in the code comment; no grid, no ordering by count). Anchor = the share of the cohort active for a single year / ES.
- Accept: counts equal the endpoint; census 0.

### F3 · Ch3 «La lista oficial llega tarde» — keep the cleveland pair only if traceable; add the signal matrix (live: `p2-signals`)
- Signal matrix for the five named vendors + the top-5 by `ghost_confidence_score`: rows = vendors (chips), columns = the eight `sig_*` flags with short printed headers (EFOS · SFP · vanished · young · micro · short-lived · burst · P7), cell = ✓ or — (never colour alone), last column = `ghost_confidence_tier`. Anchor = the number of the ten that SAT's EFOS list already confirms.
- The typed cleveland pair (SAT vs RUBLI latency) stays if its numbers carry a source line in `sources`; otherwise remove and let the matrix carry the chapter.

### F4 · Ch4 (closing) «El nombre que tenemos» — the match ledger (live: `p2-match`)
- The Two-Worlds proportional ledger (import `TwoWorldsExhibit` or its row primitive from `components/methodology/`): row A = P2 cohort 6,118 split into EFOS-confirmed / in ground truth (not EFOS) / neither; row B = SAT EFOS list size if an endpoint exposes it (`/intersection/summary` has `official_record` — check) else omitted with a typed, sourced number; the ×10 lens for the small segment as on `/methodology`. Anchor = the EFOS-confirmed count + "of {cohort} already on SAT's list" / ES.
- Accept: segments sum to the cohort; the confirmed count equals `/aria/queue?pattern=P2&efos_only=true` total.

### F5 · Ch4 — live roster (live: `p2-roster`) replaces the typed `inline-roster`
- Top-8 P2 by value from the queue with chips, value, contracts, years, EFOS badge, tier, GT/confirmed; `false_positive`/`dismissed` rows excluded and the annotation says so; Carranza pinned as row 1 if not in the top 8 (labelled "pinned · the lede").

## Story data changes
ch1 `live: 'p2-lifecycle', scrolly: true` + `live2: 'p2-roster'` (typed roster removed); ch2 `live: 'p2-population'`; ch3 `live: 'p2-signals'` (+ typed cleveland if sourced); ch4 `live: 'p2-match'`.

## Acceptance (`sd06.mjs`, 1440 + 390, EN + ES)
≥ 5 live figures; numbers equal the endpoints; no `circle` grid tally anywhere (probe: no figure with > 200 circles arranged on a regular grid — count distinct x positions); stages 0→3; Days 1–5 scrollies step; `clipcensus.mjs` 0 (EN + ES, four widths); 0 console errors; card headline == story h1 (headline unchanged unless a number in it moved).

## Build notes
Branch `story/day-06-fantasma` off origin/main after Day 5 ships. Same rules as Days 1–5 (read fully, ≤3 edits per re-read, no bare stash, no junction, temp under D:\, sticky chrome hidden in crops, unbreakable value+unit only where it fits, write the report to `_parallax_shots/story-days/sd06-report.md` as well as messaging). Commit: `feat(stories § SD-06 el-ejercito-fantasma): live P2 figures — lifecycle scrolly, population strip, signal matrix, match ledger, roster; numbers verified`. Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No BUILD_ID, push or deploy.
