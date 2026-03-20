"""
GT Batch XX: Cases 858-861
Investigated 2026-03-20 from ARIA T3 queue.

VERDICTS:
  v41408  TRANSFORMACION TECNOLOGICA DE TAMAULIPAS SA DE CV  -- ADD (PEMEX single-bid capture, 407M, 100% SB, 5 contracts 2009-2011)
  v158943 DAVID OMAR GARCIA GARCIA                          -- ADD (Coahuila state capture, 775M natural person, 100% SB, systemic Coahuila SB pattern)
  v116419 SCOI SOLUCIONES CORPORATIVAS INTEGRALES S DE RL   -- ADD (P3 intermediary outsourcing, 402M, 75% SB at SAE/NAFIN/CPTM, all 2013)
  v35766  SACJAV SA DE CV                                   -- ADD (ISSSTE cleaning + CONACULTA, 418M, 100% SB, 2008-2010)
"""
import sqlite3
import os

DB = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db"))


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    max_id = cur.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
    assert max_id >= 857, f"Guard failed: max_id={max_id}, expected >=857"
    print(f"Current max GT case ID: {max_id}")

    c0 = max_id + 1  # TRANSFORMACION TECNOLOGICA PEMEX
    c1 = max_id + 2  # DAVID OMAR GARCIA GARCIA
    c2 = max_id + 3  # SCOI outsourcing
    c3 = max_id + 4  # SACJAV cleaning

    # ---- Cases ----
    cases = [
        (c0, f"CASE-{c0}", "Transformacion Tecnologica PEMEX Single-Bid Capture",
         "bid_rigging", "medium",
         "TRANSFORMACION TECNOLOGICA DE TAMAULIPAS SA DE CV: 407M MXN across 5 contracts at PEMEX "
         "(Corporativo + Exploracion y Produccion), 2009-2011. 100% single-bid in Licitacion Publica "
         "procedures -- zero competition in every tender. Contracts are for construction/adecuacion "
         "at PEMEX Burgos and Reynosa facilities. All 5 competitive tenders received only this vendor "
         "as bidder, consistent with bid suppression or specification tailoring at PEMEX Tamaulipas.",
         407_000_000),
        (c1, f"CASE-{c1}", "David Omar Garcia Garcia Coahuila State Capture",
         "institutional_capture", "medium",
         "DAVID OMAR GARCIA GARCIA (natural person): 775M MXN in 2 contracts at COAH-Secretaria de Finanzas "
         "in 2015, both single-bid. Top vendor by value at this institution in 2015. 774.5M single contract "
         "for 'rehabilitation of community center' in Saltillo is grossly disproportionate for a natural "
         "person and for the stated scope. Coahuila Finanzas 2015 shows systemic 100% single-bid across "
         "nearly ALL vendors (top 10 all at 100% SB), indicating institutional capture at state level. "
         "Natural person receiving 775M in public tenders is a strong anomaly.",
         775_000_000),
        (c2, f"CASE-{c2}", "SCOI Outsourcing Intermediary at Federal Finance Institutions",
         "intermediary", "medium",
         "SCOI SOLUCIONES CORPORATIVAS INTEGRALES S DE RL DE CV: 402M MXN across 4 contracts in 2013 at "
         "three federal institutions -- SAE (200M, single-bid), NAFIN (127M outsourcing, 2 contracts both "
         "SB), and Consejo de Promocion Turistica (75M, direct award). All contracts are for outsourcing "
         "or professional services. 75% single-bid rate. Appeared suddenly with large outsourcing "
         "contracts across multiple hacienda-sector institutions in same year, consistent with P3 "
         "intermediary pattern: shell or front company receiving outsourcing contracts.",
         402_000_000),
        (c3, f"CASE-{c3}", "SACJAV ISSSTE-CONACULTA Cleaning Single-Bid",
         "bid_rigging", "medium",
         "SACJAV SA DE CV: 418M MXN across 3 contracts (2008-2010), 100% single-bid. Largest contract "
         "is 384M at ISSSTE for limpieza integral (cleaning) in 2008 -- sole bidder in competitive "
         "procedure. Also won 2 CONACULTA cleaning contracts (35M) as sole bidder. 4th largest ISSSTE "
         "cleaning vendor by total value. Systematic sole-bidder pattern in cleaning services sector "
         "at federal health and cultural institutions, consistent with bid suppression.",
         418_000_000),
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
        # TRANSFORMACION TECNOLOGICA
        (c0, 41408, "TRANSFORMACION TECNOLOGICA DE TAMAULIPAS, S.A. DE C.V.", "high", "aria_pattern_match",
         "100% SB at PEMEX 2009-2011, 407M, 5 contracts all sole-bidder in LP"),
        # DAVID OMAR GARCIA GARCIA
        (c1, 158943, "DAVID OMAR GARCIA GARCIA", "high", "aria_pattern_match",
         "Natural person, 775M at COAH Finanzas 2015, 100% SB, systemic state capture"),
        # SCOI
        (c2, 116419, "SCOI SOLUCIONES CORPORATIVAS INTEGRALES S DE RL DE CV", "high", "aria_pattern_match",
         "P3 intermediary outsourcing at SAE/NAFIN/CPTM 2013, 402M, 75% SB"),
        # SACJAV
        (c3, 35766, "SACJAV S.A. DE C.V.", "high", "aria_pattern_match",
         "100% SB cleaning contracts at ISSSTE (384M) and CONACULTA (35M), 2008-2010"),
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
        (2009, 2011, c0),  # PEMEX Tamaulipas window
        (2015, 2015, c1),  # COAH single year
        (2013, 2013, c2),  # SCOI single year
        (2008, 2010, c3),  # SACJAV cleaning window
    ]
    for ys, ye, cid in year_scopes:
        cur.execute("UPDATE ground_truth_cases SET year_start=?, year_end=? WHERE id=?", (ys, ye, cid))

    # ---- Update aria_queue ----
    for vid in [41408, 158943, 116419, 35766]:
        cur.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='reviewed' WHERE vendor_id=?", (vid,))

    conn.commit()

    # Verify
    n_cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases WHERE id >= ?", (c0,)).fetchone()[0]
    n_vendors = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id >= ?", (c0,)).fetchone()[0]
    print(f"\nInserted {n_cases} cases, {n_vendors} vendors")
    print(f"Cases {c0}-{c3} (IDs {c0}, {c1}, {c2}, {c3})")

    conn.close()


if __name__ == "__main__":
    main()
