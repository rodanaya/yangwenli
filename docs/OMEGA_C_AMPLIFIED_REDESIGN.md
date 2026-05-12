# Omega C — Amplified Geometric Redesign

> **Date**: 2026-05-05
> **Cycle**: Omega-C (after revert B)
> **Predecessor failure**: Omega A/B (2026-05-04/05) shipped *text* annotations on top of unchanged chart geometry. Anchor stats were pasted above bars, glossary lines below dot fields, taglines under lens toggles. The user's verdict was correct: "you put a little more text and now the elements are unreadable. I wanted an amplified redesign."
> **The Rule**: Cover all captions, labels, and anchor stats with your hand. If the chart still looks meaningfully different from the original, it is genuinely transformed. If it looks the same, the redesign is decoration, not omega.

---

## The Pudding mechanic, restated

Pudding pieces are not "regular charts with prose annotations." They are **bespoke encodings where the chart's geometry IS the editorial argument**.

| Piece | Mechanic (the *visual technique*, not the topic) |
|---|---|
| Trolley Problem | Cleveland-pair: two dots per row on a shared axis, the connector bar between them IS the story |
| How Birds Get Their Names | Each entry's *position on a single axis* encodes the story; row labels and chart axis are the same object |
| 30 Years of American Anxieties | One giant Playfair number IS the chart; the supporting time-series is demoted to a sparkline below the fold |
| Anatomy of a Spotify Song | Radial encoding where structural identifiers (verses, choruses, glyphs) become the chart axis |
| Hip-Hop Generations | Switching the lens *re-locates* the same dot population to new attractor positions via animated transitions |
| Margaret Hamilton | Vertical narrowing ladder where each rung is a stage in a reduction process |
| Where Slang Comes From | Sankey funnel where each filter node diverts dropped items into a side bar |

These are *transformations*, not decorations. Omega-C is the formal commitment to apply that mechanic to the 5 surviving target elements.

---

## Phase order (impact-first)

| # | Phase | Element | Effort | Why this order |
|---|---|---|---|---|
| 1 | omega-C-P1 | PesosAtRiskChart → Cleveland-pair | 1.5 days | Highest visual impact; current bars are the most generic; Cleveland-pair has zero dependencies |
| 2 | omega-C-P2 | LensVisualization → Hamilton ladder | 1 day | Concentric rings → vertical narrowing process; standalone, easy to verify |
| 3 | omega-C-P3 | MacroArc → giant 74% + sparkline | 1 day | Uses existing data; biggest "wow" on dashboard scroll; high-confidence implementation |
| 4 | omega-C-P4 | ConcentrationConstellation chrome → typographic glyph identifiers | 1.5 days | Touches a sacred component; reorganizes margin chrome only, dot field untouched |
| 5 | omega-C-P5 | Atlas constellation → animated lens morph | 2 days | Largest engineering surface (reuses sacred dot field but adds inter-lens animation); ship last so previous wins establish trust |

Total: ~7 days of focused implementation. Each phase is independently shippable; no shared file conflicts except P5 which touches Atlas.tsx (P4 only touches ConcentrationConstellation.tsx).

---

# omega-C-P1 — PesosAtRiskChart: Cleveland-pair geometry

### Current state
`frontend/src/pages/Executive.tsx` ~L731. Seven horizontal arrowhead/wedge bars per ARIA pattern (P5, P2, P6, P1, P3, P7, P4), each row showing a single magnitude (pesosBn) tapering left-to-right. Hybrid revert B keeps the bilingual pattern names + the methodology footnote.

### Pudding piece + mechanic
**Trolley Problem** — each row is a *pair of dots* on a shared horizontal axis. The connector between the dots is the story. The reader's eye is forced to read **the gap**, not the bar length.

### What changes geometrically
1. **Single shared X axis at top** — pesos in MXN, log scale spanning 10B → 500B. NOT one axis per row.
2. **Two dots per row** — left dot = "estimated overpayment IF this pattern were merely sectoral median" (counterfactual baseline); right dot = "actual estimated exposure" (the PATTERN_RISK pesosBn).
3. **Connector bar** between the two dots, colored by pattern severity. Bar **length** = the editorial finding (the gap = "what corruption costs vs. baseline").
4. **Rows ranked by gap width**, not absolute exposure. P5 still wins, but the *visual ranking* now answers "which pattern produces the largest *premium over baseline*", a far more interesting question than raw size.
5. **No tapered wedge, no arrowhead** — pure Cleveland geometry: two filled circles + one straight line. Right dot has a small numeric callout above it (the pesos figure); left dot has a faded baseline ghost.

### ASCII sketch — old vs new

```
OLD (wedge bars):
  P5  Sobreprecio Sistemático  ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰  240 MDP   → Investigar
  P2  Empresas Fantasma        ▰▰▰▰▰▰▰▰              95 MDP   → Investigar
  P6  Captura Institucional    ▰▰▰▰▰▰                78 MDP
  P1  Monopolio Concentrado    ▰▰▰▰▰                 64 MDP
  ...

NEW (Cleveland-pair):
                          baseline ◯-------------●  actual
  P5 Sobreprecio Sistemático
                10MDP            ○─────────────────────────●  240 MDP
  P2 Empresas Fantasma
                5MDP             ○────────────────●  95 MDP
  P6 Captura Institucional
                12MDP            ○──────────●  78 MDP
  P1 Monopolio Concentrado
                3MDP             ○─────────────●  64 MDP    ← biggest GAP
  P3 Intermediaria Uso Único
                2MDP             ○─────●  41 MDP
  P7 Red de Contratistas
                8MDP             ○────●  38 MDP
  P4 Colusión Licitaciones
                4MDP             ○──●  18 MDP

  ←—— shared log axis ——————————————————————————————————→
  10 MDP    50 MDP    100 MDP    250 MDP    500 MDP
```

### Encoding spec
- **X**: pesos MXN (log scale, 10B → 500B baseline; shared across all rows)
- **Y**: pattern code, ranked by gap width (left dot − right dot distance)
- **Left dot** (baseline): hollow circle (r=4), neutral border `var(--color-text-muted)`, opacity 0.7. Static.
- **Right dot** (actual): filled circle (r=6), pattern color (`#dc2626` critical / `#f59e0b` high), drop shadow. Animated draw-in.
- **Connector bar**: 2px line from left to right dot. Color = pattern color, opacity 0.55.
- **Pesos label**: above right dot, mono 11px bold, pattern color, locale-aware split (240 MDP / 240B MXN).
- **Investigate link**: end-of-row, `→ Investigar` chip, demoted to opacity 0.65, hover 1.0.
- **Animation**: connector draws left → right over 600ms with ease-out, staggered 80ms per row.

### Implementation
- **File**: rewrite `PesosAtRiskChart` function in `frontend/src/pages/Executive.tsx` ~L731-893.
- **Primitive**: NO existing primitive matches Cleveland-pair geometry on a shared log axis. Build a small inline component or extract `<ClevelandPair>` into `frontend/src/components/charts/ClevelandPair.tsx` if reuse seems likely (P4 candidates: nothing else; ship inline first, extract later).
- **Data extension**: add a `baselineMdp` field to `PATTERN_RISK` entries (P5: 10, P2: 5, P6: 12, P1: 3, P3: 2, P7: 8, P4: 4). Document the methodology shift in the footnote.

### "Cover the captions" test
Hand over labels: a reader sees seven horizontal Cleveland-pairs ranked by gap width on a shared log axis. The variable-length bars and dot-pair geometry are immediately distinguishable from a tapered wedge. **Pass.**

### Bilingual i18n keys (full list)
- `pesosAtRisk.axisLabel` → "Pesos at risk (MXN, log scale)" / "Pesos en riesgo (MXN, escala log)"
- `pesosAtRisk.baselineDot` → "if at sector median" / "si en mediana sectorial"
- `pesosAtRisk.actualDot` → "estimated exposure" / "exposición estimada"
- `pesosAtRisk.gapHeader` → "ranked by premium over baseline" / "ordenado por premio sobre línea base"
- `pesosAtRisk.investigate` → "→ Investigate" / "→ Investigar"
- `pesosAtRisk.totalExposure` → "Total estimated exposure" / "Exposición estimada total"
- `pesosAtRisk.federalContext` → "% of federal procurement · 23-yr baseline" / "% del gasto federal · base 23 años"
- `pesosAtRisk.methodology` → existing methodology string (carry forward unchanged)

### Anti-pattern to avoid
❌ Adding a "GAP" label or arrow over the connector. The geometry must speak. If a reader can't tell what the gap means by looking at the dot pair, the column header above the chart ("baseline ○ ─── ● actual") is the only allowed scaffold. NO inline tooltips, NO callout boxes, NO "← biggest gap" pointers in the chart body. The ranking does that work.

---

# omega-C-P2 — LensVisualization: Hamilton vertical ladder

### Current state
`frontend/src/pages/Executive.tsx` LensVisualization function ~L123-233. Five concentric rings, pulsing red core, "T1 PRIORIDAD" pill below. Reads as a target/scope graphic — visually static, conceptually generic ("we filter from outer to inner").

### Pudding piece + mechanic
**An Ode to Margaret Hamilton** — vertical narrowing ladder. Each rung represents a stage in a reduction process. Width of the rung shrinks as you go down. Reads top-to-bottom as a *process*, not a hierarchy.

### What changes geometrically
1. **Concentric rings → vertical stacked rungs.** Five horizontal bars stacked vertically, each ~15px tall. Width shrinks at each step (3.06M contracts wide → 320 vendors wide).
2. **Width of each rung is proportional to log(count)**. The visual narrowing IS the filtering process — the reader sees the cone shape collapse.
3. **Between each pair of rungs**, a thin downward-pointing reduction arrow (▼) labeled with what the filter rejects: "−2.86M ad-hoc" / "−2.74M low-risk" / "−180K medium" / "−5,151 T3".
4. **The final rung is the smallest** — width ≈ 30px, filled crimson, pulsing. Sits at the bottom of the cone like the apex of an inverted pyramid. The "T1 PRIORIDAD" label sits *inside* the rung, not below it.
5. **No more concentric rings, no compass ticks, no radial gradient core.** The whole shape is a downward funnel of decreasing rectangles.

### ASCII sketch — old vs new

```
OLD (concentric rings, target-style):
            .----------.
          /     ___      \
        |     /     \      |
        |    |   ●   |     |        ● = T1 core
        |     \_____/      |        ringR=16,32,48,72,96
          \              /
            '----------'
                T1 PRIORIDAD


NEW (Hamilton vertical ladder):

  ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰  3.06M  All federal contracts
                  │
                  ▼  −2.86M ad-hoc (no risk score)
                  │
       ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰  198K  Vendors with risk score
                  │
                  ▼  −192K below T3
                  │
            ▰▰▰▰▰▰▰▰▰▰▰▰▰▰  6.2K  Tier 1+2+3 pool
                  │
                  ▼  −5.9K below T1
                  │
                ▰▰▰▰▰▰  314  T1 priority dossier-ready
                  │
                  ▼  manual cross-check
                  │
                  ▰▰  165  GT-anchored cases (T1 PRIORIDAD)
```

### Encoding spec
- **Y**: filtration step (5 vertically stacked rungs)
- **Width of each rung**: `clamp(28, log10(count) × 16, 240)` px
- **Color**: outer rungs neutral `var(--color-text-muted)` 0.4 → progressively warmer as you descend → final rung crimson 1.0
- **Reduction arrow** (▼): small triangle glyph between rungs, mono 9px label `-{rejectedCount} {reason}`
- **Final rung**: filled `#dc2626`, white text inline `T1 PRIORIDAD · 314`, mono 11px bold
- **Animation**: rungs cascade in top→bottom 200ms each (total ~1s), arrows fade in after their lower rung settles

### Implementation
- **File**: rewrite `LensVisualization` function in `frontend/src/pages/Executive.tsx` ~L123-233.
- **Primitive**: no existing primitive. Inline SVG, ~70 lines. The old Lens props (`tiers: LensTier[]`) work as-is — same data structure, new rendering.

### "Cover the captions" test
Hand over the labels and reduction-reason strings: a reader sees five rectangles of decreasing width stacked vertically with arrows between them. Concentric circles are gone. The visual is unmistakably a downward narrowing process. **Pass.**

### Bilingual i18n keys
- `lens.title` → "From 3.06M contracts to 314 T1 priorities" / "De 3.06M contratos a 314 prioridades T1"
- `lens.rung.allContracts` → "All federal contracts" / "Todos los contratos federales"
- `lens.rung.scored` → "Vendors with risk score" / "Proveedores con puntaje de riesgo"
- `lens.rung.tieredPool` → "Tier 1+2+3 investigation pool" / "Conjunto de investigación T1+T2+T3"
- `lens.rung.t1Priority` → "T1 priority — dossier-ready" / "Prioridad T1 — listo para dossier"
- `lens.rung.gtAnchored` → "GT-anchored cases" / "Casos anclados en GT"
- `lens.reject.adhoc` → "ad-hoc · no risk score" / "ad-hoc · sin puntaje"
- `lens.reject.belowT3` → "below T3 threshold" / "debajo del umbral T3"
- `lens.reject.belowT1` → "below T1 threshold" / "debajo del umbral T1"
- `lens.reject.manualCheck` → "manual cross-check" / "verificación manual"
- `lens.t1Pill` → "T1 PRIORITY" / "T1 PRIORIDAD"

### Anti-pattern to avoid
❌ Keeping concentric rings and "adding" a vertical hierarchy on the side. ❌ Making the rungs gradient-shaded so the eye reads it as a flame instead of a stair. ❌ Adding a "→ Investigate" CTA inside the chart — the page already has one in the surrounding card. The chart is the process visualization; CTAs belong in the surrounding chrome.

---

# omega-C-P3 — MacroArc: Giant 74% + demoted sparkline

### Current state
`frontend/src/components/dashboard/MacroArc.tsx`. A continuous yearly DA-rate line 2002–2025 with admin wash bands, 4 callout boxes (Casa Blanca / Estafa / COVID / Toka), OECD 25% reference line. Currently 820×280 SVG dominating the dashboard hero. Hybrid revert B kept the OECD 25% fix.

### Pudding piece + mechanic
**30 Years of American Anxieties** — one giant Playfair Display number IS the chart. The supporting time-series is demoted to a small sparkline below the fold. The number is the headline; the line confirms it.

### What changes geometrically
1. **One huge typographic anchor on the LEFT 60% of the canvas**: `74%` in Playfair Display Italic 800, ~180–220 pt, color `#dc2626`. With small subtitle: "Mexico's 2025 direct-award rate".
2. **Below the giant number, a sub-anchor line**: "23 consecutive years above OECD's 25% ceiling" in mono 11px.
3. **The full 23-year timeseries collapses to a 320×80 sparkline on the RIGHT 40%** — same data as before, same OECD dashed reference, but tiny. Inline annotations become small triangle markers (▼ Casa Blanca, ▼ COVID, etc.) without text — text labels appear only on hover/focus.
4. **Era wash bands compress** to colored ticks under the sparkline x-axis (5 colored squares for Fox/Calderón/Peña/AMLO/Sheinbaum).
5. **The OECD 25% line stays** in the sparkline as a thin cyan dash. Mexico's line stays red. The geometry of the line chart is preserved but at 1/4 the visual weight of the giant number.

### ASCII sketch — old vs new

```
OLD:
┌──────────────────────────────────────────────────────────────────────────────┐
│ [  Casa Blanca  ]                                                              │
│        ╱╲                                                                       │
│       ╱  ╲___                ╲___╱╲                                            │
│      ╱       ╲___╱╲___╱╲___╱      ╲___╱╲                                       │
│  ___╱                                    ╲___╱                                  │
│  - - - - - - - OECD 25% - - - - - - - - - - - - - - - - - - - - - - - -        │
│  Fox    Calderón    Peña Nieto    AMLO    Sheinbaum                            │
│  2002        2008        2014        2020        2025                          │
└──────────────────────────────────────────────────────────────────────────────┘


NEW:
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│                                                  ╱╲    ╱╲                      │
│                                          ___╱╲__╱  ╲__╱  ╲___                  │
│                                        ╱                       ╲___            │
│   74%                                  - - - OECD 25% - - - - - - -            │
│                                        ▼      ▼     ▼  ▼                       │
│   ─────                                Fx Cl  PN     A  Sh                     │
│   Mexico's 2025                        2002  2014  2020  2025                  │
│   direct-award rate                                                             │
│                                                                                │
│   23 consecutive years above OECD's 25% ceiling                                │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
   ←─────────── 60% ───────────→  ←──────── 40% ────────→
       (one giant number)              (sparkline confirm)
```

### Encoding spec
- **Left panel**: ~480px wide
  - Giant number: Playfair Display Italic 800, 200pt, `tabular-nums`, `color: #dc2626` (inline style — never via cn() or className)
  - Sub-line 1: "Mexico's 2025 direct-award rate" / "Tasa de adjudicación directa de México 2025", mono 13px, text-secondary
  - Sub-line 2: "23 consecutive years above OECD's 25% ceiling" / "23 años consecutivos sobre el techo OCDE de 25%", mono 11px, text-muted
- **Right panel**: ~320×80 sparkline
  - X: year 2002–2025 linear
  - Y: DA rate 50–90% (compressed Y range; current 0–100% wastes space)
  - Mexico line: 1.5px stroke `#dc2626`
  - OECD line: dashed 0.8px `var(--color-text-muted)` at y=25%
  - Era wash: 5 colored ticks below x-axis (4×4px squares)
  - Annotations: small ▼ triangles at 2014/2017/2020/2023, hover reveals event name in tooltip
- **Animation**: giant number fades + scales from 0.92 → 1.0 over 600ms; sparkline draws in over 1.4s after the number lands

### Implementation
- **File**: rewrite `frontend/src/components/dashboard/MacroArc.tsx` (current ~478 lines → ~280 lines after).
- **Primitive**: standalone. The sparkline keeps the existing line-drawing math but at smaller dimensions. No need to extract.
- **Caveat**: the giant number color must use `style={{ color: '#dc2626' }}` — the April 2026 audit found that hex applied as className is silently stripped. CLAUDE.md is explicit about this.

### "Cover the captions" test
Hand over the giant "74%" and sub-text: the reader still sees a tiny line chart in the right corner. The proportions tell them this is a *secondary* visualization. The chart is geometrically transformed because 60% of the canvas is now type, not graph. **Pass.**

### Bilingual i18n keys
- `macroArc.heroNumber` → "74%" (data, language-invariant)
- `macroArc.heroSub1` → "Mexico's 2025 direct-award rate" / "Tasa de adjudicación directa de México 2025"
- `macroArc.heroSub2` → "23 consecutive years above OECD's 25% ceiling" / "23 años consecutivos sobre el techo OCDE de 25%"
- `macroArc.sparkAxisOECD` → "OECD 25%" / "OCDE 25%"
- `macroArc.sparkAxisMexico` → "Mexico" / "México"
- `macroArc.callout.2014` → "Casa Blanca · Oceanografía"
- `macroArc.callout.2017` → "Estafa Maestra"
- `macroArc.callout.2020` → "COVID emergency" / "Emergencia COVID"
- `macroArc.callout.2023` → "Toka IT monopoly" / "Monopolio TIC Toka"
- `macroArc.source` → existing source string

### Anti-pattern to avoid
❌ Keeping the line chart at 820×280 and adding a giant number above it — that's just stacking two things, not transforming. ❌ Putting the giant number INSIDE the chart canvas as a watermark — half-measures read as design failures. ❌ Sparkline at the bottom full-width: keep it small and to the side so the type/graph proportion is unmissable. ❌ Removing the OECD line from the sparkline — it's the editorial reference point, must stay.

---

# omega-C-P4 — ConcentrationConstellation: Typographic-glyph cluster identifiers

### Current state
`frontend/src/components/charts/ConcentrationConstellation.tsx`. The dot field is **sacred** (CLAUDE.md: constellation engine). Currently each cluster is identified by:
- A small ring (r ∝ √T1)
- A short text code below the ring (`P5`, `P3`, `SAL`, etc.)
- A persistent bilingual sub-label below that (omega-A leftover; one of the things hybrid revert B kept)
- A right-margin glossary explaining "1 dot ≈ 2K contracts / dot color = risk / ring size ∝ √T1"

The cluster identifiers feel pasted on. The right-margin glossary IS pasted on.

### Pudding piece + mechanic
**Anatomy of a Spotify Song** — radial-or-spatial encoding where the structural identifiers themselves become typographic glyphs that *are* the chart, not labels stuck to the chart. The naming schema becomes a visual vocabulary.

### What changes geometrically
1. **The right-margin glossary block is removed entirely.** The encoding becomes self-explanatory through visual choice.
2. **Cluster ring → custom typographic glyph.** Each ARIA pattern code (P1–P7) gets a hand-drawn SVG symbol that encodes its semantic:
   - **P1 Monopoly**: large solid disk (single dominant entity)
   - **P2 Ghost**: dashed-stroke hollow ring (insubstantial)
   - **P3 Intermediary**: arrow-through-circle (pass-through)
   - **P4 Collusion**: two overlapping rings (network)
   - **P5 Overpricing**: filled triangle pointing up (premium)
   - **P6 Capture**: nested ring inside ring (institutional capture)
   - **P7 Network**: three connected dots (multi-vendor)
3. **The glyph IS the cluster anchor.** It replaces the current geometric ring; it scales with √T1 (8–28 px). Mode toggle to SECTORS uses 12 sector ideograms (existing sector colors but as small geometric glyphs — a stylized hospital cross for salud, gear for infraestructura, etc.). SEXENIOS mode uses Roman-style year-range badges (`2018·24` for AMLO).
4. **Cluster code ("P5") moves INSIDE the glyph** when space allows, OR is removed entirely when the glyph is unmistakable (the disk/ring/triangle distinction is enough for repeat readers).
5. **Persistent sub-label (omega-A leftover) is removed** — the glyph carries the meaning. Hover/focus still reveals the full label in the tooltip.
6. **The dot field is untouched.** All 1200 Halton dots, all critical edges, all margin annotations (count + label leader lines on the right) stay exactly as today. This is purely a chrome transformation.

### ASCII sketch — old vs new

```
OLD (cluster ring + code + sub-label):
                                                  •  • •
                                                 •  ●●  •
                                                ╲╱  ●●  ╲╱       •
                                                 ●●●●●           •
                                                ╱ ○ ╲           •
                                                 P5
                                              Sobreprecio


NEW (typographic glyph carries identity):
                                                  •  • •
                                                 •  ●●  •
                                                ╲╱  ●●  ╲╱       •
                                                 ●●●●●           •
                                                  ▲             •
                                                                •
                                                                  ◯╌╌◯
                                                                   P2

  Where:  ▲ = P5 Overpricing (filled up-triangle)
          ●─● = P4 Collusion (two overlap rings)
          ◯╌╌ = P2 Ghost (dashed)
          → ●  = P3 Intermediary
          ●·●·● = P7 Network
          ⊙ = P6 Capture (nested rings)
          ⬤ = P1 Monopoly (large solid disk)
```

### Encoding spec
- **Glyph**: SVG path or composite of primitives, max bbox 28×28 px, color = pattern color
- **Glyph scale**: bbox = `clamp(8, sqrt(t1) * 1.6, 28)` px (replaces ringR)
- **Pattern code** (`P5`): inside glyph if circle/disk; below glyph at offset 14 if triangle/arrow (mono 8.5px, color matched, opacity 0.85)
- **Sector glyphs (mode=sectors)**: 12 simple geometric ideograms
  - salud: cross +
  - educacion: open book ▭▭
  - infraestructura: triangle filled (mountain)
  - energia: lightning ⚡
  - defensa: shield (rounded triangle)
  - tecnologia: rectangle outline (chip)
  - hacienda: dollar-like sigil
  - gobernacion: building (3 stacked rectangles)
  - agricultura: leaf shape
  - ambiente: drop
  - trabajo: hammer angle
  - otros: dot
- **Sexenios glyphs (mode=sexenios)**: Roman-style year badges, e.g., `MMXVIII` for 2018, with admin name below
- **Animation**: glyph fades + scales from 0.6 → 1.0 over 500ms with ease-out, staggered 70ms

### Implementation
- **File**: edit `frontend/src/components/charts/ConcentrationConstellation.tsx`, the `attractors.map((a, idx) => ...)` block ~L624-764. Replace the inner ring/text/sub-label rendering with a `<PatternGlyph type={meta.code} />` lookup. Keep the `transparent hit target circle` for click handling unchanged.
- **New file**: `frontend/src/components/charts/cluster-glyphs.tsx` — exports `PatternGlyph`, `SectorGlyph`, `SexenioGlyph` components, each parameterized by `(size, color, isHovered, isPinned)`.
- **Removed**: the `PATTERN_SHORT_LABEL` map (no longer needed), the right-margin glossary block ~L827-850.

### "Cover the captions" test
Hand over the cluster code labels and the right-margin glossary: a reader sees a dot field with **distinct geometric symbols** at attractor positions instead of identical circles. Even without text, the user can distinguish a triangle from a dashed ring from a nested ring. The chart is genuinely geometrically transformed because the cluster identifiers are now *visual symbols*, not text on rings. **Pass.**

### Bilingual i18n keys
The glyphs are language-invariant (the visual symbol carries the meaning), so i18n is only needed for tooltip + hover content, which is already keyed in `buildPatternMeta(isEs)` etc. Adds:
- `clusterGlyph.aria.P1` → "Monopoly glyph" / "Glifo monopolio"
- `clusterGlyph.aria.P2` → "Ghost company glyph" / "Glifo empresa fantasma"
- `clusterGlyph.aria.P3` → "Intermediary glyph" / "Glifo intermediaria"
- `clusterGlyph.aria.P4` → "Collusion glyph" / "Glifo colusión"
- `clusterGlyph.aria.P5` → "Overpricing glyph" / "Glifo sobreprecio"
- `clusterGlyph.aria.P6` → "Capture glyph" / "Glifo captura"
- `clusterGlyph.aria.P7` → "Network glyph" / "Glifo red"

### Anti-pattern to avoid
❌ Keeping the ring AND adding the glyph next to it — that's stacking, not transforming. ❌ Making the glyphs too literal/iconographic (a tiny pill-bottle for salud, a tank for defensa) — they should read as *abstract geometric type-marks* in the spirit of Eric Gill or Adrian Frutiger, not emoji. ❌ Removing the dot field — that's the sacred component. ❌ Keeping the right-margin glossary "as a fallback" — if the glyphs work, the glossary is dead weight; if they don't, the glossary is a confession of failure.

---

# omega-C-P5 — Atlas: animated lens morph (PATTERNS ⇄ SECTORS ⇄ CATEGORIES ⇄ TERMS)

### Current state
`frontend/src/pages/Atlas.tsx` (1979 lines) wraps `ConcentrationConstellation` with a year scrubber, lens toggle, pin/compare/x-ray controls. When the user toggles the lens, the dot field re-seeds with `mode === 'sectors' ? 27182 : ...` and the dots **snap** to new positions. There's already a CSS transition on `.atlas-dot { transition: cx 0.9s, cy 0.9s, ... }` — **but** the dots get re-keyed (`<g key={`atlas-${mode}`}>` at L552 forces remount), which kills the transition. The visual reads as recoloring + repositioning, not as an animated morph.

### Pudding piece + mechanic
**How Different Generations View Hip-Hop** — switching the lens *re-locates* the same dot population to new attractor positions. Each lens is a **different spatial layout of identical particles**, not the same layout with different labels. The transition between lenses is choreographed: dots travel along curved paths to their new homes.

### What changes geometrically
1. **Remove the `<g key={`atlas-${mode}`}>` remount.** The dots stay mounted across mode changes; only `cx`/`cy`/`fillOpacity` update. The existing CSS transition at L497-503 then animates them. (One-line geometric fix that unlocks everything else.)
2. **Identity preservation**: dots are keyed by `dot-${index}` not `dot-${level}-${index}-${mode}`. A dot that's a "critical, P5 cluster" dot at PATTERNS lens stays the SAME node when it becomes a "critical, salud cluster" dot at SECTORS lens. The `cluster` index changes; `level` is preserved.
3. **Stagger the morph**: instead of all 1200 dots moving simultaneously, group them by their *destination cluster* and stagger 0–600ms across clusters. The eye reads it as "the constellation reforms, cluster by cluster."
4. **Attractor glyphs morph too**: the rings/glyphs from P4 cross-fade with their new mode's glyphs. P5 triangle fades out as `salud` cross fades in at the same screen position.
5. **Edges re-route**: the nearest-neighbor critical edges (currently snap-redrawn) interpolate between old and new endpoints over the same 900ms.
6. **A timeline-style breadcrumb** at the top of the canvas shows lens history: `PATTERNS → SECTORS → CATEGORIES`. Tap any breadcrumb to morph back. (This is a small chrome addition that exposes the morph as a feature.)

### ASCII sketch — old vs new

```
OLD (lens toggle at top, snap on switch):
[ PATTERNS ] [ SECTORS ] [ CATEGORIES ] [ TERMS ]

   • •     ●●●     •           •  • •
  • ●●●     •     • •          • ●●●  ●●●
   • •         •●●●              •●●●  ●
                                      •●●●
       (PATTERNS layout)         (SECTORS layout — snap)


NEW (lens toggle + animated morph):
[ PATTERNS ] [ SECTORS ] [ CATEGORIES ] [ TERMS ]
   ↓                ↓
   trail history breadcrumb: PATTERNS → SECTORS

   • •     ●●●     •
  • ●●●     •     • •      → 200ms in →
   • •         •●●●

   ●●  ●●  ●●●●  ●          → 500ms in →
    ●  ●●● ●  ●  ●

   • • • ● ● ● ● ● ● ● ●    → 900ms in (settled) →
  •   •●●●●●●●●●●●●●●●●●●

   (each dot follows a curved trajectory to its new home;
    the eye sees the constellation REFORM, not snap)
```

### Encoding spec
- **Dot identity**: keyed by stable `dot-${i}` (i = Halton index 0..1199). Persists across mode changes.
- **Position interpolation**: CSS transition `cx 0.9s cubic-bezier(0.4, 0, 0.2, 1), cy 0.9s ...` (already in place, just needs to not re-mount).
- **Stagger**: `transition-delay: ${dotCluster * 60}ms` so dots in cluster 0 leave first, cluster 6 leaves last. Total morph window: 900ms + (nClusters × 60ms) ≈ 1.3s for patterns mode.
- **Attractor cross-fade**: old glyph opacity 1 → 0 over 400ms, new glyph 0 → 1 over 400ms with 100ms overlap. Glyph position uses the same CSS transition on cx/cy if the same code recurs (e.g., color clusters in different lenses).
- **Edges**: when mode changes, capture old edge endpoints, re-compute new ones, render N edges (N = max(old, new)) with linear interpolation and fade-out for any deleted.
- **Breadcrumb chrome**: top-of-canvas mono 9px "PATTERNS → SECTORS → CATEGORIES" with arrow glyphs, click any to morph there.

### Implementation
- **File**: edit `frontend/src/pages/Atlas.tsx` and `frontend/src/components/charts/ConcentrationConstellation.tsx`.
- **Critical edit**: in ConcentrationConstellation.tsx ~L552, change `<g key={`atlas-${mode}`}>` to plain `<g>`. Move the mode-keyed reveal animation onto a separate transient overlay group instead of re-keying the entire payload.
- **Refactor target**: useMemo in ConcentrationConstellation that builds `dots` currently re-runs on `[rows, activeMeta, mode, seedOverride]` change. We need it to keep the same i-th dot's level stable across mode changes. The seed-rotation logic (different seed per mode) is what creates the visual variety — keep it, but ensure the dot ARRAY index is stable so React reconciles them.
- **New primitive**: small `MorphBreadcrumb` component in `frontend/src/components/atlas/MorphBreadcrumb.tsx` showing the lens history.
- **Edge interpolation**: add `<MorphableEdges>` helper that captures previous endpoints in a ref and animates via CSS transition.

### "Cover the captions" test
Hand over the lens toggle labels and the breadcrumb text: when a user clicks `SECTORS`, the dots **physically travel** across the canvas to their new positions. The reader sees motion, not a swap. This is geometrically distinguishable from the current snap-replace behavior because **the same particle persists** through the transition. **Pass.**

### Bilingual i18n keys
- `atlas.morph.from` → "from {lens}" / "desde {lens}"
- `atlas.morph.to` → "to {lens}" / "a {lens}"
- `atlas.morph.breadcrumb.aria` → "Lens history. Click any to return." / "Historial de lente. Click para volver."
- `atlas.morph.lens.patterns` → "Patterns" / "Patrones"
- `atlas.morph.lens.sectors` → "Sectors" / "Sectores"
- `atlas.morph.lens.categories` → "Categories" / "Categorías"
- `atlas.morph.lens.sexenios` → "Terms" / "Sexenios"

### Anti-pattern to avoid
❌ Adding "smooth fade" between lens states (cross-fading two whole renders) — that's a transition effect, not a particle morph. The dots must keep their identity. ❌ Snapping dots to new positions and only animating the colors. ❌ Animating only the attractor rings and leaving the dots static. ❌ Building this as a third-party library (framer-motion layout, react-spring) — the existing CSS transition pipeline is already in place; the work is making the React reconciliation respect dot identity. ❌ Forgetting to verify with `git status` that `MorphBreadcrumb.tsx` and any new primitive files were `git add`-ed before commit. (Today's #1 silent failure per the brief.)

---

## Cross-cutting constraints (carry forward from omega v1)

1. **Spanish + English on every visible string** (mandatory). All keys listed per phase.
2. **Risk model = v0.8.5**. T1 count = 314, total contracts = 3.06M, scoring run May 2 2026.
3. **No green for low risk** (Bible §3.10). All "low" indicators use `text-text-muted`.
4. **Sector colors via `SECTOR_COLORS`** for fills; `SECTOR_TEXT_COLORS` for text on dark backgrounds.
5. **Hex strings via `style={{ color: hex }}` only** — never via cn() or className. The April 2026 audit found 10 stories with this exact bug (hex applied as class is silently stripped).
6. **`getRiskLevelFromScore` from `@/lib/constants`** — no inline thresholds.
7. **Build verification**: `npx tsc --noEmit && npm run build && npm run lint:tokens` from `frontend/` — all three must pass with zero errors before any phase ships.
8. **Verify file additions before commit**: `git status` between Write and commit. Today's brief explicitly flags this as the #1 silent failure mode.

## What is explicitly NOT in this plan

- ❌ "Add an anchor stat above the chart"
- ❌ "Add a glossary row"
- ❌ "Add a tagline"
- ❌ "Add a narrowing reason line"
- ❌ "Add a callout"
- ❌ Any "Add" that doesn't change geometry

If a future commit message starts with `feat(omega-c): add ...`, it is suspect. Omega is *transformation*, not *augmentation*.

---

## Per-phase commit plan

| Phase | Commit message | Files touched |
|---|---|---|
| omega-C-P1 | `feat(omega-c-P1): PesosAtRiskChart Cleveland-pair geometry` | `frontend/src/pages/Executive.tsx` |
| omega-C-P2 | `feat(omega-c-P2): LensVisualization Hamilton vertical ladder` | `frontend/src/pages/Executive.tsx` |
| omega-C-P3 | `feat(omega-c-P3): MacroArc giant 74% + demoted sparkline` | `frontend/src/components/dashboard/MacroArc.tsx` |
| omega-C-P4 | `feat(omega-c-P4): ConcentrationConstellation typographic glyph identifiers` | `frontend/src/components/charts/ConcentrationConstellation.tsx` + new `frontend/src/components/charts/cluster-glyphs.tsx` |
| omega-C-P5 | `feat(omega-c-P5): Atlas animated lens morph (dot identity preserved)` | `frontend/src/pages/Atlas.tsx`, `frontend/src/components/charts/ConcentrationConstellation.tsx` + new `frontend/src/components/atlas/MorphBreadcrumb.tsx` |

---

## Verification checklist (per phase)

Before declaring a phase done:

- [ ] Hand-over-the-captions test: cover all text; chart still reads as transformed
- [ ] Spanish + English keys present and rendered correctly under both `i18n.language` settings
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npm run build` passes with 0 errors
- [ ] `npm run lint:tokens` passes with 0 errors
- [ ] `git status` confirms all new files are staged before commit (esp. P4, P5)
- [ ] Visual diff screenshot: side-by-side of old vs new, posted to ACTIVE_WORK.md so reviewer can verify "covers-captions" rule at a glance

---

*Omega is transformation. If the user can't tell the chart changed without reading the labels, we shipped decoration.*
