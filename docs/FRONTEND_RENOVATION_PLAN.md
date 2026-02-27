# RUBLI Frontend Renovation Plan
## 10-Auditor Analysis — Complete Technical Specification

**Generated:** February 26, 2026
**Auditors:** 8 Opus agents across 2 waves (4 audit + 4 architecture)
**Scope:** Complete frontend renovation aligned with backend enhancements and new data layers

---

## Executive Summary

RUBLI has the data backbone of a world-class investigative tool. The backend contains:
- 120+ API endpoints, ~35 of which have zero frontend consumers
- 15,914 SFP + SAT EFOS sanction records cross-referenced to vendors — invisible in UI
- 43 documented Mexican procurement scandals (bilingual) — zero frontend consumption
- 1,837 co-bidding communities from Louvain detection — no community explorer
- 120 ML-generated investigation cases — partially surfaced
- Pre-built investigation reports for every vendor/institution/sector — no UI to trigger them
- Money flow data (institution→vendor) — Sankey diagram never built

The frontend has 25 solid pages but presents this rich data as a static dashboard collection. The renovation transforms it into a **genuine journalism investigation platform** — the standard set by ICIJ Datashare, OCCRP Aleph, and ProPublica's news apps.

**Total estimated effort: ~25-35 engineering weeks across 4 sections**

---

## Wave 1 Audit Findings

### Critical Gaps (from 4 parallel auditors)

| Gap | Impact | Status |
|-----|--------|--------|
| 35 backend endpoints with zero frontend client | Critical | Entire reports module, period comparison, institution hierarchy, ML investigation endpoints all unreachable |
| 43 Case Library scandals — zero frontend consumers | Critical | `/cases/*` endpoint family has never been wired to any frontend page |
| 15,914 SFP+EFOS records invisible | Critical | `external-flags` endpoint exists, data cross-referenced, never shown in UI |
| No cross-reference: vendor ↔ ground truth cases | Critical | 19 documented corruption cases, 92 vendor records — vendor profiles show nothing |
| No Sankey money flow | High | `/analysis/money-flow` endpoint ready, zero visualization |
| Navigation dead-ends everywhere | High | Investigation case vendors not clickable, sector → institutions missing, contract → price analysis missing |
| 4 dead page files (~1,574 lines) | Medium | MoneyFlow.tsx, RedFlags.tsx, TemporalPulse.tsx, DetectivePatterns.tsx |
| 3 unused components (~633 lines) | Medium | VirtualizedTable, FilterPresets, RelatedPanel — never imported |
| Zero mobile responsiveness | High | Fixed-px sidebar, no hamburger, no breakpoints in CSS |
| 4 test files for 25 pages | Medium | Essentially no test coverage |
| Split type system | Medium | 40+ TypeScript types in client.ts instead of types.ts |
| 7 API methods return `Record<string,unknown>` | Medium | Unsafe, no type checking |

### Innovation Research Findings (from ICIJ, OCCRP, ProPublica, OpenSanctions, ARACHNE, World Bank)

**Tier 1 patterns to adopt (must-have):**
1. **Waterfall/SHAP Risk Explanation** — per-entity breakdown showing which 16 factors drive the score, in plain language
2. **"Far and Near" Architecture** (ProPublica) — landing page = national overview + prominent "search YOUR institution" CTA
3. **Sankey Money Flow** (Influent/DARPA XDATA) — institution→vendor flows colored by risk
4. **Entity-Centric Navigation** (ICIJ/Maltego) — "Red Thread" panel on every entity page showing next investigation steps
5. **Progressive Disclosure** (Shneiderman mantra) — overview → zoom → details on demand
6. **Design System** (ICIJ Datashare 2024) — unified visual language across all pages

**Tier 2 patterns (differentiating):**
7. Cross-referencing panel (Aleph) — SFP/EFOS/ASF side-by-side with confidence labels
8. Investigation workspace (GIJN/Aleph) — pin, annotate, organize into case dossiers
9. Crossfilter/brushing explorer (OpenTender) — every filter connected
10. Benchmarking against peers (OpenTender) — every metric vs sector median, not in isolation
11. Confidence labels on connections (Aleph Pro) — RFC match (99%) vs name similarity (72%)
12. Smart defaults / Intelligence Feed (ARACHNE/GRAS) — surface most interesting findings first

---

## SECTION 1: Foundation & Data Connections

**Estimated effort: 10-12 engineering days**
**Goal:** Make the platform technically solid before adding new features. All following sections depend on this work.

### 1.1 Dead Code Purge

**Priority: 1 | Effort: S (half day)**

| File | Lines | Action | Notes |
|------|-------|--------|-------|
| `frontend/src/pages/MoneyFlow.tsx` | 666 | **Delete** | Content merged into ProcurementIntelligence; will be RESURRECTED as Sankey page in Section 3 |
| `frontend/src/pages/RedFlags.tsx` | 889 | **Delete** | Content merged into ProcurementIntelligence |
| `frontend/src/pages/TemporalPulse.tsx` | 10 | **Delete** | Pure redirect stub |
| `frontend/src/pages/DetectivePatterns.tsx` | 9 | **Delete** | Pure redirect stub |
| `frontend/src/components/VirtualizedTable.tsx` | 259 | **Delete** | Never imported; contracts page uses server-side pagination |
| `frontend/src/components/FilterPresets.tsx` | 172 | **Delete** | Never imported; Contracts has inline preset system |
| `frontend/src/components/RelatedPanel.tsx` | 202 | **Delete** | Never imported; Section 2 builds RedThreadPanel instead |

**Also clean orphan i18n namespaces** in `frontend/src/i18n/index.ts`: remove `patterns`, `temporal`, `moneyflow`, `redflags` imports and registrations.

### 1.2 API Client Methods — 37 Missing Wrappers

**Priority: 1 | Effort: L (2-3 days)**

Add all missing methods to `frontend/src/api/client.ts`:

**Tier 1 — High value, use immediately:**

| Method | Endpoint | Add to |
|--------|----------|--------|
| `reportApi.getVendorReport(id)` | `GET /reports/vendor/{id}` | New `reportApi` namespace |
| `reportApi.getInstitutionReport(id)` | `GET /reports/institution/{id}` | New `reportApi` namespace |
| `reportApi.getSectorReport(id)` | `GET /reports/sector/{id}` | New `reportApi` namespace |
| `reportApi.getThematicReport(theme)` | `GET /reports/thematic/{theme}` | New `reportApi` namespace |
| `reportApi.getAvailableReports()` | `GET /reports/` | New `reportApi` namespace |
| `vendorApi.getGroundTruthStatus(id)` | `GET /vendors/{id}/ground-truth-status` *(new backend endpoint)* | `vendorApi` |
| `vendorApi.getRiskWaterfall(id)` | `GET /vendors/{id}/risk-waterfall` *(new backend endpoint)* | `vendorApi` |
| `vendorApi.getPeerComparison(id)` | `GET /vendors/{id}/peer-comparison` *(new backend endpoint)* | `vendorApi` |
| `vendorApi.getLinkedScandals(id)` | `GET /vendors/{id}/linked-scandals` *(new backend endpoint)* | `vendorApi` |
| `vendorApi.getAiSummary(id)` | `GET /vendors/{id}/ai-summary` | `vendorApi` |
| `networkApi.getCommunityDetail(id)` | `GET /network/communities/{id}` *(new backend endpoint)* | `networkApi` |
| `analysisApi.comparePeriods(p1s, p1e, p2s, p2e)` | `GET /analysis/compare-periods` | `analysisApi` |
| `analysisApi.getInstitutionRiskFactors(limit)` | `GET /analysis/institution-risk-factors` *(new backend endpoint)* | `analysisApi` |
| `analysisApi.getModelMetadata()` | `GET /analysis/model/metadata` | `analysisApi` |
| `analysisApi.getFeatureImportance(sectorId?)` | `GET /investigation/feature-importance` | `analysisApi` |
| `analysisApi.getModelComparison()` | `GET /investigation/model-comparison` | `analysisApi` |
| `investigationApi.getTopAnomalousVendors(limit, sectorId?)` | `GET /investigation/top-anomalous-vendors` | `investigationApi` |
| `investigationApi.getVendorExplanation(id)` | `GET /investigation/vendors/{id}/explanation` | `investigationApi` |
| `investigationApi.runPipeline()` | `POST /investigation/run` | `investigationApi` |
| `investigationApi.getCaseExport(id)` | `GET /investigation/cases/{id}/export` | `investigationApi` |
| `investigationApi.getCaseAsfMatches(id)` | `GET /investigation/cases/{id}/asf-matches` | `investigationApi` |

**Tier 2 — Add for completeness:**

| Method | Endpoint |
|--------|----------|
| `institutionApi.compare(ids)` | `GET /institutions/compare` |
| `institutionApi.getHierarchy()` | `GET /institutions/hierarchy` |
| `institutionApi.getTypes()` | `GET /institutions/types` |
| `institutionApi.getSizeTiers()` | `GET /institutions/size-tiers` |
| `institutionApi.getOfficials(id)` | `GET /institutions/{id}/officials` |
| `vendorApi.compare(ids)` | `GET /vendors/compare` |
| `vendorApi.getVerified()` | `GET /vendors/verified` |
| `vendorApi.getClassification(id)` | `GET /vendors/{id}/classification` |
| `vendorApi.getAsfCases(id)` | `GET /vendors/{id}/asf-cases` |
| `contractApi.getRiskBreakdown(id)` | `GET /contracts/{id}/risk` |
| `contractApi.getPriceAnalysis(id)` | `GET /analysis/contracts/{id}/price-analysis` |
| `contractApi.getByVendor(id, page)` | `GET /contracts/by-vendor/{id}` |
| `contractApi.getByInstitution(id, page)` | `GET /contracts/by-institution/{id}` |
| `exportApi.downloadExcel(filters)` | `GET /export/contracts/excel` |
| `statsApi.getDatabase()` | `GET /stats/database` |
| `industriesApi.getAll()` | `GET /industries` |

### 1.3 Cross-Reference Connections — 8 Critical Links

**Priority: 1 | Effort: M (2 days)**

These are the most impactful UX fixes — they turn dead-ends into investigation threads:

| Gap | Fix | Files Changed | Effort |
|-----|-----|---------------|--------|
| Vendor → Ground Truth | Add badge in VendorProfile header: "Documented in [Case Name]" linking to `/cases/{slug}` | VendorProfile.tsx, EntityProfileDrawer.tsx | S |
| Contract modal → Sanctions | Add `SanctionsAlertBanner` if vendor is on SFP/EFOS, show above contract vendor info | ContractDetailModal.tsx | S |
| Vendor → Sanctions (demote) | Promote ExternalFlagsPanel from buried tab 5 to visible header banner | VendorProfile.tsx | S |
| Institution → Case Library | Add "Known Scandals" card to InstitutionProfile using `caseLibraryApi.getBySector()` | InstitutionProfile.tsx | S |
| Network graph → Sanctions | Add border color/icon overlay to vendor nodes that are on SFP/EFOS | NetworkGraph.tsx | M |
| Investigation case → VendorProfile | Wrap vendor names in `<Link to={/vendors/${vendorId}}>` | InvestigationCaseDetail.tsx | S (quick fix) |
| Case Library → Ground Truth | Add "View in Model Validation" link on CaseDetail when `ground_truth_case_id` is set | CaseDetail.tsx | S |
| Sector → Institutions drill-down | Add institution list table to SectorProfile using `institutionApi.getAll({sector_id})` | SectorProfile.tsx | M |

**Also fix Dashboard dead-ends:**
- Risk factor stat cards → link to `/contracts?risk_factor={factor}` (backend already supports `risk_factor` filter param)
- "Critical contracts" count → link to `/contracts?risk_level=critical`

### 1.4 Type System Consolidation

**Priority: 2 | Effort: M (1 day)**

Move ~40 types from `frontend/src/api/client.ts` to `frontend/src/api/types.ts`:

**Types currently in client.ts (move to types.ts):**
`GradeDistribution`, `StructureQuality`, `FieldCompleteness`, `KeyIssue`, `DataQualityResponse`, `MonthlyDataPoint`, `MonthlyBreakdownResponse`, `StructuralBreakpoint`, `StructuralBreaksResponse`, `TemporalEvent`, `TemporalEventsResponse`, `WatchlistItem`, `WatchlistChanges`, `WatchlistResponse`, `WatchlistItemCreate`, `WatchlistItemUpdate`, `WatchlistStats`, `NetworkNode`, `NetworkLink`, `NetworkGraphResponse`, `NetworkGraphParams`, `CoBidderItem`, `CoBiddersResponse`, `CommunityItem`, `CommunitiesResponse`, `PriceHypothesisItem`, `PriceHypothesesResponse`, `PriceHypothesisDetailResponse`, `MlAnomalyItem`, `MlAnomaliesResponse`, `FastDashboardResponse`

**Fix 7 unsafe `Record<string, unknown>` returns** in `analysisApi` and `investigationApi` — define proper interfaces based on actual backend Pydantic models.

**New types to add** (for new API methods above):
`VendorGroundTruthStatus`, `VendorWaterfallContribution`, `VendorReport`, `InstitutionReport`, `SectorReport`, `ThematicReport`, `ReportTypeSummary`, `FeatureImportanceItem`, `ModelComparisonItem`, `CommunityDetailResponse`, `ComparePeriodResponse`, `InstitutionRiskFactorResponse`, `RiskFeedback`

### 1.5 Missing shadcn/ui Components

**Priority: 2 | Effort: M (1-2 days)**

| Component | Status | Action | Used In |
|-----------|--------|--------|---------|
| `Input` | Missing file, imported by CaseLibrary | Create `components/ui/input.tsx` | CaseLibrary (immediate), SearchBars (Section 4) |
| `Tabs` | Missing, hand-rolled on 4 pages | Install from shadcn, replace hand-rolled in ExplorePage, Administrations, VendorProfile, InstitutionProfile | Section 3 Crossfilter Explorer needs this |
| `Table` | Missing, all tables are `<div>` grids | Install from shadcn — use for new data tables | Section 2 peer comparison, investigation case vendors |
| `Sheet/Drawer` | Missing, EntityProfileDrawer is custom 559 lines | Evaluate replacement — only if it reduces code; custom version is functional | Lower priority |

### 1.6 i18n Completion — ~240 Missing Keys

**Priority: 3 | Effort: L (2 days)**

| Page | Hardcoded Text | New Namespace |
|------|---------------|---------------|
| `NotFound.tsx` | Entire page in English | Add to `common.json` |
| `Limitations.tsx` | All 9 limitation descriptions + workarounds | New `limitations.json` namespace |
| `Methodology.tsx` | Large technical sections | `methodology.json` (extend) |
| `ModelTransparency.tsx` | Coefficient tables + descriptions | `methodology.json` (extend) |
| `GroundTruth.tsx` | Chart labels + descriptions | `methodology.json` (extend) |
| `Dashboard.tsx` hero | Model version line + several strings | `dashboard.json` (extend) |

**Fix model version hardcoding**: Replace `"Risk model v5.0.2"` string (Dashboard.tsx line ~587) with data from `analysisApi.getModelMetadata()` endpoint.

### 1.7 Navigation Dead-End Fixes

**Priority: 2 | Effort: S (half day)**

| Dead-End | Fix |
|----------|-----|
| Dashboard "Critical contracts" card → no filter link | Add `to="/contracts?risk_level=critical"` |
| Dashboard pattern cards → no filtered contract view | Add query param links per pattern |
| Contract detail → no price analysis | Add "See price analysis →" link in amount section |
| SectorProfile → no institution list | Add institutions table using `institutionApi.getAll({sector_id})` |
| InvestigationCaseDetail vendors → unclickable | Wrap in `<Link to={/vendors/${id}}>` |

### 1.8 Design System Baseline

**Priority: 3 | Effort: S (half day)**

- Define `.interactive` and `.interactive-card` CSS utilities as a consistent affordance pattern (ProPublica "Do Something Blue" principle — pick one color for all interactive elements)
- Document spacing scale in a comment block in `index.css` — standardize `gap-4`/`gap-6` usage
- Replace raw `RISK_COLORS[level]` references in `Contracts.tsx` with `<RiskBadge>` (already used in 13 other files)
- Add `font-weight` utility classes for the scale defined in index.css

---

## SECTION 2: Investigation Power-Ups

**Estimated effort: 4 weeks**
**Goal:** Transform RUBLI from a read-only dashboard into an active investigation workbench.

### New Backend Endpoints Required (Section 2)

| Endpoint | Purpose |
|----------|---------|
| `GET /vendors/{id}/ground-truth-status` | Returns `{ is_known_bad, cases: [case_id, scandal_slug, fraud_type] }` |
| `GET /vendors/{id}/risk-waterfall` | Returns average z-score features × model coefficients → per-feature contributions |
| `GET /institutions/{id}/risk-waterfall` | Same pattern for institutions |
| `GET /vendors/{id}/peer-comparison` | Returns `{ metrics: [metric, value, peer_median, percentile] }` |
| `GET /vendors/{id}/linked-scandals` | Returns scandals connected via ground truth |
| Modify `GET /cases/{slug}` | Add `linked_vendors: [{ vendor_id, vendor_name, contract_count, avg_risk_score }]` |
| Modify `GET /vendors/{id}/external-flags` | Add `match_method: 'rfc' | 'name_fuzzy'` and `match_confidence: number` |
| `GET /watchlist/folders` + full CRUD | New `investigation_folders` table |
| `GET /watchlist/export/{folder_id}` | Export folder as JSON dossier |

### New Frontend Components (Section 2)

| Component | Path | Purpose |
|-----------|------|---------|
| `WaterfallRiskChart` | `components/WaterfallRiskChart.tsx` | SHAP-style cumulative waterfall (Recharts) |
| `SanctionsAlertBanner` | `components/SanctionsAlertBanner.tsx` | Compact header-level sanctions summary |
| `RedThreadPanel` | `components/RedThreadPanel.tsx` | "Continue Investigation" navigation panel |
| `PercentileBadge` | `components/PercentileBadge.tsx` | Inline "P96" badge with color coding |
| `PeerComparisonBar` | `components/PeerComparisonBar.tsx` | Box-whisker with entity marker |
| `ReportModal` + `GenerateReportButton` | `components/ReportModal.tsx` | Full-screen report with print capability |
| `FolderSidebar` | `components/FolderSidebar.tsx` | Investigation case folder navigation |

### Feature Implementation Order

**Phase 1 — Week 1 (foundations):**

**F11: Clickable Investigation Case Vendors** | S | Priority 1
File: `InvestigationCaseDetail.tsx`
Change: Wrap vendor names in `<Link to="/vendors/{vendorId}">`. Add "View in Network" button. No backend changes needed — `vendor_id` already returned.

**F2: Ground Truth Case Badge System** | S | Priority 1
Files: `VendorProfile.tsx` (header section), `EntityProfileDrawer.tsx`, `api/client.ts`, `api/types.ts`
Change: New `vendorApi.getGroundTruthStatus()` call. If `is_known_bad`, show red banner: "Documented in [Case Name] → View Scandal" linking to `/cases/{slug}`.

**F3: Sanctions Alert Banner** | M | Priority 1
Files: `VendorProfile.tsx`, `SanctionsAlertBanner.tsx` (new), `api/client.ts`
Change: If `externalFlags` has SFP or EFOS definitivo/presunto data, render `SanctionsAlertBanner` immediately below vendor header (before tabs). Banner shows: "2 SFP sanctions | SAT EFOS: Definitivo | Match: RFC (99% confidence)". Keep full detail in existing tab 5.

**Phase 2 — Week 2:**

**F1: Waterfall Risk Explanation** | M | Priority 1
Files: `WaterfallRiskChart.tsx` (new), `VendorProfile.tsx`, `InstitutionProfile.tsx`, `api/client.ts`
Key insight: VendorProfile already has a `RiskWaterfallChart` but uses proxy calculations. Replace with real data from new `/vendors/{id}/risk-waterfall` endpoint.
Visualization: Recharts ComposedChart. Bars show each of 16 z-score feature contributions. Starting bar = sector baseline. Positive bars (red) push score up. Negative bars (blue/green) push down. Final bar = risk score.
Label example: `"price_volatility: +0.18"`, `"institution_diversity: -0.03"`

**F5: AI Summary Display** | S | Priority 2
File: `VendorProfile.tsx`
Change: Add "AI Pattern Analysis" card in Overview tab. Fetch `/vendors/{id}/ai-summary`. Render insights as bulleted list with risk-colored icons. No backend changes — endpoint exists.

**F4: Case Library Integration** | M | Priority 2
Files: `CaseDetail.tsx`, `VendorProfile.tsx`, `api/client.ts`, `api/types.ts`
Changes: (a) CaseDetail gets "Linked Vendors in COMPRANET" section after key actors, (b) VendorProfile gets "Linked Scandals" card using ground truth status data. Bidirectional linking.

**Phase 3 — Week 3:**

**F6: Red Thread Navigation Panel** | M | Priority 2
File: `RedThreadPanel.tsx` (new), `VendorProfile.tsx`, `InstitutionProfile.tsx`
For vendors: "3 co-bidding partners • 1 active investigation case • On SAT EFOS list • 2 documented scandals"
For institutions: "12 high-risk vendors • P78 concentration • ASF finding pending • 1 documented scandal"
Each item is a `<Link>` chip. Data from queries already fetched on the page (no new API calls for most items).

**F7: Peer Benchmarking Badges** | M | Priority 3
Files: `PercentileBadge.tsx` + `PeerComparisonBar.tsx` (new), `VendorProfile.tsx`, `InstitutionProfile.tsx`
Change: Add "P96 in Salud sector" badge next to win rate, concentration ratio, risk score on stat cards. Uses new `/vendors/{id}/peer-comparison` endpoint.

**Phase 4 — Week 4:**

**F8: Report Generation UI** | L | Priority 3
Files: `ReportModal.tsx` + `GenerateReportButton.tsx` (new), `VendorProfile.tsx`, `InstitutionProfile.tsx`, `SectorProfile.tsx`
Change: "Generate Report" button calls existing `/reports/*` endpoints. Renders structured JSON in a full-screen modal optimized for `window.print()`. PDF via browser print dialog.

**F9: Investigation Workspace Evolution** | L | Priority 3
Files: `Watchlist.tsx` (refactor), `FolderSidebar.tsx` (new), backend
Changes: Add folder sidebar (left column), dossier CRUD, "Export Dossier" button per folder, rich textarea for notes. New backend table: `investigation_folders`.

**F10: Model Comparison Page Upgrade** | M | Priority 4
File: `ModelTransparency.tsx`
Change: Replace hardcoded coefficient arrays with live data from `/investigation/feature-importance` and `/investigation/model-comparison`. Add sector selector. Add per-sector coefficient heatmap.

---

## SECTION 3: Follow the Money & Discovery

**Estimated effort: 50-80 engineering hours**
**Goal:** Make RUBLI's data visually discoverable through linked, explorable visualizations.

### Library Decisions

| Visualization | Library | Justification |
|--------------|---------|---------------|
| Sankey diagram | `d3-sankey` + React SVG | No Sankey in Recharts. d3-sankey is 4KB pure math — React owns the DOM |
| Sexenio cycle chart | Recharts ComposedChart | Already used in Administrations.tsx |
| Threshold gaming | Recharts BarChart | Consistent with existing patterns |
| Publication delay | Recharts AreaChart + BarChart | Trend + distribution |
| Institution risk heatmap | CSS Grid + inline styles | Same pattern as existing admin-sector matrix |
| Crossfilter treemap | Recharts Treemap | Already used in Dashboard |
| Community list | shadcn Card list | Simple scrollable with click |

### Feature 1: Sankey Money Flow Visualization

**Priority: 1 | Effort: L | Journalist Impact: Highest**

The single most powerful "follow the money" visualization. Institution→vendor flows colored by risk level, thickness = contract value.

**Where it lives:** Resurrect `pages/MoneyFlow.tsx` (currently dead code) as the dedicated Sankey page at `/money-flow`. Add to sidebar under "THE MONEY" group.

**Data flow:** `analysisApi.getMoneyFlow({ sector_id, year, limit })` → `d3-sankey` layout computation → React SVG rendering

**Interaction design:**
- Left column = institutions (sorted by total spend, color = risk level)
- Right column = vendors (sorted by received value, color = risk level)
- Flow thickness = contract value
- Flow color = gradient from institution risk to vendor risk (red=critical, orange=high)
- Click a flow → opens ContractDetailModal filtered to those contracts
- Hover → tooltip with amount + contract count + avg risk
- Filters: sector selector (top), year range selector, risk level toggle

**Component structure:**
```
pages/MoneyFlow.tsx (resurrected)
  SankeyControls (sector/year/risk filters)
  SankeyDiagram (new component)
    d3-sankey layout math
    React SVG rendering (nodes + paths)
    NodeTooltip
    FlowTooltip
  ContractListPanel (slide-out when flow clicked)
```

**New files:** `components/SankeyDiagram.tsx`, `components/SankeyControls.tsx`

### Feature 2: Crossfilter Procurement Explorer

**Priority: 2 | Effort: L | Journalist Impact: High**

Complete rewrite of ExplorePage as a coordinated multi-view explorer where every panel filters all others. Embodies Shneiderman's mantra: Overview → Zoom → Details on demand.

**Layout:**
```
[Sector Treemap | Time Series + Brush]
[Risk Distribution Strip              ]
[Vendor/Institution Results Table     ]
```

**All filtering is URL-synced and server-side** (3.1M records cannot be client-side filtered).

**New hook:** `frontend/src/hooks/useExplorerFilters.ts` — typed URL params using `nuqs`, provides `{ sectorId, yearStart, yearEnd, riskLevels, searchText, setters }`

**Interaction design:**
- Treemap click → sets `sector_id` filter, others dim
- Time series brush → sets `year_start`/`year_end`, `<ReferenceArea>` overlay
- Risk bar click → toggle risk levels (multi-select)
- Filter chips above table → removable active filters
- Row click → navigate to `/vendors/{id}` or `/institutions/{id}`

**Files to create/modify:**
- `pages/explore/ExplorePage.tsx` (complete rewrite)
- `pages/explore/SectorTreemapPanel.tsx` (new)
- `pages/explore/TimeSeriesPanel.tsx` (new, with brushing)
- `pages/explore/RiskDistributionStrip.tsx` (new)
- `pages/explore/ResultsTable.tsx` (new)
- `hooks/useExplorerFilters.ts` (new)
- Remove: `VendorsTab.tsx`, `InstitutionsTab.tsx`, `TrendsTab.tsx` (absorbed)

### Feature 3: "Far and Near" Dashboard Restructure

**Priority: 2 | Effort: M | Journalist Impact: High**

Restructure Dashboard hero from "aggregate stats only" to "aggregate story + investigation entry point" (ProPublica pattern).

**New hero layout (two-column):**
```
LEFT (60%):                           RIGHT (40%):
  8.0T MXN in procurement             [Search icon]
  3.1M contracts • 2002-2025          Search any vendor, institution...
  Risk model v5.0 • AUC 0.960        [Autocomplete input]

                                      Popular: IMSS, PEMEX, Segalmex, CFE
```

**Replace static "Key Metrics" with Intelligence Feed** (3 dynamic cards):
1. **Highest-risk active lead** — from `ground_truth_smoking_gun` (already in fast dashboard response)
2. **Biggest recent anomaly** — from `/analysis/leads?limit=1`
3. **Trending sector alert** — sector with largest YoY risk increase

**New files:** `components/GlobalSearch.tsx` (autocomplete), `components/IntelligenceFeed.tsx` (3 dynamic cards)

### Feature 4: Political Cycle Analysis

**Priority: 3 | Effort: M | Journalist Impact: High**

Shows how procurement patterns change across Mexico's 6-year sexenio cycle.

**Integration:** New "Political Cycle" tab on Administrations page (`/administrations`).

**Key discovery:** `analysisApi.getPoliticalCycle()` binding already exists at `client.ts:825`. `PoliticalCycleResponse` type already exists at `types.ts:1247`. **This is purely frontend UI work.**

**Visualizations:**
1. Sexenio cycle bar chart: 6 bars (Year 1-6), height = avg risk, overlaid direct_award_pct line
2. Election year comparison: side-by-side stat cards (election vs non-election: risk score, DA rate, SB rate)
3. Q4 interaction matrix: 2×2 CSS grid (election/non-election × Q4/Q1-Q3)

**Framing:** "Year 1 (new administration)", "Year 6 (transition year)" — institutional patterns, not partisan analysis.

**File modified:** `pages/Administrations.tsx` (add new tab)

### Feature 5: Threshold Gaming Deep-Dive

**Priority: 3 | Effort: S | Journalist Impact: Medium-High**

Shows contracts clustered just below LAASSP mandatory bidding thresholds — a documented fraud indicator (Szucs 2023, Coviello et al. 2018).

**Integration:** New card on ProcurementIntelligence page.

**Key discovery:** API binding exists at `client.ts:835`. Types exist at `types.ts:1318`. **Frontend UI only.**

**Visualizations:**
1. Summary stat card: "X,XXX contracts (Y.Y%) clustered within 5% below LAASSP thresholds"
2. Sector breakdown horizontal bar chart

**File modified:** `pages/ProcurementIntelligence.tsx`

### Feature 6: Publication Delay Transparency

**Priority: 4 | Effort: S | Journalist Impact: Medium**

Shows how long government takes to publish contract data — data latency is itself a transparency metric.

**Integration:** New card on InstitutionHealth page.

**Key discovery:** API binding exists at `client.ts:830`. Types exist at `types.ts:1267`. **Frontend UI only.**

**Visualizations:** Distribution bars (1-7 days green → >90 days red) + trend line (is transparency improving?)

**File modified:** `pages/InstitutionHealth.tsx`

### Feature 7: Community Explorer

**Priority: 3 | Effort: M | Journalist Impact: High**

Browse the 1,837 co-bidding communities detected by Louvain, sorted by avg risk. Click a community → see all vendors in it.

**Integration:** New sidebar panel on NetworkGraph page, toggled via "Communities" button.

**Backend addition:** `GET /network/communities/{community_id}` — returns all vendor IDs in community.

**UI:** Scrollable list with community cards: "Community #42 — 23 vendors — Avg risk: 0.67 — Top: CONSTRUCTORA X, GRUPO Y"

**Files modified/created:** `NetworkGraph.tsx`, `components/CommunityList.tsx` (new), `api/routers/network.py` (new endpoint)

### Feature 8: Co-Bidding Collusion Panel

**Priority: 3 | Effort: S | Journalist Impact: High**

**Key discovery:** `CoBiddersResponse` already returns `win_count`, `loss_count`, `same_winner_ratio`, and `suspicious_patterns` with cover bidding / bid rotation detection. **VendorProfile fetches this data but renders only names.**

**Change:** Enhance the existing Network tab in VendorProfile:
1. Per-partner stats: Name, Shared Procedures, Win/Loss Together, Same Winner Ratio, Strength
2. Suspicious patterns alert cards: "Cover Bidding: Vendor X always loses when bidding with this vendor"
3. Mini RadarChart for vendors with 3+ co-bidders (Recharts RadarChart, already exported)

**File modified:** `pages/VendorProfile.tsx` (Network tab section)

### Feature 9: Period Comparison Tool

**Priority: 4 | Effort: M | Journalist Impact: Medium**

Let users define two arbitrary time periods and see how procurement changed. Preset buttons for each presidential administration.

**Integration:** New "Compare" tab on Administrations page.

**New API method needed:** `analysisApi.comparePeriods(p1Start, p1End, p2Start, p2End, sectorId?)` — backend endpoint already exists at `GET /analysis/compare-periods`.

**UI:** Two period selectors + "Compare" button → comparison table with metric deltas highlighted in red where significant.

**Files modified:** `pages/Administrations.tsx`, `api/client.ts` (add binding)

### Feature 10: Institution × Risk-Factor Heatmap

**Priority: 4 | Effort: M | Journalist Impact: Medium-High**

Heatmap where rows = top institutions, columns = risk factors. Shows each institution's "fingerprint" of risk relative to sector baseline.

**New backend endpoint:** `GET /analysis/institution-risk-factors?limit=30` — returns per-institution rates for 6 factors + sector baselines.

**Visualization:** CSS Grid with inline background-color from diverging scale (blue=better, red=worse than baseline). Same pattern as existing admin-sector matrix.

**Files:** `pages/InstitutionHealth.tsx`, `components/InstitutionRiskHeatmap.tsx` (new), `api/routers/analysis.py` (new endpoint)

---

## SECTION 4: Journalism Workspace & Platform Architecture

**Estimated effort: 10 weeks across 5 sprints**
**Goal:** Professional journalism workspace, platform architecture, and operational maturity.

### 4.1 Information Architecture Redesign

**Priority: 1 | Effort: M | Must happen first — everything else depends on it**

**New route map:**
```
/                    → Landing (Scrollytelling for first-time visitors)
/dashboard           → Intelligence Dashboard
/explore             → Crossfilter Explorer (Section 3)
/sectors             → Sector Overview
/sectors/:id         → Sector Profile
/contracts           → Contract Search
/institutions/health → Institution Rankings
/network             → Network Graph Explorer
/administrations     → Temporal + Political Analysis
/investigation       → Investigation Queue
/investigation/:id   → Case Detail
/cases               → Case Library
/cases/:slug         → Scandal Detail
/workspace           → Investigation Workspace (replaces /watchlist)
/workspace/board/:id → Investigation Board
/vendors/:id         → Vendor Profile
/institutions/:id    → Institution Profile
/methodology         → Unified Methodology (merges ModelTransparency + GroundTruth)
/limitations         → Limitations
/settings            → Settings
```

**New sidebar structure (10 items, 3 groups):**
```
[GROUP: OVERVIEW]
  Dashboard           /dashboard
  Explore             /explore
  Sectors             /sectors

[GROUP: INVESTIGATE]
  Investigation       /investigation
  Network             /network
  Contracts           /contracts
  Cases               /cases

[GROUP: MY WORKSPACE]
  Workspace           /workspace

[after divider]
  Methodology         /methodology
  Settings            /settings
```

**Pages to merge/eliminate:**

| Action | From | To | Reason |
|--------|------|----|--------|
| Merge | ExecutiveSummary + Dashboard | Dashboard gets narrative content; `/` becomes scrollytelling landing | They overlap significantly in API calls and content |
| Merge | Methodology + ModelTransparency + GroundTruth | Single `/methodology` with tabs | All are methodology documentation |
| Remove from sidebar | ProcurementIntelligence, Administrations, InstitutionHealth | Accessible via Dashboard link cards, not top-level nav | Reduce cognitive load |
| Rename | Watchlist → Workspace | `/watchlist` redirects to `/workspace` | Signals richer functionality |
| Delete | MoneyFlow.tsx, RedFlags.tsx, TemporalPulse.tsx, DetectivePatterns.tsx | Already handled in Section 1 | Dead code |

**Files:** `components/layout/Sidebar.tsx` (NAV_SECTIONS), `App.tsx` (routes)

### 4.2 Scrollytelling Landing Page

**Priority: 3 | Effort: L**

A scroll-driven narrative at `/` introducing first-time visitors to the platform.

**Library:** `scrollama` (npm, ~8KB, IntersectionObserver-based)

**Chapters:**
1. **The Scale** — "MXN 6.8 trillion" hero + counter animation + area chart (data: `getFastDashboard()`)
2. **The Patterns** — December rush spike + direct award trends (data: precomputed stats)
3. **The Risk** — 5.8% critical rate + 4 strongest AI signals (data: `getFastDashboard()`)
4. **The Cases** — 3 headline scandal cards (IMSS, Segalmex, COVID) linking to Case Library
5. **Call to Action** — "Start investigating →" + "Search a vendor" + "See the methodology"

**Mobile:** Below 768px → stacked layout (text above, graphic inline). Scrollama handles this natively.

**Returning users:** Store `hasSeenLanding` in localStorage. Redirect to `/dashboard` if set. Add "Back to story" link in Dashboard header.

**No new backend endpoints** — all data from existing precomputed stats.

**File:** `pages/Landing.tsx` (new)

### 4.3 Investigation Workspace

**Priority: 2 | Effort: Phase A: M | Phase B: XL | Phase C: S**

Transform Watchlist (734 lines, full CRUD) into a professional investigation workspace.

**Phase A — Case Dossier System (Priority 1):**

New DB tables:
```sql
CREATE TABLE investigation_dossiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dossier_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id INTEGER NOT NULL REFERENCES investigation_dossiers(id),
    item_type TEXT NOT NULL,  -- vendor, institution, contract, note
    item_id INTEGER,
    item_name TEXT,
    annotation TEXT,
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    color TEXT DEFAULT '#64748b',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dossier_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id INTEGER NOT NULL REFERENCES investigation_dossiers(id),
    source_item_id INTEGER NOT NULL REFERENCES dossier_items(id),
    target_item_id INTEGER NOT NULL REFERENCES dossier_items(id),
    label TEXT,
    strength REAL DEFAULT 0.5
);
```

New API namespace: `workspaceApi` at `/api/v1/workspace/dossiers` (full CRUD + export)

Frontend `/workspace` page: Tab structure — "Tracked Entities" (current Watchlist preserved) + "Dossiers" (new card grid) + "Alerts" (threshold alerts)

**Phase B — Investigation Board (Priority 3):**

**Library:** `@xyflow/react` (formerly react-flow, ~35KB) — built for node-edge graph UIs, custom node types, drag-and-drop, minimap, export to PNG.

Route: `/workspace/board/:dossierId`

Custom node types: `VendorNode` (name + risk badge + sparkline), `InstitutionNode`, `ContractNode`, `NoteNode` (yellow sticky, editable)

Board state persists to `dossier_items` and `dossier_connections` via debounced PATCH on drag-end.

**Phase C — Alert System (Priority 1):**

Wire existing `alert_threshold` and `alerts_enabled` fields. New endpoint `GET /workspace/alerts/check` compares current scores vs thresholds. Alert badge on Workspace sidebar icon. "Similar entity" suggestions when adding to watchlist.

### 4.4 Global Cross-Entity Search

**Priority: 1 | Effort: M**

Upgrade `SmartSearch.tsx` from vendor+institution only to federated search.

**New backend endpoint:** `GET /api/v1/search?q=PEMEX&limit=10` — runs 4 queries in parallel:
```json
{
  "vendors": [{ "id", "name", "contracts", "risk_score" }],
  "institutions": [{ "id", "name", "type" }],
  "contracts": [{ "id", "title", "amount", "risk_level" }],
  "cases": [{ "slug", "title", "year" }]
}
```

**Frontend changes to `SmartSearch.tsx`:** Replace two parallel queries (lines 79-90) with single federated query. Add result grouping headers. Add type icons. Add keyboard navigation (arrow keys between groups).

**Command palette upgrade** (Cmd+K): Replace inline search with centered modal `CommandDialog` (shadcn pattern). Add quick actions: "Go to Sectors", "Open Workspace", etc.

**Files:** `SmartSearch.tsx` (refactor), new backend `search.py` router

### 4.5 Mobile Responsiveness

**Priority: 2 | Effort: M (total across phases)**

**Phase 1 — Sidebar hamburger (S):**
- Below `md` breakpoint (768px): sidebar hidden by default, shown as overlay with backdrop
- Hamburger button in `Header.tsx`
- Sidebar: add `onClose` prop + `translate-x` transition instead of width change
- Content: `pl-0` on mobile

**Phase 2 — Priority page layouts (M):**
Focus on 4 pages journalists use in field:
1. `Contracts.tsx` — table → card list on mobile, filter panel → collapsible accordion
2. `VendorProfile.tsx` — stack two-column layout, tabs → scrollable horizontal
3. `Watchlist/Workspace.tsx` — table → card list, action buttons → bottom sheet
4. `Dashboard.tsx` — metric cards stack to single column, charts scale down

**Phase 3 — Responsive grid utilities (S):**
Add CSS utilities: `.grid-responsive-stats { @apply grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4; }`

**Files:** `MainLayout.tsx`, `Sidebar.tsx`, `Header.tsx`, `index.css` (3 priority pages)

### 4.6 Export-to-Report

**Priority: 2 | Effort: M (total)**

**A. Chart download buttons (S):** `ChartDownloadButton` component using `html-to-image` library (~3KB). Add to every `ResponsiveContainer` wrapper. Downloads PNG or SVG.

**B. Table CSV/Excel download (S):** `TableExportButton` component serializing visible data to CSV via Blob API. For server-filtered data, use existing export endpoints. Add Excel via existing backend `/export/contracts/excel`.

**C. Entity dossier PDF (M):** Call `/reports/vendor/{id}` (or institution/sector) → render JSON in `ReportTemplate` component → `window.print()` with `@media print` stylesheet. PDF via browser print dialog. No heavy PDF libraries.

**D. Investigation board export (S, depends on Phase B):** `@xyflow/react`'s `toImage()` → PNG. JSON export of dossier structure.

### 4.7 False Positive Feedback Loop

**Priority: 3 | Effort: S**

New DB table `risk_feedback (entity_type, entity_id, feedback_type, reason)`.

New endpoints: `POST /api/v1/feedback`, `GET /api/v1/feedback?entity_type=&entity_id=`, `GET /api/v1/feedback/stats`

Frontend: Small flag icon button next to every risk badge. Popover: "Mark as: Not suspicious / Confirmed suspicious / Needs review". After flagging, badge gets small indicator. Connect to existing `validation_status` in `InvestigationCaseDetail.tsx`.

### 4.8 URL State Architecture

**Priority: 1 | Effort: M**

**Library:** `nuqs` (~3KB) for typed URL query parameters.

**Pages to convert (priority order):**
1. `Contracts.tsx` — proof of concept (already partially URL-synced, convert from manual)
2. `ExplorePage.tsx` (Section 3 Crossfilter)
3. `Investigation.tsx`
4. `Sectors.tsx`
5. `ProcurementIntelligence.tsx`
6. `Administrations.tsx`
7. `NetworkGraph.tsx`
8. `Workspace.tsx`

**New hook:** `src/hooks/useUrlFilters.ts` wrapping `nuqs` with project-standard filter types.

**Cross-page deep linking:** Dashboard action cards link to pre-filtered views (e.g., "Critical contracts" → `/contracts?risk_level=critical&sector_id=1`).

### 4.9 Testing Infrastructure

**Priority: 2 | Effort: L (ongoing)**

**Tier 1 — Critical path unit tests:**
`SmartSearch.tsx`, `AddToWatchlistButton.tsx`, `Watchlist.tsx`, `Contracts.tsx`, `VendorProfile.tsx`

**E2E tests (Playwright):**
1. Search and navigate: type → select vendor → VendorProfile
2. Add to watchlist: vendor → add → verify in Workspace
3. Filter contracts: set sector → URL updates → table updates
4. Investigation flow: queue → case detail → vendor profile (after F11 fix)
5. Landing page scroll: chapters render

**MSW** (Mock Service Worker) for API mocking in tests.

---

## Master Implementation Sequence

### Sprint 1 — Foundations (Weeks 1-2)
**Goal:** Structural changes that unblock everything else.

1. IA redesign: new sidebar, route map, dead code removal (S4.1)
2. URL state: install `nuqs`, create `useUrlFilters`, convert Contracts as proof-of-concept (S4.8)
3. Mobile sidebar hamburger pattern (S4.5 Phase 1)
4. Section 1 foundations: dead code purge, Input component, Tabs component, type consolidation (S1)

**Milestone:** Platform navigable with new IA, URL-shareable filters, usable on mobile.

### Sprint 2 — Search & Investigation Core (Weeks 3-4)
**Goal:** Make investigation workflow functional.

5. Global cross-entity search: federated backend + command palette frontend (S4.4)
6. Workspace Phase A: dossier CRUD + tabs (S4.3A)
7. Alert system: wire existing fields + badge (S4.3C)
8. Cross-reference connections: F2 + F3 + F11 (Section 2, Phase 1 quick wins)
9. URL state: convert 4 more pages (S4.8 continued)

**Milestone:** Journalists can search across all entities, organize into dossiers, receive alerts.

### Sprint 3 — Money Flow & Core Features (Weeks 5-6)
**Goal:** Flagship new visualizations + export capabilities.

10. Sankey money flow diagram (S3, Feature 1) — the flagship visualization
11. Waterfall risk explanation (S2, Feature 1) — most requested feature
12. Chart/table download buttons (S4.6A+B)
13. Entity dossier PDF (S4.6C)
14. False positive feedback loop (S4.7)
15. Critical path unit tests (S4.9 Tier 1)
16. AI summary display + Case Library integration (S2, Features 5 + 4)

**Milestone:** Sankey live, risk scores explained, everything downloadable.

### Sprint 4 — Discovery & Advanced Investigation (Weeks 7-8)
**Goal:** Exploration and investigation power tools.

17. Crossfilter Procurement Explorer (S3, Feature 2) — replaces Explore page
18. Red Thread navigation panel (S2, Feature 6)
19. Political cycle analysis + threshold gaming + co-bidding collusion (S3, Features 4+5+8)
20. Community explorer (S3, Feature 7)
21. Peer benchmarking badges (S2, Feature 7)
22. Mobile priority layouts (S4.5 Phase 2)
23. E2E tests (S4.9 E2E)

**Milestone:** Platform has full discovery layer + investigation power tools.

### Sprint 5 — Narrative, Workspace & Polish (Weeks 9-10)
**Goal:** Differentiation features and operational maturity.

24. Scrollytelling landing page (S4.2)
25. Investigation board / corkboard UI (S4.3B)
26. Report generation UI (S2, Feature 8)
27. Investigation workspace evolution (S2, Feature 9)
28. Period comparison tool (S3, Feature 9)
29. Institution risk-factor heatmap (S3, Feature 10)
30. Performance monitoring + bundle analysis (S4.10)
31. Responsive grid utilities (S4.5 Phase 3)
32. Model comparison page upgrade (S2, Feature 10)

**Milestone:** Complete investigative journalism platform.

---

## Priority Matrix — Global View

| Feature | Section | Effort | Global Priority | Sprint |
|---------|---------|--------|-----------------|--------|
| IA Redesign + Sidebar | S4.1 | M | P1 | 1 |
| Dead code purge + type system | S1 | M | P1 | 1 |
| URL State Architecture | S4.8 | M | P1 | 1-2 |
| Clickable investigation vendors | S2.F11 | S | P1 | 2 |
| Ground truth badge system | S2.F2 | S | P1 | 2 |
| Sanctions alert banner | S2.F3 | M | P1 | 2 |
| Global cross-entity search | S4.4 | M | P1 | 2 |
| Workspace dossier CRUD | S4.3A | M | P1 | 2 |
| Alert system wire-up | S4.3C | S | P1 | 2 |
| Missing API client methods | S1 | L | P1 | 1-2 |
| Cross-reference connections (8) | S1 | M | P1 | 2 |
| Mobile sidebar | S4.5.1 | S | P2 | 1 |
| Waterfall risk explanation | S2.F1 | M | P1 | 3 |
| Sankey money flow | S3.F1 | L | P1 | 3 |
| Chart/table export | S4.6A+B | S | P2 | 3 |
| Entity dossier PDF | S4.6C | M | P2 | 3 |
| AI summary display | S2.F5 | S | P2 | 3 |
| Case Library integration | S2.F4 | M | P2 | 3 |
| Critical path tests | S4.9.T1 | M | P2 | 3 |
| Crossfilter explorer | S3.F2 | L | P2 | 4 |
| Red Thread navigation | S2.F6 | M | P2 | 4 |
| Political cycle analysis | S3.F4 | M | P2 | 4 |
| Threshold gaming card | S3.F5 | S | P2 | 4 |
| Co-bidding collusion panel | S3.F8 | S | P2 | 4 |
| Community explorer | S3.F7 | M | P2 | 4 |
| Mobile priority layouts | S4.5.2 | M | P2 | 4 |
| E2E tests | S4.9 | L | P2 | 4 |
| Scrollytelling landing | S4.2 | L | P3 | 5 |
| Investigation board | S4.3B | XL | P3 | 5 |
| Report generation UI | S2.F8 | L | P3 | 5 |
| Workspace evolution | S2.F9 | L | P3 | 5 |
| Peer benchmarking | S2.F7 | M | P3 | 4 |
| Period comparison | S3.F9 | M | P3 | 5 |
| Institution heatmap | S3.F10 | M | P3 | 5 |
| False positive feedback | S4.7 | S | P3 | 3 |
| Model comparison upgrade | S2.F10 | M | P4 | 5 |
| Performance monitoring | S4.10 | S | P3 | 5 |
| Publication delay card | S3.F6 | S | P4 | 4 |

---

## Critical Files Map

The files with the most changes across all sections:

| File | Sections Touching It | Change Volume |
|------|---------------------|---------------|
| `frontend/src/pages/VendorProfile.tsx` | S1, S2 (F1-F9), S3 | Largest single change surface — 1,964 lines, receives waterfall chart, sanctions banner, ground truth badge, AI summary, Red Thread panel, peer benchmarking, report button |
| `frontend/src/api/client.ts` | S1, S2, S3 | Add 37 new methods, new `reportApi` and `workspaceApi` namespaces, fix 7 unsafe returns |
| `frontend/src/api/types.ts` | S1, S2, S3 | Receive 40+ types from client.ts + 15+ new response types |
| `frontend/src/components/layout/Sidebar.tsx` | S4.1 | Complete NAV_SECTIONS restructure |
| `frontend/src/App.tsx` | S4.1, S4.2 | All new routes, redirects, lazy imports |
| `frontend/src/pages/Administrations.tsx` | S3 (F4, F9) | Two new tabs: Political Cycle + Period Compare |
| `frontend/src/pages/explore/ExplorePage.tsx` | S3.F2 | Complete rewrite as Crossfilter Explorer |
| `backend/api/routers/vendors.py` | S2, S3 | 4 new endpoints: risk-waterfall, ground-truth-status, peer-comparison, linked-scandals |
| `backend/api/routers/analysis.py` | S3 | 1 new endpoint: institution-risk-factors |
| `backend/api/routers/network.py` | S3.F7 | 1 new endpoint: community detail |
| `frontend/src/pages/Watchlist.tsx` | S4.3 | Major refactor → Workspace with Dossier tabs |

---

## New Dependencies to Install

| Library | Version | Purpose | Section |
|---------|---------|---------|---------|
| `d3-sankey` | latest | Sankey layout math | S3.F1 |
| `scrollama` | latest | Scrollytelling (8KB) | S4.2 |
| `nuqs` | latest | Typed URL state (3KB) | S4.8 |
| `@xyflow/react` | latest | Investigation board node-edge UI (35KB) | S4.3B |
| `html-to-image` | latest | Chart/graph PNG export (3KB) | S4.6A |
| `playwright` | latest | E2E testing | S4.9 |
| `msw` | latest | API mocking in tests | S4.9 |

---

*This plan represents the output of 8 Opus agents: 4 Wave 1 auditors (frontend cartographer, backend intelligence, innovation scout, data flow analyst) + 4 Wave 2 architects (foundation, investigation, money flow, journalism workspace). Total intelligence gathered: ~900K tokens across parallel analysis streams.*

*Named after RUBLI from Legend of the Galactic Heroes — the pragmatic historian who valued transparency over blind ambition. This renovation makes the platform worthy of the name.*
