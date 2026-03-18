"""
ARIA Cases 456-460: March 17 2026 investigation session.

Cases:
  456: SOLUCIONES EN LIDERAZGO FARMACEUTICO - Pharma Intermediary 2025 Explosion (1.28B)
       9-year dormancy, then 1.23B in single year at ISSSTE/IMSS, risk 0.747-1.000
  457: VIAJES MEXICO AMIGO + VESTA CONTINENTAL - SEP Travel Capture Ring (917M + 852M)
       77%/60% DA, shared 700M+ procedures at SEP, no RFC, two agencies sharing the pie
  458: DROG-BA COMPANIA - SSISSSTE Hospital Cleaning Shell (1.39B)
       12-year dormant RFC (2009), then 1.34B hospital cleaning at SSISSSTE 2024-2025
  459: RAPAX SA DE CV - Cleaning Cartel Co-Bidder with GT DECOARO (1.08B)
       Founded 2017, co-bids with GT Case 17 DECOARO, IPN 529M cleaning monopoly
  460: CARE LAB (PROVEEDORA DE QUIMICOS Y MEDICAMENTOS) - Pharma Storage Intermediary (390M)
       2 single-bid SSA pharma storage contracts, classic intermediary capture

Also: FP markings (Gluyas, Dragamex, Cemex, Mapfre Tepeyac, Accor, Chubb, AGA Gas,
      Maiz Mier, Jaguar Ingenieros) + needs_review updates

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

    # ── Case 456: SOLUCIONES EN LIDERAZGO FARMACEUTICO ───────────────────────
    case_456_id = next_id
    case_456_str = f"CASE-{case_456_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_456_id, case_456_str,
        "SOLUCIONES EN LIDERAZGO FARMACEUTICO - Pharma Intermediary ISSSTE/IMSS Explosion",
        "procurement_fraud",
        "high",
        (
            "Classic pharma intermediary capture pattern at ISSSTE and IMSS. "
            "RFC SLF1006265D1 = incorporated June 2010. "
            "First government contract: July 2019 (9-year dormancy after RFC issuance). "
            "2025 explosion: 1.23B in a single year from near-zero (32M in 2023). "
            "ISSSTE 647M + IMSS 571M in 2025 consolidated medicine purchases. "
            "Risk scores: ISSSTE contracts 1.000, Hospital Gea Gonzalez 1.000, "
            "Hospital Juarez 1.000 — maximum possible scores. "
            "Co-bidders include Bayer, Landsteiner, GSK, Novartis — the company bids alongside "
            "established pharmaceutical manufacturers, suggesting it is positioned as an "
            "intermediary that wins consolidated tenders and resells at markup. "
            "Pattern mirrors CORPORACION SAIXA (GT Case 454): dormant RFC, sudden activation, "
            "then explosive growth in consolidated IMSS/ISSSTE medicine procurement. "
            "The 9-year dormancy followed by immediate mega-contract wins at maximum risk score "
            "is the signature pattern of a shell pharma intermediary."
        ),
        1_280_000_000,
        2019, 2025,
    ))
    print(f"Inserted case {case_456_id}: SOLUCIONES EN LIDERAZGO FARMACEUTICO")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_456_str, 246318,
          "SOLUCIONES EN LIDERAZGO FARMACEUTICO SA DE CV", "high", "aria_investigation"))

    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=246318").fetchall()
    for row in rows:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_456_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=246318
    """, (f"Pharma intermediary (Case {case_456_id}): 9yr dormancy, 1.23B 2025 explosion "
          f"at ISSSTE+IMSS. Risk 1.0 at hospitals. Same pattern as SAIXA.",))
    print(f"  Tagged {len(rows)} contracts for SOLUCIONES EN LIDERAZGO")

    # ── Case 457: VIAJES MEXICO AMIGO + VESTA CONTINENTAL (SEP travel ring) ──
    case_457_id = next_id + 1
    case_457_str = f"CASE-{case_457_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_457_id, case_457_str,
        "VIAJES MEXICO AMIGO + VESTA CONTINENTAL - SEP Travel Services Capture Ring",
        "procurement_fraud",
        "high",
        (
            "Two-company travel services capture ring at SEP (Secretaria de Educacion Publica). "
            "VIAJES MEXICO AMIGO SA DE CV (vendor_id=3727): "
            "43 contracts, 917M MXN, 77% DA rate, no RFC. "
            "SEP 686M (75% concentration). Major contracts: 500M single contract at SEP (2011). "
            "Dominant in 2011-2013 (780M in 3 years via DA), then dormant 2014-2022. "
            "VESTA CONTINENTAL SA DE CV (vendor_id=2552): "
            "87 contracts, 852M MXN, 60% DA rate. "
            "SEP 572M. Shares 3 mega-procedures with VIAJES MEXICO AMIGO. "
            "Key evidence: Both companies participated in procedure LA-011000999-N1-2011, "
            "which awarded 500M to VIAJES MEXICO AMIGO + 200M to VESTA CONTINENTAL = "
            "700M in a single SEP travel services procedure split between two related firms. "
            "Pattern: Two travel agencies carve up SEP government travel/events budget, "
            "alternating DA awards and sharing competitive procedures where they both 'compete' "
            "while locking out other providers. "
            "Combined ring value: 917M + 852M = 1.77B MXN from SEP travel services."
        ),
        1_769_000_000,
        2002, 2023,
    ))
    print(f"Inserted case {case_457_id}: SEP travel ring (VIAJES + VESTA)")

    for vid, vname, strength in [
        (3727, "VIAJES MEXICO AMIGO SA DE CV", "high"),
        (2552, "VESTA CONTINENTAL SA DE CV", "high"),
    ]:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)
        """, (case_457_str, vid, vname, strength, "aria_investigation"))
        rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
        for row in rows:
            conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                         (case_457_str, row[0]))
        conn.execute("""
            UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
            WHERE vendor_id=?
        """, (f"SEP travel ring (Case {case_457_id}): 77%/60% DA, shared 700M procedure with partner. "
              f"No RFC. SEP travel services cartel.", vid))
        n = conn.execute("SELECT COUNT(*) FROM contracts WHERE vendor_id=?", (vid,)).fetchone()[0]
        print(f"  Tagged {n} contracts for vendor {vid} ({vname[:40]})")

    # ── Case 458: DROG-BA COMPANIA ────────────────────────────────────────────
    case_458_id = next_id + 2
    case_458_str = f"CASE-{case_458_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_458_id, case_458_str,
        "DROG-BA COMPANIA - SSISSSTE Hospital Cleaning Shell Company",
        "ghost_company",
        "high",
        (
            "Shell company receiving massive hospital cleaning contracts at SSISSSTE "
            "(Sistema de Seguridad Social del ISSSTE). "
            "RFC DRO0905227B6 = incorporated May 2009. "
            "First government contract: October 2021 (12-year dormancy). "
            "2024-2025 explosion: 1.34B in hospital cleaning at SSISSSTE hospitals. "
            "Contract progression: 43M SAT cleaning (2022) → 619M SSISSSTE hospital (2024) "
            "→ 572M SSISSSTE hospital (2025) → 152M SSISSSTE hospital (2025+). "
            "The escalation from a small 43M government cleaning contract to 619M and 572M "
            "hospital cleaning contracts within 2 years is a classic shell company trajectory: "
            "build minimal credibility with small contracts, then capture large institutional ones. "
            "SSISSSTE hospital cleaning is a known vector for procurement fraud — "
            "the LAMAP/ARMOT ring (GT Case 228) and LIMPIEZA JORED (GT Case 438) follow "
            "the same pattern at IMSS and related health institutions. "
            "12-year dormant RFC + immediate mega-contract wins at hospitals = P2 Ghost Company."
        ),
        1_390_000_000,
        2021, 2025,
    ))
    print(f"Inserted case {case_458_id}: DROG-BA COMPANIA SSISSSTE cleaning")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_458_str, 277201, "DROG-BA COMPANIA SA DE CV", "high", "aria_investigation"))

    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=277201").fetchall()
    for row in rows:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_458_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=277201
    """, (f"SSISSSTE cleaning shell (Case {case_458_id}): RFC 2009, 12yr dormancy, then "
          f"1.34B hospital cleaning 2024-2025. Ghost company trajectory.",))
    print(f"  Tagged {len(rows)} contracts for DROG-BA COMPANIA")

    # ── Case 459: RAPAX SA DE CV ──────────────────────────────────────────────
    case_459_id = next_id + 3
    case_459_str = f"CASE-{case_459_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_459_id, case_459_str,
        "RAPAX SA DE CV - Cleaning Cartel Co-Bidder with GT DECOARO (Case 17)",
        "procurement_fraud",
        "high",
        (
            "Cleaning services company in a bid-rigging network connected to GT Case 17 "
            "(DECOARO Y SUPERVISION SA DE CV, 'DECOARO Ghost Cleaning Company'). "
            "RFC RAP171108U90 = incorporated November 2017. "
            "First contract March 2018 (4 months after incorporation). "
            "1.08B MXN across 33 institutions in 4 years: "
            "IPN (Instituto Politecnico Nacional) 529M, FGR 89M, SHCP 66M, SICT 46M, SAT 46M. "
            "Co-bids with DECOARO Y SUPERVISION (VID=239647, GT Case 17) — the IPN Cartel "
            "de la Limpieza case documented how DECOARO and ring members captured IPN cleaning "
            "through coordinated bidding. RAPAX shares competitive procedures with DECOARO, "
            "participating as a cover bidder in the same IPN procedures. "
            "The 529M concentration at IPN (49% of total value) mirrors DECOARO's own "
            "IPN concentration, and the co-bidding relationship confirms they are "
            "coordinating bids rather than genuinely competing. "
            "Pattern: P2/P3 cleaning cartel with institutional capture at IPN."
        ),
        1_080_000_000,
        2018, 2022,
    ))
    print(f"Inserted case {case_459_id}: RAPAX cleaning cartel")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_459_str, 226249, "RAPAX SA DE CV", "high", "aria_investigation"))

    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=226249").fetchall()
    for row in rows:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_459_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=226249
    """, (f"Cleaning cartel DECOARO network (Case {case_459_id}): RFC Nov 2017, co-bids "
          f"with GT DECOARO (Case 17), IPN 529M, 33 institutions. 1.08B.",))
    print(f"  Tagged {len(rows)} contracts for RAPAX")

    # ── Case 460: CARE LAB ────────────────────────────────────────────────────
    case_460_id = next_id + 4
    case_460_str = f"CASE-{case_460_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_460_id, case_460_str,
        "CARE LAB (PROVEEDORA DE QUIMICOS Y MEDICAMENTOS) - Pharma Storage Intermediary",
        "procurement_fraud",
        "medium",
        (
            "Pharmaceutical storage/logistics intermediary capturing SSA contracts. "
            "RFC PQM140212C74 = incorporated February 2014. "
            "3 contracts, 390M MXN: 384M at Secretaria de Salud (pharma warehousing/storage), "
            "plus 6M at IMSS. "
            "The 2 SSA contracts were won via single-bid licitacion publica: "
            "the company positioned as the only bidder for specialized pharmaceutical "
            "storage and cold chain logistics services. "
            "A 'Proveedora de Quimicos y Medicamentos' (chemical and medicine supplier) "
            "winning pharma storage contracts at the federal health ministry via single bid "
            "is consistent with intermediary capture: the company may be positioned as "
            "a logistics operator taking a margin on pharmaceutical supply chain services. "
            "Confidence medium: few contracts make pattern harder to confirm, but the "
            "values (384M via 2 SB wins) are large for a company with minimal history."
        ),
        384_000_000,
        2018, 2022,
    ))
    print(f"Inserted case {case_460_id}: CARE LAB pharma storage")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_460_str, 300224,
          "PROVEEDORA DE QUIMICOS Y MEDICAMENTOS (CARE LAB) SA DE CV", "medium", "aria_investigation"))

    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=300224").fetchall()
    for row in rows:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_460_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=300224
    """, (f"Pharma storage intermediary (Case {case_460_id}): 384M via 2 SB wins at SSA. "
          f"RFC 2014. Medicine/chemical supplier winning pharma storage contracts.",))
    print(f"  Tagged {len(rows)} contracts for CARE LAB")

    # ── False positives ───────────────────────────────────────────────────────
    structural_fps = {
        10303: "GLUYAS CONSTRUCCIONES: 21yr Sonora highway specialist (100% SB but thin regional market). Road construction in Sonoran desert: SCT/SICT 2B + CAPUFE 830M + Sonora state. Moderate avg risk (0.347-0.360). Regional infra firm.",
        24: "DRAGAMEX: Marine dredging specialist. 100% SB is structural — Mexican dredging market has ~10 providers. Port authorities across Mexico. Specialized heavy equipment (suction dredgers). Dredging contracts not competitively multi-bid.",
        7370: "CEMEX CONCRETOS: CEMEX subsidiary (Mexico's publicly-traded global cement leader). Ready-mix concrete and aggregates to infrastructure projects. Legitimate market leader. 161 contracts, 7.7B.",
        23234: "MAPFRE TEPEYAC: Major insurance company (Mapfre, Spanish multinational). Government asset/property/vehicle insurance. Regulated insurance market oligopoly. 85 contracts, 3.8B.",
        654: "ACCOR SERVICIOS EMPRESARIALES: Accor (French multinational, hotel/hospitality group). Government meal vouchers and employee benefit services (like Sodexo). Structural oligopoly in Mexican voucher market. 237 contracts, 3.1B.",
        45723: "CHUBB SEGUROS: Major insurance company (Chubb Ltd, US multinational). Government insurance procurement. Regulated insurance market, few qualified providers. 229 contracts, 610M.",
        4675: "AGA GAS SA DE CV: AGA Gas is a subsidiary of Linde plc (German industrial gas multinational). Specialized industrial gases (oxygen, nitrogen, acetylene) for hospitals and industrial facilities. Structural oligopoly in industrial gas market. 140 contracts, 980M.",
        20748: "CONSTRUCTORA MAIZ MIER: Established Nuevo Leon road construction company with long operating history. 92% SB reflects regional specialty construction (thin market in NL/northeast Mexico). 53 contracts, 3.2B.",
        21050: "JAGUAR INGENIEROS SA DE CV: SCT highway contractor, 2005-2025 (20yr history). 55 contracts, 4.2B, 8 institutions, 78% SB. Long-established regional infrastructure firm. SB reflects highway specialization, not bid rigging.",
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    print(f"Marked {len(structural_fps)} structural FPs")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        73857: "PHARMATH DE MEXICO: 1.6B HIV diagnostics specialist, 55% IMSS, 23 institutions, 13 co-bidders. Competitive market detected. Legitimate diagnostic reagent distributor.",
        1516: "BIODIST: 8.0B lab/blood bank services, 1118 contracts, 57 institutions, 23yr history. 2023-2025 explosion (6.18B in 3yr) needs investigation. Competitive market with 130+ co-bidders.",
        180750: "CAFE BERSA: 1.7B hospital food services, SSISSSTE 954M, 69 contracts. Outsourced catering for hospitals. Moderate DA (36%). Not clearly corrupt but concentration at SSISSSTE.",
        503: "INTEGRADORES DE TECNOLOGIA: 3.2B, 95 contracts, hacienda sector. IT integration — investigate product type and concentration.",
        12903: "AUTOANGAR SA DE CV: 2.9B vehicle procurement (police cars, military trucks). SEDENA 1.3B + Guardia Nacional 957M. Possible legitimate vehicle dealer or defense procurement capture.",
        33216: "EDIFICACIONES 3 RIOS: 1.4B, 12 contracts, 70% SB, infrastructure. Small company with concentrated large contracts.",
        102190: "INT INTELLIGENCE AND TELECOM SA DE CV: 800M, 37 contracts, 50% SB, defensa sector. Surveillance/telecom for military — possible structural monopoly or capture.",
        60718: "PROINFRA SA DE CV: 600M, 6 contracts, 100% SB, CONAGUA 465M single contract. Very few contracts but large — investigate.",
        236758: "COMERCIALIZADORA DOPAJ SA DE CV: RFC CDO160301U25 (2016), 691M, ISSSTE 575M, 43 contracts. Education-sector classification but ISSSTE serving = intermediary?",
        139671: "TELEMATICA LEFIC SA DE CV: 190M, 7 contracts, 70% DA, FGR 174M for 'data center maintenance'. Small company with one mega FGR contract.",
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

    for case_str in [case_456_str, case_457_str, case_458_str, case_459_str, case_460_str]:
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        name = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {name[:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 456-460 inserted.")


if __name__ == "__main__":
    run()
