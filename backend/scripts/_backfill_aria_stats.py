"""
Backfill aria_queue.top_institution and aria_queue.max_risk_score.

S.1: top_institution was never populated — 248,837 vendors have a ratio but no name.
     Infer the top institution by looking at contracts (by value, not count).

S.2: max_risk_score = 0 for all 248,944 vendors — the pipeline wrote 0 instead of
     the actual maximum risk score from contracts.

Run from backend/:
    python -m scripts._backfill_aria_stats
"""
import sqlite3
import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    logger.info("Connecting to %s", DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # ── S.1 backfill top_institution ──────────────────────────────────────────
    logger.info("S.1: Backfilling top_institution from contracts (by total value)...")

    cursor.execute("PRAGMA synchronous=OFF")
    cursor.execute("PRAGMA journal_mode=WAL")

    # We need the institution with highest total_value_mxn for each vendor
    # Use institution siglas (abbreviation) as the display name — same as ARIA queue convention
    result_s1 = cursor.execute("""
        UPDATE aria_queue
        SET top_institution = (
            SELECT i.siglas
            FROM contracts c
            JOIN institutions i ON i.id = c.institution_id
            WHERE c.vendor_id = aria_queue.vendor_id
              AND i.siglas IS NOT NULL
            GROUP BY c.institution_id
            ORDER BY SUM(c.amount_mxn) DESC
            LIMIT 1
        )
        WHERE top_institution IS NULL
          AND vendor_id IN (
              SELECT DISTINCT vendor_id FROM contracts
          )
    """)
    updated_s1 = cursor.rowcount
    logger.info("S.1: Updated %d rows with top_institution", updated_s1)

    # ── S.2 backfill max_risk_score ───────────────────────────────────────────
    logger.info("S.2: Backfilling max_risk_score from contracts...")

    result_s2 = cursor.execute("""
        UPDATE aria_queue
        SET max_risk_score = (
            SELECT MAX(risk_score)
            FROM contracts
            WHERE contracts.vendor_id = aria_queue.vendor_id
              AND risk_score IS NOT NULL
        )
        WHERE max_risk_score = 0
          AND total_contracts > 0
    """)
    updated_s2 = cursor.rowcount
    logger.info("S.2: Updated %d rows with max_risk_score", updated_s2)

    conn.commit()

    # ── Verify ────────────────────────────────────────────────────────────────
    null_inst = cursor.execute(
        "SELECT COUNT(*) FROM aria_queue WHERE top_institution_ratio > 0 AND top_institution IS NULL"
    ).fetchone()[0]
    zero_risk = cursor.execute(
        "SELECT COUNT(*) FROM aria_queue WHERE total_contracts > 0 AND max_risk_score = 0"
    ).fetchone()[0]

    logger.info("S.1 verification: %d vendors still have NULL top_institution with ratio > 0", null_inst)
    logger.info("S.2 verification: %d vendors still have max_risk_score=0 with contracts > 0", zero_risk)

    if null_inst > 0:
        logger.warning("Some vendors couldn't get top_institution — likely no institution JOIN match")
    if zero_risk > 0:
        logger.warning("Some vendors still have 0 max_risk_score — likely all contracts have NULL risk_score")

    conn.close()
    logger.info("Done.")


if __name__ == "__main__":
    run()
