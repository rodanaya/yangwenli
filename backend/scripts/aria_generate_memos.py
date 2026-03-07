#!/usr/bin/env python3
"""
ARIA Phase 3: LLM Investigation Memo Generator

Generates Spanish-language investigation memos for Tier 1/2 vendors
using the Claude API with web search for media evidence gathering.

Usage:
    python -m scripts.aria_generate_memos --tier 1 --limit 10
    python -m scripts.aria_generate_memos --vendor-id 12345
    python -m scripts.aria_generate_memos --dry-run --tier 1 --limit 3
    python -m scripts.aria_generate_memos --web-search --tier 1 --limit 5
"""

import argparse
import json
import logging
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

# Check for anthropic SDK
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
MODEL = "claude-sonnet-4-6"
MAX_MEMO_TOKENS = 1800
MEMO_TEMPERATURE = 0.2

PATTERN_NAMES = {
    "P1": "Monopolio concentrado",
    "P2": "Empresa fantasma",
    "P3": "Intermediario de paso único",
    "P4": "Manipulación de licitaciones",
    "P5": "Sobreprecio",
    "P6": "Captura institucional",
    "P7": "Conflicto de interés",
}

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Step 1: Web evidence gathering
# ---------------------------------------------------------------------------

def gather_web_evidence(
    vendor_name: str,
    rfc: str,
    institution_name: str,
    client: "anthropic.Anthropic",
    vendor_id: int,
    conn: sqlite3.Connection,
    run_id: str,
) -> list:
    """
    Uses Claude with web_search tool to find public media/registry evidence.
    Returns list of evidence dicts.
    """
    queries = [
        f'"{vendor_name}" corrupción México contrato gobierno',
        f'"{vendor_name}" ASF auditoría observación irregularidades',
        f'"{vendor_name}" Animal Político OR Proceso OR Latinus',
    ]
    if rfc:
        queries.append(f"RFC {rfc} EFOS México empresa fantasma")
    if institution_name:
        queries.append(f'"{vendor_name}" "{institution_name}" irregularidades')

    evidence_items = []

    for query in queries:
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=800,
                tools=[{"type": "web_search_20250305", "name": "web_search"}],
                messages=[{
                    "role": "user",
                    "content": (
                        "Busca evidencia pública sobre este proveedor gubernamental mexicano. "
                        f"Consulta: {query}. "
                        "Devuelve solo resultados relevantes con URL, fecha y fragmento de texto."
                    ),
                }],
            )

            for block in response.content:
                if hasattr(block, "text") and block.text:
                    evidence_items.append({
                        "query": query,
                        "source_name": "web_search",
                        "snippet": block.text[:500],
                        "relevance_score": 0.7,
                    })
                    break
        except Exception as e:
            logger.warning(f"Web search failed for query '{query[:50]}': {e}")
            continue

    # Store in DB
    for item in evidence_items:
        try:
            conn.execute(
                """
                INSERT OR IGNORE INTO aria_web_evidence
                    (vendor_id, aria_run_id, query, source_name, snippet, relevance_score)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    vendor_id,
                    run_id,
                    item["query"],
                    item.get("source_name"),
                    item.get("snippet"),
                    item.get("relevance_score", 0),
                ),
            )
        except Exception:
            pass
    conn.commit()

    return evidence_items


# ---------------------------------------------------------------------------
# Step 2: Build evidence package
# ---------------------------------------------------------------------------

def build_evidence_package(row: dict, conn: sqlite3.Connection) -> dict:
    """Build the structured JSON context for Claude memo generation."""

    # Parse pattern confidences
    try:
        pattern_confidences = json.loads(row.get("pattern_confidences") or "{}")
    except Exception:
        pattern_confidences = {}

    # Get top SHAP features if available
    shap_features = []
    try:
        shap_rows = conn.execute(
            """
            SELECT feature_name, shap_value FROM vendor_shap_v52
            WHERE vendor_id = ?
            ORDER BY ABS(shap_value) DESC LIMIT 3
            """,
            (row["vendor_id"],),
        ).fetchall()
        shap_features = [
            {"feature": r[0], "shap_value": round(r[1], 4)}
            for r in shap_rows
        ]
    except Exception:
        pass

    # Get contract sample (up to 5 most recent significant contracts)
    contract_sample = []
    try:
        contracts = conn.execute(
            """
            SELECT contract_year, amount_mxn, procedure_type, is_direct_award
            FROM contracts
            WHERE vendor_id = ? AND amount_mxn > 0 AND amount_mxn < 100000000000
            ORDER BY amount_mxn DESC LIMIT 5
            """,
            (row["vendor_id"],),
        ).fetchall()
        contract_sample = [
            {
                "year": r[0],
                "amount_mxn": r[1],
                "procedure": r[2],
                "direct_award": bool(r[3]),
            }
            for r in contracts
        ]
    except Exception:
        pass

    # Map primary pattern to comparable GT cases
    comparable_cases = []
    primary_pattern = row.get("primary_pattern")
    if primary_pattern:
        case_map = {
            "P1": ["IMSS Ghost Company Network", "Segalmex Food Distribution"],
            "P2": ["La Estafa Maestra", "SAT EFOS Ghost Network", "BAHUD PROCESSING"],
            "P3": ["BIRMEX Vaccine Intermediary"],
            "P4": ["IPN Cartel de la Limpieza", "SixSigma Tender Rigging"],
            "P5": ["Cyber Robotic IT", "ISSSTE Ambulance Leasing"],
            "P6": ["PEMEX-Cotemar", "Constructora Garza Ponce"],
            "P7": ["Grupo Higa / Casa Blanca", "Odebrecht-PEMEX"],
        }
        comparable_cases = case_map.get(primary_pattern, [])

    # Get cached web evidence
    web_evidence = []
    try:
        ev_rows = conn.execute(
            """
            SELECT source_name, source_url, snippet, published_date, relevance_score
            FROM aria_web_evidence
            WHERE vendor_id = ?
            ORDER BY relevance_score DESC LIMIT 5
            """,
            (row["vendor_id"],),
        ).fetchall()
        web_evidence = [
            {"source": r[0], "url": r[1], "snippet": r[2], "date": r[3]}
            for r in ev_rows
            if r[2]
        ]
    except Exception:
        pass

    return {
        "vendor": {
            "name": row.get("vendor_name"),
            "rfc": row.get("efos_rfc") or "No registrado",
            "sector": row.get("primary_sector_name") or "No clasificado",
            "years_active": row.get("years_active") or 0,
            "total_value_mxn": row.get("total_value_mxn") or 0,
            "contract_count": row.get("total_contracts") or 0,
        },
        "scores": {
            "ips_final": round(row.get("ips_final") or 0, 4),
            "ips_tier": row.get("ips_tier"),
            "risk_score": round(row.get("avg_risk_score") or 0, 4),
            "mahalanobis_norm": round(row.get("mahalanobis_norm") or 0, 4),
            "burst_score": round(row.get("burst_score") or 0, 4),
            "fp_penalty": round(row.get("fp_penalty") or 0, 4),
        },
        "patterns": [
            {
                "type": k,
                "name": PATTERN_NAMES.get(k, k),
                "confidence": round(v, 3),
            }
            for k, v in sorted(
                pattern_confidences.items(), key=lambda x: -x[1]
            )
            if v >= 0.20
        ],
        "shap_top3": shap_features,
        "external_flags": {
            "is_efos": bool(row.get("is_efos_definitivo")),
            "is_sfp_sanctioned": bool(row.get("is_sfp_sanctioned")),
            "in_ground_truth": bool(row.get("in_ground_truth")),
            "efos_rfc": row.get("efos_rfc"),
            "sfp_type": row.get("sfp_sanction_type"),
        },
        "fp_screens": {
            "fp1_patent": bool(row.get("fp_patent_exception")),
            "fp2_data_error": bool(row.get("fp_data_error")),
            "fp3_structural": bool(row.get("fp_structural_monopoly")),
        },
        "comparable_gt_cases": comparable_cases,
        "web_evidence": web_evidence,
        "contract_sample": contract_sample,
    }


# ---------------------------------------------------------------------------
# Step 3: Generate memo via Claude API
# ---------------------------------------------------------------------------

MEMO_PROMPT = """\
Eres un analista de inteligencia financiera especializado en auditoría de contrataciones gubernamentales en México. Se te proporciona un paquete de evidencia estructurada sobre un proveedor del gobierno federal.

INSTRUCCIONES:
- Sé preciso, factual y conservador
- No afirmes corrupción sin evidencia sólida
- Cita valores numéricos concretos
- Si no hay evidencia pública, indícalo explícitamente

EVIDENCIA ESTRUCTURADA:
{evidence_json}

Redacta el memorando con EXACTAMENTE estas secciones:

## RESUMEN EJECUTIVO
(2-3 oraciones: qué hace el proveedor, por qué es sospechoso, magnitud financiera)

## PERFIL DEL PROVEEDOR
(Nombre, RFC, Sector, Años activo, Total contratos, Valor total MXN, Patrón detectado)

## SEÑALES DE RIESGO DETECTADAS
(Lista numerada con valores numéricos; ordenar por importancia)

## PATRÓN PROBABLE DE CORRUPCIÓN
(Patrón clasificado, nivel de confianza %, razón, caso comparable de referencia)

## EVIDENCIA PÚBLICA DISPONIBLE
(Si hay web_evidence: cita fuente + fecha + hallazgo exacto. Si no: "No se encontró cobertura pública del proveedor en medios especializados.")

## HIPÓTESIS ALTERNATIVAS
(Razones por las que podría NO ser corrupción; pantallas FP aplicadas)

## PREGUNTAS DE INVESTIGACIÓN SUGERIDAS
(5 preguntas concretas para un investigador)

## CLASIFICACIÓN RECOMENDADA
Acción: [AGREGAR_A_GT / REVISAR_URGENTE / REVISAR_RUTINA / DESCARTAR]
Confianza: [ALTA / MEDIA / BAJA]
Razón en 1 oración."""


def generate_memo(evidence_package: dict, client: "anthropic.Anthropic") -> str:
    """Generate investigation memo via Claude API."""
    evidence_json = json.dumps(evidence_package, ensure_ascii=False, indent=2)

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_MEMO_TOKENS,
        temperature=MEMO_TEMPERATURE,
        messages=[{
            "role": "user",
            "content": MEMO_PROMPT.format(evidence_json=evidence_json),
        }],
    )

    return response.content[0].text if response.content else ""


# ---------------------------------------------------------------------------
# Fallback: template memo (no LLM)
# ---------------------------------------------------------------------------

def generate_template_memo(evidence_package: dict) -> str:
    """Fallback: generate memo without LLM using string templates."""
    v = evidence_package["vendor"]
    s = evidence_package["scores"]
    patterns = evidence_package["patterns"]
    flags = evidence_package["external_flags"]

    top_pattern = patterns[0] if patterns else {"name": "No clasificado", "confidence": 0}

    alert_lines = []
    if flags["is_efos"]:
        alert_lines.append(
            "**ALERTA: RFC en lista EFOS definitivo del SAT (empresa fantasma confirmada)**"
        )
    if flags["is_sfp_sanctioned"]:
        sfp_type = flags.get("sfp_type") or "sanción activa"
        alert_lines.append(f"**ALERTA: Sancionado por SFP — {sfp_type}**")
    if flags["in_ground_truth"]:
        alert_lines.append("**En base de datos de casos documentados**")

    alerts_block = "\n".join(alert_lines)

    if flags["is_efos"]:
        action = "AGREGAR_A_GT"
        confidence = "ALTA"
    elif s["ips_final"] >= 0.80:
        action = "REVISAR_URGENTE"
        confidence = "ALTA"
    elif s["ips_final"] >= 0.60:
        action = "REVISAR_URGENTE"
        confidence = "MEDIA"
    else:
        action = "REVISAR_RUTINA"
        confidence = "BAJA"

    total_value = v["total_value_mxn"]
    total_value_fmt = f"{total_value:,.0f}"
    contract_count_fmt = f"{v['contract_count']:,}"

    return f"""## RESUMEN EJECUTIVO
Proveedor **{v['name']}** (RFC: {v['rfc']}) opera en el sector {v['sector']} con {contract_count_fmt} contratos por un valor total de **{total_value_fmt} MXN**. IPS: {s['ips_final']:.3f} (Tier {s['ips_tier']}). Patrón detectado: {top_pattern['name']} (confianza {top_pattern['confidence']:.0%}).

## PERFIL DEL PROVEEDOR
| Campo | Valor |
|-------|-------|
| Nombre | {v['name']} |
| RFC | {v['rfc']} |
| Sector | {v['sector']} |
| Años activo | {v['years_active']} |
| Total contratos | {contract_count_fmt} |
| Valor total | {total_value_fmt} MXN |
| Patrón | {top_pattern['name']} |

## SEÑALES DE RIESGO DETECTADAS
1. IPS Final: {s['ips_final']:.4f} — Tier {s['ips_tier']}
2. Risk Score Promedio: {s['risk_score']:.4f}
3. Mahalanobis Normalizado: {s['mahalanobis_norm']:.4f}
4. Burst Score: {s['burst_score']:.4f}
{alerts_block}

## PATRÓN PROBABLE DE CORRUPCIÓN
{top_pattern['name']} — Confianza: {top_pattern['confidence']:.0%}

## EVIDENCIA PÚBLICA DISPONIBLE
No se ejecutó búsqueda web (sin API key o modo plantilla). Revisar manualmente: Animal Político, Proceso, ASF Cuenta Pública.

## HIPÓTESIS ALTERNATIVAS
- Posible excepción legal (Art. 41 LAASSP) si es tecnología o patentes
- Error de datos si hay contratos con valores extremos

## PREGUNTAS DE INVESTIGACIÓN SUGERIDAS
1. ¿Cuál es la razón social registrada en el SAT?
2. ¿Quiénes son los representantes legales y accionistas?
3. ¿El objeto social coincide con los bienes/servicios contratados?
4. ¿Hay observaciones de la ASF en las Cuentas Públicas correspondientes?
5. ¿Existe cobertura periodística en Animal Político, Latinus o Proceso?

## CLASIFICACIÓN RECOMENDADA
Acción: {action}
Confianza: {confidence}
Generado por plantilla (sin LLM)."""


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def run_memo_generation(
    tier: int = None,
    vendor_id: int = None,
    limit: int = 20,
    dry_run: bool = False,
    use_web_search: bool = False,
) -> None:

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    client = None
    if api_key and HAS_ANTHROPIC:
        client = anthropic.Anthropic(api_key=api_key)
        logger.info("Claude API client initialized")
    else:
        logger.warning("No ANTHROPIC_API_KEY or anthropic SDK — using template fallback")

    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.row_factory = sqlite3.Row

    try:
        # Get run_id from latest aria_run
        run_row = conn.execute(
            "SELECT id FROM aria_runs ORDER BY started_at DESC LIMIT 1"
        ).fetchone()
        run_id = run_row[0] if run_row else "manual"

        # Build query for vendors needing memos
        query = """
            SELECT * FROM aria_queue
            WHERE (memo_text IS NULL OR memo_text = '')
        """
        params: list = []
        if vendor_id is not None:
            query += " AND vendor_id = ?"
            params.append(vendor_id)
        elif tier is not None:
            query += " AND ips_tier = ?"
            params.append(tier)
        else:
            query += " AND ips_tier <= 2"  # default: T1+T2

        query += " ORDER BY ips_final DESC"
        if limit:
            query += f" LIMIT {limit}"

        rows = [dict(r) for r in conn.execute(query, params).fetchall()]
        logger.info(f"Generating memos for {len(rows)} vendors...")

        generated = 0
        template_used = 0

        for idx, row in enumerate(rows):
            vname = (row.get("vendor_name") or "Unknown")[:50]
            ips = row.get("ips_final") or 0
            logger.info(f"  [{idx + 1}/{len(rows)}] {vname} (IPS={ips:.3f})")

            # Step 1: Web search (optional)
            if use_web_search and client and not dry_run:
                try:
                    web_items = gather_web_evidence(
                        vname,
                        row.get("efos_rfc"),
                        row.get("top_institution"),
                        client,
                        row["vendor_id"],
                        conn,
                        run_id,
                    )
                    logger.info(f"    Web evidence: {len(web_items)} items")
                except Exception as e:
                    logger.warning(f"    Web search failed: {e}")

            # Step 2: Build evidence package
            evidence = build_evidence_package(row, conn)

            # Step 3: Generate memo
            memo_text = ""
            if dry_run:
                memo_text = (
                    f"[DRY RUN] Would generate memo for {vname} "
                    f"(IPS={ips:.3f})"
                )
                print(f"\n--- {vname} ---")
                print(f"Evidence package keys: {list(evidence.keys())}")
                print(f"Patterns: {evidence['patterns']}")
                print(f"Would generate: {'LLM' if client else 'template'} memo")
            elif client:
                try:
                    memo_text = generate_memo(evidence, client)
                    generated += 1
                except Exception as e:
                    logger.warning(f"    LLM failed ({e}), using template")
                    memo_text = generate_template_memo(evidence)
                    template_used += 1
            else:
                memo_text = generate_template_memo(evidence)
                template_used += 1

            # Save to DB
            if not dry_run and memo_text:
                conn.execute(
                    """
                    UPDATE aria_queue
                    SET memo_text = ?, memo_generated_at = ?
                    WHERE vendor_id = ?
                    """,
                    (memo_text, datetime.now().isoformat(), row["vendor_id"]),
                )
                conn.commit()

        logger.info(
            f"\nDone. LLM memos: {generated}, Template memos: {template_used}"
        )
        if dry_run:
            logger.info("DRY RUN — no memos saved to DB")

    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    parser = argparse.ArgumentParser(
        description="ARIA Phase 3: LLM Memo Generator"
    )
    parser.add_argument(
        "--vendor-id", type=int, help="Generate memo for specific vendor"
    )
    parser.add_argument(
        "--tier",
        type=int,
        choices=[1, 2, 3],
        help="Generate for all vendors in tier",
    )
    parser.add_argument(
        "--limit", type=int, default=20, help="Max vendors to process"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated, don't save",
    )
    parser.add_argument(
        "--web-search",
        action="store_true",
        help="Enable web search (requires API key)",
    )
    args = parser.parse_args()

    run_memo_generation(
        tier=args.tier,
        vendor_id=args.vendor_id,
        limit=args.limit,
        dry_run=args.dry_run,
        use_web_search=args.web_search,
    )
