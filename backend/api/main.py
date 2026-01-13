"""
Yang Wen-li Vendor Classification API

REST API for exposing verified vendor classifications from the
Mexican Government Procurement Analysis platform.

Run with: uvicorn api.main:app --port 8001 --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .dependencies import verify_database_exists
from .routers import industries_router, vendors_router, stats_router

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


@app.get("/", tags=["root"])
async def root():
    """API root - returns basic info and links."""
    return {
        "name": API_TITLE,
        "version": API_VERSION,
        "docs": "/docs",
        "endpoints": {
            "industries": "/api/v1/industries",
            "vendors": "/api/v1/vendors/verified",
            "statistics": "/api/v1/stats/classifications",
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
