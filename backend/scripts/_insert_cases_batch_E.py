"""
Batch E — Ground truth inserts for 3 investigated medical-sector vendors.
VID 89613 (INOVAMEDIK) already in GT, skipped.

Run: cd backend && python -m scripts._insert_cases_batch_E
"""
import sqlite3, sys, os
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")

CASES = [
    {
        "case_id": "PROBIOMED_BIOSIMILAR_IMSS_2002_2025",
        "case_name": "Probiomed — Concentración Biosimilares IMSS",
        "case_type": "concentrated_monopoly",
        "year_start": 2002,
        "year_end": 2025,
        "estimated_fraud_mxn": 8_135_000_000,
        "confidence_level": "low",
        "source_news": "Análisis RUBLI v5.1 — risk_score=0.766",
        "notes": (
            "808 contratos por 8.14B MXN. Fabricante mexicano de biosimilares (interferón, "
            "eritropoyetina). IMSS concentra 562c/6.41B (79%). DA=34.5%, SB=23 (2.8%). "
            "Gana mayoritariamente por licitación pública — patrón consistente con proveedor "
            "legítimo de gran escala. Sin RFC en DB. VEREDICTO: PROBABLE FALSO POSITIVO — "
            "concentración explicable por ser fabricante doméstico de biosimilares con precios "
            "competitivos vs importados. Requiere verificación ASF para confirmar legitimidad."
        ),
    },
    {
        "case_id": "REACTIVOS_QUIMICOS_HEMODIALISIS_2002_2025",
        "case_name": "Reactivos y Químicos — Monopolio Reactivos + Hemodiálisis",
        "case_type": "concentrated_monopoly",
        "year_start": 2002,
        "year_end": 2025,
        "estimated_fraud_mxn": 7_840_000_000,
        "confidence_level": "medium",
        "source_news": "Análisis RUBLI v5.1 — risk_score=0.616",
        "notes": (
            "749 contratos por 7.84B MXN. Empresa nominalmente de 'reactivos y químicos' pero "
            "contratos incluyen SERVICIO INTEGRAL DE HEMODIÁLISIS para ISSSTE (70c/1.18B). "
            "IMSS concentra 593c/6.45B (82%). DA=36.5%, SB=39 (5.2%). Contratos más grandes: "
            "903M (2015 IMSS), 736M (2011 IMSS), 626M (2010 IMSS DA). Sin RFC. "
            "VEREDICTO: SOSPECHOSO — nombre comercial no coincide con servicios prestados "
            "(hemodiálisis ≠ reactivos). Volumen de 7.8B MXN es extraordinario para empresa "
            "de reactivos. Posible diversificación legítima pero requiere investigación ASF."
        ),
    },
    {
        "case_id": "SUMINISTRO_MEDICO_HOSP_MANTO_2002_2025",
        "case_name": "Suministro para Uso Médico — Monopolio Mantenimiento Equipo Médico",
        "case_type": "concentrated_monopoly",
        "year_start": 2002,
        "year_end": 2025,
        "estimated_fraud_mxn": 4_583_000_000,
        "confidence_level": "medium",
        "source_news": "Análisis RUBLI v5.1 — risk_score=0.636",
        "notes": (
            "500 contratos por 4.58B MXN. Distribuidor de suministros médicos con 49 "
            "instituciones. DA=56.1% (294c) — muchas bajo modalidad 'patentes, licencias, "
            "oferente único'. IMSS=150c/2.64B, ISSSTE=74c/1.41B, SEDENA=12c/128M. "
            "Contrato más grande: 697M (2025 IMSS, mantenimiento preventivo/correctivo DA). "
            "SB=19 (3.8%). Sin RFC. VEREDICTO: SOSPECHOSO — DA al 56% justificada por "
            "'oferente único' en mantenimiento de equipo médico, pero esto es exactamente "
            "el patrón de vendor lock-in. 4.6B para mantenimiento es excesivo. Requiere "
            "verificación de si realmente es fabricante/representante exclusivo."
        ),
    },
]

VENDORS = [
    {
        "case_id": "PROBIOMED_BIOSIMILAR_IMSS_2002_2025",
        "vendor_id": 5212,
        "vendor_name_source": "PROBIOMED, S.A. DE C.V.",
        "role": "primary",
        "evidence_strength": "low",
        "match_method": "exact_name",
        "match_confidence": 1.0,
        "notes": (
            "808 contratos, 8.14B MXN, IMSS (562c/6.41B) + ISSSTE (47c/784M). "
            "Biosimilares (interferón, EPO). DA=34.5%. Probable falso positivo, sin RFC."
        ),
    },
    {
        "case_id": "REACTIVOS_QUIMICOS_HEMODIALISIS_2002_2025",
        "vendor_id": 5957,
        "vendor_name_source": "REACTIVOS Y QUIMICOS, S.A. DE C.V.",
        "role": "primary",
        "evidence_strength": "medium",
        "match_method": "exact_name",
        "match_confidence": 1.0,
        "notes": (
            "749 contratos, 7.84B MXN, IMSS (593c/6.45B) + ISSSTE hemodialisis "
            "(70c/1.18B). Nombre no coincide con servicios. Sin RFC."
        ),
    },
    {
        "case_id": "SUMINISTRO_MEDICO_HOSP_MANTO_2002_2025",
        "vendor_id": 4458,
        "vendor_name_source": "SUMINISTRO PARA USO MÉDICO Y HOSPITALARIO, S. A. DE C. V.",
        "role": "primary",
        "evidence_strength": "medium",
        "match_method": "exact_name",
        "match_confidence": 1.0,
        "notes": (
            "500 contratos, 4.58B MXN, 49 instituciones, DA=56.1% (oferente único). "
            "IMSS (150c/2.64B) + ISSSTE (74c/1.41B). Vendor lock-in por mantenimiento. Sin RFC."
        ),
    },
]

MEMOS = {
    5212: (
        "## Investigación: PROBIOMED, S.A. DE C.V.\n\n"
        "**Monto total:** 8,135M MXN | **Contratos:** 808 | **Risk Score:** 0.766\n\n"
        "### Hallazgos\n"
        "- Fabricante mexicano de biosimilares (interferón alfa, eritropoyetina, filgrastim)\n"
        "- IMSS concentra 79% del valor (562c/6,411M)\n"
        "- Gana mayoritariamente por licitación pública (529 de 808 contratos)\n"
        "- Solo 23 single bids (2.8%) — patrón competitivo normal\n"
        "- Operación continua 2002-2025 (23 años)\n\n"
        "### VEREDICTO: PROBABLE FALSO POSITIVO\n"
        "Probiomed es un fabricante doméstico reconocido de biosimilares. La concentración "
        "en IMSS es explicable: biosimilares compiten por precio contra importados y el IMSS "
        "es el mayor comprador de medicamentos del país. El bajo ratio de adjudicación directa "
        "(34.5%) y single bid (2.8%) indica competencia real. Requiere verificación ASF pero "
        "patrón es consistente con proveedor legítimo de gran escala."
    ),
    5957: (
        "## Investigación: REACTIVOS Y QUÍMICOS, S.A. DE C.V.\n\n"
        "**Monto total:** 7,840M MXN | **Contratos:** 749 | **Risk Score:** 0.616\n\n"
        "### Hallazgos\n"
        "- Nombre sugiere empresa de reactivos de laboratorio\n"
        "- Sin embargo, contratos incluyen SERVICIO INTEGRAL DE HEMODIÁLISIS para ISSSTE\n"
        "- IMSS concentra 82% del valor (593c/6,454M)\n"
        "- Contratos de 900M+ y 736M para IMSS en 2015 y 2011\n"
        "- ISSSTE: 70 contratos por 1,179M incluyendo hemodiálisis\n"
        "- Sin RFC registrado en la base de datos\n\n"
        "### VEREDICTO: SOSPECHOSO — REQUIERE INVESTIGACIÓN\n"
        "Discrepancia significativa entre razón social ('reactivos y químicos') y servicios "
        "prestados (hemodiálisis integral). Un volumen de 7.8B MXN es extraordinario para "
        "una empresa de reactivos. Posible que la empresa diversificó legítimamente hacia "
        "servicios de hemodiálisis, pero el nombre genérico y la ausencia de RFC sugieren "
        "que requiere verificación en ASF Cuenta Pública y registros de COFEPRIS."
    ),
    4458: (
        "## Investigación: SUMINISTRO PARA USO MÉDICO Y HOSPITALARIO, S.A. DE C.V.\n\n"
        "**Monto total:** 4,583M MXN | **Contratos:** 500 | **Risk Score:** 0.636\n\n"
        "### Hallazgos\n"
        "- Distribuidor de suministros médicos con alcance nacional (49 instituciones)\n"
        "- Adjudicación directa al 56.1% — muchas bajo 'oferente único/patentes'\n"
        "- IMSS: 150c/2,637M | ISSSTE: 74c/1,412M | SEDENA: 12c/128M\n"
        "- Contrato mayor: 697M (2025, IMSS, mantenimiento preventivo/correctivo DA)\n"
        "- Patrón de vendor lock-in: mantenimiento con refacciones incluidas\n"
        "- Sin RFC registrado\n\n"
        "### VEREDICTO: SOSPECHOSO — VENDOR LOCK-IN\n"
        "El modelo de negocio es clásico vendor lock-in: venta de equipo médico seguida de "
        "contratos de mantenimiento exclusivo con refacciones propietarias. La justificación "
        "'oferente único' para 56% de contratos es cuestionable — ¿realmente no hay otros "
        "proveedores de mantenimiento? 4.6B MXN para una empresa de suministros médicos "
        "sin RFC visible es una señal de alerta. Verificar si es representante exclusivo "
        "de fabricantes o si existen alternativas de servicio."
    ),
}


def main():
    conn = sqlite3.connect(DB)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    inserted_cases = 0
    inserted_vendors = 0
    inserted_contracts = 0
    memo_updates = 0

    for c in CASES:
        existing = conn.execute(
            "SELECT 1 FROM ground_truth_cases WHERE case_id=?", (c["case_id"],)
        ).fetchone()
        if existing:
            print(f"  SKIP case {c['case_id']} (already exists)")
            continue
        conn.execute(
            """INSERT INTO ground_truth_cases
               (case_id, case_name, case_type, year_start, year_end,
                estimated_fraud_mxn, source_news, confidence_level, notes, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                c["case_id"], c["case_name"], c["case_type"],
                c["year_start"], c["year_end"], c["estimated_fraud_mxn"],
                c["source_news"], c["confidence_level"], c["notes"], now,
            ),
        )
        inserted_cases += 1
        print(f"  + Case: {c['case_id']}")

    for v in VENDORS:
        existing = conn.execute(
            "SELECT 1 FROM ground_truth_vendors WHERE case_id=? AND vendor_id=?",
            (v["case_id"], v["vendor_id"]),
        ).fetchone()
        if existing:
            print(f"  SKIP vendor {v['vendor_id']} in {v['case_id']}")
            continue
        conn.execute(
            """INSERT INTO ground_truth_vendors
               (case_id, vendor_id, vendor_name_source, role, evidence_strength,
                match_method, match_confidence, notes, created_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                v["case_id"], v["vendor_id"], v["vendor_name_source"],
                v["role"], v["evidence_strength"], v["match_method"],
                v["match_confidence"], v["notes"], now,
            ),
        )
        inserted_vendors += 1
        print(f"  + Vendor: {v['vendor_id']} ({v['vendor_name_source'][:40]})")

    # Insert ground_truth_contracts
    for v in VENDORS:
        cids = conn.execute(
            "SELECT id FROM contracts WHERE vendor_id=?", (v["vendor_id"],)
        ).fetchall()
        for (cid,) in cids:
            try:
                conn.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                    (v["case_id"], cid),
                )
                inserted_contracts += 1
            except Exception:
                pass

    # Update ARIA memos
    for vid, memo in MEMOS.items():
        conn.execute(
            """UPDATE aria_queue SET memo_text=?, review_status='needs_review',
               memo_generated_at=? WHERE vendor_id=?""",
            (memo, now, vid),
        )
        if conn.execute("SELECT changes()").fetchone()[0] > 0:
            memo_updates += 1
            print(f"  ~ Memo updated for VID {vid}")
        else:
            print(f"  (no aria_queue row for VID {vid})")

    conn.commit()
    conn.close()

    print(f"\nDone: {inserted_cases} cases, {inserted_vendors} vendors, "
          f"{inserted_contracts} contracts, {memo_updates} memos")


if __name__ == "__main__":
    main()
