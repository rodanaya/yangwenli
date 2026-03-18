"""
ARIA Cases 617-619: March 18 2026 investigation session.

Cases:
  617: CONSTRUCTORA Y URBANIZADORA CAPELLANIA - Coahuila 100% SB Infrastructure 492M
  618: RT CONDUCCION INTEGRAL - CONAGUA 731M Direct Award Water Infrastructure 2023
  619: S&C CONSTRUCTORES DE SISTEMAS - Cross-Institution IT Capture 937M (INFOTEC+INM+CNPSS)

Run from backend/ directory.
"""

# CASE-617: VID 5545 CONSTRUCTORA Y URBANIZADORA CAPELLANIA SA DE CV
#   - 492.8M, 33 contracts, 0% DA, 100% SB, 2002-2017, infraestructura.
#   - SCT 128.2M (roads): Reynosa-Nuevo Laredo highway modernization (106.5M at PEMEX 2012).
#     Coahuila-Secretaría de Infraestructura 98.8M (11 contracts), Coahuila-Finanzas 86M.
#   - 100% SINGLE-BID rate = every single competitive licitación goes uncontested.
#     Road and infrastructure construction in Coahuila/Tamaulipas (border region, Cartel
#     del Noreste territory 2010-2017). PEMEX/SCT/Coahuila state all awarding contracts to
#     the same Coahuila firm with zero competition. Classic P6 monopoly enabled by cartel
#     control of the border construction market or deliberate procurement capture.

# CASE-618: VID 67540 RT CONDUCCION INTEGRAL SA DE CV
#   - 951.1M, 27 contracts, 67% DA, 33% SB, 2010-2024, energia/agua.
#   - CONAGUA 761.5M (2 contracts):
#     731.6M DA 2023 (risk=0.75): "Construcción de la obra de toma, línea de interconexión
#     y planta de bombeo" — 731M DIRECT AWARD from water authority in 2023 without competition.
#     29.9M DA 2024: water pumping system.
#   - Sonora state 148.2M: 115.5M DA "planta flotante en Presa El Novillo" 2022,
#     32.7M LP 2021.
#   - A water infrastructure company capturing CONAGUA and Sonora state via direct awards.
#     731M DA for major water intake/pumping infrastructure in 2023 — one of the largest
#     single DA contracts in the water sector. CONAGUA and Sonora are Obregón administration
#     priority projects. P3 intermediary routing major public works through DA procedures.

# CASE-619: VID 30860 S&C CONSTRUCTORES DE SISTEMAS SA DE CV
#   - 937.6M, 82 contracts, 43% DA, 39% SB, 2007-2019, tecnologia.
#   - INFOTEC 235.9M (3c): 191.2M LP 2013 SB=1 risk=0.90 "PROCESAMIENTO DE CRITICIDAD Y
#     ALMACENAMIENTO Y CONECTIVIDAD" — IT storage/data center single-bid at CONACYT IT center.
#   - INM 173.5M: 168.7M DA 2015 "EQUIPAMIENTO INFORMÁTICO" — IT equipment for immigration.
#   - CONAGUA 120.6M, PGDJF/PGR 79M, IPN 54.9M, AICM 44.8M.
#   - IT company winning cross-institutional IT contracts via single-bid and DA across
#     unrelated federal agencies: INFOTEC (IT center), INM (immigration), Seguro Popular
#     (CNPSS), Mexico City prosecutor, airport, IPN. Industry mismatch markers (classified
#     ambiente). P3 intermediary routing IT contracts across diverse institutions 2007-2019.
#     191M single-bid at INFOTEC (risk=0.90) is the core red flag.

# FPs (structural / legitimate operators):
# 38915 QBE DE MEXICO COMPAÑIA DE SEGUROS (Australian insurance multinational, regulated)
# 278536 JOHNSON CONTROLS BTS MEXICO (US multinational - HVAC/security/building automation)
# 16692 KRUEGER INTERNATIONAL DE MEXICO (US school/office furniture company, authorized)
# 42832 GERARD MEDICAL SISTEMS SA DE CV (SEDENA authorized surgical services, ophthalmology)

# Needs review: 26491, 3668, 160587, 37473, 958, 32659, 11350, 85293, 42894, 2209

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_617 = (
        "CONSTRUCTORA Y URBANIZADORA CAPELLANIA SA DE CV — 100% single-bid rate: "
        "492.8M, 33 contracts, 0% DA, ALL competitive LPs won uncontested, 2002-2017. "
        "SCT 128.2M (Reynosa-Nuevo Laredo highway), PEMEX 106.5M LP 2012 (road mod), "
        "Coahuila-Infraestructura 98.8M, Coahuila-Finanzas 86M. A Coahuila construction "
        "company winning every federal and state infrastructure bid without competition "
        "for 15 years in the Coahuila/Tamaulipas border region. Cartel del Noreste "
        "territory known for cartel-intimidated construction market. 100% SB = complete "
        "deterrence of rival bidders across SCT, PEMEX, and Coahuila state."
    )

    note_618 = (
        "RT CONDUCCION INTEGRAL SA DE CV — P3 CONAGUA DA water infrastructure: 951.1M, "
        "67% DA rate. CONAGUA 761.5M: 731.6M DIRECT AWARD 2023 (risk=0.75) for "
        "'Construcción obra de toma, línea de interconexión y planta de bombeo' + 29.9M "
        "DA 2024. Sonora state 148.2M: 115.5M DA 2022 'planta flotante Presa El Novillo' "
        "+ 32.7M LP 2021. A water infrastructure contractor receiving 731M DA from CONAGUA "
        "without competition in 2023 — one of the largest single DA contracts in the water "
        "sector. CONAGUA + Sonora are AMLO/Obregón water priority programs. P3 intermediary."
    )

    note_619 = (
        "S&C CONSTRUCTORES DE SISTEMAS SA DE CV — P3 cross-institution IT capture: 937.6M, "
        "43% DA, 39% SB, 2007-2019. INFOTEC 235.9M: 191.2M LP 2013 SB=1 risk=0.90 "
        "('PROCESAMIENTO DE CRITICIDAD Y ALMACENAMIENTO Y CONECTIVIDAD' — IT data center "
        "at CONACYT IT research center). INM 168.7M DA 2015 IT equipment for immigration. "
        "CONAGUA 120.6M, PGJDF/PGR 79M, IPN 54.9M, AICM 44.8M. IT company routing "
        "contracts across INFOTEC, immigration, Seguro Popular, airports, IPN via mix of "
        "single-bid LP and DA. 191M uncontested at INFOTEC with risk=0.90 is core red flag."
    )

    cases = [
        (0, [(5545, "CONSTRUCTORA Y URBANIZADORA CAPELLANIA, S.A. DE C.V.", "high")],
         "CAPELLANIA CONSTRUCTORA - Coahuila 100% SB Infrastructure Monopoly 492M (2002-2017)",
         "procurement_fraud", "high", note_617, 492800000, 2002, 2017),

        (1, [(67540, "RT CONDUCCION INTEGRAL SA DE CV", "high")],
         "RT CONDUCCION INTEGRAL - CONAGUA 731M DA Water Infrastructure P3 (2021-2024)",
         "procurement_fraud", "high", note_618, 731600000, 2021, 2024),

        (2, [(30860, "S&C CONSTRUCTORES DE SISTEMAS S.A. DE C.V.", "high")],
         "S&C CONSTRUCTORES SISTEMAS - Cross-Institution IT Capture 937M (INFOTEC+INM+CNPSS)",
         "procurement_fraud", "high", note_619, 937600000, 2007, 2019),
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
        38915,    # QBE DE MEXICO COMPAÑIA DE SEGUROS (Australian insurance multinational)
        278536,   # JOHNSON CONTROLS BTS MEXICO (US multinational HVAC/security)
        16692,    # KRUEGER INTERNATIONAL DE MEXICO (US school/office furniture)
        42832,    # GERARD MEDICAL SISTEMS SA DE CV (SEDENA ophthalmology surgery, authorized)
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
        26491,    # FORMULARIOS DE MEXICO (IMSS forms printing, 402M)
        3668,     # TELECOMUNICACIONES MODERNAS (INEGI IT/telecom, 696M)
        160587,   # TECNOLIMPIEZA ECOTEC (GN+IPN cleaning, 415M)
        37473,    # DEPROINSA DESARROLLOS (rural construction 81M 88%SB)
        958,      # COFORMEX (educational content INEA+PROSPERA+IEPSA 1.19B)
        32659,    # MULTILLANTAS NIETO (tires/energia 249M)
        11350,    # NEXTIRAONE MEXICO (IT networking, ex-Alcatel 504M)
        85293,    # RICO PROMOSTAR SA DE CV (infraestructura 208M)
        42894,    # INDUSTRIAS SANDOVAL (printing Diconsa+GN+CORREOS 571M)
        2209,     # APARATOS ELECTROMECÁNICOS VON HAUCKE (salud 1.485B 24%DA)
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
    print(f"\nDone. Cases 617-619 inserted.")


if __name__ == "__main__":
    run()
