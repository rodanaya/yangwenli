"""
QueryBuilder — fluent SQL query construction with parameterized queries.

Replaces ~800 lines of duplicated query-building logic across 14 routers.
All user inputs go through ? parameterized placeholders to prevent SQL injection.
"""
from __future__ import annotations

import math
from typing import Any


class QueryBuilder:
    """Fluent SQL query builder with safe parameterization."""

    def __init__(self, base_table: str):
        """
        Args:
            base_table: Table name with optional alias, e.g. "contracts c"
        """
        self.base_table = base_table
        self._conditions: list[str] = []
        self._params: list[Any] = []
        self._joins: list[str] = []
        self._order_by: str | None = None
        self._limit: int | None = None
        self._offset: int | None = None
        self._group_by: str | None = None
        self._having: str | None = None

    # --- Join methods ---

    def join(self, table: str, on: str) -> QueryBuilder:
        """Add INNER JOIN."""
        self._joins.append(f"JOIN {table} ON {on}")
        return self

    def left_join(self, table: str, on: str) -> QueryBuilder:
        """Add LEFT JOIN."""
        self._joins.append(f"LEFT JOIN {table} ON {on}")
        return self

    # --- Generic where ---

    def where(self, condition: str, *params: Any) -> QueryBuilder:
        """Add a WHERE condition with parameters."""
        self._conditions.append(condition)
        self._params.extend(params)
        return self

    # --- Domain-specific filters ---

    def filter_sector(self, sector_id: int | None, column: str = "sector_id") -> QueryBuilder:
        """Filter by sector_id if provided."""
        if sector_id is not None:
            self._conditions.append(f"{column} = ?")
            self._params.append(sector_id)
        return self

    def filter_year(self, year: int | None, column: str = "contract_year") -> QueryBuilder:
        """Filter by year if provided."""
        if year is not None:
            self._conditions.append(f"{column} = ?")
            self._params.append(year)
        return self

    def filter_risk_level(self, level: str | None, column: str = "risk_level") -> QueryBuilder:
        """Filter by risk level if provided. Validates against allowed values."""
        if level is not None:
            valid = {"low", "medium", "high", "critical"}
            if level.lower() not in valid:
                raise ValueError(f"Invalid risk level '{level}'. Must be one of: {valid}")
            self._conditions.append(f"{column} = ?")
            self._params.append(level.lower())
        return self

    def filter_search(
        self,
        search: str | None,
        columns: list[str],
        extra_subquery: str | None = None,
    ) -> QueryBuilder:
        """Add LIKE search across multiple columns (OR). Returns self.

        Args:
            search: Search term (will be wrapped in %...%).
            columns: Column expressions to LIKE-match.
            extra_subquery: Optional additional OR clause (e.g. subquery into
                related table). The caller must include exactly one ? placeholder
                for the LIKE pattern if needed.
        """
        if search and columns:
            pattern = f"%{search}%"
            like_clauses = [f"{col} LIKE ?" for col in columns]
            all_clauses = like_clauses[:]
            all_params = [pattern] * len(columns)
            if extra_subquery:
                all_clauses.append(extra_subquery)
                all_params.append(pattern)
            self._conditions.append(f"({' OR '.join(all_clauses)})")
            self._params.extend(all_params)
        return self

    def filter_amount_range(
        self,
        min_amt: float | None,
        max_amt: float | None,
        column: str = "amount_mxn",
    ) -> QueryBuilder:
        """Filter by amount range."""
        if min_amt is not None:
            self._conditions.append(f"{column} >= ?")
            self._params.append(min_amt)
        if max_amt is not None:
            self._conditions.append(f"{column} <= ?")
            self._params.append(max_amt)
        return self

    def filter_boolean(self, value: bool | None, column: str) -> QueryBuilder:
        """Filter by boolean column (0/1 in SQLite)."""
        if value is not None:
            self._conditions.append(f"{column} = ?")
            self._params.append(1 if value else 0)
        return self

    # --- Grouping ---

    def group_by(self, clause: str) -> QueryBuilder:
        """Set GROUP BY clause."""
        self._group_by = clause
        return self

    def having(self, condition: str, *params: Any) -> QueryBuilder:
        """Set HAVING clause."""
        self._having = condition
        self._params.extend(params)
        return self

    # --- Sorting ---

    def sort(
        self,
        field: str | None,
        order: str = "desc",
        whitelist: dict[str, str] | None = None,
        default: str | None = None,
    ) -> QueryBuilder:
        """
        Set ORDER BY with SQL injection protection via whitelist.

        Args:
            field: User-provided sort field name
            order: 'asc' or 'desc'
            whitelist: Maps safe field names to actual SQL column expressions
                       e.g. {"name": "v.name", "risk": "v.avg_risk_score"}
            default: Default ORDER BY if field is None or not in whitelist
        """
        safe_order = "ASC" if order and order.lower() == "asc" else "DESC"

        if field and whitelist and field in whitelist:
            self._order_by = f"{whitelist[field]} {safe_order}"
        elif default:
            self._order_by = default
        return self

    def order_by(self, clause: str) -> QueryBuilder:
        """Set ORDER BY directly (use only with trusted input)."""
        self._order_by = clause
        return self

    # --- Pagination ---

    def paginate(self, page: int, per_page: int) -> QueryBuilder:
        """Set LIMIT/OFFSET for pagination."""
        page = max(1, page)
        per_page = max(1, min(per_page, 500))
        self._limit = per_page
        self._offset = (page - 1) * per_page
        return self

    def limit(self, n: int) -> QueryBuilder:
        """Set LIMIT directly."""
        self._limit = n
        return self

    # --- Build methods ---

    def _build_from(self) -> str:
        """Build FROM + JOINs clause."""
        parts = [f"FROM {self.base_table}"]
        parts.extend(self._joins)
        return " ".join(parts)

    def _build_where(self) -> str:
        """Build WHERE clause."""
        if not self._conditions:
            return ""
        return "WHERE " + " AND ".join(self._conditions)

    def _build_group_by(self) -> str:
        if not self._group_by:
            return ""
        return f"GROUP BY {self._group_by}"

    def _build_having(self) -> str:
        if not self._having:
            return ""
        return f"HAVING {self._having}"

    def _build_tail(self) -> str:
        """Build ORDER BY + LIMIT + OFFSET."""
        parts = []
        if self._order_by:
            parts.append(f"ORDER BY {self._order_by}")
        if self._limit is not None:
            parts.append(f"LIMIT {self._limit}")
        if self._offset is not None:
            parts.append(f"OFFSET {self._offset}")
        return " ".join(parts)

    def build_count(self) -> tuple[str, list[Any]]:
        """Build a COUNT(*) query."""
        parts = [
            "SELECT COUNT(*)",
            self._build_from(),
            self._build_where(),
            self._build_group_by(),
            self._build_having(),
        ]
        sql = " ".join(p for p in parts if p)

        # If GROUP BY is used, we need to count the groups
        if self._group_by:
            sql = f"SELECT COUNT(*) FROM ({sql})"

        return sql, list(self._params)

    def build_select(self, columns: str) -> tuple[str, list[Any]]:
        """Build a full SELECT query."""
        parts = [
            f"SELECT {columns}",
            self._build_from(),
            self._build_where(),
            self._build_group_by(),
            self._build_having(),
            self._build_tail(),
        ]
        sql = " ".join(p for p in parts if p)
        return sql, list(self._params)
