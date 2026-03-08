"""Write ARIA investigation memos for cases 229-231 vendors."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"

memos = {
    259308: ("needs_review", """CASO: ASIMEX DEL CARIBE + SUMITOMO — RIELES TREN MAYA FONATUR DA SWITCH (~8.5B MXN)

DESCRIPCIÓN DEL PATRÓN:
Asimex del Caribe SA de CV (RFC: ACA870319MDA) y Sumitomo Corporation de Mexico (RFC: SCM780701MBA) suministraron rieles de acero calibre 115 LBS/YDA para el proyecto Tren Maya de FONATUR. El patrón crítico: ambos proveedores ganaron contratos vía Licitación Pública (LP) en diciembre 2020, pero en 2022 el mismo tipo de material fue contratado mediante Adjudicación Directa (DA) sin licitación.

EVIDENCIA ESPECÍFICA:
- Asimex del Caribe: dic-2020 contratos LP por 1.615B + 817M + 783M = 3.215B (competitivo); nov-2022: 1.251B DA de FONATUR (mismo material, sin competencia). Total: 4.467B en 4 contratos.
- Sumitomo Corp Mexico: dic-2020 contratos LP por 809M + 693M = 1.502B (competitivo); oct-2022: 2.566B DA de FONATUR (mismo material). Total: 4.069B en 3 contratos.
- Total DA 2022: Asimex 1.251B + Sumitomo 2.566B = 3.817B sin licitación pública.

ANÁLISIS DEL RIESGO:
El switch de LP a DA para el mismo tipo de material (rieles ferroviarios) en el mismo proyecto (Tren Maya) es una señal de alerta clásica en adquisiciones públicas. En 2020, cuando el proyecto iniciaba, se realizaron licitaciones competitivas; en 2022, cuando el presupuesto era mayor y la urgencia política era alta (inauguración inminente del Tren Maya), se abandonó la competencia. LAASSP Art. 41 permite DA por urgencia o única fuente, pero esto requiere justificación documentada.

CONTEXTO INSTITUCIONAL:
FONATUR (Fondo Nacional de Fomento al Turismo) fue la entidad ejecutora del Tren Maya, uno de los proyectos prioritarios de la administración 2018-2024 con un presupuesto total estimado de 220-250B MXN. El proyecto fue criticado repetidamente por la ASF y organismos internacionales por irregularidades en adquisiciones, impacto ambiental, y falta de transparencia. Este caso relaciona proveedores de infraestructura (Asimex del Caribe es distribuidor de materiales de construcción; Sumitomo es conglomerado japonés con división de materiales de infraestructura).

SUMITOMO: CONSIDERACIONES ESPECIALES:
Sumitomo Corporation es una empresa multinacional japonesa del grupo keiretsu Sumitomo con operaciones globales en 65 países. Su subsidiaria mexicana opera legítimamente desde 1978. La DA de 2.566B puede tener justificación técnica si Sumitomo era el único proveedor de rieles ferroviarios de esa especificación en México/Latinoamérica en 2022. Sin embargo, la coincidencia temporal (ambos proveedores del LP 2020 reciben DA 2022) sugiere coordinación.

SEÑALES DE ALERTA:
1. Switch LP → DA para mismo material y proyecto en 2 años
2. DA de 3.817B combinada sin competencia en periodo preelectoral
3. FONATUR Tren Maya ya tiene antecedentes de irregularidades (Case 21 en GT)
4. Patrón de "foot-in-the-door": ganar LP inicial, luego capturar adquisición mayor via DA

LIMITACIONES DE ANÁLISIS:
- El modelo v5.1 asigna rs=0.932 a Asimex (alto) pero Sumitomo puede tener puntaje diferente dado que es empresa legítima multinacional
- Sin acceso a justificaciones de la DA ni a la convocatoria pública
- Información de contratos LP 2020 puede incluir múltiples tramos del proyecto

LÍNEAS DE INVESTIGACIÓN:
1. Consultar SFP/COMPRANET para justificaciones formales de las DA 2022
2. Verificar si Sumitomo era única fuente para rieles 115 LBS/YDA en 2022
3. Comparar precios unitarios LP-2020 vs DA-2022 (¿sobreprecio en DA?)
4. Cruzar con ASF Cuenta Pública 2022 sobre adquisiciones Tren Maya FONATUR
5. Verificar si funcionarios de FONATUR 2022 tienen vínculos con Asimex/Sumitomo

VEREDICTO: NEEDS REVIEW — Switch LP→DA documentado para 3.817B en rieles Tren Maya. Requiere verificar justificaciones formales de DA y comparar precios unitarios. Prioridad media-alta dado volumen y contexto político del proyecto."""),

    288609: ("needs_review", """CASO: GX2 DESARROLLOS — PLANTA POTABILIZADORA SINALOA SOBREPRECIO EXTREMO (5.89B MXN)

DESCRIPCIÓN DEL PATRÓN:
GX2 Desarrollos SA de CV (RFC: GDE200619SG7) es una empresa constituida en junio de 2020 que recibió un contrato de 5.889 billones de pesos del Gobierno Municipal de Culiacán/Sinaloa en diciembre de 2022 para la "Rehabilitación de componentes del proceso de floculación y sedimentación en Planta Potabilizadora". Este es el primer y único contrato relevante de la empresa: los 2 contratos totalizan 5.892B, siendo el de rehabilitación el 99.95% del total.

EVIDENCIA ESPECÍFICA:
- RFC GDE200619SG7: constituida junio 2020, menos de 2.5 años antes del contrato.
- Contrato dic-2022: 5.889B LP de Gobierno Municipal Estado Sinaloa, descripción: "Rehabilitación de componentes del proceso de floculación y sedimentación en Planta Potabilizadora".
- Contrato oct-2022: 2.9M LP del mismo gobierno, "Pavimentación de concreto hidráulico" (contratos de baja cuantía de aparente legitimidad).
- Empresa nueva (2020) gana mega-contrato (5.889B) en 2022 para obra de infraestructura hidráulica especializada.

ANÁLISIS DE SOBREPRECIO:
El costo de 5.889B MXN para rehabilitar el sistema de floculación y sedimentación de una planta potabilizadora en Sinaloa es extraordinariamente alto. Referencias de mercado:
- La planta potabilizadora nueva El Realito (San Luis Potosí, 1,800 litros/segundo): costo total ~4.3B MXN (2012, incluyendo obra civil, equipamiento y línea de conducción).
- La ampliación de la planta El Pino (Guadalajara, 5,000 L/s): ~6.5B MXN (obra completa, no solo rehabilitación).
- Rehabilitación parcial de sistemas de tratamiento: típicamente 10-30% del costo de construcción nueva.
Una "rehabilitación" de floculación/sedimentación (solo una etapa del proceso de potabilización) a 5.89B MXN sugiere un sobreprecio de 5-15x frente al precio de mercado para una obra equivalente.

CONTEXTO POLÍTICO — SINALOA 2022:
El Gobierno Municipal de Culiacán/Sinaloa en el periodo 2021-2024 fue administrado por el alcalde Jesús Estrada Ferreiro (Morena), quien fue suspendido en diciembre 2022 y destituido en 2023 por el Congreso de Sinaloa por irregularidades administrativas y conflictos con el Congreso estatal. El contrato de 5.889B fue adjudicado precisamente en el periodo de mayor conflictividad política (dic-2022). La coincidencia temporal es notable.

PATRONES DE EMPRESA FANTASMA/NUEVA:
- RFC formato GDE + fecha 2020: empresa joven
- No hay historial previo de contratos federales de infraestructura hidráulica
- Nombre genérico "GX2 Desarrollos" no indica especialización en ingeniería hidráulica
- El único contrato relevante es por obra altamente especializada (floculación, sedimentación, tratamiento de agua potable)
- Patrón clásico: empresa creada específicamente para capturar un contrato determinado

SEÑALES DE ALERTA:
1. Empresa con 2.5 años de antigüedad gana contrato de 5.889B para obra especializada
2. Precio extremadamente alto para rehabilitación parcial de planta potabilizadora
3. Contexto político: alcalde Sinaloa bajo suspensión/destitución en mismo periodo
4. Primer contrato de la empresa = 99.95% de su valor total histórico
5. Gobierno municipal (no federal) reduce supervisión central/ASF

LIMITACIÓN IMPORTANTE:
Este caso involucra gobierno MUNICIPAL, no federal. COMPRANET tiene cobertura limitada de contratos municipales. La jurisdicción de la ASF sobre municipios es indirecta (a través de participaciones federales). La supervisión local (Contraloría Municipal, Congreso estatal) es la vía principal. Sin embargo, si los recursos provinieron de transferencias federales (FISM, FAIS u otros fondos), la ASF tiene jurisdicción.

LÍNEAS DE INVESTIGACIÓN:
1. Identificar fuente de financiamiento (¿recursos propios municipales vs fondos federales?)
2. Consultar Cuenta Pública Municipal Culiacán 2022 (si disponible)
3. Investigar situación legal de GX2 Desarrollos SA de CV en SAT/EFOS
4. Comparar con presupuestos de rehabilitaciones similares en México (CONAGUA bases de datos)
5. Buscar vínculos entre directivos GX2 y funcionarios municipales Culiacán 2022
6. Investigar si obra fue ejecutada o existe en campo

VEREDICTO: NEEDS REVIEW — Empresa nueva 2020 con contrato de 5.889B para obra especializada en contexto político de alcalde destituido. El sobreprecio estimado es 5-15x. Requiere verificar fuente de financiamiento (federal vs municipal) y estado de ejecución de la obra. Caso prioritario para investigación periodística."""),

    305483: ("needs_review", """CASO: COMERCIALIZADORA DE SEGURIDAD PRIVADA CON RESPONSABILIDAD SOCIAL — MONOPOLIO CONAGUA OCLSP 4.342B (2025)

DESCRIPCIÓN DEL PATRÓN:
Comercializadora de Seguridad Privada con Responsabilidad Social (RFC: CSP150702DK4) es una empresa de servicios de seguridad privada que en marzo de 2025 recibió un contrato de 4.342 billones de pesos de la Comisión Nacional del Agua (CONAGUA), específicamente del Organismo de Cuenca Lerma-Santiago-Pacífico (OCLSP), para "SERVICIO DE VIGILANCIA A LOS INMUEBLES DEL OCLSP". Este único contrato representa el 99.4% del valor total histórico del proveedor (4.342B de 4.389B total en 35 contratos).

EVIDENCIA ESPECÍFICA:
- RFC CSP150702DK4: constituida julio 2015.
- Contrato mar-2025: 4.342B LP de CONAGUA-OCLSP, "Servicio de vigilancia a los inmuebles del OCLSP".
- 34 contratos anteriores: total ~47M MXN (promedio ~1.4M por contrato), perfil de empresa mediana de seguridad.
- Salto de valor: contratos previos de 1-5M → un contrato único de 4.342B (incremento de ~3,000x).
- Tipo de procedimiento: LP (licitación pública), no DA.

ANÁLISIS DEL MONTO:
4.342 billones de pesos por servicio de vigilancia a inmuebles del OCLSP es extraordinariamente alto. El Organismo de Cuenca Lerma-Santiago-Pacífico administra infraestructura hidráulica en Jalisco, Michoacán, Guanajuato, Aguascalientes, Nayarit, Colima y partes de otros estados. Pero incluso con cientos de instalaciones físicas, el costo de vigilancia:
- Servicio de guardia privada en México: ~8,000-15,000 MXN/mes por guardia.
- Para alcanzar 4.342B anual se necesitarían: 4,342,000,000 / 12 / 12,000 ≈ 30,000 guardias activos simultáneamente.
- El OCLSP no tiene ~30,000 instalaciones que requieran guardia permanente.
- Contratos de vigilancia gubernamental típicos para organismos de cuencas: 50-300M MXN anuales.
- El sobreprecio estimado vs. mercado: 15-30x sobre valor razonable.

ORGANISMO DE CUENCA LERMA-SANTIAGO-PACÍFICO (OCLSP):
El OCLSP es uno de los 13 organismos de cuenca de CONAGUA. Gestiona la cuenca Lerma-Santiago, una de las más importantes del país (río Lerma, lago de Chapala, río Santiago). En 2024-2025, CONAGUA fue señalada por la ASF por irregularidades en contratación de servicios bajo el nuevo gobierno. El OCLSP en particular ha sido identificado con problemas de gobernanza y presupuestales.

SEÑALES DE ALERTA CRÍTICAS:
1. Concentración extrema: 99.4% del valor histórico del proveedor en UN solo contrato
2. Salto cuantitativo: de contratos de 1-5M MXN a uno de 4.342B MXN (3,000x)
3. Monto absurdo para vigilancia: implica ~30,000 guardias si se toma literalmente
4. Empresa de seguridad mediana sin historial de contratos de esta escala
5. Contrato en 2025 (nuevo gobierno, cambio de autoridades CONAGUA) — posible captura institucional nueva
6. Procedimiento LP pero ganado por empresa sin experiencia comparable documentada

INTERPRETACIONES ALTERNATIVAS:
a) ERROR DE DATOS: El contrato podría ser un error de digitación (¿4.342B debería ser 43.4M?). Verificar en COMPRANET.
b) CONTRATO MARCO PLURIANUAL: Podría ser un contrato de vigilancia por varios años (10-15 años) que infla el total histórico. Aun así, 4.342B/15 años = 290M/año sigue siendo alto.
c) SERVICIOS INTEGRADOS: El "servicio de vigilancia" podría incluir tecnología (cámaras, drones, sistemas de monitoreo remoto) además de guardias físicos.
d) CAPTURA INSTITUCIONAL: Empresa sin historial comparable gana LP de escala inusual, sugiriendo proceso de licitación diseñado a medida.

PERFIL HISTÓRICO DEL PROVEEDOR:
Los 34 contratos anteriores (~47M total) muestran una empresa funcional con contratos reales de seguridad privada en dependencias gubernamentales. RFC desde 2015 = empresa establecida, no reciente. Esto distingue este caso de una empresa fantasma clásica. El patrón es más de "captura institucional" donde una empresa legítima obtiene un contrato desproporcionado.

LÍNEAS DE INVESTIGACIÓN PRIORITARIAS:
1. VERIFICAR MONTO: Consultar expediente en COMPRANET (número de procedimiento LP 2025) para confirmar 4.342B no es error
2. Número exacto de instalaciones OCLSP y personal de seguridad presupuestado
3. Análisis de la convocatoria LP: ¿Requisitos técnicos diseñados para esta empresa?
4. Vínculos entre directivos de la Comercializadora y funcionarios OCLSP/CONAGUA 2024-2025
5. Verificar si hay subcontratación: empresa puede ser intermediaria que subcontrata vigilancia real
6. ASF: ¿El OCLSP tiene observaciones previas en vigilancia y servicios?
7. SFP: ¿La empresa tiene sanciones o inhabilitaciones previas?

VEREDICTO: NEEDS REVIEW — Concentración extrema (99.4% valor en 1 contrato) y monto desproporcionado (4.342B para vigilancia, equivalente a ~30K guardias). Primera acción: verificar que el monto no sea error de datos en COMPRANET. Si confirmado, investigar proceso LP y vínculos con CONAGUA-OCLSP. Prioridad alta por volumen 2025."""),
}

def write_memos():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    for vendor_id, (status, memo_text) in memos.items():
        cur.execute(
            "UPDATE aria_queue SET memo_text=?, review_status=?, memo_generated_at=CURRENT_TIMESTAMP WHERE vendor_id=?",
            (memo_text, status, vendor_id)
        )
        if cur.rowcount == 0:
            cur.execute(
                "INSERT OR IGNORE INTO aria_queue (vendor_id, review_status, memo_text, memo_generated_at) VALUES (?,?,?,CURRENT_TIMESTAMP)",
                (vendor_id, status, memo_text)
            )
        print(f"  VID={vendor_id}: {status}")
    conn.commit()
    cur.execute("SELECT COUNT(*) FROM aria_queue WHERE memo_text IS NOT NULL")
    print(f"Total memos in aria_queue: {cur.fetchone()[0]}")
    conn.close()

if __name__ == "__main__":
    write_memos()
    print("Done.")
