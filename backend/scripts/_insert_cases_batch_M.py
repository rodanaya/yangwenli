"""
Batch M: Insert 8 ground truth cases from ARIA queue scanning.
Cases at IDs 385-392 (offset to avoid collision with batch L agent).
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

CASES = [
    {
        "id": 385,
        "case_id": "SORIANA_DIF_FOOD_SINGLE_BID",
        "case_name": "Tiendas Soriana - Programas Alimentarios DIF Licitación Única",
        "case_type": "monopoly",
        "year_start": 2008,
        "year_end": 2015,
        "estimated_fraud_mxn": 6_855_000_000,
        "confidence_level": "medium",
        "notes": (
            "Cadena de supermercados con 90 contratos por $6.85B. 85% riesgo promedio, 61% adjudicación directa. "
            "Patrón principal: licitaciones públicas con oferente único (single-bid) para programas alimentarios DIF "
            "en múltiples estados (Edomex, Guerrero, Durango, Morelos, Coahuila). Contratos masivos: $1.66B SCT 2015, "
            "$936M Consejo Mujer Edomex 2008, $717M DIF Edomex 2010, $628M DIF Edomex 2009. "
            "En sector salud/bienestar, una cadena comercial no debería ganar consistentemente como oferente único. "
            "Sugiere especificaciones diseñadas para excluir competencia."
        ),
        "vendor_id": 35078,
        "vendor_name": "TIENDAS SORIANA, S. A. DE C. V.",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: TIENDAS SORIANA, S.A. DE C.V.\n\n"
            "**Tipo de patrón**: Monopolio en programas alimentarios DIF\n"
            "**Valor total**: $6,855M MXN (90 contratos, 2008-2015)\n"
            "**Puntuación de riesgo promedio**: 0.849 (crítico)\n\n"
            "### Hallazgos clave\n\n"
            "1. **Oferente único sistemático**: La gran mayoría de contratos son licitaciones públicas donde Soriana "
            "fue el ÚNICO oferente. Esto incluye programas alimentarios DIF en al menos 5 estados.\n"
            "2. **Concentración geográfica estatal**: DIF Estado de México ($1.47B en 3 contratos), "
            "Durango Secretaría de Salud ($699M en 3 contratos), Guerrero ($330M), Coahuila ($281M), Morelos ($258M).\n"
            "3. **Contrato atípico SCT**: $1.66B en 2015 con Secretaría de Comunicaciones y Transportes — una cadena "
            "de supermercados recibiendo contratos de SCT es inusual. También $210M AD en 2015 con SCT.\n"
            "4. **Patrón temporal**: Actividad concentrada 2008-2015, coincidiendo con el periodo Calderón/Peña donde "
            "los programas alimentarios estatales tenían menor supervisión federal.\n"
            "5. **61% adjudicación directa**: Para una cadena comercial que debería competir en mercado abierto.\n\n"
            "### Contexto\n"
            "Soriana es una cadena legítima de supermercados (BMV: SORIANAB), pero su participación dominante "
            "como oferente único en programas alimentarios gubernamentales sugiere especificaciones dirigidas. "
            "En 2012, Soriana fue vinculada al escándalo de tarjetas Monex/PRI durante elecciones presidenciales.\n\n"
            "### Recomendación\n"
            "Investigar las bases de licitación de los programas DIF donde Soriana fue oferente único. "
            "Verificar si las especificaciones excluían a competidores (Chedraui, Walmart, Bodega Aurrerá). "
            "Cruzar con ASF auditorías de DIF estatales 2008-2015."
        ),
    },
    {
        "id": 386,
        "case_id": "ABASTOS_DISTRIBUCIONES_GUARDIA_FOOD",
        "case_name": "Abastos y Distribuciones Institucionales - Alimentación Guardia Nacional/DIF",
        "case_type": "institution_capture",
        "year_start": 2010,
        "year_end": 2025,
        "estimated_fraud_mxn": 6_828_000_000,
        "confidence_level": "medium",
        "notes": (
            "Distribuidor de alimentos con 872 contratos por $6.8B. 46% concentración en una sola institución. "
            "Contratos masivos de alimentación para Guardia Nacional ($301M y $287M, ambos single-bid LP). "
            "También proveedor dominante de víveres para IMSS, DIF, Diconsa. "
            "Presencia en estados: Guerrero ($399M single-bid), Coahuila ($749M 2 contratos single-bid). "
            "Patrón de proveedor cautivo que gana consistentemente como oferente único en licitaciones de alimentos."
        ),
        "vendor_id": 6784,
        "vendor_name": "ABASTOS Y DISTRIBUCIONES INSTITUCIONALES S.A. DE C.V.",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: ABASTOS Y DISTRIBUCIONES INSTITUCIONALES S.A. DE C.V.\n\n"
            "**Tipo de patrón**: Captura institucional — proveedor cautivo de alimentos\n"
            "**Valor total**: $6,828M MXN (872 contratos, 2010-2025)\n"
            "**Puntuación de riesgo promedio**: 0.077\n\n"
            "### Hallazgos clave\n\n"
            "1. **Guardia Nacional cautiva**: 2 contratos de alimentación para Guardia Nacional por $589M total "
            "(2020-2021), ambos por licitación pública con oferente único. Servicios de alimentación para "
            "aspirantes, cadetes y personal de seguridad en todo el país.\n"
            "2. **Volumen masivo IMSS**: Múltiples contratos anuales de víveres para hospitales y guarderías IMSS "
            "($100M+ anuales, 2020-2025). Estos son por LP competitiva — patrón más limpio.\n"
            "3. **Single-bid estatal sospechoso**: $399M Guerrero 2015, $384M + $365M Coahuila 2016-2017, "
            "todos por LP con oferente único. Presupuestos estatales de alimentación con un solo participante.\n"
            "4. **Escala operativa**: 872 contratos en 15 años sugiere capacidad logística real, pero la "
            "concentración en single-bid para contratos estatales grandes es preocupante.\n"
            "5. **32% adjudicación directa**: Moderado, pero los contratos más grandes son por LP single-bid.\n\n"
            "### Atenuantes\n"
            "- Distribución de alimentos institucional requiere logística especializada (cadena de frío, "
            "distribución nacional, comedores)\n"
            "- Contratos IMSS recientes (2020+) muestran competencia real\n\n"
            "### Recomendación\n"
            "Investigar las licitaciones estatales (Guerrero, Coahuila, Durango) donde fue oferente único. "
            "Verificar si hay relación con gobierno estatal. Cruzar con ASF auditorías Guardia Nacional 2020-2021."
        ),
    },
    {
        "id": 387,
        "case_id": "CONTROLADORA_INFRAESTRUCTURAS_WATER",
        "case_name": "Controladora de Operaciones de Infraestructuras - Contratos Agua Single-Bid",
        "case_type": "overpricing",
        "year_start": 2007,
        "year_end": 2009,
        "estimated_fraud_mxn": 4_739_000_000,
        "confidence_level": "medium",
        "notes": (
            "Solo 3 contratos por $4.74B con riesgo 1.0 en todos. Contratos: $2.46B Comisión Estatal del Agua "
            "SLP 2009 (single-bid LP), $2.26B SCT 2007 (single-bid LP), $21M CEA Querétaro 2007 (single-bid LP). "
            "Empresa con nombre genérico que aparece solo para 3 mega-contratos de infraestructura hidráulica "
            "y desaparece. Patrón clásico de vehículo de propósito especial (SPV) para capturar contratos "
            "de agua en periodo 2007-2009."
        ),
        "vendor_id": 29587,
        "vendor_name": "CONTROLADORA DE OPERACIONES DE INFRAESTRUCTURAS, S.A. DE C.V.",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: CONTROLADORA DE OPERACIONES DE INFRAESTRUCTURAS, S.A. DE C.V.\n\n"
            "**Tipo de patrón**: Vehículo de propósito especial (SPV) — mega-contratos agua\n"
            "**Valor total**: $4,739M MXN (3 contratos, 2007-2009)\n"
            "**Puntuación de riesgo**: 1.000 (máximo en todos los contratos)\n\n"
            "### Hallazgos clave\n\n"
            "1. **Solo 3 contratos, $4.7B total**: Empresa que existe exclusivamente para 3 mega-contratos. "
            "Perfil clásico de SPV o empresa pantalla.\n"
            "2. **Mega-contrato SLP**: $2,463M con Comisión Estatal del Agua de San Luis Potosí (2009), "
            "licitación pública con oferente único. Un solo contrato de agua estatal de esta magnitud "
            "es extraordinariamente alto.\n"
            "3. **Mega-contrato SCT**: $2,255M con SCT (2007), también single-bid. Posible obra de "
            "infraestructura carretera/hidráulica.\n"
            "4. **Nombre genérico**: 'Controladora de Operaciones de Infraestructuras' — nombre diseñado "
            "para aparentar solidez corporativa sin revelar operaciones reales.\n"
            "5. **Periodo limitado**: Solo activa 2007-2009, coincidiendo con el final del sexenio Fox "
            "y primeros años de Calderón.\n\n"
            "### Posible error de datos\n"
            "Los montos ($2.46B y $2.26B) podrían ser errores decimales (estructura A, 2007-2009). "
            "Sin embargo, ambos están por debajo del umbral de rechazo de 100B y grandes proyectos "
            "de infraestructura hidráulica pueden alcanzar estos montos.\n\n"
            "### Recomendación\n"
            "Alta prioridad. Verificar existencia legal de la empresa en Registro Público de Comercio. "
            "Cruzar con ASF auditorías de CEA SLP y SCT 2007-2009. Si la empresa no tiene historial "
            "verificable, clasificar como probable empresa fantasma."
        ),
    },
    {
        "id": 388,
        "case_id": "RINOACERO_TAMAULIPAS_STATE",
        "case_name": "Rinoacero - Mega-Contrato Tamaulipas",
        "case_type": "overpricing",
        "year_start": 2008,
        "year_end": 2009,
        "estimated_fraud_mxn": 3_421_000_000,
        "confidence_level": "medium",
        "notes": (
            "Solo 2 contratos por $3.42B, ambos con gobierno de Tamaulipas (Secretaría de Administración). "
            "Contrato principal: $3.42B en 2008 por LP (no single-bid). Segundo contrato: $2.6M en 2009 "
            "por LP single-bid. Ambos con riesgo 1.0. Nombre inusual 'Rinoacero' (referencia a rinoceronte) "
            "para empresa que recibe mega-contratos estatales. Periodo coincide con gobernatura de Eugenio "
            "Hernández Flores (2004-2010), actualmente prófugo por lavado de dinero y peculado."
        ),
        "vendor_id": 37422,
        "vendor_name": "RINOACERO, S.A. DE C.V.",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: RINOACERO, S.A. DE C.V.\n\n"
            "**Tipo de patrón**: Mega-contrato estatal sospechoso — posible empresa fantasma\n"
            "**Valor total**: $3,421M MXN (2 contratos, 2008-2009)\n"
            "**Puntuación de riesgo**: 1.000 (máximo)\n\n"
            "### Hallazgos clave\n\n"
            "1. **Mega-contrato único**: $3,418M con Secretaría de Administración de Tamaulipas en diciembre "
            "2008. Representa 99.9% del valor total de la empresa.\n"
            "2. **Solo 2 contratos**: Perfil de empresa creada para un propósito específico.\n"
            "3. **Contexto político**: El periodo 2008-2009 corresponde a la gobernatura de Eugenio "
            "Hernández Flores, quien tiene órdenes de aprehensión por operaciones con recursos de "
            "procedencia ilícita y peculado. Tamaulipas bajo su gobierno fue señalado por la ASF "
            "por múltiples irregularidades en contratación pública.\n"
            "4. **Nombre inusual**: 'Rinoacero' no corresponde a ningún sector industrial identificable.\n"
            "5. **Diciembre 2008**: Contrato firmado el 15 de diciembre — patrón de gasto de fin de año.\n\n"
            "### Posible error de datos\n"
            "Monto de $3.4B para un solo contrato estatal es extraordinariamente alto (estructura A). "
            "Podría ser error decimal ($3.4M o $34M serían más plausibles para Tamaulipas). "
            "Sin embargo, el contexto de corrupción documentada en esa gobernatura da credibilidad.\n\n"
            "### Recomendación\n"
            "Investigar en Registro Público de Comercio de Tamaulipas. Cruzar con las investigaciones "
            "de la PGR/FGR contra Eugenio Hernández Flores. Verificar monto en COMPRANET original."
        ),
    },
    {
        "id": 389,
        "case_id": "GRUPO_TECNOLOGIA_CIBERNETICA_PASSPORT_IT",
        "case_name": "Grupo de Tecnología Cibernética - Pasaporte Electrónico y TI Gubernamental",
        "case_type": "monopoly",
        "year_start": 2002,
        "year_end": 2025,
        "estimated_fraud_mxn": 5_274_000_000,
        "confidence_level": "medium",
        "notes": (
            "Empresa de TI con 130 contratos por $5.27B. Contrato dominante: $3.33B con SRE en 2020 para "
            "pasaporte electrónico mexicano — licitación pública con oferente único. También captura de "
            "Secretaría de Salud ($604M en múltiples contratos, centro de datos y servicios TI). "
            "38% AD, pero los contratos más grandes son LP single-bid. Presencia en PEMEX, Lotería Nacional, "
            "DIF, Telecomm, CFE. Patrón de monopolio tecnológico con lock-in institucional."
        ),
        "vendor_id": 2423,
        "vendor_name": "GRUPO DE TECNOLOGIA CIBERNETICA S.A. DE C.V.",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: GRUPO DE TECNOLOGÍA CIBERNÉTICA S.A. DE C.V.\n\n"
            "**Tipo de patrón**: Monopolio tecnológico con lock-in institucional\n"
            "**Valor total**: $5,274M MXN (130 contratos, 2002-2025)\n"
            "**Puntuación de riesgo promedio**: 0.413 (alto)\n\n"
            "### Hallazgos clave\n\n"
            "1. **Mega-contrato pasaporte electrónico**: $3,326M con SRE (2020) para 'Servicios Integrales "
            "de Apoyo para la Migración y Emisión del Pasaporte Mexicano Electrónico'. Licitación pública "
            "con oferente único. Un contrato de esta magnitud con un solo participante requiere "
            "investigación de las bases de licitación.\n"
            "2. **Captura de Secretaría de Salud**: $604M en múltiples contratos para centro de datos "
            "y servicios TI (2014-2020). Combinación de AD ($136M, $50M, $52M) y LP single-bid ($321M, $158M). "
            "Relación de 8+ años con la misma dependencia.\n"
            "3. **Diversificación amplia**: Opera en 12+ instituciones (SRE, Salud, PEMEX, Lotería Nacional, "
            "DIF, Telecomm, CFE, NAFIN, SEP, CONACULTA, SEGOB, BANOBRAS). La diversificación reduce "
            "el riesgo de ser proveedor fantasma.\n"
            "4. **Longevidad**: 23 años de operación continua (2002-2025) con 130 contratos.\n"
            "5. **Single-bid dominante en grandes contratos**: Los 4 contratos más grandes ($3.3B, $321M, "
            "$158M, $95M) son todos LP con oferente único.\n\n"
            "### Atenuantes\n"
            "- La diversificación institucional sugiere empresa legítima\n"
            "- Servicios de pasaporte electrónico requieren certificaciones especializadas\n"
            "- 23 años de operación continua\n\n"
            "### Recomendación\n"
            "Investigar las bases de licitación del pasaporte electrónico 2020. ¿Por qué solo un "
            "participante en un contrato de $3.3B? Verificar si las especificaciones técnicas fueron "
            "diseñadas para esta empresa específica. Cruzar con ASF auditoría SRE 2020."
        ),
    },
    {
        "id": 390,
        "case_id": "TECNOPROGRAMACION_SEP_IT_MONOPOLY",
        "case_name": "Tecnoprogramación Humana - Monopolio TI SEP/Gobierno",
        "case_type": "monopoly",
        "year_start": 2002,
        "year_end": 2014,
        "estimated_fraud_mxn": 4_048_000_000,
        "confidence_level": "medium",
        "notes": (
            "Empresa de TI con nombre genérico ('Tecnoprogramación Humana Especializada en Sistemas Operativo') "
            "y 77 contratos por $4.05B. 50% riesgo promedio, 0% AD — todos por LP, pero muchos single-bid. "
            "Contrato principal: $2.52B con SEP (2005) por LP. Segundo: $781M con SEP (2006). "
            "También SEDESOL ($203M), STPS ($71M), Tamaulipas ($48M), IPN ($35M). "
            "Activa 2002-2014, desaparece después. Nombre excesivamente genérico sugiere empresa de propósito."
        ),
        "vendor_id": 1314,
        "vendor_name": "TECNOPROGRAMACION HUMANA ESPECIALIZADA EN SISTEMAS OPERATIVO",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: TECNOPROGRAMACIÓN HUMANA ESPECIALIZADA EN SISTEMAS OPERATIVO\n\n"
            "**Tipo de patrón**: Monopolio TI con nombre genérico — posible empresa pantalla\n"
            "**Valor total**: $4,048M MXN (77 contratos, 2002-2014)\n"
            "**Puntuación de riesgo promedio**: 0.503 (crítico)\n\n"
            "### Hallazgos clave\n\n"
            "1. **Mega-contratos SEP**: $2,517M (2005) y $781M (2006) con Secretaría de Educación Pública. "
            "Ambos por LP. Juntos representan 81% del valor total de la empresa.\n"
            "2. **Nombre genérico sospechoso**: 'Tecnoprogramación Humana Especializada en Sistemas Operativo' "
            "— nombre diseñado para aparentar capacidad técnica sin especificar sector o especialización real.\n"
            "3. **0% adjudicación directa**: Todos los contratos son por LP, pero muchos como oferente único. "
            "Esto sugiere un nivel de sofisticación: la empresa participa en licitaciones diseñadas para ella.\n"
            "4. **Periodo limitado**: Activa 2002-2014, concentrada en la era Fox-Calderón. Desaparece "
            "en el sexenio Peña — posible cambio de nombre o cierre.\n"
            "5. **Diversificación secundaria**: SEDESOL ($203M), STPS ($71M), Presidencia ($16M), "
            "Tamaulipas ($48M), IPN ($35M), CONAFE ($18M), CONACULTA ($15M), SRA ($25M). "
            "Spread across many agencies, all via LP.\n"
            "6. **Tamaulipas conexión**: Contrato de $48M con Secretaría de Administración de Tamaulipas "
            "(mismo periodo de Eugenio Hernández Flores).\n\n"
            "### Recomendación\n"
            "Alta prioridad de investigación. El nombre genérico + mega-contratos SEP + periodo limitado "
            "son indicadores clásicos de empresa pantalla tecnológica. Verificar en SAT si sigue activa "
            "y su actividad económica preponderante. Buscar en ASF auditorías SEP 2005-2006."
        ),
    },
    {
        "id": 391,
        "case_id": "PRODUCTOS_CONCRETO_INFRA_SINGLE_BID",
        "case_name": "Productos y Estructuras de Concreto - Infraestructura Single-Bid Sistemático",
        "case_type": "monopoly",
        "year_start": 2011,
        "year_end": 2014,
        "estimated_fraud_mxn": 3_052_000_000,
        "confidence_level": "medium",
        "notes": (
            "Constructora con 45 contratos por $3.05B. Casi todos por LP single-bid (93% de contratos). "
            "Contratos principales: $771M CONAGUA 2013 (dic 30 — gasto fin de año), $643M API Lázaro Cárdenas "
            "2013, $216M SCT 2014, $157M AGS Agua 2014, $155M Tren Eléctrico Jalisco 2014. "
            "Opera exclusivamente 2011-2014 en infraestructura hidráulica, carretera y ferroviaria. "
            "Diversificación geográfica (NL, AGS, JAL, MEX, Edomex) sugiere red de contratos coordinada."
        ),
        "vendor_id": 46625,
        "vendor_name": "PRODUCTOS Y ESTRUCTURAS DE CONCRETO",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: PRODUCTOS Y ESTRUCTURAS DE CONCRETO\n\n"
            "**Tipo de patrón**: Single-bid sistemático en infraestructura\n"
            "**Valor total**: $3,052M MXN (45 contratos, 2011-2014)\n"
            "**Puntuación de riesgo promedio**: 0.166\n\n"
            "### Hallazgos clave\n\n"
            "1. **Single-bid casi universal**: De 45 contratos, la gran mayoría son licitaciones públicas "
            "con oferente único. Solo 3 contratos tienen AD. Patrón de licitaciones diseñadas.\n"
            "2. **Mega-contrato CONAGUA fin de año**: $771M con CONAGUA el 30 de diciembre de 2013 — "
            "último día hábil del año. Combinación de mega-monto + gasto de fin de año + single-bid.\n"
            "3. **API Lázaro Cárdenas**: $643M para infraestructura portuaria (2013, single-bid). "
            "Contratos portuarios de esta magnitud requieren capacidad técnica significativa.\n"
            "4. **Concentración temporal**: 100% de contratos en periodo 2011-2014. Empresa que aparece "
            "y desaparece en un solo sexenio.\n"
            "5. **Spread geográfico**: CONAGUA, SCT, CFE federales + estatales (NL agua y drenaje, "
            "AGS agua, JAL tren eléctrico, Edomex caminos). Cobertura nacional pero periodo corto.\n"
            "6. **Nombre genérico**: 'Productos y Estructuras de Concreto' — no revela especialización "
            "ni identidad corporativa.\n\n"
            "### Recomendación\n"
            "Investigar en Registro Público de Comercio: ¿empresa constituida poco antes de 2011? "
            "¿Sigue activa después de 2014? Verificar si los socios aparecen en otras constructoras "
            "del periodo. Cruzar con ASF auditorías CONAGUA y API Lázaro Cárdenas 2013."
        ),
    },
    {
        "id": 392,
        "case_id": "INGENIERIA_DESARROLLO_INMOBILIARIO_HOSPITALS",
        "case_name": "Ingeniería y Desarrollo Inmobiliario - Hospitales ISSSTE/IMSS",
        "case_type": "institution_capture",
        "year_start": 2005,
        "year_end": 2025,
        "estimated_fraud_mxn": 7_053_000_000,
        "confidence_level": "medium",
        "notes": (
            "Constructora con 85 contratos por $7.05B. Contratos principales: $3.02B hospital ISSSTE Oaxaca "
            "2025 (single-bid LP), $2.61B hospital ISSSTE Torreón 2022 (adjudicación directa), "
            "$110M 'trabajos extraordinarios' Torreón 2024 (AD), $59M 'segunda etapa extraordinarios' Torreón "
            "2024 (AD). Base en Yucatán (Mérida). Patrón: gana mega-contrato hospital por AD, luego recibe "
            "contratos adicionales por 'trabajos extraordinarios' sin licitación. Escala de $50M a $3B en 6 años."
        ),
        "vendor_id": 121,
        "vendor_name": "INGENIERIA Y DESARROLLO INMOBILIARIO DE MEXICO, S.A. DE C.V.",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: INGENIERÍA Y DESARROLLO INMOBILIARIO DE MÉXICO, S.A. DE C.V.\n\n"
            "**Tipo de patrón**: Captura institucional — mega-hospitales ISSSTE\n"
            "**Valor total**: $7,053M MXN (85 contratos, 2005-2025)\n"
            "**Puntuación de riesgo promedio**: 0.152\n\n"
            "### Hallazgos clave\n\n"
            "1. **Hospital ISSSTE Oaxaca**: $3,016M por LP single-bid (2025). Hospital Regional de Alta "
            "Especialidad de 250 camas. Un solo participante en licitación de $3B es extraordinario.\n"
            "2. **Hospital ISSSTE Torreón**: $2,611M por ADJUDICACIÓN DIRECTA (2022). Hospital Regional "
            "de Alta Especialidad de 250 camas. AD para obra de esta magnitud requiere justificación "
            "excepcional bajo LAASSP.\n"
            "3. **Trabajos extraordinarios**: $110M (jul 2024) + $59M (oct 2024) por AD para 'trabajos "
            "extraordinarios no considerados' en Torreón. Patrón clásico de escalamiento de costos: "
            "contrato base + adendas sin licitación.\n"
            "4. **Crecimiento explosivo**: De contratos de $30-50M en Yucatán (2005-2018) a $2.6B y $3B "
            "en hospitales nacionales ISSSTE (2022-2025). Salto de 60x.\n"
            "5. **Base regional Yucatán**: Históricamente, contratos con IMSS Mérida, gobierno de Yucatán, "
            "CONAGUA local. La transición a mega-hospitales nacionales ISSSTE sugiere conexión política.\n"
            "6. **IMSS + ISSSTE + CONAGUA**: Diversificación institucional pero los mega-contratos se "
            "concentran en ISSSTE (78% del valor total).\n\n"
            "### Recomendación\n"
            "Alta prioridad. La combinación de: (a) Hospital de $2.6B por AD, (b) Hospital de $3B "
            "como oferente único, (c) $169M en 'trabajos extraordinarios' sin licitación, y (d) salto "
            "de 60x en tamaño de contratos — constituye un patrón clásico de captura de mega-obras. "
            "Investigar la justificación de AD para Torreón. Cruzar con ASF auditorías ISSSTE 2022-2025. "
            "Verificar si los socios tienen vínculos con funcionarios ISSSTE."
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
            f"Identified via ARIA queue screening (batch M). Total value: ${case['estimated_fraud_mxn']:,.0f} MXN",
            now,
        ))
        print(f"  -> Vendor {case['vendor_id']}: {case['vendor_name']}")

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
        print(f"  -> {inserted} contracts linked")

        # Upsert aria_queue memo
        c.execute("SELECT id FROM aria_queue WHERE vendor_id = ?", (case["vendor_id"],))
        existing = c.fetchone()
        if existing:
            c.execute("""
                UPDATE aria_queue SET memo_text = ?, memo_generated_at = ?, review_status = 'pending'
                WHERE vendor_id = ?
            """, (case["memo"], now, case["vendor_id"]))
            print(f"  -> Updated memo in aria_queue")
        else:
            c.execute("""
                INSERT INTO aria_queue (vendor_id, vendor_name, memo_text, memo_generated_at, review_status, computed_at,
                    total_contracts, total_value_mxn, avg_risk_score)
                VALUES (?, ?, ?, ?, 'pending', ?, 0, 0, 0)
            """, (case["vendor_id"], case["vendor_name"], case["memo"], now, now))
            print(f"  -> Inserted memo in aria_queue")

    conn.commit()

    # Verify
    case_ids_tuple = tuple(case["case_id"] for case in CASES)
    placeholders = ",".join(["?"] * len(CASES))

    c.execute(f"SELECT COUNT(*) FROM ground_truth_cases WHERE id >= 385 AND id <= 392")
    print(f"\nVerification: {c.fetchone()[0]} new GT cases (expected 8)")

    c.execute(f"SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id IN ({placeholders})", case_ids_tuple)
    print(f"Verification: {c.fetchone()[0]} new GT vendors (expected 8)")

    c.execute(f"SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id IN ({placeholders})", case_ids_tuple)
    print(f"Verification: {c.fetchone()[0]} new GT contracts")

    conn.close()
    print("\nDone. Batch M complete.")


if __name__ == "__main__":
    main()
