"""
ARIA Cases 439-440: March 17 2026 investigation session.

Cases:
  439: CONSTRUCCIONES PEREZ Y GIL - CONAGUA Water Infrastructure Capture (3.19B)
       91.5% SB rate, zero co-bidders, no RFC, 95% CONAGUA concentration
  440: J.P.G. CONSTRUCCIONES - SCT Highway Construction Monopoly (6.17B)
       81% SB rate, 10/10 SB at SCT, no RFC, 16 contracts avg 386M each

Also: FP markings (3 pharma, 3 public institutions, 2 structural monopolies)
      + needs_review updates for 11 vendors

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

    # ── Case 439: CONSTRUCCIONES PEREZ Y GIL ─────────────────────────────────
    case_439_id = next_id
    case_439_str = f"CASE-{case_439_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_439_id, case_439_str,
        "CONSTRUCCIONES PEREZ Y GIL - CONAGUA Water Infrastructure Institutional Capture",
        "procurement_fraud",
        "high",
        (
            "Extreme institutional capture at CONAGUA (Comision Nacional del Agua). "
            "No RFC registered despite 3.19B MXN across 47 contracts over 22 years (2002-2024). "
            "91.5% single-bid rate — 34 percentage points above CONAGUA's already-high 57% SB average. "
            "89% SB at CONAGUA specifically (31/35 contracts won without competition). "
            "95% value concentration at CONAGUA (3.04B of 3.19B). "
            "Zero co-bidders identified — never shared a competitive procedure with any other vendor. "
            "Explosive late growth: 1.15B in 2022 (4 infrastructure contracts) + 661M in 2023, "
            "representing 56% of lifetime contract value in the final 3 years. "
            "Primary focus: water infrastructure in Michoacan/central Mexico "
            "(CONAGUA + Michoacan state water agencies + municipal water commissions). "
            "Pattern: textbook P6 Institutional Capture + P1 Monopoly. "
            "No legitimate contractor operating for 22 years with 3.19B should lack an RFC. "
            "The zero co-bidder profile means CONAGUA held competitive procedures with "
            "a predetermined winner every single time."
        ),
        3_036_000_000,
        2002, 2024,
    ))
    print(f"Inserted case {case_439_id}: CONSTRUCCIONES PEREZ Y GIL")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_439_str, 3338, "CONSTRUCCIONES PEREZ Y GIL SA DE CV", "high", "aria_investigation"))

    rows_439 = conn.execute("SELECT id FROM contracts WHERE vendor_id=3338").fetchall()
    for row in rows_439:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_439_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=3338
    """, (f"CONAGUA capture (Case {case_439_id}): No RFC, 91.5% SB (34pp above avg), "
          f"zero co-bidders, 95% CONAGUA concentration, 1.8B in final 3 years.",))
    print(f"  Tagged {len(rows_439)} contracts for CONSTRUCCIONES PEREZ Y GIL")

    # ── Case 440: J.P.G. CONSTRUCCIONES ──────────────────────────────────────
    case_440_id = next_id + 1
    case_440_str = f"CASE-{case_440_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_440_id, case_440_str,
        "J.P.G. CONSTRUCCIONES - SCT Highway Construction Monopoly",
        "procurement_fraud",
        "high",
        (
            "Massive institutional capture at SCT (Secretaria de Comunicaciones y Transportes). "
            "No RFC registered despite 6.17B MXN across 16 contracts. "
            "81% overall single-bid rate; 100% single-bid at SCT (10 of 10 SCT contracts). "
            "6.16B concentrated at SCT alone — 99.8% of lifetime contract value. "
            "16 contracts averaging 386M MXN each — suspiciously uniform contract sizes for "
            "a company supposedly winning diverse highway construction procedures. "
            "Pattern mirrors CONAGUA water construction monopolies (PEREZ Y GIL, PAJEME): "
            "a single construction company captures the competitive procedures at a single "
            "infrastructure ministry through consistently unopposed bids. "
            "No RFC after 6.17B in government contracts is a severe red flag — "
            "every legitimate contractor at this scale is required to have a tax ID. "
            "SCT manages Mexico's highway and transport infrastructure — "
            "capture of SCT construction contracts allows massive billing for "
            "infrastructure that may be overpriced or partially delivered. "
            "Classification: P1 Monopoly + P6 SCT Institutional Capture."
        ),
        6_160_000_000,
        2010, 2025,
    ))
    print(f"Inserted case {case_440_id}: J.P.G. CONSTRUCCIONES SCT monopoly")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_440_str, 22870, "J.P.G. CONSTRUCCIONES SA DE CV", "high", "aria_investigation"))

    rows_440 = conn.execute("SELECT id FROM contracts WHERE vendor_id=22870").fetchall()
    for row in rows_440:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_440_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=22870
    """, (f"SCT monopoly (Case {case_440_id}): No RFC, 10/10 SB at SCT, "
          f"6.17B in 16 contracts avg 386M each. 100% SCT concentration.",))
    print(f"  Tagged {len(rows_440)} contracts for J.P.G. CONSTRUCCIONES")

    # ── False positives ───────────────────────────────────────────────────────
    # Pharma patent exceptions
    pharma_fps = {
        266860: ("fp_patent_exception", "Organon: Global pharma company (MSD/Merck spinoff). Patented medicines to IMSS/INSABI/IMSS-BIENESTAR. RFC VCM1911309C9."),
        13890: ("fp_patent_exception", "GlaxoSmithKline Mexico: Top-5 global pharma. Vaccines/medicines to SSA. Patent-protected products."),
        36267: ("fp_patent_exception", "Sanofi Pasteur: World's largest vaccine manufacturer. IMSS/SSA vaccine procurement. Structural oligopoly by regulation."),
    }
    for vid, (fp_col, note) in pharma_fps.items():
        conn.execute(f"""
            UPDATE aria_queue SET {fp_col}=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    # Structural monopoly FPs: public institutions + regulated monopolies
    structural_fps = {
        507: "PRESTACIONES UNIVERSALES: Meal/fuel voucher company. Oligopolistic market (Edenred, Sodexo, Efectivale). 88 institutions = voucher distribution signature.",
        258143: "CFE DISTRIBUCION EPS: Government CFE subsidiary. 2.6B contract = inter-government agreement for Banco del Bienestar electrical infrastructure. Ente publico.",
        260282: "INER (Inst. Nal. Enfermedades Respiratorias): Government hospital. COVID testing to INSABI/IMSS-BIENESTAR via inter-institutional agreement.",
        43206: "IPICYT: Public federal research institution (CONACYT). Research services to government agencies. Ente publico.",
        16439: "COLEGIO DE POSTGRADUADOS: Public academic institution. Agricultural research services to SAGARPA/SADER. Ente publico.",
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    print(f"Marked {len(pharma_fps)} pharma FPs + {len(structural_fps)} structural FPs")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        2671: "PROYECTOS Y CONSTRUCCIONES URISA: 5.34B, 78.3% SB, no RFC, 23-yr CONAGUA water construction. Same pattern as PEREZ Y GIL but lower concentration (1% CONAGUA share). 1.1B airport contract complicates picture.",
        56590: "EXINSA: 1.01B, 100% SB, no RFC, 93% at Q.Roo Water Commission (CAPA). But CAPA itself has 95.8% SB overall — institutional problem. 805M single-day contract 2011-11-07.",
        98356: "SERVICIOS ESPECIALIZADOS INVESTIGACION Y CUSTODIA: 3.59B security firm, 19 institutions (IMSS/FGR/INBAL/SAE/SAT). Explosive growth 2017-2022 (1M→781M/yr), collapse 2024. Possible sexenio-linked capture.",
        7191: "MEXALIT INDUSTRIAL: 1.79B, 68% SB, no RFC, ambiente sector. Likely CONAGUA water construction — investigate for PEREZ Y GIL pattern.",
        43182: "TECNOPROGRAMACION HUMANA DE VERACRUZ: 590M, 77% DA, STPS IT leasing monopoly. Veracruz-based outsourcing/IT leasing at single institution. High DA concerning.",
        522: "FARMACIAS EL FENIX DEL CENTRO: 2.92B, 23% DA, 36% SB, 107 contracts salud sector. Large pharmacy chain or suspect distributor — needs institution breakdown.",
        285417: "LAB MEDICO TADEO: 730M in 3 contracts, ALL SB (100%), 419M single contract at SSA. RFC present (LMT0508188F9). Integral laboratory services monopoly.",
        277529: "MAIN CORE SA DE CV: 840M, RFC 2018 incorporation, 'fabrica de software' services. IFT (337M) + IMSS. Young company, explosive growth. Software factory = common overpricing vector.",
        650: "SCITUM SA DE CV: 4.60B, 54% SB, 133 contracts, Telmex/Carlos Slim ecosystem. 2.3B at SAT alone. Large legitimate IT player but SAT concentration and SB rate warrant monitoring.",
        246010: "DISTRIBUIDORA MEDICA DAPORT: 950M, 54% DA, medical services to INDEP/Banco Bienestar/Loteria/IMSS. Diverse services (surgery/pharmacy/medical) suggest legitimate mid-size — but DA rate concerning.",
        110604: "PERSONAS Y PAQUETES POR AIRE: 2.0B, SEDENA aviation platforms. 1.36B competitive SB + 619M DA extension. No RFC. Defense specialization limits vendor pool.",
    }
    for vid, memo in needs_review.items():
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review', memo_text=?
            WHERE vendor_id=? AND in_ground_truth=0
        """, (memo, vid))

    print(f"Marked {len(needs_review)} vendors as needs_review")

    conn.commit()
    print("\nCommitted.")

    # ── Verification ──────────────────────────────────────────────────────────
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max} | GT vendors: {total_v} | GT contracts: {total_c}")

    for case_str in [case_439_str, case_440_str]:
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        name = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {name[:60]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 439-440 inserted.")


if __name__ == "__main__":
    run()
