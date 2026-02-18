"""
Compute category statistics from contracts.category_id.

Creates/replaces:
  - category_stats: aggregate stats per category
  - category_yearly_stats: per-category per-year trends

Run from backend/ directory:
    python -m scripts.compute_category_stats
"""
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def compute_category_stats():
    print("=" * 60)
    print("COMPUTING CATEGORY STATISTICS")
    print("=" * 60)

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 60000")
    conn.execute("PRAGMA synchronous = OFF")
    conn.execute("PRAGMA journal_mode = WAL")
    cur = conn.cursor()

    # 1. Aggregate stats per category
    print("\n1. Computing category_stats...")
    t0 = time.time()

    cur.execute("DROP TABLE IF EXISTS category_stats")
    cur.execute("""
        CREATE TABLE category_stats (
            category_id INTEGER PRIMARY KEY,
            category_name TEXT NOT NULL,
            category_name_en TEXT,
            sector_id INTEGER,
            total_contracts INTEGER NOT NULL DEFAULT 0,
            total_value REAL NOT NULL DEFAULT 0.0,
            avg_risk REAL DEFAULT 0.0,
            direct_award_pct REAL DEFAULT 0.0,
            single_bid_pct REAL DEFAULT 0.0,
            top_vendor_id INTEGER,
            top_vendor_name TEXT,
            top_institution_id INTEGER,
            top_institution_name TEXT
        )
    """)

    # Base stats per category
    cur.execute("""
        INSERT INTO category_stats (
            category_id, category_name, category_name_en, sector_id,
            total_contracts, total_value, avg_risk, direct_award_pct, single_bid_pct
        )
        SELECT
            cat.id,
            cat.name_es,
            cat.name_en,
            cat.sector_id,
            COUNT(c.id) as total_contracts,
            COALESCE(SUM(c.amount_mxn), 0) as total_value,
            COALESCE(AVG(c.risk_score), 0) as avg_risk,
            CASE WHEN COUNT(c.id) > 0
                 THEN ROUND(SUM(CASE WHEN c.is_direct_award = 1 THEN 1.0 ELSE 0 END) / COUNT(c.id) * 100, 1)
                 ELSE 0 END as direct_award_pct,
            CASE WHEN COUNT(c.id) > 0
                 THEN ROUND(SUM(CASE WHEN c.is_single_bid = 1 THEN 1.0 ELSE 0 END) / COUNT(c.id) * 100, 1)
                 ELSE 0 END as single_bid_pct
        FROM categories cat
        LEFT JOIN contracts c ON c.category_id = cat.id
        WHERE cat.is_active = 1
        GROUP BY cat.id
    """)
    print(f"   Base stats inserted in {time.time() - t0:.1f}s")

    # Top vendor per category
    t1 = time.time()
    cur.execute("""
        WITH ranked AS (
            SELECT
                c.category_id,
                c.vendor_id,
                v.name as vendor_name,
                COUNT(*) as cnt,
                ROW_NUMBER() OVER (PARTITION BY c.category_id ORDER BY COUNT(*) DESC) as rn
            FROM contracts c
            JOIN vendors v ON v.id = c.vendor_id
            WHERE c.category_id IS NOT NULL
            GROUP BY c.category_id, c.vendor_id
        )
        UPDATE category_stats
        SET top_vendor_id = ranked.vendor_id,
            top_vendor_name = ranked.vendor_name
        FROM ranked
        WHERE category_stats.category_id = ranked.category_id
          AND ranked.rn = 1
    """)
    print(f"   Top vendors updated in {time.time() - t1:.1f}s")

    # Top institution per category
    t2 = time.time()
    cur.execute("""
        WITH ranked AS (
            SELECT
                c.category_id,
                c.institution_id,
                i.name as inst_name,
                COUNT(*) as cnt,
                ROW_NUMBER() OVER (PARTITION BY c.category_id ORDER BY COUNT(*) DESC) as rn
            FROM contracts c
            JOIN institutions i ON i.id = c.institution_id
            WHERE c.category_id IS NOT NULL
            GROUP BY c.category_id, c.institution_id
        )
        UPDATE category_stats
        SET top_institution_id = ranked.institution_id,
            top_institution_name = ranked.inst_name
        FROM ranked
        WHERE category_stats.category_id = ranked.category_id
          AND ranked.rn = 1
    """)
    conn.commit()
    print(f"   Top institutions updated in {time.time() - t2:.1f}s")

    # 2. Yearly stats per category
    print("\n2. Computing category_yearly_stats...")
    t3 = time.time()

    cur.execute("DROP TABLE IF EXISTS category_yearly_stats")
    cur.execute("""
        CREATE TABLE category_yearly_stats (
            category_id INTEGER NOT NULL,
            year INTEGER NOT NULL,
            contracts INTEGER NOT NULL DEFAULT 0,
            value REAL NOT NULL DEFAULT 0.0,
            avg_risk REAL DEFAULT 0.0,
            PRIMARY KEY (category_id, year)
        )
    """)

    cur.execute("""
        INSERT INTO category_yearly_stats (category_id, year, contracts, value, avg_risk)
        SELECT
            c.category_id,
            c.contract_year,
            COUNT(*) as contracts,
            COALESCE(SUM(c.amount_mxn), 0) as value,
            COALESCE(AVG(c.risk_score), 0) as avg_risk
        FROM contracts c
        WHERE c.category_id IS NOT NULL
          AND c.contract_year BETWEEN 2002 AND 2025
        GROUP BY c.category_id, c.contract_year
    """)
    conn.commit()
    print(f"   Yearly stats computed in {time.time() - t3:.1f}s")

    # Summary
    cur.execute("SELECT COUNT(*) FROM category_stats WHERE total_contracts > 0")
    active = cur.fetchone()[0]
    cur.execute("SELECT SUM(total_contracts) FROM category_stats")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM category_yearly_stats")
    yearly_rows = cur.fetchone()[0]

    print(f"\n{'='*60}")
    print(f"DONE: {active} active categories, {total:,} categorized contracts")
    print(f"      {yearly_rows} yearly stat rows")
    print(f"      Total time: {time.time() - t0:.1f}s")
    print(f"{'='*60}")

    conn.close()


if __name__ == "__main__":
    compute_category_stats()
