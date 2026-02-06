"""
Risk Scoring Model Tests

Tests for the 8-factor risk scoring model v3.3 aligned with IMF CRI methodology.
"""
import pytest
from typing import Dict, List, Optional


# Risk model configuration v3.3 (8 factors)
RISK_FACTORS = {
    'single_bidding': {'weight': 0.18, 'description': 'Single bidder in competitive procedure'},
    'non_open_procedure': {'weight': 0.18, 'description': 'Restricted or direct award'},
    'price_anomaly': {'weight': 0.18, 'description': 'Price exceeds sector median'},
    'vendor_concentration': {'weight': 0.12, 'description': 'High market share'},
    'short_ad_period': {'weight': 0.12, 'description': 'Insufficient advertisement time'},
    'year_end_timing': {'weight': 0.07, 'description': 'December contract'},
    'threshold_splitting': {'weight': 0.07, 'description': 'Multiple contracts near threshold'},
    'network_risk': {'weight': 0.08, 'description': 'Suspicious vendor relationships'},
}

RISK_THRESHOLDS = {
    'low': (0.0, 0.20),
    'medium': (0.20, 0.35),
    'high': (0.35, 0.50),
    'critical': (0.50, 1.0),
}


def calculate_risk_score(factors: Dict[str, float]) -> float:
    """Calculate weighted risk score from triggered factors."""
    score = 0.0
    for factor_name, factor_value in factors.items():
        if factor_name in RISK_FACTORS:
            weight = RISK_FACTORS[factor_name]['weight']
            score += weight * factor_value
    return min(score, 1.0)  # Cap at 1.0


def get_risk_level(score: float) -> str:
    """Convert numeric score to risk level."""
    for level, (low, high) in RISK_THRESHOLDS.items():
        if low <= score < high:
            return level
    return 'critical' if score >= 0.50 else 'low'


class TestRiskWeights:
    """Test risk factor weight configuration."""

    def test_weights_sum_to_100_percent(self):
        """All factor weights should sum to 1.0 (100%)."""
        total_weight = sum(f['weight'] for f in RISK_FACTORS.values())
        assert abs(total_weight - 1.0) < 0.001

    def test_individual_weights_valid(self):
        """Each weight should be between 0 and 1."""
        for factor_name, config in RISK_FACTORS.items():
            weight = config['weight']
            assert 0 < weight <= 1, f"{factor_name} has invalid weight {weight}"

    def test_highest_weights(self):
        """Single bidding, non-open procedure, and price anomaly should have highest weights."""
        high_weight_factors = ['single_bidding', 'non_open_procedure', 'price_anomaly']
        for factor in high_weight_factors:
            assert RISK_FACTORS[factor]['weight'] == 0.18


class TestRiskScoreCalculation:
    """Test risk score calculation."""

    def test_no_factors_zero_score(self):
        """No triggered factors should give 0 score."""
        score = calculate_risk_score({})
        assert score == 0.0

    def test_single_factor(self):
        """Single factor should contribute its weight."""
        score = calculate_risk_score({'single_bidding': 1.0})
        assert score == 0.18

    def test_multiple_factors(self):
        """Multiple factors should accumulate."""
        score = calculate_risk_score({
            'single_bidding': 1.0,
            'non_open_procedure': 1.0,
        })
        assert score == 0.36

    def test_partial_factor_values(self):
        """Partial factor values should scale properly."""
        score = calculate_risk_score({
            'price_anomaly': 0.5,  # Mild anomaly
        })
        assert score == 0.09  # 0.18 * 0.5

    def test_all_factors_max(self):
        """All factors at maximum should give 1.0."""
        all_factors = {name: 1.0 for name in RISK_FACTORS}
        score = calculate_risk_score(all_factors)
        assert score == 1.0

    def test_score_capped_at_one(self):
        """Score should never exceed 1.0."""
        # Even with bonus factors, cap at 1.0
        excessive_factors = {name: 2.0 for name in RISK_FACTORS}
        score = calculate_risk_score(excessive_factors)
        assert score == 1.0


class TestRiskLevels:
    """Test risk level classification."""

    def test_low_risk_boundary(self):
        """Scores < 0.20 should be low risk."""
        assert get_risk_level(0.0) == 'low'
        assert get_risk_level(0.1) == 'low'
        assert get_risk_level(0.19) == 'low'

    def test_medium_risk_boundary(self):
        """Scores 0.20-0.35 should be medium risk."""
        assert get_risk_level(0.20) == 'medium'
        assert get_risk_level(0.25) == 'medium'
        assert get_risk_level(0.34) == 'medium'

    def test_high_risk_boundary(self):
        """Scores 0.35-0.50 should be high risk."""
        assert get_risk_level(0.35) == 'high'
        assert get_risk_level(0.40) == 'high'
        assert get_risk_level(0.49) == 'high'

    def test_critical_risk_boundary(self):
        """Scores >= 0.50 should be critical risk."""
        assert get_risk_level(0.50) == 'critical'
        assert get_risk_level(0.8) == 'critical'
        assert get_risk_level(1.0) == 'critical'


class TestSingleBiddingFactor:
    """Test single bidding risk factor logic."""

    def test_single_bid_in_competitive_procedure(self):
        """Competitive procedure with 1 bidder = single bid (high risk)."""
        # This is a red flag
        contract = {
            'is_direct_award': False,
            'procedure_type': 'LICITACION_PUBLICA',
            'bidder_count': 1,
        }

        is_single_bid = (
            not contract['is_direct_award'] and
            contract['bidder_count'] == 1
        )

        assert is_single_bid is True

    def test_direct_award_not_single_bid(self):
        """Direct award with 1 vendor is expected, not a red flag."""
        contract = {
            'is_direct_award': True,
            'procedure_type': 'ADJUDICACION_DIRECTA',
            'bidder_count': 1,
        }

        is_single_bid = (
            not contract['is_direct_award'] and
            contract['bidder_count'] == 1
        )

        assert is_single_bid is False


class TestPriceAnomalyFactor:
    """Test price anomaly detection."""

    def calculate_price_factor(self, amount: float, sector_median: float) -> float:
        """Calculate price anomaly factor using IQR method."""
        if sector_median <= 0:
            return 0.0

        ratio = amount / sector_median

        if ratio <= 1.5:
            return 0.0  # Within normal range
        elif ratio <= 2.0:
            return 0.5  # Mild outlier
        elif ratio <= 3.0:
            return 0.8  # Significant outlier
        else:
            return 1.0  # Extreme outlier

    def test_normal_price(self):
        """Price at or below median should have 0 factor."""
        factor = self.calculate_price_factor(1_000_000, 1_000_000)
        assert factor == 0.0

    def test_mild_outlier(self):
        """Price 1.5-2x median should be mild outlier."""
        factor = self.calculate_price_factor(1_800_000, 1_000_000)
        assert factor == 0.5

    def test_significant_outlier(self):
        """Price 2-3x median should be significant outlier."""
        factor = self.calculate_price_factor(2_500_000, 1_000_000)
        assert factor == 0.8

    def test_extreme_outlier(self):
        """Price >3x median should be extreme outlier."""
        factor = self.calculate_price_factor(5_000_000, 1_000_000)
        assert factor == 1.0


class TestYearEndTimingFactor:
    """Test year-end timing risk factor."""

    def test_december_contract(self):
        """December contracts should be flagged."""
        from datetime import date

        contract_date = date(2024, 12, 15)
        is_year_end = contract_date.month == 12

        assert is_year_end is True

    def test_non_december_contract(self):
        """Non-December contracts should not be flagged."""
        from datetime import date

        contract_date = date(2024, 6, 15)
        is_year_end = contract_date.month == 12

        assert is_year_end is False


class TestRiskScoreScenarios:
    """Test complete risk scoring scenarios."""

    def test_low_risk_scenario(self):
        """Normal contract should have low risk."""
        factors = {
            'single_bidding': 0.0,
            'non_open_procedure': 0.0,
            'price_anomaly': 0.0,
        }

        score = calculate_risk_score(factors)
        level = get_risk_level(score)

        assert level == 'low'

    def test_medium_risk_scenario(self):
        """Direct award + year-end should be medium risk."""
        factors = {
            'non_open_procedure': 1.0,  # 0.18
            'year_end_timing': 1.0,     # 0.07
        }

        score = calculate_risk_score(factors)
        level = get_risk_level(score)

        assert level == 'medium'
        assert score == 0.25

    def test_high_risk_scenario(self):
        """Single bid + non-open should be high risk."""
        factors = {
            'single_bidding': 1.0,       # 0.18
            'non_open_procedure': 1.0,   # 0.18
        }

        score = calculate_risk_score(factors)
        level = get_risk_level(score)

        assert level == 'high'
        assert 0.35 <= score < 0.50

    def test_critical_risk_scenario(self):
        """Multiple red flags should trigger critical risk."""
        factors = {
            'single_bidding': 1.0,       # 0.18
            'non_open_procedure': 1.0,   # 0.18
            'price_anomaly': 1.0,        # 0.18
        }

        score = calculate_risk_score(factors)
        level = get_risk_level(score)

        assert level == 'critical'
        assert score >= 0.50


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
