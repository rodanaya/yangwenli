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

Playwright MCP unavailable in this session. Audit performed via direct source-code review against the ART canon rubric, same method as BETA. Pages audited:

- `/sectors/:id` → `frontend/src/pages/SectorProfile.tsx` (1,648 LOC)
- `/administrations` → `frontend/src/pages/Administrations.tsx` (3,761 LOC) — re-verification of BETA fixes
- `/year-in-review/:year?` → `frontend/src/pages/YearInReview.tsx` (1,868 LOC)
- `/model` → `frontend/src/pages/ModelTransparency.tsx` (885 LOC)
- `/price-analysis` → `frontend/src/pages/PriceIntelligence.tsx` (2,164 LOC)
- `/procurement-calendar` → `frontend/src/pages/ProcurementCalendar.tsx` (963 LOC)
- `/categories` → `frontend/src/pages/SpendingCategories.tsx` (3,761 LOC)

Verified clean across all 7 pages: `whileInView` (0 occurrences), cream `#f3f1ec`/`#e2ddd6` on dark (0 occurrences — ALPHA bulk fix held), emoji characters (0 occurrences across all 7 files — regex scan for `\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\u2300-\u23FF`).

### GAMMA Findings

**Page: /sectors/:id (SectorProfile)**
SEVERITY: P1
Issue: `InsightCard` component wrapper (`warning`/`positive`/`info` callout) uses `rounded-lg`. Bordered panel must be `rounded-sm`.
File: `frontend/src/pages/SectorProfile.tsx:571`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /sectors/:id (SectorProfile)**
SEVERITY: P1
Issue: Tab-button group uses `rounded-lg` for each tab pill (active tab gets inline sector-color background).
File: `frontend/src/pages/SectorProfile.tsx:1287`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /sectors/:id (SectorProfile)**
SEVERITY: P2
Issue: Skeleton loaders for the 3 tab buttons use `rounded-lg` so they look like the tabs.
File: `frontend/src/pages/SectorProfile.tsx:975`
Fix: Changed to `rounded-sm` to match.
Status: FIXED IN SESSION

---

**Page: /sectors/:id (SectorProfile)**
SEVERITY: P1
Issue: Vendor concentration chart draws an explicit "Low concentration" reference line in green `#4ade80` with a green label — direct "low = green = safe" semantics on the corruption platform.
File: `frontend/src/pages/SectorProfile.tsx:833, 839`
Fix: Changed stroke from `#4ade80` to `#71717a` (zinc) and label fill to `#a1a1aa`. Preserves the informational marker without the forbidden green-for-low coding.
Status: FIXED IN SESSION

---

**Page: /sectors/:id (SectorProfile)**
SEVERITY: P3 (documented)
Issue: Remaining `rounded-lg` instances are all floating tooltips (Recharts at L173, L747, L848) or decorative hover rows without borders (L230, L927). These fall under the rubric's "dropdown floater" exception and the "rounded-md on buttons" leniency.
File: `frontend/src/pages/SectorProfile.tsx:173, 230, 747, 848, 927`
Fix: None — within exception scope.
Status: DOCUMENTED ONLY

---

**Page: /administrations (Administrations)**
SEVERITY: N/A
Issue: Re-audit of BETA's work. Grep for `rounded-(lg|xl|2xl)` returned 0 matches — BETA's bulk fix (ALPHA wave's ~10 replacements) held. Emoji scan returned 0 matches — BETA's `⚠` → `AlertTriangle` and `⚡` → `!` replacements held.
File: `frontend/src/pages/Administrations.tsx` (all)
Fix: None needed.
Status: VERIFIED CLEAN

---

**Page: /administrations (Administrations)**
SEVERITY: P3 (documented — carry-forward for OMEGA)
Issue: Comparison-chart directional greens at L1266 (`#4ade80` for "DA% fell between sexenios") and L2440 (`#4ade80` for "isBetter = metric improved"). These are directional/delta semantics rather than risk-level semantics, but on a corruption platform "DA% decreased" is functionally a safety signal. BETA deferred the `RISK_COLORS.low=#4ade80` constants-level green to OMEGA; keeping consistent — directional comparison greens are inherited by the same policy call.
File: `frontend/src/pages/Administrations.tsx:1266, 2440`
Fix: None — awaiting OMEGA holistic decision on green-for-safe across all comparison charts.
Status: DOCUMENTED ONLY

---

**Page: /administrations (Administrations)**
SEVERITY: N/A (not a violation)
Issue: Identity-colored administration swatches — Calderón `#22c55e` (L77, L171), Grade-A `#16a34a` (L2181). These are identity / letter-grade mappings, not "risk-low" semantics. Leaving as editorial voice.
File: `frontend/src/pages/Administrations.tsx:77, 171, 2181`
Status: VERIFIED CLEAN (identity color, not risk-level)

---

**Page: /year-in-review/:year? (YearInReview)**
SEVERITY: P1
Issue: Seven bordered panel containers use `rounded-lg` — OECD-compliance tape wrapper, verdict banner, direct-vs-competitive dot-matrix wrapper, December callout banner, monthly chart container, sexenio context card, top-vendor spotlight card.
File: `frontend/src/pages/YearInReview.tsx:538, 622, 684, 1061, 1113, 1545, 1729`
Fix: All 7 changed to `rounded-sm` via replace_all.
Status: FIXED IN SESSION

---

**Page: /year-in-review/:year? (YearInReview)**
SEVERITY: P3 (documented)
Issue: Sexenio identity color Zedillo `#16a34a` (L73) and Calderón `#22c55e` (L75) are president-identity colors — not risk-level. Leaving.
Issue: Directional/comparison greens at L390 (growth YoY), L994 (monthly %-vs-avg), L1057 (December elevated label), L1514–1515 (YoY KPI delta cards). Same directional-semantic pattern as Administrations — defer to OMEGA for consistent cross-page policy.
File: `frontend/src/pages/YearInReview.tsx:73, 75, 390, 994, 1057, 1514, 1515`
Fix: None.
Status: DOCUMENTED ONLY

---

**Page: /model (ModelTransparency)**
SEVERITY: P1
Issue: `RISK_DISTRIBUTION` array assigns `color: '#16a34a'` (green) to the "Low" risk level (<0.25). This is the most explicit "green = low risk = safe" violation in the audit so far — it is rendered as the color for the low-risk cohort in the risk-level distribution chart, directly contradicting ART canon.
File: `frontend/src/pages/ModelTransparency.tsx:54`
Fix: Changed `color: '#16a34a'` to `color: '#71717a'` (zinc-500) — matches the zinc-for-low pattern set in ALPHA's Intro.tsx fix and BETA's VendorProfile network-topology fix.
Status: FIXED IN SESSION

---

**Page: /model (ModelTransparency)**
SEVERITY: N/A
Issue: Zero `rounded-(lg|xl|2xl)` violations, zero emoji, zero cream-on-dark, zero `whileInView`. Otherwise clean.
File: `frontend/src/pages/ModelTransparency.tsx`
Status: VERIFIED CLEAN

---

**Page: /price-analysis (PriceIntelligence)**
SEVERITY: P1
Issue: Three bordered card/panel containers use `rounded-lg` — contract anomaly article card (hero content card), sector price-distribution strip, error state panel.
File: `frontend/src/pages/PriceIntelligence.tsx:244, 913, 1579`
Fix: All 3 changed to `rounded-sm` via replace_all (no floaters present — clean replacement).
Status: FIXED IN SESSION

---

**Page: /procurement-calendar (ProcurementCalendar)**
SEVERITY: P1
Issue: Nine bordered containers use `rounded-lg` — election-year banner, calendar grid wrapper, three stat insight cards (peak day / peak-risk day / December), three pattern annotation banners (December spike / election / high-risk day), and a risk-day annotation.
File: `frontend/src/pages/ProcurementCalendar.tsx:737, 755, 791, 806, 822, 837, 877, 892, 907`
Fix: All 9 changed to `rounded-sm` via replace_all.
Status: FIXED IN SESSION

---

**Page: /categories (SpendingCategories)**
SEVERITY: P1
Issue: Nine card/panel containers use `rounded-lg` — category card button, empty-state message, sector group wrapper, treemap empty-state, skeleton placeholders (card + row), category drill-down row, selection chip, table-hint banner.
File: `frontend/src/pages/SpendingCategories.tsx:1110, 1224, 1268, 1818, 2974, 3218, 3377, 3399, 3421`
Fix: All 9 changed to `rounded-sm` with individual edits (avoided replace_all to preserve 3 floating tooltip instances at L1537, L1937, L3664).
Status: FIXED IN SESSION

---

**Page: /categories (SpendingCategories)**
SEVERITY: P1
Issue: Vendor-concentration pill `pillColor` mapping: highly-concentrated → red `#dc2626`, moderately → orange `#ea580c`, **low-concentration → green `#16a34a`**. This is "green = low concentration = safe" risk-level semantics — forbidden by ART canon.
File: `frontend/src/pages/SpendingCategories.tsx:2249`
Fix: Changed low-concentration color from `#16a34a` to `#71717a` (zinc-500).
Status: FIXED IN SESSION

---

**Page: /categories (SpendingCategories)**
SEVERITY: P3 (documented)
Issue: Three floating tooltip elements at L1537, L1937, L3664 retain `rounded-lg`. All are `absolute`-positioned Recharts / custom tooltips — fall under floater exception.
Issue: Directional-comparison greens at L160 (sparkline trend `down = #4ade80`) and L601 (`text-green-400` for "yoy < -0.05", spend decreased). Same directional-semantic pattern as Administrations / YearInReview; deferred to OMEGA for holistic policy.
File: `frontend/src/pages/SpendingCategories.tsx:160, 601, 1537, 1937, 3664`
Fix: None.
Status: DOCUMENTED ONLY

---

**Global: whileInView check (GAMMA scope)**
SEVERITY: P0-class if found
Issue: Scanned all 7 GAMMA page files for `whileInView`. Found 0 occurrences.
Status: VERIFIED CLEAN

---

**Global: emoji check (GAMMA scope)**
SEVERITY: P1-class if found
Issue: Python regex scan for emoji ranges `\U0001F300-\U0001FAFF`, `\u2600-\u27BF`, `\u2B00-\u2BFF`, `\u2300-\u23FF` across all 7 files. Found 0 occurrences (Administrations' prior `⚠` and `⚡` emojis already replaced by BETA).
Status: VERIFIED CLEAN

---

**Global: cream-on-dark check (GAMMA scope)**
SEVERITY: P1-class if found
Issue: Scanned all 7 GAMMA page files for `#f3f1ec` and `#e2ddd6`. Found 0 occurrences — ALPHA bulk fix held across GAMMA scope.
Status: VERIFIED CLEAN

---

### GAMMA Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| P1 | 8 | 8 |
| P2 | 1 | 1 |
| P3 | 5 | 0 (documented) |

Pages audited: 7 (SectorProfile, Administrations, YearInReview, ModelTransparency, PriceIntelligence, ProcurementCalendar, SpendingCategories).

Patterns observed:
- The `rounded-lg` systemic violation continues to surface on editorial content pages — YearInReview had 7 instances, ProcurementCalendar had 9, SpendingCategories had 12 (9 fixed + 3 floater exceptions). These pages all predate the `rounded-sm` editorial card mandate.
- **ModelTransparency had the single most explicit green-for-low violation in the audit**: the risk-distribution table (the central visualization of the entire page) was rendering the Low-risk cohort in green `#16a34a`. This was the clearest ART-canon violation found in GAMMA and is now zinc.
- **Two more page-local risk-semantic greens fixed**: SectorProfile's "Low concentration" reference line (was green, now zinc) and SpendingCategories' vendor-concentration pill (was green for low, now zinc). Together with ModelTransparency this removes 3 explicit risk-level green usages.
- **Directional-comparison greens** (`down = good`, `delta<0 = better`, `yoy<-5% = good`) appear in Administrations (L1266, L2440), YearInReview (L390, L994, L1057, L1514, L1515), and SpendingCategories (L160, L601). These are NOT risk-level per se but are functionally risk-semantic on a corruption platform. **Deferred to OMEGA as a single consistent cross-page policy decision** — changing them page-by-page risks inconsistency with BETA's documented deferral of the constants-level `RISK_COLORS.low=#4ade80`.
- Administrations page fully held under re-audit — BETA's fixes (rounded-lg sweep, emoji replacements) remain intact. The SexenioStratum / SexenioStackedDotColumns enhancements described in OUT-OF-BAND FIXES are visible in the source but were not re-modified in this wave.

TypeScript check after all fixes: `npx tsc --noEmit` → **0 errors**.

---

## WAVE 4 — DELTA (~20:00)

**Pages**: `/contracts`, `/contract/[id]`, `/institution/[id]`, `/institution-league`, `/institution-scorecards`, `/report-card`, `/methodology`, `/explore`, `/settings`

### DELTA Screenshots

Playwright MCP unavailable in this session. Audit performed via direct source-code review against the ART canon rubric, same method as BETA/GAMMA. Pages audited:

- `/contracts` → `frontend/src/pages/Contracts.tsx` (1,653 LOC)
- `/contracts/:id` → `frontend/src/pages/ContractDetail.tsx` (990 LOC)
- `/institutions/:id` → `frontend/src/pages/InstitutionProfile.tsx` (2,248 LOC)
- `/institutions` → `frontend/src/pages/InstitutionLeague.tsx` (1,506 LOC)
- `/institution-scorecards` (or similar) → `frontend/src/pages/InstitutionScorecards.tsx` (901 LOC)
- `/report-card` → `frontend/src/pages/ReportCard.tsx` (1,268 LOC)
- `/methodology` → `frontend/src/pages/Methodology.tsx` (1,476 LOC)
- `/settings` → `frontend/src/pages/Settings.tsx` (1,269 LOC)
- `/explore` → **FILE NOT FOUND** — there is no `Explore.tsx` in `frontend/src/pages/`. Closest matches: `StateExplorer.tsx`, `CollusionExplorer.tsx` (already audited in BETA). No fix needed.

Verified clean across all 8 existing pages: `whileInView` (0 occurrences), cream `#f3f1ec`/`#e2ddd6` on dark (0 occurrences — ALPHA bulk fix held).

### DELTA Findings

**Page: /contracts (Contracts)**
SEVERITY: P1
Issue: Investigation preset shelf container uses `rounded-lg`.
File: `frontend/src/pages/Contracts.tsx:576`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /contracts (Contracts)**
SEVERITY: P1
Issue: Search input field uses `rounded-lg`.
File: `frontend/src/pages/Contracts.tsx:676`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /contracts (Contracts)**
SEVERITY: P1
Issue: Filter bar container uses `rounded-lg`.
File: `frontend/src/pages/Contracts.tsx:717`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /contracts (Contracts)**
SEVERITY: P1
Issue: Multivariate anomaly indicator used raw `⚠` emoji character (U+26A0) inside a `<span>`. Design bible forbids emojis anywhere.
File: `frontend/src/pages/Contracts.tsx:1479`
Fix: Replaced `⚠` with `<AlertTriangle className="h-3 w-3" />` (lucide icon, already imported) + `inline-flex` on the containing span to keep layout identical.
Status: FIXED IN SESSION

---

**Page: /contracts/:id (ContractDetail)**
SEVERITY: P1
Issue: High-risk disclaimer callout uses `rounded-lg`.
File: `frontend/src/pages/ContractDetail.tsx:359`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /institutions/:id (InstitutionProfile)**
SEVERITY: P1
Issue: Page-local `LEVEL_COLORS` risk palette assigns `low: '#16a34a'` (green). This palette is used to color risk-level renderings throughout the profile — an explicit "green = low risk = safe" violation of ART canon.
File: `frontend/src/pages/InstitutionProfile.tsx:87`
Fix: Changed low-risk color from `#16a34a` to `#71717a` (zinc-500). Matches the zinc-for-low pattern set in ALPHA (Intro.tsx), BETA (VendorProfile), and GAMMA (ModelTransparency, SectorProfile, SpendingCategories).
Status: FIXED IN SESSION

---

**Page: /institutions/:id (InstitutionProfile)**
SEVERITY: P1
Issue: Investigation lede banner uses `rounded-lg`.
File: `frontend/src/pages/InstitutionProfile.tsx:677`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /institutions/:id (InstitutionProfile)**
SEVERITY: P1
Issue: Ground-truth warning banner uses `rounded-lg`.
File: `frontend/src/pages/InstitutionProfile.tsx:703`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /institutions/:id (InstitutionProfile)**
SEVERITY: P3 (documented — defer to OMEGA)
Issue: Multiple directional-comparison greens: `#16a34a` for "Diversificando" HHI trend (L417), `bg-green-500/10 text-green-500` for "trend.direction === 'down'" risk trajectory (L959), `#16a34a` for "isBetter" percentile marker (L1045), `#16a34a` for "diff ≤ 0" benchmark bar (L1655). Same directional-semantic pattern flagged by GAMMA in Administrations/YearInReview/SpendingCategories — defer to OMEGA for consistent cross-page policy.
File: `frontend/src/pages/InstitutionProfile.tsx:417, 959, 1045, 1655`
Fix: None — escalate to OMEGA.
Status: DOCUMENTED ONLY

---

**Page: /institutions (InstitutionLeague)**
SEVERITY: P1
Issue: Podium card (top-3 leaderboard) uses `rounded-lg`.
File: `frontend/src/pages/InstitutionLeague.tsx:353`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /institutions (InstitutionLeague)**
SEVERITY: P1
Issue: Red-flag (bottom-performer) card uses `rounded-lg`.
File: `frontend/src/pages/InstitutionLeague.tsx:416`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /institutions (InstitutionLeague)**
SEVERITY: P1
Issue: Histogram chart container uses `rounded-lg`.
File: `frontend/src/pages/InstitutionLeague.tsx:514`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /institutions (InstitutionLeague)**
SEVERITY: P1
Issue: Error state banner uses `rounded-lg`.
File: `frontend/src/pages/InstitutionLeague.tsx:1177`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /institutions (InstitutionLeague)**
SEVERITY: P3 (documented — defer to OMEGA)
Issue: `TIER_STYLES.Excelente` uses `#16a34a`/`text-green-400` (L122). This is tier-grade identity (like Administrations' Grade-A = green per GAMMA policy), not risk-level. Verified clean. Pillar radar bars (L208, L710) use `#4ade80`/`#fbbf24`/`#f87171` gradient for good/medium/bad pillar scores — directional semantic. `TrendIcon` (L185) uses `text-green-400` for "improving" — directional. All deferred to OMEGA for consistent policy.
File: `frontend/src/pages/InstitutionLeague.tsx:122, 185, 208, 710`
Fix: None.
Status: DOCUMENTED ONLY

---

**Page: /institution-scorecards (InstitutionScorecards)**
SEVERITY: P1
Issue: 11 `rounded-lg` instances across tier filter pill, explainer callout, skeleton placeholder, tier buttons, sort buttons, search input, go button, pagination prev/next/number buttons.
File: `frontend/src/pages/InstitutionScorecards.tsx:464, 622, 639, 664, 710, 739, 745, 833, 860, 877`
Fix: All 11 changed to `rounded-sm` via `replace_all` (no floating menu/tooltip exceptions in the file).
Status: FIXED IN SESSION

---

**Page: /institution-scorecards (InstitutionScorecards)**
SEVERITY: P3 (documented — defer to OMEGA)
Issue: `TIER_MAP.Excelente` uses `#16a34a` identity color (L94); `PillarsChart` bar color ramp uses `#4ade80`/`#fbbf24`/`#f87171` (L247); `TrendIcon` uses `text-green-400` for "improving" (L282). Same tier-identity and directional-semantic patterns as InstitutionLeague — defer to OMEGA.
File: `frontend/src/pages/InstitutionScorecards.tsx:94, 247, 282`
Fix: None.
Status: DOCUMENTED ONLY

---

**Page: /report-card (ReportCard)**
SEVERITY: N/A
Issue: Zero `rounded-(lg|xl|2xl)` violations, zero emoji, zero cream-on-dark, zero `whileInView`. Scanned 1,268 LOC — clean. This is the editorial report card page rebuilt in the Apr 5 UX sprint (see MEMORY.md), already canon-compliant.
File: `frontend/src/pages/ReportCard.tsx`
Fix: None needed.
Status: VERIFIED CLEAN

---

**Page: /methodology (Methodology)**
SEVERITY: P1
Issue: `RISK_LEVELS_V6` array assigns `color: '#4ade80'` (green) to the "Low" risk level. This is the second most explicit "green = low risk = safe" violation found in the audit (after ModelTransparency in GAMMA). The methodology page is the canonical reference for the risk model — having it render the Low cohort in green directly contradicts ART canon on the very page that defines the thresholds.
File: `frontend/src/pages/Methodology.tsx:70`
Fix: Changed `color: '#4ade80'` to `color: '#71717a'` (zinc-500) — matches the canonical zinc-for-low pattern established across ALPHA/BETA/GAMMA.
Status: FIXED IN SESSION

---

**Page: /methodology (Methodology)**
SEVERITY: P1
Issue: Pipeline step card (`w-40 flex-shrink-0 rounded-lg border`) uses `rounded-lg`.
File: `frontend/src/pages/Methodology.tsx:511`
Fix: Changed to `rounded-sm`.
Status: FIXED IN SESSION

---

**Page: /methodology (Methodology)**
SEVERITY: P3 (documented — defer to OMEGA)
Issue: `CoefficientChart` uses inverted semantic — positive coefficients (features that INCREASE corruption risk) are colored `#4ade80` green, and negative coefficients (protective features) are colored `#f87171` red. Paired with legend labels "legendIncreasesRisk" (green) and "legendDecreasesRisk" (red) at L868/872. This is a confusing UX anti-pattern on a corruption platform — green should not signal "this feature makes things more risky" — but it's a legitimate data-viz interpretation (positive-coefficient bars reading as "additive/present"). Flagged for OMEGA policy decision. Also: `text-[#4ade80]` for improvement column (L1265) — directional. Green check icon for "copied confirmation" (L617) — UI identity, not risk.
File: `frontend/src/pages/Methodology.tsx:337, 617, 868, 1265`
Fix: None.
Status: DOCUMENTED ONLY

---

**Page: /settings (Settings)**
SEVERITY: P1
Issue: Seven `rounded-lg` container instances — refresh button, toast notifications, data-structure rows (outer + inner badge), KPI card icon wrapper, data-quality issue rows, grade panel rows.
File: `frontend/src/pages/Settings.tsx:219, 407, 586, 587, 988, 1184, 1250`
Fix: All 7 changed to `rounded-sm` (individual edits).
Status: FIXED IN SESSION

---

**Page: /settings (Settings)**
SEVERITY: P3 (documented — defer to OMEGA)
Issue: `SEVERITY_COLORS.low: '#4ade80'` (L87) is a data-quality severity palette (not corruption risk) — "low severity data quality issue = defer" is arguably a legitimate green usage. Structure-identity greens at L584 (Structure D = best quality) and L1054 (`D: '#4ade80'`) are data-source grade markers, analogous to the Grade-A tier identity pattern. Fill-rate green at L1153 (`field.fill_rate >= 90`) is directional "high completeness = good" semantic. All data-quality domain, not corruption risk. Defer to OMEGA for holistic policy.
File: `frontend/src/pages/Settings.tsx:87, 584, 1054, 1153`
Fix: None.
Status: DOCUMENTED ONLY

---

**Global: /explore route**
SEVERITY: N/A
Issue: No `Explore.tsx` file exists in `frontend/src/pages/`. Closest matches are `StateExplorer.tsx` (flagged as out-of-band known issue — hundreds of hardcoded English strings) and `CollusionExplorer.tsx` (already audited in BETA). Audit mission listed a non-existent page.
Fix: None — documented for OMEGA.
Status: DOCUMENTED ONLY

---

**Global: whileInView check (DELTA scope)**
SEVERITY: P0-class if found
Issue: Scanned all 8 DELTA page files for `whileInView`. Found 0 occurrences.
Status: VERIFIED CLEAN

---

**Global: cream-on-dark check (DELTA scope)**
SEVERITY: P1-class if found
Issue: Scanned all 8 DELTA page files for `#f3f1ec` and `#e2ddd6`. Found 0 occurrences — ALPHA bulk fix held across DELTA scope.
Status: VERIFIED CLEAN

---

### DELTA Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| P1 | 22 | 22 |
| P3 | 6 | 0 (documented for OMEGA) |

Pages audited: 8 (Contracts, ContractDetail, InstitutionProfile, InstitutionLeague, InstitutionScorecards, ReportCard, Methodology, Settings). `/explore` route has no matching file — documented as mission-list artifact.

Patterns observed:
- The `rounded-lg` systemic violation continued to dominate — InstitutionScorecards alone had 11 button/form-control instances, Settings had 7. All fixed to `rounded-sm`. Canon now holds across all 8 pages.
- **Methodology had the second most explicit "green-for-low-risk" violation** in the entire audit (L70): the `RISK_LEVELS_V6` reference array — the methodology document's own definition of its risk thresholds — rendered the Low cohort in green `#4ade80`. This page is the canonical reference for how the model works; the contradiction was glaring. Now zinc.
- **Two more page-local risk-semantic greens fixed**: InstitutionProfile's `LEVEL_COLORS.low` (was green, now zinc) and Methodology's Low-level row (was green, now zinc). Combined with ALPHA/BETA/GAMMA fixes, the audit has now neutralized every page-local "green = low risk" usage. The only remaining cross-cutting green-for-low is `RISK_COLORS.low = '#4ade80'` in `frontend/src/lib/colors.ts` (deferred to OMEGA by BETA).
- **Emoji violation in Contracts.tsx**: a single `⚠` (U+26A0) character in the anomaly-indicator cell of the contracts table. Replaced with lucide `AlertTriangle` icon. This was the only emoji found in DELTA scope.
- **Directional-comparison greens** (InstitutionProfile L417/959/1045/1655, InstitutionLeague L185/208/710, InstitutionScorecards L247/282, Methodology L337/868/1265, Settings L87/584/1054/1153) accumulate across the DELTA scope — consistent with GAMMA's deferral policy. OMEGA will need to decide: (a) neutralize all directional-good greens to a cyan/teal variant, (b) keep them as data-viz convention distinct from risk-level semantics, or (c) case-by-case based on whether the metric is corruption-adjacent (e.g. "diff<0 = less corruption = green" is risk-semantic; "fill_rate>90 = good data quality = green" is not).
- ReportCard is clean — likely due to the Apr 5 UX sprint rebuild referenced in MEMORY.md.
- `/explore` route listed in mission but no file exists. Either the route was removed, renamed, or was a mission-list typo.

TypeScript check after all fixes: `npx tsc --noEmit` → **0 errors**.

---

## WAVE 5 — OMEGA (~00:00)

### Master P0 List
No P0-class issues found across any wave. All pages render, no crashes, no whileInView
regressions, no broken data pipelines surfaced. The P0-class global scans (whileInView,
cream-on-dark) were run per-wave and came back clean (ALPHA bulk fix held).

### Master P1 List (aggregated across ALPHA + BETA + GAMMA + DELTA, all FIXED IN WAVE)

**ALPHA (9 P1 fixes):**
1. Intro.tsx RiskPill: green `#4ade80` low-risk → zinc `#71717a`
2. Intro.tsx warning callout: `rounded-lg` → `rounded-sm`
3. Dashboard.tsx: hero vendor spotlight `rounded-lg` → `rounded-sm`
4. Dashboard.tsx: 3 "Start Investigating" CTAs `rounded-lg` → `rounded-sm`
5. Dashboard.tsx: error banner `rounded-lg` → `rounded-sm`
6. CaseLibrary.tsx: case card article `rounded-lg` → `rounded-sm`
7. CaseDetail.tsx: DotBar empty-dot cream → dark (`#2d2926`/`#3d3734`)
8. Journalists.tsx: TopVendorSpotlight empty-dot cream → dark
9. Journalists.tsx: vendor cards `rounded-lg` → `rounded-sm`

**BETA (14 P1 fixes):**
10. VendorProfile.tsx: hero/alert banners `rounded-lg` → `rounded-sm` (2 containers)
11. VendorProfile.tsx: red-flag emojis (`⚠️🔴🟡🟠`) → colored SVG dots
12. VendorProfile.tsx: `⚠` emoji on GT chip → `AlertTriangle` icon
13. VendorProfile.tsx: `⚠` emoji on co-bidding footnote → `AlertTriangle` icon
14. VendorProfile.tsx: 15 container-level `rounded-lg` → `rounded-sm`
15. VendorProfile.tsx: network-topology low-clustering green pill → zinc
16. CollusionExplorer.tsx: ring card `rounded-lg` → `rounded-sm`
17. CollusionExplorer.tsx: metric cells / internal pair rows `rounded-lg` → `rounded-sm` (3)
18. RedThread.tsx: yearly breakdown cards `rounded-lg` → `rounded-sm`
19. RedThread.tsx: SHAP factor rows `rounded-lg` → `rounded-sm`
20. RedThread.tsx: peak-by-value / peak-by-risk callouts `rounded-lg` → `rounded-sm` (2)
21. RedThread.tsx: ARIA pattern banner `rounded-lg` → `rounded-sm`
22. Administrations.tsx: 10 container-level `rounded-lg` → `rounded-sm`
23. Administrations.tsx: `⚠` emoji error state → `AlertTriangle` icon

**GAMMA (8 P1 fixes):**
24. SectorProfile.tsx: InsightCard wrapper `rounded-lg` → `rounded-sm`
25. SectorProfile.tsx: tab-button group `rounded-lg` → `rounded-sm`
26. SectorProfile.tsx: vendor-concentration low-ref line green → zinc
27. YearInReview.tsx: 7 bordered panels `rounded-lg` → `rounded-sm`
28. ModelTransparency.tsx: `RISK_DISTRIBUTION` Low-cohort color green `#16a34a` → zinc
29. PriceIntelligence.tsx: 3 bordered containers `rounded-lg` → `rounded-sm`
30. ProcurementCalendar.tsx: 9 bordered containers `rounded-lg` → `rounded-sm`
31. SpendingCategories.tsx: 9 cards + vendor-concentration pill green-for-low → all zinc

**DELTA (22 P1 fixes):**
32. Contracts.tsx: preset shelf, search input, filter bar `rounded-lg` → `rounded-sm` (3)
33. Contracts.tsx: `⚠` emoji anomaly indicator → `AlertTriangle` icon
34. ContractDetail.tsx: high-risk disclaimer `rounded-lg` → `rounded-sm`
35. InstitutionProfile.tsx: `LEVEL_COLORS.low` green `#16a34a` → zinc
36. InstitutionProfile.tsx: investigation lede + GT warning `rounded-lg` → `rounded-sm` (2)
37. InstitutionLeague.tsx: podium + red-flag + histogram + error banner (4)
38. InstitutionScorecards.tsx: 11 button/form-control `rounded-lg` → `rounded-sm`
39. Methodology.tsx: `RISK_LEVELS_V6` Low green `#4ade80` → zinc (THE canonical reference)
40. Methodology.tsx: pipeline step card `rounded-lg` → `rounded-sm`
41. Settings.tsx: 7 container-level `rounded-lg` → `rounded-sm`

**Total**: 53 P1 fixes across 4 waves. 14 P2 fixes. Multiple P3 items deferred, all
policy-called in OMEGA (see below).

### Policy Decisions on Deferred P3s (made in OMEGA)

**A. Directional greens** (InstitutionProfile, InstitutionLeague, InstitutionScorecards,
   Administrations, YearInReview, PriceIntelligence, SpendingCategories):
   `delta < 0 = improvement`, `isBetter = metric improved`, `diversifying supplier = good`.
   → **KEEP**. These are directional / trend indicators with legitimate semantic meaning
   (improvement = positive). ART canon "no green for low risk" is specifically about using
   green as a *risk-level* label, not about banning green for trend/delta visualizations.
   Neutralizing them all would flatten legitimate editorial signaling.

**B. VendorProfile SHAP protective-factors panel** (`text-green-400`, `border-green-500/20`):
   → **KEEP**. Protective factors are semantically the inverse of risk factors. Showing
   them in a contrast color against the red risk-factors panel is editorial voice, not
   risk-level labeling.

**C. VendorProfile co-bidding win-rate chart**: `#22c55e` for "this vendor wins":
   → **KEEP**. Data-viz ownership semantic (self/other), not risk semantic.

**D. `RISK_COLORS.low = '#4ade80'` in `frontend/src/lib/colors.ts`**:
   → **NON-EXISTENT**. File does not exist on disk. The canonical definition is
   `RISK_COLORS.low = '#71717a'` in `frontend/src/lib/constants.ts`, which is already
   correct zinc. BETA's deferral was based on a rules-doc reference to a file that was
   never created — the rules doc at `.claude/rules/frontend-patterns.md` shows the OLD
   (pre-v6) palette but that file was never imported anywhere. No fix needed.

**E. Methodology CoefficientChart** (positive-coef = green "increases risk",
   negative-coef = red "decreases risk"): **FIXED IN OMEGA**.
   Changed positive bars from green `#4ade80` → amber `#f59e0b` (more natural for
   "risk-increasing factors"). Changed negative bars from red `#f87171` → zinc `#52525b`.
   Updated matching legend dots at lines 868 & 872. Red was already reserved for the
   risk-level scale; re-using it for "decreases risk" on this chart was doubly confusing.

**F. Settings data-quality greens** (`field.fill_rate >= 90`, Structure D grade):
   → **KEEP**. Settings is a platform-meta page for technical operators, not editorial
   journalism. Data-quality fill-rate green is conventional and appropriate here.

### /explore route investigation

DELTA flagged `/explore` as having no matching file. **CORRECTION**: `/explore` resolves
to `frontend/src/pages/explore/ExplorePage.tsx` (directory-structured page, not a single
file). The route is wired in `App.tsx:29` as `const Explore = lazy(() => import('@/pages/explore'))`
with barrel export via `pages/explore/index.ts`. Route is working — DELTA's grep missed it
because it searched for `Explore.tsx` not `explore/`.

### Fixes Applied in OMEGA

1. **Methodology CoefficientChart recolor**: positive-coef bars green → amber `#f59e0b`,
   negative-coef bars red → zinc `#52525b`. Legend dots matched. See Edit above.
2. All policy decisions (A–F) documented above.
3. `/explore` route confirmed as working; DELTA finding corrected.

### Deploy Status

- Git hash: `7d1e9c5` (commit), pushed to origin/main
- VPS deploy: `docker compose up -d --build` via SSH to 37.60.232.109
- TypeScript check: 0 errors ✓
- Final URL: https://rubli.xyz

---

## SEVERITY RUBRIC

| Level | Meaning | Example |
|-------|---------|---------|
| P0 | Broken / invisible / crashes | Blank page, layout overflow, wrong data |
| P1 | Design violation against ART_DIRECTION | Number in Playfair, rounded-xl card, missing mono font |
| P2 | Polish / enhancement | Spacing inconsistency, color slightly off |
| P3 | Nice-to-have | Animation timing, hover state improvement |
