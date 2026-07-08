# Guía práctica para periodistas
## Cómo usar RUBLI (rubli.xyz) en investigaciones de contratación pública

---

RUBLI analiza **3,058,286 contratos federales mexicanos** (2002–2025) y asigna a cada uno una puntuación de riesgo basada en patrones estadísticos asociados a irregularidades documentadas. Esta guía explica cómo navegar la plataforma para generar pistas de investigación. El acceso es gratuito y no requiere registro.

---

## Cómo investigar a un proveedor específico

**Paso 1 — Perfil del proveedor**
Busca el nombre o RFC del proveedor en la barra de búsqueda principal. El perfil muestra: volumen total de contratos, dependencias con las que opera, distribución de riesgo de sus contratos, red de proveedores relacionados y su posición en la lista de investigación priorizada (ARIA).

**Paso 2 — Historial y narrativa**
El dossier del proveedor reconstruye su trayectoria: cómo fue creciendo su participación de mercado, en qué momentos concentró contratos en una sola dependencia y si hay adjudicaciones en periodos electorales o de emergencia. Incluye el vínculo con casos documentados cuando existe.

**Paso 3 — Lista de Vigilancia (ARIA)**
La sección ARIA (/aria, «Lista de Vigilancia») presenta los **299 proveedores de máxima prioridad (T1)** y los **1,488 del nivel T2**. Puedes filtrar por patrón de riesgo: empresa fantasma, monopolio sectorial, intermediario sospechoso, captura institucional. Cada proveedor T1 tiene un memo de investigación asociado.

---

## Cómo encontrar los casos más graves en un sector

**Desde la página de sectores (/sectors):** selecciona el sector que te interesa (salud, infraestructura, energía, etc.). La vista muestra la distribución de riesgo del sector, los proveedores con mayor concentración de mercado y los contratos de riesgo crítico ordenados por monto.

**Desde el perfil de sector:** el panel de proveedores por riesgo lista a los de mayor puntuación promedio y mayor volumen de contratos de riesgo crítico. Es el punto de entrada más útil para comenzar una investigación sectorial.

---

## Cómo usar la Lista de Vigilancia (ARIA) para generar pistas

ARIA combina la puntuación de riesgo del modelo con cruces contra registros externos (SAT EFOS, SFP) y análisis de patrones de red. Permite filtrar por:

- **P1 Monopolio:** proveedores con participación de mercado anormalmente alta en un sector o dependencia
- **P2 Empresa fantasma:** proveedores con características de factureras (RFC en lista SAT EFOS, pocos contratos, concentración extrema)
- **P3 Intermediario:** proveedores que actúan como intermediarios entre la dependencia y otros proveedores
- **P6 Captura institucional:** dependencias donde un solo proveedor o grupo concentra una fracción desproporcionada del gasto

---

## Tres ángulos de investigación sugeridos

**1. Compras de emergencia repetidas al mismo proveedor**
Filtra en ARIA por patrón P2 (empresa fantasma) en el sector salud. Cruza con el periodo 2020–2021. La plataforma identifica proveedores que concentraron contratos de emergencia por COVID-19 con características estadísticas similares a casos documentados de irregularidades.
*Función a usar: ARIA › filtro Sector = Salud, Patrón = Fantasma, Periodo = 2020–2021*

**2. Proveedores inhabilitados que siguen contratando**
La plataforma cruza con las 1,954 sanciones del registro SFP. Busca en el perfil del proveedor la sección de registros externos para verificar si aparece como inhabilitado y si existen contratos posteriores a la fecha de sanción.
*Función a usar: perfil de proveedor › registros externos › SFP*

**3. Monopolio sectorial en tecnología o servicios**
Identifica proveedores con alta puntuación en el indicador `vendor_concentration` dentro del sector tecnología. La plataforma detecta casos como el monopolio de TI Toka (dependencias educativas) y el monopolio de vales Edenred. Busca proveedores donde un solo RFC concentra más del 30% del gasto sectorial en una dependencia durante varios años consecutivos.
*Función a usar: Sector = Tecnología › proveedores por concentración*

---

## Preguntas frecuentes

**¿Esto prueba corrupción?**
No. Las puntuaciones son indicadores estadísticos que miden la similitud con patrones de casos documentados. Una puntuación alta significa que el contrato o proveedor comparte características con irregularidades conocidas. No implica responsabilidad penal ni administrativa. Para determinar responsabilidad se requiere investigación adicional, acceso a documentos originales y, en su caso, proceso legal.

**¿Puedo citar las puntuaciones en una nota?**
Sí, con la aclaración correspondiente. La fórmula recomendada es: *"según el sistema de detección de patrones RUBLI, que analiza datos públicos de COMPRANET, este proveedor presenta un indicador de riesgo de [X], lo que significa que sus contratos comparten características estadísticas con casos documentados de irregularidades. Esto no constituye prueba de conducta ilícita."* Usa siempre «indicador de riesgo», nunca «probabilidad de corrupción».

**¿Los datos son confiables?**
Provienen de COMPRANET, el sistema oficial de compras del gobierno federal. RUBLI los procesa tal como están disponibles públicamente, con las mismas limitaciones de la fuente original. Los registros de 2002 a 2010 tienen menor calidad (cobertura de RFC de 0.1%). Para contratos recientes (2018–2025) la calidad es sustancialmente mejor. Los montos superiores a 100,000 millones de pesos se rechazan como errores de captura. El registro federal quedó congelado el 28 de septiembre de 2025; las adjudicaciones posteriores provienen de una recuperación independiente (sección «El Apagón») y se presentan a nivel de dependencia, sector y monto, no de proveedor.

**¿Cómo verifico un hallazgo?**
Descarga los datos del contrato directamente desde COMPRANET (datos.gob.mx) usando el número de expediente. Solicita información adicional vía transparencia (Plataforma Nacional de Transparencia / SIPOT). Cruza con el Diario Oficial de la Federación para verificar las licitaciones.

---

*RUBLI es un proyecto de código abierto. El código fuente, la metodología y los coeficientes del modelo están disponibles públicamente en github.com/rodanaya/yangwenli bajo licencia Apache 2.0.*
