"""Write Spanish investigation memos for GT cases 334-337 into aria_queue."""
import sqlite3, pathlib
from datetime import datetime

DB = pathlib.Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"

MEMOS = {
    129508: """## Memo de Investigacion: DISEQUI SA DE CV

**Clasificacion:** Monopolio concentrado en reactivos PCR — Salud Reproductiva
**Valor total:** 739M MXN | **Contratos:** 7 (2014-2018) | **Risk Score:** 0.857

### Hallazgos Principales

1. **Concentracion extrema en institucion unica**: 82% del valor total (607M MXN) proviene de solo 2 adjudicaciones directas al Centro Nacional de Equidad de Genero y Salud Reproductiva en 2017-2018.

2. **Sin RFC registrado**: Proveedor que maneja 739M MXN en contratos federales sin numero de identificacion fiscal en COMPRANET. Impide verificacion cruzada con SAT EFOS.

3. **Nicho ultra-especializado**: Todos los contratos son para "reactivos completos para cuantificacion de acidos nucleicos" (pruebas PCR). Este nivel de especializacion en un solo proveedor sin competencia visible sugiere posible captura de mercado.

4. **Patron temporal concentrado**: Actividad de solo 4 anos (2014-2018) con escalada dramatica: de 2.3M en 2014 a 327M en 2018 (142x incremento).

### Recomendacion
Verificar si DISEQUI es fabricante o intermediario de reactivos PCR. Consultar ASF Cuenta Publica 2017-2018 del Centro Nacional de Equidad de Genero. Buscar RFC en registros SAT para cruce con lista EFOS.""",

    172629: """## Memo de Investigacion: ICAPSA INFRAESTRUCTURA DE DESARROLLO SA DE CV

**Clasificacion:** Concentracion en carreteras federales — Infraestructura
**Valor total:** 682M MXN | **Contratos:** 21 (2016-2025) | **Risk Score:** 0.810

### Hallazgos Principales

1. **Relacion institucional prolongada**: 9 anos consecutivos como proveedor de SCT/SICT y CAPUFE. Concentracion total en un solo tipo de obra (carreteras federales) para las mismas instituciones.

2. **Sin adjudicacion directa pero alto riesgo**: 0% DA — todos los contratos ganados por licitacion. Sin embargo, el risk_score de 0.810 indica patron de concentracion anormal incluso dentro de procesos competitivos.

3. **Contrato ancla de 354M MXN (2023)**: "Modernizacion para ampliar el cuerpo existente del km 306+000" — representa 52% del valor total en un solo contrato.

4. **Sin RFC registrado**: Impide verificacion contra SAT EFOS y SFP sanciones.

5. **Diversificacion geografica limitada**: Obras concentradas en Estado de Mexico y corredor Cuernavaca-Acapulco, sugiriendo posible asignacion territorial.

### Recomendacion
Analizar si ICAPSA compite genuinamente en licitaciones o si existe patron de rotacion con otros contratistas en las mismas rutas. Verificar antecedentes en Registro Unico de Contratistas (RUC).""",

    140788: """## Memo de Investigacion: GRUPO ADDIM SA DE CV

**Clasificacion:** Intermediario de equipos medicos — IMSS/ISSSTE
**Valor total:** 460M MXN | **Contratos:** 9 (2014-2021) | **Risk Score:** 0.893

### Hallazgos Principales

1. **Diversidad sospechosa de productos**: Provee calderas de vapor (93M), equipos electromecanicos (172M), aires acondicionados (44M) y bombas de infusion medica (145M). Esta variedad sugiere intermediario/comercializador, no fabricante.

2. **Adjudicacion directa pandemica**: Contrato de 145M MXN en bombas de infusion para ISSSTE en 2020 via adjudicacion directa. Patron clasico de aprovechamiento de emergencia COVID-19.

3. **Risk score critico (0.893)**: Tercer percentil mas alto, impulsado por vendor_concentration + industry_mismatch (equipos industriales y medicos en el mismo proveedor).

4. **Sin RFC registrado**: 460M MXN sin identificacion fiscal verificable.

5. **Concentracion institucional**: 87% del valor en IMSS (310M) y resto en ISSSTE (145M). Solo 2 instituciones para 9 contratos.

### Recomendacion
Investigar cadena de suministro: identificar fabricantes reales de calderas, aires y bombas. Verificar si ADDIM agrega valor o es simple intermediario con sobreprecio. Priorizar revision ASF del contrato pandemia 2020.""",

    38345: """## Memo de Investigacion: LABORATORIOS SYDENHAM S.A. DE C.V.

**Clasificacion:** Proveedor farmaceutico dominante con crecimiento explosivo
**Valor total:** 1.42B MXN | **Contratos:** 83 (2008-2025) | **Risk Score:** 0.903

### Hallazgos Principales

1. **Explosion de valor en 2025**: 1.31B MXN en un solo ano (92% del valor historico de 17 anos). Incluye contrato de 551M y otro de 522M en compra consolidada IMSS. Crecimiento de 42M/ano promedio (2008-2024) a 1,310M en 2025 = incremento de 31x.

2. **Adjudicaciones directas recientes**: En 2025 obtiene 522M + 31M via adjudicacion directa para "claves necesarias para el sector salud". Las AD representan 42% del valor 2025.

3. **Presencia multi-institucional**: IMSS, ISSSTE, INSABI/INSALUD, SSA. Proveedor consolidado del sector salud con 17 anos de operacion.

4. **Sin RFC registrado**: A pesar de ser proveedor de larga data con 1.42B MXN en contratos, no tiene RFC en COMPRANET. Anomalia significativa para empresa farmaceutica de este tamano.

5. **Risk score critico (0.903)**: Impulsado por vendor_concentration extrema en 2025 y price_volatility (de contratos de 30M a 551M).

### Recomendacion
Verificar si Laboratorios Sydenham es laboratorio fabricante con registro COFEPRIS o intermediario. La explosion 2025 coincide con la nueva politica de compra consolidada — verificar precios unitarios vs. cuadro basico. Prioridad alta por monto.""",
}


def main():
    conn = sqlite3.connect(str(DB))
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    for vid, memo in MEMOS.items():
        c.execute(
            "UPDATE aria_queue SET memo_text = ?, memo_generated_at = ? WHERE vendor_id = ?",
            (memo, now, vid),
        )
        print(f"VID {vid}: rows updated = {c.rowcount}")
    conn.commit()
    conn.close()


if __name__ == "__main__":
    main()
