"""
GT Orphan Batch M — link 28 orphan GT cases to vendor IDs.

Evidence sources:
  - Exact name match: vendor name == extracted legal name
  - Contract-count corroboration: notes state exact contract count confirmed in DB
  - Keyword+count: distinctive name token + contract stats match notes

Run:
  cd backend && python scripts/_gt_orphan_batch_m.py
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
    # Exact name matches
    (397,   35996, 'name', 'high',   'OPERADORA DE CENTRO DE MEZCLAS SA DE CV — exact name match'),
    (477,    1106, 'name', 'high',   'COMPANIA CONSTRUCTORA MAS SA DE CV — exact name match'),
    (528,  166351, 'name', 'high',   'DRAGADOS DESAZOLVES Y CAMINOS SA DE CV — exact name match'),
    (631,     591, 'name', 'high',   'PROTECCION Y ALARMAS PRIVADAS SA DE CV — exact name match'),
    (655,   46263, 'name', 'high',   'COMERCIALIZADORA FARMACEUTICA DEL SURESTE — exact name match'),
    (669,    2563, 'name', 'high',   'MAQUINAS INFORMACION Y TECNOLOGIA AVANZADA SA DE CV — exact name match'),
    (683,   62934, 'name', 'high',   'CONFECCION INDUSTRIAL SA DE CV — exact name match'),
    (710,   20767, 'name', 'high',   'CONSTRUCTORA Y PROMOTORA SATELITE SA DE CV — exact name match'),
    (717,   43518, 'name', 'high',   'BL DISENO Y MANTENIMIENTO EMPRESARIAL SA DE CV — exact name match'),
    (723,   36253, 'name', 'high',   'MARIO ERNESTO MONTALVO HERNANDEZ — full name in notes, persona fisica'),
    (1085, 152109, 'name', 'high',   'DESARROLLO ESTRATEGICO DE TULA SA DE CV — exact name match'),
    (1106,  42759, 'name', 'high',   'REPRESENTACIONES OPV — exact name match'),
    # Contract-count corroborated (notes state exact count confirmed in DB)
    (576,   43614, 'name', 'high',   'FINAL TEST — 53 contracts exact (notes: 53 contracts 2010-2024, 235.7M)'),
    (1070, 101124, 'name', 'medium', 'CORPORATIVO CONSTRUCTOR DE INFRAESTRUCTURA DIAMANTE — keyword; 1 contract in DB (notes: 4 contracts, 395M — possible partial index)'),
    (1076, 103189, 'name', 'high',   'La Secretaria de la Defensa Nacional — ghost company; 38 contracts exact (notes: 38 DA contracts 2013, CDMX SSP 204M)'),
    (1091, 275649, 'name', 'high',   'CONSTRUCCIONES TERRACERIAS Y PAVIMENTOS EMSA SA DE CV — name start; 82 contracts SB=98%'),
    (1097, 233629, 'name', 'high',   'OPERADORA DE SERVICIOS MEDICOS ML SA DE CV — 488 contracts exact (notes: 488 contracts DA=95%)'),
    (1099, 266106, 'name', 'high',   'CONSTRUCCIONES PENASCOS 6A SA DE CV — name+997.9M match (notes: 5 contracts, 993M Sonora)'),
    (1129, 142330, 'name', 'high',   'TECNOLOGIA MEDICA DIART SA DE CV — 515 contracts exact (notes: 515 contracts DA=70%)'),
    (1134,  39304, 'name', 'high',   'DESARROLLOS Y PERFORACIONES DE MEXICO SRL — 4 contracts+573.7M exact (notes: 4 contracts, CFE 574M)'),
    (1140,   3688, 'name', 'high',   'GLOBAL SERVICES CORPORATION SA DE CV — name match (notes: CME/PEMEX 5 contracts 577M)'),
    (1144, 109461, 'name', 'high',   'SERVICIOS DE SALUD DE SINALOA — 88 contracts+206.2M exact (notes: 88 contracts, ISSSTE 206M)'),
    (1147,  33269, 'name', 'high',   'VIGUETAS Y BOVEDILLAS SA DE CV — 2 contracts exact (notes: 2 contracts ALL SB, Sinaloa 285M)'),
    (1149,  56196, 'name', 'high',   'R R MEDICA SA DE CV — 182 contracts+248.4M exact (notes: 182 contracts DA=70%, IMSS 248M)'),
    (1153,  43385, 'name', 'high',   'COMERCIALIZADORA INTEGRAL MEDICO HOSPITALARIO SA DE CV — name match (notes: IMSS 116 contracts 369M)'),
    (1160, 150808, 'name', 'high',   'SISTEMAS ALTERNATIVOS DE CONSTRUCCION SA DE CV — 17 contracts+932.2M exact (notes: 17 contracts SB=100%, CFE 932M)'),
    (1224, 151415, 'name', 'high',   'PROCESADORA AGROINDUSTRIAL DEL NORTE SPR RL — exact name from notes'),
    (1310, 127296, 'name', 'high',   'PROCESAMIENTO ESPECIALIZADO DE ALIMENTOS SAPI DE CV — exact name from notes'),
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
            print(f"  WARN: case int_id={case_int_id} not found, skipping")
            skipped += 1
            continue

        v = cur.execute("SELECT id, name FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
        if not v:
            print(f"  WARN: vendor_id={vendor_id} not found, skipping case={case_int_id}")
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
            case_int_id,
            vendor_id,
            v["name"],
            strength,
            f'batch_M_{method}',
            0.85 if strength == 'medium' else 0.95,
            f'batch_M: {notes}',
            datetime.utcnow().isoformat(),
        ))
        inserted += 1

    conn.commit()

    # Update precomputed_stats ground_truth key
    if inserted > 0:
        total_cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        total_vendors = cur.execute(
            "SELECT COUNT(DISTINCT vendor_id) FROM ground_truth_vendors"
        ).fetchone()[0]
        existing = cur.execute(
            "SELECT stat_value FROM precomputed_stats WHERE stat_key='ground_truth'"
        ).fetchone()
        if existing:
            new_val = {"cases": total_cases, "vendors": total_vendors}
            cur.execute(
                "UPDATE precomputed_stats SET stat_value=?, updated_at=? WHERE stat_key='ground_truth'",
                (json.dumps(new_val), datetime.utcnow().isoformat())
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
