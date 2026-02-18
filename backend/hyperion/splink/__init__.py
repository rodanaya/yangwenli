"""
HYPERION-SPLINK: Probabilistic Vendor Deduplication

> "The best strategy achieves the objective with minimum expenditure of resources." - RUBLI

Uses the UK Ministry of Justice's Splink library for probabilistic record linkage
to identify duplicate vendor entries in Mexican government procurement data.

Features:
- Fellegi-Sunter probabilistic model
- Term frequency adjustments (common names get less weight)
- RFC conflict post-filtering
- Configurable thresholds and quality gates
- Dry-run mode for safe testing
"""

__version__ = "1.0.0"

from .config import SplinkConfig, QualityThresholds, BlockingConfig
from .validator import QualityValidator, ValidationResult
from .framework import SplinkDeduplicationFramework, DeduplicationResult
from .reporter import MatchReporter, PersistResult

__all__ = [
    "SplinkConfig",
    "QualityThresholds",
    "BlockingConfig",
    "QualityValidator",
    "ValidationResult",
    "SplinkDeduplicationFramework",
    "DeduplicationResult",
    "MatchReporter",
    "PersistResult",
]
