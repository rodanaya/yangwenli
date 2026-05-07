# RUBLI v1.0 — Quality Bar

> **Purpose.** Define, in concrete patterns, what "RedThread / Atlas / Dashboard
> quality" means so the next 4–7 days of fixes can be measured against it
> without further design debate. Read it as a contract, not a manifesto.
>
> **Reference vocabulary.** FT Visual Vocabulary, Reuters Graphics, ICIJ
> Pandora Papers, NYT Upshot, OCCRP. Everything below is calibrated to that
> register: investigative-folio chrome, hand-typeset numerics, one chart =
> one finding, no decorative dashboard chrome.
>
> **Status.** Definitional. No redesigns are proposed in this document — only
> the bar and the gap. Authored 2026-05-07.

---

## 1. The four gold-standard surfaces

| # | Route | File | LOC |
|---|---|---|---|
| 1 | `/atlas` (Observatorio) | `frontend/src/pages/Atlas.tsx` | 2,317 |
| 2 | `/` (Dashboard / Executive) | `frontend/src/pages/Executive.tsx` | 2,763 |
| 3 | `/aria` (Risk Queue) | `frontend/src/pages/AriaQueue.tsx` | 1,901 |
| 4 | `/thread/:vendorId` (Red Thread) | `frontend/src/pages/RedThread.tsx` | 2,943 |

Two shared structural facts make these four surfaces feel like one product:

- **Folio chrome.** Each surface wears an archival eyebrow (`Folio·N`,
  IBM Plex Mono italic, 10 px, letter-spacing `0.18em`, accent
  `#a06820 / var(--color-accent)`) and either a `<PlateFrame>` wrapper
  around its hero chart (Atlas, Executive, Administrations) or a
  `Folio·D / Folio·V / Folio·INST` eyebrow + serif italic H1 (RedThread,
  AriaQueue, VendorHero).
- **Hand-built SVG primitives.** None of the four ever delegates a hero
  chart to recharts. Every signature chart is a custom SVG: TimelineHourglass,
  ConcentricConstellation, MoneyStaircase, PatternDiagnostic, MacroArc,
  ConcentrationConstellation, LollipopScore, TenureRibbon. Recharts shows
  up only as a 24px-tall sparkline inside admin selector cards
  (`Administrations.tsx:1483`).

---

## 2. RedThread — the editorial flagship

**Composition.** Six chapters, one editorial primitive (`<ChapterShell>`)
that limits each chapter to `max-w-4xl`, `py-5 px-4 sm:px-8` rhythm. Defined
at `RedThread.tsx:133-139`.

### 2.1 Chart families used (one signature chart per chapter)

| Chapter | Chart family | Lines | Notes |
|---|---|---|---|
| I Subject | Editorial stat block + 3 inline `<CompactDotBar>` slivers | 180-216, 295-357 | Hero number is Playfair Italic 800, `clamp(2.5rem, 5vw, 3.75rem)`, sector-tinted. Three byline stats each get their own 18-dot sliver showing vendor vs OECD/national reference band. Replaces 4-card KPI grid. |
| II Timeline | `TimelineHourglass` — bipolar bar mirror | 446-775 | Above-axis: contract count, log scale, neutral `text-muted`. Below-axis: log(value), risk-colored. Era backgrounds (stable/watch/alert), 7 admin/scandal pin annotations, hero callout flag, hover/pin/era-filter state. |
| III Pattern | `PatternDiagnostic` — medical lab-report panel | 1047-1230 | Each row = one feature on a `-3σ ↔ +3σ` axis with sector p25-p75 reference band, vendor marker, SHAP contribution badge. Auto-summary "diagnosis" line. |
| IV Network | `ConcentricConstellation` (1266-1492) + `InstitutionalRibbon` (1509-1698) | — | Constellation: 3 rings (vendor center, ≤8 co-bidder ring, ≤24 institution ring), sector petals, atmospheric radial gradient, role-classified co-bidders. Ribbon: 12 horizontal lanes, ribbon thickness encodes log(value), color encodes avg_risk, year axis at top. |
| V Money | `MoneyStaircase` — cumulative stepped path | 1832-2050+ | Cumulative MXN as risk-colored stairsteps. Top-3 jumps auto-pinned. Final right-edge "$N by YEAR" callout. Y-axis grid at 0/25/50/75/100% of cumulative total. |
| VI Verdict | Stacked verdict pillar (no chart) | rest | Editorial close. |

**Density rule.** Each chapter delivers exactly: 1 `<ChapterLabel>` kicker
+ 1 `<RedThreadChapter>` serif title + ≤2 paragraphs of prose (max-w-2xl)
+ 1 signature chart + 1 plain-language interpretation strip ("Concentration",
"Topology read", "Era narrative"). Inter-chapter gap is 64px content-edge
to content-edge (`py-5` + `ChapterDivider`, RedThread.tsx:131-138).

### 2.2 Typography stack

```
Hero number    Playfair Display Italic 800, clamp(2.5rem, 5vw, 3.75rem),
               tabular-nums, sector-tinted via style={{ color: hex }}
H1 (subject)   var(--font-family-serif), font-bold,
               clamp(1.5rem, 2.6vw, 2rem), letter-spacing -0.02em
Chapter title  var(--font-family-serif), font-bold, text-xl
Chapter label  editorial-label class, text-[var(--color-accent)],
               tracking-[0.18em]
Body           text-text-secondary, text-sm, leading-relaxed, max-w-2xl
Mono caption   text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted
SVG axis       fontSize 8.5-11, fontFamily var(--font-family-mono),
               fill var(--color-text-muted)
Stakes pull    var(--font-family-serif) italic 0.95rem, leading 1.55,
               border-left 2px var(--color-accent), padding-left 0.85rem
```

### 2.3 Layout chrome

- No `<PlateFrame>` (RedThread is itself the plate). Crimson scroll-thread
  in left margin grows with `useScroll`.
- Era backgrounds inside the timeline SVG (alert = `rgba(220,38,38,0.10)`,
  watch = amber, stable = `rgba(160,104,32,0.04)`).
- Detail panel under TimelineHourglass = 4-cell grid with mono labels at
  `9px tracking-[0.12em]`, values at `text-base font-bold font-mono`.
- Hover/pin/era-filter pills in mono uppercase (RedThread.tsx:843-881).

### 2.4 Editorial primitives reused

`EntityIdentityChip` (institution/vendor links), `formatVendorName`,
`formatCompactMXN`, `getRiskLevel`, `RISK_DOT_COLORS` (CSS variables),
`SECTOR_COLORS`. Custom: `<ChapterShell>`, `<ChapterLabel>`,
`<RedThreadChapter>`, `<ChapterDivider>`, `<CompactDotBar>`,
`<StakesPullquote>`.

### 2.5 What RedThread avoids

- No `<Card>`, `<CardContent>`, `<CardHeader>` from `@/components/ui/card`.
- No recharts, no echarts.
- No KPI grid (`grid grid-cols-4` of bordered tiles).
- No green for "low risk" — `low` → `var(--color-text-muted)`.
- No raw hex risk palette in JSX (uses CSS vars + RISK_DOT_COLORS).
- No flat 4-stat hero (replaced by hero+byline editorial composition).

### 2.6 Bilingual handling

Everything routes through `useTranslation('thread')` + `t(...)` keys. No
inline `lang === 'en' ? ... : ...` ternaries except in two SVG legends at
`RedThread.tsx:1486-1488` and `1567-1568` (because they are decorative
text inside SVG, not story copy). A `TFunction` is threaded down explicitly
(`pattern.ts:71-81`, `chapter` props). This is the canonical bilingual
pattern: **i18n keys for prose, `lang` ternary only for SVG legends.**

### 2.7 RedThread quality fingerprint (5 bullets)

1. **One chapter = one chart = one finding.** No surface shows two charts
   in the same fold. The reader's eye lands on one signature SVG per scroll.
2. **Hero number in Playfair Italic 800, sector-tinted, with a 3-stat
   byline strip.** Each byline stat carries an inline 18-dot reference
   sliver (vendor vs OECD/national).
3. **Every chart is a hand-built SVG with explicit annotations** (era
   backgrounds, hero callouts, top-N pins, plain-language summary line).
4. **Editorial primitives only.** ChapterLabel + RedThreadChapter +
   ChapterShell + ChapterDivider. No Card/CardContent/CardHeader anywhere.
5. **Bilingual via i18n keys, not ternaries.** Story prose lives in
   `thread.json`; only decorative SVG legend text uses `lang === 'es'`.

---

## 3. Atlas — the constellation walk-through

### 3.1 Chart families used

| Family | Lines | Notes |
|---|---|---|
| `ConcentrationConstellation` (Halton attractors + nearest-neighbor edges) | wrapped at 2176-2192 | The single hero chart. Same engine on Dashboard at 220px and Atlas at full viewport. |
| `<PlateFrame>` chrome | 2140-2193 | Four corner crops, IBM Plex Mono folio tag, EB Garamond italic plate caption. Bilingual via `lang` prop. |
| `YearScrubber` (custom slider) | 2196-2202 | Year axis 2008-2025 + autoplay loop at 1.5s/year. |
| Cluster panel (right drawer) | 305-496 | 24px Playfair Italic title, 3-stat mono grid, animated risk-band bar, year-delta indicator with `↑/↓ pp risk` micro-stat, personal note textarea (localStorage), single coloured CTA button. |
| Story chapter overlay | 2150-2169 | Chapter strip pinned over chart while a story plays. Mono uppercase, accent `#a06820`. |

### 3.2 Typography stack

Same Playfair Display + IBM Plex Mono + EB Garamond stack as RedThread.
Cluster panel H2 is `Playfair 800 / 24px / line-height 1.05 /
letter-spacing -0.01em`. Stat values are `font-mono font-bold 20px
tabular-nums` (300-stat-grid only — no Playfair on stats inside the
drawer, because the drawer is utility surface, not editorial).

### 3.3 Density

One canvas, one optional second canvas for compare mode, one cluster
panel. Atlas is intentionally **single-chart**, single-finding-per-mode.
The four lens toggles (PATTERNS / SECTORS / CATEGORIES / SEXENIOS)
re-organize the same population, never adding charts.

### 3.4 Atlas quality fingerprint

1. **One full-viewport hero chart, year-scrubbed, lens-toggled.** No
   secondary chart competes for attention.
2. **PlateFrame wrapping** with IBM Plex Mono folio tag + EB Garamond
   italic plate caption — bilingual via `lang` prop.
3. **Cluster drawer is a working tool, not a tooltip.** Has notes,
   year-delta, "what to look for", single accent-colored CTA.
4. **Editorial primitives demoted.** No Cards, no recharts; the chrome
   is type + 1px rules.
5. **URL state shareable.** `?lens=&year=&pin=&compare=` round-trip.

---

## 4. Executive (Dashboard / `/`)

### 4.1 Chart families used

Plates use `<PlateFrame folio="II|III|IV|V|...">`. The dashboard composes
**~8 numbered plates**, each one finding:

| Plate | Chart | Lines |
|---|---|---|
| II | `<ConcentrationConstellation>` (Atlas engine, 220px) | 1498-1512 |
| III | `<MacroArc>` — 23-year direct-award trend with OECD ceiling line | 1542-1551 |
| IV | `<LeadTimeChart>` — RUBLI-vs-press time gap | 1565-1574 |
| V | Headline numbers — 4 fact cards, **each with its own micro-viz** | 1585-1801 |
| VI+ | LensVisualization (slim narrowing ribbon, 220×var); Cases timeline; Recommendations | rest |

**Each fact card carries a unique micro-viz, never a generic stat tile:**
Tile 1 = 23 yearly mini-cubes (1627-1637). Tile 2 = 100-dot DA strip with
OECD threshold marker (1674-1679). Tile 3+ follow the same rule. The
hero number is Playfair Italic 800 at 36-44px, sector-tinted via
`borderLeftColor` + `style.color` (1611-1619).

### 4.2 Typography stack

Same as RedThread + Atlas. Section eyebrows are `text-[10px] font-mono
font-semibold uppercase tracking-[0.15em] text-text-muted` (1534).
Section description paragraphs are `text-xs text-text-secondary
leading-[1.6] mb-4 text-pretty` (1492).

### 4.3 Density

One plate per `motion.section`, with `mb-10` to `mb-12` between plates.
Each plate occupies a full content row. The four-tile Headline Numbers
plate is the only place where the dashboard shows multiple charts side
by side, and even there each tile is editorially distinct.

### 4.4 Executive quality fingerprint

1. **PlateFrame folios numbered II, III, IV, V…** giving the page an
   archival-investigative-folio rhythm.
2. **Every fact card has a micro-viz, never a bare stat.** No KPI grids
   of equal-weight numbers.
3. **Hero numbers in Playfair Italic 800, sector-tinted accent border,
   click-routes to the canonical story.**
4. **One section = one finding, separated by `mb-10` and a numbered
   plate.** No two charts in one row except inside Plate V (Headline
   Numbers, where each card is its own micro-finding).
5. **Cross-references the rest of the platform** (Atlas, ARIA, Stories,
   RedThread) via subtle mono-uppercase "Open full Observatory →"
   footer links — not hero CTAs that compete with the data.

---

## 5. AriaQueue (`/aria`)

### 5.1 Chart families used

| Component | Lines | Notes |
|---|---|---|
| Folio·V archival eyebrow | 1192-1209 | IBM Plex Mono italic, accent line, EB Garamond italic prose. |
| EB Garamond italic H1 | 1212-1224 | "Cola de Riesgo / Risk Queue" at clamp(28px, 4vw, 38px). Companion mono dateline strip. |
| `TierEditorialStrip` + `EditorialDistribution` (1272-1299) | — | Left: 4-row tier strip. Right: synthesized risk-score distribution chart at 160px. The distribution data is synthesized from tier counts (`synthesizeScoreData`, 743-) — a tradeoff: no backend endpoint, but the shape is plausibly accurate. |
| `<PatternDotStrip>` (1303) → `<DotStrip N=40 labelWidth=140>` (928) | — | Replaces donut/pie. P1-P7 ranked horizontally by vendor count. |
| `<TenureRibbon>` (300-, 730) | — | Per-row mini-strip mapping a vendor's [first_year, last_year] window. Color = IPS risk level. |
| `<LollipopScore>` (FT lollipop, baseline tick at 50, 563) | — | Per-row IPS visualization replaces a bare integer. |
| `<EntityIdentityChip>` (531-540) | — | Vendor name — never a raw `<Link>`. |

### 5.2 Density per row

Each `InvestigationRow` (462-737) is **two visual lines** containing:
identity + value + IPS lollipop + review glyph + arrow on line 1; sector
chip + contract count + top-institution-with-ratio + pattern + recency
badge + GT/EFOS/SFP/LLM/PRESS chips + tenure ribbon on line 2. That is
a high information density per pixel — comparable to a Bloomberg
terminal row, **without losing legibility because every glyph is
semantic**, not decorative.

### 5.3 Editorial primitives reused

`<EntityIdentityChip>`, `<EditorialDistribution>`, `<DotStrip>`,
`MetodologiaTooltip`, `getSectorNameEN`, `RISK_COLORS` (constants).

### 5.4 What AriaQueue avoids

- No giant 5-card KPI grid at top.
- No tier "card" with bordered tile per tier — replaced by editorial
  4-row tier strip + 2 anchor numbers (T1 priority, MXN at risk) at
  `clamp(28px, 4vw, 38px)`.
- No donut/pie for pattern distribution.
- No green for "confirmed" review status (red, because confirmed-corrupt
  is critical, not safe).
- No raw `<Link>` for vendors — always `EntityIdentityChip`.

### 5.5 Bilingual handling

`useTranslation('aria')` + `t()` for prose. `isEs = i18n.language.startsWith('es')`
for inline ternaries on row labels (`'Cola T1' / 'All T1'`, etc.).
Folio·V eyebrow and dateline strip use `isEs` ternaries.

### 5.6 AriaQueue quality fingerprint

1. **Utility surface, not magazine cover.** EB Garamond H1 + 2 anchor
   stats + Folio·V eyebrow give it editorial credibility, but the rest
   is a working investigation tool.
2. **Two visual lines per row, ~10 semantic chips per row.** Density
   is achieved through compressed glyphs, not card grids.
3. **`<TenureRibbon>` + `<LollipopScore>` + `<EntityIdentityChip>`** —
   three bespoke per-row primitives that each solve a specific reading
   task (when active, how risky, who linked-to).
4. **No donut, no pie.** Pattern composition uses a horizontal DotStrip
   ranked by vendor count.
5. **Filter chips and presets feel like one-click investigative views**,
   not a generic dropdown grid.

---

## 6. The shared "RUBLI v1.0 quality fingerprint"

A new surface meets the bar if **all five** are true:

1. **Folio chrome** — archival eyebrow (`Folio·X`, IBM Plex Mono italic
   10px, accent `#a06820`) above the H1, **OR** every hero chart is
   wrapped in `<PlateFrame folio="N" lang={lang}>`.
2. **EB Garamond italic H1** at `clamp(26-38px)` for the entity name +
   `<MetodologiaTooltip>`-style mono dateline strip beneath.
3. **One signature chart per fold.** Hand-built SVG (or
   `<EditorialAreaChart|EditorialComposedChart|EditorialDistribution|
   DotStrip|EditorialTimeline>`), never raw recharts. Hero number is
   Playfair Italic 800, sector-tinted, with an inline reference sliver
   (OECD/peer/national).
4. **Editorial primitives only.** `<EntityIdentityChip>`, `<DotBar>`,
   `<DotStrip>`, `<BenchmarkRow>`, `<StatRow>`, `<PriorityAlert>`,
   `<EditorialDistribution>`, `<EditorialTimeline>`. **No
   `<Card>/<CardHeader>/<CardContent>/<CardTitle>` from
   `@/components/ui/card`** — that imports the generic dashboard rail.
5. **Bilingual via i18n keys for prose; `lang === 'es'` ternaries only
   for SVG legends and Folio eyebrow strings.**

---

## 7. Gap analysis on the four pathetic surfaces

### 7.1 `/vendors/:id` — VendorProfile

`pages/VendorProfile.tsx` (360 LOC) + composed VendorHero (417),
VendorEvidenceTab (538), VendorActivityTab (386), VendorNetworkTab (306).
Total = 2,007 LOC. **Not pathetic** in the same sense as the other
three — VendorHero already has Folio·D eyebrow + EB Garamond italic H1
(`VendorHero.tsx:104-141`) and uses `BenchmarkRow`, `EntityIdentityChip`,
`StatRow`, `DotBarRow`. The tabs use `EditorialAreaChart`,
`EditorialTimeline`, `WaterfallRiskChart`. The gap is structural, not
chrome-level.

| # | Gap | File · Lines | Severity |
|---|---|---|---|
| 1 | **Three-tab structure (`Evidence / Activity / Network`) fragments the editorial arc.** RedThread tells one story across 6 chapters in one scroll; VendorProfile splits the same vendor's evidence across 3 tabs the user must click between. The narrative continuity gold-standard surfaces have is destroyed at the tab boundary. | `VendorProfile.tsx:241-296` | **HIGH** — the whole arc is broken. This is the user's "looks like 2-minute PowerPoint" complaint: tabs are PowerPoint-shaped. |
| 2 | **Evidence tab leans on `WaterfallRiskChart` (a generic recharts-style waterfall) while RedThread's Chapter III ships `PatternDiagnostic`** — the medical-lab-report layout that actually inherits credibility from medicine. The Pattern chapter on `/thread/:id` for the same vendor is dramatically more legible than the Evidence tab on `/vendors/:id`. | `VendorEvidenceTab.tsx:99-103` calls `<WaterfallRiskChart>`; `RedThread.tsx:1003-1014` calls `<PatternDiagnostic>` | **MEDIUM** — same data, weaker telling. |
| 3 | **No PlateFrame anywhere across the four sub-components.** The page has Folio·D eyebrow but no per-chart plate framing — so the Activity tab's `EditorialAreaChart` and the Network tab's lists float in card chrome instead of investigative-folio chrome. | none — absence | **LOW-MEDIUM** — chrome only. |

**Most critical gap:** #1. Tabs structurally prevent the RedThread arc.
**Effort to close all 3:** 2-3 agent-days. (#1 alone = 1.5 days; #2 = 0.5
day; #3 = 0.5 day.) #1 is the rework — the others are polish.

### 7.2 `/institutions/:id` — InstitutionProfile

`pages/InstitutionProfile.tsx`, 2,312 LOC.

| # | Gap | File · Lines | Severity |
|---|---|---|---|
| 1 | **Pervasive `<Card><CardHeader><CardContent>` rail.** Search count: ~63 Card-family references in this file, with the overview tab built as a 3-column grid of bordered cards (`grid gap-6 lg:grid-cols-3`, 803). This is the single biggest visual delta from the bar — Atlas, RedThread, AriaQueue, Executive use **zero** generic Cards in their hot paths. The Card grid is the "PowerPoint" pattern. | `InstitutionProfile.tsx:803-1247` (overview tab alone has 7 Card blocks); `tabs at 760-771` are 6 stacked tabs each composed of more Card grids. | **CRITICAL** — this is the visible "pathetic" delta. |
| 2 | **6-tab structure** (`overview / risk / vendors / officials / history / external`, 760-771) fragments the institutional dossier into ~30 cards across 6 tabs. RedThread is 6 chapters in one scroll — InstitutionProfile is 6 tabs of card grids. Same content count, opposite editorial decision. | `InstitutionProfile.tsx:760-771` + each TabPanel | **HIGH** — same problem as VendorProfile §7.1.1, scaled up. |
| 3 | **Hero header is already gold-standard** (Folio·INST eyebrow + EB Garamond H1 + 3 anchor stats, lines 634-695) **but the body that follows immediately collapses into Card grids** — so the page reads as if a great masthead got bolted onto a 2018 admin dashboard. The contrast is more jarring than uniform mediocrity. | header 634-695 vs body 760-2300 | **HIGH** — the contrast amplifies the perceived ugliness. |

**Most critical gap:** #1. Once Cards are gone, #2 and #3 partially
resolve themselves.
**Effort:** 4-5 agent-days. The page has 6 tabs × ~7 cards each = ~42
discrete sections needing replacement primitives. Realistic minimum:
collapse to 3 chapters (Overview / Vendors / Risk), each a scroll with
2 plates max. That's a multi-day rework, not a polish pass.

### 7.3 `/categories/:id` — CategoryProfile

`pages/CategoryProfile.tsx`, 1,944 LOC.

| # | Gap | File · Lines | Severity |
|---|---|---|---|
| 1 | **The user-flagged "institutional ranking on top is skewed because it includes state institutions."** The page renders a top-vendors concentration table (706-812) but the upstream `categoriesApi.getTopVendors` and `categoriesApi.getVendorInstitution` queries do not filter by institution scope (federal vs state). The "skewed" finding is real and is a backend filter bug surfacing as a UI lie. **This is a data-integrity bug presenting as a design issue.** | `CategoryProfile.tsx:342-354` (queries); `706-812` (concentration table); also `816-905` (vendor-institution pairs). Backend filter lives in `categoriesApi.getTopVendors`. | **CRITICAL** — actively misinforms. |
| 2 | **Many `<Card>` containers** + `recharts`-style `EditorialComposedChart` invocations without PlateFrame. Same Card-grid pattern as InstitutionProfile, scaled to ~10 sections. The page has heavy editorial scaffolding (`profile.sections.eyebrow`, mono kickers) but each section still terminates in a `<Card>` rather than a `<PlateFrame>` or unframed editorial block. | `CategoryProfile.tsx:706, 830, 1147, 1218, 1243…` | **HIGH** |
| 3 | **No hero chart with editorial weight.** The page has 8+ fetched data queries (342-396) — trends, sexenio, top vendors, vendor-institution, top contracts, subcategories, competition, seasonality, patterns, price-distribution — but no equivalent of Atlas's single hero constellation or RedThread's TimelineHourglass. The reader has to integrate 10 charts to form a finding. | structural — entire main render block | **MEDIUM-HIGH** — the page has no editorial spine. |

**Most critical gap:** #1 (the skew). Fix that first because it's an
honest-data issue, not a polish issue.
**Effort:** #1 = 0.5 day (backend filter + UI label). #2 = 2 days. #3
= 2-3 days (requires picking the one finding worth featuring at category
scale — likely "vendor concentration over time" as a single staircase).
Total: 4-5 agent-days.

### 7.4 `/administrations` — Administrations

`pages/Administrations.tsx`, 3,671 LOC. **Largest page in the codebase.**

| # | Gap | File · Lines | Severity |
|---|---|---|---|
| 1 | **Too many lazy-loaded chart components.** The file imports 7 distinct chart components (`AdminVendorBreakdown`, `AdministrationFingerprints`, `AdminSectorSunburst`, `AdminSectorHeatmap`, `SectorAdminHeatmap`, `AdminConcentrationTimeline`, `AdminRiskTrajectory`, plus `EditorialLineChart` + `EditorialComposedChart` + `DotStrip`) and renders most of them. The user's "too many graphs, needs reduction" is literal: the file has 38 chart-component references. Compared to RedThread's 1-chart-per-chapter rule, this is 5–6x over-spec. | `Administrations.tsx:62-74` imports; references at lines 660-1900+ | **CRITICAL** — drives the user's complaint directly. |
| 2 | **Two heatmaps that show the same dimensional cross.** `AdminSectorHeatmap` (1571) and `SectorAdminHeatmap` (1578-block) are reciprocal views of the same sector × admin matrix. One must go. The Sunburst (1532) is a third visualization of overlapping data. | `Administrations.tsx:67-69` + render blocks | **HIGH** — pure redundancy. |
| 3 | **Mixed Card chrome and PlateFrame chrome.** Folio·XI plate (1541) wraps `AdministrationFingerprints` correctly, but the procurement-intensity heatmap immediately below (1559) reverts to `<div className="card">` + `<CardHeader>` + `<CardContent>`. The page can't decide whether it's a folio or a dashboard. | `Administrations.tsx:1559-1576` is a Card; `1541-1554` is a PlateFrame | **MEDIUM** — internal inconsistency. |

**Most critical gap:** #1. Cut to ≤5 plates.
**Effort:** 2-3 agent-days. The fix is largely subtractive (delete
charts, route remaining ones through PlateFrame). Real risk: choosing
*which* 5 plates to keep — that's a 2-hour editorial decision the user
has to make, not the agent.

---

## 8. Effort summary

| Surface | Critical gap | Total effort to reach the bar |
|---|---|---|
| `/vendors/:id` | Tabs break the editorial arc | 2-3 agent-days |
| `/institutions/:id` | Card-grid pervasive; 6 tabs | 4-5 agent-days |
| `/categories/:id` | Skewed institutional ranking (data bug) | 4-5 agent-days |
| `/administrations` | 7 chart components, 2 redundant heatmaps | 2-3 agent-days |
| **Total** | | **12-16 agent-days** |

The 4-7-day fix window the user has set is **not enough to fully close
all four gaps.** Triage recommendation (not a redesign — a sequencing):

1. **Day 1.** Fix `/categories/:id` skew (data bug + label, 0.5 day).
   Cut `/administrations` to ≤5 plates by deleting redundant heatmaps
   (1 day). Day-1 deliverable: two surfaces no longer actively
   misinforming.
2. **Day 2-4.** Rework `/institutions/:id` — replace the 6-tab Card
   grid with a 3-chapter scroll (Overview / Vendors / Risk), each
   chapter ≤2 plates. The header is already gold-standard; this is
   below-the-fold work.
3. **Day 5-7.** Rework `/vendors/:id` to collapse Evidence + Activity +
   Network into a single scroll mirroring RedThread's chapter rhythm,
   but at dossier (vs. investigation) register. VendorHero stays.

`/categories/:id` full rework (its missing editorial spine) is the only
piece that will not fit in 7 days. Triage it to v1.1.

---

## 9. Non-goals for this document

- No proposed redesigns. Only the bar and the gap.
- No Pudding.cool references.
- No new primitive proposals — every primitive cited above already
  exists in the codebase.
- No screenshots or images.
- No commit-message templates or PR plans.

---

*RUBLI v1.0 quality bar — calibrated 2026-05-07 against Atlas / Executive /
AriaQueue / RedThread, with FT Visual Vocabulary, Reuters Graphics, ICIJ
Pandora Papers, NYT Upshot, OCCRP as the external reference register.*
