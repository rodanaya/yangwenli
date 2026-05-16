"""
GT Orphan Batch L — link 27 orphan GT cases to vendor IDs.

Sources:
  - 3 RFC-based (exact match via RFC code in notes)
  - 24 name-based (extracted full legal name from notes, single DB match)

Run:
  cd backend && python scripts/_gt_orphan_batch_l.py
"""
import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATHS = [
    Path(__file__).parent.parent / "RUBLI_NORMALIZED.db",
    Path(__file__).parent.parent / "RUBLI_DEPLOY.db",
]

# (case_int_id, vendor_id, method, evidence_strength)
LINKS = [
    # RFC-based (highest confidence)
    (408,  319332, 'RFC',  'high',   'RFC SAP230524CI6 confirmed'),
    (411,  278991, 'RFC',  'high',   'RFC IMV040628UM1 confirmed'),
    (612,  261138, 'RFC',  'high',   'RFC MPA9502158X5 confirmed'),

    # Name-based (full legal name extracted from notes)
    (600,   69288, 'name', 'high',   'SOLUCIONES INTEGRALES EN CLIMATIZACION SA DE CV'),
    (606,   60977, 'name', 'high',   'CONSTRUCTORA Y ARRENDADORA DE LA COSTA DE MICHOACAN'),
    (609,   51693, 'name', 'high',   'INFRAESTRUCTURA Y EDIFICACION DEL SURESTE SA DE CV'),
    (611,  200141, 'name', 'high',   'Q A STORE COM SA DE CV'),
    (617,    5545, 'name', 'high',   'CONSTRUCTORA Y URBANIZADORA CAPELLANIA SA DE CV'),
    (622,   93372, 'name', 'high',   'SISTEMAS PRACTICOS EN SEGURIDAD PRIVADA SA DE CV'),
    (627,  241094, 'name', 'high',   'MANTENIMIENTO DE EQUIPO MEDICO BITA SA DE CV'),
    (632,   89863, 'name', 'high',   'CONSTRUCTORA Y EDIFICADORA GIA+A SA DE CV'),
    (635,   33616, 'name', 'high',   'SOLUCIONES ESTRATEGICAS UNIVERSALES SA DE CV'),
    (636,  258446, 'name', 'high',   'SERVICIOS INMOBILIARIOS IROA SA DE CV'),
    (637,   61362, 'name', 'high',   'CONSTRUCTORA Y ARRENDADORA SAN SEBASTIAN SA DE CV'),
    (644,   47495, 'name', 'high',   'OPERADORA DE ECOSISTEMAS SA DE CV'),
    (648,   54260, 'name', 'high',   'GRUPO TERRITORIAL Y MARITIMO SA DE CV'),
    (650,    3876, 'name', 'high',   'EXPERTOS EN COMPUTO Y COMUNICACIONES SA DE CV'),
    (661,  197676, 'name', 'high',   'BEBIDAS PURIFICADAS S de RL de CV'),
    (668,  253940, 'name', 'high',   'COMPANIA CONSTRUCTORA E INMOBILIARIA KALTEC SA DE CV'),
    (675,  213954, 'name', 'high',   'CONSTRUCCIONES Y CONCRETOS MARYM SA DE CV'),
    (676,  166693, 'name', 'high',   'VALET PERSONALIZADO EN CUSTODIA EMPRESARIAL VAPE SA'),
    (686,   43684, 'name', 'high',   'TALLERES GRAFICOS DE MEXICO'),
    (688,  157977, 'name', 'high',   'CONSULTORIA ESTRATEGICA Y COACHING S DE RL DE CV'),
    (696,  245410, 'name', 'high',   'CORPORATIVO DE DESARROLLO SUSTENTABLE SA DE CV'),
    (702,  179630, 'name', 'high',   'SERVICIOS INTEGRADOS TRUJILLO ROMANO SA DE CV'),
    (711,   36639, 'name', 'high',   'ESPECIALISTAS EN ACABADOS PROFESIONALES SA DE CV'),
    (720,   47779, 'name', 'high',   'SISTEMAS AVANZADOS EN COMPUTACION DE MEXICO'),
]


def run(db_path: Path) -> int:
    if not db_path.exists():
        print(f"  SKIP (not found): {db_path}")
        return 0

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    inserted = 0
    skipped = 0
    for case_int_id, vendor_id, method, strength, notes in LINKS:
        # Verify case exists
        case_row = cur.execute(
            "SELECT id, case_id FROM ground_truth_cases WHERE id = ?", (case_int_id,)
        ).fetchone()
        if not case_row:
            print(f"  WARN: case int_id={case_int_id} not found, skipping")
            skipped += 1
            continue

        # Check vendor exists
        v = cur.execute("SELECT id, name FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
        if not v:
            print(f"  WARN: vendor_id={vendor_id} not found, skipping case={case_int_id}")
            skipped += 1
            continue

        # Skip if already linked
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
            f'batch_L_{method}',
            0.95 if method == 'name' else 1.0,
            f'batch_L: {notes}',
            datetime.utcnow().isoformat(),
        ))
        inserted += 1

    conn.commit()
    conn.close()
    print(f"  {db_path.name}: inserted={inserted} skipped={skipped}")
    return inserted


if __name__ == "__main__":
    total = 0
    for db in DB_PATHS:
        print(f"\nProcessing {db.name}...")
        total += run(db)
    print(f"\nDone. Total new links: {total}")
