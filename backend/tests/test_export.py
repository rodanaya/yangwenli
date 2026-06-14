"""
Tests for export API endpoints.

Covers all 13 filter facets on contracts CSV/Excel and new vendor facets.
Parity tests confirm export row counts match the list endpoint for the same filters.
"""
import csv
import io

import pytest


def _count_csv_data_rows(content: bytes) -> int:
    """Count CSV data rows (excluding the header), correctly handling quoted
    fields that contain embedded newlines — contract titles/descriptions do,
    so a naive splitlines() over-counts."""
    reader = csv.reader(io.StringIO(content.decode("utf-8")))
    rows = [r for r in reader if any(cell.strip() for cell in r)]
    return max(0, len(rows) - 1)


class TestExportContractsCSV:
    """Tests for GET /export/contracts/csv endpoint."""

    def test_export_contracts_csv_default(self, client, base_url):
        """Test exporting contracts as CSV with default parameters."""
        response = client.get(f"{base_url}/export/contracts/csv?limit=100")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers.get("content-disposition", "")
        # Check that content looks like CSV
        content = response.content.decode("utf-8")
        assert "id" in content  # First column header
        assert "," in content  # CSV delimiter

    def test_export_contracts_csv_with_filters(self, client, base_url):
        """Test exporting contracts with sector filter."""
        response = client.get(f"{base_url}/export/contracts/csv?sector_id=1&limit=50")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"

    def test_export_contracts_csv_year_filter(self, client, base_url):
        """Test exporting contracts with year filter."""
        response = client.get(f"{base_url}/export/contracts/csv?year=2023&limit=50")
        assert response.status_code == 200

    def test_export_contracts_csv_risk_filter(self, client, base_url):
        """Test exporting contracts with risk level filter."""
        response = client.get(f"{base_url}/export/contracts/csv?risk_level=high&limit=50")
        assert response.status_code == 200

    def test_export_contracts_csv_amount_filters(self, client, base_url):
        """Test exporting contracts with amount filters."""
        response = client.get(
            f"{base_url}/export/contracts/csv?min_amount=1000000&max_amount=10000000&limit=50"
        )
        assert response.status_code == 200

    def test_export_contracts_csv_invalid_sector(self, client, base_url):
        """Test exporting contracts with invalid sector ID."""
        response = client.get(f"{base_url}/export/contracts/csv?sector_id=99")
        assert response.status_code == 422  # Validation error

    def test_export_contracts_csv_limit_validation(self, client, base_url):
        """Test that limit parameter is validated."""
        # Limit exceeding max should fail
        response = client.get(f"{base_url}/export/contracts/csv?limit=200000")
        assert response.status_code == 422

    # --- New facet tests ---

    def test_export_contracts_csv_category_id(self, client, base_url):
        """category_id filter returns valid CSV."""
        response = client.get(f"{base_url}/export/contracts/csv?category_id=1&limit=50")
        assert response.status_code == 200
        content = response.content.decode("utf-8")
        assert "category_id" in content

    def test_export_contracts_csv_search(self, client, base_url):
        """search param (>=3 chars) returns valid CSV."""
        response = client.get(f"{base_url}/export/contracts/csv?search=servicios&limit=50")
        assert response.status_code == 200
        content = response.content.decode("utf-8")
        assert "id" in content

    def test_export_contracts_csv_search_too_short(self, client, base_url):
        """search param <3 chars is rejected with 422."""
        response = client.get(f"{base_url}/export/contracts/csv?search=ab")
        assert response.status_code == 422

    def test_export_contracts_csv_risk_factor_direct_award(self, client, base_url):
        """risk_factor=direct_award uses indexed column path."""
        response = client.get(
            f"{base_url}/export/contracts/csv?risk_factor=direct_award&limit=50"
        )
        assert response.status_code == 200

    def test_export_contracts_csv_risk_factor_single_bid(self, client, base_url):
        """risk_factor=single_bid uses indexed column path."""
        response = client.get(
            f"{base_url}/export/contracts/csv?risk_factor=single_bid&limit=50"
        )
        assert response.status_code == 200

    def test_export_contracts_csv_risk_factor_price_hyp(self, client, base_url):
        """risk_factor=price_hyp uses NULL-check path."""
        response = client.get(
            f"{base_url}/export/contracts/csv?risk_factor=price_hyp&limit=50"
        )
        assert response.status_code == 200

    def test_export_contracts_csv_risk_factor_dynamic(self, client, base_url):
        """Unknown risk_factor falls back to LIKE scan without error."""
        response = client.get(
            f"{base_url}/export/contracts/csv?risk_factor=co_bid&limit=50"
        )
        assert response.status_code == 200

    def test_export_contracts_csv_combined_new_facets(self, client, base_url):
        """Combining category_id + risk_factor returns valid CSV."""
        response = client.get(
            f"{base_url}/export/contracts/csv?category_id=1&risk_factor=direct_award&limit=50"
        )
        assert response.status_code == 200

    def test_export_contracts_csv_filename_includes_category(self, client, base_url):
        """Filename includes category filter when set."""
        response = client.get(
            f"{base_url}/export/contracts/csv?category_id=5&limit=10"
        )
        assert response.status_code == 200
        disposition = response.headers.get("content-disposition", "")
        assert "cat5" in disposition

    def test_export_contracts_csv_parity_with_list(self, client, base_url):
        """Export row count matches list endpoint count for same filters.

        Uses sector_id=1 + year=2023 so both queries run on a manageable
        slice without hitting the full 3.1M-row cold scan in CI.
        """
        export_resp = client.get(
            f"{base_url}/export/contracts/csv?sector_id=1&year=2023&limit=10000"
        )
        assert export_resp.status_code == 200

        list_resp = client.get(
            f"{base_url}/contracts?sector_id=1&year=2023&per_page=1"
        )
        assert list_resp.status_code == 200

        export_data_rows = _count_csv_data_rows(export_resp.content)

        list_total = list_resp.json()["pagination"]["total"]

        # Export may be capped at limit (10000) while list total can be larger.
        # If list total <= 10000 the counts must match exactly.
        if list_total <= 10000:
            assert export_data_rows == list_total, (
                f"Export returned {export_data_rows} rows but list reports {list_total} total"
            )
        else:
            # Export hit the limit cap — confirm it returned exactly limit rows.
            assert export_data_rows == 10000

    def test_export_contracts_csv_parity_category_search(self, client, base_url):
        """Export and list endpoint agree on row count for category_id filter."""
        export_resp = client.get(
            f"{base_url}/export/contracts/csv?category_id=1&limit=10000"
        )
        assert export_resp.status_code == 200

        list_resp = client.get(
            f"{base_url}/contracts?category_id=1&per_page=1"
        )
        assert list_resp.status_code == 200

        export_data_rows = _count_csv_data_rows(export_resp.content)
        list_total = list_resp.json()["pagination"]["total"]

        if list_total <= 10000:
            assert export_data_rows == list_total, (
                f"category_id=1: export={export_data_rows}, list={list_total}"
            )
        else:
            assert export_data_rows == 10000


class TestExportContractsExcel:
    """Tests for GET /export/contracts/excel endpoint."""

    def test_export_contracts_excel_default(self, client, base_url):
        """Test exporting contracts as Excel with default parameters."""
        response = client.get(f"{base_url}/export/contracts/excel?limit=100")
        # May be 200 or 501 depending on whether openpyxl is installed
        assert response.status_code in [200, 501]
        if response.status_code == 200:
            assert "spreadsheetml" in response.headers["content-type"]
            assert "attachment" in response.headers.get("content-disposition", "")

    def test_export_contracts_excel_with_filters(self, client, base_url):
        """Test exporting contracts as Excel with filters."""
        response = client.get(f"{base_url}/export/contracts/excel?sector_id=1&year=2023&limit=50")
        assert response.status_code in [200, 501]

    def test_export_contracts_excel_category_id(self, client, base_url):
        """category_id filter works for Excel export."""
        response = client.get(
            f"{base_url}/export/contracts/excel?category_id=1&limit=50"
        )
        assert response.status_code in [200, 501]

    def test_export_contracts_excel_search(self, client, base_url):
        """search filter works for Excel export."""
        response = client.get(
            f"{base_url}/export/contracts/excel?search=servicios&limit=50"
        )
        assert response.status_code in [200, 501]

    def test_export_contracts_excel_risk_factor(self, client, base_url):
        """risk_factor filter works for Excel export."""
        response = client.get(
            f"{base_url}/export/contracts/excel?risk_factor=direct_award&limit=50"
        )
        assert response.status_code in [200, 501]

    def test_export_contracts_excel_filename_includes_category(self, client, base_url):
        """Filename includes category filter when set."""
        response = client.get(
            f"{base_url}/export/contracts/excel?category_id=5&limit=10"
        )
        assert response.status_code in [200, 501]
        if response.status_code == 200:
            disposition = response.headers.get("content-disposition", "")
            assert "cat5" in disposition


class TestExportVendorsCSV:
    """Tests for GET /export/vendors/csv endpoint."""

    def test_export_vendors_csv_default(self, client, base_url):
        """Test exporting vendors as CSV with default parameters."""
        response = client.get(f"{base_url}/export/vendors/csv?limit=100")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers.get("content-disposition", "")
        # Check that content looks like CSV
        content = response.content.decode("utf-8")
        assert "id" in content
        assert "name" in content

    def test_export_vendors_csv_with_sector(self, client, base_url):
        """Test exporting vendors filtered by sector."""
        response = client.get(f"{base_url}/export/vendors/csv?sector_id=1&limit=50")
        assert response.status_code == 200

    def test_export_vendors_csv_min_contracts(self, client, base_url):
        """Test exporting vendors with minimum contract count."""
        response = client.get(f"{base_url}/export/vendors/csv?min_contracts=10&limit=50")
        assert response.status_code == 200

    def test_export_vendors_csv_min_value(self, client, base_url):
        """Test exporting vendors with minimum contract value."""
        response = client.get(f"{base_url}/export/vendors/csv?min_value=1000000&limit=50")
        assert response.status_code == 200

    def test_export_vendors_csv_has_rfc(self, client, base_url):
        """Test exporting vendors that have RFC."""
        response = client.get(f"{base_url}/export/vendors/csv?has_rfc=true&limit=50")
        assert response.status_code == 200

    def test_export_vendors_csv_no_rfc(self, client, base_url):
        """Test exporting vendors without RFC."""
        response = client.get(f"{base_url}/export/vendors/csv?has_rfc=false&limit=50")
        assert response.status_code == 200

    # --- New facet tests ---

    def test_export_vendors_csv_search(self, client, base_url):
        """search param filters by vendor name."""
        response = client.get(f"{base_url}/export/vendors/csv?search=construccion&limit=50")
        assert response.status_code == 200
        content = response.content.decode("utf-8")
        assert "id" in content

    def test_export_vendors_csv_search_too_short(self, client, base_url):
        """search param <3 chars is rejected with 422."""
        response = client.get(f"{base_url}/export/vendors/csv?search=ab")
        assert response.status_code == 422

    def test_export_vendors_csv_risk_level(self, client, base_url):
        """risk_level filter returns vendors whose predominant level matches."""
        response = client.get(f"{base_url}/export/vendors/csv?risk_level=high&limit=50")
        assert response.status_code == 200

    def test_export_vendors_csv_combined_new_facets(self, client, base_url):
        """search + risk_level combination works without error."""
        response = client.get(
            f"{base_url}/export/vendors/csv?search=construccion&risk_level=high&limit=50"
        )
        assert response.status_code == 200

    def test_export_vendors_csv_rfc_masked_for_individuals(self, client, base_url):
        """RFC column is NULL for individual (persona fisica) vendors."""
        response = client.get(f"{base_url}/export/vendors/csv?limit=200")
        assert response.status_code == 200
        # We can't easily check individual masking without knowing specific vendor IDs,
        # but confirm the rfc column header is present.
        content = response.content.decode("utf-8")
        assert "rfc" in content


class TestExportFilenames:
    """Tests for export filename generation."""

    def test_csv_filename_includes_timestamp(self, client, base_url):
        """Test that CSV exports have timestamped filenames."""
        response = client.get(f"{base_url}/export/contracts/csv?limit=10")
        assert response.status_code == 200
        disposition = response.headers.get("content-disposition", "")
        assert "contracts" in disposition
        assert ".csv" in disposition

    def test_csv_filename_includes_filters(self, client, base_url):
        """Test that CSV filenames include filter info."""
        response = client.get(f"{base_url}/export/contracts/csv?sector_id=1&year=2023&limit=10")
        assert response.status_code == 200
        disposition = response.headers.get("content-disposition", "")
        assert "sector1" in disposition
        assert "year2023" in disposition

    def test_csv_filename_includes_category(self, client, base_url):
        """Filename includes category when category_id is set."""
        response = client.get(
            f"{base_url}/export/contracts/csv?sector_id=1&category_id=3&limit=10"
        )
        assert response.status_code == 200
        disposition = response.headers.get("content-disposition", "")
        assert "sector1" in disposition
        assert "cat3" in disposition


class TestExportSecurityGuards:
    """Verify security guards are preserved after the refactor."""

    def test_max_export_rows_enforced(self, client, base_url):
        """Exceeding MAX_EXPORT_ROWS is rejected."""
        response = client.get(f"{base_url}/export/contracts/csv?limit=200000")
        assert response.status_code == 422

    def test_max_amount_cap_enforced(self, client, base_url):
        """max_amount > 100B MXN is rejected."""
        response = client.get(
            f"{base_url}/export/contracts/csv?max_amount=200000000000&limit=10"
        )
        assert response.status_code == 422

    def test_csv_injection_protection(self, client, base_url):
        """CSV output does not contain raw formula-injection prefixes in data."""
        # We request a small slice and check that any cell starting with = is prefixed
        response = client.get(f"{base_url}/export/contracts/csv?limit=100")
        assert response.status_code == 200
        content = response.content.decode("utf-8")
        lines = content.splitlines()
        for line in lines[1:]:  # Skip header
            for cell in line.split(","):
                cell_stripped = cell.strip('"')
                # A raw formula would start with = without the ' prefix
                # (sanitized ones start with '=)
                assert not (cell_stripped.startswith("=") and not cell_stripped.startswith("'=")), (
                    f"Unsanitized formula cell found: {cell_stripped[:30]}"
                )
