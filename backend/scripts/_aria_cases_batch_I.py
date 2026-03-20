#!/usr/bin/env python3
"""
Ground Truth Batch I — ARIA T3 vendor investigations (Mar 19, 2026)

Investigated 4 vendors from ARIA queue T3:
  ADD:
    Case 752: JOMTEL Telecomunicaciones — SEDENA/Marina telecom capture (P6)
    Case 753: Desarrolladora de Ideas y Espacios — SEDATU construction capture (P3/SB)
  SKIP:
    vendor_id=150209 Ingenieria del Agua — diversified staffing (no capture)
    vendor_id=43245  Formas Eficientes — diversified office supplies (no capture)

Run: cd backend && python scripts/_aria_cases_batch_I.py
"""

import sqlite3
import os

DB = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db"))


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    try:
        cur.execute("BEGIN")

        # ──────────────────────────────────────────────────────────────
        # Case 752: JOMTEL Telecomunicaciones — SEDENA/Marina telecom capture
        # ──────────────────────────────────────────────────────────────
        # vendor_id=54599 | IPS=0.535 | $560M MXN | 160 contracts | defensa
        # Evidence:
        #   - 86.9% of value concentrated at SEDENA + Marina
        #   - Marina: 139 contracts, 70.5% DA — sustained direct award capture
        #   - SEDENA: 7 contracts but $347.8M — won $197M (2024) and $146M (2020)
        #     LP tenders as sole bidder (UHF radio systems)
        #   - Single-bid LP wins at SEDENA are textbook capture: international
        #     tender opened but only one bidder participates
        #   - Telecom specialization provides partial justification but concentration
        #     + DA/SB pattern at defense institutions is consistent with capture
        # Confidence: medium — clear pattern, no official finding
        # Fraud period: 2014-2024 (peak capture at both SEDENA and Marina)
        cur.execute("""INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
             source_news, year_start, year_end, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)""", (
            754, "CASE-754",
            "JOMTEL SEDENA/Marina Telecom Capture",
            "institutional_capture",
            "medium",
            560_000_000,
            "ARIA investigation — P6 capture pattern at defense institutions",
            2014, 2024,
            "Telecom company with 86.9% value at SEDENA+Marina. "
            "Marina: 139 contracts at 70.5% DA. SEDENA: sole-bidder LP wins "
            "of $197M (2024) and $146M (2020) for UHF radio systems. "
            "International tenders with single participant indicate capture."
        ))
        cur.execute("""INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)""", (
            754, 54599,
            "JOMTEL TELECOMUNICACIONES SA DE CV",
            "medium", "aria_queue"
        ))
        for (cid,) in cur.execute("SELECT id FROM contracts WHERE vendor_id=54599 AND contract_year BETWEEN 2014 AND 2024").fetchall():
            cur.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)", (754, cid))

        # ──────────────────────────────────────────────────────────────
        # Case 753: Desarrolladora de Ideas y Espacios — SEDATU construction SB capture
        # ──────────────────────────────────────────────────────────────
        # vendor_id=253888 | IPS=0.534 | $394M MXN | 10 contracts | infraestructura
        # Evidence:
        #   - 60% of value at SEDATU ($257M across 6 contracts)
        #   - Company debut 2019 — immediately wins massive sole-bidder construction
        #     contracts (avg $39.5M each)
        #   - 60% single-bid rate on competitive procedures — LP tenders with no
        #     other bidders for major public works
        #   - Projects: Plaza del Reloj ($77.5M SB), Palacio Federal Chetumal
        #     ($74.8M SB), Parque Ecologico Texcoco ($49.7M SB)
        #   - P3 intermediary pattern — new company winning large sole-bidder
        #     construction during AMLO administration urban development push
        #   - Risk scores already elevated: avg 0.302, max 0.627
        # Confidence: medium — new company, rapid growth, high SB on large contracts
        # Fraud period: 2019-2023
        cur.execute("""INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
             source_news, year_start, year_end, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)""", (
            755, "CASE-755",
            "Desarrolladora de Ideas — SEDATU Construction SB Capture",
            "single_bid_capture",
            "medium",
            394_000_000,
            "ARIA investigation — P3 new-company construction sole-bidder pattern",
            2019, 2023,
            "Construction company debuting 2019, immediately winning massive "
            "sole-bidder LP contracts at SEDATU and INDAABIN. 60% SB rate on "
            "only 10 contracts averaging $39.5M each. Major projects: Plaza del "
            "Reloj $77.5M, Palacio Federal Chetumal $74.8M, Parque Texcoco "
            "$49.7M — all won as sole bidder on competitive tenders."
        ))
        cur.execute("""INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)""", (
            755, 253888,
            "DESARROLLADORA DE IDEAS Y ESPACIOS, S.A DE C.V.",
            "medium", "aria_queue"
        ))
        for (cid,) in cur.execute("SELECT id FROM contracts WHERE vendor_id=253888 AND contract_year BETWEEN 2019 AND 2023").fetchall():
            cur.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)", (755, cid))

        # ──────────────────────────────────────────────────────────────
        # Update aria_queue for all 4 investigated vendors
        # ──────────────────────────────────────────────────────────────

        # Mark added vendors as in_ground_truth
        for vid in [54599, 253888]:
            cur.execute("UPDATE aria_queue SET in_ground_truth = 1 WHERE vendor_id = ?", (vid,))

        # Mark skipped vendors — not FP, just insufficient pattern for GT
        # vendor_id=150209 Ingenieria del Agua: diversified staffing, no capture
        # vendor_id=43245  Formas Eficientes: diversified office supplies, no capture
        cur.execute("""UPDATE aria_queue SET review_status = 'reviewed',
            reviewer_notes = 'SKIP: diversified staffing across 10+ institutions (top <26%), legitimate specialized outsourcing niche, no institutional capture'
            WHERE vendor_id = 150209""")
        cur.execute("""UPDATE aria_queue SET review_status = 'reviewed',
            reviewer_notes = 'SKIP: highly diversified office supplies (top institution <12%), no capture pattern, legitimate forms/stationery distributor'
            WHERE vendor_id = 43245""")

        conn.commit()

        # ──────────────────────────────────────────────────────────────
        # Report
        # ──────────────────────────────────────────────────────────────
        cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        vendors = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
        print(f"Ground truth: {cases} cases, {vendors} vendors")
        print()
        print("ADDED:")
        print("  Case 752: JOMTEL Telecomunicaciones — SEDENA/Marina telecom capture (vendor 54599, $560M)")
        print("  Case 753: Desarrolladora de Ideas — SEDATU construction SB capture (vendor 253888, $394M)")
        print()
        print("SKIPPED:")
        print("  vendor 150209: Ingenieria del Agua — diversified staffing, no capture")
        print("  vendor 43245:  Formas Eficientes — diversified office supplies, no capture")
        print()
        print("Total new estimated fraud: $954M MXN")

    except Exception as e:
        conn.rollback()
        print(f"ERROR — rolled back: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
