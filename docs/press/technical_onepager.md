# RUBLI — Technical One-Pager / Ficha Tecnica
## rubli.xyz | github.com/rodanaya/yangwenli | Apache 2.0

---

## QUE HACE EL MODELO / WHAT THE MODEL DOES

**ES:** RUBLI aplica regresion logistica regularizada sobre 9 indicadores estandarizados (puntuaciones Z) calculados a nivel de contrato y proveedor. Cada indicador se normaliza respecto a la media y desviacion estandar del sector y año correspondiente, de modo que un contrato de adjudicacion directa en Defensa (donde es la norma) no recibe la misma penalizacion que uno en Educacion (donde es la excepcion). El modelo produce una puntuacion entre 0 y 1 que refleja similitud estadistica con patrones documentados de irregularidades.

**EN:** RUBLI applies regularized logistic regression over 9 standardized (z-score) indicators computed at the contract and vendor level. Each indicator is normalized against the sector-year mean and standard deviation, so a direct award in Defense (where it is the norm) is not penalized the same as one in Education (where it is the exception). The model produces a score from 0 to 1 reflecting statistical similarity to documented irregularity patterns.

**9 indicadores activos / 9 active features:**
- `price_volatility` — varianza del tamaño de contratos del proveedor vs. norma sectorial (coef. +0.534)
- `vendor_concentration` — participacion de mercado del proveedor en su sector (coef. +0.375)
- `price_ratio` — monto del contrato / mediana sectorial (coef. +0.235)
- `institution_diversity` — diversidad de dependencias atendidas — factor protector (coef. -0.382)
- `network_member_count` — tamaño de la red de co-licitacion del proveedor (coef. +0.181)
- `same_day_count` — contratos en el mismo dia al mismo proveedor — señal de fraccionamiento (coef. +0.094)
- `win_rate` — tasa de adjudicacion vs. linea base sectorial (coef. +0.049)
- `direct_award` — proporcion de adjudicaciones directas (coef. +0.031)
- `ad_period_days` — dias entre publicacion y fallo (coef. +0.042)

**Arquitectura:** 1 modelo global + 12 modelos por sector. Los sectores con menos de 500 casos positivos en entrenamiento usan el modelo global como respaldo. Correccion PU-learning (Elkan & Noto 2008), c=0.30.

---

## VALIDACION / VALIDATION METHODOLOGY

| Metrica | Valor |
|---|---|
| Casos de verdad de campo (ground truth) | 748 casos documentados, 603 proveedores |
| Contratos etiquetados | ~288,000 (ventaneados por periodo y dependencia) |
| Metodo de separacion | Estratificado por proveedor (70/30) — ningun proveedor aparece en entrenamiento y prueba simultaneamente |
| AUC-ROC entrenamiento | 0.798 |
| AUC-ROC prueba | 0.828 |
| Tasa de alto riesgo | 13.49% (rango OCDE: 2-15%) |
| Contratos riesgo critico (≥0.60) | 184,031 (6.01%) |

Casos documentados usados en entrenamiento: IMSS (red de empresas fantasma), Segalmex, compras COVID-19, La Estafa Maestra, Odebrecht-PEMEX, Grupo Higa/Casa Blanca, monopolio IT Toka, monopolio vales Edenred, fraccionamiento SixSigma, entre otros.

---

## FUENTES DE DATOS / DATA SOURCES

| Fuente | Registros | Uso |
|---|---|---|
| COMPRANET (SE) | 3,051,294 contratos 2002-2025 | Base principal de analisis |
| SAT EFOS (Art. 69-B definitivo) | 13,960 empresas | Cruce para deteccion de factureras |
| SFP — Sistema de Proveedores Sancionados | 1,954 sanciones | Bandera de inhabilitados |

---

## LIMITACIONES CONOCIDAS / KNOWN LIMITATIONS (importantes para citar correctamente)

1. **Fraude en ejecucion es invisible.** RUBLI analiza datos de adjudicacion (COMPRANET). No tiene acceso a informacion sobre ejecucion: sobreprecios durante obra, trabajadores fantasma, sustitucion de materiales. Infraestructura y construccion estan sistematicamente subestimados.

2. **Correlacion no es causalidad.** Una puntuacion alta indica similitud estadistica con patrones conocidos. No es determinacion de responsabilidad ni prueba de conducta ilicita.

3. **Etiquetas de entrenamiento provienen de escandalos de alto perfil.** El modelo detecta bien patrones similares a casos publicos (IMSS, Segalmex). Puede no detectar corrupcion de pequeña escala o con mecanismos distintos.

4. **Calidad de datos varia por periodo.** Los registros 2002-2010 tienen cobertura de RFC de 0.1%. Los puntajes de ese periodo son menos confiables.

5. **No hay identificacion definitiva de proveedores.** El mismo proveedor puede aparecer bajo multiples grafias en distintos años.

---

## ACCESO TECNICO / TECHNICAL ACCESS

- Interfaz web: **rubli.xyz**
- Explorador de API: **rubli.xyz/api-explorer**
- Codigo fuente: **github.com/rodanaya/yangwenli** (Apache 2.0)
- Documentacion metodologica: **rubli.xyz** (seccion Metodologia)
