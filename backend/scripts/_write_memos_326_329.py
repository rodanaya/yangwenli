"""Write Spanish investigation memos for GT cases 326-329."""
import sqlite3, pathlib, json
from datetime import datetime

DB = pathlib.Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"

MEMOS = {
    "PROACON_TUNELES_INFRAESTRUCTURA_2014_2025": """# Memo de Investigacion: PROACON MEXICO — Monopolio de Tuneles Federales

**Caso ID**: PROACON_TUNELES_INFRAESTRUCTURA_2014_2025
**Fecha**: {date}
**Risk Score v5.1**: 0.899 (Critico)
**Monto total**: $4,170 MDP (8 contratos, 2014-2025)

## Resumen Ejecutivo

PROACON MEXICO es un proveedor especializado en la construccion de tuneles para infraestructura federal. Con solo 8 contratos acumula 4.17 mil millones de pesos, un promedio de 521 millones por contrato. Opera exclusivamente mediante licitacion publica (0% adjudicacion directa), pero presenta concentracion extrema en un nicho altamente especializado.

## Hallazgos Principales

### 1. Concentracion en Tuneleria Federal
- **Tunel Emisor Poniente II** (CONAGUA, 2014): $1,796 MDP — obra hidraulica critica
- **Tunel vehicular km 16+440** (SCT, 2022): $679 MDP — carretera Pachuca-Huejutla
- **Viaducto Santa Ana** (SCT, 2025): $486 MDP
- **Tunel Omitlan** (SCT, 2023): $462 MDP
- **Tuneles Barranca Larga-Ventanilla** (BANOBRAS, 2018): $293 MDP

### 2. Instituciones Contratantes
- CONAGUA: 1 contrato / $1,796 MDP (43%)
- SCT/SICT: 4 contratos / $1,713 MDP (41%)
- CAPUFE: 1 contrato / $100 MDP
- BANOBRAS: 1 contrato / $293 MDP

### 3. Indicadores de Riesgo
- Sin RFC registrado en COMPRANET — opacidad fiscal
- Promedio por contrato de $521 MDP — inusualmente alto
- 100% del portafolio en tuneles — posible barrera de entrada artificial
- Operacion continua 2014-2025 sin variacion de giro

## Evaluacion

**Confianza**: Media. No hay evidencia directa de fraude, pero el patron de concentracion extrema en tuneleria federal con montos promedio superiores a 500 MDP y sin RFC visible justifica revision detallada. La especializacion tecnica puede ser legitima (tuneleria requiere equipo TBM especializado), pero tambien puede representar una barrera de entrada artificialmente mantenida.

## Acciones Recomendadas
1. Verificar RFC y estructura accionaria en SAT/RUPA
2. Comparar precios unitarios con benchmarks internacionales de tuneleria
3. Verificar si existen otros licitantes calificados para obras similares
4. Revisar auditorias ASF de las obras CONAGUA y SCT relacionadas
""",

    "HUMAN_CORPORIS_ACELERADORES_IMSS_2017_2025": """# Memo de Investigacion: HUMAN CORPORIS — Monopolio Aceleradores Lineales IMSS

**Caso ID**: HUMAN_CORPORIS_ACELERADORES_IMSS_2017_2025
**Fecha**: {date}
**Risk Score v5.1**: 0.816 (Critico)
**Monto total**: $2,550 MDP (25 contratos, 2017-2025)

## Resumen Ejecutivo

HUMAN CORPORIS SA DE CV es el proveedor dominante de aceleradores lineales (equipos de radioterapia oncologica) para el IMSS. Acumula 2.55 mil millones de pesos en 25 contratos, con el IMSS representando el 74% del valor total. El programa nacional de aceleradores lineales 2024-2025 le otorgo multiples contratos por mas de 750 MDP.

## Hallazgos Principales

### 1. Concentracion Institucional
- **IMSS**: 14 contratos / $1,891 MDP (74%)
- **IMSS-Bienestar**: 6 contratos / $350 MDP (14%)
- **ISSSTE**: 2 contratos / $162 MDP (6%)
- Proveedor unico del "Programa Nacional de Adquisicion de Aceleradores Lineales"

### 2. Contratos Principales
- Aceleradores lineales 2023 (IMSS): $401 MDP
- Programa Nacional 2024-2025: multiples entregas por $208M, $181M, $125M, $124M, $115M
- Hospital Especialidades No. 25 NL (2018): $160 MDP
- Mantenimiento acelerador CMN Occidente (2018, AD): $137 MDP

### 3. Indicadores de Riesgo
- 24% adjudicacion directa — justificada como "proveedor unico" de tecnologia
- Sin RFC registrado
- Contratos de equipo Y mantenimiento — modelo de dependencia tecnologica
- Posible sobreprecio en equipos de alta tecnologia sin competencia efectiva

## Evaluacion

**Confianza**: Media. Los aceleradores lineales son equipos especializados (Varian, Elekta) que pueden tener distribuidores exclusivos en Mexico. La concentracion puede ser estructural del mercado, pero la falta de competencia en licitaciones y el modelo equipo+mantenimiento generan riesgo de sobreprecio. El 24% de DA sugiere uso de excepciones de proveedor unico.

## Acciones Recomendadas
1. Verificar si HUMAN CORPORIS es distribuidor autorizado de Varian/Elekta
2. Comparar precios con compras de aceleradores en otros paises (UNOPS, OPS)
3. Auditar justificaciones de adjudicacion directa (Art. 41 LAASSP)
4. Revisar si otros proveedores han participado en licitaciones de aceleradores
""",

    "VANTAGE_SALUD_LOGISTICA_FARMACEUTICA_2016_2025": """# Memo de Investigacion: VANTAGE SERVICIOS INTEGRALES DE SALUD — Intermediario Logistico Farmaceutico

**Caso ID**: VANTAGE_SALUD_LOGISTICA_FARMACEUTICA_2016_2025
**Fecha**: {date}
**Risk Score v5.1**: 0.877 (Critico)
**Monto total**: $2,350 MDP (249 contratos, 2016-2025)

## Resumen Ejecutivo

VANTAGE SERVICIOS INTEGRALES DE SALUD SA DE CV opera como intermediario logistico en la cadena de distribucion farmaceutica del sector salud federal. Con 249 contratos por 2.35 mil millones de pesos, provee servicios de logistica, almacenamiento, distribucion y recoleccion de bienes terapeuticos para INSABI, IMSS y servicios estatales de salud.

## Hallazgos Principales

### 1. Modelo de Intermediacion
- Servicio integral de logistica farmaceutica (recepcion, almacenamiento, distribucion)
- Opera como intermediario entre laboratorios y unidades medicas
- Nombre generico "servicios integrales de salud" — patron tipico de empresas intermediarias

### 2. Distribucion Institucional
- **INSABI**: 23 contratos / $861 MDP (37%) — logistica consolidada
- **IMSS**: 32 contratos / $769 MDP (33%) — medicamentos y logistica
- **Servicios de Salud de Morelos**: 1 contrato / $567 MDP (24%) — Sistema Integral de Abasto

### 3. Contratos Significativos
- Sistema Integral de Abasto Morelos (2017): $567 MDP — contrato unico desproporcionado
- Logistica consolidada INSABI (2021, AD): $422 MDP
- Distribucion IMSS (2020): $287 MDP
- Medicamentos IMSS (2021): $218 MDP

### 4. Indicadores de Riesgo
- **46.6% adjudicacion directa** — tasa elevada para intermediario
- Sin RFC registrado
- 249 contratos — volumen inusual sugiere fragmentacion o contratos recurrentes
- Opera en el ecosistema INSABI/IMSS durante transicion de salud publica (2019-2023)
- Contrato de $567 MDP con Servicios de Salud de Morelos — estado con historico de corrupcion en salud

## Evaluacion

**Confianza**: Media. El modelo de intermediacion logistica farmaceutica es inherentemente sospechoso: agrega costo sin producir medicamentos. La tasa de 46.6% de adjudicacion directa y el volumen de 249 contratos sugieren una posicion privilegiada en la cadena de suministro. La operacion durante la transicion INSABI (periodo de alta opacidad) aumenta el riesgo.

## Acciones Recomendadas
1. Verificar RFC y estructura accionaria — posibles vinculos con laboratorios
2. Analizar margen de intermediacion vs. compra directa a laboratorios
3. Auditar contrato de $567M con Morelos — posible sobrefacturacion
4. Verificar si esta en listados EFOS (Art. 69-B CFF)
5. Mapear red de subcontratacion: quien provee realmente los medicamentos
""",

    "INOVAMEDIK_ANESTESIA_ISSSTE_2010_2025": """# Memo de Investigacion: INOVAMEDIK — Monopolio Servicio Integral de Anestesia

**Caso ID**: INOVAMEDIK_ANESTESIA_ISSSTE_2010_2025
**Fecha**: {date}
**Risk Score v5.1**: 0.859 (Critico)
**Monto total**: $2,200 MDP (30 contratos, 2010-2025)

## Resumen Ejecutivo

INOVAMEDIK S.A. DE C.V. ha operado durante 15 anios consecutivos como proveedor monopolico de servicio integral de anestesia para instituciones de salud publica. Acumula 2.20 mil millones de pesos en 30 contratos, con el ISSSTE como principal cliente (55% del valor). El modelo de "servicio integral" (equipo + gases + insumos + mantenimiento) genera dependencia institucional de largo plazo.

## Hallazgos Principales

### 1. Concentracion por Institucion
- **ISSSTE**: 6 contratos / $1,198 MDP (55%) — proveedor principal de anestesia
- **Secretaria de Salud Edo. Mexico**: 3 contratos / $548 MDP (25%)
- **Servicios de Salud de Morelos**: 2 contratos / $135 MDP (6%)

### 2. Patron Temporal (15 anios)
- 2010-2013: Secretaria de Salud Edo. Mexico ($361M + $186M)
- 2014-2017: ISSSTE + Morelos ($553M en 2017)
- 2018-2020: ISSSTE ($160M, AD)
- 2021-2023: ISSSTE ($229M AD, $153M AD)
- 2024-2025: Continuacion

### 3. Modelo de Servicio Integral
- Incluye equipo de anestesia, gases anestesicos, insumos y mantenimiento
- Modelo lock-in: una vez instalado el equipo, cambiar proveedor implica sustituir toda la infraestructura
- Justifica adjudicacion directa como "servicio unico" o "continuidad operativa"

### 4. Indicadores de Riesgo
- **33% adjudicacion directa** — creciente en anios recientes
- Sin RFC registrado
- 15 anios de operacion ininterrumpida — dependencia institucional extrema
- Contrato individual de $553 MDP (ISSSTE, 2017) — desproporcionado
- Operacion en Morelos — estado con patrones de concentracion en salud

## Evaluacion

**Confianza**: Media. El servicio integral de anestesia es un modelo de negocio que genera dependencia estructural: el proveedor instala equipos propietarios y se vuelve indispensable para el mantenimiento. Esta practica es comun en el sector salud mexicano y ha sido senialada por la ASF en multiples auditorias. La operacion de 15 anios sin competencia efectiva y el incremento de adjudicaciones directas son indicadores fuertes de captura institucional.

## Acciones Recomendadas
1. Verificar RFC y socios — posibles vinculos con fabricantes de equipo de anestesia
2. Solicitar justificaciones de AD de los ultimos 5 anios al ISSSTE
3. Comparar precios de servicio integral vs. adquisicion separada (equipo + gases + mantenimiento)
4. Revisar auditorias ASF al ISSSTE en materia de servicios subrogados
5. Investigar si existen proveedores alternativos que hayan sido excluidos de licitaciones
""",
}

def main():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()
    # Ensure aria_memos table exists
    cur.execute("""
        CREATE TABLE IF NOT EXISTS aria_memos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            vendor_id INTEGER,
            memo_text TEXT NOT NULL,
            memo_type TEXT DEFAULT 'investigation',
            generated_by TEXT DEFAULT 'claude_opus',
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    date_str = datetime.now().strftime("%Y-%m-%d")
    for case_id, memo_template in MEMOS.items():
        memo = memo_template.format(date=date_str)
        # Get vendor_id
        row = cur.execute(
            "SELECT vendor_id FROM ground_truth_vendors WHERE case_id=? LIMIT 1",
            (case_id,)
        ).fetchone()
        vid = row[0] if row else None
        cur.execute(
            "INSERT INTO aria_memos (case_id, vendor_id, memo_text, memo_type, generated_by) VALUES (?,?,?,?,?)",
            (case_id, vid, memo, "investigation", "claude_opus_4.6")
        )
        print(f"Wrote memo for {case_id} (vendor_id={vid})")
    conn.commit()
    total = cur.execute("SELECT COUNT(*) FROM aria_memos").fetchone()[0]
    print(f"\nTotal memos in aria_memos: {total}")
    conn.close()

if __name__ == "__main__":
    main()
