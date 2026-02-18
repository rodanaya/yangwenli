"""
Network domain service — extracted from network.py router.

Handles network graph construction, co-bidding analysis,
and institution-vendor relationship queries.
Router becomes thin: parse request → call service → return response.
"""
from __future__ import annotations

import sqlite3
from typing import Any

import structlog

from .base_service import BaseService

logger = structlog.get_logger("rubli.services.network")

# Max contract value used to filter out data errors
_MAX_CONTRACT_VALUE = 100_000_000_000


class NetworkService(BaseService):
    """Business logic for network/graph queries."""

    def get_network_graph(
        self,
        conn: sqlite3.Connection,
        *,
        vendor_id: int | None = None,
        institution_id: int | None = None,
        sector_id: int | None = None,
        year: int | None = None,
        min_value: float | None = None,
        min_contracts: int = 10,
        depth: int = 1,
        limit: int = 50,
    ) -> dict:
        """
        Build network graph data for vendor-institution relationships.

        Can be centered on a specific vendor, institution, or show top connections.
        Returns nodes and links suitable for force-directed graph visualization.
        """
        cursor = conn.cursor()
        nodes: dict[str, dict] = {}
        links: list[dict] = []

        # Base conditions
        conditions = ["COALESCE(c.amount_mxn, 0) <= ?"]
        params: list[Any] = [_MAX_CONTRACT_VALUE]

        if sector_id is not None:
            conditions.append("c.sector_id = ?")
            params.append(sector_id)
        if year is not None:
            conditions.append("c.contract_year = ?")
            params.append(year)

        where_clause = " AND ".join(conditions)

        if vendor_id is not None:
            self._build_vendor_centered(
                cursor, vendor_id, where_clause, params,
                min_contracts, depth, limit, nodes, links,
            )
        elif institution_id is not None:
            self._build_institution_centered(
                cursor, institution_id, where_clause, params,
                min_contracts, limit, nodes, links,
            )
        else:
            self._build_top_connections(
                cursor, where_clause, params,
                min_contracts, min_value, limit, nodes, links,
            )

        return {
            "nodes": list(nodes.values())[:limit],
            "links": links,
            "total_nodes": len(nodes),
            "total_links": len(links),
            "total_value": sum(n["value"] for n in nodes.values()),
        }

    def _build_vendor_centered(
        self,
        cursor: sqlite3.Cursor,
        vendor_id: int,
        where_clause: str,
        params: list[Any],
        min_contracts: int,
        depth: int,
        limit: int,
        nodes: dict[str, dict],
        links: list[dict],
    ) -> None:
        """Build graph centered on a specific vendor."""
        cursor.execute(
            f"""
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
            """,
            (vendor_id, *params, min_contracts, limit),
        )
        rows = cursor.fetchall()
        if not rows:
            return

        # Central vendor node
        vendor_name = rows[0]["vendor_name"]
        nodes[f"v-{vendor_id}"] = {
            "id": f"v-{vendor_id}",
            "type": "vendor",
            "name": vendor_name,
            "value": sum(r["total_value"] for r in rows),
            "contracts": sum(r["contract_count"] for r in rows),
            "risk_score": (
                sum(r["avg_risk"] * r["contract_count"] for r in rows)
                / max(1, sum(r["contract_count"] for r in rows))
            ),
        }

        for row in rows:
            inst_id = f"i-{row['institution_id']}"
            if inst_id not in nodes:
                nodes[inst_id] = {
                    "id": inst_id,
                    "type": "institution",
                    "name": row["institution_name"],
                    "value": row["total_value"],
                    "contracts": row["contract_count"],
                    "metadata": {"institution_type": row["institution_type"]},
                }
            links.append({
                "source": f"v-{vendor_id}",
                "target": inst_id,
                "value": row["total_value"],
                "contracts": row["contract_count"],
                "avg_risk": round(row["avg_risk"], 4) if row["avg_risk"] else None,
                "relationship": "contracts",
            })

        # Depth > 1: other vendors connected to same institutions
        if depth > 1 and links:
            inst_ids = [lk["target"].replace("i-", "") for lk in links]
            placeholders = ",".join("?" * len(inst_ids))

            cursor.execute(
                f"""
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
                """,
                (*inst_ids, vendor_id, *params, max(1, min_contracts // 2), limit - len(nodes)),
            )
            for row in cursor.fetchall():
                vid = f"v-{row['vendor_id']}"
                if vid not in nodes:
                    nodes[vid] = {
                        "id": vid,
                        "type": "vendor",
                        "name": row["vendor_name"],
                        "value": row["total_value"],
                        "contracts": row["contract_count"],
                        "risk_score": round(row["avg_risk"], 4) if row["avg_risk"] else None,
                    }
                links.append({
                    "source": vid,
                    "target": f"i-{row['institution_id']}",
                    "value": row["total_value"],
                    "contracts": row["contract_count"],
                    "avg_risk": round(row["avg_risk"], 4) if row["avg_risk"] else None,
                    "relationship": "contracts",
                })

    def _build_institution_centered(
        self,
        cursor: sqlite3.Cursor,
        institution_id: int,
        where_clause: str,
        params: list[Any],
        min_contracts: int,
        limit: int,
        nodes: dict[str, dict],
        links: list[dict],
    ) -> None:
        """Build graph centered on a specific institution."""
        cursor.execute(
            f"""
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
            """,
            (institution_id, *params, min_contracts, limit),
        )
        rows = cursor.fetchall()
        if not rows:
            return

        nodes[f"i-{institution_id}"] = {
            "id": f"i-{institution_id}",
            "type": "institution",
            "name": rows[0]["institution_name"],
            "value": sum(r["total_value"] for r in rows),
            "contracts": sum(r["contract_count"] for r in rows),
            "metadata": {"institution_type": rows[0]["institution_type"]},
        }

        for row in rows:
            vid = f"v-{row['vendor_id']}"
            if vid not in nodes:
                nodes[vid] = {
                    "id": vid,
                    "type": "vendor",
                    "name": row["vendor_name"],
                    "value": row["total_value"],
                    "contracts": row["contract_count"],
                    "risk_score": round(row["avg_risk"], 4) if row["avg_risk"] else None,
                }
            links.append({
                "source": f"i-{institution_id}",
                "target": vid,
                "value": row["total_value"],
                "contracts": row["contract_count"],
                "avg_risk": round(row["avg_risk"], 4) if row["avg_risk"] else None,
                "relationship": "contracts",
            })

    def _build_top_connections(
        self,
        cursor: sqlite3.Cursor,
        where_clause: str,
        params: list[Any],
        min_contracts: int,
        min_value: float | None,
        limit: int,
        nodes: dict[str, dict],
        links: list[dict],
    ) -> None:
        """Build graph from top vendor-institution connections."""
        cursor.execute(
            f"""
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
            """,
            (*params, min_contracts, min_value or 0, limit * 2),
        )

        for row in cursor.fetchall():
            vid = f"v-{row['vendor_id']}"
            iid = f"i-{row['institution_id']}"

            if vid not in nodes:
                nodes[vid] = {
                    "id": vid,
                    "type": "vendor",
                    "name": row["vendor_name"],
                    "value": row["total_value"],
                    "contracts": row["contract_count"],
                    "risk_score": round(row["avg_risk"], 4) if row["avg_risk"] else None,
                }
            if iid not in nodes:
                nodes[iid] = {
                    "id": iid,
                    "type": "institution",
                    "name": row["institution_name"],
                    "value": row["total_value"],
                    "contracts": row["contract_count"],
                }

            links.append({
                "source": vid,
                "target": iid,
                "value": row["total_value"],
                "contracts": row["contract_count"],
                "avg_risk": round(row["avg_risk"], 4) if row["avg_risk"] else None,
                "relationship": "contracts",
            })

            if len(nodes) >= limit:
                break

    def get_co_bidders(
        self,
        conn: sqlite3.Connection,
        vendor_id: int,
        *,
        min_procedures: int = 3,
        limit: int = 20,
    ) -> dict | None:
        """
        Analyze co-bidding patterns for a vendor.

        Returns co-bidders ranked by shared procedure count,
        with relationship strength and suspicious pattern detection.
        """
        cursor = conn.cursor()

        # Verify vendor exists
        cursor.execute("SELECT name FROM vendors WHERE id = ?", (vendor_id,))
        vendor = cursor.fetchone()
        if vendor is None:
            return None

        # Total procedures for this vendor
        cursor.execute(
            """
            SELECT COUNT(DISTINCT procedure_number)
            FROM contracts
            WHERE vendor_id = ? AND procedure_number IS NOT NULL AND procedure_number != ''
            """,
            (vendor_id,),
        )
        total_procedures = cursor.fetchone()[0] or 0

        # Find co-bidders
        cursor.execute(
            """
            WITH target_procedures AS (
                SELECT DISTINCT procedure_number
                FROM contracts
                WHERE vendor_id = ?
                AND procedure_number IS NOT NULL AND procedure_number != ''
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
                co_vendor_id, co_vendor_name,
                COUNT(DISTINCT procedure_number) as co_bid_count,
                SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) as win_count
            FROM co_bids
            GROUP BY co_vendor_id, co_vendor_name
            HAVING co_bid_count >= ?
            ORDER BY co_bid_count DESC
            LIMIT ?
            """,
            (vendor_id, vendor_id, min_procedures, limit),
        )

        co_bidders = []
        for row in cursor.fetchall():
            co_bid_count = row["co_bid_count"]
            win_count = row["win_count"]
            same_winner_ratio = win_count / co_bid_count if co_bid_count > 0 else 0

            if co_bid_count >= 20:
                strength = "very_strong"
            elif co_bid_count >= 10:
                strength = "strong"
            elif co_bid_count >= 5:
                strength = "moderate"
            else:
                strength = "weak"

            co_bidders.append({
                "vendor_id": row["co_vendor_id"],
                "vendor_name": row["co_vendor_name"],
                "co_bid_count": co_bid_count,
                "win_count": win_count,
                "loss_count": co_bid_count - win_count,
                "same_winner_ratio": round(same_winner_ratio, 3),
                "relationship_strength": strength,
            })

        # Suspicious patterns
        suspicious_patterns: list[dict] = []

        # Cover bidding: always lose when co-bidding
        potential_covers = [
            cb for cb in co_bidders
            if cb["co_bid_count"] >= 5 and cb["same_winner_ratio"] < 0.1
        ]
        if potential_covers:
            suspicious_patterns.append({
                "pattern": "potential_cover_bidding",
                "description": f"{len(potential_covers)} vendors win <10% when bidding against target",
                "vendors": [
                    {"id": v["vendor_id"], "name": v["vendor_name"], "win_rate": v["same_winner_ratio"]}
                    for v in potential_covers[:3]
                ],
            })

        # Bid rotation: alternating winners
        high_frequency = [
            cb for cb in co_bidders
            if cb["co_bid_count"] >= 10 and 0.4 < cb["same_winner_ratio"] < 0.6
        ]
        if len(high_frequency) >= 2:
            suspicious_patterns.append({
                "pattern": "potential_bid_rotation",
                "description": f"{len(high_frequency)} vendors with ~50% win rate in frequent co-bids",
                "vendors": [
                    {"id": v["vendor_id"], "name": v["vendor_name"], "co_bids": v["co_bid_count"]}
                    for v in high_frequency[:3]
                ],
            })

        return {
            "vendor_id": vendor_id,
            "vendor_name": vendor["name"],
            "co_bidders": co_bidders,
            "total_procedures": total_procedures,
            "suspicious_patterns": suspicious_patterns,
        }


# Singleton instance for router use
network_service = NetworkService()
