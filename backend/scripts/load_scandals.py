"""
Load procurement scandals seed data into the procurement_scandals table.

Usage:
    python -m scripts.load_scandals [--reset]

Options:
    --reset    Drop all existing rows before loading (idempotent re-seed)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
SEED_PATH = Path(__file__).parent.parent / "data" / "scandals_seed.json"


def load(reset: bool = False) -> None:
    import sqlite3

    if not SEED_PATH.exists():
        print(f"ERROR: Seed file not found at {SEED_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(SEED_PATH, encoding="utf-8") as f:
        seed = json.load(f)

    cases = seed["cases"]
    print(f"Loading {len(cases)} scandal cases...")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    if reset:
        cur.execute("DELETE FROM procurement_scandals")
        print("Cleared existing rows.")

    inserted = 0
    updated = 0
    for c in cases:
        # Convert list fields to JSON strings
        sector_ids_json = json.dumps(c.get("sector_ids", []))
        key_actors_json = json.dumps(c.get("key_actors", []))
        sources_json = json.dumps(c.get("sources", []))
        inv_ids_json = json.dumps(c.get("investigation_case_ids", []))

        # Upsert by slug
        cur.execute("SELECT id FROM procurement_scandals WHERE slug = ?", (c["slug"],))
        row = cur.fetchone()

        if row:
            cur.execute("""
                UPDATE procurement_scandals SET
                    name_en = ?, name_es = ?, fraud_type = ?, administration = ?,
                    sector_id = ?, sector_ids_json = ?,
                    contract_year_start = ?, contract_year_end = ?,
                    discovery_year = ?, amount_mxn_low = ?, amount_mxn_high = ?,
                    amount_note = ?, severity = ?, legal_status = ?,
                    legal_status_note = ?, compranet_visibility = ?,
                    compranet_note = ?, summary_en = ?, summary_es = ?,
                    key_actors_json = ?, sources_json = ?,
                    ground_truth_case_id = ?, investigation_case_ids_json = ?,
                    is_verified = ?, last_updated = datetime('now')
                WHERE slug = ?
            """, (
                c["name_en"], c.get("name_es"), c["fraud_type"], c["administration"],
                c.get("sector_id"), sector_ids_json,
                c.get("contract_year_start"), c.get("contract_year_end"),
                c.get("discovery_year"), c.get("amount_mxn_low"), c.get("amount_mxn_high"),
                c.get("amount_note"), c.get("severity", 2), c["legal_status"],
                c.get("legal_status_note"), c["compranet_visibility"],
                c.get("compranet_note"), c["summary_en"], c.get("summary_es"),
                key_actors_json, sources_json,
                c.get("ground_truth_case_id"), inv_ids_json,
                c.get("is_verified", 1), c["slug"],
            ))
            updated += 1
        else:
            cur.execute("""
                INSERT INTO procurement_scandals (
                    name_en, name_es, slug, fraud_type, administration,
                    sector_id, sector_ids_json, contract_year_start, contract_year_end,
                    discovery_year, amount_mxn_low, amount_mxn_high, amount_note,
                    severity, legal_status, legal_status_note, compranet_visibility,
                    compranet_note, summary_en, summary_es, key_actors_json,
                    sources_json, ground_truth_case_id, investigation_case_ids_json,
                    is_verified
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                c["name_en"], c.get("name_es"), c["slug"], c["fraud_type"], c["administration"],
                c.get("sector_id"), sector_ids_json,
                c.get("contract_year_start"), c.get("contract_year_end"),
                c.get("discovery_year"), c.get("amount_mxn_low"), c.get("amount_mxn_high"),
                c.get("amount_note"), c.get("severity", 2), c["legal_status"],
                c.get("legal_status_note"), c["compranet_visibility"],
                c.get("compranet_note"), c["summary_en"], c.get("summary_es"),
                key_actors_json, sources_json,
                c.get("ground_truth_case_id"), inv_ids_json,
                c.get("is_verified", 1),
            ))
            inserted += 1

    conn.commit()
    conn.close()
    print(f"Done: {inserted} inserted, {updated} updated.")


if __name__ == "__main__":
    reset = "--reset" in sys.argv
    load(reset=reset)
