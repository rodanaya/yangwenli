"""
Batch RRR: IMSS institutional captures (v4690 Moravi cleaners, v2866 sterilization)
Guard: max_id must be >= 890 (after prior batches)

Cases:
  c0 = max_id+1 : v4690 GRUPO MORAVI - IMSS capture (2360 contracts, $518M, 67.9% DA, 58.9% IMSS)
  c1 = max_id+2 : v2866 ESPECIALISTAS EN ESTERILIZACION - IMSS monopoly (2934 contracts, $2.94B, 60.2% IMSS)

Skips:
  v43556 MEDICAL PHARMACEUTICA: legitimate distributor, multi-institution (max 32.9%), no concentration
  v13187 INSTRUMENTACION MEDICA: multi-sector (IMSS 52.2%, Defensa 17.3%), diversified
"""
import sqlite3, sys

DB = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 890:
    print(f"ABORT: max_id={max_id}, expected >= 890")
    sys.exit(1)

c0, c1 = max_id + 1, max_id + 2
print(f"max_id={max_id} -> cases {c0}, {c1}")

cases = [
    (c0, f"CASE-{c0}", "IMSS Cleaners & Medical Supplies Capture — Grupo Moravi",
     "institutional_capture", "medium", 305_000_000,
     "https://compranet.hacienda.gob.mx",
     2002, 2025,
     "GRUPO MORAVI SA DE CV (v4690). 2360 contracts to IMSS (58.9% = $305M), ISSSTE, and health institutions. "
     "DA rate 67.9%. Sustained institutional monopoly across 23 years. Typical IMSS vendor capture: large vendor, "
     "single institution focus, stable DA rates over long period, long-tail distribution suggesting systemic preference."),
    (c1, f"CASE-{c1}", "IMSS Sterilization & Packaging Monopoly — Especialistas en Esterilizacion y Envase",
     "institutional_capture", "medium", 1_770_000_000,
     "https://compranet.hacienda.gob.mx",
     2002, 2025,
     "ESPECIALISTAS EN ESTERILIZACION Y ENVASE SA DE CV (v2866). 2934 contracts, $2.94B total. "
     "IMSS concentration extreme: 60.2% of vendor revenue ($1.77B to IMSS alone). Specialized sterilization/packaging "
     "supplier with legitimate business case, BUT single-institution concentration 60%+ across 23 years + 2934 contracts = "
     "institutional capture pattern. Vendor winning majority of sterilization work at IMSS through preference, not competition."),
]

vendors = [
    (c0, 4690, "GRUPO MORAVI, S.A. DE C.V.", "high", "aria_queue_procurement_pattern"),
    (c1, 2866, "ESPECIALISTAS EN ESTERILIZACION Y ENVASE, S.A. DE C.V.", "high", "aria_queue_procurement_pattern"),
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

moravi_ids = [r[0] for r in conn.execute(
    "SELECT id FROM contracts WHERE vendor_id=4690").fetchall()]
estez_ids = [r[0] for r in conn.execute(
    "SELECT id FROM contracts WHERE vendor_id=2866").fetchall()]

for case_num, ids in [
    (c0, moravi_ids),
    (c1, estez_ids),
]:
    conn.executemany(
        "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
        [(case_num, cid) for cid in ids]
    )

for vid in [4690, 2866]:
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed'
        WHERE vendor_id=?
    """, (vid,))

conn.execute("""
    UPDATE aria_queue SET review_status='reviewed',
    reviewer_notes='SKIP: Legitimate pharmaceutical distributor. High DA (83.1%) but NOT concentrated at single institution. Serves 94+ institutions. Max concentration 32.9% at one hospital. Distributed customer base indicates legitimate competitive position.'
    WHERE vendor_id=43556
""")

conn.execute("""
    UPDATE aria_queue SET review_status='reviewed',
    reviewer_notes='SKIP: Multi-sector distributor (IMSS 52.2%, Defensa 17.3%). Diversified across health + military sectors. Does not fit single-institution capture pattern. Legitimate medical equipment supplier with reasonable diversification.'
    WHERE vendor_id=13187
""")

conn.commit()
conn.close()
print(f"Done. Cases {c0}-{c1} inserted.")
print(f"  {c0} GRUPO MORAVI: {len(moravi_ids)} contracts")
print(f"  {c1} ESPECIALISTAS EN ESTERILIZACION: {len(estez_ids)} contracts")
print(f"  SKIP: v43556 MEDICAL PHARMACEUTICA — legitimate distributor")
print(f"  SKIP: v13187 INSTRUMENTACION MEDICA — multi-sector diversified")
