"""
Tests for institution API endpoints.
"""
import pytest


class TestInstitutionsList:
    """Tests for GET /institutions endpoint."""

    def test_list_institutions_default(self, client, base_url):
        """Test listing institutions with default parameters."""
        response = client.get(f"{base_url}/institutions")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data

    def test_list_institutions_pagination(self, client, base_url):
        """Test institution list pagination."""
        response = client.get(f"{base_url}/institutions?page=2&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 2

    def test_list_institutions_type_filter(self, client, base_url):
        """Test filtering institutions by type."""
        response = client.get(f"{base_url}/institutions?institution_type=federal_secretariat")
        assert response.status_code == 200


class TestInstitutionsSearch:
    """Tests for GET /institutions/search endpoint."""

    def test_search_institutions(self, client, base_url):
        """Test searching institutions by name."""
        response = client.get(f"{base_url}/institutions/search?q=salud")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_search_institutions_empty_query(self, client, base_url):
        """Test search with empty query returns validation error."""
        response = client.get(f"{base_url}/institutions/search?q=")
        # Empty query might return validation error or empty results
        assert response.status_code in [200, 422]

    def test_search_institutions_with_type(self, client, base_url):
        """Test searching institutions with type filter."""
        response = client.get(f"{base_url}/institutions/search?q=secretaria&institution_type=federal_secretariat")
        assert response.status_code == 200


class TestInstitutionsTop:
    """Tests for GET /institutions/top endpoint."""

    def test_top_institutions_by_spending(self, client, base_url):
        """Test top institutions by spending."""
        response = client.get(f"{base_url}/institutions/top?by=spending&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert len(data["data"]) <= 10

    def test_top_institutions_by_contracts(self, client, base_url):
        """Test top institutions by contract count."""
        response = client.get(f"{base_url}/institutions/top?by=contracts&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 5

    def test_top_institutions_by_risk(self, client, base_url):
        """Test top institutions by risk score."""
        response = client.get(f"{base_url}/institutions/top?by=risk&limit=10")
        assert response.status_code == 200

    def test_top_institutions_sector_filter(self, client, base_url):
        """Test top institutions filtered by sector."""
        response = client.get(f"{base_url}/institutions/top?sector_id=1&limit=10")
        assert response.status_code == 200


class TestInstitutionsHierarchy:
    """Tests for GET /institutions/hierarchy endpoint."""

    def test_hierarchy_default(self, client, base_url):
        """Test getting institution hierarchy."""
        response = client.get(f"{base_url}/institutions/hierarchy")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_hierarchy_with_type(self, client, base_url):
        """Test getting hierarchy filtered by type."""
        response = client.get(f"{base_url}/institutions/hierarchy?institution_type=federal_secretariat")
        assert response.status_code == 200


class TestInstitutionDetail:
    """Tests for GET /institutions/{id} endpoint."""

    def test_institution_detail_valid(self, client, base_url):
        """Test getting institution details with valid ID."""
        # First get an institution ID from the list
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/institutions/{institution_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == institution_id

    def test_institution_detail_not_found(self, client, base_url):
        """Test getting institution details with non-existent ID."""
        response = client.get(f"{base_url}/institutions/999999999")
        assert response.status_code == 404


class TestInstitutionContracts:
    """Tests for GET /institutions/{id}/contracts endpoint."""

    def test_institution_contracts(self, client, base_url):
        """Test getting institution's contracts."""
        # First get an institution ID
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/institutions/{institution_id}/contracts")
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
            assert "pagination" in data

    def test_institution_contracts_with_filters(self, client, base_url):
        """Test getting institution's contracts with filters."""
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(
                f"{base_url}/institutions/{institution_id}/contracts?year=2023&risk_level=high"
            )
            assert response.status_code == 200


class TestInstitutionVendors:
    """Tests for GET /institutions/{id}/vendors endpoint."""

    def test_institution_vendors(self, client, base_url):
        """Test getting vendors that work with an institution."""
        # First get an institution ID
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/institutions/{institution_id}/vendors")
            assert response.status_code == 200
            data = response.json()
            assert "data" in data


class TestInstitutionRiskTimeline:
    """Tests for GET /institutions/{id}/risk-timeline endpoint."""

    def test_institution_risk_timeline(self, client, base_url):
        """Test getting institution's risk timeline."""
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/institutions/{institution_id}/risk-timeline")
            assert response.status_code == 200
            data = response.json()
            assert "institution_id" in data
            assert "institution_name" in data
            assert "timeline" in data
            assert isinstance(data["timeline"], list)
            if data["timeline"]:
                item = data["timeline"][0]
                assert "year" in item
                assert "avg_risk_score" in item
                assert "contract_count" in item

    def test_institution_risk_timeline_not_found(self, client, base_url):
        """Test risk timeline with non-existent institution."""
        response = client.get(f"{base_url}/institutions/999999999/risk-timeline")
        assert response.status_code == 404


class TestInstitutionTypes:
    """Tests for GET /institutions/types endpoint."""

    def test_institution_types(self, client, base_url):
        """Test getting list of institution types."""
        response = client.get(f"{base_url}/institutions/types")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
