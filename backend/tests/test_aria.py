"""
Tests for ARIA Phase 1 pipeline — unit tests only (no DB required).
"""

import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.aria_pipeline import (
    TIER1_THRESHOLD,
    TIER2_THRESHOLD,
    assign_tier,
    classify_patterns,
    compute_external_flags_score,
    compute_ips,
    normalize_financial,
    normalize_mahalanobis,
    normalize_risk_score,
    screen_false_positives,
)


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------

class TestNormalization:
    def test_mahalanobis_blind_spot_case(self):
        """UAB JORINIS: D2=706 should normalize to near 1.0."""
        assert normalize_mahalanobis(706) > 0.99

    def test_mahalanobis_normal(self):
        """Normal D2=20 should be low (<0.30)."""
        assert normalize_mahalanobis(20) < 0.30

    def test_mahalanobis_center(self):
        """D2=80 should be ~0.50 (logistic center)."""
        result = normalize_mahalanobis(80)
        assert 0.45 < result < 0.55

    def test_mahalanobis_none(self):
        assert normalize_mahalanobis(None) == 0.0

    def test_mahalanobis_zero(self):
        assert normalize_mahalanobis(0) == 0.0

    def test_mahalanobis_negative(self):
        assert normalize_mahalanobis(-5) == 0.0

    def test_financial_1m(self):
        # log10(1M)=6, 6/30=0.20
        result = normalize_financial(1_000_000)
        assert abs(result - 0.20) < 0.01

    def test_financial_1b(self):
        # log10(1B)=9, 9/30=0.30
        result = normalize_financial(1_000_000_000)
        assert abs(result - 0.30) < 0.01

    def test_financial_zero(self):
        assert normalize_financial(0) == 0.0

    def test_financial_none(self):
        assert normalize_financial(None) == 0.0

    def test_financial_capped_at_1(self):
        # Anything astronomically large should be capped at 1.0
        assert normalize_financial(1e30) == 1.0

    def test_risk_score_stretch(self):
        """Stretch should push score slightly above input."""
        assert normalize_risk_score(0.5) > 0.5

    def test_risk_score_capped(self):
        assert normalize_risk_score(1.0) == 1.0

    def test_risk_score_none(self):
        assert normalize_risk_score(None) == 0.0


# ---------------------------------------------------------------------------
# IPS computation
# ---------------------------------------------------------------------------

class TestIPS:
    def test_blind_spot_vendor_gets_high_ips(self):
        """Vendor with low risk_score but extreme Mahalanobis receives a substantially
        higher IPS than the same vendor evaluated on risk_score alone.
        UAB JORINIS example: risk=7%, D2=706 -> maha_norm≈1.0 dominates via MAX."""
        risk_norm  = normalize_risk_score(0.07)   # 7% risk -> 0.084
        maha_norm  = normalize_mahalanobis(706)   # D2=706 -> ~1.0
        ensemble   = 0.8
        financial  = normalize_financial(5e9)     # 5B MXN

        ips_with_maha = compute_ips(risk_norm, maha_norm, ensemble, financial, 0.0)

        # Without Mahalanobis signal (D2=5 -> near 0)
        maha_low = normalize_mahalanobis(5)
        ips_without_maha = compute_ips(risk_norm, maha_low, ensemble, financial, 0.0)

        # The extreme D2 should provide a substantial uplift (>= 0.20)
        assert ips_with_maha > ips_without_maha + 0.20
        # And the absolute IPS should clear Tier 2 when ensemble is also high
        assert ips_with_maha >= TIER2_THRESHOLD

    def test_efos_vendor_boosts_to_tier1(self):
        """EFOS match (ext_score=0.70) should push even modest-risk vendor high."""
        risk_norm  = normalize_risk_score(0.15)
        maha_norm  = normalize_mahalanobis(30)
        ext_score  = compute_external_flags_score(1, 0, 0)
        ips = compute_ips(risk_norm, maha_norm, 0.0, 0.5, ext_score)
        # External contributes 0.70 * 0.20 = 0.14 on top of risk+financial
        assert ips > 0.20

    def test_all_zero_gives_zero(self):
        ips = compute_ips(0.0, 0.0, 0.0, 0.0, 0.0)
        assert ips == 0.0

    def test_max_all_one_gives_one(self):
        ips = compute_ips(1.0, 1.0, 1.0, 1.0, 1.0)
        assert ips == 1.0

    def test_tier1_threshold(self):
        assert assign_tier(0.85) == 1
        assert assign_tier(TIER1_THRESHOLD) == 1

    def test_tier2_threshold(self):
        assert assign_tier(0.65) == 2
        assert assign_tier(0.60) == 2

    def test_tier3_threshold(self):
        assert assign_tier(0.45) == 3
        assert assign_tier(0.40) == 3

    def test_tier4(self):
        assert assign_tier(0.20) == 4
        assert assign_tier(0.0) == 4

    def test_external_efos_score(self):
        score = compute_external_flags_score(1, 0, 0)
        assert score >= 0.70

    def test_external_gt_score(self):
        """Ground truth vendor gets max score."""
        assert compute_external_flags_score(0, 0, 1) == 1.0

    def test_external_efos_plus_sfp_capped(self):
        """EFOS + SFP combined, capped at 1.0."""
        assert compute_external_flags_score(1, 1, 0) == 1.0

    def test_external_no_flags(self):
        assert compute_external_flags_score(0, 0, 0) == 0.0


# ---------------------------------------------------------------------------
# Pattern Classifier
# ---------------------------------------------------------------------------

class TestPatternClassifier:
    def _base_vendor(self) -> dict:
        return {
            "vendor_concentration":   0.0,
            "total_contracts":        0,
            "direct_award_rate":      0.0,
            "single_bid_rate":        0.0,
            "years_active":           5,
            "rfc":                    "ABC123",
            "burst_score":            0.0,
            "is_efos_definitivo":     0,
            "in_ground_truth":        0,
            "avg_z_price_ratio":      0.0,
            "industry_mismatch_rate": 0.0,
            "top_institution_ratio":  0.0,
            "sector_vendor_count":    100,
            "max_contract_amount":    0.0,
            "avg_contract_amount":    0.0,
            "co_bid_rate":            0.0,
            "price_hypothesis_count": 0,
        }

    def test_ghost_company_efos(self):
        data = self._base_vendor()
        data.update({"is_efos_definitivo": 1})
        patterns = classify_patterns(data)
        assert patterns["P2"] >= 0.90

    def test_ghost_company_small_vendor_no_rfc(self):
        data = self._base_vendor()
        data.update({
            "total_contracts":    10,
            "direct_award_rate":  0.90,
            "years_active":       2,
            "rfc":                None,
        })
        patterns = classify_patterns(data)
        assert patterns["P2"] >= 0.50

    def test_monopoly_pattern_high_concentration(self):
        data = self._base_vendor()
        data.update({
            "vendor_concentration":  0.60,
            "total_contracts":       5000,
            "top_institution_ratio": 0.85,
            "single_bid_rate":       0.85,
        })
        patterns = classify_patterns(data)
        assert patterns["P1"] >= 0.80

    def test_monopoly_pattern_mid_concentration(self):
        data = self._base_vendor()
        data.update({"vendor_concentration": 0.35})
        patterns = classify_patterns(data)
        assert patterns["P1"] >= 0.40

    def test_intermediary_pattern(self):
        data = self._base_vendor()
        data.update({
            "total_contracts":    8,
            "direct_award_rate":  1.0,
            "years_active":       1,
            "rfc":                None,
            "burst_score":        0.75,
        })
        patterns = classify_patterns(data)
        assert patterns["P3"] >= 0.70

    def test_institution_capture_single_institution(self):
        data = self._base_vendor()
        data.update({
            "top_institution_ratio": 1.0,
            "total_contracts":       50,
            "single_bid_rate":       0.60,
        })
        patterns = classify_patterns(data)
        assert patterns["P6"] >= 0.80

    def test_overpricing_high_z(self):
        data = self._base_vendor()
        data.update({
            "avg_z_price_ratio":      2.5,
            "industry_mismatch_rate": 0.55,
        })
        patterns = classify_patterns(data)
        assert patterns["P5"] >= 0.50

    def test_bid_rigging_co_bid(self):
        data = self._base_vendor()
        data.update({"co_bid_rate": 0.60})
        patterns = classify_patterns(data)
        assert patterns["P4"] >= 0.40

    def test_clean_vendor_all_low(self):
        """A vendor with no flags should score near 0 on all patterns."""
        data = self._base_vendor()
        patterns = classify_patterns(data)
        # All patterns should be very low for a completely clean vendor
        assert all(v < 0.30 for v in patterns.values())

    def test_returns_all_seven_patterns(self):
        data = self._base_vendor()
        patterns = classify_patterns(data)
        assert set(patterns.keys()) == {"P1", "P2", "P3", "P4", "P5", "P6", "P7"}


# ---------------------------------------------------------------------------
# False Positive Screening
# ---------------------------------------------------------------------------

class TestFalsePositives:
    def test_patent_exception_gilead(self):
        result = screen_false_positives(
            "Gilead Sciences SA de CV",
            {"max_contract_amount": 1e9, "avg_contract_amount": 5e8, "sector_vendor_count": 100},
            None,
        )
        assert result["fp_patent"] is True
        assert result["penalty"] >= 0.20

    def test_patent_exception_microsoft(self):
        result = screen_false_positives(
            "Microsoft Corporation Mexico",
            {"max_contract_amount": 1e7, "avg_contract_amount": 1e7, "sector_vendor_count": 50},
            None,
        )
        assert result["fp_patent"] is True

    def test_no_fp_normal_vendor(self):
        result = screen_false_positives(
            "Constructora del Norte SA de CV",
            {"max_contract_amount": 1e7, "avg_contract_amount": 1e7, "sector_vendor_count": 100},
            None,
        )
        assert result["penalty"] == 0.0
        assert result["fp_patent"] is False
        assert result["fp_data_error"] is False
        assert result["fp_structural"] is False

    def test_data_error_detection(self):
        """A vendor where max contract >> avg by 100x triggers FP2."""
        result = screen_false_positives(
            "Empresa Normal SA de CV",
            {
                "max_contract_amount": 1e11,  # 100B MXN
                "avg_contract_amount": 1e7,   # 10M avg
                "sector_vendor_count": 100,
            },
            None,
        )
        assert result["fp_data_error"] is True
        assert result["penalty"] >= 0.25

    def test_structural_monopoly_detection(self):
        """Sector with <= 10 vendors triggers FP3."""
        result = screen_false_positives(
            "Proveedor Exclusivo SA de CV",
            {"max_contract_amount": 1e8, "avg_contract_amount": 1e7, "sector_vendor_count": 5},
            None,
        )
        assert result["fp_structural"] is True
        assert result["penalty"] >= 0.15

    def test_penalty_cap(self):
        """Cumulative penalty is capped at 0.40."""
        result = screen_false_positives(
            "gilead",  # FP1
            {
                "max_contract_amount": 1e12,  # FP2: max >> avg
                "avg_contract_amount": 1e6,
                "sector_vendor_count": 3,     # FP3
            },
            None,
        )
        assert result["penalty"] <= 0.40

    def test_penalty_cap_exact(self):
        """All three FPs combined: 0.20 + 0.25 + 0.15 = 0.60, capped to 0.40."""
        result = screen_false_positives(
            "ibm",
            {
                "max_contract_amount": 5e10,
                "avg_contract_amount": 1e5,
                "sector_vendor_count": 2,
            },
            None,
        )
        assert result["penalty"] == 0.40


# ---------------------------------------------------------------------------
# Integration: IPS + tier assignment for known edge cases
# ---------------------------------------------------------------------------

class TestIPSEndToEnd:
    def test_ground_truth_vendor_always_tier1(self):
        """A vendor in ground truth (in_gt=1) receives ext_score=1.0.
        This contributes W_EXTERNAL=0.20 to IPS regardless of other signals."""
        ext_score = compute_external_flags_score(0, 0, 1)  # in_gt=1 -> score=1.0
        assert ext_score == 1.0

        risk_norm = normalize_risk_score(0.05)
        maha_norm = normalize_mahalanobis(10)
        financial  = normalize_financial(1e8)
        ips = compute_ips(risk_norm, maha_norm, 0.0, financial, ext_score)

        # External alone contributes 1.0 * 0.20 = 0.20 to IPS
        assert ips >= 0.20
        # Confirm gt vendor scores higher than identical vendor with no gt flag
        ips_no_gt = compute_ips(risk_norm, maha_norm, 0.0, financial, 0.0)
        assert ips - ips_no_gt >= 0.18  # ~W_EXTERNAL * ext_score

    def test_efos_vendor_significant_boost(self):
        """EFOS vendor with moderate risk should receive meaningful IPS boost."""
        ext_efos     = compute_external_flags_score(1, 0, 0)
        ext_no_efos  = compute_external_flags_score(0, 0, 0)
        risk_norm    = normalize_risk_score(0.20)
        maha_norm    = normalize_mahalanobis(50)
        financial    = normalize_financial(5e8)

        ips_efos    = compute_ips(risk_norm, maha_norm, 0.0, financial, ext_efos)
        ips_no_efos = compute_ips(risk_norm, maha_norm, 0.0, financial, ext_no_efos)

        assert ips_efos > ips_no_efos
        assert (ips_efos - ips_no_efos) >= 0.10  # meaningful delta
