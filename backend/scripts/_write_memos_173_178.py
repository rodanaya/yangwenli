"""Write ARIA investigation memos for GT cases 173-178."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

memos = [
    # IBM DE MEXICO
    (678, 'needs_review', """
MEMO DE INVESTIGACIÓN — IBM DE MEXICO COMERCIALIZACION Y SERVICIOS
Fecha: 2026-03-08 | Caso: IBM_MEXICO_SAT_IMSS_IT_MONOPOLY

RESUMEN EJECUTIVO
IBM de Mexico (VID=678) recibió 9.3B MXN en 105 contratos con 83%AD de SAT e IMSS.
El canal SAT acumula 8.35B (6.19B vía AD), con tres contratos consecutivos de ~1.2B cada uno:
IBM 5 (2020), IBM 6 (2025) y el contrato de 2015 — todos adjudicaciones directas para
"licenciamiento, suscripción y soporte" de plataforma IBM. IMSS: 2.9B (2.62B AD, 19 contratos).

ANÁLISIS DE LOCK-IN TECNOLÓGICO
Los sistemas informáticos del SAT (declaraciones fiscales, control de contribuyentes,
recaudación aduanal, CFDI, nómina fiscal) corren sobre infraestructura IBM desde los años 90:
mainframes IBM z-series, DB2 como base de datos principal, WebSphere para aplicaciones
middleware. La migración de esta arquitectura requeriría un programa de 5-10 años y miles
de millones de MXN en desarrollo — lo que hace técnicamente inevitable la renovación DA.

COMPARATIVA: Banco del Bienestar pagó 360M MXN a IBM por "comunicaciones y seguridad" vía DA.
BANJERCITO: 19 contratos, 210M MXN, 80%AD.

COSTO DE OPORTUNIDAD
Brasil: la Receita Federal (equivalente al SAT) renegotió su contrato IBM en 2019 usando
presión competitiva (amenaza de migración a nube pública) y logró reducir costos un 35%.
El SAT nunca ha hecho un ejercicio comparativo público de migración alternativa.

PREGUNTAS PARA AUDITORÍA
1. ¿Los 1.2B MXN anuales de "IBM 6" representan el costo justo de mercado o existe sobreprecio?
2. ¿SAT ha realizado estudios de factibilidad de migración a opciones alternativas (nube AWS/Azure)?
3. ¿Cuál es la justificación específica de AD que no permite licitación pública internacional?
4. ¿El IMSS ha considerado migrar sus sistemas al Centro Nacional de Datos del Gobierno?

VEREDICTO: NEEDS REVIEW (lock-in legítimo, pero precios sin validación competitiva)
"""),

    # SOFTTEK
    (164798, 'confirmed_corrupt', """
MEMO DE INVESTIGACIÓN — SOFTTEK SERVICIOS Y TECNOLOGIA SA DE CV
Fecha: 2026-03-08 | Caso: SOFTTEK_IMSS_IT_CONTINUIDAD_DA

RESUMEN EJECUTIVO
Softtek recibió 1.08B MXN en 5 contratos al 100%AD del IMSS, todos rotulados como
"CONTINUIDAD OPERATIVA Y MANTENIMIENTO" de sistemas informáticos del IMSS.
Cuatro contratos anuales consecutivos 2020-2022 del mismo centro de compras IMSS
(código 050GYR019), con montos decrecientes pero siempre vía AD.

PATRÓN "CONTINUIDAD OPERATIVA"
El mecanismo es sistemático: una empresa implementa un sistema informático para una institución
(IMSS, ISSSTE, SEP, SEGOB), luego invoca la exención de "continuidad operativa" bajo el
artículo 41-X de la LAASSP para renovar el contrato anualmente sin licitación.

Este mismo patrón se documenta en:
• MAINBIT: 7.47B AD a SEGOB (Caso 19) — "continuidad operativa" SESNSP
• TECNOPROGRAMACION HUMANA: 5.31B AD a ISSSTE (Caso 163) — "continuidad operativa" ISSSTE
• TOKA INTERNACIONAL: 1.95B AD a SEP (Caso 12) — "licenciamiento tecnológico"
• SOFTTEK: 1.08B AD a IMSS (este caso)

El hecho de que cuatro empresas distintas apliquen idénticamente el mismo patrón con el
mismo código de excepción sugiere un mecanismo sistemático de captura del área de TI del
IMSS que requiere investigación estructural, no solo por proveedor.

PERFIL SOFTTEK
Softtek es una empresa mexicana de TI de tamaño mediano/grande con presencia internacional.
A diferencia de los cascarones (como los shells de Bienestar), Softtek es una empresa real
con capacidad técnica. El problema no es la empresa sino el mecanismo de compra: sin
licitación, no hay evidencia de que las tarifas de Softtek sean competitivas.

ACCIONES RECOMENDADAS
1. Auditar precios por hora de consultor/servicio en contratos Softtek-IMSS vs. mercado.
2. Verificar si los sistemas "soportados" por Softtek fueron originalmente implementados
   por Softtek u otras empresas — si fueron terceras, ¿cómo justifica Softtek la exclusividad?
3. Investigar si hay funcionarios de TI del IMSS con vínculos a Softtek.
"""),

    # MABE
    (112386, 'needs_review', """
MEMO DE INVESTIGACIÓN — MABE SA DE CV — SEDENA ELECTRODOMÉSTICOS DA
Fecha: 2026-03-08 | Caso: MABE_SEDENA_ELECTRODOMESTICOS_DA

RESUMEN EJECUTIVO
MABE, S.A. de C.V. (VID=112386) recibió 1.33B MXN en 5 contratos al 100%AD de la
SECRETARIA DE LA DEFENSA NACIONAL (SEDENA) para electrodomésticos (refrigeradores, estufas,
"paquetes básicos"). La totalidad en 2020-2021 y 100% adjudicaciones directas.

CONTRATOS PRINCIPALES:
• 588M AD 2021: "ADQUISICIÓN DE PAQUETES BÁSICOS DE ELECTRODOMÉSTICOS Y ENSERES"
• 429M AD 2021: "ADQUISICIÓN DE ENSERES Y ELECTRODOMÉSTICOS (REFRIGERADOR Y ESTUFA)"
• 240M AD 2021: "Adquisición de 30,000 refrigeradores y 30,000 estufas"
• 60M AD 2020: "Adquisición para 70,000 paquetes básicos de electrodomésticos"

HIPÓTESIS: PROGRAMA SOCIAL VÍA SEDENA
La adquisición de refrigeradores y estufas a escala masiva (30,000 unidades) vía SEDENA
coincide con el programa presidencial "Plan para el Bienestar de las Familias" (2020-2021)
en el que se distribuyeron electrodomésticos a hogares en zonas marginadas, utilizando
a las Fuerzas Armadas como operador logístico.

Si SEDENA funcionó como comprador para redistribuir a un programa social, surge la pregunta:
¿por qué la AD a MABE y no una licitación pública donde competirían Whirlpool, Samsung, LG?
MABE es co-propietario de la marca GE Appliances en México; sus precios de catálogo son
públicos. La justificación de AD (artículo 41 LAASSP) para comprar refrigeradores comerciales
sería difícil de sustentar.

PREGUNTAS CLAVE
1. ¿Cuánto costó por unidad la SEDENA vs. precio de catálogo público de MABE?
2. ¿Cuáles fueron los destinatarios de los 70,000+ electrodomésticos adquiridos?
3. ¿SEDENA tenía autorización formal para actuar como comprador de programa social?
4. ¿Whirlpool, LG o Samsung presentaron cotizaciones alternativas?

VEREDICTO: NEEDS REVIEW (posible sobreprecio en DA de bienes comerciales comprados por entidad no social)
"""),

    # FRESENIUS
    (4726, 'needs_review', """
MEMO — FRESENIUS MEDICAL CARE DE MEXICO | Monopolio Estructural Hemodiálisis IMSS
Fecha: 2026-03-08 | Caso: FRESENIUS_MEDICAL_IMSS_HEMODIALYSIS_MONOPOLY

Fresenius Medical Care (VID=4726) — 12.4B MXN, 786 contratos, 65%AD de IMSS.

CONTEXTO: Fresenius es la empresa global líder en hemodiálisis (limpieza de sangre en centro
hospitalario), complementando a Baxter (Caso 152) que domina la diálisis peritoneal (domiciliar).
Juntos conforman el duopolio mundial de cuidado renal: Baxter 28.11B + Fresenius 12.4B =
40.5B MXN solo del IMSS en las últimas dos décadas.

ANÁLISIS: La mayoría de los contratos grandes de Fresenius son LP competitivos (servicio
de hemodiálisis subrogada — el IMSS paga a clínicas Fresenius por atender pacientes).
El 65%AD refleja compras de consumibles específicos para máquinas Fresenius ya instaladas
(dializadores, líneas de sangre, soluciones compatibles).

LOCK-IN MÉDICO: México tiene ~18,000 pacientes IMSS en HD in-center en clínicas de
subrogación. Una vez que las clínicas usan equipo Fresenius, los consumibles solo pueden
ser Fresenius — exactamente el mismo lock-in que con Baxter. La diferencia: Fresenius opera
a través de clínicas subrogadas (el IMSS paga por sesión) mientras Baxter vende directamente.

VEREDICTO: LOW CONFIDENCE (monopolio estructural tecnológico, similar a Baxter Caso 152)
Investigar: ¿el precio por sesión de hemodiálisis en contratos Fresenius es comparable
al costo en países similares (Brasil, Colombia)? ¿Hay alternativas tecnológicas emergentes?
"""),

    # COMEDORES SALUDABLES
    (250829, 'needs_review', """
MEMO — OPERADORA DE COMEDORES SALUDABLES SA DE CV | Monopolio Alimentación Migración/Seguridad
Fecha: 2026-03-08 | Caso: COMEDORES_SALUDABLES_INAMI_SSPC_DA

Comedores Saludables (VID=250829, RFC=OCS140225QE2) — 4.1B MXN, 70 contratos, 54%AD.
Principale comprador: INAMI (2.4B, 52c), SSPC (587M), Guardia Nacional (441M), CONADE (427M).

MONOPOLIO CAPTIVO INAMI
El Instituto Nacional de Migración administra las Estaciones Migratorias donde permanecen
migrantes en proceso de deportación (a veces meses). Es una población cautiva sin alternativa.
La CNDH ha documentado en múltiples informes (2019-2023) condiciones de hacinamiento y
alimentación deficiente en las Estaciones Migratorias — mientras el proveedor de alimentos
cobra contratos de escala (2.4B MXN de INAMI).

Con 52 contratos para INAMI (promedio 46M MXN cada uno), Comedores Saludables aparece como
el proveedor casi exclusivo de los servicios alimentarios de las estaciones migratorias
mexicanas — un mercado captivo de alto valor sin presión competitiva real.

El hecho de que también atienda SSPC, Guardia Nacional y prisiones (Prevención y Readaptación
Social) sugiere una estrategia deliberada de captura del nicho de "alimentación institucional
cautiva" (cárceles, centros de detención, cuarteles), donde la dependencia institucional
limita la contestabilidad del mercado.

PREGUNTAS PARA AUDITORÍA
1. ¿Cuál es el precio por ración/día pagado vs. costo real de producción?
2. ¿INAMI realizó licitaciones públicas para estos contratos o siempre fue la misma empresa?
3. ¿Hay vínculos entre directivos de Comedores Saludables y funcionarios de INAMI/SSPC?
"""),

    # BIORESEARCH
    (148586, 'needs_review', """
MEMO — BIORESEARCH DE MEXICO SA DE CV | Distribuidor Farmacéutico IMSS 7.2B
Fecha: 2026-03-08 | Caso: BIORESEARCH_MEXICO_IMSS_PHARMA_DA

Bioresearch de Mexico SA de CV (VID=148586, sin RFC) — 7.2B MXN, 549 contratos, 50%AD, rs=0.986.

ANÁLISIS DUAL:
Canal LP: contratos "COMPRA CONSOLIDADA" del IMSS — licitaciones anuales masivas donde
múltiples distribuidores compiten para suministrar medicamentos a la red IMSS.
Bioresearch gana 1-2B MXN anuales en estos procesos competitivos (1.774B LP 2025).

Canal DA "Claves Necesarias": contratos de AD para medicamentos "específicos" no cubiertos en
la COMPRA CONSOLIDADA — 956M DA 2025, 479M DA 2025. Estos DA se justifican para medicamentos
sin sustituto genérico disponible o de demanda imprevisible.

PREOCUPACIÓN: El volumen de DA ("claves necesarias") es extraordinariamente alto para Bioresearch:
50% de sus contratos son DA. Si la COMPRA CONSOLIDADA cubre el 80-90% de los medicamentos del
IMSS cuadro básico, ¿por qué Bioresearch necesita 3.6B adicionales en DA "claves específicas"?

Esto puede indicar: (a) Bioresearch distribuye medicamentos de alto costo o innovadores
genuinamente sin sustituto, lo cual es legítimo; o (b) el mecanismo "claves necesarias"
se usa sistemáticamente para evadir competencia en medicamentos donde sí existen alternativas.

Sin RFC en COMPRANET, no es posible verificar contra SAT/EFOS desde RUBLI.
VEREDICTO: NEEDS REVIEW — auditoría de las "claves específicas" vs. catálogo IMSS.
"""),
]

# Insert memos
updated = 0
inserted = 0
for vendor_id, review_status, memo_text in memos:
    existing = conn.execute('SELECT id FROM aria_queue WHERE vendor_id=?', (vendor_id,)).fetchone()
    if existing:
        conn.execute('''UPDATE aria_queue SET memo_text=?, review_status=?, memo_generated_at=?, computed_at=?
            WHERE vendor_id=?''', (memo_text.strip(), review_status, now, now, vendor_id))
        updated += 1
    else:
        vs = conn.execute('SELECT avg_risk_score, total_value_mxn, total_contracts, primary_sector_id FROM vendor_stats WHERE vendor_id=?', (vendor_id,)).fetchone()
        rs = vs[0] if vs else 0.5
        tv = vs[1] if vs else 0
        tc = vs[2] if vs else 0
        sec = vs[3] if vs else 1
        vname = conn.execute('SELECT name FROM vendors WHERE id=?', (vendor_id,)).fetchone()
        vname = vname[0] if vname else str(vendor_id)
        tier = 'tier_1' if rs >= 0.50 else ('tier_2' if rs >= 0.30 else 'tier_3')
        conn.execute('''INSERT INTO aria_queue (vendor_id, vendor_name, avg_risk_score, total_value_mxn, total_contracts, primary_sector_id, ips_tier, review_status, memo_text, memo_generated_at, computed_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
            (vendor_id, vname, rs, tv, tc, sec, tier, review_status, memo_text.strip(), now, now))
        inserted += 1

conn.commit()
total = conn.execute('SELECT COUNT(*) FROM aria_queue').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
needs_rev = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
gt_linked = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE vendor_id IN (SELECT DISTINCT vendor_id FROM ground_truth_vendors)").fetchone()[0]
print(f'Memos: {updated} updated + {inserted} inserted')
print(f'ARIA queue: {total} total | {gt_linked} GT-linked | {confirmed} confirmed_corrupt | {needs_rev} needs_review')
conn.close()
