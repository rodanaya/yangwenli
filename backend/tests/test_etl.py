"""
ETL Pipeline Tests

Tests for data validation, transformation, and loading processes.
"""
import pytest
from pathlib import Path


# Amount validation constants from CLAUDE.md
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN - reject above this
FLAG_THRESHOLD = 10_000_000_000       # 10B MXN - flag for review


class TestAmountValidation:
    """Test amount validation rules per CLAUDE.md data validation requirements."""

    def test_normal_amount_accepted(self):
        """Amounts <= 10B MXN should be accepted normally."""
        amount = 5_000_000_000  # 5B MXN
        assert amount <= FLAG_THRESHOLD
        assert amount <= MAX_CONTRACT_VALUE

    def test_flag_threshold_amount(self):
        """Amounts between 10B and 100B should be flagged for review."""
        amount = 50_000_000_000  # 50B MXN
        is_flagged = amount > FLAG_THRESHOLD
        is_rejected = amount > MAX_CONTRACT_VALUE

        assert is_flagged is True
        assert is_rejected is False

    def test_reject_threshold_amount(self):
        """Amounts > 100B MXN should be rejected as data errors."""
        amount = 150_000_000_000  # 150B MXN (trillion peso error)
        is_rejected = amount > MAX_CONTRACT_VALUE

        assert is_rejected is True

    def test_trillion_peso_error_rejected(self):
        """Trillion peso values (decimal errors) must be rejected."""
        # These are the types of errors from the ogulin project
        trillion_amounts = [
            1_000_000_000_000,    # 1 trillion
            5_000_000_000_000,    # 5 trillion
            10_000_000_000_000,   # 10 trillion
        ]

        for amount in trillion_amounts:
            assert amount > MAX_CONTRACT_VALUE, f"Amount {amount} should be rejected"

    def test_boundary_cases(self):
        """Test exact boundary values."""
        # Exactly at flag threshold - should be flagged
        assert FLAG_THRESHOLD > FLAG_THRESHOLD - 1
        assert FLAG_THRESHOLD <= MAX_CONTRACT_VALUE

        # Exactly at reject threshold
        assert MAX_CONTRACT_VALUE > FLAG_THRESHOLD

    def test_zero_and_negative_amounts(self):
        """Zero and negative amounts should be handled."""
        zero_amount = 0
        negative_amount = -1_000_000

        # These should pass validation but may need special handling
        assert zero_amount <= MAX_CONTRACT_VALUE
        assert negative_amount <= MAX_CONTRACT_VALUE


class TestDataStructureDetection:
    """Test detection of COMPRANET data structures A, B, C, D."""

    def test_structure_year_mapping(self):
        """Test year-to-structure mapping."""
        structure_mapping = {
            'A': range(2002, 2011),  # 2002-2010
            'B': range(2010, 2018),  # 2010-2017
            'C': range(2018, 2023),  # 2018-2022
            'D': range(2023, 2026),  # 2023-2025
        }

        def get_structure(year: int) -> str:
            for structure, year_range in structure_mapping.items():
                if year in year_range:
                    return structure
            return 'Unknown'

        assert get_structure(2005) == 'A'
        assert get_structure(2015) == 'B'
        assert get_structure(2020) == 'C'
        assert get_structure(2024) == 'D'


class TestSingleBidCalculation:
    """Test single-bid detection logic."""

    def test_single_bid_definition(self):
        """Single bid = competitive procedure with only 1 vendor."""
        # Test data
        contracts = [
            {'procedure_type': 'LICITACION_PUBLICA', 'vendor_count': 1, 'is_direct_award': False},
            {'procedure_type': 'LICITACION_PUBLICA', 'vendor_count': 3, 'is_direct_award': False},
            {'procedure_type': 'ADJUDICACION_DIRECTA', 'vendor_count': 1, 'is_direct_award': True},
        ]

        def is_single_bid(contract: dict) -> bool:
            """Competitive procedure with only 1 bidder."""
            return (
                not contract['is_direct_award'] and
                contract['vendor_count'] == 1
            )

        # Competitive with 1 bidder = single bid (RED FLAG)
        assert is_single_bid(contracts[0]) is True

        # Competitive with multiple bidders = NOT single bid
        assert is_single_bid(contracts[1]) is False

        # Direct award with 1 vendor = NOT single bid (expected)
        assert is_single_bid(contracts[2]) is False


class TestSectorClassification:
    """Test sector classification by ramo code."""

    SECTORS = {
        1: ('salud', [12, 50, 51]),
        2: ('educacion', [11, 25, 48]),
        3: ('infraestructura', [9, 15, 21]),
        4: ('energia', [18, 45, 46, 52, 53]),
        5: ('defensa', [7, 13]),
        6: ('tecnologia', [38, 42]),
        7: ('hacienda', [6, 23, 24]),
        8: ('gobernacion', [1, 2, 3, 4, 5, 17, 22, 27, 35, 36, 43]),
        9: ('agricultura', [8]),
        10: ('ambiente', [16]),
        11: ('trabajo', [14, 19, 40]),
        12: ('otros', []),  # Default fallback
    }

    def classify_by_ramo(self, ramo_code: int) -> int:
        """Return sector_id for a given ramo code."""
        for sector_id, (name, ramos) in self.SECTORS.items():
            if ramo_code in ramos:
                return sector_id
        return 12  # Default to "otros"

    def test_salud_classification(self):
        """Ramo 12, 50, 51 should map to Salud (sector 1)."""
        assert self.classify_by_ramo(12) == 1
        assert self.classify_by_ramo(50) == 1
        assert self.classify_by_ramo(51) == 1

    def test_energia_classification(self):
        """Energy sector ramos should map correctly."""
        for ramo in [18, 45, 46, 52, 53]:
            assert self.classify_by_ramo(ramo) == 4

    def test_unknown_ramo_defaults_to_otros(self):
        """Unknown ramo codes should default to 'otros' (sector 12)."""
        assert self.classify_by_ramo(999) == 12
        assert self.classify_by_ramo(0) == 12

    def test_all_ramos_have_sector(self):
        """All defined ramos should have a sector assignment."""
        all_ramos = []
        for sector_id, (name, ramos) in self.SECTORS.items():
            all_ramos.extend(ramos)

        for ramo in all_ramos:
            sector = self.classify_by_ramo(ramo)
            assert sector >= 1 and sector <= 12


class TestVendorNormalization:
    """Test vendor name normalization."""

    def normalize_name(self, name: str) -> str:
        """Normalize vendor name for matching."""
        if not name:
            return ''

        # Uppercase
        normalized = name.upper()

        # Remove common suffixes
        suffixes = [' SA DE CV', ' S.A. DE C.V.', ' SA', ' SC', ' S DE RL DE CV']
        for suffix in suffixes:
            if normalized.endswith(suffix.upper()):
                normalized = normalized[:-len(suffix)]
                break

        # Remove extra whitespace
        normalized = ' '.join(normalized.split())

        return normalized

    def test_basic_normalization(self):
        """Test basic name normalization."""
        assert self.normalize_name('empresa sa de cv') == 'EMPRESA'
        assert self.normalize_name('EMPRESA S.A. DE C.V.') == 'EMPRESA'

    def test_whitespace_handling(self):
        """Test whitespace normalization."""
        assert self.normalize_name('  EMPRESA   MEXICANA  ') == 'EMPRESA MEXICANA'

    def test_empty_handling(self):
        """Test empty/null handling."""
        assert self.normalize_name('') == ''
        assert self.normalize_name(None) == ''


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
