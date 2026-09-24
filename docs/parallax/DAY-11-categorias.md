# PARALLAX Day 11 — Categorías

Routes: `/categories` («El Inventario»: El Saldo → Hallazgos → Filtro → El Alzado → La hoja de conteo → Adónde ir → Procedencia) and `/categories/:id` (the stock-card dossier). Reference ids: **20** Medications & Pharma (Health, 261,777 contracts), **39** Renewable Energy (Energy, 130 contracts — thinnest shelf, yellow sector ink). Files: `pages/CategoriesIndex.tsx` (898), `pages/CategoryDossier.tsx` (638), `components/category/{CategoryCommandPanel (322), CategoryDossierSections (715), KardexPosicion (218), KardexCinta (281)}.tsx`, `components/categories/{CategoryAlzado (1,063), CategoryHoverDossier (115)}.tsx`, `components/dossier/FindingsBand.tsx`, `components/sector/SectorHero.tsx` (one shared ladder, Change 3), `lib/constants.ts`. Branch `parallax/day11-categorias` off `origin/main` `d5b9c1f0` in worktree `.claude/worktrees/parallax-day01`.

**Entering state.** Day 10b (`6c702ee9`, Sep 24) already did the schedule row's visible work on these two pages: zero `…`, El Alzado names every column, the risk-tier cap, `fullName` chips, h2 section heads, the largest-contracts measure. So the re-audit did not look for ellipses. It asked the Day 10 question: **what does the page say that is not true?** A code read against the live numbers found six honesty defects. No probe sees them, because every glyph renders cleanly.

**Classification: GOLD → enhance-in-place.** El Alzado (Jul 3 DESIGNUS + 10b) is the loved element and stays the default. No `/designus`.

## Audit evidence (2026-09-24, local backend `127.0.0.1:8001` no-scan, Vite 3009 on the worktree at `d5b9c1f0`; prod not touched)

The probe `_parallax_shots/day11/audit11.mjs` is `day10/audit10.mjs` re-pointed at `cats` / `cat20` / `cat39`. It writes `d11pre-{en,es}.txt` and `d11pre/{en,es}-report.json`, full pages to `d11pre/{en,es}-{route}-{w}-full.png`, and crops to `d11pre/crops/{cat20-hero,cat20-position,cat20-tape,cat20-market,cats-top,cats-mid}.png`.

| Measure | `/categories` 1440 (390 same) | `/categories/20` | `/categories/39` |
|---|---|---|---|
| ellipsis / trunc / sub-10px / italic | 0 / 0 / 0 / 0 ✓ (10b holds) | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| contrast < 4.5 | **44** (min 1.82): sector filter chips set in sector hex (`Energy #eab308` 1.82, `Agriculture` 2.16, `Environment` 2.41, `Labor` 2.66, `Treasury` 3.13, `Infrastructure` 3.38, `Education` 3.49, `Technology` 4.02 — `CategoriesIndex.tsx:651`); `intensityColor` `#f59e0b` as 13px risk numerals and category chip names 2.04; δ values + `Open the Watchlist` in `#a06820` 4.44 (known backlog token) | **10**: `high-risk contracts` 2.36 (opacity .6, `CategoryDossier.tsx:368`), `Spending category` 2.95 (opacity .7, `:351`), `CRITICAL` `#ef4444` 3.57, kardex `ticket … †` amber 4.44 | **19**: every § kicker, and the `STOCK CARD` line, set in `#eab308` at **1.82** — the section heads of every Energy category are unreadable (`DossierSectionHeader` `color: accent`, `:88`; `:337`) |
| semantics | the count sheet is `<table>` with **6 `<th>` over rows holding 1 `<td>` each** (`LedgerRow` wraps six blocks in one `td`, `:257`) → a screen reader reads 6 headers and 1 cell; `Open the Watchlist →` is a `<button onClick={navigate('/aria')}>` (`:822`), and the label ("Watchlist") names a different surface from where it goes (the ARIA queue); 17 sort/filter buttons have no focus-visible style; single-bid dots are `<span aria-label>` with no role ×72 | `See full methodology ↗` is a `<button>` navigating (`:118`); the methodology kicker is a `<p>` (the other 11 heads are h2) | same |
| headings | h1 + 6 h2 ✓ | h1 + 11 h2 ✓ | h1 + 10 h2 ✓ |
| 390 | 0 overflow; the 72 Alzado column rects are 3px targets (`svgSmall` 71) — keyboard path exists (← → Enter) | vendor register 524 and capture pairs 467 scroll inside 332 (`overflow-x-auto`, the accepted Jun 23 pattern) | same |

**Honesty defects (code read + crops):**

| # | Where | What the page says | What is true |
|---|---|---|---|
| H1 | dossier § Competition, "Direct award & single bid over time" (`CategoryDossierSections.tsx:136-221`, `crops/cat20-market.png`) | a y-axis of **0% · 0.5% · 1%**, with direct award plotted at "0.5%" (tooltip `2010 · Direct award: 0.5%`) | 48.8%. The component normalises to 0–1 "for the 'pct' formatter", but the shared `formatValue('pct')` (`charts/editorial/tokens.ts:116`) has printed its input as-is since April (`${v}%`). The sector-average hrule (64.8 → 0.648) is off by the same factor. This has been wrong on **every** category dossier since the chart shipped |
| H2 | findings band, `/categories` (`CategoriesIndex.tsx:176,195`) | the "Highest risk 44" proof bar is **88 %** full (`avg_risk × 100 × 2`); the "Heaviest exposure 37 %" bar is **100 %** full (`× 3`) | the bars have no scale label, so a reader takes them as proportions; 44 of 100 and 37 % should fill 44 % and 37 % (the "Most captured 98 %" bar is the only honest one) |
| H3 | one number, two verdicts | the dossier seal says **22 % · CRITICAL** (red; ladder 20/12/5 at `CategoryDossier.tsx:311`, copied from `SectorHero.tsx:51`), and the stat strip one inch below prints the same 22 % in **high** orange (ladder 25/15 at `CategoryCommandPanel.tsx:111`) | one high-risk-share ladder, used by both |
| H4 | risk on three scales | the Saldo sentence says Insurance & Bonds "posts a **0.44** indicator" (`:612/:625`) while the finding card under it says **44** · of 100; the dossier's § La posición says **0.32** · no. 7 (`KardexPosicion.tsx:176`) while the stat strip says **32** of 100; El Alzado's aria-labels (`CategoryAlzado.tsx:736,798,842`) say "**22.9% risk**" — a percentage reads as a probability, the copy CLAUDE.md rule 5 forbids | one scale everywhere: an integer indicator "of 100" |
| H5 | EU line vs OECD copy | `/categories` Procedencia: "The direct-award rule marks the **OECD 30 % ceiling**" (`:373`; ES "techo OCDE del 30%" `:372`) | the register's reference tick, the hover dossier and the dossier strip all draw `EU_DIRECT_AWARD_LIMIT` = **10 %** (`constants.ts:238`, re-pointed during the Sep 19 story QC after the "OECD 2023 Performance Report" turned out not to exist). The text describes a line that is not on the page |
| H6 | small untruths | `KARDEX · C-020 · SALUD` is a raw DB code on the EN page (`:335`); procedure legend prints **Other ×2** (`otro` + `desconocido` both map to `Other`, 7 contracts; `:110` + legend `:170`); kardex `1 entries` (`KardexCinta.tsx:213,232`, 2004 row); cat 39's largest-contract titles print `Adquisiciýn` (`:654` skips `stripEncodingArtifacts`, which the contract dossier uses) |

Toolkit: this day ran the probe's rule checks in place of the `web-design-guidelines` / `accessibility-expert` passes (contrast per leaf, focus styles, native-vs-role controls, table shape, targets, headings). A separate pass found nothing more on two pages that had been through 10b the same morning. For `ui-ux-pro-max --domain chart` "proof bar scale" the answer is the standard one: a bar with no axis encodes its value at true proportion.

## Keep
- El Alzado as it is: geometry, the tier cap, the labels, walls, rules, needles, hover dossier, keyboard path. Only its aria-label strings change (Change 2).
- Both pages' section order and composition: the Folio h1, El Saldo, the three finding cards, the filter, the count sheet with δ, the coda; the dossier hero + seal, the stat strip, § La posición, the kardex tape, Competition, Market, Signals, Composition, Size, Largest, Vendors, Buyers, Capture pairs, the provenance.
- The sector palette **as fill** (bars, rules, the hero's 6px band, the lede's drop cap, register left borders). Change 6 only changes sector hex used **as text**.
- Everything 10b made true: no `…`, `fullName` chips, the list measures.

## Change (8)

### 1. The drift chart in percent — `CategoryDossierSections.tsx:136-221`
Feed `EditorialComposedChart` 0–100 (`da_pct` / `sb_pct` already arrive 0–100; drop the `norm` to 0–1), `yDomain={[0, 100]}`, and the sector-average hrule at `sector_da_avg` as-is. Fix the comment. In the same component, fold `desconocido` into `otro` before sorting, so the bars and the legend have one "Other".
- Accept: at `/categories/20`, hovering 2010 reads `Direct award: 48.8%`; y ticks `0% · 50% · 100%`; the `sector avg` rule sits at 64.8 and is labelled; the legend has exactly one `Other`/`Otro` (EN + ES). Crop at 1440 + 390.

### 2. One risk scale — `CategoriesIndex.tsx` (Saldo), `KardexPosicion.tsx:176`, `CategoryAlzado.tsx:736,798,842`
Every risk-indicator readout on both pages is an integer "of 100". Saldo EN: `…posts a 44-of-100 risk indicator, 1.8× the inventory average`; ES: `…marca 44 de 100 en el indicador de riesgo, 1.8× el promedio del inventario`. KardexPosicion risk row: `32 · no. 7 of 71`. Alzado aria-labels: `Medications & Pharma — risk indicator 32 of 100, 1.1T MXN, …` / `indicador de riesgo 32 de 100`. Keep the `inventory mean` rule and the `×100` axis label.
- Accept: in the EN + ES text dumps and the aria-label dump of both pages, no risk value matches `/\b0\.\d{2}\b/` and no `% risk` / `% riesgo` remains (list any `0.xx` still present and what it is); the Saldo number equals the finding card's number.

### 3. One high-risk-share ladder — `lib/constants.ts`, `CategoryDossier.tsx:311`, `CategoryCommandPanel.tsx:111`, `SectorHero.tsx:51`
Add `getHighRiskShareLevel(pct: number)` next to `getRiskLevelFromScore` and document the bands on it: ≥ 20 critical · ≥ 12 high · ≥ 5 medium · else low, calibrated to the model HR baseline of 11 %. These are the seal's and SectorHero's bands. Use it for the dossier seal, the stat-strip `High-risk` cell colour (`RISK_TEXT_COLORS[level]`, with `low`/`medium` → undefined as today), and SectorHero. Grep for other copies of `hrPct >= 20` (for example the institution dossier) and **report** them without converting them.
- Accept: `/categories/20` seal `22 % · CRITICAL` and the strip's `22%` share one tier colour; `/sectors/1` hero is pixel-identical before/after (same bands); report every other inline HR ladder found.

### 4. Proof bars at true proportion — `CategoriesIndex.tsx:176,195`
`proofPct` = `avg_risk × 100` for Highest risk and `high_risk_pct` for Heaviest exposure (no ×2 / ×3). If a bar then looks too faint, the fix belongs to the bar's track contrast, not its length.
- Accept: bar width / track width = 0.44 and 0.37 (± 1px) in the 1440 probe; crop of the findings band.

### 5. The EU line, named as drawn — `CategoriesIndex.tsx:334,372-373`, comments in `CategoryDossier.tsx:12,459`, `CategoryCommandPanel.tsx:6,14,185,240`, `KardexPosicion.tsx:128`, `CategoryHoverDossier.tsx:10`
Procedencia EN: `The direct-award tick marks the EU single-market scoreboard line (10 %); the single-bid dot reddens >25 % critical / ≥15 % high.` ES: `La marca de adjudicación directa es la línea del marcador del mercado único de la UE (10 %); el punto de único postor se enrojece >25 % crítico / ≥15 % alto.` Interpolate the 10 from `EU_DIRECT_AWARD_LIMIT` (not typed). Code comments say EU. The register's `δ` header gets a visible explanation: one mono caption line under the table, `δ = spend rank − risk rank · + means the shelf burns hotter than its size` (ES equivalent). The `title` stays but is no longer the only carrier.
- Accept: `OECD` / `OCDE` / `30%` absent from both pages' dumps; the tick in the register sits at 10 % of its track; the δ caption is visible at 1440 and 390.

### 6. Sector ink for text only — `CategoriesIndex.tsx:651`, `CategoryDossier.tsx:88,335-337` (+ `DossierSectionHeader`), `:351,:368`
Sector filter chips: text `SECTOR_TEXT_COLORS[code]`, border stays `SECTOR_COLORS[code]`, and the active state keeps a fill that passes against `#fff` (use the text ink as the fill when the sector hex fails 4.5). Dossier: § kicker, `STOCK CARD` line and section-head eyebrow in `SECTOR_TEXT_COLORS`; the 6px band, the header rule, the drop cap, bars and borders stay `accent`. `KARDEX · C-020 · SALUD` → the localized sector name (`Health` / `Salud`), uppercase by CSS. Drop the `opacity: .6/.7` on `high-risk contracts` and `Spending category` (use `--color-text-muted`, now AA per Day 1).
- Accept: contrastFail from sector hex as type **0** on `/categories`, `/categories/20`, `/categories/39` (report the remaining fails by colour — the `#a06820` 4.44 and `intensityColor #f59e0b` ones are the backlog token decision, leave them), cat 39 kickers ≥ 4.5; crop of cat 39 hero + one section head, and of the filter row (resting + active Energy).

### 7. Real cells, real links, visible focus — `CategoriesIndex.tsx:241-350,621-661,819-829`, `CategoryDossier.tsx:108-127`
- Count sheet: each `LedgerRow` renders **six `<td>`s** matching the six `<th>`s (the six blocks that exist today become the cells; keep `display: flex` on the `tr` and each block's width classes so the layout does not move). The hover dossier's `tr` stays `aria-hidden`.
- `Open the Watchlist →` → `<Link to="/aria">` labelled `Open the ARIA queue →` / `Abrir la cola ARIA →`. `See full methodology ↗` → `<Link to="/methodology">` with `→` (internal link, not ↗). The dossier's methodology kicker `<p>` → `<h2>` with the same style.
- `focus-visible:outline` (the Day 1 ring token) on the 4 sort and 13 sector buttons. The single-bid dot's `aria-label` moves to a `sr-only` span inside the Direct cell.
- Accept: `tables` → the count sheet reports `cols 6` and every body row has 6 cells; `navButtons` 0 and `rawAnchorsFullReload` unchanged or lower on both pages; `noFocus` drops by 17 on `/categories`; `ariaLabelNoRole` 0; a Tab walk from the h1 reaches sort → filter → the Alzado → the first row chip with a visible ring (crop one ring).

### 8. Small truths — `KardexCinta.tsx:213,232`, `CategoryDossierSections.tsx:654`, `CategoriesIndex.tsx:269`
`1 entry` / `1 entrada` (plural otherwise); largest-contract titles through `stripEncodingArtifacts` before `sentenceCaseCaps`; the register's `†` sup 8px → 11px.
- Accept: cat 39 dump contains no `ý`; the 2004 row of cat 20 reads `1 entry`; sub-11px leaves 0 on all three routes.

## Out of scope
- `VendorActivityTab.tsx:199` passes 0–1 data with `yFormat="pct"` and `yDomain={[0,1]}`, so the vendor dossier's risk-trend axis is almost certainly the H1 bug. It is Day 13's surface → backlog. **Do not** change `formatValue('pct')`: 7 other callers pass 0–100.
- The `#a06820` / `#f59e0b` small-text contrast (Day 1 backlog token decision).
- The 3px Alzado column targets at 390 (the keyboard path covers them; a mobile tap design is invention-scale).
- El Saldo's riskiest-category name in sector green (`SECTOR_TEXT_COLORS.hacienda` passes AA; the reading "green = safe" is a design call → backlog).
- The 390 table scroll on the dossier (accepted pattern).

## Risk
- Change 7 rewraps 72 rows of a flex table. The layout must not move: compare the 1440 + 390 register crops pixel-for-pixel apart from the focus ring.
- Change 3 touches `SectorHero` (another page). The same bands mean the same output. Verify `/sectors/1`.
- Change 1: check `EditorialComposedChart`'s hrule annotation takes the y in data units. If the label does not render at 64.8, report it; don't patch the shared chart without a note.

## Build notes for the executor
Same stack and rules as `DAY-10b-categories-vendor-polish.md § Build notes`: worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, branch `parallax/day11-categorias` (created from `origin/main` `d5b9c1f0`; this file is its first commit), backend `127.0.0.1:8001` running (no-scan; **no backend change today, do not restart it**), Vite `localhost:3009` on this worktree, `MSYS_NO_PATHCONV=1`, ≤ 2 browsers, never rubli.xyz. Order: **1 → 4 → 2 → 5 → 3 → 8 → 6 → 7**. One commit per change: `feat(categories § PARALLAX D11 § Change N): …`, body cites `docs/parallax/DAY-11-categorias.md § Change N`, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Progress file `_parallax_shots/day11/progress-11.md` (one line after EVERY step, failures included); report `_parallax_shots/day11/report-11.md` (per change: done, every acceptance number before → after, deviations, noticed-not-fixed). Probe: `node _parallax_shots/day11/audit11.mjs http://localhost:3009 d11after` (+ `LANG_ES=1`, `WIDTHS=1440,1024,390`); add the checks the acceptance lines name (drift tooltip text, proof-bar ratios, `0.xx` risk regex over text + aria-labels, `OECD|OCDE|30%`, table cells per row, `ý`). Crop before/after pairs of every changed block into `_parallax_shots/day11/d11after/crops/` and **LOOK at every crop**. Review: `rubli-bilingual-audit` on every touched TSX; gates from `frontend/`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens` · `npx eslint` on touched files. Do NOT bump BUILD_ID, push, deploy or merge — Fable judges first.
