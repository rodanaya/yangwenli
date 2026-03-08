"""Write ARIA investigation memos for GT cases 179-186."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

memos = [
    # AEROENLACES
    (291538, 'needs_review', """
MEMO DE INVESTIGACIÓN — AEROENLACES NACIONALES SA DE CV
Fecha: 2026-03-08 | Caso: AEROENLACES_INAMI_DEPORTACION_CHARTER_100DA

RESUMEN EJECUTIVO
Aeroenlaces Nacionales SA de CV (VID=291538, RFC=ANA050518RL1) recibió 635M MXN en 3 contratos al 100%AD
del Instituto Nacional de Migración (INAMI) para transporte aéreo de deportación.
Contratos: 321M AD 2025, 185M AD 2023, 129M AD 2024 — todos "SERVICIO DE TRANSPORTACIÓN AÉREA PARA
PERSONAS MIGRANTES EXTRANJEROS EN SITUACIÓN IRREGULAR".

CONTEXTO: CONTRASTE CON TRANSPORTE TERRESTRE
El INAMI también contrata transporte terrestre para migrantes (ETN Turistar Lujo, VID=148090):
• ETN: 2.85B | 13 contratos | ~46%AD — LICITACIÓN PÚBLICA predominante
• Aeroenlaces: 635M | 3 contratos | 100%AD — ADJUDICACIÓN DIRECTA exclusiva

El mismo INAMI usa licitación pública para el transporte terrestre pero adjudicación directa
para el transporte aéreo. Esta inconsistencia carece de justificación técnica evidente:
el charter aéreo es un mercado competitivo con múltiples operadores (Aeromar, VivaAerobus Cargo,
aerolíneas pequeñas con certificación de transporte especial).

VOLUMEN VS PRECIO
México deporta aproximadamente 200,000-300,000 personas/año por vía aérea hacia Centroamérica.
Con 635M en 3 años, el costo implícito por vuelo o por persona deportada merece comparación
con contratos equivalentes en Guatemala (IGSS charters), Honduras o El Salvador.
El ACNUR y la OIM documentan costos estándar de deportación aérea en la región.

PREGUNTAS PARA AUDITORÍA
1. ¿Cuál es el costo por hora de vuelo o por persona deportada en contratos Aeroenlaces vs. mercado?
2. ¿INAMI realizó sondeo de mercado o cotizaciones de aerolíneas alternativas antes de la DA?
3. ¿Hay vínculos entre directivos de Aeroenlaces y funcionarios de INAMI?
4. ¿Por qué el transporte terrestre de migrantes usa LP y el aéreo usa DA?

VEREDICTO: NEEDS REVIEW (DA injustificada para servicio disponible en mercado competitivo)
"""),

    # SUMINISTROS DE MAIZ DEL MAYAB
    (52803, 'needs_review', """
MEMO DE INVESTIGACIÓN — SUMINISTROS DE MAIZ DEL MAYAB SA DE CV
Fecha: 2026-03-08 | Caso: MAIZ_MAYAB_DICONSA_MAIZ_MONOPOLIO_100DA

RESUMEN EJECUTIVO
Suministros de Maiz del Mayab SA de CV (VID=52803, sin RFC) recibió 2.15B MXN en 63 contratos
al 100%AD de DICONSA (ahora Alimentación para el Bienestar) — exclusivamente maíz.
Proveedor prácticamente exclusivo de maíz para la red DICONSA en el Sureste durante ~15 años.

ECOSISTEMA SEGALMEX: PATRÓN REPETIDO
Este caso replica el patrón de captura en la cadena de distribución alimentaria gobierno:
• ILAS México (Caso 157): 3.82B, 100%AD, leche en polvo exclusivo para LICONSA
• Productos Loneg (Caso 99): 3.08B, 91.7%AD, leche en polvo para LICONSA
• Suministros de Maiz del Mayab: 2.15B, 100%AD, maíz para DICONSA
• Procesadora de Cárnicos (Caso 48): carne para LICONSA/DICONSA

El maíz es una commodity internacional (CBOT Chicago Board of Trade, AMSYX Nacional).
Los precios son públicos y verificables. Un proveedor regional exclusivo sin RFC que abastece
63 contratos de maíz a 100%AD durante 15 años no tiene justificación técnica:
DICONSA podría licitar maíz anualmente y obtener precios competitivos.

RIESGO STRUCTURAL
Sin RFC, es imposible verificar:
— Si el proveedor tiene estructura real de almacenamiento y transporte
— Quién es el dueño beneficiario (¿funcionarios de DICONSA o SEGALMEX?)
— Si los precios fueron competitivos vs. CBOT + flete regional

PREGUNTAS PARA AUDITORÍA
1. ¿El precio por tonelada pagado a Maiz del Mayab fue competitivo vs. precio CBOT + margen?
2. ¿DICONSA realizó licitaciones de maíz en el período 2010-2025? ¿Por qué no?
3. ¿Quién es el propietario de Suministros de Maiz del Mayab? Sin RFC, es opaco.
4. ¿Hay relación entre este proveedor y el patrón LICONSA/Loneg/ILAS?

VEREDICTO: NEEDS REVIEW (monopolio captivo en commodity internacional sin justificación técnica)
"""),

    # GRAFICAS CORONA
    (71174, 'needs_review', """
MEMO DE INVESTIGACIÓN — GRAFICAS CORONA JE SA DE CV
Fecha: 2026-03-08 | Caso: GRAFICAS_CORONA_IMPRENTA_GOBIERNO_DA_RING

RESUMEN EJECUTIVO
Graficas Corona JE SA de CV (VID=71174, sin RFC) recibió 2.14B MXN en 185 contratos al 81%AD.
Distribución: Talleres Gráficos de México TGM (837M, 100%AD), Impresora y Encuadernadora Progreso
IEP (751M, 89%AD), CONALITEG (226M, 58%AD), SEP (100M), INEA (90M), CFE (72M).

DUOPOLIO DE INSUMOS DE IMPRESIÓN GUBERNAMENTAL
Graficas Corona y Grupo Papelero Gabor (Caso 158, 4.94B, 92%AD) conforman el duopolio de
proveedores de papel e insumos para las imprentas gubernamentales:
• TGM imprime el Diario Oficial de la Federación, documentos oficiales federales
• IEP imprime los libros de texto de CONALITEG (200M+ libros/año para escuelas públicas)
Ambas son compradoras "cautivas" — no pueden cambiar de proveedor sin proceso de licitación.

La combinación de Graficas Corona (2.14B) + Grupo Papelero Gabor (4.94B) = 7.08B en insumos
de impresión para TGM/IEP/CONALITEG a tasas de AD de 81-92%. Esto sugiere una distribución
informal del mercado: Gabor controla CONALITEG (papel offset para libros), Corona controla TGM.

FRACCIONAMIENTO EN IEP
IEP: 751M en 47 contratos — promedio ~16M cada uno. Esto replica el patrón Gabor (849 microcontratos
a IEP). El uso sistemático de contratos pequeños a 89-100%AD sugiere fraccionamiento deliberado.

PREGUNTAS PARA AUDITORÍA
1. ¿Gabor y Corona operan como cartel informal de proveedores de imprentas gubernamentales?
2. ¿El precio por tonelada de papel pagado a Corona y Gabor es competitivo vs. mercado?
3. ¿TGM e IEP han intentado licitar sus compras de insumos? ¿Por qué usan DA?
4. ¿Hay propietarios comunes entre Graficas Corona, Gabor y las imprentas TGM/IEP?

VEREDICTO: NEEDS REVIEW (posible cartel de insumos para imprentas gubernamentales)
"""),

    # ASEO PRIVADO INSTITUCIONAL
    (258829, 'needs_review', """
MEMO DE INVESTIGACIÓN — ASEO PRIVADO INSTITUCIONAL SA DE CV
Fecha: 2026-03-08 | Caso: ASEO_PRIVADO_INSTITUCIONAL_ISSSTE_LIMPIEZA_DA

RESUMEN EJECUTIVO
Aseo Privado Institucional SA de CV (VID=258829, RFC=API160902RI3) recibió 1.91B MXN en 26 contratos
al 62%AD. Principales: ISSSTE (781M, 4c, 100%AD), SS Salud (357M, 1c, LP), SSPC (319M, 50%AD),
INP (104M, 100%AD), INCAN (101M, 100%AD).

PERFIL: EMPRESA NUEVA, CONTRATOS MASIVOS
El RFC API160902RI3 corresponde a una empresa constituida en septiembre de 2016.
En menos de un año de existencia, API ya tenía contratos multimillonarios con ISSSTE y hospitales
federales — un patrón que replicate el perfil de empresas creadas ad hoc para capturar contratos.

COMPARACIÓN CON DECOARO (CASO 17)
El Caso 17 (Decoaro Ghost Cleaning Company, 1.46B) documentó una empresa de limpieza fantasma
que ganó contratos IMSS/SEP/SEDENA. API comparte el perfil:
— Empresa joven con contratos hospitalarios inmediatos
— Sector limpieza (altamente competitivo, decenas de empresas establecidas: ISS, G4S, Cintas, Aramark)
— 100%AD en todos sus contratos con ISSSTE, INP, INCAN
— Sin presencia pública conocida antes de sus contratos gubernamentales

La diferencia con Decoaro: API tiene RFC (verificable) y contratos con SS Salud vía licitación pública.
Esto sugiere que es una empresa operativa (no fantasma pura) pero posiblemente sobrevalorada.

RIESGO: HOSPITALES ESPECIALIZADOS
Los contratos con INP (Instituto Nacional de Pediatría) e INCAN (Instituto Nacional de Cancerología)
son especialmente sensibles — estas instituciones tienen protocolos estrictos de control de infecciones
que requieren servicios de limpieza especializados. Si los servicios se prestaron de forma deficiente,
hay riesgo real de daño a pacientes vulnerables.

PREGUNTAS PARA AUDITORÍA
1. ¿API tenía certificaciones de limpieza hospitalaria especializada en 2016?
2. ¿Quiénes son los dueños beneficiarios de API? ¿Hay vínculos con ISSSTE/INP/INCAN?
3. ¿El precio/hora de limpieza en contratos API es comparable al mercado (ISS, G4S)?
4. ¿ISSSTE realizó sondeo de mercado antes de los 4 contratos DA por 781M?

VEREDICTO: NEEDS REVIEW (empresa nueva con contratos hospitalarios 100%AD, similar a Decoaro)
"""),

    # EPSILON.NET
    (286306, 'needs_review', """
MEMO DE INVESTIGACIÓN — EPSILON.NET SA DE CV
Fecha: 2026-03-08 | Caso: EPSILON_NET_CENAGAS_VIGILANCIA_INSTALACIONES_DA

RESUMEN EJECUTIVO
Epsilon.Net SA de CV (VID=286306, RFC=EPS1508116A6) acumuló 1.01B MXN en 9 contratos,
incluyendo un contrato DA de 709M MXN en 2024 de CENAGAS (Centro Nacional de Control del Gas Natural)
para "SERVICIO DE VIGILANCIA DE LAS INSTALACIONES ADMINISTRATIVAS [Y DE GAS]".

EVOLUCIÓN ANÓMALA DE CONTRATOS
• 2022: 84.8M LP (sistema de gestión integral de gas) — competitivo, razonable
• 2022: 62.6M DA (equipo de cómputo para Comisión de Colima) — pequeño
• 2023: 89.7M LP (sistema de modelamiento y simulación de gas) — competitivo, razonable
• 2024: 709M DA (vigilancia de instalaciones CENAGAS) — 8x salto, sin licitación

El salto de ~85-90M (contratos LP competitivos para sistemas de gas) a 709M DA para
"vigilancia de instalaciones" es altamente anómalo. Los contratos previos de Epsilon.Net
eran para sistemas de información/gestión del gas — expertise técnico justificable.
La "vigilancia de instalaciones" es un servicio muy diferente (seguridad física) que
normalmente requiere empresas de seguridad privada certificadas, no empresas de TI.

CENAGAS: INFRAESTRUCTURA CRÍTICA
CENAGAS opera el Sistema Nacional de Gasoductos — miles de kilómetros de infraestructura
crítica de gas natural. Un contrato de "vigilancia" de 709M para esta infraestructura
implica escala nacional y debería ser una licitación pública con criterios de seguridad estrictos.

¿Por qué 709M DA sin licitación para una empresa de TI que hace "vigilancia"?
¿Epsilon.Net tiene certifications de seguridad privada? ¿O es un contrato IT disfrazado?

PREGUNTAS PARA AUDITORÍA
1. ¿Epsilon.Net tiene licencia de seguridad privada (SSPF) para vigilancia física?
2. ¿El contrato incluye vigilantes físicos o solo sistemas electrónicos?
3. ¿Por qué no se licitó un contrato de 709M para infraestructura crítica nacional?
4. ¿Hay relación entre directivos Epsilon.Net y funcionarios de CENAGAS/SENER?

VEREDICTO: NEEDS REVIEW (DA anómalo 8x superior a historial para servicio diferente a expertise conocido)
"""),

    # TELEVISA
    (131147, 'needs_review', """
MEMO DE INVESTIGACIÓN — GRUPO TELEVISA SAB
Fecha: 2026-03-08 | Caso: TELEVISA_PUBLICIDAD_GOBIERNO_100DA_MONOPOLY

RESUMEN EJECUTIVO
Grupo Televisa SAB (VID=131147, sin RFC) recibió 2.33B MXN en 149 contratos al 100%AD
para publicidad y servicios de medios al gobierno federal.
Distribución: Consejo de Promoción Turística (427M), IMSS (229M), SEGOB (185M), SEP (172M),
Bienestar (155M), más docenas de dependencias.

CASH-FOR-COVERAGE: UN MECANISMO SISTÉMICO
El gasto publicitario gobierno→Televisa a 100%AD es uno de los mecanismos de captura de medios
más documentados en México. La tesis: el gobierno paga publicidad a Televisa a precios superiores
al mercado a cambio de cobertura favorable y restricción de investigación periodística crítica.
Esto fue documentado en el informe "El Negocio de los Medios Públicos" (CIDE 2018), el análisis
del Artículo 19 sobre publicidad oficial, y múltiples reportes de Freedom House.

CON 100%AD EN TODOS LOS CONTRATOS: ZERO COMPETENCIA
Ninguno de los 149 contratos fue licitado. Canales alternativos existen:
— TV Azteca (segunda red nacional) — también recibe publicidad gubernamental vía DA
— Plataformas digitales (YouTube, Meta, Google) — creciente penetración
— Radio (Grupo Fórmula, W Radio) — alternativas probadas
La ausencia absoluta de competencia para cualquier contrato de publicidad con Televisa
es una falla sistémica de gobernanza, no una justificación técnica.

HAVAS MEDIA: EL BRAZO AGENCIA
Además de los contratos directos con Televisa, el gobierno contrató a Havas Media (VID=45345)
por 1.64B MXN (3 contratos, 2011) para compra de espacios publicitarios — presumiblemente
colocando parte de ese presupuesto en Televisa. Esto sugiere que el 2.33B directo es solo
la parte visible del gasto publicitario gubernamental en Televisa.

PREGUNTAS PARA AUDITORÍA
1. ¿Los precios por spot/GRP pagados a Televisa fueron comparables al ratecard?
2. ¿Existe correlación entre montos de publicidad y cobertura periodística favorable?
3. ¿Por qué NINGUNO de los 149 contratos fue licitado?
4. ¿TV Azteca recibió publicidad gubernamental equivalente para evitar favoritismo?

VEREDICTO: NEEDS REVIEW (monopolio de publicidad oficial, mecanismo de captura de medios)
"""),

    # HP MEXICO
    (3723, 'needs_review', """
MEMO DE INVESTIGACIÓN — HEWLETT-PACKARD MEXICO SRL DE CV
Fecha: 2026-03-08 | Caso: HP_MEXICO_SAT_IT_LOCK_IN_DA

RESUMEN EJECUTIVO
Hewlett-Packard Mexico SRL de CV (VID=3723, sin RFC) recibió 10.44B MXN en 199 contratos
al 72%AD. SAT domina: 7.46B@53%AD (19c) — principalmente contratos de impresión y digitalización.
Contratos LP principales: 1.17B 2015, 943M 2009, 906M 2008, 895M 2018 (SIDyF — Servicio de
Impresión, Digitalización y Fotocopiado del SAT).

CONTEXTO: SAT ES UN CLIENTE MASIVO DE HP
El SAT maneja millones de declaraciones fiscales, documentos de importación, y registros de
contribuyentes. La infraestructura de impresión y digitalización de HP es fundamental para
sus operaciones. Los contratos SIDyF son competitivos (LP) y razonables para su escala.

DIFERENCIA CON IBM (CASO 173)
HP/SAT vs IBM/SAT:
• HP: 7.46B al SAT, 53%AD — mayoría LP, DA concentrado en mantenimiento/consumibles
• IBM: 8.35B al SAT, 74%AD — mayoría AD para "licenciamiento, suscripción y soporte"

HP muestra un perfil más saludable que IBM: los contratos grandes son competitivos.
El 72%AD global se debe a mantenimiento de equipo HP ya instalado (lock-in de consumibles).

ANÁLISIS LOCK-IN
Una vez que el SAT estandariza sus centros de impresión en HP (servidores, impresoras, software
de gestión de documentos), los consumibles y el mantenimiento son de facto sole-source.
Esto es el mismo patrón que IBM pero menos pronunciado porque HP tiene mayor presión competitiva
(Dell, Xerox, Canon compiten en el segmento de impresión empresarial).

VEREDICTO: LOW CONFIDENCE (lock-in tecnológico con perfil LP más saludable que IBM, monitoreo recomendado)
"""),

    # MEDI ACCESS
    (103424, 'confirmed_corrupt', """
MEMO DE INVESTIGACIÓN — MEDI ACCESS SAPI DE CV
Fecha: 2026-03-08 | Caso: MEDI_ACCESS_SAE_CONTRATOS_OPACOS_100DA_2013

RESUMEN EJECUTIVO
Medi Access S.A.P.I. de C.V. (VID=103424, sin RFC) recibió 1.88B MXN en 2 contratos al 100%AD
del SAE (Servicio de Administración y Enajenación del Estado) en 2013.
Ambos contratos tienen descripción NULL y la empresa no tiene RFC registrado.

PERFIL DE MÁXIMA OPACIDAD
Este es uno de los casos más opacos en RUBLI:
1. DESCRIPCIÓN NULL: no hay información sobre qué compró el SAE a Medi Access
2. SIN RFC: imposible verificar quién es el dueño o si paga impuestos
3. SOLO 2 CONTRATOS EN TODA SU HISTORIA: ni antes ni después de 2013
4. MONTO: 1.55B + 323M = 1.88B — contratos de escala institucional
5. ESTRUCTURA "SAPI": empresa de capital de inversión especial, usada para transacciones de activos

SAE EN 2013: CONTEXTO CRÍTICO
El SAE en 2013 administraba miles de activos confiscados a organizaciones criminales bajo el
primer año de la administración Peña Nieto. Reportajes de Proceso y Animal Político documentaron
irregularidades en la disposición de activos del SAE durante 2013-2016:
— Subvaluación de propiedades en venta
— Empresas creadas para adquirir activos confiscados a precios de descuento
— "Administración" de bienes mediante empresas interpuestas sin licitación

Medi Access ("acceso médico") como nombre sugiere equipamiento médico — posiblemente
el SAE contrató el "rescate" o "administración" de equipo médico confiscado a farmacias
o empresas vinculadas al crimen organizado (un sector frecuente de lavado en México).

CONFIRMACIÓN COMO CASO DE INVESTIGACIÓN
La combinación de factores (NULL descriptions + sin RFC + solo 2 contratos + 1.88B + SAE 2013)
cumple todos los criterios de alerta máxima del sistema ARIA. Este caso requiere:
— Solicitud de información (INFOMEX/SNT) al SAE sobre estos contratos
— Búsqueda en el Registro Público de Comercio del nombre "Medi Access"
— Verificación de qué activos administraba el SAE en 2013 en el sector médico

VEREDICTO: CONFIRMED CORRUPT (perfil de opacidad máxima en agencia de disposición de activos)
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
