#!/usr/bin/env python3
"""
GT Batch H — vendors: 55640, 2402, 13287, 8657, 89737, 12221
4 ADDs (cases 1419..1422), 2 SKIPs
Guard: max_id must be 1418

Run: python -m scripts._aria_cases_batch_H [--dry-run]
"""
import sqlite3, sys, argparse
from pathlib import Path

DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (2402,  "QUIMAE CFE Chemical Capture",
            "institutional_capture", 2002, 2017, "high", 1_227_000_000,
            "CFE 90.9% (1,228M of 1,350M lifetime), 53 contracts SB=50.9% DA=9.4%; chemical supplier "
            "dominant CFE single-bid capture across 15 years then disappears post-2017 (P6 Capture, "
            "energia sector, ips=0.659 T2)"),
    (13287, "DIBITER IMSS-ISSSTE Healthcare Ring",
            "institutional_capture", 2003, 2020, "high", 4_212_000_000,
            "IMSS 78.9% (3,510M) + ISSSTE 15.8% (702M) = 94.7% in classic IMSS-ISSSTE healthcare "
            "ring; 432 IMSS contracts DA=43.8%; peak bursts 2010/2013/2016/2017 ($597M-$776M); "
            "activity ceases 2020 (P5, salud T2, ips=0.716)"),
    (89737, "HIDROVIAS Y CARRETERAS Puebla-CONAPESCA SB",
            "single_bid_capture", 2010, 2020, "high", 233_000_000,
            "CONAPESCA 46.9% (125M) + Puebla-Finanzas 39.1% (104M) = 86%; 8 contracts SB=100%; "
            "sector-mismatched name (highways) winning aquaculture+state finance contracts incl "
            "single $104M Puebla 2016 award; bursty (P5, ips=0.816 T1)"),
    (12221, "CONSTRUMAQUINAS BAJIO GTO Obra Publica SB",
            "single_bid_capture", 2003, 2014, "high", 232_000_000,
            "GTO-SOP 67.8% (201M) + UGTO+IIFE-GTO 27.6% = 95% Guanajuato-state capture; 19 "
            "contracts SB=89.5% DA=10.5%; 10 single-bid contracts at SOP-GTO worth 201M over "
            "2003-2008; classic state-level construction-machinery capture (P7, infraestructura T2)"),
]

SKIPS = [
    (55640, "VIAJES INTERNACIONALES MONARCA: travel agency 16yr (2010-2025), IMSS 57.7%<60% "
            "concentration, DA only 24.3%, diversified across IMSS/ISSSTE/COLEF/research institutes "
            "- legitimate travel services with institutional diversity (protective signal)"),
    (8657,  "CRYOINFRA: industrial cryogenic gas supplier (analog to INFRA/PRAXAIR structural FPs); "
            "PEMEX-EP 68.9% is oligopoly-market concentration (3-4 suppliers exist nationally) not "
            "corruption; single $2.14B 2008 contract is megaproject scale; post-2015 diversified "
            "across IMSS/ISSSTE/CFE - structural monopoly market not procurement fraud"),
]


def run(dry_run=False):
    conn = sqlite3.connect(DB, timeout=60)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    assert max_id == 1418, f"Safety guard: expected max_id == 1418, got {max_id}"
    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {max_id+1}-{max_id+len(CASES)}")
    print(f"Mode: {'DRY-RUN' if dry_run else 'LIVE'}\n")

    inserted = []
    total_contracts = 0

    if not dry_run:
        conn.execute("BEGIN TRANSACTION")
    try:
        for i, case in enumerate(CASES):
            vid, cname, ctype, yr_s, yr_e, conf, fraud_est, notes = case
            case_id_num = max_id + 1 + i
            case_id = f"CASE-{case_id_num}"

            if not dry_run:
                conn.execute("""
                    INSERT OR IGNORE INTO ground_truth_cases
                      (id, case_id, case_name, case_type, year_start, year_end,
                       confidence_level, estimated_fraud_mxn, notes, case_origin)
                    VALUES (?,?,?,?,?,?,?,?,?,'batch_H')
                """, (case_id_num, case_id, cname, ctype, yr_s, yr_e, conf, fraud_est, notes))

                conn.execute("""
                    INSERT OR IGNORE INTO ground_truth_vendors
                      (case_id, vendor_id, evidence_strength, match_method)
                    VALUES (?, ?, ?, 'aria_batch_H')
                """, (case_id, vid, conf))

                rows = conn.execute("""
                    SELECT id FROM contracts WHERE vendor_id=? AND amount_mxn > 0
                """, (vid,)).fetchall()
                for (ctr_id,) in rows:
                    conn.execute("""
                        INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
                        VALUES (?, ?)
                    """, (case_id, ctr_id))
                n_contracts = len(rows)

                conn.execute(
                    "UPDATE aria_queue SET review_status='confirmed', reviewer_notes=? "
                    "WHERE vendor_id=?",
                    (f"GT {case_id}: {cname}", vid)
                )
            else:
                n_contracts = conn.execute(
                    "SELECT COUNT(*) FROM contracts WHERE vendor_id=? AND amount_mxn > 0",
                    (vid,)
                ).fetchone()[0]

            total_contracts += n_contracts
            inserted.append(case_id_num)
            print(f"  Case {case_id_num} (v{vid}): linked {n_contracts} contracts ({yr_s}-{yr_e}) "
                  f"[{conf}] {cname[:50]}")

        for vid, reason in SKIPS:
            if not dry_run:
                conn.execute(
                    "UPDATE aria_queue SET review_status='reviewed', reviewer_notes=? "
                    "WHERE vendor_id=?",
                    (f"SKIP: {reason[:200]}", vid)
                )
            print(f"  v{vid}: SKIP -- {reason[:100]}")

        if not dry_run:
            conn.execute("COMMIT")

        print(f"\nDone. {'Would insert' if dry_run else 'Inserted'} {len(inserted)} cases "
              f"({inserted[0] if inserted else '-'}-{inserted[-1] if inserted else '-'}), "
              f"{'would link' if dry_run else 'linked'} {total_contracts} contracts, "
              f"skipped {len(SKIPS)}.")

    except Exception as e:
        if not dry_run:
            conn.execute("ROLLBACK")
        print(f"ERROR: {e}")
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--dry-run', action='store_true')
    args = p.parse_args()
    run(dry_run=args.dry_run)
