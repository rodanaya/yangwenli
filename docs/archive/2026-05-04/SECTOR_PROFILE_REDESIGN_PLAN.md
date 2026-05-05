# Sector Profile Redesign Plan

> Surface: `/sectors/:id` — the per-sector dossier (`frontend/src/pages/SectorProfile.tsx`, 1,915 LOC, 4 tabs).
> Sibling: `/sectors` (index, just shipped FT/Pudding-grade — `pages/Sectors.tsx`).
> Date: 2026-05-04. Risk model: v0.8.5. Plan IDs: `sp-P1` … `sp-P5`.

---

## 1. Thesis

> **The index says "12 sectors, 12 pathologies." The detail page must say: this sector's pathology is X, its three institutional hosts are Y, and these are the vendors who profit from it.**

Concretely: `/sectors/:id` should answer four questions in order, each as a single visual hero:

1. **What is the dominant fact about this sector?** (sledgehammer number — DA% or risk%)
2. **How has the pathology evolved across six administrations?** (sexenio slope, not bars)
3. **Where does the money actually go?** (institution → vendor flow, ranked)
4. **Which fraud patterns concentrate here?** (ARIA mix vs platform baseline)

Today's page asks the reader to assemble these answers from 14 sections spread across 4 tabs of equal visual weight. That is an Excel export with tabs, not an investigation.

---

## 2. Audit

### Tab 1: Overview (lines 1219–1453)

| Block | Lines | Current encoding | Editorial weakness | Verdict |
|---|---|---|---|---|
| **PHI Governance Grade panel** | 1227–1239 | Tier label + 3 indicator stats with OECD benchmarks | Strong already — uses tier system + benchmark refs | **KEEP** |
| **Insights cards (2-col grid)** | 1242–1250 | Severity-tinted callout boxes synthesized from `stats` | Buried under PHI; topic-not-finding headlines ("Elevated High-Risk Rate") | **UPGRADE** to single dominant `<PriorityAlert>` style with editorial copy |
| **Spend trend (area)** | 1253–1276 | `<EditorialAreaChart>` 2010–present, sector-color fill | Lazy: it's just a curve. No annotations, no sexenio bands, no peak callout | **UPGRADE** with sexenio bands + peak label |
| **Risk Profile Over Time (dual line)** | 1279–1308 | Avg-risk × 100 + high-risk-pct, 2 lines, manual legend | Two unrelated y-scales overlaid; legend below; no inflection annotations | **CUT** (data folded into the new sexenio slope hero) |
| **Investigation Cases callout** | 1311–1318 | Red border card, top 3 cases + severity pills | Strong — anchors the editorial weight | **KEEP** |
| **Top Institutions list** | 1321–1374 | Ranked rows, dot bar, risk pill | Good primitive | **KEEP** |
| **Spending Categories list** | 1377–1452 | Same row pattern as institutions | Good but redundant entry-point — same chip semantics | **KEEP** (densify in P3) |

### Tab 2: Top Vendors (lines 1456–1494)

| Block | Lines | Current encoding | Weakness | Verdict |
|---|---|---|---|---|
| **VendorTable** | 1456–1494 | Standard ranked table + dot bar + risk badge | Functional but generic; no `concentration top-N` framing | **KEEP** + add concentration kicker |

### Tab 3: Risk Analysis (lines 1497–1767)

| Block | Lines | Current encoding | Weakness | Verdict |
|---|---|---|---|---|
| **Risk Distribution (RiskRingField)** | 1505–1529 | Named-circle constellation + 4-row dot strip legend | Cramped; legend competes with chart; "high+" center number is the only finding | **REPLACE** with `<EditorialDistribution>` density-ridge keyed on contract value (so the reader sees risk × spend, not just risk × count) |
| **Top Risk Factors (FactorRankList)** | 1532–1558 | Top-7 features by `frequency`, dot strip, % + risk pill | Generic feature names; needs editorial pull-out copy ("In this sector, X drives risk") | **UPGRADE** with comparison-to-platform-avg delta |
| **Market Concentration Over Time (Gini)** | 1561–1576 | `<EditorialLineChart>` single series + 0.25 hrule | One line is too thin; reader cannot tell whether 0.6 is bad without a peer | **UPGRADE** to slope chart with platform-median reference + peak annotation |
| **Procurement Patterns (4 KPI tiles)** | 1579–1632 | DA % / SB % / Avg Risk / Vendors — tile each | Three of four duplicate header stats; no benchmark refs | **REPLACE** with FT bullet-row `<BenchmarkRow>` showing each metric vs OECD/platform |
| **§7 ARIA Patterns** | 1635–1718 | Pattern code → bar → count, sector-color fill | Strong already; pattern codes link out | **KEEP** + add platform-baseline overlay |
| **Editorial closing + CTAs** | 1721–1766 | Synthesized prose verdict + ARIA / Atlas links | Strong already — best closing on the page | **KEEP** |

### Tab 4: Sexenios (lines 1770–1908)

| Block | Lines | Current encoding | Weakness | Verdict |
|---|---|---|---|---|
| **Administration rows** | 1850–1903 | 5–6 stacked rows, name + total + risk + DA + horizontal mini-bar | Reads like Excel: 5 identical rows where only numbers change. Mini-bars are normalized to max-value so AMLO always wins regardless of pathology | **REPLACE** with vertical NYT-style timeline: one slope/dumbbell encoding spend-shift + risk-shift across the six sexenios |

---

## 3. New IA — keep 4 tabs, give each ONE hero

Argument for keeping 4 tabs: the reader already has a mental model after the index page (each sector = one card). Collapsing Overview into the header forces three deep-but-narrow tabs that all want hero treatment. Better: keep the 4-tab navigation, but enforce a **hero-per-tab** rule. Each tab gets one editorial chart (the "What is the most important thing on this tab?") and a small set of supporting blocks below the fold.

### Page header (always visible, above tabs)

- **Section ID**: header
- **§ kicker**: `SECTOR · {SECTOR_CODE} · v0.8.5` (existing, keep)
- **Hero**: a `<SectorSledgehammer>` — the **dominant pathology number** picked at runtime per sector, Pudding "30 Years" style.
  - For Salud (DA% 64%): `64%` red, "adjudicación directa — 2.6× el techo OCDE"
  - For Educación (Estafa Maestra-coded, P3 capture): `81%` red, "captura de intermediación"
  - For Energía (concentration-coded): `0.71` Gini red, "concentración Pemex/CFE"
  - Selection rule: pick the metric where this sector's value most exceeds the platform p90.
- **Why**: the index page told you "12 pathologies." This page must immediately name the *one* relevant to this sector.
- **Data**: `sector.statistics` (already loaded; no new fetch)

### Tab 1: Vista General (Overview)

- **§ kicker**: `§ 1 LA HISTORIA DEL DINERO`
- **Headline ES**: "Quién recibe los 2.84 billones MXN de Salud"
- **Headline EN**: "Who receives Salud's 2.84T MXN"
- **Hero**: `<SectorMoneyFlowSankey>` — three-column flow: Administration (top 5 institutions) → Pattern (DA / Competitive / Single-bid) → Vendor (top 8). One image, three readings.
- **Why**: spend-trend area + institution list + vendor list today are three separate weak charts answering one question. A single Sankey says "the money enters here, takes this shape, exits here."
- **Below the fold**: PHI Governance Grade (kept), Investigation Cases callout (kept), Spending Categories (kept), spend-trend area demoted to small `<EditorialSparkline>` annotation.
- **Data**: `analysisApi.getMoneyFlow(undefined, sectorId)` (already loaded) + `vendorApi.getTop('value', 8, {sector_id})` (already loaded on Vendors tab — share cache).

### Tab 2: Proveedores (Top Vendors)

- **§ kicker**: `§ 2 LOS BENEFICIARIOS`
- **Headline ES**: "Los 20 que reciben el 47% del gasto sectorial"
- **Headline EN**: "The 20 vendors who collect 47% of sector spend"
- **Hero**: `<SectorVendorBeeswarm>` — borrow `<RiskSpendBeeswarm>` vocabulary one level down: each top-30 vendor as a labeled circle, X = avg_risk_score × 100, Y = log(total_value), R = sqrt(contract_count). Top-3 labeled by name; the rest dimmed unless hovered.
- **Why**: the table tells you who's biggest. The beeswarm tells you **who's biggest *and* riskiest** — the priority quadrant readers care about.
- **Below the fold**: existing `<VendorTable>` densified, with concentration-top-N readout ("Top 5 = X%, Top 20 = Y%"), and a `<DotStrip>` rail of HHI for the 12-sector platform average so the reader knows whether this sector is concentrated.
- **Data**: existing `topVendors.data` (already loaded).

### Tab 3: Análisis de Riesgo (Risk)

- **§ kicker**: `§ 3 LA PATOLOGÍA DEL SECTOR`
- **Headline ES**: "Concentración de mercado, factor por factor"
- **Headline EN**: "Market concentration, factor by factor"
- **Hero**: `<SectorRiskDensityRidge>` — `<EditorialDistribution>` keyed on contract value (so risk distribution is weighted by money, not contract count). The visual finding is "low-count critical contracts hold 40% of spend" — invisible in today's count-weighted donut.
- **Why**: the constellation in the screenshot is a clever rendering of a fact (4 categories, % each) the reader can read in two seconds from a `<DotStrip>` row. The density ridge encodes risk × value — a finding the donut hides.
- **Below the fold**:
  - `<BenchmarkRow>` × 4 (replaces Procurement Patterns 4-tile grid): DA% / SB% / Avg Risk / HHI, each rendered as bullet-row vs OECD/platform thresholds with critical/medium/low markers.
  - Top Risk Factors list (kept) with platform-delta callout per factor.
  - Concentration Gini chart (kept) UPGRADED to slope w/ peak annotation + platform-median reference.
  - §7 ARIA Patterns (kept).
  - Editorial closing prose + CTAs (kept).
- **Data**: existing `riskDist.data`, `riskFactors`, `concentrationHistory`, `ariaPatternVendors` (no new fetches).

### Tab 4: Sexenios (By Administration)

- **§ kicker**: `§ 4 SEIS PRESIDENTES, UN PATRÓN`
- **Headline ES**: "Cómo cambió Salud entre Fox y Sheinbaum"
- **Headline EN**: "How Salud shifted from Fox to Sheinbaum"
- **Hero**: `<SectorSexenioTimeline>` — vertical NYT-vocabulary timeline: one row per administration (Fox → Sheinbaum), each row a horizontal **slope/dumbbell pair** (start-of-term value · end-of-term value) for two encoded metrics (spend in sector color, DA% in platform-baseline gray). Annotation column on the right for the era's signature event ("Estafa Maestra surge", "COVID dump", etc.).
- **Why**: the current 5-row Excel-style mini-bars normalize to max value, so AMLO always wins regardless of pathology. The reader cannot see *trajectory* — only totals. A slope-per-sexenio shows the change inside each term, which is what investigative readers actually want.
- **Below the fold**: small companion line chart of yearly DA%/risk so the reader can drill in without a tab change.
- **Data**: `sector.trends` (already loaded — no fetch).

---

## 4. Three hero specs (detailed)

I pick the three with the highest editorial leverage. The Tab-3 density ridge is also a candidate but the existing `<EditorialDistribution>` primitive handles 90% of it once we feed value-weighted bins; it gets a P3 spec, not a hero spec.

---

### HERO 1 · Page header — `<SectorSledgehammer>`

**One-line idea**: pick the sector's *worst* metric vs platform p90, render it Pudding-sledgehammer-style with a one-sentence editorial verdict.

**ASCII sketch**:
```
┌──────────────────────────────────────────────────────────────────┐
│ SECTOR · SALUD · v0.8.5                                          │
│ EN 2023, EL SECTOR SALUD ADJUDICÓ                                │
│                                                                  │
│   ┏━━━━━━━━┓                                                     │
│   ┃ 64%    ┃   sin competencia — 2.6× el techo OCDE del 25%      │
│   ┗━━━━━━━━┛                                                     │
│   ◀ 180px Playfair Italic 800, color = sector_salud red          │
│                                                                  │
│   $2.84T MXN · 1.2M contratos · 28% high+ critical               │
│   [riesgo crítico] · 14 casos · 6,034 fantasmas                  │
└──────────────────────────────────────────────────────────────────┘
```

**Encoding**:
- **Hero number**: the sector's "worst exceedance" picked from {DA%, SB%, HHI, avg_risk × 100, P2 ghost share}. Choose argmax of `(this_value − platform_p90) / platform_iqr`. Color = `SECTOR_COLORS[code]`. Font: Playfair Display Italic 800, `clamp(96px, 14vw, 180px)`.
- **Subtitle**: one sentence, lowercase serif, names the OECD or platform-median reference: "2.6× el techo OCDE del 25%" or "3.1× la mediana sectorial de 0.32".
- **Stats row below**: existing 3 stats from header (spend / contracts / high+critical%), demoted to `text-sm` mono.

**Annotations**:
- Subtle 3px left bar in sector color (matches `<DashboardSledgehammer>`).
- Eyebrow above number: `EN 2023, EL SECTOR {NAME} ADJUDICÓ` (pattern from index).

**Interactivity**: none. This is a sledgehammer, not a chart.

**Inspiration**: Pudding "30 Years of American Anxieties" (one giant annotated number); also our shipped `<DashboardSledgehammer>`. FT principle: the headline should be the finding, not the topic.

**Anti-pattern**: do not show a "stat tile grid." The whole point is one number that the reader cannot ignore.

**Implementation file**: new — `frontend/src/components/sectors/SectorSledgehammer.tsx` (mirror `<DashboardSledgehammer>`'s shape; ~120 LOC). Selection helper `pickDominantMetric(stats)` lives in `frontend/src/lib/sector/dominantMetric.ts`.

---

### HERO 2 · Tab 1 — `<SectorMoneyFlowSankey>`

**One-line idea**: a three-column money path — top 5 institutions → procedure type (DA / Competitive / Single-bid) → top 8 vendors — replacing the spend-area + institution-list + vendor-list trio.

**ASCII sketch**:
```
INSTITUCIONES (5)        PROCEDIMIENTO (3)          PROVEEDORES (8)
IMSS         ─────────╮                            ╭─── BIRMEX
ISSSTE       ──╮      ├────► ADJ. DIRECTA  64% ────┼─── DIMESA
SSA          ──┼──────╯                            ╰─── PISA
PEMEX SALUD  ──┴───────────► COMPETITIVA     22%
SEDENA SAN.  ──────────────► SOLO 1 OFERTA   14% ───── BAXTER (opaque, FP)

  ▰ link width = MXN flow         ▰ link color = sector palette
  ▰ click any node → drill         ▰ hover → trace path end-to-end
```

**Encoding**:
- **X (3 columns)**: institutions (left), procedure-type (middle), vendors (right).
- **Node height**: `total_value_mxn` (rank-ordered descending top-to-bottom).
- **Link width**: MXN routed from L→M and M→R.
- **Color**: link = `SECTOR_COLORS[code]` at 0.45 opacity; nodes match column.
- **Risk overlay**: vendor nodes get a 2px right-border in `RISK_COLORS[level]`.

**Annotations**:
- Center column shows DA% as eyebrow: `64% sin competencia — 2.6× OCDE`.
- Structural FPs (BAXTER/FRESENIUS/etc.) rendered with 0.4 opacity + "FP estructural" tag, NOT excluded.
- Pull-stat right-edge: "Top 5 instituciones = X% del gasto sectorial."

**Interactivity**:
- Hover institution → trace which procedures + vendors it feeds.
- Hover vendor → trace which institutions feed it (ghost-company test).
- Click any node → vendor or institution dossier.
- Keyboard: arrow keys cycle nodes within column; Enter navigates.

**Inspiration**: Pudding "Where Your Tax Dollars Go" (3-column Sankey with hover tracing); FT "Russian gas flows" 3-column cargo flow. NOT D3 sankey — pure SVG so we control colors.

**Anti-pattern**: do not auto-route `/sankey` cycles or render >12 nodes per column. If a column has more, group `+ N otros` into a muted node.

**Implementation file**: new — `frontend/src/components/sectors/SectorMoneyFlowSankey.tsx` (custom SVG; ~350 LOC). Reuse `<EntityIdentityChip>` in tooltip. The page already loads `analysisApi.getMoneyFlow` and `vendorApi.getTop` — combine them client-side, no new endpoint.

---

### HERO 3 · Tab 4 — `<SectorSexenioTimeline>`

**One-line idea**: vertical NYT timeline with one slope/dumbbell row per administration showing intra-term *change* (start-year vs end-year) in spend + DA%, plus an annotation column for that era's signature event.

**ASCII sketch**:
```
2000 ━┓
      ┃ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●        ┃ FOX
      ┃ DA: 28%                       DA: 41%    ┃ "transición democrática,
      ┃ MX$  82B                      MX$ 142B   ┃  apertura PEMEX"
      ┃                                          ┃
2006 ━┫ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●    ┃ CALDERÓN
      ┃ DA: 41%                          DA: 58% ┃ "guerra contra narco,
      ┃ MX$ 142B                         MX$ 198B┃  emergencia sanitaria"
      ┃                                          ┃
2012 ━┫ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●  ┃ PEÑA NIETO
      ┃ DA: 58%                           DA: 72%┃ "Estafa Maestra,
      ┃ MX$ 198B                          MX$ 287┃  Odebrecht"           ◀ red era marker
      ┃                                                                  ┃
2018 ━┫ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●  ┃ AMLO
      ┃ DA: 72%                            DA: 79%┃ "centralización CFE,
      ┃ MX$ 287B                           MX$ 412┃  Segalmex, COVID"
      ┃                                           ┃
2024 ━┫ ●━━━━━━━━━●  (en curso)                   ┃ SHEINBAUM
      ┃ DA: 79%   DA: 81%                         ┃ "continuidad, Pemex"
      ┗
        ◀── horizontal slope: each term ──▶      ◀── editorial annotation
```

**Encoding**:
- **Y axis**: vertical timeline 2000 → 2025; sexenio rows are anchored at term-start year with the slope spanning to term-end.
- **X axis (within each row)**: a horizontal slope/dumbbell from year-start value to year-end value, on a shared 0–100 scale (DA%) overlaid with a second log-scale spend axis (right edge).
- **Two encoded metrics per row**:
  - Spend slope: thick (4px) line in `SECTOR_COLORS[code]`.
  - DA% slope: thin (1.5px) line in `var(--color-text-muted)` for non-pathology terms, `#dc2626` for terms above platform p75.
- **Era markers**: red vertical band where any sector-relevant scandal year falls (Estafa Maestra 2014, COVID 2020, Segalmex 2021).
- **Right-edge annotation column**: 1–2 sentence editorial note per administration (sourced from `lib/administrations.ts`; extend with sector-specific notes if available).

**Annotations**:
- Term boundary years labeled left-edge in mono.
- Each slope endpoint dot = circle r=4, filled in metric color.
- Pull-stat for biggest delta term: "Bajo Peña Nieto, la adjudicación directa subió de 58% a 72% — el mayor salto sexenal."

**Interactivity**:
- Hover row → expand to show the 6 yearly points as small dots on the slope.
- Click row → filters `/aria?sector_id=X&admin=Y`.
- Keyboard: ArrowDown/ArrowUp moves between sexenios.

**Inspiration**: NYT "How Trump Reshaped the Federal Bench" vertical timeline; FT "UK PM tenure & inflation" slope rows. NYT vocabulary because the reader is reading history, not analyzing a chart.

**Anti-pattern**: do not normalize spend to max-of-rows — that's what kills today's bars (AMLO always wins). Use a fixed log axis so the eye reads *trajectory*, not *rank*.

**Implementation file**: new — `frontend/src/components/sectors/SectorSexenioTimeline.tsx` (~400 LOC). Data shaping reuses the existing `adminMap` aggregation block in SectorProfile (lines 1815–1846) — extract to `lib/sector/aggregateBySexenio.ts`.

---

## 5. Cut list

| Cut | Why |
|---|---|
| Tab 1 dual-line "Risk Profile Over Time" (lines 1279–1308) | Two unrelated scales overlaid; data folded into Tab-4 sexenio timeline |
| Tab 1 area `<TrendArea>` (lines 1253–1276) | Demoted to a 60-px `<EditorialSparkline>` annotation strip below the Sankey |
| Tab 3 `<RiskRingField>` constellation (lines 1505–1529) | Clever-but-cramped; replaced by value-weighted density ridge that surfaces the actual finding |
| Tab 3 4-tile "Procurement Patterns" grid (lines 1587–1631) | 3 of 4 tiles duplicate header stats; replaced by 4 `<BenchmarkRow>` rows with OECD refs |
| Tab 4 horizontal mini-bars (lines 1895–1900) | Normalized to max-value, AMLO always wins, hides trajectory |
| `InsightCard` 2-col grid (lines 1242–1250) | Topic-not-finding headlines; collapse into single `<PriorityAlert>` above hero |

Net delta: **−6 weak surfaces, +3 strong heroes, +1 sledgehammer.**

---

## 6. Phases (5 PR-sized increments)

| ID | Scope | LOC | Ships |
|---|---|---|---|
| **sp-P1** | `<SectorSledgehammer>` + `pickDominantMetric()` lib + page header swap. Cut `InsightCard` grid; collapse to single `<PriorityAlert>` | ~250 | The header now lands a finding, not a label. |
| **sp-P2** | `<SectorMoneyFlowSankey>` (Tab 1 hero). Demote `<TrendArea>` to sparkline. Cut "Risk Profile Over Time" dual-line | ~450 | Tab 1 reads as one image. |
| **sp-P3** | `<EditorialDistribution>` value-weighted density ridge for Tab 3 risk dist. Replace 4-tile patterns grid with 4 `<BenchmarkRow>` rows. Upgrade Gini line to slope-with-platform-median annotation. Add platform-baseline overlay to ARIA pattern bars | ~350 | Tab 3 stops listing numbers and starts comparing them. |
| **sp-P4** | `<SectorVendorBeeswarm>` (Tab 2 hero) above existing `<VendorTable>`. Add concentration-top-N readout + HHI rail | ~300 | Tab 2 surfaces priority quadrant. |
| **sp-P5** | `<SectorSexenioTimeline>` (Tab 4 hero) replacing horizontal-bar rows. Extract `aggregateBySexenio()` lib | ~450 | Tab 4 stops reading like an Excel export. |

Each phase is independently shippable: the page works with any subset of phases applied; e.g. P1+P3 alone is a meaningful release.

---

## 7. Editorial copy

### Page sledgehammer template

```tsx
<SectorSledgehammer
  eyebrow={isEs ? `EN 2023, EL SECTOR ${SECTOR_NAME.toUpperCase()} ADJUDICÓ` : `IN 2023, ${SECTOR_NAME} AWARDED`}
  number={dominant.value}                            // "64%"
  unit={dominant.unit}                                // "%" | "" | "MX$"
  color={SECTOR_COLORS[code]}
  verdict={isEs ? dominant.verdictEs : dominant.verdictEn}
  // e.g. "sin competencia — 2.6× el techo OCDE del 25%"
  reference={dominant.reference}                      // "OCDE: ≤25%"
/>
```

### § kickers (Spanish primary, EN fallback via i18n)

```
header   SECTOR · {CODE} · v0.8.5                      (existing)
tab 1    § 1 LA HISTORIA DEL DINERO                    "The Money Path"
tab 2    § 2 LOS BENEFICIARIOS                          "The Beneficiaries"
tab 3    § 3 LA PATOLOGÍA DEL SECTOR                    "The Sector Pathology"
tab 4    § 4 SEIS PRESIDENTES, UN PATRÓN                "Six Presidents, One Pattern"
```

### Headlines

| Tab | ES | EN |
|---|---|---|
| 1 | Quién recibe los {SPEND} de {SECTOR} | Who receives {SECTOR}'s {SPEND} |
| 2 | Los 20 que reciben el {TOP20_PCT}% del gasto sectorial | The 20 vendors who collect {TOP20_PCT}% of sector spend |
| 3 | Concentración de mercado, factor por factor | Market concentration, factor by factor |
| 4 | Cómo cambió {SECTOR} entre Fox y Sheinbaum | How {SECTOR} shifted from Fox to Sheinbaum |

### Dateline format

`Datos COMPRANET 2002–2025 · Modelo v0.8.5 · {ARIA_T1_COUNT} proveedores T1 · {SCORED_COUNT} contratos calificados`

Renders as: small mono `text-[10px]` under the page header, right-aligned.

### Priority alert copy template (replaces InsightCard grid)

```
Si DA% > 70 ∧ avg_risk ≥ 0.40:
  "Patrón de captura institucional. {DA_PCT}% adjudicación directa con riesgo
   promedio {RISK}/100 supera el percentil 90 de los 12 sectores. {ARIA_T1}
   proveedores priorizados disponibles para revisión."

Si DA% ∈ (60, 70]:
  "Riesgo de procedimiento elevado. {DA_PCT}% sin competencia — {MULTIPLIER}× el
   techo OCDE."

Si SB% > 25:
  "Competencia simulada. {SB_PCT}% de procedimientos competitivos recibieron
   una sola oferta — patrón consistente con colusión o barrera de entrada."

(else)
  "{SECTOR} registra {SPEND} en contratos federales. El modelo v0.8.5 no detecta
   señales sistémicas elevadas; revisar proveedores individuales en la cola ARIA."
```

(This is the existing `editorial closing` block from lines 1721–1741, promoted to the top of the page.)

---

## Constraints honored

- All entity refs via `<EntityIdentityChip>`
- Risk thresholds via `getRiskLevelFromScore` (no inline ladders)
- Sector text colors via `SECTOR_TEXT_COLORS`, fills via `SECTOR_COLORS`
- No green for low risk
- Spanish § kickers primary, EN via i18n
- No new backend endpoints (every hero uses already-loaded queries)
- No pie / radar / sunburst; no >5-cat bar charts
- Existing strong surfaces preserved: PHI panel, Investigation Cases callout, Top Institutions list, Spending Categories list, VendorTable, ARIA pattern rows, editorial closing prose + CTAs

---

*Plan: docs/SECTOR_PROFILE_REDESIGN_PLAN.md · 2026-05-04 · for /sectors/:id*
