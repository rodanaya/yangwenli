"""
Precompute per-(lens, code, period) cohort aggregates for the Atlas
sexenio time filter — GET /atlas/cluster-stats?period=.

A vendor is "in the cohort during the period" if it has >=1 contract with
contract_year in the period's [year_min, year_max]. Cohort membership:
  patterns   -> aria_queue.primary_pattern
  sectors    -> aria_queue.primary_sector_id (resolved to sectors.code)
  categories -> contracts.category_id of the period's contracts (many-to-many)

high_risk_rate mirrors the all-time /atlas/cluster-stats predicate exactly:
fraction of cohort vendors with aria_queue.avg_risk_score >= 0.40 (lifetime
indicator — the model is not re-run per period). total_value_mxn sums
amount_mxn for the period's contracts with the same 100B reject ceiling as
the rest of the platform (see CLAUDE.md Critical Data Rules).

House pattern (see scripts/_precompute_category_cohort_counts.py): cheap
per-period GROUP BYs in SQL, cohort membership + distinct counting in
Python. Five periods partition the whole year range, so 5 queries per lens
cost about the same as one full-table pass.

Run: python -m scripts._precompute_atlas_cohort_periods [DB_PATH]
"""
import sqlite3
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from api.administrations import ADMINISTRATIONS  # noqa: E402

MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN — reject ceiling (parity with api/config/constants.py)


def _resolve_db_path() -> Path:
    base = Path(__file__).resolve().parent.parent
    for name in ("RUBLI_NORMALIZED.db", "RUBLI_DEPLOY.db"):
        p = base / name
        if p.exists() and p.stat().st_size > 0:
            return p
    raise FileNotFoundError(f"No DB found at {base}/RUBLI_*.db")


def run(db_path: str) -> None:
    t0 = time.time()
    conn = sqlite3.connect(db_path, timeout=600)  # 10-min wait for WAL lock
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA wal_autocheckpoint=0")
    cur = conn.cursor()

    print(f"DB: {db_path}")

    print("Creating atlas_cohort_period_stats table...")
    cur.execute("DROP TABLE IF EXISTS atlas_cohort_period_stats")
    cur.execute("""
        CREATE TABLE atlas_cohort_period_stats (
            lens             TEXT NOT NULL,
            code             TEXT NOT NULL,
            period           TEXT NOT NULL,
            vendors          INTEGER NOT NULL,
            t1               INTEGER NOT NULL,
            high_risk_rate   REAL NOT NULL,
            total_value_mxn  REAL NOT NULL,
            computed_at      TEXT NOT NULL,
            PRIMARY KEY (lens, code, period)
        )
    """)

    # Vendor-level lifetime attributes (single pass over aria_queue).
    tier_by_vendor: dict[int, int | None] = {}
    risk_by_vendor: dict[int, float | None] = {}
    pattern_by_vendor: dict[int, str | None] = {}
    sector_id_by_vendor: dict[int, int | None] = {}
    for vid, tier, risk, pattern, sector_id in cur.execute(
        "SELECT vendor_id, ips_tier, avg_risk_score, primary_pattern, primary_sector_id FROM aria_queue"
    ):
        tier_by_vendor[vid] = tier
        risk_by_vendor[vid] = risk
        pattern_by_vendor[vid] = pattern if pattern else None
        sector_id_by_vendor[vid] = sector_id
    print(f"Loaded {len(tier_by_vendor)} vendor lifetime attributes from aria_queue")

    sector_code_by_id = {r[0]: r[1] for r in cur.execute("SELECT id, code FROM sectors")}
    sector_code_by_vendor = {
        vid: sector_code_by_id.get(sid) for vid, sid in sector_id_by_vendor.items() if sid is not None
    }
    cat_code_by_id = {
        r[0]: r[1] for r in cur.execute("SELECT id, code FROM categories WHERE is_active = 1")
    }

    def _cohort_row(vendor_ids: set) -> tuple[int, int, float]:
        n = len(vendor_ids)
        if n == 0:
            return 0, 0, 0.0
        t1 = sum(1 for v in vendor_ids if tier_by_vendor.get(v) == 1)
        high = sum(1 for v in vendor_ids if (risk_by_vendor.get(v) or 0.0) >= 0.40)
        return n, t1, high / n

    now_iso = datetime.now(timezone.utc).isoformat()
    inserts: list[tuple] = []

    for adm in ADMINISTRATIONS:
        period, ymin, ymax = adm.key, adm.year_min, adm.year_max
        t1_period = time.time()

        # --- patterns + sectors: vendor-level cohort, one pass over contracts ---
        pattern_agg: dict[str, dict] = defaultdict(lambda: {"vendors": set(), "value": 0.0})
        sector_agg: dict[str, dict] = defaultdict(lambda: {"vendors": set(), "value": 0.0})
        rows = cur.execute(
            """
            SELECT vendor_id,
                   SUM(CASE WHEN amount_mxn > 0 AND amount_mxn <= ? THEN amount_mxn ELSE 0 END)
            FROM contracts
            WHERE contract_year BETWEEN ? AND ? AND vendor_id IS NOT NULL
            GROUP BY vendor_id
            """,
            (MAX_CONTRACT_VALUE, ymin, ymax),
        ).fetchall()
        for vendor_id, val in rows:
            val = val or 0.0
            pattern = pattern_by_vendor.get(vendor_id)
            if pattern:
                pattern_agg[pattern]["vendors"].add(vendor_id)
                pattern_agg[pattern]["value"] += val
            sector_code = sector_code_by_vendor.get(vendor_id)
            if sector_code:
                sector_agg[sector_code]["vendors"].add(vendor_id)
                sector_agg[sector_code]["value"] += val

        for code, agg in pattern_agg.items():
            n, t1, high_rate = _cohort_row(agg["vendors"])
            inserts.append(("patterns", code, period, n, t1, round(high_rate, 4), round(agg["value"], 2), now_iso))
        for code, agg in sector_agg.items():
            n, t1, high_rate = _cohort_row(agg["vendors"])
            inserts.append(("sectors", code, period, n, t1, round(high_rate, 4), round(agg["value"], 2), now_iso))

        # --- categories: many-to-many, two-column group by scoped to this period ---
        cat_agg: dict[str, dict] = defaultdict(lambda: {"vendors": set(), "value": 0.0})
        rows = cur.execute(
            """
            SELECT category_id, vendor_id,
                   SUM(CASE WHEN amount_mxn > 0 AND amount_mxn <= ? THEN amount_mxn ELSE 0 END)
            FROM contracts
            WHERE contract_year BETWEEN ? AND ? AND category_id IS NOT NULL AND vendor_id IS NOT NULL
            GROUP BY category_id, vendor_id
            """,
            (MAX_CONTRACT_VALUE, ymin, ymax),
        ).fetchall()
        for category_id, vendor_id, val in rows:
            code = cat_code_by_id.get(category_id)
            if not code:
                continue
            cat_agg[code]["vendors"].add(vendor_id)
            cat_agg[code]["value"] += (val or 0.0)

        for code, agg in cat_agg.items():
            n, t1, high_rate = _cohort_row(agg["vendors"])
            inserts.append(("categories", code, period, n, t1, round(high_rate, 4), round(agg["value"], 2), now_iso))

        print(f"  period={period} ({ymin}-{ymax}): "
              f"{len(pattern_agg)} patterns, {len(sector_agg)} sectors, {len(cat_agg)} categories "
              f"in {time.time() - t1_period:.1f}s")

    cur.executemany(
        "INSERT INTO atlas_cohort_period_stats VALUES (?,?,?,?,?,?,?,?)",
        inserts,
    )
    conn.commit()
    # Merge WAL into the main file — see _precompute_category_top_vendors.py's
    # comment on why this matters on prod (single-file bind-mount + WAL sidecar
    # lost on container recreate).
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.close()

    print(f"Done: {len(inserts)} rows inserted in {time.time() - t0:.1f}s total")
    print("Verify: SELECT * FROM atlas_cohort_period_stats WHERE lens='patterns' AND period='amlo'")


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else str(_resolve_db_path()))
