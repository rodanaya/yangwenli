"""
Sync GT tables from RUBLI_NORMALIZED.db → RUBLI_DEPLOY.db.
Copies ground_truth_cases, ground_truth_vendors, and precomputed_stats
gt_cases / gt_vendors entries. Safe to run multiple times (upsert).
"""
import sqlite3
import sys
import os

BASE = os.path.join(os.path.dirname(__file__), '..', '..')
SRC  = os.path.join(BASE, 'backend', 'RUBLI_NORMALIZED.db')
DST  = os.path.join(BASE, 'backend', 'RUBLI_DEPLOY.db')

print(f"SRC: {os.path.abspath(SRC)}")
print(f"DST: {os.path.abspath(DST)}")

src = sqlite3.connect(SRC)
dst = sqlite3.connect(DST)

src_cases   = src.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
src_vendors = src.execute("SELECT COUNT(DISTINCT vendor_id) FROM ground_truth_vendors").fetchone()[0]
dst_cases   = dst.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
dst_vendors = dst.execute("SELECT COUNT(DISTINCT vendor_id) FROM ground_truth_vendors").fetchone()[0]

print(f"\nBefore: SRC={src_cases} cases / {src_vendors} vendors  |  DST={dst_cases} cases / {dst_vendors} vendors")

if src_cases <= dst_cases:
    print("DST is already up to date — nothing to do.")
    src.close(); dst.close(); sys.exit(0)

# Identify new case IDs
src_ids = {r[0] for r in src.execute("SELECT case_id FROM ground_truth_cases")}
dst_ids = {r[0] for r in dst.execute("SELECT case_id FROM ground_truth_cases")}
new_ids = src_ids - dst_ids
print(f"\nNew case_ids to insert: {sorted(new_ids)}")

dst.execute("PRAGMA journal_mode=WAL")
dst.execute("PRAGMA synchronous=NORMAL")

# Copy new GT cases
for cid in sorted(new_ids):
    row = src.execute("SELECT * FROM ground_truth_cases WHERE case_id=?", (cid,)).fetchone()
    cols = [d[0] for d in src.execute("SELECT * FROM ground_truth_cases LIMIT 0").description]
    placeholders = ",".join("?" * len(cols))
    dst.execute(f"INSERT OR IGNORE INTO ground_truth_cases ({','.join(cols)}) VALUES ({placeholders})", row)
    print(f"  Inserted case {cid}")

    # Copy vendor links for this case
    links = src.execute("SELECT * FROM ground_truth_vendors WHERE case_id=?", (cid,)).fetchall()
    if links:
        link_cols = [d[0] for d in src.execute("SELECT * FROM ground_truth_vendors LIMIT 0").description]
        lp = ",".join("?" * len(link_cols))
        for link in links:
            dst.execute(f"INSERT OR IGNORE INTO ground_truth_vendors ({','.join(link_cols)}) VALUES ({lp})", link)
        print(f"    → {len(links)} vendor link(s)")

# Update precomputed_stats
new_cases   = dst.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
new_vendors = dst.execute("SELECT COUNT(DISTINCT vendor_id) FROM ground_truth_vendors").fetchone()[0]
dst.execute("UPDATE precomputed_stats SET stat_value=? WHERE stat_key='gt_cases'",   (str(new_cases),))
dst.execute("UPDATE precomputed_stats SET stat_value=? WHERE stat_key='gt_vendors'", (str(new_vendors),))
dst.commit()

print(f"\nAfter:  DST={new_cases} cases / {new_vendors} vendors")
print("Done.")
src.close(); dst.close()
