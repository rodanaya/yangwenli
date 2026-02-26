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

    # 5. Administration breakdown
    print("5. Computing administration breakdown...")
    start = time.time()
    cursor.execute("""
        SELECT
            CASE
                WHEN contract_year BETWEEN 2001 AND 2006 THEN 'Fox'
                WHEN contract_year BETWEEN 2007 AND 2012 THEN 'Calderon'
                WHEN contract_year BETWEEN 2013 AND 2018 THEN 'Pena Nieto'
                WHEN contract_year BETWEEN 2019 AND 2024 THEN 'AMLO'
                WHEN contract_year >= 2025 THEN 'Sheinbaum'
            END as admin,
            COUNT(*) as contracts,
            SUM(amount_mxn) as total_value,
            ROUND(AVG(risk_score), 4) as avg_risk,
            ROUND(100.0 * SUM(CASE WHEN risk_score >= 0.30 THEN 1 ELSE 0 END)
                  / COUNT(*), 1) as high_risk_pct,
            ROUND(100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END)
                  / COUNT(*), 1) as direct_award_pct
        FROM contracts
        WHERE contract_year >= 2001 AND contract_year <= 2025
        GROUP BY admin
        ORDER BY MIN(contract_year)
    """)
    admin_meta = {
        "Fox": ("Vicente Fox", "2001-2006", "PAN"),
        "Calderon": ("Felipe Calderon", "2007-2012", "PAN"),
        "Pena Nieto": ("Enrique Pena Nieto", "2013-2018", "PRI"),
        "AMLO": ("Andres Manuel Lopez Obrador", "2019-2024", "MORENA"),
        "Sheinbaum": ("Claudia Sheinbaum", "2025-present", "MORENA"),
    }
    administrations = []
    for row in cursor.fetchall():
        name = row['admin']
        full, years, party = admin_meta.get(name, (name, "", ""))
        administrations.append({
            "name": name,
            "full_name": full,
            "years": years,
            "party": party,
            "contracts": row['contracts'],
            "value": row['total_value'] or 0,
            "avg_risk": row['avg_risk'] or 0,
            "high_risk_pct": row['high_risk_pct'] or 0,
            "direct_award_pct": row['direct_award_pct'] or 0,
        })
    stats['administrations'] = administrations
    print(f"   Done ({time.time() - start:.1f}s)")

    # 6. Pattern counts for DetectivePatterns page
    print("6. Computing pattern counts...")
    start = time.time()
    pattern_queries = [
        ('pattern_december_rush', "SELECT COUNT(*) FROM contracts WHERE CAST(strftime('%m', contract_date) AS INTEGER) = 12 AND risk_score >= 0.30"),
        ('pattern_split_contracts', "SELECT COUNT(*) FROM contract_z_features WHERE z_same_day_count > 1.5"),
        ('pattern_single_bid', "SELECT COUNT(*) FROM contracts WHERE is_single_bid = 1"),
        ('pattern_price_outlier', "SELECT COUNT(*) FROM contract_z_features WHERE z_price_ratio > 2.0"),
        ('pattern_co_bidding', "SELECT COUNT(*) FROM contracts WHERE vendor_id IN (SELECT v.id FROM vendors v JOIN vendor_graph_features vgf ON vgf.vendor_id = v.id WHERE vgf.degree >= 5)"),
    ]
    for key, query in pattern_queries:
        try:
            val = cursor.execute(query).fetchone()[0]
            cursor.execute(
                "INSERT OR REPLACE INTO precomputed_stats (stat_key, stat_value, updated_at) VALUES (?, ?, ?)",
                (key, json.dumps(val), datetime.now().isoformat()),
            )
            print(f"   {key}: {val:,}")
        except Exception as e:
            print(f"   Warning: pattern count {key} failed: {e}")
    print(f"   Done ({time.time() - start:.1f}s)")

    # 7. Political cycle stats
    print("7. Computing political cycle stats...")
    start = time.time()
    try:
        rows = cursor.execute("""
            SELECT
                is_election_year,
                COUNT(*) as contracts,
                ROUND(AVG(risk_score), 4) as avg_risk,
                ROUND(100.0 * SUM(CASE WHEN risk_level IN ('high','critical') THEN 1 ELSE 0 END) / COUNT(*), 2) as high_risk_pct,
                ROUND(100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as direct_award_pct
            FROM contracts
            WHERE contract_year IS NOT NULL
            GROUP BY is_election_year
        """).fetchall()
        election_data = {}
        for r in rows:
            key = "election_year" if r["is_election_year"] else "non_election_year"
            election_data[key] = {"contracts": r["contracts"], "avg_risk": round(r["avg_risk"] or 0, 4), "high_risk_pct": round(r["high_risk_pct"] or 0, 2), "direct_award_pct": round(r["direct_award_pct"] or 0, 2)}

        srows = cursor.execute("""
            SELECT sexenio_year,
                COUNT(*) as contracts,
                ROUND(AVG(risk_score), 4) as avg_risk,
                ROUND(100.0 * SUM(CASE WHEN risk_level IN ('high','critical') THEN 1 ELSE 0 END) / COUNT(*), 2) as high_risk_pct,
                ROUND(100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as direct_award_pct
            FROM contracts WHERE sexenio_year IS NOT NULL
            GROUP BY sexenio_year ORDER BY sexenio_year
        """).fetchall()
        labels = {1: "Year 1 (new admin)", 2: "Year 2", 3: "Year 3 (midterm)", 4: "Year 4", 5: "Year 5", 6: "Year 6 (lame duck)"}
        sexenio_breakdown = [{"sexenio_year": r["sexenio_year"], "label": labels.get(r["sexenio_year"], f"Year {r['sexenio_year']}"), "contracts": r["contracts"], "avg_risk": round(r["avg_risk"] or 0, 4), "high_risk_pct": round(r["high_risk_pct"] or 0, 2), "direct_award_pct": round(r["direct_award_pct"] or 0, 2)} for r in srows]

        stats['political_cycle'] = {"election_year_effect": election_data, "sexenio_year_breakdown": sexenio_breakdown}
        print(f"   Done ({time.time() - start:.1f}s)")
    except Exception as e:
        print(f"   Warning: political cycle stats failed: {e}")

    # 8. Publication delay stats
    print("8. Computing publication delay stats...")
    start = time.time()
    try:
        row = cursor.execute("""
            SELECT
                SUM(CASE WHEN publication_delay_days BETWEEN 1 AND 7 THEN 1 ELSE 0 END) as b_0_7,
                SUM(CASE WHEN publication_delay_days BETWEEN 8 AND 30 THEN 1 ELSE 0 END) as b_8_30,
                SUM(CASE WHEN publication_delay_days BETWEEN 31 AND 90 THEN 1 ELSE 0 END) as b_31_90,
                SUM(CASE WHEN publication_delay_days > 90 THEN 1 ELSE 0 END) as b_over_90,
                COUNT(*) as total,
                ROUND(AVG(publication_delay_days), 1) as avg_delay,
                ROUND(100.0 * SUM(CASE WHEN publication_delay_days <= 7 THEN 1 ELSE 0 END) / COUNT(*), 2) as timely_pct
            FROM contracts
            WHERE publication_delay_days IS NOT NULL AND publication_delay_days > 0
        """).fetchone()
        total_d = int(row["total"] or 0)
        buckets = [
            {"label": "1–7 days", "count": int(row["b_0_7"] or 0), "pct": round(int(row["b_0_7"] or 0) / total_d * 100, 2) if total_d else 0},
            {"label": "8–30 days", "count": int(row["b_8_30"] or 0), "pct": round(int(row["b_8_30"] or 0) / total_d * 100, 2) if total_d else 0},
            {"label": "31–90 days", "count": int(row["b_31_90"] or 0), "pct": round(int(row["b_31_90"] or 0) / total_d * 100, 2) if total_d else 0},
            {"label": ">90 days", "count": int(row["b_over_90"] or 0), "pct": round(int(row["b_over_90"] or 0) / total_d * 100, 2) if total_d else 0},
        ]
        stats['publication_delays'] = {"total": total_d, "avg_delay_days": float(row["avg_delay"] or 0), "timely_pct": float(row["timely_pct"] or 0), "distribution": buckets}
        print(f"   Done ({time.time() - start:.1f}s)")
    except Exception as e:
        print(f"   Warning: publication delay stats failed: {e}")

    # 9. Institution HHI (supplier diversity) per sector per year
    print("9. Computing institution HHI stats...")
    start = time.time()
    try:
        # HHI per institution per year: sum of squared market shares (0-10000 scale)
        # Use primary_sector_id from institutions table for sector join
        hhi_rows = cursor.execute("""
            WITH vendor_shares AS (
                SELECT
                    institution_id,
                    contract_year,
                    vendor_id,
                    SUM(COALESCE(amount_mxn, 0)) AS vendor_value
                FROM contracts
                WHERE institution_id IS NOT NULL AND vendor_id IS NOT NULL
                  AND contract_year IS NOT NULL AND amount_mxn > 0
                GROUP BY institution_id, contract_year, vendor_id
            ),
            institution_totals AS (
                SELECT institution_id, contract_year,
                       SUM(vendor_value) AS total_value,
                       COUNT(DISTINCT vendor_id) AS unique_vendors
                FROM vendor_shares GROUP BY institution_id, contract_year
            ),
            hhi_calc AS (
                SELECT vs.institution_id, vs.contract_year,
                       ROUND(SUM((vs.vendor_value * 100.0 / it.total_value) *
                                 (vs.vendor_value * 100.0 / it.total_value)), 1) AS hhi,
                       it.unique_vendors
                FROM vendor_shares vs
                JOIN institution_totals it
                  ON vs.institution_id = it.institution_id AND vs.contract_year = it.contract_year
                WHERE it.total_value > 0
                GROUP BY vs.institution_id, vs.contract_year
            )
            SELECT h.institution_id, h.contract_year, h.hhi, h.unique_vendors,
                   i.name AS institution_name, i.sector_id
            FROM hhi_calc h
            JOIN institutions i ON h.institution_id = i.id
            ORDER BY h.contract_year DESC, h.hhi DESC
        """).fetchall()

        # Build per-institution lookups: {institution_id: [{year, hhi, unique_vendors}...]}
        from collections import defaultdict
        inst_hhi = defaultdict(list)
        for r in hhi_rows:
            inst_hhi[int(r["institution_id"])].append({
                "year": int(r["contract_year"]),
                "hhi": float(r["hhi"]),
                "unique_vendors": int(r["unique_vendors"]),
            })

        # Also compute per-sector average HHI by year
        sector_hhi_map = defaultdict(lambda: defaultdict(list))
        for r in hhi_rows:
            if r["sector_id"]:
                sector_hhi_map[int(r["sector_id"])][int(r["contract_year"])].append(float(r["hhi"]))

        sector_hhi_trend = {}
        for sid, years in sector_hhi_map.items():
            sector_hhi_trend[str(sid)] = [
                {"year": yr, "avg_hhi": round(sum(vals) / len(vals), 1)}
                for yr, vals in sorted(years.items())
            ]

        stats['institution_hhi'] = {
            "by_institution": {str(k): v for k, v in inst_hhi.items()},
            "sector_avg_trend": sector_hhi_trend,
        }
        print(f"   Done ({time.time() - start:.1f}s) — {len(inst_hhi)} institutions")
    except Exception as e:
        print(f"   Warning: HHI computation failed: {e}")
        import traceback; traceback.print_exc()

    # Save all stats to database
    print("\n10. Saving to database...")
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
