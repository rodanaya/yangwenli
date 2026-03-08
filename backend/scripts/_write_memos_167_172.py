"""Write ARIA investigation memos for GT cases 167-172 (Vitalmex, GAMS, AVIOR, MAYPO, Bienestar shells, POYAGO)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

memos = [
    # (vendor_id, review_status, memo_text)

    # ── VITALMEX INTERNACIONAL ──────────────────────────────────────────────
    (4325, 'confirmed_corrupt', """
MEMO DE INVESTIGACIÓN — VITALMEX INTERNACIONAL S.A. DE C.V.
Fecha: 2026-03-08 | Analista: ARIA v3 | Caso: VITALMEX_COFECE_CARTEL_MEDICO

RESUMEN EJECUTIVO
La empresa Vitalmex Internacional S.A. de C.V. es el nodo central de un cartel médico formalmente
documentado por la COFECE (Comisión Federal de Competencia Económica) en 2019 mediante la
resolución IO-007-2014. El grupo Vitalmex recibió contratos gubernamentales por ~101.5B MXN en total
a través de 7+ entidades interconectadas, con Vitalmex Internacional como actor principal (32.06B MXN,
1,052 contratos, 40%AD, rs=0.962).

HALLAZGOS COFECE
La COFECE documentó que el Grupo Vitalmex coordinó ofertas entre múltiples entidades para
distribuirse contratos del IMSS, ISSSTE y otras instituciones públicas de salud, simulando competencia
mientras dividían el mercado. La multa final fue de 626 millones de MXN. Este es uno de los casos
de colusión en adquisiciones gubernamentales mejor documentados de México.

ENTIDADES DEL GRUPO (contratos gubernamentales totales):
• Vitalmex Internacional (VID=4325): 32.06B MXN, 1,052c, rs=0.962
• Centrum Promotora Internacional (VID=4715): 17.76B MXN, 631c, rs=0.946
• Hemoser S.A. de C.V. (VID=6038): 17.16B MXN, 396c, rs=0.990
• Selecciones Médicas del Centro (VID=31371): 16.27B MXN, 1,336c, rs=0.790
• Selecciones Médicas S.A. de C.V. (VID=4427): 14.55B MXN, 2,114c, rs=0.985
• Vitalmex Comercial (VID=35633): 1.85B MXN
• Grupo Vitalmex (VID=28769): 1.81B MXN

PATRÓN DE RIESGO
Todas las entidades del grupo muestran scores de riesgo en rango alto-crítico (0.79–0.99).
El mecanismo del cartel: cada entidad presenta ofertas coordinadas en los mismos procedimientos,
con una gana y las otras pierden de manera rotativa o por segmento de producto (diálisis,
instrumental quirúrgico, equipo hospitalario, etc.). Esta simulación de competencia permitió
que el grupo mantuviera precios artificialmente elevados durante más de una década.

PRINCIPALES COMPRADORES: IMSS (dominante), ISSSTE, SSA, SEDENA.
PRODUCTOS: equipo de diálisis, consumibles de hemodiálisis, instrumental quirúrgico, camas hospitalarias.

ACCIONES RECOMENDADAS
1. Cruzar con auditorías ASF 2014-2020 para cuantificar sobreprecio efectivo.
2. Verificar si persisten contratos activos (2024-2025) pese a sanción COFECE.
3. Investigar si hay entidades del grupo no identificadas en COMPRANET.
4. Evaluar recuperación de daños vía proceso penal (FGR) por daño al erario.
"""),

    # ── CENTRUM PROMOTORA ────────────────────────────────────────────────────
    (4715, 'confirmed_corrupt', """
MEMO — CENTRUM PROMOTORA INTERNACIONAL S.A. DE C.V. | Cartel Vitalmex COFECE
Fecha: 2026-03-08

Centrum Promotora Internacional S.A. de C.V. (VID=4715) es la segunda entidad más grande del
Grupo Vitalmex en contratos gubernamentales: 17.76B MXN en 631 contratos, 42%AD, rs=0.946.

Como parte del cartel documentado por COFECE (IO-007-2014, multa 626M MXN), Centrum operaba
como brazo separado para distribuir contratos de equipo médico al IMSS e ISSSTE, presentando
ofertas coordinadas con Vitalmex Internacional, Hemoser y Selecciones Médicas. La separación
corporativa entre entidades del mismo grupo permite simular competencia en licitaciones donde
la ley exige mínimo 3 oferentes.

Score de riesgo rs=0.946 refleja alta concentración de contratos con las mismas instituciones
que el resto del grupo y patrones de asignación anómalos. Sin RFC en COMPRANET (estructura A/B).
"""),

    # ── HEMOSER ─────────────────────────────────────────────────────────────
    (6038, 'confirmed_corrupt', """
MEMO — HEMOSER S.A. DE C.V. | Cartel Vitalmex COFECE
Fecha: 2026-03-08

Hemoser S.A. de C.V. (VID=6038) — 17.16B MXN, 396 contratos, 42%AD, rs=0.990.
Tercer componente del cartel Vitalmex (COFECE IO-007-2014). Especializado en hemodiálisis
y productos para tratamiento renal. Comparte con Vitalmex Internacional el patrón de
distribución de contratos del IMSS para equipos de diálisis. Score rs=0.990 (máximo práctico).

México tiene una de las tasas más altas de enfermedad renal crónica del mundo, haciendo del
equipo de diálisis un mercado cautivo de alto valor. El cartel explotó esta dependencia
institucional para mantener precios artificialmente elevados durante 10+ años.
"""),

    # ── SELECCIONES MEDICAS DEL CENTRO ──────────────────────────────────────
    (31371, 'confirmed_corrupt', """
MEMO — SELECCIONES MÉDICAS DEL CENTRO S.A. DE C.V. | Cartel Vitalmex COFECE
Fecha: 2026-03-08

Selecciones Médicas del Centro S.A. de C.V. (VID=31371) — 16.27B MXN, 1,336 contratos, 59%AD, rs=0.790.
Cuarto nodo del cartel Vitalmex (COFECE IO-007-2014). El 59% de adjudicación directa (superior al
promedio del grupo) sugiere que esta entidad era utilizada preferentemente para contratos donde
se podía evitar cualquier proceso competitivo. Rs=0.790 es el más bajo del grupo pero aún en
rango alto — refleja mayor uso de AD vs. licitación simulada de las otras entidades.

Patrón: Selecciones del Centro cubría regiones o productos donde Vitalmex Internacional
tenía restricciones de capacidad declarada, permitiendo al grupo maximizar cobertura total.
"""),

    # ── SELECCIONES MEDICAS ─────────────────────────────────────────────────
    (4427, 'confirmed_corrupt', """
MEMO — SELECCIONES MÉDICAS S.A. DE C.V. | Cartel Vitalmex COFECE
Fecha: 2026-03-08

Selecciones Médicas S.A. de C.V. (VID=4427) — 14.55B MXN, 2,114 contratos, 16%AD, rs=0.985.
Quinta entidad del cartel Vitalmex (COFECE IO-007-2014). El 16%AD (más bajo del grupo) indica
que esta entidad participaba principalmente en licitaciones públicas — pero coordinadas con el
resto del grupo para garantizar la distribución de contratos. Rs=0.985 confirma concentración
anómala de contratos con IMSS/ISSSTE a pesar de la aparente competitividad del proceso.

2,114 contratos es el volumen más alto del grupo, sugiriendo que Selecciones Médicas actuaba
como la "cara competitiva" del cartel — ganando licitaciones con precios coordinados que
eliminaban la competencia externa mientras distribuían internamente.
"""),

    # ── GAMS SOLUTIONS ───────────────────────────────────────────────────────
    (235708, 'confirmed_corrupt', """
MEMO DE INVESTIGACIÓN — GAMS SOLUTIONS SA DE CV
Fecha: 2026-03-08 | Caso: GAMS_SOLUTIONS_IMSS_DA_6280M

RESUMEN EJECUTIVO
GAMS Solutions SA de CV (RFC: GSO151013EH6, VID=235708) recibió 8.21B MXN en 2,665 contratos
al 88%AD del IMSS e INSABI. Contrato más crítico: adjudicación directa del IMSS por 6,283M MXN
en 2021 (código "D1P1619") — uno de los mayores contratos farmacéuticos de AD en la base de datos.
Score de riesgo: rs=0.994 (prácticamente máximo). Score del contrato principal: rs=1.000.

CONTRATO CRÍTICO: 6.28B MXN DA AL IMSS 2021
Un único contrato de adjudicación directa por 6,283M MXN del IMSS a GAMS Solutions en 2021,
identificado solo como "D1P1619" sin descripción clara del objeto, es una señal de alerta extrema:
• 6.28B es 76.5% del total recibido por GAMS en toda su historia contractual
• Sin proceso competitivo para una compra de esta magnitud
• Título opaco (código interno) sin especificación pública del objeto del contrato
• Empresa constituida en 2015 (apenas 6 años antes del megacontrato)
• 88% del total bajo AD vs. solo 12% bajo licitación

PATRÓN DE CRECIMIENTO ANÓMALO
GAMS Solutions pasó de ser un proveedor nuevo (RFC 2015) a recibir un contrato de 6.28B MXN
del IMSS en solo 6 años. Este patrón de crecimiento acelerado sin historial previo significativo
es consistente con "captura" de una institución compradora (IMSS) por un proveedor favorecido.

ACCIONES RECOMENDADAS
1. Solicitar mediante INAI expediente completo del contrato "D1P1619" incluyendo objeto, entregables y supervisión.
2. Cruzar RFC GSO151013EH6 contra SAT EFOS definitivo y lista SFP sancionados.
3. Verificar si GAMS Solutions tiene representantes legales o domicilio vinculado a funcionarios del IMSS.
4. Analizar si el patrón se repite en otros contratos DA del IMSS de similar magnitud.
"""),

    # ── AVIOR ────────────────────────────────────────────────────────────────
    (280146, 'confirmed_corrupt', """
MEMO DE INVESTIGACIÓN — ALMACENAJE Y DISTRIBUCIÓN AVIOR SA DE CV
Fecha: 2026-03-08 | Caso: AVIOR_BIRMEX_FUERZA_MAYOR_DA

RESUMEN EJECUTIVO
Almacenaje y Distribución AVIOR SA de CV (RFC: ADA000803GM5, VID=280146) acumuló 3.98B MXN
en 16 contratos, con rs=1.000 (score máximo). La ASF documentó 819.6M MXN en pagos de BIRMEX
a AVIOR sin documentación suficiente (Cuenta Pública 2023). Los dos contratos más grandes
(2.028B + 0.692B = 2.72B) provienen de BIRMEX bajo "adjudicación directa por caso fortuito
o fuerza mayor" en 2024.

CANAL BIRMEX Y EL MECANISMO "FUERZA MAYOR"
BIRMEX (Laboratorios de Biológicos y Reactivos de México) opera bajo la exención G2G que le
permite recibir contratos gubernamentales directamente. Luego BIRMEX sub-contrata a proveedores
privados como AVIOR usando justificaciones de "fuerza mayor" que evitan cualquier licitación.

Un contrato de almacenamiento/distribución de 2.72B MXN bajo "fuerza mayor" no tiene justificación
lógica en 2024 — la "fuerza mayor" implica un evento imprevisible e irresistible (pandemia, desastre
natural). Usar esta figura para contratos logísticos rutinarios de 2.72B constituye abuso del marco
legal de excepciones.

CONFIRMACIÓN ASF
La Auditoría Superior de la Federación específicamente documentó 819.6M MXN en pagos de BIRMEX
a AVIOR sin documentación justificatoria adecuada — es decir, sin evidencia de que los servicios
fueron efectivamente prestados o que el precio pagado fue razonable.

PATRÓN SISTEMÁTICO
AVIOR forma parte del sistema de opacidad BIRMEX (Caso 151): los recursos públicos fluyen a
BIRMEX bajo la exención G2G, y desde BIRMEX a proveedores privados sin escrutinio competitivo.

ACCIONES RECOMENDADAS
1. Auditar los contratos específicos ID=2877147 y ID=2877148 (2.72B BIRMEX 2024 "fuerza mayor").
2. Solicitar expedientes BIRMEX-AVIOR 2020-2024 incluyendo facturas y evidencia de servicios.
3. Verificar si el RFC ADA000803GM5 tiene vinculación con funcionarios de BIRMEX o SSA.
4. Escalar al Ministerio Público Federal por posible fraude en uso de "fuerza mayor".
"""),

    # ── FARMACEUTICOS MAYPO ──────────────────────────────────────────────────
    (2873, 'needs_review', """
MEMO DE INVESTIGACIÓN — FARMACÉUTICOS MAYPO S.A DE C.V.
Fecha: 2026-03-08 | Caso: FARMACEUTICOS_MAYPO_BIRMEX_ASF | Confianza: MEDIA

RESUMEN EJECUTIVO
Farmacéuticos MAYPO S.A. de C.V. (VID=2873, sin RFC en COMPRANET) recibió 87.97B MXN en
18,772 contratos al 82%AD, convirtiéndose en uno de los mayores distribuidores farmacéuticos
del sector público mexicano. La ASF documentó irregularidades específicas en el canal
BIRMEX→MAYPO por 152.5M MXN. Score de riesgo: rs=0.664.

ANÁLISIS DE ESCALA
88B MXN en 18,772 contratos durante 20+ años es un volumen enorme pero no imposible para un
distribuidor farmacéutico a escala nacional. Los contratos más grandes (1-2B MXN cada uno)
corresponden a suministro integral de medicamentos al IMSS o BIRMEX — consistente con el
tamaño del mercado farmacéutico del sector salud. SIN EMBARGO:
• 82%AD en un mercado tan grande requiere justificación robusta
• Los contratos bajo BIRMEX (canal G2G) carecen de proceso competitivo visible
• La ausencia de RFC en COMPRANET para 18,772 contratos impide trazabilidad RFC

HALLAZGOS ASF
Cuenta Pública 2022-2023: BIRMEX sub-contrató a MAYPO distribución farmacéutica por 152.5M MXN
documentados sin: (a) proceso competitivo, (b) evidencia de cotizaciones de mercado,
(c) verificación de precios contra referencia IMSS. Este monto específico es el documentado;
el alcance real del problema puede ser mayor dado el volumen total BIRMEX→MAYPO.

FACTORES ATENUANTES
• MAYPO tiene contratos LP (competitivos) de gran escala, como 2.077B MXN en 2019 por IMSS
• El patrón dual (LP competitivo + DA por BIRMEX) sugiere que parte de la relación es legítima
• Los precios en contratos LP fueron auditables por IMSS

VEREDICTO PROVISIONAL: REVISIÓN NECESARIA
Antes de clasificar como fraude: cruzar RFC (si obtenible) contra EFOS SAT, verificar precios
históricos pagados vs. precio de referencia IMSS, y auditar contratos BIRMEX→MAYPO 2015-2022.
"""),

    # ── KONKISTOLO (Bienestar shell) ─────────────────────────────────────────
    (297273, 'confirmed_corrupt', """
MEMO — KONKISTOLO SA DE CV | Red de Cascarones Alimentación Bienestar
Fecha: 2026-03-08 | Caso: ALIMENTACION_BIENESTAR_SHELL_NETWORK_2023

Konkistolo SA de CV (VID=297273, RFC=KON230118UV6, constituida enero 2023) recibió 243M MXN
en 93 contratos al 99%AD de ALIMENTACIÓN PARA EL BIENESTAR S.A. de C.V.

PATRÓN DE CASCARÓN: Empresa constituida en enero 2023, sin historial empresarial previo,
que en menos de 2 años acumuló 243M MXN en contratos exclusivamente con la entidad gubernamental
de distribución alimentaria del programa Bienestar. rs=0.000 — PUNTO CIEGO DEL MODELO: el modelo
no detecta cascarones de nueva creación con pocos contratos (sin señal de concentración de proveedor).

MCCI agosto 2025: Konkistolo identificada como parte de la red de distribuidores fantasma del
programa Alimentación para el Bienestar, sin capacidad operativa verificable para distribuir
alimentos a escala nacional. La entidad contratante (ALIMENTACIÓN PARA EL BIENESTAR S.A.) opera
como intermediario cuasi-gubernamental que evade la Ley de Adquisiciones.
"""),

    # ── FAMILYDUCK ───────────────────────────────────────────────────────────
    (293066, 'confirmed_corrupt', """
MEMO — COMERCIALIZADORA FAMILYDUCK SA DE CV | Red de Cascarones Alimentación Bienestar
Fecha: 2026-03-08 | Caso: ALIMENTACION_BIENESTAR_SHELL_NETWORK_2023

FamilyDuck SA de CV (VID=293066, RFC=CFA230107UC6, constituida enero 2023) — 885M MXN en
79 contratos al 100%AD de ALIMENTACIÓN PARA EL BIENESTAR. La entidad más grande de la red
de cascarones Bienestar, con nombre claramente inventado sin relación con el sector alimentario.

Con 885M MXN en menos de 2 años para una empresa sin historial, FamilyDuck es la mejor
evidencia del esquema: la entidad gubernamental Alimentación para el Bienestar distribuye
fondos del programa social a cascarones sin capacidad operativa verificable, a través de
adjudicaciones directas masivas. rs=0.000 — punto ciego del modelo (empresa de nueva creación).

MCCI agosto 2025 confirma el nexo con la red. Dado el tamaño (885M), FamilyDuck debería ser
el objetivo prioritario de verificación de entregables y existencia real de los servicios prestados.
"""),

    # ── PELMU ────────────────────────────────────────────────────────────────
    (279096, 'confirmed_corrupt', """
MEMO — GRUPO PELMU SA DE CV | Red de Cascarones Alimentación Bienestar/DICONSA
Fecha: 2026-03-08 | Caso: ALIMENTACION_BIENESTAR_SHELL_NETWORK_2023

Grupo Pelmu SA de CV (VID=279096, RFC=GPE050222296, constituida febrero 2022) — 513M MXN
total: 406M de ALIMENTACIÓN PARA EL BIENESTAR + 107M de DICONSA, en 217 contratos al 99%AD.

DOBLE CANAL: Pelmu es la única entidad de la red que también contrató con DICONSA (107M MXN),
sugiriendo que el esquema de distribución a cascarones se replica en la cadena DICONSA además
de Alimentación para el Bienestar. rs=0.000 — punto ciego del modelo para micro-AD de nueva
incorporación.

217 contratos (el mayor volumen de la red) distribuidos en múltiples adjudicaciones pequeñas
es consistente con fraccionamiento para evitar umbrales de control.
"""),

    # ── TODOLOGOS ────────────────────────────────────────────────────────────
    (288385, 'confirmed_corrupt', """
MEMO — TODOLOGOS.COM SA DE CV | Red de Cascarones Alimentación Bienestar/DICONSA
Fecha: 2026-03-08 | Caso: ALIMENTACION_BIENESTAR_SHELL_NETWORK_2023

Todólogos.com SA de CV (VID=288385, RFC=TOD220214AR9, constituida febrero 2022) — 164M MXN
en 75 contratos al 100%AD: 150M ALIMENTACIÓN PARA EL BIENESTAR + 14M DICONSA.

El nombre "Todólogos.com" (con dominio .com inexistente como empresa de distribución alimentaria)
es indicativo de empresa de papel creada sin intención real de operar en el sector. El sufijo
".com" sugiere constitución precipitada sin planificación de identidad corporativa.

rs=0.000 — punto ciego del modelo. La combinación nombre/antigüedad/exclusividad institucional/
100%AD es inequívocamente un cascarón del programa Bienestar. MCCI agosto 2025 confirmó.
"""),

    # ── POYAGO ───────────────────────────────────────────────────────────────
    (300207, 'confirmed_corrupt', """
MEMO DE INVESTIGACIÓN — POYAGO SA DE CV
Fecha: 2026-03-08 | Caso: POYAGO_IMSS_DIABETES_OVERPRICING_2024

RESUMEN EJECUTIVO
Poyago SA de CV (VID=300207, RFC=POY121128FY4) recibió 370M MXN en 28 contratos al 100%AD del IMSS.
MCCI (2024) documentó que el IMSS pagó a POYAGO precios con sobrecargo de 1,000%+ sobre el valor
de mercado en medicamentos para diabetes — insulinas y agentes hipoglucemiantes orales.
Score rs=0.157 — PUNTO CIEGO DEL MODELO para sobreprecios en proveedores pequeños-medianos.

HALLAZGO MCCI 2024: SOBREPRECIO 1000%+
La investigación de MCCI comparó los precios facturados por POYAGO al IMSS contra precios de
referencia del IMSS Cuadro Básico y de mercado genérico. El resultado documentado: facturas
entre 10x y 20x el precio referencial para los mismos principios activos y presentaciones.

MECANISMO DEL ESQUEMA:
1. POYAGO obtiene reconocimiento como "único proveedor" de ciertas presentaciones específicas
   (o alega exclusividad de distribución de una marca)
2. IMSS justifica la adjudicación directa por "no existir sustituto idóneo" o "continuidad operativa"
3. Sin licitación pública, POYAGO factura a precio 10-20x el mercado
4. Los 370M MXN en contratos representan ~330-360M en sobreprecio neto al erario

DIABETES EN MÉXICO: 14.1% prevalencia, mayor causa de fallecimientos. El IMSS atiende ~60% de
los diabéticos con cobertura de seguridad social — el mercado de medicamentos es enorme y cautivo.

PUNTO CIEGO DEL MODELO: rs=0.157 pese a evidencia clara. POYAGO tiene solo 28 contratos,
por lo que la señal vendor_concentration es mínima. Este caso ilustra que el modelo infravalora
esquemas de sobreprecio en proveedores de tamaño mediano con pocos contratos grandes.

ACCIONES RECOMENDADAS
1. Obtener expedientes de los 28 contratos para verificar justificación de AD y precios unitarios.
2. Comparar precios unitarios POYAGO vs. Cuadro Básico IMSS y INSABI de los mismos medicamentos.
3. Verificar si POYAGO tiene vinculación con funcionarios del área de compras del IMSS.
4. Solicitar al IMSS relación de contratos AD de diabetes 2020-2025 para identificar otros POYAGO.
"""),
]

# Insert memos
updated = 0
inserted = 0
for vendor_id, review_status, memo_text in memos:
    existing = conn.execute(
        'SELECT id FROM aria_queue WHERE vendor_id=?', (vendor_id,)
    ).fetchone()

    if existing:
        conn.execute('''UPDATE aria_queue SET
            memo_text=?, review_status=?, memo_generated_at=?, computed_at=?
            WHERE vendor_id=?''',
            (memo_text.strip(), review_status, now, now, vendor_id))
        updated += 1
    else:
        vs = conn.execute(
            'SELECT avg_risk_score, total_value_mxn, total_contracts, primary_sector_id FROM vendor_stats WHERE vendor_id=?',
            (vendor_id,)
        ).fetchone()
        rs = vs[0] if vs else 0.5
        tv = vs[1] if vs else 0
        tc = vs[2] if vs else 0
        sec = vs[3] if vs else 1

        vname = conn.execute('SELECT name FROM vendors WHERE id=?', (vendor_id,)).fetchone()
        vname = vname[0] if vname else str(vendor_id)
        tier = 'tier_1' if rs >= 0.50 else ('tier_2' if rs >= 0.30 else 'tier_3')
        conn.execute('''INSERT INTO aria_queue
            (vendor_id, vendor_name, avg_risk_score, total_value_mxn, total_contracts, primary_sector_id,
             ips_tier, review_status, memo_text, memo_generated_at, computed_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
            (vendor_id, vname, rs, tv, tc, sec, tier, review_status, memo_text.strip(), now, now))
        inserted += 1

conn.commit()

# Summary
total = conn.execute('SELECT COUNT(*) FROM aria_queue').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
needs_rev = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
gt_linked = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE vendor_id IN (SELECT DISTINCT vendor_id FROM ground_truth_vendors)").fetchone()[0]

print(f'Memos: {updated} updated + {inserted} inserted')
print(f'ARIA queue: {total} total | {gt_linked} GT-linked | {confirmed} confirmed_corrupt | {needs_rev} needs_review')
conn.close()
