"""
Centralized constants for the Yang Wen-li backend.

These values were previously duplicated across 9+ files.
Import from here instead of redefining.
"""

# Amount validation thresholds (from data-validation.md)
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN - reject above this
FLAG_THRESHOLD = 10_000_000_000       # 10B MXN - flag for review

# Risk level thresholds (v3.3)
RISK_THRESHOLDS = {
    'critical': 0.50,
    'high': 0.35,
    'medium': 0.20,
    'low': 0.0,
}


def get_risk_level(score: float) -> str:
    """Return risk level string for a given score."""
    if score >= RISK_THRESHOLDS['critical']:
        return 'critical'
    if score >= RISK_THRESHOLDS['high']:
        return 'high'
    if score >= RISK_THRESHOLDS['medium']:
        return 'medium'
    return 'low'
