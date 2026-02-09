"""Database connection and common dependencies for the API."""
import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager
from typing import Generator

# Database path - relative to backend directory
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Query timeout in seconds (configurable via environment variable)
DB_QUERY_TIMEOUT = int(os.environ.get("DB_QUERY_TIMEOUT", "30"))


def get_db_connection() -> sqlite3.Connection:
    """Create a database connection with row factory and timeout.

    The timeout prevents long-running queries from causing DoS.
    Default is 30 seconds, configurable via DB_QUERY_TIMEOUT env var.
    """
    conn = sqlite3.connect(str(DB_PATH), timeout=DB_QUERY_TIMEOUT)
    conn.row_factory = sqlite3.Row
    # Set busy timeout to handle concurrent access
    conn.execute(f"PRAGMA busy_timeout = {DB_QUERY_TIMEOUT * 1000}")
    # WAL mode allows concurrent readers while one writer is active
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA read_uncommitted = ON")
    return conn


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for database connections."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


def verify_database_exists() -> bool:
    """Check if the database file exists."""
    return DB_PATH.exists()
