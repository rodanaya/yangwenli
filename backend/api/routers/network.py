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

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE
from ..services.network_service import network_service

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
    community_id: Optional[int] = Field(None, description="Louvain community ID")
    community_size: Optional[int] = Field(None, description="Community member count")
    pagerank: Optional[float] = Field(None, description="PageRank in co-bidding network")
    cobid_clustering_coeff: Optional[float] = Field(None, description="Co-bidding clustering coefficient (Wachs et al. 2021)")
    cobid_triangle_count: Optional[int] = Field(None, description="Number of co-bidding triangles")


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
def get_network_graph(
    vendor_id: Optional[int] = Query(None, description="Center graph on this vendor"),
    institution_id: Optional[int] = Query(None, description="Center graph on this institution"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
    year: Optional[int] = Query(None, ge=2002, le=2026, description="Filter by year"),
    min_value: Optional[float] = Query(None, ge=0, description="Minimum total value for inclusion"),
    min_contracts: Optional[int] = Query(None, ge=1, description="Minimum contracts for inclusion (default: 1 for entity queries, 10 for global graph)"),
    depth: int = Query(1, ge=1, le=2, description="Depth of connections to include"),
    limit: int = Query(50, ge=10, le=200, description="Maximum nodes to return"),
):
    """
    Get network graph data for visualization.

    Returns nodes and links representing vendor-institution relationships.
    Can be centered on a specific vendor or institution, or show top connections.
    Cached for 1 hour for default queries (no specific vendor/institution).
    """
    # For entity-specific queries (vendor/institution), default to min_contracts=1 so
    # high-value vendors with few contracts per institution still show their connections.
    # For the global graph, use 10 to keep the graph manageable.
    resolved_min_contracts = min_contracts if min_contracts is not None else (1 if vendor_id or institution_id else 10)

    # Cache default queries (no specific vendor/institution focus)
    cache_key = None
    if not vendor_id and not institution_id:
        cache_key = f"graph:{sector_id}:{year}:{min_value}:{resolved_min_contracts}:{depth}:{limit}"
        cached = _network_cache.get(cache_key)
        if cached is not None:
            return cached

    with get_db() as conn:
        data = network_service.get_network_graph(
            conn,
            vendor_id=vendor_id,
            institution_id=institution_id,
            sector_id=sector_id,
            year=year,
            min_value=min_value,
            min_contracts=resolved_min_contracts,
            depth=depth,
            limit=limit,
        )

        # Enrich vendor nodes with graph features (community_id, pagerank) if available
        vendor_ids = [
            int(n["id"][2:]) for n in data["nodes"] if n["id"].startswith("v-")
        ]
        if vendor_ids:
            try:
                cursor = conn.cursor()
                placeholders = ",".join("?" * len(vendor_ids))
                cursor.execute(
                    f"""
                    SELECT vgf.vendor_id, vgf.community_id, vgf.community_size, vgf.pagerank,
                           v.cobid_clustering_coeff, v.cobid_triangle_count
                    FROM vendor_graph_features vgf
                    JOIN vendors v ON vgf.vendor_id = v.id
                    WHERE vgf.vendor_id IN ({placeholders})
                    """,
                    vendor_ids,
                )
                gf = {row["vendor_id"]: dict(row) for row in cursor.fetchall()}
                for node in data["nodes"]:
                    if node["id"].startswith("v-"):
                        vid = int(node["id"][2:])
                        if vid in gf:
                            node["community_id"] = gf[vid]["community_id"]
                            node["community_size"] = gf[vid]["community_size"]
                            node["pagerank"] = round(gf[vid]["pagerank"], 6)
                            if gf[vid]["cobid_clustering_coeff"] is not None:
                                node["cobid_clustering_coeff"] = round(gf[vid]["cobid_clustering_coeff"], 6)
                                node["cobid_triangle_count"] = gf[vid]["cobid_triangle_count"]
            except Exception:
                pass  # graph features not built yet — degrade gracefully

    if not data["nodes"] and vendor_id:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found or has no connections")
    if not data["nodes"] and institution_id:
        raise HTTPException(status_code=404, detail=f"Institution {institution_id} not found or has no connections")

    result = NetworkGraphResponse(
        nodes=[NetworkNode(**n) for n in data["nodes"]],
        links=[NetworkLink(**lk) for lk in data["links"]],
        total_nodes=data["total_nodes"],
        total_links=data["total_links"],
        total_value=data["total_value"],
    )
    if cache_key:
        _network_cache.set(cache_key, result, ttl=3600)
    return result


@router.get("/co-bidders/{vendor_id}", response_model=CoBiddersResponse)
def get_co_bidders(
    vendor_id: int = Path(..., description="Vendor ID to analyze"),
    min_procedures: int = Query(3, ge=1, description="Minimum shared procedures"),
    limit: int = Query(20, ge=1, le=100, description="Maximum co-bidders to return"),
):
    """
    Get vendors that frequently co-bid with this vendor.

    Analyzes procedure participation to identify vendors that often bid in the
    same tenders. Detects potential collusion patterns like bid rotation.
    """
    with get_db() as conn:
        data = network_service.get_co_bidders(
            conn,
            vendor_id,
            min_procedures=min_procedures,
            limit=limit,
        )

    if data is None:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

    return CoBiddersResponse(
        vendor_id=data["vendor_id"],
        vendor_name=data["vendor_name"],
        co_bidders=[CoBidderItem(**cb) for cb in data["co_bidders"]],
        total_procedures=data["total_procedures"],
        suspicious_patterns=data["suspicious_patterns"],
    )


@router.get("/institution-vendors/{institution_id}", response_model=InstitutionNetworkResponse)
def get_institution_vendors(
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
            conditions = ["c.institution_id = ?", "COALESCE(c.amount_mxn, 0) <= ?"]
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
def get_related_vendors(
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
                        AND COALESCE(c.amount_mxn, 0) <= ?
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
                        AND COALESCE(c.amount_mxn, 0) <= ?
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
                        AND COALESCE(c.amount_mxn, 0) <= ?
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


# =============================================================================
# Communities — Louvain co-bidding clusters
# =============================================================================

class CommunityVendorItem(BaseModel):
    vendor_id: int
    vendor_name: str
    pagerank: float
    degree: int
    avg_risk: float
    contracts: int
    total_value: float


class CommunityItem(BaseModel):
    community_id: int
    size: int
    avg_risk: float
    sector_count: int
    top_vendors: List[CommunityVendorItem]


class CommunitiesResponse(BaseModel):
    communities: List[CommunityItem]
    total_communities: int
    graph_ready: bool


@router.get("/communities", response_model=CommunitiesResponse)
def get_communities(
    min_size: int = Query(3, ge=2, description="Minimum community size"),
    min_avg_risk: float = Query(0.0, ge=0, le=1, description="Minimum average risk score"),
    sector_id: Optional[int] = Query(None, ge=1, le=12, description="Filter by sector"),
    limit: int = Query(50, ge=1, le=200, description="Max communities to return"),
):
    """
    Get co-bidding communities detected by Louvain algorithm.

    Returns communities sorted by average risk (highest first).
    Requires build_vendor_graph.py to have been run.
    If graph is not yet built, returns graph_ready=false with empty list.
    """
    cache_key = f"communities:{min_size}:{min_avg_risk}:{sector_id}:{limit}"
    cached = _network_cache.get(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        data = network_service.get_communities(
            conn,
            min_size=min_size,
            min_avg_risk=min_avg_risk,
            sector_id=sector_id,
            limit=limit,
        )

    result = CommunitiesResponse(
        communities=[
            CommunityItem(
                community_id=c["community_id"],
                size=c["size"],
                avg_risk=c["avg_risk"],
                sector_count=c["sector_count"],
                top_vendors=[CommunityVendorItem(**v) for v in c["top_vendors"]],
            )
            for c in data["communities"]
        ],
        total_communities=data["total_communities"],
        graph_ready=data["graph_ready"],
    )

    _network_cache.set(cache_key, result, ttl=3600)
    return result
