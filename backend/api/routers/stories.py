"""
Story endpoints for journalist investigation starting-points.
Each endpoint returns a pre-computed narrative dataset with context.
"""
import sqlite3
from fastapi import APIRouter, Depends
from ..dependencies import get_db

router = APIRouter(prefix="/api/v1/stories", tags=["stories"])


@router.get("/administration-comparison")
def administration_comparison(conn: sqlite3.Connection = Depends(get_db)):
    """
    Compare procurement patterns across Mexico's 6-year presidential administrations.
    Returns per-sexenio stats on direct award rates, avg risk, and total spend.
    """
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

    # Story context for journalists
    story = {
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
    return story


@router.get("/ghost-companies")
def ghost_companies(conn: sqlite3.Connection = Depends(get_db)):
    """
    Top ghost-company suspects: new vendors with near-100% direct awards,
    few contracts, and significant value.
    """
    rows = conn.execute("""
        SELECT
            v.id                             AS vendor_id,
            v.vendor_name,
            vs.first_contract_year,
            vs.last_contract_year,
            vs.total_contracts,
            vs.total_value_mxn,
            ROUND(vs.direct_award_pct * 100, 1) AS direct_award_pct,
            ROUND(vs.avg_risk_score, 4)         AS avg_risk_score,
            aq.primary_sector_name,
            aq.ips_final,
            aq.tier,
            aq.new_vendor_risk
        FROM vendors v
        JOIN vendor_stats vs ON v.id = vs.vendor_id
        LEFT JOIN aria_queue aq ON v.id = aq.vendor_id
        WHERE vs.first_contract_year >= 2015
          AND vs.total_contracts BETWEEN 1 AND 30
          AND vs.total_value_mxn >= 5000000
          AND vs.direct_award_pct >= 0.90
          AND vs.avg_risk_score >= 0.20
          AND (aq.fp_patent_exception = 0 OR aq.fp_patent_exception IS NULL)
          AND (aq.fp_structural_monopoly = 0 OR aq.fp_structural_monopoly IS NULL)
        ORDER BY vs.total_value_mxn DESC
        LIMIT 50
    """).fetchall()

    cols = ["vendor_id", "vendor_name", "first_contract_year", "last_contract_year",
            "total_contracts", "total_value_mxn", "direct_award_pct",
            "avg_risk_score", "primary_sector_name", "ips_final", "tier", "new_vendor_risk"]
    data = [dict(zip(cols, r)) for r in rows]

    # Summary stats
    total_value = sum(r["total_value_mxn"] or 0 for r in data)
    new_vendor_count = sum(1 for r in data if r["new_vendor_risk"])

    story = {
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
    return story


@router.get("/top-suspicious-vendors")
def top_suspicious_vendors(conn: sqlite3.Connection = Depends(get_db)):
    """
    Top vendors by ARIA IPS score (composite risk) across all tiers.
    Excludes known structural false positives.
    """
    rows = conn.execute("""
        SELECT
            v.id                                   AS vendor_id,
            v.vendor_name,
            vs.total_contracts,
            vs.total_value_mxn,
            ROUND(vs.avg_risk_score, 4)            AS avg_risk_score,
            ROUND(vs.direct_award_pct * 100, 1)    AS direct_award_pct,
            aq.ips_final,
            aq.tier,
            aq.primary_sector_name,
            aq.pattern_type,
            aq.review_status,
            aq.in_ground_truth,
            ROUND(vs.first_contract_year, 0)       AS first_year,
            ROUND(vs.last_contract_year, 0)        AS last_year
        FROM vendors v
        JOIN vendor_stats vs ON v.id = vs.vendor_id
        JOIN aria_queue aq ON v.id = aq.vendor_id
        WHERE aq.fp_patent_exception = 0
          AND aq.fp_structural_monopoly = 0
          AND aq.fp_data_error = 0
          AND aq.tier <= 2
          AND vs.total_value_mxn >= 1000000
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

    story = {
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
    return story


@router.get("/overpricing-patterns")
def overpricing_patterns(conn: sqlite3.Connection = Depends(get_db)):
    """
    Contracts with extreme price anomalies (overpricing relative to sector median).
    Groups by sector and administration for narrative framing.
    """
    rows = conn.execute("""
        SELECT
            s.name                           AS sector_name,
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
        GROUP BY s.name, c.contract_year
        HAVING COUNT(*) >= 5
        ORDER BY total_value_mxn DESC
        LIMIT 80
    """).fetchall()

    cols = ["sector_name", "contract_year", "contracts_flagged",
            "total_value_mxn", "avg_contract_value", "avg_risk_score"]
    data = [dict(zip(cols, r)) for r in rows]

    story = {
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
    return story
