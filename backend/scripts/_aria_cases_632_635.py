"""
ARIA Cases 632-635: March 18 2026 investigation session.

Cases:
  632: GIA+A CONSTRUCTORA - CONAGUA+SCT Tunnel+Road Monopoly 3.4B (93%SB 2010-2019)
  633: CONSTRUCTORES UNIDOS CAMPECHE - SCT Campeche Roads 2.2B (99%SB 2002-2020)
  634: IMPULSORA TLAXCALTECA - FIT Railway Ties Monopoly 2.9B (88%SB Istmo Tehuantepec)
  635: SOLUCIONES ESTRATEGICAS UNIVERSALES - DICONSA School Packages DA 588M (risk=1.00)

Run from backend/ directory.
"""

# CASE-632: VID 89863 CONSTRUCTORA Y EDIFICADORA GIA+A SA DE CV
#   - 3,407.3M, 14 contracts, 7% DA, 93% SB, 2010-2019, infraestructura.
#   - CONAGUA 1,868.1M (2 contracts, both SB):
#     1,517.8M LP 2014 SB=1 risk=0.29 "CONSTRUCCIÓN DEL TÚNEL CHIMALHUACÁN II, ESTADO
#     DE MÉXICO" (massive water tunnel won uncontested).
#     350.3M LP 2017 SB=1 risk=0.62 "OBRAS DE RECTIFICACIÓN Y AMPLIACIÓN EN CAPACIDAD
#     DEL RÍO" (river works uncontested).
#   - SCT 892M (6c, SB=5): 255.1M LP 2019 SB=1 risk=0.39 (BANOBRAS-CAPUFE road rehab).
#     Sinaloa-SOP 219.1M (3c, SB=3).
#   - A construction firm winning CONAGUA's largest infrastructure contract (1.5B tunnel)
#     uncontested plus SCT and BANOBRAS road contracts — all via LP with zero competition.
#     13 of 14 contracts are single-bid. The Chimalhuacán II tunnel (Estado de México)
#     is one of Mexico's major urban water infrastructure projects. P6 CONAGUA+SCT
#     multi-institutional infrastructure monopoly.

# CASE-633: VID 4588 CONSTRUCTORES UNIDOS DE CAMPECHE SA DE CV
#   - 2,180.2M, 87 contracts, 1% DA, 99% SB, 2002-2020, infraestructura.
#   - SCT 1,649.9M (66c, DA=1, SB=65): 65 out of 66 SCT road construction contracts
#     won uncontested. Campeche state water 256.3M (SB=5). CAPACH 117.2M (SB=1,
#     acueducto Chicbul-Cd del Carmen). Campeche-UAC 62.3M (SB=1). Campeche-SDUO 29.5M.
#   - A Campeche construction company winning essentially every SCT federal road
#     construction contract in the Campeche/Yucatan region uncontested for 18 years.
#     99% SB rate = complete deterrence of any rival bidder across federal and state
#     road and water infrastructure. Classic P6 SCT regional monopoly — Campeche.

# CASE-634: VID 12978 IMPULSORA TLAXCALTECA DE INDUSTRIAS SA DE CV
#   - 2,905.6M, 32 contracts, 9% DA, 88% SB, 2003-2022, infraestructura.
#   - Ferrocarril del Istmo de Tehuantepec (FIT) 1,786.8M (10c, SB=9):
#     381.8M LP 2016 SB=1 risk=0.36 "DURMIENTES DE CONCRETO" (concrete railway ties),
#     375.8M LP 2017 SB=1 "DURMIENTE MONOLÍTICOS DE CONCRETO PRESFORZADO",
#     299.9M LP 2012 SB=1, 319.9M DA 2014 "DURMIENTE DE CONCRETO PRESFORZADO".
#   - SCT 370.8M (SB=2). Puebla-Finanzas 217.3M. APILC (Lázaro Cárdenas port) 120M.
#   - Concrete railroad tie (durmiente) manufacturer monopolizing supply to the Ferrocarril
#     del Istmo de Tehuantepec (Mexico's strategic interoceanic railway) via single-bid
#     competitive licitaciones. FIT is Mexico's key infrastructure linking Gulf to Pacific.
#     Near-monopoly on a critical railway input (concrete sleepers) across 20 years.
#     P6 institutional capture of the Istmo railway supply chain.

# CASE-635: VID 33616 SOLUCIONES ESTRATEGICAS UNIVERSALES SA DE CV
#   - 877.2M, 38 contracts, 58% DA, 18% SB, 2007-2019, agricultura.
#   - DICONSA 587.9M (16 DA contracts): 181.7M DA 2014 risk=1.00 "PAQUETE SECUNDARIA Y
#     PAQUETE PRIMARIA" + 112.5M DA 2013 risk=0.36 "PAQUETE PRIMARIA". School supply
#     packages (útiles escolares for primary and secondary school students) routed
#     through DICONSA (food/staples distribution parastatal) rather than SEP.
#   - IEPSA (government printing/textbooks) 113.4M (DA=5). Coahuila 78.4M SB + 76.9M SB.
#   - P3 intermediary routing school supply packages through DICONSA via DA. DICONSA
#     is the staple food distribution agency — not an education entity. Funneling primary
#     and secondary school kit procurement through a food parastatal avoids SEP
#     procurement oversight. 181.7M DA risk=1.00 at DICONSA for school packages = the
#     core red flag. Coahuila state 2019 LP SB=1 for school supplies complements pattern.

# FPs (structural / legitimate operators):
# 32560 SOCIEDAD COOPERATIVA TRABAJADORES DE PASCUAL (Boing!/Pascual — Mexico's famous
#   beverage cooperative selling drinks to Diconsa/Alimentacion Bienestar via 2,695 DA
#   contracts — structural cooperative distribution, not procurement fraud)
# 46714 INSTITUTO DE LA POLICIA AUXILIAR Y PROTECCION DEL DF (government security body
#   providing armed security services to other federal agencies — inter-governmental
#   security provision, not a commercial vendor in corruption sense)

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_632 = (
        "CONSTRUCTORA Y EDIFICADORA GIA+A SA DE CV — P6 CONAGUA+SCT infrastructure "
        "monopoly: 3,407.3M, 93% SB, 14 contracts, 2010-2019. CONAGUA 1,868.1M: "
        "1,517.8M LP 2014 SB=1 risk=0.29 'CONSTRUCCION DEL TUNEL CHIMALHUACAN II, "
        "ESTADO DE MEXICO' (major urban water tunnel uncontested) + 350.3M LP 2017 "
        "SB=1 risk=0.62 (river rectification). SCT 892M (SB=5): 255.1M LP 2019 SB=1 "
        "(BANOBRAS road rehab). Sinaloa 219.1M (SB=3). 13 of 14 contracts single-bid "
        "across CONAGUA, SCT, BANOBRAS, and Sinaloa. P6 multi-institutional "
        "infrastructure monopoly: water tunnels + federal roads uncontested."
    )

    note_633 = (
        "CONSTRUCTORES UNIDOS DE CAMPECHE SA DE CV — P6 SCT Campeche road construction "
        "regional monopoly: 2,180.2M, 99% SB, 87 contracts, 2002-2020. SCT 1,649.9M: "
        "65 of 66 SCT contracts won single-bid (only 1 DA). Campeche state water 256.3M "
        "(SB=5): acueducto Chicbul-Cd del Carmen. CAPACH 117.2M SB. Campeche-UAC 62.3M. "
        "A Campeche construction company winning essentially ALL federal and state road "
        "and water infrastructure bids in the Yucatan Peninsula uncontested for 18 years. "
        "86 of 87 contracts are single-bid. Textbook P6 SCT regional construction monopoly."
    )

    note_634 = (
        "IMPULSORA TLAXCALTECA DE INDUSTRIAS SA DE CV — P6 FIT railway ties monopoly: "
        "2,905.6M, 88% SB, 32 contracts, 2003-2022. Ferrocarril del Istmo de "
        "Tehuantepec 1,786.8M: 381.8M LP 2016 SB=1 + 375.8M LP 2017 SB=1 + 299.9M "
        "LP 2012 SB=1 (all 'durmientes de concreto presforzado' — concrete railway "
        "sleepers). SCT 370.8M SB, Puebla-Finanzas 217.3M, APILC Lazaro Cardenas 120M. "
        "Concrete railway tie manufacturer monopolizing supply to the strategic "
        "Ferrocarril del Istmo de Tehuantepec (interoceanic corridor) via uncontested "
        "competitive LPs. Near-sole supplier of critical railway inputs for 20 years."
    )

    note_635 = (
        "SOLUCIONES ESTRATEGICAS UNIVERSALES SA DE CV — P3 DICONSA school package DA "
        "intermediary: 877.2M, 58% DA, 2007-2019. DICONSA 587.9M (16 DA): 181.7M DA "
        "2014 risk=1.00 'PAQUETE SECUNDARIA Y PAQUETE PRIMARIA' + 112.5M DA 2013 "
        "'PAQUETE PRIMARIA' — school supply packages (utiles escolares) funneled "
        "through DICONSA (staple food parastatal) instead of SEP. IEPSA 113.4M DA. "
        "Coahuila 78.4M SB + 76.9M SB (school supplies). P3 intermediary routing "
        "primary/secondary school kit procurement through a food distribution agency "
        "to circumvent education procurement oversight. 181.7M DA risk=1.00 at DICONSA "
        "for school packages is the core red flag."
    )

    cases = [
        (0, [(89863, "CONSTRUCTORA Y EDIFICADORA GIA+A SA DE CV", "high")],
         "GIA+A CONSTRUCTORA - CONAGUA+SCT Tunnel+Roads 3.4B (93%SB 2010-2019)",
         "procurement_fraud", "high", note_632, 3407300000, 2010, 2019),

        (1, [(4588, "CONSTRUCTORES UNIDOS DE CAMPECHE SA DE CV", "high")],
         "CONSTRUCTORES UNIDOS CAMPECHE - SCT Regional Monopoly 2.2B (99%SB 2002-2020)",
         "procurement_fraud", "high", note_633, 2180200000, 2002, 2020),

        (2, [(12978, "IMPULSORA TLAXCALTECA DE INDUSTRIAS SA DE CV", "high")],
         "IMPULSORA TLAXCALTECA - FIT Railway Ties Monopoly 2.9B (88%SB 2003-2022)",
         "procurement_fraud", "high", note_634, 2905600000, 2003, 2022),

        (3, [(33616, "SOLUCIONES ESTRATEGICAS UNIVERSALES SA DE CV", "high")],
         "SOLUCIONES ESTRATEGICAS - DICONSA School Packages DA 588M (risk=1.00 2013-2014)",
         "procurement_fraud", "high", note_635, 587900000, 2007, 2019),
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
        32560,    # SOCIEDAD COOPERATIVA TRABAJADORES DE PASCUAL (Boing! beverage cooperative)
        46714,    # INSTITUTO DE LA POLICIA AUXILIAR (government security body, not commercial)
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
        4273,     # PAGOZA URBANIZADORES (167M SB GDF 2002-2003, old Structure A data)
        4751,     # TECNOLOGIA MEDICA INTERAMERICANA (469M SB lab equip Aguascalientes 2010)
        269887,   # CARITAS PHARMA (1.4B IMSS/ISSSTE pharma 2021-2025, 7%SB competitive)
        251394,   # CGI LOGISTICS (110.4M DA Bienestar transport 2019, single contract)
        83913,    # WOOD WATER COMERCIALIZADORA INMOBILIARIA (46.3M 83%SB gobernacion)
        133464,   # TOKA INVESTMENT SOFOM (180.9M 67%SB educacion — related to TOKA GT?)
        44386,    # SEGURIDAD PRIVADA INDUSTRIAL OMEGA (203.2M gobernacion 59%DA 24%SB)
        655,      # VIAJES GENESIS (154.2M travel 59%SB trabajo)
        29355,    # ROOST CONTROL DE PLAGAS (109.6M educacion 38%SB)
        10813,    # OFFSET SANTIAGO (58.6M educacion 94%DA printing)
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
    print(f"\nDone. Cases 632-635 inserted.")


if __name__ == "__main__":
    run()
