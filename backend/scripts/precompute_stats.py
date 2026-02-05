"""
Pre-compute dashboard statistics for instant loading.
Run this after ETL or data updates.
"""
import sqlite3
import json
import time
from datetime import datetime

DB_PATH = "RUBLI_NORMALIZED.db"

def precompute_stats():
    print("=" * 60)
    print("PRE-COMPUTING DASHBOARD STATISTICS")
    print("=" * 60)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create stats table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS precomputed_stats (
            stat_key TEXT PRIMARY KEY,
            stat_value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    stats = {}

    # 1. Overview stats
    print("\n1. Computing overview stats...")
    start = time.time()
    cursor.execute("""
        SELECT
            COUNT(*) as total_contracts,
            COALESCE(SUM(amount_mxn), 0) as total_value,
            COUNT(DISTINCT vendor_id) as total_vendors,
            COUNT(DISTINCT institution_id) as total_institutions,
            COALESCE(AVG(risk_score), 0) as avg_risk,
            SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) as high_risk_count,
            SUM(CASE WHEN risk_level IN ('high', 'critical') THEN amount_mxn ELSE 0 END) as high_risk_value,
            ROUND(SUM(CASE WHEN is_direct_award = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as direct_pct,
            ROUND(SUM(CASE WHEN is_single_bid = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as single_pct,
            MIN(contract_year) as min_year,
            MAX(contract_year) as max_year
        FROM contracts
    """)
    row = cursor.fetchone()
    stats['overview'] = {
        'total_contracts': row['total_contracts'],
        'total_value_mxn': row['total_value'],
        'total_vendors': row['total_vendors'],
        'total_institutions': row['total_institutions'],
        'avg_risk_score': round(row['avg_risk'] or 0, 4),
        'high_risk_contracts': row['high_risk_count'],
        'high_risk_value_mxn': row['high_risk_value'],
        'direct_award_pct': row['direct_pct'],
        'single_bid_pct': row['single_pct'],
        'min_year': row['min_year'],
        'max_year': row['max_year'],
    }
    print(f"   Done ({time.time() - start:.1f}s)")

    # 2. Sector stats
    print("2. Computing sector stats...")
    start = time.time()
    cursor.execute("""
        SELECT
            s.id,
            s.code,
            s.name_es as name,
            COUNT(c.id) as total_contracts,
            COALESCE(SUM(c.amount_mxn), 0) as total_value,
            COUNT(DISTINCT c.vendor_id) as total_vendors,
            COALESCE(AVG(c.risk_score), 0) as avg_risk,
            SUM(CASE WHEN c.risk_level = 'low' THEN 1 ELSE 0 END) as low_risk,
            SUM(CASE WHEN c.risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
            SUM(CASE WHEN c.risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
            SUM(CASE WHEN c.risk_level = 'critical' THEN 1 ELSE 0 END) as critical_risk,
            SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
            SUM(CASE WHEN c.is_single_bid = 1 THEN 1 ELSE 0 END) as single_bids
        FROM sectors s
        LEFT JOIN contracts c ON s.id = c.sector_id
        GROUP BY s.id, s.code, s.name_es
        ORDER BY total_contracts DESC
    """)
    sectors = []
    for row in cursor.fetchall():
        total = row['total_contracts'] or 0
        sectors.append({
            'id': row['id'],
            'code': row['code'],
            'name': row['name'],
            'total_contracts': total,
            'total_value_mxn': row['total_value'] or 0,
            'total_vendors': row['total_vendors'] or 0,
            'avg_risk_score': round(row['avg_risk'] or 0, 4),
            'low_risk_count': row['low_risk'] or 0,
            'medium_risk_count': row['medium_risk'] or 0,
            'high_risk_count': row['high_risk'] or 0,
            'critical_risk_count': row['critical_risk'] or 0,
            'direct_award_count': row['direct_awards'] or 0,
            'single_bid_count': row['single_bids'] or 0,
        })
    stats['sectors'] = sectors
    print(f"   Done ({time.time() - start:.1f}s)")

    # 3. Risk distribution
    print("3. Computing risk distribution...")
    start = time.time()
    cursor.execute("""
        SELECT
            risk_level,
            COUNT(*) as count,
            SUM(amount_mxn) as total_value
        FROM contracts
        GROUP BY risk_level
    """)
    risk_dist = []
    total_contracts = stats['overview']['total_contracts']
    for row in cursor.fetchall():
        risk_dist.append({
            'risk_level': row['risk_level'] or 'unknown',
            'count': row['count'],
            'percentage': round(row['count'] / total_contracts * 100, 2) if total_contracts > 0 else 0,
            'total_value_mxn': row['total_value'] or 0,
        })
    stats['risk_distribution'] = risk_dist
    print(f"   Done ({time.time() - start:.1f}s)")

    # 4. Year-over-year trends
    print("4. Computing yearly trends...")
    start = time.time()
    cursor.execute("""
        SELECT
            contract_year,
            COUNT(*) as contracts,
            COALESCE(SUM(amount_mxn), 0) as value,
            COALESCE(AVG(risk_score), 0) as avg_risk
        FROM contracts
        WHERE contract_year IS NOT NULL
        GROUP BY contract_year
        ORDER BY contract_year
    """)
    yearly = []
    for row in cursor.fetchall():
        yearly.append({
            'year': row['contract_year'],
            'contracts': row['contracts'],
            'value_mxn': row['value'],
            'avg_risk': round(row['avg_risk'], 4),
        })
    stats['yearly_trends'] = yearly
    print(f"   Done ({time.time() - start:.1f}s)")

    # Save all stats to database
    print("\n5. Saving to database...")
    for key, value in stats.items():
        cursor.execute("""
            INSERT OR REPLACE INTO precomputed_stats (stat_key, stat_value, updated_at)
            VALUES (?, ?, ?)
        """, (key, json.dumps(value), datetime.now().isoformat()))

    conn.commit()
    conn.close()

    print(f"\nDone! Pre-computed {len(stats)} stat groups.")
    print("=" * 60)

if __name__ == "__main__":
    precompute_stats()
