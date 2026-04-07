"""
health.py — /health, /health/ready, and /health/live endpoints for the RUBLI API.

Returns system status including database connectivity, contract count,
last backup metadata, WAL file size, and API version.

The endpoint is designed to respond in <100ms:
  - Contract count is read from precomputed_stats['overview'] (a single row lookup),
    not from COUNT(*) on the 3.1M-row contracts table.
  - Database size is read from the filesystem (no SQL needed).
  - Backup info is read from LAST_BACKUP.json on disk.
  - WAL size is a simple stat() call.

Endpoints
---------
GET /health          — Full health check (Docker healthcheck target)
GET /health/ready    — Readiness probe: 200 if DB is reachable, 503 otherwise
GET /health/live     — Liveness probe: always 200 (process is alive)
"""

import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])

# ─── Paths ───────────────────────────────────────────────────────────────────

# Resolve relative to this file: api/routers/health.py → backend/
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

# DATABASE_PATH env var mirrors the production setting in docker-compose.prod.yml
_DB_PATH = Path(
    os.environ.get(
        "DATABASE_PATH",
        str(_BACKEND_DIR / "RUBLI_NORMALIZED.db"),
    )
)
_BACKUP_JSON = _BACKEND_DIR / "backups" / "LAST_BACKUP.json"

# ─── Version ─────────────────────────────────────────────────────────────────

API_VERSION = "2.0"

# ─── Server start time (module-level — set once at import) ───────────────────

_START_TIME = time.monotonic()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_db_info() -> dict:
    """Return database connectivity and stats. Fast: single precomputed row lookup."""
    if not _DB_PATH.exists():
        return {
            "connected": False,
            "db_path": str(_DB_PATH),
            "contract_count": None,
            "size_mb": None,
            "error": "Database file not found",
        }

    size_mb = round(_DB_PATH.stat().st_size / (1024 * 1024), 1)

    contract_count = None
    connected = False
    error = None
    conn = None
    try:
        conn = sqlite3.connect(str(_DB_PATH), timeout=5)
        try:
            # Fast path: read from precomputed_stats (single indexed row lookup)
            row = conn.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'overview' LIMIT 1"
            ).fetchone()
            if row:
                overview = json.loads(row[0])
                contract_count = overview.get("total_contracts")
        except Exception:
            pass

        if contract_count is None:
            # Fallback: use vendor_stats aggregate (still much faster than COUNT(*) on contracts)
            try:
                row = conn.execute(
                    "SELECT SUM(total_contracts) FROM vendor_stats WHERE total_contracts > 0"
                ).fetchone()
                if row and row[0]:
                    contract_count = int(row[0])
            except Exception:
                pass

        connected = True
    except sqlite3.Error as exc:
        error = str(exc)
    finally:
        if conn is not None:
            conn.close()

    return {
        "connected": connected,
        "db_path": str(_DB_PATH),
        "contract_count": contract_count,
        "size_mb": size_mb,
        "error": error,
    }


def _get_last_backup() -> dict | None:
    """Read LAST_BACKUP.json. Returns None if file is missing or unreadable."""
    try:
        data = json.loads(_BACKUP_JSON.read_text())
        ts_str = data.get("last_backup")
        if ts_str:
            ts = datetime.fromisoformat(ts_str)
            # Make timezone-aware if naive (assume UTC)
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            age_hours = round((now - ts).total_seconds() / 3600, 2)
            return {
                "timestamp": ts_str,
                "age_hours": age_hours,
                "files": data.get("files", []),
                "size_bytes": data.get("size_bytes"),
            }
    except (FileNotFoundError, json.JSONDecodeError, KeyError, ValueError):
        pass
    return None


def _get_wal_size_mb() -> float | None:
    """Return WAL file size in MB, or None if WAL does not exist."""
    wal = Path(str(_DB_PATH) + "-wal")
    if not wal.exists():
        return None
    return round(wal.stat().st_size / (1024 * 1024), 2)


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/health", summary="Platform health check")
async def health_check():
    """
    Return platform health status.

    Structured response fields:
    - status: "ok" | "unhealthy"
    - db_connected: bool
    - db_path: resolved path to the active database file
    - contract_count: total contracts from precomputed_stats (fast lookup)
    - uptime_seconds: seconds since the API process started
    - version: API version string

    Responds with HTTP 200 when healthy, HTTP 503 when the database is
    unreachable (so Docker healthcheck marks the container as unhealthy).
    """
    t0 = time.monotonic()

    db = _get_db_info()
    backup = _get_last_backup()
    wal_mb = _get_wal_size_mb()
    uptime_seconds = round(time.monotonic() - _START_TIME, 1)

    elapsed_ms = round((time.monotonic() - t0) * 1000, 1)

    is_healthy = db["connected"]
    status = "ok" if is_healthy else "unhealthy"
    http_status = 200 if is_healthy else 503

    body: dict = {
        "status": status,
        "db_connected": db["connected"],
        "db_path": db["db_path"],
        "contract_count": db["contract_count"],
        "uptime_seconds": uptime_seconds,
        "version": API_VERSION,
        # Extended fields (backward-compatible additions)
        "database": {
            "connected": db["connected"],
            "contract_count": db["contract_count"],
            "size_mb": db["size_mb"],
        },
        "last_backup": backup,
        "wal_size_mb": wal_mb,
        "response_ms": elapsed_ms,
    }

    if not is_healthy:
        body["error"] = db.get("error") or "Database unreachable"

    return JSONResponse(status_code=http_status, content=body)


@router.get("/health/ready", summary="Readiness probe")
async def health_ready():
    """
    Kubernetes / Docker readiness probe.

    Returns HTTP 200 when the database is reachable and the API can serve
    requests. Returns HTTP 503 with ``{"status": "unhealthy", "error": "..."}``
    when the database is down so the orchestrator stops routing traffic here.
    """
    db = _get_db_info()

    if db["connected"]:
        return JSONResponse(
            status_code=200,
            content={"status": "ready", "db_connected": True},
        )

    return JSONResponse(
        status_code=503,
        content={
            "status": "unhealthy",
            "error": db.get("error") or "Database unreachable",
        },
    )


@router.get("/health/live", summary="Liveness probe")
async def health_live():
    """
    Kubernetes / Docker liveness probe.

    Always returns HTTP 200 — if this endpoint is reachable, the process
    is alive. No database check is performed so this never causes a
    container restart due to a temporary DB hiccup.
    """
    return JSONResponse(
        status_code=200,
        content={"status": "alive", "uptime_seconds": round(time.monotonic() - _START_TIME, 1)},
    )
