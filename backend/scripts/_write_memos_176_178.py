"""Write ARIA investigation memos for GT cases 176-178:
Sodexo voucher ecosystem, Servicios Industriales IMSS security, GAMI Ingenieria DA."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()


def write_memo(vendor_id, review_status, memo_text):
    existing = conn.execute(
        'SELECT id FROM aria_queue WHERE vendor_id=?', (vendor_id,)
    ).fetchone()
    if existing:
        conn.execute(
            '''UPDATE aria_queue
               SET memo_text=?, review_status=?, in_ground_truth=1, memo_generated_at=?, computed_at=?
               WHERE vendor_id=?''',
            (memo_text.strip(), review_status, now, now, vendor_id),
        )
        print(f'  VID={vendor_id}: updated existing aria_queue row (status={review_status})')
    else:
        vs = conn.execute(
            'SELECT avg_risk_score, total_value_mxn, total_contracts, primary_sector_id FROM vendor_stats WHERE vendor_id=?',
            (vendor_id,)
        ).fetchone()
        rs  = vs[0] if vs else 0.5
        tv  = vs[1] if vs else 0
        tc  = vs[2] if vs else 0
        sec = vs[3] if vs else 1
        vname = conn.execute('SELECT name FROM vendors WHERE id=?', (vendor_id,)).fetchone()
        vname = vname[0] if vname else str(vendor_id)
        tier = 'tier_1' if rs >= 0.50 else ('tier_2' if rs >= 0.30 else 'tier_3')
        conn.execute(
            '''INSERT INTO aria_queue
               (vendor_id, vendor_name, avg_risk_score, total_value_mxn, total_contracts,
                primary_sector_id, ips_tier, review_status, in_ground_truth,
                memo_text, memo_generated_at, computed_at)
               VALUES (?,?,?,?,?,?,?,?,1,?,?,?)''',
            (vendor_id, vname, rs, tv, tc, sec, tier, review_status,
             memo_text.strip(), now, now),
        )
        print(f'  VID={vendor_id}: inserted new aria_queue row (status={review_status})')
    conn.commit()


# ──────────────────────────────────────────────────────────────────────────────
# VID=474 — SODEXO MOTIVATION SOLUTIONS
# ──────────────────────────────────────────────────────────────────────────────

MEMO_474 = """\
# ARIA: SODEXO MOTIVATION SOLUTIONS — ECOSISTEMA VOUCHER GOBIERNO 8.79B (23 AÑOS)

**Vendor ID**: 474 | **Total**: 8.79B MXN | **Contratos**: 1,215 | **%DA**: 37.8% | **RFC**: sin RFC

## Resumen Ejecutivo

Sodexo Motivation Solutions México SA de CV es el quinto actor del monopolio de vales de gobierno documentado en RUBLI: Efectivale (15.25B, 2002-2010) + TOKA (53.11B, GT) + SI VALE (15.92B, GT) + EDENRED (38.73B, GT) + SODEXO (8.79B) = ~131B MXN al mismo consorcio francés en 23 años. Sodexo (Pluxee/Pass brand en México) opera en múltiples sectores: SEP, CONAGUA, Luz y Fuerza, Correos, FGR.

## Instituciones Principales

| Institución | Contratos | Monto | %DA |
|---|---|---|---|
| Secretaría de Salud | 8 | 1.44B | 38% |
| CONAGUA | 131 | 0.69B | 15% |
| Luz y Fuerza del Centro | 5 | 0.66B | 0% |
| Correos/SEPOMEX | 4 | 0.63B | 25% |
| FGR | 3 | 0.61B | 33% |

## ⚠️ Señal de Alerta: Splitting + Combustible Atípico

**SSalud diciembre 2010**: dos contratos DA de 623M cada uno en días consecutivos (10 y 7 de diciembre) = 1.246B total. Patrón de splitting: dos adjudicaciones directas de monto idéntico a la misma institución en 48 horas sugiere evasión de umbral de aprobación superior.

**FGR 2020**: 280M DA para "Adquisición de combustible" — Sodexo es empresa de vales de servicio, no distribuidora de combustible. Posible uso de vales de gasolina (como Sodexo Fuel) pero clasificado en COMPRANET como adquisición de combustible directo.

## Ecosistema de Monopolio de Vales

El mismo conglomerado francés (Edenred/Sodexo) capturó el mercado de vales de beneficio federal durante 23 años bajo 5+ entidades diferentes. Las licitaciones para vales de despensa/gasolina/beneficio federal consistentemente resultan en los mismos proveedores, sugiriendo términos de licitación que favorecen a los grandes operadores.

## Recomendación

Investigar las dos adjudicaciones diciembre 2010 a SSalud. Cruzar con el caso CENEVAL/TOKA de captura institucional educativa. Buscar en COFECE si se ha investigado el mercado de vales de beneficio gobierno federal para prácticas anticompetitivas.
"""

# ──────────────────────────────────────────────────────────────────────────────
# VID=2214 — SERVICIOS INDUSTRIALES E INSTITUCIONALES
# ──────────────────────────────────────────────────────────────────────────────

MEMO_2214 = """\
# ARIA: SERVICIOS INDUSTRIALES E INSTITUCIONALES — SEGURIDAD SUBROGADA IMSS 11.51B (24 AÑOS)

**Vendor ID**: 2214 | **Total**: 11.51B MXN | **Contratos**: 788 | **%DA**: 32.2% | **RFC**: sin RFC

## Resumen Ejecutivo

Servicios Industriales e Institucionales SA de CV provee "Servicio de Seguridad Subrogada" (guardias de seguridad) a hospitales IMSS desde 2002. 11.51B MXN en 788 contratos durante 24 años. ALERTA 2025: 53 contratos por 3.19B MXN al 74% adjudicación directa — el año de mayor valor y mayor porcentaje DA en la historia del proveedor.

## Patrón de Escalamiento DA

| Año | Contratos | Monto | %DA |
|---|---|---|---|
| 2002-2016 | ~250 | ~4.5B | ~20% |
| 2017 | 76 | 1.41B | 64% |
| 2022 | 45 | 1.01B | 20% |
| 2024 | 28 | 1.45B | 21% |
| **2025** | **53** | **3.19B** | **74%** |

## ⚠️ Señal: SSIMSS 76% DA

SSIMSS (Servicios de Salud del IMSS) paga el 76% de sus contratos con este proveedor via adjudicación directa — 2.15B MXN sin licitación competitiva para guardar seguridad en hospitales. Servicios de seguridad de instalaciones NO son servicios especializados que justifiquen DA sistemático.

## Monopolio 24 Años sin RFC

Una empresa proveedora de servicios de seguridad activa durante 24 años con contratos IMSS crecientes pero SIN RFC es inusual. Sin RFC, no puede verificarse en SAT EFOS, SFP sanciones, ni registros fiscales.

## Recomendación

Investigar el pico 2025 (3.19B, 74%DA): ¿cambio de administración en IMSS que justifica DA? Verificar en ASF Cuenta Pública 2024-2025 contratos de seguridad IMSS. Solicitar RFC a IMSS vía LFTAIPG para validación SAT. Buscar en IMSS COMPRANET los expedientes de justificación DA para guarderías/hospitales.
"""

# ──────────────────────────────────────────────────────────────────────────────
# VID=139 — GAMI INGENIERIA E INSTALACIONES
# ──────────────────────────────────────────────────────────────────────────────

MEMO_139 = """\
# ARIA: GAMI INGENIERIA E INSTALACIONES — DA INFRAESTRUCTURA 4.15B ASIPONA + 2B ISSSTE

**Vendor ID**: 139 | **Total**: 14.2B MXN | **Contratos**: 60 | **%DA**: 11.7% | **RFC**: sin RFC

## Resumen Ejecutivo

GAMI Ingenieria e Instalaciones SA de CV es una empresa constructora de infraestructura con 24 años de actividad (2002-2025), 60 contratos, 14.2B MXN. La mayoría via LP (88.3%). FLAG PRINCIPAL: dos contratos DA de gran escala en 2020 y 2022 que suman 6.15B MXN.

## Contratos DA Principales

| Fecha | Monto | Tipo | Institución | Descripción |
|---|---|---|---|---|
| **2020-02-28** | **4,147M** | **DA** | **ASIPONA Manzanillo** | **Conclusión del Rompeolas Oeste** |
| **2022-12-06** | **1,999M** | **DA** | **ISSSTE** | Trabajos de Construcción |
| 2021-05-14 | 727M | LP | Sec. Infraestructura | Viaducto elevado |
| 2017-03-10 | 785M | LP | SCT | Carretera |

## ⚠️ Contrato ASIPONA 4.15B DA (2020)

"CONCLUSIÓN DEL ROMPEOLAS OESTE EN EL PUERTO DE MANZANILLO" — la terminación de un rompeolas (breakwater) en el mayor puerto de México (Manzanillo, Colima) via adjudicación directa por 4.15B es el mismo patrón documentado en CICSA/FONATUR (Caso 170): sobrecostos y extensiones de obras adjudicadas directamente como "conclusión" o "reconocimiento de trabajos extraordinarios". El contrato original debió licitarse; la "conclusión" se adjudica directamente al mismo contratista.

## Contexto ISSSTE 2B DA

Construcción de instalaciones ISSSTE via DA de 2B MXN en diciembre 2022 (fin de sexenio). Diciembre es mes de alta concentración de DA en el ciclo presupuestal.

## Recomendación

PRIORIDAD MEDIA: Investigar el contrato ASIPONA 2020 en ASF Cuenta Pública 2020. Verificar si existe contrato original para el Rompeolas Oeste licitado previamente (GAMI debería ser el contratista original). Buscar en DOF o COMPRANET el expediente de adjudicación directa ASIPONA 2020-02-28.
"""

# ──────────────────────────────────────────────────────────────────────────────
# Write memos
# ──────────────────────────────────────────────────────────────────────────────

print('Writing ARIA memos for GT cases 176-178...')
write_memo(474,  'needs_review', MEMO_474)
write_memo(2214, 'needs_review', MEMO_2214)
write_memo(139,  'needs_review', MEMO_139)

# ──────────────────────────────────────────────────────────────────────────────
# Ensure in_ground_truth=1 for all three
# ──────────────────────────────────────────────────────────────────────────────

print('\nSetting in_ground_truth=1...')
for vid in [474, 2214, 139]:
    r = conn.execute('UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id=?', (vid,))
    print(f'  VID={vid}: {r.rowcount} row(s) updated')
conn.commit()

# ──────────────────────────────────────────────────────────────────────────────
# Final stats
# ──────────────────────────────────────────────────────────────────────────────

total_gt  = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute(
    "SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'"
).fetchone()[0]
review    = conn.execute(
    "SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'"
).fetchone()[0]
total_q   = conn.execute('SELECT COUNT(*) FROM aria_queue').fetchone()[0]

conn.close()
print(f'\nARIA queue: {total_q} total | {total_gt} GT-linked | {confirmed} confirmed_corrupt | {review} needs_review')
