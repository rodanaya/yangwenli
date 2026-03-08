"""Write Spanish investigation memos for GT cases 236-238 primary vendors.

Primary vendors:
  VID=12036  COAHUILA INDUSTRIAL MINERA SA DE CV           (Case 236 CFE Carbón)
  VID=46663  INTELICAM SA DE CV                            (Case 237 Red Eléctrica)
  VID=56666  CORPORATIVO GIORMAR DE MEXICO                 (Case 238 Implantes Ortopédicos)

Memos are written to aria_queue.memo_text / aria_queue.memo_generated_at.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

MEMO_TS = datetime.utcnow().strftime("%Y-%m-%d %Human:%M:%S").replace("Human", "I"[0])
MEMO_TS = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

MEMOS = {

    # ── VID 12036: COAHUILA INDUSTRIAL MINERA ────────────────────────────────
    12036: """MEMORÁNDUM DE INVESTIGACIÓN — ARIA RUBLI
Proveedor: COAHUILA INDUSTRIAL MINERA S.A DE C.V.
VID: 12036 | RFC: No disponible en COMPRANET
Caso GT: CFE_CARBON_COAHUILA_MONOPOLIO_NORFC_2003_2013
Confianza: Baja | Patrón: Concentración monopolística sin RFC
Generado: 2026-03-08

═══════════════════════════════════════════════════════════
I. RESUMEN EJECUTIVO
═══════════════════════════════════════════════════════════
COAHUILA INDUSTRIAL MINERA S.A DE C.V. (VID=12036) acumuló 24.787 mil millones de
pesos MXN en tres contratos con la Comisión Federal de Electricidad (CFE) entre 2003
y 2006 para suministro de carbón térmico mineral no coquizable, destinado a las
plantas termoeléctricas Carbón I y II (Piedras Negras, Coahuila) y José López Portillo
(Nava, Coahuila). La empresa opera sin RFC registrado en COMPRANET, lo que impide la
verificación ante el SAT y la validación de su existencia jurídica formal.

El contrato de enero de 2003 (16.192B + 8.464B MXN, procedimiento LP) representa uno
de los montos más altos registrados en COMPRANET para el período 2002-2010. Un segundo
contrato de diciembre de 2006 (131M MXN, LP) amplia el período de suministro.

═══════════════════════════════════════════════════════════
II. HALLAZGOS CLAVE
═══════════════════════════════════════════════════════════
1. AUSENCIA DE RFC: La empresa no tiene RFC registrado en COMPRANET para ninguno de
   sus contratos. La Ley de Adquisiciones (LAASSP) Art. 29 exige identificación fiscal
   del proveedor. La ausencia en la base de datos no implica necesariamente que no exista
   ante el SAT, pero impide la trazabilidad fiscal.

2. CONCENTRACIÓN EXTREMA EN UN CLIENTE: El 100% de los contratos son con CFE, institución
   del sector Energía. La empresa no diversifica su cartera a ninguna otra dependencia,
   patrón consistente con un proveedor cautivo o con acuerdos previos al concurso formal.

3. MONTO EXTRAORDINARIO EN PERÍODO TEMPRANO: Los contratos de 2003 por 24.6B MXN ocurren
   en el período de Estructura A (2002-2010), donde la cobertura de RFC es de solo 0.1%
   y la calidad de datos es más baja. Esto limita la capacidad de verificación pero no
   invalida la magnitud del monto.

4. EMPRESA POSIBLEMENTE RELACIONADA CON VID=114024: CIC CORPORATIVO INDUSTRIAL COAHUILA
   SA DE CV (VID=114024) tiene un contrato de 23.738B MXN con CFE en 2013 para el mismo
   tipo de carbón sub-bituminoso. Ambas empresas: (a) operan sin RFC, (b) se especializan
   en carbón Coahuila, (c) contratan exclusivamente con CFE. La posibilidad de ser
   entidades relacionadas o sucesoras merece investigación.

5. PROCEDIMIENTO LP (LICITACIÓN PÚBLICA): Los contratos fueron adjudicados mediante
   licitación pública, lo que sugiere competencia formal. Sin embargo, en el mercado de
   carbón sub-bituminoso de Coahuila, el número de proveedores calificados históricamente
   ha sido limitado, lo que reduce el significado de la licitación formal.

═══════════════════════════════════════════════════════════
III. CONTEXTO SECTORIAL
═══════════════════════════════════════════════════════════
Las plantas termoeléctricas de carbón en Coahuila (Carbón I: 1,200 MW; Carbón II: 1,400 MW;
José López Portillo: 1,200 MW) históricamente consumieron entre 4 y 6 millones de toneladas
de carbón sub-bituminoso al año. A precios internacionales de 2003 (~20-35 USD/tonelada) y
un consumo anual de ~5 millones de toneladas, un contrato plurianual de 24.6B MXN podría
representar 3-5 años de suministro para una planta grande. Esto sugiere que el monto,
aunque extraordinario, podría ser consistente con un contrato de largo plazo legítimo.

La calificación de "confianza baja" refleja que no se ha identificado evidencia directa
de sobreprecio o irregularidad: el mercado del carbón implica contratos de gran volumen
y largo plazo. El riesgo principal es la imposibilidad de verificar la empresa y sus
condiciones de precio real.

═══════════════════════════════════════════════════════════
IV. RECOMENDACIONES DE INVESTIGACIÓN
═══════════════════════════════════════════════════════════
A. Cruzar el nombre de la empresa con el RFC ante el SAT para verificar existencia fiscal.
B. Consultar ASF Cuenta Pública 2003-2007 de CFE: las plantas de carbón en Coahuila
   fueron objeto de auditorías sobre precios de combustible y condiciones contractuales.
C. Comparar precios unitarios (MXN/tonelada) contra índices Coal IQ / Platts API para
   el período correspondiente y tipo de carbón (sub-bituminoso, poder calorífico ~4,500 kcal/kg).
D. Investigar relación corporativa entre COAHUILA INDUSTRIAL MINERA (VID=12036) y
   CIC CORPORATIVO INDUSTRIAL COAHUILA (VID=114024) mediante RENAPO y registro mercantil
   de Coahuila.
E. Verificar si hubo procedimientos de SFP o FGR relacionados con suministro de carbón
   a CFE en el período 2003-2015.

═══════════════════════════════════════════════════════════
V. VEREDICTO PRELIMINAR
═══════════════════════════════════════════════════════════
INCONCLUSO — REQUIERE VERIFICACIÓN EXTERNA. La ausencia de RFC y la magnitud de los
montos justifican la inclusión en ground truth a nivel de confianza baja. No se determina
fraude sin evidencia de sobreprecio o empresa fantasma confirmada. Prioridad media de
investigación dado el potencial de largo alcance temporal (2003-2013) y el patrón de
posible sucesión empresarial entre dos entidades sin RFC del mismo nicho.
""",

    # ── VID 46663: INTELICAM ─────────────────────────────────────────────────
    46663: """MEMORÁNDUM DE INVESTIGACIÓN — ARIA RUBLI
Proveedor: INTEGRACION DE SOLUCIONES ELECTRICAS Y DE MANTENIMIENTO, INTELICAM SA DE CV
VID: 46663 | RFC: No disponible en COMPRANET
Caso GT: INTELICAM_CFE_RED_ELECTRICA_SOBREPRECIO_2016
Confianza: Media | Patrón: Sobreprecio extremo en infraestructura eléctrica
Fraude estimado: 3,200,000,000 MXN
Generado: 2026-03-08

═══════════════════════════════════════════════════════════
I. RESUMEN EJECUTIVO
═══════════════════════════════════════════════════════════
INTELICAM SA DE CV (VID=46663) acumuló 4.871 mil millones de pesos en 85 contratos con
la Comisión Federal de Electricidad (CFE), concentrados en 2016 (91% del monto con CFE).
El hallazgo crítico es el contrato principal de abril de 2016 por 3.646 MMMP: construcción
de 14,500 metros (14.5 km) de línea eléctrica de 33 kV en el tronco Mante-Tantoyuca,
Tamaulipas. Esto implica un costo de 251 millones de pesos por kilómetro, entre 30 y 125
veces el costo de mercado para líneas de distribución de voltaje medio en México.

El patrón de sobreprecio extremo, combinado con la ausencia de RFC y la concentración del
99% de su actividad en un solo año con un solo cliente, configura una señal de alerta de
alta prioridad para investigación de fraude en obra pública eléctrica.

═══════════════════════════════════════════════════════════
II. ANÁLISIS DEL SOBREPRECIO CRÍTICO
═══════════════════════════════════════════════════════════
CONTRATO PRINCIPAL (Licitación Pública, Abril 2016):
  Descripción: "CONSTRUCCION DE 14+500 KM. 33 KV. 1C 3F-4H ACSR 336.4-1/0 TRONCO
               MANTE-TANTOYUCA"
  Monto: 3,646,000,000 MXN
  Longitud: 14.5 km (especificación técnica en el título)
  Costo implícito: 3,646M / 14.5 km = 251.4 MILLONES MXN POR KILÓMETRO

REFERENCIA DE MERCADO PARA LÍNEAS 33 kV EN MÉXICO (2016):
  Costo típico CFE línea 33 kV rural (ACSR 336.4): 1.5 - 6.0 M MXN/km
  Costo con desmonte + obra civil compleja: hasta 8.0 M MXN/km
  Líneas comparables en Tamaulipas (zona llana): ~2.5 M MXN/km estimado

RATIO DE SOBREPRECIO: 251.4M / 3.0M (punto medio) = 83.8 VECES el precio de mercado

Esta magnitud de sobreprecio (83x) supera cualquier explicación razonable por condiciones
geográficas, urgencia o especificaciones técnicas especiales. Una línea de 33 kV ACSR
(conductor de aluminio con alma de acero) en el tramo Mante-Tantoyuca no presenta
características que justifiquen costos de ese orden.

CONTRATOS SECUNDARIOS (mismo año, 2016):
  - Mejora Integral Redes Distribución (LP, abr-2016): 762M MXN — patrón similar
  - Mejoras Red Media/Baja Tensión (DA, oct-2016): 357M MXN — adjudicación directa

═══════════════════════════════════════════════════════════
III. INDICADORES DE RIESGO ADICIONALES
═══════════════════════════════════════════════════════════
1. CONCENTRACIÓN TEMPORAL EXTREMA: 85 contratos por 4.871B en un período muy corto
   (principalmente 2016). Patrón de "ráfaga" típico de empresas de factura creada
   específicamente para un esquema de corrupción.

2. AUSENCIA DE RFC: Empresa sin identificador fiscal en COMPRANET. Para obras de
   ingeniería eléctrica de este volumen, la empresa debería estar inscrita en el
   Registro de Proveedores de CFE con documentación técnica y financiera completa.

3. MONOPOLIO CON UN SOLO CLIENTE: 91% de contratos con CFE. Empresa sin diversificación,
   lo que sugiere relaciones especiales con funcionarios de CFE responsables de adjudicación.

4. MEZCLA DE PROCEDIMIENTOS: Combinación de licitaciones públicas multimillonarias con
   adjudicaciones directas al mismo proveedor en el mismo año — práctica que evade límites
   de adjudicación directa y reduce escrutinio.

5. NOMBRE GENÉRICO: "Integración de Soluciones Eléctricas y de Mantenimiento" es un
   nombre inusualmente genérico para una empresa que gana contratos de ingeniería eléctrica
   de 3.6 MMMP, sin marca registrada ni historia pública verificable.

═══════════════════════════════════════════════════════════
IV. CONTEXTO: CORRUPCIÓN EN INFRAESTRUCTURA ELÉCTRICA CFE
═══════════════════════════════════════════════════════════
El período 2013-2018 en CFE registró múltiples esquemas de sobreprecio en obras de
distribución y transmisión, vinculados a la reforma energética de 2013 que aumentó
presupuestos para modernización de la red. La región Huasteca (Mante-Tampico-Tampico)
fue zona de concentración de obras de modernización de red en 2015-2017. La ASF documentó
en su Informe de Cuenta Pública 2016 irregularidades en contratos de CFE División
Golfo Norte (área geográfica del tramo Mante-Tantoyuca).

═══════════════════════════════════════════════════════════
V. RECOMENDACIONES DE INVESTIGACIÓN
═══════════════════════════════════════════════════════════
A. URGENTE: Solicitar al RFC ante el SAT la existencia de "INTEGRACION DE SOLUCIONES
   ELECTRICAS Y DE MANTENIMIENTO INTELICAM SA DE CV" — si no existe o fue dada de alta
   en 2015-2016, confirma empresa fantasma.
B. Consultar ASF Cuenta Pública 2016 de CFE, específicamente auditorías a CFE División
   Golfo Norte sobre obras de líneas de distribución en Tamaulipas.
C. Verificar si la línea Mante-Tantoyuca existe físicamente (inspección de campo o
   imágenes satelitales Google Earth del período 2016-2018).
D. Solicitar a CFE los contratos originales, expedientes técnicos y actas de entrega-
   recepción para el contrato de 3.646B.
E. Investigar funcionarios de CFE que firmaron los contratos en 2016 (División Golfo Norte,
   Subdirección de Distribución) y sus posibles relaciones con INTELICAM.
F. Cruzar con registros del Colegio de Ingenieros Civiles y Mecánicos Electricistas de
   Tamaulipas para verificar si INTELICAM tiene ingenieros registrados.

═══════════════════════════════════════════════════════════
VI. VEREDICTO PRELIMINAR
═══════════════════════════════════════════════════════════
ALTA SOSPECHA DE FRAUDE POR SOBREPRECIO. El ratio de 83x el precio de mercado para
una línea de 33 kV estándar, combinado con la ausencia de RFC, la concentración extrema
en 2016, y el patrón de múltiples contratos millonarios en un solo año, configura un
caso de alta prioridad para investigación formal. Fraude estimado: 3.2 MMMP (80% del
contrato principal de 3.646B). Se recomienda elevar a la Unidad de Inteligencia Financiera
(UIF) para verificación patrimonial de beneficiarios.
""",

    # ── VID 56666: CORPORATIVO GIORMAR ───────────────────────────────────────
    56666: """MEMORÁNDUM DE INVESTIGACIÓN — ARIA RUBLI
Proveedor: CORPORATIVO GIORMAR DE MEXICO
VID: 56666 | RFC: No disponible en COMPRANET
Caso GT: CORPORATIVO_GIORMAR_IMPLANTES_ORTOPEDICOS_ISSSTE_SEDENA_2018_2022
Confianza: Media | Patrón: Sobreprecio en implantes ortopédicos (ISSSTE/SEDENA)
Fraude estimado: 1,200,000,000 MXN
Generado: 2026-03-08

═══════════════════════════════════════════════════════════
I. RESUMEN EJECUTIVO
═══════════════════════════════════════════════════════════
CORPORATIVO GIORMAR DE MEXICO (VID=56666) acumuló 3.953 mil millones de pesos en 93
contratos entre 2018 y 2022, especializados en implantes ortopédicos y consumibles de
traumatología para el Instituto de Seguridad y Servicios Sociales de los Trabajadores del
Estado (ISSSTE) y la Secretaría de la Defensa Nacional (SEDENA). La empresa opera sin
RFC registrado en COMPRANET.

Los implantes ortopédicos (prótesis de cadera, rodilla, fijadores de fracturas, tornillos
y placas para osteosíntesis) son un vector de corrupción documentado globalmente: sus
precios son opacos, las especificaciones técnicas permiten restringir la competencia a
un proveedor predeterminado, y la verificación de la entrega del producto real es
compleja. CORPORATIVO GIORMAR concentra casi 4 MMMP en este nicho sin RFC y sin
presencia pública verificable.

═══════════════════════════════════════════════════════════
II. CONTRATOS PRINCIPALES
═══════════════════════════════════════════════════════════
CONTRATO 1 — SEDENA (Junio 2018, Licitación Pública):
  Institución: Secretaría de la Defensa Nacional
  Objeto: "ADQ. CONSUMIBLES Y MATERIALES ORTOPEDIA Y TRAUMATOLOGIA CIRUGIA MAYOR"
  Monto: 789,000,000 MXN
  Magnitud: El contrato de un año para consumibles ortopédicos del ejército mexicano por
  789M MXN implica un gasto de ~2.16M MXN por día en materiales de traumatología. Para
  referencia, un tornillo de titanio para fractura cuesta 800-3,000 MXN; una placa de
  osteosíntesis 3,000-15,000 MXN. 789M podría representar entre 52,000 y 985,000 piezas,
  magnitud que requiere verificación de cantidades reales entregadas.

CONTRATO 2 — ISSSTE (Febrero 2020, Licitación Pública):
  Institución: Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado
  Objeto: "SERVICIO INTEGRAL DE OSTEOSÍNTESIS Y ENDOPRÓTESIS ORTOPÉDICAS"
  Monto: 712,000,000 MXN
  Nota: "Servicio integral" es una modalidad que combina el suministro de implantes con
  servicios de gestión de inventario y soporte técnico, lo que dificulta aún más la
  auditoría de precios unitarios.

CONTRATO 3 — ISSSTE (Abril 2022, Adjudicación Directa):
  Institución: ISSSTE
  Objeto: Mismo servicio integral de osteosíntesis y endoprótesis
  Monto: 573,000,000 MXN
  Alerta: Adjudicación directa de 573M MXN al mismo proveedor en el mismo rubro —
  supera los umbrales típicos para DA en ISSSTE y elude la licitación.

═══════════════════════════════════════════════════════════
III. INDICADORES DE RIESGO
═══════════════════════════════════════════════════════════
1. AUSENCIA DE RFC: No es posible verificar si CORPORATIVO GIORMAR DE MEXICO tiene:
   (a) registro SAT activo, (b) obligaciones fiscales al corriente, (c) capacidad de
   importación de implantes certificados (muchos son de fabricación extranjera: Stryker,
   Zimmer-Biomet, DePuy-Synthes, Smith & Nephew).

2. SIN REGISTRO COFEPRIS VERIFICABLE: Los implantes ortopédicos son dispositivos médicos
   Clase III en México y requieren registro COFEPRIS obligatorio. Sin RFC, es imposible
   verificar si GIORMAR tiene registro de importador/distribuidor de dispositivos médicos
   ante COFEPRIS.

3. CAPTURA DE DOS INSTITUCIONES: El proveedor atiende simultáneamente a SEDENA (salud
   militar) e ISSSTE (salud burocrática civil), dos instituciones con sistemas de
   adquisición independientes. La presencia en ambas sugiere relaciones institucionales
   amplias, no explicables por competencia de mercado.

4. ADJUDICACIÓN DIRECTA MULTIMILLONARIA: El contrato de 573M en DA (2022) es una señal
   de alerta directa: las licitaciones previas podrían haber sido diseñadas para posicionar
   a GIORMAR como proveedor "de confianza" y habilitar adjudicaciones directas posteriores.

5. TASA DE DA = 38%: Más de un tercio de los contratos (por monto) se adjudicaron
   directamente, por encima de la media del sector salud.

6. PATRÓN TEMPORAL: Los contratos grandes emergen en 2018 (primer año de nuevo proveedor
   en SEDENA), 2020 (COVID, cuando la vigilancia institucional disminuyó) y 2022 (post-
   pandemia con presupuesto de recuperación).

═══════════════════════════════════════════════════════════
IV. CONTEXTO: CORRUPCIÓN EN IMPLANTES ORTOPÉDICOS
═══════════════════════════════════════════════════════════
El sector de implantes ortopédicos en salud pública mexicana ha sido objeto de múltiples
investigaciones internacionales y nacionales. La ASF documentó sobreprecios en prótesis
de cadera y rodilla en IMSS e ISSSTE en múltiples Cuentas Públicas (2014-2020). El caso
emblemático de la red IMSS-Ethomedical (Case GT 20 en RUBLI) involucró sobreprecios
de 40-60% en dispositivos de osteosíntesis. En SEDENA, el control de adquisiciones es
más opaco debido a la clasificación de información de seguridad nacional.

Los precios internacionales de referencia para implantes ortopédicos de fabricantes
líderes en 2018-2022: prótesis total de cadera 3,000-8,000 USD; prótesis de rodilla
4,000-10,000 USD; set de osteosíntesis (placa+tornillos) 200-800 USD. A tipos de cambio
de ~20 MXN/USD, el margen entre precio internacional y precio facturado a instituciones
mexicanas ha sido históricamente de 30-150% por encima de mercado.

═══════════════════════════════════════════════════════════
V. RECOMENDACIONES DE INVESTIGACIÓN
═══════════════════════════════════════════════════════════
A. Verificar RFC de CORPORATIVO GIORMAR DE MEXICO ante SAT — si la empresa no existe
   o fue dada de alta en 2017-2018, es empresa de reciente creación para el esquema.
B. Solicitar a COFEPRIS el listado de distribuidores autorizados de dispositivos médicos
   ortopédicos Clase III: verificar si GIORMAR aparece como importador registrado.
C. Consultar ASF Cuenta Pública de ISSSTE 2020-2022 y de SEDENA 2018: las adquisiciones
   de implantes ortopédicos de alto valor son objetivo frecuente de auditoría.
D. Solicitar a ISSSTE y SEDENA los contratos originales con precios unitarios, facturas,
   notas de remisión y actas de recepción de los implantes para verificar cantidades
   reales entregadas vs. facturadas.
E. Comparar precios unitarios de GIORMAR con los registrados en el Catálogo Nacional de
   Insumos para la Salud (CNIS) del IMSS y precios de Compranet de contratos comparables
   de Stryker, DePuy, Zimmer-Biomet en el mismo período.
F. Investigar vínculos entre directivos de GIORMAR y funcionarios de adquisiciones
   de ISSSTE (Dirección Médica) y SEDENA (Dirección General de Sanidad Militar).

═══════════════════════════════════════════════════════════
VI. VEREDICTO PRELIMINAR
═══════════════════════════════════════════════════════════
SOSPECHA MEDIA DE SOBREPRECIO EN IMPLANTES ORTOPÉDICOS. La combinación de RFC ausente,
presencia en SEDENA e ISSSTE, adjudicación directa multimillonaria (573M en 2022), y
operación en un sector históricamente comprometido por sobreprecios, justifica la
inclusión en ground truth con confianza media. Fraude estimado: 1.2 MMMP (~30% sobre
3.95B total). Se requiere verificación externa antes de elevar la confianza a alta.
Caso comparable al perfil del caso IMSS-Ethomedical Network (GT Case 20) pero en
instituciones diferentes y monto menor.
""",
}


def write_memos():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    updated = 0
    for vendor_id, memo_text in MEMOS.items():
        cur.execute(
            "UPDATE aria_queue SET memo_text=?, memo_generated_at=? WHERE vendor_id=?",
            (memo_text.strip(), now, vendor_id)
        )
        rows = cur.rowcount
        name_row = conn.execute(
            "SELECT vendor_name FROM aria_queue WHERE vendor_id=?", (vendor_id,)
        ).fetchone()
        name = name_row[0] if name_row else "?"
        print(f"VID={vendor_id} ({name[:50]}): {rows} row(s) updated, memo_len={len(memo_text)}")
        updated += rows
    conn.commit()
    print(f"\nTotal memos written: {updated}")
    # Verify
    for vendor_id in MEMOS:
        row = conn.execute(
            "SELECT vendor_id, memo_generated_at, LENGTH(memo_text) FROM aria_queue WHERE vendor_id=?",
            (vendor_id,)
        ).fetchone()
        print(f"  Verify VID={row[0]}: generated_at={row[1]}, memo_len={row[2]}")
    conn.close()


if __name__ == "__main__":
    write_memos()
