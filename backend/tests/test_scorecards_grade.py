"""Regression: institution grading reconciliation (QW-1, 2026-06-11).

compute_scorecards.py once assigned grades by percentile (_percentile_grade),
but the live `institution_scorecards` table stores the ABSOLUTE ladder
(get_grade / GRADE_TIERS). The two disagreed ~73%, so re-running the script
as-is would have silently flipped most grades. The script now uses get_grade;
this test locks that the absolute ladder reproduces the live grades, so a
future re-run is a no-op rather than a landmine.
"""
import os
import sqlite3
from pathlib import Path

import pytest

from scripts.compute_scorecards import get_grade, GRADE_TIERS

_default_db = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DB_PATH = Path(os.environ.get("DATABASE_PATH", str(_default_db)))


def test_absolute_ladder_boundaries():
    assert get_grade(90)[0] == "S"
    assert get_grade(89.999)[0] == "A"
    assert get_grade(50)[0] == "C+"
    assert get_grade(0)[0] == "F-"
    assert get_grade(-5)[0] == "F-"
    # monotonic, non-increasing grade index as score drops
    order = [c for _, c, _, _ in GRADE_TIERS]
    assert order == ["S", "A", "B+", "B", "C+", "C", "D", "D-", "F", "F-"]


@pytest.fixture(scope="module")
def conn():
    if not DB_PATH.exists():
        pytest.skip(f"DB not found at {DB_PATH}")
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    yield c
    c.close()


def test_absolute_grade_reproduces_live(conn):
    try:
        rows = conn.execute(
            "SELECT total_score, grade FROM institution_scorecards "
            "WHERE total_score IS NOT NULL AND grade IS NOT NULL"
        ).fetchall()
    except sqlite3.OperationalError:
        pytest.skip("institution_scorecards table not present")
    if not rows:
        pytest.skip("no scorecard rows")
    mismatches = [r for r in rows if get_grade(r["total_score"])[0] != r["grade"]]
    rate = len(mismatches) / len(rows)
    assert rate < 0.005, (
        f"{len(mismatches)}/{len(rows)} ({rate:.1%}) stored grades disagree with "
        f"the absolute get_grade ladder — the script no longer matches live data; "
        f"re-running compute_scorecards.py would corrupt grades."
    )
