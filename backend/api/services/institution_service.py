"""
Institution domain service — extracted from institutions.py router.

Handles institution listing, detail, vendors, and risk profile queries.
Router becomes thin: parse request → call service → return response.
"""
from __future__ import annotations

import sqlite3
from typing import Any

import structlog

from .base_service import BaseService
from .query_builder import QueryBuilder
from .pagination import paginate_query, PaginatedResult

logger = structlog.get_logger("rubli.services.institution")

# Sort field whitelist for institution listing
INSTITUTION_SORT_WHITELIST = {
    "total_contracts": "COALESCE(s.total_contracts, i.total_contracts)",
    "total_value_mxn": "COALESCE(s.total_value_mxn, i.total_amount_mxn)",
    "total_amount_mxn": "COALESCE(s.total_value_mxn, i.total_amount_mxn)",
    "avg_risk_score": "s.avg_risk_score",
    "high_risk_pct": "s.high_risk_pct",
    "direct_award_pct": "s.direct_award_pct",
    "single_bid_pct": "s.single_bid_pct",
    "vendor_count": "s.vendor_count",
    "name": "i.name",
}


class InstitutionService(BaseService):
    """Business logic for institution queries."""

    def list_institutions(
        self,
        conn: sqlite3.Connection,
        *,
        page: int = 1,
        per_page: int = 50,
        institution_type: str | None = None,
        size_tier: str | None = None,
        autonomy_level: str | None = None,
        sector_id: int | None = None,
        state_code: str | None = None,
        search: str | None = None,
        min_contracts: int | None = None,
        is_legally_decentralized: bool | None = None,
        sort_by: str = "total_contracts",
        sort_order: str = "desc",
    ) -> PaginatedResult:
        """
        List institutions with pagination and filters.

        Uses pre-computed institution_stats for fast aggregate queries.
        """
        qb = QueryBuilder("institutions i")
        qb.left_join("institution_stats s", "i.id = s.institution_id")

        if institution_type:
            qb.where("i.institution_type = ?", institution_type)
        if size_tier:
            qb.where("i.size_tier = ?", size_tier)
        if autonomy_level:
            qb.where("i.autonomy_level = ?", autonomy_level)
        if sector_id is not None:
            qb.where("i.sector_id = ?", sector_id)
        if state_code:
            qb.where("i.state_code = ?", state_code.upper())
        if search:
            qb.filter_search(search, ["i.name", "i.name_normalized", "i.siglas"])
        if min_contracts is not None:
            qb.where("COALESCE(s.total_contracts, i.total_contracts, 0) >= ?", min_contracts)
        if is_legally_decentralized is not None:
            qb.filter_boolean(is_legally_decentralized, column="i.is_legally_decentralized")

        qb.sort(
            sort_by,
            sort_order,
            whitelist=INSTITUTION_SORT_WHITELIST,
            default="COALESCE(s.total_contracts, i.total_contracts) DESC",
        )

        columns = """
            i.id, i.name, i.name_normalized, i.siglas,
            i.institution_type, i.institution_type_id,
            i.size_tier, i.autonomy_level, i.is_legally_decentralized,
            i.sector_id, i.state_code, i.geographic_scope,
            COALESCE(s.total_contracts, i.total_contracts) as total_contracts,
            COALESCE(s.total_value_mxn, i.total_amount_mxn) as total_amount_mxn,
            s.avg_risk_score,
            s.high_risk_pct,
            s.direct_award_pct,
            s.single_bid_pct,
            s.vendor_count,
            i.classification_confidence, i.data_quality_grade
        """

        return self._paginated_list(
            conn, qb, columns, page, per_page,
            row_mapper=self._map_institution_row,
        )

    @staticmethod
    def _map_institution_row(row: sqlite3.Row) -> dict:
        """Map an institution database row to API response dict."""
        return {
            "id": row["id"],
            "name": row["name"],
            "name_normalized": row["name_normalized"],
            "siglas": row["siglas"],
            "institution_type": row["institution_type"],
            "institution_type_id": row["institution_type_id"],
            "size_tier": row["size_tier"],
            "autonomy_level": row["autonomy_level"],
            "is_legally_decentralized": (
                bool(row["is_legally_decentralized"])
                if row["is_legally_decentralized"] is not None
                else None
            ),
            "sector_id": row["sector_id"],
            "state_code": row["state_code"],
            "geographic_scope": row["geographic_scope"],
            "total_contracts": row["total_contracts"],
            "total_amount_mxn": row["total_amount_mxn"],
            "avg_risk_score": round(row["avg_risk_score"], 4) if row["avg_risk_score"] else None,
            "high_risk_pct": round(row["high_risk_pct"], 2) if row["high_risk_pct"] else None,
            "direct_award_pct": round(row["direct_award_pct"], 2) if row["direct_award_pct"] else None,
            "single_bid_pct": round(row["single_bid_pct"], 2) if row["single_bid_pct"] else None,
            "vendor_count": row["vendor_count"],
            "classification_confidence": row["classification_confidence"],
            "data_quality_grade": row["data_quality_grade"],
        }

    def get_institution_detail(
        self,
        conn: sqlite3.Connection,
        institution_id: int,
    ) -> dict | None:
        """
        Get detailed institution information including type/size/autonomy baselines
        and pre-computed stats.
        """
        row = self._execute_one(
            conn,
            """
            SELECT
                i.id, i.name, i.name_normalized, i.siglas,
                i.institution_type, i.institution_type_id,
                i.size_tier, i.autonomy_level, i.is_legally_decentralized,
                i.sector_id, i.state_code, i.geographic_scope,
                i.total_contracts, i.total_amount_mxn,
                i.classification_confidence, i.data_quality_grade,
                it.risk_baseline as type_risk_baseline,
                st.risk_adjustment as size_risk_adjustment,
                al.risk_baseline as autonomy_risk_baseline,
                ins.total_contracts as stats_total_contracts,
                ins.total_value_mxn as stats_total_value_mxn,
                ins.avg_risk_score as stats_avg_risk_score,
                ins.high_risk_count as stats_high_risk_count,
                ins.high_risk_pct as stats_high_risk_pct,
                ins.direct_award_count as stats_direct_award_count,
                ins.direct_award_pct as stats_direct_award_pct
            FROM institutions i
            LEFT JOIN institution_types it ON i.institution_type_id = it.id
            LEFT JOIN size_tiers st ON i.size_tier = st.code
            LEFT JOIN autonomy_levels al ON i.autonomy_level = al.code
            LEFT JOIN institution_stats ins ON i.id = ins.institution_id
            WHERE i.id = ?
            """,
            (institution_id,),
        )
        if row is None:
            return None

        result = dict(row)
        # Extract stats from the joined row into a nested dict
        stats_keys = [
            "stats_total_contracts", "stats_total_value_mxn", "stats_avg_risk_score",
            "stats_high_risk_count", "stats_high_risk_pct",
            "stats_direct_award_count", "stats_direct_award_pct",
        ]
        has_stats = any(result.get(k) is not None for k in stats_keys)
        if has_stats:
            result["stats"] = {
                "total_contracts": result.pop("stats_total_contracts"),
                "total_value_mxn": result.pop("stats_total_value_mxn"),
                "avg_risk_score": result.pop("stats_avg_risk_score"),
                "high_risk_count": result.pop("stats_high_risk_count"),
                "high_risk_pct": result.pop("stats_high_risk_pct"),
                "direct_award_count": result.pop("stats_direct_award_count"),
                "direct_award_pct": result.pop("stats_direct_award_pct"),
            }
        else:
            for k in stats_keys:
                result.pop(k, None)
            result["stats"] = None
        return result

    def get_institution_vendors(
        self,
        conn: sqlite3.Connection,
        institution_id: int,
        *,
        year: int | None = None,
        min_contracts: int = 1,
        limit: int = 50,
        offset: int = 0,
    ) -> dict | None:
        """
        Get vendors connected to an institution, ranked by contract value.

        Returns vendor list with concentration (HHI) analysis.
        """
        # Verify institution exists
        inst_row = self._execute_one(
            conn,
            "SELECT id, name, institution_type FROM institutions WHERE id = ?",
            (institution_id,),
        )
        if inst_row is None:
            return None

        conditions = ["c.institution_id = ?", "COALESCE(c.amount_mxn, 0) <= 100000000000"]
        params: list[Any] = [institution_id]

        if year is not None:
            conditions.append("c.contract_year = ?")
            params.append(year)

        where_clause = " AND ".join(conditions)

        rows = self._execute_many(
            conn,
            f"""
            SELECT
                v.id as vendor_id, v.name as vendor_name,
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
            LIMIT ? OFFSET ?
            """,
            (*params, min_contracts, limit, offset),
        )

        vendors = []
        total_value = 0.0
        total_contracts = 0

        for row in rows:
            value = row["total_value"] or 0
            contracts = row["contract_count"]
            da_count = row["direct_award_count"] or 0

            vendors.append({
                "vendor_id": row["vendor_id"],
                "vendor_name": row["vendor_name"],
                "contract_count": contracts,
                "total_value": value,
                "avg_risk_score": round(row["avg_risk"], 4) if row["avg_risk"] else None,
                "direct_award_count": da_count,
                "direct_award_pct": round(da_count / contracts * 100, 1) if contracts > 0 else 0,
                "first_year": row["first_year"],
                "last_year": row["last_year"],
            })
            total_value += value
            total_contracts += contracts

        # HHI concentration index
        concentration_index = 0.0
        if total_value > 0:
            for v in vendors:
                share = v["total_value"] / total_value
                concentration_index += share ** 2
            concentration_index = round(concentration_index, 4)

        return {
            "institution_id": inst_row["id"],
            "institution_name": inst_row["name"],
            "institution_type": inst_row["institution_type"],
            "vendors": vendors,
            "total_vendors": len(vendors),
            "total_contracts": total_contracts,
            "total_value": total_value,
            "concentration_index": concentration_index,
        }


# Singleton instance for router use
institution_service = InstitutionService()
