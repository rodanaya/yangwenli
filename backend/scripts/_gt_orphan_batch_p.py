"""
GT Orphan Batch P — link 14 orphan GT cases to vendor IDs.

Evidence: name match + contract-count/amount corroboration (notes state exact counts
and institution concentrations).

Run:
  cd backend && python scripts/_gt_orphan_batch_p.py
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
    # Exact name + count matches
    (1165,  51057, 'name', 'high', 'CONDUCCION DE FLUIDOS SA DE CV — name+2c+383M CFE DA exact'),
    (1175,  20591, 'name', 'high', 'TRANSPORTES ESPECIALIZADOS PROGRAMADOS — 237c+1142M IMSS SB (notes: 234c 1140M)'),
    (1176,  47705, 'name', 'high', 'INGENIERIA VIAL Y TRANSPORTE — 18c exact; SCT 90.1%*418M=376M exact'),
    (1187,  42793, 'name', 'high', 'CONSTRUCCIONES Y PROYECTOS DE INGENIERIA INDUSTRIAL — 2c+300M PEMEX exact'),
    (1192, 123960, 'name', 'high', 'MC INTERNATIONAL COMMERCE SA DE CV — 32c+453M DICONSA DA=100% exact'),
    (1204, 275894, 'name', 'high', 'MINSA COMERCIAL SA DE CV — 663.8M total (Bienestar+DICONSA 100%); total=436/0.658=662M exact'),
    (1207, 102728, 'name', 'high', 'CONTROLES Y SISTEMAS AUTOMATICOS SA DE CV — 85c+648M CFE SB=80% sole match'),
    (1223,  49140, 'name', 'high', 'PROMOTORA VALE DE VIVIENDA SA DE CV — name+1c+378M CODESON SB=100%'),
    (1225, 112745, 'name', 'high', 'INTEGRACION DE PROCESOS DE INGENIERIA SA DE CV — name+1c+205M CDMX DA'),
    (1230, 110316, 'name', 'high', 'RED DE EMPRESAS COMERCIALIZADORAS CAMPESINAS DE MICHOACAN — 23c+275M DICONSA exact'),
    (1251, 260353, 'name', 'high', 'CAMARA NACIONAL DEL AUTOTRANSPORTE DE PASAJE Y TURISMO CANAPAT — name+1c+203M SEDENA'),
    (1255,  81572, 'name', 'high', 'FOA Ingenieria y Servicios — 8c exact; STC-Metro 68.5%*321M=220M exact'),
    (1257,  53086, 'name', 'high', 'PROMOTORA DE EDIFICACIONES Y CONSTRUCTORA DEL CENTRO — 5c+526M SCT SB=100%'),
    (1263,  46431, 'name', 'high', 'PROYECTOS Y CIMENTACIONES INDUSTRIALES SA DE CV — name+23c+724M CME/PEMEX'),
    (1273, 232780, 'name', 'high', 'COMERCIALIZADORA DE MEDICAMENTOS Y MATERIAL DE CURACION ANTEQUERA — 1052c exact'),
    (1311,  33889, 'name', 'high', 'OBRAS VIALES Y SENALIZACIONES SA DE CV — name+36c CAPUFE SB=86%'),
    (1327, 172535, 'name', 'high', 'GRUPO TEC TEXTURIZADOS Y CONSTRUCCION SA DE CV — name+47c+235M IMSS'),
    (1336,   8264, 'name', 'high', 'CONSTRUCCIONES Y ARRENDAMIENTOS INDUSTRIALES SA DE CV — name; PEMEX 63%*792M=499M exact'),
    (1361, 122980, 'name', 'high', 'SERVICIOS DE PERSONAL DEL ESTADO DE MEXICO SA DE CV — name+4c; IMSS 86.1%*209M=180M exact'),
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
            f'batch_P_{method}', 0.95,
            f'batch_P: {notes}',
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
