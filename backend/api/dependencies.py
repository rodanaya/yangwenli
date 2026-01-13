"""Database connection and common dependencies for the API."""
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from typing import Generator

# Database path - relative to backend directory
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def get_db_connection() -> sqlite3.Connection:
    """Create a database connection with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
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
