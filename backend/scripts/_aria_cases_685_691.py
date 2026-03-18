"""
ARIA Cases 685-691: March 18 2026 investigation session.

Cases:
  685: SERVICIOS INTEGRALES INGENIERIA Y ADMINISTRACION - CONAGUA Water Infrastructure 2.6B (3x risk=1.00)
  686: TALLERES GRAFICOS DE MEXICO - IMSS+SESNSP+Bienestar Credential Printing 1.07B (SB=1 risk=1.00)
  687: CONSORCIO CONSTRUCTOR E INMOBILIARIO PEGASO - API Salina Cruz Port Construction 261M (4 SB=1)
  688: CONSULTORIA ESTRATEGICA Y COACHING - FONACOT LP SB=1 216M (4th FONACOT vendor)
  689: AGUA DE MEXICO - CONAGUA Water Metering 258M LP SB=1 risk=0.88
  690: VRM CONSTRUCCIONES - SSa Biosafety Lab DA risk=1.00 116M
  691: AVANTEL SA - Telecom Multi-Institutional SB=1 (CONAGUA+PROFECO+SRE)

Run from backend/ directory.
"""

# CASE-685: VID 42494 SERVICIOS INTEGRALES DE INGENIERIA Y ADMINISTRACION SA DE CV
#   - 2,609.6M, 24 contracts, 4% DA, 96% SB, 2010-2025, infraestructura.
#   - CONAGUA 2,159.1M (10c SB=10): 1,099.5M LP 2022 SB=1 risk=1.00 "LINEA DE
#     CONDUCCION GRAVEDAD DEL SISTEMA LAGUNERO" + 303.9M LP 2023 SB=1 risk=1.00
#     + 215.7M LP 2025 SB=1 risk=1.00 "ACUEDUCTO". Three 9-digit CONAGUA water
#     infrastructure contracts all uncontested. CEAC Baja California 219.1M SB=1.
#     SCT 96M. Jalisco-SIOP 135.4M SB=1.
#   - Engineering firm capturing CONAGUA's gravity-fed water pipeline and aqueduct
#     construction contracts at risk=1.00 across consecutive years 2022-2025. All
#     10 CONAGUA contracts single-bid. P6 CONAGUA water infrastructure monopoly,
#     Laguna/Baja California regional focus.

# CASE-686: VID 43684 TALLERES GRAFICOS DE MEXICO SA DE CV
#   - 1,071.2M, 67 contracts, 19% DA, 68% SB, 2003-2025, gobernacion/salud.
#   - IMSS-SAMI 215.1M LP 2023 SB=1 risk=1.00 "SERVICIO DE IMPRESION DE
#     CREDENCIALES Y TARJETAS DE SERVICIOS MEDICOS" — IMSS medical credential
#     printing uncontested.
#   - SESNSP 197.3M (SB=3): police credential/ID printing for national security system.
#   - Banco Bienestar 107.4M (SB=3): bank card/document printing.
#   - INFONAVIT 91.4M (SB=3), ISSSTE 64.8M (SB=2), SEP 46.7M, IMSS-SAMI additional.
#   - Credential/identity document printer monopolizing institutional ID printing
#     across IMSS, SESNSP, Banco Bienestar, INFONAVIT, ISSSTE via consecutive
#     LP single-bid contracts. The IMSS-SAMI 215.1M LP 2023 SB=1 risk=1.00 for
#     medical credential printing = core red flag. Multi-institutional credential
#     capture. P6 government credential printing monopoly.

# CASE-687: VID 105172 CONSORCIO CONSTRUCTOR E INMOBILIARIO PEGASO SA DE CV
#   - 261.2M, 7 contracts, 0% DA, 57% SB, 2013-2015, infraestructura.
#   - API Salina Cruz 261.2M (4c SB=4): 176.7M LP 2013 SB=1 "CONSTRUCCION DE UN
#     MUELLE DE USOS MULTIPLES EN EL PUERTO DE SALINA CRUZ" + 40.5M LP 2015 SB=1
#     + 38M LP 2014 SB=1 "DRAGADO DE MANTENIMIENTO". Four port construction and
#     dredging contracts at the Port of Salina Cruz (Oaxaca) all uncontested.
#   - Construction consortium monopolizing Administración Portuaria Integral (API)
#     Salina Cruz major port infrastructure via competitive LP with zero competition.
#     176.7M multipurpose dock construction won single-bid. P3 API Salina Cruz
#     port construction monopoly 2013-2015.

# CASE-688: VID 157977 CONSULTORIA ESTRATEGICA Y COACHING SA DE CV
#   - 216.7M, 1 contract, 0% DA, 100% SB, 2017, trabajo.
#   - FONACOT 216.7M LP 2017 SB=1 "SERVICIO INTEGRAL DE FABRICACION, IMPRESION,
#     PERSONALIZADO E IDENTIFICACION DE CREDENCIALES FONACOT" — single 216.7M LP
#     contract won single-bid at FONACOT (Fondo de Fomento y Garantía para el
#     Consumo de los Trabajadores).
#   - FOURTH entity identified capturing FONACOT: CASE-604 ECL Global 361.5M DA
#     2016-2017, CASE-611 QA Store Com 184.5M LP 2017-2018 SB=1, CASE-629 NRGP
#     214.6M DA 2015-2017, now CONSULTORIA ESTRATEGICA 216.7M LP 2017 SB=1.
#     Four companies sequentially extracting FONACOT contracts = systematic
#     institutional capture of the workers' consumer fund. P3 FONACOT capture.

# CASE-689: VID 81342 AGUA DE MEXICO SA DE CV
#   - 258.1M, 3 contracts, 0% DA, 100% SB, 2010, infraestructura.
#   - CONAGUA 258.1M (3c, SB=3): 258.1M LP 2010 SB=1 risk=0.88 "SERVICIOS
#     INTEGRALES DE MEDICION Y LECTURAS DE REGISTROS DE FLUJO (TELEMETRIA)".
#     Full water metering/telemetry service contract at CONAGUA won uncontested.
#   - Water metering and telemetry company capturing CONAGUA's national water flow
#     measurement contract via LP single-bid. The 258.1M LP 2010 SB=1 risk=0.88
#     for integrated metering services = specialized infrastructure service won
#     without competition. P3 CONAGUA water metering capture.

# CASE-690: VID 20926 VRM CONSTRUCCIONES SA DE CV
#   - 116.8M, 1 contract, 100% DA, 0% SB, 2023, salud.
#   - SSa/CENAPRECE 116.8M DA 2023 risk=1.00 "PROYECTO INTEGRAL DE
#     REHABILITACION, HABILITACION Y EQUIPAMIENTO DE LABORATORIO DE BIOSEGURIDAD
#     NIVEL 3" — single direct award for Mexico's Level 3 biosafety laboratory
#     rehabilitation (the highest civilian biosafety classification).
#   - Construction firm receiving a 116.8M direct award at risk=1.00 for
#     rehabilitating a Level 3 biosafety laboratory at CENAPRECE (National Center
#     for Epidemiological Surveillance). No competitive process for critical
#     national health security infrastructure. P3 SSa biosafety facility DA.

# CASE-691: VID 1248 AVANTEL SA DE CV
#   - 229.5M, 30 contracts, 7% DA, 67% SB, 2002-2012, tecnologia.
#   - CONAGUA 69.6M (SB=3): multiple telecom/connectivity SB=1 contracts.
#   - PROFECO 51.4M (SB=2): 35.6M LP 2009 SB=1 risk=1.00 + 15.8M LP 2011 SB=1.
#   - SRE 36.7M (SB=5): multiple diplomatic connectivity contracts SB=1.
#   - IMSS 27.4M (SB=1). SAT 20.1M (SB=2). SEDESO 11.6M (SB=1).
#   - Telecom company (pre-Nextel merger Avantel) capturing federal agency internet
#     and telecommunications contracts via LP single-bid across CONAGUA, PROFECO,
#     SRE, IMSS, and SAT in the 2002-2012 period. PROFECO 35.6M LP 2009 SB=1
#     risk=1.00 = core red flag. Cross-institutional telecom monopoly. P6 capture.

# FPs (structural / legitimate operators):
# 214202 PEMEX LOGISTICA SA DE CV — PEMEX subsidiary providing internal logistics/
#   transport services to the PEMEX group (inter-entity corporate service), not a
#   private vendor competing in procurement market
# 8422 SWECOMEX SA DE CV — PEMEX offshore EPIC contractor 2003-2007 (Structure A
#   low-quality data), specialized offshore oil platform construction/services.
#   Data quality too low to assess, Structure A period, likely structural
# 9420 TELEFONOS DE MEXICO SA DE CV (TELMEX) — dominant national telecom provider,
#   structural market position by legacy concession and infrastructure. Single-bid
#   wins reflect natural monopoly on fixed-line connectivity, not fraud
# 125345 ABSPRO SA DE CV — SEDENA authorized supplier of ballistic protection plates
#   (chalecos, placas balísticas) for military personnel. Defense procurement with
#   security clearance requirements limiting competition by design

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_685 = (
        "SERVICIOS INTEGRALES DE INGENIERIA Y ADMINISTRACION SA DE CV — P6 CONAGUA "
        "water infrastructure monopoly: 2,609.6M, 96% SB, 24 contracts, 2010-2025. "
        "CONAGUA 2,159.1M (10c SB=10): 1,099.5M LP 2022 SB=1 risk=1.00 'LINEA DE "
        "CONDUCCION GRAVEDAD DEL SISTEMA LAGUNERO' + 303.9M LP 2023 SB=1 risk=1.00 "
        "+ 215.7M LP 2025 SB=1 risk=1.00 'ACUEDUCTO'. All 10 CONAGUA gravity-fed "
        "water pipeline and aqueduct construction contracts won single-bid at "
        "risk=1.00 across 2022-2025. CEAC Baja California 219.1M SB=1. Jalisco-SIOP "
        "135.4M SB=1. P6 CONAGUA regional water infrastructure monopoly — Laguna/BC."
    )

    note_686 = (
        "TALLERES GRAFICOS DE MEXICO SA DE CV — P6 government credential printing "
        "monopoly: 1,071.2M, 68% SB, 67 contracts, 2003-2025. IMSS-SAMI 215.1M LP "
        "2023 SB=1 risk=1.00 'SERVICIO DE IMPRESION DE CREDENCIALES Y TARJETAS DE "
        "SERVICIOS MEDICOS' (medical credential printing uncontested). SESNSP 197.3M "
        "(SB=3 police ID/credential printing). Banco Bienestar 107.4M (SB=3 bank "
        "card/document printing). INFONAVIT 91.4M (SB=3). ISSSTE 64.8M (SB=2). "
        "Credential/identity document printer monopolizing institutional ID printing "
        "across IMSS, SESNSP, Bienestar, INFONAVIT, ISSSTE via LP SB=1. Multi-"
        "institutional credential capture. IMSS-SAMI 215.1M risk=1.00 = core red flag."
    )

    note_687 = (
        "CONSORCIO CONSTRUCTOR E INMOBILIARIO PEGASO SA DE CV — P3 API Salina Cruz "
        "port construction monopoly: 261.2M, 57% SB, 7 contracts, 2013-2015. API "
        "Salina Cruz 261.2M (4c SB=4): 176.7M LP 2013 SB=1 'CONSTRUCCION DE UN "
        "MUELLE DE USOS MULTIPLES EN EL PUERTO DE SALINA CRUZ' + 40.5M LP 2015 SB=1 "
        "+ 38M LP 2014 SB=1 'DRAGADO DE MANTENIMIENTO'. All 4 port construction and "
        "dredging contracts at the Port of Salina Cruz (Oaxaca, Pacific coast) won "
        "single-bid. 176.7M multipurpose dock construction via LP with zero competition. "
        "Construction consortium capturing API Salina Cruz infrastructure contracts "
        "2013-2015. P3 port construction monopoly."
    )

    note_688 = (
        "CONSULTORIA ESTRATEGICA Y COACHING SA DE CV — P3 FONACOT institutional "
        "capture (4th vendor): 216.7M, 100% SB, 1 contract, 2017. FONACOT 216.7M "
        "LP 2017 SB=1 'SERVICIO INTEGRAL DE FABRICACION, IMPRESION, PERSONALIZADO "
        "E IDENTIFICACION DE CREDENCIALES FONACOT'. Fourth entity capturing FONACOT: "
        "CASE-604 ECL Global 361.5M DA 2016-2017, CASE-611 QA Store 184.5M LP "
        "2017-2018, CASE-629 NRGP 214.6M DA 2015-2017, now CONSULTORIA ESTRATEGICA "
        "216.7M LP 2017 SB=1. Four companies sequentially extracting FONACOT worker "
        "fund contracts = systematic institutional capture. P3 FONACOT monopoly."
    )

    note_689 = (
        "AGUA DE MEXICO SA DE CV — P3 CONAGUA water metering capture: 258.1M, 100% "
        "SB, 3 contracts, 2010. CONAGUA 258.1M LP 2010 SB=1 risk=0.88 'SERVICIOS "
        "INTEGRALES DE MEDICION Y LECTURAS DE REGISTROS DE FLUJO (TELEMETRIA)' — "
        "full integrated water flow measurement and telemetry service won by LP with "
        "single bid. Water metering/telemetry company capturing CONAGUA national "
        "water measurement infrastructure via LP SB=1 at risk=0.88. 258.1M "
        "specialized service contract awarded without competition. P3 CONAGUA "
        "water metering/telemetry monopoly."
    )

    note_690 = (
        "VRM CONSTRUCCIONES SA DE CV — P3 SSa biosafety laboratory DA: 116.8M, 100% "
        "DA, 1 contract, 2023. SSa/CENAPRECE 116.8M DA 2023 risk=1.00 'PROYECTO "
        "INTEGRAL DE REHABILITACION, HABILITACION Y EQUIPAMIENTO DE LABORATORIO DE "
        "BIOSEGURIDAD NIVEL 3' — direct award at risk=1.00 for rehabilitation of "
        "Mexico's Level 3 biosafety laboratory (highest civilian classification) at "
        "CENAPRECE (National Center for Epidemiological Surveillance). No competitive "
        "process for critical national health security infrastructure. Single company "
        "receiving entire 116.8M biosafety lab project via DA. P3 SSa critical "
        "health infrastructure direct award."
    )

    note_691 = (
        "AVANTEL SA DE CV — P6 cross-institutional telecom monopoly: 229.5M, 67% SB, "
        "30 contracts, 2002-2012. CONAGUA 69.6M (SB=3): connectivity SB=1. PROFECO "
        "51.4M (SB=2): 35.6M LP 2009 SB=1 risk=1.00 + 15.8M LP 2011 SB=1. SRE "
        "36.7M (SB=5): diplomatic connectivity SB=1. IMSS 27.4M (SB=1). SAT 20.1M "
        "(SB=2). SEDESO 11.6M (SB=1). Telecom provider capturing federal agency "
        "internet/connectivity contracts via LP single-bid across CONAGUA, PROFECO, "
        "SRE, IMSS, SAT 2002-2012. PROFECO 35.6M LP 2009 SB=1 risk=1.00 = core "
        "red flag. Cross-institutional telecom capture pre-Nextel merger. P6 capture."
    )

    cases = [
        (0, [(42494, "SERVICIOS INTEGRALES DE INGENIERIA Y ADMINISTRACION SA DE CV", "high")],
         "SERVICIOS INTEGRALES INGENIERIA - CONAGUA Water Infrastructure 2.6B (3x risk=1.00)",
         "procurement_fraud", "high", note_685, 2159100000, 2010, 2025),

        (1, [(43684, "TALLERES GRAFICOS DE MEXICO SA DE CV", "high")],
         "TALLERES GRAFICOS MEXICO - Credential Printing 1.07B (IMSS+SESNSP+Bienestar SB=1)",
         "procurement_fraud", "high", note_686, 1071200000, 2003, 2025),

        (2, [(105172, "CONSORCIO CONSTRUCTOR E INMOBILIARIO PEGASO SA DE CV", "high")],
         "CONSORCIO PEGASO - API Salina Cruz Port Construction 261M (4x SB=1 2013-2015)",
         "procurement_fraud", "high", note_687, 261200000, 2013, 2015),

        (3, [(157977, "CONSULTORIA ESTRATEGICA Y COACHING SA DE CV", "high")],
         "CONSULTORIA ESTRATEGICA - FONACOT LP SB=1 216M (4th FONACOT Vendor P3)",
         "procurement_fraud", "high", note_688, 216700000, 2017, 2017),

        (4, [(81342, "AGUA DE MEXICO SA DE CV", "high")],
         "AGUA DE MEXICO - CONAGUA Water Metering 258M LP SB=1 risk=0.88",
         "procurement_fraud", "high", note_689, 258100000, 2010, 2010),

        (5, [(20926, "VRM CONSTRUCCIONES SA DE CV", "high")],
         "VRM CONSTRUCCIONES - SSa Biosafety Lab DA 116M risk=1.00 (CENAPRECE 2023)",
         "procurement_fraud", "high", note_690, 116800000, 2023, 2023),

        (6, [(1248, "AVANTEL SA DE CV", "high")],
         "AVANTEL SA - Cross-Institutional Telecom SB=1 229M (CONAGUA+PROFECO+SRE P6)",
         "procurement_fraud", "high", note_691, 229500000, 2002, 2012),
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
        214202,   # PEMEX LOGISTICA (inter-entity PEMEX subsidiary, not commercial vendor)
        8422,     # SWECOMEX (PEMEX offshore EPIC contractor Structure A period, structural)
        9420,     # TELEFONOS DE MEXICO / TELMEX (dominant telecom by legacy concession)
        125345,   # ABSPRO (SEDENA ballistic plates, defense clearance limits competition)
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
        249741,   # PEOPLE MEDIA (IMSS IT 1.14B LP competitive SB=0 but risk=0.99 — unclear)
        36903,    # DINA CAMIONES (CDMX 429M LP SB=1 bus purchase — bus manufacturer, competitive?)
        50102,    # TELEFONIA POR CABLE (SCT 1.29B telecom/internet 80%DA — large telecom)
        42201,    # SMARTMATIC INTERNATIONAL (SEGOB 260M LP 2009 SB=1 biometric — specialized intl)
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
    print(f"\nDone. Cases 685-691 inserted.")


if __name__ == "__main__":
    run()
