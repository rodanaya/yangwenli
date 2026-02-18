# Yang Wen-li

**AI-Powered Corruption Detection Platform for Mexican Government Procurement**

> *"There are things that cannot be measured in terms of victory or defeat."* - Yang Wen-li

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red.svg)](#license)

---

## What Is This?

Yang Wen-li is an intelligence platform that analyzes **3.1 million Mexican federal procurement contracts** (2002-2025) worth over **6 trillion pesos**. Using a 16-feature per-sector calibrated risk model validated against 15 documented corruption cases, it identifies patterns consistent with fraud, collusion, and abuse of public funds.

This is not a simple dashboard. It is a full analytical engine with:

- **Calibrated risk scores** — every score is P(corrupt|features), a real probability with 95% confidence intervals
- **Per-sector sub-models** — 12 dedicated logistic regressions capture sector-specific corruption patterns
- **Multivariate anomaly detection** via Mahalanobis distance across 16 feature dimensions
- **Ground truth validation** against 15 documented cases including Odebrecht, Estafa Maestra, IMSS Ghost Companies, Segalmex, Toka IT Monopoly, and more
- **Network analysis** for vendor collusion and bid-rigging detection
- **Bilingual interface** (Spanish/English) with 22+ interactive pages

### Key Metrics

| Metric | Value |
|--------|-------|
| Contracts analyzed | 3,110,007 |
| Validated procurement value | ~6T MXN |
| Vendors | 320,429 |
| Institutions | 4,456 |
| Risk model | **v5.0** (per-sector calibrated) |
| Train AUC-ROC | **0.967** |
| Test AUC-ROC | **0.960** (temporal split) |
| Detection rate (known cases) | **93.0%** high+ |
| False negative rate | **0.2%** |
| Ground truth cases | 15 (27 vendors, 26,582 contracts) |
| High-risk rate | 7.9% (OECD benchmark: 2-15%) |

---

## Architecture

```
yangwenli/
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
| Ground Truth | `/ground-truth` | 15 validated corruption cases and detection performance |
| Model Transparency | `/model` | v5.0 model coefficients, feature importance, explainability |
| Methodology | `/methodology` | Full risk scoring methodology documentation |
| Settings | `/settings` | Theme, language, data quality metrics |

---

## Risk Model v5.0

The platform uses a **per-sector calibrated probability framework** — every risk score is P(corrupt|features), not an arbitrary index. Trained on contracts through 2020, tested on 2021+ for honest generalization.

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
| direct_award | +0.18 | Now correctly positive (was negative in v4.0) |

### Risk Levels

| Level | Threshold | Count | % |
|-------|-----------|-------|---|
| **Critical** | >= 0.50 | 178,938 | 5.8% |
| **High** | >= 0.30 | 67,190 | 2.2% |
| **Medium** | >= 0.10 | 294,468 | 9.5% |
| **Low** | < 0.10 | 2,569,411 | 82.6% |

### Validation Against 15 Documented Cases

| Case | Type | Contracts | High+ Detection | Avg Score |
|------|------|-----------|:---------:|-----------|
| IMSS Ghost Companies | Ghost companies | 9,366 | 99.0% | 0.977 |
| Segalmex | Procurement fraud | 6,326 | 89.3% | 0.664 |
| COVID-19 Procurement | Embezzlement | 5,371 | 84.9% | 0.821 |
| Edenred Voucher Monopoly | Monopoly | 2,939 | 96.7% | 0.884 |
| Toka IT Monopoly | Monopoly | 1,954 | 100% | 0.964 |
| Infrastructure Network | Overpricing | 191 | 99.5% | 0.962 |
| SixSigma Tender Rigging | Tender rigging | 147 | 87.8% | 0.756 |
| Cyber Robotic IT | Overpricing | 139 | 14.4% | 0.249 |
| PEMEX-Cotemar | Procurement fraud | 51 | 100% | 1.000 |
| IPN Cartel de la Limpieza | Bid rigging | 48 | 64.6% | 0.551 |
| Odebrecht-PEMEX | Bribery | 35 | 97.1% | 0.915 |
| La Estafa Maestra | Ghost companies | 10 | 0% | 0.179 |
| Grupo Higa | Conflict of interest | 3 | 33.3% | 0.359 |
| Oceanografia | Invoice fraud | 2 | 0% | 0.152 |

### Model Evolution

| Version | AUC | Cases | Features | Key Innovation |
|---------|-----|-------|----------|---------------|
| v3.3 | 0.584 | — | 8 weighted | IMF-aligned checklist |
| v4.0 | 0.942 | 9 | 12 z-score | Statistical calibration, Mahalanobis |
| **v5.0** | **0.960** | **15** | **16 z-score** | Per-sector models, temporal validation, PU-learning |

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

- Amounts > 100B MXN are **rejected** (decimal point errors from source)
- Amounts > 10B MXN are **flagged** for manual review
- 12-sector taxonomy classifies institutions by Ramo codes

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- The SQLite database file (`RUBLI_NORMALIZED.db`)

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

### Docker

```bash
# Build and run (requires RUBLI_NORMALIZED.db in backend/)
docker compose up --build

# Frontend available at http://localhost:3009
```

---

## API

The backend exposes **60+ REST endpoints** across 10+ router modules. Full interactive documentation at `/docs` when running.

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

---

## Testing

```bash
# Backend (238 tests)
python -m pytest backend/tests/ -q --tb=short

# Frontend (45 tests)
cd frontend && npx vitest run

# TypeScript compilation
cd frontend && npx tsc --noEmit
```

---

## Limitations

1. **Ground truth bias** — Despite diversification to 15 cases, 3 cases still contribute most training contracts. The model may underperform on novel corruption types.
2. **Data quality degrades with age** — 2002-2010 has 0.1% RFC coverage; risk scores may be underestimated for this period.
3. **Correlation, not causation** — A high score indicates statistical anomaly consistent with corruption patterns, not proof of wrongdoing.
4. **PU-learning assumption** — The Elkan & Noto correction assumes labeled positives are representative of all corrupt contracts.
5. **Small-case weakness** — Cases with few contracts (La Estafa Maestra: 10, Grupo Higa: 3) have lower detection rates.

---

## Methodology

Full documentation:
- [`docs/RISK_METHODOLOGY_v5.md`](docs/RISK_METHODOLOGY_v5.md) — v5.0 per-sector calibrated model (active)
- [`docs/RISK_METHODOLOGY_v4.md`](docs/RISK_METHODOLOGY_v4.md) — v4.0 statistical framework (preserved)
- [`docs/RISK_METHODOLOGY.md`](docs/RISK_METHODOLOGY.md) — v3.3 weighted checklist (preserved)
- [`docs/MODEL_COMPARISON_REPORT.md`](docs/MODEL_COMPARISON_REPORT.md) — v3.3 vs v4.0 comparison

---

## Acknowledgments

- **COMPRANET** — Mexico's federal procurement transparency platform
- **IMF / World Bank / OECD** — Risk methodology frameworks
- **Open Contracting Partnership** — Red flags library
- **Elkan & Noto (2008)** — PU-learning methodology

---

## License

All Rights Reserved. Unauthorized copying, distribution, or modification is prohibited without explicit permission.

---

*Named after Yang Wen-li from Legend of the Galactic Heroes — the pragmatic historian who valued transparency and democratic institutions over blind ambition.*
