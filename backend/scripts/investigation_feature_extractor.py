"""
Investigation Feature Extractor (Optimized)
=============================================
Extracts 20+ features per vendor for ML-based anomaly detection.
Uses batch SQL queries for high performance.

Features are extracted at the vendor-sector level, focusing on:
- Volume metrics (contracts, values, averages)
- Risk metrics (scores, high-risk ratios)
- Procedure metrics (direct award, single bid rates)
- Price metrics (hypotheses, anomalies)
- Temporal metrics (seasonality, velocity, growth)
- Concentration metrics (institution HHI, top client ratio)
- Network metrics (co-bidders, corporate groups)
- Mismatch metrics (sector mismatches)

Target Sectors: Salud (1), Infraestructura (3)

Author: RUBLI Project
Date: 2026-02-03
"""

import sqlite3
import os
import json
import math
from datetime import datetime
from collections import defaultdict
from typing import Optional, Dict, Any, List, Tuple

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')

# Target sectors for investigation
TARGET_SECTORS = list(range(1, 13))  # All 12 sectors

# Minimum contracts to consider a vendor (filter noise)
MIN_CONTRACTS = 3

# Feature version for tracking
FEATURE_VERSION = "1.0.0"


def extract_features(sector_ids: Optional[List[int]] = None) -> int:
    """
    Extract features for all vendors in specified sectors using batch queries.
    This is much faster than per-vendor queries.
    """
    if sector_ids is None:
        sector_ids = TARGET_SECTORS

    print(f"Starting feature extraction for sectors: {sector_ids}")
    print(f"Database: {DB_PATH}")
    print(f"Minimum contracts threshold: {MIN_CONTRACTS}")
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Clear existing features for these sectors
    print("Clearing existing features...")
    sector_list = ','.join(str(s) for s in sector_ids)
    cursor.execute(f"DELETE FROM vendor_investigation_features WHERE sector_id IN ({sector_list})")
    conn.commit()

    # Calculate sector medians
    print("Calculating sector medians...")
    sector_medians = {}
    for sector_id in sector_ids:
        cursor.execute("""
            SELECT AVG(amount_mxn) as median
            FROM (
                SELECT amount_mxn
                FROM contracts
                WHERE sector_id = ? AND amount_mxn > 0 AND amount_mxn < 100000000000
                ORDER BY amount_mxn
                LIMIT 2 OFFSET (
                    SELECT COUNT(*)/2 FROM contracts
                    WHERE sector_id = ? AND amount_mxn > 0 AND amount_mxn < 100000000000
                )
            )
        """, (sector_id, sector_id))
        row = cursor.fetchone()
        sector_medians[sector_id] = row['median'] if row and row['median'] else 1000000.0
        print(f"  Sector {sector_id} median: ${sector_medians[sector_id]:,.2f} MXN")

    for sector_id in sector_ids:
        print(f"\nProcessing sector {sector_id}...")
        extract_sector_features(cursor, sector_id, sector_medians[sector_id])
        conn.commit()

    # Verify
    cursor.execute("SELECT COUNT(*) FROM vendor_investigation_features")
    total = cursor.fetchone()[0]
    print(f"\nTotal features in database: {total:,}")

    conn.close()
    return total


def extract_sector_features(cursor: sqlite3.Cursor, sector_id: int, sector_median: float):
    """Extract features for all vendors in a single sector using batch SQL."""

    print(f"  Extracting core features...")

    # Giant batch query for all core features
    cursor.execute(f"""
        INSERT INTO vendor_investigation_features (
            vendor_id, sector_id, total_contracts, total_value_mxn,
            avg_contract_value, contract_value_std, contract_value_cv,
            avg_risk_score, max_risk_score, high_risk_ratio, critical_risk_ratio,
            direct_award_ratio, single_bid_ratio, open_tender_ratio,
            price_hypothesis_count, high_conf_hypothesis_count,
            max_hypothesis_confidence, avg_price_ratio,
            december_ratio, q4_ratio, contract_velocity, years_active,
            institution_count, institution_hhi, top_institution_ratio,
            sector_concentration, feature_version
        )
        SELECT
            c.vendor_id,
            ? as sector_id,
            COUNT(*) as total_contracts,
            COALESCE(SUM(c.amount_mxn), 0) as total_value_mxn,
            COALESCE(AVG(c.amount_mxn), 0) as avg_contract_value,

            -- Standard deviation (simplified using SQL)
            COALESCE(
                SQRT(
                    AVG(c.amount_mxn * c.amount_mxn) -
                    AVG(c.amount_mxn) * AVG(c.amount_mxn)
                ), 0
            ) as contract_value_std,

            -- CV = std/mean
            CASE WHEN AVG(c.amount_mxn) > 0 THEN
                COALESCE(
                    SQRT(
                        AVG(c.amount_mxn * c.amount_mxn) -
                        AVG(c.amount_mxn) * AVG(c.amount_mxn)
                    ), 0
                ) / AVG(c.amount_mxn)
            ELSE 0 END as contract_value_cv,

            COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
            COALESCE(MAX(c.risk_score), 0) as max_risk_score,
            CAST(SUM(CASE WHEN c.risk_score >= 0.4 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as high_risk_ratio,
            CAST(SUM(CASE WHEN c.risk_score >= 0.6 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as critical_risk_ratio,
            CAST(SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as direct_award_ratio,
            CAST(SUM(CASE WHEN c.is_single_bid = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as single_bid_ratio,
            CAST(SUM(CASE WHEN c.procedure_type_normalized = 'LICITACION PUBLICA' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as open_tender_ratio,

            SUM(CASE WHEN c.price_hypothesis_confidence IS NOT NULL THEN 1 ELSE 0 END) as price_hypothesis_count,
            SUM(CASE WHEN c.price_hypothesis_confidence >= 0.85 THEN 1 ELSE 0 END) as high_conf_hypothesis_count,
            MAX(c.price_hypothesis_confidence) as max_hypothesis_confidence,
            COALESCE(AVG(c.amount_mxn), 0) / ? as avg_price_ratio,

            CAST(SUM(CASE WHEN c.contract_month = 12 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as december_ratio,
            CAST(SUM(CASE WHEN c.contract_month IN (10, 11, 12) THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as q4_ratio,
            CAST(COUNT(*) AS REAL) / MAX(1, MAX(c.contract_year) - MIN(c.contract_year) + 1) as contract_velocity,
            MAX(c.contract_year) - MIN(c.contract_year) + 1 as years_active,

            COUNT(DISTINCT c.institution_id) as institution_count,

            -- Institution HHI approximation (sum of squared shares)
            -- This is simplified - we use the max institution ratio squared as an approximation
            (
                SELECT CAST(MAX(inst_count) AS REAL) * MAX(inst_count) / (COUNT(*) * COUNT(*))
                FROM (
                    SELECT COUNT(*) as inst_count
                    FROM contracts c2
                    WHERE c2.vendor_id = c.vendor_id AND c2.sector_id = ?
                    GROUP BY c2.institution_id
                )
            ) as institution_hhi,

            -- Top institution ratio
            CAST((
                SELECT MAX(inst_count)
                FROM (
                    SELECT COUNT(*) as inst_count
                    FROM contracts c2
                    WHERE c2.vendor_id = c.vendor_id AND c2.sector_id = ?
                    GROUP BY c2.institution_id
                )
            ) AS REAL) / COUNT(*) as top_institution_ratio,

            -- Sector concentration (how much of vendor's business is in this sector)
            CAST(COUNT(*) AS REAL) / (
                SELECT COUNT(*) FROM contracts c3 WHERE c3.vendor_id = c.vendor_id
            ) as sector_concentration,

            ? as feature_version

        FROM contracts c
        WHERE c.sector_id = ?
        GROUP BY c.vendor_id
        HAVING COUNT(*) >= ?
    """, (sector_id, sector_median, sector_id, sector_id, FEATURE_VERSION, sector_id, MIN_CONTRACTS))

    inserted = cursor.rowcount
    print(f"  Inserted {inserted:,} vendor features")

    # Update network features (co-bidder count)
    print(f"  Calculating co-bidder counts...")
    cursor.execute(f"""
        UPDATE vendor_investigation_features
        SET co_bidder_count = (
            SELECT COUNT(DISTINCT c2.vendor_id)
            FROM contracts c1
            JOIN contracts c2 ON c1.procedure_number = c2.procedure_number
                AND c2.vendor_id != c1.vendor_id
                AND c1.procedure_number IS NOT NULL
                AND c1.procedure_number != ''
            WHERE c1.vendor_id = vendor_investigation_features.vendor_id
              AND c1.sector_id = ?
        )
        WHERE sector_id = ?
    """, (sector_id, sector_id))

    # Update related vendor count via corporate groups
    print(f"  Calculating corporate group relationships...")
    cursor.execute(f"""
        UPDATE vendor_investigation_features
        SET related_vendor_count = COALESCE((
            SELECT COUNT(*)
            FROM vendors v1
            JOIN vendors v2 ON v1.corporate_group = v2.corporate_group
                AND v2.id != v1.id
                AND v1.corporate_group IS NOT NULL
                AND v1.corporate_group != ''
            WHERE v1.id = vendor_investigation_features.vendor_id
        ), 0)
        WHERE sector_id = ?
    """, (sector_id,))

    # Update network cluster size
    cursor.execute(f"""
        UPDATE vendor_investigation_features
        SET network_cluster_size = COALESCE(co_bidder_count, 0) + COALESCE(related_vendor_count, 0)
        WHERE sector_id = ?
    """, (sector_id,))

    # Update sector mismatch ratio
    print(f"  Calculating sector mismatches...")
    cursor.execute(f"""
        UPDATE vendor_investigation_features
        SET sector_mismatch_ratio = (
            SELECT CASE
                WHEN (
                    SELECT sector_id
                    FROM contracts
                    WHERE vendor_id = vendor_investigation_features.vendor_id
                    GROUP BY sector_id
                    ORDER BY COUNT(*) DESC
                    LIMIT 1
                ) != ?
                THEN sector_concentration
                ELSE 0
            END
        )
        WHERE sector_id = ?
    """, (sector_id, sector_id))

    # Calculate growth anomaly (requires yearly data)
    print(f"  Calculating growth anomalies...")
    cursor.execute(f"""
        WITH yearly_counts AS (
            SELECT
                vendor_id,
                contract_year,
                COUNT(*) as year_count,
                LAG(COUNT(*)) OVER (PARTITION BY vendor_id ORDER BY contract_year) as prev_count
            FROM contracts
            WHERE sector_id = ?
            GROUP BY vendor_id, contract_year
        ),
        growth_rates AS (
            SELECT
                vendor_id,
                MAX(CASE
                    WHEN prev_count > 0 THEN CAST(year_count - prev_count AS REAL) / prev_count
                    ELSE 0
                END) as max_growth
            FROM yearly_counts
            GROUP BY vendor_id
        )
        UPDATE vendor_investigation_features
        SET sudden_growth_indicator = COALESCE((
            SELECT MIN(gr.max_growth, 10.0)
            FROM growth_rates gr
            WHERE gr.vendor_id = vendor_investigation_features.vendor_id
        ), 0)
        WHERE sector_id = ?
    """, (sector_id, sector_id))


def print_feature_summary():
    """Print summary statistics of extracted features."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("\n" + "="*60)
    print("FEATURE EXTRACTION SUMMARY")
    print("="*60)

    for sector_id in TARGET_SECTORS:
        cursor.execute("""
            SELECT
                COUNT(*) as vendors,
                AVG(total_contracts) as avg_contracts,
                AVG(avg_risk_score) as avg_risk,
                AVG(single_bid_ratio) as avg_single_bid,
                AVG(direct_award_ratio) as avg_direct_award,
                AVG(price_hypothesis_count) as avg_hyp_count,
                AVG(institution_hhi) as avg_hhi,
                AVG(co_bidder_count) as avg_co_bidders
            FROM vendor_investigation_features
            WHERE sector_id = ?
        """, (sector_id,))
        row = cursor.fetchone()

        cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
        sector_name = cursor.fetchone()[0]

        print(f"\nSector: {sector_name} (ID={sector_id})")
        print(f"  Vendors with features: {row['vendors']:,}")
        print(f"  Avg contracts/vendor: {row['avg_contracts']:.1f}")
        print(f"  Avg risk score: {row['avg_risk']:.3f}")
        print(f"  Avg single bid ratio: {row['avg_single_bid']:.1%}")
        print(f"  Avg direct award ratio: {row['avg_direct_award']:.1%}")
        print(f"  Avg price hypotheses: {row['avg_hyp_count']:.1f}")
        print(f"  Avg institution HHI: {row['avg_hhi']:.3f}")
        print(f"  Avg co-bidders: {row['avg_co_bidders']:.1f}")

    # Top vendors by various metrics
    print("\n" + "-"*60)
    print("TOP 10 VENDORS BY AVG RISK SCORE (MIN 10 CONTRACTS)")
    print("-"*60)

    cursor.execute("""
        SELECT vf.vendor_id, v.name, s.code as sector,
               vf.avg_risk_score, vf.total_contracts,
               vf.single_bid_ratio, vf.direct_award_ratio
        FROM vendor_investigation_features vf
        JOIN vendors v ON vf.vendor_id = v.id
        JOIN sectors s ON vf.sector_id = s.id
        WHERE vf.total_contracts >= 10
        ORDER BY vf.avg_risk_score DESC
        LIMIT 10
    """)

    print(f"{'Vendor':<45} {'Sector':<12} {'Risk':>6} {'N':>6} {'1Bid':>6} {'DA':>6}")
    print("-"*85)
    for row in cursor.fetchall():
        name = row['name'][:42] + "..." if len(row['name']) > 45 else row['name']
        print(f"{name:<45} {row['sector']:<12} {row['avg_risk_score']:>6.3f} {row['total_contracts']:>6} {row['single_bid_ratio']:>6.1%} {row['direct_award_ratio']:>6.1%}")

    print("\n" + "-"*60)
    print("TOP 10 BY PRICE HYPOTHESES (HIGH CONFIDENCE)")
    print("-"*60)

    cursor.execute("""
        SELECT vf.vendor_id, v.name, s.code as sector,
               vf.high_conf_hypothesis_count, vf.total_contracts,
               vf.avg_risk_score
        FROM vendor_investigation_features vf
        JOIN vendors v ON vf.vendor_id = v.id
        JOIN sectors s ON vf.sector_id = s.id
        WHERE vf.high_conf_hypothesis_count > 0
        ORDER BY vf.high_conf_hypothesis_count DESC
        LIMIT 10
    """)

    print(f"{'Vendor':<45} {'Sector':<12} {'HiConf':>8} {'N':>6} {'Risk':>6}")
    print("-"*80)
    for row in cursor.fetchall():
        name = row['name'][:42] + "..." if len(row['name']) > 45 else row['name']
        print(f"{name:<45} {row['sector']:<12} {row['high_conf_hypothesis_count']:>8} {row['total_contracts']:>6} {row['avg_risk_score']:>6.3f}")

    conn.close()


if __name__ == "__main__":
    print("="*60)
    print("INVESTIGATION FEATURE EXTRACTOR (OPTIMIZED)")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    start = datetime.now()
    extract_features(TARGET_SECTORS)
    elapsed = (datetime.now() - start).total_seconds()
    print(f"\nExtraction completed in {elapsed:.1f} seconds")

    print_feature_summary()
