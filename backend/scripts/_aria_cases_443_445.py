"""
ARIA Cases 443-445: March 17 2026 investigation session.

Cases:
  443: GRUPO CONSTRUCTOR DIAMANTE - SCT Highway Construction Monopoly (3.04B)
       93.3% SB, 4 institutions, no RFC, SCT/CAPUFE/CONAGUA capture
  444: TRANSPORTACIONES Y CONSTRUCCIONES TAMAULIPECOS - SCT/PEMEX Capture (5.02B)
       96.7% SB, 92 contracts, SCT+PEMEX+Tamaulipas state capture
  445: COMERCIALIZADORA JUBILEO - Shell Company Industrial Plant Procurement (464M)
       Single 464M contract, trading company winning specialized industrial equipment,
       single-bid, no RFC, year-end, state water utility

Also: FP markings for PPP highway SPVs, pharma patents, government entities, IT distributors.

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

    # ── Case 443: GRUPO CONSTRUCTOR DIAMANTE ──────────────────────────────────
    case_443_id = next_id
    case_443_str = f"CASE-{case_443_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_443_id, case_443_str,
        "GRUPO CONSTRUCTOR DIAMANTE - SCT/CAPUFE Highway Construction Monopoly",
        "procurement_fraud",
        "high",
        (
            "Federal highway construction monopoly at SCT (Secretaria de Comunicaciones y Transportes). "
            "No RFC registered despite 3.04B MXN across 30 contracts (2002-2023). "
            "93.3% single-bid rate — 28 of 30 contracts won without competition. "
            "Only 4 institutions ever served in 21 years: SCT (2.2B, 25 contracts), "
            "CAPUFE (474M, 3 contracts), CONAGUA (166M, 1 contract), SCT Puebla (202M, 1 contract). "
            "96% of value at SCT + CAPUFE — extreme federal highway agency concentration. "
            "Average risk scores: SCT contracts 0.918, CAPUFE contracts 1.0, CONAGUA 1.0. "
            "Contract descriptions: pavement rehabilitation, new road construction, highway subtramos, "
            "distributor overpasses — all federal highway construction. "
            "Gap years (2009-2012 and 2014-2017 dormant) followed by return for large contracts "
            "suggests relationship-driven award cycles tied to administration changes. "
            "Zero co-bidders identified — no competing vendor ever participated in procedures "
            "where Grupo Constructor Diamante was the sole bidder. "
            "Classification: P1 Monopoly + P6 SCT Institutional Capture."
        ),
        3_040_000_000,
        2002, 2023,
    ))
    print(f"Inserted case {case_443_id}: GRUPO CONSTRUCTOR DIAMANTE")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_443_str, 10305, "GRUPO CONSTRUCTOR DIAMANTE SA DE CV", "high", "aria_investigation"))

    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=10305").fetchall()
    for row in rows:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_443_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=10305
    """, (f"SCT/CAPUFE monopoly (Case {case_443_id}): No RFC, 93.3% SB, 4 institutions only, "
          f"3.04B. Avg risk 0.918-1.0. Zero co-bidders. Gap years suggest administration-linked awards.",))
    print(f"  Tagged {len(rows)} contracts for GRUPO CONSTRUCTOR DIAMANTE")

    # ── Case 444: TRANSPORTACIONES Y CONSTRUCCIONES TAMAULIPECOS ─────────────
    case_444_id = next_id + 1
    case_444_str = f"CASE-{case_444_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_444_id, case_444_str,
        "TRANSPORTACIONES Y CONSTRUCCIONES TAMAULIPECOS - SCT/PEMEX/State Capture",
        "procurement_fraud",
        "high",
        (
            "Multi-institution construction capture across federal and state agencies. "
            "No RFC despite 5.02B MXN across 92 contracts (2002-2021). "
            "96.7% single-bid rate — 89 of 92 contracts won without competition. "
            "Institution breakdown: SCT 2.45B (federal highways), PEMEX 782M (oil infrastructure), "
            "Tamaulipas state public works 471M (13 contracts, 93% SB), "
            "NAICM (New Mexico City Airport) 608M access road contract, and others. "
            "The NAICM access road contract (608M) was awarded during the controversial "
            "pre-cancellation period of the airport project (2017-2018). "
            "96.7% SB across 92 contracts spanning 19 years and 13 institutions indicates "
            "systematic bid suppression rather than niche market scarcity. "
            "Tamaulipas state concentration (471M, 93% SB) plus federal SCT dominance "
            "suggests a vendor with connections across government levels. "
            "Classification: Multi-institutional capture — P1 Monopoly + P6 Capture at SCT/state."
        ),
        5_020_000_000,
        2002, 2021,
    ))
    print(f"Inserted case {case_444_id}: TRANSPORTACIONES TAMAULIPECOS")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_444_str, 1157,
          "TRANSPORTACIONES Y CONSTRUCCIONES TAMAULIPECOS SA DE CV", "high", "aria_investigation"))

    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=1157").fetchall()
    for row in rows:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_444_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=1157
    """, (f"SCT/PEMEX/state capture (Case {case_444_id}): No RFC, 96.7% SB, 92 contracts, "
          f"5.02B. Includes 608M NAICM access road. SCT+PEMEX+Tamaulipas state.",))
    print(f"  Tagged {len(rows)} contracts for TRANSPORTACIONES TAMAULIPECOS")

    # ── Case 445: COMERCIALIZADORA JUBILEO ────────────────────────────────────
    case_445_id = next_id + 2
    case_445_str = f"CASE-{case_445_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_445_id, case_445_str,
        "COMERCIALIZADORA JUBILEO - Shell Company Thermal Sludge Plant NL",
        "ghost_company",
        "high",
        (
            "Classic shell company pattern at Servicios de Agua y Drenaje de Monterrey "
            "(Nuevo Leon state water authority). "
            "A 'Comercializadora' (generic trading company) with no RFC won a 464.5M MXN "
            "single-bid contract in December 2014 for the "
            "'Adquisicion e Instalacion de una Planta de Secado Termico de Lodos a Baja Temperatura' "
            "(acquisition and installation of a low-temperature thermal sludge drying plant). "
            "Industry mismatch: a generic trading company has no expertise in specialized "
            "industrial wastewater treatment equipment installation. "
            "Shell indicators: (1) No RFC, (2) No other contracts in COMPRANET before or after, "
            "(3) Single bid on a public competitive procedure, (4) December year-end timing "
            "(budget dump pressure), (5) State utility, not federal (weaker oversight), "
            "(6) 464M for one company with no track record. "
            "Risk score: 0.95 — one of the highest in the queue. "
            "Pattern: single-use shell company created to absorb a specific state utility contract "
            "for specialized industrial equipment procurement, then disappears. "
            "Classification: P2 Ghost Company."
        ),
        464_500_000,
        2014, 2014,
    ))
    print(f"Inserted case {case_445_id}: COMERCIALIZADORA JUBILEO shell")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_445_str, 138786, "COMERCIALIZADORA JUBILEO SA DE CV", "high", "aria_investigation"))

    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=138786").fetchall()
    for row in rows:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_445_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=138786
    """, (f"Shell company (Case {case_445_id}): Comercializadora no RFC, 464M thermal sludge plant "
          f"NL water utility Dec 2014. Single contract, never appeared before/after. Risk 0.95.",))
    print(f"  Tagged {len(rows)} contracts for COMERCIALIZADORA JUBILEO")

    # ── False positives ───────────────────────────────────────────────────────
    # PPP highway concession vehicles
    ppp_fps = {
        196930: "APP La Gloria SAPI: PPP highway concession SPV for Saltillo-Monterrey highway. Asociacion Publico-Privada single-contract vehicle by design. 5.21B.",
        196910: "Autovia Texcoco-Zacatepec SAPI: PPP highway concession SPV for Texcoco-Zacatepec route. Single-bid structural by concession design. 4.39B.",
        172455: "R&M Queretaro-San Luis: PPP highway concession for Queretaro-SLP route. Standard APP infrastructure SPV. 4.96B.",
    }
    for vid, note in ppp_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    # Government entities + parastatals
    govt_fps = {
        277937: "SEGURIDAD ALIMENTARIA MEXICANA (prev. SEGALMEX): Government parastatal food distributor. The Segalmex scandal involved corrupt officials/suppliers — SEGALMEX itself is the buyer, not the corrupt vendor. Ente publico.",
        196900: "POLICIA AUXILIAR DE LA CIUDAD DE MEXICO: Government security entity (Mexico City). Provides security to other agencies via inter-institutional agreements. Ente publico.",
    }
    for vid, note in govt_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    # Pharma patents
    pharma_fps = {
        40424: "UCB DE MEXICO: Mexican subsidiary of UCB S.A. (Belgian multinational pharma). Patented epilepsy/immunology drugs (Vimpat, Cimzia) to IMSS/ISSSTE. Patent-protected.",
        271387: "BIO PRODUCTS LABORATORY MEXICO: UK-based blood plasma manufacturer (Bain Capital). Immunoglobulins and coagulation factors — specialty biologics. Patent/regulatory monopoly.",
    }
    for vid, note in pharma_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_patent_exception=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    # IT distributors / broad-reach companies
    it_fps = {
        43335: "CADGRAFICS: IT reseller/services across 173 government institutions. Very high diversification, moderate SB (17%), standard IT distribution pattern.",
        2865: "GNR APOYO ESTRATEGICO: IT outsourcing company serving 47 institutions over 23 years. Broad diversification, 46% SB moderate for IT sector. Legitimate large IT services firm.",
    }
    for vid, note in it_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    # needs_review updates
    needs_review = {
        3204: "CONSTRUCTORA ARRENDADORA LOPEZ: 2.75B, 86% SB, 23yr, 10 institutions, Sinaloa regional construction. No RFC. CONAGUA+SCT+ports. Legitimate regional firm profile but SB rate elevated.",
        66: "CONSTRUCCIONES Y DRAGADOS DEL SURESTE: 4.25B, 87% SB, 45 contracts, 16 institutions. BANOBRAS 2.17B + CONAPESCA 587M 100% SB + Puebla state. Mixed: CONAPESCA capture suspicious, but broad reach.",
        10518: "CORPORATIVO LANIX: 1.48B, 17% SB, Mexican PC manufacturer. 1.19B SEP IT contract (2006) large for single award. Legitimate company but SEP concentration warrants review.",
        206649: "LOGEM OPERADORA MEXICANA DE ASISTENCIA UNIVERSAL: 1B, single contract for 'health services administration' via SAE (asset disposal agency). Unusual pairing of SAE + health services. Investigate.",
        13665: "ING. SISTEMAS SANITARIOS Y AMBIENTALES: 1.85B, 100% SB, 12 institutions, water treatment plants 2003-2021. Specialized niche but 100% SB at scale is elevated.",
    }
    for vid, memo in needs_review.items():
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review', memo_text=?
            WHERE vendor_id=? AND in_ground_truth=0
        """, (memo, vid))

    print(f"Marked {len(ppp_fps)} PPP FPs + {len(govt_fps)} govt FPs + {len(pharma_fps)} pharma FPs + {len(it_fps)} IT FPs")
    print(f"Marked {len(needs_review)} needs_review")

    conn.commit()
    print("\nCommitted.")

    # ── Verification ──────────────────────────────────────────────────────────
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max} | GT vendors: {total_v} | GT contracts: {total_c}")

    for case_str in [case_443_str, case_444_str, case_445_str]:
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        name = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {name[:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 443-445 inserted.")


if __name__ == "__main__":
    run()
