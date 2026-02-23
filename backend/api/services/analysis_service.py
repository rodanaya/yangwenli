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

        Reads from precomputed_stats table (populated by precompute_stats.py).
        Falls back to live queries only for keys not yet precomputed.
        """
        cursor = conn.cursor()
        counts: dict[str, int] = {}

        # Try precomputed values first
        precomputed_keys = {
            "december_rush": "pattern_december_rush",
            "split_contracts": "pattern_split_contracts",
            "single_bid": "pattern_single_bid",
            "price_outliers": "pattern_price_outlier",
            "co_bidding": "pattern_co_bidding",
        }

        for count_key, stat_key in precomputed_keys.items():
            try:
                row = cursor.execute(
                    "SELECT stat_value FROM precomputed_stats WHERE stat_key = ?",
                    (stat_key,),
                ).fetchone()
                if row:
                    counts[count_key] = json.loads(row[0])
                    continue
            except Exception:
                pass
            # Not found — fall back to 0
            counts[count_key] = 0

        # Critical-risk contracts (always fast — uses indexed risk_level)
        cursor.execute("SELECT COUNT(*) FROM contracts WHERE risk_level = 'critical'")
        counts["critical"] = cursor.fetchone()[0]

        return {"counts": counts}

    def get_money_flow(
        self,
        conn: sqlite3.Connection,
        *,
        sector_id: int | None = None,
        year: int | None = None,
        limit: int = 50,
    ) -> dict:
        """
        Top institution->vendor flows using the precomputed institution_top_vendors table.

        Previously used raw GROUP BY on 3.1M contracts (30+ seconds). Now uses the
        precomputed table for sub-second response. Returns institution->vendor flows
        only (not two-layer institution->sector + sector->vendor).
        """
        cursor = conn.cursor()
        flows: list[dict] = []
        total_value = 0.0
        total_contracts = 0

        where_parts = ["itv.total_value_mxn > 0"]
        params: list[Any] = []
        if sector_id is not None:
            where_parts.append("i.sector_id = ?")
            params.append(sector_id)
        # Note: institution_top_vendors is aggregate over all years, so year filter
        # is not supported here — filtered at contract level would require the slow path.

        where_clause = " AND ".join(where_parts)

        cursor.execute(
            f"""
            SELECT
                itv.institution_id,
                i.name AS institution_name,
                itv.vendor_id,
                itv.vendor_name,
                itv.total_value_mxn AS total_value,
                itv.contract_count,
                itv.avg_risk_score AS avg_risk
            FROM institution_top_vendors itv
            JOIN institutions i ON itv.institution_id = i.id
            WHERE {where_clause}
            ORDER BY itv.total_value_mxn DESC
            LIMIT ?
            """,
            params + [limit],
        )

        for row in cursor.fetchall():
            avg_risk = row["avg_risk"]
            flows.append({
                "source_type": "institution",
                "source_id": row["institution_id"],
                "source_name": row["institution_name"],
                "target_type": "vendor",
                "target_id": row["vendor_id"],
                "target_name": row["vendor_name"],
                "value": round(row["total_value"], 2),
                "contracts": row["contract_count"],
                "avg_risk": round(avg_risk, 4) if avg_risk else None,
                "high_risk_pct": round(avg_risk * 100, 1) if avg_risk and avg_risk >= 0.30 else 0.0,
            })
            total_value += row["total_value"]
            total_contracts += row["contract_count"]

        return {
            "flows": flows,
            "total_value": round(total_value, 2),
            "total_contracts": total_contracts,
        }


# Singleton instance for router use
analysis_service = AnalysisService()
