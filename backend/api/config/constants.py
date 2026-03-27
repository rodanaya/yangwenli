"""
Centralized constants for the RUBLI backend.

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

# Risk level thresholds — statistical risk indicators (NOT probabilities)
# Scores measure similarity to documented corruption patterns.
# A score of 0.60 does NOT mean "60% probability of corruption."
# v4.0/v5.1 thresholds (preserved for backward compatibility)
RISK_THRESHOLDS_V4 = {
    'critical': 0.50,   # v4.0/v5.1 thresholds
    'high': 0.30,
    'medium': 0.10,
    'low': 0.0,
}

# v6.5 thresholds — recalibrated for PU-corrected scores (c=0.300)
# PU correction: Elkan & Noto floor c=0.300
# HR=13.49% OECD compliant (within 2-15% benchmark)
# GT detection: vendor-stratified test AUC=0.828
RISK_THRESHOLDS_V6 = {
    'critical': 0.60,   # Strongest similarity to known corruption patterns
    'high': 0.40,       # Strong similarity
    'medium': 0.25,     # Moderate similarity
    'low': 0.0,         # Low similarity
}

# Active thresholds for current model
RISK_THRESHOLDS_V5 = RISK_THRESHOLDS_V6

# Active model version
# v6.5: institution-scoped GT labels, structural FP exclusions, test AUC 0.828 (vendor-stratified)
CURRENT_MODEL_VERSION = 'v6.5'


def get_risk_level(score: float, model_version: str = None) -> str:
    """Return risk level string for a given score.

    Args:
        score: Risk score (0-1)
        model_version: 'v3.3' or 'v4.0'. If None, uses CURRENT_MODEL_VERSION.
    """
    version = model_version or CURRENT_MODEL_VERSION
    if version >= 'v6.0':
        thresholds = RISK_THRESHOLDS_V6
    elif version >= 'v4.0':
        thresholds = RISK_THRESHOLDS_V4
    else:
        thresholds = RISK_THRESHOLDS

    if score >= thresholds['critical']:
        return 'critical'
    if score >= thresholds['high']:
        return 'high'
    if score >= thresholds['medium']:
        return 'medium'
    return 'low'
