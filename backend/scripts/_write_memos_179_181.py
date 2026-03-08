"""Write ARIA memos for GT cases 179-181: IMSS pharma/hospital/dental DA ring."""
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


MEMO_6222 = """\
# ARIA: PRODUCTOS HOSPITALARIOS SA DE CV — IMSS MATERIAL ESTÉRIL/CURACION DA 12.42B (66.7%DA, 1607 contratos)

**Vendor ID**: 6222 | **Total**: 12.42B MXN | **Contratos**: 1,607 | **%DA**: 66.7% | **RFC**: sin RFC

## Resumen Ejecutivo

Productos Hospitalarios SA de CV es distribuidor de material estéril y hospitalario con 1,607 contratos (2002-2025) por 12.42B MXN. Patrón central: IMSS (1,086 contratos, 8.15B, 68%DA) e INP Instituto Nacional de Pediatría (48 contratos, 1.15B, 44%DA). Integra el anillo documentado de distribuidores farmacéuticos/hospitalarios del IMSS con DA sistemática.

## Contratos Más Relevantes (IMSS)

| Fecha | Monto | Tipo | Descripción |
|---|---|---|---|
| 2016-01-01 | ~400M | **DA** | MATERIAL DE CURACION |
| 2017-01-01 | ~350M | **DA** | ARTICULOS ESTERILES |
| 2018-01-01 | ~310M | **DA** | MATERIAL PARA LABORATORIO |
| (varios) | 1-200M | **DA** | MATERIAL MÉDICO-QUIRÚRGICO |

## ⚠️ Señal de Alerta Principal

Material de curación y artículos estériles son productos de consumo estandarizados (vendas, guantes, jeringas, catéteres) que requieren licitación pública competitiva por LAASSP. No son medicamentos patentados ni servicios exclusivos. El 68% de DA en IMSS durante 23 años para un distribuidor sin RFC es injustificable bajo LAASSP Art. 41.

## Contexto: Anillo de Abastecimiento IMSS

Productos Hospitalarios forma parte del anillo documentado junto con:
- **GRUPO FARMACOS ESPECIALIZADOS** (VID=29277, 133B, confirmed_corrupt, Caso 6)
- **FARMACOS ESPECIALIZADOS** (VID=506, 12.42B, needs_review, Caso 173)
- **COMERCIALIZADORA PRODUCTOS INSTITUCIONALES** (VID=4636, 23.41B, Caso 168)
- **SAVI DISTRIBUCIONES** (VID=3846, 17.15B, Caso 167)
- **DENTILAB** (VID=4377, 5.3B, Caso 180)
- **MEDIGROUP DEL PACIFICO** (VID=19927, 3.66B, Caso 181)

Suma del anillo identificado: ~195B MXN en abastecimiento médico/farmacéutico al IMSS con DA sistemática.

## Recomendación

Solicitar auditorías ASF Cuenta Pública 2016-2018 para IMSS Dirección de Prestaciones Médicas, contratos material de curación. Verificar RFC ante SAT EFOS. Investigar si existe RFC válido no capturado en COMPRANET.
"""

MEMO_4377 = """\
# ARIA: DENTILAB SA DE CV — IMSS MATERIAL DENTAL/LABORATORIO DA 5.3B (65.8%DA, 4368 contratos)

**Vendor ID**: 4377 | **Total**: 5.3B MXN | **Contratos**: 4,368 | **%DA**: 65.8% | **RFC**: sin RFC

## Resumen Ejecutivo

Dentilab SA de CV es el mayor distribuidor de material dental y reactivos de laboratorio para el IMSS en el dataset: 4,368 contratos (2002-2025) por 5.3B MXN. IMSS representa el 90% del total (3,795 contratos, 3.96B, 72%DA). Con 4,368 contratos, es uno de los proveedores de mayor cantidad de contratos individuales en el sistema COMPRANET.

## Contratos Más Relevantes (IMSS)

| Institución | Contratos | Monto | %DA |
|---|---|---|---|
| **IMSS** | 3,795 | 3.96B | 72% |
| ISSSTE | ~200 | ~0.5B | ~50% |
| Secretaría de Salud | ~150 | ~0.4B | ~40% |

Descripción dominante: MATERIAL DENTAL, MATERIAL DE LABORATORIO, REACTIVOS

## ⚠️ Señal de Alerta Principal

Material dental (instrumental odontológico, amalgamas, resinas) y reactivos de laboratorio (tiras reactivas, medios de cultivo) son artículos de consumo estandarizados con múltiples proveedores en el mercado. La ley LAASSP exige licitación. 72% de DA en IMSS durante 23 años = ~2,731 contratos sin concurso en el IMSS para el mayor sistema dental del sector salud federal.

## Volumen Anómalo

4,368 contratos individuales durante 23 años = promedio de ~190 contratos DA por año solo en material dental/laboratorio. Este patrón de alta frecuencia sugiere segmentación sistemática de contratos para mantenerse bajo umbrales de licitación obligatoria (treshold splitting).

## Anillo IMSS

Mismo patrón documentado que Productos Hospitalarios, Medigroup del Pacífico y Grupo Fármacos Especializados. Posibles conexiones corporativas (socios, representantes legales) por investigar.

## Recomendación

Cruzar contratos IMSS Dental 2010-2020 con DENTILAB SA DE CV. Verificar RFC ante SAT EFOS. Solicitar información bajo LFTAIPG a IMSS Dirección de Prestaciones Médicas — área dental. Comparar precios unitarios de material dental con licitaciones ISSSTE del mismo período para detectar sobrecosto.
"""

MEMO_19927 = """\
# ARIA: MEDIGROUP DEL PACIFICO SA DE CV — IMSS MEDICAMENTOS DA EXTREMO 3.66B (78.8%DA, 86%DA EN IMSS)

**Vendor ID**: 19927 | **Total**: 3.66B MXN | **Contratos**: 1,941 | **%DA IMSS**: 86% | **RFC**: sin RFC

## Resumen Ejecutivo

Medigroup del Pacífico SA de CV tiene la **tasa de adjudicación directa más alta** entre todos los distribuidores farmacéuticos/hospitalarios del anillo IMSS analizado: 86%DA en IMSS (vs 72% Dentilab, 68% Productos Hospitalarios, 66% Fármacos Especializados). 1,941 contratos (2003-2025) por 3.66B MXN; IMSS: 1,570 contratos, 2.89B MXN.

## Comparativa de DA en el Anillo IMSS

| Distribuidor | DA% IMSS | Valor IMSS | Status |
|---|---|---|---|
| **MEDIGROUP DEL PACIFICO** | **86%** | 2.89B | needs_review |
| DENTILAB | 72% | 3.96B | needs_review |
| PRODUCTOS HOSPITALARIOS | 68% | 8.15B | needs_review |
| FARMACOS ESPECIALIZADOS | 100% (CENSIDA) | — | needs_review |
| GRUPO FARMACOS ESP | ~60% | >133B | confirmed_corrupt |

## ⚠️ Señal de Alerta Principal — DA Extremo

86% DA en medicamentos para el IMSS es el caso más extremo del subgrupo farmacéutico. Los medicamentos de uso general (antibióticos, analgésicos, antidiabéticos) son artículos de consumo con múltiples fabricantes genéricos. Sin RFC. Sin patentes que justifiquen DA. Distribuidor del Pacífico (Sinaloa/Jalisco) con penetración a nivel nacional en IMSS: geografía inusual para un distribuidor regional con contratos tan dispersos institucionalmente.

## Patrón Temporal

22 años de suministro continuo (2003-2025) atravesando 4 administraciones presidenciales (Fox, Calderón, Peña Nieto, AMLO) sin interrupción = captura institucional profunda en el área de Farmacia del IMSS.

## Recomendación ALTA PRIORIDAD

MEDIGROUP DEL PACIFICO debe ser prioridad en investigación por ser el caso de DA extremo entre todos los distribuidores IMSS. Verificar: (1) RFC ante SAT EFOS, (2) domicilio fiscal y estado operativo ante SHCP, (3) relación con IMSS Delegaciones del Pacifico (Jalisco, Sinaloa, Nayarit), (4) socios o representantes legales que puedan vincular con casos ya documentados. Cruzar con investigaciones IMSS-INDICIADOS en el contexto de los escándalos de abastecimiento farmacéutico 2015-2019.
"""

print('Writing ARIA memos for cases 179-181...')
write_memo(6222,  'needs_review', MEMO_6222)
write_memo(4377,  'needs_review', MEMO_4377)
write_memo(19927, 'needs_review', MEMO_19927)

print('\nSetting in_ground_truth=1...')
for vid in [6222, 4377, 19927]:
    r = conn.execute('UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id=?', (vid,))
    print(f'  VID={vid}: {r.rowcount} row(s) updated')
conn.commit()

total_gt  = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
review    = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]

conn.close()
print(f'\nAll ARIA: {total_gt} GT-linked | {confirmed} confirmed_corrupt | {review} needs_review')
