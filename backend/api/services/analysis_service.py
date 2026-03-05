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
        direct_award_only: bool = False,
    ) -> dict:
        """
        Top institution->vendor flows.

        Fast path (no filters): uses precomputed institution_top_vendors table.
        Filtered path (year or direct_award_only): queries contracts directly with
        proper indexes (idx_contracts_institution_year, idx_contracts_year).
        """
        cursor = conn.cursor()
        flows: list[dict] = []
        total_value = 0.0
        total_contracts = 0

        if year is not None or direct_award_only:
            # ── Filtered path: query contracts directly ─────────────────────
            where_parts = [
                "c.amount_mxn > 0",
                "c.amount_mxn < 100000000000",
                "c.institution_id IS NOT NULL",
                "c.vendor_id IS NOT NULL",
            ]
            params: list[Any] = []
            if year is not None:
                where_parts.append("c.contract_year = ?")
                params.append(year)
            if sector_id is not None:
                where_parts.append("c.sector_id = ?")
                params.append(sector_id)
            if direct_award_only:
                where_parts.append("c.is_direct_award = 1")
            where_clause = " AND ".join(where_parts)

            cursor.execute(
                f"""
                SELECT
                    c.institution_id,
                    i.name AS institution_name,
                    c.vendor_id,
                    v.name AS vendor_name,
                    SUM(c.amount_mxn) AS total_value,
                    COUNT(*) AS contract_count,
                    AVG(c.risk_score) AS avg_risk
                FROM contracts c
                JOIN institutions i ON c.institution_id = i.id
                JOIN vendors v ON c.vendor_id = v.id
                WHERE {where_clause}
                GROUP BY c.institution_id, c.vendor_id
                HAVING total_value > 0
                ORDER BY total_value DESC
                LIMIT ?
                """,
                params + [limit],
            )
        else:
            # ── Fast path: precomputed table ────────────────────────────────
            where_parts2 = ["itv.total_value_mxn > 0"]
            params2: list[Any] = []
            if sector_id is not None:
                where_parts2.append("i.sector_id = ?")
                params2.append(sector_id)
            where_clause2 = " AND ".join(where_parts2)

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
                WHERE {where_clause2}
                ORDER BY itv.total_value_mxn DESC
                LIMIT ?
                """,
                params2 + [limit],
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


    def get_structural_breaks(self, conn: sqlite3.Connection) -> dict:
        """
        Detect statistically significant change points in 23-year procurement trends.
        Uses PELT algorithm from ruptures library.
        Returns breakpoints per metric with the year and delta magnitude.
        """
        import numpy as np
        try:
            import ruptures as rpt
        except ImportError:
            return {"breakpoints": [], "error": "ruptures library not installed"}

        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT contract_year as year,
                   SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as direct_award_pct,
                   SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) * 100.0 /
                       NULLIF(SUM(CASE WHEN is_direct_award = 0 THEN 1 ELSE 0 END), 0) as single_bid_pct,
                   SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as high_risk_pct
            FROM contracts
            WHERE contract_year IS NOT NULL AND contract_year BETWEEN 2002 AND 2025
            GROUP BY contract_year
            ORDER BY contract_year
            """
        )
        rows = cursor.fetchall()
        if len(rows) < 5:
            return {"breakpoints": []}

        years = [row[0] for row in rows]
        metrics = {
            "direct_award_pct": [row[1] or 0 for row in rows],
            "single_bid_pct": [row[2] or 0 for row in rows],
            "high_risk_pct": [row[3] or 0 for row in rows],
        }

        breakpoints = []
        for metric_name, series in metrics.items():
            arr = np.array(series).reshape(-1, 1)
            try:
                # PELT with RBF cost — pen=5 gives ~2-4 breaks on this data
                algo = rpt.Pelt(model="rbf", min_size=2, jump=1).fit(arr)
                bkps = algo.predict(pen=5)
                for bp_idx in bkps[:-1]:  # last element is always len(series)
                    if 0 < bp_idx < len(years):
                        before = float(np.mean(series[max(0, bp_idx - 3):bp_idx]))
                        after = float(np.mean(series[bp_idx:min(len(series), bp_idx + 3)]))
                        delta = round(after - before, 2)
                        breakpoints.append({
                            "metric": metric_name,
                            "year": int(years[bp_idx]),  # year AFTER the break
                            "delta": delta,
                            "direction": "increase" if delta > 0 else "decrease",
                        })
            except Exception:
                continue

        return {"breakpoints": breakpoints}


# Singleton instance for router use
analysis_service = AnalysisService()
