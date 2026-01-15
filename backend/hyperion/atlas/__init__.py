"""
HYPERION-ATLAS: Institution Classification Module

Classifies Mexican government institutions into standardized categories
using a 3-tier approach:
1. Direct mapping (known entities, ramo_id)
2. Keyword-based rules (priority-ordered patterns)
3. ML classifier (for ambiguous cases)

Expected impact:
- Reduce "otros" sector from 56.4% to <5%
- Correctly classify IMSS, SAT, Caminos y Puentes, etc.
"""

__version__ = "1.0.0"

# Will be populated when submodules are implemented
# from .rules import AtlasRuleClassifier
# from .ml_classifier import AtlasMLClassifier
# from .taxonomy import InstitutionTaxonomy
