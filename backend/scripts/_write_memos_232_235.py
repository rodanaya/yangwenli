"""Write investigation memos for GT cases 232-235."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

MEMOS = {
    # ─── CASE 232: Manejo Integral / COMESA / PEMEX ─────────────────────────
    136648: """MEMORÁNDUM DE INVESTIGACIÓN — MANEJO INTEGRAL EN CONSULTA EMPRESARIAL SA DE CV

RESUMEN EJECUTIVO
MANEJO INTEGRAL EN CONSULTA EMPRESARIAL SA DE CV (VID=136648) recibió 6,309 millones de pesos en 2014 a través de dos contratos con COMPAÑÍA MEXICANA DE EXPLORACIONES, SA DE CV (COMESA), subsidiaria del Petróleos Mexicanos (PEMEX). La empresa carece de RFC registrado en COMPRANET a pesar de haber recibido montos que representan el 0.1% del presupuesto federal anual. El score de riesgo promedio es 0.577-0.680 con una distancia de Mahalanobis de 777, ubicándola entre los casos más anómalos del modelo estadístico.

DESCRIPCIÓN DE LOS CONTRATOS
El primer contrato (ID=960911, abril 2014) fue adjudicado mediante Licitación Pública por 4,832 millones de pesos para "PRESTACIÓN DE SERVICIOS ESPECIALIZADOS". Seis meses después, en octubre 2014, COMESA adjudicó directamente un segundo contrato (ID=1050579) a la misma empresa por 1,477 millones de pesos con descripción idéntica: "PRESTACIÓN DE SERVICIOS ESPECIALIZADOS". La suma total asciende a 6,309 MXN.

SEÑALES DE ALERTA IDENTIFICADAS

Primera señal: Ausencia de RFC. Una empresa que cobra más de 6,000 millones de pesos al Estado mexicano debería contar con un RFC válido. La ausencia total de registro fiscal en los contratos de COMPRANET imposibilita la trazabilidad tributaria y sugiere que la empresa puede operar como entidad pantalla o que los datos fueron deliberadamente omitidos para dificultar el rastreo.

Segunda señal: Patrón LP seguido de DA. El esquema de obtener un contrato inicial mediante licitación pública (aparentando competencia) y luego complementarlo mediante adjudicación directa al mismo proveedor y con la misma descripción genérica es un patrón clásico de fraude en adquisiciones. La adjudicación directa evita el escrutinio de una segunda licitación competitiva.

Tercera señal: Descripción genérica e imprecisa. "PRESTACIÓN DE SERVICIOS ESPECIALIZADOS" es una descripción que no especifica la naturaleza, alcance o entregables de los servicios. Esta vaguedad facilita la facturación de servicios no prestados o prestados parcialmente, y dificulta la auditoría de resultados.

Cuarta señal: Contraparte es subsidiaria de PEMEX. COMESA (Compañía Mexicana de Exploraciones) es una subsidiaria de exploración de PEMEX. El hecho de que una subsidiaria paraestatal contrate servicios externos por 6.3B MXN a una empresa sin RFC y con nombre genérico eleva sustancialmente el riesgo de desvío de recursos públicos a través de la cadena subsidiaria.

Quinta señal: Concentración en único cliente-año. Los dos contratos ocurren en el mismo año (2014) con el mismo contratante (COMESA). Esto sugiere que la empresa fue creada o activada específicamente para estas transacciones y no tiene actividad comercial diversificada que justifique su existencia.

CONTEXTO DEL ECOSISTEMA PEMEX 2014
El año 2014 coincide con la Reforma Energética impulsada por el gobierno de Enrique Peña Nieto, un período de expansión presupuestaria en PEMEX y sus subsidiarias. Diversas investigaciones periodísticas y de la ASF han documentado múltiples casos de desvío de recursos a través de subsidiarias como COMESA durante este período. El nombre "Manejo Integral en Consulta Empresarial" evoca el tipo de empresas de consultoría registradas específicamente para captar contratos en el contexto del boom petrolero.

RECOMENDACIONES INVESTIGATIVAS
1. Verificar en el SAT si MANEJO INTEGRAL EN CONSULTA EMPRESARIAL SA DE CV tiene RFC registrado y si presentó declaraciones fiscales por los montos recibidos.
2. Consultar Cuenta Pública 2014 de la ASF para revisar si COMESA fue auditada y si estos contratos fueron observados.
3. Buscar en el Diario Oficial de la Federación las convocatorias de licitación de COMESA en 2014 para verificar si hubo realmente competencia en el contrato LP.
4. Cruzar con la base de datos de EFOS del SAT (Art. 69-B CFF) por posibles RFC similares.
5. Investigar la red de empresas de consultoría que obtuvieron contratos de subsidiarias PEMEX en 2014-2015.

CONCLUSIÓN
El perfil de MANEJO INTEGRAL EN CONSULTA EMPRESARIAL combina cinco señales de alerta graves: ausencia de RFC, patrón LP+DA con misma descripción, descripción contractual genérica, contraparte paraestatal subsidiaria, y concentración temporal en un solo año. La evidencia circunstancial sugiere alta probabilidad de empresa intermediaria o de propósito especial creada para triangular recursos de PEMEX. Confianza: ALTA. Se recomienda escalamiento a investigación formal con solicitud de información a la ASF y SFP.""",

    # ─── CASE 233: Armour King / AICM / ISSSTE ──────────────────────────────
    291507: """MEMORÁNDUM DE INVESTIGACIÓN — ARMOUR KING SA DE CV

RESUMEN EJECUTIVO
ARMOUR KING SA DE CV (RFC=AKI1905237F3, VID=291507) es una empresa de seguridad privada constituida en mayo de 2019 que en menos de cuatro años de operación acumuló 2,127 millones de pesos en 15 contratos de seguridad con instituciones públicas críticas: el Aeropuerto Internacional de la Ciudad de México (AICM) y el ISSSTE. La velocidad de acumulación contractual, la adjudicación directa de 370M al ISSSTE para seguridad intramural hospitalaria, y la captura simultánea de dos instituciones de alto perfil representan señales de alerta significativas.

CRONOLOGÍA DE CONTRATOS
El ingreso al mercado de seguridad pública fue inmediato y a gran escala. En noviembre de 2023, apenas cuatro años después de su constitución, ARMOUR KING obtuvo tres contratos simultáneos con el AICM por un total de 787 millones de pesos mediante licitación pública (288M + 249M LP). En diciembre de 2023, obtuvo una adjudicación directa de 370 millones de pesos del ISSSTE para "Seguridad Privada en la Modalidad de Intramuros y/o Vigilancia Desarmada", sin proceso competitivo. En 2025, la empresa continuó su expansión en AICM con cuatro nuevos contratos: dos LP (285M y 278M en junio), una DA (43M en abril) y otra DA (190M en julio) a través del IMSS-Bienestar, además de 76M en contratos con el Instituto Nacional de Migración.

SEÑALES DE ALERTA IDENTIFICADAS

Primera señal: Empresa nueva con escala masiva inmediata. Una empresa de seguridad privada con RFC de mayo 2019 que acumula 2.1B en contratos de seguridad en cuatro años debe justificar su capacidad operativa, nómina y experiencia previa. Las empresas de seguridad privada para instalaciones críticas normalmente requieren años de track record y certificaciones especializadas.

Segunda señal: Adjudicación directa de 370M a ISSSTE para seguridad hospitalaria intramural. Los contratos de seguridad privada en hospitales del ISSSTE involucran acceso a áreas de alta sensibilidad (quirófanos, farmacéuticos, archivos). Una DA de 370M sin licitación para este tipo de servicio implica ausencia de competencia en una adquisición de alto riesgo institucional. Bajo LAASSP, los umbrales para adjudicación directa en seguridad son significativamente menores.

Tercera señal: Captura simultánea AICM + ISSSTE. Ganar contratos de seguridad en el aeropuerto más transitado de México y simultáneamente en los hospitales del ISSSTE sugiere relaciones institucionales privilegiadas que superan la capacidad comercial normal de una empresa de cuatro años.

Cuarta señal: Contratos en AICM de infraestructura crítica nacional. El AICM es infraestructura de seguridad nacional. La concentración de contratos de vigilancia en puntos de inspección de personas (PIP), plataforma y zonas periféricas en una empresa relativamente nueva y sin historial público largo representa un riesgo operativo y potencial de infiltración.

Quinta señal: Patrón LP + DA recurrente en misma institución. El patrón donde se obtiene un contrato LP inicial y luego se complementa con DAs adicionales al mismo proveedor (AICM 2023: LP, luego 2025: LP + múltiples DAs) es consistente con el patrón de inflación contractual por adjudicaciones directas complementarias.

CONTEXTO DEL SECTOR SEGURIDAD PRIVADA México
El mercado de seguridad privada en México está dominado por empresas con décadas de operación (Securitas, G4S, Prosegur, Mex Segu). La penetración masiva de una empresa nueva en contratos de infraestructura crítica estatal es atípica y merece escrutinio. La Secretaría de Seguridad y Protección Ciudadana (SSPC) debe emitir autorizaciones especiales para servicios de seguridad en aeropuertos y hospitales.

RECOMENDACIONES INVESTIGATIVAS
1. Verificar con la SSPC si ARMOUR KING SA DE CV tiene las autorizaciones reglamentarias para servicios de seguridad en aeropuertos e instalaciones hospitalarias.
2. Consultar si la empresa aparece en el Registro de Empresas de Seguridad Privada de la SSPC con la capacidad declarada para contratos de esta escala.
3. Revisar los expedientes de licitación del AICM 2023 para identificar cuántos participantes hubo en los procesos LP y cuáles eran los criterios de evaluación.
4. Investigar vínculos corporativos: socios, representante legal, domicilio fiscal, posibles conexiones con funcionarios del AICM o ISSSTE.
5. Solicitar vía transparencia los informes de supervisión de los contratos de seguridad del AICM para verificar cumplimiento.

CONCLUSIÓN
ARMOUR KING SA DE CV presenta un perfil de crecimiento contractual anómalamente rápido en seguridad de infraestructura crítica, con una adjudicación directa injustificada al ISSSTE y captura simultánea de dos instituciones de alto perfil. La confianza es MEDIA-ALTA por ausencia de antecedentes documentados de corrupción, pero la escala y velocidad de acumulación contractual son inconsistentes con el desarrollo normal de una empresa de seguridad. Se recomienda investigación de vínculos corporativos y revisión de expedientes de licitación.""",

    # ─── CASE 234: Colegio Keller AC / ISSSTE estancias ─────────────────────
    100419: """MEMORÁNDUM DE INVESTIGACIÓN — COLEGIO PARTICULAR KELLER, A.C.

RESUMEN EJECUTIVO
COLEGIO PARTICULAR KELLER, A.C. (VID=100419, sin RFC) es una asociación civil de índole educativa que acumuló 3,140 millones de pesos en 7 contratos con el ISSSTE para la prestación de "Servicios Subrogados de Estancias de Bienestar y Desarrollo Infantil" en Ciudad del Carmen, Campeche. El elemento más alarmante es un contrato de 3,094 millones de pesos adjudicado en julio de 2010 mediante licitación pública, valor extraordinariamente alto para servicios de guardería subrogada en una ciudad de tamaño medio. El score de riesgo es 1.0 (máximo posible) con Mahalanobis promedio de 297.7. La empresa opera sin RFC registrado en COMPRANET.

DESCRIPCIÓN DE LOS CONTRATOS
El contrato dominante (3,094M, LP, julio 2010) representa el 98.5% del valor total acumulado. Los seis contratos restantes (2014-2024) oscilan entre 8 y 12 millones de pesos anuales para el mismo servicio (estancias infantiles subrogadas, Carmen Campeche), lo que sugiere que el contrato de 2010 fue de naturaleza plurianual y los posteriores son renovaciones o complementos. El ISSSTE opera el programa de "Estancias de Bienestar y Desarrollo Infantil" como servicio subrogado a terceros (escuelas, guarderías, centros comunitarios) para el cuidado de hijos de trabajadores del Estado.

SEÑALES DE ALERTA IDENTIFICADAS

Primera señal: Magnitud incompatible con el servicio declarado. Un contrato de 3,094 millones de pesos para servicios de guardería en Ciudad del Carmen, Campeche es extraordinariamente grande. Para contexto: Ciudad del Carmen tiene aproximadamente 220,000 habitantes. Si el contrato cubriera 10 años de operación de una guardería de 500 niños, el costo per cápita anual sería de más de 600,000 pesos por niño — varios órdenes de magnitud por encima de los estándares del ISSSTE para servicios subrogados. El valor sugiere o bien un contrato plurianual muy extenso, o bien inflación masiva de precios.

Segunda señal: Asociación civil en lugar de empresa mercantil. Una A.C. ("Colegio Particular") que presta servicios de guardería a esta escala es inusual. Las AC tienen regímenes fiscales y de transparencia diferentes a las SA de CV, con menor escrutinio de sus operaciones comerciales. El uso de una estructura AC para contratos masivos con el Estado puede ser un mecanismo para reducir la visibilidad corporativa.

Tercera señal: Ausencia de RFC. Al igual que otros casos de alto riesgo en esta base de datos, la carencia de RFC registrado en COMPRANET dificulta la trazabilidad fiscal. Dado que el contrato de 2010 supera los 3,000 MXN — uno de los contratos más grandes en la historia del programa de estancias del ISSSTE — la ausencia de RFC es particularmente sospechosa.

Cuarta señal: Monopolio geográfico en Ciudad del Carmen. Todos los contratos están concentrados en Ciudad del Carmen, Campeche. Esta concentración geográfica exclusiva sugiere que la asociación opera como proveedor único en esa plaza, sin competencia local verificable, lo que facilitaría la sobrevaluación de servicios.

Quinta señal: Score de riesgo máximo. El modelo estadístico RUBLI asigna a esta entidad un risk_score de 1.0 — el valor más alto posible — con Mahalanobis de 297.7. Esto indica que el perfil contractual de Keller es más similar al de proveedores corruptos conocidos que prácticamente cualquier otro proveedor en la base de datos. Las principales variables que impulsan este score son la concentración de vendor (Mahalanobis) y el patrón de contratos.

CONTEXTO PROGRAMA ISSSTE ESTANCIAS BIENESTAR
El programa de Estancias de Bienestar y Desarrollo Infantil del ISSSTE es históricamente uno de los programas con mayor número de irregularidades documentadas por la ASF. La Auditoría Superior de la Federación ha emitido múltiples observaciones sobre sobreprecios, proveedores sin capacidad verificada y contratos multianual sin supervisión adecuada. Ciudad del Carmen es una ciudad petrolera (PEMEX tiene presencia dominante) donde los trabajadores del Estado en el sector energético son un segmento poblacional significativo, lo que podría explicar la demanda de guarderías ISSSTE — pero no justifica un contrato de 3,094M.

RECOMENDACIONES INVESTIGATIVAS
1. Solicitar vía INAI el expediente completo del contrato 2010 (3,094M) incluyendo: bases de licitación, propuestas recibidas, acta de fallo, supervisión y pagos realizados.
2. Consultar las Cuentas Públicas de la ASF 2010-2015 para revisar si el ISSSTE fue auditado en el programa de estancias y si Keller fue mencionado.
3. Verificar con el SAT si COLEGIO PARTICULAR KELLER AC tiene RFC y declaraciones fiscales por los montos recibidos.
4. Investigar si el contrato de 3,094M fue realmente por servicios prestados durante 10+ años o si fue un pago único indebido.
5. Comparar con contratos similares del ISSSTE en otras ciudades de tamaño comparable para establecer benchmark de precios por niño por año.

CONCLUSIÓN
COLEGIO PARTICULAR KELLER, A.C. presenta el score de riesgo máximo del modelo RUBLI (1.0) derivado de la combinación de: valor contractual 2010 extraordinariamente alto para servicios de guardería, estructura AC que reduce transparencia, ausencia de RFC, monopolio geográfico en Ciudad del Carmen, y perfil estadístico máximamente anómalo. La naturaleza del servicio (cuidado infantil subrogado) no justifica contratos de 3,000 MXN. Confianza: MEDIA-ALTA. Prioridad investigativa: solicitar expediente ASF del contrato 2010 y comparar con estándares de costo unitario del programa.""",

    # ─── CASE 235: Analisis Clinicos Leon (primary vendor for the joint case) ─
    14066: """MEMORÁNDUM DE INVESTIGACIÓN — ANALISIS CLINICOS DE LEON SA DE CV / LABORATORIO RAAM DE SAHUAYO

RESUMEN EJECUTIVO
Este caso documenta dos laboratorios de análisis clínicos regionales con patrones de concentración anómala en contratos de salud pública que en conjunto suman 3,302 millones de pesos: ANALISIS CLINICOS DE LEON SA DE CV (VID=14066, 962M en Hospital Regional de Alta Especialidad del Bajío) y LABORATORIO RAAM DE SAHUAYO (VID=245450, RFC=LRS030905Q16, 2,340M en IMSS/ISSSTE/INSABI). Ambos laboratorios presentan escalas contractuales desproporcionadas para su perfil regional, sugiriendo posibles sobreprecios en servicios de laboratorio clínico integral plurianual.

ANÁLISIS: ANALISIS CLINICOS DE LEON SA DE CV (VID=14066)
Esta empresa (sin RFC en COMPRANET) obtuvo 962 millones de pesos en 10 contratos, de los cuales 7 (929M, 96.5%) corresponden al Hospital Regional de Alta Especialidad del Bajío (HRAEB) en Guanajuato. El patrón es de concentración extrema en un solo cliente-hospital: contratos plurianuales de 376M (2021) y 315M (2018) para "Servicio Integral de Laboratorio Clínico" mediante licitación pública. Un laboratorio que captura >90% de su negocio con un solo hospital federal, sin RFC verificable en COMPRANET, y con contratos plurianuales de cientos de millones de pesos presenta señales de posible captura institucional o acuerdo preferencial con funcionarios hospitalarios.

Señales de alerta en ANALISIS CLINICOS DE LEON: (1) Ausencia de RFC — al igual que otros casos de alto riesgo, impide trazabilidad fiscal. (2) Concentración casi total en HRAEB — 96.5% del valor en un solo hospital. Esto es estadísticamente inconsistente con un laboratorio que opera en mercado competitivo. (3) Risk_score_avg=0.997 — prácticamente el máximo posible, indicando que el perfil estadístico es casi indistinguible del de proveedores corruptos confirmados. (4) Contratos plurianuales consecutivos 2016-2021 — ciclos repetidos de adjudicación al mismo proveedor para el mismo servicio, con crecimiento acumulativo.

ANÁLISIS: LABORATORIO RAAM DE SAHUAYO (VID=245450)
LABORATORIO RAAM DE SAHUAYO (RFC=LRS030905Q16) opera desde Sahuayo, Michoacán — municipio de aproximadamente 100,000 habitantes. A pesar de su origen en una ciudad media-pequeña, acumuló 2,340 millones de pesos en 355 contratos (2003-2025) con las principales instituciones de salud del país. La distribución por institución es: IMSS 1,588M (68%), ISSSTE 288M (12%), INSABI/Instituto de Salud para el Bienestar 244M (10%), IMSS-Bienestar 146M (6%).

La escala de RAAM es lo que resulta más anómala: un laboratorio de una ciudad de 100,000 habitantes que maneja contratos de compra consolidada IMSS 2025 por 452M y una adjudicación directa de 274M en junio 2025. Las compras consolidadas del IMSS son procesos nacionales que típicamente benefician a distribuidores o laboratorios con capacidad logística nacional — no a labs regionales de ciudades intermedias. El hecho de que RAAM aparezca en compras consolidadas IMSS de esta magnitud sugiere la posibilidad de triangulación: RAAM como intermediario que obtiene el contrato y subcontrata el servicio analítico real a otro laboratorio, reteniendo margen de intermediación.

Señales de alerta en LABORATORIO RAAM: (1) Escala nacional desde base regional — 355 contratos con IMSS, ISSSTE, INSABI a nivel nacional desde Sahuayo Michoacán. (2) Participación en compras consolidadas IMSS — 452M feb-2025, reservadas normalmente para distribuidores con capacidad nacional. (3) DA de 274M en IMSS jun-2025 — adjudicación directa de gran escala para servicios que en principio requieren licitación. (4) Crecimiento sostenido 2003-2025 — dos décadas de contratos que no sugieren empresa fantasma sino posible sobre-facturación sistemática. (5) Risk_score_avg=0.600 — score medio-alto consistente con patrón de concentración moderada.

HIPÓTESIS DE FRAUDE
La hipótesis más probable es sobreprecio sistemático en contratos de servicio integral de laboratorio clínico, un tipo de servicio donde los precios son difíciles de verificar sin auditoría técnica especializada. Los contratos "integrales" de laboratorio incluyen reactivos, equipos, personal técnico y procesamiento — una combinación que facilita la inflación de precios unitarios. Alternativamente, RAAM podría actuar como intermediario que factura servicios subcontratados con margen de utilidad excesivo, modelo similar al identificado en otros casos de la base de datos RUBLI.

RECOMENDACIONES INVESTIGATIVAS
1. Consultar en la ASF Cuenta Pública 2018-2023 para verificar si el HRAEB fue auditado y si ANALISIS CLINICOS DE LEON tuvo observaciones.
2. Solicitar vía INAI precios unitarios de los contratos de laboratorio clínico integral del HRAEB para comparar con benchmarks nacionales e internacionales.
3. Verificar con el SAT si ambas empresas tienen RFC activo y declaraciones consistentes con los montos recibidos.
4. Investigar la cadena de suministro de LABORATORIO RAAM: ¿fabrica o procesa los análisis en Sahuayo, o subcontrata a laboratorios en Guadalajara o CDMX?
5. Comparar el costo por análisis clínico facturado por estas empresas versus el costo promedio del sector en contratos IMSS similares.

CONCLUSIÓN
El patrón conjunto de ANALISIS CLINICOS DE LEON (concentración extrema en HRAEB, sin RFC, risk_score=0.997) y LABORATORIO RAAM (escala nacional desde base regional, compras consolidadas IMSS, DA de 274M) configura un caso de probable sobreprecio sistemático en servicios de laboratorio clínico a instituciones de salud pública. La confianza es MEDIA dado que los servicios de laboratorio clínico son legítimamente necesarios y contratados regularmente, pero la escala y concentración son estadísticamente anómalas. Se recomienda investigación con énfasis en precios unitarios y capacidad operativa real de ambas empresas.""",
}


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    now = datetime.now().isoformat()

    for vendor_id, memo in MEMOS.items():
        cur.execute(
            "UPDATE aria_queue SET memo_text=?, memo_generated_at=?, review_status='needs_review' "
            "WHERE vendor_id=?",
            (memo.strip(), now, vendor_id)
        )
        rows = cur.rowcount
        name = conn.execute(
            "SELECT name FROM vendors WHERE id=?", (vendor_id,)
        ).fetchone()[0]
        word_count = len(memo.split())
        print(f"VID={vendor_id} ({name}): {rows} row(s) updated, {word_count} words")

    conn.commit()

    # Verify
    print("\n=== VERIFICATION ===")
    for vendor_id in MEMOS:
        row = conn.execute(
            "SELECT vendor_name, memo_generated_at, review_status, "
            "length(memo_text) chars FROM aria_queue WHERE vendor_id=?",
            (vendor_id,)
        ).fetchone()
        if row:
            print(f"  VID={vendor_id}: {row[0]} | at={row[1]} | status={row[2]} | chars={row[3]}")
        else:
            print(f"  VID={vendor_id}: NOT IN aria_queue — memo not written")

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
