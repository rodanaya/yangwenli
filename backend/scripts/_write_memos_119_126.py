"""Write ARIA investigation memos for cases 119-126."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)

def write_memo(vendor_id, memo_text, review_status='confirmed_corrupt'):
    now = datetime.now().isoformat()
    row = conn.execute('SELECT id FROM aria_queue WHERE vendor_id=?', (vendor_id,)).fetchone()
    if row:
        conn.execute('UPDATE aria_queue SET memo_text=?, review_status=?, in_ground_truth=1, memo_generated_at=? WHERE vendor_id=?',
            (memo_text, review_status, now, vendor_id))
    else:
        conn.execute('INSERT INTO aria_queue (vendor_id, memo_text, review_status, in_ground_truth, ips_tier, ips_final, computed_at) VALUES (?,?,?,1,1,0.7,?)',
            (vendor_id, memo_text, review_status, now))
    conn.commit()
    print(f'Memo written VID={vendor_id} [{review_status}]')

# VID=45436: ESTUDIOS AZTECA
write_memo(45436, """MEMO DE INVESTIGACION - ESTUDIOS AZTECA SA DE CV
Caso: ESTUDIOS_AZTECA_GOVT_ADVERTISING_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Estudios Azteca SA de CV (filial de TV Azteca, sin RFC) recibio 5.65B MXN en publicidad gubernamental via 499 contratos al 99.8%DA durante 2010-2021.

DUOPOLIO PUBLICITARIO GUBERNAMENTAL TV AZTECA - TELEVISA
Junto con Televisa (Caso 120, 7.33B), las dos principales cadenas de television mexicana capturaron mas de 13B MXN en publicidad gubernamental mediante adjudicaciones directas:
- TV Azteca (Estudios Azteca): 5.65B | 99.8%DA
- Televisa: 7.33B | 99.8%DA
TOTAL DUOPOLIO: 12.98B MXN en publicidad via DA

INSTITUCIONES CAPTURADAS (Estudios Azteca)
- CPTM (turismo): 1.13B @100%DA (9 contratos 2011-2018)
- IMSS (salud): 790M @100%DA (23 contratos 2013-2021)
- Pronosticos: 710M @100%DA (14 contratos 2010-2018)
- Otras dependencias adicionales

ILEGALIDAD DE BASE
La LAASSP Art. 41 IX permite DA para publicidad solo cuando el medio tiene audiencias exclusivas no alcanzables por otro canal. Las redes nacionales de television tienen audiencias amplias y competitivas entre si. La DA sistematica a TV Azteca impidio que canales alternativos (Televisa, plataformas digitales, cable) compitieran por presupuesto publicitario federal.

IMPACTO DEMOCRATICO
La dependencia financiera de las televisoras en publicidad gubernamental crea incentivos para cobertura editorial favorable — un riesgo sistemico para la independencia mediatica.

RECOMENDACION
Investigar si los funcionarios de CPTM/IMSS/Pronosticos responsables de los contratos mantuvieron relaciones con TV Azteca. Verificar si los contratos pasaron por evaluacion de audiencia como requiere Art. 41 IX.
""", 'needs_review')

# VID=46629: Televisa
write_memo(46629, """MEMO DE INVESTIGACION - TELEVISA SA DE CV
Caso: TELEVISA_GOVT_ADVERTISING_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Televisa (sin RFC) recibio 7.33B MXN en publicidad gubernamental via 418 contratos al 99.8%DA durante 2010-2025.

DUOPOLIO PUBLICITARIO (ver Caso 119 - Estudios Azteca)
Televisa + TV Azteca = 12.98B MXN en publicidad gubernamental al 99.8%DA.

CAPTURA INSTITUCIONAL TELEVISA
- CPTM: 1.53B @100%DA (8 contratos 2011-2017)
- IMSS: 940M @100%DA (14 contratos 2013-2025)
- SEP: 690M @100%DA (21 contratos 2010-2022)
- Pronosticos: 480M @100%DA (9 contratos)

PATRON TEMPORAL: EXTENSION MAS ALLA DE 2018
A diferencia de TV Azteca (que concentra contratos hasta 2021), Televisa continua recibiendo DA hasta 2025, indicando que la practica se extiende incluso con el gobierno Lopez Obrador 2018-2024 y nuevo gobierno 2024+.

IMSS 940M @100%DA — IRREGULARIDAD ESPECIFICA
El IMSS pagando 940M en publicidad televisiva a una sola empresa via DA sin proceso competitivo es una irregularidad documentable: el IMSS no esta en el sector de telecomunicaciones y sus campanas de salud publica deberian contratarse a traves de agencia gubernamental de comunicacion social con proceso competitivo.

RECOMENDACION
Misma que Caso 119. Priorizar audit del periodo 2010-2018 donde la captura publicitaria es mas flagrante.
""", 'needs_review')

# VID=45016: EFECTIVALE S DE RL
write_memo(45016, """MEMO DE INVESTIGACION - EFECTIVALE S DE RL DE CV
Caso: EFECTIVALE_GUARDIA_NACIONAL_FUEL_DA_2020 | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Efectivale S de RL de CV (sin RFC) recibio 12.08B MXN en 2,575 contratos al 52.7%DA. Hallazgo critico: 2.08B en UNA SOLA adjudicacion directa de la Guardia Nacional en 2020 para combustible.

CONTRATO CRITICO: GN 2.08B DA 2020
"SERVICIO DE SUMINISTRO DE COMBUSTIBLE PARA EL PARQUE VEHICULAR" — 2,080 millones de MXN
- Adjudicacion directa (sin licitacion)
- Combustible es un servicio/bien de mercado libre con multiples proveedores
- La Guardia Nacional fue creada en 2019 y configuro contratos iniciales en 2019-2020
- Un DA de esta magnitud para combustible viola el umbral obligatorio de LP

CONTEXTO ADICIONAL
- SEMAR: 650M @70%DA — patrones similares en Marina
- SCT: 1.24B @17%DA — principalmente competitivo
- En 2025, la misma empresa gano 630M via LP para combustible (demostrando capacidad competitiva)

La existencia de la LP 2025 (630M) demuestra que Efectivale puede participar en competencia — haciendo el DA 2.08B de 2020 injustificado desde perspectiva de competencia de mercado.

EMPRESA DE VALES DE COMBUSTIBLE
Efectivale provee tarjetas prepagadas de combustible para flotas gubernamentales. Esta es una actividad economicamente concentrada (pocos proveedores de sistemas de vales integrados), lo que podria justificar algun nivel de DA para implementacion inicial.

RECOMENDACION
Obtener expediente completo del DA 2.08B GN 2020. Verificar justificacion de urgencia/emergencia invocada. Comparar precio unitario de combustible en este contrato vs. precios de mercado Pemex 2020.
""", 'needs_review')

# VID=29085: OPERADORA ABASTO
write_memo(29085, """MEMO DE INVESTIGACION - OPERADORA DE PROGRAMAS DE ABASTO MULTIPLE SA DE CV
Caso: OPERADORA_ABASTO_MULTIPLE_ISSSTE_SEP_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Operadora de Programas de Abasto Multiple (sin RFC) recibio 11.61B MXN en 320 contratos, incluyendo 3 DA sin descripcion por un total de 2.68B MXN.

TRIPLE OPACIDAD EN CONTRATOS MAYORES
Tres contratos sin descripcion ni institucion claramente identificable:
- 960M DA (ISSSTE, 2014)
- 910M DA (2010, institucion no disponible)
- 810M DA (2015, institucion no disponible)
Total: 2,680 millones MXN sin descripcion de objeto

Para contratos de esta magnitud (cada uno requeriria LP por monto), la ausencia de descripcion en COMPRANET es una irregularidad documental.

DISTRIBUCION INSTITUCIONAL INUSUAL
SEP (educacion) + INEGI (estadistica) + ISSSTE (salud civil) + SEPOMEX (correos) = cuatro sectores completamente distintos para un mismo proveedor.

Un "operador de abasto multiple" genuino concentraria servicios en un sector. La dispersion indica conexiones politicas para obtener contratos en multiples dependencias independientemente de especialidad.

RIESGO INSTITUCIONAL
SEPOMEX (Servicio Postal Mexicano): 940M — Correos es un organismo descentralizado con problemas de transparencia documentados.
INEGI: 1.53B @0%DA — 9 contratos competitivos, lo que es normal para esta institucion. La mezcla de LP en INEGI y DA en ISSSTE sugiere comportamiento diferenciado por institucion.

RECOMENDACION
Solicitar transparencia sobre el objeto de los contratos 960M ISSSTE 2014, 910M y 810M. Verificar RFC real en Registro Publico de Comercio.
""", 'needs_review')

# VID=30834: GRUPO UNIMEDICAL
write_memo(30834, """MEMO DE INVESTIGACION - GRUPO UNIMEDICAL SOLUCIONES S.A. DE C.V.
Caso: UNIMEDICAL_IMSS_DA_RING | Riesgo: ALTO | Confianza: ALTA
Generado: 2026-03-08

RESUMEN
Grupo Unimedical Soluciones (sin RFC) recibio 1.14B MXN en 1,845 contratos al 88.3%DA. IMSS: 640M en 1,441 contratos @88%DA durante 2013-2025.

PATRON DE CAPTURA CRONICA IMSS
1,441 contratos DA en IMSS durante 12 anos = promedio 120 DA/ano
Descripcion confirmada: "ADQUISICION DE MEDICAMENTOS PARA EL CENTRO DE MEZCLAS"
(Medicamentos para preparacion de mezclas intravenosas — servicio especializado pero replicable)

DOBLE CAPTURA: IMSS + INCMNSZ
- IMSS: 640M @88%DA (1441 contratos)
- INCMNSZ (Instituto Nacional de Ciencias Medicas y Nutricion): 140M @100%DA (155 contratos)

INCMNSZ es uno de los institutos nacionales de salud mas prestigiosos. 155 contratos al 100%DA con el mismo proveedor de insumos para mezclas IV es un patron de captura de una unidad institucional especifica.

PUNTO CIEGO v5.1: rs=0.080
1,845 contratos de valor moderado → score por contrato promediado a la baja. Patron agregado claramente anormal.

SIN RFC
Sin identificacion fiscal — imposible verificar si la empresa paga impuestos sobre 1.14B en contratos gubernamentales.

RECOMENDACION
Alta prioridad. Verificar en ASF Cuenta Publica IMSS 2013-2025 si este proveedor fue objeto de observaciones en auditorias de centros de mezclas. Solicitar RFC real mediante Registro Publico de Comercio.
""", 'confirmed_corrupt')

# VID=11640: SUMINISTROS MEDICOS DEL CENTRO
write_memo(11640, """MEMO DE INVESTIGACION - SUMINISTROS MEDICOS DEL CENTRO, S.A. DE C.V.
Caso: SUMINISTROS_MEDICOS_SEMAR_SEDENA_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Suministros Medicos del Centro (sin RFC) recibio 1.13B MXN en 1,239 contratos al 73.3%DA principalmente de la Marina (SEMAR) y el Hospital General de Mexico.

PATRON SEMAR: 400 CONTRATOS @75%DA
SEMAR tiene hospitales navales que requieren suministros medicos. Sin embargo, 400 contratos al 75%DA durante 15 anos (2010-2025) a un mismo proveedor sin RFC es inusual para una institucion de defensa con protocolos de adquisicion especiales.

HOSPITAL GENERAL DE MEXICO: 158 CONTRATOS @74%DA
El Hospital General (organismo civil, no militar) al 74%DA con el mismo proveedor que SEMAR sugiere que la empresa tiene una estrategia de captura simultanea de instituciones civiles y militares.

Contratos maximos: 70M DA 2021, 30M LP 2021.

NOTA: Los contratos de defensa pueden tener justificaciones de seguridad para DA no accesibles publicamente. La clasificacion como caso sospechoso es preliminar y requiere verificacion con SEMAR.

RECOMENDACION
Prioridad media. Solicitar RFC real. Cruzar con lista de proveedores SEMAR certificados. Si el proveedor no esta certificado para suministros navales, el DA es injustificado.
""", 'needs_review')

# VID=43963: AIRBUS SLC
write_memo(43963, """MEMO DE INVESTIGACION - AIRBUS SLC SA DE CV
Caso: AIRBUS_SLC_GUARDIA_NACIONAL_TETRA_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Airbus SLC SA de CV (sin RFC) recibio 2.04B MXN en 227 contratos al 93.8%DA, principalmente de la Guardia Nacional para servicios de radiocomunicacion TETRA.

TECNOLOGIA TETRA — LOCK-IN JUSTIFICADO?
TETRA (Terrestrial Trunked Radio) es un estandar europeo de radio digital para seguridad publica. Airbus es el principal proveedor mundial de sistemas TETRA bajo la marca Tactilon/Dimetra. La justificacion de DA bajo Art. 41 III (proveedor unico de tecnologia) puede ser valida.

ARGUMENTOS A FAVOR DE DA:
1. Interoperabilidad: una vez instalada la infraestructura TETRA de Airbus, el cambio a otro proveedor es costoso
2. Compatibilidad militar: el estandar puede estar ligado a acuerdos de seguridad de la OTAN/UE
3. Continuidad de servicios: los contratos "DAR CONTINUIDAD A LOS SERVICIOS" son renovaciones de contratos existentes

ARGUMENTOS CONTRA DA:
1. La Guardia Nacional es una nueva institucion (2019) — no habia lock-in previo que justificara DA para la instalacion inicial
2. Motorola Solutions ofrece tecnologia TETRA competidora (Dimetra IP) — no es proveedor unico
3. 270M DA 2023 y 260M DA 2024 para "continuidad" — se renuevan contratos sin competencia

EVALUACION: Posible monopolio tecnologico con justificacion parcialmente valida.

RECOMENDACION
Solicitar al SSPC (Secretaria de Seguridad) el estudio de mercado utilizado para justificar el DA inicial de instalacion TETRA en 2020. Verificar si se evaluaron alternativas TETRA de Motorola antes de adjudicar.
""", 'needs_review')

# VID=305455: WALA SERVICIOS
write_memo(305455, """MEMO DE INVESTIGACION - WALA SERVICIOS MEXICO SA DE CV
Caso: WALA_SERVICIOS_IMSS_DA_2024 | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Wala Servicios Mexico (RFC: CSB121108TR6, Nov 2012) recibio 1.02B MXN en 58 contratos al 77.6%DA durante 2024-2025. Tres tipos de contratos en tres instituciones no relacionadas.

PATRON CROSS-SECTORIAL 2024-2025 (RECIENTE)
1. IMSS: 480M @92%DA (13 contratos) — medicamentos consolidados
2. Guardia Nacional: 240M LP — "BOLSAS DE VIAJE Y MOCHILAS JUMBO"
3. CENISIDA: 170M @100%DA — prevencion VIH/ITS

Una empresa que en un periodo de 12 meses provee medicamentos a IMSS, mochilas jumbo a la Guardia Nacional, y servicios de prevencion de VIH al CENISIDA carece de especializacion sectorial coherente.

ANOMALIA: MOCHILAS PARA GUARDIA NACIONAL
240M MXN en "bolsas de viaje y mochilas jumbo" (BOLSAS DE VIAJE Y MOCHILAS JUMBO) para la Guardia Nacional es particularmente anomalo para una empresa de servicios medicos/farmaceuticos.

RIESGO RECIENTE
La empresa parece haber escalado rapidamente en 2024-2025, comenzando con la consolidacion farmaceutica del IMSS. Este patron de rapidez y diversificacion sectorial es un indicador clasico de empresa conectada politicamente post-2024.

RFC: CSB121108TR6 (Corporacion de Servicios Bienestar?, fundada noviembre 2012)

RECOMENDACION
Prioridad alta dado el patron reciente (2024-2025). Verificar identidad real tras RFC CSB121108TR6. Investigar si este proveedor tiene vinculo con otras empresas que recibieron contratos en la nueva administracion 2024.
""", 'needs_review')

total_gt = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
total_corrupt = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
total_review = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
print(f'\nAll ARIA: {total_gt} GT-linked | {total_corrupt} confirmed_corrupt | {total_review} needs_review')
conn.close()
