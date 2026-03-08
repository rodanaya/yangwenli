"""
Batch H: 4 Construction Sector Single-Bid Monopoly Vendors
Investigation date: 2026-03-08

Findings:
- VID 49212 ALDESEM: 8.8B, 27c, 96% single-bid, CFE/SCT/CONAGUA/NAICM (2010-2017)
- VID 11432 TRITURACIONES: 5.6B, 7c, 86% SB, 2 contracts = 90% of total (2003-2025)
- VID 18935 CALZADA: 6.1B, 51c, 88% SB, 16 institutions across multiple states (2005-2021)
- VID 11494 DESARROLLO: 5.9B, 46c, 96% SB, heavily NL-concentrated (2003-2024)

All are construction firms with extreme single-bid rates (86-96%) winning billions
in public infrastructure contracts. No RFC available for any. Pattern: competitive
procedures where they are the sole bidder — classic bid-rigging/market allocation.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
import json
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

CASES = [
    {
        "case_id": "ALDESEM_INFRA_SINGLE_BID_MONOPOLY",
        "case_name": "Aldesem Infrastructure Single-Bid Monopoly",
        "case_type": "single_bid_monopoly",
        "confidence": "medium",
        "notes": "96% single-bid rate across 27 contracts (8.8B MXN). Won contracts at CFE, SCT, CONAGUA, NAICM 2010-2017. No RFC. All licitaciones publicas with zero competition.",
        "estimated_fraud": 8_832_795_373,
        "vendors": [
            {"vid": 49212, "name": "CONSTRUCCIONES ALDESEM, S.A. DE C.V.", "strength": "statistical", "method": "risk_model"}
        ]
    },
    {
        "case_id": "TRITURACIONES_EXTREME_CONCENTRATION",
        "case_name": "Construcciones y Trituraciones Extreme Contract Concentration",
        "case_type": "single_bid_monopoly",
        "confidence": "medium",
        "notes": "7 contracts totaling 5.6B MXN, 86% single-bid. Two 2014 contracts (CONAGUA 2.57B + SCT 2.46B) = 90% of total value. Extreme concentration in just 2 mega-contracts. Active 2003-2025 with long gaps.",
        "estimated_fraud": 5_565_117_349,
        "vendors": [
            {"vid": 11432, "name": "CONSTRUCCIONES Y TRITURACIONES S.A. DE C.V.", "strength": "statistical", "method": "risk_model"}
        ]
    },
    {
        "case_id": "CALZADA_MULTISTATE_SINGLE_BID",
        "case_name": "Calzada Construcciones Multi-State Single-Bid Network",
        "case_type": "single_bid_monopoly",
        "confidence": "medium",
        "notes": "6.1B MXN across 51 contracts, 88% single-bid. Operates across Campeche, Puebla, Tabasco, Tamaulipas + federal agencies. 16 institutions. Wins billion-peso state contracts as sole bidder. Pattern consistent with regional bid-rigging.",
        "estimated_fraud": 6_056_376_433,
        "vendors": [
            {"vid": 18935, "name": "CALZADA CONSTRUCCIONES S.A. DE C.V.", "strength": "statistical", "method": "risk_model"}
        ]
    },
    {
        "case_id": "DESARROLLO_NL_CONSTRUCTION_MONOPOLY",
        "case_name": "Desarrollo y Construcciones Urbanas Nuevo Leon Monopoly",
        "case_type": "single_bid_monopoly",
        "confidence": "medium",
        "notes": "5.9B MXN, 46 contracts, 96% single-bid. Heavily concentrated in Nuevo Leon state infrastructure (NL-Secretaria de Infraestructura, FIDEPROE, Agua y Drenaje Monterrey). Classic state-level construction monopoly pattern. Active 2003-2024.",
        "estimated_fraud": 5_908_586_102,
        "vendors": [
            {"vid": 11494, "name": "DESARROLLO Y CONSTRUCCIONES URBANAS, S.A. DE C.V.", "strength": "statistical", "method": "risk_model"}
        ]
    },
]

MEMO_TEMPLATE = """# Investigacion: {case_name}

## Resumen
{summary}

## Datos Clave
- **Monto total**: ${total:,.0f} MXN
- **Contratos**: {n_contracts}
- **Tasa de licitacion sin competencia**: {sb_rate}%
- **Instituciones**: {n_institutions}
- **Periodo**: {years}
- **RFC**: No disponible

## Patron de Riesgo
{pattern}

## Contratos Principales
{top_contracts}

## Recomendacion
{recommendation}
"""


def run():
    conn = sqlite3.connect(DB, timeout=30)
    conn.execute("PRAGMA busy_timeout=30000")
    cur = conn.cursor()

    # Get next GT case id
    max_id = cur.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0

    for i, case in enumerate(CASES):
        case_num = max_id + 1 + i
        vid = case["vendors"][0]["vid"]

        # Get contract details
        contracts = cur.execute(
            "SELECT id, amount_mxn, contract_year, is_single_bid FROM contracts WHERE vendor_id=? ORDER BY amount_mxn DESC",
            (vid,)
        ).fetchall()

        n_contracts = len(contracts)
        sb_count = sum(1 for c in contracts if c[3])
        sb_rate = round(sb_count / n_contracts * 100) if n_contracts else 0
        years = sorted(set(c[2] for c in contracts if c[2]))
        year_str = f"{min(years)}-{max(years)}" if years else "N/A"

        insts = cur.execute(
            "SELECT DISTINCT i.name FROM contracts c JOIN institutions i ON c.institution_id=i.id WHERE c.vendor_id=?",
            (vid,)
        ).fetchall()
        n_insts = len(insts)

        # Insert GT case
        cur.execute("""INSERT INTO ground_truth_cases (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (case_num, case["case_id"], case["case_name"], case["case_type"],
             case["confidence"], case["notes"], case["estimated_fraud"])
        )

        # Insert GT vendor
        for v in case["vendors"]:
            cur.execute("""INSERT INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                VALUES (?, ?, ?, ?, ?)""",
                (case["case_id"], v["vid"], v["name"], v["strength"], v["method"])
            )

        # Insert GT contracts
        for c in contracts:
            cur.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
                (case["case_id"], c[0]))

        # Build memo
        top_lines = []
        for c in contracts[:5]:
            inst = cur.execute("SELECT i.name FROM contracts ct JOIN institutions i ON ct.institution_id=i.id WHERE ct.id=?", (c[0],)).fetchone()
            inst_name = inst[0][:50] if inst else "N/A"
            top_lines.append(f"- ${c[1]:,.0f} MXN ({c[2]}) — {inst_name}")

        if case["case_id"] == "ALDESEM_INFRA_SINGLE_BID_MONOPOLY":
            summary = "Constructora con 8.8 mil millones MXN en contratos federales de infraestructura, ganados casi en su totalidad (96%) como licitante unico. Opera en CFE, SCT, CONAGUA y el NAICM."
            pattern = "Monopolio por licitacion sin competencia: la empresa participa en licitaciones publicas pero es sistematicamente el unico postor. Este patron en 27 contratos de alto valor sugiere posible acuerdo previo o barreras artificiales a la competencia."
            recommendation = "Investigar los expedientes de licitacion para verificar si hubo convocatorias restringidas o requisitos tecnicos excluyentes. Cruzar con auditorias de ASF sobre proyectos de CFE y SCT 2010-2017."
        elif case["case_id"] == "TRITURACIONES_EXTREME_CONCENTRATION":
            summary = "Constructora con solo 7 contratos pero 5.6 mil millones MXN en valor total. Dos mega-contratos de 2014 (CONAGUA 2.57B + SCT 2.46B) representan el 90% del valor. Concentracion extrema."
            pattern = "Concentracion extrema en mega-contratos: una empresa con historial modesto (5 contratos menores 2003-2010) obtiene dos contratos de 2,500M+ en el mismo ano 2014, ambos como licitante unico. Patron inconsistente con crecimiento organico."
            recommendation = "Revisar expedientes de las licitaciones LO-016B00999-N110-2014 (CONAGUA) y LO-009000988-N19-2014 (SCT). Verificar capacidad tecnica y financiera de la empresa para ejecutar obras de esta magnitud. El contrato de 2025 por fuerza mayor tambien requiere revision."
        elif case["case_id"] == "CALZADA_MULTISTATE_SINGLE_BID":
            summary = "Constructora con 6.1 mil millones MXN en 51 contratos, 88% ganados como licitante unico. Opera en multiples estados (Campeche, Puebla, Tabasco, Tamaulipas) y agencias federales. Presencia multi-estatal inusual para una constructora."
            pattern = "Red de licitaciones sin competencia multi-estatal: la empresa gana contratos como unico postor en gobiernos estatales diversos y agencias federales. Este patron geograficamente disperso sugiere una red de contactos o arreglos que trascienden una sola entidad."
            recommendation = "Investigar relaciones de la empresa con funcionarios de Campeche, Puebla y agencias federales. Cruzar con datos de PEMEX-EP donde tiene 3 contratos. Verificar si el contrato de 1,120M MXN de Campeche tuvo supervision adecuada."
        else:
            summary = "Constructora con 5.9 mil millones MXN concentrada en Nuevo Leon, 96% de contratos ganados como licitante unico. Fuerte presencia en la Secretaria de Infraestructura de NL, FIDEPROE y Servicios de Agua y Drenaje de Monterrey."
            pattern = "Monopolio estatal en construccion: concentracion del 96% en licitaciones sin competencia dentro de un solo estado. Patron tipico de 'constructor de cabecera' con relaciones preferenciales con el gobierno estatal de Nuevo Leon."
            recommendation = "Investigar vinculos con funcionarios de la Secretaria de Infraestructura de NL y FIDEPROE. Revisar el contrato de 880M MXN del fideicomiso (2008) y el de 1,162M MXN de SICT (2022). Cruzar con auditorias de la ASF y la Auditoria Superior del Estado de NL."

        memo = MEMO_TEMPLATE.format(
            case_name=case["case_name"],
            summary=summary,
            total=case["estimated_fraud"],
            n_contracts=n_contracts,
            sb_rate=sb_rate,
            n_institutions=n_insts,
            years=year_str,
            pattern=pattern,
            top_contracts="\n".join(top_lines),
            recommendation=recommendation,
        )

        # Insert aria_queue
        avg_risk = cur.execute("SELECT AVG(risk_score) FROM contracts WHERE vendor_id=?", (vid,)).fetchone()[0] or 0
        max_risk = cur.execute("SELECT MAX(risk_score) FROM contracts WHERE vendor_id=?", (vid,)).fetchone()[0] or 0

        cur.execute("""INSERT OR REPLACE INTO aria_queue
            (vendor_id, vendor_name, ips_tier, primary_pattern, pattern_confidence,
             total_contracts, total_value_mxn, avg_risk_score, max_risk_score,
             single_bid_rate, review_status, memo_text, memo_generated_at, computed_at,
             in_ground_truth)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (vid, case["vendors"][0]["name"], 1, "single_bid_monopoly", 0.85,
             n_contracts, case["estimated_fraud"], round(avg_risk, 4), round(max_risk, 4),
             round(sb_rate / 100, 3), "pending", memo, datetime.now().isoformat(),
             datetime.now().isoformat(), 1)
        )

        print(f"[OK] Case {case_num}: {case['case_id']} | VID={vid} | {n_contracts}c | ${case['estimated_fraud']:,.0f} | SB={sb_rate}%")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted {len(CASES)} cases, {len(CASES)} vendors, aria_queue entries.")


if __name__ == "__main__":
    run()
