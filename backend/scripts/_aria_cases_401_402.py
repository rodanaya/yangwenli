"""
ARIA Cases 401-402: March 17 2026 investigation session.

Cases:
  401: SAE Ghost Contractor Ring - 39 personas fisicas, identical 372.2M DA contracts
       Total: ~14.9B MXN | Institution: SAE | All NULL dates (Structure B)
  402: OPCIONES MEDICAS DE EQUIPAMIENTO - Force majeure same-day DA splitting at ISEM
       578.6M on single day 2024-04-01 (3 different 'emergencies') + 2025 SSISSSTE contracts

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Case 401: SAE Ghost Contractor Ring — 39 personas fisicas
SAE_VENDOR_IDS = [
    73513,  # CLISERIO ARIAS SANTILLAN (2 contracts = 744M)
    48370,  # GONZALO ALARCON ITURBIDE
    48512,  # GUNTER CARRANZA COTA
    48957,  # JUAN MARTINEZ RAMIREZ
    50473,  # JAIME CALDERON ALFREDO
    54323,  # ARTURO PUEBLITA FERNANDEZ
    54854,  # FERNANDO AGISS BITAR
    60121,  # EDGAR DE LA CRUZ GONZALEZ
    61365,  # BLANCA CAMACHO CASTANON
    65314,  # LUIS MANUEL DIAZ MIRON ALVAREZ
    65586,  # EMILIO CARRANZA OBERSOHN
    66746,  # JOSE ANTONIO HASSAF ABRAHAM
    66803,  # ARACELI BELTRAN ROMAN
    69019,  # VALERIA FERNANDEZ DIAZ
    69701,  # PABLO SUINAGA CARDENAS
    71586,  # VICTOR HUGO RAMOS CARLOS
    73786,  # ALEJANDRO SANCHEZ BUSTOS
    73807,  # GUILLERMO EMILIANO AHEDO
    74285,  # JOSE MANUEL CAMPERO PARDO
    74301,  # PEDRO CUEVAS GARZA
    77380,  # ROBERTO DIAZ SAENZ
    77902,  # GONZALO BUENROSTRO FLORES
    78138,  # CLAUDIA PATRICIA GOMEZ BARAJAS
    82946,  # JOSE ALBERTO VAZQUEZ MARTINEZ
    85626,  # MARIA DE LOS ANGELES CORONA GARCIOA
    85923,  # JAIME ENRIQUE AYALA BERDEJA
    86930,  # MAURICE PIERE DUVAL BARRANCO
    86953,  # MARIA MERCEDES PACHECO MELGOZA
    88232,  # JOSE ALFREDO CHAVARRIA CARBAJAL
    89456,  # LILIANA KARINA RODRIGUEZ MATUSEN
    89615,  # MARIO FERNANDO TORRES ARIAS
    93126,  # VICTOR MANUEL CABANAS MARTINEZ
    93145,  # ADRIAN DIAZ ESTRADA
    95316,  # JUAN PEDRO MACHADO ARIAS
    95317,  # CARLOS HERNANDEZ CONTRERAS
    98297,  # OSCAR JARAMILLO MARTINEZ
    98565,  # ANA VERONICA BONILLA CORONA
    99279,  # EDUARDO SADURNI SOTES
]

# Case 402: OPCIONES MEDICAS DE EQUIPAMIENTO
OPCIONES_MEDICAS_VENDOR_ID = 214114


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    # ── Case 401: SAE Ghost Contractor Ring ──────────────────────────────────
    case_401_id = next_id
    case_401_str = f"CASE-{case_401_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_401_id, case_401_str,
        "SAE Ghost Contractor Ring - 39 Personas Fisicas Identical DA Contracts",
        "ghost_company",
        "medium",
        (
            "39 personas fisicas each received EXACTLY 372,182,605 MXN in direct-award contracts "
            "at SAE (Servicio de Administracion y Enajenacion de Bienes - Mexico's asset forfeiture "
            "agency). All contracts have NULL award dates (Structure B data quality). "
            "CLISERIO ARIAS SANTILLAN received 2 contracts totalling 744,365,210 MXN. "
            "Total ring value: ~14.9B MXN (40 contracts x 372,182,605). "
            "No RFC registered for any of the 39 natural persons. "
            "Pattern: identical amounts, same institution, all DA, all null dates, "
            "all personas fisicas = highly suspicious ghost contractor coordination. "
            "Alternative: possible Structure B data error (duplicate/phantom records). "
            "Requires cross-reference with SAE procurement records. "
            "SAE manages billions in seized assets from drug cartels and financial crime. "
            "A ghost contractor ring at SAE would represent institutional capture of the "
            "anti-corruption agency itself."
        ),
        14_887_304_200,
        2010, 2017,
    ))
    print(f"Inserted case {case_401_id}: SAE Ghost Contractor Ring")

    # Tag SAE ring contracts
    tagged_401 = 0
    for vid in SAE_VENDOR_IDS:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,
                (SELECT name FROM vendors WHERE id=?),
                'medium', 'aria_investigation')
        """, (case_401_str, vid, vid))

        rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
        for row in rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (case_401_str, row[0])
            )
            tagged_401 += 1

        conn.execute("""
            UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review',
            memo_text=?
            WHERE vendor_id=?
        """, (
            f"SAE Ghost Contractor Ring (Case {case_401_id}): Persona fisica with EXACTLY "
            f"372,182,605 MXN DA contract at SAE. One of 39 identical natural person contractors "
            f"totalling 14.9B MXN. All NULL dates, no RFC. NEEDS_REVIEW - possible ghost ring or data error.",
            vid
        ))

    print(f"  Tagged {tagged_401} contracts for {len(SAE_VENDOR_IDS)} SAE vendors")

    # ── Case 402: OPCIONES MEDICAS DE EQUIPAMIENTO ───────────────────────────
    case_402_id = next_id + 1
    case_402_str = f"CASE-{case_402_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_402_id, case_402_str,
        "OPCIONES MEDICAS DE EQUIPAMIENTO - Force Majeure DA Same-Day Splitting ISEM",
        "procurement_fraud",
        "medium",
        (
            "Medical equipment vendor that received 578.6M MXN across 3 contracts on a single day "
            "(2024-04-01) at ISEM (Instituto de Salud del Estado de Mexico) via 'ADJUDICACION DIRECTA "
            "POR CASO FORTUITO O FUERZA MAYOR' (force majeure emergency DA). "
            "Three completely different service categories on same day: "
            "(1) 243.8M peritoneal dialysis service, "
            "(2) 175.8M infusion pump leasing (comodato), "
            "(3) 159.1M vaccine cold chain maintenance/certification. "
            "The simultaneous use of force majeure DA for three unrelated specialized services "
            "on the same day suggests coordinated procurement fraud, not genuine emergencies. "
            "Additional 2025 contracts: 232.1M + 69M at SSISSSTE for peritoneal dialysis. "
            "Total vendor value: 964M MXN across 10 contracts, 100% DA. "
            "Pattern: force majeure abuse + same-day splitting + multi-category DA concentration."
        ),
        578_619_448,
        2024, 2025,
    ))
    print(f"Inserted case {case_402_id}: OPCIONES MEDICAS DE EQUIPAMIENTO")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_402_str, OPCIONES_MEDICAS_VENDOR_ID,
          "OPCIONES MEDICAS DE EQUIPAMIENTO SA DE CV", "medium", "aria_investigation"))

    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (OPCIONES_MEDICAS_VENDOR_ID,)).fetchall()
    tagged_402 = 0
    for row in rows:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
            (case_402_str, row[0])
        )
        tagged_402 += 1

    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=?
    """, (
        "OPCIONES MEDICAS DE EQUIPAMIENTO (214114): 578.6M in 3 force-majeure DA contracts "
        "on same day 2024-04-01 at ISEM: peritoneal dialysis + infusion pumps + vaccine cold chain. "
        "Force majeure abuse + same-day multi-category splitting. Plus 301M in 2025 SSISSSTE DA. "
        "NEEDS_REVIEW - Case 402.",
        OPCIONES_MEDICAS_VENDOR_ID
    ))
    print(f"  Tagged {tagged_402} contracts for OPCIONES MEDICAS")

    conn.commit()
    print("\nCommitted.")

    # ── Verification ─────────────────────────────────────────────────────────
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max}")
    print(f"Total GT vendors: {total_v}")
    print(f"Total GT contracts: {total_c}")

    for case_str in [case_401_str, case_402_str]:
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        name = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {name[:50]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 401-402 inserted.")


if __name__ == "__main__":
    run()
