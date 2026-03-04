"""
Precompute co-bidding statistics table.

Replaces the expensive live self-join on 3.1M contracts with a pre-materialized
co_bidding_stats table that the /analysis/patterns/co-bidding endpoint reads from.

Usage:
    cd backend
    python -m scripts.precompute_cobidding
"""

import sqlite3
import time
import logging
from pathlib import Path
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DB_PATH = Path(os.environ.get(
    "DATABASE_PATH",
    str(Path(__file__).parent.parent / "RUBLI_NORMALIZED.db")
))


def precompute_cobidding_stats():
    """Build co_bidding_stats table from contracts data."""
    t0 = time.time()
    conn = sqlite3.connect(str(DB_PATH), timeout=120)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 120000")
    conn.execute("PRAGMA journal_mode = WAL")

    cursor = conn.cursor()

    # ── Step 1: Get vendor procedure counts (only non-individual vendors) ──
    logger.info("Step 1/4: Computing vendor procedure counts...")
    cursor.execute("""
        SELECT c.vendor_id, COUNT(DISTINCT c.procedure_number) as proc_count
        FROM contracts c
        JOIN vendors v ON c.vendor_id = v.id
        WHERE c.procedure_number IS NOT NULL
          AND c.procedure_number != ''
          AND v.is_individual = 0
        GROUP BY c.vendor_id
        HAVING proc_count >= 5
    """)
    vendor_procs = {row['vendor_id']: row['proc_count'] for row in cursor.fetchall()}
    logger.info(f"  Found {len(vendor_procs)} vendors with >= 5 procedures")

    # ── Step 2: Create temp table of eligible contracts for faster join ──
    logger.info("Step 2/4: Building eligible contracts temp table...")
    cursor.execute("DROP TABLE IF EXISTS _tmp_cobid_contracts")
    cursor.execute("""
        CREATE TEMP TABLE _tmp_cobid_contracts AS
        SELECT c.vendor_id, c.procedure_number
        FROM contracts c
        JOIN vendors v ON c.vendor_id = v.id
        WHERE c.procedure_number IS NOT NULL
          AND c.procedure_number != ''
          AND v.is_individual = 0
          AND c.vendor_id IN (
              SELECT vendor_id FROM contracts
              WHERE procedure_number IS NOT NULL AND procedure_number != ''
              GROUP BY vendor_id
              HAVING COUNT(DISTINCT procedure_number) >= 5
          )
    """)
    cursor.execute("CREATE INDEX _tmp_cobid_proc ON _tmp_cobid_contracts(procedure_number)")
    cursor.execute("CREATE INDEX _tmp_cobid_vendor ON _tmp_cobid_contracts(vendor_id)")
    row_count = cursor.execute("SELECT COUNT(*) FROM _tmp_cobid_contracts").fetchone()[0]
    logger.info(f"  Eligible contracts: {row_count:,}")

    # ── Step 3: Find co-bidding pairs (self-join on procedure_number) ──
    logger.info("Step 3/4: Computing co-bidding pairs (this may take a few minutes)...")
    t_join = time.time()
    cursor.execute("""
        SELECT
            c1.vendor_id as vendor_id_a,
            c2.vendor_id as vendor_id_b,
            COUNT(DISTINCT c1.procedure_number) as shared_procedures
        FROM _tmp_cobid_contracts c1
        JOIN _tmp_cobid_contracts c2
          ON c1.procedure_number = c2.procedure_number
        WHERE c1.vendor_id < c2.vendor_id
        GROUP BY c1.vendor_id, c2.vendor_id
        HAVING shared_procedures >= 2
    """)
    pairs = cursor.fetchall()
    logger.info(f"  Found {len(pairs):,} pairs with >= 2 shared procedures ({time.time()-t_join:.1f}s)")

    # ── Step 4: Compute rates and store ──
    logger.info("Step 4/4: Computing rates and writing co_bidding_stats table...")
    cursor.execute("DROP TABLE IF EXISTS co_bidding_stats")
    cursor.execute("""
        CREATE TABLE co_bidding_stats (
            vendor_id_a INTEGER NOT NULL,
            vendor_id_b INTEGER NOT NULL,
            shared_procedures INTEGER NOT NULL,
            vendor_a_procedures INTEGER NOT NULL,
            vendor_b_procedures INTEGER NOT NULL,
            co_bid_rate REAL NOT NULL,
            is_potential_collusion INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (vendor_id_a, vendor_id_b)
        )
    """)

    batch = []
    BATCH_SIZE = 10000
    written = 0

    for row in pairs:
        va, vb = row['vendor_id_a'], row['vendor_id_b']
        shared = row['shared_procedures']
        va_procs = vendor_procs.get(va, 0)
        vb_procs = vendor_procs.get(vb, 0)
        if va_procs == 0 or vb_procs == 0:
            continue

        rate = min(shared / va_procs, shared / vb_procs) * 100
        is_collusion = 1 if rate >= 80 else 0

        batch.append((va, vb, shared, va_procs, vb_procs, round(rate, 2), is_collusion))

        if len(batch) >= BATCH_SIZE:
            cursor.executemany(
                "INSERT INTO co_bidding_stats VALUES (?,?,?,?,?,?,?)",
                batch
            )
            written += len(batch)
            batch = []

    if batch:
        cursor.executemany(
            "INSERT INTO co_bidding_stats VALUES (?,?,?,?,?,?,?)",
            batch
        )
        written += len(batch)

    # Create indexes for the endpoint queries
    cursor.execute("CREATE INDEX idx_cobid_rate ON co_bidding_stats(co_bid_rate DESC)")
    cursor.execute("CREATE INDEX idx_cobid_shared ON co_bidding_stats(shared_procedures DESC)")
    cursor.execute("CREATE INDEX idx_cobid_collusion ON co_bidding_stats(is_potential_collusion)")

    conn.commit()

    # Stats
    total = cursor.execute("SELECT COUNT(*) FROM co_bidding_stats").fetchone()[0]
    collusion = cursor.execute("SELECT COUNT(*) FROM co_bidding_stats WHERE is_potential_collusion = 1").fetchone()[0]
    high_rate = cursor.execute("SELECT COUNT(*) FROM co_bidding_stats WHERE co_bid_rate >= 50").fetchone()[0]

    conn.close()

    elapsed = time.time() - t0
    logger.info(f"Done in {elapsed:.1f}s")
    logger.info(f"  Total pairs: {total:,}")
    logger.info(f"  Pairs with rate >= 50%: {high_rate:,}")
    logger.info(f"  Potential collusion (>= 80%): {collusion:,}")


if __name__ == "__main__":
    precompute_cobidding_stats()
