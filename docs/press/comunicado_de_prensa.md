# Comunicado de Prensa

**PARA PUBLICACION INMEDIATA**

---

## RUBLI: Plataforma de codigo abierto detecta patrones de corrupcion en 3.1 millones de contratos federales mexicanos

**Herramienta gratuita de inteligencia artificial cruza datos de COMPRANET, SAT y SFP para identificar contratos de alto riesgo en el gasto publico federal 2002-2025**

---

MEXICO — RUBLI (rubli.xyz), una plataforma de analisis de contratacion publica desarrollada como proyecto de codigo abierto, pone a disposicion de periodistas, investigadores y ciudadanos un sistema automatizado de deteccion de patrones de riesgo en 3,051,294 contratos federales mexicanos celebrados entre 2002 y 2025, con un valor total de aproximadamente 9.9 billones de pesos.

La plataforma aplica modelos estadisticos sobre los datos publicos de COMPRANET para identificar contratos que presentan caracteristicas asociadas a irregularidades documentadas: empresas fantasma, monopolizacion de proveedores, fraccionamiento de contratos, sobreprecios, conflicto de interes y abuso de la figura de adjudicacion directa por emergencia.

**Hallazgos principales**

- **184,031 contratos clasificados como riesgo critico** (6.01% del total analizado), con puntuaciones estadisticamente similares a las de casos de corrupcion documentados como la red de empresas fantasma del IMSS, el fraude en Segalmex, y las irregularidades en las compras de emergencia por COVID-19.

- **13.49% de todos los contratos presenta indicadores de alto riesgo**, porcentaje que se ubica dentro del rango de referencia de la OCDE para sistemas de alerta temprana en contratacion publica (2-15%).

- **320 proveedores clasificados en el nivel de investigacion mas urgente** (Nivel T1) segun el sistema ARIA de priorizacion de la plataforma, que cruza puntajes de riesgo con registros externos: 13,960 empresas del listado SAT EFOS de empresas que facturan operaciones simuladas y 1,954 sanciones del Sistema de Informacion de Proveedores Sancionados de la SFP.

"El modelo fue entrenado a partir de 748 casos de corrupcion validados y documentados en registros judiciales y periodisticos", explica el equipo RUBLI. "No reemplaza la investigacion periodistica: identifica donde mirar. Una puntuacion alta significa que un contrato comparte caracteristicas estadisticas con casos conocidos de irregularidades. No es prueba de nada. Es una herramienta para priorizar la investigacion en un universo de mas de tres millones de contratos que ningun equipo podria revisar manualmente."

El modelo de riesgo (version 6.5) fue evaluado con una metodologia de separacion por proveedor: ningun contrato de un proveedor aparecio simultaneamente en el conjunto de entrenamiento y en el de prueba. El area bajo la curva ROC en el conjunto de prueba es de 0.828 sobre una escala de 0 a 1, donde 1 representa discriminacion perfecta.

**Acceso y metodologia**

RUBLI es de uso completamente gratuito en rubli.xyz. El codigo fuente esta disponible bajo licencia Apache 2.0 en github.com/rodanaya/yangwenli. La metodologia completa, los coeficientes del modelo y sus limitaciones conocidas estan documentados publicamente en la misma plataforma.

Los periodistas pueden acceder a perfiles individuales de proveedores, historiales de contratacion por dependencia, visualizaciones de redes de co-licitacion y la cola de investigacion priorizada ARIA directamente desde el sitio, sin necesidad de registro.

**Limitaciones importantes**

Los puntajes de riesgo son indicadores estadisticos, no determinaciones de responsabilidad. La plataforma no tiene acceso a informacion sobre la ejecucion de los contratos, solo a los datos de adjudicacion registrados en COMPRANET. La calidad de los datos varia segun el periodo: los registros de 2002 a 2010 tienen cobertura muy limitada de RFC.

---

**Contacto**

Plataforma: rubli.xyz
Codigo fuente: github.com/rodanaya/yangwenli
Correo: [disponible en el repositorio de GitHub]

*RUBLI es un proyecto independiente de codigo abierto orientado a la transparencia en la contratacion publica. No recibe financiamiento de partidos politicos ni de dependencias gubernamentales.*
