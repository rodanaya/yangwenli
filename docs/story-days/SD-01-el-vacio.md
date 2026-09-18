# Story Day 1 — `el-vacio` («Un Gobierno Borró Su Propio Registro de Compras»)

Story: `frontend/src/lib/story-content.ts` slug `el-vacio` (lines ~425–718) · page `frontend/src/pages/StoryNarrative.tsx` · front-page entry `frontend/src/pages/Journalists.tsx` (`INVESTIGATIONS[1]`).
Live source: `GET /api/v1/gap/summary` (`GapSummaryResponse`, `frontend/src/api/types.ts:2895`) and `GET /api/v1/gap/contracts` (`gapApi`, `frontend/src/api/client.ts:3838`). Existing plates on `/gap` (`frontend/src/pages/Gap.tsx`, `frontend/src/components/gap/*`).

## Audit (2026-09-18, prod)

| Chapter | Claim | Figure now | Live data available |
|---|---|---|---|
| 1 The Year the Lights Went Out (hero) | the record stopped on 28 Sep 2025 | none — "Sep 28 2025" quote tile | `BlackoutTimeline` (`components/gap/BlackoutTimeline.tsx`, HTML/CSS, takes `totalContracts`) |
| 2 We Read the Silence | the portal's signature was reproduced; 69,516 awards enumerated; OCR pulled amounts off scans | none — "69,516" quote tile | summary: `total_contracts` 94,899 · `direct_award_count` 74,435 · `recovered_count` 22,438 · `recovered_sum_mxn` 92.9B |
| 3 Four in Five, No Bid | 78.7% direct award; three of four awards disclose no amount; Art. 55 vs Art. 54 | typed `inline-bar` (procedure types) | `direct_award_pct` 78.4 · `by_exception_article` (8 rows) · `ExceptionCatalog` component |
| 4 What the Scans Were Hiding | 65.5B recovered; Pfizer 3.15B; a company born months before it won | typed `inline-roster` (top recovered) | `worst_institutions` (10) · `young_vendor_count` 99 · `efos_count` 0 · `BuyersLedger`, `CounterpartyExhibit` · `/gap/contracts` sorted by amount |
| 5 Grading the Dark | an outside record can grade what the state stopped grading | none — "13.5%" quote tile | `by_risk_level` {81 / 14,023 / 41,153 / 39,642} · `grade_methodology` · `GradeBlock` (inline in `Gap.tsx:80`) |

**The typed numbers are stale.** The story was written on the June cut (69,516 awards, 65.5B recovered); the September refresh (`c214448e`, Phase A) lifted prod to 94,899 awards / 22,438 priced / 92.9B MXN. Live figures beside the old prose would contradict it. Day 1 therefore refreshes every number in the story that the summary endpoint carries (Change 0) and makes the figures live so this cannot happen again.

Chart forms (ui-ux-pro-max `--domain chart`): time series with an interruption → line/diagram with highlights (the existing two-track blackout diagram); part-to-whole with one dominant segment → the existing horizontal ranked bar; nested counts → funnel; ranking ≤15 → horizontal bar (the buyers ledger); distribution across four levels → the grade distribution bar.

## Keep

The five chapters, their order, headlines, deks and pull-quotes; the newsroom voice; the procedure-type bar in ch3 and the top-recovered roster in ch4 (they become live/refreshed, not removed); the `mass-sliver` viz on the ch4 pull-quote; ClosingCoda; the folio chrome (`ChartCard`); the Day 3b reading frame (figures 760 on the text axis).

## Change 0 — number refresh (bilingual, surgical)

Executor: fetch `https://rubli.xyz/api/v1/gap/summary` and `https://rubli.xyz/api/v1/gap/contracts?sort=amount_best&order=desc&per_page=5` (check `gapApi.getContracts` params in `client.ts`; if no sort param exists, fetch `per_page=200` and sort client-side, or add `sort` to the backend router **only if trivial** — otherwise leave the roster typed but verified). Then update, in EN and ES, every occurrence in the `el-vacio` story (hero `leadStat`/`kickerStats`, subheadline, chapter prose, pull-quote stats, chart data) and in `Journalists.tsx` `INVESTIGATIONS[1]` (`contracts`, `brief`, `brief_es`, `sub` if it carries a number):

| Was | Now (from the endpoint, not this table) |
|---|---|
| 69,516 awards | `total_contracts` |
| 54,714 direct awards · 78.7% | `direct_award_count` · `direct_award_pct` |
| 65.5B recovered | `recovered_sum_mxn` (formatCompactMXN / MDP in ES) |
| "three of every four disclose no amount" · 76% | `1 − recovered_count/total_contracts` (76.4% today — keep the phrase if it still holds) |
| ~21,000 Art. 55 | the Art. 55 row of `by_exception_article` |
| 13.5% (ch5 stat) | `(critical + high) / total` of `by_risk_level` — state what it measures in the statLabel |
| Pfizer 3.15B, the young vendor | verify against the top-5 by amount; if the ranking changed, the roster shows the live top-5 and the prose names whichever award is first |

Every number changed goes into the commit body as a before → after list. Do not rewrite sentences; replace figures only. Percentages keep one decimal where the prose had one.

## Figures (one per chapter) — new `frontend/src/components/stories/live/` + a `live` branch in `renderChartBlock`

Plumbing:
- `StoryChartConfig` gets `live?: 'gap-blackout' | 'gap-funnel' | 'gap-exceptions' | 'gap-buyers' | 'gap-grade'` (type in `story-content.ts`). `renderChartBlock` in `StoryNarrative.tsx`: when `cfg.live` is set, render `LIVE_CHART_MAP[cfg.live]` (lazy-imported from `components/stories/live/`) inside the existing 760 figure wrapper with a `Suspense` fallback = a 320px `ChartCard`-shaped skeleton (`role="status"`, bilingual label). A chapter may carry both a `live` figure and a typed `data` figure: render `live` first, then the typed one (ch3, ch4).
- `useGapSummary()` in `components/stories/live/useGapSummary.ts`: `useQuery({ queryKey: ['gap-summary'], queryFn: gapApi.getSummary, staleTime: 10 min })` — same key as `/gap`, so the cache is shared.
- Every live figure = `ChartCard` (eyebrow · Playfair title · anchor · annotation · `stamp` "RECOVERED · OCR" / "RECUPERADO · OCR") wrapping the plate. On query error or `available === false`: the card renders its title and one mono line "Live figure unavailable — see /gap" / "Figura en vivo no disponible — ver /gap" with a `Link`. Never a typed fallback number.
- `lang` from `i18n.language` as elsewhere; all strings bilingual inline.

### F1 · Ch1 «La línea del registro» — scrolly (live: `gap-blackout`)
- Component `BlackoutScrolly`: the existing `BlackoutTimeline` (import it; do not fork) rendered inside a `ChartCard` (eyebrow `FIGURE I · THE RECORD` / `FIGURA I · EL REGISTRO`, title "Twenty-three years of record, then silence" / "Veintitrés años de registro, luego silencio", anchor = `formatNumber(total_contracts)` + "awards recovered after the freeze" / "adjudicaciones recuperadas tras el congelamiento"). Add a `stage` prop (0–3) to `BlackoutTimeline` (default 3 = today's full drawing, so `/gap` is unchanged): 0 draws the official track only; 1 adds the abolition tick + annotation; 2 adds the death mark; 3 adds the recovery track + arrow + annotation. Transitions: opacity/transform only, 400ms, honour reduced motion (Day 1 `MotionConfig` covers framer; for CSS use `motion-safe:`).
- Scrolly mechanic (vertical, single column): in `HeroChapter`, when `chapter.chartConfig?.live === 'gap-blackout'`, render the figure **sticky** (`lg:sticky lg:top-24`) in the 760 column ABOVE the prose, and drive `stage` from which prose paragraph is in view (IntersectionObserver, `rootMargin: '-40% 0px -40% 0px'`; paragraph index i → stage min(i+1, 3); before any paragraph is in view → stage 0). Below `lg`: not sticky, stage 3 always. Keep the existing `ScrollReveal` on paragraphs.
- Accept (probe at 1440): the figure's wrapper has `data-stage` that reads 0 at page top, 1 when paragraph 1 is centred, 2 for paragraph 2, 3 for paragraph 3; at 390 `data-stage` = 3 and the figure is not sticky; the ch1 quote tile stays after the prose.

### F2 · Ch2 «El embudo de la recuperación» — funnel (live: `gap-funnel`)
- `RecoveryFunnel`: `FunnelStrip` (`components/capture/FunnelStrip.tsx`, import) with tiers from the summary: [`total_contracts` "procedures published after the freeze, enumerated through the reproduced signature" / "procedimientos publicados tras el congelamiento, enumerados con la firma reproducida" (zinc `var(--color-text-muted)`)] → [`direct_award_count` "awarded with no public tender" / "adjudicados sin licitación pública" (amber `var(--color-accent)`)] → [`recovered_count` "with a price read off the scanned award notice by OCR — {formatCompactMXN(recovered_sum_mxn)}" / "con precio leído del fallo escaneado por OCR — {…}" (critical `var(--color-risk-critical)`)]. ChartCard eyebrow `FIGURE II · THE RECOVERY`, anchor `formatCompactMXN(recovered_sum_mxn)` + "read off the images" / "leído de las imágenes". Annotation: the honesty line about log-scaled bar lengths already in FunnelStrip's header — repeat it in one sentence.
- Accept: the three counts rendered equal the endpoint's values at probe time; ES renders MDP.

### F3 · Ch3 — keep the procedure bar (refreshed) + exception catalog (live: `gap-exceptions`)
- `ExceptionsFigure`: `ExceptionCatalog` (import; props `items = by_exception_article`, `daCount = direct_award_count`) inside a ChartCard (eyebrow `FIGURE III · THE EXCEPTIONS`, title "The legal doors the awards walked through" / "Las puertas legales por las que pasaron las adjudicaciones", anchor = the Art. 55 count + "cite the low-value threshold" / "citan el umbral de bajo monto"). Order: typed bar first (it opens the chapter's "four in five"), then the live catalog.
- Accept: 8 rows rendered, the Art. 55 and top Art. 54 rows match the endpoint; the typed bar's DA share equals `direct_award_pct` (Change 0).

### F4 · Ch4 — buyers ledger + counterparty (live: `gap-buyers`) + refreshed roster
- `BuyersFigure`: two stacked plates in one ChartCard (eyebrow `FIGURE IV · THE BUYERS`, title "Who bought in the dark" / "Quién compró a oscuras"): `BuyersLedger` (`items = worst_institutions`, `onPick` → `navigate('/gap?inst=' + siglas)` — check the `/gap` URL param name in `Gap.tsx` and use it) and, below a hairline, `CounterpartyExhibit` (`youngCount`, `efosCount`). Anchor = `young_vendor_count` + "vendors younger than three years" / "proveedores con menos de tres años".
- The typed roster (`gap-top-recovered`) stays after it, with its numbers verified/refreshed (Change 0).
- Accept: 10 ledger rows, siglas click navigates to `/gap` with the filter applied; young/EFOS counts match the endpoint.

### F5 · Ch5 «Calificar la oscuridad» — structural grade (live: `gap-grade`)
- STEP 0 inside this change: extract `GradeBlock` from `Gap.tsx` (lines 80–181) into `components/gap/GradeBlock.tsx` (same markup, same props; `Gap.tsx` imports it — zero visual change on `/gap`; the raw `#71717a` stays as is, backlog).
- `GradeFigure`: `GradeBlock` inside a ChartCard (eyebrow `FIGURE V · THE GRADE`, title "The dark, graded" / "La oscuridad, calificada", anchor = `((critical + high) / total)` as a percentage + "of recovered awards carry high or critical structural flags" / "de las adjudicaciones recuperadas con banderas estructurales altas o críticas"). Render it in `ClosingChapter` before the pull-quote (the pull-quote's `stat` is refreshed to the same percentage in Change 0).
- Accept: the four counts and the percentage match the endpoint; `/gap` renders identically before/after (probe: `#grade` or the GradeBlock's aria text present, same counts).

## Story data changes (`story-content.ts`, `el-vacio` only)
- ch1 `chartConfig: { type: 'live', live: 'gap-blackout', title: …, title_es: … }` — `type: 'live'` is a new literal on `StoryChartConfig['type']`; `INLINE_CHART_MAP` ignores it.
- ch2 `chartConfig: { type: 'live', live: 'gap-funnel', … }`.
- ch3 keeps its `inline-bar` config and adds `live: 'gap-exceptions'` (rendered after the bar).
- ch4 keeps `inline-roster` and adds `live: 'gap-buyers'` (rendered before the roster).
- ch5 `chartConfig: { type: 'live', live: 'gap-grade', … }`.
- `pickChapterVariant` must not change which variant each chapter gets (ch1 hero, ch5 closing, the middle three as today) — a `live`-only chartConfig counts as `hasChart`.

## Out of scope (backlog)
- A `/gap/contracts` `sort` param if the backend lacks it (typed roster stays verified).
- `ScrollySection.tsx` (two-column 40/60 sticky) is not used — it cannot live inside the single reading column; the vertical stepped-figure pattern from F1 becomes the shared scrolly primitive for the next days (extract to `components/stories/live/StickyStepFigure.tsx` if F1's logic is generic enough — executor's call, note it).
- Other stories' stale numbers.

## Acceptance (probe `_parallax_shots/story-days/sd01.mjs`, 1440 + 390, EN + ES, dev server 3011 with `VITE_API_URL=https://rubli.xyz`)
- `/stories/el-vacio`: `figure[role=img]` count ≥ 7 (5 live + bar + roster); every live figure's headline numbers equal `/gap/summary` values fetched by the probe; 0 typed-number contradictions (probe greps the page text for the OLD numbers 69,516 / 54,714 / 78.7 / 65.5 — must be absent in EN and ES); F1 `data-stage` sequence 0→1→2→3 on scroll at 1440; 0 sub-10px leaves; 0 SVG glyphs < 10px at 390; no document overflow; every figure box 760 on the text axis at 1440 (Day 3b census script `_parallax_shots/day03/align3.mjs` still passes on this story); 0 console errors; `/gap` unchanged (its own probe numbers from Day 2 still hold: 0 sub-10px, register semantics, 3 links out).
- `/journalists`: the el-vacio card shows the refreshed count.

## Build notes for the executor
- Worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, new branch `story/day-01-el-vacio` off `origin/main` (`28445346` or later — fetch first). Never bare `git stash`, never junction node_modules, temp under D:\. Ignore untracked `frontend/Python.npm-cache/`, `_parallax_shots/`.
- Read fully before editing: the `el-vacio` block of `story-content.ts`, `StoryNarrative.tsx` `renderChartBlock` + `HeroChapter` + `ClosingChapter` + the `StoryChartConfig` type, `Gap.tsx` 1–120 and 690–830, the five `components/gap/*` files, `FunnelStrip.tsx`, `ChartCard` in `InlineCharts.tsx` (~200–340), `Journalists.tsx` `INVESTIGATIONS[1]`.
- Rules: CLAUDE.md 1–8 (entity chips only for entities with ids — gap vendors have none, so names stay text); currency by surface (`formatCompactMXN` in figures, `formatDualCurrency` for hero-level stats); no green for low; no italic; no dot-grid; Spanish kickers with EN fallback.
- Gates from `frontend/`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens`; backend untouched unless the `sort` param is added (then `python -m pytest backend/tests/test_gap*.py -q`).
- Reviews: `rubli-bilingual-audit` on every touched TSX/TS; `vercel-react-best-practices` on the diff (lazy chunks per live figure, no waterfalls — one summary query shared).
- Crops: each of the five chapters' figures at 1440 and 390, plus the F1 sticky state mid-scroll, into `_parallax_shots/story-days/sd01/after/`. Read them.
- Commits: `refactor(gap § SD-01 § F5 STEP 0): extract GradeBlock` first; then `feat(stories § SD-01 el-vacio): live /gap figures — blackout scrolly, recovery funnel, exception catalog, buyers + counterparty, structural grade; numbers refreshed to the live cut` with the before → after number list in the body, citing `docs/story-days/SD-01-el-vacio.md`. Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No BUILD_ID bump, push or deploy — Fable judges first.
- Report: per-figure PASS/FAIL with the API-vs-rendered numbers, the number-refresh list, gate outputs, commit hashes, crop list.

## Result

Built by Opus executor `story-day01`; judged by Fable on `_parallax_shots/story-days/sd01/after/` (five chapters × 1440/390 + the sticky mid-scroll state).

| Figure | Rendered = `/gap/summary` at build |
|---|---|
| F1 blackout scrolly (ch1) | 94,899; stages 0→1→2→3 as the three paragraphs cross mid-viewport, sticky at lg+, stage 3 / not sticky at 390 |
| F2 recovery funnel (ch2) | 94,899 / 74,435 / 22,438 · anchor 92.9B MXN (ES 92,877 MDP) |
| F3 exception catalog (ch3) | 8 articles, Art. 55 = 30,354 (40.8% of direct awards) |
| F4 buyers + counterparty (ch4) | 10 ledger rows, 99 young vendors, 0 EFOS; click → `/gap?q=<siglas>` |
| F5 structural grade (ch5) | 14.9% high+critical; 81 / 14,023 / 41,153 / 39,642 |
| typed procedure bar (ch3) | 78.4% direct award; competitive routes = one honest row (20,464) because the endpoint has no per-type split |
| typed roster (ch4) | 4 rows re-verified live; a 3,462 MDP IMSS award outranks Pfizer but its winner is unresolved — prose now says "the largest whose winner the scans name" |

Number refresh (EN + ES + `/journalists` card): 69,516 → 94,899 · 54,714 → 74,435 · 78.7% → 78.4% · 65.5B → 92.9B MXN · 76% → 76.4% · ~21,000 Art. 55 → ~30,000 · 13.5% → 14.9% · 8.4K of 69.5K → 22.4K of 94.9K · 12,018 APB → 17,306 · "roughly ten thousand" → "more than twenty-two thousand" · INDAABIN/BIRMEX "highest" → "two of the four highest". Probe greps every old number in both locales: none.

Structural fixes the figures forced: `<main>` `overflow-x: hidden` made it a scroll container that swallowed every `position: sticky` → `lg:overflow-x-clip` scoped to `/stories/*` (site-wide lift would wake four untuned rails — backlog); ExceptionCatalog and BuyersLedger drop their dot strips below `sm` so counts and siglas read in full at 390 (also fixes `/gap` on phones). Judge rejection → `00bd33fc` (siglas truncated to one character at 390; 50 row assertions now pass on story + `/gap`).

Seven `figure[role=img]`, each 760 on the text axis at 1440; one lazy chunk + one API request for all five figures; 0 sub-10px, 0 overflow, 0 console errors, bilingual audit clean. Gates: tsc 0 · build OK · lint:tokens PASS.

Commits: `e6a51551` STEP 0 (GradeBlock extracted) · `950efa06` figures + refresh · `00bd33fc` judge fix · docs + BUILD_ID `d6a90d5b` (`2026-09-18-story-d1-el-vacio`).

Deployed 2026-09-18 14:59Z via `deploy-safe.sh` (`[deploy] done`, VPS HEAD `d6a90d5b`). Entry bundle `index-CeyJAWSN.js` → `index-Cr91clQH.js`; BUILD_ID string 1 hit in the served entry chunk; health `db_connected: true`, 3,058,286 contracts. Live probe on `/stories/el-vacio` at 1440: 7 `figure[role=img]`; rendered text contains the live `total_contracts`, `direct_award_count`, `recovered_count`, `young_vendor_count`; the old "69,516" is absent; 0 page/console errors.
