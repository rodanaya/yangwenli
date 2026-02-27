"""
Federated search endpoint — Section 4.4.

GET /api/v1/search?q=PEMEX&limit=10
Runs 4 queries in parallel (vendors, institutions, contracts, cases) and returns
grouped results for the command palette and SmartSearch component.
"""
import concurrent.futures
import logging
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["search"])


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class VendorResult(BaseModel):
    id: int
    name: str
    rfc: Optional[str] = None
    contracts: int
    risk_score: Optional[float] = None

class InstitutionResult(BaseModel):
    id: int
    name: str
    institution_type: Optional[str] = None
    total_contracts: Optional[int] = None

class ContractResult(BaseModel):
    id: int
    title: str
    amount: Optional[float] = None
    risk_level: Optional[str] = None
    year: Optional[int] = None

class CaseResult(BaseModel):
    slug: str
    title: str
    year: Optional[int] = None
    sector: Optional[str] = None

class FederatedSearchResponse(BaseModel):
    query: str
    vendors: list[VendorResult]
    institutions: list[InstitutionResult]
    contracts: list[ContractResult]
    cases: list[CaseResult]
    total: int


# ---------------------------------------------------------------------------
# Helpers — each runs one category query
# ---------------------------------------------------------------------------

def _search_vendors(q: str, limit: int) -> list[VendorResult]:
    try:
        conn = get_db()
        cur = conn.execute(
            """
            SELECT v.id, v.name, v.rfc,
                   COALESCE(vs.total_contracts, 0) AS contracts,
                   vs.avg_risk_score
            FROM vendors v
            LEFT JOIN v_vendor_stats vs ON v.id = vs.vendor_id
            WHERE v.name LIKE ? OR (v.rfc IS NOT NULL AND v.rfc LIKE ?)
            ORDER BY contracts DESC
            LIMIT ?
            """,
            (f"%{q}%", f"%{q}%", limit),
        )
        rows = cur.fetchall()
        conn.close()
        return [
            VendorResult(
                id=r["id"],
                name=r["name"],
                rfc=r["rfc"],
                contracts=r["contracts"] or 0,
                risk_score=r["avg_risk_score"],
            )
            for r in rows
        ]
    except Exception as e:
        logger.warning("vendor search error: %s", e)
        return []


def _search_institutions(q: str, limit: int) -> list[InstitutionResult]:
    try:
        conn = get_db()
        cur = conn.execute(
            """
            SELECT id, name, institution_type,
                   (SELECT COUNT(*) FROM contracts WHERE institution_id = i.id) AS total_contracts
            FROM institutions i
            WHERE name LIKE ?
            ORDER BY total_contracts DESC
            LIMIT ?
            """,
            (f"%{q}%", limit),
        )
        rows = cur.fetchall()
        conn.close()
        return [
            InstitutionResult(
                id=r["id"],
                name=r["name"],
                institution_type=r["institution_type"],
                total_contracts=r["total_contracts"],
            )
            for r in rows
        ]
    except Exception as e:
        logger.warning("institution search error: %s", e)
        return []


def _search_contracts(q: str, limit: int) -> list[ContractResult]:
    try:
        conn = get_db()
        cur = conn.execute(
            """
            SELECT id, title, amount_mxn, risk_level, contract_year
            FROM contracts
            WHERE title LIKE ?
              AND amount_mxn IS NOT NULL
              AND amount_mxn > 0
              AND amount_mxn <= 100000000000
            ORDER BY amount_mxn DESC
            LIMIT ?
            """,
            (f"%{q}%", limit),
        )
        rows = cur.fetchall()
        conn.close()
        return [
            ContractResult(
                id=r["id"],
                title=r["title"] or "",
                amount=r["amount_mxn"],
                risk_level=r["risk_level"],
                year=r["contract_year"],
            )
            for r in rows
        ]
    except Exception as e:
        logger.warning("contract search error: %s", e)
        return []


def _search_cases(q: str, limit: int) -> list[CaseResult]:
    try:
        conn = get_db()
        # cases table may not exist — graceful fallback
        cur = conn.execute(
            """
            SELECT slug, title, year, sector
            FROM cases
            WHERE title LIKE ? OR description LIKE ?
            ORDER BY year DESC
            LIMIT ?
            """,
            (f"%{q}%", f"%{q}%", limit),
        )
        rows = cur.fetchall()
        conn.close()
        return [
            CaseResult(slug=r["slug"], title=r["title"], year=r["year"], sector=r["sector"])
            for r in rows
        ]
    except Exception as e:
        # cases table may not have all columns — not fatal
        logger.debug("case search error (non-fatal): %s", e)
        return []


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/search", response_model=FederatedSearchResponse)
def federated_search(
    q: str = Query(..., min_length=2, max_length=100, description="Search query"),
    limit: int = Query(default=5, ge=1, le=20, description="Max results per category"),
):
    """
    Federated search across vendors, institutions, contracts, and cases.
    Runs all 4 queries in parallel via ThreadPoolExecutor.
    """
    q = q.strip()

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        f_vendors = executor.submit(_search_vendors, q, limit)
        f_institutions = executor.submit(_search_institutions, q, limit)
        f_contracts = executor.submit(_search_contracts, q, limit)
        f_cases = executor.submit(_search_cases, q, limit)

        vendors = f_vendors.result()
        institutions = f_institutions.result()
        contracts = f_contracts.result()
        cases = f_cases.result()

    total = len(vendors) + len(institutions) + len(contracts) + len(cases)

    return FederatedSearchResponse(
        query=q,
        vendors=vendors,
        institutions=institutions,
        contracts=contracts,
        cases=cases,
        total=total,
    )
