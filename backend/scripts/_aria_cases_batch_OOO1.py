#!/usr/bin/env python3
"""
GT Mining Batch OOO1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v46780   RUBEN MIGUEL VELASCO OCAMPO        ADD  (Veracruz state SB 100%, all VER institutions, 312M)
  v48919   ANUNCIOS UNIPOLARES SA DE CV       ADD  (CONAGUA+CHIH water SB 85%, billboard/signage, 202M)
  v44096   CONSTRUCTORA MELARE SA DE CV       ADD  (multi-state SB 100%: CDMX 45%+Tlaxcala 31%+Puebla 22%)
  v253514  KOM BUSINESS SA DE CV              ADD  (Banco del Bienestar 89%, 206M single DA, 232M total)
  v11654   JANO SA DE CV                      SKIP (1050M at state finance but 0% DA/SB, competitive bidding)
  v42667   LAB TECH INSTRUMENTACION SA DE CV  SKIP (1379 ctrs dispersed health, top=9%, structural supply)

Cases added: 4  |  Vendors skipped: 2
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 938:
        print(f"ERROR: max_id={max_id}, expected >= 938. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3
    c4 = max_id + 4

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c4}")

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

    # Case 1: RUBEN MIGUEL VELASCO OCAMPO - Veracruz state SB capture (individual)
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Veracruz State Construction Single-Bid Capture - Ruben Miguel Velasco Ocampo",
        "single_bid_capture", 2010, 2016, "high", 312_000_000,
        "ARIA T3 queue pattern analysis",
        "RUBEN MIGUEL VELASCO OCAMPO (v46780): 16 contracts, 312M total (2010-2016). "
        "Individual contractor (natural person) winning Veracruz state contracts. "
        "100% concentrated at Veracruz state agencies: "
        "VER-SEDESOL: 173M SB (2013) = 55.4%. "
        "VER-Secretaria de Salud: 48M (4 ctrs, 75% SB). "
        "VER-Comision del Agua: 47M SB (5 ctrs). "
        "VER-Instituto Espacios Educativos: 26M SB (2010). "
        "VER-Obras Publicas: 16M SB (4 ctrs). "
        "All Veracruz = 312M (100%), predominantly SB. "
        "Natural person capturing construction contracts across 5 different "
        "Veracruz state agencies via uncontested tenders (2010-2016).",
    ))
    conn.execute(sql_vendor, (
        c1, 46780, "RUBEN MIGUEL VELASCO OCAMPO",
        "primary", "high", "aria_queue_t3", 0.90,
        "Veracruz 100% concentration, SB dominant, individual contractor 16 contracts",
    ))

    # Case 2: ANUNCIOS UNIPOLARES - CONAGUA/Chihuahua water SB capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "CONAGUA and Chihuahua Water Signage Single-Bid Capture - Anuncios Unipolares",
        "single_bid_capture", 2010, 2025, "medium", 171_000_000,
        "ARIA T3 queue pattern analysis",
        "ANUNCIOS UNIPOLARES SA DE CV (v48919): 46 contracts, 202M total (2010-2025). "
        "82.6% single-bid rate. CONAGUA: 5 contracts, 102M SB (50.5%). "
        "CHIH-Junta Central de Agua y Saneamiento: 29 contracts, 54M mixed SB (26.7%). "
        "Gobierno del Estado de Chihuahua: 15M SB (7.4%). "
        "Combined water/Chihuahua entities = 171M (85%). "
        "Outdoor advertising/signage company with SB capture at Mexico's national "
        "water commission and Chihuahua state water agencies. "
        "82.6% SB rate for a signage company at water utilities is anomalous — "
        "suggests exclusive relationship for infrastructure signage/branding.",
    ))
    conn.execute(sql_vendor, (
        c2, 48919, "ANUNCIOS UNIPOLARES SA DE CV",
        "primary", "medium", "aria_queue_t3", 0.80,
        "CONAGUA 50.5% + CHIH water 27% = 85%, 82.6% SB, signage company",
    ))

    # Case 3: CONSTRUCTORA MELARE - multi-state SB capture (CDMX + Tlaxcala + Puebla)
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Multi-State Construction Single-Bid Capture - Constructora Melare",
        "single_bid_capture", 2014, 2024, "high", 752_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA MELARE SA DE CV (v44096): 15 contracts, 775M total. "
        "86.7% single-bid rate. Three state governments, all SB: "
        "Gobierno del Estado CDMX: 348M SB (44.9%). "
        "TLAX-Secretaria de Obras Publicas: 237M SB (30.6%). "
        "PUE-Secretaria de Finanzas/Comite Construccion: 167M SB + 16M (23.6%). "
        "Combined CDMX + Tlaxcala + Puebla = 768M (99%). "
        "Construction company winning consecutive uncontested competitive tenders "
        "across Mexico City, Tlaxcala, and Puebla state agencies. "
        "Cross-state SB wins suggest pre-arranged competition in multiple "
        "state government procurement systems.",
    ))
    conn.execute(sql_vendor, (
        c3, 44096, "CONSTRUCTORA MELARE SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "CDMX 45% + Tlaxcala 31% + Puebla 24% = 99%, 86.7% SB, 15 contracts",
    ))

    # Case 4: KOM BUSINESS - Banco del Bienestar single massive DA
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Banco del Bienestar Direct Award Capture - Kom Business",
        "institutional_capture", 2019, 2022, "high", 228_000_000,
        "ARIA T3 queue pattern analysis",
        "KOM BUSINESS SA DE CV (v253514): 6 contracts, 232M total (2019-2022). "
        "Banco del Bienestar SNC: 1 contract, 206M DA (2019) = 88.8% of total. "
        "Also CONAVI: 22M SB (2020), SE: 2M SB. "
        "IT/services company awarded a single 206M direct award at Banco del Bienestar "
        "(government bank for financial inclusion of unbanked population) in 2019 — "
        "same institution as SARENGGO capture (case 929). "
        "A second IT vendor winning massive DA at Banco del Bienestar in the same period "
        "suggests the AMLO-era government bank had systematic DA-based IT capture.",
    ))
    conn.execute(sql_vendor, (
        c4, 253514, "KOM BUSINESS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "Banco del Bienestar 88.8%: single 206M DA in 2019",
    ))

    # Link contracts
    links = [
        (c1, 46780, 2010, 2016),
        (c2, 48919, 2010, 2025),
        (c3, 44096, 2014, 2024),
        (c4, 253514, 2019, 2022),
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

    for vid in [46780, 48919, 44096, 253514]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (11654, "JANO - 1050M at state finance secretariat but DA=0% SB=0%, competitive bidding, legitimate"),
        (42667, "Lab Tech Instrumentacion - 1379 ctrs dispersed across health/defense, top=9%, structural supply"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 4 cases ({c1}-{c4}), linked {total_linked} contracts, skipped 2.")


if __name__ == "__main__":
    main()
