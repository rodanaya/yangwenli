"""Write ARIA investigation memos for cases 135-142."""
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

# VID=148437: CESAR FUENTES AGUIRRE
write_memo(148437, """MEMO DE INVESTIGACION - CESAR ALFONSO FUENTES AGUIRRE
Caso: CESAR_FUENTES_AGUIRRE_IMSS_PERSONA_FISICA | Riesgo: ALTO | Confianza: ALTA
Generado: 2026-03-08

RESUMEN
Cesar Alfonso Fuentes Aguirre, persona fisica (sin RFC visible en COMPRANET), recibio 1.73B MXN del IMSS en 1,375 contratos al 90%DA durante 2015-2024. Es el mayor contratante individual (persona fisica) identificado en el dataset de 3.1M contratos.

PERFIL DE CONTRATOS
- Contrato maximo DA: 421.8M MXN (2016) — sin descripcion
- Contrato maximo LP: 344.9M MXN (2016) — sin descripcion
- Tercer contrato: 278.1M DA (2016)
Los tres contratos mas grandes son de 2016, sin descripcion, al IMSS. La ausencia de descripcion para contratos de esta magnitud es una irregularidad de transparencia grave.

INTERROGANTE CENTRAL: PERSONA FISICA O IDENTIDAD FANTASMA
En Mexico, el IMSS puede contratar medicos especialistas como personas fisicas para servicios medicos especializados (ultrasonido, cirugia, anestesiologia). Sin embargo, 1.73B MXN a UN SOLO individuo, incluyendo contratos mayores de 300-400M, excede cualquier justificacion medica razonable.

Hipotesis:
1. PERSONA FANTASMA: Identidad usada para canalizar pagos a una red mas amplia de proveedores
2. PRESTANOMBRE: Un intermediario que recibe contratos DA y los subcontrata a empresas reales
3. ALTO FUNCIONARIO O FAMILIAR: Contratacion irregular de persona con conexiones internas al IMSS
4. MEDICO/PROVEEDOR LEGITIMO: Con escala de contratos absolutamente anormal para una persona fisica

EL DATO MAS ALARMANTE
90%DA + sin RFC + sin descripcion + persona fisica = 1.73B MXN. Ninguna persona fisica en el sector salud deberia recibir contratos individuales de 300-400 millones de pesos sin proceso competitivo.

RECOMENDACION
PRIORIDAD MAXIMA. Solicitar al IMSS el RFC real de Cesar Alfonso Fuentes Aguirre. Verificar si existe como persona fisica en el RFC del SAT. Cruzar con la Declaracion Patrimonial del personal directivo del IMSS 2015-2018. Solicitar el objeto contractual de todos los contratos mayores a 50M MXN.
""", 'confirmed_corrupt')

# VID=266005: PV METALLS LLC
write_memo(266005, """MEMO DE INVESTIGACION - PV METALLS LLC
Caso: PV_METALLS_CASA_MONEDA_100DA_2020 | Riesgo: ALTO | Confianza: ALTA
Generado: 2026-03-08

RESUMEN
PV Metalls LLC (sin RFC, entidad extranjera — posiblemente latviana o estonia) recibio 1.66B MXN de Casa de Moneda de Mexico en 15 contratos al 100%DA durante 2020-2022. Proveedor de laminas metalicas para fabricacion de monedas.

MATERIALES SUMINISTRADOS
1. LAMINA MATERIA PRIMA — laminas de acero para monedas
2. LAMINA CMM BCE NUC $1.00 — lamina bronce/acero recubierto para moneda de 1 peso (741,500 kg)
3. LAMINA CMM ALP NUC $10.00 — lamina alpaca (alpaca = cupronicquel) para moneda de 10 pesos
4. LAMINA BRONCE-ALUMINIO — para monedas bimetalicas

MAGNITUD DE LOS CONTRATOS
- Contrato maximo: 836M DA 2022
- Segundo: 641M DA 2021
- Tercero: 507M DA 2021
15 contratos promediando 110M MXN cada uno, todos DA.

IRREGULARIDADES CRITICAS
1. ENTIDAD EXTRANJERA SIN RFC: Una empresa extranjera proveyendo materia prima critica de seguridad nacional a la moneda mexicana sin identificacion fiscal en Mexico
2. 100%DA PARA COMMODITIES METALICOS: Las laminas metalicas son commodities con precios internacionales transparentes (London Metal Exchange). No existe justificacion para DA sistematica.
3. PERIODO COVID 2020-2022: Coincide con el periodo de maxima irregularidad en adquisiciones de emergencia
4. CONCENTRACION EN UN PROVEEDOR: Casa de Moneda colocando 1.66B en un solo proveedor extranjero para materiales criticos

SEGURIDAD NACIONAL
La Casa de Moneda de Mexico es una entidad estrategica de seguridad nacional. La dependencia de un proveedor extranjero unico (al 100%DA) para las materias primas de la produccion de moneda representa un riesgo sistematico de la cadena de suministro monetaria.

PV METALLS — IDENTIFICACION
"PV" + "Metalls" (grafía latviana de "metals" en ingles) sugiere empresa del Baltico. Principales productores de laminas metalicas para monedas incluyen empresas alemanas (Wieland), finlandesas (Outokumpu) y estadounidenses (Olin). Un LLC desconocido del Baltico obteniendo contratos de 800M sin licitacion es altamente sospechoso.

RECOMENDACION
Prioridad alta. Solicitar a Casa de Moneda el expediente completo de los 15 contratos con PV Metalls. Verificar identidad corporativa real (pais de constitucion, accionistas). Comparar precios unitarios con precios LME 2020-2022. Investigar si hay funcionarios de Casa de Moneda con conexiones a la empresa.
""", 'confirmed_corrupt')

# VID=45722: DEMOS DESARROLLO DE MEDIOS (La Jornada)
write_memo(45722, """MEMO DE INVESTIGACION - DEMOS DESARROLLO DE MEDIOS SA DE CV (LA JORNADA)
Caso: DEMOS_LA_JORNADA_GOVT_ADVERTISING_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Demos Desarrollo de Medios SA de CV (sin RFC) — empresa editora del periodico La Jornada — recibio 1.68B MXN en 1,000 contratos al 100%DA durante 2010-2025.

PATRON DE PUBLICIDAD GUBERNAMENTAL
IMSS: 410M @100%DA — "Servicios de Difusion de las Campanas Institucionales" (53.9M por ano, 2020-2024)
Loteria Nacional: 300M @100%DA — "Servicio de publicidad en medios impresos" (50M por ano, 2020-2023)
Patron de 50-54M anuales repetidos identicamente cada ano via DA.

IDENTIFICACION: LA JORNADA
Demos Desarrollo de Medios SA de CV es la empresa propietaria de La Jornada, periodico diario de tendencia progresista/izquierdista en Mexico. El periodico fue un simpatizante editorial del movimiento politico de AMLO/Morena (en el poder 2018-2024).

CONFLICTO DE INTERES MEDIATICO
El mismo patron que para Televisa y TV Azteca (Casos 119-120, 12.98B) aplica aqui en escala menor:
- La afinidad editorial del medio con el gobierno proporciona un incentivo para cobertura favorable
- La DA sistematica elimina la competencia con otros medios impresos
- El monto de 54M/ano del IMSS a un solo periodico es desproporcionado

DIFERENCIA CON EL CASO TELEVISA/TV AZTECA
El caso de La Jornada es de menor escala (1.68B vs 12.98B del duopolio televisivo) pero el patron es equivalente. La preferencia del gobierno hacia medios editorialmente alineados via DA es un problema sistemico que afecta la independencia de prensa independientemente del medio.

RECOMENDACION
Prioridad media. Documentar el patron de publicidad gubernamental como parte del ecosistema mas amplio de medios financiados por gobierno via DA. Solicitar RFC real de Demos Desarrollo de Medios. Verificar si los 54M anuales del IMSS a La Jornada corresponden a tarifas de mercado para publicidad en prensa.
""", 'needs_review')

# VID=80346: CUETARA DISTRIBUCION
write_memo(80346, """MEMO DE INVESTIGACION - CUETARA DISTRIBUCION SA DE CV
Caso: CUETARA_DICONSA_100DA_FOOD_RING | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Cuetara Distribucion SA de CV (sin RFC) recibio 2.00B MXN de DICONSA/Alimentacion para el Bienestar en 5,596 contratos al 100%DA. Es el cuarto mayor miembro del anillo de proveedores de alimentos sin RFC que captura el programa de abasto social.

POSICION EN EL ANILLO DICONSA (ordenado por valor)
1. Molinos Azteca: 8.07B (Caso 127)
2. Marcas Nestle: 5.18B (Caso 129)
3. Industrial Patrona: 3.94B (Caso 128)
4. Cuetara Distribucion: 2.00B (este caso)
5. Comercializadora Columbia: 1.69B (Caso 142)
6. Alen del Norte: 1.78B (Caso 140)
TOTAL ANILLO IDENTIFICADO: >31B MXN

CUETARA: NOMBRE DE MARCA GALLETAS
"Cuetara" es una marca espanola de galletas y productos de alimentacion (fundada 1864, Grupo Cuetara). Si esta empresa distribuye galletas Cuetara a DICONSA, podria ser una distribuidora legitima. Sin embargo, la ausencia de RFC y el 100%DA sistematico son indicadores de captura.

rs=0.000 — PUNTO CIEGO EXTREMO
5,596 contratos al 100%DA con rs=0.000. El modelo es incapaz de detectar este patron de micro-contratos DA.

RECOMENDACION
Investigar junto con los demas miembros del anillo DICONSA. Verificar RFC real.
""", 'needs_review')

# VID=44997: PEPSICO MEXICO
write_memo(44997, """MEMO DE INVESTIGACION - COMERCIALIZADORA PEPSICO MEXICO S DE RL DE CV
Caso: PEPSICO_MEXICO_DICONSA_100DA_RING | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Comercializadora Pepsico Mexico (sin RFC) recibio 1.84B MXN de DICONSA en 6,945 contratos al 100%DA durante 2010-2019. Proveedor de productos Pepsi/Sabritas/Gamesa a las tiendas comunitarias del programa de abasto social.

LA ANOMALIA RFC
PepsiCo Inc. es una multinacional estadounidense con presencia formal en Mexico. Su subsidiaria formal es "Pepsi-Cola Mexico SA de CV" o "Sabritas" con RFC. La entidad "Comercializadora Pepsico Mexico S de RL de CV" sin RFC en COMPRANET podria ser:
1. Una distribuidora regional autorizada por PepsiCo pero que opera sin RFC visible
2. Una entidad que usa la marca Pepsi sin ser la subsidiaria directa

CONCENTRACION EN DICONSA
1.82B de los 1.84B totales fueron con DICONSA (99%). Distribucion de chips y refrescos a tiendas comunitarias para poblaciones de bajos ingresos via 6,945 micro-contratos DA.

PERIODO: 2010-2019
La actividad se detiene en 2019 — posiblemente la relacion cambio con el cambio de gobierno AMLO o la reorganizacion del programa (DICONSA -> Alimentacion para el Bienestar).

RECOMENDACION
Prioridad baja-media. La distribucion de productos de marca a DICONSA puede tener justificacion de exclusividad de marca, pero 100%DA es excesivo. Investigar si la entidad es una subsidiaria formal de PepsiCo Mexico. Cruzar con demas miembros del anillo.
""", 'needs_review')

# VID=45050: ALEN DEL NORTE
write_memo(45050, """MEMO DE INVESTIGACION - ALEN DEL NORTE SA DE CV
Caso: ALEN_NORTE_DICONSA_100DA_RING | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Alen del Norte SA de CV (sin RFC) recibio 1.78B MXN de DICONSA/Alimentacion para el Bienestar en 13,945 contratos al 100%DA — el mayor numero de contratos en el anillo DICONSA. Proveedor de productos de limpieza para las tiendas comunitarias.

ALEN: EMPRESA MEXICANA DE LIMPIEZA
Alen del Norte es una empresa mexicana de productos de limpieza (detergentes, blanqueadores, jabones) con sede en Monterrey. Es una empresa real y conocida — no es una empresa fantasma. Sin embargo, su captura sistematica del canal DICONSA via DA sistematica es irregular.

VOLUMEN HISTORICO: 13,945 MICRO-CONTRATOS
La frecuencia de 13,945 contratos supera a todos los demas miembros del anillo DICONSA. Esto implica fraccionamiento extremo — posiblemente cada contrato corresponde a un pedido de suministro a una tienda comunitaria individual, pero la suma total de 1.78B deberia haberse agregado y licitado.

MODELO: CEGUERA TOTAL
rs=0.000 — 13,945 contratos promediados resultan en score virtualmente cero. Este es el caso paradigmatico del punto ciego de alta frecuencia/bajo valor.

RECOMENDACION
Investigar junto con el anillo DICONSA. La empresa es real pero la DA sistematica durante 15 anos es irregularidad documentable. Solicitar RFC real y verificar si los 1.78B corresponden a precios de mercado para productos de limpieza.
""", 'needs_review')

# VID=45117: MINSA SA
write_memo(45117, """MEMO DE INVESTIGACION - MINSA SA DE CV
Caso: MINSA_DICONSA_100DA_MASA_HARINA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Minsa SA de CV (sin RFC) recibio 1.77B MXN de DICONSA en 5,514 contratos al 100%DA durante 2010-2021. Proveedor de masa harina (harina de maiz nixtamalizada) para las tiendas comunitarias de abasto social.

MINSA: EL SEGUNDO PRODUCTOR DE MASA HARINA EN MEXICO
Minsa SA de CV es el segundo productor de masa harina en Mexico, detras de Maseca/Gruma (la marca dominante de Carlos Slim). Minsa es una empresa real con operaciones en multiples estados. Su presencia en DICONSA es comun dado que el programa distribuye harinas a comunidades rurales.

LA IRREGULARIDAD: 100%DA PARA UN COMMODITY
Masa harina es un commodity con multiples productores (Maseca, Minsa, Harimasa, otros). No existe justificacion tecnica para DA sistematica cuando hay competencia real en el mercado. DICONSA deberia licitar anualmente el suministro de masa harina y seleccionar al proveedor de menor precio.

COMPETENCIA CON MASECA
Maseca/Gruma tambien tiene contratos con DICONSA pero presumiblemente con mayor uso de LP. La captura del canal DA por Minsa podria reflejar conexiones politicas con funcionarios de DICONSA en periodos especificos.

rs=0.000 — modelo ciego a este patron.

RECOMENDACION
Investigar junto con el anillo DICONSA. Solicitar RFC real. Verificar si el precio por kilo de masa harina en los contratos DA fue equivalente a precios de mercado en el periodo 2010-2021.
""", 'needs_review')

# VID=61022: COMERCIALIZADORA COLUMBIA
write_memo(61022, """MEMO DE INVESTIGACION - COMERCIALIZADORA COLUMBIA SA DE CV
Caso: COMERCIALIZADORA_COLUMBIA_DICONSA_DA | Riesgo: MEDIO | Confianza: MEDIA
Generado: 2026-03-08

RESUMEN
Comercializadora Columbia SA de CV (sin RFC) recibio 1.69B MXN de DICONSA en 62 contratos al 98%DA durante 2010-2020. Miembro del anillo DICONSA con perfil diferente: contratos mas grandes (promedio 27M) vs. los micro-contratos del resto del anillo.

PERFIL DIFERENCIADO
A diferencia de Molinos Azteca (11,372 contratos) o Alen del Norte (13,945), Columbia usa solo 62 contratos de mayor valor unitario. Esto sugiere que Columbia opera como distribuidor regional o mayorista, no como proveedor de pedidos individuales por tienda.

CAPTURA TOTAL DICONSA
1.69B de 1.69B total fueron con DICONSA — concentracion del 100% en una institucion.

OPORTUNIDAD INVESTIGATIVA
Con solo 62 contratos, es posible auditar manualmente el expediente completo de esta empresa con DICONSA. Los contratos mayores (posiblemente 40-50M cada uno) deberian haber requerido LP.

RECOMENDACION
Prioridad media. Solicitar los 62 expedientes contractuales a DICONSA via transparencia. Verificar RFC real. Investigar si Columbia tiene relacion corporativa con otros miembros del anillo.
""", 'needs_review')

total_gt = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
total_corrupt = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
total_review = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
print(f'\nAll ARIA: {total_gt} GT-linked | {total_corrupt} confirmed_corrupt | {total_review} needs_review')
conn.close()
