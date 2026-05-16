"""
GT Orphan Batch V — link 3 orphan GT cases, 5 vendor links.

Cases:
- 1388: Línea 12 Metro Collapse — ICA + Alstom (CDMX-Obras contracts)
- 1391: Enciclomedia SEP Overpricing — TED Tecnología Editorial + Interconecta
- 1397: SSP García Luna IT overpricing — Mainbit

Run:
  cd backend && python scripts/_gt_orphan_batch_v.py
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
    # Case 1388: Línea 12 Metro Collapse 2021 (constructed 2008-2012)
    (1388, 1094, 'name', 'high',
     'INGENIEROS CIVILES ASOCIADOS SA DE CV (ICA) — GDF:1c/15290M 2008 DA=0 "Proyecto Integral a Precio Alzado y tiempo determinado" = Linea 12 civil construction; construction defects led to 2021 partial collapse'),
    (1388, 29816, 'name', 'high',
     'ALSTOM MEXICANA SA DE CV — CDMX-Obras:1c/1544M 2013 DA=1 "PROYECTO INTEGRAL PARA LA CONSTRUCCION DE LA OBRA ELECTROMECANICA" = Linea 12 electromechanical/rolling stock; direct award'),

    # Case 1391: Enciclomedia SEP Digital Classroom Overpricing (Fox era 2003-2009)
    (1391, 1648, 'name', 'high',
     'TED TECNOLOGIA EDITORIAL SA DE CV — SEP:7332M total; 2005:3682M + 2006:1889M "SERVICIO PARA PONER A DISPOSICION DE ESTA SECRETARIA LA INFRAESTRUCTURA" = Enciclomedia managed computing infrastructure; ASF flagged overpricing'),
    (1391, 13369, 'name', 'high',
     'INTERCONECTA SA DE CV — SEP:1c/4517M 2005 same contract type "SERVICIO PARA PONER A DISPOSICION DE ESTA SECRETARIA LA INFRAESTRUCTURA" = Enciclomedia managed computing; ASF flagged overpricing Fox era'),

    # Case 1397: SSP Nacional García Luna IT overpricing (2006-2012)
    (1397, 981, 'name', 'medium',
     'MAINBIT SA DE CV — SSP:1c/1107M 2007 "Contratacion del servicio de un centro de administracion tecnologica" = IT administration center contract under Garcia Luna; SSP equipment flagged ASF overpricing'),
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
            f'batch_V_{method}', confidence,
            f'batch_V: {notes}',
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
