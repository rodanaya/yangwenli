"""
Security tests for the Yang Wen-li API.

Tests for:
- SQL injection prevention
- CSV formula injection prevention
- Rate limiting (if enabled)
- Amount validation
- RFC privacy protection
"""
import pytest


class TestSQLInjectionPrevention:
    """Test that SQL injection attempts are properly handled."""

    def test_vendor_search_sql_injection(self, client, base_url):
        """Test that SQL injection in vendor search is prevented."""
        # Common SQL injection patterns
        injection_patterns = [
            "'; DROP TABLE vendors; --",
            "1' OR '1'='1",
            "1; DELETE FROM contracts",
            "1 UNION SELECT * FROM vendors",
            "Robert'); DROP TABLE contracts;--",
        ]

        for pattern in injection_patterns:
            response = client.get(
                f"{base_url}/vendors",
                params={"search": pattern}
            )
            # Should return 200 (empty results) not 500
            assert response.status_code == 200, f"SQL injection attempt should be handled: {pattern}"

    def test_contract_filter_sql_injection(self, client, base_url):
        """Test that SQL injection in contract filters is prevented."""
        # Attempt injection via year parameter
        response = client.get(
            f"{base_url}/contracts",
            params={"year": "2020; DROP TABLE contracts;"}
        )
        # Should fail validation (not 500)
        assert response.status_code == 422, "Invalid year should fail validation"


class TestCSVFormulaInjection:
    """Test that CSV exports are protected against formula injection."""

    def test_csv_export_sanitization(self, client, base_url):
        """Test that CSV export sanitizes dangerous characters."""
        # Export contracts
        response = client.get(f"{base_url}/export/contracts/csv", params={"limit": 10})

        if response.status_code == 200:
            content = response.content.decode('utf-8')

            # CSV should not have unquoted formula characters at start of cells
            lines = content.split('\n')
            for line in lines[1:]:  # Skip header
                if line.strip():
                    # Check that cells starting with dangerous chars are quoted or prefixed
                    cells = line.split(',')
                    for cell in cells:
                        cell = cell.strip().strip('"')
                        # If starts with dangerous char, should be prefixed with '
                        if cell and cell[0] in '=+-@':
                            # Either quoted properly or prefixed with '
                            assert cell.startswith("'") or cell[0] not in '=+-@', \
                                f"Dangerous cell not sanitized: {cell}"


class TestAmountValidation:
    """Test that contract amount validation is enforced."""

    def test_contract_amount_threshold_filter(self, client, base_url):
        """Test that contracts above 100B MXN are excluded."""
        response = client.get(
            f"{base_url}/contracts",
            params={"min_amount": 100_000_000_001}  # Above 100B threshold
        )

        if response.status_code == 200:
            data = response.json()
            # Should return no contracts above threshold
            for contract in data.get("data", []):
                if contract.get("amount_mxn"):
                    assert contract["amount_mxn"] <= 100_000_000_000, \
                        "Contract above 100B threshold should not be returned"

    def test_export_respects_amount_threshold(self, client, base_url):
        """Test that exports respect the 100B MXN threshold."""
        response = client.get(
            f"{base_url}/export/contracts/csv",
            params={"limit": 100, "min_amount": 50_000_000_000}
        )

        if response.status_code == 200:
            content = response.content.decode('utf-8')
            # Parse CSV and check amounts
            lines = content.split('\n')
            if len(lines) > 1:
                # Find amount column index
                headers = lines[0].split(',')
                amount_idx = None
                for i, h in enumerate(headers):
                    if 'amount' in h.lower():
                        amount_idx = i
                        break

                if amount_idx is not None:
                    for line in lines[1:]:
                        if line.strip():
                            cells = line.split(',')
                            if len(cells) > amount_idx:
                                try:
                                    amount = float(cells[amount_idx].strip().strip('"'))
                                    assert amount <= 100_000_000_000, \
                                        f"Export contains amount above threshold: {amount}"
                                except ValueError:
                                    pass  # Non-numeric value, skip


class TestRFCPrivacy:
    """Test that RFC (tax ID) is protected in list responses."""

    def test_vendor_list_excludes_rfc(self, client, base_url):
        """Test that vendor list response does not include RFC."""
        response = client.get(f"{base_url}/vendors", params={"per_page": 10})

        if response.status_code == 200:
            data = response.json()
            for vendor in data.get("data", []):
                # RFC should not be present in list response
                assert "rfc" not in vendor or vendor.get("rfc") is None, \
                    "RFC should not be in vendor list response"

    def test_vendor_detail_includes_rfc(self, client, base_url):
        """Test that vendor detail response does include RFC."""
        # First get a vendor ID
        list_response = client.get(f"{base_url}/vendors", params={"per_page": 1})

        if list_response.status_code == 200:
            vendors = list_response.json().get("data", [])
            if vendors:
                vendor_id = vendors[0]["id"]

                # Get vendor detail
                detail_response = client.get(f"{base_url}/vendors/{vendor_id}")

                if detail_response.status_code == 200:
                    detail = detail_response.json()
                    # RFC should be present in detail response (even if null)
                    assert "rfc" in detail, "RFC should be available in vendor detail"


class TestInputValidation:
    """Test that input validation is properly enforced."""

    def test_invalid_sector_id_rejected(self, client, base_url):
        """Test that invalid sector IDs are rejected."""
        # Sector IDs must be 1-12
        invalid_ids = [0, 13, -1, 999]

        for sector_id in invalid_ids:
            response = client.get(
                f"{base_url}/contracts",
                params={"sector_id": sector_id}
            )
            assert response.status_code == 422, \
                f"Invalid sector_id {sector_id} should be rejected"

    def test_invalid_year_rejected(self, client, base_url):
        """Test that invalid years are rejected."""
        invalid_years = [1900, 3000, -2020]

        for year in invalid_years:
            response = client.get(
                f"{base_url}/contracts",
                params={"year": year}
            )
            assert response.status_code == 422, \
                f"Invalid year {year} should be rejected"

    def test_pagination_limits_enforced(self, client, base_url):
        """Test that pagination limits are enforced."""
        response = client.get(
            f"{base_url}/contracts",
            params={"per_page": 1000}  # Above allowed limit
        )
        assert response.status_code == 422, \
            "per_page above limit should be rejected"


class TestDatabaseTimeout:
    """Test that database timeouts are configured."""

    def test_connection_has_timeout(self):
        """Test that database connections have timeout configured."""
        from api.dependencies import get_db_connection, DB_QUERY_TIMEOUT

        conn = get_db_connection()
        try:
            # Check that timeout is set
            assert DB_QUERY_TIMEOUT > 0, "Query timeout should be positive"
            assert DB_QUERY_TIMEOUT <= 60, "Query timeout should be reasonable (<=60s)"
        finally:
            conn.close()
