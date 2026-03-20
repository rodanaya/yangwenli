"""
Batch WW: GT cases from ARIA T3 queue investigation (Mar 20, 2026)

Vendors investigated:
  v226303 SOLUCIONES SALUDABLES MTY  -> IMSS capture, 861M, 99.6% DA, 2018-2024
  v148876 COMERCIALIZADORA LINI      -> IMSS capture ring, 978M, 92% DA IMSS + competitive SEDENA
  v103293 AIDYCSA                    -> PGR 395M direct award anomaly
  v208520 CONSORCIO EMPRESARIAL INTERTAMPS -> 226M DA to parastatals
"""
import sqlite3
import sys

DB = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id < 857:
        print(f"ABORT: max_id={max_id}, expected >= 857")
        sys.exit(1)

    c0 = max_id + 1
    c1 = max_id + 2
    c2 = max_id + 3
    c3 = max_id + 4

    print(f"Max GT case id: {max_id}")
    print(f"Will insert cases {c0}-{c3}")

    sql_case = (
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, "
        "year_start, year_end, notes) VALUES (?,?,?,?,?,?,?,?,?)"
    )

    conn.execute(sql_case, (
        c0, f"CASE-{c0}",
        "Soluciones Saludables MTY - IMSS Institutional Capture",
        "institutional_capture", "medium", 860000000,
        2018, 2024,
        "280 contracts exclusively at IMSS, 99.6% direct award (279/280). "
        "Concentrated in 2022-2024 (271 contracts, 850M MXN). "
        "Single competitive contract worth 1.2M. Classic P6 capture pattern."
    ))

    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Comercializadora LINI - IMSS Capture Ring Pattern",
        "institutional_capture", "medium", 830000000,
        2015, 2025,
        "4509 contracts at IMSS with 92.5% DA rate (830M MXN). "
        "Simultaneously wins competitive bids at SEDENA. "
        "Classic IMSS ring pattern: high DA capture at IMSS while competing legitimately elsewhere. "
        "DA rate increased from 76% (2019) to 97% (2023-2024), suggesting deepening capture."
    ))

    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "AIDYCSA - PGR Anomalous Direct Award",
        "direct_award_abuse", "medium", 395000000,
        2015, 2016,
        "12 total contracts but 99.96% of value (394.8M) from a single PGR direct award in 2016. "
        "Prior history: only 75K in tiny IMSS/SAT contracts in 2013. "
        "A vendor with minimal track record receiving a 395M direct award from PGR "
        "is consistent with shell company or front company pattern (P3 intermediary)."
    ))

    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Consorcio Empresarial Intertamps - Parastatal Direct Awards",
        "direct_award_abuse", "medium", 226000000,
        2017, 2018,
        "4 contracts, 226M MXN, 100% direct award. "
        "172M to Impresora y Encuadernadora Progreso (government parastatal linked to "
        "Estafa Maestra irregularities) and 50M to Diconsa. "
        "Brief 2017-2018 activity window then disappears. "
        "Pattern consistent with intermediary used for parastatal fund diversion."
    ))

    sql_vendor = (
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, role, evidence_strength, "
        "match_method, match_confidence, notes) VALUES (?,?,?,?,?,?,?,?)"
    )

    conn.execute(sql_vendor, (
        c0, 226303, "SOLUCIONES SALUDABLES MTY, S. DE R.L. DE C.V.",
        "primary", "medium", "aria_queue", 0.9,
        "IMSS-exclusive vendor, 99.6% DA rate, P6 capture pattern"
    ))

    conn.execute(sql_vendor, (
        c1, 148876, "COMERCIALIZADORA LINI SA DE CV",
        "primary", "medium", "aria_queue", 0.9,
        "IMSS ring pattern: 92.5% DA at IMSS, competitive at SEDENA"
    ))

    conn.execute(sql_vendor, (
        c2, 103293, "AIDYCSA SA DE CV",
        "primary", "medium", "aria_queue", 0.9,
        "75K vendor that received 395M PGR direct award. P3 intermediary pattern."
    ))

    conn.execute(sql_vendor, (
        c3, 208520, "CONSORCIO EMPRESARIAL INTERTAMPS S DE RL DE CV",
        "primary", "medium", "aria_queue", 0.9,
        "226M in DA to Estafa Maestra-linked parastatal + Diconsa. Brief 2017-2018 window."
    ))

    # ARIA queue updates
    vendor_ids = [226303, 148876, 103293, 208520]
    for vid in vendor_ids:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth = 1, review_status = 'reviewed', "
            "reviewer_notes = 'Batch WW - GT case added (Mar 20 2026)' "
            "WHERE vendor_id = ?",
            (vid,)
        )

    conn.commit()

    # Verification
    print()
    print("--- Verification ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"New max GT case id: {new_max}")

    for case_id in [c0, c1, c2, c3]:
        r = conn.execute(
            "SELECT id, case_name, case_type, confidence_level "
            "FROM ground_truth_cases WHERE id=?",
            (case_id,)
        ).fetchone()
        if r:
            print(f"  Case {r[0]}: {r[1]} [{r[2]}, {r[3]}]")
        else:
            print(f"  Case {case_id}: NOT FOUND!")

    vc = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id IN (?,?,?,?)",
        (c0, c1, c2, c3)
    ).fetchone()[0]
    print(f"Vendors inserted: {vc}")

    for vid in vendor_ids:
        r = conn.execute(
            "SELECT in_ground_truth, review_status FROM aria_queue WHERE vendor_id=?",
            (vid,)
        ).fetchone()
        gt_val = r[0] if r else "N/A"
        st_val = r[1] if r else "N/A"
        print(f"  v{vid}: in_gt={gt_val}, status={st_val}")

    total_cases = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    print(f"GT totals: {total_cases} cases, {total_vendors} vendors")

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
