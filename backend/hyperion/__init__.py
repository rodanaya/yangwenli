"""
HYPERION: Entity Resolution & Classification System

> "The fleet that adapts, survives." - RUBLI

A state-of-the-art entity resolution system for Mexican government
procurement data, covering institution classification and vendor deduplication.

Components:
- HYPERION-ATLAS: Institution Classification
- HYPERION-PROMETHEUS: Vendor Deduplication

Shared modules:
- normalizer: Spanish name normalization
- phonetic: Spanish phonetic encoding (Soundex)
- similarity: String similarity metrics
- blocking: Blocking strategy engine
"""

__version__ = "1.0.0"
__author__ = "RUBLI Project"

from .normalizer import HyperionNormalizer
from .phonetic import SpanishSoundex
from .similarity import SimilarityMetrics
from .blocking import BlockingEngine

__all__ = [
    "HyperionNormalizer",
    "SpanishSoundex",
    "SimilarityMetrics",
    "BlockingEngine",
]
