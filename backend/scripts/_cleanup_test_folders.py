"""
Delete test-pollution rows from production folders/watchlist tables.

Per F2 audit (2026-04-26): 1,500+ "Test Folder" rows accumulated in the
prod folders table from CI/dev runs hitting prod since 2026-03-07. These
were world-readable until commit d70ef9c gated the watchlist GETs.

This script:
  1. Counts test-pollution rows
  2. With --dry-run, prints counts only
  3. Otherwise deletes them and reports the result

Idempotent — safe to re-run.

Usage:
    cd backend
    python scripts/_cleanup_test_folders.py --dry-run
    python scripts/_cleanup_test_folders.py --db RUBLI_DEPLOY.db
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path


# Patterns identifying test-pollution data
TEST_FOLDER_PATTERNS = (
    "Test Folder",
    "test_folder",
    "Test Investigation",
    "Test Dossier",
    "test ",  # leading "test "
    "TEST ",
    "Sample Folder",
    "Demo Folder",
)


def count_test_rows(conn: sqlite3.Connection) -> dict:
    """Count rows matching test patterns in folders + dossiers tables."""
    cur = conn.cursor()
    counts = {}

    for table, name_col in [
        ("investigation_folders", "name"),
        ("dossiers", "name"),
        ("watchlist_items", "notes"),
    ]:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            total = cur.fetchone()[0]
        except sqlite3.OperationalError:
            counts[table] = {"total": 0, "test": 0, "exists": False}
            continue

        # Build a multi-LIKE WHERE clause
        like_clauses = " OR ".join([f"{name_col} LIKE ?" for _ in TEST_FOLDER_PATTERNS])
        params = [f"%{p}%" for p in TEST_FOLDER_PATTERNS]
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {like_clauses}", params)
            test_count = cur.fetchone()[0]
        except sqlite3.OperationalError as e:
            counts[table] = {"total": total, "test": 0, "exists": True, "error": str(e)}
            continue

        counts[table] = {"total": total, "test": test_count, "exists": True, "name_col": name_col}

    return counts


def delete_test_rows(conn: sqlite3.Connection) -> int:
    """Delete test-pollution rows from each table. Returns total deleted."""
    cur = conn.cursor()
    total_deleted = 0

    for table, name_col in [
        ("investigation_folders", "name"),
        ("dossiers", "name"),
    ]:
        try:
            like_clauses = " OR ".join([f"{name_col} LIKE ?" for _ in TEST_FOLDER_PATTERNS])
            params = [f"%{p}%" for p in TEST_FOLDER_PATTERNS]
            cur.execute(f"DELETE FROM {table} WHERE {like_clauses}", params)
            deleted = cur.rowcount
            total_deleted += deleted
            print(f"  {table}: deleted {deleted:,}")
        except sqlite3.OperationalError as e:
            print(f"  {table}: skipped ({e})")

    conn.commit()
    return total_deleted


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="RUBLI_NORMALIZED.db")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.is_absolute():
        backend_dir = Path(__file__).resolve().parents[1]
        db_path = backend_dir / args.db
    if not db_path.exists():
        print(f"ERROR: DB not found at {db_path}", file=sys.stderr)
        return 2

    print(f"Target DB: {db_path}")
    print(f"Mode: {'DRY-RUN' if args.dry_run else 'WRITE'}\n")

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA synchronous = OFF")

    print("Before:")
    counts = count_test_rows(conn)
    for table, info in counts.items():
        if not info.get("exists"):
            print(f"  {table}: table does not exist")
            continue
        print(f"  {table}: {info['test']:,} test rows / {info['total']:,} total")

    if not args.dry_run:
        print("\nDeleting:")
        total = delete_test_rows(conn)
        print(f"\nTotal deleted: {total:,}")

        print("\nAfter:")
        counts_after = count_test_rows(conn)
        for table, info in counts_after.items():
            if info.get("exists"):
                print(f"  {table}: {info['test']:,} test rows / {info['total']:,} total")

    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
