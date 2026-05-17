---
name: mcloud
description: |
  Design-invention phase for Lylat redesign missions. DESIGNUS (Opus+ultrathink)
  reads the Lylat brief + live screenshots → sequential thinking → design spec →
  user approves inline → hands off to /starfox for implementation.

  Use for: M3, M4, M5, M6, M7 (full redesigns requiring design invention)
  Skip for: L0, M1, M1b, M2 (quick wins — invoke /starfox directly)

  Trigger phrases: "/mcloud", "run mcloud", "/mcloud M7", "design phase",
  "designus", "start lylat", "next mission", "execute mission"

  What /mcloud does NOT do: implement code, run gates, QA, deploy.
  Those belong to /starfox and /paw-patrol.
---

# MCLOUD — DESIGNUS Design Phase

DESIGNUS invents. /starfox implements. State lives in lylat.md and ACTIVE_WORK.md.

One pipeline per mission:
**DESIGNUS → user approval → /starfox (FOX + FALCO + PEPPY + SLIPPY) → verify + commit**

---

## WHEN TO USE / MISSION ROUTING

If no mission ID is given, read `D:\Python\yangwenli\.claude\lylat.md` and find
the first pending mission in EXECUTION ORDER (the table at the bottom of lylat.md).
Report: current status, which mission is next, why.

| Mission | DESIGNUS needed | Model |
|---------|----------------|-------|
| L0 infrastructure | No — invoke /starfox directly | sonnet |
| M1 Risk Queue | No — invoke /starfox directly | sonnet |
| M1b Red Thread | No — invoke /starfox directly | sonnet |
| M2 Cases | No — invoke /starfox directly | sonnet |
| M3 Sectors | **Yes — full redesign** | opus + ultrathink |
| M4 Spending Categories | **Yes — cartography concept required** | opus + ultrathink |
| M5 Institutions | **Yes — architecture unification** | opus |
| M6 Networks | **Yes — merge-or-drop decision** | opus |
| M7 Administrations | **Yes — PIVOTAL** | opus + ultrathink |

---

## PATHS

```
Lylat missions:      D:\Python\yangwenli\.claude\lylat.md
Design specs:        D:\Python\yangwenli\.claude\designs\{mission-id}-spec.md
Before screenshots:  D:\Python\yangwenli\.claude\designs\{mission-id}-before\{n}.png
Screenshots source:  C:\Users\ranay\Pictures\Screenshots\
Frontend:            D:\Python\yangwenli\frontend\
Dev server:          http://localhost:3009
Dashboard (ref):     D:\Python\yangwenli\frontend\src\pages\Dashboard.tsx
```

---

## DESIGNUS PROTOCOL

DESIGNUS reads, thinks, and proposes. DESIGNUS does NOT write TSX code.

### Step D1 — Read the Lylat brief

Open `lylat.md`. Locate the mission section. Extract and record:
- **Verbatim user quotes** — these are non-negotiable design requirements
- **Screenshot filepaths** — you will read every one in D2
- **"What's wrong" analysis** — your sequential thinking input
- **Action items** — the implementation checklist your spec must address

Do not proceed until you have read the full mission section of lylat.md.

### Step D2 — Read all mission screenshots

Use `Read` tool on every screenshot filepath from D1. Do not skip any.

For each screenshot, record:
- Which section/component is visible
- The specific visual failure occurring
- Which user quote corresponds to it

This creates a structured failure map. Your spec will address each item in this map.

### Step D3 — Live Playwright audit

Navigate to `http://localhost:3009/{page}`.
Apply animation-freeze protocol (Rules 2–3 in PLAYWRIGHT section below).
Take before-screenshots: `designs/{mission-id}-before/{n}.png`

Compare live state to user screenshots. If something has been fixed since the
screenshots were taken, note it and reduce scope. The LIVE state is what gets redesigned.

### Step D4 — Sequential thinking (mcp__sequential-thinking)

Use `sequentialthinking` with these exact steps. Each step must PRODUCE an output
that feeds the next step. Do not label free-form brainstorming as sequential thinking.

**Step 1 — Inventory**: List every visible section/component on the page.
  → Produces: a bulleted section list

**Step 2 — Verdict table**: For each section: keep as-is / fix / replace / delete.
  → Produces: a table with three columns: Section | Verdict | One-line reason

**Step 3 — Root cause analysis**: For every non-keep verdict: WHY does it fail?
  Specific failure, not "it looks bad." Examples:
  - Wrong: "The chart is ugly."
  - Right: "The 12-sector OECD line chart fails because it overlays 12 colored lines
    with no annotation — the eye cannot track individual sectors, so the chart encodes
    nothing actionable. It should either be small multiples or a ranked comparison bar."
  → Produces: one root cause paragraph per failed element

**Step 4 — Design options**: For each failed element, generate 2–3 concrete alternatives.
  For each option, state: component type, layout, data shown, visual treatment, trade-off.
  → Produces: option set per element

**Step 5 — Evaluate against constraints**: Pick the best option per element.
  Cite: CLAUDE.md rule, available API data, existing canonical components,
  or user verbatim quote. Do not pick "the most creative" — pick the one that
  serves the user's question best.
  → Produces: one selected option per element with justification

**Step 6 — Compose**: Assemble selected options into a coherent page redesign.
  What is the new section order? What goes above the fold? What's in tabs vs. inline?
  → Produces: proposed page structure

**Step 7 — Sanity check against Dashboard.tsx**: Open `Dashboard.tsx`. Compare its
  information density to your proposed design. Is your design as dense? If not, why not?
  Can you compress any element to match Dashboard's stat-row density?
  → Produces: density assessment and any adjustments

### Step D5 — WebSearch (required for novel visual challenges)

For chart types being introduced or redesigned, search BEFORE inventing:

| Problem | Search query |
|---------|-------------|
| Risk Matrix redesign | `"heatmap" risk matrix editorial data journalism NYT design` |
| Spending cartography hero | `government spending treemap bubble visualization FT Economist` |
| Political cycle chart | `presidential term budget cycle visualization small multiples` |
| Spaghetti chart fix | `multiple time series editorial small multiples Economist NYT` |
| Administration comparison | `cross-administration comparison data journalism NYT` |

Use results as evidence of what works. Do NOT copy. Use to validate or reject your options from D4.

### Step D6 — Write design spec

Save to `D:\Python\yangwenli\.claude\designs\{mission-id}-spec.md`

**Spec format:**
```markdown
# {Mission} Design Spec
**DESIGNUS session:** {timestamp}
**Status:** DRAFT — awaiting approval

## What stays (keep unchanged)
- {component at file:line}: {reason it works — cite screenshot or user quote}

## What gets replaced
### {Component name}
**Problem:** {specific failure from D3 root cause — cite screenshot filename}
**Replacement:** {exact description — component type, data fields, visual treatment}
**Layout:** {flex/grid spec, dimensions, responsive behavior at 1280/768/375}
**Data shown:** {exact field names — verify these exist in the API before writing}
**Visual treatment:** {Tailwind classes, color tokens from CLAUDE.md, animation if any}
**Pilot:** {FALCO | PEPPY | SLIPPY — who owns this change}

## What gets deleted
- {component}: {reason — null finding / redundant / no editorial value}

## What gets added
### {New section name}
{Full spec in same format as "What gets replaced"}

## Information architecture changes
{Before: current tab/section structure}
{After: proposed tab/section structure}
{Reason for each change}

## For FOX — file callouts
{file path + approximate line range for each element to touch}
{verified via Grep — do NOT guess file paths}

## Data dependency flags
⚠️ {field name} — verify `/api/v1/{endpoint}` returns this before implementing
```

**Pre-spec checklist — DESIGNUS runs this before saving:**
- [ ] Every replaced/added component has: type, dimensions, data fields, visual treatment, responsive behavior
- [ ] Every color references a token from CLAUDE.md (no hex in className, no `text-red-400`, no `bg-emerald-*`)
- [ ] Every vendor/institution name goes through `formatVendorName()` or `formatEntityName()`
- [ ] Every contract name display references `shortenContractName()` — and L0 is verified done
- [ ] Every pilot domain is identified (FALCO / PEPPY / SLIPPY) per change
- [ ] Density check: is this as dense as `Dashboard.tsx`? If not, compress.

### Step D7 — Present inline for approval

```
━━━ DESIGNUS: {Mission} ━━━

**What's changing**
• {5–10 bullet summary — what dies, what lives, what's new}

**Key design decision: {biggest single choice}**
[ASCII mockup of the novel element if helpful]

**Full spec**
[spec content inline]

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Approve? → yes / change [what] / reject
```

Wait for user response. Do NOT invoke /starfox until approved.
On approval: update `ACTIVE_WORK.md` with mission ID and spec path.
On revision: incorporate changes, re-present. Note what changed.

### Step D8 — Hand off to /starfox

After approval:
```
Spec approved. Invoking /starfox.
Approved spec: D:\Python\yangwenli\.claude\designs\{mission-id}-spec.md
Lylat brief: D:\Python\yangwenli\.claude\lylat.md (section: {mission ID})

FOX instructions:
  - The approved spec is primary source of truth for target state
  - Read spec + Lylat brief together
  - Do NOT reinvent or override spec decisions
  - FOX's job: translate spec → pilot briefs with exact file:line references
  - Grep every file path before writing a brief (FM-2)
  - Screenshot analysis phase (F1-F3) is already done by DESIGNUS — skip to F4
```

Then invoke /starfox.

---

## MISSION CONTEXT

Distilled from the 2-hour user audit in lylat.md. DESIGNUS reads this section
for the active mission before beginning D4. This is pre-reasoned context — use it.

---

### M3 · Sectors
**Page purpose:** "Which sectors of the Mexican economy were most exposed to
procurement corruption, and how does that vary by administration and institution?"

**What works — keep:**
- 12-sector card grid (concept right, fix density — target: Dashboard row height)
- "Where risk becomes expensive" scatter concept (MXN vs risk score is the right question — fix execution: too small, no annotations, no administration filter)
- By Administration tab concept (valuable comparison — fix: color-code by administration, add interaction)
- Top Risk Factors list (data is good — add editorial weight: size factors by importance)

**What fails — root causes:**
- **OECD multi-line chart** (165319.png): 12 overlaid sector lines in different colors = unreadable. Root cause: wrong chart type for N-line comparison. Replace with small multiples (one 120×60px panel per sector, single line vs national average) or ranked bar comparing each sector vs OECD ceiling.
- **78.3% standalone block** (165556.png): one stat eating the entire above-fold viewport. Root cause: emphasis without proportion. Demote to compact inline stat in page header. The number is powerful; it doesn't need a room to itself.
- **Institution/case section margins** (165826.png): "like a warehouse with a chair." Root cause: excessive padding, single item per visual row. Fix: cut all margins by 60%, use Dashboard-density rows.
- **Risk distribution scatter** (170620.png): empty center, sparse data. Root cause: scatter is wrong chart type for ranked comparison. Replace with scoreboard/ranking layout: Institution Name · MXN · risk badge · year range.
- **SpatialMap Z1 duplicated panel** (173444.png): exact same component as Atlas sector panel. Root cause: component was reused instead of designed for context. Delete it — users already see it in Atlas.
- **Static relationship network**: no interaction, no data depth. Either make interactive (D3 force graph wired to real data) or move to Networks and delete from Sectors.

**Design questions Opus must answer:**
1. What is the new hero? Options: (a) editorial stat header + interactive scatter, (b) ranked sector cards with sparklines, (c) animated sector comparison on load. Pick one and spec it.
2. What replaces the OECD multi-line chart? Evaluate small multiples vs ranked bar — which conveys the sector-vs-OECD gap more clearly?
3. What is the new section order? The most impactful data (direct award rate, risk exposure by MXN) must be above the fold. Methodology-flavored charts go at the bottom.
4. Top Institutions: what columns for the scoreboard? Likely: Institution Name · Total MXN · # Contracts · Risk Grade · Year Range. Confirm data fields exist in API.

**Constraints:**
- Sector colors: `SECTOR_COLORS` from `@/lib/constants` — do not invent new colors
- Administration colors: must match what `Administrations.tsx` uses
- Do not duplicate any SpatialMap component

**Reference pattern:** AMLO dossier in `184325.png` for density. Administration comparison table in `184919.png` for cross-sector table format.

---

### M4 · Spending Categories
**Page purpose:** "What categories of goods and services did the federal government buy,
at what scale, and where is risk concentrated?"

**What works — keep:**
- Top federal institutions table (`173848.png`): dense rows, risk badges, MXN right-aligned. THIS IS THE GOOD PATTERN. Keep the format.
- Annual spending + risk trend two-line chart (concept right, needs EditorialChartFrame wrap)
- Category card structure (keep concept, fix empty space: compress padding by 60%)

**What fails — root causes:**
- **Hero is a list of cards** (171132.png): no visual impact evoking the scale of 9.97T MXN across 72 categories. Root cause: no visual encoding of relative magnitude. The hero should make you feel the scale before you read a number.
- **Secondary chart wrong proportions** (171401.png): evolution-by-administration chart with sparse data points and too much whitespace. Root cause: chart rendered at full width but contains only 5 data points. Either compress width or replace with a table.
- **Contract names truncated mid-word** (173930.png): Root cause: `shortenContractName()` does not exist yet (L0 task). DESIGNUS spec must reference L0 utility and note it must be built first.

**Design questions Opus must answer — 3 CARTOGRAPHY CONCEPTS REQUIRED:**
Present all three with ASCII mockups before writing full spec. User picks one.

Concept A — **Treemap**: Each category = a tile, size proportional to total MXN spend, color = risk concentration (from `text-text-muted` low to `RISK_COLORS.critical` high). Interactive: click to zoom into subcategory tiles. Subcategory tiles show top vendor chip on hover.
- Trade-off: standard and legible; loses temporal dimension; treemap nesting can be confusing.

Concept B — **Bubble timeline**: Categories as sized bubbles on a scatter (x = year-of-peak-spend, y = risk concentration, size = total MXN, color = sector). Hover = category detail. Administration spans marked as background bands.
- Trade-off: shows temporal + risk together; harder to read exact values; bubble occlusion.

Concept C — **Ranked territory map**: A custom horizontal bar "landscape" where each category is a horizontal territory. Width = MXN spend. Height = risk concentration (making high-risk categories literally taller). Sorted by MXN. Click to expand category detail inline below.
- Trade-off: novel, directionally legible, no standard component exists; must build from scratch.

Each concept description in the spec should be specific enough that a pilot could build it.
The user picks ONE. Then write the full spec for that concept only.

**Constraints:**
- Old orb/bubble chart was removed because orbs went outside margins — do NOT restore
- `shortenContractName()` (L0 utility) must exist before pilots implement any contract name display. Verify L0 done, or flag as prerequisite.
- USD equivalent column: verify `/api/v1/categories/:id` returns a USD field before speccing it. If not present, do not spec it.

**Reference pattern:** Stories charts in `frontend/src/components/stories/charts/` for EditorialChartFrame usage. Top vendors list in `190824.png` for dense list treatment.

---

### M5 · Institutions
**Page purpose:** "Which federal institutions have the highest procurement risk exposure,
and what is the full risk + vendor + historical profile of a specific institution?"

**What works — keep:**
- Institution ranking editorial header ("Five agencies account for 1.25T pesos in high-risk awards") — strong editorial framing
- Institution risk grade badge concept
- Filter tabs from SpatialMap Z2 (UNAM panel in `181832.png`) — valuable pattern; build institution-native equivalent, do NOT copy the SpatialMap component

**What fails — root causes:**
- **3 redundant profile surfaces**: ARIA profile, general institutional profile, ranking profile. Root cause: features were added incrementally without IA review. Result: users don't know which page has the information they want.
- **Empty landing section on detail pages**: Root cause: detail page renders a skeleton while loading, but the above-fold section shows nothing useful even before loading completes. Fix: first visible content = institution name + risk grade + 3 key stats, visible immediately.

**Architecture options Opus must evaluate:**
A. **Single unified page**: Overview (risk grade + stats) → Vendor Network → Historical Spend → Cases. No tabs.
   Pros: everything in one scroll. Cons: may be too long.
B. **Tabbed**: Overview | Risk Analysis | Vendor Network | History.
   Pros: organized. Cons: users miss content hidden in tabs.
C. **Progressive disclosure**: dense above-fold summary, expandable sections below.
   Pros: fast to scan, deep on demand. Cons: interaction complexity.

Opus evaluates against the `184325.png` AMLO dossier density as the target. Which architecture best matches that density while adding institution-specific data?

**Design questions Opus must answer:**
1. Which architecture (A/B/C)? Justify with reference to `184325.png`.
2. What are the above-fold stats on an institution detail page? Likely: risk grade badge, total MXN, high-risk contract count, top risk factor, active vendor count. Confirm each field exists in the institution API endpoint.
3. What does the vendor network section show? (The Z2 panel shows SPEND/RISK/ALL/MED+/HIGH+/CRIT filter tabs + vendor list — replicate this pattern.)

**Constraints:**
- Do NOT copy the SpatialMap Z2 institution component — build institution-native equivalent
- Institution names: `formatEntityName(type, name, size)` — never raw

---

### M6 · Networks — Decision First, Design Second
**Page purpose:** Unclear — that is the problem DESIGNUS must resolve.

**Opus must produce a comparison audit, not a design spec:**

1. Navigate live to `/networks`. Catalog every element with its data source.
2. Navigate to `/atlas`. Catalog every element.
3. Build this comparison table:
   ```
   Element | Present in Networks | Present in Atlas | Unique to Networks
   ```
4. Answer: Is what's "Unique to Networks" substantial enough to justify the page?
5. Verdict: **Merge** or **Drop** — with evidence from the comparison table.

**Context for the audit:**
- Atlas (El Observatorio) is a sophisticated spatial + cluster map of vendor networks with lens modes (Risk/Patterns/Sectors/Categories)
- `/intersection` (adjacent) shows the regulatory gap: 1,808 RUBLI-flagged vendors not on any official watchlist — the most impactful number on the platform
- `/patterns` shows P1–P7 corruption pattern categories
- The question: does `/networks` add anything not already in Atlas + Intersection + Patterns?

**If merge decision:** Where specifically in Atlas does the Networks content live? Propose as a new lens mode or new panel.

**If drop decision:** Redirect target (likely `/atlas`). List all nav links to `/networks` that need updating. Verify no dead links via grep.

After user approves the merge-or-drop decision, THEN write a spec for the implementation.

---

### M7 · Administrations — PIVOTAL
**Page purpose:** "How did procurement behavior, risk concentration, and corruption
patterns differ across Mexico's five administrations, and what are the systemic patterns
that transcend any single administration?"

**User's instruction:** "In this particular last mission we have to be very thorough
and use opus ultrathink to assess the situation of what we can do with administrations.
It is pivotal that we do."

**What's genuinely good — keep and build on:**
- **Dense dossier layout** (`184325.png`): political context + radar chart + documented cases + top vendors. THIS IS THE TEMPLATE FOR M7. Replicate its density in every tab.
- **Top Vendors dot-bar rows** (`190824.png`): the best component on the entire page. Full vendor names (no truncation), MXN right-aligned, contract count + avg risk below name, dot-bar risk indicator. User: "We need more of these lists within the administration profile page." Replicate to: Overview tab, individual admin profiles, any section with administration-level vendor data.
- **Administration Comparison table** (`184919.png`): all 5 admins × 7 metrics in a dense table. Keep.
- **Calderón→EPN transition annotation** in hero: good editorial call-out. Keep.
- **Three stat cards in Systemic Patterns** (65.3% / 52.0% / 18.9%): powerful data. Keep.
- **Procurement Fingerprint radar charts** (`184637.png`): good concept, weak visual execution. Keep concept, apply editorial treatment (Playfair labels, administration colors, clean grid).

**What's broken — root causes:**
- **Risk Matrix** (`185012.png`, `190645.png`): 5×12 cells with single-letter sector abbreviations. Root cause: cells identify sectors but fail to encode risk MAGNITUDE visually. A colored box that requires reading the tooltip to understand the value is not a visualization — it's a lookup table pretending to be one. Fix: encode magnitude within each cell.
- **Systemic Patterns 25-Year Timeline** (`190941.png`): flat multi-line chart, no annotations, no editorial treatment. Root cause: rendered with default recharts styling, not wrapped in `EditorialChartFrame`, no Playfair headline, no named administration transition lines, no call-out annotation for the most alarming data point. Fix: full editorial treatment.
- **Political Cycle spaghetti chart** (`191000.png`): 5 administrations overlaid as lines. Root cause: wrong chart type for comparing N complete time series. Fix: small multiples (one panel per administration, consistent Y axis, same color as administration's identity color).
- **Election Year Effect null finding** (`191142.png`): 23.34% vs 23.46% — a delta of 0.12 percentage points. Root cause: section was built assuming a statistically significant effect; the data says otherwise. This is the most embarrassing element on the page — it presents meaningless numbers with the visual weight of a meaningful finding. Fix: delete entirely, OR replace with explicit editorial statement: "No election-year distortion detected in this dataset. Risk rates remain consistent across electoral cycles — a finding in itself."
- **Compare Periods looks like a settings form** (`191151.png`): Root cause: results rendered as a plain table. Fix: after user runs comparison, render results as side-by-side administration portrait cards (matching `184325.png` dossier format) — not a table.
- **4 tabs overlap in content**: Administration Overview and Pattern Composition probably overlap. Political Cycle and Systemic Patterns definitely overlap. Root cause: features added incrementally without IA review. Fix: consolidate.

**Design questions Opus must answer:**
1. **New tab structure**: what are the final 2–3 tabs? Likely: **Profile** (dossier, top vendors, key events) / **Patterns** (systemic trends + risk matrix) / **Compare** (compare periods tool + cross-admin view). Propose with justification.
2. **Risk Matrix redesign**: how to encode 5×12 risk magnitudes in small cells? Evaluate:
   - Option A: Heatmap cells — color saturation (light=low, saturated=high), miniature risk score number in center (tabular-nums, 11px)
   - Option B: Mini horizontal sparkbar per cell — 80% width, height=4px, color from RISK_COLORS
   - Option C: Circle per cell — radius proportional to risk relative to sector average (center point)
   AMLO's row call-out must be editorial: a 2px left border in `RISK_COLORS.critical` + right-margin annotation ("Highest risk rate in the modern record"), NOT a CSS focus box.
3. **Political Cycle fix**: small multiples (one panel per administration, 5 panels, consistent Y axis) vs animated transition between administrations. Which is more readable and easier to implement?
4. **Election Year Effect**: delete entirely or add null finding statement? Both are valid. Pick one and justify.
5. **What additional vendor/institution lists belong in the Administration Profile?** The user said "more of these lists." What data exists for each administration? (Possible additions: top institutions by high-risk award, top procurement categories, key risk events timeline.) Verify each field in the API before speccing.
6. **Administration colors**: verify in `Administrations.tsx` what colors are currently used for Fox / Calderón / EPN / AMLO / Sheinbaum. Your spec must use these exact colors.

**Constraints:**
- `formatVendorName()` on every vendor name — the Top Vendors list (`190824.png`) already does this and must continue to
- `EditorialChartFrame` must wrap every new or redesigned chart — it provides the Playfair kicker/headline/lede chrome
- Radar charts: keep concept, apply editorial treatment — do not delete them

---

## DESIGN CONSTANTS (embedded — do not re-read CLAUDE.md for these)

### Typography
```
Large data numbers:   font-playfair-display italic font-extrabold tabular-nums
Section kickers:      font-mono text-xs uppercase tracking-wider text-text-muted
Editorial chart wrap: EditorialChartFrame (provides kicker/headline/lede chrome)
Body text:            Inter / system-ui
```

### Color tokens (always use these — never raw hex in className)
```
Risk critical (≥0.60): RISK_COLORS.critical  from '@/lib/constants'
Risk high (≥0.40):     RISK_COLORS.high
Risk medium (≥0.25):   RISK_COLORS.medium
Risk low (<0.25):      text-text-muted — NEVER green (absolute rule — CLAUDE.md §3.10)
Sector colors:         SECTOR_COLORS         from '@/lib/constants'
Chart highlight:       HIGHLIGHT_COLOR        (sector-salud red)
Chart reference:       REFERENCE_COLOR        (sector-tecnologia purple)
Chart anchor:          ANCHOR_COLOR           (#a06820 amber — use via style={{}})
```

### Canonical components (use these — never re-implement inline)
```
EditorialChartFrame   frontend/src/components/stories/EditorialChartFrame.tsx
DotBar                frontend/src/components/shared/DotBar.tsx
DotBarRow             (ranked list rows with DotBar)
StatRow               (dense stat rows)
EntityIdentityChip    (entity links — vendor/institution/sector/case)
formatVendorName()    frontend/src/lib/utils.ts
formatEntityName()    frontend/src/lib/utils.ts
shortenContractName() frontend/src/lib/utils.ts  ← L0 must be done first
```

### Forbidden patterns (causes lint:tokens failure)
```
text-red-400   bg-emerald-*   raw #hex in className string
"probability of corruption" in any user-visible string
```

### What "good" looks like in this codebase
- **Density target**: `Dashboard.tsx` — study its stat-row height, padding, typography hierarchy
- **Best list component**: Top Vendors section in `Administrations.tsx` — dot-bar rows (`190824.png`)
- **Best dossier format**: AMLO profile section in `Administrations.tsx` (`184325.png`)
- **Best editorial charts**: `frontend/src/components/stories/charts/` — all wrapped in `EditorialChartFrame`
- **Best table format**: Administration Comparison table in `Administrations.tsx` (`184919.png`)

### What "bad" looks like — the audit language
- **"Warehouse with a chair"**: huge paddings, one item per visual row, data starts 40% down viewport. Always compress.
- **"Made with paint"**: default recharts styling, flat single color, no annotations, no Playfair headline, no editorial kicker. Always wrap in `EditorialChartFrame`.
- **Truncated names**: `...` without tooltip = SYS-1 violation. Never acceptable.
- **Repeated stats**: same number in hero AND right panel = SYS-5 violation. Say it once.
- **Spaghetti charts**: 5+ overlaid lines with no annotation. Always prefer small multiples.
- **Null findings as if findings**: equal numbers in stat cards with the visual weight of a discovery. Label null results as null, or delete them.

---

## PLAYWRIGHT PROTOCOL

**Rule 1** — Never `window.scrollTo()`. Use `browser_press_key` with `"PageDown"`, wait 600ms between presses.

**Rule 2** — Disable animations immediately after every navigation:
```javascript
() => {
  const s = document.createElement('style');
  s.id = 'sf-freeze';
  s.textContent = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `;
  document.head.appendChild(s);
  document.querySelectorAll('*').forEach(el => {
    if (parseFloat(window.getComputedStyle(el).opacity) < 0.5) {
      el.style.setProperty('opacity', '1', 'important');
    }
  });
  return 'frozen';
}
```

**Rule 3** — Pre-warm before screenshotting: press `End`, wait 800ms, press `Home`, wait 300ms. Then scroll and screenshot.

**Rule 4** — Screenshot naming: `designs/{mission-id}-before/{n}.png` (pad n to 3 digits)

**Rule 5** — Viewport screenshots only. Never `fullPage: true` — framer-motion elements render at opacity:0 for off-screen content.

**Rule 6** — Atlas prerequisite: before visiting `/atlas`, set:
```javascript
() => { localStorage.setItem('rubli_atlas_visited_v1', '1'); return 'set'; }
```
The value must be the string `'1'` — not `'true'`.

---

## FAILURE MODES

**FM-1: Vague spec (most common)**
DESIGNUS produces "redesign the chart to be more editorial" instead of a buildable spec.
Prevention: every replaced/added component must have ALL SIX: type, dimensions, data fields,
visual treatment, responsive behavior, pilot assignment. Run the pre-spec checklist (D6).
A brief without ALL SIX is incomplete. Do not save it.

**FM-2: Unverified file references**
DESIGNUS writes "FOX should edit `Administrations.tsx`" without verifying the component
name. FOX then spends 10 minutes searching.
Prevention: Grep for the component name or a visible string from the screenshot BEFORE
writing the "For FOX" callouts. Write `file:line` not just `file`.

**FM-3: Proposing non-existent components**
DESIGNUS proposes a "HeatCell component" without checking if one exists.
Prevention: before speccing any new component pattern, grep for it. If it exists (DotBar,
StatRow, EntityIdentityChip), use it. If it doesn't exist, note explicitly:
"New component required — FALCO builds this in Phase 2."

**FM-4: Speccing data fields that don't exist in the API**
DESIGNUS speccing a USD equivalent column when the API doesn't expose it.
Prevention: for any field not seen in the current page's data, verify it exists via
`curl -s http://localhost:8001/api/v1/{endpoint}` before speccing it. Flag unverified
fields as ⚠️ data dependency in the spec.

**FM-5: Blank Playwright screenshots**
Prevention: animation-freeze protocol (Rules 2+3) before EVERY screenshot. No exceptions.

**FM-6: M4 three concepts that are secretly the same**
DESIGNUS presents "treemap, bubble treemap, nested treemap" as three concepts.
Prevention: each concept must use a fundamentally different visual metaphor. If two concepts
share the same primary encoding (e.g., area = spend), they are variants, not alternatives.
Force genuine diversity: one area-encoding concept, one position-encoding concept, one
structure-encoding concept.

**FM-7: DESIGNUS writing implementation code**
DESIGNUS writes TSX instead of a spec.
Prevention: if you find yourself writing `const HeatCell = () =>`, stop. DESIGNUS writes
prose specs. The spec says "color saturation encodes risk magnitude." FALCO writes the TSX.

**FM-8: L0 not verified before speccing contract/name utilities**
DESIGNUS specs `shortenContractName()` or `<TruncatedName>` without confirming L0 is done.
Prevention: before writing any spec that references L0 utilities, grep:
`grep -r "shortenContractName" frontend/src/lib/utils.ts`
If not found: add a prerequisite block to the spec: "L0 must be complete before this spec
can be implemented. `shortenContractName()` is required at: [list every spec element that uses it]."

---

*MCLOUD v2 — design phase only — state in lylat.md and ACTIVE_WORK.md*
*Rewritten 2026-05-17 — stripped SQLite/worktrees/cron — armed with mission context*
