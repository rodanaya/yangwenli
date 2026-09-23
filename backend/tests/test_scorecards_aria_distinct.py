"""PARALLAX D9b § Change 0 — the External Flags pillar counts ARIA vendors, not contracts.

Fixture-only (in-memory SQLite): fast, deterministic, touches no real table.
"""
import sqlite3

from scripts.compute_scorecards import _load_institution_aria, scorecard_checksum


def _fixture():
    c = sqlite3.connect(":memory:")
    c.executescript("""
        CREATE TABLE contracts (id INTEGER PRIMARY KEY, institution_id INT, vendor_id INT);
        CREATE TABLE aria_queue (vendor_id INT, ips_tier INT);
        INSERT INTO aria_queue VALUES (1, 1), (2, 1), (3, 2), (4, 4);
    """)
    rows = []
    # institution 10: vendor 1 (T1) x 50 contracts, vendor 2 (T1) x 3, vendor 3 (T2) x 7, vendor 4 x 5
    for vid, n in ((1, 50), (2, 3), (3, 7), (4, 5)):
        rows += [(10, vid)] * n
    # institution 20: vendor 1 once
    rows.append((20, 1))
    c.executemany("INSERT INTO contracts (institution_id, vendor_id) VALUES (?, ?)", rows)
    return c


def test_aria_loader_counts_distinct_vendors():
    c = _fixture()
    got = _load_institution_aria(c)
    assert got[10] == {"t1": 2, "t2": 1}
    assert got[20] == {"t1": 1, "t2": 0}
    vendor_count = c.execute("SELECT COUNT(DISTINCT vendor_id) FROM contracts WHERE institution_id = 10").fetchone()[0]
    assert got[10]["t1"] <= vendor_count and got[10]["t2"] <= vendor_count


def test_legacy_loader_counted_contracts():
    """The dry run's comparison path reproduces the defect it replaces."""
    got = _load_institution_aria(_fixture(), distinct=False)
    assert got[10] == {"t1": 53, "t2": 7}


def test_checksum_detects_a_write():
    c = sqlite3.connect(":memory:")
    c.execute("CREATE TABLE institution_scorecards (institution_id INT, total_score REAL)")
    c.executemany("INSERT INTO institution_scorecards VALUES (?, ?)", [(1, 40.0), (2, 55.5)])
    before = scorecard_checksum(c)
    assert scorecard_checksum(c) == before
    c.execute("UPDATE institution_scorecards SET total_score = 41.0 WHERE institution_id = 1")
    assert scorecard_checksum(c) != before
