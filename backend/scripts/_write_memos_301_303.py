"""Write detailed Spanish investigation memos for GT cases 304-306
(originally targeted as 301-303 but IDs 301-303 were assigned to concurrent inserts).

Cases:
  304 — GERARDO NAVA SAN MARTIN (VID=146480) — Persona física, pavimento Chalma VER
  305 — MAURICIO SOTELO SANTILLAN (VID=14127) — Persona física, IMSS 875M
  306 — AIRELECSA SA DE CV (VID=107564) — HVAC IMSS 814M
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"

MEMOS = {
    304: {
        'vendor_id': 146480,
        'title': 'MEMO DE INVESTIGACIÓN — GERARDO NAVA SAN MARTÍN (VID=146480)',
        'memo': """
MEMO DE INVESTIGACIÓN — GERARDO NAVA SAN MARTÍN
Caso GT ID: 304 | Tipo: overpricing | Confianza: baja
Generado: 2026-03-08 | Sistema RUBLI v5.1

══════════════════════════════════════════════════════════════════
RESUMEN EJECUTIVO
══════════════════════════════════════════════════════════════════

Persona física sin RFC que aparece en COMPRANET con un contrato
de 4,816,003,499 MXN (~4.8 mil millones de pesos) adjudicado
mediante licitación pública en octubre de 2014 por la Presidencia
Municipal de Chalma, Veracruz, para construcción de pavimento
hidráulico.

RISK SCORE: 1.000 (Crítico) — máximo posible en modelo v5.1

══════════════════════════════════════════════════════════════════
DATOS DEL PROVEEDOR
══════════════════════════════════════════════════════════════════

Nombre:       GERARDO NAVA SAN MARTIN
Tipo:         Persona física (individuo, NO empresa)
RFC:          Sin RFC registrado en COMPRANET
VID:          146480
Contratos:    2 en total
Valor total:  ~4,820,805,269 MXN

══════════════════════════════════════════════════════════════════
CONTRATOS REGISTRADOS
══════════════════════════════════════════════════════════════════

1. Contrato ID=1049532 | Año: 2014
   Monto:       4,816,003,499 MXN (~4.816 MILES DE MILLONES)
   Institución: VER-Presidencia Municipal de Chalma, Veracruz
   Descripción: CONSTRUCCION DE PAVIMENTO HIDRAULICO
   Procedimiento: Licitación Pública
   Fecha contrato: 2014-10-01 | Publicación: 2014-09-18
   ¿Adjudicación directa?: NO

2. Contrato ID=2347436 | Año: 2020
   Monto:       4,801,770 MXN (~4.8 millones — monto NORMAL)
   Institución: Gobierno del Estado de San Luis Potosí
   Descripción: CONSTRUCCIÓN DE OBRAS DIVERSAS PARA SISTEMA REGIONAL DE AP
   Procedimiento: Licitación Pública
   Fecha contrato: 2020-12-31 | Publicación: 2020-12-10

══════════════════════════════════════════════════════════════════
ANÁLISIS DE LA ANOMALÍA PRINCIPAL
══════════════════════════════════════════════════════════════════

EL MUNICIPIO DE CHALMA, VERACRUZ:
• Chalma es un municipio rural muy pequeño (~1,500 habitantes)
• Presupuesto municipal anual estimado: 5-15 millones MXN
• Todos los contratos del municipio en COMPRANET año 2014:
  - Gerardo Nava San Martín: 4,816,003,499 MXN (99.9% del total)
  - MAGNUMSA SA DE CV:         5,431,038 MXN (unidad deportiva)
  - TOTAL CHALMA 2014:         4,821,434,538 MXN

Un contrato de 4.816 MILES DE MILLONES de pesos para pavimento
hidráulico en un municipio de 1,500 habitantes equivaldría a
construir ~48 km de autopista de primer nivel — imposible para
este municipio y para una persona física sin RFC.

HIPÓTESIS 1 — ERROR DE CAPTURA (más probable):
  El monto real es 4,816,003 MXN (4.8 millones, no 4.8 mil millones).
  En datos Structure B (2010-2017), los errores decimales son frecuentes.
  Evidencia: El segundo contrato del mismo proveedor en 2020 es de
  4.8 millones — sugiere que este proveedor opera en rango de millones,
  no de miles de millones.

HIPÓTESIS 2 — CORRUPCIÓN EXTREMA (menos probable, no descartable):
  Presta-nombre para empresa constructora cartelizada. La persona
  física funge como propietario nominal para eludir controles de
  concentración de mercado. Sin RFC imposible verificar capacidad
  técnica o fiscal para un contrato de esta magnitud.

══════════════════════════════════════════════════════════════════
INDICADORES DE RIESGO ACTIVADOS
══════════════════════════════════════════════════════════════════

✗ Persona física (individuos raramente ejecutan contratos de >1B)
✗ Sin RFC registrado (imposible verificar identidad fiscal)
✗ Monto 99.9% del gasto total del municipio en el año
✗ Municipio sin capacidad presupuestaria para contrato de esta escala
✗ Concentración extrema: 1 contrato = prácticamente 100% del valor
✗ Risk score 1.000 (máximo del modelo)

══════════════════════════════════════════════════════════════════
ACCIONES RECOMENDADAS
══════════════════════════════════════════════════════════════════

INMEDIATA:
1. Verificar en COMPRANET fuente original el monto del contrato
   ID=1049532 — confirmar si es error decimal
2. Solicitar Cuenta Pública 2014 del municipio de Chalma, VER
   a la Auditoría Superior del Estado de Veracruz

INVESTIGACIÓN:
3. Identificar a Gerardo Nava San Martín mediante CURP/INE
4. Verificar si existe capacidad técnica para pavimentación hidráulica
5. Cruzar con registros del Colegio de Ingenieros de Veracruz
6. Revisar si la obra fue ejecutada (fotografías satelitales 2014-2016)

NOTA: Caso marcado como confianza BAJA por ambigüedad error/corrupción.
Requiere verificación de fuente primaria antes de escalar.
""",
    },

    305: {
        'vendor_id': 14127,
        'title': 'MEMO DE INVESTIGACIÓN — MAURICIO SOTELO SANTILLÁN (VID=14127)',
        'memo': """
MEMO DE INVESTIGACIÓN — MAURICIO SOTELO SANTILLÁN
Caso GT ID: 305 | Tipo: overpricing | Confianza: media
Generado: 2026-03-08 | Sistema RUBLI v5.1

══════════════════════════════════════════════════════════════════
RESUMEN EJECUTIVO
══════════════════════════════════════════════════════════════════

Persona física sin RFC con contratos en el IMSS desde 2003 hasta 2025.
En 2010 ganó un contrato de 875,577,329 MXN (~875 millones) para
adecuación de consultorios en la IMSS UMF No.1, representando el 93%
de su valor total acumulado en 22 años de contratación.

RISK SCORE: 0.993 (Crítico) | ARIA IPS: 0.658 | Patrón: P6

══════════════════════════════════════════════════════════════════
DATOS DEL PROVEEDOR
══════════════════════════════════════════════════════════════════

Nombre:       MAURICIO SOTELO SANTILLAN
Tipo:         Persona física (individuo)
RFC:          Sin RFC registrado
VID:          14127
Contratos:    39 (2003-2025)
Valor total:  ~940,000,000 MXN

══════════════════════════════════════════════════════════════════
PATRÓN DE CONTRATACIÓN
══════════════════════════════════════════════════════════════════

CONTRATO GIGANTE (2010):
  Monto:       875,577,329 MXN  ← 93% de su total histórico
  Institución: IMSS
  Objeto:      Adecuación consultorios PREVEN-IMSS, UMF No.1
               y unidades de la zona
  Tipo:        Licitación Pública
  Fecha:       2010-11-19

CONTRATOS REGULARES (2003-2025, 38 contratos):
  Rango:       119,994 — 12,919,749 MXN
  Servicios:   Mantenimiento áreas verdes, fumigación,
               obra civil menor, jardinería
  Institución: IMSS (Jalisco/Hidalgo/Nuevo León exclusivamente)
  Modalidad:   100% Licitación Pública (0% DA)

══════════════════════════════════════════════════════════════════
ANÁLISIS DE LA ANOMALÍA
══════════════════════════════════════════════════════════════════

CONTRASTE EXTREMO EN ESCALA:
  Contrato promedio (sin 2010): ~1,700,000 MXN
  Contrato 2010:                875,577,329 MXN  (515x el promedio)

Una persona física que normalmente presta servicios de mantenimiento
de áreas verdes y fumigación (contratos de 100K-5M) de repente gana
un contrato de infraestructura hospitalaria de 875 millones.

PERFIL DE ACTIVIDAD LEGÍTIMA vs. SOSPECHOSA:
  ✓ Servicios de mantenimiento menor (áreas verdes, fumigación):
    COHERENTE con perfil de persona física
  ✗ Adecuación de consultorios médicos por 875M:
    INCOHERENTE — requiere empresa constructora, ingenieros,
    subcontratistas, equipo especializado de salud

RELACIÓN INSTITUCIONAL DE LARGO PLAZO:
  22 años de contratos con IMSS (2003-2025) sugiere relación
  privilegiada con el área de contratación. El proveedor conoce
  los procesos de licitación internos del IMSS.

HIPÓTESIS:
  Presta-nombre para empresa constructora de infraestructura de salud.
  La empresa real realizó la obra; Mauricio Sotelo fue el adjudicatario
  nominal para distribuir el riesgo o eludir controles de concentración.
  Los contratos menores son la "cobertura" para mantener historial activo.

══════════════════════════════════════════════════════════════════
INDICADORES DE RIESGO ACTIVADOS
══════════════════════════════════════════════════════════════════

✗ Persona física sin RFC — imposible verificar capacidad técnica/fiscal
✗ Salto de 515x respecto al contrato promedio previo
✗ Objeto del contrato incompatible con perfil de servicios habitual
✗ Proveedor exclusivo de IMSS (una sola institución en 22 años)
✗ Risk score 0.993 (casi máximo)
✗ Sin RFC impide verificar si declaró el ingreso de 875M en ISR

══════════════════════════════════════════════════════════════════
ACCIONES RECOMENDADAS
══════════════════════════════════════════════════════════════════

1. Solicitar expediente de licitación IMSS 2010 para UMF No.1 Jalisco
2. Verificar si la obra fue supervisada y recibida por la IMSS
3. Identificar a Mauricio Sotelo Santillán (CURP, domicilio fiscal)
4. Cruzar con SAT — ¿declaró 875M en ISR 2010-2011?
5. Revisar si existe empresa relacionada que subcontrató la obra
6. ASF Cuenta Pública IMSS 2010-2011: ¿se auditó esta obra?

NOTA: Los contratos 2023-2025 muestran que el proveedor sigue activo,
lo que facilita la investigación mediante solicitudes de transparencia
activas al IMSS.
""",
    },

    306: {
        'vendor_id': 107564,
        'title': 'MEMO DE INVESTIGACIÓN — AIRELECSA SA DE CV (VID=107564)',
        'memo': """
MEMO DE INVESTIGACIÓN — AIRELECSA SA DE CV
Caso GT ID: 306 | Tipo: institution_capture | Confianza: media
Generado: 2026-03-08 | Sistema RUBLI v5.1

══════════════════════════════════════════════════════════════════
RESUMEN EJECUTIVO
══════════════════════════════════════════════════════════════════

Empresa sin RFC especializada en mantenimiento de HVAC y equipos
electromecánicos que opera exclusivamente con IMSS Delegación Nuevo León.
En 2021 obtiene un contrato de licitación pública de 814,473,700 MXN —
un salto de ~80x respecto a su mayor contrato previo — representando
el 94% de sus ingresos totales en COMPRANET (2013-2024).

RISK SCORE: 0.999 (Crítico) | ARIA IPS: 0.659 | Patrón: P6

══════════════════════════════════════════════════════════════════
DATOS DEL PROVEEDOR
══════════════════════════════════════════════════════════════════

Nombre:       AIRELECSA, SA DE CV
RFC:          Sin RFC registrado
VID:          107564
Contratos:    42 (2013-2024)
Valor total:  ~863,000,000 MXN
DA rate:      73.8% en contratos NO-gigante
Sector:       Salud (IMSS exclusivamente)

══════════════════════════════════════════════════════════════════
PATRÓN DE CONTRATACIÓN — EVOLUCIÓN HISTÓRICA
══════════════════════════════════════════════════════════════════

Año  | N | Valor Total      | DA%  | Observación
-----|---|------------------|------|---------------------------
2013 | 1 |       105,591    | 100% | Inicio — contrato mínimo
2014 | 7 |     3,278,341    | 100% | Adjudicaciones directas
2015 |13 |     6,532,609    |  77% | Crece con licitaciones
2016 |10 |    11,505,588    |  80% | Paquetes de mantenimiento
2017 | 2 |     3,025,870    |  50% |
2018 | 3 |     9,508,532    |  33% |
2019 | 1 |     6,420,124    | 100% |
2020 | 1 |       144,700    | 100% | Año COVID — mínimo
2021 | 2 |   814,556,941    |  50% | ← SALTO MASIVO
2022 | 1 |     7,751,099    |   0% |
2024 | 1 |     8,150,662    |   0% |

CONTRATO GIGANTE 2021 (ID=2477598):
  Monto:       814,473,700 MXN  ← 94% del total histórico
  Tipo:        LICITACIÓN PÚBLICA (no DA)
  Objeto:      SERVICIO DE MANTENIMIENTO PREVENTIVO Y CORRECTIVO
               A EQUIPO (IMSS)
  Fecha:       2021-03-31 | Publicación: 2021-03-11
               (20 días entre publicación y contrato — muy rápido)

══════════════════════════════════════════════════════════════════
ANÁLISIS DE LA ANOMALÍA
══════════════════════════════════════════════════════════════════

SALTO ESTADÍSTICO EXTREMO:
  Mayor contrato pre-2021:     9,508,532 MXN (2018)
  Contrato 2021:             814,473,700 MXN
  Factor de crecimiento:     ~85.6x

  Una empresa que factura en promedio ~6M por contrato no tiene
  capacidad operativa ni financiera para ejecutar un contrato de
  814M sin subcontratación masiva o estructura empresarial oculta.

CAPTURA INSTITUCIONAL:
  11 años operando exclusivamente en IMSS Delegación Nuevo León.
  Alta DA rate (73.8%) en contratos menores sugiere que el área
  de contratación asigna directamente a Airelecsa sin competencia.
  El contrato de 814M vía licitación pública puede ser "licitación
  a modo" — términos técnicos diseñados para que solo Airelecsa califique.

CONTEXTO 2021 (año COVID):
  El año 2021 fue de alta demanda de mantenimiento de equipos médicos
  (ventiladores, aires acondicionados hospitalarios) por COVID-19.
  El gobierno utilizó procedimientos de emergencia. Sin embargo,
  Airelecsa obtuvo el contrato por LICITACIÓN PÚBLICA regular,
  no por adjudicación directa COVID — lo que hace el monto aún más
  extraño para una empresa de su tamaño.

SIN RFC — OPACIDAD TOTAL:
  Imposible verificar: constitución de la empresa, socios,
  domicilio fiscal, declaraciones de ISR, empleados registrados
  en IMSS, activos fijos suficientes para ejecutar el contrato.

══════════════════════════════════════════════════════════════════
INDICADORES DE RIESGO ACTIVADOS
══════════════════════════════════════════════════════════════════

✗ Sin RFC — opacidad fiscal total
✗ Salto de 85x en monto de contrato (price_volatility = máximo)
✗ Exclusividad IMSS NL en 11 años — monopolio institucional
✗ 73.8% DA rate en contratos menores (patrón de captura)
✗ 20 días publicación-contrato (plazo muy corto para licitación)
✗ Risk score 0.999 (casi máximo del modelo v5.1)
✗ Vendor_concentration extremo por IMSS NL

══════════════════════════════════════════════════════════════════
ACCIONES RECOMENDADAS
══════════════════════════════════════════════════════════════════

1. Solicitar expediente completo de licitación ID=2477598 (2021, IMSS)
   — verificar bases, participantes, fallo y justificación técnica
2. Identificar a los socios/accionistas de AIRELECSA SA DE CV
   mediante RFC con el SAT o escritura constitutiva ante el RPC
3. Verificar si la empresa tiene empleados registrados en IMSS
   suficientes para ejecutar un contrato de 814M en mantenimiento
4. ASF Cuenta Pública IMSS 2021: ¿se auditó este contrato?
5. Revisar subcontratistas — ¿quién realmente ejecutó el servicio?
6. Cruzar con proveedores EFOS/EDOS del SAT por su RFC no declarado

NOTA: El patrón de captura institucional en IMSS NL es consistente
con otros casos documentados en salud. La combinación de DA frecuente
en contratos menores + salto masivo en licitación formal es señal
característica de captura institucional a largo plazo.
""",
    },
}


def write_memos():
    conn = sqlite3.connect(DB)

    for case_db_id, info in MEMOS.items():
        # Verify case exists
        row = conn.execute(
            "SELECT id, case_name FROM ground_truth_cases WHERE id=?",
            (case_db_id,)
        ).fetchone()
        if not row:
            print(f"WARNING: Case ID={case_db_id} not found in DB — skipping")
            continue

        print(f"\n{'='*60}")
        print(info['title'])
        print(f"GT Case ID: {case_db_id} | Vendor ID: {info['vendor_id']}")
        print(f"DB Case: {row[1][:70]}...")
        print(info['memo'])

    # Print summary table
    print("\n" + "="*60)
    print("RESUMEN — CASOS GT 304-306")
    print("="*60)
    print(f"{'ID':>4} | {'Tipo':20} | {'Conf':8} | {'Monto Estimado':>20} | Proveedor")
    print("-"*100)
    for r in conn.execute("""
        SELECT gtc.id, gtc.case_type, gtc.confidence_level,
               gtc.estimated_fraud_mxn, gtv.vendor_name_source
        FROM ground_truth_cases gtc
        LEFT JOIN ground_truth_vendors gtv ON gtv.case_id=gtc.id
        WHERE gtc.id IN (304,305,306)
        ORDER BY gtc.id
    """).fetchall():
        print(f"{r[0]:>4} | {r[1]:20} | {r[2]:8} | {r[3]:>20,.0f} | {r[4]}")

    conn.close()


if __name__ == '__main__':
    write_memos()
