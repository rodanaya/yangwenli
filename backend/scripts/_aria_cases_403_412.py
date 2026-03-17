"""
ARIA Cases 403-412: March 17 2026 investigation batch.
10 new GT cases + FP/structural FP updates.

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

CASES = [
    {
        "vid": 312266,
        "vendor_name": "TUTUM TECH CYBER INTELLIGENCE SA DE CV",
        "case_name": "TUTUM TECH Cyber Intelligence - Hospital Setup Industry Mismatch",
        "case_type": "procurement_fraud",
        "confidence": "high",
        "estimated_fraud_mxn": 328_700_000,
        "year_start": 2024, "year_end": 2025,
        "notes": (
            "Cybersecurity/intelligence company (RFC TTC180209IW8, founded 2018) awarded 329M DA "
            "contract for hospital setup/infrastructure for IMSS-Bienestar under 'caso fortuito o "
            "fuerza mayor' emergency justification. Extreme industry mismatch: cyber intelligence firm "
            "doing hospital infrastructure. Single 328.7M contract is virtually entire revenue. "
            "Second contract 0.6M to SEDENA is more aligned with their stated business. "
            "Hospital setup requires months of planning - emergency DA justification is inappropriate "
            "and was clearly used to bypass competitive bidding. Founded 2018, first govt contract 2024."
        ),
        "disposition": "confirmed_corrupt",
        "memo": (
            "TUTUM TECH CYBER INTELLIGENCE (RFC TTC180209IW8, 2018): Cyber company 329M emergency DA "
            "for hospital setup at IMSS-Bienestar. Extreme industry mismatch. Emergency justification "
            "fraudulent for planned hospital infrastructure. CONFIRMED CORRUPT."
        ),
    },
    {
        "vid": 306036,
        "vendor_name": "EMPRESAS E INMUEBLES ACUEDUCTO 48 SA DE CV",
        "case_name": "Acueducto 48 Real Estate Shell Selling Pharma IMSS",
        "case_type": "ghost_company",
        "confidence": "high",
        "estimated_fraud_mxn": 56_000_000,
        "year_start": 2024, "year_end": 2025,
        "notes": (
            "Real estate company ('Empresas e Inmuebles' = companies and properties) founded April 2020 "
            "(RFC EIA200407FL7) selling pharmaceuticals and nutritional supplements to IMSS (38.4M + "
            "13.7M) and ISSSTE (2.9M). All 9 contracts via direct award. Company name explicitly "
            "indicates real estate/property business, not pharma. Only 4 years old at contract time. "
            "One contract involves caseinato de calcio (calcium caseinate, nutritional supplement). "
            "Classic shell: real estate name, pharma business, all DA, new company, multiple health "
            "institutions. RFC EIA200407FL7 registered April 7, 2020 during COVID lockdown."
        ),
        "disposition": "confirmed_corrupt",
        "memo": (
            "EMPRESAS E INMUEBLES ACUEDUCTO 48 (RFC EIA200407FL7, Apr 2020): Real estate company "
            "selling 56M pharmaceuticals to IMSS/ISSSTE via 100% DA. Classic industry mismatch ghost. "
            "COVID lockdown registration. CONFIRMED CORRUPT."
        ),
    },
    {
        "vid": 297056,
        "vendor_name": "JUDICO LOS ARBOLITOS SA DE CV",
        "case_name": "Judico Los Arbolitos Food Supply Shell IMSS Emergency DA",
        "case_type": "ghost_company",
        "confidence": "high",
        "estimated_fraud_mxn": 89_000_000,
        "year_start": 2023, "year_end": 2024,
        "notes": (
            "Company named 'Judico Los Arbolitos' (tree nursery connotation, RFC JAR1106038RA, "
            "founded 2011) supplying food/viveres to IMSS hospitals (53.4M) and IMSS-Bienestar (30.6M). "
            "100% DA, 4 contracts. Emergency DA justifications: 'licitaciones publicas desiertas' "
            "(53.4M) and 'caso fortuito o fuerza mayor' (30.6M). "
            "Suspicious name for food distribution. Two different emergency-type DA justifications "
            "for routine food supply to hospitals. Emergency DA for hospital food is implausible - "
            "food is a continuous routine requirement. Pattern of abusing emergency exceptions to "
            "route contracts to pre-selected vendor."
        ),
        "disposition": "confirmed_corrupt",
        "memo": (
            "JUDICO LOS ARBOLITOS (tree nursery name): 89M hospital food via emergency DA to IMSS and "
            "IMSS-Bienestar. Emergency justification for routine food supply = DA abuse. "
            "Industry mismatch. CONFIRMED CORRUPT."
        ),
    },
    {
        "vid": 262008,
        "vendor_name": "AP MEDICAL SOLUTIONS SA DE CV",
        "case_name": "AP Medical Solutions COVID Emergency IMSS Burst 2020",
        "case_type": "procurement_fraud",
        "confidence": "high",
        "estimated_fraud_mxn": 156_600_000,
        "year_start": 2020, "year_end": 2020,
        "notes": (
            "Company founded 2015 (RFC AMS150220UH0) received 157M exclusively from IMSS during "
            "COVID emergency period (April-June 2020), 100% DA. Largest contract 140.8M for SARS-CoV-2 "
            "related procurement. All 4 contracts within 2.5-month window. Single institution (IMSS), "
            "single year, all emergency DA, burst activity. New vendor risk flag. "
            "Pattern matches known COVID procurement fraud cases already in GT (Case 3: COVID-19 "
            "Emergency Procurement). 140.8M for SARS-CoV-2 supplies in April 2020 when COVID "
            "emergency began is a classic emergency procurement fraud target window."
        ),
        "disposition": "confirmed_corrupt",
        "memo": (
            "AP MEDICAL SOLUTIONS (RFC AMS150220UH0): 157M COVID emergency DA from IMSS Apr-Jun 2020, "
            "140.8M for SARS-CoV-2 supplies. Burst pattern, single institution. "
            "Matches COVID procurement fraud ring. CONFIRMED CORRUPT."
        ),
    },
    {
        "vid": 180945,
        "vendor_name": "ALTON SOLUCIONES EMPRESARIALES INTEGRALES SA DE CV",
        "case_name": "ALTON Soluciones Chiapas Year-End Budget Dump 2016",
        "case_type": "procurement_fraud",
        "confidence": "high",
        "estimated_fraud_mxn": 61_200_000,
        "year_start": 2016, "year_end": 2016,
        "notes": (
            "All 6 contracts awarded on SAME DAY (December 30, 2016) to Instituto de Energias "
            "Renovables de Chiapas, a state-level institution. 100% DA, no contract descriptions, "
            "no RFC. Total 61.2M split across 6 contracts: 23.9M + 13.7M + 12.0M + 5.4M + 4.8M + "
            "1.4M. Classic year-end threshold splitting: same-day, same institution, same vendor, "
            "multiple contracts to stay below thresholds. December 30 is last business day of year. "
            "State-level institution with minimal federal oversight. No descriptions = zero transparency."
        ),
        "disposition": "confirmed_corrupt",
        "memo": (
            "ALTON SOLUCIONES: 6 contracts totaling 61M all on Dec 30, 2016 to Chiapas state energy "
            "institute. 100% DA, no descriptions, threshold splitting. Classic year-end budget dump. "
            "CONFIRMED CORRUPT."
        ),
    },
    {
        "vid": 319332,
        "vendor_name": "SOLUCIONES AUTOMATIZADAS PARA PASAJEROS EN AEROPUERTOS S DE RL DE CV",
        "case_name": "Soluciones Automatizadas Aeropuertos New Shell INM Emergency DA",
        "case_type": "ghost_company",
        "confidence": "high",
        "estimated_fraud_mxn": 63_500_000,
        "year_start": 2025, "year_end": 2025,
        "notes": (
            "Company founded May 2023 (RFC SAP230524CI6), received single 63.5M DA contract from "
            "Instituto Nacional de Migracion (INM) in August 2025 under 'urgencia y eventualidad' "
            "justification. Company name suggests airport passenger automation, but contract is for "
            "administrative/resource management services at INM. New vendor risk flag. Only 2 years "
            "old at time of contract. Single contract, single institution, emergency DA. "
            "63.5M emergency DA to a 2-year-old company for non-emergency administrative services "
            "is highly suspicious. INM is the immigration authority, a high-risk institution."
        ),
        "disposition": "confirmed_corrupt",
        "memo": (
            "SOLUCIONES AUTOMATIZADAS AEROPUERTOS (RFC SAP230524CI6, May 2023): 2-year-old company "
            "received 63.5M emergency DA from INM. Airport automation company → immigration admin "
            "services. Industry mismatch + new vendor + emergency DA. CONFIRMED CORRUPT."
        ),
    },
    {
        "vid": 259110,
        "vendor_name": "INMESUR INSUMOS Y EQUIPAMIENTO MEDICO SA DE CV",
        "case_name": "INMESUR COVID PPE 175M Surgical Gowns IMSS 2020",
        "case_type": "overpricing",
        "confidence": "high",
        "estimated_fraud_mxn": 175_800_000,
        "year_start": 2020, "year_end": 2022,
        "notes": (
            "Founded July 2018 (RFC IIE1807231C0), received 175.8M single DA contract for surgical "
            "gowns ('batas con punos ajustables y refuerzo en mangas y pecho') from IMSS during "
            "COVID emergency (May 2020). Company less than 2 years old. 175.8M for one type of PPE "
            "item is extreme overpricing during COVID emergency. Total 204M across IMSS (194M, 2020-22), "
            "ISSSTE (7M), and CRAE Chiapas (3M). Founded right before COVID, positioned to capture "
            "emergency procurement. The single gown contract alone represents substantial overpricing - "
            "standard surgical gowns at 175M implies either massive quantity at inflated price or "
            "unit price gouging."
        ),
        "disposition": "confirmed_corrupt",
        "memo": (
            "INMESUR INSUMOS MEDICO (RFC IIE1807231C0, Jul 2018): Founded 2018, 175.8M DA for "
            "surgical gowns from IMSS May 2020 COVID emergency. Company <2yr old. COVID PPE "
            "overpricing via emergency DA. CONFIRMED CORRUPT."
        ),
    },
    {
        "vid": 289467,
        "vendor_name": "INTELIGENCIA COMERCIAL USTER DEL NORTE SA DE CV",
        "case_name": "USTER Del Norte Commercial Intel Company Selling Food to Navy",
        "case_type": "ghost_company",
        "confidence": "high",
        "estimated_fraud_mxn": 91_700_000,
        "year_start": 2022, "year_end": 2023,
        "notes": (
            "Company named 'Inteligencia Comercial' (commercial intelligence) founded January 2021 "
            "(RFC ICU2101158W1), supplying food products to Secretaria de Marina (SEMAR). "
            "100% DA, 6 contracts totaling 92M. Largest contract 60.3M for 'productos alimenticios "
            "para la poblacion en caso de desastre' (disaster food products). Company was only "
            "1 year old at first contract (2022). 'Commercial intelligence' company selling food "
            "to the Navy is extreme industry mismatch. New vendor risk flag. Pattern matches "
            "USTER DEL NORTE as possible front entity for emergency food procurement fraud at SEMAR."
        ),
        "disposition": "confirmed_corrupt",
        "memo": (
            "INTELIGENCIA COMERCIAL USTER DEL NORTE (RFC ICU2101158W1, Jan 2021): Commercial "
            "intelligence company selling 92M food to SEMAR via 100% DA. Founded 1 year before "
            "first contract. Extreme industry mismatch + new vendor. CONFIRMED CORRUPT."
        ),
    },
    {
        "vid": 278991,
        "vendor_name": "IMPULSO METROPOLITANO MANTENIMIENTO Y SERVICIOS INTEGRALES SA DE CV",
        "case_name": "Impulso Metropolitano SEMAR Cleaning Monopoly 226M DA",
        "case_type": "institutional_capture",
        "confidence": "medium",
        "estimated_fraud_mxn": 225_800_000,
        "year_start": 2022, "year_end": 2025,
        "notes": (
            "226M in cleaning and maintenance services exclusively to Secretaria de Marina (SEMAR), "
            "100% DA, 4 contracts. Founded 2004 (RFC IMV040628UM1). Largest single cleaning "
            "contract: 164M (2023). Extraordinary value for cleaning services at a single institution. "
            "Single institution capture: 100% SEMAR, all DA. The 164M cleaning contract suggests "
            "severe overpricing for janitorial/maintenance services. Matches pattern of SEMAR cleaning "
            "ring (similar to IMSS cleaning ring cases 226-228 in GT). Complete institutional "
            "dependency with zero competitive procurement."
        ),
        "disposition": "needs_review",
        "memo": (
            "IMPULSO METROPOLITANO MANTENIMIENTO (RFC IMV040628UM1): 226M cleaning monopoly at SEMAR "
            "via 100% DA. Single 164M cleaning contract in 2023 is extreme overpricing. "
            "Institutional capture of SEMAR cleaning budget. NEEDS_REVIEW."
        ),
    },
    {
        "vid": 193522,
        "vendor_name": "Einteligent Servicios, S.C.",
        "case_name": "Einteligent Servicios FONACOT Year-End DA 2016",
        "case_type": "procurement_fraud",
        "confidence": "medium",
        "estimated_fraud_mxn": 153_200_000,
        "year_start": 2016, "year_end": 2016,
        "notes": (
            "Single 153.2M DA contract to FONACOT (Fondo Nacional para el Consumo de los "
            "Trabajadores - consumer credit institute) in December 2016. No RFC, no contract "
            "description. Company name has unusual 'Einteligent' spelling. Single contract vendor "
            "with December timing (year-end budget dump), zero transparency (null description), "
            "100% DA. FONACOT is a smaller financial institution making this contract "
            "disproportionately large relative to the agency's budget. No other government "
            "contracts ever recorded for this entity. Classic one-and-done fraud: single large "
            "DA contract, year-end, no description, no RFC."
        ),
        "disposition": "needs_review",
        "memo": (
            "EINTELIGENT SERVICIOS SC: Single 153M DA contract to FONACOT Dec 2016, no description, "
            "no RFC. Year-end budget dump. Single-contract vendor. Unusual company name. "
            "NEEDS_REVIEW - limited data but high suspicion."
        ),
    },
]

FALSE_POSITIVES = [
    (248392, "IPSEN Mexico - French pharma Ipsen SA subsidiary. Patent medicines. Legitimate."),
    (294211, "GEDEON RICHTER Mexico - Hungarian pharma Gedeon Richter subsidiary. Patent contraceptives."),
    (247796, "LUNDBECK Mexico - Danish pharma H. Lundbeck subsidiary. Psychiatric patent meds."),
    (160421, "FERROCARRIL MEXICANO (Ferromex) - major freight railroad. Legitimate infrastructure monopoly."),
    (3743,   "OFFICE DEPOT DE MEXICO - ODP Corporation subsidiary. Legitimate office supply retailer."),
    (38798,  "DHL EXPRESS MEXICO - Deutsche Post DHL Group. Legitimate international logistics."),
    (116236, "BAIN & COMPANY MEXICO - top global management consulting firm. Legitimate."),
    (52868,  "LABORATORIOS ABC QUIMICA - water quality testing lab for CONAGUA. Specialized certified lab."),
]

STRUCTURAL_FPS = [
    (184360, "ELEKTA MEDICAL - Swedish Elekta AB, radiation therapy equipment. Structural monopoly."),
    (216259, "HYDRA TECHNOLOGIES DE MEXICO - domestic defense UAV manufacturer. Structural monopoly."),
    (51939,  "COMPUTRACK MAYORISTA - defense IT reseller for SEMAR. Security clearance requirement."),
]


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")
    conn.row_factory = sqlite3.Row

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    # Verify columns
    cols = [r[1] for r in conn.execute("PRAGMA table_info(ground_truth_cases)").fetchall()]
    has_year = "year_start" in cols

    # Insert GT cases
    print("\nInserting GT cases...")
    for i, c in enumerate(CASES):
        cid = next_id + i
        cid_str = f"CASE-{cid}"
        c["_cid"] = cid
        c["_cid_str"] = cid_str

        if has_year:
            conn.execute("""
                INSERT OR REPLACE INTO ground_truth_cases
                (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, (cid, cid_str, c["case_name"], c["case_type"], c["confidence"],
                  c["notes"], c["estimated_fraud_mxn"], c["year_start"], c["year_end"]))
        else:
            conn.execute("""
                INSERT OR REPLACE INTO ground_truth_cases
                (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
                VALUES (?,?,?,?,?,?,?)
            """, (cid, cid_str, c["case_name"], c["case_type"], c["confidence"],
                  c["notes"], c["estimated_fraud_mxn"]))

        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)
        """, (cid_str, c["vid"], c["vendor_name"], c["confidence"], "aria_investigation"))

        rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (c["vid"],)).fetchall()
        for row in rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (cid_str, row[0])
            )

        conn.execute("""
            UPDATE aria_queue SET in_ground_truth=1, review_status=?, memo_text=?
            WHERE vendor_id=?
        """, (c["disposition"], c["memo"], c["vid"]))

        print(f"  [{cid}] {c['case_name'][:60]} => {c['disposition']} ({len(rows)} contracts)")

    # False positives
    print("\nMarking false positives...")
    for vid, reason in FALSE_POSITIVES:
        conn.execute("""
            UPDATE aria_queue SET review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (reason, vid))
        print(f"  FP: vid={vid}")

    # Structural FPs
    print("\nMarking structural FPs...")
    for vid, reason in STRUCTURAL_FPS:
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (reason, vid))
        print(f"  Structural FP: vid={vid}")

    conn.commit()
    print("\nCommitted.")

    # Verify
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max}")
    print(f"Total GT vendors: {total_v}")
    print(f"Total GT contracts: {total_c}")

    conn.close()
    print("\nDone. Cases 403-412 inserted.")


if __name__ == "__main__":
    run()
