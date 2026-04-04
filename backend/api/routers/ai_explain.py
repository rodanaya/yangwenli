"""
AI-powered contract explanation endpoint.
Uses Claude to generate plain-language explanations of procurement risk flags.
"""
import os
import logging
import sqlite3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

FEATURE_LABELS = {
    "z_vendor_concentration": "concentracion de proveedor",
    "z_single_bid": "licitacion con un solo postor",
    "z_direct_award": "adjudicacion directa",
    "z_price_ratio": "precio vs mediana del sector",
    "z_ad_period_days": "periodo de publicacion corto",
    "z_year_end": "contrato de fin de ano",
    "z_same_day_count": "contratos el mismo dia",
    "z_network_member_count": "tamano de red de proveedores",
    "z_price_volatility": "volatilidad de precios del proveedor",
    "z_win_rate": "tasa de adjudicacion anomala",
    "z_industry_mismatch": "industria no coincide con el sector",
    "z_institution_risk": "riesgo institucional",
    "z_co_bid_rate": "tasa de co-licitacion",
    "z_price_hyp_confidence": "confianza de hipotesis de precio",
    "z_sector_spread": "diversificacion sectorial",
    "z_institution_diversity": "diversificacion institucional",
}


class ExplainResponse(BaseModel):
    contract_id: int
    explanation: str
    language: str = "es"
    model: str
    available: bool


@router.get("/contracts/{contract_id}/explain", response_model=ExplainResponse)
def explain_contract(contract_id: int):
    """
    Generate a plain-language explanation of why a contract is flagged.
    Requires ANTHROPIC_API_KEY environment variable.
    Returns 503 if AI is not configured.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AI explanation not configured. Set ANTHROPIC_API_KEY environment variable.",
        )

    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        contract = conn.execute(
            """
            SELECT c.id, c.title, c.amount_mxn, c.risk_score, c.risk_level,
                   c.contract_date, c.is_direct_award, c.is_single_bid,
                   c.risk_confidence_lower, c.risk_confidence_upper,
                   v.name as vendor_name, v.rfc as vendor_rfc,
                   i.name as institution_name,
                   s.name as sector_name
            FROM contracts c
            LEFT JOIN vendors v ON c.vendor_id = v.id
            LEFT JOIN institutions i ON c.institution_id = i.id
            LEFT JOIN sectors s ON c.sector_id = s.id
            WHERE c.id = ?
            """,
            (contract_id,),
        ).fetchone()

        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")

        try:
            features = conn.execute(
                "SELECT * FROM contract_z_features WHERE contract_id = ?",
                (contract_id,),
            ).fetchone()
        except sqlite3.OperationalError:
            features = None

    # Build feature context
    feature_context = ""
    if features:
        feature_dict = dict(features)
        scored_features = [
            (k, v)
            for k, v in feature_dict.items()
            if k.startswith("z_") and isinstance(v, (int, float)) and v is not None
        ]
        scored_features.sort(key=lambda x: abs(x[1]), reverse=True)
        top_features = scored_features[:5]
        feature_lines = []
        for feat_key, z_val in top_features:
            label = FEATURE_LABELS.get(feat_key, feat_key)
            direction = "alto riesgo" if z_val > 0 else "menor riesgo"
            feature_lines.append(f"- {label}: z={z_val:.2f} ({direction})")
        feature_context = "\n".join(feature_lines)

    # Format amount
    amount = contract["amount_mxn"] or 0
    if amount >= 1_000_000_000:
        amount_str = f"${amount / 1_000_000_000:.1f} mil millones MXN"
    elif amount >= 1_000_000:
        amount_str = f"${amount / 1_000_000:.1f} millones MXN"
    else:
        amount_str = f"${amount:,.0f} MXN"

    procedure = "adjudicacion directa" if contract["is_direct_award"] else "licitacion publica"
    if contract["is_single_bid"]:
        procedure += " con un solo postor"

    risk_level = contract["risk_level"] or "desconocido"
    risk_score = contract["risk_score"] or 0

    prompt = (
        "Eres un analista experto en contrataciones publicas mexicanas para la "
        "plataforma RUBLI de deteccion de corrupcion.\n\n"
        "Contrato analizado:\n"
        f"- Titulo: {contract['title'] or 'Sin titulo'}\n"
        f"- Institucion: {contract['institution_name'] or 'No especificada'}\n"
        f"- Proveedor: {contract['vendor_name'] or 'No especificado'} "
        f"(RFC: {contract['vendor_rfc'] or 'N/A'})\n"
        f"- Monto: {amount_str}\n"
        f"- Fecha: {contract['contract_date'] or 'No especificada'}\n"
        f"- Procedimiento: {procedure}\n"
        f"- Puntuacion de riesgo: {risk_score:.2f} ({risk_level})\n\n"
        f"Indicadores de riesgo (z-scores vs sector):\n"
        f"{feature_context or 'No disponibles'}\n\n"
        "En 2-3 parrafos concisos en espanol, explica:\n"
        f"1. Por que este contrato tiene una puntuacion de riesgo {risk_level} "
        "-- usa los indicadores especificos\n"
        "2. Que significan estos indicadores para un periodista o investigador\n"
        "3. Que deberia verificar un investigador a continuacion\n\n"
        "Importante: No afirmes que hubo corrupcion. Usa lenguaje como "
        '"indica", "sugiere", "es consistente con patrones de". '
        "Se especifico con los numeros. Maximo 200 palabras."
    )

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        explanation = message.content[0].text
        model_used = "claude-haiku-4-5-20251001"
    except Exception as e:
        logger.error("Claude API error for contract %d: %s", contract_id, e)
        raise HTTPException(
            status_code=502, detail=f"AI service error: {type(e).__name__}"
        )

    return ExplainResponse(
        contract_id=contract_id,
        explanation=explanation,
        model=model_used,
        available=True,
    )
