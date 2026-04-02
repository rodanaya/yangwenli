"""
ETL integration tests — validate boundary logic against real ETL functions.

These tests import directly from etl_pipeline and etl_classify
and verify amount validation, vendor normalization, and hash stability.
"""
import sys
import os

# The scripts directory is not a package; add it to sys.path so we can import.
_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "scripts")
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

import pytest


# ---------------------------------------------------------------------------
# Helpers — import lazily so import errors surface clearly in pytest output
# ---------------------------------------------------------------------------

def _import_parse_amount():
    from etl_pipeline import parse_amount, MAX_CONTRACT_VALUE, FLAG_THRESHOLD
    return parse_amount, MAX_CONTRACT_VALUE, FLAG_THRESHOLD


def _import_normalize_vendor_name():
    from etl_classify import normalize_vendor_name
    return normalize_vendor_name


def _import_compute_contract_hash():
    from etl_pipeline import compute_contract_hash
    return compute_contract_hash


# ---------------------------------------------------------------------------
# parse_amount — boundary tests
# ---------------------------------------------------------------------------

class TestParseAmountBoundaries:
    """Test parse_amount() at the 10B and 100B MXN thresholds."""

    def setup_method(self):
        # Reset global VALIDATION_STATS so each test starts clean
        import etl_pipeline
        etl_pipeline.VALIDATION_STATS = {"rejected": 0, "flagged": 0, "total": 0}

    def test_exactly_10b_is_accepted_not_flagged(self):
        """
        Exactly 10B MXN: the check is 'amount > FLAG_THRESHOLD' (strictly greater),
        so exactly 10B is accepted without flagging.
        """
        import etl_pipeline
        parse_amount, MAX_CONTRACT_VALUE, FLAG_THRESHOLD = _import_parse_amount()
        result = parse_amount(FLAG_THRESHOLD)
        # Value is preserved (not zeroed)
        assert result == float(FLAG_THRESHOLD)
        # Exactly at boundary — NOT flagged (> is strict)
        assert etl_pipeline.VALIDATION_STATS["flagged"] == 0
        assert etl_pipeline.VALIDATION_STATS["rejected"] == 0

    def test_above_10b_is_flagged(self):
        """10B + 1 MXN: strictly above FLAG_THRESHOLD — flagged but not rejected."""
        import etl_pipeline
        parse_amount, MAX_CONTRACT_VALUE, FLAG_THRESHOLD = _import_parse_amount()
        amount = FLAG_THRESHOLD + 1
        result = parse_amount(amount)
        # Value is preserved (not zeroed)
        assert result == float(amount)
        # Flagged counter incremented
        assert etl_pipeline.VALIDATION_STATS["flagged"] == 1
        assert etl_pipeline.VALIDATION_STATS["rejected"] == 0

    def test_just_under_10b_is_accepted_without_flag(self):
        """9,999,999,999 MXN: below flag threshold — accepted normally."""
        import etl_pipeline
        parse_amount, MAX_CONTRACT_VALUE, FLAG_THRESHOLD = _import_parse_amount()
        amount = FLAG_THRESHOLD - 1
        result = parse_amount(amount)
        assert result == float(amount)
        assert etl_pipeline.VALIDATION_STATS["flagged"] == 0
        assert etl_pipeline.VALIDATION_STATS["rejected"] == 0

    def test_exactly_100b_is_flagged_not_rejected(self):
        """
        Exactly 100B MXN: the check is 'amount > MAX_CONTRACT_VALUE' (strictly greater),
        so exactly 100B is flagged (> 10B), not rejected.
        """
        import etl_pipeline
        parse_amount, MAX_CONTRACT_VALUE, FLAG_THRESHOLD = _import_parse_amount()
        result = parse_amount(MAX_CONTRACT_VALUE)
        # Value is preserved at exactly 100B (not zeroed)
        assert result == float(MAX_CONTRACT_VALUE)
        # Flagged (it's > FLAG_THRESHOLD) but NOT rejected (not > MAX_CONTRACT_VALUE)
        assert etl_pipeline.VALIDATION_STATS["flagged"] == 1
        assert etl_pipeline.VALIDATION_STATS["rejected"] == 0

    def test_above_100b_is_rejected_and_zeroed(self):
        """100B + 1 MXN: strictly above MAX_CONTRACT_VALUE — rejected, returned as 0."""
        import etl_pipeline
        parse_amount, MAX_CONTRACT_VALUE, FLAG_THRESHOLD = _import_parse_amount()
        result = parse_amount(MAX_CONTRACT_VALUE + 1)
        assert result == 0.0
        assert etl_pipeline.VALIDATION_STATS["rejected"] == 1

    def test_zero_is_accepted(self):
        parse_amount, _, _ = _import_parse_amount()
        assert parse_amount(0) == 0.0

    def test_normal_amount_is_accepted(self):
        parse_amount, _, _ = _import_parse_amount()
        result = parse_amount(500_000_000)  # 500M MXN
        assert result == 500_000_000.0

    def test_string_amount_parsed_correctly(self):
        parse_amount, _, _ = _import_parse_amount()
        # Common COMPRANET format with commas
        result = parse_amount("1,234,567.89")
        assert abs(result - 1_234_567.89) < 0.01

    def test_nan_returns_zero(self):
        import pandas as pd
        parse_amount, _, _ = _import_parse_amount()
        assert parse_amount(pd.NA) == 0.0

    def test_trillion_peso_rejected(self):
        """Trillion-peso value (like the ogulin disaster) must be rejected."""
        parse_amount, _, _ = _import_parse_amount()
        result = parse_amount(1_000_000_000_000)  # 1 trillion
        assert result == 0.0


# ---------------------------------------------------------------------------
# normalize_vendor_name — idempotency tests
# ---------------------------------------------------------------------------

class TestNormalizeVendorNameIdempotency:
    """Normalizing a name twice must give the same result as once."""

    def _normalize(self, name: str) -> str:
        normalize_vendor_name = _import_normalize_vendor_name()
        return normalize_vendor_name(name)

    def test_plain_name_idempotent(self):
        once = self._normalize("Constructora del Norte S.A. de C.V.")
        twice = self._normalize(once)
        assert once == twice

    def test_legal_suffix_normalization_idempotent(self):
        once = self._normalize("DISTRIBUIDORA FARMACEUTICA S.A. DE C.V.")
        twice = self._normalize(once)
        assert once == twice

    def test_mixed_case_idempotent(self):
        once = self._normalize("laboratorios pisa sa de cv")
        twice = self._normalize(once)
        assert once == twice

    def test_accented_characters_idempotent(self):
        once = self._normalize("Construcción Azteca S.A. de C.V.")
        twice = self._normalize(once)
        assert once == twice

    def test_empty_string_idempotent(self):
        once = self._normalize("")
        twice = self._normalize(once)
        assert once == twice

    def test_punctuation_removal_idempotent(self):
        once = self._normalize("EMPRESA, S.A.: SERVICIOS")
        twice = self._normalize(once)
        assert once == twice


# ---------------------------------------------------------------------------
# compute_contract_hash — encoding-variation stability
# ---------------------------------------------------------------------------

class TestComputeContractHash:
    """Hash must be stable across minor encoding variations of the same vendor name."""

    def _hash(self, procedure_number, vendor_name, amount, year):
        compute_contract_hash = _import_compute_contract_hash()
        return compute_contract_hash(procedure_number, vendor_name, amount, year)

    def test_same_inputs_give_same_hash(self):
        h1 = self._hash("PROC-2024-001", "EMPRESA SA", 1_000_000.0, 2024)
        h2 = self._hash("PROC-2024-001", "EMPRESA SA", 1_000_000.0, 2024)
        assert h1 == h2

    def test_hash_is_hex_string(self):
        h = self._hash("PROC-001", "VENDOR", 500.0, 2020)
        assert isinstance(h, str)
        # SHA-256 hex digest is 64 characters
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)

    def test_different_amounts_give_different_hashes(self):
        h1 = self._hash("PROC-001", "VENDOR", 1_000.0, 2020)
        h2 = self._hash("PROC-001", "VENDOR", 2_000.0, 2020)
        assert h1 != h2

    def test_different_vendors_give_different_hashes(self):
        h1 = self._hash("PROC-001", "VENDOR A", 1_000.0, 2020)
        h2 = self._hash("PROC-001", "VENDOR B", 1_000.0, 2020)
        assert h1 != h2

    def test_normalized_name_hash_stability(self):
        """
        After normalizing a vendor name, the hash should be stable on repeated calls
        (idempotency of normalization feeds into hash stability).
        """
        normalize_vendor_name = _import_normalize_vendor_name()
        raw = "Distribuidora Farmacéutica S.A. de C.V."
        normalized = normalize_vendor_name(raw)
        # Hash with normalized name is deterministic
        h1 = self._hash("PROC-2024-099", normalized, 5_000_000.0, 2024)
        h2 = self._hash("PROC-2024-099", normalized, 5_000_000.0, 2024)
        assert h1 == h2

    def test_none_procedure_number_handled(self):
        """None procedure_number should not raise — produces valid hash."""
        h = self._hash(None, "VENDOR", 100.0, 2021)
        assert isinstance(h, str) and len(h) == 64

    def test_none_year_handled(self):
        h = self._hash("PROC-001", "VENDOR", 100.0, None)
        assert isinstance(h, str) and len(h) == 64
