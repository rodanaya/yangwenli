"""Batch OO: SYNCOM CFE capture (P6), FARMACON NAFIN capture (P6).
Skipped: AGREGADOS EN SERVICIO (only 2 contracts), INSTITUTO BIOCLON (structural specialty pharma).
Guard: max_id >= 834
"""
import sqlite3, sys

DB = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

max_id = cur.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 834:
    print(f"ABORT: max_id={max_id}, expected >= 834")
    sys.exit(1)

c0 = max_id + 1  # SYNCOM CFE capture
c1 = max_id + 2  # FARMACON NAFIN capture

print(f"Inserting cases {c0}-{c1} (max_id was {max_id})")

# --- Case c0: SYNCOM INTERNATIONAL CFE capture ---
# 290 contracts at CFE (231M MXN), DA% jumped from 0% (2005-2009) to 65-77% (2010-2013)
# 85% of total value concentrated at CFE
# Competitive elsewhere (SEDENA, PEMEX) -> institution-specific capture
cur.execute("""INSERT OR IGNORE INTO ground_truth_cases
    (id, case_id, case_name, case_type, confidence_level, year_start, year_end,
     estimated_fraud_mxn, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
    (c0, f'CASE-{c0}', 'SYNCOM International CFE Capture',
     'institutional_capture', 'medium', 2010, 2017,
     130000000,
     'SYNCOM INTERNATIONAL SA DE CV - 85% of 265M MXN concentrated at CFE. '
     'DA rate jumped from 0% (2005-2009) to 65-77% (2010-2013). '
     'Competitive at SEDENA and PEMEX -> institution-specific capture at CFE. '
     'P6 capture pattern, IPS=0.512, T3.'))

cur.execute("""INSERT OR IGNORE INTO ground_truth_vendors
    (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
    VALUES (?, ?, ?, ?, ?)""",
    (c0, 15385, 'SYNCOM INTERNATIONAL, S.A. DE C.V.', 'medium', 'aria_queue'))

# --- Case c1: FARMACON NAFIN capture ---
# 86 contracts at NAFIN (162M MXN), 85% DA overall, 100% DA 2019-2021
# 94.6% of value at single institution
# NAFIN classified as Salud is anomalous for a financial institution
cur.execute("""INSERT OR IGNORE INTO ground_truth_cases
    (id, case_id, case_name, case_type, confidence_level, year_start, year_end,
     estimated_fraud_mxn, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
    (c1, f'CASE-{c1}', 'FARMACON NAFIN Institutional Capture',
     'institutional_capture', 'medium', 2018, 2021,
     162000000,
     'FARMACON SA DE CV - 94.6% of 256M MXN concentrated at Nacional Financiera (NAFIN). '
     'DA rate escalated from 46% (2018) to 100% (2019-2021). '
     'Pharma company at a development bank is anomalous sector match. '
     'Also has 92M competitive at Univ Autonoma Yucatan -> institution-specific capture. '
     'P6 capture pattern, IPS=0.505, T3.'))

cur.execute("""INSERT OR IGNORE INTO ground_truth_vendors
    (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
    VALUES (?, ?, ?, ?, ?)""",
    (c1, 107930, 'FARMACON, S.A. DE C.V.', 'medium', 'aria_queue'))

# --- Update aria_queue ---
cur.execute("UPDATE aria_queue SET in_ground_truth = 1 WHERE vendor_id IN (15385, 107930)")

conn.commit()

# Verify
added = cur.execute("SELECT id, case_name, confidence_level FROM ground_truth_cases WHERE id IN (?,?)",
                     (c0, c1)).fetchall()
for r in added:
    print(f"  Case {r[0]}: {r[1]} [{r[2]}]")

vendors = cur.execute("SELECT case_id, vendor_id FROM ground_truth_vendors WHERE vendor_id IN (15385, 107930)").fetchall()
for r in vendors:
    print(f"  GT vendor: case_id={r[0]}, vendor_id={r[1]}")

aq = cur.execute("SELECT vendor_id, in_ground_truth FROM aria_queue WHERE vendor_id IN (15385, 107930)").fetchall()
for r in aq:
    print(f"  aria_queue: vendor_id={r[0]}, in_ground_truth={r[1]}")

conn.close()
print("Done. 2 cases, 2 vendors added.")
