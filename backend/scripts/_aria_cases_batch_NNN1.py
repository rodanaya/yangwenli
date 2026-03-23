#!/usr/bin/env python3
"""
GT Mining Batch NNN1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v138799  GRUPO TOTAL INBAS SA DE CV          ADD  (Sonora 55% + CONAGUA 32% = 87% SB capture, 771M)
  v18990   CONSTRUCTORA COSS BU SA DE CV       ADD  (NL state 100% SB, 75% NL entities, 549M)
  v49801   ENLACES TERRESTRES NACIONALES       ADD  (SEDENA 605M single DA, 98.5% concentration)
  v54748   LANDUCCI SA DE CV                   ADD  (SRE 83% + Presidencia 10% = 93%, 100% DA)
  v43337   TEC PLUSS SA DE CV                  SKIP (dispersed, 1029M across 186 ctrs, top=18%)
  v3740    SUMINISTROS LARY SA DE CV           SKIP (CONAFE 81% but 0% DA/SB, competitive bidding)

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
    if max_id is None or max_id < 934:
        print(f"ERROR: max_id={max_id}, expected >= 934. Aborting.")
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

    # Case 1: GRUPO TOTAL INBAS - Sonora + CONAGUA SB capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Sonora State and CONAGUA Infrastructure Single-Bid Capture - Grupo Total Inbas",
        "single_bid_capture", 2016, 2023, "high", 671_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO TOTAL INBAS SA DE CV (v138799): 17 contracts, 771M total (2016-2023). "
        "64.7% single-bid rate. Gobierno del Estado de Sonora: 324M SB (2022) = 42%. "
        "Secretaria de Infraestructura Sonora: 99M SB (2019) = 13%. "
        "CONAGUA: 218M SB (2023) + 31M DA (2016) = 32%. "
        "Combined Sonora state = 423M (55%) + CONAGUA = 249M (32%) = 672M (87%). "
        "Infrastructure construction firm with concentrated SB wins at Sonora state "
        "agencies and CONAGUA. Large single contracts (324M, 218M) via uncontested "
        "tenders in consecutive years suggest systematic capture.",
    ))
    conn.execute(sql_vendor, (
        c1, 138799, "GRUPO TOTAL INBAS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "Sonora 55% + CONAGUA 32% = 87%, 64.7% SB, 324M SB 2022 + 218M SB 2023",
    ))

    # Case 2: CONSTRUCTORA COSS BU - Nuevo Leon state SB capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Nuevo Leon State Construction Single-Bid Capture - Constructora Coss Bu",
        "single_bid_capture", 2010, 2024, "high", 414_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA COSS BU SA DE CV (v18990): 23 contracts, 549M total (2010-2024). "
        "100% single-bid rate. All Nuevo Leon state entities: "
        "Comite de Construccion de Escuelas NL: 205M SB (37%). "
        "Secretaria de Obras Publicas NL: 137M SB (25%). "
        "Servicios de Agua y Drenaje de Monterrey: 72M SB (13%). "
        "Combined NL entities = 414M (75%) — 23 consecutive uncontested competitive "
        "tenders spanning 14 years across multiple NL state agencies. "
        "Classic state-level construction capture pattern across education, "
        "infrastructure, and water sectors in Nuevo Leon.",
    ))
    conn.execute(sql_vendor, (
        c2, 18990, "CONSTRUCTORA COSS BU, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "NL 75% concentration, 100% SB, 23 contracts 2010-2024",
    ))

    # Case 3: ENLACES TERRESTRES NACIONALES - SEDENA single massive DA
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "SEDENA Ground Transport Direct Award Capture - Enlaces Terrestres Nacionales",
        "institutional_capture", 2017, 2019, "high", 605_000_000,
        "ARIA T3 queue pattern analysis",
        "ENLACES TERRESTRES NACIONALES SA DE CV (v49801): 28 contracts, 614M total (2017-2019). "
        "89.3% DA rate. Secretaria de la Defensa Nacional: 1 contract, 605M DA (2018) = 98.5%. "
        "Ground transportation/logistics company awarded a single 605M direct award "
        "at Mexico's military (SEDENA) in 2018. Remaining 9M spread across "
        "Servicio de Proteccion Federal and CONAGUA. Near-total concentration "
        "(98.5%) in one direct award at the defense ministry is extreme — "
        "single-contract institutional capture at a security-sensitive institution.",
    ))
    conn.execute(sql_vendor, (
        c3, 49801, "ENLACES TERRESTRES NACIONALES, S.A DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "SEDENA 98.5% concentration: single 605M DA in 2018",
    ))

    # Case 4: LANDUCCI - SRE + Presidencia 100% DA capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Foreign Ministry and Presidency Direct Award Capture - Landucci",
        "institutional_capture", 2011, 2013, "high", 211_000_000,
        "ARIA T3 queue pattern analysis",
        "LANDUCCI SA DE CV (v54748): 27 contracts, 229M total (2011-2013). "
        "100% direct award rate. SRE (Secretaria de Relaciones Exteriores): "
        "172M DA + 17M DA (2012) = 189M (82.5%). "
        "Presidencia de la Republica: 12M + 10M DA = 22M (9.6%). "
        "Combined SRE + Presidencia = 211M (92%), all via direct awards in 2011-2013. "
        "Interior design/furnishings company with exclusive DA access to "
        "Mexico's Foreign Ministry and Presidency during the Calderon-to-Pena "
        "Nieto transition. All 100% DA, concentrated in two prestige institutions.",
    ))
    conn.execute(sql_vendor, (
        c4, 54748, "LANDUCCI SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "SRE 82.5% + Presidencia 9.6% = 92%, 100% DA 2011-2013",
    ))

    # Link contracts
    links = [
        (c1, 138799, 2016, 2023),
        (c2, 18990, 2010, 2024),
        (c3, 49801, 2017, 2019),
        (c4, 54748, 2011, 2013),
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

    for vid in [138799, 18990, 49801, 54748]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (43337, "Dispersed IT (Tec Pluss) - 1029M across 186 contracts, top institution only 18%, no capture"),
        (3740, "CONAFE 81% but 0% DA and 0% SB (Suministros Lary) - all open competitive bidding, legitimate supplier"),
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
