# RUBLI Site Skeleton — The Grander Scheme

> **The whole-platform blueprint.** Not just vendors. Approved 2026-04-26.
> The Vendor Dossier (see `VENDOR_DOSSIER_SCHEME.md`) is one of NINE parallel dossier templates. This document defines all nine + the macro landings + the unifying grammar.

---

## Operating principle

RUBLI is an investigative intelligence platform for Mexican federal procurement (3.1M contracts, ~9.9T MXN, 2002-2025). Every page in the platform falls into ONE of three categories:

1. **DOSSIER** — deep view of one entity (9 entity types)
2. **MACRO LANDING** — synthesis across many entities (5 landings)
3. **TOOL** — user-driven workspace (3 tools)

That's it. **9 + 5 + 3 = 17 canonical view families.** Every other route is either a redirect, a tab inside a dossier, or a modal.

---

## The 9 Entity Dossiers

Each follows the same 10-section editorial template (defined in `VENDOR_DOSSIER_SCHEME.md`). Same kicker grammar (`§ 0 Cabecera, § 1 Lede, …`), entity-specific middle sections.

### 1. Vendor Dossier — `/vendors/:id` + `/thread/:id`

**Question answered:** Who got paid? In what pattern?

`/vendors/:id` (structured-tabs) and `/thread/:id` (scroll-narrative) **co-exist and render the same data** — different formats for different reading modes.

Sections: see `VENDOR_DOSSIER_SCHEME.md`.

### 2. Institution Dossier — `/institutions/:id`

**Question answered:** Who paid? With what governance health?

Spanish §-headers per the canonical grammar:
- § 0 Cabecera — name, type (federal/state/parastatal), sector, governance grade
- § 1 Lede — "Total spend $X MXN in [years]. Top category: [C]. Top vendor: [V]. Integrity grade: G."
- § 2 **¿Qué compró?** (What did it buy?) — top **categories** purchased with shares (← cross-link to Category Dossiers, the new landmark)
- § 3 ¿A quién le compró? — top vendors with loyalty/HHI concentration
- § 4 La Cronología Presupuestal — year-by-year spend with annotations
- § 5 Los Funcionarios — officials over administrations (cross-references)
- § 6 Las Auditorías — ASF audit findings + integrity grade history
- § 7 Los Signos — sanctions, alerts, ARIA-tier vendors concentrated here
- § 8 El Veredicto — institutional-capture classification (sano / asediado / capturado / scándalo)
- § 9 La Comparación — peer institutions in same sector
- § 10 Acciones + Procedencia

### 3. Sector Dossier — `/sectors/:id`

**Question answered:** What's the macro story for this sector (12 buckets)?

- § 2 Las Categorías — top categories within sector (cross-link)
- § 3 Los Proveedores Dominantes — top vendors by share
- § 4 Las Instituciones Compradoras — top institutions
- § 5 La Tendencia — spending over time
- § 6 La Comparación Sexenal — Fox/Calderón/Peña/AMLO/Sheinbaum
- § 7 Los Patrones — which fraud patterns dominate here
- § 8 La Salud del Sector — concentration + competition + risk verdict
- § 9 vs Otros Sectores
- § 10 Acciones

### 4. Category Dossier — `/categories/:id` ← **THE LANDMARK**

**Question answered:** WHAT was bought (and is the market healthy)?

This is the user-flagged "landmark" — RUBLI auto-classifies contracts into 91 spending categories that no manual taxonomy could maintain at this scale. Each category dossier turns "Medicamentos y Farmacéuticos" or "Carreteras y Vías" into a fully cross-referenced market analysis.

Worked example for Category 20 (Medicamentos y Farmacéuticos: 226,967 contracts, $1.03T MXN, 66.2% direct-award):

- § 0 Cabecera — `Medicamentos y Farmacéuticos · Salud · 91 categorías totales · $1.03T MXN`
- § 1 Lede — "México gastó $1.03T MXN en medicamentos durante 2002-2025 a través de 226,967 contratos. El 66% por adjudicación directa. Concentración: top 5 vendors = X% del mercado. Indicador de riesgo promedio: 0.32."
- § 2 **La Demanda** — top buying institutions (IMSS, ISSSTE, SEDENA…) with share + value + clickable
- § 3 **La Oferta** — top vendors (PISA, GRUFESA, MAYPO…) with HHI concentration + price spread + chips that link back to vendor dossiers
- § 4 **El Precio** — median price per typical contract size, IQR bands, outlier count, repeat-offender vendors
- § 5 **La Competencia** — direct-award rate vs sector benchmark, single-bid rate, unique vendors per year
- § 6 **La Estacionalidad** — monthly spend pattern, December rush percentile
- § 7 **Los Patrones** — which of P1-P7 concentrate here (e.g. P1 Monopoly hits pharma hard)
- § 8 **El Veredicto** — health classification: `competitivo / oligopólico / capturado / patrón anómalo`
- § 9 **La Comparación** — sister categories in same sector, ranked by health
- § 10 Acciones — Download market analysis, share permalink, generate price-intelligence brief

**Why this is the landmark:** before this taxonomy existed, the only options were "12 sectors" (too coarse) or "individual Partida codes" (too granular). 91 auto-classified categories is the unit at which a journalist can actually say "the milk-distribution category is captured by 3 vendors who collectively control 78% of the $X market".

### 5. Case Dossier — `/cases/:slug`

**Question answered:** What happened in this documented corruption case?

1,363 GT cases as of 2026-03. Sections render: vendors involved, institutions, financial impact, timeline, evidence chain, prosecutions, similar cases.

### 6. Pattern Dossier — `/patterns/:code`

**Question answered:** How does fraud pattern P1-P7 manifest?

- § 2 Vendors with this primary_pattern
- § 3 Cases that exemplify it
- § 4 Detection logic (model coefficients + thresholds)
- § 5 False-positive guard
- § 6 Historical trend
- § 7 Sector heat (where pattern concentrates)
- § 8 Verdict
- § 9 vs other patterns

### 7. Network Dossier — `/network/community/:id`

**Question answered:** Who is this cluster of co-bidders?

Replaces the anonymous "Community #15" with derived labels like "IMSS Pharma Oligopoly Cluster — Maypo, PISA, DIMM, GRUFESA". Members + risk distribution + dominant institution + dominant sector + detected patterns + named verdict.

### 8. Investigation Dossier — `/investigation/:id`

**Question answered:** What's in this user's active investigation?

User's working set. Vendors of interest, institutions, evidence accumulated, timeline, narrative draft, verification log. The personal workspace.

### 9. Story Dossier — `/stories/:slug`

**Question answered:** What's the published investigative narrative?

41 chart-driven scrollable stories. Dramatis personae, chronology, evidence pack, source links.

---

## The 5 Macro Landings (synthesis views)

### 1. Inteligencia Nacional — `/` (Dashboard)

The country-level brief. Today's top alerts across all entity types. Trending categories this week. Sexenio comparison strip. National Procurement Health Index. Top 3 stories. ARIA T1 leaderboard.

### 2. La Cola — `/aria`

The priority queue. IPS-ranked leads spanning vendors, cases, institutions, patterns. Filterable by tier (T1-T4) and pattern (P1-P7).

### 3. Sala de Redacción — `/journalists`

Newsroom. Published stories + drafts + tickers + assignments. Where editors work.

### 4. El Buscador — `/explore`

Faceted search across all entities. Type-filtered results render via `<EntityIdentityChip type="...">` — same chip grammar everywhere.

### 5. Brief Ejecutivo — `/executive`

C-suite / funder summary. Model accuracy. Coverage statistics. Cost-to-detect. Trust signals. Methodology citations. **The page that defends the platform.**

---

## The 3 Cross-cutting Tools

| Route | Tool | Purpose |
|---|---|---|
| `/workspace` | Watchlist + Dossiers + Saved Searches | User's working state |
| `/methodology` | Model documentation, transparency, limitations | Defending the rigor |
| `/captura` | Captura Heatmap (institution × sector capture map) | The visual macro |

---

## The unifying primitive: `<EntityIdentityChip>`

ONE component renders ANY entity in 80×24px. Used in lists, search results, navigation breadcrumbs, hovercards — everywhere a single entity appears outside its own dossier.

```tsx
<EntityIdentityChip
  type="vendor" | "institution" | "sector" | "category" | "case" | "pattern" | "network"
  id={29277}
  size="xs" | "sm" | "md"  // 16/24/32 px height
/>
```

Renders:
- Type icon (svg per entity type, consistent palette)
- Truncated name (`formatVendorName` / `formatInstitutionName` / sector name / category Spanish-name)
- Right-aligned context badges (risk pill / tier badge / status flag — one max)

On hover: pop-up showing `§ 1 Lede` summary + "Open Dossier →" CTA.
On click: navigate to canonical dossier route.

This is the glue between the 9 dossiers and the 28+ surfaces that mention entities.

---

## Cross-references — the dossier graph

Every dossier links systematically to others. The platform reads as a hypertext, not as 28 disconnected views.

```
Vendor § 2  ──→ Institution Dossier   (top buyer)
Vendor § 3  ──→ Pattern Dossier        (primary_pattern)
Vendor § 4  ──→ Network Dossier        (community membership)
Vendor § 7  ──→ Case Dossier           (GT case anchor)
Vendor § 9  ──→ Other Vendor Dossiers  (peer comparison)

Institution § 2 ──→ Category Dossier   (top categories) ← THE NEW LANDMARK CONNECTION
Institution § 3 ──→ Vendor Dossier     (top vendors)
Institution § 5 ──→ Case Dossier       (officials linked to cases)

Sector § 2  ──→ Category Dossier
Sector § 3  ──→ Vendor Dossier
Sector § 4  ──→ Institution Dossier
Sector § 7  ──→ Pattern Dossier

Category § 2  ──→ Institution Dossier
Category § 3  ──→ Vendor Dossier
Category § 7  ──→ Pattern Dossier
Category § 9  ──→ Sister Category Dossiers

Case        ──→ Vendor + Institution + Pattern + Network
Network     ──→ Vendor (cluster members)
Story       ──→ Case + Vendor (sources)
Pattern     ──→ Vendor (instances)
Investigation → ANYTHING (user's working set)
```

The killer move: **Category Dossier is the pivot** between Sector (macro) and Vendor (micro). It's the level at which a journalist can say "the milk-distribution market" or "the cancer-medication market" and get a real answer. Categories are also where Institution-vs-Vendor pricing comparisons become meaningful — a hospital paying 3x median for surgical gloves is meaningful only at the category level.

---

## Editorial design vision (preserved across all 17 view families)

| Element | Token |
|---|---|
| Background | `#faf9f6` (cream broadsheet) |
| Display headlines | Playfair Display, 600/700/900 weight |
| Body | Inter, 400/500/600 |
| Data / numbers | JetBrains Mono, tabular-nums |
| Section kickers | `text-[10px] font-mono uppercase tracking-[0.15em]` Spanish-first |
| Sector colors | `SECTOR_COLORS` from `lib/constants` (12 fixed) |
| Risk colors | `getRiskLevelFromScore` from `lib/constants` (v0.6.5: 0.60/0.40/0.25) |
| DotBars | `<DotBar value max color>` for all quantity ratios |
| StatRows | `<StatRow stats columns>` for label+value grids |
| Stacked flags | `<PriorityAlert flags>` |
| Editorial dateline | "BUILT BY RUBLI · DATA: COMPRANET 2002-2025 · UPDATED [auto from API]" |

**Bible §3.10:** No green for safety on a corruption platform. `low` risk renders as `text-text-muted`, NOT emerald.

---

## Implementation strategy — phased crunch

Don't build all 9 dossiers at once. Build the **glue** first, then the **highest-leverage dossiers**, then expand.

### PHASE 1 — Glue (this week, ~10 hr work)

The unifying primitive + the trust-manifest invariants from `VENDOR_DOSSIER_SCHEME.md`.

| # | Change | Effort |
|---|---|---|
| P1.1 | `<EntityIdentityChip>` primitive — supports all 7 entity types | 4h |
| P1.2 | `lib/entity/format.ts` — canonical name formatters per type | 1h |
| P1.3 | `lib/entity/lede.ts` — `getLedeFor(entity)` returns 80-word summary | 2h |
| P1.4 | `lib/entity/verdict.ts` — `getVerdictFor(entity)` returns classification | 2h |
| P1.5 | `useEntity(type, id)` hook — universal data fetcher with shared cache key | 1h |

After Phase 1, every existing surface that mentions an entity can swap its custom rendering for `<EntityIdentityChip>` and instantly inherit consistency.

### PHASE 2 — Three highest-leverage dossiers (next week, ~25 hr)

| Dossier | Why first |
|---|---|
| **Category** | The user-flagged landmark; minimal current implementation |
| **Vendor** (§ 1 lede + § 7 signos + § 8 verdict) | Already has VendorHero shell; complete the 10 sections |
| **Institution** (§ 2 categorías) | Cross-link target for Category — both must ship together |

### PHASE 3 — Remaining 6 dossiers (following 2 weeks)

Sector, Case, Pattern, Network, Investigation, Story — each follows the proven template.

### PHASE 4 — Macro landings refresh (final week)

Once dossiers are coherent, refresh the 5 landings to surface them prominently. Inteligencia Nacional becomes a "today's top dossiers across all 9 types" view.

---

## What "done" looks like

A journalist lands on RUBLI. They see Inteligencia Nacional (`/`). It shows them today's top alerts as `<EntityIdentityChip>` rows — vendors, categories, cases, institutions all in the same chip grammar. They click on a category chip ("Medicamentos y Farmacéuticos · risk 0.32 · oligopólico"). The Category Dossier opens. § 3 La Oferta shows GRUFESA as #1 vendor. They click GRUFESA. The Vendor Dossier opens. § 2 La Captura links them to IMSS. § 7 Los Signos links them to Case 36. They click § 10 "Generate press copy" and get a Spanish + English headline + 600-word lede. **Three clicks, four dossiers, one coherent story.**

That's the bar.

---

*This skeleton replaces the ad-hoc "28 surfaces" mental model. Every commit going forward must cite which of the 17 view families and which § section it implements.*
