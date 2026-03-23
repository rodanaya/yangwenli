#!/usr/bin/env python3
"""
GT Mining Batch FFF1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v12415   MANUFACTURERA METALICA ARGOS    SKIP (CNSNS nuclear structural monopoly, 96% at 1 specialized inst)
  v278969  ROLLIMP SERVICIOS SA DE CV      SKIP (dispersed new vendor 2022-2024, military bank+FGR+arts)
  v64778   LEVIC SA DE CV                  ADD  (IMSS institutional capture, 81% conc, 77.8% DA at IMSS)
  v94393   ADVANZER DE MEXICO SA DE CV     SKIP (single 439M BANOBRAS contract, no systematic capture)
  v682     COMPANIA MEXICANA DE AVIACION   SKIP (defunct national airline, structural SB on routes)
  v2452    TSI ARYL S DE RL DE CV          SKIP (dispersed regional vendor, 301 ctrs 22 years)

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
    if max_id is None or max_id < 912:
        print(f"ERROR: max_id={max_id}, expected >= 912. Aborting.")
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

    # LEVIC SA DE CV - IMSS institutional capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "LEVIC IMSS Institutional Capture",
        "institutional_capture", 2010, 2023, "medium", 264_000_000,
        "ARIA T3 queue pattern analysis",
        "LEVIC SA DE CV (v64778): 89 contracts, 326M total, 81.0% concentrated at IMSS "
        "(264M). 77.8% direct award rate at IMSS on 18 contracts. Additional presence at "
        "INSABI/Bienestar and PEMEX. Health sector supplier with strong IMSS dependency and "
        "high DA rate spanning 2010-2023. Includes 225M competitive contract in 2020.",
    ))
    conn.execute(sql_vendor, (
        c1, 64778, "LEVIC SA DE CV",
        "primary", "medium", "aria_queue_t3", 0.85,
        "IMSS 81% concentration, 77.8% DA at top institution",
    ))

    # Link contracts for LEVIC at IMSS (2010-2023)
    rows = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
        (64778, 2010, 2023),
    ).fetchall()
    for (cid,) in rows:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
            (c1, cid),
        )
    print(f"  Case {c1} (v64778 LEVIC): linked {len(rows)} contracts (2010-2023)")

    # Update aria_queue for ADD
    conn.execute(
        "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
        (64778,),
    )

    # Mark SKIPs
    skips = [
        (12415, "CNSNS nuclear structural monopoly - specialized nuclear safety equipment supplier"),
        (278969, "Dispersed new vendor 2022-2024 - military bank, FGR, arts institutions"),
        (94393, "Single large BANOBRAS IT contract 2014 - not systematic capture pattern"),
        (682, "Compania Mexicana de Aviacion - defunct national airline, structural SB on routes"),
        (2452, "Dispersed regional vendor (Sonora), 301 contracts over 22 years, no capture"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP - {reason[:60]}")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 1 case ({c1}), skipped 5 vendors.")


if __name__ == "__main__":
    main()
