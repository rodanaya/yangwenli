"""
Contract API endpoints.

Provides access to 3.1M procurement contracts with filtering,
pagination, and risk information.
"""
import math
import sqlite3
import logging
import time
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, Path

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE, FLAG_THRESHOLD

logger = logging.getLogger(__name__)
from ..models.contract import (
    ContractListItem,
    ContractDetail,
    ContractListResponse,
    ContractStatistics,
    ContractRiskBreakdown,
    PaginationMeta,
)

# Valid risk levels for validation
VALID_RISK_LEVELS = {"low", "medium", "high", "critical"}

# In-memory cache for expensive aggregate queries (refreshed every 10 min)
_stats_cache: dict = {}
_STATS_CACHE_TTL = 600  # seconds

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

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Build WHERE clause
            # Filter conditions are split: amount guard is kept separate so COUNT
            # queries can skip it and use covering indexes (60x faster on 3.1M rows).
            # The amount guard (COALESCE) prevents SQLite from using MULTI-INDEX OR
            # but still requires a table lookup for each row — expensive for COUNT.
            filter_conditions = []
            filter_params = []

            if sector_id is not None:
                filter_conditions.append("c.sector_id = ?")
                filter_params.append(sector_id)

            if year is not None:
                filter_conditions.append("c.contract_year = ?")
                filter_params.append(year)

            if vendor_id is not None:
                filter_conditions.append("c.vendor_id = ?")
                filter_params.append(vendor_id)

            if institution_id is not None:
                filter_conditions.append("c.institution_id = ?")
                filter_params.append(institution_id)

            if risk_level is not None:
                filter_conditions.append("c.risk_level = ?")
                filter_params.append(risk_level.lower())

            if is_direct_award is not None:
                filter_conditions.append("c.is_direct_award = ?")
                filter_params.append(1 if is_direct_award else 0)

            if is_single_bid is not None:
                filter_conditions.append("c.is_single_bid = ?")
                filter_params.append(1 if is_single_bid else 0)

            if min_amount is not None:
                filter_conditions.append("c.amount_mxn >= ?")
                filter_params.append(min_amount)

            if max_amount is not None:
                filter_conditions.append("c.amount_mxn <= ?")
                filter_params.append(max_amount)

            if search:
                filter_conditions.append("(c.title LIKE ? OR c.description LIKE ?)")
                search_pattern = f"%{search}%"
                filter_params.extend([search_pattern, search_pattern])

            if risk_factor:
                filter_conditions.append("c.risk_factors LIKE ?")
                filter_params.append(f"%{risk_factor}%")

            # Both COUNT and DATA queries use the same filter conditions.
            # The COALESCE amount guard was removed because:
            # 1. ETL already rejects amounts > 100B MXN (verified: 0 rows exceed it)
            # 2. COALESCE prevents SQLite from using composite indexes for ORDER BY
            # 3. On large result sets (1M+ rows), this caused 1-8s slowdowns
            count_where = " AND ".join(filter_conditions) if filter_conditions else "1=1"
            where_clause = count_where
            params = list(filter_params)

            # Strict whitelist mapping for sort fields - maps user input to safe SQL expressions
            # This prevents SQL injection by only allowing pre-defined, safe column references
            SORT_FIELD_MAPPING = {
                "contract_date": "c.contract_date",
                "amount_mxn": "c.amount_mxn",
                "risk_score": "c.risk_score",
                "contract_year": "c.contract_year",
                "id": "c.id",
                "title": "c.title",
                "vendor_name": "vendor_name",       # JOIN alias
                "institution_name": "institution_name",  # JOIN alias
                "mahalanobis_distance": "c.mahalanobis_distance",
            }

            # Get safe sort expression from whitelist (defaults to contract_date if invalid)
            sort_expr = SORT_FIELD_MAPPING.get(sort_by, "c.contract_date")

            # Validate sort order - only allow ASC or DESC (already validated by Query pattern)
            order_direction = "DESC" if sort_order.lower() == "desc" else "ASC"

            # Count total (uses filter conditions only — no amount guard —
            # so SQLite can use covering indexes like idx_contracts_risk_level)
            count_query = f"""
                SELECT COUNT(*) FROM contracts c WHERE {count_where}
            """
            cursor.execute(count_query, filter_params)
            total = cursor.fetchone()[0]
            total_pages = math.ceil(total / per_page) if total > 0 else 1

            # Get paginated results
            offset = (page - 1) * per_page

            query = f"""
                SELECT
                    c.id,
                    c.contract_number,
                    c.title,
                    c.amount_mxn,
                    c.contract_date,
                    c.contract_year,
                    c.sector_id,
                    s.name_es as sector_name,
                    c.risk_score,
                    c.risk_level,
                    c.is_direct_award,
                    c.is_single_bid,
                    v.name as vendor_name,
                    i.name as institution_name,
                    c.procedure_type,
                    c.mahalanobis_distance,
                    c.vendor_id,
                    c.institution_id,
                    c.risk_factors
                FROM contracts c
                LEFT JOIN sectors s ON c.sector_id = s.id
                LEFT JOIN vendors v ON c.vendor_id = v.id
                LEFT JOIN institutions i ON c.institution_id = i.id
                WHERE {where_clause}
                ORDER BY {sort_expr} {order_direction} NULLS LAST
                LIMIT ? OFFSET ?
            """
            params.extend([per_page, offset])
            cursor.execute(query, params)
            rows = cursor.fetchall()

            # Convert to response models
            contracts = []
            for row in rows:
                contracts.append(ContractListItem(
                    id=row[0],
                    contract_number=row[1],
                    title=row[2],
                    amount_mxn=row[3] or 0,
                    contract_date=row[4],
                    contract_year=row[5],
                    sector_id=row[6],
                    sector_name=row[7],
                    risk_score=row[8],
                    risk_level=row[9],
                    is_direct_award=bool(row[10]),
                    is_single_bid=bool(row[11]),
                    vendor_name=row[12],
                    institution_name=row[13],
                    procedure_type=row[14],
                    mahalanobis_distance=row[15],
                    vendor_id=row[16],
                    institution_id=row[17],
                    risk_factors=parse_risk_factors(row[18]),
                ))

            return ContractListResponse(
                data=contracts,
                pagination=PaginationMeta(
                    page=page,
                    per_page=per_page,
                    total=total,
                    total_pages=total_pages,
                )
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in list_contracts: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


def _compute_statistics(cursor, where_clause: str, params: list) -> ContractStatistics:
    """Execute statistics query and build response model."""
    query = f"""
        SELECT
            COUNT(*) as total_contracts,
            COALESCE(SUM(amount_mxn), 0) as total_value,
            COALESCE(AVG(amount_mxn), 0) as avg_value,
            SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low_risk,
            SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
            SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
            SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical_risk,
            SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
            SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bids,
            MIN(contract_year) as min_year,
            MAX(contract_year) as max_year
        FROM contracts
        WHERE {where_clause}
    """
    cursor.execute(query, params)
    row = cursor.fetchone()

    total = row[0] or 0
    return ContractStatistics(
        total_contracts=total,
        total_value_mxn=row[1] or 0,
        avg_contract_value=row[2] or 0,
        low_risk_count=row[3] or 0,
        medium_risk_count=row[4] or 0,
        high_risk_count=row[5] or 0,
        critical_risk_count=row[6] or 0,
        direct_award_count=row[7] or 0,
        direct_award_pct=round((row[7] or 0) / total * 100, 2) if total > 0 else 0,
        single_bid_count=row[8] or 0,
        single_bid_pct=round((row[8] or 0) / total * 100, 2) if total > 0 else 0,
        min_year=row[9] or 2002,
        max_year=row[10] or 2025,
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
    try:
        cache_key = f"stats:{sector_id}:{year}"
        cached = _stats_cache.get(cache_key)
        if cached and (time.time() - cached["ts"]) < _STATS_CACHE_TTL:
            return cached["data"]

        with get_db() as conn:
            cursor = conn.cursor()

            conditions = []
            params = []

            if sector_id is not None:
                conditions.append("sector_id = ?")
                params.append(sector_id)

            if year is not None:
                conditions.append("contract_year = ?")
                params.append(year)

            where_clause = " AND ".join(conditions) if conditions else "1=1"
            result = _compute_statistics(cursor, where_clause, params)
            _stats_cache[cache_key] = {"ts": time.time(), "data": result}
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_contract_statistics: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/{contract_id}", response_model=ContractDetail)
def get_contract(
    contract_id: int = Path(..., description="Contract ID"),
):
    """
    Get detailed information for a specific contract.

    Returns all contract fields including full risk breakdown,
    related entity information, and data quality metrics.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            query = """
                SELECT
                    c.*,
                    s.name_es as sector_name,
                    v.name as vendor_name,
                    v.rfc as vendor_rfc,
                    i.name as institution_name,
                    i.institution_type as institution_type
                FROM contracts c
                LEFT JOIN sectors s ON c.sector_id = s.id
                LEFT JOIN vendors v ON c.vendor_id = v.id
                LEFT JOIN institutions i ON c.institution_id = i.id
                WHERE c.id = ?
            """
            cursor.execute(query, (contract_id,))
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

            # Convert row to dict
            columns = [desc[0] for desc in cursor.description]
            contract_dict = dict(zip(columns, row))

            return ContractDetail(
                id=contract_dict["id"],
                contract_number=contract_dict.get("contract_number"),
                procedure_number=contract_dict.get("procedure_number"),
                expedient_code=contract_dict.get("expedient_code"),
                title=contract_dict.get("title"),
                description=contract_dict.get("description"),
                amount_mxn=contract_dict.get("amount_mxn") or 0,
                amount_original=contract_dict.get("amount_original"),
                currency=contract_dict.get("currency"),
                contract_date=contract_dict.get("contract_date"),
                contract_year=contract_dict.get("contract_year"),
                start_date=contract_dict.get("start_date"),
                end_date=contract_dict.get("end_date"),
                award_date=contract_dict.get("award_date"),
                publication_date=contract_dict.get("publication_date"),
                # Classification
                sector_id=contract_dict.get("sector_id"),
                sector_name=contract_dict.get("sector_name"),
                # Entities
                vendor_id=contract_dict.get("vendor_id"),
                vendor_name=contract_dict.get("vendor_name"),
                vendor_rfc=contract_dict.get("vendor_rfc"),
                institution_id=contract_dict.get("institution_id"),
                institution_name=contract_dict.get("institution_name"),
                institution_type=contract_dict.get("institution_type"),
                # Procedure
                procedure_type=contract_dict.get("procedure_type"),
                procedure_type_normalized=contract_dict.get("procedure_type_normalized"),
                contract_type=contract_dict.get("contract_type"),
                contract_type_normalized=contract_dict.get("contract_type_normalized"),
                procedure_character=contract_dict.get("procedure_character"),
                participation_form=contract_dict.get("participation_form"),
                partida_especifica=contract_dict.get("partida_especifica"),
                # Flags
                is_direct_award=bool(contract_dict.get("is_direct_award")),
                is_single_bid=bool(contract_dict.get("is_single_bid")),
                is_framework=bool(contract_dict.get("is_framework")),
                is_consolidated=bool(contract_dict.get("is_consolidated")),
                is_multiannual=bool(contract_dict.get("is_multiannual")),
                is_high_value=bool(contract_dict.get("is_high_value")),
                is_year_end=bool(contract_dict.get("is_year_end")),
                # Risk
                risk_score=contract_dict.get("risk_score"),
                risk_level=contract_dict.get("risk_level"),
                risk_factors=parse_risk_factors(contract_dict.get("risk_factors")),
                risk_confidence=contract_dict.get("risk_confidence"),
                # Quality
                data_quality_score=contract_dict.get("data_quality_score"),
                data_quality_grade=contract_dict.get("data_quality_grade"),
                # Metadata
                source_structure=contract_dict.get("source_structure"),
                source_year=contract_dict.get("source_year"),
                url=contract_dict.get("url"),
                contract_status=contract_dict.get("contract_status"),
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_contract: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


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
