"""
GT Orphan Batch U — link 5 orphan GT cases to vendor IDs.

Cases:
- 516: GRUPO TECNICAS ESTUDIO CONSTRUCCION IPN maintenance monopoly
- 1395 (x2): Tren Maya FONATUR irregular direct awards
- 1398: CFE Transmission ISOLUX overpricing
- 1403: IMSS-Prospera Novag pharma bid rigging

Run:
  cd backend && python scripts/_gt_orphan_batch_u.py
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
    # Case 516: IPN maintenance monopoly - GRUPO TECNICAS ESTUDIO CONSTRUCCION
    (516, 296066, 'name', 'high',
     'GRUPO DE TECNICAS DE ESTUDIO PARA LA CONSTRUCCION SA DE CV — IPN:10c/305M (notes:9/11 at IPN); 11c/374M total; maintenance monopoly capture'),

    # Case 1395: Tren Maya - FONATUR irregular direct awards (ASF flagged)
    (1395, 258499, 'name', 'high',
     'ICA CONSTRUCTORA SA DE CV — FONATUR:1c/25849M DA=1 2020 "PROYECTO INTEGRAL OBRA PUBLICA PRECIO MIXTO"; ASF-flagged direct award Tren Maya'),
    (1395, 262680, 'name', 'high',
     'AZVINDI FERROVIARIO SA DE CV — FONATUR:2c total; 2020:8787M (competitive) + 2023:2276M DA=1; rail infrastructure Tren Maya direct award'),

    # Case 1398: CFE Transmission overpricing 2012-2018 - ISOLUX
    (1398, 11971, 'name', 'medium',
     'ISOLUX DE MEXICO SA DE CV — CFE transmission/substation: ~10B MXN 2008-2014; LT lineas transmision, subestaciones; ISOLUX group went bankrupt 2018 amid corruption in MX+Spain; 30-50% overpricing vs international benchmarks'),

    # Case 1403: IMSS-Prospera pharmaceutical bid rigging - Novag
    (1403, 5222, 'name', 'high',
     'NOVAG INFANCIA SA DE CV — IMSS:309c/3052M + ISSSTE:44c/359M + Bienestar:16c/344M pharma; CFC fined Novag and associates for coordinated bidding in IMSS-Prospera pharmaceutical consolidated purchases'),
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

        confidence = 0.95 if strength == 'high' else 0.75
        cur.execute("""
            INSERT INTO ground_truth_vendors
              (case_id, vendor_id, vendor_name_source, role, evidence_strength,
               match_method, match_confidence, notes, created_at)
            VALUES (?, ?, ?, 'primary', ?, ?, ?, ?, ?)
        """, (
            case_int_id, vendor_id, v["name"], strength,
            f'batch_U_{method}', confidence,
            f'batch_U: {notes}',
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
