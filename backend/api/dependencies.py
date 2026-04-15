"""Database connection and common dependencies for the API."""
import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager
from typing import Generator

from fastapi import Header, HTTPException, status

# Write-key auth — set RUBLI_WRITE_KEY env var to enable.
# In production (RUBLI_ENV != "dev"), missing key fails closed with 503.
# In dev mode, missing key bypasses auth for ergonomics.
WRITE_API_KEY = os.environ.get("RUBLI_WRITE_KEY", "")
RUBLI_ENV = os.environ.get("RUBLI_ENV", "dev").lower()
_IS_DEV = RUBLI_ENV in ("dev", "development", "local", "test")


def require_write_key(x_rubli_key: str = Header(default="")) -> None:
    """Require API key for state-changing endpoints.

    Behavior:
      - Dev mode (RUBLI_ENV=dev or unset): if RUBLI_WRITE_KEY is empty, auth is
        bypassed for ergonomics.
      - Production (RUBLI_ENV != dev): if RUBLI_WRITE_KEY is missing/empty,
        the endpoint fails closed with HTTP 503 (misconfiguration).
      - In all environments, when the key is set, X-Rubli-Key must match.
    """
    if not WRITE_API_KEY:
        if _IS_DEV:
            return  # Dev mode: key not configured, skip auth
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Write endpoint disabled: RUBLI_WRITE_KEY is not configured. "
                "Set the environment variable to enable state-changing endpoints."
            ),
        )
    if x_rubli_key != WRITE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key. Set X-Rubli-Key header.",
        )

# Database path - configurable via env var, defaults to RUBLI_NORMALIZED.db
DB_PATH = Path(os.environ.get("DATABASE_PATH", str(Path(__file__).parent.parent / "RUBLI_NORMALIZED.db")))

# Query timeout in seconds (configurable via environment variable)
DB_QUERY_TIMEOUT = int(os.environ.get("DB_QUERY_TIMEOUT", "30"))


def get_db_connection() -> sqlite3.Connection:
    """Create a database connection with row factory and timeout.

    The timeout prevents long-running queries from causing DoS.
    Default is 30 seconds, configurable via DB_QUERY_TIMEOUT env var.
    """
    conn = sqlite3.connect(str(DB_PATH), timeout=DB_QUERY_TIMEOUT, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Set busy timeout to handle concurrent access (5s — short enough to fail fast,
    # long enough for normal lock contention; 30s was too long and caused cascading failures)
    conn.execute("PRAGMA busy_timeout = 30000")
    # WAL mode allows concurrent readers while one writer is active
    conn.execute("PRAGMA journal_mode = WAL")
    # read_uncommitted removed: reads dirty (uncommitted) data from other connections,
    # which is a data integrity risk — WAL already gives good read concurrency
    # Enforce referential integrity
    conn.execute("PRAGMA foreign_keys = ON")
    # Performance: 32MB page cache (was 200MB — reduces memory exhaustion under concurrent load)
    conn.execute("PRAGMA cache_size = -32768")
    conn.execute("PRAGMA mmap_size = 1073741824")
    return conn


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for database connections.

    Use for ``with get_db() as conn:`` in endpoint bodies and scripts.
    For FastAPI ``Depends()``, use :func:`get_db_dep` instead.
    """
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


def get_db_dep() -> Generator[sqlite3.Connection, None, None]:
    """Bare generator for ``Depends(get_db_dep)`` in FastAPI routes.

    FastAPI >=0.130 rejects ``@contextmanager``-wrapped generators in
    ``Depends()``. This unwrapped version works with all FastAPI versions.
    """
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


def verify_database_exists() -> bool:
    """Check if the database file exists."""
    return DB_PATH.exists()
