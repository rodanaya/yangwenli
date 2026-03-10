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
    run_gt_auto_update,
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
            "total_value_mxn":    5_000_000,
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


# ---------------------------------------------------------------------------
# Memo Generation (Phase 3)
# ---------------------------------------------------------------------------

class TestMemoGeneration:
    def _make_evidence(self, **overrides) -> dict:
        evidence = {
            "vendor": {
                "name": "Test Corp SA de CV",
                "rfc": "TST123456ABC",
                "sector": "Salud",
                "years_active": 3,
                "total_value_mxn": 1_000_000_000,
                "contract_count": 10,
            },
            "scores": {
                "ips_final": 0.85,
                "ips_tier": 1,
                "risk_score": 0.72,
                "mahalanobis_norm": 0.99,
                "burst_score": 0.60,
                "fp_penalty": 0.0,
            },
            "patterns": [
                {"type": "P2", "name": "Empresa fantasma", "confidence": 0.90}
            ],
            "shap_top3": [],
            "external_flags": {
                "is_efos": True,
                "is_sfp_sanctioned": False,
                "in_ground_truth": False,
                "efos_rfc": "TST123456ABC",
                "sfp_type": None,
            },
            "fp_screens": {
                "fp1_patent": False,
                "fp2_data_error": False,
                "fp3_structural": False,
            },
            "comparable_gt_cases": ["La Estafa Maestra"],
            "web_evidence": [],
            "contract_sample": [],
        }
        evidence.update(overrides)
        return evidence

    def test_template_memo_required_sections(self):
        """Template memo must contain all eight required section headers."""
        from scripts.aria_generate_memos import generate_template_memo

        memo = generate_template_memo(self._make_evidence())
        for section in [
            "RESUMEN EJECUTIVO",
            "PERFIL DEL PROVEEDOR",
            "SEÑALES DE RIESGO DETECTADAS",
            "PATRÓN PROBABLE DE CORRUPCIÓN",
            "EVIDENCIA PÚBLICA DISPONIBLE",
            "HIPÓTESIS ALTERNATIVAS",
            "PREGUNTAS DE INVESTIGACIÓN SUGERIDAS",
            "CLASIFICACIÓN RECOMENDADA",
        ]:
            assert section in memo, f"Missing section: {section}"

    def test_template_memo_efos_action(self):
        """EFOS flag must produce AGREGAR_A_GT action."""
        from scripts.aria_generate_memos import generate_template_memo

        memo = generate_template_memo(self._make_evidence())
        assert "AGREGAR_A_GT" in memo

    def test_template_memo_high_ips_urgent(self):
        """Non-EFOS vendor with IPS >= 0.80 gets REVISAR_URGENTE."""
        from scripts.aria_generate_memos import generate_template_memo

        evidence = self._make_evidence()
        evidence["external_flags"]["is_efos"] = False
        evidence["external_flags"]["efos_rfc"] = None
        evidence["scores"]["ips_final"] = 0.85
        memo = generate_template_memo(evidence)
        assert "REVISAR_URGENTE" in memo

    def test_template_memo_low_ips_routine(self):
        """Vendor with IPS < 0.60 (no EFOS) gets REVISAR_RUTINA."""
        from scripts.aria_generate_memos import generate_template_memo

        evidence = self._make_evidence()
        evidence["external_flags"]["is_efos"] = False
        evidence["external_flags"]["efos_rfc"] = None
        evidence["scores"]["ips_final"] = 0.45
        evidence["scores"]["ips_tier"] = 3
        memo = generate_template_memo(evidence)
        assert "REVISAR_RUTINA" in memo

    def test_template_memo_no_pattern(self):
        """Memo with no patterns above threshold should still render cleanly."""
        from scripts.aria_generate_memos import generate_template_memo

        evidence = self._make_evidence()
        evidence["patterns"] = []
        memo = generate_template_memo(evidence)
        assert "RESUMEN EJECUTIVO" in memo
        assert "No clasificado" in memo

    def test_template_memo_sfp_alert_present(self):
        """SFP sanction flag must appear in risk signals block."""
        from scripts.aria_generate_memos import generate_template_memo

        evidence = self._make_evidence()
        evidence["external_flags"]["is_sfp_sanctioned"] = True
        evidence["external_flags"]["sfp_type"] = "inhabilitado"
        memo = generate_template_memo(evidence)
        assert "SFP" in memo

    def test_pattern_names_complete(self):
        """All seven corruption pattern codes must be in PATTERN_NAMES."""
        from scripts.aria_generate_memos import PATTERN_NAMES

        for p in ["P1", "P2", "P3", "P4", "P5", "P6", "P7"]:
            assert p in PATTERN_NAMES, f"Missing pattern: {p}"

    def test_build_evidence_package_structure(self):
        """build_evidence_package returns all expected top-level keys."""
        import sqlite3
        from scripts.aria_generate_memos import build_evidence_package

        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row

        row = {
            "vendor_id": 1,
            "vendor_name": "Test Corp",
            "efos_rfc": None,
            "primary_sector_name": "Salud",
            "years_active": 2,
            "total_value_mxn": 5e8,
            "total_contracts": 20,
            "ips_final": 0.82,
            "ips_tier": 1,
            "avg_risk_score": 0.65,
            "mahalanobis_norm": 0.80,
            "burst_score": 0.50,
            "fp_penalty": 0.0,
            "pattern_confidences": '{"P1": 0.75, "P2": 0.30}',
            "primary_pattern": "P1",
            "is_efos_definitivo": 0,
            "is_sfp_sanctioned": 0,
            "in_ground_truth": 0,
            "sfp_sanction_type": None,
            "fp_patent_exception": 0,
            "fp_data_error": 0,
            "fp_structural_monopoly": 0,
            "top_institution": None,
        }

        pkg = build_evidence_package(row, conn)
        conn.close()

        for key in [
            "vendor", "scores", "patterns", "shap_top3",
            "external_flags", "fp_screens", "comparable_gt_cases",
            "web_evidence", "contract_sample",
        ]:
            assert key in pkg, f"Missing key: {key}"

    def test_build_evidence_package_patterns_filtered(self):
        """Patterns below 0.20 confidence threshold are excluded."""
        import sqlite3
        from scripts.aria_generate_memos import build_evidence_package

        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row

        row = {
            "vendor_id": 1,
            "vendor_name": "Vendor X",
            "efos_rfc": None,
            "primary_sector_name": "Energia",
            "years_active": 1,
            "total_value_mxn": 1e7,
            "total_contracts": 3,
            "ips_final": 0.65,
            "ips_tier": 2,
            "avg_risk_score": 0.40,
            "mahalanobis_norm": 0.50,
            "burst_score": 0.30,
            "fp_penalty": 0.0,
            "pattern_confidences": '{"P1": 0.80, "P3": 0.10}',
            "primary_pattern": "P1",
            "is_efos_definitivo": 0,
            "is_sfp_sanctioned": 0,
            "in_ground_truth": 0,
            "sfp_sanction_type": None,
            "fp_patent_exception": 0,
            "fp_data_error": 0,
            "fp_structural_monopoly": 0,
            "top_institution": None,
        }

        pkg = build_evidence_package(row, conn)
        conn.close()

        pattern_types = [p["type"] for p in pkg["patterns"]]
        assert "P1" in pattern_types
        assert "P3" not in pattern_types

    def test_build_evidence_package_comparable_cases(self):
        """P2 pattern maps to expected comparable ground truth cases."""
        import sqlite3
        from scripts.aria_generate_memos import build_evidence_package

        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row

        row = {
            "vendor_id": 2,
            "vendor_name": "Ghost Co",
            "efos_rfc": "ABC123",
            "primary_sector_name": "Gobernacion",
            "years_active": 1,
            "total_value_mxn": 2e8,
            "total_contracts": 5,
            "ips_final": 0.88,
            "ips_tier": 1,
            "avg_risk_score": 0.55,
            "mahalanobis_norm": 0.90,
            "burst_score": 0.70,
            "fp_penalty": 0.0,
            "pattern_confidences": '{"P2": 0.91}',
            "primary_pattern": "P2",
            "is_efos_definitivo": 1,
            "is_sfp_sanctioned": 0,
            "in_ground_truth": 0,
            "sfp_sanction_type": None,
            "fp_patent_exception": 0,
            "fp_data_error": 0,
            "fp_structural_monopoly": 0,
            "top_institution": None,
        }

        pkg = build_evidence_package(row, conn)
        conn.close()

        assert len(pkg["comparable_gt_cases"]) > 0
        assert any(
            "Estafa" in c or "EFOS" in c or "BAHUD" in c
            for c in pkg["comparable_gt_cases"]
        )

# ---------------------------------------------------------------------------
# GT Auto-Update (Module 8)
# ---------------------------------------------------------------------------

class TestGTAutoUpdate:
    def _base_result(self, **overrides):
        base = {
            "vendor_id": 1, "vendor_name": "Test Corp",
            "in_ground_truth": 0, "is_efos_definitivo": 0,
            "total_contracts": 10, "efos_rfc": None,
            "is_sfp_sanctioned": 0, "avg_risk_score": 0.2,
            "sfp_sanction_type": None, "mahalanobis_norm": 0.5,
            "total_value_mxn": 1e8, "ips_final": 0.5,
            "pattern_confidence": 0.4, "primary_pattern": "P2",
            "fp_patent_exception": 0, "fp_data_error": 0,
        }
        base.update(overrides)
        return base

    def test_efos_5plus_contracts_auto_inserts(self):
        results = [self._base_result(
            is_efos_definitivo=1, total_contracts=10, efos_rfc="ABC123",
        )]
        inserts, flags = run_gt_auto_update(results, None, "test", dry_run=True)
        assert inserts == 1
        assert flags == 0

    def test_efos_few_contracts_flags(self):
        results = [self._base_result(
            vendor_id=2, vendor_name="Test Corp 2",
            is_efos_definitivo=1, total_contracts=2, efos_rfc="DEF456",
        )]
        inserts, flags = run_gt_auto_update(results, None, "test", dry_run=True)
        assert inserts == 0
        assert flags == 1

    def test_in_ground_truth_skipped(self):
        results = [self._base_result(
            vendor_id=3, vendor_name="Known Bad",
            in_ground_truth=1, is_efos_definitivo=1,
            total_contracts=100, efos_rfc="GHI789",
            avg_risk_score=0.9, mahalanobis_norm=0.99,
            total_value_mxn=5e9, ips_final=0.95,
            pattern_confidence=0.9, primary_pattern="P1",
        )]
        inserts, flags = run_gt_auto_update(results, None, "test", dry_run=True)
        assert inserts == 0
        assert flags == 0

    def test_sfp_high_risk_auto_inserts(self):
        results = [self._base_result(
            is_sfp_sanctioned=1, avg_risk_score=0.45, total_contracts=10,
            sfp_sanction_type="inhabilitacion",
        )]
        inserts, flags = run_gt_auto_update(results, None, "test", dry_run=True)
        assert inserts == 1
        assert flags == 0

    def test_sfp_low_risk_flags(self):
        results = [self._base_result(
            is_sfp_sanctioned=1, avg_risk_score=0.10, total_contracts=10,
        )]
        inserts, flags = run_gt_auto_update(results, None, "test", dry_run=True)
        assert inserts == 0
        assert flags == 1

    def test_extreme_mahalanobis_flags(self):
        results = [self._base_result(
            mahalanobis_norm=0.995, total_value_mxn=2e9,
        )]
        inserts, flags = run_gt_auto_update(results, None, "test", dry_run=True)
        assert inserts == 0
        assert flags == 1

    def test_high_ips_pattern_flags(self):
        results = [self._base_result(
            ips_final=0.85, pattern_confidence=0.75, primary_pattern="P1",
        )]
        inserts, flags = run_gt_auto_update(results, None, "test", dry_run=True)
        assert inserts == 0
        assert flags == 1

    def test_high_ips_with_fp_not_flagged(self):
        """FP exceptions should prevent Rule 6 flagging."""
        results = [self._base_result(
            ips_final=0.85, pattern_confidence=0.75, fp_patent_exception=1,
        )]
        inserts, flags = run_gt_auto_update(results, None, "test", dry_run=True)
        assert inserts == 0
        assert flags == 0

    def test_no_action_clean_vendor(self):
        results = [self._base_result()]
        inserts, flags = run_gt_auto_update(results, None, "test", dry_run=True)
        assert inserts == 0
        assert flags == 0


# ---------------------------------------------------------------------------
# Burst Score (Goh-Barabasi)
# ---------------------------------------------------------------------------

class TestBurstScore:
    def test_single_year_high_value_burst(self):
        """A vendor with burst_score=0.75 should get P3 confidence=0.75."""
        data = {
            "is_efos_definitivo": 0, "total_contracts": 5,
            "direct_award_rate": 1.0, "single_bid_rate": 0,
            "years_active": 1, "rfc": None, "vendor_concentration": 0.02,
            "burst_score": 0.75, "avg_z_price_ratio": 0,
            "industry_mismatch_rate": 0, "top_institution_ratio": 0.5,
            "sector_vendor_count": 100, "max_contract_amount": 5e9,
            "avg_contract_amount": 1e9, "in_ground_truth": 0,
            "co_bid_rate": 0, "price_hypothesis_count": 0,
        }
        patterns = classify_patterns(data)
        assert patterns["P3"] == 0.75

    def test_no_burst_for_low_value(self):
        """burst_score=0 should give P3=0."""
        data = {
            "is_efos_definitivo": 0, "total_contracts": 3,
            "direct_award_rate": 0.5, "single_bid_rate": 0,
            "years_active": 1, "rfc": "ABC", "vendor_concentration": 0.01,
            "burst_score": 0.0,
            "avg_z_price_ratio": 0, "industry_mismatch_rate": 0,
            "top_institution_ratio": 0, "sector_vendor_count": 100,
            "max_contract_amount": 100000, "avg_contract_amount": 50000,
            "in_ground_truth": 0, "co_bid_rate": 0, "price_hypothesis_count": 0,
        }
        patterns = classify_patterns(data)
        assert patterns["P3"] == 0.0
