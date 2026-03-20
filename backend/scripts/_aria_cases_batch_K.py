#!/usr/bin/env python3
"""
Ground Truth Batch K — ARIA T3 vendor investigations (Mar 20, 2026)

Investigated 4 vendors from ARIA queue T3:
  ADD:
    Case (dynamic): TONANTZI MEX — ISSSTE medical equipment capture (P6/SB)
      vendor_id=53237 | $344M MXN | 112 contracts | salud
      ISSSTE: 61 contracts, $243M (71%), 54% SB + 46% DA, sustained 2010-2025
  SKIP:
    vendor_id=171083 Negocios Renovables Inteligentes — single contract ($3.5B),
        renewable energy auction at CFE, legitimate specialized market
    vendor_id=36463  Acciona Infraestructuras Mexico — Spanish multinational,
        8 contracts across 6 institutions, specialty construction (tunnels, water)
    vendor_id=44860  Equipamiento y Consultoria Integral — diversified health
        equipment supplier across 10+ institutions, single COVID DA anomaly
        ($224M at SSa 2020) not sustained capture

Run: cd backend && python scripts/_aria_cases_batch_K.py
"""

import sqlite3
import os
import sys

DB = os.environ.get(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db"),
)


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA busy_timeout=60000")
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    try:
        # ── Guard: verify max_id matches expectations ──
        max_id = cur.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
        if max_id is None or max_id < 757:
            print(f"ERROR: Expected max case ID >= 757, got {max_id}. Aborting.")
            sys.exit(1)

        next_id = max_id + 1
        print(f"Starting from case ID {next_id} (current max: {max_id})")

        cur.execute("BEGIN")

        # ──────────────────────────────────────────────────────────────
        # Case {next_id}: TONANTZI MEX — ISSSTE medical equipment capture
        # ──────────────────────────────────────────────────────────────
        # vendor_id=53237 | IPS=0.533 | $344M MXN | 112 contracts | salud
        # Evidence:
        #   - ISSSTE concentration: 61 contracts, $243M (71% of total value)
        #   - ISSSTE SB rate: 54.1% — over half of ISSSTE contracts won as
        #     sole bidder on competitive tenders
        #   - ISSSTE DA rate: 45.9% — remainder won via direct award
        #   - Combined SB+DA at ISSSTE = 100% — never faces real competition
        #   - Also at INNN (neurology institute): 11 contracts, $56M, 54.5% SB
        #   - Sustained 16-year pattern (2010-2025) — not a brief anomaly
        #   - Wins competitive tenders (LP) across multiple ISSSTE/INNN
        #     facilities but always as sole bidder, consistent with
        #     spec-tailoring or institutional capture
        #   - In contrast, other institutions (SCT, SAT, Cineteca) show
        #     normal competitive patterns — institution-specific capture
        # Confidence: medium — clear sustained pattern, no official finding
        # Fraud period: 2010-2025 (full ISSSTE engagement window)
        case_id = next_id
        cur.execute("""INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
             source_news, year_start, year_end, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)""", (
            case_id, f"CASE-{case_id}",
            "TONANTZI MEX ISSSTE Medical Equipment Capture",
            "institutional_capture",
            "medium",
            243_000_000,
            "ARIA investigation -- P6 capture pattern at ISSSTE with sustained SB",
            2010, 2025,
            "Medical equipment company with 71% of value ($243M) at ISSSTE "
            "across 61 contracts over 16 years. 54.1% single-bid rate at ISSSTE -- "
            "wins competitive tenders as sole participant. Also at INNN: $56M, "
            "54.5% SB. Wins normally at other institutions (SCT, SAT) indicating "
            "institution-specific capture, not market monopoly."
        ))
        cur.execute("""INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)""", (
            case_id, 53237,
            "TONANTZI MEX, S.A. DE C.V.",
            "medium", "aria_queue"
        ))
        # Tag contracts at ISSSTE and INNN within fraud window
        tagged = 0
        rows = cur.execute("""
            SELECT c.id FROM contracts c
            LEFT JOIN institutions i ON c.institution_id = i.id
            WHERE c.vendor_id = 53237
              AND c.contract_year BETWEEN 2010 AND 2025
              AND (i.name LIKE '%SEGURIDAD Y SERVICIOS SOCIALES%'
                   OR i.name LIKE '%ISSSTE%'
                   OR i.name LIKE '%Neurolog%')
        """).fetchall()
        for (cid,) in rows:
            cur.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (case_id, cid),
            )
            tagged += 1
        print(f"  Case {case_id}: TONANTZI MEX -- ISSSTE capture, tagged {tagged} contracts")

        # ──────────────────────────────────────────────────────────────
        # Update aria_queue for all 4 investigated vendors
        # ──────────────────────────────────────────────────────────────

        # Mark added vendor as in_ground_truth
        cur.execute(
            "UPDATE aria_queue SET in_ground_truth = 1 WHERE vendor_id = 53237"
        )

        # Mark skipped vendors — reviewed but not GT-worthy
        cur.execute("""UPDATE aria_queue SET review_status = 'reviewed',
            reviewer_notes = 'SKIP: Single contract ($3.5B) at CFE in 2015, renewable energy LP auction -- legitimate specialized market with few bidders, not capture'
            WHERE vendor_id = 171083""")

        cur.execute("""UPDATE aria_queue SET review_status = 'reviewed',
            reviewer_notes = 'SKIP: Spanish multinational (Acciona), 8 contracts across 6 institutions (CONAGUA, IMSS, CAPUFE, Campeche state, SCT), specialty construction (water, tunnels, hospitals) -- 100pct SB reflects specialized capability, not capture'
            WHERE vendor_id = 36463""")

        cur.execute("""UPDATE aria_queue SET review_status = 'reviewed',
            reviewer_notes = 'SKIP: Diversified health equipment supplier across 10+ institutions (IMSS, ISSSTE, INP, PEMEX, state health), single $224M COVID DA at SSa (2020) is anomaly but no sustained capture pattern -- 13-year track record with competitive wins'
            WHERE vendor_id = 44860""")

        conn.commit()

        # ──────────────────────────────────────────────────────────────
        # Report
        # ──────────────────────────────────────────────────────────────
        cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        vendors = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
        print(f"\nGround truth: {cases} cases, {vendors} vendors")
        print()
        print("ADDED:")
        print(f"  Case {case_id}: TONANTZI MEX -- ISSSTE medical equipment capture (vendor 53237, $243M)")
        print()
        print("SKIPPED:")
        print("  vendor 171083: Negocios Renovables Inteligentes -- single CFE renewable energy contract")
        print("  vendor 36463:  Acciona Infraestructuras Mexico -- Spanish multinational, diversified")
        print("  vendor 44860:  Equipamiento y Consultoria Integral -- diversified health equipment, COVID anomaly")
        print()
        print(f"Total new estimated fraud: $243M MXN")

    except Exception as e:
        conn.rollback()
        print(f"ERROR -- rolled back: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
