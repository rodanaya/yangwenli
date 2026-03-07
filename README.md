# RUBLI

**AI-Powered Corruption Detection Platform for Mexican Government Procurement**

[![Backend Tests](https://github.com/rodanaya/yangwenli/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/rodanaya/yangwenli/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/frontend-tests.yml)
[![CodeQL](https://github.com/rodanaya/yangwenli/actions/workflows/codeql.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/codeql.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red.svg)](#license)

---

## What Is This?

RUBLI is a full-stack intelligence platform that analyzes **3.1 million Mexican federal procurement contracts** (2002–2025) worth over **9.5 trillion pesos**. It uses a 16-feature per-sector calibrated statistical risk model, validated against 22 documented corruption cases, to surface patterns consistent with fraud, collusion, and abuse of public funds.

This is not a simple dashboard. It is a production analytical engine built for investigative journalists, government auditors, and transparency researchers.

### Key Metrics

| Metric | Value |
|--------|-------|
| Contracts analyzed | 3,051,294 |
| Validated procurement value | ~9.3T MXN |
| Vendors tracked | 320,429 |
| Institutions | 4,456 |
| Interactive pages | 36 |
| Active risk model | **v5.1** (per-sector calibrated) + **v5.2** analytical enrichment |
| Train AUC-ROC | **0.964** |
| Test AUC-ROC | **0.957** (temporal holdout — 2021+ contracts) |
| Ground truth detection | **99.8%** medium+ across 22 training cases |
| False negative rate | **0.2%** |
| Ground truth cases | 25 (98 vendors) |
| High-risk rate | **9.0%** (OECD benchmark: 2–15%) |

---

## What It Detects

The platform identifies six procurement fraud patterns documented in the academic and anti-corruption literature:

- **Ghost company networks** — shell vendors with no real operations, used to siphon funds
- **Vendor monopolization** — single vendors capturing entire institutional budgets
- **Bid rigging and tender manipulation** — coordinated bidding to predetermine winners
- **Overpricing** — systematic price inflation vs. sector norms
- **Conflict of interest** — politically connected vendors winning contracts
- **Emergency procurement abuse** — crisis procedures used to bypass competition

Every risk score measures **statistical similarity to documented corruption patterns** — with 95% bootstrap confidence intervals — not a deterministic rule match.

---

## Architecture

```
rubli/
├── backend/                  # Python 3.11 / FastAPI REST API
│   ├── api/
│   │   ├── routers/          # 10+ router modules (60+ endpoints)
│   │   ├── services/         # Business logic layer
│   │   └── main.py           # GZip, CORS, startup checks
│   ├── scripts/              # ETL pipeline, risk model training pipeline
│   └── RUBLI_NORMALIZED.db   # SQLite (~3.1M contracts, ~5.6 GB)
├── frontend/                 # React 18 + TypeScript + Vite
│   └── src/
│       ├── pages/            # 36 page components
│       ├── components/       # Shared UI (shadcn/ui, Recharts, D3)
│       ├── api/              # Typed API client
│       ├── i18n/             # ES/EN translations (22+ namespaces)
│       └── hooks/            # Custom React hooks
├── docker-compose.yml        # Production: backend + frontend + nginx
└── docs/                     # Methodology, model comparison, dev guides
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | SQLite, WAL mode, 200MB cache, pre-computed aggregate tables |
| Backend | Python 3.11, FastAPI, uvicorn, service layer pattern |
| Frontend | React 18, TypeScript 5, Vite, TanStack Query v5, Recharts |
| UI | Tailwind CSS v4, shadcn/ui, custom dark intelligence theme |
| Risk Model | Per-sector logistic regression, Mahalanobis distance, Elkan & Noto PU-learning |
| i18n | react-i18next — Spanish and English |
| Deploy | Docker Compose (backend + frontend + nginx) |

---

## Pages

### Overview
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Real-time intelligence brief with key metrics and alerts |
| Executive Summary | `/executive` | Flagship 9-section editorial intelligence report |

### Investigate
| Page | Route | Description |
|------|-------|-------------|
| Procurement Intelligence | `/procurement-intelligence` | Live alert ticker, sector heatmap, top risk signals |
| Patterns | `/patterns` | Pattern analysis — concentration, co-bidding, year-end clustering |
| Red Flags | `/red-flags` | Risk factor co-occurrence and interaction maps |
| Money Flow | `/money-flow` | Sankey diagram of procurement flows by sector and institution |
| Temporal Pulse | `/temporal` | Monthly rhythm analysis, seasonal corruption signals |
| Administrations | `/administrations` | Presidential comparison: Fox through Sheinbaum |
| Institution Health | `/institutions/health` | HHI concentration rankings, institutional risk scores |
| Institution Heatmap | `/heatmap` | 20×12 institution × sector concentration matrix |
| Price Intelligence | `/price-analysis` | Pricing anomalies, statistical outlier scatter plots |
| Contracts | `/contracts` | Full contract table with risk filtering and bookmarks |
| Network Graph | `/network` | Force-directed vendor relationship and co-bidding graph |
| State Expenditure | `/state-expenditure` | Federal funds in state/municipal procurement (484K contracts) |
| Watchlist | `/watchlist` | Tracked vendors and institutions |
| Investigation | `/investigation` | Case management and anomaly investigation workspace |
| Spending Categories | `/categories` | CUCOP category-level spend analysis |
| Vendor Compare | `/vendors/compare` | Side-by-side radar comparison of two vendor risk profiles |

### Profiles
| Page | Route | Description |
|------|-------|-------------|
| Vendor Profile | `/vendors/:id` | Radar chart, z-score breakdown, external records, collusion signals |
| Institution Profile | `/institutions/:id` | Vendor concentration, sector exposure, risk trends |
| Sector Profile | `/sectors/:id` | OECD benchmarks, red flag rates, top vendors |
| Contract Detail | `/contracts/:id` | Full risk breakdown with confidence intervals |
| Case Detail | `/cases/:id` | Fraud type, timeline, detection signals, impact KPIs |

### Understand
| Page | Route | Description |
|------|-------|-------------|
| Sectors | `/sectors` | 12-sector taxonomy with treemap and sparkline trends |
| Ground Truth | `/ground-truth` | 22 validated corruption cases and per-case detection rates |
| Case Library | `/cases` | 43 documented scandals with fraud type classification |
| Model Transparency | `/model` | v5.1 coefficients, feature importance, per-sector sub-models |
| Methodology | `/methodology` | Full risk scoring methodology documentation |
| Limitations | `/limitations` | Known blind spots, workarounds, and what the model cannot detect |
| API Explorer | `/api-explorer` | Interactive catalog of all 57+ backend endpoints |
| Settings | `/settings` | Theme, language, export (CSV/JSON), data quality metrics |

---

## Risk Model v5.1 + v5.2 Analytical Layer

The platform uses a **per-sector statistical risk framework**. Scores measure similarity to documented corruption patterns, normalized by sector and year baselines. The model was trained on contracts through 2020 and tested on 2021+ contracts for honest generalization — no data leakage.

> **Score Interpretation**: Risk scores are statistical risk indicators, not calibrated probabilities. A score of 0.50 means the contract closely resembles those from known corruption cases — not a 50% probability of wrongdoing. Use scores for investigation triage, not as verdicts.

### Pipeline

```
raw features
  → z-scores (per sector/year baseline)
  → Mahalanobis distance (Ledoit-Wolf covariance)
  → 12 per-sector logistic regressions + 1 global fallback
  → Elkan & Noto (2008) PU-learning correction (c = 0.882)
  → 500-bootstrap 95% confidence intervals
```

### 16 Features

| # | Feature | Type | New in v5 |
|---|---------|------|:---------:|
| 1 | single_bid | Binary | |
| 2 | direct_award | Binary | |
| 3 | price_ratio | Continuous | |
| 4 | vendor_concentration | Continuous | |
| 5 | ad_period_days | Continuous | |
| 6 | year_end | Binary | |
| 7 | same_day_count | Discrete | |
| 8 | network_member_count | Discrete | |
| 9 | co_bid_rate | Continuous | |
| 10 | price_hyp_confidence | Continuous | |
| 11 | industry_mismatch | Binary | |
| 12 | institution_risk | Continuous | |
| 13 | **price_volatility** | Continuous | Yes |
| 14 | **institution_diversity** | Continuous | Yes |
| 15 | **win_rate** | Continuous | Yes |
| 16 | **sector_spread** | Continuous | Yes |

### Top Predictors (Global Model)

| Feature | Coefficient | Interpretation |
|---------|------------|----------------|
| **price_volatility** | +1.22 | Wildly varying contract sizes — strongest single predictor |
| **institution_diversity** | −0.85 | Vendors serving many institutions are less suspicious |
| **win_rate** | +0.73 | Abnormally high win rates increase risk |
| vendor_concentration | +0.43 | Disproportionate market share |
| industry_mismatch | +0.31 | Vendor working outside its primary sector |
| direct_award | +0.18 | Correctly positive (was wrongly negative in v4.0) |

### Risk Levels

| Level | Threshold | Count | % |
|-------|-----------|-------|---|
| **Critical** | >= 0.50 | 190,132 | 6.1% |
| **High** | >= 0.30 | 88,728 | 2.9% |
| **Medium** | >= 0.10 | 408,836 | 13.2% |
| **Low** | < 0.10 | 2,363,598 | 77.8% |

**High-risk rate: 9.0%** — within OECD benchmark of 2–15%.

### Validation Against 22 Training Cases (25 total in DB)

| Case | Type | Contracts | High+ Detection | Avg Score |
|------|------|-----------|:---:|-----------|
| IMSS Ghost Companies | Ghost companies | 9,366 | 99.0% | 0.977 |
| Segalmex | Procurement fraud | 6,326 | 89.3% | 0.664 |
| COVID-19 Procurement | Embezzlement | 5,371 | 84.9% | 0.821 |
| Edenred Voucher Monopoly | Monopoly | 2,939 | 96.7% | 0.884 |
| Toka IT Monopoly | Monopoly | 1,954 | 100% | 0.964 |
| SEGOB-Mainbit IT Monopoly | Monopoly | 604 | — | — |
| ISSSTE Ambulance Leasing | Overpricing | 603 | — | — |
| Infrastructure Network | Overpricing | 191 | 99.5% | 0.962 |
| SixSigma Tender Rigging | Tender rigging | 147 | 87.8% | 0.756 |
| Cyber Robotic IT | Overpricing | 139 | 14.4% | 0.249 |
| SAT EFOS Ghost Network | Ghost companies | 122 | 27.9% | 0.283 |
| PEMEX-Cotemar | Procurement fraud | 51 | 100% | 1.000 |
| IPN Cartel de la Limpieza | Bid rigging | 48 | 64.6% | 0.551 |
| Odebrecht-PEMEX | Bribery | 35 | 97.1% | 0.915 |
| La Estafa Maestra | Ghost companies | 10 | 0% | 0.179 |
| Grupo Higa / Casa Blanca | Conflict of interest | 3 | 33.3% | 0.359 |
| Oceanografia | Invoice fraud | 2 | 0% | 0.152 |

**Note on SAT EFOS:** 38 RFC-confirmed ghost companies from Mexico's official ghost company registry. Detection improved from 2.8% (v5.0) to 27.9% (v5.1) after inclusion in training — but remains partial. EFOS vendors average 3 contracts each vs. 1,565 for the dominant training cases; they represent a fundamentally different corruption pattern (invoice fraud at small scale vs. monopolistic capture).

### Model Evolution

| Version | AUC (train) | AUC (test) | Cases | Key Innovation |
|---------|-------------|------------|-------|---------------|
| v3.3 | 0.584 | — | — | IMF-aligned weighted checklist |
| v4.0 | 0.951 | — (in-sample) | 9 | Z-score normalization, Mahalanobis distance |
| v5.0 | 0.967 | 0.960 | 15 | Per-sector sub-models, temporal validation, PU-learning |
| **v5.1** | **0.964** | **0.957** | **22** | Ground truth expansion, SAT EFOS integration |
| **v5.2** | — (scores unchanged) | — | **25** | SHAP explanations, PyOD ensemble anomaly, vendor drift detection |

### v5.2 Analytical Enrichment Layer

v5.2 adds three analytical layers on top of v5.1 scores — the base contract risk scores are unchanged.

| Component | Output | Description |
|-----------|--------|-------------|
| **SHAP Explanations** | `vendor_shap_v52` (456K rows) | Exact per-vendor feature contributions: φᵢ = βᵢ × (zᵢ − E[zᵢ]). Powers the VendorProfile radar chart and risk breakdown panels. |
| **PyOD Ensemble Anomaly** | `contract_anomaly_scores` (9.3M rows) | IForest + COPOD + ensemble score per contract. `contracts.ensemble_anomaly_score` avg=0.138, P91 threshold=0.260. Powers "AI Confirmed" badges on contracts scoring high on both the statistical risk model and the unsupervised anomaly detector. |
| **Vendor Drift Detection** | `drift_report` | KS-test across 16 z-score features vs. 2002–2020 baseline. Flags vendors whose procurement pattern has shifted significantly — indicating either reformed behavior or new corruption tactics. |

The v5.2 pipeline requires `contract_z_features` to be populated (`compute_z_features.py`) before running.

---

## Data Sources

All procurement data comes from **COMPRANET**, Mexico's federal electronic procurement system. Four data structures span 2002–2025:

| Structure | Years | RFC Coverage | Quality |
|-----------|-------|-------------|---------|
| A | 2002–2010 | 0.1% | Lowest — risk may be underestimated |
| B | 2010–2017 | 15.7% | Better |
| C | 2018–2022 | 30.3% | Good |
| D | 2023–2025 | 47.4% | Best |

### External Data Integrated

| Source | Records | Matched to RUBLI |
|--------|---------|-----------------|
| SAT EFOS Definitivo | 13,960 RFC-confirmed ghost companies | 38 vendors (Case 22) |
| SFP Sanctions | 1,954 debarment records | 22 vendors (Jaccard >= 0.80) |

### Data Validation Rules

- Amounts > 100B MXN are **rejected** as decimal errors (the ogulin lesson)
- Amounts > 10B MXN are **flagged** for manual review
- Mexico's entire federal budget is ~8T MXN/year — a 1T MXN contract would be 12.5% of GDP

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- The SQLite database file (`RUBLI_NORMALIZED.db`, ~5.6 GB — not included in repo)

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

**Note:** On first startup, `_startup_checks()` scans ~3.05M rows — expect 30–60s cold start. This is expected behavior.

### Docker (Production)

```bash
# Build and run (requires RUBLI_NORMALIZED.db in backend/)
docker compose up --build

# Frontend available at http://localhost:80
```

### Environment

```bash
# backend/.env
DATABASE_PATH=./RUBLI_NORMALIZED.db
CORS_ORIGINS=http://localhost:3009
```

---

## API

The backend exposes **60+ REST endpoints** across 10+ router modules. Full interactive documentation at `http://localhost:8001/docs`.

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/executive/summary` | Consolidated executive intelligence report |
| `GET /api/v1/contracts` | Paginated contract search with risk/sector/year filters |
| `GET /api/v1/contracts/{id}` | Contract detail with full risk breakdown and CIs |
| `GET /api/v1/vendors/{id}` | Vendor profile with z-score radar and risk metrics |
| `GET /api/v1/institutions/{id}` | Institution profile with vendor concentration |
| `GET /api/v1/sectors/{id}/profile` | Sector deep-dive with benchmarks and trends |
| `GET /api/v1/analysis/risk-overview` | Platform-wide risk distribution |
| `GET /api/v1/analysis/money-flow` | Sankey flow data by sector/institution |
| `GET /api/v1/network/co-bidders/{id}` | Co-bidding collusion analysis for a vendor |
| `GET /api/v1/search` | Federated search across contracts, vendors, institutions |
| `GET /api/v1/subnational/states` | State-level expenditure breakdown |
| `GET /api/v1/workspace/dossiers` | Investigation dossier management |

---

## Testing

```bash
# Backend (479 tests)
python -m pytest backend/tests/ -q --tb=short -p no:cacheprovider

# TypeScript — both checks required
cd frontend
npx tsc --noEmit          # lenient tsconfig
npm run build             # enforces noUnusedLocals/noUnusedParameters
```

Target: 479 backend tests passing, 0 TypeScript errors in both checks.

---

## Known Limitations

1. **Execution-phase fraud invisible** — RUBLI analyzes contract award data only. Cost overruns, kickbacks, and ghost workers during contract execution are undetectable from procurement records. Cross-reference with ASF audit findings for this.

2. **Ground truth bias** — IMSS, Segalmex, and COVID-19 cases account for ~79% of labeled training contracts. The model may underdetect novel patterns not resembling these large concentrated-vendor cases.

3. **Ghost company blind spot (partial)** — Small shell companies (few contracts, low concentration) score significantly lower than large-monopoly corruption. SAT EFOS vendors average 0.283 vs. 0.853 for dominant training cases. Partially addressed in v5.1, not fully solved.

4. **Vendor deduplication unsolved** — The same company appears under hundreds of name variations over 23 years. RFC is the primary key when available, but RFC coverage is 0.1% for 2002–2010. True vendor concentration is higher than displayed for early years.

5. **Data quality degrades with age** — 2002–2010 has 0.1% RFC coverage; risk scores for this period are directional estimates.

6. **Co-bidding signal regularized to zero** — `co_bid_rate` was pushed to 0.0 by ElasticNet. Bid rotation and cover bidding are not captured in the contract-level risk score (separate collusion detection tab available).

7. **Correlation, not causation** — A high score indicates statistical similarity to corruption patterns, not proof of wrongdoing. Scores are investigation triage tools.

See the `/limitations` page in the platform for the full interactive version with context and workarounds.

---

## Methodology

Full documentation:

- [`docs/RISK_METHODOLOGY_v5.md`](docs/RISK_METHODOLOGY_v5.md) — v5.1 per-sector calibrated model (active)
- [`docs/RISK_METHODOLOGY_v4.md`](docs/RISK_METHODOLOGY_v4.md) — v4.0 statistical framework (preserved)
- [`docs/RISK_METHODOLOGY.md`](docs/RISK_METHODOLOGY.md) — v3.3 weighted checklist (preserved)
- [`docs/MODEL_COMPARISON_REPORT.md`](docs/MODEL_COMPARISON_REPORT.md) — v3.3 vs v4.0 comparison

Key methodological references:
- Elkan & Noto (2008) — Positive-Unlabeled learning correction
- Ledoit & Wolf (2004) — Covariance matrix shrinkage
- IMF Working Paper 2022/094 — Corruption Risk Index methodology
- OECD (2023) — Public Procurement Performance Report

---

## Project Name

RUBLI is named after the pragmatic historian from *Legend of the Galactic Heroes* — a character who valued democratic institutions, transparency, and accountability over blind ambition. The platform shares his conviction: sunlight is the best disinfectant.

---

## Acknowledgments

- **COMPRANET** — Mexico's federal procurement transparency platform (datos.gob.mx)
- **SAT** — EFOS definitivo ghost company registry
- **SFP** — Sanction and debarment records
- **IMF / World Bank / OECD** — Risk methodology frameworks
- **Open Contracting Partnership** — Procurement red flags library

---

## License

All Rights Reserved. Unauthorized copying, distribution, or modification is prohibited without explicit permission.
