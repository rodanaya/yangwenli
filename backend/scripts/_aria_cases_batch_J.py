#!/usr/bin/env python3
"""
Ground Truth Batch J -- ARIA T3 vendor investigations (Mar 20, 2026)

Investigated 4 vendors from ARIA queue T3 + 2 pre-skipped:

  ADD:
    Case max+1: SOLUCIONES INTEGRALES AMR -- INR institutional capture (100% DA, $245M)

  SKIP:
    vendor_id=303885 ALBAQUI -- low DA (33%), mostly I3P competitive
    vendor_id=159294 TODO PARA LA SALUD MARK -- big ISSSTE contracts are LP wins
    vendor_id=61763  COMBUSTIBLES MAR DE CORTES -- regional fuel geographic monopoly
    vendor_id=22384  CORPORATIVO SALTILLENSE -- single anomalous contract (pre-skip)
    vendor_id=90457  SUPERVISION TECNICA DEL NORTE -- diversified leasing (pre-skip)

Run: cd backend && python scripts/_aria_cases_batch_J.py
"""

import sys
import os
import sqlite3

DB = os.environ.get(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db"),
)


def get_max_case_id(conn):
    return conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")
    cur = conn.cursor()

    try:
        max_id = get_max_case_id(conn)
        print(f"Current max GT case ID: {max_id}")
        if max_id < 757:
            print(f"ERROR: expected max_id >= 757, got {max_id}. Aborting.")
            sys.exit(1)

        cur.execute("BEGIN")

        case_id = max_id + 1
        notes = (
            "IT/services company with 83% of total value ($245M) concentrated at "
            "Instituto Nacional de Rehabilitacion via 100% direct award (9 contracts). "
            "Escalating pattern: $12M (2016), $44M (2017), $94M (2021), $94M (2024). "
            "Vendor competes at other institutions (LP at ISSSTE, Pronosticos) but "
            "exclusively uses DA at INR -- consistent with institutional capture. "
            "Generic Soluciones Integrales name common in intermediary patterns. "
            "Avg risk score 0.417 at INR vs 0.171 elsewhere."
        )
        source = "ARIA investigation -- 100% DA concentration at single rehabilitation hospital"
        cur.execute(
            """INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
             source_news, year_start, year_end, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                case_id,
                f"CASE-{case_id}",
                "SOLUCIONES INTEGRALES AMR -- INR Direct Award Capture",
                "institutional_capture",
                "medium",
                245_000_000,
                source,
                2016,
                2024,
                notes,
            ),
        )
        cur.execute(
            """INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)""",
            (
                case_id,
                13018,
                "SOLUCIONES INTEGRALES AMR, S.A. DE C.V.",
                "medium",
                "aria_queue",
            ),
        )
        inr_contracts = cur.execute(
            "SELECT c.id FROM contracts c "
            "LEFT JOIN institutions i ON c.institution_id = i.id "
            "WHERE c.vendor_id = 13018 "
            "  AND c.contract_year BETWEEN 2016 AND 2024 "
            "  AND i.name LIKE '%Rehabilitaci%'"
        ).fetchall()
        for (cid,) in inr_contracts:
            cur.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts "
                "(case_id, contract_id) VALUES (?,?)",
                (case_id, cid),
            )
        n_tagged = len(inr_contracts)
        print(f"  Case {case_id}: SOLUCIONES INTEGRALES AMR -- INR DA capture ({n_tagged} contracts tagged)")

        cur.execute(
            "UPDATE aria_queue SET in_ground_truth = 1 WHERE vendor_id = ?",
            (13018,),
        )

        skip_notes = {
            303885: (
                "SKIP: low DA rate (33%), $530M Guardia Nacional won via LP, "
                "IMSS DA portion only $202M across 7 contracts, mostly "
                "Invitacion a 3 Personas (competitive). Founded 2015. "
                "No institutional capture pattern."
            ),
            159294: (
                "SKIP: largest contracts ($151M ISSSTE) won via LP, not DA. "
                "74% DA overall but driven by small orders at "
                "Neurologia/Perinatologia. One-year spike in 2021. "
                "No sustained institutional capture."
            ),
            61763: (
                "SKIP: regional fuel distributor for Exportadora de Sal "
                "(Guerrero Negro, BCS). 99% of $1.46B at ESSA via LP. "
                "Single-bid reflects geographic monopoly in remote area, "
                "not procurement fraud."
            ),
        }
        for vid, note in skip_notes.items():
            cur.execute(
                "UPDATE aria_queue SET review_status = 'reviewed', "
                "reviewer_notes = ? WHERE vendor_id = ?",
                (note, vid),
            )

        pre_skips = {
            22384: (
                "SKIP: single anomalous 1.95B MXN contract, no systemic "
                "pattern. Investigated in prior session."
            ),
            90457: (
                "SKIP: diversified vehicle leasing across multiple "
                "institutions, no capture pattern. Investigated in prior session."
            ),
        }
        for vid, note in pre_skips.items():
            cur.execute(
                "UPDATE aria_queue SET review_status = 'reviewed', "
                "reviewer_notes = ? WHERE vendor_id = ?",
                (note, vid),
            )

        conn.commit()

        cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        vendors = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
        print()  # blank line
        msg = "Ground truth: {} cases, {} vendors".format(cases, vendors)
        print(msg)
        print()
        print("ADDED:")
        print(f"  Case {case_id}: SOLUCIONES INTEGRALES AMR -- INR DA capture (vendor 13018, $245M)")
        print()
        print("SKIPPED:")
        print("  vendor 303885: ALBAQUI -- low DA, competitive I3P procedures")
        print("  vendor 159294: TODO PARA LA SALUD MARK -- big contracts won via LP")
        print("  vendor 61763:  COMBUSTIBLES MAR DE CORTES -- regional fuel geographic monopoly")
        print("  vendor 22384:  CORPORATIVO SALTILLENSE -- single anomalous contract (pre-skip)")
        print("  vendor 90457:  SUPERVISION TECNICA DEL NORTE -- diversified leasing (pre-skip)")
        print()
        print(f"Total new estimated fraud: $245M MXN")

    except Exception as e:
        conn.rollback()
        print(f"ERROR -- rolled back: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
