"""
Configuration dataclasses for Splink vendor deduplication.
"""

from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path


# =============================================================================
# CRITICAL: Generic business names that should NOT be used as matching evidence
# Two companies both starting with GRUPO does NOT mean they're the same!
# =============================================================================
GENERIC_FIRST_TOKENS = {
    # Business types - extremely common, NOT evidence of same company
    'GRUPO', 'CONSTRUCTORA', 'CONSTRUCCIONES', 'COMERCIALIZADORA',
    'SERVICIOS', 'DISTRIBUIDORA', 'PROMOTORA', 'INMOBILIARIA',
    'OPERADORA', 'CONSULTORIA', 'PROVEEDORA', 'ADMINISTRADORA',
    'CORPORATIVO', 'INDUSTRIAL', 'EMPRESA', 'COMPANIA',
    'TRANSPORTES', 'INGENIERIA', 'SISTEMAS', 'SOLUCIONES',
    'COMUNICACIONES', 'TECNOLOGIA', 'DESARROLLO', 'MANTENIMIENTO',
    'ASESORES', 'ASESORIA', 'PROYECTOS', 'PRODUCTOS',

    # Insurance/Financial - NEVER merge across types
    'SEGUROS', 'BANCO', 'FINANCIERA', 'ARRENDADORA',

    # Government/Public - keep separate
    'GOBIERNO', 'INSTITUTO', 'UNIVERSIDAD', 'SECRETARIA',
}

# Tokens that indicate corporate subsidiaries - should NOT be merged
# e.g., PEMEX EXPLORACION and PEMEX REFINACION are DIFFERENT legal entities
SUBSIDIARY_INDICATORS = {
    'EXPLORACION', 'REFINACION', 'TRANSFORMACION', 'LOGISTICA',
    'COMERCIAL', 'OPERACIONES', 'PRODUCCION', 'DISTRIBUCION',
    'MANUFACTURA', 'SERVICIOS', 'INMOBILIARIA', 'FINANCIERA',
}

# Patterns that suggest a personal name (Maria de las Mercedes, etc.)
# These should NEVER be merged with companies
PERSONAL_NAME_PATTERNS = [
    'MARIA ', 'JOSE ', 'JUAN ', 'FRANCISCO ', 'PEDRO ', 'LUIS ',
    'CARLOS ', 'MIGUEL ', 'ANTONIO ', 'MANUEL ', 'JORGE ', 'RICARDO ',
    ' DE LAS ', ' DE LOS ', ' DEL ', ' Y CIA', ' E HIJOS',
]

# Brand names that are commonly confused with unrelated companies
# e.g., MERCEDES BENZ vs CONSTRUCTORA MERCEDES vs person named Mercedes
BRAND_CONFUSION_RISK = {
    'MERCEDES', 'YORK', 'MONTERREY', 'ALFA', 'VICTORIA',
    'NACIONAL', 'AMERICA', 'UNIVERSAL', 'CENTRAL', 'NORTE', 'SUR',
}


@dataclass
class BlockingConfig:
    """Configuration for blocking rules that reduce O(n^2) comparisons."""

    # Blocking rules for prediction (applied during matching)
    prediction_rules: list[str] = field(default_factory=lambda: [
        "rfc",  # Exact RFC match (NULLs won't match)
        "substr(l.normalized_name, 1, 10) = substr(r.normalized_name, 1, 10)",
        "l.phonetic_code = r.phonetic_code AND l.first_token = r.first_token",
    ])

    # Blocking rules for training (used during EM parameter estimation)
    training_rules: list[str] = field(default_factory=lambda: [
        "phonetic_code",
        "substr(l.normalized_name, 1, 8) = substr(r.normalized_name, 1, 8)",
        "first_token",
    ])


@dataclass
class SplinkConfig:
    """Core Splink model configuration."""

    # Probability threshold for considering a match
    match_probability_threshold: float = 0.97

    # Maximum pairs for random sampling during u-probability estimation
    training_sample_size: int = 10_000_000

    # Blocking configuration
    blocking: BlockingConfig = field(default_factory=BlockingConfig)

    # Comparison fields in order of importance
    comparison_fields: list[str] = field(default_factory=lambda: [
        "rfc",
        "normalized_name",
        "first_token",
        "legal_suffix",
        "corporate_group",
        "phonetic_code",
    ])

    # Jaro-Winkler thresholds for name comparison
    name_thresholds: list[float] = field(default_factory=lambda: [0.95, 0.88, 0.80])

    # Enable term frequency adjustments (recommended)
    use_term_frequency: bool = True

    # Retain intermediate columns for debugging
    retain_debug_columns: bool = True


@dataclass
class QualityThresholds:
    """Data quality validation thresholds - STRICT by default."""

    # Maximum allowed cluster size (REDUCED - large clusters are almost always wrong)
    max_cluster_size: int = 10

    # Minimum match probability to accept (RAISED for safety)
    min_match_probability: float = 0.99

    # Zero tolerance for RFC conflicts
    max_rfc_conflicts: int = 0

    # Clusters above this size get flagged for review
    flag_cluster_size: int = 5

    # Minimum name similarity for cluster members (RAISED)
    min_name_similarity: float = 0.90

    # Maximum name length difference ratio (REDUCED)
    max_length_diff_ratio: float = 0.3

    # NEW: Require RFC match for generic name vendors
    require_rfc_for_generic_names: bool = True

    # NEW: Block personal name patterns from being merged
    block_personal_names: bool = True

    # NEW: Block subsidiary indicators from being merged
    block_subsidiaries: bool = True


@dataclass
class DeduplicationConfig:
    """Combined configuration for full deduplication run."""

    # Path to SQLite database
    db_path: Path = field(default_factory=lambda: Path("backend/RUBLI_NORMALIZED.db"))

    # Splink model configuration
    splink: SplinkConfig = field(default_factory=SplinkConfig)

    # Quality validation thresholds
    quality: QualityThresholds = field(default_factory=QualityThresholds)

    # Output directory for reports
    output_dir: Optional[Path] = None

    # Batch ID for this run (auto-generated if not provided)
    batch_id: Optional[str] = None

    @classmethod
    def from_threshold(cls, threshold: float) -> "DeduplicationConfig":
        """Create config with custom threshold."""
        config = cls()
        config.splink.match_probability_threshold = threshold
        config.quality.min_match_probability = threshold
        return config


# Default configurations for common scenarios
CONSERVATIVE_CONFIG = DeduplicationConfig(
    splink=SplinkConfig(match_probability_threshold=0.99),
    quality=QualityThresholds(max_cluster_size=30),
)

BALANCED_CONFIG = DeduplicationConfig(
    splink=SplinkConfig(match_probability_threshold=0.97),
    quality=QualityThresholds(max_cluster_size=50),
)

AGGRESSIVE_CONFIG = DeduplicationConfig(
    splink=SplinkConfig(match_probability_threshold=0.90),
    quality=QualityThresholds(max_cluster_size=100, flag_cluster_size=50),
)
