#!/usr/bin/env python3
"""
GT Mining Batch WWW1 - ARIA T3 investigation (8 vendors)

Investigated 2026-03-23:
  v224628  GARKEN MEDICAL SA DE CV               ADD  (IMSS+SSTI 74%, 82% DA, 196 ctrs 781M 2018-2025)
  v33615   GOVERNMENT SOLUTIONS MEXICO           ADD  (SEP single 414M SB 2017 = 93%, P2 ghost pivot)
  v47626   CAV DISENO E INGENIERIA               ADD  (ICT 73%+SEDATU 13%=86%, 100% SB, 622M 2023-2024)
  v111701  DISTRIB COMBUSTIBLES SAN QUINTIN      ADD  (EXPORTADORA DE SAL 89% SB, 621M 2013-2016)
  v145823  LIDERES MATERIALES MEDICOS DEL NORTE  ADD  (IMSS+ISSSTE 97%, 79% DA, 221 ctrs 213M)
  v45343   COMERCIALIZADORA SERVICIOS IMAGEN     SKIP (dispersed 100% DA across 20+ agencies, top=12%)
  v69976   GUTIERREZ AUTOMOTORES                 SKIP (SEDENA 97% auto dealer 4 ctrs, competitive 0% SB)
  v213530  TOTAL PARTS AND COMPONENTS            SKIP (IMSS 55% but 0% DA/SB competitive, dispersed)

Cases added: 5  |  Vendors skipped: 3
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 975:
        print(f"ERROR: max_id={max_id}, expected >= 975. Aborting.")
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

    # Case 1: GARKEN MEDICAL - IMSS medical supply DA capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "IMSS Medical Supply Direct Award Capture - Garken Medical",
        "institutional_capture", 2018, 2025, "high", 781_000_000,
        "ARIA T3 queue pattern analysis",
        "GARKEN MEDICAL SA DE CV (v224628): 339 contracts, 1060M total (2018-2025). "
        "IMSS-SSTI (Servicios de Salud del IMSS): 36 contracts, 423M (40%), "
        "DA=75%, SB=3%, 2024-2025. "
        "IMSS (direct): 160 contracts, 358M (34%), DA=93%, SB=2%, 2018-2025. "
        "INSABI: 5 contracts, 183M (17%), 2022-2023. "
        "Combined IMSS entities (SSTI + direct) = 781M (73.7%). "
        "Medical supplies company with systematic DA dominance at IMSS: "
        "196 contracts across both IMSS direct and its service arm (SSTI) "
        "at combined 82% DA rate over 7 years. "
        "73.7% concentration at Mexico's largest health insurer via predominantly "
        "non-competitive direct award procurement — long-term exclusive medical supply capture.",
    ))
    conn.execute(sql_vendor, (
        c1, 224628, "GARKEN MEDICAL SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "IMSS-SSTI 40% (75% DA) + IMSS direct 34% (93% DA) = 73.7%, 196 ctrs 781M",
    ))

    # Case 2: GOVERNMENT SOLUTIONS MEXICO - SEP single massive SB ghost pivot
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "SEP Education Ministry Single-Bid Ghost Contract - Government Solutions Mexico",
        "ghost_company", 2008, 2021, "high", 414_000_000,
        "ARIA T3 queue pattern analysis",
        "GOVERNMENT SOLUTIONS MEXICO SA DE CV (v33615): 31 contracts, 443M total. "
        "SEP (Secretaria de Educacion Publica): 1 contract, 414M SB (93.4%), 2017. "
        "Prior activity: Hospital Infantil de Mexico Federico Gomez: 7 contracts, 7M DA "
        "(2008-2013). Instituto Nacional de Cancerologia: 7 contracts, 5M DA (2012-2021). "
        "Pattern: Company spent 2008-2016 accumulating small medical institution DA contracts "
        "(total ~12M), then suddenly won a single 414M single-bid contract at the "
        "Education Ministry in 2017 — 35x their entire prior revenue. "
        "Classic P2 ghost escalation: small legitimate activity as cover, "
        "then one massive SB at a sensitive institution. No large contracts before or after "
        "the 2017 SEP award. Government Solutions Mexico used SEP as single-contract target.",
    ))
    conn.execute(sql_vendor, (
        c2, 33615, "GOVERNMENT SOLUTIONS MEXICO, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "SEP 93.4%: single 414M SB 2017 — P2 ghost escalation from 12M prior activity",
    ))

    # Case 3: CAV DISEÑO E INGENIERIA - ICT/SCT + SEDATU recent SB capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Infrastructure Ministry and SEDATU Recent SB Capture - CAV Diseno e Ingenieria",
        "single_bid_capture", 2010, 2024, "high", 622_000_000,
        "ARIA T3 queue pattern analysis",
        "CAV DISENO E INGENIERIA SA DE CV (v47626): 26 contracts, 724M total. "
        "62% single-bid rate. ICT (Infraestructura, Comunicaciones y Transportes — "
        "rebranded SCT): 2 contracts, 529M SB (73%), 2023-2024. "
        "SEDATU (Secretaria de Desarrollo Agrario, Territorial y Urbano): "
        "2 contracts, 93M SB (12.8%), 2023. "
        "SCT (old entity): 1 contract, 37M DA (5.1%), 2018. "
        "Combined infrastructure-related = 622M (85.9%), all recent SB 2023-2024. "
        "Engineering firm capturing 529M in 2 single-bid contracts at Mexico's "
        "infrastructure/transport ministry (renamed from SCT to ICT under current administration) "
        "plus 93M at SEDATU — 622M in SB awards concentrated in a single year (2023). "
        "Extreme concentration at renamed federal infrastructure entity.",
    ))
    conn.execute(sql_vendor, (
        c3, 47626, "CAV DISENO E INGENIERIA",
        "primary", "high", "aria_queue_t3", 0.90,
        "ICT 73% + SEDATU 12.8% = 85.9%, 100% SB, 622M concentrated 2023-2024",
    ))

    # Case 4: DISTRIBUIDORA COMBUSTIBLES SAN QUINTIN - EXPORTADORA DE SAL SB capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Exportadora de Sal State Company Fuel SB Capture - Distribuidora San Quintin",
        "institutional_capture", 2013, 2016, "high", 621_000_000,
        "ARIA T3 queue pattern analysis",
        "DISTRIBUIDORA DE COMBUSTIBLES DE SAN QUINTIN SA DE CV (v111701): "
        "9 contracts, 697M total. "
        "EXPORTADORA DE SAL SA DE CV: 2 contracts, 621M SB (89.1%), 2013-2016. "
        "IMSS: 4 contracts, 75M (10.8%), 2015-2018. "
        "Exportadora de Sal is a partially state-owned company (majority government, "
        "minority Mitsubishi) that operates the world's largest salt mine in Baja California Sur. "
        "Fuel distributor from San Quintin (Baja California) winning 621M in 2 SB contracts "
        "at this state salt company is anomalous — small regional fuel supplier capturing "
        "massive exclusive fuel supply at a major state-owned enterprise via uncontested tenders.",
    ))
    conn.execute(sql_vendor, (
        c4, 111701, "DISTRIBUIDORA DE COMBUSTIBLES DE SAN QUINTIN SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "EXPORTADORA DE SAL 89.1%: 2 contracts 621M SB 2013-2016",
    ))

    # Case 5: LIDERES MATERIALES MEDICOS DEL NORTE - IMSS+ISSSTE medical DA capture
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "IMSS and ISSSTE Medical Materials Direct Award Capture - Lideres Materiales Medicos",
        "institutional_capture", 2014, 2025, "high", 213_000_000,
        "ARIA T3 queue pattern analysis",
        "LIDERES EN MATERIALES MEDICOS DEL NORTE S DE RL DE CV (v145823): "
        "237 contracts, 220M total (2014-2025). "
        "IMSS: 156 contracts, 193M (87.7%), DA=80%, SB=10%, 2014-2025. "
        "ISSSTE (Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado): "
        "65 contracts, 20M (9.1%), DA=78%, 2014-2025. "
        "Combined IMSS + ISSSTE = 213M (96.8%), DA=79%, 221 contracts. "
        "Northern Mexico medical materials supplier with 97% concentration at the two "
        "largest public health insurers (IMSS + ISSSTE) via 79% direct award rate "
        "over 11 years. 156 IMSS contracts at 80% DA rate is systematic exclusive supply "
        "bypassing competitive procurement requirements.",
    ))
    conn.execute(sql_vendor, (
        c5, 145823, "LIDERES EN MATERIALES MEDICOS DEL NORTE S DE RL DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "IMSS 87.7% (80% DA, 156 ctrs) + ISSSTE 9.1% = 96.8%, 79% DA overall",
    ))

    # Link contracts
    links = [
        (c1, 224628, 2018, 2025),
        (c2, 33615, 2008, 2021),
        (c3, 47626, 2010, 2024),
        (c4, 111701, 2013, 2018),
        (c5, 145823, 2014, 2025),
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

    for vid in [224628, 33615, 47626, 111701, 145823]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (45343, "Comercializadora Servicios Imagen - 98 ctrs 100% DA but dispersed across 20+ agencies top=12%, media/advertising structural"),
        (69976, "Gutierrez Automotores - SEDENA 97% but auto dealer 4 competitive contracts (0% SB, 25% DA), legitimate vehicle supply 2023-2024"),
        (213530, "Total Parts and Components - IMSS 55% but 0% DA/SB competitive, dispersed new vendor, no DA/SB pattern"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 5 cases ({c1}-{c5}), linked {total_linked} contracts, skipped 3.")


if __name__ == "__main__":
    main()
