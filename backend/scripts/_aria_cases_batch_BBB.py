#!/usr/bin/env python3
"""
GT Batch BBB -- ARIA T3 investigation (4 vendors, 3 cases + 1 skip)

Case N+0: IMSS/State Food Capture -- La Cosmopolitana (v4404)
          367 contracts, 4,850M MXN. IMSS: 195 contracts 3,246M.
          DA shift at IMSS from 0% (2003-2009) to 60-73% (2010-2015).
          Coahuila: 2 contracts 722M @ 100% SB. DIF Morelos: 195M @ 100% SB.
Case N+1: PEMEX SB Capture -- Construcciones Mecanicas Monclova (v15447)
          14 contracts, 3,370M MXN. 100% single-bid at PEMEX EP/Gas.
Case N+2: PEMEX SB Capture -- Global Drilling Fluids de Mexico (v15279)
          7 contracts, 3,284M MXN. 100% single-bid at PEMEX EP.

SKIP: Norpower (v41403) -- single 3,459M SB contract at PEP in 2009. Only 1 contract,
      below minimum viable case threshold (>=3 contracts required).
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 865:
        print(f"ERROR: max ground_truth_cases.id={max_id}, expected >= 865. Aborting.")
        conn.close()
        return

    next_id = max_id + 1
    print(f"Starting from case id {next_id} (current max={max_id})")

    # -- Case N+0: La Cosmopolitana -- IMSS/State Food Capture --
    c0 = next_id
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
           (id, case_id, case_name, case_type, year_start, year_end,
            confidence_level, estimated_fraud_mxn, source_news, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (c0, f"CASE-{c0}",
         "IMSS/State Food Capture -- La Cosmopolitana (Grupo Kosmos)",
         "institutional_capture", 2010, 2019,
         "medium", 2_000_000_000,
         "ARIA T3 investigation",
         "La Cosmopolitana SA de CV (Grupo Kosmos / Landsmanas family). "
         "367 contracts totaling 4,850M MXN. IMSS dominates at 3,246M (67%). "
         "DA rate at IMSS shifted from 0% (2003-2009) to 60-73% (2010-2015), "
         "consistent with institutional capture. Also won 722M at Coahuila "
         "Secretaria de Finanzas (100% SB) and 195M at DIF Morelos (100% SB). "
         "Related entity: Productos Serel SA de CV (v13949). "
         "Fraud window scoped to 2010-2019 when DA shift occurs at IMSS.")
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
           (case_id, vendor_id, vendor_name_source, role,
            evidence_strength, match_method, match_confidence, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (c0, 4404,
         "LA COSMOPOLITANA S.A. DE C.V.",
         "primary",
         "medium", "aria_investigation", 0.85,
         "Grupo Kosmos subsidiary. DA shift at IMSS 2010-2019. "
         "100% SB at Coahuila (722M) and DIF Morelos (195M).")
    )
    print(f"  Case {c0}: La Cosmopolitana -- IMSS/State food capture (v4404)")

    # -- Case N+1: Construcciones Mecanicas Monclova -- PEMEX SB Capture --
    c1 = next_id + 1
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
           (id, case_id, case_name, case_type, year_start, year_end,
            confidence_level, estimated_fraud_mxn, source_news, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (c1, f"CASE-{c1}",
         "PEMEX SB Capture -- Construcciones Mecanicas Monclova",
         "single_bid_capture", 2003, 2010,
         "medium", 1_500_000_000,
         "ARIA T3 investigation",
         "Construcciones Mecanicas Monclova SA de CV. 14 contracts totaling "
         "3,370M MXN. 100% single-bid rate across entire history. "
         "13 contracts at PEMEX EP (3,363M) + 1 at PEMEX Gas (7M). "
         "Monclova-based industrial constructor operating in AHMSA region. "
         "Consistent P6 capture pattern: zero competition across 7 years. "
         "Largest contract: 576M (2008). No competitive wins anywhere.")
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
           (case_id, vendor_id, vendor_name_source, role,
            evidence_strength, match_method, match_confidence, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (c1, 15447,
         "CONSTRUCCIONES MECANICAS MONCLOVA, S.A. DE C.V.",
         "primary",
         "medium", "aria_investigation", 0.80,
         "100% SB at PEMEX EP/Gas 2003-2010. 14 contracts, 3,370M MXN. "
         "ARIA P6 capture pattern flagged.")
    )
    print(f"  Case {c1}: Constr Mecanicas Monclova -- PEMEX SB capture (v15447)")

    # -- Case N+2: Global Drilling Fluids -- PEMEX SB Capture --
    c2 = next_id + 2
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
           (id, case_id, case_name, case_type, year_start, year_end,
            confidence_level, estimated_fraud_mxn, source_news, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (c2, f"CASE-{c2}",
         "PEMEX SB Capture -- Global Drilling Fluids de Mexico",
         "single_bid_capture", 2003, 2010,
         "medium", 1_500_000_000,
         "ARIA T3 investigation",
         "Global Drilling Fluids de Mexico SA de CV. 7 contracts totaling "
         "3,284M MXN. 100% single-bid rate at PEMEX EP exclusively. "
         "Unlike major multinationals (Schlumberger, Halliburton, Baker Hughes) "
         "which also win competitive contracts, GDF wins only through uncontested "
         "bids. Three windows: 2003 (1,352M), 2006 (1,183M), 2010 (749M). "
         "Pattern consistent with PEMEX-era single-bid capture.")
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
           (case_id, vendor_id, vendor_name_source, role,
            evidence_strength, match_method, match_confidence, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (c2, 15279,
         "GLOBAL DRILLING FLUIDS DE MEXICO, S.A. DE C.V.",
         "primary",
         "medium", "aria_investigation", 0.80,
         "100% SB at PEMEX EP 2003-2010. 7 contracts, 3,284M MXN. "
         "Not a major multinational -- no competitive wins anywhere.")
    )
    print(f"  Case {c2}: Global Drilling Fluids -- PEMEX SB capture (v15279)")

    # -- Update aria_queue for all investigated vendors --
    for vid in [4404, 15447, 15279]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth = 1, review_status = 'confirmed' WHERE vendor_id = ?",
            (vid,)
        )
    # NORPOWER: mark as reviewed but not GT (insufficient evidence, 1 contract)
    conn.execute(
        "UPDATE aria_queue SET review_status = 'skipped', "
        "reviewer_notes = 'Single contract (3,459M SB at PEP 2009). Below 3-contract minimum for GT.' "
        "WHERE vendor_id = 41403"
    )

    conn.commit()

    # -- Verify --
    count_cases = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_cases WHERE id >= ?", (c0,)
    ).fetchone()[0]
    count_vendors = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id >= ?", (c0,)
    ).fetchone()[0]
    print(f"\nInserted {count_cases} cases, {count_vendors} vendor links")
    print(f"Case IDs: {c0}-{c2}")

    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"New max case ID: {new_max}")

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
