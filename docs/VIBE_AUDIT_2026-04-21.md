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

All 7 pages screenshotted via Playwright MCP against https://rubli.xyz (live production).
Screenshots saved locally: `landing.png`, `dashboard.png`, `executive.png`, `aria.png`, `cases.png`, `case-detail-imss.png`, `journalists.png`.

Notable from screenshots:
- All pages render correctly in dark mode; Executive is the only light-mode page (uses CSS vars on light bg).
- `/case/295` and `/case/1` both 404 — correct, the route is `/cases/:slug` not `/case/:id`. No bug.
- ARIA queue shows dense vendor list with risk badges, renders well.
- CaseLibrary shows card grid — very dense, readable.
- CaseDetail (IMSS Ghost Company Network) renders full investigation dossier format.

### ALPHA Findings

**Page: / (Landing/Intro)**
SEVERITY: P1
Issue: `RiskPill` component defines local risk colors with green `#4ade80` for "low" risk. Design bible explicitly forbids green for low risk on a corruption platform ("green implies safety").
File: `frontend/src/pages/Intro.tsx:70`
Fix: Changed low-risk color from green `#4ade80` to zinc `#71717a` (matches canonical `RISK_COLORS.low` in constants.ts). Background changed from `rgba(22,163,74,0.12)` to `rgba(113,113,122,0.12)`. Also corrected critical/high/medium to match canonical hex values from ART_DIRECTION.md.
Status: FIXED IN SESSION

---

**Page: / (Landing/Intro)**
SEVERITY: P1
Issue: Warning callout box uses `rounded-lg` (8px radius). Design bible mandates `rounded-sm` (2px) for all card/panel elements.
File: `frontend/src/pages/Intro.tsx:539`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /dashboard**
SEVERITY: P1
Issue: Top Priority Lead vendor spotlight `<section>` uses `rounded-lg`. Per design bible, all bordered panels use `rounded-sm`.
File: `frontend/src/pages/Dashboard.tsx:718`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /dashboard**
SEVERITY: P1
Issue: Three "Start Investigating" CTA cards use `rounded-lg`. Per design bible, card-like bordered containers use `rounded-sm`.
File: `frontend/src/pages/Dashboard.tsx:897, 919, 938`
Fix: Changed all three to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /dashboard**
SEVERITY: P1
Issue: Error banner uses `rounded-lg`.
File: `frontend/src/pages/Dashboard.tsx:496`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /dashboard**
SEVERITY: P2
Issue: Section error fallback `SectionError` uses `rounded-lg`.
File: `frontend/src/pages/Dashboard.tsx:974`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /aria**
SEVERITY: P2
Issue: Methodology footer card uses `rounded-lg`.
File: `frontend/src/pages/AriaQueue.tsx:942`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /aria**
SEVERITY: P3 (dropdown — rounded-lg acceptable for floating menus)
Issue: Sort dropdown floater uses `rounded-lg`. Floating menus are small exception where slight rounding aids usability; leaving as-is.
File: `frontend/src/pages/AriaQueue.tsx:307`
Fix: Not fixed — dropdowns are acceptable exception per editorial discretion.
Status: DOCUMENTED ONLY

---

**Page: /cases**
SEVERITY: P1
Issue: Case card `<article>` element uses `rounded-lg`. All content cards must use `rounded-sm`.
File: `frontend/src/pages/CaseLibrary.tsx:307`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /cases**
SEVERITY: P2
Issue: Stats bar strip uses `rounded-lg overflow-hidden`.
File: `frontend/src/pages/CaseLibrary.tsx:199`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /cases**
SEVERITY: P2
Issue: Skeleton loading cards use `rounded-lg`.
File: `frontend/src/pages/CaseLibrary.tsx:689`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /case/[slug] (CaseDetail)**
SEVERITY: P1
Issue: `DotBar` component renders empty dots with `#f3f1ec` fill and `#e2ddd6` stroke — the light-mode cream colors. The CaseDetail page has a dark background (`BG = '#141210'`). Per design bible: "never cream `#f3f1ec` on dark cards". Dark context mandates `#2d2926` fill and `#3d3734` stroke.
File: `frontend/src/pages/CaseDetail.tsx:62–63`
Fix: Changed empty dot fill to `#2d2926` and stroke to `#3d3734`.
Status: FIXED IN SESSION

---

**Page: /journalists**
SEVERITY: P1
Issue: Top-vendor dots in `TopVendorSpotlight` component use `#f3f1ec` fill and `#e2ddd6` stroke for empty dots inside dark cards (`bg-zinc-900/60`). Same dark-context violation as CaseDetail.
File: `frontend/src/pages/Journalists.tsx:130–131`
Fix: Changed empty dot fill to `#2d2926` and stroke to `#3d3734`.
Status: FIXED IN SESSION

---

**Page: /journalists**
SEVERITY: P1
Issue: Vendor cards in `TopVendorSpotlight` use `rounded-lg`.
File: `frontend/src/pages/Journalists.tsx:114`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /journalists**
SEVERITY: P2
Issue: Two methodology/download CTA buttons use `rounded-lg`.
File: `frontend/src/pages/Journalists.tsx:541, 548`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /case/[id] (numeric route)**
SEVERITY: P2
Issue: The URL pattern `/case/295` (numeric) returns 404. The correct route is `/cases/:slug` (e.g., `/cases/imss-ghost-company-network`). The audit mission used the wrong route format. The 404 page itself renders correctly with editorial styling.
File: N/A (routing issue only — not a code bug)
Fix: No fix needed; route is correct. Noted for documentation.
Status: DOCUMENTED ONLY

---

**Global: whileInView check**
SEVERITY: P0-class if found
Issue: Scanned all 7 page files + all component files for `whileInView`. Found 0 occurrences.
File: N/A
Fix: No fix needed. The `ScrollReveal` hook in `useAnimations.tsx` uses native `IntersectionObserver`, which is fine.
Status: VERIFIED CLEAN

---

**Global: No emojis found**
SEVERITY: N/A
Issue: Scanned all 7 page files for emoji characters. Found 0 occurrences.
Status: VERIFIED CLEAN

---

### ALPHA Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| P1 | 9 | 9 |
| P2 | 5 | 4 |
| P3 | 1 | 0 (documented) |

Key pattern observed: The `rounded-lg` violation is systemic across dark-theme pages. These pages predate the `rounded-sm` editorial card standard and haven't been updated. The dot-chart dark-context violation (`#f3f1ec` on dark bg) was present in CaseDetail and Journalists but NOT in Dashboard (which correctly uses the dark dot colors in its dot-matrix charts). The green low-risk color in Intro.tsx was isolated to a local `RiskPill` component that didn't import from `RISK_COLORS` in constants.ts.

TypeScript check after all fixes: `npx tsc --noEmit` → **0 errors**.

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
