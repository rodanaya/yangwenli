#!/usr/bin/env python3
"""
GT Mining Batch LLL1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v91742   SUMINISTROS MEDICOS DE MEXICO   ADD  (HGM+IMSS dual capture, 92% combined health, 79-82% DA at IMSS)
  v45778   EL UNIVERSAL COMPANIA PERIOD.   SKIP (major newspaper, govt advertising contracts, structural)
  v173011  MCD SERVICIOS DIAGNOSTICOS      SKIP (dispersed SS+SEDENA+ISSSTE, no dominant institution)
  v648     AGENCIA DE VIAJES CARMEN        SKIP (travel agency for govt, IMSS 44% but low DA/SB)
  v4902    PASTEURIZADORA AGUASCALIENTES   SKIP (state milk/dairy program, structural food supply)
  v26060   PETRO SERVICIOS DE TULA         SKIP (fuel distribution, SENASICA 76% for vehicle fuel)

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
    if max_id is None or max_id < 929:
        print(f"ERROR: max_id={max_id}, expected >= 929. Aborting.")
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

    # SUMINISTROS MEDICOS - Hospital General de Mexico + IMSS dual capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Hospital General de Mexico and IMSS Medical Supply Capture - Suministros Medicos",
        "institutional_capture", 2010, 2025, "high", 672_000_000,
        "ARIA T3 queue pattern analysis",
        "SUMINISTROS MEDICOS DE MEXICO SA DE CV (v91742): 280 contracts, 945M (2010-2025). "
        "Hospital General de Mexico: 6 contracts, 479M (51%), 50% DA. "
        "IMSS: 198 contracts, 229M (24%), 79.3% DA. "
        "IMSS delegaciones: 23 contracts, 164M (17%), 82.6% DA. "
        "Combined Hospital General + IMSS = 872M (92.3% of total). "
        "Medical supply company with systematic high-DA access to federal hospitals. "
        "Very high DA rates at IMSS (79-82%) across 221 contracts. "
        "Dual institutional capture combining HGM (few large contracts) + IMSS (many DA contracts).",
    ))
    conn.execute(sql_vendor, (
        c1, 91742, "SUMINISTROS MEDICOS DE MEXICO SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "HGM 51% + IMSS 41% = 92% combined, 79-82% DA at IMSS, 280 contracts",
    ))

    rows = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
        (91742, 2010, 2025),
    ).fetchall()
    for (cid,) in rows:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
            (c1, cid),
        )
    print(f"  Case {c1} (v91742): linked {len(rows)} contracts (2010-2025)")

    conn.execute(
        "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
        (91742,),
    )

    skips = [
        (45778, "El Universal major newspaper - govt advertising/media spending, structural and not procurement fraud"),
        (173011, "Dispersed medical diagnostics (MCD Servicios) - SS 40% + SEDENA 29% + ISSSTE 20%, no capture"),
        (648, "Travel agency (Carmen) - IMSS 44% for travel services, structural govt travel contract"),
        (4902, "Pasteurizadora Aguascalientes - state milk program (DIF), structural food supply"),
        (26060, "Petro Servicios de Tula - fuel distribution to SENASICA (vehicles), structural fuel supply"),
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
