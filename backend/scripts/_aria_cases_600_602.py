"""
ARIA Cases 600-602: March 17 2026 investigation session.

Cases:
  600: SOLUCIONES INTEGRALES EN CLIMATIZACION - CFE HVAC/Facade Industry Mismatch (489.7M DA)
  601: SUMACORTEC - INSABI Ambulance/Mobile Unit Intermediary (488M DA 2020-2021)
  602: LORE SOLUCIONES INTEGRALES EMPRESARIALES DE SINALOA - CINVESTAV Outsourcing Capture (94.7% DA)

Run from backend/ directory.
"""

# Cases:
# CASE-600: VID 69288 SOLUCIONES INTEGRALES EN CLIMATIZACION SA DE CV
#   - HVAC/climatization company wins 489.7M DA from CFE in 2014 — building facade or HVAC
#     contract; industry mismatch (hacienda sector). Total 549.5M, 61% single-bid, 9 years active.
#   - Red flags: largest contract is 89% of total value, DA to a specialized maintenance vendor
#     that also wins at SAT and SCT. Not a typical CFE supplier.

# CASE-601: VID 259293 SUMACORTEC SA DE CV
#   - 13 contracts, 523.7M total. Three large DA contracts at INSABI during 2020-2021:
#     363.2M + 89M + 36.1M = 488.3M at Instituto de Salud para el Bienestar (COVID era)
#   - P3 Intermediary pattern. Ambulances/mobile medical units supplier; 5 years active.
#   - INSABI (INSABI = successor to Seguro Popular) was notorious for COVID procurement fraud.
#     Company captures near-total of INSABI budget in this category.

# CASE-602: VID 198361 LORE SOLUCIONES INTEGRALES EMPRESARIALES DE SINALOA SC
#   - 38 contracts, 327.9M total. 94.7% DA rate. 84.2% at one institution (CINVESTAV).
#   - Top contracts: 203.3M + 12M + 11.7M = 227M at CINVESTAV in 2018 alone.
#   - Also 79.6M at CONAGUA via licitacion publica in 2018.
#   - P6 Institutional Capture: Sinaloa outsourcing firm captures CINVESTAV (federal research
#     center of IPN) contracts almost exclusively. Company active only 4 years (2017-2021),
#     then disappears. Classic pattern of politically-connected firm capturing research institution.

# Needs review (next batch of T2 pending vendors):
# 118991, 131365, 26038, 190895, 251825, 657, 210178, 24639,
# 6880, 149285, 1832, 192096, 231695, 57281, 72032, 250656, 50206

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_600 = (
        "HVAC/climatization company (SOLUCIONES INTEGRALES EN CLIMATIZACION) wins 489.7M DA "
        "from CFE (Comisión Federal de Electricidad) in 2014 — industry mismatch: an HVAC "
        "maintenance firm winning a major CFE infrastructure contract via direct award. "
        "Additional contracts at SAT and SCT. 61% single-bid rate. Total 549.5M over 9 years. "
        "Red flag: single largest contract = 89% of total lifetime value, awarded without competition."
    )

    note_601 = (
        "SUMACORTEC wins 488.3M in DA contracts from INSABI (Instituto de Salud para el Bienestar) "
        "during 2020-2021 COVID emergency period: 363.2M + 89M + 36.1M. P3 Intermediary pattern. "
        "INSABI (former Seguro Popular, dissolved 2023) was central to multiple COVID procurement "
        "scandals. Company active 5 years, concentrated on single institution. Ambulance/mobile "
        "medical unit supplier with no prior track record of this scale."
    )

    note_602 = (
        "LORE SOLUCIONES INTEGRALES EMPRESARIALES DE SINALOA captures CINVESTAV (Centro de "
        "Investigación y de Estudios Avanzados del IPN) via 94.7% DA rate: 203.3M + 12M + 11.7M "
        "= 227M at CINVESTAV in 2018 alone, plus 79.6M at CONAGUA. P6 Institutional Capture. "
        "Sinaloa-based outsourcing firm with zero research profile winning federal research "
        "institution contracts. Active only 4 years (est. 2017, dormant by 2022). Classic "
        "politically-connected capture of a single high-value institution."
    )

    cases = [
        (0, [(69288, "SOLUCIONES INTEGRALES EN CLIMATIZACION SA DE CV", "high")],
         "SOLUCIONES CLIMATIZACION - CFE HVAC Industry Mismatch DA 489.7M (2014)",
         "procurement_fraud", "high", note_600, 489700000, 2014, 2017),

        (1, [(259293, "SUMACORTEC SA DE CV", "high")],
         "SUMACORTEC - INSABI Ambulance/Mobile Unit Capture 488M DA (2020-2021)",
         "procurement_fraud", "high", note_601, 488300000, 2020, 2021),

        (2, [(198361, "LORE SOLUCIONES INTEGRALES EMPRESARIALES DE SINALOA, S.C.", "high")],
         "LORE SOLUCIONES - CINVESTAV Outsourcing Capture 94.7% DA 327.9M (2018)",
         "procurement_fraud", "high", note_602, 327900000, 2017, 2021),
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

    # FPs: structural monopolies / legitimate operators from this batch
    fp_structural = [
        118991,   # FICOT SA DE CV (likely legitimate distributor)
        657,      # ESTAFETA MEXICANA (major legitimate courier/logistics)
        6880,     # FOOD SERVICE DE MEXICO (institutional catering chain)
        1832,     # CHS ZARAGOZA MOTORS (authorized vehicle dealer)
    ]
    for vid in fp_structural:
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='fp_excluded'
            WHERE vendor_id=?
        """, (vid,))
    conn.commit()
    print(f"Marked {len(fp_structural)} FPs (structural_monopoly)")

    # Needs review: remaining T2 vendors for further investigation
    needs_review = [
        131365,   # COMERCIALIZADORA MORELOS SERVICIOS Y SISTEMAS
        26038,    # TELMARK CONTACT LINE
        190895,   # SERVICIOS INTEGRALES DE SALUD NOVA
        251825,   # DSTI MEXICO
        210178,   # DESARROLLOS MECATRONICOS CATAM
        24639,    # SURMAN MEXICO
        149285,   # UNIPROVA DE MEXICO
        192096,   # TECNOLOGIA ECL GLOBAL GROUP
        231695,   # INTELLIGENCE ADVANCE NANOTECHNOLOGY
        57281,    # Servicio Chileno Mexicano
        72032,    # FIREKY
        250656,   # WISE INTERACTIONS
        50206,    # SEGTEC
    ]
    for vid in needs_review:
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review'
            WHERE vendor_id=? AND review_status='pending'
        """, (vid,))
    conn.commit()
    print(f"Marked {len(needs_review)} needs_review")

    conn.commit()

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
    print(f"\nDone. Cases 600-602 inserted.")


if __name__ == "__main__":
    run()
