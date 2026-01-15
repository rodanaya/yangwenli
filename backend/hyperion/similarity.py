"""
HYPERION Similarity: String Similarity Metrics

Provides fast string similarity calculations using RapidFuzz.
Implements multiple metrics optimized for Mexican entity names:
- Jaro-Winkler: Best for short strings with typos
- Token-based: Best for reordered words
- Levenshtein: Edit distance based
- Weighted combinations for entity matching
"""

from typing import Callable
from rapidfuzz import fuzz
from rapidfuzz.distance import Levenshtein, JaroWinkler


class SimilarityMetrics:
    """
    High-performance string similarity calculator using RapidFuzz.

    RapidFuzz is 16x faster than FuzzyWuzzy with identical results.
    This class provides a clean interface for the metrics most useful
    in entity resolution.

    Example:
        >>> metrics = SimilarityMetrics()
        >>> metrics.jaro_winkler("CONSTRUCCIONES AZTECA", "CONSTRUCCIONES ASTECA")
        0.9714...
        >>> metrics.token_set("FARMACIA DEL NORTE SA", "DEL NORTE FARMACIA SA")
        1.0
    """

    def __init__(self, score_cutoff: float = 0.0):
        """
        Initialize metrics calculator.

        Args:
            score_cutoff: Minimum score to return (returns 0 if below).
                         Use for performance when filtering low matches.
        """
        self.score_cutoff = score_cutoff

    def jaro_winkler(self, s1: str, s2: str, prefix_weight: float = 0.1) -> float:
        """
        Jaro-Winkler similarity (0-1).

        Best for:
        - Short strings
        - Names with typos at the end
        - Prefix matching (common in company names)

        Args:
            s1: First string
            s2: Second string
            prefix_weight: Bonus for matching prefixes (0-0.25)

        Returns:
            Similarity score 0-1
        """
        if not s1 or not s2:
            return 0.0

        return JaroWinkler.similarity(
            s1, s2,
            prefix_weight=prefix_weight,
            score_cutoff=self.score_cutoff
        )

    def levenshtein_ratio(self, s1: str, s2: str) -> float:
        """
        Levenshtein similarity ratio (0-1).

        Normalized edit distance. Counts insertions, deletions,
        and substitutions needed to transform s1 to s2.

        Best for:
        - Detecting typos and OCR errors
        - Short to medium length strings

        Args:
            s1: First string
            s2: Second string

        Returns:
            Similarity score 0-1
        """
        if not s1 or not s2:
            return 0.0

        return Levenshtein.normalized_similarity(
            s1, s2,
            score_cutoff=self.score_cutoff
        )

    def token_sort(self, s1: str, s2: str) -> float:
        """
        Token Sort Ratio (0-100, normalized to 0-1).

        Sorts tokens alphabetically before comparing.
        Handles word reordering.

        Best for:
        - Names where word order varies
        - "FARMACIA DEL NORTE" vs "DEL NORTE FARMACIA"

        Args:
            s1: First string
            s2: Second string

        Returns:
            Similarity score 0-1
        """
        if not s1 or not s2:
            return 0.0

        return fuzz.token_sort_ratio(
            s1, s2,
            score_cutoff=self.score_cutoff * 100
        ) / 100.0

    def token_set(self, s1: str, s2: str) -> float:
        """
        Token Set Ratio (0-100, normalized to 0-1).

        Compares token sets, ignoring order and duplicates.
        Very permissive - use with caution.

        Best for:
        - Detecting if same tokens appear
        - Handling abbreviations/extra words

        Args:
            s1: First string
            s2: Second string

        Returns:
            Similarity score 0-1
        """
        if not s1 or not s2:
            return 0.0

        return fuzz.token_set_ratio(
            s1, s2,
            score_cutoff=self.score_cutoff * 100
        ) / 100.0

    def partial_ratio(self, s1: str, s2: str) -> float:
        """
        Partial Ratio (0-100, normalized to 0-1).

        Finds best partial match. Useful when one string
        is a substring of another.

        Best for:
        - Short vs long name variants
        - "PEMEX" vs "PETROLEOS MEXICANOS"

        Args:
            s1: First string
            s2: Second string

        Returns:
            Similarity score 0-1
        """
        if not s1 or not s2:
            return 0.0

        return fuzz.partial_ratio(
            s1, s2,
            score_cutoff=self.score_cutoff * 100
        ) / 100.0

    def weighted_ratio(self, s1: str, s2: str) -> float:
        """
        Weighted Ratio (0-100, normalized to 0-1).

        RapidFuzz's smart combination of different ratios.
        Generally the best single metric for unknown data.

        Args:
            s1: First string
            s2: Second string

        Returns:
            Similarity score 0-1
        """
        if not s1 or not s2:
            return 0.0

        return fuzz.WRatio(
            s1, s2,
            score_cutoff=self.score_cutoff * 100
        ) / 100.0

    def quick_ratio(self, s1: str, s2: str) -> float:
        """
        Quick Ratio (0-100, normalized to 0-1).

        Fast approximation of ratio. Use for initial filtering.

        Args:
            s1: First string
            s2: Second string

        Returns:
            Similarity score 0-1
        """
        if not s1 or not s2:
            return 0.0

        return fuzz.QRatio(
            s1, s2,
            score_cutoff=self.score_cutoff * 100
        ) / 100.0

    def jaccard_tokens(self, s1: str, s2: str) -> float:
        """
        Jaccard similarity on token sets.

        |intersection| / |union| of token sets.

        Best for:
        - Bag-of-words comparison
        - When token presence matters more than position

        Args:
            s1: First string
            s2: Second string

        Returns:
            Similarity score 0-1
        """
        if not s1 or not s2:
            return 0.0

        tokens1 = set(s1.split())
        tokens2 = set(s2.split())

        if not tokens1 and not tokens2:
            return 1.0

        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)

        return intersection / union if union > 0 else 0.0

    def hybrid_score(
        self,
        s1: str,
        s2: str,
        weights: dict[str, float] | None = None
    ) -> float:
        """
        Weighted combination of multiple metrics.

        Default weights optimized for Mexican company names:
        - jaro_winkler: 0.4 (good for prefix/typo)
        - token_set: 0.3 (good for word reorder)
        - jaccard: 0.3 (good for bag-of-words)

        Args:
            s1: First string
            s2: Second string
            weights: Optional custom weights dict

        Returns:
            Weighted similarity score 0-1
        """
        if weights is None:
            weights = {
                'jaro_winkler': 0.4,
                'token_set': 0.3,
                'jaccard': 0.3,
            }

        scores = {
            'jaro_winkler': self.jaro_winkler(s1, s2),
            'token_set': self.token_set(s1, s2),
            'jaccard': self.jaccard_tokens(s1, s2),
            'levenshtein': self.levenshtein_ratio(s1, s2),
            'partial': self.partial_ratio(s1, s2),
        }

        total_weight = sum(weights.get(k, 0) for k in scores)
        if total_weight == 0:
            return 0.0

        weighted_sum = sum(
            scores[k] * weights.get(k, 0)
            for k in scores
            if k in weights
        )

        return weighted_sum / total_weight


class EntityMatcher:
    """
    High-level entity matching using multiple signals.

    Combines string similarity with other entity attributes
    like RFC, phonetic codes, and blocking keys.
    """

    def __init__(
        self,
        name_threshold: float = 0.85,
        strict_mode: bool = False
    ):
        """
        Initialize matcher.

        Args:
            name_threshold: Minimum name similarity to consider match
            strict_mode: If True, require RFC match when both present
        """
        self.name_threshold = name_threshold
        self.strict_mode = strict_mode
        self.metrics = SimilarityMetrics()

    def match_score(
        self,
        name1: str,
        name2: str,
        rfc1: str | None = None,
        rfc2: str | None = None,
        phonetic1: str | None = None,
        phonetic2: str | None = None,
    ) -> dict:
        """
        Calculate comprehensive match score between two entities.

        Args:
            name1: First entity name (normalized)
            name2: Second entity name (normalized)
            rfc1: First RFC (optional)
            rfc2: Second RFC (optional)
            phonetic1: First phonetic code (optional)
            phonetic2: Second phonetic code (optional)

        Returns:
            Dict with match scores and decision
        """
        result = {
            'name_similarity': 0.0,
            'rfc_match': None,
            'phonetic_match': None,
            'final_score': 0.0,
            'is_match': False,
            'confidence': 'low',
        }

        # Name similarity (required)
        name_sim = self.metrics.hybrid_score(name1, name2)
        result['name_similarity'] = name_sim

        # RFC comparison (if both present)
        if rfc1 and rfc2:
            rfc_match = rfc1 == rfc2
            result['rfc_match'] = rfc_match

            if self.strict_mode and not rfc_match:
                # Different RFCs = different entities
                result['final_score'] = 0.0
                result['is_match'] = False
                result['confidence'] = 'high'
                return result

            if rfc_match:
                # Same RFC = same entity (very high confidence)
                result['final_score'] = 1.0
                result['is_match'] = True
                result['confidence'] = 'very_high'
                return result

        # Phonetic comparison (if both present)
        if phonetic1 and phonetic2:
            phonetic_match = phonetic1 == phonetic2
            result['phonetic_match'] = phonetic_match

        # Calculate final score
        score = name_sim

        # Boost for phonetic match
        if result['phonetic_match']:
            score = score * 0.9 + 0.1  # Boost toward 1.0

        result['final_score'] = score
        result['is_match'] = score >= self.name_threshold

        # Confidence based on available signals
        if result['rfc_match'] is True:
            result['confidence'] = 'very_high'
        elif result['phonetic_match'] and score >= 0.95:
            result['confidence'] = 'high'
        elif score >= 0.90:
            result['confidence'] = 'medium'
        else:
            result['confidence'] = 'low'

        return result


# Module-level convenience functions
def jaro_winkler(s1: str, s2: str) -> float:
    """Quick Jaro-Winkler similarity."""
    return SimilarityMetrics().jaro_winkler(s1, s2)


def token_similarity(s1: str, s2: str) -> float:
    """Quick token set similarity."""
    return SimilarityMetrics().token_set(s1, s2)


def hybrid_similarity(s1: str, s2: str) -> float:
    """Quick hybrid similarity score."""
    return SimilarityMetrics().hybrid_score(s1, s2)
