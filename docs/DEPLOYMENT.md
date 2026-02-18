# Deployment Guide

This guide covers deploying RUBLI in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Configuration](#configuration)
6. [Database Setup](#database-setup)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Purpose |
|----------|-----------------|---------|
| Python | 3.10+ | Backend runtime |
| Node.js | 18+ | Frontend build |
| SQLite | 3 | Database |
| Git | 2.0+ | Version control |

### Optional

- Docker & Docker Compose (for containerized deployment)
- nginx (for production reverse proxy)

---

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/rodanaya/yangwenli.git
cd rubli
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env as needed
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env as needed
```

### 4. Database Setup

The database file (`RUBLI_NORMALIZED.db`) is not included in the repository due to size. You have two options:

**Option A: Download Pre-built Database**
```bash
# Download from release assets (when available)
wget https://github.com/yourusername/rubli/releases/download/v1.0/RUBLI_NORMALIZED.db
mv RUBLI_NORMALIZED.db backend/
```

**Option B: Build from COMPRANET Data**
```bash
# Download COMPRANET data
# Place CSV files in original_data/

# Run ETL pipeline
cd backend
python scripts/etl_pipeline.py
```

### 5. Run Development Servers

```bash
# Terminal 1: Backend
cd backend
uvicorn api.main:app --reload --port 8001

# Terminal 2: Frontend
cd frontend
npm run dev
```

Access the application at http://localhost:3009

---

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build backend
docker build -t rubli-backend ./backend

# Build frontend
docker build -t rubli-frontend ./frontend

# Run backend
docker run -d -p 8001:8001 \
  -v $(pwd)/backend/RUBLI_NORMALIZED.db:/app/RUBLI_NORMALIZED.db \
  rubli-backend

# Run frontend
docker run -d -p 3009:80 rubli-frontend
```

---

## Production Deployment

### Architecture

```
                    ┌─────────────┐
                    │   nginx     │
                    │ (reverse    │
                    │  proxy)     │
                    └─────┬───────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
       ┌────▼────┐                 ┌────▼────┐
       │Frontend │                 │ Backend │
       │ (React) │                 │(FastAPI)│
       │ :3009   │                 │ :8001   │
       └─────────┘                 └────┬────┘
                                        │
                                   ┌────▼────┐
                                   │ SQLite  │
                                   │   DB    │
                                   └─────────┘
```

### nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3009;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Production Checklist

- [ ] Set `DEBUG=false` in backend .env
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up SSL/TLS certificates
- [ ] Configure database backups
- [ ] Set up monitoring/logging
- [ ] Review security settings

---

## Configuration

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `RUBLI_NORMALIZED.db` | Path to SQLite database |
| `API_HOST` | `0.0.0.0` | Server bind address |
| `API_PORT` | `8001` | Server port |
| `DEBUG` | `false` | Enable debug mode |
| `CORS_ORIGINS` | `http://localhost:3009` | Allowed CORS origins |
| `RATE_LIMIT_EXPENSIVE` | `5` | Rate limit for expensive endpoints |
| `DB_QUERY_TIMEOUT` | `30` | Query timeout in seconds |
| `LOG_LEVEL` | `INFO` | Logging level |

### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8001` | Backend API URL |
| `VITE_APP_NAME` | `RUBLI` | Application name |
| `VITE_ENABLE_EXPORTS` | `true` | Enable export features |

---

## Database Setup

### Database Schema

The database contains the following main tables:

| Table | Records | Description |
|-------|---------|-------------|
| `contracts` | ~3.1M | Procurement contracts |
| `vendors` | ~320K | Vendor entities |
| `institutions` | ~4.5K | Government institutions |
| `sectors` | 12 | Sector taxonomy |

### Running ETL

```bash
cd backend

# Full ETL pipeline
python scripts/etl_pipeline.py

# Individual steps
python scripts/etl_create_schema.py
python scripts/etl_classify.py
python scripts/calculate_risk_scores.py
```

### Database Backups

```bash
# Create backup
cp backend/RUBLI_NORMALIZED.db backend/RUBLI_NORMALIZED.db.backup_$(date +%Y%m%d)

# Restore from backup
cp backend/RUBLI_NORMALIZED.db.backup_20240115 backend/RUBLI_NORMALIZED.db
```

---

## Troubleshooting

### Common Issues

#### Backend won't start

```
Error: Database not found
```
**Solution:** Ensure `RUBLI_NORMALIZED.db` exists in the backend directory.

#### CORS errors in browser

```
Access to fetch blocked by CORS policy
```
**Solution:** Update `CORS_ORIGINS` in backend .env to include your frontend URL.

#### Slow queries

```
Query timeout exceeded
```
**Solution:**
- Increase `DB_QUERY_TIMEOUT`
- Add database indexes
- Reduce page size in requests

#### Frontend build fails

```
npm ERR! Could not resolve dependency
```
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

1. Check logs: `docker-compose logs -f`
2. Review configuration files
3. Search existing issues on GitHub
4. Open a new issue with details

---

## Performance Optimization

### Database Indexes

Ensure these indexes exist for optimal performance:

```sql
CREATE INDEX IF NOT EXISTS idx_contracts_sector ON contracts(sector_id);
CREATE INDEX IF NOT EXISTS idx_contracts_year ON contracts(year);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_institution ON contracts(institution_id);
CREATE INDEX IF NOT EXISTS idx_contracts_risk ON contracts(risk_score);
```

### Caching

Consider adding Redis for caching frequently accessed data:

```bash
# Install Redis
apt-get install redis-server

# Configure in backend
REDIS_URL=redis://localhost:6379
```

---

*"The most important thing is not to win, but to understand."* - RUBLI
