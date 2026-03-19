"""
ARIA Cases 715-717: March 19 2026 investigation session.

Cases:
  715: ALVAREZ Y FERREIRA - CAEM+CONAGUA Water Infrastructure 433M (100%SB risk=1.00 P6)
  716: HOSPI MEDICAL - Hospital Gea+Puebla+Ixtapaluca Medical Equipment 1.4B (SB=1 P6)
  717: BL DISEÑO Y MANTENIMIENTO - ISSSTE+IMSS Cleaning Services 658M (55%DA 33%SB P6)

Run from backend/ directory.
"""

# CASE-715: VID 18711 ALVAREZ Y FERREIRA PROC. TEC. Y LEG. ASOC., S.A. DE C.V.
#   - 433.6M, 7 contracts, 0% DA, 100% SB, 2005-2010, infraestructura.
#   - CAEM (Comisión del Agua del Estado de México) 387.8M (4c, DA=0, SB=4):
#     249.9M LP 2007 SB=1 risk=1.00 "Construcción del macrocircuito de distribución
#     de agua potable en los..." (macrocircuit water distribution network, Estado de
#     México, uncontested, risk=1.00).
#     59M LP 2009 SB=1 risk=0.23 "Construcción de colectores de aguas residuales en
#     Plazas de Aragón Zona" (wastewater collectors, uncontested).
#     45.8M LP 2008 SB=1 risk=1.00 CONAGUA "Ampliación de la red de suministro de agua
#     potable en la Cabecera Municipal" (water supply extension, uncontested, risk=1.00).
#   - CONAGUA 3c 45.8M (SB=3): All three uncontested.
#   - Water infrastructure construction company capturing CAEM (Estado de México water
#     authority) 387.8M + CONAGUA 45.8M — all 7 contracts single-bid, 3 with risk=1.00.
#     Macrocircuit water distribution (249.9M) + wastewater collectors (59M) + water
#     supply extension (45.8M) all uncontested 2005-2010. P6 CAEM+CONAGUA water
#     infrastructure capture: all contracts SB=1, two at risk=1.00.

# CASE-716: VID 44865 HOSPI MEDICAL SA DE CV
#   - 1,444.8M, 503 contracts, 55% DA, 3% SB, 2010-2025, salud.
#   - Hospital General "Dr. Manuel Gea González" 785.5M (14c, DA=8, SB=3):
#     464.6M LP 2025 SB=1 risk=0.83 "ADQUISICIÓN DE (GASTO DE BOLSILLO), EQUIPO
#     MÉDICO COMPLEMENTARIO Y EN" (complementary + enhanced medical equipment,
#     uncontested, 2025).
#     158.5M DA 2025 risk=0.38 "PARTIDAS DESIERTAS DE GASTO DE BOLSILLO" (direct award
#     for failed tender items).
#   - _Gobierno del Estado de Puebla 273.8M (1c, DA=0, SB=1): LP 2022 SB=1 risk=0.80
#     "Adquisición de Materiales, Accesorios y Suministros Médicos (Material de Curación)"
#     (medical supplies, Puebla state, uncontested).
#   - Hospital Regional de Alta Especialidad de Ixtapaluca 191.2M (12c, DA=5, SB=6):
#     6 SB=1 contracts for medical equipment at Ixtapaluca high-specialty hospital.
#   - ISSSTE 64.5M (66c, DA=32, SB=1). Marina 23.5M.
#   - Medical equipment/supplies company capturing Hospital Gea González (464.6M SB=1
#     2025 + 158.5M DA), Puebla state (273.8M SB=1 2022), and Ixtapaluca (6 SB=1
#     contracts) across federal/state hospitals. P6 multi-institution medical equipment
#     monopoly: federal + state hospital procurement all uncontested.

# CASE-717: VID 43518 BL DISEÑO Y MANTENIMIENTO EMPRESARIAL, S.A. DE C.V.
#   - 658.2M, 297 contracts, 55% DA, 33% SB, 2010-2025, salud.
#   - ISSSTE 82c 301.3M (DA=42, SB=38): 38 single-bid cleaning contracts at federal
#     employees' social security. 51.7M LP 2018 SB=1 + 41.8M LP 2018 SB=1 "CONTRATACIÓN
#     DEL SERVICIO DE LIMPIEZA INTEGRAL ESPECIALIZADA".
#   - IMSS 68c 173.4M (DA=35, SB=15): 15 SB=1 cleaning contracts at IMSS.
#   - ITSON (Instituto Tecnológico de Sonora) 3c 63.1M SB=1. Sonora state 3c 40.9M SB=2.
#   - Cleaning/maintenance company with 38 SB=1 contracts at ISSSTE (301.3M) + 15 SB=1
#     at IMSS (173.4M) + Sonora ITSON + state: 55% DA + 33% SB across both federal health
#     insurers. P6 ISSSTE+IMSS cleaning services monopoly: dual-insurer cleaning supply
#     capture via DA saturation and repeated SB=1 wins at both institutions 2010-2025.

# FPs (structural / legitimate operators):
# 5235 NUCITEC SA DE CV — medical supplies distributor. IMSS 309c 2,344.9M (SB=0
#   competitive majority) + ISSSTE 48c 401.4M + SSISSSTE 39c 218.4M + INSABI 18c 201.5M.
#   Top: 386.9M LP 2025 SB=0 "COMPRA CONSOLIDADA DE MEDICAMENTOS" (consolidated competitive).
#   26% DA and 3% SB — overwhelmingly competitive procurement. 3.2B total but 97% of
#   contracts by count are competitive. Structural pharmaceutical/medical supply distributor.
# 55377 TRANSPORTES AEREOS PEGASO SA DE CV — aviation transport services. CFE 3c 714.6M
#   (DA=1, SB=0): 602.5M LP 2010 SB=0 competitive aviation services. PEMEX 30.9M SB=2.
#   Aviation services for energy sector are specialized (helicopter access to offshore
#   platforms, remote substations). Structural energy sector aviation service provider.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_715 = (
        "ALVAREZ Y FERREIRA PROC. TEC. Y LEG. ASOC. SA DE CV — P6 CAEM+CONAGUA "
        "water infrastructure capture: 433.6M, 100% SB, 7 contracts, 2005-2010. "
        "CAEM (Estado de Mexico water authority) 387.8M (4c SB=4): 249.9M LP 2007 "
        "SB=1 risk=1.00 'Construccion del macrocircuito de distribucion de agua "
        "potable' (macrocircuit water distribution, uncontested) + 59M LP 2009 SB=1 "
        "'colectores aguas residuales Plazas de Aragon' + 45.8M LP 2008 SB=1. "
        "CONAGUA 3c 45.8M SB=3 (all uncontested). All 7 contracts single-bid, "
        "2 at risk=1.00. Water infrastructure company capturing CAEM 388M + "
        "CONAGUA 46M all via LP SB=1 2005-2010. P6 CAEM+CONAGUA water "
        "infrastructure monopoly: macrocircuit + collectors + supply extension "
        "all uncontested, two risk=1.00."
    )

    note_716 = (
        "HOSPI MEDICAL SA DE CV — P6 multi-institution medical equipment monopoly: "
        "1,444.8M, 55% DA, 503 contracts, 2010-2025. Hospital Gea Gonzalez 785.5M "
        "(14c DA=8 SB=3): 464.6M LP 2025 SB=1 risk=0.83 'ADQUISICION DE GASTO DE "
        "BOLSILLO EQUIPO MEDICO COMPLEMENTARIO Y EN' (464M uncontested medical "
        "equipment 2025) + 158.5M DA 2025 'PARTIDAS DESIERTAS'. Puebla state "
        "273.8M LP 2022 SB=1 risk=0.80 'Adquisicion de Materiales Accesorios y "
        "Suministros Medicos Material de Curacion' (Puebla uncontested). Ixtapaluca "
        "hospital 191.2M (12c SB=6). ISSSTE 64.5M (66c DA=32). Medical equipment "
        "company capturing Gea Gonzalez (464.6M SB=1 2025) + Puebla state (273.8M "
        "SB=1 2022) + Ixtapaluca (6 SB=1) all uncontested. P6 federal+state hospital "
        "medical equipment monopoly: 1.4B across 3 institutions all SB=1 or DA."
    )

    note_717 = (
        "BL DISENO Y MANTENIMIENTO EMPRESARIAL SA DE CV — P6 ISSSTE+IMSS cleaning "
        "services monopoly: 658.2M, 55% DA, 33% SB, 297 contracts, 2010-2025. "
        "ISSSTE 82c 301.3M (DA=42 SB=38): 38 single-bid contracts at federal "
        "employees social security — 51.7M LP 2018 SB=1 + 41.8M LP 2018 SB=1 "
        "'CONTRATACION DEL SERVICIO DE LIMPIEZA INTEGRAL ESPECIALIZADA' + 40.1M "
        "LP 2022 SB=1 'servicio de limpieza'. IMSS 68c 173.4M (DA=35 SB=15): "
        "15 SB=1 cleaning contracts at social security. ITSON 3c 63.1M SB=1. "
        "Sonora state 3c 40.9M SB=2. Cleaning company with 38 SB=1 at ISSSTE "
        "(301M) + 15 SB=1 at IMSS (173M): dual federal insurer cleaning capture "
        "via DA saturation + repeated SB=1. P6 ISSSTE+IMSS cleaning monopoly."
    )

    cases = [
        (0, [(18711, "ALVAREZ Y FERREIRA PROC. TEC. Y LEG. ASOC., S.A. DE C.V.", "high")],
         "ALVAREZ Y FERREIRA - CAEM+CONAGUA Water 433M (100%SB risk=1.00 P6 2007-2010)",
         "procurement_fraud", "high", note_715, 433600000, 2005, 2010),

        (1, [(44865, "HOSPI MEDICAL SA DE CV", "high")],
         "HOSPI MEDICAL - Gea+Puebla+Ixtapaluca Medical Equipment 1.4B (SB=1 P6)",
         "procurement_fraud", "high", note_716, 1444800000, 2010, 2025),

        (2, [(43518, "BL DISENO Y MANTENIMIENTO EMPRESARIAL, S.A. DE C.V.", "high")],
         "BL DISEÑO MANTENIMIENTO - ISSSTE+IMSS Cleaning 658M (55%DA 33%SB P6)",
         "procurement_fraud", "high", note_717, 658200000, 2010, 2025),
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
        5235,     # NUCITEC (medical supplies distributor — 3.2B but 97% competitive SB=0 procurement)
        55377,    # TRANSPORTES AEREOS PEGASO (aviation for CFE/PEMEX energy operations, structural)
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
        7413,     # PROVEEDORA DE SEGURIDAD INDUSTRIAL DEL GOLFO (2.96B PEMEX safety equipment — specialized industrial market)
        44049,    # COMERCIALIZADORA RODIER (363.7M IMSS cleaning+supplies 67% DA)
        4879,     # DISTRIBUIDORA MEDICA ORION (899.9M IMSS lab services, 530M contract competitive)
        23965,    # DIRAC SA DE CV (253.5M CONAGUA tunnel supervision all SB=1 — specialized engineering)
        4661,     # INDUSTRIAS HABERS (723M clothing/uniforms Diconsa+CONAFE+BANJERCITO, mixed modalities)
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
    print(f"\nDone. Cases 715-717 inserted.")


if __name__ == "__main__":
    run()
