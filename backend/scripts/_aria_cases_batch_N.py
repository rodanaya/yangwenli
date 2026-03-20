#!/usr/bin/env python3
"""
Batch N (T3 investigation): 3 new GT cases from ARIA T3 queue scan.

Investigated 5 vendors, 3 added, 2 skipped:

ADDED:
  Case max+1 (high) - AGRUPACION CIVICA DEPORTIVA PLATEROS AC (90150)
      270M MXN from Universidad Veracruzana 2017. Estafa Maestra pattern.
  Case max+2 (medium) - AMAROX PHARMA SA DE CV (229401)
      Post-2018 pharma. Explosive growth. IMSS 85pct DA.
  Case max+3 (medium) - UNIVERSAL MOTOR GERATE DE MEXICO (15977)
      Military equipment. SEDENA/Marina/CONAGUA DA concentration.

SKIPPED:
  - CONSORCIO GASOLINERO PLUS (43225): Legitimate fuel distributor.
  - ELEVADORES SCHINDLER (7061): Swiss multinational elevator OEM.

Guard: max_id must be >= 764.
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
    if max_id < 764:
        print(f"ERROR: Expected max_id >= 764, got {max_id}. Aborting.")
        conn.close()
        sys.exit(1)

    next_id = max_id + 1
    print(f"Will insert cases {next_id} to {next_id + 2}")

    cases = [
        {
            "id": next_id,
            "case_name": "Universidad Veracruzana - Plateros AC Fund Laundering",
            "case_type": "ghost_company",
            "confidence_level": "high",
            "sector": "educacion",
            "notes": (
                "AGRUPACION CIVICA DEPORTIVA PLATEROS AC (vendor 90150) received "
                "270M MXN in direct awards from Universidad Veracruzana in 2017. "
                "Two contracts of 155M and 114M to a civil sporting association. "
                "Rest of portfolio across all other institutions is under 2M total. "
                "Classic La Estafa Maestra / university fund-laundering pattern."
            ),
            "estimated_fraud_mxn": 270_000_000,
            "year_start": 2017,
            "year_end": 2018,
            "vendors": [
                {"vendor_id": 90150, "evidence_strength": "high",
                 "match_method": "aria_queue_t3"}
            ],
        },
        {
            "id": next_id + 1,
            "case_name": "IMSS/ISSSTE Pharma DA Saturation - Amarox Pharma",
            "case_type": "institutional_capture",
            "confidence_level": "medium",
            "sector": "salud",
            "notes": (
                "AMAROX PHARMA SA DE CV (vendor 229401) debuted 2018, explosive "
                "growth from 22M (2019) to 316M (2025). 48pct of value at IMSS "
                "with 85-93pct DA rate. Also at ISSSTE (64pct DA) and INSABI "
                "(71pct DA). Classic post-2018 pharma DA saturation capture."
            ),
            "estimated_fraud_mxn": 500_000_000,
            "year_start": 2019,
            "year_end": 2025,
            "vendors": [
                {"vendor_id": 229401, "evidence_strength": "medium",
                 "match_method": "aria_queue_t3"}
            ],
        },
        {
            "id": next_id + 2,
            "case_name": "SEDENA/Marina Industrial Equipment DA Concentration",
            "case_type": "institutional_capture",
            "confidence_level": "medium",
            "sector": "defensa",
            "notes": (
                "UNIVERSAL MOTOR GERATE DE MEXICO SA DE CV (vendor 15977) - "
                "industrial equipment supplier. 66pct value at top institution. "
                "SEDENA 199M (2017-2024, 67pct DA), Marina 130M (100pct DA), "
                "CONAGUA 113M (62.5pct single-bid). Military/energy equipment "
                "with institution-specific DA concentration."
            ),
            "estimated_fraud_mxn": 400_000_000,
            "year_start": 2010,
            "year_end": 2025,
            "vendors": [
                {"vendor_id": 15977, "evidence_strength": "medium",
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
    all_vendor_ids = [90150, 229401, 15977, 43225, 7061]
    added_vendor_ids = {90150, 229401, 15977}

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
                "reviewer_notes = 'Structural monopoly / legitimate business' "
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
