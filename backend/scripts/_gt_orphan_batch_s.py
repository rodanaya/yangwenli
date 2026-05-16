"""
GT Orphan Batch S — link 18 orphan GT cases to vendor IDs.

Includes single-vendor cases and multi-vendor shell company rings:
- Case 30: BIRMEX ring (Biomics + Farmaceuticos Maypo)
- Case 32: Konkistolo/FamilyDuck ring (4 of 5 companies)
- Case 434: Chiapas street lighting ring (all 4 vendors, IDs from case notes)

Run:
  cd backend && python scripts/_gt_orphan_batch_s.py
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
    # Single-vendor cases
    (31,  300207, 'name', 'high', 'POYAGO SA DE CV — IMSS:26c/365M; 1 of 19 shell companies in diabetes/insulin ring 1022pct markup'),
    (450,  13665, 'name', 'high', 'INGENIERIA DE SISTEMAS SANITARIOS Y AMBIENTALES — 41c/1852M multi-state water; NL:19c/556M + NL-Gov:6c/343M + Veracruz:1c/281M exact'),
    (468,  94014, 'name', 'high', 'CONSULTORIA EN OBRAS ESTRUCTURALES DE TUBERIAS (COET) — CONAGUA:20c/656M exact; 23c/669M total exact'),
    (492, 180790, 'name', 'high', 'DESPACHO JURIDICO EMPRESARIAL D.J.E — IMSS:28c/1066M + ISSSTE:7c/61M = 35c/1127M exact'),
    (510, 305423, 'name', 'high', 'COMERCIALIZADORA DE LA PENINSULA DEL MAYAB — IMSS:5c/516M exact'),
    (518, 132781, 'name', 'high', 'CORPORACION INTERAMERICANA DE ENTRETENIMIENTO (CIE) — CPTM:1c/2444M DA exact; tourism promotion 2014-2019'),
    (562, 172709, 'name', 'high', 'PROYECTOS Y SERVICIOS ANGELOPOLIS — ISSSTE:130c/440M + IMSS:7c; 138c total DA=93.5% exact'),
    (616,   3389, 'name', 'high', 'INTELIGENCIA Y TECNOLOGIA INFORMATICA (ITI) — 90c/623M; Bienestar:373.6M P3 DA capture exact'),
    # Case 30: BIRMEX medicine overpricing ring
    (30, 258535, 'name', 'high', 'BIOMICS LAB MEXICO SA DE CV — inhabilitada by SFP for falsifying COFEPRIS docs; 182c/1832M health'),
    (30,   2873, 'name', 'high', 'FARMACEUTICOS MAYPO SA DE CV — under investigation; 18216c/86243M AMLO-era contracts'),
    # Case 32: Konkistolo/FamilyDuck simulated competition ring
    (32, 297273, 'name', 'high', 'KONKISTOLO SA DE CV — 93c/243M; shell company ring member; partner reported identity theft'),
    (32, 293066, 'name', 'high', 'COMERCIALIZADORA FAMILYDUCK SA DE CV — 79c/885M; shell company ring member; largest in ring'),
    (32, 279096, 'name', 'high', 'GRUPO PELMU SA DE CV — 217c/515M; shell company ring member; simulated competition with Konkistolo'),
    (32, 291049, 'name', 'high', 'ADIAM ABASTECEDORA DE INSUMOS Y ALIMENTOS MEXICO — 12c/121M; inhabilitada 15mo mattress fraud 37.6M'),
    # Case 434: Chiapas street lighting ring (vendor IDs explicitly in case notes)
    (434, 176592, 'name', 'high', 'CORPORATIVO FEMM SA DE CV — CHIS-Energy:6c/37M; Chiapas street lighting ring; 21c same-day Dec-29-2016'),
    (434, 177278, 'name', 'high', 'DESARROLLOS Y FABRICACIONES VITA SA DE CV — CHIS-Energy:6c/20M; ring member'),
    (434, 180945, 'name', 'high', 'ALTON SOLUCIONES EMPRESARIALES INTEGRALES SA DE CV — CHIS-Energy:6c/61M; ring member'),
    (434, 170158, 'name', 'high', 'OP PACIFIC DISTRIBUTIONS SA DE CV — CHIS-Energy:3c/31M; ring member'),
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
            f'batch_S_{method}', 0.95,
            f'batch_S: {notes}',
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
