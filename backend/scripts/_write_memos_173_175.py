import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

# ── Helper ─────────────────────────────────────────────────────────────────────

def write_memo(vendor_id, review_status, memo_text):
    existing = conn.execute(
        'SELECT id FROM aria_queue WHERE vendor_id=?', (vendor_id,)
    ).fetchone()
    if existing:
        conn.execute(
            '''UPDATE aria_queue
               SET memo_text=?, review_status=?, in_ground_truth=1, memo_generated_at=?
               WHERE vendor_id=?''',
            (memo_text, review_status, now, vendor_id),
        )
        print(f'  VID={vendor_id}: updated existing aria_queue row (status={review_status})')
    else:
        conn.execute(
            '''INSERT INTO aria_queue
               (vendor_id, memo_text, review_status, in_ground_truth, ips_tier, ips_final, computed_at)
               VALUES (?,?,?,1,2,0.4,?)''',
            (vendor_id, memo_text, review_status, now),
        )
        print(f'  VID={vendor_id}: inserted new aria_queue row (status={review_status})')
    conn.commit()


# ── Memos ──────────────────────────────────────────────────────────────────────

MEMO_506 = """\
# ARIA: FARMACOS ESPECIALIZADOS — CENSIDA VIH/SIDA DA 2.35B (100% adjudicación directa)

**Vendor ID**: 506 | **Total**: 12.42B MXN | **Contratos**: 1,399 | **%DA CENSIDA**: 100% | **RFC**: sin RFC

## Resumen Ejecutivo

Farmacos Especializados SA de CV es un distribuidor farmacéutico con 1,399 contratos (2002-2019) por 12.42B MXN. Patrón bimodal: suministro legítimo a IMSS (767c, 3.71B, 2%DA via LP) e ISSSTE (62c, 3.53B, 8%DA) versus monopolio DA en CENSIDA (9c, 2.35B, 100%DA).

## Contratos CENSIDA (Adjudicación Directa)

| Fecha | Monto | Tipo | Descripción |
|---|---|---|---|
| 2012-04-17 | 621M | **DA** | Antirretrovirales VIH |
| 2011-06-06 | 528M | **DA** | Antirretrovirales VIH |
| 2010-07-15 | 450M | **DA** | Antirretrovirales VIH |
| 2010-10-25 | 450M | **DA** | Antirretrovirales VIH |
| 2011-04-29 | 130M | **DA** | Antirretrovirales VIH |

## ⚠️ Señal de Alerta Principal

CENSIDA es donde México compra medicamentos antirretrovirales para VIH/SIDA. Los ARVs son medicamentos de alto costo (USD 10,000+/paciente/año). La ley LAASSP exige licitación competitiva excepto para patentes exclusivas. Farmacos Especializados NO es fabricante — es distribuidor, por lo que no existe justificación de patente para DA.

## Contexto de Patrón

El mismo proveedor recibe contratos LP legítimos de IMSS/ISSSTE (suma 7.24B, 2-8%DA), pero CENSIDA le otorga DA exclusiva. PEMEX Corporativo también: 216c, 0.96B, 79%DA. Múltiples instituciones con patrones DA elevados sugieren relaciones institucionales privilegiadas.

## Conexión: GRUPO FARMACOS ESPECIALIZADOS

GRUPO FARMACOS ESPECIALIZADOS (VID=29277, 133.36B, confirmed_corrupt) es probablemente entidad relacionada — mismo nombre de marca, potencialmente la empresa madre. Investigar si comparten RFC, socios o representantes legales.

## Recomendación

Solicitar registros de licitación en CENSIDA 2010-2013. Verificar si los ARVs adquiridos corresponden a marcas patentadas (única justificación DA) o genéricos (que deben licitarse). Cruzar con reportajes de Proceso/MCCI sobre CENSIDA VIH.
"""

MEMO_57548 = """\
# ARIA: COMERCIALIZADORA MILENIO — SCT CONCENTRACIÓN 13.97B (2014-2015)

**Vendor ID**: 57548 | **Total**: 13.97B MXN | **Contratos**: 39 | **%DA**: 2.6% | **RFC**: sin RFC

## Resumen Ejecutivo

Comercializadora Milenio SA de CV recibió 13.97B MXN en 39 contratos con concentración extrema en SCT (Secretaría de Comunicaciones y Transportes): 27 contratos, 13.56B MXN, 97% del total, durante 2014-2015. Empresa "comercializadora" (trading/distribución) sin RFC recibiendo 13.56B de SCT en 2 años.

## Contratos SCT Más Relevantes

| Fecha | Monto | Tipo |
|---|---|---|
| 2015-05-19 | 3,401M | LP |
| 2014-10-16 | 1,965M | LP |
| 2015-11-30 | 1,072M | **DA** |
| 2015-11-17 | 472M | LP |
| 2015-10-07 | 472M | LP |
| 2015-09-30 | 407M | LP |

## ⚠️ Señal de Alerta Principal

Una "comercializadora" sin RFC recibiendo 13.56B de SCT en 2014-2015 sin descripción de contratos disponible es inusual. SCT típicamente contrata constructoras especializadas, no intermediarios comerciales. El patrón de múltiples contratos LP de montos similares en Q3-Q4 2015 sugiere posible segmentación para mantenerse bajo umbrales de revisión.

## Limitación de Análisis

Sin descripciones de contrato en COMPRANET (datos Estructura B) no es posible confirmar qué bien/servicio se adquirió. Posibles hipótesis: (1) materiales/equipamiento para carreteras/telecom SCT vía distribuidor, (2) esquema de facturación por intermediario. PRIORIDAD BAJA hasta obtener detalles de contratos.

## Recomendación

Verificar en portal COMPRANET 5.0 descripción de contratos 2014-2015 SCT para Comercializadora Milenio. Buscar en prensa: "Comercializadora Milenio SCT" contratos. Solicitar datos bajo LFTAIPG a SCT Dirección de Adquisiciones.
"""

MEMO_64 = """\
# ARIA: EFECTIVALE SA DE CV — VALES GOBIERNO 15.25B (ECOSISTEMA VOUCHER 2002-2010)

**Vendor ID**: 64 | **Total**: 15.25B MXN | **Contratos**: 1,151 | **%DA**: 0% | **RFC**: sin RFC

## Resumen Ejecutivo

Efectivale SA de CV es el predecesor histórico del monopolio de vales de gobierno documentado en RUBLI (Caso 15: EDENRED, TOKA, SI VALE). Recibió 15.25B MXN en 1,151 contratos vía Licitación Pública entre 2002-2010. Ecosistema Efectivale → SI VALE MEXICO → EDENRED MEXICO → TOKA INTERNACIONAL: el mismo monopolio institucional de vales con diferentes marcas a lo largo de 23 años.

## Contratos Más Relevantes

| Fecha | Monto | Institución |
|---|---|---|
| 2008-12-18 | 5,448M | ISSSTE |
| 2008-05-02 | 1,076M | PROFECO |
| 2009-12-31 | 356M | Policía Federal |
| 2008-12-30 | 338M | Policía Federal Preventiva |
| 2008-12-17 | 317M | Finanzas Estado de México |

## Contexto: Monopolio de Vales Pre-2010

El contrato de 5.4B MXN con ISSSTE (diciembre 2008) es el mayor contrato individual de vales de beneficio en el dataset pre-2010. Efectivale es una marca Edenred (empresa francesa). Que la misma empresa mantenga el monopolio de vales federales bajo diferentes nombres durante 23 años (2002-2025) es el patrón de captura institucional documentado:
- 2002-2010: EFECTIVALE (15.25B)
- 2011-2018: SI VALE MEXICO (15.92B, en GT)
- 2011-2025: EDENRED MEXICO (38.73B, en GT)
- 2003-2025: TOKA INTERNACIONAL (53.11B, en GT)

## Evaluación de Riesgo

Los contratos son LP (técnicamente competitivos), pero el monopolio de facto durante 23 años para un mismo grupo económico (Edenred/Ticket Restaurant) con 4 entidades diferentes sugiere barreras de entrada sistemáticas en licitaciones de vales federales.

## Recomendación

Completar la investigación del ecosistema voucher: EFECTIVALE + SI VALE + EDENRED + TOKA = ~122B MXN en 23 años al mismo consorcio. Investigar si las licitaciones ISSSTE/PROFECO/PF para vales 2002-2010 tenían competencia real o términos restrictivos que favorecían a Edenred.
"""

# ── Write memos ────────────────────────────────────────────────────────────────

print('Writing ARIA memos for new GT vendors...')

write_memo(506,   'needs_review', MEMO_506)
write_memo(57548, 'needs_review', MEMO_57548)
write_memo(64,    'needs_review', MEMO_64)

# ── Ensure in_ground_truth=1 for all three ─────────────────────────────────────

print('\nSetting in_ground_truth=1...')
for vid in [506, 57548, 64]:
    r = conn.execute('UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id=?', (vid,))
    print(f'  VID={vid}: {r.rowcount} row(s) updated')
conn.commit()

# ── Final stats ────────────────────────────────────────────────────────────────

total_gt  = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute(
    "SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'"
).fetchone()[0]
review    = conn.execute(
    "SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'"
).fetchone()[0]

conn.close()
print(f'\nAll ARIA: {total_gt} GT-linked | {confirmed} confirmed_corrupt | {review} needs_review')
