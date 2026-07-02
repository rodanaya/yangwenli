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

import sentry_sdk

_SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if _SENTRY_DSN:
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        traces_sample_rate=0.05,   # 5% of transactions
        profiles_sample_rate=0.01,
        environment=os.environ.get("RUBLI_ENV", "dev"),
        release=os.environ.get("GIT_COMMIT", "unknown"),
    )

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
    logging.getLogger("rubli.api").critical(
        "Rate limiting DISABLED — install slowapi for production"
    )

from .dependencies import verify_database_exists
from .middleware import RequestLoggingMiddleware, register_error_handlers

# Create rate limiter instance (if available)
# Use X-Forwarded-For when behind Caddy reverse proxy; fall back to remote address
def _get_real_ip(request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

if RATE_LIMITING_ENABLED:
    limiter = Limiter(key_func=_get_real_ip, default_limits=["100/minute"])
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
    watchlist_folders_router,
    reports_router,
    investigation_router,
)
from .routers.institutions import router as institutions_router
from .routers.officials import router as officials_router
from .routers.contracts import router as contracts_router
from .routers.sectors import router as sectors_router
from .routers.export import router as export_router
from .routers.executive import router as executive_router
from .routers.categories import router as categories_router
from .routers.cases import router as cases_router
from .routers.search import router as search_router
from .routers.feedback import router as feedback_router
from .routers.workspace_dossier import router as dossier_router
from .routers.auth import router as auth_router
from .routers.subnational import router as subnational_router
from .routers.issues import router as issues_router
from .routers.ai_explain import router as ai_router
from .routers.aria import router as aria_router
from .routers.procurement_health import router as phi_router
from .routers.alerts import router as alerts_router
from .routers.scorecards import router as scorecards_router
from .routers.stories import router as stories_router
from .routers.health import router as health_router
from .routers.analysis_patterns import router as analysis_patterns_router
from .routers.analysis_vendor_sector import router as analysis_vendor_sector_router
from .routers.collusion import router as collusion_router
from .routers.intersection import router as intersection_router
from .routers.capture import router as capture_router
from .routers.dossier import router as dossier_export_router
from .routers.atlas import router as atlas_router
from .routers.gap import router as gap_router

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
        # === Tier 0: Instant reads (pre-computed, < 1s) ===
        "/api/v1/stats/dashboard/fast",                # Dashboard (highest priority, pre-computed)
        "/api/v1/sectors",                             # Sectors list (small table)
        *[f"/api/v1/sectors/{i}" for i in range(1, 13)],  # All 12 sector detail pages (fast with bug fix)
        "/api/v1/aria/stats",                          # ARIA queue stats (8s cold — 248K row scan)
        # === Tier 1: Critical cold-start thundering-herd candidates ===
        # These MUST be warmed before user requests arrive. Run early before
        # the Tier 2 slow endpoints (exec/summary = 90s) block the thread.
        "/api/v1/analysis/vendor-concentration?top_n=3",  # 73-82s cold on VPS! Must warm early
        "/api/v1/executive/capture-leaders",              # 48-51s cold — thundering herd observed
        "/api/v1/analysis/value-concentration",           # 48s cold
        "/api/v1/analysis/flash-vendors",                 # 60s cold
        "/api/v1/analysis/admin-breakdown",               # 38s cold
        "/api/v1/analysis/political-cycle",               # 56s+ cold
        # === Tier 2: Page-specific warm (moderately slow) ===
        "/api/v1/stats/data-quality",                  # Header quality badge (cached)
        "/api/v1/executive/summary",                   # Executive section — 90s cold on VPS
        "/api/v1/analysis/patterns/counts",            # DetectivePatterns page (LIKE queries on 3.1M rows)
        "/api/v1/analysis/year-over-year",             # Shared by Trends, Patterns, Administrations
        "/api/v1/contracts/statistics",                # Explore page (3.8s cold)
        "/api/v1/analysis/overview",                   # Patterns page (8.8s cold)
        "/api/v1/analysis/sector-year-breakdown",      # ProcurementIntelligence heatmap (slow cold)
        "/api/v1/analysis/money-flow",                 # Dashboard money flow panel
        "/api/v1/analysis/transparency/publication-delays",  # Dashboard transparency strip (11s cold)
        "/api/v1/analysis/price-anomalies?min_z=3&limit=50",  # PriceIntelligence page (slow cold — 50s+)
        "/api/v1/intersection/summary?top_n_per_quadrant=50",  # Intersection page (9s cold — warm to avoid spinner)
        "/api/v1/network/communities",                     # Network communities (28s cold — warm to avoid UX lag)
        "/api/v1/analysis/leads",                          # Investigation leads (169s cold!)
        *[f"/api/v1/reports/sector/{i}" for i in range(1, 13)],  # Sector reports (346s cold each)
        # Categories capture-dumbbell — top categories by spend; the
        # /sectors?view=categories dumbbell fans 12 of these in parallel
        # and the slow ones (Medicamentos, Alimentos) timeout uncached.
        # Set built from 30h harness network log: every category id the
        # frontend actually requested in production. Adding 21, 27, 28,
        # 47, 77, 86, 90 (previously missed and 502-flooding the worker).
        *[f"/api/v1/categories/{i}/top-vendors?limit=2" for i in [
            5, 8, 20, 21, 22, 24, 26, 27, 28, 30, 47, 55, 57, 60, 63, 71,
            73, 77, 86, 88, 90, 91,
        ]],
        # Vendor profile heavy endpoints for the top T1 vendors visited
        # constantly via /thread/:id and /vendors/:id. 29277 (Grupo
        # Farmacos) and 4325 (Vitalmex) are linked from the homepage hero
        # AND the curated story tour, so a cold profile breaks the
        # primary user journey. risk-waterfall + risk-timeline + linked-
        # scandals are the slowest queries on the page.
        *[
            f"/api/v1/vendors/{vid}/{ep}"
            for vid in [29277, 4325]
            for ep in [
                "risk-waterfall",
                "risk-timeline",
                "linked-scandals",
                "peer-comparison",
                "footprint",
                "risk-profile",
                "institutions?per_page=50",
            ]
        ],
        # Sector sub-pages — now use precomputed fast paths so safe to warm
        *[f"/api/v1/sectors/{i}/trends" for i in range(1, 13)],
        *[f"/api/v1/sectors/{i}/timeline" for i in range(1, 13)],
        *[f"/api/v1/analysis/risk-distribution?sector_id={i}" for i in range(1, 13)],
        *[f"/api/v1/vendors/top?by=value&limit=10&sector_id={i}" for i in range(1, 13)],
        # 2026-05-22 — Observatory galaxy batch endpoint. Cold path is 4-7s
        # for sectors / patterns lens (per-request SQLite connection setup
        # against 5GB deploy DB + 7×count + 7×SELECT-with-LEFT-JOIN). The
        # in-process cache is per-gunicorn-worker (6 workers in prod), so
        # we need ~10 hits per payload to statistically warm every worker.
        # The browser cache (max-age=600) covers individual users, but new
        # visitors and lens switches still pay the cold path until all
        # workers have seen the (lens, codes, limit) tuple.
        *([
            "/api/v1/atlas/cluster-vendors-batch?lens=patterns&codes=P1,P2,P3,P4,P5,P6,P7&limit=10",
            "/api/v1/atlas/cluster-vendors-batch?lens=sectors&codes=salud,educacion,infraestructura,energia,defensa,tecnologia,hacienda,gobernacion,agricultura,ambiente,trabajo,otros&limit=10",
        ] * 10),
        # Common single-cluster zoom queries — P5/P6/P2 are the most-clicked
        # patterns; salud/energia/infraestructura are the most-clicked sectors.
        # These power the AtlasVendorDrawer (200 vendors per cluster) and
        # the floating-card top-3 list.
        *[
            f"/api/v1/atlas/cluster-vendors?lens=patterns&code={p}&limit=200"
            for p in ["P5", "P6", "P2", "P1", "P3"]
        ],
        *[
            f"/api/v1/atlas/cluster-vendors?lens=sectors&code={s}&limit=200"
            for s in ["salud", "energia", "infraestructura", "educacion", "tecnologia"]
        ],
    ]
    for ep in endpoints:
        try:
            # executive/summary cold on VPS = 90s; price-anomalies cold = 50s+; publication-delays = 11s
            # Per-endpoint timeout based on observed cold-start latency
            if "reports/sector" in ep:
                timeout = 400  # 346s cold per audit; give headroom
            elif "aria/stats" in ep:
                timeout = 20   # 8s cold; fast after precomputed_stats write
            elif "analysis/leads" in ep:
                timeout = 30   # ~0ms after INDEXED BY fix; headroom for first-run
            elif "/top-vendors" in ep:
                timeout = 60  # biggest categories take ~30s cold
            elif "/vendors/" in ep and ("waterfall" in ep or "timeline" in ep or "linked-scandals" in ep):
                timeout = 45  # heavy SHAP / case-link queries
            elif "executive" in ep:
                timeout = 120
            elif "vendor-concentration" in ep:
                timeout = 120  # 73-82s cold on VPS — thundering herd observed
            elif "price-anomalies" in ep:
                timeout = 15  # fast after JOIN-order fix (0.01s benchmark)
            elif "political-cycle" in ep or "flash-vendors" in ep or "value-concentration" in ep or "admin-breakdown" in ep:
                timeout = 120  # 38-80s cold; give headroom
            elif "intersection" in ep:
                timeout = 20  # 9s cold; give headroom
            elif "communities" in ep:
                timeout = 45
            elif "publication" in ep:
                timeout = 30
            elif "data-quality" in ep:
                timeout = 120  # 85s live scan on first ever call; fast after precomputed_stats write
            elif "statistics" in ep or "overview" in ep:
                timeout = 12
            elif "/atlas/" in ep:
                # cluster-vendors cold = 4-7s; cluster-vendors-batch with 12
                # sectors cold = 7s. Default 3s silently dropped these.
                timeout = 20
            else:
                timeout = 3
            urllib.request.urlopen(f"{base}{ep}", timeout=timeout)
        except Exception as e:
            logger.debug(f"Cache warmup skipped for {ep}: {e}")
        # Breathe between requests so user requests aren't starved
        time.sleep(0.5)

    # Trigger story packages background computation (2-min job; no HTTP timeout concern)
    try:
        from .routers.stories import warm_stories_cache
        warm_stories_cache()
    except Exception as e:
        logger.debug(f"Story packages warmup skipped: {e}")

    # Capture results are served from the precomputed `capture_results` table
    # (populated via scripts/precompute_capture.py). No in-process prewarm needed —
    # the table read is O(1) memory and completes in <100ms.


def _startup_checks():
    """Verify critical system state at startup."""
    import sqlite3
    from .dependencies import DB_PATH
    from .config.constants import RISK_THRESHOLDS_V4

    checks = []

    # 0. Ensure users table and user_id column exist (idempotent migrations)
    try:
        migrate_conn = sqlite3.connect(str(DB_PATH), timeout=10)
        migrate_conn.execute("PRAGMA foreign_keys = OFF")
        migrate_conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1
            )
        """)
        try:
            migrate_conn.execute(
                "ALTER TABLE investigation_dossiers ADD COLUMN user_id INTEGER REFERENCES users(id)"
            )
        except sqlite3.OperationalError:
            pass  # Column already exists
        migrate_conn.commit()
        migrate_conn.close()
    except Exception as e:
        logger.warning("startup_migration_warning", issue=str(e))

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
    # Elect a SINGLE warmer across gunicorn workers. This lifespan runs once per
    # worker process; without election all N workers fire the full warmup (incl.
    # the ~2-min warm_stories_cache) simultaneously — a thundering herd on the
    # 5GB DB that spikes load on every deploy (cold caches × N workers). A
    # non-blocking flock picks one warmer; the rest skip. The lock auto-frees
    # when the winning process exits, so the next restart re-elects cleanly. If
    # the elected worker dies mid-warmup, another acquires and takes over.
    # flock is Unix-only; on platforms without it (Windows dev/test) we warm
    # unconditionally, preserving the previous behavior.
    warmup_lock_fd = None
    should_warm = True
    try:
        import fcntl
        warmup_lock_fd = os.open("/tmp/rubli_warmup.lock", os.O_CREAT | os.O_RDWR, 0o644)
        try:
            fcntl.flock(warmup_lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            logger.info("Elected as cache-warmup worker.")
        except OSError:
            # Lock held by another worker — it owns the warmup; we skip.
            should_warm = False
            os.close(warmup_lock_fd)
            warmup_lock_fd = None
            logger.info("Skipping cache warmup — another worker is the elected warmer.")
    except Exception as e:
        # fcntl unavailable (non-Unix) or unexpected lock error → warm anyway
        # (correctness over herd-avoidance; a single-worker dev server won't herd).
        should_warm = True
        logger.debug(f"Warmup election unavailable ({e}); warming in this worker.")
    if should_warm:
        logger.info("Starting cache warmup in background...")
        warmup_thread = threading.Thread(target=_warmup_caches, daemon=True)
        warmup_thread.start()
    yield
    if warmup_lock_fd is not None:
        try:
            os.close(warmup_lock_fd)
        except Exception:
            pass
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
- **v0.8.5** risk model (test AUC 0.785, vendor-stratified)

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
_docs_enabled = os.environ.get("ENABLE_DOCS", "false").lower() == "true"
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
    from slowapi.middleware import SlowAPIMiddleware
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

# Request logging middleware (must be added before CORS/GZip so it wraps them)
app.add_middleware(RequestLoggingMiddleware)

# ── Auth gate (2026-06-27 lockdown) ──────────────────────────────────────────
# The entire API is private. Only login + health are public; every other
# /api/v1 path requires a valid Bearer JWT, so the curated data cannot be read
# or scraped anonymously. The frontend <ProtectedRoute> mirrors this on the
# client. Defined before CORS so CORS wraps the 401 response.
from fastapi.responses import JSONResponse as _GateJSON
from jose import jwt as _gate_jwt, JWTError as _GateJWTError
# Auth gate — OPT-IN. RUBLI is open to everyone by default; the whole API is
# public. Set RUBLI_REQUIRE_AUTH=1 (with a strong RUBLI_JWT_SECRET) to lock it
# behind a Bearer JWT instead.
_GATE_SECRET = os.environ.get("RUBLI_JWT_SECRET")
_GATE_PUBLIC = {"/api/v1/auth/login", "/api/v1/health"}
_GATE_ENABLED = os.environ.get("RUBLI_REQUIRE_AUTH", "").lower() in ("1", "true", "yes")
if _GATE_ENABLED and not _GATE_SECRET:
    raise RuntimeError("RUBLI_REQUIRE_AUTH is set but RUBLI_JWT_SECRET is missing")

@app.middleware("http")
async def require_auth_gate(request: Request, call_next):
    if not _GATE_ENABLED or request.method == "OPTIONS":
        return await call_next(request)
    path = request.url.path
    if path.startswith("/api/v1/") and path not in _GATE_PUBLIC:
        auth = request.headers.get("Authorization", "")
        token = auth[7:].strip() if auth[:7].lower() == "bearer " else ""
        valid = False
        if token:
            try:
                _gate_jwt.decode(token, _GATE_SECRET, algorithms=["HS256"])
                valid = True
            except _GateJWTError:
                valid = False
        if not valid:
            return _GateJSON({"detail": "Authentication required"}, status_code=401)
    return await call_next(request)

# CORS middleware for frontend access
cors_origins = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS", "http://localhost:3009,http://127.0.0.1:3009"
    ).split(",")
    if o.strip()
]
if "*" in cors_origins:
    logger.error("CORS wildcard '*' is not allowed. Set explicit origins in CORS_ORIGINS env var.")
    raise ValueError("CORS_ORIGINS cannot contain '*'")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Accept-Language", "X-Rubli-Key"],
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

# HTTP Cache-Control middleware
# Adds appropriate caching headers so browsers and CDNs avoid redundant refetches.
# - public paths (read-only analytics): cached by the browser, reused across sessions
# - private paths (user workspace/watchlist): never cached
# - mutating methods (POST/PATCH/DELETE): never cached
_CACHE_PRIVATE_PREFIXES = (
    "/api/v1/watchlist",
    "/api/v1/workspace",
    "/api/v1/feedback",
    "/api/v1/auth",
)
_CACHE_LONG_PREFIXES = (  # 1h — precomputed, only changes when pipeline runs
    "/api/v1/stats",
    "/api/v1/cases",
)
_CACHE_MED_PREFIXES = (  # 10min — analytical read-only aggregates
    "/api/v1/analysis",
    "/api/v1/sectors",
    "/api/v1/network",
    "/api/v1/subnational",
    "/api/v1/industries",
    "/api/v1/categories",
    "/api/v1/procurement-health",
    "/api/v1/collusion",
    # 2026-05-22 — Observatory galaxy/zoom endpoints. Data only changes when
    # the ARIA pipeline re-runs (manual, infrequent). The cluster-vendors-batch
    # endpoint was paying 4.1s on every page refresh because the default
    # `no-cache` fallthrough below was stripping the router-level header.
    "/api/v1/atlas",
)
_CACHE_SHORT_PREFIXES = (  # 5min — entity profiles (change only with new data)
    "/api/v1/vendors",
    "/api/v1/institutions",
    "/api/v1/contracts",
    "/api/v1/investigation",
)

@app.middleware("http")
async def cache_control(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    method = request.method
    # Never cache mutations or non-2xx responses
    if method in ("POST", "PATCH", "DELETE", "PUT") or response.status_code >= 400:
        response.headers["Cache-Control"] = "no-store"
        return response
    # Never cache user-specific data
    if path.startswith(_CACHE_PRIVATE_PREFIXES):
        response.headers["Cache-Control"] = "private, no-store"
        return response
    # Never cache search (query-specific, not reusable)
    if path.startswith("/api/v1/search"):
        response.headers["Cache-Control"] = "no-cache"
        return response
    if path.startswith(_CACHE_LONG_PREFIXES):
        response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
        return response
    if path.startswith(_CACHE_MED_PREFIXES):
        response.headers["Cache-Control"] = "public, max-age=600, stale-while-revalidate=3600"
        return response
    if path.startswith(_CACHE_SHORT_PREFIXES):
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=1800"
        return response
    response.headers["Cache-Control"] = "no-cache"
    return response

# GZip compression for responses > 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(industries_router, prefix="/api/v1")
app.include_router(vendors_router, prefix="/api/v1")
app.include_router(stats_router, prefix="/api/v1")
app.include_router(institutions_router, prefix="/api/v1")
app.include_router(officials_router, prefix="/api/v1")
app.include_router(contracts_router, prefix="/api/v1")
app.include_router(sectors_router, prefix="/api/v1")
app.include_router(export_router, prefix="/api/v1")
app.include_router(network_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1")
app.include_router(analysis_patterns_router, prefix="/api/v1")
app.include_router(analysis_vendor_sector_router, prefix="/api/v1")
app.include_router(collusion_router, prefix="/api/v1")
app.include_router(intersection_router, prefix="/api/v1")
app.include_router(capture_router, prefix="/api/v1")
app.include_router(dossier_export_router, prefix="/api/v1")
app.include_router(watchlist_folders_router, prefix="/api/v1")
app.include_router(watchlist_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(investigation_router, prefix="/api/v1")
app.include_router(executive_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(cases_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(feedback_router, prefix="/api/v1")
app.include_router(dossier_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(subnational_router, prefix="/api/v1")
app.include_router(issues_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(aria_router, prefix="/api/v1")
app.include_router(atlas_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")
app.include_router(phi_router)  # PHI has its own /api/v1/procurement-health prefix
app.include_router(scorecards_router)  # Scorecards has its own /api/v1/scorecards prefix
app.include_router(stories_router)    # Story endpoints for journalist investigation starting-points
# Health router — registered before the inline /health decorator so it takes precedence.
# Provides fast health check (<100ms) using precomputed_stats instead of COUNT(*).
app.include_router(gap_router)  # Post-CompraNet gap — own /api/v1/gap prefix
app.include_router(health_router)  # No prefix — endpoint defines /health directly
# Also register at the /api/v1 prefix so external monitors that follow the
# documented path (/api/v1/health) get the same response.
app.include_router(health_router, prefix="/api/v1", include_in_schema=False)


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
