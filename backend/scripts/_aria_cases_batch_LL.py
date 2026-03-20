"""
Batch LL: ZAGAL IMSS DA saturation, INFRAEXT SCT single-bid, TEGO 100% SB judiciary
Guard: max_id must be >= 829 (after KK)

Cases:
  c0 = max_id+1 : ZAGAL - IMSS direct award saturation (595 contracts, 322M, 94% DA)
  c1 = max_id+2 : INFRAEXT - SCT infrastructure single bid (60 contracts, 669M, 58% SB)
  c2 = max_id+3 : TEGO - 100% single bid incl 484M Oaxaca judiciary (4 contracts, 531M)

Skips:
  TECMAC (v4351): legitimate machinery supplier 2002-2014, only 4% SB / 7% DA — SKIP
"""
import sqlite3, sys

DB = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 829:
    print(f"ABORT: max_id={max_id}, expected >= 829")
    sys.exit(1)

c0, c1, c2 = max_id + 1, max_id + 2, max_id + 3
print(f"max_id={max_id} -> cases {c0}, {c1}, {c2}")

cases = [
    (c0, f"CASE-{c0}", "ZAGAL IMSS Direct Award Saturation", "direct_award_abuse",
     "medium", 322_000_000,
     "https://compranet.hacienda.gob.mx",
     2016, 2025,
     "COMERCIALIZADORA DE MULTIPLES PRODUCTOS ZAGAL SA DE CV (v183321). "
     "595 contracts to IMSS/ISSSTE, 94% direct award, classified as 'multiple products' intermediary. "
     "Sustained 9-year DA saturation pattern on federal health institutions."),
    (c1, f"CASE-{c1}", "INFRAEXT SCT Infrastructure Single Bid Capture", "single_bid_capture",
     "medium", 669_000_000,
     "https://compranet.hacienda.gob.mx",
     2013, 2018,
     "INFRAEXT DE MEXICO SA DE CV (v102693). "
     "60 contracts across SCT (468M), CONAPESCA, CONAGUA and Nayarit roads. "
     "58% single bid rate on federal infrastructure — SCT primary client."),
    (c2, f"CASE-{c2}", "TEGO 100% Single Bid State Judiciary and Energy", "single_bid_capture",
     "high", 531_000_000,
     "https://compranet.hacienda.gob.mx",
     2015, 2016,
     "CONSTRUCTORA TEGO SA DE CV (v162140). "
     "4 contracts, 100% single bid. Flagship: 484.5M to Oaxaca Poder Judicial — "
     "construction/services to state judiciary with zero competition. Also CFE and SCT."),
]

vendors = [
    (c0, 183321, "COMERCIALIZADORA DE MULTIPLES PRODUCTOS ZAGAL SA DE CV", "high", "name_match"),
    (c1, 102693, "INFRAEXT DE MEXICO SA DE CV", "medium", "name_match"),
    (c2, 162140, "CONSTRUCTORA TEGO SA DE CV", "high", "name_match"),
]

conn.executemany("""
INSERT OR IGNORE INTO ground_truth_cases
  (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
   source_news, year_start, year_end, notes)
VALUES (?,?,?,?,?,?,?,?,?,?)
""", cases)

conn.executemany("""
INSERT OR IGNORE INTO ground_truth_vendors
  (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
VALUES (?,?,?,?,?)
""", vendors)

# Tag contracts
zagal_ids = [r[0] for r in conn.execute(
    "SELECT id FROM contracts WHERE vendor_id=183321").fetchall()]
infraext_ids = [r[0] for r in conn.execute(
    "SELECT id FROM contracts WHERE vendor_id=102693").fetchall()]
tego_ids = [r[0] for r in conn.execute(
    "SELECT id FROM contracts WHERE vendor_id=162140").fetchall()]

for case_id_str, ids in [
    (f"CASE-{c0}", zagal_ids),
    (f"CASE-{c1}", infraext_ids),
    (f"CASE-{c2}", tego_ids),
]:
    conn.executemany(
        "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
        [(case_id_str, cid) for cid in ids]
    )

# Mark in aria_queue
for vid in [183321, 102693, 162140]:
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed'
        WHERE vendor_id=?
    """, (vid,))

# Mark TECMAC skip
conn.execute("""
    UPDATE aria_queue SET review_status='reviewed',
    reviewer_notes='SKIP: legitimate machinery supplier 2002-2014, 534 contracts, only 4% SB / 7% DA — structural competitive supplier'
    WHERE vendor_id=4351
""")

conn.commit()
conn.close()
print(f"Done. Cases {c0}-{c2} inserted.")
print(f"  {c0} ZAGAL: {len(zagal_ids)} contracts")
print(f"  {c1} INFRAEXT: {len(infraext_ids)} contracts")
print(f"  {c2} TEGO: {len(tego_ids)} contracts")
print(f"  SKIP: TECMAC (v4351) — structural skip")
