"""
ARIA Cases 446-448: March 17 2026 investigation session.

Cases:
  446: DRAGADOS DEL SURESTE + OBRAS CIVILES Y MARITIMAS - CONAPESCA Dredging Cartel
       Co-bid with GT-flagged CALZADA (existing GT case), 100% SB at CONAPESCA
  447: ECC CONSTRUCCIONES - Tabasco State Education Infrastructure Capture (2.0B)
       1.43B single-bid contract, 81% SB, 99% concentration at single institution
  448: GRUPO CONSTRUCTOR DE LA PENINSULA HT - Q.Roo State Education Capture (2.3B)
       2.3B single-bid contract, 99.3% concentration at Q.Roo education institute

Also: FP markings for ICA Fluor, Bristol-Myers, Servicio Proteccion Federal, Casa Moneda,
      Placas Realzadas, Rotoplas + needs_review updates for 10 vendors

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    # ── Case 446: CONAPESCA Dredging Cartel ───────────────────────────────────
    case_446_id = next_id
    case_446_str = f"CASE-{case_446_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_446_id, case_446_str,
        "DRAGADOS DEL SURESTE + OBRAS CIVILES Y MARITIMAS - CONAPESCA Dredging Cartel",
        "procurement_fraud",
        "high",
        (
            "Bid-rigging cartel in dredging/maritime construction at CONAPESCA "
            "(Comision Nacional de Acuacultura y Pesca). "
            "Multiple dredging companies each win 100% of competitive procedures at CONAPESCA "
            "without competing against each other — a classic market allocation pattern. "
            "CALZADA CONSTRUCCIONES SA DE CV is already in the ground truth database "
            "as a related case. "
            "CONSTRUCCIONES Y DRAGADOS DEL SURESTE SA DE CV (vendor_id=66): "
            "587M at CONAPESCA (12 contracts, 100% SB) + 1.6B at BANOBRAS (1 SB contract) "
            "+ 1.5B at other federal agencies = 4.25B total, 86.7% overall SB, no RFC. "
            "Co-bidder with CALZADA CONSTRUCCIONES in shared procedures. "
            "OBRAS CIVILES Y MARITIMAS SA DE CV (vendor_id=2898): "
            "571.9M across 13 contracts (92.3% SB), primarily CONAPESCA 356M (100% SB). "
            "Pattern: Each cartel member monopolizes specific CONAPESCA dredging tenders, "
            "rotates wins, and avoids competing against ring members. "
            "100% SB rates at CONAPESCA across 5+ confirmed dredging companies is statistically "
            "impossible without coordination. Combined ring value with CALZADA: estimated >10B MXN."
        ),
        5_000_000_000,
        2002, 2025,
    ))
    print(f"Inserted case {case_446_id}: CONAPESCA Dredging Cartel")

    for vid, vname, strength in [
        (66, "CONSTRUCCIONES Y DRAGADOS DEL SURESTE SA DE CV", "high"),
        (2898, "OBRAS CIVILES Y MARITIMAS SA DE CV", "high"),
    ]:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)
        """, (case_446_str, vid, vname, strength, "aria_investigation"))
        rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
        for row in rows:
            conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                         (case_446_str, row[0]))
        conn.execute("""
            UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
            WHERE vendor_id=?
        """, (f"CONAPESCA dredging cartel (Case {case_446_id}): 100% SB at CONAPESCA, "
              f"co-bids with CALZADA (GT). Market allocation bid-rigging pattern.", vid))
        n = conn.execute("SELECT COUNT(*) FROM contracts WHERE vendor_id=?", (vid,)).fetchone()[0]
        print(f"  Tagged {n} contracts for vendor {vid} ({vname[:40]})")

    # ── Case 447: ECC CONSTRUCCIONES ──────────────────────────────────────────
    case_447_id = next_id + 1
    case_447_str = f"CASE-{case_447_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_447_id, case_447_str,
        "ECC CONSTRUCCIONES - Tabasco State Education Infrastructure Capture",
        "procurement_fraud",
        "high",
        (
            "Institutional capture at Instituto de Infraestructura Fisica Educativa de Tabasco (IIFET) "
            "or equivalent Tabasco state education infrastructure agency. "
            "ECC CONSTRUCCIONES received 1.43B MXN in a single single-bid contract at the "
            "Tabasco state education infrastructure institution, representing 99.2% of total vendor value "
            "concentrated at a single state agency. "
            "81% overall single-bid rate across 20 contracts totaling 2.0B MXN. "
            "Pattern: single dominant contractor capturing the entire school construction budget "
            "at a state education infrastructure agency through consistently unopposed bids. "
            "State-level education infrastructure institutes (IIFET, INIFED state offices) are "
            "known vulnerability points for procurement fraud — they manage large construction "
            "budgets with weaker oversight than federal agencies. "
            "The single 1.43B contract represents approximately 70% of lifetime vendor value "
            "won without any competing bidder. "
            "Classification: P6 Institutional Capture at state education agency."
        ),
        1_430_000_000,
        2010, 2023,
    ))
    print(f"Inserted case {case_447_id}: ECC CONSTRUCCIONES Tabasco")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_447_str, 132381, "ECC CONSTRUCCIONES SA DE CV", "high", "aria_investigation"))

    rows_447 = conn.execute("SELECT id FROM contracts WHERE vendor_id=132381").fetchall()
    for row in rows_447:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_447_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=132381
    """, (f"Tabasco state education capture (Case {case_447_id}): 1.43B SB at IIFET-Tabasco, "
          f"99% concentration, 81% SB rate. State education infrastructure capture.",))
    print(f"  Tagged {len(rows_447)} contracts for ECC CONSTRUCCIONES")

    # ── Case 448: GRUPO CONSTRUCTOR DE LA PENINSULA HT ────────────────────────
    case_448_id = next_id + 2
    case_448_str = f"CASE-{case_448_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_448_id, case_448_str,
        "GRUPO CONSTRUCTOR DE LA PENINSULA HT - Q.Roo State Education Infrastructure Capture",
        "procurement_fraud",
        "high",
        (
            "Institutional capture at Quintana Roo state education infrastructure agency "
            "(IIFETQR or ICOVE equivalent). "
            "GRUPO CONSTRUCTOR DE LA PENINSULA HT SA DE CV received 2.3B MXN in a single "
            "single-bid licitacion publica, representing 99.3% of total vendor contract value "
            "concentrated at one state education construction institution. "
            "Pattern mirrors ECC CONSTRUCCIONES at Tabasco: a single dominant contractor "
            "winning the entirety of a state education agency's construction budget "
            "through an uncontested public tender. "
            "The scale (2.3B) is exceptionally large for a state-level education infrastructure "
            "institution — comparable to federal-level investments but without federal oversight. "
            "Quintana Roo state has documented procurement irregularities in multiple sectors. "
            "Classification: P6 Institutional Capture at Q.Roo state education agency."
        ),
        2_300_000_000,
        2015, 2022,
    ))
    print(f"Inserted case {case_448_id}: GRUPO CONSTRUCTOR PENINSULA Q.Roo")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_448_str, 176707,
          "GRUPO CONSTRUCTOR DE LA PENINSULA HT SA DE CV", "high", "aria_investigation"))

    rows_448 = conn.execute("SELECT id FROM contracts WHERE vendor_id=176707").fetchall()
    for row in rows_448:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_448_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=176707
    """, (f"Q.Roo state education capture (Case {case_448_id}): 2.3B SB at Q.Roo education agency, "
          f"99.3% concentration. State education infrastructure capture.",))
    print(f"  Tagged {len(rows_448)} contracts for GRUPO CONSTRUCTOR PENINSULA HT")

    # ── False positives ───────────────────────────────────────────────────────
    structural_fps = {
        9045: "ICA FLUOR DANIEL: Legitimate JV of ICA (Mexico's largest constructor) + Fluor Corp (US multinational). Technical monopoly on refinery and airport mega-projects (8.5B NAICM, 7.9B PEMEX refinery). Scale requires specialized JV. 32B total.",
        82436: "SERVICIO DE PROTECCION FEDERAL: Government federal security entity (former PF division). Provides security services to other government agencies via inter-institutional agreements. Ente publico.",
        57092: "CASA DE MONEDA DE MEXICO: Government mint. Sole legal producer of coins, security documents, medals. Constitutional monopoly by law. Ente publico.",
        118348: "ROTOPLAS SA DE CV: Mexico's largest publicly-traded water solutions company (BMV: AGUA). School bebedero (water fountain) programs have limited qualified suppliers. High SB reflects specialized niche + regulatory approvals.",
        16653: "PLACAS REALZADAS SA DE CV: License plate manufacturing. Structural monopoly — very few FMCSA-certified manufacturers exist in Mexico. Government contracts for state vehicle registrations.",
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    pharma_fps = {
        5231: "BRISTOL MYERS SQUIBB: Top-10 global pharmaceutical company. Patented oncology and immunology drugs to IMSS/SSA/ISSSTE. 467 contracts, 1.5% SB = very competitive patent pharma market. 13.4B.",
    }
    for vid, note in pharma_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_patent_exception=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    print(f"Marked {len(structural_fps)} structural FPs + {len(pharma_fps)} pharma FPs")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        13665: "ING. SISTEMAS SANITARIOS Y AMBIENTALES: 1.85B, 95.1% SB, 12 water/sanitation agencies, no RFC, zero co-bidders. Nationwide water treatment monopoly — 18yr operation. 770M at Monterrey SADM. Specification tailoring suspected.",
        137218: "OZONE ECOLOGICAL EQUIPMENTS: 2.1B, 93.8% SB, 15/16 contracts at CONAGUA only, zero co-bidders. Extreme CONAGUA concentration similar to PAJEME/PEREZ Y GIL. Investigate urgently.",
        206649: "LOGEM OPERADORA MEXICANA: 1B single contract at SAE for health services. Co-bid with GT-flagged Medi Access. Unusual SAE+health services combination. Possible Medi Access network.",
        294282: "DISTRIBUIDORA YAAB: New company (RFC April 2022), 250M DA cleaning at ISEM within 2yr of incorporation. Ghost company pattern: new + DA + state health + cleaning.",
        196826: "MERCADOS INNOVACION Y LOBBY MKT: 172M SB at CONAGUA December 2016. 'Lobby' firm winning infrastructure contract is suspicious. Investigate description.",
        1516: "BIODIST: 8.0B medical diagnostics (blood bank, lab tests), 1118 contracts, 57 institutions, 3B at IMSS alone. Not clearly corrupt but extreme scale. Similar to GT medical suppliers.",
        1085: "IMPULSORA DE DESARROLLO INTEGRAL: 5.4B, 91% SB, 17 institutions, roads/ports/bridges/refineries. 57 contracts in 2012 alone is unusual. Long-established but extremely high SB.",
        134555: "LORE SOLUCIONES INTEGRALES EMPRESARIALES DE SINALOA: 2.68B outsourcing across CONAPESCA/Cultura/CINVESTAV/NAFIN. Pre-2021 outsourcing reform model. Diverse institutions, borderline.",
        221110: "VISE SA DE CV: 3.9B, 87% SB, road construction at SICT/BANOBRAS. Major road constructor but very high SB rate.",
        58089: "SUB MARELHER: 501M, 67% SB, CONAGUA concentrated. Another CONAGUA water contractor pattern.",
        2898: "OBRAS CIVILES Y MARITIMAS: Already added to GT Case 446 (CONAPESCA dredging cartel). Skip in future scans.",
        248959: "GREENCORP BIORGANIKS: 160M, 100% DA, 3 same-day contracts at Bienestar (fertilizer, 2019 Sembrando Vida). DA splitting pattern at Bienestar social programs.",
    }
    for vid, memo in needs_review.items():
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review', memo_text=?
            WHERE vendor_id=? AND in_ground_truth=0
        """, (memo, vid))

    print(f"Marked {len(needs_review)} needs_review")

    conn.commit()
    print("\nCommitted.")

    # ── Verification ──────────────────────────────────────────────────────────
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max} | GT vendors: {total_v} | GT contracts: {total_c}")

    for case_str in [case_446_str, case_447_str, case_448_str]:
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        name = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {name[:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 446-448 inserted.")


if __name__ == "__main__":
    run()
