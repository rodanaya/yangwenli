"""
ARIA Phase 1 Pipeline — Investigation Priority Score + Pattern Classifier
+ Intermediary Detection + External Cross-Reference + False Positive Screening.

Run from backend/ directory:
    python -m scripts.aria_pipeline [--dry-run] [--limit 1000]
"""

import argparse
import json
import logging
import math
import sqlite3
import statistics
import uuid
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
ARIA_VERSION = "1.0"

# 12-Sector taxonomy mapping
SECTOR_MAP = {
    1: "salud",
    2: "educacion",
    3: "infraestructura",
    4: "energia",
    5: "defensa",
    6: "tecnologia",
    7: "hacienda",
    8: "gobernacion",
    9: "agricultura",
    10: "ambiente",
    11: "trabajo",
    12: "otros"
}


# ---------------------------------------------------------------------------
# IPS weights
# ---------------------------------------------------------------------------
W_RISK = 0.40
W_ENSEMBLE = 0.20
W_FINANCIAL = 0.20
W_EXTERNAL = 0.20

# Tier thresholds
TIER1_THRESHOLD = 0.80
TIER2_THRESHOLD = 0.60
TIER3_THRESHOLD = 0.40

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module 1: IPS Computation
# ---------------------------------------------------------------------------

def normalize_risk_score(risk_score: float) -> float:
    """risk_score is already 0-1; apply mild contrast stretch."""
    if risk_score is None:
        return 0.0
    return min(1.0, risk_score * 1.2)


def normalize_mahalanobis(d2: float) -> float:
    """Logistic transform centred at D2=80, steepness=0.02.
    D2=80 -> 0.50, D2=200 -> 0.93, D2=500 -> 0.9998."""
    if d2 is None or d2 <= 0:
        return 0.0
    return 1.0 / (1.0 + math.exp(-0.02 * (d2 - 80)))


def normalize_financial(total_value_mxn: float) -> float:
    """log10 scale: 1M->0.20, 100M->0.27, 1B->0.30, 10B->0.33, 100B->0.37.
    Ceiling denominator = 30 so that log10(1M)=6 -> 6/30=0.20."""
    if total_value_mxn is None or total_value_mxn <= 0:
        return 0.0
    log_val = math.log10(max(total_value_mxn, 1))
    return min(1.0, log_val / 30.0)


def compute_external_flags_score(
    is_efos: int, is_sfp: int, in_gt: int, shell_score: int = 0
) -> float:
    if in_gt:
        return 1.0
    score = 0.0
    if is_efos:
        score += 0.70
    if is_sfp:
        score += 0.40
    # CENTINELA shell_score boost: high shell indicators from company_registry
    if shell_score >= 4:
        score += 0.20  # strong shell company indicators
    elif shell_score >= 2:
        score += 0.10  # moderate shell indicators
    return min(1.0, score)


def compute_ips(
    risk_norm: float,
    maha_norm: float,
    ensemble_norm: float,
    financial_norm: float,
    ext_flags_score: float,
) -> float:
    """Blind-spot fix: use MAX of risk and mahalanobis, not average."""
    risk_maha = max(risk_norm, maha_norm)
    ips = (
        risk_maha * W_RISK
        + (ensemble_norm or 0.0) * W_ENSEMBLE
        + financial_norm * W_FINANCIAL
        + ext_flags_score * W_EXTERNAL
    )
    return round(min(1.0, ips), 6)


def assign_tier(ips: float) -> int:
    if ips >= TIER1_THRESHOLD:
        return 1
    if ips >= TIER2_THRESHOLD:
        return 2
    if ips >= TIER3_THRESHOLD:
        return 3
    return 4


# ---------------------------------------------------------------------------
# Module 2: Pattern Classifier
# ---------------------------------------------------------------------------

def classify_patterns(vendor_data: dict) -> dict:
    """Return confidence scores for all 7 patterns (P1-P7).

    vendor_data keys used:
        vendor_concentration, total_contracts, direct_award_rate, single_bid_rate,
        years_active, rfc, burst_score, is_efos_definitivo,
        avg_z_price_ratio, industry_mismatch_rate, top_institution_ratio,
        sector_vendor_count, co_bid_rate (optional)
    """
    patterns = {"P1": 0.0, "P2": 0.0, "P3": 0.0, "P4": 0.0,
                "P5": 0.0, "P6": 0.0, "P7": 0.0}

    vc = vendor_data.get("vendor_concentration", 0) or 0
    tc = vendor_data.get("total_contracts", 0) or 0
    da_rate = vendor_data.get("direct_award_rate", 0) or 0
    sb_rate = vendor_data.get("single_bid_rate", 0) or 0
    years = vendor_data.get("years_active", 1) or 1
    rfc = vendor_data.get("rfc")
    burst = vendor_data.get("burst_score", 0) or 0
    is_efos = vendor_data.get("is_efos_definitivo", 0) or 0
    avg_z_price = vendor_data.get("avg_z_price_ratio", 0) or 0
    mismatch = vendor_data.get("industry_mismatch_rate", 0) or 0
    top_inst_ratio = vendor_data.get("top_institution_ratio", 0) or 0
    price_hyp_count = vendor_data.get("price_hypothesis_count", 0) or 0
    co_bid = vendor_data.get("co_bid_rate", 0) or 0

    # ------------------------------------------------------------------
    # P1: Concentrated Monopoly
    # ------------------------------------------------------------------
    if vc > 0.50:
        p1 = 0.80
    elif vc > 0.30:
        p1 = 0.50
    elif vc > 0.15:
        p1 = 0.20
    else:
        p1 = 0.0

    if p1 > 0:
        if top_inst_ratio > 0.70:
            p1 = min(1.0, p1 + 0.15)
        # Use single_bid_rate as win_rate proxy
        if sb_rate > 0.80:
            p1 = min(1.0, p1 + 0.10)

    patterns["P1"] = round(p1, 4)

    # ------------------------------------------------------------------
    # P2: Ghost Company
    # ------------------------------------------------------------------
    if is_efos:
        p2 = 0.90
    else:
        p2 = 0.0
        if tc <= 20 and da_rate > 0.80:
            p2 = 0.40
        if years <= 3:
            p2 = min(1.0, p2 + 0.20)
        if rfc is None:
            p2 = min(1.0, p2 + 0.15)

    patterns["P2"] = round(p2, 4)

    # ------------------------------------------------------------------
    # P3: Single-Use Intermediary (driven by burst_score)
    # ------------------------------------------------------------------
    patterns["P3"] = round(min(1.0, burst), 4)

    # ------------------------------------------------------------------
    # P4: Bid Rigging
    # ------------------------------------------------------------------
    if co_bid > 0.50:
        patterns["P4"] = 0.40
    else:
        patterns["P4"] = 0.0

    # ------------------------------------------------------------------
    # P5: Overpricing
    # ------------------------------------------------------------------
    if avg_z_price > 2.0:
        p5 = 0.50
    elif avg_z_price > 1.5:
        p5 = 0.30
    else:
        p5 = 0.0

    if mismatch > 0.50:
        p5 = min(1.0, p5 + 0.25)
    if price_hyp_count > 3:
        p5 = min(1.0, p5 + 0.15)

    patterns["P5"] = round(p5, 4)

    # ------------------------------------------------------------------
    # P6: Institution Capture
    # ------------------------------------------------------------------
    if top_inst_ratio == 1.0 and tc > 10:
        p6 = 0.80
    elif top_inst_ratio > 0.80 and tc > 10:
        p6 = 0.60
    else:
        p6 = 0.0

    if p6 > 0 and sb_rate > 0.50:
        p6 = min(1.0, p6 + 0.15)

    patterns["P6"] = round(p6, 4)

    # ------------------------------------------------------------------
    # P7: Conflict of Interest (placeholder — Phase 3 media evidence)
    # ------------------------------------------------------------------
    external_flag = vendor_data.get("in_ground_truth", 0) or is_efos
    if external_flag:
        patterns["P7"] = 0.50
    else:
        patterns["P7"] = 0.0

    return patterns


# ---------------------------------------------------------------------------
# Module 3: Intermediary Detection (burst score)
# ---------------------------------------------------------------------------

def compute_burst_score(vendor_id: int, conn: sqlite3.Connection) -> tuple:
    """Goh-Barabasi burstiness B = (sigma - mu) / (sigma + mu) on inter-contract intervals.
    B=1 maximally bursty, B=0 Poisson, B=-1 perfectly periodic.

    Only flags as intermediary if value_per_contract >= 10M MXN
    and activity_span <= 5 years and n_contracts <= 100.
    """
    rows = conn.execute(
        """
        SELECT contract_year, amount_mxn
        FROM contracts
        WHERE vendor_id = ? AND amount_mxn > 0 AND amount_mxn < 100000000000
        ORDER BY contract_year
        """,
        (vendor_id,),
    ).fetchall()

    if len(rows) < 2:
        return 0.0, {}

    years = [r[0] for r in rows if r[0] is not None]
    amounts = [r[1] for r in rows if r[1] is not None and r[1] > 0]

    if not years or not amounts:
        return 0.0, {}

    total_value = sum(amounts)
    n_contracts = len(rows)
    activity_span = max(years) - min(years) + 1

    # Skip if not an intermediary profile: too many contracts or too long active
    if activity_span > 5 or n_contracts > 100:
        return 0.0, {}

    # Minimum value threshold: only flag significant intermediaries
    value_per_contract = total_value / n_contracts
    if value_per_contract < 10_000_000:
        return 0.0, {}

    # Inter-arrival times (years between consecutive contracts)
    inter_arrivals = [years[i + 1] - years[i] for i in range(len(years) - 1)]
    # Floor at 0.01 to avoid zero intervals
    adjusted = [max(0.01, ia) for ia in inter_arrivals]

    if len(adjusted) < 2:
        burstiness = 0.5 if activity_span <= 1 else 0.0
    else:
        mu = statistics.mean(adjusted)
        sigma = statistics.stdev(adjusted)
        if mu + sigma < 0.001:
            burstiness = 0.0
        else:
            b = (sigma - mu) / (sigma + mu)
            # Normalize from [-1, 1] to [0, 1]
            burstiness = (b + 1) / 2

    # Value concentration: fraction of total value in peak year
    year_values: dict = defaultdict(float)
    for r in rows:
        if r[0] is not None and r[1] is not None:
            year_values[r[0]] += r[1]
    peak_share = max(year_values.values()) / total_value if total_value > 0 else 0

    # Disappearance: last contract >= 2 years ago
    current_year = 2025
    is_disappeared = 1 if max(years) <= current_year - 2 else 0

    # Short window score
    short_window = 1.0 if activity_span <= 1 else (0.5 if activity_span <= 2 else 0.1)

    # Contracts per year intensity
    intensity = min(1.0, n_contracts / (activity_span * 5))

    burst_score = (
        0.25 * burstiness
        + 0.25 * peak_share
        + 0.20 * is_disappeared
        + 0.15 * intensity
        + 0.15 * short_window
    )

    detail = {
        "activity_span_years": activity_span,
        "n_contracts": n_contracts,
        "value_per_contract": round(value_per_contract, 0),
        "total_value": round(total_value, 0),
        "peak_share": round(peak_share, 3),
        "burstiness": round(burstiness, 3),
        "is_disappeared": is_disappeared,
        "intensity": round(intensity, 3),
    }

    return round(min(1.0, burst_score), 4), detail


# ---------------------------------------------------------------------------
# Module 5: External Cross-Reference Engine
# ---------------------------------------------------------------------------

def load_external_crossref(conn: sqlite3.Connection) -> dict:
    """Batch load external flags for all vendors.

    Returns {vendor_id: {is_efos, efos_rfc, is_sfp, sfp_type, in_gt,
                         shell_score, rfc_age_years}}.

    Uses sat_efos_vendors (stage='definitivo'), sfp_sanctions,
    and company_registry (CENTINELA enrichment).
    """
    # Verify column names via PRAGMA
    efos_cols = [r[1] for r in conn.execute("PRAGMA table_info(sat_efos_vendors)").fetchall()]
    sfp_cols  = [r[1] for r in conn.execute("PRAGMA table_info(sfp_sanctions)").fetchall()]

    # Determine correct column names
    efos_rfc_col  = "rfc" if "rfc" in efos_cols else efos_cols[1]
    sfp_rfc_col   = "rfc" if "rfc" in sfp_cols else sfp_cols[1]
    sfp_type_col  = "sanction_type" if "sanction_type" in sfp_cols else sfp_cols[3]

    rows = conn.execute(
        f"""
        SELECT
            v.id            AS vendor_id,
            v.rfc           AS vendor_rfc,
            CASE WHEN e.{efos_rfc_col} IS NOT NULL THEN 1 ELSE 0 END AS is_efos,
            e.{efos_rfc_col} AS efos_rfc,
            CASE WHEN s.{sfp_rfc_col} IS NOT NULL THEN 1 ELSE 0 END AS is_sfp,
            s.{sfp_type_col} AS sfp_type,
            CASE WHEN g.vendor_id IS NOT NULL THEN 1 ELSE 0 END AS in_gt
        FROM vendors v
        LEFT JOIN sat_efos_vendors e
               ON v.rfc = e.{efos_rfc_col}
              AND v.rfc IS NOT NULL
              AND e.stage = 'definitivo'
        LEFT JOIN sfp_sanctions s
               ON v.rfc = s.{sfp_rfc_col}
              AND v.rfc IS NOT NULL
        LEFT JOIN ground_truth_vendors g
               ON v.id = g.vendor_id
        """
    ).fetchall()

    result: dict = {}
    for r in rows:
        vid = r[0]
        result[vid] = {
            "is_efos":   int(r[2]),
            "efos_rfc":  r[3],
            "is_sfp":    int(r[4]),
            "sfp_type":  r[5],
            "in_gt":     int(r[6]),
            "shell_score": 0,
            "rfc_age_years": None,
        }

    # Enrich with CENTINELA company_registry data (shell_score, RFC age)
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    if "company_registry" in tables:
        cr_rows = conn.execute(
            "SELECT vendor_id, shell_score, rfc_age_years FROM company_registry"
        ).fetchall()
        for cr in cr_rows:
            vid = cr[0]
            if vid in result:
                result[vid]["shell_score"] = cr[1] or 0
                result[vid]["rfc_age_years"] = cr[2]
        logger.info("  CENTINELA company_registry: enriched %d vendors with shell_score/RFC age", len(cr_rows))

    return result


# ---------------------------------------------------------------------------
# Helper loaders
# ---------------------------------------------------------------------------

def load_vendor_mahalanobis(conn: sqlite3.Connection) -> dict:
    """Returns {vendor_id: max_mahalanobis_distance}."""
    rows = conn.execute(
        """
        SELECT vendor_id, MAX(mahalanobis_distance) AS max_d2
        FROM contracts
        WHERE mahalanobis_distance IS NOT NULL AND mahalanobis_distance > 0
        GROUP BY vendor_id
        """
    ).fetchall()
    return {r[0]: r[1] for r in rows}


def load_vendor_ensemble(conn: sqlite3.Connection) -> dict:
    """Returns {vendor_id: ensemble risk score (0-1)}.

    Prefers vendor_shap_v52.risk_score (per-vendor aggregate, fast).
    Falls back to contract_anomaly_scores ensemble_v52 if shap table absent.
    """
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}

    # Fast path: vendor_shap_v52 stores per-vendor risk scores already
    if "vendor_shap_v52" in tables:
        rows = conn.execute(
            """
            SELECT vendor_id, MAX(risk_score) AS max_risk
            FROM vendor_shap_v52
            WHERE risk_score IS NOT NULL
            GROUP BY vendor_id
            """
        ).fetchall()
        if rows:
            return {r[0]: r[1] for r in rows}

    # Slow fallback: aggregate contract_anomaly_scores (only if shap table empty)
    if "contract_anomaly_scores" not in tables:
        return {}

    rows = conn.execute(
        """
        SELECT c.vendor_id, MAX(cas.anomaly_score) AS max_ensemble
        FROM contract_anomaly_scores cas
        JOIN contracts c ON cas.contract_id = c.id
        WHERE cas.model_name = 'ensemble_v52'
          AND cas.anomaly_score IS NOT NULL
        GROUP BY c.vendor_id
        """
    ).fetchall()
    return {r[0]: r[1] for r in rows}


def load_sector_vendor_counts(conn: sqlite3.Connection) -> dict:
    """Returns {sector_id: distinct_vendor_count}."""
    rows = conn.execute(
        "SELECT sector_id, COUNT(DISTINCT vendor_id) AS cnt FROM contracts GROUP BY sector_id"
    ).fetchall()
    return {r[0]: r[1] for r in rows}


# ---------------------------------------------------------------------------
# Module 6: False Positive Screening
# ---------------------------------------------------------------------------

PATENT_EXCEPTION_KEYWORDS = [
    "gilead", "pfizer", "microsoft", "oracle", "sap", "cisco", "adobe",
    "autodesk", "symantec", "vmware", "ibm", "hewlett", "motorola",
]


def screen_false_positives(
    vendor_name: str,
    vendor_data: dict,
    conn,  # may be None in tests
) -> dict:
    fp_patent = fp_data_error = fp_structural = False
    penalty = 0.0

    # FP1: Patent / regulated monopoly exception
    name_lower = (vendor_name or "").lower()
    if any(kw in name_lower for kw in PATENT_EXCEPTION_KEYWORDS):
        fp_patent = True
        penalty += 0.20

    # FP2: Data error — single giant outlier contract
    max_amt = vendor_data.get("max_contract_amount", 0) or 0
    avg_amt = vendor_data.get("avg_contract_amount", 0) or 0
    if avg_amt > 0 and max_amt > avg_amt * 100 and max_amt > 1_000_000_000:
        fp_data_error = True
        penalty += 0.25

    # FP3: Structural monopoly (sector has very few vendors)
    sector_vendor_count = vendor_data.get("sector_vendor_count", 999) or 999
    if sector_vendor_count <= 10:
        fp_structural = True
        penalty += 0.15

    return {
        "fp_patent":      fp_patent,
        "fp_data_error":  fp_data_error,
        "fp_structural":  fp_structural,
        "penalty":        min(0.40, penalty),
    }



# ---------------------------------------------------------------------------
# Module 4 support: Institution capture features
# ---------------------------------------------------------------------------

def load_vendor_institution_features(conn: sqlite3.Connection, vendor_ids: list) -> dict:
    """Returns {vendor_id: {top_institution_ratio, institution_count}}."""
    if not vendor_ids:
        return {}

    # Use a temp table to avoid SQLite's SQL variable limit (~32766)
    conn.execute("CREATE TEMP TABLE IF NOT EXISTS _aria_vids (vendor_id INTEGER PRIMARY KEY)")
    conn.execute("DELETE FROM _aria_vids")
    conn.executemany("INSERT OR IGNORE INTO _aria_vids VALUES (?)", [(v,) for v in vendor_ids])

    rows = conn.execute("""
        SELECT
            c.vendor_id,
            c.institution_id,
            COUNT(*) as cnt,
            SUM(c.amount_mxn) as val
        FROM contracts c
        INNER JOIN _aria_vids t ON c.vendor_id = t.vendor_id
        WHERE c.amount_mxn > 0
        GROUP BY c.vendor_id, c.institution_id
    """).fetchall()

    vendor_institutions: dict = defaultdict(list)
    for r in rows:
        vendor_institutions[r[0]].append((r[1], r[2], r[3]))

    result = {}
    for vid, inst_list in vendor_institutions.items():
        total_cnt = sum(x[1] for x in inst_list)
        if total_cnt == 0:
            continue
        top = max(inst_list, key=lambda x: x[1])
        top_ratio = top[1] / total_cnt
        result[vid] = {
            "top_institution_ratio": round(top_ratio, 4),
            "institution_count": len(inst_list),
        }
    return result


# ---------------------------------------------------------------------------
# Module 4 support: Z-score feature loading
# ---------------------------------------------------------------------------

def load_vendor_z_features(conn: sqlite3.Connection, vendor_ids: list) -> dict:
    """Returns {vendor_id: {avg_z_price_ratio, avg_z_industry_mismatch, avg_co_bid_rate}}."""
    if not vendor_ids:
        return {}
    # Use temp table (already created by load_vendor_institution_features, or create here)
    conn.execute("CREATE TEMP TABLE IF NOT EXISTS _aria_vids (vendor_id INTEGER PRIMARY KEY)")
    # Table already populated by load_vendor_institution_features; reuse it
    rows = conn.execute("""
        SELECT c.vendor_id,
               AVG(czf.z_price_ratio) as avg_z_price_ratio,
               AVG(czf.z_industry_mismatch) as avg_z_industry_mismatch,
               AVG(czf.z_co_bid_rate) as avg_co_bid_rate
        FROM contracts c
        JOIN contract_z_features czf ON c.id = czf.contract_id
        INNER JOIN _aria_vids t ON c.vendor_id = t.vendor_id
        GROUP BY c.vendor_id
    """).fetchall()
    return {
        r[0]: {
            "avg_z_price_ratio": r[1] or 0,
            "avg_z_industry_mismatch": r[2] or 0,
            "avg_co_bid_rate": r[3] or 0,
        }
        for r in rows
    }



# ---------------------------------------------------------------------------
# Helper: Get primary sector for vendor
# ---------------------------------------------------------------------------

def get_primary_sector(vendor_id: int, conn: sqlite3.Connection) -> tuple:
    """
    Returns (primary_sector_id, primary_sector_name).
    Finds the sector with the most contracts for this vendor.
    If no contracts found, returns (None, None).
    """
    row = conn.execute("""
        SELECT sector_id, COUNT(*) as cnt
        FROM contracts
        WHERE vendor_id = ?
        GROUP BY sector_id
        ORDER BY cnt DESC
        LIMIT 1
    """, (vendor_id,)).fetchone()
    
    if row:
        sector_id = row[0]
        sector_name = SECTOR_MAP.get(sector_id, "otros")
        return sector_id, sector_name
    
    return None, None


# ---------------------------------------------------------------------------
# Module 8: Ground Truth Auto-Update
# ---------------------------------------------------------------------------

def run_gt_auto_update(
    results: list,
    conn,
    run_id: str,
    dry_run: bool = False,
) -> tuple:
    """Module 8: Automatically insert high-confidence GT matches.
    Returns (auto_inserts, flags).

    Rules:
    1. RFC in EFOS AND >= 5 contracts AND not already in GT -> AUTO-INSERT (direct, 1.0)
    2. RFC in EFOS AND < 5 contracts -> FLAG for review
    3. RFC in SFP AND risk_score >= 0.30 AND >= 3 contracts -> AUTO-INSERT (circumstantial, 0.85)
    4. RFC in SFP AND risk_score < 0.30 -> FLAG for review
    5. mahalanobis_norm >= 0.99 AND total_value >= 1B MXN AND NOT in GT -> FLAG
    6. IPS >= 0.80 AND pattern_confidence >= 0.70 AND NOT in GT AND NOT FP -> FLAG
    """
    auto_inserts = 0
    flags = 0
    MAX_AUTO_INSERTS = 100  # safety limit per run

    for r in results:
        if r["in_ground_truth"]:
            continue  # already known

        action = None
        confidence_level = None
        match_confidence = 0.0
        source = None
        evidence = {}

        # Rule 1 & 2: EFOS
        if r["is_efos_definitivo"]:
            if r["total_contracts"] >= 5:
                action = "auto_insert"
                confidence_level = "direct"
                match_confidence = 1.0
                source = "efos_rfc"
                evidence = {"efos_rfc": r.get("efos_rfc"), "total_contracts": r["total_contracts"]}
            else:
                action = "flag_review"
                confidence_level = "direct"
                match_confidence = 0.90
                source = "efos_rfc"
                evidence = {"efos_rfc": r.get("efos_rfc"), "total_contracts": r["total_contracts"]}

        # Rule 3 & 4: SFP sanctions
        elif r["is_sfp_sanctioned"]:
            if r["avg_risk_score"] >= 0.30 and r["total_contracts"] >= 3:
                action = "auto_insert"
                confidence_level = "circumstantial"
                match_confidence = 0.85
                source = "sfp_rfc"
                evidence = {"sfp_type": r.get("sfp_sanction_type"), "risk_score": r["avg_risk_score"]}
            else:
                action = "flag_review"
                confidence_level = "circumstantial"
                match_confidence = 0.60
                source = "sfp_rfc"
                evidence = {"sfp_type": r.get("sfp_sanction_type")}

        # Rule 5: extreme Mahalanobis + scale
        elif r["mahalanobis_norm"] >= 0.99 and r["total_value_mxn"] >= 1_000_000_000:
            action = "flag_review"
            confidence_level = "circumstantial"
            match_confidence = 0.50
            source = "mahalanobis_scale"
            evidence = {"mahalanobis_norm": r["mahalanobis_norm"], "total_value_mxn": r["total_value_mxn"]}

        # Rule 6: high IPS + pattern confidence
        elif (r["ips_final"] >= 0.80 and r["pattern_confidence"] >= 0.70
              and not r["fp_patent_exception"] and not r["fp_data_error"]):
            action = "flag_review"
            confidence_level = "circumstantial"
            match_confidence = 0.40
            source = "ips_pattern"
            evidence = {
                "ips_final": r["ips_final"],
                "pattern": r["primary_pattern"],
                "pattern_confidence": r["pattern_confidence"],
            }

        if action is None:
            continue

        if action == "auto_insert" and auto_inserts >= MAX_AUTO_INSERTS:
            action = "flag_review"  # demote to flag if limit hit

        if not dry_run and conn is not None:
            conn.execute("""
                INSERT OR IGNORE INTO aria_gt_updates
                (vendor_id, vendor_name, action, confidence_level, match_confidence,
                 source, evidence_detail, aria_run_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (r["vendor_id"], r["vendor_name"], action, confidence_level,
                  match_confidence, source, json.dumps(evidence), run_id))

        if action == "auto_insert":
            auto_inserts += 1
        else:
            flags += 1

    if not dry_run and conn is not None:
        conn.commit()

    return auto_inserts, flags

# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def check_centinela_freshness(conn: sqlite3.Connection) -> None:
    """Warn if external registries are stale (CENTINELA integration)."""
    try:
        from scripts.centinela import get_registry_status
        statuses = get_registry_status(conn)
        stale = [s for s in statuses if s["is_stale"] and s["records"] > 0]
        if stale:
            names = ", ".join(s["name"] for s in stale)
            logger.warning(
                "CENTINELA: %d stale registries (%s). "
                "Run `python -m scripts.centinela --stale-only` to refresh.",
                len(stale), names,
            )
        never_loaded = [s for s in statuses if s["records"] == 0]
        if never_loaded:
            names = ", ".join(s["name"] for s in never_loaded)
            logger.info("CENTINELA: %d registries never loaded (%s).", len(never_loaded), names)
    except Exception as e:
        logger.debug("CENTINELA freshness check skipped: %s", e)


def run_pipeline(dry_run: bool = False, limit: int = None) -> tuple:
    run_id = str(uuid.uuid4())[:8]
    logger.info("ARIA run %s starting (dry_run=%s, limit=%s)...", run_id, dry_run, limit)

    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")

    try:
        # -- CENTINELA freshness check ---------------------------------------
        check_centinela_freshness(conn)

        # -- Record run start ------------------------------------------------
        if not dry_run:
            conn.execute(
                "INSERT OR REPLACE INTO aria_runs (id, started_at, aria_version) VALUES (?, ?, ?)",
                (run_id, datetime.now().isoformat(), ARIA_VERSION),
            )
            conn.commit()

        # -- Load batch data -------------------------------------------------
        logger.info("  Loading external cross-reference data...")
        ext_data = load_external_crossref(conn)
        logger.info("  External cross-ref: %d vendor matches loaded", len(ext_data))

        logger.info("  Loading Mahalanobis distances...")
        maha_map = load_vendor_mahalanobis(conn)
        logger.info("  Mahalanobis map: %d vendors", len(maha_map))

        logger.info("  Loading ensemble anomaly scores...")
        ensemble_map = load_vendor_ensemble(conn)
        logger.info("  Ensemble map: %d vendors", len(ensemble_map))

        logger.info("  Loading sector vendor counts...")
        sector_counts = load_sector_vendor_counts(conn)

        # -- Load vendors from vendor_stats ----------------------------------
        query = """
            SELECT
                v.id,
                v.name,
                v.rfc,
                vs.total_contracts,
                vs.total_value_mxn    AS total_value,
                vs.avg_risk_score,
                vs.max_mahalanobis    AS max_risk_score,
                vs.direct_award_pct   AS direct_award_rate,
                vs.single_bid_pct     AS single_bid_rate,
                vs.primary_sector_id  AS sector_id,
                vs.first_contract_year,
                vs.last_contract_year
            FROM vendors v
            JOIN vendor_stats vs ON v.id = vs.vendor_id
            WHERE vs.total_contracts >= 1
        """
        if limit:
            query += f" ORDER BY vs.total_value_mxn DESC LIMIT {limit}"

        vendors = conn.execute(query).fetchall()
        logger.info("  Processing %d vendors...", len(vendors))

        # -- Load institution features per vendor ----------------------------
        vendor_ids = [v["id"] for v in vendors]
        logger.info("  Loading institution features...")
        institution_features = load_vendor_institution_features(conn, vendor_ids)
        logger.info("  Institution features: %d vendors", len(institution_features))

        # -- Load z-score features per vendor (if available) -----------------
        z_count = conn.execute("SELECT COUNT(*) FROM contract_z_features").fetchone()[0]
        if z_count > 0 and limit and limit <= 5000:
            logger.info("  Loading z-score features...")
            z_features = load_vendor_z_features(conn, vendor_ids)
            logger.info("  Z-features loaded for %d vendors", len(z_features))
        else:
            z_features = {}
            if z_count == 0:
                logger.warning("  contract_z_features is empty — skipping z-feature enrichment")

        results = []
        tier_counts = [0, 0, 0, 0]

        for v in vendors:
            vid = v["id"]
            vname = v["name"]

            # Burst / intermediary score
            burst_score, burst_detail = compute_burst_score(vid, conn)

            # External flags
            ext = ext_data.get(vid, {})
            is_efos = ext.get("is_efos", 0)
            is_sfp  = ext.get("is_sfp", 0)
            in_gt   = ext.get("in_gt", 0)

            # Normalise signals
            avg_risk   = v["avg_risk_score"] or 0.0
            max_maha   = maha_map.get(vid, 0) or 0.0
            ensemble   = ensemble_map.get(vid, 0) or 0.0
            total_val  = v["total_value"] or 0.0
            total_contracts = v["total_contracts"] or 0

            risk_norm     = normalize_risk_score(avg_risk)
            maha_norm     = normalize_mahalanobis(max_maha)
            ensemble_norm = min(1.0, ensemble)
            financial_norm = normalize_financial(total_val)
            shell_score   = ext.get("shell_score", 0)
            ext_score     = compute_external_flags_score(is_efos, is_sfp, in_gt, shell_score)

            ips_raw = compute_ips(risk_norm, maha_norm, ensemble_norm, financial_norm, ext_score)

            # Years active
            first_yr = v["first_contract_year"] or 2025
            last_yr  = v["last_contract_year"] or 2025
            years_active = max(1, (last_yr - first_yr) + 1)

            # Average contract value for FP screening
            avg_contract_amt = total_val / max(total_contracts, 1)

            # Pattern classification
            # Institution and z-score features for this vendor
            inst_feat = institution_features.get(vid, {})
            zf = z_features.get(vid, {})

            vendor_data_dict = {
                "vendor_concentration": 0.0,  # not in vendor_stats — future
                "total_contracts":      total_contracts,
                "direct_award_rate":    (v["direct_award_rate"] or 0) / 100.0,
                "single_bid_rate":      (v["single_bid_rate"] or 0) / 100.0,
                "years_active":         years_active,
                "rfc":                  v["rfc"],
                "burst_score":          burst_score,
                "is_efos_definitivo":   is_efos,
                "in_ground_truth":      in_gt,
                "avg_z_price_ratio":    zf.get("avg_z_price_ratio", 0),
                "industry_mismatch_rate": max(0, zf.get("avg_z_industry_mismatch", 0)),
                "top_institution_ratio":  inst_feat.get("top_institution_ratio", 0),
                "sector_vendor_count":  sector_counts.get(v["sector_id"], 999),
                "max_contract_amount":  v["max_risk_score"] or 0.0,
                "avg_contract_amount":  avg_contract_amt,
            }

            patterns = classify_patterns(vendor_data_dict)
            # Primary = highest-confidence pattern >= 0.30
            qualifying = {p: s for p, s in patterns.items() if s >= 0.30}
            primary = max(qualifying, key=qualifying.get) if qualifying else None
            primary_conf = patterns.get(primary, 0.0) if primary else 0.0

            # False positive screening
            fp = screen_false_positives(vname, vendor_data_dict, conn)
            primary_sector_id, primary_sector_name = get_primary_sector(vid, conn)
            ips_final = round(max(0.0, ips_raw - fp["penalty"]), 6)
            tier = assign_tier(ips_final)
            tier_counts[tier - 1] += 1

            results.append({
                "vendor_id":              vid,
                "vendor_name":            vname,
                "aria_run_id":            run_id,
                "risk_score_norm":        risk_norm,
                "mahalanobis_norm":       maha_norm,
                "ensemble_norm":          ensemble_norm,
                "financial_scale_norm":   financial_norm,
                "external_flags_score":   ext_score,
                "ips_raw":                ips_raw,
                "ips_final":              ips_final,
                "ips_tier":               tier,
                "primary_pattern":        primary,
                "pattern_confidence":     primary_conf,
                "pattern_confidences":    json.dumps(patterns),
                "burst_score":            burst_score,
                "activity_span_days":     burst_detail.get("activity_span_years", 0) * 365,
                "value_per_contract":     burst_detail.get("value_per_contract", 0),
                "is_disappeared":         burst_detail.get("is_disappeared", 0),
                "is_efos_definitivo":     is_efos,
                "is_sfp_sanctioned":      is_sfp,
                "in_ground_truth":        in_gt,
                "efos_rfc":               ext.get("efos_rfc"),
                "sfp_sanction_type":      ext.get("sfp_type"),
                "fp_patent_exception":    int(fp["fp_patent"]),
                "fp_data_error":          int(fp["fp_data_error"]),
                "fp_structural_monopoly": int(fp["fp_structural"]),
                "fp_penalty":             fp["penalty"],
                "total_contracts":        total_contracts,
                "total_value_mxn":        total_val,
                "avg_risk_score":         avg_risk,
                "max_risk_score":         v["max_risk_score"] or 0.0,
                "primary_sector_id":      primary_sector_id,
                "primary_sector_name":    primary_sector_name,
                "years_active":           years_active,
                "direct_award_rate":      (v["direct_award_rate"] or 0) / 100.0,
                "single_bid_rate":        (v["single_bid_rate"] or 0) / 100.0,
                "top_institution_ratio":  inst_feat.get("top_institution_ratio", 0),
            })

        logger.info(
            "  Tiers: T1=%d, T2=%d, T3=%d, T4=%d",
            tier_counts[0], tier_counts[1], tier_counts[2], tier_counts[3],
        )

        # -- Module 8: GT auto-update ----------------------------------------
        auto_inserts, gt_flags = run_gt_auto_update(results, conn, run_id, dry_run)
        logger.info("  GT auto-update: %d auto-inserts, %d flagged", auto_inserts, gt_flags)

        # -- Persist results -------------------------------------------------
        if not dry_run:
            # Preserve manual memos and review status before wiping
            preserved = {}
            for row in conn.execute(
                "SELECT vendor_id, memo_text, review_status, memo_generated_at, "
                "reviewer_name, reviewer_notes, reviewed_at FROM aria_queue "
                "WHERE memo_text IS NOT NULL OR review_status NOT IN ('pending', '')"
            ).fetchall():
                preserved[row[0]] = row[1:]

            # Replace all previous aria_queue rows with current run
            conn.execute("DELETE FROM aria_queue")

            for r in results:
                cols = ", ".join(r.keys())
                placeholders = ", ".join("?" * len(r))
                conn.execute(
                    f"INSERT OR REPLACE INTO aria_queue ({cols}) VALUES ({placeholders})",
                    list(r.values()),
                )

            # Restore preserved memos
            if preserved:
                for vid, (memo, status, memo_at, rname, rnotes, rat) in preserved.items():
                    conn.execute(
                        "UPDATE aria_queue SET memo_text=?, review_status=?, "
                        "memo_generated_at=?, reviewer_name=?, reviewer_notes=?, reviewed_at=? "
                        "WHERE vendor_id=?",
                        (memo, status, memo_at, rname, rnotes, rat, vid),
                    )
                logger.info("  Restored %d preserved memos/review statuses.", len(preserved))

            conn.execute(
                """
                UPDATE aria_runs SET
                    completed_at = ?,
                    status = 'completed',
                    vendors_processed = ?,
                    tier1_count = ?,
                    tier2_count = ?,
                    tier3_count = ?,
                    tier4_count = ?,
                    gt_auto_inserts = ?,
                    gt_flags = ?
                WHERE id = ?
                """,
                (
                    datetime.now().isoformat(),
                    len(results),
                    tier_counts[0],
                    tier_counts[1],
                    tier_counts[2],
                    tier_counts[3],
                    auto_inserts,
                    gt_flags,
                    run_id,
                ),
            )
            conn.commit()
            logger.info("  Saved %d rows to aria_queue.", len(results))
        else:
            logger.info("  DRY RUN — %d rows computed, not saved.", len(results))

        # -- Print top 10 Tier 1 --------------------------------------------
        tier1 = sorted(
            [r for r in results if r["ips_tier"] == 1],
            key=lambda x: -x["ips_final"],
        )[:10]

        print("\n=== TOP 10 TIER 1 VENDORS ===")
        for r in tier1:
            efos_flag = " [EFOS]" if r["is_efos_definitivo"] else ""
            sfp_flag  = " [SFP]"  if r["is_sfp_sanctioned"] else ""
            gt_flag   = " [GT]"   if r["in_ground_truth"] else ""
            pat       = r["primary_pattern"] or "---"
            print(
                f"  {r['vendor_name'][:40]:<40}  "
                f"IPS={r['ips_final']:.3f}  {pat}{efos_flag}{sfp_flag}{gt_flag}"
            )

        return run_id, tier_counts

    except Exception:
        if not dry_run:
            try:
                conn.execute(
                    "UPDATE aria_runs SET status='failed', error_message=? WHERE id=?",
                    ("See logs", run_id),
                )
                conn.commit()
            except Exception:
                pass
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ARIA Phase 1 Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Compute but do not save")
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Process only top N vendors by total value"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    run_id, tiers = run_pipeline(dry_run=args.dry_run, limit=args.limit)
    print(
        f"\nRun {run_id} complete. "
        f"Tier distribution: T1={tiers[0]}, T2={tiers[1]}, T3={tiers[2]}, T4={tiers[3]}"
    )
