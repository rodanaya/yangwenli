"""
Enrich vendor name variants via QuiénEsQuién.Wiki (QQW) API.

Fetches known name variants (aliases, former names, abbreviations) for the top
N vendors by contract value and stores them in vendor_name_variants.

Data source: https://api.quienesquien.wiki/v3/companies?identifier=<RFC>&embed=1
License:     CC-BY-SA 4.0 — attribute PODER / Abrimos.info
Status:      Data frozen at September 2022. Platform transferred to Abrimos.info
             February 2026. API still accessible.

Why this matters:
  The same company appears under hundreds of name strings across 23 years of
  COMPRANET data. RFC coverage is 0.1% (2002–2010) and 15.7% (2010–2017),
  so pure RFC matching leaves most of the Structure A/B era unlinked.
  Name variants from QQW let us cluster name strings into the same vendor entity
  without false merges.

Usage:
    python -m scripts.enrich_vendor_names_qqw [--limit 3000] [--dry-run] [--batch-from N]

Known issue:
    QQW's SSL certificate has an altname mismatch — use verify=False.
    This is intentional; the cert covers quienesquien.wiki not api.quienesquien.wiki.
"""

import argparse
import json
import logging
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
QQW_API_URL = "https://api.quienesquien.wiki/v3/companies"
SLEEP_BETWEEN_REQUESTS = 0.5   # seconds — respectful rate limiting
LOG_EVERY = 100                # log progress every N vendors
ATTRIBUTION = "QuiénEsQuién.Wiki (PODER / Abrimos.info) — CC-BY-SA 4.0"


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_top_vendors(conn: sqlite3.Connection, limit: int) -> list[dict]:
    """Return top N vendors by total contract value that have an RFC."""
    rows = conn.execute("""
        SELECT v.id, v.rfc, v.name, vs.total_value_mxn
        FROM vendors v
        JOIN vendor_stats vs ON v.id = vs.vendor_id
        WHERE v.rfc IS NOT NULL AND v.rfc != ''
        ORDER BY vs.total_value_mxn DESC
        LIMIT ?
    """, (limit,)).fetchall()
    return [dict(r) for r in rows]


def already_enriched(conn: sqlite3.Connection, vendor_id: int) -> bool:
    """Return True if this vendor already has any QQW variants stored."""
    row = conn.execute(
        "SELECT 1 FROM vendor_name_variants WHERE vendor_id = ? AND source = 'qqw' LIMIT 1",
        (vendor_id,)
    ).fetchone()
    return row is not None


def save_variants(
    conn: sqlite3.Connection,
    vendor_id: int,
    rfc: str,
    variants: list[str],
) -> int:
    """INSERT OR IGNORE name variants. Returns count inserted."""
    inserted = 0
    for name in variants:
        name = name.strip()
        if not name:
            continue
        try:
            conn.execute(
                """INSERT OR IGNORE INTO vendor_name_variants
                   (vendor_id, rfc, variant_name, source)
                   VALUES (?, ?, ?, 'qqw')""",
                (vendor_id, rfc, name),
            )
            if conn.execute("SELECT changes()").fetchone()[0]:
                inserted += 1
        except sqlite3.Error as e:
            logger.warning(f"  DB error saving variant {name!r}: {e}")
    return inserted


# ---------------------------------------------------------------------------
# QQW API
# ---------------------------------------------------------------------------

def fetch_qqw(rfc: str) -> Optional[dict]:
    """
    Call QQW API for one RFC. Returns parsed JSON or None on error.
    Uses verify=False due to SSL cert altname mismatch on api.quienesquien.wiki.
    """
    try:
        import httpx
    except ImportError:
        logger.error("httpx not installed — run: pip install httpx")
        return None

    url = f"{QQW_API_URL}?identifier={rfc}&embed=1"
    try:
        resp = httpx.get(url, timeout=15.0, verify=False)
        if resp.status_code == 404:
            return None   # vendor not in QQW — normal
        if resp.status_code == 429:
            logger.warning(f"  Rate limited (429) for RFC {rfc} — sleeping 5s")
            time.sleep(5)
            return None
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as e:
        logger.warning(f"  HTTP {e.response.status_code} for RFC {rfc}")
        return None
    except Exception as e:
        logger.warning(f"  Request failed for RFC {rfc}: {e}")
        return None


def extract_variants(data: dict, canonical_name: str) -> list[str]:
    """
    Extract name strings from a QQW API response.
    QQW v3 returns a list of company objects. We extract:
      - company.names (list of name strings)
      - company.name (primary name string)
    We exclude strings identical to the canonical name already in our DB.
    """
    variants: set[str] = set()
    canonical_upper = canonical_name.upper().strip()

    companies = data if isinstance(data, list) else data.get("data", [])
    if isinstance(companies, dict):
        companies = [companies]

    for company in companies:
        if not isinstance(company, dict):
            continue

        # Primary name
        primary = company.get("name") or company.get("razon_social", "")
        if primary:
            v = primary.strip().upper()
            if v and v != canonical_upper:
                variants.add(primary.strip())

        # names array — QQW stores multiple historical names here
        for entry in company.get("names", []):
            if isinstance(entry, str):
                v = entry.strip().upper()
                if v and v != canonical_upper:
                    variants.add(entry.strip())
            elif isinstance(entry, dict):
                nm = entry.get("name") or entry.get("value", "")
                if nm:
                    v = nm.strip().upper()
                    if v and v != canonical_upper:
                        variants.add(nm.strip())

        # also_known_as / aliases
        for alias in company.get("also_known_as", []) + company.get("aliases", []):
            if isinstance(alias, str):
                v = alias.strip().upper()
                if v and v != canonical_upper:
                    variants.add(alias.strip())

    return sorted(variants)


# ---------------------------------------------------------------------------
# Main enrichment loop
# ---------------------------------------------------------------------------

def enrich(limit: int, dry_run: bool, batch_from: int) -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 30000")

    try:
        vendors = get_top_vendors(conn, limit)
        logger.info(f"Top {len(vendors):,} RFC-matched vendors loaded")
        logger.info(f"Data source: {ATTRIBUTION}")
        if batch_from > 0:
            vendors = vendors[batch_from:]
            logger.info(f"Resuming from position {batch_from}")

        total_vendors = 0
        total_variants = 0
        skipped_already_done = 0
        not_in_qqw = 0
        errors = 0

        start = datetime.now()

        for i, vendor in enumerate(vendors):
            vendor_id = vendor["id"]
            rfc = vendor["rfc"]
            name = vendor["name"]

            # Skip if already enriched
            if already_enriched(conn, vendor_id):
                skipped_already_done += 1
                continue

            if i > 0 and i % LOG_EVERY == 0:
                elapsed = (datetime.now() - start).total_seconds()
                rate = total_vendors / elapsed if elapsed > 0 else 0
                eta_min = ((len(vendors) - i) / rate / 60) if rate > 0 else 0
                logger.info(
                    f"Progress {i}/{len(vendors)} | "
                    f"enriched: {total_vendors} | variants: {total_variants} | "
                    f"not_in_qqw: {not_in_qqw} | ETA: {eta_min:.0f}min"
                )

            # Fetch from QQW
            data = fetch_qqw(rfc)
            time.sleep(SLEEP_BETWEEN_REQUESTS)

            if data is None:
                not_in_qqw += 1
                # Still insert a sentinel so we don't re-query on next run
                if not dry_run:
                    # Insert nothing — already_enriched() returns False for 0 rows
                    # We use a placeholder row with empty source marker 'qqw_miss'
                    conn.execute(
                        """INSERT OR IGNORE INTO vendor_name_variants
                           (vendor_id, rfc, variant_name, source)
                           VALUES (?, ?, '_qqw_not_found', 'qqw_miss')""",
                        (vendor_id, rfc),
                    )
                    conn.commit()
                continue

            variants = extract_variants(data, name)

            if dry_run:
                logger.info(f"  DRY RUN: vendor_id={vendor_id} RFC={rfc} name={name!r}")
                logger.info(f"    → {len(variants)} variants: {variants[:5]}")
                total_vendors += 1
                total_variants += len(variants)
                continue

            n = save_variants(conn, vendor_id, rfc, variants)

            # Also save sentinel so already_enriched() triggers even if 0 variants
            if n == 0 and not variants:
                conn.execute(
                    """INSERT OR IGNORE INTO vendor_name_variants
                       (vendor_id, rfc, variant_name, source)
                       VALUES (?, ?, '_qqw_no_variants', 'qqw_empty')""",
                    (vendor_id, rfc),
                )

            conn.commit()
            total_vendors += 1
            total_variants += n

        elapsed = (datetime.now() - start).total_seconds()
        logger.info("=" * 60)
        logger.info(f"DONE in {elapsed:.0f}s")
        logger.info(f"  Vendors processed:     {total_vendors:,}")
        logger.info(f"  Variants stored:       {total_variants:,}")
        logger.info(f"  Not in QQW:            {not_in_qqw:,}")
        logger.info(f"  Already done (skip):   {skipped_already_done:,}")
        logger.info(f"  Errors:                {errors:,}")
        logger.info(f"Attribution: {ATTRIBUTION}")

    finally:
        conn.close()


def show_stats() -> None:
    """Print current enrichment coverage stats."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute("""
            SELECT source, COUNT(DISTINCT vendor_id) as vendors, COUNT(*) as variants
            FROM vendor_name_variants
            GROUP BY source
        """).fetchall()
        logger.info("=== vendor_name_variants coverage ===")
        for r in rows:
            logger.info(f"  source={r['source']:<15} vendors={r['vendors']:>6,}  variants={r['variants']:>8,}")
        total = conn.execute(
            "SELECT COUNT(DISTINCT vendor_id) FROM vendor_name_variants WHERE source='qqw'"
        ).fetchone()[0]
        logger.info(f"  Total QQW-enriched vendors: {total:,}")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Enrich vendor name variants via QuiénEsQuién.Wiki API"
    )
    parser.add_argument("--limit", type=int, default=3000,
                        help="Number of top vendors to process (default: 3000)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch and parse but do not write to DB")
    parser.add_argument("--batch-from", type=int, default=0,
                        help="Skip first N vendors (for resuming interrupted runs)")
    parser.add_argument("--stats", action="store_true",
                        help="Show current enrichment stats and exit")
    args = parser.parse_args()

    if args.stats:
        show_stats()
        return

    enrich(
        limit=args.limit,
        dry_run=args.dry_run,
        batch_from=args.batch_from,
    )


if __name__ == "__main__":
    main()
