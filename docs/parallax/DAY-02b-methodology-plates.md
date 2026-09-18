# PARALLAX Day 2b — Metodología plates: text scale + «Dos formas de ver» redesign

Route: `/methodology` · Files: `frontend/src/components/methodology/{TwoWorldsExhibit,BalanzaLedger,CalibrationRecord}.tsx`
Trigger: user review of the Day-2 deploy (2026-09-18, screenshots `094000/094012/094041`): "the text is too big in some instances" (La Balanza column heads collide at the spine, margin annotations print over row labels, `+0.558` clipped; the plates render 13px viewBox units at ≈19px on a 1440 screen) and "the graph where we show our tool and the cases that got investigated — change the graphic, it could be done better" (the Two Worlds Venn). User direction on inspiration screenshots (Memtrace): **borrow the mechanics — typed legend with counts, node/edge tally, named nodes — keep RUBLI's folio look.** Designed by Fable; this file is the brief.

## Classification: GOLD page, enhance-in-place. Two plates get precision fixes; one exhibit is replaced in place (same section id, same prose, same data).

## Keep
- The Dictamen chrome (masthead, index rail, clause/annex grammar), Plate II headline/dek/caption copy, the 18 β values and signs, the hatch-band engraving vocabulary (`HatchBar`, 45° hatch, terminal ticks, ruled rows), the zero morgue.
- Plate III·a's argument and geometry (stepped line, ochre wash, square vertices, service register) — the Day-2 label positions stay.
- Two Worlds: section id `two-worlds`, the kicker "Exhibit · why the model isn't redundant", the h3, the numbered prose paragraph, the closing paragraph with the ARIA link, the three-region breakdown, the `intersectionApi.getSummary(1)` query, "static by design" (no filters, no state).
- Surface rule from the methodology spec: **no `<circle>` dot fields on this page**; text in HTML wherever a chart is responsive.

## Change (4)

### 1. Cap the plates' rendered scale — `BalanzaLedger.tsx`, `CalibrationRecord.tsx`
- Both SVGs are `viewBox` 720 wide and `w-full`: at a 1440 viewport the plate interior is ≈1040px, so 13px viewBox units render at ≈18.8px (the "too big" the user saw). Wrap each `<svg>` in `<div className="overflow-x-auto overscroll-x-contain"><svg … style={{ width: '100%', maxWidth: 760, minWidth: 600, height: 'auto' }} /></div>` (drop `className="w-full"`). At ≥ 1040px the plate renders 720–760px wide (13px → ≤ 13.7px); below 600px the plate scrolls inside its frame instead of shrinking the type (13 × 600/720 = 10.8px; 10.5 × 600/720 = 8.75px → **raise CalibrationRecord's 10.5 labels to 12** so they stay ≥ 10px at the floor). Left-aligned inside the plate (folio convention), not centered.
- Accept: probe at 1440 on `/methodology`: every `svg text` inside Plate II and Plate III·a has a rendered font size ≤ 14px and ≥ 10px; at 390 the same holds and `document.documentElement.scrollWidth === innerWidth` (scroll stays inside the plate wrapper).

### 2. La Balanza: heads, annotations, value clearance — `BalanzaLedger.tsx`
- Column heads (246–268): `fontSize` 13 → **11**, and anchor them to the spine, not the field edges: defense head `x = SPINE_X − 8`, `textAnchor="end"`; charge head `x = SPINE_X + 8`, `textAnchor="start"`. They no longer meet at the spine.
- Margin annotations (`ANNOTATIONS`, 132–149, drawn at 347–376 and 453–475): **remove them from the SVG** (they print over row 0/1 labels and were already truncated with "…"). Render the same three sentences as an HTML "reading key" under the chart, above the existing footer note: mono 11px kicker `§ READING THE LEDGER` / `§ CÓMO LEER EL LIBRO`, then three lines in EB Garamond 13.5px `text-text-secondary`, each prefixed by the feature name in mono 12px (`Price volatility —`, `Institution diversity —`, `Single bidding —`). Delete the `ANNOTATIONS` array and `annotationByKey` when nothing reads them.
- Value clearance: reserve room for the terminal value on the charge side. `const VALUE_PAD = 60; const HALF_W = (FIELD_W − GUTTER_W − VALUE_PAD) / 2; const SPINE_X = GUTTER_W + HALF_W;` (keep `AXIS_MAX 0.60`). `+0.558` then ends at ≈ x 716 < 720. Axis ticks and gridlines follow `xFor`, no other change.
- Accept: probe: 0 pairwise-intersecting `<text>` bboxes in Plate II; every `<text>` right edge ≤ svg right edge and left edge ≥ svg left edge; no `<text>` contains "…"; the three reading-key lines are present in EN and ES.

### 3. Two Worlds → «Los dos padrones» proportional ledger — `TwoWorldsExhibit.tsx` (replace the Venn only)
Why: the Venn draws the model at 5× the state's area while the data is 29× (6,548 vs 224), floats labels on leader lines, and shows nothing of the 46 / 607 / 178 beyond a number. The replacement is an honest, linear, hatch-band ledger in the Balanza's engraving vocabulary with the Memtrace mechanics the user asked for: a typed legend with counts, a tally line, and named nodes.

Wrap the whole section body in `PlateFrame` (`lang`, `folio="III·c"`, `contextLabel={{ en: 'Two ways of seeing', es: 'Dos formas de ver' }}`, bilingual caption below). Keep the current header block (kicker, h3, numbered prose) as the plate's headline area; keep `id="two-worlds"` on the outer `<section>`.

Layout (all text HTML; hatch bands are one local `HatchBand` SVG — `viewBox 0 0 100 10`, `preserveAspectRatio="none"`, height 16px, `aria-hidden`, segments `[{ pct, fill: 'hatch' | 'dense' | 'solid', color }]`, hatch pattern per segment as in `HatchBar`, `dense` = same pattern with `fillOpacity 0.34` and stroke 1.8; a 1px terminal tick at every segment boundary):

```
ROW A   RUBLI MODEL · risk ≥ 0.40                                          6,548
        [ model only 5,895 — red hatch ][ ghost signature 607 — red dense ][46 amber solid]   ← 100% width
        under-labels (mono 11px, positioned by %): "5,895 model only" · "607 ghost signature · P2/P3" · "46"
ROW B   OFFICIAL RECORD · SAT EFOS + SFP                                     224
        right-aligned stub at the SAME px scale as row A: [46 amber][178 slate hatch]  (≈ 3.4% of row A)
        one dashed leader from the stub's left edge down to the lens's left edge (single SVG line, ≤ 12 lines of code; if it costs more, replace by the lens label alone)
LENS    bordered inset, right-aligned, width = min(100%, 34% × 10) → caps at 100% on narrow screens
        label mono 10.5px: "DETALLE ×10 · the state's 224, magnified" / "DETALLE ×10 · los 224 del Estado, ampliados"
        [ 46 both agree — amber solid ][ 178 blind spots — slate hatch ]
        under-labels: "46 both agree · 20.5% of the state's list" · "178 blind spots · sanctioned, model score < 0.40"
        sub-line mono 11px muted: "126 SAT EFOS 69-B · 99 SFP sanctions" (from `registry_breakdown`; note 1 vendor is on both lists)
```
Percentages come from the payload, never hard-coded: `model_only − ghost_signature`, `ghost_signature`, `overlap`, `blind_spots`, `registry_breakdown.efos_definitivo`, `registry_breakdown.sfp_sanctioned`. Model-only-other = `worlds.model_only − worlds.ghost_signature` (5,895 today).

Colors: model = `RISK_COLORS.critical` (hatch; ghost = dense hatch of the same red), both = `RISK_COLORS.high` solid, state = `var(--color-text-secondary)` hatch (replace the raw `#64748b` `C_RECORD`). No green.

**Legend row** (replaces the current 3-cell grid; 4 cells on ≥ sm, 2×2 below): each cell = a 28×12 hatch swatch (the same `HatchBand` with one segment, not a dot), mono 11px uppercase label in the segment color, the count in Playfair Display 800 22px `tabular-nums` (`fontStyle: 'normal'`), a one-line gloss in mono 11px muted. Cells: Model only 5,895 — "flagged, not on any state list" / Ghost signature 607 — "P2/P3 fingerprint the registry never listed" / Both agree 46 — "on EFOS/SFP and flagged by the model" / State only 178 — "sanctioned vendors the model misses".

**Tally line** (the Memtrace "48,330 nodes · 150,043 edges" mechanic), mono 11px muted, right-aligned under the legend: EN `6,726 vendors under scrutiny · 46 shared · 0.7% of the model's list · 20.5% of the state's` / ES `6,726 proveedores bajo escrutinio · 46 compartidos · 0.7% de la lista del modelo · 20.5% de la del Estado` (all computed: `model_flags + blind_spots`, `overlap`, `overlap / model_flags`, `overlap / official_record`).

**Named nodes** (new, below the tally, above the closing paragraph): three columns (stack below sm) headed by mono 10.5px kickers `BOTH AGREE · TOP 3 BY RISK` / `GHOST SIGNATURE · TOP 3` / `BLIND SPOTS · TOP 3` (ES: `AMBOS COINCIDEN · 3 DE MAYOR RIESGO` / `HUELLA FANTASMA · 3` / `PUNTOS CIEGOS · 3`). Each column lists the top 3 of `zones.confirmed.vendors` / `zones.ghost.vendors` / `zones.blindspot.vendors` sorted by `avg_risk_score` desc, rendered with `<EntityIdentityChip type="vendor" id={vendor_id} name={vendor_name} size="sm" riskScore={avg_risk_score} />` (rule 1 — never a bare Link; rule 3 — the chip formats the name) plus a mono 11px trailing readout `P2 · 17 contracts` (`primary_pattern`, `total_contracts`; pattern omitted when null). Zone with an empty list renders the kicker and "—" with a title. This is the only new hypertext on the exhibit; everything else stays static.

Caption (PlateFrame): EN "Plate III·c — the two lists drawn to one scale. The model's list, the state's list, and the sliver where they meet, with the state's 224 magnified ten times to make its split legible." / ES "Lámina III·c — los dos padrones dibujados a una sola escala. La lista del modelo, la del Estado y la franja donde coinciden, con los 224 del Estado ampliados diez veces para leer su reparto."

`aria-label` on the ledger wrapper (`role="img"`): EN "Proportional ledger: 6,548 vendors flagged by the model, 224 on the official record, 46 on both" / ES equivalent, numbers interpolated.

- Accept: probe on `/methodology` (EN + ES, 1440 + 390): the `two-worlds` section contains no `<circle>` and no `svg text`; row A's three segment widths sum to 100% ± 0.5 and are proportional to the payload; the lens width equals `min(100%, 10 × official_record / model_flags)` of row A ± 1%; 4 legend cells, tally line present, 9 `EntityIdentityChip`s (or fewer with a "—" placeholder) whose hrefs start with `/vendors/`; no leaf text < 10.5px inside the section; no document-level horizontal overflow at 390; screenshot shows the sliver aligned above the stub and the lens.

### 4. Bilingual + copy hygiene inside the three files — same files
- Two Worlds legend/tally/kicker strings bilingual per above; `C_RECORD` → `INK_RECORD = 'var(--color-text-secondary)'`.
- `rubli-bilingual-audit` on all three files.
- Accept: ES probe run shows 0 English leaks inside `#two-worlds`, Plate II and Plate III·a.

## Out of scope
- ConcentrationConstellation (the Aug-23 sector-ring "red dots" chart) lives only on the unlinked `/atlas/stories/:slug`; separate decision.
- Any change to the intersection endpoint; the payload already carries everything used here.

## Build notes for the executor
- Same worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, new branch `parallax/day-02b-methodology-plates` from `origin/main` (Day 2 is merged at `fe40e612`). Ignore untracked `frontend/Python.npm-cache/`. Never junction node_modules; never bare `git stash`.
- Read all three files fully before editing. `PlateFrame` usage examples: `BalanzaLedger.tsx` 183–188; `EntityIdentityChip` props at `components/ui/EntityIdentityChip.tsx:125–160`; the hatch pattern at `BalanzaLedger.tsx:77–107`.
- Gates from `frontend/`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens`.
- Verify on `VITE_API_URL=https://rubli.xyz npm run dev -- --port 3011` (or 3012 if taken). Probes: extend `C:\Users\ranay\AppData\Local\Temp\claude\D--Python-yangwenli\300acf93-f68a-409b-a2ae-0d0bf7e512f5\scratchpad\audit2.mjs` with the checks above under a `day2b` block and run it with tag `after-2b`; crops via `crops2.mjs` tag `after-2b` plus new crops of `#two-worlds` at 1440 and 390 (`tw-desk.png`, `tw-mob.png`) and Plate II at 1440 (`m-balanza.png`). Read the crops yourself before reporting.
- Commit: `feat(methodology § PARALLAX D2b): plates capped at 760px, Balanza heads/annotations/value clearance, Two Worlds Venn → proportional ledger with legend, tally and named nodes` + body citing `docs/parallax/DAY-02b-methodology-plates.md § Change 1–4`, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Do not bump BUILD_ID, push or deploy — Fable judges first.

## Result

Built by Opus executor `parallax-day02b`; judged by Fable on `_parallax_shots/day02/after-2b/` (tw-desk, tw-mob, m-balanza, m-calibration). One judge rejection (lens 102px wide at 390 → full width below `sm`, row-A under-labels on one line) fixed in `a0bde80b`.

| Check | Before | After |
|---|---|---|
| Plate II / III·a rendered text at 1440 | ≈18.8px | 11.6–13.7px (svg capped 760px, min 660px, scrolls inside the frame) |
| Plate II colliding text pairs | 2 (heads at the spine, annotations over rows) + `+0.558` clipped | 0, nothing escapes the viewBox, no "…" |
| Two Worlds encoding | Venn, model area 5× state (data 29×) | linear ledger, row A 90.03 / 9.27 / 0.70 % = payload exactly; lens 34.21% at 1440, 100% at 390 |
| Two Worlds hypertext | 1 link | 9 `EntityIdentityChip`s (top 3 per zone) + ARIA link |
| `<circle>` / `svg text` in `#two-worlds` | Venn circles + 14 svg texts | 0 / 0 |
| Leaf text < 10.5px in the section | — | 0 |

Deviations accepted: `minWidth` 660 (not 600) to keep 11px heads ≥ 10px; Plate II axis caption moved to `AXIS_Y + 20`; `getSummary(3)` for three vendors per zone (worlds counts unchanged); executor committed the brief with the code. Gates: tsc 0 · build OK · lint:tokens PASS. Commits `0c133bb8` + `a0bde80b` on `c214448e`; BUILD_ID `2026-09-18-parallax-d2b-plates`. Bundle + prod probe appended at deploy.
