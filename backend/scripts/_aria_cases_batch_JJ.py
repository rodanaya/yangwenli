#!/usr/bin/env python3
"""
GT Mining Batch JJ — ARIA T3 investigation (3 vendors)

Investigated 2026-03-20:
  v236078  FERROCLIN U&Q SA DE CV                        → SKIP (already in GT case 22, EFOS definitivo)
  v34293   NOVUTEK, SC                                   → ADD  (P3 intermediary, 453M SB at ISSSTE, SC entity)
  v144600  LIC. ALONDRA EUGENIA DE LA TORRE HERNANDEZ    → ADD  (P3 intermediary, 229M SB at CONAGUA, natural person)

Cases added: 2  |  Vendors skipped: 1 (already in GT)
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

    c1 = max_id + 1  # v34293  — NOVUTEK SC ISSSTE single-bid intermediary
    c2 = max_id + 2  # v144600 — Alondra De La Torre CONAGUA natural-person intermediary

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c2}")

    # ── Case 1: v34293 — ISSSTE IT Single-Bid Intermediary (NOVUTEK SC) ──
    # Sociedad Civil entity with 6 contracts spanning 2008-2011.
    # 2008: 3 tiny contracts at Comision Estatal del Agua de Sonora (1.4M total)
    #        — state water commission, completely different domain.
    # 2011: 3 massive single-bid IT contracts at ISSSTE totaling 453M:
    #        - 388M (contract 37317), 40M (37330), 25M (37364)
    # Jump from 1.4M at state water agency to 453M IT at ISSSTE = 324x scaling.
    # 100% single-bid rate. Avg risk score 0.409 (max 1.0 on largest contract).
    # SC (Sociedad Civil) = professional services legal form, unusual for large
    # ISSSTE IT procurement. Same ISSSTE 2011 cohort as SixSigma Networks (GT case 14).
    # P3 intermediary flag in ARIA. No RFC on file.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c1,
            f"CASE-{c1}",
            "ISSSTE IT Single-Bid Intermediary — NOVUTEK SC",
            "intermediary",
            2011,
            2011,
            "medium",
            453_000_000,
            "ARIA T3 queue pattern analysis",
            "NOVUTEK SC (Sociedad Civil) won 453M in 3 single-bid IT contracts at "
            "ISSSTE in 2011 — the third-largest vendor at ISSSTE that year, alongside "
            "known problematic vendors like SixSigma Networks. Company's only prior "
            "activity was 1.4M at Comision Estatal del Agua de Sonora in 2008 (water "
            "infrastructure, entirely different domain). 324x value scaling. SC legal "
            "form is unusual for major IT procurement. 100% single-bid rate across all "
            "6 contracts. Max risk score 1.0 on largest contract. P3 intermediary flag. "
            "No RFC on file.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c1, 34293, "NOVUTEK, SC", "medium", "aria_queue_t3"),
    )

    # ── Case 2: v144600 — CONAGUA Natural-Person Intermediary ────────────
    # LIC. ALONDRA EUGENIA DE LA TORRE HERNANDEZ — natural person (attorney).
    # 4 contracts exclusively at CONAGUA, 2014-2016, all single-bid (100% SB):
    #   - 2014: 2 contracts totaling 0.8M (small consulting)
    #   - 2015: 1 contract, 0.4M
    #   - 2016: 1 contract, 228.4M — water infrastructure
    # The 228M contract places this individual attorney alongside major
    # construction firms (ICA at 3.99B, Acciona at 526M, Tradeco at 233M)
    # in CONAGUA's 2014-2016 infrastructure program.
    # A natural person ("Lic." = licensed attorney) winning a 228M water
    # infrastructure contract as sole bidder is highly anomalous — natural
    # persons lack the organizational capacity for projects of this scale.
    # Sector: ambiente (10). P3 intermediary flag. No RFC on file.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c2,
            f"CASE-{c2}",
            "CONAGUA Natural-Person Intermediary — Lic. De La Torre",
            "intermediary",
            2016,
            2016,
            "medium",
            228_000_000,
            "ARIA T3 queue pattern analysis",
            "LIC. ALONDRA EUGENIA DE LA TORRE HERNANDEZ — a natural person (attorney) "
            "won 229M exclusively at CONAGUA 2014-2016, all as sole bidder (100% SB). "
            "The 228M contract in 2016 places this individual alongside ICA (3.99B), "
            "Acciona (526M), and Tradeco (233M) in CONAGUA water infrastructure. "
            "A natural person lacks organizational capacity for 228M infrastructure. "
            "Prior contracts were tiny (0.8M total in 2014, 0.4M in 2015) — a 570x "
            "value jump. Sector: ambiente. P3 intermediary flag. No RFC on file.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c2, 144600, "LIC. ALONDRA EUGENIA DE LA TORRE HERNANDEZ", "medium", "aria_queue_t3"),
    )

    # ── Link contracts to GT ──────────────────────────────────────────────
    cases_vendors = [
        (c1, 34293,  2011, 2011),
        (c2, 144600, 2016, 2016),
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
    # Confirmed vendors → in_ground_truth=1
    for vid in [34293, 144600]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # FERROCLIN already in GT (case 22, EFOS) — just update review_status
    conn.execute(
        """UPDATE aria_queue SET review_status='confirmed',
           reviewer_notes='Already in GT case 22 (SAT EFOS definitivo). RFC FUQ140426I3A confirmed ghost company. 7 contracts at CONAGUA, 302M MXN.'
        WHERE vendor_id=?""",
        (236078,),
    )

    conn.commit()
    conn.close()

    print(f"\nDone. Inserted {c2 - c1 + 1} cases ({c1}-{c2}), linked {total_linked} contracts.")
    print("Skipped: v236078 FERROCLIN (already in GT case 22, EFOS definitivo)")


if __name__ == "__main__":
    main()
