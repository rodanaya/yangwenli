"""
API router for network graph and relationship analysis endpoints.

Provides vendor connection graphs, co-bidding analysis, and institution-vendor networks.
"""

import json
import sqlite3
import logging
import threading
import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path, Request
from pydantic import BaseModel, Field

from ..dependencies import get_db
from ..config.constants import MAX_CONTRACT_VALUE
from ..services.network_service import network_service

logger = logging.getLogger(__name__)

# Optional rate limiting - gracefully degrade if slowapi not installed
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    _network_limiter = Limiter(key_func=get_remote_address)
    _NETWORK_RATE_LIMITING = True
except ImportError:
    _network_limiter = None
    _NETWORK_RATE_LIMITING = False


def _rate_limit(limit_string: str):
    """Rate limit decorator that degrades gracefully if slowapi is missing."""
    if _NETWORK_RATE_LIMITING and _network_limiter:
        return _network_limiter.limit(limit_string)
    return lambda f: f


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

# Mutex preventing 6 Gunicorn workers from computing communities simultaneously.
# Same double-checked-locking + precomputed_stats pattern as aria.py / intersection.py.
_communities_compute_lock = threading.Lock()
_COMMUNITIES_DB_KEY = "communities_default"  # key for default-param call

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
    is_sanctioned: bool = Field(False, description="True if vendor appears in SFP sanctions registry")


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
        # F3 audit fix: large vendors (e.g. GRUFESA, 6,303 contracts) caused
        # the service to time out / return 502. Wrap in try/except so the
        # NetworkGraphModal degrades gracefully to empty state instead of
        # silently hanging on "loading…" forever.
        try:
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
        except Exception:
            data = {"nodes": [], "links": [], "stats": {"node_count": 0, "link_count": 0}}

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

        # Enrich vendor nodes with SFP sanction status
        if vendor_ids:
            try:
                cursor = conn.cursor()
                placeholders = ",".join("?" * len(vendor_ids))
                # Match by RFC (exact) or normalised name (uppercase token match)
                cursor.execute(
                    f"""
                    SELECT DISTINCT v.id AS vendor_id
                    FROM vendors v
                    JOIN sfp_sanctions sfp ON (
                        (v.rfc IS NOT NULL AND v.rfc != '' AND v.rfc = sfp.rfc)
                        OR UPPER(TRIM(v.name)) = UPPER(TRIM(sfp.company_name))
                    )
                    WHERE v.id IN ({placeholders})
                    """,
                    vendor_ids,
                )
                sanctioned_ids = {row["vendor_id"] for row in cursor.fetchall()}
                for node in data["nodes"]:
                    if node["id"].startswith("v-"):
                        vid = int(node["id"][2:])
                        if vid in sanctioned_ids:
                            node["is_sanctioned"] = True
            except Exception:
                pass  # sfp_sanctions table absent — degrade gracefully

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
                    AND v.id NOT IN (SELECT id FROM vendors WHERE group_id = ? AND id IS NOT NULL)
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


class PatternVendorItem(BaseModel):
    vendor_id: int
    vendor_name: str
    ips_final: float
    total_value_mxn: Optional[float]
    avg_risk_score: Optional[float]
    primary_sector_name: Optional[str]
    total_contracts: Optional[int]


class PatternSpotlight(BaseModel):
    code: str
    vendor_count: int
    t1_count: int
    t2_count: int
    avg_ips: float
    gt_case_count: int
    total_value_mxn: Optional[float]
    avg_da_rate: Optional[float]
    avg_sb_rate: Optional[float]
    top_vendors: List[PatternVendorItem]


class PatternSpotlightResponse(BaseModel):
    patterns: List[PatternSpotlight]


@router.get("/pattern-spotlight", response_model=PatternSpotlightResponse)
def get_pattern_spotlight():
    """
    ARIA pattern spotlight — top T1/T2 vendors per primary corruption pattern (P1-P7).
    Used by CorruptionClusters and RedesKnownDossier pages for real investigative data.
    """
    cached = _network_cache.get("pattern_spotlight")
    if cached is not None:
        return cached

    # GT case type → ARIA pattern mapping
    GT_MAP = {
        "P1": ("monopoly", "concentrated_monopoly"),
        "P2": ("ghost_company",),
        "P3": ("intermediary", "single_bid_capture"),
        "P4": ("bid_rigging",),
        "P5": ("overpricing",),
        "P6": ("institutional_capture",),
        "P7": ("conflict_of_interest", "bribery", "procurement_fraud"),
    }

    with get_db() as conn:
        cursor = conn.cursor()

        # Check aria_queue exists
        tbl = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='aria_queue'"
        ).fetchone()
        if not tbl:
            return PatternSpotlightResponse(patterns=[])

        patterns_out = []
        for code in ("P1", "P2", "P3", "P4", "P5", "P6", "P7"):
            # Aggregate stats for this pattern
            agg = cursor.execute("""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN ips_tier = 1 THEN 1 ELSE 0 END) as t1,
                       SUM(CASE WHEN ips_tier = 2 THEN 1 ELSE 0 END) as t2,
                       AVG(ips_final) as avg_ips,
                       SUM(total_value_mxn) as total_value,
                       AVG(direct_award_rate) as avg_da,
                       AVG(single_bid_rate) as avg_sb
                FROM aria_queue
                WHERE primary_pattern = ?
            """, (code,)).fetchone()

            # GT count for this pattern
            types = GT_MAP.get(code, ())
            if types:
                placeholders = ",".join("?" * len(types))
                gt_count = cursor.execute(
                    f"SELECT COUNT(*) FROM ground_truth_cases WHERE case_type IN ({placeholders})",
                    list(types)
                ).fetchone()[0]
            else:
                gt_count = 0

            # Top 5 T1 vendors for this pattern
            top_rows = cursor.execute("""
                SELECT aq.vendor_id, aq.vendor_name, aq.ips_final,
                       aq.total_value_mxn, aq.avg_risk_score,
                       aq.primary_sector_name, aq.total_contracts
                FROM aria_queue aq
                WHERE aq.primary_pattern = ? AND aq.ips_tier <= 2
                ORDER BY aq.ips_final DESC
                LIMIT 5
            """, (code,)).fetchall()

            patterns_out.append(PatternSpotlight(
                code=code,
                vendor_count=agg["total"] or 0,
                t1_count=agg["t1"] or 0,
                t2_count=agg["t2"] or 0,
                avg_ips=round(float(agg["avg_ips"] or 0), 3),
                gt_case_count=gt_count,
                total_value_mxn=float(agg["total_value"]) if agg["total_value"] else None,
                avg_da_rate=round(float(agg["avg_da"]), 3) if agg["avg_da"] is not None else None,
                avg_sb_rate=round(float(agg["avg_sb"]), 3) if agg["avg_sb"] is not None else None,
                top_vendors=[
                    PatternVendorItem(
                        vendor_id=r["vendor_id"],
                        vendor_name=r["vendor_name"] or f"ID {r['vendor_id']}",
                        ips_final=round(float(r["ips_final"]), 3),
                        total_value_mxn=r["total_value_mxn"],
                        avg_risk_score=r["avg_risk_score"],
                        primary_sector_name=r["primary_sector_name"],
                        total_contracts=r["total_contracts"],
                    )
                    for r in top_rows
                ],
            ))

    result = PatternSpotlightResponse(patterns=patterns_out)
    _network_cache.set("pattern_spotlight", result, ttl=7200)
    return result


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
@_rate_limit("20/minute")
def get_communities(
    request: Request,
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
    is_default = (min_size == 3 and min_avg_risk == 0.0 and sector_id is None and limit == 50)

    cached = _network_cache.get(cache_key)
    if cached is not None:
        return cached

    # Persistent fallback for default params — survives container restarts
    if is_default:
        try:
            with get_db() as pconn:
                row = pconn.execute(
                    "SELECT stat_value FROM precomputed_stats WHERE stat_key = ?",
                    (_COMMUNITIES_DB_KEY,),
                ).fetchone()
            if row and row["stat_value"]:
                persisted = CommunitiesResponse(**json.loads(row["stat_value"]))
                _network_cache.set(cache_key, persisted, ttl=3600)
                return persisted
        except Exception:
            pass

    # Compute under mutex to prevent 6 workers computing simultaneously
    if is_default:
        with _communities_compute_lock:
            cached2 = _network_cache.get(cache_key)
            if cached2 is not None:
                return cached2
            with get_db() as conn:
                data = network_service.get_communities(
                    conn,
                    min_size=min_size,
                    min_avg_risk=min_avg_risk,
                    sector_id=sector_id,
                    limit=limit,
                )
    else:
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

    if is_default:
        try:
            payload = result.model_dump()
            with get_db() as wconn:
                wconn.execute(
                    "INSERT OR REPLACE INTO precomputed_stats(stat_key, stat_value, updated_at) VALUES(?, ?, datetime('now'))",
                    (_COMMUNITIES_DB_KEY, json.dumps(payload, default=str)),
                )
                wconn.commit()
        except Exception as e:
            logger.warning("communities persist failed: %s", e)
    return result


class CommunityDetailSectorBreakdown(BaseModel):
    sector_id: int
    sector_name: str
    vendor_count: int
    contract_count: int
    total_value: float


class CommunityDetailResponse(BaseModel):
    community_id: int
    size: int
    avg_risk: float
    sector_breakdown: List[CommunityDetailSectorBreakdown]
    members: List[CommunityVendorItem]
    total_contracts: int
    total_value: float
    graph_ready: bool


# =============================================================================
# La Trama — Phase A endpoints
# =============================================================================

# Mutex preventing multiple workers computing the trama index simultaneously.
_trama_index_compute_lock = threading.Lock()
_TRAMA_INDEX_DB_KEY = "network_trama_index_v1"
# Sanity threshold: warn if any community total value exceeds 10T MXN
_TRAMA_VALUE_WARNING_THRESHOLD = 10_000_000_000_000

# SQLite variable-limit-safe chunk size for IN(...) fetches.
_TRAMA_IN_CHUNK = 900


def _get_sanction_keys(conn: sqlite3.Connection) -> tuple:
    """Sanction match keys loaded once into Python sets.

    sfp_sanctions is tiny (2,395 rows) but the SQL name-match
    (UPPER(TRIM(v.name)) = UPPER(TRIM(sfp.company_name))) is unindexable
    and cost 21s when joined against an 11,923-member community. Set
    lookups in Python make the same match O(1) per vendor.
    """
    cached = _network_cache.get("trama_sanction_keys")
    if cached is not None:
        return cached
    cursor = conn.cursor()
    cursor.execute("SELECT rfc, company_name FROM sfp_sanctions")
    rfc_keys = set()
    name_keys = set()
    for r in cursor.fetchall():
        rfc = r["rfc"]
        if rfc and str(rfc).strip():
            rfc_keys.add(str(rfc).strip().upper())
        name = r["company_name"]
        if name and str(name).strip():
            name_keys.add(str(name).strip().upper())
    result = (rfc_keys, name_keys)
    _network_cache.set("trama_sanction_keys", result, ttl=86400)
    return result


def _is_sanctioned(rfc, name, sanction_keys) -> bool:
    rfc_keys, name_keys = sanction_keys
    if rfc and str(rfc).strip() and str(rfc).strip().upper() in rfc_keys:
        return True
    return bool(name) and str(name).strip().upper() in name_keys


def _get_gt_vendor_counts(conn: sqlite3.Connection) -> Dict[int, int]:
    """vendor_id → distinct GT case count (FP-flagged links excluded)."""
    cached = _network_cache.get("trama_gt_counts")
    if cached is not None:
        return cached
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT vendor_id, COUNT(DISTINCT case_id) as case_count
        FROM ground_truth_vendors
        WHERE (is_false_positive IS NULL OR is_false_positive = 0)
        GROUP BY vendor_id
        """
    )
    result: Dict[int, int] = {r["vendor_id"]: r["case_count"] for r in cursor.fetchall()}
    _network_cache.set("trama_gt_counts", result, ttl=3600)
    return result


def _fetch_vendor_identity(conn: sqlite3.Connection, vendor_ids: List[int]) -> Dict[int, dict]:
    """id → {name, rfc} for arbitrary id lists, chunked under the variable limit."""
    cursor = conn.cursor()
    out: Dict[int, dict] = {}
    for i in range(0, len(vendor_ids), _TRAMA_IN_CHUNK):
        chunk = vendor_ids[i:i + _TRAMA_IN_CHUNK]
        chunk_placeholders = ",".join("?" * len(chunk))
        cursor.execute(
            f"SELECT id, name, rfc FROM vendors WHERE id IN ({chunk_placeholders})",
            chunk,
        )
        for r in cursor.fetchall():
            out[r["id"]] = {"name": r["name"], "rfc": r["rfc"]}
    return out


class TramaEdge(BaseModel):
    a: int
    b: int
    shared_procedures: int
    co_bid_rate: float
    is_potential_collusion: bool


class TramaNodeStats(BaseModel):
    total_value_mxn: float
    da_rate: Optional[float]
    sb_rate: Optional[float]
    avg_risk: float
    pattern_mix: List[Dict[str, Any]]
    labeled_count: int
    gt_vendor_count: int
    sanctioned_count: int


class TramaNode(BaseModel):
    vendor_id: int
    name: str
    pagerank: float
    degree: int
    risk_score: Optional[float]
    total_value_mxn: Optional[float]
    contract_count: Optional[int]
    is_sanctioned: bool
    primary_pattern: Optional[str]
    gt_case_count: int


class CommunityGraphResponse(BaseModel):
    community_id: int
    total_members: int
    rendered_members: int
    truncated: bool
    nodes: List[TramaNode]
    edges: List[TramaEdge]
    edges_truncated: bool
    stats: TramaNodeStats


class TramaIndexItem(BaseModel):
    community_id: int
    size: int
    hub_vendor_id: int
    hub_vendor_name: str
    avg_risk: float
    total_value_mxn: float
    da_rate: Optional[float]
    sb_rate: Optional[float]
    dominant_sector_name: Optional[str]
    pattern_mix: List[Dict[str, Any]]
    labeled_count: int
    gt_vendor_count: int
    sanctioned_count: int


class CommunityIndexResponse(BaseModel):
    communities: List[TramaIndexItem]
    total_communities: int
    generated_at: str


@router.get("/communities/index", response_model=CommunityIndexResponse)
@_rate_limit("20/minute")
def get_community_index(request: Request):
    """
    La Trama community index — all communities with size >= 5.

    Returns up to 250 communities ordered by total_value_mxn DESC.
    Served from precomputed_stats (key network_trama_index_v1); computed
    on first request under a mutex and persisted for subsequent cold starts.
    IMPORTANT: must be registered before /communities/{community_id} to avoid
    FastAPI routing conflict (literal "index" would fail int coercion → 422).
    """
    # In-memory cache check
    cached = _network_cache.get("trama_index")
    if cached is not None:
        return cached

    # Persistent fallback — survives container restarts
    try:
        with get_db() as pconn:
            row = pconn.execute(
                "SELECT stat_value FROM precomputed_stats WHERE stat_key = ?",
                (_TRAMA_INDEX_DB_KEY,),
            ).fetchone()
        if row and row["stat_value"]:
            persisted = CommunityIndexResponse(**json.loads(row["stat_value"]))
            _network_cache.set("trama_index", persisted, ttl=3600)
            return persisted
    except Exception:
        pass

    # Compute under mutex
    with _trama_index_compute_lock:
        # Double-check after acquiring lock
        cached2 = _network_cache.get("trama_index")
        if cached2 is not None:
            return cached2

        with get_db() as conn:
            result = _build_community_index(conn)

        _network_cache.set("trama_index", result, ttl=3600)

        # Persist to DB
        try:
            payload = result.model_dump()
            with get_db() as wconn:
                wconn.execute(
                    "INSERT OR REPLACE INTO precomputed_stats(stat_key, stat_value, updated_at) "
                    "VALUES(?, ?, datetime('now'))",
                    (_TRAMA_INDEX_DB_KEY, json.dumps(payload, default=str)),
                )
                wconn.commit()
        except Exception as e:
            logger.warning("trama index persist failed: %s", e)

    return result


@router.get("/communities/{community_id}", response_model=CommunityDetailResponse)
def get_community_detail(
    community_id: int = Path(..., description="Community ID from Louvain clustering"),
):
    """
    Get detailed information for a specific co-bidding community.

    Returns all members with vendor details, risk scores, pagerank,
    and a sector breakdown of the community.
    """
    cache_key = f"community_detail:{community_id}"
    cached = _network_cache.get(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        # Check table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='vendor_graph_features'"
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=503,
                detail="Graph features not yet computed. Run build_vendor_graph.py first.",
            )

        # Verify community exists
        cursor.execute(
            "SELECT COUNT(*) FROM vendor_graph_features WHERE community_id = ?",
            (community_id,),
        )
        count = cursor.fetchone()[0]
        if count == 0:
            raise HTTPException(status_code=404, detail=f"Community {community_id} not found")

        # All members with vendor details
        cursor.execute(
            """
            SELECT
                v.id as vendor_id, v.name as vendor_name,
                vgf.pagerank, vgf.degree,
                COALESCE(AVG(c.risk_score), 0) as avg_risk,
                COUNT(c.id) as contract_count,
                COALESCE(SUM(c.amount_mxn), 0) as total_value
            FROM vendor_graph_features vgf
            JOIN vendors v ON vgf.vendor_id = v.id
            LEFT JOIN contracts c ON vgf.vendor_id = c.vendor_id
                AND COALESCE(c.amount_mxn, 0) <= ?
            WHERE vgf.community_id = ?
            GROUP BY vgf.vendor_id, v.id, v.name, vgf.pagerank, vgf.degree
            ORDER BY vgf.pagerank DESC
            """,
            (MAX_CONTRACT_VALUE, community_id),
        )
        members = []
        total_contracts = 0
        total_value = 0.0
        for r in cursor.fetchall():
            members.append(CommunityVendorItem(
                vendor_id=r["vendor_id"],
                vendor_name=r["vendor_name"],
                pagerank=round(r["pagerank"], 6),
                degree=r["degree"],
                avg_risk=round(r["avg_risk"], 4),
                contracts=r["contract_count"],
                total_value=r["total_value"],
            ))
            total_contracts += r["contract_count"]
            total_value += r["total_value"]

        # Sector breakdown
        vendor_ids = [m.vendor_id for m in members]
        if vendor_ids:
            placeholders = ",".join("?" * len(vendor_ids))
            cursor.execute(
                f"""
                SELECT
                    s.id as sector_id, s.name_es as sector_name,
                    COUNT(DISTINCT c.vendor_id) as vendor_count,
                    COUNT(c.id) as contract_count,
                    COALESCE(SUM(c.amount_mxn), 0) as total_value
                FROM contracts c
                JOIN sectors s ON c.sector_id = s.id
                WHERE c.vendor_id IN ({placeholders})
                    AND COALESCE(c.amount_mxn, 0) <= ?
                GROUP BY s.id, s.name_es
                ORDER BY contract_count DESC
                """,
                (*vendor_ids, MAX_CONTRACT_VALUE),
            )
            sector_breakdown = [
                CommunityDetailSectorBreakdown(
                    sector_id=r["sector_id"],
                    sector_name=r["sector_name"],
                    vendor_count=r["vendor_count"],
                    contract_count=r["contract_count"],
                    total_value=r["total_value"],
                )
                for r in cursor.fetchall()
            ]
        else:
            sector_breakdown = []

        avg_risk = (
            sum(m.avg_risk * m.contracts for m in members)
            / max(1, total_contracts)
        ) if members else 0.0

    result = CommunityDetailResponse(
        community_id=community_id,
        size=len(members),
        avg_risk=round(avg_risk, 4),
        sector_breakdown=sector_breakdown,
        members=members,
        total_contracts=total_contracts,
        total_value=total_value,
        graph_ready=True,
    )

    _network_cache.set(cache_key, result, ttl=3600)
    return result


def _build_community_index(conn: sqlite3.Connection) -> CommunityIndexResponse:
    """Compute community index from aria_queue aggregates.

    Uses aria_queue rates exclusively (vendor_stats.direct_award_pct is KNOWN
    CORRUPTED with >100% values). Never queries the raw contracts table here.
    """
    import datetime
    from collections import Counter

    cursor = conn.cursor()

    # All communities with size >= 5
    cursor.execute("""
        SELECT community_id, COUNT(*) as size
        FROM vendor_graph_features
        GROUP BY community_id
        HAVING size >= 5
    """)
    community_sizes = {r["community_id"]: r["size"] for r in cursor.fetchall()}

    if not community_sizes:
        return CommunityIndexResponse(
            communities=[],
            total_communities=0,
            generated_at=datetime.datetime.utcnow().isoformat() + "Z",
        )

    community_ids = list(community_sizes.keys())

    # Fetch all member vendor_ids per community in one pass
    placeholders = ",".join("?" * len(community_ids))
    cursor.execute(
        f"SELECT vendor_id, community_id FROM vendor_graph_features WHERE community_id IN ({placeholders})",
        community_ids,
    )
    community_members: Dict[int, List[int]] = {}
    for r in cursor.fetchall():
        community_members.setdefault(r["community_id"], []).append(r["vendor_id"])

    # Fetch hub (highest pagerank) per community in one pass
    cursor.execute(
        f"""
        SELECT community_id, vendor_id, pagerank
        FROM vendor_graph_features
        WHERE community_id IN ({placeholders})
        ORDER BY community_id, pagerank DESC
        """,
        community_ids,
    )
    community_hub: Dict[int, int] = {}
    for r in cursor.fetchall():
        if r["community_id"] not in community_hub:
            community_hub[r["community_id"]] = r["vendor_id"]

    # Bulk fetch all aria_queue rows for relevant vendors — CHUNKED.
    # 46,948 vendors live in size>=5 communities (verified 2026-06-07);
    # a single IN(...) exceeds SQLite's 32,766-variable limit and crashes.
    all_vendor_ids = [vid for ids in community_members.values() for vid in ids]
    aq_by_vendor: Dict[int, dict] = {}
    CHUNK = 900
    for i in range(0, len(all_vendor_ids), CHUNK):
        chunk = all_vendor_ids[i:i + CHUNK]
        chunk_placeholders = ",".join("?" * len(chunk))
        cursor.execute(
            f"""
            SELECT vendor_id, total_value_mxn, direct_award_rate, single_bid_rate,
                   avg_risk_score, primary_pattern, primary_sector_name
            FROM aria_queue
            WHERE vendor_id IN ({chunk_placeholders})
            """,
            chunk,
        )
        for r in cursor.fetchall():
            aq_by_vendor[r["vendor_id"]] = dict(r)

    # Vendor identities (name + rfc) for all members, chunked — feeds hub
    # names AND the Python-set sanction match below.
    identities = _fetch_vendor_identity(conn, all_vendor_ids)
    vendor_names: Dict[int, str] = {
        vid: (identities.get(vid) or {}).get("name") or f"Vendor {vid}"
        for vid in community_hub.values()
    }

    # GT vendor counts per community — Python membership over the tiny
    # ground_truth_vendors table (1,679 rows), FP-flagged links excluded.
    gt_counts = _get_gt_vendor_counts(conn)
    gt_count_by_community: Dict[int, int] = {}
    for cid, member_ids in community_members.items():
        n = sum(1 for vid in member_ids if vid in gt_counts)
        if n:
            gt_count_by_community[cid] = n

    # Sanctioned counts per community — set match in Python. The SQL
    # UPPER(TRIM(name)) join is unindexable and dominated the build time.
    sanction_keys = _get_sanction_keys(conn)
    sanctioned_by_community: Dict[int, int] = {}
    for cid, member_ids in community_members.items():
        n = 0
        for vid in member_ids:
            ident = identities.get(vid)
            if ident and _is_sanctioned(ident["rfc"], ident["name"], sanction_keys):
                n += 1
        if n:
            sanctioned_by_community[cid] = n

    items = []
    for cid, size in community_sizes.items():
        members = community_members.get(cid, [])
        hub_id = community_hub.get(cid, members[0] if members else 0)
        hub_name = vendor_names.get(hub_id, f"Vendor {hub_id}")

        total_value = 0.0
        da_values: List[float] = []
        sb_values: List[float] = []
        risk_values: List[float] = []
        patterns: List[str] = []
        sector_names: List[str] = []

        for vid in members:
            aq = aq_by_vendor.get(vid)
            if aq:
                v = aq.get("total_value_mxn") or 0.0
                total_value += float(v)
                da = aq.get("direct_award_rate")
                if da is not None:
                    da_values.append(float(da))
                sb = aq.get("single_bid_rate")
                if sb is not None:
                    sb_values.append(float(sb))
                risk = aq.get("avg_risk_score")
                if risk is not None:
                    risk_values.append(float(risk))
                pat = aq.get("primary_pattern")
                if pat:
                    patterns.append(pat)
                sec = aq.get("primary_sector_name")
                if sec:
                    sector_names.append(sec)

        if total_value > _TRAMA_VALUE_WARNING_THRESHOLD:
            logger.warning(
                "community %d total_value_mxn=%.2e exceeds 10T MXN — possible data error",
                cid, total_value,
            )

        pattern_counter = Counter(patterns)
        pattern_mix = [
            {"pattern": p, "count": c}
            for p, c in pattern_counter.most_common(3)
        ]
        dominant_sector: Optional[str] = None
        if sector_names:
            dominant_sector = Counter(sector_names).most_common(1)[0][0]

        items.append(TramaIndexItem(
            community_id=cid,
            size=size,
            hub_vendor_id=hub_id,
            hub_vendor_name=hub_name or f"Vendor {hub_id}",
            avg_risk=round(sum(risk_values) / len(risk_values), 4) if risk_values else 0.0,
            total_value_mxn=round(total_value, 2),
            da_rate=round(sum(da_values) / len(da_values), 4) if da_values else None,
            sb_rate=round(sum(sb_values) / len(sb_values), 4) if sb_values else None,
            dominant_sector_name=dominant_sector,
            pattern_mix=pattern_mix,
            labeled_count=len(patterns),
            gt_vendor_count=gt_count_by_community.get(cid, 0),
            sanctioned_count=sanctioned_by_community.get(cid, 0),
        ))

    # Sort by total_value_mxn DESC, cap at 250
    items.sort(key=lambda x: x.total_value_mxn, reverse=True)
    items = items[:250]

    return CommunityIndexResponse(
        communities=items,
        total_communities=len(community_sizes),
        generated_at=datetime.datetime.utcnow().isoformat() + "Z",
    )


# get_community_index is registered before get_community_detail (see below)
# to prevent FastAPI routing conflict: /communities/index must be registered
# before /communities/{community_id:int} or the literal "index" hits the int
# path and returns 422.


@router.get("/communities/{community_id}/graph", response_model=CommunityGraphResponse)
@_rate_limit("30/minute")
def get_community_graph(
    request: Request,
    community_id: int = Path(..., description="Community ID from Louvain clustering"),
):
    """
    La Trama community graph — nodes + edges for force-directed layout.

    Node budget: up to 100 nodes (top by pagerank) for communities > 150 members.
    Edge budget: up to 2,500 edges (top by shared_procedures).
    Uses aria_queue aggregates for vendor stats (never raw contracts table).
    """
    cache_key = f"community_graph:{community_id}"
    cached = _network_cache.get(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()

        # Guard: table must exist
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='vendor_graph_features'"
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=503,
                detail="Graph features not yet computed. Run build_vendor_graph.py first.",
            )

        # Verify community exists
        cursor.execute(
            "SELECT COUNT(*) FROM vendor_graph_features WHERE community_id = ?",
            (community_id,),
        )
        total_members = cursor.fetchone()[0]
        if total_members == 0:
            raise HTTPException(status_code=404, detail=f"Community {community_id} not found")

        # Fetch ALL member graph features (lightweight — just IDs + pagerank + degree)
        cursor.execute(
            """
            SELECT vendor_id, pagerank, degree
            FROM vendor_graph_features
            WHERE community_id = ?
            ORDER BY pagerank DESC
            """,
            (community_id,),
        )
        all_members_rows = cursor.fetchall()

        # Node budget
        truncated = total_members > 150
        if truncated:
            render_rows = all_members_rows[:100]
        else:
            render_rows = all_members_rows

        rendered_ids = [r["vendor_id"] for r in render_rows]
        rendered_set = set(rendered_ids)

        # Vendor identities (name + rfc) for rendered members
        identities = _fetch_vendor_identity(conn, rendered_ids)
        vendor_names: Dict[int, str] = {
            vid: (identities.get(vid) or {}).get("name") or f"Vendor {vid}"
            for vid in rendered_ids
        }

        # Fetch aria_queue stats for rendered members
        v_placeholders = ",".join("?" * len(rendered_ids))
        cursor.execute(
            f"""
            SELECT vendor_id, avg_risk_score, total_value_mxn, total_contracts,
                   primary_pattern
            FROM aria_queue
            WHERE vendor_id IN ({v_placeholders})
            """,
            rendered_ids,
        )
        aq_map: Dict[int, dict] = {r["vendor_id"]: dict(r) for r in cursor.fetchall()}

        # GT case counts + sanctions for rendered members — Python sets
        # (the SQL name-match join cost 21s on the giant community)
        gt_map: Dict[int, int] = _get_gt_vendor_counts(conn)
        sanction_keys = _get_sanction_keys(conn)
        sanctioned_ids = set()
        for vid in rendered_ids:
            ident = identities.get(vid)
            if ident and _is_sanctioned(ident["rfc"], ident["name"], sanction_keys):
                sanctioned_ids.add(vid)

        # Build nodes
        nodes = []
        for r in render_rows:
            vid = r["vendor_id"]
            aq = aq_map.get(vid, {})
            nodes.append(TramaNode(
                vendor_id=vid,
                name=vendor_names.get(vid) or f"Vendor {vid}",
                pagerank=round(float(r["pagerank"]), 6),
                degree=int(r["degree"]),
                risk_score=aq.get("avg_risk_score"),
                total_value_mxn=aq.get("total_value_mxn"),
                contract_count=aq.get("total_contracts"),
                is_sanctioned=vid in sanctioned_ids,
                primary_pattern=aq.get("primary_pattern"),
                gt_case_count=gt_map.get(vid, 0),
            ))

        # Fetch edges using SAFE query (vendor_id_a IN only, intersect in Python)
        # CRITICAL: double-IN takes 51s on big communities; single-IN + Python-filter = 0.05s
        cursor.execute(
            f"""
            SELECT vendor_id_a, vendor_id_b, shared_procedures, co_bid_rate, is_potential_collusion
            FROM co_bidding_stats
            WHERE vendor_id_a IN ({v_placeholders})
            ORDER BY shared_procedures DESC
            """,
            rendered_ids,
        )
        raw_edges = cursor.fetchall()

        edges = []
        edges_truncated = False
        EDGE_CAP = 2500
        for er in raw_edges:
            if er["vendor_id_b"] not in rendered_set:
                continue
            edges.append(TramaEdge(
                a=er["vendor_id_a"],
                b=er["vendor_id_b"],
                shared_procedures=er["shared_procedures"],
                co_bid_rate=round(float(er["co_bid_rate"]), 4),
                is_potential_collusion=bool(er["is_potential_collusion"]),
            ))
            if len(edges) >= EDGE_CAP:
                edges_truncated = True
                break

        # Compute stats over ALL members (not just rendered) — chunked
        # under the SQLite variable limit (giant community = 11,923 ids).
        all_ids = [r["vendor_id"] for r in all_members_rows]
        all_aq = []
        for i in range(0, len(all_ids), _TRAMA_IN_CHUNK):
            chunk = all_ids[i:i + _TRAMA_IN_CHUNK]
            chunk_placeholders = ",".join("?" * len(chunk))
            cursor.execute(
                f"""
                SELECT total_value_mxn, direct_award_rate, single_bid_rate,
                       avg_risk_score, primary_pattern
                FROM aria_queue
                WHERE vendor_id IN ({chunk_placeholders})
                """,
                chunk,
            )
            all_aq.extend(cursor.fetchall())

        total_value_sum = 0.0
        da_vals: List[float] = []
        sb_vals: List[float] = []
        risk_vals: List[float] = []
        all_patterns: List[str] = []

        for aq_row in all_aq:
            v = aq_row["total_value_mxn"]
            if v is not None:
                total_value_sum += float(v)
            da = aq_row["direct_award_rate"]
            if da is not None:
                da_vals.append(float(da))
            sb = aq_row["single_bid_rate"]
            if sb is not None:
                sb_vals.append(float(sb))
            risk = aq_row["avg_risk_score"]
            if risk is not None:
                risk_vals.append(float(risk))
            pat = aq_row["primary_pattern"]
            if pat:
                all_patterns.append(pat)

        from collections import Counter
        pattern_counter = Counter(all_patterns)
        pattern_mix = [
            {"pattern": p, "count": c}
            for p, c in pattern_counter.most_common()
        ]

        # GT and sanctioned counts over ALL members — Python sets again;
        # identity fetch is chunked so the giant community stays cheap.
        gt_vendor_count = sum(1 for vid in all_ids if vid in gt_map)
        if truncated:
            all_identities = _fetch_vendor_identity(conn, all_ids)
        else:
            all_identities = identities
        sanctioned_count = 0
        for vid in all_ids:
            ident = all_identities.get(vid)
            if ident and _is_sanctioned(ident["rfc"], ident["name"], sanction_keys):
                sanctioned_count += 1

        stats = TramaNodeStats(
            total_value_mxn=round(total_value_sum, 2),
            da_rate=round(sum(da_vals) / len(da_vals), 4) if da_vals else None,
            sb_rate=round(sum(sb_vals) / len(sb_vals), 4) if sb_vals else None,
            avg_risk=round(sum(risk_vals) / len(risk_vals), 4) if risk_vals else 0.0,
            pattern_mix=pattern_mix,
            labeled_count=len(all_patterns),
            gt_vendor_count=gt_vendor_count,
            sanctioned_count=sanctioned_count,
        )

    result = CommunityGraphResponse(
        community_id=community_id,
        total_members=total_members,
        rendered_members=len(nodes),
        truncated=truncated,
        nodes=nodes,
        edges=edges,
        edges_truncated=edges_truncated,
        stats=stats,
    )

    _network_cache.set(cache_key, result, ttl=3600)
    return result


# =============================================================================
# La Trama — Phase C: institution capture lens ("El Sitio" graft)
# =============================================================================

_trama_capture_compute_lock = threading.Lock()
_TRAMA_CAPTURE_DB_KEY = "network_trama_capture_v1"
_CAPTURE_INDEX_SIZE = 120


class CaptureTopVendor(BaseModel):
    vendor_id: int
    vendor_name: str
    total_value_mxn: float
    avg_risk_score: Optional[float]


class CaptureCommunityRef(BaseModel):
    community_id: int
    vendor_count: int


class InstitutionCaptureItem(BaseModel):
    institution_id: int
    name: str
    sector_id: Optional[int]
    total_value_mxn: float
    total_contracts: int
    vendor_count: int
    direct_award_pct: Optional[float]  # 0-100 scale (institution_stats convention)
    single_bid_pct: Optional[float]    # 0-100 scale
    avg_risk_score: Optional[float]
    top1_vendor: Optional[CaptureTopVendor]
    top1_share_pct: Optional[float]    # 0-100: top vendor value / institution value
    latest_hhi: Optional[float]
    feeding_communities: List[CaptureCommunityRef]


class InstitutionCaptureResponse(BaseModel):
    institutions: List[InstitutionCaptureItem]
    total: int
    generated_at: str


def _build_institution_capture(conn: sqlite3.Connection) -> InstitutionCaptureResponse:
    """Top federal buyers as capture targets — entirely from precomputed
    tables (institution_stats, institution_top_vendors, institution_hhi,
    vendor_graph_features). No raw-contracts query, no edge query."""
    import datetime
    from collections import Counter

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT s.institution_id, i.name, i.sector_id,
               s.total_value_mxn, s.total_contracts, s.vendor_count,
               s.direct_award_pct, s.single_bid_pct, s.avg_risk_score
        FROM institution_stats s
        JOIN institutions i ON i.id = s.institution_id
        ORDER BY s.total_value_mxn DESC
        LIMIT ?
        """,
        (_CAPTURE_INDEX_SIZE,),
    )
    base_rows = [dict(r) for r in cursor.fetchall()]
    inst_ids = [r["institution_id"] for r in base_rows]
    if not inst_ids:
        return InstitutionCaptureResponse(
            institutions=[], total=0,
            generated_at=datetime.datetime.utcnow().isoformat() + "Z",
        )

    # All top-vendor rows for these institutions (~20 per institution)
    inst_placeholders = ",".join("?" * len(inst_ids))
    cursor.execute(
        f"""
        SELECT institution_id, vendor_id, vendor_name, total_value_mxn, avg_risk_score
        FROM institution_top_vendors
        WHERE institution_id IN ({inst_placeholders})
        """,
        inst_ids,
    )
    top_by_inst: Dict[int, List[dict]] = {}
    all_top_vendor_ids: set = set()
    for r in cursor.fetchall():
        top_by_inst.setdefault(r["institution_id"], []).append(dict(r))
        all_top_vendor_ids.add(r["vendor_id"])
    for rows in top_by_inst.values():
        rows.sort(key=lambda v: v["total_value_mxn"] or 0.0, reverse=True)

    # Latest HHI per institution
    cursor.execute(
        f"""
        SELECT institution_id, hhi, contract_year
        FROM institution_hhi
        WHERE institution_id IN ({inst_placeholders})
        ORDER BY institution_id, contract_year DESC
        """,
        inst_ids,
    )
    latest_hhi: Dict[int, float] = {}
    for r in cursor.fetchall():
        if r["institution_id"] not in latest_hhi and r["hhi"] is not None:
            latest_hhi[r["institution_id"]] = float(r["hhi"])

    # community_id per top vendor (chunked)
    vendor_ids = list(all_top_vendor_ids)
    community_of: Dict[int, int] = {}
    for i in range(0, len(vendor_ids), _TRAMA_IN_CHUNK):
        chunk = vendor_ids[i:i + _TRAMA_IN_CHUNK]
        chunk_placeholders = ",".join("?" * len(chunk))
        cursor.execute(
            f"SELECT vendor_id, community_id FROM vendor_graph_features WHERE vendor_id IN ({chunk_placeholders})",
            chunk,
        )
        for r in cursor.fetchall():
            community_of[r["vendor_id"]] = r["community_id"]

    items = []
    for row in base_rows:
        iid = row["institution_id"]
        tops = top_by_inst.get(iid, [])
        top1 = tops[0] if tops else None
        inst_value = float(row["total_value_mxn"] or 0.0)
        top1_share = None
        top1_model = None
        if top1 and inst_value > 0:
            top1_share = round(min(float(top1["total_value_mxn"] or 0.0) / inst_value, 1.0) * 100, 2)
            top1_model = CaptureTopVendor(
                vendor_id=top1["vendor_id"],
                vendor_name=top1["vendor_name"],
                total_value_mxn=float(top1["total_value_mxn"] or 0.0),
                avg_risk_score=top1["avg_risk_score"],
            )

        # Feeding clans: communities with >= 2 of this institution's top vendors
        comm_counter = Counter(
            community_of[v["vendor_id"]] for v in tops if v["vendor_id"] in community_of
        )
        feeding = [
            CaptureCommunityRef(community_id=cid, vendor_count=n)
            for cid, n in comm_counter.most_common(3)
            if n >= 2
        ]

        items.append(InstitutionCaptureItem(
            institution_id=iid,
            name=row["name"],
            sector_id=row["sector_id"],
            total_value_mxn=inst_value,
            total_contracts=row["total_contracts"] or 0,
            vendor_count=row["vendor_count"] or 0,
            direct_award_pct=row["direct_award_pct"],
            single_bid_pct=row["single_bid_pct"],
            avg_risk_score=row["avg_risk_score"],
            top1_vendor=top1_model,
            top1_share_pct=top1_share,
            latest_hhi=latest_hhi.get(iid),
            feeding_communities=feeding,
        ))

    return InstitutionCaptureResponse(
        institutions=items,
        total=len(items),
        generated_at=datetime.datetime.utcnow().isoformat() + "Z",
    )


@router.get("/institution-capture", response_model=InstitutionCaptureResponse)
@_rate_limit("20/minute")
def get_institution_capture(
    request: Request,
    limit: int = Query(40, ge=1, le=120),
    sort: str = Query("value", pattern="^(value|top1_share|hhi|risk)$"),
):
    """
    La Trama institution lens — top federal buyers as capture targets.

    Served from precomputed_stats (key network_trama_capture_v1).
    Sort/limit applied over the precomputed top-120-by-value corpus.
    """
    full: Optional[InstitutionCaptureResponse] = _network_cache.get("trama_capture")

    if full is None:
        try:
            with get_db() as pconn:
                row = pconn.execute(
                    "SELECT stat_value FROM precomputed_stats WHERE stat_key = ?",
                    (_TRAMA_CAPTURE_DB_KEY,),
                ).fetchone()
            if row and row["stat_value"]:
                full = InstitutionCaptureResponse(**json.loads(row["stat_value"]))
                _network_cache.set("trama_capture", full, ttl=3600)
        except Exception:
            full = None

    if full is None:
        with _trama_capture_compute_lock:
            full = _network_cache.get("trama_capture")
            if full is None:
                with get_db() as conn:
                    full = _build_institution_capture(conn)
                _network_cache.set("trama_capture", full, ttl=3600)
                try:
                    payload = full.model_dump()
                    with get_db() as wconn:
                        wconn.execute(
                            "INSERT OR REPLACE INTO precomputed_stats(stat_key, stat_value, updated_at) "
                            "VALUES(?, ?, datetime('now'))",
                            (_TRAMA_CAPTURE_DB_KEY, json.dumps(payload, default=str)),
                        )
                        wconn.commit()
                except Exception as e:
                    logger.warning("trama capture persist failed: %s", e)

    items = list(full.institutions)
    if sort == "top1_share":
        items.sort(key=lambda x: x.top1_share_pct or 0.0, reverse=True)
    elif sort == "hhi":
        items.sort(key=lambda x: x.latest_hhi or 0.0, reverse=True)
    elif sort == "risk":
        items.sort(key=lambda x: x.avg_risk_score or 0.0, reverse=True)
    # default: already value-ordered

    return InstitutionCaptureResponse(
        institutions=items[:limit],
        total=full.total,
        generated_at=full.generated_at,
    )


class StarVendor(BaseModel):
    vendor_id: int
    vendor_name: str
    total_value_mxn: float
    avg_risk_score: Optional[float]
    contract_count: int
    community_id: Optional[int]
    is_sanctioned: bool


class InstitutionStarResponse(BaseModel):
    institution_id: int
    name: str
    sector_id: Optional[int]
    total_value_mxn: float
    total_vendors: int
    vendors: List[StarVendor]


@router.get("/institution-capture/{institution_id}/star", response_model=InstitutionStarResponse)
@_rate_limit("30/minute")
def get_institution_star(
    request: Request,
    institution_id: int = Path(..., description="Institution ID"),
):
    """
    La Trama institution star — the top-30 vendor orbit around one buyer.
    Vendors carry their Louvain community_id so the web can be colored by clan.
    """
    cache_key = f"institution_star:{institution_id}"
    cached = _network_cache.get(cache_key)
    if cached is not None:
        return cached

    with get_db() as conn:
        cursor = conn.cursor()
        base = cursor.execute(
            """
            SELECT s.institution_id, i.name, i.sector_id, s.total_value_mxn, s.vendor_count
            FROM institution_stats s
            JOIN institutions i ON i.id = s.institution_id
            WHERE s.institution_id = ?
            """,
            (institution_id,),
        ).fetchone()
        if not base:
            raise HTTPException(status_code=404, detail=f"Institution {institution_id} not found")

        cursor.execute(
            """
            SELECT vendor_id, vendor_name, rfc, total_value_mxn, avg_risk_score, contract_count
            FROM institution_top_vendors
            WHERE institution_id = ?
            ORDER BY total_value_mxn DESC
            LIMIT 30
            """,
            (institution_id,),
        )
        top_rows = [dict(r) for r in cursor.fetchall()]

        vid_list = [r["vendor_id"] for r in top_rows]
        community_of: Dict[int, int] = {}
        if vid_list:
            vid_placeholders = ",".join("?" * len(vid_list))
            cursor.execute(
                f"SELECT vendor_id, community_id FROM vendor_graph_features WHERE vendor_id IN ({vid_placeholders})",
                vid_list,
            )
            for r in cursor.fetchall():
                community_of[r["vendor_id"]] = r["community_id"]

        sanction_keys = _get_sanction_keys(conn)

    vendors = [
        StarVendor(
            vendor_id=r["vendor_id"],
            vendor_name=r["vendor_name"],
            total_value_mxn=float(r["total_value_mxn"] or 0.0),
            avg_risk_score=r["avg_risk_score"],
            contract_count=r["contract_count"] or 0,
            community_id=community_of.get(r["vendor_id"]),
            is_sanctioned=_is_sanctioned(r["rfc"], r["vendor_name"], sanction_keys),
        )
        for r in top_rows
    ]

    result = InstitutionStarResponse(
        institution_id=base["institution_id"],
        name=base["name"],
        sector_id=base["sector_id"],
        total_value_mxn=float(base["total_value_mxn"] or 0.0),
        total_vendors=base["vendor_count"] or 0,
        vendors=vendors,
    )
    _network_cache.set(cache_key, result, ttl=3600)
    return result
