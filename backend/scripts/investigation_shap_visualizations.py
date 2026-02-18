"""
Investigation SHAP Visualizations
=================================
Generates visual explanations for the anomaly detection model using SHAP.

Visualizations:
1. Summary plot (beeswarm) - Shows feature impact distribution
2. Feature importance bar chart - Global feature ranking
3. Individual vendor force plots - Per-vendor explanation
4. Sector comparison - Compare feature importance across sectors

Author: RUBLI Project
Date: 2026-02-03
"""

import sqlite3
import os
import json
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import base64
from io import BytesIO

try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    HAS_MPL = True
except ImportError:
    HAS_MPL = False
    print("Warning: matplotlib not installed. Visualizations unavailable.")

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
OUTPUT_DIR = os.path.join(BACKEND_DIR, 'static', 'shap_plots')

# Feature names (must match anomaly detector)
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

# Human-readable feature names for plots
FEATURE_LABELS = {
    'total_contracts': 'Total Contracts',
    'total_value_mxn': 'Total Value (MXN)',
    'avg_contract_value': 'Avg Contract Value',
    'contract_value_cv': 'Contract Value CV',
    'avg_risk_score': 'Avg Risk Score',
    'max_risk_score': 'Max Risk Score',
    'high_risk_ratio': 'High Risk Ratio',
    'direct_award_ratio': 'Direct Award %',
    'single_bid_ratio': 'Single Bid %',
    'price_hypothesis_count': 'Price Anomalies',
    'high_conf_hypothesis_count': 'High-Conf Price Anomalies',
    'avg_price_ratio': 'Avg Price Ratio',
    'december_ratio': 'December %',
    'q4_ratio': 'Q4 %',
    'contract_velocity': 'Contract Velocity',
    'institution_hhi': 'Institution HHI',
    'top_institution_ratio': 'Top Institution %',
    'sector_concentration': 'Sector Concentration',
    'co_bidder_count': 'Co-bidder Count',
    'network_cluster_size': 'Network Cluster Size',
    'sudden_growth_indicator': 'Sudden Growth',
}

# Color scheme
COLORS = {
    'positive': '#dc2626',  # Red for high-risk contributions
    'negative': '#16a34a',  # Green for low-risk contributions
    'neutral': '#64748b',   # Gray
    'salud': '#dc2626',
    'infraestructura': '#ea580c',
}


def ensure_output_dir():
    """Ensure output directory exists."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    return OUTPUT_DIR


def load_shap_data(sector_id: int, limit: int = 1000) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Load SHAP values and feature values from database.

    Args:
        sector_id: Sector to load
        limit: Max vendors to load (for memory)

    Returns:
        (shap_values, feature_values, vendor_names)
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Load top vendors by ensemble score
    feature_cols = ', '.join([f'vf.{f}' for f in ML_FEATURES])
    cursor.execute(f"""
        SELECT v.name, vf.shap_values, {feature_cols}
        FROM vendor_investigation_features vf
        JOIN vendors v ON vf.vendor_id = v.id
        WHERE vf.sector_id = ? AND vf.shap_values IS NOT NULL
        ORDER BY vf.ensemble_score DESC
        LIMIT ?
    """, (sector_id, limit))

    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return None, None, []

    shap_values = []
    feature_values = []
    vendor_names = []

    for row in rows:
        vendor_names.append(row['name'])

        # Parse SHAP values
        shap_dict = json.loads(row['shap_values'])
        shap_row = [shap_dict.get(f, 0) for f in ML_FEATURES]
        shap_values.append(shap_row)

        # Get feature values
        feat_row = [float(row[f] or 0) for f in ML_FEATURES]
        feature_values.append(feat_row)

    return np.array(shap_values), np.array(feature_values), vendor_names


def generate_summary_plot(sector_id: int, max_display: int = 15, save: bool = True) -> Optional[str]:
    """
    Generate SHAP summary beeswarm plot.

    Args:
        sector_id: Sector to visualize
        max_display: Max features to show
        save: Whether to save to file

    Returns:
        Path to saved plot or base64 string
    """
    if not HAS_MPL or not HAS_SHAP:
        print("Required libraries not available")
        return None

    print(f"Generating summary plot for sector {sector_id}...")

    shap_values, feature_values, vendor_names = load_shap_data(sector_id, limit=2000)
    if shap_values is None:
        print("  No data available")
        return None

    # Get sector name
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name_es, code FROM sectors WHERE id = ?", (sector_id,))
    sector_name, sector_code = cursor.fetchone()
    conn.close()

    # Create SHAP Explanation object
    feature_labels = [FEATURE_LABELS.get(f, f) for f in ML_FEATURES]
    explanation = shap.Explanation(
        values=shap_values,
        data=feature_values,
        feature_names=feature_labels
    )

    # Create plot
    plt.figure(figsize=(12, 8))
    shap.plots.beeswarm(explanation, max_display=max_display, show=False)
    plt.title(f'SHAP Feature Impact - {sector_name} Sector\n(Top {len(vendor_names)} vendors by anomaly score)', fontsize=14)
    plt.tight_layout()

    if save:
        output_dir = ensure_output_dir()
        filepath = os.path.join(output_dir, f'shap_summary_{sector_code}.png')
        plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        print(f"  Saved: {filepath}")
        return filepath
    else:
        # Return as base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        buffer.seek(0)
        plt.close()
        return base64.b64encode(buffer.read()).decode('utf-8')


def generate_importance_bar(sector_id: int, top_n: int = 15, save: bool = True) -> Optional[str]:
    """
    Generate feature importance bar chart.

    Args:
        sector_id: Sector to visualize
        top_n: Number of top features
        save: Whether to save to file

    Returns:
        Path to saved plot or base64 string
    """
    if not HAS_MPL:
        return None

    print(f"Generating importance bar chart for sector {sector_id}...")

    shap_values, _, _ = load_shap_data(sector_id, limit=5000)
    if shap_values is None:
        return None

    # Get sector info
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name_es, code FROM sectors WHERE id = ?", (sector_id,))
    sector_name, sector_code = cursor.fetchone()
    conn.close()

    # Calculate mean absolute SHAP values
    importance = np.abs(shap_values).mean(axis=0)
    feature_labels = [FEATURE_LABELS.get(f, f) for f in ML_FEATURES]

    # Sort by importance
    sorted_idx = np.argsort(importance)[::-1][:top_n]
    sorted_importance = importance[sorted_idx]
    sorted_labels = [feature_labels[i] for i in sorted_idx]

    # Create plot
    fig, ax = plt.subplots(figsize=(10, 8))
    colors = [COLORS.get(sector_code, COLORS['neutral'])] * len(sorted_importance)
    bars = ax.barh(range(len(sorted_importance)), sorted_importance[::-1], color=colors)
    ax.set_yticks(range(len(sorted_importance)))
    ax.set_yticklabels(sorted_labels[::-1])
    ax.set_xlabel('Mean |SHAP Value| (Feature Importance)')
    ax.set_title(f'Feature Importance - {sector_name} Sector', fontsize=14)

    # Add value labels
    for i, (bar, val) in enumerate(zip(bars, sorted_importance[::-1])):
        ax.text(val + 0.01, bar.get_y() + bar.get_height()/2,
                f'{val:.3f}', va='center', fontsize=9)

    plt.tight_layout()

    if save:
        output_dir = ensure_output_dir()
        filepath = os.path.join(output_dir, f'shap_importance_{sector_code}.png')
        plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        print(f"  Saved: {filepath}")
        return filepath
    else:
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        buffer.seek(0)
        plt.close()
        return base64.b64encode(buffer.read()).decode('utf-8')


def generate_vendor_waterfall(vendor_id: int, sector_id: int, save: bool = True) -> Optional[str]:
    """
    Generate waterfall plot for a specific vendor.

    Args:
        vendor_id: Vendor to explain
        sector_id: Sector context
        save: Whether to save to file

    Returns:
        Path to saved plot or base64 string
    """
    if not HAS_MPL or not HAS_SHAP:
        return None

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get vendor data
    feature_cols = ', '.join([f'vf.{f}' for f in ML_FEATURES])
    cursor.execute(f"""
        SELECT v.name, vf.shap_values, vf.ensemble_score, vf.isolation_forest_score, {feature_cols}
        FROM vendor_investigation_features vf
        JOIN vendors v ON vf.vendor_id = v.id
        WHERE vf.vendor_id = ? AND vf.sector_id = ?
    """, (vendor_id, sector_id))

    row = cursor.fetchone()

    # Get the sector's average anomaly score as base value
    cursor.execute("""
        SELECT AVG(isolation_forest_score) as avg_score
        FROM vendor_investigation_features
        WHERE sector_id = ? AND isolation_forest_score IS NOT NULL
    """, (sector_id,))
    avg_row = cursor.fetchone()
    base_value = avg_row['avg_score'] if avg_row and avg_row['avg_score'] else 0.5

    conn.close()

    if not row or not row['shap_values']:
        return None

    vendor_name = row['name']
    score = row['ensemble_score']
    if_score = row['isolation_forest_score'] or score

    # Parse data
    shap_dict = json.loads(row['shap_values'])
    shap_values = np.array([shap_dict.get(f, 0) for f in ML_FEATURES])
    feature_values = np.array([float(row[f] or 0) for f in ML_FEATURES])
    feature_labels = [FEATURE_LABELS.get(f, f) for f in ML_FEATURES]

    # Create SHAP Explanation with base_values
    # base_values represents the expected output (average anomaly score for the sector)
    explanation = shap.Explanation(
        values=shap_values,
        base_values=base_value,
        data=feature_values,
        feature_names=feature_labels
    )

    # Create waterfall plot
    plt.figure(figsize=(12, 8))
    shap.plots.waterfall(explanation, max_display=12, show=False)
    plt.title(f'Why Was {vendor_name[:40]} Flagged?\nAnomaly Score: {if_score:.3f} (Ensemble: {score:.3f})', fontsize=12)
    plt.tight_layout()

    if save:
        output_dir = ensure_output_dir()
        filepath = os.path.join(output_dir, f'shap_vendor_{vendor_id}.png')
        plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        print(f"  Saved: {filepath}")
        return filepath
    else:
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        buffer.seek(0)
        plt.close()
        return base64.b64encode(buffer.read()).decode('utf-8')


def generate_sector_comparison(save: bool = True) -> Optional[str]:
    """
    Generate side-by-side feature importance comparison for Salud vs Infraestructura.

    Returns:
        Path to saved plot or base64 string
    """
    if not HAS_MPL:
        return None

    print("Generating sector comparison...")

    # Load data for both sectors
    shap_salud, _, _ = load_shap_data(1, limit=5000)
    shap_infra, _, _ = load_shap_data(3, limit=5000)

    if shap_salud is None or shap_infra is None:
        return None

    # Calculate importance
    importance_salud = np.abs(shap_salud).mean(axis=0)
    importance_infra = np.abs(shap_infra).mean(axis=0)

    feature_labels = [FEATURE_LABELS.get(f, f) for f in ML_FEATURES]

    # Sort by combined importance
    combined = importance_salud + importance_infra
    sorted_idx = np.argsort(combined)[::-1][:12]

    # Create grouped bar chart
    fig, ax = plt.subplots(figsize=(12, 8))

    x = np.arange(len(sorted_idx))
    width = 0.35

    bars1 = ax.barh(x - width/2, importance_salud[sorted_idx][::-1],
                    width, label='Salud', color=COLORS['salud'], alpha=0.8)
    bars2 = ax.barh(x + width/2, importance_infra[sorted_idx][::-1],
                    width, label='Infraestructura', color=COLORS['infraestructura'], alpha=0.8)

    ax.set_yticks(x)
    ax.set_yticklabels([feature_labels[i] for i in sorted_idx][::-1])
    ax.set_xlabel('Mean |SHAP Value|')
    ax.set_title('Feature Importance Comparison: Salud vs Infraestructura', fontsize=14)
    ax.legend()

    plt.tight_layout()

    if save:
        output_dir = ensure_output_dir()
        filepath = os.path.join(output_dir, 'shap_sector_comparison.png')
        plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        print(f"  Saved: {filepath}")
        return filepath
    else:
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        buffer.seek(0)
        plt.close()
        return base64.b64encode(buffer.read()).decode('utf-8')


def generate_top_vendors_explanations(sector_id: int, top_n: int = 5, save: bool = True) -> List[str]:
    """
    Generate waterfall plots for top N anomalous vendors.

    Returns:
        List of file paths
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT vendor_id
        FROM vendor_investigation_features
        WHERE sector_id = ?
        ORDER BY ensemble_score DESC
        LIMIT ?
    """, (sector_id, top_n))

    vendor_ids = [row['vendor_id'] for row in cursor.fetchall()]
    conn.close()

    paths = []
    for vid in vendor_ids:
        path = generate_vendor_waterfall(vid, sector_id, save=save)
        if path:
            paths.append(path)

    return paths


def generate_all_visualizations():
    """Generate all standard visualizations."""
    print("="*60)
    print("SHAP VISUALIZATION GENERATOR")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Output directory: {OUTPUT_DIR}")
    print()

    results = {
        'summary_plots': [],
        'importance_plots': [],
        'comparison_plot': None,
        'vendor_plots': []
    }

    # Summary plots for each sector
    for sector_id, sector_name in [(1, 'Salud'), (3, 'Infraestructura')]:
        print(f"\nSector: {sector_name}")
        print("-"*40)

        path = generate_summary_plot(sector_id)
        if path:
            results['summary_plots'].append(path)

        path = generate_importance_bar(sector_id)
        if path:
            results['importance_plots'].append(path)

        # Top 3 vendors
        paths = generate_top_vendors_explanations(sector_id, top_n=3)
        results['vendor_plots'].extend(paths)

    # Sector comparison
    path = generate_sector_comparison()
    if path:
        results['comparison_plot'] = path

    print("\n" + "="*60)
    print("VISUALIZATION SUMMARY")
    print("="*60)
    print(f"Summary plots: {len(results['summary_plots'])}")
    print(f"Importance plots: {len(results['importance_plots'])}")
    print(f"Vendor plots: {len(results['vendor_plots'])}")
    print(f"Comparison plot: {'Yes' if results['comparison_plot'] else 'No'}")
    print(f"\nAll plots saved to: {OUTPUT_DIR}")

    return results


# =============================================================================
# API HELPER FUNCTIONS
# =============================================================================

def get_summary_plot_base64(sector_id: int) -> Optional[str]:
    """Get summary plot as base64 for API."""
    return generate_summary_plot(sector_id, save=False)


def get_importance_plot_base64(sector_id: int) -> Optional[str]:
    """Get importance bar chart as base64 for API."""
    return generate_importance_bar(sector_id, save=False)


def get_vendor_plot_base64(vendor_id: int, sector_id: int) -> Optional[str]:
    """Get vendor waterfall plot as base64 for API."""
    return generate_vendor_waterfall(vendor_id, sector_id, save=False)


def get_comparison_plot_base64() -> Optional[str]:
    """Get sector comparison plot as base64 for API."""
    return generate_sector_comparison(save=False)


if __name__ == "__main__":
    start = datetime.now()
    generate_all_visualizations()
    elapsed = (datetime.now() - start).total_seconds()
    print(f"\nVisualization generation completed in {elapsed:.1f} seconds")
