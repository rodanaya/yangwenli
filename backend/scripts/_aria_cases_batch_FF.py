#!/usr/bin/env python3
"""
GT Mining Batch FF — ARIA T3 investigation (3 vendors)

Investigated 2026-03-20:
  v283936  GA ENERGY SERVICES SA PI DE CV              → SKIP (structural energy specialization, CENAGAS gas pipeline)
  v31542   FJ REPRESENTACIONES SA DE CV                → ADD  (P6 institutional capture, 100% IMSS, 19yr exclusive, 817M spike)
  v209619  JUNTOS A NUTRIR SA DE CV                    → ADD  (P6 DA abuse, 100% Diconsa, 100% DA, Segalmex-era food supply)

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
    if max_id is None or max_id < 813:
        print(f"ERROR: max_id={max_id}, expected >= 813. Aborting.")
        conn.close()
        return

    c1 = max_id + 1  # v31542 — IMSS institutional capture
    c2 = max_id + 2  # v209619 — Diconsa DA abuse

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c2}")

    # ── Case 1: v31542 — IMSS Institutional Capture (FJ Representaciones) ──
    # 260 contracts exclusively at IMSS over 19 years (2007-2025).
    # 100% institutional concentration — zero contracts at any other institution.
    # 2021 value spike: 873.8M MXN (34 contracts), including a single 817.8M
    # maintenance contract. Total lifetime value 1,027M MXN.
    # DA rate shifts by era: 87-93% DA in 2013-2016, drops to 20-35% in 2021-2025
    # (possibly shifted to single-bid competitive to appear legitimate).
    # SB rate rises to 35-45% in 2023-2025. Classic IMSS capture: exclusive
    # vendor for maintenance/electrical/ferreteria supplies, no diversification.
    # Windowed to 2016-2025 (most active capture period, 210 contracts, 997M).
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c1,
            f"CASE-{c1}",
            "IMSS Maintenance Capture — FJ Representaciones",
            "institutional_capture",
            2016,
            2025,
            "medium",
            997_000_000,
            "ARIA T3 queue pattern analysis",
            "FJ REPRESENTACIONES SA DE CV: 260 contracts exclusively at IMSS over "
            "19 years (2007-2025), 100% institutional concentration. Maintenance, "
            "electrical, and ferreteria supplies. 2021 spike of 873.8M includes one "
            "817.8M maintenance contract. No RFC on file. DA rate 49% overall but "
            "shifts from high-DA (87-93%) in 2013-2016 to competitive single-bid "
            "(35-45% SB) in 2023-2025. P6 capture pattern. No contracts at any "
            "other institution in 19 years.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c1, 31542, "FJ REPRESENTACIONES SA DE CV", "medium", "aria_queue_t3"),
    )

    # ── Case 2: v209619 — Diconsa DA Abuse (Juntos a Nutrir) ────────────────
    # 38 contracts at Diconsa (Segalmex subsidiary), 100% direct award,
    # 100% institutional concentration. Total value 659M MXN over 2017-2019.
    # "Programa de Abasto Rural" (rural food supply). Largest contract: 482M
    # in 2018 via direct award. Diconsa is the government's rural food
    # distribution parastatal — part of the Segalmex ecosystem where
    # documented corruption has been found. 100% DA at a parastatal for food
    # supply contracts is consistent with the known Segalmex-era patterns.
    # Company appears only during 2017-2019, no activity before or after.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c2,
            f"CASE-{c2}",
            "Diconsa Rural Food Supply DA Abuse — Juntos a Nutrir",
            "direct_award_abuse",
            2017,
            2019,
            "high",
            659_000_000,
            "ARIA T3 queue pattern analysis",
            "JUNTOS A NUTRIR SA DE CV: 38 contracts at Diconsa (Segalmex subsidiary), "
            "100% direct award, 100% institutional concentration. 659M MXN over "
            "2017-2019. Programa de Abasto Rural. Largest single DA contract: 482M "
            "in 2018. Part of Segalmex ecosystem where widespread corruption is "
            "documented. Company existed only during 2017-2019 window. No RFC on "
            "file. P6 capture pattern. Consistent with known Segalmex-era DA abuse.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c2, 209619, "JUNTOS A NUTRIR, S.A. DE C.V.", "high", "aria_queue_t3"),
    )

    # ── Link contracts to GT ──────────────────────────────────────────────
    cases_vendors = [
        (c1, 31542, 2016, 2025),
        (c2, 209619, 2017, 2019),
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
    for vid in [31542, 209619]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # Skipped vendor
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: structural energy specialization — CENAGAS gas pipeline construction/maintenance. 4 contracts over 3 years at a specialized institution. 100% single-bid reflects limited market for large-scale gas infrastructure. RFC on file (GES140527CS0). 2024 SEDENA contract is a sector mismatch but insufficient alone.'
        WHERE vendor_id=?""",
        (283936,),
    )

    conn.commit()
    conn.close()

    print(f"\nDone. Inserted {c2 - c1 + 1} cases ({c1}-{c2}), linked {total_linked} contracts.")
    print("Skipped: v283936 GA ENERGY SERVICES (structural energy, CENAGAS gas pipeline)")


if __name__ == "__main__":
    main()
