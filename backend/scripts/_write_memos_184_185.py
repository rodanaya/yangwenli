"""Write ARIA memos for GT cases 184-185: CASA PLARRE anesthesia DA and LOS CHANEQUES hospital food DA."""
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


MEMO_6842 = """\
# ARIA: CASA PLARRE SA DE CV — IMSS+ISSSTE SERVICIO INTEGRAL DE ANESTESIA DA 6.18B (46.5%DA, 82.5%DA EN ISSSTE)

**Vendor ID**: 6842 | **Total**: 6.18B MXN | **Contratos**: 570 | **%DA ISSSTE**: 82.5% | **RFC**: sin RFC

## Resumen Ejecutivo

Casa Plarre SA de CV es proveedora del "Servicio Integral de Anestesia y Dosificación de Gas" para hospitales del IMSS (266c, 2.50B, 42%DA) e ISSSTE (40c, 2.06B, 83%DA). La señal crítica: **transición documentada de 0%DA (2002-2010) a 46-91%DA (2011-2025)** coincidiendo con el modelo de subrogación de servicios hospitalarios especializados.

## Evolución Temporal de DA — Señal de Captura Institucional

| Período | %DA | Comentario |
|---|---|---|
| 2002-2010 | 0% | Histórico limpio — solo LP |
| 2011-2012 | 59-60% | Inicio abrupto de DA |
| 2019 | **91.3%** | Máximo histórico |
| 2020 | 87.5% | Contratos COVID-DA |
| 2023 | 72.5% | Sostenido |
| 2024 | **86.5%** | Escalada reciente |

## Contratos ISSSTE Más Relevantes (82.5%DA)

| Fecha | Monto | Tipo | Descripción |
|---|---|---|---|
| 2022-04-01 | 565.6M | **DA** | SERVICIO INTEGRAL DE ANESTESIA O DOSIFICACION DE GAS |
| 2023-07-01 | 343.6M | **DA** | SERVICIO INTEGRAL DE ANESTESIA O DOSIFICACIÓN DE GAS |
| 2020-05-01 | 303.2M | **DA** | SERVICIO INTEGRAL DE ANESTESIA O DOSIFICACIÓN DE GAS |

## ⚠️ Señal de Alerta Principal

Los gases medicinales y el mantenimiento de equipos de anestesia son servicios/productos NO exclusivos. Múltiples empresas (Air Liquide, Linde, Praxair, Air Products) proveen gases medicinales con equipos integrados. La justificación LAASSP Art. 41 de exclusividad técnica NO aplica para gases medicinales de uso general. La transición 0%→82%DA documenta el desarrollo de una relación institucional privilegiada, no una necesidad técnica.

## Contexto: Subrogación Hospitalaria IMSS/ISSSTE

El modelo de "servicio integral de anestesia" (proveedor externo instala y mantiene equipos de anestesia y provee gases) fue introducido bajo el modelo de subrogación en ~2011. Casa Plarre aparentemente capturó esta modalidad en IMSS e ISSSTE. La captura se manifestó en: renovaciones vía DA ("continuidad de servicio") en lugar de relicitaciones competitivas.

## Recomendación ALTA PRIORIDAD

1. Verificar RFC de Casa Plarre ante SAT — 6.18B sin RFC es irregularidad documentable
2. Consultar ASF Cuenta Pública 2022 y 2023: contratos ISSSTE Dirección Médica (anestesia)
3. Investigar si la transición 2011 coincide con cambio de dirección en IMSS/ISSSTE
4. Buscar competidores en licitaciones de gas anestesia IMSS 2010-2011 para comparar precios unitarios pre/post transición
"""

MEMO_61263 = """\
# ARIA: PROCESADORA LOS CHANEQUES — ISSSTE+IMSS-BIENESTAR VÍVERES HOSPITALARIOS DA 5.4B (58.6%DA ISSSTE, 80%DA IMSS-Bienestar)

**Vendor ID**: 61263 | **Total**: 5.40B MXN | **Contratos**: 499 | **%DA ISSSTE**: 58.6% | **RFC**: sin RFC

## Resumen Ejecutivo

Procesadora y Distribuidora Los Chaneques SA de CV es proveedora de víveres (alimentos) para hospitales del ISSSTE y del IMSS-Bienestar. 499 contratos (2012-2025), 5.40B MXN, 43.1%DA. ISSSTE representa 2.565B al 58.6%DA; IMSS-Bienestar (SSIMSS) 1.244B al 80%DA. En 2025: volumen de 2.537B (47% de todo el historial en 1 año).

## Contratos Principales

| Fecha | Monto | Tipo | Institución | Descripción |
|---|---|---|---|---|
| 2025-05-09 | 1.075B | **LP** | ISSSTE | CONTRATACIÓN ABIERTA DEL SERVICIO DE SUMINISTRO Y... |
| 2025-01-15 | 0.487B | **DA** | IMSS-Bienestar | SERVICIO DE SUMINISTRO DE VÍVERES PARA LOS HOSPITALES |
| 2018-08-01 | 0.483B | LP | ISSSTE | ADQUISICIÓN CONSOLIDADA DE PRODUCTOS ALIMENTICIOS |
| 2023-12-22 | 0.452B | **DA** | ISSSTE | SUMINISTRO Y DISTRIBUCIÓN DE PRODUCTOS ALIMENTICIOS |
| 2025-04-01 | 0.405B | LP | IMSS-Bienestar | SERVICIO DE SUMINISTRO DE VÍVERES PARA LOS HOSPITALES |
| 2025-09-01 | 0.216B | **DA** | IMSS-Bienestar | SERVICIO DE SUMINISTRO DE VÍVERES IMSS-Bienestar |

## ⚠️ Señal de Alerta Principal

Víveres y alimentos para hospitales son **artículos de consumo básico** con múltiples proveedores. LAASSP Art. 26 BIS permite DA para suministros urgentes de emergencia, pero no para contratos recurrentes de víveres. El 80%DA en IMSS-Bienestar (nueva institución del gobierno AMLO, 2019-actual) sugiere captura de las nuevas relaciones de abastecimiento del IMSS-Bienestar desde su creación.

## Patrón IMSS-Bienestar

IMSS-Bienestar se creó en 2019-2021 bajo AMLO para transformar la atención primaria. Al ser una institución nueva sin historial de contratos establecido, fue particularmente vulnerable a captura por distribuidores con acceso a funcionarios clave. Los Chaneques tiene 80%DA en esta institución vs 58.6% en el ISSSTE de mayor antigüedad.

## Explosión 2025

2.537B en 2025 = 47% de todo el historial acumulado en un solo año. Este crecimiento explosivo — sin RFC — es consistente con una relación proveedor-institución que se consolida rápidamente al comienzo del sexenio Sheinbaum.

## Recomendación

Verificar RFC ante SAT. Comparar precios unitarios de víveres Los Chaneques vs proveedores LP del IMSS en el mismo período (¿sobreprecio?). Consultar ASF Cuenta Pública 2023 para contratos ISSSTE y IMSS-Bienestar de alimentos. Buscar "Los Chaneques" en investigaciones periodísticas sobre abastecimiento hospitalario.
"""

print('Writing ARIA memos for cases 184-185...')
write_memo(6842,  'needs_review', MEMO_6842)
write_memo(61263, 'needs_review', MEMO_61263)

print('\nSetting in_ground_truth=1...')
for vid in [6842, 61263]:
    r = conn.execute('UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id=?', (vid,))
    print(f'  VID={vid}: {r.rowcount} row(s) updated')
conn.commit()

total_gt  = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
review    = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]

conn.close()
print(f'\nAll ARIA: {total_gt} GT-linked | {confirmed} confirmed_corrupt | {review} needs_review')
