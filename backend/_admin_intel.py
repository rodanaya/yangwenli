import sqlite3, json, time

conn = sqlite3.connect('RUBLI_NORMALIZED.db')
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA temp_store=MEMORY")
conn.execute("PRAGMA cache_size=-131072")  # 128MB cache

ERAS = {
    'fox':        (2002, 2005),
    'calderon':   (2006, 2011),
    'pena_nieto': (2012, 2017),
    'amlo':       (2018, 2024),
    'sheinbaum':  (2025, 2030),
}

results = {}
for era, (y0, y1) in ERAS.items():
    t0 = time.time()
    print(f"Processing {era} ({y0}-{y1})...", flush=True)

    # Top vendors by spend — year index is fast; filter outliers via HAVING
    top = conn.execute("""
        SELECT c.vendor_id,
               SUM(CASE WHEN c.amount_mxn BETWEEN 1 AND 100000000000
                        THEN c.amount_mxn ELSE 0 END) as total,
               SUM(CASE WHEN c.amount_mxn BETWEEN 1 AND 100000000000
                        THEN 1 ELSE 0 END) as cnt,
               ROUND(AVG(CASE WHEN c.amount_mxn BETWEEN 1 AND 100000000000
                              THEN c.risk_score END)*100, 1) as risk_pct
        FROM contracts c
        WHERE c.contract_year BETWEEN ? AND ?
          AND c.vendor_id IS NOT NULL
        GROUP BY c.vendor_id
        HAVING total > 0
        ORDER BY total DESC LIMIT 6
    """, (y0, y1)).fetchall()

    # Look up vendor names
    if top:
        ids = [r['vendor_id'] for r in top]
        placeholders = ','.join('?' * len(ids))
        name_map = {
            r['id']: r['name']
            for r in conn.execute(
                f"SELECT id, name FROM vendors WHERE id IN ({placeholders})", ids
            ).fetchall()
        }
    else:
        name_map = {}

    # GT cases in this era
    gt_row = conn.execute("""
        SELECT COUNT(*) as n, COALESCE(SUM(estimated_fraud_mxn), 0) as fraud
        FROM ground_truth_cases
        WHERE year_start BETWEEN ? AND ?
    """, (y0, y1)).fetchone()

    # December spend share
    dec = conn.execute("""
        SELECT
          ROUND(
            SUM(CASE WHEN contract_month = 12 AND amount_mxn BETWEEN 1 AND 100000000000
                     THEN amount_mxn ELSE 0 END) * 100.0
            / NULLIF(
                SUM(CASE WHEN amount_mxn BETWEEN 1 AND 100000000000
                         THEN amount_mxn ELSE 0 END), 0),
            1
          ) as dec_pct
        FROM contracts
        WHERE contract_year BETWEEN ? AND ?
    """, (y0, y1)).fetchone()

    results[era] = {
        'top_vendors': [
            {
                'name': name_map.get(r['vendor_id'], f'vendor_{r["vendor_id"]}'),
                'total_mxn': round(r['total']),
                'contracts': r['cnt'],
                'risk_pct': r['risk_pct'],
            }
            for r in top
        ],
        'gt_cases': gt_row['n'],
        'est_fraud_mxn': round(gt_row['fraud']),
        'dec_spike_pct': dec['dec_pct'] or 0,
    }
    print(f"  done in {time.time()-t0:.1f}s: {len(top)} vendors, "
          f"{gt_row['n']} GT cases", flush=True)

conn.close()

output = json.dumps(results, indent=2, ensure_ascii=False)

with open('_admin_intel_output.json', 'w', encoding='utf-8') as f:
    f.write(output)

print("\n=== OUTPUT ===")
print(output)
print("=== SAVED to _admin_intel_output.json ===", flush=True)
