"""
ARIA Cases 692-694: March 18 2026 investigation session.

Cases:
  692: DEWIMED - Multi-Institutional Medical Equipment 3.5B (ISSSTE+IMSS+INSABI+SEDENA P6)
  693: CONSORCIO ASPEN - IMSS+State Hospital/Infrastructure Construction 754M (69%SB P6)
  694: CONSORCIO HERMES - ISSSTE Radiology DA 440M (258M DA risk=0.86 P3)

Run from backend/ directory.
"""

# CASE-692: VID 4444 DEWIMED SA DE CV
#   - 3,531.9M, 2156 contracts, ~35% DA, ~2% SB, 2002-2025, salud.
#   - ISSSTE 988.8M (627c, DA=93, SB=21): large medical equipment supplier with
#     93 direct awards and 21 single-bid LP wins across 23 years at ISSSTE.
#   - IMSS 815.7M (857c, DA=302, SB=23): 302 direct awards at IMSS for medical
#     equipment — 35% DA rate at the largest health insurer.
#   - INSABI/Bienestar 567.1M (39c): 263.5M LP 2023 risk=1.00 "ADQUISICION DE
#     EQUIPO EN UNIDADES DE PRIMERO Y SEGUNDO NIVEL" + 33.6M DA 2022 risk=0.34 +
#     33.5M DA 2021 risk=0.31 + multiple 2022 contracts risk=0.36-0.40.
#   - SEDENA 262.9M (119c, DA=18, SB=6). Marina 225.7M (42c, DA=24). Hospital
#     General de México 163.4M (57c, DA=42).
#   - IMSS 69.6M LP 2024 risk=1.00 "PROGRAMA EQUIPAMIENTO MEDICO PARA HOSPITALES
#     PRIORITARIOS 2024" — medical equipment for priority hospitals uncontested.
#   - Medical equipment distributor capturing ISSSTE, IMSS, INSABI, SEDENA, and
#     Marina via mix of DA (majority at ISSSTE/IMSS) and LP SB=1 risk=1.00 at
#     INSABI. 23-year track record, 2156 contracts. P6 multi-institutional
#     medical equipment monopoly across 6 federal health/defense institutions.

# CASE-693: VID 105778 CONSORCIO INMOBILIARIO Y CONSTRUCTOR ASPEN SA DE CV
#   - 753.7M, 13 contracts, 0% DA, 69% SB, 2013-2024, infraestructura/salud.
#   - IMSS-SIMI 400.2M LP 2024 SB=1 risk=0.67 "CONSTR. POR SUSTITUCIÓN DEL
#     HOSP. GRAL. DE 30 A 60 CAMAS DE GUADALAJARA" — hospital construction/
#     expansion contract uncontested.
#   - IMSS 58M LP 2024 SB=1 risk=0.30 "SUSTITUCIÓN DE LA U.M.F. NO. 2 EN EJIDO
#     BENITO JUÁREZ" — family medicine unit replacement SB=1.
#   - SECOTEC-CDMX 192.4M LP 2023 SB=1 + 29.3M LP 2024 SB=1 + 9.3M LP 2023
#     (bridge construction). Chiapas government 17.3M SB=1 + 17.1M SB=1 + 14.1M SB=1.
#   - Construction consortium winning IMSS hospital substitution (400.2M), IMSS
#     family medicine unit (58M), CDMX bridge infrastructure (192.4M+29.3M), and
#     Chiapas state projects all via LP SB=1. 9 of 13 contracts single-bid.
#     Cross-institutional construction monopoly — IMSS health + state infrastructure.
#     P6 IMSS+state infrastructure construction monopoly.

# CASE-694: VID 72305 CONSORCIO HERMES SA DE CV
#   - 439.8M, 46 contracts, 63% DA, 17% SB, 2010-2025, salud.
#   - ISSSTE 297M (2c, DA=2): 258.3M DA 2022 risk=0.86 "SISTEMA DE DIGITALIZACIÓN
#     DE IMÁGENES (RADIOGRAFÍA COMPUTARIZADA)" + 38.6M DA 2022 risk=0.29 (same
#     system, different partida). Two direct awards for ISSSTE's national radiology
#     digitalization system totaling 297M in a single year.
#   - IMSS 77.4M (14c, DA=7, SB=3): 14.9M + 13.1M + 12M + 8.8M medical imaging.
#   - Querétaro-SSalud 28.3M (SB=3), SSa 23.3M (DA=6).
#   - Medical imaging company capturing ISSSTE's national radiology digitalization
#     system via two direct awards in 2022 totaling 297M (258.3M risk=0.86) without
#     competitive process. ISSSTE did not tender this major digital health infrastructure
#     project competitively. Complemented by IMSS DA/SB medical imaging services.
#     P3 ISSSTE radiology system capture.

# FPs (structural / legitimate operators):
# 136998 ZAGIS SA DE CV — SEDENA 1.39B for textile yarn/thread (hilos para tejido)
#   for military uniform fabric manufacturing. Authorized defense textile supplier.
#   Military fabric procurement with security classification requirements.
# 1533 MERCK SA DE CV — IMSS 1.48B + ISSSTE 670M + INSABI 205M pharmaceutical
#   products. Merck is a global pharmaceutical manufacturer. Presence in IMSS/ISSSTE
#   consolidated drug catalog reflects legitimate pharma market structure, not fraud.
# 46523 MAZARS AUDITORES — Diconsa 23.9M + LICONSA 20.9M + IMSS 16.7M external
#   audit services via DA (5-7M each). Mazars is a major international audit firm
#   (now Forvis Mazars). External audit via DA for parastatals is standard practice.
#   Risk scores 0.02-0.03 confirm no anomaly.
# 102530 COMERCIALIZADORA IUSA MEDIDORES SA DE CV — CFE 1,155.8M (2c LP SB=0)
#   electricity meters. IUSA is a major Mexican industrial conglomerate. CFE meter
#   procurement via competitive LP (SB=0 = multiple bidders). Structural industrial
#   supplier, not monopoly.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_692 = (
        "DEWIMED SA DE CV — P6 multi-institutional medical equipment monopoly: "
        "3,531.9M, 2156 contracts, 2002-2025. ISSSTE 988.8M (627c DA=93 SB=21): "
        "long-term medical equipment supplier with 93 DA + 21 SB at ISSSTE. IMSS "
        "815.7M (857c DA=302 SB=23): 302 DA at IMSS medical equipment. INSABI/"
        "Bienestar 567.1M: 263.5M LP 2023 risk=1.00 'ADQUISICION EQUIPO UNIDADES "
        "PRIMERO Y SEGUNDO NIVEL' + 33.6M DA 2022 + 33.5M DA 2021. IMSS 69.6M LP "
        "2024 risk=1.00 'EQUIPAMIENTO MEDICO HOSPITALES PRIORITARIOS'. SEDENA "
        "262.9M (DA=18). Marina 225.7M (DA=24). HGM 163.4M (DA=42). Medical "
        "equipment distributor capturing ISSSTE+IMSS+INSABI+SEDENA+Marina via DA "
        "concentration + LP SB=1 risk=1.00. 23-year cross-institutional capture."
    )

    note_693 = (
        "CONSORCIO INMOBILIARIO Y CONSTRUCTOR ASPEN SA DE CV — P6 IMSS+state "
        "infrastructure construction monopoly: 753.7M, 69% SB, 13 contracts, "
        "2013-2024. IMSS-SIMI 400.2M LP 2024 SB=1 risk=0.67 'CONSTR. POR "
        "SUSTITUCION DEL HOSP. GRAL. DE 30 A 60 CAMAS GUADALAJARA' (hospital "
        "substitution/expansion). IMSS 58M LP 2024 SB=1 (UMF substitution). "
        "SECOTEC-CDMX 192.4M LP 2023 SB=1 + 29.3M LP SB=1 (bridge). Chiapas "
        "state 17.3M+17.1M+14.1M all LP SB=1. 9 of 13 contracts single-bid. "
        "Construction consortium winning major IMSS hospital construction (400.2M) "
        "and state infrastructure via LP SB=1 across multiple institutions. P6 "
        "cross-institutional construction monopoly: IMSS health + CDMX/Chiapas."
    )

    note_694 = (
        "CONSORCIO HERMES SA DE CV — P3 ISSSTE national radiology system DA: "
        "439.8M, 63% DA, 17% SB, 46 contracts, 2010-2025. ISSSTE 297M (2 DA): "
        "258.3M DA 2022 risk=0.86 'SISTEMA DE DIGITALIZACION DE IMAGENES "
        "(RADIOGRAFIA COMPUTARIZADA)' + 38.6M DA 2022 — two direct awards for "
        "ISSSTE's national radiology digitalization system totaling 297M in 2022 "
        "without competitive tender. IMSS 77.4M (14c DA=7 SB=3): medical imaging "
        "services. Queretaro-SSalud 28.3M (SB=3). Medical imaging company "
        "capturing ISSSTE's critical radiology infrastructure (258.3M risk=0.86) "
        "via DA, avoiding open competition for major health system technology. "
        "P3 ISSSTE radiology/medical imaging capture."
    )

    cases = [
        (0, [(4444, "DEWIMED SA DE CV", "high")],
         "DEWIMED - Multi-Institution Medical Equipment 3.5B (ISSSTE+IMSS+INSABI P6)",
         "procurement_fraud", "high", note_692, 3531900000, 2002, 2025),

        (1, [(105778, "CONSORCIO INMOBILIARIO Y CONSTRUCTOR ASPEN SA DE CV", "high")],
         "CONSORCIO ASPEN - IMSS Hospital+State Infrastructure 754M (69%SB P6)",
         "procurement_fraud", "high", note_693, 753700000, 2013, 2024),

        (2, [(72305, "CONSORCIO HERMES SA DE CV", "high")],
         "CONSORCIO HERMES - ISSSTE Radiology System DA 258M risk=0.86 (P3 2022)",
         "procurement_fraud", "high", note_694, 439800000, 2010, 2025),
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
        136998,   # ZAGIS (SEDENA textile/yarn supplier for military uniforms — defense structural)
        1533,     # MERCK SA DE CV (global pharma manufacturer in federal drug catalog)
        46523,    # MAZARS AUDITORES (international audit firm, DA external audit standard)
        102530,   # COMERCIALIZADORA IUSA MEDIDORES (CFE meter supplier, competitive LP SB=0)
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
        33951,    # CONGRESOS CONVENCIONES (multi-inst event mgmt DA 437M — borderline P3)
        112470,   # VECTOR IMPULSOR (IMSS construction SB=12 but small amounts 162M)
        484,      # AUTOMUNDO (POLICIA FEDERAL LP SB=0 competitive — vehicle dealer)
        29227,    # PET FOODS (CINVESTAV lab animal food DA=53 — research supply specialized)
        76971,    # SEGUROS DE VIDA SURA (TELECOMM insurance structural)
        180096,   # ASEGURADORA PATRIMONIAL VIDA (BANOBRAS/IPN insurance structural)
        50695,    # DANIEL DE LA CRUZ LOPEZ (persona física PEMEX 244M DA 55%)
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
    print(f"\nDone. Cases 692-694 inserted.")


if __name__ == "__main__":
    run()
