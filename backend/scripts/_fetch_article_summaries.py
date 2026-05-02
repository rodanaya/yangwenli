#!/usr/bin/env python3
"""
CENTINELA FETCH — Article body fetcher for web evidence hits.

For each vendor with a positive web_evidence verdict, re-queries Google News RSS
to get full article URLs, then fetches article bodies and stores 2-sentence
summaries back into aria_web_evidence.snippet + reasoning.

Usage:
    python -m scripts._fetch_article_summaries [--min-score 0.1] [--limit 30]
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import argparse
import re
import sqlite3
import time
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

GNEWS_URL = "https://news.google.com/rss/search"
GNEWS_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-MX,es;q=0.9",
}

ARTICLE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
}

QUERY_TEMPLATES = {
    "CORRUPTION": '"{name}" corrupción licitación irregular México gobierno',
    "SANCTION": '"{name}" sanción inhabilitado SFP IMSS contratación pública',
    "JOURNALISM": '"{name}" investigación periodística ASF Función Pública irregularidades',
    "SHELL": '"{name}" empresa fantasma RFC prestanombres facturación falsa',
}

SUFFIX_RE = re.compile(
    r"[,\s]+(S\.?\s*A\.?\s*P\.?\s*I\.?|S\.?\s*A\.?|S\.?\s*R\.?\s*L\.?|S\.?\s*C\.?|A\.?\s*C\.?)"
    r"(\s+DE\s+C\.?\s*V\.?)?[,\s]*$",
    re.IGNORECASE,
)

# Sites that reliably return useful content vs. paywalled/blocked
PAYWALL_DOMAINS = {
    "reforma.com", "eluniversal.com.mx", "milenio.com",
    "excelsior.com.mx", "jornada.com.mx",
}


def _clean_name(vendor_name: str) -> str:
    name = SUFFIX_RE.sub("", vendor_name).strip().rstrip(",").strip()
    return name if len(name) >= 5 else vendor_name


def _fetch_rss(query: str, client: httpx.Client) -> list[dict]:
    """Fetch Google News RSS; return list of {title, url, snippet, source}."""
    try:
        resp = client.get(
            GNEWS_URL,
            params={"q": query, "hl": "es-MX", "gl": "MX", "ceid": "MX:es-419"},
            headers=GNEWS_HEADERS,
            timeout=15,
            follow_redirects=True,
        )
        resp.raise_for_status()
    except Exception as e:
        print(f"    RSS error: {e}")
        return []

    try:
        soup = BeautifulSoup(resp.content, "xml")
    except Exception:
        soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    for item in soup.find_all("item")[:5]:
        title_tag = item.find("title")
        link_tag = item.find("link")
        desc_tag = item.find("description")
        source_tag = item.find("source")
        if not title_tag:
            continue

        # BeautifulSoup XML: <link> is self-closing, get next sibling text
        url = ""
        if link_tag:
            # lxml-xml parser: link.next_sibling may have the URL
            txt = link_tag.get_text(strip=True)
            if txt.startswith("http"):
                url = txt
            elif link_tag.next_sibling:
                candidate = str(link_tag.next_sibling).strip()
                if candidate.startswith("http"):
                    url = candidate

        # Fallback: extract from description href
        if not url and desc_tag:
            m = re.search(r'href="(https?://[^"]+)"', str(desc_tag))
            if m:
                url = m.group(1)

        results.append({
            "title": title_tag.get_text(strip=True),
            "url": url,
            "snippet": desc_tag.get_text(strip=True)[:200] if desc_tag else "",
            "source": source_tag.get_text(strip=True) if source_tag else "",
        })

    return results


def _is_paywalled(url: str) -> bool:
    for domain in PAYWALL_DOMAINS:
        if domain in url:
            return True
    return False


def _fetch_article_body(url: str, client: httpx.Client) -> str | None:
    """Fetch article page and extract first meaningful paragraph."""
    if not url or not url.startswith("http"):
        return None
    if _is_paywalled(url):
        return None

    try:
        resp = client.get(url, headers=ARTICLE_HEADERS, timeout=20, follow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        print(f"      fetch error ({url[:60]}): {e}")
        return None

    try:
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception:
        return None

    # Remove script/style noise
    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()

    # Try structured article content first
    article = soup.find("article")
    if article:
        paragraphs = [p.get_text(strip=True) for p in article.find_all("p")]
    else:
        paragraphs = [p.get_text(strip=True) for p in soup.find_all("p")]

    # Filter out short/boilerplate paragraphs
    paragraphs = [p for p in paragraphs if len(p) > 80]

    if not paragraphs:
        return None

    # Return first 2 paragraphs, capped at 600 chars total
    body = " ".join(paragraphs[:2])[:600]
    return body if len(body) > 80 else None


def process_vendor(
    vendor_id: int,
    vendor_name: str,
    query_type: str,
    verdict: str,
    ev_id: int,
    conn: sqlite3.Connection,
    client: httpx.Client,
) -> bool:
    search_name = _clean_name(vendor_name)
    query_template = QUERY_TEMPLATES.get(query_type, QUERY_TEMPLATES["CORRUPTION"])
    query = query_template.format(name=search_name)

    print(f"  [{verdict}] {vendor_name[:50]} — querying RSS...")
    results = _fetch_rss(query, client)
    time.sleep(0.3)

    if not results:
        print(f"    no RSS results")
        return False

    # Find the most relevant result (first one with a real URL)
    best = None
    best_body = None

    for r in results:
        url = r["url"]
        if not url:
            continue
        print(f"    → {r['title'][:70]}")
        print(f"      {url[:80]}")

        body = _fetch_article_body(url, client)
        time.sleep(0.5)

        if body:
            best = r
            best_body = body
            break
        elif best is None:
            best = r  # keep even if no body (for URL storage)

    if not best:
        print(f"    no usable result")
        return False

    # Build enriched snippet: title + first sentences of body
    if best_body:
        enriched_snippet = best_body[:500]
        new_reasoning = (
            f"Article: {best['title'][:100]} | "
            f"Source: {best['source']} | "
            f"URL: {best['url'][:100]}"
        )
        print(f"    ✓ body fetched ({len(best_body)} chars)")
    else:
        enriched_snippet = best["title"]
        new_reasoning = (
            f"Title only (paywall/fetch-failed): {best['title'][:100]} | "
            f"Source: {best['source']}"
        )
        print(f"    ✓ title only (no body)")

    conn.execute(
        """UPDATE aria_web_evidence
           SET source_url=?, source_name=?, snippet=?, reasoning=?
           WHERE id=?""",
        (best["url"], best["source"], enriched_snippet, new_reasoning, ev_id),
    )
    conn.commit()
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-score", type=float, default=0.1,
                        help="Minimum web_evidence_score to process (default 0.1)")
    parser.add_argument("--limit", type=int, default=30,
                        help="Max vendors to process (default 30)")
    parser.add_argument("--db", type=Path, default=DB_PATH)
    args = parser.parse_args()

    conn = sqlite3.connect(str(args.db), timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")

    # Get distinct vendors with positive verdicts, highest score first
    vendors = conn.execute("""
        SELECT DISTINCT aq.vendor_id, aq.vendor_name,
               aq.web_evidence_score, aq.web_evidence_verdict
        FROM aria_queue aq
        WHERE aq.web_evidence_score >= ?
        ORDER BY aq.web_evidence_score DESC
        LIMIT ?
    """, (args.min_score, args.limit)).fetchall()

    print(f"Processing {len(vendors)} vendors with web_evidence_score >= {args.min_score}")

    total_enriched = 0

    with httpx.Client(timeout=25) as client:
        for vendor_id, vendor_name, score, verdict in vendors:
            print(f"\nVendor {vendor_id} | score={score:.3f} | {verdict}")
            print(f"  {vendor_name}")

            # Get the best (highest confidence) non-NEGATIVE evidence row for this vendor
            rows = conn.execute("""
                SELECT id, query_type, verdict, confidence
                FROM aria_web_evidence
                WHERE vendor_id=? AND verdict != 'NEGATIVE'
                ORDER BY confidence DESC, id DESC
                LIMIT 1
            """, (vendor_id,)).fetchall()

            if not rows:
                print(f"  no evidence rows found")
                continue

            ev_id, query_type, ev_verdict, confidence = rows[0]

            ok = process_vendor(
                vendor_id, vendor_name or "",
                query_type, ev_verdict, ev_id,
                conn, client,
            )
            if ok:
                total_enriched += 1

    conn.close()

    print(f"\n{'='*60}")
    print(f"Done. Enriched {total_enriched}/{len(vendors)} vendors.")
    print()

    # Show final leaderboard with snippets
    conn2 = sqlite3.connect(str(args.db), timeout=30)
    rows = conn2.execute("""
        SELECT aq.vendor_id, aq.vendor_name, aq.web_evidence_score,
               aq.web_evidence_verdict, awe.source_url, awe.snippet
        FROM aria_queue aq
        LEFT JOIN aria_web_evidence awe ON (
            awe.vendor_id = aq.vendor_id
            AND awe.verdict != 'NEGATIVE'
        )
        WHERE aq.web_evidence_score >= ?
        GROUP BY aq.vendor_id
        ORDER BY aq.web_evidence_score DESC
        LIMIT 15
    """, (args.min_score,)).fetchall()
    conn2.close()

    print("Top 15 enriched evidence:")
    for vid, vname, score, verdict, url, snippet in rows:
        print(f"\n  {vid} | {score:.3f} | {verdict}")
        print(f"  {(vname or '')[:60]}")
        if url:
            print(f"  URL: {url[:80]}")
        if snippet and len(snippet) > 80:
            print(f"  BODY: {snippet[:200]}...")
        elif snippet:
            print(f"  TITLE: {snippet[:100]}")


if __name__ == "__main__":
    main()
