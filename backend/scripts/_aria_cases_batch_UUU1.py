#!/usr/bin/env python3
"""
GT Mining Batch UUU1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v51311   BABASAC SA DE CV                    ADD  (SAGARPA 46%+Sonora 17%+CONAGUA 11%=74%, 89.7% SB, 512M)
  v16530   CONSTRUCTORA AUTLENSE SA DE CV      ADD  (JAL Gobierno 71.2%+JAL-DesUrb 20.4%=91.6%, 100% SB, 384M)
  v31907   CONSTRUCCIONES JOSE SA DE CV        ADD  (CONAPESCA 33.7%+CONAGUA 21.1%+SIN water 17.2%=72%, 89.7% SB)
  v48829   GRUPO CONSTRUCTOR LANROL            ADD  (Durango 52.7%+SEDATU 14.7%+Gov Dur 11.6%=79%, 90% SB, 376M)
  v57392   CONSORCIO EMPRESARIAL SEGURIDAD     SKIP (186 ctrs dispersed, top=22%, structural security supply)
  v40679   TOPACD SOLUTIONS SA DE CV           SKIP (LICONSA 22%+PEMEX 20%, dispersed multi-sector IT)

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
    if max_id is None or max_id < 965:
        print(f"ERROR: max_id={max_id}, expected >= 965. Aborting.")
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

    # Case 1: BABASAC - SAGARPA + Sonora + CONAGUA agricultural SB capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "SAGARPA and Sonora Agriculture Multi-Agency SB Capture - Babasac",
        "single_bid_capture", 2008, 2018, "high", 383_000_000,
        "ARIA T3 queue pattern analysis",
        "BABASAC SA DE CV (v51311): ~20 contracts, 512M total (2008-2018). "
        "89.7% single-bid rate. SAGARPA (Secretaria de Agricultura): "
        "5 contracts, 236M SB (46.1%), 2008-2014. "
        "SON-Secretaria de Infraestructura: 3 contracts, 87M SB (17%). "
        "CONAGUA: 2 contracts, 58M SB (11.3%). "
        "Combined SAGARPA + Sonora Infra + CONAGUA = 381M (74.4%). "
        "Construction/agricultural services company capturing federal agriculture "
        "ministry and Sonora state infrastructure contracts via uncontested SB tenders. "
        "Multi-agency SB dominance spanning SAGARPA, CONAGUA, and state government "
        "suggests systematic bid arrangement across 10+ years.",
    ))
    conn.execute(sql_vendor, (
        c1, 51311, "BABASAC SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "SAGARPA 46.1% + Sonora Infra 17% + CONAGUA 11.3% = 74.4%, 89.7% SB",
    ))

    # Case 2: CONSTRUCTORA AUTLENSE - Jalisco state SB capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Jalisco State Infrastructure Single-Bid Capture - Constructora Autlense",
        "single_bid_capture", 2008, 2017, "high", 384_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA AUTLENSE SA DE CV (v16530): ~15 contracts, 384M total (2008-2017). "
        "100% single-bid rate. JAL-Gobierno del Estado de Jalisco: "
        "5 contracts, 274M SB (71.4%), 2009-2017. "
        "JAL-Secretaria de Desarrollo Urbano: 3 contracts, 78M SB (20.3%). "
        "Combined JAL entities = 352M (91.7%). "
        "Construction company with near-total concentration at Jalisco state "
        "across two different state agencies (main government + urban development). "
        "100% single-bid across 15 consecutive contracts over 9 years — "
        "systematic pre-arranged competition at Jalisco state level.",
    ))
    conn.execute(sql_vendor, (
        c2, 16530, "CONSTRUCTORA AUTLENSE, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "JAL-Gobierno 71.4% + JAL-DesUrb 20.3% = 91.7%, 100% SB 15 contracts",
    ))

    # Case 3: CONSTRUCCIONES JOSE - CONAPESCA + CONAGUA + Sinaloa water SB capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Fisheries and Water Infrastructure SB Capture - Construcciones Jose",
        "single_bid_capture", 2007, 2016, "high", 272_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCCIONES JOSE SA DE CV (v31907): ~18 contracts, 302M total (2007-2016). "
        "89.7% single-bid rate. CONAPESCA (Comision Nacional de Acuacultura y Pesca): "
        "4 contracts, 102M SB (33.8%), 2007-2013. "
        "CONAGUA: 3 contracts, 64M SB (21.2%), 2007-2014. "
        "SIN-JCAS (Junta Central de Agua y Saneamiento de Sinaloa): "
        "2 contracts, 52M SB (17.2%), 2013-2016. "
        "Combined = 218M (72.2%). "
        "Construction company in Sinaloa capturing federal fisheries commission, "
        "national water commission, and state water utility contracts via SB tenders. "
        "Three different water/fisheries agencies in same coastal region suggests "
        "systematic single-vendor capture across related federal/state entities.",
    ))
    conn.execute(sql_vendor, (
        c3, 31907, "CONSTRUCCIONES JOSE, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "CONAPESCA 33.8% + CONAGUA 21.2% + SIN-JCAS 17.2% = 72.2%, 89.7% SB",
    ))

    # Case 4: GRUPO CONSTRUCTOR LANROL - Durango state + SEDATU SB capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Durango State and SEDATU Housing SB Capture - Grupo Constructor Lanrol",
        "single_bid_capture", 2011, 2019, "high", 296_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO CONSTRUCTOR LANROL SA DE CV (v48829): ~20 contracts, 376M total. "
        "90% single-bid rate. DGO-Secretaria de Comunicaciones y OO.PP.: "
        "4 contracts, 198M SB (52.7%), 2011-2017. "
        "SEDATU: 3 contracts, 55M SB (14.6%), 2013-2019. "
        "DGO-Gobierno del Estado de Durango: 2 contracts, 44M SB (11.7%). "
        "Combined Durango entities + SEDATU = 297M (79%). "
        "Construction company capturing Durango state transport/public works ministry "
        "and federal housing/urban development ministry via SB tenders. "
        "Multi-year presence across Durango state and SEDATU suggests established "
        "networks in both state-level and federal housing procurement.",
    ))
    conn.execute(sql_vendor, (
        c4, 48829, "GRUPO CONSTRUCTOR LANROL, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "DGO-SCOPD 52.7% + SEDATU 14.6% + Gov Durango 11.7% = 79%, 90% SB",
    ))

    # Link contracts
    links = [
        (c1, 51311, 2008, 2018),
        (c2, 16530, 2008, 2017),
        (c3, 31907, 2007, 2016),
        (c4, 48829, 2011, 2019),
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

    for vid in [51311, 16530, 31907, 48829]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (57392, "Consorcio Empresarial Seguridad - 186 contracts dispersed security supply, top=22%, multi-institution structural"),
        (40679, "Topacd Solutions - LICONSA 22%+PEMEX 20%, dispersed multi-sector IT supply, no dominant institution"),
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
