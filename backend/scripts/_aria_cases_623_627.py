"""
ARIA Cases 623-627: March 18 2026 investigation session.

Cases:
  623: ARCA DEL PACIFICO - CONAGUA+SCT Infrastructure Monopoly 1.51B (91%SB risk=1.00)
  624: MICRONET DE MEXICO - SAT IT Managed Security 4.3B (cross-institutional risk=1.00)
  625: DILME SA DE CV - Security Surveillance Capture 1.1B (74%SB salud+SAE)
  626: ESPARTA SERVICIOS EFICIENTES - CAPUFE Outsourcing DA 678M P3 (2021)
  627: MANTENIMIENTO EQUIPO MEDICO BITA - Michoacan+ISEM Medical DA 609M (anesthesia+hemodialysis)

Run from backend/ directory.
"""

# CASE-623: VID 18038 ARCA DEL PACIFICO SA DE CV
#   - 1,510.3M, 91 contracts, ~9% DA, 91% SB, 2005-2021, infraestructura.
#   - CONAGUA 576.6M, SCT 523.3M, SICT 208.8M.
#   - Key: 549.7M LP 2010 SB=1 risk=1.00 "OBRAS DE RECTIFICACION Y CONSTRUCCION DEL ARROYO
#     ALAMAR" — massive Baja California arroyo/canal works won uncontested.
#   - A Baja California infrastructure company monopolizing CONAGUA and SCT/SICT federal
#     road+water contracts at 91% single-bid rate. Risk=1.00 on the largest contract.
#     Cross-institutional: CONAGUA (water infrastructure), SCT (federal roads), SICT
#     (regional roads). P6 multi-institutional infrastructure capture.

# CASE-624: VID 16683 MICRONET DE MEXICO SA DE CV
#   - 4,324.6M, 181 contracts, 44% DA, 42% SB, 2003-2025, energia/tecnologia.
#   - SAT 2,056.3M (key: 938.4M LP 2020 SB=1 risk=0.46 + 389.7M LP 2024 SB=1 risk=1.00
#     "SERVICIOS ADMINISTRADOS DE SEGURIDAD"), CFE 761.1M, SAGARPA 555M, CENACE 368.3M.
#   - IT managed security company capturing SAT (tax authority) with 4.3B across 20 years
#     via mix of DA and single-bid competitive procedures. The 389.7M LP 2024 SB=1
#     risk=1.00 "managed security services" at SAT is the peak: competitive procedure, zero
#     rival bidders, maximum risk score. SAT handles Mexico's entire tax system — IT
#     capture at SAT is P6 institutional capture of critical financial infrastructure.

# CASE-625: VID 1380 DILME SA DE CV
#   - 1,098.5M, 22% DA, 74% SB, salud/gobernacion, 2002-2025.
#   - Hospital General 254M + SAE (Servicio de Administración y Enajenación) 231.2M +
#     Colegio de Bachilleres 95.8M + INIFED 78.2M.
#   - Key: 231.2M LP 2012 SB=1 (SAE surveillance uncontested) + 70.7M LP 2025 SB=1.
#   - Security surveillance company with 74% SB rate winning across diverse federal
#     institutions including hospitals and education/government asset agencies. Long
#     operating track record (2002-2025) with systematic deterrence of competition in
#     surveillance/security services. P6 cross-institutional surveillance capture.

# CASE-626: VID 230478 ESPARTA SERVICIOS EFICIENTES SA DE CV
#   - 975.8M, 9 contracts, 33% DA, 67% SB, infraestructura/hacienda, 2017-2021.
#   - CAPUFE 694M: 678.5M DA 2021 "SUBCONTRATACION DE PERSONAL ESPECIALIZADO" (risk=0.49)
#     — largest single contract, direct award for personnel outsourcing at the toll road
#     operator. CONAGUA 258.6M LP 2021 SB=1 risk=0.64.
#   - A 3-year-old outsourcing firm winning 678.5M DA from CAPUFE for "specialized
#     personnel" in 2021 — same institution/same contract type as CORPOMEX MC (CASE-614).
#     CAPUFE outsourcing DA to a relatively new intermediary. P3 intermediary pattern:
#     personnel outsourcing DA at federal infrastructure agencies.

# CASE-627: VID 241094 MANTENIMIENTO DE EQUIPO MEDICO BITA SA DE CV
#   - 609.2M, 6 contracts, 33% DA, 50% SB, salud, 2019-2024.
#   - Michoacán health 343.5M + ISEM Estado de México 265.7M.
#   - Key contracts: 155.2M DA 2024 "SERVICIO INTEGRAL DE ANESTESIA" risk=0.70 +
#     110.5M DA 2024 "SERVICIO INTEGRAL DE HEMODIALISIS" risk=0.70 (Michoacán).
#   - Medical services company capturing two state health systems (Michoacán + Estado de
#     México ISEM) via DA for critical clinical services: anesthesia and hemodialysis.
#     Anesthesia and dialysis are high-margin captive services — overpricing risk is
#     systemic. The 109.5% DA rate combined with risk=0.70 on both primary contracts
#     and 609M total across only 6 contracts = large-value DA concentration. P3
#     intermediary capturing state-level clinical services.

# FPs (structural / legitimate operators):
# 176791 TEXTILTEL SA DE CV — 0% SB, Guardia Nacional uniforms (1,386.5M GN+SEDENA
#   protective clothing/tactical gear — authorized defense uniform supplier, 0% single
#   bid means always competitive or DA through proper channels, not a monopoly capture)

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_623 = (
        "ARCA DEL PACIFICO SA DE CV — P6 CONAGUA+SCT multi-institutional infrastructure "
        "monopoly: 1,510.3M, 91% single-bid, 2005-2021. CONAGUA 576.6M, SCT 523.3M, "
        "SICT 208.8M. Core: 549.7M LP 2010 SB=1 risk=1.00 'Obras de Rectificacion y "
        "Construccion del Arroyo Alamar' (Baja California arroyo/canal works). 91% SB "
        "rate across federal water authority (CONAGUA), federal roads (SCT), and regional "
        "roads (SICT) for 16 years = systematic deterrence of rival bidders in "
        "infrastructure construction across multiple federal agencies."
    )

    note_624 = (
        "MICRONET DE MEXICO SA DE CV — P6 SAT IT managed security institutional capture: "
        "4,324.6M, 44% DA, 42% SB, 181 contracts, 2003-2025. SAT 2,056.3M: 938.4M LP "
        "2020 SB=1 risk=0.46 + 389.7M LP 2024 SB=1 risk=1.00 ('SERVICIOS ADMINISTRADOS "
        "DE SEGURIDAD' — IT managed security). CFE 761.1M, SAGARPA 555M, CENACE 368.3M. "
        "IT company monopolizing managed security at SAT (Mexico's tax authority) via "
        "uncontested competitive LPs over 20+ years. 389.7M security services contract "
        "at SAT scores risk=1.00 — P6 capture of critical fiscal IT infrastructure."
    )

    note_625 = (
        "DILME SA DE CV — P6 security surveillance capture: 1,098.5M, 74% SB, 2002-2025. "
        "Hospital General de Mexico 254M + SAE 231.2M + Colegio de Bachilleres 95.8M + "
        "INIFED 78.2M. Key: 231.2M LP 2012 SB=1 (SAE surveillance uncontested) + 70.7M "
        "LP 2025 SB=1. Security surveillance company winning across hospitals, government "
        "asset agency (SAE), education ministry facilities, and school infrastructure "
        "at 74% single-bid rate for 23 years. Systematic competition deterrence in "
        "federal surveillance/security services across diverse institution types."
    )

    note_626 = (
        "ESPARTA SERVICIOS EFICIENTES SA DE CV — P3 CAPUFE outsourcing DA intermediary: "
        "975.8M, 9 contracts, 2017-2021. CAPUFE 694M: 678.5M DA 2021 risk=0.49 "
        "'SUBCONTRATACION DE PERSONAL ESPECIALIZADO' at the federal toll road operator. "
        "CONAGUA 258.6M LP 2021 SB=1 risk=0.64. A relatively new outsourcing firm "
        "winning 678.5M DA from CAPUFE for specialized personnel in 2021 — same "
        "institution and contract type as CORPOMEX (CASE-614). CAPUFE outsourcing DA "
        "to a P3 intermediary without competitive bidding. Pattern: personnel "
        "subcontracting DA at federal infrastructure agencies."
    )

    note_627 = (
        "MANTENIMIENTO DE EQUIPO MEDICO BITA SA DE CV — P3 state medical services DA "
        "capture: 609.2M, 6 contracts, 2019-2024. Michoacán health 343.5M + ISEM Estado "
        "de Mexico 265.7M. Key: 155.2M DA 2024 risk=0.70 'SERVICIO INTEGRAL DE ANESTESIA' "
        "+ 110.5M DA 2024 risk=0.70 'SERVICIO INTEGRAL DE HEMODIALISIS' (Michoacán). "
        "Medical services company capturing two state health systems via DA for critical "
        "clinical services (anesthesia, hemodialysis). 609M across only 6 contracts = "
        "high per-contract concentration. Anesthesia/dialysis are captive high-margin "
        "services with overpricing risk. P3 intermediary in state-level clinical services."
    )

    cases = [
        (0, [(18038, "ARCA DEL PACIFICO SA DE CV", "high")],
         "ARCA DEL PACIFICO - CONAGUA+SCT Infrastructure Monopoly 1.51B (91%SB risk=1.00)",
         "procurement_fraud", "high", note_623, 1510300000, 2005, 2021),

        (1, [(16683, "MICRONET DE MEXICO SA DE CV", "high")],
         "MICRONET MEXICO - SAT Managed Security IT Capture 4.3B (risk=1.00 2024)",
         "procurement_fraud", "high", note_624, 4324600000, 2003, 2025),

        (2, [(1380, "DILME SA DE CV", "high")],
         "DILME - Security Surveillance Capture 1.1B (74%SB HGM+SAE 2002-2025)",
         "procurement_fraud", "high", note_625, 1098500000, 2002, 2025),

        (3, [(230478, "ESPARTA SERVICIOS EFICIENTES SA DE CV", "high")],
         "ESPARTA SERVICIOS - CAPUFE Outsourcing DA 678M P3 (2021)",
         "procurement_fraud", "high", note_626, 678500000, 2017, 2021),

        (4, [(241094, "MANTENIMIENTO DE EQUIPO MEDICO BITA SA DE CV", "high")],
         "BITA MEDICAL - Michoacan+ISEM Anesthesia+Hemodialysis DA 609M (2019-2024)",
         "procurement_fraud", "high", note_627, 609200000, 2019, 2024),
    ]

    for (offset, vendors, cname, ctype, conf, notes, fraud, yr1, yr2) in cases:
        case_id_int = next_id + offset
        case_id_str = f"CASE-{case_id_int}"
        conn.execute("""
            INSERT OR REPLACE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (case_id_int, case_id_str, cname, ctype, conf, notes, fraud, yr1, yr2))
        print(f"Inserted case {case_id_int}: {cname[:65]}")

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
            """, (notes[:500], vid))
            n_contracts = len(rows)
            print(f"  Tagged {n_contracts} contracts for vendor {vid} ({vname[:55]})")

    conn.commit()

    # FPs
    fp_structural = [
        176791,   # TEXTILTEL SA DE CV (GN+SEDENA authorized uniform supplier, 0% SB = no monopoly)
    ]
    for vid in fp_structural:
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='fp_excluded'
            WHERE vendor_id=?
        """, (vid,))
    conn.commit()
    print(f"Marked {len(fp_structural)} FPs (structural_monopoly)")

    # Needs review
    needs_review = [
        102529,   # CONTROLES Y MEDIDORES ESPECIALIZADOS (2.1B CFE 10%SB mostly competitive)
        19838,    # SERVICIOS TECNOLOGIA Y ORGANIZACION (762M IT/Oracle SEP+AICM)
        24059,    # DOC SOLUTIONS DE MEXICO (551M 53%DA hacienda)
        48466,    # MAXI SERVICIOS DE MEXICO (808M 50%SB hacienda)
        250231,   # COMERCIALIZADORA COFRADIA (89.5M 69%DA salud P6)
        40544,    # ELITE MEDICAL CARE SA DE CV (90.5M 46%SB salud P6)
        293691,   # COMERCIALIZADORA LOS TRES JR (10.7M 100%DA P6)
        278025,   # COMERCIALIZADORA ELECTROPURA (99.2M 86%DA salud)
        46789,    # SERVICIOS INTEGRADOS DE CAPITAL HUMANO (48.8M ambiente)
        51256,    # COMUNICACION SEGMENTADA INTELIGENTE (113.3M 95%DA hacienda)
    ]
    for vid in needs_review:
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review'
            WHERE vendor_id=? AND review_status='pending'
        """, (vid,))
    conn.commit()
    print(f"Marked {len(needs_review)} needs_review")

    # Verify
    print("\n--- VERIFICATION ---")
    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    n_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    n_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {max_id} | GT vendors: {n_vendors} | GT contracts: {n_contracts}")
    for row in conn.execute(
        "SELECT gtc.id, gtc.case_id, gtc.case_name, COUNT(DISTINCT gtv.vendor_id), COUNT(gcon.contract_id) "
        "FROM ground_truth_cases gtc "
        "LEFT JOIN ground_truth_vendors gtv ON gtc.case_id=gtv.case_id "
        "LEFT JOIN ground_truth_contracts gcon ON gtc.case_id=gcon.case_id "
        f"WHERE gtc.id >= {next_id} "
        "GROUP BY gtc.id"
    ).fetchall():
        print(f"  {row[1]}: {row[2][:65]} | {row[3]}v | {row[4]}c")

    conn.close()
    print(f"\nDone. Cases 623-627 inserted.")


if __name__ == "__main__":
    run()
