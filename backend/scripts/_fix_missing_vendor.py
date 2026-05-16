import sqlite3

s = sqlite3.connect('backend/RUBLI_NORMALIZED.db')
d = sqlite3.connect('backend/RUBLI_DEPLOY.db')

VID = 39209
links = s.execute("SELECT * FROM ground_truth_vendors WHERE vendor_id=?", (VID,)).fetchall()
print(f"Vendor {VID} links in SRC:", links)

link_cols = [desc[0] for desc in s.execute("SELECT * FROM ground_truth_vendors LIMIT 0").description]
print("Columns:", link_cols)

d.execute("PRAGMA journal_mode=WAL")
d.execute("PRAGMA synchronous=NORMAL")
for link in links:
    ph = ",".join("?" * len(link_cols))
    d.execute(f"INSERT OR IGNORE INTO ground_truth_vendors ({','.join(link_cols)}) VALUES ({ph})", link)
    print(f"  Inserted: {link}")
d.commit()

after = d.execute("SELECT COUNT(DISTINCT vendor_id) FROM ground_truth_vendors").fetchone()[0]
print(f"\nDST distinct vendors now: {after}")

# Update precomputed_stats
d.execute("UPDATE precomputed_stats SET stat_value=? WHERE stat_key='gt_vendors'", (str(after),))
d.commit()
print("precomputed_stats updated.")

s.close(); d.close()
