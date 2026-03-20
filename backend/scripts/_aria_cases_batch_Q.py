#!/usr/bin/env python3
"""
Batch Q (T3 investigation): 3 new GT cases from ARIA T3 queue scan.

Investigated 4 vendors, 3 added, 1 skipped:

ADDED:
  Case max+1 (medium) - PSICOFARMA SA DE CV (3848)
      4.1B MXN psychiatric pharma. IMSS capture, DA shift post-2010.
  Case max+2 (medium) - CIMMO MEDICAL SA DE CV (314270)
      312M MXN, 7 contracts 2025, all emergency DA. P3 intermediary.
  Case max+3 (medium) - GIM COMPANIA EDITORIAL SA DE CV (223371)
      274M MXN editorial services, 100% DA across 20+ institutions.

SKIPPED:
  - MEDICA D SA DE CV (19606): Mostly competitive pharma (12% DA).

Guard: max_id must be >= 775.
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
    print(f"Current max GT case ID: {max_id}")
    if max_id < 775:
        print(f"ERROR: Expected max_id >= 775, got {max_id}. Aborting.")
        conn.close()
        sys.exit(1)

    next_id = max_id + 1
    print(f"Will insert cases {next_id} to {next_id + 2}")

    cases = [
        {
            "id": next_id,
            "case_name": "IMSS Psychiatric Pharma DA Capture - Psicofarma",
            "case_type": "institutional_capture",
            "confidence_level": "medium",
            "sector": "salud",
            "notes": (
                "PSICOFARMA SA DE CV (vendor 3848) - 4.1B MXN psychiatric "
                "pharmaceutical supplier. 776 contracts at IMSS (2,974M, 59pct DA). "
                "Clear temporal shift: pre-2010 was 100pct competitive (LP), then "
                "2010-2025 shifted to 85-100pct DA. 2019-2020 spike of 1.7B and "
                "2025 surge of 1.0B all at 100pct DA. Also INSABI 481M (75pct DA). "
                "Psychiatric pharma is a niche but not patent-protected - the shift "
                "from competitive to pure DA is consistent with institutional capture."
            ),
            "estimated_fraud_mxn": 3_000_000_000,
            "year_start": 2010,
            "year_end": 2025,
            "vendors": [
                {"vendor_id": 3848, "evidence_strength": "medium",
                 "match_method": "aria_queue_t3"}
            ],
        },
        {
            "id": next_id + 1,
            "case_name": "IMSS/SSA Emergency DA New Vendor - CIMMO Medical",
            "case_type": "ghost_company",
            "confidence_level": "medium",
            "sector": "salud",
            "notes": (
                "CIMMO MEDICAL SA DE CV (vendor 314270) - 312M MXN in just 7 "
                "contracts, all in 2025, all direct awards. P3 intermediary "
                "pattern flagged. 5 contracts at IMSS subsidiary (237M, 100pct "
                "DA), 2 at SSA (75M, 50pct single-bid). Procedure types: "
                "caso fortuito o fuerza mayor (191M), urgencia y eventualidad "
                "(55M). Brand-new vendor receiving 312M exclusively through "
                "emergency justifications - strong ghost/intermediary signal."
            ),
            "estimated_fraud_mxn": 312_000_000,
            "year_start": 2025,
            "year_end": 2025,
            "vendors": [
                {"vendor_id": 314270, "evidence_strength": "medium",
                 "match_method": "aria_queue_t3"}
            ],
        },
        {
            "id": next_id + 2,
            "case_name": "Multi-Institution Editorial Services DA Monopoly - GIM Editorial",
            "case_type": "institutional_capture",
            "confidence_level": "medium",
            "sector": "hacienda",
            "notes": (
                "GIM COMPANIA EDITORIAL SA DE CV (vendor 223371) - 274M MXN in "
                "336 contracts across 20+ institutions (2018-2025), every single "
                "one a direct award. 105 contracts via oferente unico sole-source "
                "justification (98M). Largest clients: IMSS 84M, SEGOB 25M, "
                "Pronosticos 17M, SSA 16M, FONACOT 14M, Loteria 15M, ISSSTE 9M, "
                "Marina 7M. Steady 30-60M per year. Editorial services are not "
                "patent-protected, yet 100pct DA with sole-source justification "
                "across the entire federal government is extreme."
            ),
            "estimated_fraud_mxn": 274_000_000,
            "year_start": 2018,
            "year_end": 2025,
            "vendors": [
                {"vendor_id": 223371, "evidence_strength": "medium",
                 "match_method": "aria_queue_t3"}
            ],
        },
    ]

    # --- Insert cases ---
    inserted_cases = 0
    for c in cases:
        case_id_str = f"CASE-{c['id']}"
        cur = conn.execute(
            """INSERT OR IGNORE INTO ground_truth_cases
               (id, case_id, case_name, case_type, confidence_level,
                source_news, notes, estimated_fraud_mxn, year_start, year_end)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (c["id"], case_id_str, c["case_name"], c["case_type"],
             c["confidence_level"], f"ARIA T3 investigation — sector: {c['sector']}",
             c["notes"], c["estimated_fraud_mxn"], c["year_start"], c["year_end"])
        )
        if cur.rowcount > 0:
            inserted_cases += 1
            print(f"  Inserted case {c['id']}: {c['case_name']}")
        else:
            print(f"  Skipped case {c['id']} (already exists)")

    # --- Insert vendors ---
    inserted_vendors = 0
    for c in cases:
        for v in c["vendors"]:
            vendor_name = conn.execute(
                "SELECT name FROM vendors WHERE id=?", (v["vendor_id"],)
            ).fetchone()[0]
            cur = conn.execute(
                """INSERT OR IGNORE INTO ground_truth_vendors
                   (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                   VALUES (?, ?, ?, ?, ?)""",
                (c["id"], v["vendor_id"], vendor_name,
                 v["evidence_strength"], v["match_method"])
            )
            if cur.rowcount > 0:
                inserted_vendors += 1
                print(f"    Vendor {v['vendor_id']} linked to case {c['id']}")

    # --- Tag ground_truth_contracts ---
    tagged = 0
    for c in cases:
        for v in c["vendors"]:
            rows = conn.execute(
                """SELECT id FROM contracts WHERE vendor_id = ?
                   AND contract_year >= ? AND contract_year <= ?""",
                (v["vendor_id"], c["year_start"], c["year_end"])
            ).fetchall()
            for (cid,) in rows:
                conn.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                    (c["id"], cid)
                )
            tagged += len(rows)
            print(f"    Tagged {len(rows)} contracts for vendor {v['vendor_id']} ({c['year_start']}-{c['year_end']})")

    # --- Update aria_queue for all investigated vendors ---
    all_vendor_ids = [3848, 314270, 223371, 19606]
    added_vendor_ids = {3848, 314270, 223371}

    for vid in all_vendor_ids:
        if vid in added_vendor_ids:
            conn.execute(
                "UPDATE aria_queue SET in_ground_truth = 1, "
                "review_status = 'confirmed' WHERE vendor_id = ?",
                (vid,)
            )
            print(f"  aria_queue: vendor {vid} -> in_ground_truth=1, confirmed")
        else:
            conn.execute(
                "UPDATE aria_queue SET review_status = 'dismissed', "
                "reviewer_notes = 'Mostly competitive pharma (12pct DA). 2020 COVID emergency spike only.' "
                "WHERE vendor_id = ?",
                (vid,)
            )
            print(f"  aria_queue: vendor {vid} -> dismissed (legitimate)")

    conn.commit()
    n_added = len(added_vendor_ids)
    n_skip = len(all_vendor_ids) - n_added
    print()
    print(f"Done: {inserted_cases} cases, {inserted_vendors} vendors, {tagged} contracts tagged")
    print(f"aria_queue: {len(all_vendor_ids)} vendors ({n_added} confirmed, {n_skip} dismissed)")
    conn.close()


if __name__ == "__main__":
    main()
