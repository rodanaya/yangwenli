"""
GT Orphan Batch Q — link 17 orphan GT cases to vendor IDs.

Evidence: name match + contract-count/amount/institution corroboration.

Run:
  cd backend && python scripts/_gt_orphan_batch_q.py
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
    # Exact name + count/amount matches
    (1077, 138214, 'name', 'high', 'CONSTRUCTORA Y DESARROLLADORA DE SERVICIOS UNIDOS — Coahuila-Finanzas:1c/683M SB=100% + Tlaxcala-Obras:1c/166M DA=100%; 3c/851M exact'),
    (1078,  27442, 'name', 'high', 'COMPANIA DE MULTISERVICIOS PARA MANTENIMIENTO INTEGRALES — PEMEX Corp:2c/198M + PEMEX E&P:2c/140M + CME:1c/31M = 5c/369M SB=80% exact'),
    (1080,  46361, 'name', 'high', 'CONSULTORIA DE INGENIERIA PARA SOLUCIONES INTEGRADAS — CONAGUA:17c/698M SB=94% exact'),
    (1123, 113850, 'name', 'high', 'DESARROLLO DE PROYECTOS DE ENERGIA INFRAESTRUCTURA ENCO GROUP — SCT:8c/449M SB=100% exact'),
    (1126, 176276, 'name', 'high', 'TECHNO SERVICIOS DEL SURESTE — IMSS:1c/255M SB=100% exact'),
    (1127, 252744, 'name', 'high', 'B.C. APLICACIONES MEDICAS INTEGRALES — HGM:2c/153M SB=100% + IMSS:50c/84M DA=84%; 74c exact'),
    (1145, 118516, 'name', 'medium', 'CENTRO DE TECNOLOGIAS DEL SURESTE — IMSS:4c/486M SB=75% + ISSSTE:3c/109M DA=100%; total 780M IMSS=62.3% exact; notes:8c but DB:18c (contract-count mismatch)'),
    (1166, 190335, 'name', 'high', 'CONSTRUCTORA Y ARRENDADORA DE EQUIPOS LESANVE — Tlaxcala:1c/162M SB=100% + SCT:1c/119M SB=100%; 4c ALL SB exact'),
    (1174, 126184, 'name', 'high', 'GRUPO EMPRESARIAL INTERAMERICANO ORME — DICONSA:149c/239M DA=99.3%; 150c total exact'),
    (1203,  10340, 'name', 'high', 'URBANIZADORA Y EDIFICADORA GEMA — SCT:31c/681M SB=100% + Jalisco-SPUI:59c/125M SB=100%; 102c/839M; SCT=81.1% exact'),
    (1244,  28232, 'name', 'high', 'CONSTRUCTORA Y ARRENDADORA REMA — CONAGUA:4c/542M SB=100%; total 12c/645M; CONAGUA=84.0% exact'),
    (1269,  57165, 'name', 'high', 'R & R EMPRESARIAL — SCT:12c/337M + SICT:2c/113M + CAPUFE:2c/102M = 22c/603M ALL SB; SCT+SICT=74.7%(450M) exact'),
    (1274, 252053, 'name', 'high', 'COMERCIALIZADORA Y OPERADORA DE SERVICIOS ADEMEX — IMSS:263c/480M DA=98%; 283c total DA=98.2% exact'),
    (1329, 249395, 'name', 'high', 'D R HYDRO SOLUCIONES AGRICOLAS — CONAGUA:61c/814M SB=92% exact'),
    (1333,  17998, 'name', 'high', 'URBANIZACION Y CONSTRUCCION AVANZADA — JAL-SIOP:2c/217M + JAL-Gob:2c/134M = 4c/351M SB=100%; Jalisco=93.8% exact'),
    (1339,  43085, 'name', 'high', 'FARMACOS Y RECURSOS MATERIALES ESPECIALIZADOS — IMSS:671c/615M DA=92%; total 727c/744M; IMSS=82.7% exact'),
    (1370,  99414, 'name', 'high', 'GRUPO CONSTRUCTOR Y ARRENDADOR DEL CENTRO — CAPUFE:2c/445M SB=100%; overall SB=85.7%(12/14) exact; CAPUFE=65.5%(444M) exact'),
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
            f'batch_Q_{method}', 0.95 if strength == 'high' else 0.80,
            f'batch_Q: {notes}',
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
