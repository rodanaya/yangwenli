"""
Batch F: Insert 3 new GT cases + 1 vendor addition.
Cases 342-344 + vendor for existing case investigation.

Vendors investigated 2026-03-08:
  VID=194723  Laboratorios San Angel SA — IMSS lab overpricing (ASF documented)
  VID=198864  Zurich Pharma SA de CV — SFP inhabilitación, false health registration
  VID=42886   Tecnologia Medica Interamericana SA de CV — INCONCLUSIVE, skip
  VID=44284   Bruluagsa SA de CV — legitimate pharma distributor, no fraud evidence, skip
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")

import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

CASES = [
    {
        "case_id": "342",
        "case_name": "IMSS Laboratorios San Angel — Sobreprecio Laboratorio Clínico",
        "case_type": "overpricing",
        "confidence_level": "high",
        "notes": (
            "ASF audit + press: IMSS awarded Laboratorios San Angel 513.7M MXN via direct award "
            "for clinical lab services in Veracruz when competitor Falcón bid 360.8M — overpayment of 153M. "
            "Additionally 301.7M in SARS-CoV-2 tests (2022-2023) flagged by ASF. "
            "Social witness Der Hurley issued formal complaint Sep 2020. "
            "Sources: El Universal, La Jornada, El Financiero, Infobae (2020-2025)."
        ),
        "estimated_fraud_mxn": 453_000_000,
    },
    {
        "case_id": "343",
        "case_name": "Zurich Pharma — Inhabilitación SFP + Registro Sanitario Falso",
        "case_type": "procurement_fraud",
        "confidence_level": "high",
        "notes": (
            "SFP imposed 45-month inhabilitación confirmed by TFJA Mar 2024. "
            "Zurich Pharma provided false health registration (registro sanitario) for pegylated "
            "liposomal doxorubicin (oncological) via SAVI Distribuciones to IMSS (97.3M contract, 2013). "
            "COFEPRIS confirmed falsity. FGR investigation reopened Apr 2025. "
            "67% direct award rate across 288 contracts (1.84B MXN total). "
            "Sources: La Jornada, El Imparcial, Milenio, Luces del Siglo (2023-2025)."
        ),
        "estimated_fraud_mxn": 97_317_000,
    },
]

VENDORS = [
    # Case 342 — Lab San Angel
    {
        "case_id": "342",
        "vendor_id": 194723,
        "vendor_name_source": "LABORATORIOS SAN ANGEL SA",
        "rfc_source": "LSA7004109L7",
        "role": "beneficiary",
        "evidence_strength": "high",
        "match_method": "name_exact",
        "match_confidence": 1.0,
        "notes": "ASF-documented overpricing in IMSS Veracruz lab services + COVID tests. RFC from IMSS portal.",
    },
    # Case 343 — Zurich Pharma
    {
        "case_id": "343",
        "vendor_id": 198864,
        "vendor_name_source": "ZURICH PHARMA SA DE CV",
        "rfc_source": None,
        "role": "beneficiary",
        "evidence_strength": "high",
        "match_method": "name_exact",
        "match_confidence": 1.0,
        "notes": "SFP-inhabilitada 45 months (TFJA confirmed). False registro sanitario for oncological drug.",
    },
]

# Memos in Spanish
MEMOS = {
    194723: (
        "VEREDICTO: CASO CONFIRMADO — Sobreprecio documentado por ASF.\n\n"
        "Laboratorios San Angel SA (VID=194723) recibió contratos del IMSS por 3.2B MXN "
        "(148 contratos, 2016-2025). El 92% del valor proviene del IMSS.\n\n"
        "EVIDENCIA CLAVE:\n"
        "1. Sobreprecio de 153M MXN en servicios de laboratorio clínico en Veracruz: "
        "IMSS adjudicó directamente 513.7M cuando Falcón ofreció 360.8M (ASF, 2020).\n"
        "2. 301.7M MXN en pruebas SARS-CoV-2 (2022-2023) cuestionados por ASF — "
        "existía presupuesto dedicado ya autorizado.\n"
        "3. Testigo social Der Hurley emitió llamado de atención formal (Sep 2020).\n"
        "4. Trabajadores del IMSS en 9 estados denunciaron fallas en servicios de laboratorio.\n\n"
        "PATRÓN: Sobreprecio sistemático en adjudicaciones directas + continuidad de contratos "
        "pese a denuncias documentadas. DA=45.3%, concentrado en IMSS (136/148 contratos).\n\n"
        "FUENTES: El Universal, La Jornada, El Financiero, Infobae, El Informador (2020-2025)."
    ),
    198864: (
        "VEREDICTO: CASO CONFIRMADO — Inhabilitación SFP + registro sanitario falso.\n\n"
        "Zurich Pharma SA de CV (VID=198864) acumuló 1.84B MXN en 288 contratos (2017-2025), "
        "67.4% adjudicación directa, distribuidos en 23 instituciones de salud.\n\n"
        "EVIDENCIA CLAVE:\n"
        "1. SFP impuso inhabilitación de 45 meses por irregularidades con ISSSTE. "
        "TFJA confirmó sanción en marzo 2024, negando amparo.\n"
        "2. Proporcionó carta de respaldo con registro sanitario FALSO para doxorrubicina "
        "liposomal pegilada (medicamento oncológico) a SAVI Distribuciones para contrato "
        "IMSS de 97.3M MXN (2013). COFEPRIS confirmó la falsedad.\n"
        "3. FGR reabrió investigación en abril 2025.\n"
        "4. Continuó recibiendo contratos durante y después de la inhabilitación.\n\n"
        "PATRÓN: Empresa farmacéutica con inhabilitación formal que continúa operando. "
        "DA=67.4% es anómalamente alto para distribuidora farmacéutica. "
        "Falsificación de registro sanitario indica fraude deliberado.\n\n"
        "FUENTES: La Jornada, El Imparcial, Milenio, Luces del Siglo (2023-2025)."
    ),
    42886: (
        "VEREDICTO: INCONCLUSO — Sin evidencia pública de irregularidades.\n\n"
        "Tecnología Médica Interamericana SA de CV (VID=42886) tiene 122 contratos por 1.7B MXN "
        "(2010-2025). Especializada en reactivos para cuantificación de ácidos nucleicos "
        "(pruebas VPH/VIH). Empresa registrada en QuienEsQuien.wiki, presencia en LinkedIn, "
        "contratos con Centro Nacional de Equidad de Género.\n\n"
        "Score alto (RS=0.887) por concentración en reactivos especializados — "
        "posible monopolio legítimo por patentes/especialización técnica. "
        "DA=41.8%, 37 instituciones (diversificación institucional alta).\n\n"
        "RECOMENDACIÓN: No agregar a GT. Monitorear si aparece en auditorías ASF futuras."
    ),
    44284: (
        "VEREDICTO: INCONCLUSO — Distribuidor farmacéutico sin evidencia de fraude.\n\n"
        "Bruluagsa SA de CV (VID=44284) tiene 323 contratos por 3.1B MXN (2010-2025). "
        "Distribuidor de medicamentos genéricos e infecciosos para IMSS, INSABI e ISSSTE.\n\n"
        "NOTA: El nombre 'Bruluagsa' es similar a 'Bruluart' (VID=5196, GT caso 1 IMSS Ghost), "
        "pero son empresas DIFERENTES. Bruluagsa no aparece en investigaciones periodísticas "
        "de fraude. Fue afectada por impago de INSABI (280.1M adeudados, 2021).\n\n"
        "DA=37.8%, 34 instituciones — perfil de distribuidor farmacéutico legítimo de gran escala. "
        "Score alto (RS=0.772) por concentración en sector salud.\n\n"
        "RECOMENDACIÓN: No agregar a GT. Falso positivo probable por concentración sectorial."
    ),
}


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    now = datetime.now().isoformat()
    inserted_cases = 0
    inserted_vendors = 0
    inserted_contracts = 0
    updated_memos = 0

    # Insert cases
    for c in CASES:
        cur.execute(
            "SELECT 1 FROM ground_truth_cases WHERE case_id = ?", (c["case_id"],)
        )
        if cur.fetchone():
            print(f"  SKIP case {c['case_id']} — already exists")
            continue
        cur.execute(
            """INSERT INTO ground_truth_cases
               (case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (c["case_id"], c["case_name"], c["case_type"],
             c["confidence_level"], c["notes"], c["estimated_fraud_mxn"]),
        )
        inserted_cases += 1
        print(f"  + Case {c['case_id']}: {c['case_name']}")

    # Insert vendors
    for v in VENDORS:
        cur.execute(
            "SELECT 1 FROM ground_truth_vendors WHERE vendor_id = ? AND case_id = ?",
            (v["vendor_id"], v["case_id"]),
        )
        if cur.fetchone():
            print(f"  SKIP vendor {v['vendor_id']} in case {v['case_id']} — already exists")
            continue
        cur.execute(
            """INSERT INTO ground_truth_vendors
               (case_id, vendor_id, vendor_name_source, rfc_source, role,
                evidence_strength, match_method, match_confidence, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (v["case_id"], v["vendor_id"], v["vendor_name_source"], v["rfc_source"],
             v["role"], v["evidence_strength"], v["match_method"],
             v["match_confidence"], v["notes"], now),
        )
        inserted_vendors += 1
        print(f"  + Vendor {v['vendor_id']} ({v['vendor_name_source']}) → case {v['case_id']}")

    # Insert GT contracts
    for v in VENDORS:
        vid = v["vendor_id"]
        cid = v["case_id"]
        contract_ids = [
            r[0] for r in cur.execute(
                "SELECT id FROM contracts WHERE vendor_id = ?", (vid,)
            ).fetchall()
        ]
        existing = set(
            r[0] for r in cur.execute(
                "SELECT contract_id FROM ground_truth_contracts WHERE case_id = ?", (cid,)
            ).fetchall()
        )
        new_ids = [c for c in contract_ids if c not in existing]
        for batch_start in range(0, len(new_ids), 500):
            batch = new_ids[batch_start:batch_start + 500]
            cur.executemany(
                "INSERT INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
                [(cid, cid_) for cid_ in batch],
            )
        inserted_contracts += len(new_ids)
        print(f"  + {len(new_ids)} contracts for vendor {vid} → case {cid}")

    # Update ARIA memos for all 4 vendors
    for vid, memo in MEMOS.items():
        cur.execute(
            """UPDATE aria_queue SET memo_text = ?, memo_generated_at = ?,
               review_status = CASE WHEN review_status = 'pending' THEN 'reviewed' ELSE review_status END
               WHERE vendor_id = ?""",
            (memo, now, vid),
        )
        if cur.rowcount > 0:
            updated_memos += 1
            print(f"  ~ Memo updated for VID={vid}")
        else:
            print(f"  (no aria_queue row for VID={vid})")

    conn.commit()
    conn.close()

    print(f"\nDONE: {inserted_cases} cases, {inserted_vendors} vendors, "
          f"{inserted_contracts} contracts, {updated_memos} memos updated")


if __name__ == "__main__":
    main()
