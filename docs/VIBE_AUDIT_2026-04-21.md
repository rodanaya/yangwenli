# RUBLI Vibe Audit — 2026-04-21

> Full-day 5-wave deep analysis of every page. Each agent screenshots rubli.xyz via Playwright,
> audits against ART_DIRECTION.md, fixes P0 issues in-session, and writes findings here.
> OMEGA synthesizes all findings, creates P0 fix list, commits, deploys.

**Started**: 2026-04-21 ~08:00 MX
**Design Bible**: `docs/ART_DIRECTION.md`
**Live site**: https://rubli.xyz
**ART canon**: Playfair Display headlines · Inter body · JetBrains Mono ALL numbers ·
  rounded-sm cards (2px) · dot-matrix SVG · `#f3f1ec` empty dots light / `#2d2926` dark ·
  `whileInView` → `animate` (framer-motion prod fix) · no emojis · no rounded-xl/2xl

---

## WAVE SCHEDULE

| Wave | Time (MX) | Agent | Pages |
|------|-----------|-------|-------|
| ALPHA | ~08:00 | general-purpose | Landing, Dashboard, Executive, ARIA, Cases, CaseDetail, Journalists |
| BETA  | ~12:00 | general-purpose | VendorProfile, CollusionExplorer, RedThread, Patterns, InvestigationCaseDetail |
| GAMMA | ~16:00 | general-purpose | SectorProfile, Administrations, YearInReview, ModelTransparency, PriceIntelligence, ProcurementCalendar |
| DELTA | ~20:00 | general-purpose | Contracts, ContractDetail, InstitutionProfile, InstitutionLeague, InstitutionScorecards, ReportCard, Methodology, Explore |
| OMEGA | ~00:00 | general-purpose | Synthesis + P0 fixes + commit + deploy |

---

## KNOWN PRE-AUDIT ISSUES (carry forward)

- `StateExplorer.tsx`: zero i18n integration — hundreds of hardcoded English strings
- Dashboard & VendorProfile dark-card empty dots: should be `#2d2926`, may have been regressed to cream `#f3f1ec` by supplementary GRAFIKA pass — verify visually
- `whileInView` regression risk: verify any new components added since Apr 20 don't use it

---

## WAVE 1 — ALPHA (~08:00)

**Pages**: `/` (landing/intro), `/dashboard`, `/executive`, `/aria`, `/cases`, `/case/[id]`, `/journalists`

### ALPHA Screenshots
<!-- Agent fills this section -->

### ALPHA Findings

<!-- Agent fills this section — format:
**Page: /pagename**
SEVERITY: P0/P1/P2
Issue: ...
File: frontend/src/pages/Foo.tsx:NN
Fix: ...
Status: FIXED IN SESSION / NEEDS FOLLOW-UP
-->

---

## WAVE 2 — BETA (~12:00)

**Pages**: `/vendor/[id]`, `/collusion`, `/thread/[vendorId]`, `/patterns`, `/investigation/[id]`

### BETA Screenshots
<!-- Agent fills this section -->

### BETA Findings
<!-- Agent fills this section -->

---

## WAVE 3 — GAMMA (~16:00)

**Pages**: `/sector/[id]`, `/administrations`, `/year-in-review`, `/model-transparency`, `/price-intelligence`, `/procurement-calendar`, `/spending-categories`

### GAMMA Screenshots
<!-- Agent fills this section -->

### GAMMA Findings
<!-- Agent fills this section -->

---

## WAVE 4 — DELTA (~20:00)

**Pages**: `/contracts`, `/contract/[id]`, `/institution/[id]`, `/institution-league`, `/institution-scorecards`, `/report-card`, `/methodology`, `/explore`, `/settings`

### DELTA Screenshots
<!-- Agent fills this section -->

### DELTA Findings
<!-- Agent fills this section -->

---

## WAVE 5 — OMEGA (~00:00)

### Master P0 List
<!-- OMEGA aggregates all P0s from ALPHA+BETA+GAMMA+DELTA -->

### Master P1 List
<!-- OMEGA aggregates all P1s -->

### Fixes Applied in OMEGA
<!-- OMEGA documents what it fixed -->

### Deploy Status
<!-- OMEGA records git hash + deploy confirmation -->

---

## SEVERITY RUBRIC

| Level | Meaning | Example |
|-------|---------|---------|
| P0 | Broken / invisible / crashes | Blank page, layout overflow, wrong data |
| P1 | Design violation against ART_DIRECTION | Number in Playfair, rounded-xl card, missing mono font |
| P2 | Polish / enhancement | Spacing inconsistency, color slightly off |
| P3 | Nice-to-have | Animation timing, hover state improvement |
