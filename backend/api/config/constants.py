"""
Centralized constants for the Yang Wen-li backend.

These values were previously duplicated across 9+ files.
Import from here instead of redefining.
"""

# Amount validation thresholds (from data-validation.md)
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN - reject above this
FLAG_THRESHOLD = 10_000_000_000       # 10B MXN - flag for review

# Risk level thresholds (v3.3) — weighted checklist model
RISK_THRESHOLDS = {
    'critical': 0.50,
    'high': 0.35,
    'medium': 0.20,
    'low': 0.0,
}

# Risk level thresholds (v4.0) — calibrated probability model
# Aligned with documented methodology (RISK_METHODOLOGY_v4.md)
# High+ rate: 11.0% (OECD benchmark: 2-15%)
RISK_THRESHOLDS_V4 = {
    'critical': 0.50,   # ≥50% estimated corruption probability
    'high': 0.30,       # ≥30% probability
    'medium': 0.10,     # ≥10% probability
    'low': 0.0,         # <10% probability
}

# Risk level thresholds (v5.0) — per-sector calibrated probability model
# Same thresholds as v4.0, validated against diversified ground truth (15 cases)
# High+ rate: 10.6% (OECD benchmark: 2-15%)
RISK_THRESHOLDS_V5 = RISK_THRESHOLDS_V4

# Active model version
CURRENT_MODEL_VERSION = 'v5.0'


def get_risk_level(score: float, model_version: str = None) -> str:
    """Return risk level string for a given score.

    Args:
        score: Risk score (0-1)
        model_version: 'v3.3' or 'v4.0'. If None, uses CURRENT_MODEL_VERSION.
    """
    version = model_version or CURRENT_MODEL_VERSION
    thresholds = RISK_THRESHOLDS_V4 if version >= 'v4.0' else RISK_THRESHOLDS  # v5.0 uses same thresholds as v4.0

    if score >= thresholds['critical']:
        return 'critical'
    if score >= thresholds['high']:
        return 'high'
    if score >= thresholds['medium']:
        return 'medium'
    return 'low'
