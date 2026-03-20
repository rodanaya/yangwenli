#!/usr/bin/env python3
"""
GT Mining Batch KK — ARIA T3 investigation (3 vendors)

Investigated 2026-03-20:
  v267312  RECURSOS OMEGA S DE RL DE CV                    → ADD  (P3 intermediary, 4.7B at IMP, 57% SB, shell form)
  v27610   CIA INTL DE CATALIZADORES DE IMPREGNACION       → SKIP (structural specialty — petroleum catalysts for PEMEX Refinacion)
  v105914  SACYR CONSTRUCCION MEXICO SA DE CV              → SKIP (legitimate Spanish infrastructure multinational, NAIM project)

Cases added: 1  |  Vendors skipped: 2
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 828:
        print(f"ERROR: max_id={max_id}, expected >= 828. Aborting.")
        conn.close()
        return

    c1 = max_id + 1  # v267312 — IMP single-bid petroleum intermediary

    print(f"Max GT case id: {max_id}")
    print(f"Inserting case {c1}")

    # ── Case 1: v267312 — IMP Single-Bid Petroleum Intermediary ─────────
    # RECURSOS OMEGA S DE RL DE CV (RFC: ROM050526SD0)
    # 7 contracts 2021-2023, ALL at Instituto Mexicano del Petroleo (IMP).
    # 4.73B MXN total, dominated by two massive single-bid licitaciones in
    # 2022: 3.64B and 1.05B MXN. 75% SB rate in 2022 (3 of 4 contracts).
    # Overall 57% SB, 14% DA. "S de RL de CV" corporate form is typical of
    # energy intermediaries. Company founded 2005 (RFC) but first appeared
    # in COMPRANET only in 2021, winning 4.7B in 3 years at a single
    # petroleum research institution. Classic intermediary capture at IMP:
    # small company, single institution, massive outsized contracts via
    # single-bid licitaciones. P3 intermediary flag in ARIA.
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c1,
            f"CASE-{c1}",
            "IMP Single-Bid Petroleum Intermediary — Recursos Omega",
            "intermediary",
            2021,
            2023,
            "medium",
            4_734_000_000,
            "ARIA T3 queue pattern analysis",
            "RECURSOS OMEGA S DE RL DE CV (RFC ROM050526SD0) won 4.73B MXN across "
            "7 contracts exclusively at Instituto Mexicano del Petroleo (IMP) between "
            "2021-2023. Two single-bid licitaciones in 2022 account for 4.69B (99%): "
            "3.64B and 1.05B MXN. 75% single-bid rate in peak year. 'S de RL de CV' "
            "form typical of energy intermediaries. Founded 2005 but first COMPRANET "
            "appearance in 2021, suggesting it was dormant or operated outside public "
            "procurement before capturing IMP contracts. P3 intermediary flag. "
            "Consistent with single-institution petroleum procurement capture.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c1, 267312, "RECURSOS OMEGA S DE RL DE CV", "medium", "aria_queue_t3"),
    )

    # ── Link contracts to GT ──────────────────────────────────────────────
    cases_vendors = [
        (c1, 267312, 2021, 2023),
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
    # Confirmed vendor
    conn.execute(
        "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
        (267312,),
    )

    # Skipped vendors
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: structural specialty market — petroleum refining catalysts exclusively for PEMEX Refinacion (2006-2010). 100% SB reflects limited supplier base for catalyst impregnation technology (global niche: Albemarle, BASF, Criterion). 13 contracts, 0% DA. Single-bid at PEMEX for specialized chemicals is expected, not capture.'
        WHERE vendor_id=?""",
        (27610,),
    )
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: legitimate Spanish infrastructure multinational (BME: SCYR). Only 3 contracts in Mexico: 1.4B at GACM for NAIM airport mega-project (2017 single-bid licitacion — international tender) plus 2 small DA at SCT totaling 65M. Insufficient volume to establish capture pattern. Global company with transparent operations.'
        WHERE vendor_id=?""",
        (105914,),
    )

    conn.commit()
    conn.close()

    print(f"\nDone. Inserted 1 case ({c1}), linked {total_linked} contracts.")
    print("Skipped: v27610 CATALIZADORES (structural specialty), v105914 SACYR (legitimate multinational)")


if __name__ == "__main__":
    main()
