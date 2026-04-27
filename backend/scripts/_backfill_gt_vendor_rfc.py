"""Backfill RFC for ground-truth-linked vendors from sibling tables.

Source priority:
  1. ground_truth_vendors.rfc_source (manually verified)
  2. vendor_groups.canonical_rfc (verified group canonical)
  3. institution_top_vendors.rfc (precomputed stats)

Profile (Apr 27 2026): 690 of 841 GT vendors missing RFC. ~105 recoverable.
"""

import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA foreign_keys = ON")

    before = conn.execute("""
        SELECT COUNT(DISTINCT v.id)
        FROM vendors v
        JOIN ground_truth_vendors gtv ON gtv.vendor_id = v.id
        WHERE v.rfc IS NULL OR v.rfc = ''
    """).fetchone()[0]
    print(f"GT vendors missing RFC before: {before}")

    sources = [
        (
            "ground_truth_vendors.rfc_source",
            """
            UPDATE vendors SET rfc = (
                SELECT MAX(gtv.rfc_source)
                FROM ground_truth_vendors gtv
                WHERE gtv.vendor_id = vendors.id
                  AND gtv.rfc_source IS NOT NULL AND gtv.rfc_source != ''
            )
            WHERE (rfc IS NULL OR rfc = '')
              AND id IN (
                SELECT vendor_id FROM ground_truth_vendors
                WHERE rfc_source IS NOT NULL AND rfc_source != ''
              )
            """,
        ),
        (
            "vendor_groups.canonical_rfc",
            """
            UPDATE vendors SET rfc = (
                SELECT MAX(vg.canonical_rfc)
                FROM vendor_aliases va
                JOIN vendor_groups vg ON vg.id = va.group_id
                WHERE va.vendor_id = vendors.id
                  AND vg.canonical_rfc IS NOT NULL AND vg.canonical_rfc != ''
            )
            WHERE (rfc IS NULL OR rfc = '')
              AND id IN (
                SELECT va.vendor_id FROM vendor_aliases va
                JOIN vendor_groups vg ON vg.id = va.group_id
                WHERE vg.canonical_rfc IS NOT NULL AND vg.canonical_rfc != ''
              )
              AND id IN (SELECT vendor_id FROM ground_truth_vendors)
            """,
        ),
        (
            "institution_top_vendors.rfc",
            """
            UPDATE vendors SET rfc = (
                SELECT MAX(itv.rfc)
                FROM institution_top_vendors itv
                WHERE itv.vendor_id = vendors.id
                  AND itv.rfc IS NOT NULL AND itv.rfc != ''
            )
            WHERE (rfc IS NULL OR rfc = '')
              AND id IN (
                SELECT vendor_id FROM institution_top_vendors
                WHERE rfc IS NOT NULL AND rfc != ''
              )
              AND id IN (SELECT vendor_id FROM ground_truth_vendors)
            """,
        ),
    ]

    total_changed = 0
    for label, sql in sources:
        cur = conn.execute(sql)
        conn.commit()
        print(f"  {label}: {cur.rowcount} rows updated")
        total_changed += cur.rowcount

    after = conn.execute("""
        SELECT COUNT(DISTINCT v.id)
        FROM vendors v
        JOIN ground_truth_vendors gtv ON gtv.vendor_id = v.id
        WHERE v.rfc IS NULL OR v.rfc = ''
    """).fetchone()[0]
    print(f"GT vendors missing RFC after:  {after}")
    print(f"Net recovered: {before - after}")
    conn.close()


if __name__ == "__main__":
    main()
