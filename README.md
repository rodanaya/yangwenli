# Yang Wen-li

**AI-Powered Corruption Detection Platform for Mexican Government Procurement**

> *"There are things that cannot be measured in terms of victory or defeat."* - Yang Wen-li

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)

---

## What Is This?

Yang Wen-li is an intelligence platform that analyzes **3.1 million Mexican federal procurement contracts** (2002-2025) worth **9.6 trillion pesos** (~$560B USD). Using a 12-feature statistical model validated against 9 documented corruption cases, it identifies patterns consistent with fraud, collusion, and abuse of public funds.

This is not a simple dashboard. It is a full analytical engine with:

- **Calibrated risk scores** with 95% confidence intervals for every contract
- **Multivariate anomaly detection** (Mahalanobis distance) across 12 feature dimensions
- **Ground truth validation** against Odebrecht, Estafa Maestra, IMSS Ghost Companies, Segalmex, COVID procurement fraud, and 4 more documented cases
- **Network analysis** for vendor collusion and bid-rigging detection
- **22 interactive pages** from executive intelligence briefs to granular contract investigation

### Key Metrics

| Metric | Value |
|--------|-------|
| Contracts analyzed | 3,110,017 |
| Total procurement value | 9.6T MXN |
| Vendors | 320,429 |
| Institutions | 4,456 |
| Model AUC-ROC | **0.942** |
| Detection rate (known cases) | **90.6%** |
| Lift vs random | **4.04x** |
| Direct award rate | 65.6% |
| Single bid rate | 16.4% |

---

## Architecture

```
yangwenli/
├── backend/                  # Python/FastAPI REST API
│   ├── api/                  # Endpoints, routers, middleware
│   │   ├── routers/          # 10 router modules
│   │   └── main.py           # FastAPI app with GZip, CORS, rate limiting
│   ├── scripts/              # ETL pipeline, risk model training, data validation
│   └── RUBLI_NORMALIZED.db   # SQLite database (~3.1M contracts)
├── frontend/                 # React 18 + TypeScript + Vite
│   └── src/
│       ├── pages/            # 22 page components
│       ├── components/       # Shared UI (shadcn/ui base)
│       ├── api/              # API client + types
│       └── lib/              # Utilities, constants, theme
└── docs/                     # Methodology, model comparison, guides
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Database** | SQLite with pre-computed aggregates, WAL mode |
| **Backend** | Python 3.11, FastAPI, uvicorn |
| **Frontend** | React 18, TypeScript, Vite, TanStack Query, Recharts, ECharts |
| **UI** | Tailwind CSS, shadcn/ui, custom dark intelligence theme |
| **Risk Model** | Bayesian logistic regression, Mahalanobis distance, PU-learning |

---

## Pages

### Overview
| Page | Route | Description |
|------|-------|-------------|
| Executive Summary | `/executive` | Flagship 9-section editorial intelligence report |
| Dashboard | `/` | Real-time intelligence brief with key metrics |
| Explore | `/explore` | Search and browse vendors, institutions, trends |

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

### Understand
| Page | Route | Description |
|------|-------|-------------|
| Sectors | `/sectors` | 12-sector taxonomy with drill-down profiles |
| Ground Truth | `/ground-truth` | 9 validated corruption cases and detection performance |
| Model | `/model` | v4.0 model transparency, coefficients, and explainability |
| Methodology | `/methodology` | Full risk scoring methodology documentation |

---

## Risk Model v4.0

The platform uses a **calibrated probability framework** — every risk score is `P(corrupt|features)`, not an arbitrary index.

### Pipeline

```
raw features → z-scores (sector/year baselines) → Mahalanobis distance → logistic regression → PU correction → 95% CI
```

### 12 Features

Z-score normalized by sector and year: single bid, direct award, price ratio, vendor concentration, ad period, year-end timing, same-day count, network membership, co-bid rate, price hypothesis confidence, industry mismatch, institution risk.

### Top Predictors

| Feature | Coefficient | Interpretation |
|---------|------------|----------------|
| vendor_concentration | +1.00 | Dominant predictor — market share concentration |
| industry_mismatch | +0.21 | Vendor operating outside primary sector |
| same_day_count | +0.14 | Threshold splitting signal |
| direct_award | **-0.20** | Direct awards are *less* risky (counterintuitive) |
| ad_period_days | **-0.22** | Longer ad periods correlate with known-bad vendors |

### Validation Against 9 Documented Cases

| Case | Type | Contracts | Detection |
|------|------|-----------|-----------|
| IMSS Ghost Companies | Ghost companies | 9,366 | 99.0% |
| Segalmex | Procurement fraud | 6,326 | 94.3% |
| COVID-19 Procurement | Embezzlement | 5,371 | 91.8% |
| Odebrecht-PEMEX | Bribery | 35 | 68.6% |
| Estafa Maestra | Ghost companies | 10 | 70.0% |
| Grupo Higa | Conflict of interest | 3 | 33.3% |
| Oceanografia | Invoice fraud | 2 | 100% |
| Cyber Robotic IT | Overpricing | 139 | 43.2% |

---

## Data Source

All data comes from **COMPRANET**, Mexico's federal electronic procurement system. Four data structures span 2002-2025:

| Structure | Years | RFC Coverage | Quality |
|-----------|-------|-------------|---------|
| A | 2002-2010 | 0.1% | Lowest |
| B | 2010-2017 | 15.7% | Better |
| C | 2018-2022 | 30.3% | Good |
| D | 2023-2025 | 47.4% | Best |

### Data Validation

- Amounts > 100B MXN are **rejected** (decimal point errors)
- Amounts > 10B MXN are **flagged** for manual review
- 12-sector taxonomy classifies by Ramo codes

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- The SQLite database file (`RUBLI_NORMALIZED.db`)

### Run

```bash
# Backend (port 8001)
cd backend
python -m uvicorn api.main:app --port 8001 --reload --host 127.0.0.1

# Frontend (port 3009)
cd frontend
npm install
npm run dev -- --port 3009
```

Open http://127.0.0.1:3009

---

## API

The backend exposes **60+ REST endpoints** across 10 router modules. Full interactive documentation at `/docs` when running.

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/executive/summary` | Consolidated executive intelligence report data |
| `GET /api/v1/contracts` | Paginated contract search with risk filters |
| `GET /api/v1/vendors/{id}` | Vendor profile with risk metrics |
| `GET /api/v1/institutions/{id}` | Institution profile with vendor concentration |
| `GET /api/v1/analysis/risk-overview` | Platform-wide risk distribution |
| `GET /api/v1/analysis/money-flow` | Sankey flow data between sectors and vendors |
| `GET /api/v1/network/co-bidders/{id}` | Co-bidding collusion analysis |
| `GET /api/v1/investigation/top/{n}` | Top anomalous vendors for investigation |

---

## Limitations

1. **Ground truth concentration** — 3 cases represent 99% of training data (IMSS, Segalmex, COVID). The model underperforms on bribery and conflict-of-interest patterns.
2. **Data quality degrades with age** — 2002-2010 has 0.1% RFC coverage; risk scores may be underestimated for this period.
3. **Correlation, not causation** — A high score indicates statistical anomaly consistent with corruption patterns, not proof of wrongdoing.
4. **Unknown unknowns** — Novel corruption schemes not resembling the 9 known cases won't be detected.

---

## Methodology

Full documentation:
- [`docs/RISK_METHODOLOGY.md`](docs/RISK_METHODOLOGY.md) — v3.3 weighted checklist (preserved in `risk_score_v3`)
- [`docs/RISK_METHODOLOGY_v4.md`](docs/RISK_METHODOLOGY_v4.md) — v4.0 statistical framework (primary)
- [`docs/MODEL_COMPARISON_REPORT.md`](docs/MODEL_COMPARISON_REPORT.md) — Head-to-head comparison (AUC 0.584 vs 0.942)

---

## Acknowledgments

- **COMPRANET** — Source of procurement data
- **IMF / World Bank / OECD** — Risk methodology frameworks
- **Open Contracting Partnership** — Red flags library

---

## License

All Rights Reserved. Unauthorized copying, distribution, or modification is prohibited without explicit permission.

---

*Named after Yang Wen-li from Legend of the Galactic Heroes — the pragmatic historian who valued transparency and democratic institutions over blind ambition.*
