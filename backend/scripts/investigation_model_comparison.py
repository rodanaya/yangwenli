"""
Investigation Model Comparison
==============================
Compares multiple anomaly detection algorithms to evaluate if alternatives
perform better than Isolation Forest for vendor anomaly detection.

Algorithms tested:
1. Isolation Forest (baseline)
2. Local Outlier Factor (LOF) - density-based
3. One-Class SVM - boundary-based
4. Elliptic Envelope - assumes Gaussian distribution

Author: RUBLI Project
Date: 2026-02-03
"""

import sqlite3
import os
import numpy as np
import json
import time
from datetime import datetime
from typing import Dict, List, Tuple, Optional

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.neighbors import LocalOutlierFactor
    from sklearn.svm import OneClassSVM
    from sklearn.covariance import EllipticEnvelope
    from sklearn.preprocessing import StandardScaler
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    print("ERROR: scikit-learn not installed.")
    exit(1)

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')

# Common parameters
CONTAMINATION = 0.05  # Expect ~5% anomalies
RANDOM_STATE = 42

# Model configurations
MODELS = {
    'isolation_forest': {
        'class': IsolationForest,
        'params': {
            'n_estimators': 200,
            'contamination': CONTAMINATION,
            'random_state': RANDOM_STATE,
            'n_jobs': -1
        },
        'description': 'Ensemble of isolation trees - baseline model'
    },
    'lof': {
        'class': LocalOutlierFactor,
        'params': {
            'n_neighbors': 20,
            'contamination': CONTAMINATION,
            'novelty': True,  # Required for decision_function
            'n_jobs': -1
        },
        'description': 'Local Outlier Factor - density-based anomaly detection'
    },
    'ocsvm': {
        'class': OneClassSVM,
        'params': {
            'nu': CONTAMINATION,
            'kernel': 'rbf',
            'gamma': 'scale'
        },
        'description': 'One-Class SVM - learns decision boundary'
    },
    'elliptic': {
        'class': EllipticEnvelope,
        'params': {
            'contamination': CONTAMINATION,
            'random_state': RANDOM_STATE,
            'support_fraction': 0.9
        },
        'description': 'Elliptic Envelope - assumes Gaussian distribution'
    }
}

# Features to use (must match anomaly detector)
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


def compare_models(sector_ids: Optional[List[int]] = None) -> Dict:
    """
    Compare multiple anomaly detection models.

    Returns:
        Dict with comparison results by sector
    """
    if sector_ids is None:
        sector_ids = [1, 3]  # Salud, Infraestructura

    print(f"Comparing anomaly detection models for sectors: {sector_ids}")
    print(f"Database: {DB_PATH}")
    print(f"\nModels to compare:")
    for name, config in MODELS.items():
        print(f"  - {name}: {config['description']}")
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    results = {}

    for sector_id in sector_ids:
        cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
        sector_name = cursor.fetchone()[0]
        print(f"\n{'='*70}")
        print(f"Processing Sector: {sector_name} (ID={sector_id})")
        print(f"{'='*70}")

        sector_results = compare_sector_models(cursor, sector_id)
        results[sector_id] = sector_results

        # Store results in database
        store_comparison_results(cursor, sector_id, sector_results)
        conn.commit()

    # Print comparison summary
    print_comparison_summary(results)

    conn.close()
    return results


def compare_sector_models(cursor: sqlite3.Cursor, sector_id: int) -> Dict:
    """
    Compare all models for a single sector.
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

    vendor_ids = [r['vendor_id'] for r in rows]

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

    print(f"  Feature matrix shape: {X_scaled.shape}")

    # Run each model
    results = {
        'sample_size': len(rows),
        'models': {}
    }

    # Track Isolation Forest predictions as baseline
    if_predictions = None
    if_anomaly_ids = set()

    for model_name, config in MODELS.items():
        print(f"\n  Running {model_name}...")
        start_time = time.time()

        try:
            # Create and fit model
            model = config['class'](**config['params'])

            # Handle LOF differently (requires fit then predict)
            if model_name == 'lof':
                model.fit(X_scaled)
                predictions = model.predict(X_scaled)
                scores = model.decision_function(X_scaled)
            else:
                predictions = model.fit_predict(X_scaled)
                scores = model.decision_function(X_scaled)

            elapsed = time.time() - start_time

            # Count anomalies (-1 means anomaly)
            anomaly_mask = predictions == -1
            n_anomalies = anomaly_mask.sum()
            anomaly_indices = set(np.where(anomaly_mask)[0])
            anomaly_vendor_ids = set(vendor_ids[i] for i in anomaly_indices)

            # Normalize scores to 0-1 (higher = more anomalous)
            min_score, max_score = scores.min(), scores.max()
            if max_score != min_score:
                normalized_scores = 1 - (scores - min_score) / (max_score - min_score)
            else:
                normalized_scores = np.zeros_like(scores)

            # Store Isolation Forest as baseline
            if model_name == 'isolation_forest':
                if_predictions = predictions
                if_anomaly_ids = anomaly_vendor_ids

            # Calculate overlap with Isolation Forest
            if if_anomaly_ids and model_name != 'isolation_forest':
                overlap = len(anomaly_vendor_ids.intersection(if_anomaly_ids))
                overlap_pct = overlap / len(if_anomaly_ids) if if_anomaly_ids else 0
            else:
                overlap_pct = 1.0 if model_name == 'isolation_forest' else None

            # Get top 20 anomalies for this model
            top_20_indices = np.argsort(normalized_scores)[-20:][::-1]
            top_20_vendors = [(vendor_ids[i], float(normalized_scores[i])) for i in top_20_indices]

            results['models'][model_name] = {
                'anomalies_detected': int(n_anomalies),
                'anomaly_rate': float(n_anomalies / len(rows)),
                'overlap_with_if': float(overlap_pct) if overlap_pct is not None else None,
                'avg_score': float(normalized_scores.mean()),
                'max_score': float(normalized_scores.max()),
                'execution_time': elapsed,
                'parameters': config['params'],
                'top_20_vendors': top_20_vendors
            }

            print(f"    Anomalies: {n_anomalies:,} ({100*n_anomalies/len(rows):.1f}%)")
            print(f"    Time: {elapsed:.2f}s")
            if overlap_pct is not None and model_name != 'isolation_forest':
                print(f"    Overlap with IF: {100*overlap_pct:.1f}%")

        except Exception as e:
            print(f"    ERROR: {e}")
            results['models'][model_name] = {
                'error': str(e)
            }

    return results


def store_comparison_results(cursor: sqlite3.Cursor, sector_id: int, results: Dict):
    """
    Store model comparison results in the database.
    """
    if not results or 'models' not in results:
        return

    # Clear existing results for this sector
    cursor.execute("DELETE FROM model_comparison WHERE sector_id = ?", (sector_id,))

    # Insert new results
    for model_name, model_results in results['models'].items():
        if 'error' in model_results:
            continue

        cursor.execute("""
            INSERT INTO model_comparison (
                sector_id, model_name, anomalies_detected,
                overlap_with_if, avg_score, max_score,
                execution_time_seconds, parameters
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sector_id,
            model_name,
            model_results['anomalies_detected'],
            model_results['overlap_with_if'],
            model_results['avg_score'],
            model_results['max_score'],
            model_results['execution_time'],
            json.dumps(model_results['parameters'])
        ))

    print(f"\n  Stored {len(results['models'])} model comparison records")


def print_comparison_summary(results: Dict):
    """
    Print detailed comparison summary.
    """
    print("\n" + "="*70)
    print("MODEL COMPARISON SUMMARY")
    print("="*70)

    # Aggregate across sectors
    all_models = {}
    for sector_id, sector_results in results.items():
        if 'models' not in sector_results:
            continue
        for model_name, model_data in sector_results['models'].items():
            if 'error' in model_data:
                continue
            if model_name not in all_models:
                all_models[model_name] = {
                    'anomalies': [],
                    'overlap': [],
                    'time': []
                }
            all_models[model_name]['anomalies'].append(model_data['anomalies_detected'])
            if model_data['overlap_with_if'] is not None:
                all_models[model_name]['overlap'].append(model_data['overlap_with_if'])
            all_models[model_name]['time'].append(model_data['execution_time'])

    print("\nModel Performance Comparison:")
    print("-"*70)
    print(f"{'Model':<20} {'Avg Anomalies':>15} {'Avg Overlap':>12} {'Avg Time':>12}")
    print("-"*70)

    for model_name, data in all_models.items():
        avg_anomalies = np.mean(data['anomalies']) if data['anomalies'] else 0
        avg_overlap = np.mean(data['overlap']) if data['overlap'] else 1.0
        avg_time = np.mean(data['time']) if data['time'] else 0
        print(f"{model_name:<20} {avg_anomalies:>15.0f} {100*avg_overlap:>11.1f}% {avg_time:>11.2f}s")

    # Recommendations
    print("\n" + "-"*70)
    print("RECOMMENDATIONS")
    print("-"*70)

    print("""
1. **Isolation Forest** (Current Choice): Good balance of speed and accuracy.
   Tree-based approach works well with mixed feature types and doesn't
   assume any particular data distribution.

2. **Local Outlier Factor**: Higher overlap with IF suggests similar detection
   patterns. Good alternative for density-based scenarios. Slower but may
   catch cluster-based anomalies better.

3. **One-Class SVM**: May find different anomaly types due to boundary-based
   approach. Useful for ensemble voting if overlap is moderate.

4. **Elliptic Envelope**: Assumes Gaussian distribution which may not hold
   for procurement data. Use with caution.

**Ensemble Suggestion**: Consider voting across IF + LOF + OCSVM where at
least 2 models agree for higher confidence anomaly detection.
    """)

    # Show vendors flagged by all models
    print("\n" + "-"*70)
    print("VENDORS FLAGGED BY MULTIPLE MODELS")
    print("-"*70)

    for sector_id, sector_results in results.items():
        if 'models' not in sector_results:
            continue

        print(f"\nSector {sector_id}:")

        # Get top vendors from each model
        all_top_vendors = {}
        for model_name, model_data in sector_results['models'].items():
            if 'error' in model_data or 'top_20_vendors' not in model_data:
                continue
            for vendor_id, score in model_data['top_20_vendors'][:10]:
                if vendor_id not in all_top_vendors:
                    all_top_vendors[vendor_id] = {}
                all_top_vendors[vendor_id][model_name] = score

        # Find vendors in multiple models
        multi_model_vendors = [
            (vid, data)
            for vid, data in all_top_vendors.items()
            if len(data) >= 2
        ]

        if multi_model_vendors:
            # Sort by number of models and average score
            multi_model_vendors.sort(
                key=lambda x: (len(x[1]), np.mean(list(x[1].values()))),
                reverse=True
            )

            print(f"  Found {len(multi_model_vendors)} vendors flagged by 2+ models:")
            for vid, models_scores in multi_model_vendors[:5]:
                model_str = ", ".join(f"{m}: {s:.3f}" for m, s in models_scores.items())
                print(f"    Vendor {vid}: {model_str}")
        else:
            print("  No vendors flagged by multiple models in top 10")


def get_model_comparison_api(sector_id: int) -> List[Dict]:
    """
    Get model comparison results for API endpoint.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT model_name, anomalies_detected, overlap_with_if,
               avg_score, max_score, execution_time_seconds,
               parameters, calculated_at
        FROM model_comparison
        WHERE sector_id = ?
        ORDER BY model_name
    """, (sector_id,))

    results = [
        {
            'model': row['model_name'],
            'anomalies_detected': row['anomalies_detected'],
            'overlap_with_if': row['overlap_with_if'],
            'avg_score': row['avg_score'],
            'max_score': row['max_score'],
            'execution_time': row['execution_time_seconds'],
            'parameters': json.loads(row['parameters']) if row['parameters'] else {},
            'calculated_at': row['calculated_at']
        }
        for row in cursor.fetchall()
    ]

    conn.close()
    return results


if __name__ == "__main__":
    print("="*70)
    print("INVESTIGATION MODEL COMPARISON")
    print("="*70)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    start = datetime.now()
    compare_models([1, 3])  # Salud, Infraestructura
    elapsed = (datetime.now() - start).total_seconds()
    print(f"\nModel comparison completed in {elapsed:.1f} seconds")
