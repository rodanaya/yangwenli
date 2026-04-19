"""One-shot migration: build FTS5 full-text search index on contract titles.

Reduces search from ~24s LIKE scan → <200ms. Safe to re-run (idempotent).

Usage:
    cd backend
    python scripts/_build_contracts_fts.py
"""
import os
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(os.environ.get("DATABASE_PATH", Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"))


def build_fts(db_path: Path) -> None:
    print(f"[fts] Connecting to {db_path} ({db_path.stat().st_size / 1e9:.2f} GB)")
    conn = sqlite3.connect(str(db_path), timeout=300)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    existing = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='contracts_fts'"
    ).fetchone()
    if existing:
        print("[fts] contracts_fts already exists — skipping build")
        conn.close()
        return

    print("[fts] Creating FTS5 virtual table...")
    conn.execute("""
        CREATE VIRTUAL TABLE contracts_fts
        USING fts5(title, content='contracts', content_rowid='id', tokenize='unicode61')
    """)

    print("[fts] Populating from contracts.title (3.1M rows, may take a few minutes)...")
    t0 = time.time()
    conn.execute("""
        INSERT INTO contracts_fts(rowid, title)
        SELECT id, COALESCE(title, '') FROM contracts
    """)
    conn.commit()
    elapsed = time.time() - t0
    count = conn.execute("SELECT COUNT(*) FROM contracts_fts").fetchone()[0]
    print(f"[fts] Done — {count:,} rows indexed in {elapsed:.1f}s")

    print("[fts] Optimizing FTS index...")
    conn.execute("INSERT INTO contracts_fts(contracts_fts) VALUES('optimize')")
    conn.commit()
    conn.close()
    print("[fts] FTS5 index ready. Search will now use fast MATCH instead of LIKE.")


if __name__ == "__main__":
    build_fts(DB_PATH)
