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

### #001 — CLOSED — `/categories/:id` — institutional ranking scope filter

- **Closed:** 2026-05-07 by commit `68f96e6`. See CLOSED section for details.

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

### #003 — CLOSED — `/vendors/:id` — does not match RedThread quality bar

- **Closed:** 2026-05-12 by commits `2794f213` (3-tab → single-scroll) + `e097670f` (editorial chapter chrome).
- **Fixed by:** VendorProfile collapsed to a single-scroll editorial arc — tabs removed, card chrome replaced with folio chrome, EB Garamond H1, editorial primitives throughout.

### #004 — CLOSED — `/institutions/:id` — does not match quality bar

- **Closed:** 2026-05-12 by commit `8d5fb2bf`.
- **Fixed by:** InstitutionProfile 6-tab Card-grid → 3-chapter single-scroll with folio chrome.

### #005 — CLOSED — `/administrations` — too many graphs, simplify

- **Closed:** 2026-05-12 by commit `653f62c5`.
- **Fixed by:** Culled to 3 editorial charts; removed 4 redundant components. Page reads as a focused comparison.

### #006 — CLOSED — `/methodology` — body needs i18n + polish

- **Closed:** 2026-05-12 by commit `c38cc41b`.
- **Fixed by:** v0.8.5 content refresh + 2 hardcoded section kickers extracted to i18n. Full bilingual pass on body.

### #007 — CLOSED — Story chart components — bilingual coverage gap

- **Closed:** 2026-05-12 by commits `97adcb48` (batch 2), `57359f5b` (anchor fix), `48b157bc` (ChapterSources UI strings).
- **Fixed by:** all 12 charts referenced by the 5 launch stories now bilingual; `ChapterSources` button strings moved to i18n (`story.sources_one/other`, `viewCitations`, `collapse`).

### #008 — CLOSED — Pick the 5 launch stories

- **Closed:** 2026-05-12 by commit `48b157bc`.
- **5 launch stories:** `el-monopolio-invisible`, `la-ilusion-competitiva`, `captura-institucional` (auditado), `marea-de-adjudicaciones`, `el-sexenio-del-riesgo`. Removed from INVESTIGATIONS array in `Journalists.tsx`: the 4 `solo_datos` stories + `el-gran-precio`.

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

### #011 — CLOSED — Kill 10 orphan chart components (no callers)

- **Closed:** 2026-05-12 by commit `e4a91383`.
- **Deleted:** `StackedArea`, `VendorConcentrationTreemap`, `CategoryRanking`, `CategoryHotspot`, `EditorialHeatmap`, `PatternTypology`, `AdminsSledgehammer`, `EditorialMasthead`, `LeagueRow`, `QuotedPattern`. Barrel exports cleaned from `charts/index.ts` + `charts/editorial/index.ts`. TypeScript clean.

### #012 — CLOSED — `ProcedureBreakdown` green-400 violation

- **Closed:** 2026-05-07 by commit `68f96e6`. See CLOSED section for details.

### #013 — CLOSED — `RiskCalendarHeatmap` English-only month labels

- **Closed:** 2026-05-12 by commit `85cf3055`.
- **Note:** Tracker originally named `SectorRiskHeatmap` — the actual affected component was `RiskCalendarHeatmap.tsx`. Fixed: `MONTH_ABBR_ES`, bilingual `riskLabel(risk, isEs)`, bilingual tooltip (Riesgo/Risk, Contratos/Contracts), bilingual legend + footer annotation.

### #014 — CLOSED (won't fix) — `StoryRiskPyramid` alleged duplication

- **Decision:** 2026-05-12. Not actual duplication — the two charts share the "dot-per-%" motif but have different geometries (single-panel centered pyramid vs dual-panel butterfly), different DOT_R/spacing, different editorial compositions (story version wraps kicker/headline/stats/finding blocks; RiskPyramid is just the SVG + stats cards). Wrapping one to delegate to the other would require ~15 props and guarantee a visual regression. No action taken.

### #017 — PENDING DECISION — Drop `/workspace` (Watchlist) entirely

- **Filed:** 2026-05-07 (user — "we might have to drop the personal
  investigation workplace since I don't feel that journalists will
  work on my website... we are merely informative")
- **Surface:** `frontend/src/pages/Watchlist.tsx` (1,366 LOC) +
  sidebar entry + Atlas right-panel "Save investigation" feature
- **Decision needed:** is RUBLI a publication or a workbench?
- **If drop:**
  1. Redirect `/workspace` and `/watchlist` → `/atlas` (or `/`).
  2. Remove "Workspace" entry from sidebar (`AtlasLeftRail.tsx`
     and the main `Sidebar.tsx`).
  3. Remove "Save investigation" from Atlas right panel
     (`AtlasRightPanel.tsx` selecting view).
  4. ~1,366 LOC + ~80 LOC of localStorage hook becomes dead code
     (delete file, remove imports, gates pass).
- **If keep:** invest in making it actually useful — which is at
  least 2 agent-days of polish, plus authentication for cross-device
  saves (currently localStorage only).
- **Recommended:** drop. Replace with shareable URL state (which
  already exists in Atlas via `?lens=&zoom=&select=`) — that gives
  a journalist exactly what they need (a sharable bookmark) without
  pretending to be a workbench.
- **Effort to drop:** ~30 minutes.
- **Linked commit:** _(pending decision)_

### #018 — PENDING DECISION — Haiku-scrape T2/T3 ARIA tiers for richer dossiers

- **Filed:** 2026-05-07 (user — "this is why I suggested in doing
  scrapping the aria tiers with haiku")
- **Surface:** Backend (`backend/scripts/centinela_web*.py`) +
  data layer (no UI work)
- **Description:** ARIA T1 (314 vendors) has rich web evidence
  per existing `centinela_web` runs. T2 (1,462) and T3 (5,471) are
  thinner. If RUBLI is read-only (per #017), the consumption
  experience needs richer per-vendor evidence on more tiers.
- **What this means:**
  1. Run `centinela_web --tier 2` and `--tier 3` against latest
     `aria_queue` snapshot.
  2. Backend already supports this; per memory T2 was last 53.4%
     done. Resume + finish T2, then T3.
  3. Expected output: filling `aria_web_evidence` table for ~7K
     more vendors, surfacing real news links + verdict on per-
     vendor profile pages.
- **Effort:** ~4-8 hours of compute (Haiku calls) + monitoring.
  Requires the WAL-lock fix (commit `453e80e` per memory) to be
  intact — verify before running.
- **Sequenced:** parallel track to frontend work. Can run on the
  VPS overnight if pre-approval handled.
- **Linked commit:** _(pending decision)_

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

### Day 2 sprint — Atlas pan-zoom + bilingual sweep (2026-05-08)

Closed in 4 commits (`f137197`, `c1aee6b`, `bb022f6`, `b5a2473`, `f122f2a`)
plus one earlier same-day commit. All deployed to https://rubli.xyz with
`BUILD_ID` bumped each time so CDN cache busts.

**Atlas / Observatory (commit `f137197`)**
- Cluster click on `/atlas` was being absorbed by the hover halo overlay
  before reaching the constellation's click target. Added a click handler
  on the overlay circles that forwards to the same dispatcher.
- Bumped `ZOOM_SCALE` 2.4× → 3.6× so a clicked cluster fills more of the
  viewport (audit complaint: "dots still scattered after zoom").
- Added drag-to-pan + wheel-zoom + reset chip + HUD hint inside the zoomed
  view. Window-level mousemove/mouseup so dragging continues across the
  chart edge (Mapbox model). Native non-passive wheel listener so
  `preventDefault` actually works.
- First-visit auto-tour suppressed on viewports < 768px so the chapter
  card doesn't push the constellation off-screen on phones; user can
  still tap "Play story" explicitly. Visited flag NOT set so the tour
  still plays the next time the same browser opens /atlas on desktop.

**Bilingual sweep (commits `c1aee6b`, `bb022f6`, `b5a2473`, `f122f2a`)**
- Sectors page title now follows `?view=categories` ("Qué Compra México
  por Categoría" vs "12 Sectores ..."). Sidebar label and page heading
  finally agree.
- Real i18next pluralization on `caseCount`, `contractsCount`,
  `vendorFlags.groundTruth.detail` — Spanish never reads "1 contratos" or
  "1 caso(s)" anywhere we control.
- Inline-string pluralization on AriaQueue contract count and
  VendorActivityTab year-row title/subtitle (where the strings weren't
  behind i18next keys).
- ARIA queue + Investigation list + InvestigationCaseDetail sector chips
  now render `SALUD` / `INFRAESTRUCTURA` / `HACIENDA` in ES (was always-EN
  `HEALTH` / `INFRASTRUCTURE` / `TREASURY`). Added `SECTOR_NAMES_ES` +
  `getSectorNameES` + lang-aware `getSectorName(code, lang)` to constants.
- `Generate Report` button now bilingual ("Generar Reporte" / "Generate
  Report").
- VendorHero "(s)" name-variants count replaced with proper singular vs
  plural branching.
- `formatMXNHero` on CaseLibrary now locale-aware (Bible §3.10: never
  `B MXN` in ES). Spanish hero reads "208,400 MDP" or "2.84 billones".
- Vendor groundTruth detail unhardcoded the model version — now threads
  `CURRENT_MODEL_VERSION` (currently v0.8.5) so the flag tracks active
  scoring runs automatically.

**Mobile (commit `bb022f6`)**
- StatRow primitive (used by VendorHero KPI row) value font now
  responsive (`text-lg sm:text-2xl`) and gap tightened on mobile
  (`gap-x-3 sm:gap-x-6`). Audit's "Contratos/Valor/Adj/Instituciones
  collide at 80px each" fixed.

**Day-2 closeout + polish (commits `6f56652`, `0601446`)**
After the main sprint a quality review caught 6 leftover hardcoded
strings in touched files (4 EN, 2 inverse leaks):
- AriaQueue FilterChip aria-label `Clear filter` → `Quitar filtro`.
- AriaQueue REVIEW_GLYPH titles (4 statuses × literal EN) →
  `{titleEn, titleEs}` shape; row picks via existing `isEs` prop.
- CaseLibrary search clear aria-label `Clear search` → `Limpiar búsqueda`.
- Investigation table aria-label `Investigation cases` → `Casos de
  investigación` (dead code on `/aria`-redirected route, but kept
  correct for v1.1).
- AriaQueue SFP chip title `Sancionado SFP` → bilingual
  `Sancionado por la SFP` / `Sanctioned by SFP` (was inverse leak —
  ES on EN locale).

**Verified live**
- Bundle hashes advance on each deploy: `Dggi7Q_l` → `3Ir-H_HG` →
  `cN6yfmbM` → `DJSNlK9_` → `CBckmNxX` → `ZQCH0RaV` → `Ck5Sm6K0`.
- Atlas chunk contains all 5 HUD strings (`drag to pan`, `wheel to
  zoom`, `reset view`, `arrastra para desplazar`, `reiniciar`).
- AriaQueue chunk `AriaQueue-C15HgAnM.js` contains all 6 ES strings
  (`Corrupción confirmada`, `Descartado`, `En revisión`, `Quitar
  filtro`, `Revisión pendiente`, `Sancionado por la SFP`).
- CaseLibrary chunk contains `MDP`, `billones`, `documentados`,
  `Limpiar búsqueda`.
- Sectors chunk contains `titleCategories` + "What Mexico Is Buying".
- Main bundle contains all 6 ES sector names (Educación, Energía,
  Gobernación, Hacienda, Infraestructura, Tecnología).
- Backend health remains green: `db_connected:true,
  contract_count:3058286, response_ms:6.6`.

**Day 2 final tally:** 7 commits, all gates clean (TS 0 errors, build
clean, lint:tokens 0 forbidden patterns), all deployed and verified.

### Issue #001 — `/categories/:id` institutional ranking scope filter
- Closed 2026-05-07 by commit `68f96e6` (deployed bundle `index-DygV5ZIQ.js`).
- Backend `/categories/{id}/vendor-institution` gains `scope` Query param,
  defaults to `'federal'`. Excludes `state_agency`, `state_government`,
  `state_enterprise_*`, `municipal`, `other` (~3,000 rows that previously
  dominated rankings vs ~325 federal-tier rows).
- API response now includes `scope` field for client-side label clarity.
- Verified live: filter param honored.
- Known follow-up (v1.1 candidate): the endpoint takes 200-280s under
  load — pre-existing slowness from JOIN+GROUP BY over 3M contracts,
  NOT caused by this change. Needs an index or precomputed materialization.

### Issue #012 — `ProcedureBreakdown` green-400 violation
- Closed 2026-05-07 by commit `68f96e6`.
- `COLORS.tender` swapped from `#4ade80` (green-400) to `#71717a`
  (zinc-500, RISK_COLORS.low). Bible §3.10: green cannot certify
  integrity on a corruption platform.

### Issue #017 quick-cut — `/price-analysis` orphan
- Closed 2026-05-07 by commit `68f96e6`.
- Route now redirects to `/sectors`. Lazy import removed from App.tsx.
- PriceIntelligence.tsx component preserved on disk for v1.1 if a
  real consumer surfaces.

### Audit Fix N — missing `administrations.multiple` i18n key
- Closed 2026-05-07 by commit `68f96e6`.
- Added `multiple` and `unknown` keys to en/es cases.json.
- Defensive fallback in `CaseLibrary.tsx`: if a translation key
  doesn't resolve, renders the raw lowercase value instead of the
  uppercase echoed key.

### Audit Fix B — homepage hero hardcoded "1,363" → live API read
- Closed 2026-05-07 by commit `be9536b` (deployed bundle `index-d27POOkj.js`).
- Replaced literal `1,363` (Executive.tsx 1425+1434, EN+ES) with
  `gtCaseCount.toLocaleString(...)` reading from
  `analysisApi.getExecutiveSummary().ground_truth.cases`.
- Verified live: API returns 1,401. Frontend interpolates that
  number into the hero copy.

### Audit Fix C — `/api/v1/cases?vendor_id=` silently ignored filter
- Closed 2026-05-07 by commit `be9536b`.
- Added `vendor_id` Query param to `list_cases` endpoint
  (`backend/api/routers/cases.py`). Filter joins via
  `ground_truth_vendors`.
- Verified: with `vendor_id=4325`: 0 cases. Without: 43 cases.
  Filter now works (and surfaces a separate data-curation gap —
  Vitalmex GT cases haven't been promoted to public scandals;
  filed as v1.1 candidate, not a launch blocker).

### Audit Fix A — routing redirects → FALSE ALARM
- Closed 2026-05-07 (no commit needed).
- Agent 5 reported `/methodology` → `/vendors/4325`,
  `/institutions` → `/vendors/1`, `/atlas` → `/captura`.
- Direct verification via Chrome MCP and curl: NONE of these
  redirects exist. All routes return 200 and stable URLs. Likely
  Playwright stale state in agent's session, or click navigations
  reported as auto-redirects.
- Removed from P0 list.

### Day 1 review-gap closeout — 8 leftover 1,363 hardcodes
- Closed 2026-05-08 by commit `e97275d` (deployed bundle pending verification).
- Day 1 Fix B closed the homepage hero only; this caught the siblings:
  CaseDetail.tsx (1×), Intersection.tsx (2×), ModelTransparency.tsx (4×),
  watchlist.json (1× via {{n}} interpolation).
- Single source of truth `GROUND_TRUTH_CASE_COUNT_FALLBACK = 1401` added
  to lib/constants.ts so the next retraining only updates one literal.
- Bonus: Intersection.tsx body copy `v0.6.5` → `CURRENT_MODEL_VERSION`.
- Bonus: dead `/price-analysis` breadcrumb entry removed from Header.tsx
  ROUTE_I18N_KEYS (route was redirected on Day 1 but the map entry stayed).

---

## v1.1 CANDIDATES (do not touch before 2026-06-14)

### Backlog from prior sessions
- **Model-coefficient surfaces still describe v0.6.5 specifics**.
  Caught in Day 1 review (2026-05-08): three surfaces still reference
  v0.6.5-specific coefficients/active-features that differ in v0.8.5
  (which has 18 active vs 9). Bulk version-label swap was completed
  on 2026-05-08 (commits `88cb0dd` + `008534a`) but the per-feature
  facts still need real model lookups, not literal swaps:
  - `pages/ModelTransparency.tsx` body — `ACTIVE_COEFFICIENTS` array
    + version-history `change` notes describe the v0.6.5 model
  - `components/sectors/SectorModelCoefficients.tsx` — chart visualises
    v0.6.5 logistic regression coefficients; needs new data wiring
  - `i18n/locales/{en,es}/glossary.json` per-feature `mexico_note`,
    `validation_strength`, `coefficient` fields (~14 features × 2
    locales). Swapping "Active in v0.6.5" → "Active in v0.8.5" is
    fine for some features but wrong for others (direct_award flipped
    sign; cobid_herfindahl is new).
  Estimated 2-3h to do correctly with the v0.8.5 calibration JSON.
  Cosmetic-only on Tier-2 transparency/glossary surfaces, defer to
  v1.1.
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
