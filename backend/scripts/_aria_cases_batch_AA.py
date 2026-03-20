#!/usr/bin/env python3
"""
GT Mining Batch AA — ARIA T3 investigation (4 vendors)

Investigated 2026-03-20:
  v109813  EMPROTEX SA DE CV                         → SKIP (legitimate multi-institution defense supplier)
  v242985  SERVICIOS PARA LA AVIACION MEXICANA GA    → SKIP (structural defense specialization, aviation)
  v154709  Diagnostico de Seguridad Privada Esp.     → ADD  (P3 intermediary, single 240M SB contract at CFE)
  v224019  GRUPO RELISSA SERVICIOS CORPORATIVOS      → ADD  (P3 intermediary, shell profile, 424M at ISSSTE/SSa in 2020)

Cases added: 2  |  Vendors skipped: 2
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 798:
        print(f"ERROR: max_id={max_id}, expected >= 798. Aborting.")
        conn.close()
        return

    c1 = max_id + 1  # v154709 — CFE single-bid intermediary
    c2 = max_id + 2  # v224019 — ISSSTE/SSa shell intermediary

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c2}")

    # ── Case 1: v154709 — CFE Single-Bid Intermediary ─────────────────────
    # Diagnostico de Seguridad Privada Especializada S. de R.L.
    # 12 contracts 2015-2018, but 97.9% of value (240M) from ONE single-bid
    # contract at CFE in 2017 via "Invitacion a Cuando Menos 3 Personas".
    # Remaining 11 contracts total only 5.5M at small agencies (CIMAV, SGM,
    # SCT, Telecomm, PROFECO). Classic intermediary: small company wins one
    # massive single-bid contract far exceeding its normal scale. No RFC on file.
    # P3 intermediary flag in ARIA. 58% single-bid rate overall.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c1,
            f"CASE-{c1}",
            "CFE Single-Bid Security Diagnostics Intermediary",
            "intermediary",
            2017,
            2017,
            "medium",
            240_000_000,
            "ARIA T3 queue pattern analysis",
            "Diagnostico de Seguridad Privada Especializada won a 240M MXN single-bid "
            "contract at CFE in 2017 via Invitacion a Cuando Menos 3 Personas. "
            "Company's other 11 contracts total only 5.5M at small agencies. "
            "Classic intermediary profile: small vendor, one massive outsized contract. "
            "P3 intermediary flag. No RFC on file.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c1, 154709, "Diagnóstico de Seguridad Privada Especializada S. de R.L.", "medium", "aria_queue_t3"),
    )

    # ── Case 2: v224019 — ISSSTE/SSa Shell Intermediary ───────────────────
    # GRUPO RELISSA SERVICIOS CORPORATIVOS, S.A DE C.V.
    # 16 contracts 2018-2020. Company debuted with tiny FONATUR contracts in
    # 2018 (688K total, 100% DA), scaled to 424M in 2020 at health institutions:
    #   - ISSSTE: 332M single-bid (1 contract)
    #   - SSa:     91M direct award (1 contract)
    # 75% overall DA rate. Company disappeared after 2020 (no contracts 2021+).
    # Classic shell intermediary profile: rapid 600x value scaling in 2 years,
    # health sector concentration, vanished post-windfall. P3 intermediary flag.
    # No RFC on file.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c2,
            f"CASE-{c2}",
            "ISSSTE/SSa Shell Intermediary — Grupo Relissa",
            "intermediary",
            2020,
            2020,
            "high",
            424_000_000,
            "ARIA T3 queue pattern analysis",
            "GRUPO RELISSA debuted 2018 with tiny FONATUR maintenance contracts (688K), "
            "then won 332M single-bid at ISSSTE and 91M DA at SSa in 2020 — a 600x "
            "scaling in 2 years. Company vanished after 2020. 75% DA rate. No RFC. "
            "P3 intermediary flag. Classic shell profile: rapid scaling, health sector "
            "windfall, disappearance.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c2, 224019, "GRUPO RELISSA SERVICIOS CORPORATIVOS, S.A DE C.V.", "high", "aria_queue_t3"),
    )

    # ── Link contracts to GT ──────────────────────────────────────────────
    cases_vendors = [
        (c1, 154709, 2017, 2017),
        (c2, 224019, 2020, 2020),
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
    for vid in [154709, 224019]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # Skipped vendors
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: legitimate multi-institution defense supplier (SEMAR, SEDENA, GN, FGR). 5 distinct institutions, 36% DA, mix of competitive wins. Not capture pattern.'
        WHERE vendor_id=?""",
        (109813,),
    )
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: structural defense specialization — aviation services exclusively for SEDENA. 0% DA, single-bid reflects limited market for military aviation maintenance. Clearance-restricted sector.'
        WHERE vendor_id=?""",
        (242985,),
    )

    conn.commit()
    conn.close()

    print(f"\nDone. Inserted {c2 - c1 + 1} cases ({c1}-{c2}), linked {total_linked} contracts.")
    print("Skipped: v109813 EMPROTEX (defense supplier), v242985 AVIACION (structural specialization)")


if __name__ == "__main__":
    main()
