"""
GT Orphan Batch O — link 12 orphan GT cases to vendor IDs.

Evidence: contract count, amount, and SB% corroboration against GT notes.
Includes 3 duplicate case pairs (1344/1412, 1347/1415, 1350/1418) — same
vendor linked to both duplicates.

Run:
  cd backend && python scripts/_gt_orphan_batch_o.py
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATHS = [
    Path(__file__).parent.parent / "RUBLI_NORMALIZED.db",
    Path(__file__).parent.parent / "RUBLI_DEPLOY.db",
]

# (case_int_id, vendor_id, method, evidence_strength, notes)
LINKS = [
    (1178, 308282, 'name', 'high',   'LIMPIEZA ESPECIALIZADA INDUSTRIAL Y HOSPITALARIA SA DE CV — 6c+1219M IMSS/SSA exact'),
    (1189, 294370, 'name', 'high',   'ELECTROMECANICA Y CONSTRUCCION DOMEX DEL SURESTE SA DE CV — 1c+550M CENAGAS SB=100% exact'),
    (1201, 241393, 'name', 'high',   'OPERACIONES INTERNACIONALES DE SERVICIOS SA DE CV — 1c+691M CENAGAS SB=100% exact'),
    (1271,  55737, 'name', 'high',   'INGENIERIA DE NEGOCIOS SOSTENIBLES SA DE CV — 29c exact, Sinaloa SB=83%'),
    (1334,  72200, 'name', 'high',   'CONSTRUCCIONES Y SERVICIOS DR ONCE SA DE CV — name match, Nuevo León SB'),
    (1341, 102407, 'name', 'high',   'VITESSE FINANCING AND TRUST DE MEXICO SA DE CV — 2c+329M CDMX SB=100% exact'),
    (1344,  15057, 'name', 'high',   'DISENOS Y CONSTRUCCIONES GONZALEZ SA DE CV — SB=89% exact, 248M SCT+SICT (65c DB vs 48c notes)'),
    (1347,  73955, 'name', 'high',   'AYPP CONSTRUCTORES — 3c+309M Puebla+SCT (already linked)'),
    (1350, 297014, 'name', 'high',   'I 25 SA DE CV — 2c+283M SCOP DA=100% exact'),
    (1411,   4355, 'name', 'high',   'CORPORACION ARMO SA DE CV — 4205c+1142M IMSS DA=84.1% exact'),
    # Duplicate cases — same vendor as 1344, 1347, 1350
    (1412,  15057, 'name', 'high',   'DISENOS Y CONSTRUCCIONES GONZALEZ SA DE CV — duplicate of 1344, same vendor'),
    (1415,  73955, 'name', 'high',   'AYPP CONSTRUCTORES — duplicate of 1347, same vendor'),
    (1418, 297014, 'name', 'high',   'I 25 SA DE CV — duplicate of 1350, same vendor'),
]


def run(db_path: Path) -> tuple[int, int]:
    if not db_path.exists():
        print(f"  SKIP (not found): {db_path}")
        return 0, 0

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    inserted = 0
    skipped = 0
    for case_int_id, vendor_id, method, strength, notes in LINKS:
        case_row = cur.execute(
            "SELECT id, case_id FROM ground_truth_cases WHERE id = ?", (case_int_id,)
        ).fetchone()
        if not case_row:
            print(f"  WARN: case int_id={case_int_id} not found")
            skipped += 1
            continue

        v = cur.execute("SELECT id, name FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
        if not v:
            print(f"  WARN: vendor_id={vendor_id} not found for case {case_int_id}")
            skipped += 1
            continue

        exists = cur.execute(
            "SELECT 1 FROM ground_truth_vendors WHERE case_id = ? AND vendor_id = ?",
            (case_int_id, vendor_id)
        ).fetchone()
        if exists:
            skipped += 1
            continue

        cur.execute("""
            INSERT INTO ground_truth_vendors
              (case_id, vendor_id, vendor_name_source, role, evidence_strength,
               match_method, match_confidence, notes, created_at)
            VALUES (?, ?, ?, 'primary', ?, ?, ?, ?, ?)
        """, (
            case_int_id, vendor_id, v["name"], strength,
            f'batch_O_{method}', 0.95,
            f'batch_O: {notes}',
            datetime.utcnow().isoformat(),
        ))
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
