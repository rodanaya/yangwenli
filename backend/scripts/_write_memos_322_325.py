"""Write Spanish investigation memos for GT cases 322-325."""
import os

MEMO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "memos")
os.makedirs(MEMO_DIR, exist_ok=True)

MEMO_322 = """# Caso 322: Dragados y Urbanizaciones Siglo 21 - Captura Institucional CONAGUA

## Resumen Ejecutivo

**DRAGADOS Y URBANIZACIONES SIGLO 21 S.A. DE C.V.** (VID 24384) presenta un patron de captura institucional sobre la Comision Nacional del Agua (CONAGUA) durante 19 anios consecutivos (2006-2025), acumulando 3,218 millones de pesos en 89 contratos.

## Hallazgos Clave

| Indicador | Valor | Significado |
|-----------|-------|-------------|
| Concentracion institucional | 94.4% (84/89 contratos en CONAGUA) | Dependencia extrema de un solo cliente gubernamental |
| Tasa single-bid | 85.4% (76/89) | Competencia virtualmente inexistente |
| Adjudicacion directa | 14.6% (13/89) | Mayoria por licitacion, pero sin competidores |
| Monto total | 3,218 M MXN | Escala significativa en infraestructura hidrica |
| Risk score promedio | 0.934 (Critico) | Patron P6: captura institucional |
| RFC | No registrado | Opacidad fiscal |

## Contratos Destacados

1. **Construccion Red Troncal Coahuila - Agua Saludable para La Laguna** (2024): 487M MXN
2. **Revestimiento Canal Tlamaco-Juandho** (2025): 319M MXN
3. **Agua Saludable para La Laguna** (2025): 216M MXN
4. **Limpieza Rio Marabasco** (2018): 155M MXN

## Patron de Riesgo

Este caso exhibe el patron clasico de **captura institucional (P6)**:
- Un proveedor domina una categoria de gasto especifica (obra hidraulica) en una sola dependencia
- La competencia se elimina efectivamente: 85% de licitaciones con un solo postor
- Continuidad de 19 anios sugiere relaciones arraigadas que trascienden cambios de administracion
- La ausencia de RFC impide rastreo fiscal cruzado

## Instituciones Afectadas

| Institucion | Contratos | Monto |
|-------------|-----------|-------|
| CONAGUA | 84 | 3,181M |
| Comision del Agua del Estado de Mexico | 2 | 14M |
| SEMARNAT | 1 | 12M |
| SEP | 2 | 11M |

## Recomendaciones

1. Verificar via ASF si existe justificacion tecnica para la ausencia sistematica de competidores
2. Cruzar con Cuenta Publica los proyectos Agua Saludable para detectar sobrecostos
3. Investigar si existen empresas relacionadas que pudieran participar como competidores ficticios
4. Obtener RFC mediante consulta al padron de proveedores de CONAGUA

## Nivel de Confianza: MEDIO

Evidencia circunstancial fuerte (concentracion + single-bid + longevidad), pero requiere verificacion de fuentes externas (ASF, medios) para confirmar irregularidades.
"""

MEMO_323 = """# Caso 323: Grupo Operativo Internacional en Seguridad Privada - Monopolio Vigilancia ISSSTE

## Resumen Ejecutivo

**GRUPO OPERATIVO INTERNACIONAL EN SEGURIDAD PRIVADA, S.A. DE C.V.** (VID 13583) monopolizo los servicios de vigilancia del ISSSTE durante 12 anios (2003-2015), acumulando 652 millones de pesos en contratos renovados sin competencia efectiva.

## Hallazgos Clave

| Indicador | Valor | Significado |
|-----------|-------|-------------|
| Concentracion ISSSTE | 96.8% (631M/652M) | Monopolio virtual |
| Tasa single-bid | 72.2% (13/18) | Competencia minima |
| Contratos plurianuales | Si (2007-2009, 2010-2012) | Bloqueo de entrada a competidores |
| Risk score promedio | 0.844 (Critico) | Patron de monopolio concentrado |
| RFC | No registrado | Sin trazabilidad fiscal |

## Contratos Principales

1. **Vigilancia ISSSTE 2010-2012** (2009): 231M MXN - contrato plurianual de 3 anios
2. **Vigilancia ISSSTE 2007-2009** (2007): 171M MXN - contrato plurianual previo
3. **Vigilancia ISSSTE 2014** (2014): 99M MXN - adjudicacion directa
4. **Vigilancia ISSSTE 2015** (2015): 41M + 38M + 20M MXN - fragmentacion en el ultimo anio

## Patron de Riesgo

Monopolio concentrado en servicio de vigilancia institucional:
- Contratos plurianuales de 3 anios que eliminan ventanas de competencia
- Renovaciones consecutivas sin alternancia de proveedor
- Fragmentacion sospechosa en 2015 (3 contratos menores vs 1 grande) - posible evasion de umbrales
- El servicio de vigilancia es un commodity que deberia atraer multiples competidores

## Observacion sobre Fragmentacion 2015

En 2015 se observan 3 contratos separados (41M + 38M + 20M = 99M) todos por adjudicacion directa, vs el patron previo de un solo contrato plurianual grande. Esto sugiere posible **threshold splitting** para mantener montos individuales por debajo de umbrales de fiscalizacion.

## Recomendaciones

1. Verificar si el ISSSTE realizo estudios de mercado durante 2003-2015 para este servicio
2. Investigar por que no se licito abiertamente un servicio tan commoditizado
3. Revisar si existen quejas de otras empresas de seguridad sobre barreras de entrada
4. Analizar la transicion post-2015 - que empresa sucedio a Grupo Operativo

## Nivel de Confianza: MEDIO

Patron claro de monopolio institucional, pero el sector seguridad puede tener justificaciones operativas (conocimiento de instalaciones, acreditaciones). Requiere verificacion ASF.
"""

MEMO_324 = """# Caso 324: Lavanderia de Hospitales y Sanatorios - Monopolio Lavanderia Sector Salud

## Resumen Ejecutivo

**LAVANDERIA DE HOSPITALES Y SANATORIOS S.A. DE C.V.** (VID 4699) ha operado como monopolio de facto en servicios de lavanderia hospitalaria para las principales instituciones de salud publica de Mexico durante 23 anios (2002-2025), acumulando 4,064 millones de pesos en 157 contratos.

## Hallazgos Clave

| Indicador | Valor | Significado |
|-----------|-------|-------------|
| Instituciones de salud atendidas | 5+ (ISSSTE, IMSS-Bienestar, IMSS, HGM, SSA) | Monopolio multi-institucional |
| Tasa single-bid | 64.3% (101/157) | Competencia reducida sistematicamente |
| Adjudicacion directa | 26.1% (41/157) | Combinacion licitacion sin competidores + DA |
| Monto total | 4,064 M MXN | Uno de los mayores monopolios en servicios hospitalarios |
| Longevidad | 23 anios (2002-2025) | Trasciende 4 administraciones federales |
| Risk score promedio | 0.826 (Critico) | Monopolio concentrado |
| RFC | No registrado | Opacidad fiscal en proveedor de escala billonaria |

## Distribucion por Institucion

| Institucion | Contratos | Monto | % del Total |
|-------------|-----------|-------|-------------|
| ISSSTE | 29 | 1,364M | 33.6% |
| IMSS-Bienestar | 3 | 1,061M | 26.1% |
| IMSS | 30 | 373M | 9.2% |
| Hospital General de Mexico | 9 | 317M | 7.8% |
| Secretaria de Salud | 33 | 239M | 5.9% |

## Contratos Destacados

1. **Lavanderia IMSS-Bienestar Jun-Dic 2025** (2025): 854M MXN - contrato semestral masivo
2. **Lavanderia ISSSTE 2019** (2019): 442M MXN - adjudicacion directa
3. **Lavanderia ISSSTE 2016** (2016): 428M MXN - licitacion publica
4. **Lavanderia IMSS-Bienestar 2025** (2025): 201M MXN - segundo contrato en mismo anio

## Patron de Riesgo

Este caso representa un **monopolio multi-institucional de servicio esencial**:
- Una sola empresa controla la lavanderia de los principales hospitales publicos de Mexico
- Opera en ISSSTE, IMSS, IMSS-Bienestar, HGM y SSA simultaneamente
- 23 anios de operacion continua - ningun competidor ha logrado desplazarla
- La lavanderia hospitalaria es un servicio commoditizado que en otros paises se distribuye entre multiples proveedores
- La escala (4B MXN) es inusual para un servicio de lavanderia - sugiere precios inflados o volumen monopolizado

## Anomalias Especificas

- **Sin RFC**: Un proveedor de 4B MXN sin RFC registrado en COMPRANET es una senal de alerta critica
- **Contratos 2025**: 854M + 201M en un solo anio por IMSS-Bienestar sugiere escalamiento rapido
- **Cross-institutional**: Que las distintas instituciones de salud no coordinen para diversificar proveedores sugiere inercia burocratica o relaciones arraigadas

## Recomendaciones

1. **PRIORITARIO**: Verificar RFC mediante padron de proveedores - un proveedor de esta escala no puede operar sin RFC
2. Comparar precios por kilogramo de ropa lavada contra benchmarks internacionales
3. Investigar si existen empresas filiales o subsidiarias que participen como competidores ficticios
4. Revisar observaciones ASF sobre contrataciones de lavanderia en ISSSTE e IMSS
5. Analizar por que 5+ instituciones de salud convergen en el mismo proveedor sin coordinacion aparente

## Nivel de Confianza: MEDIO

El patron de monopolio multi-institucional de 23 anios es altamente sospechoso, pero la lavanderia hospitalaria es un servicio especializado con barreras de entrada (capacidad industrial, normas sanitarias). Requiere verificacion de precios y RFC.
"""

MEMO_325 = """# Caso 325: GVARGAS Comercializadora - Intermediario Equipo de Seguridad Pemex

## Resumen Ejecutivo

**GVARGAS COMERCIALIZADORA SA DE CV** (VID 34768) opero como intermediario de equipo de proteccion personal y ropa de trabajo para Pemex-Exploracion y Produccion durante 2008-2019, acumulando 509 millones de pesos en 83 contratos con un 67.8% de adjudicacion directa.

## Hallazgos Clave

| Indicador | Valor | Significado |
|-----------|-------|-------------|
| Concentracion Pemex-EP | 74.6% (380M/509M) | Alta dependencia de una sola unidad |
| Adjudicacion directa | 67.8% (55/83) | Proporcion anomala para commodities |
| Single-bid | 0% | No aplica - mayoria por DA |
| Nombre generico | "GVARGAS Comercializadora" | Patron de empresa intermediaria |
| Risk score promedio | 0.784 (Critico) | Intermediario sospechoso |
| RFC | No registrado | Opacidad fiscal |

## Contratos Principales

1. **Equipo Seguridad Personal PEP Partidas 3-4** (2012): 81.4M MXN - DA
2. **Equipo Proteccion Personal UNP** (2013): 81.4M MXN - DA, monto identico al anterior
3. **Contrato Especifico PEMEX 2** (2013): 48.2M MXN - DA
4. **Equipo Seguridad Personal PEP** (2012): 37.4M MXN - DA
5. **Vestuario CONAFOR Combatientes Incendios** (2019): 31.3M MXN - licitacion publica

## Patron de Riesgo

Patron clasico de **intermediario de commodities**:
- Equipo de proteccion personal y ropa de trabajo son productos estandarizados disponibles de multiples fabricantes
- Sin embargo, se canalizan a traves de una "comercializadora" con nombre generico
- 67.8% adjudicacion directa para productos que deberian licitarse abiertamente
- Montos identicos en contratos consecutivos (81.4M en 2012 y 2013) sugiere renovacion automatica
- Opera en Pemex-EP, Pemex-Refinacion, Pemex-Petroquimica y CONAFOR

## Anomalias Especificas

- **Montos duplicados**: 81,438,066 MXN aparece exactamente dos veces (2012 y 2013) - posible copia de contrato
- **Nombre "GVARGAS"**: Patron tipico de empresa intermediaria - apellido + actividad generica
- **Distribucion Pemex**: Opera en 3 subsidiarias de Pemex (EP, Refinacion, Petroquimica) - sugiere relacion con area de adquisiciones corporativa
- **Sin RFC en COMPRANET**: Para un proveedor con 509M en Pemex, la ausencia de RFC es anomala

## Distribucion por Institucion

| Institucion | Contratos | Monto |
|-------------|-----------|-------|
| Pemex-Exploracion y Produccion | 12 | 380M |
| CONAFOR | 9 | 46M |
| Compania Mexicana de Exploraciones | 4 | 29M |
| Pemex-Refinacion | 12 | 17M |
| Pemex-Petroquimica | 12 | 15M |

## Recomendaciones

1. Verificar si GVARGAS es fabricante o solo revendedor - si es revendedor, investigar margen comercial
2. Cruzar con padron de proveedores Pemex para obtener RFC y datos fiscales
3. Investigar relacion con Compania Mexicana de Exploraciones (4 contratos, 29M) - posible vinculo corporativo
4. Comparar precios de equipo de proteccion contra catalogos de fabricantes directos
5. Verificar si existen observaciones ASF sobre adquisiciones de EPP en Pemex 2008-2019

## Nivel de Confianza: MEDIO

Patron de intermediario consistente con riesgos de sobreprecio, pero requiere verificacion de precios de mercado y confirmacion de que no es fabricante directo.
"""

MEMOS = {
    322: ("322_dragados_conagua.md", MEMO_322),
    323: ("323_grupo_operativo_issste.md", MEMO_323),
    324: ("324_lavanderia_hospitales.md", MEMO_324),
    325: ("325_gvargas_pemex.md", MEMO_325),
}


def main():
    for case_id, (filename, content) in MEMOS.items():
        path = os.path.join(MEMO_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  Wrote {path}")


if __name__ == "__main__":
    main()
