"""
compute_official_profiles.py
Compute risk profiles for signing officials in COMPRANET Structures C/D (2018+).

Coviello & Gagliarducci (2017) showed that official tenure is the most predictive
variable for single-bid rates in Italian procurement. Romania and Ukraine both score
individual signing officials. Mexico's COMPRANET records 'servidor_publico_que_firmo'
in Structures C/D but this field was not included in the RUBLI ETL pipeline.

DATA GAP NOTE:
  The 'servidor_publico_que_firmo' (signing official) field is present in the raw
  COMPRANET CSV files for structures C (2018-2022) and D (2023-2025) but was not
  mapped to the contracts table during ETL. To enable this analysis:
  1. Re-run ETL with the official_firmante mapping from etl_pipeline.py
  2. Add column: ALTER TABLE contracts ADD COLUMN oficial_firmante TEXT;
  3. Then re-run this script.

Usage:
    python -m scripts.compute_official_profiles [--min-contracts 10]

Runtime: ~5-10 minutes on 1.3M contracts (2018+).
"""
import argparse
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def normalize_name(name: str) -> str:
    """Normalize official name: uppercase, strip whitespace."""
    if not name:
        return name
    import unicodedata
    name = name.strip().upper()
    # Remove accents
    name = ''.join(
        c for c in unicodedata.normalize('NFD', name)
        if unicodedata.category(c) != 'Mn'
    )
    return name


def main(min_contracts: int = 10):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    cursor = conn.cursor()

    # Check if oficial_firmante column exists
    cols = [c[1] for c in cursor.execute("PRAGMA table_info(contracts)").fetchall()]
    if 'oficial_firmante' not in cols:
        print("=" * 60)
        print("DATA GAP: oficial_firmante column not in contracts table.")
        print("")
        print("The signing official field ('servidor_publico_que_firmo') is")
        print("present in raw COMPRANET CSVs (Structures C/D, 2018+) but was")
        print("not included in the ETL pipeline.")
        print("")
        print("To enable this analysis:")
        print("  1. ALTER TABLE contracts ADD COLUMN oficial_firmante TEXT;")
        print("  2. Re-populate from original CSV files")
        print("  3. Re-run this script")
        print("=" * 60)
        conn.close()
        return

    print("=" * 60)
    print("OFFICIAL RISK PROFILE COMPUTATION")
    print(f"Minimum contracts threshold: {min_contracts}")
    print("=" * 60)
    t0 = time.time()

    cursor.execute("DELETE FROM official_risk_profiles")
    conn.commit()

    rows = cursor.execute("""
        WITH official_contracts AS (
            SELECT
                UPPER(TRIM(oficial_firmante)) AS official_name,
                institution_id,
                risk_score,
                is_single_bid,
                is_direct_award,
                vendor_id,
                contract_year
            FROM contracts
            WHERE contract_year >= 2018
              AND oficial_firmante IS NOT NULL
              AND oficial_firmante != ''
        ),
        agg AS (
            SELECT
                official_name,
                institution_id,
                COUNT(*) AS total_contracts,
                MIN(contract_year) AS first_year,
                MAX(contract_year) AS last_year,
                AVG(CAST(is_single_bid AS FLOAT)) * 100 AS single_bid_pct,
                AVG(CAST(is_direct_award AS FLOAT)) * 100 AS direct_award_pct,
                AVG(COALESCE(risk_score, 0)) AS avg_risk_score,
                COUNT(DISTINCT vendor_id) AS vendor_diversity
            FROM official_contracts
            GROUP BY official_name, institution_id
            HAVING COUNT(*) >= ?
        )
        SELECT * FROM agg
    """, (min_contracts,)).fetchall()

    if not rows:
        print("No officials found with >= {} contracts in 2018+ data.".format(min_contracts))
        conn.close()
        return

    # Compute vendor HHI per official
    inserts = []
    for r in rows:
        # HHI: sum of squared vendor share
        vendor_rows = cursor.execute("""
            SELECT vendor_id, COUNT(*) AS cnt
            FROM contracts
            WHERE contract_year >= 2018
              AND UPPER(TRIM(oficial_firmante)) = ?
              AND institution_id = ?
              AND vendor_id IS NOT NULL
            GROUP BY vendor_id
        """, (r['official_name'], r['institution_id'])).fetchall()

        total = sum(v['cnt'] for v in vendor_rows)
        hhi = sum((v['cnt'] / total * 100) ** 2 for v in vendor_rows) if total > 0 else 0

        inserts.append((
            r['official_name'],
            r['institution_id'],
            r['first_year'],
            r['last_year'],
            r['total_contracts'],
            round(r['single_bid_pct'], 2),
            round(r['direct_award_pct'], 2),
            round(r['avg_risk_score'], 4),
            r['vendor_diversity'],
            round(hhi, 1),
        ))

    cursor.executemany("""
        INSERT INTO official_risk_profiles
            (official_name, institution_id, first_contract_year, last_contract_year,
             total_contracts, single_bid_pct, direct_award_pct, avg_risk_score,
             vendor_diversity, hhi_vendors)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, inserts)
    conn.commit()

    elapsed = time.time() - t0
    print(f"Computed profiles for {len(inserts):,} officials in {elapsed:.1f}s")

    # Top 10 highest risk officials
    top = cursor.execute("""
        SELECT official_name, total_contracts, avg_risk_score, single_bid_pct, hhi_vendors
        FROM official_risk_profiles
        ORDER BY avg_risk_score DESC
        LIMIT 10
    """).fetchall()
    print("\nTop 10 highest-risk officials:")
    for r in top:
        print(f"  {r['official_name'][:40]:40} | {r['total_contracts']:5} contracts | "
              f"avg_risk={r['avg_risk_score']:.3f} | single_bid={r['single_bid_pct']:.1f}% | HHI={r['hhi_vendors']:.0f}")
    print("=" * 60)
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compute official-level risk profiles")
    parser.add_argument("--min-contracts", type=int, default=10,
                        help="Minimum contracts required per official (default: 10)")
    args = parser.parse_args()
    main(min_contracts=args.min_contracts)
