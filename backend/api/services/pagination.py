"""
Pagination utilities for the service layer.

Standardizes the paginated response format across all endpoints.
"""
from __future__ import annotations

import math
import sqlite3
from dataclasses import dataclass, field
from typing import Any, Callable

from .query_builder import QueryBuilder


@dataclass
class PaginatedResult:
    """Standard paginated response matching the API envelope format."""
    data: list[dict] = field(default_factory=list)
    pagination: dict = field(default_factory=dict)


def paginate_query(
    conn: sqlite3.Connection,
    qb: QueryBuilder,
    columns: str,
    page: int,
    per_page: int,
    row_mapper: Callable[[sqlite3.Row], dict] | None = None,
) -> PaginatedResult:
    """
    Execute count + data query and return a PaginatedResult.

    Args:
        conn: SQLite connection
        qb: QueryBuilder with filters applied (will have pagination added)
        columns: SELECT columns string
        page: Page number (1-indexed)
        per_page: Results per page
        row_mapper: Optional function to transform each Row to a dict.
                    If None, uses dict(row).

    Returns:
        PaginatedResult with data and pagination metadata
    """
    cursor = conn.cursor()

    # Count total results (without pagination)
    count_sql, count_params = qb.build_count()
    cursor.execute(count_sql, count_params)
    total = cursor.fetchone()[0]

    # Apply pagination and fetch data
    page = max(1, page)
    per_page = max(1, min(per_page, 500))
    qb.paginate(page, per_page)

    data_sql, data_params = qb.build_select(columns)
    cursor.execute(data_sql, data_params)

    mapper = row_mapper or (lambda row: dict(row))
    data = [mapper(row) for row in cursor.fetchall()]

    total_pages = math.ceil(total / per_page) if per_page > 0 else 0

    return PaginatedResult(
        data=data,
        pagination={
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
    )
