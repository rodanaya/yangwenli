"""Seed exchange_rates table with Banxico annual average MXN/USD rates.

Run: python -m scripts.seed_exchange_rates  (from backend/)

Idempotent — uses INSERT OR REPLACE so it can be run multiple times.
"""
import sys
from pathlib import Path

# Allow running as a module from backend/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.dependencies import get_db

ANNUAL_RATES = {
    2002: 9.66,  2003: 10.79, 2004: 11.29, 2005: 10.90, 2006: 10.90,
    2007: 10.93, 2008: 13.16, 2009: 13.51, 2010: 12.64, 2011: 12.43,
    2012: 13.17, 2013: 12.77, 2014: 13.29, 2015: 15.87, 2016: 18.66,
    2017: 18.91, 2018: 19.24, 2019: 19.26, 2020: 21.49, 2021: 20.27,
    2022: 20.12, 2023: 17.16, 2024: 17.20, 2025: 19.50, 2026: 20.10,
}


def seed() -> None:
    with get_db() as conn:
        cursor = conn.cursor()

        # Table already exists (created by schema-architect).
        # Annual averages are stored with month=0 as a sentinel value,
        # since the existing schema enforces month NOT NULL.
        inserted = 0
        for year, rate in sorted(ANNUAL_RATES.items()):
            cursor.execute(
                """
                INSERT OR REPLACE INTO exchange_rates
                    (year, month, mxn_usd_fix, source, updated_at)
                VALUES (?, 0, ?, 'banxico_annual_avg', datetime('now'))
                """,
                (year, rate),
            )
            inserted += 1

        conn.commit()
        print(f"Seeded {inserted} annual exchange rate rows into exchange_rates.")
        print("Sample rows:")
        cursor.execute(
            "SELECT year, mxn_usd_fix, source FROM exchange_rates WHERE month = 0 ORDER BY year"
        )
        for row in cursor.fetchall():
            print(f"  {row['year']}: {row['mxn_usd_fix']} ({row['source']})")


if __name__ == "__main__":
    seed()
