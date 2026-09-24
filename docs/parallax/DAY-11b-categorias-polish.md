# PARALLAX Day 11b — Categorías polish (user review after Day 11)

Routes: `/categories` (the Folio header) and `/categories/:id` (§ La posición, § La cinta kardex). Reference ids: **20** (Medications & Pharma) and **39** (Renewable Energy, the thinnest shelf). Files: `pages/CategoriesIndex.tsx` (header block, `:520-570`), `components/category/KardexPosicion.tsx` (218 lines), `components/category/KardexCinta.tsx` (281 lines). Branch `parallax/day11b-polish` off `origin/main` `ac8f1871`. Evidence: `_parallax_shots/day11b/pre/{en}-{cats-header,cat20-position,cat20-trajectory}-{1440,390}.png` (probe `_parallax_shots/day11b/shots.mjs`).

**User's review (2026-09-24, verbatim intent):** "I like what you did in the kardex tape, but make it smaller. You gave me a data dump of all the administrations; I'd rather have one consolidated mechanism where I can select among them. The position among the 72 — I like the concept, but it needs more design. Check the alignment of the text. On `/categories`, 'Seventy-two shelves hold 9.9T MXN': I don't like the gap between that and the 3,051,294 contracts, and the subheader isn't good. I like the elevation. It's almost there, just clean it up."

## What the crops show
| Where | Defect |
|---|---|
| `/categories` header 1440 (`pre/en-cats-header-1440.png`) | The h1 breaks inside its amber amount: line 2 starts with `· ≈US$492B`. `3,051,294 / VALIDATED CONTRACTS` floats alone at the far right, ~380px from the h1, connected to nothing. The kicker line packs five items (`THE STOCKTAKE —— A PHYSICAL COUNT OF FEDERAL SPEND · COMPRANET 2002–2025 · V0.8.5`). The lede repeats the kicker ("a physical count") and ends on "its column of discrepancies", which names nothing the reader has seen yet. |
| same at 390 (`pre/en-cats-header-390.png`) | The kicker falls apart into a 2-column stack (`THE / STOCKTAKE` beside 4 wrapped lines). The counter sits indented under the h1 on its own. |
| label truth | `3,051,294` is the sum of `total_contracts` over the 72 categories, i.e. *classified* contracts (the platform total is 3,058,286). "Validated contracts" describes a different number. |
| § La posición 1440 / 390 (`pre/en-cat20-position-*.png`) | Five identical grey tracks with nothing that states the scale: no endpoints and no unit. The subject is a 7px dot, and its readout sits far right, ~500px away from it. The `median` label rides above the ticks and collides with them; on the direct-award row the EU 10% tick at x≈0 reads as a rendering glitch. Nothing tells the eye which rows are remarkable. |
| § La cinta kardex (`pre/en-cat20-trajectory-1440.png`, ~1,050px tall) | 24 year rows under 5 administration banners, every column repeated 24 times. The reader has to scroll a ledger to see a shape the data can show in one strip. |

## Keep
- El Alzado, untouched (the user named it as the part they like).
- The kardex's content: per-year value, entries, implied ticket with the † repricing flag and its footnote, the risk stamp, the administration boundaries from `lib/administrations.ts`, the A/B/C/D structure ruler and its caveat. Nothing is dropped; it gets a new shape.
- The position's concept: every peer a tick on a shared track, the median marked, this shelf as the one inked dot, the rank "no. N of 72". Same five metrics, same pools, and the √ scale on book value.
- `formatCompactMXN` / `formatDualCurrency` by surface, the 11px floor, no italic, and no sector hex as text (Day 11 Change 6).

## Change (3)

### 1. The Folio header — `pages/CategoriesIndex.tsx` (header block)
- **Kicker:** one line, `THE STOCKTAKE · COMPRANET 2002–2025` / `EL INVENTARIO · COMPRANET 2002–2025`. Drop "a physical count of federal spend" (the lede says it) and `v0.8.5` (the Procedencia says it). The em-rule goes; use a `·`.
- **h1:** `Seventy-two shelves hold 9.9T MXN; half of it fits on six.` / `Setenta y dos anaqueles guardan 9.9 billones MXN; la mitad cabe en seis.` Rules: the amount is one `whitespace-nowrap` token in `--color-accent`, and the USD leaves the h1. `k50` is spelled out as a word for 1–12 (EN/ES words map), numerals above 12. Keep `text-wrap: balance`.
- **Lede (the subheader), rewritten.** EN: `Categories sort federal purchases by what was bought — medicines, road works, software — not by who bought them. Each shelf carries its spend, its dominant supplier and its risk indicator; the elevation below shows where the money and the risk part ways.` ES: `Las categorías ordenan las compras federales por lo que se compró —medicamentos, obra carretera, software—, no por quién lo compró. Cada anaquel lleva su gasto, su proveedor dominante y su indicador de riesgo; el alzado muestra dónde se separan el dinero y el riesgo.` EB Garamond 17px / 1.55, max 62ch (the dossier ledes' measure).
- **Kill the gap.** The right-floating counter goes. Under the lede, one left-aligned **stat rail** in mono 12px, uppercase tracking .12em, with a hairline above: `3,051,294 contracts classified · 72 categories · 99.73% of spend · ≈US$492B`. ES: `3,051,294 contratos clasificados · 72 categorías · 99.73% del gasto` (the ES rail has no USD, per the currency rule). The numerals are `text-text-primary` weight 600 and the words muted. Each `number word` pair is `whitespace-nowrap`, and the rail wraps only between pairs. The 72 and 99.73 already appear in the Saldo footnote; keep them there too.
- **Alignment:** kicker, h1, lede and rail share one left edge (the frame's content edge) at every width.
- Accept (EN + ES, 1440 / 1024 / 390):
  - `lefts` of the 4 header blocks are equal (±1px).
  - No line of the h1 starts with `·` or `≈`, and the amount never splits.
  - The kicker is 1 line at 390.
  - The header's height at 1440 is ≤ today's.
  - The dump contains no `validated contracts` / `contratos validados`.
  - Crops at 1440 + 390 in both languages.

### 2. § La posición, designed — `components/category/KardexPosicion.tsx`
Same data, same five rows, laid out as a readable instrument.
- **Grid:** at ≥ `md`, each row is `grid-template-columns: 200px 1fr` with a 24px gap. The left cell stacks the label (mono 12px, uppercase, muted) over the **readout**: value in EB Garamond 22px weight 600 `text-primary` + `no. 2 of 72` mono 12px muted on the next line. Below `md` the left cell becomes a row (label left, value + rank right) and the track takes the full width under it.
- **Track** (height 36):
  - Baseline hairline, with peer ticks 1×10px at .35 opacity.
  - **Endpoints:** min and max printed under the track ends in mono 11px muted, in the row's unit (`1.6B` … `1.2T`, `0` … `98%`). They are left- and right-anchored inside the track, never clipped.
  - **Median:** a 1px rule through the baseline, labelled **below** the track (`median 22%`) at mono 11px. The label flips to right-anchored when it sits within 60px of the right end, and hides when it would collide with an endpoint label (measure with `getBoundingClientRect` in a layout effect, or compute from the track width via `useMeasuredWidth`; no state writes during render).
  - **The subject:** an 11px disc in `accent`, with a 3px `--color-background` ring and a 1px `accent` outer ring. Above it sits a small flag: the rank `#2`, mono 11px weight 700 on `text-primary`, centred on the dot and clamped inside the track.
  - **EU line (direct-award row):** a dashed 1px rule the full track height, labelled `EU 10%` below. It takes precedence over the median label if they collide.
- **Emphasis:** a row where this shelf ranks in the top 5 **or** bottom 5 of its pool gets its readout in `text-primary` and a 2px `accent` left rule on the grid row. Other rows stay as they are. Drop the amber `--color-accent` readout (the 4.44 backlog token).
- **Row rhythm:** 14px vertical padding and hairline separators. The whole section is ≤ 5 × 76px at 1440.
- a11y: each row is a `figure`-like group (`role="group"`, `aria-label` = "Book value: 1.1T MXN, no. 2 of 72, median 0.9B"). Ticks and rules are `aria-hidden`.
- Accept (1440 / 1024 / 390, EN + ES, cats 20 and 39):
  - Endpoints and median labels are visible; overlaps between any two labels, dot flags or endpoints = 0 (report the collision check).
  - The rank flag sits within ±2px of the dot's centre x.
  - At 390 the value and rank are on one line with the label, and the track is full width.
  - No text below 11px.
  - Contrast fails in the section = 0.
  - Crops at 1440 + 390.

### 3. The kardex, consolidated with a selector — `components/category/KardexCinta.tsx`
One compact instrument replaces the 24-row ledger:
- **(a) The tape strip.** One SVG-free HTML row of 24 year columns (2002–2025), each a √-scaled vertical bar in `accent`, 64px max height, on a common baseline:
  - A thin gap between administrations and the short name under each group (`Fox · Calderón · Peña Nieto · AMLO · Sheinbaum`, from `ADMINISTRATIONS`, clamped to 2002–2025).
  - Year ticks every 5 years (`2005 2010 2015 2020 2025`, mono 11px).
  - Zero years draw a 1px hairline, not a bar. Flagged (†) years get a small `†` above the bar.
  - Each bar is a `<button>` (`aria-label` "2010: 53.8B MXN, 5,738 entries") that selects **its administration**.
- **(b) The selector.** A segmented control directly above the strip: `All · Fox · Calderón · Peña Nieto · AMLO · Sheinbaum`. These are native `<button aria-pressed>` with the Day 1 focus ring, mono 12px, and wrap to 2 rows at 390. The default is **All**. Selecting a term dims the other years' bars to .25 and outlines the term's group.
- **(c) The readout under the strip,** changing with the selection:
  - **All:** a 5-row term table, `Administration · years · value · entries · avg ticket · risk stamp`. Each row is a button that selects the term. This is the "consolidated" view.
  - **A term:** its year rows only (≤ 6), in today's row style (year · √ bar · value · entries · ticket † · stamp), with a one-line term total above them (`Peña Nieto · 2013–2018 · 271.5B MXN · 42,989 entries` for cat 20).
- Keep the † footnote (shown when any year in view is flagged) and the structure ruler + caveat. Fix the ruler's `fontSize: 8.5` and the stamp's `s/d` `fontSize: 8` → 11px.
- State: local `useState<AdministrationKey | 'all'>('all')`. No URL key (ponytail: add `?term=` if someone asks to share a term). Selection never refetches: everything comes from the `trend` prop.
- Height: the whole section is ≤ **420px at 1440 in the All state** (today ~1,050).
- Accept (1440 / 1024 / 390, EN + ES, cats 20 and 39):
  - Section height in All state before → after.
  - 24 bars, one per year; 2004's single-entry year draws.
  - Clicking `Calderón` (and a 2010 bar) shows 6 year rows and the term total; `All` returns the 5-row table.
  - Keyboard: Tab reaches the selector then the bars, Enter selects, and the focus ring is visible.
  - Term totals equal the sum of their years (assert in the probe).
  - No text below 11px; contrast fails 0 in the section.
  - Crops of All, Calderón and AMLO at 1440 + 390.

## Out of scope
El Alzado; the count sheet; the rest of the dossier; the `#a06820` token decision (except that Change 2 stops using it); a URL key for the term.

## Risk
- Change 3 changes the tape's shape. Every number it showed must still be reachable: all 24 years through the terms, and the ticket † and structure ruler kept.
- Change 1 removes the far-right counter. The number moves into the rail; nothing is lost.
- Label collision logic in Change 2 must not write state during render. Measure once per width.

## Build notes for the executor
Same stack as `DAY-11-categorias.md § Build notes`: worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, branch `parallax/day11b-polish` (this file is its first commit), backend `127.0.0.1:8001` (do not restart), Vite `localhost:3009` on this worktree, `MSYS_NO_PATHCONV=1`, ≤ 2 browsers, never rubli.xyz. Order: **1 → 2 → 3**. One commit per change: `feat(categories § PARALLAX D11b § Change N): …`, body cites `docs/parallax/DAY-11b-categorias-polish.md § Change N`, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Progress: `_parallax_shots/day11b/progress.md` (one line per step). Crops: `_parallax_shots/day11b/after/` (reuse `shots.mjs` with `TAG=after LANGS=en,es`, plus the state crops for Change 3). LOOK at every crop. Report in your reply (subagents cannot write report files): per change, done, every acceptance number before → after, deviations, noticed-not-fixed. Gates from `frontend/`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens` · `npx eslint` on touched files; bilingual check on every string and aria-label. Do NOT bump BUILD_ID, push, deploy or merge.
