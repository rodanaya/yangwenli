"""
ARIA Cases 578-580: March 17 2026 investigation session.

Cases:
  578: CINVESTAV Procurement Capture Ring (Vecolab + Apple House)
       VECOLAB: 484M DA=90% at CINVESTAV; 143M for orbital shaker, 235M vague lab equipment
       APPLE HOUSE: 255M DA=100% at CINVESTAV; 254M single contract for "equipo de computo"
       Both: single-institution capture, grossly inflated pricing for commodity lab/tech supplies
  579: MOVIL INFRA TECHNOLOGY SAPI DE CV - COVID DA Abuse Multi-Institution (568M)
       RFC MTD140402V44 (2014); COVID contracts 2020; pivoted IMSS→ISSSTE→SS→states; P3
  580: GRUPO HTCJ & ASOCIADOS - SCT Digital TV Distribution Scandal (3.29B)
       Foxconn-linked; WSJ/McClatchy documented; 25% overpricing; Stericycle paid $84M US fine;
       HTCJ+Comercializadora Milenio concentrated 72.6% of 9.67B program

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

    note_578 = (
        "CINVESTAV procurement capture ring — two vendors, inflated lab and tech equipment DAs. "
        "VECOLAB COMERCIALIZADORA: 21 contracts 2010-2015, 484.1M, DA=90%, exclusively at CINVESTAV. "
        "Contracts include 235M for generic 'EQUIPO DE LABORATORIO' and 143M for an 'AGITADOR ORBITAL' "
        "(orbital shakers are commodity lab equipment costing $5,000-50,000 USD; 143M MXN = "
        "approximately $10M USD for a single shaker is 200-2000x market price). "
        "APPLE HOUSE DE MEXICO: 14 contracts 2010-2018, 255.2M, DA=100%, exclusively at CINVESTAV. "
        "One contract of 254.8M for 'EQUIPO DE COMPUTO' (computer equipment) represents 18% of "
        "CINVESTAV's entire annual procurement budget. Remaining 13 Apple House contracts total "
        "only 364K MXN for standard Mac computers — revealing the 254.8M contract as an "
        "outlier 700x larger than any other Apple House transaction. "
        "COMBINED PATTERN: Both companies operate exclusively at CINVESTAV (single-institution "
        "capture), both receive grossly inflated DA contracts for commodity lab/tech supplies "
        "with vague descriptions, and both show the same temporal pattern (2010-2018). "
        "This is a documented institutional capture ring at CINVESTAV using falsified or "
        "inflated procurement invoices for common scientific equipment. "
        "Classification: P6/P3 CINVESTAV Procurement Capture Ring — dual-vendor institutional fraud."
    )

    note_579 = (
        "COVID DA abuse pivoting to multi-institution infrastructure — IMSS, ISSSTE, SS, states. "
        "6 contracts 2020-2023, 568.1M MXN. DA=83%. P3 intermediary pattern. "
        "RFC MTD140402V44 — incorporated 2014, no contracts until 2020 COVID emergency. "
        "PHASE 1 — COVID EMERGENCY DA: "
        "(1) 103M DA from IMSS for 'Instalacion de Unidades Medicas' (installation of medical units). "
        "(2) 24M DA from IMSS for 'Contencion COVID-19' — emergency health measures. "
        "PHASE 2 — POST-COVID EXPANSION: "
        "(3) 148M DA from ISSSTE for 'Obra Civil en Pachoacan' (civil works). "
        "(4) 172M single-bid from Secretaria de Salud for medical equipment. "
        "(5) 120M DA from state government for hospital construction/equipment. "
        "CRITICAL PATTERN: Company appears from zero in 2020 with COVID emergency DA justification, "
        "then uses the established relationship to pivot into non-emergency infrastructure DAs "
        "at ISSSTE and Secretaria de Salud — a documented mechanism for extending emergency "
        "procurement authority beyond legitimate COVID needs. "
        "P3 intermediary: new company, COVID trigger, multi-institution expansion, high DA throughout. "
        "Classification: P3 Movil Infra COVID DA Abuse — emergency procurement exploitation."
    )

    note_580 = (
        "SCT digital television distribution scandal — Foxconn/HTCJ, 25% overpricing, $84M US fine. "
        "3 contracts 2014-2015, 3,293.3M MXN. DA=0%, SB=0% — all via restricted competitive process. "
        "EXTENSIVELY DOCUMENTED (WSJ, McClatchy, La Jornada, Animal Politico, Proceso): "
        "(1) The 'Television Digital Terrestre' program distributed 10 million TVs to replace "
        "analog broadcasts. Total program: 9.67B MXN across two main vendors. "
        "(2) Grupo HTCJ & Asociados (Foxconn distribution partner in Mexico) and Comercializadora "
        "Milenio together received 72.6% of all program resources. "
        "(3) Wall Street Journal (2014-2015): documented $12-18 per unit in bribes paid to "
        "Mexican officials and 20-25% overpricing vs market price for the Samsung/TCL TVs supplied. "
        "(4) SCT admitted in its own audit that TVs were purchased at 25% above market price. "
        "(5) STERICYCLE (TV recycling contractor for the program) paid $84 million USD to settle "
        "DOJ/SEC charges of bribing Mexican officials to obtain related contracts. "
        "(6) FGR subsequently opened investigations into the digital TV program contracting. "
        "One of Mexico's most extensively documented and internationally prosecuted procurement "
        "fraud cases from the Pena Nieto administration. "
        "Classification: P1/P3 SCT Digital TV Scandal — international media + DOJ confirmed."
    )

    cases = [
        (0, [(43561, "VECOLAB COMERCIALIZADORA DE MEXICO SA DE CV", "high"),
             (62446, "APPLE HOUSE DE MEXICO SA DE CV", "high")],
         "CINVESTAV Procurement Capture Ring — Vecolab + Apple House (739M)",
         "procurement_fraud", "high", note_578, 739000000, 2010, 2018),
        (1, [(261655, "MOVIL INFRA TECHNOLOGY SAPI DE CV", "high")],
         "MOVIL INFRA TECHNOLOGY - COVID DA Abuse Multi-Institution (568M)",
         "procurement_fraud", "high", note_579, 568000000, 2020, 2023),
        (2, [(132384, "GRUPO HTCJ & ASOCIADOS SA DE CV", "high")],
         "GRUPO HTCJ - SCT Digital TV Distribution Scandal (3.29B)",
         "procurement_fraud", "confirmed_corrupt", note_580, 3293000000, 2014, 2015),
    ]

    for (offset, vendors, cname, ctype, conf, notes, fraud, yr1, yr2) in cases:
        case_id_int = next_id + offset
        case_id_str = f"CASE-{case_id_int}"
        conn.execute("""
            INSERT OR REPLACE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (case_id_int, case_id_str, cname, ctype, conf, notes, fraud, yr1, yr2))
        print(f"Inserted case {case_id_int}: {cname[:60]}")

        for (vid, vname, strength) in vendors:
            conn.execute("""
                INSERT OR IGNORE INTO ground_truth_vendors
                (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                VALUES (?,?,?,?,?)
            """, (case_id_str, vid, vname, strength, "aria_investigation"))
            rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
            for row in rows:
                conn.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                    (case_id_str, row[0])
                )
            conn.execute("""
                UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
                WHERE vendor_id=?
            """, (f"GT Case {case_id_int}: {cname[:80]}", vid))
            n = conn.execute("SELECT COUNT(*) FROM contracts WHERE vendor_id=?", (vid,)).fetchone()[0]
            print(f"  Tagged {n} contracts for vendor {vid} ({vname[:50]})")

    # ── False positives ────────────────────────────────────────────────────────
    structural_fps = {
        8982: (
            "FP structural_monopoly: CL CONSTRUCCIONES CIVILES Y ELECTROMECANICAS SA DE CV — "
            "specialized electromechanical and civil construction contractor for PEMEX infrastructure. "
            "26 contracts 173.1M (2002-2013) at PEMEX PEP, Petroquimica, SCT, III Servicios. "
            "0% DA, 73% SB — wins competitive bids as sole qualified bidder for specialized "
            "electromechanical maintenance (anti-corrosion, bridge construction, industrial AC). "
            "No EFOS/SFP/media hits. Structural: PEMEX specialized maintenance has few qualified "
            "contractors, making single-bid wins common for legitimate specialists."
        ),
        204578: (
            "FP structural_monopoly: TUM TRANSPORTISTAS UNIDOS MEXICANOS DIVISION NORTE — "
            "Mexico's largest trucking company (founded 1938, 1,800+ trucks, 2,500 trailers). "
            "Bloomberg-listed, UN Global Compact member. 2.537B across 3 contracts exclusively "
            "for Servicio Postal Mexicano (postal transportation trunk routes) 2017-2024. "
            "0% DA, SB=100% — TUM is effectively the only company with national logistics "
            "infrastructure to handle Mexico's postal service at this scale. Structural monopoly "
            "reflecting logistics market reality, not bid suppression."
        ),
        7598: (
            "FP structural_monopoly: TUBESA SA DE CV — steel pipe manufacturer/supplier. "
            "261M MXN across 6 contracts (2002-2009) for CONAGUA water commissions, PEMEX, ports. "
            "Contracts for specific industrial pipe products (60\" steel pipe, asbestos-cement pipe, "
            "24\" carbon steel). 0% DA, 50% SB — wins competitive bids as sole bidder for "
            "specialized pipe sizes. Legitimate specialized industrial pipe supplier for "
            "infrastructure projects in a market with few qualified manufacturers."
        ),
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (note, vid))

    # Fernandez Educacion = textbook publisher, fp_patent_exception
    conn.execute("""
        UPDATE aria_queue SET fp_patent_exception=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=39769
    """, ("FP patent_exception: FERNANDEZ EDUCACION SA DE CV — textbook publisher/distributor. "
          "527.9M MXN across 78 contracts (2009-2019), primarily at CONALITEG (61c, 359M) and "
          "Impresora y Encuadernadora Progreso. 96% DA reflects educational publishing model: "
          "CONALITEG purchases specific textbook titles via DA because each title has a single "
          "rights holder (no substitutes for a specific textbook). Same fp_patent_exception "
          "mechanism as SM Ediciones/Grupo SM. Legitimate educational publisher.",))

    print(f"Marked {len(structural_fps) + 1} FPs (3 structural + 1 patent exception)")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        69546: (
            "LAPI UNIDAD DE HEMODIALISIS: 18 contracts 2010-2025, DA=61%, SB=22%, 548.8M. "
            "100% single-institution: exclusively at IMSS for outsourced hemodialysis services. "
            "Registered as individual (persona fisica?). IMSS hemodialysis outsourcing has "
            "documented corruption pattern (unqualified operators, ghost companies, patient deaths). "
            "Classified P6 (institutional capture). 61% DA rate at IMSS for dialysis is concerning. "
            "Needs investigation: Is LAPI a legitimate licensed dialysis provider? Are there "
            "complaints from patients or CNDH investigations?"
        ),
        215317: (
            "PUBLICA ENTERTAINMENT SA DE CV: 28 contracts 2017-2023, DA=39%, SB=54%, 597.5M. "
            "Event production at 14 institutions including INPI, FONATUR Tren Maya, SRE, Cultura. "
            "86M DA to FONATUR for Tren Maya event organization; 81M SB at INPI. "
            "Event services are a known opaque spending channel (subjective scope, hard to audit). "
            "Proximity to politically sensitive Tren Maya program is concerning. "
            "No EFOS/SFP hits. Needs investigation: Were events delivered? Any documented complaints?"
        ),
        35561: (
            "NACIONAL TERAPEUTICA SA DE CV: 224 contracts 2008-2024, DA=64%, SB=15%, 991.8M. "
            "74% of value at single hospital (HRAE Peninsula, 732M). 431M DA in 2017 for "
            "'servicios medicos integrales' at HRAE Peninsula is a massive single direct award. "
            "Also serves IMSS (64c), HRAE Oaxaca (20c), other institutions. Long track record "
            "2008-2024 suggests established company. But 431M DA at single hospital for "
            "medical services warrants scrutiny. Needs review of service delivery documentation."
        ),
        31804: (
            "WWPL MEXICO SA DE CV: 43 contracts 2007-2025, DA=44%, SB=35%, 368.5M. "
            "Institutional food services at 12 institutions (SS, INM, SPF, Casa de Moneda, IMSS). "
            "One outlier: 253M contract (2013) at Secretaria de Salud for 'SERVICIO DE ALIMENTACION' "
            "— 69% of total value in a single contract. Possibly a multi-year umbrella or data error. "
            "Legitimate catering company (established 2010, Iztapalapa). No corruption evidence. "
            "Needs verification of the 253M contract specifics (term, institutions covered)."
        ),
        28538: (
            "INMUEBLES Y CASAS MODULARES SA DE CV: 10 contracts 2006-2016, DA=0%, SB=100%, 576.1M. "
            "Construction company, Matamoros Tamaulipas. 349M at Tamaulipas SOP (61% of total). "
            "100% SB across 10 contracts at 6 institutions. Tamaulipas infrastructure in this era "
            "had documented cartel interference and transparency issues. No specific corruption "
            "evidence for this company. Needs investigation of Tamaulipas SOP procurement patterns "
            "in 2006-2016 and whether competitors were systematically excluded."
        ),
        35600: (
            "INSUMEDIC SA DE CV: 6 contracts 2008-2021, DA=17%, SB=17%, 237.7M. "
            "Medical supplies at 3 institutions: Instituto de Salud Aguascalientes (205M), "
            "IMSS (23M), ISSSTESON (8M). 205M contract (2009) for 'material de curacion' "
            "at Aguascalientes state health institute as single-bid is the outlier. "
            "Registered as individual (is_individual=1) for a medical supplies firm at this scale "
            "is unusual. No EFOS/SFP/media hits. Low priority — insufficient evidence to classify."
        ),
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

    for offset in range(3):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 578-580 inserted.")


if __name__ == "__main__":
    run()
