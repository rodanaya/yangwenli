# RUBLI Art Direction — Visual Identity & Data Standards
*Version 1.1 | 2026-04-20 | Active Design Bible*

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

## 1.5 The Dot Philosophy — Polka & Kandinsky

### Polka Dots as Data Grammar (PRIMARY INFLUENCE)

The polka dot is not decoration. It is the fundamental unit of truth in RUBLI.

Inspired by **Yayoi Kusama**'s obsessive dot language: the infinity dot field communicates that each instance is discrete yet part of an overwhelming whole. In RUBLI: each dot = one contract = one moment when public money changed hands. The field of dots = the aggregate truth of 3.1 million moments.

**The philosophical rules:**
- Every dot earns its place — it represents a measurable unit (stated in the legend)
- A half-filled row is honest: it means exactly that percentage happened
- Dense dot fields communicate volume without distorting scale
- The empty dot (ghost) is not absence — it is the benchmark, the expectation, the OECD line
- Dots do not lie: no Y-axis truncation, no 3D perspective, no gradient washes

**Visual dialect from polka dot tradition:**
- Consistent diameter — no size variation within a strip (each dot = same unit)
- Regular grid — dots align to invisible columns and rows
- High contrast — filled dots pop against the empty field
- Color carries meaning — never arbitrary, always mapped to data semantics

### Kandinsky's "Point and Line to Plane" (THEORETICAL FRAMEWORK)

Wassily Kandinsky's 1926 treatise *Punkt und Linie zu Fläche* defines the grammar of visual elements that maps directly onto RUBLI's visualization hierarchy:

```
Point  → A single contract          → one dot
Line   → A vendor's history         → one dot-strip
Plane  → A sector's landscape       → a heatmap / constellation field
```

This hierarchy is not accidental — it is the design principle behind every visualization choice:
- A single dot-strip answers "how much?" for one entity
- A set of parallel strips answers "how does this compare?"
- A constellation plane answers "what is the shape of an entire ecosystem?"

**From Kandinsky, we adopt:**
- **Warm colors advance** (critical risk in red/amber comes forward visually)
- **Cool colors recede** (OECD reference lines in cyan sit behind the data)
- **Geometric precision** — no rounded forms in data (dots are exact circles, lines are hairlines, not soft curves)
- **The diagonal** carries urgency (trend lines angled down/up signal change)
- **Tension through proximity** — dots crowded together near the OECD line create visual tension that communicates risk

**From Kandinsky, we do NOT adopt:**
- Abstract expressionism — the data must remain legible, not interpreted
- Free color assignment — our colors are semantically fixed (sector palette, risk palette)
- Decorative geometry — shapes that do not encode data are forbidden

### The Synthesis: Data Pointillism

The name for what we practice: **data pointillism**. Like Seurat's *La Grande Jatte* — standing close, you see individual dots; stepping back, you see the corruption landscape of Mexico. Each dot precise. The whole, overwhelming.

This is the aesthetic and philosophical foundation. When an agent makes a visualization decision, the question is always: **does this respect the dot as the fundamental unit of data truth?**

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

> This section is the binding specification. Every text element on the platform must conform. When a component engineer or agent makes a typography decision, they check here first. If the answer is not here, update this document before writing code.

---

### 3.1 Font Stack

```css
--font-family-serif:  "Playfair Display", Georgia, "Times New Roman", serif;
--font-family-sans:   "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
--font-family-mono:   "JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace;
```

**Loading weights — what to actually load from Google Fonts / local:**

```html
<!-- Playfair Display: only load what we use -->
Playfair Display: 400, 400i, 700, 800
<!-- Inter: full range for flexibility -->
Inter: 300, 400, 500, 600, 700
<!-- JetBrains Mono: 400 and 700 only -->
JetBrains Mono: 400, 500, 700
```

Do NOT load font weights you don't use. Each unused weight is a network request that wastes load time.

---

### 3.2 Type Scale — Full Specification

Every level has a canonical value for desktop AND mobile, plus line-height, letter-spacing, and weight range.

| Level | Desktop | Mobile | Line-height | Letter-spacing | Weight range | Font |
|-------|---------|--------|-------------|---------------|--------------|------|
| **Display** | 3rem / 48px | 2.25rem / 36px | 1.05 | −0.02em | 700–800 | Playfair or JetBrains Mono |
| **H1** | 2rem / 32px | 1.625rem / 26px | 1.15 | −0.01em | 700 | Playfair (editorial) or Inter (UI) |
| **H2** | 1.5rem / 24px | 1.25rem / 20px | 1.2 | 0em | 600 | Inter |
| **H3** | 1.25rem / 20px | 1.125rem / 18px | 1.25 | 0em | 600 | Inter |
| **H4 / Label-lg** | 1rem / 16px | 1rem / 16px | 1.3 | 0em | 500–600 | Inter |
| **Body** | 1rem / 16px | 1rem / 16px | 1.6 | 0em | 400 | Inter |
| **Body-sm** | 0.875rem / 14px | 0.875rem / 14px | 1.5 | 0em | 400 | Inter |
| **Label / Caption** | 0.75rem / 12px | 0.75rem / 12px | 1.4 | 0em | 400–500 | Inter |
| **Micro / Axis** | 0.6875rem / 11px | 0.6875rem / 11px | 1.35 | 0em | 400 | Inter or Mono |
| **Nano** | 0.625rem / 10px | 0.625rem / 10px | 1.3 | 0em | 400–500 | Inter Mono |

**Responsive implementation (Tailwind):**

```css
/* Display — hero KPIs, story leads */
.type-display { @apply text-3xl md:text-5xl font-bold leading-[1.05] tracking-tight; }

/* H1 — page titles */
.type-h1 { @apply text-[26px] md:text-[32px] font-bold leading-[1.15] tracking-[-0.01em]; }

/* H2 — section headers */
.type-h2 { @apply text-xl md:text-2xl font-semibold leading-[1.2]; }

/* H3 — card headers */
.type-h3 { @apply text-lg md:text-xl font-semibold leading-[1.25]; }

/* Body — main content prose */
.type-body { @apply text-base font-normal leading-[1.6]; }

/* Label — UI elements, nav, buttons */
.type-label { @apply text-xs font-medium leading-[1.4]; }

/* Micro — axis labels, badges, footnotes */
.type-micro { @apply text-[11px] font-normal leading-[1.35]; }
```

---

### 3.3 Contextual Usage Table — Full Mapping

Every context on the platform maps to exactly one typographic specification.

| Context | Font | Size | Weight | Line-ht | Letter-sp | Color token |
|---------|------|------|--------|---------|-----------|-------------|
| **Page title** | Playfair Display | H1 | 700 | 1.15 | −0.01em | `--color-text-primary` |
| **Story headline** | Playfair Display | H1–Display | 800 | 1.05 | −0.02em | `--color-text-primary` |
| **Editorial pull-quote** | Playfair Display italic | H2 | 400i | 1.4 | 0em | `--color-text-secondary` |
| **Investigation lede** | Playfair Display | H3 | 400 | 1.5 | 0em | `--color-text-secondary` |
| **Section header (card)** | Inter | H3 | 600 | 1.25 | 0em | `--color-text-primary` |
| **Section sub-label** | Inter | Body-sm | 400 | 1.5 | 0em | `--color-text-secondary` |
| **Body prose** | Inter | Body | 400 | 1.6 | 0em | `--color-text-primary` |
| **Methodology / docs prose** | Inter | Body | 400 | 1.7 | 0em | `--color-text-primary` |
| **UI button label** | Inter | Body-sm | 500 | 1.25 | 0em | contextual (button color) |
| **Nav item** | Inter | Body-sm | 500 | 1.35 | 0em | `--color-text-secondary` |
| **Tab label** | Inter | Body-sm | 500 | 1.35 | 0.02em | `--color-text-secondary` |
| **Badge / pill text** | Inter | Nano | 500 | 1.3 | 0.08em | contextual (badge color) |
| **Section badge (ALL CAPS)** | Inter | Nano–Micro | 600–700 | 1.2 | 0.12–0.15em | `--color-text-muted` |
| **Hero KPI stat** | JetBrains Mono | Display | 700 | 1.05 | −0.02em | `--color-text-primary` |
| **Table value** | JetBrains Mono | Body-sm | 400–500 | 1.4 | 0em | `--color-text-primary` |
| **Chart axis value** | JetBrains Mono | Micro | 400 | 1.35 | 0em | `--color-text-muted` |
| **Dot-matrix legend** | JetBrains Mono | Nano | 400 | 1.3 | 0em | `--color-text-muted` |
| **MXN currency (inline)** | JetBrains Mono | inherit | 500 | inherit | 0em | `--color-text-primary` |
| **Percentage (inline)** | JetBrains Mono | inherit | 500 | inherit | 0em | contextual (risk color) |
| **Footnote / source note** | Inter | Micro | 400 | 1.4 | 0em | `--color-text-muted` |
| **Methodology tooltip** | Inter | Micro | 400 | 1.45 | 0em | `--color-text-secondary` |
| **Empty state message** | Inter | Body-sm | 400 | 1.5 | 0em | `--color-text-muted` |
| **Error message** | Inter | Body-sm | 500 | 1.4 | 0em | `#ef4444` |
| **Input placeholder** | Inter | Body-sm | 400 | 1.5 | 0em | `--color-text-muted` |
| **Table column header** | Inter | Micro | 600 | 1.3 | 0.08em | `--color-text-muted` |

---

### 3.4 Text Color System

Text colors are **not arbitrary**. Every text element uses one of these four tokens. Never use a raw hex color for text.

| Token | Hex (light) | Hex (dark card/sidebar) | When to use |
|-------|------------|------------------------|-------------|
| `--color-text-primary` | `#1a1714` | `#e8e0d8` | Main content, data values, page titles, anything the user must read |
| `--color-text-secondary` | `#6b6560` | `#a09890` | Sub-labels, descriptions, secondary information |
| `--color-text-muted` | `#9c9490` | `#706860` | Captions, footnotes, axis labels, placeholders, dates |
| `--color-text-disabled` | `#c5bfb8` | `#504840` | Disabled states, greyed-out elements, N/A |

**Risk text colors** (always use these for any risk-level annotation):

| Level | Hex | When |
|-------|-----|------|
| Critical text | `#ef4444` | Risk level badges, critical alert text |
| High text | `#f59e0b` | High-risk labels |
| Medium text | `#a16207` | Medium-risk labels |
| Low text | `#71717a` | Low-risk labels (NOT green) |

---

### 3.5 Section Badge Convention (ALL CAPS)

Section badges appear above card content to label the data category. They must always be:

```
Font:           Inter
Size:           10–11px (Nano to Micro)
Weight:         600–700
Case:           UPPERCASE
Letter-spacing: 0.10–0.15em (Tailwind: tracking-widest)
Color:          --color-text-muted (default) | or risk color when risk-level badge
```

**Examples of correct badges:**
```
INVESTIGACIÓN  ·  RIESGO CRÍTICO  ·  ADJUDICACIÓN DIRECTA
EDITORIAL SUMMARY  ·  DATOS  ·  METODOLOGÍA  ·  FUENTE: COMPRANET
```

**Never do this:**
```
❌ "Investigation" (sentence case — too soft for a badge)
❌ Bold italic badges — badges are NOT italic
❌ Badge in Playfair Display — serif badges look editorial, not data
❌ Badge with no letter-spacing — it collapses into a word, not a label
```

---

### 3.6 Number and Data Formatting in Typography

All numeric values displayed to users must follow this protocol:

**Currency (MXN):**
```
Hero stat:   "9.9T MXN"         → JetBrains Mono 700, Display size
Compact:     "MX$1,234M"        → JetBrains Mono 500, Body-sm size
Full:        "MX$1,234,567,890" → JetBrains Mono 400, Caption size (tables)
USD context: "≈ US$580B (2024)" → JetBrains Mono 400, Micro, muted color
```

**Percentages:**
```
Risk rate:   "13.49%"   → JetBrains Mono 700, risk color
DA rate:     "78.0%"    → JetBrains Mono 500, --color-text-secondary
Comparison:  "+4.2pp"   → JetBrains Mono 500, green or red by direction
Axis label:  "10%"      → JetBrains Mono 400, Micro, muted
```

**Counts:**
```
Contract count:  "3,051,294"   → Intl.NumberFormat('es-MX') — comma thousands
Large counts:    "3.1M"         → JetBrains Mono 500 (compact)
Rank number:     "01"           → JetBrains Mono 700, tabular-nums, padded to 2 digits
Year:            "2024"         → JetBrains Mono 400 (not Playfair or Inter)
```

**Decimal precision rules:**
```
MXN compact:   1 decimal (9.9T, 1.3B, 45.2M)
MXN full:      0 decimal (MX$1,234,567)
Risk score:    4 decimal (0.6234) in model view; 0 decimal (62%) in user-facing
Percentage:    1 decimal in labels (13.5%); 0 decimal in badges (14%)
AUC:           3 decimal (0.828)
```

**Tabular numbers:** Always add `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums`) to any column of numbers that should visually align. This applies to tables, ranked lists, dot-matrix labels, and dashboard KPIs.

---

### 3.7 Hierarchy Rules — Max Complexity Per Element

1. **Max 3 type sizes** on any single card or section. 4+ creates visual chaos.
2. **Max 2 font families** on any single section. Never mix all three on one card.
3. **Serif (Playfair) for editorial only** — story titles, page heroes, pull-quotes. Never for data labels, table headers, nav items, or UI controls.
4. **Mono for ALL numbers** — every currency amount, every percentage, every count, every year. Not just "big" numbers. ALL numbers.
5. **Weight carries meaning**: 700 = primary action or critical value. 600 = section-level. 500 = interactive label. 400 = body content. 300 = footnote level. Never use a random weight.
6. **Bold body text is forbidden** — `font-weight: 600` in body prose indicates the author panicked. Use size hierarchy instead.

---

### 3.8 Line Height & Spacing — Exact Values

| Usage | `line-height` | `letter-spacing` | Notes |
|-------|--------------|-----------------|-------|
| Display / large KPI | 1.05 | −0.02em | Tight — headline serif compression |
| H1 editorial | 1.15 | −0.01em | Compressed for authority |
| H2/H3 section | 1.2–1.25 | 0em | Neutral |
| Body prose | 1.6 | 0em | Generous — never below 1.5 for reading |
| Body-sm labels | 1.4–1.5 | 0em | Labels need less air |
| Mono data | 1.4 | 0em | JetBrains already has good internal spacing |
| ALL CAPS badge | 1.2 | 0.10–0.15em | Wide tracking compensates for caps density |
| Footnote / axis | 1.35 | 0em | Compact but legible |

---

### 3.9 Dark Context Rules (Dark Cards, Sidebar, Modals)

The sidebar and dark data-panel components require specific overrides:

```css
/* Dark card text — use these instead of light-mode values */
--dark-text-primary:   #e8e0d8;   /* Warm off-white — not pure white */
--dark-text-secondary: #a09890;
--dark-text-muted:     #706860;

/* Inter on dark: increase weight by 1 step for optical legibility */
/* Body 400 on light → 400 on dark (fine)                        */
/* Labels 500 on light → 500 on dark (fine, Inter renders well)  */
/* Micro 400 on dark → prefer 500 to maintain legibility         */
```

Dark context does NOT change font family or type scale — only color tokens.

---

### 3.10 Explicit DON'T List

These patterns are forbidden and must be corrected during any audit:

```
❌ Playfair Display for data labels, table headers, tooltip text, axis values
❌ JetBrains Mono for descriptive prose, section titles, body paragraphs
❌ Inter for standalone currency amounts (hero KPIs, table cells)
❌ font-weight: 600 or 700 on body prose text
❌ color: green (#22c55e) for "low risk" text — green implies safe
❌ Bare px values for font-size in TSX (use Tailwind classes)
❌ Hardcoded hex for text color — use --color-text-* CSS variables
❌ letter-spacing: 0 on ALL CAPS text — caps without tracking are unreadable
❌ letter-spacing on body prose — tracking on lowercase text looks wrong
❌ text-transform: uppercase on serif fonts — Playfair in caps is illegible
❌ font-style: italic on mono — JetBrains Mono italic is for code only
❌ More than 3 type sizes on a single card
❌ font-size below 10px anywhere — violates WCAG minimum
❌ Mixing Tailwind size classes and inline style font-size on same element
❌ Serif font at sizes below 14px (Playfair is illegible at micro scale)
```

---

### 3.11 Responsive Typography — Breakpoint Behavior

```
Mobile  (< 640px):  1-column layout, no sidebar
                    Display: 36px | H1: 26px | H2: 20px | H3: 18px
                    Dot-matrix charts scale with viewBox (100% width)
                    Mono values same size as desktop — numbers must be legible

Tablet  (640–1024px): Sidebar collapses to icon bar
                    Display: 42px | H1: 28px | H2: 22px | H3: 20px
                    Charts fill available width

Desktop (> 1024px): Full sidebar (224px) visible
                    Display: 48px | H1: 32px | H2: 24px | H3: 20px
```

Implementation pattern:
```tsx
/* Page title — responsive */
<h1 className="text-[26px] md:text-[32px] font-bold leading-[1.15] tracking-[-0.01em] font-serif">

/* Hero KPI stat — responsive */
<span className="text-4xl md:text-5xl font-bold tabular-nums font-mono">

/* Section badge — NOT responsive (stays nano everywhere) */
<span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
```

---

### 3.12 Tailwind Class Reference — Quick Lookup

| Design spec | Tailwind class(es) |
|-------------|-------------------|
| Playfair Display | `font-serif` (requires CSS var set to Playfair) |
| Inter | `font-sans` |
| JetBrains Mono | `font-mono` |
| Weight 400 | `font-normal` |
| Weight 500 | `font-medium` |
| Weight 600 | `font-semibold` |
| Weight 700 | `font-bold` |
| Weight 800 | `font-extrabold` |
| Display (48px desktop) | `text-5xl` |
| H1 (32px) | `text-[32px]` or `text-3xl` |
| H2 (24px) | `text-2xl` |
| H3 (20px) | `text-xl` |
| Body (16px) | `text-base` |
| Body-sm (14px) | `text-sm` |
| Label/Caption (12px) | `text-xs` |
| Micro (11px) | `text-[11px]` |
| Nano (10px) | `text-[10px]` |
| Line-height 1.05 | `leading-[1.05]` |
| Line-height 1.15 | `leading-[1.15]` |
| Line-height 1.6 | `leading-relaxed` |
| Letter-spacing −0.02em | `tracking-[-0.02em]` or `tracking-tighter` |
| Letter-spacing 0.08em | `tracking-wide` |
| Letter-spacing 0.12em | `tracking-wider` |
| Letter-spacing 0.15em | `tracking-widest` |
| Tabular nums | `tabular-nums` |
| Primary text color | `text-text-primary` |
| Secondary text color | `text-text-secondary` |
| Muted text color | `text-text-muted` |

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
