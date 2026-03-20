"""
Batch MM: PHOENIX pharma single-bid, ARYVE Tamaulipas construction SB
Guard: max_id must be >= 829 (after KK); run AFTER LL

Cases:
  c0 = max_id+1 : PHOENIX - 520M single-bid pharma to Oaxaca state health
  c1 = max_id+2 : ARYVE - 430M SB to Tamaulipas Obras Publicas + IMSS

Skips:
  TECMAC handled in LL script
"""
import sqlite3, sys

DB = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 829:
    print(f"ABORT: max_id={max_id}, expected >= 829 (run after KK)")
    sys.exit(1)

c0, c1 = max_id + 1, max_id + 2
print(f"max_id={max_id} -> cases {c0}, {c1}")

cases = [
    (c0, f"CASE-{c0}", "PHOENIX FARMACEUTICA Oaxaca Single Bid Pharma", "single_bid_capture",
     "high", 520_000_000,
     "https://compranet.hacienda.gob.mx",
     2012, 2014,
     "PHOENIX FARMACEUTICA SA DE CV (v67554). "
     "Single contract 520M to Servicios de Salud de Oaxaca — 100% single bid. "
     "Pharma company with no prior history winning a massive uncontested state health contract."),
    (c1, f"CASE-{c1}", "ARYVE Tamaulipas Construction Single Bid Capture", "single_bid_capture",
     "medium", 680_000_000,
     "https://compranet.hacienda.gob.mx",
     2013, 2022,
     "CONSTRUCCIONES ARYVE SA DE CV (v102564). "
     "27 contracts, 56% single bid. Primary: 430M 100% SB to Tamaulipas Obras Publicas. "
     "Also 131M to IMSS at 50% SB. Cross-state construction capture pattern."),
]

vendors = [
    (c0, 67554, "PHOENIX FARMACEUTICA SA DE CV", "high", "name_match"),
    (c1, 102564, "CONSTRUCCIONES ARYVE SA DE CV", "medium", "name_match"),
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

# Tag contracts — PHOENIX: only the 520M Oaxaca contract (444609)
conn.executemany(
    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
    [(f"CASE-{c0}", 444609)]
)

aryve_ids = [r[0] for r in conn.execute(
    "SELECT id FROM contracts WHERE vendor_id=102564").fetchall()]
conn.executemany(
    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
    [(f"CASE-{c1}", cid) for cid in aryve_ids]
)

# Mark in aria_queue
for vid in [67554, 102564]:
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed'
        WHERE vendor_id=?
    """, (vid,))

conn.commit()
conn.close()
print(f"Done. Cases {c0}-{c1} inserted.")
print(f"  {c0} PHOENIX: 1 contract tagged (520M Oaxaca health)")
print(f"  {c1} ARYVE: {len(aryve_ids)} contracts tagged")
