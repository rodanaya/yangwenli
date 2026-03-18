"""
ARIA Cases 701-704: March 18 2026 investigation session.

Cases:
  701: TECNO ARRENDAMIENTOS - CONAGUA+API Manzanillo Aqueduct 2.1B (81%SB 2022-2023 P6)
  702: TRUJILLO ROMANO - CAPUFE Staffing Outsourcing 2.17B SB=1 + ISSSTE 324M (P3 2016)
  703: EARTH TECH MEXICO - Multi-Institution Water Treatment 1.3B (risk=1.00 CAEM+CEA P6)
  704: JP-IUSA - SEP Education Tablets 1.8B (2x SB=1 2015, industry mismatch P3)

Run from backend/ directory.
"""

# CASE-701: VID 90434 TECNO ARRENDAMIENTOS Y CONSTRUCCIONES SA DE CV
#   - 2,137.2M, 36 contracts, 0% DA, 81% SB (aria_queue: 1%SB via rate rounding),
#     2002-2025, infraestructura.
#   - CONAGUA 1,192.7M (20c, DA=1, SB=19): 1,024.7M LP 2022 SB=1 risk=1.00
#     "Construcción del acueducto para el suministro de agua potable del AMG"
#     (Área Metropolitana de Guadalajara — massive urban water supply aqueduct,
#     uncontested). 19 of 20 CONAGUA contracts single-bid.
#   - API Manzanillo 872.3M (2c, DA=0, SB=2): 838.2M LP 2023 SB=1 risk=0.41
#     "CONSTRUCCION DEL NUEVO ACUEDUCTO ARMERIA-MANZANILLO" (new port aqueduct
#     uncontested).
#   - SCT 34.7M SB=1. Jalisco state 24.7M (SB=2).
#   - Construction firm monopolizing CONAGUA's critical urban water infrastructure
#     and API Manzanillo port aqueduct via LP SB=1. Two flagship contracts: 1.025B
#     Guadalajara metro area aqueduct (risk=1.00) + 838M Armeria-Manzanillo aqueduct
#     both uncontested. P6 CONAGUA+API water infrastructure monopoly.

# CASE-702: VID 179630 SERVICIOS INTEGRADOS TRUJILLO ROMANO SA DE CV
#   - 2,504.5M, 8 contracts, 12% DA, 25% SB, 2016-2019, trabajo.
#   - CAPUFE 2,173.5M (2c, DA=1, SB=1): 2,173M LP 2016 SB=1 risk=0.39
#     "Subcontratación de personal especializado para la operación y administración"
#     — outsourcing CAPUFE's entire specialized workforce for toll road operations.
#     Single bid. One contract worth 2.17B for staffing services, uncontested.
#   - ISSSTE 324.2M (1c, DA=0, SB=1): 324M LP 2019 SB=1 risk=0.20
#     "SERVICIO INTEGRAL RECLUTAMIENTO FUERZA COMERCIAL PENSIONISSSTE ZONA
#     METROPOLITANA" — ISSSTE commercial and pension sales force recruitment.
#   - Oaxaca state 6M + 1M (small contracts). 2505M total.
#   - Staffing/outsourcing company capturing CAPUFE's entire operational workforce
#     (2.17B in 1 contract, single-bid 2016) + ISSSTE commercial force (324M
#     single-bid 2019). P3 institutional capture via outsourced personnel services
#     at federal transport authority and social security institution.

# CASE-703: VID 2740 EARTH TECH MEXICO, S.A. DE C.V.
#   - 1,345.5M, 9 contracts, 0% DA, 78% SB, 2002-2008, infraestructura.
#   - CAEM (Comisión Municipal de Agua Potable y Saneamiento) 592M LP 2003 SB=1
#     risk=1.00 "Prestación de los servicios de tratamiento de las aguas residuales
#     de la zona sur del Estado de México" — wastewater treatment services for
#     southern Estado de México, uncontested, risk=1.00.
#   - CEA Querétaro 356M LP 2007 SB=1 risk=1.00 "Prestación de servicios de
#     tratamiento de aguas residuales, que incluyen" — Querétaro state water
#     treatment concession, uncontested, risk=1.00.
#   - PEMEX 351M LP 2008 SB=1 "DESARROLLO DE LA INGENIERÍA BÁSICA, INGENIERÍA DE
#     DETALLE, PROCURA DE" (engineering for PEMEX field infrastructure).
#   - CFE 31M LP 2002 SB=1 (Central Rio Bravo III electrical services).
#   - Environmental/water engineering company winning multi-state water treatment
#     service concessions (Estado de México + Querétaro) via LP SB=1 with
#     risk=1.00, plus PEMEX engineering. Cross-sector pattern: water utilities +
#     PEMEX engineering. Both water treatment contracts risk=1.00 uncontested.
#     P6 multi-institution water treatment capture.

# CASE-704: VID 148396 JP-IUSA SA DE CV
#   - 1,806.0M, 2 contracts, 0% DA, 100% SB, 2015, educacion.
#   - SEP 932M LP 2015 SB=1 risk=0.28 "ADQUISICIÓN DE DISPOSITIVOS ELECTRÓNICOS
#     (TABLETAS) PARA SER DOTADOS A..." (electronic tablets for students).
#   - SEP 874M LP 2015 SB=1 risk=0.28 "ADQUISICIÓN DE DISPOSITIVOS ELECTRÓNICOS
#     (TABLETAS) PARA SER DOTADOS A..." (second tablet batch, same program).
#   - Both contracts in 2015, both single-bid, totaling 1.806B for SEP education
#     tablet distribution program. IUSA is an industrial conglomerate (cables,
#     wire, pipes) — JP-IUSA SA de CV appears to be a procurement vehicle for
#     technology distribution outside IUSA's core industrial sector. Industry
#     mismatch: industrial manufacturer → education electronics procurement. Two
#     massive single-bid tablet contracts at SEP in a single year via one vendor.
#     P3 SEP education technology intermediary via industry-mismatched entity.

# FPs (structural / legitimate operators):
# 31830 ABA SEGUROS SA DE CV — major Mexican insurance company (formerly ACE
#   Seguros, now Chubb). CAPUFE 280M + Diconsa 68M + INEA 33M across 150 contracts.
#   Insurance services are structural government procurement — insurance companies
#   compete in a regulated market and large coverage contracts via DA are standard
#   (only 1 insurer can hold the policy). Structural insurance market operator.
# 236 AUTO GLASS SA DE CV — automotive glass supplier. 844 contracts at FIRA 115M +
#   IMSS 90M + ISSSTE 12M + others: fleet vehicle glass replacement/maintenance.
#   4% DA, 5% SB (overwhelmingly competitive). Structural fleet maintenance supplier.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_701 = (
        "TECNO ARRENDAMIENTOS Y CONSTRUCCIONES SA DE CV — P6 CONAGUA+API "
        "aqueduct construction monopoly: 2,137.2M, 81% SB, 36 contracts, "
        "2002-2025. CONAGUA 1,192.7M (20c SB=19): 1,024.7M LP 2022 SB=1 "
        "risk=1.00 'Construccion del acueducto para el suministro de agua "
        "potable del AMG' (Guadalajara metro aqueduct, uncontested). API "
        "Manzanillo 872.3M (2c SB=2): 838.2M LP 2023 SB=1 'CONSTRUCCION DEL "
        "NUEVO ACUEDUCTO ARMERIA-MANZANILLO'. SCT 34.7M SB=1. Construction firm "
        "monopolizing CONAGUA critical urban water infrastructure (1.025B "
        "risk=1.00 Guadalajara) + API Manzanillo port aqueduct (838M) both "
        "via LP SB=1. P6 CONAGUA+API water infrastructure monopoly."
    )

    note_702 = (
        "SERVICIOS INTEGRADOS TRUJILLO ROMANO SA DE CV — P3 CAPUFE staffing "
        "outsourcing capture: 2,504.5M, 25% SB, 8 contracts, 2016-2019. "
        "CAPUFE 2,173.5M (2c SB=1): 2,173M LP 2016 SB=1 risk=0.39 "
        "'Subcontratacion de personal especializado para la operacion y "
        "administracion' (CAPUFE full workforce outsourcing, 2.17B single "
        "contract, uncontested). ISSSTE 324.2M LP 2019 SB=1 risk=0.20 "
        "'SERVICIO INTEGRAL RECLUTAMIENTO FUERZA COMERCIAL PENSIONISSSTE "
        "ZONA METROPOLITANA'. Staffing company capturing CAPUFE toll road "
        "operations (2.17B 1 contract SB=1 2016) + ISSSTE commercial force "
        "(324M SB=1 2019). P3 workforce outsourcing capture at federal "
        "transport authority + social security institution."
    )

    note_703 = (
        "EARTH TECH MEXICO SA DE CV — P6 multi-institution water treatment "
        "monopoly: 1,345.5M, 78% SB, 9 contracts, 2002-2008. CAEM (Estado "
        "de Mexico water authority) 592M LP 2003 SB=1 risk=1.00 'Prestacion "
        "de los servicios de tratamiento de las aguas residuales de la zona "
        "sur del Estado de Mexico' (wastewater treatment concession). CEA "
        "Queretaro 356M LP 2007 SB=1 risk=1.00 'Prestacion de servicios de "
        "tratamiento de aguas residuales' (Queretaro state water treatment). "
        "PEMEX 351M LP 2008 SB=1 (field engineering). CFE 31M LP 2002 SB=1. "
        "Water treatment company winning Estado de Mexico (592M) + Queretaro "
        "(356M) both SB=1 risk=1.00 + PEMEX+CFE. P6 cross-institution water "
        "treatment capture: two state utilities + PEMEX + CFE all SB=1."
    )

    note_704 = (
        "JP-IUSA SA DE CV — P3 SEP education tablets intermediary: 1,806M, "
        "100% SB, 2 contracts, 2015. SEP 932M LP 2015 SB=1 risk=0.28 "
        "'ADQUISICION DE DISPOSITIVOS ELECTRONICOS (TABLETAS) PARA SER DOTADOS "
        "A' (student tablets) + 874M LP 2015 SB=1 risk=0.28 (second tablet "
        "batch, same program). Total 1.806B to one vendor for SEP tablet "
        "distribution 2015, both contracts single-bid. IUSA is an industrial "
        "conglomerate (cables/wire/pipes) — JP-IUSA is industry-mismatched "
        "technology procurement vehicle. Two massive single-bid tablet "
        "contracts at SEP in 1 year via industrial manufacturer. P3 SEP "
        "education technology intermediary, industry mismatch."
    )

    cases = [
        (0, [(90434, "TECNO ARRENDAMIENTOS Y CONSTRUCCIONES SA DE CV", "high")],
         "TECNO ARRENDAMIENTOS - CONAGUA+API Aqueduct 2.1B (81%SB 2022-2023 P6)",
         "procurement_fraud", "high", note_701, 2137200000, 2002, 2025),

        (1, [(179630, "SERVICIOS INTEGRADOS TRUJILLO ROMANO SA DE CV", "high")],
         "TRUJILLO ROMANO - CAPUFE Staffing 2.17B SB=1 + ISSSTE 324M (P3 2016)",
         "procurement_fraud", "high", note_702, 2504500000, 2016, 2019),

        (2, [(2740, "EARTH TECH MEXICO, S.A. DE C.V.", "high")],
         "EARTH TECH MEXICO - Water Treatment 1.3B (CAEM+CEA risk=1.00 P6 2003-2007)",
         "procurement_fraud", "high", note_703, 1345500000, 2002, 2008),

        (3, [(148396, "JP-IUSA SA DE CV", "high")],
         "JP-IUSA - SEP Education Tablets 1.8B (2x SB=1 2015, industry mismatch P3)",
         "procurement_fraud", "high", note_704, 1806000000, 2015, 2015),
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
        31830,    # ABA SEGUROS (Chubb/ACE — major insurance company, structural market operator)
        236,      # AUTO GLASS (fleet glass supplier, 844c competitive 4%DA 5%SB, structural)
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
        45917,    # DRAGADOS DEL GOLFO (port dredging maintenance, specialized, low risk 0.05-0.23)
        706,      # CIA MEXICANA TRASLADO VALORES (licensed armored car/cash transport, structural oligopoly)
        27597,    # ACC INGENIERIA Y SERVICIOS ESPECIALIZADOS (PEMEX hazardous waste mgmt, 4 contracts only)
        145758,   # CONDOMINIO INDUSTRIAL LEON (146M 1c SB=1 ambiente — single large contract, needs check)
        100101,   # ICARDS SOLUTIONS (118M 1c SB=1 gobernacion — single contract, needs check)
        31167,    # DESPACHO RAFEL LORES (80M 1c SB=1 trabajo — single audit/consulting contract)
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
    print(f"\nDone. Cases 701-704 inserted.")


if __name__ == "__main__":
    run()
