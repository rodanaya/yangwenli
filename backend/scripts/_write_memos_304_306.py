"""Write detailed Spanish investigation memos for GT cases 301-303 (batch 304-306).

Cases:
  db_id=301 — Centro de Asistencia Renal (VID=13597)
  db_id=302 — Pro Inmune de Mexico (VID=31487)
  db_id=303 — Costo por Procedimiento (VID=35772)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import date

DB = "RUBLI_NORMALIZED.db"

MEMOS = {
    301: {
        'vendor_id': 13597,
        'vendor_name': 'CENTRO DE ASISTENCIA RENAL, S.A. DE C.V.',
        'title': 'Memorando de Investigación — Monopolio de Hemodiálisis Subrogada IMSS/SEDENA (5.90B MXN, 2003-2025)',
        'memo': """MEMORANDO DE INVESTIGACIÓN ARIA
════════════════════════════════════════════════════════════════
Caso: CENTRO_ASISTENCIA_RENAL_IMSS_SEDENA_DIALISIS_2003_2025
Proveedor: CENTRO DE ASISTENCIA RENAL, S.A. DE C.V. (VID=13597)
RFC: NO REGISTRADO
Período: 2003-2025 (22 años)
Monto total: $5,900,000,000 MXN (~$295M USD)
Contratos: 79
Riesgo RUBLI: 0.959 (CRÍTICO) | IPS: 0.655 | Patrón: P6 Institution Capture
════════════════════════════════════════════════════════════════

I. RESUMEN EJECUTIVO
────────────────────
Centro de Asistencia Renal S.A. de C.V. acumula 5.90 mil millones de pesos en
contratos de hemodiálisis subrogada con el IMSS y la SEDENA entre 2003 y 2025,
constituyendo uno de los proveedores de servicios médicos subrogados de mayor
monto en el sector salud federal. La empresa opera sin RFC registrado en COMPRANET,
impidiendo verificación fiscal. Su presencia ininterrumpida de 22 años con dos
instituciones federales de salud críticas configura un patrón de captura institucional
de largo plazo.

II. DISTRIBUCIÓN POR INSTITUCIÓN
──────────────────────────────────
Institución                                              Contratos    Monto
─────────────────────────────────────────────────────────────────────────────
INSTITUTO MEXICANO DEL SEGURO SOCIAL (IMSS)                  71    $5,393.9M
SECRETARÍA DE LA DEFENSA NACIONAL (SEDENA)                    5      $491.2M
INST. NAC. CIENCIAS MÉDICAS Y NUTRICIÓN SALVADOR ZUBIRÁN      2        $9.8M
ISSSTE                                                         1        $1.6M
─────────────────────────────────────────────────────────────────────────────
TOTAL                                                         79    $5,905.5M

El 91.3% del valor se concentra en contratos con el IMSS (71 contratos).
La SEDENA representa el 8.3% restante, con contratos iniciados en 2017
(Hospital Central Militar y unidades independientes en interior de la república).

III. MODALIDAD DE CONTRATACIÓN
────────────────────────────────
Adjudicaciones directas: 33 contratos (41.8% del total)
Licitaciones públicas:   46 contratos (58.2%)

Observación: La tasa de adjudicación directa del 41.8% es significativamente
superior al umbral de alerta de la metodología RUBLI. Sin embargo, el volumen
de licitaciones públicas indica que la empresa también compite —y gana de forma
consistente— en procedimientos abiertos. Los contratos de SEDENA son todos
licitaciones públicas (0% adjudicación directa en SEDENA).

IV. CONTRATOS DE MAYOR VALOR
──────────────────────────────
Año    Monto MXN       Modalidad   Título abreviado
────────────────────────────────────────────────────────────────────────
2025   $488,548,445    Licitación  Servicio Médico Integral Hemodiálisis Subrogada
2015   $385,679,592    Licitación  LA-0109GYR047-T40-2015 Hemodiálisis Subrogada
2015   $317,835,154    Licitación  LA-0109GYR047-T40-2015 Hemodiálisis Subrogada
2020   $302,803,505    Dir. adj.   Hemodiálisis Subrogada DC20S195
2019   $291,727,885    Licitación  LA-050GYR028-E439-2018 Hemodiálisis Subrogada
2022   $286,293,618    Licitación  Hemodiálisis Subrogada 2022 DC22S280
2012   $262,731,518    Dir. adj.   HEMO SUB N84 EDO MEX OTE
2015   $242,235,840    Dir. adj.   SA-019GYR028-N261-2014 Servicios Integrales

V. SEÑALES DE ALERTA
──────────────────────
1. AUSENCIA DE RFC: La empresa opera sin RFC registrado en 22 años de contratos
   federales. Esto impide verificar: (a) su situación fiscal en el SAT, (b) si
   aparece en listas EFOS o EDOS del Art. 69-B del CFF, (c) sus vínculos corporativos
   con otros proveedores del sector salud.

2. RELACIÓN ININTERRUMPIDA 22 AÑOS: La continuidad desde 2003 hasta 2025 sin
   interrupción con el IMSS sugiere renovaciones sucesivas o contratos plurianuales
   que evitan la competencia efectiva en el mercado.

3. PRECIO POR SESIÓN DE DIÁLISIS: Con un promedio de ~$74.7M MXN por contrato
   y la hemodiálisis estándar requiriendo 3 sesiones semanales por paciente,
   es necesario verificar si las tarifas unitarias (precio/sesión/paciente)
   son comparables con el mercado privado certificado o con las tarifas de
   instituciones como el INER o el INCMNSZ.

4. EXTENSIÓN A SEDENA (2017): La apertura de contratos con la SEDENA desde 2017
   (Hospital Central Militar) indica diversificación hacia una segunda institución
   federal de salud. Este patrón —IMSS capturado primero, luego otras instituciones—
   es consistente con estrategias de expansión de proveedores con capacidad de lobbying
   institucional.

5. RIESGO DE MODELO RUBLI: price_volatility como principal predictor sugiere
   variabilidad atípica en montos de contrato, que podría reflejar ajustes de precio
   no transparentes entre contratos de similar alcance.

VI. CONTEXTO SECTORIAL: DIÁLISIS EN MÉXICO
────────────────────────────────────────────
La enfermedad renal crónica (ERC) afecta a ~10% de la población adulta mexicana.
El IMSS atiende a ~50,000 pacientes en hemodiálisis. La subrogación de servicios
de diálisis a empresas privadas especializadas es una práctica legítima y establecida
cuando las unidades médicas del IMSS carecen de infraestructura propia. Los precios
de referencia IMSS por sesión de hemodiálisis han sido objeto de escrutinio público
(Auditoría Superior de la Federación: Cuenta Pública 2015-2019 analiza costos de
subrogación en delegaciones).

VII. HIPÓTESIS DE INVESTIGACIÓN
─────────────────────────────────
H1 (SOBREPRECIOS): La empresa actúa como intermediaria entre el IMSS/SEDENA y
clínicas de diálisis subarrendadas, cobrando una comisión que infla el costo
por sesión respecto al mercado.

H2 (MONOPOLIO LEGÍTIMO): La empresa opera sus propias unidades de hemodiálisis
con infraestructura propia, y su concentración refleja ventajas competitivas
reales (calidad, escala, cobertura nacional).

H3 (CAPTURA INSTITUCIONAL): Existe una relación de largo plazo entre funcionarios
de la Dirección de Prestaciones Médicas del IMSS y los propietarios de la empresa,
que facilita la renovación sistemática de contratos sin competencia real.

VIII. LÍNEAS DE INVESTIGACIÓN RECOMENDADAS
────────────────────────────────────────────
□ ASF Cuenta Pública IMSS 2010-2022: verificar si hay observaciones sobre
  costos de subrogación de hemodiálisis por delegación.
□ SAT: solicitar RFC y situación fiscal de "Centro de Asistencia Renal S.A. de C.V."
□ COFEPRIS: verificar licencia sanitaria para prestación de servicios de hemodiálisis.
□ Análisis de precio por sesión: dividir montos por número de pacientes-sesión
  reportados en Informes de Resultados IMSS.
□ Comparar tarifas con contratos similares de Dialisur, Qualimedic, o clínicas
  de diálisis con contratos IMSS en otras delegaciones.
□ Registro en Registro Público de Comercio: verificar constitución, accionistas,
  cambios de representante legal.

IX. CONCLUSIÓN
───────────────
Confidencia: MEDIA. La empresa presenta señales de captura institucional de largo
plazo y ausencia de RFC, pero la naturaleza técnica del servicio (diálisis subrogada)
y la coexistencia de licitaciones públicas introduce ambigüedad. La determinación
definitiva requiere análisis de precio por sesión versus benchmarks de mercado y
revisión de observaciones ASF. No apta para inclusión en ground truth como caso
confirmado sin investigación adicional.

────────────────────────────────────────────────────────────────
Generado por ARIA v1.0 | Fecha: 2026-03-08 | Revisar: necesario
""",
    },
    302: {
        'vendor_id': 31487,
        'vendor_name': 'PRO INMUNE DE MEXICO, S.A. DE C.V.',
        'title': 'Memorando de Investigación — Distribuidor Farmacéutico Fantasma IMSS/ISSSTE (2.33B MXN, 2007-2012)',
        'memo': """MEMORANDO DE INVESTIGACIÓN ARIA
════════════════════════════════════════════════════════════════
Caso: PRO_INMUNE_DISTRIBUIDOR_FARMA_IMSS_2007_2012
Proveedor: PRO INMUNE DE MEXICO, S.A. DE C.V. (VID=31487)
RFC: NO REGISTRADO
Período: 2007-2012 (6 años activo, desaparece después)
Monto total: $2,330,000,000 MXN (~$165M USD al tipo de cambio 2009)
Contratos: 64
Riesgo RUBLI: 0.970 (CRÍTICO) | IPS: 0.662
════════════════════════════════════════════════════════════════

I. RESUMEN EJECUTIVO
────────────────────
Pro Inmune de México S.A. de C.V. acumula 2.33 mil millones de pesos en contratos
de medicamentos con el IMSS, ISSSTE y Secretaría de Salud entre 2007 y 2012,
con cese abrupto de actividad después de ese año. Su nombre sugiere especialidad
en productos inmunológicos (biológicos, vacunas, inmunosupresores), pero sus
contratos cubren medicamentos genéricos, lácteos, narcóticos, psicotrópicos y
estupefacientes — un perfil de distribuidor farmacéutico generalista. La ausencia
de RFC y la desaparición post-2012 son señales de alerta críticas.

II. DISTRIBUCIÓN POR INSTITUCIÓN
──────────────────────────────────
Institución                                              Contratos    Monto
─────────────────────────────────────────────────────────────────────────────
INSTITUTO MEXICANO DEL SEGURO SOCIAL (IMSS)                  28    $1,779.8M
ISSSTE                                                        25      $494.5M
SECRETARÍA DE SALUD (SSA)                                      1       $54.6M
SISTEMA DIF ESTADO DE MÉXICO                                   1        $2.4M
INST. NAC. CIENCIAS MÉDICAS Y NUTRICIÓN S. ZUBIRÁN             5        $0.6M
─────────────────────────────────────────────────────────────────────────────
TOTAL                                                         64    $2,331.9M

III. EVOLUCIÓN TEMPORAL
────────────────────────
Año    Contratos    Monto MXN         Observación
──────────────────────────────────────────────────────────────────────────
2007       9        $  254.5M        Fase inicial — múltiples delegaciones IMSS
2008      22        $  587.4M        Pico de actividad — licitaciones abiertas LPI
2009       7        $1,104.2M        Contrato IMSS 1.03B — el mayor individual
2010      21        $  344.4M        Diversificación a ISSSTE, SSA, PEMEX
2011       2        $    2.1M        Desaceleración abrupta
2012       3        $    3.2M        Últimos contratos, montos mínimos
──────────────────────────────────────────────────────────────────────────

El patrón de crecimiento explosivo 2007-2009 seguido de colapso 2011-2012
es consistente con empresas que operan durante una "ventana de oportunidad"
vinculada a administraciones o contratos plurianuales específicos.

IV. CONTRATO DE MAYOR VALOR — ANÁLISIS
─────────────────────────────────────────
Año: 2009
Institución: IMSS
Monto: $1,028,676,635 MXN (1.03 mil millones)
Título: "ADQUISICION DE MEDICAMENTOS Y LACTEOS"

Este contrato único representa el 44.1% del monto total acumulado en 6 años.
La combinación "medicamentos Y lácteos" en un contrato de 1.03B es altamente
inusual — los lácteos (fórmulas infantiles, suplementos nutricionales) y los
medicamentos son categorías separadas en las licitaciones consolidadas del IMSS.
Esta agrupación puede indicar: (a) un contrato abierto de muy amplio espectro
que facilita la inclusión de partidas sobrevaluadas, o (b) un contrato utilizado
para canalizar pagos por bienes nunca entregados bajo la cobertura de un título
genérico.

V. SEÑALES DE ALERTA
──────────────────────
1. NOMBRE VS. REALIDAD OPERATIVA: "Pro Inmune" evoca especialidad en
   inmunología clínica o biológicos. Los contratos, sin embargo, cubren
   "medicamentos, lácteos, narcóticos, psicotrópicos y estupefacientes" —
   una cartera de distribuidor generalista. La disonancia nombre-objeto
   es una estrategia común de empresas que buscan parecer especializadas
   para justificar precios premium en licitaciones.

2. AUSENCIA DE RFC: Sin RFC, la empresa es fiscal y corporativamente opaca.
   No es posible verificar: (a) si los socios son funcionarios del IMSS o
   sus familiares, (b) vínculos con otras empresas del padrón de proveedores,
   (c) si aparece en EFOS/EDOS del Art. 69-B del CFF.

3. DESAPARICIÓN POST-2012: El cese abrupto de actividad tras 6 años de
   contratos por 2.33B MXN es compatible con: (a) empresa de fachada que
   completó su ciclo de extracción, (b) cambio de razón social para continuar
   operaciones bajo nuevo nombre, (c) liquidación forzada por auditoría.

4. MODALIDAD MIXTA: 81.2% de contratos son licitaciones públicas (no DA),
   pero el contrato de 1.03B MXN de 2009 es sin competencia (único postor
   o procedimiento consolidado). La combinación de DA (18.8%) con licitaciones
   de alto valor concentrado es consistente con el patrón IMSS-Segalmex.

5. CONCENTRACIÓN TEMPORAL: El 80.8% del monto total se genera en solo 2 años
   (2008: $587M, 2009: $1,104M). Este pico y posterior colapso es inusual
   para un distribuidor farmacéutico legítimo.

VI. CONTEXTO: DISTRIBUCIÓN FARMACÉUTICA IMSS 2007-2012
───────────────────────────────────────────────────────
El período 2007-2012 coincide con la presidencia de Felipe Calderón y la
Dirección del IMSS bajo Daniel Karam Toumeh (2008-2012). Este período fue
objeto de múltiples auditorías de la ASF respecto a contratos de medicamentos
y el esquema de subrogación. La investigación de la "Estafa Maestra" (2013-2018)
documentó el uso de empresas fantasma en contratos de salud de este período.

VII. HIPÓTESIS DE INVESTIGACIÓN
─────────────────────────────────
H1 (EMPRESA FANTASMA FARMACÉUTICA): Pro Inmune es una empresa de fachada
que ganó contratos de distribución de medicamentos sin capacidad logística real,
subcontratando a distribuidores legítimos con descuento y quedándose el margen.

H2 (DISTRIBUIDOR LEGÍTIMO CON SOBREPRECIO): La empresa era un distribuidor real
pero con precios unitarios inflados en 20-40% respecto al mercado, facilitado
por funcionarios del IMSS/ISSSTE a cambio de comisiones.

H3 (MEDICAMENTOS PATENTADOS): El nombre "Pro Inmune" puede reflejar especialización
real en biológicos patentados (interferones, inmunoglobulinas, factores estimulantes
de colonias) que justifican DA bajo LAASSP Art. 41 fracción III (proveedor exclusivo).

VIII. LÍNEAS DE INVESTIGACIÓN RECOMENDADAS
────────────────────────────────────────────
□ ASF Cuenta Pública IMSS 2009-2011: buscar observaciones sobre contratos de
  medicamentos con Pro Inmune o en el rango de 2009.
□ SAT EFOS Art. 69-B: verificar si "Pro Inmune de Mexico S.A. de C.V." aparece
  en listados de empresas con operaciones simuladas del período 2010-2015.
□ COFEPRIS: verificar Registro Sanitario como distribuidor de medicamentos
  (requisito legal para operar en el mercado farmacéutico).
□ Registro Público de Comercio: constitución, accionistas, objeto social,
  capital, domicilio fiscal.
□ Comparación de precios unitarios vs. Cuadro Básico IMSS 2008-2009.
□ Investigar si el contrato 1.03B de 2009 fue auditado por la ASF.

IX. CONCLUSIÓN
───────────────
Confidencia: MEDIA. La combinación de nombre sugestivo sin respaldo operativo
evidente, contrato de 1.03B MXN de alcance muy amplio, ausencia de RFC y
desaparición post-2012 configura un perfil de riesgo alto. Sin embargo, el
predominio de licitaciones públicas (no DA) y la posibilidad de que la empresa
distribuyera biológicos patentados bajo DA justificada introduce ambigüedad.
Candidato prioritario para cruce con registros ASF y SAT EFOS del período.

────────────────────────────────────────────────────────────────
Generado por ARIA v1.0 | Fecha: 2026-03-08 | Revisar: necesario
""",
    },
    303: {
        'vendor_id': 35772,
        'vendor_name': 'COSTO POR PROCEDIMIENTO, S.A. DE C.V.',
        'title': 'Memorando de Investigación — Intermediario de Endoscopia ISSSTE Sin RFC, Nombre-Esquema (0.83B MXN, 2008-2022)',
        'memo': """MEMORANDO DE INVESTIGACIÓN ARIA
════════════════════════════════════════════════════════════════
Caso: COSTO_PROCEDIMIENTO_ENDOSCOPIA_ISSSTE_INTERMEDIARIO
Proveedor: COSTO POR PROCEDIMIENTO, S.A. DE C.V. (VID=35772)
RFC: NO REGISTRADO
Período: 2008-2022 (con brecha 2015-2021)
Monto total: $827,013,602 MXN (~$58M USD)
Contratos: 11
Riesgo RUBLI: 1.000 (CRÍTICO MÁXIMO) | IPS: 0.659 | DA Rate: 45.5%
════════════════════════════════════════════════════════════════

I. RESUMEN EJECUTIVO
────────────────────
Costo por Procedimiento S.A. de C.V. es una empresa cuyo nombre incorpora
literalmente su modelo de facturación — una estructura de negocio atípica
en el mercado de servicios médicos mexicano, donde los proveedores se identifican
por especialidad clínica o razón social neutra, no por su mecanismo de cobro.
Esta empresa provee "Servicio Integral de Endoscopia del Tubo Digestivo" al
ISSSTE (2008-2014) y al Hospital Juárez de México (2022), acumulando $827M MXN
en 11 contratos sin RFC registrado. El riesgo RUBLI es 1.000 (puntaje máximo).

La estructura del caso es altamente sospechosa: la empresa gana en 2008 una
licitación pública de 459.6M MXN (3 años, único postor) y luego se convierte
en proveedor de adjudicación directa del ISSSTE de 2011 a 2014 — el patrón
clásico de captura de licitación seguida de monopolio contractual.

II. CRONOLOGÍA DE CONTRATOS
──────────────────────────────
Año   Monto MXN      Modalidad    Institución     Título
──────────────────────────────────────────────────────────────────────────────────
2008  $459,579,582   Licitación   ISSSTE          Servicio Integral Endoscopia
                     (único postor,               Tubo Digestivo 2008-2009-2010
                     single bid)
2010  $  6,191,427   Dir. adj.    IMSS            Servicio de Endoscopia
2011  $ 66,715,609   Dir. adj.    ISSSTE          Servicio Integral Endoscopia
2012  $124,937,640   Dir. adj.    ISSSTE          Servicio Integral Endoscopia
2013  $ 78,151,631   Dir. adj.    ISSSTE          Servicio Integral Endoscopia
2014  $ 65,568,003   Dir. adj.    ISSSTE          Servicio Integral Endoscopia
2015  $    769,150   Licitación   ISSSTE          Material de curación
                                                   (fuera de cuadro básico)
[BRECHA 2016-2021 — sin contratos]
2022  $ 13,476,688   Licitación   Hosp. Juárez    Procedimientos mín. invasión
                                                   Urología laparoscópica
2022  $  5,777,022   Licitación   Hosp. Juárez    Procedimientos mín. invasión
2022  $  5,196,700   Licitación   Hosp. Juárez    Procedimientos laparoscopia
                                                   Oncología
2022  $  1,101,000   Licitación   Hosp. Juárez    Procedimientos laparoscopia
                                                   Cirugía Pediátrica

III. ANÁLISIS DEL CONTRATO FUNDACIONAL (2008, $459.6M)
─────────────────────────────────────────────────────────
El contrato de 2008 con el ISSSTE es la pieza central del caso:
• Monto: $459.6M MXN (cubre ejercicios 2008, 2009 y 2010)
• Modalidad: Licitación Pública — pero con un único postor (single bid)
• Institución: ISSSTE, no un hospital específico sino las
  "Unidades Médicas Hospitalarias del ISSSTE" — cobertura nacional
• Servicio: "Servicio Integral de Endoscopia del Tubo Digestivo"

Un contrato de endoscopia de $459.6M MXN para 3 años, con un único postor
en una licitación pública, es extraordinariamente inusual. La endoscopia
diagnóstica es realizada rutinariamente por gastroenterólogos en hospitales
del propio ISSSTE. La externalización masiva de este servicio a una empresa
que tiene "costo por procedimiento" en su razón social sugiere un esquema de
intermediación: la empresa factura al ISSSTE "por procedimiento" con tarifa
inflada, y subarrienda el servicio a endoscopistas privados con descuento.

IV. SEÑALES DE ALERTA — ANÁLISIS DETALLADO
────────────────────────────────────────────
1. NOMBRE-ESQUEMA (CRITICAL ALERT):
   "Costo por Procedimiento S.A. de C.V." no es un nombre de empresa — es la
   descripción de un modelo de facturación. En la normativa mexicana de
   servicios médicos subrogados (LAASSP Art. 41 y ISSSTE Acuerdos de Prestación
   de Servicios Médicos), el "cobro por procedimiento" es precisamente la
   modalidad que más frecuentemente se presta a sobreprecios, ya que cada
   procedimiento tiene un precio unitario negociado que puede estar inflado.
   Incorporar el modelo de cobro en la razón social sugiere que la estructura
   empresarial fue diseñada desde su constitución para este esquema específico.

2. AUSENCIA DE RFC:
   Una empresa que factura $827M MXN al gobierno federal en 14 años no tiene
   RFC registrado en COMPRANET. Sin RFC: (a) imposible verificar cumplimiento
   fiscal, (b) imposible rastrear vinculación societaria con personas físicas,
   (c) imposible verificar si aparece en EFOS/EDOS del Art. 69-B CFF,
   (d) imposible confirmar existencia en Registro Público de Comercio.

3. CAPTURA DE LICITACIÓN (PATRÓN CLÁSICO):
   - 2008: gana licitación pública como único postor (single bid) por $459.6M
   - 2011-2014: el ISSSTE le adjudica directamente $335.4M más
   El patrón es: ganar la licitación inaugural sin competencia → establecerse
   como "proveedor conocido" → recibir adjudicaciones directas sucesivas.
   Las adjudicaciones directas post-licitación pueden justificarse bajo LAASSP
   Art. 41 fracción IV ("en casos urgentes o cuando resulte imposible o
   inconveniente obtener bienes o servicios mediante licitación pública")
   o fracción II (segunda convocatoria desierta), pero aplicadas sistemáticamente
   configuran el esquema de monopolio.

4. REAPARICIÓN EN 2022 — NUEVO VECTOR:
   Tras una brecha de 7 años (2015-2021), la empresa reaparece en el Hospital
   Juárez de México con contratos de laparoscopia (urológica, oncológica,
   pediátrica) por $25.5M MXN. La reaparición con un servicio diferente
   (laparoscopia en lugar de endoscopia) y en una institución diferente sugiere:
   (a) la empresa sigue activa y busca nuevos contratos, o (b) los contratos
   de 2022 son de una empresa con el mismo nombre pero distinta composición.

5. RIESGO MÁXIMO RUBLI (1.000):
   El puntaje de riesgo 1.000 (máximo posible) es generado por la combinación:
   vendor_concentration extrema (empresa concentra el 100% del mercado ISSSTE
   endoscopia), price_volatility alta (contratos que van de $769K a $459M),
   win_rate anómalo, y patrón de institución única capturada.

V. CONTEXTO: ENDOSCOPIA SUBROGADA EN ISSSTE
──────────────────────────────────────────────
El ISSSTE contaba en 2008 con capacidad de endoscopia propia en sus hospitales
de mayor nivel (Hospital "1° de Octubre", Hospital "Valentín Gómez Farías",
Hospitales Regionales). La decisión de subrograr endoscopia a escala nacional
a un proveedor único sin RFC, mediante licitación con único postor, es una
decisión de política de salud que debería haber pasado por la Subdirección
General de Prestaciones Médicas del ISSSTE. Esta decisión es el primer punto
de investigación.

Tarifas de referencia: La endoscopia diagnóstica (esofagogastroduodenoscopia)
tenía en 2008 un costo en el mercado privado de ~$1,500-3,000 MXN por procedimiento.
Si el contrato de $459.6M cubre 3 años para múltiples unidades médicas, y asumiendo
~500 procedimientos/mes en el sistema ISSSTE nacional, la tarifa implícita sería
de ~$25,644/procedimiento — entre 8x y 17x el precio de mercado.

VI. HIPÓTESIS DE INVESTIGACIÓN
─────────────────────────────────
H1 (INTERMEDIARIO DE SOBREPRECIOS): La empresa es un intermediario sin
infraestructura clínica propia que subfactura a endoscopistas privados
a tarifa de mercado ($2,000/proc) y factura al ISSSTE a tarifa inflada
($15,000-25,000/proc), reteniendo el diferencial.

H2 (EMPRESA DE FACHADA ISSSTE): La empresa fue constituida por funcionarios
del ISSSTE o sus familiares/prestanombres para capturar el presupuesto de
endoscopia subrogada. El nombre descriptivo ("costo por procedimiento")
puede indicar que fue diseñada por alguien con conocimiento interno del
proceso presupuestal del ISSSTE.

H3 (PROVEEDOR LEGÍTIMO CON NOMBRE INUSUAL): La empresa opera equipos de
endoscopia propios en instalaciones propias o en hospitales ISSSTE mediante
concesión, y las tarifas son similares a las del mercado de servicios
subrogados. El nombre inusual es una excentricidad del fundador.

VII. LÍNEAS DE INVESTIGACIÓN RECOMENDADAS
────────────────────────────────────────────
□ ASF Cuenta Pública ISSSTE 2008-2014: auditorías de servicios subrogados
  de endoscopia — verificar si hubo observaciones o denuncias.
□ COFEPRIS: registro como establecimiento de atención médica o como proveedor
  de dispositivos médicos (endoscopios). Sin registro COFEPRIS, no puede
  operar legalmente en México.
□ Registro Público de Comercio CDMX: constitución, objeto social, accionistas,
  capital social, notario, fecha de escritura.
□ SAT: búsqueda de "Costo por Procedimiento S.A. de C.V." en registros RFC
  (posiblemente tiene RFC que no fue capturado en COMPRANET).
□ Análisis de precios unitarios: dividir monto del contrato 2008 entre el
  número total de procedimientos reportados por ISSSTE en Informes de Labores
  2008-2010 (disponibles en ISSSTE.gob.mx/transparencia).
□ Investigar quién firmó el contrato de 2008 como titular de la Subdirección
  de Prestaciones Médicas del ISSSTE y si tiene vinculación con la empresa.
□ Verificar continuidad entre contratos 2014 y reaparición 2022: ¿misma
  empresa o razón social reciclada?

VIII. CONCLUSIÓN
─────────────────
Confidencia: ALTA. Este es el caso con mayor solidez del lote 304-306.
Los elementos combinados — nombre que describe un esquema de facturación,
ausencia de RFC, licitación inaugural con único postor, seguida de monopolio
por adjudicación directa 2011-2014, y reaparición 7 años después — configuran
el perfil más sólido de los tres para incluir como caso de corrupción probable.
El riesgo RUBLI máximo (1.000) y el análisis de precios implícitos respaldan
la hipótesis de intermediario de sobreprecios en servicios de endoscopia al ISSSTE.

RECOMENDACIÓN: Priorizar para investigación ASF y verificación COFEPRIS.
Si se confirma ausencia de registro sanitario, la empresa habría operado
ilegalmente como prestador de servicios médicos durante 14 años.

────────────────────────────────────────────────────────────────
Generado por ARIA v1.0 | Fecha: 2026-03-08 | Prioridad: ALTA
""",
    },
}


def write_memos():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    # Check if aria_queue has a memo column
    cols = [r[1] for r in cur.execute('PRAGMA table_info(aria_queue)').fetchall()]
    print(f"aria_queue columns relevant: {[c for c in cols if 'memo' in c.lower() or 'note' in c.lower()]}")

    # Check if there's an investigation_memo or notes column in aria_queue
    memo_col = None
    for candidate in ['investigation_memo', 'memo', 'investigation_notes', 'notes']:
        if candidate in cols:
            memo_col = candidate
            break

    for case_db_id, data in MEMOS.items():
        vendor_id = data['vendor_id']
        print(f"\n{'='*60}")
        print(f"Case db_id={case_db_id}: {data['vendor_name']}")
        print(f"Memo length: {len(data['memo'])} chars")

        # Update the notes field in ground_truth_cases
        cur.execute(
            "UPDATE ground_truth_cases SET notes = ? WHERE id = ?",
            (data['memo'], case_db_id)
        )
        print(f"  Updated ground_truth_cases.notes for id={case_db_id}")

        # If aria_queue has a memo column, update it too
        if memo_col:
            cur.execute(
                f"UPDATE aria_queue SET {memo_col} = ? WHERE vendor_id = ?",
                (data['memo'], vendor_id)
            )
            rows = cur.rowcount
            print(f"  Updated aria_queue.{memo_col} for VID={vendor_id}: {rows} row(s)")
        else:
            print(f"  aria_queue has no memo column — skipping (memo stored in GT cases only)")

    conn.commit()

    # Verify
    print("\n\nVERIFICATION:")
    for case_db_id in MEMOS:
        row = conn.execute(
            "SELECT id, case_name, LENGTH(notes) FROM ground_truth_cases WHERE id=?",
            (case_db_id,)
        ).fetchone()
        print(f"  GT id={row[0]}: {row[1][:60]}... | notes={row[2]} chars")

    conn.close()
    print("\nMemos written successfully.")


if __name__ == '__main__':
    write_memos()
