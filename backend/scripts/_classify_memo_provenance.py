"""
S.3 — Add memo_provenance + memo_status columns to aria_queue and
classify the 1,843 existing memos.

Per docs/DATA_INTEGRITY_PLAN.md task S.3 — distinguishes:
  - template     : f-string-formatted boilerplate (search prompts, no real findings)
  - llm_narrative: hand-written or LLM-drafted dossier (publishable starting point)
  - stub         : short analyst note (< 500 chars)
  - duplicate    : memo body shared by 2+ vendors

memo_status values:
  - auto    : machine-generated, no human review
  - reviewed: someone confirmed accuracy
  - approved: editorial sign-off
  - rejected: flagged as wrong/dangerous

Both columns nullable for existing rows; defaults backfilled by this script.
Idempotent — safe to re-run. ALTER TABLE only adds if missing.

Usage:
    cd backend
    python scripts/_classify_memo_provenance.py             # local DB
    python scripts/_classify_memo_provenance.py --db RUBLI_DEPLOY.db
    python scripts/_classify_memo_provenance.py --dry-run
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from collections import Counter
from pathlib import Path


# Heuristics matching the audit findings in DATA_INTEGRITY_PLAN.md § 1
TEMPLATE_MARKERS = (
    "Buscar manualmente",
    "PREGUNTAS DE INVESTIGACIÓN",
    "Animal Político / Proceso / Latinus",
    "Hipótesis Alternativas",
    "RESUMEN EJECUTIVO\nProveedor",  # the canonical Mar-17 template opener
)


def ensure_columns(conn: sqlite3.Connection) -> None:
    """ALTER TABLE add the two columns if they don't exist."""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(aria_queue)")
    cols = {r[1] for r in cur.fetchall()}
    added = []
    if "memo_provenance" not in cols:
        cur.execute("ALTER TABLE aria_queue ADD COLUMN memo_provenance VARCHAR(20)")
        added.append("memo_provenance")
    if "memo_status" not in cols:
        cur.execute("ALTER TABLE aria_queue ADD COLUMN memo_status VARCHAR(20)")
        added.append("memo_status")
    if added:
        print(f"Schema: added columns {added}")
        conn.commit()
    else:
        print("Schema: memo_provenance + memo_status already exist")


def classify_memos(conn: sqlite3.Connection, dry_run: bool) -> dict[str, int]:
    """Read every memo and classify into one of 4 buckets."""
    cur = conn.cursor()
    cur.execute(
        "SELECT vendor_id, memo_text FROM aria_queue WHERE memo_text IS NOT NULL"
    )
    rows = cur.fetchall()
    print(f"Classifying {len(rows):,} memos...")

    # First pass: count duplicate memo bodies
    body_counts: Counter[str] = Counter()
    for _, text in rows:
        # Use first 500 chars as fingerprint to catch templated dupes that
        # only differ in vendor name placement
        fingerprint = text[:500] if text else ""
        body_counts[fingerprint] += 1

    classifications: list[tuple[str, int]] = []
    counters: Counter[str] = Counter()

    for vendor_id, text in rows:
        if not text:
            label = "stub"
        elif body_counts[text[:500]] >= 2:
            label = "duplicate"
        elif any(marker in text for marker in TEMPLATE_MARKERS):
            label = "template"
        elif len(text) < 500:
            label = "stub"
        else:
            label = "llm_narrative"
        classifications.append((label, vendor_id))
        counters[label] += 1

    print("Distribution:")
    for label, count in counters.most_common():
        pct = count * 100 / max(1, len(rows))
        print(f"  {label:15s} {count:5,} ({pct:5.1f}%)")

    if dry_run:
        print("DRY-RUN: skipping write")
        return dict(counters)

    # Bulk update
    cur.executemany(
        "UPDATE aria_queue "
        "SET memo_provenance = ?, memo_status = COALESCE(memo_status, 'auto') "
        "WHERE vendor_id = ?",
        classifications,
    )
    conn.commit()
    print(f"Updated {len(classifications):,} memo provenance labels")

    return dict(counters)


def spot_check(conn: sqlite3.Connection) -> None:
    """Verify 3 anchor vendors got sensible labels."""
    print("\nSpot-check (3 anchor vendors):")
    cur = conn.cursor()
    for vid, name in [
        (29277, "GRUFESA (hand-written)"),
        (38095, "BIRMEX (hand-written)"),
        (54393, "URBANISSA (FP-veredict)"),
    ]:
        cur.execute(
            "SELECT memo_provenance, memo_status, LENGTH(memo_text) "
            "FROM aria_queue WHERE vendor_id=?",
            (vid,),
        )
        row = cur.fetchone()
        if row:
            print(f"  vendor {vid} {name}: prov={row[0]!r} "
                  f"status={row[1]!r} len={row[2]}")
        else:
            print(f"  vendor {vid} {name}: not found")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="RUBLI_NORMALIZED.db")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.is_absolute():
        backend_dir = Path(__file__).resolve().parents[1]
        db_path = backend_dir / args.db
    if not db_path.exists():
        print(f"ERROR: DB not found at {db_path}", file=sys.stderr)
        return 2

    print(f"Target DB: {db_path}")
    print(f"Mode: {'DRY-RUN' if args.dry_run else 'WRITE'}\n")

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA synchronous = OFF")

    ensure_columns(conn)
    print()
    classify_memos(conn, args.dry_run)
    spot_check(conn)
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
