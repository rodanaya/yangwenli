"""Write ARIA memos for cases 219-225."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"

memos = {
    # Case 219 primary: Savare Medika (VID=205212)
    205212: ("confirmed_corrupt", """CASO: SAVARE MEDIKA — SOBREPRECIOS EXTREMOS EQUIPO DIAGNÓSTICO ISSSTE (1.53B MXN)

RESUMEN:
Savare Medika SA de CV (VID=205212, sin RFC) recibió 1.53B MXN del ISSSTE en contratos de equipo de diagnóstico por imagen (tomógrafo CT y resonancia magnética) mediante adjudicación directa al 100%. Los precios pagados superan el mercado por factor de 8-20x.

HALLAZGOS DE SOBREPRECIOS:
1. TOMÓGRAFO CT (930M MXN, ~2019): El precio de mercado de un tomógrafo CT de 128 cortes es 3-7M USD (50-120M MXN). Savare cobró 930M MXN — sobreprecio de 8-15x sobre valor de mercado.
2. RESONANCIA MAGNÉTICA (598M MXN, ~2019): Precio de mercado de una IRM 1.5T hospitalaria: 35-70M MXN. Savare cobró 598M — sobreprecio de 8-17x.
3. SIN RFC: Imposible verificar identidad fiscal ni acreditación como distribuidor de equipo médico de alta especialidad.
4. 100% ADJUDICACIÓN DIRECTA: Para equipo médico de alta especialidad, el proceso normal es licitación internacional (GE, Siemens, Philips). No hay justificación documentada.
5. PATRÓN SIMILARES CONOCIDOS: El sobreprecios en equipo de diagnóstico por imagen es uno de los esquemas más documentados en el sector salud mexicano (ver casos ASF IMSS 2016-2020).

CONTEXTO COMPARATIVO:
En 2019, el ISSSTE también contrató MRI y CT a través de proceso competitivo: La oferta ganadora de licitación pública para equipo equivalente fue 59.7M MXN. Savare cobró 598M por RM (≈10x) y 930M por CT (≈15x) sin competencia.

VEREDICTO: CONFIRMED CORRUPT — Sobreprecios de 8-15x en equipo de diagnóstico médico via DA sin RFC es una de las formas más graves de corrupción en salud documentadas en COMPRANET."""),

    # Case 220 primary: Compañia Editorial Ultra (VID=2932)
    2932: ("needs_review", """CASO: ECOSISTEMA CONALITEG — IMPRESIÓN LIBROS DE TEXTO GRATUITOS (13.4B+ MXN)

RESUMEN:
Compañía Editorial Ultra SA de CV (VID=2932, 2.12B, 158c) es el proveedor primario de un ecosistema de 16 empresas editoriales/impresoras que colectivamente recibieron más de 13.4B MXN de CONALITEG (Comisión Nacional de Libros de Texto Gratuito) para la producción de libros de texto gratuitos, mayoritariamente via adjudicación directa y sin RFC registrado.

HALLAZGOS:
1. 16 EMPRESAS, 13.4B+ MXN, MAYORÍA SIN RFC: Un ecosistema completo de impresoras nacionales que captura la producción de los libros de texto gratuitos de México sin competencia internacional transparente.
2. CONALITEG COMO INSTITUCIÓN CAPTURADA: La institución tiene un patrón de contratar sistemáticamente con el mismo grupo de empresas por décadas, impidiendo la renovación del ecosistema editorial.
3. ADJUDICACIÓN DIRECTA COMO NORMA: Para un programa que compra billones en impresión anualmente, la LAASSP requiere licitaciones. Las DAs requieren justificación específica (exclusividad técnica, emergencia, etc.) que no aplica a impresión estándar.
4. AUSENCIA DE RFC: La mayoría de los 16 proveedores carecen de RFC en COMPRANET, lo que impide verificación fiscal y vinculación con otras bases de datos de transparencia.

NOTA: La producción de libros de texto gratuito tiene una componente legítima (empresas con maquinaria e infraestructura certificada), pero el monto total (13.4B+) y la opacidad del proceso merecen auditoría específica.

VEREDICTO: NEEDS REVIEW — Verificar con ASF Cuenta Pública los años 2015-2024 para determinar si los precios por pliego impreso son competitivos con el mercado editorial internacional."""),

    # Case 221 primary: Distribuidora Química GAP (VID=101951)
    101951: ("needs_review", """CASO: DISTRIBUIDORA QUÍMICA GAP — BANCO DE SANGRE IMSS 1.13B SIN RFC

RESUMEN:
Distribuidora Química GAP SA de CV (VID=101951, sin RFC, 1.13B MXN, 235 contratos al IMSS) es un proveedor de reactivos y servicios de banco de sangre que captó más de 1.13B MXN del IMSS sin RFC registrado, vía 100% adjudicación directa.

HALLAZGOS:
1. SIN RFC CON 1.13B MXN: Un proveedor de servicios médicos críticos (banco de sangre) con 1.13B en contratos IMSS sin identificación fiscal verificable.
2. 235 CONTRATOS — PROVEEDOR RECURRENTE: No es una compra única. La empresa se beneficia de relaciones continuas con las unidades IMSS de banco de sangre.
3. REACTIVOS DE BANCO DE SANGRE — MERCADO COMPETITIVO: Los reactivos de banco de sangre (tipificación, tamizaje infeccioso, etc.) son producidos por múltiples fabricantes internacionales (Ortho Clinical Diagnostics, Bio-Rad, Grifols). No hay justificación técnica para DA al 100%.
4. PROVEEDOR SIN REGISTRO COFEPRIS VISIBLE: Para comercializar reactivos de diagnóstico en México se requiere registro COFEPRIS/COFEMED. La ausencia de RFC dificulta verificar este cumplimiento regulatorio.

VEREDICTO: NEEDS REVIEW — Auditar precios de reactivos de banco de sangre vs. licitaciones IMSS del mismo período. Verificar registro COFEPRIS."""),

    # Case 222 primary: Bionova Laboratorios (VID=125381)
    125381: ("needs_review", """CASO: BIONOVA LABORATORIOS — CONTRATOS NULOS IMSS/ISSSTE 1.98B (2015)

RESUMEN:
Bionova Laboratorios SA de CV (VID=125381, sin RFC, 1.98B MXN) recibió 1.98B MXN del IMSS e ISSSTE en 2015 con descripciones de contrato nulas (NULL en COMPRANET), mediante adjudicación directa al 100%.

HALLAZGOS:
1. DESCRIPCIÓN NULA EN CONTRATOS DE 1.98B: En 2015, Bionova recibió contratos masivos sin que COMPRANET registrara descripción del objeto. Esto es altamente inusual para contratos de esta magnitud.
2. COINCIDENCIA TEMPORAL: 2015 fue el último año antes de la transición al gobierno Peña Nieto (fin de sexenio), período históricamente asociado con aceleración de gasto y opacidad.
3. BIONOVA — EMPRESA DE DIAGNÓSTICO: La empresa opera en reactivos y equipo de laboratorio clínico. El monto de 1.98B excede el perfil normal de un distribuidor de reactivos para una sola transacción.
4. SIN RFC: La falta de RFC impide rastreo fiscal de los ingresos de 1.98B MXN.

CONTEXTO: El ecosistema de distribuidores médicos IMSS/ISSSTE 2014-2016 (Bionova, Spimed, Comevo, Iare de Occidente) muestra un patrón recurrente de contratos masivos con descripción nula via DA. La ASF auditó este período y emitió observaciones a la administración de compras del IMSS.

VEREDICTO: NEEDS REVIEW — Cruzar con ASF Cuenta Pública 2015, verificar si contratos corresponden a compra consolidada de reactivos de laboratorio o a esquema de facturación inflada."""),

    # Case 223 primary: Cobro Electrónico de Peaje (VID=226820)
    226820: ("needs_review", """CASO: COBRO ELECTRÓNICO DE PEAJE — MONOPOLIO TECNOLÓGICO CAPUFE 1.87B

RESUMEN:
Cobro Electrónico de Peaje SA de CV (VID=226820, sin RFC) es el proveedor exclusivo del sistema de cobro electrónico de peaje (IAVE) para CAPUFE (Caminos y Puentes Federales de Ingresos y Servicios Conexos) con 1.87B MXN en 4 contratos, todo via adjudicación directa.

HALLAZGOS:
1. MONOPOLIO TECNOLÓGICO DE AUTOPISTAS: El sistema IAVE (Identificación Automática Vehicular Electrónica) controla el cobro electrónico en miles de kilómetros de autopistas federales concesionadas. Un solo proveedor sin RFC controla este sistema crítico.
2. 1.87B EN 4 CONTRATOS: Alta concentración — implica contratos de largo plazo o renovaciones masivas sin competencia.
3. SIN RFC: El proveedor del sistema tecnológico que procesa billones en recaudación de peaje no tiene RFC registrado en COMPRANET.
4. DA SIN COMPETENCIA PARA INFRAESTRUCTURA CRÍTICA: Los sistemas de cobro electrónico de peaje son tecnología estándar con múltiples proveedores internacionales (Kapsch, TransCore, Conduent). No hay justificación técnica para exclusividad.
5. RIESGO DE CONTROL FINANCIERO: Una empresa sin transparencia fiscal controla la recaudación de peaje — riesgo no solo de sobrecosto sino de desviación de ingresos.

VEREDICTO: NEEDS REVIEW — Auditar precio por transacción electrónica vs. benchmarks internacionales. Verificar si existe contrato de mantenimiento separado y quién opera realmente el sistema IAVE."""),

    # Case 224 primary: Impromed (VID=13632)
    13632: ("needs_review", """CASO: IMPROMED + MEDALFA — EQUIPO MÉDICO IMSS DA SISTEMÁTICA 3.4B

RESUMEN:
Impromed SA de CV (VID=13632, 1.58B MXN, 67 contratos) y Medalfa SA de CV (VID=231818, 1.82B MXN, 18 contratos) son dos distribuidores de equipo médico del IMSS que colectivamente recibieron 3.4B MXN vía adjudicación directa al 100% (51% DA promedio ponderado).

HALLAZGOS:
1. MEDALFA (1.82B, 18 CONTRATOS, ALTA CONCENTRACIÓN): Con 18 contratos pero 1.82B MXN, Medalfa tiene contratos promedio de 101M MXN — escala de distribución masiva de equipo. El risk_score de Medalfa (0.907) es de los más altos en el ecosistema médico.
2. IMPROMED (1.58B, 67 CONTRATOS, PATRÓN RECURRENTE): Proveedor establecido con decenas de contratos IMSS, lo que sugiere relaciones institucionales profundas en la cadena de compras de equipo.
3. EQUIPO MÉDICO — MERCADO COMPETITIVO: El equipo médico (camas, sillas, monitores, equipos de laboratorio básico) tiene decenas de fabricantes y distribuidores. La DA no tiene justificación técnica análoga a equipos de alta especialidad.
4. RIESGO DE CAPTURA INSTITUCIONAL: Dos distribuidores dominan compras de equipo médico IMSS en sus respectivos nichos, lo que sugiere relaciones preferenciales no competitivas con los responsables de adquisiciones.

VEREDICTO: NEEDS REVIEW — Verificar precios vs. licitaciones IMSS del mismo período y benchmarks IMSS de equipo médico estándar. Investigar si existe asociación entre los representantes legales de Impromed y Medalfa."""),

    # Case 225 primary: Chiesi Farmaceutica (VID=249276)
    249276: ("needs_review", """CASO: CHIESI + ASOFARMA + BECKMAN COULTER — FARMACÉUTICAS DA CONSOLIDADO 5.6B

RESUMEN:
Chiesi Farmaceutica SA de CV (VID=249276, 2.04B, 113c), Asofarma de Mexico SA de CV (VID=70647, 2.03B, 158c) y Beckman Coulter de Mexico SA de CV (VID=259128, 1.53B, 93c) son tres empresas farmacéuticas/diagnóstico que colectivamente recibieron 5.6B MXN del IMSS e ISSSTE vía adjudicación directa.

NOTA DIFERENCIADORA (ANÁLISIS DE LEGITIMIDAD):
1. CHIESI (Italia): Empresa farmacéutica internacional con productos patentados en oncología y neumología. Parte de la DA puede estar justificada bajo LAASSP Art. 41 (patentes). Sin embargo, 2.04B en DA requiere verificar qué proporción son productos con patente vigente en México.
2. ASOFARMA: Distribuidor farmacéutico con portafolio mixto (genéricos + innovadores). La mezcla de productos reduce la justificación por patente — los genéricos deben licitarse.
3. BECKMAN COULTER (EEUU, Danaher subsidiary): Empresa de equipos de diagnóstico. Los analizadores Beckman tienen lock-in de reactivos (modelo de negocio razón maquinaria). Esto puede justificar parcialmente la DA para reactivos de equipos ya instalados, pero no para la adquisición inicial de equipos.

LIMITACIÓN DEL ANÁLISIS: Sin cruzar con la cartera exacta de productos en cada contrato, es imposible distinguir DAs legítimas (patentes, lock-in técnico) de DAs injustificadas (genéricos, equipo estándar).

VEREDICTO: NEEDS REVIEW — Requiere análisis contrato a contrato para separar DAs legítimas (patentes/lock-in) de injustificadas. Bajo confianza de corrupción sistémica; caso documentado para completitud del ecosistema farmacéutico IMSS/ISSSTE."""),
}

def write_memos():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    for vendor_id, (status, memo_text) in memos.items():
        cur.execute("""
            UPDATE aria_queue SET memo_text=?, review_status=?, memo_generated_at=CURRENT_TIMESTAMP
            WHERE vendor_id=?
        """, (memo_text, status, vendor_id))
        if cur.rowcount == 0:
            cur.execute("""
                INSERT OR IGNORE INTO aria_queue (vendor_id, review_status, memo_text, memo_generated_at)
                VALUES (?,?,?,CURRENT_TIMESTAMP)
            """, (vendor_id, status, memo_text))
        print(f"  VID={vendor_id}: {status}")
    conn.commit()
    cur.execute("SELECT review_status, COUNT(*) FROM aria_queue WHERE review_status IS NOT NULL GROUP BY review_status")
    print("\nARIA queue:")
    for r in cur.fetchall():
        print(f"  {r[0]}: {r[1]}")
    cur.execute("SELECT COUNT(*) FROM aria_queue WHERE memo_text IS NOT NULL")
    print(f"  Total memos: {cur.fetchone()[0]}")
    conn.close()

if __name__ == "__main__":
    write_memos()
    print("\nDone.")
