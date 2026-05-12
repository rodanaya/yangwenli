# RUBLI · Pudding Refinement Plan

> Refinement, not new charts. Fix the broken, the bilingual, and the generic.
> Source-of-truth chart vocabulary lives in `docs/DESIGN_SYSTEM.md`. This doc
> sits beside it and lists the pending polish work that brings rubli.xyz to
> Pudding.cool quality without inventing new primitives.
>
> Last updated 2026-05-05.

---

## 1 · The Pudding lesson — what specifically to borrow

Pudding is not "more charts." It is **one finding per scroll**, where the
chart is the closing punctuation on the sentence above it. Specifically:

- **Annotations are the chart**, not labels added on top. A horizontal bar
  with a callout saying "3.3× the OECD limit" is doing more work than five
  bars without context.
- **Distinctive typography per chart**, not the same `font-mono` across
  every axis. A pull-stat in Playfair Italic 800 reads differently from a
  ranked dot strip — both should keep their own voice.
- **Sub-chart-as-paragraph** — the chart finishes the sentence the prose
  started. If the prose says "energy contracts dwarf health," the chart
  must show that gap in the first 200ms.
- **Color discipline** — 2 to 3 colors per chart, semantic. Pudding never
  rainbow-codes.
- **Honest scale** — never axis-cropped. Always anchored to 0 or to the
  reference value the reader already knows.
- **Unexpected encodings where bar charts go to die** — Cleveland pairs,
  ridgelines, beeswarms, share-of-total dot grids replace the third
  monotone horizontal bar chart on a page.

### Pudding anchors we are stealing from

| Piece | Lesson we steal |
|---|---|
| **30 Years of American Anxieties** | Giant Playfair-Italic-800 hero number with a one-line caption — already our `SectorSledgehammer` / `DashboardSledgehammer` vocabulary. |
| **Where Slang Comes From** | Swimlane scatter — already our `CategorySectorSwimlane`. |
| **The Spotify Audio Aesthetic** | Annotated thermometer / radial range — encode a value against an explicit reference range, not a 0-axis baseline. **New vocabulary** for OECD-vs-actual. |
| **Why Chinese Restaurant Names Are So Similar** | Cleveland-pair dots ranked by gap, named outliers labeled in serif. **Replaces inline-bar** for ranked vendor lists. |
| **The Anatomy of a Spotify Song** | Threshold rule with dots above/below — distribution where the line itself is the editorial point. **Replaces inline-bar** for "X% of Y are above threshold Z." |
| **How Birds Get Their Names** | Ridgeline / small multiples per category — already our `EditorialDistribution`. |

If we copy one piece in spirit, it is **The Anatomy of a Spotify Song**:
each chart is a small, self-contained explanation that *names its own
finding in the chart itself*.

---

## 2 · Top 10 enhancements ranked by impact

| # | Surface | Element | Current | Pudding fix | Anchor | Effort |
|---|---|---|---|---|---|---|
| 1 | `/categories/:id` | "Who dominates this category?" Top Vendors block | Skeleton renders forever when `topVendorsLoading` never resolves on some categories — `getConcentrationBadge` reads `topVendorsData.concentration_label` that the API does not always return. | Add a real empty state branch (`concentration_label === null`) and a 5-second timeout fallback; verify endpoint `/api/v1/categories/:id/top-vendors` returns `concentration_label` for *every* category — patch backend if not. | Anatomy of a Spotify Song (always show the answer) | **S** |
| 2 | `/categories/:id` "Evolution by presidential administration" | `SexenioDotColumns` 5-column dot matrix | Admin labels and `risk · contracts` line collide on narrow viewports because they both anchor at `y = ROWS·DOT_GAP + 14/26` with `fontSize 11/10`. Plus a literal typo: `d.value \ maxValue` (backslash, not division — TS strips this silently). | Fix the backslash-vs-slash typo. Stack labels vertically with explicit line-height (`<tspan dy=...>`). Right-truncate admin to 11 chars (`PEÑA NIETO` etc). | Where Slang Comes From (clean lane labels) | **S** |
| 3 | `/sectors/2` (Otros) | `SectorSledgehammer` "LOW" tier badge inline with the spend number | The risk tier label appears mid-sentence next to the giant pesos figure, breaking the editorial hierarchy. | Move the tier badge into its own row above the number with the eyebrow kicker; tier word in `font-mono uppercase tracking-[0.15em]`, never inline with Playfair. | 30 Years of American Anxieties | **XS** |
| 4 | `/stories/...` | `inline-bar` Top 12 Mega-Contract Vendors / Mega-Contract Pesos by Sector / P3 Intermediary by Sector | Monotone red horizontal bars — the generic chart Pudding never ships. | Refactor to **Cleveland-pair compare** for ranked vendor lists; **annotated thermometer** for sector totals against a pre-computed national-average reference; **threshold rule** for Single-Bid-Rate-by-Sector (the 47% national average is the line, sectors are dots above/below). | Why Chinese Restaurant Names Are So Similar / Anatomy of a Spotify Song | **M** |
| 5 | `/stories/...` Avg Risk by Contract Size Bracket | Generic 8-bar horizontal with reference lines | Replace with a **slope-or-stairs** chart: bracket on x, risk on y, single line that climbs left-to-right; annotate the 0.40 / 0.60 thresholds as horizontal washes; label only the first ("<100K · 0.25") and last ("≥5B · 0.94"). | The Anatomy of a Spotify Song | **S** |
| 6 | i18n bugs | `RedesKnownDossier`, `CorruptionClusters`, `CapturaHeatmap`, `Intersection`, `CaptureCreep` | Pages use `useTranslation` but pass `isEs` into a hard-coded `buildCommunities(isEs)` / `buildPatternsFull(isEs)` / inline `{isEs ? 'es' : 'en'}` ternaries. When the language toggle fires, React doesn't always re-render the memoized array (no `i18n.language` in the dep list). | Audit all `buildX(isEs)` factories: depend on `i18n.language`, not on `isEs` derived once. Ensure `useMemo([..., i18n.language])`. | n/a (correctness fix) | **S** |
| 7 | Currency redundancy | `DataPullquote`, `StoryHero`, `StoryCard`, `RedThread` | `formatCompactMXN(v)` on `es` outputs "234,000 MDP" but several call sites still suffix `(≈ $13.6B USD)` from `USDTooltip`, producing `"234,000 MDP (≈ $13.6B USD)"` — same number, two units, on the same line. | Move the USD tooltip into a hover-only popover behind a small `≈$` icon. Never inline both units. | n/a (clarity fix) | **XS** |
| 8 | `/dashboard` "Where the money goes" treemap | 3 colored cells with raw pesos | Add **annotation as the chart**: a single inline label per cell ("Pharma · 1 in 4 pesos / IMSS-Maypo cluster captures 41%"). Cells stay; the editorial caption above each cell does the storytelling. | Anatomy of a Spotify Song | **S** |
| 9 | `/dashboard` Finding card #04 "INSTITUTIONAL CAPTURE" | Generic amber bar across institution rows | Replace the row bars with a **Cleveland pair** per institution: dot 1 = top vendor share, dot 2 = next-9-vendors share, line connects. The gap *is* the capture. Reference rule at OECD HHI 2,500. | Why Chinese Restaurant Names Are So Similar | **S** |
| 10 | `/networks` `FlowParticle` Community → Institution | Particle animation with 9-pt sans labels | Bump labels to 11px Playfair italic for community names (left side, named entities deserve serif), keep mono for institutions; right-align label baselines to particle stream centerline. | The Anatomy of a Spotify Song | **XS** |

### Triage — the 3 broken things

1. **Category skeleton that never resolves** (#1) — visible bug, breaks 30%+ of category profiles.
2. **Sexenio backslash typo** (#2) — `d.value \ maxValue` returns NaN on strict math; renders 0 dots silently. Already shipping wrong.
3. **`/sectors/2` tier-badge alignment** (#3) — pure CSS / DOM order fix.

---

## 3 · The i18n audit

48 page files import `useTranslation`. The bilingual bugs cluster in one
pattern: **factory functions that take `isEs` as a parameter and live
inside `useMemo` without `i18n.language` in the dep array**. When the
toggle fires, the component re-renders but the memoized array doesn't.

### Punch list

| File | Symptom | Fix |
|---|---|---|
| `pages/RedesKnownDossier.tsx` | `buildCommunities(isEs)` builds 10 hard-coded community objects, half in ES half in EN by branch. Memo deps unclear. | Make the factory consume `t()` from `useTranslation` instead of an `isEs` boolean; fall back to ES strings if the EN key is missing. |
| `pages/CorruptionClusters.tsx` | `buildPatternsFull(isEs)` — 7 patterns × `desc/how/rule` fields all branched inline. | Extract to `i18n/clusters.ts` JSON keys. |
| `pages/CapturaHeatmap.tsx`, `Intersection.tsx`, `CaptureCreep.tsx`, `Patterns.tsx` | Mixed: `t('...')` for chrome, `isEs ? '...' : '...'` for editorial copy. | Migrate inline ternaries into i18n keys. |
| `components/stories/InlineCharts.tsx` | `useEyebrow` regex translates structural labels like `"HORIZONTAL · RANKED"`. Works, but hardcoded EN→ES pairs drift from chart titles. | Move map to `i18n/charts.ts` so translators see the full surface. |
| `pages/RedThread.tsx`, `pages/StoryNarrative.tsx` | Some chapters pull `prose_es` / `title_es` from `story-content.ts`, others fall back to `prose` (English). Several stories ship ES-only or EN-only because of missing companion fields. | Audit `story-content.ts` — every `prose` needs a `prose_es` and vice-versa. Add a CI lint rule (`scripts/lint-story-i18n.mjs`) that fails on missing pairs. |
| Currency formatting | `localizeAmount` is correct, but call sites that suffix `≈ $X USD` produce double-unit lines. | Unit tooltip becomes hover-only (see #7). |
| Date formatting | `MAY 5 · 2026` (English style) ships next to `5 · MAY · 2026` on the same page. | Centralize in `lib/utils.ts::formatDateLine(date, lang)`. |

### Quick CI gate to add

`frontend/scripts/lint-i18n-coverage.mjs` — fails on:

- Any string literal `>= 4 chars` containing `[a-z]{3,}` inside `src/pages` outside `t(...)`, `formatX(...)`, or known structural enums.
- `useMemo(... , [...])` deps that reference `isEs` but not `i18n.language`.

---

## 4 · Pudding pattern library — three new vocabularies for `inline-bar`

These three vocabularies should be the canonical replacements for `type:
'inline-bar'` in `story-content.ts`. Each is a pure-SVG component in the
spirit of `InlineCharts.tsx`, sized for in-prose embedding.

### A · Cleveland-pair compare (for ranked vendor lists)

```
       ┌─────────────────────────────────────────┐
       │  GRUPO MAYPO              ◉────────◯     │
       │     #1 share                 #2 share    │
       │  PISA FARMACÉUTICA  ◉───◯                │
       │  DIMM …            ◉──◯                  │
       │  …                                        │
       │  REFERENCE: median vendor pair gap        │
       └─────────────────────────────────────────┘
```

- Filled dot = top metric (e.g., DA share). Open dot = comparator (sector
  median, prior period, OECD reference).
- Connecting line is the *editorial finding* — gap = capture.
- Sort by gap descending, not by absolute value.
- Use for: Top 12 Mega-Contract Vendors, P3 Intermediary by Sector.

Component: `frontend/src/components/stories/ClevelandPairChart.tsx`.
Registry alias: `chartConfig: { type: 'editorial-cleveland-pair' }`.

### B · Annotated thermometer (for OECD-vs-actual single-value comparisons)

```
                      ▲ 89.2%
                      │  infraestructura
       ╭──────────────┼─────────────────╮
       │░░░░░░░░░░░░░░█████████████████│
       ╰──────────────┼─────────────────╯
        0%          25% (OECD)        100%
                  reference
```

- A single horizontal range. The OECD limit is the *visible chrome* of
  the chart. The actual value is one annotated needle.
- Use for: any single-percentage finding where the OECD/EU/own-history
  reference is the editorial hook (DA rate by sector, single-bid rate).

Component: `frontend/src/components/stories/AnnotatedThermometer.tsx`.
Registry alias: `chartConfig: { type: 'editorial-thermometer' }`.

### C · Threshold rule with named outliers (for distributions)

```
                                ●
                              ●   ●         ← above 0.40
       ─── 0.40 high-risk threshold ─────────
                  ●   ●        ●
                ●         ●               ← below
                       ●
       sector lanes →
```

- A horizontal threshold rule with dots placed by value. Outliers above
  are labeled in serif italic; the rest stay anonymous.
- Use for: Avg Risk by Contract Size Bracket, Single-Bid Rate by Sector.

Component: `frontend/src/components/stories/ThresholdDistribution.tsx`.
Registry alias: `chartConfig: { type: 'editorial-threshold' }`.

---

## 5 · Implementation phases

### Phase **pudding-P1** — Bug fixes + i18n audit + alignment (1 day)

- [ ] **#1** CategoryProfile Top Vendors — empty-state branch + backend null-safety on `concentration_label`.
- [ ] **#2** SexenioDotColumns — fix `d.value \ maxValue` typo; stack labels with `<tspan dy>`.
- [ ] **#3** `/sectors/2` SectorSledgehammer — move tier badge above the number.
- [ ] **#6** Audit `buildCommunities(isEs)` / `buildPatternsFull(isEs)`; add `i18n.language` to all relevant `useMemo` deps.
- [ ] **#7** Move USD redundancy into a hover popover (`USDTooltip` → `USDPopover`).
- [ ] Add `frontend/scripts/lint-i18n-coverage.mjs` and wire to `npm run lint`.

### Phase **pudding-P2** — Refactor 5 highest-debt `inline-bar` story charts (2 days)

- [ ] Build the 3 new chart vocabularies (Cleveland-pair, Thermometer, Threshold).
- [ ] Migrate `risk-by-size-ladder` → `editorial-threshold`.
- [ ] Migrate `mega-by-sector` → `editorial-thermometer`.
- [ ] Migrate `sb-top-vendors` → `editorial-cleveland-pair`.
- [ ] Migrate `sb-by-sector` → `editorial-threshold`.
- [ ] Migrate `p3-by-sector` → `editorial-cleveland-pair`.
- [ ] Register all 3 in `StoryNarrative.tsx` `CHART_REGISTRY`.
- [ ] Update `docs/DESIGN_SYSTEM.md` primitives table.

### Phase **pudding-P3** — Polish pass (1 day)

- [ ] **#8** Dashboard "Where the money goes" treemap — annotated cell captions.
- [ ] **#9** Dashboard Finding #04 — Cleveland-pair per institution row.
- [ ] **#10** Networks FlowParticle — Playfair italic community labels left, mono institution labels right.
- [ ] Dashboard MacroArc++ — promote one annotation to Playfair italic pull-out.
- [ ] La Lente concentric rings — keep, but add one 11px serif italic finding label at the outer ring ("12% of pesos / 6% of contracts" pattern).

Total: **4 days**. Phase P1 ships first as a single PR (correctness),
P2 as one PR per chart vocabulary (3 PRs), P3 as a final polish PR.

---

## 6 · Don't-touch list

These already work and are at-or-near the bar. **Leave alone.**

- `SectorTreemap`, `CompetitionSlopeChart`, `RiskSpendBeeswarm`,
  `CategorySectorSwimlane`, `CategoryCaptureDumbbell` — the May 4 sectors
  refactor.
- `SectorSledgehammer` / `DashboardSledgehammer` — except the
  one tier-badge alignment in #3.
- `BenchmarkRow`, `EditorialDistribution`, `EditorialTimeline` — primitives.
- `RiskSpendBeeswarm` per-sector beeswarm.
- `DataPullquote` — the April 2026 Playfair Italic 800 redesign is
  correct; only the USD redundancy at the call site (#7) needs fixing.
- `EditorialPageShell`, `Act` layout primitives.
- `EntityIdentityChip` — canonical, do not duplicate.
- The Story Narrative chapter variant system (`pickChapterVariant`).

---

## Constraints reaffirmed

- Spanish primary copy, English fallback via i18n. Every new component
  must support both via `useTranslation`, never `isEs` derived once.
- Risk model copy = `v0.8.5` everywhere. The `inline-bar` story for
  "Risk Ladder" still says "RUBLI's v0.6.5 risk model" in
  `story-content.ts` line 582 — fix in P2.
- No new backend endpoints unless the audit found a gap (only #1 may
  require a backend null-coalesce).
- All 3 CI gates green before each PR: `tsc --noEmit -p tsconfig.app.json`,
  `npm run lint:tokens`, `npm run build`.

---

*One refinement per surface, one finding per chart, two languages, zero
generic horizontal bars.*
