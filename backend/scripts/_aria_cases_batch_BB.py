#!/usr/bin/env python3
"""
GT Batch BB — ARIA T3 investigation (3 vendors)

Investigated 2026-03-20 by Ground Truth Analyst agent.

ADDED (1 case):
  - RYSE MEDICA (v101650): IMSS medical supplies/cardiac surgery DA saturation
    613 contracts, 3.28B MXN, 76.4% DA at IMSS (88% of value)
    13 years of sustained 70-95% DA at a single institution = institutional capture
    Confidence: medium (cardiac surgery specialization partially explains DA, but
    the scale and persistence of concentration are consistent with capture)

SKIPPED (2 vendors):
  - v85049 CONSULTORES ASOCIADOS EN PROTECCION PRIVADA EMPRESARIAL SA DE CV
    SKIP: Only 7 contracts over 15 years. Airport security supervision at AICM.
    Long-term specialized service relationship, not capture. Below minimum
    contract count for meaningful GT case.

  - v18012 AYESA MEXICO SA DE CV
    SKIP: International Spanish engineering firm (Ayesa Group, founded 1966).
    88% single-bid rate reflects specialized infrastructure supervision niche
    (water, rail), not fraud. Won competitive tenders where no one else bid.
    Legitimate market specialization.
"""

import sys
import sqlite3
import os

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 806:
        print(f"ERROR: unexpected max_id={max_id}, expected >= 806. Aborting.")
        conn.close()
        return

    print(f"Current max ground_truth_cases id: {max_id}")

    # ── Case 1: RYSE MEDICA — IMSS medical supplies/cardiac surgery DA saturation ──
    case1_id = max_id + 1
    vendor1_id = 101650

    print(f"\n[Case {case1_id}] RYSE MEDICA — IMSS DA saturation (medical supplies + cardiac surgery)")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        case1_id,
        f"CASE-{case1_id}",
        "RYSE MEDICA — IMSS medical supplies and cardiac surgery DA saturation",
        "institutional_capture",
        2013,  # first contract
        2025,  # latest contract
        "medium",
        2_880_000_000,  # 2.88B at IMSS
        "ARIA T3 investigation — IPS 0.520, IMSS concentration 88% of 3.28B MXN",
        "613 contracts, 3.28B MXN total. 420 contracts at IMSS worth 2.88B (88% of value). "
        "DA rate at IMSS: 76.4% sustained over 13 years (2013-2025), peaking at 94% in 2021. "
        "Provides consolidated medicines (77 keys), medical consumables (230 keys), and "
        "cardiac surgery services. Cardiac surgery specialization partially explains DA "
        "(limited provider pool), but the scale and persistence of concentration across "
        "ALL product lines at a single institution are consistent with institutional capture. "
        "Also serves SEDENA, Cardiologia, Pediatria at lower DA rates."
    ))

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
    """, (
        case1_id,
        vendor1_id,
        "RYSE MEDICA",
        "medium",
        "aria_queue_t3"
    ))

    # Scope contracts: all IMSS contracts 2013-2025 (the capture institution)
    contract_rows = conn.execute("""
        SELECT c.id FROM contracts c
        LEFT JOIN institutions i ON c.institution_id = i.id
        WHERE c.vendor_id = ?
          AND c.contract_year BETWEEN 2013 AND 2025
          AND (i.name LIKE '%SEGURO SOCIAL%'
               OR i.name LIKE '%SERVICIOS DE SALUD DEL INSTITUTO MEXICANO%')
    """, (vendor1_id,)).fetchall()

    inserted_contracts = 0
    for (cid,) in contract_rows:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
            VALUES (?, ?)
        """, (case1_id, cid))
        inserted_contracts += 1

    print(f"  Inserted case {case1_id}, vendor {vendor1_id}, {inserted_contracts} contracts")

    # ARIA update — confirmed
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth = 1, review_status = 'confirmed'
        WHERE vendor_id = ?
    """, (vendor1_id,))

    # ── SKIP: v85049 CONSULTORES ASOCIADOS EN PROTECCION PRIVADA ──
    print(f"\n[SKIP] v85049 CONSULTORES ASOCIADOS EN PROTECCION PRIVADA EMPRESARIAL")
    conn.execute("""
        UPDATE aria_queue
        SET review_status = 'reviewed',
            reviewer_notes = 'SKIP: Only 7 contracts over 15 years. Airport security supervision at AICM (1.74B). Long-term specialized service relationship spanning multiple administrations, not institutional capture. Below minimum contract threshold for GT case.'
        WHERE vendor_id = 85049
    """)

    # ── SKIP: v18012 AYESA MEXICO SA DE CV ──
    print(f"\n[SKIP] v18012 AYESA MEXICO SA DE CV")
    conn.execute("""
        UPDATE aria_queue
        SET review_status = 'reviewed',
            reviewer_notes = 'SKIP: International Spanish engineering firm (Ayesa Group). 88% single-bid rate reflects specialized infrastructure supervision niche (water infrastructure, rail projects), not fraud. Won competitive tenders where no other firm bid. 24 contracts across multiple institutions (CONAGUA, ARTF, BANOBRAS). Legitimate market specialization.'
        WHERE vendor_id = 18012
    """)

    conn.commit()
    conn.close()

    print("\n--- Summary ---")
    print(f"  Added:   1 case (id {case1_id}), 1 vendor, {inserted_contracts} contracts")
    print(f"  Skipped: 2 vendors (v85049, v18012) — marked as reviewed in aria_queue")
    print("  Done.")


if __name__ == "__main__":
    main()
