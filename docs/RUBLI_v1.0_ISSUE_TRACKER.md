# RUBLI v1.0 — Issue Tracker

**Launch:** Friday 2026-05-15. **8 days from scope freeze.**

This file is the SINGLE source of truth for what gets fixed before
launch. We don't work on things that aren't in this file.

---

## Communication protocol — how to file an issue without us looping

You file an issue by saying any of these:
- `Issue #N` (existing) — "open it / what's the status / push it"
- `New issue:` (new) — "the chart on /vendors/12345 still looks like
  PowerPoint. The bar widths don't add up to 100%."

I respond with: a ticket number, a one-line acknowledgment, what
severity I'm assigning, and what acceptance criteria I'm setting.

If you disagree with severity or acceptance — say so. We negotiate
ONCE. Then I work the issue. When the commit lands, I close the
ticket with the SHA + a one-line "fixed by".

**What this file is NOT:** a brainstorming surface. New ideas that
aren't blocking launch go to `## v1.1 candidates` at the bottom and
we don't touch them until 2026-06-14.

---

## Severity ladder

- **P0** — site is broken, prod 5xx, data loss risk. Fix today.
- **P1** — block launch. Must close before 2026-05-15.
- **P2** — should fix before launch but won't block if it slips.
- **P3** — nice to have. Default disposition: defer to v1.1 unless
  trivial.
- **CUT** — not in v1.0. Will not be touched.
- **DEFER** — not in v1.0. Goes to v1.1 candidates.

---

## OPEN

### #001 — P1 — `/categories/:id` — institutional ranking skewed by state institutions

- **Filed:** 2026-05-07 (user)
- **Surface:** `frontend/src/pages/CategoryProfile.tsx`
- **Description:** The "top institutions by category" ranking on the
  category page includes state-level (estatal) institutions that have
  far fewer contracts than federal institutions. The result: the
  ranking reads as broken / unfair because state institutions show
  up at the top despite having a tiny denominator.
- **Acceptance criteria:**
  1. State institutions are excluded from the top-ranking by default
     (filter on `institution_type = 'federal'` or whichever field
     identifies federal scope), OR
  2. A toggle exists to switch between "federal only" / "all" with
     "federal only" as default.
  3. The ranking title and subtitle make scope explicit: "Top federal
     institutions by spend in this category" / "Top instituciones
     federales por gasto en esta categoría".
- **Linked commit:** _(open)_

### #002 — P1 — `/categories/:id` — full conceptual rework

- **Filed:** 2026-05-07 (user — "the worst element")
- **Surface:** `frontend/src/pages/CategoryProfile.tsx` (1,944 LOC)
- **Description:** User flagged this page as the worst on the
  platform. Beyond the ranking issue (#001), the page has structural
  problems with how spending categories are presented. Needs
  conceptual rework, not just polish.
- **Acceptance criteria:** _Pending visual audit + design-visionary
  pass. Will be filled in after Day 2 audit._
- **Effort estimate:** ~1 day rework
- **Linked commit:** _(open)_

### #003 — P1 — `/vendors/:id` — does not match RedThread quality bar

- **Filed:** 2026-05-07 (user — "not well done")
- **Surface:** `frontend/src/pages/VendorProfile.tsx` (360 LOC) +
  composed components: VendorHero, VendorEvidenceTab,
  VendorActivityTab, VendorNetworkTab.
- **Description:** Gold-standard vendor view is `/thread/:vendorId`
  (RedThread.tsx, 2,943 LOC) — 6-chapter scroll-driven narrative
  used for ARIA T1 vendors. Regular vendor profile feels generic by
  comparison.
- **Acceptance criteria:** _Pending quality bar doc (Day 2 morning)._
  Then compare VendorProfile against the bar; close when delta is
  <= 3 specific gaps and each is fixed.
- **Effort estimate:** ~1 day rework
- **Linked commit:** _(open)_

### #004 — P1 — `/institutions/:id` — does not match quality bar

- **Filed:** 2026-05-07 (user — "not well done")
- **Surface:** `frontend/src/pages/InstitutionProfile.tsx` (2,312 LOC)
- **Description:** Same problem as #003 but for institution dossiers.
- **Acceptance criteria:** _Pending quality bar._ Same shape as #003.
- **Effort estimate:** ~1 day rework (likely smaller than vendor
  profile because the page is already 2.3k LOC of substantive work).
- **Linked commit:** _(open)_

### #005 — P1 — `/administrations` — too many graphs, simplify

- **Filed:** 2026-05-07 (user — "too many graphs and i think its
  just too much and we can reduce things and make them neater")
- **Surface:** `frontend/src/pages/Administrations.tsx` (3,671 LOC)
- **Description:** The page renders too many charts. User wants
  fewer charts, neater. This is a SUBTRACT operation, not an ADD.
- **Acceptance criteria:**
  1. Identify the 3 most editorially valuable charts on the page.
  2. Delete the rest (or move to a `<details>` "More analyses" block
     at the bottom).
  3. Page reads as a focused administration comparison, not a
     chart-by-chart tour.
- **Effort estimate:** ~half-day
- **Linked commit:** _(open)_

### #006 — P1 — `/methodology` — body needs i18n + polish

- **Filed:** 2026-05-07 (orchestrator — known gap from launch plan)
- **Surface:** `frontend/src/pages/Methodology.tsx` (1,641 LOC)
- **Description:** Hero swapped to folio aesthetic; body still has
  ~150 hardcoded strings (mix of EN/ES). Authority surface for
  journalists — must be fully bilingual + read as a model card,
  not as marketing copy.
- **Acceptance criteria:**
  1. Every visible string bilingual.
  2. Plain-language pass on the model description (avoid jargon,
     define every term).
  3. Limitations section visible and concrete (PU SCAR violation,
     structural FP exclusions, label noise 30-50%).
  4. Citation block at the bottom in canonical academic format.
- **Effort estimate:** ~half-day
- **Linked commit:** _(open)_

### #007 — P1 — Story chart components — bilingual coverage gap

- **Filed:** 2026-05-07 (user — "the translation of the images
  themselves")
- **Surface:** `frontend/src/components/stories/charts/*.tsx`
  (41 files; 2 already converted, 39 remain)
- **Description:** Audit confirmed 0 of 41 chart components had
  bilingual logic when filed. 2 shipped in commit `7d38c85`. The
  rest are still Spanish-only.
- **Acceptance criteria:** Limit work to the ~12 charts referenced
  by the 5 launch stories. Other 27 charts ride along with stories
  that won't be in the launch sidebar (deindexed via robots.txt /
  story menu config).
- **Dependency:** #008 (must pick the 5 launch stories first).
- **Effort estimate:** ~2 hours per chart × 12 = ~3 days, can run
  alongside other tickets.
- **Linked commit (in progress):** `7d38c85` (batch 1 — 2 charts).

### #008 — P1 — Pick the 5 launch stories

- **Filed:** 2026-05-07 (orchestrator — gating #007)
- **Surface:** N/A (decision)
- **Description:** From `frontend/src/lib/story-content.ts` (11
  candidate stories), pick exactly 5 that ship with v1.0. The
  remaining 6 stay reachable by URL (deep links from elsewhere
  don't break) but are removed from the sidebar story menu and the
  /journalists landing.
- **Acceptance criteria:** 5 slugs decided + listed in this file.
- **Effort estimate:** 5 minutes (with you).
- **Linked commit:** _(open)_

### #009 — P2 — Story chart components — visual quality

- **Filed:** 2026-05-07 (user — "the design of our graphs is
  pathetic")
- **Surface:** Same as #007.
- **Description:** Beyond bilingual coverage, the user feels many
  story charts look amateur. Distinct from #007 (translation gap).
  This is a quality gap.
- **Acceptance criteria:** _Pending chart inventory (background
  agent running)._ Once the inventory tags each chart Gold/Decent/
  Pathetic, target only the Pathetic-tier charts referenced by the
  5 launch stories.
- **Dependency:** chart inventory + #008.
- **Effort estimate:** ~half-day per pathetic chart × N — TBD.
- **Linked commit:** _(open)_

### #010 — P2 — `/aria/:vendorId` style coherence with VendorProfile

- **Filed:** 2026-05-07 (orchestrator — implied by #003)
- **Description:** ARIA T1 RedThread view (`/thread/:vendorId`) and
  the regular vendor profile (`/vendors/:id`) are two different
  surfaces today. After #003 lands, audit whether they should
  converge OR be distinct (RedThread = T1 only, VendorProfile =
  everyone else with link to RedThread for T1s).
- **Effort estimate:** Decision + minor wiring; ~half-day.
- **Linked commit:** _(open)_

---

## CLOSED

_(none yet — opened 2026-05-07)_

---

## v1.1 CANDIDATES (do not touch before 2026-06-14)

### Backlog from prior sessions
- StoryNarrative chapter PlateFrames (Phase 6 of folio v1).
- Bilingual sweep on the remaining 27 chart components (the ones not
  used by the 5 launch stories).
- Bilingual sweep on cut Tier 2 surfaces (Settings, Contracts, etc.)
  if real users complain.
- /report-card folio treatment + print stylesheet.
- Real `/methodology` model card matching NIST AI RMF format.
- An export-to-PDF feature on `/report-card`.
- An RSS feed of new aria queue tier-1 entries.
- A "Save investigation" cloud sync (currently localStorage).
- ICIJ-style entity-network export (CSV / GraphML).

### From this conversation (Day 1 / 2026-05-07)
- "Networks" surface — broken or static. **CUT in v1.0; revisit in v1.1
  if there's a real use case beyond eye candy.**
- "Risk Patterns" surface — same.
- "Intersection" — same. (already Tier 2 in launch plan but candidate
  for full deletion in v1.1.)
- "Capture" — same.
- More-than-2-charts-per-row anywhere on the site — visual hygiene
  pass post-launch.
- "Pathetic" charts that aren't on the launch surface — fix in v1.1
  batches.

---

## DAILY RITUAL (you, until launch)

1. Open this file.
2. Read top to bottom.
3. Name the ticket(s) you want me to work on today.
4. I work them. Each closes with a commit SHA in this file.

That's it. We don't open new ideas. We close tickets.
