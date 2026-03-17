#!/usr/bin/env python3
"""WAL checkpoint script - run standalone to compress the WAL file."""
import sqlite3
from pathlib import Path

DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

print(f"Connecting to {DB}...")
conn = sqlite3.connect(str(DB))
conn.execute("PRAGMA busy_timeout=300000")
conn.execute("PRAGMA journal_mode=WAL")

print("Running WAL checkpoint (TRUNCATE)...")
result = conn.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchone()
print(f"Result (busy, log_pages, checkpointed): {result}")

# Check WAL size
import os
wal_path = str(DB) + "-wal"
if os.path.exists(wal_path):
    size = os.path.getsize(wal_path)
    print(f"WAL size after checkpoint: {size:,} bytes ({size/1e9:.2f} GB)")
else:
    print("WAL file gone - fully checkpointed!")

conn.close()
print("Done.")
