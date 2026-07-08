# Comunicado de Prensa

**PARA PUBLICACIÓN INMEDIATA**

---

## RUBLI: plataforma de código abierto detecta patrones de riesgo de corrupción en 3 millones de contratos federales mexicanos

**Herramienta gratuita cruza datos públicos de COMPRANET, SAT y SFP para señalar contratos de alto riesgo en el gasto público federal 2002–2025**

---

MÉXICO — RUBLI (rubli.xyz), una plataforma de análisis de contratación pública desarrollada como proyecto independiente de código abierto, pone a disposición de periodistas, investigadores y ciudadanía un sistema automatizado de detección de patrones de riesgo en **3,058,286 contratos federales mexicanos** celebrados entre 2002 y 2025, con un valor total de aproximadamente **9.9 billones de pesos**.

La plataforma aplica un modelo estadístico sobre los datos públicos de COMPRANET para identificar contratos con características asociadas a irregularidades documentadas: empresas fantasma, monopolización de proveedores, fraccionamiento de contratos, sobreprecios, redes de co-licitación y abuso de la adjudicación directa.

**Hallazgos principales**

- **11.0% de los contratos presenta indicadores de alto riesgo** — porcentaje que se ubica dentro del rango de referencia de la OCDE para sistemas de alerta temprana en contratación pública (2–15%). De ese total, **5.2% (~159,000 contratos) alcanza el nivel de riesgo crítico**, con puntuaciones estadísticamente similares a las de casos documentados como la red de empresas fantasma del IMSS, el desvío en Segalmex y las compras de emergencia por COVID-19.

- **299 proveedores en el nivel de investigación más urgente (T1)** y 1,488 en el nivel T2, según el sistema de priorización ARIA, que cruza las puntuaciones de riesgo con registros externos: **13,960 empresas del listado de EFOS del SAT** (facturación de operaciones simuladas) y **1,954 sanciones** del registro de proveedores sancionados de la SFP.

- **Aproximadamente 2.84 billones de pesos** en desvío estimado, sumados a partir de la biblioteca de más de 1,400 casos documentados de la plataforma. Es una cifra de piso: se agrega el monto estimado de cada caso y 41 casos carecen de esa estimación.

"El modelo fue entrenado con más de 1,400 casos de corrupción validados y documentados en registros judiciales y periodísticos", explica el equipo de RUBLI. "No reemplaza la investigación periodística: indica dónde mirar. Una puntuación alta significa que un contrato comparte características estadísticas con casos conocidos de irregularidades. No es prueba de nada. Es una herramienta para priorizar la investigación en un universo de más de tres millones de contratos que ningún equipo podría revisar manualmente."

El modelo de riesgo (versión 0.8.5) es una regresión logística con regularización ElasticNet y corrección PU-learning, evaluado con una metodología de separación por proveedor: ningún contrato de un mismo proveedor aparece simultáneamente en los conjuntos de entrenamiento y prueba. El área bajo la curva ROC es de **0.785 en el conjunto de prueba** (0.797 en entrenamiento), sobre una escala de 0 a 1 donde 1 representa discriminación perfecta.

**Acceso y metodología**

RUBLI es de uso completamente gratuito en rubli.xyz, sin necesidad de registro. El código fuente está disponible bajo licencia Apache 2.0 en github.com/rodanaya/yangwenli. La metodología completa, los coeficientes del modelo y sus limitaciones conocidas están documentados públicamente en la propia plataforma (sección Metodología).

Periodistas e investigadores pueden consultar perfiles individuales de proveedores, historiales de contratación por dependencia, visualizaciones de redes de co-licitación y la lista de investigación priorizada (ARIA) directamente desde el sitio.

**Limitaciones importantes**

Las puntuaciones de riesgo son indicadores estadísticos, no determinaciones de responsabilidad. La plataforma solo tiene acceso a los datos de adjudicación registrados en COMPRANET, no a la ejecución de los contratos. La calidad de los datos varía según el periodo: los registros de 2002 a 2010 tienen cobertura muy limitada de RFC. El registro federal quedó congelado el 28 de septiembre de 2025 tras la desaparición de CompraNet; RUBLI recuperó de forma independiente 69,516 adjudicaciones posteriores, publicadas de manera fragmentada (sección «El Apagón»).

---

**Contacto**

Plataforma: rubli.xyz
Código fuente: github.com/rodanaya/yangwenli
Correo: prensa@rubli.xyz

*RUBLI es un proyecto independiente de código abierto orientado a la transparencia en la contratación pública. No recibe financiamiento de partidos políticos ni de dependencias gubernamentales.*
