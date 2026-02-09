# Yang Wen-li: Mexican Government Procurement Analysis

> *"There are things that cannot be measured in terms of victory or defeat."* - Yang Wen-li
>
> AI-Powered Corruption Detection Platform for Mexican Government Procurement

---

## Quick Reference

| Item | Value |
|------|-------|
| **Database** | `backend/RUBLI_NORMALIZED.db` |
| **Records** | ~3.1M contracts (2002-2025) |
| **Validated Value** | ~6-8T MXN (after outlier removal) |
| **Sectors** | 12 main sectors |
| **Backend Port** | 8001 |
| **Frontend Port** | 3009 |

---

## Quick Commands

```bash
# Development
/dev all                    # Start backend + frontend
/dev status                 # Check server status

# Data Processing
/validate-data <filepath>   # Validate COMPRANET data
/etl                        # Run ETL pipeline

# Common Operations
/clear                      # Reset conversation context
/help                       # Show available commands
```

---

## Critical Data Rules

### Amount Validation (MEMORIZE THIS)

| Value Range | Action |
|-------------|--------|
| > 100B MXN | **REJECT** - Data error, exclude from analytics |
| > 10B MXN | **FLAG** - Include but mark for manual review |
| <= 10B MXN | Accept normally |

**Why**: The ogulin project had 7 contracts with TRILLION peso values that destroyed all analytics. These were decimal point errors.

For detailed validation rules, see @.claude/rules/data-validation.md

---

## 12-Sector Taxonomy

| ID | Code | Ramo Codes | Color |
|----|------|------------|-------|
| 1 | salud | 12, 50, 51 | #dc2626 |
| 2 | educacion | 11, 25, 48 | #3b82f6 |
| 3 | infraestructura | 09, 15, 21 | #ea580c |
| 4 | energia | 18, 45, 46, 52, 53 | #eab308 |
| 5 | defensa | 07, 13 | #1e3a5f |
| 6 | tecnologia | 38, 42 | #8b5cf6 |
| 7 | hacienda | 06, 23, 24 | #16a34a |
| 8 | gobernacion | 01-05, 17, 22, 27, 35, 36, 43 | #be123c |
| 9 | agricultura | 08 | #22c55e |
| 10 | ambiente | 16 | #10b981 |
| 11 | trabajo | 14, 19, 40 | #f97316 |
| 12 | otros | (default) | #64748b |

---

## Risk Scoring Model

**Two models available** — v3.3 (weighted checklist) and v4.0 (statistical framework):

### v4.0: Statistical Framework (active, retrained 2026-02-09)

Calibrated probabilities P(corrupt|z) with confidence intervals. **AUC-ROC: 0.951**, Lift: 4.04x.

- 12 z-score features normalized by sector/year baselines
- Mahalanobis distance for multivariate anomaly detection
- Bayesian logistic regression (L2, C=0.1) trained on 21,252 known-bad contracts from 9 cases
- PU-learning correction (c=0.890) for unlabeled data
- 1,000 bootstrap 95% confidence intervals

**Top predictors**: vendor_concentration (+1.85), industry_mismatch (+0.21), same_day_count (+0.14)
**Reversed from v3.3**: direct_award (-0.20), ad_period_days (-0.22), network_member_count (-4.11)
**Risk Levels (v4.0)**: Critical (>=0.50), High (>=0.20), Medium (>=0.05), Low (<0.05)
**Distribution**: Critical 5.5%, High 17.7%, Medium 66.7%, Low 10.1%

### v3.3: Weighted Checklist (preserved in risk_score_v3)

8-factor model aligned with IMF CRI methodology. **AUC-ROC: 0.584**, Lift: 1.22x.

| Factor | Weight |
|--------|--------|
| Single bidding | 18% |
| Non-open procedure | 18% |
| Price anomaly | 18% |
| Vendor concentration | 12% |
| Short ad period | 12% |
| Year-end timing | 7% |
| Threshold splitting | 7% |
| Network risk | 8% |

**Bonus factors** (added on top): Co-bidding +5%, Price hypothesis +5%, Industry mismatch +3%, Institution risk +3%
**Interaction effects**: 5 pairs, up to +15% bonus. Score capped at 1.0.
**Risk Levels**: Critical (>=0.50), High (0.35-0.50), Medium (0.20-0.35), Low (<0.20)

For methodology details, see @docs/RISK_METHODOLOGY.md (v3.3), @docs/RISK_METHODOLOGY_v4.md (v4.0), and @docs/MODEL_COMPARISON_REPORT.md (comparison)

---

## Data Sources

COMPRANET data has 4 different structures with varying quality:

| Structure | Years | Quality | RFC Coverage |
|-----------|-------|---------|--------------|
| A | 2002-2010 | LOWEST | 0.1% |
| B | 2010-2017 | Better | 15.7% |
| C | 2018-2022 | Good | 30.3% |
| D | 2023-2025 | BEST | 47.4% |

**Key Limitation**: Structure A (2002-2010) data quality is lowest - risk scores may be underestimated for this period.

---

## Specialized Agents

7 agents are available for domain-specific tasks. They're triggered automatically based on your request:

| Agent | Trigger When |
|-------|--------------|
| @.claude/agents/data-quality-guardian.md | Processing data, validating files |
| @.claude/agents/schema-architect.md | Designing database, optimizing queries |
| @.claude/agents/risk-model-engineer.md | Tuning risk scores, investigating flags |
| @.claude/agents/network-detective.md | Investigating vendors, detecting collusion |
| @.claude/agents/viz-storyteller.md | Creating visualizations, designing dashboards |
| @.claude/agents/api-designer.md | Adding endpoints, API performance |
| @.claude/agents/frontend-architect.md | Building React components, UI work |

---

## Getting Started

New to this project? Start here:

1. **Read the guide**: @docs/CLAUDE_CODE_GUIDE.md
2. **Learn workflows**: @docs/WORKFLOW_PATTERNS.md
3. **Understand config**: @docs/CONFIGURATION_REFERENCE.md

---

## Project Philosophy

This project follows the **"Ask Before Acting"** pattern:

1. Claude analyzes context
2. Claude asks clarifying questions
3. **You approve/modify/reject**
4. Claude implements with running commentary
5. Claude summarizes what was learned

Nothing irreversible happens without your explicit approval.

---

## Important Files

| Purpose | Path |
|---------|------|
| Database | `backend/RUBLI_NORMALIZED.db` |
| ETL Pipeline | `backend/scripts/etl_pipeline.py` |
| Schema Creation | `backend/scripts/etl_create_schema.py` |
| Classification | `backend/scripts/etl_classify.py` |
| Security Settings | `.claude/settings.json` |
| Personal Settings | `.claude/settings.local.json` |

---

*Named after Yang Wen-li from Legend of the Galactic Heroes - the pragmatic historian who valued transparency and democratic institutions over blind ambition.*
