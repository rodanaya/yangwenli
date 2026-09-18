# PARALLAX Day 2 — Metodología + El Apagón

Routes: `/methodology` · `/gap`
Files: `frontend/src/pages/Methodology.tsx`, `frontend/src/pages/Gap.tsx`, `frontend/src/components/methodology/{CalibrationRecord,DictamenChrome,BalanzaLedger,TwoWorldsExhibit,ModelTimeline}.tsx`, `frontend/src/components/gap/{BlackoutTimeline,BuyersLedger,CounterpartyExhibit,ExceptionCatalog,GapRecoveryPanel}.tsx`
Audited: 2026-09-17 against **origin/main `52136aa6`** (= prod BUILD_ID `2026-09-17-parallax-d1-shell`, Day 1 shipped). The `deploy-sectors-density` local checkout is stale — audit and build from the origin/main worktree only.

## Classification: GOLD — enhance-in-place. No `/designus`.

Both pages carry a finished editorial design. `/methodology` is «El Dictamen» (DESIGNUS-Fable, Jul 2: masthead, index rail, six clauses, three annexes, La Balanza plate, calibration plate, Two Worlds exhibit). `/gap` is «El Apagón» (Jul 3 remake: masthead, blackout timeline, three anchor numbers, exception catalog, buyers ledger, counterparty exhibit, structural grade, register, colophon). Every defect below is measurable — text below the legibility floor, colliding chart labels, empty cells, contrast, missing table semantics, a page with no exit — not a design problem.

## Audit evidence (prod, 2026-09-17)

Method: Playwright (msedge) 1440×900 + 390×844, EN + ES, on both routes; leaf-node font-size census; region crops; Vercel web-interface-guidelines rule set applied to the 12 files; ui-ux-pro-max `--domain ux/typography/chart` (table handling, empty states, horizontal scroll, chip semantics). Screenshots + JSON in `_parallax_shots/day02/before/` (untracked). 0 page errors, 0 console errors, no document-level horizontal overflow on either route at 390.

| Route | sub-10px leaf nodes | empty `—`/`--` cells | italic | visible footers | internal links out | other |
|---|---|---|---|---|---|---|
| `/methodology` | 9 HTML (all inside Plate III·a: 7× `fontSize={8}` date labels + `ACTIVE`, `8.5` "null-model baseline", `8.5px` OVERLAY span) | **23** (7 unvalidated rows × 3 metric cols + 2 `--` contract counts in the validation table) | 0 | 1 (MainLayout colophon is `display:none` via Day 1 `.page-footer`) | 5 | **Plate III·a labels collide**: "pre-stratification era — AUCs not comparable", "v5.2 overlay — explanations only; alters no scores" and the y-axis caption "AUC (test)" all print at `y = CHART_TOP − 8/−20` over each other; v3.3/v4.0/v5.0 x-labels (days 0/6/12) print "Feb 2026Feb 2026Feb 2026" as one string (`m-calibration.png`). Line 406 kicker is Spanish-only in EN ("§ Modelo activo v0.8.5…"); line 435 `aria-label="Risk level thresholds"` English-only. Clause-body prose is `text-xs` (12px sans) under 16–17px serif deks. `ModelTimeline.tsx` has zero importers (dead, contains 8px text). |
| `/gap` | **201** HTML at 9px/9.5px: 9 kickers `text-[9px]`, 7 `<th>`, ~180 chips (RiskLevelPill, EST/OCR, DA/YOUNG/EFOS) across 50 rows; plus 6 SVG `<text>` at 9/9.5 in `BlackoutTimeline` which render ≈ **3.5px at 390** (viewBox 900 scaled to ~330px — `gap-mob.png` is unreadable) | 9 (vendor column `—`) | 0 | 1 (page owns its colophon `div`; no `<footer>` conflict) | **0** — no way out of the page: buyers are siglas-only buttons, no coda, no link to `/methodology` although the grade block cites v0.8.5 | Hero meta line "Window · Source" is `text-text-muted` at `opacity-60` (≈ 2.9:1). Register `<table>` has no `aria-label`/caption and no `th[scope]`; `min-w-[860px]` scrolls inside its wrapper at 390 with no affordance; titles are unclamped OCR blobs so the 50-row register is ~12,000px tall at 1440 (`g-register.png`). Search input lacks `name`/`autoComplete`. `GapRecoveryPanel` compact tier tag is `text-[8.5px]` (renders on `/dashboard`). |

Not defects (verified): the `stale` probe hits on ES ("2 may 2026") are Spanish month names; the RiskFactorTable citation strings are academic titles, English by nature (gloss after the colon is shared with the vendor tooltip → backlog); `/gap` `SectorBar` green rows are sector palette, not risk (rule 7 is respected: low = `text-text-muted`).

## Keep (do not touch)

- `/methodology`: DictamenMasthead (EB Garamond 62px headline, ochre second clause, three Playfair anchor stats), the sticky `IndiceRail`, the I–VI + A–C clause/annex grammar (`ClauseSection` / `AnnexFold`, Roman numerals in ochre, `AnnexFold` closed by default), paper-grain backdrop, La Balanza hatch-band ledger (zero circles, exact β values), the calibration plate's *argument* (stepped line, ochre wash, square vertices, service register), Two Worlds exhibit, the 15-row limitations table, the three evidentiary tiers, MethodologyCoda, MethodologyProvenanceFooter, CitationBlock, PageFooter.
- `/gap`: the masthead sentence pair (serif, ochre second sentence), the two-track blackout *composition* (solid feed dies at 62%, dashed ochre recovery picks up and runs off-right with an arrow), Tres golpes (three border-left anchors, critical red on "No contest"), the Exception Catalog three-tone semantics (Art. 54 alarm / Art. 55 zinc / unverified muted), BuyersLedger single-amber DotBars, CounterpartyExhibit redaction bars, GradeBlock distribution bar + methodology note, register column set and order, colophon copy, all filters + URL state.
- Both: PlateFrame wrapping and folio labels (X·a–X·d, II, III·a), bilingual inline copy, honesty language ("structural indicator, NOT the v0.8.5 model").

## Change (8)

Acceptance = the probe (`audit2.mjs` / `crops2.mjs`, pointed at the worktree dev server on port 3011) passes AND Fable judges the before/after crops.

### 1. `/gap` 10px floor sweep — `Gap.tsx`, `BuyersLedger.tsx`, `CounterpartyExhibit.tsx`, `ExceptionCatalog.tsx`, `GapRecoveryPanel.tsx`
- Every `text-[9px]` → `text-[10.5px]` (Day-1 convention: 8→10, 9→10.5, 9.5→10.5). Sites: `Gap.tsx` 67 (RiskLevelPill), 96 (grade kicker), 192 (sectors kicker), 240 + 253 (EST/OCR badges), 276 + 288 + 300 (DA/YOUNG/EFOS chips), 330–348 (7 `<th>`), 684/689/694 (Tres golpes labels), 738 (register kicker), 901 (colophon kicker); `BuyersLedger.tsx:23`; `CounterpartyExhibit.tsx:30`; `ExceptionCatalog.tsx:63`. `GapRecoveryPanel.tsx:88` `text-[8.5px]` → `text-[10px]`.
- Chips keep their padding; the Flags column is `flex-wrap`, so three chips may wrap to two lines — acceptable.
- Accept: probe on `/gap` at 1440 and 390, EN and ES: 0 HTML leaf text nodes < 10px inside `main` (SVG is Change 2); `/dashboard` compact panel tier tag ≥ 10px.

### 2. BlackoutTimeline: HTML owns the glyphs — `components/gap/BlackoutTimeline.tsx`
- Today: one 900×128 SVG with 9–9.5px `<text>`; the labels scale with the viewBox, so at 390 they render ≈ 3.5px. Rebuild as HTML/CSS with the **same composition**: a `relative` block (~128px tall at ≥ sm); track 1 = `div` with `border-top: 2px solid var(--color-text-muted)` from `left:0` to `62%` and a 6px start dot; the death mark at 62% = a mono `×` glyph (or two rotated 1.6px rules) in `--color-text-muted`; the vertical connector = 1px dashed ochre rule from track 1 to track 2 at 62%; track 2 = `border-top: 2px dashed var(--color-accent)` from 62% to 97% ending in a `→` glyph in ochre. Labels are HTML, mono, **`text-[11px]`** (track names uppercase with `tracking-[0.16em]`; the four annotations — "2002 · CompraNet", "APR 2025 · abolished by law", "SEP 28 2025 · last record", "SEP 29 2025 → · {total} awards · OCR" — plain mono), positioned with percentage `left` and `translateX` as today. Below `sm`, the two break annotations stack as a two-line list under the tracks instead of sitting on the rule (so nothing can overlap at 390).
- Keep: `role="img"` + the existing bilingual `aria-label` on the wrapper (`aria-hidden` on the glyph children), the `formatNumber(totalContracts)` string, no API, no motion, no circles beyond the start dot (a 6px dot is a `DotBar`-free decoration, fine).
- Accept: at 1440 and 390 every text node inside the Plate X·a figure is ≥ 11px computed; no two label bounding boxes intersect (probe); the 1440 crop shows the same two-track shape as `g-timeline.png`.

### 3. Register table semantics + row height — `Gap.tsx` `Register` (314–415) and the filter bar (750–870)
- `<table>` gets `aria-label` and a `<caption className="sr-only">` (EN "Recovered awards register" / ES "Registro de adjudicaciones recuperadas"); every `<th>` gets `scope="col"`.
- Title cell: `line-clamp-3` + `title={item.title}` (rows are currently up to ~40 lines tall).
- Empty cells: one local `EmptyCell({ lang })` helper renders `—` with `title` + `aria-label` (EN "Not recovered from the award PDF" / ES "No recuperado del PDF de fallo"); use it at the five `—` sites (risk 366, title 371, institution 381, vendor 389, exception 403).
- Search input: `name="q"`, `autoComplete="off"`, `spellCheck={false}`.
- The 860px table keeps `overflow-x-auto`; add `overscroll-x-contain` on the wrapper and a `sm:hidden` mono `text-[11px] text-text-muted` hint above it ("← desliza para ver más columnas →" / "← scroll for more columns →").
- Accept: probe: `#registro table[aria-label]` exists; `#registro th:not([scope])` = 0; every leaf `—` inside `#registro` has a `title`; max `tbody tr` height at 1440 ≤ 140px; at 390 `document.documentElement.scrollWidth === innerWidth` (scroll stays inside the wrapper).

### 4. Hero meta line contrast — `Gap.tsx` 640–645
- Drop `opacity-60` / `opacity-40` on the "Window: … · Source: …" spans; keep `text-xs text-text-muted font-mono`. (Muted at 60% ≈ 2.9:1; the Day-1 token is 4.5+ at full.)
- Accept: contrast of that line vs `--color-background` ≥ 4.5:1 (reuse the Day-1 `contrast.mjs` formula); nothing else in the hero moves.

### 5. `/gap` coda «§ ADÓNDE IR» — `Gap.tsx`, new `GapCoda` between the register and the colophon
- `/gap` has zero internal links. Add the Charter C3 exit ramp exactly as `MethodologyCoda` does it (`Methodology.tsx` 186–269: amber top rule, `§ · ADÓNDE IR` mono kicker, one-line dek, 3-column grid of `Link`s with mono uppercase label + `ArrowRight` + muted sub, `title` on each). Ramps: `/methodology#data-sources` (ES "La cadena de custodia" / EN "Chain of custody" — sub: why the record froze on 28 Sep 2025), `/administrations` (ES "Sexenios" / EN "Administrations" — sub: the Sheinbaum term, where these awards fall), `/institutions` (ES "Instituciones" / EN "Institutions" — sub: the buyers' scored history before the blackout). Copy the pattern into `Gap.tsx` (two call sites is not yet a primitive — extraction goes to the backlog). Dek: ES "El Apagón es un expediente parcial. Lleva a los compradores a su historial calificado." / EN "The Blackout is a partial file. Take the buyers back to their scored history."
- Accept: probe counts ≥ 3 `main a[href^="/"]` on `/gap`; ES renders the Spanish labels; the coda sits above "FE DE RECUPERACIÓN".

### 6. Plate III·a label collisions + 10px floor; delete dead `ModelTimeline.tsx` — `CalibrationRecord.tsx`, `ModelTimeline.tsx`
- STEP 0 (own commit, first): `git rm frontend/src/components/methodology/ModelTimeline.tsx` — zero importers (`grep -rn ModelTimeline frontend/src` finds only the file); CalibrationRecord's header says it replaced it.
- (a) The pre-stratification label (156–167) moves **inside** the wash band: `y = CHART_TOP + 14`, keep centered, ochre, 13px.
- (b) The v5.2 overlay label (192–203) moves to the foot of its dashed rule: `x = xPos(v52.day) + 6`, `y = CHART_BOTTOM − 6`, `textAnchor="start"`, and is shortened to EN "v5.2 overlay — explanations only" / ES "capa v5.2 — solo explicaciones" (the "alters no scores" clause already appears in the service register).
- (c) The "AUC (test)" axis caption (186–188) stays at `CHART_TOP − 20` — it no longer collides once (a) and (b) move.
- (d) Date labels (248–257): render **one** "Feb 2026" / "feb 2026" centered under the v3.3–v5.0 cluster (at `xPos(v40.day)`) and skip the per-vertex date for `day < 20`; keep per-vertex dates for v5.1, v0.6.5, v0.8.5. Version labels (237–247): v3.3 `textAnchor="end"` at `cx + 2`, v5.0 `textAnchor="start"` at `cx − 2`, so the trio reads "v3.3 v4.0 v5.0" with clear gaps.
- (e) `fontSize={8}` at 227 and 252 → `10.5`; `fontSize={8.5}` at 268 → `10.5`; the OVERLAY span at 344 `'8.5px'` → `'10.5px'`. If "random = 0.5" (181–183) clips at the right edge, raise `PAD_R` to 108.
- Accept: probe on `/methodology` at 1440 (EN + ES): no pairwise-intersecting `<text>` bounding boxes inside the Plate III·a `<svg>` (`getBBox`-based, ignore `<tspan>` children); no `<text>` with `font-size` < 10.5 anywhere in `main`; `tsc` clean after the delete; the crop shows three separate legible annotations.

### 7. Validation table: retire the 23 empty cells; bilingual kicker + aria — `Methodology.tsx`
- Split `CORRUPTION_CASES` at render: rows with `detection === '--'` (lines 70–76, seven cases) leave the table and render below it as a demoted register — mono kicker `§ Documented, not yet scored (7)` / `§ Documentados, aún sin calificar (7)` (12px, `tracking-[0.15em]`, `text-text-muted`), then one line per case in `text-[12px] text-text-muted`: `name · translated type · contracts` (contracts `'--'` → omit). The table keeps the 15 scored rows. `'0*'` → `'0'` (the footnote key `body.validation.footnote` already explains case 9 — keep it verbatim).
- Line 406–408: `§ Modelo activo v0.8.5 · AUC 0.785 · HR 11.01%` → `lang === 'es' ? that : '§ Active model v0.8.5 · AUC 0.785 · HR 11.01%'`.
- Line 435: `aria-label="Risk level thresholds"` → `aria-label={t('body.overview.riskThresholdsLabel')}`.
- Accept: probe `empties` on `/methodology` = 0 (no leaf whose text is `—`, `--` or `–` inside `main`); `#validation table tbody tr` = 15; the demoted list shows 7 names in both locales; the EN page contains no "Modelo activo".

### 8. Clause-body prose 12 → 13px — `Methodology.tsx` (judgment call; Fable flags at JUDGE)
- The Dictamen sets deks in 16–17px serif but every clause body paragraph is `text-xs` (12px sans): 24 × `text-xs text-text-secondary leading-relaxed` plus the muted note paragraphs. Change **only paragraph prose**: `<p className="text-xs text-text-secondary …">` and `<p className="text-xs text-text-muted …">` (including the `mt-1`/`mt-2` note variants and the `tiers.*Say` lines) → `text-[13px]`. Do **not** touch: anything with `font-mono`, `uppercase`, `font-semibold`, `editorial-label`, `pull-stat`; `<table className="… text-xs">` and its cells; `Badge`; `Formula`; `<li>` items in the tier cards; the `CopyCitationButton`.
- Accept: probe: no `<p>` leaf inside `main section` with computed font-size < 13px unless it has `uppercase` or `font-mono`; no document-level horizontal overflow at 390; the Part I crop reads at 13px with the same rhythm. One-regex revert if rejected.

## Out of scope (backlog → `docs/PARALLAX.md`)

- `RiskExplainer.tsx:66–67` citation glosses are English in ES (shared with the vendor risk tooltip) → Day 13.
- `/methodology` ends with four stacked closers (Coda, ProvenanceFooter, CitationBlock, PageFooter); PageFooter repeats the provenance line. Needs a decision, not a Day-2 edit.
- `IndiceRail` has no active-section state (IntersectionObserver + `aria-current`).
- Hard-coded `#a06820` in `Methodology.tsx:669/869`, `DictamenChrome.tsx`, `CalibrationRecord.tsx` → `var(--color-accent)` (lint passes today; cosmetic).
- Coda pattern now lives in two files (`MethodologyCoda`, `GapCoda`) → extract `components/dossier/Coda.tsx` when a third surface needs it.
- `/gap` register → mobile card layout (Day 2 keeps the in-wrapper scroll).
- `CORRUPTION_CASES` / `MODEL_COMPARISON` are static numbers in TSX ("the original 22 foundation cases from v5.1").
- `GradeBlock` / `ExceptionCatalog` use raw `#71717a` zinc for de-alarmed rows.

## Risk

- Change 2 replaces an SVG with HTML/CSS; the composition must match `g-timeline.png` at 1440 or Fable rejects. No data or API involved.
- Change 7 changes what the validation table *says* (15 rows instead of 22). The seven cases are still on the page, one line each; the footnote is unchanged. Honest-pitch matrix respected ("1,427 cases" copy untouched).
- Change 8 is a one-step body bump on a gold page. Reversible by one regex. Fable will compare Part I / Part V crops before approving.
- Change 6 STEP 0 deletes a file with zero importers; `tsc -p tsconfig.app.json` proves it.
- The gap refresh (Phase A, Sep 17) may change `/gap` numbers between before/after shots — compare layout, not values.

## Build notes for the executor

- Worktree: reuse `D:\Python\yangwenli\.claude\worktrees\parallax-day01` (already at `52136aa6` = origin/main, `node_modules` installed). Inside it: `git fetch origin && git checkout -b parallax/day-02-metodologia-apagon origin/main`. The Day-1 branch is fully merged, so switching that worktree's branch is safe. Ignore the untracked `frontend/Python.npm-cache/` junk dir (do not commit it). **Never junction node_modules**; if you must reinstall: `npm install --legacy-peer-deps` with `npm_config_cache=D:\Python\.npm-cache`.
- Gates (from `frontend/`): `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens`. No backend touched → no pytest.
- Verify on `VITE_API_URL=https://rubli.xyz npm run dev -- --port 3011` (`VITE_API_URL`, not `VITE_API_BASE_URL`). Playwright: `chromium.launch({ channel: 'msedge' })` (no bundled browsers on this box).
- Probe scripts (reuse, do not rewrite): `C:\Users\ranay\AppData\Local\Temp\claude\D--Python-yangwenli\300acf93-f68a-409b-a2ae-0d0bf7e512f5\scratchpad\audit2.mjs` and `crops2.mjs`. Run each as `node <script> http://localhost:3011 after` — they write to `D:\Python\yangwenli\_parallax_shots\day02\after\` (before-shots are in `…\before\`). Extend `audit2.mjs` in place for the Change 2/6 bounding-box checks and the Change 3/7/8 counts; keep the `before` outputs untouched.
- Bilingual audit (`rubli-bilingual-audit`) on every touched TSX before reporting. `vercel-react-best-practices` + `ecc:react-reviewer` pass on the diff.
- Commits (cite this file): first `chore(methodology § PARALLAX D2 § Change 6 STEP 0): remove dead ModelTimeline.tsx`; then `feat(methodology+gap § PARALLAX D2): gap 10px floor, HTML blackout timeline, register semantics, hero contrast, gap coda, Plate III·a de-collision, validation table split, 13px clause prose` with a body listing `docs/parallax/DAY-02-metodologia-apagon.md § Change 1–8`. Do **not** bump BUILD_ID, push, or deploy — Fable judges first.
- Report back: per-change PASS/FAIL with the probe numbers (sub-10 counts, empties, links, bbox intersections, max row height, contrast), the gate outputs, the commit hashes, and the list of after-crops.

## Result

Built by Opus executors `parallax-day02` (Changes 1–8) and `parallax-day02-fix` (judge fixes, after the first died on a session limit mid-fix). Judged 2026-09-17/18 on the after-crops in `_parallax_shots/day02/after/`.

| Check | Before | After |
|---|---|---|
| `/gap` sub-10px HTML leaf nodes | 201 | 0 |
| `/gap` SVG text < 10px | 6 | 0 (timeline is HTML; min 11px at 390) |
| `/gap` hero meta contrast | 2.9:1 | 5.01:1 |
| `/gap` internal links out | 0 | 3 |
| `/gap` register: `th[scope]` / table name / max row height | 0 / none / ~40 lines | 7 / bilingual / 87px |
| `/gap` chips multi-line / amounts wrapped (judge fix) | — | 0 / 0 |
| `/methodology` Plate III·a label intersections | 5 | 0 (0 text-vs-line hits, 0.0px overhang) |
| `/methodology` min SVG font | 8px | 10.5px |
| `/methodology` empty `--` cells | 23 | 0 (15 scored rows + 7-case unscored register) |
| `/methodology` clause prose | 12px | 13px (titles stay 12px semibold by design) |
| Dead code | `ModelTimeline.tsx` 208 lines | removed |

Judge rejections (one follow-up commit): the relocated pre-stratification label crossed the step line → two-line label in the lower wash; 10.5px chips wrapped inside their boxes and pushed the amount cell to three lines → nowrap + badge on its own line. A third rejection (duplicate "2002 · CompraNet" at 390) was a misread of the mobile stack — probe confirms one node at 390/1024/1440; the visual crowding is in the backlog.

Gates: `tsc -p tsconfig.app.json` 0 errors · `npm run build` OK · `lint:tokens` PASS (0 forbidden, 84 pre-existing warnings). Bilingual audit PASS on every touched TSX. 0 page/console errors on both routes.

Commits (rebased onto `7b5e4e1e`): `bfa36c3e` STEP 0 · `7f7de3ce` Changes 1–8 · `d7374f51` judge fixes · `09e2fa78` docs · `45c3eece` BUILD_ID `2026-09-18-parallax-d2-metodologia-apagon`.

Deployed 2026-09-18 07:16Z via `deploy-safe.sh` (`[deploy] OK — backend healthy`, VPS HEAD `45c3eece`). Entry bundle `index-Ds6XDEZX.js` → `index-BDnK5lMs.js`; BUILD_ID string 1 hit in the entry chunk; `Gap-DkTRlcNN.js` carries "Recovered awards register", "abolished by law" (HTML timeline) and `whitespace-nowrap`; `Methodology-o4VdbsBl.js` carries "not yet scored" and "AUCs not comparable". Health `db_connected: true`, 3,058,286 contracts. Prod probe (1440 + 390, EN + ES): `/gap` sub-10px 0, timeline min 11px, register 7/7 scoped + named, max row 87px, 8 dashes all titled, 3 links out; `/methodology` sub-10px 0, Plate III·a 0 intersections / 0 line hits / 0.0px overhang, 0 empty cells; 0 page/console errors. (`/gap` total awards read 47,612 at probe time vs 69,516 at audit — the Sep 17 gap refresh changed the data, not the layout.)
