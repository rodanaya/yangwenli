#!/usr/bin/env python3
"""
GT Mining Batch HHH1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v250787  FINANCIERA PARA EL BIENESTAR   SKIP (govt bank inter-institutional services, dispersed)
  v16066   AUTOKAM REGIOMONTANA SA DE CV  SKIP (dispersed auto dealer, NL-based, no capture)
  v664     CONTINENTAL AUTOMOTRIZ SA DE CV SKIP (dispersed automotive dealer, state health vehicles)
  v60173   CONSTRUMAQ SA DE CV            ADD  (Jalisco state SB capture, 100% SB, 83% at Jalisco)
  v5682    PUNTO EUROPEO SA DE CV         SKIP (dispersed IT/office equipment, 397 ctrs 23 yrs)
  v9406    JASEV COMPUTACION SA DE CV     SKIP (BANJERCITO IT 60% conc but legitimate banking system)

Cases added: 1  |  Vendors skipped: 5
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 917:
        print(f"ERROR: max_id={max_id}, expected >= 917. Aborting.")
        conn.close()
        return

    c1 = max_id + 1

    print(f"Max GT case id: {max_id}")
    print(f"Inserting case {c1}")

    sql_case = (
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, year_start, year_end, "
        "confidence_level, estimated_fraud_mxn, source_news, notes) "
        "VALUES (?,?,?,?,?,?,?,?,?,?)"
    )
    sql_vendor = (
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, role, evidence_strength, "
        "match_method, match_confidence, notes) VALUES (?,?,?,?,?,?,?,?)"
    )

    # CONSTRUMAQ - Jalisco construction SB capture (companion to BREYSA case 915)
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Jalisco State Construction Single-Bid Capture - Construmaq",
        "single_bid_capture", 2010, 2021, "high", 927_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUMAQ SA DE CV (v60173): 31 contracts, 1112M total (2010-2021). "
        "100% single-bid rate. Dominantly Jalisco state: Gobierno del Estado de Jalisco "
        "529M (2019) + JAL-Secretaria de Infraestructura 205M (2018) + 101M (2015) + "
        "91M (2014) = 927M (83% at Jalisco institutions). "
        "Second major Jalisco construction SB capture firm alongside BREYSA (case 915). "
        "31 uncontested competitive tenders spanning 11 years at Jalisco state agencies.",
    ))
    conn.execute(sql_vendor, (
        c1, 60173, "CONSTRUMAQ SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "Jalisco 83% concentration, 100% SB rate, 31 contracts 2010-2021",
    ))

    # Link contracts
    rows = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
        (60173, 2010, 2021),
    ).fetchall()
    for (cid,) in rows:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
            (c1, cid),
        )
    print(f"  Case {c1} (v60173 CONSTRUMAQ): linked {len(rows)} contracts (2010-2021)")

    conn.execute(
        "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
        (60173,),
    )

    # SKIPs
    skips = [
        (250787, "Government-owned bank (Financiera Bienestar), inter-institutional financial services, dispersed institutions"),
        (16066, "Dispersed automotive dealer (Autokam Regiomontana, NL), 42 contracts across many institutions"),
        (664, "Dispersed automotive dealer (Continental Automotriz), state health vehicle supplier, 83 ctrs 24 yrs"),
        (5682, "Dispersed IT/office equipment supplier (Punto Europeo), 397 contracts over 23 years"),
        (9406, "BANJERCITO IT contractor (Jasev Computacion) - 60% at military bank but legitimate specialized banking IT"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 1 case ({c1}), skipped 5 vendors.")


if __name__ == "__main__":
    main()
