"""Regression: /network/related-vendors must not leak individual (persona física) RFCs.

network.py get_related_vendors emitted raw `v.rfc` for related vendors across its
3 relationship queries (same-group, shared-rfc-root, similar-name) with NO
is_individual masking — exposing ~20.9k persona-física RFCs (PII). Now masked at
SQL: `CASE WHEN v.is_individual THEN NULL ELSE v.rfc END`, matching export.py /
ai_explain.py. (Security rule: never return RFC for individuals.)
"""
import os
import sqlite3
from pathlib import Path

import pytest

_default_db = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DB_PATH = Path(os.environ.get("DATABASE_PATH", str(_default_db)))


def test_related_vendors_masks_individual_rfc(client):
    if not DB_PATH.exists():
        pytest.skip("DB not found")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    # Seeds likely to surface related vendors: grouped vendors that have an RFC.
    seeds = [r["id"] for r in conn.execute(
        "SELECT id FROM vendors WHERE group_id IS NOT NULL "
        "AND rfc IS NOT NULL ORDER BY id LIMIT 40"
    ).fetchall()]

    total_related = 0
    for vid in seeds:
        resp = client.get(f"/api/v1/network/related-vendors/{vid}")
        if resp.status_code != 200:
            continue
        rels = resp.json().get("related", [])
        total_related += len(rels)
        for rel in rels:
            if rel.get("rfc"):
                row = conn.execute(
                    "SELECT is_individual FROM vendors WHERE id = ?", (rel["vendor_id"],)
                ).fetchone()
                assert not (row and row["is_individual"]), (
                    f"LEAK: individual RFC {rel['rfc']!r} exposed for vendor {rel['vendor_id']}"
                )
    conn.close()
    # Ensure the masking path was actually exercised (not a vacuous pass).
    assert total_related > 0, "no related vendors returned across seeds — broaden the seed set"
