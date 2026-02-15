"""
Unit tests for the service layer: QueryBuilder, pagination, and base service.

Tests the shared infrastructure that all domain services rely on.
"""
import pytest
from api.services.query_builder import QueryBuilder


class TestQueryBuilderInit:
    """Test QueryBuilder construction."""

    def test_basic_construction(self):
        """QueryBuilder should accept a base table."""
        qb = QueryBuilder("contracts c")
        assert qb.base_table == "contracts c"
        assert qb._conditions == []
        assert qb._params == []
        assert qb._joins == []

    def test_build_select_no_conditions(self):
        """Simple SELECT without conditions."""
        qb = QueryBuilder("contracts c")
        sql, params = qb.build_select("c.id, c.amount_mxn")
        assert sql == "SELECT c.id, c.amount_mxn FROM contracts c"
        assert params == []

    def test_build_count_no_conditions(self):
        """COUNT(*) without conditions."""
        qb = QueryBuilder("contracts c")
        sql, params = qb.build_count()
        assert sql == "SELECT COUNT(*) FROM contracts c"
        assert params == []


class TestQueryBuilderFilters:
    """Test domain-specific filter methods."""

    def test_filter_sector(self):
        """filter_sector adds parameterized condition."""
        qb = QueryBuilder("contracts c")
        qb.filter_sector(1)
        sql, params = qb.build_select("*")
        assert "sector_id = ?" in sql
        assert params == [1]

    def test_filter_sector_none_is_noop(self):
        """filter_sector(None) should not add conditions."""
        qb = QueryBuilder("contracts c")
        qb.filter_sector(None)
        sql, params = qb.build_select("*")
        assert "WHERE" not in sql
        assert params == []

    def test_filter_year(self):
        """filter_year adds parameterized condition."""
        qb = QueryBuilder("contracts c")
        qb.filter_year(2024)
        sql, params = qb.build_select("*")
        assert "contract_year = ?" in sql
        assert params == [2024]

    def test_filter_year_custom_column(self):
        """filter_year with custom column name."""
        qb = QueryBuilder("contracts c")
        qb.filter_year(2024, column="c.contract_year")
        sql, params = qb.build_select("*")
        assert "c.contract_year = ?" in sql
        assert params == [2024]

    def test_filter_risk_level_valid(self):
        """filter_risk_level with valid level."""
        for level in ["low", "medium", "high", "critical"]:
            qb = QueryBuilder("contracts c")
            qb.filter_risk_level(level)
            sql, params = qb.build_select("*")
            assert "risk_level = ?" in sql
            assert params == [level]

    def test_filter_risk_level_case_insensitive(self):
        """filter_risk_level normalizes to lowercase."""
        qb = QueryBuilder("contracts c")
        qb.filter_risk_level("HIGH")
        _, params = qb.build_select("*")
        assert params == ["high"]

    def test_filter_risk_level_invalid_raises(self):
        """filter_risk_level rejects invalid levels."""
        qb = QueryBuilder("contracts c")
        with pytest.raises(ValueError, match="Invalid risk level"):
            qb.filter_risk_level("extreme")

    def test_filter_risk_level_none_is_noop(self):
        """filter_risk_level(None) should not add conditions."""
        qb = QueryBuilder("contracts c")
        qb.filter_risk_level(None)
        sql, params = qb.build_select("*")
        assert "WHERE" not in sql

    def test_filter_search_single_column(self):
        """filter_search adds LIKE clause for single column."""
        qb = QueryBuilder("vendors v")
        qb.filter_search("pemex", ["v.name"])
        sql, params = qb.build_select("*")
        assert "v.name LIKE ?" in sql
        assert params == ["%pemex%"]

    def test_filter_search_multiple_columns(self):
        """filter_search adds OR'd LIKE clauses for multiple columns."""
        qb = QueryBuilder("vendors v")
        qb.filter_search("test", ["v.name", "v.rfc"])
        sql, params = qb.build_select("*")
        assert "v.name LIKE ?" in sql
        assert "v.rfc LIKE ?" in sql
        assert " OR " in sql
        assert params == ["%test%", "%test%"]

    def test_filter_search_empty_is_noop(self):
        """filter_search with empty string is noop."""
        qb = QueryBuilder("vendors v")
        qb.filter_search("", ["v.name"])
        sql, _ = qb.build_select("*")
        assert "LIKE" not in sql

    def test_filter_search_none_is_noop(self):
        """filter_search with None is noop."""
        qb = QueryBuilder("vendors v")
        qb.filter_search(None, ["v.name"])
        sql, _ = qb.build_select("*")
        assert "LIKE" not in sql

    def test_filter_amount_range_both(self):
        """filter_amount_range with both min and max."""
        qb = QueryBuilder("contracts c")
        qb.filter_amount_range(1_000_000, 10_000_000)
        sql, params = qb.build_select("*")
        assert "amount_mxn >= ?" in sql
        assert "amount_mxn <= ?" in sql
        assert params == [1_000_000, 10_000_000]

    def test_filter_amount_range_min_only(self):
        """filter_amount_range with only min."""
        qb = QueryBuilder("contracts c")
        qb.filter_amount_range(1_000_000, None)
        sql, params = qb.build_select("*")
        assert "amount_mxn >= ?" in sql
        assert "<=" not in sql
        assert params == [1_000_000]

    def test_filter_amount_range_max_only(self):
        """filter_amount_range with only max."""
        qb = QueryBuilder("contracts c")
        qb.filter_amount_range(None, 10_000_000)
        sql, params = qb.build_select("*")
        assert "amount_mxn <= ?" in sql
        assert ">=" not in sql
        assert params == [10_000_000]

    def test_filter_boolean_true(self):
        """filter_boolean(True) maps to 1."""
        qb = QueryBuilder("contracts c")
        qb.filter_boolean(True, "is_direct_award")
        _, params = qb.build_select("*")
        assert params == [1]

    def test_filter_boolean_false(self):
        """filter_boolean(False) maps to 0."""
        qb = QueryBuilder("contracts c")
        qb.filter_boolean(False, "is_direct_award")
        _, params = qb.build_select("*")
        assert params == [0]

    def test_filter_boolean_none_is_noop(self):
        """filter_boolean(None) does nothing."""
        qb = QueryBuilder("contracts c")
        qb.filter_boolean(None, "is_direct_award")
        sql, _ = qb.build_select("*")
        assert "WHERE" not in sql


class TestQueryBuilderChaining:
    """Test method chaining and combining multiple filters."""

    def test_multiple_filters_combined(self):
        """Multiple filters combine with AND."""
        qb = QueryBuilder("contracts c")
        qb.filter_sector(1).filter_year(2024).filter_risk_level("high")
        sql, params = qb.build_select("*")
        assert "sector_id = ?" in sql
        assert "contract_year = ?" in sql
        assert "risk_level = ?" in sql
        assert " AND " in sql
        assert params == [1, 2024, "high"]

    def test_fluent_chaining(self):
        """All filter methods return self for chaining."""
        qb = QueryBuilder("contracts c")
        result = qb.filter_sector(1)
        assert result is qb

        result = qb.filter_year(2024)
        assert result is qb

        result = qb.filter_risk_level("high")
        assert result is qb

    def test_complex_query_build(self):
        """Build a complex query with joins, filters, sort, pagination."""
        qb = QueryBuilder("contracts c")
        qb.left_join("vendors v", "c.vendor_id = v.id")
        qb.left_join("sectors s", "c.sector_id = s.id")
        qb.filter_sector(1, column="c.sector_id")
        qb.filter_year(2024, column="c.contract_year")
        qb.filter_search("pemex", ["v.name"])
        qb.sort("amount", "desc", whitelist={"amount": "c.amount_mxn"})
        qb.paginate(2, 25)

        sql, params = qb.build_select("c.id, c.amount_mxn, v.name")

        assert "SELECT c.id, c.amount_mxn, v.name" in sql
        assert "FROM contracts c" in sql
        assert "LEFT JOIN vendors v ON c.vendor_id = v.id" in sql
        assert "LEFT JOIN sectors s ON c.sector_id = s.id" in sql
        assert "c.sector_id = ?" in sql
        assert "c.contract_year = ?" in sql
        assert "v.name LIKE ?" in sql
        assert "ORDER BY c.amount_mxn DESC" in sql
        assert "LIMIT 25" in sql
        assert "OFFSET 25" in sql  # page 2, per_page 25
        assert params == [1, 2024, "%pemex%"]


class TestQueryBuilderJoins:
    """Test JOIN construction."""

    def test_inner_join(self):
        """INNER JOIN is added correctly."""
        qb = QueryBuilder("contracts c")
        qb.join("vendors v", "c.vendor_id = v.id")
        sql, _ = qb.build_select("*")
        assert "JOIN vendors v ON c.vendor_id = v.id" in sql

    def test_left_join(self):
        """LEFT JOIN is added correctly."""
        qb = QueryBuilder("contracts c")
        qb.left_join("vendors v", "c.vendor_id = v.id")
        sql, _ = qb.build_select("*")
        assert "LEFT JOIN vendors v ON c.vendor_id = v.id" in sql

    def test_multiple_joins(self):
        """Multiple joins combine correctly."""
        qb = QueryBuilder("contracts c")
        qb.left_join("vendors v", "c.vendor_id = v.id")
        qb.left_join("sectors s", "c.sector_id = s.id")
        sql, _ = qb.build_select("*")
        assert "LEFT JOIN vendors v" in sql
        assert "LEFT JOIN sectors s" in sql


class TestQueryBuilderSort:
    """Test sort/ordering."""

    def test_sort_with_whitelist(self):
        """Sort uses whitelisted column expression."""
        qb = QueryBuilder("vendors v")
        whitelist = {"name": "v.name", "risk": "v.avg_risk_score"}
        qb.sort("name", "asc", whitelist=whitelist)
        sql, _ = qb.build_select("*")
        assert "ORDER BY v.name ASC" in sql

    def test_sort_unknown_field_uses_default(self):
        """Unknown sort field falls back to default."""
        qb = QueryBuilder("vendors v")
        whitelist = {"name": "v.name"}
        qb.sort("unknown_field", "asc", whitelist=whitelist, default="v.id DESC")
        sql, _ = qb.build_select("*")
        assert "ORDER BY v.id DESC" in sql

    def test_sort_none_field_uses_default(self):
        """None sort field falls back to default."""
        qb = QueryBuilder("vendors v")
        qb.sort(None, "asc", whitelist={}, default="v.id DESC")
        sql, _ = qb.build_select("*")
        assert "ORDER BY v.id DESC" in sql

    def test_sort_prevents_injection(self):
        """Sort field not in whitelist is rejected (uses default)."""
        qb = QueryBuilder("vendors v")
        whitelist = {"name": "v.name"}
        qb.sort("'; DROP TABLE vendors; --", "asc", whitelist=whitelist)
        sql, _ = qb.build_select("*")
        assert "DROP TABLE" not in sql

    def test_sort_order_normalized(self):
        """Sort order is normalized to ASC or DESC."""
        qb = QueryBuilder("vendors v")
        qb.sort("name", "invalid", whitelist={"name": "v.name"})
        sql, _ = qb.build_select("*")
        assert "ORDER BY v.name DESC" in sql  # default to DESC


class TestQueryBuilderPagination:
    """Test pagination."""

    def test_paginate_page_1(self):
        """Page 1 has OFFSET 0."""
        qb = QueryBuilder("contracts c")
        qb.paginate(1, 50)
        sql, _ = qb.build_select("*")
        assert "LIMIT 50" in sql
        assert "OFFSET 0" in sql

    def test_paginate_page_2(self):
        """Page 2 calculates correct offset."""
        qb = QueryBuilder("contracts c")
        qb.paginate(2, 25)
        sql, _ = qb.build_select("*")
        assert "LIMIT 25" in sql
        assert "OFFSET 25" in sql

    def test_paginate_clamps_page_to_1(self):
        """Page 0 or negative is clamped to 1."""
        qb = QueryBuilder("contracts c")
        qb.paginate(0, 50)
        sql, _ = qb.build_select("*")
        assert "OFFSET 0" in sql

    def test_paginate_clamps_per_page(self):
        """per_page is clamped to 1-500."""
        qb = QueryBuilder("contracts c")
        qb.paginate(1, 1000)
        sql, _ = qb.build_select("*")
        assert "LIMIT 500" in sql

    def test_paginate_min_per_page(self):
        """per_page of 0 is clamped to 1."""
        qb = QueryBuilder("contracts c")
        qb.paginate(1, 0)
        sql, _ = qb.build_select("*")
        assert "LIMIT 1" in sql


class TestQueryBuilderGroupBy:
    """Test GROUP BY and HAVING."""

    def test_group_by(self):
        """GROUP BY clause is added."""
        qb = QueryBuilder("contracts c")
        qb.group_by("c.sector_id")
        sql, _ = qb.build_select("c.sector_id, COUNT(*)")
        assert "GROUP BY c.sector_id" in sql

    def test_having(self):
        """HAVING clause is added with parameters."""
        qb = QueryBuilder("contracts c")
        qb.group_by("c.vendor_id")
        qb.having("COUNT(*) > ?", 10)
        sql, params = qb.build_select("c.vendor_id, COUNT(*)")
        assert "HAVING COUNT(*) > ?" in sql
        assert 10 in params

    def test_count_with_group_by_wraps(self):
        """COUNT with GROUP BY wraps in subquery to count groups."""
        qb = QueryBuilder("contracts c")
        qb.group_by("c.sector_id")
        sql, _ = qb.build_count()
        assert "SELECT COUNT(*) FROM (SELECT COUNT(*)" in sql


class TestQueryBuilderWhere:
    """Test generic where clause."""

    def test_raw_where(self):
        """where() adds raw condition with params."""
        qb = QueryBuilder("contracts c")
        qb.where("c.amount_mxn > ? AND c.amount_mxn < ?", 1000, 5000)
        sql, params = qb.build_select("*")
        assert "c.amount_mxn > ? AND c.amount_mxn < ?" in sql
        assert params == [1000, 5000]


class TestQueryBuilderParams:
    """Test parameter handling and isolation."""

    def test_build_count_returns_copy_of_params(self):
        """build_count returns a new list, not the internal one."""
        qb = QueryBuilder("contracts c")
        qb.filter_sector(1)
        _, params1 = qb.build_count()
        _, params2 = qb.build_count()
        assert params1 is not params2

    def test_build_select_returns_copy_of_params(self):
        """build_select returns a new list, not the internal one."""
        qb = QueryBuilder("contracts c")
        qb.filter_sector(1)
        _, params1 = qb.build_select("*")
        _, params2 = qb.build_select("*")
        assert params1 is not params2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
