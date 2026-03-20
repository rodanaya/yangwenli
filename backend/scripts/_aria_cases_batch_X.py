#!/usr/bin/env python3
"""
Ground Truth Batch X - ARIA T3 investigation (6 vendors)
=========================================================
Investigated 2026-03-20.

ADDED (3 cases):
  - v91072  CORPORACION AUXILIAR DE POLICIA DE PROTECCION CIUDADANA
            Single-bid capture at Banco del Bienestar / Diconsa / Alimentacion
  - v130274 BM MEXICANA DE COMERCIO SA DE CV
            P3 intermediary - 410M single-bid to public broadcasting
  - v43649  TECNO LOGICA MEXICANA
            IMSS ring pattern - DA capture on large contracts

SKIPPED (3 vendors):
  - v72127  EL ECONOMISTA - major newspaper, 85 institutions
  - v46373  TELEVISA - major broadcaster, standard advertising
  - v15882  NADRO - largest pharma distributor, legitimate supply chain
"""

import sqlite3
import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 787:
        print("ERROR: max_id sanity check failed - expected >= 787, got", max_id)
        conn.close()
        return

    print(f"Current max GT case id: {max_id}")
    next_id = max_id + 1

    cases_data = [
        {
            "offset": 0,
            "name": "Banco del Bienestar / Diconsa single-bid security capture",
            "case_type": "single_bid_capture",
            "vendor_id": 91072,
            "vendor_name": "CORPORACION AUXILIAR DE POLICIA DE PROTECCION CIUDADANA",
            "year_start": 2019,
            "year_end": 2025,
            "confidence": "medium",
            "fraud_mxn": 218_000_000,
            "notes": (
                "Private police company shifted from small DA security contracts (1-5M/yr pre-2019) "
                "to massive single-bid contracts at AMLO-era welfare institutions post-2019. "
                "131M SB at Banco del Bienestar, 49M SB at Diconsa, 38M SB at Alimentacion para el Bienestar. "
                "92-100% SB rate 2019-2025. Pattern consistent with single-bid capture at newly created institutions."
            ),
        },
        {
            "offset": 1,
            "name": "BM Mexicana 410M single-bid to public broadcasting",
            "case_type": "single_bid_capture",
            "vendor_id": 130274,
            "vendor_name": "BM MEXICANA DE COMERCIO, S.A. DE C.V.",
            "year_start": 2014,
            "year_end": 2014,
            "confidence": "medium",
            "fraud_mxn": 410_000_000,
            "notes": (
                "P3 intermediary flag. Only 2 contracts total - one is a 410M MXN single-bid award from "
                "Sistema Publico de Radiodifusion del Estado Mexicano (public broadcasting). "
                "The other is a tiny 436K municipal contract. A 410M single-bid to a broadcasting entity "
                "from a company with no other significant procurement history is highly anomalous. "
                "Pattern consistent with intermediary / shell company used for a single large transaction."
            ),
        },
        {
            "offset": 2,
            "name": "Tecno Logica Mexicana IMSS direct-award capture",
            "case_type": "institutional_capture",
            "vendor_id": 43649,
            "vendor_name": "TECNO LOGICA MEXICANA",
            "year_start": 2016,
            "year_end": 2020,
            "confidence": "medium",
            "fraud_mxn": 237_000_000,
            "notes": (
                "Medical equipment vendor with 58% of total value (237M) concentrated at IMSS. "
                "Largest contracts are direct awards: 84.7M DA in 2020, 72.5M DA in 2017. "
                "Meanwhile wins competitive bids at ISSSTE (99.8M, 8.3% DA rate). "
                "Classic IMSS ring pattern - institution-specific capture with DA on large contracts "
                "while maintaining competitive facade at other institutions. "
                "Also 100% DA at multiple state DIF systems (Guerrero, Durango, Jalisco)."
            ),
        },
    ]

    total_contracts = 0
    case_ids = []

    for c in cases_data:
        cid = next_id + c["offset"]
        case_ids.append(cid)

        conn.execute(
            """INSERT OR IGNORE INTO ground_truth_cases
               (id, case_id, case_name, case_type, year_start, year_end,
                confidence_level, estimated_fraud_mxn, source_news, notes)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                cid,
                f"CASE-{cid}",
                c["name"],
                c["case_type"],
                c["year_start"],
                c["year_end"],
                c["confidence"],
                c["fraud_mxn"],
                "ARIA T3 investigation",
                c["notes"],
            ),
        )

        conn.execute(
            """INSERT OR IGNORE INTO ground_truth_vendors
               (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
               VALUES (?,?,?,?,?)""",
            (cid, c["vendor_id"], c["vendor_name"], "medium", "aria_queue_t3"),
        )

        contracts = conn.execute(
            "SELECT id FROM contracts WHERE vendor_id=? AND CAST(strftime('%Y', contract_date) AS INTEGER) BETWEEN ? AND ?",
            (c["vendor_id"], c["year_start"], c["year_end"]),
        ).fetchall()

        for (contract_id,) in contracts:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (cid, contract_id),
            )

        total_contracts += len(contracts)
        print(f"  Case {cid}: {c['name']} - {len(contracts)} contracts tagged")

    # ARIA queue updates - confirmed
    for vid in [91072, 130274, 43649]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # ARIA queue updates - skipped
    skips = [
        (72127, "SKIP: El Economista - major national newspaper, 85 institutions, media subscriptions are standard DA practice"),
        (46373, "SKIP: Televisa - major broadcast corporation, standard government advertising contracts"),
        (15882, "SKIP: Nadro - Mexico largest independent pharma distributor, legitimate large-scale supply chain to PEMEX/IMSS"),
    ]
    for vid, note in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='reviewed', reviewer_notes=? WHERE vendor_id=?",
            (note, vid),
        )

    conn.commit()
    conn.close()

    print()
    print("=" * 70)
    print("BATCH X SUMMARY")
    print("=" * 70)
    print(f"Cases added:   3 (IDs {case_ids[0]}-{case_ids[-1]})")
    print(f"Vendors added: 3 (v91072, v130274, v43649)")
    print(f"Vendors skipped: 3 (v72127, v46373, v15882)")
    print(f"Contracts tagged: {total_contracts}")
    print()
    print("Cases:")
    for c, cid in zip(cases_data, case_ids):
        print(f"  {cid}: {c['name']} - {c['case_type']}, {c['year_start']}-{c['year_end']}, ~{c['fraud_mxn']/1e6:.0f}M MXN")
    print()
    print("Skipped:")
    print("  v72127 EL ECONOMISTA - legitimate media, 85 institutions")
    print("  v46373 TELEVISA - legitimate broadcaster, standard advertising")
    print("  v15882 NADRO - legitimate pharma distributor")


if __name__ == "__main__":
    main()
