"""
ARIA Cases 644-651: March 18 2026 investigation session.

Cases:
  644: OPERADORA DE ECOSISTEMAS - Aguascalientes+Guerrero PTAR Water Treatment 884M (SB=1 risk=1.00)
  645: CAL Y MAYOR Y ASOCIADOS - GACM+BANOBRAS+FONATUR Infrastructure Supervision 2.7B (87%SB)
  646: GENESIS HEALTHCARE ADVISERS - IMSS Blood Bank Services 3.1B (DA risk=1.00 2023)
  647: CONSTRUCTORA MAKRO - CAPUFE+SCT Road Infrastructure 2.9B (80%SB)
  648: GRUPO TERRITORIAL Y MARITIMO - CFE Rural Electrification DA 2.3B (71%DA)
  649: GSI SEGURIDAD PRIVADA - AICM Airport Security DA 1.2B (849M AICM consecutive DAs)
  650: EXPERTOS EN COMPUTO Y COMUNICACIONES - IFT+AEFCM Managed IT 1.8B (SB=1 risk=1.00)
  651: SERVICIOS ESTRELLA AZUL DE OCCIDENTE - ISSSTESON Hospital Laundry 2.4B

Run from backend/ directory.
"""

# CASE-644: VID 47495 OPERADORA DE ECOSISTEMAS SA DE CV
#   - 884.2M, 102 contracts, 6% DA, 94% SB, 2010-2015, salud (misclassified; actual=water/ambiente).
#   - AGS-Instituto del Agua del Estado de Aguascalientes:
#     540.3M LP 2014 SB=1 risk=1.00 "REHABILITACION Y REINGENIERIA DE PTAR DE LA CIUDAD" +
#     82.9M LP 2013 SB=1 risk=0.33 + 33.9M LP 2014 SB=1 risk=1.00 + 6.2M DA 2015.
#   - GRO-Comision de Agua Potable Alcantarillado y Saneamiento de Guerrero:
#     114.4M LP 2012 SB=1 risk=0.47 (PTAR construction) + 72.5M LP 2015 SB=1 risk=1.00 +
#     1.9M LP 2010 SB=1.
#   - Water treatment plant (PTAR = planta de tratamiento de aguas residuales) engineering
#     company monopolizing contracts at Aguascalientes state water authority (540M+83M+34M)
#     and Guerrero state water commission (114M+73M) via single-bid competitive LPs.
#     Three contracts score risk=1.00. All competitive LPs won with zero rival bidders.
#     P6 multi-state PTAR water treatment monopoly.

# CASE-645: VID 11483 CAL Y MAYOR Y ASOCIADOS SC
#   - 2,696.2M, 75 contracts, 11% DA, 87% SB, 2006-2021, infraestructura.
#   - GACM (new Mexico City airport authority) 1,157.4M LP 2016 SB=1
#     "SERVICIOS DE SUPERVISION TECNICA Y ADMINISTRATIVA" — supervision of NAIM/NAICM airport
#     construction. BANOBRAS 336M LP 2018 SB=1 (Autopista Palmillas-Apaseo supervisor) +
#     107.6M LP 2010 SB=1. FONATUR 295.2M LP 2020 SB=1 "SUPERVISION TECNICA Y VERIFICACION
#     DE CONTROL DE CALIDAD" (Tren Maya supervision). CDMX-Obras 159.9M LP 2016 SB=1.
#     SCT 101M LP 2014 SB=1 (road supervision).
#   - Infrastructure project supervision consulting firm monopolizing "supervisión técnica"
#     contracts for Mexico's largest infrastructure projects (new airport NAICM, Tren Maya,
#     federal highways, BANOBRAS public works) via uncontested competitive LPs at 87%SB.
#     P6 cross-institutional infrastructure supervision monopoly.

# CASE-646: VID 47917 GENESIS HEALTHCARE ADVISERS
#   - 3,141.0M, 282 contracts, 66% DA, 12% SB, 2018-2024, salud.
#   - IMSS blood bank services 2023: 379.1M LP 2023 SB=0 risk=0.98 + 173.4M LP 2023 SB=0
#     risk=0.98 + 116.5M LP 2023 SB=0 risk=0.98 + 110.6M DA 2023 risk=1.00 + 107.2M DA 2023
#     risk=0.96 + 93M LP 2023 SB=0 risk=0.81 = ~980M in 2023 alone for "SERVICIO MEDICO
#     INTEGRAL DE BANCO DE SANGRE" (comprehensive blood banking).
#   - Sonora Finance 148.2M DA 2024 risk=0.84 "SERVICIO INTEGRAL DE LABORATORIO CLINICO".
#   - Healthcare services company capturing IMSS blood bank (blood supply chain management)
#     via multiple 2023 contracts scoring risk=0.96-1.00 across IMSS regional delegations.
#     Blood bank = critical safety-sensitive medical infrastructure. P6 IMSS blood bank
#     services capture across multiple regional contracts at maximum risk score.

# CASE-647: VID 28444 CONSTRUCTORA MAKRO SA DE CV
#   - 2,930.2M, 20 contracts, 20% DA, 80% SB, 2014-2017, infraestructura.
#   - CAPUFE (federal toll road operator): 663.3M DA 2014 risk=0.25 "TRABAJOS DE RESTITUCION
#     DEL TERRAPLEN" (emergency landslide restoration) + 359.2M LP 2017 SB=1 risk=0.39 +
#     324M DA 2016 risk=0.36 (stabilization works) + 261.4M LP 2017 SB=1 risk=0.39 +
#     186.1M LP 2015 SB=1 + 155.9M LP 2016 SB=1 = 1,949.9M at CAPUFE alone.
#   - SCT 330.8M LP 2015 SB=1 (federal road).
#   - Federal toll road construction/emergency repair company monopolizing CAPUFE (Mexico's
#     toll road operator) and SCT road contracts at 80%SB with 2 large DAs (663M+324M).
#     20 contracts concentrated at CAPUFE (1.95B = 66% of total value). P6 CAPUFE road
#     infrastructure monopoly. Both emergency DAs (663M + 324M) and competitive SB=1.

# CASE-648: VID 54260 GRUPO TERRITORIAL Y MARITIMO SA DE CV
#   - 2,323.6M, 17 contracts, 71% DA, 29% SB, 2012-2013, energia.
#   - CFE Guerrero rural: 349.5M DA 2012 "ELECTRIFICACION COLONIA 2 DE DICIEMBRE MPIO DE
#     CUAUTEPEC" + 297.9M DA 2013 + 295.2M DA 2013 "ELECTRIFICACION POBLADOS HUAJINTEPEC" +
#     278.6M DA 2013 "ELECTRIFICACION OMETEPEC CERRO GRANDE" + 242.9M DA 2013 "AMPLIACION
#     POBLACIONES LAS IGUANAS/PIEDRA" + 239M DA 2012 + 186.5M DA 2013 "SERVICIO DE FLETES
#     AREA OMETEPEC". All 17 contracts at CFE, concentrated 2012-2013, mostly Guerrero coast.
#   - A territorial/maritime services company winning 2.3B in CFE rural electrification direct
#     awards 2012-2013 concentrated in coastal Guerrero (Cuautepec, Huajintepec, Ometepec)
#     without competition. Rural electrification DAs are high-risk category in CFE. Guerrero
#     coastal municipalities = known cartel territory (CJNG/Los Rojos). P3 intermediary
#     capturing CFE rural electrification DA contracts.

# CASE-649: VID 38709 GSI SEGURIDAD PRIVADA SA DE CV
#   - 1,215.5M, 99 contracts, 85% DA, 10% SB, 2009-2019, infraestructura.
#   - AICM (Mexico City airport): 332.2M DA 2019 + 268.1M DA 2017 + 249.7M DA 2015 =
#     849.9M in 3 consecutive AICM DAs for "SERVICIO DE SEGURIDAD Y VIGILANCIA EN PUNTOS
#     DE INSPECCION DE SEGURIDAD" (security at airport inspection checkpoints).
#   - SAT 93.4M LP 2014 SB=0. Banco Bienestar 53.1M DA 2019. SAE 44.1M DA 2012 + 35.4M DA 2010.
#   - Security company receiving 3 consecutive direct awards from AICM 2015-2019 for airport
#     security at inspection points (849.9M total via DA). AICM security DA capture is a high-
#     risk category (airport access control via non-competitive procedure). The same airport
#     (AICM) is simultaneously captured by IROA for cleaning (CASE-636) and Provetecnia for
#     maintenance (CASE-639) — three different DA captures at one institution. P3 intermediary
#     at AICM security inspection services.

# CASE-650: VID 3876 EXPERTOS EN COMPUTO Y COMUNICACIONES SA DE CV
#   - 1,755.4M, 113 contracts, 23% DA, 46% SB, 2013-2024, salud.
#   - IFT (Instituto Federal de Telecomunicaciones — telecom regulator):
#     194.9M LP 2024 SB=1 risk=0.65 "RENOVACION SERVICIOS ADMINISTRADOS DE EQUIPO" +
#     177.8M LP 2022 SB=1 risk=1.00 "RENOVACION SERVICIO ADMINISTRADO DE REDES II" +
#     170.4M LP 2018 SB=1 risk=0.85 "SERVICIO ADMINISTRADO DE REDES" + 126.6M LP 2021
#     SB=1 risk=1.00 = 669.7M at the federal telecom regulator, all SB=1, two at risk=1.00.
#   - AEFCM (Mexico City education authority) 215.6M LP 2020 SB=1 risk=0.77.
#   - Loteria Nacional 130.9M DA 2021 + 85M LP 2013 SB=1.
#   - IT managed services company monopolizing network and computing services at the federal
#     telecommunications regulator (IFT) — four consecutive SB=1 LP contracts 2018-2024
#     scoring risk=0.85-1.00. The entity setting telecom rules for Mexico has its entire
#     network managed by a single uncontested vendor. AEFCM and Lotería Nacional additionally.
#     P6 institutional IT capture at critical regulatory infrastructure.

# CASE-651: VID 25891 SERVICIOS ESTRELLA AZUL DE OCCIDENTE SA DE CV
#   - 2,379.4M, 170 contracts, 37% DA, 55% SB, 2017-2025, salud.
#   - ISSSTESON (Sonora state social security/health): 336.3M LP 2025 SB=0 risk=0.62 +
#     264.9M LP 2024 SB=0 risk=0.91 "RECOLECCION, LAVADO, PLANCHADO DE ROPA" + 116.2M
#     DA 2025 + 77.1M DA 2025 = 794.5M at ISSSTESON in 2024-2025 alone.
#   - Sonora Finance (for ISSSTESON) 204.1M LP 2024 SB=1 risk=0.87.
#   - ISSSPSP (Puebla state health) 186.6M DA 2023 "SERVICIO DE ARRENDAMIENTO DE ROPA
#     HOSPITALARIA".
#   - INP (National Pediatrics) 79.5M LP 2017 SB=1. SALUD 51.3M LP 2023 SB=1.
#   - Hospital laundry services company capturing Sonora state health system (ISSSTESON)
#     with ~1B in 2024-2025 contracts (including 264.9M LP risk=0.91 + 204.1M LP risk=0.87),
#     plus Puebla state health (187M DA), INP, and federal SALUD. P6 regional health laundry
#     services monopoly: Sonora state + Puebla state + federal institutions.

# FPs (structural / legitimate operators):
# 43196 Marcas Nestle SA DE CV (Nestlé Mexico — Swiss multinational food company)
# 17709 DRÄGER MEDICAL MÉXICO SA DE CV (Dräger — German multinational medical devices, authorized)
# 18518 AVANTEL S DE RL DE CV (legitimate ISP, Axtel subsidiary, competitive telecom market)
# 183922 BERCALE SERVICES SA DE CV (SEDENA equipment/construction, SB=0 competitive)

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_644 = (
        "OPERADORA DE ECOSISTEMAS SA DE CV — P6 Aguascalientes+Guerrero PTAR water "
        "treatment monopoly: 884.2M, 94% SB, 2010-2015. AGS-Instituto del Agua: 540.3M "
        "LP 2014 SB=1 risk=1.00 'Rehabilitacion y Reingenieria de PTAR de la Ciudad' "
        "+ 82.9M LP 2013 SB=1 + 33.9M LP 2014 SB=1 risk=1.00. Guerrero CAPAS: 114.4M "
        "LP 2012 SB=1 + 72.5M LP 2015 SB=1 risk=1.00. Three contracts at risk=1.00. "
        "Wastewater treatment plant engineering firm monopolizing PTAR construction and "
        "rehabilitation across two state water authorities (Aguascalientes + Guerrero) "
        "via single-bid competitive LPs. P6 multi-state PTAR monopoly."
    )

    note_645 = (
        "CAL Y MAYOR Y ASOCIADOS SC — P6 infrastructure supervision consulting monopoly: "
        "2,696.2M, 87% SB, 75 contracts, 2006-2021. GACM 1,157.4M LP 2016 SB=1 "
        "'Servicios de Supervision Tecnica y Administrativa' (new NAICM airport). "
        "BANOBRAS 336M LP 2018 SB=1 (Autopista Palmillas-Apaseo) + 107.6M LP 2010 SB=1. "
        "FONATUR 295.2M LP 2020 SB=1 'Supervision Tecnica Tren Maya'. CDMX-Obras 159.9M "
        "LP 2016 SB=1. SCT 101M LP 2014 SB=1. Single consulting firm winning supervisión "
        "tecnica for Mexico's largest infrastructure projects (NAICM airport 1.16B, Tren "
        "Maya 295M, BANOBRAS highways) all via SB=1. P6 infrastructure supervision capture."
    )

    note_646 = (
        "GENESIS HEALTHCARE ADVISERS — P6 IMSS blood bank services capture: 3,141M, 66% "
        "DA, 282 contracts, 2018-2024. IMSS blood bank 2023: 379.1M LP risk=0.98 + "
        "173.4M LP risk=0.98 + 116.5M LP risk=0.98 + 110.6M DA risk=1.00 + 107.2M DA "
        "risk=0.96 + 93M LP risk=0.81 = ~980M in 2023 'Servicio Medico Integral de "
        "Banco de Sangre' across IMSS regional delegations. Sonora Finance 148.2M DA "
        "2024 risk=0.84. Blood bank services = critical safety-sensitive supply chain. "
        "Multiple 2023 contracts at risk=0.96-1.00 across IMSS regions. P6 IMSS blood "
        "banking monopoly: blood supply management for national health system."
    )

    note_647 = (
        "CONSTRUCTORA MAKRO SA DE CV — P6 CAPUFE+SCT road monopoly: 2,930.2M, 80% SB, "
        "20 contracts, 2014-2017. CAPUFE 1,949.9M: 663.3M DA 2014 'Restitucion del "
        "Terraplen' (emergency) + 359.2M LP 2017 SB=1 + 324M DA 2016 (stabilization) "
        "+ 261.4M LP 2017 SB=1 + 186.1M LP 2015 SB=1 + 155.9M LP 2016 SB=1. SCT "
        "330.8M LP 2015 SB=1. 66% of total value at CAPUFE (federal toll road operator) "
        "via 2 large DAs (663M+324M) and 4 uncontested competitive LPs. P6 CAPUFE road "
        "infrastructure monopoly: embankment restoration + road stabilization."
    )

    note_648 = (
        "GRUPO TERRITORIAL Y MARITIMO SA DE CV — P3 CFE Guerrero rural electrification "
        "DA capture: 2,323.6M, 71% DA, 17 contracts, 2012-2013. CFE Guerrero coast: "
        "349.5M DA 2012 'Electrificacion Col. 2 de Diciembre Cuautepec' + 297.9M DA "
        "2013 + 295.2M DA 2013 'Electrificacion Poblados Huajintepec' + 278.6M DA 2013 "
        "'Electrificacion Ometepec Cerro Grande' + 242.9M DA 2013 + 239M DA 2012 + "
        "186.5M DA 2013. All 17 contracts at CFE, concentrated 2012-2013 in coastal "
        "Guerrero (Cuautepec, Huajintepec, Ometepec — cartel territory). 2.3B in CFE "
        "rural electrification DAs without competition. P3 intermediary capturing CFE "
        "rural electrification in coastal Guerrero via direct awards."
    )

    note_649 = (
        "GSI SEGURIDAD PRIVADA SA DE CV — P3 AICM airport security DA capture: 1,215.5M, "
        "85% DA, 99 contracts, 2009-2019. AICM 849.9M: 332.2M DA 2019 + 268.1M DA 2017 "
        "+ 249.7M DA 2015 = 3 consecutive AICM DAs for 'Servicio de Seguridad y Vigilancia "
        "en Puntos de Inspeccion de Seguridad' (airport security checkpoints). SAT 93.4M "
        "LP 2014. Banco Bienestar 53.1M DA 2019. SAE 79.5M DA. Security firm capturing "
        "AICM airport security via 3 consecutive DAs 2015-2019 ($850M). AICM is also "
        "captured by IROA (cleaning, CASE-636) and Provetecnia (maintenance, CASE-639) "
        "via DA — three simultaneous DA captures at Mexico City airport. P3 AICM security "
        "checkpoint capture."
    )

    note_650 = (
        "EXPERTOS EN COMPUTO Y COMUNICACIONES SA DE CV — P6 IFT+AEFCM IT managed services "
        "capture: 1,755.4M, 46% SB, 113 contracts, 2013-2024. IFT (federal telecom "
        "regulator) 669.7M: 194.9M LP 2024 SB=1 risk=0.65 + 177.8M LP 2022 SB=1 "
        "risk=1.00 'Renovacion Servicio Administrado de Redes II' + 170.4M LP 2018 SB=1 "
        "risk=0.85 + 126.6M LP 2021 SB=1 risk=1.00. AEFCM 215.6M LP 2020 SB=1 risk=0.77. "
        "Loteria Nacional 130.9M DA. Single IT vendor managing all network services for "
        "Mexico's telecom regulator (IFT) via 4 consecutive SB=1 LPs 2018-2024 at risk "
        "=1.00. The entity that regulates telecoms has its IT infrastructure captured by "
        "one uncontested vendor. P6 IT institutional capture at critical regulator."
    )

    note_651 = (
        "SERVICIOS ESTRELLA AZUL DE OCCIDENTE SA DE CV — P6 ISSSTESON+multi-state hospital "
        "laundry monopoly: 2,379.4M, 55% SB, 170 contracts, 2017-2025. ISSSTESON (Sonora): "
        "336.3M LP 2025 SB=0 risk=0.62 + 264.9M LP 2024 SB=0 risk=0.91 + 116.2M DA 2025 "
        "+ 77.1M DA 2025 = 794.5M in 2024-2025. Sonora Finance 204.1M LP 2024 SB=1 "
        "risk=0.87. ISSSPSP Puebla 186.6M DA 2023. INP 79.5M LP 2017 SB=1. SALUD 51.3M "
        "LP 2023 SB=1. Hospital laundry services company monopolizing Sonora state health "
        "(ISSSTESON ~1B in 2024-2025 incl. risk=0.91) + Puebla state health (187M DA) "
        "+ federal pediatrics and SALUD. P6 multi-state hospital laundry capture."
    )

    cases = [
        (0, [(47495, "OPERADORA DE ECOSISTEMAS SA DE CV", "high")],
         "OPERADORA ECOSISTEMAS - AGS+Guerrero PTAR Water Treatment 884M (SB=1 risk=1.00)",
         "procurement_fraud", "high", note_644, 884200000, 2010, 2015),

        (1, [(11483, "CAL Y MAYOR Y ASOCIADOS SC", "high")],
         "CAL Y MAYOR - GACM+BANOBRAS+FONATUR Infrastructure Supervision 2.7B (87%SB)",
         "procurement_fraud", "high", note_645, 2696200000, 2006, 2021),

        (2, [(47917, "GENESIS HEALTHCARE ADVISERS", "high")],
         "GENESIS HEALTHCARE - IMSS Blood Bank Services 3.1B (DA risk=1.00 2023)",
         "procurement_fraud", "high", note_646, 3141000000, 2018, 2024),

        (3, [(28444, "CONSTRUCTORA MAKRO SA DE CV", "high")],
         "CONSTRUCTORA MAKRO - CAPUFE+SCT Road Monopoly 2.9B (80%SB DA 2014-2017)",
         "procurement_fraud", "high", note_647, 2930200000, 2014, 2017),

        (4, [(54260, "GRUPO TERRITORIAL Y MARITIMO SA DE CV", "high")],
         "GRUPO TERRITORIAL MARITIMO - CFE Guerrero Rural Electrification DA 2.3B",
         "procurement_fraud", "high", note_648, 2323600000, 2012, 2013),

        (5, [(38709, "GSI SEGURIDAD PRIVADA SA DE CV", "high")],
         "GSI SEGURIDAD - AICM Airport Security DA 1.2B (849M consecutive DAs 2015-2019)",
         "procurement_fraud", "high", note_649, 1215500000, 2009, 2019),

        (6, [(3876, "EXPERTOS EN COMPUTO Y COMUNICACIONES SA DE CV", "high")],
         "EXPERTOS COMPUTO - IFT+AEFCM Managed IT 1.8B (SB=1 risk=1.00 2022-2024)",
         "procurement_fraud", "high", note_650, 1755400000, 2013, 2024),

        (7, [(25891, "SERVICIOS ESTRELLA AZUL DE OCCIDENTE SA DE CV", "high")],
         "ESTRELLA AZUL OCCIDENTE - ISSSTESON Hospital Laundry 2.4B (risk=0.91 2024)",
         "procurement_fraud", "high", note_651, 2379400000, 2017, 2025),
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
        43196,    # Marcas Nestle SA DE CV (Nestlé Mexico — Swiss multinational food company)
        17709,    # DRÄGER MEDICAL MÉXICO SA DE CV (German medical devices, authorized supply)
        18518,    # AVANTEL S DE RL DE CV (legitimate ISP, Axtel subsidiary, competitive)
        183922,   # BERCALE SERVICES SA DE CV (SEDENA authorized equipment, SB=0 competitive)
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
        6748,     # ATENCION CORPORATIVA MEXICO (IMSS printing DA 1.36B, moderate)
        5291,     # COMSA SEGURIDAD INTEGRAL (589M ambulance supplier multi-sector)
        11785,    # CONSTRUCTORA GURRÍA Y ASOCIADOS (1.36B SEDATU construction 89%SB)
        332,      # PAPELERÍA LOZANO HERMANOS (814M stationery 64%DA gobernacion)
        669,      # EQUIPOS Y PRODUCTOS ESPECIALIZADOS (717M specialized equipment)
        38715,    # VESA AUTOMOTRIZ (658M salud vehicles)
        2217,     # DATAVISION DIGITAL (990M hacienda IT 32%SB)
        219909,   # B DRIVE IT SA DE CV (639M hacienda IT 58%SB)
        5034,     # PULLMAN DE CHIAPAS (764M salud transport 45%SB)
        53571,    # INTERSYST SEGURIDAD Y CONTROL (842M infraestructura 37%SB)
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
    print(f"\nDone. Cases 644-651 inserted.")


if __name__ == "__main__":
    run()
