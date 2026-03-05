import sqlite3

DB = 'D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB, timeout=300)
cur = conn.cursor()

print("=== Q7: Risk by contract value bucket ===")
cur.execute("""SELECT
  CASE WHEN amount_mxn < 100000 THEN 'A_under100K'
       WHEN amount_mxn < 1000000 THEN 'B_100K-1M'
       WHEN amount_mxn < 10000000 THEN 'C_1M-10M'
       WHEN amount_mxn < 100000000 THEN 'D_10M-100M'
       WHEN amount_mxn < 1000000000 THEN 'E_100M-1B'
       ELSE 'F_over1B' END as bucket,
  COUNT(*) as n,
  ROUND(AVG(risk_score),4) as avg_risk,
  ROUND(100.0*SUM(CASE WHEN risk_score >= 0.30 THEN 1 ELSE 0 END)/COUNT(*),2) as high_pct
FROM contracts WHERE risk_score IS NOT NULL AND amount_mxn > 0
GROUP BY bucket ORDER BY bucket""")
for r in cur.fetchall():
    print(r)

print("\n=== Q8: Confidence interval width by risk level ===")
cur.execute("""SELECT
  risk_level,
  ROUND(AVG(risk_confidence_upper - risk_confidence_lower),4) as avg_ci_width,
  ROUND(MIN(risk_confidence_upper - risk_confidence_lower),4) as min_ci_width,
  ROUND(MAX(risk_confidence_upper - risk_confidence_lower),4) as max_ci_width,
  COUNT(*) as contracts
FROM contracts
WHERE risk_confidence_upper IS NOT NULL AND risk_confidence_lower IS NOT NULL AND risk_level IS NOT NULL
GROUP BY risk_level""")
for r in cur.fetchall():
    print(r)

print("\n=== Q9a: Exact zero scores ===")
cur.execute("SELECT COUNT(*) FROM contracts WHERE risk_score = 0.0")
print("exact_zero:", cur.fetchone()[0])

print("\n=== Q9b: Exact one scores ===")
cur.execute("SELECT COUNT(*) FROM contracts WHERE risk_score = 1.0")
print("exact_one:", cur.fetchone()[0])

print("\n=== Q9c: Score > 0 and < 0.01 ===")
cur.execute("SELECT COUNT(*) FROM contracts WHERE risk_score > 0 AND risk_score < 0.01")
print("under_001:", cur.fetchone()[0])

print("\n=== Q9d: Null risk_score count ===")
cur.execute("SELECT COUNT(*) FROM contracts WHERE risk_score IS NULL")
print("null_score:", cur.fetchone()[0])

print("\n=== Q9e: Score distribution percentiles ===")
cur.execute("""
SELECT
  ROUND(MIN(risk_score),4) as min_s,
  ROUND(AVG(risk_score),4) as mean_s,
  ROUND(MAX(risk_score),4) as max_s,
  COUNT(*) as total
FROM contracts WHERE risk_score IS NOT NULL
""")
for r in cur.fetchall():
    print(r)

print("\n=== Q10: CI null coverage ===")
cur.execute("SELECT COUNT(*) FROM contracts WHERE risk_confidence_upper IS NOT NULL")
print("ci_not_null:", cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM contracts WHERE risk_confidence_upper IS NULL AND risk_score IS NOT NULL")
print("has_score_no_ci:", cur.fetchone()[0])

conn.close()
print("DONE")
