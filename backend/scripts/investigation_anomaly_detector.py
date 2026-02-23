"""
Investigation Anomaly Detector
==============================
Uses Isolation Forest ML to detect multi-dimensional anomalies in vendor behavior.
Combines ML scores with rule-based signals for ensemble scoring.

Algorithm:
1. Load vendor features from vendor_investigation_features
2. Scale features for ML
3. Run Isolation Forest to identify anomalous vendors
4. Calculate ensemble score combining ML + risk + price + network signals
5. Update database with anomaly scores

Target Sectors: Salud (1), Infraestructura (3)

Author: RUBLI Project
Date: 2026-02-03
"""

import sqlite3
import os
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Optional

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    print("Warning: scikit-learn not installed. Using fallback anomaly detection.")

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False
    print("Warning: SHAP not installed. Explanations will not be generated.")

import json

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')

# Isolation Forest parameters
CONTAMINATION = 0.05  # Expect ~5% of vendors are anomalous
N_ESTIMATORS = 200    # Number of trees
RANDOM_STATE = 42     # Reproducibility

# Ensemble weights
ENSEMBLE_WEIGHTS = {
    'isolation_forest_score': 0.30,   # ML anomaly score
    'risk_score_percentile': 0.25,    # Existing risk model
    'price_hypothesis_score': 0.20,   # Price anomalies
    'network_score': 0.15,            # Network position
    'temporal_anomaly': 0.10,         # Timing patterns
}

# Features to use for Isolation Forest
ML_FEATURES = [
    'total_contracts',
    'total_value_mxn',
    'avg_contract_value',
    'contract_value_cv',
    'avg_risk_score',
    'max_risk_score',
    'high_risk_ratio',
    'direct_award_ratio',
    'single_bid_ratio',
    'price_hypothesis_count',
    'high_conf_hypothesis_count',
    'avg_price_ratio',
    'december_ratio',
    'q4_ratio',
    'contract_velocity',
    'institution_hhi',
    'top_institution_ratio',
    'sector_concentration',
    'co_bidder_count',
    'network_cluster_size',
    'sudden_growth_indicator',
]


def run_anomaly_detection(sector_ids: Optional[List[int]] = None) -> int:
    """
    Run anomaly detection for specified sectors.

    Returns:
        Number of vendors processed
    """
    if sector_ids is None:
        sector_ids = [1, 3]  # Salud, Infraestructura

    print(f"Starting anomaly detection for sectors: {sector_ids}")
    print(f"Database: {DB_PATH}")
    print(f"Using Isolation Forest: {HAS_SKLEARN}")
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    total_processed = 0

    for sector_id in sector_ids:
        cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
        sector_name = cursor.fetchone()[0]
        print(f"\n{'='*60}")
        print(f"Processing Sector: {sector_name} (ID={sector_id})")
        print(f"{'='*60}")

        processed = process_sector_anomalies(cursor, sector_id)
        conn.commit()
        total_processed += processed

    # Print summary
    print_anomaly_summary(cursor, sector_ids)

    conn.close()
    return total_processed


def process_sector_anomalies(cursor: sqlite3.Cursor, sector_id: int) -> int:
    """
    Process anomaly detection for a single sector.
    """
    # Load feature data
    print("Loading feature data...")
    feature_cols = ', '.join(ML_FEATURES)
    cursor.execute(f"""
        SELECT id, vendor_id, {feature_cols}
        FROM vendor_investigation_features
        WHERE sector_id = ?
    """, (sector_id,))

    rows = cursor.fetchall()
    if not rows:
        print("  No vendors found for this sector")
        return 0

    print(f"  Loaded {len(rows):,} vendors")

    # Extract data into numpy arrays
    ids = [r['id'] for r in rows]
    vendor_ids = [r['vendor_id'] for r in rows]

    # Build feature matrix
    X = []
    for row in rows:
        features = [float(row[f] or 0) for f in ML_FEATURES]
        X.append(features)
    X = np.array(X)

    print(f"  Feature matrix shape: {X.shape}")

    # Handle NaN/Inf values
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    # Run Isolation Forest
    shap_values = None
    clf = None
    scaler = None

    if HAS_SKLEARN:
        print("Running Isolation Forest...")
        if_scores, shap_values, clf, scaler = run_isolation_forest(X, ML_FEATURES)
    else:
        print("Running fallback anomaly detection...")
        if_scores = run_fallback_detection(X)

    print(f"  Anomaly scores calculated: min={if_scores.min():.3f}, max={if_scores.max():.3f}")

    # Get sector statistics for contextualizing explanations
    sector_stats = {}
    if shap_values is not None:
        print("  Calculating sector statistics for explanations...")
        sector_stats = get_sector_feature_stats(cursor, sector_id, ML_FEATURES)

    # Calculate component scores for ensemble
    print("Calculating ensemble scores...")

    # 1. Risk score percentile
    cursor.execute("""
        SELECT vendor_id, avg_risk_score
        FROM vendor_investigation_features
        WHERE sector_id = ?
    """, (sector_id,))
    risk_scores = {r['vendor_id']: r['avg_risk_score'] or 0 for r in cursor.fetchall()}
    risk_vals = list(risk_scores.values())
    risk_percentiles = calculate_percentiles(risk_vals)

    # 2. Price hypothesis score
    cursor.execute("""
        SELECT vendor_id, high_conf_hypothesis_count, total_contracts
        FROM vendor_investigation_features
        WHERE sector_id = ?
    """, (sector_id,))
    price_scores = {}
    for r in cursor.fetchall():
        hyp_ratio = (r['high_conf_hypothesis_count'] or 0) / max(1, r['total_contracts'])
        price_scores[r['vendor_id']] = min(1.0, hyp_ratio * 5)  # Scale to 0-1

    # 3. Network score
    cursor.execute("""
        SELECT vendor_id, network_cluster_size, co_bidder_count
        FROM vendor_investigation_features
        WHERE sector_id = ?
    """, (sector_id,))
    network_scores = {}
    for r in cursor.fetchall():
        # High network activity can be suspicious
        cluster = r['network_cluster_size'] or 0
        co_bid = r['co_bidder_count'] or 0
        network_scores[r['vendor_id']] = min(1.0, (cluster + co_bid) / 100)

    # 4. Temporal anomaly score
    cursor.execute("""
        SELECT vendor_id, december_ratio, q4_ratio, sudden_growth_indicator
        FROM vendor_investigation_features
        WHERE sector_id = ?
    """, (sector_id,))
    temporal_scores = {}
    for r in cursor.fetchall():
        dec = r['december_ratio'] or 0
        q4 = r['q4_ratio'] or 0
        growth = min(1.0, (r['sudden_growth_indicator'] or 0) / 5)
        # Year-end concentration is suspicious
        temporal_scores[r['vendor_id']] = min(1.0, dec * 2 + (q4 - 0.25) * 2 + growth * 0.5)

    # Calculate ensemble scores
    ensemble_scores = []
    for i, vid in enumerate(vendor_ids):
        if_score = if_scores[i]
        risk_pct = risk_percentiles.get(risk_scores.get(vid, 0), 0)
        price_s = price_scores.get(vid, 0)
        network_s = network_scores.get(vid, 0)
        temporal_s = temporal_scores.get(vid, 0)

        ensemble = (
            ENSEMBLE_WEIGHTS['isolation_forest_score'] * if_score +
            ENSEMBLE_WEIGHTS['risk_score_percentile'] * risk_pct +
            ENSEMBLE_WEIGHTS['price_hypothesis_score'] * price_s +
            ENSEMBLE_WEIGHTS['network_score'] * network_s +
            ENSEMBLE_WEIGHTS['temporal_anomaly'] * max(0, temporal_s)
        )
        ensemble_scores.append(min(1.0, max(0.0, ensemble)))

    # Update database with scores and explanations
    print("Updating database...")
    for i, row_id in enumerate(ids):
        vid = vendor_ids[i]

        # Generate explanation if SHAP values available
        shap_json = None
        top_features_json = None
        explanation_text = None

        if shap_values is not None:
            # Get feature values for this vendor
            feature_values = {ML_FEATURES[j]: float(X[i, j]) for j in range(len(ML_FEATURES))}

            shap_dict, top_features, explanation_text = generate_vendor_explanation(
                vid,
                shap_values[i],
                ML_FEATURES,
                feature_values,
                sector_stats,
                top_n=5
            )
            shap_json = json.dumps(shap_dict)
            top_features_json = json.dumps(top_features)

        cursor.execute("""
            UPDATE vendor_investigation_features
            SET isolation_forest_score = ?,
                anomaly_score = ?,
                ensemble_score = ?,
                shap_values = ?,
                top_features = ?,
                explanation = ?
            WHERE id = ?
        """, (
            float(if_scores[i]),
            float(if_scores[i]),  # anomaly_score = raw IF score
            float(ensemble_scores[i]),
            shap_json,
            top_features_json,
            explanation_text,
            row_id
        ))

    # Calculate network centrality approximation
    print("Calculating network centrality...")
    cursor.execute(f"""
        UPDATE vendor_investigation_features
        SET network_centrality = CAST(co_bidder_count AS REAL) / (
            SELECT MAX(co_bidder_count) FROM vendor_investigation_features WHERE sector_id = ?
        )
        WHERE sector_id = ?
    """, (sector_id, sector_id))

    print(f"  Updated {len(ids):,} vendor records")

    # Print top anomalies
    print("\n  Top 10 Anomalous Vendors:")
    sorted_indices = np.argsort(ensemble_scores)[::-1][:10]
    for idx in sorted_indices:
        vid = vendor_ids[idx]
        cursor.execute("SELECT name FROM vendors WHERE id = ?", (vid,))
        name = cursor.fetchone()[0]
        name = name[:40] + "..." if len(name) > 43 else name
        print(f"    {name:<45} score={ensemble_scores[idx]:.3f} IF={if_scores[idx]:.3f}")

    return len(ids)


def run_isolation_forest(X: np.ndarray, feature_names: List[str] = None) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[IsolationForest], Optional[StandardScaler]]:
    """
    Run Isolation Forest and return normalized anomaly scores (0-1).
    Higher = more anomalous.

    Returns:
        Tuple of (normalized_scores, shap_values, model, scaler)
        shap_values is None if SHAP is not available
    """
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Run Isolation Forest
    clf = IsolationForest(
        n_estimators=N_ESTIMATORS,
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
        n_jobs=-1
    )

    # fit_predict returns -1 for anomalies, 1 for normal
    clf.fit(X_scaled)

    # decision_function returns raw anomaly scores
    # More negative = more anomalous
    raw_scores = clf.decision_function(X_scaled)

    # Normalize to 0-1 where 1 = most anomalous
    # decision_function returns negative for anomalies
    min_score = raw_scores.min()
    max_score = raw_scores.max()

    if max_score == min_score:
        normalized = np.zeros_like(raw_scores)
    else:
        # Invert so that higher = more anomalous
        normalized = 1 - (raw_scores - min_score) / (max_score - min_score)

    # Calculate SHAP values for explainability
    shap_values = None
    if HAS_SHAP:
        try:
            print("  Calculating SHAP explanations...")
            explainer = shap.TreeExplainer(clf)
            shap_values = explainer.shap_values(X_scaled)
            print(f"    SHAP values shape: {shap_values.shape}")
        except Exception as e:
            print(f"    Warning: SHAP calculation failed: {e}")
            shap_values = None

    return normalized, shap_values, clf, scaler


def run_fallback_detection(X: np.ndarray) -> np.ndarray:
    """
    Fallback anomaly detection using z-scores when sklearn not available.
    """
    # Calculate mean and std for each feature
    means = np.mean(X, axis=0)
    stds = np.std(X, axis=0) + 1e-10  # Avoid division by zero

    # Z-scores
    z_scores = np.abs((X - means) / stds)

    # Anomaly score = mean of z-scores across features
    anomaly_scores = np.mean(z_scores, axis=1)

    # Normalize to 0-1
    max_score = anomaly_scores.max()
    if max_score > 0:
        anomaly_scores = anomaly_scores / max_score

    return anomaly_scores


def calculate_percentiles(values: List[float]) -> Dict[float, float]:
    """
    Calculate percentile ranks for a list of values.
    Returns dict mapping value -> percentile (0-1).
    """
    sorted_vals = sorted(set(values))
    n = len(sorted_vals)
    percentiles = {}
    for i, v in enumerate(sorted_vals):
        percentiles[v] = (i + 1) / n
    return percentiles


def generate_vendor_explanation(
    vendor_id: int,
    shap_values_row: np.ndarray,
    feature_names: List[str],
    feature_values: Dict[str, float],
    sector_stats: Dict[str, Dict[str, float]],
    top_n: int = 5
) -> Tuple[Dict[str, float], List[Dict], str]:
    """
    Generate human-readable explanation for a vendor's anomaly score.

    Args:
        vendor_id: The vendor ID
        shap_values_row: SHAP values for this vendor (1D array)
        feature_names: List of feature names matching SHAP array order
        feature_values: Dict of feature_name -> actual value for this vendor
        sector_stats: Dict of feature_name -> {mean, median, std, p25, p75} for sector
        top_n: Number of top features to include in explanation

    Returns:
        Tuple of (shap_dict, top_features_list, explanation_text)
    """
    # Create SHAP values dict
    shap_dict = {name: float(shap_values_row[i]) for i, name in enumerate(feature_names)}

    # Sort by absolute SHAP value to find top contributors
    sorted_features = sorted(
        [(name, shap_dict[name], feature_values.get(name, 0))
         for name in feature_names],
        key=lambda x: abs(x[1]),
        reverse=True
    )

    # Build top features list with context
    top_features = []
    for feature_name, shap_val, actual_val in sorted_features[:top_n]:
        stats = sector_stats.get(feature_name, {})
        sector_mean = stats.get('mean', 0)
        sector_median = stats.get('median', 0)

        # Determine comparison text
        if sector_median > 0:
            ratio = actual_val / sector_median if sector_median else 0
            if ratio > 2:
                comparison = f"{ratio:.1f}x sector median"
            elif ratio > 1.5:
                comparison = f"{(ratio-1)*100:.0f}% above sector median"
            elif ratio < 0.5:
                comparison = f"{(1-ratio)*100:.0f}% below sector median"
            else:
                comparison = "near sector median"
        else:
            comparison = f"value: {actual_val:.2f}"

        top_features.append({
            'feature': feature_name,
            'contribution': round(shap_val, 4),
            'value': round(actual_val, 4) if actual_val else 0,
            'sector_median': round(sector_median, 4) if sector_median else 0,
            'comparison': comparison
        })

    # Generate human-readable explanation
    explanation_lines = ["This vendor was flagged based on:"]
    for i, tf in enumerate(top_features, 1):
        feature_display = tf['feature'].replace('_', ' ').title()
        direction = "+" if tf['contribution'] > 0 else ""
        explanation_lines.append(
            f"  {i}. **{feature_display}**: {direction}{tf['contribution']:.3f} ({tf['comparison']})"
        )

    explanation_text = "\n".join(explanation_lines)

    return shap_dict, top_features, explanation_text


def get_sector_feature_stats(cursor: sqlite3.Cursor, sector_id: int, feature_names: List[str]) -> Dict[str, Dict[str, float]]:
    """
    Calculate sector-level statistics for each feature.
    Used for contextualizing individual vendor values.
    """
    stats = {}

    for feature in feature_names:
        cursor.execute(f"""
            SELECT
                AVG({feature}) as mean,
                MAX({feature}) as max_val,
                MIN({feature}) as min_val
            FROM vendor_investigation_features
            WHERE sector_id = ? AND {feature} IS NOT NULL
        """, (sector_id,))
        row = cursor.fetchone()

        # Get median (SQLite doesn't have built-in median)
        cursor.execute(f"""
            SELECT {feature}
            FROM vendor_investigation_features
            WHERE sector_id = ? AND {feature} IS NOT NULL
            ORDER BY {feature}
            LIMIT 1 OFFSET (
                SELECT COUNT(*) / 2 FROM vendor_investigation_features
                WHERE sector_id = ? AND {feature} IS NOT NULL
            )
        """, (sector_id, sector_id))
        median_row = cursor.fetchone()
        median = median_row[0] if median_row else 0

        # Calculate std dev approximation
        mean = row['mean'] or 0
        cursor.execute(f"""
            SELECT AVG(({feature} - ?) * ({feature} - ?)) as variance
            FROM vendor_investigation_features
            WHERE sector_id = ? AND {feature} IS NOT NULL
        """, (mean, mean, sector_id))
        var_row = cursor.fetchone()
        std = (var_row['variance'] ** 0.5) if var_row and var_row['variance'] else 0

        stats[feature] = {
            'mean': mean,
            'median': median,
            'std': std,
            'max': row['max_val'] or 0,
            'min': row['min_val'] or 0
        }

    return stats


def print_anomaly_summary(cursor: sqlite3.Cursor, sector_ids: List[int]):
    """Print summary of anomaly detection results."""

    print("\n" + "="*60)
    print("ANOMALY DETECTION SUMMARY")
    print("="*60)

    for sector_id in sector_ids:
        cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
        sector_name = cursor.fetchone()[0]

        cursor.execute("""
            SELECT
                COUNT(*) as total,
                AVG(ensemble_score) as avg_score,
                MAX(ensemble_score) as max_score,
                SUM(CASE WHEN ensemble_score >= 0.6 THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN ensemble_score >= 0.4 AND ensemble_score < 0.6 THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN ensemble_score >= 0.2 AND ensemble_score < 0.4 THEN 1 ELSE 0 END) as medium
            FROM vendor_investigation_features
            WHERE sector_id = ?
        """, (sector_id,))
        row = cursor.fetchone()

        print(f"\nSector: {sector_name}")
        print(f"  Total vendors: {row['total']:,}")
        print(f"  Avg ensemble score: {row['avg_score']:.3f}")
        print(f"  Max ensemble score: {row['max_score']:.3f}")
        print(f"  Critical (>=0.6): {row['critical']:,} ({100*row['critical']/row['total']:.1f}%)")
        print(f"  High (0.4-0.6): {row['high']:,} ({100*row['high']/row['total']:.1f}%)")
        print(f"  Medium (0.2-0.4): {row['medium']:,} ({100*row['medium']/row['total']:.1f}%)")

    # Top 20 across all sectors
    print("\n" + "-"*60)
    print("TOP 20 MOST ANOMALOUS VENDORS (ALL SECTORS)")
    print("-"*60)

    sector_list = ','.join(str(s) for s in sector_ids)
    cursor.execute(f"""
        SELECT
            vf.vendor_id, v.name, s.code as sector,
            vf.ensemble_score, vf.isolation_forest_score,
            vf.total_contracts, vf.total_value_mxn,
            vf.single_bid_ratio, vf.direct_award_ratio,
            vf.high_conf_hypothesis_count,
            vf.top_features, vf.explanation
        FROM vendor_investigation_features vf
        JOIN vendors v ON vf.vendor_id = v.id
        JOIN sectors s ON vf.sector_id = s.id
        WHERE vf.sector_id IN ({sector_list})
        ORDER BY vf.ensemble_score DESC
        LIMIT 20
    """)

    print(f"{'Rank':<4} {'Vendor':<40} {'Sector':<8} {'Score':>6} {'N':>6} {'Value':>12} {'1Bid':>6}")
    print("-"*90)
    results = cursor.fetchall()
    for i, row in enumerate(results, 1):
        name = row['name'][:37] + "..." if len(row['name']) > 40 else row['name']
        value_str = f"${row['total_value_mxn']/1e9:.2f}B" if row['total_value_mxn'] >= 1e9 else f"${row['total_value_mxn']/1e6:.1f}M"
        print(f"{i:<4} {name:<40} {row['sector']:<8} {row['ensemble_score']:>6.3f} {row['total_contracts']:>6} {value_str:>12} {row['single_bid_ratio']:>6.1%}")

    # Show explanations for top 3
    if HAS_SHAP:
        print("\n" + "="*60)
        print("WHY THESE VENDORS WERE FLAGGED (Top 3)")
        print("="*60)
        for i, row in enumerate(results[:3], 1):
            print(f"\n{i}. {row['name']}")
            print(f"   Score: {row['ensemble_score']:.3f}")
            if row['top_features']:
                try:
                    top_features = json.loads(row['top_features'])
                    for tf in top_features[:3]:
                        feature_display = tf['feature'].replace('_', ' ').title()
                        direction = "+" if tf['contribution'] > 0 else ""
                        print(f"   - {feature_display}: {direction}{tf['contribution']:.3f} ({tf['comparison']})")
                except:
                    pass


if __name__ == "__main__":
    print("="*60)
    print("INVESTIGATION ANOMALY DETECTOR")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Isolation Forest available: {HAS_SKLEARN}")
    print()

    start = datetime.now()
    run_anomaly_detection(list(range(1, 13)))  # All 12 sectors
    elapsed = (datetime.now() - start).total_seconds()
    print(f"\nAnomaly detection completed in {elapsed:.1f} seconds")
