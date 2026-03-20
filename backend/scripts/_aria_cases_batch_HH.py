#!/usr/bin/env python3
"""
GT Mining Batch HH — ARIA T3 investigation (3 vendors)

Investigated 2026-03-20:
  v2139    INDUSTRIAS UNIDAS SA DE CV                    → SKIP (legitimate CFE electrical supplier, 0% DA, 25% SB, 19 years)
  v38686   SST DE MEXICO SA DE CV                       → ADD  (P6 capture at ASA, 59% DA, 87% concentration, 15 years)
  v282210  IMPACTO INGENIERIA & CONSTRUCCION SA DE CV    → ADD  (P3 intermediary, 1.7B at CENAGAS in 2 years, new vendor)

Cases added: 2  |  Vendors skipped: 1
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 822:
        print(f"ERROR: max_id={max_id}, expected >= 822. Aborting.")
        conn.close()
        return

    c1 = max_id + 1  # v38686 — ASA institutional capture
    c2 = max_id + 2  # v282210 — CENAGAS intermediary

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c2}")

    # ── Case 1: v38686 — ASA Institutional Capture ──────────────────────
    # SST DE MEXICO, S.A. DE C.V.
    # 76 contracts 2009-2024, 87% value concentrated at Aeropuertos y
    # Servicios Auxiliares (ASA): 1,337M MXN with 59% DA and 27% SB.
    # The vendor also wins competitively at other institutions (Diconsa
    # 100M SB, SEDENA 53M, CFE 12M) — demonstrating it can compete
    # elsewhere but relies on DA at its primary institution. 15-year
    # relationship with ASA spanning multiple administrations. Classic
    # P6 institutional capture: vendor embedded at a single institution
    # through sustained direct award relationship. Infrastructure sector.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c1,
            f"CASE-{c1}",
            "ASA Airport Infrastructure Capture — SST de Mexico",
            "institutional_capture",
            2012,
            2024,
            "medium",
            1_337_000_000,
            "ARIA T3 queue pattern analysis",
            "SST DE MEXICO has 87% of its 1.5B MXN contract value concentrated at "
            "Aeropuertos y Servicios Auxiliares (ASA) with 59% DA rate and 27% SB rate "
            "across 66 contracts over 15 years (2009-2024). The vendor wins competitively "
            "at other institutions (Diconsa 100M single-bid, SEDENA 53M, CFE 12M), "
            "demonstrating ability to compete but reliance on direct awards at ASA. "
            "P6 capture flag. Infrastructure sector. No RFC on file.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c1, 38686, "SST DE MEXICO, S.A. DE C.V.", "medium", "aria_queue_t3"),
    )

    # ── Case 2: v282210 — CENAGAS New Vendor Intermediary ────────────────
    # IMPACTO INGENIERIA & CONSTRUCCION SA DE CV
    # RFC: IIA1606148V2 (created June 2016, first contract 2022 — 6-year gap).
    # 16 contracts 2022-2025, 1,985M MXN total.
    # 86% of value (1,712M) concentrated at Centro Nacional de Control del
    # Gas Natural (CENAGAS) in just 2 years (2022-2023): 55% DA, 45% SB.
    # Then pivoted to ISSSTE construction (250M in 2025) and minor contracts
    # at FONATUR and AICM. New vendor winning massive gas infrastructure
    # contracts immediately upon entering the market — consistent with
    # intermediary or pre-arranged vendor. P3 intermediary flag. Energia sector.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c2,
            f"CASE-{c2}",
            "CENAGAS Gas Infrastructure Intermediary — Impacto Ingenieria",
            "intermediary",
            2022,
            2023,
            "medium",
            1_712_000_000,
            "ARIA T3 queue pattern analysis",
            "IMPACTO INGENIERIA & CONSTRUCCION (RFC IIA1606148V2, created 2016, first "
            "contract 2022) won 1.7B MXN at CENAGAS in just 2 years with 55% DA and "
            "45% SB across 11 contracts. New vendor achieving massive scale immediately "
            "upon market entry at a single gas infrastructure institution. 6-year gap "
            "between RFC creation and first contract is unusual. Subsequently pivoted "
            "to ISSSTE (250M, 2025) and FONATUR (22M). P3 intermediary flag. 50% overall "
            "DA rate. Energia sector.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c2, 282210, "IMPACTO INGENIERIA & CONSTRUCCION SA DE CV", "medium", "aria_queue_t3"),
    )

    # ── Link contracts to GT ──────────────────────────────────────────────
    cases_vendors = [
        (c1, 38686, 2012, 2024),
        (c2, 282210, 2022, 2023),
    ]
    total_linked = 0
    for case_id, vendor_id, yr_start, yr_end in cases_vendors:
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

    # ── ARIA queue updates ────────────────────────────────────────────────
    # Confirmed vendors
    for vid in [38686, 282210]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # Skipped vendor
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: legitimate CFE electrical industrial supplier. 208 contracts over 19 years (2002-2016) at CFE with 0%% DA and 25%% SB — normal for specialized energy sector equipment. Also served Luz y Fuerza del Centro (113M). Concentration at electrical utilities is structural, not capture.'
        WHERE vendor_id=?""",
        (2139,),
    )

    conn.commit()
    conn.close()

    print(f"\nDone. Inserted {c2 - c1 + 1} cases ({c1}-{c2}), linked {total_linked} contracts.")
    print("Skipped: v2139 INDUSTRIAS UNIDAS (legitimate CFE supplier)")


if __name__ == "__main__":
    main()
