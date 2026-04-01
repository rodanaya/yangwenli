"""
API router for bid-rigging and collusion pattern analysis.

Provides paginated access to co-bidding pairs from the co_bidding_stats table,
with vendor name lookups and aggregate statistics.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from ..dependencies import get_db_dep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/collusion", tags=["collusion"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class CollusionPair(BaseModel):
    """A vendor pair from co_bidding_stats with resolved names."""
    vendor_id_a: int
    vendor_id_b: int
    vendor_name_a: str
    vendor_name_b: str
    shared_procedures: int
    vendor_a_procedures: int
    vendor_b_procedures: int
    co_bid_rate: float = Field(..., description="Co-bid rate as a percentage 0–100")
    is_potential_collusion: bool


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class CollusionPairsResponse(BaseModel):
    data: List[CollusionPair]
    pagination: PaginationMeta


class CollusionStats(BaseModel):
    total_pairs: int = Field(..., description="Total rows in co_bidding_stats")
    potential_collusion_count: int = Field(..., description="Pairs flagged as potential collusion")
    total_shared_procedures: int = Field(..., description="Sum of shared_procedures across all pairs")
    max_co_bid_rate: float = Field(..., description="Highest co-bid rate among flagged pairs")


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/pairs", response_model=CollusionPairsResponse, summary="List co-bidding pairs")
def get_collusion_pairs(
    is_potential_collusion: Optional[bool] = Query(True, description="Filter by collusion flag"),
    min_shared_procedures: int = Query(10, ge=1, description="Minimum shared procedures"),
    sort_by: str = Query("shared_procedures", regex="^(shared_procedures|co_bid_rate)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    conn=Depends(get_db_dep),
):
    """
    Return paginated co-bidding pairs with vendor names.

    Results are ordered by shared_procedures or co_bid_rate descending.
    Use is_potential_collusion=true (default) to see only flagged pairs.
    Set is_potential_collusion=false to see all pairs regardless of flag.
    """
    conditions = ["cbs.shared_procedures >= ?"]
    params: list = [min_shared_procedures]

    if is_potential_collusion is not None:
        conditions.append("cbs.is_potential_collusion = ?")
        params.append(1 if is_potential_collusion else 0)

    where_clause = " AND ".join(conditions)
    order_col = "cbs.shared_procedures" if sort_by == "shared_procedures" else "cbs.co_bid_rate"

    # Count total matching rows
    count_sql = f"""
        SELECT COUNT(*)
        FROM co_bidding_stats cbs
        WHERE {where_clause}
    """
    total = conn.execute(count_sql, params).fetchone()[0]

    # Fetch page
    offset = (page - 1) * per_page
    data_sql = f"""
        SELECT
            cbs.vendor_id_a,
            cbs.vendor_id_b,
            COALESCE(va.name, 'ID ' || cbs.vendor_id_a) AS vendor_name_a,
            COALESCE(vb.name, 'ID ' || cbs.vendor_id_b) AS vendor_name_b,
            cbs.shared_procedures,
            cbs.vendor_a_procedures,
            cbs.vendor_b_procedures,
            cbs.co_bid_rate,
            cbs.is_potential_collusion
        FROM co_bidding_stats cbs
        LEFT JOIN vendors va ON cbs.vendor_id_a = va.id
        LEFT JOIN vendors vb ON cbs.vendor_id_b = vb.id
        WHERE {where_clause}
        ORDER BY {order_col} DESC
        LIMIT ? OFFSET ?
    """
    rows = conn.execute(data_sql, params + [per_page, offset]).fetchall()

    pairs = [
        CollusionPair(
            vendor_id_a=row["vendor_id_a"],
            vendor_id_b=row["vendor_id_b"],
            vendor_name_a=row["vendor_name_a"],
            vendor_name_b=row["vendor_name_b"],
            shared_procedures=row["shared_procedures"],
            vendor_a_procedures=row["vendor_a_procedures"],
            vendor_b_procedures=row["vendor_b_procedures"],
            co_bid_rate=round(float(row["co_bid_rate"]), 2),
            is_potential_collusion=bool(row["is_potential_collusion"]),
        )
        for row in rows
    ]

    total_pages = max(1, (total + per_page - 1) // per_page)

    return CollusionPairsResponse(
        data=pairs,
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get("/stats", response_model=CollusionStats, summary="Aggregate collusion statistics")
def get_collusion_stats(conn=Depends(get_db_dep)):
    """
    Return top-level aggregate statistics for the co-bidding dataset.
    """
    row = conn.execute("""
        SELECT
            COUNT(*) AS total_pairs,
            SUM(CASE WHEN is_potential_collusion = 1 THEN 1 ELSE 0 END) AS potential_collusion_count,
            COALESCE(SUM(shared_procedures), 0) AS total_shared_procedures,
            COALESCE(MAX(CASE WHEN is_potential_collusion = 1 THEN co_bid_rate ELSE 0 END), 0) AS max_co_bid_rate
        FROM co_bidding_stats
    """).fetchone()

    return CollusionStats(
        total_pairs=row["total_pairs"],
        potential_collusion_count=row["potential_collusion_count"],
        total_shared_procedures=row["total_shared_procedures"],
        max_co_bid_rate=round(float(row["max_co_bid_rate"]), 2),
    )
