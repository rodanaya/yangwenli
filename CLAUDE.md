# RUBLI: Mexican Government Procurement Analysis

>
> AI-Powered Corruption Detection Platform for Mexican Government Procurement

---

## Core Behavior

### Reasoning Standard
- **Always reason deeply**: Treat every task as non-trivial unless explicitly told otherwise. Read full file context before editing. Consider tradeoffs. Identify second-order effects (e.g., a schema change that breaks an API that breaks a UI component).
- **Think before typing**: For bugs, diagnose root cause before proposing a fix. For features, identify the minimal correct implementation. For refactors, check all call sites first.
- **Surface what you notice**: If you spot a related bug, a missing edge case, or a pattern that will cause problems — say so in one sentence. Don't fix it unsolicited, but don't stay silent either.
- **Uncertainty = say so**: If a solution has real risk or multiple valid approaches, name the tradeoff. Don't default to the most common answer.

### Working Style
- **Implementation first**: When asked to do something, start coding immediately. Only produce a plan document if the user explicitly says "make a plan" or "plan this". Keep plans concise — numbered bullet points, not essays.
- **When interrupted**: If the user says "stop", "wait", or rejects a tool call — immediately pause and ask what they want changed. Do NOT restart the same action or re-enter plan mode. Wait for explicit direction before proceeding.
- **Incremental delivery**: After each file change, show a 1-line summary. Deliver value incrementally rather than building toward a big reveal.
- **No unsolicited refactoring**: Only change what was asked. Don't clean up surrounding code, add docstrings, or improve unrelated things.

### Architecture
- **Backend entry point**: `uvicorn api.main:app --port 8001` from `backend/` directory (NOT `main:app`)
- **DB startup**: `_startup_checks()` in `api/main.py` scans 3.1M rows on startup — takes 30-60s cold. Expected behavior.
- **Test command**: `python -m pytest backend/tests/ -q --tb=short -p no:cacheprovider` (590 tests)

### Language & Compatibility
- **Python 3.11**: No backslashes inside f-string expressions. Use intermediate variables: `val = x\ny = f"{val}"` not `f"{x\n}"`.
- **TypeScript**: Run `npx tsc --noEmit` AND `npm run build` from `frontend/` after changes. Fix all type errors before committing. (`tsconfig.json` is lenient; `tsconfig.app.json` used by build enforces `noUnusedLocals/noUnusedParameters`.)
- **Target**: All 359 backend tests passing. Both `npx tsc --noEmit` and `npm run build` = 0 errors.

### Multi-Agent Coordination
- Before starting DB or scoring pipeline work, ask if another process is already running on that task.
- Do not revert or modify DB scores/WAL files without confirming no parallel work is in progress.
- Check `.claude/ACTIVE_WORK.md` before spawning agents (if it exists) to avoid collisions.
- Two agents must never write to the same DB table or scoring column simultaneously.

### Context & Edit Safety
- **Context decay**: After ~8–10 messages or when switching task domains (e.g. DB work → frontend), re-read relevant files before editing. Do not trust prior memory — compaction may have silently altered context.
- **File read budget**: Files >500 LOC must be read in chunks using `offset`/`limit`. Never assume a single read captured the full file — state this if it matters.
- **Tool result blindness**: Large tool outputs (>50k chars) are silently truncated. If a grep or SQL query returns suspiciously few results, re-run with narrower scope and flag possible truncation.
- **Edit integrity**: Re-read any file immediately before editing it. After editing, re-read to confirm the change applied. Never batch more than 3 edits on the same file without a verification read in between.
- **Rename safety**: When renaming any function, type, or variable — grep separately for: direct calls, type-level references (interfaces/generics), string literals containing the name, dynamic imports/require(), re-exports and barrel files, and test mocks. One grep is not enough.
- **STEP 0 for large refactors**: Before any structural refactor of a file >300 LOC, first remove dead props, unused exports, unused imports, and debug logs in a separate commit. Start the real work only after that cleanup is in.

---

## Quick Reference

| Item | Value |
|------|-------|
| **Database** | `backend/RUBLI_NORMALIZED.db` |
| **Records** | ~3.1M contracts (2002-2025) |
| **Validated Value** | ~9.9T MXN (after outlier removal) |
| **Sectors** | 12 main sectors |
| **Backend Port** | 8001 |
| **Frontend Port** | 3009 |

---

## Quick Commands

```bash
# Development
/dev all                    # Start backend + frontend
/dev status                 # Check server status

# Data Processing
/validate-data <filepath>   # Validate COMPRANET data
/etl                        # Run ETL pipeline

# Common Operations
/clear                      # Reset conversation context
/help                       # Show available commands
```

---

## Critical Data Rules

### Amount Validation (MEMORIZE THIS)

| Value Range | Action |
|-------------|--------|
| > 100B MXN | **REJECT** - Data error, exclude from analytics |
| > 10B MXN | **FLAG** - Include but mark for manual review |
| <= 10B MXN | Accept normally |

**Why**: The ogulin project had 7 contracts with TRILLION peso values that destroyed all analytics. These were decimal point errors.

For detailed validation rules, see @.claude/rules/data-validation.md

---

## 12-Sector Taxonomy

| ID | Code | Ramo Codes | Color |
|----|------|------------|-------|
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

## Risk Scoring Model

**Model versions** — v3.3 (weighted checklist), v4.0 (statistical), v5.1 (preserved), v6.4 (preserved), v6.5 (active), v5.2 (analytical engine):

> **DB STATE (2026-03-25)**: All 3,051,294 contracts rescored with v6.5 model (`risk_model_version='v6.5'` tag, run ID: CAL-v6.1-202603251039). HR=13.49% OECD compliant (critical 6.01%, high 7.48%). precomputed_stats done.
> v6.5 improvements: institution-scoped GT labels (IMSS Ghost -85% noise, COVID -73%, Segalmex -17%); structural FPs excluded (BAXTER, FRESENIUS, INFRA, PRAXAIR); vendor curriculum_weight overrides applied. price_volatility coef healthier (+0.53 vs +1.86 in v6.4).
> Cold-start fix is in place (vendor_rolling_stats point-in-time features, z_vendor_concentration capped at ±5 SD).
> **DO NOT run `_score_v6_now.py`** without verifying calibration sanity (intercept < -0.5, PU c > 0.30).

**v5.2 analytical engine** (scripts, do NOT rescore unless explicitly asked):
- `compute_shap_explanations.py` — exact SHAP for 16 z-score features per vendor
- `compute_ml_anomalies_pyod.py` — IForest + COPOD ensemble anomaly scores (3.1M scale)
- `compute_vendor_drift.py` — KS drift detection vs 2002-2020 training baseline
- `refresh_vendor_communities.py` — lightweight Louvain community refresh
- `calibrate_risk_model_v6_enhanced.py` — Optuna TPE (150 trials), per-vendor cap, per-sector models

### v6.5: Cleaner-Label Calibrated Model (ACTIVE)

Per-sector calibrated risk indicators P(corrupt|z) with institution-scoped GT labels and FP exclusions. **Train AUC: 0.798, Test AUC: 0.828** (vendor-stratified). HR=13.49% OECD compliant (within 2-15% range).

- 9 active features: price_volatility +0.5343, institution_diversity -0.3821, vendor_concentration +0.3749, price_ratio +0.2345, network_member_count +0.1811, same_day_count +0.0945, win_rate +0.0488, direct_award +0.0306, ad_period_days +0.0423
- 13 models: 1 global + 12 per-sector logistic regressions (sectors 6/11/12 fall back to global, n_positive<500)
- Ground truth: **748 cases (windowed, institution-scoped), 603 vendors, ~288K scoped contracts**; structural FPs excluded (BAXTER, FRESENIUS, INFRA, PRAXAIR = is_false_positive=1)
- Curriculum learning: confirmed_corrupt=1.0, high=0.8, medium=0.5, low=0.2; vendor-level curriculum_weight overrides from gt_fp_framework
- Elkan & Noto (2008) PU-learning correction (c=0.3000, floor value)
- Optuna TPE (C=0.0100, l1_ratio=0.9673, 150 trials); intercept=-2.3837 (OECD delta=-0.0040)

**Top predictors**: price_volatility (+0.5343), vendor_concentration (+0.3749), price_ratio (+0.2345), institution_diversity (-0.3821), network_member_count (+0.1811)
**Risk Levels**: Critical (>=0.60), High (>=0.40), Medium (>=0.25), Low (<0.25)
**Distribution**: Critical 6.01% (184K), High 7.48% (229K), Medium 26.84% (821K), Low 59.39% (1.8M); 8,298 NULL (no z-features)

### v4.0: Statistical Framework (preserved in risk_score_v4)

Calibrated probabilities P(corrupt|z) with confidence intervals. **AUC-ROC: 0.942**, high-risk rate: 11.0%.

- 12 z-score features, single global model
- 9 corruption cases, 17 vendors, 21,252 contracts (3 sectors dominated)
- Post-hoc coefficient dampening to reduce overfitting
- **Risk Levels**: Critical (>=0.50), High (>=0.30), Medium (>=0.10), Low (<0.10)

### v3.3: Weighted Checklist (preserved in risk_score_v3)

8-factor model aligned with IMF CRI methodology. **AUC-ROC: 0.584**, Lift: 1.22x.

| Factor | Weight |
|--------|--------|
| Single bidding | 18% |
| Non-open procedure | 18% |
| Price anomaly | 18% |
| Vendor concentration | 12% |
| Short ad period | 12% |
| Year-end timing | 7% |
| Threshold splitting | 7% |
| Network risk | 8% |

**Bonus factors** (added on top): Co-bidding +5%, Price hypothesis +5%, Industry mismatch +3%, Institution risk +3%
**Interaction effects**: 5 pairs, up to +15% bonus. Score capped at 1.0.
**Risk Levels**: Critical (>=0.50), High (0.35-0.50), Medium (0.20-0.35), Low (<0.20)

For methodology details, see @docs/RISK_METHODOLOGY_v6.md (v0.6.5, active), @docs/RISK_METHODOLOGY_v5.md (v5.1, preserved), @docs/RISK_METHODOLOGY_v4.md (v4.0), @docs/RISK_METHODOLOGY.md (v3.3), and @docs/MODEL_COMPARISON_REPORT.md (v3.3 vs v4.0 comparison)

---

## Data Sources

COMPRANET data has 4 different structures with varying quality:

| Structure | Years | Quality | RFC Coverage |
|-----------|-------|---------|--------------|
| A | 2002-2010 | LOWEST | 0.1% |
| B | 2010-2017 | Better | 15.7% |
| C | 2018-2022 | Good | 30.3% |
| D | 2023-2025 | BEST | 47.4% |

**Key Limitation**: Structure A (2002-2010) data quality is lowest - risk scores may be underestimated for this period.

---

## Specialized Agents

7 agents are available for domain-specific tasks. They're triggered automatically based on your request:

| Agent | Trigger When |
|-------|--------------|
| @.claude/agents/data-quality-guardian.md | Processing data, validating files |
| @.claude/agents/schema-architect.md | Designing database, optimizing queries |
| @.claude/agents/risk-model-engineer.md | Tuning risk scores, investigating flags |
| @.claude/agents/network-detective.md | Investigating vendors, detecting collusion |
| @.claude/agents/viz-storyteller.md | Creating visualizations, designing dashboards |
| @.claude/agents/api-designer.md | Adding endpoints, API performance |
| @.claude/agents/frontend-architect.md | Building React components, UI work |

---

## Getting Started

New to this project? Start here:

1. **Read the guide**: @docs/CLAUDE_CODE_GUIDE.md
2. **Learn workflows**: @docs/WORKFLOW_PATTERNS.md
3. **Understand config**: @docs/CONFIGURATION_REFERENCE.md

---

## Project Philosophy

This project follows the **"Ask Before Acting"** pattern:

1. Claude analyzes context
2. Claude asks clarifying questions
3. **You approve/modify/reject**
4. Claude implements with running commentary
5. Claude summarizes what was learned

Nothing irreversible happens without your explicit approval.

---

## Headless & Session Recovery

### Headless mode — for long batch runs
Use `scripts/headless-pipeline.sh` for scoring, ETL, and stats runs that don't need watching:
```bash
./scripts/headless-pipeline.sh "score contracts from id 1500000"
./scripts/headless-pipeline.sh "run precompute_stats"
```
Logs go to `.claude/headless-runs/`. A beep sounds when done (Stop hook).

### Resume interrupted sessions
```bash
claude --continue          # resume the most recent conversation
claude --resume <id>       # resume a specific session by ID
```
Use after cutting a session short — Claude picks up with full context.

### Worktree isolation for risky changes
When spawning Task agents for model retraining, large refactors, or experimental pipeline changes, pass `isolation: "worktree"` so the agent works on a throwaway branch:
```
Task(isolation: "worktree") → agent works on temp branch → review diff → merge or discard
```
Use for: risk model retraining, schema migrations, experimental features.

---

## ARIA: Automated Risk Investigation Algorithm

9-module pipeline that combines risk scores, anomaly detection, external registries, and pattern classification into a unified investigation queue. See `docs/ARIA_SPEC.md` for full spec.

```bash
# Run full pipeline
cd backend && python -m scripts.aria_init_schema && python -m scripts.aria_pipeline
# Generate LLM memos for top vendors
python -m scripts.aria_generate_memos --tier 1 --limit 20
```

| Component | Details |
|-----------|---------|
| **Queue** | 198K vendors (pruned from 320K), 4 tiers by IPS score — T1=285, T2=894, T3=5,151, T4=191,708 |
| **Patterns** | P1 Monopoly (113), P2 Ghost (3.3K), P3 Intermediary (3.3K), P6 Capture (16K), P7 (282) |
| **External** | EFOS (13,960), SFP (544), RUPC (23,704), ASF (692) via Centinela |
| **Frontend** | `/aria` page with tier cards, pattern filter, review workflow |

### CENTINELA: External Registry Scraper

Unified 5-registry scraper feeding ARIA Module 5. Run `python -m scripts.centinela` to refresh.

---

## Important Files

| Purpose | Path |
|---------|------|
| Database | `backend/RUBLI_NORMALIZED.db` |
| ETL Pipeline | `backend/scripts/etl_pipeline.py` |
| Schema Creation | `backend/scripts/etl_create_schema.py` |
| Classification | `backend/scripts/etl_classify.py` |
| ARIA Pipeline | `backend/scripts/aria_pipeline.py` |
| ARIA Memos | `backend/scripts/aria_generate_memos.py` |
| CENTINELA | `backend/scripts/centinela.py` |
| ARIA Spec | `docs/ARIA_SPEC.md` |
| Security Settings | `.claude/settings.json` |
| Personal Settings | `.claude/settings.local.json` |

---

## Frontend v3.0 — Dossiers (current canonical model)

**Started 2026-04-26 · the consolidation of 28 vendor surfaces into a single dossier-driven hypertext platform.** Read these 4 docs before touching anything frontend:

| Doc | What it locks |
|---|---|
| [`docs/FRONTEND_V3_PLAN.md`](docs/FRONTEND_V3_PLAN.md) | THE EXECUTION PLAN — 4 phases, task IDs, Sonnet handoff template |
| [`docs/VENDOR_DOSSIER_SCHEME.md`](docs/VENDOR_DOSSIER_SCHEME.md) | One entity's 10-section editorial template + 5 trust-manifest invariants |
| [`docs/SITE_SKELETON.md`](docs/SITE_SKELETON.md) | All 9 entity dossier types + 5 macro landings + 3 tools + cross-reference graph |
| [`docs/SITE_IA.md`](docs/SITE_IA.md) | URL scheme + sidebar (5 sections / 14 items) + 5 user journeys + persistent UI |
| [`docs/DATA_INTEGRITY_PLAN.md`](docs/DATA_INTEGRITY_PLAN.md) | **5-agent data audit findings + triaged S.* tasks for Sonnet handoff** (memo provenance, GT boost removal, post-ETL refresh, orphan triage, evidence rubric, taxonomy expansion) |

### v3.0 Honest pitch matrix (use these when describing the platform)
| Old claim | Honest version |
|---|---|
| "320 Tier-1 priority leads" | "320 GT-anchored T1 vendors · model-discovery uplift in calibration (S.7)" |
| "1,843 vendor LLM memos" | "~440 LLM-narrative · 699 templated search prompts (visually demoted) · 618 analyst stubs" |
| "1,380 documented corruption cases" | "739 cases with vendor links · 641 orphan placeholders pending mining (S.5)" |
| "$2.84T MXN estimated fraud" | "$2.84T summed from estimated_fraud_mxn (41 cases NULL on this field)" |
| "91-category auto-classification" | "72 active categories covering 99.73% of contracts. Education/Gobernación/Trabajo each have 1 category — taxonomy expansion in S.10-S.12" |

### v3.0 unifying primitives
- `frontend/src/components/ui/EntityIdentityChip.tsx` — **THE** chip used everywhere outside an entity's own dossier. Type-discriminated (vendor / institution / sector / category / case / pattern / network). Routes to canonical dossier route.
- `frontend/src/lib/entity/format.ts` — `formatEntityName(type, name, size)` — single funnel for all entity name rendering.
- `frontend/src/lib/entity/lede.ts` — `getLedeFor(type, ctx)` returns 80-word synthesized lede. Vendor variant truncates `aria_queue.memo_text` intelligently.
- `frontend/src/lib/entity/verdict.ts` — `getVerdictFor(type, ctx)` returns 4-bucket classification (critical/high/medium/neutral) per dossier scheme § 8.

### v3.0 hard rules (every commit must respect)
1. `<EntityIdentityChip>` is the ONLY way to render an entity outside its own dossier. Plain `<Link to={`/vendors/${id}`}>{name}</Link>` is forbidden.
2. Risk thresholds via `getRiskLevelFromScore` from `@/lib/constants` (v0.6.5: 0.60/0.40/0.25). No inline ladders.
3. Vendor names through `formatVendorName` or `formatEntityName(type, name, size)`. No raw `{vendor.name}` or `toTitleCase(vendor.name)`.
4. Canonical data sources: `vendor_stats.*` for vendor numbers, `category_stats.*` for categories, `institution_stats.*` for institutions. Deprecate raw `vendors.avg_risk_score`.
5. Risk copy: "indicador de riesgo" / "risk indicator" — never "X% probability of corruption".
6. Spanish § kickers for editorial sections. English fallback via i18n.
7. No green for low risk (Bible §3.10). `low` renders as `text-text-muted`.
8. Every commit message cites which doc + § section it implements: e.g. `feat(dossier P3 § 2): Category Dossier La Demanda section`.

### v3.0 sidebar (5 sections / 14 items)
```
DESCUBRIR  Inteligencia Nacional · Sala de Redacción · Brief Ejecutivo
INVESTIGAR La Cola (ARIA) · Mi Espacio · Casos
EXPLORAR   Categorías · Sectores · Instituciones · Patrones · Red
ANÁLISIS   Captura · Administraciones · La Intersección
PLATAFORMA Metodología
```

5 NEW entries vs v2.1: Categorías (the user-flagged landmark), Patrones, Sala de Redacción, Brief Ejecutivo, Mi Espacio. Renamed `/capture` → `/captura` (Spanish-first per editorial bible).

---

## Frontend Foundations (post-Apr 2026 redesign marathon — v2.1 baseline)

The 53-commit Spring 2026 redesign ("ship-by-Monday") consolidated the
40-page frontend onto a small set of canonical primitives. Future work
should consume these instead of reinventing.

### Shared lib modules
- `frontend/src/lib/tiers.ts` — 5-tier transparency system (Excelente / Satisfactorio / Regular / Deficiente / Critico) with hex + tailwind classes. Used by `InstitutionLeague`, `InstitutionScorecards`, all entity scorecards.
- `frontend/src/lib/administrations.ts` — Mexican federal terms (Fox / Calderón / Peña Nieto / AMLO / Sheinbaum) with year boundaries. Replaces 4 duplicate definitions.
- `frontend/src/lib/compare-colors.ts` — `COMPARE_HEX.{a,b}` for A-vs-B comparison pages. Slot A = editorial gold, B = OECD cyan. Bible §3.10-compliant (no green for safety).
- `frontend/src/lib/constants.ts` — `RISK_COLORS`, `SECTOR_COLORS`, `RISK_THRESHOLDS`, `getRiskLevelFromScore`. **Always import from here**; do not redefine locally.

### Canonical UI primitives
- `<DotBar value max color>` — fixed N=22 dot strip. Replaced 11+ inline reimplementations across entity profiles, AriaQueue, ReportCard, etc.
- `<DotBarRow label readout value max>` — labeled variant.
- `<StatRow stats columns>` — flat label+value grid (no card chrome). Replaces the "card-per-stat" pattern.
- `<PriorityAlert flags>` — single alert that takes a sorted flag list and renders highest-severity as a headline + rest as pills. Replaced the 5 stacked alert banners on VendorProfile.
- `<SortHeaderTh field activeField order onSort>` — canonical sortable table-header cell with aria-sort.

### Vendor dossier composition
- `frontend/src/components/vendor/{VendorHero, VendorEvidenceTab, VendorActivityTab, VendorNetworkTab}.tsx` — VendorProfile rewrite (4,733 → 330 LOC composition).
- `frontend/src/components/vendor/buildFlags.ts` — pure function `buildVendorFlags(input): PriorityFlag[]` consolidating GT / EFOS / SFP / ARIA / co-bidding signals.
- `frontend/src/hooks/useVendorData.ts` — consolidates 18 useQuery calls with tab-deferred fetches.

### Auth shell
- `frontend/src/components/auth/{AuthShell, AuthField}.tsx` — shared masthead + form-input primitives for `LoginPage` + `RegisterPage`.

### CI gate
- `frontend/scripts/lint-tokens.mjs` + `npm run lint:tokens` — fails if any forbidden pattern (`text-red-400`, `bg-emerald-*`, `#2d2926`, etc) re-enters `src/pages` or `src/components`. Run before commit.

### Ship reports archive
The marathon committee reports live under `.claude/marathon/`:
- `SHIP_CHECKLIST.md` — 6 quality control bands (B1 Build · B2 Tokens · B3 Integrity · B4 A11y · B5 i18n · B6 Visual)
- `SHIP_REPORT.md` — final sign-off + 10-URL demo path
- `ship-signoff-matrix.md` — 40 pages × 6 bands
- `ship-audit-{visual,functional,integrity,a11y,perf}.md` — original committee findings
- `ship-audit-{visual,integrity,a11y}-2nd-pass.md` — independent verification

---

*RUBLI — open-source procurement intelligence platform for Mexican federal contracting data.*
