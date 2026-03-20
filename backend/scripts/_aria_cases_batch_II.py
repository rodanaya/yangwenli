#!/usr/bin/env python3
"""
GT Mining Batch II — ARIA T3 investigation (3 vendors)

Investigated 2026-03-20:
  v58850   JOSE MANUEL TRONCO VAZQUEZ                    → ADD  (natural person, IMSS surgical instrument maintenance capture, 49% SB)
  v64384   GRUPO EMPRESARIAL CALZADO INDUSTRIAL DE MEX.  → ADD  (CFE footwear capture, 599M single-bid ICA3P, 100% SB on invited procs)
  v54599   JOMTEL TELECOMUNICACIONES SA DE CV             → SKIP (already in GT as case 754)

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

    c1 = max_id + 1  # v58850 — IMSS surgical instrument maintenance capture
    c2 = max_id + 2  # v64384 — CFE footwear single-bid capture

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c2}")

    # ── Case 1: v58850 — IMSS Surgical Instrument Maintenance Capture ────
    # JOSE MANUEL TRONCO VAZQUEZ (natural person / persona fisica)
    # 65 contracts 2010-2024, 426M MXN. 97% concentration at IMSS (63/65 contracts).
    # Provides "mantenimiento a instrumental quirurgico" (surgical instrument maintenance).
    # 49% single-bid rate across competitive procedures. Key outlier contracts:
    #   - 2016: 276M single-bid Licitacion Publica at IMSS
    #   - 2018: 130M direct award at IMSS
    # These two contracts = 95% of total value. A natural person winning 406M in
    # government contracts via single-bid and DA at a single institution is consistent
    # with institutional capture. 16 years active, avg risk score 0.42.
    # P6 capture flag. No RFC on file.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c1,
            f"CASE-{c1}",
            "IMSS Surgical Instrument Maintenance — Persona Fisica Capture",
            "single_bid_capture",
            2015,
            2018,
            "medium",
            406_000_000,
            "ARIA T3 queue pattern analysis",
            "JOSE MANUEL TRONCO VAZQUEZ, a natural person (persona fisica), won 426M MXN "
            "across 65 contracts at IMSS (97% concentration) for surgical instrument "
            "maintenance. 49% single-bid rate. Two outsized contracts drive 95% of value: "
            "276M single-bid in 2016 and 130M DA in 2018. A natural person winning "
            "this volume at a single institution via single-bid and DA is consistent "
            "with institutional capture. P6 flag. No RFC on file.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c1, 58850, "JOSE MANUEL TRONCO VAZQUEZ", "medium", "aria_queue_t3"),
    )

    # ── Case 2: v64384 — CFE Footwear Single-Bid Capture ────────────────
    # GRUPO EMPRESARIAL CALZADO INDUSTRIAL DE MEXICO SA DE CV
    # 36 contracts 2010-2021, 711M MXN. 97% concentration at CFE (35/36 contracts).
    # Footwear/industrial supply company. 67% DA rate overall. Key pattern:
    #   - 11 of 36 contracts via "Invitacion a Cuando Menos 3 Personas" (ICA3P)
    #   - 8 of those 11 ICA3P contracts were single-bid (invited firms didn't show)
    #   - Largest: 599M single-bid ICA3P contract in 2015 (84% of total value)
    # ICA3P is meant to have 3+ bidders; systematic single-bid on invited
    # procedures indicates cover bidding or pre-arranged outcomes. Combined with
    # 67% DA rate and near-total CFE concentration, this is a textbook single-bid
    # capture pattern. One tiny 100K contract at LICONSA in 2021 (diversification
    # attempt). P6 capture flag. No RFC on file.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c2,
            f"CASE-{c2}",
            "CFE Footwear Single-Bid Capture — Grupo Calzado Industrial",
            "single_bid_capture",
            2010,
            2017,
            "medium",
            711_000_000,
            "ARIA T3 queue pattern analysis",
            "GRUPO EMPRESARIAL CALZADO INDUSTRIAL DE MEXICO won 711M MXN across 36 "
            "contracts at CFE (97% concentration). 67% DA rate. 11 contracts via ICA3P "
            "(Invitacion a Cuando Menos 3 Personas) — 8 of 11 were single-bid, meaning "
            "invited firms systematically failed to appear. Largest: 599M single-bid "
            "ICA3P in 2015 (84% of total value). Systematic single-bid on invited "
            "procedures indicates pre-arranged outcomes or cover bidding at CFE. "
            "P6 capture flag. No RFC on file.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c2, 64384, "GRUPO EMPRESARIAL CALZADO INDUSTRIAL DE MEXICO SA DE CV", "medium", "aria_queue_t3"),
    )

    # ── Link contracts to GT ────────────────────────────────────────────
    cases_vendors = [
        (c1, 58850, 2015, 2018),
        (c2, 64384, 2010, 2017),
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

    # ── ARIA queue updates ──────────────────────────────────────────────
    # Confirmed vendors
    for vid in [58850, 64384]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # Skipped vendor (already in GT)
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: already in ground truth as case 754 (JOMTEL SEDENA/Marina Telecom Capture, medium confidence).'
        WHERE vendor_id=?""",
        (54599,),
    )

    conn.commit()
    conn.close()

    print(f"\nDone. Inserted {c2 - c1 + 1} cases ({c1}-{c2}), linked {total_linked} contracts.")
    print("Skipped: v54599 JOMTEL (already in GT as case 754)")


if __name__ == "__main__":
    main()
