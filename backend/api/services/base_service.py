"""
BaseService — common patterns for domain services.

All domain services inherit from this to get standardized
query execution, pagination, and error handling.
"""
from __future__ import annotations

import sqlite3
from typing import Any, Callable

import structlog

from ..dependencies import get_db
from .query_builder import QueryBuilder
from .pagination import paginate_query, PaginatedResult

logger = structlog.get_logger("rubli.services")


class BaseService:
    """Base class for domain services."""

    def _paginated_list(
        self,
        conn: sqlite3.Connection,
        qb: QueryBuilder,
        columns: str,
        page: int,
        per_page: int,
        row_mapper: Callable[[sqlite3.Row], dict] | None = None,
    ) -> PaginatedResult:
        """Execute a paginated list query."""
        return paginate_query(conn, qb, columns, page, per_page, row_mapper)

    def _execute_one(
        self,
        conn: sqlite3.Connection,
        sql: str,
        params: list[Any] | tuple = (),
    ) -> sqlite3.Row | None:
        """Execute a query expecting a single row."""
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return cursor.fetchone()

    def _execute_many(
        self,
        conn: sqlite3.Connection,
        sql: str,
        params: list[Any] | tuple = (),
    ) -> list[sqlite3.Row]:
        """Execute a query expecting multiple rows."""
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return cursor.fetchall()
