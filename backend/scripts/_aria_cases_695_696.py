"""
ARIA Cases 695-696: March 18 2026 investigation session.

Cases:
  695: IMPRESORA SILVAFORM - SAT Tax Forms Printing Monopoly 469M (22x LP SB=1 P6)
  696: CORPORATIVO DESARROLLO SUSTENTABLE - SADER+Bienestar Agricultural DA 157M (P3 2019)

Run from backend/ directory.
"""

# CASE-695: VID 10590 IMPRESORA SILVAFORM SA DE CV
#   - 469.4M, 254 contracts, 40% DA, 38% SB, 2002-2025, hacienda.
#   - SAT 211.2M (27c, DA=4, SB=22): 22 single-bid competitive LP wins at SAT for
#     tax form printing and mass communication services:
#     47.2M LP 2011 SB=1 "Servicio de Emisión e Impresión de Comunicados Masivos
#       al Contribuyente" (mass taxpayer notices)
#     34.5M LP 2010 SB=1 "Servicio de Emisión e Impresión de Comunicados al
#       Contribuyente" (taxpayer communications)
#     31.2M LP 2010 SB=1 "Servicios de Formas Preimpresas denominadas Comunicados"
#     30.3M LP 2008 SB=1 "Servicios de Impresión de Formularios Preimpresos"
#     24.2M LP 2006 SB=1 (security film for SHCP)
#   - CONAFE 55.1M (SB=7): card/document personalization for rural education fund.
#     CAPUFE 29.1M (SB=1). SCT. Multiple institutions.
#   - Tax form/document printing company monopolizing SAT's official taxpayer
#     communication printing via LP single-bid across 2002-2025. 22 uncontested
#     wins at SAT for official tax documents and mass communications. P6 SAT
#     printing and document services monopoly — the government's tax authority
#     paying one printer for all official taxpayer notices without competition.

# CASE-696: VID 245410 CORPORATIVO DE DESARROLLO SUSTENTABLE SA DE CV
#   - 156.5M, 3 contracts, 100% DA, 0% SB, 2019, trabajo/agricultura.
#   - SADER/Agricultura 98.6M DA 2019 risk=0.46 "DOSIS DE INSUMOS DE NUTRICION
#     VEGETAL ELABORADOS CON BASE EN MICROORGANISMOS BENÉFICOS" — microbial
#     agricultural inputs (biofertilizers) direct award to "Corporativo de
#     Desarrollo Sustentable" — a corporate name that doesn't match agricultural
#     inputs.
#   - Bienestar 37.9M DA 2019 risk=0.49 "ADQUISICION DE HERRAMIENTAS, MATERIALES
#     E INSUMOS, EN EL MARCO DEL PROGRAMA SEMBRANDO VIDA" (tools/materials for
#     Sembrando Vida agricultural welfare program).
#   - Bienestar 19.9M DA 2019 risk=0.49 "Adquisición de materiales, herramientas
#     e insumos para la implementación del Programa Sembrando Vida".
#   - Three DA contracts all in 2019 totaling 156.5M: agricultural biofertilizer
#     inputs to SADER + material/tools/inputs for Sembrando Vida program at
#     Bienestar. All direct awards, all in 2019 only. Company name does not match
#     agricultural input supply — P3 intermediary routing Sembrando Vida program
#     supplies through a corporate entity via DA. Industry mismatch + DA concentration.

# FPs (structural / legitimate operators):
# 54153 CENTRO DE INSTRUMENTACION Y REGISTRO SISMICO AC (CIRES) — the scientific
#   non-profit that created and operates SASMEX (Sistema de Alerta Sísmica
#   Mexicano), Mexico's seismic early warning system. SEGOB/SSPC pay CIRES via DA
#   as the unique technical operator of this life-safety infrastructure. 100% DA
#   is appropriate for the sole operator of a national emergency alert system.
# 122791 CONSORCIO EMAUS SA DE CV — SEDENA 213.3M LP 2021 SB=0 risk=0.21
#   (competitive procurement for SEDENA store non-permanent equipment — SB=0
#   means multiple bidders). Low risk scores (0.15-0.21). No DA concentration.
#   Legitimate competitive supplier.
# 44026 MANUFACTURAS POST FORM SA DE CV — furniture/office equipment manufacturer.
#   SEDENA 45.2M (competitive LP SB=0), SEDATU 30.9M LP SB=1, Diconsa 25.2M,
#   INEGI 24.8M, Estado de Mexico 20.8M. Cross-institutional furniture supplier
#   via competitive LP in most cases. Risk scores 0.21-0.29. Structural supplier.
# 1433 AVETRONIC SA DE CV — school equipment/HVAC supplier for INIFED (National
#   Education Infrastructure Institute). INIFED 86.5M + 45.4M both LP SB=0
#   (competitive). SEP 90.5M (minimal SB). Structural education infrastructure
#   equipment supplier. Risk scores 0.19-0.29.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_695 = (
        "IMPRESORA SILVAFORM SA DE CV — P6 SAT tax forms printing monopoly: 469.4M, "
        "38% SB, 254 contracts, 2002-2025. SAT 211.2M (27c SB=22): 22 single-bid LP "
        "wins at SAT for taxpayer communication printing: 47.2M LP 2011 SB=1 'Emision "
        "Impresion Comunicados Masivos Contribuyente' + 34.5M LP 2010 SB=1 + 31.2M LP "
        "2010 SB=1 'Formas Preimpresas Comunicados' + 30.3M LP 2008 SB=1 'Formularios "
        "Preimpresos'. CONAFE 55.1M (SB=7 card personalization). CAPUFE 29.1M SB=1. "
        "Tax form and official document printer monopolizing SAT's taxpayer notice "
        "printing via LP SB=1 across 2002-2025. 22 uncontested wins at SAT for "
        "government tax communication documents. P6 SAT printing monopoly."
    )

    note_696 = (
        "CORPORATIVO DE DESARROLLO SUSTENTABLE SA DE CV — P3 Sembrando Vida/SADER "
        "agricultural DA intermediary: 156.5M, 100% DA, 3 contracts, 2019. SADER "
        "98.6M DA 2019 risk=0.46 'DOSIS DE INSUMOS DE NUTRICION VEGETAL ELABORADOS "
        "CON BASE EN MICROORGANISMOS BENEFICOS' (biofertilizer inputs). Bienestar "
        "37.9M DA 2019 risk=0.49 'HERRAMIENTAS, MATERIALES E INSUMOS PROGRAMA "
        "SEMBRANDO VIDA' + 19.9M DA 2019 'materiales e insumos Sembrando Vida'. "
        "All 3 contracts in 2019 only, all DA. 'Corporativo de Desarrollo Sustentable' "
        "= corporate name mismatching agricultural inputs — P3 intermediary routing "
        "Sembrando Vida program supplies via DA at SADER and Bienestar in 2019. "
        "Industry mismatch + 100% DA for specialized agricultural inputs."
    )

    cases = [
        (0, [(10590, "IMPRESORA SILVAFORM SA DE CV", "high")],
         "SILVAFORM - SAT Tax Forms Printing Monopoly 469M (22x LP SB=1 2002-2025 P6)",
         "procurement_fraud", "high", note_695, 469400000, 2002, 2025),

        (1, [(245410, "CORPORATIVO DE DESARROLLO SUSTENTABLE SA DE CV", "high")],
         "CORPORATIVO DESARROLLO SUSTENTABLE - SADER+Bienestar Sembrando Vida DA 156M",
         "procurement_fraud", "high", note_696, 156500000, 2019, 2019),
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
        54153,    # CIRES Centro Sismico (unique seismic alert system operator, DA appropriate)
        122791,   # CONSORCIO EMAUS (SEDENA competitive LP SB=0 low risk, structural supplier)
        44026,    # MANUFACTURAS POST FORM (furniture structural multi-institution LP mostly competitive)
        1433,     # AVETRONIC (INIFED school equipment competitive LP SB=0, structural)
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
        714,      # ALEF SOLUCIONES (TELECOMM DA+SB risk=1.00 but SCT 362M competitive)
        289,      # LD I ASSOCIATS (Bellas Artes LP SB=1 risk=1.00 + AICM SB=1 IT rental)
        5594,     # PRODUCTOS OMEGA (Presidencia 110M DA + CONAFOR IT infrastructure)
        1790,     # DESTINO ALTA TECNOLOGIA (SEP 226M LP SB=0 competitive school equipment)
        120003,   # INFRAESTRUCTURA Y CONSTRUCCIONES DE PUEBLA (CDMX 160M SB=1 state)
        101704,   # DISTRIBUIDORES FABRICANTES ARTICULOS ESCOLARES (INEGI 141M LP competitive)
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
    print(f"\nDone. Cases 695-696 inserted.")


if __name__ == "__main__":
    run()
