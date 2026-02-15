"""
Contract API endpoints.

Provides access to 3.1M procurement contracts with filtering,
pagination, and risk information.

Thin router — delegates business logic to ContractService.
"""
import sqlite3
import logging
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, Path

from ..dependencies import get_db
from ..models.contract import (
    ContractListItem,
    ContractDetail,
    ContractListResponse,
    ContractStatistics,
    ContractRiskBreakdown,
    PaginationMeta,
)
from ..services.contract_service import contract_service

logger = logging.getLogger(__name__)

# Valid risk levels for validation
VALID_RISK_LEVELS = {"low", "medium", "high", "critical"}

# Thread-safe, bounded cache for expensive aggregate queries
from ..cache import app_cache
_stats_cache_name = "contracts_stats"

router = APIRouter(prefix="/contracts", tags=["contracts"])


def parse_risk_factors(factors_str: Optional[str]) -> List[str]:
    """Parse comma-separated risk factors string."""
    if not factors_str:
        return []
    return [f.strip() for f in factors_str.split(",") if f.strip()]


@router.get("", response_model=ContractListResponse)
def list_contracts(
    # Pagination
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page (max 100)"),
    # Filters
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector ID (1-12)"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by contract year"),
    vendor_id: Optional[int] = Query(None, description="Filter by vendor ID"),
    institution_id: Optional[int] = Query(None, description="Filter by institution ID"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (low/medium/high/critical)"),
    is_direct_award: Optional[bool] = Query(None, description="Filter direct awards"),
    is_single_bid: Optional[bool] = Query(None, description="Filter single-bid contracts"),
    risk_factor: Optional[str] = Query(None, description="Filter by risk factor (e.g., co_bid, price_hyp, direct_award)"),
    min_amount: Optional[float] = Query(None, ge=0, description="Minimum contract amount"),
    max_amount: Optional[float] = Query(None, le=100_000_000_000, description="Maximum contract amount"),
    search: Optional[str] = Query(None, min_length=3, description="Search in title/description"),
    # Sorting
    sort_by: str = Query("contract_date", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
):
    """
    List contracts with filtering and pagination.

    Supports filtering by sector, year, vendor, institution, risk level,
    procedure type flags, and amount range. Search in title/description.

    **Performance note**: This endpoint returns paginated results from 3.1M contracts.
    Always use filters to narrow results for better performance.
    """
    # Validate risk_level before database operations
    if risk_level is not None:
        if risk_level.lower() not in VALID_RISK_LEVELS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid risk_level '{risk_level}'. Must be one of: {', '.join(sorted(VALID_RISK_LEVELS))}"
            )

    with get_db() as conn:
        result = contract_service.list_contracts(
            conn,
            page=page,
            per_page=per_page,
            sector_id=sector_id,
            year=year,
            vendor_id=vendor_id,
            institution_id=institution_id,
            risk_level=risk_level,
            is_direct_award=is_direct_award,
            is_single_bid=is_single_bid,
            risk_factor=risk_factor,
            min_amount=min_amount,
            max_amount=max_amount,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        return ContractListResponse(
            data=[ContractListItem(**item) for item in result.data],
            pagination=PaginationMeta(**result.pagination),
        )


@router.get("/statistics", response_model=ContractStatistics)
def get_contract_statistics(
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector ID (1-12)"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
):
    """
    Get aggregate contract statistics.

    Returns total counts, values, and breakdowns by risk level and procedure type.
    Optionally filter by sector and/or year.
    """
    cache_key = f"stats:{sector_id}:{year}"
    cached = app_cache.get(_stats_cache_name, cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        stats = contract_service.get_contract_statistics(
            conn, sector_id=sector_id, year=year,
        )
        result = ContractStatistics(**stats)
        app_cache.set(_stats_cache_name, cache_key, result, maxsize=64, ttl=600)
        return result


@router.get("/{contract_id}", response_model=ContractDetail)
def get_contract(
    contract_id: int = Path(..., description="Contract ID"),
):
    """
    Get detailed information for a specific contract.

    Returns all contract fields including full risk breakdown,
    related entity information, and data quality metrics.
    """
    with get_db() as conn:
        detail = contract_service.get_contract_detail(conn, contract_id)

        if detail is None:
            raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

        # Convert boolean flags and parse risk_factors from the raw dict
        detail["is_direct_award"] = bool(detail.get("is_direct_award"))
        detail["is_single_bid"] = bool(detail.get("is_single_bid"))
        detail["is_framework"] = bool(detail.get("is_framework"))
        detail["is_consolidated"] = bool(detail.get("is_consolidated"))
        detail["is_multiannual"] = bool(detail.get("is_multiannual"))
        detail["is_high_value"] = bool(detail.get("is_high_value"))
        detail["is_year_end"] = bool(detail.get("is_year_end"))
        detail["amount_mxn"] = detail.get("amount_mxn") or 0
        detail["risk_factors"] = parse_risk_factors(detail.get("risk_factors"))

        return ContractDetail(**detail)


@router.get("/{contract_id}/risk", response_model=ContractRiskBreakdown)
def get_contract_risk(
    contract_id: int = Path(..., description="Contract ID"),
):
    """
    Get risk score breakdown for a specific contract.

    Returns the overall risk score and individual factor contributions.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            query = """
                SELECT
                    id, risk_score, risk_level, risk_confidence, risk_factors,
                    is_direct_award, is_single_bid, is_year_end, amount_mxn
                FROM contracts
                WHERE id = ?
            """
            cursor.execute(query, (contract_id,))
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

            # Parse risk factors into detailed breakdown
            factors_str = row[4] or ""
            factors = []

            # Map factor codes to descriptions and weights (v3.2)
            factor_info = {
                # Base factors
                "direct_award": ("Direct Award (Non-competitive)", 0.15),
                "single_bid": ("Single Bidder", 0.15),
                "restricted_procedure": ("Restricted Procedure", 0.08),
                "year_end": ("Year-End Timing (December)", 0.05),
                "price_anomaly": ("Price Anomaly", 0.15),
                "price_outlier": ("Price Anomaly", 0.15),
                "vendor_concentration_high": ("High Vendor Concentration (>30%)", 0.10),
                "vendor_concentration_med": ("Medium Vendor Concentration (20-30%)", 0.07),
                "vendor_concentration_low": ("Low Vendor Concentration (10-20%)", 0.05),
                "short_ad_<5d": ("Very Short Ad Period (<5 days)", 0.10),
                "short_ad_<15d": ("Short Ad Period (<15 days)", 0.07),
                "short_ad_<30d": ("Moderately Short Ad Period", 0.03),
                # Threshold splitting
                "split_5+": ("Threshold Splitting (5+ same day)", 0.05),
                "split_3-4": ("Threshold Splitting (3-4 same day)", 0.03),
                "split_2": ("Threshold Splitting (2 same day)", 0.015),
                # Network risk
                "network_5+": ("Network Risk (Large Group)", 0.05),
                "network_3-4": ("Network Risk (Medium Group)", 0.03),
                "network_2": ("Network Risk (Small Group)", 0.015),
            }

            for factor in factors_str.split(","):
                factor = factor.strip()
                if not factor:
                    continue

                # Handle dynamic factors
                if factor.startswith("industry_mismatch:"):
                    factors.append({
                        "code": factor,
                        "name": "Industry-Sector Mismatch",
                        "description": f"Vendor industry doesn't match sector ({factor.split(':')[1]})",
                        "weight": 0.03,
                    })
                elif factor.startswith("inst_risk:"):
                    inst_type = factor.split(":")[1]
                    factors.append({
                        "code": factor,
                        "name": "Institution Risk Baseline",
                        "description": f"Higher risk institution type: {inst_type}",
                        "weight": 0.03,
                    })
                elif factor.startswith("co_bid_high:"):
                    # v3.2: Co-bidding high risk - e.g., co_bid_high:85%:3p
                    parts = factor.split(":")
                    rate = parts[1] if len(parts) > 1 else "?"
                    partners = parts[2] if len(parts) > 2 else "?"
                    factors.append({
                        "code": factor,
                        "name": "High Co-Bidding Risk",
                        "description": f"Vendor appears in {rate} of procedures with same partners ({partners})",
                        "weight": 0.05,
                        "icon": "users",
                        "severity": "high",
                    })
                elif factor.startswith("co_bid_med:"):
                    parts = factor.split(":")
                    rate = parts[1] if len(parts) > 1 else "?"
                    partners = parts[2] if len(parts) > 2 else "?"
                    factors.append({
                        "code": factor,
                        "name": "Medium Co-Bidding Risk",
                        "description": f"Vendor appears in {rate} of procedures with same partners ({partners})",
                        "weight": 0.03,
                        "icon": "users",
                        "severity": "medium",
                    })
                elif factor.startswith("price_hyp:"):
                    # v3.1: Price hypothesis - e.g., price_hyp:extreme_overpricing:0.95
                    parts = factor.split(":")
                    hyp_type = parts[1] if len(parts) > 1 else "unknown"
                    confidence = parts[2] if len(parts) > 2 else "?"
                    factors.append({
                        "code": factor,
                        "name": "Price Anomaly Detected",
                        "description": f"Statistical outlier: {hyp_type.replace('_', ' ')} (confidence: {confidence})",
                        "weight": 0.05,
                        "icon": "dollar-sign",
                        "severity": "high",
                    })
                elif factor.startswith("split_"):
                    # Dynamic split factors - e.g., split_5, split_3
                    count = factor.split("_")[1] if "_" in factor else "?"
                    factors.append({
                        "code": factor,
                        "name": f"Threshold Splitting ({count} contracts)",
                        "description": f"{count} contracts to same vendor on same day",
                        "weight": 0.05 if int(count) >= 5 else 0.03,
                        "icon": "scissors",
                    })
                elif factor.startswith("network_"):
                    # Dynamic network factors - e.g., network_5
                    count = factor.split("_")[1] if "_" in factor else "?"
                    factors.append({
                        "code": factor,
                        "name": f"Network Risk ({count} related vendors)",
                        "description": f"Vendor is in a group of {count} related entities",
                        "weight": 0.05 if int(count) >= 5 else 0.03,
                        "icon": "git-branch",
                    })
                elif factor in factor_info:
                    name, weight = factor_info[factor]
                    factors.append({
                        "code": factor,
                        "name": name,
                        "description": name,
                        "weight": weight,
                    })
                else:
                    factors.append({
                        "code": factor,
                        "name": factor.replace("_", " ").title(),
                        "description": factor,
                        "weight": 0.0,
                    })

            return ContractRiskBreakdown(
                contract_id=row[0],
                risk_score=row[1] or 0,
                risk_level=row[2] or "unknown",
                risk_confidence=row[3],
                factors=factors,
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_contract_risk: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/by-vendor/{vendor_id}")
def get_contracts_by_vendor(
    vendor_id: int = Path(..., description="Vendor ID"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
):
    """Get all contracts for a specific vendor."""
    return list_contracts(
        page=page,
        per_page=per_page,
        vendor_id=vendor_id,
    )


@router.get("/by-institution/{institution_id}")
def get_contracts_by_institution(
    institution_id: int = Path(..., description="Institution ID"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
):
    """Get all contracts for a specific institution."""
    return list_contracts(
        page=page,
        per_page=per_page,
        institution_id=institution_id,
    )
