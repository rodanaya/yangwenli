import sqlite3

DB = 'D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB, timeout=300)
conn.execute('PRAGMA query_only = ON')
cur = conn.cursor()

SEP = '|'

def run(label, sql):
    print(f'\n=== {label} ===')
    cur.execute(sql)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    print(SEP.join(cols))
    for r in rows:
        print(SEP.join('' if x is None else str(x) for x in r))
    print(f'({len(rows)} rows)')

run('Q1: SECTOR SCORECARD', '''
SELECT s.name_en as sector, s.id as sector_id,
  COUNT(*) as contracts,
  ROUND(SUM(c.amount_mxn)/1e12,3) as value_trillions,
  ROUND(AVG(c.risk_score),4) as avg_risk,
  ROUND(100.0*SUM(CASE WHEN c.risk_score >= 0.50 THEN 1 ELSE 0 END)/COUNT(*),2) as critical_pct,
  ROUND(100.0*SUM(CASE WHEN c.risk_score >= 0.30 THEN 1 ELSE 0 END)/COUNT(*),2) as high_plus_pct,
  ROUND(100.0*SUM(CASE WHEN c.is_direct_award=1 THEN 1 ELSE 0 END)/COUNT(*),1) as direct_award_pct,
  ROUND(100.0*SUM(CASE WHEN c.is_single_bid=1 AND c.is_direct_award=0 THEN 1 ELSE 0 END)/
    NULLIF(SUM(CASE WHEN c.is_direct_award=0 THEN 1 ELSE 0 END),0),1) as single_bid_pct,
  COUNT(DISTINCT c.vendor_id) as unique_vendors,
  COUNT(DISTINCT c.institution_id) as unique_institutions
FROM contracts c JOIN sectors s ON s.id = c.sector_id
WHERE c.amount_mxn > 0 AND c.amount_mxn < 100000000000 AND c.risk_score IS NOT NULL
GROUP BY s.name_en, s.id ORDER BY avg_risk DESC
''')

run('Q2: TOP INSTITUTIONS BY VALUE', '''
SELECT i.name, i.institution_type,
  COUNT(*) as contracts,
  ROUND(SUM(c.amount_mxn)/1e9,1) as value_billions,
  ROUND(AVG(c.risk_score),4) as avg_risk,
  ROUND(100.0*SUM(CASE WHEN c.risk_score >= 0.30 THEN 1 ELSE 0 END)/COUNT(*),1) as high_pct,
  ROUND(100.0*SUM(CASE WHEN c.is_direct_award=1 THEN 1 ELSE 0 END)/COUNT(*),1) as direct_pct,
  COUNT(DISTINCT c.vendor_id) as vendors_used
FROM contracts c JOIN institutions i ON i.id = c.institution_id
WHERE c.amount_mxn > 0 AND c.amount_mxn < 100000000000 AND c.risk_score IS NOT NULL
  AND c.institution_id IS NOT NULL
GROUP BY i.name, i.institution_type
HAVING COUNT(*) >= 1000
ORDER BY value_billions DESC LIMIT 30
''')

run('Q3: HIGHEST-RISK INSTITUTIONS', '''
SELECT i.name, i.institution_type,
  COUNT(*) as contracts,
  ROUND(AVG(c.risk_score),4) as avg_risk,
  ROUND(100.0*SUM(CASE WHEN c.risk_score >= 0.50 THEN 1 ELSE 0 END)/COUNT(*),1) as critical_pct,
  ROUND(SUM(c.amount_mxn)/1e9,2) as value_billions
FROM contracts c JOIN institutions i ON i.id = c.institution_id
WHERE c.risk_score IS NOT NULL AND c.institution_id IS NOT NULL
GROUP BY i.name, i.institution_type HAVING COUNT(*) >= 500
ORDER BY avg_risk DESC LIMIT 20
''')

run('Q4: SECTOR RISK TRAJECTORY', '''
SELECT s.name_en as sector,
  ROUND(AVG(CASE WHEN c.contract_year BETWEEN 2002 AND 2010 THEN c.risk_score END),4) as avg_risk_2002_2010,
  ROUND(AVG(CASE WHEN c.contract_year BETWEEN 2011 AND 2018 THEN c.risk_score END),4) as avg_risk_2011_2018,
  ROUND(AVG(CASE WHEN c.contract_year BETWEEN 2019 AND 2024 THEN c.risk_score END),4) as avg_risk_2019_2024
FROM contracts c JOIN sectors s ON s.id = c.sector_id
WHERE c.risk_score IS NOT NULL
GROUP BY s.name_en ORDER BY avg_risk_2019_2024 DESC
''')

run('Q5: INSTITUTION TYPE BREAKDOWN', '''
SELECT institution_type,
  COUNT(DISTINCT i.id) as institutions,
  COUNT(*) as contracts,
  ROUND(SUM(c.amount_mxn)/1e9,1) as value_billions,
  ROUND(AVG(c.risk_score),4) as avg_risk,
  ROUND(100.0*SUM(CASE WHEN c.is_direct_award=1 THEN 1 ELSE 0 END)/COUNT(*),1) as direct_pct
FROM contracts c JOIN institutions i ON i.id = c.institution_id
WHERE c.amount_mxn > 0 AND c.amount_mxn < 100000000000 AND c.risk_score IS NOT NULL
GROUP BY institution_type ORDER BY value_billions DESC
''')

run('Q6: SECTOR x PROCUREMENT METHOD RISK MATRIX', '''
SELECT s.name_en as sector,
  ROUND(AVG(CASE WHEN c.is_direct_award=1 THEN c.risk_score END),4) as direct_award_risk,
  ROUND(AVG(CASE WHEN c.is_direct_award=0 AND c.is_single_bid=1 THEN c.risk_score END),4) as single_bid_risk,
  ROUND(AVG(CASE WHEN c.is_direct_award=0 AND c.is_single_bid=0 THEN c.risk_score END),4) as competitive_risk,
  COUNT(*) as total_contracts
FROM contracts c JOIN sectors s ON s.id = c.sector_id
WHERE c.risk_score IS NOT NULL AND c.is_direct_award IS NOT NULL
GROUP BY s.name_en ORDER BY single_bid_risk DESC
''')

run('Q7: VALUE AT RISK BY SECTOR', '''
SELECT s.name_en as sector,
  ROUND(SUM(CASE WHEN c.risk_score >= 0.30 THEN c.amount_mxn ELSE 0 END)/1e9,1) as value_at_risk_billions,
  ROUND(SUM(c.amount_mxn)/1e9,1) as total_value_billions,
  ROUND(100.0*SUM(CASE WHEN c.risk_score >= 0.30 THEN c.amount_mxn ELSE 0 END)/SUM(c.amount_mxn),1) as pct_at_risk
FROM contracts c JOIN sectors s ON s.id = c.sector_id
WHERE c.amount_mxn > 0 AND c.amount_mxn < 100000000000 AND c.risk_score IS NOT NULL
GROUP BY s.name_en ORDER BY value_at_risk_billions DESC
''')

run('Q8: CROSS-SECTOR VENDORS', '''
SELECT v.name,
  COUNT(DISTINCT c.sector_id) as sectors_active_in,
  COUNT(*) as total_contracts,
  ROUND(SUM(c.amount_mxn)/1e9,2) as value_billions,
  ROUND(AVG(c.risk_score),4) as avg_risk
FROM contracts c JOIN vendors v ON v.id = c.vendor_id
WHERE c.sector_id IS NOT NULL AND c.risk_score IS NOT NULL
GROUP BY v.name HAVING COUNT(DISTINCT c.sector_id) >= 8
ORDER BY value_billions DESC LIMIT 20
''')

conn.close()
print('\n=== ALL QUERIES COMPLETE ===')
