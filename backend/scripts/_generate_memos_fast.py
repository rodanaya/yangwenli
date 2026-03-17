#!/usr/bin/env python3
"""
Fast memo generator using only aria_queue data (no contracts table queries).
Designed to work despite large WAL files by avoiding full-table scans.
"""
import json
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

PATTERN_NAMES = {
    "P1": "Monopolio concentrado",
    "P2": "Empresa fantasma",
    "P3": "Intermediario de paso único",
    "P4": "Manipulación de licitaciones",
    "P5": "Sobreprecio",
    "P6": "Captura institucional",
    "P7": "Conflicto de interés",
}


def generate_template_memo(row: dict) -> str:
    """Generate memo using only aria_queue columns (no extra DB queries)."""
    name = row.get("vendor_name") or "Desconocido"
    rfc = row.get("efos_rfc") or "No registrado"
    sector = row.get("primary_sector_name") or "No clasificado"
    years = row.get("years_active") or 0
    total_value = row.get("total_value_mxn") or 0
    contracts = row.get("total_contracts") or 0
    ips = row.get("ips_final") or 0
    tier = row.get("ips_tier") or 0
    risk_score = row.get("avg_risk_score") or 0
    maha = row.get("mahalanobis_norm") or 0
    burst = row.get("burst_score") or 0
    pattern = row.get("primary_pattern") or ""
    pattern_conf = row.get("pattern_confidence") or 0
    da_rate = row.get("direct_award_rate") or 0
    sb_rate = row.get("single_bid_rate") or 0
    top_inst = row.get("top_institution") or "No disponible"
    top_inst_ratio = row.get("top_institution_ratio") or 0
    is_efos = row.get("is_efos_definitivo") or 0
    is_sfp = row.get("is_sfp_sanctioned") or 0
    in_gt = row.get("in_ground_truth") or 0

    pattern_name = PATTERN_NAMES.get(pattern, pattern or "No clasificado")
    total_fmt = f"{total_value:,.0f}"
    contracts_fmt = f"{contracts:,}"

    # Alerts
    alerts = []
    if is_efos:
        alerts.append("**ALERTA: RFC en lista EFOS definitivo del SAT (empresa fantasma confirmada)**")
    if is_sfp:
        sfp_type = row.get("sfp_sanction_type") or "sanción activa"
        alerts.append(f"**ALERTA: Sancionado por SFP — {sfp_type}**")
    if in_gt:
        alerts.append("**En base de datos de casos documentados de corrupción**")
    alerts_block = "\n".join(alerts)

    # Action recommendation
    if is_efos:
        action, confidence = "AGREGAR_A_GT", "ALTA"
    elif ips >= 0.80:
        action, confidence = "REVISAR_URGENTE", "ALTA"
    elif ips >= 0.60:
        action, confidence = "REVISAR_URGENTE", "MEDIA"
    elif ips >= 0.40:
        action, confidence = "REVISAR_PRIORITARIO", "MEDIA"
    else:
        action, confidence = "REVISAR_RUTINA", "BAJA"

    # Risk factors analysis
    risk_factors = []
    if da_rate > 0.80:
        risk_factors.append(f"- Adjudicación directa: {da_rate:.0%} de contratos (muy alto)")
    elif da_rate > 0.50:
        risk_factors.append(f"- Adjudicación directa: {da_rate:.0%} de contratos (elevado)")
    if sb_rate > 0.30:
        risk_factors.append(f"- Licitación con oferente único: {sb_rate:.0%} (alto)")
    if top_inst_ratio > 0.80:
        risk_factors.append(f"- Concentración institucional: {top_inst_ratio:.0%} en {top_inst}")
    elif top_inst_ratio > 0.50:
        risk_factors.append(f"- Concentración institucional: {top_inst_ratio:.0%} en {top_inst}")
    if burst > 0.5:
        risk_factors.append(f"- Patrón de ráfaga temporal detectado (burst={burst:.2f})")
    if years and years <= 3:
        risk_factors.append(f"- Empresa de reciente creación ({years} años activo)")

    risk_block = "\n".join(risk_factors) if risk_factors else "- Sin señales adicionales destacadas"

    # Pattern-specific analysis
    pattern_analysis = {
        "P1": "Proveedor con alta concentración de mercado en su sector. Posible monopolio o dominancia que distorsiona la competencia. Verificar si existen barreras legítimas de entrada o si la concentración es resultado de favoritismo institucional.",
        "P2": "Perfil consistente con empresa fantasma: poca actividad verificable, posible operación de facturación. Verificar existencia física, representante legal, y cruzar con lista EFOS del SAT.",
        "P3": "Patrón de intermediario: proveedor que canaliza contratos entre instituciones sin aparente valor agregado. Verificar si existe capacidad operativa real o si funciona como pass-through.",
        "P4": "Señales de posible manipulación de licitaciones: patrones de colusión con otros proveedores o licitaciones diseñadas a medida. Verificar participantes en procedimientos compartidos.",
        "P5": "Indicadores de sobreprecio respecto a medianas del sector. Verificar precios de mercado y comparar con contratos similares en otras instituciones.",
        "P6": "Proveedor con alta dependencia de una sola institución. Posible captura del proceso de adquisición. Verificar rotación de funcionarios responsables y justificaciones de adjudicación.",
        "P7": "Posible conflicto de interés: relaciones entre proveedor y funcionarios del ente contratante. Verificar declaraciones patrimoniales y relaciones societarias.",
    }
    analysis = pattern_analysis.get(pattern, "Patrón no clasificado. Requiere revisión manual para determinar el tipo de irregularidad.")

    return f"""## RESUMEN EJECUTIVO
Proveedor **{name}** (RFC: {rfc}) opera en el sector **{sector}** con {contracts_fmt} contratos por un valor total de **${total_fmt} MXN**. Puntuación IPS: **{ips:.3f}** (Tier {tier}). Patrón detectado: **{pattern_name}** (confianza {pattern_conf:.0%}).

{alerts_block}

## PERFIL DEL PROVEEDOR
| Campo | Valor |
|-------|-------|
| Nombre | {name} |
| RFC | {rfc} |
| Sector principal | {sector} |
| Años activo | {years} |
| Total contratos | {contracts_fmt} |
| Valor total | ${total_fmt} MXN |
| Institución principal | {top_inst} ({top_inst_ratio:.0%}) |
| Tasa adj. directa | {da_rate:.0%} |
| Patrón | {pattern_name} |

## INDICADORES DE RIESGO
1. **IPS Final**: {ips:.4f} — Tier {tier}
2. **Risk Score Promedio**: {risk_score:.4f}
3. **Mahalanobis Normalizado**: {maha:.4f}
4. **Burst Score**: {burst:.4f}

### Señales adicionales
{risk_block}

## ANÁLISIS DE PATRÓN: {pattern_name}
{analysis}

## EVIDENCIA PÚBLICA DISPONIBLE
Buscar manualmente en:
- **Animal Político** / **Proceso** / **Latinus**: "{name}" corrupción
- **ASF Cuenta Pública**: observaciones de auditoría
- **SAT EFOS**: lista de operaciones simuladas
- **SFP**: registro de proveedores sancionados

## HIPÓTESIS ALTERNATIVAS
- Posible excepción legal (Art. 41 LAASSP) si es tecnología patentada o proveedor único
- Concentración por especialización legítima en sector {sector}
- Error de datos si hay contratos con valores extremos

## PREGUNTAS DE INVESTIGACIÓN
1. ¿Cuál es la razón social registrada en el SAT y quiénes son los accionistas?
2. ¿El objeto social coincide con los bienes/servicios contratados?
3. ¿Hay observaciones de la ASF en las Cuentas Públicas correspondientes?
4. ¿Existe cobertura periodística sobre irregularidades?
5. ¿Cuál es la relación con la institución principal ({top_inst})?

## CLASIFICACIÓN RECOMENDADA
- **Acción**: {action}
- **Confianza**: {confidence}
- Generado por análisis automatizado RUBLI/ARIA."""


def main():
    tier = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 100

    print(f"Connecting to DB (tier={tier}, limit={limit})...")
    conn = sqlite3.connect(str(DB_PATH), timeout=120)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 120000")

    # Get vendors needing memos
    print("Querying vendors needing memos...")
    t0 = time.time()
    rows = conn.execute(
        """
        SELECT * FROM aria_queue
        WHERE (memo_text IS NULL OR memo_text = '')
          AND ips_tier = ?
        ORDER BY ips_final DESC
        LIMIT ?
        """,
        (tier, limit),
    ).fetchall()
    print(f"  Found {len(rows)} vendors ({time.time()-t0:.1f}s)")

    generated = 0
    for idx, row in enumerate(rows):
        row_dict = dict(row)
        vname = (row_dict.get("vendor_name") or "Unknown")[:50]
        ips = row_dict.get("ips_final") or 0

        memo = generate_template_memo(row_dict)

        try:
            conn.execute(
                "UPDATE aria_queue SET memo_text = ?, memo_generated_at = ? WHERE vendor_id = ?",
                (memo, datetime.now().isoformat(), row_dict["vendor_id"]),
            )
            conn.commit()
            generated += 1
            if (idx + 1) % 10 == 0 or idx == 0:
                print(f"  [{idx+1}/{len(rows)}] {vname} (IPS={ips:.3f}) ✓")
        except Exception as e:
            print(f"  [{idx+1}/{len(rows)}] {vname} FAILED: {e}")

    conn.close()
    print(f"\nDone. Generated {generated} template memos for Tier {tier}.")


if __name__ == "__main__":
    main()
