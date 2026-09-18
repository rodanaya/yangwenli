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
| 2 | Metodología + El Apagón | `/methodology` `/gap` | `Methodology`, `Gap`, `components/gap/*`, `components/methodology/*` | GOLD/enhance-in-place · 8 changes: gap 10px floor (201→0) · HTML blackout timeline (≥11px at 390) · register semantics + clamp · hero contrast 2.9→5.0 · gap coda (0→3 links) · Plate III·a de-collision (5→0) + dead ModelTimeline removed · validation table split (23→0 empties) · 13px clause prose · `bfa36c3e`+`7f7de3ce`+`d7374f51`, BUILD_ID `2026-09-18-parallax-d2-metodologia-apagon` | ✅ Sep 18 |
| 3 | Sala de Redacción + story template | `/journalists` `/stories/:slug` | `Journalists`, `StoryNarrative`, `stories/*` | 45 sub-10px, **5 live italics (banned)**, 2 footers; story "Analysis as of May 2026" stale; graphics remake stalled at #3 | ⬜ |
| 4 | La Trama | `/network` | `RedesKnownDossier.tsx` | 56 sub-10px (plate captions, cluster index); dossier band Jul 4 | ⬜ |
| 5 | Casos | `/cases` `/cases/:slug` | `CaseLibrary`, `CaseDossier` | 48 sub-10px, 2 footers; El Padrón Jun 10; dossier designus Jul 4 | ⬜ |
| 6 | Captura | `/captura` | `CapturaHeatmap`, capture components | 49 sub-10px (mostly deliberate mono after the Jul-3 compaction), 2 footers | ⬜ |
| 7 | Sectores | `/sectors` `/sectors/:id` | `Sectors`, `SectorDossier`, `ConfoundPlate` | 40 sub-10px; Marimekko Jul 4; toggle restored Jun 24 (keep Plate default) | ⬜ |
| 8 | Sexenios | `/administrations` | `Administrations.tsx` | 37 sub-10px, 2 footers; Los Sobrevivientes Jul 3 | ⬜ |
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
- Hard-coded `#a06820` in `Methodology.tsx`, `DictamenChrome.tsx`, `CalibrationRecord.tsx` → `var(--color-accent)`.
- Coda pattern now lives in two files (`MethodologyCoda`, `GapCoda`) → extract `components/dossier/Coda.tsx` when a third surface needs it.
- `/gap` register → mobile card layout (Day 2 kept the in-wrapper scroll + hint).
- `/gap` mobile: the pinned "2002 · CompraNet" annotation sits 20px above the below-`lg` legend and reads as its first entry — add a gap or a rule between them.
- `CORRUPTION_CASES` / `MODEL_COMPARISON` are static numbers in TSX; `GradeBlock` / `ExceptionCatalog` use raw `#71717a` zinc.
- `GapRecoveryPanel` compact tier tag (10px) on `/dashboard` was bumped but not runtime-verified (Day 10 probe).
