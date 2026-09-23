# PARALLAX — RUBLI UI Enhancement Days (Sep 2026)

> Named after the Green Lantern entity. Invoke a day with **"do parallax day N"** or `/parallax N`.

> One section per day. Fable evaluates and plans, Opus executes, Fable gates.
> Never more than one section in a context window. Decided 2026-09-17.

## Roles

| Who | Does | Never does |
|---|---|---|
| **Fable** (this session) | Morning audit, keep-list, day plan, `/designus` when invention is needed, final judge on screenshots | Write TSX |
| **Opus** (spawned via `Agent` with `model: "opus"`, or a fresh `/model opus` session after `/rinse`) | Implement the day file, run gates, deploy | Redesign beyond the day file |
| Sonnet | Nothing in this program | — |

Fable spawns Opus executors as subagents so the plan-judge context stays small. `/rinse` only at day boundaries.

## Toolkit (what each skill/agent is for)

| Stage | Tool | Why this one |
|---|---|---|
| Audit: rules | `web-design-guidelines` (Vercel, fetches live rule set) | terse `file:line` findings on the page files |
| Audit: design intelligence | `ui-ux-pro-max` (`--domain ux/typography/chart/color`, `--stack react`) | 119 UX rules + chart/typography lookups; use `--domain`, never `--design-system` (we already have a design system: folio aesthetic) |
| Audit: a11y | `accessibility-expert` (ui-design plugin) + `ui-visual-validator` (accessibility-compliance plugin) | WCAG pass, read-only |
| Audit: voice | `rubli-folio-aesthetic` | keeps us in the FT/ICIJ folio voice, not generic SaaS |
| Invention | `/designus` (Fable proposers + synth) | only when the audit says the current design IS the problem |
| Execute | `frontend-developer` (frontend-mobile-development plugin, Opus) or local `frontend-architect`; `/starfox` when the brief is screenshot-driven | one brief, one worktree off origin/main |
| Review | `vercel-react-best-practices` · `code-reviewer` + `architect-review` (comprehensive-review plugin) · `rubli-bilingual-audit` · `ecc:react-reviewer` | perf, correctness, i18n |
| Gates | `tsc -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens` · backend tests if API touched | existing CI gate |
| Ship | `rubli-prod-deploy` | lock-guarded deploy, hash-verified |
| Close | `/rinse <next day>` | durable record, clean context |

Not used: `performance-engineer`/`observability-engineer` (backend perf is a separate track), `design-system-architect` (we are not re-tokenizing), `mobile-developer` (no native app).

## Hard rules carried over

- Gold pages are **enhance-in-place** (`feedback_gold_standard_enhance_in_place`). The audit classifies gold vs weak BEFORE any redesign talk.
- The element the user loves stays the default (`feedback_keep_loved_element_prominent`). Every day file has a **Keep** list written before the **Change** list.
- CLAUDE.md hard rules 1–8 (EntityIdentityChip, risk thresholds, formatVendorName, no green for low, Spanish kickers, currency helper by surface).
- Dot-grid is banned in stories. No italic anywhere (site-wide sweep Jul 3).
- **One measure (Day 2c, Sep 18)**: running text 68ch, h1 32ch, h2/h3 44ch, left/ragged-right, `text-wrap` pretty/balance, justified text banned by lint. Set once in `index.css`; day files never add per-page widths for prose — see `docs/parallax/DAY-02c-measure-standard.md`.
- Max **8 changes per day**. If the audit finds more, the rest go to the backlog at the bottom of this file.
- `/atlas` is **off-limits** until `atlas/molde-editorial` (9 local commits) is pushed, merged and deployed. See ACTIVE_WORK.

## Daily ritual (copy into each day file)

```
1. AUDIT  (Fable, ~30 min, read-only)
   a. screenshot desktop 1440 + mobile 390 (chromium channel msedge, VITE_API_URL=https://rubli.xyz)
   b. web-design-guidelines on the page file(s) + their components
   c. ui-ux-pro-max: 3–5 targeted --domain queries for the concerns found in (b)
   d. accessibility-expert read-only pass
   e. classify: GOLD (enhance-in-place) / WEAK (designus allowed)
2. PLAN   (Fable) → docs/parallax/DAY-NN-<section>.md
   Keep · Change (≤8, each with file + acceptance check) · Out of scope · Risk
   If WEAK and the problem is the design itself → /designus first, then plan.
3. BUILD  (Opus subagent, worktree off origin/main, brief = the day file)
4. REVIEW (Opus: vercel-react-best-practices + code-reviewer + rubli-bilingual-audit; gates)
5. JUDGE  (Fable: before/after screenshots vs acceptance checks; reject or approve)
6. SHIP   (rubli-prod-deploy; verify by served chunk string, not local hash)
7. CLOSE  (/rinse "Day NN+1: <section>")
```

## Schedule

Order is weakest-first. **Re-ranked by the Day 1 site-wide audit (2026-09-17)**: 18 routes captured on prod at 1440 + 390; the "sub-10px" figure is the count of leaf text nodes rendered below the 10px legibility floor (inline `fontSize` the Jul-3 class sweep could not reach); "2 footers" = MainLayout colophon + page footer (Day 1 fixes the shell side). Evidence in `docs/parallax/DAY-01-shell.md § Audit evidence`.

| Day | Section | Route | Files | Entering state | Status |
|---|---|---|---|---|---|
| 0 | Setup + this plan | — | `docs/PARALLAX.md` | 5 wshobson plugins installed (ui-design, accessibility-compliance, frontend-mobile-development, comprehensive-review, application-performance) | ✅ Sep 17 |
| 1 | **Shell + shared primitives** — Sidebar, Header, MobileBottomNav, PlateFrame, EntityIdentityChip, DotBar/DotStrip, DataPullquote, dossier primitives | all | `components/layout/*`, `components/ui/*`, `components/dossier/primitives.tsx`, `index.css` | GOLD/enhance-in-place · 8 changes: AA muted tokens · dialog drawer · header nowrap · bottom-nav Map · MotionConfig · 10px floor + frozen datelines · ARIA · one footer · `e427d5ac`+`2a2d27ee`, BUILD_ID `2026-09-17-parallax-d1-shell`, 68/68 | ✅ Sep 17 |
| 2 | Metodología + El Apagón | `/methodology` `/gap` | `Methodology`, `Gap`, `components/gap/*`, `components/methodology/*` | GOLD/enhance-in-place · 8 changes: gap 10px floor (201→0) · HTML blackout timeline (≥11px at 390) · register semantics + clamp · hero contrast 2.9→5.0 · gap coda (0→3 links) · Plate III·a de-collision (5→0) + dead ModelTimeline removed · validation table split (23→0 empties) · 13px clause prose · `bfa36c3e`+`7f7de3ce`+`d7374f51`, BUILD_ID `2026-09-18-parallax-d2-metodologia-apagon` · **2b (user review, Sep 18)**: plates capped at 760px (13px units rendered ≈19px), Balanza heads/annotations/value clearance, Two Worlds Venn → «Los dos padrones» proportional ledger + legend + tally + 9 named chips · `0c133bb8`+`a0bde80b`, BUILD_ID `2026-09-18-parallax-d2b-plates` — `docs/parallax/DAY-02b-methodology-plates.md` · **2c** site-wide measure directive (`DAY-02c-measure-standard.md`) · **2d** centered 1010px reading frame, 640px text column, 760px figure bleed, 15px clause prose, labels exempt from the measure (`dcef67f2`, `DAY-02d-methodology-reading-frame.md`) — the pattern for every reading page from Day 3 on | ✅ Sep 18 |
| 3 | Sala de Redacción + story template | `/journalists` `/stories/:slug` | `Journalists`, `components/journalists/*`, `StoryNarrative`, `ChapterBanner`, `InlineCharts` | GOLD/enhance-in-place · STEP 0 dead lazy chart registry removed (41 files, 6,982 lines) · 8 changes: journalists 10px floor (45→0) + 5 italics out · valid whole-card links (`a a` 3→0) · story reading frame 1010/640/760 (width set {656…1152}→{640,760,1010}, banner slack 719→40) · hero dateline "Analysis as of May 2026"→`DATA CUT 2025·09·28` + Playfair numerals · ChapterNav labels hover-only, scroll-margin · SVG glyphs at 390 (272→0 sub-10px across 13 stories, `ScrollSvgFrame` scale floor) · landmarks/headings · ReadingProgress extracted (0 chapter re-renders on scroll) · judge fix: 0 clipped SVG annotations at 1440/390 · `a03afc8a`+`154c67b8`+`2360fe23`, BUILD_ID `2026-09-18-parallax-d3-redaccion` — `docs/parallax/DAY-03-redaccion-story-template.md` · **3b (user review, Sep 18)**: one text axis — page/chapter titles, banner text and feature prose were on three different left edges (feature prose 145px off); now every text block on the 640 column, every figure 760 at axis−60, phones on the prose edge, feature sidebar dropped (pullquote in flow) · `9078f774`, BUILD_ID `2026-09-18-parallax-d3b-text-axis` — `docs/parallax/DAY-03b-story-text-axis.md` | ✅ Sep 18 |
| 4 | La Trama | `/network` | `RedesKnownDossier.tsx`, `components/network/*` | GOLD/enhance-in-place · 8 changes: graph + Plano labels → HTML glyphs via new `plateLabels.ts` (46→0 sub-10px, 5.3px/2.3px → 11px, 0 overlaps, full names) · rail rows real buttons, 37–43 clamped buyer names → 0 · toggle-group semantics, 8 headings, one tab stop per graph (49→1), focus rings (50→0) · no opacity-dimmed text (97/139→0) · boxes as wide as their text · reading frame {640, 760, 1152} on one centre line, captions span the figure (`PlateFrame captionFull`), 1024 plate 380→870 · memo + deferred search (0 plate re-renders per keystroke) · census 0/16 EN+ES · judge fix `523daeee` (threshold labels right-anchored) · BUILD_ID `2026-09-22-parallax-d4-la-trama` — `docs/parallax/DAY-04-la-trama.md` | ✅ Sep 22 |
| 5 | Casos | `/cases` `/cases/:slug` | `CaseLibrary`, `CaseDossier`, `components/cases/*` | GOLD/enhance-in-place · 8 changes: ledger rows un-capped (Day 2c `li` measure had cut every name to 4 letters on prod since Sep 18 — 686→1,120px, census 104→8 exempt teasers) · hero numbers never break, `≈US$` sub-line EN only · 10px floor + 4 inline italics → 0 · headings 1→9 on the dossier · focus rings 77→0, `?sort=` in URL, search input named · band 24px with legend-as-control · dossier reading frame 1,176→1,010 centred, column 760, ScaleBlock MXN-only in ES · three figures at 1:1 (timeline + cost field HTML glyphs via `placeLabels`, severity labels off the band; 3.9px→12px, svg-clip 2→0) · judge fix `e493113e` · BUILD_ID `2026-09-22-parallax-d5-casos` — `docs/parallax/DAY-05-casos.md` · **5b** (four-perspective judge): sector ink for type via `getSectorTextColor` (Oceanografía 31 leaves at 1.82:1 → 0), "the only conviction" clause, figure glyph layers `aria-hidden`, BUILD_ID `2026-09-22-parallax-d5b-casos-ink` — `docs/parallax/DAY-05b-casos-sector-ink.md` | ✅ Sep 22 |
| 6 | Captura | `/captura` | `Relationships.tsx`, `components/capture/*` (the row had named the dead `CapturaHeatmap`) | GOLD/enhance-in-place · STEP 0 unrouted `CapturaHeatmap.tsx` + its i18n namespace removed (−1,564 lines) · 6 changes: 1,010 frame / 640 text / 760 plates, 15px prose · film at 1:1 via `useMeasuredWidth` (49→0 sub-10px, svg fills the card, one ceiling y) · cards are disclosure buttons, chips outside (12 `div[role=button]` + 24 nested links → 0) · type inks via `RISK_TEXT_COLORS` / accent-hover (29→5 failing leaves, all ochre 12px+) · ledger fixed columns, no desktop scroller (1,169px in 958 → fits), 760 floor + hint below `lg`, `?registro=&dir=&todas=`, real search input · h2 kickers (h1→h3 skip → 0), Link footer, `role=group` figure, focus ring on shared `SortHeaderTh` · focus 11→0, targets 13→0 · judge fix `7aca10ce` (names break at spaces, lead callout off the line, 2 ES chips in full) · BUILD_ID `2026-09-22-parallax-d6-captura` — `docs/parallax/DAY-06-captura.md` · **6b** (four-perspective Fable panel: reader 72 · architect 82 · a11y 78 · dataviz 71): siglas keep their capitals site-wide (`toTitleCase` guard; 12-string chip diff, 8 siglas + 4 recasings) · card callouts off the line (11/13 → 0/13 hits) · dashed gap bridges + hollow `'25*` partial dot + log-scale funnel caption · six honesty sentences · ledger HHI on one basis, `conc.` dropped, legend, `scope=col`, right-aligned numerics, See-all focus + Show-12 · AX names start with the entity, `scroll-mt-14`, facet heads wrap whole · `hooks/useMeasuredWidth`, nuqs keys `open/ledger/ledger_order/all` · accent-hover inks + chip badge ink (`/captura` = first surface at 0 AA failures) · BUILD_ID `2026-09-22-parallax-d6b-captura-panel` — `docs/parallax/DAY-06b-captura-panel.md` | ✅ Sep 22 |
| 7 | Sectores | `/sectors` `/sectors/:id` | `Sectors`, `SectorDossier`, `components/sectors/*`, `components/sector/*` | GOLD/enhance-in-place · STEP 0 four unrouted story charts removed (−2,086 lines) · 8 changes: 1,010/640 frame + 15px clauses on both pages, DenseReadout labels wrap · both Marimekkos at an 11px floor with HTML annotations, measured (never truncated) column names, focus outline, mobile rows as links (20+26 sub-10px → 0) · ConfoundPlate rows link by name in lens order (WAAPI FLIP), 11px floor, `intensityTextColor` · register rows link by name, `EditorialSparkline decorative` · capture dumbbell at 1:1 with HTML glyphs (41 leaves at 4.5px → 0) · catalog/tree in `getSectorTextColor`/`RISK_TEXT_COLORS` + `fullName` chips · dossier inks (energía 81 → 1 shared fail), Link footer, titles wrap · h2 kickers, labelled register section, every control ringed · judge: values never break across lines, hover-card full names, phone readouts/chips stack · census 0/40 · BUILD_ID `2026-09-22-parallax-d7-sectores` — `docs/parallax/DAY-07-sectores.md` · **7b (four-perspective Fable panel: reader 71 · architect 76 · a11y 79 · dataviz 68)**: one word per measure — Plate lens `saturation`, Register sorts by intensity, nuqs URL state that fits the view · trajectories start in 2002 (backend floor), 2025 marked partial ×4 · dossier axis 0–100%, stat strip 0 holes ×16, "EU scoreboard" + "model mean" on 5 dossiers, no USD in ES, seal names both ladders, `uses_global_model` by run_id · categories plate "highest risk on the table", contract-weighted remainder, 0 label-over-hatch; dumbbell scoped to the 12 largest, real counts + HHI 0–10,000 · two-line `fitLabel` (1 → 5 labelled), drawn `PlateIndex` replaces U+2460 (69 → 0) · Confound decade floor, callouts on paper, "9 of 12" computed, VaR glossed; WHO floor/flags declared, dense layer on phones, rules 6.3:1 · `EntityIdentityChip variant="name"` (6 hand-typed links → 0, hairline rest underline) · face-aware `useFontsReady`, one width hook, one key per endpoint, sweep 24 → 2 requests · a11y: live readouts, `role=img` charts, toggle at every width · three judge rounds (values never break ×4, integer ticks, full tooltip names, 128px intensity column, two-line readout slot, ES "AD%") · backend 887 passed · BUILD_ID `2026-09-23-parallax-d7b-sectores-panel` — `docs/parallax/DAY-07b-sectores-panel.md` | ✅ Sep 22 · 7b Sep 23 |
| 8 | Sexenios | `/administrations` | `Administrations.tsx`, `components/administrations/*` | GOLD/enhance-in-place · STEP 0 unrouted `AdminCycleSmallMultiples` removed (−373) · 8 changes: **one calendar** — the page's own `data.ts` eras (AMLO 2018–24, Sheinbaum 2024–25) → `lib/administrations.ts` (2019–24 / 2025–), fingerprint == Σ § VOLUMEN bars 5/5, `2025*` + partial note on Sheinbaum; the stale `admin_breakdown`/`admin_*_{amlo,sheinbaum}_*` precomputes (2026-05/06, old eras) recomputed on the canonical eras locally and loaded on prod in-container · 1,010 frame / 640 text / 15px prose, one footer, ACT I/II/III as h2 (9 → 12 headings) · seam chart at 1:1 (`useMeasuredWidth`; 8px/5.3px ticks → 11px, average label on paper, band labels under the plot, four cards fit, no 640px scroller at 390) · file card: keyboard tabs (arrows/Home/End, `aria-controls`), 11px floor, no truncated tab or grade label, grade rows, 1:1 mini sparkline, AA inks · § I sparklines decorative (3 `role=application` → 0), "1 contracts" 148 → 0, ledger chips 24px (targets 113 → 0), `RISK_TEXT_COLORS` for every numeral (`#ef4444` ×84 → 0) · «Los Sobrevivientes» at 1:1 with full names via `fitLabel` (17 ellipses → 0, svg text contrast 20 → 0; connectors/colours/order intact) · itinerants rows as disclosure buttons (24 div-buttons → 0), full officer names, header labels never overprint · accent-hover kickers, rings on every control (55 → 0), `?admin=` through nuqs · judge: fingerprint values never break, no hyphenated headers · census 0 at ≥ 1024 · BUILD_ID `2026-09-23-parallax-d8-sexenios` — `docs/parallax/DAY-08-sexenios.md` | ✅ Sep 23 |
| 9 | Institution dossier + ranking | `/institutions` `/institutions/:id` | `InstitutionLeague`, `InstitutionDossier` | league: 9 empty "—" cells, 2 footers; dossier 10 sub-10px; Steel & Ember Jun 9 | ⬜ |
| 10 | Panel (Dashboard) | `/dashboard` | `Executive.tsx` | ⭐ GOLD — enhance-in-place only. Moved up: visible defects — justified hero leaves word gaps, `UPDATED MAY 2026` stale, 8px/7.5px axis text, 2 footers. a11y + perf, no layout change | ⬜ |
| 11 | Categorías | `/categories` `/categories/:id` | `CategoriesIndex`, `CategoryDossier` | 4 sub-10px; El Alzado Jul 3 | ⬜ |
| 12 | Contract dossier + Los Señalados | `/contracts` `/contracts/:id` | `Contracts`, `ContractDossier` | 0 sub-10px; El Sumario Jul 4 | ⬜ |
| 13 | Vendor dossier | `/vendors/:id` | `VendorDossier`, `components/vendor/*` | 0 sub-10px; header wrap at 390 fixed by Day 1; canonical entity, most-visited | ⬜ |
| 14 | La Cola (ARIA) | `/aria` | `AriaQueue.tsx`, `RegisterRow.tsx` | 0 sub-10px, cleanest surface measured despite being untouched since Jul 4 | ⬜ |
| 15 | El Mapa (home) | `/` | `SpatialMap.tsx` + drill-down | 0 sub-10px; mobile-native Jun 23 | ⬜ |
| 16 | El Atlas | `/atlas` | `Atlas.tsx` + `components/atlas/*` | **unblocked** — `atlas/molde-editorial` merged as #41 and is prod (`ff8f1eb1`, BUILD_ID `2026-09-17-atlas-tres-alcances`). 32 sub-10px. Last because freshest | ⬜ |

## Day files

`docs/parallax/DAY-NN-<section>.md` — one per day, written by Fable at step 2, updated with the commit hash and BUILD_ID at step 6.

## Backlog (overflow from daily ≤8 cap)

From Day 1 (shell):
- `--color-accent` #a06820 as small text is 4.14:1 on `--color-background-elevated` (kickers, Folio labels, DQ chip). Design decision needed: darker text-only accent (`--color-accent-hover` #835616?) vs keep amber for large/bold only.
- Header "alerts" shield button navigates to `/methodology` — label and destination disagree.
- `DotStrip` rows with `href` render a raw `<a>` (full reload); only `InstitutionProfile.tsx` passes href. Switch to `<Link>` or drop the prop.
- `DotStrip` renders 50 `motion.circle` per row; a 10-row strip is 500 motion nodes. CSS stagger would be cheaper.
- `ScaleBlock` (dossier primitives) shows a USD line in Spanish; CLAUDE.md says ES surfaces are MXN-only.
- `Header.getParentPath` returns English "Home"; Sidebar has a dead `useAuth()` call; PlateFrame hard-codes font families instead of `--font-family-*` tokens.
- Sidebar mobile drawer is hand-rolled; if Day 1's dialog fix proves brittle, migrate to the existing Radix `Sheet` primitive.
- `ContractDetail.tsx:649` is a third page-level colophon (print route `/print/contracts/:id`) without the `.page-footer` marker — still double-footered. One-line marker when Day 12 touches contracts.
- Header user-menu Escape handler shipped type-checked only (needs a logged-in user to probe). Verify when a session has a JWT.
- Mobile bottom nav: The Network was dropped for El Mapa (Day 1 judgment call). Revert is one line if the user misses it.

From Day 2 (Metodología + El Apagón):
- `RiskExplainer.tsx:66–67` citation glosses render English in ES (shared with the vendor risk tooltip) → Day 13.
- `/methodology` ends with four stacked closers (Coda, ProvenanceFooter, CitationBlock, PageFooter); PageFooter repeats the provenance line. Needs a decision.
- `IndiceRail` has no active-section state (IntersectionObserver + `aria-current`).

From Day 3 (Sala de Redacción + story template):
- `/journalists` colophon + Atlas band stay at the 1152 broadsheet width; the 1010 frame is one class if the user wants it here too.
- `.tabular-nums { font-family: mono }` (index.css:193) silently re-fonts every numeral that does not override inline — site-wide decision.
- Story `MethodologySection` prose is 14px under 17px chapter prose; `PlatformLinks` descriptions 12px — revisit with the 15px clause-prose convention.
- `HeroArtwork` cluster backdrop (70 decorative circles) on every story hero — sanctioned decoration, worth a look on the graphics-remake track (#4).
- `ThresholdDistribution` keeps its own scroll container: overflows 140–300px at 390 with no scroll hint (the other 12 renderers got `ScrollSvgFrame`).
- 17 chart frames scroll horizontally at 390 (mirror ledger, multi-line, Skim register…); the real fix is the "HTML owns glyphs" remake (graphics remake #4+).
- Share button copies the URL silently when `navigator.share` is absent — needs an `aria-live` confirmation.
- Hard-coded `#a06820` in `Methodology.tsx`, `DictamenChrome.tsx`, `CalibrationRecord.tsx` → `var(--color-accent)`.
- Coda pattern now lives in two files (`MethodologyCoda`, `GapCoda`) → extract `components/dossier/Coda.tsx` when a third surface needs it.
- `/gap` register → mobile card layout (Day 2 kept the in-wrapper scroll + hint).
- `/gap` mobile: the pinned "2002 · CompraNet" annotation sits 20px above the below-`lg` legend and reads as its first entry — add a gap or a rule between them.
- `CORRUPTION_CASES` / `MODEL_COMPARISON` are static numbers in TSX; `GradeBlock` / `ExceptionCatalog` use raw `#71717a` zinc.
- `GapRecoveryPanel` compact tier tag (10px) on `/dashboard` was bumped but not runtime-verified (Day 10 probe).

From Day 4 (La Trama):
- `placeLabels` has no data-mark obstacles: the C-3 callout sits over grey marks at 390 and the siege plate's centre label covers two small orbit nodes at 1440. Add the marks near a candidate as obstacles (cheap: ≤239 rects).
- `PlateFrame captionFull` should become the default once the other 13 callers (/atlas, /dashboard, /sectors…) are probed for the caption-spans-the-figure rule.
- RUNG 2 `VendorNetworkView` (1,030 LOC): `max-w-7xl`, breadcrumb `truncate`, own tabs — needs its own half-day; only the nested `<main>` was fixed.
- Sort + pattern filter are not in the URL (`?sort=&pattern=`); rail beyond `content-visibility` (virtualise if the index grows past ~500).
- DA / SB / PU / HHI abbreviations on the rail have no gloss.
- Plate legend at 13px uppercase + 0.14em tracking is louder than the plate it explains.
- Inline `fontFamily` strings in the six network files → `--font-family-*` tokens (Day 1 backlog).
- Ochre accent `#a06820` is 4.44:1 on the page background as small text (Day 1 backlog, decision pending).
- Local backend: the stock uvicorn boot can hang >20 min on a cold disk (startup GROUP BY over 3.1M rows); `_parallax_shots/day04/local_backend.py` skips the scan + warmup for probe runs — consider a `RUBLI_SKIP_STARTUP_CHECKS` env flag in `api/main.py`.

From Day 5 (Casos):
- **Site-wide `<li>` measure QC**: the Day 2c `main :where(li) { max-width: 68ch }` caps any register row nobody bounded — `/cases` lost every name for four days. Probe every page: for each `li` whose parent `ul` is wider than 700px, flag `li.width < ul.width − 40`. Candidates: `/institutions` league rows, `/aria` RegisterRow, vendor dossier lists.
- AgateLedger is a grid of `<Link>`s with an `aria-hidden` column header — no column context for screen readers. `<table>` rebuild is a half-day.
- Dossier § III: the ScaleBlock tile leaves its row half empty when the case has no low/high range.
- CostInArchive drops the archive-maximum callout at 390 when three labels do not fit (documented; consider a two-row label band).
- `clipcensus4.mjs` `content-visibility: visible` override renders closed `<details>` panels and reports them as clipped — skip `details:not([open])`.
- Filter `<details>` menus have no Escape / outside-click close; three closers on the index (Day 2 decision still open); `KeepReadingFooter` hardcodes `43` as a fallback.

From Day 5b (Casos sector ink):
- **`EntityIdentityChip` paints critical-risk names in `RISK_COLORS.critical` #ef4444 at 3.57:1** on the page ground — site-wide, every dossier. `RISK_TEXT_COLORS` is the documented AA twin (`constants.ts:206`). One shared change + a site-wide contrast probe.
- **Process rule (from the Day 2c regression):** any global stylesheet change ships with a before/after census that asserts every register row is as wide as its header (`li.width ≥ ul.width − 40` for wide lists) and re-runs the clip census on all 18 routes.
- Audit rule: contrast lists must not be filtered to "non-accent" — report every failing leaf with its computed colour; sector inks and risk inks used as type are exactly what that filter hid on Day 5.
- Case dossier § I drop cap: vivid sector hex at 49.6px (1.82:1 on energía) and the `charAt(0)` split drops the first letter for AT — use `::first-letter` on the paragraph with the sector text ink.
- Timeline `svg role=img` exposes its year-tick `<text>` after the aria-label (add `aria-hidden` on the tick group).

From Day 6 (Captura):
- Ochre `#a06820` as 12px text at 4.44:1 is now the only failing ink on `/captura` (Folio label, sort active, "see the film", "See all") — the Day 1 decision (accent-hover for small text?) blocks five surfaces.
- `EntityIdentityChip` GT / T1 flag badges paint `#ef4444` at 3.33:1 (visible under `?abrir=` on the receipts) — same shared fix as the Day 5b critical-name item.
- Ledger mobile card layout (the scroller + `← scroll →` hint is the Day 2 precedent; the table needs 760px below `lg`).
- `HHI_CONCENTRATED = 2500` duplicated in `CaptureNowLedger.tsx` and `RedesKnownDossier.tsx` → one constant beside the integrity reference lines in `lib/constants.ts`.
- Inline `"EB Garamond"` / `"IBM Plex Mono"` font strings in the seven capture files → `--font-family-*` tokens (Day 1 backlog).
- The paper-grain `feTurbulence` overlay is a full-page SVG filter — sanctioned decoration, worth a paint-time check on the graphics track.
- `captureAxis.tsx` carries two pre-existing `react-refresh` eslint errors (components + constants in one module); `makeSetParam` moved out, the rest stays.

From Day 6b (Captura panel):
- Data: institutions whose only name is a state code (NL, VER, TLAX, PUE, QRO, APAST, ZAC — 11 ledger chips) and source garbles ("Asiponaacapulco", "Scontinuidad Latam", "ASIPONA- Salina Cruz") need DB names, not UI.
- `formatCompactMXN` prints `277.0B` — the trailing-zero rule is platform-wide.
- `document.title` is never set per page (WCAG 2.4.2, site-wide).
- Search input border 1.28:1 (site token); ledger scroller release keyed to the `lg` viewport rather than the container (`@container` on the wrapper).
- `PageFooter` separators orphan at line ends (shared); `captureAxis.tsx` pre-existing react-refresh eslint errors; raw `#71717a` ×4.
- Process rule confirmed twice now: a change to a shared caser or token ships with a site-wide before/after dump (chips, badges) taken on the untouched build FIRST.

From Day 7 (Sectores):
- `PlateFrame` (shared): `Indexed` stamp at `opacity .55` (2.11:1), `Folio·N` ochre 11px (4.14) and its `·` separators — apply the Day 6b accent-hover decision once inside the primitive (every plate on the site).
- `RISK_TEXT_COLORS.medium` `#a16207` measures 4.36:1 on the paper as 13–14px bold type (the constants comment says "already AA-safe") — one darker step in `constants.ts`, site-wide; `RISK_TEXT_COLORS.high` `#b45309` measures 4.45 on the plate tint.
- `EntityIdentityChip` renders high-risk names in `RISK_COLORS.high` `#f59e0b` (2.04:1) — same class as the Day 5b critical-name item; fix in the chip.
- `WayfindingSpine` `— / —` at `text-muted/40` (2.83:1) on every dossier.
- `pages/InstitutionProfile.tsx` (2,312 lines, unrouted since M5) → Day 9 STEP 0.
- ~~Categories Marimekko labels~~ → Day 7b Change 5 (two-line `fitLabel`, drawn index). ~~Link vs chip~~ → Day 7b Change 7 (`variant="name"`). ~~DenseReadout holes~~ → Day 7b Change 3 (12 units, explicit tracks). ~~Hover readout ellipsis~~ → Day 7b J6 (two-line slot).
- Categories Marimekko labels 1 of 15 columns at 946px (single-line 11px names rarely fit); a two-line label before circling would seat 6–8 — panel question for Day 7b. Treasury is circled on the WHO plate for the same measured reason.
- Sector names on the plate/register are `<Link>`s, not `EntityIdentityChip`s (rule 1) — deliberate, panel question.
- DenseReadout anchors span two tracks; the auto-fit grid leaves a hole after the last single cell of a row (`grid-auto-flow: dense` would fill it but reorder reading order).
- Marimekko tail columns 9–15px wide are 9–15px hit targets; a keyboard list fallback (legend as links) is the honest fix.
- The desktop Marimekko hover readout still ellipsizes long ES sentences at 1024 (fixed-height strip by design).
- Catalog list on phones is a 680px scroller (Day 2/5/6 precedent); a card layout is the real fix.
- `ExposureLedger` sort/expand and `CategoryTreeView` collapsed set are `useState` (not in the URL).

From Day 7b (Sectores panel):
- **X1 route-change focus** (shell): Enter on any link lands with `activeElement = body`; focus `#main-content` on `pathname` change in `MainLayout.tsx` — ships with the next shell touch.
- `/vendors/:id` "Annual risk indicator" chart plots a 0–1 series on a percent axis (0%…1%) — the same bug Day 7b fixed on the sector dossier.
- `api/routers/analysis.py::get_sector_year_breakdown` still returns the 2001 stub (other pages); the sector readers now floor at 2002.
- Dumbbell fetches the slow `/categories/{id}/top-vendors` ×12 (≈15s each under load); a batch/fast route is a backend change.
- `DenseReadout` → fold `anchor` into the shared `StatCell`/`StatStrip` and delete the fork (its range branch is now unused).
- `PlateFrame` `Indexed` stamp is `new Date()` — should print the data cut `2025·09·28`.
- Shared title-caser: multi-word siglas "Caf Mexico", "Ica Constructora", "Cic Corporativo", "Dmgp".
- `what@390` constant 0.81 layout-shift entry on the dumbbell anchor (pre-existing); serif `display=swap` reflow above both plates; `index.html` prefetch pair fetched twice on every route.
- Sparkline per-row auto y-domain and the intensity ring's two-state colour (encoding decisions for a dataviz day).
- Full backend pytest starves the local no-scan backend (export tests scan 3.1M rows) — run it with no probes in flight.

From Day 8 (Sexenios):
- `EntityIdentityChip` high-risk/critical name inks (`#f59e0b` 2.15 / `#ef4444` 3.76) — 86 leaves on the AMLO file's top-100 ledger alone; the shared primitive is the only remaining AA failure on `/administrations`.
- Shared `BenchmarkRow` at phone width clips 12 labels in § II on every file (census 390) — fix in the primitive.
- `TemporalRiskChart` and `TrendsTab` still carry the old calendar (AMLO from 2018) — align with `lib/administrations.ts`.
- § IV top-6 "100% avg. risk" values need a data check (every leader at 100%).
- `/analysis/admin-breakdown` precompute has no refresh path: when `_ADMIN_ERAS` change, the stale `precomputed_stats` rows keep serving old eras (found 2026-09-23: rows from May/June on 2018-based years). Add a stat-key version suffix or a `scripts/precompute_admin_eras.py` run on deploy.
- Pre-existing eslint warnings in the touched files (`exhaustive-deps`).
