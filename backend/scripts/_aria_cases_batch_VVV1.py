#!/usr/bin/env python3
"""
GT Mining Batch VVV1 - ARIA T3 investigation (8 vendors)

Investigated 2026-03-23:
  v98187   DIABE CONSTRUCCIONES Y DISENOS          ADD  (PROSPERA 100%, 865M in 5 contracts)
  v47654   CIRCULO LLANTERO SA DE CV               ADD  (CFE 100%, 72 ctrs 611M, 78% DA)
  v40946   KT SERVICIO ANAYA SA DE CV              ADD  (IMSS 94%, 30 ctrs 244M, 87% SB)
  v103946  KJFM DISENOS Y SOLUCIONES SA DE CV      ADD  (FONACOT 78%+INM 15%=93%, 67% DA, 549M)
  v53      GRUPO RAUDALES SA DE CV                 ADD  (Gulf coast ports 99%, 814M, SB dominant)
  v3171    GRUPO MESIS SA DE CV                    ADD  (CONAGUA 38%+SAGARPA 30%+Sonora 13%=81%, 86% SB)
  v24299   DISENO E INGENIERIA EN CONSTRUCCION     SKIP (10 ctrs dispersed, top=33%, multi-state)
  v19922   TRAUMASERVICE INTERNACIONAL SA DE CV    SKIP (340 ctrs IMSS 98%, specialized medical, low SB)

Cases added: 6  |  Vendors skipped: 2
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 969:
        print(f"ERROR: max_id={max_id}, expected >= 969. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3
    c4 = max_id + 4
    c5 = max_id + 5
    c6 = max_id + 6

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c6}")

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

    # Case 1: DIABE CONSTRUCCIONES - PROSPERA anti-poverty program capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "PROSPERA Anti-Poverty Program Construction Capture - Diabe Construcciones",
        "institutional_capture", 2010, 2017, "high", 865_000_000,
        "ARIA T3 queue pattern analysis",
        "DIABE CONSTRUCCIONES Y DISENOS SA DE CV (v98187): 10 contracts, 869M total. "
        "Coordinacion Nacional de PROSPERA Programa de Inclusion Social: "
        "5 contracts, 865M (99.5%), DA=40%, SB=60%, 2010-2017. "
        "Construction/design company with near-total (99.5%) concentration at "
        "Mexico's flagship anti-poverty program (PROSPERA/OPORTUNIDADES). "
        "865M in 5 contracts at a social welfare coordinator — each contract "
        "averages 173M for construction services at an anti-poverty institution. "
        "This represents extreme single-program capture of social spending infrastructure. "
        "PROSPERA construction contracts at 40% DA + 60% SB with one dominant supplier.",
    ))
    conn.execute(sql_vendor, (
        c1, 98187, "DIABE CONSTRUCCIONES Y DISENOS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "PROSPERA 99.5%: 5 contracts 865M, 60% SB + 40% DA 2010-2017",
    ))

    # Case 2: CIRCULO LLANTERO - CFE tire/auto supply DA capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "CFE Federal Electricity Utility Direct Award Capture - Circulo Llantero",
        "institutional_capture", 2010, 2017, "high", 611_000_000,
        "ARIA T3 queue pattern analysis",
        "CIRCULO LLANTERO SA DE CV (v47654): 95 contracts, 613M total (2010-2017). "
        "COMISION FEDERAL DE ELECTRICIDAD: 72 contracts, 611M (99.7%), "
        "DA=78%, SB=18%, 2010-2017. "
        "Tire and automotive parts supplier with near-total (99.7%) concentration "
        "at Mexico's state electricity utility over 7 years. "
        "72 contracts at 78% direct award rate — systematic exclusive supply "
        "of vehicle maintenance to CFE via predominantly non-competitive awards. "
        "CFE operates an enormous vehicle/equipment fleet; exclusive tire supply "
        "via DA to a single provider represents procurement capture.",
    ))
    conn.execute(sql_vendor, (
        c2, 47654, "CIRCULO LLANTERO SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "CFE 99.7%: 72 contracts 611M, 78% DA 2010-2017",
    ))

    # Case 3: KT SERVICIO ANAYA - IMSS SB capture (services)
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "IMSS Health Security Single-Bid Service Capture - KT Servicio Anaya",
        "single_bid_capture", 2009, 2025, "high", 244_000_000,
        "ARIA T3 queue pattern analysis",
        "KT SERVICIO ANAYA SA DE CV (v40946): 30 contracts, 259M total (2009-2025). "
        "IMSS (Instituto Mexicano del Seguro Social): 30 contracts, 244M (94.2%), "
        "DA=13%, SB=87%, 2009-2025. "
        "Services company with 94.2% concentration at IMSS via 87% single-bid rate "
        "over 16 years. 30 consecutive contracts at IMSS where 87% were the only "
        "bidder in otherwise competitive procedures. "
        "Long-term single-bid dominance at Mexico's largest public insurer "
        "suggests systematic pre-arranged competition across multiple contract cycles.",
    ))
    conn.execute(sql_vendor, (
        c3, 40946, "KT SERVICIO ANAYA S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "IMSS 94.2%: 30 contracts 244M, 87% SB 2009-2025",
    ))

    # Case 4: KJFM - FONACOT + INM IT direct award capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "FONACOT Workers Fund and Immigration Institute IT DA Capture - KJFM",
        "institutional_capture", 2013, 2018, "high", 549_000_000,
        "ARIA T3 queue pattern analysis",
        "KJFM DISENOS Y SOLUCIONES SA DE CV (v103946): 9 contracts, 591M total. "
        "67% direct award rate. FONACOT (Instituto del Fondo Nacional para el "
        "Consumo de los Trabajadores): 3 contracts, 462M DA/SB (78.1%), 2013-2016. "
        "INM (Instituto Nacional de Migracion): 3 contracts, 87M (14.7%), "
        "DA=67%, 2013-2015. SEPOMEX: 2 contracts, 33M SB (5.6%), 2016-2018. "
        "Combined FONACOT + INM = 549M (92.8%). "
        "IT solutions company capturing two sensitive federal institutions — "
        "the worker consumption fund (14M registered workers) and the immigration "
        "institute — via 67% DA rate. Large 462M FONACOT IT contracts and "
        "87M INM contracts in 2013-2016 suggest coordinated IT procurement capture.",
    ))
    conn.execute(sql_vendor, (
        c4, 103946, "KJFM DISENOS Y SOLUCIONES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "FONACOT 78.1% + INM 14.7% = 92.8%, 67% DA, 9 contracts 2013-2018",
    ))

    # Case 5: GRUPO RAUDALES - Gulf coast port authority SB/DA capture
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "Gulf Coast Port Authority Long-Term SB Capture - Grupo Raudales",
        "single_bid_capture", 2002, 2025, "high", 753_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO RAUDALES SA DE CV (v53): 25 contracts, 814M total (2002-2025). "
        "88% single-bid rate. Coatzacoalcos port (new ASIPNA): 3 contracts, "
        "516M (63%), DA=33%, SB=67%, 2019-2025. "
        "ASIPONA Coatzacoalcos (old entity): 12 contracts, 137M (17%), SB=100%, 2002-2015. "
        "ASIPNA Salina Cruz: 1 contract, 102M (13%), SB=100%, 2024. "
        "ASIPONA Veracruz: 1 contract, 33M (4%), SB=100%, 2007. "
        "ASIPONA Dos Bocas: 1 contract, 16M (2%), SB=100%, 2007. "
        "Combined Gulf coast ports = 804M (99%). "
        "Construction company with near-total concentration across ALL Gulf of Mexico "
        "port authorities (Coatzacoalcos, Salina Cruz, Veracruz, Dos Bocas) spanning "
        "23 years via predominantly single-bid tenders. Classic regional SB capture "
        "of strategic maritime infrastructure across both old and new port entities.",
    ))
    conn.execute(sql_vendor, (
        c5, 53, "GRUPO RAUDALES, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "Gulf ports 99%: Coatzacoalcos 80%+Salina Cruz 13%+Veracruz 4%+Dos Bocas 2%, 88% SB",
    ))

    # Case 6: GRUPO MESIS - CONAGUA + SAGARPA + Sonora agricultural SB capture
    conn.execute(sql_case, (
        c6, f"CASE-{c6}",
        "CONAGUA and SAGARPA Water-Agriculture SB Capture - Grupo Mesis",
        "single_bid_capture", 2002, 2025, "high", 285_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO MESIS SA DE CV (v3171): 50 contracts, 352M total (2002-2025). "
        "86% single-bid rate. CONAGUA: 31 contracts, 134M (38%), SB=84%, 2002-2025. "
        "SAGARPA/SADER: 1 contract, 106M SB (30%), 2024. "
        "SON-Secretaria de Infraestructura y Desarrollo Urbano: 4 contracts, 45M (13%), SB=100%, 2015-2017. "
        "SON-SAGARHPA: 6 contracts, 21M (6%), SB=100%, 2011-2014. "
        "Combined CONAGUA + SAGARPA + Sonora water/agri entities = 306M (87%). "
        "Agricultural/water infrastructure company with systematic SB dominance at "
        "federal water commission (CONAGUA), federal agriculture secretariat, and "
        "Sonora state water/agriculture agencies spanning 23 years. "
        "Multi-generation SB capture spanning both federal and Sonora state institutions.",
    ))
    conn.execute(sql_vendor, (
        c6, 3171, "GRUPO MESIS, SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "CONAGUA 38%+SAGARPA 30%+Sonora Infra 13%+SON-SAGARHPA 6%=87%, 86% SB",
    ))

    # Link contracts
    links = [
        (c1, 98187, 2010, 2017),
        (c2, 47654, 2010, 2017),
        (c3, 40946, 2009, 2025),
        (c4, 103946, 2013, 2018),
        (c5, 53, 2002, 2025),
        (c6, 3171, 2002, 2025),
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

    for vid in [98187, 47654, 40946, 103946, 53, 3171]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (24299, "Diseno e Ingenieria en Construccion - 10 ctrs dispersed multi-state, top=33% (PEMEX-EP 33%+SOP-VER 19%+Tabasco 13%), no dominant institution"),
        (19922, "Traumaservice Internacional - IMSS 98% but 340 contracts specialized medical trauma equipment, 4% SB, plausible long-term legitimate supplier"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 6 cases ({c1}-{c6}), linked {total_linked} contracts, skipped 2.")


if __name__ == "__main__":
    main()
