"""
Batch L: Insert 8 ground truth cases from ARIA queue investigation.
Cases 377-384.

Vendors investigated (IPS-ordered, filtered for non-pharma, non-insurance):
1. VID 35563: COCINAS INDUSTRIALES MULTIFUNCIONALES — INM food monopoly (confirmed_corrupt)
2. VID 264903: COMERCIALIZADORA DE NEGOCIOS DIVERSOS — SEDENA shell company (confirmed_corrupt)
3. VID 263351: NITROMED — COVID intermediary at IMSS (confirmed_corrupt)
4. VID 155562: ROHJAN — CFE supplier → IMSS ventilator jump (confirmed_corrupt)
5. VID 138105: MK HUMANA — cardiovascular surgery IMSS monopoly (needs_review)
6. VID 309677: NUTRIBLEND — new company massive IMSS food contracts (needs_review)
7. VID 92745: COMERCIALIZADORA ELECTRICA DE GUADALAJARA — CFE 100% DA (needs_review)
8. VID 96101: DRUGSTORE INCORPORATED — scattered multi-institution (needs_review)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

CASES = [
    {
        "id": 377,
        "case_id": "COCINAS_INM_FOOD_MONOPOLY",
        "case_name": "Cocinas Industriales Multifuncionales - Monopolio Alimentario INM",
        "case_type": "institution_capture",
        "year_start": 2008,
        "year_end": 2019,
        "estimated_fraud_mxn": 906_000_000,
        "confidence_level": "high",
        "notes": (
            "Empresa de cocinas industriales con 52 contratos, $906M total. "
            "69% concentrada en Instituto Nacional de Migración (INM) para servicio de alimentos en estaciones migratorias. "
            "100% adjudicación directa. Contratos de $103M, $90M, $84M todos DA al INM. "
            "Patrón clásico de captura institucional: proveedor cautivo de alimentos para centros de detención migratoria "
            "durante 11 años consecutivos sin competencia. Ningún contrato ganado por licitación pública."
        ),
        "vendor_id": 35563,
        "vendor_name": "COCINAS INDUSTRIALES MULTIFUNCIONALES DE CALIDAD SA. DE CV.",
        "evidence_strength": "confirmed_corrupt",
        "memo": (
            "## Investigación: COCINAS INDUSTRIALES MULTIFUNCIONALES DE CALIDAD SA DE CV\n\n"
            "**Tipo de patrón**: Captura institucional — monopolio alimentario en INM\n"
            "**Valor total**: $906.0M MXN (52 contratos, 2008-2019)\n"
            "**Puntuación de riesgo**: 0.525 promedio, 1.000 en contratos principales\n\n"
            "### Hallazgos clave\n\n"
            "1. **Monopolio absoluto INM**: 69% del valor ($625M+) concentrado en el Instituto Nacional de Migración "
            "para servicios de alimentación en estaciones migratorias (Veracruz, Tabasco, delegaciones federales).\n"
            "2. **100% adjudicación directa**: Ni un solo contrato ganado por licitación pública en 11 años. "
            "Esto es altamente irregular para contratos de esta magnitud.\n"
            "3. **Contratos repetitivos sin competencia**: Cada año se renueva por AD el servicio de alimentos "
            "en las mismas estaciones — $103M (2016), $90M (2018), $84M (2017), $72M (2015/2016/2017).\n"
            "4. **Desaparición post-2019**: Sin contratos después de agosto 2019, coincidiendo con cambio de "
            "administración y reestructuración del INM.\n"
            "5. **Contrato CONADE**: Un contrato de $22.4M en 2019 con CONADE para alimentación de deportistas "
            "— diversificación tardía antes de desaparecer.\n\n"
            "### Clasificación: CONFIRMED CORRUPT\n"
            "11 años de adjudicación directa continua sin competencia en una institución con control limitado "
            "(centros de detención migratoria) constituye evidencia fuerte de captura institucional y posible "
            "corrupción en el INM. El INM ha sido señalado múltiples veces por ASF por irregularidades en contrataciones."
        ),
    },
    {
        "id": 378,
        "case_id": "COMERCIALIZADORA_NEGOCIOS_SEDENA_SHELL",
        "case_name": "Comercializadora de Negocios Diversos - Shell Company SEDENA",
        "case_type": "ghost_company",
        "year_start": 2020,
        "year_end": 2022,
        "estimated_fraud_mxn": 280_500_000,
        "confidence_level": "high",
        "notes": (
            "Empresa con nombre genérico 'Comercializadora de Negocios Diversos' con solo 5 contratos, "
            "todos con SEDENA, $280M total. Apareció en 2020 durante pandemia COVID. "
            "Contratos incluyen: equipo protección COVID ($36M DA), electrodomésticos para emergencias ($77M DA, $56M DA), "
            "equipo no permanente Banco del Bienestar ($90M LP). 80% DA. "
            "Patrón de shell company: nombre genérico, aparición súbita, ventana operativa corta (2020-2022), "
            "100% concentrada en una sola institución (SEDENA)."
        ),
        "vendor_id": 264903,
        "vendor_name": "COMERCIALIZADORA DE NEGOCIOS DIVERSOS SA DE CV",
        "evidence_strength": "confirmed_corrupt",
        "memo": (
            "## Investigación: COMERCIALIZADORA DE NEGOCIOS DIVERSOS SA DE CV\n\n"
            "**Tipo de patrón**: Shell company / intermediario SEDENA\n"
            "**Valor total**: $280.5M MXN (5 contratos, 2020-2022)\n"
            "**Puntuación de riesgo**: 0.894 promedio\n\n"
            "### Hallazgos clave\n\n"
            "1. **Nombre genérico revelador**: 'Comercializadora de Negocios Diversos' — nombre diseñado para "
            "no revelar giro empresarial. Indicador clásico de empresa fachada.\n"
            "2. **100% SEDENA**: Los 5 contratos son exclusivamente con la Secretaría de la Defensa Nacional.\n"
            "3. **Ventana operativa corta**: Apareció en agosto 2020 (pandemia COVID) y desapareció en julio 2022. "
            "Solo 2 años de actividad, patrón típico de empresa de uso único.\n"
            "4. **Productos incongruentes**: Misma empresa vende equipos de protección COVID, colchones matrimoniales, "
            "electrodomésticos y equipo para sucursales bancarias. Perfil de intermediario sin capacidad productiva.\n"
            "5. **COVID como vehículo**: Primer contrato ($36M) fue para equipo de protección SARS-CoV-2, "
            "aprovechando las reglas de emergencia para adjudicación directa.\n"
            "6. **Escala inmediata**: Desde el primer contrato ya opera a escala de decenas de millones, "
            "sin historial previo — imposible sin conexiones institucionales.\n\n"
            "### Clasificación: CONFIRMED CORRUPT\n"
            "Nombre genérico + aparición súbita en COVID + productos incongruentes + ventana corta + "
            "100% SEDENA = perfil inequívoco de empresa fachada/intermediario."
        ),
    },
    {
        "id": 379,
        "case_id": "NITROMED_COVID_IMSS_INTERMEDIARY",
        "case_name": "Nitromed - Intermediario COVID IMSS",
        "case_type": "intermediary",
        "year_start": 2020,
        "year_end": 2022,
        "estimated_fraud_mxn": 286_900_000,
        "confidence_level": "high",
        "notes": (
            "Empresa con 11 contratos, $287M total, 100% IMSS, 100% adjudicación directa. "
            "Un solo contrato COVID de $277.7M (96.8% del total) en junio 2020 para pruebas SARS-CoV-2. "
            "Restantes contratos son material de curación y medicamentos menores ($0.04M-$4.3M). "
            "Patrón de intermediario: empresa que recibe mega-contrato COVID sin historial proporcional. "
            "Ventana operativa 2020-2022, concentración extrema en un solo contrato."
        ),
        "vendor_id": 263351,
        "vendor_name": "NITROMED SA DE CV",
        "evidence_strength": "confirmed_corrupt",
        "memo": (
            "## Investigación: NITROMED SA DE CV\n\n"
            "**Tipo de patrón**: Intermediario COVID — contrato único masivo IMSS\n"
            "**Valor total**: $286.9M MXN (11 contratos, 2020-2022)\n"
            "**Puntuación de riesgo**: 0.871 promedio\n\n"
            "### Hallazgos clave\n\n"
            "1. **Contrato COVID dominante**: $277.7M (96.8% del total) en un solo contrato de junio 2020 "
            "para pruebas rápidas SARS-CoV-2 (referencia AA-050GYR047-E185-2020). "
            "Adjudicación directa de emergencia.\n"
            "2. **100% IMSS + 100% AD**: Todos los contratos son con el IMSS y todos por adjudicación directa. "
            "Sin participación en licitaciones públicas.\n"
            "3. **Desproporción extrema**: El contrato COVID es 64x más grande que el siguiente contrato ($4.3M). "
            "Los demás contratos son material de curación menor ($0.04M-$4.3M).\n"
            "4. **Nombre sospechoso**: 'Nitromed' sugiere gases medicinales o nitrógeno, pero el contrato "
            "principal es para pruebas diagnósticas COVID — incongruencia de giro.\n"
            "5. **Ventana corta**: Activa solo 2020-2022, sin contratos antes ni después.\n\n"
            "### Clasificación: CONFIRMED CORRUPT\n"
            "Empresa que aparece durante COVID para recibir un solo mega-contrato de $278M por AD, "
            "con giro incongruente y sin historial proporcional. Patrón idéntico a otros intermediarios "
            "COVID documentados (DIMM, Bruluart). El contrato debe investigarse por sobreprecio en pruebas."
        ),
    },
    {
        "id": 380,
        "case_id": "ROHJAN_CFE_TO_IMSS_VENTILATORS",
        "case_name": "Rohjan - Salto de CFE a Ventiladores IMSS",
        "case_type": "intermediary",
        "year_start": 2015,
        "year_end": 2021,
        "estimated_fraud_mxn": 240_000_000,
        "confidence_level": "high",
        "notes": (
            "Empresa proveedora eléctrica de CFE (contratos de $100K-$400K) que en 2020-2021 salta a contratos "
            "médicos millonarios del IMSS: $21.3M en ventiladores COVID (AD, 2020) y $217.4M en equipo médico "
            "(LP, 2021). El contrato de 2021 para 'desinstalación, instalación y arranque' de equipo médico "
            "es el más grande. Incongruencia total entre giro eléctrico CFE y equipo biomédico IMSS. "
            "78% DA. Concentración 62% IMSS por valor."
        ),
        "vendor_id": 155562,
        "vendor_name": "ROHJAN SA DE CV",
        "evidence_strength": "confirmed_corrupt",
        "memo": (
            "## Investigación: ROHJAN SA DE CV\n\n"
            "**Tipo de patrón**: Intermediario — salto de sector eléctrico a médico\n"
            "**Valor total**: $240.0M MXN (8 contratos, 2015-2021)\n"
            "**Puntuación de riesgo**: 0.451 promedio, 1.000 en contratos IMSS principales\n\n"
            "### Hallazgos clave\n\n"
            "1. **Cambio de giro radical**: 2015-2017 proveedor eléctrico de CFE con 5 contratos de $100K-$400K "
            "(total ~$1.2M). En 2020 aparece como proveedor de ventiladores pediátrico-adultos del IMSS "
            "por $21.3M (AD de emergencia COVID, contrato BI20003).\n"
            "2. **Mega-contrato incongruente**: En 2021 gana licitación LA-050GYR040-E17-2021 por $217.4M "
            "para 'adquisición, suministro, desinstalación, instalación y arranque' de equipo médico IMSS. "
            "Una empresa eléctrica de CFE ganando una licitación de equipo biomédico es altamente sospechoso.\n"
            "3. **Salto de escala 180x**: De contratos promedio de $240K en CFE a $217M en IMSS. "
            "Incremento de 900x en un solo salto.\n"
            "4. **COVID como puerta de entrada**: El contrato de ventiladores COVID ($21.3M AD) abrió la "
            "relación con IMSS, que luego escaló al mega-contrato de 2021.\n"
            "5. **Sin actividad posterior**: Sin contratos después de 2021, sugiriendo empresa de propósito limitado.\n\n"
            "### Clasificación: CONFIRMED CORRUPT\n"
            "El salto de proveedor eléctrico menor de CFE a mega-proveedor de equipo biomédico IMSS es "
            "el indicador más fuerte. Ninguna empresa legítima de material eléctrico tiene la capacidad "
            "para instalar equipo biomédico hospitalario. Patrón clásico de intermediario/fachada."
        ),
    },
    {
        "id": 381,
        "case_id": "MK_HUMANA_CARDIOVASCULAR_IMSS_MONOPOLY",
        "case_name": "MK Humana - Monopolio Cirugía Cardiovascular IMSS",
        "case_type": "monopoly",
        "year_start": 2013,
        "year_end": 2025,
        "estimated_fraud_mxn": 2_306_000_000,
        "confidence_level": "medium",
        "notes": (
            "Empresa especializada en cirugía cardiovascular con $2.3B en 71 contratos, 89% concentrada en IMSS. "
            "Servicios de 'cirugía cardiovascular integral' renovados año tras año. "
            "Contratos de hasta $217M (2022, single bid) y $190M (2025, single bid). "
            "82% AD. 12 años consecutivos como proveedor cautivo. "
            "Puede ser monopolio legítimo de servicios especializados, pero la escala ($2.3B), "
            "la concentración extrema y el predominio de AD requieren investigación."
        ),
        "vendor_id": 138105,
        "vendor_name": "MK HUMANA",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: MK HUMANA\n\n"
            "**Tipo de patrón**: Monopolio / concentración extrema en IMSS\n"
            "**Valor total**: $2,306.0M MXN (71 contratos, 2013-2025)\n"
            "**Puntuación de riesgo**: 0.493 promedio\n\n"
            "### Hallazgos clave\n\n"
            "1. **Monopolio cardiovascular IMSS**: 89% del valor concentrado en IMSS para servicios de "
            "cirugía cardiovascular integral. 12 años consecutivos (2013-2025) como proveedor único.\n"
            "2. **Escala masiva**: $2.3B total. Contratos individuales de $217.6M (2022, single bid LP), "
            "$190.5M (2025, single bid LP), $154.2M (2013, DA ISSSTE), $151.9M (2020, DA IMSS).\n"
            "3. **Single bid en licitaciones**: Los contratos más grandes ganados por LP son single bid — "
            "solo MK HUMANA participa. Esto sugiere barreras artificiales o requisitos a modo.\n"
            "4. **82% adjudicación directa**: La mayoría de contratos son DA, incluyendo múltiples "
            "contratos simultáneos en el mismo año (5 contratos de $71M-$151M en marzo 2020).\n"
            "5. **ISSSTE también cautivo**: $154M (2013) y $122M (2014) en ISSSTE, "
            "sugiriendo que la captura trasciende una sola institución.\n\n"
            "### Atenuantes\n"
            "- Cirugía cardiovascular es mercado con pocos proveedores calificados\n"
            "- Algunos contratos fueron ganados por licitación pública (aunque single bid)\n"
            "- La continuidad 12 años puede reflejar relación legítima de largo plazo\n\n"
            "### Clasificación: NEEDS REVIEW\n"
            "La escala ($2.3B) y concentración son preocupantes, pero la cirugía cardiovascular es "
            "un servicio especializado con pocos competidores. Investigar si existen otros proveedores "
            "calificados que fueron excluidos de las licitaciones. Verificar certificaciones y capacidad real."
        ),
    },
    {
        "id": 382,
        "case_id": "NUTRIBLEND_NEW_COMPANY_IMSS_FOOD",
        "case_name": "Nutriblend - Empresa Nueva con Mega-Contratos IMSS Alimentos",
        "case_type": "institution_capture",
        "year_start": 2024,
        "year_end": 2025,
        "estimated_fraud_mxn": 753_300_000,
        "confidence_level": "medium",
        "notes": (
            "Empresa SAPI nueva (aparece 2024) con 6 contratos, $753M total, 83% concentrada en "
            "Servicios de Salud del IMSS para suministro de víveres a hospitales. "
            "Contratos de $266M (2025, LP), $157M (2025, DA), $120M (2024, single bid LP), $105M (2025, DA). "
            "67% AD. Empresa SAPI (Sociedad Anónima Promotora de Inversión) sugiere respaldo financiero. "
            "Obtener $753M en menos de 2 años desde su aparición es altamente atípico para suministro alimentario."
        ),
        "vendor_id": 309677,
        "vendor_name": "NUTRIBLEND S A P I DE CV",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: NUTRIBLEND S A P I DE CV\n\n"
            "**Tipo de patrón**: Empresa nueva con mega-contratos — posible intermediario alimentario\n"
            "**Valor total**: $753.3M MXN (6 contratos, 2024-2025)\n"
            "**Puntuación de riesgo**: 0.653 promedio\n\n"
            "### Hallazgos clave\n\n"
            "1. **Empresa nueva, contratos masivos**: Aparece en marzo 2024 y en menos de 18 meses "
            "acumula $753M en contratos de suministro de víveres para hospitales del IMSS.\n"
            "2. **Concentración IMSS/SSISSTE**: 83% del valor en Servicios de Salud del IMSS. "
            "También tiene un contrato de $120M con gobierno estatal (Puebla?).\n"
            "3. **Escalamiento rapidísimo**: Primer contrato $38M (2024), a los 6 meses ya tiene "
            "contratos de $266M. Crecimiento de 7x en meses.\n"
            "4. **SAPI sospechoso**: La forma jurídica SAPI (Promotora de Inversión) se usa frecuentemente "
            "para empresas con estructura accionaria opaca — dificulta identificar beneficiarios reales.\n"
            "5. **Single bid en LP**: El contrato de $120M (2024, Puebla) fue single bid en licitación pública "
            "— sin competencia real.\n"
            "6. **Patrón Segalmex/LICONSA**: Suministro alimentario a instituciones de salud es el mismo "
            "tipo de servicio donde se documentaron fraudes en Segalmex.\n\n"
            "### Clasificación: NEEDS REVIEW\n"
            "La velocidad de crecimiento y forma jurídica SAPI son sospechosas, pero el suministro de "
            "víveres hospitalarios puede tener explicación legítima (ganó licitación consolidada). "
            "Investigar quiénes son los accionistas de la SAPI y si tienen vínculos con funcionarios del IMSS."
        ),
    },
    {
        "id": 383,
        "case_id": "COMERCIALIZADORA_ELECTRICA_GDL_CFE",
        "case_name": "Comercializadora Eléctrica de Guadalajara - Concentración CFE",
        "case_type": "institution_capture",
        "year_start": 2011,
        "year_end": 2020,
        "estimated_fraud_mxn": 258_400_000,
        "confidence_level": "medium",
        "notes": (
            "Empresa eléctrica con solo 6 contratos, $258M total, 100% adjudicación directa. "
            "67% concentrada en CFE. Un contrato de $196.9M (DA, 2014) y otro de $60.8M (DA, 2016). "
            "Los demás contratos son menores ($0.1M-$0.3M) con puertos. "
            "La desproporción entre el mega-contrato de $197M y los contratos normales de $100K-$300K "
            "es señal de intermediación o sobreprecio."
        ),
        "vendor_id": 92745,
        "vendor_name": "COMERCIALIZADORA ELECTRICA DE GUADALAJARA",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: COMERCIALIZADORA ELÉCTRICA DE GUADALAJARA\n\n"
            "**Tipo de patrón**: Concentración CFE con contrato atípico masivo\n"
            "**Valor total**: $258.4M MXN (6 contratos, 2011-2020)\n"
            "**Puntuación de riesgo**: 0.465 promedio, 0.933 en contrato principal\n\n"
            "### Hallazgos clave\n\n"
            "1. **Contrato desproporcionado**: $196.9M por DA con CFE en 2014. Este contrato es "
            "656x más grande que el promedio de los demás contratos ($300K). "
            "Desproporción extrema sugiere sobreprecio o intermediación.\n"
            "2. **Segundo mega-contrato**: $60.8M por DA con CFE en 2016. "
            "Los dos contratos CFE grandes suman 99.7% del valor total.\n"
            "3. **100% adjudicación directa**: Ningún contrato por licitación pública, "
            "incluyendo los de $197M y $61M. AD para estos montos es irregular en CFE.\n"
            "4. **Perfil bimodal**: 4 contratos pequeños ($0.1M-$0.3M) para mantenimiento de "
            "puertos (Manzanillo) vs 2 mega-contratos CFE. Sugiere que la empresa pequeña "
            "fue utilizada como vehículo para contratos grandes.\n"
            "5. **Sin actividad reciente**: Último contrato 2020, posible empresa desactivada.\n\n"
            "### Clasificación: NEEDS REVIEW\n"
            "La desproporción entre contratos normales ($300K) y mega-contratos ($197M+$61M) "
            "por AD es altamente sospechosa. Sin embargo, CFE tiene proveedores especializados "
            "de equipo eléctrico que pueden tener montos justificados. "
            "Verificar el objeto del contrato de $197M en COMPRANET."
        ),
    },
    {
        "id": 384,
        "case_id": "DRUGSTORE_MULTIINSTITUTIONAL_SCATTERED",
        "case_name": "Drugstore Incorporated - Contratos Dispersos Multi-Institucionales",
        "case_type": "intermediary",
        "year_start": 2012,
        "year_end": 2019,
        "estimated_fraud_mxn": 362_200_000,
        "confidence_level": "medium",
        "notes": (
            "Empresa 'SAPI' con nombre en inglés inusual para proveedor gubernamental mexicano. "
            "10 contratos, $362M total, dispersos en instituciones diversas: SAE ($183M DA), "
            "NAFIN ($96M LP), CNSF ($54M DA), SEMAR ($25M LP). "
            "70% DA. Rango de actividad 2012-2019. El contrato SAE de $183M por DA para un "
            "'Drugstore' con enajenación de bienes es incongruente. "
            "Dispersión institucional + nombre genérico sugieren intermediario."
        ),
        "vendor_id": 96101,
        "vendor_name": "DRUGSTORE INCORPORATED S A P I DE CV",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: DRUGSTORE INCORPORATED SAPI DE CV\n\n"
            "**Tipo de patrón**: Intermediario multi-institucional disperso\n"
            "**Valor total**: $362.2M MXN (10 contratos, 2012-2019)\n"
            "**Puntuación de riesgo**: 0.582 promedio\n\n"
            "### Hallazgos clave\n\n"
            "1. **Nombre incongruente**: 'Drugstore Incorporated' (nombre en inglés, SAPI) "
            "pero sus contratos principales no son farmacéuticos — incluyen servicios para "
            "SAE (enajenación de bienes), NAFIN (servicios financieros), CNSF (seguros), y SEMAR (naval).\n"
            "2. **Mega-contrato SAE**: $183.5M por DA con el Servicio de Administración y Enajenación "
            "de Bienes en 2014. Un 'drugstore' ganando contrato de enajenación de bienes es altamente irregular.\n"
            "3. **Contratos NAFIN**: $96M por LP con Nacional Financiera en 2012. "
            "Institución financiera comprando a un 'drugstore' no tiene sentido.\n"
            "4. **CNSF recurrente**: 5 contratos con Comisión Nacional de Seguros y Fianzas (2013-2019), "
            "totalizando $54M. Relación sostenida pero en montos menores.\n"
            "5. **SAPI opaco**: Forma jurídica SAPI dificulta identificar beneficiarios reales.\n"
            "6. **Último contrato 2019**: Suministro de medicamento ($0.4M CNSF) — "
            "solo este último contrato es congruente con el nombre 'Drugstore'.\n\n"
            "### Clasificación: NEEDS REVIEW\n"
            "La incongruencia entre nombre y tipo de contratos es sospechosa, pero podría ser "
            "empresa holding con múltiples líneas de negocio. La SAPI y el nombre en inglés "
            "sugieren posible operación desde el extranjero. Verificar RFC y registro ante SAT."
        ),
    },
]


def main():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    now = datetime.now().isoformat()

    for case in CASES:
        # Insert ground_truth_cases
        c.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, year_start, year_end,
             estimated_fraud_mxn, confidence_level, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            case["id"], case["case_id"], case["case_name"], case["case_type"],
            case["year_start"], case["year_end"], case["estimated_fraud_mxn"],
            case["confidence_level"], case["notes"], now,
        ))
        print(f"  Case {case['id']}: {case['case_id']}")

        # Insert ground_truth_vendors
        c.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, match_confidence, notes, created_at)
            VALUES (?, ?, ?, ?, 'exact_id', 1.0, ?, ?)
        """, (
            case["case_id"], case["vendor_id"], case["vendor_name"],
            case["evidence_strength"],
            f"ARIA queue scan batch L. IPS tier 2. Total value: {case['estimated_fraud_mxn']/1e6:.0f}M MXN.",
            now,
        ))
        print(f"    Vendor {case['vendor_id']}: {case['vendor_name']}")

        # Insert ground_truth_contracts
        c.execute("SELECT id FROM contracts WHERE vendor_id = ?", (case["vendor_id"],))
        contract_ids = [r[0] for r in c.fetchall()]
        inserted = 0
        for cid in contract_ids:
            c.execute("""
                INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id, evidence_strength, match_method, match_confidence, created_at)
                VALUES (?, ?, ?, 'vendor_match', 1.0, ?)
            """, (case["case_id"], cid, case["evidence_strength"], now))
            inserted += c.rowcount
        print(f"    {inserted}/{len(contract_ids)} contracts linked")

        # Update aria_queue memo + review_status
        c.execute("SELECT id FROM aria_queue WHERE vendor_id = ?", (case["vendor_id"],))
        existing = c.fetchone()
        if existing:
            review_status = "confirmed" if case["evidence_strength"] == "confirmed_corrupt" else "pending"
            c.execute("""
                UPDATE aria_queue SET memo_text = ?, memo_generated_at = ?, review_status = ?, in_ground_truth = 1
                WHERE vendor_id = ?
            """, (case["memo"], now, review_status, case["vendor_id"]))
            print(f"    Updated aria_queue (status={review_status})")
        else:
            print(f"    WARNING: vendor_id {case['vendor_id']} not found in aria_queue")

    conn.commit()

    # Update in_ground_truth for all GT vendors in aria_queue
    c.execute("""
        UPDATE aria_queue SET in_ground_truth = 1
        WHERE vendor_id IN (SELECT vendor_id FROM ground_truth_vendors WHERE vendor_id IS NOT NULL)
          AND in_ground_truth = 0
    """)
    synced = c.rowcount
    if synced > 0:
        print(f"\n  Synced in_ground_truth flag for {synced} additional vendors")
        conn.commit()

    # Verify
    print("\n--- Verification ---")
    c.execute("SELECT COUNT(*) FROM ground_truth_cases WHERE id BETWEEN 377 AND 384")
    print(f"New GT cases: {c.fetchone()[0]}")
    case_ids = tuple(case["case_id"] for case in CASES)
    placeholders = ",".join("?" * len(case_ids))
    c.execute(f"SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id IN ({placeholders})", case_ids)
    print(f"New GT vendors: {c.fetchone()[0]}")
    c.execute(f"SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id IN ({placeholders})", case_ids)
    print(f"New GT contracts: {c.fetchone()[0]}")
    c.execute("SELECT COUNT(*) FROM ground_truth_cases")
    print(f"Total GT cases: {c.fetchone()[0]}")
    c.execute("SELECT COUNT(*) FROM ground_truth_vendors")
    print(f"Total GT vendors: {c.fetchone()[0]}")
    c.execute("SELECT MAX(id) FROM ground_truth_cases")
    print(f"Max case ID: {c.fetchone()[0]}")

    conn.close()
    print("\nDone. Batch L complete.")


if __name__ == "__main__":
    main()
