"""
ARIA Cases 535-540: March 17 2026 investigation session.

Cases:
  535: NAL MERCADERES UNIDOS DEL NORTE - DICONSA Warehouse Capture (184M)
       RFC NMU181116PD1 (Nov 2018), 10c ALL DA ALL DICONSA, deposito mercantil 2021-2023
  536: GREGANTHI BEA - SIAP Agricultural Data Monopoly (184M)
       RFC GBE120117U92, 3c SB=100% ALL SIAP, data collection surveys 2019-2021
  537: GENERICORP - IMSS Pharmaceutical DA Capture (198M)
       RFC GEN141017BH5, 104c DA=100% ALL IMSS, medications 2023-2025
  538: ALTA TECNOLOGIA EN RESONANCIA Y SERVICIOS MEDICOS - IMSS-BIENESTAR Outsourcing Capture (597M)
       RFC ATR131210JN4, 13c DA=92% ALL IMSS-BIENESTAR, MRI+pathology+surgery 2024-2025
  539: MEDIC LEASE - IMSS Medical Equipment Leasing Capture (202M)
       No RFC, 38c DA=71% ALL IMSS, 181M single 2016 lease + smaller contracts
  540: CERTEZA LABORATORIO CLINICO - IMSS Hemodialysis Capture with Documented Failures (781M)
       15yr, 50c DA=52% 98%IMSS, hemodialysis subrogada, clinic shut for safety failures yet kept receiving DA

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

SEGALMEX_CARTEL = (
    "Part of the SEGALMEX/DICONSA food distribution cartel. "
    "Co-vendors include: COMERCIALIZADORA COLUMBIA (confirmed_corrupt), "
    "AGRO SERVICIOS A PRODUCTORES DEL VALLE (GT), MERCANTA (GT), "
    "LONJA AGROPECUARIA DE JALISCO (Case 522), ALMACEN DE GRANOS DE LA PENINSULA (Case 530), "
    "DAGER LOGISTICA Y COMERCIO (Case 526), ALMACENADORA SUR (Case 521). "
    "All win through direct awards at DICONSA/SEGALMEX/APB food program agencies."
)

IMSS_DA_RING = (
    "Part of the IMSS pharmaceutical/medical DA capture ring. "
    "Pattern: near-total direct awards at IMSS, competitive procurement elsewhere, "
    "industry mismatch or opaque name, no RFC or recent incorporation. "
    "Related cases: EVOLUTION PROCES (Case 520), MEDIVIDA (Case 533), "
    "MED SALUS (Case 534), GENERICORP (Case 537), ALTA TECNOLOGIA EN RESONANCIA (Case 538), "
    "MEDIC LEASE (Case 539), CERTEZA LABORATORIO CLINICO (Case 540)."
)


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    note_535 = (
        "DICONSA warehouse capture — new shell, near-total direct awards. "
        "RFC: NMU181116PD1 (founded November 2018). 10 contracts at DICONSA (100%), "
        "2021-2023, 184M MXN. DA=100% (all direct award). "
        "Contract content: 'Servicio de deposito mercantil y conexos' — "
        "commercial warehousing services for DICONSA rural food distribution. "
        "Company name 'NAL MERCADERES UNIDOS DEL NORTE' (National United Merchants of the North) "
        "is an opaque commercial name with no geographic or operational specificity, "
        "inconsistent with a legitimate storage facility operator. "
        "Founded 2018, first DICONSA contracts appear 2021 — the same 2021-2023 window "
        "when multiple DICONSA warehousing shells were activated in the dataset. "
        "100% direct award at a single institution for warehousing services = "
        "classic SEGALMEX/DICONSA ecosystem shell pattern. "
        + SEGALMEX_CARTEL +
        "Classification: P6 DICONSA Warehouse Capture — new 2018 shell, 100% DA."
    )

    note_536 = (
        "SIAP agricultural data collection monopoly — single-institution single-bid capture. "
        "RFC: GBE120117U92 (founded January 2012). 3 contracts at SIAP (100%), "
        "2019-2021, 184M MXN. SB=100% (all single bid). "
        "SIAP (Servicio de Informacion Agroalimentaria y Pesquera) is the government agency "
        "that collects agricultural and fisheries data — a small specialized bureau "
        "under SADER (Secretaria de Agricultura). "
        "Contract content: 'Captacion, levantamiento, registro y analisis de informacion "
        "agroalimentaria' — agricultural data collection, field surveys, analysis. "
        "184M over 3 years for agricultural data collection at SIAP is extremely large "
        "for this type of service — data collection surveys nationwide would cost "
        "a fraction of this for a transparent competitive process. "
        "The company name 'GREGANTHI B.E.A.' is nonsensical for a Mexican data/research firm. "
        "100% single-bid at a single agency over 3 years = textbook institutional capture. "
        "Classification: P1 Monopoly — SIAP agricultural data monopoly, 100% SB."
    )

    note_537 = (
        "IMSS pharmaceutical direct award capture — 104 contracts, all DA. "
        "RFC: GEN141017BH5 (founded October 2014). 104 contracts at IMSS (100%), "
        "2023-2025, 198M MXN. DA=100% (all direct award). "
        "Company name 'GENERICORP' (generic corporation) has zero descriptive value "
        "for a pharmaceutical company — a shell company indicator. "
        "Founded 2014 but inactive until 2023: the 9-year dormancy gap followed by "
        "immediate massive IMSS DA access in 2023 matches the documented pattern of "
        "pre-registered shells activated when an insider IMSS contact opens the pipeline. "
        "104 contracts in just 2 years (2023-2025) at a single institution with "
        "100% direct award rate — including an 85M single DA in 2023 — "
        "is consistent with the IMSS pharmaceutical fraud wave that led to "
        "IMSS annulling 200+ contracts for irregular medication procurement in April 2025. "
        + IMSS_DA_RING +
        "Classification: P2 Ghost / P6 IMSS DA Shell — activated 2023, 104c 100% DA."
    )

    note_538 = (
        "IMSS-BIENESTAR outsourced medical services capture — 597M in under 2 years. "
        "RFC: ATR131210JN4 (founded December 2013). 13 contracts at IMSS-BIENESTAR (12c, 590M) "
        "+ 1 other, 2024-2025, 597M MXN. DA=92% (12/13). "
        "Contract content: 'Servicio de atencion subrogado' — outsourced medical care including "
        "MRI (resonancia magnetica), pathology, and minimally invasive surgery. "
        "'ALTA TECNOLOGIA EN RESONANCIA Y SERVICIOS MEDICOS' provides outsourced specialist "
        "services to IMSS-BIENESTAR, the integrated health system created by merging "
        "IMSS-PROSPERA into the welfare health network under the AMLO administration. "
        "IMSS-BIENESTAR has documented procurement weaknesses during its rapid scaling phase. "
        "597M across 13 contracts at a single institution in less than 2 years at 92% DA "
        "is one of the highest value/time ratios of institutional capture in this dataset. "
        "The company was founded in 2013 but its procurement explosion began only in 2024 — "
        "a 10+ year dormancy before activation = shell registration for future access. "
        + IMSS_DA_RING +
        "Classification: P6 IMSS-BIENESTAR Outsourced Services Capture — 2024-2025, 92% DA."
    )

    note_539 = (
        "IMSS medical equipment leasing capture — single massive DA + fragments. "
        "No RFC. 38 contracts at IMSS (100%), 2016-2020, 202M MXN. DA=71% (27/38), SB=21%. "
        "Contract pattern: One massive 181M DA contract in 2016 + 37 smaller contracts "
        "averaging <1M each (maintenance/parts). "
        "The 181M single contract (90% of total value) is the defining event: "
        "a direct award for medical equipment leasing at IMSS at this scale should "
        "have been subject to competitive procurement but was awarded without bidding. "
        "Medical equipment leasing via DA at IMSS is a well-documented abuse pattern: "
        "equipment is leased (not purchased) at inflated rates through single-vendor "
        "arrangements that eliminate competitive price discovery. "
        "No RFC on a vendor with 202M at IMSS in the 2016-2020 period is suspicious "
        "(Structure C data has 30.3% RFC coverage — systematic RFC avoidance). "
        + IMSS_DA_RING +
        "Classification: P6 IMSS Medical Equipment Leasing Capture — 181M single DA 2016."
    )

    note_540 = (
        "IMSS hemodialysis capture with documented safety compliance failures. "
        "15-year span (2010-2025). 50 contracts, 781M MXN. DA=52% (26/50). "
        "98% IMSS-concentrated (49/50 contracts, 780M). DA at IMSS = 52%. "
        "Contract content: 'Hemodialisis subrogada/extramuros' — outsourced kidney dialysis "
        "for IMSS patients at CERTEZA-operated clinics. "
        "CRITICAL EXTERNAL EVIDENCE: "
        "(1) The CEPC (civil protection authority) shut down a CERTEZA hemodialysis clinic "
        "in Tlaxcala for failing to meet safety requirements while serving 824 IMSS patients. "
        "(2) In 2012, CERTEZA facilities were found to fail technical, safety, and hygiene "
        "requirements during inspections — yet IMSS continued awarding DA contracts worth "
        "~100M/year anyway. "
        "(3) Additional documented patient complaints about service quality at CERTEZA-ISSSTE clinics. "
        "The documented pattern: CERTEZA fails safety inspections → IMSS ignores findings → "
        "IMSS awards another DA contract → repeat. This is the corruption mechanism: "
        "IMSS procurement officials maintain the DA relationship with CERTEZA despite "
        "documented compliance failures, suggesting financial relationships beyond the contract. "
        "15 years of IMSS DA contracts for a vendor with documented patient safety failures "
        "and continued regulatory violations = systemic institutional capture. "
        + IMSS_DA_RING +
        "Classification: P6 IMSS Hemodialysis Capture — documented safety failures + 15yr DA."
    )

    cases = [
        (0, [(273679, "NAL MERCADERES UNIDOS DEL NORTE SA DE CV", "high")],
         "NAL MERCADERES UNIDOS DEL NORTE - DICONSA Warehouse Capture",
         "procurement_fraud", "high", note_535, 184000000, 2021, 2023),
        (1, [(251787, "GREGANTHI B.E.A. SA DE CV", "high")],
         "GREGANTHI BEA - SIAP Agricultural Data Monopoly",
         "procurement_fraud", "high", note_536, 184000000, 2019, 2021),
        (2, [(295605, "GENERICORP SA DE CV", "high")],
         "GENERICORP - IMSS Pharmaceutical DA Capture (198M)",
         "procurement_fraud", "high", note_537, 198000000, 2023, 2025),
        (3, [(304047, "ALTA TECNOLOGIA EN RESONANCIA Y SERVICIOS MEDICOS SA DE CV", "high")],
         "ALTA TECNOLOGIA EN RESONANCIA - IMSS-BIENESTAR Services Capture (597M)",
         "procurement_fraud", "high", note_538, 597000000, 2024, 2025),
        (4, [(174974, "MEDIC LEASE SA DE CV", "medium")],
         "MEDIC LEASE - IMSS Medical Equipment Leasing Capture",
         "procurement_fraud", "medium", note_539, 202000000, 2016, 2020),
        (5, [(83472, "CERTEZA LABORATORIO CLINICO Y SUMINISTROS MEDICOS LACE SA DE CV", "high")],
         "CERTEZA LABORATORIO CLINICO - IMSS Hemodialysis Capture + Safety Failures",
         "procurement_fraud", "high", note_540, 781000000, 2010, 2025),
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
        43949: (
            "INDAR AMERICA: Mexican subsidiary of Indar Maquinas Hidraulicas (Ingeteam Group, Basque Country, Spain). "
            "Manufacturer of submersible pumps for large water infrastructure since 1948. "
            "Production facility in Mexico City since 1990. 31 contracts 2010-2024 at "
            "CDMX water system (SACMEX/Aguas CDMX) and CONAGUA for 'rehabilitacion de planta "
            "de bombeo' and 'equipo de bombeo y electromecanico' — exactly their product line. "
            "87% SB reflects structural duopoly in large submersible pumps (INDAR + Flowserve "
            "are the only manufacturers qualified for CDMX's metro water system scale). "
            "Multi-institutional (CDMX, CONAGUA, Hidalgo) over 14 years = real manufacturer. "
            "Legitimate multinational manufacturer — structural monopoly in submersible pumps."
        ),
        246452: (
            "WOCKHARDT FARMACEUTICA SA DE CV: Mexican subsidiary of Wockhardt Limited "
            "(BSE: 532300/NSE: WOCKPHARMA, Mumbai, India). Global pharmaceutical and "
            "biotechnology company. RFC: WFA120621ET1. "
            "7+ institutions (IMSS, ISSSTE, INSABI, SEMAR, SSA, INPER, PRS) + consolidated "
            "SHCP purchases. Product mix: insulins, specialty medications = Wockhardt's "
            "known global portfolio (insulin biosimilars, specialty drugs). "
            "32% DA, 26% SB with competitive participation in consolidated licitaciones "
            "confirms legitimate pharmaceutical company behavior. "
            "FP: multinational pharma subsidiary with specialty drug/biosimilar portfolio."
        ),
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))
    print(f"Marked {len(structural_fps)} structural FPs")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        44237: (
            "EQUIPAMIENTO ODONTOLOGICO VILLA DE CORTES SA DE CV: No RFC. 12c 2010-2013, 199M. "
            "IMSS (8c, 173M), ISSSTE (3c, 25M), BC (1c, 1M). DA=8%, SB=0%. "
            "Dental equipment supplier (name is explicit). Multi-institutional. Low DA = positive. "
            "CONCERN: 149.5M single contract at IMSS 2010 = 75% of total value. "
            "Investigate: what dental equipment costs 149.5M? Is this per-unit overpricing "
            "or a bulk institutional procurement at market rates? Structure B era."
        ),
        1206: (
            "ROSTEC DE MEXICO SA DE CV: No RFC. 33c 2002-2017, 1318M. SCT (19c, 952M), SB=97%. "
            "Diverse: also SEMAR (1c), state agencies. 15-year track record. "
            "Note: 'Rostec' unrelated to Russian defense conglomerate — Mexican company. "
            "97% SB across 15 years at SCT is extreme even for highway construction. "
            "Investigate: RFC lookup, any ASF audit findings, SCT concentration in same corridor? "
            "Potentially in the same highway capture cluster as AZACAN (Case 488), GASEK (Case 489)."
        ),
        17058: (
            "GRUPO AMDS SA DE CV: No RFC. 3c 2003-2010, 347M. SB=100%. "
            "One massive 327.5M contract in 2008 (institution unknown, likely CDMX infrastructure). "
            "Structure A data — cannot classify with 0.1% RFC coverage and no descriptions. "
            "The 327.5M single contract is anomalously large for an unknown 3-contract company. "
            "Investigate: what was the 327.5M 2008 contract? CDMX water/drainage infrastructure?"
        ),
        40388: (
            "DALTEM PROVEE NACIONAL SA DE CV: No RFC. 258c 2009-2015, 2607M. DA=67%. "
            "Multi-institutional: IMSS (142c), PEMEX (40c), ISSSTE (26c), CENSIDA (7c), states. "
            "CENSIDA portion (341.8M) = antiretroviral distribution — legitimate specialized market. "
            "CONCERN: 67% DA is elevated for a 2.6B company + disappeared after 2015. "
            "Borderline: multi-institutional, competitive wins, but large DA proportion. "
            "Investigate: why did the company stop contracting after 2015? RFC for successor entity?"
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

    for offset in range(6):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 535-540 inserted.")


if __name__ == "__main__":
    run()
