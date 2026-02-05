"""
Helper functions for analysis endpoints.

Extracts common patterns to reduce code duplication.
"""

import json
import sqlite3
from typing import Optional, List, Tuple, Any, Dict


def build_where_clause(
    conditions: List[str],
    params: List[Any],
    sector_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    year: Optional[int] = None,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    hypothesis_type: Optional[str] = None,
    confidence_level: Optional[str] = None,
    min_confidence: Optional[float] = None,
    is_reviewed: Optional[bool] = None,
    is_valid: Optional[bool] = None,
) -> Tuple[str, List[Any]]:
    """
    Build a WHERE clause with common filter conditions.

    Args:
        conditions: Initial list of conditions
        params: Initial list of parameters
        Various optional filters

    Returns:
        Tuple of (where_clause_string, params_list)
    """
    if sector_id is not None:
        conditions.append("sector_id = ?")
        params.append(sector_id)

    if institution_id is not None:
        conditions.append("institution_id = ?")
        params.append(institution_id)

    if year is not None:
        conditions.append("contract_year = ?")
        params.append(year)

    if start_year is not None:
        conditions.append("contract_year >= ?")
        params.append(start_year)

    if end_year is not None:
        conditions.append("contract_year <= ?")
        params.append(end_year)

    if hypothesis_type is not None:
        conditions.append("hypothesis_type = ?")
        params.append(hypothesis_type)

    if confidence_level is not None:
        conditions.append("confidence_level = ?")
        params.append(confidence_level)

    if min_confidence is not None:
        conditions.append("confidence >= ?")
        params.append(min_confidence)

    if is_reviewed is not None:
        conditions.append("is_reviewed = ?")
        params.append(1 if is_reviewed else 0)

    if is_valid is not None:
        conditions.append("is_valid = ?")
        params.append(1 if is_valid else 0)

    return " AND ".join(conditions), params


def parse_json_evidence(evidence_str: Optional[str]) -> List[Dict[str, Any]]:
    """
    Safely parse JSON evidence string.

    Args:
        evidence_str: JSON string or None

    Returns:
        Parsed list or empty list on error
    """
    if not evidence_str:
        return []
    try:
        return json.loads(evidence_str)
    except (json.JSONDecodeError, TypeError):
        return []


def row_to_hypothesis_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """
    Convert a database row to hypothesis dictionary.

    Expected columns: id, hypothesis_id, contract_id, hypothesis_type, confidence,
    confidence_level, explanation, supporting_evidence, recommended_action,
    literature_reference, sector_id, vendor_id, amount_mxn, is_reviewed,
    is_valid, review_notes, created_at
    """
    return {
        "id": row[0],
        "hypothesis_id": row[1],
        "contract_id": row[2],
        "hypothesis_type": row[3],
        "confidence": row[4],
        "confidence_level": row[5],
        "explanation": row[6],
        "supporting_evidence": parse_json_evidence(row[7]),
        "recommended_action": row[8],
        "literature_reference": row[9],
        "sector_id": row[10],
        "vendor_id": row[11],
        "amount_mxn": row[12],
        "is_reviewed": bool(row[13]),
        "is_valid": bool(row[14]) if row[14] is not None else None,
        "review_notes": row[15],
        "created_at": row[16] or ""
    }


def table_exists(cursor: sqlite3.Cursor, table_name: str) -> bool:
    """
    Check if a table exists in the database.

    Args:
        cursor: Database cursor
        table_name: Name of table to check

    Returns:
        True if table exists, False otherwise
    """
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,)
    )
    return cursor.fetchone() is not None


def calculate_pagination(total: int, page: int, per_page: int) -> Dict[str, int]:
    """
    Calculate pagination metadata.

    Args:
        total: Total number of items
        page: Current page number
        per_page: Items per page

    Returns:
        Dictionary with pagination info
    """
    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": (total + per_page - 1) // per_page
    }


def pct_change(old: float, new: float) -> float:
    """
    Calculate percentage change between two values.

    Args:
        old: Original value
        new: New value

    Returns:
        Percentage change (100.0 if old is 0 and new > 0)
    """
    if old == 0:
        return 100.0 if new > 0 else 0.0
    return round((new - old) / old * 100, 1)
