"""
Vendor domain service — extracted from vendors.py router.

Handles vendor listing, detail, risk profiles, and related queries.
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

logger = structlog.get_logger("rubli.services.vendor")

# Sort field whitelist for vendor listing
VENDOR_SORT_WHITELIST = {
    "total_contracts": "s.total_contracts",
    "total_value": "s.total_value_mxn",
    "total_value_mxn": "s.total_value_mxn",
    "avg_risk": "s.avg_risk_score",
    "avg_risk_score": "s.avg_risk_score",
    "direct_award_pct": "s.direct_award_pct",
    "high_risk_pct": "s.high_risk_pct",
    "single_bid_pct": "s.single_bid_pct",
    "pct_anomalous": "s.anomalous_pct",
    "name": "v.name",
}


class VendorService(BaseService):
    """Business logic for vendor queries."""

    def list_vendors(
        self,
        conn: sqlite3.Connection,
        *,
        page: int = 1,
        per_page: int = 50,
        search: str | None = None,
        sector_id: int | None = None,
        risk_level: str | None = None,
        min_contracts: int | None = None,
        min_value: float | None = None,
        has_rfc: bool | None = None,
        sort_by: str = "total_contracts",
        sort_order: str = "desc",
    ) -> PaginatedResult:
        """
        List vendors with pagination and filters.

        Uses pre-computed vendor_stats table for fast aggregate queries.
        """
        qb = QueryBuilder("vendors v")
        qb.join("vendor_stats s", "v.id = s.vendor_id")

        # Vendor-table filters
        if search:
            qb.filter_search(search, ["v.name", "v.name_normalized", "v.rfc"])
        if has_rfc is True:
            qb.where("v.rfc IS NOT NULL AND v.rfc != ''")
        elif has_rfc is False:
            qb.where("(v.rfc IS NULL OR v.rfc = '')")

        # Stats-table filters
        if sector_id is not None:
            qb.where("s.primary_sector_id = ?", sector_id)
        if risk_level is not None:
            risk_ranges = {
                "critical": ("s.avg_risk_score >= ?", [0.50]),
                "high": ("s.avg_risk_score >= ? AND s.avg_risk_score < ?", [0.30, 0.50]),
                "medium": ("s.avg_risk_score >= ? AND s.avg_risk_score < ?", [0.10, 0.30]),
                "low": ("s.avg_risk_score < ?", [0.10]),
            }
            if risk_level in risk_ranges:
                cond, vals = risk_ranges[risk_level]
                qb.where(cond, *vals)
        if min_contracts is not None:
            qb.where("s.total_contracts >= ?", min_contracts)
        if min_value is not None:
            qb.where("s.total_value_mxn >= ?", min_value)

        # Sorting
        qb.sort(
            sort_by,
            sort_order,
            whitelist=VENDOR_SORT_WHITELIST,
            default="s.total_contracts DESC",
        )

        columns = """
            v.id, v.name, v.rfc, v.name_normalized,
            s.total_contracts, s.total_value_mxn, s.avg_risk_score,
            s.high_risk_pct, s.direct_award_pct, s.single_bid_pct,
            s.first_contract_year, s.last_contract_year,
            s.primary_sector_id, s.anomalous_pct
        """

        return self._paginated_list(
            conn, qb, columns, page, per_page,
            row_mapper=self._map_vendor_row,
        )

    @staticmethod
    def _map_vendor_row(row: sqlite3.Row) -> dict:
        """Map a vendor database row to API response dict."""
        return {
            "id": row["id"],
            "name": row["name"],
            "name_normalized": row["name_normalized"],
            "total_contracts": row["total_contracts"],
            "total_value_mxn": row["total_value_mxn"],
            "avg_risk_score": round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
            "high_risk_pct": round(row["high_risk_pct"], 2),
            "direct_award_pct": round(row["direct_award_pct"], 2),
            "single_bid_pct": round(row["single_bid_pct"], 2) if row["single_bid_pct"] else 0,
            "first_contract_year": row["first_contract_year"],
            "last_contract_year": row["last_contract_year"],
            "primary_sector_id": row["primary_sector_id"],
            "pct_anomalous": round(row["anomalous_pct"], 2) if row["anomalous_pct"] else None,
        }

    def get_vendor_detail(
        self,
        conn: sqlite3.Connection,
        vendor_id: int,
    ) -> dict | None:
        """Get detailed vendor information including stats."""
        row = self._execute_one(
            conn,
            """
            SELECT v.id, v.name, v.rfc, v.name_normalized,
                   s.total_contracts, s.total_value_mxn, s.avg_risk_score,
                   s.high_risk_pct, s.direct_award_pct, s.single_bid_pct,
                   s.first_contract_year, s.last_contract_year,
                   s.primary_sector_id, s.anomalous_pct,
                   s.sector_count
            FROM vendors v
            LEFT JOIN vendor_stats s ON v.id = s.vendor_id
            WHERE v.id = ?
            """,
            (vendor_id,),
        )
        if row is None:
            return None
        return dict(row)

    def get_vendor_contracts(
        self,
        conn: sqlite3.Connection,
        vendor_id: int,
        *,
        page: int = 1,
        per_page: int = 50,
        sort_by: str = "contract_year",
        sort_order: str = "desc",
    ) -> PaginatedResult:
        """Get contracts for a specific vendor."""
        qb = QueryBuilder("contracts c")
        qb.where("c.vendor_id = ?", vendor_id)
        qb.sort(
            sort_by,
            sort_order,
            whitelist={
                "contract_year": "c.contract_year",
                "amount_mxn": "c.amount_mxn",
                "risk_score": "c.risk_score",
            },
            default="c.contract_year DESC",
        )

        columns = """
            c.id, c.title, c.contract_year, c.amount_mxn,
            c.risk_score, c.risk_level, c.is_direct_award, c.is_single_bid,
            c.institution_id, c.sector_id
        """
        return self._paginated_list(conn, qb, columns, page, per_page)


# Singleton instance for router use
vendor_service = VendorService()
