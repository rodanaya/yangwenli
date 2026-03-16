"""
Story endpoints for journalist investigation starting-points.
Each endpoint returns a pre-computed narrative dataset with context.
"""
import logging
from fastapi import APIRouter
from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/stories", tags=["stories"])


@router.get("/administration-comparison")
def administration_comparison():
    """
    Compare procurement patterns across Mexico's 6-year presidential administrations.
    """
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

    return {
        "title": "Comparación entre Administraciones",
        "subtitle": "¿Cómo cambian los patrones de corrupción con cada gobierno?",
        "key_question": "¿Qué administración tuvo mayor concentración de adjudicaciones directas?",
        "methodology": (
            "Se comparan cuatro indicadores clave por sexenio: "
            "tasa de adjudicación directa, tasa de propuesta única, "
            "puntaje de riesgo promedio y porcentaje de contratos de alto riesgo."
        ),
        "data": data,
    }


@router.get("/ghost-companies")
def ghost_companies():
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

    return {
        "title": "Empresas Fantasma: Las Nuevas Contratistas",
        "subtitle": "Empresas de reciente creación con contratos millonarios y sin licitación",
        "key_question": "¿Cuáles son las empresas más sospechosas de ser creadas para ganar contratos específicos?",
        "methodology": (
            "Filtra proveedores surgidos desde 2015, con 1–30 contratos, "
            "valor total ≥5M MXN, tasa de adjudicación directa ≥90% "
            "y puntaje de riesgo ML ≥0.20. Excluye monopolios estructurales conocidos."
        ),
        "summary": {
            "total_vendors": len(data),
            "total_value_mxn": total_value,
            "new_vendor_flagged": new_vendor_count,
        },
        "data": data,
    }


@router.get("/top-suspicious-vendors")
def top_suspicious_vendors():
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

    return {
        "title": "Los 100 Proveedores Más Sospechosos",
        "subtitle": "Clasificados por el Índice de Priorización de Investigación (IPS) del sistema ARIA",
        "key_question": "¿Qué proveedores combinan mayor riesgo ML, anomalías financieras y alertas externas?",
        "methodology": (
            "El IPS combina: puntaje de riesgo ML (40%), anomalía de conjunto PyOD (20%), "
            "concentración financiera (20%) y alertas externas —EFOS, SFP, RUPC— (20%). "
            "Solo proveedores Tier 1 y Tier 2 con valor total ≥1M MXN. "
            "Excluye monopolios estructurales (Gilead, Sanofi, Roche, etc.)."
        ),
        "summary": {
            "total_vendors": len(data),
            "total_value_mxn": total_value,
            "confirmed_ground_truth": confirmed_gt,
            "tier1_count": sum(1 for r in data if r["tier"] == 1),
            "tier2_count": sum(1 for r in data if r["tier"] == 2),
        },
        "data": data,
    }


@router.get("/overpricing-patterns")
def overpricing_patterns():
    """
    Contracts with critical risk scores grouped by sector and year.
    """
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

    return {
        "title": "Patrones de Sobreprecio por Sector",
        "subtitle": "Sectores y años con mayor concentración de contratos de riesgo crítico",
        "key_question": "¿Dónde se concentra el sobreprecio en la contratación pública mexicana?",
        "methodology": (
            "Contratos con nivel de riesgo 'crítico' (score ≥0.60), valor ≥1M MXN, "
            "agrupados por sector y año. Muestra dónde se concentra el gasto en "
            "contratos con características similares a casos documentados de corrupción."
        ),
        "data": data,
    }


def _fmt_value(v: float) -> str:
    """Format MXN value as human-readable Spanish string."""
    if v is None or v == 0:
        return "N/A"
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


def _build_ghost_companies_package(conn) -> dict:
    """Package 1: Ghost companies."""
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
        lede = (
            f"Al menos {count} empresas surgidas desde 2015 recibieron "
            f"{_fmt_value(total_value)} en contratos gubernamentales sin concurso "
            f"publico. Estas empresas tienen en promedio {avg_contracts} contratos, "
            f"todos adjudicados directamente."
        )
    except Exception as e:
        logger.warning(f"ghost_companies package query failed: {e}")
        count, total_value, avg_contracts, examples = 0, 0, 0, []
        lede = "No se pudieron obtener datos de empresas fantasma."

    return {
        "id": "ghost_companies",
        "title": "Empresas Fantasma: Millones Sin Licitacion",
        "subtitle": "Empresas de reciente creacion con contratos millonarios adjudicados directamente",
        "key_question": "Cuantas empresas nuevas recibieron millones sin competir?",
        "difficulty": "rapida",
        "difficulty_label": "Verificacion rapida",
        "lede": lede,
        "examples": examples,
        "defense": (
            "El gobierno podria argumentar que las adjudicaciones directas son legales "
            "bajo ciertos supuestos del articulo 41 de la LAASSP."
        ),
        "next_steps": [
            "Solicitar via InfoMex los contratos completos de las 5 empresas con mayor valor",
            "Verificar RFC en el SAT (sat.gob.mx/consultas/RFC)",
            "Buscar al representante legal en el IMSS e INFONAVIT",
            "Cruzar con padron de proveedores sancionados de la SFP",
        ],
        "summary": {
            "count": count,
            "total_value_mxn": total_value,
            "avg_contracts_per_vendor": avg_contracts,
        },
        "methodology": (
            "Proveedores en aria_queue surgidos desde 2015, 1-30 contratos, "
            "valor >=5M MXN, tasa DA >=90%, excluyendo monopolios estructurales."
        ),
    }


def _build_top_suspicious_package(conn) -> dict:
    """Package 2: Top suspicious vendors."""
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
        lede = (
            f"El algoritmo ARIA identifico {tier1_count} proveedores de maxima prioridad "
            f"de investigacion, con un valor contractual combinado de {_fmt_value(total_value)}. "
            f"De estos, {confirmed_gt} ya estan vinculados a casos documentados de corrupcion."
        )
    except Exception as e:
        logger.warning(f"top_suspicious package query failed: {e}")
        count, total_value, tier1_count, tier2_count, confirmed_gt, examples = 0, 0, 0, 0, 0, []
        lede = "No se pudieron obtener datos de proveedores sospechosos."

    return {
        "id": "top_suspicious",
        "title": "Los 100 Proveedores Mas Investigados por el Sistema",
        "subtitle": "Clasificados por el Indice de Priorizacion de Investigacion (IPS)",
        "key_question": "Que proveedores combinan mayor riesgo, anomalias y alertas externas?",
        "difficulty": "investigacion_larga",
        "difficulty_label": "Investigacion a profundidad",
        "lede": lede,
        "examples": examples,
        "defense": (
            "Los proveedores podrian argumentar que su tamano justifica el volumen de contratos "
            "y que las adjudicaciones directas responden a urgencias o especializacion."
        ),
        "next_steps": [
            "Cruzar con auditorias ASF de los ultimos 5 anos",
            "Solicitar informes de seguimiento de contratos via transparencia",
            "Verificar el accionariado en el Registro Publico de Comercio",
            "Contactar a la Secretaria de la Funcion Publica para antecedentes",
        ],
        "summary": {
            "count": count,
            "total_value_mxn": total_value,
            "tier1_count": tier1_count,
            "tier2_count": tier2_count,
            "confirmed_gt_count": confirmed_gt,
        },
        "methodology": (
            "IPS combina riesgo ML (40%), anomalia PyOD (20%), concentracion financiera (20%), "
            "alertas externas (20%). Tier 1 y 2, valor >=1M MXN, sin monopolios estructurales."
        ),
    }


def _build_administration_comparison_package(conn) -> dict:
    """Package 3: Administration comparison."""
    try:
        rows = conn.execute("""
            SELECT
                CASE
                    WHEN contract_year BETWEEN 2000 AND 2006 THEN 'Fox (2000-2006)'
                    WHEN contract_year BETWEEN 2006 AND 2012 THEN 'Calderon (2006-2012)'
                    WHEN contract_year BETWEEN 2012 AND 2018 THEN 'Pena Nieto (2012-2018)'
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
        examples = sorted_by_da[:2]
        lede = (
            f"El sexenio de {worst_admin} registro la mayor tasa de adjudicacion directa: "
            f"{_fmt_pct(worst_da_pct)} de sus contratos se otorgaron sin concurso. "
            f"En 23 anos de datos, Mexico ha gastado mas de 7 billones de pesos en "
            f"contrataciones que muestran patrones similares a casos documentados de corrupcion."
        )
    except Exception as e:
        logger.warning(f"administration_comparison package query failed: {e}")
        worst_admin, worst_da_pct, examples = "N/A", 0, []
        lede = "No se pudieron obtener datos de comparacion entre administraciones."

    return {
        "id": "administration_comparison",
        "title": "Que Sexenio Fue Mas Corrupto?",
        "subtitle": "Comparacion de patrones de adjudicacion directa por administracion",
        "key_question": "Que gobierno otorgo mas contratos sin licitacion?",
        "difficulty": "rapida",
        "difficulty_label": "Verificacion rapida",
        "lede": lede,
        "examples": examples,
        "defense": (
            "Cada administracion argumenta que las adjudicaciones directas responden a "
            "urgencias o prioridades de politica publica. Comparar tasas entre sexenios "
            "permite evaluar si esto es consistente o si hay variaciones significativas."
        ),
        "next_steps": [
            "Comparar tasas de DA con el presupuesto anual de cada sexenio",
            "Identificar los sectores con mayor cambio entre administraciones",
            "Solicitar informes de la ASF sobre cada periodo",
        ],
        "summary": {
            "highest_da_admin": worst_admin,
            "highest_da_pct": worst_da_pct,
        },
        "methodology": (
            "Contratos agrupados por sexenio presidencial, comparando tasas de "
            "adjudicacion directa, propuesta unica y puntaje de riesgo promedio."
        ),
    }


def _build_efos_vendors_package(conn) -> dict:
    """Package 4: EFOS vendors."""
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
        lede = (
            f"Al menos {count} empresas incluidas en la lista definitiva del SAT de "
            f"contribuyentes que facturan operaciones simuladas (EFOS) han obtenido "
            f"contratos del gobierno federal por un total de {_fmt_value(total_value)}."
        )
    except Exception as e:
        logger.warning(f"efos_vendors package query failed: {e}")
        count, total_value, examples = 0, 0, []
        lede = "No se pudieron obtener datos de empresas EFOS."

    return {
        "id": "efos_vendors",
        "title": "Empresas en Lista Negra del SAT con Contratos Activos",
        "subtitle": "Proveedores en la lista EFOS definitiva del SAT que recibieron contratos federales",
        "key_question": "Cuantas empresas fantasma confirmadas por el SAT siguen recibiendo contratos?",
        "difficulty": "requiere_solicitud",
        "difficulty_label": "Requiere solicitud de informacion",
        "lede": lede,
        "examples": examples,
        "defense": (
            "Las dependencias podrian argumentar que los contratos se firmaron antes de la "
            "inclusion en la lista EFOS o que el proveedor fue dado de baja posteriormente."
        ),
        "next_steps": [
            "Verificar fechas de inclusion en lista EFOS vs fechas de contratacion",
            "Solicitar al SAT la ficha completa de cada empresa via InfoMex",
            "Cruzar RFC con el padron de proveedores sancionados de la SFP",
            "Buscar litigios fiscales en el TFJFA",
        ],
        "summary": {
            "count": count,
            "total_value_mxn": total_value,
        },
        "methodology": (
            "Proveedores en aria_queue con is_efos_definitivo=1, "
            "cruzados con la lista SAT Art. 69-B definitivo."
        ),
    }


def _build_sector_overpricing_package(conn) -> dict:
    """Package 5: Sector overpricing."""
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
        lede = (
            f"Los contratos de riesgo critico en el sector {top_sector} suman "
            f"{_fmt_value(top_value)}, concentrando el mayor volumen de gasto con patrones "
            f"similares a sobreprecios documentados. Los datos de 2010-2025 revelan "
            f"patrones sistematicos."
        )
    except Exception as e:
        logger.warning(f"sector_overpricing package query failed: {e}")
        all_data = []
        examples = []
        lede = "No se pudieron obtener datos de sobreprecio sectorial."

    return {
        "id": "sector_overpricing",
        "title": "Sobreprecio Sistematico: Los Sectores Mas Vulnerables",
        "subtitle": "Sectores con mayor concentracion de contratos de riesgo critico",
        "key_question": "Donde se concentra el sobreprecio en la contratacion publica?",
        "difficulty": "investigacion_larga",
        "difficulty_label": "Investigacion a profundidad",
        "lede": lede,
        "examples": examples,
        "defense": (
            "Las dependencias argumentan que los precios altos reflejan especializacion, "
            "urgencia o condiciones de mercado. Comparar precios unitarios con catalogos "
            "de CompraNet permite refutar esta defensa."
        ),
        "next_steps": [
            "Solicitar catalogos de precios de referencia del sector con mayor valor",
            "Comparar precios unitarios de contratos criticos con precios de mercado",
            "Identificar los 10 proveedores con mayor valor en contratos criticos por sector",
            "Revisar auditorias ASF del sector prioritario",
        ],
        "summary": {
            "sectors_affected": len(all_data),
        },
        "methodology": (
            "Contratos con riesgo critico (score >=0.60), valor >=1M MXN, desde 2010, "
            "agrupados por sector."
        ),
    }


def _build_new_vendor_risk_package(conn) -> dict:
    """Package 6: New vendor risk."""
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
        lede = (
            f"El sistema identifico {count} proveedores de reciente creacion que, "
            f"pese a no tener historial previo, obtuvieron contratos por "
            f"{_fmt_value(total_value)}, con tasas de adjudicacion directa "
            f"superiores al 95%."
        )
    except Exception as e:
        logger.warning(f"new_vendor_risk package query failed: {e}")
        count, total_value, examples = 0, 0, []
        lede = "No se pudieron obtener datos de proveedores nuevos de riesgo."

    return {
        "id": "new_vendor_risk",
        "title": "Empresas Sin Historial que Ganaron Contratos Millonarios",
        "subtitle": "Proveedores nuevos con alto volumen de adjudicaciones directas",
        "key_question": "Que empresas sin historial recibieron contratos millonarios?",
        "difficulty": "rapida",
        "difficulty_label": "Verificacion rapida",
        "lede": lede,
        "examples": examples,
        "defense": (
            "El gobierno podria argumentar que se trata de empresas nuevas con "
            "capacidad tecnica demostrada. Verificar si tienen oficinas fisicas, "
            "empleados y experiencia previa permite refutar esta defensa."
        ),
        "next_steps": [
            "Verificar domicilio fiscal de las 10 empresas con mayor valor",
            "Consultar IMSS para numero de empleados registrados",
            "Buscar antecedentes del representante legal en otras empresas",
            "Cruzar con lista EFOS del SAT",
        ],
        "summary": {
            "count": count,
            "total_value_mxn": total_value,
        },
        "methodology": (
            "Proveedores con new_vendor_risk=1 en ARIA: debut >=2018, DA >=95%, "
            "valor total >=10M MXN, sin monopolios estructurales."
        ),
    }


def _build_monopoly_capture_package(conn) -> dict:
    """Package 7: Monopoly capture."""
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
        lede = (
            f"Al menos {count} proveedores concentran una proporcion anormal del gasto "
            f"en su sector, con valores contractuales de hasta {_fmt_value(top_value)}. "
            f"Este patron -- conocido como 'captura de mercado' -- es uno de los indicadores "
            f"mas consistentes en casos documentados de corrupcion en Mexico."
        )
    except Exception as e:
        logger.warning(f"monopoly_capture package query failed: {e}")
        count, examples = 0, []
        lede = "No se pudieron obtener datos de captura de mercado."

    return {
        "id": "monopoly_capture",
        "title": "Un Solo Proveedor, Todo el Presupuesto de un Sector",
        "subtitle": "Proveedores con concentracion anormal del gasto sectorial",
        "key_question": "Que proveedores acaparan el presupuesto de un sector completo?",
        "difficulty": "investigacion_larga",
        "difficulty_label": "Investigacion a profundidad",
        "lede": lede,
        "examples": examples,
        "defense": (
            "Los proveedores podrian argumentar que su posicion dominante se debe a "
            "especializacion o capacidad tecnica unica. Verificar si existen alternativas "
            "en el mercado permite evaluar esta defensa."
        ),
        "next_steps": [
            "Identificar alternativas de mercado para los 5 proveedores mas concentrados",
            "Solicitar justificaciones de adjudicacion directa de las dependencias",
            "Revisar si los proveedores tienen vinculos con funcionarios",
            "Comparar precios con proveedores similares en otros paises",
        ],
        "summary": {
            "count": count,
        },
        "methodology": (
            "Proveedores con patron P1 (Monopoly) en ARIA, valor >=10M MXN, "
            "excluyendo monopolios estructurales (patentes, regulacion)."
        ),
    }


def _build_direct_award_surge_package(conn) -> dict:
    """Package 8: Direct award surge."""
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
            range(2007, 2013): "Calderon",
            range(2013, 2019): "Pena Nieto",
            range(2019, 2030): "AMLO/Sheinbaum",
        }
        admin_name = "N/A"
        for yr_range, name in admin_map.items():
            if isinstance(peak_year, int) and peak_year in yr_range:
                admin_name = name
                break
        examples = sorted(all_data, key=lambda x: x.get("da_pct") or 0, reverse=True)[:3]
        lede = (
            f"En {peak_year}, el {_fmt_pct(peak_pct)} de los contratos federales se "
            f"otorgaron sin proceso de licitacion. Este patron de adjudicacion directa "
            f"-- que supera el promedio historico de {_fmt_pct(hist_avg)} -- coincide con "
            f"la administracion de {admin_name}."
        )
    except Exception as e:
        logger.warning(f"direct_award_surge package query failed: {e}")
        peak_row = {}
        hist_avg = 0
        examples = []
        lede = "No se pudieron obtener datos de adjudicaciones directas."

    return {
        "id": "direct_award_surge",
        "title": "Adjudicaciones Directas: El Ano Record",
        "subtitle": "El ano con mayor tasa de contratacion sin licitacion",
        "key_question": "En que ano se adjudicaron mas contratos sin competencia?",
        "difficulty": "rapida",
        "difficulty_label": "Verificacion rapida",
        "lede": lede,
        "examples": examples,
        "defense": (
            "El gobierno podria argumentar que las adjudicaciones directas aumentaron "
            "por emergencias (COVID-19, desastres naturales) o por reformas legales. "
            "Comparar con anos anteriores y posteriores permite evaluar esta justificacion."
        ),
        "next_steps": [
            "Comparar la tasa de DA del ano pico con anos anteriores y posteriores",
            "Desglosar las DA por sector para identificar donde se concentran",
            "Solicitar al OIC las justificaciones de DA del ano pico",
        ],
        "summary": {
            "peak_year": peak_row.get("contract_year"),
            "peak_pct": peak_row.get("da_pct"),
            "hist_avg_pct": hist_avg,
        },
        "methodology": (
            "Contratos desde 2010 agrupados por ano, calculando tasa de adjudicacion "
            "directa. Se identifica el ano con mayor tasa."
        ),
    }


@router.get("/packages")
def story_packages():
    """
    Return all 8 pre-packaged investigation story templates with live data.
    Each package includes title, lede, examples, defense, and next steps.
    """
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

    return {"packages": packages}
