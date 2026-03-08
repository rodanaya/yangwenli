"""Write Spanish investigation memos for GT cases 334-337 into aria_queue."""
import sqlite3, pathlib

DB = pathlib.Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"

MEMOS = {
    26289: """## Investigación: MK Humana S.A. de C.V.

### Resumen Ejecutivo
Proveedor de servicios de hemodiálisis con **1,060 millones MXN** en solo 6 contratos entre 2006 y 2010. Presenta un patrón de concentración extrema en el ISSSTE con dos mega-contratos que representan el 98% de su facturación total.

### Hallazgos Clave
1. **Mega-contratos atípicos**: Contrato de hemodiálisis integral ISSSTE por 672M MXN (2010) y otro por 367M MXN (2007). Montos excepcionalmente altos para un solo proveedor de hemodiálisis.
2. **Sin RFC registrado**: Imposibilita verificación fiscal y cruce con listas SAT EFOS.
3. **100% licitación pública**: Todos los contratos ganados por licitación — sugiere capacidad para ganar procesos competitivos o posible simulación de competencia.
4. **Concentración temporal**: Actividad concentrada en 4 años (2006-2010), luego desaparece del registro COMPRANET.
5. **Dependencia institucional**: Contratos divididos entre ISSSTE (mega-contratos) e IMSS (contratos menores de equipo médico).

### Indicadores de Riesgo
- Risk score: 0.833 (Crítico)
- Promedio por contrato: 177M MXN — extremadamente alto para servicios médicos
- Desaparición post-2010 sugiere posible cambio de razón social o empresa de propósito especial

### Recomendación
Cruzar con auditorías ASF del ISSSTE 2006-2010 en materia de hemodiálisis. Verificar si la empresa cambió de nombre o fue absorbida. Investigar beneficiarios reales.""",

    10456: """## Investigación: Construobras de la Garza S.A. de C.V.

### Resumen Ejecutivo
Constructora con **2,860 millones MXN** en 75 contratos durante 18 años (2002-2020). Opera principalmente en el noreste de México con contratos de modernización y mantenimiento de carreteras para SCT y CAPUFE.

### Hallazgos Clave
1. **Concentración geográfica y sectorial**: Predominio en Tamaulipas/Noreste, con contratos de carreteras Victoria-Matamoros, ruta 97, y mantenimiento de autopistas CAPUFE.
2. **Contratos de gran escala**: Modernización carretera por 308M MXN (2008), SCT 262M MXN (2011), ruta 97 por 125M MXN (2003).
3. **Sin RFC registrado**: A pesar de 18 años de actividad y 2.86B en contratos, no tiene RFC en COMPRANET.
4. **98.7% licitación pública**: Prácticamente todos los contratos por licitación — patrón consistente con empresas que dominan licitaciones regionales.
5. **Nombre "de la Garza"**: Apellido prominente en política de Tamaulipas/Nuevo León — requiere investigación de conflicto de interés.
6. **Longevidad sospechosa**: 18 años de actividad continua con el mismo patrón geográfico sugiere captura de mercado regional.

### Indicadores de Riesgo
- Risk score: 0.828 (Crítico)
- Promedio por contrato: 38M MXN
- Patrón de dominio regional sostenido por casi dos décadas

### Recomendación
Investigar vínculos entre accionistas/representantes legales y funcionarios de SCT Tamaulipas y gobierno estatal. Cruzar con declaraciones patrimoniales y auditorías ASF de obra carretera en la región.""",

    107890: """## Investigación: Abastecimientos y Servicios Industriales del [nombre truncado]

### Resumen Ejecutivo
Proveedor con **667 millones MXN** en 10 contratos (2013-2019). El 84% de su facturación proviene de un solo mega-contrato de elevadores para el IMSS por 559M MXN, mientras sus demás contratos son de naturaleza completamente diferente.

### Hallazgos Clave
1. **Mega-contrato atípico**: 559M MXN en "adquisición, instalación y puesta en marcha de elevadores" para IMSS (2016). Monto extraordinario para elevadores hospitalarios.
2. **Diversificación sospechosa**: La empresa vende elevadores (559M), torres de enfriamiento (57M), calderas de vapor (28.5M), e impermeabilización (10.7M) — gama demasiado amplia para una empresa legítima especializada.
3. **50% adjudicación directa**: Mitad de contratos sin competencia, aunque los montos grandes son por licitación.
4. **Sin RFC**: No permite verificación fiscal.
5. **Nombre genérico**: "Abastecimientos y Servicios Industriales" es un nombre típico de empresa fachada — sugiere intermediario que no fabrica ni instala directamente.
6. **Dependencia IMSS**: 90%+ de contratos con IMSS exclusivamente.

### Indicadores de Riesgo
- Risk score: 0.801 (Crítico)
- Un contrato = 84% del valor total — concentración extrema
- Perfil de intermediario/revendedor, no de fabricante especializado

### Recomendación
Verificar si la empresa tiene capacidad técnica real para instalar elevadores hospitalarios. Investigar subcontratación — probablemente intermediario entre IMSS y fabricante real (Otis, Schindler, etc.). Cruzar con auditorías ASF del IMSS en equipamiento hospitalario 2015-2017.""",

    62994: """## Investigación: Servicios Electromecánicos del Caribe S.A. de C.V.

### Resumen Ejecutivo
Proveedor con **840 millones MXN** en 52 contratos durante 13 años (2010-2023). Presenta un patrón clásico de captura institucional con dependencia total del IMSS en servicios de mantenimiento electromecánico.

### Hallazgos Clave
1. **Mega-contrato dominante**: 512M MXN en "mantenimiento a equipos electromecánicos" IMSS (2018) — 61% del valor total en un solo contrato.
2. **Captura institucional**: 100% de contratos con IMSS durante 13 años. Ningún otro cliente institucional.
3. **48.1% adjudicación directa**: Casi la mitad de contratos sin competencia, incluyendo uno de 190M MXN en plantas de emergencia.
4. **Escalamiento súbito**: Contratos pequeños (1-2M MXN) durante años, luego salto a 512M y 190M en 2018. Patrón típico de empresa que "crece" artificialmente para justificar contratos grandes.
5. **Sin RFC**: 13 años de actividad sin RFC registrado en COMPRANET.
6. **Nombre geográfico + genérico**: "del Caribe" sugiere origen en sureste mexicano. Servicios electromecánicos es categoría amplia que permite flexibilidad en tipo de contrato.

### Indicadores de Riesgo
- Risk score: 0.801 (Crítico)
- 13 años como proveedor exclusivo IMSS
- Salto de contratos de ~1M a 512M MXN en un año

### Recomendación
Investigar representante legal y accionistas — posible vínculo con funcionarios IMSS de la delegación correspondiente. El salto de 1M a 512M en 2018 requiere verificación de capacidad técnica real. Cruzar con auditorías ASF del IMSS en mantenimiento hospitalario 2017-2019.""",
}

def main():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()
    updated = 0
    for vid, memo in MEMOS.items():
        r = cur.execute("UPDATE aria_queue SET memo_text = ? WHERE vendor_id = ? AND (memo_text IS NULL OR memo_text = '')", (memo, vid))
        if r.rowcount:
            updated += r.rowcount
            print(f"VID {vid}: memo updated")
        else:
            # Try update even if memo exists
            r2 = cur.execute("UPDATE aria_queue SET memo_text = ? WHERE vendor_id = ?", (memo, vid))
            if r2.rowcount:
                updated += r2.rowcount
                print(f"VID {vid}: memo overwritten")
            else:
                print(f"VID {vid}: not in aria_queue (skipped)")
    conn.commit()
    print(f"\nTotal memos updated: {updated}")
    conn.close()

if __name__ == "__main__":
    main()
