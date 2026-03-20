"""
ARIA Batch R: T3 vendor investigation — March 20, 2026.

7 vendors investigated. ALL SKIPPED — insufficient institutional capture signal.

Decisions:
  108831: ELMECA SA DE CV — SKIP (diversified education, 9% DA, no concentration)
  51457:  SERVICIOS INDUSTRIALES Y EMPRESARIALES — SKIP (spread across CFE/CONAGUA/ISSSTE/SADER, moderate rates)
  40886:  MCI MANTENIMIENTO CORPORATIVO — SKIP (25 contracts, too few, scattered)
  19792:  GRUPO PROTEC SA DE CV — SKIP (292M at CFE in only 4 contracts, no DA capture)
  137191: FUTUVER SA DE CV — SKIP (8 contracts total, single state govt contract = 85% of value)
  123151: GREEN MAMBA SERVICES — SKIP (82.6% SB at CONAGUA but only 24M there, cleaning services diversified across 8+ agencies)
  87158:  ALCOSE DEL CENTRO — SKIP (72.7% SB at ISSSTE but only 75M there, diversified facilities company across CONAFOR/ASA/CFE/FIRA)

No cases added. aria_queue updated to mark all 7 as reviewed.

Run from backend/ directory:
    python scripts/_aria_cases_batch_R.py
"""
import sys
import sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


SKIP_VENDORS = [
    {
        "vendor_id": 108831,
        "name": "ELMECA SA DE CV",
        "reason": (
            "Diversified education vendor. 204 contracts, 353M MXN across CONAFE, ISSSTE, AEFCM, IMSS. "
            "DA rate only 9%, SB only minimal. Top institution concentration 8%. "
            "Recent 2024-2025 contracts (166 of 204) are all competitive. No institutional capture pattern."
        ),
    },
    {
        "vendor_id": 51457,
        "name": "SERVICIOS INDUSTRIALES Y EMPRESARIALES DE LA LAGUNA",
        "reason": (
            "Agriculture/environment services spread across CFE, CONAGUA, ISSSTE, SADER, INIFAP. "
            "303 contracts, 261M MXN. 45% DA and 35% SB but distributed across 8+ institutions. "
            "Top institution ratio only 14%. 75% SB at ISSSTE is notable (12 contracts, 44M) "
            "but insufficient concentration. No single dominant institution."
        ),
    },
    {
        "vendor_id": 40886,
        "name": "MCI MANTENIMIENTO CORPORATIVO SA DE CV",
        "reason": (
            "Only 25 contracts total. 150M at CFE is large but only 3 contracts. "
            "47M at SEMARNAT (7 contracts, 42.9% SB). Too few contracts for reliable pattern. "
            "Activity ended in 2020. Insufficient evidence for minimum viable case."
        ),
    },
    {
        "vendor_id": 19792,
        "name": "GRUPO PROTEC, S.A. DE C.V.",
        "reason": (
            "63 contracts, 343M MXN. 293M at CFE but only 4 contracts (50% SB, 0% DA). "
            "39M at SAT (12 contracts, 50% SB). Concentration is high at CFE by value "
            "but contract count is too low (4). 40% overall SB is moderate. "
            "No clear institutional capture — bulk is a few large CFE infrastructure contracts."
        ),
    },
    {
        "vendor_id": 137191,
        "name": "FUTUVER SA DE CV",
        "reason": (
            "Only 8 contracts total. 224M is a single state government contract (Coahuila 2019). "
            "30M at PRODECON with 100% SB (2 contracts) is suspicious but too few contracts. "
            "62% DA is driven by 4 DA contracts at CDMX Consejeria Juridica (10M). "
            "Fails minimum viable case threshold — insufficient contract volume."
        ),
    },
    {
        "vendor_id": 123151,
        "name": "GREEN MAMBA SERVICES S DE RL DE CV",
        "reason": (
            "SRL-structure cleaning/facilities services company. 171 contracts, 408M MXN. "
            "82.6% SB at CONAGUA but only 24M concentrated there — below 200M threshold. "
            "53% SB at CAPUFE (125M, 17 contracts). 46% SB at CFE (59M, 48 contracts). "
            "High SB rates but diversified across 8+ agencies. Cleaning services sector "
            "has structurally limited competition (incumbency advantage for cleaning contracts). "
            "Pattern is consistent with a company that benefits from limited competition "
            "rather than active institutional capture."
        ),
    },
    {
        "vendor_id": 87158,
        "name": "ALCOSE DEL CENTRO SA DE CV",
        "reason": (
            "Diversified facilities management company. 429 contracts, 760M MXN across "
            "CONAFOR (99M, 66 contracts), ISSSTE (75M, 11 contracts), ASA (57M, 56 contracts), "
            "CFE (56M, 54 contracts), FIRA (150M, 8 contracts). "
            "72.7% SB at ISSSTE but only 75M — below 200M threshold. "
            "ISSSTE SB pattern 2016-2023 (8 consecutive SB wins, growing amounts 3.4M->13.7M) "
            "is notable but value is insufficient. CONAFOR only 22.7% SB. "
            "Top institution ratio 15%. Too diversified for institutional capture classification."
        ),
    },
]


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")

    if max_id < 775:
        print(f"ERROR: Expected max_id >= 775, got {max_id}. Aborting.")
        conn.close()
        return

    # No cases to add — all 7 vendors are skips

    # Update aria_queue review_status for all investigated vendors
    for v in SKIP_VENDORS:
        conn.execute(
            """UPDATE aria_queue
               SET review_status = 'reviewed',
                   reviewer_notes = ?
               WHERE vendor_id = ?""",
            (f"Batch R skip: {v['reason'][:500]}", v["vendor_id"]),
        )
        updated = conn.total_changes
        print(f"  aria_queue updated for {v['name'][:50]} (vendor_id={v['vendor_id']})")

    conn.commit()
    print(f"\nBatch R complete. 0 cases added, {len(SKIP_VENDORS)} vendors marked as reviewed.")
    conn.close()


if __name__ == "__main__":
    run()
