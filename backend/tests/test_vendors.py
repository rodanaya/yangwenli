"""
Tests for vendor API endpoints.
"""
import pytest


class TestVendorsList:
    """Tests for GET /vendors endpoint."""

    def test_list_vendors_default(self, client, base_url):
        """Test listing vendors with default parameters."""
        response = client.get(f"{base_url}/vendors")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert data["pagination"]["page"] == 1

    def test_list_vendors_pagination(self, client, base_url):
        """Test vendor list pagination."""
        response = client.get(f"{base_url}/vendors?page=2&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 2
        assert data["pagination"]["per_page"] == 10

    def test_list_vendors_invalid_page(self, client, base_url):
        """Test vendor list with invalid page parameter."""
        response = client.get(f"{base_url}/vendors?page=0")
        assert response.status_code == 422  # Validation error


class TestVendorsTop:
    """Tests for GET /vendors/top endpoint."""

    def test_top_vendors_by_value(self, client, base_url):
        """Test top vendors sorted by contract value."""
        response = client.get(f"{base_url}/vendors/top?by=value&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert len(data["data"]) <= 10

    def test_top_vendors_by_count(self, client, base_url):
        """Test top vendors sorted by contract count."""
        response = client.get(f"{base_url}/vendors/top?by=count&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 5

    def test_top_vendors_by_risk(self, client, base_url):
        """Test top vendors sorted by risk score."""
        response = client.get(f"{base_url}/vendors/top?by=risk&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_top_vendors_sector_filter(self, client, base_url):
        """Test top vendors filtered by sector."""
        response = client.get(f"{base_url}/vendors/top?sector_id=1&limit=10")
        assert response.status_code == 200


class TestVendorDetail:
    """Tests for GET /vendors/{vendor_id} endpoint."""

    def test_vendor_detail_valid(self, client, base_url):
        """Test getting vendor details with valid ID."""
        # First get a vendor ID from the list
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == vendor_id

    def test_vendor_detail_not_found(self, client, base_url):
        """Test getting vendor details with non-existent ID."""
        response = client.get(f"{base_url}/vendors/999999999")
        assert response.status_code == 404


class TestVendorContracts:
    """Tests for GET /vendors/{vendor_id}/contracts endpoint."""

    def test_vendor_contracts(self, client, base_url):
        """Test getting vendor's contracts."""
        # First get a vendor ID
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/contracts")
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
            assert "pagination" in data


class TestVendorInstitutions:
    """Tests for GET /vendors/{vendor_id}/institutions endpoint."""

    def test_vendor_institutions(self, client, base_url):
        """Test getting institutions a vendor works with."""
        # First get a vendor ID
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/institutions")
            assert response.status_code == 200
            data = response.json()
            assert "data" in data


class TestVendorRiskProfile:
    """Tests for GET /vendors/{vendor_id}/risk-profile endpoint."""

    def test_vendor_risk_profile(self, client, base_url):
        """Test getting vendor's risk profile."""
        # First get a vendor ID
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/risk-profile")
            assert response.status_code == 200
            data = response.json()
            assert "vendor_id" in data
            assert "avg_risk_score" in data


class TestVendorRelated:
    """Tests for GET /vendors/{vendor_id}/related endpoint."""

    def test_vendor_related(self, client, base_url):
        """Test getting related vendors."""
        # First get a vendor ID
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/related")
            assert response.status_code == 200
            data = response.json()
            assert "data" in data


class TestVendorVerified:
    """Tests for existing verified vendor endpoints."""

    def test_verified_vendors(self, client, base_url):
        """Test getting verified vendor classifications."""
        response = client.get(f"{base_url}/vendors/verified")
        assert response.status_code == 200
