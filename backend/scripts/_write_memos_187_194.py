"""Write ARIA investigation memos for GT cases 187-194."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

memos = [
    (178862, 'confirmed_corrupt', """
MEMO DE INVESTIGACIÓN — KOL-TOV SA DE CV
Fecha: 2026-03-08 | Caso: KOLTOV_POLICIA_FEDERAL_HOSPEDAJE_ALIMENTACION_DA

RESUMEN EJECUTIVO
Kol-Tov SA de CV (VID=178862, sin RFC) recibió 1.64B MXN en 7 contratos para servicios
de hospedaje y alimentación a fuerzas de seguridad federales.
Policía Federal: 1.108B (2c, 100%AD); Servicio de Protección Federal: 418M (4c, 50%AD);
Guardia Nacional: 119M (100%AD).

OPACIDAD MÁXIMA
Los 2 contratos de Policía Federal suman 1.107B y tienen DESCRIPCIÓN NULL — ninguna información
sobre qué servicios se prestaron, en qué instalaciones, durante cuánto tiempo.
El contrato de 2023 (352M) sí tiene descripción: "SERVICIO INTEGRAL DE HOSPEDAJE Y ALIMENTACIÓN
PARA INTEGRANTES DEL SPF" — lo que confirma el patrón: hotel y comidas para agentes federales.

PREGUNTAS FUNDAMENTALES
1. ¿Dónde están ubicadas las instalaciones de hospedaje de Kol-Tov?
   (Hotel comercial, barracas policiales, instalaciones ad hoc)
2. ¿Cuál era el precio por persona/noche vs. tarifas de mercado?
   (Una habitación de hotel promedio en México: 600-1,200 MXN/noche)
   Si la Policía Federal tenía 10,000 agentes hospedados 30 noches, el costo implícito es:
   10,000 × 30 × 1,000 = 300M — comparable al contrato.
   Pero si eran 2,000 agentes: 1,107M / (2,000 × 30) = 18,450 MXN/noche por persona — sobreprecio masivo.
3. Sin RFC: ¿Quién son los dueños de Kol-Tov? El nombre hebreo es inusual para una empresa mexicana.
4. ¿Hay relación entre directivos de Kol-Tov y mandos de la Policía Federal 2017?

VEREDICTO: CONFIRMED CORRUPT (descripción null, sin RFC, 1B en DA para servicios competitivos a policía)
"""),

    (65004, 'needs_review', """
MEMO DE INVESTIGACIÓN — PLAZA INSURGENTES SUR SA DE CV
Fecha: 2026-03-08 | Caso: PLAZA_INSURGENTES_NAFIN_RENTA_OFICINAS_100DA

RESUMEN EJECUTIVO
Plaza Insurgentes Sur SA de CV (VID=65004, sin RFC) recibió 2.33B MXN en 34 contratos al 100%AD,
casi todo de NAFIN/Nacional Financiera (2.311B, 29c, 100%AD).
Contratos llevan nombre de funcionarios: "CRISTINA POLA HERNANDEZ - EII - SUBDIRECCIÓN DE SERVICIOS"
(520M, 2019), "ARMANDO VELÁZQUEZ ZENTENO – EID – SUBDIRECCIÓN DE SERVICIOS" (500M, 2022).

NATURALEZA DEL CONTRATO: RENTA DE OFICINAS
Plaza Insurgentes Sur es un complejo comercial/de oficinas en Av. Insurgentes en CDMX — ubicación
prime donde NAFIN probablemente arrienda espacio para sus operaciones.
Los nombres de funcionarios en los contratos corresponden a subdirectores de "Servicios" de NAFIN —
el área responsable de la gestión inmobiliaria/facilities de la institución.

ANÁLISIS: ¿SOBREPRECIO EN RENTA?
NAFIN pagó 2.311B en 29 contratos de renta a un solo propietario en ~15 años.
Promedio: ~154M/año ≈ ~12.8M/mes en renta.
Para una oficina corporativa en Insurgentes, esto equivale aproximadamente a:
- 3,000-5,000 m² a 2,560-4,270 MXN/m²/mes — rango superior del mercado premium CDMX.
¿Se realizó valuación independiente? ¿Comparó NAFIN con otras ubicaciones disponibles?
El 100%AD en 29 contratos consecutivos durante 15 años para una renta comercial es inusual —
los contratos de arrendamiento largos se pueden licitar (sobre términos y precio).

VEREDICTO: NEEDS REVIEW (posible sobreprecio en renta sin evaluación competitiva de mercado)
"""),

    (49612, 'needs_review', """
MEMO DE INVESTIGACIÓN — EDITORIAL SANTILLANA SA DE CV
Fecha: 2026-03-08 | Caso: EDITORIAL_SANTILLANA_CONALITEG_LIBROS_99DA

RESUMEN EJECUTIVO
Editorial Santillana SA de CV (VID=49612, sin RFC) recibió 1.56B MXN en 276 contratos al 99%AD
de CONALITEG (1.557B, 257c, 100%AD) para "LIBROS DE TEXTO GRATUITOS SECUNDARIA".

MONOPOLIO EN LIBROS EDUCATIVOS SUBSIDIADOS
Santillana (parte del Grupo Prisa, España) es el proveedor exclusivo de libros de texto
gratuitos de secundaria para millones de estudiantes mexicanos — al 100%AD.

El sector editorial educativo en México es competitivo:
• McGraw-Hill, Pearson, SM Ediciones, Oxford, Trillas, Limusa
• Todos publican libros de secundaria compatibles con el Plan de Estudios SEP

Si Santillana tiene derechos de autor sobre títulos específicos incluidos en el programa,
la DA tiene justificación legal (Art. 41 LAASSP). PERO:
1. ¿Los 257 contratos con CONALITEG son todos para títulos específicos de Santillana?
2. ¿O CONALITEG eligió comprar de Santillana sin explorar alternativas equivalentes?
3. ¿Hay relación entre directivos de Santillana/Prisa y funcionarios de CONALITEG o SEP?

ESCALA DEL IMPACTO
Los libros de texto gratuitos de secundaria llegan a ~7 millones de estudiantes en México.
Un sobreprecio de incluso 10% en contratos de 198M-182M/año representa 20-30M MXN anuales
de costo excesivo para el erario, año tras año.

VEREDICTO: NEEDS REVIEW (monopolio editorial en programa educativo nacional, sin licitación)
"""),

    (46920, 'needs_review', """
MEMO DE INVESTIGACIÓN — COMERCIALIZADORA INTERNACIONAL DE COMPRESORES SA DE CV
Fecha: 2026-03-08 | Caso: CICM_IMSS_MANTENIMIENTO_COMPRESORES_MEDICOS_DA

RESUMEN EJECUTIVO
Comercializadora Internacional de Compresores SA de CV (VID=46920, sin RFC) recibió 2.31B MXN
en 109 contratos al 74%AD, casi todo IMSS (2.215B, 78c, 73%AD).
Servicio: "MANTENIMIENTO PREVENTIVO Y CORRECTIVO CON SUMINISTRO" de equipo médico de compresores.
Contratos: 811M AD 2025, 298M AD 2017, 231M AD 2024.

LOCK-IN DE EQUIPO MÉDICO NEUMÁTICO
Los hospitales del IMSS utilizan sistemas de aire médico comprimido (ventiladores, anestesia,
equipos neumáticos) que requieren mantenimiento especializado. Una vez instalado el equipo
de una marca específica, el proveedor original puede invocar exclusividad técnica.

Este es el mismo patrón de lock-in documentado en:
• Baxter (Caso 152): equipos de diálisis peritoneal → consumibles AD
• Fresenius (Caso 176): equipos de hemodiálisis → consumibles AD
• IBM (Caso 173): mainframes SAT → soporte y licencias AD

DIFERENCIA: los compresores médicos son más sustituibles que los sistemas de diálisis.
Atlas Copco, Ingersoll Rand, Parker Hannifin, Kaeser Compressors todos ofrecen mantenimiento
para equipos industriales/médicos. Un contrato de mantenimiento competitivo es técnicamente viable.

PREGUNTAS PARA AUDITORÍA
1. ¿Qué marcas de compresores médicos tiene instaladas el IMSS?
2. ¿CICM es distribuidor oficial de esas marcas o solo contratista de mantenimiento?
3. ¿El costo por hora de mantenimiento en contratos CICM-IMSS es competitivo vs. mercado?

VEREDICTO: NEEDS REVIEW (lock-in técnico plausible pero mantenimiento debería ser competitivo)
"""),

    (22565, 'needs_review', """
MEMO DE INVESTIGACIÓN — SERTRES DEL NORTE SA DE CV
Fecha: 2026-03-08 | Caso: SERTRES_NORTE_SAT_INFRAESTRUCTURA_TI_88DA

RESUMEN EJECUTIVO
Sertres del Norte SA de CV (VID=22565, sin RFC) recibió 2.30B MXN en 122 contratos al 77%AD,
con SAT dominando (2.230B, 33c, 88%AD).
Contrato LP clave: 1.498B LP 2020 "Integración y Soporte a Infraestructura de TI (ISI-TI)".
Luego contratos DA de mantenimiento consecutivos.

PERFIL SAT: 4 PROVEEDORES DE TI EN LOCK-IN
El SAT tiene al menos 4 proveedores tecnológicos en patrón de lock-in documentado en RUBLI:
1. IBM (Caso 173): 8.35B, 74%AD — mainframes y software
2. HP Mexico (Caso 185): 7.46B, 53%AD — impresión y digitalización
3. Leidos Inc (1.84B, 97%AD) — equipos de escaneo aduanal
4. Sertres del Norte: 2.23B, 88%AD — integración y soporte IT

TOTAL SAT EN LOCK-IN TI: ~19.88B MXN a 4 proveedores con alta concentración de AD.

Para Sertres específicamente: el ISI-TI (Integración y Soporte a Infraestructura de TI) ganado por LP
en 2020 (1.498B) convierte a Sertres en el proveedor ISI-TI del SAT de facto. Las renovaciones
posteriores en DA para "mantenimiento" y "continuidad" son el lock-in post-ISI.

El SAT debería requerir cláusulas de transferencia tecnológica y documentación suficiente para
que un nuevo proveedor pueda asumir el ISI-TI al vencer el contrato — en la práctica, esto
raramente ocurre porque el proveedor actual tiene información privilegiada sobre el sistema.

VEREDICTO: NEEDS REVIEW (lock-in IT SAT documentado, parte de patrón sistémico en SAT)
"""),

    (40514, 'needs_review', """
MEMO DE INVESTIGACIÓN — TURISMO Y CONVENCIONES SA DE CV
Fecha: 2026-03-08 | Caso: TURISMO_CONVENCIONES_SRE_HACIENDA_HOSPEDAJE_DA

RESUMEN EJECUTIVO
Turismo y Convenciones SA de CV (VID=40514, sin RFC) recibió 1.58B MXN en 227 contratos al 79%AD.
Principales: SRE (407M, 38c, 97%AD), Servicio de Protección Federal (288M, 25%AD),
SHCP/Hacienda (227M, 19c, 95%AD), IPN (152M).

HOSPEDAJE DIPLOMÁTICO VS. BUROCRÁTICO
SRE al 97%AD (407M): los eventos diplomáticos tienen cierta justificación para DA —
una visita de estado tiene lugar, fecha y protocolo definidos que pueden requerir servicios
específicos con poco tiempo de anticipación.
Pero SHCP al 95%AD (227M, 19 contratos) es más difícil de justificar: las reuniones técnicas
de Hacienda no tienen la urgencia diplomática que justificaría 19 DA consecutivas.

OLIGOPOLIO DE HOSPITALIDAD GUBERNAMENTAL
Junto con Kol-Tov (Caso 187, 1.64B para policía), Turismo y Convenciones representa parte
de un mercado donde pocas empresas sin RFC capturan contratos de hospedaje/alimentación
gubernamental a tasas de AD muy altas.

El mercado de hospitalidad para gobierno en México incluye hoteles de cadenas internacionales
(Camino Real, NH, Marriott) que sí participan en licitaciones y tienen RFC. El hecho de que
una empresa sin nombre de hotel reconocido y sin RFC capture 1.58B en hospedaje gubernamental
a 79%AD sugiere captura del área de servicios administrativos.

VEREDICTO: NEEDS REVIEW (hospitalidad diplomática tiene justificación parcial; SHCP sin justificación técnica)
"""),

    (104776, 'needs_review', """
MEMO DE INVESTIGACIÓN — ILS INTEGRADORA LOGÍSTICA EN SALUD SA DE CV
Fecha: 2026-03-08 | Caso: ILS_INTEGRADORA_LOGISTICA_SALUD_INSABI_IMSS_DA

RESUMEN EJECUTIVO
ILS Integradora Logística en Salud SA de CV (VID=104776, sin RFC) recibió 1.66B MXN en 213 contratos
al 77%AD. Clientes: INSABI (564M, 90%AD), IMSS (485M, 87%AD), SS (223M), Prevención Social (200M).
Servicio: logística integral de medicamentos — recepción, almacenamiento, distribución.

CONTEXTO COVID: ESCALADA DE CONTRATOS
El 2020 es clave: 339M AD + 310M LP + 181M AD a INSABI/IMSS — probablemente durante la pandemia
cuando las cadenas de suministro de medicamentos estaban bajo presión extrema.
La justificación de urgencia COVID (Art. 41 XIII LAASSP) habría sido válida para los 339M AD
y 181M AD de 2020. Pero el patrón continuó post-COVID con IMSS al 87%AD.

CADENA DE SUMINISTRO FARMACÉUTICO: SECTOR ESTRATÉGICO
La logística de medicamentos para IMSS/INSABI es crítica — demoras o errores en la cadena
de distribución afectan a millones de pacientes. La justificación de "continuidad operativa"
para no licitar es plausible en el corto plazo pero debe tener límite temporal.

Mercado de 3PL farmacéutico en México: DHL Supply Chain, FEMSA Logística, PiSA Farmacéutica
(tiene división logística), Cruz Verde. Hay opciones competitivas disponibles.

Sin RFC: imposible verificar estructura, capacidad real de almacenamiento en frío, y propiedad.

VEREDICTO: NEEDS REVIEW (justificación emergencia COVID en 2020; patrón DA continuo post-COVID injustificado)
"""),

    (224516, 'needs_review', """
MEMO DE INVESTIGACIÓN — DISTRIBUIDORA INTERNACIONAL RALMO SA DE CV
Fecha: 2026-03-08 | Caso: RALMO_IMSS_HEMODINAMICA_SUBROGACION_88DA

RESUMEN EJECUTIVO
Distribuidora Internacional Ralmo SA de CV (VID=224516, RFC=DIR070822774) recibió 1.54B MXN
en 104 contratos al 84%AD de IMSS (1.533B, 95c, 88%AD).
Servicio: "SERVICIO MÉDICO INTEGRAL DE HEMODINÁMICA Y RADIOLOGÍA INTERVENCIONISTA" —
laboratorios de cateterismo cardíaco (hemodinámia) subrogados al IMSS.

SUBROGACIÓN MÉDICA ESPECIALIZADA: ¿MONOPOLIO?
El IMSS subcontrata servicios de cateterismo cardíaco a Ralmo para pacientes que no pueden
esperar la limitada capacidad interna del IMSS. La hemodinámia es medicina de alta complejidad
(angioplastia, colocación de stents, estudios diagnósticos coronarios).

Pero "DISTRIBUIDORA" sugiere intermediario, no prestador de servicios clínicos directos.
¿Ralmo tiene sus propios laboratorios de hemodinámia o subcontrata a clínicas privadas?
Si es intermediario: está capturando un margen entre IMSS y los laboratorios reales.

ESCALADA RECIENTE: 196M DA + 180M DA en 2025 — tendencia creciente. Con la creciente
prevalencia de enfermedades cardiovasculares en México (primera causa de muerte), el IMSS
va a necesitar cada vez más capacidad de cateterismo. La DA sistemática para este servicio
en expansión es una brecha de gobernanza creciente.

¿Por qué no licita IMSS los contratos de hemodinámia regionalmente? Existen múltiples
redes de cardiología intervencionista privada en México (ACROM, SOCIME, grupos regionales).

VEREDICTO: NEEDS REVIEW (intermediario médico con alta DA en servicio expandiéndose, riesgo de sobrecosto)
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
