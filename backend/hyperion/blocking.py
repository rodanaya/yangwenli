"""
HYPERION Blocking: Blocking Strategy Engine

Implements blocking strategies to reduce O(n^2) comparison space.
For 320,429 vendors: 51 billion potential pairs → ~5 million with blocking.

Blocking strategies:
1. Exact RFC blocking (when available)
2. First N characters of normalized name
3. Phonetic code blocking
4. Institution-based blocking (same buyer)
"""

from typing import Iterator, Any
from collections import defaultdict
from dataclasses import dataclass


@dataclass
class BlockingKey:
    """A blocking key with its source strategy."""
    key: str
    strategy: str
    weight: float = 1.0


@dataclass
class CandidatePair:
    """A candidate pair of records to compare."""
    record1_id: Any
    record2_id: Any
    blocking_keys: list[str]
    priority: float = 1.0


class BlockingEngine:
    """
    Blocking strategy engine for entity resolution.

    Generates candidate pairs by grouping records that share
    blocking keys, dramatically reducing the comparison space.

    Example:
        >>> engine = BlockingEngine()
        >>> engine.add_strategy('rfc', lambda r: r.get('rfc'), weight=10.0)
        >>> engine.add_strategy('name_prefix', lambda r: r['name'][:5], weight=1.0)
        >>> candidates = engine.generate_candidates(records)
    """

    def __init__(self, min_block_size: int = 2, max_block_size: int = 1000):
        """
        Initialize blocking engine.

        Args:
            min_block_size: Minimum records in block to generate pairs
            max_block_size: Maximum block size (skip huge blocks)
        """
        self.min_block_size = min_block_size
        self.max_block_size = max_block_size
        self.strategies: list[tuple[str, callable, float]] = []

    def add_strategy(
        self,
        name: str,
        key_func: callable,
        weight: float = 1.0
    ) -> 'BlockingEngine':
        """
        Add a blocking strategy.

        Args:
            name: Strategy name for tracking
            key_func: Function that takes a record and returns blocking key(s)
            weight: Priority weight (higher = more important match)

        Returns:
            Self for chaining
        """
        self.strategies.append((name, key_func, weight))
        return self

    def generate_blocking_keys(self, record: dict) -> list[BlockingKey]:
        """
        Generate all blocking keys for a record.

        Args:
            record: Record dict

        Returns:
            List of BlockingKey objects
        """
        keys = []

        for name, key_func, weight in self.strategies:
            try:
                result = key_func(record)

                if result is None:
                    continue

                # Handle single key or list of keys
                if isinstance(result, (list, tuple)):
                    for key in result:
                        if key:
                            keys.append(BlockingKey(
                                key=f"{name}:{key}",
                                strategy=name,
                                weight=weight
                            ))
                elif result:
                    keys.append(BlockingKey(
                        key=f"{name}:{result}",
                        strategy=name,
                        weight=weight
                    ))

            except Exception:
                # Skip failed key generation
                continue

        return keys

    def build_blocks(
        self,
        records: list[dict],
        id_field: str = 'id'
    ) -> dict[str, list[Any]]:
        """
        Build blocking index from records.

        Args:
            records: List of record dicts
            id_field: Field name for record ID

        Returns:
            Dict mapping blocking keys to lists of record IDs
        """
        blocks = defaultdict(list)

        for record in records:
            record_id = record.get(id_field)
            if record_id is None:
                continue

            keys = self.generate_blocking_keys(record)

            for key in keys:
                blocks[key.key].append(record_id)

        return dict(blocks)

    def generate_candidates(
        self,
        records: list[dict],
        id_field: str = 'id'
    ) -> Iterator[CandidatePair]:
        """
        Generate candidate pairs from records.

        Args:
            records: List of record dicts
            id_field: Field name for record ID

        Yields:
            CandidatePair objects for comparison
        """
        # Build blocks
        blocks = self.build_blocks(records, id_field)

        # Track seen pairs to avoid duplicates
        seen_pairs: set[tuple] = set()

        # Track blocking keys per pair for priority
        pair_keys: dict[tuple, list[str]] = defaultdict(list)

        for key, record_ids in blocks.items():
            block_size = len(record_ids)

            # Skip blocks outside size range
            if block_size < self.min_block_size:
                continue
            if block_size > self.max_block_size:
                continue

            # Generate all pairs within block
            for i, id1 in enumerate(record_ids):
                for id2 in record_ids[i + 1:]:
                    # Normalize pair order
                    pair = (min(id1, id2), max(id1, id2))

                    if pair not in seen_pairs:
                        seen_pairs.add(pair)
                        pair_keys[pair] = [key]
                    else:
                        pair_keys[pair].append(key)

        # Yield candidate pairs with priority based on shared keys
        for (id1, id2), keys in pair_keys.items():
            # Higher priority for pairs sharing multiple blocking keys
            priority = len(keys)

            yield CandidatePair(
                record1_id=id1,
                record2_id=id2,
                blocking_keys=keys,
                priority=priority
            )

    def get_statistics(
        self,
        records: list[dict],
        id_field: str = 'id'
    ) -> dict:
        """
        Get blocking statistics for analysis.

        Args:
            records: List of record dicts
            id_field: Field name for record ID

        Returns:
            Dict with blocking statistics
        """
        blocks = self.build_blocks(records, id_field)

        total_records = len(records)
        total_pairs_without_blocking = total_records * (total_records - 1) // 2

        block_sizes = [len(ids) for ids in blocks.values()]

        # Count pairs in valid blocks
        valid_pairs = 0
        for size in block_sizes:
            if self.min_block_size <= size <= self.max_block_size:
                valid_pairs += size * (size - 1) // 2

        # Get strategy breakdown
        strategy_counts = defaultdict(int)
        for key in blocks:
            strategy = key.split(':')[0]
            strategy_counts[strategy] += 1

        return {
            'total_records': total_records,
            'total_pairs_without_blocking': total_pairs_without_blocking,
            'total_blocks': len(blocks),
            'valid_blocks': sum(
                1 for s in block_sizes
                if self.min_block_size <= s <= self.max_block_size
            ),
            'estimated_pairs_with_blocking': valid_pairs,
            'reduction_ratio': (
                1 - valid_pairs / total_pairs_without_blocking
                if total_pairs_without_blocking > 0 else 0
            ),
            'block_size_distribution': {
                'min': min(block_sizes) if block_sizes else 0,
                'max': max(block_sizes) if block_sizes else 0,
                'mean': sum(block_sizes) / len(block_sizes) if block_sizes else 0,
            },
            'strategy_block_counts': dict(strategy_counts),
        }


class VendorBlockingStrategy:
    """
    Pre-configured blocking strategy for vendor deduplication.

    Optimized for Mexican procurement vendor names with:
    - RFC blocking (exact, highest priority)
    - Name prefix blocking (5 chars)
    - Phonetic code blocking
    - First token blocking
    """

    @staticmethod
    def create_engine() -> BlockingEngine:
        """
        Create a blocking engine configured for vendors.

        Returns:
            Configured BlockingEngine
        """
        engine = BlockingEngine(min_block_size=2, max_block_size=500)

        # RFC blocking - highest priority, exact match
        engine.add_strategy(
            'rfc',
            lambda r: r.get('rfc') if r.get('rfc') else None,
            weight=10.0
        )

        # Name prefix blocking - first 5 chars
        engine.add_strategy(
            'prefix5',
            lambda r: r.get('normalized_name', '')[:5] if len(r.get('normalized_name', '')) >= 5 else None,
            weight=2.0
        )

        # Phonetic code blocking
        engine.add_strategy(
            'phonetic',
            lambda r: r.get('phonetic_code'),
            weight=3.0
        )

        # First token blocking
        engine.add_strategy(
            'first_token',
            lambda r: r.get('first_token'),
            weight=1.5
        )

        return engine


class InstitutionBlockingStrategy:
    """
    Pre-configured blocking strategy for institution classification.

    Uses different signals appropriate for government institutions:
    - State prefix blocking
    - Keyword-based blocking
    - Sector-based blocking (for validation)
    """

    @staticmethod
    def create_engine() -> BlockingEngine:
        """
        Create a blocking engine configured for institutions.

        Returns:
            Configured BlockingEngine
        """
        engine = BlockingEngine(min_block_size=2, max_block_size=200)

        # State prefix blocking
        engine.add_strategy(
            'state',
            lambda r: r.get('state_code'),
            weight=5.0
        )

        # Sector blocking
        engine.add_strategy(
            'sector',
            lambda r: r.get('sector_id'),
            weight=3.0
        )

        # Name prefix
        engine.add_strategy(
            'prefix5',
            lambda r: r.get('normalized_name', '')[:5] if len(r.get('normalized_name', '')) >= 5 else None,
            weight=1.0
        )

        return engine


# Module-level convenience functions
def create_vendor_blocking() -> BlockingEngine:
    """Create vendor-optimized blocking engine."""
    return VendorBlockingStrategy.create_engine()


def create_institution_blocking() -> BlockingEngine:
    """Create institution-optimized blocking engine."""
    return InstitutionBlockingStrategy.create_engine()
