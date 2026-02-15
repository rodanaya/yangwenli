"""
Report domain service — extracted from reports.py router.

Handles vendor deep-dive and sector summary report generation.
Router becomes thin: parse request → call service → return response.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime
from typing import Any

import structlog

from .base_service import BaseService

logger = structlog.get_logger("yang_wenli.services.report")


class ReportService(BaseService):
    """Business logic for investigation reports."""

    def generate_vendor_report(
        self,
        conn: sqlite3.Connection,
        vendor_id: int,
    ) -> dict | None:
        """
        Generate comprehensive vendor deep-dive report.

        Returns vendor profile, contract stats, risk breakdown,
        price hypotheses, network connections, and red flags.
        """
        cursor = conn.cursor()

        # --- Vendor profile ---
        vendor = self._execute_one(
            conn,
            """
            SELECT id, name, rfc, name_normalized, size_stratification,
                   is_verified_sat, first_contract_date, last_contract_date,
                   total_contracts, total_amount_mxn
            FROM vendors WHERE id = ?
            """,
            (vendor_id,),
        )
        if vendor is None:
            return None

        first_date = vendor["first_contract_date"]
        last_date = vendor["last_contract_date"]
        years_active = 1
        if first_date and last_date:
            try:
                years_active = max(1, int(last_date[:4]) - int(first_date[:4]) + 1)
            except (ValueError, TypeError, IndexError):
                pass

        profile = {
            "vendor_id": vendor["id"],
            "name": vendor["name"],
            "rfc": vendor["rfc"],
            "name_normalized": vendor["name_normalized"],
            "first_contract_date": first_date,
            "last_contract_date": last_date,
            "years_active": years_active,
            "size_stratification": vendor["size_stratification"],
            "is_verified": bool(vendor["is_verified_sat"]),
        }

        # --- Contract statistics ---
        contract_stats = self._execute_one(
            conn,
            """
            SELECT COUNT(*) as total_count,
                   COALESCE(SUM(amount_mxn), 0) as total_value,
                   COALESCE(AVG(amount_mxn), 0) as avg_value
            FROM contracts WHERE vendor_id = ?
            """,
            (vendor_id,),
        )

        by_sector = {
            row["name_es"]: row["cnt"]
            for row in self._execute_many(
                conn,
                """
                SELECT s.name_es, COUNT(*) as cnt
                FROM contracts c JOIN sectors s ON c.sector_id = s.id
                WHERE c.vendor_id = ? GROUP BY s.id ORDER BY cnt DESC
                """,
                (vendor_id,),
            )
        }

        by_year = {
            row["contract_year"]: row["cnt"]
            for row in self._execute_many(
                conn,
                """
                SELECT contract_year, COUNT(*) as cnt
                FROM contracts WHERE vendor_id = ? AND contract_year IS NOT NULL
                GROUP BY contract_year ORDER BY contract_year
                """,
                (vendor_id,),
            )
        }

        by_procedure = {
            row["proc_type"]: row["cnt"]
            for row in self._execute_many(
                conn,
                """
                SELECT
                    CASE
                        WHEN is_direct_award = 1 THEN 'Adjudicacion Directa'
                        WHEN procedure_type_normalized = 'licitacion' THEN 'Licitacion Publica'
                        WHEN procedure_type_normalized = 'invitacion' THEN 'Invitacion'
                        ELSE 'Otro'
                    END as proc_type,
                    COUNT(*) as cnt
                FROM contracts WHERE vendor_id = ?
                GROUP BY proc_type ORDER BY cnt DESC
                """,
                (vendor_id,),
            )
        }

        contracts = {
            "total_count": contract_stats["total_count"],
            "total_value_mxn": contract_stats["total_value"],
            "avg_value_mxn": contract_stats["avg_value"],
            "by_sector": by_sector,
            "by_year": by_year,
            "by_procedure_type": by_procedure,
        }

        # --- Risk profile ---
        risk_stats = self._execute_one(
            conn,
            """
            SELECT
                COALESCE(AVG(risk_score), 0) as avg_risk,
                COALESCE(MAX(risk_score), 0) as max_risk,
                SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium,
                SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low,
                SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid,
                SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award,
                COUNT(*) as total
            FROM contracts WHERE vendor_id = ?
            """,
            (vendor_id,),
        )

        # Risk factors breakdown
        factor_rows = self._execute_many(
            conn,
            """
            SELECT risk_factors, COUNT(*) as cnt
            FROM contracts
            WHERE vendor_id = ? AND risk_factors IS NOT NULL AND risk_factors != ''
            GROUP BY risk_factors ORDER BY cnt DESC LIMIT 10
            """,
            (vendor_id,),
        )
        total_with_factors = sum(r["cnt"] for r in factor_rows)
        factors_breakdown = [
            {
                "factor": r["risk_factors"],
                "count": r["cnt"],
                "percentage": 100.0 * r["cnt"] / total_with_factors if total_with_factors > 0 else 0,
            }
            for r in factor_rows
        ]

        total = risk_stats["total"] or 1
        risk = {
            "avg_risk_score": risk_stats["avg_risk"],
            "max_risk_score": risk_stats["max_risk"],
            "by_risk_level": {
                "critical": risk_stats["critical"] or 0,
                "high": risk_stats["high"] or 0,
                "medium": risk_stats["medium"] or 0,
                "low": risk_stats["low"] or 0,
            },
            "risk_factors_breakdown": factors_breakdown,
            "single_bid_count": risk_stats["single_bid"] or 0,
            "single_bid_pct": 100.0 * (risk_stats["single_bid"] or 0) / total,
            "direct_award_count": risk_stats["direct_award"] or 0,
            "direct_award_pct": 100.0 * (risk_stats["direct_award"] or 0) / total,
        }

        # --- Price hypotheses ---
        hyp_stats = self._execute_one(
            conn,
            """
            SELECT COUNT(*) as total, AVG(confidence) as avg_conf
            FROM price_hypotheses WHERE vendor_id = ?
            """,
            (vendor_id,),
        )

        hyp_by_type = {
            row["hypothesis_type"]: row["cnt"]
            for row in self._execute_many(
                conn,
                """
                SELECT hypothesis_type, COUNT(*) as cnt
                FROM price_hypotheses WHERE vendor_id = ?
                GROUP BY hypothesis_type
                """,
                (vendor_id,),
            )
        }

        top_hypotheses = [
            dict(row)
            for row in self._execute_many(
                conn,
                """
                SELECT hypothesis_id, hypothesis_type, confidence, explanation, amount_mxn
                FROM price_hypotheses WHERE vendor_id = ?
                ORDER BY confidence DESC LIMIT 5
                """,
                (vendor_id,),
            )
        ]

        price_hypotheses = {
            "total_count": hyp_stats["total"] or 0,
            "by_type": hyp_by_type,
            "avg_confidence": hyp_stats["avg_conf"] or 0,
            "top_hypotheses": top_hypotheses,
        }

        # --- Network connections ---
        inst_count_row = self._execute_one(
            conn,
            "SELECT COUNT(DISTINCT institution_id) as inst_count FROM contracts WHERE vendor_id = ?",
            (vendor_id,),
        )
        inst_count = inst_count_row["inst_count"] if inst_count_row else 0

        top_institutions = [
            dict(row)
            for row in self._execute_many(
                conn,
                """
                SELECT i.id, i.name, COUNT(*) as contract_count, SUM(c.amount_mxn) as total_value
                FROM contracts c JOIN institutions i ON c.institution_id = i.id
                WHERE c.vendor_id = ?
                GROUP BY i.id ORDER BY total_value DESC LIMIT 10
                """,
                (vendor_id,),
            )
        ]

        sector_value_rows = self._execute_many(
            conn,
            """
            SELECT s.code, SUM(c.amount_mxn) as value
            FROM contracts c JOIN sectors s ON c.sector_id = s.id
            WHERE c.vendor_id = ? GROUP BY s.id
            """,
            (vendor_id,),
        )
        sector_values = {row["code"]: row["value"] or 0 for row in sector_value_rows}
        total_sv = sum(sector_values.values()) or 1
        sector_concentration = {k: 100.0 * v / total_sv for k, v in sector_values.items()}

        network = {
            "institution_count": inst_count,
            "top_institutions": top_institutions,
            "co_bidder_count": 0,
            "sector_concentration": sector_concentration,
        }

        # --- Red flags ---
        flags: list[str] = []
        severity = "low"

        if risk["single_bid_pct"] > 50:
            flags.append(f"High single-bid rate: {risk['single_bid_pct']:.1f}%")
            severity = "high"
        elif risk["single_bid_pct"] > 30:
            flags.append(f"Elevated single-bid rate: {risk['single_bid_pct']:.1f}%")
            if severity == "low":
                severity = "medium"

        if risk["direct_award_pct"] > 80:
            flags.append(f"Very high direct award rate: {risk['direct_award_pct']:.1f}%")
            severity = "high"
        elif risk["direct_award_pct"] > 60:
            flags.append(f"High direct award rate: {risk['direct_award_pct']:.1f}%")
            if severity == "low":
                severity = "medium"

        if price_hypotheses["total_count"] > 10:
            flags.append(f"Multiple price anomalies detected: {price_hypotheses['total_count']}")
            if severity == "low":
                severity = "medium"

        if risk["by_risk_level"].get("critical", 0) > 0:
            flags.append(f"Has {risk['by_risk_level']['critical']} critical-risk contracts")
            severity = "critical"
        elif risk["by_risk_level"].get("high", 0) > 5:
            flags.append(f"Has {risk['by_risk_level']['high']} high-risk contracts")
            severity = "high"

        max_conc = max(sector_concentration.values()) if sector_concentration else 0
        if max_conc > 80:
            flags.append(f"High sector concentration: {max_conc:.1f}% in one sector")

        if not flags:
            flags.append("No significant red flags detected")

        red_flags = {"flags": flags, "severity": severity}

        return {
            "report_type": "vendor_deep_dive",
            "generated_at": datetime.now().isoformat(),
            "profile": profile,
            "contracts": contracts,
            "risk": risk,
            "price_hypotheses": price_hypotheses,
            "network": network,
            "red_flags": red_flags,
        }

    def generate_sector_report(
        self,
        conn: sqlite3.Connection,
        sector_id: int,
    ) -> dict | None:
        """
        Generate sector corruption summary report.

        Returns sector overview, top vendors, risky contracts,
        risk factor distribution, price hypotheses, and year trends.
        """
        sector = self._execute_one(
            conn,
            "SELECT id, code, name_es FROM sectors WHERE id = ?",
            (sector_id,),
        )
        if sector is None:
            return None

        # Contract summary
        stats = self._execute_one(
            conn,
            """
            SELECT
                COUNT(*) as total,
                COALESCE(SUM(amount_mxn), 0) as total_value,
                COALESCE(AVG(amount_mxn), 0) as avg_value,
                COALESCE(AVG(risk_score), 0) as avg_risk,
                SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium,
                SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low
            FROM contracts WHERE sector_id = ?
            """,
            (sector_id,),
        )

        by_year = {
            row["contract_year"]: row["cnt"]
            for row in self._execute_many(
                conn,
                """
                SELECT contract_year, COUNT(*) as cnt
                FROM contracts WHERE sector_id = ? AND contract_year IS NOT NULL
                GROUP BY contract_year
                """,
                (sector_id,),
            )
        }

        contracts = {
            "total_count": stats["total"],
            "total_value_mxn": stats["total_value"],
            "avg_value_mxn": stats["avg_value"],
            "avg_risk_score": stats["avg_risk"],
            "by_risk_level": {
                "critical": stats["critical"] or 0,
                "high": stats["high"] or 0,
                "medium": stats["medium"] or 0,
                "low": stats["low"] or 0,
            },
            "by_year": by_year,
        }

        # Top vendors by value
        top_vendors = [
            {
                "vendor_id": row["id"],
                "name": row["name"],
                "rfc": row["rfc"],
                "contract_count": row["contract_count"],
                "total_value_mxn": row["total_value"] or 0,
                "avg_risk_score": row["avg_risk"] or 0,
            }
            for row in self._execute_many(
                conn,
                """
                SELECT v.id, v.name, v.rfc,
                       COUNT(*) as contract_count,
                       SUM(c.amount_mxn) as total_value,
                       AVG(c.risk_score) as avg_risk
                FROM contracts c JOIN vendors v ON c.vendor_id = v.id
                WHERE c.sector_id = ?
                GROUP BY v.id ORDER BY total_value DESC LIMIT 10
                """,
                (sector_id,),
            )
        ]

        # Top risky contracts
        top_risky = [
            {
                "contract_id": row["id"],
                "title": row["title"],
                "amount_mxn": row["amount_mxn"] or 0,
                "vendor_name": row["vendor_name"],
                "contract_date": row["contract_date"],
                "risk_score": row["risk_score"] or 0,
                "risk_factors": row["risk_factors"],
            }
            for row in self._execute_many(
                conn,
                """
                SELECT c.id, c.title, c.amount_mxn, v.name as vendor_name,
                       c.contract_date, c.risk_score, c.risk_factors
                FROM contracts c JOIN vendors v ON c.vendor_id = v.id
                WHERE c.sector_id = ? AND c.risk_score IS NOT NULL
                ORDER BY c.risk_score DESC LIMIT 10
                """,
                (sector_id,),
            )
        ]

        # Risk factor distribution
        factor_rows = self._execute_many(
            conn,
            """
            SELECT risk_factors, COUNT(*) as cnt
            FROM contracts
            WHERE sector_id = ? AND risk_factors IS NOT NULL AND risk_factors != ''
            GROUP BY risk_factors ORDER BY cnt DESC LIMIT 15
            """,
            (sector_id,),
        )
        total_with_factors = sum(r["cnt"] for r in factor_rows)
        risk_factors = [
            {
                "factor": r["risk_factors"],
                "count": r["cnt"],
                "percentage": 100.0 * r["cnt"] / total_with_factors if total_with_factors > 0 else 0,
            }
            for r in factor_rows
        ]

        # Price hypotheses
        hyp = self._execute_one(
            conn,
            """
            SELECT COUNT(*) as total, AVG(confidence) as avg_conf,
                   SUM(CASE WHEN confidence >= 0.85 THEN 1 ELSE 0 END) as high_conf
            FROM price_hypotheses WHERE sector_id = ?
            """,
            (sector_id,),
        )
        hyp_by_type = {
            row["hypothesis_type"]: row["cnt"]
            for row in self._execute_many(
                conn,
                """
                SELECT hypothesis_type, COUNT(*) as cnt
                FROM price_hypotheses WHERE sector_id = ?
                GROUP BY hypothesis_type
                """,
                (sector_id,),
            )
        }
        price_hypotheses = {
            "total_hypotheses": hyp["total"] or 0,
            "by_type": hyp_by_type,
            "avg_confidence": hyp["avg_conf"] or 0,
            "high_confidence_count": hyp["high_conf"] or 0,
        }

        # Year trends
        year_trends: dict[int, dict] = {}
        for row in self._execute_many(
            conn,
            """
            SELECT contract_year, COUNT(*) as contracts,
                   SUM(amount_mxn) as value, AVG(risk_score) as avg_risk,
                   SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
                   COUNT(DISTINCT vendor_id) as vendors
            FROM contracts WHERE sector_id = ? AND contract_year IS NOT NULL
            GROUP BY contract_year ORDER BY contract_year
            """,
            (sector_id,),
        ):
            year_trends[row["contract_year"]] = {
                "contracts": row["contracts"],
                "value": row["value"] or 0,
                "avg_risk": row["avg_risk"] or 0,
                "direct_awards": row["direct_awards"],
                "direct_award_pct": (
                    100.0 * row["direct_awards"] / row["contracts"]
                    if row["contracts"] > 0
                    else 0
                ),
                "vendors": row["vendors"],
            }

        # Notable findings
        findings: list[str] = []
        if stats["critical"] and stats["critical"] > 0:
            findings.append(f"Contains {stats['critical']} critical-risk contracts requiring investigation")
        if stats["avg_risk"] > 0.25:
            findings.append(f"Average risk score ({stats['avg_risk']:.3f}) above median")
        if price_hypotheses["total_hypotheses"] > 1000:
            findings.append(f"High volume of price anomalies: {price_hypotheses['total_hypotheses']:,}")
        if top_vendors and top_vendors[0]["total_value_mxn"] > stats["total_value"] * 0.2:
            findings.append(
                f"Top vendor concentration: {top_vendors[0]['name']} holds >20% of sector value"
            )
        if not findings:
            findings.append("No major anomalies detected in this sector")

        return {
            "report_type": "sector_summary",
            "generated_at": datetime.now().isoformat(),
            "sector_id": sector_id,
            "sector_name": sector["name_es"],
            "sector_code": sector["code"],
            "contracts": contracts,
            "top_vendors": top_vendors,
            "top_risky_contracts": top_risky,
            "risk_factor_distribution": risk_factors,
            "price_hypotheses": price_hypotheses,
            "year_trends": year_trends,
            "notable_findings": findings,
        }


# Singleton instance for router use
report_service = ReportService()
