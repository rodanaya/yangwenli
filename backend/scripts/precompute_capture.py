"""
Precompute institutional-capture detection results into `capture_results` table.

Run locally (needs local RUBLI_NORMALIZED.db or RUBLI_DEPLOY.db):

    cd backend
    python -m scripts.precompute_capture
    python -m scripts.precompute_capture --db backend/RUBLI_DEPLOY.db

After running, export the table for VPS deployment:

    python -m scripts.precompute_capture --export capture_results.sql

Apply on VPS:

    sqlite3 /opt/rubli/backend/RUBLI_DEPLOY.db < capture_results.sql

The API endpoint reads from this table (O(1) memory) instead of running
the expensive window-function CTE that OOMs the 1.5 GB VPS worker.
"""

import argparse
import json
import math
import sqlite3
from collections import defaultdict
from pathlib import Path

DB_DEFAULT = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

_MIN_INST_TOTAL = 100_000_000
_MIN_CUM_VALUE  = 50_000_000
_FLOOR_SHARE    = 25.0
_CEIL_SHARE     = 50.0
_MIN_YEARS      = 4

SCHEMA = """
CREATE TABLE IF NOT EXISTS capture_results (
    institution_id         INTEGER NOT NULL,
    vendor_id              INTEGER NOT NULL,
    institution_name       TEXT,
    institution_full_name  TEXT,
    institution_sector_id  INTEGER,
    institution_sector_name TEXT,
    vendor_name            TEXT,
    earliest_year          INTEGER,
    earliest_share_pct     REAL,
    peak_year              INTEGER,
    peak_share_pct         REAL,
    latest_year            INTEGER,
    latest_share_pct       REAL,
    years_observed         INTEGER,
    cumulative_value_mxn   REAL,
    institution_total_window REAL,
    score                  REAL,
    timeline               TEXT,
    computed_at            TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (institution_id, vendor_id)
);
CREATE INDEX IF NOT EXISTS idx_capture_results_score
    ON capture_results(score DESC);
CREATE INDEX IF NOT EXISTS idx_capture_results_sector
    ON capture_results(institution_sector_id);
"""


def build_candidates(conn: sqlite3.Connection) -> list[dict]:
    print("Running aggregation query (this takes a few minutes)...")
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        WITH vy AS (
            SELECT
                c.institution_id,
                c.contract_year AS yr,
                c.vendor_id,
                SUM(c.amount_mxn) AS v_val
            FROM contracts c
            WHERE c.contract_year BETWEEN 2018 AND 2025
              AND c.amount_mxn > 0
              AND c.amount_mxn < 100000000000
              AND c.institution_id IS NOT NULL
              AND c.vendor_id IS NOT NULL
            GROUP BY c.institution_id, c.contract_year, c.vendor_id
        ),
        iy AS (
            SELECT institution_id, yr, SUM(v_val) AS i_total
            FROM vy
            GROUP BY institution_id, yr
        )
        SELECT
            vy.institution_id,
            vy.vendor_id,
            vy.yr,
            vy.v_val,
            iy.i_total,
            100.0 * vy.v_val / iy.i_total AS share_pct
        FROM vy
        JOIN iy ON iy.institution_id = vy.institution_id AND iy.yr = vy.yr
        WHERE vy.v_val >= 1000000
          AND iy.i_total >= 10000000
    """).fetchall()
    print(f"  {len(rows):,} (institution, vendor, year) rows fetched")

    series: dict[tuple[int, int], list[tuple[int, float, float, float]]] = defaultdict(list)
    for r in rows:
        series[(r["institution_id"], r["vendor_id"])].append(
            (r["yr"], r["share_pct"], r["v_val"], r["i_total"])
        )

    candidates: list[dict] = []
    for (inst_id, vendor_id), points in series.items():
        if len(points) < _MIN_YEARS:
            continue
        points.sort(key=lambda p: p[0])
        shares = [p[1] for p in points]
        values = [p[2] for p in points]
        earliest_share = shares[0]
        max_share = max(shares)
        max_share_idx = shares.index(max_share)
        min_share_idx = shares.index(min(shares))
        if earliest_share > _FLOOR_SHARE:
            continue
        if max_share < _CEIL_SHARE:
            continue
        if max_share_idx <= min_share_idx:
            continue
        cum_value = sum(values)
        if cum_value < _MIN_CUM_VALUE:
            continue
        inst_total_window = sum(set(p[3] for p in points))
        if inst_total_window < _MIN_INST_TOTAL:
            continue
        score = (max_share - earliest_share) * math.sqrt(cum_value / 1e6)
        candidates.append({
            "institution_id": inst_id,
            "vendor_id": vendor_id,
            "earliest_year": points[0][0],
            "earliest_share_pct": round(earliest_share, 2),
            "peak_year": points[max_share_idx][0],
            "peak_share_pct": round(max_share, 2),
            "latest_year": points[-1][0],
            "latest_share_pct": round(shares[-1], 2),
            "years_observed": len(points),
            "cumulative_value_mxn": cum_value,
            "institution_total_window": inst_total_window,
            "score": round(score, 2),
            "timeline": [
                {"year": p[0], "share_pct": round(p[1], 2), "value_mxn": p[2]}
                for p in points
            ],
        })

    candidates.sort(key=lambda c: c["score"], reverse=True)
    print(f"  {len(candidates):,} capture candidates found")
    return candidates


def enrich_with_names(conn: sqlite3.Connection, candidates: list[dict]) -> list[dict]:
    if not candidates:
        return []
    inst_ids = tuple({c["institution_id"] for c in candidates})
    vendor_ids = tuple({c["vendor_id"] for c in candidates})

    inst_map: dict[int, dict] = {}
    ph = ",".join("?" * len(inst_ids))
    for r in conn.execute(
        f"SELECT id, COALESCE(siglas, name) AS display_name, name, sector_id "
        f"FROM institutions WHERE id IN ({ph})",
        inst_ids,
    ).fetchall():
        inst_map[r["id"]] = {
            "display_name": r["display_name"],
            "full_name": r["name"],
            "sector_id": r["sector_id"],
        }

    vendor_map: dict[int, str] = {}
    ph = ",".join("?" * len(vendor_ids))
    for r in conn.execute(
        f"SELECT id, name FROM vendors WHERE id IN ({ph})", vendor_ids
    ).fetchall():
        vendor_map[r["id"]] = r["name"]

    sector_map: dict[int, str] = {}
    for r in conn.execute("SELECT id, name_en FROM sectors").fetchall():
        sector_map[r["id"]] = r["name_en"]

    enriched = []
    for c in candidates:
        inst = inst_map.get(c["institution_id"], {})
        enriched.append({
            **c,
            "institution_name": inst.get("display_name") or f"Institution #{c['institution_id']}",
            "institution_full_name": inst.get("full_name"),
            "institution_sector_id": inst.get("sector_id"),
            "institution_sector_name": sector_map.get(inst.get("sector_id") or 0),
            "vendor_name": vendor_map.get(c["vendor_id"], f"Vendor #{c['vendor_id']}"),
        })
    return enriched


def write_table(conn: sqlite3.Connection, enriched: list[dict]) -> None:
    conn.executescript(SCHEMA)
    conn.execute("DELETE FROM capture_results")
    conn.executemany(
        """
        INSERT INTO capture_results (
            institution_id, vendor_id, institution_name, institution_full_name,
            institution_sector_id, institution_sector_name, vendor_name,
            earliest_year, earliest_share_pct, peak_year, peak_share_pct,
            latest_year, latest_share_pct, years_observed,
            cumulative_value_mxn, institution_total_window, score, timeline
        ) VALUES (
            :institution_id, :vendor_id, :institution_name, :institution_full_name,
            :institution_sector_id, :institution_sector_name, :vendor_name,
            :earliest_year, :earliest_share_pct, :peak_year, :peak_share_pct,
            :latest_year, :latest_share_pct, :years_observed,
            :cumulative_value_mxn, :institution_total_window, :score, :timeline
        )
        """,
        [{**r, "timeline": json.dumps(r["timeline"])} for r in enriched],
    )
    conn.commit()
    print(f"  Wrote {len(enriched):,} rows to capture_results")


def export_sql(conn: sqlite3.Connection, out_path: Path) -> None:
    rows = conn.execute("SELECT * FROM capture_results ORDER BY score DESC").fetchall()
    lines = [
        "-- capture_results precomputed dump",
        "-- Apply: sqlite3 RUBLI_DEPLOY.db < capture_results.sql",
        "",
        "BEGIN TRANSACTION;",
        "",
        "CREATE TABLE IF NOT EXISTS capture_results (",
        "    institution_id         INTEGER NOT NULL,",
        "    vendor_id              INTEGER NOT NULL,",
        "    institution_name       TEXT,",
        "    institution_full_name  TEXT,",
        "    institution_sector_id  INTEGER,",
        "    institution_sector_name TEXT,",
        "    vendor_name            TEXT,",
        "    earliest_year          INTEGER,",
        "    earliest_share_pct     REAL,",
        "    peak_year              INTEGER,",
        "    peak_share_pct         REAL,",
        "    latest_year            INTEGER,",
        "    latest_share_pct       REAL,",
        "    years_observed         INTEGER,",
        "    cumulative_value_mxn   REAL,",
        "    institution_total_window REAL,",
        "    score                  REAL,",
        "    timeline               TEXT,",
        "    computed_at            TEXT DEFAULT (datetime('now')),",
        "    PRIMARY KEY (institution_id, vendor_id)",
        ");",
        "CREATE INDEX IF NOT EXISTS idx_capture_results_score ON capture_results(score DESC);",
        "CREATE INDEX IF NOT EXISTS idx_capture_results_sector ON capture_results(institution_sector_id);",
        "",
        "DELETE FROM capture_results;",
        "",
    ]
    for r in rows:
        def esc(v: object) -> str:
            if v is None:
                return "NULL"
            if isinstance(v, (int, float)):
                return str(v)
            return "'" + str(v).replace("'", "''") + "'"
        vals = ",".join(esc(r[col]) for col in [
            "institution_id", "vendor_id", "institution_name", "institution_full_name",
            "institution_sector_id", "institution_sector_name", "vendor_name",
            "earliest_year", "earliest_share_pct", "peak_year", "peak_share_pct",
            "latest_year", "latest_share_pct", "years_observed",
            "cumulative_value_mxn", "institution_total_window", "score", "timeline",
        ])
        lines.append(
            f"INSERT INTO capture_results (institution_id,vendor_id,institution_name,"
            f"institution_full_name,institution_sector_id,institution_sector_name,vendor_name,"
            f"earliest_year,earliest_share_pct,peak_year,peak_share_pct,latest_year,"
            f"latest_share_pct,years_observed,cumulative_value_mxn,institution_total_window,"
            f"score,timeline) VALUES ({vals});"
        )
    lines += ["", "COMMIT;", ""]
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"  Exported {len(rows):,} rows -> {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=str(DB_DEFAULT), help="Path to SQLite database")
    parser.add_argument("--export", metavar="FILE", help="Export to SQL dump file after writing")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        raise SystemExit(f"Database not found: {db_path}")

    print(f"Database: {db_path}")
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    candidates = build_candidates(conn)
    enriched = enrich_with_names(conn, candidates)
    write_table(conn, enriched)

    if args.export:
        export_sql(conn, Path(args.export))

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
