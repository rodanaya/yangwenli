"""
Yang Wen-li Vendor Classification API

REST API for exposing verified vendor classifications from the
Mexican Government Procurement Analysis platform.

Run with: uvicorn api.main:app --port 8001 --reload
"""
import logging
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware

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

# Create rate limiter instance (if available)
if RATE_LIMITING_ENABLED:
    limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
else:
    limiter = None
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

logger = logging.getLogger(__name__)


def _warmup_caches():
    """Pre-populate expensive caches in a background thread so first requests are fast."""
    import urllib.request
    base = "http://127.0.0.1:8001"
    # Priority order: dashboard first (most critical), then supporting data
    endpoints = [
        "/api/v1/stats/dashboard/fast",          # Dashboard (highest priority)
        "/api/v1/contracts/statistics",           # Contract stats (expensive aggregate)
        "/api/v1/analysis/anomalies",             # Dashboard alerts
        "/api/v1/vendors/top-all?limit=5",        # Vendors featured strips
        "/api/v1/sectors",                        # Sectors list
        "/api/v1/analysis/risk-distribution",     # Risk analysis
        "/api/v1/analysis/year-over-year",        # Trends (expensive GROUP BY)
        "/api/v1/stats/data-quality",             # Header quality badge
    ]
    for ep in endpoints:
        try:
            urllib.request.urlopen(f"{base}{ep}", timeout=30)
            logger.info(f"Cache warmed: {ep}")
        except Exception as e:
            logger.warning(f"Cache warmup failed for {ep}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: warm caches in background thread so the UI loads instantly."""
    logger.info("Starting cache warmup in background...")
    warmup_thread = threading.Thread(target=_warmup_caches, daemon=True)
    warmup_thread.start()
    yield
    logger.info("Shutting down.")


# API metadata
API_TITLE = "Yang Wen-li Vendor Classification API"
API_DESCRIPTION = """
REST API for verified vendor industry classifications.

## Overview

This API exposes vendor classification data from the Yang Wen-li
Mexican Government Procurement Analysis platform.

### Key Statistics
- **45,603** vendors with verified classifications
- **5,000** verified patterns
- **35** industry categories
- **14.23%** coverage of 320,429 total vendors

### Endpoints

- **Industries** - Browse the 35-industry taxonomy
- **Vendors** - Query verified vendor classifications
- **Statistics** - Classification coverage metrics

### Methodology

All classifications are verified through online research with documented
sources. No pattern-matching guesses. See `/docs/VENDOR_CLASSIFICATION_METHODOLOGY.md`
for the full methodology.
"""
API_VERSION = "1.0.0"

# Create FastAPI app
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Attach rate limiter to app (if available)
if RATE_LIMITING_ENABLED and limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3009", "http://127.0.0.1:3009"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)

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
    """Health check endpoint."""
    db_exists = verify_database_exists()
    return {
        "status": "healthy" if db_exists else "degraded",
        "database": "connected" if db_exists else "not found",
        "version": API_VERSION
    }


# Main entry point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
