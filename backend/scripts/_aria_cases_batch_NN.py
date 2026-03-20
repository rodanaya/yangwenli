# -*- coding: utf-8 -*-
"""Batch NN: Santa Rosa Segalmex dup, JBE IMSS, ABEQU SB, Barquin Veracruz Duarte."""
# Guard: max_id >= 834
import sqlite3
import sys

DB = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id < 834:
        print(f"ABORT: max_id={max_id}, expected >= 834")
        sys.exit(1)

    print(f"Current max GT case id: {max_id}")

    # V291668 SANTA ROSA -> Segalmex case 5
    print("V291668: Adding to Segalmex case 5")

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, role, evidence_strength, match_method, match_confidence, notes) "
        "VALUES (5, 291668, 'ALMACENES Y SERVICIOS SANTA ROSA SA DE CV', 'secondary', 'high', 'name_match', 1.0, "
        "'Same entity as V287011. RFC ASS040209GR3. Segalmex corn logistics 2023-2024.')"
    )

    cids = conn.execute("SELECT id FROM contracts WHERE vendor_id = 291668").fetchall()
    for (cid,) in cids:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)", ('CASE-5', cid))
    print(f"  Added {len(cids)} contracts to CASE-5")

    conn.execute(
        "UPDATE aria_queue SET in_ground_truth = 1, review_status = 'confirmed', "
        "reviewer_notes = 'Dup of V287011 in Segalmex case 5' WHERE vendor_id = 291668"
    )

    c1 = max_id + 1
    print(f"Case {c1}: V128330 CONSTRUCTORA JBE")

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, year_start, year_end, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c1, f'CASE-{c1}',
         'Constructora JBE - IMSS 313M Single-Bid Construction Capture (2016)',
         'institutional_capture', 'medium', 313500000, 2016, 2016,
         '313.5M single-bid IMSS construction via Invitacion a 3 Personas with only 1 bidder.')
    )

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, role, evidence_strength, match_method, match_confidence, notes) "
        "VALUES (?, 128330, 'CONSTRUCTORA JBE SA DE CV', 'primary', 'medium', 'vendor_id_direct', 1.0, "
        "'No RFC. 313M single-bid IMSS construction 2016.')", (c1,)
    )

    cids = conn.execute("SELECT id FROM contracts WHERE vendor_id = 128330").fetchall()
    for (cid,) in cids:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)", (f'CASE-{c1}', cid))
    print(f"  Added {len(cids)} contracts")
    conn.execute("UPDATE aria_queue SET in_ground_truth = 1, review_status = 'confirmed' WHERE vendor_id = 128330")

    c2 = max_id + 2
    print(f"Case {c2}: V190801 ABEQU")

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, year_start, year_end, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c2, f'CASE-{c2}',
         'ABEQU - Multi-State Construction 495M 100pct Single-Bid (2016-2019)',
         'intermediary', 'medium', 495000000, 2016, 2019,
         '5 contracts across 5 institutions in 4 states. 100pct SB. 407M BC-Infra, 69.5M ISSSTE.')
    )

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, role, evidence_strength, match_method, match_confidence, notes) "
        "VALUES (?, 190801, 'ABEQU SA DE CV', 'primary', 'medium', 'vendor_id_direct', 1.0, "
        "'No RFC. 100pct SB across 5 institutions in 4 states.')", (c2,)
    )

    cids = conn.execute("SELECT id FROM contracts WHERE vendor_id = 190801").fetchall()
    for (cid,) in cids:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)", (f'CASE-{c2}', cid))
    print(f"  Added {len(cids)} contracts")
    conn.execute("UPDATE aria_queue SET in_ground_truth = 1, review_status = 'confirmed' WHERE vendor_id = 190801")

    c3 = max_id + 3
    print(f"Case {c3}: V47792 BARQUIN Veracruz Duarte")

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, year_start, year_end, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c3, f'CASE-{c3}',
         'Inmobiliaria Barquin - Veracruz Duarte-Era Infrastructure 255M 100pct SB (2010-2013)',
         'institutional_capture', 'high', 255000000, 2010, 2013,
         '15 contracts at Veracruz state agencies Duarte era. 100pct SB. Duarte convicted 2018.')
    )

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, role, evidence_strength, match_method, match_confidence, notes) "
        "VALUES (?, 47792, 'INMOBILIARIA Y CONSTRUCTORA BARQUIN SA DE CV', 'primary', 'high', 'vendor_id_direct', 1.0, "
        "'No RFC. 15 contracts 100pct SB at Veracruz state Duarte era 2010-2013.')", (c3,)
    )

    cids = conn.execute("SELECT id FROM contracts WHERE vendor_id = 47792").fetchall()
    for (cid,) in cids:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)", (f'CASE-{c3}', cid))
    print(f"  Added {len(cids)} contracts")
    conn.execute("UPDATE aria_queue SET in_ground_truth = 1, review_status = 'confirmed' WHERE vendor_id = 47792")

    conn.commit()
    print("=== COMMITTED ===")

    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    print(f"New max GT case id: {new_max} (was {max_id}, added {new_max - max_id} cases)")
    print(f"Total GT vendors: {total_v}")

    for vid in [291668, 128330, 190801, 47792]:
        r = conn.execute("SELECT in_ground_truth, review_status FROM aria_queue WHERE vendor_id=?", (vid,)).fetchone()
        print(f"  V{vid}: in_ground_truth={r[0]}, review_status={r[1]}")

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
