# RUBLI

**AI-Powered Corruption Detection Platform for Mexican Government Procurement**

[![Backend Tests](https://github.com/rodanaya/yangwenli/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/rodanaya/yangwenli/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/frontend-tests.yml)
[![CodeQL](https://github.com/rodanaya/yangwenli/actions/workflows/codeql.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/codeql.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://rubli.xyz)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)

🔴 **Live at [rubli.xyz](https://rubli.xyz)**

---

## The Pitch

Mexico's federal government awarded **3.1 million contracts** worth **9.9 trillion pesos** between 2002 and 2025. Most were never investigated. RUBLI changes that.

Using a calibrated statistical risk model validated against 748 documented corruption cases, RUBLI flags procurement contracts that show patterns consistent with fraud — ghost companies, bid rigging, vendor monopolization, price manipulation — and surfaces them to journalists, auditors, and civil society researchers.

**13.49% of all contracts analyzed show high-risk patterns.** That's roughly 413,000 contracts, representing an estimated **MX$1.37 trillion** in potentially irregular spending. RUBLI would have flagged most of the major corruption scandals — IMSS ghost companies, Segalmex, La Estafa Maestra, Odebrecht — before they became public.

> **Score interpretation**: Risk scores measure statistical similarity to documented corruption patterns — not proof of wrongdoing. Use for investigation triage only.

---

## Five Key Findings

1. **13.49%** of federal contracts show patterns consistent with corruption (OECD benchmark: 2–15%)
2. **78%** of AMLO-era contracts bypassed open tender — the highest direct-award rate of any administration since 2002
3. **748 documented cases** were retroactively detected by the model; most were flagged before the scandals broke publicly
4. **Health and Agriculture** sectors concentrate the highest-risk spending: IMSS ghost companies, Segalmex food fraud, COVID-19 procurement abuse
5. The **ghost company problem** is structural: SAT's EFOS registry has 13,960 confirmed fiscal phantoms — most have never been investigated at the contract level

---

## Platform Stats

| Metric | Value |
|--------|-------|
| Contracts analyzed | **3,051,294** |
| Validated procurement value | **~9.9T MXN** (≈ US$580B real 2024) |
| Vendors tracked | **320,429** |
| Institutions | **4,456** |
| Active risk model | **v0.6.5** (per-sector calibrated, OECD-compliant) |
| Train AUC-ROC | **0.798** (vendor-stratified, honest holdout) |
| Test AUC-ROC | **0.828** (vendor-stratified, never-seen data) |
| Ground truth cases | **748** (603 vendors, ~288K scoped contracts) |
| High-risk rate | **13.49%** — critical 6.01% + high 7.48% |
| ARIA investigation queue | **318,441 vendors** — T1=320 critical, T2=1,234 high |

---

## What It Detects

Six corruption typologies documented in the academic and anti-corruption literature:

| Pattern | Signal | Examples in DB |
|---------|--------|----------------|
| **Ghost company networks** | Vendor has no real operations; registered to phantom addresses | IMSS, La Estafa Maestra, SAT EFOS |
| **Vendor monopolization** | Single vendor captures >30% of institutional budget | TOKA IT, Edenred vouchers |
| **Bid rigging** | Competitors consistently bid together but never win against each other | SixSigma/SAT tender |
| **Overpricing** | Contract amounts 3× above sector median | IPN Cartel de la Limpieza |
| **Conflict of interest** | Politically connected vendors winning contracts | Grupo Higa/Casa Blanca |
| **Emergency procurement abuse** | Crisis procedures used to bypass competition for non-emergency purchases | COVID-19 procurement |

---

## Architecture

```
rubli/
├── backend/                  # Python 3.11 / FastAPI REST API
│   ├── api/
│   │   ├── routers/          # 30+ router modules (60+ endpoints)
│   │   ├── services/         # Business logic layer
│   │   └── main.py           # GZip, CORS, startup checks
│   ├── scripts/              # ETL, risk model training, ARIA pipeline, GT mining
│   └── RUBLI_NORMALIZED.db   # SQLite (~6.4 GB — not in repo)
├── frontend/                 # React 18 + TypeScript + Vite
│   └── src/
│       ├── pages/            # 40+ page components
│       ├── components/       # Shared UI — dot-matrix charts, editorial components
│       ├── api/              # Typed API client
│       ├── i18n/             # ES/EN translations (22+ namespaces)
│       └── hooks/            # Custom React hooks
├── docs/                     # Methodology, model docs, ARIA spec, art direction
│   ├── ART_DIRECTION.md      # Design bible: dot-matrix protocol, typography, color
│   ├── ARIA_SPEC.md          # ARIA investigation pipeline specification
│   └── RISK_METHODOLOGY_v6.md # Active model methodology
└── docker-compose.prod.yml   # Production: backend + frontend + Caddy (HTTPS)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | SQLite (WAL mode), 200MB cache, pre-computed aggregate tables |
| Backend | Python 3.11, FastAPI, uvicorn, service layer pattern |
| Frontend | React 18, TypeScript 5, Vite 5, TanStack Query v5 |
| UI | Tailwind CSS v4, custom editorial dark/light theme |
| Visualization | Custom dot-matrix SVG charts (signature visualization), Recharts for time series |
| Risk Model | Per-sector logistic regression, Elkan & Noto PU-learning, SHAP explanations |
| i18n | react-i18next — Spanish (primary) and English |
| Auth | JWT (python-jose), bcrypt (direct, not passlib), email-validator — `POST /api/v1/auth/{register,login,me,logout}` |
| Deploy | Docker Compose + Caddy (auto-TLS via Let's Encrypt) |

---

## Platform Pages

### Overview

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Intelligence brief — risk distribution, sector heatmap, ARIA alerts |
| Executive Summary | `/executive` | 9-section flagship report for journalists and policymakers |
| Year in Review | `/year-in-review` | Annual snapshot — spending, risk rate, administration comparison |

### Investigate

| Page | Route | Description |
|------|-------|-------------|
| ARIA Queue | `/aria` | Investigation priority queue — T1/T2/T3/T4 tiers, 7 pattern types |
| Administrations | `/administrations` | Presidential comparison: Fox through Sheinbaum (dot-matrix fingerprints) |
| Contracts | `/contracts` | Full contract table — risk filtering, sector, year, bookmarks |
| Spending Categories | `/categories` | CUCOP category-level spend analysis — sexenio comparison |
| Price Intelligence | `/price-analysis` | Pricing anomalies, IQR outlier scatter plots |
| Procurement Calendar | `/procurement-calendar` | Month-by-month award timing — year-end rush, December spikes |
| Collusion Analysis | `/collusion` | Co-bidding ring detection, bid-rotation patterns |
| Vendor Clusters | `/clusters` | Community detection — vendor networks by co-contracting graph |
| State Expenditure | `/states` | Federal funds in state/municipal procurement (484K contracts) |
| Explore | `/explore` | Open-ended filter/search across all contracts |
| Workspace | `/workspace` | Saved vendors, investigation folders, tracked cases |

### Profiles

| Page | Route | Description |
|------|-------|-------------|
| Vendor Profile | `/vendors/:id` | SHAP radar, external records, circuit-board network, collusion signals |
| Vendor Compare | `/vendors/compare` | Side-by-side risk profile comparison for 2 vendors |
| Red Thread | `/thread/:vendorId` | Scroll-driven 6-chapter investigative narrative per vendor |
| Institution Profile | `/institutions/:id` | Vendor concentration, sector exposure, risk trends |
| Institution Compare | `/institutions/compare` | Side-by-side institution risk comparison |
| Institution Scorecards | `/scorecards` | Graded transparency scorecards per institution |
| Institution Report Card | `/report-card` | Semáforo grading — Excelente / Satisfactorio / Regular / Deficiente / Crítico |
| Sector Profile | `/sectors/:id` | OECD benchmarks, red flag rates, top vendors |
| Contract Detail | `/contracts/:id` | Full risk breakdown with confidence intervals |
| Case Detail | `/cases/:slug` | Fraud type, timeline, detection signals, impact KPIs |
| Investigative Story | `/stories/:slug` | Long-form editorial narrative with bespoke inline charts |

### Understand

| Page | Route | Description |
|------|-------|-------------|
| Sectors | `/sectors` | 12-sector taxonomy with dot-matrix spend visualization |
| Investigations | `/journalists` | 10 original investigative narratives with bespoke inline charts |
| Model Transparency | `/model` | v0.6.5 coefficients, feature importance, per-sector sub-models |
| Methodology | `/methodology` | Full risk scoring methodology and known limitations |
| API Explorer | `/api-explorer` | Interactive catalog of all 60+ backend endpoints |

---

## Risk Model v0.6.5

The active model uses **per-sector calibrated statistical risk scoring** normalized against sector and year baselines.

### 9 Active Features (Global Model)

| Feature | Coefficient | Interpretation |
|---------|------------|----------------|
| **price_volatility** | +0.5343 | Vendor contract-size variance vs. sector norm — strongest predictor |
| **price_ratio** | +0.4159 | Contract amount / sector median |
| **institution_diversity** | −0.2736 | Vendors serving many institutions are *less* suspicious |
| **vendor_concentration** | +0.2736 | Disproportionate market share within sector |
| **network_member_count** | +0.1404 | Co-contracting network size |
| **same_day_count** | +0.1084 | Threshold-splitting (multiple contracts, same vendor, same day) |
| **ad_period_days** | +0.0781 | Publication period anomaly |
| **single_bid** | +0.0587 | Competitive procedure with only one bidder |
| **direct_award** | +0.0306 | Non-competitive procedure flag |

*7 of 16 features regularized to 0 by near-L1 ElasticNet (C=0.01, l1_ratio=0.9673, Optuna TPE).*

### Risk Levels

| Level | Threshold | Count | % | Action |
|-------|-----------|-------|---|--------|
| **Critical** | ≥ 0.60 | 184,031 | 6.01% | Immediate investigation |
| **High** | ≥ 0.40 | 228,814 | 7.48% | Priority review |
| **Medium** | ≥ 0.25 | 821,251 | 26.84% | Watch list |
| **Low** | < 0.25 | 1,817,198 | 59.39% | Standard monitoring |

**High-risk rate: 13.49%** — within OECD 2–15% benchmark.

### Model Architecture

- **13 models**: 1 global + 12 per-sector logistic regressions
- **PU-learning**: Elkan & Noto (2008), c=0.30 (floor), intercept=−2.3837
- **Hyperparameters**: C=0.01, l1_ratio=0.9673 (Optuna TPE, 150 trials, fixed for reproducibility)
- **Ground truth**: 748 windowed/institution-scoped cases, 603 vendors, ~288K scoped contracts
- **Curriculum learning**: confirmed_corrupt=1.0, high=0.8, medium=0.5, low=0.2 per-sample weights
- **4 structural FPs excluded**: BAXTER, FRESENIUS, INFRA SA DE CV, PRAXAIR (legal monopolies by regulation, `is_false_positive=1`)
- **Z-score cap**: ±5 SD (prevents epsilon-floor explosion in thin sector-year cells)
- **SHAP explanations**: exact linear SHAP per vendor (456K rows in `vendor_shap_v52`)

### Model Evolution

| Version | AUC Train | AUC Test | GT Cases | Key Advancement |
|---------|-----------|----------|----------|-----------------|
| v3.3 | 0.584 | — | — | IMF-aligned weighted checklist |
| v4.0 | 0.951 | — (in-sample) | 9 | Z-score normalization, Mahalanobis |
| v5.1 | 0.964 | 0.957 | 22 | Per-sector sub-models, PU-learning, temporal split |
| v6.4 | 0.840 | 0.863 | ~714 | Optuna TPE, windowed GT labels |
| **v0.6.5** | **0.798** | **0.828** | **748** | Institution-scoped GT, FP exclusions, curriculum learning |

*v0.6.5 AUC lower than v5.1 because: v5.1 had temporal leakage in vendor aggregates; v0.6.5 uses vendor-stratified holdout (no leakage) and a larger, harder GT set.*

### Validated Against Documented Corruption Cases

Training cases include: IMSS Ghost Company Network, Segalmex Food Distribution, COVID-19 Emergency Procurement, La Estafa Maestra, Odebrecht-PEMEX Bribery, Grupo Higa/Casa Blanca, TOKA IT Monopoly, Edenred Voucher Monopoly, SixSigma SAT Tender Rigging, SAT EFOS ghost company network (38 RFC-confirmed), and 738 additional windowed cases across all 12 sectors.

---

## ARIA: Automated Risk Investigation Algorithm

ARIA is a 9-module pipeline combining risk scores, SHAP explanations, financial scale, and external registries into a unified investigation queue.

```
318,441 vendors
  → IPS score (weighted: risk 40% + anomaly 20% + financial scale 20% + external flags 20%)
  → Pattern classifier (P1–P7: monopoly, ghost, intermediary, bid rigging,
                        overpricing, institutional capture, conflict of interest)
  → Tier assignment (T1: critical / T2: high / T3: medium / T4: monitoring)
  → External cross-reference:
      SAT EFOS 13,960 confirmed ghost companies
      SFP sanctions 1,954 debarment records
      RUPC 23,704 contractor registry records
  → Investigation queue with review workflow and memo generation
```

**Current queue (March 2026):** T1=320 · T2=1,234 · T3=5,016 · T4=311,871

Full spec: [`docs/ARIA_SPEC.md`](docs/ARIA_SPEC.md)

---

## Design System

RUBLI has a custom editorial design language documented in [`docs/ART_DIRECTION.md`](docs/ART_DIRECTION.md). The signature element is the **dot-matrix chart** — replacing bar charts throughout the platform.

### The Dot-Matrix Protocol

Each filled dot = one unit of data (stated in the legend). Empty dots = the benchmark. The field of dots reveals the corruption landscape without distorting scale.

```typescript
// Canonical dot-matrix parameters
const N_DOTS  = 50      // dots per row
const DOT_R   = 3       // dot radius (px)
const DOT_GAP = 8       // center-to-center spacing (px)
// EMPTY fill: #f3f1ec (light context) | #2d2926 (dark context)
```

This visualization protocol is used across: Administrations, Sectors, Vendor Profiles, Spending Categories, Ground Truth cases, ARIA queue, and chart components.

### Visual Identity

- **Art provenance**: The Economist · NYT · FT · Der Spiegel
- **Color ground**: cream/parchment `#faf9f6` (light) · near-black warm `#1a1714` (dark)
- **Typography**: Playfair Display (editorial headlines) · Inter (UI/body) · JetBrains Mono (all data values)
- **Risk palette**: red `#ef4444` · amber `#f59e0b` · dark amber `#a16207` · zinc `#71717a`

---

## Data Sources

All procurement data from **COMPRANET**, Mexico's federal electronic procurement system:

| Structure | Years | RFC Coverage | Quality |
|-----------|-------|-------------|---------|
| A | 2002–2010 | 0.1% | Lowest — risk may be underestimated |
| B | 2010–2017 | 15.7% | Better |
| C | 2018–2022 | 30.3% | Good |
| D | 2023–2025 | 47.4% | Best |

### External Data

| Source | Records | Purpose |
|--------|---------|---------|
| SAT EFOS Definitivo | 13,960 RFC-confirmed ghost companies | External flag in ARIA |
| SFP Sanctions | 1,954 debarment records | External flag in ARIA |
| RUPC | 23,704 contractor registry records | Vendor verification |

### Data Validation Rules

- Amounts > 100B MXN: **rejected** (decimal errors — a real COMPRANET problem)
- Amounts > 10B MXN: **flagged** for manual review
- Context: Mexico's entire federal budget is ~8T MXN annually

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- The SQLite database file (`RUBLI_NORMALIZED.db`, ~6.4 GB — not included in repo)

### Development

```bash
# Backend (port 8001)
cd backend
pip install -r requirements-api.txt
uvicorn api.main:app --port 8001 --reload --host 127.0.0.1

# Frontend (port 3009)
cd frontend
npm install
npm run dev -- --port 3009
```

Open `http://localhost:3009`

> **Cold start note**: `_startup_checks()` scans ~3.05M rows on first startup — expect 30–60s. This is expected behavior.

### Docker (Production)

```bash
cp .env.prod.example .env.prod  # fill in VITE_RUBLI_WRITE_KEY
docker compose -f docker-compose.prod.yml up -d --build
```

### Testing

```bash
# Backend (590 tests)
python -m pytest backend/tests/ -q --tb=short -p no:cacheprovider

# TypeScript — BOTH checks required before any commit
cd frontend
npx tsc --noEmit
npm run build
```

---

## API

60+ REST endpoints across 30+ router modules. Interactive docs at [`rubli.xyz/docs`](https://rubli.xyz/docs) or `http://localhost:8001/docs` in dev.

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Fast health check using precomputed stats |
| `GET /api/v1/executive/summary` | Consolidated executive intelligence report |
| `GET /api/v1/contracts` | Paginated contract search with risk/sector/year filters |
| `GET /api/v1/vendors/{id}` | Vendor profile with SHAP radar and risk metrics |
| `GET /api/v1/aria/queue` | ARIA investigation queue with tier/pattern filters |
| `GET /api/v1/analysis/risk-overview` | Platform-wide risk distribution |
| `GET /api/v1/analysis/threshold-gaming` | Threshold-splitting pattern detection |
| `GET /api/v1/analysis/patterns/co-bidding` | Co-bidding collusion analysis |
| `GET /api/v1/network/co-bidders/{id}` | Vendor co-bidding network |
| `GET /api/v1/search` | Federated search across contracts, vendors, institutions |
| `POST /api/v1/auth/register` | Create user account |
| `POST /api/v1/auth/login` | Authenticate and receive JWT |
| `GET /api/v1/auth/me` | Current user profile |
| `POST /api/v1/auth/logout` | Invalidate session |
| `GET /api/v1/watchlist/folders` | Investigation workspace folders |

---

## Known Limitations

1. **Execution-phase fraud is invisible** — RUBLI analyzes contract award data only. Cost overruns, kickbacks, and ghost workers during execution are undetectable from COMPRANET. Cross-reference with ASF audit findings.

2. **Training bias toward large concentrated vendors** — IMSS, Segalmex, and COVID-19 cases account for ~79% of positive training contracts. Novel patterns from small-scale fraud are underdetected.

3. **Ghost company partial blind spot** — Small shell companies (EFOS-type: few contracts, low concentration) score 0.28 avg vs. 0.85 for training-dominant cases. Partially addressed in v0.6.5; not fully solved.

4. **Vendor deduplication incomplete** — Same company appears under hundreds of name variants over 23 years. RFC is the primary key when available (0.1% pre-2010, 47% in 2023–2025).

5. **SCAR assumption violated** — Ground truth is selected from high-profile documented scandals, not a random sample of all corruption. The model is best at detecting patterns similar to known cases.

6. **Correlation, not causation** — High score = statistical similarity to known corruption patterns. Not proof of wrongdoing. Scores are investigation triage tools.

Full interactive limitations: [`rubli.xyz/limitations`](https://rubli.xyz/limitations)

---

## Methodology Documentation

| Document | Description |
|----------|-------------|
| [`docs/RISK_METHODOLOGY_v6.md`](docs/RISK_METHODOLOGY_v6.md) | v0.6.5 active model — full specification |
| [`docs/RISK_METHODOLOGY_v5.md`](docs/RISK_METHODOLOGY_v5.md) | v5.1 (preserved for reference) |
| [`docs/RISK_METHODOLOGY_v4.md`](docs/RISK_METHODOLOGY_v4.md) | v4.0 (preserved for reference) |
| [`docs/ARIA_SPEC.md`](docs/ARIA_SPEC.md) | ARIA pipeline specification |
| [`docs/ART_DIRECTION.md`](docs/ART_DIRECTION.md) | Design bible — typography, color, dot-matrix protocol |

**Key references:**
- Elkan & Noto (2008) — *Learning classifiers from only positive and unlabeled data* (PU-learning correction)
- IMF Working Paper 2022/094 — *Assessing Vulnerabilities to Corruption in Public Procurement*
- OECD (2023) — *Public Procurement Performance Report* (2–15% high-risk benchmark)

---

## Changelog

### v2.1.0 (April 2026)
- **10 original investigative stories** — long-form editorial narratives with bespoke inline charts, each built on RUBLI data (`/stories/:slug`)
- **User authentication** — JWT register/login/me/logout via `POST /api/v1/auth/*`; bcrypt (direct, not passlib for Python 3.11 compatibility)
- **Year in Review** — annual summary page with dot-matrix spending and administration comparison
- **Investigation Workspace** — renamed from Watchlist; supports folders, case pinning, and review workflow
- **Vendor Compare / Institution Compare** — side-by-side dual-panel risk profiles
- **Procurement Calendar** — month-by-month award timing visualization (December/year-end spike analysis)
- **Collusion Analysis page** — co-bidding ring detection with network visualization
- **Vendor Clusters** — Louvain community detection via co-contracting graph
- **Institution Scorecards & Report Card** — graded transparency assessment (Excelente → Crítico scale)
- **Circuit-board network** — 120-node force-directed network replaces the table in Vendor Profile
- **Executive Summary vertical timeline** — chronological risk narrative across 6 presidential terms
- **Dark empty dots** — dot-matrix empty fill corrected to `#2d2926` across all dark-context charts
- **Design audit** — full compliance pass: `rounded-sm` cards, no emoji in data UI, zinc `#71717a` for low-risk
- **SQLite corruption resilience** — `_ensure_tables()` now does a read-only existence check before acquiring write lock (prevents `database disk image is malformed` on freelist-corrupted DBs)
- **Sector / dashboard latency** — removed live fallback queries from fast endpoints; all stats served from precomputed table

### v2.0.0 (March 2026)
- **Risk model v0.6.5** — institution-scoped ground truth labels, FP exclusions (BAXTER, FRESENIUS, INFRA, PRAXAIR), curriculum learning; HR=13.49% OECD-compliant
- **ARIA pipeline v1.1** — 318K vendor queue, 4 tiers, 7 pattern classifiers, external registry cross-reference (EFOS, SFP, RUPC)
- **Ground truth expanded** to 748 windowed/institution-scoped cases (603 vendors)
- **SHAP explanations** — exact linear SHAP per vendor (456K rows in `vendor_shap_v52`)
- **Red Thread** — scroll-driven 6-chapter investigative narrative per vendor
- **Executive Summary** — 9-section flagship report

---

## Acknowledgments

- **COMPRANET** — Mexico's federal procurement transparency platform (datos.gob.mx)
- **SAT** — EFOS definitivo ghost company registry
- **SFP** — Sanction and debarment records
- **IMF / World Bank / OECD** — Risk methodology frameworks
- **Elkan & Noto (2008)** — PU-learning framework used throughout the risk model

---

## License

[Apache License 2.0](LICENSE) — free to use, modify, and distribute with attribution.

---

*RUBLI — open-source procurement intelligence for Mexican federal contracting data. Risk scores are statistical risk indicators. High score ≠ proof of wrongdoing.*
