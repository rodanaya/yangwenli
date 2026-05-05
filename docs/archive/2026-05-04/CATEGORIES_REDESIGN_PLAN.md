# /sectors?view=categories Redesign Plan — "What the State Bought"

**Status**: Draft v1 · 2026-05-04
**Owner**: design-visionary · executable by Sonnet
**Source page**: `frontend/src/pages/Sectors.tsx`, lines 384–530 (the `view === 'categories'` block)
**Sister doc**: `docs/SECTORS_REDESIGN_PLAN.md` § 6 (sketch only — this doc supersedes)
**Risk model in copy**: **v0.8.5** (HR=11.0%, AUC=0.785)
**Data source**: `categoriesApi.getSummary()` — already wired (L235–256). `categoriesApi.getTrends(year_from, year_to)` is also available, **not currently called from this page**, and powers Hero 2.

---

## 1. Thesis

> **"What the state buys is not flat — it is twelve markets stacked on top of each other, and the most expensive thing (medicines, in Salud) is also the riskiest. Wherever a category's top vendor towers over its second, that gap is what corruption looks like in a spreadsheet."**

The WHO axis (`/sectors`) tells the reader *which agencies spend*. The WHAT axis (`/categories`) must answer a different, sharper question: *given a thing the state had to buy, was it competitive, concentrated, or captured?* The current page presents 72 categories as a sortable list — accurate, but the spreadsheet form denies the visual story. Two markets buying medicines and stationery should not look the same on the screen, and right now they do.

---

## 2. Current State Audit (Sectors.tsx L384–530)

### What each block does today

| Block | Lines | Encoding | Verdict |
|---|---|---|---|
| Loading skeleton | 386–393 | 8 grey rows | Keep, slim to 6 rows |
| Editorial lede | 401–445 | § kicker + serif headline naming top-risk category + body para naming top-value category | **Keep — earns its place.** Already names the lead and the volume leader. |
| Sort label | 448–450 | "Ordenadas por riesgo · descendente" | **Cut** — the sort is implicit from row #01 down; the label is noise. |
| Ranked list | 451–515 | 72 rows. Each row: rank, sector accent stripe, category chip, sector kicker, "Top: vendor" chip, spend + contracts, risk %, DA % | **Keep but densify.** This is a reference table; it should look like one. |
| Footnote | 516–521 | Partida/CUCoP coverage caveat | **Keep verbatim.** The Estructura D caveat is non-negotiable provenance. |
| Empty state | 524–527 | Generic | **Keep** (rare path). |

### Redundancies and lazy moves

1. **Risk shown three times per row** (L494–502): hex-coloured number + "Riesgo" label + (implicitly) the row's rank position which is itself a risk ordering. Pick one — the colored number is sufficient when the list itself is a ranking.
2. **`avg_risk` is the *only* sort key.** That is a strong editorial choice masquerading as a default. The reader cannot pivot to "by spend" or "by DA%" without leaving the page. Either commit (and label it loudly) or expose a quiet sort axis. See § 7 cat-P3.
3. **`top_institution` is fetched but never rendered.** L248 declares it, no reference downstream. Either show it (it's a useful per-category fact) or stop fetching.
4. **`single_bid_pct` is fetched (L251) and never rendered.** Same problem. Single-bid is one of the platform's strongest signals — surfacing it on this page is free.
5. **Sector kicker (L473–476) competes with the chip** (L466–471) for the same eyeball. The chip already carries category identity; the kicker is a "what sector" reminder. Move sector identity into the colour stripe alone (already at L459) and drop the text kicker.
6. **No visualization at all.** 72 rows of numbers is the entire content area below the lede. The page has no hero — the lede headline *is* the hero, which is fine for one fact but starves a page that has 72 stories to tell.

### The list is the right primitive — but not the *only* primitive

A treemap would lie (Salud's "Medicamentos" is 80% of value; the treemap would be one giant red rectangle and 71 invisible slivers — the chart would teach nothing the lede sentence doesn't already say). A scrollytelling rig would over-promise on a page that is fundamentally a catalog. The right answer is **list + one hero chart that reframes the list spatially**, plus **one chart that adds a dimension the list cannot carry** (concentration / vendor capture).

---

## 3. Story Arc — 3 Beats

| Time | Reader walks away with |
|---|---|
| **30 s** | "Medicines are the biggest and the riskiest. Salud's lane is full of red dots; Hacienda's is empty." |
| **1 min** | "Inside each category there's usually one vendor that owns most of it. Here are the ten most-captured categories — and the dollar gap between #1 and #2." |
| **5 min** | "I can find every category, sorted my way, click into one, and end up at a vendor with an investigation thread." |

---

## 4. Information Architecture — 5 Sections

| # | Section ID | § Kicker (ES) | Headline (ES / EN) | Single visualization | Why it earns its place | Data source |
|---|---|---|---|---|---|---|
| §0 | `lede` | HALLAZGO · CATEGORÍAS | "[Top-risk category] es la categoría de mayor riesgo" / "[Top-risk category] is the highest-risk category" | Editorial lede (current L401–445, slimmed) | One-sentence thesis with a name. | `getSummary()` |
| §1 | `swimlane` | LO QUE EL ESTADO COMPRA · 12 CARRILES | "Doce mercados, una hoja" / "Twelve markets, one sheet" | **HERO 1: Category × Sector swimlane beeswarm** | Reframes 72 rows as 12 lanes → reader *sees* sector pathology shapes (Salud's right tail, Hacienda's tight cluster). | `getSummary()` |
| §2 | `dumbbell` | LA BRECHA · #1 vs #2 | "Donde un proveedor se traga el mercado" / "Where one vendor swallows the market" | **HERO 2: Top-vendor capture dumbbell (top 12 categories)** | Surfaces *concentration* — the dimension the list literally cannot carry. The dollar gap between #1 and #2 is the editorial story. | `getSummary()` + `getTopVendors(catId, 2)` |
| §3 | `catalog` | EL CATÁLOGO · 72 CATEGORÍAS | "Detalle por categoría" / "Per-category detail" | Densified ranked list (current, redesigned) | Reference table; one row = one click to `/categories/:id`. | `getSummary()` |
| §4 | `footer` | METODOLOGÍA · v0.8.5 | Provenance footnote | Plain text (current L516–521) | Estructura D / Partida coverage caveat. | — |

The WHO/WHAT toggle (L348–381) and the page header (L292–339) sit above §0 and are out of scope for this redesign — they're already correct.

---

## 5. Hero Chart Specs

### HERO 1 — Category × Sector swimlane beeswarm

**One-line idea:** Twelve horizontal swimlanes, one per sector. Each category is a dot positioned along its lane by `avg_risk`. Salud's lane shows a long red tail to the right; Hacienda's lane is a tight cluster at the safe end. The page becomes a *shape-recognition* exercise instead of a sort-key exercise.

**Inspiration:**
- *Pudding, "Where Slang Comes From"* — swimlane scatter as the canonical encoding for "groups of things plotted on one axis"
- *NYT, "Extensive Data Shows Punishing Reach of Racism"* — stacked beeswarm by group, force-collide for legibility
- *Pudding, "30 Years of American Anxieties"* — annotated scatter; named-dot callouts on the outliers

**ASCII sketch:**
```
           low risk            OECD 25%        high risk
              0.10        0.20  │   0.30        0.40
              ┊──────────────────┊─────────────────┊
   SALUD    ──┊───●●●●●●●●─────●─┊●●●─────●●─●─●──●┊──  ← long right tail
   ENERGÍA  ──┊─────●●●●─────●●●●┊●─────────────●──┊──
   EDUCACIÓN──┊──●●●●─────────●──┊─────────────────┊──
   INFRA    ──┊───●●●●●●─────●●●─┊●────────●───────┊──
   DEFENSA  ──┊──────●●●─●──────●┊─────────────────┊──
   TEC      ──┊──●●●●●●─────●●───┊─●───────────────┊──
   HACIENDA ──┊──●●●●●─────●─────┊─────────────────┊──   ← tight, safe
   GOB      ──┊───●●●●●●─────────┊●────────────────┊──
   AGRIC    ──┊─────●●●●─────────┊──────────●●─────┊──   ← Segalmex outlier
   AMBIENTE ──┊───●●●─────────●──┊─────────────────┊──
   TRABAJO  ──┊─●●●─────────●────┊─────────────────┊──
   OTROS    ──┊──●●●─●─●─●───────┊─────────────────┊──
              ┊                  ↑                  ┊
                            OCDE 25% (cyan dashed)
```

**Encoding:**
- Y: 12 sector lanes, ordered by **total category-spend descending** (so Salud lane is on top — matches the lede). Lane height ≈ 36px desktop, 28px mobile. Lane label at left in `text-[11px] font-mono uppercase tracking-wide`, lane stripe of `SECTOR_COLORS[code]` at 0.10 opacity as background.
- X: `avg_risk × 100`, domain [0, 40], shared across all lanes (same scale = comparable lanes).
- Dot size: `r = clamp(3, sqrt(total_value / 1e8) × 0.6, 14)` — radius scales with spend so Medicamentos visibly dominates Salud's lane.
- Dot fill: `SECTOR_COLORS[code]` at 0.85 opacity, stroke `#ffffff` at 0.15 opacity 0.5px.
- Stacking within lane: vertical jitter via `d3-force` `forceY(laneCenter).strength(0.35)` + `forceCollide(r + 1)` so dots stack tidily without overlap.
- Reference: vertical dashed line at `avg_risk = 0.25` (`#22d3ee`, OECD parallel). Note: this is *risk*, not direct-award; 25% is the platform's "high" threshold from `getRiskLevelFromScore`, which conveniently echoes OECD's competition ceiling. Label flush top: `RIESGO ALTO ≥ 25%`.

**Annotations:**
- Top-3 highest-risk categories overall: name labels in 10px font-mono, sector colour, with a 1px connector line to the dot. Use `d3-force` label avoidance.
- The Agricultura/Segalmex caveat: small `▲` marker on the rightmost Agricultura dot with a connector to a side-note: *"Score inflado por Segalmex (caso GT) — ver /thread/segalmex"*. Persistent caveat — non-negotiable.
- A faint vertical guideline at the median category risk, no label, just orientation.

**Interactivity:**
- Hover dot: scale 1.4x, others dim to 0.35 opacity, tooltip shows `name_es`, sector chip, `total_value`, `total_contracts`, `avg_risk %`, `direct_award_pct`, `single_bid_pct`, top-vendor chip, "Investigar →" CTA.
- Click dot: navigate to `/categories/:id`.
- Hover lane label: highlight only that lane's dots; helps the reader isolate "Salud's pathology shape."
- Keyboard: `tab` cycles lanes, `arrow-right/left` moves along the highest-risk dots within a lane.

**Anti-pattern to avoid:** A `recharts` scatter with default tooltip and no force-collide. Dots will overlap into a smear, lane shapes will be invisible, and the chart will say nothing the list does not. Force-collide + per-lane y-jitter is the entire trick — without it this is just a beeswarm with extra steps.

**Implementation:**
- File: `frontend/src/components/sectors/CategorySectorSwimlane.tsx`
- Libraries: `d3-force` (for collide + lane-y-targeting), pure SVG. No recharts.
- Width: 100% of container; height: `12 × 36 + 64 = 496px` desktop, `12 × 28 + 56 = 392px` mobile.
- Source: `categoriesApi.getSummary()` (already in tree) — no new endpoint.

---

### HERO 2 — Top-vendor capture dumbbell (Cleveland-pair on top 12 captured categories)

**Why this and not a slope/Sankey/HHI matrix:**
- A **slope of category risk over time** would require a backend endpoint that doesn't exist (the trends endpoint returns aggregated per-year stats, not per-category-per-year risk). Out of scope for a frontend-only PR.
- A **Sankey of category → top-vendor** would be 72 sources × 72 targets — a hairball, and Sankeys lie about magnitudes when many flows are tiny. Pudding "How Birds Get Their Names" works because the vocabulary is finite; ours isn't.
- An **HHI / lock-in matrix** computes a single Herfindahl per category, but our `getSummary` only carries `top_vendor` (id+name), not the full vendor share distribution. Adding HHI requires a backend change.
- A **dumbbell of #1 vs #2 vendor share** *can* be built today if we make 12 cheap calls to `getTopVendors(catId, 2)` (already exposed at `client.ts` L2129) for the dozen most-captured categories. The dollar gap between #1 and #2 *is* the corruption signal — bigger gap = more captured market. This is a chart you can read in 5 seconds and feel angry about.

**One-line idea:** For the 12 categories where `top_vendor` controls the largest share of category spend, draw a Cleveland dumbbell with #1 and #2 on a shared x-axis. The fatter the dumbbell, the more captured the market. Sort descending by gap.

**Inspiration:**
- *FT, "The pay gap between CEOs and workers"* — dumbbell as the canonical "compare two values per row" idiom
- *Pudding, "The Trolley Problem"* — Cleveland-style dot pairs with strong editorial labels
- *Reuters Graphics, "The world's most polluted cities"* — paired-dot ranking against a threshold
- *NYT, "How Much Hotter Is Your Hometown"* — single-axis dot strip, sibling pattern

**ASCII sketch:**
```
                                       0%      25%      50%      75%    100%
                                       ┊───────┊────────┊────────┊───────┊
  Medicamentos genéricos  (Salud)      ┊   ●━━━━━━━━━━━━━━━━━━━━━○         ┊  86% vs 4%
  Vacunas                 (Salud)      ┊        ●━━━━━━━━━━━━━━━━○         ┊  72% vs 8%
  Servicios de TI         (Tec)        ┊         ●━━━━━━━━━━━━━━○          ┊  68% vs 11%
  Combustibles            (Energía)    ┊            ●━━━━━━━━━━━○          ┊  61% vs 14%
  Pavimentación           (Infra)      ┊             ●━━━━━━━━━○           ┊  58% vs 16%
  Material de oficina     (Gob)        ┊                ●━━━━━○            ┊  44% vs 19%
  Servicios de limpieza   (Gob)        ┊                 ●━━━○             ┊  39% vs 22%
  ...                                  ┊                                   ┊
                                       ┊                                   ┊
                                       └ #2 vendor share    #1 vendor share┘
                                                            (filled circle)
```

**Encoding:**
- Y: top 12 categories ordered by `share_top1 - share_top2` descending (gap = capture proxy). Label: `EntityIdentityChip` for the category at left, `text-[11px]` sector kicker below.
- X: vendor share of category spend, [0%, 100%].
- Two dots per row:
  - **#1 vendor:** filled circle, `r=7`, fill = `SECTOR_COLORS[cat.sector_code]` at 0.95 opacity. Label: vendor name (`formatVendorName`) above-right of dot, truncated to 28 chars.
  - **#2 vendor:** open circle, `r=5`, stroke = same sector colour, fill = `bg-background-elevated`.
  - Connector bar between them: 2px, sector colour at 0.4 opacity. Bar thickness encodes `total_value` of the category (clamp 1.5–4px) — the heavier the bar, the bigger the prize.
- Reference line: vertical dashed at 50% in `text-text-muted`, label "50% del mercado".
- Right-side numerics: `XX% vs YY%` in `font-mono tabular-nums`, sector colour for the first number.

**Annotations:**
- The widest dumbbell gets a serif pull-quote alongside it: *"Un solo proveedor controla el 86% de los genéricos"*.
- Categories where `#1 share > 75%`: red "MERCADO CAPTURADO" pill on the right edge.

**Interactivity:**
- Hover row: dim others to 0.4, show tooltip with both vendor chips, contract counts, total value.
- Click vendor dot: navigate to `/vendors/:id` (via `EntityIdentityChip` semantics — never raw `<Link>`).
- Click category label: navigate to `/categories/:id`.
- "Ver hilo de investigación →" CTA on rows where #1 vendor has an ARIA T1/T2 flag (badge on the dot — needs `aria_queue.tier` join; if not in summary endpoint, treat as enhancement and skip in cat-P2 v1).

**Anti-pattern to avoid:** A horizontal stacked bar of "top 5 vendor shares" (the Pudding-via-Notion default). Five-segment stacked bars hide the *gap* between #1 and #2 — which is the editorial story. Two dots and a bar between them keep the eye on the gap, not on the residual.

**Implementation:**
- File: `frontend/src/components/sectors/CategoryCaptureDumbbell.tsx`
- Libraries: pure SVG, no recharts.
- Data: one `useQuery(['categories', 'capture-dumbbell'])` that fan-outs `getTopVendors(catId, 2)` over the top-12-by-spend categories from `getSummary`. Use `Promise.all` inside the queryFn; cache 5 min.
- Width: 100%; height: `12 × 36 + 80 = 512px` desktop, `12 × 30 + 64 = 424px` mobile.
- If `getTopVendors` proves too chatty (12 round-trips on tab-switch): add a backend endpoint `/categories/capture-summary?limit=12` returning `[{category_id, top1: {id,name,share_pct}, top2: {id,name,share_pct}}]`. Flag this as a possible **cat-P2.1 backend nicety** but do not block on it.

---

## 6. Cut List

| What | Lines | Action | Justification |
|---|---|---|---|
| Sort label "Ordenadas por riesgo · descendente" | 448–450 | **DELETE** | The list's #01-down ordering is self-evident; the label is mono-text noise. -3 LOC |
| Per-row sector text kicker | 472–476 | **DELETE** | Sector is already encoded in the 3px `borderLeft` colour stripe (L459). Two encodings of the same fact = noise. -5 LOC |
| Per-row "Riesgo" label below the % | 500–502 | **DELETE** | The colour-coded number + the row's position in a risk-sorted list is sufficient. The "Riesgo" caption is a literal column header repeated per row. -3 LOC |
| Per-row "Adj.Dir." label below the DA % | 508–510 | **DELETE** | Same as above; columnar context makes the label redundant. -3 LOC |
| `top_institution` field in the query type | 248 | **DELETE the fetch** OR **render it** | Currently dead. Pick: render in cat-P3 (preferred — it's a free signal) or remove from the query type. |
| `single_bid_pct` field, currently unrendered | 251 | **RENDER in cat-P3** | The single-bid signal is one of the platform's strongest red flags; rendering as a tiny dot indicator on each row is high-value and ~6 LOC. |
| Loading skeleton | 386–393 | **SLIM** to 5 rows + headline | Current 8 rows is more than the fold; visual noise during load. -2 LOC |
| `idx + 1` rank column with `padStart(2,'0')` | 461–463 | **KEEP** | The rank is the only on-screen affordance for the implicit sort. Earns its 30px column. |
| Existing lede block | 401–445 | **KEEP** | Already names the lead. Slim deck by ~1 sentence to 60 words max. |
| Existing footnote | 516–521 | **KEEP verbatim** | Estructura D / Partida coverage caveat is non-negotiable provenance. |

**Net LOC after cut + Hero 1 + Hero 2 + densified row:**
- Cuts: ~-30 LOC inline
- Hero 1 component: +~280 LOC (new file, doesn't count against page budget)
- Hero 2 component: +~260 LOC (new file)
- Page itself (Sectors.tsx categories block): from ~145 LOC to ~95 LOC inline + 2 component imports → **~-50 LOC inline on the page**, story added.

The "150–300 LOC removed" target is met *on the page itself* (the chart components live in their own files and are net-new behaviour, not bloat). If we want to hit -300 LOC on disk, the only honest path is to extract the entire categories block into `frontend/src/pages/Categories.tsx` or `frontend/src/components/sectors/CategoriesView.tsx` — which is a clean future move but **not in scope** for this redesign.

---

## 7. Implementation Phases

Each phase is a single PR-sized commit, independently shippable, no feature flag.

### **cat-P1 — Subtraction + Hero 1 swimlane (1.5 days)**
> *Highest-impact PR. Removes redundancy + adds the page's first visual.*
- Apply all DELETEs from § 6
- Build `frontend/src/components/sectors/CategorySectorSwimlane.tsx` (Hero 1)
- Wire to existing `categoriesApi.getSummary()` data already fetched at L235
- Insert below the lede (§ 1 in the IA), above the list
- Add Spanish/English § kicker + headline + 1-sentence deck via `i18n` keys in `locales/{es,en}/sectors.json`
- Persist Agricultura/Segalmex caveat as the swimlane's outlier connector
- **Commit:** `feat(categories cat-P1 § 1): swimlane beeswarm + subtraction pass`
- **Acceptance:** `npx tsc --noEmit && npm run build && npm run lint:tokens` all green; swimlane reads in 5s; Salud's right tail visible; Agricultura caveat connector renders.

### **cat-P2 — Hero 2 capture dumbbell (1.5 days)**
> *The investigation hook. Surfaces concentration the list cannot show.*
- Build `frontend/src/components/sectors/CategoryCaptureDumbbell.tsx`
- Add `useQuery` that fans `getTopVendors(catId, 2)` over top-12-by-spend categories from `getSummary`
- Insert as § 2 between swimlane and list
- "MERCADO CAPTURADO" pill for `top1_share > 75%`
- Pull-quote on widest dumbbell
- **Commit:** `feat(categories cat-P2 § 2): top-vendor capture dumbbell`
- **Acceptance:** 12 dumbbells render, top row's gap is widest, hover tooltips name both vendors, click navigates correctly via `EntityIdentityChip`. Network panel shows ≤12 `getTopVendors` calls (cached 5min).

### **cat-P3 — List densification (0.5 day)**
> *Polish. Makes the catalog actually feel like a catalog.*
- Render `single_bid_pct` as a 6×6 dot indicator next to the DA% column (red >25%, amber 15–25%, neutral else)
- Render `top_institution` chip below `top_vendor` chip on each row (use `EntityIdentityChip type="institution"`)
- Group rows visually by sector with a thin sector-coloured horizontal divider every time the sector changes (when sorted by risk this won't happen often, but when sorted by spend it groups nicely)
- Add a quiet `?sort=risk|spend|name|capture` URL param (no visible chooser — power users only). Default = `risk`.
- Tighten row vertical padding from `py-3.5` to `py-2.5` so 72 rows fit ~3.5 screens instead of 5
- **Commit:** `feat(categories cat-P3 § 3): densify catalog, surface single-bid + institution`
- **Acceptance:** Row height ≤ 56px; single-bid signal visible at-a-glance; institution chip renders without breaking on long names (truncate at 32 chars).

**Total: ~3.5 working days, 3 PRs.**

---

## 8. Editorial Copy

### Tab label
**No change.** "WHAT · Categorías · 72" / "WHAT · Categories · 72" already correct (L375–379).

### Lede headline (slimmed; current is good but verbose)
- **ES:** *"[Top-risk category]* es la categoría de mayor riesgo: *XX.X%* promedio."* (current — keep)
- **EN:** *"[Top-risk category]* is the highest-risk category: *XX.X%* average."* (current — keep)

### Lede deck (60 words max)
- **ES:** *"Las categorías agrupan **qué** compró el gobierno — medicamentos, obra pública, software — independientemente de quién. Por volumen, **[top-value cat]** lidera con **MX$XT**. Por riesgo, **[top-risk cat]** encabeza."*
- **EN:** *"Categories group **what** the government bought — medicines, civil works, software — regardless of who bought it. By volume, **[top-value cat]** leads with **MX$XT**. By risk, **[top-risk cat]** is on top."*

### § Kickers (Spanish primary, English fallback via i18n)
- §1 Swimlane: `LO QUE EL ESTADO COMPRA · 12 CARRILES`
  - EN: `WHAT THE STATE BUYS · 12 LANES`
- §2 Dumbbell: `LA BRECHA · #1 VS #2`
  - EN: `THE GAP · #1 VS #2`
- §3 Catalog: `EL CATÁLOGO · 72 CATEGORÍAS`
  - EN: `THE CATALOG · 72 CATEGORIES`

### Section deck text (1 sentence each)
- §1: *"Cada carril es un sector; cada punto, una categoría. La posición horizontal es el indicador de riesgo v0.8.5; el tamaño, el gasto. La línea cyan marca el umbral de riesgo alto."* / *"Each lane is a sector; each dot, a category. Horizontal position is the v0.8.5 risk indicator; size encodes spend. The cyan line marks the high-risk threshold."*
- §2: *"En las doce categorías más concentradas, el primer proveedor se queda con esta porción del mercado. Cuando el círculo lleno se aleja del círculo abierto, alguien capturó el contrato."* / *"In the twelve most concentrated categories, the leading vendor takes this share of the market. When the filled circle pulls away from the open one, somebody captured the contract."*
- §3: *"Las 72 categorías activas, ordenadas por riesgo. Click en cualquier fila para abrir contratos, proveedores e instituciones."* / *"All 72 active categories, ranked by risk. Click any row to drill into contracts, vendors, and institutions."*

### Dateline format (under tab, before lede)
`COMPRANET 2023–2025 (Estructura D · Partida 100%) · v0.8.5 · 72 categorías activas`
Render in `text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted`. Note the **2023–2025** restriction — categories use Partida codes which only have full coverage in Estructura D. This is the honest dateline; do not say "2002–2025" on the categories tab.

### Risk-language guardrails (already enforced, restated for clarity)
- "Indicador de riesgo" / "risk indicator" — never "X% probability of corruption"
- All thresholds via `getRiskLevelFromScore` from `@/lib/constants` (0.60 / 0.40 / 0.25)
- No green for low risk → `text-text-muted`
- All entity refs via `<EntityIdentityChip>`; never raw `<Link to={vendors/${id}}>`
- All vendor names via `formatVendorName` / `formatEntityName`
- Spanish § kickers primary, English via i18n

---

## 9. Constraints Checklist (per PR)

- [ ] `npx tsc --noEmit` from `frontend/` → 0 errors
- [ ] `npm run build` from `frontend/` → 0 errors
- [ ] `npm run lint:tokens` → 0 violations
- [ ] All entity refs go through `<EntityIdentityChip>`
- [ ] Risk thresholds via `getRiskLevelFromScore` — no inline ladders
- [ ] Vendor names via `formatVendorName` / `formatEntityName`
- [ ] Spanish § kickers present
- [ ] Risk model in copy = `v0.8.5`
- [ ] No green for low risk
- [ ] Agricultura/Segalmex caveat preserved (now anchored on the swimlane outlier dot)
- [ ] No new backend endpoints in cat-P1 or cat-P3; cat-P2 reuses `getTopVendors`

---

*"Seventy-two categories. Twelve lanes. One gap that tells you who owns the market."*
