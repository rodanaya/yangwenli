# RUBLI Vendor Dossier — Canonical Scheme

> **The blueprint every vendor surface in RUBLI hangs off of.**
> Approved 2026-04-26. Synthesized from a 6-agent adversarial audit of how vendor 29277 (GRUPO FARMACOS ESPECIALIZADOS, 6,360 contracts) appears across the 28 surfaces in the platform.

---

## Concept

A **Vendor Dossier** is a self-contained, citable, shareable investigative file about ONE vendor. Every section answers a journalist's question. Every fact is anchored to a DB source. The dossier is the **single canonical view** — `/vendors/:id` and `/thread/:id` both render it (different formats: structured-tabs vs scroll-narrative). All other surfaces are **fragments** that point back to it via the `<VendorIdentityChip>` primitive.

## Personas

The dossier is built for 3 readers:

| Persona | Time budget | Wants |
|---|---|---|
| Journalist | 60s first read, 10min deep | Verdict + evidence + shareable copy |
| Regulator | 5min careful read | Provenance + methodology + citation chain |
| Funder / stakeholder | 30s skim | Lede + pattern + verdict |

---

## Structure — 10 sections (locked)

Each section has a fixed slot, an editorial purpose, and a known data source. Spanish kicker (editorial), English fallback for i18n.

### § 0 · Cabecera (Identity)
**Above-the-fold. 5-second read.**

Renders:
- Vendor name (`formatVendorName`) — sector dot — RFC pill
- Years active span (`2007-2020 · 14 años`)
- ARIA tier badge (T1/T2/T3/T4)
- 3-4 status badges: `GT confirmed · EFOS · SFP · ghost · is_false_positive`
- One-line verdict (`getVerdictSentence()` + clickable case anchor)

Data: `vendors.*`, `aria_queue.tier`, `aria_queue.ips_score`, `ground_truth_vendors`, `gt_external_efos`, `gt_external_sfp`, `ghost_companion_scores`

---

### § 1 · El Lede (Why this matters)
**80-word synthesized paragraph.**

Generated from: `aria_queue.memo_text` (preferred) OR template combining `case_name` + primary_pattern label + top_institution name + total_value.

Example output:
> "GRUFESA distribuyó **$133.2B MXN** en medicamentos al **IMSS** entre 2007-2020, capturando **35.2% del mercado** mediante **adjudicación directa (79%)**. Investigada por COFECE en 2018, vetada por AMLO en abril 2019, sancionada por SFP. Caso GT-36: IMSS Pharma Oligopoly."

Data: `aria_queue.memo_text` (5,800-char dossier currently invisible), `ground_truth_cases`, `vendor_stats`

---

### § 2 · La Captura (Institutional capture)
**Who they sell to.**

- Top 3 institutions with **% share** + **total value** + clickable to `/institutions/:id`
- "Capturado por [INSTITUTION] · [share]%" pill if `top_institution_ratio > 0.40`
- Sector-concentration sparkline
- Reciprocal: institution profile shows "captures vendor 29277 — X% of their pharma spend"

Data: vendor → institution joins on `contracts`, `vendor_stats`, `institution_stats`

---

### § 3 · El Patrón (The detected pattern)
**The fingerprint.**

- Primary pattern: **P1 Monopolio** / P2 Ghost / P3 Intermediary / P4 Cartel / P5 Capture / P6 Capture / P7 with confidence
- **Top 3 SHAP drivers** as DotBars (the model's actual reasoning)
- Sector-relative z-scores
- "Same pattern detected in N other vendors" → link to cluster

Data: `aria_queue.primary_pattern` + `aria_queue.primary_pattern_confidence` + `vendor_shap_v52` + `factor_baselines`

---

### § 4 · La Red (The network)
**Who they're connected to.**

- **Named cluster** (not "Community #15"): "IMSS Pharma Oligopoly Cluster — Maypo, PISA, DIMM"
- Top 5 co-bidders/partners with risk + tier badges
- Compact force-directed mini-graph (lazy-loaded — already exists)
- "Investigate cluster →" link to `/network/community/:id`

Data: `vendor_graph_features.community_id`, derived `community_label` (NEW BACKEND), `vendor_pairs_collusion` (NEW TABLE)

---

### § 5 · El Dinero (Money flow)
**The financial arc.**

- Year-by-year area chart with **annotated events** (regulatory action, AMLO veto, COVID)
- Direct-award rate vs sector baseline (DotBar comparison)
- Single-bid concentration
- Percentile rank: "Top 2% de proveedores en salud por valor total"

Data: `contracts` aggregations + `factor_baselines` + new `vendor_percentiles` table

---

### § 6 · La Cronología (Timeline)
**Birth → Peak → Death.**

- Vertical timeline: first contract → peak year → last contract
- Major events as pinned annotations (administration changes, regulatory actions, scandal dates)
- "Activity died after [event]" if applicable

Data: `contracts.contract_year` + `lib/administrations.ts` + case-specific events

---

### § 7 · Los Signos (External signals)
**Provenance of the suspicion.**

- GT case card (clickable to `/cases/:slug`)
- EFOS status with date
- SFP sanction with type + duration + date
- ASF audit findings
- Ghost companion score with breakdown
- Each badge with **citation**

Data: `ground_truth_vendors` + `ground_truth_cases` + `gt_external_efos` + `gt_external_sfp` + `gt_external_asf` + `ghost_companion_scores`

---

### § 8 · El Veredicto (Verdict + classification)
**The honest classification.**

4-way classification:

| Bucket | Color | Trigger |
|---|---|---|
| 🔴 Posible fraude | risk-critical | `fp_reason='active_or_captured:high'` AND GT case |
| 🟠 Capturado por institución | risk-high | `top_institution_ratio > 0.40` AND GT case |
| 🟡 Monopolio estructural | risk-medium | `is_false_positive=1` |
| ⚫ Patrón anómalo, sin caso | text-muted | High risk, no GT |

Plus: "What this vendor is NOT" — false-positive guard text.

Data: `ground_truth_vendors.fp_reason` + `ground_truth_vendors.is_false_positive` + derived classification

---

### § 9 · La Comparación (Peers)
**Anchor against similar vendors.**

- Auto-selected nearest peer → link to `/vendors/compare?a=29277&b=peer`
- 3 "if you found this interesting…" suggestions
- "X de N proveedores en [sector] · top Y%"

Data: new `vendor_peers` precomputed table OR live nearest-neighbor over `contract_z_features`

---

### § 10 · Acciones + Procedencia
**Action footer + provenance.**

Actions:
- Add to Dossier (workspace)
- Generate PDF (formal report — current GenerateReportButton)
- **NEW:** Generate press copy (140 char tweet / 280 char headline / 600-word lede)
- **NEW:** Download evidence pack (JSON + contracts CSV + memo .md zip)
- Share permalink

Provenance footer:
- Data sources with timestamps
- Methodology link
- Limitations note
- Citation pull-quote

Data: existing components + new `/api/v1/vendors/:id/dossier.zip` endpoint + `useDataFreshness()` hook

---

## How this scheme drives the 28 surfaces

The scheme creates **3 view formats** of the same dossier:

| Format | Route | Use case |
|---|---|---|
| **Structured Dossier** (10 sections, scrollable, anchored) | `/vendors/:id` | Reference / re-reading / regulator |
| **Narrative Thread** (6-chapter scroll-driven, cinematic) | `/thread/:id` | First read / share to colleague / demo |
| **Compact Chip** (`<VendorIdentityChip>`) | All 28 other surfaces | Always renders § 0 in a 80×24 px chip with hover-card showing § 1 lede + link to /thread |

The **chip is the unification primitive** all 6 audit agents converged on. It carries the dossier into AriaQueue, Watchlist, ContractDetail, CommandPalette, etc. Same data, same encoding, same badges everywhere.

---

## Trust manifest — invariants every vendor surface must respect

From the data-quality audit (vendor 29277):

1. **One canonical contract count + value per vendor.** Use `vendor_stats` (scored universe). `vendors.total_contracts` and `vendors.total_amount_mxn` are deprecated lifetime aggregates.
2. **One canonical avg_risk_score: `vendor_stats.avg_risk_score`.** Never `vendors.avg_risk_score` (mixed scored+unscored), never inline AVG over `contracts`.
3. **All risk-color/risk-level branching MUST go through `getRiskLevelFromScore` from `@/lib/constants`** with v0.6.5 thresholds (0.60/0.40/0.25). No local `if (score >= 0.5)` ladders.
4. **Rates are 0-1 in DB, rendered as `formatPercentSafe(x*100)` with explicit `*100`.**
5. **Score copy says "indicador de riesgo" or "similarity score" — never "% probability of corruption".** Per RISK_METHODOLOGY_v6.md.

---

## Implementation roadmap

### TIER 1 — Ship today (8 commits, ~2 hr work, all visible)

| # | Change | Section | Effort |
|---|---|---|---|
| 1 | Render `aria_queue.memo_text` on VendorEvidenceTab | § 1 + § 7 | 30m |
| 2 | "Build Investigation Thread →" CTA in VendorHero | § 0 actions | 5m |
| 3 | Fix Watchlist stale v4.0 thresholds | invariant 3 | 2m |
| 4 | EntityProfileDrawer "X% probability" → "Risk indicator: 0.NN" | invariant 5 | 5m |
| 5 | AnomalyLeadsWidget IPSBar → `getRiskLevelFromScore` | invariant 3 | 5m |
| 6 | ARIA tier badge in VendorHero | § 0 | 15m |
| 7 | GT case flag clickable → `/cases/:slug` | § 7 | 15m |
| 8 | `is_false_positive` distinguishing badge in PriorityAlert | § 8 | 30m |

### TIER 2 — Ship this week (6 changes, ~14 hr, structural)

| # | Change | Section | Effort |
|---|---|---|---|
| 9 | `<VendorIdentityChip>` primitive + roll out to 12 highest-traffic surfaces | drives 28 surfaces | 4h |
| 10 | Promote `getVerdictSentence()` → `lib/vendor/verdict.ts` | § 0 + chip | 1h |
| 11 | Switch surfaces to canonical `vendor_stats.*` | invariant 1+2 | 2h |
| 12 | `formatVendorName` enforced everywhere | trust | 1h |
| 13 | `useVendorData` becomes universal hook | architecture | 3h |
| 14 | `<CommunityClusterCard>` with derived label | § 4 | 3h |

### TIER 3 — Next sprint (5+ changes, half-day each)

| # | Change | Section |
|---|---|---|
| 15 | `/api/v1/vendors/:id/dossier.zip` endpoint + Download button | § 10 |
| 16 | Sector-percentile rank widget | § 5 |
| 17 | Captured-by reciprocal badge | § 2 |
| 18 | Fix EFOS/SFP Centinela ingestion gap | § 7 data |
| 19 | Mobile parity on EntityProfileDrawer + AriaQueue | drives 28 |

---

## Defending the design

1. **Spanish-first kickers** match the editorial bible (NYT/Economist cream broadsheet for Mexican procurement).
2. **Every section is buildable from existing data.** Three new tables (`community_label`, `vendor_pairs_collusion`, `vendor_percentiles`) are the only backend work.
3. **The 10 sections answer the journalist's questions in order**: Who → Why → Where → How → With Whom → How Much → When → Where's the proof → Compared to → What now.
4. **§ 8 verdict explicitly handles false-positive guard** — fixes the BAXTER/FRESENIUS/INFRA/PRAXAIR problem.
5. **§ 10 makes the dossier a SHAREABLE OBJECT, not a page** — the journalist takes it and uses it.
6. **The chip is the unification primitive** all 6 agents converged on.

---

*This document is the canonical reference. Every vendor-related commit must cite which section it implements (e.g. "feat(dossier § 1): render aria_queue.memo_text on VendorEvidenceTab").*
