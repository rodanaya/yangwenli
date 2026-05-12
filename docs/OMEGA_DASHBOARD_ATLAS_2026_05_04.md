# OMEGA — Dashboard & Atlas Graphics Enhancement (2026-05-04)

> *"The best dashboard isn't a list of things. It's a single argument the
> reader cannot escape."*

## Purpose & scope

The user opened RUBLI's `/dashboard` and `/atlas`, reviewed each surface
against [Pudding.cool's](https://pudding.cool) editorial vocabulary, and
flagged six specific UI elements where the data is real but the
**presentation is generic**. Charts that should *argue* are decorating.
Numbers that should land are floating. Languages that should mirror are
falling back to English-only labels stamped onto Spanish copy.

This plan executes one **omega cycle**: for each of the six elements,
audit the present state, name a Pudding piece that solves a similar
problem, and ship a redesign that reuses the platform's existing
primitives (no new libraries, no new endpoints).

The constraint is **bilingual ES + EN parity for every label**. The model
in copy is **v0.8.5**. The risk colors come from `RISK_COLORS`. Sector
text colors come from `SECTOR_TEXT_COLORS`. Currency goes through
`formatCompactMXN`. Entity references go through `EntityIdentityChip`.
The constellation engine itself is sacred — only its **lens metadata,
labels, and decorations** are subject to redesign.

## Thesis

Three sentences:

1. The dashboard already has the data — *what* the platform sees, *how
   much* peso it represents, *who* is responsible — but every graphic
   currently stops at the threshold of *argument*; the eye reads
   "interesting visualization" before it reads "this is the finding".
2. Pudding.cool's house style, across pieces from "30 Years of American
   Anxieties" to "The Trolley Problem", is to **annotate aggressively**:
   named callouts ride alongside the encoded geometry so the chart
   *reads first* as a sentence and only later as data.
3. The omega cycle ships six small, defensible redesigns — each tied to
   a specific Pudding piece by name, each with bilingual parity, each
   reusing existing RUBLI primitives — turning the dashboard from a
   data inventory into a **stack of arguments**.

---

## Audit summary — what I found

### Top three readability / bilingual failures

1. **`MacroArc` says OECD ceiling = 30%, but the rest of the platform
   uses 25%.** The Sectors page, ReportCard, YearInReview, and AtlasMap
   all benchmark against `OCDE 25%` (see
   `frontend/src/i18n/locales/es/sectors.json` line 286 and 12 other
   call sites). MacroArc on the dashboard, plus three story chapters in
   `story-content.ts`, ride a 30% line. **The platform contradicts
   itself in plain text on its own front page.** The OECD's 2023
   *Procurement Performance Review* describes the band as 25–30%, with
   25% as the recommended ceiling for healthy systems and 30% as the
   threshold above which procurement is "structurally dysfunctional".
   The platform should pick one — and given that 12 surfaces already
   use 25%, MacroArc must move.

2. **`LensVisualization` (Executive.tsx line 222) hard-codes
   "T1 PRIORITY" as English-only inside the SVG.** Every other label in
   `buildLensTiers` is `{ en, es }`-tagged, but the central crimson
   pill that sits inside the rings reads `T1 PRIORITY` regardless of
   `i18n.language`. A Spanish reader who has localized the rest of the
   page sees one English token sitting in their visual center.

3. **The `ConcentrationConstellation` cluster pills only show codes
   (P1–P7) without category context.** The cluster code "P5" is
   meaningful to RUBLI insiders but illegible to a journalist who lands
   on `/atlas` cold. Pudding always pairs the encoded glyph with a
   one-word semantic anchor ("Anxiety", "Slang", "Bird") — RUBLI shows
   only the slug. The hover tooltip recovers the label, but the static
   read fails.

Lesser issues found in the audit:

- `PesosAtRiskChart` shows `{vendors} vendors` / `proveedores` correctly
  per language, but the *methodology footnote* uses inconsistent
  precision across patterns (some pesos formulas omit the multiplier).
  The footnote also runs to ~420px wide on a chart that is ~820px,
  cramming after the total.
- `MacroArc` paints the OECD safe zone in **green** (`#10b981`) — a
  Bible §3.10 violation. "Low risk = no green" applies to fills as
  well as type. The chart says: "below this dashed line is fine,"
  which is precisely the certification we cannot make.
- The "Where the money goes — 91 auto-classified categories" tile
  grid is **already replaced** by `TopCategoriesChart` (the row 1 +
  row 2 proportional treemap) — verified by grep on Executive.tsx
  line 2576. The old heatmap-tile version no longer exists in the
  page. **omega-P4 is therefore re-aimed at the proportional
  treemap as the live element.**
- Constellation tooltip mixes Spanish description with `T1` token —
  intentional acronym but reads "31 T1" without unit context for new
  readers.
- The `MacroArc` "sustained 78–79%" annotation sits *under* the line
  in Peña Nieto's band, which is the right place visually but
  competes with the wash band's color band. Could be raised 4–6px.

### Anti-patterns committed

- **Decorating instead of arguing**: `ConcentrationConstellation`
  pattern mode shows 7 dots clusters, no annotation tells the reader
  *which cluster is the worst* without hover. Pudding always lets the
  static state carry the headline.
- **Number without reference**: `PesosAtRiskChart` total reads
  "~516B MXN" — but compared to what? Not to the federal procurement
  budget, not to a sector total, not to a documented case. The number
  needs an anchor.
- **Generic vocabulary**: "T1 investigation leads / líderes T1" —
  "leads" reads American-Sales-Funnel; better is "highest-priority
  vendors". `lider` is a poor literal translation.
- **Two languages, one copy**: Multiple captions show ES translation
  but with English numbers (e.g. `87% · 2020 — COVID`). The "·"
  separator and number format are fine; the issue is the header line
  uses the English `OECD` rather than `OCDE` even when `lang === 'es'`.
  Already correctly localized in MacroArc, but be vigilant in P1.

---

## Per-element specs

Each element below maps to one Pudding piece, names it, and ships a
concrete, bounded redesign.

### omega-P1 · `MacroArc` → annotated DA-rate slope chart

**Pudding piece**: *"30 Years of American Anxieties"*
([https://pudding.cool/2018/11/dearabby/](https://pudding.cool/2018/11/dearabby/))

**Why this piece**: it's the same chart shape — a 30-year time series
with named callouts riding the curve, era bands behind. Pudding
explicitly calls out the cultural moments ("Watergate", "AIDS",
"9/11") with hairline leaders to specific years. RUBLI's MacroArc has
the geometry but skips the annotation. Adding "Casa Blanca 2014",
"Estafa Maestra 2017", "COVID 2020" (already there), "Toka 2023" as
named callouts above the line turns the chart from a trendline into a
24-year argument.

**What changes**

1. **Move the OECD reference line from 30% → 25%** and re-color from
   green to **muted neutral** (`var(--color-text-muted)`, opacity 0.6,
   dashed). Add an **upper-band callout** at 30% as a thin secondary
   line: "OCDE rango aceptable 25–30%". Removes Bible §3.10 violation
   AND aligns with 12 other platform surfaces.
2. **Add four named callouts** on the line, riding above with hairline
   leaders (same vocabulary as the existing COVID 2020 callout):
   - 2014 · Casa Blanca / Grupo Higa
   - 2017 · Estafa Maestra surfaces
   - 2020 · COVID emergency *(already present)*
   - 2023 · Toka monopoly / IT capture
3. **Re-color era bands** to use `SECTOR_TEXT_COLORS` indirection so a
   single source-of-truth controls administration colors.
4. **Bilingual fix**: caption switches to "techo OCDE 25%" / "OECD
   ceiling 25%" (matching the rest of the platform).

**ASCII sketch**

```
100%┤                                                     COVID
 90 ┤                                       ╭ Casa Blanca   ╲
 80 ┤                                       │              ╭─╮
 70 ┤                                ─────╯ │              │ │
 60 ┤                       Estafa───       │  Toka─────  ╱  ╲
 50 ┤            ╭────╮  ╭──╯                              ╲
 40 ┤        ╭───╯    ╲─╯
 30 ┤- - - - - - - - - - - - - - - - - - - - - - - - - - - -OCDE upper 30%
 25 ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ OCDE 25% ←
    └──┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬────
    2002              2010              2018              2025
    ▒▒FOX▒▒│▒▒CALDERON▒▒│▒▒PEÑA NIETO▒▒│▒▒AMLO▒▒│SHEINBAUM
```

**Encoding**

- X = year (linear 2002–2025)
- Y = direct-award rate (0–100%)
- Line color = crimson (`#dc2626`) — unchanged
- Callout markers = white-haloed dot (3.5px) for tagged events; named
  events get a label above the line on a hairline leader
- OECD 25% reference = neutral dashed line + label `OCDE 25%`
  (right-margin)
- OECD upper band 30% = lighter neutral hairline, label `OCDE 30%
  · estructuralmente disfuncional` (smaller, muted)
- Era bands = as-is, but colors come from a shared map

**Bilingual labels** (new i18n keys in
`frontend/src/i18n/locales/{es,en}/executive.json`)

| key | en | es |
|---|---|---|
| `macroArc.oecdSafe` | OECD 25% (recommended) | OCDE 25% (recomendado) |
| `macroArc.oecdUpper` | OECD 30% (dysfunction floor) | OCDE 30% (umbral disfunción) |
| `macroArc.callout.casaBlanca` | Casa Blanca · Grupo Higa | Casa Blanca · Grupo Higa |
| `macroArc.callout.estafa` | Estafa Maestra surfaces | La Estafa Maestra |
| `macroArc.callout.covid` | COVID emergency procurement | compras emergencia COVID |
| `macroArc.callout.toka` | Toka IT monopoly | Monopolio TIC Toka |
| `macroArc.caption` | Yearly direct-award rate · OECD ceiling 25% (recommended) — Mexican federal procurement has held above the OECD limit for 23 consecutive years. Sources: COMPRANET 2002–2025; OECD Government at a Glance 2023. | Tasa anual de adjudicación directa · techo OCDE 25% (recomendado) — la contratación federal mexicana ha permanecido por encima del límite OCDE durante 23 años consecutivos. Fuentes: COMPRANET 2002–2025; OCDE Government at a Glance 2023. |

**Anti-pattern to avoid**

- **Do not** keep green for the OECD safe zone. Use neutral.
- **Do not** add callouts on every transition year — the existing
  `transition: true` markers should stay subtle (2.2px dots). Only
  the four named scandals above get labels.
- **Do not** replace the line with a stepped chart — the smooth line
  is editorially correct (DA rate is a continuous estimate, not a
  discrete decision).

**Implementation file**: `frontend/src/pages/Executive.tsx` lines
1237–1449. All localized strings go through `t('executive:macroArc.*')`
or stay as the `lang === 'en' ? ... : ...` ternary already in use
(both work; ternary is the existing local convention).

**Effort**: ~4 hours

---

### omega-P2 · `ConcentrationConstellation` → annotated star chart

**Pudding piece**: *"Constellations"* (the typology used in many
Pudding pieces) — specifically *"How Birds Get Their Names"*
([https://pudding.cool/2024/01/birds/](https://pudding.cool/2024/01/birds/))

**Why this piece**: the Birds piece pairs a small connected-dot
network with **persistent, on-the-chart labels** — a one-word
descriptor sits next to each cluster ring at all times. RUBLI's
constellation pulls the label only on hover; static read fails. The
Birds piece also adds a **scale-of-encoding glossary in the right
margin** ("dot color = family", "ring size = species count") so a
cold reader gets the language in one second.

**What changes**

1. **Persistent semantic micro-label below each cluster ring.** Today
   the ring shows `P5`; the redesign keeps `P5` *and* drops a
   sub-glyph below: `P5 · Sobreprecio` (ES) / `P5 · Overpricing` (EN).
   Truncated to 14 characters max so 7 clusters don't collide.
2. **Right-margin encoding glossary**, three lines:
   - `1 dot ≈ N contracts` (already present, keep)
   - `dot color = risk level` (new)
   - `ring size ∝ √T1 vendors` (new)
3. **"Worst cluster" star marker** — a small filled triangle at the
   top-right of the cluster ring with the highest `highRiskPct`. In
   patterns mode this is **P7 Contractor Network** (0.72 high-risk).
   Static read now leads with the answer.
4. **Tooltip enhancement** — when hovered, prepend a one-line lede
   built from `getLedeFor('pattern', meta)` so the description doesn't
   start cold with "Precios 2σ sobre promedio sectorial".

**ASCII sketch** (patterns mode)

```
   1 dot ≈ 2,540 contracts
   dot color = risk level
   ring size ∝ √T1 vendors
                                                         critical 24,712
        P3·Intermediario     P4·Colusión                            ▼
        ◯  ────                ◯                          high       7,891
                                  ★ P7·Red                 ▼
              · . ·       ·                                low      54,332
                  · · · ·       ·                          ▼
              ·   ●●●●●●● ·                              (margin labels)
              ·    ◯ P5·Sobreprecio       ·   ◯ P1
        P6·Captura ·                          ·    Monopolio
            ◯ . . . . . . . .  ◯
                            P2·Fantasma
```

**Encoding**

- X / Y = halton positions seeded by mode (unchanged)
- Dot color = risk level (unchanged)
- Cluster ring radius ∝ √T1 (unchanged)
- **NEW** Cluster label = `${code} · ${shortLabel}` below ring
- **NEW** Star glyph = ▲ on the highest-`highRiskPct` cluster
- **NEW** Right-margin glossary block (3 lines, mono 8.5px)

**Bilingual labels** (new keys, `executive:atlas.*`)

| key | en | es |
|---|---|---|
| `atlas.glossary.contracts` | 1 dot ≈ {{n}} contracts | 1 punto ≈ {{n}} contratos |
| `atlas.glossary.color` | dot color = risk level | color del punto = nivel de riesgo |
| `atlas.glossary.size` | ring size ∝ √T1 vendors | tamaño del aro ∝ √proveedores T1 |
| `atlas.worstCluster` | highest concentration | mayor concentración |
| `atlas.shortLabel.P5` | Overpricing | Sobreprecio |
| `atlas.shortLabel.P7` | Network | Red |
| `atlas.shortLabel.P1` | Monopoly | Monopolio |
| `atlas.shortLabel.P3` | Intermediary | Intermediaria |
| `atlas.shortLabel.P6` | Capture | Captura |
| `atlas.shortLabel.P2` | Ghost | Fantasma |
| `atlas.shortLabel.P4` | Collusion | Colusión |

(For sectors / sexenios / categories modes, the existing `meta.label`
is already short enough to use directly — no shortLabel map needed.)

**Anti-pattern to avoid**

- **Do not** add labels in *both* modes' shorthand AND full label
  inside the SVG — pick the kicker (`P5 · Sobreprecio`) and let the
  tooltip carry the long form.
- **Do not** label every cluster with a star marker — only the single
  worst-by-`highRiskPct` cluster. One star per chart, by definition.
- **Do not** localize `T1` — that is a defined RUBLI noun in both
  languages. Localize `proveedores T1` / `T1 vendors` in glossary
  copy.

**Implementation file**:
`frontend/src/components/charts/ConcentrationConstellation.tsx` lines
89–168 (meta builders) and 598–703 (attractor render). Add
`shortLabel` field to `ClusterMeta` interface, populate in
`buildPatternMeta`, append render block at line ~672.

**Effort**: ~5 hours (also affects /atlas via shared component)

---

### omega-P3 · `PesosAtRiskChart` → annotated wedge chart

**Pudding piece**: *"The Trolley Problem"*
([https://pudding.cool/2024/04/trolley/](https://pudding.cool/2024/04/trolley/))

**Why this piece**: Trolley uses **Cleveland-pair dot-plots** with
an explicit reference axis at zero, named outliers, and a single
contextualizing reference number at the top ("most people would pull
the lever"). The structure: encoded geometry + named winners + one
anchor stat. RUBLI's PesosAtRiskChart has the wedge geometry but
skips the anchor. Adding `~516B MXN ≈ 5% of 23-year federal spend`
turns the total from a number into a claim.

**What changes**

1. **Add a reference anchor in the header strip**: total estimated
   exposure compared to a benchmark.
   - EN: `~516B MXN at risk · ~5.2% of 9.9T federal procurement`
   - ES: `~516,000 MDP en riesgo · ~5.2% de los 9.9 billones del gasto federal`
2. **Re-color P6 wedge from `#a06820` → `#dc2626`**. The current
   amber-brown reads "medium" but P6 is the largest documented
   capture pattern (15,923 vendors, ~78B MXN). Inconsistent with
   `risk_level` semantics.
3. **Add `→ Investigar` link inline at end of each row** — a small
   hairline-arrowed link to `/aria?pattern=P5` etc. Today the chart
   is read-only; making each row an investigation pathway is the
   editorial-to-action bridge.
4. **Localize `proveedores` plural correctly** — already correct, but
   ensure `formatNumber` uses `es-MX` separators (e.g. `15.923` not
   `15,923` in Spanish). Audit confirms the function uses
   `Intl.NumberFormat`, so this is already correct; just verify.

**ASCII sketch**

```
  ESTIMATED PESOS AT RISK            ~516,000 MDP at risk
  POR PATRÓN ARIA                  ≈ 5.2% del gasto federal
  ─────────────────────────────────────────────────────────
   P5 │ Sobreprecio Sistemático ████████████████████  240,000 MDP   →
      │ 3,985 proveedores
   P2 │ Empresas Fantasma       ████████              95,000 MDP    →
      │ 6,034 proveedores
   P6 │ Captura Institucional   ██████                78,000 MDP    →
      │ 15,923 proveedores
   P1 │ Monopolio Concentrado   █████                 64,000 MDP    →
      │ 44 proveedores  (smallest cluster, biggest concentration)
   P3 │ Intermediaria Uso Único ███▌                  41,000 MDP    →
   P7 │ Red de Contratistas     ███                   38,000 MDP    →
   P4 │ Colusión en Licitaciones █▌                   18,000 MDP    →
  ─────────────────────────────────────────────────────────
  ESTIMATIONS — methodology footnote (one line)
```

**Encoding**

- X = pesos (linear, 0 → max)
- Y (rows) = pattern, sorted descending by exposure
- Wedge color = pattern's risk-level color (re-keyed via
  `getRiskLevelFromScore` proxy: P5/P7/P1/P2 → critical, P3/P6 → high,
  P4 → medium)
- Right-margin link = `→` arrow to ARIA queue filtered by pattern

**Bilingual labels** (new keys, `executive:patternRisk.*`)

| key | en | es |
|---|---|---|
| `patternRisk.title` | Estimated pesos at risk by ARIA pattern | Pesos estimados en riesgo por patrón ARIA |
| `patternRisk.anchor` | ~{{total}} at risk · ~{{pct}}% of federal procurement | ~{{total}} en riesgo · ~{{pct}}% del gasto federal |
| `patternRisk.investigate` | Investigate | Investigar |
| `patternRisk.smallestNote` | smallest cluster, biggest concentration | el cluster más pequeño, la mayor concentración |
| `patternRisk.methodology` | ESTIMATES — overpayment per pattern × pattern volume. Methodology approximations: P5 = (price_ratio − 1) × value; P2 = full ghost volume; P6 = ~15% capture premium; P1 = ~12% monopoly discount lost; others scale with network volume. | ESTIMACIONES — sobreprecio por patrón × volumen del patrón. Aproximaciones: P5 = (razón_precio − 1) × valor; P2 = volumen fantasma completo; P6 = ~15% premio captura; P1 = ~12% descuento monopolio perdido; otros escalan con volumen de red. |

**Anti-pattern to avoid**

- **Do not** make the right-margin investigate link the only way to
  click into a pattern — preserve the row hover affordance.
- **Do not** show the percentage of federal spend with false
  precision; `~5.2%` is honest, `5.207%` is a lie.
- **Do not** sort by alphabetic — sort descending by `pesosBn` so the
  reader's eye lands first on the biggest exposure.

**Implementation file**: `frontend/src/pages/Executive.tsx` lines
695–830 (PATTERN_RISK array + PesosAtRiskChart function). Add
`navigate` import (already present), wire `/aria?pattern=${p.code}`
on the right-margin arrow.

**Effort**: ~3 hours

---

### omega-P4 · `TopCategoriesChart` → annotated proportional treemap

**Status note**: the original element was the "91 auto-classified
categories" tile heatmap. As of d-P3, that has been replaced by
`TopCategoriesChart` (see Executive.tsx line 2576). This phase
re-aims at the live element — the 2-row proportional treemap.

**Pudding piece**: *"Hands of God"*
([https://pudding.cool/2018/05/hands-of-god/](https://pudding.cool/2018/05/hands-of-god/))

**Why this piece**: Hands of God is a dense annotated grid that
**ranks each cell against its neighbors**. Each tile shows a number
*and* a one-word descriptor of what makes it remarkable ("longest
finger", "most extra metatarsals"). The grid is read as a ranked
inventory, not a free-form decoration. RUBLI's TopCategoriesChart
shows category cells with sector tint and value, but never says
*why this category matters more than its neighbor*. Adding a
one-word kicker per cell ("most concentrated", "ghost-heavy",
"OECD violator") turns inventory into ranking.

**What changes**

1. **Add a one-line kicker per cell**: a single mono-uppercase noun
   phrase that names the category's risk fingerprint. Drawn from
   pre-computed `category_stats.risk_signature` (see backend).
2. **Sort row 1 (top 3) by *risk × spend* not pure spend** — so the
   biggest cell isn't always the largest budget but the largest
   risk-weighted budget.
3. **Add a "what to know" caption per row** — three lines of mono
   below the grid that summarize the row's pattern. Static, English
   + Spanish, written in the editorial voice.
4. **Bilingual fix**: ensure category names use `name_en` /
   `name_es` from category_stats, not English fallback.

**ASCII sketch**

```
  TOP 3 BY RISK × SPEND              ────────────────────────────
  ┌─────────────────┐ ┌────────┐ ┌────────┐
  │ MEDICAMENTOS    │ │ TIC    │ │ ALIMENT│
  │ 1.1B MXN        │ │ 620B   │ │ OS     │
  │ ▲ MOST CAPTURED │ │ ▲ MONO │ │ 290B   │
  └─────────────────┘ └────────┘ │ ▲ FANTA│
                                 │  SMA    │
                                 └────────┘

  NEXT 5 CATEGORIES
  ┌──────┬──────┬──────┬──────┬──────┐
  │ Comb │ Obra │ Vale │ Equi │ Tele │
  │ 980B │ 870B │ 240B │ 380B │ 210B │
  └──────┴──────┴──────┴──────┴──────┘

  Top 3 = $2.0T MXN · 20% of federal procurement
  La adjudicación directa en estas 3 categorías:
    medicamentos 79% · TIC 84% · alimentos 91%
```

**Encoding**

- X (within row) = proportional to category spend
- Y = row 1 (top 3 by risk×spend), row 2 (next 5)
- Cell tint = sector palette × avg_risk saturation
- Kicker glyph = ▲ + uppercase mono noun phrase (one of ~12)
- Below-grid caption = three lines, mono, with embedded numbers

**Bilingual labels** (new keys, `executive:categories.*`)

| key | en | es |
|---|---|---|
| `categories.kicker.mostCaptured` | MOST CAPTURED | MÁS CAPTURADA |
| `categories.kicker.monopoly` | MONOPOLY | MONOPOLIO |
| `categories.kicker.ghostHeavy` | GHOST-HEAVY | DENSIDAD FANTASMA |
| `categories.kicker.oecdViolator` | OECD VIOLATOR | EXCEDE OCDE |
| `categories.kicker.networkRisk` | NETWORK RISK | RIESGO DE RED |
| `categories.kicker.priceVolatile` | PRICE VOLATILE | PRECIO VOLÁTIL |
| `categories.row1Anchor` | Top 3 = ${{total}} · {{pct}}% of federal procurement | Top 3 = ${{total}} · {{pct}}% del gasto federal |
| `categories.row1DA` | Direct-award rate in these 3: meds {{pct1}}% · IT {{pct2}}% · food {{pct3}}% | Adjudicación directa: medicamentos {{pct1}}% · TIC {{pct2}}% · alimentos {{pct3}}% |

**Anti-pattern to avoid**

- **Do not** add more than 1 kicker per cell — discipline > density.
- **Do not** let kicker text wrap; cap at 14 chars and require
  designer-level discretion in choosing the noun.
- **Do not** rank by raw spend alone — the chart already shows that
  with cell width; the new sort must reflect risk × spend.

**Implementation file**: `frontend/src/pages/Executive.tsx`
TopCategoriesChart function + curated fallback dataset. Backend
optional: extend `/api/v1/analysis/category-summary` response with a
`risk_signature` enum field; if not yet shipped, hard-code a
deterministic mapping (category_id → kicker key) in the frontend.

**Effort**: ~6 hours (frontend only; +2h if backend extension is
preferred)

---

### omega-P5 · `LensVisualization` → narrowing-funnel diagram

**Pudding piece**: *"An Ode to Margaret Hamilton"*
([https://pudding.cool/2019/07/hamilton/](https://pudding.cool/2019/07/hamilton/))

**Why this piece**: Hamilton uses a **vertical narrowing structure**
where each layer is a step in a process — code → tested → flown →
landed. The narrowing is the argument; each tier is **named, sized,
and reachable**. RUBLI's LensVisualization is already concentric
rings (a horizontal pinwheel of the same idea), but the ring
geometry is decorative; the labels do the work. The redesign keeps
rings but adds **per-ring callout sentences** that explain why this
layer narrows the pool — the editorial *reason* the next ring is
smaller.

**What changes**

1. **Localize `T1 PRIORITY`** — the only English-only label in the
   SVG. Replace with `T1 PRIORIDAD` (ES) / `T1 PRIORITY` (EN). Pull
   from `t('executive:lens.t1Pill')`.
2. **Add per-tier reason sentences** — between each ring's count
   and sublabel, add a one-line "why narrower" sentence. Today the
   sublabel says "every COMPRANET row · 2002–2025"; the new copy
   adds "→ scored by 18-feature model" between row 1 and row 2.
3. **Re-anchor the central T1 callout** with a left-margin lede:
   "Of 3.1M contracts, 320 are dossier-ready". This is the Pudding
   "single argument" headline.
4. **Add a hairline funnel sketch on the left**, mirroring the rings
   geometrically — a shallow inverted triangle so the metaphor of
   *narrowing* is visible, not just declared. Tiny, ~20px tall,
   pure SVG, no viewport jank.

**ASCII sketch**

```
  § 2 · LA LENTE — DE 3.1M A 320

  ┌───────────────────────────────────────────────────────┐
  │                                                       │
  │   ╲   ╱  ◯ 3.1M  contratos analizados                 │
  │    ╲ ╱     cada COMPRANET row · 2002–2025             │
  │     ╳      ↓ filtro por riesgo (modelo v0.8.5)        │
  │    ╱ ╲   ◯ 412k  riesgo alto + crítico                │
  │   ╱   ╲    13.5% del total                            │
  │           ↓ filtro patrón ARIA                        │
  │          ◯  6.2k  lista vigilancia ARIA               │
  │             T2 + T3                                   │
  │              ↓ filtro coincidencia GT                 │
  │             ◯ 1,401  casos documentados               │
  │                anclas para entrenamiento              │
  │                  ↓ máxima prioridad                   │
  │                 ● 320  T1 PRIORIDAD                   │
  │                    listo para dossier · investigable  │
  │                                                       │
  │     De 3,051,294 a 320: el lente RUBLI.               │
  └───────────────────────────────────────────────────────┘
```

**Encoding**

- Y (top → bottom) = narrowing layers
- Ring radius = √log(count) — same as today, but anchored visually
  to the funnel geometry on the left
- Central T1 dot = filled crimson, sized 16px (unchanged)
- New "↓ reason" line between each ring = mono 9px, italic, muted

**Bilingual labels** (new keys, `executive:lens.*`)

| key | en | es |
|---|---|---|
| `lens.t1Pill` | T1 PRIORITY | T1 PRIORIDAD |
| `lens.headline` | Of {{total}} contracts, {{n}} are dossier-ready | De {{total}} contratos, {{n}} son investigables |
| `lens.reason1to2` | scored by 18-feature model | calificados por modelo de 18 variables |
| `lens.reason2to3` | enriched by ARIA pattern detection | enriquecidos con detección ARIA |
| `lens.reason3to4` | matched against documented cases | cruzados contra casos documentados |
| `lens.reason4toT1` | top-priority subset, manually investigable | subconjunto prioritario, investigable a mano |
| `lens.tier.t1.label` | T1 priority vendors | proveedores prioritarios T1 |
| `lens.tier.t1.sublabel` | dossier-ready · highest priority | listo para dossier · máxima prioridad |

**Anti-pattern to avoid**

- **Do not** add 5 reason sentences when only 4 transitions exist.
- **Do not** use `líderes T1` — it's a sales metaphor, not an
  investigation noun. `proveedores prioritarios T1` is correct.
- **Do not** let the funnel sketch grow more than ~30px wide; it's
  a metaphor mark, not a chart.

**Implementation file**: `frontend/src/pages/Executive.tsx` lines
54–225 (`buildLensTiers` + `LensVisualization`). The funnel sketch
is new SVG drawn alongside the existing rings; both can share the
same parent svg.

**Effort**: ~3 hours

---

### omega-P6 · `/atlas` constellation — full-viewport story chrome

**Pudding piece**: *"How Different Generations View Hip-Hop"*
([https://pudding.cool/2025/02/hip-hop-generations/](https://pudding.cool/2025/02/hip-hop-generations/))

**Why this piece**: Hip-Hop Generations uses the **same encoded
chart** (a beeswarm of artists) across multiple **viewing lenses**
(generation, era, decade). Each lens is a button row; the chart
itself stays the same shape but **re-organizes around the new
attractor set**. The right margin holds *narrative chapters* that
guide the reader through which lens to use when. RUBLI's /atlas has
the lens machinery (PATTERNS / SECTORS / CATEGORIES / TERMS) and
even the narrative chapter system — but the **handoff between lens
and chapter is mute**: the lens buttons don't tell the reader what
*story* each lens unlocks.

**What changes**

1. **Each lens button gets a one-line tagline** describing what it
   reveals. Today the buttons read `PATTERNS / PATRONES`; the
   redesign adds a sub-line with the verbatim editorial promise:
   - `PATRONES` → "los 7 patrones ARIA" / "the 7 ARIA patterns"
   - `SECTORES` → "los 12 sectores federales" / "12 federal sectors"
   - `CATEGORÍAS` → "32 categorías de gasto" / "32 spending categories"
   - `SEXENIOS` → "6 administraciones" / "6 administrations"
2. **Glossary block in the bottom-left margin** — the same 3-line
   encoding glossary added in P2 (1 dot ≈ N contracts; color = risk
   level; ring size ∝ √T1) — but rendered larger for the
   full-viewport scale.
3. **Lens-narrative bridge**: when a lens is active, the story
   chapter card in the right margin shows a *lens-specific*
   "investigate" CTA. Today the CTA is generic ("ver detalle"); the
   redesign reads "investigar el patrón P5" / "investigate pattern
   P5" when patterns mode + a cluster is hovered.
4. **Bilingual fix**: lens buttons already correct (verified line
   1388–1391 in Atlas.tsx). The new sub-line taglines need keys.

**ASCII sketch**

```
  ┌──────────────────────────────────────────────────────────────┐
  │  EL OBSERVATORIO                                  [X-RAY▼]   │
  │                                                              │
  │  PATRONES   SECTORES   CATEGORÍAS   SEXENIOS                │
  │  ▔▔▔▔▔▔▔                                                    │
  │  los 7 patrones ARIA                                         │
  │                                                              │
  │  ┌──────────────────────────────────┐  ┌──────────────────┐ │
  │  │                                  │  │ CHAPTER NARRATIVE │ │
  │  │     ★ P7·Red                      │  │                   │ │
  │  │     · . ·                         │  │ "El Cártel        │ │
  │  │   · ●●● P5·Sobreprecio            │  │  Farmacéutico"    │ │
  │  │     · ·                           │  │                   │ │
  │  │   ◯ P3·Intermediaria              │  │ → Investigar P5   │ │
  │  │                                   │  │   patrón ARIA     │ │
  │  │ 1 dot ≈ 2,540 contracts          │  │                   │ │
  │  │ color = risk level               │  │                   │ │
  │  │ ring size ∝ √T1 vendors          │  │                   │ │
  │  └──────────────────────────────────┘  └──────────────────┘ │
  │  Year scrubber: 2008 ━━━━●━━━━ 2025                         │
  └──────────────────────────────────────────────────────────────┘
```

**Encoding**

- Same as P2's constellation chart, scaled up
- Lens buttons get a sub-line tagline at the active state
- Right-margin chapter card gets a lens-aware CTA

**Bilingual labels** (new keys, `atlas:lens.*`)

| key | en | es |
|---|---|---|
| `atlas.lens.patterns.tagline` | the 7 ARIA patterns | los 7 patrones ARIA |
| `atlas.lens.sectors.tagline` | 12 federal sectors | los 12 sectores federales |
| `atlas.lens.categories.tagline` | 32 spending categories | 32 categorías de gasto |
| `atlas.lens.sexenios.tagline` | 6 administrations | 6 administraciones |
| `atlas.cta.investigatePattern` | Investigate pattern {{code}} | Investigar el patrón {{code}} |
| `atlas.cta.investigateSector` | Open sector profile · {{label}} | Abrir perfil del sector · {{label}} |
| `atlas.cta.investigateCategory` | Open category profile · {{label}} | Abrir perfil de la categoría · {{label}} |
| `atlas.cta.investigateAdmin` | Open administration · {{label}} | Abrir administración · {{label}} |

**Anti-pattern to avoid**

- **Do not** show tagline only on the active button — show all four
  taglines as static sub-text under the buttons; switching lens
  shifts the active highlight, not the sub-copy.
- **Do not** rebuild the constellation engine. P2 changes already
  flow through the shared component; P6 only adds chrome.
- **Do not** hard-code lens taglines in `Atlas.tsx` — route through
  i18n so future lenses are pluggable.

**Implementation file**: `frontend/src/pages/Atlas.tsx` lines
1380–1410 (lens buttons), plus the right-margin chapter card region
(grep for "activeStory" / "ATLAS_STORIES" usage). Glossary block
shares its render function with P2 (extract to
`frontend/src/components/charts/ConstellationGlossary.tsx`).

**Effort**: ~5 hours

---

## Phase ordering & dependencies

| Phase | Element | Effort | Dependency | User-visible impact |
|---|---|---|---|---|
| **omega-P1** | MacroArc OECD fix + callouts | 4h | none | High — fixes a contradiction visible in plain text on the front page |
| **omega-P2** | Constellation annotations | 5h | none | High — every reader of /atlas + /dashboard benefits |
| **omega-P3** | PesosAtRisk anchor + investigate links | 3h | none | Medium — already strong, gains contextual anchor |
| **omega-P5** | Lens funnel + bilingual fix | 3h | none | Medium — fixes the only English-only label in the page |
| **omega-P4** | TopCategories kickers | 6h | (optional) backend `risk_signature` field | Medium — densifies the inventory into a ranking |
| **omega-P6** | Atlas chrome | 5h | **omega-P2** (shared glossary primitive) | High — turns /atlas from explorable to argued |

**Recommended order**: P1 → P2 → P5 → P3 → P6 → P4. Rationale:

- **P1 first**: it's a *correctness* fix (OECD 30% vs 25%
  contradiction), not just a polish. Every other phase ships against
  a corrected baseline.
- **P2 before P6**: P6 reuses the glossary primitive built in P2.
  Doing P6 first would mean re-doing it after P2.
- **P5 before P3**: P5 is a 3h fix to a visible bilingual bug; P3 is
  3h of polish. Bug-fix wins on calendar time.
- **P3 before P6**: P6 is the highest-effort visual change; P3 is a
  cheap anchor add that ships independently.
- **P4 last**: it's the most invasive (kicker authoring requires
  designer judgment for ~12 categories) and the lowest-impact
  per-hour. Defer until the rest is stable.

## Anti-regression notes

- Every phase must pass `npx tsc --noEmit && npm run build && npm run
  lint:tokens` from `frontend/`. The lint:tokens hook will block any
  raw hex (`#dc2626` etc.) re-entering page files — use the constants
  imports.
- Bilingual i18n keys go into the corresponding namespace files
  (`executive.json` for P1/P3/P4/P5; `atlas.json` for P2/P6). Both
  `es` and `en` files **must** be updated in the same commit.
- The constellation engine itself (`ConcentrationConstellation.tsx`
  layout math, halton draw, attractor positioning) is **off-limits**.
  P2 only adds metadata fields and decoration render blocks; do not
  alter `useMemo` body.
- `MacroArc`'s 30% → 25% move is the most semantically loaded change
  in this plan — a journalist might read "below 25% is fine" as
  RUBLI certifying procurement integrity. The caption must read
  "*recommended ceiling* 25%" and the upper-band 30% line must remain
  as "*structural dysfunction* threshold" — both visible, neither
  green.
- Each commit message must cite the doc + § per Bible rule, e.g.
  `feat(executive omega-P1 § omega-P1): MacroArc OECD 25% + named
  callouts`.

## Out of scope (for this cycle)

- The `/methodology` page rewrite — separate plan.
- Backend changes to `category_stats.risk_signature` — flagged as
  optional in P4; a frontend-deterministic mapping is acceptable for
  ship.
- The COVID Year story chapter, the Estafa Maestra narrative, and
  other long-form pieces — they live in `atlas-stories.ts` and are
  edited under a different cycle.
- Mobile breakpoint tuning for these graphics — current
  `viewBox` + `width="100%"` already works; refinements are P-future.

---

*Omega is the last letter. After this cycle, the dashboard and atlas
should read as a closed argument: every chart names its finding,
every label is bilingual, every number has a reference, every
investigation has a path.*
