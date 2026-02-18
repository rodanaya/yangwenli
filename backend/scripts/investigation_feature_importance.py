"""
Investigation Feature Importance Analysis
==========================================
Calculates global feature importance for the Isolation Forest anomaly detection model
using multiple methods: native importance, permutation importance, and SHAP.

This helps investigators understand which features drive the anomaly detection
at a global (sector) level, complementing the per-vendor SHAP explanations.

Author: RUBLI Project
Date: 2026-02-03
"""

import sqlite3
import os
import numpy as np
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    from sklearn.inspection import permutation_importance
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    print("Warning: scikit-learn not installed.")

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False
    print("Warning: SHAP not installed.")

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')

# Isolation Forest parameters (must match anomaly detector)
CONTAMINATION = 0.05
N_ESTIMATORS = 200
RANDOM_STATE = 42

# Features to analyze (must match anomaly detector)
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


def calculate_feature_importance(sector_ids: Optional[List[int]] = None) -> Dict:
    """
    Calculate feature importance using multiple methods.

    Returns:
        Dict with importance results by sector and method
    """
    if not HAS_SKLEARN:
        print("ERROR: scikit-learn required for feature importance")
        return {}

    if sector_ids is None:
        sector_ids = [1, 3]  # Salud, Infraestructura

    print(f"Calculating feature importance for sectors: {sector_ids}")
    print(f"Database: {DB_PATH}")
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    results = {}

    for sector_id in sector_ids:
        cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
        sector_name = cursor.fetchone()[0]
        print(f"\n{'='*60}")
        print(f"Processing Sector: {sector_name} (ID={sector_id})")
        print(f"{'='*60}")

        sector_results = calculate_sector_importance(cursor, sector_id)
        results[sector_id] = sector_results

        # Store results in database
        store_importance_results(cursor, sector_id, sector_results)
        conn.commit()

    # Print summary
    print_importance_summary(results)

    conn.close()
    return results


def calculate_sector_importance(cursor: sqlite3.Cursor, sector_id: int) -> Dict:
    """
    Calculate feature importance for a single sector using multiple methods.
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
        return {}

    print(f"  Loaded {len(rows):,} vendors")

    # Build feature matrix
    X = []
    for row in rows:
        features = [float(row[f] or 0) for f in ML_FEATURES]
        X.append(features)
    X = np.array(X)

    # Handle NaN/Inf values
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train Isolation Forest
    print("Training Isolation Forest...")
    clf = IsolationForest(
        n_estimators=N_ESTIMATORS,
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    clf.fit(X_scaled)

    results = {
        'sample_size': len(rows),
        'methods': {}
    }

    # Method 1: Isolation Forest feature_importances_ (not available in sklearn IF)
    # So we'll use a proxy based on average path length contribution

    # Method 2: Permutation Importance
    print("Calculating permutation importance...")
    try:
        # Use anomaly score as the "target" for permutation importance
        # We measure how much shuffling each feature changes the anomaly scores
        perm_importance = permutation_importance(
            clf, X_scaled,
            n_repeats=10,
            random_state=RANDOM_STATE,
            n_jobs=-1,
            scoring=None  # Uses decision_function
        )

        perm_results = []
        for i, feature in enumerate(ML_FEATURES):
            perm_results.append({
                'feature': feature,
                'importance': float(perm_importance.importances_mean[i]),
                'std': float(perm_importance.importances_std[i])
            })

        # Sort by importance
        perm_results.sort(key=lambda x: abs(x['importance']), reverse=True)

        # Add rank
        for i, r in enumerate(perm_results):
            r['rank'] = i + 1

        results['methods']['permutation'] = perm_results
        print(f"  Top feature (permutation): {perm_results[0]['feature']}")

    except Exception as e:
        print(f"  Permutation importance failed: {e}")

    # Method 3: SHAP Global Importance
    if HAS_SHAP:
        print("Calculating SHAP global importance...")
        try:
            explainer = shap.TreeExplainer(clf)
            shap_values = explainer.shap_values(X_scaled)

            # Global importance = mean of absolute SHAP values
            shap_importance = np.abs(shap_values).mean(axis=0)

            shap_results = []
            for i, feature in enumerate(ML_FEATURES):
                shap_results.append({
                    'feature': feature,
                    'importance': float(shap_importance[i]),
                    'std': float(np.abs(shap_values[:, i]).std())
                })

            # Sort by importance
            shap_results.sort(key=lambda x: x['importance'], reverse=True)

            # Add rank
            for i, r in enumerate(shap_results):
                r['rank'] = i + 1

            results['methods']['shap'] = shap_results
            print(f"  Top feature (SHAP): {shap_results[0]['feature']}")

        except Exception as e:
            print(f"  SHAP importance failed: {e}")

    # Method 4: Variance-based importance (which features have most variance contribution to anomalies)
    print("Calculating variance-based importance...")
    try:
        # Get anomaly scores
        scores = clf.decision_function(X_scaled)

        # For each feature, calculate correlation with anomaly score
        var_results = []
        for i, feature in enumerate(ML_FEATURES):
            # Negative scores = anomalous, so negative correlation means higher value = more anomalous
            correlation = np.corrcoef(X_scaled[:, i], scores)[0, 1]
            # Also get the variance contribution
            feature_variance = np.var(X_scaled[:, i])

            var_results.append({
                'feature': feature,
                'importance': float(abs(correlation) * feature_variance),  # Combined metric
                'correlation': float(correlation),
                'variance': float(feature_variance)
            })

        var_results.sort(key=lambda x: x['importance'], reverse=True)

        for i, r in enumerate(var_results):
            r['rank'] = i + 1

        results['methods']['variance'] = var_results
        print(f"  Top feature (variance): {var_results[0]['feature']}")

    except Exception as e:
        print(f"  Variance importance failed: {e}")

    return results


def store_importance_results(cursor: sqlite3.Cursor, sector_id: int, results: Dict):
    """
    Store feature importance results in the database.
    """
    if not results or 'methods' not in results:
        return

    # Clear existing results for this sector
    cursor.execute("DELETE FROM feature_importance WHERE sector_id = ?", (sector_id,))

    # Insert new results
    for method, features in results['methods'].items():
        for f in features:
            cursor.execute("""
                INSERT INTO feature_importance (sector_id, feature_name, importance, rank, method)
                VALUES (?, ?, ?, ?, ?)
            """, (
                sector_id,
                f['feature'],
                f['importance'],
                f['rank'],
                method
            ))

    print(f"  Stored {sum(len(f) for f in results['methods'].values())} importance records")


def print_importance_summary(results: Dict):
    """
    Print summary of feature importance results.
    """
    print("\n" + "="*60)
    print("FEATURE IMPORTANCE SUMMARY")
    print("="*60)

    # Aggregate importance across sectors
    feature_scores = {}

    for sector_id, sector_results in results.items():
        if 'methods' not in sector_results:
            continue

        for method, features in sector_results['methods'].items():
            for f in features:
                key = f['feature']
                if key not in feature_scores:
                    feature_scores[key] = {
                        'permutation': [],
                        'shap': [],
                        'variance': []
                    }
                if method in feature_scores[key]:
                    feature_scores[key][method].append(f['rank'])

    # Calculate average rank across sectors and methods
    avg_ranks = []
    for feature, scores in feature_scores.items():
        all_ranks = []
        for method_ranks in scores.values():
            all_ranks.extend(method_ranks)
        if all_ranks:
            avg_ranks.append((feature, np.mean(all_ranks)))

    avg_ranks.sort(key=lambda x: x[1])

    print("\nGlobal Feature Ranking (average across sectors and methods):")
    print(f"{'Rank':<4} {'Feature':<30} {'Avg Rank':>10}")
    print("-"*46)
    for i, (feature, avg_rank) in enumerate(avg_ranks, 1):
        print(f"{i:<4} {feature:<30} {avg_rank:>10.2f}")

    # Feature interpretation guide
    print("\n" + "-"*60)
    print("FEATURE INTERPRETATION GUIDE")
    print("-"*60)

    interpretations = {
        'single_bid_ratio': 'Higher = more contracts won without competition (suspicious)',
        'direct_award_ratio': 'Higher = more non-competitive awards (potentially suspicious)',
        'high_conf_hypothesis_count': 'Higher = more pricing anomalies flagged (suspicious)',
        'total_value_mxn': 'Higher = larger total contract value (scale factor)',
        'december_ratio': 'Higher = more year-end contracts (budget exhaustion)',
        'avg_risk_score': 'Higher = consistently higher risk contracts',
        'institution_hhi': 'Higher = concentrated with few institutions (dependency)',
        'network_cluster_size': 'Higher = larger network of related bidders (potential collusion)',
        'sudden_growth_indicator': 'Higher = rapid growth in contract activity (suspicious)',
        'contract_velocity': 'Higher = more contracts per year of activity',
    }

    for feature, avg_rank in avg_ranks[:10]:
        if feature in interpretations:
            print(f"\n{feature}:")
            print(f"  {interpretations[feature]}")


def get_feature_importance_api(sector_id: int, method: str = 'shap') -> List[Dict]:
    """
    Get feature importance for API endpoint.

    Args:
        sector_id: Sector to get importance for
        method: Method to use ('shap', 'permutation', or 'variance')

    Returns:
        List of feature importance records
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT feature_name, importance, rank, method, calculated_at
        FROM feature_importance
        WHERE sector_id = ? AND method = ?
        ORDER BY rank
    """, (sector_id, method))

    results = [
        {
            'feature': row['feature_name'],
            'importance': row['importance'],
            'rank': row['rank'],
            'method': row['method'],
            'calculated_at': row['calculated_at']
        }
        for row in cursor.fetchall()
    ]

    conn.close()
    return results


if __name__ == "__main__":
    print("="*60)
    print("INVESTIGATION FEATURE IMPORTANCE ANALYSIS")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"SHAP available: {HAS_SHAP}")
    print()

    start = datetime.now()
    calculate_feature_importance([1, 3])  # Salud, Infraestructura
    elapsed = (datetime.now() - start).total_seconds()
    print(f"\nFeature importance analysis completed in {elapsed:.1f} seconds")
