"""
Ground Truth Batch YY: Cases 862-864
ARIA T3 investigation -- voucher, IMSS medical, overpriced intermediary

v203996 OPERADORA VALES -- ISSSTE voucher ecosystem SB 2017
v148992 VITER MEDICAL -- IMSS medical supply concentration 2019-2023
v188125 IMEHI DE MEXICO -- Salvador Zubiran overpriced Inv3 2018
v47004  CONDUMEX -- SKIP: Grupo Carso, legitimate CFE supplier

Run: cd backend && python scripts/_aria_cases_batch_YY.py
"""

import sqlite3
import sys
import os

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    cur = conn.cursor()

    cur.execute("SELECT MAX(id) FROM ground_truth_cases")
    max_id = cur.fetchone()[0] or 0
    if max_id < 857:
        print(f"ERROR: max GT case ID is {max_id}, expected >= 857. Aborting.")
        sys.exit(1)

    c0 = max_id + 1
    c1 = c0 + 1
    c2 = c1 + 1

    print(f"Inserting cases {c0}-{c2} (3 GT cases, 3 vendors) + 1 structural skip")

    # Case c0: OPERADORA VALES -- ISSSTE voucher ecosystem
    c0_notes = (
        "1.08B single-bid Inv3 at ISSSTE (2017) for voucher/despensa services. "
        "Part of documented govt voucher monopoly ecosystem: Edenred 1.4B ISSSTE 2018, "
        "Si Vale 1.0B ISSSTE 2016 -- rotate contract year by year. "
        "Consistent with voucher institutional capture pattern in GT."
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (c0, f"CASE-{c0}", "Operadora Vales Despensas - ISSSTE Voucher Ecosystem SB 1.08B",
         "institutional_capture", "medium", 2017, 2017, c0_notes)
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c0, 203996, "OPERADORA Y ADMINISTRADORA DE VALES DESPENSAS Y SERVICIOS S A P I DE CV",
         "medium", "aria_queue_investigation")
    )

    # Case c1: VITER MEDICAL -- IMSS medical supply concentration
    c1_notes = (
        "618 contracts, 1.1B total, 92.4 pct value at IMSS. 328M single-bid LP at IMSS 2019. "
        "Risk scores elevated 2020-2024 (avg 0.32-0.38). Also serves ISSSTE, SEDENA "
        "via competitive procedures. Windowed to 2019-2023 peak concentration. "
        "Consistent with IMSS medical supply capture pattern."
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (c1, f"CASE-{c1}", "Viter Medical - IMSS Medical Supply Concentration 1.0B (2019-2023)",
         "institutional_capture", "medium", 2019, 2023, c1_notes)
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c1, 148992, "VITER MEDICAL, S.A. DE C.V.", "medium", "aria_queue_investigation")
    )

    # Case c2: IMEHI DE MEXICO -- Salvador Zubiran overpriced Inv3
    c2_notes = (
        "598.6M Inv3 at Instituto Nacional Salvador Zubiran (2018) for services. "
        "Average contract at Zubiran 2017-2019 is 0.95M -- this is 630x average. "
        "Company has only 2 total contracts. Appears, wins single massive contract "
        "via restricted procedure, then disappears. Classic intermediary/overpricing."
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (c2, f"CASE-{c2}", "IMEHI de Mexico - Salvador Zubiran Overpriced Inv3 598M (2018)",
         "overpricing", "medium", 2018, 2018, c2_notes)
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c2, 188125, "IMEHI DE MEXICO S DE RL DE CV", "medium", "aria_queue_investigation")
    )

    # ARIA queue updates
    for vid in [203996, 148992, 188125]:
        cur.execute(
            "UPDATE aria_queue SET in_ground_truth = 1, review_status = ?, "
            "reviewer_notes = ? WHERE vendor_id = ?",
            ("reviewed", "Batch YY GT case", vid)
        )

    # CONDUMEX structural skip (Grupo Carso)
    condumex_note = (
        "Structural skip: Grupo Carso subsidiary (corporate_group confirmed). "
        "390 contracts at CFE, 85 pct LP by count, 97 pct LP by value. "
        "Legitimate infrastructure cable/wire supplier."
    )
    cur.execute(
        "UPDATE aria_queue SET review_status = ?, reviewer_notes = ? WHERE vendor_id = ?",
        ("reviewed", condumex_note, 47004)
    )

    conn.commit()

    # Verification
    print()
    print("=== Verification ===")
    for cid in [c0, c1, c2]:
        r = cur.execute(
            "SELECT id, case_name, confidence_level, year_start, year_end "
            "FROM ground_truth_cases WHERE id=?", (cid,)
        ).fetchone()
        if r:
            print(f"  Case {r[0]}: {r[1]} [{r[2]}] {r[3]}-{r[4]}")
        else:
            print(f"  WARNING: Case {cid} NOT found!")
        vr = cur.execute(
            "SELECT vendor_id, vendor_name_source FROM ground_truth_vendors WHERE case_id=?",
            (cid,)
        ).fetchone()
        if vr:
            print(f"    -> Vendor v{vr[0]}: {vr[1]}")
        else:
            print(f"    -> WARNING: No vendor for case {cid}!")

    print()
    pairs = [(203996, "OPERADORA"), (148992, "VITER"), (188125, "IMEHI"), (47004, "CONDUMEX")]
    for vid, label in pairs:
        r = cur.execute(
            "SELECT in_ground_truth, review_status, reviewer_notes "
            "FROM aria_queue WHERE vendor_id=?", (vid,)
        ).fetchone()
        if r:
            gt_flag = "GT=1" if r[0] else "GT=0"
            ns = r[2][:60] if r[2] else "none"
            print(f"  v{vid} ({label}): {gt_flag}, status={r[1]}, notes={ns}...")
        else:
            print(f"  v{vid} ({label}): NOT in aria_queue")

    total = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_v = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    print()
    print(f"Total GT cases: {total}, Total GT vendors: {total_v}")

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
