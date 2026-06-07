"""
Precompute the La Trama community index (/network/communities/index).

Builds the enriched community index (hub vendor, value, DA/SB rates,
pattern mix, GT + sanction counts — all from aria_queue / precomputed
aggregates, never the raw contracts table) and persists it to
precomputed_stats under key `network_trama_index_v1` so the endpoint
serves it instantly on cold start.

Run:  cd backend && python -m scripts._precompute_network_trama
"""

import json
import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

DB_PATH = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"
TRAMA_INDEX_DB_KEY = "network_trama_index_v1"
TRAMA_CAPTURE_DB_KEY = "network_trama_capture_v1"


def main() -> None:
    from api.routers.network import _build_community_index, _build_institution_capture  # noqa: E402

    t0 = time.time()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        result = _build_community_index(conn)
        payload = result.model_dump()
        conn.execute(
            "INSERT OR REPLACE INTO precomputed_stats(stat_key, stat_value, updated_at) "
            "VALUES(?, ?, datetime('now'))",
            (TRAMA_INDEX_DB_KEY, json.dumps(payload, default=str)),
        )
        capture = _build_institution_capture(conn)
        conn.execute(
            "INSERT OR REPLACE INTO precomputed_stats(stat_key, stat_value, updated_at) "
            "VALUES(?, ?, datetime('now'))",
            (TRAMA_CAPTURE_DB_KEY, json.dumps(capture.model_dump(), default=str)),
        )
        conn.commit()
    finally:
        conn.close()

    elapsed = time.time() - t0
    comms = result.communities
    print(f"La Trama index precomputed: {len(comms)} communities "
          f"(of {result.total_communities} with size >= 5) in {elapsed:.1f}s")
    print("Top 5 by value:")
    for c in comms[:5]:
        val_bn = c.total_value_mxn / 1e9
        print(f"  C-{c.community_id:<6} {c.size:>6} members  {val_bn:>10.1f}B MXN  "
              f"hub={c.hub_vendor_name[:40]}  GT={c.gt_vendor_count}  SFP={c.sanctioned_count}")
    over_10t = [c for c in comms if c.total_value_mxn > 10_000_000_000_000]
    if over_10t:
        print(f"WARNING: {len(over_10t)} communities exceed 10T MXN — inspect for data errors")
    empty_hubs = [c for c in comms if not c.hub_vendor_name.strip()]
    if empty_hubs:
        print(f"WARNING: {len(empty_hubs)} communities have empty hub names")

    print(f"Institution capture index: {capture.total} institutions. Top 3 by value:")
    for it in capture.institutions[:3]:
        share = f"{it.top1_share_pct:.0f}%" if it.top1_share_pct is not None else "—"
        clans = ", ".join(f"C-{f.community_id}({f.vendor_count})" for f in it.feeding_communities) or "—"
        val_bn = it.total_value_mxn / 1e9
        print(f"  {it.name[:44]:<46} {val_bn:>9.1f}B  top1={share}  clans: {clans}")


if __name__ == "__main__":
    main()
