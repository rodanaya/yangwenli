"""
HYPERION-PROMETHEUS: Vendor Deduplication Module

Deduplicates 320,429 vendor records using:
1. Name normalization (Spanish-aware)
2. Blocking strategies (reduce 51B → 5M comparisons)
3. Fellegi-Sunter probabilistic matching via Splink
4. Connected component clustering

Expected impact:
- Identify 30,000-50,000 duplicate records
- Correctly group PEMEX, WALMART, TELMEX variants
- Enable accurate vendor concentration analysis
"""

__version__ = "1.0.0"

# Will be populated when submodules are implemented
# from .normalize import VendorNormalizer
# from .matcher import SplinkMatcher
# from .cluster import VendorClusterer
