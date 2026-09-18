"""
Tests for GET /aria/patterns/{code}/institutions (SD-04).

The endpoint feeds four figures on `/stories/captura-institucional`, and the
story asserts the direction of the number it prints: a row's value is the
lifetime contracting of the vendors ANCHORED at that buyer, and
`flagged_value_mxn` is the all-patterns denominator a share is taken against.
These tests pin that contract — shape, ordering, bounds, and the 404.

Like the rest of the suite, the data-bearing assertions skip when the configured
database carries no ARIA queue (the default test run has no DB file at all).
Run them against the real register to exercise those paths:

    DATABASE_PATH=D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db \\
      python -m pytest tests/test_aria_pattern_institutions.py -q -p no:cacheprovider
"""
import pytest


def _rows_or_skip(body, what="rows"):
    """The suite runs dataless by default; a shape test is not a data test."""
    if not body.get("rows"):
        pytest.skip(f"no ARIA {what} in the configured database")
    return body["rows"]


@pytest.fixture(scope="module")
def p6_institutions(client, base_url):
    r = client.get(f"{base_url}/aria/patterns/P6/institutions?limit=7&vendors=3")
    assert r.status_code == 200
    return r.json()


def test_envelope_is_well_formed(p6_institutions):
    """The chrome a figure reads before it has a single number."""
    body = p6_institutions
    assert body["code"] == "P6"
    assert body["label_en"] == "Institutional capture"
    assert body["label_es"] == "Captura institucional"
    assert body["group"] == "institution"
    assert isinstance(body["rows"], list)


def test_cohort_rollup_partitions_the_pattern(p6_institutions):
    """Tier counts partition the cohort, and the review funnel nests."""
    cohort = p6_institutions["cohort"]
    if not cohort or not cohort.get("total_vendors"):
        pytest.skip("no P6 vendors in the configured database")
    assert cohort["total_value_mxn"] > 0
    tiers = sum(cohort[f"tier{i}"] for i in (1, 2, 3, 4))
    assert tiers == cohort["total_vendors"]
    assert 0 <= cohort["in_ground_truth"] <= cohort["total_vendors"]
    assert cohort["confirmed"] <= cohort["reviewed"] <= cohort["total_vendors"]


def test_groups_rank_by_value_and_nest_inside_the_cohort(p6_institutions):
    rows = _rows_or_skip(p6_institutions)
    assert len(rows) <= 7

    values = [r["total_value_mxn"] for r in rows]
    assert values == sorted(values, reverse=True)
    # "Others" is the remainder the ch2 figure draws; a negative one would mean
    # the groups double-count the cohort.
    assert sum(values) <= p6_institutions["cohort"]["total_value_mxn"] + 1e-6

    for r in rows:
        assert r["vendor_count"] > 0
        # The pattern's slice can never exceed everything flagged in the group.
        assert r["total_value_mxn"] <= r["flagged_value_mxn"] + 1e-6
        assert r["vendor_count"] <= r["flagged_vendor_count"]
        assert r["sector_id"] is None

    # At least one buyer must resolve to a real institution id, or no entity
    # chip can render on the figure.
    assert any(r["institution_id"] for r in rows)


def test_inlined_vendors_are_capped_and_ranked(p6_institutions):
    rows = _rows_or_skip(p6_institutions)
    for r in rows:
        assert len(r["vendors"]) <= 3
        vendor_values = [v["total_value_mxn"] for v in r["vendors"]]
        assert vendor_values == sorted(vendor_values, reverse=True)
        for v in r["vendors"]:
            assert v["vendor_id"] > 0
            assert isinstance(v["in_ground_truth"], bool)
            # The share P6 actually measures: how much of the VENDOR's own
            # contracting sits at this buyer.
            if v["top_institution_ratio"] is not None:
                assert 0 <= v["top_institution_ratio"] <= 1


def test_vendors_default_to_absent(client, base_url):
    """The two figures that only need totals do not pay for the vendor scan."""
    body = client.get(f"{base_url}/aria/patterns/P6/institutions?limit=2").json()
    for r in body["rows"]:
        assert r["vendors"] == []


def test_unknown_pattern_is_404(client, base_url):
    r = client.get(f"{base_url}/aria/patterns/P9/institutions")
    assert r.status_code == 404
    assert "P9" in r.json()["detail"]


def test_limit_and_group_bounds(client, base_url):
    """`limit` caps at 50, `vendors` at 10, and `group` is an enum."""
    assert client.get(f"{base_url}/aria/patterns/P6/institutions?limit=51").status_code == 422
    assert client.get(f"{base_url}/aria/patterns/P6/institutions?limit=0").status_code == 422
    assert client.get(f"{base_url}/aria/patterns/P6/institutions?vendors=11").status_code == 422
    assert client.get(f"{base_url}/aria/patterns/P6/institutions?group=vendor").status_code == 400

    r = client.get(f"{base_url}/aria/patterns/P6/institutions?limit=3")
    assert r.status_code == 200
    assert len(r.json()["rows"]) <= 3


def test_sector_grouping_carries_sector_ids(client, base_url):
    """`group=sector` keys on the 12-sector taxonomy, not on a buyer acronym."""
    r = client.get(f"{base_url}/aria/patterns/P3/institutions?group=sector&limit=12")
    assert r.status_code == 200
    body = r.json()
    assert body["group"] == "sector"
    rows = _rows_or_skip(body, "P3 rows")
    for row in rows:
        assert row["institution_id"] is None
        assert 1 <= row["sector_id"] <= 12
        # The share the ch3 figure prints has to be a real fraction.
        assert 0 < row["total_value_mxn"] <= row["flagged_value_mxn"] + 1e-6


def test_lowercase_code_resolves(client, base_url):
    r = client.get(f"{base_url}/aria/patterns/p3/institutions?limit=1")
    assert r.status_code == 200
    assert r.json()["code"] == "P3"
