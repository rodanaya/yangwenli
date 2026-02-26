"""
compute_threshold_proximity.py
Compute threshold proximity score for competitive procurement contracts.

Flags contracts that are within 5% below the licitacion publica threshold
(Coviello, Guglielmo & Spagnolo 2018; Szucs 2023 — contracts clustered just
below mandatory competitive bidding thresholds indicate threshold gaming).

Usage:
    python -m scripts.compute_threshold_proximity [--batch-size 50000]

Runtime: ~15-20 minutes on 3.1M contracts.
"""

import argparse
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Map institution_type (from institutions table) -> laassp_thresholds institution_type
INSTITUTION_TYPE_MAP = {
    "federal_secretariat": "federal_ministry",
    "federal_agency": "federal_ministry",
    "legislative": "federal_ministry",
    "judicial": "federal_ministry",
    "autonomous": "federal_ministry",
    "state_enterprise": "state_enterprise",
    "state_enterprise_infra": "state_enterprise",
    "state_enterprise_energy": "state_enterprise",
    "decentralized": "decentralized",
    "health_institution": "decentralized",
    "educational": "decentralized",
    "social_program": "decentralized",
    "municipal": "decentralized",
    "state_agency": "decentralized",
    "other": "decentralized",
}

# Default fallback
DEFAULT_INST_TYPE = "federal_ministry"

# Fraction below threshold considered "gaming"
GAMING_THRESHOLD_PCT = 0.05  # within 5% below


def load_thresholds(conn) -> dict:
    """
    Load LAASSP thresholds into a nested dict:
    {year: {institution_type: {contract_type: open_required_above_mxn}}}
    """
    cursor = conn.cursor()
    rows = cursor.execute("""
        SELECT year, institution_type, contract_type, open_required_above_mxn
        FROM laassp_thresholds
        WHERE open_required_above_mxn IS NOT NULL
    """).fetchall()

    thresholds = {}
    for r in rows:
        y = r["year"]
        it = r["institution_type"]
        ct = r["contract_type"]
        threshold = r["open_required_above_mxn"]
        if y not in thresholds:
            thresholds[y] = {}
        if it not in thresholds[y]:
            thresholds[y][it] = {}
        thresholds[y][it][ct] = threshold

    return thresholds


def load_institution_types(conn) -> dict:
    """Return {institution_id: mapped_laassp_type}"""
    cursor = conn.cursor()
    rows = cursor.execute("""
        SELECT id, institution_type FROM institutions
    """).fetchall()
    return {
        r["id"]: INSTITUTION_TYPE_MAP.get(r["institution_type"] or "", DEFAULT_INST_TYPE)
        for r in rows
    }


def get_threshold(thresholds: dict, year: int, inst_type: str, min_year: int = 2002) -> float | None:
    """Get applicable threshold — fall back to nearest year if exact match missing."""
    # Try exact year
    if year in thresholds and inst_type in thresholds[year]:
        # Default to 'services' as most common contract type
        t = thresholds[year][inst_type]
        return t.get("services") or t.get("goods") or next(iter(t.values()), None)

    # Fall back to most recent year <= contract_year
    for y in sorted(thresholds.keys(), reverse=True):
        if y <= year and inst_type in thresholds[y]:
            t = thresholds[y][inst_type]
            return t.get("services") or t.get("goods") or next(iter(t.values()), None)

    return None


def main(batch_size: int = 50000):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA cache_size=-200000")
    cursor = conn.cursor()

    print("=" * 60)
    print("COMPUTING THRESHOLD PROXIMITY SCORES")
    print("=" * 60)
    t0 = time.time()

    print("\n1. Loading LAASSP thresholds...")
    thresholds = load_thresholds(conn)
    print(f"   Loaded thresholds for {len(thresholds)} years")

    print("2. Loading institution type mappings...")
    inst_types = load_institution_types(conn)
    print(f"   Loaded {len(inst_types):,} institutions")

    # Only process competitive (non-direct-award) contracts with known amounts
    total = cursor.execute("""
        SELECT COUNT(*) FROM contracts
        WHERE is_direct_award = 0
          AND amount_mxn > 0
          AND contract_year IS NOT NULL
          AND institution_id IS NOT NULL
    """).fetchone()[0]
    print(f"\n3. Processing {total:,} competitive contracts...")

    offset = 0
    updated = 0
    gaming_count = 0

    while True:
        rows = cursor.execute("""
            SELECT id, amount_mxn, contract_year, institution_id
            FROM contracts
            WHERE is_direct_award = 0
              AND amount_mxn > 0
              AND contract_year IS NOT NULL
              AND institution_id IS NOT NULL
            ORDER BY id
            LIMIT ? OFFSET ?
        """, (batch_size, offset)).fetchall()

        if not rows:
            break

        batch_updates = []
        for r in rows:
            year = r["contract_year"]
            inst_type = inst_types.get(r["institution_id"], DEFAULT_INST_TYPE)
            threshold = get_threshold(thresholds, year, inst_type)

            if threshold is None or threshold <= 0:
                continue

            amount = r["amount_mxn"]
            if amount >= threshold:
                # At or above threshold — not relevant for gaming detection
                continue

            pct_below = (threshold - amount) / threshold  # 0.03 = 3% below
            is_gaming = 1 if pct_below <= GAMING_THRESHOLD_PCT else 0

            batch_updates.append((round(pct_below, 6), is_gaming, r["id"]))

        if batch_updates:
            cursor.executemany("""
                UPDATE contracts
                SET threshold_proximity = ?, is_threshold_gaming = ?
                WHERE id = ?
            """, batch_updates)
            conn.commit()
            updated += len(batch_updates)
            gaming_count += sum(1 for _, g, _ in batch_updates if g == 1)

        offset += batch_size
        if offset % (batch_size * 10) == 0:
            print(f"   Processed {offset:,}/{total:,} — {updated:,} updated, {gaming_count:,} gaming flags")

    conn.commit()

    elapsed = time.time() - t0
    print(f"\n4. Results:")
    print(f"   Contracts updated with proximity: {updated:,}")
    print(f"   Threshold gaming flagged (<5% below):  {gaming_count:,}")
    if updated > 0:
        print(f"   Gaming rate: {gaming_count/updated*100:.1f}% of eligible contracts")

    # Show breakdown by sector
    sector_breakdown = cursor.execute("""
        SELECT s.name_es as sector, COUNT(*) as flagged,
               ROUND(SUM(amount_mxn)/1e9, 1) as value_bn
        FROM contracts c
        JOIN sectors s ON c.sector_id = s.id
        WHERE c.is_threshold_gaming = 1
        GROUP BY s.id
        ORDER BY flagged DESC
        LIMIT 8
    """).fetchall()
    if sector_breakdown:
        print("\n   Gaming contracts by sector:")
        for r in sector_breakdown:
            print(f"     {r['sector']:20s}: {r['flagged']:6,} contracts  {r['value_bn']:.1f}B MXN")

    print(f"\nDone in {elapsed/60:.1f} min")
    print("=" * 60)
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compute threshold proximity scores")
    parser.add_argument("--batch-size", type=int, default=50000)
    args = parser.parse_args()
    main(batch_size=args.batch_size)
