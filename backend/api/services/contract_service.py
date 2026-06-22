"""
Contract domain service — extracted from contracts.py router.

Handles contract listing, detail, statistics, and risk breakdown queries.
Router becomes thin: parse request → call service → return response.
"""
from __future__ import annotations

import json
import math
import sqlite3
import time
from typing import Any

import structlog

from .base_service import BaseService
from .query_builder import QueryBuilder
from .pagination import paginate_query, PaginatedResult

logger = structlog.get_logger("rubli.services.contract")

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
    "sector_id": "c.sector_id",
    "risk_level": "c.risk_level",
    "mahalanobis_distance": "c.mahalanobis_distance",
    "ensemble_anomaly": "c.ensemble_anomaly_score",
    "publication_delay": "c.publication_delay_days",
}

# Map known risk_factor values to indexed boolean columns (avoid full-table LIKE).
# Shared by list_contracts and highlights so the two stay in lockstep.
_RISK_FACTOR_COLUMN_MAP = {
    "direct_award": ("c.is_direct_award = ?", 1),
    "single_bid": ("c.is_single_bid = ?", 1),
    "year_end": ("c.is_year_end = ?", 1),
    # "price_hyp" has no column — falls through to the LIKE path (token in
    # the risk_factors TEXT). Mirrored in export.py.
}

# "Los Señalados" band — the top-risk pass only features genuinely flagged
# contracts (risk_score ≥ 0.40 = high + critical, RISK_THRESHOLDS.high). The
# float floor lets the unfiltered + risk-based cases ride idx_c_risk_score
# directly (a range scan in risk order); filtered cases fall back to the
# sector/risk composite indexes or the budget guard below.
_BAND_RISK_FLOOR = 0.40
# Hard wall-clock budget (seconds) for the band's top-risk pass. A few rare
# high-cardinality filters (e.g. is_direct_award alone) have no index that
# avoids a large risk-sort; rather than let the async band hang, abort and
# degrade to the documented-case pass (always served from memory).
_BAND_TOP_BUDGET_S = 1.5

# Documented-case seal — evidence gate. A contract is sealed ONLY when it is in
# a STRONG-evidence ground-truth row (audit-attested / confirmed / high / direct)
# AND that case is one of the 43 named procurement scandals (so the seal always
# resolves to a /cases/:slug page). Weak GT (the ~346K "medium" /
# L3_portfolio_swept vendor→all-contracts propagation flagged in the v0.9
# label-quality audit) gets NO seal — ~374 rows total. The seal is stamped from
# a memoized id→scandal map in _map_contract_row (an O(1) dict lookup), NOT a
# per-row SQL subquery, so the list projection stays cheap.
_DOCUMENTED_SEAL_QUERY = """
    SELECT gtc.contract_id, ps.slug, ps.name_es, ps.name_en
      FROM ground_truth_contracts gtc
      JOIN procurement_scandals ps ON ps.ground_truth_case_id = gtc.case_id
     WHERE gtc.evidence_tier = 'L1_audit_attested'
        OR gtc.evidence_strength IN ('confirmed_corrupt', 'high', 'direct')
     ORDER BY CASE WHEN gtc.evidence_tier = 'L1_audit_attested' THEN 0 ELSE 1 END,
              ps.severity DESC
"""

# Shared SELECT projection for list + highlights (identical row shape).
_LIST_COLUMNS = """
            c.id, c.contract_number, c.title, c.amount_mxn,
            c.contract_date, c.contract_year, c.sector_id,
            s.name_es as sector_name,
            c.risk_score, c.risk_level, c.is_direct_award, c.is_single_bid,
            v.name as vendor_name, v.rfc as vendor_rfc, v.is_individual as vendor_is_individual,
            i.name as institution_name,
            c.procedure_type, c.mahalanobis_distance,
            c.vendor_id, c.institution_id, c.risk_factors
"""


def parse_risk_factors(factors_str: str | None) -> list[str]:
    """Parse comma-separated risk factors string."""
    if not factors_str:
        return []
    return [f.strip() for f in factors_str.split(",") if f.strip()]


def _mask_personal_rfc(rfc: str | None) -> str | None:
    """Mask 13-char persona física RFCs (PII under LFPDPPP).

    12-char = persona moral (company) → public, pass through.
    13-char = persona física (individual) → null out.
    """
    if not rfc:
        return rfc
    return None if len(rfc.strip()) == 13 else rfc


class ContractService(BaseService):
    """Business logic for contract queries."""

    # Memoized seal map: { contract_id: (slug, name_es, name_en) } for the ~374
    # seal-eligible contracts (strong GT ∩ named scandal). Static per DB, cached
    # process-wide — the evidence columns aren't indexed (a ~350K gtc scan
    # ≈ 370 ms), so resolving it per request (or per row) would be wasteful.
    _documented_map: dict[int, tuple[str, str, str]] | None = None
    # Cached full display rows for the ~374 documented contracts (mapped dicts,
    # risk-sorted). The "Los Señalados" band filters THESE in Python rather than
    # joining the seal set against the 3.1M table — an IN-list + filter is
    # reliably mis-planned into a large scan; in-memory filtering is planner-proof.
    _documented_rows_cache: list[dict] | None = None

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
        category_id: int | None = None,
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
        qb = self._build_list_qb(
            sector_id=sector_id,
            year=year,
            vendor_id=vendor_id,
            institution_id=institution_id,
            risk_level=risk_level,
            is_direct_award=is_direct_award,
            is_single_bid=is_single_bid,
            risk_factor=risk_factor,
            category_id=category_id,
            min_amount=min_amount,
            max_amount=max_amount,
            search=search,
        )

        qb.sort(
            sort_by,
            sort_order,
            whitelist=CONTRACT_SORT_WHITELIST,
            default="c.contract_date DESC",
        )
        # Tiebreaker: when sorting by risk_score descending, use Mahalanobis
        # distance as a secondary sort so the ~96K contracts capped at 1.0
        # are ranked by anomaly severity rather than arbitrary insertion order.
        if sort_by == "risk_score" and sort_order.lower() == "desc":
            qb.order_by(
                "c.risk_score DESC, c.mahalanobis_distance DESC NULLS LAST"
            )

        # Warm the documented-case map so _map_contract_row can stamp the seal
        # via an O(1) dict lookup (no per-row SQL).
        self._documented_lookup(conn)
        return self._paginated_list(
            conn, qb, _LIST_COLUMNS, page, per_page,
            row_mapper=self._map_contract_row,
        )

    def _build_list_qb(
        self,
        *,
        sector_id: int | None = None,
        year: int | None = None,
        vendor_id: int | None = None,
        institution_id: int | None = None,
        risk_level: str | None = None,
        is_direct_award: bool | None = None,
        is_single_bid: bool | None = None,
        risk_factor: str | None = None,
        category_id: int | None = None,
        min_amount: float | None = None,
        max_amount: float | None = None,
        search: str | None = None,
    ) -> QueryBuilder:
        """Build the shared contract-list QueryBuilder (joins + filters).

        Used by both ``list_contracts`` (adds sort + pagination) and
        ``highlights`` (adds a risk sort + LIMIT) so filter semantics never
        drift between the table and the "Los Señalados" band.
        """
        qb = QueryBuilder("contracts c")
        qb.left_join("sectors s", "c.sector_id = s.id")
        qb.left_join("vendors v", "c.vendor_id = v.id")
        qb.left_join("institutions i", "c.institution_id = i.id")

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

        if category_id is not None:
            qb.where("c.category_id = ?", category_id)
        if search:
            qb.filter_search(search, ["c.title", "c.description"])
        if risk_factor:
            mapped = _RISK_FACTOR_COLUMN_MAP.get(risk_factor)
            if mapped:
                clause, val = mapped
                if val is not None:
                    qb.where(clause, val)
                else:
                    qb.where(clause)
            else:
                # Fallback to LIKE for other factors (co_bid, network, split, etc.)
                # Leading wildcard prevents index use; pagination limits blast radius
                qb.where("c.risk_factors LIKE ?", f"%{risk_factor}%")

        return qb

    def highlights(
        self,
        conn: sqlite3.Connection,
        *,
        sector_id: int | None = None,
        year: int | None = None,
        vendor_id: int | None = None,
        institution_id: int | None = None,
        risk_level: str | None = None,
        is_direct_award: bool | None = None,
        is_single_bid: bool | None = None,
        risk_factor: str | None = None,
        category_id: int | None = None,
        min_amount: float | None = None,
        max_amount: float | None = None,
        limit: int = 8,
    ) -> list[dict]:
        """Top contracts by risk for the current filter — feeds "Los Señalados".

        Same filters as ``list_contracts`` (no free-text search, no pagination),
        forced ``ORDER BY risk_score DESC`` with the documented-case seal. One
        lightweight query (LIMIT ~8, rides idx_c_risk_score); never runs a COUNT.
        The frontend re-orders documented-first and shows the top few.
        """
        limit = max(1, min(int(limit), 12))

        # Pass 1 — documented contracts matching this filter, served from the
        # cached ~374-row set and filtered in Python (planner-proof, instant).
        # No risk floor: a sourced, named case features at any score.
        def _match(r: dict) -> bool:
            if sector_id is not None and r["sector_id"] != sector_id:
                return False
            if year is not None and r["contract_year"] != year:
                return False
            if vendor_id is not None and r["vendor_id"] != vendor_id:
                return False
            if institution_id is not None and r["institution_id"] != institution_id:
                return False
            if risk_level is not None and r["risk_level"] != risk_level:
                return False
            if is_direct_award is not None and bool(r["is_direct_award"]) != bool(is_direct_award):
                return False
            if is_single_bid is not None and bool(r["is_single_bid"]) != bool(is_single_bid):
                return False
            amt = r["amount_mxn"] or 0
            if min_amount is not None and amt < min_amount:
                return False
            if max_amount is not None and amt > max_amount:
                return False
            if risk_factor is not None and risk_factor not in (r["risk_factors"] or []):
                return False
            # category_id is not carried on the mapped row → not applied here
            # (a rare band filter; the documented case still surfaces).
            return True

        doc_matched = [r for r in self._documented_rows(conn) if _match(r)][:limit]

        # Pass 2 — top genuinely-flagged contracts matching this filter, from SQL.
        # Floor at high+critical via risk_LEVEL (indexed) so the band stays honest
        # ("Los Señalados" = the flagged ones) and most filters serve from a
        # composite index. Guarded by a wall-clock budget so a rare un-indexable
        # filter (e.g. is_direct_award alone) degrades to the documented pass
        # rather than hanging the async band. Empty = honest "no standout flags".
        qb_top = self._build_list_qb(
            sector_id=sector_id, year=year, vendor_id=vendor_id,
            institution_id=institution_id, risk_level=risk_level,
            is_direct_award=is_direct_award, is_single_bid=is_single_bid,
            risk_factor=risk_factor, category_id=category_id,
            min_amount=min_amount, max_amount=max_amount,
        )
        qb_top.where("c.risk_score >= ?", _BAND_RISK_FLOOR)
        qb_top.order_by("c.risk_score DESC")  # no maha secondary (forces a filesort)
        sql, params = qb_top.build_select(_LIST_COLUMNS)
        sql += f" LIMIT {limit}"
        deadline = time.monotonic() + _BAND_TOP_BUDGET_S
        conn.set_progress_handler(lambda: 1 if time.monotonic() > deadline else 0, 20_000)
        try:
            top_rows = self._execute_many(conn, sql, params)
        except sqlite3.OperationalError:
            top_rows = []  # budget exceeded → degrade to the documented pass
        finally:
            conn.set_progress_handler(None, 0)

        # Merge: documented first (already mapped), then top-risk fill, dedup by id.
        seen: set[int] = set()
        merged: list[dict] = []
        for r in doc_matched:
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            merged.append(r)
            if len(merged) >= limit:
                return merged
        for row in top_rows:
            if row["id"] in seen:
                continue
            seen.add(row["id"])
            merged.append(self._map_contract_row(row))
            if len(merged) >= limit:
                break
        return merged

    def _documented_rows(self, conn: sqlite3.Connection) -> list[dict]:
        """Cached full display rows for the seal-eligible contracts (risk-sorted).
        Fetched once by PK (the only condition, so the planner uses the id index);
        see ``_documented_rows_cache``."""
        if ContractService._documented_rows_cache is None:
            ids = list(self._documented_lookup(conn).keys())
            if not ids:
                ContractService._documented_rows_cache = []
            else:
                qb = self._build_list_qb()
                placeholders = ",".join("?" * len(ids))
                qb.where(f"c.id IN ({placeholders})", *ids)
                qb.where("c.risk_score IS NOT NULL")
                qb.order_by("c.risk_score DESC")
                sql, params = qb.build_select(_LIST_COLUMNS)
                rows = self._execute_many(conn, sql, params)
                ContractService._documented_rows_cache = [
                    self._map_contract_row(r) for r in rows
                ]
        return ContractService._documented_rows_cache

    def _documented_lookup(self, conn: sqlite3.Connection) -> dict[int, tuple[str, str, str]]:
        """Process-wide cache: { contract_id: (slug, name_es, name_en) } for the
        seal-eligible contracts (strong GT ∩ named scandal). See ``_documented_map``.
        Rows are ordered best-evidence-first so the first hit per contract wins
        (dedups multi-case contracts + the PEMEX_LOZOYA twin-scandal case_id).
        Returns {} when the table is empty (e.g. the worktree stub DB)."""
        if ContractService._documented_map is None:
            rows = self._execute_many(conn, _DOCUMENTED_SEAL_QUERY)
            seal: dict[int, tuple[str, str, str]] = {}
            for r in rows:
                cid = r[0]
                if cid not in seal:
                    seal[cid] = (r[1], r[2], r[3])
            ContractService._documented_map = seal
        return ContractService._documented_map

    def _map_contract_row(self, row: sqlite3.Row) -> dict:
        """Map a contract database row to API response dict."""
        # Documented-case seal — O(1) lookup against the memoized map (no SQL).
        seal = (ContractService._documented_map or {}).get(row["id"])
        case_slug, case_name_es, case_name_en = seal if seal else (None, None, None)
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
            "vendor_rfc": _mask_personal_rfc(row["vendor_rfc"]),
            "vendor_is_individual": bool(row["vendor_is_individual"]) if row["vendor_is_individual"] is not None else None,
            "institution_name": row["institution_name"],
            "procedure_type": row["procedure_type"],
            "mahalanobis_distance": row["mahalanobis_distance"],
            "vendor_id": row["vendor_id"],
            "institution_id": row["institution_id"],
            "risk_factors": parse_risk_factors(row["risk_factors"]),
            "is_documented_case": case_slug is not None,
            "case_slug": case_slug,
            "case_name_es": case_name_es,
            "case_name_en": case_name_en,
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
                v.is_individual as vendor_is_individual,
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

    def get_contracts_by_ids(
        self,
        conn: sqlite3.Connection,
        contract_ids: list[int],
    ) -> list[dict]:
        """Batch-fetch multiple contracts in a single query (used by /compare)."""
        if not contract_ids:
            return []
        placeholders = ",".join("?" * len(contract_ids))
        cursor = conn.cursor()
        cursor.execute(
            f"""
            SELECT
                c.*,
                s.name_es as sector_name,
                v.name as vendor_name,
                v.rfc as vendor_rfc,
                v.is_individual as vendor_is_individual,
                i.name as institution_name,
                i.institution_type as institution_type
            FROM contracts c
            LEFT JOIN sectors s ON c.sector_id = s.id
            LEFT JOIN vendors v ON c.vendor_id = v.id
            LEFT JOIN institutions i ON c.institution_id = i.id
            WHERE c.id IN ({placeholders})
            ORDER BY c.id
            """,
            contract_ids,
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    # Z-feature column names matching the v5.0 pipeline
    Z_COLS = [
        'z_single_bid', 'z_direct_award', 'z_price_ratio',
        'z_vendor_concentration', 'z_ad_period_days', 'z_year_end',
        'z_same_day_count', 'z_network_member_count', 'z_co_bid_rate',
        'z_price_hyp_confidence', 'z_industry_mismatch', 'z_institution_risk',
        'z_price_volatility', 'z_sector_spread', 'z_win_rate',
        'z_institution_diversity',
    ]
    FACTOR_NAMES = [c.replace('z_', '') for c in Z_COLS]

    # Human-readable labels for each feature
    FACTOR_LABELS = {
        'single_bid': 'Single Bidder',
        'direct_award': 'Direct Award',
        'price_ratio': 'Price Anomaly',
        'vendor_concentration': 'Vendor Concentration',
        'ad_period_days': 'Ad Period Length',
        'year_end': 'Year-End Timing',
        'same_day_count': 'Same-Day Contracts',
        'network_member_count': 'Network Size',
        'co_bid_rate': 'Co-Bidding Rate',
        'price_hyp_confidence': 'Price Outlier Confidence',
        'industry_mismatch': 'Industry Mismatch',
        'institution_risk': 'Institution Risk',
        'price_volatility': 'Price Volatility',
        'sector_spread': 'Cross-Sector Activity',
        'win_rate': 'Win Rate',
        'institution_diversity': 'Institution Diversity',
    }

    def get_risk_explanation(
        self,
        conn: sqlite3.Connection,
        contract_id: int,
    ) -> dict | None:
        """
        Compute per-feature contribution to a contract's v5.0 risk score.

        For logistic regression P = sigmoid(intercept + sum(beta_i * z_i)) / c,
        each feature's contribution to the logit is beta_i * z_i.

        Returns dict with overall score, model info, and sorted feature contributions.
        """
        # 1. Get contract basic info + sector_id
        contract_row = self._execute_one(
            conn,
            """
            SELECT id, risk_score, risk_level, risk_model_version,
                   risk_confidence_lower, risk_confidence_upper,
                   sector_id, contract_year
            FROM contracts WHERE id = ?
            """,
            (contract_id,),
        )
        if contract_row is None:
            return None

        sector_id = contract_row["sector_id"]

        # 2. Get z-features for this contract
        z_cols_sql = ", ".join(self.Z_COLS)
        try:
            z_row = self._execute_one(
                conn,
                f"SELECT {z_cols_sql} FROM contract_z_features WHERE contract_id = ?",
                (contract_id,),
            )
        except sqlite3.OperationalError:
            # Table may not exist in deploy database
            z_row = None
        if z_row is None:
            # No z-features (pre-2002 data or missing)
            return {
                "contract_id": contract_id,
                "risk_score": contract_row["risk_score"] or 0,
                "risk_level": contract_row["risk_level"] or "unknown",
                "model_version": contract_row["risk_model_version"],
                "confidence_interval": {
                    "lower": contract_row["risk_confidence_lower"],
                    "upper": contract_row["risk_confidence_upper"],
                },
                "explanation_available": False,
                "features": [],
            }

        z_values = [z_row[col] or 0.0 for col in self.Z_COLS]

        # 3. Load the appropriate model (v6.x global, or v5.0 sector/global fallback)
        # Try v6.x global model first (active — picks latest by created_at)
        cal_row = self._execute_one(
            conn,
            """
            SELECT intercept, coefficients, pu_correction_factor, sector_id
            FROM model_calibration
            WHERE model_version LIKE 'v6%' AND sector_id IS NULL
            ORDER BY created_at DESC LIMIT 1
            """,
        )
        model_type = "global"
        if cal_row is None:
            # Fall back to v5.0 sector model
            cal_row = self._execute_one(
                conn,
                """
                SELECT intercept, coefficients, pu_correction_factor, sector_id
                FROM model_calibration
                WHERE model_version = 'v5.0' AND sector_id = ?
                ORDER BY created_at DESC LIMIT 1
                """,
                (sector_id,),
            )
            model_type = "sector"
        if cal_row is None:
            # Fall back to v5.0 global model
            cal_row = self._execute_one(
                conn,
                """
                SELECT intercept, coefficients, pu_correction_factor, sector_id
                FROM model_calibration
                WHERE model_version = 'v5.0' AND sector_id IS NULL
                ORDER BY created_at DESC LIMIT 1
                """,
            )
            model_type = "global"

        if cal_row is None:
            logger.warning("No v6.x/v5.0 calibration found", contract_id=contract_id)
            return {
                "contract_id": contract_id,
                "risk_score": contract_row["risk_score"] or 0,
                "risk_level": contract_row["risk_level"] or "unknown",
                "model_version": contract_row["risk_model_version"],
                "confidence_interval": {
                    "lower": contract_row["risk_confidence_lower"],
                    "upper": contract_row["risk_confidence_upper"],
                },
                "explanation_available": False,
                "features": [],
            }

        intercept = cal_row["intercept"]
        coefficients = json.loads(cal_row["coefficients"])
        pu_c = cal_row["pu_correction_factor"] or 1.0

        # 4. Compute per-feature contributions (beta_i * z_i)
        features = []
        total_logit = intercept
        for i, factor_name in enumerate(self.FACTOR_NAMES):
            beta = coefficients.get(factor_name, 0.0)
            z = z_values[i]
            contribution = beta * z
            total_logit += contribution

            features.append({
                "feature": factor_name,
                "label": self.FACTOR_LABELS.get(factor_name, factor_name.replace('_', ' ').title()),
                "z_score": round(z, 3),
                "coefficient": round(beta, 4),
                "contribution": round(contribution, 4),
            })

        # Sort by absolute contribution (most impactful first)
        features.sort(key=lambda f: abs(f["contribution"]), reverse=True)

        return {
            "contract_id": contract_id,
            "risk_score": contract_row["risk_score"] or 0,
            "risk_level": contract_row["risk_level"] or "unknown",
            "model_version": contract_row["risk_model_version"],
            "model_type": model_type,
            "sector_id": sector_id,
            "confidence_interval": {
                "lower": contract_row["risk_confidence_lower"],
                "upper": contract_row["risk_confidence_upper"],
            },
            "explanation_available": True,
            "intercept": round(intercept, 4),
            "logit": round(total_logit, 4),
            "pu_correction": round(pu_c, 4),
            "features": features,
        }

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
