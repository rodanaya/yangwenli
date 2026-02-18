"""
Analysis domain service — extracted from analysis.py router.

Handles year-over-year trends, pattern counts, and money flow queries.
Router becomes thin: parse request → call service → return response.
"""
from __future__ import annotations

import json
import sqlite3
from typing import Any

import structlog

from .base_service import BaseService

logger = structlog.get_logger("rubli.services.analysis")


def _table_exists(cursor: sqlite3.Cursor, table_name: str) -> bool:
    """Check if a table exists in the database."""
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    )
    return cursor.fetchone() is not None


class AnalysisService(BaseService):
    """Business logic for analysis queries."""

    def get_year_over_year(
        self,
        conn: sqlite3.Connection,
        *,
        sector_id: int | None = None,
        start_year: int | None = None,
        end_year: int | None = None,
    ) -> dict:
        """
        Get year-over-year trend data.

        Returns yearly aggregates of contracts, value, risk, and entity counts.
        """
        conditions = ["contract_year IS NOT NULL"]
        params: list[Any] = []

        if sector_id is not None:
            conditions.append("sector_id = ?")
            params.append(sector_id)
        if start_year is not None:
            conditions.append("contract_year >= ?")
            params.append(start_year)
        if end_year is not None:
            conditions.append("contract_year <= ?")
            params.append(end_year)

        where_clause = " AND ".join(conditions)

        rows = self._execute_many(
            conn,
            f"""
            SELECT
                contract_year as year,
                COUNT(*) as contracts,
                COALESCE(SUM(amount_mxn), 0) as total_value,
                COALESCE(AVG(risk_score), 0) as avg_risk,
                SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as direct_award_pct,
                SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) * 100.0 /
                    NULLIF(SUM(CASE WHEN is_direct_award = 0 THEN 1 ELSE 0 END), 0) as single_bid_pct,
                SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as high_risk_pct,
                COUNT(DISTINCT vendor_id) as vendor_count,
                COUNT(DISTINCT institution_id) as institution_count
            FROM contracts
            WHERE {where_clause}
            GROUP BY contract_year
            ORDER BY contract_year
            """,
            params,
        )

        data = []
        for row in rows:
            data.append({
                "year": row["year"],
                "contracts": row["contracts"],
                "total_value": row["total_value"],
                "avg_risk": round(row["avg_risk"], 4) if row["avg_risk"] else 0,
                "direct_award_pct": round(row["direct_award_pct"], 1) if row["direct_award_pct"] else 0,
                "single_bid_pct": round(row["single_bid_pct"], 1) if row["single_bid_pct"] else 0,
                "high_risk_pct": round(row["high_risk_pct"], 2) if row["high_risk_pct"] else 0,
                "vendor_count": row["vendor_count"],
                "institution_count": row["institution_count"],
            })

        years = [d["year"] for d in data]
        return {
            "data": data,
            "total_years": len(data),
            "min_year": min(years) if years else 2002,
            "max_year": max(years) if years else 2025,
        }

    def get_pattern_counts(
        self,
        conn: sqlite3.Connection,
    ) -> dict:
        """
        Return all pattern match counts in a single request.

        Replaces 4+ separate per_page=1 queries from DetectivePatterns page.
        """
        cursor = conn.cursor()
        counts: dict[str, int] = {}

        # Critical-risk contracts
        cursor.execute("SELECT COUNT(*) FROM contracts WHERE risk_level = 'critical'")
        counts["critical"] = cursor.fetchone()[0]

        # Year-end high-risk (December rush)
        cursor.execute(
            "SELECT COUNT(*) FROM contracts WHERE risk_level IN ('high', 'critical') AND contract_month = 12"
        )
        counts["december_rush"] = cursor.fetchone()[0]

        # Threshold splitting
        cursor.execute(
            "SELECT COUNT(*) FROM contracts WHERE risk_factors LIKE '%split_%'"
        )
        counts["split_contracts"] = cursor.fetchone()[0]

        # Co-bidding flagged
        cursor.execute(
            "SELECT COUNT(*) FROM contracts WHERE risk_factors LIKE '%co_bid%'"
        )
        counts["co_bidding"] = cursor.fetchone()[0]

        # Price outliers
        if _table_exists(cursor, "price_hypotheses"):
            cursor.execute("SELECT COUNT(*) FROM price_hypotheses")
            counts["price_outliers"] = cursor.fetchone()[0]
        else:
            counts["price_outliers"] = 0

        return {"counts": counts}

    def get_money_flow(
        self,
        conn: sqlite3.Connection,
        *,
        sector_id: int | None = None,
        limit: int = 50,
    ) -> dict:
        """
        Top institution->vendor flows grouped by sector.

        Uses pre-computed tables (institution_top_vendors, vendor_stats, institution_stats)
        for fast response. Returns two layers: institution->sector and sector->vendor,
        suitable for Sankey/flow visualizations.
        """
        cursor = conn.cursor()
        flows: list[dict] = []
        total_value = 0.0
        total_contracts = 0

        sector_filter = ""
        params: list[Any] = []
        if sector_id is not None:
            sector_filter = "AND vs.primary_sector_id = ?"
            params = [sector_id]

        # Layer 1: institution -> sector
        cursor.execute(
            f"""
            SELECT
                itv.institution_id,
                COALESCE(i.siglas, i.name) AS institution_name,
                vs.primary_sector_id AS sector_id,
                s.name_es AS sector_name,
                SUM(itv.total_value_mxn) AS total_value,
                SUM(itv.contract_count) AS contract_count,
                AVG(itv.avg_risk_score) AS avg_risk
            FROM institution_top_vendors itv
            JOIN institutions i ON itv.institution_id = i.id
            JOIN vendor_stats vs ON itv.vendor_id = vs.vendor_id
            JOIN sectors s ON vs.primary_sector_id = s.id
            WHERE itv.total_value_mxn > 0 {sector_filter}
            GROUP BY itv.institution_id, vs.primary_sector_id
            ORDER BY total_value DESC
            LIMIT ?
            """,
            params + [limit],
        )

        for row in cursor.fetchall():
            flows.append({
                "source_type": "institution",
                "source_id": row["institution_id"],
                "source_name": row["institution_name"],
                "target_type": "sector",
                "target_id": row["sector_id"],
                "target_name": row["sector_name"],
                "value": round(row["total_value"], 2),
                "contracts": row["contract_count"],
                "avg_risk": round(row["avg_risk"], 4) if row["avg_risk"] else None,
            })
            total_value += row["total_value"]
            total_contracts += row["contract_count"]

        # Layer 2: sector -> vendor
        sector_filter2 = ""
        params2: list[Any] = []
        if sector_id is not None:
            sector_filter2 = "AND vs.primary_sector_id = ?"
            params2 = [sector_id]

        cursor.execute(
            f"""
            SELECT
                vs.primary_sector_id AS sector_id,
                s.name_es AS sector_name,
                vs.vendor_id,
                v.name AS vendor_name,
                vs.total_value_mxn AS total_value,
                vs.total_contracts AS contract_count,
                vs.avg_risk_score AS avg_risk
            FROM vendor_stats vs
            JOIN sectors s ON vs.primary_sector_id = s.id
            JOIN vendors v ON vs.vendor_id = v.id
            WHERE vs.total_value_mxn > 0 {sector_filter2}
            ORDER BY vs.total_value_mxn DESC
            LIMIT ?
            """,
            params2 + [limit],
        )

        for row in cursor.fetchall():
            flows.append({
                "source_type": "sector",
                "source_id": row["sector_id"],
                "source_name": row["sector_name"],
                "target_type": "vendor",
                "target_id": row["vendor_id"],
                "target_name": row["vendor_name"],
                "value": round(row["total_value"], 2),
                "contracts": row["contract_count"],
                "avg_risk": round(row["avg_risk"], 4) if row["avg_risk"] else None,
            })

        return {
            "flows": flows,
            "total_value": round(total_value, 2),
            "total_contracts": total_contracts,
        }


# Singleton instance for router use
analysis_service = AnalysisService()
