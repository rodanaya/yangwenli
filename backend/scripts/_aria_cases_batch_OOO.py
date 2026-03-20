#!/usr/bin/env python3
"""
GT Mining Batch OOO — ARIA T3 investigation (4 vendors)

Investigated 2026-03-20:
  v30732   EMPACADORA EL FRESNO S.A. DE C.V.            -> ADD  (DICONSA food monopoly, 443.8M at 99.3% DA, 2011-2022)
  v38721   ABASTECEDORA ARAGONESA, S.A. DE C.V.         -> ADD  (IEPSA printing supplies monopoly, 481M at 85.7% DA, 2010-2024)
  v215611  MAGNOCOM SA DE CV                            -> SKIP (legitimate competitive medical supplier, 8% DA, broad reach)
  v5064    INSTRUMENTOS MEDICOS INTERNACIONALES S.A.    -> SKIP (legitimate 24-year medical instruments distributor, 1730 contracts)

Cases added: 2  |  Vendors skipped: 2
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 888:
        print(f"ERROR: max_id={max_id}, expected >= 888. Aborting.")
        conn.close()
        return

    c0 = max_id + 1  # v30732 — DICONSA food monopoly
    c1 = max_id + 2  # v38721 — IEPSA printing supplies monopoly

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c0}, {c1}")

    # ── Case 889: v30732 — DICONSA Food Distribution Monopoly ──────────────
    # EMPACADORA EL FRESNO S.A. DE C.V.
    # 353 total contracts over 19 years (2007-2025), BUT concentrated at
    # DICONSA: 271 contracts = 85% of portfolio, 443.8M MXN = 85% of total value.
    # DICONSA contracts 2011-2022 (11-year window), 99.3% DA rate.
    # Pattern matches Case 881 (GRUPO INDUSTRIAL VIDA — also DICONSA food monopoly).
    # Institutional capture: food vendor wins near-monopoly at government welfare
    # food distributor via direct awards. ALIMENTACION PARA EL BIENESTAR spike
    # 2023+ (65 contracts, 100% DA, 20.9M) suggests continuation of pattern
    # under successor agency. Fraud period 2011-2022 (main DICONSA capture).
    # Estimated fraud: 443.8M MXN (DICONSA contracts at 99.3% DA).

    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c0,
            f"CASE-{c0}",
            "DICONSA Food Monopoly - EMPACADORA EL FRESNO",
            "institutional_capture",
            2011,
            2022,
            "high",
            443_800_000,
            "ARIA T3 mining; IMSS natural person pattern",
            "Food vendor EMPACADORA EL FRESNO captured DICONSA (government welfare food distributor) "
            "via institutional monopoly: 271 of 353 contracts (76.5% of portfolio) at single institution, "
            "443.8M MXN (85% of vendor value), 99.3% direct award rate 2011-2022. Matches Case 881 (GRUPO "
            "INDUSTRIAL VIDA) institutional capture at same institution. Continuation visible 2023-2025 at "
            "successor agency ALIMENTACION PARA EL BIENESTAR (65 contracts, 100% DA, 20.9M). Confidence: high.",
        ),
    )
    print(f"  -> Case {c0} (v30732 EMPACADORA EL FRESNO) inserted")

    # ── Case 890: v38721 — IEPSA Printing Supplies Monopoly ─────────────────
    # ABASTECEDORA ARAGONESA, S.A. DE C.V.
    # 115 total contracts over 16 years (2009-2024), BUT concentrated at IEPSA
    # (Impresora y Encuadernadora Progreso, government printing parastatal):
    # 14 contracts = 12% of portfolio BUT 481M MXN = 69% of total vendor value.
    # IEPSA contracts 2010-2024, 85.7% DA rate. Red flag: supplies vendor
    # providing 0.48B in supplies to a printing company is anomalously large.
    # Likely overpricing or shell intermediation for materials (paper, ink,
    # binding supplies). 85.7% DA + massive single contracts (146M, 80M, 68M,
    # 67M, 52M in 2010/2024) suggest monopolistic supply arrangement.
    # Coahuila state government contracts (158.8M, 0% DA) and CONAFE (25M) are
    # secondary revenue. Fraud period 2010-2024 (IEPSA concentration window).
    # Estimated fraud: 350-400M MXN (conservative 70-80% of IEPSA 481M value,
    # accounting for some legitimate supplies).

    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c1,
            f"CASE-{c1}",
            "IEPSA Printing Supplies Monopoly - ABASTECEDORA ARAGONESA",
            "direct_award_abuse",
            2010,
            2024,
            "medium",
            380_000_000,
            "ARIA T3 mining; IMSS natural person pattern",
            "Supplies vendor ABASTECEDORA ARAGONESA captured IEPSA (government printing parastatal) via "
            "monopoly: 14 of 115 contracts (12% of portfolio) but 481M MXN (69% of vendor value), 85.7% DA. "
            "Anomalously large single contracts to printing company (146M, 80M, 68M, 67M, 52M per contract) "
            "suggest overpricing or shell intermediation. 2010, 2023-2024 spikes indicate two separate capture "
            "windows. Conservative fraud estimate 380M MXN (80% of IEPSA 481M value, assuming partial "
            "legitimacy of supplies). Confidence: medium (supplies cost is plausible but magnitude is suspicious).",
        ),
    )
    print(f"  -> Case {c1} (v38721 ABASTECEDORA ARAGONESA) inserted")

    # Update aria_queue for ADDED cases
    conn.execute(
        "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
        (30732,),
    )
    conn.execute(
        "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
        (38721,),
    )
    print("  -> Updated aria_queue for v30732, v38721")

    # Mark SKIPPED vendors
    conn.execute(
        """UPDATE aria_queue SET review_status='skipped', in_ground_truth=0,
           reviewer_notes=? WHERE vendor_id=?""",
        (
            "SKIP: Legitimate competitive medical supplier (8% DA, 92% competitive bids, "
            "multi-institution reach). IMSS concentration (61% of value) normal for medical supplier.",
            215611,
        ),
    )
    conn.execute(
        """UPDATE aria_queue SET review_status='skipped', in_ground_truth=0,
           reviewer_notes=? WHERE vendor_id=?""",
        (
            "SKIP: Legitimate 24-year medical instruments distributor (1730 contracts 2002-2025). "
            "54% DA justified by specialized medical equipment sole-sourcing. Broad multi-institution reach "
            "(IMSS, ISSSTE, hospitals, research centers). No institutional capture pattern.",
            5064,
        ),
    )
    print("  -> Marked v215611, v5064 as skipped")

    conn.commit()
    conn.close()

    print(f"\nSummary:")
    print(f"  Cases added: 2 (v30732, v38721)")
    print(f"  Vendors skipped: 2 (v215611, v5064)")
    print(f"  Next case_id: {c1 + 1}")


if __name__ == "__main__":
    main()
