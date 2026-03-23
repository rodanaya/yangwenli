#!/usr/bin/env python3
"""
GT Mining Batch III1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v388     GRUPO SIAYEC SA DE CV           SKIP (dispersed archive/doc services, 117 ctrs 23 yrs)
  v15330   ATN INGENIERIA Y SERVICIOS      SKIP (borderline IMSS IT, single 164M DA, not systematic)
  v256471  ASCH SA DE CV                   ADD  (CONAGUA/ISSSTE SB capture, 70% SB, 916M 2020-2025)
  v82754   PROPIEDADES INMOBILIARIAS       ADD  (SCT/ISSSTE real estate SB, 100% SB, 55% at SCT)
  v6800    APPLIED BIOSYSTEMS DE MEXICO    SKIP (global genomics brand Thermo Fisher, structural DA)
  v35196   ASFALTOS Y DERIVADOS COSTA      ADD  (ASIPONA/Ferrocarril infrastructure SB, 350M 2024)

Cases added: 3  |  Vendors skipped: 3
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 918:
        print(f"ERROR: max_id={max_id}, expected >= 918. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c3}")

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

    # Case 1: ASCH - CONAGUA water infrastructure SB capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "CONAGUA Water Infrastructure Single-Bid Capture - ASCH",
        "single_bid_capture", 2020, 2025, "high", 533_000_000,
        "ARIA T3 queue pattern analysis",
        "ASCH SA DE CV (v256471): 10 contracts, 916M total (2020-2025). "
        "CONAGUA: 270.5M SB (2022) + 183.3M DA (2023) + 79.9M DA (2022) = 533M (58%). "
        "Also ISSSTE: 177.3M SB (2023). 70% single-bid rate, 30% DA rate. "
        "Rapidly growing infrastructure/construction firm with large CONAGUA and ISSSTE "
        "contracts via SB competitive tenders and direct awards starting AMLO era (2020). "
        "10 contracts totaling 916M in just 5 years is extreme velocity.",
    ))
    conn.execute(sql_vendor, (
        c1, 256471, "ASCH SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "CONAGUA 58% concentration, 70% SB, 916M in 5 years (2020-2025)",
    ))

    # Case 2: PROPIEDADES INMOBILIARIAS - SCT/ISSSTE real estate SB
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "SCT Government Real Estate Single-Bid Capture - Propiedades Inmobiliarias",
        "single_bid_capture", 2012, 2018, "high", 708_000_000,
        "ARIA T3 queue pattern analysis",
        "PROPIEDADES INMOBILIARIAS DE MEXICO SA DE CV (v82754): 20 contracts, "
        "1450M total (2012-2018). 100% single-bid rate. "
        "SCT: 323M SB (2013) + 261M SB (2014) + 123M SB (2017) = 708M (49%). "
        "ISSSTE: 119M SB (2013). All competitive tenders won uncontested. "
        "Real estate/facilities company providing government workspace/infrastructure "
        "to SCT and ISSSTE via systematic single-bid wins during Pena Nieto era.",
    ))
    conn.execute(sql_vendor, (
        c2, 82754, "PROPIEDADES INMOBILIARIAS DE MEXICO SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "SCT 49% concentration, 100% SB, 20 contracts 2012-2018",
    ))

    # Case 3: ASFALTOS - ASIPONA/Ferrocarril infrastructure SB
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Veracruz Port and Isthmus Railway SB Capture - Asfaltos y Derivados",
        "single_bid_capture", 2008, 2024, "medium", 503_000_000,
        "ARIA T3 queue pattern analysis",
        "ASFALTOS Y DERIVADOS DE LA COSTA SA DE CV (v35196): 17 contracts, 585M "
        "(2008-2024). 76.5% single-bid rate, 23.5% DA. "
        "Top institution: Admin Sistema Portuario Nacional (ASIPONA Veracruz): "
        "350M SB (2024). Ferrocarril del Istmo de Tehuantepec: 133M DA (2023) + "
        "29M SB (2008) + 23M SB (2016). 70.6% concentrated at ports/railway. "
        "Infrastructure asphalt contractor serving Veracruz port and Isthmus railway "
        "via uncontested tenders across multiple administrations.",
    ))
    conn.execute(sql_vendor, (
        c3, 35196, "ASFALTOS Y DERIVADOS DE LA COSTA S.A DE C.V",
        "primary", "medium", "aria_queue_t3", 0.82,
        "ASIPONA+FIT 70.6% concentration, 76.5% SB, port/railway asphalt",
    ))

    # Link contracts
    links = [
        (c1, 256471, 2020, 2025),
        (c2, 82754, 2012, 2018),
        (c3, 35196, 2008, 2024),
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

    for vid in [256471, 82754, 35196]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # SKIPs
    skips = [
        (388, "Dispersed archival/document services (Grupo Siayec), 117 contracts across many institutions 23 yrs"),
        (15330, "Borderline IMSS IT (ATN Ingenieria) - single 164M DA at IMSS but not systematic pattern over 29 ctrs"),
        (6800, "Global genomics brand (Applied Biosystems/Thermo Fisher), structural DA for proprietary instruments"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 3 cases ({c1}-{c3}), linked {total_linked} contracts, skipped 3.")


if __name__ == "__main__":
    main()
