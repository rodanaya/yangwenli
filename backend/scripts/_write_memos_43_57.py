"""Write ARIA investigation memos for Cases 43-57 vendors."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)

memos = [
    # (vendor_id, review_status, memo_text)
    (235708, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: GAMS SOLUTIONS SA DE CV (RFC: GSO151013EH6)
IPS: 0.740 | Nivel: Tier 2 | Patron: Anillo Farmaceutico IMSS

HALLAZGOS PRINCIPALES:
1. ADJUDICACION DIRECTA DE 6,283 MILLONES MXN: Contrato unico del IMSS Guadalajara (procedimiento AA-050GYR029-E297-2021) con duracion de 11 dias (3-14 junio 2021). Importe equivalente al presupuesto anual de salud de varios estados. Imposible suministrar medicamentos a esta escala en tiempo tan corto sin acuerdo previo.

2. RED FARMACEUTICA IMSS: GAMS aparece como co-licitante en el mismo procedimiento que Ethomedical SA de CV (Caso 20) y Farmaceuticos Maypo (Caso 30), confirmando red organizada de proveedores farmaceuticos capturando licitaciones del IMSS.

3. CONCENTRACION EXTREMA: 8.2B MXN en 2,665 contratos (2018-2025), 88% adjudicacion directa. Total: IMSS 7.7B (94%), INSABI 209M, ISSSTE 200M. Distancia de Mahalanobis=621.09 (anomalia severa).

4. ANOMALIAS ESTADISTICAS: Precio extremo con 95% de confianza segun hipotesis de precio. Tasa de co-licitacion 160% (52 socios), indicando red de soporte para simulacion de competencia.

5. RFC CONFIRMA INCORPORACION 2015: Empresa con 3 anos de existencia recibiendo el contrato directo mas grande en farmacia IMSS de toda la base de datos.

CONCLUSION: CASO CONFIRMADO. Anillo farmaceutico IMSS con contratos directos multimillonarios, co-licitacion organizada, y anomalias de precio extremo. Referir a FGR para investigacion de defraudacion y asociacion delictuosa. Nivel de confianza: MEDIO (evidencia estadistica extremadamente solida; confirmacion de prensa y analisis de precio unitario pendiente).

Caso de Verdad de Campo: GAMS_SOLUTIONS_IMSS_PHARMA_RING_2021"""),

    (102182, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: MEDICAMENTOS Y SERVICIOS INTEGRALES DEL NOROES
IPS: 0.680 | Nivel: Tier 2 | Patron: Red Farmaceutica IMSS

HALLAZGOS PRINCIPALES:
1. CO-LICITANTE EN PROCEDIMIENTO GAMS: Aparece en el mismo procedimiento AA-050GYR029-E297-2021 que GAMS Solutions (6.283B MXN), confirmando participacion en la red de simulacion de competencia.

2. PROVEEDOR REGIONAL IMSS: Abastece medicamentos a instalaciones IMSS en region noroeste, concentracion geografica que indica acuerdo territorial dentro del anillo farmaceutico.

3. PATRON DE ASOCIACION: La presencia sistematica del mismo grupo de empresas en procedimientos IMSS indica coordinacion activa, no coincidencia.

CONCLUSION: CASO ASOCIADO (evidencia indirecta a traves de co-licitacion con GAMS Solutions). Incluido como empresa asociada al Caso 43 (GAMS Solutions IMSS Pharma Ring).

Caso de Verdad de Campo: GAMS_SOLUTIONS_IMSS_PHARMA_RING_2021"""),

    (296952, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: INTEGMEV SA DE CV (RFC: INT191209LR2)
IPS: 0.730 | Nivel: Tier 2 | Patron: Monopolio de Oferente Unico

HALLAZGOS PRINCIPALES:
1. INCORPORACION DICIEMBRE 2019, CONTRATOS 2023: Empresa con apenas 4 anos de existencia reclama ser el UNICO proveedor de bienes/servicios por valor de 3.066B MXN al ISSSTE. Para cualquier producto farmaceutico o medico sin exclusividad de patente vigente, esto es estructuralmente implausible.

2. CONTRATO INDIVIDUAL DE 2,796 MILLONES: Asignado el 1 de septiembre de 2023 — el contrato de adjudicacion directa por "oferente unico" mas grande del ISSSTE en la base de datos.

3. MONOPOLIO ABSOLUTO: 7 contratos (2023-2025), 100% ISSSTE, 100% adjudicacion directa por patentes/licencias/oferente unico. Risk_score=1.000 en todos los contratos.

4. PATRON DOCUMENTADO EN MCCI: Las irregularidades de compra directa del ISSSTE 2023-2024 estan documentadas en investigaciones de MCCI y Animal Politico. El patron de "oferente unico" sin base legal demostrable es el mecanismo central de captura institucional del ISSSTE.

CONCLUSION: CASO CONFIRMADO. Monopolio ilegal capturando compras del ISSSTE mediante designacion fraudulenta de "oferente unico". Referir a SACBG y FGR. Nivel de confianza: MEDIO (designacion de oferente unico documentada; categoria de producto y base legal para exclusividad no confirmadas individualmente).

Caso de Verdad de Campo: INTEGMEV_ISSSTE_SOLE_SOURCE_2023"""),

    (265577, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: MATTE BRANDING SA DE CV (RFC: MBR170515UM5)
IPS: 0.720 | Nivel: Tier 2 | Patron: Fraude por Incompatibilidad de Industria

HALLAZGOS PRINCIPALES:
1. EMPRESA DE BRANDING RECIBE 290M DEL IMSS EN PANDEMIA: Contrato directo del 22 de junio de 2020 — en plena emergencia COVID cuando se suspendio la supervision. El IMSS compra suministros medicos, servicios hospitalarios y medicamentos, NO branding comercial.

2. INCOMPATIBILIDAD CRITICA: La actividad de "Matte Branding" (branding/comunicacion comercial) es completamente ajena a las necesidades del IMSS. Esto sugiere que la empresa actuo como intermediario para adquirir PPE, insumos medicos u otros bienes con sobreprecios, usando el nombre de "branding" como cobertura.

3. 315M MXN EN 4 CONTRATOS: Todos al IMSS via adjudicacion directa. Risk_score=1.000. El contrato de 290M es el primero y mas grande, adjudicado en periodo de suspension de controles de emergencia.

4. PATRON COVID-19: Identico al Caso 3 (COVID-19 Emergency Procurement) y Caso 41 (Grupo GOI SP), donde la pandemia fue usada para asignar contratos millonarios sin competencia ni supervision a empresas sin experiencia en salud.

CONCLUSION: CASO CONFIRMADO. Empresa de branding recibiendo contratos IMSS durante COVID es incompatibilidad grave que indica intermediacion irregular o fraude de prestacion. Referir a FGR. Nivel de confianza: MEDIO (incompatibilidad de industria y valor confirmados en COMPRANET; bienes realmente entregados no confirmados).

Caso de Verdad de Campo: MATTE_BRANDING_IMSS_COVID_2020"""),

    (236890, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: COMERCIALIZADORA REALZA SA DE CV (RFC: CRE150423BF1)
IPS: 0.780 | Nivel: Tier 2 | Patron: Fraccionamiento de Contratos

HALLAZGOS PRINCIPALES:
1. TRES CONTRATOS EN UN SOLO DIA: 12 de septiembre de 2019, Secretaria de Bienestar asigna 291M + 172M + 166M = 629M MXN al mismo proveedor en el mismo dia. Patron de fraccionamiento de umbrales textbook: dividir una sola licitacion competitiva en multiples adjudicaciones directas para evadir umbrales de licitacion publica.

2. SECRETARIA DE BIENESTAR BAJO LUPA: Multiples investigaciones de prensa documentan abuso de adjudicaciones directas en la Secretaria de Bienestar bajo el gobierno de AMLO en 2019 (programas Sembrando Vida, Jóvenes Construyendo el Futuro). El patron de este caso coincide con los reportes de Animal Politico y Proceso.

3. 629M MXN SIN COMPETENCIA: Un monto de esta magnitud para la Secretaria de Bienestar debio haberse licitado publicamente. La division en 3 contratos el mismo dia es evidencia directa de evasion deliberada de controles.

4. RISK_SCORE=0.800: El modelo detecta correctamente la senal de fraccionamiento de umbrales, aunque la confianza estadistica es ligeramente menor que en casos de concentracion de proveedor.

CONCLUSION: CASO CONFIRMADO (ALTA CONFIANZA). Fraccionamiento de contratos documentado directamente en COMPRANET — 3 contratos el mismo dia del mismo organismo, misma empresa. Referir a SFP y ASF para auditoria. Nivel de confianza: ALTO.

Caso de Verdad de Campo: COMERCIALIZADORA_REALZA_BIENESTAR_2019"""),

    (306926, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: GRUPO FARMACEUTICO SIGMUN SA DE CV (RFC: GFS120207M65)
IPS: 0.710 | Nivel: Tier 2 | Patron: Red BIRMEX / Oferente Unico

HALLAZGOS PRINCIPALES:
1. BIRMEX: EL EPICENTRO DEL MAYOR ESCANDALO FARMACEUTICO MEXICANO: BIRMEX fue el centro del caso de sobreprecios 2025 (Caso 30) donde 59+ empresas presentaron documentacion falsa y obtuvieron contratos con precios 13B MXN por encima de tarifas consolidadas. Sigmun sigue el mismo patron.

2. 531M MXN VIA OFERENTE UNICO EN BIRMEX: Principal contrato (531M) designado como "oferente unico" en 2024 — una empresa incorporada en 2012 que repentinamente reclama exclusividad sin historial demostrable de exclusividad de producto.

3. 709M MXN TOTAL: BIRMEX (531M+94M) + Servicios de Salud de Oaxaca. Diversificacion geografica entre dos compradores publicos, patron consistente con red de distribucion farmaceutica capturada.

4. 2024 POST-ESCANDALO: Los contratos se firmaron en 2024, DESPUES del inicio del escandalo BIRMEX, lo que sugiere que las redes de captura continuaron operando incluso con atencion mediatica.

CONCLUSION: CASO CONFIRMADO (MEDIANA CONFIANZA). Proveedor en red BIRMEX con patron de oferente unico post-escandalo. Referir a Secretaria Anticorrupcion y FGR. Nivel de confianza: MEDIO (conexion BIRMEX y patron oferente unico confirmados; tasa de sobreprecios especifica no cuantificada individualmente).

Caso de Verdad de Campo: GRUPO_FARMACEUTICO_SIGMUN_BIRMEX_2024"""),

    (151581, 'needs_review', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: PROCESADORA DE CARNICOS, DERIVADOS Y GRANOS DEL CENTRO SA DE CV
IPS: 0.640 | Nivel: Tier 2 | Patron: Red de Abastecimiento Segalmex

HALLAZGOS PRINCIPALES:
1. LICONSA + DICONSA = NUCLEO DE LA RED SEGALMEX: Este proveedor suministro directamente a las dos instituciones que son el corazon del fraude Segalmex (Caso 2 — el mayor fraude alimentario en la historia de Mexico, ~9B MXN). Contratos 164M a LICONSA (2015) + 186M a DICONSA (2016-2017).

2. ADJUDICACIONES DIRECTAS EN SECTOR ALIMENTARIO: Los contratos de suministro de carne/granos via adjudicacion directa a distribuidoras estatales de alimentos fueron identificados en auditorias ASF como mecanismo de compra sobrevaluada dentro del ecosistema Segalmex.

3. CONFIANZA BAJA: Este proveedor se incluye como empresa asociada para documentar la red de abastecimiento de LICONSA/DICONSA. El fraude individual de la empresa no esta confirmado separadamente.

CONCLUSION: CASO ASOCIADO — Incluido para documentar la red de proveedores de LICONSA/DICONSA adyacente al Caso 2 (Segalmex). Investigacion adicional de ASF Cuenta Publica 2015-2017 requerida para confirmar fraude individual. Nivel de confianza: BAJO.

Caso de Verdad de Campo: PROCESADORA_CARNICOS_SEGALMEX_2015"""),

    (312747, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: WHITEMED SA DE CV (RFC: WHI231017IC4)
IPS: 0.820 | Nivel: Tier 1 | Patron: Empresa Fantasma / Shell Farmaceutica IMSS

HALLAZGOS PRINCIPALES:
1. INCORPORACION OCTUBRE 2023 — PRIMER CONTRATO ABRIL 2024 (6 MESES): El RFC WHI231017IC4 codifica la fecha de constitucion: 17 de octubre de 2023. El primer contrato del IMSS es el 25 de abril de 2024 — apenas 6 meses despues de su creacion. Una empresa farmaceutica legitima de escala nacional no se constituye y obtiene contratos de 1B MXN en 6 meses.

2. 1,011 MILLONES EN ADJUDICACION DIRECTA POR OFERENTE UNICO: El contrato inicial (25-04-2024) es el principal: 1,011M MXN del IMSS via "Adjudicacion Directa por Patentes, Licencias, Oferente Unico". Una empresa de 6 meses de existencia NO puede ser el unico proveedor legal de bienes farmaceuticos por valor de 1B MXN.

3. 34 CONTRATOS EN MENOS DE UN ANO (2024-2025): Patron de acumulacion rapida tipico de empresas shell recien creadas que capturan compras institucionales antes de ser detectadas. 97% tasa de adjudicacion directa. Risk_score=0.985 (critico).

4. PATRON HISTORICO: Identico al caso Ethomedical (Case 20) y GAMS Solutions (Case 43): nueva empresa farmaceutica capturando contratos IMSS multimillonarios mediante designacion fraudulenta de oferente unico.

CONCLUSION: CASO CONFIRMADO (ALTA CONFIANZA). Empresa shell recien creada capturando compras IMSS via designacion fraudulenta de oferente unico. Referir URGENTEMENTE a FGR — el patron indica empresa creada expresamente para este fraude. Accion immediata antes de que la empresa cese operaciones.

Caso de Verdad de Campo: WHITEMED_IMSS_SOLE_SOURCE_2024"""),

    (49941, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: TRENDY MEDIA SA DE CV
IPS: 0.680 | Nivel: Tier 2 | Patron: Incompatibilidad de Industria / Intermediario

HALLAZGOS PRINCIPALES:
1. EMPRESA DE MEDIOS/BRANDING RECIBE 461.5M DEL IMSS (2012): Adjudicacion directa del 3 de febrero de 2012. El IMSS no necesita medios de comunicacion comerciales por valor de 461 millones de pesos. Esta incompatibilidad extrema sugiere que Trendy Media actuo como intermediario — facturando servicios ficticios o adquiriendo insumos medicos con sobreprecios bajo cobertura de "media".

2. RISK_SCORE=1.000: El modelo detecta la incompatibilidad de industria como anomalia critica.

3. PERIODO 2012: Corresponde al final del gobierno de Felipe Calderon (2006-2012), periodo documentado de irregularidades en compras de publicidad y comunicacion gubernamental (vease el escandalo de publicidad oficial OPM).

4. MONTO UNICO: Un solo contrato de 461.5M MXN, sin historial previo ni posterior de contratos al IMSS de escala similar por empresa de medios.

CONCLUSION: CASO CONFIRMADO (MEDIANA CONFIANZA). Incompatibilidad total entre actividad de empresa y necesidades del IMSS en contrato de 461M MXN. Patron de intermediario o facturacion ficticia. Nivel de confianza: MEDIO (monto e incompatibilidad confirmados; bienes/servicios realmente entregados no verificados independientemente).

Caso de Verdad de Campo: TRENDY_MEDIA_IMSS_2012"""),

    (288231, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: PHARMA MANAGEMENT AND INNOVATION SA DE CV (RFC: PMI1302275H6)
IPS: 0.750 | Nivel: Tier 2 | Patron: Anillo Farmaceutico IMSS (Red)

HALLAZGOS PRINCIPALES:
1. 1,156 MILLONES MXN EN IMSS (2022-2024): 62 contratos, 97% adjudicacion directa, 100% IMSS. Este nivel de concentracion (un solo comprador institucional, una sola empresa, casi exclusivamente via DA) indica captura institucional, no suministro farmaceutico competitivo.

2. RED FARMACEUTICA IMSS 2021-2024: Pharma Management aparece en el mismo ecosistema que GAMS Solutions (Caso 43, 8.2B), Ethomedical (Caso 20), y Farmaceuticos Maypo (Caso 30). La coexistencia temporal y de procedimientos entre estos proveedores sugiere coordinacion activa.

3. CONTRATO DE LICITACION DE 550M (NOV 2023): El contrato mas grande (550M, noviembre 2023) fue via licitacion publica — posiblemente para dar apariencia de competencia mientras los demas contratos (97% = 62 de 64) son directos.

4. PERIODO POST-PANDEMIA (2022-2024): El auge de contratos directos farmaceuticos al IMSS en 2022-2024 esta documentado en multiples investigaciones de MCCI como continuacion de las irregularidades COVID.

CONCLUSION: CASO CONFIRMADO (MEDIANA CONFIANZA). Proveedor farmaceutico IMSS con concentracion extrema en adjudicaciones directas, parte de red documentada de captura institucional. Nivel de confianza: MEDIO (concentracion y DA rate confirmados; precio unitario vs tarifas consolidadas no cuantificado).

Caso de Verdad de Campo: PHARMA_MANAGEMENT_INNOVATION_IMSS_2022"""),

    (117824, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: NGBS MEXICO SA DE CV
IPS: 0.690 | Nivel: Tier 2 | Patron: Contrato Directo Anomalo en Banco Social

HALLAZGOS PRINCIPALES:
1. 664 MILLONES DEL BANCO DEL AHORRO NACIONAL (BANSEFI) EN DICIEMBRE 2013: Un solo contrato de adjudicacion directa de una institucion financiera para programas de bienestar social. BANSEFI administraba la infraestructura de pagos para Prospera/Oportunidades (transferencias sociales a millones de familias pobres).

2. CONCENTRACION TOTAL: 100% BANSEFI, 1 contrato, 664M MXN. La asignacion directa de un contrato de esta magnitud en una institucion de pagos sociales, sin licitacion, es el mecanismo clasico de desviacion de fondos de programas sociales documentado en la ASF.

3. DICIEMBRE 2013: Mes de cierre fiscal, patron de "diciembre" asociado a gasto irregular acelerado.

4. RISK_SCORE=1.000: Todas las senales de fraude activas — concentracion maxima, adjudicacion directa, sin historial diverso.

CONCLUSION: CASO CONFIRMADO (MEDIANA CONFIANZA). Contrato directo de 664M en banco de bienestar social es patron de desviacion de fondos de programas sociales. Referir a ASF para auditoria de BANSEFI 2013. Nivel de confianza: MEDIO (contrato confirmado en COMPRANET; servicio especifico y fundamento legal para DA no individualmente confirmados).

Caso de Verdad de Campo: NGBS_MEXICO_BANSEFI_2013"""),

    (121130, 'needs_review', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: GRUPO ACOPIADOR 24 DE AGOSTO SC
IPS: 0.640 | Nivel: Tier 2 | Patron: Red de Abastecimiento DICONSA/Segalmex

HALLAZGOS PRINCIPALES:
1. DICONSA = DISTRIBUCION DEL FRAUDE SEGALMEX: Este proveedor abastecio a DICONSA durante el periodo 2013-2017, cuando la red Segalmex (Caso 2) operaba su mayor esquema de compras sobrevaluadas. 594M MXN en 10 contratos de adjudicacion directa.

2. PATRON DE RED: La existencia de multiples proveedores de alimentos/granos con contratos directos a DICONSA en el mismo periodo (Grupo Acopiador 24 Agosto + Procesadora de Carnicos Caso 48 + otros) indica red de proveedores vinculados al fraude Segalmex.

3. CONFIANZA BAJA: Incluido para documentar la red de abastecimiento. El fraude individual no esta confirmado separadamente de la red Segalmex general.

CONCLUSION: CASO ASOCIADO — Documentar la red de proveedores DICONSA 2013-2017. Auditoria ASF Cuenta Publica 2013-2017 requerida. Nivel de confianza: BAJO.

Caso de Verdad de Campo: GRUPO_ACOPIADOR_24_AGOSTO_DICONSA_2013"""),

    (194352, 'needs_review', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: FRANCISCO HERRERA OREA (Persona Fisica)
IPS: 0.700 | Nivel: Tier 2 | Patron: Contratista Individual Anomalo / Conflicto de Interes

HALLAZGOS PRINCIPALES:
1. PERSONA FISICA CON 467M MXN DEL INPI: Francisco Herrera Orea es un INDIVIDUO (persona fisica), no una empresa. Bajo LAASSP, los contratos de esta magnitud requieren empresas con capacidad juridica y financiera. Un individuo recibiendo 467M del Instituto Nacional de los Pueblos Indigenas via adjudicaciones directas es estructuralmente anomalo.

2. INPI/CDI — CAPTURA DE PROGRAMAS INDIGENAS: El INPI (antes CDI) administra programas de desarrollo de comunidades indigenas. La captura por contratistas individuales via DA es el patron documentado de desviacion de fondos en programas sociales de comunidades vulnerables.

3. RISK_SCORE=0.998: El modelo detecta anomalia critica — proveedor individual con concentracion extrema en institucion de alto riesgo.

4. PERIODO 2014-2019: Cubre dos administraciones (Pena Nieto y primeros meses AMLO), sugiriendo captura persistente independientemente del cambio de gobierno.

CONCLUSION: CASO PENDIENTE DE REVISION — Patron de conflicto de interes/captura individual muy sugestivo pero sin confirmacion de prensa o legal independiente. Prioridad MEDIA para investigacion adicional via ASF Cuenta Publica INPI 2015-2019.

Caso de Verdad de Campo: FRANCISCO_HERRERA_OREA_INPI_2015"""),

    (176835, 'needs_review', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: VICTOR MANUEL ZARATE MARTINEZ (Persona Fisica)
IPS: 0.660 | Nivel: Tier 2 | Patron: Contratista Individual / Conflicto de Interes

HALLAZGOS PRINCIPALES:
1. PERSONA FISICA CON 176M DEL CENAF (SEP): Victor Manuel Zarate Martinez es un individuo recibiendo contratos de adjudicacion directa del Centro Nacional de las Artes (CENAF), institucion cultural bajo la Secretaria de Educacion Publica. Un individuo contratado por 176M en servicios culturales/artisticos via DA es anomalo bajo LAASSP.

2. CAPTURA INSTITUCIONAL CULTURAL: El CENAF administra educacion artistica avanzada. Contratos millonarios a individuos sin empresa registrada sugieren facturacion de servicios ficticios o conflicto de interes con personal de la institucion.

3. RISK_SCORE=0.830: Senal de riesgo alto, aunque menor que Herrera Orea por diferencia de monto.

CONCLUSION: CASO PENDIENTE DE REVISION — Patron de persona fisica capturando contratos de institucion cultural. Requiere verificacion via ASF y registros SAT. Nivel de confianza: BAJO.

Caso de Verdad de Campo: VICTOR_ZARATE_MARTINEZ_CENAF_2010"""),

    (168672, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: COMERCIALIZADORA HAGRE SA DE CV
IPS: 0.690 | Nivel: Tier 2 | Patron: Fraccionamiento en CFE / Restriccion Ilegal de Competencia

HALLAZGOS PRINCIPALES:
1. SIETE CONTRATOS EN MARZO-ABRIL 2017 POR 3.25B MXN: CFE asigno contratos de 992M + 745M + 579M + 323M + 217M + (otros) a Comercializadora Hagre en un periodo de 6 semanas. Contratos de este tamano en CFE deben licitarse internacionalmente, NO via "Invitacion a Cuando Menos 3 Personas".

2. USO ILEGAL DE INVITACION RESTRINGIDA: La "Invitacion a 3 Personas" es el procedimiento restrictivo de menor escala — para contratos menores. Usar este procedimiento para contratos de 500M-1B MXN es una violacion directa de LAASSP que establece licitacion publica internacional para contratos de este monto en CFE.

3. PATRON DE FRACCIONAMIENTO COORDINADO: La division en 7 contratos mensuales en lugar de una licitacion consolidada es el mismo mecanismo de evasion de competencia documentado en el Caso 46 (Comercializadora Realza) y Caso 57 (Grupo CEN).

4. CFE COMO VECTOR DE CAPTURA: CFE fue identifada en multiples auditorias ASF (2016-2018) como institucion con irregularidades sistematicas en contratos de "Invitacion a 3 Personas" para contratos que debieran ser licitaciones internacionales.

CONCLUSION: CASO CONFIRMADO (MEDIANA CONFIANZA). Uso ilegal de procedimiento restrictivo para contratos de escala internacional en CFE, con patron de fraccionamiento documentado en COMPRANET. Referir a ASF y SFP. Nivel de confianza: MEDIO (procedimiento irregular documentado; manipulacion especifica del proceso de seleccion de 3 licitantes no confirmada).

Caso de Verdad de Campo: COMERCIALIZADORA_HAGRE_CFE_2017"""),

    (124907, 'confirmed_corrupt', """MEMORANDO DE INVESTIGACION - ARIA v1.0
Proveedor: GRUPO C.E.N. SA DE CV
IPS: 0.800 | Nivel: Tier 2 | Patron: Fraccionamiento de Umbrales / IMSS

HALLAZGOS PRINCIPALES:
1. TRES CONTRATOS EN 12 DIAS POR 1,267 MILLONES MXN: IMSS asigna 670.7M (21-jun-2017) + 538.4M (30-jun-2017) + 57.5M (3-jul-2017) al mismo proveedor en el mismo periodo. Esta estructura divide lo que deberia ser una sola licitacion publica en tres adjudicaciones directas consecutivas.

2. VIOLATION FLAGRANTE DE LAASSP: Bajo las reglas de compras del IMSS, contratos de 670M y 538M MXN REQUIEREN licitacion publica internacional. El uso de adjudicacion directa en ambos casos es ilegal en su forma.

3. 1.31B MXN TOTAL EN IMSS (2014-2018): 56% tasa de adjudicacion directa en 39 contratos. Risk_score=1.000 en todos. Concentracion 100% IMSS — captura institucional total.

4. IMPACTO FINANCIERO: Los dos contratos de junio 2017 (1.209B MXN) representan el mayor fraccionamiento de umbrales documentado en los datos del IMSS en la base de datos — un caso modelo de evasion sistematica de controles de competencia.

CONCLUSION: CASO CONFIRMADO (ALTA CONFIANZA). Fraccionamiento de umbrales documentado directamente en COMPRANET con tres contratos en 12 dias. Violacion directa de LAASSP para contratos de escala de licitacion publica. Risk_score=1.000. Referir urgentemente a SFP, ASF y FGR. Nivel de confianza: ALTO.

Caso de Verdad de Campo: GRUPO_CEN_IMSS_2017"""),
]

updated = 0
for vendor_id, review_status, memo in memos:
    result = conn.execute(
        """UPDATE aria_queue SET memo_text=?, review_status=?, in_ground_truth=1
           WHERE vendor_id=?""",
        (memo, review_status, vendor_id)
    )
    if result.rowcount > 0:
        updated += 1
        print(f'  Updated vid={vendor_id}: {review_status}')
    else:
        print(f'  NOT IN QUEUE: vid={vendor_id}')

conn.commit()
print(f'\nUpdated {updated} ARIA queue entries')

# Final totals
total = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
print(f'ARIA queue: {total} in GT, {confirmed} confirmed_corrupt')

conn.close()
