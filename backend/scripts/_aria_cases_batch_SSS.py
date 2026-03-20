"""
Batch SSS: DIDACTIC CITY SEDENA capture, CASA MARCHAND PROSPERA historical,
ABC UNIFORMES diversified institutional, INDUSTRIAL SOLUTIONS mixed pattern

Guard: max_id must be >= 829 (after batch LL: ZAGAL/INFRAEXT/TEGO)

Cases:
  c0 = max_id+1 : DIDACTIC CITY - SEDENA 89.6% concentration, low DA/SB (149 contracts, 219M)
  c1 = max_id+2 : CASA MARCHAND - PROSPERA 66.9% historical capture 2002-2014 (99 contracts, 521M)
  c2 = max_id+3 : ABC UNIFORMES - diversified COLPOSTEC/SNDIF/institutional (327 contracts, 268M)
  c3 = max_id+4 : INDUSTRIAL SOLUTIONS - INM/BANMEX mixed pattern (75 contracts, 345M)

Analysis:
  DIDACTIC CITY: SEDENA (military) 89.6% concentration, legitimate educational supplier
    → Low DA% (15.4%), Low SB% (14.1%), broad competition → SKIP legitimate supplier
  CASA MARCHAND: Historical PROSPERA (social program) 66.9%, pre-2014 cutoff, large contracts
    → 7 contracts to Prospera over 12 years, legitimate food/goods program supplier → SKIP
  ABC UNIFORMES: Diversified 327 contracts across 24 years, COLPOSTEC 60%, SNDIF 25%
    → 35.5% DA, legitimate apparel/uniform supplier, not concentrated capture → SKIP
  INDUSTRIAL SOLUTIONS: INM 47.7% (9 contracts), BANMEX 39.6% (20 contracts), 34.7% SB
    → Diversified pattern but 34.7% SB rate is concerning; mixed institutional
    → Medium confidence institutional capture pattern, small contract value pool
    → SB contracts to defense/agricultural agencies suggest intermediary role → ADD medium

Decisions:
  SKIP: DIDACTIC CITY (legitimate military supplier, low red flags)
  SKIP: CASA MARCHAND (historical pre-2014, legitimate social program supplier)
  SKIP: ABC UNIFORMES (diversified, legitimate apparel supplier, low concentration)
  ADD: INDUSTRIAL SOLUTIONS (34.7% SB, mixed institutions, intermediary pattern) — medium confidence
"""

import sqlite3, sys

DB = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 888:
    print(f"ABORT: max_id={max_id}, expected >= 829 (after batch LL)")
    sys.exit(1)

c0 = max_id + 1
print(f"max_id={max_id} -> case {c0}")

# Single case: INDUSTRIAL SOLUTIONS (42524)
cases = [
    (c0, f"CASE-{c0}", "Industrial Solutions INM/BANMEX Single Bid Intermediary",
     "single_bid_capture",
     "medium", 345_000_000,
     "https://compranet.hacienda.gob.mx",
     2009, 2024,
     "INDUSTRIAL SOLUTIONS DE MEXICO SA DE CV (v42524). "
     "75 contracts across INM (47.7%, 157M) and BANMEX (39.6%, 131M). "
     "34.7% single bid rate with 38.7% direct awards. Mixed institutional pattern "
     "suggests intermediary/services supplier winning competitive tenders with zero competition. "
     "Small avg contract value (4.6M) consistent with IT/services/facilities supply."),
]

vendors = [
    (c0, 42524, "INDUSTRIAL SOLUTIONS DE MEXICO SA DE CV", "medium", "name_match"),
]

# Insert cases and vendors
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

# Tag contracts for the case
industrial_ids = [r[0] for r in conn.execute(
    "SELECT id FROM contracts WHERE vendor_id=42524").fetchall()]

for cid in industrial_ids:
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
        (c0, cid)
    )

# Mark in aria_queue
conn.execute("""
    UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed'
    WHERE vendor_id=42524
""")

# Mark skips
skips = [
    (120811, "SKIP: DIDACTIC CITY — military supplier, 89.6% SEDENA concentration "
     "but low DA% (15.4%) and SB% (14.1%) indicate competitive sourcing. "
     "Legitimate educational equipment supplier."),
    (691, "SKIP: CASA MARCHAND — historical 2002-2014 PROSPERA social program supplier, "
     "66.9% concentration over 12 years with only 7 major contracts. "
     "Legitimate food/goods vendor, pre-modern procurement era."),
    (43566, "SKIP: ABC UNIFORMES — diversified apparel supplier, 327 contracts over 24 years "
     "across 24+ institutions. 59.9% COLPOSTEC, 25.2% SNDIF, 8.4% CAMINOS. "
     "35.5% DA rate normal for apparel. Legitimate broad-based supplier."),
]

for vid, reason in skips:
    conn.execute("""
        UPDATE aria_queue SET review_status='reviewed', reviewer_notes=?
        WHERE vendor_id=?
    """, (reason, vid))

conn.commit()
conn.close()

print(f"Done.")
print(f"  Case {c0} INDUSTRIAL SOLUTIONS: {len(industrial_ids)} contracts tagged")
print(f"  SKIPs: DIDACTIC CITY (v120811), CASA MARCHAND (v691), ABC UNIFORMES (v43566)")
