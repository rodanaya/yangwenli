"""Write investigation memos for GT cases 239-241 into aria_queue.

Vendors:
  VID=6285   APLICACIONES MEDICAS INTEGRALES SA DE CV (Case 239)
  VID=253837 CELGENE LOGISTICS SARL (Case 240)
  VID=119824 NIZA NUDEE ASOCIADOS SA DE CV (Case 241)
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

MEMOS = {
    6285: """\
MEMO DE INVESTIGACION — APLICACIONES MEDICAS INTEGRALES SA DE CV
=================================================================
Fecha: 2026-03-08 | Caso GT: AMI_ANESTESIA_IMSS_ISSSTE_MONOPOLIO | Confianza: Media

RESUMEN EJECUTIVO
-----------------
Aplicaciones Medicas Integrales SA de CV (VID=6285) es un proveedor sin RFC registrado
que ha mantenido un monopolio de facto sobre los contratos de servicios integrales de
anestesia en el Instituto Mexicano del Seguro Social (IMSS) y el Instituto de Seguridad
y Servicios Sociales de los Trabajadores del Estado (ISSSTE) durante mas de dos decadas.
Con 263 contratos y un valor total de 11,017 millones de pesos (MXN), esta empresa
representa uno de los mayores acumulados en servicios medicos especializados de toda la
base de datos COMPRANET analizada.

PATRON DE CONTRATACION
-----------------------
El analisis de los contratos revela tres hitos criticos que definen la magnitud de la
concentracion:

1. Marzo 2005 — Contrato LP por 5,882 millones de pesos con IMSS para el "Servicio
   Integral de Vaporizadores de Sevoflurano". El sevoflurano es el agente de anestesia
   inhalatoria mas utilizado en quirofanos modernos. Un contrato integral de esta escala,
   equivalente al presupuesto anual de salud de varios estados, consolida a la empresa
   como el unico proveedor del servicio de anestesia gaseosa en decenas o cientos de
   hospitales del IMSS simultaneamente.

2. Diciembre 2006 — Contrato LP por 1,152 millones de pesos con ISSSTE para el
   "Servicio Integral de Anestesia del ISSSTE". Que la misma empresa gane el contrato
   equivalente en la segunda gran aseguradora de salud publica apenas 20 meses despues
   es una anomalia estadistica significativa.

3. Noviembre 2017 — Contrato LP por 717 millones de pesos con ISSSTE para "Servicio
   Integral de Anestesia". Once anos despues del contrato original, la misma empresa
   renueva su posicion en ISSSTE, lo que sugiere una relacion contractual estructural
   y no competitiva en la practica.

SENALES DE ALERTA
-----------------
- Ausencia total de RFC: En Mexico, toda empresa legalmente constituida esta obligada
  a registrarse ante el SAT y obtener RFC. La ausencia de RFC impide rastrear la
  estructura accionaria, las obligaciones fiscales, y los vinculos corporativos reales
  de la empresa.
- Concentracion en dos instituciones clave: Ganar contratos de anestesia en IMSS y en
  ISSSTE — las dos mayores instituciones de salud del gobierno federal — elimina toda
  competencia real en el mercado de servicios integrales de anestesia hospitalaria.
- Persistencia temporal: 20+ anos de contratos sin interrupcion significativa sugieren
  que el mecanismo de renovacion de contratos no ha sido verdaderamente competitivo.
- DA=27%: Una cuarta parte de los contratos fueron adjudicados directamente, sin
  licitacion publica. Esto es elevado para un proveedor con contratos tan grandes.

MARCO LEGAL Y COMPARATIVO
--------------------------
Bajo la Ley de Adquisiciones, Arrendamientos y Servicios del Sector Publico (LAASSP),
los contratos de esta magnitud deberian someterse a licitacion publica internacional.
Sin embargo, los contratos de "servicio integral" (donde el proveedor no solo entrega
el equipo sino que lo opera, lo mantiene y provee los insumos) tienen mecanismos de
adjudicacion directa bajo ciertos supuestos de exclusividad tecnologica que pueden haber
sido invocados para justificar la concentracion.

PASOS DE INVESTIGACION RECOMENDADOS
-------------------------------------
1. Consultar Cuenta Publica ASF 2005-2023 para auditoria de contratos IMSS/ISSSTE
   relacionados con anestesia (Funcion 12 — Salud).
2. Solicitar via InfoMex/INAI los expedientes de licitacion de los contratos clave para
   verificar si hubo participantes adicionales en las licitaciones publicas.
3. Buscar en el Registro Publico de Comercio la razon social completa, socios y
   representantes legales de Aplicaciones Medicas Integrales SA de CV.
4. Comparar precios unitarios de vaporizadores de sevoflurano y servicio de anestesia
   con benchmarks internacionales (PAHO, WHO, IMSS contratos similares en otros paises).
5. Verificar si la empresa aparece en listas de empresas vinculadas a investigaciones
   de la Secretaria de la Funcion Publica (SFP) o en el RUPC (Registro Unico de
   Proveedores y Contratistas).

CONCLUSION
----------
La concentracion de 11,017 millones de pesos en anestesia hospitalaria federal en una
sola empresa sin RFC, durante mas de dos decadas, constituye un patron de captura
institucional que justifica investigacion prioritaria. La ausencia de RFC es la anomalia
mas critica y deberia resolverse antes de cualquier evaluacion de fondo.
""",

    253837: """\
MEMO DE INVESTIGACION — CELGENE LOGISTICS SARL
===============================================
Fecha: 2026-03-08 | Caso GT: CELGENE_LOGISTICS_SARL_OFFSHORE_IMSS | Confianza: Baja

RESUMEN EJECUTIVO
-----------------
Celgene Logistics SARL (VID=253837) es una entidad juridica con la forma societaria
"SARL" (Societe a Responsabilite Limitee), tipica de Luxemburgo y Francia. Esta
subsidiaria de Celgene — compania de oncologia adquirida por Bristol Myers Squibb (BMS)
en noviembre de 2019 por 74,000 millones de dolares — aparece en COMPRANET con 54
contratos y 2,002 millones de pesos en compras del IMSS, principalmente para
"MEDICAMENTOS", sin contar con RFC mexicano.

CONTEXTO CORPORATIVO
--------------------
Celgene Corporation fue fundada en 1986 y su producto mas importante fue Revlimid
(lenalidomida), un inmunomodulador para mieloma multiple y linfoma del manto. Revlimid
fue el medicamento oncologico de mayor venta mundial durante varios anos, con patente
protegida hasta 2026 en varios mercados. La patente exclusiva de Revlimid justifica
legalmente la adjudicacion directa bajo el articulo 41 de la LAASSP para contratos de
medicamentos sin equivalente genericos disponibles.

Sin embargo, la entidad que cobra al IMSS no es Celgene Corporation ni Bristol Myers
Squibb Mexico SA de CV (la subsidiaria mexicana directa), sino "Celgene Logistics
SARL" — una entidad de logistica/distribucion registrada presumiblemente en Luxemburgo
o Francia. Esta estructura interpone una capa offshore entre el fabricante patentado
y el comprador gubernamental mexicano.

SENALES DE ALERTA
-----------------
- Forma juridica offshore: SARL no es una forma corporativa mexicana. Sin RFC, esta
  entidad opera en Mexico sin cumplir plenamente las obligaciones tributarias locales
  que corresponderian a un proveedor habitual.
- "Logistics" en el nombre: Las subsidiarias de logistica/distribucion son un mecanismo
  clasico para separar la facturacion del fabricante (que paga royalties por la patente)
  de la entidad que cobra al cliente final, permitiendo optimizacion fiscal agresiva o
  transferencia de precios entre jurisdicciones.
- Concentracion en un periodo corto: Los 54 contratos se concentran entre 2020 y 2022,
  periodo de alta demanda de medicamentos oncologicos durante la pandemia, cuando la
  fiscalizacion de contratos fue mas laxa.
- Contratos mas grandes: may-2020 657M, dic-2022 220M, ene-2022 210M. El contrato de
  mayo 2020 representa casi un tercio del total y coincide con el inicio de la pandemia
  de COVID-19.

CONSIDERACIONES DE CONFIANZA BAJA
-----------------------------------
La confianza en esta como un caso de fraude es baja porque:
1. Revlimid y otros oncologicos de Celgene/BMS estan bajo patente, lo que puede
   justificar la adjudicacion directa y los precios premium.
2. Es posible que "Celgene Logistics SARL" sea el vehiculo contractual estandarizado
   de BMS para ventas a gobiernos europeos y latinoamericanos, y no necesariamente
   una estructura de evasion.
3. Faltan datos de precio unitario para comparar con los precios de referencia del
   Cuadro Basico de Medicamentos del IMSS o del Banco Mundial.

PASOS DE INVESTIGACION RECOMENDADOS
-------------------------------------
1. Solicitar al IMSS via INAI los precios unitarios pagados por medicamento en los
   contratos con Celgene Logistics SARL y comparar con precios PAHO/AMRO para
   los mismos productos.
2. Verificar en el Registro Mercantil de Luxemburgo (RCSL — Registre de Commerce et
   des Societes) la existencia y estructura accionaria de Celgene Logistics SARL.
3. Contrastar si BMS Mexico SA de CV (con RFC) tambien tiene contratos con el IMSS
   para los mismos medicamentos en el mismo periodo (posible doble facturacion o
   division artificial).
4. Revisar si la SFP o la UIF (Unidad de Inteligencia Financiera) han identificado
   esta entidad en sus reportes de operaciones inusuales.
5. Consultar el Formulario de Oferta economica de los procedimientos de licitacion
   para verificar si la propuesta incluyo documentacion de establecimiento en Mexico.

CONCLUSION
----------
La estructura offshore de Celgene Logistics SARL es inusual y merece escrutinio, pero
la naturaleza patentada de los medicamentos oncologicos de Celgene/BMS podria justificar
los precios y la adjudicacion directa. Se clasifica como confianza baja hasta obtener
datos de precio unitario comparativo. No se recomienda incluir en el modelo de riesgo
como caso de fraude confirmado sin evidencia adicional.
""",

    119824: """\
MEMO DE INVESTIGACION — NIZA NUDEE ASOCIADOS SA DE CV
======================================================
Fecha: 2026-03-08 | Caso GT: NIZA_NUDEE_REFACCIONES_EQUIPO_MEDICO_IMSS | Confianza: Baja

RESUMEN EJECUTIVO
-----------------
Niza Nudee Asociados SA de CV (VID=119824) es una empresa sin RFC registrado cuyo
nombre incorpora el termino "Nudee", una voz del idioma zapoteco hablado en el estado
de Oaxaca, Mexico. En enero de 2013, esta empresa gano un contrato de licitacion publica
con el IMSS por 2,011 millones de pesos para la "ADQUISICION: REFACC PARA EQ MEDICO"
(adquisicion de refacciones para equipo medico). Este contrato, junto con quince
contratos adicionales menores (totalizando 2,025 millones en 15 contratos), representa
uno de los contratos individuales de mayor magnitud en el rubro de refacciones de
equipo medico en toda la base de datos de COMPRANET.

ANALISIS DEL CONTRATO PRINCIPAL
--------------------------------
El contrato de enero 2013 por 2,011 millones de pesos para "refacciones para equipo
medico" del IMSS es inusualmente grande por varias razones:

1. Escala: Para contexto, el IMSS opera aproximadamente 1,200 unidades medicas de
   primer nivel, 270 hospitales generales de zona y 25 hospitales de alta especialidad
   en todo el pais. Un contrato de refacciones de 2,011 millones en un solo acuerdo
   implica un precio de equipamiento extraordinariamente alto si se distribuye entre
   esas unidades, o bien una concentracion extrema de compras en un subconjunto
   muy reducido de instalaciones.

2. Tipo de bien: Las "refacciones para equipo medico" abarcan desde piezas de
   ultrasonido y tomografos hasta repuestos de camas de quirofano y monitores de
   signos vitales. La heterogeneidad del rubro dificulta la comparacion de precios
   unitarios y es un vector conocido para sobreprecios en compras publicas.

3. Empresa atipica: Una empresa con nombre de origen zapoteco (sugiriendo posible
   vinculo con Oaxaca), sin RFC y con un contrato unico de 2,011 millones, seguida
   de contratos pequerios de 2 millones en 2018 para mantenimiento, presenta un
   perfil de empresa de proposito especial (SPV) o empresa fantasma creada
   especificamente para capturar el contrato de 2013.

SENALES DE ALERTA
-----------------
- Ausencia de RFC: Impedimento para rastrear la identidad fiscal real.
- Contrato unico desproporcionado: 2,011 millones en el primer contrato registrado,
  seguido de cinco anos de inactividad y luego dos contratos minusculos de 2 millones
  es un patron inconsistente con una empresa proveedora activa y competitiva.
- DA=20%: Un quinto de los contratos fueron adjudicados directamente.
- "Licitacion Publica" en el contrato de 2,011 millones: Si fue licitacion publica,
  deberian existir al menos tres proposiciones. La transparencia del proceso debe
  verificarse en el expediente de contratacion.
- Nombre con terminologia indigena: Si bien esto no es en si mismo una anomalia
  (muchas empresas oaxaquenas legitimas usan nombres en lenguas indigenas), combinado
  con la ausencia de RFC y el perfil de contrato unico, refuerza la necesidad de
  verificacion de existencia real.

LIMITACIONES DEL ANALISIS
--------------------------
La confianza en este caso es baja porque:
1. No existen investigaciones periodisticas o legales publicas conocidas sobre Niza
   Nudee Asociados SA de CV.
2. La licitacion publica de 2013 puede haber sido genuinamente competitiva.
3. Las refacciones de equipo medico para el IMSS pueden tener precios de mercado
   que justifiquen el monto si el contrato incluia equipos de alta tecnologia
   (resonadores magneticos, aceleradores lineales, etc.).
4. La diferencia entre el contrato de 2013 y los de 2018 podria reflejar una
   estrategia comercial de presencia inicial grande seguida de mantenimiento, no
   necesariamente fraude.

PASOS DE INVESTIGACION RECOMENDADOS
-------------------------------------
1. Solicitar via INAI el expediente completo del procedimiento de licitacion publica
   de enero 2013 que resulto en el contrato de 2,011 millones, incluyendo las
   propuestas tecnicas y economicas de todos los participantes.
2. Buscar en el Registro Publico de Comercio la inscripcion de Niza Nudee Asociados
   SA de CV, su domicilio fiscal y sus representantes legales.
3. Verificar en la Cuenta Publica ASF 2013 si el IMSS recibio observaciones por
   contratos de refacciones de equipo medico de ese ano.
4. Solicitar al IMSS el inventario de refacciones adquiridas bajo este contrato y
   comparar precios unitarios con catalogos internacionales (ECRI Institute,
   WHO Health Technology Assessment).
5. Investigar si los accionistas o representantes legales aparecen en otros contratos
   gubernamentales o en listas de sanciones de la SFP.

CONCLUSION
----------
Niza Nudee Asociados SA de CV presenta un perfil de riesgo elevado basado en la
magnitud desproporcionada de su contrato principal de 2013, la ausencia de RFC, y
un patron de actividad contractual que sugiere empresa de proposito especial. Sin
embargo, la ausencia de investigaciones publicas y la posibilidad de que el contrato
fuera genuinamente competitivo hacen que la confianza en esta como caso de fraude
sea baja. Se requiere acceso al expediente de licitacion para elevar o descartar la
clasificacion como caso de sobreprecio.
""",
}


def write_memo(conn, vendor_id, memo_text):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur = conn.cursor()
    cur.execute(
        """UPDATE aria_queue
           SET memo_text = ?,
               memo_generated_at = ?
           WHERE vendor_id = ?""",
        (memo_text, ts, vendor_id)
    )
    rows = cur.rowcount
    return rows


conn = sqlite3.connect(DB)

for vid, memo in MEMOS.items():
    updated = write_memo(conn, vid, memo)
    word_count = len(memo.split())
    print(f"VID={vid}: memo written ({word_count} words, rows_updated={updated})")

conn.commit()

# Verify
print()
print("Verification:")
for vid in [6285, 253837, 119824]:
    r = conn.execute(
        "SELECT vendor_id, LENGTH(memo_text), memo_generated_at FROM aria_queue WHERE vendor_id=?",
        (vid,)
    ).fetchone()
    print(f"  VID={vid}: chars={r[1]}, generated_at={r[2]}")

conn.close()
print()
print("Memos written successfully.")
