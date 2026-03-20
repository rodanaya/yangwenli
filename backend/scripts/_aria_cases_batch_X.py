"""
ARIA Cases Batch X: March 20, 2026 GT mining session.

6 vendors investigated, 3 added as GT cases, 3 skipped.
Run: python scripts/_aria_cases_batch_X.py
"""
import sys
import sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


CASES = [
    {
        "name": "CORP AUXILIAR DE POLICIA - Welfare Institution Security Capture",
        "case_type": "institutional_capture",
        "confidence": "medium",
        "notes": (
            "CORPORACION AUXILIAR DE POLICIA DE PROTECCION CIUDADANA (vendor_id=91072). "
            "Private security company. Clear temporal pattern: 2011-2018 small DA contracts "
            "at CFE/SCT (normal), then 2019-2025 massive single-bid surge at 4T-era welfare "
            "institutions. Banco del Bienestar: 131M, 3 contracts, 100% SB (2019-2020). "
            "Diconsa: 49M, 4 contracts, 100% SB (2019-2021). Alimentacion para el Bienestar: "
            "38M, 100% SB (2023-2025). SCT/SICT: 10M, 17 contracts, 100% SB (2019-2025). "
            "Pattern: zero competitive wins before 2019, then ALL competitive tenders won "
            "uncontested at multiple welfare institutions in the 4T administration."
        ),
        "fraud_mxn": 220_000_000,
        "y1": 2019, "y2": 2025,
        "source": "ARIA T3 investigation, vendor_id=91072, IPS=0.525",
        "vendors": [(91072, "CORPORACION AUXILIAR DE POLICIA DE PROTECCION CIUDADANA", "medium")],
        "vendor_id": 91072, "date_start": "2019-01-01", "date_end": None,
    },
    {
        "name": "BM MEXICANA DE COMERCIO - SPR Radiodifusion Single-Contract Intermediary",
        "case_type": "intermediary",
        "confidence": "medium",
        "notes": (
            "BM MEXICANA DE COMERCIO SA DE CV (vendor_id=130274). P3 intermediary pattern. "
            "Company appears only in 2014 with 2 contracts: one massive 410M MXN LP contract "
            "at Sistema Publico de Radiodifusion (100% SB, won uncontested), plus 436K at "
            "Metepec municipal government. No RFC. No activity before or after 2014. "
            "A company with no track record winning a 410M public broadcasting contract as "
            "the sole bidder is consistent with intermediary/shell patterns. "
            "P3 flag from ARIA confirms structural anomaly. 50% vendor concentration."
        ),
        "fraud_mxn": 410_000_000,
        "y1": 2014, "y2": 2014,
        "source": "ARIA T3 investigation, vendor_id=130274, IPS=0.524, P3 intermediary flag",
        "vendors": [(130274, "BM MEXICANA DE COMERCIO, S.A. DE C.V.", "medium")],
        "vendor_id": 130274, "date_start": None, "date_end": None,
    },
    {
        "name": "TECNO LOGICA MEXICANA - IMSS/DIF Medical Equipment DA Capture",
        "case_type": "institutional_capture",
        "confidence": "medium",
        "notes": (
            "TECNO LOGICA MEXICANA (vendor_id=43649). No RFC. Medical/rehab equipment and "
            "IT maintenance at IMSS, ISSSTE, and state DIF systems. "
            "IMSS (237M, 40 contracts, 22.5% DA): large DA - 85M maintenance (2020), "
            "73M DA (2017), 21M DA (2016). Wins small LP then large DA at same institution. "
            "DIF Guerrero (23M, 8 contracts, 100% DA, avg risk 0.735): bionic exoskeletons, "
            "therapeutic tank equipment, balance systems, speech therapy - all DA 2017-2018. "
            "DIF Jalisco (7M, risk 0.544). DIF Aguascalientes (3M, 67% SB, risk 0.423). "
            "Pattern: captures large DA contracts for specialized medical equipment while "
            "winning smaller LP contracts at same institutions. 43% concentration at IMSS. "
            "DIF Guerrero contracts score highest risk (0.735) - consistent with "
            "specification-tailored direct awards for overpriced medical devices."
        ),
        "fraud_mxn": 200_000_000,
        "y1": 2016, "y2": 2020,
        "source": "ARIA T3 investigation, vendor_id=43649, IPS=0.526",
        "vendors": [(43649, "TECNO LOGICA MEXICANA", "medium")],
        "vendor_id": 43649, "date_start": "2016-01-01", "date_end": "2020-12-31",
    },
]
CLEARED_VENDORS = [
    (72127, (
        "Structural FP: media/advertising sole-source. Government agencies purchase "
        "advertising placement from specific media outlets via DA - expected since "
        "only that outlet publishes its own content. Diversified across agencies, "
        "low concentration. Not procurement fraud."
    )),
    (46373, (
        "Structural FP: media/advertising sole-source. Government agencies purchase "
        "advertising placement from specific media outlets via DA - expected since "
        "only that outlet publishes its own content. Diversified across agencies, "
        "low concentration. Not procurement fraud."
    )),
    (15882, (
        "Legitimate pharma distributor. NADRO is one of Mexico top 3 pharmaceutical "
        "distributors (alongside Marzam and Maypo). 0% DA at main institutions (PEMEX, "
        "IMSS), 2% SB rate, wins via LP. Diversified across federal health institutions. "
        "No capture or intermediary pattern."
    )),
]


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")

    if max_id < 787:
        print(f"ERROR: Expected max_id >= 787, got {max_id}. Aborting.")
        conn.close()
        return

    next_id = max_id + 1

    for offset, case in enumerate(CASES):
        case_id = next_id + offset
        case_str = f"CASE-{case_id}"

        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes,
             estimated_fraud_mxn, year_start, year_end, source_news)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (
            case_id, case_str, case["name"], case["case_type"],
            case["confidence"], case["notes"], case["fraud_mxn"],
            case["y1"], case["y2"], case["source"]
        ))
        cname = case["name"][:60]
        print(f"Inserted case {case_id}: {cname}")

        for vid, vname, strength in case["vendors"]:
            conn.execute("""
                INSERT OR IGNORE INTO ground_truth_vendors
                (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                VALUES (?,?,?,?,?)
            """, (case_str, vid, vname, strength, "aria_investigation"))

        sql = "SELECT id FROM contracts WHERE vendor_id=?"
        params = [case["vendor_id"]]
        if case["date_start"]:
            sql += " AND contract_date >= ?"
            params.append(case["date_start"])
        if case["date_end"]:
            sql += " AND contract_date <= ?"
            params.append(case["date_end"])

        rows = conn.execute(sql, params).fetchall()
        for row in rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (case_str, row[0])
            )
        print(f"  Linked {len(rows)} contracts")

    gt_vids = []
    for case in CASES:
        for vid, _, _ in case["vendors"]:
            gt_vids.append(vid)
    for vid in gt_vids:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status=? WHERE vendor_id=?",
            ("confirmed", vid)
        )
        print(f"  aria_queue: vendor {vid} -> in_ground_truth=1, confirmed")

    for vid, note in CLEARED_VENDORS:
        conn.execute(
            "UPDATE aria_queue SET review_status=?, reviewer_notes=? WHERE vendor_id=?",
            ("cleared", note, vid)
        )
        print(f"  aria_queue: vendor {vid} -> cleared")

    conn.commit()

    final_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    print(f"Done. GT cases: {max_id} -> {final_max} (+{final_max - max_id})")
    print(f"Total GT vendors: {total_vendors}")

    conn.close()


if __name__ == "__main__":
    run()
