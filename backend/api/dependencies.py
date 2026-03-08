"""Database connection and common dependencies for the API."""
import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager
from typing import Generator

# Database path - configurable via env var, defaults to RUBLI_NORMALIZED.db
DB_PATH = Path(os.environ.get("DATABASE_PATH", str(Path(__file__).parent.parent / "RUBLI_NORMALIZED.db")))

# Query timeout in seconds (configurable via environment variable)
DB_QUERY_TIMEOUT = int(os.environ.get("DB_QUERY_TIMEOUT", "30"))


def get_db_connection() -> sqlite3.Connection:
    """Create a database connection with row factory and timeout.

    The timeout prevents long-running queries from causing DoS.
    Default is 30 seconds, configurable via DB_QUERY_TIMEOUT env var.
    """
    conn = sqlite3.connect(str(DB_PATH), timeout=DB_QUERY_TIMEOUT)
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


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """FastAPI dependency that yields a database connection.

    Works with both ``Depends(get_db)`` **and** ``with get_db() as conn:``.
    FastAPI >=0.135 rejects ``@contextmanager``-wrapped generators in
    ``Depends``, so we keep this as a bare generator and wrap it for
    ``with`` usage via ``__enter__``/``__exit__`` on the generator object.
    """
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


# Alias wrapped in @contextmanager for ``with get_db_ctx() as conn:`` usage
# in scripts and non-FastAPI code.
get_db_ctx = contextmanager(get_db)


def verify_database_exists() -> bool:
    """Check if the database file exists."""
    return DB_PATH.exists()
