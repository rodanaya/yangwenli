# RUBLI — Mexican Government Procurement Analysis

AI-powered corruption detection for Mexican federal procurement. ~3.1M contracts (2002–2025), ~9.9T MXN validated value.

---

## Core Behavior

### Reasoning
- **Reason deeply by default.** Read full file context before editing. Consider second-order effects (schema → API → UI). Diagnose root cause for bugs; identify the minimal correct implementation for features.
- **Surface what you notice** in one sentence — don't fix unsolicited, don't stay silent.
- **Name tradeoffs** when there are multiple valid approaches. Don't default to the most common answer.

### Working Style
- **Implementation first.** Start coding immediately. Only produce a plan doc when the user says "make a plan".
- **When interrupted ("stop", "wait", reject) — pause and ask.** Don't restart the same action.
- **Incremental delivery.** 1-line summary after each file change.
- **No unsolicited refactoring.** Only change what was asked.

### Edit Safety
- After ~8–10 messages or when switching domains (DB → frontend), re-read relevant files before editing.
- Files >500 LOC: read in chunks via `offset`/`limit`.
- Tool outputs >50K chars are silently truncated — re-run with narrower scope if results look thin.
- Re-read after editing to confirm; never batch >3 edits on the same file without verification.
- **Renames**: grep separately for direct calls, type refs, string literals, dynamic imports, re-exports/barrels, test mocks.
- **STEP 0 for refactors >300 LOC**: dead-code cleanup commit first, real work second.

### Multi-Agent Coordination
- Check `.claude/ACTIVE_WORK.md` before DB or scoring work.
- Two agents must never write to the same DB table or scoring column simultaneously.

---

## Architecture

| Item | Value |
|---|---|
| Database | `backend/RUBLI_NORMALIZED.db` |
| Backend | `uvicorn api.main:app --port 8001` from `backend/` (NOT `main:app`) |
| Frontend | `npm run dev` from `frontend/` → port 3009 |
| Backend tests | `python -m pytest backend/tests/ -q --tb=short -p no:cacheprovider` (590 tests) |
| Frontend gate | `npx tsc --noEmit` AND `npm run build` from `frontend/` — both 0 errors |
| Token gate | `npm run lint:tokens` from `frontend/` — fails on raw hex / forbidden tailwind |

**Python 3.11**: no backslashes inside f-string expressions — use intermediate variables.
**`tsconfig.app.json`** (used by build) enforces `noUnusedLocals`/`noUnusedParameters`. `tsconfig.json` is lenient.
**Cold-start DB scan**: `_startup_checks()` scans 3.1M rows on backend boot (30–60s). Expected.

---

## Critical Data Rules

| Contract value | Action |
|---|---|
| > 100B MXN | **REJECT** — data error, exclude |
| > 10B MXN | **FLAG** — include but mark for review |
| ≤ 10B MXN | Accept |

Why: 7 trillion-peso decimal errors destroyed analytics in the predecessor project.

---

## 12-Sector Taxonomy

| ID | Code | Ramo | Color |
|---|---|---|---|
| 1 | salud | 12, 50, 51 | #dc2626 |
| 2 | educacion | 11, 25, 48 | #3b82f6 |
| 3 | infraestructura | 09, 15, 21 | #ea580c |
| 4 | energia | 18, 45, 46, 52, 53 | #eab308 |
| 5 | defensa | 07, 13 | #1e3a5f |
| 6 | tecnologia | 38, 42 | #8b5cf6 |
| 7 | hacienda | 06, 23, 24 | #16a34a |
| 8 | gobernacion | 01-05, 17, 22, 27, 35, 36, 43 | #be123c |
| 9 | agricultura | 08 | #22c55e |
| 10 | ambiente | 16 | #10b981 |
| 11 | trabajo | 14, 19, 40 | #f97316 |
| 12 | otros | (default) | #64748b |

---

## Risk Model — v0.6.5 (ACTIVE)

Per-sector calibrated logistic regression with PU correction. Run ID `CAL-v6.1-202603251039` · Train AUC 0.798 · Test AUC 0.828 · HR 13.49% (OECD 2–15% compliant).

**Distribution**: Critical ≥0.60 (6.01%) · High ≥0.40 (7.48%) · Medium ≥0.25 (26.84%) · Low <0.25 (59.39%) · 8,298 NULL.

**9 active features** (16 total, 7 regularized to 0): price_volatility +0.534, institution_diversity −0.382, vendor_concentration +0.375, price_ratio +0.234, network_member_count +0.181, same_day_count +0.094, win_rate +0.049, ad_period_days +0.042, direct_award +0.031. Intercept −2.384. PU c=0.300 (floor).

**Curriculum learning** weights GT cases (confirmed 1.0 / high 0.8 / medium 0.5 / low 0.2). Structural FPs excluded: BAXTER, FRESENIUS, INFRA, PRAXAIR.

**DO NOT** run `_score_v6_now.py` without verifying calibration sanity (intercept < −0.5, PU c > 0.30).

**Preserved scores**: `risk_score_v5` (v5.1, AUC 0.957), `risk_score_v4` (v4.0, AUC 0.942), `risk_score_v3` (v3.3 checklist). Full methodology lives in `docs/RISK_METHODOLOGY_v6.md` — read on demand, not auto-loaded.

---

## Data Sources

COMPRANET has 4 structures with varying quality:

| Structure | Years | RFC Coverage | Notes |
|---|---|---|---|
| A | 2002–2010 | 0.1% | Lowest — risk underestimated |
| B | 2010–2017 | 15.7% | UPPERCASE, 72% direct award |
| C | 2018–2022 | 30.3% | Mixed case, 78% direct award |
| D | 2023–2025 | 47.4% | 100% Partida codes, best |

---

## ARIA — Investigation Pipeline

9-module pipeline → tiered investigation queue. Spec at `docs/ARIA_SPEC.md`.

```bash
cd backend && python -m scripts.aria_init_schema && python -m scripts.aria_pipeline
python -m scripts.aria_generate_memos --tier 1 --limit 20
```

Queue: 198K vendors, T1=285 / T2=894 / T3=5,151 / T4=191,708. Patterns: P1 Monopoly, P2 Ghost, P3 Intermediary, P6 Capture, P7. Frontend: `/aria`.

External registries via CENTINELA: `python -m scripts.centinela`.

---

## Frontend v3.0 — Dossiers (canonical model)

**Mission**: consolidate 28 vendor surfaces into a single dossier-driven hypertext platform.

Planning docs (read on demand, not auto-loaded):
- `docs/FRONTEND_V3_PLAN.md` — execution plan, 4 phases, task IDs
- `docs/VENDOR_DOSSIER_SCHEME.md` — 10-section editorial template, trust-manifest invariants
- `docs/SITE_SKELETON.md` — 9 dossier types + 5 landings + 3 tools
- `docs/SITE_IA.md` — URL scheme, sidebar, user journeys
- `docs/DATA_INTEGRITY_PLAN.md` — S.* triage tasks (memo provenance, GT, evidence rubric)

### Hard rules (every commit must respect)

1. `<EntityIdentityChip>` is the **only** way to render an entity outside its own dossier. Plain `<Link to={`/vendors/${id}`}>{name}</Link>` is forbidden.
2. Risk thresholds via `getRiskLevelFromScore` from `@/lib/constants` (0.60 / 0.40 / 0.25). No inline ladders.
3. Vendor names through `formatVendorName` or `formatEntityName(type, name, size)`. No raw `{vendor.name}` or `toTitleCase(vendor.name)`.
4. Canonical data sources: `vendor_stats.*` / `category_stats.*` / `institution_stats.*`. Don't read raw `vendors.avg_risk_score`.
5. Risk copy: "indicador de riesgo" / "risk indicator" — never "X% probability of corruption".
6. Spanish § kickers for editorial sections (English fallback via i18n).
7. No green for low risk (Bible §3.10). `low` → `text-text-muted`.
8. Commit messages cite doc + § (e.g. `feat(dossier P3 § 2): Category Dossier La Demanda section`).

### Unifying primitives

- `frontend/src/components/ui/EntityIdentityChip.tsx` — type-discriminated chip (vendor/institution/sector/category/case/pattern/network).
- `frontend/src/lib/entity/format.ts` — `formatEntityName(type, name, size)`.
- `frontend/src/lib/entity/lede.ts` — `getLedeFor(type, ctx)` → 80-word synthesized lede.
- `frontend/src/lib/entity/verdict.ts` — `getVerdictFor(type, ctx)` → 4-bucket classification.

### Sidebar (5 sections / 15 items)

```
DESCUBRIR  Dashboard · El Atlas · Sala de Redacción
INVESTIGAR La Cola (ARIA) · Mi Espacio · Casos
EXPLORAR   Sectores · Institution Ranking · Networks
ANÁLISIS   Captura · Administraciones · La Intersección
PLATAFORMA Metodología
```

El Atlas was promoted from PLATAFORMA to DESCUBRIR (centerpiece) on 2026-04-28.

### `/atlas` — long-form storytelling surface (Apr 2026)

Page: `frontend/src/pages/Atlas.tsx` · Stories data: `frontend/src/lib/atlas-stories.ts`

The Atlas is a full-viewport constellation of 1,200 dots with four lenses
(PATTERNS / SECTORS / CATEGORIES / TERMS) and a year scrubber 2008–2025.
Critical-risk dots cluster around mode-specific attractors via weighted
Halton draw; nearest-neighbor edges connect them.

V6 (2026-04-28): brief tours replaced by **multi-chapter narratives**:
- **The Pharmaceutical Cartel** (6 ch · ~55s)
- **La Estafa Maestra** (6 ch · ~55s)
- **The COVID Year** (5 ch · ~45s)

Each chapter has Roman-numeral marker, year label, Playfair Display title,
2–3 sentence editorial body, optional pull-stat (big number + caption),
6–12s dwell. Reader can pause/skip/replay; chart is interactive during a
chapter. End-of-story card with replay + try-another + investigate CTAs.

Other Atlas features:
- **Pin a cluster** — pulsing ring persists across mode/year changes
- **Compare years** — second canvas + scrubber, shared lens + pin
- **X-ray filter** — risk-floor: all / medium+ / high+ / critical
- **Vendor search** — typeahead across 21 curated known vendors → auto-pin
- **Personal notes** — localStorage-backed per-cluster
- **URL state sharing** — `/atlas?lens=...&year=...&pin=...` shareable
- **First-visit auto-tour** — launches "The Pharmaceutical Cartel" on first
  load (rubli_atlas_visited_v1 flag)

### `/stories/:slug` — variant-aware chapter rendering (Apr 2026)

Page: `frontend/src/pages/StoryNarrative.tsx`

Chapter layouts auto-pick from 7 variants based on content shape:
`hero`, `feature`, `data-spotlight`, `quote-spotlight`, `connective`,
`closing`, `standard`. See `pickChapterVariant()`.

Each variant has its own typography + width + decorative chrome. Hero
chapters get a constellation-style SVG artwork backdrop. Drop caps via
CSS `::first-letter` (Playfair Display, accent-colored, 5.4em hero /
3.6em feature). Decorative dividers between chapters.

Atlas deep-link CTAs in chart chapters and closing chapters open `/atlas`
with `?lens=...&year=...&pin=...` state — readers can manipulate the live
constellation showing the same data the chapter discusses.

### Spanish currency formatting (Mexican convention)

`formatCompactMXN()` is locale-aware; Spanish output uses:
- **≥10¹²**: "X.X billones MXN" (billón = trillion in Spanish)
- **≥10⁹**: "X,XXX MDP" (mil millones de pesos, abbreviated MDP)
- **≥10⁶**: "X.X MDP"
- **<10⁶**: `formatMXN`

`localizeAmount(string, lang)` runtime helper parses English-format stats
(e.g. `"133.2B MXN"` → `"133,200 MDP"` on `es`) so legacy story-content.ts
strings render correctly without bulk rewrites. Applied in DataPullquote,
StoryHero, StoryCard. Mexican media convention: never use English-loaned
"B MXN" in Spanish UI; always MDP / billones / mil millones.

### Honest pitch matrix (when describing the platform)

| Old claim | Honest version |
|---|---|
| "320 Tier-1 priority leads" | "320 GT-anchored T1 vendors · model-discovery uplift in calibration (S.7)" |
| "1,843 vendor LLM memos" | "~440 LLM-narrative · 699 templated search prompts (visually demoted) · 618 analyst stubs" |
| "1,380 documented corruption cases" | "739 cases with vendor links · 641 orphan placeholders pending mining (S.5)" |
| "$2.84T MXN estimated fraud" | "$2.84T summed from estimated_fraud_mxn (41 cases NULL on this field)" |
| "91-category auto-classification" | "72 active categories covering 99.73%. Education/Gobernación/Trabajo each have 1 — taxonomy expansion in S.10–S.12" |

---

## Frontend Foundations (v2.1 baseline)

### Shared lib

- `frontend/src/lib/constants.ts` — `RISK_COLORS`, `SECTOR_COLORS`, `RISK_THRESHOLDS`, `getRiskLevelFromScore`. **Always import from here.**
- `frontend/src/lib/tiers.ts` — 5-tier transparency system (Excelente / Satisfactorio / Regular / Deficiente / Crítico).
- `frontend/src/lib/administrations.ts` — Mexican federal terms (Fox / Calderón / Peña Nieto / AMLO / Sheinbaum).
- `frontend/src/lib/compare-colors.ts` — `COMPARE_HEX.{a,b}` for A-vs-B pages (no green).

### Canonical UI primitives

- `<DotBar value max color>` / `<DotBarRow label readout value max>` — single dot strip (`@/components/ui/DotBar`). Default geometry N=22, dotR=2, dotGap=5; can override with `dots` / `dotR` / `dotGap` for legacy call sites. **Round dots, fixed pixel width** — never use `preserveAspectRatio="none"` or `w-full` stretch on the SVG.
- `<DotStrip rows>` — multi-row ranked dot matrix (`@/components/charts/editorial`). Bible §4 canonical (N=50, R=3, GAP=8). Pass `colorToken` for semantic colors; use `colorRaw` only when colors come from external lookup tables (sector palette, GRADE_COLORS, etc.).
- `<StatRow stats columns>` — flat label+value grid.
- `<PriorityAlert flags>` — single severity-sorted alert (replaced 5 stacked banners on VendorProfile).
- `<SortHeaderTh field activeField order onSort>` — canonical sortable header with aria-sort.

**Dot-chart rules** (consolidated 2026-04-27):
- `DotBar` for inline single-bar metrics (one value, one bar). `DotStrip` for ranked multi-row visualizations.
- **Never inline `<circle>` dot strips in pages.** The April audit found 50+ inline reimplementations across 25 files; all new code routes through the two primitives above.
- `frontend/src/components/charts/DotStrip.tsx` is a **legacy adapter** that internally renders the editorial primitive. Existing callers stay; new code imports from `@/components/charts/editorial`.

### Vendor dossier composition

- `frontend/src/components/vendor/{VendorHero, VendorEvidenceTab, VendorActivityTab, VendorNetworkTab}.tsx`
- `frontend/src/components/vendor/buildFlags.ts` — pure `buildVendorFlags(input): PriorityFlag[]`
- `frontend/src/hooks/useVendorData.ts` — consolidates 18 useQuery calls

### CI gate

`frontend/scripts/lint-tokens.mjs` (`npm run lint:tokens`) fails on forbidden patterns (`text-red-400`, `bg-emerald-*`, `#2d2926`, etc.) re-entering `src/pages` or `src/components`.

---

## Specialized Agents

Available via `.claude/agents/`. Trigger by describing the task — Claude delegates automatically. Use explicit invocation for ambiguous cases: `Use the design-visionary agent to redesign X`.

| Agent | When |
|---|---|
| data-quality-guardian | Processing/validating data files |
| schema-architect | DB schema, slow queries, migrations |
| risk-model-engineer | Tuning risk scores, investigating flags |
| network-detective | Vendor investigations, collusion |
| viz-storyteller | Visualization design |
| api-designer | New endpoints, API performance |
| frontend-architect | React components, state, perf |
| design-visionary | Editorial UI redesigns (NYT/Economist aesthetic) |
| ground-truth-analyst | GT mining, vendor investigation |

---

## Important Files

| Purpose | Path |
|---|---|
| Database (source) | `backend/RUBLI_NORMALIZED.db` |
| Database (deploy) | `backend/RUBLI_DEPLOY.db` |
| ETL pipeline | `backend/scripts/etl_pipeline.py` |
| ARIA pipeline | `backend/scripts/aria_pipeline.py` |
| Active scoring | `backend/scripts/_score_v6_now.py` |
| WAL checkpoint | `backend/scripts/_wal_checkpoint.py` |
| Settings (team) | `.claude/settings.json` |
| Settings (local) | `.claude/settings.local.json` |
| Active work register | `.claude/ACTIVE_WORK.md` |

---

*RUBLI — open-source procurement intelligence for Mexican federal contracting data.*
