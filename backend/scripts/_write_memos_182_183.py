"""Write ARIA memos for GT cases 182-183: PEGSA Dos Bocas port DA and INGENIERIA Y CONTROL ISSSTE hospital DA."""
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
        print(f'  VID={vendor_id}: updated existing aria_queue row (status={review_status})')
    else:
        conn.execute('''INSERT INTO aria_queue
            (vendor_id, memo_text, review_status, in_ground_truth, ips_tier, ips_final, computed_at)
            VALUES (?,?,?,1,2,0.5,?)''',
            (vendor_id, memo_text, review_status, now))
        print(f'  VID={vendor_id}: inserted new aria_queue row (status={review_status})')
    conn.commit()


MEMO_56421 = """\
# ARIA: PEGSA CONSTRUCCIONES — ASIPONA DOS BOCAS EXPANSIÓN PORTUARIA DA 8.9B (2024-2025)

**Vendor ID**: 56421 | **Total**: 9.38B MXN | **Contratos**: 21 | **%DA ASIPONA**: 100% | **RFC**: sin RFC

## Resumen Ejecutivo

Pegsa Construcciones SA de CV recibió 8.903B MXN en 2 contratos de adjudicación directa de ASIPONA Dos Bocas (Administración del Sistema Portuario Nacional, Puerto Dos Bocas, Tabasco) en 2024-2025. Antes de 2024, Pegsa tenía un historial de 0.4B en contratos menores via LP en SCT y otras autoridades portuarias. El salto de 0.4B (LP, histórico) a 8.9B (100%DA, 2024-2025) en un solo puerto es altamente anómalo.

## Contratos ASIPONA Dos Bocas

| Fecha | Monto | Tipo | Descripción |
|---|---|---|---|
| 2024-06-13 | 0.935B | **DA** | CONSTRUCCIÓN DE LA AMPLIACIÓN DEL PUERTO DOS BOCAS |
| 2025-08-05 | 7.968B | **DA** | CONSTRUCCIÓN DE LA AMPLIACIÓN DEL PUERTO DOS BOCAS |

**Total ASIPONA Dos Bocas: 8.903B MXN, 100%DA**

## ⚠️ Contexto: Refinería Olmeca - Dos Bocas

Puerto Dos Bocas es el puerto adyacente a la Refinería Olmeca (PEMEX), el proyecto de infraestructura más grande del sexenio AMLO con presupuesto original de 8B USD (actual: 16B+ USD). ASF ha documentado irregularidades sistemáticas en la contratación del ecosistema Olmeca:
- Contratos DA sin justificación técnica
- Sobrecostos no autorizados por el Congreso
- Falta de transparencia en adjudicaciones portuarias complementarias

## Patrón de Riesgo: LP → DA explosivo en 2024-2025

| Período | Contratos | Valor | %DA |
|---|---|---|---|
| 2010-2023 | 19c | 0.478B | 5.3% |
| **2024-2025** | **2c** | **8.903B** | **100%** |

La transición de 5% DA a 100% DA coincide con la última etapa del sexenio AMLO (2024) y el inicio del sexenio Sheinbaum (2025), ambos períodos de continuidad política en Tabasco y en los proyectos del Sureste.

## Conexión: Ecosistema AMLO Mega-Proyectos

Patrón análogo al Caso 178 (GAMI INGENIERIA, 3.35B DA en FONATUR Tren Maya). Dos proyectos del mismo ecosistema político:
- FONATUR Tren Maya: GAMI y CICSA reciben DA reconocimiento sobrecostos
- ASIPONA Dos Bocas: PEGSA recibe 8.9B DA para ampliación portuaria

## Recomendación

Verificar en ASF Cuenta Pública 2024: Tomo de ASIPONA Dos Bocas, contratos de construcción portuaria. Consultar Transparencia PEMEX para relación entre PEMEX Transformación Industrial y contratos portuarios Dos Bocas. Buscar prensa: "Pegsa Construcciones Dos Bocas" o "ASIPONA ampliación 2024".
"""

MEMO_16573 = """\
# ARIA: INGENIERÍA Y CONTROL DE PROYECTOS — ISSSTE HOSPITAL DA 2.55B + IMSS 35%DA — 8.99B

**Vendor ID**: 16573 | **Total**: 8.99B MXN | **Contratos**: 42 | **%DA**: 30.9% | **RFC**: sin RFC

## Resumen Ejecutivo

Ingeniería y Control de Proyectos SA de CV es una constructora especializada en hospitales e infraestructura de salud: 8.99B MXN en 42 contratos (2003-2024). Señal principal: **ISSSTE 2.548B DA (noviembre 2022)** para construcción hospitalaria — el contrato DA individual de mayor monto para este tipo de empresa en el dataset de salud.

## Contratos Principales

| Fecha | Monto | Tipo | Institución | Descripción |
|---|---|---|---|---|
| **2022-11-30** | **2.548B** | **DA** | **ISSSTE** | **TRABAJOS PARA LLEVAR A CABO LA CONSTRUCCIÓN...** |
| 2022-09-09 | 1.361B | LP | IMSS | PROYECTO INTEGRAL PARA LA REESTRUCTURACIÓN... |
| 2018-12-28 | 1.527B | LP | IMSS | CONSTRUCCIÓN HOSPITALES |
| 2018-10-19 | 0.661B | LP | QRO-Salud | SUSTITUCIÓN HOSPITAL QUERÉTARO |
| 2017-08-14 | 0.430B | **DA** | Secretaría de Marina | Construcción hospital |

## ⚠️ Señal de Alerta Principal

El contrato DA de 2.548B MXN a ISSSTE en noviembre 2022 para construcción hospitalaria es el caso más claro: LAASSP Art. 41 no permite DA para obras de esta magnitud sin justificación excepcional documentada. El mismo contratista ganó un LP de 1.361B del IMSS en septiembre 2022 — 9 semanas después, ISSSTE le adjudicó directamente 2.548B.

## Patrón Temporal: Escalada de DA

| Período | %DA | Contratos |
|---|---|---|
| 2003-2016 | 0-0% | Mayormente LP |
| 2017 | 66.7% | Inicio de DA en salud |
| 2021 | 80.0% | Escalada |
| 2022 | 33.3% (global) / **100% ISSSTE** | Pico DA |

## Sin RFC en 22 años

Empresa constructora de hospitales federales con 9B en contratos sin RFC registrado en COMPRANET. Esto limita la trazabilidad ante SAT y dificulta la verificación de vínculos corporativos con los funcionarios que emitieron las adjudicaciones directas.

## Recomendación

Verificar en ASF Cuenta Pública 2022: contratos ISSSTE Dirección de Obras para noviembre 2022. El contrato de 2.548B DA debería aparecer en auditorías de la ASF si no tuvo procedimiento competitivo. Buscar RFC ante SAT. Investigar relación con funcionarios ISSSTE Subdirección de Infraestructura 2022.
"""

print('Writing ARIA memos for cases 182-183...')
write_memo(56421, 'needs_review', MEMO_56421)
write_memo(16573, 'needs_review', MEMO_16573)

print('\nSetting in_ground_truth=1...')
for vid in [56421, 16573]:
    r = conn.execute('UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id=?', (vid,))
    print(f'  VID={vid}: {r.rowcount} row(s) updated')
conn.commit()

total_gt  = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
review    = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]

conn.close()
print(f'\nAll ARIA: {total_gt} GT-linked | {confirmed} confirmed_corrupt | {review} needs_review')
