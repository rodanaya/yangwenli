"""
GT Batch TT: Cases 852-855
Investigated 2026-03-20 from ARIA T3 queue.

VERDICTS:
  v42638  EERMS SA DE CV                                  -> ADD (P6 CFE capture, 4.9B, 80% DA)
  v224275 CONSTRUCCIONES E INMOBILIARIAS CANARO SA DE CV  -> ADD (municipal ghost, 1.7B at Tampamolon Corona SLP)
  v2839   TRENA SA DE CV                                  -> ADD (P1 monopoly, 91% SB across states)
  v24017  SERVICIOS MEDICOS DE EMERGENCIA SC              -> SKIP (only 2 contracts, insufficient evidence)
"""
import sqlite3
import sys
import os

DB = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db"))

def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    max_id = cur.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
    assert max_id >= 851, f"Guard failed: max_id={max_id}, expected >=851"
    print(f"Current max GT case ID: {max_id}")

    c0 = max_id + 1  # EERMS CFE capture
    c1 = max_id + 2  # CANARO municipal ghost
    c2 = max_id + 3  # TRENA monopoly single-bid

    # ---- Cases ----
    cases = [
        (c0, f"CASE-{c0}", "EERMS CFE Energia Capture",
         "institutional_capture", "medium",
         "EERMS SA DE CV: 4.9B MXN across 175 contracts at CFE (2010-2017), 80.6% direct award rate. "
         "Also serves CNSNS and ININ (nuclear institutions) at 100% DA but small amounts. "
         "Competitive contracts are largely single-bid (16% SB). P6 capture pattern at CFE. "
         "Non-CFE work is minimal (21M vs 4.9B). Institution-specific concentration consistent with capture.",
         4_889_000_000),
        (c1, f"CASE-{c1}", "CANARO Tampamolon Corona Municipal Ghost",
         "ghost_company", "high",
         "CONSTRUCCIONES E INMOBILIARIAS CANARO SA DE CV (RFC CIC161229DPA): company incorporated Dec 29 2016, "
         "received 1.7B MXN in 4 contracts at tiny Tampamolon Corona SLP municipality (pop ~15K). "
         "ALL contracts single-bid. Captures 92.6% of total municipal spend. Single paving contract "
         "of 1,705M is grossly disproportionate to municipal scale. Classic ghost/shell pattern: "
         "new company created to receive inflated municipal infrastructure contracts.",
         1_712_000_000),
        (c2, f"CASE-{c2}", "TRENA Multi-State Monopoly Single-Bid",
         "bid_rigging", "medium",
         "TRENA SA DE CV: 912M MXN across 11 contracts (2002-2014), 90.9% single-bid rate. "
         "Wins construction contracts across Puebla (430M), Jalisco (179M+92M), Oaxaca (160M), "
         "SCT, and CFE -- always as sole bidder in competitive procedures. 698M concentrated in 2014. "
         "P1 monopoly pattern: systematically uncontested competitive bids across multiple state "
         "governments consistent with market allocation or bid suppression.",
         912_000_000),
    ]

    for row in cases:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, row)
        print(f"  Case {row[0]}: {row[2]}")

    # ---- Vendors ----
    vendors = [
        # EERMS
        (c0, 42638, "EERMS SA DE CV", "high", "aria_pattern_match",
         "P6 capture at CFE, 80% DA, 4.9B over 2010-2017"),
        # CANARO
        (c1, 224275, "CONSTRUCCIONES E INMOBILIARIAS CANARO SA DE CV", "high", "aria_pattern_match",
         "RFC CIC161229DPA created Dec 2016, 1.7B at Tampamolon Corona, 100% SB, 92.6% of municipal spend"),
        # TRENA
        (c2, 2839, "TRENA, S.A. DE C.V.", "high", "aria_pattern_match",
         "P1 monopoly, 91% SB across Puebla/Jalisco/Oaxaca/SCT/CFE, 912M"),
    ]

    for row in vendors:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, row)
        print(f"  Vendor v{row[1]}: {row[2]}")

    # ---- Year scoping on cases ----
    year_scopes = [
        (2010, 2017, c0),  # EERMS CFE capture window
        (2016, 2018, c1),  # CANARO full lifespan
        (2002, 2014, c2),  # TRENA full span
    ]
    for ys, ye, cid in year_scopes:
        cur.execute("UPDATE ground_truth_cases SET year_start=?, year_end=? WHERE id=?", (ys, ye, cid))

    # ---- Update aria_queue ----
    for vid in [42638, 224275, 2839]:
        cur.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='reviewed' WHERE vendor_id=?", (vid,))

    # SKIP: SERVICIOS MEDICOS DE EMERGENCIA
    cur.execute("""
        UPDATE aria_queue SET review_status='reviewed',
        reviewer_notes='SKIP: only 2 contracts total, 716M single SB at NL state ISSSTE -- insufficient evidence for GT case, could be legitimate medical services outsourcing'
        WHERE vendor_id=24017
    """)

    conn.commit()

    # Verify
    n_cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases WHERE id >= ?", (c0,)).fetchone()[0]
    n_vendors = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id >= ?", (c0,)).fetchone()[0]
    print(f"\nInserted {n_cases} cases, {n_vendors} vendors")
    print(f"Cases {c0}-{c2} (IDs {c0}, {c1}, {c2})")
    print(f"Skipped: v24017 SERVICIOS MEDICOS DE EMERGENCIA (insufficient evidence)")

    conn.close()

if __name__ == "__main__":
    main()
