# RUBLI — Website Structure, Density & Consistency Standards

> The **structural** layer the `rubli-folio-aesthetic` skill does not cover.
> The skill owns TYPOGRAPHY, COLOUR, and VOICE (read it first:
> `.claude/skills/rubli-folio-aesthetic/SKILL.md`). This document owns
> SURFACE CLASSIFICATION, DENSITY, LAYOUT GRID, and CROSS-PAGE CONSISTENCY.
> Where the two overlap, the skill wins on colour/type; this doc wins on
> structure/density.
>
> **Authority:** derived from the 2026-06-03 six-surface Opus audit + the
> `/vendors/:id` operational rebuild (commit `05a05551`). Density numbers are
> calibrated from live measurements, not invented. The rebuild that seeded these
> standards graded **Satisfactorio (81/100)** — strong on IA/genre (91) and code
> (93), weaker on redundancy (68) and accessibility (66); those weak spots are
> exactly what §3.5, §4 and the §6 a11y checklist exist to stop recurring.

---

## 1. Surface Taxonomy

Every user-facing surface is exactly one of three types. **Classify before you
design** — the type dictates density, chrome, and layout.

### The decision rule (from the folio skill, made structural here)

> **Does the surface invite CONTEMPLATION or ACTION?**
> - **CONTEMPLATION** (read it, absorb an argument, be persuaded) →
>   **contemplative**: editorial framing, PlateFrame, paper-grain, magazine
>   widths, generous rhythm.
> - **ACTION** (triage it, decide, drill in, compare) → **operational**:
>   dense, full-width, tight left-aligned § headers, no decorative chrome.
> - **MANIPULATION** (a live canvas the user drives — pan/zoom/scrub/filter) →
>   **interactive**: fixed-viewport, fill-the-frame, chrome compressed to the
>   edges so the canvas dominates.

A surface that *masquerades* (a triage page wearing a story's chapters, or a
dashboard wearing a SaaS card grid) is the single most expensive structural
defect — it was the entire `/vendors/:id` rebuild and is the open
`/institutions/:id` debt.

### Route classification (canonical)

| Type | Routes |
|---|---|
| **operational** | `/vendors/:id`, `/institutions/:id`, `/aria`, `/cases`, `/relationships`, institution ranking, `/me`, any queue/table/profile |
| **contemplative** | `/dashboard` (executive briefing), `/atlas`, `/stories/:slug`, `/thread/:vendorId`, `/newsroom`, `/methodology`, `/administrations` |
| **interactive** | `/` (The Spoils canvas), `/atlas` constellation (the canvas *within* a contemplative shell), any map/treemap/scrubber-driven surface |
| **hybrid (declare the spine)** | `/sectors` (operational index + a 1–3-chart contemplative hero spine). Pick a primary; keep the editorial spine to ONE hero, not three stacked. |

**Rule:** profiles, queues, dashboards-of-record, and rankings are
**operational** even when the route name says "dashboard." The executive
briefing at `/dashboard` is the deliberate exception (it is a *persuasion*
surface read in 90s, hence contemplative) — but it must still obey the
contemplative *length* ceiling (§2).

---

## 2. Density Budget

Calibrated from live measurements (chars of rendered text per 1000px of page
height; screens at a 900px viewport):

| Live measurement | Density | Screens | Read |
|---|---|---|---|
| The Spoils `/` (interactive, fixed canvas) | 2259 | 0.9 | correct extreme for a canvas |
| Vendor dossier NEW `/vendors/:id` | 1708 | 8.4 | **in-band exemplar** |
| Dashboard `/dashboard` | 1697 | 9.3 | in-band density, length at ceiling |
| Sectors `/sectors` | 1464 | 4.1 | slightly airy |
| Vendor dossier OLD (pre-rebuild) | 1084 | 19.8 | **the airy anti-pattern** |

### Targets

| Surface type | Target density (chars/Kpx) | Max screens | Floor (below = airy) |
|---|---|---|---|
| **operational** | **1500–1900** | **≤ 10** | < 1300 reads as low-information |
| **contemplative** | **1200–1700** | **≤ 12** (briefing ≤ 10) | story prose may run lower; redundancy ≠ density |
| **interactive** | N/A — fit ~1 viewport | ~1 (no scroll) | chars/Kpx does NOT apply; the canvas is the information |

### Density rules

- **The chars/Kpx heuristic measures TEXT, not signal.** An interactive
  canvas (treemap area-encoded by spend) is information-dense at low text
  density — do **not** densify it with prose. The Spoils' 2259 *validates*
  its design; it is not an indictment.
- **Airiness is usually redundancy, not whitespace.** The old vendor dossier
  hit 1084 not from big margins but from saying everything twice (chapters +
  tabs). Fix airiness by *subtracting duplicate content*, then by tightening
  rhythm — in that order.
- **Length ceiling is independent of density.** A page can be in-band on
  chars/Kpx and still fail by running 9–10 screens of the same argument told
  three ways (current `/dashboard`). Count distinct *arguments*, not just
  pixels.
- **Low-data surfaces must not collapse to air.** An operational page for a
  sparse entity (Structure-A 2002–2010 vendor: null SHAP, no peers, empty
  institution list) must still read dense — gate `space-y-*` down or collapse
  empty-panel gaps so it doesn't measure < 1300.

---

## 3. Canonical Patterns (operational surfaces)

These are the structural primitives the `/vendors/:id` rebuild established.
A new operational dossier (vendor, institution, sector, case) **must** use them.

### 3.1 The Command Panel (above-the-fold triage instrument)

The decisive payload lands **before the first scroll**. Two stacked reads:

1. **Stat strip** — the decisive numbers in ONE aligned readout row.
   - Real CSS grid: `gridTemplateColumns: repeat(N, minmax(0, 1fr))`
     (`minmax(0,…)` prevents overflow blowout — never plain `1fr`).
   - Per-cell left hairline (`borderLeft`, `i===0 ? 'none'`); shared baselines
     (label `marginBottom`, value, sub `marginTop` identical across cells).
   - Numbers: EB Garamond italic 600 `tabular-nums` `clamp(18px,2vw,24px)`.
   - **Must wrap below `sm`** (≥6 cells) — switch to `grid-cols-2/3` or give
     wide cells `gridColumn: span 2`. (Current `VendorStatStrip` does NOT wrap
     — open bug.)
   - Reference: `VendorCommandPanel.tsx › VendorStatStrip`.

2. **2×2 diagnostic grid** — `grid gap-4 md:grid-cols-2`, four compact panels
   answering the four questions that qualify or kill a lead:
   *why flagged* (top-4 SHAP, demoted summary) · *benchmark deviation vs OECD*
   · *where the money goes* (top-4 clients) · *the metric's shape over time*.
   - Panels are **demoted summaries**, never full copies (see §3.5).
   - Reference: `VendorCommandPanel.tsx › VendorDiagnosticGrid`.

The institution/sector/case dossiers each need an analogous
`<Entity>CommandPanel`. Build them by analogy, not from scratch.

### 3.2 § Section Headers (`DossierSectionHeader`)

Replaces centered `py-12` section plates. One `flex items-baseline
justify-between … pb-2 mb-5` row: mono "§ EVIDENCE" eyebrow (sector accent,
700, 0.18em) + EB Garamond italic 500 title + sector-tinted bottom rule
(`${accent}33`) + mono tabular `meta` that does triage work
(`"412 contracts"`, `"SHAP · peers · signals"`).
- Full-width, left-aligned. **Never** centered, **never** `mx-auto`,
  **never** a Roman-numeral magazine-cover heading on an operational page.
- Titles must **wrap, not `truncate`** (an ellipsized EB Garamond italic
  title reads as a broken UI label). Keep `meta` `flex-shrink-0`.
- Reference: `VendorDossier.tsx › DossierSectionHeader`.

### 3.3 EntityIdentityChip — the only entity render path

`<EntityIdentityChip type=… id=… name=…>` is the **only** way to render an
entity outside its own dossier. Raw `<Link to={`/vendors/${id}`}>{name}</Link>`
and `navigate('/vendors/…')` on a row are **forbidden** (Hard Rule #1).
- Carries focus-visible ring, risk-tier `aria-label`, name formatting for free.
- `/institutions/:id` currently violates this on supplier rows
  (`InstitutionChapterSuppliers.tsx:143`) — fix on rework.

### 3.4 Bar / threshold primitives

- Inline single metric (one value, one bar) → `DotBar` / `DotBarRow`.
- Ranked multi-row → `DotStrip` (`@/components/charts/editorial`).
- **Threshold-vs-actual / "did we beat the OECD limit?"** → the FT-bullet
  `BenchmarkRow` family. The command panel's OECD panel currently hand-rolls
  this geometry; that is tolerated **only** because `BenchmarkRow` still
  carries stale dark-theme inline hex (`#27272a/#3f3f46/#c41e3a`). **Fix the
  primitive (token-ize it), then converge** — don't keep multiplying bespoke
  deviation bars.
- **Never inline `<circle>`/`<div>`-width dot strips in a page.**

### 3.5 No-duplicate-summary-and-detail (the scent rule)

A fact appears **at most twice** on one page, and only as
**summary → escalating detail**:
- ✓ Grid "why flagged" top-4 SHAP → Evidence tab full SHAP list. *(4 → all)*
- ✓ Grid "where money goes" top-4 → Activity tab top-10 + capture pill.
- ✗ The **same** OECD deviation in 4–5 geometries with no escalation between
  them (current bug across grid + BenchmarkBars + DeviationLedger + El Dinero).
- ✗ The waterfall **and** a ranked-bar of the *same* φᵢ contributions
  back-to-back.
- ✗ The hero lede reciting the five numbers the stat strip tabulates directly
  below. **The lede names the single strongest finding qualitatively; the
  strip carries the numbers.** (`buildVendorLede` docstring says this — follow
  it fully.)

**Test:** scrolling the page, do you ever think *"didn't I just read this?"*
If yes, one of the two surfaces is redundant — keep the richer one, delete the
other (or demote it to a different tab).

---

## 4. Alignment & Grid Standard

- **One content column per surface.** Operational dossiers run a single
  `max-w-6xl mx-auto`, sections full-width inside it. **No width whiplash** —
  the `/institutions/:id` 6xl→4xl→3xl→2xl nesting (shell → chapter → content →
  list) is banned; it reads as a magazine island, not a dossier.
- **Left-align operational headers and readouts.** Centered `text-center` /
  `justify-center` headings, Roman-numeral cover slugs, and `mx-auto` content
  rows belong only to contemplative surfaces.
- **Stat readouts are grids, not flex approximations.** Shared baselines;
  values right-aligned within their cell only if the whole column is numeric.
- **Score sits with the name.** The hero headline row pins the verdict
  seal in an `auto` column beside the `minmax(0,1fr)` name column — never a
  free-floating seal 8 screens from the identity.
- **Full-bleed means full-bleed.** If an element claims to bleed past the
  container (sector rail, masthead plate), it must *actually* span — use
  `mx-[calc(50%-50vw)]` or a **defined** `--container-pad`. A
  `var(--container-pad, 0px)` with no definition silently does nothing
  (current `VendorHero` rail bug).
- **Vertical rhythm is deliberate and consistent** (e.g. hero → `mt-6` strip →
  `mt-7` grid → `mt-14 space-y-14` body → `mt-16` footer). Uniform `mb-12`
  between 11 ungrouped sections reads as a list, not a document — **group into
  3–4 movements** with a heavier rule between movements.

---

## 5. Anti-patterns Catalog

Each of these was found live in the 2026-06 audit. Reviewers must reject them.

| # | Anti-pattern | Where found | Why it's wrong |
|---|---|---|---|
| A1 | **Story chapters on an operational page** (full-viewport `ChapterShell`, `ChapterDivider`, Roman-numeral `ChapterHeading`) | `/institutions/:id` (open); old `/vendors/:id` (fixed) | Genre miscategorization; duplicates the reference body; tanks density to ~1084 |
| A2 | **Redundant summary + detail with no escalation** | OECD deviation ×5, SHAP ×3 on `/vendors/:id` | Destroys information scent ("didn't I just read this?") |
| A3 | **Centered `py-12`/`py-20` section plates + `mx-auto` narrow columns** | institution chapters | Magazine framing on a triage surface; width whiplash |
| A4 | **Label-left / value-far-right canyon** in stat rows | (guard against) | Eye must traverse dead space; use aligned grid cells with hairlines |
| A5 | **Green for low/safe/compliant** | `/dashboard:754` `stroke="#10b981"` OECD ceiling | Bible §3.10 — a procurement model cannot certify integrity |
| A6 | **Inline hex risk palette in a page** | `/dashboard` `#dc2626` (≠ canonical `#ef4444`); `/atlas` slider | Diverges from `RISK_COLORS`; produces same-page palette mismatch; evades lint only via `style`/SVG attrs |
| A7 | **Same threshold retyped per section** (no constant) | OECD 25% vs 30% on `/vendors/:id` | Manufactures contradictions; undermines prosecutorial credibility |
| A8 | **Pure-white panels on the warm page** | `var(--color-background-card)=#fff` diagnostic panels | Reads "SaaS card," not "inked plate" (skill §171) |
| A9 | **Lede recites the dashboard** | `buildVendorLede` | First 1.5 screens state one dataset three ways (prose→strip→grid) |
| A10 | **Stale nav pointing at deleted sections** | `TOC_ANCHORS` I–VI on `VendorHero` | Latent broken-jump-link landmine; dead scaffolding |
| A11 | **English-only money in a bilingual surface** | `Sectors.formatSpend()` (12 sites) | Mexican convention: `MDP`/`billones`, never English-loaned `B MXN` in ES |
| A12 | **Declared-but-unloaded font** | `Source Serif Pro` (10+ components, 0 `@font-face`) | Silent fallback collapses the intended two-serif register to one |
| A13 | **Playfair for new headlines/body** where EB Garamond is preferred | Spoils/Sectors heros; Atlas story body | Playfair is the *legacy* big-number face (skill §92) |
| A14 | **Non-responsive fixed-column readout** | 7-cell `VendorStatStrip`, no `sm` wrap | Ellipsizes/clips data on tablet/phone |

---

## 6. Per-surface redesign checklist

A surface redesign is not "done" until it passes the checklist **for its type**.

### Universal (all surfaces)
- [ ] Surface type declared (operational / contemplative / interactive) and chrome matches §1.
- [ ] No green anywhere for low/safe/compliant (incl. SVG `stroke`/`fill`).
- [ ] Zero inline risk hex — all from `RISK_COLORS`/`SECTOR_COLORS`/`var(--color-*)`. (Grep the file for `#dc2626|#f87171|#ef4444|#10b981|#f59e0b`.)
- [ ] All thresholds from `@/lib/constants` — no per-section numeric ladders. (OECD limits live in `OECD_DIRECT_AWARD_LIMIT`/`OECD_SINGLE_BID_LIMIT`.)
- [ ] Every entity rendered via `<EntityIdentityChip>` — no raw `<Link>`/`navigate` on rows.
- [ ] Headline/lede font is EB Garamond italic (not Source Serif Pro, not Playfair, not Inter). Verify the family is in `index.html`.
- [ ] Bilingual: every visible string + every money value is `es`/`en` (run `rubli-bilingual-audit`); money via locale-aware `formatCompactMXN`, not a hand-rolled English formatter.
- [ ] Risk copy is "indicador de riesgo / risk indicator" — never "% probability of corruption".
- [ ] No stale nav/anchors pointing at removed sections.

### Operational additionally
- [ ] Decisive verdict + decisive numbers + why-flagged + top benchmark deviation **above the fold** (command panel pattern §3.1).
- [ ] Density **1500–1900 chars/Kpx**, **≤10 screens** — measured, including on a *low-data* entity.
- [ ] No fact rendered >2× (summary → escalating detail only); lede names the strongest finding, doesn't recite the strip (§3.5).
- [ ] § section headers (§3.2): left-aligned, full-width, wrap-not-truncate.
- [ ] Single content column (`max-w-6xl`), no width whiplash, no centered plates.
- [ ] Stat readouts are real grids with shared baselines; readout wraps below `sm`.
- [ ] No PlateFrame, no paper-grain (those are contemplative-only).
- [ ] A11y: risk severity has a **non-colour** channel (text tag / border / icon); coloured numbers meet AA (4.5:1 normal, 3:1 only if ≥24px or ≥700 weight); stat block has a landmark/heading; truncated labels carry `title`.

### Contemplative additionally
- [ ] PlateFrame + paper-grain present (the editorial signature); folio index/eyebrow rendered (don't suppress it via `minimal` without a conscious reason).
- [ ] ≤12 screens (briefing ≤10); counts distinct *arguments*, doesn't tell one arc three times.
- [ ] Big numbers in EB Garamond italic (Playfair only for sanctioned legacy sledgehammers); colour via `style={{color: hex}}`, never a hex-as-className (silently stripped).

### Interactive additionally
- [ ] Fits ~1 viewport (`calc(100vh - chrome)`); no page scroll; canvas fills the frame.
- [ ] Chrome (masthead/toolbar) compressed to the edges; do **not** densify with prose — the canvas IS the information; chars/Kpx target does not apply.
- [ ] Smallest cells/elements retain a minimal readable payload (don't degrade to anonymous colour blocks) and a click target floor.

---

## 7. Lint backlog (make the standard enforceable)

The token linter (`frontend/scripts/lint-tokens.mjs`) currently misses several
of these because they hide in `style={{}}` objects and SVG attributes. Extend it:
- Scan SVG `stroke`/`fill` attribute values for green (`#10b981`, `#34d399`,
  `emerald`) and raw risk hex.
- Flag declared `font-family: "Source Serif Pro"` while it is absent from
  `index.html` (or load the font).
- Flag `var(--…, …)` consumers whose custom property has no definition anywhere
  (catches the `--container-pad` non-bleed class of bug).
- (Stretch) flag hard-coded OECD/threshold numerals (`/ 25`, `/ 30`, `> 11`)
  outside `lib/constants`.

---

## Appendix A — Page conformance snapshot (2026-06-03 audit)

| Page | Route | Surface type | Density (chars/Kpx · screens) | Density verdict | Worst inconsistency |
|---|---|---|---|---|---|
| The Spoils | `/` | **interactive** ✓ honored | 2259 · 0.9 (fixed canvas) | Good (cramped by design) | S-tier cells drop their descriptive tag → anonymous colour blocks (`ExploreCanvas.tsx:1180`) |
| Dashboard | `/dashboard` | **contemplative** ✓ honored | 1697 · 9.3 | Good per-screen, **too long** | **Green-for-safe** OECD ceiling line `stroke="#10b981"` (`Executive.tsx:754`) — Bible §3.10 breach |
| Sectors | `/sectors` | operational + editorial spine ✓ | 1464 · 4.1 | Slightly airy | Money **English-only**: `formatSpend()` has no ES branch, 12 call sites (`Sectors.tsx:43`) |
| Vendor dossier | `/vendors/:id` | **operational** ✓ honored | 1708 · 7.4 | Good (in-band) | OECD 25/30 contradiction — **RESOLVED** (centralized `OECD_*` constants, 2026-06-03) |
| Atlas / Observatory | `/atlas` | **contemplative** ✓ honored | — · ~1 viewport | Good (airy by design) | PlateFrame `minimal` suppresses the lens-aware folio index (`Atlas.tsx:2529`) |
| Institution dossier | `/institutions/:id` | **operational** ✓ honored | — · 3.9 | Good (**rebuilt 2026-06-03**) | — `InstitutionCommandPanel` (stat strip + 2×2 grid) + supplier table |
| Category dossier | `/categories/:id` | **operational** ✓ honored | — · 1.8 | Good (**rebuilt 2026-06-03**) | HHI-scale + flat-`trends` data-shape bugs fixed in preview verification |
| Sector dossier | `/sectors/:id` | **operational** ✓ honored | — · 4.4 | Good (**rebuilt 2026-06-03**) | backend `statistics.total_institutions = 0` (frontend-guarded; backend fix pending) |

**The operational rebuild has now propagated across all four core dossiers**
(vendor → institution → category → sector). Each shares the same masthead grammar:
tightened hero (`showTOC=false`, no rail bleed, verdict 46px) → `*StatStrip`
(`repeat(auto-fit, minmax(116px, 1fr))`) → `*DiagnosticGrid` (2×2: a distinctive
signal · OECD deviation · top entities · risk over time) → full-width entity table
(`EntityIdentityChip`) → `ProvenanceFooter`. The per-entity distinctive signal varies:
institution/sector = risk-band distribution, category = market concentration (HHI).
The four `*CommandPanel.tsx` files are ~70% structurally identical — **converging them
into shared `dossier/command/` primitives is the next highest-value refactor** (P2),
but each was shipped standalone to keep blast radius zero.

---

## Appendix B — Prioritized backlog (bring the site to standard)

| # | Page / target | Priority | Rough scope |
|---|---|---|---|
| ~~1~~ | ~~`/institutions/:id` operational rebuild~~ | ✅ **DONE** 2026-06-03 | `InstitutionCommandPanel` (stat strip + 2×2 grid) + tightened hero + supplier table; dead chapters removed (commit 73f49e5a). **`/categories/:id` and `/sectors/:id` rebuilt the same day** (b1a88452 / 89584262) — all four core dossiers now operational. |
| ~~2~~ | ~~`/vendors/:id` finish~~ | ✅ **DONE** 2026-06-03 | OECD 25/30 contradiction fixed via centralized `OECD_*` constants (3 sources); SHAP/OECD redundancy collapsed; AA risk colours; non-bleed rail + transparent panels; `TOC_ANCHORS` pruned (commits 77fb7a77 / 700878a9). Cumulative-spend toggle still deferred. |
| **1b** | **Converge the 4 `*CommandPanel.tsx`** | **P2** | `Vendor/Institution/Category/Sector` command panels are ~70% identical (`Panel`, `EmptyNote`, the stat-strip grid, the OECD bullet bars, the risk sparkline, the entity table). Extract shared `dossier/command/` primitives. Shipped standalone to keep blast radius zero; now safe to converge. ~0.5 day. |
| **2b** | **Backend: `sector.statistics.total_institutions = 0`** | **P2** | The sector detail endpoint returns 0 institutions for every sector (frontend now guards it — hero/lede suppress the clause, table labelled "top N"). Fix the aggregate so the true count surfaces. Also: `/categories/summary` lacks `high_risk_pct` (category verdict falls back to avg-risk). ~0.5 day. |
| **3** | **Add `OECD_*` constants + extend `lint-tokens`** | **P1** | New constants in `lib/constants`; linter scans SVG attrs for green/risk-hex, flags undefined-CSS-var consumers + unloaded `Source Serif Pro`. Then fix `Executive.tsx:754` green ceiling, swap `#dc2626→RISK_COLORS.critical`, load-or-drop Source Serif Pro globally. ~0.5 day. |
| **4** | **`/dashboard` length + redundancy** | **P1** | Collapse the triple spend→bypass→flag→catch narrative; group 11 sections into 3–4 movements; drop `hover:shadow-lg` SaaS gloss. ~0.5 day. |
| **5** | **`/sectors` bilingual + density** | **P2** | Delete `formatSpend`, call `formatCompactMXN` (fixes ES money at 12 sites); tighten the 3 stacked editorial heros; unify `<h2>` weights; EB Garamond + ochre-fragment on the hero. ~0.5 day. |
| **6** | **`/atlas` polish** (no structural change) | **P3** | Restore lens-aware folio index; swap inline `#dc2626/#a06820` → tokens; story-reader body → EB Garamond; `'white'` → `var(--color-background)`. **Do not densify.** ~0.25 day. |
| **7** | **`/` The Spoils** S-tier fix + hero | **P3** | Give S-tier cells a minimal payload (sector code + spend%); EB Garamond + ochre-fragment hero. ~0.25 day. |

### `/vendors/:id` top-5 fixes (detail for backlog #2)

1. **[blocking — credibility]** Reconcile the OECD direct-award limit. `VendorActivityTab.tsx:283` hardcodes **25%**; `VendorCommandPanel.tsx` uses **30%** — two limits for the same metric on the same vendor, one scroll apart. Add `OECD_DIRECT_AWARD_LIMIT = 0.30` / `OECD_SINGLE_BID_LIMIT = 0.10` to `@/lib/constants` and replace every inline ladder.
2. **[high]** Collapse the redundant OECD (×5) + SHAP (×3) retellings. Keep the grid panel as the only above-tabs OECD view; inside Evidence collapse BenchmarkBars + DeviationLedger to one; drop one of the waterfall/ranked-list pair.
3. **[high]** Restore the dropped cumulative-spend argument (the `MoneyStaircase` shape — a ghost-vendor tell). Add a cumulative-MXN toggle to "Risk over time" (`lifecycle.timeline[].total_value_mxn` already in hand).
4. **[medium]** Fix the non-bleeding hero rail (`--container-pad` undefined) + the pure-white diagnostic panels (`#ffffff` on `#faf9f6` → `transparent`).
5. **[medium]** A11y: critical red `#ef4444` on cream is 3.57:1 (fails AA at 18px); render risk numbers in `text-primary`, add a non-colour severity channel, darken critical-as-text toward `#b91c1c`.

*Refuted by the panel (do NOT "fix"):* the hero seal vs Evidence-§8 "two verdicts" are
**different classifiers by design** (raw-score band vs heuristic bucket) — a
cross-reference nicety, not a defect.
