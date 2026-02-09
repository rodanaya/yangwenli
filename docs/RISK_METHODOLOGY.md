# Risk Scoring Methodology v3.3

**Last Updated:** February 6, 2026 | **Contracts:** 3,110,017 | **Years:** 2002-2025

---

## Quick Reference

| Level | Threshold | Count | % | Action |
|-------|-----------|-------|---|--------|
| **Critical** | ≥ 0.50 | 898 | 0.03% | Immediate investigation |
| **High** | ≥ 0.35 | 61,098 | 2.0% | Priority review |
| **Medium** | ≥ 0.20 | 1,153,281 | 37.1% | Watch list |
| **Low** | < 0.20 | 1,894,740 | 60.9% | Standard monitoring |

**v3.3 achieves 12.4% high-risk rate** (1.8% critical + 10.6% high) — within OECD benchmark of 2-15%.

---

## Risk Factors

### Base Factors (sum to 100%)

| Factor | Weight | Trigger |
|--------|--------|---------|
| Single Bidding | 18% | Only 1 vendor bid on competitive procedure |
| Non-Open Procedure | 18% | Direct award or restricted tender |
| Price Anomaly | 18% | Amount > 3x sector mean |
| Vendor Concentration | 12% | Vendor holds >30% of sector contracts |
| Short Ad Period | 12% | < 15 days between publication and award |
| Year-End Timing | 7% | Contract signed in December |
| Threshold Splitting | 7% | Multiple same-day contracts to same vendor |
| Network Risk | 8% | Vendor in group of related entities |

### Bonus Factors (added on top)

| Factor | Bonus | Trigger |
|--------|-------|---------|
| **Co-Bidding Risk** | +5% | Vendor in suspicious co-bidding pattern (≥50% shared procedures) |
| Price Hypothesis | +5% | IQR-based statistical outlier (very high confidence) |
| Industry Mismatch | +3% | Vendor's industry doesn't match contract sector |
| Institution Risk | +3% | Higher-risk institution type (municipal, state agency) |

---

## Interaction Effects (v3.3)

When two correlated risk factors both trigger on the same contract, the combination is more suspicious than the sum of its parts. The model adds bonus points for these pairs:

| Factor Pair | Bonus | Rationale |
|-------------|-------|-----------|
| Single Bid + Short Ad Period | +5% | Rushed procedure with no competition |
| Non-Open + Year-End | +4% | Direct award in December budget dump |
| Price Anomaly + Vendor Concentration | +5% | Overpriced contract from dominant vendor |
| Threshold Splitting + Network Risk | +6% | Split contracts among related entities |
| Network Risk + Single Bid | +5% | Network vendor wins uncontested |

**Cap**: Total interaction bonus is capped at **+15%** regardless of how many pairs trigger.

**Gradient scoring**: Each base factor uses gradient tiers rather than binary on/off:

| Factor | Full Score | Partial Tiers |
|--------|-----------|---------------|
| Price Anomaly | ≥3x upper fence → 100% | ≥2x → 80%, ≥1.5x → 60%, >1x → 40% |
| Vendor Concentration | >30% share → 100% | >20% → 70%, >10% → 50% |
| Short Ad Period | <5 days → 100% | <15 days → 70%, <30 days → 30% |
| Threshold Splitting | ≥5 same-day → 100% | ≥3 → 60%, ≥2 → 30% |
| Network Risk | ≥5 members → 100% | ≥3 → 60%, ≥2 → 30% |
| Non-Open Procedure | Direct award → 100% | Restricted → 50% |

**Theoretical maximum score**: 1.0 (base) + 0.16 (bonuses) + 0.15 (interactions) = 1.31, capped to 1.0.

---

## Co-Bidding Detection (v3.3)

Identifies vendors that frequently bid in the same procedures — a key indicator of potential bid-rigging.

**Detection criteria:**
- Vendor has ≥5 procedure participations
- Shares ≥10 procedures with another vendor
- Co-bid rate ≥50% of their procedures

**Risk tiers:**
| Co-Bid Rate | Risk Level | Bonus |
|-------------|------------|-------|
| ≥ 80% | High | +5% |
| 50-80% | Medium | +3% |
| < 50% | None | +0% |

**Results:** 8,701 suspicious vendors, 1,029,113 flagged contracts

**Suspicious patterns detected:**
- **Cover bidding**: Partners that always lose (win rate < 10%)
- **Bid rotation**: Partners with ~50% alternating wins

---

## Price Hypothesis System

Uses Tukey's IQR method to detect statistical outliers:

```
Upper Fence = Q3 + 1.5 × IQR  (statistical outlier)
Extreme Fence = Q3 + 3.0 × IQR  (extreme overpricing)
```

**Hypothesis types:**
| Type | Definition | Count |
|------|------------|-------|
| extreme_overpricing | Amount > Q3 + 3×IQR | 300,499 |
| statistical_outlier | Amount > Q3 + 1.5×IQR | 89,746 |

---

## International Standards Alignment

| Standard | How We Comply |
|----------|---------------|
| **IMF CRI** | 8-factor model weights based on IMF research |
| **OECD** | Single-bid and concentration indicators |
| **EU ARACHNE** | Price anomaly and network analysis |
| **World Bank INT** | Fraud red flags and collusion detection |
| **UNCITRAL** | Procedure type classification |

---

## Data Quality Notes

| Period | Years | RFC Coverage | Quality |
|--------|-------|--------------|---------|
| Structure A | 2002-2010 | 0.1% | Lowest — risk may be underestimated |
| Structure B | 2010-2017 | 15.7% | Better |
| Structure C | 2018-2022 | 30.3% | Good |
| Structure D | 2023-2025 | 47.4% | Best |

**Amount validation:** Contracts > 100B MXN are rejected as data errors.

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /contracts?risk_factor=co_bid` | Filter by specific risk factor |
| `GET /contracts/{id}/risk` | Contract risk breakdown |
| `GET /vendors/{id}/risk-profile` | Vendor risk profile |
| `GET /network/co-bidders/{id}` | Co-bidding analysis |
| `GET /analysis/price-hypotheses` | Price anomaly hypotheses |

---

## Interpretation Guidelines

1. **Risk score ≠ proof of corruption** — it indicates elevated risk for review
2. **Low scores don't guarantee clean contracts** — new patterns may emerge
3. **Context matters** — Energia/Defensa sectors have structural reasons for high concentration
4. **Co-bidding alone isn't proof** — some vendors legitimately specialize together

---

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| **3.3.0** | 2026-02-06 | Reweighted to 8 base factors, updated thresholds (critical >=0.50, high >=0.35), 12.4% high-risk rate |
| 3.2.0 | 2026-02-05 | Co-bidding risk factor (+5%), lowered thresholds (critical ≥0.50, high ≥0.35), 1M+ contracts flagged |
| 3.1.0 | 2026-02-03 | Price hypothesis integration (+5%), 390K contracts flagged |
| 3.0.0 | 2026-02 | Reweighted factors, interaction effects, sector baselines |
| 2.0.0 | 2026-01 | Added short ad period, threshold splitting, network risk |
| 1.0.0 | 2026-01 | Initial 10-factor model |

---

## Key Sources

- IMF Working Paper 2022/094: *Assessing Vulnerabilities to Corruption in Public Procurement*
- OECD (2023): *Public Procurement Performance Report*
- EU ARACHNE: Risk scoring methodology
- World Bank INT (2019): *Warning Signs of Fraud and Corruption*
- Gallego et al. (2022): *Early warning model of malfeasance in public procurement*

---

---

## Successor Model: v4.0

v3.3 has been superseded by v4.0 (statistical framework) as the primary risk model. v3.3 scores are preserved in the `risk_score_v3` column for comparison and potential ensemble use.

| Metric | v3.3 | v4.0 |
|--------|------|------|
| AUC-ROC | 0.584 | **0.951** |
| Detection rate (med+) | 67.1% | **95.3%** |
| Lift | 1.22x | **4.04x** |

See `docs/RISK_METHODOLOGY_v4.md` for v4.0 methodology and `docs/MODEL_COMPARISON_REPORT.md` for detailed comparison.

---

*Risk scores are calculated automatically based on objective criteria. This methodology is provided for transparency and reproducibility.*
