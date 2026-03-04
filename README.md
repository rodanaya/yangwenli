# RUBLI

**AI-Powered Corruption Detection Platform for Mexican Government Procurement**

[![Backend Tests](https://github.com/rodanaya/yangwenli/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/rodanaya/yangwenli/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/frontend-tests.yml)
[![CodeQL](https://github.com/rodanaya/yangwenli/actions/workflows/codeql.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/codeql.yml)
[![Deploy](https://github.com/rodanaya/yangwenli/actions/workflows/deploy.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/deploy.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red.svg)](#license)

---

## What Is This?

RUBLI is an intelligence platform that analyzes **3.1 million Mexican federal procurement contracts** (2002-2025) worth over **6 trillion pesos**. Using a 16-feature per-sector calibrated risk model validated against 22 documented corruption cases, it identifies patterns consistent with fraud, collusion, and abuse of public funds.

This is not a simple dashboard. It is a full analytical engine with:

- **Statistical risk indicators** — every score measures similarity to documented corruption patterns with 95% bootstrap confidence intervals
- **Per-sector sub-models** — 12 dedicated logistic regressions capture sector-specific corruption patterns
- **Multivariate anomaly detection** via Mahalanobis distance across 16 feature dimensions
- **Ground truth validation** against 22 documented cases including Odebrecht, Estafa Maestra, IMSS Ghost Companies, Segalmex, Toka IT Monopoly, SAT EFOS ghost networks, and more
- **Network analysis** for vendor collusion and bid-rigging detection
- **Bilingual interface** (Spanish/English) with 22+ interactive pages

### Key Metrics

| Metric | Value |
|--------|-------|
| Contracts analyzed | 3,110,007 |
| Validated procurement value | ~6T MXN |
| Vendors | 320,429 |
| Institutions | 4,456 |
| Risk model | **v5.1** (per-sector calibrated) |
| Train AUC-ROC | **0.964** |
| Test AUC-ROC | **0.957** (temporal split, 2021+ holdout) |
| Detection rate (known cases) | **99.8%** medium+ |
| False negative rate | **0.2%** |
| Ground truth cases | 22 (27 vendors, 26,582 contracts) |
| High-risk rate | **9.0%** (OECD benchmark: 2-15%) |

---

## Architecture

```
rubli/
├── backend/                  # Python/FastAPI REST API
│   ├── api/                  # Endpoints, routers, services
│   │   ├── routers/          # 10+ router modules
│   │   ├── services/         # Business logic layer
│   │   └── main.py           # FastAPI app with GZip, CORS, caching
│   ├── scripts/              # ETL pipeline, risk model training
│   └── RUBLI_NORMALIZED.db   # SQLite database (~3.1M contracts)
├── frontend/                 # React 18 + TypeScript + Vite
│   └── src/
│       ├── pages/            # 22+ page components
│       ├── components/       # Shared UI (shadcn/ui base)
│       ├── api/              # API client + types
│       ├── i18n/             # ES/EN translations
│       └── hooks/            # Custom React hooks
├── docker-compose.yml        # Production deployment
└── docs/                     # Methodology, model comparison, guides
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Database** | SQLite with pre-computed aggregates, WAL mode, 200MB cache |
| **Backend** | Python 3.11, FastAPI, uvicorn, service layer pattern |
| **Frontend** | React 18, TypeScript, Vite, TanStack Query, Recharts |
| **UI** | Tailwind CSS v4, shadcn/ui, custom dark intelligence theme |
| **Risk Model** | Per-sector logistic regression, Mahalanobis distance, PU-learning (Elkan & Noto) |
| **i18n** | react-i18next (Spanish/English) |
| **Deploy** | Docker Compose (backend + frontend + nginx) |

---

## Pages

### Overview
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Real-time intelligence brief with key metrics |
| Executive Summary | `/executive` | Flagship 9-section editorial intelligence report |

### Investigate
| Page | Route | Description |
|------|-------|-------------|
| Patterns | `/patterns` | Detective pattern analysis (concentration, co-bidding, year-end) |
| Red Flags | `/red-flags` | Risk factor co-occurrence and interaction analysis |
| Money Flow | `/money-flow` | Sankey diagram of procurement flows |
| Temporal Pulse | `/temporal` | Monthly rhythm analysis and seasonal patterns |
| Administrations | `/administrations` | Presidential comparison (Fox through Sheinbaum) |
| Institution Health | `/institutions/health` | HHI concentration rankings and institutional risk |
| Price Intelligence | `/price-analysis` | Pricing anomalies and statistical outlier detection |
| Contracts | `/contracts` | Full contract table with filtering and risk breakdown |
| Network | `/network` | Force-directed vendor relationship graph |
| Watchlist | `/watchlist` | Tracked vendors and institutions |
| Investigation | `/investigation` | Case management and anomaly investigation |
| Spending Categories | `/categories` | CUCOP category-level spend analysis |

### Understand
| Page | Route | Description |
|------|-------|-------------|
| Sectors | `/sectors` | 12-sector taxonomy with drill-down profiles |
| Ground Truth | `/ground-truth` | 22 validated corruption cases and detection performance |
| Model Transparency | `/model` | v5.1 model coefficients, feature importance, explainability |
| Methodology | `/methodology` | Full risk scoring methodology documentation |
| Limitations | `/limitations` | Known model blind spots and workarounds |
| Settings | `/settings` | Theme, language, data quality metrics |

---

## Risk Model v5.1

The platform uses a **per-sector statistical risk framework** — every score measures similarity to documented corruption patterns, normalized by sector and year baselines. Trained on contracts through 2020, tested on 2021+ for honest generalization.

> **Score Interpretation**: Risk scores are statistical risk indicators measuring similarity to documented corruption patterns, not calibrated probabilities of corruption. A score of 0.50 does not mean 50% probability of corruption — it means the contract closely resembles those from known cases. Use scores for investigation triage, not as verdicts.

### Pipeline

```
raw features → z-scores (sector/year baselines) → Mahalanobis distance
  → per-sector logistic regression → Elkan & Noto PU correction → bootstrap 95% CI
```

### 16 Features

Z-score normalized by sector and year:

| # | Feature | Type | New in v5? |
|---|---------|------|:----------:|
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
| **price_volatility** | +1.22 | Wildly varying contract sizes — strongest predictor |
| **institution_diversity** | -0.85 | Vendors serving many institutions are *less* suspicious |
| **win_rate** | +0.73 | Abnormally high win rates increase risk |
| vendor_concentration | +0.43 | Market share concentration |
| industry_mismatch | +0.31 | Vendor operating outside primary sector |
| direct_award | +0.18 | Correctly positive (was wrongly negative in v4.0) |

### Risk Levels

| Level | Threshold | Count | % |
|-------|-----------|-------|---|
| **Critical** | >= 0.50 | 201,745 | 6.5% |
| **High** | >= 0.30 | 126,553 | 4.1% |
| **Medium** | >= 0.10 | ~1,365,000 | ~43.9% |
| **Low** | < 0.10 | ~1,417,000 | ~45.6% |

**High-risk rate: 9.0%** — within OECD benchmark of 2-15%.

### Validation Against 22 Documented Cases

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
| Grupo Higa | Conflict of interest | 3 | 33.3% | 0.359 |
| Oceanografia | Invoice fraud | 2 | 0% | 0.152 |

**Note on SAT EFOS:** 38 RFC-confirmed ghost companies from the SAT EFOS definitivo list. Detection improved from 2.8% (v5.0) to 27.9% (v5.1) after inclusion in training, but remains partial — EFOS vendors are small shells (avg 3 contracts each), structurally different from the concentrated vendors that dominate training data.

### Model Evolution

| Version | Train AUC | Test AUC | Cases | Key Innovation |
|---------|-----------|----------|-------|---------------|
| v3.3 | 0.584 | — | — | IMF-aligned weighted checklist |
| v4.0 | 0.951 | — (in-sample) | 9 | Statistical calibration, Mahalanobis distance |
| v5.0 | 0.967 | 0.960 | 15 | Per-sector models, temporal validation, PU-learning |
| **v5.1** | **0.964** | **0.957** | **22** | **Ground truth expansion, SAT EFOS integration** |

---

## Data Source

All data comes from **COMPRANET**, Mexico's federal electronic procurement system. Four data structures span 2002-2025:

| Structure | Years | RFC Coverage | Quality |
|-----------|-------|-------------|---------|
| A | 2002-2010 | 0.1% | Lowest |
| B | 2010-2017 | 15.7% | Better |
| C | 2018-2022 | 30.3% | Good |
| D | 2023-2025 | 47.4% | Best |

### External Data Sources

In addition to COMPRANET:
- **SAT EFOS Definitivo** — 13,960 RFC-confirmed ghost companies; 38 matched to RUBLI vendors (Case 22)
- **SFP Sanctions** — 1,954 sanction records; 22 matched by RFC (Jaccard token match >= 0.80)

### Data Validation

- Amounts > 100B MXN are **rejected** (decimal point errors from source)
- Amounts > 10B MXN are **flagged** for manual review
- 12-sector taxonomy classifies institutions by Ramo codes

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
python -m uvicorn api.main:app --port 8001 --reload --host 127.0.0.1

# Frontend (port 3009)
cd frontend
npm install
npm run dev -- --port 3009
```

Open http://localhost:3009

**Note:** On first startup, the backend runs `_startup_checks()` which scans 3.1M rows — expect 30-60s cold start. This is expected behavior.

### Docker

```bash
# Build and run (requires RUBLI_NORMALIZED.db in backend/)
docker compose up --build

# Frontend available at http://localhost:3009
```

### Auto-Deploy (GitHub Actions → Hetzner)

Push to `main` automatically deploys via SSH. Add these secrets to your GitHub repo (`Settings → Secrets → Actions`):

| Secret | Value |
|--------|-------|
| `HETZNER_IP` | Server IP address |
| `SSH_PRIVATE_KEY` | Private key for `root@<ip>` (paste full PEM) |

The workflow syncs code only — the database stays on the server permanently.

---

## API

The backend exposes **60+ REST endpoints** across 10+ router modules. Full interactive documentation at `http://localhost:8001/docs` when running.

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/executive/summary` | Consolidated executive intelligence report |
| `GET /api/v1/contracts` | Paginated contract search with risk filters |
| `GET /api/v1/contracts/{id}` | Contract detail with full risk breakdown |
| `GET /api/v1/vendors/{id}` | Vendor profile with risk metrics |
| `GET /api/v1/institutions/{id}` | Institution profile with vendor concentration |
| `GET /api/v1/sectors/{id}/profile` | Sector deep-dive with trends |
| `GET /api/v1/analysis/risk-overview` | Platform-wide risk distribution |
| `GET /api/v1/analysis/money-flow` | Sankey flow data |
| `GET /api/v1/network/co-bidders/{id}` | Co-bidding collusion analysis |
| `GET /api/v1/investigation/top/{n}` | Top anomalous vendors for investigation |
| `GET /api/v1/search` | Federated search across contracts, vendors, institutions |

---

## Testing

```bash
# Backend (359 tests)
python -m pytest backend/tests/ -q --tb=short -p no:cacheprovider

# TypeScript compilation check
cd frontend && npx tsc --noEmit
```

---

## Known Limitations

1. **Ground truth bias** — IMSS, Segalmex, and COVID-19 cases account for ~79% of training contracts. The model may underdetect novel patterns not resembling these large concentrated-vendor cases.
2. **Ghost company blind spot** — Small shell companies (few contracts, low concentration) are structurally different from training data. SAT EFOS vendors avg score 0.283 vs 0.853 for main training cases.
3. **Execution-phase fraud invisible** — RUBLI analyzes award data only. Cost overruns, kickbacks, and ghost workers during contract execution are not detectable from procurement records.
4. **Data quality degrades with age** — 2002-2010 has 0.1% RFC coverage; risk scores may be underestimated for this period.
5. **Co-bidding signal = zero** — The `co_bid_rate` coefficient was regularized to 0.0; bid rotation is not captured in the risk score (separate collusion detection tab available).
6. **Correlation, not causation** — A high score indicates statistical similarity to corruption patterns, not proof of wrongdoing.

See the `/limitations` page in the platform for the full interactive version with context and workarounds.

---

## Methodology

Full documentation:
- [`docs/RISK_METHODOLOGY_v5.md`](docs/RISK_METHODOLOGY_v5.md) — v5.1 per-sector calibrated model (active)
- [`docs/RISK_METHODOLOGY_v4.md`](docs/RISK_METHODOLOGY_v4.md) — v4.0 statistical framework (preserved)
- [`docs/RISK_METHODOLOGY.md`](docs/RISK_METHODOLOGY.md) — v3.3 weighted checklist (preserved)
- [`docs/MODEL_COMPARISON_REPORT.md`](docs/MODEL_COMPARISON_REPORT.md) — v3.3 vs v4.0 comparison

---

## Acknowledgments

- **COMPRANET** — Mexico's federal procurement transparency platform
- **SAT** — EFOS definitivo ghost company registry
- **SFP** — Sanction and debarment records
- **IMF / World Bank / OECD** — Risk methodology frameworks
- **Open Contracting Partnership** — Red flags library
- **Elkan & Noto (2008)** — PU-learning methodology

---

## License

All Rights Reserved. Unauthorized copying, distribution, or modification is prohibited without explicit permission.
