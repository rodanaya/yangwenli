"""Insert GT cases 236-238.

Case 236: CFE CARBÓN COAHUILA — Suministro Monopolio Sin RFC (48.5B combined)
Case 237: INTELICAM CFE Red Eléctrica Sobreprecio (4.87B, 251M/km overpricing)
Case 238: CORPORATIVO GIORMAR — Implantes Ortopédicos ISSSTE/SEDENA Sin RFC (3.95B)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"


def insert_case(cur, case_id, case_name, case_type, year_start, year_end,
                estimated_fraud_mxn, confidence_level, notes):
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(case_id, case_name, case_type, year_start, year_end, "
        "estimated_fraud_mxn, confidence_level, notes) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (case_id, case_name, case_type, year_start, year_end,
         estimated_fraud_mxn, confidence_level, notes)
    )
    return cur.execute(
        "SELECT id FROM ground_truth_cases WHERE case_id=?", (case_id,)
    ).fetchone()[0]


def insert_vendor(cur, case_db_id, vendor_id, vendor_name_source, rfc_source,
                  role, evidence_strength, match_method, match_confidence, notes):
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, rfc_source, role, "
        "evidence_strength, match_method, match_confidence, notes) "
        "VALUES (?,?,?,?,?,?,?,?,?)",
        (case_db_id, vendor_id, vendor_name_source, rfc_source, role,
         evidence_strength, match_method, match_confidence, notes)
    )


def link_contracts(cur, case_db_id, vendor_id):
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) "
        "SELECT ?, c.id FROM contracts c WHERE c.vendor_id=?",
        (case_db_id, vendor_id)
    )
    return cur.rowcount


conn = sqlite3.connect(DB)
cur = conn.cursor()

# ── CASE 236: CFE CARBÓN COAHUILA ───────────────────────────────────────────
case236_db_id = insert_case(
    cur,
    case_id="CFE_CARBON_COAHUILA_MONOPOLIO_NORFC_2003_2013",
    case_name="CFE Carbón Coahuila — Suministro Monopolio Sin RFC (COAHUILA INDUSTRIAL + CIC CORPORATIVO)",
    case_type="overpricing",
    year_start=2003,
    year_end=2013,
    estimated_fraud_mxn=0,
    confidence_level="low",
    notes=(
        "Dos empresas sin RFC de Coahuila acumulan 48.5B MXN en contratos de "
        "carbón térmico con CFE (plantas Carbón I/II y José López Portillo). "
        "VID=12036 COAHUILA INDUSTRIAL MINERA: 3 contratos por 24.8B (2003, 2006). "
        "VID=114024 CIC CORPORATIVO INDUSTRIAL COAHUILA: 1 contrato por 23.7B (2013). "
        "Posible relación entre ambas empresas (mismo sector geográfico, mismo cliente CFE, "
        "sin RFC en COMPRANET). Confianza baja: contratos de largo plazo de carbón sub-bituminoso "
        "pueden ser legítimos dado que CFE históricamente dependía de carbón de Coahuila. "
        "Requiere cruce con ASF Cuenta Pública y registros del SAT para confirmar RFC."
    )
)

insert_vendor(
    cur, case236_db_id,
    vendor_id=12036,
    vendor_name_source="COAHUILA INDUSTRIAL MINERA S.A DE C.V.",
    rfc_source=None,
    role="primary",
    evidence_strength="low",
    match_method="vendor_id_exact",
    match_confidence=0.95,
    notes=(
        "Sin RFC en COMPRANET. 3 contratos: ene-2003 (16.192B LP + 8.464B LP) "
        "para Carbón Térmico Mineral No Coquizable destinado a plantas CFE Carbón I/II "
        "y José López Portillo; dic-2006 (131M LP) carbón bajo azufre. "
        "Contrato 2003 de 24.6B MXN es uno de los más grandes del período 2002-2010 "
        "en COMPRANET. Ausencia de RFC impide verificación SAT."
    )
)

insert_vendor(
    cur, case236_db_id,
    vendor_id=114024,
    vendor_name_source="CIC CORPORATIVO INDUSTRIAL COAHUILA SA DE CV",
    rfc_source=None,
    role="secondary",
    evidence_strength="low",
    match_method="vendor_id_exact",
    match_confidence=0.95,
    notes=(
        "Sin RFC en COMPRANET. 1 contrato: ene-2013 (23.738B LP) para "
        "'Carbón Mineral Termico No Coquizable Subbituminoso' desde CFE. "
        "Nombre similar al VID=12036 (ambos 'Industrial Coahuila'): posible "
        "empresa sucesora o entidad relacionada. Contrato de 23.7B es el mayor "
        "registro de carbón en la base 2010-2022."
    )
)

n236 = link_contracts(cur, case236_db_id, 12036)
n236 += link_contracts(cur, case236_db_id, 114024)
print(f"Case 236 db_id={case236_db_id}, contracts linked={n236}")

# ── CASE 237: INTELICAM CFE RED ELÉCTRICA SOBREPRECIO ────────────────────────
case237_db_id = insert_case(
    cur,
    case_id="INTELICAM_CFE_RED_ELECTRICA_SOBREPRECIO_2016",
    case_name="INTELICAM — CFE Red Eléctrica 14.5 km a 251M MXN/km (4.87B sobreprecio)",
    case_type="overpricing",
    year_start=2016,
    year_end=2016,
    estimated_fraud_mxn=3_200_000_000,
    confidence_level="medium",
    notes=(
        "VID=46663 INTEGRACION DE SOLUCIONES ELECTRICAS Y DE MANTENIMIENTO (INTELICAM SA DE CV), "
        "sin RFC en COMPRANET. 85 contratos por 4.871B MXN, 91% con CFE. "
        "Contrato principal (abr-2016, 3.646B LP): construcción de 14.5 km de línea 33kV "
        "en tronco Mante-Tantoyuca = 251M MXN/km. Tarifa de mercado: 2-8M MXN/km. "
        "Sobreprecia estimada: 30-100x el valor de mercado. "
        "Segundo contrato (abr-2016, 762M LP): mejora integral redes distribución. "
        "Tercer contrato (oct-2016, 357M DA): mejoras red media/baja tensión. "
        "Estimación de fraude: 3.2B MXN asumiendo 80% de sobreprecio en el contrato principal. "
        "Patrón: empresa sin RFC acumula casi 5B en un año con CFE, concentración extrema."
    )
)

insert_vendor(
    cur, case237_db_id,
    vendor_id=46663,
    vendor_name_source="INTEGRACION DE SOLUCIONES ELECTRICAS Y DE MANTENIMIENTO, INTELICAM SA DE CV",
    rfc_source=None,
    role="primary",
    evidence_strength="medium",
    match_method="vendor_id_exact",
    match_confidence=0.98,
    notes=(
        "Sin RFC en COMPRANET. 85 contratos, 4.871B MXN total. Top institution: CFE (91%). "
        "Contrato crítico ID identificado por descripción: 'CONSTRUCCION DE 14+500 KM. 33 KV. "
        "1C 3F-4H ACSR 336.4-1/0 TRONCO MANTE-TANTOYUCA' = 3.646B para 14.5 km de línea. "
        "251M MXN/km vs mercado 2-8M/km: indicador fuerte de sobreprecio. "
        "Sin RFC impide verificar existencia real de empresa ante SAT."
    )
)

n237 = link_contracts(cur, case237_db_id, 46663)
print(f"Case 237 db_id={case237_db_id}, contracts linked={n237}")

# ── CASE 238: CORPORATIVO GIORMAR — IMPLANTES ORTOPÉDICOS ────────────────────
case238_db_id = insert_case(
    cur,
    case_id="CORPORATIVO_GIORMAR_IMPLANTES_ORTOPEDICOS_ISSSTE_SEDENA_2018_2022",
    case_name="Corporativo Giormar — Implantes Ortopédicos ISSSTE/SEDENA Sin RFC (3.95B sobreprecio)",
    case_type="overpricing",
    year_start=2018,
    year_end=2022,
    estimated_fraud_mxn=1_200_000_000,
    confidence_level="medium",
    notes=(
        "VID=56666 CORPORATIVO GIORMAR DE MEXICO, sin RFC en COMPRANET. "
        "93 contratos por 3.953B MXN, tasa DA=38%. Principales contratos: "
        "jun-2018 (789M LP SEDENA) para consumibles y materiales ortopedia/traumatología; "
        "feb-2020 (712M LP ISSSTE) servicio integral de osteosíntesis y endoprótesis ortopédicas; "
        "abr-2022 (573M DA ISSSTE) mismo servicio. "
        "Implantes ortopédicos (reemplazos cadera/rodilla, fijación de fracturas) son "
        "vector global de corrupción: márgenes opacos, especificaciones técnicas que "
        "favorecen proveedor único, difícil comparación de precios. "
        "Sin RFC: imposible verificar si la empresa existe ante SAT, tiene capacidad técnica "
        "para distribuir implantes certificados (COFEPRIS), o si los precios son de mercado. "
        "Estimación de fraude: 1.2B MXN (~30% de sobreprecio sobre 3.95B total). "
        "Requiere cruce con registros COFEPRIS, ASF Cuenta Pública ISSSTE y SEDENA 2018-2022."
    )
)

insert_vendor(
    cur, case238_db_id,
    vendor_id=56666,
    vendor_name_source="CORPORATIVO GIORMAR DE MEXICO",
    rfc_source=None,
    role="primary",
    evidence_strength="medium",
    match_method="vendor_id_exact",
    match_confidence=0.98,
    notes=(
        "Sin RFC en COMPRANET. 93 contratos, 3.953B MXN, DA=38%, sector salud/defensa. "
        "Proveedor exclusivo de implantes ortopédicos para SEDENA (2018) e ISSSTE (2020, 2022). "
        "Patrón: alta concentración en instituciones de salud de seguridad social y militar, "
        "ausencia de RFC, servicio integral que incluye implantes de alto valor unitario. "
        "Los implantes ortopédicos (prótesis de cadera: 50K-200K MXN c/u en mercado) "
        "permiten sobreprecios elevados sin referencia pública de precios. "
        "Registro COFEPRIS requerido para distribución — sin RFC no puede verificarse."
    )
)

n238 = link_contracts(cur, case238_db_id, 56666)
print(f"Case 238 db_id={case238_db_id}, contracts linked={n238}")

conn.commit()

# Final GT state
cases_count = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
vendors_count = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
contracts_count = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]

print(f"\nGT: {cases_count} cases | {vendors_count} vendors | {contracts_count} contracts")
print(f"\nSummary:")
print(f"  Case 236 (CFE Carbón Coahuila): db_id={case236_db_id}, {n236} contracts")
print(f"  Case 237 (INTELICAM 251M/km):   db_id={case237_db_id}, {n237} contracts")
print(f"  Case 238 (Giormar Implantes):   db_id={case238_db_id}, {n238} contracts")

conn.close()
