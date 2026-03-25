"""
Scope ground-truth labels to fraud time windows and institutions.

Creates a VIEW `ground_truth_contracts_scoped` that narrows positive labels
from "all contracts by GT vendor" to "contracts in the documented fraud period
at the documented institution(s)."  This reduces the ~30-50% label noise that
comes from labeling every contract a vendor ever signed as corrupt.

Usage:
    python -m scripts._scope_gt_labels             # dry-run: stats only
    python -m scripts._scope_gt_labels --execute    # create/replace the VIEW

The VIEW is safe to rebuild at any time (it is just a query alias).
"""

import os
import sqlite3
import sys


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def get_db_path() -> str:
    if len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
        return sys.argv[1]
    return os.environ.get("DATABASE_PATH", DB_DEFAULT)


VIEW_SQL = """\
CREATE VIEW IF NOT EXISTS ground_truth_contracts_scoped AS
SELECT
    c.id               AS contract_id,
    c.vendor_id,
    c.contract_year,
    c.institution_id,
    c.amount_mxn,
    gc.id              AS gt_case_id,
    gc.case_name,
    gc.case_type,
    gc.confidence_level,
    gtv.evidence_strength,
    gtv.curriculum_weight
FROM contracts c
JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id
JOIN ground_truth_cases gc    ON gtv.case_id = gc.id
WHERE
    -- Exclude false-positive vendors
    COALESCE(gtv.is_false_positive, 0) = 0
    -- Year scoping: restrict to fraud window when available
    AND (
        gc.fraud_year_start IS NULL
        OR c.contract_year BETWEEN gc.fraud_year_start AND gc.fraud_year_end
    )
    -- Institution scoping: restrict to fraud institutions when available
    AND (
        gc.fraud_institution_ids IS NULL
        OR c.institution_id IN (
            SELECT value FROM json_each(gc.fraud_institution_ids)
        )
    )
"""


def run(execute: bool = False):
    db_path = get_db_path()
    print(f"Database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    # -- Unscoped count (baseline) --
    cur.execute("""
        SELECT COUNT(*) FROM contracts c
        JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id
        JOIN ground_truth_cases gc    ON gtv.case_id = gc.id
        WHERE COALESCE(gtv.is_false_positive, 0) = 0
    """)
    unscoped_total = cur.fetchone()[0]

    # -- Scoped count (same logic as the VIEW) --
    cur.execute("""
        SELECT COUNT(*) FROM contracts c
        JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id
        JOIN ground_truth_cases gc    ON gtv.case_id = gc.id
        WHERE COALESCE(gtv.is_false_positive, 0) = 0
          AND (gc.fraud_year_start IS NULL
               OR c.contract_year BETWEEN gc.fraud_year_start AND gc.fraud_year_end)
          AND (gc.fraud_institution_ids IS NULL
               OR c.institution_id IN (SELECT value FROM json_each(gc.fraud_institution_ids)))
    """)
    scoped_total = cur.fetchone()[0]

    reduction = unscoped_total - scoped_total
    pct = 100.0 * reduction / unscoped_total if unscoped_total else 0.0

    print(f"\n{'='*60}")
    print(f"  LABEL SCOPING REPORT")
    print(f"{'='*60}")
    print(f"  Unscoped positive contracts : {unscoped_total:>10,}")
    print(f"  Scoped positive contracts   : {scoped_total:>10,}")
    print(f"  Contracts removed           : {reduction:>10,}  ({pct:.1f}%)")
    print(f"{'='*60}")

    # -- Per-case breakdown (top 30 by contracts removed) --
    # Use two separate lightweight queries to avoid Cartesian explosion
    cur.execute("""
        SELECT gc.id, gc.case_name, gc.fraud_year_start, gc.fraud_year_end,
               gc.fraud_institution_ids
        FROM ground_truth_cases gc
        WHERE EXISTS (
            SELECT 1 FROM ground_truth_vendors gtv
            WHERE gtv.case_id = gc.id AND COALESCE(gtv.is_false_positive, 0) = 0
        )
    """)
    cases = cur.fetchall()

    rows = []
    for cid, cname, fy_start, fy_end, inst_ids in cases:
        # Get vendor IDs for this case
        cur.execute("""
            SELECT DISTINCT vendor_id FROM ground_truth_vendors
            WHERE case_id = ? AND COALESCE(is_false_positive, 0) = 0
              AND vendor_id IS NOT NULL
        """, (cid,))
        vids = [r[0] for r in cur.fetchall()]
        if not vids:
            continue

        placeholders = ",".join("?" for _ in vids)

        # Unscoped count
        cur.execute(
            f"SELECT COUNT(*) FROM contracts WHERE vendor_id IN ({placeholders})",
            vids,
        )
        unsc = cur.fetchone()[0]

        # Scoped count
        where_parts = [f"vendor_id IN ({placeholders})"]
        params = list(vids)
        if fy_start is not None:
            where_parts.append("contract_year BETWEEN ? AND ?")
            params.extend([fy_start, fy_end])
        if inst_ids is not None:
            import json as _json
            iids = _json.loads(inst_ids) if isinstance(inst_ids, str) else inst_ids
            if iids:
                iph = ",".join("?" for _ in iids)
                where_parts.append(f"institution_id IN ({iph})")
                params.extend(iids)

        cur.execute(
            f"SELECT COUNT(*) FROM contracts WHERE {' AND '.join(where_parts)}",
            params,
        )
        sc = cur.fetchone()[0]

        if unsc > 0:
            rows.append((cid, cname, fy_start, fy_end, inst_ids, unsc, sc))

    rows.sort(key=lambda r: r[5] - r[6], reverse=True)
    rows = rows[:30]
    if rows:
        header = f"  {'Case':<45} {'Window':<12} {'Inst?':>5} {'Unscoped':>10} {'Scoped':>10} {'Removed':>10}"
        print(f"\n{header}")
        print(f"  {'-'*44} {'-'*11} {'-'*5} {'-'*10} {'-'*10} {'-'*10}")
        for cid, name, ys, ye, inst_ids, unsc, sc in rows:
            short_name = (name[:42] + "..") if len(name) > 44 else name
            window = f"{ys or '?'}-{ye or '?'}"
            has_inst = "Y" if inst_ids else "N"
            removed = unsc - sc
            print(f"  {short_name:<45} {window:<12} {has_inst:>5} {unsc:>10,} {sc:>10,} {removed:>10,}")

    # -- Execute (create the VIEW) --
    if execute:
        print(f"\n  Creating VIEW ground_truth_contracts_scoped ...")
        cur.execute("DROP VIEW IF EXISTS ground_truth_contracts_scoped")
        cur.execute(VIEW_SQL)
        conn.commit()

        cur.execute("SELECT COUNT(*) FROM ground_truth_contracts_scoped")
        view_count = cur.fetchone()[0]
        print(f"  VIEW created. Row count: {view_count:,}")
    else:
        print(f"\n  [DRY RUN] Pass --execute to create the VIEW.")

    conn.close()


if __name__ == "__main__":
    execute_flag = "--execute" in sys.argv
    run(execute=execute_flag)
