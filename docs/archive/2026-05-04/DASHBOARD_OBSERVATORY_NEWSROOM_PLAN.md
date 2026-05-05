# Dashboard · Observatory · Newsroom — Editorial Overhaul Plan
*Drafted May 2026 — design follow-on to the Sectors+Categories sprint (commit 5f7b426).*

The Sectors/Categories overhaul taught us a vocabulary: FT slope-with-OECD-band,
NYT/FT squarified treemap, Pudding-style risk × log(spend) beeswarm with named
circles, NYT swimlane scatter, FT Cleveland dumbbell. This document propagates
that vocabulary across the three remaining flagship surfaces — and prunes the
weakest patterns currently competing with it.

The constraint that frames every decision: **journalists must be able to walk
away with a single sentence after each surface.** Today the Dashboard, the
Observatory and the Newsroom each push 6–14 fact-points at the reader with
roughly equal weight. That is not editorial — that is a database.

Files referenced throughout:
- `frontend/src/pages/Executive.tsx` (the dashboard, 2926 LOC)
- `frontend/src/pages/Atlas.tsx` (the observatory, 1942 LOC)
- `frontend/src/pages/Journalists.tsx` (the newsroom hub, 1438 LOC)
- `frontend/src/pages/StoryNarrative.tsx` (story renderer, 1940 LOC)
- `frontend/src/lib/story-content.ts` (10 stories, 3020 LOC)
- `frontend/src/lib/atlas-stories.ts` (3 multi-chapter Atlas tours, 442 LOC)
- `frontend/src/components/sectors/*.tsx` (5 just-shipped editorial chart families)
- `frontend/src/components/stories/charts/*.tsx` (40+ chart variants — many redundant)

---

# PART A — DASHBOARD (`/`, Executive.tsx)

## A.1 Current state audit

The dashboard is 2,926 LOC and currently runs a 12-section sequence (line refs):

| § | Line | Block | Verdict |
|---|------|-------|---------|
| 0 | 1597–1666 | Header + dateline + amber-highlighted hero h1 | **Keep** — strong NYT/FT-style headline lede with v0.8.5 dateline. |
| 1 | 1668–1743 | "Observatory" mode toggle + ConcentrationConstellation (220-tall mini) | **Keep, demote** — it is the single most editorial moment on the page. But the dashboard is borrowing the Observatory's centerpiece; this should preview, not duplicate. |
| 2 | 1745–1764 | MacroArc (line 1192 onwards) — 23-yr DA-rate continuous line + admin wash bands | **Keep, upgrade** — this is the FT slope vocabulary. Current admin wash bands are too subtle (5% opacity). Needs direct-labelled OECD ceiling and one annotation per major spike. |
| 3 | 1769–1980 | "Headline Numbers" — 4 tiles with bespoke micro-vizzes | **Keep, retitle** — the four tiles are well-built but redundant with §1's constellation summary stats. They should become the *anchor*, not a follow-up. |
| 4 | 1985–2510 | "What the analysis found" — 4 finding cards (triptych animation each) | **Cut to 3** — Finding #04 (a year-over-year RiskJump card lower in the file) is filler. Three findings = three column rhythm. The triptych animations are gorgeous but every card uses the same `[number | gap-multiplier | huge-number]` triptych — they read identically by card #4. |
| 5 | 2511–2523 | PesosAtRiskChart — pattern-by-pattern stacked bars | **Keep** — this is the only chart that translates risk into pesos. But the bars are too generic; they need direct labels and one editorial annotation ("P5 alone exceeds Mexico's 2024 health-sector budget"). |
| 6 | 2525–2539 | LeadTimeChart — RUBLI vs press, dot-and-arrow | **Keep, hero candidate** — this is the platform's killer claim. Currently buried at section 6. Should rise. |
| 7 | 2542–2554 | MexicoChoropleth — stylized state grid with avg risk | **Cut** — the stylized non-geographic layout is misleading (CDMX as a square next to Tabasco? readers expect a real map) and the underlying claim ("CDMX concentrates highest risk") is the headquarters effect, which the caption admits. Either ship a real TopoJSON map or remove. Recommend remove; it adds geographic weight to a claim that doesn't deserve it. |
| 8 | 2557–2578 | TopCategoriesChart — 2-row proportional treemap | **Cut** — replaced by the just-shipped `SectorTreemap` on `/sectors`. Link to the sectors surface instead. |
| 9 | 2581–2666 | § 2 La Lente — concentric ring funnel, 3.1M → 320 | **Keep** — this is the only place readers see the platform's editorial narrowing. Visual is unique and serves a job no other surface does. |
| 10 | 2669–2845 | § 5 Historias Ejemplares — 3 vendor card dossier previews | **Keep, demote** — useful but currently drops in after a long ride. Move adjacent to Newsroom-link footer. |
| 11 | 2847+ | Recommendations 3-column grid + CaseTimeline (seismograph) + footer | **Keep CaseTimeline as last hero**, prune recommendations to one paragraph. |

### Lazy moves observed
- **Headline tile #4** ("12 sectores · 91 categorías") is decorative meta; not a finding, not actionable. Replace with a **GROUND-TRUTH** tile: "1,401 documented cases · 861 vendors confirmed."
- The 4 "finding triptychs" all share the same `[small left | gap × | huge right]` motion sequence. Visual fatigue by card #3.
- §1 (Observatory mode toggle) and §10 (CaseTimeline) are two constellation-style dot fields competing for the same eye. Pick one as the dashboard's spatial anchor.
- **MexicoChoropleth** ships a fake geographic layout — this is the kind of move FT/NYT would never make. Drop it.

## A.2 Thesis (one sentence)

> **"Twenty-three years, MX$9.9 trillion, three out of four contracts signed without a competitive bid — and the platform that found this also tells you which 320 vendors to investigate first."**

The current hero h1 already says the first half. The dashboard's job is to land
the *second half* before the reader scrolls away.

## A.3 IA — collapse from 12 sections to 6

```
§ 0   Header / hero h1                          [keep]
§ 1   THE FINDING — single sledgehammer        [NEW: hero #1]
§ 2   La Marea — 23-yr DA slope (MacroArc++)   [hero #2]
§ 3   Lead-Time Wall — RUBLI vs the press       [hero #3, promoted from §6]
§ 4   The Lens — 3.1M → 320 narrowing           [§9 + §1 constellation merged]
§ 5   Three findings + Pesos-at-Risk grid       [§4 collapsed to 3 cards beside §5]
§ 6   Read further — Newsroom + 3 dossiers      [§10 + Newsroom link, demoted]
```

This is 6 sections instead of 12. Six sections is the FT briefing rhythm.

## A.4 The 3 hero charts

### Hero #1 — `DashboardSledgehammer` (NEW)
**Inspiration:** Pudding "30 Years of American Anxieties" sledgehammer hero — one
giant annotated number on first frame, then context expands. Plus FT's
post-COVID briefing pages where one annotated number leads everything.

**Encoding:** Single full-bleed dark surface card. The number `81.9%` (or
whatever the live 2023 DA-rate is) rendered in **Playfair Italic 800** at
clamp(96px, 14vw, 180px). Two right-aligned context lines:

```
                         ┌────────────────────────────────────┐
                         │   IN 2023, MEXICO AWARDED          │
                         │                                    │
                         │     81.9%                          │  ← Playfair 800 italic, #dc2626
                         │                                    │
                         │   of federal contracts             │
                         │   without competition.             │
                         │                                    │
                         │   ─────                            │
                         │   OECD recommends ≤ 25%.           │  ← mono 11px, #22d3ee
                         │   Mexico is at 3.3× that ceiling.  │
                         └────────────────────────────────────┘
```

**Why this and not the existing Headline Numbers grid:** the grid asks the
reader to choose which of 4 numbers matters. A briefing tells the reader
which number matters.

**Tech:** No new endpoint — pull from `dashboard.overview.direct_award_rate_2023`
which `getFastDashboard()` already returns. ~80 LOC. Keep the four-tile grid
*below* this as supporting facts, demoted in size and color saturation.

### Hero #2 — `MacroArc++` (upgrade existing)
**Inspiration:** John Burn-Murdoch / FT post-COVID line charts — one strong
crimson series, all context in zinc-500, OECD ceiling as a labeled dashed
line, **annotation callouts at every major inflection point** (not vertical
ticks, callout boxes with a leader line).

**Encoding:** keep continuous line 2002→2025. Add:
- A persistent dashed `#22d3ee` (cyan) line at y=25% labeled `OECD ceiling`
- 4 callout boxes, drawn FT-style with leader lines:
  - 2014 spike → "Casa Blanca · Oceanografía"
  - 2017 spike → "Estafa Maestra surfaces"
  - 2020 peak → "COVID emergency procurement"
  - 2023 → "Highest non-emergency rate ever recorded"
- Direct labels at right edge for both the line AND the OECD ceiling
- Admin wash bands at 12% opacity (current 5% reads as noise) with the
  president's name in mono 9px at the top of each band

```
% direct award
│      [Casa Blanca]    [Estafa Maestra]    [COVID]  [highest peacetime]
│            ↓                ↓                ↓             ↓
│      ●─●─●               ●─●               ╱╲           ●─● 2023 81.9%
│  ●─●        ●─●─●─●─●─●─●     ●─●─●─●─●─●     ●─●─●
│
│                                                        Mexico ────────  82
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  OECD ≤25%  ─ ─ 25
│
│  Fox  │  Calderón  │  Peña Nieto  │  AMLO         │ Sheinbaum
└──────────────────────────────────────────────────────────────────────────
  2002    2006        2012            2018           2024  2025
```

**Why upgrade in place:** the chart already exists. We're adding annotation
density that the swipe file's "Annotations outperform minimalism" (JBM) rule
demands. Effort: 4–5 hours.

### Hero #3 — `LeadTimeWall` (promoted, redrawn)
**Inspiration:** Reuters Graphics "Forever Pollution" timeline-of-evidence
piece + the FT Visual Vocabulary "Time" lollipop pattern with reference lines.

**Current state** (Executive.tsx line 545–673): a horizontal lollipop chart of
documented cases with time-gaps. Solid but presented as a mid-page section
without the editorial framing it deserves.

**Redraw:** Make this a **before/after wall**. Two columns: left = "When
RUBLI's data crossed the critical-risk threshold" (date), right = "When the
press broke the story" (date), with a horizontal red bar between connecting
the two dates. The bar's length = lead time in months/years. Sort by lead
time descending. Add a **median lead-time annotation** at the top: "Median
RUBLI lead-time: 2.7 years before press."

```
                  RUBLI saw it           Press broke it            Lead time
Estafa Maestra    ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●         ~5.0 yrs
Segalmex          ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●                    ~3.8 yrs
HEMOSER           ●━━━━━━━━━━━━━━━━━━━━━●                                   ~1.9 yrs
Casa Blanca       ●━━━━━━━●                                                  ~0.8 yrs
                  └────── median: 2.7 years ──────┘
                  2010              2015              2020              2025
```

**Why this matters editorially:** every other surface is "look at the data."
This one is "look at the data we already had." It is the ONLY chart on the
platform that justifies the existence of the platform.

## A.5 Cut list

| Cut | Reason |
|---|---|
| MexicoChoropleth (§7) | Fake-geographic layout misleads. The "headquarters effect" caveat invalidates the headline. |
| TopCategoriesChart (§8) | Now duplicated by the canonical `SectorTreemap` on /sectors. Replace with a 1-line link card. |
| Headline Tile #4 ("12 sectors · 91 categories") | Decorative meta. Replace with a GROUND-TRUTH tile. |
| Findings card #04 (RiskJump) | Filler. Keep 3 cards, drop the 4th. |
| Recommendations 3-column grid | Move to Newsroom; the dashboard is for findings, not memos to specific audiences. |

## A.6 Phases

| Phase | Title | Effort | Notes |
|---|---|---|---|
| **d-P1** | Subtraction — drop MexicoChoropleth, TopCategoriesChart, RiskJump card #4, recs grid | 0.5d | Pure dead code; no new components. |
| **d-P2** | `DashboardSledgehammer` hero #1 (NEW component) | 0.5d | Replaces the 4-tile grid as the page anchor; the grid demotes below it. |
| **d-P3** | `MacroArc++` annotation pass (hero #2) | 1d | Add OECD ref line, 4 callout boxes, admin wash darkening, direct labels. |
| **d-P4** | `LeadTimeWall` redraw (hero #3 promotion) | 1d | Refactor LeadTimeChart into FT-style before/after columns, add median annotation, promote to §3. |
| **d-P5** | Lens/§2 + Constellation merge into one § "The Lens" | 0.5d | Eliminate the duplicate constellation/funnel cognitive load. |
| **d-P6** | Footer rebalance — 3 dossiers + Newsroom CTA + CaseTimeline | 0.5d | Demote Historias Ejemplares; keep CaseTimeline as visual cadence. |

Total: ~4 days. Net LOC change: roughly **-600** (subtraction phase) **+250**
(new sledgehammer, annotation pass) = **-350 LOC**. The dashboard gets
*shorter* and *louder*.

---

# PART B — OBSERVATORY (`/atlas`, Atlas.tsx)

## B.1 Current state audit

The Observatory is 1,942 LOC. The constellation engine is sophisticated:
1,200 dots with weighted Halton draw, four lenses (PATTERNS / SECTORS /
CATEGORIES / TERMS), year scrubber 2008–2025, autoplay loop, X-ray risk-floor
filter, vendor search across 21 curated names, pin-a-cluster, compare-years
mode, personal notes, URL state sharing, and three multi-chapter narratives
(Pharmaceutical Cartel · Estafa Maestra · COVID Year).

### What's NOT working

1. **Lens parity is a lie.** PATTERNS feels distinctive (P1–P7 attractors are
   meaningful). SECTORS works (12 sector colors). CATEGORIES is dense but
   readable. **TERMS (sexenios) is just SECTORS with different labels** — the
   underlying spatial encoding is identical. Three real lenses, one filler.
2. **Year scrubber rarely changes the picture.** Critical-risk share moves
   from 5.2% (2008) to 6.4% (2023). At 1,200 dots that's a delta of ~14 dots.
   Reader scrubs for 5 seconds and sees nothing. The scrubber needs to make
   the *spatial layout* visibly evolve, not just recolor 14 dots.
3. **Stories are walled off.** The three multi-chapter Atlas tours
   (`atlas-stories.ts`) are great but they live in a side menu that hides
   them. First-time auto-tour fires once and that's it.
4. **Cluster panel is a stub.** Click any attractor → modest drawer with a few
   stats and an "investigate" button. Compared to the just-shipped sector
   profile pages this feels under-baked.
5. **The constellation itself is sacred and stays.** This is the platform's
   most distinctive visual asset. Anything we propose must complement, not
   replace, the dot field.

## B.2 Thesis (one sentence)

> **"Every dot is one slice of the procurement universe — switch the lens to
> see the same slice rearranged into the pattern that produced it, then click
> any cluster to read its story."**

## B.3 IA + lens-system overhaul

Current 4-lens nav: PATTERNS / SECTORS / CATEGORIES / TERMS.

**Proposed 4-lens nav (drop TERMS, add two distinct vocabularies):**

| Lens | Engine | Pudding/FT analog |
|---|---|---|
| **PATTERNS** | existing constellation, P1–P7 attractors | keep |
| **SECTORS** | existing constellation, 12-color attractors | keep |
| **CATEGORIES** | existing constellation, 32-category attractors | keep |
| **MONEY** *(NEW)* | radial squarified treemap rendered IN-PLACE — same dots regroup into MXN-proportional rectangles | NYT "Federal Spending" |
| **CASES** *(NEW)* | seismograph timeline — dots fall onto a 23-year temporal axis colored by GT case anchors | Pudding "Where Slang Comes From" + Reuters timeline pieces |

To keep the lens count at four (UI-tested, mobile-friendly), **TERMS retires**
and **MONEY** + **CASES** replace it via a sub-toggle. (Or expand to a 5-pill
nav — both ship, A/B test in Phase o-P3.)

### What stays
- The constellation engine
- Year scrubber 2008–2025 (with upgrade — see B.4 #1)
- Vendor search typeahead
- Pin-a-cluster
- Compare years
- X-ray filter
- Personal notes
- URL state sharing
- 3 multi-chapter narratives

### What changes
- Stories surface — promote from side-menu to a permanent **right rail** with
  the three stories as 80px-tall mini-cards always visible (replaces the
  hidden hamburger).
- First-time auto-tour upgrade — instead of one fixed story, alternate the
  three based on viewer's `?utm_source` or random pick (logged for analytics).

## B.4 Two NEW hero "lenses"

### Lens NEW-1 — **MONEY** (squarified treemap morph)
**Inspiration:** NYT "Federal Spending" annotated treemap + Pudding "The
Anatomy of a Spotify Song" radial deconstruction. The same constellation dots
should be able to *fly into* their MXN-weighted rectangles and back.

**Encoding:** Toggle to MONEY → over 1.2s, every dot animates from its
constellation position into a tile of a squarified treemap whose rectangles
are sized by total MXN spend. Dot color preserved (sector palette). Tile
borders 1px zinc-700. Hover any tile → the constituent dots highlight.
Toggle back to CONSTELLATION → dots animate back to their attractor positions.

```
   PATTERNS lens                        MONEY lens (toggle)
   ●  ●●●        ●●●●●                  ┌──────────────┬─────────┐
     ● ●  P1       ●●  P5                │              │         │
   ●● P2 ●●     ●●●●●●●                 │  ENERGIA     │ SALUD   │
    ●●●●●●         ●●                    │  MX$2.41T    │ MX$1.86T│
     ●●●● ●●●●●●●● ●●                    ├──────┬───────┴────┬────┤
   ●●●●  P3   ● P7 ●●●                  │INFRA │ EDUCACION  │GOB │
      ●●●●●●  ●●●● ●                    ├──────┴────────────┴────┤
                                         │ TECNOLOGIA · DEFENSA · │
                                         │ HACIENDA · AGRICULTURA │
                                         └────────────────────────┘
```

**Why this and not "just show a treemap":** the morph **proves** that the
constellation and the treemap are looking at the same data. Reader's mental
model: *that pattern attractor over there represents this much money over
here.* Pudding's "Anatomy of a Spotify Song" used radial-to-linear morphing
to make exactly that point. We reuse the metaphor.

**Effort:** 2 days. Reuses the existing `SectorTreemap` rectangle-packing
math. New work is the dot-position animation. **No new endpoint** —
sector_stats already provides spend per sector.

### Lens NEW-2 — **CASES** (temporal seismograph fall)
**Inspiration:** Pudding "Where Slang Comes From" temporal swimlane + Reuters
"Forever Pollution" timeline-with-events. The constellation already has a
year scrubber that doesn't do enough; CASES makes the year axis the entire
story.

**Encoding:** Toggle to CASES → dots fall (gravity animation, 1.5s) onto a
23-year horizontal timeline 2002–2025. Y-position = risk score (criticals
high, low at floor). Vertical axis labels "Critical 0.60 / High 0.40 /
Medium 0.25". Add 8 ground-truth case anchor lines as vertical pillars at
their year (Estafa Maestra 2014, Casa Blanca 2014, Odebrecht 2016, Segalmex
2019–2022, COVID 2020, etc.) with a brief case label rotated 90°. Dots
nearest a case anchor pulse softly. Click a case anchor → opens its case
dossier in `/cases/:slug`.

```
risk
1.00 │   ●         ●      ●●        ●  ●●●         ●●          ●●●●
     │       ●         ●●     ●●       ●●  ●●        ●●●  ●●     ●●
0.60 │ ─ ─ ─●─ ─ ─ ─ ─ ●─ ─ ─ ─ ─ ─●─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─●─ ─ ─ ─
     │  ●   ●     ● ●     ●●      ●     ●●●  ●●●        ●●●
0.40 │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
     │ ●●  ●●●  ●●●●  ●●●●● ●●●● ●●●●● ●●●● ●●●●●  ●●●● ●●●● ●●●●●
0.25 │
     │            ▲          ▲             ▲          ▲      ▲
     │            │          │             │          │      │
     │           Casa     Estafa         Segalmex    COVID  HEMOSER
     │           Blanca   Maestra
0.00 └─────────────────────────────────────────────────────────────
      2002      2008       2014         2018      2020   2023  2025
```

**Why this and not the existing year scrubber:** the scrubber animates 14
dots changing color. CASES makes the *entire spatial layout* a temporal
narrative. Pudding's "Where Slang Comes From" used exactly this trick — you
could see decades come and go on the y-axis.

**Effort:** 2.5 days. Reuses the existing dot population. Anchor lines + GT
case integration is new. **Mild backend dependency:** needs `case_year` on
each ground-truth case (`ground_truth_cases.case_year` — already exists per
schema notes).

## B.5 Cut list

| Cut | Reason |
|---|---|
| TERMS lens (sexenios mode) | Spatially identical to SECTORS with different labels. Not a real lens. |
| Hidden stories hamburger menu | Stories are too valuable to hide. Promote to right rail. |
| Compare-years dual-canvas (line ~1858) | Power-user feature that adds significant cognitive cost; <2% of sessions. Cut and reclaim viewport. |

**Optional cut (debate):** the cluster-panel drawer could be replaced by an
`EntityDrawer` (the platform's existing primitive) — saves ~200 LOC and unifies UX.

## B.6 Phases

| Phase | Title | Effort | Notes |
|---|---|---|---|
| **o-P1** | Subtraction — drop TERMS lens, drop compare-years, retire hidden stories menu | 0.5d | Recovers viewport real estate. |
| **o-P2** | Right-rail Stories panel (always-visible 3 mini-cards) | 0.5d | Reuses `atlas-stories.ts` data. |
| **o-P3** | MONEY lens — constellation→treemap morph | 2d | New chart family `EditorialDotMorph`; reuses sector_stats. |
| **o-P4** | CASES lens — temporal seismograph fall | 2.5d | New chart family `EditorialTemporalFall`; needs `case_year` from GT. |
| **o-P5** | Year-scrubber upgrade — show *delta dots* (new criticals this year vs prior) | 0.5d | Pure visual upgrade; reuses existing data. |
| **o-P6** | First-visit auto-tour rotation (3 stories instead of fixed Pharma) | 0.25d | Trivial. |

Total: ~6 days.

---

# PART C — NEWSROOM (every story, all 10)

## C.1 Inventory

The Newsroom has two surfaces:
- `/journalists` — the inventory landing (file: `Journalists.tsx`, 1438 LOC)
- `/stories/:slug` — per-story narrative renderer (file: `StoryNarrative.tsx`,
  1940 LOC) backed by `lib/story-content.ts` (10 stories × 4–8 chapters each)

Stories (with chapter counts and current viz quality 1-10 — quality measured
by editorial impact, not data correctness):

| # | Slug | Headline | Ch | Quality | Diagnosis |
|---|---|---|---|---|---|
| 1 | `el-ejercito-fantasma` | The Ghost Army | 6 | **8** | Strong sledgehammer (42 vs 6,034) + dot-grid + zero-bar. The model. |
| 2 | `el-gran-precio` | Bigger Contract, Higher Risk | 6 | 6 | Three `inline-bar` configs in a row — feels like a methodology paper, not a story. Needs a Pudding-style log-scale beeswarm. |
| 3 | `el-monopolio-invisible` | The 44 Monopolists | 6 | 7 | Has a network chart (good); rest is `inline-bar`/`stacked-bar`. The 4-vendor pharma cluster deserves a dumbbell, not bars. |
| 4 | `la-ilusion-competitiva` | The Competition That Never Was | 6 | 5 | All `inline-bar` and `inline-line`. Single-bid story should use a slope chart with OECD line — exactly what we just built for /sectors. |
| 5 | `captura-institucional` | Inside Institutional Capture | 6 | 7 | Has the IMSS/CFE/PEMEX trio chart; chart vocabulary still bar-heavy. |
| 6 | `marea-de-adjudicaciones` | Direct Award Tide | 6 | 7 | Per-admin DA bars + area chart. Should adopt the dashboard's MacroArc++ verbatim — same data, ship it. |
| 7 | `el-sexenio-del-riesgo` | Riskiest Administration | 5 | 6 | Stacked bars for sexenio comparison. Slope chart would be the canonical FT move. |
| 8 | `la-industria-del-intermediario` | The Intermediary Industry | 6 | 5 | Two `inline-bar` configs back-to-back. P3 pattern is about pass-through chains — show them as a **flow diagram** (ICIJ pattern). |
| 9 | `el-umbral-de-los-300k` | The 300,000 Peso Threshold Trap | 6 | 6 | Has `inline-spike` for the histogram peaks (good!) and one `inline-bar`. Spike chart is the strongest non-Ghost-Army viz on the platform. |
| 10 | `volatilidad-el-precio-del-riesgo` | Price Volatility | 6 | **3** | **WORST.** Six chapters that read like an academic paper. Methodology > narrative. Single decent chart (`inline-diverging` for coefficients). Five-of-six chapters are pure prose. |

### Cross-story patterns observed

- **`inline-bar` overuse**: 14 instances across 10 stories. It's the
  story-content.ts equivalent of the dashboard's "headline numbers grid" —
  generic, repetitive, low-impact.
- **`vizTemplate` aliases for DataPullquote** are well-named (mass-sliver,
  compare-gap, breach-ceiling, mosaic-tile, redline-gauge, horizon, zero-bar,
  inline-spike, inline-diverging) — these are the platform's strongest
  editorial primitives. Use them more, `inline-bar` less.
- **Methodology drift**: stories 4, 7, 10 read more like model-card pages
  than investigations. The Ghost Army (1) shows what investigation-led
  storytelling looks like — borrow that structure across the methodology stories.

## C.2 Per-story diagnosis (one line each)

| Story | Editorial weakness | Fix |
|---|---|---|
| 1 Ghost Army | None — keep as the model | Keep |
| 2 El Gran Precio | Three bar charts in a row | Replace ch3 bars with a **`StoryBeeswarm`** (risk × log(spend), top-12 named) — Pudding "Audio Aesthetic" pattern |
| 3 El Monopolio Invisible | "4 vendors collected MX$326B" deserves a Cleveland dumbbell, not bars | Replace ch2 bars with **`CategoryCaptureDumbbell`** (we already shipped this!) |
| 4 La Ilusión Competitiva | Single-bid trend told via flat bar charts | Replace ch1 bars with a **slope chart** (FT pattern, just shipped as `CompetitionSlopeChart`) |
| 5 Captura Institucional | Bar-heavy mid-chapters | Replace ch4 bar with **swimlane scatter** (`CategorySectorSwimlane` analog — institution × pattern) |
| 6 Marea | Nearly canon — but ch3 is plain bars | Drop in `MacroArc++` directly |
| 7 Sexenio del Riesgo | Five admin stacked bars | Slope chart admin-1 vs admin-5 with sector lines, zinc except the worst-getting-worse |
| 8 Intermediario | P3 pass-through volumes shown as plain bars | Replace ch3 with a **flow diagram** (ICIJ pattern) — institution → intermediary → final vendor |
| 9 El Umbral de 300k | Spike chart in ch2 is great; rest is solid | Light touches only |
| 10 Volatilidad | Six chapters of math; one `inline-diverging` | **Full redesign** (see C.4) |

## C.3 Cross-story patterns to adopt

1. **Sledgehammer chapter 1.** Every story opens with one giant Playfair
   number ≥ 96px. Currently 6 of 10 do this (Ghost Army has 42 vs 6,034 done
   right). Audit and fix the other 4 (Volatilidad, Sexenio, Captura,
   Intermediario).

2. **Promote sector chart components into the stories pipeline.** The five
   components in `frontend/src/components/sectors/` (Treemap, SlopeChart,
   Beeswarm, Swimlane, Dumbbell) should be importable from any chapter via
   the existing `chartConfig.type` switch. Add five new types:
   - `editorial-slope` → CompetitionSlopeChart
   - `editorial-treemap` → SectorTreemap
   - `editorial-beeswarm` → RiskSpendBeeswarm
   - `editorial-swimlane` → CategorySectorSwimlane
   - `editorial-dumbbell` → CategoryCaptureDumbbell

3. **Drop `inline-bar` from any chapter where the data deserves a slope or
   beeswarm.** Inline-bar should only survive when the data is genuinely
   2–4 categories of one metric (e.g., "P2 vs SAT-confirmed P2"). For 8+
   categories with continuous metrics, slope/beeswarm wins every time.

4. **Adopt the kicker-stat trio pattern from Ghost Army (`kickerStats[]`).**
   Six stories don't have one. The trio (`SAT confirmed 42` / `RUBLI flagged
   6,034` / `5,992 still doing business`) is the most quoted hero in the
   platform.

5. **Direct labels on every line chart (JBM rule).** Currently mixed; some
   stories still use Recharts legends.

## C.4 The Worst Story — `volatilidad-el-precio-del-riesgo` full redesign

**One-line diagnosis:** the story is a model-card with chapter breaks. It
explains WHY price volatility predicts corruption but never shows it
happening. Five of six chapters are pure prose; the lone chart is a
coefficient bar chart that any reader will scroll past.

**Redesign idea (one sentence):**
> Make this the platform's *forensic* story — chapter by chapter, walk through
> ONE specific vendor's contract history, with the algorithm's view layered
> over the human view, until "price volatility" stops being a coefficient and
> becomes a vendor's signature.

### New chapter map

| Ch | New title | New visualization | Inspiration |
|---|---|---|---|
| 1 | "The Smoking Gun" — sledgehammer | `kickerStats` trio: `Of 16 risk features / 1 / outranked all the others by 43%` + a Pudding-style beeswarm of 16 coefficient circles, with `price_volatility` named and crimson, the rest gray and unlabeled (FT minimize-distraction-maximize-contrast). | Pudding "Spotify Audio Aesthetic" |
| 2 | "Inside One Vendor" | **NEW chart `VendorPriceTrajectory`**: a single vendor's contract history rendered as a time-series of dots — x = signing date, y = MXN unit price (log scale), dot size = total contract value. One outlier contract ringed with a callout box: "MX$27M — same goods as MX$3M four months earlier." | Pudding "30 Years of American Anxieties" |
| 3 | "Why Price Walks With Risk" | Re-render existing `inline-diverging` as `editorial-coefficient-ladder` — same data, FT divergent-bar treatment with reference axis at 0, regularized-to-zero features shown as ghost rows beneath the main ladder (proves the model rejected them). | FT "Deviation" vocabulary |
| 4 | "Two Algorithms Agree" — convergence | NEW chart: a Venn-style overlap visualization. Two circles (supervised model · unsupervised IForest). Overlap shows the convergent contracts. Over the overlap region: "The same 4,200 contracts both algorithms flag as anomalous." | Pudding "Trolley Problem" |
| 5 | "Three Vendor Signatures" | Small-multiples 3×1 grid: three vendors' price-trajectory beeswarms side-by-side (one ghost-pattern, one capture-pattern, one legitimate). Headline: "Same axis, three signatures." | FT/Economist 12-panel pattern |
| 6 | "What to do with this" | Keep prose-only investigation path. No chart. |

**Effort:** 4–5 days (2 net-new chart components + reuse of existing
beeswarm + 1 redesigned diverging chart). Net page LOC roughly +200.

## C.5 Light-touch upgrades for the rest

| Story | 1–3 line punch list |
|---|---|
| 1 Ghost Army | (a) Add `editorial-treemap` ch3 sized by P2 vendor MXN-value, color by sector — replaces the "Signature of Nothing" prose-only chapter. |
| 2 El Gran Precio | (a) Replace ch3 inline-bar with `editorial-beeswarm` (risk × log(amount), top-50 named). (b) Promote ch1 stat to kickerStats trio. |
| 3 Monopolio Invisible | (a) Replace ch2 inline-bar with `editorial-dumbbell` (#1 vs #2 vendor share by category). (b) Add direct labels on ch5 network chart. |
| 4 Ilusión Competitiva | (a) Replace ch1 inline-line with `editorial-slope` 2010→2024 with OECD ceiling. (b) Add kickerStats trio: `Competitive procedures / 49.4% / had a single bidder.` |
| 5 Captura Institucional | (a) Replace ch4 bar with institution×pattern swimlane. (b) Add kickerStats trio. |
| 6 Marea | (a) Drop in `MacroArc++` for ch2. (b) Add OECD ceiling label and 4 callouts (matches dashboard hero #2 — same data, same chart, free reuse). |
| 7 Sexenio del Riesgo | (a) Replace ch3 stacked bars with `editorial-slope` Calderón→AMLO across 12 sectors, only the rising lines colored. |
| 8 Intermediario | (a) NEW `editorial-flow` chart for ch3 (ICIJ pattern, institution → intermediary → final). |
| 9 Umbral de 300k | (a) Add direct labels on ch2 spike chart. (b) Add kickerStats trio. |

## C.6 Newsroom landing (`/journalists`)

The landing page (Journalists.tsx, 1438 LOC) is a card grid of investigations
with status filters. It's competent but generic. Quick punch list:

1. **Open with the sector-treemap morphology.** Top-of-page hero: a
   `SectorTreemap` of all 10 stories sized by reach, colored by sector — same
   visual rhythm as the rest of the platform.
2. **Status filter badges** are good; add a **PATTERN** filter (P1–P7) to
   match the Newsroom-Observatory bridge.
3. **Add cross-surface CTAs** in each card: "Explore the data behind this →
   /atlas?lens=patterns&pin=P5".

## C.7 Phases

| Phase | Title | Effort | Notes |
|---|---|---|---|
| **n-P1** | Promote 5 sector chart components to story pipeline | 1d | Add `editorial-slope` / `editorial-treemap` / `editorial-beeswarm` / `editorial-swimlane` / `editorial-dumbbell` to the chartConfig switch in StoryNarrative. No new visuals. |
| **n-P2** | Light-touch sweep stories 2,3,4,5,6,7,8,9 (one chart swap each) | 2.5d | Pure data-shape changes in story-content.ts. |
| **n-P3** | Volatilidad full redesign (the worst story) | 4d | Two net-new chart components (VendorPriceTrajectory, VennConvergence). |
| **n-P4** | KickerStats trio audit — add to stories 4,5,7,9 | 0.5d | Pure copy work in story-content.ts. |
| **n-P5** | Newsroom landing — sector-treemap hero + pattern filter | 1d | Reuses SectorTreemap. |

Total: ~9 days.

---

# PART D — CROSS-CUTTING

## D.1 New chart primitives to extract into a shared lib

Right now the five just-shipped sector charts live in `frontend/src/components/sectors/`. They want to be reused on stories, dashboard, observatory.

Extract to `frontend/src/components/charts/editorial/` (which already exists for some primitives):

| New module | Source | Used by |
|---|---|---|
| `EditorialBeeswarm` | sectors/RiskSpendBeeswarm | Dashboard headline-numbers tile · Observatory MONEY lens · Story 2,10 |
| `EditorialSlopeChart` | sectors/CompetitionSlopeChart | Dashboard MacroArc++ · Story 4,6,7 |
| `EditorialTreemap` | sectors/SectorTreemap | Dashboard footer · Newsroom hero · Atlas MONEY lens · Story 1 |
| `EditorialSwimlane` | sectors/CategorySectorSwimlane | Story 5 |
| `EditorialDumbbell` | sectors/CategoryCaptureDumbbell | Story 3 |
| `EditorialDotMorph` | NEW — for Atlas MONEY lens | Atlas only |
| `EditorialTemporalFall` | NEW — for Atlas CASES lens | Atlas only |
| `EditorialVendorTrajectory` | NEW — for Volatilidad ch2 | Story 10 + reusable |

A consistent props contract:
- `data` (typed)
- `highlight?: { id: string; label: string }` (FT minimize-distraction rule)
- `referenceLine?: { value: number; label: string; color?: string }` (OECD/sector avg)
- `lang: 'en' | 'es'` (i18n)
- `compact?: boolean` (for inline-story vs full-page rendering)

## D.2 Editorial copy patterns to normalize

1. **§ kicker format** — locked to `§ N · Spanish title — English title fallback`. Already in use.
2. **Dateline** — locked to `RUBLI · DATA: COMPRANET 2002–2025 · UPDATED <month> <year> · MODEL v0.8.5`. Already in use.
3. **OECD reference clause** — every direct-award stat gets the suffix `· OECD recommends ≤25%` or `· 3.3× OECD ceiling`. Currently inconsistent.
4. **Honest pitch matrix discipline** — never quote "$2.84T fraud" without the GT-link disclaimer. Audit story-content.ts for unqualified claims.
5. **Spanish currency** — `localizeAmount()` already handles this. Audit any new component that hard-codes `$X B MXN`.
6. **Risk model version** — every methodology mention is `v0.8.5` (the active model), NOT `v0.6.5` even though the volatilidad story still says v0.6.5. **Audit and fix.**

## D.3 Anti-pattern punch list (NEVER ship these again)

1. **Generic `inline-bar` for 8+ categories of continuous data.** Use slope or beeswarm.
2. **Recharts `<Legend>` separated from the chart.** Direct labels on the data.
3. **Stacked bars where dumbbells would work.** Two-vendor comparisons especially.
4. **Hex strings as Tailwind class fragments** — `cn(..., '#dc2626')` strips silently. Always `style={{ color: hex }}`.
5. **Fake-geographic state grids.** Either ship a real TopoJSON or skip the map.
6. **Stories without a sledgehammer chapter 1.** No exceptions.
7. **Cluster panels / drawers reimplemented per surface.** Reuse `EntityDrawer`.
8. **Green for low risk** — already lint-gated, but watch for it in new components.
9. **Plain `<Link to={`/vendors/${id}`}>`** — must use `<EntityIdentityChip>`.
10. **"$2.84T fraud" / "1,843 LLM memos" / "1,380 cases"** without the honest-pitch-matrix disclaimer.

---

# PART E — Implementation backlog (ordered)

Ranked by user-visible impact ÷ effort. The user executes in this order.

| # | Phase | Surface | Title | Days | Depends |
|---|---|---|---|---|---|
| 1 | **d-P2** | Dashboard | DashboardSledgehammer hero #1 (NEW) | 0.5 | — |
| 2 | **d-P3** | Dashboard | MacroArc++ — OECD ref line + 4 annotations + admin band darkening | 1 | — |
| 3 | **d-P1** | Dashboard | Subtraction — drop choropleth, top-categories, RiskJump card, recs | 0.5 | — |
| 4 | **n-P1** | Newsroom | Promote 5 sector chart components into story pipeline | 1 | sectors components shipped (done) |
| 5 | **d-P4** | Dashboard | LeadTimeWall — promote + redraw as before/after columns | 1 | — |
| 6 | **n-P2** | Newsroom | Light-touch sweep — 8 stories, one chart swap each | 2.5 | #4 |
| 7 | **o-P1** | Observatory | Subtraction — drop TERMS lens, compare-years, hidden stories menu | 0.5 | — |
| 8 | **o-P2** | Observatory | Right-rail Stories panel (always visible) | 0.5 | #7 |
| 9 | **n-P4** | Newsroom | KickerStats trio audit — stories 4,5,7,9 | 0.5 | — |
| 10 | **d-P5** | Dashboard | Lens/§2 + Constellation merge (single "The Lens" section) | 0.5 | — |
| 11 | **o-P3** | Observatory | MONEY lens — constellation→treemap morph (NEW component) | 2 | #4 |
| 12 | **n-P5** | Newsroom | Newsroom landing — sector-treemap hero + pattern filter | 1 | #4 |
| 13 | **o-P4** | Observatory | CASES lens — temporal seismograph fall (NEW component) | 2.5 | **BLOCKER:** verify `ground_truth_cases.case_year` is populated |
| 14 | **n-P3** | Newsroom | Volatilidad full redesign (worst story) | 4 | #4 |
| 15 | **d-P6** | Dashboard | Footer rebalance — 3 dossiers + Newsroom CTA + CaseTimeline | 0.5 | — |
| 16 | **o-P5** | Observatory | Year-scrubber upgrade — show *delta dots* (new criticals this year) | 0.5 | — |
| 17 | **o-P6** | Observatory | First-visit auto-tour rotation (3 stories instead of fixed) | 0.25 | — |

**Total: ~19 days of single-developer work.**

## Backend dependencies / BLOCKER tags

- **#13 (CASES lens):** needs `ground_truth_cases.case_year` to be reliable.
  Per memory, GT corpus has 1,401 cases; `case_year` exists per the Mar 19
  bug-fix note, but the temporal seismograph needs ≥80% non-null coverage.
  Verify before scoping.
- **No other items require new endpoints.** All proposed work uses existing
  `getFastDashboard`, `sector_stats`, `category_stats`, `aria_queue`, and
  the `atlas-stories.ts` / `story-content.ts` static data files.

## Tokens / lint
Every chart component must pass `npm run lint:tokens`. Use:
- `SECTOR_COLORS` for sector identity (12-color palette from constants.ts)
- `SECTOR_TEXT_COLORS` for sector text fills (just shipped — never reuse SECTOR_COLORS hex as text)
- `getRiskLevelFromScore` for risk thresholds (0.60 / 0.40 / 0.25)
- `RISK_COLORS` for risk-tier coloring (no green for low)
- `formatCompactMXN` for any peso amount; `localizeAmount` for legacy strings
- `<EntityIdentityChip>` for any entity reference outside its own dossier

---

*— end of plan —*
