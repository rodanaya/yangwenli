# Risk Model Validation Guide

> *"The most dangerous enemy is not the one in front of you, but the one you cannot see."* - Yang Wen-li

This guide explains how to validate the Yang Wen-li risk scoring model against known corruption cases.

---

## Overview

The validation framework tests whether the risk model correctly identifies contracts from known corruption cases. This provides confidence that the model will flag similar patterns in unknown contracts.

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Detection Rate** | % of known bad contracts flagged medium+ | >= 80% |
| **Critical Detection Rate** | % flagged high or critical | >= 20% |
| **False Negative Rate** | % of known bad with low risk | < 20% |
| **Model Lift** | Detection rate vs baseline | >= 2.0x |

---

## Quick Start

```bash
# 1. Run migration to add ground truth tables
python backend/scripts/migrate_ground_truth_schema.py

# 2. Seed known corruption cases
python backend/scripts/seed_ground_truth.py

# 3. Match entities to database records
python backend/scripts/match_ground_truth.py --auto-match

# 4. Run validation
python backend/scripts/validate_risk_model.py
```

---

## Ground Truth Data

### Included Cases

| Case | Years | Type | Est. Fraud | Source |
|------|-------|------|------------|--------|
| La Estafa Maestra | 2013-2018 | Ghost companies | 7.6B MXN | ASF |
| Odebrecht-PEMEX | 2010-2016 | Bribery | 2.1B MXN | DOJ |
| COVID Procurement | 2020-2021 | Overpricing | 3.5B MXN | ASF/IMCO |
| IMSS Ghost Network | 2012-2018 | Ghost companies | 2.8B MXN | ASF |

### Data Location

```
backend/data/ground_truth/
├── estafa_maestra.json
├── odebrecht.json
├── covid_procurement.json
└── imss_ghost_companies.json
```

### JSON Format

```json
{
  "case": {
    "case_id": "UNIQUE_ID",
    "case_name": "Human-readable name",
    "case_type": "ghost_company|bribery|embezzlement|bid_rigging",
    "year_start": 2015,
    "year_end": 2018,
    "estimated_fraud_mxn": 1000000000,
    "source_asf": "ASF audit reference",
    "confidence_level": "high|medium|low"
  },
  "vendors": [
    {
      "vendor_name_source": "Name as reported in source",
      "rfc_source": "Optional RFC",
      "role": "shell_company|beneficiary|intermediary",
      "evidence_strength": "high|medium|low"
    }
  ],
  "institutions": [
    {
      "institution_name_source": "Name as reported",
      "role": "source|awarding_entity|intermediary",
      "evidence_strength": "high|medium|low"
    }
  ]
}
```

---

## Database Schema

### Ground Truth Tables

```sql
-- Known corruption cases
ground_truth_cases (
    case_id, case_name, case_type,
    year_start, year_end, estimated_fraud_mxn,
    source_asf, source_news, source_legal,
    confidence_level
)

-- Known bad vendors (linked to cases)
ground_truth_vendors (
    case_id, vendor_id, vendor_name_source,
    rfc_source, role, evidence_strength,
    match_method, match_confidence
)

-- Known bad institutions
ground_truth_institutions (
    case_id, institution_id, institution_name_source,
    role, evidence_strength,
    match_method, match_confidence
)

-- Validation run results
validation_results (
    run_id, model_version, run_date,
    detection_rate, critical_detection_rate,
    factor_trigger_counts, lift
)
```

---

## Entity Matching

The `match_ground_truth.py` script links ground truth entities to database records.

### Matching Methods

1. **RFC Exact Match** (confidence: 1.0)
   - Highest confidence, definitive identification
   - Only available when RFC is in ground truth data

2. **Name Exact Match** (confidence: 0.95)
   - Normalized name matches exactly
   - Accounts for legal suffix variations (SA DE CV, etc.)

3. **Fuzzy Match** (confidence: 0.65-0.85)
   - Uses SequenceMatcher similarity
   - Requires manual review for low confidence

### Running the Matcher

```bash
# Dry run - see matches without changing database
python backend/scripts/match_ground_truth.py --dry-run

# Auto-match high confidence only
python backend/scripts/match_ground_truth.py --auto-match

# Interactive mode (prompts for uncertain matches)
python backend/scripts/match_ground_truth.py --interactive
```

---

## Running Validation

```bash
# Standard run
python backend/scripts/validate_risk_model.py

# With specific model version
python backend/scripts/validate_risk_model.py --model-version v3.2

# Dry run (no database changes)
python backend/scripts/validate_risk_model.py --dry-run
```

### Validation Phases

1. **Phase 1: Gather Ground Truth**
   - Load matched vendors and institutions
   - Report coverage by case

2. **Phase 2: Gather Contracts**
   - Get all contracts from known bad vendors
   - Get contracts awarded by known institutions to known vendors

3. **Phase 3: Analyze Risk Scores**
   - Calculate risk level distribution
   - Compute detection metrics
   - Count factor triggers

4. **Phase 4: Baseline Comparison**
   - Sample random contracts for baseline
   - Calculate model lift

5. **Phase 5: Vendor Analysis**
   - Per-vendor detection rates
   - Identify best/worst performers

---

## API Endpoints

### Validation Summary
```
GET /api/v1/analysis/validation/summary
```
Returns ground truth data summary and last validation run.

### Detection Rate
```
GET /api/v1/analysis/validation/detection-rate
```
Returns historical validation results with metrics.

### False Negatives
```
GET /api/v1/analysis/validation/false-negatives?limit=50
```
Returns known bad contracts with low risk scores.

### Factor Analysis
```
GET /api/v1/analysis/validation/factor-analysis
```
Analyzes which factors are most effective at detecting known bad.

---

## Interpreting Results

### Detection Rate

| Rate | Interpretation | Action |
|------|----------------|--------|
| >= 80% | Excellent | Model working well |
| 60-80% | Good | Minor tuning may help |
| 40-60% | Moderate | Review factor weights |
| < 40% | Low | Needs investigation |

### Model Lift

| Lift | Interpretation |
|------|----------------|
| >= 2.0x | Strong discrimination |
| 1.5-2.0x | Moderate discrimination |
| 1.0-1.5x | Weak discrimination |
| < 1.0x | Model underperforming baseline |

### Low Detection Rate Causes

1. **Matching Issues**
   - Fuzzy matches may have linked wrong vendors
   - Shell companies may not exist in COMPRANET

2. **Temporal Mismatch**
   - Corruption occurred outside database coverage
   - Companies used different names in different periods

3. **Model Gaps**
   - Risk factors don't capture the pattern
   - Weight distribution needs adjustment

4. **Data Quality**
   - Pre-2010 data has low RFC coverage
   - Missing fields limit factor calculation

---

## Adding New Cases

### 1. Create JSON File

```bash
backend/data/ground_truth/new_case.json
```

### 2. Research Requirements

- **Minimum**: Case name, type, year range, 3+ vendors
- **Recommended**: Institution names, contract details
- **Ideal**: RFCs, specific contract numbers

### 3. Source Guidelines

| Source Type | Confidence |
|-------------|------------|
| ASF Audit Report | High |
| DOJ/FGR Documents | High |
| Court Records | High |
| Investigative Journalism | Medium |
| News Reports | Low |

### 4. Seed and Match

```bash
python backend/scripts/seed_ground_truth.py --file new_case.json
python backend/scripts/match_ground_truth.py --auto-match
```

---

## Improving Detection Rate

### Option 1: Improve Matching

- Review fuzzy matches manually
- Add RFCs from SAT database
- Search for company name variations

### Option 2: Add More Ground Truth

- Research additional corruption cases
- Include more vendors per case
- Add specific contract references

### Option 3: Adjust Risk Model

Based on factor analysis:
- Increase weights on factors with high lift
- Add new factors for undetected patterns
- Consider sector-specific thresholds

### Option 4: Manual Tagging

For false negatives:
- Tag contracts as "known_bad" directly
- Create investigation reports
- Track remediation status

---

## Caveats and Limitations

1. **No Ground Truth = No Precision/Recall**
   - We can't calculate true precision without verified clean contracts
   - Detection rate is a lower bound on recall

2. **Survivorship Bias**
   - We only see companies that used COMPRANET
   - Many shell companies operated outside the system

3. **Matching Uncertainty**
   - Fuzzy matches may be wrong
   - Same company names may be different entities

4. **Temporal Coverage**
   - Database coverage varies by year
   - Pre-2010 data quality is lowest

5. **Sample Size**
   - 12 matched vendors with 1,309 contracts
   - Results may not generalize to all corruption types

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-04 | Initial validation framework |

---

*"Victory belongs not to the strongest, but to the one who adapts."* - Yang Wen-li
