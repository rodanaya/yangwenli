"""
Price Manipulation Hypothesis Engine
=====================================
Generates explainable hypotheses for price manipulation patterns in procurement data.

This module implements hypothesis generation (not detection!) for suspicious pricing
patterns. Each hypothesis includes:
- Confidence score (0-1)
- Human-readable explanation
- Supporting evidence
- Literature reference

Design Principles:
1. Hypothesis generation, not "detection" - flags patterns for review
2. Low false positives over high recall - quality over quantity
3. Explainable - every flag has clear reasoning
4. Academic rigor - thresholds backed by published research
5. Reproducible - clear methodology others can audit

Literature Sources:
- IMF Working Paper 2022/094: Price impact of corruption
- EU OLAF Red Flags: Statistical price anomaly detection
- Tukey (1977): IQR-based outlier detection
- OECD Procurement Performance Reports
- Open Contracting Partnership: Red Flags Guide

Author: Yang Wen-li Project
Date: February 2026
"""

import sqlite3
import json
import math
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict

# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# =============================================================================
# CONSTANTS - Based on Literature
# =============================================================================

# Amount validation (from data-validation.md)
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN - reject
FLAG_THRESHOLD = 10_000_000_000       # 10B MXN - flag for review

# Price anomaly thresholds (from RISK_METHODOLOGY.md)
# Based on Tukey's IQR method and EU OLAF guidance
PRICE_ANOMALY_THRESHOLDS = {
    'mild': 1.5,        # 1.5x sector median = mild outlier
    'significant': 2.0,  # 2.0x = significant outlier
    'extreme': 3.0,      # 3.0x = extreme outlier (red flag)
}

# Sudden price jump thresholds (OECD guidance)
PRICE_JUMP_THRESHOLDS = {
    'notable': 0.30,     # 30% increase = notable
    'significant': 0.50, # 50% increase = significant
    'extreme': 1.00,     # 100% increase = extreme
}

# Round number analysis thresholds (forensic accounting)
ROUND_NUMBER_PATTERNS = [
    1_000_000,      # 1M
    5_000_000,      # 5M
    10_000_000,     # 10M
    50_000_000,     # 50M
    100_000_000,    # 100M
    500_000_000,    # 500M
    1_000_000_000,  # 1B
]

# Price clustering threshold
PRICE_CLUSTER_TOLERANCE = 0.01  # 1% tolerance for "identical" prices


class HypothesisType(Enum):
    """Types of price manipulation hypotheses."""
    EXTREME_OVERPRICING = "extreme_overpricing"
    STATISTICAL_OUTLIER = "statistical_outlier"
    SUDDEN_PRICE_JUMP = "sudden_price_jump"
    ROUND_NUMBER_SUSPICIOUS = "round_number_suspicious"
    PRICE_CLUSTERING = "price_clustering"
    VENDOR_PRICE_ANOMALY = "vendor_price_anomaly"
    SECTOR_MISMATCH_PRICING = "sector_mismatch_pricing"
    THRESHOLD_PROXIMITY = "threshold_proximity"


class ConfidenceLevel(Enum):
    """Confidence levels for hypotheses."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass
class Evidence:
    """Supporting evidence for a hypothesis."""
    evidence_type: str
    description: str
    value: Any
    comparison_value: Optional[Any] = None
    source: Optional[str] = None


@dataclass
class PriceHypothesis:
    """A hypothesis about potential price manipulation."""
    hypothesis_id: str
    contract_id: int
    hypothesis_type: str
    confidence: float
    confidence_level: str
    explanation: str
    supporting_evidence: List[Dict]
    recommended_action: str
    literature_reference: str
    sector_id: Optional[int] = None
    vendor_id: Optional[int] = None
    amount_mxn: Optional[float] = None
    created_at: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


# =============================================================================
# DATABASE SCHEMA
# =============================================================================

def ensure_schema(conn: sqlite3.Connection):
    """Create price hypothesis tables if they don't exist."""
    cursor = conn.cursor()

    # Main hypotheses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS price_hypotheses (
            id INTEGER PRIMARY KEY,
            hypothesis_id VARCHAR(50) UNIQUE NOT NULL,
            contract_id INTEGER NOT NULL,
            hypothesis_type VARCHAR(50) NOT NULL,
            confidence REAL NOT NULL,
            confidence_level VARCHAR(20) NOT NULL,
            explanation TEXT NOT NULL,
            supporting_evidence TEXT,  -- JSON array
            recommended_action TEXT,
            literature_reference TEXT,
            sector_id INTEGER,
            vendor_id INTEGER,
            amount_mxn REAL,
            is_reviewed INTEGER DEFAULT 0,
            reviewed_by TEXT,
            reviewed_at TIMESTAMP,
            review_notes TEXT,
            is_valid INTEGER,  -- NULL=pending, 1=confirmed, 0=dismissed
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contract_id) REFERENCES contracts(id),
            FOREIGN KEY (sector_id) REFERENCES sectors(id),
            FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        )
    """)

    # Enhanced price baselines table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sector_price_baselines (
            id INTEGER PRIMARY KEY,
            sector_id INTEGER NOT NULL,
            contract_type VARCHAR(50),  -- 'goods', 'services', 'works', 'all'
            year INTEGER,               -- NULL for all-time
            percentile_10 REAL,
            percentile_25 REAL,
            percentile_50 REAL,         -- median
            percentile_75 REAL,
            percentile_90 REAL,
            percentile_95 REAL,
            percentile_99 REAL,
            mean_value REAL,
            std_dev REAL,
            iqr REAL,
            lower_fence REAL,           -- Q1 - 1.5*IQR
            upper_fence REAL,           -- Q3 + 1.5*IQR
            extreme_fence REAL,         -- Q3 + 3*IQR (far outlier)
            sample_count INTEGER,
            calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(sector_id, contract_type, year)
        )
    """)

    # Vendor price profiles
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendor_price_profiles (
            id INTEGER PRIMARY KEY,
            vendor_id INTEGER NOT NULL,
            sector_id INTEGER,          -- NULL for overall profile
            avg_contract_value REAL,
            median_contract_value REAL,
            min_contract_value REAL,
            max_contract_value REAL,
            std_dev REAL,
            contract_count INTEGER,
            first_contract_date DATE,
            last_contract_date DATE,
            price_trend VARCHAR(20),    -- 'increasing', 'stable', 'decreasing'
            trend_coefficient REAL,     -- Slope of price trend
            calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(vendor_id, sector_id)
        )
    """)

    # Hypothesis run metadata
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hypothesis_runs (
            id INTEGER PRIMARY KEY,
            run_id VARCHAR(50) UNIQUE NOT NULL,
            started_at TIMESTAMP NOT NULL,
            completed_at TIMESTAMP,
            contracts_analyzed INTEGER,
            hypotheses_generated INTEGER,
            parameters TEXT,  -- JSON config
            status VARCHAR(20) DEFAULT 'running',
            error_message TEXT
        )
    """)

    # Indexes
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_price_hypotheses_contract
        ON price_hypotheses(contract_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_price_hypotheses_type
        ON price_hypotheses(hypothesis_type)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_price_hypotheses_confidence
        ON price_hypotheses(confidence DESC)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_price_hypotheses_reviewed
        ON price_hypotheses(is_reviewed, is_valid)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_price_hypotheses_sector
        ON price_hypotheses(sector_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_sector_price_baselines_lookup
        ON sector_price_baselines(sector_id, contract_type, year)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_vendor_price_profiles_vendor
        ON vendor_price_profiles(vendor_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_vendor_price_profiles_sector
        ON vendor_price_profiles(vendor_id, sector_id)
    """)

    conn.commit()
    print("Price hypothesis schema created/verified")


# =============================================================================
# STATISTICAL FUNCTIONS
# =============================================================================

def percentile(sorted_values: List[float], p: float) -> float:
    """Calculate percentile from sorted values.

    Args:
        sorted_values: Pre-sorted list of numeric values
        p: Percentile (0-100)

    Returns:
        Value at the given percentile
    """
    if not sorted_values:
        return 0.0
    n = len(sorted_values)
    idx = int(p * n / 100)
    if idx >= n:
        idx = n - 1
    return sorted_values[idx]


def calculate_iqr_fences(values: List[float]) -> Tuple[float, float, float, float, float]:
    """Calculate IQR-based fences for outlier detection.

    Uses Tukey's method (1977) - the statistical standard for outlier detection.

    Args:
        values: List of numeric values (will be sorted)

    Returns:
        Tuple of (q1, median, q3, upper_fence, extreme_fence)
    """
    if not values:
        return (0, 0, 0, 0, 0)

    sorted_vals = sorted(values)
    q1 = percentile(sorted_vals, 25)
    median = percentile(sorted_vals, 50)
    q3 = percentile(sorted_vals, 75)
    iqr = q3 - q1

    upper_fence = q3 + 1.5 * iqr      # Mild outlier threshold
    extreme_fence = q3 + 3.0 * iqr    # Extreme outlier threshold

    return (q1, median, q3, upper_fence, extreme_fence)


def z_score(value: float, mean: float, std_dev: float) -> float:
    """Calculate z-score for a value.

    Args:
        value: The value to score
        mean: Population mean
        std_dev: Population standard deviation

    Returns:
        Z-score (number of standard deviations from mean)
    """
    if std_dev == 0:
        return 0.0
    return (value - mean) / std_dev


def confidence_from_ratio(ratio: float, mild: float = 1.5, extreme: float = 3.0) -> float:
    """Convert a price ratio to confidence score.

    Args:
        ratio: Price / median ratio
        mild: Threshold for low confidence
        extreme: Threshold for high confidence

    Returns:
        Confidence score (0-1)
    """
    if ratio <= mild:
        return 0.0
    elif ratio >= extreme:
        return 1.0
    else:
        # Linear interpolation
        return (ratio - mild) / (extreme - mild)


def get_confidence_level(confidence: float) -> str:
    """Convert numeric confidence to level string."""
    if confidence >= 0.85:
        return ConfidenceLevel.VERY_HIGH.value
    elif confidence >= 0.65:
        return ConfidenceLevel.HIGH.value
    elif confidence >= 0.45:
        return ConfidenceLevel.MEDIUM.value
    else:
        return ConfidenceLevel.LOW.value


# =============================================================================
# PRICE BASELINE CALCULATION
# =============================================================================

def calculate_sector_price_baselines(conn: sqlite3.Connection, year: Optional[int] = None):
    """Calculate price distribution baselines per sector.

    Args:
        conn: Database connection
        year: Specific year or None for all-time
    """
    cursor = conn.cursor()
    print(f"\nCalculating sector price baselines (year={year or 'all'})...")

    # Get amounts by sector
    if year:
        cursor.execute("""
            SELECT sector_id, amount_mxn
            FROM contracts
            WHERE sector_id IS NOT NULL
              AND amount_mxn > 0
              AND amount_mxn <= ?
              AND contract_year = ?
            ORDER BY sector_id, amount_mxn
        """, (MAX_CONTRACT_VALUE, year))
    else:
        cursor.execute("""
            SELECT sector_id, amount_mxn
            FROM contracts
            WHERE sector_id IS NOT NULL
              AND amount_mxn > 0
              AND amount_mxn <= ?
            ORDER BY sector_id, amount_mxn
        """, (MAX_CONTRACT_VALUE,))

    sector_amounts = defaultdict(list)
    for row in cursor.fetchall():
        sector_id, amount = row
        sector_amounts[sector_id].append(amount)

    # Calculate baselines per sector
    for sector_id, amounts in sector_amounts.items():
        amounts.sort()
        n = len(amounts)
        if n < 10:
            print(f"  Sector {sector_id}: Skipping (only {n} contracts)")
            continue

        mean_val = sum(amounts) / n
        variance = sum((x - mean_val) ** 2 for x in amounts) / n
        std_dev = variance ** 0.5

        p10 = percentile(amounts, 10)
        p25 = percentile(amounts, 25)
        p50 = percentile(amounts, 50)
        p75 = percentile(amounts, 75)
        p90 = percentile(amounts, 90)
        p95 = percentile(amounts, 95)
        p99 = percentile(amounts, 99)

        iqr = p75 - p25
        lower_fence = max(0, p25 - 1.5 * iqr)
        upper_fence = p75 + 1.5 * iqr
        extreme_fence = p75 + 3.0 * iqr

        # Upsert baseline
        cursor.execute("""
            INSERT INTO sector_price_baselines
            (sector_id, contract_type, year, percentile_10, percentile_25,
             percentile_50, percentile_75, percentile_90, percentile_95,
             percentile_99, mean_value, std_dev, iqr, lower_fence,
             upper_fence, extreme_fence, sample_count, calculated_at)
            VALUES (?, 'all', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(sector_id, contract_type, year)
            DO UPDATE SET
                percentile_10=excluded.percentile_10,
                percentile_25=excluded.percentile_25,
                percentile_50=excluded.percentile_50,
                percentile_75=excluded.percentile_75,
                percentile_90=excluded.percentile_90,
                percentile_95=excluded.percentile_95,
                percentile_99=excluded.percentile_99,
                mean_value=excluded.mean_value,
                std_dev=excluded.std_dev,
                iqr=excluded.iqr,
                lower_fence=excluded.lower_fence,
                upper_fence=excluded.upper_fence,
                extreme_fence=excluded.extreme_fence,
                sample_count=excluded.sample_count,
                calculated_at=excluded.calculated_at
        """, (
            sector_id, year, p10, p25, p50, p75, p90, p95, p99,
            mean_val, std_dev, iqr, lower_fence, upper_fence, extreme_fence,
            n, datetime.now().isoformat()
        ))

        print(f"  Sector {sector_id}: median={p50/1e6:.1f}M, upper_fence={upper_fence/1e9:.2f}B, "
              f"extreme_fence={extreme_fence/1e9:.2f}B ({n:,} contracts)")

    conn.commit()
    print(f"Completed: {len(sector_amounts)} sectors processed")


def calculate_vendor_price_profiles(conn: sqlite3.Connection):
    """Calculate price profiles for each vendor."""
    cursor = conn.cursor()
    print("\nCalculating vendor price profiles...")

    # Get vendor contract stats
    cursor.execute("""
        SELECT
            vendor_id,
            sector_id,
            COUNT(*) as contract_count,
            AVG(amount_mxn) as avg_amount,
            MIN(amount_mxn) as min_amount,
            MAX(amount_mxn) as max_amount,
            MIN(contract_date) as first_contract,
            MAX(contract_date) as last_contract
        FROM contracts
        WHERE vendor_id IS NOT NULL
          AND amount_mxn > 0
          AND amount_mxn <= ?
        GROUP BY vendor_id, sector_id
        HAVING COUNT(*) >= 3
    """, (MAX_CONTRACT_VALUE,))

    rows = cursor.fetchall()
    print(f"  Processing {len(rows)} vendor-sector combinations...")

    batch_size = 5000
    processed = 0

    for row in rows:
        vendor_id, sector_id, count, avg, min_val, max_val, first_date, last_date = row

        # Get all amounts for this vendor-sector to calculate std dev and median
        cursor.execute("""
            SELECT amount_mxn
            FROM contracts
            WHERE vendor_id = ? AND sector_id = ?
              AND amount_mxn > 0 AND amount_mxn <= ?
            ORDER BY amount_mxn
        """, (vendor_id, sector_id, MAX_CONTRACT_VALUE))

        amounts = [r[0] for r in cursor.fetchall()]
        median = percentile(amounts, 50) if amounts else 0

        # Standard deviation
        if len(amounts) > 1:
            variance = sum((x - avg) ** 2 for x in amounts) / len(amounts)
            std_dev = variance ** 0.5
        else:
            std_dev = 0

        # Simple price trend (compare first half to second half)
        if len(amounts) >= 4:
            first_half_avg = sum(amounts[:len(amounts)//2]) / (len(amounts)//2)
            second_half_avg = sum(amounts[len(amounts)//2:]) / (len(amounts) - len(amounts)//2)
            if second_half_avg > first_half_avg * 1.1:
                trend = 'increasing'
                trend_coef = (second_half_avg - first_half_avg) / first_half_avg
            elif second_half_avg < first_half_avg * 0.9:
                trend = 'decreasing'
                trend_coef = (second_half_avg - first_half_avg) / first_half_avg
            else:
                trend = 'stable'
                trend_coef = 0
        else:
            trend = 'insufficient_data'
            trend_coef = 0

        cursor.execute("""
            INSERT INTO vendor_price_profiles
            (vendor_id, sector_id, avg_contract_value, median_contract_value,
             min_contract_value, max_contract_value, std_dev, contract_count,
             first_contract_date, last_contract_date, price_trend, trend_coefficient,
             calculated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(vendor_id, sector_id)
            DO UPDATE SET
                avg_contract_value=excluded.avg_contract_value,
                median_contract_value=excluded.median_contract_value,
                min_contract_value=excluded.min_contract_value,
                max_contract_value=excluded.max_contract_value,
                std_dev=excluded.std_dev,
                contract_count=excluded.contract_count,
                first_contract_date=excluded.first_contract_date,
                last_contract_date=excluded.last_contract_date,
                price_trend=excluded.price_trend,
                trend_coefficient=excluded.trend_coefficient,
                calculated_at=excluded.calculated_at
        """, (
            vendor_id, sector_id, avg, median, min_val, max_val, std_dev, count,
            first_date, last_date, trend, trend_coef, datetime.now().isoformat()
        ))

        processed += 1
        if processed % batch_size == 0:
            conn.commit()
            print(f"  Processed {processed:,} vendor profiles...")

    conn.commit()
    print(f"Completed: {processed:,} vendor price profiles")


# =============================================================================
# HYPOTHESIS GENERATION
# =============================================================================

class PriceHypothesisEngine:
    """Engine for generating price manipulation hypotheses."""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.cursor = conn.cursor()
        self.sector_baselines = {}
        self.hypothesis_counter = 0
        self.run_id = datetime.now().strftime('%Y%m%d_%H%M%S')

    def load_baselines(self):
        """Load sector price baselines into memory."""
        self.cursor.execute("""
            SELECT sector_id, percentile_50, percentile_75, percentile_95,
                   upper_fence, extreme_fence, mean_value, std_dev, sample_count
            FROM sector_price_baselines
            WHERE contract_type = 'all' AND year IS NULL
        """)

        for row in self.cursor.fetchall():
            sector_id = row[0]
            self.sector_baselines[sector_id] = {
                'median': row[1],
                'p75': row[2],
                'p95': row[3],
                'upper_fence': row[4],
                'extreme_fence': row[5],
                'mean': row[6],
                'std_dev': row[7],
                'sample_count': row[8]
            }

        print(f"Loaded baselines for {len(self.sector_baselines)} sectors")

    def generate_hypothesis_id(self, hypothesis_type: str) -> str:
        """Generate a unique hypothesis ID."""
        self.hypothesis_counter += 1
        type_code = hypothesis_type.upper()[:4]
        return f"PRICE-{type_code}-{self.run_id}-{self.hypothesis_counter:06d}"

    def analyze_contract(self, contract: Dict) -> List[PriceHypothesis]:
        """Analyze a single contract for price anomalies.

        Args:
            contract: Dictionary with contract data

        Returns:
            List of PriceHypothesis objects
        """
        hypotheses = []

        contract_id = contract['id']
        amount = contract.get('amount_mxn', 0)
        sector_id = contract.get('sector_id')
        vendor_id = contract.get('vendor_id')

        # Skip invalid amounts
        if not amount or amount <= 0 or amount > MAX_CONTRACT_VALUE:
            return hypotheses

        # Get sector baseline
        baseline = self.sector_baselines.get(sector_id, {})
        median = baseline.get('median', 0)
        upper_fence = baseline.get('upper_fence', 0)
        extreme_fence = baseline.get('extreme_fence', 0)

        # 1. Statistical Outlier Detection (IQR method)
        if median > 0:
            ratio = amount / median

            if amount > extreme_fence and extreme_fence > 0:
                # Extreme outlier
                confidence = min(0.95, 0.70 + (ratio - 3.0) * 0.05)
                hypotheses.append(self._create_extreme_overpricing_hypothesis(
                    contract, baseline, ratio, confidence
                ))

            elif amount > upper_fence and upper_fence > 0:
                # Mild outlier
                confidence = confidence_from_ratio(ratio, 1.5, 3.0)
                if confidence >= 0.4:  # Only flag if meaningful confidence
                    hypotheses.append(self._create_statistical_outlier_hypothesis(
                        contract, baseline, ratio, confidence
                    ))

        # 2. Round Number Analysis
        round_hypothesis = self._check_round_number(contract)
        if round_hypothesis:
            hypotheses.append(round_hypothesis)

        # 3. Vendor Price History Check (if we have history)
        vendor_hypothesis = self._check_vendor_price_history(contract)
        if vendor_hypothesis:
            hypotheses.append(vendor_hypothesis)

        return hypotheses

    def _create_extreme_overpricing_hypothesis(
        self, contract: Dict, baseline: Dict, ratio: float, confidence: float
    ) -> PriceHypothesis:
        """Create hypothesis for extreme overpricing."""
        amount = contract['amount_mxn']
        median = baseline['median']
        p95 = baseline.get('p95', median * 2)

        explanation = (
            f"Contract amount ({amount/1e6:.1f}M MXN) exceeds sector extreme threshold "
            f"({baseline['extreme_fence']/1e6:.1f}M MXN) by {(ratio-1)*100:.0f}%. "
            f"The sector median is {median/1e6:.1f}M MXN. "
            f"This contract is {ratio:.1f}x the typical value."
        )

        evidence = [
            Evidence(
                evidence_type="sector_comparison",
                description="Contract vs sector median",
                value=amount,
                comparison_value=median,
                source="sector_price_baselines"
            ),
            Evidence(
                evidence_type="statistical_threshold",
                description="Exceeds Q3 + 3*IQR (extreme outlier)",
                value=amount,
                comparison_value=baseline['extreme_fence'],
                source="Tukey (1977) IQR method"
            ),
            Evidence(
                evidence_type="percentile_rank",
                description=f"Above 99th percentile for sector",
                value=ratio,
                source="sector_price_baselines"
            )
        ]

        return PriceHypothesis(
            hypothesis_id=self.generate_hypothesis_id("extreme"),
            contract_id=contract['id'],
            hypothesis_type=HypothesisType.EXTREME_OVERPRICING.value,
            confidence=confidence,
            confidence_level=get_confidence_level(confidence),
            explanation=explanation,
            supporting_evidence=[asdict(e) for e in evidence],
            recommended_action="Review contract justification and pricing methodology. Compare to similar contracts.",
            literature_reference="EU OLAF Red Flags Library; Tukey (1977) Exploratory Data Analysis; IMF WP/2022/094",
            sector_id=contract.get('sector_id'),
            vendor_id=contract.get('vendor_id'),
            amount_mxn=amount,
            created_at=datetime.now().isoformat()
        )

    def _create_statistical_outlier_hypothesis(
        self, contract: Dict, baseline: Dict, ratio: float, confidence: float
    ) -> PriceHypothesis:
        """Create hypothesis for statistical outlier."""
        amount = contract['amount_mxn']
        median = baseline['median']

        explanation = (
            f"Contract amount ({amount/1e6:.1f}M MXN) is a statistical outlier, "
            f"exceeding the upper fence ({baseline['upper_fence']/1e6:.1f}M MXN) "
            f"based on IQR analysis. The sector median is {median/1e6:.1f}M MXN "
            f"({ratio:.1f}x ratio)."
        )

        evidence = [
            Evidence(
                evidence_type="sector_comparison",
                description="Contract vs sector median",
                value=amount,
                comparison_value=median,
                source="sector_price_baselines"
            ),
            Evidence(
                evidence_type="statistical_threshold",
                description="Exceeds Q3 + 1.5*IQR (mild outlier)",
                value=amount,
                comparison_value=baseline['upper_fence'],
                source="Tukey (1977) IQR method"
            )
        ]

        return PriceHypothesis(
            hypothesis_id=self.generate_hypothesis_id("outlier"),
            contract_id=contract['id'],
            hypothesis_type=HypothesisType.STATISTICAL_OUTLIER.value,
            confidence=confidence,
            confidence_level=get_confidence_level(confidence),
            explanation=explanation,
            supporting_evidence=[asdict(e) for e in evidence],
            recommended_action="Review for unusual scope or specifications that may justify higher price.",
            literature_reference="Tukey (1977) Exploratory Data Analysis; OECD Procurement Performance",
            sector_id=contract.get('sector_id'),
            vendor_id=contract.get('vendor_id'),
            amount_mxn=amount,
            created_at=datetime.now().isoformat()
        )

    def _check_round_number(self, contract: Dict) -> Optional[PriceHypothesis]:
        """Check if contract amount is suspiciously round.

        Round numbers can indicate:
        - Arbitrary pricing (not based on actual costs)
        - Budget allocation artifacts
        - Potential bid manipulation

        Note: This is a WEAK indicator and requires corroborating evidence.
        """
        amount = contract['amount_mxn']

        for threshold in ROUND_NUMBER_PATTERNS:
            # Check if amount is exactly at or very close to round number
            if abs(amount - threshold) / threshold < 0.001:  # Within 0.1%
                # Only flag if it's a suspiciously large round number
                if threshold >= 10_000_000:  # >= 10M MXN
                    confidence = 0.35  # Low confidence - needs corroboration

                    evidence = [
                        Evidence(
                            evidence_type="round_number",
                            description=f"Amount exactly matches {threshold/1e6:.0f}M MXN",
                            value=amount,
                            comparison_value=threshold,
                            source="Forensic accounting pattern"
                        )
                    ]

                    return PriceHypothesis(
                        hypothesis_id=self.generate_hypothesis_id("round"),
                        contract_id=contract['id'],
                        hypothesis_type=HypothesisType.ROUND_NUMBER_SUSPICIOUS.value,
                        confidence=confidence,
                        confidence_level=get_confidence_level(confidence),
                        explanation=(
                            f"Contract amount ({amount/1e6:.0f}M MXN) is exactly a round number, "
                            f"which may indicate arbitrary pricing rather than cost-based estimation. "
                            f"This is a weak indicator that requires corroborating evidence."
                        ),
                        supporting_evidence=[asdict(e) for e in evidence],
                        recommended_action="Check for corroborating evidence (other risk factors, vendor history).",
                        literature_reference="Forensic Accounting: Round Number Analysis; ACFE Fraud Indicators",
                        sector_id=contract.get('sector_id'),
                        vendor_id=contract.get('vendor_id'),
                        amount_mxn=amount,
                        created_at=datetime.now().isoformat()
                    )

        return None

    def _check_vendor_price_history(self, contract: Dict) -> Optional[PriceHypothesis]:
        """Check if contract price is anomalous for this vendor's history."""
        vendor_id = contract.get('vendor_id')
        sector_id = contract.get('sector_id')
        amount = contract['amount_mxn']

        if not vendor_id or not sector_id:
            return None

        # Get vendor's price profile for this sector
        self.cursor.execute("""
            SELECT avg_contract_value, median_contract_value, std_dev, contract_count
            FROM vendor_price_profiles
            WHERE vendor_id = ? AND sector_id = ?
        """, (vendor_id, sector_id))

        row = self.cursor.fetchone()
        if not row or row[3] < 5:  # Need at least 5 contracts for meaningful comparison
            return None

        avg_val, median_val, std_dev, count = row

        # Check if this contract is significantly above vendor's historical prices
        if median_val > 0 and std_dev > 0:
            z = z_score(amount, avg_val, std_dev)

            if z > 2.5:  # More than 2.5 standard deviations above mean
                ratio = amount / median_val
                confidence = min(0.85, 0.50 + (z - 2.5) * 0.10)

                evidence = [
                    Evidence(
                        evidence_type="vendor_history",
                        description=f"Vendor's typical contract: {median_val/1e6:.1f}M MXN",
                        value=amount,
                        comparison_value=median_val,
                        source="vendor_price_profiles"
                    ),
                    Evidence(
                        evidence_type="z_score",
                        description=f"Z-score: {z:.2f} (>{2.5} threshold)",
                        value=z,
                        comparison_value=2.5,
                        source="Statistical analysis"
                    ),
                    Evidence(
                        evidence_type="historical_contracts",
                        description=f"Based on {count} historical contracts",
                        value=count,
                        source="vendor_price_profiles"
                    )
                ]

                return PriceHypothesis(
                    hypothesis_id=self.generate_hypothesis_id("vendor"),
                    contract_id=contract['id'],
                    hypothesis_type=HypothesisType.VENDOR_PRICE_ANOMALY.value,
                    confidence=confidence,
                    confidence_level=get_confidence_level(confidence),
                    explanation=(
                        f"This contract ({amount/1e6:.1f}M MXN) is {ratio:.1f}x the vendor's "
                        f"typical contract value ({median_val/1e6:.1f}M MXN). "
                        f"Based on {count} historical contracts, this is {z:.1f} standard "
                        f"deviations above their average."
                    ),
                    supporting_evidence=[asdict(e) for e in evidence],
                    recommended_action="Verify scope expansion or unusual requirements justify price increase.",
                    literature_reference="ARACHNE Vendor Pattern Analysis; IMF WP/2022/094 Section 3.2",
                    sector_id=sector_id,
                    vendor_id=vendor_id,
                    amount_mxn=amount,
                    created_at=datetime.now().isoformat()
                )

        return None

    def run_analysis(
        self,
        sector_ids: Optional[List[int]] = None,
        year: Optional[int] = None,
        min_amount: float = 1_000_000,  # 1M MXN minimum
        limit: Optional[int] = None
    ) -> Dict:
        """Run hypothesis generation on contracts.

        Args:
            sector_ids: Filter to specific sectors
            year: Filter to specific year
            min_amount: Minimum contract amount to analyze
            limit: Maximum contracts to analyze

        Returns:
            Summary statistics
        """
        print(f"\nStarting hypothesis generation run {self.run_id}")

        # Record run start
        self.cursor.execute("""
            INSERT INTO hypothesis_runs (run_id, started_at, parameters, status)
            VALUES (?, ?, ?, 'running')
        """, (
            self.run_id,
            datetime.now().isoformat(),
            json.dumps({
                'sector_ids': sector_ids,
                'year': year,
                'min_amount': min_amount,
                'limit': limit
            })
        ))
        self.conn.commit()

        # Load baselines
        self.load_baselines()

        if not self.sector_baselines:
            print("ERROR: No sector baselines found. Run calculate_sector_price_baselines first.")
            return {'error': 'No sector baselines available'}

        # Build query
        query = """
            SELECT id, amount_mxn, sector_id, vendor_id, institution_id,
                   contract_date, contract_year
            FROM contracts
            WHERE amount_mxn > ?
              AND amount_mxn <= ?
              AND sector_id IS NOT NULL
        """
        params = [min_amount, MAX_CONTRACT_VALUE]

        if sector_ids:
            placeholders = ','.join('?' * len(sector_ids))
            query += f" AND sector_id IN ({placeholders})"
            params.extend(sector_ids)

        if year:
            query += " AND contract_year = ?"
            params.append(year)

        query += " ORDER BY amount_mxn DESC"

        if limit:
            query += " LIMIT ?"
            params.append(limit)

        self.cursor.execute(query, params)
        contracts = self.cursor.fetchall()

        print(f"Analyzing {len(contracts):,} contracts...")

        hypotheses_generated = 0
        batch_size = 1000
        processed = 0

        for row in contracts:
            contract = {
                'id': row[0],
                'amount_mxn': row[1],
                'sector_id': row[2],
                'vendor_id': row[3],
                'institution_id': row[4],
                'contract_date': row[5],
                'contract_year': row[6]
            }

            hypotheses = self.analyze_contract(contract)

            for h in hypotheses:
                self._save_hypothesis(h)
                hypotheses_generated += 1

            processed += 1
            if processed % batch_size == 0:
                self.conn.commit()
                print(f"  Processed {processed:,} contracts, {hypotheses_generated} hypotheses...")

        # Final commit and update run record
        self.conn.commit()

        self.cursor.execute("""
            UPDATE hypothesis_runs
            SET completed_at = ?, contracts_analyzed = ?,
                hypotheses_generated = ?, status = 'completed'
            WHERE run_id = ?
        """, (
            datetime.now().isoformat(),
            processed,
            hypotheses_generated,
            self.run_id
        ))
        self.conn.commit()

        summary = {
            'run_id': self.run_id,
            'contracts_analyzed': processed,
            'hypotheses_generated': hypotheses_generated,
            'status': 'completed'
        }

        print(f"\nCompleted: {hypotheses_generated} hypotheses from {processed:,} contracts")
        return summary

    def _save_hypothesis(self, hypothesis: PriceHypothesis):
        """Save a hypothesis to the database."""
        self.cursor.execute("""
            INSERT INTO price_hypotheses
            (hypothesis_id, contract_id, hypothesis_type, confidence,
             confidence_level, explanation, supporting_evidence,
             recommended_action, literature_reference, sector_id,
             vendor_id, amount_mxn, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(hypothesis_id) DO NOTHING
        """, (
            hypothesis.hypothesis_id,
            hypothesis.contract_id,
            hypothesis.hypothesis_type,
            hypothesis.confidence,
            hypothesis.confidence_level,
            hypothesis.explanation,
            json.dumps(hypothesis.supporting_evidence),
            hypothesis.recommended_action,
            hypothesis.literature_reference,
            hypothesis.sector_id,
            hypothesis.vendor_id,
            hypothesis.amount_mxn,
            hypothesis.created_at
        ))


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Run price hypothesis engine."""
    import argparse

    parser = argparse.ArgumentParser(description='Price Manipulation Hypothesis Engine')
    parser.add_argument('--calculate-baselines', action='store_true',
                       help='Calculate sector price baselines')
    parser.add_argument('--calculate-profiles', action='store_true',
                       help='Calculate vendor price profiles')
    parser.add_argument('--run-analysis', action='store_true',
                       help='Run hypothesis generation')
    parser.add_argument('--sector', type=int, help='Filter to specific sector')
    parser.add_argument('--year', type=int, help='Filter to specific year')
    parser.add_argument('--limit', type=int, help='Limit contracts to analyze')
    parser.add_argument('--all', action='store_true',
                       help='Run all steps (baselines, profiles, analysis)')

    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Ensure schema exists
    ensure_schema(conn)

    if args.all or args.calculate_baselines:
        calculate_sector_price_baselines(conn)
        if args.year:
            calculate_sector_price_baselines(conn, year=args.year)

    if args.all or args.calculate_profiles:
        calculate_vendor_price_profiles(conn)

    if args.all or args.run_analysis:
        engine = PriceHypothesisEngine(conn)

        sector_ids = [args.sector] if args.sector else None
        result = engine.run_analysis(
            sector_ids=sector_ids,
            year=args.year,
            limit=args.limit
        )

        print("\n" + "="*60)
        print("ANALYSIS SUMMARY")
        print("="*60)
        for key, value in result.items():
            print(f"  {key}: {value}")

    conn.close()


if __name__ == '__main__':
    main()
