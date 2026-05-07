# RUBLI v1.0 — Launch Plan

**Launch date: Friday 2026-05-15 (8 days).** Locked 2026-05-07.

**Status:** drafted 2026-05-07. Replaces the implicit "next session"
backlog with a concrete ship-this-month plan.

**Working hypothesis:** The platform isn't broken. It's *unfinished*.
That's a scope problem, not a code problem. Cut scope, define done,
launch.

---

## The numbers (audit, 2026-05-07)

- 42 pages · 236 components · ~128,000 LOC of TypeScript.
- 24 of 42 pages bilingual (57%). 42 of 236 components bilingual (18%).
- 268 backend endpoints · 37 backend tests · 5 deploy scripts.
- 3,058,286 contracts indexed in prod. v0.8.5 risk model deployed.
- Prod is up. Healthy. https://rubli.xyz / 37.60.232.109.

The codebase is finished-feeling. It's the launch story that's missing.

---

## v1.0 launch scope — 9 surfaces, nothing else

These are the *only* surfaces a journalist visiting RUBLI for the
first time has to encounter. Everything else either redirects to one
of these or is hidden.

| Surface | Route | Status | Bilingual gate |
|---|---|---|---|
| Dashboard (Executive) | `/` | ✓ Folio v1 (P1a + P1b) | ✓ |
| The Observatory | `/atlas` | ✓ Folio skin | ✓ |
| Sectors landing | `/sectors` | ✓ Folio v1 P2 | ✓ |
| Sector dossier | `/sectors/:code` | ✓ Folio v1 P2 | ✓ |
| Vendor dossier | `/vendors/:id` | ✓ Folio v1 P1a | ✓ |
| Institution dossier | `/institutions/:id` | ✓ Folio v1 P2 | ✓ |
| Investigation queue | `/aria` | ✓ Folio v1 P5 | ✓ |
| Documented cases | `/cases` (+ `/cases/:slug`) | ✓ Folio v1 P5 | ✓ |
| Methodology | `/methodology` | ⚠ Hero done, body needs i18n | **Required for launch** |
| Stories (5 selected) | `/stories/:slug` | ⚠ ~12 charts need i18n | **Required for launch** |

That's it. Ten surfaces that work end-to-end, look like one
publication, and tell a coherent investigative story.

---

## The cuts

These routes/components are redundant with launch surfaces or low-value
for a journalism MVP. They redirect to the nearest sensible launch
surface.

| Route | Component | Action | Redirect to |
|---|---|---|---|
| `/year-in-review`, `/year-in-review/:year` | YearInReview.tsx (1,683 LOC) | redirect | `/` |
| `/clusters` | CorruptionClusters.tsx (1,362 LOC) | redirect | `/atlas` |
| `/money-flow` | CapturaHeatmap.tsx (1,124 LOC) | redirect | `/captura` |
| `/model` | ModelTransparency.tsx (842 LOC) | redirect | `/methodology` |
| `/vendors/compare` | VendorCompare.tsx (893 LOC) | redirect | `/sectors` |
| `/procurement-calendar` | ProcurementCalendar.tsx (959 LOC) | redirect | `/` |
| `/institutions/compare` | InstitutionCompare.tsx (1,203 LOC) | redirect | `/institutions/:id` |
| `/investigation`, `/investigation/:caseId` | Investigation.tsx + InvestigationCaseDetail.tsx (2,686 LOC) | redirect | `/aria` |

**Total cut: ~10,750 LOC of "vibing space" disappears from the
launch surface.** The component files stay in the repo for v1.1 but
are unreachable through the UI.

Tier 2 surfaces that *stay accessible* (kept, not promoted):
`/captura`, `/intersection`, `/network`, `/administrations`,
`/categories/:id`, `/patterns`, `/patterns/:code`, `/price-analysis`,
`/report-card`, `/journalists`, `/workspace`. These already have folio
v1 (P4) treatment; they ship as supporting surfaces, not headline ones.

---

## 8-day timeline (locked: launch Friday 2026-05-15)

### Day 1 — Thu 2026-05-07 (today) — scope freeze ✓
- ✓ Write this plan doc.
- ✓ Cut the 10 routes in `App.tsx` (commit `4fd4ea8`, deployed).
- ✓ Pick the launch date: **Fri 2026-05-15**.

### Day 2 — Fri 2026-05-08 — Methodology + 5 stories selected
- Pick the 5 stories that ship with v1.0. Recommended:
  1. `el-ejercito-fantasma` (ghost army / P2 vendors)
  2. `el-monopolio-invisible` (pharma cartel / IMSS)
  3. `marea-de-adjudicaciones` (direct-award rate trend)
  4. `captura-institucional` (institutional capture)
  5. `el-sexenio-del-riesgo` (administration comparison)
- Identify the chart components those 5 stories use (~12 components).
- Bilingual sweep on `Methodology.tsx` body (~150 strings, ~3 hours).

### Day 3-4 — Sat-Sun 2026-05-09 / 10 — chart i18n batch
- Translate the ~12 chart components used by the 5 launch stories.
- Pattern: `useTranslation()` + `isEs` ternary, exactly like
  `StoryAnoSinExcusas.tsx` and `StoryCartelCorazon.tsx` (already
  shipped in commit `7d38c85`).
- The other 27 chart components stay Spanish-only and ride along
  with stories not in the launch set (those stories are deindexed
  via robots.txt + remove from sidebar story menu).

### Day 5 — Mon 2026-05-11 — pre-launch checklist
- [ ] **Uptime monitoring** — UptimeRobot free tier, ping
      `/api/v1/health` every 5 min. SMS/email alert on down.
- [ ] **Error tracking** — Sentry free tier or Caddy log digest cron.
- [ ] **Backup verification** — confirm `scripts/offsite-backup.sh`
      runs nightly. Test the restore once on staging.
- [ ] **Rate limiting** — verify prod has 60 req/min anonymous.
      If not, add via Caddy or FastAPI middleware before launch.
- [ ] **Smoke test** all 10 launch surfaces. Click main action on
      each. Verify 0 5xx errors.
- [ ] **5-stories read-through** in Spanish, then English. List any
      visible breakage on a sticky note. Fix only those items.
- [ ] **404 page** — `NotFound.tsx` bilingual (current: 0 logic, 80
      LOC, ~30 min).
- [ ] **Security headers** — verify Caddy sets HSTS, CSP, X-Frame-Options.

### Day 6-7 — Tue-Wed 2026-05-12 / 13 — buffer + fix soak findings
- Bug fixes only. No new surfaces.
- Read the 5 stories end-to-end on a fresh device.
- Open every Tier 1 surface on mobile + desktop.
- Triage the v1.1 candidate list (write down, don't build).

### Day 7 — Thu 2026-05-14 — final smoke + announcement draft
- Final 4-gate green run (`tsc strict + tsc lenient + lint:tokens + build`).
- Final prod deploy from `origin/main` HEAD.
- Verify bundle hash flip, /api/v1/health ok, all 10 surfaces 200.
- Draft launch announcement copy in ES + EN.
- Draft outreach email template.

### Day 8 — Fri 2026-05-15 — LAUNCH
- Public announcement post — LinkedIn + Twitter + Bluesky + Spanish-
  language outlets. One paragraph: what RUBLI does + link to a
  specific story + link to methodology.
- Direct outreach: email contacts at MCCI, IMCO, Animal Político,
  EMEEQUIS, Quinto Elemento Lab, ICIJ Mexico desk. One paragraph
  each, story-relevant link.
- Tally form for feedback. Pinned in the page footer.
- DON'T ask for hot takes. ASK for: "What's the first vendor or
  contract you tried to look up?" That tells you what people want.

### Day 9 onward — Sat 2026-05-16+ — soak
- No new features. Watch error rate, watch feedback queue, fix
  the bug-of-the-day. Sleep.

### 30-day lockdown ends — Sun 2026-06-14
- Triage v1.1 candidate list. Pick top 3. Build only those.

---

## 30-day post-launch lockdown

**No new features for 30 days. No omega cycles. No skill expansions.
Bug fixes only.**

This is the most important rule. The skills (`rubli-folio-aesthetic`,
`rubli-omega-redesign`, `rubli-three-agent-harness`) are *available*
during this period; using any of them on RUBLI surfaces is forbidden
until the lockdown ends.

Daily ritual:
1. Open https://rubli.xyz, click around 5 surfaces. Anything broken?
2. Read the feedback queue. Tag each entry: `bug` / `feature` /
   `noise`. Bugs get fixed today. Features go into the v1.1 list.
3. Watch error tracker. If a new error type appears, fix or
   suppress today.

End of lockdown (day 30): triage the v1.1 feature list. Pick the
top 3 user-requested items. Build only those. Ship 30 days later
as v1.1.

---

## What "done" looks like for v1.0

- A first-time visitor lands on `/`, reads the headline, scrolls the
  dashboard, sees five plates that all carry folio chrome and read
  in their language.
- They click a sector → land on `/sectors/salud` → see the dossier
  in their language.
- They click a vendor → land on `/vendors/12345` → see a coherent
  investigative dossier.
- They open the methodology page → understand what the model does
  and what it doesn't claim.
- They open one of the 5 launch stories → read it end-to-end with
  every chart label in their language.
- Nothing 5xx's. Nothing 404s. Nothing's English-only on a Spanish
  session.

That's it. That's done.

---

## What's explicitly NOT in v1.0 (kill list — do not touch before launch)

- ❌ New visual aesthetic / new font / new color scheme.
- ❌ New chart families (no new omega cycles).
- ❌ New page (no new methodology v2, no /year-in-review polish).
- ❌ Authentication beyond what already exists.
- ❌ User accounts beyond watchlist.
- ❌ Admin dashboard.
- ❌ AI-generated story drafts.
- ❌ Slack / email alerts.
- ❌ Mobile native app.
- ❌ ML model retraining.
- ❌ Dark mode toggle (we already shipped warm-white default; that's the call).
- ❌ Any constellation engine changes.

If a critique reads "we should also...", the answer until v1.1 is
"yes, write it on the v1.1 list." Then move on.

---

## Long-term (v1.1 → v2.0) roadmap, not commitments

Things the v1.1 list might pull from:
- Bilingual sweep on the remaining 27 chart components.
- Bilingual sweep on cut Tier 2 surfaces if usage demands.
- A real `/methodology` model card matching NIST AI RMF format.
- An export-to-PDF feature on `/report-card`.
- An RSS feed of new aria queue tier-1 entries.
- A "Save investigation" cloud sync (currently localStorage).
- ICIJ-style entity-network export (CSV / GraphML).

These are NOT commitments. They're candidates. The actual v1.1 list
gets written based on launch feedback, not pre-imagined.

---

## The launch date is set

**Friday 2026-05-15.** 8 days from scope freeze. Locked 2026-05-07.

Why this date:
- Long enough to actually finish the bilingual sweep + checklist.
- Short enough to enforce real cuts (no time to redesign anything).
- Friday landing → weekend soak before any viral attention.
- 30-day lockdown ends Sun 2026-06-14 — clean cycle for v1.1 planning.
