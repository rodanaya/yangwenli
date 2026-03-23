#!/usr/bin/env python3
"""
GT Mining Batch PPP1 - ARIA T3 investigation (8 vendors)

Investigated 2026-03-23:
  v99184   NO. 1 SONORA APPAREL SA DE CV     ADD  (Sonora Education 79% SB, 100% Sonora, 270M)
  v34219   DISTRIB EQUIPOS PERFORACION       ADD  (CONAGUA 96.5%, 5 contracts 642M SB/DA)
  v94920   IECISA MEXICO                     ADD  (SRE 345M DA 2020, 89% at SRE/SCT/SEMAR)
  v57594   LATINOAMERICANA DE CONCRETOS      ADD  (ASIPONA Altamira 99.6% SB, 245M)
  v41330   AGROREYVI SA DE CV                ADD  (CINVESTAV 65%+CFE 32%=97%, 82.3% DA)
  v18822   SERVICIO AUTOMOTRIZ RODRIGUEZ     SKIP (dispersed auto dealer, 165 ctrs top=8%)
  v4202    PRODUCTORA METALICA SA DE CV      SKIP (SACMEX 315M but 0% DA/SB, competitive)
  v684     PAPELERA ANZURES SA DE CV         SKIP (537 ctrs dispersed paper supplier)

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
    if max_id is None or max_id < 942:
        print(f"ERROR: max_id={max_id}, expected >= 942. Aborting.")
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

    # Case 1: SONORA APPAREL - Sonora Education uniform/clothing SB capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Sonora State Education Clothing Single-Bid Capture - No. 1 Sonora Apparel",
        "single_bid_capture", 2010, 2015, "high", 270_000_000,
        "ARIA T3 queue pattern analysis",
        "NO. 1 SONORA APPAREL SA DE CV (v99184): 7 contracts, 270M total (2010-2015). "
        "71.4% single-bid rate. All Sonora state: "
        "SON-Secretaria de Educacion y Cultura: 4 contracts, 214M SB (79.3%). "
        "Gobierno del Estado de Sonora: 3 contracts, 56M (20.7%). "
        "100% concentrated at Sonora state, 270M total. "
        "Clothing/apparel company winning Sonora state education ministry contracts "
        "(likely school uniforms) via uncontested single-bid tenders. "
        "4 consecutive large SB awards at Sonora education agency (2012-2015) "
        "totaling 214M suggests systematic pre-arranged competition.",
    ))
    conn.execute(sql_vendor, (
        c1, 99184, "NO. 1 SONORA APPAREL, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "Sonora Ed 79.3% SB + Gobierno Sonora 20.7% = 100% Sonora, 71.4% SB",
    ))

    # Case 2: DISTRIB EQUIPOS PERFORACIÓN - CONAGUA drilling equipment SB capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "CONAGUA Drilling Equipment Single-Bid Capture - Distribuidora Equipos Perforacion",
        "institutional_capture", 2009, 2025, "high", 642_000_000,
        "ARIA T3 queue pattern analysis",
        "DISTRIBUIDORA DE EQUIPOS DE PERFORACION SA DE CV (v34219): 20 contracts, 665M. "
        "CONAGUA: 5 contracts, 642M (96.5%), DA=20%, SB=80%. "
        "Very small additional contracts at municipal water commissions (7M + 4M). "
        "Drilling equipment distributor with 96.5% concentration at Mexico's "
        "national water commission over 16 years (2009-2025). "
        "5 contracts averaging 128M each at CONAGUA via predominantly SB tenders — "
        "suggests exclusive supply relationship for water well/drilling equipment. "
        "Extreme financial concentration (96.5%) at one federal entity.",
    ))
    conn.execute(sql_vendor, (
        c2, 34219, "DISTRIBUIDORA DE EQUIPOS DE PERFORACION SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "CONAGUA 96.5%: 5 contracts 642M, 80% SB 2009-2025",
    ))

    # Case 3: IECISA MEXICO - SRE/SCT/SEMAR IT direct award capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Foreign Ministry and Security Sector IT Direct Award Capture - IECISA Mexico",
        "institutional_capture", 2011, 2020, "high", 476_000_000,
        "ARIA T3 queue pattern analysis",
        "IECISA MEXICO SA DE CV (v94920): 20 contracts, 535M total (2011-2020). "
        "80% direct award rate. SRE: 345M DA (2020) = 64.5%. "
        "SCT: 66M mixed (12.3%). SEMAR: 65M DA (2011) = 12.1%. "
        "Combined SRE + SCT + SEMAR = 476M (89%). "
        "IECISA Mexico is a subsidiary of IECISA (Spanish IT company/Ibermática group) "
        "with exclusive DA access to Mexico's Foreign Ministry, transport, and "
        "navy sectors. Single 345M DA at SRE in 2020 is anomalous for IT services. "
        "High DA rate at security-sensitive institutions over 9 years.",
    ))
    conn.execute(sql_vendor, (
        c3, 94920, "IECISA MEXICO SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "SRE 64.5% DA + SCT 12.3% + SEMAR 12.1% = 89%, 80% DA",
    ))

    # Case 4: LATINOAMERICANA DE CONCRETOS - ASIPONA Altamira port SB capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Altamira Port Concrete Single-Bid Capture - Latinoamericana de Concretos",
        "single_bid_capture", 2012, 2015, "high", 245_000_000,
        "ARIA T3 queue pattern analysis",
        "LATINOAMERICANA DE CONCRETOS SA DE CV (v57594): 4 contracts, 246M total. "
        "Administracion Portuaria Integral de Altamira SA: 2 contracts, 245M SB (99.6%). "
        "Two large SB concrete supply contracts at Altamira port (Tamaulipas) "
        "in 2012-2015. Near-total concentration (99.6%) at single port authority "
        "via uncontested competitive tenders. "
        "Infrastructure/concrete supplier capturing port authority construction "
        "procurement through systematic single-bid wins.",
    ))
    conn.execute(sql_vendor, (
        c4, 57594, "LATINOAMERICANA DE CONCRETOS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "ASIPONA Altamira 99.6%: 2 SB contracts 245M 2012-2015",
    ))

    # Case 5: AGROREYVI - CINVESTAV + CFE laboratory supply DA capture
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "CINVESTAV Research Center Direct Award Supply Capture - Agroreyvi",
        "institutional_capture", 2010, 2024, "medium", 196_000_000,
        "ARIA T3 queue pattern analysis",
        "AGROREYVI SA DE CV (v41330): 249 contracts, 202M total (2010-2024). "
        "82.3% DA rate. CINVESTAV (Centro de Investigacion y Estudios Avanzados): "
        "146 contracts, 132M DA (65.3%), 98.6% DA rate. "
        "CFE (Comision Federal de Electricidad): 84 contracts, 64M (31.7%), 56% DA. "
        "Combined = 196M (97%). "
        "Agricultural/laboratory supply company with 98.6% DA at CINVESTAV "
        "(Mexico's premier science research center) over 11 years (2013-2024). "
        "Systematic direct-award dominance at both the national research center "
        "and electricity utility suggests exclusive supply relationships "
        "with industry mismatch (agro company at research/energy institutions).",
    ))
    conn.execute(sql_vendor, (
        c5, 41330, "AGROREYVI, S.A. DE C.V.",
        "primary", "medium", "aria_queue_t3", 0.80,
        "CINVESTAV 65.3% (98.6% DA) + CFE 31.7% = 97%, 82.3% overall DA",
    ))

    # Link contracts
    links = [
        (c1, 99184, 2010, 2015),
        (c2, 34219, 2009, 2025),
        (c3, 94920, 2011, 2020),
        (c4, 57594, 2012, 2015),
        (c5, 41330, 2010, 2024),
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

    for vid in [99184, 34219, 94920, 57594, 41330]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (18822, "Dispersed automotive dealer (Automotriz Rodriguez) - 165 contracts top=8%, multi-sector vehicle supply"),
        (4202, "Productora Metalica - SACMEX 315M but 0% DA/SB, all open competitive bidding, legitimate supplier"),
        (684, "Papelera Anzures - 537 contracts dispersed paper/office supplier across many institutions"),
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
