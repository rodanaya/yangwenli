#!/usr/bin/env python3
"""
GT Mining Batch WW - ARIA T3 investigation (4 vendors)

Investigated 2026-03-20:
  v226303  SOLUCIONES SALUDABLES MTY              ADD  (P6 IMSS capture, 860M)
  v148876  COMERCIALIZADORA LINI                  ADD  (P6 IMSS ring, 830M)
  v103293  AIDYCSA                                ADD  (P3 intermediary, 394.8M)
  v208520  CONSORCIO EMPRESARIAL INTERTAMPS       ADD  (P3/P2 intermediary, 226M)

Cases added: 4  |  Vendors skipped: 0
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 857:
        print(f"ERROR: max_id={max_id}, expected >= 857. Aborting.")
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

    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "IMSS Medicine DA Capture - Soluciones Saludables MTY",
        "capture", 2021, 2024, "medium", 850_000_000,
        "ARIA T3 queue pattern analysis",
        "SOLUCIONES SALUDABLES MTY S DE RL DE CV: 280 contracts exclusively "
        "at IMSS, 99.6% DA rate, 860.6M MXN total (2018-2024). Explosive "
        "growth from 0.2M (2018) to 337M (2022) to 359M (2024). All contracts "
        "for medicine/health supplies via direct award. 100% institution "
        "concentration at IMSS. P6 capture flag in ARIA.",
    ))
    conn.execute(sql_vendor, (
        c1, 226303, "SOLUCIONES SALUDABLES MTY S DE RL DE CV",
        "primary", "medium", "aria_queue_t3", 0.9,
        "IMSS-exclusive vendor, 99.6% DA, P6 capture pattern",
    ))

    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "IMSS Ring Pattern - Comercializadora LINI",
        "capture", 2017, 2024, "high", 830_000_000,
        "ARIA T3 queue pattern analysis",
        "COMERCIALIZADORA LINI SA DE CV: 4561 contracts, 4509 at IMSS (98.9%) "
        "with 92.5% DA rate, 830M MXN at IMSS. Simultaneously wins competitive "
        "licitaciones at SEDENA (45 contracts, 147M, 75.6% LP/competitive). "
        "Classic IMSS ring pattern. P6 capture flag in ARIA.",
    ))
    conn.execute(sql_vendor, (
        c2, 148876, "COMERCIALIZADORA LINI SA DE CV",
        "primary", "high", "aria_queue_t3", 0.9,
        "IMSS ring: 92.5% DA at IMSS, competitive at SEDENA",
    ))

    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "PGR Direct Award Intermediary - AIDYCSA",
        "intermediary", 2015, 2016, "medium", 394_800_000,
        "ARIA T3 queue pattern analysis",
        "AIDYCSA SA DE CV: 12 contracts total (2013-2016). One massive 394.8M "
        "MXN direct award at PGR in 2016 = 99.9% of total value. Remaining "
        "11 contracts at IMSS/SAT total only 0.2M. Small supplier that received "
        "outsized DA at law enforcement institution. P3 intermediary flag.",
    ))
    conn.execute(sql_vendor, (
        c3, 103293, "AIDYCSA SA DE CV",
        "primary", "medium", "aria_queue_t3", 0.9,
        "75K vendor that received 395M PGR direct award. P3 intermediary.",
    ))

    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Parastatal School Supply Intermediary - Consorcio Intertamps",
        "intermediary", 2017, 2018, "medium", 225_900_000,
        "ARIA T3 queue pattern analysis",
        "CONSORCIO EMPRESARIAL INTERTAMPS S DE RL DE CV: 4 contracts, ALL DA, "
        "225.9M MXN total (2017-2018). School materials (crayons, pencils) via "
        "100% DA to Impresora y Encuadernadora Progreso (176M) and Diconsa (50M). "
        "Two-year window then disappeared. P2 ghost 0.65, P3 intermediary.",
    ))
    conn.execute(sql_vendor, (
        c4, 208520, "CONSORCIO EMPRESARIAL INTERTAMPS S DE RL DE CV",
        "primary", "medium", "aria_queue_t3", 0.9,
        "226M DA to parastatals. Brief 2017-2018 window.",
    ))

    # Link contracts to GT
    links = [
        (c1, 226303, 2021, 2024),
        (c2, 148876, 2017, 2024),
        (c3, 103293, 2015, 2016),
        (c4, 208520, 2017, 2018),
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

    # ARIA queue updates
    SQ = chr(39)
    for vid in [226303, 148876, 103293, 208520]:
        conn.execute(
            f"UPDATE aria_queue SET in_ground_truth=1, review_status={SQ}confirmed{SQ} WHERE vendor_id=?",
            (vid,),
        )

    conn.commit()
    conn.close()
    print(f"Done. Inserted 4 cases ({c1}-{c4}), linked {total_linked} contracts.")


if __name__ == "__main__":
    main()
