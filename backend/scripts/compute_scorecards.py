#!/usr/bin/env python3
"""
Compute Procurement Integrity Scorecards v2.0 — full redesign.

INSTITUTION scoring: 5 variance-aware pillars (30+25+20+15+10=100),
percentile-based grading, temporal trends, value-weighted metrics,
P90 tail risk, confidence bands, signal traffic lights.

VENDOR scoring: risk-oriented (higher score = riskier), risk_tier
assignment (flag/watch/elevated/low), temporal trends, peer percentile.

Grade tiers (10 bands):
  90-100: S   Modelo           #10b981
  80-89:  A   Solido           #22c55e
  70-79:  B+  Sobresaliente    #84cc16
  60-69:  B   Adecuado         #eab308
  50-59:  C+  Atencion         #f59e0b
  40-49:  C   Preocupante      #f97316
  30-39:  D   Alto Riesgo      #ef4444
  20-29:  D-  Grave            #dc2626
  10-19:  F   Critico          #991b1b
   0-9:   F-  Bandera Roja     #450a0a
"""

import json
import logging
import math
import sqlite3
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

GRADE_TIERS = [
    (90, "S",  "Modelo",        "#10b981"),
    (80, "A",  "Solido",        "#22c55e"),
    (70, "B+", "Sobresaliente", "#84cc16"),
    (60, "B",  "Adecuado",      "#eab308"),
    (50, "C+", "Atencion",      "#f59e0b"),
    (40, "C",  "Preocupante",   "#f97316"),
    (30, "D",  "Alto Riesgo",   "#ef4444"),
    (20, "D-", "Grave",         "#dc2626"),
    (10, "F",  "Critico",       "#991b1b"),
    (0,  "F-", "Bandera Roja",  "#450a0a"),
]


def get_grade(score: float) -> tuple:
    for threshold, code, label, color in GRADE_TIERS:
        if score >= threshold:
            return code, label, color
    return "F-", "Bandera Roja", "#450a0a"


def _percentile_grade(scores: list, score: float) -> tuple:
    """Assign grade by national percentile rank among all scores.

    Top 5%: S, 5-20%: A, 20-40%: B+, 40-60%: B, 60-75%: C+,
    75-88%: C, 88-95%: D, 95-98%: D-, 98-99.5%: F, Bottom 0.5%: F-
    """
    if not scores:
        return "C", "Preocupante", "#f97316"
    n = len(scores)
    # Count how many scores are strictly less than this score
    rank_below = 0
    for s in scores:
        if s < score:
            rank_below += 1
    pct = rank_below / n  # 0.0 = lowest, 1.0 = highest
    if pct >= 0.95:
        return "S", "Modelo", "#10b981"
    elif pct >= 0.80:
        return "A", "Solido", "#22c55e"
    elif pct >= 0.60:
        return "B+", "Sobresaliente", "#84cc16"
    elif pct >= 0.40:
        return "B", "Adecuado", "#eab308"
    elif pct >= 0.25:
        return "C+", "Atencion", "#f59e0b"
    elif pct >= 0.12:
        return "C", "Preocupante", "#f97316"
    elif pct >= 0.05:
        return "D", "Alto Riesgo", "#ef4444"
    elif pct >= 0.02:
        return "D-", "Grave", "#dc2626"
    elif pct >= 0.005:
        return "F", "Critico", "#991b1b"
    else:
        return "F-", "Bandera Roja", "#450a0a"


def _ols_slope(values: list) -> float:
    """Simple OLS slope for a list of (x, y) pairs."""
    if len(values) < 2:
        return 0.0
    n = len(values)
    sum_x = sum(v[0] for v in values)
    sum_y = sum(v[1] for v in values)
    sum_xy = sum(v[0] * v[1] for v in values)
    sum_x2 = sum(v[0] ** 2 for v in values)
    denom = n * sum_x2 - sum_x ** 2
    if denom == 0:
        return 0.0
    return (n * sum_xy - sum_x * sum_y) / denom


def _classify_trend(slope: float, positive_is_good: bool = True) -> str:
    """Classify slope into improving/deteriorating/stable."""
    threshold = 0.02
    if positive_is_good:
        if slope > threshold:
            return "improving"
        elif slope < -threshold:
            return "deteriorating"
        return "stable"
    else:
        if slope > threshold:
            return "deteriorating"
        elif slope < -threshold:
            return "improving"
        return "stable"


def _majority_trend(trends: list) -> str:
    """Return the majority trend direction."""
    counts = defaultdict(int)
    for t in trends:
        counts[t] += 1
    return max(counts, key=counts.get) if counts else "stable"


def _confidence_band(total_contracts: int) -> str:
    if total_contracts < 31:
        return "wide"
    elif total_contracts <= 100:
        return "medium"
    elif total_contracts <= 500:
        return "narrow"
    else:
        return "high"


# ---------------------------------------------------------------------------
# INSTITUTIONS
# ---------------------------------------------------------------------------

def _load_institution_base(conn: sqlite3.Connection) -> list:
    rows = conn.execute("""
        SELECT
            i.id,
            i.name,
            COALESCE(i.sector_id, 12) as sector_id,
            i.institution_type,
            ist.total_contracts,
            ist.total_value_mxn,
            ist.avg_risk_score,
            ist.high_risk_pct,
            ist.direct_award_pct,
            ist.single_bid_pct,
            ist.vendor_count
        FROM institutions i
        JOIN institution_stats ist ON i.id = ist.institution_id
        WHERE ist.total_contracts >= 10
    """).fetchall()
    cols = ["id", "name", "sector_id", "inst_type",
            "total_contracts", "total_value", "avg_risk",
            "high_risk_pct", "da_pct", "single_pct", "vendor_count"]
    return [dict(zip(cols, r)) for r in rows]


def _load_contract_metrics(conn: sqlite3.Connection) -> dict:
    rows = conn.execute("""
        SELECT
            institution_id,
            AVG(CAST(is_year_end AS REAL)) AS year_end_rate,
            AVG(CASE WHEN publication_delay_days < 15 AND is_direct_award = 0
                     THEN 1.0 ELSE 0.0 END) AS short_ad_rate,
            AVG(CASE WHEN is_direct_award = 0 AND publication_delay_days BETWEEN 0 AND 365
                     THEN CAST(publication_delay_days AS REAL) ELSE NULL END) AS avg_ad_days
        FROM contracts
        GROUP BY institution_id
    """).fetchall()

    split_rows = conn.execute("""
        WITH grp AS (
            SELECT institution_id, vendor_id, contract_date, COUNT(*) AS cnt
            FROM contracts
            WHERE contract_date IS NOT NULL
            GROUP BY institution_id, vendor_id, contract_date
        ),
        inst_total AS (
            SELECT institution_id, COUNT(*) AS tc
            FROM contracts
            GROUP BY institution_id
        )
        SELECT g.institution_id,
               CAST(SUM(CASE WHEN g.cnt >= 3 THEN g.cnt ELSE 0 END) AS REAL) / t.tc AS split_rate
        FROM grp g
        JOIN inst_total t ON g.institution_id = t.institution_id
        GROUP BY g.institution_id
    """).fetchall()
    split_map = {r[0]: r[1] or 0.0 for r in split_rows}

    return {
        r[0]: {
            "year_end_rate": r[1] or 0.0,
            "split_rate":    split_map.get(r[0], 0.0),
            "short_ad_rate": r[2] or 0.0,
            "avg_ad_days":   r[3] if r[3] is not None else 0.0,
        }
        for r in rows
    }


def _load_institution_hhi(conn: sqlite3.Connection) -> dict:
    rows = conn.execute("""
        WITH vv AS (
            SELECT institution_id, vendor_id, SUM(amount_mxn) AS vtotal
            FROM contracts
            WHERE amount_mxn > 0
            GROUP BY institution_id, vendor_id
        ),
        it AS (
            SELECT institution_id, SUM(vtotal) AS itotal
            FROM vv GROUP BY institution_id
        )
        SELECT vv.institution_id,
               SUM((vv.vtotal * vv.vtotal) / (it.itotal * it.itotal)) AS hhi
        FROM vv JOIN it ON vv.institution_id = it.institution_id
        GROUP BY vv.institution_id
    """).fetchall()
    return {r[0]: min(1.0, r[1] or 0.5) for r in rows}


def _load_institution_efos(conn: sqlite3.Connection) -> dict:
    try:
        rows = conn.execute("""
            SELECT c.institution_id, COUNT(DISTINCT v.id)
            FROM contracts c
            JOIN vendors v ON c.vendor_id = v.id
            JOIN sat_efos_vendors se ON v.rfc = se.rfc AND se.stage = 'definitivo'
            GROUP BY c.institution_id
        """).fetchall()
        return {r[0]: r[1] for r in rows}
    except Exception:
        return {}


def _load_institution_aria(conn: sqlite3.Connection) -> dict:
    try:
        rows = conn.execute("""
            SELECT c.institution_id,
                   SUM(CASE WHEN aq.ips_tier = 1 THEN 1 ELSE 0 END) AS t1,
                   SUM(CASE WHEN aq.ips_tier = 2 THEN 1 ELSE 0 END) AS t2
            FROM contracts c
            JOIN aria_queue aq ON c.vendor_id = aq.vendor_id
            GROUP BY c.institution_id
        """).fetchall()
        return {r[0]: {"t1": r[1] or 0, "t2": r[2] or 0} for r in rows}
    except Exception:
        return {}


def _load_institution_gt_vendors(conn: sqlite3.Connection) -> dict:
    """Count of distinct ground-truth vendors per institution."""
    try:
        rows = conn.execute("""
            SELECT c.institution_id, COUNT(DISTINCT gtv.vendor_id)
            FROM contracts c
            JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id
            GROUP BY c.institution_id
        """).fetchall()
        return {r[0]: r[1] for r in rows}
    except Exception:
        return {}


def _load_p90_risk_scores(conn: sqlite3.Connection) -> dict:
    """P90 risk score per institution using NTILE approximation."""
    log.info("Computing P90 risk scores per institution (approx) ...")
    # Use a percentile approach: for each institution, get the risk score
    # at the 90th percentile position
    rows = conn.execute("""
        WITH ranked AS (
            SELECT institution_id, risk_score,
                   ROW_NUMBER() OVER (PARTITION BY institution_id ORDER BY risk_score) AS rn,
                   COUNT(*) OVER (PARTITION BY institution_id) AS cnt
            FROM contracts
            WHERE risk_score IS NOT NULL AND institution_id IS NOT NULL
        )
        SELECT institution_id, risk_score
        FROM ranked
        WHERE rn = CAST(cnt * 0.9 AS INTEGER) + 1
    """).fetchall()
    return {r[0]: r[1] for r in rows}


def _load_value_weighted_competitive(conn: sqlite3.Connection) -> dict:
    """Value-weighted competitive rate per institution."""
    rows = conn.execute("""
        SELECT institution_id,
               SUM(CASE WHEN is_direct_award = 0 THEN amount_mxn ELSE 0 END) AS comp_value,
               SUM(amount_mxn) AS total_value
        FROM contracts
        WHERE amount_mxn > 0
        GROUP BY institution_id
    """).fetchall()
    result = {}
    for r in rows:
        total = r[2] or 1
        result[r[0]] = (r[1] or 0) / total
    return result


def _load_institution_trends(conn: sqlite3.Connection, min_year: int = 2022) -> dict:
    """Per-year metrics for trend computation."""
    rows = conn.execute("""
        SELECT institution_id, contract_year,
               AVG(CASE WHEN is_direct_award = 0 THEN 1.0 ELSE 0.0 END) AS comp_rate,
               AVG(risk_score) AS avg_risk,
               AVG(CASE WHEN is_single_bid = 1 AND is_direct_award = 0 THEN 1.0 ELSE 0.0 END) AS single_bid_rate
        FROM contracts
        WHERE contract_year >= ? AND institution_id IS NOT NULL
        GROUP BY institution_id, contract_year
        HAVING COUNT(*) >= 5
        ORDER BY institution_id, contract_year
    """, (min_year,)).fetchall()
    result = defaultdict(list)
    for r in rows:
        result[r[0]].append({
            "year": r[1],
            "comp_rate": r[2] or 0.0,
            "avg_risk": r[3] or 0.0,
            "single_bid_rate": r[4] or 0.0,
        })
    return dict(result)


def _compute_hhi_peer_percentiles(institutions: list, hhi_map: dict) -> dict:
    """Compute HHI peer percentile within size bucket."""
    # Bucket: small < 100, medium 100-1000, large > 1000
    buckets = defaultdict(list)
    for inst in institutions:
        tc = inst["total_contracts"] or 1
        iid = inst["id"]
        hhi = hhi_map.get(iid, 0.5)
        if tc < 100:
            bucket = "small"
        elif tc <= 1000:
            bucket = "medium"
        else:
            bucket = "large"
        buckets[bucket].append((iid, hhi))

    result = {}
    for bucket, items in buckets.items():
        # Sort by HHI ascending (lower HHI = better = higher percentile)
        sorted_items = sorted(items, key=lambda x: x[1])
        n = len(sorted_items)
        for rank, (iid, _) in enumerate(sorted_items):
            # Lower HHI = higher percentile (better)
            result[iid] = (n - rank) / n if n > 0 else 0.5
    return result


def score_institution(inst: dict, cm: dict, hhi: float, hhi_peer_pct: float,
                      efos_count: int, aria: dict, gt_vendor_count: int,
                      p90_risk: float, comp_rate_value: float,
                      trend_data: list) -> dict:
    avg_risk     = inst["avg_risk"]  or 0.0
    da_pct       = inst["da_pct"]    or 0.0
    single_pct   = inst["single_pct"] or 0.0
    vendor_count = inst["vendor_count"] or 0
    total_c      = inst["total_contracts"] or 1

    year_end     = cm.get("year_end_rate", 0.0)
    split_rate   = cm.get("split_rate",    0.0)
    short_ad     = cm.get("short_ad_rate", 0.0)

    # da_pct, single_pct from institution_stats are 0-100 percentages
    da_frac     = da_pct / 100.0
    single_frac = single_pct / 100.0
    competitive  = 1.0 - da_frac

    # --- Pillar 1: Competitive Openness (0-30) ---
    base = competitive * 20.0
    # Value bonus/penalty: iceberg pattern detection
    value_adj = 0.0
    diff = comp_rate_value - competitive
    if abs(diff) > 0.05:
        if comp_rate_value < competitive:
            # Big contracts are less competitive than count suggests
            value_adj = -5.0
        else:
            value_adj = 2.0  # Value more competitive than count
    single_bid_pen = min(10.0, single_frac * 25.0)
    p_openness = max(0.0, min(30.0, base + value_adj - single_bid_pen))

    # --- Pillar 2: Process Integrity (0-25) ---
    short_ad_pen = min(8.0, short_ad * 20.0)
    year_end_pen = min(6.0, year_end * 30.0)
    split_pen    = min(6.0, split_rate * 40.0)
    p_process    = max(0.0, min(25.0, 25.0 - short_ad_pen - year_end_pen - split_pen))

    # --- Pillar 3: Tail Risk (0-20) ---
    p_tail = max(0.0, min(20.0, 20.0 - p90_risk * 25.0))

    # --- Pillar 4: External Flags (0-15) ---
    efos_pen     = min(8.0, efos_count * 2.0)
    t1_pen       = min(5.0, aria["t1"] * 1.0)
    t2_pen       = min(3.0, aria["t2"] * 0.5)
    gt_pen       = min(8.0, gt_vendor_count * 2.0)
    p_external   = max(0.0, min(15.0, 15.0 - efos_pen - t1_pen - t2_pen - gt_pen))

    # --- Pillar 5: Vendor Independence (0-10) ---
    p_independence = min(10.0, max(0.0, hhi_peer_pct * 10.0))

    total = p_openness + p_process + p_tail + p_external + p_independence

    # Temporal trends
    trend_comp = "stable"
    trend_risk = "stable"
    trend_sb = "stable"
    comp_by_year = {}
    risk_by_year = {}
    if len(trend_data) >= 2:
        comp_points = [(d["year"], d["comp_rate"]) for d in trend_data]
        risk_points = [(d["year"], d["avg_risk"]) for d in trend_data]
        sb_points = [(d["year"], d["single_bid_rate"]) for d in trend_data]
        trend_comp = _classify_trend(_ols_slope(comp_points), positive_is_good=True)
        trend_risk = _classify_trend(_ols_slope(risk_points), positive_is_good=False)
        trend_sb = _classify_trend(_ols_slope(sb_points), positive_is_good=False)
        for d in trend_data:
            comp_by_year[str(d["year"])] = round(d["comp_rate"], 3)
            risk_by_year[str(d["year"])] = round(d["avg_risk"], 3)

    overall_trend = _majority_trend([trend_comp, trend_risk, trend_sb])

    # Confidence band
    conf_band = _confidence_band(total_c)

    # Signal traffic lights
    signals = {}
    signals["signal_competitive"] = (
        "red" if competitive < 0.30 else
        "yellow" if competitive < 0.50 else
        "green"
    )
    signals["signal_single_bid"] = (
        "red" if single_frac > 0.40 else
        "yellow" if single_frac > 0.20 else
        "green"
    )
    signals["signal_short_ad"] = (
        "red" if short_ad > 0.30 else
        "yellow" if short_ad > 0.15 else
        "green"
    )
    signals["signal_year_end"] = (
        "red" if year_end > 0.20 else
        "yellow" if year_end > 0.10 else
        "green"
    )
    signals["signal_p90_risk"] = (
        "red" if p90_risk >= 0.60 else
        "yellow" if p90_risk >= 0.30 else
        "green"
    )
    signals["signal_external"] = (
        "red" if efos_count > 0 or aria["t1"] > 2 else
        "yellow" if aria["t2"] > 5 else
        "green"
    )
    worst_signal_count = sum(1 for v in signals.values() if v == "red")

    # Identify worst pillar
    pillars = {
        "Apertura y Competencia":       p_openness / 30.0,
        "Integridad de Proceso":        p_process  / 25.0,
        "Riesgo de Cola (P90)":         p_tail     / 20.0,
        "Alertas Externas":             p_external / 15.0,
        "Independencia de Proveedores": p_independence / 10.0,
    }
    worst = min(pillars, key=pillars.get)

    key_metrics = {
        "competitive_rate": round(competitive, 3),
        "competitive_rate_value": round(comp_rate_value, 3),
        "da_rate_value": round(1.0 - comp_rate_value, 3),
        "single_bid_pct": round(single_frac, 3),
        "year_end_rate": round(year_end, 3),
        "short_ad_rate": round(short_ad, 3),
        "splitting_rate": round(split_rate, 3),
        "hhi": round(hhi, 4),
        "hhi_peer_percentile": round(hhi_peer_pct, 3),
        "vendor_count": vendor_count,
        "p90_risk_score": round(p90_risk, 3),
        "avg_risk_score": round(avg_risk, 3),
        "efos_vendors": efos_count,
        "gt_vendor_count": gt_vendor_count,
        "aria_t1_vendors": aria["t1"],
        "aria_t2_vendors": aria["t2"],
        "trend_competitive": trend_comp,
        "trend_risk": trend_risk,
        "trend_single_bid": trend_sb,
        "competitive_by_year": comp_by_year,
        "risk_by_year": risk_by_year,
        "worst_signal_count": worst_signal_count,
        **signals,
    }

    return {
        "institution_id":  inst["id"],
        "total_score":     round(total, 1),
        "grade":           "",  # Will be assigned by percentile later
        "grade_label":     "",
        "grade_color":     "",
        "pillar_openness": round(p_openness, 1),
        "pillar_price":    round(p_process, 1),   # Renamed but keep DB column name
        "pillar_vendors":  round(p_tail, 1),       # Reusing column for Tail Risk
        "pillar_process":  round(p_external, 1),   # Reusing column for External Flags
        "pillar_external": round(p_independence, 1),  # Reusing column for Independence
        "top_risk_driver": worst,
        "key_metrics":     json.dumps(key_metrics),
        "confidence_band": conf_band,
        "p90_risk_score":  round(p90_risk, 3),
        "trend_direction": overall_trend,
        "sector_id":       inst["sector_id"],
    }


def compute_institution_scorecards(conn: sqlite3.Connection) -> list:
    log.info("Loading institution base data ...")
    base = _load_institution_base(conn)
    log.info("  %d institutions (>=10 contracts)", len(base))

    log.info("Loading contract metrics ...")
    cm_map = _load_contract_metrics(conn)

    log.info("Computing vendor HHI per institution ...")
    hhi_map = _load_institution_hhi(conn)

    log.info("Loading EFOS vendor counts ...")
    efos_map = _load_institution_efos(conn)

    log.info("Loading ARIA tier counts ...")
    aria_map = _load_institution_aria(conn)

    log.info("Loading ground truth vendor counts ...")
    gt_map = _load_institution_gt_vendors(conn)

    log.info("Computing P90 risk scores ...")
    p90_map = _load_p90_risk_scores(conn)

    log.info("Computing value-weighted competitive rates ...")
    vw_comp_map = _load_value_weighted_competitive(conn)

    log.info("Loading temporal trend data ...")
    trend_map = _load_institution_trends(conn)

    log.info("Computing HHI peer percentiles ...")
    hhi_peer_map = _compute_hhi_peer_percentiles(base, hhi_map)

    results = []
    for inst in base:
        iid = inst["id"]
        rec = score_institution(
            inst,
            cm_map.get(iid, {}),
            hhi_map.get(iid, 0.5),
            hhi_peer_map.get(iid, 0.5),
            efos_map.get(iid, 0),
            aria_map.get(iid, {"t1": 0, "t2": 0}),
            gt_map.get(iid, 0),
            p90_map.get(iid, 0.0),
            vw_comp_map.get(iid, 0.5),
            trend_map.get(iid, []),
        )
        results.append(rec)

    # Assign grades by percentile rank
    all_scores = [r["total_score"] for r in results]
    all_scores_sorted = sorted(all_scores)
    for r in results:
        code, label, color = _percentile_grade(all_scores_sorted, r["total_score"])
        r["grade"] = code
        r["grade_label"] = label
        r["grade_color"] = color

    # Compute national percentile
    n = len(all_scores_sorted)
    for r in results:
        rank_below = sum(1 for s in all_scores_sorted if s < r["total_score"])
        r["national_percentile"] = round(rank_below / n, 3) if n > 0 else 0.5

    # Compute peer percentile within sector
    by_sector = defaultdict(list)
    for r in results:
        by_sector[r["sector_id"]].append(r)
    for sid, sector_results in by_sector.items():
        sector_scores = sorted([r["total_score"] for r in sector_results])
        ns = len(sector_scores)
        for r in sector_results:
            rank_below = sum(1 for s in sector_scores if s < r["total_score"])
            r["peer_percentile_sector"] = round(rank_below / ns, 3) if ns > 0 else 0.5

    return results


# ---------------------------------------------------------------------------
# VENDORS
# ---------------------------------------------------------------------------

def _load_vendor_base(conn: sqlite3.Connection) -> list:
    rows = conn.execute("""
        SELECT
            vs.vendor_id,
            vs.avg_risk_score,
            vs.high_risk_pct,
            vs.direct_award_pct,
            vs.single_bid_pct,
            vs.total_contracts,
            vs.total_value_mxn,
            vs.first_contract_year,
            vs.last_contract_year,
            vs.sector_count,
            vs.institution_count,
            COALESCE(aq.ips_tier, 4)           AS aria_tier,
            COALESCE(aq.direct_award_rate, vs.direct_award_pct / 100.0) AS da_rate,
            COALESCE(aq.is_efos_definitivo, 0) AS is_efos,
            COALESCE(aq.is_sfp_sanctioned, 0)  AS is_sfp,
            COALESCE(aq.review_status, '')     AS review_status,
            COALESCE(aq.fp_structural_monopoly, 0) AS is_structural_fp,
            COALESCE(aq.primary_sector_id, 12) AS sector_id
        FROM vendor_stats vs
        LEFT JOIN aria_queue aq ON vs.vendor_id = aq.vendor_id
        WHERE vs.total_contracts >= 3
          AND vs.vendor_id IS NOT NULL
    """).fetchall()
    cols = [
        "vendor_id", "avg_risk", "high_risk_pct", "da_pct", "single_pct",
        "total_contracts", "total_value", "first_year", "last_year",
        "sector_count", "institution_count",
        "aria_tier", "da_rate", "is_efos", "is_sfp", "review_status",
        "is_structural_fp", "sector_id",
    ]
    return [dict(zip(cols, r)) for r in rows]


def _load_vendor_gt_set(conn: sqlite3.Connection) -> set:
    """Set of vendor_ids in ground truth."""
    try:
        rows = conn.execute("SELECT DISTINCT vendor_id FROM ground_truth_vendors WHERE vendor_id IS NOT NULL").fetchall()
        return {r[0] for r in rows}
    except Exception:
        return set()


def _load_vendor_p90_risk(conn: sqlite3.Connection) -> dict:
    """P90 risk score per vendor — restricted to scored vendors only."""
    log.info("Computing P90 risk scores per vendor (approx) ...")
    rows = conn.execute("""
        WITH ranked AS (
            SELECT c.vendor_id, c.risk_score,
                   ROW_NUMBER() OVER (PARTITION BY c.vendor_id ORDER BY c.risk_score) AS rn,
                   COUNT(*) OVER (PARTITION BY c.vendor_id) AS cnt
            FROM contracts c
            INNER JOIN vendor_scorecards vs ON c.vendor_id = vs.vendor_id
            WHERE c.risk_score IS NOT NULL AND c.vendor_id IS NOT NULL
        )
        SELECT vendor_id, risk_score
        FROM ranked
        WHERE rn = CAST(cnt * 0.9 AS INTEGER) + 1
    """).fetchall()
    return {r[0]: r[1] for r in rows}


def _load_vendor_value_weighted_da(conn: sqlite3.Connection) -> dict:
    """Value-weighted DA rate per vendor — restricted to scored vendors only."""
    rows = conn.execute("""
        SELECT c.vendor_id,
               SUM(CASE WHEN c.is_direct_award = 1 THEN c.amount_mxn ELSE 0 END) AS da_value,
               SUM(c.amount_mxn) AS total_value
        FROM contracts c
        INNER JOIN vendor_scorecards vs ON c.vendor_id = vs.vendor_id
        WHERE c.amount_mxn > 0 AND c.vendor_id IS NOT NULL
        GROUP BY c.vendor_id
    """).fetchall()
    result = {}
    for r in rows:
        total = r[2] or 1
        result[r[0]] = (r[1] or 0) / total
    return result


def _load_vendor_trends(conn: sqlite3.Connection, min_year: int = 2022) -> dict:
    """Per-year risk for vendor trend computation.

    Fetches raw rows and aggregates in Python to avoid GROUP BY sort/hash
    that can hang after heavy window-function queries on the same connection.
    """
    # Fetch raw contract rows for scored vendors from min_year onwards.
    rows = conn.execute("""
        SELECT c.vendor_id, c.contract_year, c.risk_score, c.is_direct_award
        FROM contracts c
        INNER JOIN vendor_scorecards vs ON c.vendor_id = vs.vendor_id
        WHERE c.contract_year >= ? AND c.vendor_id IS NOT NULL
              AND c.risk_score IS NOT NULL
    """, (min_year,)).fetchall()

    # Aggregate per (vendor_id, year) in Python — O(n) single pass
    acc: dict = {}
    for vid, yr, risk, da in rows:
        key = (vid, yr)
        if key not in acc:
            acc[key] = [0.0, 0.0, 0]
        bucket = acc[key]
        bucket[0] += risk
        bucket[1] += 1.0 if da else 0.0
        bucket[2] += 1

    result: dict = defaultdict(list)
    for (vid, yr), (rs, das, n) in acc.items():
        result[vid].append({
            "year": yr,
            "avg_risk": rs / n,
            "da_rate": das / n,
        })
    return dict(result)


def score_vendor(v: dict, gt_set: set, p90_risk: float,
                 da_rate_value: float, trend_data: list) -> dict:
    avg_risk   = v["avg_risk"]        or 0.0
    da_rate    = v["da_rate"]         or 0.0
    single_pct = v["single_pct"]      or 0.0
    inst_count = v["institution_count"] or 1
    sec_count  = v["sector_count"]    or 1
    aria_tier  = v["aria_tier"]       or 4
    is_efos    = bool(v["is_efos"])
    is_sfp     = bool(v["is_sfp"])
    is_gt_confirmed = v["review_status"] == "confirmed_corrupt"
    in_gt      = v["vendor_id"] in gt_set
    total_c    = v["total_contracts"] or 1

    # single_pct from vendor_stats is 0-100
    single_frac = single_pct / 100.0

    # --- Risk tier assignment ---
    if is_gt_confirmed or is_efos or is_sfp:
        risk_tier = "flag"
        tier_reason = "confirmed_corrupt" if is_gt_confirmed else ("efos" if is_efos else "sfp")
    elif avg_risk >= 0.40 or aria_tier == 1:
        risk_tier = "watch"
        tier_reason = "avg_risk_high" if avg_risk >= 0.40 else "aria_t1"
    elif avg_risk >= 0.25 or aria_tier == 2:
        risk_tier = "elevated"
        tier_reason = "avg_risk_elevated" if avg_risk >= 0.25 else "aria_t2"
    else:
        risk_tier = "low"
        tier_reason = "low_risk"

    # total_score: risk-oriented (higher = riskier), 0-100
    total_score = min(100.0, avg_risk * 100.0)

    # Grade from risk score (higher score = worse grade)
    # 0-10: S (cleanest), 10-25: A, 25-35: B+, 35-45: B, 45-55: C+, 55-65: C, 65-75: D, 75-85: D-, 85-95: F, 95-100: F-
    if risk_tier == "flag":
        code, label, color = "F-", "Bandera Roja", "#450a0a"
    elif total_score >= 95:
        code, label, color = "F-", "Bandera Roja", "#450a0a"
    elif total_score >= 85:
        code, label, color = "F", "Critico", "#991b1b"
    elif total_score >= 75:
        code, label, color = "D-", "Grave", "#dc2626"
    elif total_score >= 65:
        code, label, color = "D", "Alto Riesgo", "#ef4444"
    elif total_score >= 55:
        code, label, color = "C", "Preocupante", "#f97316"
    elif total_score >= 45:
        code, label, color = "C+", "Atencion", "#f59e0b"
    elif total_score >= 35:
        code, label, color = "B", "Adecuado", "#eab308"
    elif total_score >= 25:
        code, label, color = "B+", "Sobresaliente", "#84cc16"
    elif total_score >= 10:
        code, label, color = "A", "Solido", "#22c55e"
    else:
        code, label, color = "S", "Modelo", "#10b981"

    # Pillar scores (for backward compat with DB columns, repurposed)
    # pillar_risk_signal: now direct risk (higher = worse)
    p_risk = min(25.0, avg_risk * 25.0)
    # pillar_conduct: DA rate penalty
    p_conduct = min(20.0, da_rate * 20.0)
    # pillar_spread: concentration (1/inst_count scaled)
    p_spread = max(0.0, min(20.0, 20.0 - min(20.0, inst_count * 1.5)))
    # pillar_behavior: single bid + high risk pct
    high_frac = (v["high_risk_pct"] or 0) / 100.0
    p_behavior = min(20.0, (high_frac + single_frac) * 10.0)
    # pillar_flags: external signals
    p_flags = 0.0
    if is_gt_confirmed or is_efos or is_sfp:
        p_flags = 15.0
    elif aria_tier == 1:
        p_flags = 12.0
    elif aria_tier == 2:
        p_flags = 8.0
    elif aria_tier == 3:
        p_flags = 3.0

    # Confidence band
    conf_band = _confidence_band(total_c)

    # Temporal trends
    trend_risk = "stable"
    trend_da = "stable"
    risk_by_year = {}
    if len(trend_data) >= 2:
        risk_points = [(d["year"], d["avg_risk"]) for d in trend_data]
        da_points = [(d["year"], d["da_rate"]) for d in trend_data]
        trend_risk = _classify_trend(_ols_slope(risk_points), positive_is_good=False)
        trend_da = _classify_trend(_ols_slope(da_points), positive_is_good=False)
        for d in trend_data:
            risk_by_year[str(d["year"])] = round(d["avg_risk"], 3)

    overall_trend = _majority_trend([trend_risk, trend_da])

    # Signal traffic lights for vendors
    signal_risk = "red" if avg_risk >= 0.40 else ("yellow" if avg_risk >= 0.25 else "green")
    signal_external = (
        "red" if is_efos or is_sfp or is_gt_confirmed or aria_tier == 1 else
        "yellow" if aria_tier == 2 else
        "green"
    )

    key_metrics = {
        "avg_risk_score": round(avg_risk, 3),
        "p90_risk": round(p90_risk, 3),
        "da_rate": round(da_rate, 3),
        "da_rate_value": round(da_rate_value, 3),
        "single_pct": round(single_frac, 3),
        "inst_count": inst_count,
        "sector_count": sec_count,
        "risk_tier": risk_tier,
        "risk_tier_reason": tier_reason,
        "confidence_band": conf_band,
        "trend_risk": trend_risk,
        "trend_da": trend_da,
        "risk_by_year": risk_by_year,
        "is_efos": is_efos,
        "is_sfp": is_sfp,
        "aria_tier": aria_tier,
        "in_ground_truth": in_gt,
        "signal_risk": signal_risk,
        "signal_external": signal_external,
    }

    return {
        "vendor_id":          v["vendor_id"],
        "total_score":        round(total_score, 1),
        "grade":              code,
        "grade_label":        label,
        "grade_color":        color,
        "pillar_risk_signal": round(p_risk, 1),
        "pillar_conduct":     round(p_conduct, 1),
        "pillar_spread":      round(p_spread, 1),
        "pillar_behavior":    round(p_behavior, 1),
        "pillar_flags":       round(p_flags, 1),
        "top_risk_driver":    tier_reason,
        "key_metrics":        json.dumps(key_metrics),
        "confidence_band":    conf_band,
        "p90_risk_score":     round(p90_risk, 3),
        "trend_direction":    overall_trend,
        "risk_tier":          risk_tier,
        "sector_id":          v["sector_id"],
    }


def compute_vendor_scorecards(conn: sqlite3.Connection) -> list:
    log.info("Loading vendor base data ...")
    base = _load_vendor_base(conn)
    log.info("  %d vendors (>=3 contracts)", len(base))

    log.info("Loading ground truth vendor set ...")
    gt_set = _load_vendor_gt_set(conn)

    log.info("Computing P90 risk scores per vendor ...")
    p90_map = _load_vendor_p90_risk(conn)

    log.info("Computing value-weighted DA rates per vendor ...")
    vw_da_map = _load_vendor_value_weighted_da(conn)

    log.info("Loading vendor trend data ...")
    trend_map = _load_vendor_trends(conn)

    results = []
    for v in base:
        vid = v["vendor_id"]
        rec = score_vendor(
            v, gt_set,
            p90_map.get(vid, 0.0),
            vw_da_map.get(vid, 0.0),
            trend_map.get(vid, []),
        )
        results.append(rec)

    # Percentile within sector (for vendors: higher risk = higher percentile)
    by_sector = defaultdict(list)
    for i, (v, r) in enumerate(zip(base, results)):
        by_sector[v["sector_id"]].append((r["total_score"], i))

    sector_pcts = {}
    for sid, items in by_sector.items():
        items_sorted = sorted(items, key=lambda x: x[0])
        ns = len(items_sorted)
        for rank, (_, orig_idx) in enumerate(items_sorted):
            sector_pcts[orig_idx] = round((rank + 1) / ns, 3)

    scores = sorted([r["total_score"] for r in results])
    n = len(scores)

    for i, r in enumerate(results):
        r["sector_percentile"] = sector_pcts.get(i, 0.5)
        rank_below = sum(1 for s in scores if s < r["total_score"])
        r["national_percentile"] = round(rank_below / n, 3) if n > 0 else 0.5
        # Store peer percentile in key_metrics
        km = json.loads(r["key_metrics"])
        km["peer_percentile_sector"] = r["sector_percentile"]
        r["key_metrics"] = json.dumps(km)

    return results


# ---------------------------------------------------------------------------
# DB WRITE
# ---------------------------------------------------------------------------

def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    cols = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(c[1] == column for c in cols)


def _add_column_if_missing(conn: sqlite3.Connection, table: str, column: str, col_type: str):
    if not _column_exists(conn, table, column):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        log.info("  Added column %s.%s", table, column)


def create_tables(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS institution_scorecards (
            institution_id       INTEGER PRIMARY KEY,
            total_score          REAL    NOT NULL DEFAULT 0,
            grade                TEXT    NOT NULL DEFAULT 'F-',
            grade_label          TEXT    NOT NULL DEFAULT 'Bandera Roja',
            grade_color          TEXT    NOT NULL DEFAULT '#450a0a',
            pillar_openness      REAL    NOT NULL DEFAULT 0,
            pillar_price         REAL    NOT NULL DEFAULT 0,
            pillar_vendors       REAL    NOT NULL DEFAULT 0,
            pillar_process       REAL    NOT NULL DEFAULT 0,
            pillar_external      REAL    NOT NULL DEFAULT 0,
            national_percentile  REAL,
            top_risk_driver      TEXT,
            key_metrics          TEXT,
            computed_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_isc_score ON institution_scorecards(total_score);
        CREATE INDEX IF NOT EXISTS idx_isc_grade ON institution_scorecards(grade);

        CREATE TABLE IF NOT EXISTS vendor_scorecards (
            vendor_id            INTEGER PRIMARY KEY,
            total_score          REAL    NOT NULL DEFAULT 0,
            grade                TEXT    NOT NULL DEFAULT 'F-',
            grade_label          TEXT    NOT NULL DEFAULT 'Bandera Roja',
            grade_color          TEXT    NOT NULL DEFAULT '#450a0a',
            pillar_risk_signal   REAL    NOT NULL DEFAULT 0,
            pillar_conduct       REAL    NOT NULL DEFAULT 0,
            pillar_spread        REAL    NOT NULL DEFAULT 0,
            pillar_behavior      REAL    NOT NULL DEFAULT 0,
            pillar_flags         REAL    NOT NULL DEFAULT 0,
            sector_percentile    REAL,
            national_percentile  REAL,
            top_risk_driver      TEXT,
            key_metrics          TEXT,
            computed_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_vsc_score ON vendor_scorecards(total_score);
        CREATE INDEX IF NOT EXISTS idx_vsc_grade ON vendor_scorecards(grade);
    """)

    # Add new columns for v2 redesign
    for col, ctype in [
        ("confidence_band", "TEXT"),
        ("p90_risk_score", "REAL"),
        ("trend_direction", "TEXT"),
        ("peer_percentile_sector", "REAL"),
    ]:
        _add_column_if_missing(conn, "institution_scorecards", col, ctype)

    for col, ctype in [
        ("confidence_band", "TEXT"),
        ("p90_risk_score", "REAL"),
        ("trend_direction", "TEXT"),
        ("risk_tier", "TEXT"),
    ]:
        _add_column_if_missing(conn, "vendor_scorecards", col, ctype)

    conn.commit()


def upsert_institutions(conn: sqlite3.Connection, rows: list) -> None:
    conn.execute("DELETE FROM institution_scorecards")
    conn.executemany("""
        INSERT INTO institution_scorecards
            (institution_id, total_score, grade, grade_label, grade_color,
             pillar_openness, pillar_price, pillar_vendors, pillar_process,
             pillar_external, national_percentile, top_risk_driver, key_metrics,
             confidence_band, p90_risk_score, trend_direction, peer_percentile_sector)
        VALUES
            (:institution_id, :total_score, :grade, :grade_label, :grade_color,
             :pillar_openness, :pillar_price, :pillar_vendors, :pillar_process,
             :pillar_external, :national_percentile, :top_risk_driver, :key_metrics,
             :confidence_band, :p90_risk_score, :trend_direction, :peer_percentile_sector)
    """, rows)
    conn.commit()
    log.info("  Saved %d institution scorecards", len(rows))


def upsert_vendors(conn: sqlite3.Connection, rows: list) -> None:
    conn.execute("DELETE FROM vendor_scorecards")
    CHUNK = 5000
    for i in range(0, len(rows), CHUNK):
        conn.executemany("""
            INSERT INTO vendor_scorecards
                (vendor_id, total_score, grade, grade_label, grade_color,
                 pillar_risk_signal, pillar_conduct, pillar_spread, pillar_behavior,
                 pillar_flags, sector_percentile, national_percentile,
                 top_risk_driver, key_metrics,
                 confidence_band, p90_risk_score, trend_direction, risk_tier)
            VALUES
                (:vendor_id, :total_score, :grade, :grade_label, :grade_color,
                 :pillar_risk_signal, :pillar_conduct, :pillar_spread, :pillar_behavior,
                 :pillar_flags, :sector_percentile, :national_percentile,
                 :top_risk_driver, :key_metrics,
                 :confidence_band, :p90_risk_score, :trend_direction, :risk_tier)
        """, rows[i : i + CHUNK])
    conn.commit()
    log.info("  Saved %d vendor scorecards", len(rows))


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main() -> None:
    import argparse
    p = argparse.ArgumentParser(description="Compute Procurement Integrity Scorecards v2.0")
    p.add_argument("--institutions-only", action="store_true")
    p.add_argument("--vendors-only",      action="store_true")
    p.add_argument("--db",                default=str(DB_PATH))
    args = p.parse_args()

    conn = sqlite3.connect(args.db, timeout=60)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA busy_timeout = 30000")
    conn.execute("PRAGMA cache_size = -32768")    # 32 MB page cache (leave RAM for Python dicts)
    conn.execute("PRAGMA temp_store = MEMORY")   # GROUP BY sorting in-memory

    log.info("Creating / verifying tables ...")
    create_tables(conn)

    if not args.vendors_only:
        log.info("=== Computing Institution Scorecards (v2.0) ===")
        i_rows = compute_institution_scorecards(conn)
        upsert_institutions(conn, i_rows)
        grade_dist = {}
        for r in i_rows:
            grade_dist[r["grade"]] = grade_dist.get(r["grade"], 0) + 1
        log.info("Institution grade distribution: %s", dict(sorted(grade_dist.items())))

    if not args.institutions_only:
        # Flush WAL between phases to free any memory held by the write transaction
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        log.info("=== Computing Vendor Scorecards (v2.0) ===")
        v_rows = compute_vendor_scorecards(conn)
        upsert_vendors(conn, v_rows)
        grade_dist2 = {}
        for r in v_rows:
            grade_dist2[r["grade"]] = grade_dist2.get(r["grade"], 0) + 1
        log.info("Vendor grade distribution: %s", dict(sorted(grade_dist2.items())))
        tier_dist = {}
        for r in v_rows:
            tier_dist[r["risk_tier"]] = tier_dist.get(r["risk_tier"], 0) + 1
        log.info("Vendor risk_tier distribution: %s", dict(sorted(tier_dist.items())))

    conn.close()
    log.info("Done.")


if __name__ == "__main__":
    main()
