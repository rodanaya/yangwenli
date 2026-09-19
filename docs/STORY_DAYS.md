# STORY DAYS — remaking the 13 investigations' graphics (Sep 2026)

> User (2026-09-18, after PARALLAX Day 3): "this story barely has any graphs and it looks empty. there is no innovation and good graphs here. take a look at each one of these stories and then remake them using ui pro max with fable and with some react elements in it."
> Invoke a day with **"do story day N"**. One story per day. Fable designs the figure plan (ui-ux-pro-max `--domain chart` per data shape, folio aesthetic), Opus builds, Fable judges on crops, ship, `/rinse`.

## Principles

1. **Every chapter gets one figure that advances the argument.** No chapter is prose + a quote tile.
2. **Live over typed.** Where the platform already has an API-backed plate for the subject (`/gap`, `/administrations`, `/captura`, `/sectors`, vendor dossier), the story embeds that React component, fed by the same endpoint, with links into the dossiers. Typed numbers in `story-content.ts` stay only where no endpoint exists — and then they are checked against the live cut.
3. **One scrolly per story** where there is a sequence to walk: a figure that steps as the reader scrolls (vertical, single column — it must work inside the 640/760 reading frame at every width).
4. **Interaction that means something**: hover reveals the entity, a toggle switches the lens, a slider moves a threshold. No decoration.
5. **Folio chrome**: every figure wears `ChartCard` (eyebrow · title · anchor · annotation · stamp), 760 wide, on the story's text axis (PARALLAX Day 3b). Dot-grid banned, no italic, no green for low, HTML owns glyphs.
6. **Honesty**: a live figure that fails to load says so in one mono line; nothing is faked. Numbers in prose that a figure also shows must agree with the figure.
7. **No clipped text, ever** (user, 2026-09-18: "The text cuts halfway. This has to be corrected here and henceforth."). Hard gate for every day: `_parallax_shots/story-days/clipcensus.mjs <base> <routes> <widths>` at 1440 / 1280 / 1024 / 390, EN **and** ES, must report **0** clipped text nodes on the story and on every page whose shared component the day touched — excluding `sr-only` and `aria-hidden` decoration. The three clip vectors it checks: (a) a node's `scrollWidth > clientWidth` under `truncate`/`nowrap`, (b) a text box escaping its nearest `overflow: hidden|clip` ancestor, (c) an SVG `<text>` outside its `<svg>` box. Fixes are structural: give the label its own line, drop a fixed-width strip below `sm`, size gutters from the copy, measured-width viewBoxes with HTML glyphs — never `truncate` on a value, label or name. Crops for the judge must hide sticky chrome first (`page.addStyleTag` making `.sticky`/`.fixed` static) so a captured header bar is never mistaken for clipped text. **Caption layout is part of this gate** (user, second complaint 2026-09-18 21:30: "Again with the text not properly formatted below the graphic"): text inside a figure spans the figure's interior (`main figure :where(p, figcaption, li, dd) { max-width: none }` — the 68ch measure is for running prose only); a number never breaks across lines (`whitespace-nowrap` on values; the label drops to its own line instead); legends wrap by whole item; captions 12.5px mono, `text-wrap: pretty`. The census reports a "narrow-caption" hit for any caption inside a figure that renders ≥ 2 lines at < 85% of the figure's content width. Exempt by decision (judge, 2026-09-18): deliberate `line-clamp-N` teasers that end in an ellipsis and open the full text on click (`StoryCard` related teasers, the `/gap` register's contract titles) — they are previews, not cut text; the census still lists them so a new clamp on a value or a name is caught.

## Ritual (per day)

```
1. AUDIT  (Fable) — read the story's chapters; list each chapter's claim, its current figure, the data behind it, the live component/endpoint that could carry it; census figures.
2. DESIGN (Fable) — ui-ux-pro-max --domain chart for each data shape; write docs/story-days/SD-NN-<slug>.md: Keep · Figures (one per chapter: form, data source, interaction, acceptance) · Number refresh list · Out of scope.
3. BUILD  (Opus subagent, worktree parallax-day01, branch story/day-NN-<slug> off origin/main)
4. REVIEW (Opus: rubli-bilingual-audit, vercel-react-best-practices; gates tsc/build/lint:tokens; backend tests if an endpoint is touched)
5. JUDGE  (Fable: crops at 1440 + 390 per chapter; numbers vs API)
6. SHIP   (rubli-prod-deploy; verify by served chunk string)
7. CLOSE  (/rinse "Story Day NN+1: <slug>")
```

## Schedule — weakest first (figures per chapter, Sep 18 inventory)

| Day | Story | Ch | Figures now | Plan | Status |
|---|---|---|---|---|---|
| 1 | `el-vacio` | 5 | 2 → 7 | live `/gap` plates: blackout scrolly · recovery funnel · exception catalog · buyers ledger + counterparty · structural grade; number refresh to the live cut (69,516 → 94,899 …) · `e6a51551`+`950efa06`+`00bd33fc`, BUILD_ID `2026-09-18-story-d1-el-vacio` — `docs/story-days/SD-01-el-vacio.md` | ✅ Sep 18 |
| 2 | `el-ano-de-la-emergencia` | 3 | 1 → 5 | **thesis corrected from the endpoints**: no 2020 direct-award spike (77.8 → 78.1%; the story said 72.3 → 87%), contracts fell 18%, money rose 45%; the ratchet is real (every post-2020 year above any pre-2020 year) → headline "The Ratchet: Competition Never Came Back"; HEMOSER = 4.48B in 2020 (97% IMSS), ARIA P7 / T2 / confirmed_corrupt, not P2. Live figures: DA floor 2010–19 · 36-month rate/value scrolly · HEMOSER 2020 calendar · ratchet 2010–24 · sector dumbbell · `ebd9897c`+`1f13277e`, BUILD_ID `2026-09-18-story-d2-emergencia` — `docs/story-days/SD-02-el-ano-de-la-emergencia.md` | ✅ Sep 18 |
| 3 | `el-cartel-de-los-vales` | 3 | 1 → 4 | **thesis corrected**: five issuers not three (Toka, the largest, was missing), 142.6B computed instead of an unsourced 240B, Edenred DA 39.8% not 96.7%, "P5 · voucher cartel" → ARIA P5 = systematic overpricing (no cartel claim), the lead changed hands 3× (Efectivale → Si Vale → Toka → Edenred) → headline "Five Firms, a Closed Market, and a Winner That Keeps Changing". Live: stacked years scrolly with share lens + tenure bands · two-doors dumbbell · ARIA roster with chips · sexenio shares. Shared-chrome fixes shipped with it: PlateFrame folio label (ES clip), **captions span the figure / numbers never break / legends wrap by item** (user complaint) · `ceddfaa3`+`39775507`+`bb05caf5`+`7cea8bf8`, BUILD_ID `2026-09-18-story-d3-vales` — `docs/story-days/SD-03-el-cartel-de-los-vales.md` | ✅ Sep 18 |
| 4 | `captura-institucional` | 5 | 2 → 5 | **arrow corrected**: P6 measures a vendor's dependence on a buyer, not a buyer's captured budget (3,468 vendors route ≥ 80% of their contracting to IMSS; no vendor dominates IMSS) → headline "The Suppliers Who Cannot Leave" / "Los proveedores que no pueden irse"; La Estafa Maestra stated as acquitted (SCJN 2024); 15,923 → 15,939, 401.8B → 405.3B (as vendor anchor), 1.06T → 1.08T, infra P3 share 19.6% → 12.1%, queue 18,897 → 18,242. New backend aggregate `GET /aria/patterns/{code}/institutions[?group=sector]` (+ tests). Live: IMSS dependence scrolly · P6 by buyer + landscape funnel · P3 share by sector · Estafa vs cohort · review funnel · `b01cf625`+`32ed926e`+`aa072940`, BUILD_ID `2026-09-19-story-d4-captura` — `docs/story-days/SD-04-captura-institucional.md` | ✅ Sep 19 |
| 5 | `la-industria-del-intermediario` | 4 | 2 → 5 | **prototype broker was an ARIA false positive** (CONSTRUCTORA ARHNOS) — removed; new lead MANEJO INTEGRAL EN CONSULTA EMPRESARIAL (6.31B in 2 contracts at COMESA, 504× the sector ticket, T1, GT); of the 36 largest P3 vendors 6 cleared ones hold 51.5% of the money → the thesis moved to "the biggest names are not the best leads"; COFECE "0 cases" dropped (unsourced); 2,974 → 2,972 · 526.8B → 556.5B. Live: sector-share scrolly · buyer→broker channel ledger (Sankey rejected: dead code with clipped SVG labels) · ticket lane (13 T1 vendors, 7.9×–504×) · disposition ledger · review funnel (2,691 never opened). Spanish log axis fixed to MDP. `e76ed14b`, BUILD_ID `2026-09-19-story-d5-intermediario` — `docs/story-days/SD-05-la-industria-del-intermediario.md` | ✅ Sep 19 |
| 6 | `el-ejercito-fantasma` | 4 | 2 → 5 | **EFOS-confirmed count was 42; the register says 126** (three endpoints agree; the ghost ranking table is one import behind) → 2.1% not 0.7%, 5,992 unconfirmed; RUBLI latency "2 wks" → measured 4m 57s (run d4e7b665); the five named vendors verified (ranks 1–5 by value); three personas físicas each won 372.2 MDP in their first year. Live: lifecycle strips scrolly · roster · population strip (no lattice) · ✓/— signal matrix (SAT's five listed = 27.4 MDP vs five unlisted = 4,365 MDP) · Two-Worlds match ledger (2.1% of the cohort, 0.9% of SAT's list). Headline kept; card headline aligned. `32e29941`, BUILD_ID `2026-09-19-story-d6-fantasma` — `docs/story-days/SD-06-el-ejercito-fantasma.md` | ✅ Sep 19 |
| 7 | `el-umbral-de-los-300k` | 3 | 2 | interactive threshold histogram (draggable line) · per-institution small multiples | ⬜ |
| 8 | `la-ilusion-competitiva` | 5 | 3 | live sector competition slope · single-bidder waffle per year | ⬜ |
| 9 | `marea-de-adjudicaciones` | 5 | 4 | DA tide scrolly with sexenio shading + seam strip · sector deviation small multiples | ⬜ |
| 10 | `el-sexenio-del-riesgo` | 5 | 3 | Survivors slope + per-administration grade cards from `/administrations` | ⬜ |
| 11 | `el-gran-precio` · `el-monopolio-invisible` · `volatilidad-el-precio-del-riesgo` | — | 3–5 | keep; entity chips where a vendor is named | ⬜ |

`/journalists` is not in the queue (the Guardian list stays).

## QC list (false claims found on OTHER surfaces while remaking a story — fix in the QC pass)

- `frontend/src/lib/atlas-stories.ts` ~176, 359–363: the Atlas "COVID Year" narrative asserts 87% direct award in 2020 as "the highest single-year reading" (EN + ES) — live series says 78.1% (found on Day 2).
- `story-content.ts` story `el-gran-precio` (~1308/1314): names CONSTRUCTORA ARHNOS (ARIA `false_positive`) as the extreme single-contract case, EN + ES (found on Day 5) — fix on Day 11 or in QC.
- `captura-institucional` ch4 prose types "176 of them are already documented cases" while the live P3 GT count is 155 and its own F4 renders the live value (found on Day 5) — one-line fix.
- `frontend/src/components/charts/MoneySankeyChart.tsx` is dead (zero callers) and clips its labels (negative-x `<text>`, `slice(0,20)+'...'`) — delete in QC.
- `/journalists` card `status` says `reporteado` for `la-industria-del-intermediario` while the story is `solo_datos` — reconcile card status with story status for all 13 in QC.
- Shared story footer (`MethodologySection` in `StoryNarrative.tsx` / `story.methodologyP1` i18n) says "3,051,294 federal contracts" as the full register; that is the **scored** corpus, the register holds 3,058,286 — say "scored" (found on Day 6).
- `ghost_confidence_scores` (served by `/aria/ghost-suspects`) is one EFOS import behind the queue (42 vs 126 EFOS; 6,034 vs 6,118 rows) — rerun `scripts.compute_ghost_confidence` (backend task, found on Day 6).
- A fourth persona física at SAE (JOSE MANUEL CAMPERO PARDO, 373.0 MDP) matches the three the ghost story names — worth one sentence in QC.
- `frontend/src/components/dashboard/MacroArc.tsx:23`: hardcoded `YEARLY_DA` series disagrees with `/analysis/year-over-year` almost everywhere (2020 87 vs 78.1; 2022 75 vs 79.1; 2024 72 vs 79.4; 2002–09 invented, Structure A has no procedure type) and pulls out 2020 as the peak (found on Day 2).

## Day files

`docs/story-days/SD-NN-<slug>.md` — written by Fable at DESIGN, updated with commit + BUILD_ID at SHIP.
