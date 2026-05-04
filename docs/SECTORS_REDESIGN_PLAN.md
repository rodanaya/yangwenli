# /sectors Redesign Plan — "12 Sectors, One Map of Risk"

**Status**: Draft v1 · 2026-05-04
**Owner**: design-visionary · executable by Sonnet
**Source page**: `frontend/src/pages/Sectors.tsx` (1,265 LOC)
**Target page count**: ~700 LOC (-45% via dedup + extraction)
**Risk model in copy**: **v0.8.5** (HR=11.0%, AUC=0.785). Current code says `v0.8.5` in header but `riskFactors.title` translations and footnote may still reference v0.6.5 — audit i18n keys.

---

## 1. The Thesis

> **The story `/sectors` should tell in one sentence:**
> *"Mexican federal procurement is not one market — it is twelve, and each has its own pathology: Salud bleeds money, Tecnología quietly captures, Energía concentrates, and Agricultura's signal is dominated by one mega-case."*

A reader spending 30 seconds on this page should walk away with:
1. **Where the money goes** (Salud + Energía + Educación = ~70% of spend)
2. **Where the risk is** (which sectors break the OECD 25% direct-award ceiling)
3. **One sector worth investigating today** (the highest-risk sector × value cell)

A reader spending 5 minutes should be able to compare any two sectors on six dimensions and click into a vendor-level investigation thread.

### The /categories sub-thesis

> *"Categories tell us **what** the state bought. The most expensive thing — medicines — is also the riskiest, and the gap between top-vendor and second-vendor in critical categories is what corruption looks like in a spreadsheet."*

---

## 2. Current State — Redundancy Audit (specifics)

The current page has **9 visual blocks** repeating the same 3–4 facts. Specifically the **average risk score** is rendered in all of these places:

| Where (line) | Encoding |
|---|---|
| `FeaturedFinding` headline (L1045) | "Salud leads risk 28.4%" — large serif |
| `FeaturedFinding.meta[0]` (L1058) | "28.4%" stat tile |
| `SectorSmallMultiples` 12-tile grid (L1082) | sparkline + last-year % |
| `OECDCompetitionDotMatrix` (L1109) | per-sector dot strip (DA pct, not risk — close cousin) |
| `SectorRiskTrendPanel` top-6 line chart (L1121) | line chart |
| `RiskRankingStrip` (L1126) | horizontal bars, all 12 |
| `SectorCard` `RiskLevelPill` (L129) | pill |
| `SectorCard` `MiniRiskField` (L143) | mini bucket viz |
| `SectorCard` second `MiniRiskField` (L161) | full-width bucket viz **(same data, bigger)** |
| `SectorCard` "X% avg risk" footer (L176) | numeric |

**That is 10 surfaces for one number.** Same problem for `direct_award_pct` (5 places), `total_value_mxn` (3 places), `single_bid_pct` (only 1 — actually under-used).

Plus three blocks that don't earn their place:

- `SectorModelCoefficients` (L1237) — analytical, belongs on `/methodology` or `/sectors/:id`, not the index
- `SectorConcentrationChart` (L1249) — context-free; it's a generic Lorenz/HHI-style chart with no editorial frame
- The "Risk Ranking Strip" (L1126) duplicates the small multiples' implicit ranking with no new info

### Lazy blocks
- Sort dropdown (L1141) — 4 sort keys × 12 cards = decision paralysis. Pick one canonical sort and demote the rest to a quiet menu.
- Empty state (L1163) — never fires (12 sectors are static); dead code.
- Card footer "Explorar →" link (L196) — entire card is the link; this is decorative.

---

## 3. Story Arc (the redesigned page in 3 beats)

1. **THE STAGE** — 9.9T MXN, 3.06M contracts, 12 sectors. Where does the money go?
2. **THE SCAR** — Of those 12, which break the OECD competition ceiling, and how have they trended over a decade?
3. **THE SUSPECT** — One sector × one vendor × one investigation hook per row of the grid.

Same arc on `/categories`:
1. What was bought (top categories by spend)
2. How concentrated each market is (top-vendor share)
3. Click into a category → vendor list

---

## 4. Proposed Information Architecture (7 sections, no more)

| # | Section ID | § Kicker (ES) | Headline (ES / EN) | Hero Visual | Why it earns its place |
|---|---|---|---|---|---|
| §0 | `hero` | RUBLI · Panorama Sectorial | "12 sectores, 9.9 billones de pesos, 23 años" / "12 sectors, 9.9T MXN, 23 years" | Thin dateline + 3 anchor stats (current header — **keep**) | Setup; reader orientation |
| §1 | `lede` | Hallazgo · Sector Líder | Dynamic editorial lede (top-risk sector named, with Agricultura caveat) | `FeaturedFinding` (current — **keep**, slim deck) | One-sentence thesis with a name |
| §2 | `treemap` | La Distribución · Dónde va el dinero | "El gasto público no es uniforme" / "Public spend is not uniform" | **HERO 1: Sector Treemap with risk overlay** (new) | Replaces "12 cards in a grid" as the spend-distribution view |
| §3 | `competition-trajectory` | La Competencia · Una década rota | "Diez años cruzando el techo OCDE" / "Ten years past the OECD ceiling" | **HERO 2: Slope chart 2015→2025 of DA% with OECD line** (new) | Replaces both small-multiples grid AND OECDCompetitionDotMatrix; combines time + benchmark in one |
| §4 | `risk-vs-spend` | El Cruce · Riesgo × Gasto | "Dónde el riesgo se vuelve costoso" / "Where risk becomes expensive" | **HERO 3: Beeswarm/scatter — risk × log(spend)** (new) | The "investigation map": the upper-right quadrant is where to look |
| §5 | `cards` | El Catálogo · Los 12 sectores | "Detalle por sector" / "Per-sector detail" | Compact card grid (current `SectorCard` — **slim 50%**) | Reference table; one card = one click into `/sectors/:id` |
| §6 | `footer` | Metodología · v0.8.5 | small-print footnote | Plain text | Provenance |

**WHO/WHAT tab** stays at top of `<main>` (keep current implementation), but the categories view gets its own hero (see §6 of this doc).

---

## 5. Hero Chart Specs

### HERO 1 — Sector Treemap with risk overlay

**One-line idea:** A treemap where rectangle area = `total_value_mxn` and rectangle saturation = `avg_risk_score`. The biggest, reddest rectangle is your investigation lead.

**Inspiration:**
- *FT, "How the world spends its money"* (treemap of global GDP)
- *Pudding, "The Most Expensive Comma in History"* (rectangle hierarchy with story annotations)
- *NYT 2020 Federal Spending* (treemap with hover annotations)

**ASCII sketch:**
```
┌──────────────────────────────────────┐
│ SALUD               │ ENERGÍA        │
│ MX$2.8T             │ MX$1.9T        │
│ ███ critical 28%    │ ██ high 24%    │
│                     │                │
│                     ├────────┬───────┤
│                     │ EDUC.  │ INFRA │
│                     │ MX$1.1T│ MX$0.9│
│                     │██ 19%  │█ 16%  │
├─────────┬───────────┴────────┴───────┤
│ DEFENSA │ HACIENDA │ TEC │ GOB │ AGR │
└─────────┴──────────┴─────┴─────┴─────┘
```

**Encoding:**
- Area: `total_value_mxn` (squarified treemap)
- Fill: `SECTOR_COLORS[code]` at opacity = `0.35 + 0.55 × (avg_risk_score - 0.10)/0.30` clamped [0.35, 0.90]
- Border: 1px `border-border`; `border-amber-500` when `direct_award_pct > 25`
- Label inside: sector name + spend (only if cell > 80×40px)
- Hover: tooltip with all 6 KPIs + "Ver hilo →" link
- Click: `/sectors/:id`

**Annotations:**
- The 3 cells crossing OECD threshold get a small `OCDE ✗` chip in the corner
- An editorial pull-out arrow points to the Agricultura cell with caveat text

**Interactivity:**
- Hover dims other cells to 30% opacity
- Click navigates; right-click "open in new tab" supported
- Keyboard: tab through cells in spend order

**Anti-pattern to avoid:** A generic `recharts` `<Treemap>` with default tooltip and no annotations. We'd be tempted because it's 20 lines of code; the result tells no story. Always render labels + caveats + OECD chips inline.

**Implementation:** `frontend/src/components/sectors/SectorTreemap.tsx`. Use `d3-hierarchy` `treemap()` (already in `package.json` via `@visx/hierarchy` — verify) + custom SVG rather than recharts. Width 100%, height 480px desktop / 360px mobile.

---

### HERO 2 — Slope chart 2015 → 2025: Direct-Award % per sector vs OECD line

**One-line idea:** Twelve thin lines starting at 2015, ending at 2025. The OECD 25% reference is a horizontal cyan dashed line. Sectors above it are labeled at the right edge in their sector color; sectors below are muted gray. The visual story is "how many lines cross the line, and which ones are climbing."

**Inspiration:**
- *FT, "Drug overdose deaths by state"* (slope chart with right-edge labels)
- *Reuters Graphics, "The world's most polluted cities"* (slopes against thresholds)
- *Sigma Awards 2024 finalist "Forever Pollution"* (multi-line over benchmark)
- The Economist's "Daily Chart" slope vocabulary

**ASCII sketch:**
```
50% ┐                                       ╭── Salud
    │                                  ____╱
    │                              ___╱      ╭── Energía
    │                          ___╱      ___╱
40% ┤                      ___╱      ___╱
    │                  ___╱      ___╱        ─ Defensa
30% ┤              ___╱      ___╱     ────────
    │          ___╱      ___╱
25% ┤·····───OECD ceiling·····························  ←cyan dashed
    │      ___              ─── ─── ─── ─── ─── Tecnología
20% ┤  ___╱                                    ─── Hacienda (gray)
    └──┬─────┬─────┬─────┬─────┬─────┬─────┬──→
      2015  2017  2019  2021  2023  2025
```

**Encoding:**
- X: year (2015–2025, 11 points)
- Y: `direct_award_pct` (0–100%)
- Line color: `SECTOR_COLORS[code]` if line ends > 25%; else `text-text-muted` (gray)
- Stroke width: 1.5 default; 2.5 on hover
- Line endpoints: small dot + sector label at right edge (only for >25% sectors; gray sectors get a single muted "+ 4 below ceiling" cluster label)
- Reference line: `#22d3ee` (OECD cyan) horizontal dashed at 25, with "OCDE 25%" label flush right

**Annotations:**
- Vertical band 2020–2021 shaded `bg-amber-500/5` labeled "COVID emergency procurement"
- A small caret-arrow on the steepest-rising sector with "+12pp en 5 años"

**Interactivity:**
- Hover: line jumps to 2.5px, others dim to 0.3 opacity, vertical guideline at year, tooltip shows year + sector + DA% + delta vs 2015
- Click on line: navigates to `/sectors/:id?tab=competition`
- Toggle button "Mostrar todos los 12 / Solo los que cruzan OCDE" (default: only crossers + a phantom average line)

**Anti-pattern to avoid:** A 12-line spaghetti chart (current `SectorRiskTrendPanel`). The fix: gray-out the boring lines and let the story-lines breathe. Tufte's "small differences look small" rule.

**Implementation:** Reuse `EditorialLineChart` from `@/components/charts/editorial` with `emphasis: 'secondary'` for sub-25% sectors and `emphasis: 'primary'` for crossers. Add a horizontal `ReferenceLine` overlay. New file: `frontend/src/components/sectors/CompetitionSlopeChart.tsx`.

---

### HERO 3 — Risk × Spend Beeswarm (the investigation map)

**One-line idea:** Each sector is one circle. X-axis = `avg_risk_score` (0–0.4). Y-axis = `log10(total_value_mxn)`. Circle radius = `total_contracts`. The upper-right quadrant — high risk, high spend, many contracts — is shaded amber and labeled "Investigation priority."

**Inspiration:**
- *Pudding, "The Spotify Audio Aesthetic"* (named-circle scatter)
- *Pudding, "30 Years of American Anxieties"* (annotated scatter with quadrant logic)
- *NYT, "How Much Hotter Is Your Hometown"* (single-axis annotated dot strip — sibling pattern)
- *Bloomberg, "The Bloomberg 50"* (named-bubble layouts)

**ASCII sketch:**
```
  log(spend)
  12T ┤                          ●Salud
      │      ░░░░░░░░░░░░░░░░░░░░░░░░░░
   1T ┤      ░ ●Energía                ░
      │      ░         ●Educación      ░ ← AMBER
 100B ┤      ░  ●Infraestructura       ░    QUADRANT
      │      ░                ●Defensa ░
  10B ┤      ░  ●Tecnología   ●Agric.  ░
      │      ░░░░░░░░░░░░░░░░░░░░░░░░░░
   1B ┤  ●Otros        ●Hacienda
      │           ●Ambiente   ●Trabajo
 100M ┤        ●Gobernación
      └──────┬──────┬──────┬──────┬──────→
            10%    20%    25%    30%   40%
                   risk score → ↑OECD threshold
```

**Encoding:**
- X: `avg_risk_score × 100`
- Y: `log10(total_value_mxn)` with axis labels in MXN (100M, 1B, 10B, 100B, 1T, 10T)
- Radius: `sqrt(total_contracts) × k`, clamp [6, 28]
- Fill: `SECTOR_COLORS[code]` at 0.85 opacity
- Stroke: 1.5px white at 0.6 opacity
- Quadrant: rectangle fill `#f59e0b` at 0.06 opacity covering `risk ≥ 0.20 AND spend ≥ 1B`
- Label: sector name in 11px font-mono, positioned with simple force-directed nudge (or right of circle if no overlap)

**Annotations:**
- Vertical dashed line at risk = 25% (OECD parallel) labeled "OCDE 25%"
- Text label inside quadrant: "PRIORIDAD" / "PRIORITY" — small, rotated 0°, top-right of band
- Caveat callout on Agricultura circle: thin connector line to side note "Score inflated by Segalmex GT case → see /thread/segalmex"

**Interactivity:**
- Hover: circle scales 1.15x, others dim, side panel slides in with 6 KPIs + "Investigar →" CTA
- Click: navigates to `/sectors/:id`
- Keyboard: arrow keys cycle through sectors in spend order

**Anti-pattern to avoid:** A bubble chart with all bubbles the same size and no quadrant logic. The quadrant — the editorial assertion that *this corner is where to look* — is the entire point of the chart. Without it, it's just a dataviz exercise.

**Implementation:** Pure SVG, no recharts. New file: `frontend/src/components/sectors/RiskSpendBeeswarm.tsx`. Use `d3-force` `forceCollide` for label de-overlap if labels collide on small viewports.

---

## 6. The /categories Tab — One Distinctive View

**Current state (L877–L1023):** Editorial lede + a sortable flat list of ~72 categories. Decent lede, but the list doesn't differentiate; it's a spreadsheet rendered in HTML.

**Proposed addition: Category × Sector beeswarm** (one chart, replaces nothing — *adds* visual depth above the list).

**The chart:**
- 72 dots, each = one category
- X-axis: `avg_risk` (0–0.4)
- Y-axis: 12 horizontal swimlanes (one per sector), category dots stacked within their sector lane
- Dot size: `log(total_value)`
- Color: sector color
- Hover: tooltip with category name, value, top vendor
- Click: navigate to `/categories/:id`

This visualizes "which sectors carry many small high-risk categories vs few large low-risk ones." Salud's lane will have a long tail to the right (many high-risk medicine categories). Hacienda's lane will be short and centered.

**Inspiration:** *Pudding, "Where Slang Comes From"* (swimlane scatter); *NYT, "Extensive Data Shows Punishing Reach of Racism"* (stacked beeswarm by group).

**Then keep the ranked list** (current L944) below it as the reference table. The list is good; it just needs a chart on top to give it context.

---

## 7. The Cut List

| Block | Lines | Action | Justification |
|---|---|---|---|
| `RiskRankingStrip` | 649–697, 1126 | **DELETE** | Same data as small-multiples + treemap. Three rankings is two too many. |
| `SectorSmallMultiples` | 398–559, 1082 | **DELETE** | Replaced by Hero 2 (slope chart). Small multiples are good but they don't show the OECD threshold, which is the editorial story. |
| `OECDCompetitionDotMatrix` | 287–391, 1099 | **DELETE** | Folded into Hero 2 (the slope chart shows current DA% as the right endpoint of each line + OECD line as reference). |
| `SectorRiskTrendPanel` | 564–643, 1121 | **DELETE** | Top-6 spaghetti chart; merged into Hero 2 which shows all 12 with editorial gray-out. |
| `SectorModelCoefficients` invocation | 1199–1242 | **MOVE to /methodology** | Per-sector model intercepts/coefficients are an analytical view, not an exploration view. Belongs in methodology or `/sectors/:id`. |
| `SectorConcentrationChart` | 1247–1251 | **MOVE to /sectors/:id** | Generic concentration chart with no editorial frame on the index page. Belongs per-sector. |
| Sort dropdown | 246–284, 1141 | **REPLACE** with single canonical sort + invisible filter | 4 sort options is decision paralysis. Default sort = "value". Add a `?sort=` URL param for power users; remove the visible chooser. |
| `SectorCard` second `MiniRiskField` (full width) | 161–169 | **DELETE** | The 88px sparkline at L143 already shows this distribution. The 320px version below is pure redundancy. |
| Card footer "Explorar →" link | 196–202 | **DELETE** | Entire card is `<Link>`. The footer is decorative noise. |
| Card OECD ✓/✗ chip | 126–128 | **KEEP but smaller** | Useful, but currently competing with the risk pill for attention. Move to a 6×6 dot indicator. |

**Total LOC removed:** ~470 LOC (-37%). Plus three new components added: ~520 LOC. **Net: roughly even**, but the page tells a story.

---

## 8. Implementation Order — 5 Phases

Each phase is a single PR, independently shippable, behind no feature flag.

### **Phase 1 — Subtraction (PR-sized, 1 day)**
> *Lowest risk, highest immediate value. Removes redundancy without adding anything.*
- DELETE `RiskRankingStrip` component + invocation
- DELETE second `MiniRiskField` from `SectorCard`
- DELETE card footer "Explorar →"
- MOVE `SectorModelCoefficients` to `/sectors/:id` (already lives there? — verify; if yes, just delete here)
- MOVE `SectorConcentrationChart` to `/sectors/:id` (same)
- Replace sort dropdown with single canonical sort (`total_value_mxn`) + `?sort=` URL param
- **Commit:** `refactor(sectors P1): remove 4 redundant blocks, consolidate sort`
- **Acceptance:** Page renders, all info still discoverable, ~280 fewer LOC.

### **Phase 2 — Hero 2: Competition Slope Chart (1.5 days)**
> *Replaces two existing charts with one better one.*
- Build `frontend/src/components/sectors/CompetitionSlopeChart.tsx`
- Wire to `sectorApi.getTrends()` for all 12 sectors via `useQueries`
- Add gray-out logic for sub-25% sectors
- Add OECD reference line, COVID band annotation, +Δpp callout
- DELETE `SectorSmallMultiples`, `OECDCompetitionDotMatrix`, `SectorRiskTrendPanel`
- **Commit:** `feat(sectors P2 § 3): competition slope chart 2015-2025`
- **Acceptance:** One chart shows trajectory + OECD threshold + named outliers.

### **Phase 3 — Hero 1: Sector Treemap (2 days)**
> *The signature visualization. Replaces the 12-card grid as the dominant visual.*
- Build `frontend/src/components/sectors/SectorTreemap.tsx`
- Use `d3-hierarchy` (verify dep) for squarified treemap
- Risk-saturation overlay, OECD chips, hover tooltips, click navigation
- Keep the card grid below treemap as the reference catalog (smaller, denser)
- **Commit:** `feat(sectors P3 § 2): sector treemap with risk saturation`
- **Acceptance:** Spend distribution + risk readable in one glance.

### **Phase 4 — Hero 3: Risk × Spend Beeswarm (1.5 days)**
> *The investigation map. Pure additive value.*
- Build `frontend/src/components/sectors/RiskSpendBeeswarm.tsx`
- Quadrant shading, OECD line, label de-overlap
- Agricultura caveat callout
- **Commit:** `feat(sectors P4 § 4): risk-vs-spend beeswarm investigation map`
- **Acceptance:** Upper-right quadrant labeled "PRIORIDAD" and Salud is in it.

### **Phase 5 — /categories Beeswarm (1 day)**
> *Polish the WHAT tab.*
- Build `frontend/src/components/sectors/CategorySectorBeeswarm.tsx`
- Swimlane scatter, 12 sector lanes, 72 category dots
- Insert above existing ranked list
- **Commit:** `feat(sectors P5 § 6): categories x sectors beeswarm`
- **Acceptance:** /categories has a hero chart, list is preserved.

**Total: ~7 working days, 5 PRs, each independently shippable.**

---

## 9. Editorial Copy

### Page hero (header — keep current pattern, refresh text)
- **Title (ES):** "Los 12 sectores"
- **Title (EN):** "The 12 Sectors"
- **Kicker:** `RUBLI · Panorama Sectorial · COMPRANET 2002–2025 · v0.8.5`
- **Subtitle (ES):** "9.9 billones de pesos en 3.06 millones de contratos federales. Doce sectores. Doce patologías distintas."
- **Subtitle (EN):** "9.9 trillion pesos across 3.06 million federal contracts. Twelve sectors. Twelve distinct pathologies."

### Section § kickers (Spanish primary, English fallback via i18n)
- §2 Treemap: `LA DISTRIBUCIÓN · DÓNDE VA EL DINERO`
- §3 Slope: `LA COMPETENCIA · UNA DÉCADA CRUZANDO EL TECHO OCDE`
- §4 Beeswarm: `EL CRUCE · DÓNDE EL RIESGO SE VUELVE COSTOSO`
- §5 Catálogo: `EL CATÁLOGO · LOS 12 SECTORES EN DETALLE`
- §6 (categories): `LO QUE EL ESTADO COMPRA · 72 CATEGORÍAS`

### Dateline format
`COMPRANET · 2002–2025 · v0.8.5 · HR 11.0% · Test AUC 0.785`
Render in mono `text-[10px] uppercase tracking-[0.15em] text-text-muted` under the page title.

### Risk-language guardrails (already enforced, repeat for clarity)
- Always say "indicador de riesgo" / "risk indicator"
- Never say "X% probability of corruption"
- Use `getRiskLevelFromScore()` thresholds (0.60/0.40/0.25); no inline ladders
- No green for low risk — use `text-text-muted`

### Required caveat (must persist)
The Agricultura/Segalmex caveat at L1064–L1076 stays. It is the platform's honest disclosure and survives the redesign verbatim. Move it next to the Agricultura cell on the treemap and beeswarm as a connector callout, in addition to keeping it after the lede.

---

## 10. Constraints Checklist (must verify before each PR)

- [ ] `npx tsc --noEmit` from `frontend/` → 0 errors
- [ ] `npm run build` from `frontend/` → 0 errors
- [ ] `npm run lint:tokens` → 0 violations (no raw `text-red-400`, no `bg-emerald-*`, no inline hex outside SECTOR/RISK_COLORS lookups)
- [ ] All entity references use `<EntityIdentityChip>` (not raw `<Link>`)
- [ ] All risk thresholds via `getRiskLevelFromScore()`
- [ ] All vendor names via `formatVendorName` / `formatEntityName`
- [ ] Spanish § kickers present on every section
- [ ] Risk model in copy = `v0.8.5`. Audit `frontend/src/locales/{es,en}/sectors.json` for stray `v0.6.5` strings.
- [ ] No green for low risk
- [ ] Agricultura caveat preserved

---

## 11. Open Questions for the Engineer

1. Is `d3-hierarchy` already a dep, or do we need to add `@visx/hierarchy`? (Check `package.json`.) Recommendation: prefer `@visx/hierarchy` if visx is already in tree; else `d3-hierarchy` (12KB).
2. Does `sectorApi.getTrends()` return DA% per year, or only risk score per year? Hero 2 needs DA%-per-year. If missing, need a backend endpoint or augmented response. Verify and surface as a blocker for Phase 2 if absent.
3. The current i18n key `riskFactors.title` may still reference v0.6.5 — grep `frontend/src/locales/` for `v0.6.5` and `v6.5` and replace before merging Phase 1.

---

*"Twelve sectors. One map. Every chart pays rent."*
