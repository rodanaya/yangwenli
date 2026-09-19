"""
Tests for GET /analysis/amount-histogram (SD-07).

The endpoint feeds the four live figures of `/stories/el-umbral-de-los-300k`,
and the story's whole argument is an arithmetic claim: a bucket at an exact
legal threshold holds more contracts than the buckets around it. So the
arithmetic is tested directly, against a fixture whose answers are countable
by hand, rather than only asserting the shape of a live response.

`compute_amount_histogram` takes a connection, which is what makes that
possible: the fixture below is an in-memory database with nineteen contracts
in it. The route-level tests cover parsing and bounds, which reject before any
query runs, and the shape of a live call — that one skips when the configured
database has no contracts, as the default test run does.

Run the data-bearing path against the real register with:

    DATABASE_PATH=D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db \\
      python -m pytest tests/test_amount_histogram.py -q -p no:cacheprovider
"""
import sqlite3

import pytest

from api.routers.analysis import (
    MAX_EXACT_AMOUNTS,
    compute_amount_histogram,
    parse_exact_amounts,
)

# amount_mxn, is_direct_award, contract_year, institution_id
FIXTURE_ROWS = [
    # bucket 0 — [200000, 210000)
    (200000, 1, 2020, 1),
    (205000, 0, 2020, 1),
    (209999, 1, 2021, 2),
    # bucket 1 — [210000, 220000), four of them ON the threshold
    (210000, 1, 2020, 1),
    (210000, 1, 2020, 1),
    (210000, 0, 2021, 2),
    (210000, 1, 2021, 3),
    (215000, 0, 2021, 2),
    # bucket 2 — [220000, 230000)
    (225000, 0, 2022, 3),
    # bucket 3 — [230000, 240000) is deliberately empty
    # bucket 4 — [240000, 250000)
    (240000, 1, 2022, 1),
    # the neighbours of the 210000 threshold, one either side
    (209000, 0, 2020, 1),
    (211000, 1, 2020, 2),
    (211000, 0, 2022, 3),
    # outside the band on both ends — must never be counted
    (199999, 1, 2020, 1),
    (250000, 1, 2022, 1),
    (400000, 0, 2023, 1),
    # above the rejection ceiling (> 100B MXN) — a decimal error, excluded
    (200_000_000_000, 1, 2020, 1),
    # no institution, no year — the fold must tolerate both
    (222000, 0, None, 1),
    (223000, 1, 2021, None),
]


@pytest.fixture()
def fixture_conn():
    """Nineteen contracts and three buyers, in memory."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute(
        "CREATE TABLE contracts ("
        " amount_mxn REAL, is_direct_award INTEGER,"
        " contract_year INTEGER, institution_id INTEGER)"
    )
    conn.execute("CREATE TABLE institutions (id INTEGER PRIMARY KEY, name TEXT)")
    conn.executemany("INSERT INTO contracts VALUES (?, ?, ?, ?)", FIXTURE_ROWS)
    conn.executemany(
        "INSERT INTO institutions VALUES (?, ?)",
        [(1, "DICONSA"), (2, "IMSS"), (3, "ISSSTE")],
    )
    conn.commit()
    yield conn
    conn.close()


def _histogram(conn, **kwargs):
    params = dict(min_amount=200000, max_amount=250000, bucket=10000, exact=[210000])
    params.update(kwargs)
    return compute_amount_histogram(conn, **params)


# ── the fold ──────────────────────────────────────────────────────────────


def test_buckets_span_the_band_including_empty_ones(fixture_conn):
    """Five 10K buckets from 200K, and the empty one is emitted, not skipped."""
    body = _histogram(fixture_conn)
    buckets = body["buckets"]
    assert len(buckets) == 5
    assert [b["from"] for b in buckets] == [200000, 210000, 220000, 230000, 240000]
    assert [b["to"] for b in buckets] == [210000, 220000, 230000, 240000, 250000]
    assert [b["count"] for b in buckets] == [4, 7, 3, 0, 1]


def test_direct_award_counts_never_exceed_the_bucket(fixture_conn):
    buckets = _histogram(fixture_conn)["buckets"]
    assert [b["direct_award_count"] for b in buckets] == [2, 4, 1, 0, 1]
    for b in buckets:
        assert 0 <= b["direct_award_count"] <= b["count"]


def test_band_is_half_open_and_the_ceiling_rejects(fixture_conn):
    """199,999 and 250,000 are outside; the 200-billion row never counts."""
    body = _histogram(fixture_conn)
    assert body["total_in_range"] == sum(b["count"] for b in body["buckets"]) == 15
    # 19 rows are in the table; 4 sit outside the band or above the ceiling.
    assert body["total_contracts"] == len(FIXTURE_ROWS) == 19


def test_exact_amount_is_counted_against_its_neighbours(fixture_conn):
    exact = _histogram(fixture_conn)["exact"]
    assert len(exact) == 1
    spike = exact[0]
    assert spike["amount"] == 210000
    assert spike["count"] == 4
    assert spike["direct_award_count"] == 3
    assert spike["neighbours"] == {"minus_1000": 1, "plus_1000": 2}


def test_a_threshold_outside_the_band_still_reports_its_neighbours(fixture_conn):
    """The band is 200K-250K; 400K is outside it, so `count` is 0, not wrong."""
    spike = _histogram(fixture_conn, exact=[400000])["exact"][0]
    assert spike["count"] == 0
    assert spike["neighbours"] == {"minus_1000": 0, "plus_1000": 0}


def test_by_year_totals_partition_the_band(fixture_conn):
    body = _histogram(fixture_conn)
    by_year = {r["year"]: r for r in body["by_year"]}
    assert set(by_year) == {2020, 2021, 2022}
    assert by_year[2020]["contracts_in_range"] == 6
    assert by_year[2020]["exact_total"] == 2
    assert by_year[2021]["exact_total"] == 2
    assert by_year[2022]["exact_total"] == 0
    # One in-band row carries no year, so the years sum to one less.
    assert sum(r["contracts_in_range"] for r in body["by_year"]) == body["total_in_range"] - 1


def test_top_institutions_rank_by_exact_count_and_resolve_names(fixture_conn):
    rows = _histogram(fixture_conn)["top_institutions"]
    assert [r["institution"] for r in rows] == ["DICONSA", "IMSS", "ISSSTE"]
    assert [r["exact_count"] for r in rows] == [2, 1, 1]
    assert [r["exact_direct_award_count"] for r in rows] == [2, 0, 1]
    for r in rows:
        assert r["exact_count"] <= r["range_count"]
        assert r["exact_direct_award_count"] <= r["exact_count"]


def test_institutions_without_an_exact_hit_are_omitted(fixture_conn):
    """A buyer in the band but never on the line is not on the roster."""
    rows = _histogram(fixture_conn, exact=[240000])["top_institutions"]
    assert [r["institution_id"] for r in rows] == [1]


def test_year_and_institution_filters_narrow_both_the_fold_and_the_neighbours(fixture_conn):
    body = _histogram(fixture_conn, year_from=2020, year_to=2020, institution_id=1)
    assert body["total_in_range"] == 5
    assert [b["count"] for b in body["buckets"]] == [3, 2, 0, 0, 0]
    spike = body["exact"][0]
    assert spike["count"] == 2
    # 209,000 belongs to institution 1 in 2020; 211,000 does not.
    assert spike["neighbours"] == {"minus_1000": 1, "plus_1000": 0}


def test_a_bucket_that_does_not_divide_the_band_truncates_the_last_one(fixture_conn):
    """200K to 235K in 10K steps: four buckets, the last one 5K wide."""
    buckets = _histogram(fixture_conn, max_amount=235000)["buckets"]
    assert len(buckets) == 4
    assert buckets[-1] == {"from": 230000, "to": 235000, "count": 0, "direct_award_count": 0}


def test_envelope_echoes_the_request(fixture_conn):
    body = _histogram(fixture_conn, bucket=25000)
    assert (body["min"], body["max"], body["bucket"]) == (200000, 250000, 25000)
    assert len(body["buckets"]) == 2
    assert body["computed_at"]


# ── `exact` parsing ───────────────────────────────────────────────────────


def test_exact_parses_sorts_and_deduplicates():
    assert parse_exact_amounts("300000,210000,250000") == [210000, 250000, 300000]
    assert parse_exact_amounts("210000,210000") == [210000]
    assert parse_exact_amounts(" 210000 , 250000 ") == [210000, 250000]


def test_exact_tolerates_empty_entries_but_not_rubbish():
    assert parse_exact_amounts("210000,,250000,") == [210000, 250000]
    assert parse_exact_amounts("") == []
    for bad in ("210k", "2.5e5", "abc", "210000;250000"):
        with pytest.raises(Exception):
            parse_exact_amounts(bad)


def test_exact_rejects_negative_and_above_the_ceiling():
    for bad in ("-1", "200000000000"):
        with pytest.raises(Exception):
            parse_exact_amounts(bad)


def test_exact_is_capped():
    ok = ",".join(str(200000 + i) for i in range(MAX_EXACT_AMOUNTS))
    assert len(parse_exact_amounts(ok)) == MAX_EXACT_AMOUNTS
    with pytest.raises(Exception):
        parse_exact_amounts(ok + ",999999")


# ── the route ─────────────────────────────────────────────────────────────


def test_query_bounds_are_enforced(client, base_url):
    """Rejections that never reach the database."""
    url = f"{base_url}/analysis/amount-histogram"
    assert client.get(f"{url}?bucket=999").status_code == 422          # below the floor
    assert client.get(f"{url}?min=-1").status_code == 422
    assert client.get(f"{url}?year_from=2001").status_code == 422
    assert client.get(f"{url}?max=200000").status_code == 400          # max <= min
    # 200K-400K at 1,000 is exactly 200 buckets — the cap, so it is allowed.
    assert client.get(f"{url}?min=200000&max=400000&bucket=1000").status_code == 200
    assert client.get(f"{url}?min=200000&max=401000&bucket=1000").status_code == 400
    assert client.get(f"{url}?year_from=2020&year_to=2019").status_code == 400
    assert client.get(f"{url}?exact=210k").status_code == 400


def test_live_shape(client, base_url):
    """The envelope a figure reads before it has a single number."""
    r = client.get(f"{base_url}/analysis/amount-histogram")
    assert r.status_code == 200
    body = r.json()
    if not body["total_contracts"]:
        pytest.skip("no contracts in the configured database")

    assert (body["min"], body["max"], body["bucket"]) == (200000, 400000, 10000)
    assert len(body["buckets"]) == 20
    assert [b["amount"] for b in body["exact"]] == [210000, 250000, 300000]
    assert body["total_in_range"] == sum(b["count"] for b in body["buckets"])
    assert body["total_in_range"] <= body["total_contracts"]
    assert len(body["top_institutions"]) <= 20

    for b in body["buckets"]:
        assert b["to"] - b["from"] == 10000
        assert 0 <= b["direct_award_count"] <= b["count"]
    for spike in body["exact"]:
        assert 0 <= spike["direct_award_count"] <= spike["count"]
        assert set(spike["neighbours"]) == {"minus_1000", "plus_1000"}
    # Not pinned to the 2002-2025 horizon: the register carries a handful of
    # rows dated outside it (two in 2001 in this band), and the endpoint reports
    # what is there rather than quietly dropping them.
    for row in body["by_year"]:
        assert 1990 <= row["year"] <= 2030
        assert row["exact_total"] <= row["contracts_in_range"]
    assert sum(r["contracts_in_range"] for r in body["by_year"]) <= body["total_in_range"]


def test_response_is_cached(client, base_url):
    """Second call is served from the ten-minute cache, headers and all."""
    url = f"{base_url}/analysis/amount-histogram?min=300000&max=320000&bucket=10000"
    first = client.get(url)
    assert first.status_code == 200
    second = client.get(url)
    assert second.status_code == 200
    # A middleware appends `stale-while-revalidate`; the max-age is ours.
    assert (second.headers.get("cache-control") or "").startswith("public, max-age=600")
    assert second.json()["computed_at"] == first.json()["computed_at"]
