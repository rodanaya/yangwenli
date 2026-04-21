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
- Dashboard & VendorProfile dark-card empty dots: ✅ FIXED (commit 8233261) — all dark-context dots now `#2d2926`/`#3d3734`; cream `#f3f1ec` only on light editorial pages
- `whileInView` regression risk: ALPHA verified zero occurrences — CLEAN

---

## OUT-OF-BAND FIXES (user-directed, between waves)

### Fix 1: Dark empty dots on all dot-matrix charts — commit 8233261
Files: SpendingCategories.tsx, Administrations.tsx, Dashboard.tsx, AdminFingerprints.tsx, DotStrip.tsx
Change: empty dot fill `#f3f1ec` (cream) → `#2d2926` (dark), stroke `#e2ddd6` → `#3d3734`
Impact: Eliminates the "white blobs on dark background" visual issue across all administration/spending charts.

### Enhancement: Site-wide empty dot fix — commit 8320858
**Scope**: 84 TSX files across all of `frontend/src/`
**Change**: Empty dot fill `#f3f1ec` → `#2d2926`, stroke `#e2ddd6` → `#3d3734` via Python bulk replace
**Skipped**: `Executive.tsx`, `Intro.tsx` (light-mode pages with legitimate cream usage)
**Impact**: Eliminates "white blob" effect on dark backgrounds across every chart, modal, widget, and story chart in the platform.

### Enhancement: SexenioStratum dot-matrix redesign — commit 8320858
**Component**: `frontend/src/components/charts/SexenioStratum.tsx` (Dashboard "23 years of federal procurement")
**Change**: Full rewrite replacing rectangular bars with dot-matrix protocol
- ROWS=22 dots per column, DOT_R=3, DOT_GAP=8 (canonical RUBLI dot vocabulary)
- Amber `#f59e0b` = high/critical risk (top of filled); zinc `#52525b` = low/medium (bottom)
- Dark empty dots `#2d2926` above filled region — consistent with dark-context protocol
- Party background bands: PAN blue `#1a5276`, PRI red `#c41e3a`, MORENA purple `#7b2d8b` at 5% opacity
- OECD 15% reference line at row 3 from top — marks the amber threshold boundary
- Pulse animation on current-year topmost amber dot preserved
- Hover tooltip + click-to-year navigation preserved

### Enhancement: Sexenio Spending chart editorial upgrade — commit 1107842
**Chart**: "Spending by Administration: How Government Purchases Changed"
**File**: `frontend/src/pages/SpendingCategories.tsx` — `SexenioStackedDotColumns` component
**Data** (totals verified against DB):
| Administration | Total | Years | Party |
|---------------|-------|-------|-------|
| Fox | 614.4B MXN | 01–06 | PAN |
| Calderón | 1.6T MXN | 07–12 | PAN |
| Peña Nieto | 2.0T MXN | 13–18 | PRI |
| AMLO | 1.9T MXN | 19–24 | MORENA |
| Sheinbaum | 557.1B MXN | 25– | MORENA (partial) |

**Changes made:**
- Value label: `fontSize=9 #a1a1aa` → `fontSize=13 bold #d4d4d8` — number now dominates as the primary reading target
- "MXN" unit: separated to small `fontSize=7` subscript so the number reads clean
- Party accent bar: 2px colored `<rect>` above each column (PAN `#1a5276` blue, PRI `#c41e3a` red, MORENA `#7b2d8b` purple) — embeds political context without annotation clutter
- Administration years: "01–06" / "07–12" etc in `font-mono` below each name
- Partial-term marker: "partial" text below Sheinbaum — her 557.1B reflects only ~1yr of a 6-yr term
- Scale context: "≈50B MXN/dot" in top-left so readers can decode column height differences
- VALUE_H: 18→28 / LABEL_H: 28→46 / container: 380→430px for proper breathing room
- Empty dots: `fillOpacity` 0.7 (were 1.0 — full opacity cream was the "white" complaint)
- Filled dots: `fillOpacity` 0.85→0.9 (stronger contrast filled vs empty)
- Legend dot: `r=4` → `r=5` (more legible at small sizes)

**GAMMA wave** should also audit `/administrations` which has similar dot-matrix columns — verify the same enhancements apply there.

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

Playwright MCP unavailable in this session. Audit performed via direct source-code review against the ART canon rubric, cross-referencing the same patterns ALPHA caught via screenshots. Pages audited via grep + context reads:

- `/vendor/:id` → `frontend/src/pages/VendorProfile.tsx` (5,299 LOC)
- `/collusion` → `frontend/src/pages/CollusionExplorer.tsx` (1,782 LOC)
- `/thread/:vendorId` → `frontend/src/pages/RedThread.tsx` (1,277 LOC)
- `/patterns` → redirects to `/administrations` → `frontend/src/pages/Administrations.tsx` (3,761 LOC)
- `/investigation/:id` → `frontend/src/pages/InvestigationCaseDetail.tsx` (1,729 LOC)

Verified clean: `whileInView` (0 occurrences), cream `#f3f1ec`/`#e2ddd6` on dark (0 occurrences — confirming the ALPHA bulk fix held).

### BETA Findings

**Page: /vendor/:id (VendorProfile)**
SEVERITY: P1
Issue: Top-of-page CRITICAL/WARNING alert banners for EFOS/GT and amber variants use `rounded-lg`. All banner/panel containers must use `rounded-sm`.
File: `frontend/src/pages/VendorProfile.tsx:1228, 1255`
Fix: Changed both to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /vendor/:id (VendorProfile)**
SEVERITY: P1
Issue: Red-flags evidence block used emoji characters as severity icons: `⚠️`, `🔴`, `🟡`, `🟠`. Design bible explicitly forbids emojis anywhere. The icons were embedded in a flag data structure rendered as plain `<span>` text.
File: `frontend/src/pages/VendorProfile.tsx:1713–1755, 1775`
Fix: Removed the `icon` string property from flag data. Replaced emoji rendering with a semantic SVG-style colored circle dot (`h-2 w-2 rounded-full`) whose fill color is derived from the severity (`#dc2626` critical / `#ea580c` high / `#eab308` medium) — matches the editorial severity palette, preserves information density, removes all emoji.
Status: FIXED IN SESSION

---

**Page: /vendor/:id (VendorProfile)**
SEVERITY: P1
Issue: Ground-truth case chip used raw `⚠` emoji prefix before the case name.
File: `frontend/src/pages/VendorProfile.tsx:1621`
Fix: Replaced `⚠ {case_name}` with `<AlertTriangle className="h-3 w-3" />` (lucide icon, already imported) + case name; added `inline-flex items-center gap-1.5` to the Link.
Status: FIXED IN SESSION

---

**Page: /vendor/:id (VendorProfile)**
SEVERITY: P1
Issue: Co-bidding heuristic footnote used `⚠` emoji prefix.
File: `frontend/src/pages/VendorProfile.tsx:1843`
Fix: Replaced with `<AlertTriangle className="h-3 w-3 flex-shrink-0" />` + text span.
Status: FIXED IN SESSION

---

**Page: /vendor/:id (VendorProfile)**
SEVERITY: P1
Issue: Multiple panel/card containers used `rounded-lg` — co-bidding alert, ground-truth banner, flags evidence block, hero risk panel, high-clustering alert, suspicious-patterns row, partner co-bidder cards, clustering coefficient pill, closed-triangles pill, ARIA tier banner, KPICard wrapper, SummaryRow, InstitutionList rows, skeleton box.
File: `frontend/src/pages/VendorProfile.tsx:1762, 1828, 1851, 1933, 3858, 3895, 3942, 4014/4018/4023, 4057, 4122, 4369, 4569, 4584, 4670`
Fix: All changed to `rounded-sm` (15 container-level replacements).
Status: FIXED IN SESSION

---

**Page: /vendor/:id (VendorProfile)**
SEVERITY: P1
Issue: Network Topology low-clustering pill used `green-500` border / `text-green-400` number / `text-green-400/80` label. This is risk-semantic green for a "low clustering = safe" interpretation on a corruption platform — forbidden by ART canon.
File: `frontend/src/pages/VendorProfile.tsx:4023, 4035, 4045`
Fix: Replaced all three green classes with neutral `zinc-500`/`zinc-400` — matches ART-canon "use zinc for low risk" rule.
Status: FIXED IN SESSION

---

**Page: /vendor/:id (VendorProfile)**
SEVERITY: P2
Issue: "Copiar parrafo" and "Descargar evidencia CSV" action buttons used `rounded-lg`.
File: `frontend/src/pages/VendorProfile.tsx:5267, 5293`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /vendor/:id (VendorProfile)**
SEVERITY: P3 (NOT fixed — documented)
Issue: Co-bidding win-rate chart uses `#22c55e` (green) for "this vendor wins" dots alongside partner color for "partner wins". This is data-viz semantic (own/other), not risk-semantic (low/high). Kept as-is.
File: `frontend/src/pages/VendorProfile.tsx:3972`
Fix: None — neutral data-viz context, leaving.
Status: DOCUMENTED ONLY

---

**Page: /vendor/:id (VendorProfile)**
SEVERITY: P3 (NOT fixed — documented)
Issue: Protective-factors `Card` uses `text-green-400` for SHAP values and `border-green-500/20`. This is "protection against risk" semantic — forbidden green by a strict reading of the canon, but serves a legitimate editorial purpose (protective factors are factually inverse to risk and should read as reassuring contrast). Leaving until OMEGA decides.
File: `frontend/src/pages/VendorProfile.tsx:2220, 2223, 2240`
Fix: None — escalate to OMEGA for policy call.
Status: DOCUMENTED ONLY

---

**Page: /collusion (CollusionExplorer)**
SEVERITY: P1
Issue: Ring card `<article>` container uses `rounded-lg overflow-hidden`. Top-level content card must be `rounded-sm`.
File: `frontend/src/pages/CollusionExplorer.tsx:325`
Fix: Changed to `rounded-sm overflow-hidden`.
Status: FIXED IN SESSION

---

**Page: /collusion (CollusionExplorer)**
SEVERITY: P1
Issue: Metric cells (value/label blocks) and internal pair rows use `rounded-lg`.
File: `frontend/src/pages/CollusionExplorer.tsx:916, 962, 1134`
Fix: All changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /collusion (CollusionExplorer)**
SEVERITY: P2
Issue: Number input and sort select use `rounded-lg`. Form controls slightly more forgiving, but normalizing to canon.
File: `frontend/src/pages/CollusionExplorer.tsx:1067, 1084`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /collusion (CollusionExplorer)**
SEVERITY: P2
Issue: Skeleton placeholder box and pagination prev/next buttons use `rounded-lg`.
File: `frontend/src/pages/CollusionExplorer.tsx:1647, 1689, 1704`
Fix: All changed to `rounded-sm` (replace_all).
Status: FIXED IN SESSION

---

**Page: /collusion (CollusionExplorer)**
SEVERITY: P3 (documented)
Issue: Member chip for dominant vendor prefixes name with `★ ` (black star glyph U+2605). Not an emoji technically, but decorative ornamentation. Leaving; canon allows geometric marks.
File: `frontend/src/pages/CollusionExplorer.tsx:942`
Fix: None.
Status: DOCUMENTED ONLY

---

**Page: /thread/:vendorId (RedThread)**
SEVERITY: P1
Issue: Yearly breakdown cards use `rounded-lg`.
File: `frontend/src/pages/RedThread.tsx:336`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /thread/:vendorId (RedThread)**
SEVERITY: P1
Issue: SHAP factor rows use `rounded-lg` border container.
File: `frontend/src/pages/RedThread.tsx:413`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /thread/:vendorId (RedThread)**
SEVERITY: P1
Issue: Peak-by-value and peak-by-risk annotation cards use `rounded-lg`.
File: `frontend/src/pages/RedThread.tsx:651, 656`
Fix: Both changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /thread/:vendorId (RedThread)**
SEVERITY: P1
Issue: ARIA pattern meta banner uses `rounded-lg`.
File: `frontend/src/pages/RedThread.tsx:904`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /patterns → /administrations (Administrations)**
SEVERITY: P1
Issue: Dossier no-scandals empty state, scandal list rows, fingerprint grid cells, tab switcher, incomplete-dataset warning, evidence-section card, YoY transitions cards, procurement-grade card, and three election-year comparison cards all use `rounded-lg`.
File: `frontend/src/pages/Administrations.tsx:534, 552, 664, 1162, 1315, 1496, 1548, 1993, 2195, 3321/3341/3361`
Fix: All ~10 container replacements changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /patterns → /administrations (Administrations)**
SEVERITY: P1
Issue: Data-unavailable error state used raw `⚠` emoji as span text.
File: `frontend/src/pages/Administrations.tsx:1065`
Fix: Replaced `<span className="text-destructive text-xl">⚠</span>` with `<AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />` (already imported).
Status: FIXED IN SESSION

---

**Page: /patterns → /administrations (Administrations)**
SEVERITY: P2
Issue: Breaking-point marker in YoY chart used `⚡` emoji inside `<text>` SVG node.
File: `frontend/src/pages/Administrations.tsx:1794`
Fix: Replaced glyph with `!` (ASCII exclamation) — still visible as a compact alert marker, no emoji.
Status: FIXED IN SESSION

---

**Page: /patterns → /administrations (Administrations)**
SEVERITY: P3 (documented)
Issue: Non-election card at line 3347 uses `RISK_COLORS.low` which equals `#4ade80` (green) per `frontend/src/lib/colors.ts`. This crosses the ART-canon "no green for low risk" rule at a global constants level, not a page-local concern. Fixing it here would be inconsistent — it is a cross-cutting concern for OMEGA wave.
File: `frontend/src/pages/Administrations.tsx:3345`
Fix: None — logged for OMEGA synthesis. Changing the constants file will ripple through 20+ files and must be done holistically.
Status: DOCUMENTED ONLY

---

**Page: /investigation/:id (InvestigationCaseDetail)**
SEVERITY: N/A
Issue: File is entirely clean against audit rubric — no `rounded-lg` on cards (only `rounded-full` on pill badges, which is canonical), no emojis, no cream-on-dark, no green low-risk, no `whileInView`.
File: `frontend/src/pages/InvestigationCaseDetail.tsx`
Fix: None needed.
Status: VERIFIED CLEAN

---

**Global: whileInView check**
SEVERITY: P0-class if found
Issue: Scanned all 5 BETA page files for `whileInView`. Found 0 occurrences.
Status: VERIFIED CLEAN

---

**Global: cream-on-dark check**
SEVERITY: P1-class if found
Issue: Scanned all 5 BETA page files for `#f3f1ec` and `#e2ddd6`. Found 0 occurrences — the ALPHA bulk fix held.
Status: VERIFIED CLEAN

---

### BETA Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| P1 | 14 | 14 |
| P2 | 4 | 4 |
| P3 | 4 | 0 (documented) |

Pages audited: 5 (VendorProfile, CollusionExplorer, RedThread, Administrations, InvestigationCaseDetail).

Patterns observed:
- The systemic `rounded-lg` violation was even more pervasive in BETA than ALPHA — VendorProfile alone had 15 container-level instances. The legacy dark-theme pages predate the `rounded-sm` card mandate.
- Emoji violations concentrate in VendorProfile's red-flag list and smaller occurrences in Administrations error/chart markers. Replaced with lucide `AlertTriangle` icons and colored severity dots — preserves information density without the casual feel of emoji.
- InvestigationCaseDetail is the only BETA page that was already clean — it was redesigned recently (per the editorial sprint mentioned in OUT-OF-BAND FIXES).
- Cross-cutting P3: `RISK_COLORS.low = '#4ade80'` (green) in `frontend/src/lib/colors.ts` violates canon at the constants level. Deferred to OMEGA for holistic fix — changing one usage without the others would be worse than the status quo.

TypeScript check after all fixes: `npx tsc --noEmit` → **0 errors**.
Build check: `npm run build` → **success in 1m 13s, 0 errors**.

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
