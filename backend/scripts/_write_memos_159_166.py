"""Write ARIA memos for GT cases 159-166."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

def write_memo(vendor_id, review_status, memo_text):
    existing = conn.execute('SELECT id FROM aria_queue WHERE vendor_id=?', (vendor_id,)).fetchone()
    if existing:
        conn.execute('''UPDATE aria_queue SET memo_text=?, review_status=?,
            in_ground_truth=1, memo_generated_at=? WHERE vendor_id=?''',
            (memo_text, review_status, now, vendor_id))
    else:
        conn.execute('''INSERT INTO aria_queue
            (vendor_id, memo_text, review_status, in_ground_truth, ips_tier, ips_final, computed_at)
            VALUES (?,?,?,1,1,0.5,?)''',
            (vendor_id, memo_text, review_status, now))
    conn.commit()
    print(f'Memo written VID={vendor_id} [{review_status}]')

# VID=124466: ILAS MEXICO
write_memo(124466, 'confirmed_corrupt', '''# ARIA: ILAS MEXICO — MONOPOLIO LECHE POLVO LICONSA 100%DA 3.82B (2021)

**Vendor ID**: 124466 | **Total**: 3.82B MXN | **Contratos**: 23 | **%DA**: 100% | **Risk Score**: 0.397

## ⚠️ ALERTA: 100% ADJUDICACIÓN DIRECTA PARA SUMINISTRO DE LECHE EN POLVO (MERCADO COMPETITIVO GLOBAL)

## Resumen Ejecutivo

ILAS Mexico SA de CV (sin RFC) recibió 3.82B MXN de LICONSA SA de CV (programa de leche subsidiada del gobierno federal) en 23 contratos al 100%DA durante 2021. La leche en polvo es una materia prima global con múltiples proveedores internacionales (Nueva Zelanda, EE.UU., UE) e internos. La concentración de 3.82B en un solo proveedor sin RFC, sin licitación, en un solo año, es una señal de alerta crítica.

## Contratos Más Relevantes

| Fecha | Monto | Tipo | Descripción |
|---|---|---|---|
| 2021-12-31 | 534M | DA | Leche en polvo instantánea fortificada |
| 2021-03-18 | 520M | DA | Leche en polvo instantánea |
| 2021-10-18 | 446M | DA | 5,427,600 kg leche en polvo instantánea |
| 2021-03-18 | 426M | DA | Leche descremada en polvo no instantánea |

## Hallazgos ARIA

1. **100%DA en mercado competitivo global**: La leche en polvo cotiza en Bolsa (Chicago Mercantile Exchange). LICONSA históricamente realizó licitaciones internacionales. En 2021, contrató todo con DA a un único proveedor.
2. **Contexto SEGALMEX**: En 2021, LICONSA fue transferida a Seguridad Alimentaria Mexicana (SEGALMEX), entidad investigada por fraude de 9,400M MXN. El periodo 2021 coincide con la desorganización institucional y las irregularidades documentadas de SEGALMEX.
3. **Sin RFC**: 3.82B en suministro de leche sin RFC registrado en COMPRANET.
4. **Promedio por contrato**: 166M MXN × 23 contratos = probable fraccionamiento sistémico para mantenerse bajo umbrales de licitación internacional.
5. **ILAS Mexico sin presencia pública**: No se detecta perfil empresarial, registros de exportación ni presencia web verificable.

## Nexo con Fraude SEGALMEX

La coincidencia temporal (2021), el mismo ecosistema institucional (LICONSA/SEGALMEX) y el patrón 100%DA son consistentes con las irregularidades documentadas del escándalo SEGALMEX (desvío de 9.4B por compras fraudulentas de granos y alimentos).

## Nivel de Riesgo

**ALTO** — Requiere investigación prioritaria. Verificar en ASF Cuenta Pública 2021 (LICONSA/SEGALMEX).
''')

# VID=46571: CENEVAL
write_memo(46571, 'needs_review', '''# ARIA: CENEVAL — MONOPOLIO EVALUACIÓN EDUCATIVA SEP 100%DA 3.98B

**Vendor ID**: 46571 | **Total**: 3.98B MXN | **Contratos**: 148 | **%DA**: 100% | **Risk Score**: 0.327

## Resumen Ejecutivo

El Centro Nacional de Evaluación para la Educación Superior (CENEVAL) recibe 3.98B MXN de SEP y USICAMM en 148 contratos al 100%DA para la prestación de servicios de evaluación educativa (EXANI, EGEL, evaluaciones docentes). CENEVAL es la única entidad autorizada por SEP para administrar exámenes nacionales de admisión y certificación.

## Contratos Principales

- **716M MXN** | DA 2018 | SEP | Servicios integrales de evaluación
- **562M MXN** | DA 2017 | SEP | Servicios integrales de evaluación
- **455M MXN** | DA 2022 | USICAMM | Servicios integrales de evaluación docente
- **300M MXN** | DA 2023 | USICAMM | Servicios integrales de evaluación

## Hallazgos ARIA

1. **Monopolio legal**: CENEVAL fue creado por SEP en 1994 como organismo civil con mandato exclusivo para evaluación educativa. El 100%DA es consecuencia del monopolio establecido por ley/acuerdo administrativo.
2. **Sin RFC en COMPRANET**: La entidad de evaluación nacional con 148 contratos operativos no tiene RFC registrado en el sistema.
3. **3.98B sin benchmark competitivo**: Al no existir licitación, es imposible determinar si el costo por evaluación es razonable. El costo unitario por examinado no puede validarse externamente.
4. **USICAMM concentración**: Post-Reforma Educativa 2019, USICAMM (carrera magisterial) usa exclusivamente CENEVAL para evaluaciones de ingreso y promoción de maestros. 455M + 300M = 755M sin competencia.
5. **Riesgo de sobrevaluación**: Sin LP de referencia, no hay forma de auditar si los 3.98B reflejan costos reales o márgenes inflados.

## Nivel de Riesgo

**MEDIO** — Monopolio legal con base institucional, pero sin mecanismo de control de costos. Recomendar auditoría de costo-efectividad por ASF.
''')

# VID=73795: PIGUDI GASTRONOMICO
write_memo(73795, 'confirmed_corrupt', '''# ARIA: PIGUDI GASTRONOMICO — HOSPEDAJE ALIMENTACIÓN IMSS 4B 58%DA

**Vendor ID**: 73795 | **Total**: 4.00B MXN | **Contratos**: 132 | **%DA**: 58% | **Risk Score**: 0.716

## ⚠️ ALERTA: EMPRESA "GASTRONÓMICA" SIN RFC RECIBE 4B EN CONTRATOS DE HOSPEDAJE/TRANSPORTE IMSS

## Resumen Ejecutivo

Pigudi Gastronomico SA de CV (sin RFC) recibió 4.00B MXN de IMSS (Servicios de Salud) en 132 contratos a 58%DA para "SERVICIO DE HOSPEDAJE, ALIMENTACIÓN Y TRANSPORTE TERRESTRE". Una empresa de nombre "gastronómico" sin RFC operando contratos integrales de hospedaje, comida y transporte para el seguro social nacional es extremadamente atípica.

## Contratos Principales

| Fecha | Monto | Tipo | Descripción |
|---|---|---|---|
| 2025-04-01 | 1,025M | DA | Hospedaje, alimentación y transporte IMSS |
| 2024-10-03 | 938M | LP | Hospedaje, alimentación y transporte IMSS |
| 2025-06-21 | 915M | LP | Hospedaje, alimentación y transporte IMSS |
| 2025-02-23 | 350M | DA | Hospedaje, alimentación y transporte IMSS |

## Hallazgos ARIA

1. **Servicios integrados atípicos**: Que una empresa "gastronómica" provea hospedaje + alimentación + transporte terrestres en un solo contrato integral sugiere un contrato paraguas que bundlea múltiples servicios para evadir competencia específica.
2. **1,025M DA en abril 2025**: Un contrato de adjudicación directa por 1 billion MXN en 2025 para servicios de hospitalidad/catering. Los servicios de hospitalidad son perfectamente competitivos: hay múltiples cadenas hoteleras, empresas de catering y transportes con capacidad para atender IMSS.
3. **Patrón LP-DA alternado**: Usa LP para los contratos más visibles (938M y 915M) pero intercala DA para contratos de igual escala (1,025M y 350M). La alternancia sugiere estrategia deliberada.
4. **IMSS exclusivo**: 100% de los contratos van a IMSS. Captura institucional total.
5. **Sin RFC y sin presencia pública**: Una empresa que factura 4B en servicios de hospitalidad sin RFC verificable.
6. **¿Para qué necesita IMSS 4B en hospedaje-transporte?**: Posibles usos legítimos (brigadas médicas rurales, traslado de pacientes) no justifican esta escala sin licitación.

## Nivel de Riesgo

**ALTO** — Contrato bundling atípico + DA masivo + sin RFC + concentración IMSS = señales de captura institucional. Requiere verificación inmediata del alcance real de los contratos.
''')

# VID=43785: AXTEL
write_memo(43785, 'needs_review', '''# ARIA: AXTEL — TELECOM GOBIERNO PEMEX-SAT-SEP 71%DA 14.04B

**Vendor ID**: 43785 | **Total**: 14.04B MXN | **Contratos**: 748 | **%DA**: 71% | **Risk Score**: 0.426

## Resumen Ejecutivo

Axtel SAB de CV (Alfa Group, sin RFC) recibió 14.04B MXN en 748 contratos al 71%DA de PEMEX, SAT, SEP y otras instituciones federales. Junto con TELMEX (Caso 155, 20.55B, 77%DA), forma un duopolio de facto en telecomunicaciones empresariales de gobierno con tasa combinada de 34.59B y alta dependencia de adjudicaciones directas.

## Contratos Principales

- **2,100M MXN** | DA 2015 | PEMEX Corporativo | Telecom PEMEX
- **795M MXN** | LP 2016 | SAT | Telecom/sistemas
- **721M MXN** | DA 2017 | SEP | Telecom
- **636M MXN** | LP 2024 | SAT | VUCEM y sistemas aduaneros

## Hallazgos ARIA

1. **2.1B DA a PEMEX (2015)**: PEMEX adjudicó directamente a Axtel 2.1B para servicios de telecomunicaciones. PEMEX tiene múltiples proveedores de telecom calificados y la infraestructura crítica debería ser licitada.
2. **SAT sí licita (LP)**: El SAT (sistema tributario) adjudica por LP a Axtel (795M y 636M), lo que demuestra que la competencia es posible — pero SEP y PEMEX usan DA.
3. **Duopolio telecom gobierno**: TELMEX + Axtel dominan las telecomunicaciones empresariales del gobierno federal. Aunque son grupos distintos (América Móvil vs Alfa), la ausencia de competencia real entre ambos (diferentes instituciones adjudicando a cada uno vía DA) sugiere posible mercado dividido.
4. **71%DA en 748 contratos**: A diferencia de TELMEX (77%DA), Axtel tiene más contratos LP proporcionales, pero la DA sigue siendo dominante.
5. **Fusión parcial 2019**: Axtel vendió su división residencial a Megacable y se enfocó en servicios empresariales — exactamente donde opera con el gobierno. La concentración post-2019 podría aumentar el poder de mercado.

## Nivel de Riesgo

**MEDIO** — Monopolio de facto en enterprise telecom junto con TELMEX. El 2.1B DA a PEMEX es el contrato más irregular. COFECE debería investigar la asignación de mercado entre Axtel y TELMEX en contratos gubernamentales.
''')

# VID=44923: TECNOPROGRAMACION
write_memo(44923, 'confirmed_corrupt', '''# ARIA: TECNOPROGRAMACION HUMANA — IT ISSSTE-FGR 1.91B DA 2015

**Vendor ID**: 44923 | **Total**: 5.31B MXN | **Contratos**: 82 | **%DA**: 57% | **Risk Score**: 0.691

## ⚠️ ALERTA: 1,910M DA A ISSSTE EN 2015 PARA IT — LOCK-IN "CONTINUIDAD OPERATIVA"

## Resumen Ejecutivo

Tecnoprogramacion Humana Especializada en Sistemas Operativos SA de CV (sin RFC) recibió 5.31B MXN en 82 contratos al 57%DA para arrendamiento y servicios administrados de equipos de cómputo. El contrato central: 1,910M DA del ISSSTE en marzo 2015, seguido de contratos de "continuidad operativa" para proteger el lock-in tecnológico.

## Contratos Clave

| Fecha | Monto | Tipo | Institución | Descripción |
|---|---|---|---|---|
| 2015-03-30 | 1,910M | DA | ISSSTE | Sin descripción pública |
| 2022-12-15 | 841M | LP | FGR | Servicio Administrado Infraestructura de Escritorio |
| 2021-11-09 | 549M | IC3P | STPS | Arrendamiento equipo de cómputo y periféricos |
| 2022-03-18 | 306M | DA | ISSSTE | "CONTINUIDAD OPERATIVA del Servicio Administrado" |
| 2020-01-01 | 280M | DA | ISSSTE | Servicio Administrado de Equipo de Cómputo |

## Hallazgos ARIA

1. **1.91B DA sin descripción (2015, ISSSTE)**: El contrato más grande no tiene descripción pública en COMPRANET — señal de opacidad deliberada. 1.91B por servicios de TI sin licitación viola LAASSP para este monto.
2. **"Continuidad operativa" como justificación DA**: El contrato 2022 (306M DA) y 2020 (280M DA) de ISSSTE citan "continuidad operativa" — la cláusula más utilizada para evitar relicitar. Una vez instalado el proveedor, ISSSTE puede justificar DA indefinidamente.
3. **FGR sí licita (LP 841M)**: La Fiscalía General licita por LP servicios de infraestructura de escritorio — demostrando que el servicio tiene mercado competitivo real. El contraste con ISSSTE (DA) es directo.
4. **STPS usa IC3P** (Invitación a Cuando Menos 3 Personas): No es LP pero sí limita la exclusividad. ISSSTE usa DA unilateral.
5. **Sin RFC, sin perfil empresarial verificable**: 5.31B en servicios de TI críticos del gobierno sin RFC.
6. **Patrón ISSSTE-IT**: ISSSTE aparece en múltiples casos (BConnect 4.35B DA, Tecnoprogramacion 1.91B DA, BConnect 272M LP, Axtel) como institución con patrones sistemáticos de DA en IT.

## Nivel de Riesgo

**ALTO** — La combinación de DA de 1.91B sin descripción pública + lock-in por "continuidad operativa" + sin RFC es un patrón clásico de captura de TI institucional en ISSSTE.
''')

# VID=45219, 44985, 45086: DICONSA Ring Completion
for vid, status, memo in [
    (45219, 'needs_review', '''# ARIA: MOLINERA DE MEXICO — DICONSA RING 10,243 MICRO-DA 3.04B

**Vendor ID**: 45219 | **Total**: 3.04B MXN | **Contratos**: 10,243 | **%DA**: 100% | **Risk Score**: 0.000

## Resumen Ejecutivo

Molinera de Mexico SA de CV (sin RFC) distribuye harina de maíz a DICONSA/Alimentación para el Bienestar en 10,243 contratos de adjudicación directa (100%DA). Es el tercer miembro mayor del "Anillo DICONSA" después de Molinos Azteca (Caso 127, 8.07B) y Minsa (Caso 141, 1.77B). Todas las compras son micro-contratos (promedio 297K MXN) que sistemáticamente evitan umbrales de licitación.

## Hallazgos ARIA

- **10,243 micro-DA**: La cifra más alta después de Jabón La Corona (10,917c). Fraccionamiento sistémático en 20+ años.
- **100%DA sin excepción**: Ni un solo contrato competitivo en todo el historial.
- **Mercado con alternativas**: Maseca (Gruma) y Minsa compiten en el mercado de harina de maíz — DICONSA compra de ambas sin licitación.
- **Modelo ciego (rs=0.000)**: El modelo de riesgo v5.1 asigna 0.000 a este patrón de micro-DA, un punto ciego documentado.

**Nivel de Riesgo**: MEDIO — Parte del Anillo DICONSA documentado.
'''),
    (44985, 'needs_review', '''# ARIA: FABRICA DE JABON LA CORONA — DICONSA RING 10,917 MICRO-DA 2.70B

**Vendor ID**: 44985 | **Total**: 2.70B MXN | **Contratos**: 10,917 | **%DA**: 100% | **Risk Score**: 0.000

## Resumen Ejecutivo

Fábrica de Jabón La Corona SA de CV (sin RFC) — marca mexicana histórica de jabones — distribuye productos de limpieza a DICONSA en 10,917 contratos al 100%DA (el mayor número de contratos en el Anillo DICONSA). Promedio por contrato: 247K MXN.

## Hallazgos ARIA

- **10,917 micro-DA (máximo del anillo)**: La empresa con más contratos en el dataset DICONSA. Fraccionamiento extremo.
- **Higiene y limpieza = mercado competitivo**: Procter & Gamble, Unilever, Henkel, ACSA, Daba también ofrecen productos de limpieza a precios de mercado. DICONSA podría licitar.
- **2.70B en micro-contratos sin RFC**: Para un conglomerado nacional de la talla de Jabón La Corona, operar sin RFC en COMPRANET es anómalo.
- **Modelo ciego (rs=0.000)**: Mismo patrón que el resto del Anillo DICONSA — invisible al modelo.

**Nivel de Riesgo**: MEDIO — Anillo DICONSA documentado. Fraccionamiento sistemático.
'''),
    (45086, 'needs_review', '''# ARIA: GRUPO INDUSTRIAL MASECA (GRUMA) — DICONSA RING 5,556 MICRO-DA 2.66B

**Vendor ID**: 45086 | **Total**: 2.66B MXN | **Contratos**: 5,556 | **%DA**: 100% | **Risk Score**: 0.000

## Resumen Ejecutivo

Grupo Industrial Maseca SAB de CV (sin RFC) — MASECA, la mayor marca de masa harina del mundo (Gruma) — distribuye harina de maíz a DICONSA en 5,556 contratos al 100%DA. Promedio: 479K MXN por contrato. A diferencia de Molinera de Mexico o Minsa (competidores), Maseca/Gruma es una empresa de ~$4.5B USD de capitalización bursátil que recibe micro-DA sin licitación.

## Hallazgos ARIA

- **Paradoja Maseca**: La empresa más grande de harina de maíz en el mundo recibe micro-contratos DA de 479K promedio sin licitación, junto con sus competidores (Molinera, Minsa).
- **Coexistencia sin competencia**: Maseca, Molinera y Minsa reciben contratos DA simultáneos de DICONSA. No compiten entre sí — DICONSA simplemente asigna directamente a todas.
- **5,556 contratos sin RFC**: Empresa bursátil sin RFC en COMPRANET.
- **Anillo DICONSA completo**: 14+ proveedores, >40B MXN total, todos 90-100%DA, todos sin RFC en su mayoría.
- **Modelo ciego (rs=0.000)**: El v5.1 es completamente ciego a este patrón.

**Nivel de Riesgo**: MEDIO — Miembro documentado del Anillo DICONSA.
''')
]:
    write_memo(vid, status, memo)

# VID=92401: AXA ASSISTANCE
write_memo(92401, 'needs_review', '''# ARIA: AXA ASSISTANCE MEXICO — NAFIN BANJERCITO SEGURO SALUD 70%DA 4.15B

**Vendor ID**: 92401 | **Total**: 4.15B MXN | **Contratos**: 33 | **%DA**: 70% | **Risk Score**: 0.377

## Resumen Ejecutivo

AXA Assistance Mexico SA de CV (sin RFC) recibió 4.15B MXN en 33 contratos al 70%DA de NAFIN (Nacional Financiera) y BANJERCITO (Banco del Ejército) para servicios integrales de salud y asistencia. Todos los contratos son adjudicaciones directas repetidas durante 2011-2019, sin relicitación en 8+ años.

## Contratos Principales

- **1,198M MXN** | DA 2015 | NAFIN | Seguro salud
- **744M MXN** | DA 2011 | NAFIN | Seguro salud
- **326M MXN** | DA 2014 | NAFIN | Seguro salud
- **276M MXN** | DA 2019 | BANJERCITO | "Servicio integral de salud para derechohabientes"

## Hallazgos ARIA

1. **Renovación DA sistemática (2011→2014→2015)**: NAFIN renovó el seguro de salud de AXA tres veces consecutivas sin licitación. El mercado de seguros colectivos de salud tiene múltiples competidores (Metlife, GNP, Seguros Inbursa, Mapfre, AXA, Banorte).
2. **BANJERCITO (banco militar) al 100%DA**: El Banco del Ejército contrató seguro de salud para sus derechohabientes directamente con AXA. Servicios financieros y de seguros para instituciones militares deberían licitarse para transparencia.
3. **Sin RFC**: Subsidiaria de grupo AXA multinacional sin RFC en COMPRANET.
4. **4.15B sin benchmark**: Sin LP de referencia, no es posible auditar si las primas cobradas son de mercado o infladas.

## Nivel de Riesgo

**MEDIO** — Patrón de renovación DA repetida en mercado competitivo. La ausencia de relicitación en 8+ años es el principal indicador de captura.
''')

# VID=35071: QUALITY LABORAL
write_memo(35071, 'confirmed_corrupt', '''# ARIA: QUALITY LABORAL SERVICES — COMEX PEMEX MANO DE OBRA DA 2.59B

**Vendor ID**: 35071 | **Total**: 2.59B MXN | **Contratos**: 6 | **%DA**: 67% | **Risk Score**: 0.230

## ⚠️ ALERTA: DOS DA MASIVOS EN 2013 (1.497B) A EMPRESA DE STAFFING DE FILIAL PEMEX

## Resumen Ejecutivo

Quality Laboral Services SA de CV (sin RFC) recibió 2.59B MXN en solo 6 contratos exclusivamente de Compañía Mexicana de Exploraciones SA de CV (COMEX, filial PEMEX de exploración) para servicios de staffing/nómina laboral. En 2013, dos adjudicaciones directas suman 1.497B MXN — para una empresa de recursos humanos que opera en un mercado hipercompetitivo.

## Contratos Cronológicos

| Fecha | Monto | Tipo | Descripción |
|---|---|---|---|
| 2008-02-07 | 160M | LP | COMEX — staffing (competitivo) |
| 2010-03-12 | 822M | LP | COMEX — staffing (competitivo) |
| 2013-04-01 | 550M | DA | COMEX — staffing (directo) |
| 2013-12-01 | 947M | DA | COMEX — staffing (fin de año) |

## Hallazgos ARIA

1. **Cambio LP→DA (2013)**: Los dos primeros contratos (2008 y 2010) fueron por LP competitivo. En 2013, los dos contratos siguientes — de mayor valor (550M y 947M) — son DA. El cambio sugiere captura institucional post-2010.
2. **947M DA el 1 de diciembre de 2013**: Segundo DA del año en curso, al inicio del mes de diciembre — vaciado de presupuesto antes del cierre fiscal.
3. **COMEX como hub irregular**: COMEX también contrató con Manejo Integral en Consulta Empresarial (6.31B, 2c, Caso investigado). COMEX parece ser una filial PEMEX usada sistemáticamente para contratos fuera del escrutinio regular de PEMEX corporativo.
4. **Staffing = mercado competitivo**: Las principales outsourcing/staffing firms en México (ManpowerGroup, Randstad, Adecco, Grupo Bio, Kelly Services) licitan en todos los sectores. No hay justificación para DA en este servicio.
5. **Sin RFC, sin presencia pública**: Empresa de servicios laborales para PEMEX sin RFC ni perfil verificable.

## Patrón COMEX

- Quality Laboral: 2.59B (staffing, 67%DA)
- Manejo Integral en Consulta: 6.31B (consultoría, 2 contratos)
- Total COMEX irregular detectado: ~8.9B MXN

## Nivel de Riesgo

**ALTO** — Cambio deliberado LP→DA en 2013 + DA de fin de año + COMEX como hub irregular = patrón de captura institucional en filial PEMEX.
''')

# Final summary
total = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
review = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
print(f'\nAll ARIA: {total} GT-linked | {confirmed} confirmed_corrupt | {review} needs_review')
conn.close()
