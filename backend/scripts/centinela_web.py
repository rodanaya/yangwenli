#!/usr/bin/env python3
"""
CENTINELA WEB — Online Evidence Scraper for ARIA Investigation Queue

Searches the web for public evidence of corruption, sanctions, investigative
journalism, and shell-company signals for ARIA T1/T2/T3 vendors.

Uses Google News RSS (free, no API key) and Claude Haiku for evidence
classification. Results stored in aria_web_evidence; aggregate score/verdict
written back to aria_queue.

Usage:
    # Run all T1 vendors (314 vendors, ~$0.22 Haiku cost)
    python -m scripts.centinela_web --tier 1

    # Specific tier with limit
    python -m scripts.centinela_web --tier 2 --limit 50

    # Single vendor
    python -m scripts.centinela_web --vendor-id 48

    # Dry run (search + classify, no DB writes)
    python -m scripts.centinela_web --tier 1 --dry-run

    # Re-run vendors whose evidence is older than N days
    python -m scripts.centinela_web --tier 1 --refresh-days 30
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import argparse
import json
import logging
import os
import re
import sqlite3
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import httpx
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [CENTINELA-WEB] %(levelname)s %(message)s",
)
logger = logging.getLogger("centinela_web")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# ──────────────────────────────────────────────────────────────────────────────
# Evidence verdicts (ordered by severity)
# ──────────────────────────────────────────────────────────────────────────────

VERDICT_SEVERITY = {
    "CORRUPTION_MENTION": 4,
    "SANCTION": 3,
    "JOURNALISM": 2,
    "SHELL_SIGNAL": 1,
    "NEGATIVE": 0,
}

# ──────────────────────────────────────────────────────────────────────────────
# Query templates (4 per vendor)
# ──────────────────────────────────────────────────────────────────────────────

QUERY_TEMPLATES = [
    {
        "query_type": "CORRUPTION",
        "template": '"{name}" corrupción licitación irregular México gobierno',
        "description": "Corruption / irregular procurement",
    },
    {
        "query_type": "SANCTION",
        "template": '"{name}" sanción inhabilitado SFP IMSS contratación pública',
        "description": "Government sanction / debarment",
    },
    {
        "query_type": "JOURNALISM",
        "template": '"{name}" investigación periodística ASF Función Pública irregularidades',
        "description": "Investigative journalism",
    },
    {
        "query_type": "SHELL",
        "template": '"{name}" empresa fantasma RFC prestanombres facturación falsa',
        "description": "Shell company / fake invoicing signal",
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# Haiku evaluation prompt
# ──────────────────────────────────────────────────────────────────────────────

HAIKU_SYSTEM = (
    "You are a procurement integrity analyst for the Mexican federal government. "
    "Classify web search results for evidence of corruption, sanctions, or shell-company activity. "
    "Be conservative: only classify as non-NEGATIVE when there is SPECIFIC named evidence. "
    "Generic news about government corruption or shared vendor names do NOT qualify."
)

HAIKU_USER_TEMPLATE = """VENDOR: {vendor_name}
QUERY TYPE: {query_type}
QUERY: {query}

TOP SEARCH RESULTS:
{numbered_snippets}

TASK: Decide whether these snippets contain SPECIFIC, NAMED evidence about THIS vendor.

CLASSIFY as ONE of:
- CORRUPTION_MENTION: direct allegation of bribery, bid-rigging, overpricing, kickbacks
- SANCTION: confirmed debarment, inhabilitación, or blacklisting by SFP, SAT, IMSS, or SSA
- JOURNALISM: named in investigative reporting by a credible outlet (Proceso, Animal Político, NYT, Reuters, etc.)
- SHELL_SIGNAL: identified as empresa fantasma, prestanombres, RFC inválido, or facturación falsa
- NEGATIVE: no specific evidence found, generic results, different company with same name

Respond ONLY with valid JSON (no markdown):
{{"verdict": "...", "confidence": 0.0, "reasoning": "25 words max"}}"""


# ──────────────────────────────────────────────────────────────────────────────
# Google News RSS scraper (free, no API key required)
# ──────────────────────────────────────────────────────────────────────────────

GNEWS_URL = "https://news.google.com/rss/search"
GNEWS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; RSSReader/1.0; +https://rubli.xyz)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}

MAX_RESULTS_PER_QUERY = 6
SEARCH_DELAY_SECONDS = 1.5   # polite delay between requests


def _search_gnews(query: str, client: httpx.Client) -> list[dict]:
    """Fetch top results from Google News RSS for a given query."""
    try:
        resp = client.get(
            GNEWS_URL,
            params={"q": query, "hl": "es-MX", "gl": "MX", "ceid": "MX:es-419"},
            headers=GNEWS_HEADERS,
            timeout=15,
            follow_redirects=True,
        )
        resp.raise_for_status()
    except httpx.HTTPError as e:
        logger.warning("Google News RSS failed for %r: %s", query, e)
        return []

    try:
        soup = BeautifulSoup(resp.content, "xml")
    except Exception:
        soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    for item in soup.find_all("item")[:MAX_RESULTS_PER_QUERY]:
        title = item.find("title")
        link = item.find("link")
        desc = item.find("description")
        pub_date = item.find("pubDate")
        source = item.find("source")

        if not title:
            continue

        results.append(
            {
                "title": title.get_text(strip=True),
                "url": (link.get_text(strip=True) if link else ""),
                "snippet": (desc.get_text(strip=True)[:300] if desc else ""),
                "published_date": (pub_date.get_text(strip=True) if pub_date else ""),
                "source_name": (source.get_text(strip=True) if source else ""),
            }
        )

    return results


# ──────────────────────────────────────────────────────────────────────────────
# Haiku classifier
# ──────────────────────────────────────────────────────────────────────────────

def _classify_with_haiku(
    vendor_name: str,
    query_type: str,
    query: str,
    results: list[dict],
    anthropic_client,
) -> dict:
    """Send search results to Haiku for evidence classification."""
    if not results:
        return {"verdict": "NEGATIVE", "confidence": 0.0, "reasoning": "No search results returned"}

    numbered = "\n".join(
        f"{i+1}. [{r['title']}] {r['snippet']} ({r['url']})"
        for i, r in enumerate(results)
    )

    prompt = HAIKU_USER_TEMPLATE.format(
        vendor_name=vendor_name,
        query_type=query_type,
        query=query,
        numbered_snippets=numbered,
    )

    try:
        msg = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            system=HAIKU_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        parsed = json.loads(raw)
        verdict = parsed.get("verdict", "NEGATIVE")
        if verdict not in VERDICT_SEVERITY:
            verdict = "NEGATIVE"
        confidence = float(parsed.get("confidence", 0.0))
        reasoning = str(parsed.get("reasoning", ""))[:200]
        return {"verdict": verdict, "confidence": confidence, "reasoning": reasoning}
    except Exception as e:
        logger.warning("Haiku classification failed: %s", e)
        return {"verdict": "NEGATIVE", "confidence": 0.0, "reasoning": f"Classification error: {e}"}


# ──────────────────────────────────────────────────────────────────────────────
# Schema setup
# ──────────────────────────────────────────────────────────────────────────────

def _migrate_schema(conn: sqlite3.Connection) -> None:
    """Add missing columns to aria_web_evidence; create aria_web_evidence_runs."""

    # Extend aria_web_evidence with verdict columns if missing
    existing = {r[1] for r in conn.execute("PRAGMA table_info(aria_web_evidence)")}
    for col, defn in [
        ("query_type", "TEXT"),
        ("verdict", "TEXT DEFAULT 'NEGATIVE'"),
        ("confidence", "REAL DEFAULT 0.0"),
        ("reasoning", "TEXT"),
        ("raw_results_json", "TEXT"),
    ]:
        if col not in existing:
            conn.execute(f"ALTER TABLE aria_web_evidence ADD COLUMN {col} {defn}")
            logger.info("Added aria_web_evidence.%s", col)

    # Create runs table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS aria_web_evidence_runs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id      TEXT    NOT NULL,
            vendor_id   INTEGER NOT NULL,
            vendor_name TEXT,
            tier        INTEGER,
            queries_run INTEGER DEFAULT 0,
            web_score   REAL    DEFAULT 0.0,
            web_verdict TEXT    DEFAULT 'NEGATIVE',
            verdicts_json TEXT,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Add web evidence columns to aria_queue if missing
    aq_cols = {r[1] for r in conn.execute("PRAGMA table_info(aria_queue)")}
    for col, defn in [
        ("web_evidence_score", "REAL DEFAULT 0.0"),
        ("web_evidence_verdict", "TEXT DEFAULT 'NEGATIVE'"),
        ("web_evidence_updated_at", "TIMESTAMP"),
    ]:
        if col not in aq_cols:
            conn.execute(f"ALTER TABLE aria_queue ADD COLUMN {col} {defn}")
            logger.info("Added aria_queue.%s", col)

    conn.commit()


# ──────────────────────────────────────────────────────────────────────────────
# Per-vendor processing
# ──────────────────────────────────────────────────────────────────────────────

def _aggregate_score(query_results: list[dict]) -> tuple[float, str]:
    """Compute aggregate web_evidence_score and web_evidence_verdict."""
    best_severity = 0
    best_verdict = "NEGATIVE"
    best_confidence = 0.0
    weighted_score = 0.0

    for r in query_results:
        v = r["verdict"]
        c = r["confidence"]
        sev = VERDICT_SEVERITY.get(v, 0)
        if sev > 0:
            weighted_score += sev * c
            if sev > best_severity or (sev == best_severity and c > best_confidence):
                best_severity = sev
                best_verdict = v
                best_confidence = c

    # Normalize: max possible = 4 (CORRUPTION) × 1.0 × 4 queries = 16
    normalized_score = min(1.0, weighted_score / 8.0)
    return round(normalized_score, 4), best_verdict


def process_vendor(
    vendor_id: int,
    vendor_name: str,
    tier: int,
    run_id: str,
    conn: sqlite3.Connection,
    http_client: httpx.Client,
    anthropic_client,
    dry_run: bool = False,
) -> dict:
    """Run all 4 queries for a single vendor, classify, store results."""

    # Strip common Mexican corporate suffixes to get a cleaner search name
    # e.g. "ACME, S.A. DE C.V." → "ACME"
    search_name = re.sub(
        r"[,\s]+(S\.?\s*A\.?\s*P\.?\s*I\.?|S\.?\s*A\.?|S\.?\s*R\.?\s*L\.?|S\.?\s*C\.?|A\.?\s*C\.?)"
        r"(\s+DE\s+C\.?\s*V\.?)?[,\s]*$",
        "", vendor_name, flags=re.IGNORECASE,
    ).strip().rstrip(",").strip()
    if len(search_name) < 5:
        search_name = vendor_name

    query_results = []

    for tmpl in QUERY_TEMPLATES:
        query = tmpl["template"].format(name=search_name)
        logger.debug("  [%s] %s", tmpl["query_type"], query)

        results = _search_gnews(query, http_client)
        classification = _classify_with_haiku(
            vendor_name=vendor_name,
            query_type=tmpl["query_type"],
            query=query,
            results=results,
            anthropic_client=anthropic_client,
        )

        query_result = {
            "query_type": tmpl["query_type"],
            "query": query,
            "results": results,
            "verdict": classification["verdict"],
            "confidence": classification["confidence"],
            "reasoning": classification["reasoning"],
        }
        query_results.append(query_result)

        if not dry_run:
            conn.execute(
                """INSERT OR REPLACE INTO aria_web_evidence
                   (vendor_id, aria_run_id, query, query_type,
                    source_name, source_url, snippet, published_date,
                    verdict, confidence, reasoning, raw_results_json)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    vendor_id, run_id, query, tmpl["query_type"],
                    results[0].get("source_name") or results[0].get("title") if results else None,
                    results[0].get("url") if results else None,
                    results[0].get("snippet") if results else None,
                    results[0].get("published_date") if results else None,
                    classification["verdict"],
                    classification["confidence"],
                    classification["reasoning"],
                    json.dumps(results, ensure_ascii=False),
                ),
            )

        time.sleep(SEARCH_DELAY_SECONDS)

    web_score, web_verdict = _aggregate_score(query_results)

    if not dry_run:
        conn.execute(
            """INSERT INTO aria_web_evidence_runs
               (run_id, vendor_id, vendor_name, tier,
                queries_run, web_score, web_verdict, verdicts_json)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                run_id, vendor_id, vendor_name, tier,
                len(query_results), web_score, web_verdict,
                json.dumps([
                    {"query_type": r["query_type"], "verdict": r["verdict"], "confidence": r["confidence"]}
                    for r in query_results
                ]),
            ),
        )
        conn.execute(
            """UPDATE aria_queue
               SET web_evidence_score=?, web_evidence_verdict=?, web_evidence_updated_at=CURRENT_TIMESTAMP
               WHERE vendor_id=?""",
            (web_score, web_verdict, vendor_id),
        )
        conn.commit()

    non_neg = [r for r in query_results if r["verdict"] != "NEGATIVE"]
    return {
        "vendor_id": vendor_id,
        "vendor_name": vendor_name,
        "web_score": web_score,
        "web_verdict": web_verdict,
        "hits": len(non_neg),
        "details": [{"qt": r["query_type"], "v": r["verdict"], "c": r["confidence"]} for r in non_neg],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="CENTINELA WEB — online evidence scraper for ARIA vendors")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3], help="Process all vendors at this ARIA tier")
    parser.add_argument("--vendor-id", type=int, help="Process a single vendor by ID")
    parser.add_argument("--limit", type=int, help="Max vendors to process")
    parser.add_argument("--refresh-days", type=int, default=30,
                        help="Skip vendors with evidence newer than N days (default: 30)")
    parser.add_argument("--dry-run", action="store_true", help="Search and classify but do not write to DB")
    parser.add_argument("--db", type=Path, default=DB_PATH, help="Path to SQLite database")
    args = parser.parse_args()

    if not args.tier and not args.vendor_id:
        parser.error("Specify --tier or --vendor-id")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        # Try loading from .env.prod in the project root
        env_path = Path(__file__).parent.parent.parent / ".env.prod"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("ANTHROPIC_API_KEY="):
                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not api_key:
        parser.error("ANTHROPIC_API_KEY not set (env var or .env.prod)")

    import anthropic
    anthropic_client = anthropic.Anthropic(api_key=api_key)

    conn = sqlite3.connect(str(args.db), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    if not args.dry_run:
        _migrate_schema(conn)

    # Build vendor list
    if args.vendor_id:
        rows = conn.execute(
            "SELECT vendor_id, vendor_name, ips_tier FROM aria_queue WHERE vendor_id=?",
            (args.vendor_id,),
        ).fetchall()
    else:
        cutoff_ts = (datetime.utcnow() - timedelta(days=args.refresh_days)).isoformat()
        rows = conn.execute(
            """SELECT vendor_id, vendor_name, ips_tier FROM aria_queue
               WHERE ips_tier=?
               AND (web_evidence_updated_at IS NULL OR web_evidence_updated_at < ?)
               ORDER BY ips_final DESC""",
            (args.tier, cutoff_ts),
        ).fetchall()

    if args.limit:
        rows = rows[: args.limit]

    if not rows:
        logger.info("No vendors to process — all up to date or none match criteria.")
        conn.close()
        return

    run_id = uuid.uuid4().hex[:8]
    logger.info(
        "Run %s | %d vendors | tier=%s | dry_run=%s",
        run_id, len(rows), args.tier or "manual", args.dry_run,
    )

    hits_total = 0
    with httpx.Client(timeout=20, follow_redirects=True) as http_client:
        for i, (vendor_id, vendor_name, tier) in enumerate(rows, 1):
            logger.info("[%d/%d] %s (id=%d)", i, len(rows), vendor_name, vendor_id)
            try:
                result = process_vendor(
                    vendor_id=vendor_id,
                    vendor_name=vendor_name,
                    tier=tier,
                    run_id=run_id,
                    conn=conn,
                    http_client=http_client,
                    anthropic_client=anthropic_client,
                    dry_run=args.dry_run,
                )
                if result["hits"] > 0:
                    hits_total += 1
                    logger.info(
                        "  ★ EVIDENCE: score=%.3f verdict=%s hits=%d",
                        result["web_score"], result["web_verdict"], result["hits"],
                    )
                    for d in result["details"]:
                        logger.info("    %s → %s (conf=%.2f)", d["qt"], d["v"], d["c"])
                else:
                    logger.info("  — negative (score=%.3f)", result["web_score"])
            except Exception as e:
                logger.error("  ERROR processing vendor %d: %s", vendor_id, e)
                continue

    conn.close()

    logger.info(
        "Run %s complete. %d/%d vendors with evidence.",
        run_id, hits_total, len(rows),
    )


if __name__ == "__main__":
    main()
