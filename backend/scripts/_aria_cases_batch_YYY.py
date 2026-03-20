"""
Batch YYY: v169633 CAMINOS DA capture, v8963 CENAGAS/PEMEX single-bid
Guard: max_id must be >= 828 (after LL)

Cases to ADD:
  c0 = max_id+1 : v169633 - PROYECTOS INFORMATICOS federal roads DA saturation (14 contracts, 1.82B, 71% DA)
  c1 = max_id+2 : v8963 - CONSULTORIA OBRA energy single-bid (46 contracts, 1.89B, 93.5% SB)

Skips:
  v27424 TRANSPORTES INTERNACIONALES: pre-2010 PEMEX, weak data period, diversified
  v58096 DISENO MEDICO: legitimate medical device supplier, 26 health institutions
"""
import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

DB = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id is None or max_id < 828:
    print(f"ERROR: max_id={max_id}, expected >= 828")
    sys.exit(1)

c0, c1 = max_id + 1, max_id + 2
print(f"max_id={max_id} -> cases {c0}, {c1}")

cases = [
    (c0, f"CASE-{c0}", "PROYECTOS INFORMATICOS Federal Roads DA Capture", "institutional_capture",
     "medium", 1_823_000_000,
     "https://compranet.hacienda.gob.mx",
     2015, 2021,
     "PROYECTOS Y SISTEMAS INFORMATICOS SA DE CV (v169633). "
     "14 contracts to CAMINOS Y PUENTES FEDERALES DE INGRESOS Y SERVICIOS (federal highways). "
     "71.4% direct award rate on single institution over 6-year period. "
     "Institutional capture: 100% concentration on one federal agency with sustained DA saturation."),
    (c1, f"CASE-{c1}", "CONSULTORIA OBRA CENAGAS/PEMEX Single-Bid Capture", "single_bid_capture",
     "high", 1_891_000_000,
     "https://compranet.hacienda.gob.mx",
     2002, 2025,
     "CONSULTORIA EN OBRA SA DE CV (v8963). "
     "46 contracts across energy/infrastructure sector, 93.5% single-bid rate. "
     "CENAGAS: 4 contracts (1.41B, 100% SB). PEMEX variants, Tamaulipas municipalities. "
     "Sustained single-bid procurement across multiple energy/infrastructure institutions over 23 years.")
]

print(f"Inserting {len(cases)} cases...")
for case_tuple in cases:
    case_id, case_id_str, name, case_type, confidence, fraud_est, url, yr_start, yr_end, notes = case_tuple
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, source_news, year_start, year_end, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (case_id, case_id_str, name, case_type, confidence, fraud_est, url, yr_start, yr_end, notes)
    )
    print(f"  [CASE-{case_id}] {name}")

# Case 0: v169633 PROYECTOS INFORMATICOS
print("Linking case_id=%d to v169633..." % c0)
conn.execute(
    "INSERT OR IGNORE INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
    "VALUES (?, ?, ?, ?, ?)",
    (c0, 169633, "PROYECTOS Y SISTEMAS INFORMATICOS SA DE CV", "high", "vendor_id_direct_match")
)

contracts_added = conn.execute(
    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) "
    "SELECT ?, id FROM contracts WHERE vendor_id = ?",
    (c0, 169633)
).rowcount
print(f"  Added {contracts_added} contracts to case {c0}")

conn.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?", (169633,))
print(f"  Updated aria_queue for v169633")

# Case 1: v8963 CONSULTORIA OBRA
print("Linking case_id=%d to v8963..." % c1)
conn.execute(
    "INSERT OR IGNORE INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
    "VALUES (?, ?, ?, ?, ?)",
    (c1, 8963, "CONSULTORIA EN OBRA SA DE CV", "high", "vendor_id_direct_match")
)

contracts_added = conn.execute(
    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) "
    "SELECT ?, id FROM contracts WHERE vendor_id = ?",
    (c1, 8963)
).rowcount
print(f"  Added {contracts_added} contracts to case {c1}")

conn.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?", (8963,))
print(f"  Updated aria_queue for v8963")

# Skip v27424
print("Skipping v27424 (pre-2010 PEMEX transport, weak period)...")
conn.execute(
    "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
    ("Pre-2010 PEMEX activity in weak RFC coverage period, diversified across 3 institutions, legitimate transport sector", 27424)
)

# Skip v58096
print("Skipping v58096 (legitimate medical device supplier)...")
conn.execute(
    "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
    ("Medical device/design supplier serving 26 health institutions including IMSS, INER, INP, INC — structural medical niche, not corruption pattern", 58096)
)

conn.commit()
print("Done.")
