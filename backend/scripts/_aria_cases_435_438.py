"""
ARIA Cases 435-438: March 17 2026 investigation session.

Cases:
  435: SERPROSEP + HIDALGO VIGUERAS - security services bid-rigging ring (3.19B+4.26B)
  436: CORPORATIVO EJECUTIVO MZT - outsourcing shell, 11 unrelated institutions (1.09B)
  437: GRUPO IMPULSOR PAJEME - CONAGUA institutional capture, 11/11 SB, no RFC (2.69B)
  438: LIMPIEZA JORED - cleaning ring linked to GT Case 228 LAMAP/ARMOT (1.43B)

Also: FP markings + needs_review updates.

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    # ── Case 435: SERPROSEP + HIDALGO VIGUERAS bid-rigging ring ──────────────
    case_435_id = next_id
    case_435_str = f"CASE-{case_435_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_435_id, case_435_str,
        "SERPROSEP + HIDALGO VIGUERAS - Security Services Bid-Rigging Ring",
        "procurement_fraud",
        "high",
        (
            "Classic cover-bidding ring in security/vigilance services sector. "
            "SERPROSEP SA DE CV (vendor_id=269157): RFC formed January 2019, achieved 3.19B MXN "
            "across 85 contracts by 2025 — 69x growth in 4 years. 49 of 85 contracts single-bid (58%). "
            "Serves ISSSTE (688M), AICM airport (431M), AEFCM schools (400M), IPN (358M), "
            "Secretaria de Salud (265M), and 10+ other institutions. "
            "HIDALGO VIGUERAS CONSULTORES SA DE CV (vendor_id=196120): 176 shared competitive "
            "procedures with SERPROSEP across multiple institutions, 4.26B total value, no RFC. "
            "HIDALGO VIGUERAS pattern: participates in procedures to create appearance of competition "
            "but consistently loses to SERPROSEP — textbook cover bidder. "
            "The pair dominates security/vigilance services procurement: SERPROSEP wins, "
            "HIDALGO VIGUERAS provides cover. 176 shared procedures is statistically impossible "
            "by chance and confirms coordinated bid rotation. "
            "Combined ring value: 3.19B (SERPROSEP) + 4.26B (HIDALGO VIGUERAS) = 7.45B MXN."
        ),
        7_450_000_000,
        2019, 2025,
    ))
    print(f"Inserted case {case_435_id}: SERPROSEP + HIDALGO VIGUERAS ring")

    for vid, vname, strength in [
        (269157, "SERPROSEP SA DE CV", "high"),
        (196120, "HIDALGO VIGUERAS CONSULTORES SA DE CV", "high"),
    ]:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)
        """, (case_435_str, vid, vname, strength, "aria_investigation"))
        rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
        for row in rows:
            conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                         (case_435_str, row[0]))
        conn.execute("""
            UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
            WHERE vendor_id=?
        """, (
            f"Security bid-rigging ring (Case {case_435_id}): SERPROSEP+HIDALGO VIGUERAS, "
            f"176 shared procedures, 58% SB rate, 7.45B combined.",
            vid
        ))
        n = conn.execute("SELECT COUNT(*) FROM contracts WHERE vendor_id=?", (vid,)).fetchone()[0]
        print(f"  Tagged {n} contracts for vendor {vid}")

    # ── Case 436: CORPORATIVO EJECUTIVO MZT ──────────────────────────────────
    case_436_id = next_id + 1
    case_436_str = f"CASE-{case_436_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_436_id, case_436_str,
        "CORPORATIVO EJECUTIVO MZT - Outsourcing Shell Company 11 Unrelated Institutions",
        "ghost_company",
        "high",
        (
            "Classic post-2017 outsourcing reform evasion shell. RFC formed November 2017 in Mazatlan, "
            "Sinaloa. Contracts 2019-2022, then completely disappears — 5-year lifecycle typical of "
            "procurement shells. 1.09B MXN across 11 contracts. "
            "73% single-bid rate (8/11 contracts won without competition). "
            "Service: generic 'servicios especializados con terceros' and 'administracion de recursos "
            "humanos y pago de honorarios' — outsourced staff/payroll services for government agencies. "
            "11 completely unrelated institutions: CONAGUA, SEP, CONAVI, UnADM (virtual university), "
            "CENAGAS (gas), COFEPRIS (health regulation), NAFIN (development bank), CIATEQ (research), "
            "INCAN (cancer hospital), ASA (airports), others. "
            "No conceivable domain expertise that would qualify a Mazatlan company for staff "
            "outsourcing simultaneously at a gas company, cancer hospital, airport authority, "
            "and virtual university. "
            "268M at CONAGUA for 'servicios especializados diversas areas' + 268M at SEP + 263M CONAVI. "
            "All contracts 'P3 intermediary' pattern — shell positioned between government and real labor."
        ),
        1_085_000_000,
        2019, 2022,
    ))
    print(f"Inserted case {case_436_id}: CORPORATIVO EJECUTIVO MZT")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_436_str, 258476, "CORPORATIVO EJECUTIVO MZT SA DE CV", "high", "aria_investigation"))

    rows_436 = conn.execute("SELECT id FROM contracts WHERE vendor_id=258476").fetchall()
    for row in rows_436:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_436_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=258476
    """, (f"Outsourcing shell (Case {case_436_id}): Mazatlan 2017, 1.09B across 11 unrelated "
          f"institutions (CONAGUA+SEP+CONAVI+NAFIN...), 73% SB, disappeared 2022.",))
    print(f"  Tagged {len(rows_436)} contracts for CORPORATIVO EJECUTIVO MZT")

    # ── Case 437: GRUPO IMPULSOR PAJEME ──────────────────────────────────────
    case_437_id = next_id + 2
    case_437_str = f"CASE-{case_437_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_437_id, case_437_str,
        "GRUPO IMPULSOR PAJEME - CONAGUA Water Infrastructure Institutional Capture",
        "procurement_fraud",
        "high",
        (
            "Extreme institutional capture at CONAGUA (Comision Nacional del Agua). "
            "No RFC registered despite 2.69B MXN in contracts — a company receiving this scale "
            "of government contracts should have full RFC coverage. "
            "11 of 11 CONAGUA contracts won as sole bidder (100% single-bid at CONAGUA). "
            "90% of total value from CONAGUA (2.43B of 2.69B). "
            "Explosive growth: 262M in 2014-2021 (7 years) to 2.43B in 2023-2025 (3 years) — "
            "9x surge coinciding with major federal water infrastructure investment. "
            "Key projects: 'Acueducto Coatzacoalcos' 1.24B, 'Agua Saludable para La Laguna' "
            "multiple contracts — La Laguna project has been reported by ASF (Auditoría Superior) "
            "as having procurement irregularities. "
            "Pattern: monopolized CONAGUA construction contracts through 2023-2025 boom, "
            "winning every competitive procedure at the institution without any real competition. "
            "Name 'PAJEME' likely references the Cajeme/Yaqui valley irrigation district "
            "(CONAGUA operational zone), suggesting insider institutional connections."
        ),
        2_430_000_000,
        2014, 2025,
    ))
    print(f"Inserted case {case_437_id}: GRUPO IMPULSOR PAJEME CONAGUA capture")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_437_str, 147578, "GRUPO IMPULSOR PAJEME SA DE CV", "high", "aria_investigation"))

    rows_437 = conn.execute("SELECT id FROM contracts WHERE vendor_id=147578").fetchall()
    for row in rows_437:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_437_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=147578
    """, (f"CONAGUA capture (Case {case_437_id}): No RFC, 11/11 CONAGUA contracts single-bid, "
          f"2.43B water infrastructure. Agua Saludable La Laguna.",))
    print(f"  Tagged {len(rows_437)} contracts for PAJEME")

    # ── Case 438: LIMPIEZA JORED ──────────────────────────────────────────────
    case_438_id = next_id + 3
    case_438_str = f"CASE-{case_438_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_438_id, case_438_str,
        "LIMPIEZA JORED - Cleaning Services Ring Linked to LAMAP/ARMOT (Case 228)",
        "procurement_fraud",
        "medium",
        (
            "Cleaning services company in a bid-rigging network connected to GT Case 228 "
            "(LAMAP + ARMOT, confirmed corrupt IMSS cleaning shells). "
            "RFC formed January 2017; co-bidder ACHES LIMPIEZA formed September 2017 — temporal "
            "clustering of ring members. 141 contracts, 1.43B MXN (2021-2025). "
            "77 of 141 contracts single-bid (55%). 2025 surge: 944M in single IMSS-BIENESTAR "
            "cleaning contract, total 2025 value 1.13B vs 197M in all prior years. "
            "168 shared competitive procedures with MAC TABASCO SA DE CV (no RFC, 148M) — "
            "cover bidder pattern. Direct co-bidding links to LAMAP and ARMOT (GT Case 228, "
            "confirmed corrupt). Institutional concentration: IMSS-BIENESTAR, Secretaria de Cultura, "
            "INBAL (National Arts institution). "
            "Confidence medium pending verification of MAC TABASCO relationship and whether "
            "944M IMSS-BIENESTAR contract followed competitive or non-competitive award process."
        ),
        1_429_000_000,
        2021, 2025,
    ))
    print(f"Inserted case {case_438_id}: LIMPIEZA JORED cleaning ring")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_438_str, 266729, "LIMPIEZA JORED SA DE CV", "medium", "aria_investigation"))

    rows_438 = conn.execute("SELECT id FROM contracts WHERE vendor_id=266729").fetchall()
    for row in rows_438:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_438_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=266729
    """, (f"Cleaning ring (Case {case_438_id}): 168 shared procs with MAC TABASCO, co-bids with "
          f"LAMAP/ARMOT (Case 228), 55% SB, 944M IMSS-BIENESTAR 2025.",))
    print(f"  Tagged {len(rows_438)} contracts for LIMPIEZA JORED")

    # ── False positives ───────────────────────────────────────────────────────
    fps = {
        253199: ("fp_structural_monopoly", "Legitimate ballistic armor/tactical gear for Guardia Nacional, SEDENA. 0% DA, real competition (EMPROTEX, AVACOR). Name misleading."),
        290355: ("fp_structural_monopoly", "Yutong de Mexico — subsidiary of Yutong Group (world's largest bus manufacturer). Single trolleybus contract for Mexico City. Risk artifact of single-contract concentration."),
        257624: ("fp_structural_monopoly", "MEDICA TEYCO: Pharma distributor in IMSS consolidated purchases with 144-171 competing vendors per procedure. Standard multi-vendor bidding."),
    }
    for vid, (fp_col, note) in fps.items():
        conn.execute(f"""
            UPDATE aria_queue SET {fp_col}=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))
    print(f"Marked {len(fps)} false positives")

    # needs_review
    conn.execute("""
        UPDATE aria_queue SET review_status='needs_review',
        memo_text='BROXEL fintech: 3.08B digital vouchers/e-wallets across 263 contracts. 44% SB. Same oligopoly pattern as TOKA (Case 12) + Edenred (Case 15). Structural market capture in government digital payments. needs_review.'
        WHERE vendor_id=147453
    """)

    conn.commit()
    print("\nCommitted.")

    # ── Verification ─────────────────────────────────────────────────────────
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max} | GT vendors: {total_v} | GT contracts: {total_c}")

    for case_str in [case_435_str, case_436_str, case_437_str, case_438_str]:
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        name = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {name[:55]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 435-438 inserted.")


if __name__ == "__main__":
    run()
