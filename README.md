# Yang Wen-li

> *"There are things that cannot be measured in terms of victory or defeat."* - Yang Wen-li

**AI-Powered Corruption Detection Platform for Mexican Government Procurement**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)

---

## Overview

Yang Wen-li is a transparency platform that analyzes **3.1+ million Mexican government procurement contracts** (2002-2025) from COMPRANET to detect corruption risk patterns. Named after the pragmatic historian from *Legend of the Galactic Heroes* who valued transparency and democratic institutions.

### What It Does

- **Risk Scoring**: 10-factor model aligned with IMF Corruption Risk Index methodology
- **Vendor Analysis**: Entity resolution and network analysis to detect collusion patterns
- **Sector Monitoring**: Track procurement patterns across 12 government sectors
- **Anomaly Detection**: Statistical methods to identify suspicious contracts
- **Export & Reporting**: Generate reports for investigators and journalists

### Key Statistics

| Metric | Value |
|--------|-------|
| Contracts Analyzed | 3,110,017 |
| Time Period | 2002-2025 |
| Total Value | ~6-8 Trillion MXN |
| Sectors Covered | 12 |
| Risk Factors | 10 |

---

## Features

### Risk Scoring Model

The platform implements a research-backed 10-factor risk model:

| Factor | Weight | Source |
|--------|--------|--------|
| Single bidding | 15% | OECD, EU ARACHNE |
| Non-open procedure | 15% | UNCITRAL |
| Price anomaly | 15% | World Bank INT |
| Vendor concentration | 10% | G20 Guidelines |
| Short ad period | 10% | EU Directive 2014/24 |
| Short decision period | 10% | IMF CRI |
| Year-end timing | 5% | IMCO Mexico |
| Contract modification | 10% | UNODC |
| Threshold splitting | 5% | ISO 37001 |
| Network risk | 5% | OCDS |

### 12-Sector Taxonomy

Contracts are classified into standardized sectors:

```
Salud | Educacion | Infraestructura | Energia | Defensa | Tecnologia
Hacienda | Gobernacion | Agricultura | Ambiente | Trabajo | Otros
```

### Interactive Dashboard

- Real-time contract filtering and search
- Sector comparison visualizations
- Vendor relationship mapping
- Risk trend analysis
- Export to CSV/Excel

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- SQLite 3

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/yangwenli.git
cd yangwenli

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

### Configuration

Create environment files:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### Running the Application

```bash
# Terminal 1: Start backend (port 8001)
cd backend
uvicorn api.main:app --reload --port 8001

# Terminal 2: Start frontend (port 3009)
cd frontend
npm run dev
```

Open http://localhost:3009 in your browser.

---

## Project Structure

```
yangwenli/
├── backend/
│   ├── api/                    # FastAPI application
│   │   ├── main.py            # Application entry point
│   │   ├── routers/           # API endpoint definitions
│   │   └── dependencies.py    # Database connections
│   ├── scripts/               # ETL and analysis scripts
│   │   ├── etl_pipeline.py    # Main ETL process
│   │   ├── etl_create_schema.py
│   │   └── calculate_risk_scores.py
│   └── RUBLI_NORMALIZED.db    # SQLite database (not in repo)
│
├── frontend/
│   ├── src/
│   │   ├── pages/             # React page components
│   │   ├── components/        # Reusable UI components
│   │   ├── api/               # API client
│   │   └── hooks/             # Custom React hooks
│   └── package.json
│
├── docs/                       # Documentation
│   ├── RISK_METHODOLOGY.md    # Detailed risk scoring docs
│   └── DEPLOYMENT.md          # Deployment guide
│
└── original_data/             # Raw COMPRANET files (not in repo)
```

---

## API Reference

The backend exposes a RESTful API with 40+ endpoints:

### Core Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/contracts` | List contracts with filtering |
| `GET /api/v1/vendors` | List vendors with risk scores |
| `GET /api/v1/sectors` | List sectors with statistics |
| `GET /api/v1/institutions` | List government institutions |
| `GET /api/v1/stats` | Dashboard statistics |

### Analysis Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/sectors/{id}/risk` | Sector risk breakdown |
| `GET /api/v1/vendors/{id}/profile` | Vendor investigation profile |
| `GET /api/v1/analysis/anomalies` | Statistical anomaly detection |

### Export Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/export/contracts` | Export contracts to CSV |
| `GET /api/v1/export/vendors` | Export vendors to CSV |
| `GET /api/v1/export/report` | Generate investigation report |

Full API documentation available at `http://localhost:8001/docs` when running.

---

## Data Sources

### COMPRANET

All data comes from Mexico's official e-procurement system, [COMPRANET](https://compranet.hacienda.gob.mx/). The data spans four structural periods:

| Period | Years | Quality | RFC Coverage |
|--------|-------|---------|--------------|
| Structure A | 2002-2010 | Lowest | 0.1% |
| Structure B | 2010-2017 | Better | 15.7% |
| Structure C | 2018-2022 | Good | 30.3% |
| Structure D | 2023-2025 | Best | 47.4% |

### Data Validation

Critical validation rules are enforced:
- Amounts > 100B MXN are **rejected** (data entry errors)
- Amounts > 10B MXN are **flagged** for manual review
- Duplicate detection using entity resolution

---

## Tech Stack

### Backend
- **Python 3.10+** - Core language
- **FastAPI** - Modern async web framework
- **SQLite** - Database (3.1M+ records)
- **Splink** - Entity resolution for vendor deduplication
- **Pandas/NumPy** - Data processing

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **TanStack Query** - Server state management
- **TanStack Table** - Data tables with virtualization
- **Recharts/ECharts** - Visualizations
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pytest` for backend, `npm test` for frontend)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **COMPRANET** - Source of procurement data
- **IMF/World Bank/OECD** - Risk methodology frameworks
- **Open Contracting Partnership** - Red flags library
- **Yang Wen-li** - The fictional admiral who inspired the project's philosophy

---

## Contact

For questions about the methodology or data, please open an issue on GitHub.

---

*"The most important thing is not to win, but to understand."* - Yang Wen-li
