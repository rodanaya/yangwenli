# RUBLI Visual Storytelling Swipe File
*Compiled May 2026 — from FT, Pudding, Sigma Awards 2024, IIB, Bloomberg, Reuters, ICIJ*

---

## THE CORE LAWS (John Burn-Murdoch / FT)

1. **Minimize distraction, maximize contrast.** One highlighted series in strong color. Everything else in zinc-500 or dimmer. If every line is a different color, nothing stands out.
2. **Direct labels, never legends.** Move legend text directly onto the data. Legends force eye travel; labels force comprehension.
3. **Titles carry the story.** Strong narrative title > descriptive label. "Mexico's procurement health has barely improved in 20 years" beats "Risk Score by Year".
4. **Annotations outperform minimalism.** Contrary to modernist dogma: charts with multiple well-placed annotations, arrows, and callout numbers score higher on recall than clean designs. Add text.
5. **Sequential reveal over simultaneous display.** Show one year / one sector / one fact at a time. Build expectation, then shatter it. "Repetition creates expectation; contrast creates impact."
6. **Z-pattern attention.** Title → Axes → Data. Put the most important annotation at the first place eyes land (top-left or near the highest/lowest point).
7. **Never use rainbow.** Group data by meaning with color families. Use one strong accent. Gray for context.

---

## SECTION 1: SCROLLYTELLING PATTERNS

### Pattern S1 — Sequential Line Reveal (JBM / FT)
**Source:** John Burn-Murdoch, FT COVID charts, Flourish Masters series
**Structure:** One line added per scroll step. Earlier lines in #3f3f46 (zinc-700). New line in crimson. Dynamic header updates to match current year/category. Y-axis auto-ranges per frame.
**Typography:** Mono eyebrow "YEAR 2023 →" color-synced to current line. Playfair headline updates dynamically.
**RUBLI application:** Report Card trend section — reveal each administration's score one by one. Atlas story chapters — reveal one risk cluster per scroll step. Stories `<StoryTemporalRiskChart>` — add per-year reveal instead of dumping all 25 years at once.

### Pattern S2 — Sledgehammer Opening Stat (Pudding)
**Source:** pudding.cool process guide
**Structure:** First frame is ONE giant number (the most shocking finding). Then context expands. "In 2024, 1 in 9 federal contracts showed corruption risk patterns." Full stop. Then the chart appears.
**Typography:** Playfair Italic 800, 5–8rem, accent color. Subtitle 16px/28 mono. Nothing else on screen.
**RUBLI application:** Every story chapter opener. Current DataPullquote already does this but inconsistently. Audit all 18 stories and add a true sledgehammer stat to chapter 1 of each.

### Pattern S3 — Archetype + System (Sigma 2024: Inside the Suspicion Machine)
**Source:** Lighthouse Reports / WIRED investigation of Rotterdam welfare algorithm
**Structure:** Follow ONE individual's data through the system. Show what the algorithm sees. Then zoom out to show systemic pattern. Individual → systemic.
**RUBLI application:** Red Thread narrative (`/thread/:vendorId`) — open with ONE contract (the most anomalous one), show its features through the waterfall model, then reveal the full vendor pattern. Currently skips straight to aggregate.

---

## SECTION 2: RANKING & LEADERBOARD PATTERNS

### Pattern R1 — Lollipop Chart for Rankings (FT Visual Vocabulary)
**Source:** FT Visual Vocabulary "Ranking" section; UNHCR dataviz platform
**Structure:** Horizontal lollipop: dot at the end, thin line extending left to a baseline. Dot colored by risk tier. Label right of dot. Baseline at sector average (not zero). Sorted by score descending.
**Color:** Critical = #c41e3a, High = #ea580c, Medium = #f59e0b, Low = zinc-500.
**Why better than bars:** Draws eye to the VALUE (dot) not the empty space. Feels editorial, not dashboard. Baseline at average makes deviation obvious.
**RUBLI application:** ARIA Queue T1 list (314 vendors). Currently plain table rows. Replace with lollipop rows — dot = IPS score, line = distance from sector average, label = vendor name. Also: Institution League ranking.

### Pattern R2 — Slope Chart for Change Over Time (FT)
**Source:** FT Visual Vocabulary "Ranking" section; extensively used by Economist
**Structure:** Two columns (e.g., "AMLO 2018" vs "Sheinbaum 2024"). Each sector = one sloping line. Lines that go UP in risk = red. Lines that go DOWN = zinc. Slope steepness shows magnitude.
**Typography:** Left label = sector name, right label = current value. No axis gridlines needed.
**RUBLI application:** Administrations page comparison between any two sexenios. Currently uses parallel radar charts which hide the slope/direction. Slope chart makes "salud got worse, tecnología got better" immediately readable.

### Pattern R3 — Dot Strip Ranked Matrix (already RUBLI native but underused)
**Source:** Existing RUBLI `DotStrip` primitive
**Enhancement:** Add a "sector average" ghost strip behind each vendor's dot strip for immediate comparison. The gap between vendor dots and ghost dots IS the risk story.
**RUBLI application:** Vendor dossier risk waterfall — show vendor dot strip vs. sector average ghost strip side by side.

---

## SECTION 3: RISK & SCORE VISUALIZATION PATTERNS

### Pattern RS1 — Diverging Bar from Baseline (FT: Deviation category)
**Source:** FT Visual Vocabulary "Deviation" section
**Structure:** Baseline = sector average (or OECD benchmark). Bars extend RIGHT for above-average risk, LEFT for below-average. Fill color: right bars = crimson gradient, left bars = zinc-400.
**Why powerful:** Immediately shows relative risk, not absolute. Answers "compared to what?" which raw scores never do.
**RUBLI application:** Vendor dossier flags section. Currently shows absolute percentages. Replace with diverging bars from sector average. "This vendor is +34% above sector average for direct awards" becomes a bar extending right.

### Pattern RS2 — Fan Chart / Uncertainty Cone (FT)
**Source:** FT Visual Vocabulary "Change Over Time" section
**Structure:** Historical solid line, then uncertainty band widens into future projections. Band = confidence interval.
**RUBLI application:** Report Card trend projection — show PHI score trajectory with a forward uncertainty band based on current trajectory. Adds analytical credibility.

### Pattern RS3 — Score Decomposition Waterfall (Already in RUBLI — enhance)
**Source:** Current `VendorWaterfallContribution` component
**Enhancement needed:** Add benchmark annotation line. Currently just shows raw contributions. Add a faint horizontal line at "sector typical" for each factor. The bar extending past that line = anomaly.
**RUBLI application:** Vendor dossier risk tab — make the waterfall say "this factor is 3x the sector norm" not just "this factor contributes +0.23".

---

## SECTION 4: NETWORK & RELATIONSHIP PATTERNS

### Pattern N1 — Flow Diagram with Topology (ICIJ Offshore Leaks)
**Source:** ICIJ network visualizations (Panama Papers, Pandora Papers)
**Structure:** Node size = contract value. Edge width = relationship strength. Color = risk tier of destination node. Left column = institutions, right column = vendors. Force-directed but with column constraints.
**Typography:** Direct labels on high-degree nodes. Small nodes get tooltip only.
**RUBLI application:** MoneySankeyChart enhancement — currently shows flows but edges are uniform width. Make edge width = MXN value, edge color = risk of receiving vendor.

### Pattern N2 — Geographic Evidence Mapping (Sigma 2024: Nigeria Graves)
**Source:** HumAngle / New Lines Magazine OSINT investigation
**Pattern:** Satellite-derived evidence combined with ground truth. Public data triangulation.
**RUBLI application:** Already conceptually similar to CENTINELA web evidence. The visual pattern: show a "evidence strength" meter per vendor combining satellite (external registries) + ground truth cases.

---

## SECTION 5: TIMELINE & TREND PATTERNS

### Pattern T1 — Administration Era Banding (Reuters / Bloomberg financial charts)
**Source:** Common in financial charts showing Fed policy cycles, election periods
**Structure:** Vertical bands behind the time series, one per administration. Band color = very subtle (5% opacity). Administration label at top of band. Scandal events = vertical tick marks with annotation.
**Enhancement:** Currently RUBLI has this in `TemporalRiskChart` but scandal markers are minimal. Beef up: callout boxes pointing to scandal spikes, with one-line label.
**RUBLI application:** All temporal charts. Make scandal annotations required, not optional.

### Pattern T2 — Calendar Heatmap with December Highlight (RUBLI native)
**Source:** GitHub contribution graph → adapted by Pudding for seasonal patterns
**Enhancement needed:** Add annotation arrows. Currently the December spike is visible but unlabeled. Add: "64% higher risk in December" callout arrow pointing at the December column. This turns a chart into a story.
**RUBLI application:** `RiskCalendarHeatmap` — add annotation layer.

### Pattern T3 — Racing Bar Chart (Pudding popularized)
**Source:** pudding.cool music/culture pieces, widely adapted
**Structure:** Horizontal bars that animate and reorder each year. Each bar = one entity (sector, vendor, institution). Bar length = metric. Color = fixed entity color (doesn't change with rank).
**RUBLI application:** Administration comparison — show 12 sectors racing by risk score from Fox → AMLO → Sheinbaum. Year scrubber already exists in Atlas. Could be adapted for a new "racing risk" view.

---

## SECTION 6: SMALL MULTIPLES & COMPARISON PATTERNS

### Pattern SM1 — 12-Panel Sector Grid (Economist / FT small multiples)
**Source:** FT Visual Vocabulary "Distribution" section; Economist graphic pages
**Structure:** 12 identical mini-charts (one per sector), same axes, same scale. This makes cross-sector comparison instant because layout position IS the comparison.
**Typography:** Sector name in mono uppercase above each mini-chart. One annotation per panel maximum.
**Why powerful:** Scales the comparison to the data, not the data to the comparison.
**RUBLI application:** Sector overview page — 12 mini-area-charts showing risk trajectory 2018→2025. Currently shows one big combined chart. Breaking into 12 panels makes salud vs energia vs educacion comparison trivial.

### Pattern SM2 — Fingerprint Comparison (RUBLI native radar — enhance)
**Source:** Existing `AdministrationFingerprints` (5 radar charts)
**Enhancement:** Add a "consensus" ghost polygon showing average of all 5 administrations. Any admin's radar that bulges outside the consensus = worse than average. Currently forces manual comparison.
**RUBLI application:** `EditorialRadarChart` — add optional `consensusData` prop.

---

## SECTION 7: TYPOGRAPHY & EDITORIAL VOICE PATTERNS

### The Eyebrow → Headline → Deck → Body stack
```
EYEBROW:    10–11px | font-mono | uppercase | tracking-[0.15em] | text-muted
            "PROCUREMENT RISK · SALUD SECTOR · 2024"

HEADLINE:   28–48px | font-serif (Playfair Display) | font-bold | leading-tight
            "Mexico's health system spends blind"

DECK:       16px | font-serif | italic | text-secondary | max-width 540px
            "Of 82,000 IMSS contracts, 79% were awarded without competition —
             the same vendors winning year after year."

PULL STAT:  72–120px | Playfair Display Italic 800 | tabular-nums | accent color
            "79%"

ANNOTATION: 11–12px | font-mono | non-italic | text-muted
            "→ 3.2× the OECD recommended maximum"
```

### Rules from research:
- **Story titles must answer a question.** "Mexico's Pharmaceutical Cartel" (good) vs "Pharmaceutical Procurement Analysis" (bad).
- **First sentence of body = the sledgehammer finding.** Never waste it on context.
- **Labels directly on chart lines** — never separate legend.
- **Pull stats need unit and comparator.** "79%" alone means nothing. "79% — OECD recommends ≤25%" is a story.

---

## SECTION 8: COLOR STRATEGY PATTERNS

### RUBLI Color Rules (from research + existing system)
```
BACKGROUND:     #1a1714 (warm dark — not pure black, avoids lab-cold feel)
SURFACE:        #201d1a / #2a2521 (slightly lighter for cards)
BORDER:         rgba(255,255,255,0.08) (barely visible separation)

ACCENT/FOCUS:   #c41e3a (crimson — the ONE strong color for key findings)
RISK CRITICAL:  #c41e3a
RISK HIGH:      #ea580c (amber-orange — distinct from crimson)
RISK MEDIUM:    #f59e0b (amber-yellow)
RISK LOW:       #71717a (zinc-500 — neutral, NO GREEN)

CONTEXT/MUTED:  #52525b (zinc-600 — all secondary data goes here)
HIGHLIGHT TEXT: #e4e4e7 (zinc-200 — headlines)
BODY TEXT:      #a1a1aa (zinc-400 — body copy)
MUTED TEXT:     #71717a (zinc-500 — labels, captions)

SECTOR COLORS:  Fixed 12-color palette (existing) — use as identity, not emphasis
```

### Anti-patterns (never):
- Green for "safe" or "low risk" — implies confidence we cannot claim
- Rainbow: if every series is a different color, nothing stands out
- Accent on everything — crimson only on THE finding
- Pure #000000 or #ffffff backgrounds — feels harsh; use warm zinc tones

---

## SECTION 9: TOP 10 STEAL-THIS-NOW IMPLEMENTATIONS

Priority-ordered by impact × implementation effort:

### 🔴 #1 — Lollipop Rows in ARIA Queue
**Steal from:** FT Visual Vocabulary ranking patterns + UNHCR lollipop examples
**Current state:** Plain table rows with risk badge pill
**New pattern:** Each row = horizontal lollipop. Dot = IPS score (colored by tier). Line extends left to sector baseline. End = vendor name label. Instantly shows magnitude AND deviation.
**Files:** `frontend/src/pages/AriaQueue.tsx` (vendor row component)
**Effort:** Medium (2–3 hours)

### 🔴 #2 — Annotation-Rich TemporalRiskChart
**Steal from:** JBM annotation practice; Reuters admin-era banding
**Current state:** Line chart with minimal scandal tick marks
**New pattern:** Add callout boxes at each scandal spike ("ESTAFA MAESTRA 2015–2017: risk peaked at 68%"). Admin era bands wider and labeled. One annotation per major inflection point.
**Files:** `frontend/src/components/charts/TemporalRiskChart.tsx`
**Effort:** Medium (3 hours)

### 🔴 #3 — Sector Small Multiples Grid
**Steal from:** FT/Economist small multiples grid
**Current state:** Single combined chart on Sectors page
**New pattern:** 12 identical mini-area-charts (sector risk trajectory 2018→2025) in a 4×3 grid. Same scale, same axis. Sector name above each.
**Files:** `frontend/src/pages/Sectors.tsx` — new `SectorMiniGrid` component
**Effort:** Medium-High (4 hours)

### 🟠 #4 — Slope Chart on Administrations Page
**Steal from:** FT slope chart pattern
**Current state:** Parallel radar charts (5 panels)
**New pattern:** Slope chart — two selectable columns (any two sexenios). 12 lines (sectors). Red lines = got worse. Zinc lines = improved. Slope steepness = magnitude.
**Files:** `frontend/src/pages/Administrations.tsx` — new `SexenioSlopeChart` component
**Effort:** High (5 hours)

### 🟠 #5 — Story Chapter Sequential Reveal
**Steal from:** JBM sequential line reveal technique
**Current state:** All chapter charts load fully rendered
**New pattern:** Each chart chapter reveals data in steps (one year, one sector, one vendor at a time) as user scrolls. Earlier data dims to zinc. Focus data in crimson. Header updates dynamically.
**Files:** `frontend/src/pages/StoryNarrative.tsx` + `DataPullquote` + editorial charts
**Effort:** High (6 hours)

### 🟡 #6 — Diverging Bars on Vendor Flags
**Steal from:** FT Deviation diverging bar pattern
**Current state:** Absolute percentage pills ("79% direct awards")
**New pattern:** Diverging bar from sector average. Bars right of center = above average. Bars left = below average. Label shows delta ("↑ 34pp above sector").
**Files:** `frontend/src/components/vendor/buildFlags.ts` + VendorProfile flags section
**Effort:** Medium (3 hours)

### 🟡 #7 — Calendar Heatmap Annotation
**Steal from:** Pudding annotation practice; JBM annotations beat minimalism
**Current state:** Calendar heatmap with no annotations
**New pattern:** Arrow callout "↑ 64% higher risk in December" pointing at December column. Second callout "Presupuesto must be spent by Dec 31" explaining WHY.
**Files:** `frontend/src/components/charts/RiskCalendarHeatmap.tsx`
**Effort:** Low (1–2 hours)

### 🟡 #8 — Direct Labels on All Line Charts
**Steal from:** JBM "direct label not legend" rule
**Current state:** Recharts legend below/aside charts
**New pattern:** Remove all recharts `<Legend>` elements. Add inline labels at the END of each line (last data point). Label color matches line color.
**Files:** `frontend/src/components/charts/editorial/EditorialLineChart.tsx` (cascades everywhere)
**Effort:** Medium (3 hours)

### 🟢 #9 — Radar with Consensus Ghost
**Steal from:** FT small multiples consensus polygon concept
**Current state:** 5 standalone radar charts for administrations
**New pattern:** Add semi-transparent zinc polygon showing average of all 5 administrations. Any bulge outside consensus = visually obvious without needing to compare panels.
**Files:** `frontend/src/components/charts/editorial/EditorialRadarChart.tsx`
**Effort:** Low (2 hours)

### 🟢 #10 — Sledgehammer Stat Enhancement in Story Heroes
**Steal from:** Pudding sledgehammer opening stat pattern
**Current state:** DataPullquote shows stat with label
**New pattern:** Story chapter 1 of each narrative: full-bleed dark panel with ONE number filling 40%+ of viewport height. Thin mono eyebrow above, 2-line context below. Nothing else.
**Files:** `frontend/src/components/stories/DataPullquote.tsx` — hero variant
**Effort:** Low (2 hours)

---

## IMPLEMENTATION PRIORITY MATRIX

| # | Pattern | Impact | Effort | Priority |
|---|---------|--------|--------|----------|
| 1 | Lollipop ARIA rows | 🔴 High | Medium | **DO FIRST** |
| 2 | Annotated temporal chart | 🔴 High | Medium | **DO FIRST** |
| 7 | Calendar annotation | 🟡 Med | Low | **DO FIRST** |
| 8 | Direct labels on lines | 🟡 Med | Medium | Sprint 1 |
| 9 | Radar consensus ghost | 🟢 Med | Low | Sprint 1 |
| 10 | Sledgehammer hero | 🟢 Med | Low | Sprint 1 |
| 3 | Small multiples grid | 🔴 High | Med-High | Sprint 2 |
| 6 | Diverging vendor bars | 🟡 Med | Medium | Sprint 2 |
| 4 | Slope chart admins | 🟠 High | High | Sprint 3 |
| 5 | Sequential reveal stories | 🔴 High | High | Sprint 3 |

---

*Sources: FT Visual Vocabulary (github.com/Financial-Times/chart-doctor), John Burn-Murdoch / GIJN, Sigma Awards 2024 (sigmaawards.org), The Pudding process guides, ICIJ data visualization tags, Bloomberg Graphics team methodology*
