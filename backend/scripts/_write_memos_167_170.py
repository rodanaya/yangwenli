"""Write ARIA memos for GT cases 167-170."""
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
            VALUES (?,?,?,1,2,0.4,?)''',
            (vendor_id, memo_text, review_status, now))
    conn.commit()
    print(f'Memo written VID={vendor_id} [{review_status}]')

# VID=3846: SAVI DISTRIBUCIONES
write_memo(3846, 'needs_review', '''# ARIA: SAVI DISTRIBUCIONES — IMSS+ISSSTE MEDICAL SUPPLY 17.15B (22%DA, 1213 contratos)

**Vendor ID**: 3846 | **Total**: 17.15B MXN | **Contratos**: 1,213 | **%DA**: 22.3% | **RFC**: sin RFC

## Resumen Ejecutivo

SAVI DISTRIBUCIONES SA de CV es un proveedor de largo plazo para IMSS (10.1B, 775 contratos) e ISSSTE (4.44B, 137 contratos) en materiales médicos y farmacéuticos. Opera durante 14 años sin RFC registrado. Sin DA extremo, pero patrón de proveedor cautivo institucional.

## Contratos Más Relevantes

| Fecha | Monto | Tipo | Institución |
|---|---|---|---|
| 2012-01-01 | 837M | LP | IMSS |
| 2013-01-01 | 786M | LP | IMSS |
| 2014-01-01 | 763M | LP | IMSS |
| 2013-11-20 | 618M | **DA** | **SEDENA** |

## ⚠️ Señal de Alerta Principal

Contrato de 618M MXN a SEDENA (Secretaría de la Defensa Nacional) en noviembre 2013 mediante adjudicación directa. Suministro médico/farmacéutico al ejército mexicano vía DA sin licitación competitiva.

## Patrón de Riesgo

Sin RFC + 14 años de suministro continuo a IMSS+ISSSTE + DA a SEDENA = proveedor institucional cautivo con acceso privilegiado al sistema de salud del gobierno federal.

## Recomendación

Comparar con COMERCIALIZADORA PRODUCTOS INSTITUCIONALES (Case 168, 23.41B mismo patrón). Solicitar RFC y verificar en SAT EFOS. Investigar licitaciones IMSS 2012-2014 para verificar competencia real.
''')

# VID=4636: COMERCIALIZADORA PRODUCTOS INSTITUCIONALES
write_memo(4636, 'needs_review', '''# ARIA: COMERCIALIZADORA PRODUCTOS INSTITUCIONALES — IMSS+ISSSTE MEDICINES 23.41B (27%DA, 1816 contratos, 24 años)

**Vendor ID**: 4636 | **Total**: 23.41B MXN | **Contratos**: 1,816 | **%DA**: 27.3% | **RFC**: sin RFC

## Resumen Ejecutivo

Comercializadora de Productos Institucionales SA de CV es el mayor proveedor no-RFC de medicamentos al IMSS en el dataset: 16.88B MXN en 1,146 contratos durante 24 años (2002-2025). ISSSTE: 5.73B adicionales. Sin interrupción en 24 años de suministro a instituciones federales de salud.

## Contratos Más Relevantes

| Fecha | Monto | Tipo | Descripción |
|---|---|---|---|
| 2018-01-01 | 1,011M | LP | MEDICAMENTOS |
| 2017-01-01 | 652M | LP | MEDICAMENTOS |
| 2019-01-01 | 544M | LIC | MEDICAMENTOS |
| 2015-01-01 | 475M | LP | MEDICAMENTOS |
| 2008-09-12 | 435M | LP | IMSS |

## ⚠️ Patrón de Monopolio de Largo Plazo

24 años sin interrupción como proveedor de IMSS e ISSSTE sin RFC registrado es el patrón más extremo del dataset para una empresa farmacéutica. Sin ninguna pausa en suministro durante 7 presidencias y múltiples cambios de administración.

## Riesgo Principal

Monopolio de facto a través de relación institucional profunda. La "continuidad operativa" se usa para justificar renovaciones DA. 27.3% DA no es extremo, pero en 1,816 contratos representa ~496 contratos no competitivos.

## Conexiones

Patrón idéntico a Caso 162 (AXTEL telecom 14.04B 71%DA) y Caso 160 (CENEVAL educación 3.98B 100%DA). Representan la clase de "monopolios institucionales de facto" en compras del gobierno federal.
''')

# VID=48: OCEANOGRAFIA
write_memo(48, 'confirmed_corrupt', '''# ARIA: OCEANOGRAFÍA SA de CV — FRAUDE PEMEX-BANAMEX 22.46B (50 contratos PEMEX E&P)

**Vendor ID**: 48 | **Total**: 22.46B MXN | **Contratos**: 50 | **%DA**: 0% | **RFC**: sin RFC

## ⚠️ CASO DOCUMENTADO: FRAUDE BANAMEX 2014 — $400-585M USD

## Resumen Ejecutivo

Oceanografía SA de CV recibió 22.46B MXN en 50 contratos exclusivamente de PEMEX Exploración y Producción (PEP) entre 2000-2014, mediante Licitación Pública. En febrero 2014, PEMEX canceló todos los contratos tras descubrirse el esquema: Oceanografía utilizó facturas/cuentas por cobrar falsas de PEMEX como garantía ante Banamex (Citigroup) para obtener financiamiento a corto plazo, causando pérdidas de $400-585M USD a Citigroup. Amado Yáñez Osuna (fundador) fue detenido.

## Contratos Más Relevantes (PEMEX E&P)

| Fecha | Monto | Tipo | Institución |
|---|---|---|---|
| 2007-09-20 | 4,875M | LP | PEMEX Exploración y Producción |
| 2008-02-01 | 2,341M | LP | PEMEX E&P |
| 2005-05-20 | 1,479M | LP | PEMEX E&P |
| 2006-09-04 | 1,339M | LP | PEMEX E&P |
| 2008-10-13 | 1,261M | LP | PEMEX E&P |

## Mecanismo del Fraude

1. Oceanografía gana contratos legítimos de PEMEX (servicios marítimos/submarinos)
2. Genera facturas infladas o ficticias contra PEMEX
3. Usa esas "cuentas por cobrar de PEMEX" como garantía en Banamex
4. Banamex otorga líneas de crédito a corto plazo
5. Oceanografía no paga → Banamex intenta cobrar a PEMEX → PEMEX niega legitimidad
6. Citigroup/Banamex anuncia pérdida de $400-585M USD (feb 2014)

## Impacto: 22.46B en contratos PEMEX (scale real, fraude en el esquema de financiamiento)
''')

# VID=36961: CICSA
write_memo(36961, 'needs_review', '''# ARIA: OPERADORA CICSA (GRUPO CARSO/SLIM) — NAICM+TREN MAYA 140.53B, DA OBRAS EXTRAORDINARIAS 3.35B

**Vendor ID**: 36961 | **Total**: 140.53B MXN | **Contratos**: 35 | **%DA**: 8.6% | **RFC**: sin RFC

## Resumen Ejecutivo

Operadora CICSA SA de CV (subsidiaria de Grupo Carso, Carlos Slim) es el contratista de infraestructura más grande del dataset: 140.53B MXN en 35 contratos para NAICM (aeropuerto cancelado) y Tren Maya (ferroviario activo). La mayoría via Licitación Pública legítima. FLAG PRINCIPAL: contrato DA por 3.35B en julio 2024 para "obras extraordinarias" de FONATUR Tren Maya.

## Contratos Principales

| Fecha | Monto | Tipo | Proyecto |
|---|---|---|---|
| 2017-02-13 | 84.83B | LIC | NAICM — Grupo Aeroportuario CDMX |
| 2025-09-30 | 27.45B | LIC | ARTF — Tren Saltillo-Nuevo Laredo 111km |
| 2020-05-12 | 15.99B | LIC | FONATUR — Tren Maya plataforma y vía |
| **2024-07-04** | **3.35B** | **AD** | **FONATUR Tren Maya — "RECONOCE TRABAJOS EXTRAORDINARIOS"** |
| 2016-11-07 | 7.36B | LP | NAICM |

## ⚠️ Contrato DA Principal

FONATUR TREN MAYA "RECONOCE LOS TRABAJOS EXTRAORDINARIOS Y LAS MODIFICACIONES AL CONTRATO..." — 3.35B MXN en adjudicación directa. Reconocimiento retroactivo de sobrecostos sin licitación competitiva. Mecanismo común de corrupción en megaproyectos: el concurso original es competitivo, pero los sobrecostos se "reconocen" via DA.

## Contexto: Conflicto de Interés

Carlos Slim/Grupo Carso fue contratista principal de ambos proyectos: NAICM (cancelado, $1.8B USD pagado/cancelado) y Tren Maya (~$7.5B USD presupuesto total). ASF ha auditado el Tren Maya repetidamente señalando irregularidades en contratos directos.

## Recomendación

Prioridad MEDIA: los contratos LP son legítimos. Investigar el DA de 3.35B de 2024 en ASF Cuenta Pública 2024. Cruzar con lista de contratos Tren Maya auditados por ASF.
''')

# Update ARIA flags for all 4 vendors
for vid in [3846, 4636, 48, 36961]:
    conn.execute('UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id=?', (vid,))
conn.commit()

total_gt = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
review = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
print(f'\nAll ARIA: {total_gt} GT-linked | {confirmed} confirmed_corrupt | {review} needs_review')
conn.close()
