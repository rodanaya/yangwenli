#!/usr/bin/env python3
"""
GT Batch Y: ARIA T3 high-value vendor investigation (Mar 20, 2026)

Investigated 4 vendors from ARIA T3 queue:
  v4379  AMBIDERM SA DE CV - ADD (IMSS DA capture, medical supplies)
  v4394  JUSTESA IMAGEN MEXICANA SA DE CV - ADD (IMSS DA capture, medical imaging)
  v4447  SERVICIOS DE INGENIERIA EN MEDICINA SA DE CV - SKIP (no institutional capture)
  v16579 CONSTRUCTORA MOYEDA SA DE CV - ADD (SCT single-bid capture, infrastructure)
"""
import sqlite3
import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 798:
        print(f"ERROR: max_id={max_id}, expected >= 798. Aborting.")
        conn.close()
        return

    print(f"Current max GT case ID: {max_id}")

    # ---- Case 1: v4379 AMBIDERM - IMSS DA capture (medical supplies) ----
    # 1,534 contracts, 3.32B MXN total. IMSS = 76% of value at 80.8% DA
    # (vs 50.3% DA elsewhere). Massive 2021 spike: 1.16B at IMSS, 91.5% DA.
    c1_id = max_id + 1
    c1_vendor = 4379
    c1_yr_start = 2015
    c1_yr_end = 2025

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases"
        " (id, case_id, case_name, case_type, year_start, year_end,"
        "  confidence_level, estimated_fraud_mxn, source_news, notes)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c1_id, f"CASE-{c1_id}",
         "AMBIDERM IMSS Medical Supplies DA Capture",
         "institutional_capture",
         c1_yr_start, c1_yr_end,
         "medium",
         2200000000,
         "ARIA T3 investigation",
         "Medical supplies vendor (gloves, bandages, curacion). "
         "IMSS captures 76% of total value at 80.8% DA rate vs 50.3% DA elsewhere. "
         "Massive 2021 spike: 1.16B MXN at IMSS with 91.5% DA. "
         "Pattern consistent with IMSS DA saturation."))

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors"
        " (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)"
        " VALUES (?, ?, ?, ?, ?)",
        (c1_id, c1_vendor, "AMBIDERM, S.A. DE C.V.", "medium", "aria_queue_t3"))

    c1_contracts = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
        (c1_vendor, c1_yr_start, c1_yr_end)).fetchall()
    for (cid,) in c1_contracts:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
            (c1_id, cid))
    print(f"  Case {c1_id}: AMBIDERM - {len(c1_contracts)} contracts tagged")

    # ---- Case 2: v4394 JUSTESA IMAGEN - IMSS DA capture (medical imaging) ----
    # 1,088 contracts, 2.45B MXN total. IMSS = 82% of value at 80.1% DA
    # (vs 61.2% DA elsewhere). Sustained capture 2015-2025.
    c2_id = max_id + 2
    c2_vendor = 4394
    c2_yr_start = 2015
    c2_yr_end = 2025

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases"
        " (id, case_id, case_name, case_type, year_start, year_end,"
        "  confidence_level, estimated_fraud_mxn, source_news, notes)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c2_id, f"CASE-{c2_id}",
         "JUSTESA IMAGEN IMSS Medical Imaging DA Capture",
         "institutional_capture",
         c2_yr_start, c2_yr_end,
         "medium",
         1800000000,
         "ARIA T3 investigation",
         "Medical imaging vendor. IMSS captures 82% of total value at 80.1% DA rate "
         "vs 61.2% DA elsewhere. Sustained capture 2015-2025 with massive 2025 spike "
         "(908M MXN). Pattern consistent with IMSS DA saturation for imaging equipment."))

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors"
        " (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)"
        " VALUES (?, ?, ?, ?, ?)",
        (c2_id, c2_vendor, "JUSTESA IMAGEN MEXICANA, S.A DE C.V.", "medium", "aria_queue_t3"))

    c2_contracts = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
        (c2_vendor, c2_yr_start, c2_yr_end)).fetchall()
    for (cid,) in c2_contracts:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
            (c2_id, cid))
    print(f"  Case {c2_id}: JUSTESA IMAGEN - {len(c2_contracts)} contracts tagged")

    # ---- Case 3: v16579 CONSTRUCTORA MOYEDA - SCT single-bid capture ----
    # 65 contracts, 2.18B MXN total. 98.5% single-bid rate overall.
    # SCT/SICT = 72% of value at 100% SB rate across 2005-2020.
    c3_id = max_id + 3
    c3_vendor = 16579
    c3_yr_start = 2005
    c3_yr_end = 2020

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases"
        " (id, case_id, case_name, case_type, year_start, year_end,"
        "  confidence_level, estimated_fraud_mxn, source_news, notes)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c3_id, f"CASE-{c3_id}",
         "CONSTRUCTORA MOYEDA SCT Single-Bid Infrastructure Capture",
         "single_bid_capture",
         c3_yr_start, c3_yr_end,
         "medium",
         1500000000,
         "ARIA T3 investigation",
         "Infrastructure vendor, 65 contracts worth 2.18B MXN. 98.5% single-bid rate. "
         "SCT/SICT accounts for 72% of value at 100% SB rate across 2005-2020. "
         "Also 100% SB at NL state institutions (Apodaca, Monterrey, Sistema de Caminos). "
         "Nuevo Leon-based construction firm with extreme SB capture. "
         "DA rate near zero (1.5%) - all contracts nominally competitive but always sole bidder."))

    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors"
        " (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)"
        " VALUES (?, ?, ?, ?, ?)",
        (c3_id, c3_vendor, "CONSTRUCTORA MOYEDA SA DE CV", "medium", "aria_queue_t3"))

    c3_contracts = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
        (c3_vendor, c3_yr_start, c3_yr_end)).fetchall()
    for (cid,) in c3_contracts:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
            (c3_id, cid))
    print(f"  Case {c3_id}: CONSTRUCTORA MOYEDA - {len(c3_contracts)} contracts tagged")

    # ---- SKIP: v4447 SERVICIOS DE INGENIERIA EN MEDICINA ----
    # IMSS DA rate (35.6%) is LOWER than non-IMSS (54.9%). No capture signal.
    conn.execute(
        "UPDATE aria_queue SET review_status='reviewed',"
        " reviewer_notes='SKIP: No institutional capture. IMSS DA rate (35.6%) lower"
        " than non-IMSS (54.9%). Diversified across 10+ institutions.'"
        " WHERE vendor_id=4447")
    print("  v4447 SERVICIOS DE INGENIERIA EN MEDICINA - SKIPPED (no capture signal)")

    # ---- Update ARIA queue for confirmed cases ----
    for vid in [c1_vendor, c2_vendor, c3_vendor]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,))

    conn.commit()
    conn.close()

    total = len(c1_contracts) + len(c2_contracts) + len(c3_contracts)
    print()
    print("Done. 3 cases added, 1 vendor skipped.")
    print(f"  Case IDs: {c1_id}, {c2_id}, {c3_id}")
    print(f"  Contracts tagged: {total}")


if __name__ == "__main__":
    main()
