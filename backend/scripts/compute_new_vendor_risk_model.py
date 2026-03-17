"""
New Vendor Risk Model - Dedicated scoring for vendors debuting 2018+.

Problem: The v6.0 risk model gives only 3.34% HR to post-2020 vendors because
its strongest predictors (price_volatility, vendor_concentration, institution_
diversity) require years of historical data.  A ghost company created in 2022
with 5 direct-award contracts gets near-zero on 5 of 16 z-features, hiding
behind the cold-start z=0 imputation.

Solution: A weighted rule-based model using ONLY features computable from day 1:
  - External registry flags (EFOS, SFP) - hard evidence
  - Procurement behavior (DA%, single institution, year-end concentration)
  - Vendor profile (RFC presence, age, contract count, RUPC registration)

This replaces the coarser Ghost Companion Heuristic (compute_new_vendor_flags.py)
with a richer, multi-signal score while keeping the same output columns.

Usage:
    cd backend && python -m scripts.compute_new_vendor_risk_model
    cd backend && python -m scripts.compute_new_vendor_risk_model --dry-run
    cd backend && python -m scripts.compute_new_vendor_risk_model --min-debut-year 2020
"""

import argparse
import sqlite3
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Calibration note (Mar 17, 2026):
# Initial run flagged 90,828 / 101,911 (89%) due to NOT_RUPC and FEW_CONTRACTS triggers
# firing for nearly every new vendor (they're new by definition). After calibration:
# - Removed NOT_RUPC as standalone trigger (only 47% RUPC coverage for 2018+ is normal)
# - Lowered FEW_CONTRACTS weight from 0.05 to 0.02
# - Lowered VERY_NEW weight from 0.10 to 0.05
# - Raised ARIA_FLAG_THRESHOLD from 0.30 to 0.40 (aria_queue) to reduce false positives
# Estimated new flag rate: ~8-12% (vs 89% before calibration)
ARIA_FLAG_THRESHOLD = 0.40
CURRENT_YEAR = datetime.now().year


def compute_new_vendor_score(f: dict) -> tuple[float, list[str]]:
    """Score a single new vendor. Returns (score, triggers)."""
    score = 0.0
    triggers: list[str] = []

    # EFOS definitivo = SAT confirmed simulated invoices (Art. 69-B)
    if f["efos_flag"]:
        score += 0.60
        triggers.append("EFOS_DEFINITIVO")

    # SFP sanction = formally sanctioned by Secretaria de la Funcion Publica
    if f["sfp_flag"]:
        score += 0.40
        triggers.append("SFP_SANCTIONED")

    # High direct-award rate (OECD 2023 top red flag)
    da_pct = f["pct_direct_award"]
    if da_pct >= 0.95:
        score += 0.20
        triggers.append("DA_NEAR_EXCLUSIVE")
    elif da_pct >= 0.80:
        score += 0.10
        triggers.append("DA_DOMINANT")

    # Single-institution capture
    if f["single_institution_flag"]:
        score += 0.15
        triggers.append("SINGLE_INSTITUTION")

    # No RFC on record (47% coverage for 2018+ data)
    if not f["has_rfc"]:
        score += 0.15
        triggers.append("NO_RFC")

    # Very new vendor (active span <= 2 years)
    if f["vendor_age_years"] <= 2:
        score += 0.05  # LOWERED from 0.10: being new is by definition for this model scope
        triggers.append("VERY_NEW")

    # December rush >= 60% (IMCO Mexico research)
    if f["year_end_concentration"] >= 0.60:
        score += 0.10
        triggers.append("DECEMBER_RUSH")

    # Very few contracts (5 or fewer)
    if f["n_contracts"] <= 5:
        score += 0.02  # LOWERED from 0.05: new vendors inherently have few contracts
        triggers.append("FEW_CONTRACTS")

    # High avg contract value vs sector-year average
    if f["avg_contract_value_ratio"] >= 5.0:
        score += 0.10
        triggers.append("HIGH_VALUE_RATIO")
    elif f["avg_contract_value_ratio"] >= 3.0:
        score += 0.05
        triggers.append("ELEVATED_VALUE_RATIO")

    # REMOVED: NOT_RUPC trigger (was +0.05)
    # Rationale: Not being in RUPC registry is normal for brand-new vendors;
    # 47% RFC coverage for 2018+ data means 53% will inherently not be in RUPC.
    # This signal was too noisy; only count RUPC absence if combined with other flags.

    return min(score, 1.0), triggers


def _load_efos_rfcs(conn: sqlite3.Connection) -> set:
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT rfc FROM sat_efos_vendors WHERE stage = 'definitivo'")
    return {r[0].strip().upper() for r in cur.fetchall() if r[0]}


def _load_sfp_rfcs(conn: sqlite3.Connection) -> set:
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT rfc FROM sfp_sanctions WHERE rfc IS NOT NULL AND rfc != ''")
    return {r[0].strip().upper() for r in cur.fetchall() if r[0]}


def _load_rupc_rfcs(conn: sqlite3.Connection) -> set:
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT rfc FROM rupc_vendors WHERE rfc IS NOT NULL AND rfc != ''")
    return {r[0].strip().upper() for r in cur.fetchall() if r[0]}


def _load_efos_vendor_ids(conn: sqlite3.Connection) -> set:
    cur = conn.cursor()
    cur.execute("SELECT vendor_id FROM aria_queue WHERE is_efos_definitivo = 1")
    return {r[0] for r in cur.fetchall()}


def _load_sfp_vendor_ids(conn: sqlite3.Connection) -> set:
    cur = conn.cursor()
    cur.execute("SELECT vendor_id FROM aria_queue WHERE is_sfp_sanctioned = 1")
    return {r[0] for r in cur.fetchall()}


def _load_sector_averages(conn: sqlite3.Connection) -> dict:
    """Return {(sector_id, year): avg_amount} for value-ratio computation."""
    cur = conn.cursor()
    cur.execute(
        "SELECT sector_id, contract_year, AVG(amount_mxn) as avg_amt "
        "FROM contracts "
        "WHERE amount_mxn > 0 AND amount_mxn < 100000000000 "
        "AND contract_year >= 2018 "
        "GROUP BY sector_id, contract_year "
        "HAVING COUNT(*) >= 30"
    )
    avgs = {}
    sector_totals = {}
    for sid, yr, avg_amt in cur.fetchall():
        avgs[(sid, yr)] = avg_amt
        sector_totals.setdefault(sid, []).append(avg_amt)
    for sid, vals in sector_totals.items():
        avgs[(sid, 0)] = sum(vals) / len(vals) if vals else 1.0
    return avgs


def _load_year_end_data(conn: sqlite3.Connection, vendor_ids: list) -> dict:
    """Return {vendor_id: fraction_of_contracts_in_december}."""
    cur = conn.cursor()
    result = {}
    batch_size = 500
    for i in range(0, len(vendor_ids), batch_size):
        batch = vendor_ids[i : i + batch_size]
        ph = ",".join("?" * len(batch))
        cur.execute(
            f"SELECT vendor_id, "
            f"SUM(CASE WHEN contract_month = 12 THEN 1 ELSE 0 END) as dec_ct, "
            f"COUNT(*) as total_ct "
            f"FROM contracts "
            f"WHERE vendor_id IN ({ph}) AND contract_month IS NOT NULL "
            f"GROUP BY vendor_id",
            batch,
        )
        for vid, dec_ct, total_ct in cur.fetchall():
            result[vid] = dec_ct / total_ct if total_ct > 0 else 0.0
    return result


def _load_vendor_avg_amounts(conn: sqlite3.Connection, vendor_ids: list) -> dict:
    """Return {vendor_id: avg_amount} for given vendors."""
    cur = conn.cursor()
    result = {}
    batch_size = 500
    for i in range(0, len(vendor_ids), batch_size):
        batch = vendor_ids[i : i + batch_size]
        ph = ",".join("?" * len(batch))
        cur.execute(
            f"SELECT vendor_id, AVG(amount_mxn) as avg_amt "
            f"FROM contracts "
            f"WHERE vendor_id IN ({ph}) AND amount_mxn > 0 AND amount_mxn < 100000000000 "
            f"GROUP BY vendor_id",
            batch,
        )
        for vid, avg_amt in cur.fetchall():
            result[vid] = avg_amt or 0.0
    return result


def ensure_columns(conn: sqlite3.Connection) -> None:
    """Ensure output columns exist in vendor_stats and aria_queue."""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(vendor_stats)")
    vs_cols = {r[1] for r in cur.fetchall()}
    if "new_vendor_risk_score" not in vs_cols:
        cur.execute("ALTER TABLE vendor_stats ADD COLUMN new_vendor_risk_score REAL DEFAULT 0.0")
        print("  Added vendor_stats.new_vendor_risk_score")
    if "new_vendor_risk_triggers" not in vs_cols:
        cur.execute("ALTER TABLE vendor_stats ADD COLUMN new_vendor_risk_triggers TEXT")
        print("  Added vendor_stats.new_vendor_risk_triggers")
    cur.execute("PRAGMA table_info(aria_queue)")
    aq_cols = {r[1] for r in cur.fetchall()}
    if "new_vendor_risk" not in aq_cols:
        cur.execute("ALTER TABLE aria_queue ADD COLUMN new_vendor_risk INTEGER DEFAULT 0")
        print("  Added aria_queue.new_vendor_risk")
    conn.commit()


def score_new_vendors(
    conn: sqlite3.Connection,
    min_debut_year: int = 2018,
    dry_run: bool = False,
) -> int:
    """Score all vendors debuting >= min_debut_year. Returns count flagged."""
    cur = conn.cursor()

    print("  Loading external registries...")
    efos_rfcs = _load_efos_rfcs(conn)
    sfp_rfcs = _load_sfp_rfcs(conn)
    rupc_rfcs = _load_rupc_rfcs(conn)
    efos_vendor_ids = _load_efos_vendor_ids(conn)
    sfp_vendor_ids = _load_sfp_vendor_ids(conn)
    print(f"    EFOS definitivo RFCs: {len(efos_rfcs):,}")
    print(f"    SFP sanctioned RFCs:  {len(sfp_rfcs):,}")
    print(f"    RUPC registered RFCs: {len(rupc_rfcs):,}")
    print(f"    ARIA EFOS vendor IDs: {len(efos_vendor_ids):,}")
    print(f"    ARIA SFP vendor IDs:  {len(sfp_vendor_ids):,}")

    print(f"  Loading vendors with debut >= {min_debut_year}...")
    cur.execute(
        "SELECT "
        "vs.vendor_id, "
        "COALESCE(aq.vendor_name, v.name, '') as vendor_name, "
        "vs.total_contracts, "
        "vs.total_value_mxn, "
        "vs.direct_award_pct, "
        "vs.first_contract_year, "
        "vs.last_contract_year, "
        "vs.institution_count, "
        "COALESCE(v.rfc, '') as rfc, "
        "COALESCE(aq.in_ground_truth, 0) as in_gt, "
        "COALESCE(aq.fp_structural_monopoly, 0) as is_structural_fp, "
        "COALESCE(aq.fp_patent_exception, 0) as is_patent_fp, "
        "COALESCE(aq.fp_data_error, 0) as is_data_error, "
        "vs.primary_sector_id "
        "FROM vendor_stats vs "
        "LEFT JOIN aria_queue aq ON vs.vendor_id = aq.vendor_id "
        "LEFT JOIN vendors v ON vs.vendor_id = v.id "
        "WHERE vs.first_contract_year >= ? "
        "AND vs.total_contracts > 0",
        (min_debut_year,),
    )
    rows = cur.fetchall()
    print(f"  Found {len(rows):,} new vendors to score")
    if not rows:
        print("  No vendors to score.")
        return 0

    vendor_ids = [r[0] for r in rows]
    print("  Computing year-end concentration...")
    year_end_data = _load_year_end_data(conn, vendor_ids)
    print("  Computing average contract values per vendor...")
    vendor_amounts = _load_vendor_avg_amounts(conn, vendor_ids)
    print("  Loading sector-year averages...")
    sector_avgs = _load_sector_averages(conn)

    print("  Scoring vendors...")
    results = []
    all_triggers = []
    n_skipped_gt = 0
    n_skipped_fp = 0

    for row in rows:
        (vendor_id, vendor_name, total_contracts, total_value,
         da_pct_raw, first_year, last_year, n_inst, rfc,
         in_gt, is_structural_fp, is_patent_fp, is_data_error,
         primary_sector_id) = row

        if in_gt:
            n_skipped_gt += 1
            results.append((vendor_id, vendor_name, 0.0, ""))
            continue
        if is_structural_fp or is_patent_fp or is_data_error:
            n_skipped_fp += 1
            results.append((vendor_id, vendor_name, 0.0, ""))
            continue

        rfc_upper = rfc.strip().upper() if rfc else ""
        efos_flag = (rfc_upper in efos_rfcs) or (vendor_id in efos_vendor_ids)
        sfp_flag = (rfc_upper in sfp_rfcs) or (vendor_id in sfp_vendor_ids)
        rupc_registered = rfc_upper in rupc_rfcs if rfc_upper else False
        pct_da = (da_pct_raw or 0.0) / 100.0
        single_inst = (n_inst or 0) <= 1 and (total_contracts or 0) >= 2
        age = (last_year or CURRENT_YEAR) - (first_year or CURRENT_YEAR) + 1
        dec_frac = year_end_data.get(vendor_id, 0.0)

        avg_amt = vendor_amounts.get(vendor_id, 0.0)
        sector_id = primary_sector_id or 12
        sector_avg = sector_avgs.get(
            (sector_id, first_year or 2020),
            sector_avgs.get((sector_id, 0), 1.0),
        )
        value_ratio = avg_amt / sector_avg if sector_avg > 0 else 0.0

        features = {
            "efos_flag": efos_flag,
            "sfp_flag": sfp_flag,
            "pct_direct_award": pct_da,
            "single_institution_flag": single_inst,
            "has_rfc": bool(rfc_upper),
            "vendor_age_years": age,
            "year_end_concentration": dec_frac,
            "rupc_registered": rupc_registered,
            "n_contracts": total_contracts or 0,
            "avg_contract_value_ratio": value_ratio,
        }

        score, triggers = compute_new_vendor_score(features)
        results.append((vendor_id, vendor_name, score, ",".join(triggers)))
        all_triggers.extend(triggers)

    # Summary statistics
    scored = [r for r in results if r[2] > 0]
    high_risk = [r for r in results if r[2] >= 0.50]
    flagged = [r for r in results if r[2] >= ARIA_FLAG_THRESHOLD]
    efos_hits = [r for r in results if "EFOS_DEFINITIVO" in r[3]]
    sfp_hits = [r for r in results if "SFP_SANCTIONED" in r[3]]

    print()
    print("  -- SCORING SUMMARY --")
    print(f"  Total new vendors scored:  {len(results):,}")
    print(f"  Skipped (ground truth):    {n_skipped_gt:,}")
    print(f"  Skipped (false positive):  {n_skipped_fp:,}")
    print(f"  Vendors with score > 0:    {len(scored):,}")
    print(f"  Flagged (>= {ARIA_FLAG_THRESHOLD}):      {len(flagged):,}")
    print(f"  High priority (>= 0.50):   {len(high_risk):,}")
    print(f"  EFOS definitivo matches:   {len(efos_hits):,}")
    print(f"  SFP sanction matches:      {len(sfp_hits):,}")

    print()
    print("  -- TRIGGER DISTRIBUTION --")
    trigger_counts = Counter(all_triggers)
    for trig, cnt in sorted(trigger_counts.items(), key=lambda x: -x[1]):
        print(f"    {trig:30s} {cnt:>7,}")

    # Top 20
    top20 = sorted(results, key=lambda x: -x[2])[:20]
    print()
    print("  -- TOP 20 HIGHEST-SCORING NEW VENDORS --")
    hdr = f"  {'Rank':<5} {'Score':>6} {'Vendor ID':>10}  {'Triggers':40s}  {'Name'}"
    print(hdr)
    print("  " + "-" * 110)
    for i, (vid, vname, sc, trigs) in enumerate(top20, 1):
        name_short = (vname or "")[:40]
        trigs_short = trigs[:40] if trigs else "(none)"
        print(f"  {i:<5} {sc:>6.3f} {vid:>10}  {trigs_short:40s}  {name_short}")

    if dry_run:
        print()
        print("  -- DRY RUN: no database changes written --")
        return len(flagged)

    # Write results to database
    print()
    print("  Writing results to database...")
    conn.execute("PRAGMA synchronous=OFF")

    print("    Updating vendor_stats...")
    cur.executemany(
        "UPDATE vendor_stats "
        "SET new_vendor_risk_score = ?, new_vendor_risk_triggers = ? "
        "WHERE vendor_id = ?",
        [(r[2], r[3], r[0]) for r in results],
    )

    print("    Updating aria_queue...")
    cur.executemany(
        "UPDATE aria_queue SET new_vendor_risk = ? WHERE vendor_id = ?",
        [(1 if r[2] >= ARIA_FLAG_THRESHOLD else 0, r[0]) for r in results],
    )

    # Reset flags for vendors outside scope
    cur.execute(
        "UPDATE aria_queue SET new_vendor_risk = 0 "
        "WHERE vendor_id NOT IN ("
        "  SELECT vendor_id FROM vendor_stats WHERE first_contract_year >= ?"
        ") AND new_vendor_risk = 1",
        (min_debut_year,),
    )

    conn.commit()
    conn.execute("PRAGMA synchronous=FULL")

    cur.execute("SELECT COUNT(*) FROM aria_queue WHERE new_vendor_risk = 1")
    aq_count = cur.fetchone()[0]
    print(f"    aria_queue.new_vendor_risk=1: {aq_count:,} vendors")

    cur.execute(
        "SELECT COUNT(*) FROM vendor_stats "
        "WHERE new_vendor_risk_score >= 0.50 AND first_contract_year >= ?",
        (min_debut_year,),
    )
    vs_high = cur.fetchone()[0]
    print(f"    vendor_stats score >= 0.50:   {vs_high:,} vendors")

    return len(flagged)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="New Vendor Risk Model - score vendors debuting 2018+",
    )
    parser.add_argument(
        "--min-debut-year", type=int, default=2018,
        help="Only score vendors whose first contract is >= this year (default: 2018)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Score and print top 20 without writing to database",
    )
    args = parser.parse_args()

    print("=" * 65)
    print("NEW VENDOR RISK MODEL - Dedicated scoring for recent vendors")
    print("=" * 65)
    print(f"  DB:              {DB_PATH}")
    print(f"  Min debut year:  {args.min_debut_year}")
    print(f"  Flag threshold:  {ARIA_FLAG_THRESHOLD}")
    print(f"  Dry run:         {args.dry_run}")
    print(f"  Timestamp:       {datetime.now().isoformat()}")

    conn = sqlite3.connect(str(DB_PATH), timeout=120)
    conn.execute("PRAGMA busy_timeout = 120000")
    conn.execute("PRAGMA journal_mode = WAL")

    try:
        print()
        print("[1/3] Ensuring schema columns...")
        ensure_columns(conn)

        print()
        print("[2/3] Scoring new vendors...")
        n_flagged = score_new_vendors(
            conn,
            min_debut_year=args.min_debut_year,
            dry_run=args.dry_run,
        )

        print()
        print(f"[3/3] Done. {n_flagged:,} vendors flagged for new-vendor risk.")
        print(f"  Completed: {datetime.now().isoformat()}")
        return 0

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
