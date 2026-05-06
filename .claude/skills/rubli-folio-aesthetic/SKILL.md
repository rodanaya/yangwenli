---
name: rubli-folio-aesthetic
description: |
  RUBLI's editorial-folio frontend aesthetic — investigative-journalism voice
  for a procurement corruption platform. Use this skill whenever you are
  redesigning, polishing, or building any user-facing surface in the RUBLI
  codebase (frontend/ pages, components, charts, dashboards). Trigger
  enthusiastically when the user says any of: "redesign this page", "make
  this look better", "polish this", "make it feel investigative",
  "add visual hierarchy", "this looks generic", "this feels like a dashboard",
  "make it feel like the FT/Reuters/ICIJ/OCCRP", or invokes /omega and
  similar redesign workflows. Also trigger when adding new pages, building
  charts, or working on /atlas, /dashboard, /sectors, /aria, vendor
  profiles, story narratives, or anything in frontend/src/pages or
  frontend/src/components/atlas, components/charts, components/sectors.
  This skill encodes the visual decisions made across many redesign
  cycles so future sessions ship in the right voice without rediscovering
  the vocabulary; reading it first saves an hour of trial and error and
  prevents the "kinda looks the same" failure mode.
---

# RUBLI Editorial Folio Aesthetic

You are designing for a corruption-detection platform reading from
$9.9 trillion MXN of Mexican federal procurement. The audience is
investigative journalists at MCCI, IMCO, Animal Político, ICIJ-style
outlets — not generalist consumers. The data is prosecutorial. The
voice must match: serious, archival, editorial.

This is the **anti-dashboard** brief. Generic SaaS chrome, dark-glass
surfaces, purple-blue gradients, Pudding.cool whimsy, evenly-distributed
balanced palettes — all wrong here. The goal is something that reads as
a printed plate from an investigative atlas, not a Stripe billing page.

If you take one rule from this document, take this: **commit to
"classified investigative folio"** as the aesthetic direction and
execute it with precision. Every typography pick, color choice, and
decorative element should pull in that direction or get cut.

---

## Reference vocabulary — cite by name, use the actual mechanic

When proposing or shipping a redesign, name the precedent in the plan
doc and commit body. This forces the mechanic to be specific instead of
"editorial vibes."

**Default citation library** (in priority order for accountability data):

1. **OCCRP / ICIJ Pandora & Panama Papers** — entity flow diagrams,
   institution → intermediary → vendor; chapter-overlay annotations.
2. **Reuters Graphics** — *Forever Pollution* paired-named-outlier
   dots; *Carbon's Casualties* annotated geographic dot field; *Time of
   Evidence* timelines with accumulating events.
3. **FT Visual Vocabulary** — bullet, slope, dumbbell, deviation bar,
   small multiples, candlesticks. Explicitly built for accountability
   journalism.
4. **NYT Upshot** — *How Much Hotter Is Your Hometown* annotated dot
   strip with named callouts on the chart; *How the Virus Got Out*
   camera following the narrative through the data; federal spending
   treemap.
5. **ProPublica** — *Bailout Tracker* accountability tables, document
   reader UI patterns.
6. **Bureau of Investigative Journalism** — UK accountability
   data viz, document overlays.
7. **Sigma Awards finalists** — peer-juried best-of-data-journalism.
8. **Ordnance Survey & antique cartography** — plate margins, corner
   crop marks, archival folio indexing — for the chrome only.

**Do NOT cite as default**: Pudding.cool (good for cultural / whimsical
data, wrong for prosecutorial procurement); Bloomberg Terminal cues
(too SaaS-coded for editorial context); Apple HIG / Material Design
(generic).

**Citation discipline**: if your proposed change "could attach to any
piece you cited," the citation is decorative — pick a different piece
or a different mechanic. Example: "Trolley Problem" means
Cleveland-pair geometry with named outliers and a zero-axis, not just
"a chart with two dots."

---

## Typography

The platform already loads four font families. Use them as follows:

| Family | Loaded weights | Use for |
|---|---|---|
| **EB Garamond** | 400–800 + italics | Display headlines (italic 500 preferred), body lede on long-form pages, plate captions. |
| **IBM Plex Mono** | 300/400 + italics | Archival labels: folio numbers, date stamps, eyebrows (uppercase 9.5–10px, 0.18em tracking). |
| **JetBrains Mono** | 400/500/700 | In-chart data labels, sortable table headers, anything that wants "code-y" without leaning archival. |
| **Playfair Display** | 400–900 italics | Legacy big-numbers (Anchor stat tiles, dashboard sledgehammers). De-emphasize for new headlines — prefer EB Garamond italic. |

**Forbidden for hero copy**: Inter, Roboto, system-ui, Arial. They read
as "AI dashboard generic" and erase the editorial voice.

### Headline pattern (preferred)

```tsx
<h1 style={{
  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 'clamp(36px, 6vw, 68px)',
  lineHeight: 0.96,
  letterSpacing: '-0.012em',
}}>
  An Atlas <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
    of nine&#8202;trillion&#8202;pesos
  </span><br />
  <span style={{ fontStyle: 'normal' }}>in federal procurement.</span>
</h1>
```

Note: a single normal-weight ochre-accented fragment INSIDE an italic
serif headline is the signature move — much stronger than fully-bold
or fully-italic. The contrast is what makes it feel composed.

### Eyebrow / archival index pattern

```tsx
<div style={{
  fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
  fontSize: '10px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  fontWeight: 400,
}}>
  <span style={{ color: '#a06820', fontStyle: 'italic', fontWeight: 500 }}>
    Folio·IX
  </span>
  <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
  <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
    Atlas of federal contracting
  </span>
</div>
```

### Body lede pattern

```tsx
<p style={{
  fontFamily: '"EB Garamond", Georgia, serif',
  fontSize: '17px',
  lineHeight: 1.55,
  maxWidth: '68ch',
  color: 'var(--color-text-secondary)',
  letterSpacing: '0.005em',
}}>
  Each mark in the plate below stands for a slice of the federal
  contract record. <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>
    Choose a lens
  </em> in the rail at left to reorder them by pattern, sector, or term.
</p>
```

68ch max width is intentional — beyond that the eye loses the line.

---

## Color

The platform palette is warm, desaturated, archival. Import everything
from `@/lib/constants` — never inline hex risk colors.

| Token | Hex | Use |
|---|---|---|
| Platform accent | `#a06820` (ochre amber) | Headline accent fragment, folio numbers, plate frame strokes, hover halos. **Replaces all purple-blue gradients.** |
| Background | `#faf9f6` (warm off-white) | Default page background. Pure white reads "SaaS"; this reads "page." |
| Critical risk | `#dc2626` (RISK_COLORS.critical) | Critical-band fills, top alerts. |
| High risk | `#f59e0b` (RISK_COLORS.high) | High-band fills. |
| Medium risk | `#a16207` (amber-800, RISK_COLORS.medium) | Medium-band fills, named-outlier dots. |
| Low risk | `#71717a` (zinc-500, RISK_COLORS.low) | Low-band noise floor. **NEVER green** (Bible §3.10 — a procurement-only model cannot certify integrity). |
| Sector accents | `SECTOR_COLORS` (fills) / `SECTOR_TEXT_COLORS` (AA-safe text) | 12-sector taxonomy. |

**Anti-pattern**: never use green for "safe" / "low risk" / "all clear."
The platform is forensic; green over-claims integrity and is forbidden
codebase-wide. The token gate (`npm run lint:tokens`) blocks new
occurrences in `src/pages` + `src/components` + `src/hooks`.

---

## Layout chrome — the PlateFrame pattern

The signature visual move on archival surfaces. Wrap any data surface
with corner crop marks + archival header + italic plate caption.

The component already exists at
`frontend/src/components/atlas/PlateFrame.tsx`. Reuse it. Don't reinvent.

```tsx
<PlateFrame
  lens={mode}
  year={snapshot.year}
  clusterCount={activeMeta.length}
  totalContracts={totalContractsForYear}
  lang={lang}
>
  <YourChartHere />
</PlateFrame>
```

If you need a PlateFrame variant (different folio numbering, different
caption shape), add a new prop or a sibling component — don't bolt
classified-file chrome onto an unrelated card.

**No generic card drop-shadows.** Use this instead:

```css
border: 1px solid var(--color-border);
box-shadow: inset 0 0 0 1px rgba(160, 104, 32, 0.06);
```

The inset 1px ochre tint reads as an inked border on a printed page —
not a glossy SaaS card.

---

## Atmosphere — paper-grain overlay

Editorial archival surfaces (atlas, story chapters, methodology) get a
subtle SVG paper-grain noise overlay scoped to the page. Implementation:

```tsx
<svg
  aria-hidden="true"
  className="pointer-events-none absolute inset-0"
  style={{ width: '100%', height: '100%', opacity: 0.045, mixBlendMode: 'multiply', zIndex: 0 }}
>
  <filter id="page-paper-grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
    <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
  </filter>
  <rect width="100%" height="100%" filter="url(#page-paper-grain)" />
</svg>
```

Wrap your page content in a `<div className="relative" style={{ zIndex: 1 }}>`
so it sits above the grain. Pointer-events:none means the overlay never
blocks interaction.

**Don't apply globally.** This is per-page atmosphere. Investigation
queues, vendor profiles, and live-data dashboards should NOT have it —
those want clarity, not antique paper. Only use on:

- `/atlas`, `/observatorio`, `/observatory`
- `/stories/:slug`
- `/methodology`
- Long-form analysis pages

---

## When to use PlateFrame — decision tree

```
Is the surface a data plate that benefits from editorial framing?
├─ Yes → Use PlateFrame
│   └─ Examples: constellation, sector treemap, network graph, atlas of
│      anything, "this is what the data looks like at a glance"
└─ No → Plain surface-card or no chrome
    └─ Examples: investigation queue (table-heavy), vendor profile
       (dense facts), settings page (operational), filter forms
```

Rule of thumb: **if the surface invites contemplation, PlateFrame.
If the surface invites action, no PlateFrame.**

---

## Chart-family → named-precedent matrix

When proposing a chart redesign, pick from this matrix. Don't invent.

| Chart family | Named precedent | Use when |
|---|---|---|
| Two-state comparison (A vs B per row) | FT *Cleveland pair* / Reuters *Forever Pollution* paired dots | "How much higher is X than the benchmark?" |
| Ranking with named outliers | NYT Upshot annotated dot strip | "Who are the top N, with their names visible?" |
| Concentration / share | Treemap (NYT Upshot federal spending), or FT slope chart for change-over-time | Distribution across categories |
| Time series with editorial moments | Reuters *Carbon's Casualties* annotated time series | "Here's what happened during this period" |
| Network / flow | ICIJ Aleph entity-flow / OCCRP shell-company diagrams | "X → intermediary → Y" |
| Headline number / single fact | "Sledgehammer" anchor stat (Playfair Italic 800) | One number that should hit hard |
| Categorical density | Beeswarm or DotStrip (canonical primitive) | "Distribution of vendors by risk × sector" |
| Threshold-vs-actual | FT bullet chart / BenchmarkRow primitive | "Did we meet the OECD 25%?" |

**Forbidden chart families** (already audited out):
- Pies and donuts (replace with dot strips or treemaps)
- 3D anything
- Default Recharts color stacks
- Axes without unit labels
- Captions instead of geometric distinction (see "cover-the-captions test" below)

---

## The cover-the-captions test (omega rule)

Before claiming a redesign is done, **mentally cover all the new
captions, anchor stats, and labels with your hand. Does the chart
still look meaningfully different from before?**

If yes — the geometry actually changed (e.g. bar → Cleveland pair,
list → beeswarm, grid → annotated dot strip, anonymous dots → named
outliers with labels). Pass.

If no — you decorated, you didn't redesign. The chart's underlying
shape is unchanged and you just stuck text on top. Fail. Try again
with a different mechanic.

This rule exists because every previous omega cycle initially failed
this test (caption-on-top-of-unchanged-chart pattern). The user named
it "amplified redesign" and the test is the gate.

---

## Editorial primitives — building blocks

Before designing a new component, check whether one of these already
fits. Reuse beats reinvent.

| Primitive | Path | What it does |
|---|---|---|
| `<EntityIdentityChip type id name size>` | `frontend/src/components/ui/EntityIdentityChip.tsx` | The ONLY way to render a vendor/institution/sector/category/case/pattern outside its own dossier. Plain `<Link to={`/vendors/${id}`}>` is forbidden. |
| `<PlateFrame>` | `frontend/src/components/atlas/PlateFrame.tsx` | Editorial folio chrome wrapper. |
| `<BenchmarkRow>` | `frontend/src/components/editorial/BenchmarkRow.tsx` | FT bullet row vs OECD benchmark. |
| `<EditorialDistribution>` | `frontend/src/components/editorial/EditorialDistribution.tsx` | Stacked-share bar with sector colors and named callouts. |
| `<EditorialTimeline>` | `frontend/src/components/editorial/EditorialTimeline.tsx` | Reuters-style annotated time series. |
| `<Sledgehammer>` / `<DashboardSledgehammer>` | `frontend/src/components/editorial/Sledgehammer.tsx` | Playfair Italic 800 anchor-stat tile. |
| `<DotBar value max color>` | `frontend/src/components/ui/DotBar.tsx` | Single-row dot strip for inline metrics. |
| `<DotStrip rows>` | `frontend/src/components/charts/editorial/` | Multi-row ranked dot matrix. Bible §4 canonical (N=50, R=3, GAP=8). |

**Never inline `<circle>` dot strips in pages.** All dot rendering routes
through `DotBar` or `DotStrip`.

---

## Bilingual rule — non-negotiable

Every visible string lands in BOTH Spanish and English. Codebase
convention:

```tsx
{lang === 'en' ? 'English copy' : 'Copia en español'}
```

Spanish is the **else branch**. Do not flip the order.

Audit checklist before declaring a redesign done:

```bash
# Counts must match (or be acceptably close)
grep -cE "lang ?=== ?'es' ?\?" file.tsx
grep -cE "lang ?=== ?'en' ?\?" file.tsx

# Surface any English-looking strings missed
grep -nE "['\"][A-Z][a-z]+ [a-z]+['\"]" file.tsx
```

This catches strings inside event handlers, aria-labels, tooltip
builders, and conditional branches that the eye misses.

---

## Risk thresholds & data primitives

Always import from `@/lib/constants`. Do not inline thresholds.

```tsx
import {
  RISK_COLORS,
  SECTOR_COLORS,
  SECTOR_TEXT_COLORS,
  RISK_THRESHOLDS,
  getRiskLevelFromScore,
  getSectorTextColor,
  formatCompactMXN,
} from '@/lib/constants'

const level = getRiskLevelFromScore(score)  // 'critical' | 'high' | 'medium' | 'low'
const color = RISK_COLORS[level]
```

**Risk copy**: "indicador de riesgo" / "risk indicator" — never "X%
probability of corruption." The model produces a similarity score,
not a probability.

**Money formatting**: `formatCompactMXN(amount)` produces locale-aware
output:
- ≥10¹²: "X.X billones MXN" (Spanish "billón" = English trillion)
- ≥10⁹: "X,XXX MDP" (mil millones de pesos)
- ≥10⁶: "X.X MDP"

Mexican media never use English-loaned "B MXN" in Spanish UI; always
MDP / billones / mil millones.

---

## When to break the "engine is sacred" rule

`ConcentrationConstellation.tsx` is marked sacred in CLAUDE.md because
its dot-allocation logic is shared across `/atlas`, `/dashboard`, and
year-comparison views — changes ripple through pin behavior and
year-morphing.

**Default**: do not modify the engine. Wrap it with a layer
(see `AtlasZoomLayer`, `PlateFrame`, `ClusterHoverOverlay`) that adds
visual or interaction layers on top.

**Authorized exceptions** require user-explicit go-ahead:
- Adding a new prop that toggles a render layer (e.g.
  `namedVendors`, `highlightedClusterCodes`) without changing
  positioning math.
- Changing label font sizes / weights / families.

**Always forbidden** (will silently break other pages):
- Editing the Halton attractor allocation in `useMemo`.
- Changing SVG dimensions, padding constants, or N_DOTS.
- Removing the `metaOverride` / `seedOverride` prop paths.
- Adding new useState/useEffect that change render frequency
  (high risk of React #301 "too many re-renders" — already happened
  once in OMEGA-N).

If the user asks for a constellation redesign and the change requires
touching the engine: confirm explicitly before you start, and gate every
new prop behind a "default off" pattern so existing callers don't break.

---

## Commit message format

```
feat(<surface> <phase>): <what>
```

Body must:
1. Cite the named precedent ("Reuters Forever Pollution," "FT bullet,"
   "ICIJ Pandora").
2. Cite the relevant doc / plan with section number when one exists
   (e.g. `docs/ATLAS_C_CONSOLE_PLAN.md § P3`).
3. Drop any `Co-Authored-By: Claude Sonnet 4.6` line — that attribution
   is stale (we are on Opus 4.7 / SDK-driven flows). Either omit or
   use the current model name.
4. Note which gates passed: tsc strict + tsc lenient + lint:tokens +
   build all green.

Example:

```
feat(atlas folio-skin): investigative-folio aesthetic skin pass

Aesthetic direction: "Procurement Atlas as a classified investigative
folio." Reference vocabulary: OCCRP / ICIJ Pandora Papers, Reuters
Graphics archival, FT print, Ordnance Survey map plates.

PlateFrame component wraps the constellation card with corner crop
marks, archival folio header, italic EB Garamond plate caption.
EB Garamond + IBM Plex Mono added to font load. Page atmosphere
adds SVG fractalNoise paper-grain overlay (opacity 0.045).

BUILD_ID -> 2026-05-05-folio-skin.
Gates: tsc strict + tsc lenient + lint:tokens + build all green.
```

---

## The five-step ship checklist

Before declaring any redesign done:

1. **`git add` every new file BEFORE running gates.** New files compile
   locally even when uncommitted; CI fails on missing files. The single
   most common failure mode this codebase produces.
2. **Run all four gates from `frontend/`**:
   ```bash
   node_modules/.bin/tsc --noEmit -p tsconfig.app.json
   node_modules/.bin/tsc --noEmit
   npm run lint:tokens
   npm run build
   ```
   All four must pass. If any fail, fix in place — don't shrug.
3. **Bump `BUILD_ID`** in `frontend/src/lib/constants.ts` in the same
   commit as the redesign. Forces Vite content hash change so users get
   the new bundle.
4. **Bilingual audit** with the grep commands above on touched files.
5. **Cover-the-captions test** — does the chart geometry actually
   change, or did you decorate?

Only then commit + push.

---

## Anti-patterns — call these out and refuse them

If the user asks for any of these, gently push back and propose the
right move. They are the failure modes that have repeatedly soured
redesign cycles in this codebase.

- **"Just add captions / anchor stats / glossaries on top of the
  existing chart."** Failed cover-the-captions test. Counter-propose
  geometric change.
- **"Use Pudding.cool's giant typography."** Wrong vocabulary for
  prosecutorial data. Counter-propose FT bullet, Reuters annotation,
  or NYT Upshot dot strip.
- **"Add a green badge for safe vendors."** Bible §3.10 violation.
  Procurement-only models cannot certify integrity. Use neutral zinc.
- **"Use Inter for the headline — it's clean."** That's the AI-slop
  default. Use EB Garamond italic 500.
- **"Stack five horizontal bar charts above each other."** Use a
  treemap, slope chart, or beeswarm — let the data shape the
  geometry, not the other way around.
- **"Add a purple → blue gradient hero background."** That's the
  generic SaaS look. Replace with warm off-white + ochre accent.
- **"Make the right rail a sticky tooltip."** No — make it a dossier.
  Right rail content reads as an editorial sidebar, not chart help.

---

## Quick-start: applying this skill to a new page

Walk-through for a fresh redesign:

1. **Identify the surface type.** Reading-heavy archival (atlas,
   stories, methodology) → use PlateFrame + paper grain. Action-heavy
   (queue, profile, settings) → no PlateFrame, lean typography only.
2. **Pick one named precedent for the chart.** Don't propose a chart
   without a citation.
3. **Pick one headline mechanic.** EB Garamond italic 500 with a
   single ochre normal-weight fragment. Do not stack three accent
   colors.
4. **Choose a single dominant tone of voice in the eyebrow.** "Folio
   ·N · context" pattern. Bilingual. Mono italic 300/500.
5. **Audit the chart against the cover-the-captions test.** Iterate
   geometry until it passes.
6. **Run the five-step ship checklist.**

That's the loop.
