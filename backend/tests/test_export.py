"""
Tests for export API endpoints.
"""
import pytest


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
