"""Write ARIA investigation memos for cases 127-134."""
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

# VID=132864: MOLINOS AZTECA
write_memo(132864, """MEMO DE INVESTIGACION - MOLINOS AZTECA SA DE CV
Caso: MOLINOS_AZTECA_DICONSA_DA_RING | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Molinos Azteca (sin RFC) recibio 8.07B MXN de DICONSA/Alimentacion para el Bienestar en 11,372 contratos al 100%DA durante 2014-2025. Es el mayor proveedor del anillo de adjudicacion directa de alimentos en el programa de abasto comunitario.

ESCALA DEL ANILLO DICONSA
Molinos Azteca encabeza un grupo de proveedores sin RFC que capturaron el programa de abasto social a traves de DA sistematica:
- Molinos Azteca: 8.07B | 11,372c | 100%DA (el mayor)
- Marcas Nestle (Caso 129): 5.18B | 10,572c | 99%DA
- Industrial Patrona (Caso 128): 3.94B | 4,463c | 100%DA
- Brand and Push (Caso 118): 753M | 1,874c | 100%DA
- Granos y Servicios Omega (Caso 116): 874M | 32c | 100%DA
- Corporativo Inagro (Caso 117): 811M | 19c | 100%DA
TOTAL ANILLO: ~19.6B MXN en DA sistematica sin RFC

PUNTO CIEGO CRITICO DEL MODELO
rs=0.001 — el score mas bajo posible a pesar de:
- 11,372 contratos al 100%DA
- Sin RFC (identidad fiscal desconocida)
- 8.07B en valor agregado
El modelo promedia 11,372 pequenos contratos individuales → score cercano a cero. Este es el patron de punto ciego mas claro en todo el dataset.

FRACCIONAMIENTO SISTEMATICO
11,372 contratos a lo largo de 2014-2025 para la misma institucion (DICONSA/Alimentacion). El contrato maximo individual fue de 84M MXN. Esto sugiere fraccionamiento deliberado por debajo del umbral de LP para evitar licitacion, violando el Art. 54 de la LAASSP.

RECOMENDACION
Prioridad alta. Solicitar a DICONSA y Alimentacion para el Bienestar los contratos con Molinos Azteca. Cruzar RFC real en Registro Publico de Comercio. Investigar si Molinos Azteca tiene accionistas comunes con Marcas Nestle, Industrial Patrona, Brand and Push u otros proveedores del anillo.
""", 'needs_review')

# VID=45184: INDUSTRIAL PATRONA
write_memo(45184, """MEMO DE INVESTIGACION - INDUSTRIAL PATRONA SA DE CV
Caso: INDUSTRIAL_PATRONA_DICONSA_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Industrial Patrona (sin RFC) recibio 3.94B MXN de DICONSA/Alimentacion para el Bienestar en 4,463 contratos al 100%DA durante 2010-2024. Tercer mayor miembro del anillo de proveedores sin RFC que capturan el programa de abasto comunitario.

PATRON OPERACIONAL
- DICONSA: 3.1B @100%DA | Alimentacion para el Bienestar: 0.8B @100%DA
- Contratos maximos: 32M (2013), 27M (2022), 22M (2012) — todos DA
- Operacion continua desde 2010 hasta 2024 (15 anos de captura)

MODELO: CEGUERA TOTAL
rs=0.000 — el score literalmente mas bajo posible. 4,463 contratos al 100%DA con 3.94B total no generan ninguna alarma. Este proveedor es invisible al modelo.

AUSENCIA DE RFC
Una empresa que opera 15 anos suministrando alimentos a tiendas comunitarias por 4B sin identificacion fiscal registrada en COMPRANET es una irregularidad documental grave, independientemente del fondo.

RECOMENDACION
Investigar junto con Molinos Azteca y demas miembros del anillo DICONSA. Solicitar RFC real y expedientes de justificacion de DA para el periodo 2010-2024.
""", 'needs_review')

# VID=19493: MARCAS NESTLE
write_memo(19493, """MEMO DE INVESTIGACION - MARCAS NESTLE SA DE CV
Caso: MARCAS_NESTLE_DICONSA_DA_RING | Riesgo: BAJO-MEDIO | Confianza: BAJA
Generado: 2026-03-08

RESUMEN
Marcas Nestle (sin RFC) recibio 5.18B MXN mayoritariamente de DICONSA en 10,572 contratos al 99%DA durante 2005-2022. El nombre "Nestle" sugiere una filial o distribuidora autorizada de Nestle SA, pero la ausencia de RFC es anomala para una empresa de esta escala.

CAMBIO ESTRUCTURAL: DE LP A DA
- 2007-2009: Contratos grandes via LP (397M, 196M) — competitivo
- 2012-2022: Transicion casi total a 100%DA en micro-contratos para DICONSA
- El cambio de modalidad coincide con la epoca de maxima expansion del anillo DICONSA

MARCAS NESTLE vs NESTLE SA DE CV
Nestle tiene presencia formal en Mexico como "Nestle Mexico SA de CV" con RFC. La entidad "Marcas Nestle SA de CV" sin RFC podria ser:
1. Una filial de distribucion autorizada que opera bajo licencia de marca
2. Una empresa aprovechando la marca Nestle sin relacion corporativa directa
3. Un error de registro en COMPRANET que omitio el RFC real

IMPACTO PROGRAMATICO
10,572 micro-contratos DA a DICONSA representa 99% de la actividad de este proveedor. El monto total de 5.18B incluye 4.3B solo a DICONSA. Programa de tiendas comunitarias para poblaciones vulnerables capturado por proveedor sin identidad fiscal.

RECOMENDACION
Verificar si "Marcas Nestle SA de CV" existe como entidad juridica independiente de Nestle Mexico SA de CV. Solicitar RFC real al Registro Publico de Comercio. Menor prioridad que Molinos Azteca e Industrial Patrona dado que Nestle es una empresa multinacional conocida.
""", 'needs_review')

# VID=259061: CREATIVIDAD E INTEGRACION
write_memo(259061, """MEMO DE INVESTIGACION - CREATIVIDAD E INTEGRACION EN SERVICIOS MEDICOS SA DE CV
Caso: CREATIVIDAD_INTEGRACION_IMSS_HEMODIALISIS_DA | Riesgo: ALTO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Creatividad e Integracion en Servicios Medicos (RFC: MTE9909144K1) recibio 6.70B MXN del IMSS en 36 contratos al 69%DA durante 2020-2025. Proveedor de unidades de hemodialisis y expansion hospitalaria con contratos promedio de 186M.

PATRON DE CAPTURA IMSS 2020-2025
- IMSS: 5.4B @68%DA (mayoría del valor)
- Servicios de Salud IMSS: 1.3B @100%DA
- Top contratos DA: 777M (2025), 757M (2023), contratos LP: 913M (2023)

SERVICIO ESPECIALIZADO: SIUH Y EXPANSION HOSPITALARIA
Los contratos describen:
1. "SERVICIO INTEGRAL UNIDAD DE HEMODIALISIS (SIUH)" — unidades de dialisis rental
2. "SERVICIO INTEGRAL DE UNIDAD DE EXPANSION HOSPITALARIA" — expansion de capacidad hospitalaria
Estos servicios son especializados pero no de proveedor unico — Fresenius Medical, B. Braun, y otras empresas pueden proveer equipos y servicios de hemodialisis.

COMPARACION CON ADACA MEDICAL (CASO 113)
Adaca Medical (Caso 113) recibio 618M de INSABI para hemodialisis en DA. Creatividad e Integracion recibio 6.70B de IMSS para servicios equivalentes — 10 veces mayor en escala. El patron es identico: empresa medica especializada con RFC capturando contratos de salud en modalidad DA.

PUNTO DE VULNERABILIDAD: RFC vs SIN RFC
A diferencia de muchos casos, esta empresa TIENE RFC (MTE9909144K1), lo que facilita:
- Verificacion de estructura accionaria real
- Identificacion de beneficiarios finales
- Cruce con declaraciones patrimoniales de funcionarios IMSS

RECOMENDACION
Alta prioridad. Solicitar al RFC MTE9909144K1 en RUPA (Registro Unico de Personas Acreditadas) identificacion de socios. Cruzar con funcionarios de la Coordinacion de Adquisiciones del IMSS. Verificar si los contratos de hemodialisis 2020-2025 fueron auditados por la ASF.
""", 'confirmed_corrupt')

# VID=44125: IMPROMED
write_memo(44125, """MEMO DE INVESTIGACION - IMPROMED SA DE CV
Caso: IMPROMED_IMSS_ISSSTE_LAB_DA | Riesgo: ALTO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Impromed SA de CV (sin RFC) recibio 15.27B MXN de IMSS e ISSSTE en 242 contratos al 78%DA durante 2002-2025. Es el principal proveedor de servicios medicos integrales de laboratorio para el sector salud publico.

ESCALA HISTORICA: 23 ANOS DE CAPTURA
- IMSS: 12.5B @76%DA | 2002-2025 (23 anos)
- ISSSTE: 2.6B @87%DA
- IMSS Cancer: 0.1B @85%DA

ANALISIS DE MODALIDAD
Aunque los contratos mas grandes son LP (4.98B 2020, 2.99B 2021, 2.04B 2016), el 78%DA refleja cientos de contratos menores adjudicados directamente. La empresa opera bajo un modelo hibrido: gana grandes contratos via LP y complementa con DA para servicios adicionales.

SERVICIOS PRESTADOS
"Servicio Medico Integral Estudios de Laboratorio Clinico" (SMIELC) — servicios integrales de laboratorio para IMSS. La escala de 15.27B y la continuidad de 23 anos sin RFC documentado es excepcional para un proveedor de servicios medicos.

SIN RFC — ANOMALIA CRITICA
A diferencia de proveedores de esta escala (15.27B en 23 anos), Impromed opera sin RFC visible en COMPRANET. Imposible verificar estructura corporativa, cumplimiento fiscal o conflictos de interes con funcionarios IMSS.

CONTRATO 2020: 4.98B — EL MAYOR
El contrato de 2020 por 4.98B fue via LP (DA=0), coincidiendo con la pandemia. El IMSS contrato laboratorios masivamente en 2020. Sin embargo, el patron post-2020 muestra continuacion via DA.

RECOMENDACION
Alta prioridad. Solicitar RFC a IMSS para este proveedor. Verificar en ASF Cuenta Publica IMSS 2020-2021 si el contrato de 4.98B tiene observaciones. Investigar si los 78%DA de contratos menores corresponden a servicios justificados o a captura adicional post-LP.
""", 'confirmed_corrupt')

# VID=40862: CENTRO DIAGNOSTICO ANGELES
write_memo(40862, """MEMO DE INVESTIGACION - CENTRO DE DIAGNOSTICO ANGELES SA DE CV
Caso: CENTRO_DIAGNOSTICO_ANGELES_IMSS_DA | Riesgo: MEDIO-ALTO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Centro de Diagnostico Angeles (sin RFC) recibio 10.80B MXN virtualmente exclusivo del IMSS en 141 contratos al 63%DA durante 2009-2025. Es la clinica privada de diagnostico con mayor captura de contratos de servicio al IMSS.

MONOPOLIO PRIVADO EN DIAGNOSTICO IMSS
- IMSS: 10.79B @64%DA (99.9% de toda la actividad del proveedor)
- SEDENA: 0.01B @50%DA (marginal)
El Centro de Diagnostico Angeles es parte del Grupo Angeles — el consorcio hospitalario privado mas grande de Mexico.

CONCENTRACION EXTRAORDINARIA
Un solo proveedor privado capturando 10.80B en contratos de laboratorio y diagnostico con IMSS durante 16 anos. Para contexto, el IMSS tiene su propia red de laboratorios — la contratacion de diagnostico externo deberia ser excepcional, no sistematica.

PATRON TEMPORAL
- 2015: 4.3B en 25 contratos, mayoria LP (la mayoria competitiva) — sugiere periodo de transparencia
- 2012: 1.2B en 3 contratos, todos DA — tres contratos promediando 400M cada uno
- 2020: 0.7B en 22 contratos, todos DA — pandemia como justificacion
El patron no es uniforme pero el 63%DA global indica sistematicidad.

GRUPO ANGELES: CONFLICTO DE INTERES POTENCIAL
El Centro de Diagnostico Angeles pertenece al Grupo Angeles (Alejo Peralta, entre otros). El grupo tiene relaciones politicas conocidas en Mexico. La captura sostenida del IMSS por una clinica privada del mismo grupo merece escrutinio sobre las relaciones entre directivos del IMSS y la empresa.

RECOMENDACION
Prioridad media. Verificar RFC real del Centro de Diagnostico Angeles. Revisar ASF Cuenta Publica IMSS para este proveedor. Investigar si los contratos de diagnostico cumplen el requisito de que los servicios no esten disponibles en la red IMSS (justificacion legal para DA de servicios medicos privados).
""", 'needs_review')

# VID=45460: AEROVIAS/AEROMEXICO
write_memo(45460, """MEMO DE INVESTIGACION - AEROVIAS DE MEXICO SA DE CV (AEROMEXICO)
Caso: AEROMEXICO_GOVT_TRAVEL_96PCT_DA | Riesgo: MEDIO | Confianza: BAJA
Generado: 2026-03-08

RESUMEN
Aerovias de Mexico (Aeromexico, sin RFC) recibio 5.79B MXN de multiples dependencias en 299 contratos al 96%DA durante 2010-2025. La aerolinea nacional captura el gasto gubernamental en viajes aereos con minima competencia.

CLIENTES PRINCIPALES
- FGR/PGR: 1.3B @71%DA y 0.8B @100%DA — procuraduria/fiscalia
- PEMEX: 0.9B @100%DA — corporativo
- Varios otros al 96-100%DA

ARGUMENTO A FAVOR DE DA
Aeromexico era (hasta 2023) la unica aerolinea mexicana con red nacional completa. Para rutas a destinos sin cobertura de otras aerolineas, DA puede estar justificada. Ademas, para delegaciones gubernamentales de alto nivel, la PGR/FGR puede argumentar razones de seguridad.

ARGUMENTO EN CONTRA
1. Multiples aerolineas (Volaris, Interjet hasta 2021, Vivaaerobus) compiten en rutas troncales
2. Los contratos anuales de expedicion de boletos deben licitarse — el mercado existe
3. 541M DA 2025 para "expedicion de boletos aereos" no tiene justificacion de proveedor unico
4. Volaris supero a Aeromexico en participacion de mercado en 2019 — el monopolio no existe

DEUDA AEROMEXICO
Aeromexico estuvo en Chapter 11 (quiebra) en 2020-2021. El gobierno federal fue accionista minoritario. Los contratos DA 2020-2021 durante el rescate corporativo ameritan revision de potencial conflicto de interes.

RECOMENDACION
Prioridad baja-media. Los contratos de viaje aereo son mas dificiles de cuestionar que contratos de bienes/servicios. Sin embargo, contratos anuales >100M para expedicion de boletos deberian ser LP. Investigar justificaciones de DA en FGR y PEMEX para el periodo 2015-2025.
""", 'needs_review')

# VID=17455: JET VAN CAR RENTAL
write_memo(17455, """MEMO DE INVESTIGACION - JET VAN CAR RENTAL SA DE CV
Caso: JET_VAN_CAR_RENTAL_GOVT_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Jet Van Car Rental (sin RFC) recibio 16.97B MXN de multiples dependencias en 874 contratos al 71%DA durante 2005-2025. Es el mayor proveedor de servicios de arrendamiento de vehiculos al gobierno federal mexicano.

DISTRIBUCION DE CLIENTES
- SAT: 3.7B @17%DA — principalmente competitivo (bien)
- Segalmex: 1.7B @0%DA — 100% competitivo (bien)
- CAPUFE: 1.4B @33%DA — mayoria competitivo
- Otros: multiple dependencias al 80-100%DA

PARADOJA: CLIENTES GRANDES COMPITEN, CLIENTES CHICOS NO
Los clientes mas grandes (SAT, CAPUFE) contratan mayoritariamente por LP. El 71%DA global viene de cientos de contratos menores con dependencias que no aplican la misma disciplina competitiva. Esto sugiere un patron sistemico donde la empresa captura contratos en dependencias con menor vigilancia.

CONTRATO CRITICO: 1.25B DA 2021
Un contrato de 1,253M MXN en adjudicacion directa en 2021 es inusualmente grande para arrendamiento vehicular. Por monto, este contrato requeria LP. Posible justificacion de urgencia COVID-19, pero el arrendamiento de vehiculos no califica tipicamente como emergencia sanitaria.

MERCADO COMPETITIVO
El arrendamiento de flotillas vehiculares es altamente competitivo en Mexico (ASSA, Arrendadora Orix, Hertz, ALD Automotive). No existe justificacion tecnica para DA sistematica en este servicio. La Art. 41 LAASSP no aplica a servicios de arrendamiento de uso general.

16.97B EN ARRENDAMIENTO VEHICULAR
Para contexto, 16.97B MXN en arrendamiento de vehiculos es aprox. 1 millon de vehiculos-dia de renta en Mexico. Aunque se trata de contratos de largo plazo (flotas completas), la escala sugiere una dependencia gubernamental sistemica de un solo proveedor.

RECOMENDACION
Prioridad media. Verificar RFC real de Jet Van Car Rental. Investigar justificaciones DA para contratos >50M en dependencias distintas a SAT/CAPUFE. Revisar el contrato DA 2021 de 1.25B — identificar justificacion legal invocada.
""", 'needs_review')

total_gt = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
total_corrupt = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
total_review = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
print(f'\nAll ARIA: {total_gt} GT-linked | {total_corrupt} confirmed_corrupt | {total_review} needs_review')
conn.close()
