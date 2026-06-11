"""Precompute per-institution mean z-feature vectors for the risk-waterfall fallback.

The institution risk-waterfall (institutions.py get_institution_risk_waterfall)
computes AVG(z) over `contract_z_features` per institution. The PROD deploy DB
omits the 3M-row `contract_z_features` table (size), so on prod the waterfall is
empty. This precomputes the per-institution means into a small
`institution_z_means` table (~2.5k rows) that ships to the deploy DB and feeds
the waterfall fallback — so institution "why is this risky" works on prod too.

Run on the SOURCE db (which has contract_z_features):
    python -m scripts._precompute_institution_z_means
Then ship the small table to the deploy DB (see docs / deploy step).
"""
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else "RUBLI_NORMALIZED.db"

Z = [
    "z_single_bid", "z_direct_award", "z_price_ratio", "z_vendor_concentration",
    "z_ad_period_days", "z_year_end", "z_same_day_count", "z_network_member_count",
    "z_co_bid_rate", "z_price_hyp_confidence", "z_industry_mismatch", "z_institution_risk",
    "z_price_volatility", "z_sector_spread", "z_win_rate", "z_institution_diversity",
]


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cols_def = ", ".join(f"{c} REAL" for c in Z)
    cur.execute("DROP TABLE IF EXISTS institution_z_means")
    cur.execute(
        f"CREATE TABLE institution_z_means (institution_id INTEGER PRIMARY KEY, cnt INTEGER, {cols_def})"
    )
    avg_sel = ", ".join(f"AVG(czf.{c})" for c in Z)
    rows = cur.execute(
        f"""
        SELECT c.institution_id, COUNT(*) AS cnt, {avg_sel}
        FROM contract_z_features czf
        JOIN contracts c ON czf.contract_id = c.id
        WHERE c.institution_id IS NOT NULL
        GROUP BY c.institution_id
        """
    ).fetchall()
    placeholders = ", ".join("?" for _ in range(2 + len(Z)))
    cur.executemany(f"INSERT INTO institution_z_means VALUES ({placeholders})", rows)
    conn.commit()
    print(f"institution_z_means: {len(rows)} institutions written to {DB}")
    conn.close()


if __name__ == "__main__":
    main()
