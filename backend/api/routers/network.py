"""
API router for network graph and relationship analysis endpoints.

Provides vendor connection graphs, co-bidding analysis, and institution-vendor networks.
"""

import sqlite3
import logging
import threading
import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field
from collections import defaultdict

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE

logger = logging.getLogger(__name__)


# Thread-safe cache for expensive network queries
class _NetworkCache:
    def __init__(self):
        self._lock = threading.Lock()
        self._store: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}

    def get(self, key: str):
        with self._lock:
            if key in self._store and time.time() < self._expiry.get(key, 0):
                return self._store[key]
            return None

    def set(self, key: str, value: Any, ttl: int = 3600):
        with self._lock:
            self._store[key] = value
            self._expiry[key] = time.time() + ttl

_network_cache = _NetworkCache()

router = APIRouter(prefix="/network", tags=["network"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class NetworkNode(BaseModel):
    """A node in the network graph."""
    id: str = Field(..., description="Unique node ID (prefixed with v- or i-)")
    type: str = Field(..., description="Node type: vendor or institution")
    name: str = Field(..., description="Display name")
    value: float = Field(default=0, description="Total contract value")
    contracts: int = Field(default=0, description="Number of contracts")
    risk_score: Optional[float] = Field(None, description="Average risk score")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class NetworkLink(BaseModel):
    """A link between nodes in the network."""
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    value: float = Field(..., description="Total contract value for this link")
    contracts: int = Field(..., description="Number of contracts")
    avg_risk: Optional[float] = Field(None, description="Average risk score")
    relationship: str = Field(default="contracts", description="Relationship type")


class NetworkGraphResponse(BaseModel):
    """Network graph data for visualization."""
    nodes: List[NetworkNode] = Field(..., description="Graph nodes")
    links: List[NetworkLink] = Field(..., description="Graph edges")
    total_nodes: int = Field(..., description="Total number of nodes")
    total_links: int = Field(..., description="Total number of links")
    total_value: float = Field(..., description="Total value of all contracts in graph")


class CoBidderItem(BaseModel):
    """A vendor that co-bids with the target vendor."""
    vendor_id: int
    vendor_name: str
    co_bid_count: int = Field(..., description="Number of procedures where both bid")
    win_count: int = Field(..., description="Times this vendor won when both bid")
    loss_count: int = Field(..., description="Times target vendor won when both bid")
    same_winner_ratio: float = Field(..., description="Ratio of wins when both bid")
    relationship_strength: str = Field(..., description="weak, moderate, strong, very_strong")


class CoBiddersResponse(BaseModel):
    """Co-bidding analysis for a vendor."""
    vendor_id: int
    vendor_name: str
    co_bidders: List[CoBidderItem]
    total_procedures: int = Field(..., description="Total procedures vendor participated in")
    suspicious_patterns: List[Dict[str, Any]] = Field(default=[], description="Detected patterns")


class InstitutionVendorItem(BaseModel):
    """A vendor connected to an institution."""
    vendor_id: int
    vendor_name: str
    contract_count: int
    total_value: float
    avg_risk_score: Optional[float]
    direct_award_count: int
    direct_award_pct: float
    first_year: Optional[int]
    last_year: Optional[int]


class InstitutionNetworkResponse(BaseModel):
    """Institution-vendor network data."""
    institution_id: int
    institution_name: str
    institution_type: Optional[str]
    vendors: List[InstitutionVendorItem]
    total_vendors: int
    total_contracts: int
    total_value: float
    concentration_index: float = Field(..., description="HHI-style concentration (0-1)")


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/graph", response_model=NetworkGraphResponse)
async def get_network_graph(
    vendor_id: Optional[int] = Query(None, description="Center graph on this vendor"),
    institution_id: Optional[int] = Query(None, description="Center graph on this institution"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
    min_value: Optional[float] = Query(None, ge=0, description="Minimum total value for inclusion"),
    min_contracts: Optional[int] = Query(10, ge=1, description="Minimum contracts for inclusion"),
    depth: int = Query(1, ge=1, le=2, description="Depth of connections to include"),
    limit: int = Query(50, ge=10, le=200, description="Maximum nodes to return"),
):
    """
    Get network graph data for visualization.

    Returns nodes and links representing vendor-institution relationships.
    Can be centered on a specific vendor or institution, or show top connections.
    Cached for 1 hour for default queries (no specific vendor/institution).
    """
    # Cache default queries (no specific vendor/institution focus)
    cache_key = None
    if not vendor_id and not institution_id:
        cache_key = f"graph:{sector_id}:{year}:{min_value}:{min_contracts}:{depth}:{limit}"
        cached = _network_cache.get(cache_key)
        if cached is not None:
            return cached

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            nodes = {}
            links = []

            # Build query conditions
            conditions = ["(c.amount_mxn IS NULL OR c.amount_mxn <= ?)"]
            params = [MAX_CONTRACT_VALUE]

            if sector_id:
                conditions.append("c.sector_id = ?")
                params.append(sector_id)

            if year:
                conditions.append("c.contract_year = ?")
                params.append(year)

            where_clause = " AND ".join(conditions)

            if vendor_id:
                # Center on specific vendor - get their institution connections
                cursor.execute(f"""
                    SELECT
                        v.id as vendor_id, v.name as vendor_name,
                        i.id as institution_id, i.name as institution_name,
                        i.institution_type,
                        COUNT(c.id) as contract_count,
                        COALESCE(SUM(c.amount_mxn), 0) as total_value,
                        COALESCE(AVG(c.risk_score), 0) as avg_risk
                    FROM contracts c
                    JOIN vendors v ON c.vendor_id = v.id
                    JOIN institutions i ON c.institution_id = i.id
                    WHERE c.vendor_id = ? AND {where_clause}
                    GROUP BY v.id, v.name, i.id, i.name, i.institution_type
                    HAVING contract_count >= ?
                    ORDER BY total_value DESC
                    LIMIT ?
                """, (vendor_id, *params, min_contracts, limit))

                rows = cursor.fetchall()
                if not rows:
                    raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found or has no connections")

                # Add the central vendor node
                vendor_name = rows[0]["vendor_name"]
                nodes[f"v-{vendor_id}"] = NetworkNode(
                    id=f"v-{vendor_id}",
                    type="vendor",
                    name=vendor_name,
                    value=sum(r["total_value"] for r in rows),
                    contracts=sum(r["contract_count"] for r in rows),
                    risk_score=sum(r["avg_risk"] * r["contract_count"] for r in rows) / max(1, sum(r["contract_count"] for r in rows))
                )

                # Add institution nodes and links
                for row in rows:
                    inst_id = f"i-{row['institution_id']}"
                    if inst_id not in nodes:
                        nodes[inst_id] = NetworkNode(
                            id=inst_id,
                            type="institution",
                            name=row["institution_name"],
                            value=row["total_value"],
                            contracts=row["contract_count"],
                            metadata={"institution_type": row["institution_type"]}
                        )

                    links.append(NetworkLink(
                        source=f"v-{vendor_id}",
                        target=inst_id,
                        value=row["total_value"],
                        contracts=row["contract_count"],
                        avg_risk=round(row["avg_risk"], 4) if row["avg_risk"] else None
                    ))

                # If depth > 1, get other vendors connected to these institutions
                if depth > 1 and len(links) > 0:
                    inst_ids = [l.target.replace("i-", "") for l in links]
                    placeholders = ",".join("?" * len(inst_ids))

                    cursor.execute(f"""
                        SELECT
                            v.id as vendor_id, v.name as vendor_name,
                            COUNT(c.id) as contract_count,
                            COALESCE(SUM(c.amount_mxn), 0) as total_value,
                            COALESCE(AVG(c.risk_score), 0) as avg_risk,
                            c.institution_id
                        FROM contracts c
                        JOIN vendors v ON c.vendor_id = v.id
                        WHERE c.institution_id IN ({placeholders})
                        AND c.vendor_id != ?
                        AND {where_clause}
                        GROUP BY v.id, v.name, c.institution_id
                        HAVING contract_count >= ?
                        ORDER BY total_value DESC
                        LIMIT ?
                    """, (*inst_ids, vendor_id, *params, max(1, min_contracts // 2), limit - len(nodes)))

                    for row in cursor.fetchall():
                        vid = f"v-{row['vendor_id']}"
                        if vid not in nodes:
                            nodes[vid] = NetworkNode(
                                id=vid,
                                type="vendor",
                                name=row["vendor_name"],
                                value=row["total_value"],
                                contracts=row["contract_count"],
                                risk_score=round(row["avg_risk"], 4) if row["avg_risk"] else None
                            )

                        links.append(NetworkLink(
                            source=vid,
                            target=f"i-{row['institution_id']}",
                            value=row["total_value"],
                            contracts=row["contract_count"],
                            avg_risk=round(row["avg_risk"], 4) if row["avg_risk"] else None
                        ))

            elif institution_id:
                # Center on specific institution - get their vendor connections
                cursor.execute(f"""
                    SELECT
                        i.id as institution_id, i.name as institution_name,
                        i.institution_type,
                        v.id as vendor_id, v.name as vendor_name,
                        COUNT(c.id) as contract_count,
                        COALESCE(SUM(c.amount_mxn), 0) as total_value,
                        COALESCE(AVG(c.risk_score), 0) as avg_risk
                    FROM contracts c
                    JOIN institutions i ON c.institution_id = i.id
                    JOIN vendors v ON c.vendor_id = v.id
                    WHERE c.institution_id = ? AND {where_clause}
                    GROUP BY i.id, i.name, i.institution_type, v.id, v.name
                    HAVING contract_count >= ?
                    ORDER BY total_value DESC
                    LIMIT ?
                """, (institution_id, *params, min_contracts, limit))

                rows = cursor.fetchall()
                if not rows:
                    raise HTTPException(status_code=404, detail=f"Institution {institution_id} not found or has no connections")

                # Add central institution node
                nodes[f"i-{institution_id}"] = NetworkNode(
                    id=f"i-{institution_id}",
                    type="institution",
                    name=rows[0]["institution_name"],
                    value=sum(r["total_value"] for r in rows),
                    contracts=sum(r["contract_count"] for r in rows),
                    metadata={"institution_type": rows[0]["institution_type"]}
                )

                # Add vendor nodes and links
                for row in rows:
                    vid = f"v-{row['vendor_id']}"
                    if vid not in nodes:
                        nodes[vid] = NetworkNode(
                            id=vid,
                            type="vendor",
                            name=row["vendor_name"],
                            value=row["total_value"],
                            contracts=row["contract_count"],
                            risk_score=round(row["avg_risk"], 4) if row["avg_risk"] else None
                        )

                    links.append(NetworkLink(
                        source=f"i-{institution_id}",
                        target=vid,
                        value=row["total_value"],
                        contracts=row["contract_count"],
                        avg_risk=round(row["avg_risk"], 4) if row["avg_risk"] else None
                    ))

            else:
                # No specific focus - get top vendor-institution connections
                cursor.execute(f"""
                    SELECT
                        v.id as vendor_id, v.name as vendor_name,
                        i.id as institution_id, i.name as institution_name,
                        COUNT(c.id) as contract_count,
                        COALESCE(SUM(c.amount_mxn), 0) as total_value,
                        COALESCE(AVG(c.risk_score), 0) as avg_risk
                    FROM contracts c
                    JOIN vendors v ON c.vendor_id = v.id
                    JOIN institutions i ON c.institution_id = i.id
                    WHERE {where_clause}
                    GROUP BY v.id, v.name, i.id, i.name
                    HAVING contract_count >= ? AND total_value >= ?
                    ORDER BY total_value DESC
                    LIMIT ?
                """, (*params, min_contracts, min_value or 0, limit * 2))

                for row in cursor.fetchall():
                    vid = f"v-{row['vendor_id']}"
                    iid = f"i-{row['institution_id']}"

                    if vid not in nodes:
                        nodes[vid] = NetworkNode(
                            id=vid,
                            type="vendor",
                            name=row["vendor_name"],
                            value=row["total_value"],
                            contracts=row["contract_count"],
                            risk_score=round(row["avg_risk"], 4) if row["avg_risk"] else None
                        )

                    if iid not in nodes:
                        nodes[iid] = NetworkNode(
                            id=iid,
                            type="institution",
                            name=row["institution_name"],
                            value=row["total_value"],
                            contracts=row["contract_count"]
                        )

                    links.append(NetworkLink(
                        source=vid,
                        target=iid,
                        value=row["total_value"],
                        contracts=row["contract_count"],
                        avg_risk=round(row["avg_risk"], 4) if row["avg_risk"] else None
                    ))

                    if len(nodes) >= limit:
                        break

            result = NetworkGraphResponse(
                nodes=list(nodes.values())[:limit],
                links=links,
                total_nodes=len(nodes),
                total_links=len(links),
                total_value=sum(n.value for n in nodes.values())
            )
            if cache_key:
                _network_cache.set(cache_key, result, ttl=3600)  # Cache 1 hour
            return result

    except sqlite3.Error as e:
        logger.error(f"Database error in get_network_graph: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/co-bidders/{vendor_id}", response_model=CoBiddersResponse)
async def get_co_bidders(
    vendor_id: int = Path(..., description="Vendor ID to analyze"),
    min_procedures: int = Query(3, ge=1, description="Minimum shared procedures"),
    limit: int = Query(20, ge=1, le=100, description="Maximum co-bidders to return"),
):
    """
    Get vendors that frequently co-bid with this vendor.

    Analyzes procedure participation to identify vendors that often bid in the
    same tenders. Detects potential collusion patterns like bid rotation.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Verify vendor exists
            cursor.execute("SELECT name FROM vendors WHERE id = ?", (vendor_id,))
            vendor = cursor.fetchone()
            if not vendor:
                raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

            # Get total procedures for this vendor
            cursor.execute("""
                SELECT COUNT(DISTINCT procedure_number)
                FROM contracts
                WHERE vendor_id = ?
                AND procedure_number IS NOT NULL
                AND procedure_number != ''
            """, (vendor_id,))
            total_procedures = cursor.fetchone()[0] or 0

            # Find co-bidders through shared procedure numbers
            cursor.execute("""
                WITH target_procedures AS (
                    SELECT DISTINCT procedure_number
                    FROM contracts
                    WHERE vendor_id = ?
                    AND procedure_number IS NOT NULL
                    AND procedure_number != ''
                ),
                co_bids AS (
                    SELECT
                        c.vendor_id as co_vendor_id,
                        v.name as co_vendor_name,
                        c.procedure_number,
                        c.vendor_id = (
                            SELECT vendor_id FROM contracts c2
                            WHERE c2.procedure_number = c.procedure_number
                            ORDER BY c2.amount_mxn DESC LIMIT 1
                        ) as is_winner
                    FROM contracts c
                    JOIN vendors v ON c.vendor_id = v.id
                    WHERE c.procedure_number IN (SELECT procedure_number FROM target_procedures)
                    AND c.vendor_id != ?
                )
                SELECT
                    co_vendor_id,
                    co_vendor_name,
                    COUNT(DISTINCT procedure_number) as co_bid_count,
                    SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) as win_count
                FROM co_bids
                GROUP BY co_vendor_id, co_vendor_name
                HAVING co_bid_count >= ?
                ORDER BY co_bid_count DESC
                LIMIT ?
            """, (vendor_id, vendor_id, min_procedures, limit))

            co_bidders = []
            for row in cursor.fetchall():
                co_bid_count = row["co_bid_count"]
                win_count = row["win_count"]
                loss_count = co_bid_count - win_count

                # Calculate same winner ratio (how often this co-bidder wins)
                same_winner_ratio = win_count / co_bid_count if co_bid_count > 0 else 0

                # Determine relationship strength
                if co_bid_count >= 20:
                    strength = "very_strong"
                elif co_bid_count >= 10:
                    strength = "strong"
                elif co_bid_count >= 5:
                    strength = "moderate"
                else:
                    strength = "weak"

                co_bidders.append(CoBidderItem(
                    vendor_id=row["co_vendor_id"],
                    vendor_name=row["co_vendor_name"],
                    co_bid_count=co_bid_count,
                    win_count=win_count,
                    loss_count=loss_count,
                    same_winner_ratio=round(same_winner_ratio, 3),
                    relationship_strength=strength
                ))

            # Detect suspicious patterns
            suspicious_patterns = []

            # Pattern 1: Vendors that always lose when co-bidding (cover bidders)
            potential_covers = [cb for cb in co_bidders if cb.co_bid_count >= 5 and cb.same_winner_ratio < 0.1]
            if potential_covers:
                suspicious_patterns.append({
                    "pattern": "potential_cover_bidding",
                    "description": f"{len(potential_covers)} vendors win <10% when bidding against target",
                    "vendors": [{"id": v.vendor_id, "name": v.vendor_name, "win_rate": v.same_winner_ratio} for v in potential_covers[:3]]
                })

            # Pattern 2: Bid rotation (alternating winners)
            high_frequency = [cb for cb in co_bidders if cb.co_bid_count >= 10 and 0.4 < cb.same_winner_ratio < 0.6]
            if len(high_frequency) >= 2:
                suspicious_patterns.append({
                    "pattern": "potential_bid_rotation",
                    "description": f"{len(high_frequency)} vendors with ~50% win rate in frequent co-bids",
                    "vendors": [{"id": v.vendor_id, "name": v.vendor_name, "co_bids": v.co_bid_count} for v in high_frequency[:3]]
                })

            return CoBiddersResponse(
                vendor_id=vendor_id,
                vendor_name=vendor["name"],
                co_bidders=co_bidders,
                total_procedures=total_procedures,
                suspicious_patterns=suspicious_patterns
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_co_bidders: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/institution-vendors/{institution_id}", response_model=InstitutionNetworkResponse)
async def get_institution_vendors(
    institution_id: int = Path(..., description="Institution ID"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
    min_contracts: int = Query(1, ge=1, description="Minimum contracts"),
    limit: int = Query(50, ge=1, le=200, description="Maximum vendors"),
):
    """
    Get vendors connected to an institution.

    Returns vendors ranked by contract value with concentration analysis.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get institution info
            cursor.execute("""
                SELECT id, name, institution_type
                FROM institutions
                WHERE id = ?
            """, (institution_id,))
            inst = cursor.fetchone()
            if not inst:
                raise HTTPException(status_code=404, detail=f"Institution {institution_id} not found")

            # Build conditions
            conditions = ["c.institution_id = ?", "(c.amount_mxn IS NULL OR c.amount_mxn <= ?)"]
            params = [institution_id, MAX_CONTRACT_VALUE]

            if year:
                conditions.append("c.contract_year = ?")
                params.append(year)

            where_clause = " AND ".join(conditions)

            # Get vendor connections
            cursor.execute(f"""
                SELECT
                    v.id as vendor_id,
                    v.name as vendor_name,
                    COUNT(c.id) as contract_count,
                    COALESCE(SUM(c.amount_mxn), 0) as total_value,
                    COALESCE(AVG(c.risk_score), 0) as avg_risk,
                    SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
                    MIN(c.contract_year) as first_year,
                    MAX(c.contract_year) as last_year
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                WHERE {where_clause}
                GROUP BY v.id, v.name
                HAVING contract_count >= ?
                ORDER BY total_value DESC
                LIMIT ?
            """, (*params, min_contracts, limit))

            vendors = []
            total_value = 0
            total_contracts = 0
            value_squares = 0

            for row in cursor.fetchall():
                value = row["total_value"] or 0
                contracts = row["contract_count"]
                da_count = row["direct_award_count"] or 0

                vendors.append(InstitutionVendorItem(
                    vendor_id=row["vendor_id"],
                    vendor_name=row["vendor_name"],
                    contract_count=contracts,
                    total_value=value,
                    avg_risk_score=round(row["avg_risk"], 4) if row["avg_risk"] else None,
                    direct_award_count=da_count,
                    direct_award_pct=round(da_count / contracts * 100, 1) if contracts > 0 else 0,
                    first_year=row["first_year"],
                    last_year=row["last_year"]
                ))

                total_value += value
                total_contracts += contracts

            # Calculate HHI-style concentration index
            concentration_index = 0.0
            if total_value > 0:
                for v in vendors:
                    share = v.total_value / total_value
                    concentration_index += share ** 2
                concentration_index = round(concentration_index, 4)

            return InstitutionNetworkResponse(
                institution_id=inst["id"],
                institution_name=inst["name"],
                institution_type=inst["institution_type"],
                vendors=vendors,
                total_vendors=len(vendors),
                total_contracts=total_contracts,
                total_value=total_value,
                concentration_index=concentration_index
            )

    except sqlite3.Error as e:
        logger.error(f"Database error in get_institution_vendors: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/related-vendors/{vendor_id}")
async def get_related_vendors(
    vendor_id: int = Path(..., description="Vendor ID"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
):
    """
    Get vendors related through groups, RFC, or name similarity.

    Identifies potential shell companies and corporate relationships.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check if vendor exists and get basic info
            cursor.execute("""
                SELECT id, name, rfc, group_id, name_normalized, phonetic_code
                FROM vendors WHERE id = ?
            """, (vendor_id,))
            vendor = cursor.fetchone()
            if not vendor:
                raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

            related = []

            # 1. Same vendor group
            if vendor["group_id"]:
                cursor.execute("""
                    SELECT
                        v.id, v.name, v.rfc,
                        'same_group' as relationship,
                        1.0 as confidence,
                        COUNT(c.id) as contracts,
                        COALESCE(SUM(c.amount_mxn), 0) as value
                    FROM vendors v
                    LEFT JOIN contracts c ON v.id = c.vendor_id
                        AND (c.amount_mxn IS NULL OR c.amount_mxn <= ?)
                    WHERE v.group_id = ? AND v.id != ?
                    GROUP BY v.id, v.name, v.rfc
                    LIMIT ?
                """, (MAX_CONTRACT_VALUE, vendor["group_id"], vendor_id, limit))
                for row in cursor.fetchall():
                    related.append({
                        "vendor_id": row["id"],
                        "vendor_name": row["name"],
                        "rfc": row["rfc"],
                        "relationship": row["relationship"],
                        "confidence": row["confidence"],
                        "contracts": row["contracts"],
                        "value": row["value"]
                    })

            # 2. Shared RFC root
            if vendor["rfc"] and len(vendor["rfc"]) >= 10:
                rfc_root = vendor["rfc"][:10]
                cursor.execute("""
                    SELECT
                        v.id, v.name, v.rfc,
                        'shared_rfc' as relationship,
                        0.9 as confidence,
                        COUNT(c.id) as contracts,
                        COALESCE(SUM(c.amount_mxn), 0) as value
                    FROM vendors v
                    LEFT JOIN contracts c ON v.id = c.vendor_id
                        AND (c.amount_mxn IS NULL OR c.amount_mxn <= ?)
                    WHERE v.rfc LIKE ? AND v.id != ?
                    AND v.id NOT IN (SELECT id FROM vendors WHERE group_id = ?)
                    GROUP BY v.id, v.name, v.rfc
                    LIMIT ?
                """, (MAX_CONTRACT_VALUE, f"{rfc_root}%", vendor_id,
                      vendor["group_id"] or -1, limit - len(related)))
                for row in cursor.fetchall():
                    if not any(r["vendor_id"] == row["id"] for r in related):
                        related.append({
                            "vendor_id": row["id"],
                            "vendor_name": row["name"],
                            "rfc": row["rfc"],
                            "relationship": row["relationship"],
                            "confidence": row["confidence"],
                            "contracts": row["contracts"],
                            "value": row["value"]
                        })

            # 3. Same phonetic code (fuzzy name match)
            if vendor["phonetic_code"] and len(related) < limit:
                cursor.execute("""
                    SELECT
                        v.id, v.name, v.rfc,
                        'similar_name' as relationship,
                        0.7 as confidence,
                        COUNT(c.id) as contracts,
                        COALESCE(SUM(c.amount_mxn), 0) as value
                    FROM vendors v
                    LEFT JOIN contracts c ON v.id = c.vendor_id
                        AND (c.amount_mxn IS NULL OR c.amount_mxn <= ?)
                    WHERE v.phonetic_code = ? AND v.id != ?
                    GROUP BY v.id, v.name, v.rfc
                    LIMIT ?
                """, (MAX_CONTRACT_VALUE, vendor["phonetic_code"], vendor_id, limit - len(related)))
                for row in cursor.fetchall():
                    if not any(r["vendor_id"] == row["id"] for r in related):
                        related.append({
                            "vendor_id": row["id"],
                            "vendor_name": row["name"],
                            "rfc": row["rfc"],
                            "relationship": row["relationship"],
                            "confidence": row["confidence"],
                            "contracts": row["contracts"],
                            "value": row["value"]
                        })

            return {
                "vendor_id": vendor_id,
                "vendor_name": vendor["name"],
                "related": related[:limit],
                "total": len(related)
            }

    except sqlite3.Error as e:
        logger.error(f"Database error in get_related_vendors: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")
