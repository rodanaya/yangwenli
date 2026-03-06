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


class TestVendorRiskTimeline:
    """Tests for GET /vendors/{vendor_id}/risk-timeline endpoint."""

    def test_vendor_risk_timeline(self, client, base_url):
        """Test getting vendor's risk timeline."""
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/risk-timeline")
            assert response.status_code == 200
            data = response.json()
            assert "vendor_id" in data
            assert "vendor_name" in data
            assert "timeline" in data
            assert isinstance(data["timeline"], list)
            if data["timeline"]:
                item = data["timeline"][0]
                assert "year" in item
                assert "avg_risk_score" in item
                assert "contract_count" in item

    def test_vendor_risk_timeline_not_found(self, client, base_url):
        """Test risk timeline with non-existent vendor."""
        response = client.get(f"{base_url}/vendors/999999999/risk-timeline")
        assert response.status_code == 404


class TestVendorAISummary:
    """Tests for GET /vendors/{vendor_id}/ai-summary endpoint."""

    def test_vendor_ai_summary(self, client, base_url):
        """Test getting vendor's AI summary."""
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/ai-summary")
            assert response.status_code == 200
            data = response.json()
            assert "vendor_id" in data
            assert "vendor_name" in data
            assert "summary" in data
            assert "insights" in data
            assert isinstance(data["insights"], list)
            assert data["generated_by"] == "v5.0 feature analysis"

    def test_vendor_ai_summary_not_found(self, client, base_url):
        """Test AI summary with non-existent vendor."""
        response = client.get(f"{base_url}/vendors/999999999/ai-summary")
        assert response.status_code == 404


class TestVendorGroundTruthStatus:
    """Tests for GET /vendors/{vendor_id}/ground-truth-status endpoint."""

    def test_vendor_ground_truth_status_returns_object(self, client, base_url):
        """Endpoint should return is_known_bad and cases list."""
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(
                f"{base_url}/vendors/{vendor_id}/ground-truth-status"
            )
            assert response.status_code == 200
            data = response.json()
            assert "is_known_bad" in data
            assert isinstance(data["is_known_bad"], bool)
            assert "cases" in data
            assert isinstance(data["cases"], list)

    def test_vendor_ground_truth_status_not_found(self, client, base_url):
        """Non-existent vendor should return 404."""
        response = client.get(f"{base_url}/vendors/999999999/ground-truth-status")
        assert response.status_code == 404

    def test_vendor_ground_truth_status_known_bad_shape(self, client, base_url):
        """Known-bad vendor case items should have required fields."""
        # Try a few vendors to find a GT-linked one
        list_response = client.get(f"{base_url}/vendors?per_page=20")
        if list_response.status_code != 200:
            return
        for vendor in list_response.json().get("data", []):
            response = client.get(
                f"{base_url}/vendors/{vendor['id']}/ground-truth-status"
            )
            assert response.status_code == 200
            data = response.json()
            if data.get("is_known_bad") and data.get("cases"):
                case = data["cases"][0]
                assert "case_id" in case
                assert "case_name" in case
                assert "case_type" in case
                break


class TestVendorQQW:
    """Tests for GET /vendors/{vendor_id}/qqw endpoint."""

    def test_vendor_qqw_returns_200(self, client, base_url):
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/qqw")
            assert response.status_code == 200

    def test_vendor_qqw_has_required_fields(self, client, base_url):
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/qqw")
            assert response.status_code == 200
            data = response.json()
            assert "vendor_id" in data
            assert "has_data" in data
            assert "qqw_contract_count" in data
            assert "procurement_officials" in data
            assert "contracts" in data
            assert "note" in data
            assert isinstance(data["procurement_officials"], list)
            assert isinstance(data["contracts"], list)

    def test_vendor_qqw_not_found(self, client, base_url):
        response = client.get(f"{base_url}/vendors/999999999/qqw")
        assert response.status_code == 404

    def test_vendor_qqw_no_data_has_false(self, client, base_url):
        """Vendor with no QQW records should return has_data=False, not error."""
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/qqw")
            assert response.status_code == 200
            data = response.json()
            # has_data can be True or False — but must be a bool
            assert isinstance(data["has_data"], bool)


class TestVendorVerified:
    """Tests for existing verified vendor endpoints."""

    def test_verified_vendors(self, client, base_url):
        """Test getting verified vendor classifications."""
        response = client.get(f"{base_url}/vendors/verified")
        assert response.status_code == 200
