# Omega-C regressions — punch list (2026-05-05)

User feedback after omega-C P1+P2+P3+P4 deployed. Schedule fix for ~45 min from now.

## What broke

### 1. Duplicate giant "74%" — DUPLICATION BUG
**Symptom**: User sees a big 74% direct-award rate TWICE on the dashboard.
**Cause**: `DashboardSledgehammer` (committed earlier today in `abca0cb` / d-P2) ALREADY renders a giant 74% Playfair number at the top of the page. Then `MacroArc` (omega-C-P3, commit `d904582`) ADDS ANOTHER giant 74%. They're both "the headline number" — only one should exist.
**Fix**: Pick ONE.
- Option A: Keep DashboardSledgehammer at the top, restore MacroArc as a slim sparkline-only chart (no giant number)
- Option B: Delete DashboardSledgehammer, keep MacroArc's giant 74% layout
- **Recommendation: Option A**. The page already has its anchor (DashboardSledgehammer at ~74%); MacroArc should be a confirming time-series, not a redundant headline.

### 2. MacroArc layout "pushed away so bad"
**Symptom**: The 60/40 flex layout blows out responsive layout — chart is shoved off-screen or breaks card rhythm.
**Cause**: `flex flex-row` with a giant 200pt number forces the sparkline into a too-narrow column. Probably wraps weirdly on standard-width cards.
**Fix**: After Option A above, MacroArc becomes just a clean horizontal sparkline with annotations. No giant number competing for space.

### 3. La Lente "horrible — looked better before"
**Symptom**: Hamilton vertical ladder (5 stacked rectangles + ▼ arrows) does NOT read as well as the original concentric rings did.
**Cause**: The plan assumed "vertical narrowing process > target/scope graphic" but the rings were genuinely communicating "filter from outer to inner" — and they had visual gravity. The ladder reads as a generic spreadsheet of bars.
**Fix**: REVERT omega-C-P2 entirely. Restore the original concentric ring `LensVisualization`. The Hamilton mechanic is wrong for THIS data. Don't replace what works.

### 4. Pesos en Riesgo: "a bit better but contrasts don't go with the colors"
**Symptom**: Cleveland-pair geometry works, but the baseline ○ (hollow neutral) vs actual ● (filled pattern color) colors clash. Reading is harder, not easier.
**Cause**: Mixing neutral grey (baseline) with vivid pattern colors (actual) creates a muddy visual. Both dots should belong to the same color family.
**Fix**: Make baseline dot a faded ghost of the SAME pattern color (e.g. `pattern-color at 0.3 opacity, hollow`), and actual dot the vivid version. Or use a single neutral connector with a single bright marker at the actual position. Test both, pick whichever reads cleaner.

### 5. "Sectores y categorías is not visible anymore"
**Symptom**: The 1-line link card we added in d-P1 (linking to /sectors) is gone or hidden.
**Cause**: Unknown — probably a layout regression from one of omega-C P1/P2/P3 edits to Executive.tsx.
**Fix**: grep the page for the link card, restore it if missing. Should sit somewhere mid-page.

## Strategic question: is Pudding the right inspiration source?

User raised: "maybe the internet source I gave you is not the proper one... should we use different?"

**Honest answer**: Pudding excels at **editorial storytelling for general audiences** (music charts, cultural data, anxiety surveys). Procurement/government corruption is a different beast — the readers are journalists at MCCI, IMCO, Animal Político, and the data is about money, accountability, governance.

**Better-fit inspiration sources** to consider for next iteration:
- **Financial Times** Visual Vocabulary — bullet charts, slope charts, dumbbells, deviation bars. Built for accountability journalism.
- **Reuters Graphics** — pollution, corruption, public-sector accountability work. "Forever Pollution" methodology.
- **ProPublica** — investigative + data visualization for accountability stories. "Bailout Tracker" pattern.
- **NYT Upshot** — government data + accountability charts (federal spending treemap, "How Much Hotter Is Your Hometown")
- **OCCRP** — Organized Crime and Corruption Reporting Project; their flow diagrams for shell companies.
- **ICIJ** — Panama/Pandora Papers visualizations; institution → intermediary → vendor flow charts.
- **Sigma Awards 2024 finalists** — peer-juried best-of-data-journalism.
- **The Bureau Local / The Bureau of Investigative Journalism** — UK accountability data viz.

**The problem with Pudding for RUBLI**: Pudding's tone is whimsical / cultural / editorial. RUBLI's tone needs to be SERIOUS / PROSECUTORIAL / NEWSWORTHY. Pudding mechanics like "30 Years of American Anxieties" giant typography work for opinion essays; for $9.9T procurement they read as gimmick.

**Recommendation for the next omega cycle**: shift the inspiration vocabulary from Pudding → FT Visual Vocabulary + Reuters Graphics + ICIJ. Same "amplified geometric redesign" rule (cover-the-captions test stays), but the chart family becomes accountability-journalism, not editorial-arts.

## Scheduled remediation plan

When the wakeup fires:

1. **Read this file fully** before doing anything.
2. **Revert omega-C-P2** entirely (restore concentric rings for La Lente).
3. **Fix MacroArc duplicate-74% bug**: keep DashboardSledgehammer, restore MacroArc to slim sparkline + annotations layout (no giant number, but keep the OECD 25% line + admin bands + 4 callouts).
4. **Fix Cleveland-pair color contrast**: baseline dot becomes faded same-color, not neutral grey.
5. **Audit + restore the Sectores y categorías link card** if it disappeared.
6. **Update `memory/workflow_omega.md`** with: "Pudding is not the default inspiration source; for accountability-journalism contexts (RUBLI), prefer FT Visual Vocabulary + Reuters Graphics + ICIJ. The cover-the-captions test stays. The amplified-redesign rule stays. The Pudding-piece-by-name rule still applies but the citation library changes."
7. Plan in Opus → execute in Sonnet, per omega workflow.

This is omega-C-FIX. After it ships, re-screenshot and verify with the user before any further omega work.
