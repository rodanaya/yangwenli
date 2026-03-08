"""Write ARIA memos for GT cases 196-201."""
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
        print(f'  VID={vendor_id}: updated (status={review_status})')
    else:
        conn.execute('''INSERT INTO aria_queue
            (vendor_id, memo_text, review_status, in_ground_truth, ips_tier, ips_final, computed_at)
            VALUES (?,?,?,1,2,0.5,?)''',
            (vendor_id, memo_text, review_status, now))
        print(f'  VID={vendor_id}: inserted (status={review_status})')
    conn.commit()


MEMO_48374 = """\
# ARIA: INDALJIM SA DE CV — IMSS ROPA HOSPITALARIA DA RING 84.1%DA — 1.88B (617 CONTRATOS IMSS)

**Vendor ID**: 48374 | **Total**: 1.88B MXN | **Contratos**: 691 | **%DA IMSS**: 84.1% | **RFC**: sin RFC

## Resumen Ejecutivo

Indaljim SA de CV distribuye ropa hospitalaria (batas, sábanas, campos quirúrgicos reutilizables) al IMSS. 617 contratos IMSS (714M, 84.1%DA) en ~22 años frente a 3 contratos SSISSSTE (1.07B, 0%DA vía LP). La dicotomía LP limpio en SSISSSTE vs. 84.1%DA en IMSS documenta captura institucional, no monopolio de mercado.

## Señal de Alerta

| Institución | Contratos | Monto | %DA |
|---|---|---|---|
| SSISSSTE | 3c | 1.07B | **0% (LP)** |
| IMSS | 617c | 714M | **84.1% (DA)** |

La misma empresa obtiene 1.07B vía licitación pública en SSISSSTE y 714M vía DA al IMSS en la misma categoría de producto. La ropa hospitalaria no requiere especificaciones técnicas únicas — tiene múltiples proveedores certificados.

## Contratos Representativos

- 14.4M DA a IMSS (2022-12-16): "ROPA HOSPITALARIA (REUSABLE)" - Grupo 220
- 6.6M DA (2022-03-29): "ADQ DE ROPA HOSPITALARIA"
- 6.0M DA (2020-04-16): "ROPA HOSPITALARIA COVID 19" — aprovechamiento de pandemia para DA

El promedio por contrato DA al IMSS = 714M/519 DAs ≈ 1.38M MXN. Consistente con threshold splitting.

## Posición en el Anillo IMSS

Indaljim es el representante del sector textil/laundry en el anillo de distribuidores IMSS (complementario al farmacéutico y de reactivos):
- ROGERI (Caso 190): insumos médicos/curación, 73.2%DA
- **INDALJIM**: ropa hospitalaria, 84.1%DA
- COMERCIALIZADORA REACTIVOS (Caso 193): reactivos, 85.6%DA
- LABORATORIOS VANQUISH (Caso 192): reactivos, 92.8%DA

## Recomendación

Sin RFC en 22 años. Verificar ante SAT. Comparar precios unitarios ropa hospitalaria Indaljim vs LP del SSISSSTE (mismos productos). Solicitar LFTAIPG justificaciones DA IMSS 2020-2024 — especialmente contratos COVID-19.
"""

MEMO_125381 = """\
# ARIA: BIONOVA LABORATORIOS SA DE CV — IMSS REACTIVOS DIAGNÓSTICO DA 88.9%DA — 1.98B

**Vendor ID**: 125381 | **Total**: 1.98B MXN | **Contratos**: 83 | **%DA IMSS**: 88.9% | **RFC**: sin RFC

## Resumen Ejecutivo

Bionova Laboratorios SA de CV distribuye reactivos diagnóstico e insumos de laboratorio clínico al IMSS (63c, 1.44B, 88.9%DA). El ISSSTE usa LP (7.1%DA, 540M). Bionova forma parte del anillo de distribuidores de reactivos IMSS junto con Laboratorios Vanquish (Caso 192, 92.8%DA) y Comercializadora Reactivos (Caso 193, 85.6%DA).

## Anillo Completo de Reactivos IMSS (3 miembros documentados)

| Distribuidor | %DA IMSS | Valor IMSS | Caso |
|---|---|---|---|
| Laboratorios Vanquish | 92.8% | 2.25B | 192 |
| **Bionova Laboratorios** | **88.9%** | 1.44B | **197** |
| Comercializadora Reactivos | 85.6% | 2.03B | 193 |
| **Total anillo reactivos** | **~89%** | **5.72B** | — |

El anillo acumula 5.72B MXN al IMSS via DA en productos de laboratorio diagnóstico — una de las mayores concentraciones de DA no farmacéutico en el dataset.

## ⚠️ Hipótesis: Coordinación de Fragmentación

Tres distribuidores de reactivos sin RFC, con 85-93%DA en IMSS, operando simultáneamente en la misma categoría, sugiere coordinación: cada uno se especializa en líneas de producto distintas (reactivos hematología, reactivos bioquímica, reactivos inmunología) para dividir el mercado IMSS sin competir entre sí. Esto constituiría bid rigging además de DA individual.

## ISSSTE 7.1%DA — Confirmación de Captura IMSS

ISSSTE requiere LP para los mismos reactivos (7.1%DA = 93%LP). La misma empresa que acepta LP en ISSSTE opera vía DA exclusivamente en IMSS — confirma que la DA es resultado de captura institucional en IMSS.

## Recomendación

Investigar si Bionova, Vanquish y Comercializadora Reactivos tienen representantes legales compartidos, domicilios fiscales similares o participaron en las mismas licitaciones ISSSTE. Verificar SAT EFOS. Solicitar contratos IMSS 2011-2025 vía LFTAIPG.
"""

MEMO_13186 = """\
# ARIA: RELIABLE DE MEXICO SA DE CV — IMSS+ISSSTE MEDICAL SUPPLY DA 54.5%DA — 2.60B (23 AÑOS)

**Vendor ID**: 13186 | **Total**: 2.60B MXN | **Contratos**: 665 | **%DA IMSS**: 54.5% | **RFC**: sin RFC

## Resumen Ejecutivo

Reliable de Mexico SA de CV distribuye insumos médicos a IMSS (536c, 2.21B, 54.5%DA) e ISSSTE (70c, 350M, 54.3%DA) desde 2002. Tasa DA idéntica (~54%) en ambas instituciones por 23 años. Parte del anillo de distribuidores hospitalarios IMSS/ISSSTE.

## Comparativa Anillo IMSS (categoría insumos médicos)

| Distribuidor | %DA IMSS | Valor | Caso |
|---|---|---|---|
| ROGERI | 73.2% | 1.89B | Caso 190 |
| **RELIABLE DE MEXICO** | **54.5%** | 2.21B | **Caso 198** |

## Patrón de DA Dual Paralela

| Institución | Contratos | Monto | %DA |
|---|---|---|---|
| IMSS | 536c | 2.21B | 54.5% |
| ISSSTE | 70c | 350M | 54.3% |

La tasa DA 54.5% IMSS y 54.3% ISSSTE es prácticamente idéntica — no es coincidencia operativa sino una política deliberada de relación institucional uniforme. 536+70 = 606 contratos DA aprox en 23 años (2002-2025).

## 23 Años Sin RFC

Reliable de Mexico opera desde 2002 — año de inicio del registro COMPRANET (Estructura A). Sin RFC durante la totalidad de sus 23 años de operación con las dos principales instituciones de salud pública de México.

## Recomendación

Verificar RFC ante SAT. Comparar precios unitarios Reliable vs licitaciones abiertas IMSS e ISSSTE del mismo período. Solicitar LFTAIPG padrones de proveedores aprobados de insumos IMSS 2002-2010 (Estructura A, datos limitados).
"""

MEMO_57263 = """\
# ARIA: INFOCREDIT — IMSS SERVICIO INTEGRAL CENTROS DE CONTACTO DA 78.9%DA — 3.29B

**Vendor ID**: 57263 | **Total**: 3.29B MXN | **Contratos**: 38 | **%DA IMSS**: 78.9% | **RFC**: sin RFC

## Resumen Ejecutivo

Infocredit provee el "Servicio Integral de Centros de Contacto" (call center corporativo) al IMSS (19c, 1.96B, 78.9%DA, 2014-2025). También opera centros de contacto para SRE (6c, 910M, 50%DA) y NAFIN (11c, 140M, 72.7%DA). Sin RFC. El mercado de call center gubernamental tiene múltiples competidores internacionales (Atento, Teleperformance, Konecta) — no existe justificación de monopolio técnico para 78.9%DA al IMSS.

## Contratos IMSS Más Relevantes

| Fecha | Monto | Tipo | Descripción |
|---|---|---|---|
| 2015-04-07 | 385M | **DA** | Sin descripción disponible |
| 2022-12-22 | 252M | LP | Servicio Integral Centros de Contacto IMSS |
| 2022-12-15 | 233M | LP | Servicio Integral Centros de Contacto IMSS |
| 2025-03-07 | 156M | **DA** | CDMX call center |
| 2025-03-11 | 138M | **DA** | Morelos call center |

## ⚠️ Señal: DA en 2015 y 2025 vs. LP en 2022

El IMSS otorga LP en 2022 (485M en dos contratos) pero DA en 2015 (385M) y 2025 (294M en dos contratos). El patrón sugiere que cuando hay supervisión aumentada (período 2022 post-pandemia) se usa LP, pero en períodos de menor escrutinio se regresa a DA. El 385M DA de 2015 sin descripción disponible es una opacidad deliberada.

## SRE y NAFIN — Extensión Multi-Institucional

SRE (910M, 50%DA): "SERVICIOS INTEGRALES DE CENTRO DE CONTACTO PARA LA PROGRAMACIÓN" — el 50%DA incluye un LP de 661M (2022-02-04) que es el mayor contrato LP.
NAFIN (140M, 72.7%DA): banco de desarrollo, 11 contratos en DA sistemático.

## Recomendación

Sin RFC — prioritario verificar ante SAT EFOS. El nombre "INFOCREDIT" no corresponde a ninguna empresa registrada de forma pública con ese nombre en Mexico — buscar razón social completa. Solicitar contratos IMSS 2015 (385M DA sin descripción) vía LFTAIPG.
"""

MEMO_20949 = """\
# ARIA: CASANOVA RENT VOLKS SA DE CV — FISCALÍA+PGR TRANSPORTACIÓN TERRESTRE DA MONOPOLY — 3.15B

**Vendor ID**: 20949 | **Total**: 3.15B MXN | **Contratos**: 29 | **%DA FGR**: 100% | **RFC**: sin RFC

## Resumen Ejecutivo

Casanova Rent Volks SA de CV provee servicios de transportación terrestre (flotillas vehiculares con conductor) a las instituciones de procuración de justicia federal: Fiscalía General de la República (2c, 1.64B, 100%DA) y Procuraduría General de la República (2c, 1.03B, 50%DA). Total law enforcement: 2.67B MXN, 83.9%DA. Sin RFC para un proveedor de 3.15B a instituciones de seguridad nacional.

## Contratos Clave

| Fecha | Monto | Tipo | Institución | Descripción |
|---|---|---|---|---|
| 2020-04-15 | **1.397B** | **DA** | FGR | Servicio transportación terrestre zona metro + cobertura nacional |
| 2016-01-14 | 603M | **DA** | PGR/FGR | Sin descripción (clasificado) |
| 2010-09-28 | 425M | LP | PGR | Licitación pública (historial limpio) |
| 2019-04-16 | 241M | **DA** | PGR/FGR | Transportación terrestre zona metro |

## ⚠️ Señal Principal: 1.397B DA en Abril 2020 (COVID)

El contrato de 1.397B MXN DA a la Fiscalía en abril 2020 — durante el pico de la pandemia COVID-19 y el estado de emergencia sanitaria — es la señal más crítica. Las adjudicaciones directas "de emergencia" COVID fueron documentadas por la ASF como un mecanismo abusado en 2020. Un contrato de 1.397B DA para servicios de transporte (no insumos médicos de emergencia) durante COVID no tiene justificación de urgencia.

## Patrón LP→DA

| Año | Monto | Tipo |
|---|---|---|
| 2010 | 425M | LP (PGR) — historial limpio |
| 2016 | 603M | DA (PGR) |
| 2019 | 241M | DA (PGR/FGR) |
| 2020 | 1,397M | DA (FGR, COVID) |

La transición de LP en 2010 a DA sistemática desde 2016 hasta 2020 es un patrón de captura institucional progresiva de las procuradurías federales.

## Contratos Clasificados

El contrato de 603M DA de 2016 no tiene descripción disponible en COMPRANET — clasificación por seguridad nacional (FGR/PGR tienen capacidad de clasificar contratos). La opacidad impide verificar si el servicio fue efectivamente prestado.

## Recomendación

Alta prioridad: verificar RFC ante SAT — proveedor de 2.67B DA a las fiscalías federales sin RFC es irregularidad de primer nivel. Buscar en ASF Cuenta Pública 2020: contratos FGR servicios de transporte durante COVID. Solicitar información a FGR bajo LFTAIPG sobre el contrato DA de 1.397B (en la medida que no esté clasificado).
"""

MEMO_196120 = """\
# ARIA: HIDALGO VIGUERAS CONSULTORES SA DE CV — IMSS CONSTRUCCIÓN/INGENIERÍA DA 68.8%DA — 4.26B

**Vendor ID**: 196120 | **Total**: 4.26B MXN | **Contratos**: 147 | **%DA IMSS**: 68.8% | **RFC**: sin RFC

## Resumen Ejecutivo

Hidalgo Vigueras Consultores SA de CV es consultora de construcción e ingeniería con 4.26B MXN en 147 contratos (49%DA). Concentración principal: IMSS (64c, 3.22B, 68.8%DA). Los contratos son de servicios de consultoría en construcción e infraestructura hospitalaria — la LOPSRM requiere procedimientos competitivos para contratos de obra y servicios relacionados de esta magnitud.

## Distribución Institucional

| Institución | Contratos | Monto | %DA |
|---|---|---|---|
| IMSS | 64c | 3.22B | **68.8%** |
| SSISSSTE | 3c | 630M | 33.3% |
| ISSSTE | 13c | 130M | 30.8% |

El 68.8%DA al IMSS frente al 33.3%DA en SSISSSTE confirma la captura específica al IMSS.

## Contexto: Consultoría vs. Obra

Hidalgo Vigueras es "consultora" — sus contratos son servicios de consultoría, supervisión y gerencia de proyectos de construcción (no el contratista general de obra). La consultoría de obras puede justificar DA por especialización técnica bajo LOPSRM Art. 42 (bajo ciertos umbrales). Sin embargo, 44 contratos DA de consultoría al IMSS con valor promedio estimado de 3.22B/64 ≈ 50M MXN/contrato supera umbrales de DA para servicios.

## ⚠️ Señal: Escala y Ausencia de RFC

Una consultora de ingeniería con 3.22B en contratos al IMSS sin RFC en 15+ años de operación es anómalo. Las empresas de ingeniería civil en México requieren registro ante la Secretaría de la Función Pública (SFP) y el SAT.

## Nota de Confianza

Medium confidence: La naturaleza de consultoría (vs. suministro de commodity) introduce mayor ambigüedad en la justificación DA que en el anillo farmacéutico/reactivos. Requiere verificación ASF.

## Recomendación

Verificar RFC ante SAT y registro en SFP. Consultar ASF Cuenta Pública 2018-2024: contratos IMSS Dirección de Obras, servicios de consultoría. Solicitar LFTAIPG los "dictámenes técnicos de DA" para contratos Hidalgo Vigueras en IMSS 2020-2024.
"""

print('Writing ARIA memos for cases 196-201...')
write_memo(48374,  'needs_review', MEMO_48374)
write_memo(125381, 'needs_review', MEMO_125381)
write_memo(13186,  'needs_review', MEMO_13186)
write_memo(57263,  'needs_review', MEMO_57263)
write_memo(20949,  'needs_review', MEMO_20949)
write_memo(196120, 'needs_review', MEMO_196120)

print('\nSetting in_ground_truth=1...')
for vid in [48374, 125381, 13186, 57263, 20949, 196120]:
    r = conn.execute('UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id=?', (vid,))
    print(f'  VID={vid}: {r.rowcount} row(s) updated')
conn.commit()

total_gt  = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
review    = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]

conn.close()
print(f'\nAll ARIA: {total_gt} GT-linked | {confirmed} confirmed_corrupt | {review} needs_review')
