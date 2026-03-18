"""
ARIA Cases 613-616: March 18 2026 investigation session.

Cases:
  613: SCALA SUPERVISION CONSULTORIA - SCT/CAPUFE Road Supervision Monopoly 890M (88% SB, 21yrs)
  614: CORPOMEX MC SC - CAPUFE Outsourcing P6 Capture 2.4B (66% SB)
  615: DEICO DESARROLLO DE INFRAESTRUCTURA - CONAGUA Sinaloa Monopoly 587M (94% SB)
  616: INTELIGENCIA Y TECNOLOGIA INFORMATICA - Bienestar DA Capture 623M (374M DA 2016-2017)

Run from backend/ directory.
"""

# CASE-613: VID 22789 SCALA SUPERVISION CONSULTORIA ASESORIA Y LABORATORIO SA DE CV
#   - 890.2M, 292 contracts, 12% DA, 88% SB, 21 years, infraestructura.
#   - All at road sector: SCT 448.7M (164 contracts), SICT 195.4M (39c), CAPUFE 166.8M (62c).
#   - Contract titles: road supervision, project studies, tunnel/viaduct administration.
#   - A supervision and consulting firm monopolizing Mexico's federal road infrastructure
#     supervision contracts. 88% single-bid rate over 21 years = systematic deterrence of
#     competitors in road supervision consulting. SCT and CAPUFE are Mexico's road authority
#     and toll road operator respectively. P6 institutional capture in the infrastructure
#     supervision subsector.

# CASE-614: VID 62686 CORPOMEX MC SC
#   - 2,434.8M, 32 contracts, 31% DA, 66% SB, 9 years, infraestructura.
#   - Main clients: CAMINOS Y PUENTES (CAPUFE) 1.319B (9 contracts):
#     633.9M LP 2011 (SB=1, outsourcing toll personnel), 309.6M LP 2014 (SB=1, specialized
#     personnel), 141.8M DA 2014. ISSSTE 445.4M (329.7M LP 2019 SB=1 recruitment Pensionissste).
#     Banobras 285M LP 2011 (SB=1, technical/admin outsourcing). CIATEQ 83.2M.
#   - An outsourcing/staffing company that monopolizes personnel subcontracting at CAPUFE
#     (toll road operator) via single-bid competitive procedures. CAPUFE then ISSSTE and
#     Banobras: cross-institutional capture of outsourced personnel services. 66% SB at
#     large government entities for "subcontratación de personal especializado" = bid rotation
#     or deterrence in the outsourcing sector.

# CASE-615: VID 64136 DEICO DESARROLLO DE INFRAESTRUCTURA Y CONEXOS SA DE CV
#   - 587.2M, 18 contracts, 6% DA, 94% SB, 6 years, infraestructura.
#   - CONAGUA 482.4M (8 contracts): 394M LP 2017 (risk=1.00, river canal rectification),
#     27.5M LP 2016 (risk=0.65), 24.6M LP 2012. Sinaloa SOP 78.2M (6 contracts). SCT 18M.
#   - Sinaloa-based construction company monopolizing CONAGUA water infrastructure contracts.
#     394M single-bid contract at CONAGUA for "Obras de rectificación y ampliación en
#     capacidad del Río Tula" in 2017 with risk score=1.00. 94% single-bid rate = the
#     highest-risk competitive procedure pattern. Company disappears after 2017. Sinaloa
#     region known for cartel-connected infrastructure contractors. P6 CONAGUA capture.

# CASE-616: VID 3389 INTELIGENCIA Y TECNOLOGIA INFORMATICA SA DE CV
#   - 623.4M, 90 contracts, 16% DA, 27% SB, sector salud/gobernacion.
#   - Bienestar 373.6M: 274.4M DA 2017 ("Servicio Integral de Información y Apoyo
#     Tecnológico") + 99.2M DA 2016 ("Confronta, Enrolamiento Biométrico de Huellas").
#   - IMSS 55.9M (19 contracts), CONAFE 35.6M, CAPFCE 27.7M.
#   - IT company capturing Secretaría de Bienestar (welfare ministry) via consecutive large
#     DAs in 2016-2017: biometric enrollment and "integral information services" without
#     competition. Bienestar welfare programs (Oportunidades-era data) channeled 374M DA
#     to an IT integrator with no major competitive track record. P3 intermediary pattern
#     with DA concentration at welfare ministry then dispersed smaller contracts elsewhere.

# FPs (structural / legitimate operators):
# 37766 PRICEWATERHOUSECOOPERS SC (Big 4 accounting firm, legitimate)
# 14032 UNIVERSIDAD AUTONOMA DE NUEVO LEON (public state university, exempt)
# 50626 CRUZ ROJA MEXICANA IAP (Red Cross humanitarian org, non-profit)
# 44691 PROTECTIVE MATERIALS TECHNOLOGY (SEDENA ballistic plates, authorized defense)
# 58921 PQ SERVICIOS E INFRAESTRUCTURA (SEDENA military helmets/armor, specialized defense)
# 19076 PROVEEDORA INTEGRAL DE EMPRESAS (SEDENA general supplier, 5%SB=mostly competitive)
# 44304 CULIACAN MOTORS (authorized SEDENA vehicle dealer, Sinaloa)

# Needs review:
# 1925, 63256, 23250, 21006, 370, 237044, 109091, 45615, 128662, 229999

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_613 = (
        "SCALA SUPERVISION CONSULTORIA ASESORIA Y LABORATORIO — P6 SCT/CAPUFE road "
        "supervision monopoly: 890.2M, 292 contracts, 88% single-bid, 21 years. "
        "SCT 448.7M (164c), SICT 195.4M (39c), CAPUFE 166.8M (62c). Contract types: "
        "road supervision, project studies, tunnel administration. A supervision consulting "
        "firm winning nearly every federal highway supervision contract uncontested for "
        "21 years. SCT and CAPUFE manage Mexico's federal road network (50K km+). "
        "88% SB in competitive LP procedures across both agencies = systematic deterrence "
        "of rival consulting firms or bid rotation arrangement."
    )

    note_614 = (
        "CORPOMEX MC SC — P6 CAPUFE outsourcing capture: 2,434.8M, 32 contracts, "
        "66% SB, 9 years (2010-2019). CAPUFE 1.319B (subcontratación de personal for "
        "toll operations: 633.9M LP 2011 SB, 309.6M LP 2014 SB, 141.8M DA 2014). "
        "ISSSTE 445.4M (329.7M LP 2019 SB, Pensionissste commercial recruitment). "
        "Banobras 285M LP 2011 SB (technical/admin outsourcing). CIATEQ 83.2M. "
        "An outsourcing firm monopolizing personnel subcontracting at major federal "
        "entities via single-bid competitive procedures. CAPUFE toll network outsourcing "
        "+ ISSSTE pension services + development bank = cross-institutional capture."
    )

    note_615 = (
        "DEICO DESARROLLO DE INFRAESTRUCTURA Y CONEXOS (Sinaloa) — P6 CONAGUA monopoly: "
        "587.2M, 18 contracts, 94% single-bid, 2011-2017. CONAGUA 482.4M: "
        "394M LP 2017 (risk=1.00, rectificación Río Tula), 27.5M LP 2016 (risk=0.65), "
        "24.6M LP 2012. Sinaloa SOP 78.2M. A Sinaloa contractor wins 394M CONAGUA water "
        "infrastructure contract (river rectification) as only bidder in 2017, then "
        "disappears. 94% SB rate = essentially every CONAGUA tender uncontested. "
        "Sinaloa-region infrastructure contracting at CONAGUA aligns with documented "
        "cartel-connected contractor patterns."
    )

    note_616 = (
        "INTELIGENCIA Y TECNOLOGIA INFORMATICA SA DE CV — P3 Bienestar DA capture: "
        "623.4M total, Bienestar 373.6M via two DAs: 274.4M DA 2017 ('Servicio Integral "
        "de Información y de Apoyo Tecnológico') + 99.2M DA 2016 ('Confronta, Enrolamiento "
        "Biométrico de Huellas'). No competition on either contract. Bienestar (welfare "
        "ministry) channeled 374M to an IT integrator in consecutive years without bidding. "
        "Biometric enrollment and IT services for Oportunidades/Prospera social programs. "
        "Then dispersed: IMSS 55.9M, CONAFE 35.6M, CAPFCE 27.7M. P3 intermediary pattern "
        "with DA concentration at welfare ministry."
    )

    cases = [
        (0, [(22789, "SCALA, SUPERVISION, CONSULTORIA, ASESORIA Y LABORATORIO, S.A. DE C.V.", "high")],
         "SCALA SUPERVISION - SCT/CAPUFE Road Supervision Monopoly 890M (88%SB 21yrs)",
         "procurement_fraud", "high", note_613, 890200000, 2005, 2025),

        (1, [(62686, "CORPOMEX MC SC", "high")],
         "CORPOMEX - CAPUFE Outsourcing P6 Capture 2.4B (66%SB 2010-2019)",
         "procurement_fraud", "high", note_614, 2434800000, 2010, 2019),

        (2, [(64136, "DEICO DESARROLLO DE INFRAESTRUCTURA Y CONEXOS SA DE CV", "high")],
         "DEICO INFRAESTRUCTURA - CONAGUA Sinaloa Monopoly 587M (94%SB 2011-2017)",
         "procurement_fraud", "high", note_615, 587200000, 2011, 2017),

        (3, [(3389, "INTELIGENCIA Y TECNOLOGIA INFORMATICA, S.A. DE C.V.", "high")],
         "ITI INFORMATICA - Bienestar DA Capture 373M (2016-2017) P3",
         "procurement_fraud", "high", note_616, 373600000, 2016, 2017),
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
        37766,    # PRICEWATERHOUSECOOPERS SC (Big 4 accounting)
        14032,    # UNIVERSIDAD AUTONOMA DE NUEVO LEON (public state university)
        50626,    # CRUZ ROJA MEXICANA IAP (Red Cross, humanitarian non-profit)
        44691,    # PROTECTIVE MATERIALS TECHNOLOGY (SEDENA ballistic equipment, authorized)
        58921,    # PQ SERVICIOS E INFRAESTRUCTURA (SEDENA military helmet/armor manufacturer)
        19076,    # PROVEEDORA INTEGRAL DE EMPRESAS (SEDENA authorized supplier, 5% SB)
        44304,    # CULIACAN MOTORS (authorized SEDENA vehicle dealer)
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
        1925,     # COMPAÑIA PERFORADORA MEXICO (3.4B PEMEX drilling 2005-2007)
        63256,    # JORGE JONATHAN TORRES CORONA (persona física 1.9B CFE events 2013)
        23250,    # IDOM INGENIERIA (406.7M engineering consultancy, international firm)
        21006,    # URBANIZADORA Y EDIFICADORA DE MEXICO (153M Chihuahua 2005-2015)
        370,      # FOCUS ON SERVICES (426M IT services Banjercito+ASA+IPN)
        237044,   # TASEFI SA DE CV (387.5M cleaning IMSS+CAPUFE 2018-2025)
        109091,   # ZARATE GARCIA PAZ Y ASOCIADOS (66.4M 79%DA gobernacion)
        45615,    # INTEGRADORES DE TECNOLOGIA (1,012.6M IT hacienda 62%DA)
        128662,   # CANAL URBANO SA DE CV (91.9M 100%DA gobernacion)
        229999,   # VORTEX BUSSINES SA DE RL DE CV (166.4M 58%DA gobernacion)
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
    print(f"\nDone. Cases 613-616 inserted.")


if __name__ == "__main__":
    run()
