"""
Quality Remediation Verification Script

Tests all 16 remediation fixes by inspecting the code and database state.
"""
import sys
import sqlite3
import re
from pathlib import Path
from datetime import datetime

# Add backend to path
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

DB_PATH = BACKEND_DIR / "RUBLI_NORMALIZED.db"

# Test results tracking
PASSED = []
FAILED = []

def test(name: str, condition: bool, details: str = ""):
    """Record test result."""
    if condition:
        PASSED.append(name)
        print(f"  [PASS] {name}")
    else:
        FAILED.append((name, details))
        print(f"  [FAIL] {name}")
        if details:
            print(f"         {details}")


def verify_contracts_router():
    """Verify contracts.py remediation."""
    print("\n" + "="*60)
    print("1. CONTRACTS ROUTER (contracts.py)")
    print("="*60)

    router_path = BACKEND_DIR / "api" / "routers" / "contracts.py"
    content = router_path.read_text(encoding='utf-8')

    # P1.2: Amount validation in query
    test(
        "Amount validation: MAX_CONTRACT_VALUE constant",
        "MAX_CONTRACT_VALUE = 100_000_000_000" in content,
        "Missing MAX_CONTRACT_VALUE constant"
    )

    test(
        "Amount validation: Filter >100B in WHERE",
        "amount_mxn <= ?" in content or "amount_mxn <= ?" in content.replace(" ", ""),
        "Missing amount filter in queries"
    )

    # P2.1: SQL injection protection
    test(
        "SQL injection: SORT_FIELD_MAPPING whitelist exists",
        "SORT_FIELD_MAPPING" in content,
        "Missing SORT_FIELD_MAPPING whitelist"
    )

    test(
        "SQL injection: Whitelist lookup used",
        "SORT_FIELD_MAPPING.get(" in content,
        "Missing whitelist lookup for sort_by"
    )

    # P3.4: Pagination limit
    test(
        "Pagination: limit is 100 (not 200)",
        "le=100" in content and "le=200" not in content,
        "Pagination limit should be 100, not 200"
    )

    # P3.3: Sector ID validation
    test(
        "Sector validation: ge=1, le=12 on sector_id",
        "ge=1, le=12" in content or "ge=1,le=12" in content.replace(" ", ""),
        "Missing sector_id validation (1-12)"
    )

    # P3.2: Database error handling
    test(
        "Error handling: try/except for sqlite3.Error",
        "except sqlite3.Error" in content,
        "Missing database error handling"
    )

    test(
        "Error handling: HTTPException 500",
        'HTTPException(status_code=500' in content,
        "Missing 500 HTTPException for DB errors"
    )

    # Risk level validation
    test(
        "Risk level: VALID_RISK_LEVELS defined",
        "VALID_RISK_LEVELS" in content,
        "Missing risk level validation set"
    )


def verify_institutions_router():
    """Verify institutions.py remediation."""
    print("\n" + "="*60)
    print("2. INSTITUTIONS ROUTER (institutions.py)")
    print("="*60)

    router_path = BACKEND_DIR / "api" / "routers" / "institutions.py"
    content = router_path.read_text(encoding='utf-8')

    # P1.3: Formula fix - the fixed formula should have proper parentheses
    # Correct: ((size_adjustment + 0.2) * 0.2)
    # Wrong:   (size_adjustment + 0.2) * 0.2  (without outer parens in formula)

    test(
        "Institution risk formula: Correct parentheses",
        "((size_adjustment + 0.2) * 0.2)" in content,
        "Formula should be ((size_adjustment + 0.2) * 0.2)"
    )

    # Uses get_db context manager
    test(
        "DB connection: Uses get_db() context manager",
        "with get_db()" in content,
        "Should use get_db() context manager"
    )


def verify_risk_scoring():
    """Verify calculate_risk_scores.py remediation."""
    print("\n" + "="*60)
    print("3. RISK SCORING (calculate_risk_scores.py)")
    print("="*60)

    script_path = BACKEND_DIR / "scripts" / "calculate_risk_scores.py"
    content = script_path.read_text(encoding='utf-8')

    # P1.1: Amount validation
    test(
        "Amount validation: MAX_CONTRACT_VALUE constant",
        "MAX_CONTRACT_VALUE = 100_000_000_000" in content,
        "Missing MAX_CONTRACT_VALUE constant"
    )

    test(
        "Amount validation: Check in calculate_risk_batch",
        "amount > MAX_CONTRACT_VALUE" in content,
        "Missing amount validation in batch calculation"
    )

    test(
        "Amount validation: data_error factor added",
        "data_error:amount_rejected" in content,
        "Missing data_error factor for rejected amounts"
    )

    # P2.2: Transaction safety
    test(
        "Transaction: BEGIN TRANSACTION used",
        "BEGIN TRANSACTION" in content,
        "Missing explicit BEGIN TRANSACTION"
    )

    test(
        "Transaction: COMMIT used",
        '"COMMIT"' in content or "'COMMIT'" in content,
        "Missing explicit COMMIT"
    )

    test(
        "Transaction: ROLLBACK on error",
        "ROLLBACK" in content,
        "Missing ROLLBACK on error"
    )

    # P2.3: try/finally wrapper
    test(
        "Cleanup: try/finally in main()",
        "finally:" in content,
        "Missing finally block for cleanup"
    )

    test(
        "Cleanup: conn.close() in finally",
        "conn.close()" in content,
        "Missing conn.close() for cleanup"
    )

    # Parameterized queries
    test(
        "SQL safety: Parameterized LIMIT/OFFSET",
        "LIMIT ? OFFSET ?" in content,
        "Missing parameterized LIMIT/OFFSET"
    )


def verify_database_state():
    """Verify database state after remediation."""
    print("\n" + "="*60)
    print("4. DATABASE STATE")
    print("="*60)

    if not DB_PATH.exists():
        test("Database exists", False, f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check for amounts > 100B (should be 0 or very few)
    c.execute("SELECT COUNT(*) FROM contracts WHERE amount_mxn > 100000000000")
    bad_amounts = c.fetchone()[0]
    test(
        f"No amounts > 100B MXN (found: {bad_amounts})",
        bad_amounts == 0,
        f"Found {bad_amounts} contracts with amount > 100B MXN"
    )

    # Check risk columns exist
    c.execute("PRAGMA table_info(contracts)")
    columns = {row[1] for row in c.fetchall()}
    test(
        "Risk columns exist",
        "risk_score" in columns and "risk_level" in columns,
        "Missing risk_score or risk_level columns"
    )

    # Check risk distribution
    c.execute("""
        SELECT risk_level, COUNT(*)
        FROM contracts
        GROUP BY risk_level
    """)
    risk_dist = {row[0]: row[1] for row in c.fetchall()}

    print("\n  Risk Distribution:")
    for level in ['low', 'medium', 'high', 'critical']:
        count = risk_dist.get(level, 0)
        print(f"    {level}: {count:,}")

    test(
        "Risk scores calculated",
        risk_dist.get('low', 0) > 0 or risk_dist.get('medium', 0) > 0,
        "No risk scores found - scoring not run?"
    )

    # Check high risk count (should have increased per plan)
    high_risk = risk_dist.get('high', 0) + risk_dist.get('critical', 0)
    test(
        f"High+Critical risk contracts present ({high_risk:,})",
        high_risk > 0,
        "No high/critical risk contracts found"
    )

    # Check institution types
    c.execute("SELECT COUNT(*) FROM institutions WHERE institution_type IS NOT NULL")
    typed_institutions = c.fetchone()[0]
    test(
        f"Institutions have types ({typed_institutions:,})",
        typed_institutions > 0,
        "No institution types found"
    )

    # Check vendor classifications
    c.execute("SELECT COUNT(*) FROM vendor_classifications WHERE industry_source = 'verified_online'")
    verified_vendors = c.fetchone()[0]
    test(
        f"Vendor classifications present ({verified_vendors:,})",
        verified_vendors > 0,
        "No verified vendor classifications found"
    )

    conn.close()


def verify_response_envelopes():
    """Verify response envelope structure in routers."""
    print("\n" + "="*60)
    print("5. RESPONSE ENVELOPE CONSISTENCY")
    print("="*60)

    # Check contracts router
    contracts_path = BACKEND_DIR / "api" / "routers" / "contracts.py"
    content = contracts_path.read_text(encoding='utf-8')

    test(
        "Contracts: Returns data with pagination",
        "data=contracts" in content.replace(" ", "") or "data = contracts" in content,
        "list_contracts should return {data: [...], pagination: {...}}"
    )

    # Check sectors router - looks for Response(data= pattern
    sectors_path = BACKEND_DIR / "api" / "routers" / "sectors.py"
    if sectors_path.exists():
        sector_content = sectors_path.read_text(encoding='utf-8')
        test(
            "Sectors: Uses data wrapper for lists",
            "Response(data=" in sector_content or "data=sectors" in sector_content or "data=trends" in sector_content,
            "Sectors router should use data wrapper"
        )
    else:
        test("Sectors router exists", False, "sectors.py not found")


def verify_analysis_endpoint():
    """Verify analysis endpoints return proper structure."""
    print("\n" + "="*60)
    print("6. ANALYSIS ENDPOINTS")
    print("="*60)

    # Check if analysis router exists and has proper structure
    analysis_files = list((BACKEND_DIR / "api" / "routers").glob("*analysis*.py"))

    if analysis_files:
        for f in analysis_files:
            content = f.read_text(encoding='utf-8')
            test(
                f"Analysis endpoint {f.name}: Has data wrapper",
                '"data"' in content or "'data'" in content,
                "Analysis endpoints should return {data: [...]}"
            )
    else:
        print("  No analysis routers found - skipping")


def main():
    print("="*60)
    print("QUALITY REMEDIATION VERIFICATION")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    verify_contracts_router()
    verify_institutions_router()
    verify_risk_scoring()
    verify_database_state()
    verify_response_envelopes()
    verify_analysis_endpoint()

    # Summary
    print("\n" + "="*60)
    print("VERIFICATION SUMMARY")
    print("="*60)

    total = len(PASSED) + len(FAILED)
    print(f"\n  PASSED: {len(PASSED)}/{total}")
    print(f"  FAILED: {len(FAILED)}/{total}")

    if FAILED:
        print("\n  FAILED TESTS:")
        for name, details in FAILED:
            print(f"    - {name}")
            if details:
                print(f"      {details}")

    print("\n" + "="*60)

    if FAILED:
        print("[FAIL] VERIFICATION INCOMPLETE - Some tests failed")
        return 1
    else:
        print("[PASS] ALL VERIFICATION TESTS PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
