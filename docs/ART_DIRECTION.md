# RUBLI Art Direction — Visual Identity & Data Standards
*Version 1.0 | 2026-04-20 | Active Design Bible*

> This document is the canonical reference for all three remodeling agents (TIPO, GRAFIKA, ESCENA). Every design decision made during the overnight audit must be consistent with the principles defined here. When in doubt, refer back to this document.

---

## 1. Core Philosophy

RUBLI is **investigative journalism infrastructure** — not a government dashboard, not a SaaS product, not a data tool. It is a newspaper with a database engine behind it.

The visual language must communicate:
- **Authority** — This data is real. The methodology is rigorous. The findings matter.
- **Urgency** — Corruption costs lives and money. The stakes are visible in every number.
- **Legibility** — A senator, a journalist, a civil society researcher, and a data scientist must all be able to read the same page and extract what they need.
- **Honesty** — Risk scores are not verdicts. Uncertainty is shown. Methodology is transparent.

### The Art Provenance

The aesthetic draws from:
- **The Economist** — White space, authority, numbered sections, editorial restraint
- **The New York Times** — Data journalism visual language, serif headlines with precise data
- **Financial Times** — Salmon/cream ground, financial data clarity
- **Der Spiegel** — Investigative weight, hard typography
- **INEGI** — Mexican institutional context, not imported aesthetics

---

## 2. Color System (Canonical)

### Background Layers (Light-mode editorial — primary surface)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-background` | `#faf9f6` | Page ground — cream/parchment |
| `--color-background-card` | `#ffffff` | Card surfaces |
| `--color-background-elevated` | `#f3f1ec` | Slightly warm elevated sections |
| `--color-border` | `#e2ddd6` | Default borders — warm gray |
| `--color-border-hover` | `#ccc7be` | Hovered / active borders |

### Sidebar (Always dark)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-sidebar` | `#1a1714` | Sidebar background — near-black warm |
| `--color-sidebar-hover` | `#2a2420` | Hovered nav item |
| `--color-sidebar-active` | `#342e2a` | Active nav item |

### Text

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-text-primary` | `#1a1714` | — | Headlines, data values |
| `--color-text-secondary` | `#6b6560` | — | Sub-labels, descriptions |
| `--color-text-muted` | `#9c9490` | — | Captions, footnotes, placeholders |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-accent` | `#a06820` | Amber gold — primary interactive, links, highlights |
| `--color-accent-hover` | `#835616` | Hover state for amber elements |
| `--color-accent-data` | `#2563eb` | Blue — data accent (charts, links to data) |
| OECD reference lines | `#22d3ee` | Cyan — benchmark lines on charts |

### Risk Colors (v0.6.5 Model — CANONICAL)

| Level | Threshold | Hex | Notes |
|-------|-----------|-----|-------|
| Critical | ≥ 0.60 | `#ef4444` | Red — immediate investigation |
| High | ≥ 0.40 | `#f59e0b` | Amber — priority review |
| Medium | ≥ 0.25 | `#a16207` | Dark amber — watchlist |
| Low | < 0.25 | `#71717a` | Zinc — standard monitoring |

> **DO NOT** use green for "Low risk." Green implies safety on a corruption platform. Zinc/neutral communicates "not flagged" without implying innocence.

### Sector Colors (Canonical — never change)

| Sector | Hex |
|--------|-----|
| salud | `#dc2626` |
| educacion | `#3b82f6` |
| infraestructura | `#ea580c` |
| energia | `#eab308` |
| defensa | `#1e3a5f` |
| tecnologia | `#8b5cf6` |
| hacienda | `#16a34a` |
| gobernacion | `#be123c` |
| agricultura | `#22c55e` |
| ambiente | `#10b981` |
| trabajo | `#f97316` |
| otros | `#64748b` |

---

## 3. Typography System (Canonical)

### Font Stack

```css
--font-family-serif:  "Playfair Display", Georgia, serif  /* Editorial headlines */
--font-family-sans:   "Inter", system-ui, sans-serif      /* Body, UI, labels */
--font-family-mono:   "JetBrains Mono", "Fira Code", monospace  /* Data values */
```

### Usage Rules

| Context | Font | Weight | When |
|---------|------|--------|------|
| Page hero headline | Playfair Display | 700–800 | Section titles, story titles, page names |
| Editorial pull-quote | Playfair Display italic | 400i | Pull-quotes, lede text |
| Section header | Inter | 600 | Card headers, section names |
| Body text | Inter | 400 | Prose, descriptions, explanations |
| UI label | Inter | 500 | Button text, nav items, tab labels |
| Data value (big) | JetBrains Mono | 700 | Hero stats: "9.9T MXN", "13.49%" |
| Data value (table) | JetBrains Mono | 400–500 | Table cells, chart axis values |
| Caption / footnote | Inter | 400 | Source notes, methodology footnotes |

### Type Scale

```
Display: 3rem / 48px — Hero stats only (dashboard KPI, story lead stat)
H1:      2rem / 32px — Page title
H2:      1.5rem / 24px — Section header
H3:      1.25rem / 20px — Card header, subsection
Body:    1rem / 16px — Main content
Small:   0.875rem / 14px — Labels, secondary text
Tiny:    0.75rem / 12px — Captions, axis labels, footnotes
```

### Rules

1. **Max 3 type sizes** visible on any single card or section. More than 3 creates visual noise.
2. **Serif only for editorial framing** — headlines, story titles, pull-quotes. Never for data labels.
3. **Mono for all numbers** — every MXN amount, percentage, count displayed in JetBrains Mono.
4. **ALL CAPS with letter-spacing 0.08–0.12em** for section badges ("EDITORIAL SUMMARY", "RIESGO CRÍTICO", "DATOS").
5. **No bold body text** — use size hierarchy, not weight, for content structure.
6. **Line height**: 1.4 for body, 1.1–1.2 for headlines, 1.6 for prose paragraphs.

---

## 4. The Dot-Matrix Protocol (Signature Visualization)

The dot-matrix strip is RUBLI's signature data visualization. It replaces bar charts throughout the platform.

### Canonical Parameters

```typescript
const N_DOTS = 50          // dots per row (standard)
const DOT_R = 3            // dot radius in px
const DOT_GAP = 8          // center-to-center spacing (px)
const FILLED = sectorColor // filled dot color (varies by context)
const EMPTY_FILL = '#f3f1ec'   // empty dot fill — matches --color-background-elevated
const EMPTY_STROKE = '#e2ddd6' // empty dot stroke — matches --color-border
```

> **Dark context exception**: When dots appear inside a dark card (sidebar, dark modal), use `#27272a` for empty fill and `#3f3f46` for empty stroke.

### Legend Line (required)

Every dot-matrix MUST include a legend line directly below:
```
● 1 punto = MX$1,000M  (or whatever unit applies)
```
Font: JetBrains Mono 10px, color: `--color-text-muted`.

### Reference Lines (OECD / benchmarks)

Cyan vertical or horizontal hairline at the benchmark position:
```typescript
stroke="#22d3ee" strokeWidth={1} strokeDasharray="2,2"
```
Label above the line in tiny cyan mono text: "15% OCDE" or "OECD 15%".

### Animation (required)

```typescript
// Each dot
<motion.circle
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: index * 0.008, duration: 0.25 }}
/>
```

- **ALWAYS** use `animate` not `whileInView` — viewport detection fails in production
- Stagger: 0.008s per dot (50 dots = 0.4s total animation)
- No bounce/spring for dots — linear ease only

### Orientation Rules

| Data type | Orientation | Fill direction |
|-----------|-------------|----------------|
| Ranked quantities (vendor share, sector value) | Horizontal rows | Left to right |
| Time series (monthly, yearly) | Vertical columns | Bottom to top |
| Comparison (two entities side by side) | Paired horizontal rows | Left to right, different colors |

### Sizing

```
Row height: 20px (DOT_R * 2 + 14px breathing room)
Label column: 140px min-width, right-aligned
Value label (right side): 60px, JetBrains Mono, right-aligned
Container width: 100% of card
Padding: 16px top, 12px bottom, 0 left/right
```

---

## 5. Component Patterns

### Card Anatomy

```
┌─────────────────────────────────────────────┐
│ ┌─ Border: 1px --color-border              │
│ │  Padding: 20px                           │
│ │                                          │
│ │  [BADGE] ALL CAPS · 10px · mono · muted │
│ │  Headline (Playfair or Inter 600 · H3)  │
│ │  Subtitle (Inter 400 · small · muted)   │
│ │                                          │
│ │  [DATA CONTENT]                          │
│ │                                          │
│ │  Footer note (tiny · muted)             │
│ └──────────────────────────────────────────┘
└─────────────────────────────────────────────┘
Background: --color-background-card
Border-radius: 2px (editorial, not rounded SaaS)
Shadow: none by default; subtle on hover
```

### Stat Block (Hero KPI)

```
┌─────────────────────┐
│ [LABEL] · 10px mono │
│ 9.9T MXN           │ ← 3rem JetBrains Mono 700
│ ≈ US$580B r. 2024  │ ← 12px mono muted (USD secondary)
│ [Context line]     │ ← 12px Inter muted
└─────────────────────┘
```

### Risk Badge

```
[● CRÍTICO]  background: #fef2f2, text: #ef4444, border: #fca5a5
[● ALTO]     background: #fffbeb, text: #d97706, border: #fcd34d
[● MEDIO]    background: #fefce8, text: #a16207, border: #fde68a
[● BAJO]     background: #f4f4f5, text: #71717a, border: #d4d4d8
```

Border-radius: 2px. Font: Inter 500 11px. Padding: 2px 8px.

---

## 6. Layout Grid

```
Sidebar: 224px fixed (dark)
Content: flex-1 (min 768px, max ~1400px)
Page padding: 24px top, 24px right, 24px bottom, 24px left
Card gap: 16px
Section gap: 32px
```

**Responsive breakpoints:**
- < 768px: collapse sidebar to icon bar
- 768–1024px: sidebar 56px icon bar + content fills
- > 1024px: full 224px sidebar + content

---

## 7. Animation Standards

### On-mount (page load)

```typescript
// Page container fade-in
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
```

### Dot-matrix (see §4)

### Constellation / network nodes

```typescript
// Sector constellation (RiskRingField)
transition={{ type: 'spring', stiffness: 120, damping: 20, delay: index * 0.05 }}
```

### Hover interactions

```
Scale: 1.0 → 1.02 on card hover (0.15s ease)
Border: --color-border → --color-border-hover (0.15s)
Opacity: 1.0 → 0.8 on disabled state
```

### NO bounce/elastic on data elements. Spring physics only for node/constellation positioning.

---

## 8. The Three-Agent Remodeling Team

For the overnight audit (8 PM – 8 AM), three agents work in parallel then sequentially:

---

### Agent TIPO — Typography & Hierarchy Normalizer

**Mission**: Every text element on every page renders with the correct font, size, weight, and color according to §3 of this document.

**Audit checklist per page:**
- [ ] Page title uses Playfair Display 700 OR Inter 700 H1 (not both)
- [ ] All MXN/USD/percentage values use JetBrains Mono
- [ ] Section badges use ALL CAPS + tracking
- [ ] No more than 3 type sizes visible in any card
- [ ] Body text is Inter 400, not 500 or 600
- [ ] Footnotes/captions are tiny (12px) and muted color
- [ ] Line heights are consistent

**Pages to audit** (all 38 pages in `frontend/src/pages/`):
Priority order: Dashboard → VendorProfile → Landing/Intro → Journalists → AriaQueue → StoryNarrative → Sectors → InstitutionProfile → all others

**Implementation rule**: Fix in the TSX component. Do NOT add new Tailwind classes without checking the design system. Prefer CSS variables over hardcoded hex values.

---

### Agent GRAFIKA — Data Visualization Standardizer

**Mission**: Every data visualization on every page uses the dot-matrix protocol or an approved chart type. No orphaned Recharts bar charts. All charts are sized, labeled, and animated consistently.

**Approved chart types:**
1. **Dot-matrix horizontal strip** — for ranked quantities, comparisons
2. **Dot-matrix vertical columns** — for time series
3. **Recharts Area/Line** — for continuous time series (preserve these)
4. **Recharts ComposedChart** — only when combining line + area (no Bar elements)
5. **SVG constellation** — for network/relationship views (RiskRingField pattern)
6. **SVG node-edge diagram** — for vendor relationship maps (CollusionExplorer)
7. **Recharts Pie/RadialBar** — only for overall distribution (risk donut)

**Audit checklist per page:**
- [ ] No Recharts `<Bar>` or `<BarChart>` components (replace with DotStrip)
- [ ] All dot-matrix animations use `animate` not `whileInView`
- [ ] Legend line present on every dot-matrix chart
- [ ] OECD cyan reference line where benchmark applies
- [ ] Chart heights are consistent within same section (not varying randomly)
- [ ] Tooltips have consistent dark-paper style (bg: #1a1714, text: #faf9f6)
- [ ] Axis labels are JetBrains Mono tiny

**Key pages to audit**: Dashboard → SpendingCategories → Administrations → PriceIntelligence → YearInReview → Sectors → VendorProfile → InstitutionProfile → Methodology → Settings

---

### Agent ESCENA — Composition & Editorial Framing Director

**Mission**: Every page reads as investigative journalism infrastructure. Compositions have clear hierarchy. The platform doesn't look like a generic SaaS tool. The executive summary is evaluated and improved.

**Audit checklist per page:**
- [ ] Page has a clear editorial "lede" (not just a filter bar)
- [ ] Navigation is consistent with sidebar
- [ ] Empty states have editorial framing (not generic "No data found")
- [ ] Loading states are minimal (spinner, not complex skeleton that flickers)
- [ ] Card borders use `--color-border` (2px warm gray, not arbitrary borders)
- [ ] The investigative framing language is consistent
- [ ] "Dossier" / "investigation" language feels natural in both EN and ES
- [ ] CTA buttons use amber gold accent
- [ ] Section dividers are thin hairlines, not heavy

**Executive Summary Assessment (special task):**
1. Read the existing Executive page (locale: `executive.json`, component likely `Executive.tsx` or similar)
2. Screenshot it
3. Evaluate: Does it serve as an effective 1-pager for journalists/policymakers?
4. What's missing? What's extraneous?
5. Write a concrete proposal: KEEP AS-IS / NEEDS REDESIGN / NEEDS NEW CONTENT

**Pages to audit**: Landing/Intro → Executive (if exists) → Journalists → Dashboard → AriaQueue → RedThread → CaseLibrary → Methodology → Limitations

---

## 9. Executive Summary Analysis

### Does RUBLI need an Executive Summary? YES.

The platform currently has three audience entry points:
- **Landing** — Marketing/intro, general public
- **Dashboard** — Exploratory, analysts
- **Journalists** — Stories, investigative journalists

What's missing: **The 1-pager for decision-makers** — senators, NGO directors, embassy staff, prosecutors. These users need to scan RUBLI in 90 seconds and understand the scale of the problem.

The Executive page (`/executive` route, `executive.json` locale) exists but needs evaluation. It should deliver:

**The 5 key findings** (numbered like a report):
1. 13.49% of all federal contracts show statistical patterns consistent with corruption
2. MX$1.37T (≈ US$80B real 2024) in potentially irregular spending across 23 years
3. AMLO administration set the record for direct awards: 78% of contracts bypassed open tender
4. 748 documented corruption cases detected retroactively — model would have flagged them before the scandals broke
5. Health and Agriculture sectors concentrate the highest-risk spending

**One risk gauge** — a single circular visualization showing 13.49% risk rate vs OECD 2–15% benchmark

**One timeline** — documented major cases 2002–2025 as a horizontal dot-strip

**One call to action** — "Investigar un proveedor / Investigate a vendor" → link to VendorProfile search

**Print button** — exports as clean PDF without sidebar

### Design for the Executive Page

- **No sidebar visible in print view** 
- Max-width 900px, centered
- Strong Playfair Display 800 headline
- Amber gold dividers between sections
- Credibility strip at bottom: "AUC 0.828 · 3.1M contracts · OECD compliant · Open source"

---

## 10. Page-by-Page Audit Criteria

### Pages Confirmed Working Well (User Validated)
These should be used as reference implementations:

| Page | What Works |
|------|-----------|
| `/price` | Dot-matrix strips, editorial framing, chart density |
| `/spending-categories` | Sexenio columns, data hierarchy |
| `/administrations` | Timeline, comparative strips |
| `/dashboard` | Hero stats, risk distribution, some editorial chrome |

### Pages Requiring Audit

| Page | Expected Issues | Priority |
|------|----------------|----------|
| `/` (Landing/Intro) | Generic SaaS feel in some sections | HIGH |
| `/journalists` | Story card design, preview charts | HIGH |
| `/aria` | Complex investigative UI, needs clarity | HIGH |
| `/vendors/:id` | Very complex, many sections, MXN formatting | HIGH |
| `/sectors/:id` | Constellation animation (fixed), detail view | MEDIUM |
| `/institutions/:id` | Data table density, chart mix | MEDIUM |
| `/red-thread/:id` | Scroll narrative chapter transitions | MEDIUM |
| `/collusion` | New SVG diagrams, needs design audit | MEDIUM |
| `/cases` | Card grid, editorial weight | MEDIUM |
| `/year-in-review` | Improved but needs full audit | MEDIUM |
| `/methodology` | Academic feel, needs editorial warmth | LOW |
| `/settings` | Functional, data quality display | LOW |
| `/executive` | Does it work for decision-makers? | CRITICAL |

---

## 11. Quality Checklist (for any change)

Before committing any remodeling change, verify:

```
Typography:
☐ Serif used only for editorial headlines/pull-quotes
☐ All numeric values in JetBrains Mono
☐ Max 3 type sizes in any card
☐ Body text is Inter 400 (not 500/600)

Color:
☐ Background is --color-background (#faf9f6) or --color-background-card (#fff)
☐ Borders use --color-border (#e2ddd6)
☐ Risk colors match §2 canonical values
☐ Accent is amber gold (#a06820), not blue or red

Visualization:
☐ No Recharts <Bar> or <BarChart>
☐ Dot-matrix uses animate not whileInView
☐ Legend line present with unit
☐ OECD line where applicable
☐ Empty dots match light background (#f3f1ec fill, #e2ddd6 stroke)

Layout:
☐ Card border-radius: 2px (not 8px or 16px)
☐ Card border: 1px solid --color-border
☐ Page padding: 24px
☐ Card gap: 16px

TypeScript:
☐ npx tsc --noEmit returns 0 errors
☐ npm run build succeeds
```

---

## 12. Language & Voice

### Editorial Voice (both EN and ES)

- **Specific, not vague**: "78% of contracts bypassed open tender" not "many contracts were awarded directly"
- **Active, not passive**: "IMSS awarded 9,366 contracts to ghost companies" not "ghost companies were found"
- **Numbers first**: Lead with the statistic, then the explanation
- **Accountability framing**: Name institutions, name administrations — not "some agencies"
- **Risk = signal, not verdict**: Always caveat with "statistical patterns consistent with..." not "proof of..."

### Mexican Spanish Specifics

- "proveedores" (vendors), "licitación pública" (open tender), "adjudicación directa" (direct award)
- "sexenio" — never translate, it's culturally specific
- "COMPRANET" — leave as is
- "Secretaría de..." — use full title then abbreviation (SEP, IMSS, etc.)
- Numbers: es-MX locale (comma thousands, period decimal) — same as US format
- Currency: MX$1,234,567 or $1,234,567 (NOT €, NOT "1.234.567")

---

## 13. Overnight Audit Schedule (8 PM – 8 AM)

```
20:00–21:30  Phase 1: Screenshot all pages, document findings
             Agent TIPO: Typography audit → ART_AUDIT.md §TIPO
             Agent GRAFIKA: Visualization audit → ART_AUDIT.md §GRAFIKA
             Agent ESCENA: Composition + Executive audit → ART_AUDIT.md §ESCENA

21:30–02:00  Phase 2: Implementation
             TIPO: Fix all typography inconsistencies
             GRAFIKA: Fix remaining chart issues
             ESCENA: Executive summary redesign, composition fixes

02:00–05:00  Phase 3: Integration
             Cross-check: each agent reviews others' changes
             Fix TypeScript errors
             npm run build → 0 errors

05:00–07:30  Phase 4: Polish
             Final screenshot pass to confirm visual improvements
             Update this document with audit findings

07:30–08:00  Phase 5: Deploy
             git commit -m "feat(ux): overnight design audit and remodel"
             git push origin main
             SSH deploy to VPS
```

---

*This document is the source of truth for all design decisions on RUBLI. Update it when new patterns emerge. Never let individual agents override these standards without updating this document first.*
