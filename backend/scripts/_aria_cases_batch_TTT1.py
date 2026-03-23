#!/usr/bin/env python3
"""
GT Mining Batch TTT1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v31195   COMTELSAT SA DE CV                  ADD  (SEGOB+prisons 84% DA, 805M, 67.7% DA rate)
  v21269   TOPTEL S DE RL DE CV                ADD  (SRE 57%+SEP 25%+STPS 16%=98%, telecom, 929M)
  v114160  GRUPO METAINDUSTRIAL DE INNOVACION  ADD  (SEDATU 84%, single 359M DA 2016)
  v34040   ECATEPEC SA DE CV                   ADD  (SEDENA 90.1%, single 318M DA 2016)
  v4135    INDUSTRIAS SOLA BASIC SA DE CV      SKIP (dispersed 16 ctrs, top=12%)
  v25004   MAC COMPUTADORAS DE MORELOS         SKIP (390 ctrs dispersed IT supply, top=17%)

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
    if max_id is None or max_id < 961:
        print(f"ERROR: max_id={max_id}, expected >= 961. Aborting.")
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

    # Case 1: COMTELSAT - SEGOB + prison system telecom DA capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "SEGOB and Prison System Telecom Direct Award Capture - Comtelsat",
        "institutional_capture", 2007, 2023, "high", 805_000_000,
        "ARIA T3 queue pattern analysis",
        "COMTELSAT SA DE CV (v31195): 68 contracts, 958M total (2007-2023). "
        "67.7% direct award rate. "
        "Prevencion y Readaptacion Social (federal prison system): "
        "2 contracts, 498M DA (52%), 2017. "
        "Secretaria de Gobernacion (SEGOB): 14 contracts, 307M DA (32%), 2007-2023. "
        "SPR (Sistema Publico de Radiodifusion): 7 contracts, 92M DA (9.6%). "
        "Combined SEGOB-related institutions (prisons under SEGOB + SEGOB HQ + SPR) "
        "= 897M (93.6%). Telecommunications company with systematic DA access "
        "to Mexico's interior/security ministry apparatus spanning 16 years. "
        "498M to prison telecom in 2 contracts in a single year (2017) is extreme.",
    ))
    conn.execute(sql_vendor, (
        c1, 31195, "COMTELSAT SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "Prisons 52% DA + SEGOB 32% DA + SPR 9.6% = 94%, 67.7% DA 68 contracts",
    ))

    # Case 2: TOPTEL - SRE/SEP/STPS multi-ministry telecom SB/DA capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Federal Ministry Telecom Multi-Capture - Toptel",
        "institutional_capture", 2005, 2014, "high", 908_000_000,
        "ARIA T3 queue pattern analysis",
        "TOPTEL S DE RL DE CV (v21269): 25 contracts, 929M total (2005-2014). "
        "DA=44%, SB=56%. SRE (Secretaria de Relaciones Exteriores): "
        "5 contracts, 532M (57.3%), DA=40%, SB=60%, 2007-2014. "
        "SEP: 2 contracts, 232M (25%), 2005-2010. "
        "STPS: 5 contracts, 144M (15.5%), 2005-2013. "
        "Combined SRE+SEP+STPS = 908M (97.7%). "
        "Telecommunications company capturing Foreign Ministry, Education, and "
        "Labor Ministry contracts via mixed SB/DA methods over 9 years. "
        "Large SRE telecom contracts (532M for consular/embassy communications). "
        "97.7% concentrated at 3 federal ministries suggests systematic "
        "multi-ministry government IT capture.",
    ))
    conn.execute(sql_vendor, (
        c2, 21269, "TOPTEL S DE RL DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "SRE 57.3%+SEP 25%+STPS 15.5%=97.7%, telecom 2005-2014",
    ))

    # Case 3: METAINDUSTRIAL - SEDATU housing single massive DA
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "SEDATU Housing Ministry Single Direct Award Capture - Grupo Metaindustrial",
        "institutional_capture", 2013, 2016, "high", 359_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO METAINDUSTRIAL DE INNOVACIONES SA DE CV (v114160): 10 contracts, 427M. "
        "SEDATU (Secretaria de Desarrollo Agrario, Territorial y Urbano): "
        "1 contract, 359M DA (2016) = 84.1%. "
        "QRO-Secretaria de Obras: 45M mixed. SLP-Instituto de Vivienda: 12M SB. "
        "Combined = 416M (97.4%). "
        "Industrial/construction services company awarded a single 359M direct award "
        "at Mexico's housing and land development secretariat in 2016. "
        "One massive DA representing 84% of company's total procurement value "
        "is classic single-contract institutional capture.",
    ))
    conn.execute(sql_vendor, (
        c3, 114160, "GRUPO METAINDUSTRIAL DE INNOVACIONES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "SEDATU 84.1%: single 359M DA in 2016",
    ))

    # Case 4: ECATEPEC SA DE CV - SEDENA single massive DA
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "SEDENA Defense Ministry Single Direct Award - Ecatepec SA",
        "institutional_capture", 2016, 2016, "high", 318_000_000,
        "ARIA T3 queue pattern analysis",
        "ECATEPEC SA DE CV (v34040): 10 contracts, 353M total. "
        "SEDENA (Secretaria de la Defensa Nacional): 1 contract, 318M DA (2016) = 90.1%. "
        "Other minor contracts at Chicoloapan municipality, Ecatepec municipality, CDMX. "
        "Company named after Mexico State industrial city, awarded a single 318M "
        "direct award at Mexico's military (Army Ministry) in 2016. "
        "90.1% concentration in one DA at a security-sensitive federal institution. "
        "Pattern consistent with Defense Ministry procurement capture.",
    ))
    conn.execute(sql_vendor, (
        c4, 34040, "ECATEPEC, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "SEDENA 90.1%: single 318M DA in 2016",
    ))

    # Link contracts
    links = [
        (c1, 31195, 2007, 2023),
        (c2, 21269, 2005, 2014),
        (c3, 114160, 2013, 2016),
        (c4, 34040, 2016, 2016),
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

    for vid in [31195, 21269, 114160, 34040]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (4135, "Industrias Sola Basic - dispersed 16 contracts top=12%, no capture pattern"),
        (25004, "Mac Computadoras de Morelos - 390 contracts dispersed IT supply, top=17%, multi-client"),
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
