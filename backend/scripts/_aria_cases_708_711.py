"""
ARIA Cases 708-711: March 19 2026 investigation session.

Cases:
  708: TADCO CONSTRUCTORA - AICM Airport Runway 1.9B + SEDATU 165M (100%SB P6)
  709: MITAMEX - FGR+PGR+SEGOB Printing/Digitalization 1.8B (533M SB=1 + DA P3)
  710: SATELITE CONSTRUCTORA - Hidalgo Hospital+IMSS 670M (SB=1 risk=1.00 P6)
  711: ACABADOS PROFESIONALES - SEDATU+IPN+IMSS 1.5B (SEDATU 1099M SB=9 P6)

Run from backend/ directory.
"""

# CASE-708: VID 119602 TADCO CONSTRUCTORA SA DE CV
#   - 2,191.1M, 8 contracts, 0% DA, 100% SB, 2015-2023, ambiente/infraestructura.
#   - AICM (Aeropuerto Internacional Ciudad de México) 1,895.4M (1c, DA=0, SB=1):
#     1,895M LP 2015 SB=1 risk=0.38 "PROYECTO EJECUTIVO DE PISTAS, RODAJES Y
#     PLATAFORMAS Y AYUDAS A LA [NAVEGACIÓN]" — AICM airport runway, taxiway, and
#     platform engineering/construction project, uncontested (1.9B single-bid).
#   - SEDATU 165.2M (1c, DA=0, SB=1): LP 2021 SB=1 "PROYECTO INTEGRAL DE OBRA
#     PÚBLICA A PRECIO ALZADO" (lump-sum public works, uncontested).
#   - CDMX 56.4M SB=1 (water program). ISSSTE 43.4M DA=1 SB=1.
#   - Construction company winning AICM's landmark airport runway/platform project
#     (1.895B) uncontested — Mexico City's old Benito Juárez airport's critical
#     runway infrastructure awarded via single-bid competitive LP. Plus SEDATU, CDMX,
#     ISSSTE all SB=1. 8 of 8 contracts single-bid. P6 AICM airport infrastructure
#     + multi-institution construction monopoly.

# CASE-709: VID 4092 ORGANIZACION MITAMEX, S.A. DE C.V.
#   - 1,795.3M, 217 contracts, 33% DA, 43% SB, 2001-2023, salud/gobernacion.
#   - Fiscalía General de la República (FGR) 796.2M (3c, DA=2, SB=1): 533M LP 2021
#     SB=1 risk=0.34 "SERVICIO INTEGRAL DE IMPRESIÓN, DIGITALIZACIÓN Y FOTOCOPIADO
#     DE D[OCUMENTOS]" (document printing/digitization for federal prosecutor, SB=1)
#     + 132M DA 2019 + 131M DA.
#   - PGR (now FGR) 282.2M (2c, DA=1, SB=1): 267M DA 2017 + 15M LP.
#   - SEGOB 165.1M (20c, DA=14, SB=6): Interior Ministry IT/printing services.
#   - SEP 158.5M (5c, DA=0, SB=5): Education printing/digitization.
#   - Printing, digitalization, and photocopying company capturing the federal
#     Attorney General's office (PGR/FGR) via sustained DA and SB=1 contracts.
#     FGR+PGR = 1,078M combined: 533M SB=1 + 267M DA + 132M DA for document
#     services at Mexico's top law enforcement institution. Plus SEGOB (DA) and
#     SEP. P3 institutional capture of justice system document management.

# CASE-710: VID 20767 CONSTRUCTORA Y PROMOTORA SATELITE S.A. DE C.V.
#   - 669.9M, 25 contracts, 20% DA, 64% SB, 2011-2024, salud.
#   - Servicios de Salud de Hidalgo 308.7M (3c, DA=0, SB=3): 176M LP 2024 SB=1
#     risk=1.00 "TERMINACIÓN DEL HOSPITAL GENERAL DE [Hidalgo]" (hospital completion,
#     uncontested, risk=1.00) + 94M LP 2023 SB=1 "CONSTRUCCIÓN PARA EL HOSPITAL
#     GENERAL" (hospital construction, uncontested). Two consecutive SB=1 hospital
#     contracts at Hidalgo health services (176M risk=1.00 + 94M risk=0.78).
#   - IMSS 264.3M (11c, DA=4, SB=7): 7 single-bid IMSS hospital construction contracts.
#   - SAT 50.1M (SB=2). ISSSTE 33.9M (SB=2).
#   - Hospital construction company capturing Hidalgo's state hospital construction
#     (176M risk=1.00 + 94M both SB=1) plus IMSS 264M (SB=7) and SAT/ISSSTE. P6
#     health construction monopoly: Hidalgo SSa + IMSS + SAT + ISSSTE all SB=1.

# CASE-711: VID 36639 ESPECIALISTAS EN ACABADOS PROFESIONALES, S.A. DE C.V.
#   - 1,517.4M, 96 contracts, 23% DA, 40% SB, 2003-2024, educacion/infraestructura.
#   - SEDATU 15c 1,098.9M (DA=6, SB=9): 251M LP 2023 SB=1 risk=0.41 "RECINTO FERIAL
#     EN EL MUNICIPIO DE OTHÓN P. BLANCO" (fairground, Quintana Roo) + 235M LP 2023
#     SB=1 "CONSTRUCCIÓN DE PARQUE BICENTENARIO ETAPA 2" + 117M LP SB=1 "ALBAÑILERÍA
#     Y ACABADOS" (masonry/finishing). 3 large SB=1 projects at SEDATU (territorial
#     development agency) all in 2023.
#   - IPN 37c 261.4M (DA=15, SB=8): 2003-2024 Polytechnic maintenance/construction.
#   - IMSS 12c 62.3M (SB=11): small hospital finishing contracts.
#   - Construction/finishing company capturing SEDATU's community infrastructure
#     projects (fairground + park + finishing totaling 1.1B all SB=1 in 2023) plus
#     long-term IPN maintenance capture (DA=15) and IMSS SB=11. P6 SEDATU+IPN+IMSS
#     construction/finishing monopoly.

# FPs (structural / legitimate operators):
# 33523 COMPANIA COMERCIAL HERDEZ SA DE CV — Herdez is one of Mexico's largest food
#   conglomerates (McCormick, Búfalo, Barilla in Mexico). 585M 4877c DA at Diconsa,
#   LICONSA, ISSSTE tiendas — staple food distribution through government retail networks.
#   P6 flagged for market share, but Herdez is a legitimate major food manufacturer
#   distributing through government channels. Structural food market operator.
# 9148 KONE MEXICO SA DE CV — KONE is the Finnish elevator and escalator multinational.
#   1,230M 555c DA at IMSS, ISSSTE, hospitals — elevator maintenance/modernization at
#   government healthcare facilities nationwide. KONE and Otis dominate elevator services
#   globally. DA for elevator maintenance is standard (OEM-specific service). Structural
#   international elevator services company.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_708 = (
        "TADCO CONSTRUCTORA SA DE CV — P6 AICM airport + multi-institution "
        "construction monopoly: 2,191.1M, 100% SB, 8 contracts, 2015-2023. "
        "AICM 1,895.4M LP 2015 SB=1 risk=0.38 'PROYECTO EJECUTIVO DE PISTAS, "
        "RODAJES Y PLATAFORMAS Y AYUDAS A LA NAVEGACION' (Mexico City airport "
        "runway/taxiway/platform construction, 1.895B uncontested). SEDATU 165.2M "
        "LP 2021 SB=1 'PROYECTO INTEGRAL OBRA PUBLICA A PRECIO ALZADO'. CDMX "
        "56.4M SB=1 (water). ISSSTE 43.4M SB=1. All 8 contracts single-bid. "
        "Construction firm winning AICM's flagship 1.895B runway project + "
        "SEDATU + CDMX + ISSSTE all SB=1. P6 AICM airport infrastructure "
        "monopoly + multi-institution construction capture."
    )

    note_709 = (
        "ORGANIZACION MITAMEX SA DE CV — P3 FGR/PGR document services capture: "
        "1,795.3M, 43% SB, 33% DA, 217 contracts, 2001-2023. FGR 796.2M (3c DA=2 "
        "SB=1): 533M LP 2021 SB=1 risk=0.34 'SERVICIO INTEGRAL IMPRESION "
        "DIGITALIZACION Y FOTOCOPIADO DE DOCUMENTOS' (FGR document services "
        "uncontested) + 132M DA 2019 + 131M DA. PGR 282.2M: 267M DA 2017 + 15M. "
        "SEGOB 165.1M (DA=14). SEP 158.5M (SB=5). Printing/digitalization company "
        "capturing federal Attorney General's office (FGR+PGR combined 1.078B) via "
        "533M SB=1 + multiple DA for document management + SEGOB (DA) + SEP. "
        "P3 institutional capture of federal justice system document services."
    )

    note_710 = (
        "CONSTRUCTORA Y PROMOTORA SATELITE SA DE CV — P6 Hidalgo hospital + IMSS "
        "construction monopoly: 669.9M, 64% SB, 25 contracts, 2011-2024. Servicios "
        "de Salud de Hidalgo 308.7M (3c SB=3): 176M LP 2024 SB=1 risk=1.00 "
        "'TERMINACION DEL HOSPITAL GENERAL DE [Hidalgo]' + 94M LP 2023 SB=1 "
        "risk=0.78 'CONSTRUCCION HOSPITAL GENERAL' (two consecutive SB=1 hospital "
        "contracts). IMSS 264.3M (11c DA=4 SB=7): 7 SB=1 IMSS construction. SAT "
        "50.1M SB=2. ISSSTE 33.9M SB=2. Hospital construction company capturing "
        "Hidalgo state hospitals (176M risk=1.00 + 94M risk=0.78 both SB=1) + IMSS "
        "(264M SB=7) + SAT + ISSSTE. P6 health construction: SSa Hidalgo + IMSS "
        "+ SAT + ISSSTE all SB=1."
    )

    note_711 = (
        "ESPECIALISTAS EN ACABADOS PROFESIONALES SA DE CV — P6 SEDATU+IPN+IMSS "
        "construction/finishing monopoly: 1,517.4M, 40% SB, 23% DA, 96 contracts, "
        "2003-2024. SEDATU 15c 1,098.9M (DA=6 SB=9): 251M LP 2023 SB=1 risk=0.41 "
        "'RECINTO FERIAL MUNICIPIO OTHON P. BLANCO' + 235M LP 2023 SB=1 'PARQUE "
        "BICENTENARIO ETAPA 2' + 117M LP SB=1 'ALBANILERIA Y ACABADOS' (3 large "
        "SEDATU infrastructure projects all SB=1 in 2023). IPN 37c 261.4M (DA=15 "
        "SB=8): long-term Polytechnic maintenance. IMSS 12c 62.3M (SB=11). "
        "Construction/finishing firm capturing SEDATU community projects (fairground "
        "+ park + masonry totaling 1.1B all SB=1 in 2023) + IPN maintenance DA "
        "monopoly + IMSS SB. P6 SEDATU+IPN+IMSS finishing/construction capture."
    )

    cases = [
        (0, [(119602, "TADCO CONSTRUCTORA SA DE CV", "high")],
         "TADCO CONSTRUCTORA - AICM Airport Runway 1.9B + SEDATU 165M (100%SB P6)",
         "procurement_fraud", "high", note_708, 2191100000, 2015, 2023),

        (1, [(4092, "ORGANIZACION MITAMEX, S.A. DE C.V.", "high")],
         "MITAMEX - FGR+PGR+SEGOB Printing 1.8B (533M SB=1 + DA capture P3)",
         "procurement_fraud", "high", note_709, 1795300000, 2001, 2023),

        (2, [(20767, "CONSTRUCTORA Y PROMOTORA SATELITE S.A. DE C.V.", "high")],
         "SATELITE CONSTRUCTORA - Hidalgo Hospital+IMSS 670M (SB=1 risk=1.00 P6)",
         "procurement_fraud", "high", note_710, 669900000, 2011, 2024),

        (3, [(36639, "ESPECIALISTAS EN ACABADOS PROFESIONALES, S.A. DE C.V.", "high")],
         "ACABADOS PROFESIONALES - SEDATU+IPN+IMSS 1.5B (SEDATU 1099M SB=9 P6)",
         "procurement_fraud", "high", note_711, 1517400000, 2003, 2024),
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
        33523,    # COMPANIA COMERCIAL HERDEZ (major Mexican food conglomerate, gov retail distribution)
        9148,     # KONE MEXICO (Finnish elevator/escalator multinational, OEM hospital maintenance)
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
        117986,   # CINE TRANSFORMER (337M DA PEMEX opaque title + IFT 46M — P3 flagged, needs verify)
        5413,     # ASECA (999M 373c salud — large medical, need to investigate DA/SB pattern)
        50173,    # NORTH AMERICAN SOFTWARE (371M 23c agricultura — software at SAGARPA)
        184464,   # KEY CAPITAL SAPI (330M 9c SB=1 infraestructura — financial vehicle for construction)
        80966,    # AQUALIA INFRAESTRUCTURAS (219M 3c SB=1 P3 ambiente — water concession company)
        134326,   # GASIFICADORA DEL NORTE (222M 3c SB=1 P3 energia — gas distribution)
        12923,    # MUEBLES Y MUDANZAS BENITEZ (201M 67c educacion — furniture/moving structural)
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
    print(f"\nDone. Cases 708-711 inserted.")


if __name__ == "__main__":
    run()
