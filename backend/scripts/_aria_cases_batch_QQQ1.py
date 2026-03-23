#!/usr/bin/env python3
"""
GT Mining Batch QQQ1 - ARIA T3 investigation (7 vendors)

Investigated 2026-03-23:
  v82923   GIBITNET SOLUCIONES INTEGRALES     ADD  (BANJERCITO 82.8%, 33 ctrs 569M SB/DA)
  v43159   OPERADORA AUTOPISTAS ALDESEM       ADD  (BANOBRAS single 671M SB, ghost/P2 pattern)
  v10139   CONSTANCIA DEL GOLFO SA DE CV      ADD  (SCT 87.2%, 100% SB, 279M 2002-2007)
  v38422   ARQUITECTURA CONSTRUCTIVA SAENZ    ADD  (NL state 93.7%, 100% SB, 578M)
  v140404  CLIMATIZACION ESPECIALIZADA NORTE  ADD  (INER 60.9%+INP 18% = 79%, 50% DA, HVAC capture)
  v469     GRUPO LIMPIEZA Y MANTENIMIENTO     SKIP (dispersed SS 29%+SAT 28%+SHCP 20%, multi-ministry)
  v8094    GEN INDUSTRIAL SA DE CV            SKIP (IMSS 62% value but 264 ctrs dispersed count)

Cases added: 5  |  Vendors skipped: 2
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 947:
        print(f"ERROR: max_id={max_id}, expected >= 947. Aborting.")
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

    # Case 1: GIBITNET - BANJERCITO military bank IT capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "BANJERCITO Military Bank IT Institutional Capture - Gibitnet",
        "institutional_capture", 2010, 2021, "high", 569_000_000,
        "ARIA T3 queue pattern analysis",
        "GIBITNET SOLUCIONES INTEGRALES SA DE CV (v82923): 43 contracts, 687M total. "
        "BANJERCITO (Banco Nacional del Ejercito, Fuerza Aerea y Armada): "
        "33 contracts, 569M (82.8%), DA=15.2%, SB=63.6% (2010-2021). "
        "Also SEGALMEX: 80M DA (2019), Alimentacion Bienestar: 34M DA (2023). "
        "IT/systems integrator with near-exclusive access to Mexico's "
        "military bank (serving army, air force, and navy personnel). "
        "33 contracts over 11 years at BANJERCITO via predominantly SB tenders — "
        "systematic long-term IT service capture at a security-sensitive institution.",
    ))
    conn.execute(sql_vendor, (
        c1, 82923, "GIBITNET SOLUCIONES INTEGRALES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "BANJERCITO 82.8%: 33 ctrs 569M, 63.6% SB 2010-2021",
    ))

    # Case 2: ALDESEM - BANOBRAS single massive SB contract (ghost/single-contract)
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "BANOBRAS Highway Infrastructure Single-Bid Ghost Contract - Aldesem",
        "ghost_company", 2012, 2012, "high", 671_000_000,
        "ARIA T3 queue pattern analysis",
        "OPERADORA DE AUTOPISTAS ALDESEM SA DE CV (v43159): 1 contract, 671M SB (2012). "
        "BANOBRAS (Banco Nacional de Obras y Servicios Publicos): 100% of total. "
        "Highway operator awarded a single 671M single-bid contract at BANOBRAS "
        "in 2012. No other contracts before or after — one contract then disappears. "
        "P2 Ghost flag: company created for a single large SB contract at "
        "Mexico's national public works bank, then no further activity. "
        "671M in a single uncontested tender at BANOBRAS is extreme.",
    ))
    conn.execute(sql_vendor, (
        c2, 43159, "OPERADORA DE AUTOPISTAS ALDESEM SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "Single 671M SB at BANOBRAS 2012, zero other activity — P2 ghost",
    ))

    # Case 3: CONSTANCIA DEL GOLFO - SCT road construction SB capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "SCT Road Infrastructure Single-Bid Capture - Constancia del Golfo",
        "single_bid_capture", 2002, 2019, "high", 279_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTANCIA DEL GOLFO SA DE CV (v10139): 6 contracts, 320M total. "
        "100% single-bid rate. SCT: 4 contracts, 279M SB (87.2%), 2002-2007. "
        "Gobierno del Estado de Veracruz: 36M SB (2019). "
        "ASIPONA Coatzacoalcos: 5M SB. "
        "Gulf coast construction company with 87.2% concentration at "
        "the Secretaria de Comunicaciones y Transportes (federal roads ministry) "
        "via 100% single-bid tenders. Large early contracts (2002-2007) "
        "at SCT followed by smaller VER state and port contracts.",
    ))
    conn.execute(sql_vendor, (
        c3, 10139, "CONSTANCIA DEL GOLFO, S.A DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "SCT 87.2% concentration, 100% SB, 4 contracts 279M 2002-2007",
    ))

    # Case 4: ARQUITECTURA CONSTRUCTIVA SAENZ - Nuevo Leon SB capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Nuevo Leon State Infrastructure Single-Bid Capture - Arquitectura Saenz",
        "single_bid_capture", 2010, 2015, "high", 578_000_000,
        "ARIA T3 queue pattern analysis",
        "ARQUITECTURA CONSTRUCTIVA SAENZ SA DE CV (v38422): 15 contracts, 617M total. "
        "100% single-bid rate. All Nuevo Leon state entities: "
        "NL-Secretaria de Infraestructura: 4 contracts, 497M SB (80.5%), 2010-2015. "
        "NL-Sistema de Caminos: 2 contracts, 66M SB (10.7%), 2010-2011. "
        "NL-Presidencia Municipal de Allende: 15M SB (2015). "
        "Combined NL = 578M (93.7%), all 100% SB across 15 consecutive tenders. "
        "Construction company dominating Nuevo Leon state infrastructure procurement "
        "via uncontested bids spanning 5 years. Three different NL state agencies "
        "all awarding to the same contractor without competition.",
    ))
    conn.execute(sql_vendor, (
        c4, 38422, "ARQUITECTURA CONSTRUCTIVA SAENZ, S.A.",
        "primary", "high", "aria_queue_t3", 0.92,
        "NL 93.7%: Infraestructura 497M + Caminos 66M = 578M, 100% SB 15 contracts",
    ))

    # Case 5: CLIMATIZACION ESPECIALIZADA DEL NORTE - INER/INP HVAC DA capture
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "National Health Institute HVAC Direct Award Capture - Climatizacion Especializada",
        "institutional_capture", 2015, 2024, "medium", 246_000_000,
        "ARIA T3 queue pattern analysis",
        "CLIMATIZACION ESPECIALIZADA DEL NORTE SA DE CV (v140404): 68 contracts, 312M. "
        "INER (Instituto Nacional de Enfermedades Respiratorias): 30 contracts, 190M "
        "(60.9%), DA=63.3%, 2015-2023. "
        "Instituto Nacional de Pediatria: 13 contracts, 56M (17.9%), 2015-2024. "
        "Combined INER + INP = 246M (78.8%). "
        "HVAC/air conditioning specialist with systematic DA access to "
        "Mexico's national respiratory disease institute over 8 years. "
        "30 contracts at INER via 63.3% DA — while specialized HVAC is legitimately "
        "concentrated at health institutes, the DA rate and volume suggest "
        "non-competitive exclusive supply relationship.",
    ))
    conn.execute(sql_vendor, (
        c5, 140404, "CLIMATIZACION ESPECIALIZADA DEL NORTE SA DE CV",
        "primary", "medium", "aria_queue_t3", 0.78,
        "INER 60.9% (63.3% DA) + INP 17.9% = 78.8%, 68 contracts HVAC health",
    ))

    # Link contracts
    links = [
        (c1, 82923, 2010, 2021),
        (c2, 43159, 2012, 2012),
        (c3, 10139, 2002, 2019),
        (c4, 38422, 2010, 2015),
        (c5, 140404, 2015, 2024),
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

    for vid in [82923, 43159, 10139, 38422, 140404]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (469, "Dispersed cleaning/maintenance (Grupo Limpieza) - SS 29%+SAT 28%+SHCP 20% across legitimate federal ministries"),
        (8094, "Gen Industrial - IMSS 62% value but 264 contracts dispersed by count, mixed DA/SB pattern"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 5 cases ({c1}-{c5}), linked {total_linked} contracts, skipped 2.")


if __name__ == "__main__":
    main()
