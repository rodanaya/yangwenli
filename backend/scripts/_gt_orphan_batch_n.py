"""
GT Orphan Batch N — link 19 orphan GT cases to vendor IDs.

Evidence: exact name match + contract-count/amount corroboration against GT notes.

Run:
  cd backend && python scripts/_gt_orphan_batch_n.py
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
    (481,   21123, 'name', 'high',   'CONSTRUCTORA Y CRIBADOS ALMOZA SA CV — 53c+2078M ALL SB exact'),
    (527,  231401, 'name', 'high',   'GRUPO EMPRESARIAL DE COMERCIO Y SERVICIOS GECS — 98c+212M exact'),
    (592,  145866, 'name', 'high',   'INFORMATION MANAGEMENT SOLUTIONS SC — 5c+143.9M exact (notes: 5 contracts total, 143.9M)'),
    (1084,  58577, 'name', 'high',   'LIMPIO COMPANIA DE SERVICIOS SA DE CV — 8c+250M at CFE exact'),
    (1089,  61844, 'name', 'high',   'JOSE ALVARO ESTAVILLO MUNOZ — persona fisica; 3c+394M all SB (notes: 394M 2c+SB=100%)'),
    (1167,  82699, 'name', 'high',   'SOLAR INGENIERIA — 6c+224M at API-Progreso+Veracruz ports'),
    (1172, 283655, 'name', 'high',   'SERVICIO Y ADMINISTRACION PARA LAVANDERIAS SA DE CV — 2c+1098M IMSS exact'),
    (1219,  47119, 'name', 'high',   'GANADEROS PRODUCTORES DE LECHE PURA SAPI DE CV — 1050c+480M DICONSA DA=100% exact'),
    (1228,  47586, 'name', 'high',   'GANADEROS PRODUCTORES DE LECHE PURA — 303c exact (notes: 303 contracts DA=100%)'),
    (1241, 154328, 'name', 'high',   'GRANOS Y SEMILLAS DE MEXICO SA DE CV — 23c+236M exact'),
    (1304, 241077, 'name', 'high',   'PROYECTOS DE INFRAESTRUCTURA DE LA LAGUNA SA DE CV — name+ALL SB match'),
    (1309,  49588, 'name', 'high',   'SIMEX INTEGRACION DE SISTEMAS SAPI DE CV — 20c+593M CAPUFE DA exact'),
    (1313,  51001, 'name', 'high',   'RAM INGENIERIA Y SERVICIOS SA DE CV — 152c+244M CAPUFE SB=95% exact'),
    (1317,  99683, 'name', 'high',   'GRAN MARCA PROYECTOS SA DE CV — 2c+234M Veracruz SB=100% exact'),
    (1318, 125805, 'name', 'high',   'CONSTRUCTORA SYEP — 19 SB+1094M SICT match (23 total contracts)'),
    (1324,  70310, 'name', 'high',   'PRECISA CONSTRUCCIONES — 10c+244M IMSS SB=90% match'),
    (1328, 207811, 'name', 'high',   'BASERHIT Y ASOCIADOS SA DE CV — 17c+1478M Tlaxcala SB=82% match'),
    (1347,  73955, 'name', 'high',   'AYPP CONSTRUCTORES — 3c+309M Puebla+SCT (notes: 2c primary institutions 207M)'),
    (1359,  50578, 'name', 'high',   'ASFALTOS GUADALAJARA — 33c+1024M SCT/SICT 94%SB match'),
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
            f'batch_N_{method}', 0.95,
            f'batch_N: {notes}',
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
