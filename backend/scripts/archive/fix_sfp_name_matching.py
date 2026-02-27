"""
Fix SFP sanctions name matching.

The 2021 Wayback archive CSV has no RFC numbers. This script uses normalized
token-based name matching (Jaccard similarity) to link SFP sanction records
to vendors in RUBLI, then backfills sfp_sanctions.rfc.

Matching strategy:
1. Strip legal suffixes (S.A. DE C.V., SA DE CV, S. DE R.L., etc.)
2. Strip accents, punctuation, extra spaces
3. Compute Jaccard similarity on word tokens
4. Accept matches at >= 0.80 similarity where vendor has an RFC

Usage:
    python -m scripts.fix_sfp_name_matching [--dry-run] [--threshold 0.80]
"""
import argparse
import logging
import re
import sqlite3
import unicodedata
from pathlib import Path

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Legal suffixes to strip before matching
LEGAL_SUFFIXES = [
    r"\bS\.?A\.?\s*DE\s*C\.?V\.?\b",
    r"\bS\.?A\.?P\.?I\.?\s*DE\s*C\.?V\.?\b",
    r"\bS\.?\s*DE\s*R\.?L\.?\s*DE\s*C\.?V\.?\b",
    r"\bS\.?\s*DE\s*R\.?L\.?\b",
    r"\bS\.?C\.?\b",
    r"\bA\.?C\.?\b",
    r"\bS\.?A\.?\b",
    r"\bDEL?\b",
    r"\bY\b",
]
SUFFIX_RE = re.compile("|".join(LEGAL_SUFFIXES), re.IGNORECASE)
PUNCT_RE = re.compile(r"[^a-z0-9\s]")
SPACE_RE = re.compile(r"\s+")

# Tokens to ignore as they are too generic to be discriminative
STOP_TOKENS = {
    "la", "el", "los", "las", "de", "del", "en", "y", "e", "o", "para",
    "con", "por", "sa", "cv", "sapi", "sc", "ac", "rl",
    "sociedad", "anonima", "capital", "variable", "responsabilidad",
    "limitada", "servicios", "grupo", "constructora", "comercializadora",
    "distribuidora", "empresa",
}


def strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


def normalize(name: str) -> set[str]:
    """Return set of discriminative tokens from company name."""
    if not name:
        return set()
    s = strip_accents(name.upper())
    s = SUFFIX_RE.sub(" ", s)
    s = PUNCT_RE.sub(" ", s.lower())
    s = SPACE_RE.sub(" ", s).strip()
    tokens = set(s.split()) - STOP_TOKENS
    return tokens


def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def load_sfp(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT id, company_name, rfc FROM sfp_sanctions WHERE rfc IS NULL OR rfc = ''"
    ).fetchall()
    return [{"id": r[0], "company_name": r[1], "rfc": r[2]} for r in rows]


def load_vendors(conn: sqlite3.Connection) -> list[dict]:
    """Load vendors that have an RFC (needed to backfill sfp_sanctions)."""
    rows = conn.execute(
        "SELECT id, name, name_normalized, rfc FROM vendors WHERE rfc IS NOT NULL AND rfc != ''"
    ).fetchall()
    return [{"id": r[0], "name": r[1], "name_normalized": r[2], "rfc": r[3]} for r in rows]


def build_vendor_index(vendors: list[dict]) -> tuple[dict, dict]:
    """Build inverted token index for fast lookup.

    Returns:
        token_to_vendors: token → list of vendor dicts with their token sets
        vendor_tokens: vendor_id → token set
    """
    token_to_vendors: dict[str, list[dict]] = {}
    vendor_tokens: dict[int, set] = {}

    for v in vendors:
        tokens = normalize(v["name_normalized"] or v["name"] or "")
        if len(tokens) < 2:
            continue
        vendor_tokens[v["id"]] = tokens
        for token in tokens:
            token_to_vendors.setdefault(token, []).append(v)

    return token_to_vendors, vendor_tokens


def find_best_match(
    sfp_tokens: set,
    token_to_vendors: dict,
    vendor_tokens: dict,
    threshold: float,
) -> tuple[dict | None, float]:
    """Return (best_vendor, score) using inverted index — only compares vendors sharing ≥1 token."""
    # Gather candidate vendors that share at least one token
    candidates: dict[int, dict] = {}
    for token in sfp_tokens:
        for v in token_to_vendors.get(token, []):
            candidates[v["id"]] = v

    best_vendor = None
    best_score = 0.0
    for vid, vdata in candidates.items():
        vtokens = vendor_tokens[vid]
        score = jaccard(sfp_tokens, vtokens)
        if score > best_score:
            best_score = score
            best_vendor = vdata

    if best_score >= threshold:
        return best_vendor, best_score
    return None, 0.0


def main():
    parser = argparse.ArgumentParser(description="Fix SFP sanctions name matching")
    parser.add_argument("--dry-run", action="store_true", help="Report matches without writing")
    parser.add_argument("--threshold", type=float, default=0.80, help="Jaccard similarity threshold (default: 0.80)")
    args = parser.parse_args()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA busy_timeout = 30000")

    sfp_records = load_sfp(conn)
    logger.info(f"SFP records without RFC: {len(sfp_records)}")

    vendors = load_vendors(conn)
    logger.info(f"Vendors with RFC: {len(vendors)}")

    token_to_vendors, vendor_tokens = build_vendor_index(vendors)
    logger.info(f"Vendor index built: {len(vendor_tokens)} entries, {len(token_to_vendors)} unique tokens")

    matched = []
    unmatched = []

    for rec in sfp_records:
        sfp_tokens = normalize(rec["company_name"])
        if len(sfp_tokens) < 2:
            unmatched.append(rec)
            continue

        vendor, score = find_best_match(sfp_tokens, token_to_vendors, vendor_tokens, args.threshold)
        if vendor:
            matched.append({
                "sfp_id": rec["id"],
                "sfp_name": rec["company_name"],
                "vendor_name": vendor["name"],
                "vendor_rfc": vendor["rfc"],
                "score": score,
            })
        else:
            unmatched.append(rec)

    logger.info(f"Matched: {len(matched)} / {len(sfp_records)} ({100*len(matched)/len(sfp_records):.1f}%)")

    # Show top matches for review
    matched.sort(key=lambda x: -x["score"])
    logger.info("Top 20 matches:")
    for m in matched[:20]:
        logger.info(f"  [{m['score']:.3f}] '{m['sfp_name']}' → '{m['vendor_name']}' (RFC: {m['vendor_rfc']})")

    if not args.dry_run and matched:
        cursor = conn.cursor()
        updates = [(m["vendor_rfc"], m["sfp_id"]) for m in matched]
        cursor.executemany(
            "UPDATE sfp_sanctions SET rfc = ? WHERE id = ?",
            updates,
        )
        conn.commit()
        logger.info(f"Updated {len(updates)} sfp_sanctions records with matched RFC")

        # Report how many now join to vendors
        count = conn.execute(
            """SELECT COUNT(DISTINCT s.id) FROM sfp_sanctions s
               JOIN vendors v ON v.rfc = s.rfc"""
        ).fetchone()[0]
        logger.info(f"SFP records now linkable to vendors: {count}")
    elif args.dry_run:
        logger.info("Dry run — no writes")

    conn.close()


if __name__ == "__main__":
    main()
