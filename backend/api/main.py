"""
RUBLI — Red Unificada de Busqueda de Licitaciones Irregulares

REST API for the RUBLI Mexican Government Procurement Analysis platform.

Run with: uvicorn api.main:app --port 8001 --reload
"""
import logging
import os
import threading
import time as _time_module
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware

# Configure structured logging FIRST (before any logger calls)
from .middleware.structlog_config import configure as configure_logging
configure_logging()

import structlog

# Optional rate limiting - gracefully degrade if slowapi not installed
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    RATE_LIMITING_ENABLED = True
except ImportError:
    RATE_LIMITING_ENABLED = False
    Limiter = None
    _rate_limit_exceeded_handler = None
    get_remote_address = None
    RateLimitExceeded = None

from .dependencies import verify_database_exists
from .middleware import RequestLoggingMiddleware, register_error_handlers

# Create rate limiter instance (if available)
if RATE_LIMITING_ENABLED:
    limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
else:
    limiter = None

# Track server start time for uptime reporting
_server_start_time = _time_module.time()
from .routers import (
    industries_router,
    vendors_router,
    stats_router,
    network_router,
    analysis_router,
    watchlist_router,
    reports_router,
    investigation_router,
)
from .routers.institutions import router as institutions_router
from .routers.contracts import router as contracts_router
from .routers.sectors import router as sectors_router
from .routers.export import router as export_router
from .routers.executive import router as executive_router
from .routers.categories import router as categories_router
from .routers.cases import router as cases_router

logger = structlog.get_logger("rubli.api")


def _warmup_caches():
    """Pre-populate expensive caches in a background thread so first requests are fast.

    Uses short timeouts (3s) to avoid blocking the thread pool with slow queries.
    Slow endpoints that miss the warmup window will be cached on first user request.
    IMPORTANT: Each request here blocks a thread pool thread, so keep list short
    and wait between requests to avoid starving user requests.
    """
    import urllib.request
    import time
    base = "http://127.0.0.1:8001"
    # Wait for server to be fully ready before hitting it
    time.sleep(3)
    # Only warm the fastest endpoints — heavy queries (contracts/statistics)
    # are better left to first user request to avoid blocking the thread pool
    endpoints = [
        "/api/v1/stats/dashboard/fast",          # Dashboard (highest priority, pre-computed)
        "/api/v1/sectors",                        # Sectors list (small table)
        "/api/v1/stats/data-quality",             # Header quality badge (cached)
        "/api/v1/analysis/patterns/counts",       # DetectivePatterns page (LIKE queries on 3.1M rows)
        "/api/v1/analysis/year-over-year",        # Shared by Trends, Patterns, Administrations
        "/api/v1/contracts/statistics",           # Explore page (3.8s cold)
        "/api/v1/analysis/overview",              # Patterns page (8.8s cold)
    ]
    for ep in endpoints:
        try:
            # Slow endpoints (contracts/statistics, overview) need longer timeout
            timeout = 12 if "statistics" in ep or "overview" in ep else 3
            urllib.request.urlopen(f"{base}{ep}", timeout=timeout)
        except Exception as e:
            logger.debug(f"Cache warmup skipped for {ep}: {e}")
        # Breathe between requests so user requests aren't starved
        time.sleep(0.5)


def _startup_checks():
    """Verify critical system state at startup."""
    import sqlite3
    from .dependencies import DB_PATH
    from .config.constants import RISK_THRESHOLDS_V4

    checks = []

    # 1. Database exists
    if not DB_PATH.exists():
        logger.error("startup_check_failed", check="database_exists", path=str(DB_PATH))
        checks.append("DATABASE MISSING")
    else:
        try:
            conn = sqlite3.connect(str(DB_PATH), timeout=10)
            cursor = conn.cursor()

            # 2. Verify risk_level/risk_score alignment (spot check)
            cursor.execute("""
                SELECT risk_level, MIN(risk_score), MAX(risk_score)
                FROM contracts GROUP BY risk_level
            """)
            for row in cursor.fetchall():
                level, min_s, max_s = row
                if level == 'critical' and min_s < RISK_THRESHOLDS_V4['critical'] - 0.001:
                    checks.append(f"risk_level misaligned: {level} min={min_s}")
                elif level == 'high' and min_s < RISK_THRESHOLDS_V4['high'] - 0.001:
                    checks.append(f"risk_level misaligned: {level} min={min_s}")

            # 3. Verify precomputed_stats freshness
            cursor.execute("""
                SELECT stat_key, updated_at FROM precomputed_stats
                ORDER BY updated_at DESC LIMIT 1
            """)
            row = cursor.fetchone()
            if row:
                logger.info("startup_check", precomputed_stats_updated=row[1])
            else:
                checks.append("precomputed_stats empty")

            conn.close()
        except Exception as e:
            checks.append(f"database error: {e}")

    if checks:
        for c in checks:
            logger.warning("startup_check_warning", issue=c)
    else:
        logger.info("startup_checks_passed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: run checks and warm caches."""
    _startup_checks()
    logger.info("Starting cache warmup in background...")
    warmup_thread = threading.Thread(target=_warmup_caches, daemon=True)
    warmup_thread.start()
    yield
    logger.info("Shutting down.")


# API metadata
API_TITLE = "RUBLI — Procurement Intelligence API"
API_DESCRIPTION = """
Red Unificada de Busqueda de Licitaciones Irregulares

## Overview

REST API for the RUBLI platform — AI-powered corruption detection
for Mexican federal government procurement (2002-2025).

### Key Statistics
- **3.1M** contracts analyzed
- **320,000+** vendors profiled
- **12** federal sectors
- **v5.0** risk model (AUC 0.960)

### Core Endpoints

- **Contracts** - Search and filter procurement contracts
- **Vendors** - Vendor profiles and risk analysis
- **Institutions** - Government institution analysis
- **Sectors** - Sector-level intelligence
- **Analysis** - Risk patterns and anomaly detection
- **Investigation** - ML-generated investigation leads
- **Executive** - Consolidated executive summary
"""
API_VERSION = "1.0.0"

# Create FastAPI app
_docs_enabled = os.environ.get("ENABLE_DOCS", "true").lower() == "true"
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    lifespan=lifespan,
)

# Register global error handlers
register_error_handlers(app)

# Attach rate limiter to app (if available)
if RATE_LIMITING_ENABLED and limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Request logging middleware (must be added before CORS/GZip so it wraps them)
app.add_middleware(RequestLoggingMiddleware)

# CORS middleware for frontend access
cors_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3009,http://127.0.0.1:3009"
).split(",")
if "*" in cors_origins:
    logger.warning("Wildcard CORS origin rejected for security; falling back to localhost defaults")
    cors_origins = ["http://localhost:3009", "http://127.0.0.1:3009"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Accept-Language"],
)

# Security headers middleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "0"
    if request.headers.get("x-forwarded-proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# GZip compression for responses > 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(industries_router, prefix="/api/v1")
app.include_router(vendors_router, prefix="/api/v1")
app.include_router(stats_router, prefix="/api/v1")
app.include_router(institutions_router, prefix="/api/v1")
app.include_router(contracts_router, prefix="/api/v1")
app.include_router(sectors_router, prefix="/api/v1")
app.include_router(export_router, prefix="/api/v1")
app.include_router(network_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1")
app.include_router(watchlist_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(investigation_router, prefix="/api/v1")
app.include_router(executive_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(cases_router, prefix="/api/v1")


def _get_latest_backup_info() -> dict | None:
    """Get info about the most recent database backup."""
    from datetime import datetime

    backup_dir = Path(__file__).parent.parent / "backups"
    if not backup_dir.exists():
        return None
    backups = sorted(
        backup_dir.glob("RUBLI_NORMALIZED_*.db.gz"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not backups:
        return None
    latest = backups[0]
    stat = latest.stat()
    size = stat.st_size
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            size_human = f"{size:.1f} {unit}"
            break
        size /= 1024
    else:
        size_human = f"{size:.1f} TB"
    return {
        "file": latest.name,
        "size_bytes": stat.st_size,
        "size_human": size_human,
        "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "total_backups": len(backups),
    }


@app.get("/", tags=["root"])
async def root():
    """API root - returns basic info and links."""
    return {
        "name": API_TITLE,
        "version": API_VERSION,
        "docs": "/docs",
        "endpoints": {
            "contracts": "/api/v1/contracts",
            "contracts_statistics": "/api/v1/contracts/statistics",
            "sectors": "/api/v1/sectors",
            "analysis_overview": "/api/v1/analysis/overview",
            "risk_distribution": "/api/v1/analysis/risk-distribution",
            "industries": "/api/v1/industries",
            "vendors": "/api/v1/vendors",
            "vendors_compare": "/api/v1/vendors/compare",
            "vendors_verified": "/api/v1/vendors/verified",
            "vendors_top": "/api/v1/vendors/top",
            "statistics": "/api/v1/stats/classifications",
            "institutions": "/api/v1/institutions",
            "institutions_search": "/api/v1/institutions/search",
            "institutions_compare": "/api/v1/institutions/compare",
            "institutions_top": "/api/v1/institutions/top",
            "institutions_hierarchy": "/api/v1/institutions/hierarchy",
            "institution_types": "/api/v1/institutions/types",
            "export_contracts_csv": "/api/v1/export/contracts/csv",
            "export_contracts_excel": "/api/v1/export/contracts/excel",
            "export_vendors_csv": "/api/v1/export/vendors/csv",
            "network_graph": "/api/v1/network/graph",
            "network_co_bidders": "/api/v1/network/co-bidders/{vendor_id}",
            "network_institution_vendors": "/api/v1/network/institution-vendors/{institution_id}",
            "analysis_monthly_breakdown": "/api/v1/analysis/monthly-breakdown/{year}",
            "analysis_year_over_year": "/api/v1/analysis/year-over-year",
            "analysis_temporal_events": "/api/v1/analysis/temporal-events",
            "analysis_compare_periods": "/api/v1/analysis/compare-periods",
            "watchlist": "/api/v1/watchlist",
            "reports": "/api/v1/reports",
            "reports_vendor": "/api/v1/reports/vendor/{vendor_id}",
            "reports_institution": "/api/v1/reports/institution/{institution_id}",
            "reports_sector": "/api/v1/reports/sector/{sector_id}",
            "reports_thematic": "/api/v1/reports/thematic/{theme}",
        }
    }


@app.get("/health", tags=["root"])
async def health_check():
    """Health check endpoint with database, backup, and uptime status."""
    import sqlite3
    from fastapi.responses import JSONResponse
    from .dependencies import DB_PATH

    db_exists = verify_database_exists()
    backup_info = _get_latest_backup_info()
    uptime_seconds = round(_time_module.time() - _server_start_time)

    # Database details
    db_info = {"status": "not found"}
    db_reachable = False
    if db_exists:
        try:
            conn = sqlite3.connect(str(DB_PATH), timeout=5)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM contracts")
            contract_count = cursor.fetchone()[0]
            db_size = DB_PATH.stat().st_size
            conn.close()
            db_info = {
                "status": "connected",
                "size_mb": round(db_size / (1024 * 1024)),
                "contract_count": contract_count,
            }
            db_reachable = True
        except Exception:
            db_info = {"status": "error"}

    overall_status = "healthy" if db_reachable else ("degraded" if db_exists else "unavailable")
    http_status = 200 if db_reachable else 503

    return JSONResponse(
        status_code=http_status,
        content={
            "status": overall_status,
            "version": API_VERSION,
            "database": db_info,
            "uptime_seconds": uptime_seconds,
            "last_backup": backup_info,
        },
    )


@app.get("/metrics", tags=["root"])
async def metrics():
    """Application metrics for monitoring."""
    from .cache import app_cache

    uptime_seconds = round(_time_module.time() - _server_start_time)
    return {
        "uptime_seconds": uptime_seconds,
        "cache": app_cache.stats(),
    }


# Main entry point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
