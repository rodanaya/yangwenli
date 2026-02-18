import requests
import time
import json
import sys

BASE = "http://127.0.0.1:8001/api/v1"

def timed_get(url, label):
    """Make a GET request and return (elapsed_ms, status, data_summary)."""
    start = time.perf_counter()
    try:
        resp = requests.get(url, timeout=120)
        elapsed = (time.perf_counter() - start) * 1000
        status = resp.status_code
        try:
            data = resp.json()
            if isinstance(data, dict):
                if "data" in data:
                    count = len(data["data"]) if isinstance(data["data"], list) else "object"
                else:
                    count = "object"
            elif isinstance(data, list):
                count = len(data)
            else:
                count = "scalar"
        except:
            count = "non-json"
            data = None
        return elapsed, status, count
    except requests.exceptions.ConnectionError:
        return -1, 0, "CONNECTION_ERROR"
    except requests.exceptions.Timeout:
        return -1, 0, "TIMEOUT"

def main():
    print("=" * 80)
    print("RUBLI BACKEND TIMING TEST")
    print("=" * 80)

    # Step 1: Find top vendor by contract count
    print("\n--- Finding top vendor (by count) ---")
    elapsed, status, _ = timed_get(f"{BASE}/vendors/top?by=count&limit=1", "top vendor")
    if status != 200:
        print(f"  FAILED: status={status}, elapsed={elapsed:.0f}ms")
        sys.exit(1)
    resp = requests.get(f"{BASE}/vendors/top?by=count&limit=1")
    top_vendor_data = resp.json()
    if isinstance(top_vendor_data, dict) and "data" in top_vendor_data:
        vendor = top_vendor_data["data"][0]
    elif isinstance(top_vendor_data, list):
        vendor = top_vendor_data[0]
    else:
        vendor = top_vendor_data
    
    vendor_id = vendor.get("id") or vendor.get("vendor_id")
    vendor_name = vendor.get("name") or vendor.get("vendor_name") or "unknown"
    vendor_count = vendor.get("contract_count") or vendor.get("total_contracts") or "?"
    print(f"  Vendor ID: {vendor_id}")
    print(f"  Name: {vendor_name}")
    print(f"  Contracts: {vendor_count}")
    print(f"  Lookup took: {elapsed:.0f}ms")

    # Step 2: Time VendorProfile endpoints
    print("\n" + "=" * 80)
    print("VENDOR PROFILE ENDPOINTS (vendor_id={})".format(vendor_id))
    print("=" * 80)

    vendor_endpoints = [
        (f"{BASE}/vendors/{vendor_id}", "GET /vendors/{id}"),
        (f"{BASE}/vendors/{vendor_id}/risk-profile", "GET /vendors/{id}/risk-profile"),
        (f"{BASE}/vendors/{vendor_id}/contracts?per_page=20", "GET /vendors/{id}/contracts?per_page=20"),
        (f"{BASE}/vendors/{vendor_id}/institutions?limit=50", "GET /vendors/{id}/institutions?limit=50"),
        (f"{BASE}/network/co-bidders/{vendor_id}?min_procedures=5&limit=10", "GET /network/co-bidders/{id}?min_procedures=5&limit=10"),
    ]

    vendor_results = []
    for url, label in vendor_endpoints:
        elapsed, status, count = timed_get(url, label)
        vendor_results.append((label, elapsed, status, count))
        marker = "SLOW" if elapsed > 2000 else "OK" if elapsed > 0 else "FAIL"
        print(f"  [{marker:4s}] {elapsed:8.0f}ms  HTTP {status}  items={count}  {label}")

    # Step 3: Find top institution
    print("\n--- Finding top institution ---")
    elapsed, status, _ = timed_get(
        f"{BASE}/institutions?sort_by=total_contracts&sort_order=desc&per_page=1",
        "top institution"
    )
    resp = requests.get(f"{BASE}/institutions?sort_by=total_contracts&sort_order=desc&per_page=1")
    inst_data = resp.json()
    if isinstance(inst_data, dict) and "data" in inst_data:
        inst = inst_data["data"][0]
    elif isinstance(inst_data, list):
        inst = inst_data[0]
    else:
        inst = inst_data

    inst_id = inst.get("id") or inst.get("institution_id")
    inst_name = inst.get("name") or inst.get("institution_name") or "unknown"
    inst_count = inst.get("total_contracts") or inst.get("contract_count") or "?"
    print(f"  Institution ID: {inst_id}")
    print(f"  Name: {inst_name}")
    print(f"  Contracts: {inst_count}")
    print(f"  Lookup took: {elapsed:.0f}ms")

    # Step 4: Time InstitutionProfile endpoints
    print("\n" + "=" * 80)
    print("INSTITUTION PROFILE ENDPOINTS (institution_id={})".format(inst_id))
    print("=" * 80)

    inst_endpoints = [
        (f"{BASE}/institutions/{inst_id}", "GET /institutions/{id}"),
        (f"{BASE}/institutions/{inst_id}/contracts?per_page=20", "GET /institutions/{id}/contracts?per_page=20"),
        (f"{BASE}/institutions/{inst_id}/vendors?limit=50", "GET /institutions/{id}/vendors?limit=50"),
    ]

    inst_results = []
    for url, label in inst_endpoints:
        elapsed, status, count = timed_get(url, label)
        inst_results.append((label, elapsed, status, count))
        marker = "SLOW" if elapsed > 2000 else "OK" if elapsed > 0 else "FAIL"
        print(f"  [{marker:4s}] {elapsed:8.0f}ms  HTTP {status}  items={count}  {label}")

    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)

    all_results = vendor_results + inst_results
    total = sum(r[1] for r in all_results if r[1] > 0)
    slowest = max(all_results, key=lambda r: r[1])
    slow_count = sum(1 for r in all_results if r[1] > 2000)

    print(f"\n  Total wall time (sequential): {total:.0f}ms ({total/1000:.1f}s)")
    print(f"  Slowest endpoint: {slowest[0]} ({slowest[1]:.0f}ms)")
    print(f"  Endpoints > 2s: {slow_count}/{len(all_results)}")
    print(f"  Endpoints > 5s: {sum(1 for r in all_results if r[1] > 5000)}/{len(all_results)}")
    print(f"  Endpoints > 10s: {sum(1 for r in all_results if r[1] > 10000)}/{len(all_results)}")

    print("\n  Rank by latency:")
    for i, (label, elapsed, status, count) in enumerate(sorted(all_results, key=lambda r: -r[1]), 1):
        bar = "#" * min(int(elapsed / 200), 50)
        print(f"    {i}. {elapsed:8.0f}ms  {label}")
        print(f"       {bar}")

if __name__ == "__main__":
    main()
