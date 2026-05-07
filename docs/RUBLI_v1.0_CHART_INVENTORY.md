# RUBLI v1.0 Chart Inventory

Scope: `frontend/src/components/charts/` · `frontend/src/components/charts/editorial/` · `frontend/src/components/stories/charts/` · `frontend/src/components/editorial/`

Tier key: **Gold** = bespoke SVG geometry, named-precedent aesthetic, intentional typography / **Decent** = well-wrapped recharts, functional, not embarrassing / **Pathetic** = generic default, stat grid, no geometric thought

---

## Full Inventory

| File | Tier | Used by | Bilingual | Notes |
|---|---|---|---|---|
| `components/charts/ConcentrationConstellation.tsx` | Gold | Atlas (AtlasZoomLayer, AtlasLeftRail, atlas-stories) | Yes | Halton(2,3) dot-density sky, 3 clustering modes (PATRONES/SECTORES/SEXENIOS), Nightingale-grammar attractor rings — the Atlas centrepiece |
| `components/charts/cluster-glyphs.tsx` | Gold | ConcentrationConstellation | Yes (ariaLabel) | 7 semantically distinct SVG glyphs for ARIA patterns P1–P7; self-explanatory geometry (disk / dashed-ring / arrow / overlapping rings / triangle / nested rings / mesh) |
| `components/charts/VendorFingerprintChart.tsx` | Gold | StoryVendorFingerprint → StoryNarrative | Yes (labelES/EN) | Nightingale polar-area "corruption fingerprint"; risk petals vs protective petals; motion-animated; SHAP-backed |
| `components/charts/MiniRiskField.tsx` | Gold | Sectors (index.ts export) | No | 60-dot Halton particle field at 88×32px; texture-not-data sparkline replacement; fully deterministic |
| `components/charts/RiskRingField.tsx` | Gold | SectorProfile | No | Dot-ring donut replacement; centripetal critical clustering; clean alternative to pie charts |
| `components/charts/FlowParticle.tsx` | Gold | RedesKnownDossier | No | Particle-stream Sankey; dot bundles along cubic Bézier paths; log-density encoding |
| `components/charts/SeasonalityCalendar.tsx` | Gold | StorySeasonalityCalendar → StoryNarrative | Yes | Radial bar (clock face); 23-year December-effect aggregate; metric toggle |
| `components/charts/RiskPyramid.tsx` | Gold | StoryRiskPyramid → StoryNarrative | No | Bi-directional dot-matrix pyramid (contracts left, value right); custom SVG geometry showing the rare-critical / large-value paradox |
| `components/charts/AdminSectorSunburst.tsx` | Gold | Administrations, StoryAdminSunburst → StoryNarrative | No | Dual-ring sunburst (admin inner, sector outer); custom arc geometry; click-to-filter |
| `components/charts/editorial/DotStrip.tsx` | Gold | (canonical primitive — consumed via all DotStrip callers) | No (colorToken API) | RUBLI bible §4 canonical: N=50, R=3, GAP=8; OECD mark; href clickable rows; sublabel; motion-animated |
| `components/charts/editorial/ChartFrame.tsx` | Gold | ChartCatalog (_dev) | No | Bible-locked editorial wrapper: overline / Playfair title / italic dek / mono source / methodology link; finding-first grammar |
| `components/charts/editorial/EditorialTimeline.tsx` | Gold | CaseDetail, VendorActivityTab | No | Vertical spine with amount-encoded dot radii; sexenio wash bands; amount→Playfair; risk/sector dot coloring |
| `components/charts/editorial/EditorialDistribution.tsx` | Gold | AriaQueue | No | Custom SVG KDE density ridge (3-pass smoothing, 60 bins); threshold vrules; highlight area; no d3 dep |
| `components/charts/editorial/EditorialLineChart.tsx` | Decent | SectorProfile, Administrations, SectorRiskTrendPanel, AdminRiskTrajectory, AdminConcentrationTimeline, CompetitionSlopeChart, ChartCatalog | No (tokens) | Token-locked recharts LineChart; horizontal-only gridlines; bible-compliant; multi-series; annotation bands |
| `components/charts/editorial/EditorialComposedChart.tsx` | Decent | Administrations, InstitutionProfile, CategoryProfile, TemporalRiskChart, CovidEmergencyChart, TimeSeriesPanel, TrendsTab, ChartCatalog | No (tokens) | Token-locked recharts ComposedChart; dual Y-axis line+area; no bars (bible §4); annotation vrule/bands |
| `components/charts/editorial/EditorialAreaChart.tsx` | Decent | InstitutionProfile, SectorProfile, VendorActivityTab, YearInReview, ChartCatalog | No (tokens) | Token-locked recharts AreaChart; single series; gradient fill; bible typography |
| `components/charts/editorial/EditorialScatterChart.tsx` | Decent | VendorContractRiskMatrix, VendorContractTimeline, SectorParadoxScatter, TrendsTab, VendorsTab, ChartCatalog | No (tokens) | Token-locked recharts scatter; optional quadrant labels; size encoding (ZAxis); NYT-style |
| `components/charts/editorial/EditorialRadarChart.tsx` | Decent | AdministrationFingerprints, VendorCompare, InstitutionCompare, TrendsTab, ChartCatalog | No (tokens) | Token-locked recharts RadarChart; optional consensus polygon (FT-style); 1–3 overlaid series |
| `components/charts/editorial/EditorialSparkline.tsx` | Decent | EntityProfileDrawer, ChartCatalog | No (tokens) | Tiny inline recharts sparkline; no axes; line or area kind; height 24–48 |
| `components/charts/editorial/EditorialHeatmap.tsx` | Decent | ChartCatalog only | No | Pure SVG matrix heatmap; sparse [col,row,value] input; annotation cells; no ECharts; only used in dev catalog — **potential orphan** |
| `components/charts/SectorRiskHeatmap.tsx` | Decent | StorySectorRiskHeatmap → StoryNarrative | Yes | 12×24 NYT-style dark grid; risk/DA/high-risk% metric toggle; admin bands; recharts not used — pure SVG |
| `components/charts/RiskCalendarHeatmap.tsx` | Decent | StoryRiskCalendar → (story wrapper only, no page direct use) | Yes | GitHub-style 10yr×12mo grid; correct bible color ramp (no green); API-driven |
| `components/charts/SectorRiskTrendPanel.tsx` | Decent | Sectors, StorySectorRiskTrends → StoryNarrative | Yes | Multi-sector line chart via EditorialLineChart; sector toggle checkboxes; scandal reference lines; CSV download |
| `components/charts/TemporalRiskChart.tsx` | Decent | StoryTemporalRiskChart → StoryNarrative | Yes | Composed line+area via EditorialComposedChart; scandal vrules; fallback static data |
| `components/charts/AdminConcentrationTimeline.tsx` | Decent | Administrations | Yes | Concentration-over-time via EditorialLineChart; admin era bands; sector lines |
| `components/charts/AdminRiskTrajectory.tsx` | Decent | Administrations | No | Per-admin risk metric via EditorialLineChart; hex admin colors in props (legacy, not used internally) |
| `components/charts/AdministrationFingerprints.tsx` | Decent | Administrations, StoryAdminFingerprints → StoryNarrative | Yes | 5-panel radar via EditorialRadarChart; static data; migrated from hex→tokens |
| `components/charts/SectorParadoxScatter.tsx` | Decent | (self-contained — NOT imported by any page directly) | Yes | DA%×high-risk% scatter via EditorialScatterChart; sector color tokens; per-sector live API | 
| `components/charts/SectorAdminHeatmap.tsx` | Decent | Administrations | Yes | 12 sector × 5 admin pure CSS grid; no chart lib; contract-weighted avg risk; correct v0.8.5 thresholds |
| `components/charts/AdminSectorHeatmap.tsx` | Decent | Administrations | Yes | 6 admin × 12 sector spend % heatmap; CSS grid; same data as SectorAdminHeatmap, different axis orientation — **possible redundancy with SectorAdminHeatmap** |
| `components/charts/StackedArea.tsx` | Decent | (index.ts export only — no page import found) | No | Recharts 4-series stacked area (low/medium/high/critical); TODO comment notes migration deferred — **likely orphan** |
| `components/charts/MoneySankeyChart.tsx` | Decent | StoryMoneySankeyChart → StoryNarrative | No | D3-sankey alluvial; institution→vendor flows; risk-colored nodes; d3-sankey dep |
| `components/charts/VendorConcentrationTreemap.tsx` | Decent | (index.ts export only — no page import found) | No | ECharts treemap; risk-colored cells; InstitutionProfile was listed as target but not imported — **likely orphan** |
| `components/charts/CategoryRanking.tsx` | Decent | (self-contained — no page import found) | No | Editorial ranked list replacing CategoryTreemap; no chart lib; tier emphasis; risk badge medium+ only — **orphan** |
| `components/charts/CommunityBubbles.tsx` | Decent | StoryCommunityBubbles → StoryNarrative | No | SVG packed bubble clusters; golden-spiral layout; API-driven; risk color; navigate on click |
| `components/charts/CategoryHotspot.tsx` | Pathetic | (self-contained — no page import found) | Yes | Plain link list sorted by avg_risk; SECTOR_COLORS redefined locally (violation); no geometry — **orphan** |
| `components/charts/ProcedureBreakdown.tsx` | Decent | StoryProcedureBreakdown → StoryNarrative | No | 3-stripe dot-matrix per sector (direct/single/open); N=50 dots per row; raw hex colors (#4ade80 green — bible violation) |
| `components/charts/SectorConcentrationChart.tsx` | Decent | Sectors | Yes | Pure CSS horizontal bars (top-3 vendor %; no chart lib); correct token palette; straightforward |
| `components/charts/DotStrip.tsx` | Decent | (legacy adapter — consumed via editorial/DotStrip) | No | Thin wrapper re-routing legacy callers to editorial/DotStrip; itself not a renderer |
| `components/charts/editorial/DotStrip.tsx` (canonical) | Gold | (canonical — see above) | — | (listed above as canonical Gold) |
| `components/charts/AdminVendorBreakdown.tsx` | Pathetic | Administrations | Yes | Skeleton-wrapped list of vendor rows; CSS bars via `eraColor`; no chart geometry — styled data table |
| `components/stories/charts/AmloEraComparisonChart.tsx` | Gold | StoryNarrative | No | Pure SVG dot-matrix; era rows; OECD cyan line; avg vs peak strip comparison |
| `components/stories/charts/DaBySectorChart.tsx` | Gold | StoryNarrative | Yes (SECTOR_COLORS) | Pure SVG dot-strip per sector; OECD ceiling line; barcode-scan layout; sector palette |
| `components/stories/charts/DaRateTrendChart.tsx` | Gold | StoryNarrative | No | Pure SVG connected-dot trend with presidential era bands; dashed OECD ceiling; no recharts |
| `components/stories/charts/RiskBySectorChart.tsx` | Gold | StoryNarrative | Yes (SECTOR_COLORS) | Pure SVG dot-strip high-risk %; OECD 9% benchmark line; sorted descending |
| `components/stories/charts/SexenioComparisonChart.tsx` | Gold | StoryNarrative | No | Pure SVG 4-metric × 4-sexenio grouped dot strips; every strip comparative |
| `components/stories/charts/CovidEmergencyChart.tsx` | Decent | StoryNarrative | No | EditorialComposedChart wrapper; DA + single-bid lines; COVID band annotation |
| `components/stories/charts/MonthlySpendingChart.tsx` | Gold | StoryNarrative | No | Pure SVG dot-column avalanche; 12 months; amber→red escalation for Oct–Dec; clean editorial geometry |
| `components/stories/charts/StoryAdminFingerprints.tsx` | Decent | StoryNarrative | No | Thin motion wrapper over AdministrationFingerprints (EditorialRadarChart) |
| `components/stories/charts/StoryAdminSunburst.tsx` | Decent | StoryNarrative | No | Thin motion wrapper over AdminSectorSunburst |
| `components/stories/charts/StoryAusteridadChart.tsx` | Gold | StoryNarrative | No | Pure SVG dual-strip per era (spend vs DA%); visual tension of flat spend vs growing red |
| `components/stories/charts/StoryAvalanchaDiciembre.tsx` | Gold | StoryNarrative | No | Pure SVG vertical dot-column per month; Dec column towers above; reference line at mean; CSS var colors |
| `components/stories/charts/StoryCasaContratos.tsx` | Gold | StoryNarrative | No | Pure SVG radial institution+vendor orbit; satellite sizing by value; risk-colored nodes; editorial planet-and-moons metaphor |
| `components/stories/charts/StoryCeroCompetenciaChart.tsx` | Gold | StoryNarrative | Yes (SECTOR_COLORS) | Pure SVG dot-strip competitive % per sector; OECD 75% ceiling no strip reaches |
| `components/stories/charts/StoryCommunityBubbles.tsx` | Gold | StoryNarrative | No | Pure SVG radial hub-and-spoke network; risk-colored nodes; radius = value; editorial planet pattern |
| `components/stories/charts/StoryCuartaAdjudicacion.tsx` | Gold | StoryNarrative | No | Pure SVG 4-ring concentric donut; arc sweep = DA rate; staircase spiraling outward; CSS var sector colors |
| `components/stories/charts/StoryGraneroVacio.tsx` | Gold | StoryNarrative | Yes (SECTOR_COLORS) | Pure SVG dot-strip per SEGALMEX-orbit vendor; DA% badge; $100M MXN/dot scale |
| `components/stories/charts/StoryHemoserSplitting.tsx` | Gold | StoryNarrative | No | Pure SVG vertical dot-column by year; custom column chart; 40-row dot grid; annotated peak |
| `components/stories/charts/StoryInfraestructura.tsx` | Decent | StoryNarrative | No | SVG stacked bars by year (direct/single/open%); annotated events; color uses raw hex (minor violation) |
| `components/stories/charts/StoryInsabi.tsx` | Gold | StoryNarrative | No | Pure SVG before/after side-by-side dot strips (Seguro Popular vs INSABI); 3 metrics per era |
| `components/stories/charts/StoryMoneySankeyChart.tsx` | Decent | StoryNarrative | No | Motion wrapper over MoneySankeyChart (d3-sankey); pharma triangle static data |
| `components/stories/charts/StoryNuevosRicos.tsx` | Gold | StoryNarrative | No | Pure SVG cohort scatter; era-colored bubble clusters (Calderón/Peña/AMLO); size=contract count; OECD ceiling |
| `components/stories/charts/StoryOceanografia.tsx` | Gold | StoryNarrative | No | Pure SVG dot-column timeline; one vendor/one client/11 years; sharp cutoff annotation 2014 |
| `components/stories/charts/StoryProcedureBreakdown.tsx` | Decent | StoryNarrative | No | Motion wrapper over ProcedureBreakdown (3-strip dot matrix); green hex still present in underlying |
| `components/stories/charts/StoryRacingBar.tsx` | Gold | StoryNarrative | No | Pure SVG radial bubble cluster (SEGALMEX hub); risk-gradient coloring; DA% → red/orange/green orbit |
| `components/stories/charts/StoryRedFantasma.tsx` | Gold | StoryNarrative | No | Pure SVG ghost-network; 42 vendor circles sized by contracts; shared-address edges; sequential reveal animation |
| `components/stories/charts/StoryRiskCalendar.tsx` | Decent | StoryNarrative | No | Motion wrapper over RiskCalendarHeatmap |
| `components/stories/charts/StoryRiskPyramid.tsx` | Decent | StoryNarrative | No | Lightweight motion/editorial wrapper over RiskPyramid; does NOT use the full RiskPyramid component (has its own inline dot pyramid) — **duplicates geometry** |
| `components/stories/charts/StorySeasonalityCalendar.tsx` | Decent | StoryNarrative | No | Motion wrapper over SeasonalityCalendar |
| `components/stories/charts/StorySectorParadox.tsx` | Gold | StoryNarrative | Yes (SECTOR_COLORS) | Pure SVG scatter; sector dots; no recharts; bespoke quadrant annotations |
| `components/stories/charts/StorySectorRiskHeatmap.tsx` | Decent | StoryNarrative | No | Motion wrapper over SectorRiskHeatmap |
| `components/stories/charts/StorySectorRiskTrends.tsx` | Decent | StoryNarrative | No | Motion wrapper over SectorRiskTrendPanel |
| `components/stories/charts/StorySexenioASexenio.tsx` | Gold | StoryNarrative | No | Pure SVG 5-column DA rate dot-strips; party-color base indicators; clean comparative grammar |
| `components/stories/charts/StorySixSigmaHacienda.tsx` | Gold | StoryNarrative | No | Pure SVG win-rate anomaly; two vertical dot columns (vendor vs baseline); 147-contract risk dot strip |
| `components/stories/charts/StoryTemporalRiskChart.tsx` | Decent | StoryNarrative | No | Motion wrapper over TemporalRiskChart |
| `components/stories/charts/StoryTrenMaya.tsx` | Gold | StoryNarrative | No | Pure SVG 5-section rail route; dot strips per tramo; DA rate + risk score + contractor label; 0-open-tender story |
| `components/stories/charts/StoryTrianguloFarmaceutico.tsx` | Gold | StoryNarrative | No | Pure SVG triangle graph; institution vertices; vendor nodes; edge widths = contract value; dot strips below |
| `components/stories/charts/StoryVendorFingerprint.tsx` | Decent | StoryNarrative | No | Motion wrapper over VendorFingerprintChart; HEMOSER static SHAP data |
| `components/stories/charts/ThresholdSplittingChart.tsx` | Gold | StoryNarrative | No | Pure SVG 12-contract dot-strips all approaching but never crossing the $1.5B red line; precise forensic geometry |
| `components/stories/charts/StoryAnoSinExcusas.tsx` | Gold | StoryNarrative | Yes | Pure SVG year dot-strips 2019-2024; COVID gray bands; 2023 highlighted deep red; bilingual year labels |
| `components/stories/charts/StoryCartelCorazon.tsx` | Gold | StoryNarrative | Yes | Pure SVG device-price overpayment comparison; gray=market, red=IMSS paid; dot overhang = monopoly premium; bilingual device names |
| `components/editorial/DashboardSledgehammer.tsx` | Gold | Executive, MacroArc (dashboard) | Yes | Pudding-pattern hero number; 74% DA rate in Playfair; OECD cyan multiplier annotation; no chart lib |
| `components/editorial/AdminsSledgehammer.tsx` | Gold | (self — not imported by any page; defined but unused) | Yes | Pudding-pattern per-sexenio hero; bilingual — **orphan** |
| `components/editorial/BenchmarkRow.tsx` | Gold | SectorProfile, VendorEvidenceTab | No | FT "deviation from benchmark" diverging bullet; crimson right / zinc left; pure SVG |
| `components/editorial/FeaturedFinding.tsx` | Decent | Sectors, SectorTreemap | No | Generic lede card (kicker/serif/pull-quote/meta strip); editorial voice but purely JSX — not a chart |
| `components/editorial/FeaturedComparison.tsx` | Decent | Administrations | No | A-vs-B lede card with DuetArrow SVG; editorial but not a chart per se |
| `components/editorial/EditorialMasthead.tsx` | Decent | (self — no page import found) | No | Standardised page header (dateline/kicker/title/deck); editorial scaffold — **orphan** |
| `components/editorial/LeagueRow.tsx` | Decent | (self — no page import found) | No | Ranked table row with indicator bar; editorial voice; not yet wired to any page — **orphan** |
| `components/editorial/QuotedPattern.tsx` | Decent | (self — no page import found) | No | Pull-quote with colored left rule; purely JSX — **orphan** |

---

## Summary by Tier

| Tier | Count |
|---|---|
| Gold | 43 |
| Decent | 40 |
| Pathetic | 3 |
| **Total** | **86** |

(Note: `components/charts/DotStrip.tsx` is a legacy adapter, counted separately from `components/charts/editorial/DotStrip.tsx`. The canonical DotStrip is Gold.)

---

## Top 10 Must-Be-Gold Charts for v1.0 Launch Surfaces

These ship on the highest-traffic launch surfaces and need to be in the best possible shape before 2026-05-15:

| Priority | File | Surface | Current tier | Gap |
|---|---|---|---|---|
| 1 | `editorial/DashboardSledgehammer.tsx` | Executive | Gold | None — already strong |
| 2 | `charts/ConcentrationConstellation.tsx` | Atlas (centrepiece) | Gold | None — centrepiece; already Halton/attractor |
| 3 | `charts/editorial/EditorialTimeline.tsx` | RedThread (VendorActivityTab + CaseDetail) | Gold | None — sexenio bands + amount dots are solid |
| 4 | `charts/VendorFingerprintChart.tsx` | RedThread / vendor dossier | Gold | No lang prop passed at call site in StoryNarrative — bilingual gap |
| 5 | `charts/editorial/EditorialDistribution.tsx` | AriaQueue (risk distribution) | Gold | Only used in AriaQueue; not yet on Executive or Methodology |
| 6 | `charts/SectorRiskTrendPanel.tsx` | Sectors family | Decent | Recharts; could use Gold-class editorial geometry for the final chart panel on Sectors |
| 7 | `charts/SectorRiskHeatmap.tsx` | StoryNarrative → sectors | Decent | No bilingual month/year labels (raw MONTH_ABBR array, no t() call) |
| 8 | `charts/RiskRingField.tsx` | SectorProfile / InstitutionProfile | Gold | Not confirmed used on InstitutionProfile — verify wiring |
| 9 | `charts/AdministrationFingerprints.tsx` | Administrations | Decent | Radar is a recharts default look; could be stronger for the comparisons page |
| 10 | `charts/editorial/EditorialLineChart.tsx` | SectorProfile, Administrations, many | Decent | Bible-compliant but still recharts; token-locked so acceptable for launch |

---

## Orphans — Kill Candidates

Components that have no page imports (only in their own file or in barrel `index.ts`):

| File | Evidence | Recommendation |
|---|---|---|
| `components/charts/StackedArea.tsx` | Only in `charts/index.ts` — no page import | Kill or migrate TODO comment; EditorialComposedChart can do stacked area |
| `components/charts/VendorConcentrationTreemap.tsx` | Only in `charts/index.ts` — no page import | Kill unless InstitutionProfile wiring is imminent; ECharts dep is heavy |
| `components/charts/CategoryRanking.tsx` | No import outside own file | Wire to SpendingCategories or kill |
| `components/charts/CategoryHotspot.tsx` | No import outside own file | Kill — also has a local SECTOR_COLORS redefinition (constants violation) |
| `components/charts/SectorParadoxScatter.tsx` | No page direct import (only in own file) | Wire to Sectors or kill; the underlying paradox visualization is good |
| `components/editorial/AdminsSledgehammer.tsx` | No page import | Wire to Administrations page header or kill |
| `components/editorial/EditorialMasthead.tsx` | No page import | Wire as standard header across pages or kill |
| `components/editorial/LeagueRow.tsx` | No page import | Wire to InstitutionLeague / Sectors or kill |
| `components/editorial/QuotedPattern.tsx` | No page import | Wire to any editorial section or kill |
| `components/charts/editorial/EditorialHeatmap.tsx` | Only ChartCatalog (_dev) | Decent primitive but nothing uses it in prod; keep unless wired |

**Total orphans: 10**

---

## Concerns for Launch

1. **ProcedureBreakdown.tsx** uses `#4ade80` (green-400) as `COLORS.tender` — direct bible §3.10 violation (no green). The story chart StoryProcedureBreakdown inherits this.
2. **CategoryHotspot.tsx** redefines `SECTOR_COLORS` locally — import-from-constants rule violation; orphaned anyway.
3. **StoryInfraestructura.tsx** uses raw hex bar fill colors (no token) — minor but flagged.
4. **AdminsSledgehammer.tsx** was built (2026-05-04) but never wired to any page; intended for Administrations page header.
5. **SectorRiskHeatmap.tsx** has hardcoded `MONTH_ABBR` English abbreviations — partial bilingual gap (year labels use API but month labels don't use `t()`).
6. **AdminSectorHeatmap.tsx** and **SectorAdminHeatmap.tsx** appear to be the same data viewed from opposite axes; both are on Administrations page — likely redundant.
7. **StoryRiskPyramid.tsx** duplicates dot-pyramid geometry inline rather than delegating to the canonical `RiskPyramid` component — the story wrapper has its own tier data and SVG logic.
8. **VendorConcentrationTreemap.tsx** brings in ECharts (heavy bundle dep) but has no page consumer.
