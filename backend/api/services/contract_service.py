"""
Contract domain service — extracted from contracts.py router.

Handles contract listing, detail, statistics, and risk breakdown queries.
Router becomes thin: parse request → call service → return response.
"""
from __future__ import annotations

import math
import sqlite3
from typing import Any

import structlog

from .base_service import BaseService
from .query_builder import QueryBuilder
from .pagination import paginate_query, PaginatedResult

logger = structlog.get_logger("yang_wenli.services.contract")

# Sort field whitelist for contract listing
CONTRACT_SORT_WHITELIST = {
    "contract_date": "c.contract_date",
    "amount_mxn": "c.amount_mxn",
    "risk_score": "c.risk_score",
    "contract_year": "c.contract_year",
    "id": "c.id",
    "title": "c.title",
    "vendor_name": "vendor_name",
    "institution_name": "institution_name",
    "mahalanobis_distance": "c.mahalanobis_distance",
}


def parse_risk_factors(factors_str: str | None) -> list[str]:
    """Parse comma-separated risk factors string."""
    if not factors_str:
        return []
    return [f.strip() for f in factors_str.split(",") if f.strip()]


class ContractService(BaseService):
    """Business logic for contract queries."""

    def list_contracts(
        self,
        conn: sqlite3.Connection,
        *,
        page: int = 1,
        per_page: int = 50,
        sector_id: int | None = None,
        year: int | None = None,
        vendor_id: int | None = None,
        institution_id: int | None = None,
        risk_level: str | None = None,
        is_direct_award: bool | None = None,
        is_single_bid: bool | None = None,
        risk_factor: str | None = None,
        min_amount: float | None = None,
        max_amount: float | None = None,
        search: str | None = None,
        sort_by: str = "contract_date",
        sort_order: str = "desc",
    ) -> PaginatedResult:
        """
        List contracts with pagination and filters.

        Uses LEFT JOINs for sector/vendor/institution names.
        """
        qb = QueryBuilder("contracts c")
        qb.left_join("sectors s", "c.sector_id = s.id")
        qb.left_join("vendors v", "c.vendor_id = v.id")
        qb.left_join("institutions i", "c.institution_id = i.id")

        # Apply filters
        qb.filter_sector(sector_id, column="c.sector_id")
        qb.filter_year(year, column="c.contract_year")

        if vendor_id is not None:
            qb.where("c.vendor_id = ?", vendor_id)
        if institution_id is not None:
            qb.where("c.institution_id = ?", institution_id)

        qb.filter_risk_level(risk_level, column="c.risk_level")
        qb.filter_boolean(is_direct_award, column="c.is_direct_award")
        qb.filter_boolean(is_single_bid, column="c.is_single_bid")
        qb.filter_amount_range(min_amount, max_amount, column="c.amount_mxn")

        if search:
            qb.filter_search(search, ["c.title", "c.description"])
        if risk_factor:
            qb.where("c.risk_factors LIKE ?", f"%{risk_factor}%")

        qb.sort(
            sort_by,
            sort_order,
            whitelist=CONTRACT_SORT_WHITELIST,
            default="c.contract_date DESC",
        )

        columns = """
            c.id, c.contract_number, c.title, c.amount_mxn,
            c.contract_date, c.contract_year, c.sector_id,
            s.name_es as sector_name,
            c.risk_score, c.risk_level, c.is_direct_award, c.is_single_bid,
            v.name as vendor_name, i.name as institution_name,
            c.procedure_type, c.mahalanobis_distance,
            c.vendor_id, c.institution_id, c.risk_factors
        """

        return self._paginated_list(
            conn, qb, columns, page, per_page,
            row_mapper=self._map_contract_row,
        )

    @staticmethod
    def _map_contract_row(row: sqlite3.Row) -> dict:
        """Map a contract database row to API response dict."""
        return {
            "id": row["id"],
            "contract_number": row["contract_number"],
            "title": row["title"],
            "amount_mxn": row["amount_mxn"] or 0,
            "contract_date": row["contract_date"],
            "contract_year": row["contract_year"],
            "sector_id": row["sector_id"],
            "sector_name": row["sector_name"],
            "risk_score": row["risk_score"],
            "risk_level": row["risk_level"],
            "is_direct_award": bool(row["is_direct_award"]),
            "is_single_bid": bool(row["is_single_bid"]),
            "vendor_name": row["vendor_name"],
            "institution_name": row["institution_name"],
            "procedure_type": row["procedure_type"],
            "mahalanobis_distance": row["mahalanobis_distance"],
            "vendor_id": row["vendor_id"],
            "institution_id": row["institution_id"],
            "risk_factors": parse_risk_factors(row["risk_factors"]),
        }

    def get_contract_detail(
        self,
        conn: sqlite3.Connection,
        contract_id: int,
    ) -> dict | None:
        """Get detailed contract information with joined entity names."""
        row = self._execute_one(
            conn,
            """
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
            """,
            (contract_id,),
        )
        if row is None:
            return None
        # Convert Row to dict using cursor description
        return dict(row)

    def get_contract_statistics(
        self,
        conn: sqlite3.Connection,
        *,
        sector_id: int | None = None,
        year: int | None = None,
    ) -> dict:
        """
        Get aggregate contract statistics.

        Returns totals, averages, and risk/procedure breakdowns.
        """
        conditions: list[str] = []
        params: list[Any] = []

        if sector_id is not None:
            conditions.append("sector_id = ?")
            params.append(sector_id)
        if year is not None:
            conditions.append("contract_year = ?")
            params.append(year)

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        row = self._execute_one(
            conn,
            f"""
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
            """,
            params,
        )

        total = row["total_contracts"] or 0
        return {
            "total_contracts": total,
            "total_value_mxn": row["total_value"] or 0,
            "avg_contract_value": row["avg_value"] or 0,
            "low_risk_count": row["low_risk"] or 0,
            "medium_risk_count": row["medium_risk"] or 0,
            "high_risk_count": row["high_risk"] or 0,
            "critical_risk_count": row["critical_risk"] or 0,
            "direct_award_count": row["direct_awards"] or 0,
            "direct_award_pct": round((row["direct_awards"] or 0) / total * 100, 2) if total > 0 else 0,
            "single_bid_count": row["single_bids"] or 0,
            "single_bid_pct": round((row["single_bids"] or 0) / total * 100, 2) if total > 0 else 0,
            "min_year": row["min_year"] or 2002,
            "max_year": row["max_year"] or 2025,
        }


# Singleton instance for router use
contract_service = ContractService()
