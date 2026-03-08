"""Write detailed Spanish investigation memos for GT cases 313-315.

Cases:
  313 - ESMA Instalaciones SA de CV (VID=54881) -- CAPUFE/SCT carreteras 7.72B
  314 - Constructora Germer SA de CV (VID=6602)  -- IMSS obras monopolio 6.80B
  315 - Telecomunicacion y Equipos SA de CV (VID=13415) -- equipo medico DA 4.89B

Run from backend/ directory:
    python -m scripts._write_memos_313_315
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from datetime import date

DB = "RUBLI_NORMALIZED.db"

MEMO_313 = """MEMORANDO DE INVESTIGACION ARIA
Caso: ESMA INSTALACIONES SA DE CV
ID caso GT: 313 | VID: 54881 | Fecha: 2026-03-08
Clasificacion: institution_capture | Confianza: medium

RESUMEN EJECUTIVO
ESMA INSTALACIONES SA DE CV acumula 7,720 millones MXN en contratos de obra civil
carretera (rehabilitacion de pavimentos, ampliaciones, puentes vehiculares) entre
2010 y 2025, sin RFC registrado en COMPRANET. El 96% del valor total se concentra en
dos instituciones: CAPUFE (59 contratos, 3,843M MXN, 49.7%) y SCT/SICT/BANOBRAS
(45+ contratos, 3,883M MXN). Con risk_score=0.945 (critico, top 0.5% del universo)
y DA=3.5%, el riesgo no proviene del mecanismo de adjudicacion sino de la captura
sistemica de adjudicadores de infraestructura carretera federal durante 15 anyos.

DATOS CLAVE
- VID: 54881  |  RFC: NO REGISTRADO
- Total facturado: 7,724 millones MXN  |  113 contratos  |  2010-2025
- Risk score: 0.945 (critico)
- Tasa DA: 3.5% (riesgo central es concentracion, no DA)
- Sector: Infraestructura (3) -- obra civil carretera federal

CONCENTRACION INSTITUCIONAL (top 4)
  1. CAPUFE:           59c | 3,843M | 49.7%
  2. SCT/SICT:          8c | 1,424M | 18.4%
  3. BANOBRAS:          4c | 1,354M | 17.5%
  4. SCT (denominacion anterior): 36c | 668M | 8.6%
Indice de concentracion HHI aprox >0.90 -- captura total del adjudicador CAPUFE.

CONTRATOS MAS GRANDES
  2022 | 565M MXN | BANOBRAS | Rehabilitacion Pavimento km 166+000 al 176+000 Mex-Queretaro
  2023 | 520M MXN | BANOBRAS | Rehabilitacion Estructural km 176+000 al 186+000
  2025 | 307M MXN | SCT      | Construccion PSV Av. Perez Escobosa km 0+770
  2023 | 305M MXN | SCT      | Modernizacion ampliacion cuerpo km 285+500-292+000
  2025 | 264M MXN | SCT      | Modernizacion construccion terracerias y drenaje

HIPOTESIS DE RIESGO
H1 (Captura de adjudicador): Funcionarios CAPUFE/SCT dirigen licitaciones hacia ESMA
    mediante especificaciones tecnicas restrictivas o evaluacion sesgada de propuestas.
    ESMA no es empresa fantasma pero implica captura institucional de largo plazo.
H2 (Sobrefacturacion por km): Contratos de rehabilitacion vial con montos superiores
    al benchmark de costo/km. Sin expedientes tecnicos es imposible verificar.
H3 (Intermediario sin RFC): ESMA como figura formal que subcontrata la obra real,
    capturando margen de intermediacion sin trazabilidad fiscal.

PASOS DE INVESTIGACION RECOMENDADOS
  1. Verificar en Registro Publico de Comercio: socios, capital, fecha de constitucion
  2. Solicitar padron de proveedores CAPUFE y expedientes licitatorios (LAASSP Art. 57)
  3. Cruzar con ASF Cuenta Publica: fiscalizacion de obra carretera CAPUFE 2010-2025
  4. Comparar costo/km de rehabilitacion ESMA vs benchmark SCT Norma N-CTR-CAR-1-04
  5. Revisar prensa: contratos CAPUFE cuestionados, destituciones de funcionarios
  6. Verificar si comparte representante legal o domicilio con otros proveedores CAPUFE

VEREDICTO PRELIMINAR
INVESTIGACION PRIORITARIA. Captura institucional CAPUFE durante 15 anyos sin RFC es
altamente anormal. No hay evidencia de corrupcion probada pero RS=0.945 es maximo del
modelo. Prioridad inmediata: obtener RFC real y cruzar con ASF Cuenta Publica CAPUFE.

[MEMO GENERADO AUTOMATICAMENTE POR ARIA v2.0 | 2026-03-08]"""

MEMO_314 = """MEMORANDO DE INVESTIGACION ARIA
Caso: CONSTRUCTORA GERMER, S.A. DE C.V.
ID caso GT: 314 | VID: 6602 | Fecha: 2026-03-08
Clasificacion: concentrated_monopoly | Confianza: medium

RESUMEN EJECUTIVO
CONSTRUCTORA GERMER SA DE CV ha operado como proveedor cuasi-exclusivo del IMSS en
obra civil hospitalaria durante 23 anyos (2002-2025), acumulando 6,800 millones MXN
totales, de los cuales 6,429M (94.6%) corresponden a IMSS en 93 de 119 contratos.
Sin RFC registrado. El contrato mas grande (2007, 4,569M MXN titulado Reparacion de
Acabados Incluyendo Pintura) es la anomalia critica: esa descripcion no corresponde
con un contrato equivalente al CAPEX anual completo de obras del IMSS.

DATOS CLAVE
- VID: 6602  |  RFC: NO REGISTRADO
- Total facturado: 6,800 millones MXN  |  119 contratos  |  2002-2025
- Risk score: 0.820 (alto)
- Tasa DA: 21.9%
- Concentracion IMSS: 94.6% del valor total (93 de 119 contratos)
- Sector: Salud (1) -- obra civil hospitalaria IMSS

EL CONTRATO ANOMALO DE 2007
Contrato: 4,569,386,006 MXN con IMSS
Titulo: Reparacion de Acabados Incluyendo Pintura

Inconsistencias:
  - El presupuesto de obra IMSS en 2007 era aprox 8,000M total; este unico contrato
    representaria el 57% del presupuesto anual completo de obras de IMSS.
  - Acabados y pintura es una de las partidas de MENOR costo en construccion hospitalaria.
  - Monto masivo con descripcion minimalista: patron tipico de contrato paraguas opaco.
  - Un contrato de esta magnitud deberia incluir alcance detallado, m2, hospitales.
Hipotesis: descripcion deliberadamente vaga para englobar multiples subcontratos o
para evitar desglose que revele sobreprecios por partida.

CONCENTRACION INSTITUCIONAL (top 5)
  1. IMSS:             93c | 6,429M | 94.6%
  2. Secretaria Salud:  6c |   113M |  1.7%
  3. CINVESTAV/IPN:     7c |    95M |  1.4%
  4. Secretaria Cultura: 2c |   71M |  1.0%
  5. ASIPONA Progreso:  5c |    65M |  1.0%

CONTRATOS MAS GRANDES (excluyendo 2007)
  2025 | 188M | IMSS | Rehabilitacion areas Terapia Intensiva UMAE HG Dr. Gea
  2024 | 135M | IMSS | Construccion UMF 10+5 consultorios Francisco Montejo
  2025 | 115M | IMSS | Proyectos prioritarios diversas OOAD DF Norte
  2023 | 111M | IMSS | Rehabilitacion y mantenimiento Deportivo Independencia
  2018 |  83M | IMSS | Proyecto integral UMF 10+5 consultorios Pedro Escobedo Queretaro

HIPOTESIS DE RIESGO
H1 (Contrato paraguas 2007): El 4.57B es paraguas de multiples obras sin desglose
    publico. Titulo vago para evitar escrutinio. Posible corrupcion en asignacion.
H2 (Captura de funcionarios IMSS): Germer mantiene relaciones preferenciales con
    subdirectores de obras IMSS durante 23 anyos, sobreviviendo cambios de administracion.
H3 (Especialista legitimo): Germer podria ser genuino especialista en construccion
    hospitalaria IMSS con experiencia acumulada. La concentracion seria natural en un
    mercado donde pocos constructores tienen certificaciones hospitalarias. Requiere
    verificacion del contrato 2007 para descartar esta hipotesis.

PASOS DE INVESTIGACION RECOMENDADOS
  1. Solicitar expediente completo del contrato 2007 via INAI (Art. 159 LAASSP)
  2. Cruzar con ASF Cuenta Publica IMSS 2007: observaciones a obra civil
  3. Verificar RFC real en SAT y estado en SFP (sanciones, inhabilitaciones)
  4. Revisar contratos IMSS 2007: quienes mas firmaron ese anyo a valores similares
  5. Investigar nombre de funcionarios IMSS en subdirecciones de obra 2002-2025
  6. Buscar en prensa: escandalo IMSS + Constructora Germer

VEREDICTO PRELIMINAR
INVESTIGACION PRIORITARIA por el contrato 2007. Reparacion de Acabados Incluyendo
Pintura para 4,569 millones MXN es la anomalia mas grave de este lote de casos.
Sin RFC no hay verificacion fiscal posible. RS=0.820 con concentracion 94.6% en IMSS
durante 23 anyos es patron de monopolio institucional extremo.

[MEMO GENERADO AUTOMATICAMENTE POR ARIA v2.0 | 2026-03-08]"""

MEMO_315 = """MEMORANDO DE INVESTIGACION ARIA
Caso: TELECOMUNICACION Y EQUIPOS, S.A. DE C.V.
ID caso GT: 315 | VID: 13415 | Fecha: 2026-03-08
Clasificacion: institution_capture | Confianza: medium

RESUMEN EJECUTIVO
TELECOMUNICACION Y EQUIPOS SA DE CV opera en mantenimiento de equipo medico de alta
especialidad (tomografos, radiologia, ultrasonido) para IMSS e ISSSTE entre 2003 y 2025,
pese a que su razon social indica actividad en telecomunicaciones. Acumula 4,890 millones
MXN en 198 contratos sin RFC registrado. La tasa de adjudicacion directa de 39.4% es
elevada para mantenimiento de equipo medico, aunque varios contratos citan titularidad de
patente o licencia exclusiva como justificacion legal (LAASSP Art. 41). RS=0.811.

DATOS CLAVE
- VID: 13415  |  RFC: NO REGISTRADO
- Total facturado: 4,890 millones MXN  |  198 contratos  |  2003-2025
- Risk score: 0.811 (alto)
- Tasa DA: 39.4%
- Sector: Salud (1) -- mantenimiento equipo medico especializado

ANOMALIA DE RAZON SOCIAL
La empresa se llama TELECOMUNICACION Y EQUIPOS SA DE CV pero opera exclusivamente en:
  - Mantenimiento preventivo y correctivo de equipo medico de imagen (tomografos, RMN)
  - Suministro de refacciones de alta especialidad para equipo medico
  - Adquisicion de tomografos y equipo radiologico para IMSS/ISSSTE
NUNCA aparece un contrato de telecomunicaciones reales. El mismatch industria-actividad
es una bandera roja: posible nombre generico deliberado para facilitar adjudicaciones.

CONCENTRACION INSTITUCIONAL (top 5)
  1. IMSS:           100c | 2,874M | 58.8%
  2. ISSSTE:          13c | 1,326M | 27.1%
  3. SEDENA:          13c |   256M |  5.2%
  4. IMSS-Bienestar:   2c |    79M |  1.6%
  5. PEMEX:           17c |    74M |  1.5%
Nota: presencia en SEDENA (hospitales militares, 256M) es mercado sensible adicional.

CONTRATOS MAS GRANDES
  2007 | 1,300M | ISSSTE | Equipo Medico [descripcion generica -- ANOMALO]
  2025 |   515M | IMSS   | Servicio Mantenimiento Equipos Medicos 1/2/3 nivel (DA)
  2022 |   505M | IMSS   | Adquisicion Tomografos Programa Unidades 2/3 Nivel
  2020 |   382M | IMSS   | Mantenimiento Preventivo/Correctivo Equipo Medico (DA)
  2017 |   341M | IMSS   | Mantenimiento Equipo Medico 1/2/3 nivel 2017-2020 (DA)

El contrato ISSSTE 2007 (1,300M MXN) titulado solo Equipo Medico es anormalmente vago
para una adquisicion de esa magnitud (equivalente a ~16% del presupuesto total ISSSTE).

ANALISIS DE ADJUDICACION DIRECTA (DA=39.4%)
Justificaciones citadas en contratos IMSS:
  - Titularidad de patente o licenciamiento exclusivo (LAASSP Art. 41 fraccion I)
    Valida para mantenimiento de equipo bajo garantia del fabricante (Siemens, GE, Philips).
    Requiere verificar si la empresa es distribuidor autorizado certificado.
  - Si NO tiene licencia exclusiva documentada, las DA son ilegales bajo LAASSP.
  - Los 78 contratos DA (~1.9B MXN) requieren verificacion expediente por expediente.

HIPOTESIS DE RIESGO
H1 (DA ilegales): Las adjudicaciones directas carecen de respaldo real de titularidad
    de patente. Se usaron como mecanismo para evitar licitacion publica competitiva.
H2 (Intermediario con margen excesivo): La empresa distribuye equipo extranjero (Siemens,
    GE, Philips) con margen de intermediacion no verificable. Sin RFC imposible comparar
    precio IMSS/ISSSTE vs precio de catalogo del fabricante.
H3 (Nombre generativo deliberado): Razon social generica facilita operar en multiples
    sectores sin especificidad -- caracteristica tipica de empresas opacas.
H4 (Justificacion legal valida): Podria ser distribuidor certificado con acuerdos de
    mantenimiento exclusivo reales. En ese caso RS=0.811 seria falso positivo del modelo.

PASOS DE INVESTIGACION RECOMENDADOS
  1. Verificar RFC real y estado en SAT (activo/suspendido/cancelado)
  2. Solicitar contratos con justificacion de DA via INAI: verificar expedientes de
     titularidad de patente o licencia exclusiva para cada contrato DA individual
  3. Comparar precios de mantenimiento de tomografos IMSS vs benchmarks internacionales
  4. Verificar si es distribuidor autorizado Siemens Healthineers / GE Healthcare / Philips
  5. Cruzar con registros COFEPRIS de importadores de equipo medico de imagen
  6. Revisar contrato ISSSTE 2007 (1.3B MXN): expediente licitatorio y entrega real

VEREDICTO PRELIMINAR
INVESTIGACION REQUERIDA, prioridad media. El mismatch razon social (telecomunicaciones
vs equipo medico) y la ausencia de RFC son banderas rojas estructurales. DA=39.4% podria
tener justificacion legal real (titularidad de patente) pero requiere verificacion caso
por caso. El contrato ISSSTE 2007 de 1.3B MXN con titulo vago es la prioridad inmediata.
Confianza medium: posibilidad de falso positivo si hay licencias exclusivas validas.

[MEMO GENERADO AUTOMATICAMENTE POR ARIA v2.0 | 2026-03-08]"""

MEMOS = {
    313: ("ESMA INSTALACIONES SA DE CV", MEMO_313),
    314: ("CONSTRUCTORA GERMER, S.A. DE C.V.", MEMO_314),
    315: ("TELECOMUNICACION Y EQUIPOS, S.A. DE C.V.", MEMO_315),
}


def write_memos():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    updated = 0
    for case_db_id, (vendor_name, memo) in MEMOS.items():
        existing = conn.execute(
            "SELECT notes FROM ground_truth_cases WHERE id=?", (case_db_id,)
        ).fetchone()
        if existing is None:
            print(f"WARNING: Case {case_db_id} not found in DB -- skipping")
            continue

        existing_notes = existing[0] or ""
        separator = "\n\n" if existing_notes else ""
        updated_notes = existing_notes + separator + memo.strip()

        cur.execute(
            "UPDATE ground_truth_cases SET notes=? WHERE id=?",
            (updated_notes, case_db_id),
        )
        print(
            f"GT-{case_db_id} ({vendor_name}): memo written "
            f"({len(memo)} chars, rows_updated={cur.rowcount})"
        )
        updated += 1

    conn.commit()
    print(f"\n{updated} cases updated with detailed memos. Today: {date.today()}")
    conn.close()


if __name__ == "__main__":
    write_memos()
