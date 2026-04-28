# Changelog

All notable changes to the RUBLI Procurement Analysis Platform.

## [2.2.0] - 2026-04-28

### Editorial story system + Observatory rename

End-to-end audit of `/stories/*` against the dashboard's
Playfair-Italic-800 + sector-palette tile rhythm. Three real bugs
caught and fixed by walking all 10 published stories on production
with puppeteer.

#### Story graphics — DataPullquote redesign
- Card chrome now leads with a mono dateline (`APR 28 · 2026`) +
  section label (`FIGURE · COMPRANET`) + outlet badge + Playfair Italic
  800 number + section eyebrow + viz + caption. Mirrors the dashboard's
  "Headline Numbers" tile rhythm exactly.
- Quote demoted to smaller Playfair italic so the number leads.
- 14 viz templates → 6 disciplined families (proportion, threshold,
  gauge, sliver, era, null) routed through a `TEMPLATE_FAMILY` map. Old
  template names stay as a public-API alias so `story-content.ts`
  doesn't change. Removes speedometer, paper-receipt, sine-wave,
  hatching idioms that fell outside the editorial language.
- **Container queries** (`container-type: inline-size`) adapt the
  pullquote to its own rendered width — at <480px the chrome stacks
  vertically, padding tightens, stat drops to 32px. The same component
  now reads cleanly at 383 / 656 / 848 / 976px on the same page (the
  three widths produced by FeatureChapter / StandardChapter /
  ClosingChapter / data-spotlight chart variants).
- Accent precedence corrected: `statColor` hex (the editorial color
  set per-story in `leadStat.color`) wins over `outlet` (the journalism
  category). Hero, all pullquote stats, all left-borders, and viz fills
  now share one chromatic identity per story.

#### Story graphics — InlineCharts redesign
- New `ChartCard` chrome: mono eyebrow + Playfair serif title +
  optional Playfair Italic 800 anchor stat with mono caption. Mirrors
  the dashboard tile.
- Sector palette only — replaced the random violet/emerald/cyan/pink/
  lime grab-bag with sector tokens. Highlight rows route through
  `HIGHLIGHT_COLOR` (sector-salud), reference lines through
  `REFERENCE_COLOR` (sector-tecnologia), anchor stats through
  `ANCHOR_COLOR` (dashboard amber).
- All 6 chart types (DotGrid, Bar, Line, Area, Spike, DivergingBar)
  expose an anchor stat at the top via a `pickAnchor` helper.

#### Story hero
- Lead-stat number now applies `leadStat.color` (a hex) via
  `style={{ color }}` instead of `cn('font-bold', '#dc2626')` — the old
  pattern silently stripped the hex as an invalid class, so every
  story's hero number rendered in inherited link blue or accent amber
  instead of the intended sector color.
- Upgraded to Playfair Italic 800 to match the rest of the editorial
  surface.

#### Atlas → El Observatorio / The Observatory
- User-visible rename. Sidebar item, page hero, dashboard § 1 heading,
  story CTAs, lens-toggle aria-label all updated bilingually.
- Canonical route stays `/atlas` — preserves shared URLs in the wild
  and the `rubli_atlas_visited_v1` localStorage flag.
- New `/observatorio` and `/observatory` routes redirect to `/atlas`
  via `<Navigate replace>` so the new name is also a valid URL.
- Internal symbol names (Atlas component, ATLAS_STORIES, atlasMode)
  keep the legacy `atlas` prefix — renaming them is pure churn.

#### Header breadcrumb fix
- `/stories/:slug` paths now resolve to the canonical story headline
  via `getStoryBySlug()` (e.g. `el-ejercito-fantasma` →
  "El Ejército Fantasma"). Generic kebab-case fallback `slugToTitle()`
  covers any other slug URL — the dash-as-title pattern is gone
  platform-wide.

#### Deploy pipeline
- `deploy.yml`: `compose ps` now passes `--env-file .env.prod` to match
  the preceding `compose up`. Without it, the second command failed
  interpolation (`${RUBLI_WRITE_KEY:?...}`) and the entire deploy run
  was marked failed even when the site updated correctly. Three prior
  deploys had been red-but-shipping for the same reason; the badge is
  now honest again.

## [2.1.0] - 2026-04-07

### v3.0 Dossiers release + Atlas (V1–V7) + bilingual story system

Major frontend reset around the **dossier model**: 9 entity types each
with a 10-section editorial template. Sidebar reorganized into 5
sections (DESCUBRIR / INVESTIGAR / EXPLORAR / ANÁLISIS / PLATAFORMA).
Trust-manifest invariants enforced via `<EntityIdentityChip>`,
`getRiskLevelFromScore`, `formatVendorName`.

#### El Atlas / The Observatory (V1–V7)
- Full-viewport constellation page at `/atlas` — 1,200 dots, four
  lenses (PATTERNS / SECTORS / CATEGORIES / SEXENIOS), year scrubber
  2008–2025, smooth year morph via CSS transitions on cx/cy/fill-opacity.
- V2: pin a cluster, compare years (second canvas), risk-floor filter.
- V3: vendor typeahead across 21 curated vendors with auto-pin,
  localStorage-backed personal notes, mobile polish.
- V4: replay tours + URL state sharing (`?lens=&year=&pin=`) +
  share-view button.
- V5: first-visit auto-tour (rubli_atlas_visited_v1 flag), year-delta
  badges in cluster panel.
- V6: long-form multi-chapter narratives replace brief tours —
  *The Pharmaceutical Cartel* (6 ch · ~55s), *La Estafa Maestra*
  (6 ch · ~55s), *The COVID Year* (5 ch · ~45s). Each chapter has a
  Roman-numeral marker, year label, Playfair display title, 2-3
  sentence body, optional pull-stat, 6-12s dwell, pause/skip/replay
  controls.
- V7: Atlas promoted from PLATAFORMA to DESCUBRIR (centerpiece).

#### `/stories/:slug` long-form surface
- 10 original investigations derived from RUBLI data analysis
  (1.3M words of editorial content + verified statistics).
- Variant-aware chapter rendering: 7 layouts (`hero`, `feature`,
  `data-spotlight`, `quote-spotlight`, `connective`, `closing`,
  `standard`) auto-picked by `pickChapterVariant()` based on content
  shape.
- Hero artwork (cluster / grid / stamp variants) as decorative
  backdrop. Drop caps via CSS `::first-letter` (Playfair, accent-colored,
  5.4em hero / 3.6em feature).
- Atlas deep-link CTAs in chart chapters and closing chapters open the
  live constellation with prefilled `?lens=…&year=…&pin=…` state.
- Bilingual story content infrastructure (`headline_es`, `prose_es[]`,
  `pullquote.quote_es`, etc.) with English fallback. *El Ejército
  Fantasma* fully translated as the reference implementation.

#### `/journalists` newsroom
- Tiered editorial hierarchy: Lead story + Editor's Picks + Dossier.
- New components: `LeadStoryCard`, `EditorsPickCard`, `DataLeadsList`,
  `SectionBreak`, `NewsroomArtwork` (3 SVG variants: cluster / grid /
  spike).

#### Dashboard (Executive page)
- 4 redesigned headline-number tiles with Playfair Italic 800 numbers
  and unique micro-vizzes (yearly cubes / 100-dot OECD field / stacked
  100% bar / linear scale with marker).
- MacroArc — 23-year direct-award trend with inline COVID 2020 marker.
- § 1 The Observatory (was: The Atlas) at 220px as elevator pitch.

#### Spanish currency conventions (Mexican media)
- `formatCompactMXN()` locale-aware: ES uses MDP (millones de pesos)
  and *billones* (= English trillion).
- `localizeAmount(string, lang)` runtime parser converts legacy
  English-format strings (`"133.2B MXN"` → `"133,200 MDP"`).

#### Risk model v0.6.5
- Per-sector calibrated logistic regression with PU correction.
- Train AUC 0.798 / Test AUC 0.828 (vendor-stratified).
- Distribution: critical 6.01% / high 7.48% / medium 26.84% /
  low 59.39% — high-risk rate 13.49% (OECD 2-15% compliant).
- 9 active features: price_volatility, institution_diversity,
  vendor_concentration, price_ratio, network_member_count,
  same_day_count, win_rate, ad_period_days, direct_award.
- SHAP explanations table `vendor_shap_v52` with 456,266 rows.

#### ARIA pipeline v1.1
- Queue: 318,441 vendors — T1=320, T2=1,234, T3=5,016, T4=311,871.
- Patterns: P1 Monopoly (44), P2 Ghost (6,034), P3 Intermediary
  (2,974), P4 (220), P5 (3,985), P6 Capture (15,923), P7 (257).

#### User authentication
- JWT-based auth via python-jose + bcrypt (NOT passlib).
- POST `/api/v1/auth/{register, login, me, logout}`.
- Live on production from commit ce6ccaa (Apr 20 2026).

#### Editorial UI primitives (Mar 2026 sprint)
- `EditorialHeadline`, `HallazgoStat`, `FuentePill`, `MetodologiaTooltip`,
  `ImpactoHumano`, `RedaccionWidget`, `InvestigationLede`,
  `CronologiaVendor`, `CapturaHeatmap` (replaces /money-flow),
  `RedesKnownDossier` (replaces /network).
- Red Thread `/thread/:vendorId` — scroll-driven 6-chapter narrative.
- Story chart registry (9 charts wired through CHART_REGISTRY in
  StoryNarrative).

#### Frontend hardening
- Dot-chart consolidation: `DotBar` (single bar) + `DotStrip`
  (multi-row matrix) as the only canonical primitives. 50+ inline
  reimplementations across 25 files routed through these.
- Token-lint CI gate (`npm run lint:tokens`) — fails on raw hex
  literals or forbidden Tailwind classes (e.g. `text-red-400`,
  `bg-emerald-*`) re-entering `src/pages` or `src/components`.

## [0.6.0] - 2026-01-20

### Phase 6: Frontend Dashboard & Docker Support

Complete React frontend dashboard with Docker containerization.

#### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI framework |
| Vite | 7.3 | Build tool |
| TypeScript | 5.9 | Type safety |
| Tailwind CSS | 4.1 | Styling |
| TanStack Query | 5.90 | Data fetching |
| TanStack Table | 8.21 | Data tables |
| Recharts | 3.6 | Visualizations |
| React Router | 7.12 | Routing |
| Zustand | 5.0 | State management |

#### Pages Implemented

| Page | Route | Features |
|------|-------|----------|
| Dashboard | `/` | KPI cards, sector pie chart, risk distribution, trends, top vendors |
| Contracts | `/contracts` | Filterable table with pagination, search, risk badges |
| Vendors | `/vendors` | Card grid with risk scores, search, filters |
| Institutions | `/institutions` | Institution cards with type badges |
| Sectors | `/sectors` | Sector cards with risk breakdown bars |
| Risk Analysis | `/analysis/risk` | Placeholder for advanced visualizations |
| Export | `/export` | Data export options |
| Settings | `/settings` | Theme toggle, system info |

#### UI Components (shadcn/ui style)

- `Button` - Variants: default, destructive, outline, secondary, ghost, link
- `Card` - Header, title, description, content, footer
- `Badge` - Default + risk level variants (critical, high, medium, low)
- `RiskBadge` - Auto-colored badge from risk score
- `Skeleton` - Loading placeholder
- `Spinner` - Loading indicator
- `ScrollArea` - Radix scroll container
- `Tooltip` - Radix tooltips

#### Layout Components

- `MainLayout` - Full page layout with sidebar and header
- `Sidebar` - Collapsible navigation with icons and tooltips
- `Header` - Breadcrumbs, search, notifications, theme toggle

#### API Client

- Typed axios client with all backend endpoints
- 100+ TypeScript types matching Pydantic models
- Organized by domain: `sectorApi`, `contractApi`, `vendorApi`, `institutionApi`, `analysisApi`

#### Theme System

- Dark mode default (Grafana/Metabase style)
- Light mode support
- Zustand-persisted theme preference
- CSS custom properties for all colors
- Sector colors (12) and risk colors (4) as Tailwind theme extensions

#### Docker Support

**Production Stack (`docker-compose.yml`)**
- Frontend: nginx serving static build, proxies `/api/*` to backend
- Backend: Python 3.11 + FastAPI + uvicorn
- Health checks on both services
- Shared Docker network

**Development Stack (`docker-compose.dev.yml`)**
- Frontend: Vite dev server with hot reload
- Backend: uvicorn with `--reload` flag
- Volume mounts for live code changes

#### Files Added

**Frontend (all new)**
```
frontend/
├── Dockerfile              # Multi-stage production build
├── Dockerfile.dev          # Development with Vite
├── nginx.conf              # API proxy + SPA routing
├── src/
│   ├── api/client.ts       # Typed API client
│   ├── api/types.ts        # TypeScript types
│   ├── components/ui/      # 7 UI components
│   ├── components/layout/  # Sidebar, Header, MainLayout
│   ├── hooks/useTheme.ts   # Theme state
│   ├── lib/utils.ts        # formatMXN, cn(), etc.
│   ├── lib/constants.ts    # Colors, thresholds
│   ├── pages/              # 8 page components
│   └── App.tsx             # Router + providers
```

**Docker**
```
docker-compose.yml          # Production
docker-compose.dev.yml      # Development
backend/Dockerfile          # Python + FastAPI
.dockerignore               # Root ignore
backend/.dockerignore       # Backend ignore
frontend/.dockerignore      # Frontend ignore
```

#### Running the Application

```bash
# Production (nginx + FastAPI)
docker-compose up --build
# Frontend: http://localhost:3009
# Backend: http://localhost:8001

# Development (hot reload)
docker-compose -f docker-compose.dev.yml up --build

# Local development (no Docker)
cd backend && uvicorn api.main:app --port 8001
cd frontend && npm run dev
```

#### Build Stats

| Bundle | Size | Gzipped |
|--------|------|---------|
| index.js | 364 KB | 115 KB |
| charts.js | 371 KB | 110 KB |
| vendor.js | 48 KB | 17 KB |
| tanstack.js | 34 KB | 10 KB |
| index.css | 34 KB | 7 KB |

---

## [0.5.0] - 2026-01-16

### Phase 2: Institution Classification (v2.0 Taxonomy)

Complete overhaul of institution classification with 19-type taxonomy aligned with Mexican administrative law.

#### Taxonomy Enhancement

**From 13 types (v1.0) to 19 types (v2.0)**
- Split generic "decentralized" (245 records) into functional subtypes
- Added 6 new institution types: `state_enterprise_energy`, `state_enterprise_infra`, `state_enterprise_finance`, `health_institution`, `social_program`, `research_education`
- Reduced "decentralized" from 245 to 0 (100% migrated)
- Reduced "other" from 486 to 250 (48.6% reduction)

**New Classification Dimensions**
- **Size Tiers (5)**: mega, large, medium, small, micro (by contract volume)
- **Autonomy Levels (5)**: full_autonomy, technical_autonomy, operational_autonomy, dependent, subnational
- **Risk Baselines**: Each institution type has risk baseline (0.10-0.35)

#### Database Schema

**New Lookup Tables**
- `institution_types` - 19 rows with risk baselines
- `size_tiers` - 5 rows with contract thresholds
- `autonomy_levels` - 5 rows with autonomy definitions

**New Columns in institutions**
- `institution_type_id` - Foreign key to lookup
- `size_tier`, `size_tier_id` - Contract volume tier
- `autonomy_level`, `autonomy_level_id` - Governance autonomy

#### Classification Statistics

| Institution Type | Count | % | Risk Baseline |
|-----------------|-------|---|---------------|
| municipal | 1,811 | 40.6% | 0.35 |
| state_agency | 1,068 | 24.0% | 0.30 |
| educational | 514 | 11.5% | 0.20 |
| other | 250 | 5.6% | 0.25 |
| health_institution | 178 | 4.0% | 0.25 |
| social_program | 152 | 3.4% | 0.30 |
| (13 more types) | 483 | 10.8% | varies |

#### Risk Scoring Integration

**Factor 11: Institution Risk Baseline (3% weight)**
- Only adds risk if institution baseline > 0.25
- Municipal institutions (+3% max), social programs (+1.5%)
- Judicial/autonomous institutions (+0%)

#### REST API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/institutions` | GET | List with filters, pagination |
| `/api/v1/institutions/{id}` | GET | Detail view |
| `/api/v1/institutions/{id}/risk-profile` | GET | Risk breakdown |
| `/api/v1/institutions/types` | GET | List 19 types |
| `/api/v1/institutions/size-tiers` | GET | List 5 size tiers |
| `/api/v1/institutions/autonomy-levels` | GET | List 5 autonomy levels |

#### Data Quality

- **9 vendor-like records flagged**: Names containing "S.A. DE C.V." in institutions table
- **Classification confidence** tracked for each institution

#### Files Added
- `backend/scripts/create_taxonomy_lookup_tables.py` - Lookup table creation
- `backend/scripts/migrate_institutions_v2.py` - v1.0 to v2.0 migration
- `backend/scripts/reclassify_other_institutions.py` - Pattern-based reclassification
- `backend/scripts/populate_taxonomy_columns.py` - Size tier and autonomy population
- `backend/api/routers/institutions.py` - REST API endpoints
- `backend/api/models/institution.py` - Pydantic models
- `docs/INSTITUTION_TYPES_REFERENCE.md` - Reference documentation

#### Files Modified
- `backend/scripts/calculate_risk_scores.py` - Added Factor 11 (institution risk baseline)
- `backend/api/main.py` - Registered institutions router

---

## [0.4.0] - 2026-01-15

### Phase 4: Risk Scoring Enhancement

Enhanced the 10-factor IMF CRI-aligned risk scoring model by implementing 3 previously missing factors.

#### New Risk Factors Implemented

**Factor 5: Short Advertisement Period (10% weight)**
- Detects contracts with suspiciously short time between publication and contract date
- Thresholds: <5 days (full risk), <15 days (70%), <30 days (30%)
- Triggering rate: 416,278 contracts (13.4%)
- Data source: `publication_date` and `contract_date` columns

**Factor 9: Threshold Splitting (5% weight)**
- Detects potential contract splitting to avoid tender thresholds
- Pattern: Same vendor + same institution + same day = suspicious
- 114,224 splitting patterns detected in database
- Thresholds: 5+ contracts (full risk), 3-4 (60%), 2 (30%)
- Triggering rate: 341,631 contracts (11.0%)

**Factor 10: Network Risk (5% weight)**
- Leverages Phase 3 vendor deduplication results
- Vendors in same vendor_group have network exposure
- 11,774 vendors in 4,536 groups have network risk
- Thresholds: 5+ members (full risk), 3-4 (60%), 2 (30%)
- Triggering rate: 257,970 contracts (8.3%)

#### Risk Distribution (Current v0.5.0)

| Level | Count | Percentage |
|-------|-------|------------|
| Low | 2,460,644 | 79.12% |
| Medium | 646,026 | 20.77% |
| High | 3,347 | 0.11% |
| Critical | 0 | 0% |

*Updated: January 19, 2026*

#### Files Modified
- `backend/scripts/calculate_risk_scores.py` - Added 3 new factors, helper functions

---

## [0.3.0] - 2026-01-15

### Phase 3: Vendor Deduplication (Splink Implementation)

Implemented probabilistic record linkage using UK Ministry of Justice's Splink library for vendor deduplication.

#### Results
- **4,536 vendor groups** created
- **11,774 vendors deduplicated** (8.67% deduplication rate)
- **0 RFC conflicts** (tax ID validation enforced)
- Quality over quantity approach

#### Technical Implementation

**Splink Framework** (`backend/hyperion/splink/`)
- `framework.py` - Main deduplication orchestrator using Fellegi-Sunter model
- `config.py` - Configuration with generic token blocklists, subsidiary indicators
- `validator.py` - Quality validation with strict false positive prevention
- `reporter.py` - Persistence and markdown report generation

**Validation Rules (Strict False Positive Prevention)**
1. RFC Conflict Detection - Different tax IDs = reject
2. Personal/Company Mixing - "MARIA DE LAS MERCEDES" vs "MERCEDES BENZ" = reject
3. Subsidiary Detection - "PEMEX EXPLORACION" vs "PEMEX REFINACION" = reject
4. Generic Name Validation - "GRUPO ALFA" vs "GRUPO BETA" without RFC = reject
5. Name Length Mismatch - Significant length differences = reject

**Generic First Token Blocklist**
```
GRUPO, CONSTRUCTORA, CONSTRUCCIONES, COMERCIALIZADORA,
SERVICIOS, DISTRIBUIDORA, PROMOTORA, INMOBILIARIA,
OPERADORA, CONSULTORIA, PROVEEDORA, ADMINISTRADORA,
CORPORATIVO, INDUSTRIAL, EMPRESA, COMPANIA
```

#### Database Schema
- `vendor_groups` - Canonical vendor information
- `vendor_aliases` - Mapping of vendor_id to group_id

#### Files Added
- `backend/hyperion/splink/` - Complete Splink implementation
- `docs/DESIGN_VENDOR_DEDUPLICATION.md` - Technical design document

---

## [0.2.0] - 2026-01-08

### Vendor Classification System

#### Results
- 37,372 verified vendor industry classifications
- 74 industry categories mapped to 12 sectors
- Industry-sector mismatch detection (+3% risk bonus)

#### Files Added
- `backend/scripts/verified_vendor_data.py` - 5,000+ classification patterns
- `backend/scripts/apply_verified_classifications.py` - Classification application

---

## [0.1.0] - 2026-01-05

### Initial ETL Pipeline

#### Features
- Complete ETL pipeline for COMPRANET data (2002-2025)
- 3,110,017 contracts processed
- 4 data structures (A/B/C/D) normalized
- 12-sector taxonomy with ramo code mapping
- Data quality validation (100B MXN max, 10B MXN flag threshold)

#### Files Added
- `backend/scripts/etl_pipeline.py` - Main ETL orchestrator
- `backend/scripts/etl_create_schema.py` - Schema creation
- `backend/scripts/etl_classify.py` - Sector classification

---

## Risk Scoring Model Reference

### 10-Factor Model (IMF CRI Aligned)

| # | Factor | Weight | Status | Data Source |
|---|--------|--------|--------|-------------|
| 1 | Single Bidding | 15% | Active | `is_single_bid` |
| 2 | Non-Open Procedure | 15% | Active | `is_direct_award` |
| 3 | Price Anomaly | 15% | Active | `amount_mxn` vs sector mean |
| 4 | Vendor Concentration | 10% | Active | Calculated |
| 5 | Short Ad Period | 10% | **Active (v0.4.0)** | `publication_date` |
| 6 | Short Decision Period | 10% | Inactive | No data |
| 7 | Year-End Timing | 5% | Active | `is_year_end` |
| 8 | Contract Modification | 10% | Inactive | No data |
| 9 | Threshold Splitting | 5% | **Active (v0.4.0)** | Pattern detection |
| 10 | Network Risk | 5% | **Active (v0.4.0)** | `vendor_groups` |

### Additional Factors (Bonus, not part of base 100%)

| # | Factor | Weight | Status | Added |
|---|--------|--------|--------|-------|
| 11 | Industry-Sector Mismatch | +3% | Active | v0.2.0 |
| 12 | Institution Risk Baseline | +3% | Active | v0.5.0 |

### Risk Levels
- **Critical**: >= 0.6
- **High**: >= 0.4
- **Medium**: >= 0.2
- **Low**: < 0.2
