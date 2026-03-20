import sqlite3
conn = sqlite3.connect('RUBLI_NORMALIZED.db', timeout=60)
rows = conn.execute('''SELECT vendor_id, vendor_name, ips_final, total_value_mxn, direct_award_rate, single_bid_rate, total_contracts, primary_sector_name
FROM aria_queue WHERE ips_tier=3 AND review_status='pending' AND in_ground_truth=0 AND fp_structural_monopoly=0 AND fp_data_error=0 AND fp_patent_exception=0 AND total_value_mxn > 200000000 ORDER BY ips_final DESC LIMIT 25''').fetchall()
for r in rows:
    print(r[0], str(r[1])[:45], round(r[2],3), int(r[3]/1e6), round(r[4],2), round(r[5],2), r[6], r[7])
conn.close()
print('DONE')
