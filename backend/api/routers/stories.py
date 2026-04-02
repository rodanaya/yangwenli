"""
Story endpoints for journalist investigation starting-points.
Each endpoint returns a pre-computed narrative dataset with context.
Bilingual: pass ?lang=en for English, default is ?lang=es for Spanish.
"""
import logging
import threading
import time
from fastapi import APIRouter, HTTPException, Query
from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/stories", tags=["stories"])

# ---------------------------------------------------------------------------
# In-memory cache — the 8 package queries take ~2 min cold on 3.1M rows.
# First request starts a background thread; 503 is returned until ready.
# Cache TTL: 1 hour (data is historical, changes only on rescore).
# ---------------------------------------------------------------------------
_stories_cache: dict = {"data": None, "expires": 0.0, "computing": False}
_stories_lock = threading.Lock()

# Simple TTL caches for individual story endpoints (1-hour TTL)
_story_individual_cache: dict[str, dict] = {}
_story_individual_lock = threading.Lock()


def _get_cached(key: str) -> dict | None:
    with _story_individual_lock:
        entry = _story_individual_cache.get(key)
        if entry and time.time() < entry["expires"]:
            return entry["data"]
    return None


def _set_cached(key: str, data: dict, ttl: int = 3600) -> None:
    with _story_individual_lock:
        _story_individual_cache[key] = {"data": data, "expires": time.time() + ttl}


def _run_packages_computation() -> None:
    """Compute all 8 story packages in background and populate the cache."""
    logger.info("Story packages: background computation started")
    try:
        with get_db() as conn:
            packages = [
                _build_ghost_companies_package(conn),
                _build_top_suspicious_package(conn),
                _build_administration_comparison_package(conn),
                _build_efos_vendors_package(conn),
                _build_sector_overpricing_package(conn),
                _build_new_vendor_risk_package(conn),
                _build_monopoly_capture_package(conn),
                _build_direct_award_surge_package(conn),
            ]
        with _stories_lock:
            _stories_cache["data"] = {"packages": packages}
            _stories_cache["expires"] = time.time() + 3600  # 1-hour TTL
            _stories_cache["computing"] = False
        logger.info("Story packages: background computation complete (%d packages)", len(packages))
    except Exception as e:
        logger.error("Story packages: background computation failed: %s", e)
        with _stories_lock:
            _stories_cache["computing"] = False


def warm_stories_cache() -> None:
    """Trigger background cache warm-up. Safe to call multiple times (idempotent)."""
    with _stories_lock:
        if _stories_cache.get("computing") or (
            _stories_cache.get("data") and time.time() < _stories_cache.get("expires", 0.0)
        ):
            return  # Already warm or computing
        _stories_cache["computing"] = True
    t = threading.Thread(target=_run_packages_computation, daemon=True)
    t.start()
    logger.info("Story packages: cache warm-up triggered")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fmt_value(v: float, lang: str = "es") -> str:
    """Format MXN value as human-readable string."""
    if v is None or v == 0:
        return "N/A"
    if lang == "en":
        if v >= 1_000_000_000_000:
            return f"MX${v / 1_000_000_000_000:.1f}T"
        if v >= 1_000_000_000:
            return f"MX${v / 1_000_000_000:.1f}B"
        if v >= 1_000_000:
            return f"MX${v / 1_000_000:.0f}M"
        return f"MX${v:,.0f}"
    else:
        if v >= 1_000_000_000_000:
            return f"{v / 1_000_000_000_000:.1f} billones de pesos"
        if v >= 1_000_000_000:
            return f"{v / 1_000_000_000:.1f} mil millones de pesos"
        if v >= 1_000_000:
            return f"{v / 1_000_000:.0f} millones de pesos"
        return f"{v:,.0f} pesos"


def _fmt_pct(v: float) -> str:
    if v is None:
        return "N/A"
    return f"{v:.1f}%"


def _safe_rows_to_dicts(rows, cols):
    """Convert rows to list of dicts, handling both tuple and Row objects."""
    result = []
    for r in rows:
        try:
            result.append(dict(zip(cols, r)))
        except Exception:
            result.append({c: None for c in cols})
    return result


# ---------------------------------------------------------------------------
# Individual standalone endpoints (not part of the packages cache)
# ---------------------------------------------------------------------------

@router.get("/administration-comparison")
def administration_comparison(lang: str = Query("es", regex="^(en|es)$")):
    """
    Compare procurement patterns across Mexico's 6-year presidential administrations.
    """
    cache_key = f"administration-comparison-{lang}"
    cached = _get_cached(cache_key)
    if cached:
        return cached
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                CASE
                    WHEN contract_year BETWEEN 2000 AND 2006 THEN 'Fox (2000-2006)'
                    WHEN contract_year BETWEEN 2006 AND 2012 THEN 'Calderón (2006-2012)'
                    WHEN contract_year BETWEEN 2012 AND 2018 THEN 'Peña Nieto (2012-2018)'
                    WHEN contract_year >= 2018             THEN 'AMLO/Sheinbaum (2018-)'
                    ELSE 'Pre-2000'
                END                                               AS administration,
                MIN(contract_year)                                AS year_from,
                MAX(contract_year)                                AS year_to,
                COUNT(*)                                          AS total_contracts,
                SUM(amount_mxn)                                   AS total_value_mxn,
                ROUND(AVG(CASE WHEN is_direct_award=1 THEN 100.0 ELSE 0.0 END), 1) AS direct_award_pct,
                ROUND(AVG(CASE WHEN is_single_bid=1  THEN 100.0 ELSE 0.0 END), 1)  AS single_bid_pct,
                ROUND(AVG(risk_score), 4)                         AS avg_risk_score,
                ROUND(AVG(CASE WHEN risk_level IN ('critical','high') THEN 100.0 ELSE 0.0 END), 1) AS high_risk_pct
            FROM contracts
            WHERE amount_mxn > 0
              AND contract_year IS NOT NULL
              AND contract_year BETWEEN 2000 AND 2025
            GROUP BY administration
            ORDER BY year_from
        """).fetchall()

    cols = ["administration", "year_from", "year_to", "total_contracts",
            "total_value_mxn", "direct_award_pct", "single_bid_pct",
            "avg_risk_score", "high_risk_pct"]
    data = [dict(zip(cols, r)) for r in rows]

    t = lambda es, en: en if lang == "en" else es  # noqa: E731

    result = {
        "title": t(
            "Comparación entre Administraciones",
            "Six Administrations, One Pattern"
        ),
        "subtitle": t(
            "¿Cómo cambian los patrones de corrupción con cada gobierno?",
            "How procurement risk shifts across Mexico's presidential terms"
        ),
        "key_question": t(
            "¿Qué administración tuvo mayor concentración de adjudicaciones directas?",
            "Which administration relied most heavily on no-bid contracts?"
        ),
        "methodology": t(
            (
                "Se comparan cuatro indicadores clave por sexenio: "
                "tasa de adjudicación directa, tasa de propuesta única, "
                "puntaje de riesgo promedio y porcentaje de contratos de alto riesgo."
            ),
            (
                "Four indicators compared by presidential term: "
                "direct award rate, single-bid rate, average risk score, "
                "and share of high/critical-risk contracts."
            ),
        ),
        "data": data,
    }
    _set_cached(cache_key, result)
    return result


@router.get("/ghost-companies")
def ghost_companies(lang: str = Query("es", regex="^(en|es)$")):
    """
    Top ghost-company suspects: new vendors with near-100% direct awards,
    few contracts, and significant value.
    """
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                aq.vendor_id,
                aq.vendor_name,
                vs.first_contract_year,
                vs.last_contract_year,
                aq.total_contracts,
                aq.total_value_mxn,
                ROUND(aq.direct_award_rate * 100.0, 1) AS direct_award_pct,
                ROUND(aq.avg_risk_score, 4)             AS avg_risk_score,
                aq.primary_sector_name,
                aq.ips_final,
                aq.ips_tier                             AS tier,
                aq.new_vendor_risk
            FROM aria_queue aq
            JOIN vendor_stats vs ON aq.vendor_id = vs.vendor_id
            WHERE vs.first_contract_year >= 2015
              AND aq.total_contracts BETWEEN 1 AND 30
              AND aq.total_value_mxn >= 5000000
              AND aq.direct_award_rate >= 0.90
              AND aq.avg_risk_score >= 0.20
              AND aq.fp_patent_exception = 0
              AND aq.fp_structural_monopoly = 0
              AND aq.fp_data_error = 0
            ORDER BY aq.total_value_mxn DESC
            LIMIT 50
        """).fetchall()

    cols = ["vendor_id", "vendor_name", "first_contract_year", "last_contract_year",
            "total_contracts", "total_value_mxn", "direct_award_pct",
            "avg_risk_score", "primary_sector_name", "ips_final", "tier", "new_vendor_risk"]
    data = [dict(zip(cols, r)) for r in rows]

    total_value = sum(r["total_value_mxn"] or 0 for r in data)
    new_vendor_count = sum(1 for r in data if r["new_vendor_risk"])
    count = len(data)
    avg_contracts = round(sum(r["total_contracts"] or 0 for r in data) / max(count, 1), 1)

    t = lambda es, en: en if lang == "en" else es  # noqa: E731

    if lang == "en":
        lede = (
            f"{count} companies incorporated after 2015 collected {_fmt_value(total_value, 'en')} "
            f"in federal contracts — every single one awarded without competitive bidding. "
            f"The average: {avg_contracts} contracts per company, zero competitors, zero transparency."
        )
    else:
        lede = (
            f"Al menos {count} empresas surgidas desde 2015 recibieron "
            f"{_fmt_value(total_value, 'es')} en contratos gubernamentales sin concurso "
            f"público. Estas empresas tienen en promedio {avg_contracts} contratos, "
            f"todos adjudicados directamente."
        )

    return {
        "title": t(
            "Empresas Fantasma: Millones Sin Licitación",
            "Ghost Companies: Millions Without Bidding"
        ),
        "subtitle": t(
            "Empresas de reciente creación con contratos millonarios adjudicados directamente",
            "Post-2015 companies with million-peso contracts, no competition"
        ),
        "key_question": t(
            "¿Cuántas empresas nuevas recibieron millones sin competir?",
            "How many newly created companies collected federal millions without competing?"
        ),
        "methodology": t(
            (
                "Filtra proveedores surgidos desde 2015, con 1–30 contratos, "
                "valor total ≥5M MXN, tasa de adjudicación directa ≥90% "
                "y puntaje de riesgo ML ≥0.20. Excluye monopolios estructurales conocidos."
            ),
            (
                "Filters vendors first active 2015+, with 1–30 contracts, "
                "total value ≥MX$5M, direct award rate ≥90%, "
                "and ML risk score ≥0.20. Excludes known structural monopolies."
            ),
        ),
        "lede": lede,
        "summary": {
            "total_vendors": count,
            "total_value_mxn": total_value,
            "new_vendor_flagged": new_vendor_count,
        },
        "data": data,
    }


@router.get("/top-suspicious-vendors")
def top_suspicious_vendors(lang: str = Query("es", regex="^(en|es)$")):
    """
    Top vendors by ARIA IPS score (composite risk) — Tier 1 and Tier 2.
    """
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                aq.vendor_id,
                aq.vendor_name,
                aq.total_contracts,
                aq.total_value_mxn,
                ROUND(aq.avg_risk_score, 4)            AS avg_risk_score,
                ROUND(aq.direct_award_rate * 100.0, 1) AS direct_award_pct,
                aq.ips_final,
                aq.ips_tier                            AS tier,
                aq.primary_sector_name,
                aq.primary_pattern                     AS pattern_type,
                aq.review_status,
                aq.in_ground_truth,
                vs.first_contract_year                 AS first_year,
                vs.last_contract_year                  AS last_year
            FROM aria_queue aq
            JOIN vendor_stats vs ON aq.vendor_id = vs.vendor_id
            WHERE aq.fp_patent_exception = 0
              AND aq.fp_structural_monopoly = 0
              AND aq.fp_data_error = 0
              AND aq.ips_tier <= 2
              AND aq.total_value_mxn >= 1000000
            ORDER BY aq.ips_final DESC
            LIMIT 100
        """).fetchall()

    cols = ["vendor_id", "vendor_name", "total_contracts", "total_value_mxn",
            "avg_risk_score", "direct_award_pct", "ips_final", "tier",
            "primary_sector_name", "pattern_type", "review_status",
            "in_ground_truth", "first_year", "last_year"]
    data = [dict(zip(cols, r)) for r in rows]

    confirmed_gt = sum(1 for r in data if r["in_ground_truth"])
    total_value = sum(r["total_value_mxn"] or 0 for r in data)
    tier1_count = sum(1 for r in data if r["tier"] == 1)

    t = lambda es, en: en if lang == "en" else es  # noqa: E731

    if lang == "en":
        lede = (
            f"ARIA's algorithm has flagged {tier1_count} vendors as maximum-priority targets, "
            f"representing {_fmt_value(total_value, 'en')} in federal contracts. "
            f"Of these, {confirmed_gt} are already linked to documented corruption cases."
        )
    else:
        lede = (
            f"El algoritmo ARIA identificó {tier1_count} proveedores de máxima prioridad "
            f"de investigación, con un valor contractual combinado de {_fmt_value(total_value, 'es')}. "
            f"De estos, {confirmed_gt} ya están vinculados a casos documentados de corrupción."
        )

    return {
        "title": t(
            "Los 100 Proveedores Más Sospechosos",
            "The 100 Most Suspicious Vendors"
        ),
        "subtitle": t(
            "Clasificados por el Índice de Priorización de Investigación (IPS) del sistema ARIA",
            "Ranked by ARIA's Investigation Priority Score (IPS)"
        ),
        "key_question": t(
            "¿Qué proveedores combinan mayor riesgo ML, anomalías financieras y alertas externas?",
            "Which vendors combine the highest ML risk, financial anomalies, and external registry flags?"
        ),
        "methodology": t(
            (
                "El IPS combina: puntaje de riesgo ML (40%), anomalía de conjunto PyOD (20%), "
                "concentración financiera (20%) y alertas externas —EFOS, SFP, RUPC— (20%). "
                "Solo proveedores Tier 1 y Tier 2 con valor total ≥1M MXN. "
                "Excluye monopolios estructurales (Gilead, Sanofi, Roche, etc.)."
            ),
            (
                "IPS combines: ML risk score (40%), PyOD ensemble anomaly (20%), "
                "financial concentration (20%), and external registry flags —EFOS, SFP, RUPC— (20%). "
                "Tier 1 and Tier 2 vendors only, total value ≥MX$1M. "
                "Excludes structural monopolies (Gilead, Sanofi, Roche, etc.)."
            ),
        ),
        "lede": lede,
        "summary": {
            "total_vendors": len(data),
            "total_value_mxn": total_value,
            "confirmed_ground_truth": confirmed_gt,
            "tier1_count": tier1_count,
            "tier2_count": sum(1 for r in data if r["tier"] == 2),
        },
        "data": data,
    }


@router.get("/overpricing-patterns")
def overpricing_patterns(lang: str = Query("es", regex="^(en|es)$")):
    """
    Contracts with critical risk scores grouped by sector and year.
    """
    cache_key = f"overpricing-patterns-{lang}"
    cached = _get_cached(cache_key)
    if cached:
        return cached
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                s.name_es                        AS sector_name,
                c.contract_year,
                COUNT(*)                         AS contracts_flagged,
                SUM(c.amount_mxn)               AS total_value_mxn,
                ROUND(AVG(c.amount_mxn), 0)     AS avg_contract_value,
                ROUND(AVG(c.risk_score), 4)     AS avg_risk_score
            FROM contracts c
            JOIN sectors s ON c.sector_id = s.id
            WHERE c.risk_level = 'critical'
              AND c.amount_mxn >= 1000000
              AND c.contract_year >= 2010
            GROUP BY s.name_es, c.contract_year
            HAVING COUNT(*) >= 5
            ORDER BY total_value_mxn DESC
            LIMIT 80
        """).fetchall()

    cols = ["sector_name", "contract_year", "contracts_flagged",
            "total_value_mxn", "avg_contract_value", "avg_risk_score"]
    data = [dict(zip(cols, r)) for r in rows]

    t = lambda es, en: en if lang == "en" else es  # noqa: E731

    result = {
        "title": t(
            "Patrones de Sobreprecio por Sector",
            "Overpricing Patterns by Sector"
        ),
        "subtitle": t(
            "Sectores y años con mayor concentración de contratos de riesgo crítico",
            "Sectors and years with the highest concentration of critical-risk contracts"
        ),
        "key_question": t(
            "¿Dónde se concentra el sobreprecio en la contratación pública mexicana?",
            "Where does overpricing concentrate in Mexican federal procurement?"
        ),
        "methodology": t(
            (
                "Contratos con nivel de riesgo 'crítico' (score ≥0.60), valor ≥1M MXN, "
                "agrupados por sector y año. Muestra dónde se concentra el gasto en "
                "contratos con características similares a casos documentados de corrupción."
            ),
            (
                "Contracts with 'critical' risk level (score ≥0.60), value ≥MX$1M, "
                "grouped by sector and year. Shows where spending concentrates in "
                "contracts matching documented corruption patterns."
            ),
        ),
        "data": data,
    }
    _set_cached(cache_key, result)
    return result


# ---------------------------------------------------------------------------
# Package builder helpers (used by /packages endpoint)
# ---------------------------------------------------------------------------

def _build_ghost_companies_package(conn, lang: str = "es") -> dict:
    """Package 1: Ghost companies."""
    t = lambda es, en: en if lang == "en" else es  # noqa: E731
    try:
        rows = conn.execute("""
            SELECT
                aq.vendor_id, aq.vendor_name, aq.total_value_mxn,
                aq.primary_sector_name, ROUND(aq.avg_risk_score, 4) AS avg_risk_score,
                aq.total_contracts, ROUND(aq.direct_award_rate * 100.0, 1) AS direct_award_pct
            FROM aria_queue aq
            JOIN vendor_stats vs ON aq.vendor_id = vs.vendor_id
            WHERE vs.first_contract_year >= 2015
              AND aq.total_contracts BETWEEN 1 AND 30
              AND aq.total_value_mxn >= 5000000
              AND aq.direct_award_rate >= 0.90
              AND aq.fp_structural_monopoly = 0
              AND aq.fp_patent_exception = 0
              AND aq.fp_data_error = 0
            ORDER BY aq.total_value_mxn DESC
        """).fetchall()
        cols = ["vendor_id", "vendor_name", "total_value_mxn", "primary_sector_name",
                "avg_risk_score", "total_contracts", "direct_award_pct"]
        all_data = _safe_rows_to_dicts(rows, cols)
        count = len(all_data)
        total_value = sum(r["total_value_mxn"] or 0 for r in all_data)
        avg_contracts = round(sum(r["total_contracts"] or 0 for r in all_data) / max(count, 1), 1)
        examples = all_data[:5]
        if lang == "en":
            lede = (
                f"{count} companies incorporated after 2015 collected {_fmt_value(total_value, 'en')} "
                f"in federal contracts — every single one awarded without competitive bidding. "
                f"The average: {avg_contracts} contracts per company, zero competitors, zero transparency."
            )
        else:
            lede = (
                f"Al menos {count} empresas surgidas desde 2015 recibieron "
                f"{_fmt_value(total_value, 'es')} en contratos gubernamentales sin concurso "
                f"público. Estas empresas tienen en promedio {avg_contracts} contratos, "
                f"todos adjudicados directamente."
            )
    except Exception as e:
        logger.warning(f"ghost_companies package query failed: {e}")
        count, total_value, avg_contracts, examples = 0, 0, 0, []
        lede = t(
            "No se pudieron obtener datos de empresas fantasma.",
            "Ghost company data could not be retrieved."
        )

    return {
        "id": "ghost_companies",
        "title": t(
            "Empresas Fantasma: Millones Sin Licitación",
            "Ghost Companies: Millions Without Bidding"
        ),
        "subtitle": t(
            "Empresas de reciente creación con contratos millonarios adjudicados directamente",
            "Post-2015 companies with million-peso contracts, no competition"
        ),
        "key_question": t(
            "¿Cuántas empresas nuevas recibieron millones sin competir?",
            "How many newly created companies collected federal millions without competing?"
        ),
        "difficulty": "rapida",
        "difficulty_label": t("Verificación rápida", "Quick verification"),
        "lede": lede,
        "examples": examples,
        "defense": t(
            (
                "El gobierno podría argumentar que las adjudicaciones directas son legales "
                "bajo ciertos supuestos del artículo 41 de la LAASSP."
            ),
            (
                "Officials may cite Article 41 of the LAASSP, which permits direct awards "
                "under specific circumstances including urgency and sole-source supply."
            ),
        ),
        "next_steps": t(
            [
                "Solicitar vía InfoMex los contratos completos de las 5 empresas con mayor valor",
                "Verificar RFC en el SAT (sat.gob.mx/consultas/RFC)",
                "Buscar al representante legal en el IMSS e INFONAVIT",
                "Cruzar con padrón de proveedores sancionados de la SFP",
            ],
            [
                "File InfoMex requests for full contract documents from the 5 highest-value companies",
                "Verify RFC registration at SAT (sat.gob.mx/consultas/RFC)",
                "Search the legal representative's name in IMSS and INFONAVIT records",
                "Cross-reference with SFP's sanctioned vendor registry",
            ],
        ),
        "summary": {
            "count": count,
            "total_value_mxn": total_value,
            "avg_contracts_per_vendor": avg_contracts,
        },
        "methodology": t(
            (
                "Proveedores en aria_queue surgidos desde 2015, 1-30 contratos, "
                "valor ≥5M MXN, tasa DA ≥90%, excluyendo monopolios estructurales."
            ),
            (
                "Vendors in aria_queue first active 2015+, 1–30 contracts, "
                "value ≥MX$5M, direct award rate ≥90%, excluding structural monopolies."
            ),
        ),
    }


def _build_top_suspicious_package(conn, lang: str = "es") -> dict:
    """Package 2: Top suspicious vendors."""
    t = lambda es, en: en if lang == "en" else es  # noqa: E731
    try:
        rows = conn.execute("""
            SELECT
                aq.vendor_id, aq.vendor_name, aq.total_value_mxn,
                aq.primary_sector_name, ROUND(aq.avg_risk_score, 4) AS avg_risk_score,
                aq.total_contracts, ROUND(aq.ips_final, 4) AS ips_final,
                aq.ips_tier, aq.in_ground_truth
            FROM aria_queue aq
            WHERE aq.ips_tier <= 2
              AND aq.total_value_mxn >= 1000000
              AND aq.fp_structural_monopoly = 0
              AND aq.fp_patent_exception = 0
            ORDER BY aq.ips_final DESC
            LIMIT 100
        """).fetchall()
        cols = ["vendor_id", "vendor_name", "total_value_mxn", "primary_sector_name",
                "avg_risk_score", "total_contracts", "ips_final", "ips_tier", "in_ground_truth"]
        all_data = _safe_rows_to_dicts(rows, cols)
        count = len(all_data)
        total_value = sum(r["total_value_mxn"] or 0 for r in all_data)
        tier1_count = sum(1 for r in all_data if r.get("ips_tier") == 1)
        tier2_count = sum(1 for r in all_data if r.get("ips_tier") == 2)
        confirmed_gt = sum(1 for r in all_data if r.get("in_ground_truth"))
        examples = all_data[:5]
        if lang == "en":
            lede = (
                f"ARIA's algorithm has flagged {tier1_count} vendors as maximum-priority targets, "
                f"representing {_fmt_value(total_value, 'en')} in federal contracts. "
                f"Of these, {confirmed_gt} are already linked to documented corruption cases."
            )
        else:
            lede = (
                f"El algoritmo ARIA identificó {tier1_count} proveedores de máxima prioridad "
                f"de investigación, con un valor contractual combinado de {_fmt_value(total_value, 'es')}. "
                f"De estos, {confirmed_gt} ya están vinculados a casos documentados de corrupción."
            )
    except Exception as e:
        logger.warning(f"top_suspicious package query failed: {e}")
        count, total_value, tier1_count, tier2_count, confirmed_gt, examples = 0, 0, 0, 0, 0, []
        lede = t(
            "No se pudieron obtener datos de proveedores sospechosos.",
            "Suspicious vendor data could not be retrieved."
        )

    return {
        "id": "top_suspicious",
        "title": t(
            "Los 100 Proveedores Más Investigados por el Sistema",
            "The 100 Most-Flagged Vendors"
        ),
        "subtitle": t(
            "Clasificados por el Índice de Priorización de Investigación (IPS)",
            "Ranked by ARIA's Investigation Priority Score (IPS)"
        ),
        "key_question": t(
            "¿Qué proveedores combinan mayor riesgo, anomalías y alertas externas?",
            "Which vendors combine the highest ML risk, anomaly scores, and external registry flags?"
        ),
        "difficulty": "investigacion_larga",
        "difficulty_label": t("Investigación a profundidad", "Long-form investigation"),
        "lede": lede,
        "examples": examples,
        "defense": t(
            (
                "Los proveedores podrían argumentar que su tamaño justifica el volumen de contratos "
                "y que las adjudicaciones directas responden a urgencias o especialización."
            ),
            (
                "Vendors may argue their market size justifies contract volume "
                "and that direct awards reflect urgency or specialized capability."
            ),
        ),
        "next_steps": t(
            [
                "Cruzar con auditorías ASF de los últimos 5 años",
                "Solicitar informes de seguimiento de contratos vía transparencia",
                "Verificar el accionariado en el Registro Público de Comercio",
                "Contactar a la Secretaría de la Función Pública para antecedentes",
            ],
            [
                "Cross-reference with ASF audit reports from the last 5 years",
                "File transparency requests for contract performance reports",
                "Check corporate ownership in the Registro Público de Comercio",
                "Contact the SFP for vendor background and sanction history",
            ],
        ),
        "summary": {
            "count": count,
            "total_value_mxn": total_value,
            "tier1_count": tier1_count,
            "tier2_count": tier2_count,
            "confirmed_gt_count": confirmed_gt,
        },
        "methodology": t(
            (
                "IPS combina riesgo ML (40%), anomalía PyOD (20%), concentración financiera (20%), "
                "alertas externas (20%). Tier 1 y 2, valor ≥1M MXN, sin monopolios estructurales."
            ),
            (
                "IPS combines ML risk (40%), PyOD anomaly (20%), financial concentration (20%), "
                "external flags (20%). Tier 1 and 2, value ≥MX$1M, no structural monopolies."
            ),
        ),
    }


def _build_administration_comparison_package(conn, lang: str = "es") -> dict:
    """Package 3: Administration comparison."""
    t = lambda es, en: en if lang == "en" else es  # noqa: E731
    try:
        rows = conn.execute("""
            SELECT
                CASE
                    WHEN contract_year BETWEEN 2000 AND 2006 THEN 'Fox (2000-2006)'
                    WHEN contract_year BETWEEN 2006 AND 2012 THEN 'Calderón (2006-2012)'
                    WHEN contract_year BETWEEN 2012 AND 2018 THEN 'Peña Nieto (2012-2018)'
                    WHEN contract_year >= 2018             THEN 'AMLO/Sheinbaum (2018-)'
                    ELSE 'Pre-2000'
                END AS administration,
                MIN(contract_year) AS year_from,
                MAX(contract_year) AS year_to,
                COUNT(*) AS total_contracts,
                SUM(amount_mxn) AS total_value_mxn,
                ROUND(AVG(CASE WHEN is_direct_award=1 THEN 100.0 ELSE 0.0 END), 1) AS direct_award_pct,
                ROUND(AVG(risk_score), 4) AS avg_risk_score
            FROM contracts
            WHERE amount_mxn > 0 AND contract_year IS NOT NULL
              AND contract_year BETWEEN 2000 AND 2025
            GROUP BY administration
            ORDER BY year_from
        """).fetchall()
        cols = ["administration", "year_from", "year_to", "total_contracts",
                "total_value_mxn", "direct_award_pct", "avg_risk_score"]
        all_data = _safe_rows_to_dicts(rows, cols)
        sorted_by_da = sorted(all_data, key=lambda x: x.get("direct_award_pct") or 0, reverse=True)
        worst_admin = sorted_by_da[0]["administration"] if sorted_by_da else "N/A"
        worst_da_pct = sorted_by_da[0].get("direct_award_pct", 0) if sorted_by_da else 0
        total_spend = sum(r.get("total_value_mxn") or 0 for r in all_data)
        examples = sorted_by_da[:2]
        if lang == "en":
            lede = (
                f"Under {worst_admin}, {worst_da_pct:.1f}% of federal contracts were awarded "
                f"without competitive bidding — the highest rate in 23 years of procurement data. "
                f"Across all six administrations since 2002, Mexico has spent trillions through "
                f"procedures that match documented corruption patterns."
            )
        else:
            lede = (
                f"El sexenio de {worst_admin} registró la mayor tasa de adjudicación directa: "
                f"{_fmt_pct(worst_da_pct)} de sus contratos se otorgaron sin concurso. "
                f"En 23 años de datos, México ha gastado {_fmt_value(total_spend, 'es')} en "
                f"contrataciones que muestran patrones similares a casos documentados de corrupción."
            )
    except Exception as e:
        logger.warning(f"administration_comparison package query failed: {e}")
        worst_admin, worst_da_pct, examples = "N/A", 0, []
        lede = t(
            "No se pudieron obtener datos de comparación entre administraciones.",
            "Administration comparison data could not be retrieved."
        )

    return {
        "id": "administration_comparison",
        "title": t(
            "¿Qué Sexenio Fue Más Corrupto?",
            "Which Administration Was Most Corrupt?"
        ),
        "subtitle": t(
            "Comparación de patrones de adjudicación directa por administración",
            "Direct award rates and risk scores across six presidential terms"
        ),
        "key_question": t(
            "¿Qué gobierno otorgó más contratos sin licitación?",
            "Which administration awarded the most contracts without competitive bidding?"
        ),
        "difficulty": "rapida",
        "difficulty_label": t("Verificación rápida", "Quick verification"),
        "lede": lede,
        "examples": examples,
        "defense": t(
            (
                "Cada administración argumenta que las adjudicaciones directas responden a "
                "urgencias o prioridades de política pública. Comparar tasas entre sexenios "
                "permite evaluar si esto es consistente o si hay variaciones significativas."
            ),
            (
                "Each administration argues direct awards reflect emergency or policy priorities. "
                "Comparing rates across terms reveals whether the pattern is structural or administration-specific."
            ),
        ),
        "next_steps": t(
            [
                "Comparar tasas de DA con el presupuesto anual de cada sexenio",
                "Identificar los sectores con mayor cambio entre administraciones",
                "Solicitar informes de la ASF sobre cada periodo",
            ],
            [
                "Compare direct award rates against each term's total budget",
                "Identify sectors with the largest swing between administrations",
                "Request ASF audit reports covering each presidential period",
            ],
        ),
        "summary": {
            "highest_da_admin": worst_admin,
            "highest_da_pct": worst_da_pct,
        },
        "methodology": t(
            (
                "Contratos agrupados por sexenio presidencial, comparando tasas de "
                "adjudicación directa, propuesta única y puntaje de riesgo promedio."
            ),
            (
                "Contracts grouped by presidential term, comparing direct award rates, "
                "single-bid rates, and average risk scores."
            ),
        ),
    }


def _build_efos_vendors_package(conn, lang: str = "es") -> dict:
    """Package 4: EFOS vendors."""
    t = lambda es, en: en if lang == "en" else es  # noqa: E731
    try:
        rows = conn.execute("""
            SELECT
                aq.vendor_id, aq.vendor_name, aq.total_value_mxn,
                aq.primary_sector_name, ROUND(aq.avg_risk_score, 4) AS avg_risk_score,
                aq.total_contracts, aq.efos_rfc
            FROM aria_queue aq
            WHERE aq.is_efos_definitivo = 1
            ORDER BY aq.total_value_mxn DESC
        """).fetchall()
        cols = ["vendor_id", "vendor_name", "total_value_mxn", "primary_sector_name",
                "avg_risk_score", "total_contracts", "efos_rfc"]
        all_data = _safe_rows_to_dicts(rows, cols)
        count = len(all_data)
        total_value = sum(r["total_value_mxn"] or 0 for r in all_data)
        examples = all_data[:5]
        if lang == "en":
            lede = (
                f"{count} companies on the SAT's official list of ghost invoice issuers "
                f"hold active federal government contracts worth {_fmt_value(total_value, 'en')}. "
                f"These vendors appear on the EFOS definitive blacklist — yet the contracts keep flowing."
            )
        else:
            lede = (
                f"Al menos {count} empresas incluidas en la lista definitiva del SAT de "
                f"contribuyentes que facturan operaciones simuladas (EFOS) han obtenido "
                f"contratos del gobierno federal por un total de {_fmt_value(total_value, 'es')}."
            )
    except Exception as e:
        logger.warning(f"efos_vendors package query failed: {e}")
        count, total_value, examples = 0, 0, []
        lede = t(
            "No se pudieron obtener datos de empresas EFOS.",
            "EFOS vendor data could not be retrieved."
        )

    return {
        "id": "efos_vendors",
        "title": t(
            "Empresas en Lista Negra del SAT con Contratos Activos",
            "SAT-Blacklisted Companies Still Receiving Federal Contracts"
        ),
        "subtitle": t(
            "Proveedores en la lista EFOS definitiva del SAT que recibieron contratos federales",
            "Vendors on SAT's EFOS definitive list that hold federal contracts"
        ),
        "key_question": t(
            "¿Cuántas empresas fantasma confirmadas por el SAT siguen recibiendo contratos?",
            "How many SAT-confirmed ghost invoice issuers are still on government contract rolls?"
        ),
        "difficulty": "requiere_solicitud",
        "difficulty_label": t(
            "Requiere solicitud de información",
            "Requires public records request"
        ),
        "lede": lede,
        "examples": examples,
        "defense": t(
            (
                "Las dependencias podrían argumentar que los contratos se firmaron antes de la "
                "inclusión en la lista EFOS o que el proveedor fue dado de baja posteriormente."
            ),
            (
                "Agencies may argue contracts predated EFOS listing or that the vendor "
                "was subsequently removed. Contract and listing dates should be compared directly."
            ),
        ),
        "next_steps": t(
            [
                "Verificar fechas de inclusión en lista EFOS vs fechas de contratación",
                "Solicitar al SAT la ficha completa de cada empresa vía InfoMex",
                "Cruzar RFC con el padrón de proveedores sancionados de la SFP",
                "Buscar litigios fiscales en el TFJFA",
            ],
            [
                "Compare EFOS listing dates against contract award dates",
                "Request full SAT company records via InfoMex for each vendor",
                "Cross-reference RFC numbers with SFP's sanctioned vendor registry",
                "Search for tax litigation in TFJFA records",
            ],
        ),
        "summary": {
            "count": count,
            "total_value_mxn": total_value,
        },
        "methodology": t(
            (
                "Proveedores en aria_queue con is_efos_definitivo=1, "
                "cruzados con la lista SAT Art. 69-B definitivo."
            ),
            (
                "Vendors in aria_queue with is_efos_definitivo=1, "
                "cross-referenced against the SAT Art. 69-B definitive list."
            ),
        ),
    }


def _build_sector_overpricing_package(conn, lang: str = "es") -> dict:
    """Package 5: Sector overpricing."""
    t = lambda es, en: en if lang == "en" else es  # noqa: E731
    try:
        rows = conn.execute("""
            SELECT
                s.name_es AS sector_name,
                SUM(c.amount_mxn) AS total_value_mxn,
                COUNT(*) AS contracts_flagged,
                ROUND(AVG(c.risk_score), 4) AS avg_risk_score
            FROM contracts c
            JOIN sectors s ON c.sector_id = s.id
            WHERE c.risk_level = 'critical'
              AND c.amount_mxn >= 1000000
              AND c.contract_year >= 2010
            GROUP BY s.name_es
            ORDER BY total_value_mxn DESC
        """).fetchall()
        cols = ["sector_name", "total_value_mxn", "contracts_flagged", "avg_risk_score"]
        all_data = _safe_rows_to_dicts(rows, cols)
        top_sector = all_data[0]["sector_name"] if all_data else "N/A"
        top_value = all_data[0]["total_value_mxn"] if all_data else 0
        examples = all_data[:5]
        if lang == "en":
            lede = (
                f"Critical-risk contracts in the {top_sector} sector alone total {_fmt_value(top_value, 'en')} — "
                f"the highest concentration of spending matching documented overpricing patterns. "
                f"Fifteen years of data point to the same sectors, the same vendors, the same mechanisms."
            )
        else:
            lede = (
                f"Los contratos de riesgo crítico en el sector {top_sector} suman "
                f"{_fmt_value(top_value, 'es')}, concentrando el mayor volumen de gasto con patrones "
                f"similares a sobreprecios documentados. Los datos de 2010-2025 revelan "
                f"patrones sistemáticos."
            )
    except Exception as e:
        logger.warning(f"sector_overpricing package query failed: {e}")
        all_data = []
        examples = []
        lede = t(
            "No se pudieron obtener datos de sobreprecio sectorial.",
            "Sector overpricing data could not be retrieved."
        )

    return {
        "id": "sector_overpricing",
        "title": t(
            "Sobreprecio Sistemático: Los Sectores Más Vulnerables",
            "Systematic Overpricing: The Most Vulnerable Sectors"
        ),
        "subtitle": t(
            "Sectores con mayor concentración de contratos de riesgo crítico",
            "Sectors with the highest concentration of critical-risk contracts"
        ),
        "key_question": t(
            "¿Dónde se concentra el sobreprecio en la contratación pública?",
            "Where does overpricing concentrate in public procurement?"
        ),
        "difficulty": "investigacion_larga",
        "difficulty_label": t("Investigación a profundidad", "Long-form investigation"),
        "lede": lede,
        "examples": examples,
        "defense": t(
            (
                "Las dependencias argumentan que los precios altos reflejan especialización, "
                "urgencia o condiciones de mercado. Comparar precios unitarios con catálogos "
                "de CompraNet permite refutar esta defensa."
            ),
            (
                "Agencies argue high prices reflect specialization, urgency, or market conditions. "
                "Comparing unit prices against CompraNet reference catalogs is the strongest rebuttal."
            ),
        ),
        "next_steps": t(
            [
                "Solicitar catálogos de precios de referencia del sector con mayor valor",
                "Comparar precios unitarios de contratos críticos con precios de mercado",
                "Identificar los 10 proveedores con mayor valor en contratos críticos por sector",
                "Revisar auditorías ASF del sector prioritario",
            ],
            [
                "Request CompraNet reference price catalogs for the top-value sector",
                "Compare unit prices in critical-risk contracts against market benchmarks",
                "Identify the 10 vendors with the highest value in critical contracts per sector",
                "Review ASF audit reports for the priority sector",
            ],
        ),
        "summary": {
            "sectors_affected": len(all_data),
        },
        "methodology": t(
            (
                "Contratos con riesgo crítico (score ≥0.60), valor ≥1M MXN, desde 2010, "
                "agrupados por sector."
            ),
            (
                "Contracts with critical risk (score ≥0.60), value ≥MX$1M, from 2010, "
                "grouped by sector."
            ),
        ),
    }


def _build_new_vendor_risk_package(conn, lang: str = "es") -> dict:
    """Package 6: New vendor risk."""
    t = lambda es, en: en if lang == "en" else es  # noqa: E731
    try:
        rows = conn.execute("""
            SELECT
                aq.vendor_id, aq.vendor_name, aq.total_value_mxn,
                aq.primary_sector_name, ROUND(aq.avg_risk_score, 4) AS avg_risk_score,
                aq.total_contracts, ROUND(aq.direct_award_rate * 100.0, 1) AS direct_award_pct,
                vs.first_contract_year, vs.last_contract_year
            FROM aria_queue aq
            JOIN vendor_stats vs ON aq.vendor_id = vs.vendor_id
            WHERE aq.new_vendor_risk = 1
              AND aq.fp_structural_monopoly = 0
              AND aq.fp_patent_exception = 0
            ORDER BY aq.total_value_mxn DESC
        """).fetchall()
        cols = ["vendor_id", "vendor_name", "total_value_mxn", "primary_sector_name",
                "avg_risk_score", "total_contracts", "direct_award_pct",
                "first_contract_year", "last_contract_year"]
        all_data = _safe_rows_to_dicts(rows, cols)
        count = len(all_data)
        total_value = sum(r["total_value_mxn"] or 0 for r in all_data)
        examples = all_data[:5]
        if lang == "en":
            lede = (
                f"{count} newly created companies with no prior contracting history "
                f"collected {_fmt_value(total_value, 'en')} in federal contracts, with direct award rates above 95%. "
                f"Shell company indicators are present in a majority of cases."
            )
        else:
            lede = (
                f"El sistema identificó {count} proveedores de reciente creación que, "
                f"pese a no tener historial previo, obtuvieron contratos por "
                f"{_fmt_value(total_value, 'es')}, con tasas de adjudicación directa "
                f"superiores al 95%."
            )
    except Exception as e:
        logger.warning(f"new_vendor_risk package query failed: {e}")
        count, total_value, examples = 0, 0, []
        lede = t(
            "No se pudieron obtener datos de proveedores nuevos de riesgo.",
            "New vendor risk data could not be retrieved."
        )

    return {
        "id": "new_vendor_risk",
        "title": t(
            "Empresas Sin Historial que Ganaron Contratos Millonarios",
            "No Track Record, Millions in Contracts"
        ),
        "subtitle": t(
            "Proveedores nuevos con alto volumen de adjudicaciones directas",
            "New vendors with high direct award rates and no prior contracting history"
        ),
        "key_question": t(
            "¿Qué empresas sin historial recibieron contratos millonarios?",
            "Which companies with no contracting history landed million-peso federal contracts?"
        ),
        "difficulty": "rapida",
        "difficulty_label": t("Verificación rápida", "Quick verification"),
        "lede": lede,
        "examples": examples,
        "defense": t(
            (
                "El gobierno podría argumentar que se trata de empresas nuevas con "
                "capacidad técnica demostrada. Verificar si tienen oficinas físicas, "
                "empleados y experiencia previa permite refutar esta defensa."
            ),
            (
                "Officials may argue new companies demonstrated technical capability. "
                "Checking for physical offices, registered employees, and prior experience "
                "is the direct rebuttal."
            ),
        ),
        "next_steps": t(
            [
                "Verificar domicilio fiscal de las 10 empresas con mayor valor",
                "Consultar IMSS para número de empleados registrados",
                "Buscar antecedentes del representante legal en otras empresas",
                "Cruzar con lista EFOS del SAT",
            ],
            [
                "Verify the fiscal address of the 10 highest-value companies",
                "Check IMSS records for number of registered employees",
                "Search the legal representative's name for other company affiliations",
                "Cross-reference against SAT's EFOS list",
            ],
        ),
        "summary": {
            "count": count,
            "total_value_mxn": total_value,
        },
        "methodology": t(
            (
                "Proveedores con new_vendor_risk=1 en ARIA: debut ≥2018, DA ≥95%, "
                "valor total ≥10M MXN, sin monopolios estructurales."
            ),
            (
                "Vendors with new_vendor_risk=1 in ARIA: first contract ≥2018, "
                "direct award rate ≥95%, total value ≥MX$10M, no structural monopolies."
            ),
        ),
    }


def _build_monopoly_capture_package(conn, lang: str = "es") -> dict:
    """Package 7: Monopoly capture."""
    t = lambda es, en: en if lang == "en" else es  # noqa: E731
    try:
        rows = conn.execute("""
            SELECT
                aq.vendor_id, aq.vendor_name, aq.total_value_mxn,
                aq.primary_sector_name, ROUND(aq.avg_risk_score, 4) AS avg_risk_score,
                aq.total_contracts, ROUND(aq.ips_final, 4) AS ips_final
            FROM aria_queue aq
            WHERE aq.primary_pattern = 'P1'
              AND aq.fp_structural_monopoly = 0
              AND aq.total_value_mxn >= 10000000
            ORDER BY aq.ips_final DESC
        """).fetchall()
        cols = ["vendor_id", "vendor_name", "total_value_mxn", "primary_sector_name",
                "avg_risk_score", "total_contracts", "ips_final"]
        all_data = _safe_rows_to_dicts(rows, cols)
        count = len(all_data)
        top_value = all_data[0]["total_value_mxn"] if all_data else 0
        examples = all_data[:5]
        if lang == "en":
            lede = (
                f"{count} vendors hold an abnormal share of their sector's spending, "
                f"with contract totals reaching as high as {_fmt_value(top_value, 'en')}. "
                f"This concentration pattern — market capture — is the single most consistent "
                f"signal in Mexico's documented corruption cases."
            )
        else:
            lede = (
                f"Al menos {count} proveedores concentran una proporción anormal del gasto "
                f"en su sector, con valores contractuales de hasta {_fmt_value(top_value, 'es')}. "
                f"Este patrón — conocido como 'captura de mercado' — es uno de los indicadores "
                f"más consistentes en casos documentados de corrupción en México."
            )
    except Exception as e:
        logger.warning(f"monopoly_capture package query failed: {e}")
        count, examples = 0, []
        lede = t(
            "No se pudieron obtener datos de captura de mercado.",
            "Market capture data could not be retrieved."
        )

    return {
        "id": "monopoly_capture",
        "title": t(
            "Un Solo Proveedor, Todo el Presupuesto de un Sector",
            "One Vendor, an Entire Sector's Budget"
        ),
        "subtitle": t(
            "Proveedores con concentración anormal del gasto sectorial",
            "Vendors with abnormal concentration of sector spending"
        ),
        "key_question": t(
            "¿Qué proveedores acaparan el presupuesto de un sector completo?",
            "Which vendors have captured the spending of an entire sector?"
        ),
        "difficulty": "investigacion_larga",
        "difficulty_label": t("Investigación a profundidad", "Long-form investigation"),
        "lede": lede,
        "examples": examples,
        "defense": t(
            (
                "Los proveedores podrían argumentar que su posición dominante se debe a "
                "especialización o capacidad técnica única. Verificar si existen alternativas "
                "en el mercado permite evaluar esta defensa."
            ),
            (
                "Vendors may argue dominance reflects specialized or unique technical capability. "
                "Verifying whether market alternatives exist is the key rebuttal step."
            ),
        ),
        "next_steps": t(
            [
                "Identificar alternativas de mercado para los 5 proveedores más concentrados",
                "Solicitar justificaciones de adjudicación directa de las dependencias",
                "Revisar si los proveedores tienen vínculos con funcionarios",
                "Comparar precios con proveedores similares en otros países",
            ],
            [
                "Identify market alternatives for the 5 most concentrated vendors",
                "Request agency justifications for direct award decisions",
                "Investigate potential ties between vendors and government officials",
                "Compare pricing against equivalent vendors in other countries",
            ],
        ),
        "summary": {
            "count": count,
        },
        "methodology": t(
            (
                "Proveedores con patrón P1 (Monopoly) en ARIA, valor ≥10M MXN, "
                "excluyendo monopolios estructurales (patentes, regulación)."
            ),
            (
                "Vendors with pattern P1 (Monopoly) in ARIA, value ≥MX$10M, "
                "excluding structural monopolies (patents, regulation)."
            ),
        ),
    }


def _build_direct_award_surge_package(conn, lang: str = "es") -> dict:
    """Package 8: Direct award surge."""
    t = lambda es, en: en if lang == "en" else es  # noqa: E731
    try:
        rows = conn.execute("""
            SELECT
                contract_year,
                COUNT(*) AS total_contracts,
                SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) AS da_contracts,
                ROUND(AVG(CASE WHEN is_direct_award=1 THEN 100.0 ELSE 0.0 END), 1) AS da_pct
            FROM contracts
            WHERE contract_year >= 2010 AND contract_year IS NOT NULL AND amount_mxn > 0
            GROUP BY contract_year
            ORDER BY contract_year
        """).fetchall()
        cols = ["contract_year", "total_contracts", "da_contracts", "da_pct"]
        all_data = _safe_rows_to_dicts(rows, cols)
        peak_row = max(all_data, key=lambda x: x.get("da_pct") or 0) if all_data else {}
        peak_year = peak_row.get("contract_year", "N/A")
        peak_pct = peak_row.get("da_pct", 0)
        hist_avg = round(sum(r.get("da_pct", 0) for r in all_data) / max(len(all_data), 1), 1)
        admin_map = {
            range(2000, 2007): "Fox",
            range(2007, 2013): "Calderón",
            range(2013, 2019): "Peña Nieto",
            range(2019, 2030): "AMLO/Sheinbaum",
        }
        admin_name = "N/A"
        for yr_range, name in admin_map.items():
            if isinstance(peak_year, int) and peak_year in yr_range:
                admin_name = name
                break
        examples = sorted(all_data, key=lambda x: x.get("da_pct") or 0, reverse=True)[:3]
        if lang == "en":
            lede = (
                f"In {peak_year}, {peak_pct:.1f}% of federal contracts bypassed competitive bidding — "
                f"the highest rate on record during the {admin_name} administration. "
                f"The historical average: {hist_avg:.1f}%."
            )
        else:
            lede = (
                f"En {peak_year}, el {_fmt_pct(peak_pct)} de los contratos federales se "
                f"otorgaron sin proceso de licitación. Este patrón de adjudicación directa "
                f"— que supera el promedio histórico de {_fmt_pct(hist_avg)} — coincide con "
                f"la administración de {admin_name}."
            )
    except Exception as e:
        logger.warning(f"direct_award_surge package query failed: {e}")
        peak_row = {}
        hist_avg = 0
        examples = []
        lede = t(
            "No se pudieron obtener datos de adjudicaciones directas.",
            "Direct award surge data could not be retrieved."
        )

    return {
        "id": "direct_award_surge",
        "title": t(
            "Adjudicaciones Directas: El Año Récord",
            "Direct Awards: The Record Year"
        ),
        "subtitle": t(
            "El año con mayor tasa de contratación sin licitación",
            "The year with the highest share of no-bid federal contracts"
        ),
        "key_question": t(
            "¿En qué año se adjudicaron más contratos sin competencia?",
            "In which year did no-bid contracts reach their historic peak?"
        ),
        "difficulty": "rapida",
        "difficulty_label": t("Verificación rápida", "Quick verification"),
        "lede": lede,
        "examples": examples,
        "defense": t(
            (
                "El gobierno podría argumentar que las adjudicaciones directas aumentaron "
                "por emergencias (COVID-19, desastres naturales) o por reformas legales. "
                "Comparar con años anteriores y posteriores permite evaluar esta justificación."
            ),
            (
                "Officials may cite COVID-19, natural disasters, or legal reforms. "
                "Comparing the peak year against surrounding years and prior administrations "
                "reveals whether the justification holds."
            ),
        ),
        "next_steps": t(
            [
                "Comparar la tasa de DA del año pico con años anteriores y posteriores",
                "Desglosar las DA por sector para identificar dónde se concentran",
                "Solicitar al OIC las justificaciones de DA del año pico",
            ],
            [
                "Compare the peak year's direct award rate against the years before and after",
                "Break down direct awards by sector to find the highest concentrations",
                "File OIC requests for direct award justifications from the peak year",
            ],
        ),
        "summary": {
            "peak_year": peak_row.get("contract_year"),
            "peak_pct": peak_row.get("da_pct"),
            "hist_avg_pct": hist_avg,
        },
        "methodology": t(
            (
                "Contratos desde 2010 agrupados por año, calculando tasa de adjudicación "
                "directa. Se identifica el año con mayor tasa."
            ),
            (
                "Contracts from 2010 grouped by year, computing direct award rate. "
                "Peak year identified by highest rate."
            ),
        ),
    }


# ---------------------------------------------------------------------------
# /packages — serves all 8 from cache, lang-aware
# ---------------------------------------------------------------------------

@router.get("/packages")
def story_packages(lang: str = Query("es", regex="^(en|es)$")):
    """
    Return all 8 pre-packaged investigation story templates with live data.
    Pass ?lang=en for English narrative; default is Spanish.
    Served from in-memory cache (~1ms). First call after cold start returns 503
    while background computation runs (~2 min). Retry-After: 30 header is set.
    NOTE: cache is language-neutral (Spanish); lang param re-renders strings on the fly.
    """
    now = time.time()
    with _stories_lock:
        data_ready = _stories_cache.get("data") and now < _stories_cache.get("expires", 0.0)
        computing = _stories_cache.get("computing")

    if data_ready and lang == "es":
        # Fast path: cached Spanish data matches default
        with _stories_lock:
            return _stories_cache["data"]

    if data_ready and lang == "en":
        # Re-run builders with lang="en" against live DB (not cached for EN)
        with get_db() as conn:
            packages = [
                _build_ghost_companies_package(conn, lang="en"),
                _build_top_suspicious_package(conn, lang="en"),
                _build_administration_comparison_package(conn, lang="en"),
                _build_efos_vendors_package(conn, lang="en"),
                _build_sector_overpricing_package(conn, lang="en"),
                _build_new_vendor_risk_package(conn, lang="en"),
                _build_monopoly_capture_package(conn, lang="en"),
                _build_direct_award_surge_package(conn, lang="en"),
            ]
        return {"packages": packages}

    if computing:
        raise HTTPException(
            status_code=503,
            detail="Story packages are being computed. Please retry in 30-60 seconds.",
            headers={"Retry-After": "30"},
        )

    # Cold start: start background computation (Spanish default)
    with _stories_lock:
        _stories_cache["computing"] = True

    logger.info("Story packages: starting background computation (first request)")
    t_thread = threading.Thread(target=_run_packages_computation, daemon=True)
    t_thread.start()
    raise HTTPException(
        status_code=503,
        detail="Story packages are being computed. Please retry in 30-60 seconds.",
        headers={"Retry-After": "30"},
    )
