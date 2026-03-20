"""
Batch U (T3 investigation): 2 new GT cases from ARIA T3 queue scan.

Investigated 6 vendors, 2 added, 4 skipped:

ADDED:
  Case max+1 (medium) - EDICION Y PUBLICIDAD DE MEDIOS DE LOS ESTADOS (176001)
      222M MXN, 211 contracts, 100% DA government advertising across 20+ institutions.
  Case max+2 (medium) - ULSA TECH SA DE CV (254088)
      1.17B MXN, 158 contracts, IMSS/ISSSTE/INSABI DA saturation with emergency justifications.

SKIPPED:
  - PLANMEDIA MEX (117773): Only 18 contracts, no institutional concentration.
  - CANER SEGURIDAD (45354): Diversified security services across 15+ institutions.
  - SONDA MEXICO (50918): Legitimate Chilean IT multinational, diversified government IT.
  - LEON WEILL (251): Legitimate energy supplier, 91% competitive, 2002-2014.

Guard: max_id must be >= 780.

Run from backend/ directory:
    python scripts/_aria_cases_batch_U.py
"""

import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"


SKIP_VENDORS = [
    {
        "vendor_id": 117773,
        "name": "PLANMEDIA MEX SA DE CV",
        "reason": (
            "Only 18 contracts, 372M MXN. Value driven by two single large contracts: "
            "CNH 119M (1 contract, 2017) and IFT 105M (1 contract, 2021, SB). "
            "No institution has more than 2 contracts. 50pct SB across 18 contracts "
            "is misleading - it is 9 single-bid wins at 9 different institutions "
            "(SEMARNAT, SFP, SADER, Bienestar, IFT, ISSFAM, CRE, CNH, BANCOMEXT). "
            "No institutional concentration pattern. Publishing/media sector."
        ),
    },
    {
        "vendor_id": 45354,
        "name": "CORPORATIVO CANER DE SEGURIDAD PRIVADA SA DE CV",
        "reason": (
            "Diversified security services company. 186 contracts, 283M MXN across "
            "15+ institutions. INAH 66M (12 contracts, 8pct SB), CAPUFE 42M (31 "
            "contracts, 39pct SB), INAPESCA 34M (3 contracts, 100pct SB but too few), "
            "INM 26M (9 contracts, 56pct DA). No single institution dominates - top "
            "institution ratio 23pct. SB rates moderate and distributed. Security "
            "services have naturally limited competition (licensed companies). "
            "No clear institutional capture pattern."
        ),
    },
    {
        "vendor_id": 50918,
        "name": "SONDA MEXICO SA DE CV",
        "reason": (
            "Sonda is a Chilean IT multinational (publicly traded, LSE/Santiago). "
            "26 contracts, 952M MXN across SAT (406M), ASA (181M), TELECOMM (133M), "
            "CONEVAL (120M), IFT (77M). 42pct DA, 35pct SB. Large IT infrastructure "
            "contracts normal for multinational system integrators. Diversified across "
            "government IT agencies. Legitimate multinational IT company."
        ),
    },
    {
        "vendor_id": 251,
        "name": "LEON WEILL SA DE CV",
        "reason": (
            "Energy sector industrial supplier. 474 contracts, 315M MXN across "
            "PEMEX EP (143M, 101 contracts), CFE (52M, 43 contracts), CINVESTAV "
            "(48M, 5 contracts), PEMEX Refinacion (22M, 67 contracts). 91pct "
            "competitive (Licitacion Publica). Only 9pct DA, 7pct SB. "
            "Activity 2002-2014, now inactive. Clearly legitimate diversified "
            "energy sector supplier."
        ),
    },
]


CASES = [
    {
        "offset": 0,
        "case_name": "Multi-Institution Government Advertising DA Monopoly - Edicion y Publicidad",
        "case_type": "institutional_capture",
        "confidence_level": "medium",
        "notes": (
            "EDICION Y PUBLICIDAD DE MEDIOS DE LOS ESTADOS S DE RL DE CV "
            "(vendor 176001) - 222M MXN in 211 contracts across 20+ federal "
            "institutions (2016-2025), every single one a direct award. "
            "44 contracts via patentes/licencias sole-source justification "
            "(56M). Largest clients: IMSS 79M (20 contracts), SEGOB 48M "
            "(31 contracts), Loteria Nacional 17M, FONACOT 13M, SSA 10M, "
            "ISSSTE 8M, INPI 5M, NAFIN 5M, SHCP 4M, GACM 4M. Steady "
            "annual volume: 69M (2019), 37M (2020), 22M (2021-2023), 26M "
            "(2024). 100pct DA for a media/publishing company across the "
            "entire federal government mirrors GIM Editorial pattern. "
            "Government advertising placement can be legitimately DA when "
            "tied to specific media outlets, but 211 contracts at 20+ "
            "agencies with no competitive tender ever is extreme and "
            "consistent with advertising intermediary capture."
        ),
        "estimated_fraud_mxn": 222_000_000,
        "year_start": 2016,
        "year_end": 2025,
        "vendors": [
            {"vendor_id": 176001, "evidence_strength": "medium",
             "match_method": "aria_queue_t3"}
        ],
    },
    {
        "offset": 1,
        "case_name": "Health Sector DA Saturation with Emergency Justifications - ULSA Tech",
        "case_type": "institutional_capture",
        "confidence_level": "medium",
        "notes": (
            "ULSA TECH SA DE CV (vendor 254088, RFC UTE140619UL8 - founded "
            "2014) - 1.17B MXN in 158 contracts (2019-2025), concentrated "
            "in health sector direct awards. IMSS 767M (16 contracts, 63pct "
            "DA), IMSS-Bienestar subsidiary 134M (38 contracts, 61pct DA), "
            "ISSSTE 126M (16 contracts, 56pct DA), INSABI 64M (9 contracts, "
            "67pct DA). Massive 2025 surge: 102 contracts and 776M in a "
            "single year - representing 66pct of all-time value. Procedure "
            "types include caso fortuito/fuerza mayor (170M, 41 contracts), "
            "urgencia y eventualidad (83M, 4 contracts), and adjudicacion "
            "directa (91M, 18 contracts). A company founded in 2014 "
            "receiving 1.17B almost entirely through DA and emergency "
            "justifications at IMSS/ISSSTE/INSABI is consistent with "
            "health sector procurement capture. The 2025 explosion to "
            "776M across 102 contracts through emergency channels at IMSS "
            "subsidiary is a strong signal."
        ),
        "estimated_fraud_mxn": 1_000_000_000,
        "year_start": 2019,
        "year_end": 2025,
        "vendors": [
            {"vendor_id": 254088, "evidence_strength": "medium",
             "match_method": "aria_queue_t3"}
        ],
    },
]


def main():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
    print(f"Current max GT case ID: {max_id}")
    if max_id < 780:
        print(f"ERROR: Expected max_id >= 780, got {max_id}. Aborting.")
        conn.close()
        sys.exit(1)

    next_id = max_id + 1
    n_cases = len(CASES)
    print(f"Will insert cases {next_id} to {next_id + n_cases - 1}")

    # --- Insert cases ---
    inserted_cases = 0
    for c in CASES:
        cid = next_id + c["offset"]
        case_id_str = f"CASE-{cid}"
        cur = conn.execute(
            """INSERT OR IGNORE INTO ground_truth_cases
               (id, case_id, case_name, case_type, confidence_level,
                source_news, notes, estimated_fraud_mxn, year_start, year_end)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (cid, case_id_str, c["case_name"], c["case_type"],
             c["confidence_level"], "ARIA T3 investigation",
             c["notes"], c["estimated_fraud_mxn"], c["year_start"], c["year_end"])
        )
        if cur.rowcount > 0:
            inserted_cases += 1
            print(f"  Inserted case {cid}: {c['case_name']}")
        else:
            print(f"  Skipped case {cid} (already exists)")

    # --- Insert vendors ---
    inserted_vendors = 0
    for c in CASES:
        cid = next_id + c["offset"]
        for v in c["vendors"]:
            vendor_name = conn.execute(
                "SELECT name FROM vendors WHERE id=?", (v["vendor_id"],)
            ).fetchone()[0]
            cur = conn.execute(
                """INSERT OR IGNORE INTO ground_truth_vendors
                   (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                   VALUES (?, ?, ?, ?, ?)""",
                (cid, v["vendor_id"], vendor_name,
                 v["evidence_strength"], v["match_method"])
            )
            if cur.rowcount > 0:
                inserted_vendors += 1
                print(f"    Vendor {v['vendor_id']} linked to case {cid}")

    # --- Tag ground_truth_contracts ---
    tagged = 0
    for c in CASES:
        cid = next_id + c["offset"]
        for v in c["vendors"]:
            rows = conn.execute(
                """SELECT id FROM contracts WHERE vendor_id = ?
                   AND contract_year >= ? AND contract_year <= ?""",
                (v["vendor_id"], c["year_start"], c["year_end"])
            ).fetchall()
            for (contract_id,) in rows:
                conn.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                    (cid, contract_id)
                )
            tagged += len(rows)
            print(f"    Tagged {len(rows)} contracts for vendor {v['vendor_id']} ({c['year_start']}-{c['year_end']})")

    # --- Update aria_queue for all investigated vendors ---
    added_vendor_ids = {176001, 254088}
    all_vendor_ids = [117773, 176001, 45354, 254088, 50918, 251]

    for vid in all_vendor_ids:
        if vid in added_vendor_ids:
            conn.execute(
                "UPDATE aria_queue SET in_ground_truth = 1, "
                "review_status = 'confirmed' WHERE vendor_id = ?",
                (vid,)
            )
            print(f"  aria_queue: vendor {vid} -> in_ground_truth=1, confirmed")
        else:
            reason = next(
                (s["reason"] for s in SKIP_VENDORS if s["vendor_id"] == vid),
                "Insufficient evidence"
            )
            conn.execute(
                "UPDATE aria_queue SET review_status = 'dismissed', "
                "reviewer_notes = ? WHERE vendor_id = ?",
                (f"Batch U skip: {reason[:500]}", vid)
            )
            print(f"  aria_queue: vendor {vid} -> dismissed")

    conn.commit()
    n_added = len(added_vendor_ids)
    n_skip = len(all_vendor_ids) - n_added
    print()
    print(f"Done: {inserted_cases} cases, {inserted_vendors} vendors, {tagged} contracts tagged")
    print(f"aria_queue: {len(all_vendor_ids)} vendors ({n_added} confirmed, {n_skip} dismissed)")
    conn.close()


if __name__ == "__main__":
    main()
