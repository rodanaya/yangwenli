# RUBLI

**AI-Powered Corruption Detection Platform for Mexican Government Procurement**

[![Backend Tests](https://github.com/rodanaya/yangwenli/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/rodanaya/yangwenli/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/frontend-tests.yml)
[![CodeQL](https://github.com/rodanaya/yangwenli/actions/workflows/codeql.yml/badge.svg)](https://github.com/rodanaya/yangwenli/actions/workflows/codeql.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)

🔴 **Live at [rubli.xyz](https://rubli.xyz)**

---

## What Is This?

RUBLI is a full-stack intelligence platform that analyzes **3.1 million Mexican federal procurement contracts** (2002–2025) worth over **9.9 trillion pesos**. It uses a 16-feature per-sector calibrated statistical risk model, validated against 748 documented corruption cases, to surface patterns consistent with fraud, collusion, and abuse of public funds.

Built for investigative journalists, government auditors, and transparency researchers. Free and open-source.

> **Score Interpretation**: Risk scores are statistical risk indicators measuring similarity to documented corruption patterns — not proof of wrongdoing. Use scores for investigation triage only.

### Key Metrics

| Metric | Value |
|--------|-------|
| Contracts analyzed | 3,051,294 |
| Validated procurement value | ~9.9T MXN |
| Vendors tracked | 320,429 |
| Institutions | 4,456 |
| Active risk model | **v6.5** (per-sector calibrated, OECD-aligned) |
| Train AUC-ROC | **0.798** (vendor-stratified holdout) |
| Test AUC-ROC | **0.828** (vendor-stratified holdout) |
| Ground truth cases | **748** (603 vendors, ~288K scoped contracts) |
| High-risk rate | **13.49%** — critical 6.01% + high 7.48% (OECD benchmark: 2–15%) |
| High-risk contracts | **413,845** |
| ARIA investigation queue | **318,441 vendors** — T1=320 critical, T2=1,234 high |

---

## What It Detects

The platform identifies six procurement fraud patterns documented in the academic and anti-corruption literature:

- **Ghost company networks** — shell vendors with no real operations, used to siphon funds
- **Vendor monopolization** — single vendors capturing entire institutional budgets
- **Bid rigging and tender manipulation** — coordinated bidding to predetermine winners
- **Overpricing** — systematic price inflation vs. sector norms
- **Conflict of interest** — politically connected vendors winning contracts
- **Emergency procurement abuse** — crisis procedures used to bypass competition

---

## Architecture

```
rubli/
├── backend/                  # Python 3.11 / FastAPI REST API
│   ├── api/
│   │   ├── routers/          # 30+ router modules (60+ endpoints)
│   │   ├── services/         # Business logic layer
│   │   └── main.py           # GZip, CORS, startup checks
│   ├── scripts/              # ETL pipeline, risk model training, ARIA pipeline
│   └── RUBLI_NORMALIZED.db   # SQLite (~6.2 GB — not in repo)
├── frontend/                 # React 18 + TypeScript + Vite
│   └── src/
│       ├── pages/            # 36+ page components
│       ├── components/       # Shared UI (shadcn/ui, Recharts, D3)
│       ├── api/              # Typed API client
│       ├── i18n/             # ES/EN translations (22+ namespaces)
│       └── hooks/            # Custom React hooks
├── docker-compose.prod.yml   # Production: backend + frontend + Caddy (HTTPS)
└── docs/                     # Methodology, model docs, ARIA spec
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | SQLite, WAL mode, 200MB cache, pre-computed aggregate tables |
| Backend | Python 3.11, FastAPI, uvicorn, service layer pattern |
| Frontend | React 18, TypeScript 5, Vite, TanStack Query v5, Recharts |
| UI | Tailwind CSS v4, shadcn/ui, custom dark intelligence theme |
| Risk Model | Per-sector logistic regression, Elkan & Noto PU-learning, SHAP explanations |
| i18n | react-i18next — Spanish and English |
| Deploy | Docker Compose + Caddy (auto-TLS, Let's Encrypt) |

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
| ARIA Queue | `/aria` | Investigation priority queue — T1/T2/T3/T4 tiers, 7 pattern types |
| Procurement Intelligence | `/procurement-intelligence` | Live alert ticker, sector heatmap, top risk signals |
| Patterns | `/patterns` | Pattern analysis — concentration, co-bidding, year-end clustering |
| Temporal Pulse | `/temporal` | Monthly rhythm analysis, seasonal corruption signals |
| Administrations | `/administrations` | Presidential comparison: Fox through Sheinbaum |
| Institution Health | `/institutions/health` | HHI concentration rankings, institutional risk scores |
| Price Intelligence | `/price-analysis` | Pricing anomalies, statistical outlier scatter plots |
| Contracts | `/contracts` | Full contract table with risk filtering and bookmarks |
| Spending Categories | `/categories` | CUCOP category-level spend analysis |
| Red Flags | `/red-flags` | Risk factor co-occurrence and interaction maps |
| State Expenditure | `/state-expenditure` | Federal funds in state/municipal procurement (484K contracts) |
| Watchlist | `/watchlist` | Tracked vendors and institutions |

### Profiles
| Page | Route | Description |
|------|-------|-------------|
| Vendor Profile | `/vendors/:id` | Radar chart, SHAP breakdown, external records, collusion signals |
| Red Thread | `/thread/:id` | Scroll-driven 6-chapter investigative narrative per vendor |
| Institution Profile | `/institutions/:id` | Vendor concentration, sector exposure, risk trends |
| Sector Profile | `/sectors/:id` | OECD benchmarks, red flag rates, top vendors |
| Contract Detail | `/contracts/:id` | Full risk breakdown with confidence intervals |
| Case Detail | `/cases/:id` | Fraud type, timeline, detection signals, impact KPIs |

### Understand
| Page | Route | Description |
|------|-------|-------------|
| Sectors | `/sectors` | 12-sector taxonomy with treemap and sparkline trends |
| Ground Truth | `/ground-truth` | 748 validated corruption cases and per-case detection rates |
| Stories | `/journalists` | Pre-built investigative editorial narratives |
| Model Transparency | `/model` | v6.5 coefficients, feature importance, per-sector sub-models |
| Methodology | `/methodology` | Full risk scoring methodology documentation |
| Limitations | `/limitations` | Known blind spots, workarounds, what the model cannot detect |
| API Explorer | `/api-explorer` | Interactive catalog of all 60+ backend endpoints |

---

## Risk Model v6.5

The active model uses **per-sector statistical risk scoring**. Scores measure similarity to documented corruption patterns, normalized by sector and year baselines.

### 9 Active Features (Global Model)

| Feature | Coefficient | Interpretation |
|---------|------------|----------------|
| **price_volatility** | +0.5343 | Vendor contract-size variance vs. sector norm — strongest signal |
| **institution_diversity** | −0.3821 | Vendors serving many institutions are less suspicious |
| **vendor_concentration** | +0.3749 | Disproportionate market share within sector |
| **price_ratio** | +0.2345 | Contract amount / sector median |
| **network_member_count** | +0.1811 | Co-contracting network size |
| **same_day_count** | +0.0945 | Threshold-splitting signal |
| **win_rate** | +0.0488 | Vendor win rate vs. sector baseline |
| **direct_award** | +0.0306 | Non-competitive procedure |
| **ad_period_days** | +0.0423 | Publication period anomaly |

*7 features regularized to 0 by near-L1 ElasticNet (C=0.01, l1_ratio=0.9673).*

### Risk Levels

| Level | Threshold | Count | % |
|-------|-----------|-------|---|
| **Critical** | >= 0.60 | 184,031 | 6.01% |
| **High** | >= 0.40 | 228,814 | 7.48% |
| **Medium** | >= 0.25 | 821,251 | 26.84% |
| **Low** | < 0.25 | 1,817,198 | 59.39% |

**High-risk rate: 13.49%** — within OECD benchmark of 2–15%.

### Architecture

- **13 models**: 1 global + 12 per-sector logistic regressions
- **PU-learning**: Elkan & Noto (2008), c=0.30 (floor), intercept=−2.3837
- **Hyperparameters**: C=0.01, l1_ratio=0.9673 (Optuna TPE, 150 trials)
- **Ground truth**: 748 windowed/institution-scoped cases, 603 vendors
- **4 structural FPs excluded**: BAXTER, FRESENIUS, INFRA SA DE CV, PRAXAIR (legal monopolies by regulation)
- **Z-score cap**: ±5 SD (prevents epsilon-floor explosion in thin sector-year cells)

### Validated Against Documented Corruption Cases

Training cases include: IMSS Ghost Company Network, Segalmex Food Distribution, COVID-19 Emergency Procurement, La Estafa Maestra, Odebrecht-PEMEX Bribery, Grupo Higa/Casa Blanca, TOKA IT Monopoly, Edenred Voucher Monopoly, SixSigma Tender Rigging, SAT EFOS ghost companies, and 738 additional windowed cases.

### Model Evolution

| Version | AUC (train) | AUC (test) | GT Cases | Key Change |
|---------|-------------|------------|----------|------------|
| v3.3 | 0.584 | — | — | IMF-aligned weighted checklist |
| v4.0 | 0.951 | — (in-sample) | 9 | Z-score normalization, Mahalanobis |
| v5.1 | 0.964 | 0.957 | 22 | Per-sector sub-models, PU-learning |
| v6.4 | 0.840 | 0.863 | ~714 | Optuna TPE, windowed GT labels |
| **v6.5** | **0.798** | **0.828** | **748** | Institution-scoped GT, FP exclusions, curriculum learning |

*v6.5 AUC is lower than v5.1 because: (1) v5.1 had temporal leakage in vendor aggregates, (2) v6.5 uses vendor-stratified holdout (honest), (3) larger GT set includes harder cases.*

---

## ARIA: Automated Risk Investigation Algorithm

ARIA is a 9-module pipeline combining risk scores, SHAP explanations, financial scale, and external registries into a unified investigation queue.

```
318,441 vendors
  → IPS score (weighted combination of risk, anomaly, financial, external)
  → Pattern classifier (P1–P7: monopoly, ghost, intermediary, bid rigging, overpricing, capture, conflict)
  → Tier assignment (T1: critical, T2: high, T3: medium, T4: monitoring)
  → External cross-reference (SAT EFOS 13,960 + SFP sanctions 1,954)
  → Investigation queue with review workflow
```

**Current queue (March 2026 run):** T1=320 · T2=1,234 · T3=5,016 · T4=311,871

Full spec: [`docs/ARIA_SPEC.md`](docs/ARIA_SPEC.md)

---

## Data Sources

All procurement data comes from **COMPRANET**, Mexico's federal electronic procurement system:

| Structure | Years | RFC Coverage | Quality |
|-----------|-------|-------------|---------|
| A | 2002–2010 | 0.1% | Lowest — risk may be underestimated |
| B | 2010–2017 | 15.7% | Better |
| C | 2018–2022 | 30.3% | Good |
| D | 2023–2025 | 47.4% | Best |

### External Data Integrated

| Source | Records | Purpose |
|--------|---------|---------|
| SAT EFOS Definitivo | 13,960 RFC-confirmed ghost companies | External flag in ARIA |
| SFP Sanctions | 1,954 debarment records | External flag in ARIA |
| RUPC | 23,704 contractor registry records | Vendor verification |

### Data Validation

- Amounts > 100B MXN: **rejected** as decimal errors
- Amounts > 10B MXN: **flagged** for manual review

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- The SQLite database file (`RUBLI_NORMALIZED.db`, ~6.2 GB — not included in repo)

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

**Cold start note:** `_startup_checks()` scans ~3.05M rows on first startup — expect 30–60s. Expected behavior.

### Docker (Production)

```bash
cp .env.prod.example .env.prod  # fill in VITE_RUBLI_WRITE_KEY
docker compose -f docker-compose.prod.yml up -d --build
```

### Testing

```bash
# Backend (590 tests)
python -m pytest backend/tests/ -q --tb=short -p no:cacheprovider

# TypeScript — both checks required
cd frontend
npx tsc --noEmit
npm run build
```

---

## API

60+ REST endpoints across 30+ router modules. Interactive docs at `https://rubli.xyz/docs` (or `http://localhost:8001/docs` in dev).

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Fast health check using precomputed stats |
| `GET /api/v1/executive/summary` | Consolidated executive intelligence report |
| `GET /api/v1/contracts` | Paginated contract search with risk/sector/year filters |
| `GET /api/v1/vendors/{id}` | Vendor profile with SHAP radar and risk metrics |
| `GET /api/v1/aria/queue` | ARIA investigation queue with tier/pattern filters |
| `GET /api/v1/analysis/risk-overview` | Platform-wide risk distribution |
| `GET /api/v1/analysis/patterns/co-bidding` | Co-bidding collusion analysis |
| `GET /api/v1/network/co-bidders/{id}` | Vendor co-bidding network |
| `GET /api/v1/search` | Federated search across contracts, vendors, institutions |

---

## Known Limitations

1. **Execution-phase fraud invisible** — RUBLI analyzes contract award data only. Cost overruns, kickbacks, and ghost workers during execution are undetectable. Cross-reference with ASF audit findings.

2. **Training bias toward large concentrated vendors** — IMSS, Segalmex, and COVID-19 cases account for ~79% of positive training contracts. Novel patterns from small-scale fraud are underdetected.

3. **Ghost company blind spot (partial)** — Small shell companies (EFOS-type: few contracts, low concentration) score 0.28 avg vs. 0.85 for training-dominant cases. Partially addressed in v6.5, not fully solved.

4. **Vendor deduplication incomplete** — Same company appears under hundreds of name variants over 23 years. RFC is the primary key when available (0.1% pre-2010, 47% in 2023-2025).

5. **SCAR assumption violated** — Ground truth is selected from high-profile documented scandals, not a random sample of all corruption. The model is best at detecting patterns similar to known cases.

6. **Correlation, not causation** — High score = statistical similarity to known corruption patterns, not proof of wrongdoing. Scores are investigation triage tools.

Full interactive limitations: [rubli.xyz/limitations](https://rubli.xyz/limitations)

---

## Methodology

- [`docs/RISK_METHODOLOGY_v6.md`](docs/RISK_METHODOLOGY_v6.md) — v6.5 active model
- [`docs/RISK_METHODOLOGY_v5.md`](docs/RISK_METHODOLOGY_v5.md) — v5.1 (preserved)
- [`docs/RISK_METHODOLOGY_v4.md`](docs/RISK_METHODOLOGY_v4.md) — v4.0 (preserved)
- [`docs/ARIA_SPEC.md`](docs/ARIA_SPEC.md) — ARIA pipeline specification

**Key references:**
- Elkan & Noto (2008) — Positive-Unlabeled learning correction
- IMF Working Paper 2022/094 — Corruption Risk Index methodology
- OECD (2023) — Public Procurement Performance Report

---

## About RUBLI

RUBLI is an open-source procurement intelligence platform for Mexican federal contracting data. It applies statistical risk modeling to make 3.1 million contracts investigable by journalists, auditors, NGOs, and citizens.

Risk scores are statistical risk indicators. High score ≠ proof of wrongdoing.

---

## Acknowledgments

- **COMPRANET** — Mexico's federal procurement transparency platform (datos.gob.mx)
- **SAT** — EFOS definitivo ghost company registry
- **SFP** — Sanction and debarment records
- **IMF / World Bank / OECD** — Risk methodology frameworks

---

## License

[Apache License 2.0](LICENSE) — free to use, modify, and distribute with attribution.
