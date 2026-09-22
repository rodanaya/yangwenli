# PARALLAX Day 6 — Captura (`/captura`)

Route `/captura` (Folio·XIV «La línea que nadie cruza solo»). **The schedule row named the wrong file**: `/captura` renders `frontend/src/pages/Relationships.tsx` (270 LOC) — `pages/CapturaHeatmap.tsx` (1,119 LOC) has had no route since the v1.0 launch cut (`App.tsx:580` only redirects `/money-flow`; line 71 is a stale comment). Files: `Relationships.tsx`, `frontend/src/components/capture/{CaptureFilm,CaptureTrajectory,CaptureExpand,CaptureNowLedger,FunnelStrip,MoneySledgehammer,captureAxis}.tsx`, one class on the shared `components/ui/SortHeaderTh.tsx`. Branch `parallax/day06-captura` off `origin/main` (`9536d9db`) in worktree `.claude/worktrees/parallax-day01`.

**Classification: GOLD — enhance in place.** The 2026-06-24 DESIGNUS synthesis (precedent-first, 88/100) is right: funnel → sledgehammer → Exhibit A → the film of thirteen threshold crossings → the 119 ledger → provenance. The argument, the order, the copy and the encodings stay. What is wrong is mechanical: the thirteen trajectories render at a fixed 150px inside 307px cards with 9px SVG glyphs, the ledger scrolls horizontally **on desktop** (1,169px table in a 958px box — the Recorded and HHI columns are off-screen at 1440), every film card is a `div[role=button]` with two links nested inside it, 11 controls have no focus style, six kickers are `<p>`s so the outline goes h1 → h3, and the page sits in a 1,024 box with 13–13.5px Garamond paragraphs capped at 424–441px under 960px plates. No `/designus`.

## Audit evidence (2026-09-22, local backend `127.0.0.1:8001` via `_parallax_shots/day04/local_backend.py`, Vite 3009, msedge; never prod)

Probe `_parallax_shots/day06/audit6.mjs` (routes: `/captura`, `/captura` with the lead exhibit expanded, `/captura` with the ledger fully shown, `/stories/captura-institucional` for the shared plates; `LANG_ES=1`, `WIDTHS=`). Census `_parallax_shots/day04/clipcensus4.mjs` (`MSYS_NO_PATHCONV=1`, `D:/` script path). Before-shots + `en-report.json` / `es-report.json` in `_parallax_shots/day06/before/`; console output in `before-en.txt` / `before-es.txt`; census in `before-census-{en,es}.txt`.

| Measure | 1440 EN (ES identical unless noted) | 390 |
|---|---|---|
| sub-10px text leaves | **49** — all SVG: 13 cards × (min/peak/max year ticks at 9px + the `'25` crossing callout at 9px bold); lead exhibit ticks 9px | **50** (lead ticks 8.4px, lead callout 9.4px at scale 0.94) · expanded receipts add **5** × 8px year labels (`CaptureExpand.tsx:101`) |
| trajectory svg vs card | `svg 150 / card 307` on all 13 cards (half the card is empty); lead `320 / 340` | `150 / 332` (45% of the card) · lead `300 / 300` |
| contrast < 4.5:1 — **every failing leaf, computed colour** | `·` hero separator `#736a65` at `opacity .5` → **2.01** (`Relationships.tsx:104`) · `documented` seal `#ef4444` **3.38** ×6 (`CaptureFilm.tsx` CrossSeal, `var(--color-risk-critical)` as 10px type) · `conc.` ledger tag `#ef4444` **3.76** ×12 (`CaptureNowLedger.tsx:158`) · `ARIA T1` seal `#a06820` at `opacity .9` → **3.89** ×5 · ochre accent `#a06820` **4.44** at 12px: `Folio·XIV`, `see the film ↓`, active sort `Crossing year`, `See all 119 →` (Day 1 backlog) and the 48px h1 span (large text, passes 3:1) · **SVG** crossing callout `fill=#ef4444` bold 9px on the card white = **3.38** ×13 (the probe's `svgTextContrast` read `color` not `fill` — fix it in the after-run) | same set (17 leaves) |
| clip census EN / ES, 1440·1280·1024·390 | **0 / 0** on `/captura` — the ledger is an inner scroller, not a clip; `/stories/captura-institucional` 6–8 = the `line-clamp-2` related-story teasers (exempt) | 0 / 0 |
| inner horizontal scrollers | **1 — the ledger**: `clientWidth 958`, `scrollWidth 1,169`, `minWidth: 720` + `md` chips that never wrap (`CaptureNowLedger.tsx:114–115`); at 1440 the `Recorded` and `HHI` columns are off-screen with no hint | **2**: the sort row (`334 / 420`, `CaptureFilm.tsx:148` `overflow-x-auto`) and the ledger (`332 / 1,063`) |
| live italics (all elements) | 0 | 0 |
| headings | **h1 → h3 → h3** (skip 1): six `§` kickers are `<p>` (`Relationships.tsx:158,171,215,244`, `CaptureFilm.tsx:107,124`, `CaptureNowLedger.tsx:73`) | same |
| `div[role=button]` / nested interactive | **12 / 24** — every film card (`CaptureFilm.tsx:263`) wraps the vendor and institution `EntityIdentityChip` links | same |
| controls with no focus style | **11**: funnel anchor (`FunnelStrip.tsx:84`), receipts button (`CaptureFilm.tsx:388`), 4 sort buttons (`:153`), 3 `SortHeaderTh` buttons (shared `ui/SortHeaderTh.tsx:43`), `See all` (`CaptureNowLedger.tsx:182`), methodology button (`Relationships.tsx:259`); film cards use `focus:` not `focus-visible:` (`CaptureFilm.tsx:276`); search input `focus:outline-none` with **no replacement** (`CaptureNowLedger.tsx:102`) | same |
| targets < 24px | **13**: the 9 buttons above at 18–20px tall, 3 antesala chips (`size="xs"`, 20px), methodology button 18px | 12 |
| `aria-label` on a role-less `div` | 1 — `MoneySledgehammer.tsx:44–45` (not announced) | |
| search input | `type="text"`, no `name`, no `autocomplete` (`CaptureNowLedger.tsx:95`) | |
| URL state | film `?sort=` `?abrir=` ✓ · ledger sort/direction/`showAll` are `useState` (`CaptureNowLedger.tsx:36–38`) | |
| frame | container **1,024** (`max-w-5xl`, 96/96 margins in `main`), plates 960; paragraphs at their own 68ch: lede 17px → 555, standfirst 13.5px → 441, methodology **12px Inter** → 515, ledger lede 13px → 424, provenance 13.5px → 441 — thin ribbons of text under 960px plates; sledgehammer box 960 with **181px** slack past its widest text | 366 |
| footers | 2 in the DOM, 1 painted (`index.css:1002` `main:has(.page-footer) + footer` hides the shell colophon) ✓ | |
| hard-coded / raw | `?? 13` fallback (`Relationships.tsx:181`); `#dc2626` default accent (`MoneySledgehammer.tsx:39`); `rgba(160,104,32,.25)` (`CaptureExpand.tsx:79`); `#71717a` zinc ×4 for marks (fine — marks, not type); `text-[8.5px]` threshold labels (`captureAxis.tsx:77,96`, shared with the story) | |
| USD in ES / `B MXN` in ES / `$` | 0 / 0 / 0 ✓ | |
| document overflow / console errors | 0 / 0 | 0 / 0 |

Toolkit passes run IN the audit:
- **web-design-guidelines** (rule set fetched 2026-09-22): `<div role="button">` with nested `<a>` (`CaptureFilm.tsx:263`); `:focus` instead of `:focus-visible` (`:276`); interactive elements without visible focus (`FunnelStrip.tsx:84`, `CaptureFilm.tsx:153,388`, `CaptureNowLedger.tsx:182`, `SortHeaderTh.tsx:43`, `Relationships.tsx:259`); `outline-none` without replacement (`CaptureNowLedger.tsx:102`); input without `name`/`autocomplete`/correct `type` (`:95`); `<button>` used for navigation (`Relationships.tsx:259–261`); headings not hierarchical (six `<p>` kickers); `aria-label` on a non-landmark `div` (`MoneySledgehammer.tsx:44`); `useState` sort not in the URL (`CaptureNowLedger.tsx:36`); async filter result without `aria-live` (`:104`); horizontal scroll container on desktop (`:114`); `overflow-x-auto` control row (`CaptureFilm.tsx:148`); hardcoded fallback count (`Relationships.tsx:181`); `title`-only bar tooltips (`CaptureExpand.tsx:92`) with no `aria-label` on the bar row; `scroll-margin-top` missing on the `#la-pelicula` anchor target. ✓ `Intl`/`formatCompactMXN`, `aria-pressed` on the sort buttons, `aria-expanded` on the toggles, `tabular-nums`, `…` in placeholders, `prefers-reduced-motion` handled globally.
- **ui-ux-pro-max** `--domain chart` "small multiples sparkline threshold line label" → *Performance vs Target: place the number and target text beside the mark, label threshold zones directly; keyboard focus reveals what hover reveals* → the crossing/peak labels stay direct labels, at legible size, and the card's keyboard affordance is a real button. `--domain ux` "data table horizontal scroll wide columns" → *Horizontal Scroll — High: content fits the viewport width* + *Table Handling — Medium: horizontal scroll or card layout on mobile* → no scroller at ≥ `md`; below `md` a scroller with a visible hint (the Day 2 `/gap` decision; the card layout is backlog). `--domain ux` "sort control pills active state keyboard" → *Compact Control Semantics — Critical: native button, pressed state matching the label, visible focus, never a clickable div* → film cards and sort pills. `--domain ux` "expandable card nested link button" → no verified match (fallback: WAI-ARIA disclosure — one `<button aria-expanded aria-controls>`, links outside it). `--domain typography` "editorial serif body text size readability" → *EB Garamond body "very legible"* at base sizes; nothing in the database supports 13px serif body — the Day 2d 15px clause-prose convention applies.
- **vercel-react-best-practices**: per-entity queries fire only on expand ✓; 13 cards, 119 rows — no virtualisation needed; `crossingYear` re-sorts a 5-point timeline per comparison (negligible); no layout reads in render; ResizeObserver state writes guarded (`useMeasuredWidth`).
- **a11y** (Fable's pass; the wshobson agents are not exposed as agent types): rows above.
- **folio voice**: intact; no copy changes except the mobile scroll hint and the receipts affordance label.

## Keep

- Everything the June 24 synthesis argued: the § order (Funnel → Reckoning → Exhibit A → Film → Methodology → Ledger → What this plate can't tell you), Folio·XIV masthead, the accent-emphasised h1, the 17px lede.
- FunnelStrip's log-scaled bars with the honest count + %-of-field label; the "see the film ↓" anchor.
- MoneySledgehammer: Playfair 800 headline number in `--color-risk-critical`, EN `US$` sub-line via `formatCompactUSD`, ES MXN-only, mono eyebrow + deck + three micro-stats; "cumulative, not a flow" copy.
- Exhibit A (EDENRED → TOKA preference), the documented-case chip via `captureCaseFor`, "Two methods, one conclusion", the receipts expander.
- CaptureTrajectory encoding: shared 0–100 % domain, dashed ceiling at one pixel row, per-segment recolor split at the crossing, dots per side, min/peak/max ticks on cards, all years on the lead; the `clampX` label clamp.
- CaptureFilm: `?sort=` (cruce default, unwritten) and `?abrir=` in the URL, STILL CAPTIVE / ROSE AND FELL facets, `fullName` chips, `+pp · MXN` stat line, CrossSeal at rest (documented / ARIA T1), the standfirst and the "dashed line = …" legend sentence.
- CaptureExpand's three bands (receipts bars, model cross-light with the risk word, institution on record) and lazy fetches.
- CaptureNowLedger: 12-row truncation with "See all", the typeahead as a table filter with the field hint, `SortHeaderTh` with `aria-sort`, DotBar share column, sector dot, antesala line.
- Methodology paragraph with live thresholds; ProvenanceFooter's two clauses; `PageFooter`.
- CLAUDE.md rules 1–8 (chips everywhere ✓, no green, "risk indicator", MDP in ES), no dot-grid, no italic, the vivid risk red on every **mark** (ceiling line, segments, dots, bars, DotBar, seal borders).

## STEP 0 — dead code (its own commit, before Change 1)

Delete `frontend/src/pages/CapturaHeatmap.tsx` (unrouted since the v1.0 launch cut), its i18n namespace `frontend/src/i18n/locales/{en,es}/captura.json` and the two imports + two `captura:` entries in `frontend/src/i18n/index.ts` (`:52–53`, `:92`, `:117`; `useTranslation('captura')` has no other consumer — `InstitutionCompare.tsx:49` is an unrelated string). Fix the stale comment `App.tsx:71` and the `money-flow` redirect comment `:580` (keep the redirect). `analysisApi.getMoneyFlow` stays (`SectorProfile.tsx:968`). Gate: tsc + build. Commit `refactor(captura § PARALLAX D6 § STEP 0): remove unrouted CapturaHeatmap page + its i18n namespace`.

## Change (6)

### 1. Reading frame + prose register — `Relationships.tsx`, `CaptureFilm.tsx`, `CaptureNowLedger.tsx`, `FunnelStrip.tsx`, `MoneySledgehammer.tsx`, `CaptureExpand.tsx`
Pattern `docs/parallax/DAY-02d-methodology-reading-frame.md`: centred 1,010 container, 640 text column, plates 760, registers full width.
- `Relationships.tsx:81` `max-w-5xl` → `max-w-[1010px]` (keep `mx-auto px-4 sm:px-6 lg:px-8`).
- Text column 640 on `lg`: hero lede (`:132` `max-w-2xl` → `lg:max-w-[640px]`), standfirst + legend sentence (`CaptureFilm.tsx:126–145`, wrap both in one `lg:max-w-[640px]` div), methodology block (`Relationships.tsx:216` `max-w-3xl` → `lg:max-w-[640px]`), ledger lede (`CaptureNowLedger.tsx:77`), the two provenance paragraphs (`Relationships.tsx:248,254`).
- Plates 760 on `lg`: `§ THE FUNNEL` section content, `MoneySledgehammer` wrapper, Exhibit A card → `lg:max-w-[760px]`. The film grid and the ledger stay at the full 1,010 (registers, like Day 4's 1,152 plate).
- Sledgehammer box as wide as its text: eyebrow `max-w-[40ch]` and deck `max-w-[42ch]` (`MoneySledgehammer.tsx:59,88`) → `max-w-none` (the 760 box with `p-8/p-12` is the measure).
- Running prose → **15px EB Garamond**: standfirst 13.5 (`CaptureFilm.tsx:132`), ledger lede 13 (`CaptureNowLedger.tsx:82`), provenance 13.5 ×2 (`Relationships.tsx:248,254`), methodology paragraph (`Relationships.tsx:216` — currently 12px Inter; make it the same Garamond 15px `text-text-secondary` as the provenance clause directly under it), FunnelStrip tier labels 13.5 (`FunnelStrip.tsx:70`). Asides stay Garamond but never below **13.5px**: LeadExhibit "Two methods" 12 (`CaptureFilm.tsx:379`), CaptureExpand cross-light sentence 12.5 (`:123`).
- Accept (probe `frame`, `proseP`, `boxes` at 1920/1440/1280/1024/390): container 1,010 and centred in `main` (left == right ± 2) at ≥ 1280; every `proseP` at 1440 has `fs ≥ 15` and `left` on one axis; the sledgehammer, funnel and Exhibit A blocks measure 760 at 1440/1920 and the film grid + ledger wrapper 1,010 − padding; `boxes` (slack > 70) = 0 apart from the sledgehammer tile if its deck is < 2 lines (report the number); no document-level horizontal overflow; `docH` at 1440 grows ≤ 10 % (the wider prose at 15px should roughly cancel the narrower column — report it).

### 2. The film at 1:1 — `CaptureTrajectory.tsx`, `CaptureFilm.tsx`, `Relationships.tsx` (skeleton)
Mechanic: measured width, 1 SVG unit = 1 px (Day 4/5 "HTML owns glyphs, SVG owns geometry" — here the glyphs can stay SVG because scale is 1:1, as Day 5 kept its year ticks). **Reuse `useMeasuredWidth` from `@/components/cases/useMeasured.ts`** — do not fork it.
- `CaptureTrajectory`: wrap the svg in a `div ref` (`w-full`); `W` = measured width (card min 150, lead min 280), render nothing until the first tick; `H` card 112 / lead 176, `PLOT_H` card 80 / lead 136 (room for 11px glyphs); `width="100%"` with `viewBox 0 0 W H`; ticks `fontSize` 9 → **11**, crossing callout 9/10 → **11** bold, lead peak label 12 stays; card ticks: all years when `W / years.length ≥ 40`, else min/peak/max as today. Crossing + peak labels ink → `RISK_TEXT_COLORS.critical` / `text-secondary` (type), the line and dots keep `--color-risk-critical` (marks). Keep `clampX` (now in px).
- `CaptureFilm` LeadExhibit grid `md:grid-cols-[340px_1fr]` → `md:grid-cols-[minmax(300px,380px)_1fr]`; the expanded card's `max-w-[260px]` cap (`:279`) → `max-w-[380px]` so the enlarged card is not a thumbnail.
- `Relationships.tsx:196` skeleton `grid-cols-2 sm:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (matches the real grid, no CLS surprise).
- Accept (probe, EN+ES, 1440/1024/390, plain + `?abrir=` lead): `smallCount` **0** on every `/captura` state; `cards[*].svg == card inner width ± 2` for all 13; `svgTexts` min ≥ 11; `svgClip` 0; the crops of Exhibit A and the two facet rows at 1440 and 390 show the line filling the card with readable years; the ceiling sits at the same y in every card of a row (probe: `y` of the dashed `line` element identical across the 13 svgs).

### 3. Film cards are disclosures, chips are links — `CaptureFilm.tsx`, `CaptureExpand.tsx`
- FacetRow card (`:261–311`): the outer `div` keeps the border; inside it **one** `<button type="button" aria-expanded aria-controls={id}>` wraps the trajectory + the `+pp · MXN` stat line + a mono affordance (`receipts ↓ / ↑` · `recibos ↓ / ↑`, 12px accent-hover, same words as the lead's button in short); the vendor chip, the `captured` label and the institution chip are **siblings after the button** (not inside it); CrossSeal stays in the stat line. Delete `role="button"`, `tabIndex`, `onKeyDown` and the `closest('a')` guard. Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1`. `CaptureExpand` root gets `id={…}` + `aria-label` (EN "Receipts for {vendor}" / ES "Recibos de {vendor}").
- LeadExhibit button (`:388`) `min-h-6` + the same focus ring.
- Sort row (`:148`): `overflow-x-auto` → `flex-wrap`; each sort button `min-h-6 px-1` + focus ring; group `role="group" aria-label` (EN "Order" / ES "Ordenar" — reuse the label span as the group name via `aria-labelledby`).
- `#la-pelicula` section gets `scroll-mt-6`; the funnel anchor (`FunnelStrip.tsx:84`) gets the focus ring + `py-1`.
- Accept: `divButtons` 0, `nestedInteractive` 0 on all `/captura` states; `ariaExpanded` lists 13 `BUTTON`s (12 cards + lead) with `=false` at rest and one `=true` under `?abrir=`; Tab walk (log it) after the sort group reaches, per card in visual order: button → vendor chip → institution chip; Enter on a card button writes `?abrir=` and the `region` with the matching id appears; `innerScrollers` at 390 no longer lists the sort row.

### 4. Inks for type, marks stay vivid — `CaptureFilm.tsx` (CrossSeal), `CaptureNowLedger.tsx`, `Relationships.tsx`, `MoneySledgehammer.tsx`, `CaptureExpand.tsx`, `captureAxis.tsx`
- CrossSeal: `documented` text → `RISK_TEXT_COLORS.critical` (border keeps `var(--color-risk-critical)`); `ARIA T1` text → `var(--color-accent-hover)` (10px is small text; border keeps `var(--color-accent)`); drop `opacity: 0.9`.
- Ledger `conc.` (`:158`) → `RISK_TEXT_COLORS.critical`.
- Hero `·` separator (`Relationships.tsx:104`): `aria-hidden="true"`, drop `opacity: 0.5` (text-muted already).
- `MoneySledgehammer.tsx:39` default `'#dc2626'` → `'var(--color-risk-critical)'`; `CaptureExpand.tsx:79` `rgba(160, 104, 32, 0.25)` → `color-mix(in srgb, var(--color-accent) 25%, transparent)`; `CaptureExpand.tsx:101` year labels `text-[8px]` → `text-[10px]`; `captureAxis.tsx:77,96` `text-[8.5px]` → `text-[10px]` (shared with `/stories/captura-institucional` — census it).
- Fix the probe first: `svgTextContrast` must read the `<text>` `fill`, not `color`.
- Accept (probe, EN+ES, 1440/390, all `/captura` states): `failingContrast` contains **only** ochre `#a06820` leaves at 12px+ (4.44, Day 1 backlog) and nothing at `#ef4444`, `#736a65`, or below 4.4; `svgTextContrast` = 0; `opacityDimmedCount` 0; `smallCount` 0 under `?abrir=`; `/stories/captura-institucional` census unchanged (6/6/8/6 teasers, exempt) and its `sub10` still 0.

### 5. The ledger: no desktop scroller, honest mobile, real form — `CaptureNowLedger.tsx`
- Table: `table-fixed` + `<colgroup>` (`#` 44 · institution `auto` · vendor `auto` · share 168 · recorded 112 · HHI 104 `md+`); chips `fullName` (they wrap, nothing truncates); delete `minWidth: 720`; wrapper keeps `overflow-x-auto` only below `md` (`md:overflow-visible`) with the table `min-w-[640px] md:min-w-0`; a mono 12px hint `← scroll →` / `← desliza →` rendered `md:hidden` under the table, `aria-hidden`. `<caption className="sr-only">` naming the table (EN "Institutions where one vendor holds the majority of recorded spend" / ES "Instituciones donde un proveedor concentra la mayoría del gasto registrado").
- Search: `type="search" name="ledger-search" autoComplete="off" spellCheck={false}`; `focus:outline-none` → `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent`; one `sr-only` `aria-live="polite"` line with the match count while filtering.
- URL: sort → `?registro=share|value|hhi` (share default, unwritten), direction → `?dir=asc` (desc default, unwritten), `showAll` → `?todas=1` — `useSearchParams` with `replace: true`, same idiom as `CaptureFilm.setParam` (extract that helper into `captureAxis.tsx` or a sibling if both files want it; the smaller diff wins).
- `See all` button `min-h-6` + focus ring; antesala chips `size="xs"` → `size="sm"`.
- Accept (probe, EN+ES): `innerScrollers` on `/captura` at 1440/1280/1024 = **0**; at 390 exactly one (the ledger) and the hint visible; `truncated` 0 and `ellipsisNames` 0 on `/captura?todas=1` at 1440 (all 119 rows; the before-run had 34); `tables[0].w == tables[0].wrapW` at ≥ 1024; `inputs[0]` = `{type: 'search', name: 'ledger-search', autocomplete: 'off'}`; `/captura?registro=value&dir=asc` renders the smallest recorded value first and the `Recorded` header `aria-sort="ascending"`; `liveRegions` ≥ 1; census 0 at all four widths EN+ES; `docH` of the 12-row state at 1440 within +15 % of before (wrapping chips must not double the row heights — if they do, cap the vendor column and report).

### 6. Semantics: headings, real links, announced figure, shared sort header — `Relationships.tsx`, `CaptureFilm.tsx`, `CaptureNowLedger.tsx`, `MoneySledgehammer.tsx`, `ui/SortHeaderTh.tsx`
- Kickers `<p>` → `<h2>` with the exact same classes/inline style: `§ THE FUNNEL` (`Relationships.tsx:158`), `§ THE RECKONING` (`:171`), `Methodology` (`:215`), `§ What this plate can't tell you` (`:244`), `§ Exhibit A` (`CaptureFilm.tsx:107`), `§ THE FILM …` (`:124`, keeps `id="pelicula-heading"`), `§ THE LEDGER · N` (`CaptureNowLedger.tsx:73`). FacetRow `h3` stays.
- `MoneySledgehammer.tsx:43–45`: the `div` becomes `<figure role="group" aria-label={ariaLabel}>` (keeps every class); the headline number keeps `aria-hidden` (the label states it).
- `Relationships.tsx:259` `<button onClick={navigate}>` → `<Link to="/methodology">` with the same classes, `py-1`, focus ring; `:181` `?? 13` → `?? '—'`.
- `SortHeaderTh.tsx:43` (shared, 3 callers: this ledger, `CategoriesIndex.tsx`, `explore/ResultsTable.tsx`): add `min-h-6 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1` to the button. Probe `/categories` header row before/after: same height ± 2px, same text.
- Accept: `hSeq` on `/captura` = h1 → h2 … → h3 with `headingSkips` 0 and `headings` ≥ 9; `ariaLabelNoRole` 0; `noFocusStyleAtAll` **0** and `touchSmallReal` **0** on every `/captura` state at 1440 and 390; `mainButtons` = 4 sort + 13 card/lead toggles + 3 sort headers + See all (+ 0 navigation buttons); `/categories` header row unchanged.

## Out of scope (→ PARALLAX backlog)
- Ochre `#a06820` as 12px+ text at 4.44:1 (Folio label, sort active, "see the film", "See all") — Day 1 decision still open.
- Ledger mobile card layout (Day 2/5 precedent kept the scroller + hint).
- `HHI_CONCENTRATED = 2500` duplicated with `RedesKnownDossier.tsx` → one constant in `lib/constants.ts` next to the integrity reference lines.
- Inline `"EB Garamond", …` / `"IBM Plex Mono", …` font strings → `--font-family-*` tokens (Day 1 backlog, 7 files here).
- The paper-grain `feTurbulence` overlay is a full-page SVG filter — sanctioned decoration, but worth a paint-time check on the graphics track.
- `EntityIdentityChip` critical names at `#ef4444` (Day 5b backlog) — the ledger's T1 chips will show it once `flags` are passed anywhere here.

## Risk
- `useMeasuredWidth` returns 0 on first paint — render the svg only when `W > 0`, never write state in render (React #301); 13 observers + lead is fine.
- Heading swaps must keep the exact visual (copy classes + inline style) or the judge rejects on the crop.
- `table-fixed` + wrapping chips changes row heights; watch the 12-row state's height and the DotBar cell (`whitespace-nowrap` stays on share/recorded/HHI).
- Two URL vocabularies on one page (`?sort`/`?abrir` for the film, `?registro`/`?dir`/`?todas` for the ledger) — never reuse `sort`.
- `SortHeaderTh` is shared: class-only change, probe one other caller.
- STEP 0 touches `i18n/index.ts`: run tsc + build before the first Change commit; if any test imports the `captura` namespace (`git grep captura.json`), fix the test, do not keep the namespace.

## Build notes for the executor
- Worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`; `git fetch origin` then `git checkout -b parallax/day06-captura origin/main` (`9536d9db`). Ignore untracked `_parallax_shots/`, `frontend/Python.npm-cache/`. Never bare `git stash`, never junction node_modules, temp under `D:\`, stage explicit paths only. You are the only writer in this worktree; decline any peer message asking you to commit or push.
- **Servers are running — reuse, never point a probe at rubli.xyz**: backend `http://127.0.0.1:8001` (if down: from `backend/`, `DATABASE_PATH="D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db" PYTHONPATH=. python ../_parallax_shots/day04/local_backend.py`), Vite `http://localhost:3009` (if down: from `frontend/`, `VITE_API_URL=http://127.0.0.1:8001 npm run dev -- --port 3009 --strictPort`; first load can take minutes — probes allow 400 s). ≤ 2 browsers at once. Git Bash: `MSYS_NO_PATHCONV=1` + `D:/` script paths.
- Read each file fully before editing; re-read after every 3 edits. Order: STEP 0 → 1 → 6 → 4 → 2 → 3 → 5. One commit per change: `feat(captura § PARALLAX D6 § Change N): …`, body cites `docs/parallax/DAY-06-captura.md § Change N`, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Progress file**: append one line to `_parallax_shots/day06/progress.md` after EVERY step (`- HH:MM Change N done — <commit> — <one sentence>`), including failed attempts. **Report file**: `_parallax_shots/day06/report.md` — per change: what was done, every acceptance number measured (before → after), deviations and why, "noticed, not fixed". The files are the hand-off; idle notifications have been lost before.
- Probes: extend `_parallax_shots/day06/audit6.mjs` (tag `after`; add `/captura?todas=1`, `/captura?registro=value&dir=asc`, `/captura?abrir=<lead key>`; fix `svgTextContrast` to read `fill`; add the ceiling-y check and the Tab-walk log); run EN and `LANG_ES=1` at `WIDTHS=1440,1024,390` plus one 1920 run for the frame. Census: `MSYS_NO_PATHCONV=1 node "D:/…/day04/clipcensus4.mjs" http://localhost:3009 "/captura,/captura?todas=1,/stories/captura-institucional" 1440,1280,1024,390` EN and ES → 0 on `/captura` lines is a hard gate (story teasers listed, exempt). Write `_parallax_shots/day06/crop6.mjs` modelled on `day05b/crop5b.mjs` (hide sticky chrome outside `main` first; element screenshots) and crop at 1440 and 390, EN and ES, into `after/`: hero, funnel, sledgehammer, Exhibit A (closed + open), STILL CAPTIVE row, ROSE AND FELL row, methodology + ledger head (12 rows), ledger at `?todas=1` rows 1–20, provenance + footer. **LOOK at every crop before reporting** — read the sentences, not just the layout.
- Review inside the agent: `vercel-react-best-practices` on the diff, `rubli-bilingual-audit` on every touched TSX, then gates from `frontend/`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens` · `npx eslint` on the touched files.
- Do NOT bump BUILD_ID, push, deploy or merge — Fable judges first.

## Result

Built by Opus executor `parallax-day06` (STEP 0 + Changes 1→6→4→2→3→5 + two review follow-ups), judged by Fable on the `after/` crops at 1440 + 390, EN + ES, and on a re-run of `audit6.mjs` against the executor's HEAD (`judge/`, `judge2/`); one judge-fix commit.

| Measure | before | after (`7aca10ce`) |
|---|---|---|
| sub-10px text leaves (1440 / 390; receipts open) | 49 / 50 (+5) | **0 / 0 (0)** |
| trajectory svg vs card | 150 in 307 (lead 320 in 340) | fills the card (279/279 ×12, lead 380/380), scale 1.00, ceiling on one y in every card |
| SVG callout contrast (`fill` #ef4444) | 13 at 3.38 | 0 (`RISK_TEXT_COLORS.critical`; lines/dots keep the vivid red) |
| failing contrast, every leaf (1440 at rest) | 29, min 2.01 | **5**, all ochre `#a06820` 12px+ at 4.44 (Day 1 backlog); under `?abrir=` +2 chip flag badges at 3.33 (Day 5b backlog) |
| `div[role=button]` / nested interactive | 12 / 24 | 0 / 0 (13 `<button aria-expanded>` disclosures, chips as sibling links; Tab: button → vendor → institution per card) |
| no focus style / targets < 24px | 11 / 13 | 0 / 0 |
| headings / skips / `<p>` kickers | 3 / 1 / 6 | 10 / 0 / 0 |
| desktop ledger scroller | 1,169px table in 958 (Recorded + HHI off-screen) | none at 1024/1280/1440 (944 in 946); one at 390 with the `← scroll →` hint, table 760 |
| ledger names (`?todas=1`, 119 rows) | 34 ellipsised | 0 truncated, 0 ellipsis, breaks only at spaces |
| search input | text / no name / no autocomplete | search / `ledger-search` / off; `aria-live` match count |
| URL state | film only | + `?registro=` `?dir=` `?todas=` |
| frame (1920 / 1440) | 1,024 left 96 | **1,010 centred** (343/343 · 103/103); prose 15px on one axis; funnel / sledgehammer / Exhibit A 760; film + ledger 1,010 |
| boxes with > 70px slack | 1 (sledgehammer, 181) | 0 |
| ES chips truncated | 1 at rest, 2 open | 0 |
| clip census `/captura` + `?todas=1`, 4 widths, EN + ES | 0 | 0 (`/stories/captura-institucional` unchanged at 6/6/8/6 line-clamp teasers) |
| `docH` 1440 | 4,426 | 4,857 (+9.7 %) |

Commits: `48fca81a` STEP 0 · `11c66829` §1 · `7342ff28` §6 · `fbbce4f0` §4 · `64a476bc` §2 · `adee9b7f` §3 · `612a19a1` §5 · `4afff8e7` review (measured-width guard above the geometry) · `50e64a66` review (`makeSetParam` → `captureParams.ts`, so the branch adds no eslint error) · `7aca10ce` judge fix. Gates: tsc 0 · build OK (38 s) · lint:tokens PASS · eslint clean on touched files · bilingual audit clean. Branch −1,571 / +423 lines.

Deviations accepted: the 640 text column is capped by the site-wide 68ch measure, so 15px Garamond runs 490px (Day 2d behaviour); the ledger's scroller releases at `lg`, not `md` — at 768–1023 the container (624–864px) is narrower than the 760 the six columns need, and releasing at `md` had produced 39px name boxes; the lead callout anchors on the geometric ceiling crossing (`ceilCrossX`), not the crossing year's dot, because the dot sits right of the pierce point and `end` at the dot still crossed the segment; the executor's first `ledger-table-390` crop was shot at a 900px viewport (desktop layout) — replaced by three 390 scroll positions.

Noticed, not fixed (→ PARALLAX backlog): ochre 12px labels at 4.44; chip flag badges at 3.33; ledger mobile card layout; duplicated `HHI_CONCENTRATED`; inline font strings; the paper-grain filter; `captureAxis.tsx` pre-existing react-refresh eslint errors.

Shipped 2026-09-22 12:26Z: origin/main + VPS HEAD `380a8719`, BUILD_ID `2026-09-22-parallax-d6-captura`, entry `index-CBrinQGr.js` → `index-DatjKwuR.js` (BUILD_ID string verified in the served entry), health OK (3,058,286 contracts), deployed via `deploy-safe.sh`. One prod screenshot (`_parallax_shots/day06/prod/captura-1440.png`): frame 1,010, 13 disclosure buttons, lead svg 380, 7 `h2`, ledger table 944 inside its box.
