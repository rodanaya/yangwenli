"""
Analysis router — thin pass-through.

The original monolithic analysis.py (~3943 lines, 40+ endpoints) has been
split into four focused sub-routers. This file re-exports a single `router`
object that merges them all so that existing mount points in api/main.py
require zero changes.

Sub-routers:
- analysis_temporal.py  — monthly breakdown, year-over-year, sector-year,
                           temporal events, period comparison, december spike,
                           structural breaks, political cycle, publication
                           delays, threshold gaming (10 endpoints)
- analysis_prices.py    — price hypotheses list/summary/detail/review,
                           contract price analysis, price baselines,
                           ML anomalies, anomaly comparison (8 endpoints)
- analysis_patterns.py  — pattern counts, co-bidding, concentration,
                           year-end patterns, investigation leads, institution
                           period comparison, anomalies, money flow, risk
                           factor analysis, institution rankings, institution
                           risk factors (11 endpoints)
- analysis_validation.py — model metadata, risk overview, per-case detection,
                            validation summary, detection rate, false negatives,
                            factor analysis, factor lift, ASF sector findings,
                            ASF institution summary (10 endpoints)
"""

from fastapi import APIRouter

from .analysis_temporal import router as _temporal_router
from .analysis_prices import router as _prices_router
from .analysis_patterns import router as _patterns_router
from .analysis_validation import router as _validation_router

router = APIRouter()
router.include_router(_temporal_router)
router.include_router(_prices_router)
router.include_router(_patterns_router)
router.include_router(_validation_router)
