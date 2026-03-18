"""
Independent Validation Set for v6.0 Risk Model.

Tests model performance on external labels NOT used in training:
  1. SFP-sanctioned vendors (government procurement blacklist) — 102 vendors, 2,179 contracts
  2. EFOS presunto (SAT investigating for tax evasion) — 21 vendors, 68 contracts
  3. EFOS definitivo NOT in GT (if any) — crosscheck

These are GOLD STANDARD out-of-distribution tests. The model was trained only on the
ground_truth_vendors table. SFP/EFOS come from completely independent government registries.

Usage:
    python -m scripts.compute_independent_validation [--save] [--verbose]

Output:
    - Summary table of detection rates at each threshold
    - Per-vendor scores for the worst-missed cases
    - Saves results to independent_validation_results table (with --save)
"""

import argparse
import sys
import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
RISK_THRESHOLDS = {
    "critical": 0.60,
    "high": 0.40,
    "medium": 0.25,
    "low": 0.0,
}


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def run_query(conn, sql, params=()):
    return conn.execute(sql, params).fetchall()


def analyze_sfp(conn, verbose=False):
    """SFP-sanctioned vendors NOT in GT (government blacklist)."""
    print("\n" + "="*60)
    print("VALIDATION SET 1: SFP-Sanctioned Vendors (Independent)")
    print("="*60)

    rows = run_query(conn, """
        SELECT
            v.id as vendor_id,
            v.name as vendor_name,
            v.rfc,
            s.sanction_type,
            s.sanction_start,
            s.authority,
            COUNT(c.id) as n_contracts,
            AVG(c.risk_score) as avg_risk,
            MAX(c.risk_score) as max_risk,
            SUM(CASE WHEN c.risk_score >= 0.60 THEN 1 ELSE 0 END) as n_critical,
            SUM(CASE WHEN c.risk_score >= 0.40 THEN 1 ELSE 0 END) as n_high_plus,
            SUM(CASE WHEN c.risk_score >= 0.25 THEN 1 ELSE 0 END) as n_medium_plus
        FROM sfp_sanctions s
        JOIN vendors v ON UPPER(TRIM(v.name)) = UPPER(TRIM(s.company_name))
        JOIN contracts c ON c.vendor_id = v.id
        WHERE v.id NOT IN (
            SELECT vendor_id FROM ground_truth_vendors WHERE vendor_id IS NOT NULL
        )
        GROUP BY v.id, v.name, v.rfc, s.sanction_type, s.sanction_start, s.authority
        HAVING COUNT(c.id) >= 1
        ORDER BY avg_risk DESC
    """)

    if not rows:
        print("  No SFP-matched independent vendors found.")
        return {}

    total_vendors = len(rows)
    total_contracts = sum(r["n_contracts"] for r in rows)
    avg_score = sum(r["avg_risk"] * r["n_contracts"] for r in rows) / total_contracts
    n_high_plus = sum(r["n_high_plus"] for r in rows)
    n_medium_plus = sum(r["n_medium_plus"] for r in rows)
    n_critical = sum(r["n_critical"] for r in rows)

    print(f"  Vendors: {total_vendors} | Contracts: {total_contracts}")
    print(f"  Avg risk score: {avg_score:.4f}")
    print(f"  Detection @ critical (>=0.60): {n_critical}/{total_contracts} = {n_critical*100/total_contracts:.1f}%")
    print(f"  Detection @ high+   (>=0.40): {n_high_plus}/{total_contracts} = {n_high_plus*100/total_contracts:.1f}%")
    print(f"  Detection @ medium+ (>=0.25): {n_medium_plus}/{total_contracts} = {n_medium_plus*100/total_contracts:.1f}%")

    # GT baseline for comparison
    gt_rows = run_query(conn, """
        SELECT
            COUNT(c.id) as n_contracts,
            SUM(CASE WHEN c.risk_score >= 0.40 THEN 1 ELSE 0 END) as n_high_plus,
            AVG(c.risk_score) as avg_risk
        FROM ground_truth_vendors gtv
        JOIN contracts c ON c.vendor_id = gtv.vendor_id
    """)
    gt = gt_rows[0]
    print(f"\n  Baseline (GT vendors): avg={gt['avg_risk']:.4f}, high+={gt['n_high_plus']*100/gt['n_contracts']:.1f}%")
    print(f"  Random baseline (population): avg=~0.10, high+={100*0.1098:.1f}%")

    if verbose:
        print("\n  Top 10 highest-scoring SFP vendors (best detected):")
        for r in rows[:10]:
            print(f"    {r['vendor_name'][:50]:<50} avg={r['avg_risk']:.3f} max={r['max_risk']:.3f} n={r['n_contracts']}")

        print("\n  Bottom 10 lowest-scoring SFP vendors (worst missed):")
        for r in sorted(rows, key=lambda x: x["avg_risk"])[:10]:
            print(f"    {r['vendor_name'][:50]:<50} avg={r['avg_risk']:.3f} max={r['max_risk']:.3f} n={r['n_contracts']}")

    return {
        "source": "sfp_sanctions",
        "n_vendors": total_vendors,
        "n_contracts": total_contracts,
        "avg_risk": avg_score,
        "detection_critical": n_critical / total_contracts,
        "detection_high_plus": n_high_plus / total_contracts,
        "detection_medium_plus": n_medium_plus / total_contracts,
    }


def analyze_efos_presunto(conn, verbose=False):
    """EFOS presunto — SAT tax authority investigating for fraud (NOT definitivo, not in GT)."""
    print("\n" + "="*60)
    print("VALIDATION SET 2: EFOS Presunto (SAT Investigating — Independent)")
    print("="*60)

    rows = run_query(conn, """
        SELECT
            v.id as vendor_id,
            v.name as vendor_name,
            v.rfc,
            COUNT(c.id) as n_contracts,
            AVG(c.risk_score) as avg_risk,
            MAX(c.risk_score) as max_risk,
            SUM(CASE WHEN c.risk_score >= 0.60 THEN 1 ELSE 0 END) as n_critical,
            SUM(CASE WHEN c.risk_score >= 0.40 THEN 1 ELSE 0 END) as n_high_plus,
            SUM(CASE WHEN c.risk_score >= 0.25 THEN 1 ELSE 0 END) as n_medium_plus
        FROM sat_efos_vendors e
        JOIN vendors v ON v.rfc = e.rfc
        JOIN contracts c ON c.vendor_id = v.id
        WHERE e.stage = 'presunto'
          AND v.id NOT IN (
            SELECT vendor_id FROM ground_truth_vendors WHERE vendor_id IS NOT NULL
          )
        GROUP BY v.id, v.name, v.rfc
        ORDER BY avg_risk DESC
    """)

    if not rows:
        print("  No EFOS presunto independent vendors found.")
        return {}

    total_vendors = len(rows)
    total_contracts = sum(r["n_contracts"] for r in rows)
    avg_score = sum(r["avg_risk"] * r["n_contracts"] for r in rows) / total_contracts
    n_high_plus = sum(r["n_high_plus"] for r in rows)
    n_medium_plus = sum(r["n_medium_plus"] for r in rows)
    n_critical = sum(r["n_critical"] for r in rows)

    print(f"  Vendors: {total_vendors} | Contracts: {total_contracts}")
    print(f"  Avg risk score: {avg_score:.4f}")
    print(f"  Detection @ critical (>=0.60): {n_critical}/{total_contracts} = {n_critical*100/total_contracts:.1f}%")
    print(f"  Detection @ high+   (>=0.40): {n_high_plus}/{total_contracts} = {n_high_plus*100/total_contracts:.1f}%")
    print(f"  Detection @ medium+ (>=0.25): {n_medium_plus}/{total_contracts} = {n_medium_plus*100/total_contracts:.1f}%")

    if verbose and rows:
        print("\n  All EFOS presunto vendors (small set):")
        for r in rows:
            print(f"    RFC={r['rfc']} {r['vendor_name'][:45]:<45} avg={r['avg_risk']:.3f} n={r['n_contracts']}")

    return {
        "source": "efos_presunto",
        "n_vendors": total_vendors,
        "n_contracts": total_contracts,
        "avg_risk": avg_score,
        "detection_critical": n_critical / total_contracts,
        "detection_high_plus": n_high_plus / total_contracts,
        "detection_medium_plus": n_medium_plus / total_contracts,
    }


def analyze_efos_definitivo_independent(conn, verbose=False):
    """EFOS definitivo vendors NOT in GT (sanity check of GT coverage)."""
    print("\n" + "="*60)
    print("VALIDATION SET 3: EFOS Definitivo NOT in GT (Crosscheck)")
    print("="*60)

    rows = run_query(conn, """
        SELECT
            v.id as vendor_id,
            v.name as vendor_name,
            v.rfc,
            COUNT(c.id) as n_contracts,
            AVG(c.risk_score) as avg_risk,
            SUM(CASE WHEN c.risk_score >= 0.40 THEN 1 ELSE 0 END) as n_high_plus
        FROM sat_efos_vendors e
        JOIN vendors v ON v.rfc = e.rfc
        JOIN contracts c ON c.vendor_id = v.id
        WHERE e.stage = 'definitivo'
          AND v.id NOT IN (
            SELECT vendor_id FROM ground_truth_vendors WHERE vendor_id IS NOT NULL
          )
        GROUP BY v.id, v.name, v.rfc
        ORDER BY avg_risk DESC
    """)

    if not rows:
        print("  All EFOS definitivo vendors are in GT — good coverage.")
        return {}

    total_vendors = len(rows)
    total_contracts = sum(r["n_contracts"] for r in rows)
    avg_score = sum(r["avg_risk"] * r["n_contracts"] for r in rows) / total_contracts if total_contracts > 0 else 0
    n_high_plus = sum(r["n_high_plus"] for r in rows)

    print(f"  EFOS definitivo vendors NOT in GT: {total_vendors} vendors, {total_contracts} contracts")
    print(f"  Avg risk: {avg_score:.4f} | High+: {n_high_plus*100/max(total_contracts,1):.1f}%")
    print(f"  → These {total_vendors} vendors should be added to GT")

    if verbose:
        for r in rows[:20]:
            print(f"    RFC={r['rfc']} {r['vendor_name'][:45]:<45} avg={r['avg_risk']:.3f} n={r['n_contracts']}")

    return {
        "source": "efos_definitivo_not_in_gt",
        "n_vendors": total_vendors,
        "n_contracts": total_contracts,
        "avg_risk": avg_score,
        "detection_high_plus": n_high_plus / max(total_contracts, 1),
    }


def analyze_sector_breakdown(conn):
    """Show SFP detection broken down by sector."""
    print("\n" + "="*60)
    print("SFP DETECTION BY SECTOR")
    print("="*60)

    rows = run_query(conn, """
        SELECT
            c.sector_id,
            COUNT(DISTINCT v.id) as n_vendors,
            COUNT(c.id) as n_contracts,
            AVG(c.risk_score) as avg_risk,
            SUM(CASE WHEN c.risk_score >= 0.40 THEN 1 ELSE 0 END)*100.0/COUNT(c.id) as high_plus_pct
        FROM sfp_sanctions s
        JOIN vendors v ON UPPER(TRIM(v.name)) = UPPER(TRIM(s.company_name))
        JOIN contracts c ON c.vendor_id = v.id
        WHERE v.id NOT IN (
            SELECT vendor_id FROM ground_truth_vendors WHERE vendor_id IS NOT NULL
        )
        GROUP BY c.sector_id
        ORDER BY avg_risk DESC
    """)

    SECTOR_NAMES = {
        1: "Salud", 2: "Educacion", 3: "Infraestructura", 4: "Energia",
        5: "Defensa", 6: "Tecnologia", 7: "Hacienda", 8: "Gobernacion",
        9: "Agricultura", 10: "Ambiente", 11: "Trabajo", 12: "Otros"
    }

    print(f"  {'Sector':<20} {'Vendors':>8} {'Contracts':>10} {'Avg Risk':>10} {'High+%':>8}")
    print("  " + "-"*60)
    for r in rows:
        name = SECTOR_NAMES.get(r["sector_id"], f"Sector {r['sector_id']}")
        print(f"  {name:<20} {r['n_vendors']:>8} {r['n_contracts']:>10} {r['avg_risk']:>10.4f} {r['high_plus_pct']:>7.1f}%")


def analyze_gt_baseline(conn):
    """GT detection as reference (in-distribution performance)."""
    print("\n" + "="*60)
    print("BASELINE: In-Distribution GT Performance (Reference)")
    print("="*60)

    rows = run_query(conn, """
        SELECT
            COUNT(DISTINCT gtv.vendor_id) as n_vendors,
            COUNT(c.id) as n_contracts,
            AVG(c.risk_score) as avg_risk,
            SUM(CASE WHEN c.risk_score >= 0.60 THEN 1 ELSE 0 END)*100.0/COUNT(c.id) as critical_pct,
            SUM(CASE WHEN c.risk_score >= 0.40 THEN 1 ELSE 0 END)*100.0/COUNT(c.id) as high_plus_pct,
            SUM(CASE WHEN c.risk_score >= 0.25 THEN 1 ELSE 0 END)*100.0/COUNT(c.id) as medium_plus_pct
        FROM ground_truth_vendors gtv
        JOIN contracts c ON c.vendor_id = gtv.vendor_id
    """)

    r = rows[0]
    print(f"  Vendors: {r['n_vendors']} | Contracts: {r['n_contracts']}")
    print(f"  Avg risk: {r['avg_risk']:.4f}")
    print(f"  Critical (>=0.60): {r['critical_pct']:.1f}%")
    print(f"  High+   (>=0.40): {r['high_plus_pct']:.1f}%")
    print(f"  Medium+ (>=0.15): {r['medium_plus_pct']:.1f}%")
    print(f"  (Note: These vendors were USED IN TRAINING — expected high detection)")


def save_results(conn, results: list):
    """Save validation results to DB for tracking over time."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS independent_validation_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_at TEXT,
            model_version TEXT,
            source TEXT,
            n_vendors INTEGER,
            n_contracts INTEGER,
            avg_risk REAL,
            detection_critical REAL,
            detection_high_plus REAL,
            detection_medium_plus REAL
        )
    """)

    model_version = conn.execute(
        "SELECT value FROM model_calibration WHERE key='model_version' LIMIT 1"
    ).fetchone()
    version = model_version[0] if model_version else "v6.0"

    for r in results:
        if not r:
            continue
        conn.execute("""
            INSERT INTO independent_validation_results
            (run_at, model_version, source, n_vendors, n_contracts, avg_risk,
             detection_critical, detection_high_plus, detection_medium_plus)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.now().isoformat(), version,
            r.get("source"), r.get("n_vendors"), r.get("n_contracts"),
            r.get("avg_risk"), r.get("detection_critical", 0),
            r.get("detection_high_plus", 0), r.get("detection_medium_plus", 0),
        ))
    conn.commit()
    print(f"\n  Results saved to independent_validation_results ({len([r for r in results if r])} rows)")


def print_summary(results: list):
    """Print final diagnostic summary."""
    print("\n" + "="*60)
    print("SUMMARY: OUT-OF-DISTRIBUTION DETECTION PERFORMANCE")
    print("="*60)
    print()
    print("  The v6.0 model performs well on IN-DISTRIBUTION data (GT vendors)")
    print("  but shows near-random performance on INDEPENDENT external labels.")
    print()

    header = f"  {'Source':<30} {'Vendors':>8} {'AvgRisk':>9} {'High+%':>8}"
    print(header)
    print("  " + "-"*57)

    for r in results:
        if not r:
            continue
        high_pct = r.get("detection_high_plus", 0) * 100
        print(f"  {r['source']:<30} {r.get('n_vendors',0):>8} {r.get('avg_risk',0):>9.4f} {high_pct:>7.1f}%")

    print()
    print("  Random baseline (population):          high+ = 10.98%")
    print()
    print("  DIAGNOSIS:")
    print("  - SFP blacklisted vendors: 0.2% high+ (vs 10.98% baseline)")
    print("  - EFOS presunto: 0.0% high+")
    print("  - The model detects 'large vendor market concentration' not 'corruption'")
    print("  - SFP sanctions are typically for small/medium vendors → low concentration")
    print("  - Model is ANTI-predictive for small-vendor corruption")
    print()
    print("  QUICK FIXES (ordered by impact):")
    print("  1. Instance-weighted training: in-fraud-window=1.0, outside=0.10")
    print("  2. Curriculum learning: weight by confidence_level")
    print("  3. Add EFOS definitivo not-in-GT to ground truth (~" +
          str(next((r['n_vendors'] for r in results if r.get('source') == 'efos_definitivo_not_in_gt'), 0)) + " vendors)")
    print("  4. Fraud-type specialized detectors (monopoly vs ghost vs overpricing)")


def main():
    parser = argparse.ArgumentParser(description="Independent validation of v6.0 risk model")
    parser.add_argument("--save", action="store_true", help="Save results to DB")
    parser.add_argument("--verbose", action="store_true", help="Show per-vendor details")
    args = parser.parse_args()

    print("RUBLI v6.0 — Independent Validation Report")
    print(f"Run at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"DB: {DB_PATH}")

    conn = get_conn()

    analyze_gt_baseline(conn)

    results = []
    results.append(analyze_sfp(conn, verbose=args.verbose))
    results.append(analyze_efos_presunto(conn, verbose=args.verbose))
    results.append(analyze_efos_definitivo_independent(conn, verbose=args.verbose))

    analyze_sector_breakdown(conn)
    print_summary(results)

    if args.save:
        save_results(conn, results)

    conn.close()


if __name__ == "__main__":
    main()
