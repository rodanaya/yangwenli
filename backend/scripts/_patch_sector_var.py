"""
One-shot patch: add `high_critical_value_mxn` and `critical_value_mxn` to the
precomputed_stats `sectors` key.

The M3v2 /sectors redesign ("El Libro Mayor de la Exposición") sorts the ledger
by value-at-risk (VaR) = the MXN flowing through model-flagged contracts. Two new
per-sector fields back that surface:

  high_critical_value_mxn = SUM(amount_mxn) WHERE risk_level IN ('high','critical')
  critical_value_mxn      = SUM(amount_mxn) WHERE risk_level = 'critical'

precompute_stats.py is now fixed for future full runs; this script patches the
already-stored `sectors` JSON in place so the fields take effect without a
multi-minute all-keys recompute.

Amount-filter decision (step a): the script first computes BOTH sums per sector
WITHOUT an amount filter, compares salud's high_critical against the expected
1,722.5B; if it deviates >1% it reruns WITH `AND amount_mxn <= 100000000000`
(the platform's 100B reject ceiling) and uses whichever matches, reporting which
was needed.

Idempotent: re-running overwrites both fields with freshly computed values.

Usage:
    python -m scripts._patch_sector_var [DB_PATH]
    DB_PATH defaults to RUBLI_NORMALIZED.db (run dir = backend/).
"""
import json
import sqlite3
import sys
import time
from datetime import datetime

MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN — platform reject ceiling

# Expected high+critical VaR per sector code (B MXN), computed 2026-06-07 with the
# amount_mxn <= 100B filter. Used only for the validation table / filter decision.
EXPECTED_B = {
    "salud": 1722.5,
    "energia": 1211.7,
    "infraestructura": 1105.6,
    "hacienda": 466.7,
    "educacion": 241.8,
    "gobernacion": 182.4,
    "defensa": 161.7,
    "agricultura": 152.9,
    "ambiente": 141.9,
    "trabajo": 63.8,
    "tecnologia": 53.2,
    "otros": 21.5,
}
EXPECTED_TOTAL_B = 5525.7
TOTAL_VALUE_B = 9882.1  # platform validated spend (denominator for %-of-value)


def _compute(cur, with_filter: bool):
    """One GROUP BY over contracts: both VaR sums per sector_id.

    Returns {sector_id: (high_critical_mxn, critical_mxn)}.
    """
    amount_clause = "AND c.amount_mxn <= ?" if with_filter else ""
    params: list = [MAX_CONTRACT_VALUE] if with_filter else []
    query = f"""
        SELECT
            c.sector_id AS sector_id,
            COALESCE(SUM(CASE WHEN c.risk_level IN ('high', 'critical')
                              THEN c.amount_mxn ELSE 0 END), 0) AS high_critical_value,
            COALESCE(SUM(CASE WHEN c.risk_level = 'critical'
                              THEN c.amount_mxn ELSE 0 END), 0) AS critical_value
        FROM contracts c
        WHERE c.sector_id IS NOT NULL {amount_clause}
        GROUP BY c.sector_id
    """
    rows = cur.execute(query, params).fetchall()
    return {r["sector_id"]: (r["high_critical_value"] or 0.0, r["critical_value"] or 0.0) for r in rows}


def patch(db_path: str) -> None:
    print(f"Patching sector VaR fields in: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("PRAGMA busy_timeout=30000")

    # Map sector_id -> code, for matching against EXPECTED_B.
    sector_codes = {
        r["id"]: r["code"]
        for r in cur.execute("SELECT id, code FROM sectors").fetchall()
    }
    salud_id = next((sid for sid, code in sector_codes.items() if code == "salud"), 1)

    # (a) First WITHOUT an amount filter.
    print("Computing VaR sums per sector (NO amount filter)...")
    t0 = time.time()
    sums_nofilter = _compute(cur, with_filter=False)
    print(f"   done in {time.time() - t0:.1f}s")

    salud_nofilter_b = sums_nofilter.get(salud_id, (0.0, 0.0))[0] / 1e9
    expected_salud_b = EXPECTED_B["salud"]
    deviation_pct = abs(salud_nofilter_b - expected_salud_b) / expected_salud_b * 100
    print(
        f"   salud high+critical (no filter): {salud_nofilter_b:,.1f}B "
        f"vs expected {expected_salud_b:,.1f}B (deviation {deviation_pct:.2f}%)"
    )

    if deviation_pct > 1.0:
        print("   deviation > 1% — rerunning WITH amount_mxn <= 100B filter...")
        t0 = time.time()
        sums_filter = _compute(cur, with_filter=True)
        print(f"   done in {time.time() - t0:.1f}s")
        salud_filter_b = sums_filter.get(salud_id, (0.0, 0.0))[0] / 1e9
        dev_filter = abs(salud_filter_b - expected_salud_b) / expected_salud_b * 100
        print(
            f"   salud high+critical (filtered): {salud_filter_b:,.1f}B "
            f"vs expected {expected_salud_b:,.1f}B (deviation {dev_filter:.2f}%)"
        )
        sums = sums_filter
        filter_used = "amount_mxn <= 100B"
    else:
        sums = sums_nofilter
        filter_used = "NONE (no amount filter)"

    print(f"\n==> AMOUNT-FILTER DECISION: {filter_used}\n")

    # (b) Merge the two fields into each sector dict by id.
    ps = cur.execute(
        "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sectors'"
    ).fetchone()
    if not ps:
        print("ERROR: precomputed_stats 'sectors' key not found — run precompute_stats first.")
        conn.close()
        sys.exit(1)

    sectors = json.loads(ps["stat_value"])
    patched = 0
    for s in sectors:
        sid = s.get("id") or s.get("sector_id")
        if sid in sums:
            hc, crit = sums[sid]
            s["high_critical_value_mxn"] = hc
            s["critical_value_mxn"] = crit
            patched += 1
        else:
            s["high_critical_value_mxn"] = 0.0
            s["critical_value_mxn"] = 0.0
    print(f"Patched VaR fields on {patched}/{len(sectors)} sector entries.")

    # (c) Single short write transaction.
    cur.execute("BEGIN IMMEDIATE")
    cur.execute(
        "INSERT OR REPLACE INTO precomputed_stats (stat_key, stat_value, updated_at) VALUES (?, ?, ?)",
        ("sectors", json.dumps(sectors), datetime.now().isoformat()),
    )
    conn.commit()

    # (d) Validation table.
    print("\nValidation table (high+critical VaR per sector):")
    header = f"{'SECTOR':<16}{'COMPUTED':>12}{'EXPECTED':>12}{'DEV%':>8}{'%VALUE':>9}"
    print(header)
    print("-" * len(header))
    total_hc = 0.0
    for s in sorted(sectors, key=lambda x: -(x.get("high_critical_value_mxn") or 0)):
        sid = s.get("id") or s.get("sector_id")
        code = sector_codes.get(sid, s.get("code", str(sid)))
        hc_b = (s.get("high_critical_value_mxn") or 0) / 1e9
        total_hc += hc_b
        exp_b = EXPECTED_B.get(code)
        if exp_b is not None:
            dev = abs(hc_b - exp_b) / exp_b * 100 if exp_b else 0.0
            exp_s = f"{exp_b:>11,.1f}"
            dev_s = f"{dev:>7.2f}"
        else:
            exp_s = f"{'—':>11}"
            dev_s = f"{'—':>7}"
        pct_value = hc_b / TOTAL_VALUE_B * 100  # % of total platform value
        print(f"{code:<16}{hc_b:>11,.1f}{exp_s} {dev_s}{pct_value:>8.1f}%")

    print("-" * len(header))
    total_pct = total_hc / TOTAL_VALUE_B * 100
    total_dev = abs(total_hc - EXPECTED_TOTAL_B) / EXPECTED_TOTAL_B * 100
    print(
        f"{'TOTAL':<16}{total_hc:>11,.1f}{EXPECTED_TOTAL_B:>12,.1f}{total_dev:>8.2f}{total_pct:>8.1f}%"
    )
    print(f"\n==> 12-sector VaR total: {total_hc:,.1f}B = {total_pct:.1f}% of {TOTAL_VALUE_B:,.1f}B platform value")
    print(f"==> Amount filter used: {filter_used}")

    # Round-trip verify.
    check = json.loads(
        cur.execute(
            "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sectors'"
        ).fetchone()[0]
    )
    s1 = next((x for x in check if (x.get("id") or x.get("sector_id")) == salud_id), None)
    if s1:
        print(
            f"\nVerify salud (id={salud_id}): "
            f"high_critical_value_mxn={s1.get('high_critical_value_mxn'):,.0f} "
            f"critical_value_mxn={s1.get('critical_value_mxn'):,.0f}"
        )
    conn.close()


if __name__ == "__main__":
    patch(sys.argv[1] if len(sys.argv) > 1 else "RUBLI_NORMALIZED.db")
