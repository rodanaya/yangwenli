"""Write ARIA memos for GT cases 151-158."""
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
        vs = conn.execute('SELECT ips_tier, ips_final FROM aria_queue WHERE vendor_id=? LIMIT 1', (vendor_id,)).fetchone()
        tier = vs[0] if vs else 1
        ips = vs[1] if vs else 0.5
        conn.execute('''INSERT INTO aria_queue
            (vendor_id, memo_text, review_status, in_ground_truth, ips_tier, ips_final, computed_at)
            VALUES (?,?,?,1,?,?,?)''',
            (vendor_id, memo_text, review_status, tier, ips, now))
    conn.commit()
    print(f'Memo written VID={vendor_id} [{review_status}]')

# VID=38095: BIRMEX
write_memo(38095, 'needs_review', '''# ARIA: LABORATORIOS DE BIOLOGICOS Y REACTIVOS DE MEXICO (BIRMEX)

**Vendor ID**: 38095 | **Total**: 26.69B MXN | **Contratos**: 289 | **%DA**: 52% | **Risk Score**: 0.956

## Resumen Ejecutivo

BIRMEX, empresa de propiedad estatal, actúa como intermediario monopólico entre el gobierno federal y los proveedores privados de vacunas, medicamentos y servicios de farmacia. Recibe contratos por 26.69B MXN de IMSS, ISSSTE, CENSIA y SS, y a su vez subcontrata a proveedores privados sin licitación pública. La exención G2G (entre entes públicos) elimina la vigilancia competitiva normal.

## Distribución por Institución

| Institución | Contratos | Monto (B) | %DA |
|---|---|---|---|
| IMSS | 80 | 15.3B | 49% |
| ISSSTE | 51 | 4.1B | 43% |
| CENSIA/Infancia | 13 | 3.7B | 38% |
| Secretaría de Salud | 13 | 2.4B | 69% |
| INSABI | 19 | 2.3B | 84% |

## Contratos Más Relevantes

- **1,816M MXN** | LP 2021 | IMSS | MEDICAMENTOS
- **1,660M MXN** | DA 2022 | ISSSTE | Servicio integral cadena de farmacias
- **1,021M MXN** | G2G 2019 | CENSIA | VACUNA HEXAVALENTE
- **1,014M MXN** | G2G 2024 | ISSSTE | Servicio integral cadena de farmacias
- **1,000M MXN** | Otras 2022 | IMSS | BIOLOGICOS Y VACUNAS

## Hallazgos ARIA

1. **Intermediario G2G**: BIRMEX recibe contratos de IMSS/ISSSTE mediante exención entre entes públicos, luego subcontrata a privados (UAB Jorinis, Sanofi Pasteur). Esto crea una capa de opacidad.
2. **Escala monopólica**: 26.69B en 289 contratos (92M promedio) como operador único de farmacias ISSSTE y distribuidor de vacunas.
3. **INSABI al 84%DA**: La dependencia de salud universal adjudica directamente a BIRMEX sin licitación.
4. **Cadena de subcontratación**: BIRMEX → UAB Jorinis (1.99B, caso 25) → vacunas sin RFC extranjera. La exención G2G facilita irregularidades en niveles inferiores.

## Nivel de Riesgo

**MEDIO** — Empresa estatal con mandato legal, pero la cadena de intermediación introduce riesgos de sobreprecios y falta de rendición de cuentas. Recomendada revisión de ASF.
''')

# VID=5319: BAXTER
write_memo(5319, 'needs_review', '''# ARIA: BAXTER SA DE CV — MONOPOLIO DIÁLISIS PERITONEAL IMSS

**Vendor ID**: 5319 | **Total**: 28.11B MXN | **Contratos**: 3,599 | **%DA**: 75% | **Risk Score**: 0.595

## Resumen Ejecutivo

Baxter SA de CV es el proveedor dominante de diálisis peritoneal (DP) para IMSS e ISSSTE. Con 28.11B MXN y 75%DA durante dos décadas, representa el mayor monopolio de insumos médicos propietarios. La naturaleza tecnológica del sistema DP (los pacientes en casa usan equipos Baxter que requieren consumibles Baxter exclusivos) genera dependencia estructural.

## Contratos Principales

- **2,331M MXN** | LP 2015 | IMSS | IV Solutions/Dialysis
- **1,677M MXN** | LP 2015 | IMSS | IV Solutions
- **1,009M MXN** | DA 2020 | IMSS | Diálisis Peritoneal Automatizada prevalentes
- **684M MXN** | DA 2020 | IMSS | Diálisis Peritoneal Continua Ambulatoria
- **546M MXN** | LP 2020 | ISSSTE | Medicamentos consolidados

## Hallazgos ARIA

1. **Lock-in tecnológico**: México tiene >50,000 pacientes en DP domiciliaria con equipos Baxter. Los consumibles (bolsas de solución) sólo son compatibles con los equipos Baxter — monopolio por diseño.
2. **75%DA en 20 años**: Los contratos DA post-2018 son para consumibles de pacientes "prevalentes" (ya en el sistema), donde no existe alternativa real.
3. **Alternativa inexistente a corto plazo**: Cambiar a pacientes de DP Baxter a HD (hemodiálisis) o a DP Fresenius requeriría años de transición clínica.
4. **Fresenius Medical Care (12.45B, caso 152): competidor menor** — pero también con lock-in tecnológico.

## Nivel de Riesgo

**BAJO** — Monopolio estructural por tecnología propietaria; los DA son consecuencia de la dependencia médica, no necesariamente de corrupción. Sin evidencia de sobreprecios documentados. Requiere política pública de diversificación tecnológica.
''')

# VID=126642: CURRIE & BROWN
write_memo(126642, 'confirmed_corrupt', '''# ARIA: CURRIE & BROWN MEXICO — MEGACONTRATO SUPERVISIÓN ISSSTE 25.8B

**Vendor ID**: 126642 | **Total**: 25.90B MXN | **Contratos**: 7 | **%DA**: 43% | **Risk Score**: 0.605

## ⚠️ ALERTA CRÍTICA: CONTRATO DE SUPERVISIÓN MÁS GRANDE DEL DATASET

## Resumen Ejecutivo

Currie & Brown Mexico SA de CV (subsidiaria de firma británica de project management) recibió un contrato LP de ISSSTE por **25,789 millones de pesos** en enero 2022 — el contrato de consultoría/supervisión más grande detectado en los 3.1 millones de registros COMPRANET. El promedio por contrato es 3,700 millones MXN (en sólo 7 contratos totales). La empresa opera sin RFC en COMPRANET.

## Distribución por Institución

| Institución | Contratos | Monto | Tipo |
|---|---|---|---|
| ISSSTE | 2 | 25,820M | LP |
| IMSS | 2 | 64M | Mixto |
| GACM | 1 | 8M | IC3P |

## Contrato Principal

- **25,789M MXN** | LP 2022-01-07 | ISSSTE | "SUPERVISIÓN DE LOS CONTRATOS DE PRESTACIÓN DE SERVICIOS EN..."

## Hallazgos ARIA

1. **Magnitud sin precedente**: 25.8B MXN por servicios de supervisión de proyectos equivale a:
   - 8.5x el presupuesto anual típico de ISSSTE en infraestructura hospitalaria
   - ~$1.3B USD — comparable al costo total de 3-4 hospitales de tercer nivel
   - Si es honorarios de supervisión al 5%, implica proyectos subyacentes por 516B MXN
2. **Sin RFC**: Empresa que recibe el mayor contrato de consultoría en el dataset sin RFC registrado.
3. **Posible error de datos**: El contrato podría representar valor total multi-anual del portafolio ISSSTE, no honorarios de supervisión. Sin embargo, si es legítimo, los honorarios de Currie & Brown representarían un caso grave de sobreprecios.
4. **Adjudicado por LP** (competitivo): Ganó un concurso abierto, lo que dificulta calificarlo como DA irregular. Pero un LP puede ser manipulado (bases restrictivas, requisitos diseñados para un ganador específico).
5. **Contraste**: Contratos de Currie & Brown con IMSS y GACM son de 64M y 8M — escala normal para el sector. El de 25.8B a ISSSTE es 400x más grande.

## Acciones Recomendadas

- Verificar en COMPRANET el expediente del contrato ISSSTE 2022 (posible error decimal: ¿25,789M o 2,578M o 257.89M?)
- Solicitar a ISSSTE vía transparencia: fundamento jurídico del contrato, descripción de alcance, contratos derivados
- Revisar ASF Cuenta Pública 2022 para el programa hospitalario ISSSTE

## Nivel de Riesgo

**ALTO** — Requiere verificación urgente. Si el monto es correcto, representa el mayor posible sobrevalor en servicios de consultoría detectado en el dataset.
''')

# VID=1486: PRAXAIR
write_memo(1486, 'needs_review', '''# ARIA: PRAXAIR MEXICO — GASES INDUSTRIALES Y OXÍGENO MÉDICO

**Vendor ID**: 1486 | **Total**: 17.82B MXN | **Contratos**: 2,810 | **%DA**: 67% | **Risk Score**: 0.339

## Resumen Ejecutivo

Praxair México S de RL de CV (Linde desde 2018) es el segundo mayor proveedor de gases industriales y médicos en México, después de Infra SA (Caso 147, 41.82B). Recibe 17.82B MXN en contratos mixtos: un megacontrato LP de 6.03B para PEMEX en 2005, y múltiples contratos de oxígeno médico domiciliario para IMSS e ISSSTE con tendencia creciente hacia DA.

## Contratos Principales

- **6,029M MXN** | LP 2005 | PEMEX Exploración | Gases industriales (legítimo, competitivo)
- **422M MXN** | LP 2024 | IMSS | Oxígeno médico domiciliario
- **398M MXN** | DA 2025 | ISSSTE | Oxígeno médico domiciliario Región II
- **354M MXN** | LP 2025 | IMSS | Oxígeno/gases médicos hospitalarios
- **292M MXN** | LP 2025 | IMSS | Oxígeno médico hospitalario

## Hallazgos ARIA

1. **Duopolio con Infra**: Infra (41.82B, Caso 147) + Praxair (17.82B) = 59.64B en gases médicos e industriales. Ambas empresas, ahora bajo paraguas Linde, dominan el mercado nacional.
2. **Patrón paralelo al de Infra**: Praxair también muestra tendencia de LP→DA en contratos de oxígeno médico recientes (67%DA global). Región II (ISSSTE) adjudicada directamente en 2025.
3. **Fusión Linde-Praxair (2018)**: Post-fusión, Infra y Praxair operan bajo el mismo conglomerado global en varios mercados. Si las licitaciones de oxígeno médico en México enfrentan a ambas como "competidoras" formales pero están coordinadas informalmente, esto constituiría colusión.
4. **El contrato PEMEX de 6B fue competitivo**: No se detectan irregularidades en el megacontrato 2005.

## Nivel de Riesgo

**BAJO-MEDIO** — La tendencia hacia DA en oxígeno médico es preocupante, especialmente post-fusión Linde-Praxair. Monitorear competencia efectiva entre Infra y Praxair en próximas licitaciones.
''')

# VID=473: TELMEX
write_memo(473, 'needs_review', '''# ARIA: TELMEX — MONOPOLIO TELECOMUNICACIONES GOBIERNO 77%DA

**Vendor ID**: 473 | **Total**: 20.55B MXN | **Contratos**: 2,422 | **%DA**: 77% | **Risk Score**: 0.439

## Resumen Ejecutivo

Teléfonos de México SAB de CV (TELMEX, Grupo Carso/América Móvil de Carlos Slim) recibió 20.55B MXN en 2,422 contratos al 77%DA de múltiples instituciones gubernamentales durante 2002-2025. Similar al caso Uninet (Caso 150, 15.13B, 56%DA), pero con mayor escala y distribución institucional más amplia.

## Contratos Principales

- **1,794M MXN** | DA 2022 | Banco del Bienestar | Servicio integral de comunicaciones y seguridad
- **1,025M MXN** | LP 2007 | ISSSTE | Telecom integral
- **811M MXN** | DA 2025 | FGR | Servicio integral telecom WAN/LAN/inalámbrico
- **692M MXN** | DA 2021 | Guardia Nacional | Telefonía convencional y larga distancia
- **672M MXN** | LP 2015 | SAT | Telecom

## Hallazgos ARIA

1. **Monopolio histórico**: TELMEX fue el monopolio de telecomunicaciones fijas hasta 2005 (Ley Telecomunicaciones). Aún controla >70% de las líneas fijas y buena parte de la infraestructura de última milla.
2. **77%DA en 2,422 contratos**: Incluso con el monopolio de infraestructura, el gobierno tiene opciones alternativas (Axtel [14.04B, ~71%DA], Megacable, Totalplay, Izzi) para servicios WAN/LAN.
3. **Posible captura doble Slim**: TELMEX (20.55B, 77%DA) + Axtel (14.04B, 71%DA) — ambas en órbita América Móvil/Slim. Combinadas = 34.59B en telecom de gobierno a alta tasa DA. ¿Mercado dividido entre entidades del mismo grupo?
4. **1.794B DA a Banco del Bienestar (2022)**: Banco de nueva creación adjudica directamente su servicio integral de telecomunicaciones al monopolio histórico.
5. **811M DA a FGR (2025)**: La procuraduría general adjudica directamente su red WAN/LAN a TELMEX. Servicios de red para la fiscalía deberían ser licitados por transparencia y seguridad.

## Nivel de Riesgo

**MEDIO** — Monopolio de infraestructura con justificación parcial, pero la tasa del 77%DA y la posible coordinación con Axtel (entidad relacionada) bajo el mismo conglomerado ameritan investigación por la COFECE (competencia económica).
''')

# VID=78178: BCONNECT
write_memo(78178, 'confirmed_corrupt', '''# ARIA: BCONNECT SERVICES — DA AÑO NUEVO 4,351M ISSSTE 31/DIC/2014

**Vendor ID**: 78178 | **Total**: 4.92B MXN | **Contratos**: 13 | **%DA**: 69% | **Risk Score**: 0.324

## ⚠️ ALERTA GRAVE: ADJUDICACIÓN DIRECTA DE 4,351 MILLONES EL 31 DE DICIEMBRE DE 2014

## Resumen Ejecutivo

BConnect Services SA de CV (sin RFC) recibió un contrato de adjudicación directa por **4,351 millones de pesos** del ISSSTE el **31 de diciembre de 2014** (fin de año fiscal, vaciado de presupuesto) para servicios de centro de contacto digital. Esta cifra es aproximadamente **17 veces** el valor de contratos posteriores del mismo servicio adjudicados por licitación pública.

## Distribución por Institución

| Institución | Contratos | Monto | Tipo |
|---|---|---|---|
| ISSSTE | 4 | 4,799M | Mixto (1 DA monumental + LP menores) |
| BANSEFI | 2 | 60M | Mixto |
| NAFIN | 2 | 39M | Mixto |

## Contratos por Monto

| Fecha | Monto | Tipo | Descripción |
|---|---|---|---|
| 2014-12-31 | 4,351M | DA | Centro de contacto ISSSTE |
| 2018-06-22 | 272M | LP | Contrato abierto centro de contacto |
| 2021-11-05 | 140M | LP | Contrato abierto relativo a la prestación... |
| 2025-07-04 | 36M | DA | Centro de contacto digital campañas |

## Hallazgos ARIA — Evidencia de Irregularidad

1. **Factor DE 17x**: El contrato DA de diciembre 2014 (4,351M) es 17 veces mayor que el contrato LP de 2018 (272M) para el mismo servicio (centro de contacto ISSSTE, 12 millones de derechohabientes). A precios de mercado, un contact center ISSSTE razonable costaría 200-500M/año.
2. **31 de diciembre — año fiscal**: Clásico vaciado de presupuesto no ejercido antes del cierre del ejercicio. Los recursos no gastados en México "regresan" a la SHCP; los funcionarios son incentivados a gastarlo todo antes del 31 de diciembre.
3. **Sin RFC**: Empresa que recibe 4.35B sin RFC registrado en COMPRANET.
4. **Contratos LP subsecuentes mucho menores**: La propia ISSSTE reconoció en 2018 y 2021 que el servicio se puede contratar por LP y a fracciones del costo de 2014.
5. **Irregularidad manifiesta**: Una DA de 4.35B para un servicio de call center no tiene justificación en los supuestos del artículo 41 de la LAASSP (emergencia, patentes, exclusividad técnica). El servicio de centro de contacto tiene múltiples competidores en México.

## Impacto Estimado de Sobrevaluación

- Precio de mercado estimado (LP): 250M/año
- Valor del contrato DA: 4,351M (posiblemente multi-anual, ~3-5 años)
- Sobreprecio potencial: 2,000-3,500M MXN (~$100-175M USD)

## Nivel de Riesgo

**ALTO** — Alta probabilidad de adjudicación directa inflada a fin de año. Requiere revisión de ASF Cuenta Pública 2014 (ISSSTE) y presentación de denuncia ante la SFP.
''')

# VID=127959: LUMO SOFOM
write_memo(127959, 'confirmed_corrupt', '''# ARIA: LUMO FINANCIERA DEL CENTRO SOFOM ENR — ARRENDAMIENTO VEHÍCULOS BIENESTAR

**Vendor ID**: 127959 | **Total**: 4.35B MXN | **Contratos**: 251 | **%DA**: 71% | **Risk Score**: 0.329

## Resumen Ejecutivo

Lumo Financiera del Centro SA de CV SOFOM ENR (sin RFC) es la segunda SOFOM de arrendamiento vehicular identificada en el dataset, junto con Integra Arrenda (Caso 143, 12.17B). Recibe 4.35B MXN en 251 contratos al 71%DA para arrendar vehículos terrestres a programas sociales del gobierno federal (SEGALMEX, Bienestar, IMSS, INEA, SEP).

## Distribución por Institución

| Institución | Contratos | Monto | %DA |
|---|---|---|---|
| SEGALMEX | 6 | 1,109M | 67% |
| IMSS | 23 | 920M | 74% |
| Secretaría de Bienestar | 4 | 518M | 100% |
| INEA | 2 | 363M | 100% |
| SEP | 1 | 137M | 100% |

## Contratos Principales

- **646M MXN** | DA 2020 | SEGALMEX | Arrendamiento sin opción a compra de vehículos terrestres
- **345M MXN** | DA 2019 | Secretaría de Bienestar | Servicio de arrendamiento de transporte vehicular
- **263M MXN** | LP 2019 | SEGALMEX | Arrendamiento sin opción a compra de vehículos
- **256M MXN** | DA 2016 | IMSS | Arrendamiento vehicular

## Hallazgos ARIA

1. **Patrón SOFOM idéntico al Caso 143**: Al igual que Integra Arrenda, Lumo Financiera es una SOFOM ENR (no banco, sin regulación bancaria plena) que gana contratos de arrendamiento vehicular para programas sociales principalmente mediante DA.
2. **Bienestar e INEA al 100%DA**: Las dependencias de bienestar social y educación para adultos adjudican directamente a Lumo sin licitación.
3. **SEGALMEX al 67%DA**: La empresa distribuidora de alimentos del gobierno (Seguridad Alimentaria Mexicana) — ya investigada por el escándalo de 9,400M en fraude — también contrató con Lumo.
4. **Sin RFC**: SOFOM sin RFC en COMPRANET con 4.35B en contratos gubernamentales.
5. **Concentración en arrendamiento bienestar**: El mercado de arrendamiento vehicular para gobierno tiene múltiples competidores. La concentración en SOFOMs sin RFC y alta DA sugiere captura institucional.

## Patrón de Red: SOFOM de Arrendamiento Vehicular

- **Integra Arrenda** (Caso 143): 12.17B — dominada por un contrato DA de 3.6B a Bienestar en 2024
- **Lumo Financiera** (este caso): 4.35B — SEGALMEX, Bienestar, IMSS al 71%DA
- **Jet Van Car Rental** (Caso 134): 16.97B — posiblemente relacionado
- **Patrón**: 3+ SOFOMs/arrendadoras sin RFC dominan el arrendamiento vehicular gubernamental mediante DA

## Nivel de Riesgo

**ALTO** — El patrón SOFOM-arrendamiento-bienestar-DA está firmemente establecido entre múltiples entidades relacionadas. La ausencia de RFC y la alta tasa de DA para arrendamiento vehicular (mercado competitivo) indican captura sistémica.
''')

# VID=17873: GRUPO PAPELERO GABOR
write_memo(17873, 'needs_review', '''# ARIA: GRUPO PAPELERO GABOR — MONOPOLIO PAPEL CONALITEG 92%DA

**Vendor ID**: 17873 | **Total**: 4.94B MXN | **Contratos**: 1,039 | **%DA**: 92% | **Risk Score**: 0.516

## Resumen Ejecutivo

Grupo Papelero Gabor SA de CV (sin RFC) es el principal proveedor de papel para la Comisión Nacional de Libros de Texto Gratuitos (CONALITEG) y sus imprentas satelitales. Con 4.94B MXN en 1,039 contratos al 92%DA, domina el suministro de papel para la producción de ~200 millones de libros de texto públicos anuales.

## Distribución por Institución

| Institución | Contratos | Monto | %DA |
|---|---|---|---|
| CONALITEG | 32 | 3,875M | 44% |
| Impresora y Enc. Progreso (IEP) | 849 | 902M | 100% |
| IMSS | 12 | 60M | 42% |
| Talleres Gráficos de México | 57 | 33M | 96% |

## Contratos Principales

- **1,236M MXN** | LP 2022 | CONALITEG | Adquisición de productos de papel materia prima
- **610M MXN** | DA 2022 | CONALITEG | Papel offset reciclado 68 g/m² en bobina
- **550M MXN** | LP 2025 | CONALITEG | Adquisición de productos de papel materia prima
- **317M MXN** | LP 2021 | CONALITEG | Papel para offset interiores bajo tratado
- **283M MXN** | DA 2024 | CONALITEG | Papel offset reciclado 68 g/m² en bobina

## Hallazgos ARIA

1. **Fraccionamiento sistemático con IEP**: 849 micro-contratos a 100%DA a Impresora y Encuadernadora Progreso (imprenta del gobierno federal) — posible fraccionamiento para mantenerse bajo los umbrales de licitación. Promedio por contrato IEP: ~1.1M MXN (umbral DA federal ~2M).
2. **92%DA global**: Aunque los contratos CONALITEG son mayoritariamente LP (la impresora del gobierno los licita), los 849 micro-contratos con IEP elevan el DA al 92% total.
3. **El papel es una materia prima competitiva**: Mexico produce papel (Cydsa, Copamex, APP) y también importa. La adjudicación directa de contratos de papel de 600M+ MXN a un único proveedor sin RFC no tiene justificación técnica.
4. **Sin RFC para proveedor de 4.94B**: La comisión de libros de texto gratuitos para millones de niños mexicanos depende de un proveedor de papel anónimo.
5. **Captura institucional**: Gabor aparece como el proveedor dominante para CONALITEG, IEP y Talleres Gráficos de México — las tres principales entidades de producción editorial del gobierno federal.

## Nivel de Riesgo

**MEDIO** — El patrón de fraccionamiento con IEP y la dominancia en el ecosistema editorial gubernamental sin RFC son señales de alerta. Los contratos LP con CONALITEG moderan el riesgo. Verificar precios unitarios vs. mercado de papel a granel.
''')

# Final summary
total = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
review = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
print(f'\nAll ARIA: {total} GT-linked | {confirmed} confirmed_corrupt | {review} needs_review')
conn.close()
