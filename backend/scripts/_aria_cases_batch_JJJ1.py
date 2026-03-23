#!/usr/bin/env python3
"""
GT Mining Batch JJJ1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v219259  SKY BOOK SA DE CV                  ADD  (P2 ghost, 1 contract 397M SB at EDOMEX education)
  v36122   SANIPAP DE MEXICO SA DE CV         ADD  (IMSS/IEPSA paper supply capture, 71% IMSS, 100% DA at IEPSA)
  v135338  SOLUCIONES TECNOLOGICAS MEDICAS    ADD  (dual IMSS+ISSSTE medical tech capture, 756M, 83% DA at ISSSTE)
  v48971   GESTION DEL AGUA Y MEDIO AMBIENTE  SKIP (PEMEX subsidiaries + research centers, complex pattern)
  v19293   EDM DE MEXICO SA DE CV             ADD  (Sonora state financial SB capture, 90% SB, 73% Sonora)
  v24328   CONSTRUCTORA INCO SA DE CV         ADD  (SEDATU construction SB capture, 89% at SEDATU, 75% SB)

Cases added: 5  |  Vendors skipped: 1
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 921:
        print(f"ERROR: max_id={max_id}, expected >= 921. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3
    c4 = max_id + 4
    c5 = max_id + 5

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c5}")

    sql_case = (
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, year_start, year_end, "
        "confidence_level, estimated_fraud_mxn, source_news, notes) "
        "VALUES (?,?,?,?,?,?,?,?,?,?)"
    )
    sql_vendor = (
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, role, evidence_strength, "
        "match_method, match_confidence, notes) VALUES (?,?,?,?,?,?,?,?)"
    )

    # Case 1: SKY BOOK - EDOMEX education ghost company
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "EDOMEX Education Ghost Vendor - Sky Book",
        "ghost_company", 2018, 2018, "high", 396_700_000,
        "ARIA T3 queue pattern analysis",
        "SKY BOOK SA DE CV (v219259): 1 contract, 396.7M MXN (2018). "
        "Single-bid competitive tender at MEX-Servicios Educativos Integrados al Estado "
        "de Mexico (SEIEM). Education books/materials company with ONE contract comprising "
        "100% of vendor value at a state education authority in a single year. "
        "No other contracts before or after. Classic ghost/shell company pattern: "
        "created specifically to capture one large contract then disappear. P2 Ghost flag.",
    ))
    conn.execute(sql_vendor, (
        c1, 219259, "SKY BOOK SA DE CV",
        "primary", "high", "aria_queue_t3", 0.95,
        "Single 397M SB contract at EDOMEX-SEIEM 2018, no other activity",
    ))

    # Case 2: SANIPAP - IMSS/IEPSA paper supply capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "IMSS and Government Printing House Paper Supply Capture - Sanipap",
        "institutional_capture", 2008, 2024, "medium", 390_000_000,
        "ARIA T3 queue pattern analysis",
        "SANIPAP DE MEXICO SA DE CV (v36122): 1055 contracts, 538M total (2008-2024). "
        "IMSS: 47 contracts, 225M (42%), 31.9% DA. "
        "IEPSA (Impresora y Encuadernadora Progreso): 753 contracts, 165M (31%), 100% DA. "
        "Talleres Graficos de Mexico: 34 contracts, 21M (4%), 97.1% DA. "
        "CONALITEG: 11 contracts, 13M (2%), 81.8% DA. "
        "Paper/printing supplies company with exclusive DA relationship at government "
        "printing entities (IEPSA, TGM, CONALITEG) and IMSS. High DA concentration "
        "at multiple education/printing sector institutions spanning 16 years.",
    ))
    conn.execute(sql_vendor, (
        c2, 36122, "SANIPAP DE MEXICO, S.A. DE C.V.",
        "primary", "medium", "aria_queue_t3", 0.78,
        "753 ctrs at IEPSA (100% DA), 47 at IMSS, printing supply capture",
    ))

    # Case 3: SOLUCIONES TECNOLOGICAS MEDICAS - dual IMSS+ISSSTE capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Dual IMSS-ISSSTE Medical Technology Capture - Soluciones Tecnologicas Medicas",
        "institutional_capture", 2014, 2025, "high", 756_000_000,
        "ARIA T3 queue pattern analysis",
        "SOLUCIONES TECNOLOGICAS MEDICAS SA DE CV (v135338): 61 contracts, 987M "
        "(2014-2025). ISSSTE: 6 contracts, 376M (38%), 83.3% DA. "
        "IMSS: 17 contracts, 380M (39%), 41.2% DA. "
        "Combined IMSS+ISSSTE = 756M (77% of total). 80.3% overall DA rate. "
        "Medical diagnostic equipment/technology supplier with systematic DA access "
        "to both major Mexican social security institutions (IMSS = private sector "
        "workers, ISSSTE = public sector workers). High-value dual institutional "
        "capture via direct awards spanning 11 years.",
    ))
    conn.execute(sql_vendor, (
        c3, 135338, "SOLUCIONES TECNOLOGICAS MEDICAS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "IMSS 39% + ISSSTE 38% = 77% combined, 83.3% DA at ISSSTE",
    ))

    # Case 4: EDM DE MEXICO - Sonora state SB capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Sonora State Financial Services Single-Bid Capture - EDM de Mexico",
        "single_bid_capture", 2005, 2016, "high", 758_000_000,
        "ARIA T3 queue pattern analysis",
        "EDM DE MEXICO SA DE CV (v19293): 10 contracts, 1036M total (2005-2016). "
        "90% single-bid rate. Sonora state: SON-Finanzas/Tesoreria 338M SB (2010) + "
        "SON-Hacienda 228M SB (2013) + Gobierno del Estado Sonora 191M SB (2007) = "
        "758M (73% at Sonora state agencies). Tamaulipas: 201M SB (2015). "
        "Financial/administrative services company capturing state government "
        "financial contracts via uncontested tenders in Sonora across three "
        "administrations (2005-2016). Characteristic state-level financial capture.",
    ))
    conn.execute(sql_vendor, (
        c4, 19293, "EDM DE MEXICO, SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "Sonora 73% concentration, 90% SB, 10 contracts 2005-2016 financial svcs",
    ))

    # Case 5: CONSTRUCTORA INCO - SEDATU SB capture
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "SEDATU Construction Single-Bid Capture - Constructora Inco",
        "single_bid_capture", 2006, 2024, "high", 985_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA INCO SA DE CV (v24328): 20 contracts, 1099M total (2006-2024). "
        "75% single-bid rate. SEDATU: 593M SB (2023) + 189M SB (2023) + 130M SB (2023) "
        "+ 73M DA (2024) = 985M (89.6% at Secretaria de Desarrollo Agrario, "
        "Territorial y Urbano). Major SEDATU construction contractor winning "
        "massive single-bid tenders in 2023 (three contracts totaling 913M in one year). "
        "Dominates rural/urban development construction procurement at federal level.",
    ))
    conn.execute(sql_vendor, (
        c5, 24328, "CONSTRUCTORA INCO, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "SEDATU 89.6% concentration, 75% SB, 913M in 2023 alone",
    ))

    # Link contracts
    links = [
        (c1, 219259, 2018, 2018),
        (c2, 36122, 2008, 2024),
        (c3, 135338, 2014, 2025),
        (c4, 19293, 2005, 2016),
        (c5, 24328, 2006, 2024),
    ]
    total_linked = 0
    for case_id, vendor_id, yr_start, yr_end in links:
        rows = conn.execute(
            "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
            (vendor_id, yr_start, yr_end),
        ).fetchall()
        for (cid,) in rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (case_id, cid),
            )
        total_linked += len(rows)
        print(f"  Case {case_id} (v{vendor_id}): linked {len(rows)} contracts ({yr_start}-{yr_end})")

    for vid in [219259, 36122, 135338, 19293, 24328]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # SKIP
    conn.execute(
        "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
        ("Complex pattern: COMEX (PEMEX subsidiary) + IMTA + CIDESI research centers, insufficient single-institution concentration", 48971),
    )
    print(f"  v48971: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 5 cases ({c1}-{c5}), linked {total_linked} contracts, skipped 1.")


if __name__ == "__main__":
    main()
