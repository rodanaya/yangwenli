"""
fix_currency_amounts.py

Data quality fix: 26,872 contracts have amounts stored in foreign currency
(USD, EUR, GBP, CAD, JPY) but the column is called amount_mxn.

This script:
1. Backs up the database
2. Adds is_foreign_currency boolean column
3. Converts each foreign-currency contract to MXN using historical rates
4. Flags all non-MXN contracts with is_foreign_currency=1
5. Reports before/after totals

Run: cd backend && python -m scripts.fix_currency_amounts
"""

import os
import sqlite3
import shutil
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

# ── Historical exchange rates ──────────────────────────────────────────────

MXN_USD = {
    2002: 9.66,  2003: 10.79, 2004: 11.29, 2005: 10.90, 2006: 10.90,
    2007: 10.93, 2008: 11.13, 2009: 13.51, 2010: 12.64, 2011: 12.43,
    2012: 13.17, 2013: 12.77, 2014: 13.29, 2015: 15.87, 2016: 18.66,
    2017: 18.93, 2018: 19.24, 2019: 19.26, 2020: 21.49, 2021: 20.28,
    2022: 20.13, 2023: 17.74, 2024: 17.16, 2025: 17.50,
}

MXN_EUR = {
    2002:  9.15, 2003: 12.26, 2004: 14.04, 2005: 13.55, 2006: 13.63,
    2007: 14.98, 2008: 16.33, 2009: 18.80, 2010: 16.73, 2011: 17.28,
    2012: 17.19, 2013: 16.93, 2014: 17.66, 2015: 17.60, 2016: 20.69,
    2017: 21.33, 2018: 22.62, 2019: 21.55, 2020: 24.45, 2021: 23.94,
    2022: 21.20, 2023: 19.36, 2024: 18.73, 2025: 18.50,
}

MXN_GBP = {
    2010: 19.49, 2011: 19.34, 2012: 20.81, 2013: 19.75, 2014: 21.99,
    2015: 24.27, 2016: 23.75, 2017: 24.58, 2018: 25.22, 2019: 24.35,
    2020: 27.54, 2021: 27.91, 2022: 24.18, 2023: 22.28, 2024: 21.84,
    2025: 22.00,
}
DEFAULT_GBP = 22.00

MXN_CAD = {
    2010: 12.24, 2015: 11.82, 2016: 13.82, 2017: 14.71, 2018: 14.74,
    2019: 14.55, 2020: 16.08, 2021: 16.37, 2022: 15.65, 2023: 13.27,
    2024: 12.41, 2025: 12.50,
}
DEFAULT_CAD = 13.50

# MXN per 100 JPY
MXN_JPY_PER_100 = {
    2010: 14.31, 2015: 13.14, 2016: 17.89, 2017: 16.93, 2018: 17.21,
    2019: 17.74, 2020: 20.27, 2021: 18.52, 2022: 15.47, 2023: 12.87,
    2024: 11.44, 2025: 11.50,
}
DEFAULT_JPY_PER_100 = 15.0

MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN — reject above this


def get_rate(rate_table: dict, year: int, default: float) -> float:
    """Return the rate for the given year, falling back to nearest year or default."""
    if year in rate_table:
        return rate_table[year]
    available = sorted(rate_table.keys())
    if not available:
        return default
    if year < available[0]:
        return rate_table[available[0]]
    if year > available[-1]:
        return rate_table[available[-1]]
    lower = max(y for y in available if y <= year)
    upper = min(y for y in available if y >= year)
    if lower == upper:
        return rate_table[lower]
    frac = (year - lower) / (upper - lower)
    return rate_table[lower] + frac * (rate_table[upper] - rate_table[lower])


def convert_to_mxn(currency: str, amount: float, year: int) -> tuple[float, bool]:
    """
    Convert a foreign-currency amount to MXN.
    Returns (mxn_amount, converted_ok).
    converted_ok=False means the result exceeded MAX_CONTRACT_VALUE.
    """
    if currency == "USD":
        rate = get_rate(MXN_USD, year, 15.0)
        mxn = amount * rate
    elif currency == "EUR":
        rate = get_rate(MXN_EUR, year, 18.0)
        mxn = amount * rate
    elif currency == "GBP":
        rate = get_rate(MXN_GBP, year, DEFAULT_GBP)
        mxn = amount * rate
    elif currency == "CAD":
        rate = get_rate(MXN_CAD, year, DEFAULT_CAD)
        mxn = amount * rate
    elif currency == "JPY":
        # amount is in JPY; rate is MXN per 100 JPY
        rate = get_rate(MXN_JPY_PER_100, year, DEFAULT_JPY_PER_100)
        mxn = (amount / 100.0) * rate
    else:
        return amount, False  # Unknown currency — leave unchanged

    if mxn > MAX_CONTRACT_VALUE:
        log.warning(
            "Converted amount %.2f %s (year %d) → %.2f MXN exceeds 100B limit; "
            "keeping original value.",
            amount, currency, year, mxn,
        )
        return amount, False

    return mxn, True


def main() -> None:
    db_path = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")

    # ── Step 1: Backup ────────────────────────────────────────────────────
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_suffix(f".db.currency_backup_{ts}")
    log.info("Backing up database to %s ...", backup_path)
    shutil.copy2(db_path, backup_path)
    log.info("Backup complete (%.1f MB)", backup_path.stat().st_size / 1e6)

    conn = sqlite3.connect(str(db_path), timeout=120)
    # Use WAL mode + synchronous=OFF for fast bulk writes (same pattern as scoring scripts)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA busy_timeout=60000")
    conn.execute("PRAGMA cache_size=-65536")  # 64MB cache
    cur = conn.cursor()

    # ── Step 2: Add is_foreign_currency column ────────────────────────────
    cur.execute("PRAGMA table_info(contracts)")
    existing_cols = {row[1] for row in cur.fetchall()}

    if "is_foreign_currency" not in existing_cols:
        log.info("Adding is_foreign_currency column to contracts ...")
        cur.execute(
            "ALTER TABLE contracts ADD COLUMN is_foreign_currency INTEGER NOT NULL DEFAULT 0"
        )
        conn.commit()
        log.info("Column added.")
    else:
        log.info("is_foreign_currency column already exists.")

    # ── Step 3: Measure totals before ────────────────────────────────────
    cur.execute("SELECT SUM(amount_mxn) FROM contracts WHERE amount_mxn < 100e9")
    total_before = cur.fetchone()[0] or 0.0
    log.info("Total value before conversion: %.4f T MXN", total_before / 1e12)

    # ── Step 4: Fetch all foreign-currency contracts ──────────────────────
    log.info("Fetching all foreign-currency contracts ...")
    cur.execute(
        """
        SELECT id, currency, amount_mxn, contract_year
        FROM contracts
        WHERE currency IS NOT NULL
          AND currency != ''
          AND currency != 'MXN'
        ORDER BY contract_year, id
        """
    )
    rows = cur.fetchall()
    log.info("Found %d foreign-currency contracts.", len(rows))

    # ── Step 5: Build update list ─────────────────────────────────────────
    count_fixed = 0
    count_skipped = 0
    count_unknown = 0

    update_data = []  # (new_amount_mxn, is_foreign_currency, contract_id)

    for row in rows:
        contract_id, currency, raw_amount, year = row
        if year is None:
            year = 2015  # fallback

        if currency not in ("USD", "EUR", "GBP", "CAD", "JPY"):
            count_unknown += 1
            update_data.append((raw_amount, 1, contract_id))  # flag but don't convert
            continue

        mxn_amount, ok = convert_to_mxn(currency, raw_amount, year)

        if ok:
            count_fixed += 1
        else:
            count_skipped += 1

        update_data.append((mxn_amount, 1, contract_id))

    log.info(
        "Conversions: %d to convert, %d skipped (exceeded 100B), %d unknown currency",
        count_fixed, count_skipped, count_unknown,
    )

    # ── Step 6: Write conversions in one transaction ──────────────────────
    BATCH = 10_000
    log.info("Writing %d conversions in batches of %d ...", len(update_data), BATCH)
    for i in range(0, len(update_data), BATCH):
        batch = update_data[i : i + BATCH]
        cur.executemany(
            "UPDATE contracts SET amount_mxn = ?, is_foreign_currency = ? WHERE id = ?",
            batch,
        )
        conn.commit()
        log.info("  Batch %d/%d committed (%d rows).",
                 i // BATCH + 1,
                 (len(update_data) + BATCH - 1) // BATCH,
                 len(batch))

    # ── Step 7: Mark MXN contracts as is_foreign_currency = 0 ─────────────
    log.info("Marking MXN/null-currency contracts as is_foreign_currency = 0 ...")
    cur.execute(
        """
        UPDATE contracts
        SET is_foreign_currency = 0
        WHERE currency IS NULL OR currency = '' OR currency = 'MXN'
        """
    )
    conn.commit()
    log.info("MXN flag update committed (%d rows affected).", cur.rowcount)

    # ── Step 8: Totals after ──────────────────────────────────────────────
    cur.execute("SELECT SUM(amount_mxn) FROM contracts WHERE amount_mxn < 100e9")
    total_after = cur.fetchone()[0] or 0.0

    cur.execute("SELECT COUNT(*) FROM contracts WHERE is_foreign_currency = 1")
    flagged_count = cur.fetchone()[0]

    cur.execute(
        """
        SELECT currency, COUNT(*), SUM(amount_mxn)/1e9
        FROM contracts
        WHERE is_foreign_currency = 1
        GROUP BY currency
        ORDER BY COUNT(*) DESC
        """
    )
    breakdown = cur.fetchall()

    conn.close()

    # ── Report ────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("MIGRATION COMPLETE")
    log.info("=" * 60)
    log.info("  Contracts converted  : %d", count_fixed)
    log.info("  Contracts skipped    : %d  (exceeded 100B MXN — kept original)", count_skipped)
    log.info("  Unknown currency     : %d  (flagged, not converted)", count_unknown)
    log.info("  Total flagged        : %d", flagged_count)
    log.info("")
    log.info("  Total before         : %.4f T MXN", total_before / 1e12)
    log.info("  Total after          : %.4f T MXN", total_after / 1e12)
    log.info("  Delta                : +%.4f T MXN", (total_after - total_before) / 1e12)
    log.info("")
    log.info("  Post-conversion breakdown:")
    for cur_code, cnt, total_b in breakdown:
        log.info("    %-4s  %6d contracts  %.2f B MXN", cur_code, cnt, total_b)
    log.info("=" * 60)
    log.info("Backup at: %s", backup_path)


if __name__ == "__main__":
    main()
