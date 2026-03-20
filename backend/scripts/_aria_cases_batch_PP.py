"""
Batch PP: PEMEX intermediary, CONAVI/INDEP single-bid, Veracruz infra SB, IEPSA transport mismatch.
Guard: max_id >= 834
"""
import sqlite3
import sys

DB = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"

def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id < 834:
        print(f"ABORT: max_id={max_id}, expected >= 834")
        sys.exit(1)

    c0 = max_id + 1  # Comercializadora Petrolera del Golfo - PEMEX intermediary
    c1 = max_id + 2  # Corporativo de Promociones DOEX - CONAVI/INDEP single-bid
    c2 = max_id + 3  # Azteca e Infraestructura - Veracruz SB capture
    c3 = max_id + 4  # Autotransportes Nieto Acosta - IEPSA transport mismatch

    print(f"Inserting cases {c0}-{c3} (max_id was {max_id})")

    # ---- CASES ----
    cases = [
        (c0, f"CASE-{c0}",
         "PEMEX Comercializadora Petrolera del Golfo intermediary",
         "intermediary_capture", 2010, 2014, 310_000_000,
         "medium",
         "78% DA at PEMEX Corporativo, 100% single-institution concentration, "
         "petroleum trading shell active 2010-2014 then disappeared"),

        (c1, f"CASE-{c1}",
         "CONAVI/INDEP Corporativo DOEX single-bid capture",
         "single_bid_capture", 2016, 2019, 480_000_000,
         "medium",
         "80% single-bid rate, 3 identical 43.1M contracts at CONAVI, "
         "392.5M single-bid at INDEP, P3 intermediary pattern"),

        (c2, f"CASE-{c2}",
         "Azteca Infraestructura Veracruz single-bid network",
         "single_bid_intermediary", 2016, 2020, 237_000_000,
         "medium",
         "75% single-bid across 6 institutions, geographic capture in Veracruz "
         "(municipal gov, state infra, fiscalia) plus federal (ISSSTE, CAPUFE, FONATUR)"),

        (c3, f"CASE-{c3}",
         "IEPSA Autotransportes Nieto Acosta industry mismatch",
         "intermediary_capture", 2014, 2016, 218_000_000,
         "medium",
         "Transport company winning 218M at printing parastatal IEPSA, "
         "100% single-institution, 50% DA + 50% SB, two identical 80M contracts"),
    ]

    for row in cases:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, year_start, year_end,
             estimated_fraud_mxn, confidence_level, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, row)

    # ---- VENDORS ----
    vendors = [
        # case_id (INT), vendor_id, vendor_name_source, role, evidence_strength, match_method, match_confidence, notes
        (c0, 54863, "COMERCIALIZADORA PETROLERA DEL GOLFO",
         "primary", "medium", "aria_queue", 0.85,
         "78% DA at PEMEX, 9 contracts 382M, single institution capture 2010-2014"),

        (c1, 181681, "CORPORATIVO DE PROMOCIONES DOEX SA DE CV",
         "primary", "medium", "aria_queue", 0.85,
         "80% SB rate, identical 43.1M CONAVI contracts, 392M INDEP single-bid"),

        (c2, 176200, "AZTECA E INFRAESTRUCTURA DE MEXICO SA DE CV",
         "primary", "medium", "aria_queue", 0.80,
         "75% SB across Veracruz entities + federal, geographic capture pattern"),

        (c3, 144525, "AUTOTRANSPORTES NIETO ACOSTA SA DE CV",
         "primary", "medium", "aria_queue", 0.85,
         "Transport co at printing parastatal, 100% capture, industry mismatch"),
    ]

    for row in vendors:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, role,
             evidence_strength, match_method, match_confidence, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, row)

    # ---- UPDATE ARIA QUEUE ----
    vendor_ids = [54863, 181681, 176200, 144525]
    for vid in vendor_ids:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth = 1 WHERE vendor_id = ?",
            (vid,)
        )

    conn.commit()

    # Verify
    for cid in [c0, c1, c2, c3]:
        row = conn.execute(
            "SELECT id, case_name, confidence_level FROM ground_truth_cases WHERE id=?",
            (cid,)
        ).fetchone()
        vcount = conn.execute(
            "SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?",
            (cid,)
        ).fetchone()[0]
        print(f"  Case {row[0]}: {row[1]} [{row[2]}] -> {vcount} vendor(s)")

    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    print(f"\nDone. Cases: {max_id} -> {new_max}. Total GT vendors: {total_vendors}")
    conn.close()

if __name__ == "__main__":
    main()
