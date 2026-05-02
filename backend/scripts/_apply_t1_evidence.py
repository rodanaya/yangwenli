#!/usr/bin/env python3
"""
Apply t1_evidence.json keyword classifications to the DB.
Reads the pre-scraped RSS data, runs keyword classifier, writes to DB.
"""
import sys, json, re, sqlite3, uuid
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
JSON_PATH = Path(__file__).parent.parent.parent / "t1_evidence.json"

VERDICT_SEVERITY = {
    "CORRUPTION_MENTION": 4,
    "SANCTION": 3,
    "JOURNALISM": 2,
    "SHELL_SIGNAL": 1,
    "NEGATIVE": 0,
}

_KEYWORD_MAP = {
    "CORRUPTION": {
        "CORRUPTION_MENTION": [
            "corrupción", "soborno", "fraude", "desvio", "desvío", "malversación",
            "irregular", "ilegales", "cartel", "cártel", "coacción", "colusión",
            "odebrecht", "estafa maestra",
        ],
        "JOURNALISM": [
            "investigación", "periodística", "denuncia", "reportaje", "anomalías",
            "señalamiento", "cuestionada", "irregularidades", "complicidades",
            "escándalo",
        ],
    },
    "SANCTION": {
        "SANCTION": [
            "inhabilitado", "inhabilitada", "inhabilitados", "inhabilitadas",
            "sancionado", "sancionada", "sancionados", "sancionadas",
            "sfp", "función pública", "multa", "multas", "vetado", "vetada",
            "vetados", "vedado", "suspensión", "infracción",
        ],
    },
    "JOURNALISM": {
        "JOURNALISM": [
            "investigación", "periodística", "denuncia", "reportaje", "anomalías",
            "señalamiento", "irregularidades", "fiscalización", "asf",
            "contraloría", "contralínea", "animal político", "proceso",
        ],
        "CORRUPTION_MENTION": [
            "corrupción", "fraude", "soborno", "escándalo", "cartel", "cártel",
        ],
    },
    "SHELL": {
        "SHELL_SIGNAL": [
            "empresa fantasma", "prestanombres", "facturación falsa", "efos",
            "edos", "sat", "ghost company", "shell company", "fachada",
        ],
    },
}


def _classify_keywords(query_type: str, results: list) -> dict:
    if not results:
        return {"verdict": "NEGATIVE", "confidence": 0.0, "reasoning": "No results"}

    all_text = " ".join(
        (r.get("t") or "") + " " + (r.get("s") or "")
        for r in results
    ).lower()

    kw_map = _KEYWORD_MAP.get(query_type, {})
    best_verdict = "NEGATIVE"
    best_confidence = 0.0
    matched_kws = []

    for verdict_candidate, keywords in kw_map.items():
        hits = [kw for kw in keywords if kw in all_text]
        if hits:
            conf = min(0.6, 0.2 + 0.1 * len(hits))
            if conf > best_confidence:
                best_confidence = conf
                best_verdict = verdict_candidate
                matched_kws = hits

    if best_verdict == "NEGATIVE":
        return {"verdict": "NEGATIVE", "confidence": 0.0, "reasoning": "No keyword matches"}

    return {
        "verdict": best_verdict,
        "confidence": best_confidence,
        "reasoning": f"Keyword matches: {', '.join(matched_kws[:5])}",
    }


def _aggregate_score(query_results: list) -> tuple:
    weighted_score = 0.0
    best_severity = 0
    best_verdict = "NEGATIVE"
    best_confidence = 0.0

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

    normalized_score = min(1.0, weighted_score / 8.0)
    return round(normalized_score, 4), best_verdict


def _migrate_schema(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS aria_web_evidence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id INTEGER NOT NULL,
            aria_run_id TEXT,
            query TEXT,
            query_type TEXT,
            source_name TEXT,
            source_url TEXT,
            snippet TEXT,
            published_date TEXT,
            verdict TEXT,
            confidence REAL,
            reasoning TEXT,
            raw_results_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS aria_web_evidence_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT,
            vendor_id INTEGER,
            vendor_name TEXT,
            tier INTEGER,
            queries_run INTEGER,
            web_score REAL,
            web_verdict TEXT,
            verdicts_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    for col, defn in [
        ("web_evidence_score", "REAL"),
        ("web_evidence_verdict", "TEXT"),
        ("web_evidence_updated_at", "TIMESTAMP"),
    ]:
        try:
            conn.execute(f"ALTER TABLE aria_queue ADD COLUMN {col} {defn}")
        except sqlite3.OperationalError:
            pass
    conn.commit()


def main():
    print(f"Reading {JSON_PATH}")
    with open(JSON_PATH, encoding="utf-8") as f:
        evidence = json.load(f)

    conn = sqlite3.connect(str(DB_PATH), timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    _migrate_schema(conn)

    run_id = f"CENTINELA-MANUAL-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    processed = 0
    hits = 0

    query_type_map = {
        "CORRUPTION": "CORRUPTION",
        "SANCTION": "SANCTION",
        "JOURNALISM": "JOURNALISM",
        "SHELL": "SHELL",
    }

    for vendor_id_str, data in evidence.items():
        vendor_id = int(vendor_id_str)
        vendor_name = data["name"]
        queries = data.get("queries", {})

        # Skip vendors with no results at all
        has_any = any(len(v) > 0 for v in queries.values())

        query_results = []
        for qt, results in queries.items():
            classification = _classify_keywords(qt, results)
            # Build a compact results list for storage
            compact_results = [{"t": r.get("t",""), "u": r.get("s","")} for r in results]
            query_results.append({
                "query_type": qt,
                "verdict": classification["verdict"],
                "confidence": classification["confidence"],
                "reasoning": classification["reasoning"],
                "results": results,
            })

            if not has_any:
                continue

            # Get first result URL/snippet if available
            first_url = None
            first_snippet = None
            first_source = None
            if results:
                first_source = results[0].get("t", "")
                # Extract URL from HTML anchor in snippet field
                s = results[0].get("s", "")
                url_match = re.search(r'href="([^"]+)"', s)
                first_url = url_match.group(1) if url_match else None
                first_snippet = results[0].get("t", "")  # use title as snippet

            conn.execute(
                """INSERT OR REPLACE INTO aria_web_evidence
                   (vendor_id, aria_run_id, query, query_type,
                    source_name, source_url, snippet, published_date,
                    verdict, confidence, reasoning, raw_results_json)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    vendor_id, run_id,
                    f'"{vendor_name}" {qt}',
                    qt,
                    first_source, first_url, first_snippet, None,
                    classification["verdict"],
                    classification["confidence"],
                    classification["reasoning"],
                    json.dumps(compact_results, ensure_ascii=False),
                ),
            )

        web_score, web_verdict = _aggregate_score(query_results)

        conn.execute(
            """INSERT INTO aria_web_evidence_runs
               (run_id, vendor_id, vendor_name, tier,
                queries_run, web_score, web_verdict, verdicts_json)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                run_id, vendor_id, vendor_name, 1,
                len(query_results), web_score, web_verdict,
                json.dumps([
                    {"qt": r["query_type"], "v": r["verdict"], "c": r["confidence"]}
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

        processed += 1
        if web_verdict != "NEGATIVE" and web_score > 0:
            hits += 1
            print(f"  HIT  {vendor_id:6d}  {web_verdict:20s}  score={web_score:.3f}  {vendor_name[:50]}")

    conn.commit()
    conn.close()

    print(f"\nDone. {processed} vendors processed, {hits} with non-negative verdict.")
    print(f"Run ID: {run_id}")

    # Show leaderboard
    conn2 = sqlite3.connect(str(DB_PATH), timeout=30)
    rows = conn2.execute("""
        SELECT vendor_id, vendor_name, web_evidence_score, web_evidence_verdict
        FROM aria_queue
        WHERE web_evidence_score > 0
        ORDER BY web_evidence_score DESC
        LIMIT 20
    """).fetchall()
    conn2.close()

    print("\nTop 20 web-evidence leaderboard:")
    print(f"{'ID':>7}  {'Score':>6}  {'Verdict':20s}  Name")
    print("-" * 80)
    for vid, vname, score, verdict in rows:
        print(f"{vid:>7}  {score:>6.3f}  {(verdict or 'NEGATIVE'):20s}  {(vname or '')[:50]}")


if __name__ == "__main__":
    main()
