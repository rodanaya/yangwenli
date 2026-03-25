# analysis.py Router Map

## File: `backend/api/routers/analysis.py`
**Original size:** 5,668 lines | **52 endpoints**

All routes share the prefix `/api/v1/analysis` (set in `main.py` + `prefix="/analysis"` in router).

---

## Endpoint Inventory (52 endpoints)

### Domain 1: Risk Model & Overview (lines 314–455)
| Endpoint | Line | Function |
|----------|------|----------|
| GET /model/metadata | 317 | get_model_metadata |
| GET /risk-overview | 382 | get_risk_overview |
| GET /patterns/counts | 435 | get_pattern_counts |

### Domain 2: Temporal Analysis (lines 456–912)
| Endpoint | Line | Function |
|----------|------|----------|
| GET /monthly-breakdown/{year} | 460 | get_monthly_breakdown |
| GET /year-over-year | 557 | get_year_over_year |
| GET /sector-year-breakdown | 634 | get_sector_year_breakdown |
| GET /temporal-events | 712 | get_temporal_events |
| GET /compare-periods | 734 | get_compare_periods |
| GET /december-spike-analysis | 828 | get_december_spike_analysis |

### Domain 3: Price Hypotheses (lines 906–1427)
| Endpoint | Line | Function |
|----------|------|----------|
| GET /price-hypotheses | 910 | get_price_hypotheses |
| GET /price-hypotheses/summary | 1013 | get_price_hypotheses_summary |
| GET /price-hypotheses/{hypothesis_id} | 1149 | get_price_hypothesis_detail |
| PUT /price-hypotheses/{hypothesis_id}/review | 1257 | review_price_hypothesis |
| GET /contracts/{contract_id}/price-analysis | 1283 | get_contract_price_analysis |
| GET /price-baselines | 1385 | get_price_baselines |

### Domain 4: Ground Truth Validation (lines 1428–1922)
| Endpoint | Line | Function |
|----------|------|----------|
| GET /validation/per-case-detection | 1513 | get_per_case_detection |
| GET /validation/summary | 1585 | get_validation_summary |
| GET /validation/detection-rate | 1669 | get_detection_rate |
| GET /validation/false-negatives | 1747 | get_false_negatives |
| GET /validation/factor-analysis | 1830 | get_factor_analysis |

### Domain 5: Pattern Detection ← EXTRACTED to `analysis_patterns.py` (lines 1923–2551)
| Endpoint | Line | Function |
|----------|------|----------|
| GET /patterns/co-bidding | 2028 | get_co_bidding_patterns |
| GET /patterns/concentration | 2131 | get_concentration_patterns |
| GET /patterns/year-end | 2237 | get_year_end_patterns |
| GET /leads | 2333 | get_investigation_leads |
| GET /institution/{institution_id}/period-comparison | 2477 | get_institution_period_comparison |

**Line count: ~629 lines, 5 endpoints**

### Domain 6: Anomaly Detection (lines 2552–2783)
| Endpoint | Line | Function |
|----------|------|----------|
| GET /anomalies | 2579 | get_anomalies |
| GET /money-flow | 2744 | get_money_flow |

### Domain 7: Risk Factor Analysis (lines 2784–3275)
| Endpoint | Line | Function |
|----------|------|----------|
| GET /risk-factor-analysis | 2812 | get_risk_factor_analysis |
| GET /validation/factor-lift | 2974 | get_factor_lift |
| GET /institution-rankings | 3103 | get_institution_rankings |
| GET /structural-breaks | 3253 | get_structural_breaks |
| GET /prices/ml-anomalies | 3281 | get_ml_price_anomalies |

### Domain 8: Transparency & Political (lines 3410–3972)
| Endpoint | Line | Function |
|----------|------|----------|
| GET /anomaly-comparison | 3418 | get_anomaly_comparison |
| GET /political-cycle | 3483 | get_political_cycle |
| GET /transparency/publication-delays | 3598 | get_publication_delays |
| GET /threshold-gaming | 3716 | get_threshold_gaming |
| GET /sectors/{sector_id}/asf-findings | 3817 | get_sector_asf_findings |
| GET /asf-institution-summary | 3892 | get_asf_institution_summary |

### Domain 9: Vendor & Sector Analytics ← EXTRACTED to `analysis_vendor_sector.py` (lines 3973–5187)
| Endpoint | Line | Function |
|----------|------|----------|
| GET /institution-risk-factors | 3997 | get_institution_risk_factors |
| GET /value-concentration | 4120 | get_value_concentration |
| GET /flash-vendors | 4224 | get_flash_vendors |
| GET /industry-risk-clusters | 4350 | get_industry_risk_clusters |
| GET /seasonal-risk | 4533 | get_seasonal_risk |
| GET /monthly-risk-summary | 4632 | get_monthly_risk_summary |
| GET /procedure-risk-comparison | 4743 | get_procedure_risk_comparison |
| GET /top-by-period | 4822 | get_top_by_period |
| GET /sector-growth | 4924 | get_sector_growth |
| GET /year-summary/{year} | 5027 | get_year_summary |

**Line count: ~1,215 lines, 10 endpoints**

### Domain 10: V5.2 Analytical Engine (lines 5188–5668)
| Endpoint | Line | Function |
|----------|------|----------|
| GET /feature-importance | 5211 | get_feature_importance |
| GET /pyod-agreement | 5297 | get_pyod_agreement |
| GET /drift | 5409 | get_drift_report |
| GET /factor-baselines | 5529 | get_factor_baselines |
| GET /factor-baselines/{sector_id}/{year} | 5599 | get_factor_baselines_sector_year |

---

## Cache Pattern Inventory (4 patterns)

| Pattern | Instances | Canonical Form |
|---------|-----------|----------------|
| `SimpleCache` (from `..cache`) | `_analysis_cache` global, used for analytical engine | `.get(key)` / `.set(key, value, ttl_seconds=N)` |
| `Dict + {"ts": float, "data": Any}` | 10+ module-level dicts | `if cached and (_time.time() - cached["ts"]) < TTL` |
| `Dict + {"expires_at": datetime, "value": Any}` | `_inst_risk_factors_cache`, `_industry_clusters_cache` | `if entry and datetime.now() < entry["expires_at"]` |
| `global` + flat timestamp variable | `_pattern_counts_cache` + `_pattern_counts_ts` | `global _cache, _ts; if _cache and (now - _ts) < TTL` |
| `_anomalies_cache` (Dict) + separate `_anomalies_cache_time: Optional[datetime]` | 1 | `if _anomalies_cache_time and (datetime.now() - _anomalies_cache_time).total_seconds() < TTL` |

**Unified recommendation:** `SimpleCache` (already exists in `cache.py`) is the cleanest pattern.
Use `_analysis_cache.get(key)` / `_analysis_cache.set(key, value, ttl_seconds=N)` throughout.

---

## Extracted Routers

| File | Domain | Endpoints | Original Lines | New Lines |
|------|--------|-----------|----------------|-----------|
| `analysis_patterns.py` | Pattern Detection | 5 | 1923–2551 (~629) | ~450 |
| `analysis_vendor_sector.py` | Vendor & Sector Analytics | 10 | 3973–5187 (~1,215) | ~1,050 |

**analysis.py reduction: ~1,844 lines removed → ~3,824 lines remaining**
