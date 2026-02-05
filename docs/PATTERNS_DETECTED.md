# Detectable Patterns in COMPRANET Data

> **Philosophy**: Instead of validating against known corruption cases (which failed at 17.8% detection rate), we identify patterns that ARE detectable and warrant investigation.

**Strategic Reframing:**
- **Old question**: "Does the risk model correctly identify known corruption?"
- **New question**: "What procurement patterns CAN we detect that warrant investigation?"

The model is an **exploration and triage tool**, not a guilt detector.

---

## Pattern Summary

| Pattern | Detection Method | Data Available | Confidence |
|---------|------------------|----------------|------------|
| Co-bidding clusters | Vendors in same procedures | procedure_number | HIGH |
| Rotating winners | Same vendors, never compete | procedure_number | HIGH |
| Vendor concentration | Few vendors dominating | vendor_id, institution_id | HIGH |
| Year-end spikes | December clustering | contract_date | HIGH |
| Price anomalies | IQR-based outliers | amount_mxn | HIGH |
| Single bidding | 1 bidder in competitive | is_single_bid | HIGH |
| Threshold splitting | Same vendor, same day | vendor_id, date | HIGH |
| Direct award concentration | High non-open % | is_direct_award | HIGH |

---

## Pattern 1: Co-Bidding Clusters

### What It Is
Vendors that frequently appear together in the same procurement procedures. High co-bidding rates (>80%) suggest:
- **Coordinated bidding** (collusion)
- **Related entities** (shell companies)
- **Bid rotation schemes**

### Detection Criteria
```
Co-bid rate = Co-appearances / Min(Vendor1_procedures, Vendor2_procedures)

HIGH CONFIDENCE: Rate >= 50%
POTENTIAL COLLUSION: Rate >= 80%
```

### Why It Matters
In legitimate competitive markets, vendors should compete against each other. When vendors consistently appear together but never beat each other, it suggests coordination rather than competition.

### Verification Steps
1. Check if vendors share address or legal representative
2. Look for complementary bidding patterns (one always high, one always wins)
3. Check RFC similarity for related entities
4. Search news for both vendor names together

### API Endpoint
```
GET /api/v1/analysis/patterns/co-bidding?min_rate=50&limit=100
```

---

## Pattern 2: Rotating Winners

### What It Is
Vendor pairs that appear in the same procedures frequently but NEVER compete directly - they alternate winning, suggesting bid rotation.

### Detection Criteria
```
Shared procedures >= 5
Both-win rate < 10%
```

### Why It Matters
In bid rotation schemes, companies take turns winning while others submit non-competitive "cover" bids. The alternating pattern is a strong collusion indicator.

### Red Flags
- High shared procedure count
- Near-zero head-to-head wins
- Similar bid amounts
- Geographic or sector concentration

### Verification Steps
1. Analyze bid prices for suspicious patterns
2. Check timing of when each vendor wins
3. Look for shared employees or addresses
4. Review historical pattern over multiple years

---

## Pattern 3: Vendor Concentration

### What It Is
Situations where a single vendor controls a disproportionate share of an institution's procurement value.

### Detection Criteria
```
Value share >= 30% = HIGH concentration
Value share >= 40% = CRITICAL concentration
```

### Why It Matters
Extreme concentration indicates:
- Potential favoritism
- Market manipulation
- Capture of procurement process
- Specification tailoring

### Context
Some concentration is normal in specialized sectors (energy, defense). The threshold should be sector-adjusted.

| Sector | Normal Threshold | Red Flag Threshold |
|--------|------------------|-------------------|
| Energia | 50% | 70% |
| Defensa | 60% | 80% |
| Salud | 30% | 50% |
| Others | 30% | 40% |

### API Endpoint
```
GET /api/v1/analysis/patterns/concentration?min_share=30&limit=100
```

---

## Pattern 4: Year-End Spending Spikes

### What It Is
December spending significantly higher than monthly average, indicating budget exhaustion behavior.

### Detection Criteria
```
Spike ratio = December_value / Average_other_months

SIGNIFICANT: Ratio >= 1.5x
EXTREME: Ratio >= 2.0x
```

### Why It Matters
Year-end rush contracts often have:
- Less scrutiny
- Rushed procedures
- Lower quality outcomes
- Favoritism under time pressure

### Compounding Factors
December contracts with these additional flags are highest priority:
- Direct award
- Single bid
- Short advertisement period
- High risk score

### API Endpoint
```
GET /api/v1/analysis/patterns/year-end?start_year=2015&end_year=2024
```

---

## Pattern 5: Price Anomalies

### What It Is
Contracts with amounts significantly above sector norms, detected using IQR (Interquartile Range) statistical method.

### Detection Criteria (Tukey Fences)
```
Q1 = 25th percentile
Q3 = 75th percentile
IQR = Q3 - Q1

Upper Fence = Q3 + 1.5 * IQR (mild outlier)
Extreme Fence = Q3 + 3.0 * IQR (extreme outlier)
```

### Why It Matters
Extreme overpricing indicates:
- Bid rigging with inflated prices
- Kickback schemes
- Poor market research
- Specification manipulation

### Hypothesis Types
| Type | Threshold | Interpretation |
|------|-----------|----------------|
| Statistical outlier | > Q3 + 1.5*IQR | Notable, worth review |
| Extreme overpricing | > Q3 + 3.0*IQR | Strong evidence |

### API Endpoint
```
GET /api/v1/analysis/price-hypotheses?confidence_level=very_high
GET /api/v1/analysis/contracts/{id}/price-analysis
```

---

## Pattern 6: Single Bidding

### What It Is
Competitive procedures (not direct awards) that received only one bid.

### Detection Criteria
```
Single bid = (is_direct_award = 0) AND (bidder_count = 1)
```

### Why It Matters
Single bidding in open procedures indicates:
- Specifications tailored to one vendor
- Potential bid suppression
- Market access barriers
- Intimidation of other bidders

### Context
Single bid rates vary by sector and country:
- OECD average: 20-30%
- Mexico overall: ~40%
- Some specialized sectors: Higher acceptable

### Key Metrics
- Overall single-bid rate
- Trend over time (increasing = concerning)
- Rate by sector and institution
- Value concentration in single-bid contracts

---

## Pattern 7: Threshold Splitting

### What It Is
Multiple contracts to the same vendor on the same day from the same institution, suggesting deliberate splitting to avoid procurement thresholds.

### Detection Criteria
```
Same vendor_id + Same institution_id + Same contract_date = Splitting pattern

2 contracts: Possible splitting
3-4 contracts: Likely splitting
5+ contracts: Definite splitting
```

### Why It Matters
Threshold splitting is a deliberate technique to:
- Avoid open tender requirements
- Bypass approval thresholds
- Reduce scrutiny
- Maintain direct award authority

### Red Flags
- Round amounts just below thresholds
- Sequential contract numbers
- Similar descriptions
- Same approval officials

---

## Pattern 8: Direct Award Concentration

### What It Is
Institutions with unusually high rates of direct awards (non-competitive procedures).

### Detection Criteria
```
Direct award rate >= 90% = HIGH concern
```

### Why It Matters
While some direct awards are legitimate (emergencies, sole source), extremely high rates indicate:
- Abuse of exception clauses
- Avoidance of competition
- Systematic favoritism

### Legal Context (Mexico)
LAASSP allows direct awards for:
- Amounts below threshold (~$2M MXN)
- Emergencies
- Sole source situations

But rates consistently above 90% suggest abuse.

---

## Validation Approach

Since ground truth (known corruption cases) produces low detection rates (17.8%), we use alternative validation:

### 1. Institution Period Comparison
Compare scandal periods vs control periods:
- Health sector: COVID (2020-2021) vs 2018-2019
- Social programs: Estafa Maestra (2013-2018) vs 2010-2012
- Energy: Odebrecht (2010-2016) vs 2017-2024

**Hypothesis**: Risk scores should be elevated during scandal periods.

### 2. Statistical Robustness Tests
- **Consistency**: Similar contracts get similar scores
- **Factor Correlation**: Higher scores = more triggered factors
- **Distribution Benchmark**: Match OECD expectations
- **Sector Differentiation**: Meaningful variation by sector

### 3. Manual Expert Review
1. Take top 20 investigation leads
2. Google vendor name + "corrupcion" / "investigacion"
3. Check ASF audit reports
4. Document findings
5. Calculate precision: % with verifiable concerns

**Target**: >50% of top leads should have verifiable concerns

---

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `explore_detectable_patterns.py` | Pattern discovery | `python backend/scripts/explore_detectable_patterns.py` |
| `validate_institution_periods.py` | Period comparison | `python backend/scripts/validate_institution_periods.py` |
| `validate_statistical_robustness.py` | Statistical tests | `python backend/scripts/validate_statistical_robustness.py` |
| `generate_investigation_leads.py` | Lead generation | `python backend/scripts/generate_investigation_leads.py --top 20` |
| `analyze_co_bidding.py` | Co-bidding analysis | `python backend/scripts/analyze_co_bidding.py` |

---

## API Endpoints Reference

| Endpoint | Description |
|----------|-------------|
| `GET /analysis/patterns/co-bidding` | Co-bidding vendor clusters |
| `GET /analysis/patterns/concentration` | Vendor concentration by institution |
| `GET /analysis/patterns/year-end` | December spike analysis |
| `GET /analysis/leads` | Prioritized investigation leads |
| `GET /analysis/institution/{id}/period-comparison` | Compare scandal vs control periods |

---

## Success Criteria

| Phase | Metric | Target |
|-------|--------|--------|
| Pattern Discovery | Detectable patterns | 8/8 documented |
| Institution Analysis | Scandal period elevation | p < 0.05 |
| Statistical Robustness | Tests passed | 4/4 |
| Lead Generation | Verifiable concerns | >50% of top 20 |
| Network Viz | Auto-detected clusters | 3+ |

---

## Pivot Decision Point

If validation shows:
- Institution correlation: NO significant difference
- Statistical tests: Multiple failures
- Manual review: <25% verifiable

**Then pivot to**: Descriptive analytics
- Drop "risk score" framing
- Reframe as "procurement pattern explorer"
- Show patterns without prediction claims
- Still useful for investigation prioritization

---

*"The most dangerous enemy is not the one in front of you, but the one you cannot see."* - Yang Wen-li
