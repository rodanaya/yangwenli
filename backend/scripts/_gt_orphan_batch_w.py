"""
GT Orphan Batch W — link case 401 to all 38 SAE ghost contractors.

Case 401: 39 personas fisicas each received EXACTLY 372,182,605 MXN in
direct-award contracts at SAE (Servicio de Administracion y Enajenacion
de Bienes), inst_id=587. Found 38 unique vendor IDs (one person appears
twice in raw contracts). All identified by exact amount + institution match.

Run:
  cd backend && python scripts/_gt_orphan_batch_w.py
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATHS = [
    Path(__file__).parent.parent / "RUBLI_NORMALIZED.db",
    Path(__file__).parent.parent / "RUBLI_DEPLOY.db",
]

NOTE = 'batch_W: SAE inst=587 DA=exact 372,182,605 MXN; one of 39 personas fisicas ghost contractor ring; identical amount is definitive signature'

VENDOR_IDS = [
    48370, 48512, 48957, 50473, 54323, 54854, 60121, 61365, 65314, 65586,
    66746, 66803, 69019, 69701, 71586, 73513, 73786, 73807, 74285, 74301,
    77380, 77902, 78138, 82946, 85626, 85923, 86930, 86953, 88232, 89456,
    89615, 93126, 93145, 95316, 95317, 98297, 98565, 99279,
]


def run(db_path: Path) -> tuple[int, int]:
    if not db_path.exists():
        print(f"  SKIP (not found): {db_path}")
        return 0, 0

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    case_row = cur.execute(
        "SELECT id FROM ground_truth_cases WHERE id = 401"
    ).fetchone()
    if not case_row:
        print("  WARN: case id=401 not found")
        conn.close()
        return 0, 0

    inserted = 0
    skipped = 0
    for vendor_id in VENDOR_IDS:
        v = cur.execute("SELECT id, name FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
        if not v:
            print(f"  WARN: vendor_id={vendor_id} not found")
            skipped += 1
            continue

        exists = cur.execute(
            "SELECT 1 FROM ground_truth_vendors WHERE case_id = 401 AND vendor_id = ?",
            (vendor_id,)
        ).fetchone()
        if exists:
            skipped += 1
            continue

        cur.execute("""
            INSERT INTO ground_truth_vendors
              (case_id, vendor_id, vendor_name_source, role, evidence_strength,
               match_method, match_confidence, notes, created_at)
            VALUES (?, ?, ?, 'primary', 'high', 'batch_W_name', 0.97, ?, ?)
        """, (401, vendor_id, v["name"], NOTE, datetime.utcnow().isoformat()))
        inserted += 1

    conn.commit()

    if inserted > 0:
        total_cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        total_vendors = cur.execute(
            "SELECT COUNT(DISTINCT vendor_id) FROM ground_truth_vendors"
        ).fetchone()[0]
        ps = cur.execute(
            "SELECT stat_value FROM precomputed_stats WHERE stat_key='ground_truth'"
        ).fetchone()
        if ps:
            d = json.loads(ps[0])
            d['vendors'] = total_vendors
            cur.execute(
                "UPDATE precomputed_stats SET stat_value=?, updated_at=? WHERE stat_key='ground_truth'",
                (json.dumps(d), datetime.utcnow().isoformat())
            )
            conn.commit()
            print(f"  precomputed_stats: cases={total_cases} vendors={total_vendors}")

    conn.close()
    print(f"  {db_path.name}: inserted={inserted} skipped={skipped}")
    return inserted, skipped


if __name__ == "__main__":
    total = 0
    for db in DB_PATHS:
        print(f"\nProcessing {db.name}...")
        ins, _ = run(db)
        total += ins
    print(f"\nDone. Total new links: {total}")
