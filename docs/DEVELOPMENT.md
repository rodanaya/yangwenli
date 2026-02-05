# Development Quick Start

> Get up and running with Yang Wen-li in 5 minutes.

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- Git

---

## Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/yangwenli.git
cd yangwenli
```

### 2. Backend Setup

```bash
# Create virtual environment
cd backend
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify database exists
ls RUBLI_NORMALIZED.db  # Should exist (~1.5GB)
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn api.main:app --reload --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application

- **Frontend:** http://localhost:3009
- **Backend API:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

---

## Project Structure

```
yangwenli/
├── backend/
│   ├── api/                 # FastAPI application
│   │   ├── main.py          # App entry point
│   │   ├── routers/         # API endpoints
│   │   ├── models/          # Pydantic models
│   │   └── dependencies.py  # Database connection
│   ├── scripts/             # ETL and utility scripts
│   ├── tests/               # Backend tests
│   ├── RUBLI_NORMALIZED.db  # SQLite database
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── hooks/           # Custom React hooks
│   │   └── api/             # API client
│   ├── package.json
│   └── vite.config.ts
├── docs/                    # Documentation
└── CLAUDE.md               # AI assistant instructions
```

---

## Common Tasks

### Run Tests

```bash
# Backend tests with coverage
cd backend
pytest --cov=api --cov-report=term-missing

# Frontend tests
cd frontend
npm test
```

### Run Linting

```bash
# Python (if configured)
cd backend
ruff check .

# TypeScript/JavaScript
cd frontend
npm run lint
```

### Run ETL Pipeline

```bash
cd backend
python scripts/etl_pipeline.py
```

### Validate Data File

```bash
cd backend
python scripts/validate_compranet.py original_data/new_file.csv
```

---

## Environment Variables

### Backend (.env)

```env
# Optional - defaults work for development
DATABASE_URL=sqlite:///RUBLI_NORMALIZED.db
API_HOST=0.0.0.0
API_PORT=8001
LOG_LEVEL=INFO
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8001
```

---

## Database Access

The SQLite database can be queried directly:

```bash
cd backend
sqlite3 RUBLI_NORMALIZED.db

# Example queries
.tables                      # List all tables
.schema contracts            # Show table schema
SELECT COUNT(*) FROM contracts;  # Count records
```

---

## API Testing

### Using curl

```bash
# Get sectors
curl http://localhost:8001/api/v1/sectors

# Get contracts with filters
curl "http://localhost:8001/api/v1/contracts?sector_id=1&year=2024&limit=10"

# Get vendor details
curl http://localhost:8001/api/v1/vendors/123
```

### Using httpie

```bash
http :8001/api/v1/sectors
http :8001/api/v1/contracts sector_id==1 year==2024
```

---

## Troubleshooting

### Backend won't start

1. Check Python version: `python --version` (need 3.10+)
2. Verify venv is activated
3. Reinstall dependencies: `pip install -r requirements.txt`
4. Check database exists: `ls RUBLI_NORMALIZED.db`

### Frontend won't start

1. Check Node version: `node --version` (need 18+)
2. Clear cache: `rm -rf node_modules && npm install`
3. Check port 3009 is available

### Database locked error

SQLite allows only one writer. If you get a locked error:
1. Stop any running ETL scripts
2. Close SQLite CLI connections
3. Restart the backend server

### API returns 500 error

1. Check backend logs in terminal
2. Verify database integrity: `sqlite3 RUBLI_NORMALIZED.db "PRAGMA integrity_check;"`
3. Check for amount validation issues (>100B MXN)

---

## IDE Setup

### VS Code (Recommended)

Install extensions:
- Python
- Pylance
- ESLint
- Tailwind CSS IntelliSense

### PyCharm

1. Open `backend/` as project root
2. Configure interpreter to use venv
3. Mark `api/` as Sources Root

---

## Next Steps

1. Read [CLAUDE_CODE_GUIDE.md](./CLAUDE_CODE_GUIDE.md) for AI-assisted development
2. Review [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for data structure
3. Check [RISK_METHODOLOGY.md](./RISK_METHODOLOGY.md) for scoring logic
4. See [WORKFLOW_PATTERNS.md](./WORKFLOW_PATTERNS.md) for common tasks

---

*Last updated: January 2026*
