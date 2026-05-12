# RUBLI v1.0 — Honest Audit (synthesis of 5 Opus ultrathink agents)

**Date:** 2026-05-07. **Method:** five parallel agents, each with a
distinct lens, each instructed to be brutal. Reports in
`docs/AUDIT_2026_05_07/0N_*.md`. Master synthesis here.

> **TL;DR.** The site does not just have visual debt. It has active
> misinformation (homepage hero hardcoded number doesn't reconcile),
> broken navigation (multiple URLs auto-redirect to wrong pages),
> broken filters (vendor case filter silently ignored), broken
> mobile (7/10 launch surfaces unusable on phones), and broken
> Spanish (9/10 surfaces leak English on ES locale, including
> entire stories shell). The previous Day 1-7 plan was wrong. We
> have to fix the lies and the routing first or we launch a site
> that misinforms.

---

## What each agent found (one-line summary)

| # | Lens | Headline finding |
|---|---|---|
| 1 | Investigative-journalist task | Site auto-rotates pages every ~3s; homepage promises 1,363 cases vs 43 visible; named case unfindable. **Verdict: would not cite.** |
| 2 | Visual quality vs the bar | **3 of 12 launch surfaces (25%) meet the bar.** Card chrome (not chart components) is the bottleneck. |
| 3 | Information architecture | "Categories" sidebar lands on a page titled "Sectores"; no sidebar entry for vendor lookup; 3 orphan routes including a fully-built `/price-analysis` with zero inbound links. |
| 4 | Data integrity (orchestrator-completed) | Homepage `1,363` is hardcoded; real DB has 1,403; case library API surfaces only 43; 7 Vitalmex cases exist but search for "Cártel del Corazón" fails. State-vs-federal skew CONFIRMED. |
| 5 | Mobile + bilingual | **7/10 mobile blockers** (no breakpoint below 1280px); **9/10 bilingual leaks** including entire stories shell English on ES locale, raw i18n key `ADMINISTRATIONS.MULTIPLE` displayed, broken pluralization, English `Generate Report` next to ES buttons. PLUS: confirmed routing bugs (`/methodology` → `/vendors/4325`, `/institutions` → `/vendors/1`). |

---

## The new launch-blocker list (replaces my earlier Day 1-7 plan)

### P0 — site is actively misinforming or fundamentally broken

| # | Issue | Surface | Effort |
|---|---|---|---|
| **A** | Routing bugs: `/methodology` → vendor 4325; `/institutions` → vendor 1 with 23 console errors; `/atlas` → `/captura` → `/administrations`. | App.tsx routing + maybe an error boundary | 1-2 hours |
| **B** | Homepage hero hardcodes "1,363 cases" — actual DB has 1,403; case library API surfaces 43 — three different numbers presented as one truth | `Executive.tsx` lines 1425+1434 + case API route | 1-2 hours |
| **C** | `/api/v1/cases?vendor_id=` silently ignores filter, returns global list | `backend/api/routers/cases.py` | 30 min |
| **D** | Atlas first-visit auto-tour interrupts every reading session | `Atlas.tsx` line 1208 + the chapter-advance `setInterval` at 1063 | 30 min |

### P1 — meeting the quality bar on launch surfaces

| # | Issue | From tracker |
|---|---|---|
| E | Categories ranking includes state institutions (data filter bug + UI label) | #001 |
| F | InstitutionProfile rework — Card-grid → 3-chapter scroll | #004 |
| G | VendorProfile rework — collapse 3 tabs into single scroll | #003 |
| H | Administrations cull — too many graphs, internal Card/PlateFrame inconsistency | #005 |
| I | Methodology body i18n + plain-language pass | #006 |

### P1 — IA + responsive + bilingual

| # | Issue |
|---|---|
| J | "Categories" sidebar item lands on "Sectores" page → either rename or build a real `/categories` landing |
| K | No vendor lookup in sidebar (Cmd+K is the only entry) |
| L | Mobile breakpoint missing across 7 launch surfaces |
| M | `/price-analysis` orphan — either link it or delete it (already in #017's spirit) |
| N | Stories shell entirely English on ES locale (the StoryNarrative outer layout) |
| O | `ADMINISTRATIONS.MULTIPLE` raw i18n key showing in `/cases` |
| P | "Generate Report" button + other vendor-page mixed-language buttons |
| Q | `formatCompactMXN` outputting "B MXN" in Spanish (should be MDP) — verify lib/utils |
| R | Pluralization "1 contratos" / "3 caso(s)" |

### P2

| # | Issue | From tracker |
|---|---|---|
| S | Merge Networks/Intersection/Capture → `/relationships` | #016 |
| T | Story chart bilingual coverage (12 of 41) | #007 |
| U | Pick the 5 launch stories | #008 |
| V | Orphan chart kills + green-token fix + RiskPyramid dedupe + VendorFingerprint lang | #011-#015 |

### Pending decisions

| # | Issue | Recommendation after audit |
|---|---|---|
| W | #017 — Drop `/workspace` | **DROP.** The audit confirms the platform is informational. Add: "Save to bookmarks" advice instead of a workbench feature. |
| X | #018 — Haiku scrape T2/T3 | **DEFER to v1.1.** Audit shows users can't even reliably reach existing T1 dossiers (routing + auto-rotate). Adding more data to a broken UX makes nothing better. Re-evaluate after launch feedback. |

---

## Honest effort recalculation

The previous launch plan said: 12-16 agent-days for full rework, 8 days
to launch. The audit reveals additional P0 work that wasn't in the
original ledger:

| Category | Effort |
|---|---|
| New P0s (A-D — routing, hardcoded number, vendor filter, auto-tour) | 0.5-1 day |
| Existing P1s (E-I — categories filter, institution rework, vendor rework, admin cull, methodology) | 7-10 days |
| New P1s (J-R — IA fixes, mobile breakpoints, bilingual leaks) | 2-3 days |
| Total | **~11-14 agent-days vs 7 days remaining** |

**This does not fit before Friday May 15.** Two paths forward:

1. **Push the launch by 1 week → Friday 2026-05-22.** Use the extra 7 days to actually close P0+P1. This is the honest path.

2. **Hard-cut the launch surface to 6 pages and ship Friday May 15.** Drop VendorProfile rework (#003 → keep tabs, accept the "PowerPoint" feel) and Categories full rework (#002, already deferred). Launch surface becomes: `/`, `/atlas`, `/aria`, `/sectors` family, `/cases`, `/methodology`. Vendor profiles still reachable but un-promoted. This is the disciplined path.

**Recommendation: option 2.** Ship a smaller surface that's correct over a larger surface that's broken.

---

## The new Day 1 (Fri 2026-05-08) — fixes, not reworks

If you confirm option 2:

```
Morning (~3 hours)
  → Fix A: routing bugs (debug + patch in App.tsx)
  → Fix B: replace hardcoded 1,363 with live API read
  → Fix C: vendor case filter (backend)
  → Fix D: Atlas auto-tour gate

Afternoon (~3 hours)
  → Fix E: categories backend filter (Issue #001)
  → Fix M: orphan kill or link price-analysis
  → Fix Q: formatCompactMXN audit (B MXN → MDP in ES)
  → Fix O: missing i18n key ADMINISTRATIONS.MULTIPLE

End of day: 8 P0/P1 issues closed, prod redeployed, audit re-run.
```

**Day 1 closes ~8 of 21 launch-blocker tickets in one focused session.**
The remaining 13 spread across Days 2-7, with Days 6-7 as a hard
buffer for whatever the audit re-run finds.

---

## What this audit changed about the project

1. **The 25% number** (visual quality vs bar) is the new "are we ready?"
   metric. We need that ≥80% across the launch surface before we ship.
   That means InstitutionProfile + Categories + Administrations + 
   VendorProfile (or its narrowing) all moving up.

2. **The "merely informative" framing** in your reasoning for dropping
   /workspace is correct AND it raises the bar on data integrity.
   If the platform is read-only and journalists trust it for one
   number, that number must be right. The hardcoded 1,363 cannot ship.

3. **The Day-2-onward "rework" plan was premature.** You can't rework
   a vendor profile when its parent route auto-redirects to a different
   vendor. Fix the foundation first.

4. **The orphan + data-bug findings shrink scope further.** `/price-analysis`,
   `/explore`, dead routes — every one we delete is one less surface
   to defend on launch day.

---

## Decisions you make tomorrow morning before Day 1 starts

1. **Option 1 (push launch to May 22) or Option 2 (cut surface, ship May 15)?**
2. **Confirm DROP /workspace (#017)?**
3. **Confirm DEFER Haiku scrape (#018) to v1.1?**
4. **Sign off on the new Day 1 plan above?**

Say `option 1` or `option 2` plus any pushback and I start Day 1
with the routing fixes (Fix A) the moment you give the go.

---

*Synthesized 2026-05-07 from 5 parallel Opus ultrathink audits.*
*Agent 4 abandoned mid-task; orchestrator ran the SQL queries inline*
*to complete the data-integrity report. All other reports are*
*verbatim from their respective agents.*
