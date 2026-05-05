# RUBLI — Full-Site Graphics Audit & Master Redesign Plan

> Master plan for porting the Pudding / IIB / FT / NYT editorial chart vocabulary
> we shipped on `/sectors`, `/sectors?view=categories` and the `/dashboard` hero
> to **every other surface** that still ships generic recharts or inline-SVG debt.
>
> Scope: out of the box are `/sectors`, `/sectors?view=categories`, the
> `Sectors.tsx` page and the five components in `frontend/src/components/sectors/`,
> plus the `DashboardSledgehammer` hero on `/`. Everything else is in.
>
> **Prior plans this builds on (do NOT re-plan, only carry forward):**
> - `docs/SECTORS_REDESIGN_PLAN.md` — shipped, reference for primitives.
> - `docs/CATEGORIES_REDESIGN_PLAN.md` — shipped, reference for swimlane / dumbbell.
> - `docs/DASHBOARD_OBSERVATORY_NEWSROOM_PLAN.md` — Dashboard `d-P3+`, Observatory
>   `o-P1+`, Newsroom `n-P2+` carried forward in Part D below.
>
> Risk model in copy: **v0.8.5** (HR=11.0%, AUC=0.785). Thresholds via
> `getRiskLevelFromScore` (0.60 / 0.40 / 0.25). Spanish § primary, English fallback.
> No green for low risk. `SECTOR_TEXT_COLORS` for text fills, `SECTOR_COLORS` for
> shape fills/strokes only. Entity refs through `<EntityIdentityChip>`.

---

# PART A — Inventory

One row per chart/graphic. Editorial quality is a 1–10 score (10 = NYT/FT
publishable, 5 = generic dashboard, 1 = visual debt). Verdict is one of
**KEEP** (already editorial), **UPGRADE** (re-skin in place), **REPLACE**
(swap chart vocabulary), **CUT** (delete; redundant with another chart).

Surfaces are listed in approximate sidebar order: Discover → Investigate →
Explore → Analysis → Platform → Detail pages → Stories.

| # | Surface | Page file | Chart / graphic | Lines | Current type | EQ | Verdict | Replacement vocabulary | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `/` Dashboard | `pages/Executive.tsx` | DashboardSledgehammer hero | top of file | bespoke editorial | 9 | KEEP | — | Shipped today. |
| 2 | `/` Dashboard | `pages/Executive.tsx` | MacroArc (§3 timeline) | imports `dashboard/MacroArc.tsx` | inline SVG arc | 6 | UPGRADE | FT slope-with-annotations 2008–2025 | **d-P3** carry-forward. |
| 3 | `/` Dashboard | `pages/Executive.tsx` | LeadTimeWall / LeadTimeChart | inline | inline SVG bar | 5 | REPLACE | NYT "How Much Hotter Is Your Hometown" annotated dot strip | **d-P4** carry-forward. |
| 4 | `/` Dashboard | `pages/Executive.tsx` | RiskCadenceStrip | inline | inline SVG strip | 6 | UPGRADE | FT bullet w/ OECD 25% reference rule | Add reference-line + dwell. |
| 5 | `/` Dashboard | `pages/Executive.tsx` | InstitutionLeague mini | inline | LeagueRow grid | 7 | KEEP | — | From editorial primitives. |
| 6 | `/atlas` Observatory | `pages/Atlas.tsx` | Constellation canvas (PATTERNS lens) | full-viewport | bespoke canvas | 8 | KEEP | — | The signature graphic. |
| 7 | `/atlas` Observatory | `pages/Atlas.tsx` | SECTORS lens | same canvas | bespoke canvas | 7 | UPGRADE | Pudding "Constellations" — clearer attractor labels | Add ring-of-12 sector labels. |
| 8 | `/atlas` Observatory | `pages/Atlas.tsx` | CATEGORIES lens | same canvas | bespoke canvas | 6 | REPLACE | Pudding-style cluster-with-callouts | Cluster of top-12 categories with editorial callouts. |
| 9 | `/atlas` Observatory | `pages/Atlas.tsx` | TERMS lens | same canvas | bespoke canvas | 5 | REPLACE | Pudding "Where Slang Comes From" — term-stream over time | Year scrubber drives a term-flow ribbon. |
| 10 | `/atlas` Observatory | `pages/Atlas.tsx` | (missing) MONEY lens | — | — | — | NEW | NYT "Federal Spending" treemap morphing from constellation | **o-P1+** carry-forward. |
| 11 | `/atlas` Observatory | `pages/Atlas.tsx` | (missing) CASES lens | — | — | — | NEW | Reuters seismograph / temporal density ribbon | **o-P2+** carry-forward. |
| 12 | `/journalists` Newsroom | `pages/Journalists.tsx` | Story list / mosaic | full file | static cards | 5 | REPLACE | Pudding masthead — varied tile sizes by editorial weight | **n-P5** carry-forward. |
| 13 | `/aria` ARIA Queue | `pages/AriaQueue.tsx` | Risk distribution histogram | top section | recharts BarChart | 4 | REPLACE | FT density ridge + threshold rules at 0.60/0.40/0.25 | Replaces opaque histogram. |
| 14 | `/aria` ARIA Queue | `pages/AriaQueue.tsx` | Tier-stacked count bars | top strip | inline SVG | 5 | REPLACE | Cleveland dot plot — T1/T2/T3/T4 stacked horizontal | One-row-per-tier. |
| 15 | `/aria` ARIA Queue | `pages/AriaQueue.tsx` | Pattern-mix donut(s) | sidebar | inline SVG donut | 3 | CUT | n/a (kill — redundant with pattern dossier) | Move to `/patterns` only. |
| 16 | `/aria` ARIA Queue | `pages/AriaQueue.tsx` | Vendor table risk badges | rows | inline DotBar | 7 | KEEP | — | Already editorial. |
| 17 | `/aria` ARIA Queue | `pages/AriaQueue.tsx` | GhostSuspectsPanel | `aria/GhostSuspectsPanel.tsx` | inline SVG | 6 | UPGRADE | Pudding "Ghost" stacked beeswarm | Use existing RiskSpendBeeswarm primitive. |
| 18 | `/aria` ARIA Queue | `pages/AriaQueue.tsx` | Sector mix pills | header | static badges | 4 | REPLACE | DotStrip ranked-by-flag-rate | Show concentration, not equality. |
| 19 | `/patterns` | `pages/Patterns.tsx` | Pattern landing tiles | full file | static cards | 6 | UPGRADE | Pudding "How Birds Get Their Names" — typology grid w/ small-multiples | Each tile gets a 60px sparkline. |
| 20 | `/patterns/:code` Dossier | `pages/PatternDossier.tsx` | Vendor list table | mid file | flat table | 6 | UPGRADE | DotStrip + EntityIdentityChip rows | Rank by pattern intensity. |
| 21 | `/patterns/:code` Dossier | `pages/PatternDossier.tsx` | Year incidence bar | side | recharts BarChart | 4 | REPLACE | EditorialSparkline + sector overlay | Shrink to 80px. |
| 22 | `/patterns/:code` Dossier | `pages/PatternDossier.tsx` | Sector mix bar | side | recharts | 4 | REPLACE | DotStrip ranked-by-incidence | Already-shipped primitive. |
| 23 | `/captura` CaptureCreep | `pages/CaptureCreep.tsx` | Capture index per sector | grid | static cards | 5 | REPLACE | CategoryCaptureDumbbell (existing primitive) | Direct re-use. |
| 24 | `/captura` CaptureCreep | `pages/CaptureCreep.tsx` | Vendor concentration treemap | mid | recharts Treemap | 5 | REPLACE | SectorTreemap (existing primitive) | Re-use today's component. |
| 25 | `/captura` Heatmap | `pages/CapturaHeatmap.tsx` | Vendor×Institution heatmap | full file | inline SVG grid | 7 | UPGRADE | NYT "Punishing Reach of Racism" stacked beeswarm + heatmap hybrid | Annotate top-3 capture pairs. |
| 26 | `/captura` Heatmap | `pages/CapturaHeatmap.tsx` | Capture trend line | top | recharts LineChart | 4 | REPLACE | EditorialLineChart + threshold rule at HHI=0.25 | Add OECD reference. |
| 27 | `/captura` Heatmap | `pages/CapturaHeatmap.tsx` | Top-pairs ranking | bottom | flat list | 5 | UPGRADE | DotStrip with capture% readout | Use shipped DotStrip. |
| 28 | `/clusters` | `pages/CorruptionClusters.tsx` | Cluster network graph | mid file | inline force layout | 6 | UPGRADE | ICIJ pass-through flow w/ editorial annotations | Label top-3 clusters. |
| 29 | `/clusters` | `pages/CorruptionClusters.tsx` | Cluster size histogram | side | inline SVG bars | 4 | REPLACE | DotStrip ranked-by-size | Drop bars. |
| 30 | `/clusters` | `pages/CorruptionClusters.tsx` | Member tables | bottom | flat tables | 5 | UPGRADE | DotStrip rows w/ EntityIdentityChip | One row per cluster. |
| 31 | `/intersection` | `pages/Intersection.tsx` | Vendor∩Institution Venn | full file | inline SVG | 5 | REPLACE | NYT connected-scatter ("Rising Tide") of vendor×institution overlap | Set notation reads opaque to journalists. |
| 32 | `/intersection` | `pages/Intersection.tsx` | Overlap ranking | side | flat list | 5 | UPGRADE | DotStrip + dual EntityIdentityChip | Show top-15 overlaps. |
| 33 | `/administrations` | `pages/Administrations.tsx` | AdminConcentrationTimeline | imports | recharts ComposedChart | 5 | REPLACE | EditorialComposedChart + slope overlay | Existing editorial wrapper. |
| 34 | `/administrations` | `pages/Administrations.tsx` | AdminRiskTrajectory | imports | recharts LineChart | 5 | REPLACE | CompetitionSlopeChart (existing) | Show 2008→2025 trajectory. |
| 35 | `/administrations` | `pages/Administrations.tsx` | AdminSectorHeatmap | imports | inline SVG grid | 6 | UPGRADE | EditorialHeatmap (existing wrapper) | Already editorial-style. |
| 36 | `/administrations` | `pages/Administrations.tsx` | AdminSectorSunburst | imports | inline SVG sunburst | 4 | CUT | — (sunbursts are a Pudding anti-pattern for hierarchy comparisons) | Replace with treemap. |
| 37 | `/administrations` | `pages/Administrations.tsx` | AdminVendorBreakdown | imports | inline SVG | 6 | UPGRADE | DotStrip top-25 vendors per administration | Replace bespoke layout. |
| 38 | `/administrations` | `pages/Administrations.tsx` | AdministrationFingerprints | imports | inline SVG radar | 5 | REPLACE | NYT small-multiples 6×1 (one fingerprint per Sexenio) | Radars are unreadable; small multiples scan. |
| 39 | `/administrations` | `pages/Administrations.tsx` | Sexenio comparison block | mid | static cards | 5 | UPGRADE | EditorialSlope (re-use sectors slope chart) | Drop redundant copies of same fact. |
| 40 | `/institutions` League | `pages/InstitutionLeague.tsx` | League ranking table | full | LeagueRow grid | 8 | KEEP | — | Already editorial. |
| 41 | `/institutions` League | `pages/InstitutionLeague.tsx` | Risk distribution sidebar | side | inline SVG | 5 | REPLACE | EditorialDistribution (NEW primitive — see Part C) | Density ridge w/ thresholds. |
| 42 | `/institutions` League | `pages/InstitutionLeague.tsx` | Sector mix bars | side | flat bars | 4 | REPLACE | DotStrip ranked-by-share | Already-shipped primitive. |
| 43 | `/institutions/:id` Dossier | `pages/InstitutionProfile.tsx` | InstitutionHero stats | top | inline SVG bullets | 7 | KEEP | — | Editorial enough. |
| 44 | `/institutions/:id` Dossier | `pages/InstitutionProfile.tsx` | Top vendors treemap | §2 | recharts Treemap | 5 | REPLACE | SectorTreemap primitive | Re-use today's component. |
| 45 | `/institutions/:id` Dossier | `pages/InstitutionProfile.tsx` | Risk-over-time line | §3 | recharts LineChart | 4 | REPLACE | CompetitionSlopeChart 2008→2025 | Same shape as sectors slope. |
| 46 | `/institutions/:id` Dossier | `pages/InstitutionProfile.tsx` | Procedure-mix donut | §4 | recharts PieChart | 2 | REPLACE | DotStrip rank-by-share | Pie ban. |
| 47 | `/institutions/:id` Dossier | `pages/InstitutionProfile.tsx` | Vendor concentration HHI | §5 | inline SVG bar | 5 | UPGRADE | DotBar w/ OECD reference | Existing primitive. |
| 48 | `/institutions/:id` Dossier | `pages/InstitutionProfile.tsx` | Risk scatter (vendor×spend) | §6 | inline SVG | 6 | UPGRADE | RiskSpendBeeswarm (shipped sectors primitive) | Direct re-use. |
| 49 | `/institutions/:id` Dossier | `pages/InstitutionProfile.tsx` | Sector mix bars | §7 | flat bars | 4 | CUT | — (redundant with §2 treemap) | Remove. |
| 50 | `/institutions/:id` Dossier | `pages/InstitutionProfile.tsx` | Trust scorecard radar | §8 | recharts RadarChart | 3 | REPLACE | NYT small-multiples 5×1 (one bullet per axis) | Radars unreadable. |
| 51 | `/vendors/:id` Dossier | `pages/VendorProfile.tsx` | VendorHero stats | top | inline SVG bullets | 8 | KEEP | — | Already editorial. |
| 52 | `/vendors/:id` Dossier | `components/VendorContractTimeline.tsx` | Contract timeline | tab | recharts ScatterChart | 5 | REPLACE | EditorialTimeline (NEW primitive — see Part C) | Vertical event timeline w/ amount-encoded dots. |
| 53 | `/vendors/:id` Dossier | `components/VendorContractRiskMatrix.tsx` | Risk×amount matrix | tab | recharts ScatterChart | 5 | REPLACE | RiskSpendBeeswarm (shipped) | Same data shape. |
| 54 | `/vendors/:id` Dossier | `components/WaterfallRiskChart.tsx` | Risk waterfall | tab | inline SVG bars | 6 | UPGRADE | EditorialComposedChart w/ feature labels | Use shipped wrapper + SHAP labels. |
| 55 | `/vendors/:id` Dossier | `components/charts/VendorFingerprintChart.tsx` | Fingerprint radar | mid | inline SVG radar | 4 | REPLACE | NYT 5×1 small-multiples bullets | Radars unreadable. |
| 56 | `/vendors/:id` Dossier | `components/charts/VendorConcentrationTreemap.tsx` | Institution treemap | tab | recharts Treemap | 5 | REPLACE | SectorTreemap primitive | Re-use. |
| 57 | `/vendors/:id` Dossier | `components/NetworkMiniGraph.tsx` | Network mini | tab | inline force | 6 | UPGRADE | EditorialNetwork (NEW primitive — see Part C) | Annotated, labeled. |
| 58 | `/vendors/:id` Dossier | `components/charts/CommunityBubbles.tsx` | Community bubbles | tab | inline SVG bubbles | 5 | REPLACE | RiskSpendBeeswarm primitive | Same shape. |
| 59 | `/vendors/compare` | `pages/VendorCompare.tsx` | Side-by-side bullets | full | inline SVG | 6 | UPGRADE | FT deviation chart (A vs B vs sector median) | Single chart per dimension. |
| 60 | `/vendors/compare` | `pages/VendorCompare.tsx` | Risk dial | top | inline SVG ring | 4 | REPLACE | Cleveland dumbbell A↔B w/ sector median tick | Existing CategoryCaptureDumbbell pattern. |
| 61 | `/vendors/compare` | `pages/VendorCompare.tsx` | Procedure mix bars | mid | flat bars | 4 | REPLACE | DotStrip pair (A above, B below) | Drop bars. |
| 62 | `/institutions/compare` | `pages/InstitutionCompare.tsx` | Side-by-side stats | full | inline SVG | 6 | UPGRADE | FT deviation chart | Same as VendorCompare. |
| 63 | `/institutions/compare` | `pages/InstitutionCompare.tsx` | Sector mix bars | mid | flat bars | 4 | REPLACE | DotStrip pair | Same as above. |
| 64 | `/institutions/compare` | `pages/InstitutionCompare.tsx` | Risk trajectory lines | bottom | recharts LineChart | 4 | REPLACE | CompetitionSlopeChart | Existing primitive. |
| 65 | `/sectors/:id` SectorProfile | `pages/SectorProfile.tsx` | RiskRingField | mid | inline SVG | 6 | KEEP | — | Idiomatic. |
| 66 | `/sectors/:id` SectorProfile | `pages/SectorProfile.tsx` | Top-categories bars | side | flat bars | 5 | REPLACE | DotStrip top-12 categories | Existing primitive. |
| 67 | `/sectors/:id` SectorProfile | `pages/SectorProfile.tsx` | Top-vendors mini-treemap | mid | inline SVG | 6 | UPGRADE | SectorTreemap primitive | Re-use. |
| 68 | `/sectors/:id` SectorProfile | `pages/SectorProfile.tsx` | SectorModelCoefficients | tab | inline SVG bars | 6 | UPGRADE | EditorialComposedChart w/ +/- coefficient bars | Existing wrapper. |
| 69 | `/sectors/:id` SectorProfile | `pages/SectorProfile.tsx` | Risk-vs-spend scatter | mid | inline SVG | 6 | REPLACE | RiskSpendBeeswarm primitive | Re-use. |
| 70 | `/categories/:id` CategoryProfile | `pages/CategoryProfile.tsx` | Category hero stats | top | bullets | 7 | KEEP | — | Editorial. |
| 71 | `/categories/:id` CategoryProfile | `pages/CategoryProfile.tsx` | Sector breakdown bars | mid | flat bars | 5 | REPLACE | CategorySectorSwimlane primitive | Re-use shipped. |
| 72 | `/categories/:id` CategoryProfile | `pages/CategoryProfile.tsx` | Top-vendors table | mid | flat table | 5 | UPGRADE | DotStrip top-15 vendors | Existing primitive. |
| 73 | `/categories/:id` CategoryProfile | `pages/CategoryProfile.tsx` | Capture/HHI panel | mid | inline bar | 5 | REPLACE | CategoryCaptureDumbbell primitive | Re-use shipped. |
| 74 | `/cases` Library | `pages/CaseLibrary.tsx` | Case grid | full | static cards | 6 | UPGRADE | Pudding "30 Years of Anxieties" — case grid w/ amount-encoded dots | Add per-card sparkline of incidence year. |
| 75 | `/cases` Library | `pages/CaseLibrary.tsx` | Sector filter chips | top | static pills | 5 | UPGRADE | DotStrip sector frequencies | Show distribution, not just filter. |
| 76 | `/cases/:slug` CaseDetail | `pages/CaseDetail.tsx` | Case hero | top | bullets | 7 | KEEP | — | Editorial. |
| 77 | `/cases/:slug` CaseDetail | `pages/CaseDetail.tsx` | Implicated entities list | mid | flat list | 5 | UPGRADE | DotStrip + EntityIdentityChip rows | Each row gets risk readout. |
| 78 | `/cases/:slug` CaseDetail | `pages/CaseDetail.tsx` | Case timeline | mid | inline SVG | 6 | UPGRADE | EditorialTimeline (NEW primitive) | Same as VendorTimeline. |
| 79 | `/cases/:slug` CaseDetail | `pages/CaseDetail.tsx` | Money-flow Sankey | bottom | inline SVG Sankey | 6 | UPGRADE | EditorialFlow (NEW primitive — see Part C) | ICIJ-style annotated flow. |
| 80 | `/cases/:slug` CaseDetail | `pages/CaseDetail.tsx` | Estimated-fraud bullet | top | inline SVG bar | 5 | UPGRADE | DotBar w/ benchmark (sector median fraud) | Add reference. |
| 81 | `/methodology` | `pages/Methodology.tsx` | Feature coefficient bars | mid | inline SVG | 5 | REPLACE | FT deviation chart (signed bars w/ ref-line at 0) | Drop horizontal bars. |
| 82 | `/methodology` | `pages/Methodology.tsx` | HR/AUC trend by version | mid | recharts LineChart | 4 | REPLACE | CompetitionSlopeChart v0.4→v0.8.5 | Existing primitive. |
| 83 | `/methodology` | `pages/Methodology.tsx` | Threshold ladder | side | inline SVG | 6 | UPGRADE | NYT annotated dot-strip w/ 0.60/0.40/0.25 callouts | Use as visual canon for thresholds. |
| 84 | `/methodology` | `pages/Methodology.tsx` | PU calibration curve | mid | recharts LineChart | 5 | UPGRADE | EditorialLineChart + reference rule | Existing wrapper. |
| 85 | `/methodology` | `pages/Methodology.tsx` | Sector calibration table | bottom | flat table | 5 | UPGRADE | DotStrip 12 sectors × intercept | Existing primitive. |
| 86 | `/model` ModelTransparency | `pages/ModelTransparency.tsx` | SHAP waterfall | top | inline SVG | 7 | UPGRADE | EditorialComposedChart w/ feature labels | Same as VendorWaterfall. |
| 87 | `/model` ModelTransparency | `pages/ModelTransparency.tsx` | Calibration scatter | mid | recharts ScatterChart | 5 | REPLACE | EditorialScatterChart | Existing wrapper. |
| 88 | `/model` ModelTransparency | `pages/ModelTransparency.tsx` | Coefficient ranking | mid | flat bars | 4 | REPLACE | DotStrip ranked by abs(beta) | Existing primitive. |
| 89 | `/model` ModelTransparency | `pages/ModelTransparency.tsx` | HR-by-tier histogram | bottom | recharts BarChart | 4 | REPLACE | DotStrip 4 tiers w/ readouts | Existing primitive. |
| 90 | `/explore` (Vendors) | `pages/explore/VendorsTab.tsx` | EditorialScatterChart | mid | recharts wrapper | 7 | KEEP | — | Already editorial. |
| 91 | `/explore` (Vendors) | `pages/explore/VendorsTab.tsx` | RiskDistributionStrip | top | inline SVG | 6 | UPGRADE | EditorialDistribution (NEW) | Density ridge. |
| 92 | `/explore` (Institutions) | `pages/explore/InstitutionsTab.tsx` | Distribution panel | top | inline SVG | 6 | UPGRADE | EditorialDistribution (NEW) | Same primitive. |
| 93 | `/explore` (Institutions) | `pages/explore/InstitutionsTab.tsx` | Sector mix bars | side | flat bars | 4 | REPLACE | DotStrip | Existing. |
| 94 | `/explore` (Trends) | `pages/explore/TrendsTab.tsx` | Trend lines | full | recharts LineChart | 5 | REPLACE | EditorialLineChart + slope overlay | Existing wrapper. |
| 95 | `/explore` (Trends) | `pages/explore/TrendsTab.tsx` | TimeSeriesPanel | imports | recharts AreaChart | 4 | REPLACE | EditorialAreaChart + threshold rule | Existing wrapper. |
| 96 | `/explore` (Trends) | `pages/explore/TrendsTab.tsx` | DotStrip | imports | DotStrip | 7 | KEEP | — | Already editorial. |
| 97 | `/explore` (SectorTreemap) | `pages/explore/SectorTreemapPanel.tsx` | Sector treemap | full | recharts Treemap | 5 | REPLACE | SectorTreemap primitive | Re-use shipped. |
| 98 | `/network` Networks | `pages/RedesKnownDossier.tsx` | FlowParticle | imports | inline SVG flow | 7 | KEEP | — | Editorial. |
| 99 | `/network` Networks | `pages/RedesKnownDossier.tsx` | Pair table | mid | flat table | 5 | UPGRADE | DotStrip pair-of-vendors rows | Re-use existing primitive. |
| 100 | `/network` Networks | `pages/RedesKnownDossier.tsx` | DuetArrow visualizations | imports | inline SVG | 7 | KEEP | — | Editorial. |
| 101 | `/network` Networks | `pages/RedesKnownDossier.tsx` | Cluster size histogram | side | inline SVG | 5 | REPLACE | DotStrip top-15 clusters | Existing primitive. |
| 102 | `/price-analysis` PriceIntelligence | `pages/PriceIntelligence.tsx` | Price-by-sector lines | top | recharts LineChart | 4 | REPLACE | EditorialLineChart + sector palette | Existing wrapper. |
| 103 | `/price-analysis` PriceIntelligence | `pages/PriceIntelligence.tsx` | Outlier scatter | mid | recharts ScatterChart | 5 | REPLACE | EditorialScatterChart + p99 rule | Existing wrapper. |
| 104 | `/price-analysis` PriceIntelligence | `pages/PriceIntelligence.tsx` | Item ranking bars | bottom | flat bars | 4 | REPLACE | DotStrip top-25 items | Existing primitive. |
| 105 | `/price-analysis` PriceIntelligence | `pages/PriceIntelligence.tsx` | Volatility distribution | side | inline SVG | 5 | UPGRADE | EditorialDistribution (NEW) | Density ridge. |
| 106 | `/year-in-review` YearInReview | `pages/YearInReview.tsx` | Year hero stats | top | bullets | 7 | KEEP | — | Editorial. |
| 107 | `/year-in-review` YearInReview | `pages/YearInReview.tsx` | Top-cases stack | mid | inline cards | 6 | UPGRADE | Pudding "Anxieties" amount-encoded card grid | Add per-case sparkline. |
| 108 | `/year-in-review` YearInReview | `pages/YearInReview.tsx` | Sector mix donut | mid | recharts PieChart | 2 | REPLACE | DotStrip rank-by-share | Pie ban. |
| 109 | `/year-in-review` YearInReview | `pages/YearInReview.tsx` | Monthly spending area | mid | recharts AreaChart | 4 | REPLACE | EditorialAreaChart + decision-points | Add annotation marks. |
| 110 | `/year-in-review` YearInReview | `pages/YearInReview.tsx` | Year-over-year comparison | bottom | static cards | 5 | REPLACE | CompetitionSlopeChart YoY | Existing primitive. |
| 111 | `/journalists` Newsroom | `pages/Journalists.tsx` | Story masthead | top | static | 5 | UPGRADE | Pudding masthead w/ varied tile sizes | **n-P5** carry-forward. |
| 112 | `/journalists` Newsroom | `pages/Journalists.tsx` | Story grid cards | mid | static cards | 6 | UPGRADE | Editorial card w/ per-story sparkline | Add 60px sparkline per card. |
| 113 | `/procurement-calendar` | `pages/ProcurementCalendar.tsx` | Calendar heatmap | full | inline SVG grid | 6 | UPGRADE | EditorialHeatmap (existing wrapper) | Already-editorial wrapper. |
| 114 | `/procurement-calendar` | `pages/ProcurementCalendar.tsx` | Weekday distribution | side | inline SVG bars | 4 | REPLACE | DotStrip 7-day | Existing primitive. |
| 115 | `/procurement-calendar` | `pages/ProcurementCalendar.tsx` | Month-end spike strip | bottom | inline SVG | 5 | UPGRADE | EditorialSparkline w/ annotated spike | Existing wrapper. |
| 116 | `/contracts/:id` ContractDetail | `pages/ContractDetail.tsx` | Risk waterfall | mid | WaterfallRiskChart | 6 | UPGRADE | EditorialComposedChart | Same as #54. |
| 117 | `/contracts/:id` ContractDetail | `pages/ContractDetail.tsx` | Price-vs-benchmark bullet | top | inline SVG | 5 | UPGRADE | DotBar w/ p50/p99 marks | Existing primitive. |
| 118 | `/contracts/:id` ContractDetail | `pages/ContractDetail.tsx` | Vendor history strip | side | inline SVG | 5 | UPGRADE | EditorialSparkline | Existing wrapper. |
| 119 | `/thread/:vendorId` RedThread | `pages/RedThread.tsx` | Hero number reveal | top | bespoke | 8 | KEEP | — | Editorial. |
| 120 | `/thread/:vendorId` RedThread | `pages/RedThread.tsx` | Chapter 2 — capture timeline | mid | inline SVG | 7 | KEEP | — | Editorial. |
| 121 | `/thread/:vendorId` RedThread | `pages/RedThread.tsx` | Chapter 3 — network reveal | mid | inline SVG | 6 | UPGRADE | EditorialNetwork (NEW) | Annotate each connection. |
| 122 | `/thread/:vendorId` RedThread | `pages/RedThread.tsx` | Chapter 4 — institution roll-call | mid | flat list | 5 | UPGRADE | DotStrip + EntityIdentityChip | Existing primitive. |
| 123 | `/thread/:vendorId` RedThread | `pages/RedThread.tsx` | Chapter 5 — money flow | mid | inline SVG | 6 | UPGRADE | EditorialFlow (NEW) | Same as case money-flow. |
| 124 | `/thread/:vendorId` RedThread | `pages/RedThread.tsx` | Chapter 6 — verdict | bottom | bespoke | 8 | KEEP | — | Editorial. |
| 125 | `/investigation` Investigation | `pages/Investigation.tsx` | Tier counts | top | inline cards | 5 | UPGRADE | DotStrip 4 tiers | Existing primitive. |
| 126 | `/investigation` Investigation | `pages/Investigation.tsx` | Pattern distribution | mid | inline bars | 5 | REPLACE | DotStrip 7 patterns | Existing primitive. |
| 127 | `/investigation/:caseId` | `pages/InvestigationCaseDetail.tsx` | Same shapes as CaseDetail | full | mixed | 5 | UPGRADE | Mirror Cases redesign | Same primitives. |
| 128 | `/workspace` Workspace | `pages/Watchlist.tsx` | Saved-entity bars | mid | flat bars | 4 | REPLACE | DotStrip rows | Existing primitive. |
| 129 | `/workspace` Workspace | `pages/Watchlist.tsx` | Recent-activity strip | side | inline SVG | 5 | UPGRADE | EditorialSparkline | Existing wrapper. |
| 130 | `/stories/:slug` StoryNarrative | `pages/StoryNarrative.tsx` | Volatilidad chart | mid | StoryVolatility component | 3 | REPLACE | FT deviation chart + ridgeline | **n-P3** carry-forward; worst story chart. |
| 131 | `/stories/:slug` StoryNarrative | `pages/StoryNarrative.tsx` | StoryRacingBar | mid | racing bars | 3 | REPLACE | NYT slope-chart for vendor rank | Racing bars are gimmicks. |
| 132 | `/stories/:slug` StoryNarrative | `pages/StoryNarrative.tsx` | StoryAdminSunburst | mid | sunburst | 3 | CUT | Replace with NYT treemap | Sunbursts are anti-pattern. |
| 133 | `/stories/:slug` StoryNarrative | `pages/StoryNarrative.tsx` | StoryRiskPyramid | mid | pyramid | 4 | UPGRADE | Stacked beeswarm by tier | Pyramids hide distribution. |
| 134 | `/stories/:slug` StoryNarrative | `pages/StoryNarrative.tsx` | StoryRiskCalendar | mid | calendar heatmap | 6 | UPGRADE | EditorialHeatmap | Existing wrapper. |
| 135 | `/stories/:slug` StoryNarrative | `pages/StoryNarrative.tsx` | StorySectorParadox | mid | scatter | 6 | UPGRADE | EditorialScatterChart | Existing wrapper. |
| 136 | `/stories/:slug` StoryNarrative | `pages/StoryNarrative.tsx` | StoryProcedureBreakdown | mid | flat bars | 4 | REPLACE | DotStrip rank-by-share | Existing primitive. |
| 137 | `/stories/:slug` StoryNarrative | `pages/StoryNarrative.tsx` | StoryVendorFingerprint | mid | radar | 4 | REPLACE | NYT 5×1 small-multiples bullets | Radars unreadable. |
| 138 | `/stories/:slug` StoryNarrative | `pages/StoryNarrative.tsx` | StoryCommunityBubbles | mid | bubble cloud | 5 | UPGRADE | RiskSpendBeeswarm primitive | Same shape. |
| 139 | `/stories/:slug` StoryNarrative | `pages/StoryNarrative.tsx` | 30+ remaining story chart components | `stories/charts/*` | mixed | varies 4-7 | mixed | Per-story swap (**n-P2**) | Carry-forward; one swap per story. |
| 140 | Settings | `pages/Settings.tsx` | DotStrip preview | side | DotStrip | 7 | KEEP | — | — |
| 141 | `/_dev/charts` ChartCatalog | `pages/_dev/ChartCatalog.tsx` | All canon primitives | full | mixed | 8 | KEEP | — | Internal canon doc. |

> **Audit signals.** Across the 28 surfaces in scope (≈90 chart slots once the
> ~30 story charts collapse into one row 139), the editorial-quality median is
> **5.0** and 23 charts score ≤4 ("visual debt"). The bulk of the debt is two
> shapes: (a) recharts default-styled bar/line/pie for what should be DotStrip
> rankings or slope charts; (b) inline SVG radars/sunbursts/pyramids/donuts for
> what should be small-multiples or ranked dots.

---

# PART B — Worst-debt surfaces (1-15)

Ranked by aggregate visual debt × user traffic × distance from editorial canon.

1. **`/journalists` Newsroom (Stories)** — `StoryNarrative.tsx` + 30+ chart components. The
   single largest pile of generic charts on the platform; story chapters that
   ought to be the most editorially polished are some of the noisiest. **n-P2 + n-P3**
   already on deck — call this Job #1.

2. **`/administrations` Administrations** — 3,761 LOC, 7 distinct chart components
   (sunburst, radar fingerprints, dual heatmaps, vendor breakdown, trajectory,
   concentration timeline, sexenio cards). At least three of those visualize the
   same underlying fact ("AMLO had higher concentration"). Sunburst + radar combo
   is the biggest anti-pattern on the site.

3. **`/institutions/:id` InstitutionProfile** — 2,277 LOC, 8 chart slots, only 1
   editorial. Pie chart for procedures, radar for trust, redundant sector bars,
   and a treemap not from the shipped primitive. High-traffic dossier.

4. **`/aria` ARIA Queue** — Pattern donut + opaque histogram + tier bars + sector
   pills, all visualizing the same tier/pattern facts four times. Top-of-funnel
   for journalists, must scan in <5s.

5. **`/captura` CaptureCreep + CapturaHeatmap** — Two pages on the same concept,
   neither using the shipped CategoryCaptureDumbbell primitive that solves
   exactly this problem. Charts disagree on the metric definition.

6. **`/cases/:slug` CaseDetail** — 2,566 LOC. The narrative carrier for 1,401
   ground-truth cases, but the timeline + Sankey + entity list are all generic.
   The most-read surface for first-time visitors.

7. **`/year-in-review`** — Pie chart for sector mix (instant fail), racing bars
   in places, area-without-annotation. A reference page for journalists pitching
   year-end stories that doesn't read editorial.

8. **`/methodology` + `/model`** — Two surfaces both describing the v0.8.5 model
   with overlapping bar charts, threshold ladders, and SHAP visualizations. The
   page where credibility is staked, but the charts are flat default-recharts.

9. **`/atlas` Observatory (non-PATTERNS lenses)** — TERMS and CATEGORIES lenses
   are the weakest of the four. MONEY and CASES lenses don't exist (**o-P1+/o-P2+**).

10. **`/vendors/:id` VendorProfile network/risk tabs** — Hero is great; the tabs
    behind it (timeline scatter, fingerprint radar, community bubbles, network
    mini) are inconsistent in language and quality.

11. **`/clusters` CorruptionClusters** — Force layout without labels, histogram for
    cluster sizes, flat member tables. The clusters product is interesting; the
    visualization undersells it.

12. **`/intersection`** — Venn diagram for vendor∩institution overlap. Set
    notation reads as opaque to the journalist audience. Should be a
    connected scatter or dumbbell.

13. **`/price-analysis` PriceIntelligence** — 2,166 LOC, four generic recharts
    charts and a flat bar ranking. Big surface, no editorial voice.

14. **`/explore`** — Tabs are mixed: Vendors tab uses EditorialScatterChart (good),
    Trends uses raw recharts (bad), Institutions tab has flat bars. Inconsistent
    within a single page.

15. **`/vendors/compare` + `/institutions/compare`** — Both compare-pages duplicate
    the same flat-bar / radar-dial layout. A single shared deviation-chart
    pattern would replace both.

---

# PART C — New shared primitives to extract

We already have five shipped primitives in `frontend/src/components/sectors/`
(`CompetitionSlopeChart`, `SectorTreemap`, `RiskSpendBeeswarm`,
`CategorySectorSwimlane`, `CategoryCaptureDumbbell`) and the eight in
`components/charts/editorial/` wrapping recharts. The audit surfaces five recurring
chart shapes that don't have an editorial primitive yet:

### C.1 — `EditorialDistribution` (NEW)
**Where seen:** ARIA Queue (#13), Institutions League sidebar (#41), Explore
Vendors strip (#91), Explore Institutions panel (#92), PriceIntelligence
volatility (#105), Methodology calibration (#84).

**Pattern:** density ridge with the canonical 0.60/0.40/0.25 threshold rules
overlaid as vertical guides, sector-tinted body fill, per-tier readouts on the
right. Replaces 6 distinct generic histogram implementations.

**Inspiration:** FT "Where the bodies are buried" risk distributions; Pudding
"Spotify Audio Aesthetic" valence ridge.

**Proposed file:** `frontend/src/components/charts/editorial/EditorialDistribution.tsx`

### C.2 — `EditorialTimeline` (NEW)
**Where seen:** VendorContractTimeline (#52), CaseDetail timeline (#78), RedThread
chapter 2 (already editorial; would standardize), Story timelines, ProcurementCalendar
spike strip (#115).

**Pattern:** vertical event timeline with amount-encoded dot radius, sector-tinted
fills, editorial annotations at decision points (sexenio changes, COVID, AMLO
emergencies). Replaces 5+ scatter-on-time-axis implementations.

**Inspiration:** NYT "How Trump's Second Term Began" event timeline; FT
annotated lifecycles; Pudding "30 Years of American Anxieties" timeline.

**Proposed file:** `frontend/src/components/charts/editorial/EditorialTimeline.tsx`

### C.3 — `EditorialFlow` (NEW)
**Where seen:** CaseDetail money-flow (#79), RedThread chapter 5 (#123),
ContractDetail flow context, FlowParticle existing implementation.

**Pattern:** ICIJ-style pass-through flow: institution → intermediary → vendor,
with amount-weighted edges, editorial annotations on the choke point, and an
explicit "passes through" choke-stat at the narrowest band. Replaces inline
Sankey reimplementations and standardizes the Intermediario story chapter.

**Inspiration:** ICIJ "Pandora Papers" pass-through; Reuters "Forever Pollution"
flow; FT supply-chain choke diagrams.

**Proposed file:** `frontend/src/components/charts/editorial/EditorialFlow.tsx`

### C.4 — `EditorialNetwork` (NEW)
**Where seen:** NetworkMiniGraph (#57), CommunityBubbles (#58), CorruptionClusters
(#28), RedThread chapter 3 (#121), VendorProfile network tab.

**Pattern:** force-directed graph with editorial annotations: top-3 nodes always
labeled with their EntityIdentityChip name, fixed-position legend in the corner,
size = spend, color = risk tier (using SECTOR_COLORS for shape, never text).
Replaces 5 unlabeled blob graphs. Critical: must be deterministic (seeded
layout) so screenshots are stable.

**Inspiration:** ICIJ network maps; Pudding "Constellations"; NYT "Russian
Twitter Trolls" labeled clusters.

**Proposed file:** `frontend/src/components/charts/editorial/EditorialNetwork.tsx`

### C.5 — `EditorialBullet` (NEW)
**Where seen:** Hero stat bullets across 8 dossier pages, OECD-reference bullets
across model/methodology/captura, every "X% vs OECD 25%" callout. We currently
inline this with raw `<svg>` 50+ times.

**Pattern:** horizontal bullet w/ value bar + reference tick + p50/p99 markers
+ readout. Single source of truth for "X vs benchmark". Replaces inline DotBar
hand-rolling in headers.

**Inspiration:** FT bullet chart; Edward Tufte's bullet graph as reified by FT
data desk; Pudding's "Anxieties" amount bars.

**Proposed file:** `frontend/src/components/charts/editorial/EditorialBullet.tsx`

> **Naming convention.** All five live under `components/charts/editorial/` and
> are exported via the existing `editorial/index.ts` barrel. Story-chart usage
> imports through the same barrel, never directly.

---

# PART D — Carry-forward phases from prior plans

Listed for completeness; **do not re-plan**. Sequenced into Part E below.

| Phase ID | Surface | Title | Source plan |
|---|---|---|---|
| `d-P3` | Dashboard | MacroArc++ annotation pass (FT slope upgrade) | DASHBOARD_OBSERVATORY_NEWSROOM_PLAN §B |
| `d-P4` | Dashboard | LeadTimeWall redraw + promotion to §3 | DASHBOARD_OBSERVATORY_NEWSROOM_PLAN §B |
| `d-P5` | Dashboard | Lens-merge (collapse redundant §4/§5 lenses) | DASHBOARD_OBSERVATORY_NEWSROOM_PLAN §B |
| `d-P6` | Dashboard | Footer rebalance + final polish | DASHBOARD_OBSERVATORY_NEWSROOM_PLAN §B |
| `o-P1` | Observatory | MONEY lens — constellation→treemap morph | DASHBOARD_OBSERVATORY_NEWSROOM_PLAN §C |
| `o-P2` | Observatory | CASES lens — temporal seismograph | DASHBOARD_OBSERVATORY_NEWSROOM_PLAN §C |
| `n-P2` | Stories | Per-story chart sweep (8 stories, 1 swap each) | DASHBOARD_OBSERVATORY_NEWSROOM_PLAN §D |
| `n-P3` | Stories | Volatilidad full redesign (worst story chart) | DASHBOARD_OBSERVATORY_NEWSROOM_PLAN §D |
| `n-P4` | Stories | Kicker-stats trio audit | DASHBOARD_OBSERVATORY_NEWSROOM_PLAN §D |
| `n-P5` | Stories | Newsroom landing redesign | DASHBOARD_OBSERVATORY_NEWSROOM_PLAN §D |

---

# PART E — Ordered execution plan

Single global backlog. Dependencies in parentheses. Days are calendar days
of focused work; assume one engineer-day per phase unless larger.

| # | Phase ID | Surface | Title | Days | Deps | Impact |
|---|---|---|---|---|---|---|
| 1 | `prim-P1` | Library | Build `EditorialDistribution` primitive | 1.0 | none | Unblocks 6 surfaces; replaces all generic histograms in one stroke. |
| 2 | `prim-P2` | Library | Build `EditorialBullet` primitive | 0.5 | none | Replaces 50+ inline `<svg>` bullets; single source of truth for OECD reference. |
| 3 | `prim-P3` | Library | Build `EditorialTimeline` primitive | 1.0 | none | Unblocks Vendor / Case / RedThread / Calendar timelines. |
| 4 | `prim-P4` | Library | Build `EditorialFlow` primitive | 1.5 | none | Unblocks money-flow on Case / RedThread / Contract. |
| 5 | `prim-P5` | Library | Build `EditorialNetwork` primitive | 1.5 | none | Unblocks Network / Clusters / Vendor / RedThread. |
| 6 | `aria-P1` | `/aria` | Tier strip + density ridge + cut donut | 1.0 | prim-P1 | High-traffic top-of-funnel; biggest legibility win for journalists. |
| 7 | `aria-P2` | `/aria` | GhostSuspectsPanel → RiskSpendBeeswarm | 0.5 | none | Re-use shipped primitive. |
| 8 | `inst-P1` | `/institutions/:id` | Pie → DotStrip; redundant bars cut | 1.0 | none | Highest-traffic dossier. |
| 9 | `inst-P2` | `/institutions/:id` | Treemap → SectorTreemap; risk-line → CompetitionSlopeChart | 0.5 | none | Re-use shipped. |
| 10 | `inst-P3` | `/institutions/:id` | Trust radar → 5×1 small-multiples bullets | 1.0 | prim-P2 | Eliminates worst chart on dossier. |
| 11 | `vend-P1` | `/vendors/:id` | Timeline → EditorialTimeline; fingerprint radar → small-multiples | 1.0 | prim-P2, prim-P3 | Standardizes vendor profile across tabs. |
| 12 | `vend-P2` | `/vendors/:id` | Risk matrix → RiskSpendBeeswarm; community bubbles → same | 0.5 | none | Re-use shipped. |
| 13 | `vend-P3` | `/vendors/:id` | Network mini → EditorialNetwork; treemap → SectorTreemap | 0.5 | prim-P5 | — |
| 14 | `case-P1` | `/cases/:slug` | Timeline + entity list redesign | 1.0 | prim-P3 | Most-read surface for new visitors. |
| 15 | `case-P2` | `/cases/:slug` | Money-flow Sankey → EditorialFlow | 0.5 | prim-P4 | — |
| 16 | `case-P3` | `/cases` | Library grid w/ amount-encoded dots | 1.0 | none | Pudding-style case browser. |
| 17 | `cap-P1` | `/captura` + `/captura/heatmap` | Re-use CategoryCaptureDumbbell + SectorTreemap | 1.0 | none | Two pages, single coherent vocabulary. |
| 18 | `cap-P2` | `/captura/heatmap` | Heatmap → EditorialHeatmap + annotations | 0.5 | none | — |
| 19 | `n-P3` | Stories | Volatilidad full redesign (worst story chart) | 1.5 | prim-P1 | Carry-forward; visible per-story improvement. |
| 20 | `n-P2` | Stories | 8 story sweeps (1 chart swap each) | 4.0 | all prims | Carry-forward; the largest aggregate quality lift on site. |
| 21 | `n-P5` | `/journalists` | Newsroom landing redesign | 1.5 | none | Carry-forward. |
| 22 | `n-P4` | Stories | Kicker-stats trio audit | 0.5 | prim-P2 | Carry-forward. |
| 23 | `admin-P1` | `/administrations` | Cut sunburst; replace with treemap | 0.5 | none | Single biggest anti-pattern removal. |
| 24 | `admin-P2` | `/administrations` | Radar fingerprints → 6×1 small-multiples | 1.0 | prim-P2 | — |
| 25 | `admin-P3` | `/administrations` | Trajectory + concentration → CompetitionSlopeChart | 0.5 | none | — |
| 26 | `admin-P4` | `/administrations` | AdminVendorBreakdown → DotStrip | 0.5 | none | — |
| 27 | `model-P1` | `/methodology` + `/model` | Coefficient bars → FT deviation; HR/AUC → CompetitionSlopeChart | 1.0 | none | Credibility-staking surface. |
| 28 | `model-P2` | `/model` | SHAP waterfall → EditorialComposedChart standard | 0.5 | none | — |
| 29 | `clu-P1` | `/clusters` | Force graph → EditorialNetwork; histogram → DotStrip | 1.0 | prim-P5 | — |
| 30 | `int-P1` | `/intersection` | Venn → connected scatter; ranking → DotStrip | 1.0 | none | — |
| 31 | `pat-P1` | `/patterns` + `/patterns/:code` | Tiles + dossier → DotStrip + sparkline | 1.0 | none | — |
| 32 | `expl-P1` | `/explore` | TrendsTab + InstitutionsTab → editorial wrappers | 1.0 | prim-P1 | — |
| 33 | `expl-P2` | `/explore` | SectorTreemapPanel → SectorTreemap primitive | 0.25 | none | One-line swap. |
| 34 | `pri-P1` | `/price-analysis` | All four charts → editorial wrappers | 1.5 | prim-P1 | — |
| 35 | `yir-P1` | `/year-in-review` | Pie → DotStrip; area → annotated; YoY → slope | 1.0 | none | Pie ban enforcement. |
| 36 | `yir-P2` | `/year-in-review` | Cases stack → Pudding card-grid | 1.0 | none | — |
| 37 | `cmp-P1` | `/vendors/compare` + `/institutions/compare` | Shared FT deviation pattern | 1.5 | prim-P2 | One pattern, two surfaces. |
| 38 | `cal-P1` | `/procurement-calendar` | Heatmap + spikes → editorial wrappers | 0.5 | none | — |
| 39 | `inv-P1` | `/investigation` | Tier + pattern strips → DotStrip | 0.5 | none | — |
| 40 | `inv-P2` | `/investigation/:caseId` | Mirror Cases redesign | 0.5 | case-P1 | — |
| 41 | `ws-P1` | `/workspace` | Saved-entity bars → DotStrip; activity → sparkline | 0.5 | none | — |
| 42 | `con-P1` | `/contracts/:id` | Bullet + sparkline + waterfall standardization | 0.5 | prim-P2 | — |
| 43 | `sec-P1` | `/sectors/:id` | Re-use treemap + slope; cut redundant bars | 0.5 | none | Polish-only on already-redesigned area. |
| 44 | `cat-P1` | `/categories/:id` | Re-use swimlane + dumbbell + DotStrip | 0.75 | none | Polish-only on already-redesigned area. |
| 45 | `red-P1` | `/thread/:vendorId` | Chapters 3/4/5 → EditorialNetwork/DotStrip/EditorialFlow | 1.5 | prim-P4, prim-P5 | — |
| 46 | `d-P3` | `/` Dashboard | MacroArc++ annotation pass | 1.0 | none | Carry-forward. |
| 47 | `d-P4` | `/` Dashboard | LeadTimeWall redraw + promotion to §3 | 1.0 | none | Carry-forward. |
| 48 | `d-P5` | `/` Dashboard | Lens-merge | 1.0 | none | Carry-forward. |
| 49 | `d-P6` | `/` Dashboard | Footer rebalance | 0.5 | none | Carry-forward. |
| 50 | `o-P1` | `/atlas` | MONEY lens (constellation→treemap morph) | 2.0 | none | Carry-forward; signature feature. |
| 51 | `o-P2` | `/atlas` | CASES lens (temporal seismograph) | 2.0 | none | Carry-forward. |
| 52 | `o-P3` | `/atlas` | TERMS lens redesign | 1.5 | none | — |
| 53 | `o-P4` | `/atlas` | CATEGORIES lens cluster-with-callouts | 1.5 | none | — |

> **Total: ~52 days** of focused work. Critical path is the 5 new primitives
> (≈5.5 days) which unblock 30+ downstream phases. After primitives ship, the
> remaining work is largely parallelizable across surfaces.

---

# PART F — Anti-pattern checklist (NEVER ship these again)

Building on `DASHBOARD_OBSERVATORY_NEWSROOM_PLAN.md` D.3:

1. **Pie / donut charts.** Zero exceptions. Pies for procedure mix, sector mix,
   risk-tier mix all become DotStrip rankings.
2. **Stacked bars with > 3 segments.** If you need to show shares of a whole
   with more than three categories, use a DotStrip ranked by share or a treemap.
3. **Radar / spider charts.** Unreadable for >4 axes; use 5×1 NYT-style
   small-multiples bullets instead. Already replaced on Vendor / Institution /
   Story fingerprints; never reintroduce.
4. **Sunbursts for hierarchy comparisons.** The outer ring is impossible to
   compare across pages. Use a treemap.
5. **Pyramids (population-style or risk-tier).** Hide intra-tier distribution.
   Use a stacked beeswarm.
6. **Racing bars.** Gimmicky; the rank changes are noise. Use a slope chart of
   first-vs-last frame with intermediate annotations.
7. **Recharts default `<Legend>` separated from the chart.** Direct labels on
   the data, always.
8. **Recharts default `<Tooltip>`.** White-on-white, mismatched typography. Use
   the editorial wrapper or omit tooltip.
9. **Hex strings as Tailwind class fragments.** `cn(..., '#dc2626')` strips
   silently. Always `style={{ color: hex }}`. Always import from `SECTOR_TEXT_COLORS`
   for text fills, `SECTOR_COLORS` for shape fills/strokes.
10. **Plain `<Link to={`/vendors/${id}`}>`.** Must use `<EntityIdentityChip>`.
11. **"$2.84T fraud" / "1,843 LLM memos" / "1,380 cases"** without the
    honest-pitch-matrix disclaimer.
12. **Generic histograms with no threshold rules.** All risk distributions get
    0.60/0.40/0.25 vertical guides via `getRiskLevelFromScore`.
13. **Choropleth maps that lie via headquarters effect.** Either ship a real
    spend-weighted TopoJSON or skip the map. (Already fixed on Dashboard; never
    reintroduce on Administrations or YearInReview.)
14. **5+ category bar charts that should be slopes.** If the categories have
    a natural pre/post (sexenios, model versions, years), it's a slope.
15. **Unlabeled force-directed network blobs.** Top-3 nodes always labeled
    with EntityIdentityChip. Layout must be deterministic (seeded).
16. **Decorative motion that delays the data.** Animations >300ms on initial
    render block the reader. Easings are fine; multi-second reveals are not.
17. **Stories without a sledgehammer chapter 1.** Per existing rule.
18. **Cluster panels / drawers reimplemented per surface.** Reuse `EntityDrawer`.
19. **Green for low risk.** Already lint-gated; watch for it.
20. **Two charts of the same fact on the same page.** The Sectors-page lesson:
    if a treemap and a bar both show "X has the most", cut one.

---

*End of master plan. Authored 2026-05-04. Risk model in copy: v0.8.5.*
