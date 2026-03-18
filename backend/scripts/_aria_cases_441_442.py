"""
ARIA Cases 441-442: March 17 2026 investigation session.

Cases:
  441: PROYECTOS Y CONSTRUCCIONES URISA - CONAGUA/CFE 23-Year Single-Bid Monopoly (5.34B)
       78.4% SB over 23 years, CONAGUA + CFE + airport, no RFC
  442: EXINSA - Q.Roo CAPA Water Commission Institutional Capture (1.01B)
       100% SB, 93% concentration at single state water commission, no RFC

Also: FP markings (MEXALIT structural, SEIC security sector, next-batch insurance/pharma/govt)

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

    # ── Case 441: PROYECTOS Y CONSTRUCCIONES URISA ────────────────────────────
    case_441_id = next_id
    case_441_str = f"CASE-{case_441_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_441_id, case_441_str,
        "PROYECTOS Y CONSTRUCCIONES URISA - CONAGUA/CFE 23-Year Infrastructure Monopoly",
        "procurement_fraud",
        "high",
        (
            "Chronic single-bid infrastructure monopoly at CONAGUA and CFE over 23 years (2002-2025). "
            "No RFC registered despite 5.34B MXN across 97 contracts. "
            "78.4% single-bid rate on public licitaciones — nearly 4 out of 5 competitive tenders "
            "had zero competing bidders over 23 years, indicating specification tailoring or "
            "implicit market allocation rather than genuine market scarcity. "
            "Client breakdown: CONAGUA 2.44B (56 contracts, 70% SB), CFE 1.69B (36 contracts, 89% SB), "
            "Grupo Aeroportuario CDMX 1.11B (1 single-bid LP contract). "
            "Services: water pump station operations/maintenance, electrical substation modernization, "
            "pipeline replacement — overlapping with CONAGUA/CFE core infrastructure. "
            "Average risk score escalated to 1.0 consistently from 2017 onward — matching the period "
            "of most aggressive single-bid contract accumulation. "
            "Pattern: P6 Institutional Capture + P1 Monopoly across two major federal agencies. "
            "A legitimate contractor operating for 23 years with 5.34B in contracts would have "
            "an RFC and would occasionally face at least one competing bidder."
        ),
        5_340_000_000,
        2002, 2025,
    ))
    print(f"Inserted case {case_441_id}: URISA CONAGUA/CFE monopoly")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_441_str, 2671, "PROYECTOS Y CONSTRUCCIONES URISA SA DE CV", "high", "aria_investigation"))

    rows_441 = conn.execute("SELECT id FROM contracts WHERE vendor_id=2671").fetchall()
    for row in rows_441:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_441_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=2671
    """, (f"CONAGUA/CFE 23yr monopoly (Case {case_441_id}): No RFC, 78.4% SB on public tenders, "
          f"5.34B across CONAGUA+CFE+airport. Specification tailoring or market allocation.",))
    print(f"  Tagged {len(rows_441)} contracts for URISA")

    # ── Case 442: EXINSA ──────────────────────────────────────────────────────
    case_442_id = next_id + 1
    case_442_str = f"CASE-{case_442_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_442_id, case_442_str,
        "EXINSA - Quintana Roo CAPA Water Commission Institutional Capture",
        "procurement_fraud",
        "high",
        (
            "Institutional capture at the Comision de Agua Potable y Alcantarillado (CAPA) "
            "of Quintana Roo state. 100% single-bid rate across all 23 contracts (2010-2019). "
            "No RFC despite 1.01B MXN in public contracts. "
            "93.2% value concentration at CAPA alone (937.5M of 1.01B). "
            "Zero co-bidders identified — never shared a competitive procedure with any other vendor. "
            "Primary contract: 805.1M on a single day (2011-11-07) for "
            "'Sectorizacion, sustitucion de tuberias y micromedicion del Sistema de Agua Potable' — "
            "water pipeline replacement and metering system in Q.Roo. This single contract represents "
            "79.7% of EXINSA's lifetime contract value. "
            "Context: CAPA Q.Roo itself has a 95.8% single-bid rate institution-wide (521 of 544 "
            "contracts), suggesting systemic institutional capture — not just one vendor. "
            "EXINSA is the #1 vendor at CAPA by value margin of 4x over the #2 vendor. "
            "The company disappeared from procurement records after 2019. "
            "Pattern: Ghost/shell contractor created to channel state water infrastructure funds "
            "through a permanently non-competitive procurement system."
        ),
        937_000_000,
        2010, 2019,
    ))
    print(f"Inserted case {case_442_id}: EXINSA Q.Roo CAPA capture")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_442_str, 56590, "EXINSA", "high", "aria_investigation"))

    rows_442 = conn.execute("SELECT id FROM contracts WHERE vendor_id=56590").fetchall()
    for row in rows_442:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_442_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=56590
    """, (f"CAPA Q.Roo capture (Case {case_442_id}): 100% SB, no RFC, 93% at CAPA, "
          f"805M single-day contract. Zero co-bidders. Disappeared 2019.",))
    print(f"  Tagged {len(rows_442)} contracts for EXINSA")

    # ── False positives ───────────────────────────────────────────────────────
    # MEXALIT: Structural industrial monopoly
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=7191
    """, ("FP: MEXALIT INDUSTRIAL: Sole domestic manufacturer of fiber-cement (asbestos-cement) pipes "
          "and roofing sheets. 1.79B across 31 contracts 2002-2015. SB reflects market reality "
          "— only domestic producer. Active in SEDESOL roofing programs + water utility pipe supply. "
          "Inactive since 2015 due to asbestos phase-out.",))

    # SEIC: Legitimate private security firm
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=98356
    """, ("FP: SERVICIOS ESPECIALIZADOS INVESTIGACION Y CUSTODIA (SEIC): Legitimate private security "
          "company. 41% SB and 15% DA are within normal range for Mexican security sector (PRYSE: 30% SB, "
          "EULEN: 44% SB). Serves 19 institutions with no extreme concentration. "
          "Security clearance requirements limit competition. Co-bids with PRYSE, other known firms.",))

    # Next-batch false positives: insurance companies
    insurance_fps = {
        67172: "MAPFRE MEXICO: Major insurance company (Spanish multinational). Government insurance procurement for vehicles/assets. Structural oligopoly in Mexican insurance market.",
        240162: "SEGUROS AZTECA DANOS: Insurance company (Grupo Salinas). Government insurance for assets/vehicles. Structural oligopoly.",
    }
    for vid, note in insurance_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    # Pharma FP
    conn.execute("""
        UPDATE aria_queue SET fp_patent_exception=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=40391
    """, ("FP: SANDOZ: Generics subsidiary of Novartis (Swiss pharma multinational). "
          "Off-patent generic medicines to IMSS/INSABI. Patent-protected brand portfolio + "
          "regulatory approval requirements limit competition.",))

    # Public institution FPs
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=75553
    """, ("FP: INFOTEC: Government federal IT research center (CONACYT/SEP). "
          "IT development and research services to federal agencies. Ente publico.",))

    print(f"Marked FP: MEXALIT, SEIC, MAPFRE, SEGUROS AZTECA, SANDOZ, INFOTEC")

    conn.commit()
    print("\nCommitted.")

    # ── Verification ──────────────────────────────────────────────────────────
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max} | GT vendors: {total_v} | GT contracts: {total_c}")

    for case_str in [case_441_str, case_442_str]:
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        name = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {name[:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 441-442 inserted.")


if __name__ == "__main__":
    run()
