"""
ARIA Cases 541-545: March 17 2026 investigation session.

Cases:
  541: GRADESA - DICONSA/SEGALMEX Direct Award Capture (291M)
       No RFC, 6c DA=100% ALL DICONSA, 2011-2015 food supply
  542: LABORATORIOS DIAGNOMOL - IMSS Clinical Lab Outsourcing Capture (828M)
       220c DA=71% 98% IMSS, lab testing 2014-2025, LP→DA escalation pattern
  543: DISTRIBUCIONES MARADEV - COVID Fraud + Fuerza Mayor DA Abuse (209M)
       RFC mismatch, 22c DA=95%, 112M COVID 2020 + surgery DA "emergencias"
  544: SIRE SISTEMAS INTEGRALES DE RECURSOS EMPRESARIALES - FOVISSSTE IT Monopoly (263M)
       RFC SSI090417HV1, 1c single 263M pluriannual DA Dec 2019, FOVISSSTE GRP system
  545: SEASA NUEVO LEON - BIRMEX Warehouse Emergency DA Abuse (480M)
       RFC SNL000726NY0, 1c single 480M DA "caso fortuito" Dec 2023, CEFEDIS equipment

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

IMSS_DA_RING = (
    "Part of the IMSS pharmaceutical/medical DA capture ring. "
    "Pattern: near-total direct awards at IMSS, LP-clean at other institutions. "
    "Related cases: EVOLUTION PROCES (Case 520), MEDIVIDA (Case 533), "
    "MED SALUS (Case 534), CERTEZA LABORATORIO (Case 540), "
    "LABORATORIOS DIAGNOMOL (Case 542)."
)


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    note_541 = (
        "DICONSA food supply capture — 100% direct award over 5 years. "
        "No RFC (Structure B era, 2011-2015). 6 contracts at DICONSA (100%), "
        "291M MXN. DA=100% (all direct award). "
        "Contract content: Rural food supply for DICONSA's Programa de Abasto Rural. "
        "GRADESA (possibly Granos y Derivados, SA) concentrated all its activity "
        "at DICONSA over 5 consecutive years (2011-2015) through 100% direct awards, "
        "with no competitive procurement. "
        "The 2011-2015 window predates the AMLO-era SEGALMEX reorganization but "
        "documents the same Diconsa capture pattern: intermediary companies inserted "
        "into the food supply chain through DA, bypassing competitive procurement "
        "for commodity-type goods that should attract multiple bidders. "
        "5 years of 100% DA at a single food distribution agency = long-term capture. "
        "Classification: P6 DICONSA Rural Food Capture — 100% DA, 5-year monopoly."
    )

    note_542 = (
        "IMSS clinical laboratory outsourcing capture — LP-to-DA migration over 11 years. "
        "220 contracts (2014-2025), 828M MXN. DA=71% (156/220). "
        "98% IMSS-concentrated (216 contracts, 827M). "
        "Contract content: 'Servicio Integral de Pruebas de Laboratorio' — "
        "outsourced clinical lab testing for IMSS patients. "
        "CRITICAL PATTERN — DA escalation over time: "
        "2014-2016: Large licitacion publica contracts (391M single LP in 2016). "
        "2017: DA begins appearing alongside LP. "
        "2018-2019: Mix of LP and DA. "
        "2020: 97% DA rate (40 of 41 contracts). "
        "2021-2025: Sustained 60-90%+ DA rate. "
        "This LP-to-DA migration is a documented IMSS capture mechanism: a vendor wins "
        "initial contracts competitively, builds institutional relationships, then "
        "transitions to a predominantly DA relationship as procurement controls weaken. "
        "The escalation to 97% DA in 2020 (COVID year) represents the full capture. "
        "11-year relationship, 220 contracts, virtually single-institution dependency. "
        + IMSS_DA_RING +
        "Classification: P6 IMSS Lab Outsourcing Capture — LP-to-DA escalation."
    )

    note_543 = (
        "COVID emergency fraud + repeated 'fuerza mayor' DA abuse for elective surgery. "
        "22 contracts (2020-2025), 209M MXN. DA=95% (21/22). "
        "Institutions: Secretaria de Salud (1c, 112M), SSISSSTE (13c, 82M), IMSS (6c, 12M). "
        "RFC MISMATCH: Vendor registered as 'DISTRIBUCIONES MARADEV SA DE CV' "
        "but RFC in database (NBU110809JM7) does not match this company name — "
        "the RFC prefix should be 'DMA' not 'NBU', indicating either a company name "
        "change or a misattributed RFC (identity fraud indicator). "
        "CONTRACT TIMELINE: "
        "2020: 112M COVID DA at Secretaria de Salud — 'COVID-19 emergency supplies.' "
        "2021-2025: 'Servicio medico subrogado' (outsourced surgery) at SSISSSTE, "
        "all justified as 'caso fortuito o fuerza mayor' (emergency/force majeure). "
        "Using force majeure justification for elective surgeries (minimally invasive, "
        "laparoscopy, general surgery) across 5 years is a systematic abuse of the "
        "emergency procurement exception. Planned surgical services are not emergencies. "
        "COVID fraud pivot → sustained 'emergency' DA abuse is a documented pattern. "
        "Classification: COVID fraud + repeated emergency DA abuse — confirmed corrupt."
    )

    note_544 = (
        "FOVISSSTE IT system monopoly — single 263M pluriannual December DA. "
        "RFC: SSI090417HV1 (founded April 2009). Single contract: 262.8M MXN. "
        "Institution: FOVISSSTE (Fondo de la Vivienda del ISSSTE — the housing fund "
        "for federal workers, one of Mexico's largest housing finance institutions). "
        "Contract: 'Evolucion de la Plataforma Tecnologica de FOVISSSTE' — "
        "GRP/ERP system evolution for the entire FOVISSSTE technology platform. "
        "Procedure: Direct award (not competitive). "
        "Contract dates: December 2, 2019 → December 1, 2022 (3-year pluriannual). "
        "Signed December 2 = year-end urgency DA pattern. "
        "A 263M pluriannual direct award for an IT platform evolution at a major "
        "government housing fund with no competitive bidding is a textbook IT monopoly. "
        "This matches the documented IT capture cases: SEGOB-Mainbit (Case 19), "
        "BANJERCITO IT (Case 217), TOKA Government IT Monopoly (Case 12). "
        "IT system contracts are frequently awarded through DA by claiming the vendor "
        "is the 'only company' that understands the existing system — creating an "
        "incumbent monopoly that perpetuates itself through lock-in. "
        "Classification: P1 IT Monopoly — FOVISSSTE platform, pluriannual Dec DA."
    )

    note_545 = (
        "BIRMEX/CEFEDIS warehouse equipment emergency DA — December 2023 year-end abuse. "
        "RFC: SNL000726NY0 (founded July 2000). Single contract: 480.4M MXN. "
        "Institution: BIRMEX (Laboratorios de Biologicos y Reactivos de Mexico) — "
        "the government agency managing vaccine and biologics procurement. "
        "Contract: 'Equipamiento basico para el Centro Federal de Almacenamiento y "
        "Distribucion de Insumos para la Salud (CEFEDIS)' — basic equipment for "
        "the new federal health supply distribution center. "
        "Procedure justification: 'Caso fortuito o fuerza mayor' (emergency/force majeure). "
        "Contract signed: December 14, 2023 (14 days before year end). "
        "480 MILLION PESOS for 'basic equipment' awarded as an EMERGENCY: "
        "a large warehouse build-out is a planned capital investment, not an emergency. "
        "CEFEDIS context: The creation of CEFEDIS was announced months in advance as "
        "the new centralized health supply warehouse under IMSS-BIENESTAR. "
        "A long-planned infrastructure project awarded as 'force majeure' in December "
        "is a systematic abuse of emergency procurement exemptions for year-end spending. "
        "'SEASA NUEVO LEON' — Nuevo Leon company getting 480M DA for BIRMEX "
        "health infrastructure without competitive bidding. "
        "Classification: Emergency DA abuse — BIRMEX/CEFEDIS procurement fraud."
    )

    cases = [
        (0, [(63538, "GRADESA SA DE CV", "high")],
         "GRADESA - DICONSA Food Supply DA Capture",
         "procurement_fraud", "high", note_541, 291000000, 2011, 2015),
        (1, [(142762, "LABORATORIOS DIAGNOMOL SA DE CV", "high")],
         "LABORATORIOS DIAGNOMOL - IMSS Clinical Lab Outsourcing Capture (828M)",
         "procurement_fraud", "high", note_542, 828000000, 2014, 2025),
        (2, [(258847, "DISTRIBUCIONES MARADEV SA DE CV", "high")],
         "DISTRIBUCIONES MARADEV - COVID Fraud + Fuerza Mayor DA Abuse",
         "procurement_fraud", "high", note_543, 209000000, 2020, 2025),
        (3, [(252544, "SIRE SISTEMAS INTEGRALES DE RECURSOS EMPRESARIALES SA DE CV", "high")],
         "SIRE SISTEMAS INTEGRALES - FOVISSSTE IT Platform DA Monopoly",
         "procurement_fraud", "high", note_544, 263000000, 2019, 2022),
        (4, [(302059, "SEASA NUEVO LEON SA DE CV", "high")],
         "SEASA NUEVO LEON - BIRMEX/CEFEDIS Emergency DA Abuse (480M)",
         "procurement_fraud", "high", note_545, 480000000, 2023, 2024),
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
        1119: (
            "CONSERVACION Y SENALAMIENTO VIAL SA DE CV: Structure A data (2002-2005). "
            "9c SCT+CAPUFE for road signs and markings. SB=100% = data artifact "
            "(Structure A 0.1% RFC coverage, competition data unreliable). "
            "Road sign/marking maintenance is a legitimate niche service. Structural A FP."
        ),
        11493: (
            "FASTEC SA DE CV: Structure A data (2003). 3c SCT+CAPUFE, SB=100% = data artifact. "
            "Highway infrastructure company in pre-2010 data quality desert. "
            "No descriptions, no RFC. Cannot classify from this data. Structure A FP."
        ),
        290578: (
            "APRENDIENDO A CRECER SC: RFC ACR980427AI1 (incorporated 1998). "
            "3c 2022 at IMSS for 'Guarderia Integradora' and 'Guarderia Vecinal Comunitaria' "
            "in Hermosillo, Sonora. SC = Sociedad Civil, the standard legal form for "
            "IMSS-contracted daycare providers. All 3 contracts via licitacion publica (0% DA). "
            "IMSS outsources daycare to hundreds of local SC organizations nationally — "
            "this is the standard Guarderias IMSS program. Legitimate IMSS daycare provider."
        ),
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    # Patent/publisher exception
    conn.execute("""
        UPDATE aria_queue SET fp_patent_exception=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=?
    """, (
        "FP PATENT EXCEPTION: MACMILLAN ADMINISTRACION CORPORATIVA SA DE CV: "
        "RFC MAC031114IT3. Mexican arm of Macmillan Publishers (Holtzbrinck Publishing Group). "
        "42 contracts at CONALITEG, 179M, DA=100%. All DA justified as "
        "'PATENTES, LICENCIAS, OFERENTE UNICO' — copyright/rights-holder DA exemption. "
        "Macmillan supplies copyrighted English-language textbooks for PRONI (national "
        "English program) and secondary school teachers guides. The DA is legally required "
        "when content is copyright-protected and only available from the rights holder. "
        "Same pattern as Richmond Publishing (Case 532) — Macmillan is another major "
        "publisher with legitimate copyright DAs at CONALITEG. fp_patent_exception.",
        272495
    ))
    print(f"Marked 3 structural FPs + 1 patent exception")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        269679: (
            "AUTOTRANSPORTES EL BISONTE SA DE CV: RFC ABI930927HI2 (founded 1993). "
            "6c 2021 at LICONSA, 161M, DA=0% SB=0% (all competitive licitacion). "
            "All competitive procurement = major protective signal. Risk=1.000 from "
            "vendor_concentration (100% LICONSA single year). "
            "Older company (1993), likely legitimate milk transport. "
            "Low priority — competitive wins, established company."
        ),
        278981: (
            "INGENIERIA PARKWAY S DE RL DE CV: RFC IPK160126 area. 4c 2022-2023, 160M. "
            "SSA building maintenance (90.9M, 68M SB) + IMSS COVID/maintenance DA (tiny). "
            "2 large SB at health ministry HQ — building maintenance specialty. "
            "S de RL structure. Investigate: what is 90.9M building maintenance contract? "
            "Is SSA headquarters maintenance concentrated in single vendor?"
        ),
        269203: (
            "TRANSPORTADORA AGROINDUSTRIAL DEL CENTRO SA DE CV: RFC TAC191125JF5 "
            "(incorporated Nov 2019). 9c 2021-2025 at LICONSA, 154M. DA=56%. "
            "New company (2019) getting LICONSA milk transport DA = suspicious. "
            "Similar to GRUPO LOGISTICA FROS (Case 523, another 2018-creation LICONSA transport). "
            "Borderline GT — company too new for this level of LICONSA access."
        ),
        317894: (
            "NICHO SUSTENTABILIDAD URBANA SA DE CV: RFC NSU1803052D0 (March 2018). "
            "3c all 2025 at INIFED (school infrastructure), 170M. SB=67%. "
            "School rehabilitation 2025 — INIFED managed funds. Name mismatch "
            "('sustainability' company rehabilitating schools). "
            "Investigate: two 78M SB contracts same day (Sept 29, 2025) = suspicious."
        ),
        44287: (
            "GRUPO FYRME SA DE CV: 79c 2012-2025, 526M. IMSS (62c, 368M, DA=82%). "
            "IMSS DA rate 82% vs LP-clean at other institutions. "
            "Classic IMSS ring pattern: institution-specific DA capture. "
            "Borderline GT — 13-year track record softens the signal but IMSS DA=82% is high."
        ),
        269228: (
            "CONSORCIO GRAFICO AJUSCO SAPI DE CV: RFC CGA1604211B2 (2016). "
            "20c 2021-2025 at CONALITEG, 485M. DA=5%, most competitive. "
            "SAPI = investment vehicle. Textbook printing for CONALITEG. "
            "CONALITEG printing ecosystem is documented corrupt, but low DA is protective. "
            "Investigate: is CONSORCIO GRAFICO cartelizing with other CONALITEG printers?"
        ),
        36646: (
            "GRUPO ARFAR SC: No RFC. 3c 2008-2010, 321M. IPN (2c, 320M) + Bachilleres (1c). "
            "SC type at education — enormous contracts at IPN (160M each). "
            "Structure A/B era, no descriptions. Cannot classify. "
            "Investigate: what did ARFAR provide to IPN for 160M per contract?"
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

    for offset in range(5):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 541-545 inserted.")


if __name__ == "__main__":
    run()
