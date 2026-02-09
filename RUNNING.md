# Running Yang Wen-li

## Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- Database file at `backend/RUBLI_NORMALIZED.db`

## Quick Start (Both Servers)

```bash
# Terminal 1 — Backend API (port 8001)
cd backend
python -m uvicorn api.main:app --port 8001 --host 127.0.0.1

# Terminal 2 — Frontend (port 3009)
cd frontend
npx vite --port 3009
```

Then open **http://localhost:3009**

## Individual Commands

### Backend Only

```bash
cd backend
python -m uvicorn api.main:app --port 8001 --host 127.0.0.1
```

- API docs: http://127.0.0.1:8001/docs
- Health check: http://127.0.0.1:8001/api/v1/health

### Frontend Only

```bash
cd frontend
npx vite --port 3009
```

### Frontend Production Build

```bash
cd frontend
npm run build          # outputs to frontend/dist/
npx vite preview       # preview the build locally
```

## Stopping Servers

### Windows (PowerShell)

```powershell
# Find and kill by port
netstat -ano | findstr :8001
taskkill /F /PID <pid>

netstat -ano | findstr :3009
taskkill /F /PID <pid>
```

### Windows (CMD)

```cmd
taskkill /F /IM python.exe    & REM kills backend
taskkill /F /IM node.exe      & REM kills frontend
```

## Running Tests

```bash
# Backend tests (25 unit + 15 API tests)
python -m pytest backend/tests/ -v

# Frontend tests
cd frontend && npx vitest run

# TypeScript check (no emit)
cd frontend && npx tsc --noEmit
```

## Common Issues

| Problem | Fix |
|---------|-----|
| Port 8001 already in use | Kill existing: `netstat -ano \| findstr :8001` then `taskkill /F /PID <pid>` |
| Port 3009 already in use | Same as above with `:3009` |
| Backend slow first load | Normal — warmup hits 7 endpoints on startup, takes ~30s |
| `localhost` is slow (2s) | Use `127.0.0.1` instead (Windows DNS issue) |
| Frontend HMR not working | Check Vite is running, try hard refresh (Ctrl+Shift+R) |
| Database not found | Ensure `backend/RUBLI_NORMALIZED.db` exists |

## Environment

| Item | Value |
|------|-------|
| Backend URL | http://127.0.0.1:8001 |
| Frontend URL | http://localhost:3009 |
| API Docs | http://127.0.0.1:8001/docs |
| Database | backend/RUBLI_NORMALIZED.db |
| Records | ~3.1M contracts (2002-2025) |
