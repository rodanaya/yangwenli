"""Write ARIA memos for GT cases 186-189: Televisa 100%DA, HISA pharma ring, Graficas Corona, Estratec."""
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


MEMO_131147 = """\
# ARIA: GRUPO TELEVISA SAB — PUBLICIDAD GUBERNAMENTAL 100%DA 2.33B (2014-2021)

**Vendor ID**: 131147 | **Total**: 2.33B MXN | **Contratos**: 149 | **%DA**: 100% | **RFC**: sin RFC

## Resumen Ejecutivo

Grupo Televisa SAB recibió 2.33B MXN en 149 contratos de **adjudicación directa al 100%** de múltiples agencias del gobierno federal para publicidad en televisión. Sin un solo contrato de licitación pública en 23 años de contrataciones con el gobierno. La relación gobierno-Televisa a través de contratos publicitarios DA es uno de los fenómenos de captura mediática más documentados en la historia reciente de México.

## Instituciones y Contratos

| Institución | Contratos | Monto | %DA |
|---|---|---|---|
| CPTM (Turismo) | 2 | 427M | 100% |
| IMSS | 8 | 229M | 100% |
| SEGOB | 20 | 185M | 100% |
| SEP | 1 | 172M | 100% |
| Otras | ~118 | ~1.3B | 100% |

Descripción: "CONTRATACIÓN DE ESPACIOS PUBLICITARIOS EN TELEVISIÓN RADIODIFUSIÓN"

## ⚠️ Señal de Alerta: 100% DA en Publicidad Mediática

El LAASSP Art. 26 y el Decreto de Austeridad requieren procedimientos competitivos para compra de publicidad. La compra directa de tiempo al aire en Televisa sin concursar con otros medios (TV Azteca, canal regional, plataformas digitales) es una violación sistemática. La DA masiva en publicidad oficial no refleja una necesidad técnica sino una relación política.

## Contexto: "Contrato Televisa" — Documentación de la Captura

La relación gobierno-Televisa durante el sexenio Peña Nieto (2012-2018) fue ampliamente documentada:
- **Fundar/AMEDI**: Publicidad oficial a Televisa = instrumento de control editorial
- **ARTICLE 19**: Denunció la distribución arbitraria de publicidad oficial como mecanismo de censura indirecta
- **ASF**: Encontró irregularidades en contratos de publicidad oficial en varios años de Cuenta Pública
- **Investigación parlamentaria 2018**: Se documentaron contratos DA a Televisa de SEP y otras dependencias

## Sin RFC

Televisa SAB tiene ingresos de ~$1.5B USD anuales. La ausencia de RFC en COMPRANET para sus contratos gubernamentales es una irregularidad adicional que dificulta el cruce con SAT.

## Recomendación

Consultar ASF Cuenta Pública 2014-2018 (contratos publicidad federal), COFECE investigación sobre posición dominante en publicidad, y reportes de Fundar "Dinero bajo la Mesa" sobre publicidad oficial.
"""

MEMO_42781 = """\
# ARIA: HISA FARMACEUTICA SA DE CV — IMSS DA EXTREMO 94.8% — 3.45B (RÉCORD DEL ANILLO FARMACÉUTICO IMSS)

**Vendor ID**: 42781 | **Total**: 3.45B MXN | **Contratos**: 2,010 | **%DA IMSS**: 94.8% | **RFC**: sin RFC

## Resumen Ejecutivo

Hisa Farmacéutica SA de CV tiene la **tasa de adjudicación directa más alta de todo el anillo de distribuidores farmacéuticos del IMSS**: 94.8%DA en 1,830 contratos con el IMSS (2.279B MXN). Superando a MEDIGROUP DEL PACIFICO (86%DA), DENTILAB (72%DA) y PRODUCTOS HOSPITALARIOS (68%DA). El 5.2% de contratos LP son en otros estados/instituciones — confirmando que la DA extrema es específica del IMSS, no una característica general del mercado.

## Comparativa del Anillo IMSS

| Distribuidor | DA% IMSS | Valor IMSS | Status |
|---|---|---|---|
| **HISA FARMACEUTICA** | **94.8%** | 2.28B | needs_review |
| MEDIGROUP DEL PACIFICO | 86% | 2.89B | needs_review |
| DENTILAB | 72% | 3.96B | needs_review |
| PRODUCTOS HOSPITALARIOS | 68% | 8.15B | needs_review |
| GRUPO FARMACOS ESP | ~60% | >133B | **confirmed_corrupt** |

## Patrón de Threshold Splitting

1,830 contratos IMSS con 2.279B = **promedio de 1.246M MXN por contrato DA**. Este valor es consistente con splitting: los contratos se dividen en montos menores al umbral de revisión de licitación (típicamente 3-5M MXN según el ejercicio fiscal). 94.8% de todos los contratos IMSS son DA — Hisa casi nunca participa en licitaciones del IMSS.

## Sin RFC — 15 Años de Operación

Empresa distribuidora farmacéutica al IMSS por 15+ años sin RFC en COMPRANET. La contraparte Tamaulipas usa LP (0%DA) para los mismos productos — confirma que el problema es institucional (IMSS), no técnico.

## Recomendación

Alta prioridad: verificar RFC ante SAT EFOS. 94.8%DA en 1,830 contratos es el indicador más extremo del anillo farmacéutico IMSS. Solicitar expedientes de "justificación de adjudicación directa" a IMSS para contratos Hisa 2015-2023. Comparar precios unitarios Hisa vs licitaciones IMSS del mismo período.
"""

MEMO_71174 = """\
# ARIA: GRAFICAS CORONA J.E. — TALLERES GRÁFICOS+IEPSA DA IMPRESIÓN GUBERNAMENTAL 2.14B (81.1%DA)

**Vendor ID**: 71174 | **Total**: 2.14B MXN | **Contratos**: 185 | **%DA**: 81.1% | **RFC**: sin RFC

## Resumen Ejecutivo

Gráficas Corona J.E. SA de CV recibió 2.14B MXN en 185 contratos al 81.1%DA, con una estructura institucional inusual: los principales clientes son las propias entidades de impresión del gobierno federal (TALLERES GRÁFICOS DE MÉXICO y la Impresora y Encuadernadora Progreso IEPSA), a quienes presta servicios via DA sin competencia.

## Estructura Institucional

| Institución | Contratos | Monto | %DA |
|---|---|---|---|
| TALLERES GRÁFICOS DE MÉXICO | 69 | 837M | **100%** |
| IEPSA (Impresora y Encuadernadora Progreso) | 47 | 751M | 89.4% |
| CONALITEG (libros de texto gratuito) | 38 | 226M | 57.9% |

## ⚠️ Señal Principal: Entidades Gubernamentales de Impresión → DA a Privado

TALLERES GRÁFICOS DE MÉXICO (Secretaría de Gobernación) e IEPSA son entidades del gobierno federal especializadas en impresión. Que estas entidades paguen 1.588B MXN via DA a una empresa privada (Gráficas Corona) para "SERVICIO INTEGRAL" sugiere externalización de su capacidad productiva a través de contrataciones no competitivas.

## Contratos Más Recientes (2024-2025 — Escalada)

- 368M DA a TALLERES GRÁFICOS (2024-11-07)
- 237M DA a IEPSA (2025-04-07)

La escalada en 2024-2025 es notable — los dos mayores contratos históricos se firmaron en el último año.

## Recomendación

Consultar ASF Cuenta Pública 2024 para TALLERES GRÁFICOS DE MÉXICO, contratos servicios de impresión. Verificar si Gráficas Corona tiene RFC. Investigar relación entre directivos de TALLERES GRÁFICOS y propietarios de Gráficas Corona.
"""

MEMO_6806 = """\
# ARIA: ESTRATEC SA DE CV — ISSSTE SERVICIOS ADMINISTRADOS IMPRESIÓN DA 3.14B (61%DA, 1.02B CONTRATO DA 2016)

**Vendor ID**: 6806 | **Total**: 3.14B MXN | **Contratos**: 482 | **%DA ISSSTE**: 66.7% | **RFC**: sin RFC

## Resumen Ejecutivo

Estratec SA de CV es proveedora de "servicios administrados de impresión, reproducción y digitalización" (Managed Print Services — MPS) para el ISSSTE y otras agencias federales. 3.14B MXN en 482 contratos (2002-2025), 61%DA. ISSSTE concentra el 57% del valor total con el contrato más grande: **1.022B DA (2016-03-04)** para servicios documentales.

## Contratos Principales

| Fecha | Monto | Tipo | Institución |
|---|---|---|---|
| 2016-03-04 | 1.022B | **DA** | ISSSTE |
| 2020-01-01 | 193M | **DA** | ISSSTE (Serv. Adm. Impresión) |
| (varios) | 50-150M | DA/LP | SEDENA, SRE, PRESIDENCIA |

## ⚠️ Señal: 1.022B DA Para Servicios de Fotocopiado/Impresión

Los servicios de impresión gestionados (MPS) son servicios de alto valor por contrato único, pero con muchos competidores (Xerox, HP, Canon, Ricoh). Un contrato de 1.022B DA a Estratec para los servicios de impresión del ISSSTE en 2016 sin concurso es una señal de captura institucional en el área de tecnología de oficina del ISSSTE.

## Patrón Multi-Institucional

Estratec también tiene DA con SEDENA (50%), SRE (33%) y PRESIDENCIA (33%), sugiriendo que la captura se extiende más allá del ISSSTE. Sin RFC.

## Recomendación

Verificar en ASF Cuenta Pública 2016 y 2020 para ISSSTE contratos MPS. Solicitar información bajo LFTAIPG al ISSSTE sobre el proceso de adjudicación del contrato de 2016 por 1.022B.
"""

print('Writing ARIA memos for cases 186-189...')
write_memo(131147, 'needs_review', MEMO_131147)
write_memo(42781,  'needs_review', MEMO_42781)
write_memo(71174,  'needs_review', MEMO_71174)
write_memo(6806,   'needs_review', MEMO_6806)

print('\nSetting in_ground_truth=1...')
for vid in [131147, 42781, 71174, 6806]:
    r = conn.execute('UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id=?', (vid,))
    print(f'  VID={vid}: {r.rowcount} row(s) updated')
conn.commit()

total_gt  = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
review    = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]

conn.close()
print(f'\nAll ARIA: {total_gt} GT-linked | {confirmed} confirmed_corrupt | {review} needs_review')
