"""ARIA Cases batch_H: March 19 2026 GT mining session.

Cases added:
  - Case 752: HIDROVIAS Y CARRETERAS dredging SB capture (vendor 89737)
    100% single-bid across CONAPESCA, CONAGUA, and state agencies 2010-2020.
    266M MXN in dredging/canal work won as sole bidder in every competitive tender.
  - Case 753: CONSTRUMAQUINAS DEL BAJIO Guanajuato construction SB capture (vendor 12221)
    89.5% single-bid, 68% of value at Secretaria de Obra Publica de Guanajuato.
    297M MXN in state infrastructure contracts 2003-2014, systematic sole-bidder pattern.

Cases skipped:
  - vendor 22384 CORPORATIVO SALTILLENSE: 98.7% of value from single 1.95B contract
    at SCT in 2007. Not a systemic pattern — one anomalous contract, otherwise small
    diversified vendor. Insufficient for GT labeling.
  - vendor 90457 SUPERVISION TECNICA DEL NORTE: diversified vehicle leasing across
    many institutions (IMP, ports, IMT, state). No clear institutional capture.
    50.8% SB but spread across 14+ institutions over 13 years.

Run from backend/ directory: python scripts/_aria_cases_batch_H.py
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def get_max_case_id(conn):
    row = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()
    return row[0] if row[0] else 0


def main():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = get_max_case_id(conn)
    print(f"Current max GT case ID: {max_id}")

    if max_id < 751:
        print(f"ERROR: Expected max_id >= 751, got {max_id}")
        conn.close()
        sys.exit(1)

    # Chain from current max
    case_752 = max_id + 1
    case_753 = max_id + 2

    try:
        conn.execute("BEGIN")

        # ---- Case 752: HIDROVIAS Y CARRETERAS — dredging single-bid capture ----
        conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
             source_news, year_start, year_end, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)""", (
            case_752,
            f"CASE-{case_752}",
            "HIDROVIAS Y CARRETERAS dredging single-bid capture",
            "single_bid_capture",
            "medium",
            266_500_000,
            "ARIA T3 investigation — systematic 100% single-bid pattern",
            2010, 2020,
            "Dredging/canal company winning 100% of competitive tenders as sole bidder "
            "across CONAPESCA (5 contracts, 125M), CONAGUA, Tamaulipas, and Puebla state. "
            "8 contracts totaling 266M MXN. Zero direct awards — all formally competitive "
            "but with zero competition. Consistent with specification tailoring to exclude "
            "competitors in niche dredging market."
        ))

        conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)""", (
            case_752, 89737,
            "HIDROVIAS Y CARRETERAS SA DE CV",
            "medium",
            "aria_queue"
        ))

        print(f"  Inserted case {case_752}: HIDROVIAS Y CARRETERAS SB capture")

        # ---- Case 753: CONSTRUMAQUINAS DEL BAJIO — Guanajuato construction SB capture ----
        conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
             source_news, year_start, year_end, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)""", (
            case_753,
            f"CASE-{case_753}",
            "CONSTRUMAQUINAS DEL BAJIO Guanajuato construction SB capture",
            "single_bid_capture",
            "medium",
            297_200_000,
            "ARIA T3 investigation — state-level construction monopoly via single-bid",
            2003, 2014,
            "Construction company with 89.5% single-bid rate concentrated in Guanajuato state. "
            "10 contracts at Secretaria de Obra Publica de Guanajuato (201M, 68% of total value) "
            "ALL single-bid. Also single-bid at Universidad de Guanajuato (46M) and INIFEG (19M). "
            "19 contracts totaling 297M MXN. Largest single contract 86.8M (risk=0.747). "
            "Classic state-level capture pattern: one company dominates competitive tenders "
            "across multiple Guanajuato agencies 2003-2014."
        ))

        conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)""", (
            case_753, 12221,
            "CONSTRUMAQUINAS DEL BAJIO S.A DE C.V.",
            "medium",
            "aria_queue"
        ))

        print(f"  Inserted case {case_753}: CONSTRUMAQUINAS DEL BAJIO SB capture")

        # ---- Update aria_queue for added vendors ----
        for vid in [89737, 12221]:
            conn.execute(
                "UPDATE aria_queue SET in_ground_truth = 1 WHERE vendor_id = ?",
                (vid,)
            )
        print("  Updated aria_queue.in_ground_truth for vendors 89737, 12221")

        conn.execute("COMMIT")

        # ---- Verify ----
        total = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        vendors_total = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
        print(f"\nGT totals: {total} cases, {vendors_total} vendors")

        for vid in [89737, 12221]:
            row = conn.execute(
                "SELECT in_ground_truth FROM aria_queue WHERE vendor_id=?", (vid,)
            ).fetchone()
            print(f"  vendor {vid}: in_ground_truth = {row[0]}")

    except Exception as e:
        conn.execute("ROLLBACK")
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

    print("\nSkipped vendors (not added to GT):")
    print("  22384 CORPORATIVO SALTILLENSE — single anomalous 1.95B contract, no systemic pattern")
    print("  90457 SUPERVISION TECNICA DEL NORTE — diversified vehicle leasing, no capture pattern")


if __name__ == "__main__":
    main()
