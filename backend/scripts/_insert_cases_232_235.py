"""Insert GT cases 232-235: Mixed pattern cases."""
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

# ─────────────────────────────────────────────────────────────────────────────
# CASE 232: MANEJO INTEGRAL EN CONSULTA EMPRESARIAL — COMESA/PEMEX
#   6.309B MXN, 2 contracts Apr+Oct 2014, both to COMESA (PEMEX subsidiary)
#   No RFC despite massive contract value; same generic description both times.
#   First contract LP (4.832B), second DA (1.477B) to same entity — classic
#   follow-on direct award pattern to launder additional payments.
# ─────────────────────────────────────────────────────────────────────────────
c232_id = insert_case(
    cur,
    case_id="MANEJO_INTEGRAL_COMESA_PEMEX_SERVICIOS_2014",
    case_name="Manejo Integral en Consulta Empresarial - COMESA/PEMEX Servicios Especializados 6.3B sin RFC",
    case_type="procurement_fraud",
    year_start=2014,
    year_end=2014,
    estimated_fraud_mxn=6_309_000_000.0,
    confidence_level="high",
    notes=(
        "MANEJO INTEGRAL EN CONSULTA EMPRESARIAL SA DE CV (VID=136648, sin RFC) "
        "recibió 6.309B MXN de COMPAÑÍA MEXICANA DE EXPLORACIONES (COMESA), "
        "subsidiaria de PEMEX, en 2014. Dos contratos con descripción idéntica "
        "'PRESTACIÓN DE SERVICIOS ESPECIALIZADOS': primer contrato LP (4.832B, "
        "abr-2014) seguido de DA (1.477B, oct-2014) — patrón clásico de "
        "adjudicación directa complementaria para ampliar pagos sin licitación. "
        "Empresa sin RFC registrado a pesar de contratos por >6B MXN. Nombre "
        "genérico ('Manejo Integral en Consulta Empresarial') sin especialización "
        "verificable. Alta sospecha de empresa interpuesta o triangulación de "
        "recursos vía subsidiaria PEMEX. Risk_score=0.577-0.680, Mahalanobis=777."
    )
)
insert_vendor(
    cur, c232_id, 136648,
    "MANEJO INTEGRAL EN CONSULTA EMPRESARIAL SA DE CV",
    None,
    "primary",
    "high",
    "vendor_id_exact",
    0.95,
    (
        "Sin RFC registrado. 2 contratos, ambos con COMESA (PEMEX). "
        "LP 4.832B abr-2014 + DA 1.477B oct-2014, misma descripción. "
        "Riesgo_avg=0.577, Mahalanobis_avg=777. Empresa opaca de consultoría."
    )
)
n232 = link_contracts(cur, c232_id, 136648)
print(f"Case 232 db_id={c232_id}, contracts linked={n232}")

# ─────────────────────────────────────────────────────────────────────────────
# CASE 233: ARMOUR KING SA DE CV — Nueva empresa seguridad AICM + ISSSTE
#   RFC=AKI1905237F3 (mayo 2019), 15 contratos, 2.127B, 2023-2025
#   Empresa nueva (4 años de operación) con 2.1B en contratos de seguridad.
#   Captura dominante en AICM (aeropuerto crítico de seguridad nacional) y
#   ISSSTE. 370M DA a ISSSTE para seguridad privada intramural — adjudicación
#   directa para servicio de alta sensibilidad que debería licitarse.
#   Patrón: empresa reciente acapara contratos de seguridad en sitios críticos.
# ─────────────────────────────────────────────────────────────────────────────
c233_id = insert_case(
    cur,
    case_id="ARMOUR_KING_AICM_ISSSTE_SEGURIDAD_NUEVA_EMPRESA_2023",
    case_name="Armour King SA de CV - Empresa Nueva 2019 Captura Seguridad AICM+ISSSTE 2.1B",
    case_type="procurement_fraud",
    year_start=2023,
    year_end=2025,
    estimated_fraud_mxn=2_127_000_000.0,
    confidence_level="medium",
    notes=(
        "ARMOUR KING SA DE CV (RFC=AKI1905237F3, constituida mayo 2019) obtuvo "
        "2.127B MXN en 15 contratos de seguridad privada 2023-2025, acumulados "
        "en apenas 4 años de operación. Principales contratos: 370M DA a ISSSTE "
        "(dic-2023) para seguridad intramural — adjudicación directa para servicio "
        "crítico que típicamente requiere licitación pública; 288M LP a AICM "
        "(nov-2023); 285M+278M LP a AICM (jun-2025); 249M LP a AICM (nov-2023). "
        "Captura simultánea de AICM (infraestructura crítica) e ISSSTE sugiere "
        "conexiones institucionales que aceleran la asignación. Empresa muy nueva "
        "acumulando contratos críticos de seguridad sin historial verificable. "
        "Risk_score_avg=0.482, max=1.0, Mahalanobis_avg=91.8."
    )
)
insert_vendor(
    cur, c233_id, 291507,
    "ARMOUR KING SA DE CV",
    "AKI1905237F3",
    "primary",
    "medium",
    "vendor_id_exact",
    0.90,
    (
        "RFC AKI1905237F3, mayo 2019. 15 contratos, 2.127B, AICM+ISSSTE. "
        "370M DA ISSSTE dic-2023. Empresa 4 años capturando seguridad crítica."
    )
)
n233 = link_contracts(cur, c233_id, 291507)
print(f"Case 233 db_id={c233_id}, contracts linked={n233}")

# ─────────────────────────────────────────────────────────────────────────────
# CASE 234: COLEGIO PARTICULAR KELLER AC — ISSSTE Estancias Bienestar Infantil
#   7 contratos, 3.14B, todos con ISSSTE para "Servicios Subrogados de Estancias
#   de Bienestar y Desarrollo Infantil" en Ciudad del Carmen, Campeche.
#   El contrato dominante (3.094B, LP jul-2010) es anómalamente grande para un
#   servicio de estancias infantiles subrogadas. Una asociación civil de escuela
#   particular capturando 3.1B de ISSSTE en servicios de guardería es altamente
#   inusual. Risk_score=1.0, Mahalanobis_avg=297.7. Sin RFC registrado.
#   Posible inflación de precios en contratos plurianuales de cuidado infantil
#   o estructura de asociación civil usada para evitar escrutinio empresarial.
# ─────────────────────────────────────────────────────────────────────────────
c234_id = insert_case(
    cur,
    case_id="COLEGIO_KELLER_AC_ISSSTE_ESTANCIAS_INFANTILES_3B",
    case_name="Colegio Particular Keller AC - ISSSTE Estancias Bienestar Infantil 3.14B sin RFC",
    case_type="overpricing",
    year_start=2010,
    year_end=2024,
    estimated_fraud_mxn=3_140_000_000.0,
    confidence_level="medium",
    notes=(
        "COLEGIO PARTICULAR KELLER, A.C. (VID=100419, sin RFC) recibió 3.14B MXN "
        "en 7 contratos del ISSSTE para 'Servicios Subrogados de Estancias de "
        "Bienestar y Desarrollo Infantil' en Ciudad del Carmen, Campeche. "
        "Contrato dominante: 3.094B MXN por LP jul-2010 — valor extraordinariamente "
        "alto para servicios de guardería subrogada. Contratos subsecuentes 2014-2024 "
        "de 8-12M cada uno, sugiriendo posible renovación plurianual. "
        "Una asociación civil de escuela particular (AC) que acumula >3B en contratos "
        "de cuidado infantil con ISSSTE es altamente anómala. Sin RFC registrado. "
        "Posibles irregularidades: valor del contrato 2010 inflado masivamente, "
        "modelo AC para evadir escrutinio corporativo, monopolio en Carmen Campeche. "
        "Risk_score=1.0 (máximo), Mahalanobis_avg=297.7."
    )
)
insert_vendor(
    cur, c234_id, 100419,
    "COLEGIO PARTICULAR KELLER, A.C.",
    None,
    "primary",
    "medium",
    "vendor_id_exact",
    0.88,
    (
        "Sin RFC. AC (no empresa). 7 contratos ISSSTE, 3.14B, estancias infantiles "
        "Carmen Campeche. Contrato 2010 3.094B LP anómalamente grande. "
        "risk_score=1.0, Mahalanobis=297."
    )
)
n234 = link_contracts(cur, c234_id, 100419)
print(f"Case 234 db_id={c234_id}, contracts linked={n234}")

# ─────────────────────────────────────────────────────────────────────────────
# CASE 235: ANALISIS CLINICOS DE LEON + LABORATORIO RAAM — Labs Regionales IMSS
#   VID=14066: ANALISIS CLINICOS DE LEON SA DE CV (sin RFC), 10c, 962M,
#     concentrado en Hospital Regional de Alta Especialidad del Bajío (HRAEB).
#     7/10 contratos con un solo hospital. LP pero concentración extrema.
#   VID=245450: LABORATORIO RAAM DE SAHUAYO (RFC=LRS030905Q16), 355c, 2.34B,
#     laboratorio regional de Sahuayo Michoacán (ciudad pequeña ~100K hab)
#     con 355 contratos y 2.34B en servicios a IMSS, ISSSTE, INSABI.
#     Patrón: lab regional pequeño capturando escala nacional de contratos.
#     Concentración 68% en IMSS (1.588B). Incluye 452M en compra consolidada
#     2025 y 274M DA 2025 — escala desproporcionada para lab de Sahuayo.
# ─────────────────────────────────────────────────────────────────────────────
c235_id = insert_case(
    cur,
    case_id="LABS_REGIONALES_IMSS_LEON_RAAM_SOBREPRECIO_CONCENTRACION",
    case_name="Analisis Clinicos de Leon + Lab RAAM Sahuayo - Laboratorios Regionales Capturan IMSS/ISSSTE 3.3B",
    case_type="overpricing",
    year_start=2003,
    year_end=2025,
    estimated_fraud_mxn=3_302_000_000.0,
    confidence_level="medium",
    notes=(
        "Dos laboratorios de análisis clínicos regionales con patrones de "
        "concentración anómala en contratos de salud pública. "
        "(1) ANALISIS CLINICOS DE LEON SA DE CV (VID=14066, sin RFC): 10 contratos, "
        "962M MXN, 7 contratos con un solo hospital (HRAEB Bajío, Guanajuato). "
        "Concentración extrema: 376M y 315M en contratos plurianuales 2021/2018. "
        "Sin RFC registrado. risk_score_avg=0.997. "
        "(2) LABORATORIO RAAM DE SAHUAYO (VID=245450, RFC=LRS030905Q16): lab de "
        "Sahuayo Michoacán (ciudad ~100K hab) con 355 contratos y 2.34B MXN. "
        "Distribución: IMSS 1.588B (68%), ISSSTE 288M, INSABI 244M, IMSS-Bienestar 146M. "
        "Escala nacional desproporcionada para laboratorio regional: 452M en compra "
        "consolidada IMSS feb-2025, 274M DA IMSS jun-2025. "
        "Patrón conjunto: labs regionales sin escala suficiente para servicios "
        "nacionales de esta magnitud, posible sobreprecio en contratos plurianuales "
        "de laboratorio clínico integral, captura institucional en hospitales regionales."
    )
)
insert_vendor(
    cur, c235_id, 14066,
    "ANALISIS CLINICOS DE LEON, S.A. DE C.V.",
    None,
    "primary",
    "medium",
    "vendor_id_exact",
    0.85,
    (
        "Sin RFC. 10c, 962M, concentrado HRAEB Bajío. "
        "Contratos plurianuales 376M y 315M. risk_score=0.997."
    )
)
insert_vendor(
    cur, c235_id, 245450,
    "LABORATORIO RAAM DE SAHUAYO",
    "LRS030905Q16",
    "co_conspirator",
    "medium",
    "vendor_id_exact",
    0.82,
    (
        "RFC LRS030905Q16. Lab Sahuayo Michoacán. 355c, 2.34B, "
        "IMSS/ISSSTE/INSABI. 452M compra consolidada 2025. "
        "Escala desproporcionada para lab regional. risk_score_avg=0.600."
    )
)
n235a = link_contracts(cur, c235_id, 14066)
n235b = link_contracts(cur, c235_id, 245450)
print(f"Case 235 db_id={c235_id}, contracts linked={n235a + n235b} ({n235a} Leon + {n235b} RAAM)")

conn.commit()
conn.close()

print("\n=== SUMMARY ===")
print(f"Case 232 (Manejo Integral COMESA): db_id={c232_id}")
print(f"Case 233 (Armour King AICM):       db_id={c233_id}")
print(f"Case 234 (Keller ISSSTE):           db_id={c234_id}")
print(f"Case 235 (Labs Regionales):         db_id={c235_id}")
print("Done.")
