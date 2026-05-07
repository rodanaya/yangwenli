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
- **Surface:** `frontend/src/pages/CategoryProfile.tsx` lines 706-905
  (concentration table + vendor-institution pairs)
- **Backend bug source:** `categoriesApi.getTopVendors` and
  `categoriesApi.getVendorInstitution` — neither filters by
  institution scope (federal vs state). The "skew" is a real data
  bug surfacing as UI ugliness, NOT a design issue.
- **Description:** The "top institutions by category" ranking
  includes state-level (estatal) institutions that have far fewer
  contracts than federal institutions. The ranking reads as broken
  because state institutions show up at the top despite a tiny
  denominator.
- **Acceptance criteria:**
  1. Backend filter applied: `categoriesApi.getTopVendors` and
     `getVendorInstitution` accept a `scope` parameter (default
     `'federal'`). State institutions excluded by default.
  2. UI subtitle made explicit: "Top federal institutions by spend
     in this category" / "Top instituciones federales por gasto en
     esta categoría".
  3. (Optional v1.1) toggle for `'all'` scope.
- **Effort:** 0.5 day (backend filter + UI label).
- **Sequenced:** Day 1 — Fri 2026-05-08.
- **Linked commit:** _(open)_

### #002 — DEFER → v1.1 — `/categories/:id` — full conceptual rework

- **Filed:** 2026-05-07 (user — "the worst element")
- **Surface:** `frontend/src/pages/CategoryProfile.tsx` (1,944 LOC)
- **Decision:** **Deferred to v1.1.** The quality bar audit found
  the page lacks an editorial spine — 8+ data queries, 10 charts,
  no single hero finding. Picking the one finding to feature
  ("vendor concentration over time"? "spend trajectory"? "top
  intermediaries"?) is a **2-hour editorial decision the user
  has to make** — not an agent's call. That decision plus 2-3
  agent-days of build is past the launch window.
- **In v1.0:** #001 (the ranking skew, half-day data fix) ships,
  closing the actively-misinforming part. The page stays accessible.
- **In v1.1:** full editorial-spine rework, after launch feedback
  tells us which finding readers actually want.
- **Effort if attempted now:** 4-5 agent-days. Won't fit.
- **Linked commit:** _(deferred)_

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

### #009 — P3 — Story chart components — visual quality (DOWNGRADED)

- **Filed:** 2026-05-07 (user) — REVISED 2026-05-07 after audit.
- **Surface:** `frontend/src/components/stories/charts/`
- **Description:** Initial diagnosis ("most graphs look like
  PowerPoint") was over-broad. The inventory found **only 3 of 86
  chart files are truly pathetic** (`AdminVendorBreakdown`,
  `CategoryHotspot`, `PatternTypology`). The "pathetic" feeling
  is actually **Card chrome on Institution/Category profiles** —
  covered by #003 + #004 — not the chart components themselves.
- **Acceptance criteria:** Replace the 3 pathetic charts only IF
  they appear on a launch surface. `AdminVendorBreakdown` is on
  /administrations (cull will likely delete it via #005).
  `CategoryHotspot` is an orphan (kill via #011).
  `PatternTypology` is on /patterns/:code (Tier 2 — defer to
  v1.1).
- **Effort estimate:** Likely ZERO additional work after #003,
  #004, #005, #011 land.
- **Linked commit:** _(open)_

### #011 — P2 — Kill 10 orphan chart components (no callers)

- **Filed:** 2026-05-07 (chart inventory agent)
- **Surface:** `frontend/src/components/charts/` + `editorial/`
- **Description:** 10 chart files have zero importers in the
  codebase. Built and forgotten. They add bundle weight and
  cognitive overhead. Kill list (per inventory):
  `StackedArea`, `VendorConcentrationTreemap`, `CategoryRanking`,
  `CategoryHotspot`, `AdminsSledgehammer`, `EditorialMasthead`,
  `LeagueRow`, `QuotedPattern`, plus 2 more in the inventory.
- **Acceptance criteria:** Files deleted, imports removed,
  `tsc --noEmit` clean, `npm run build` clean. Bundle size delta
  reported in commit body.
- **Effort:** 0.5 day.
- **Linked commit:** _(open)_

### #012 — P1 — `ProcedureBreakdown` uses green (Bible §3.10 violation)

- **Filed:** 2026-05-07 (chart inventory agent)
- **Surface:** `frontend/src/components/charts/ProcedureBreakdown.tsx`
- **Description:** Uses `#4ade80` (green-400). Per CLAUDE.md Bible
  §3.10, green is forbidden — a procurement-only model cannot
  certify integrity. The violation flows into stories via
  `StoryProcedureBreakdown`.
- **Acceptance criteria:** Green hex replaced with `RISK_COLORS.low`
  (zinc-500 `#71717a`) or with another non-green token.
  `npm run lint:tokens` passes.
- **Effort:** ~30 minutes.
- **Linked commit:** _(open)_

### #013 — P2 — `SectorRiskHeatmap` English-only month labels

- **Filed:** 2026-05-07 (chart inventory agent)
- **Surface:** `frontend/src/components/charts/SectorRiskHeatmap.tsx`
- **Description:** Month axis labels hardcoded English ("Jan",
  "Feb", etc). Page-level i18n flips around it but the chart
  doesn't.
- **Acceptance criteria:** Bilingual month labels via `lang === 'es'`
  ternary or `Intl.DateTimeFormat`. Count parity check passes.
- **Effort:** ~30 minutes.
- **Linked commit:** _(open)_

### #014 — P2 — `StoryRiskPyramid` duplicates `RiskPyramid` geometry

- **Filed:** 2026-05-07 (chart inventory agent)
- **Surface:** `frontend/src/components/stories/charts/StoryRiskPyramid.tsx`
  + `frontend/src/components/charts/RiskPyramid.tsx`
- **Description:** Two implementations of the same dot-pyramid
  geometry. Story version should delegate to the canonical
  `RiskPyramid` primitive.
- **Acceptance criteria:** `StoryRiskPyramid` becomes a thin
  wrapper passing story-specific props to `RiskPyramid`. Zero
  visual regression.
- **Effort:** ~1 hour.
- **Linked commit:** _(open)_

### #016 — P2 — Merge Networks/Intersection/Capture into one `/relationships` surface

- **Filed:** 2026-05-07 (user — "I don't know if we should come up
  with something better that may combine aspects of these three")
- **Surface (target):** `/relationships` (or keep `/networks` URL,
  rebuild the page)
- **Surfaces (deprecated):** `Networks.tsx` (was redirected to
  `/network`), `Intersection.tsx`, `CaptureCreep.tsx` (= `/captura`)
- **Description:** All three pages today are "broken or static" per
  user. They each answer one editorial question — *who is connected
  to whom, and how does that produce risk?* — but split it across
  three weak surfaces. Collapse to ONE surface with three sections,
  each in a PlateFrame:
  1. **Network graph** — vendor ↔ institution edges, weighted by
     amount, top 50 (source: existing Networks page).
  2. **Pattern overlap** — vendors flagged for ≥2 ARIA patterns
     (P5+P6, P2+P3, etc.) (source: existing Intersection page).
  3. **Institutional capture** — institutions where one vendor
     dominates ≥50% of spend (source: existing CaptureCreep).
- **Out of scope:** `/patterns/:code` (Risk Patterns) stays — it's
  the per-pattern reference dossier and already works.
- **Acceptance criteria:**
  1. New page at `/relationships` (or rebuilt `/networks`) with the
     three sections in PlateFrame chrome.
  2. Old routes (`/networks`, `/intersection`, `/captura`) redirect
     to the new surface.
  3. Bilingual ES + EN throughout. All four gates green.
  4. Quality fingerprint matches the quality bar (folio chrome,
     EB Garamond italic H1, no Card chrome, editorial primitives).
- **Effort:** ~1-2 agent-days. Mostly composition — the data
  fetchers and chart primitives already exist on the deprecated
  pages.
- **Sequenced:** flexible. Can run alongside #003 / #004 reworks
  via `/ui` parallel-agent skill if launched in worktree isolation.
- **Linked commit:** _(open)_

- **Filed:** 2026-05-07 (chart inventory agent)
- **Surface:** Wherever the story chart map dispatches
  `VendorFingerprintChart` in `pages/StoryNarrative.tsx`.
- **Description:** Chart accepts a `lang` prop but caller doesn't
  pass it. Falls back to default. Bilingual gap on a Gold-tier
  launch-critical chart.
- **Acceptance criteria:** Caller passes `lang={lang}`. Story
  renders bilingually.
- **Effort:** ~15 minutes.
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
