"""
Yang Wen-li Vendor Classification API

REST API for exposing verified vendor classifications from the
Mexican Government Procurement Analysis platform.

Run with: uvicorn api.main:app --port 8001 --reload
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
from .routers import industries_router, vendors_router, stats_router
from .routers.institutions import router as institutions_router
from .routers.contracts import router as contracts_router
from .routers.sectors import router as sectors_router
from .routers.export import router as export_router

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
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Include routers
app.include_router(industries_router, prefix="/api/v1")
app.include_router(vendors_router, prefix="/api/v1")
app.include_router(stats_router, prefix="/api/v1")
app.include_router(institutions_router, prefix="/api/v1")
app.include_router(contracts_router, prefix="/api/v1")
app.include_router(sectors_router, prefix="/api/v1")
app.include_router(export_router, prefix="/api/v1")


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
            "vendors_verified": "/api/v1/vendors/verified",
            "vendors_top": "/api/v1/vendors/top",
            "statistics": "/api/v1/stats/classifications",
            "institutions": "/api/v1/institutions",
            "institutions_search": "/api/v1/institutions/search",
            "institutions_top": "/api/v1/institutions/top",
            "institutions_hierarchy": "/api/v1/institutions/hierarchy",
            "institution_types": "/api/v1/institutions/types",
            "export_contracts_csv": "/api/v1/export/contracts/csv",
            "export_contracts_excel": "/api/v1/export/contracts/excel",
            "export_vendors_csv": "/api/v1/export/vendors/csv",
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
