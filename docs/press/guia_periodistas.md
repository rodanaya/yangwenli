# Guia practica para periodistas
## Como usar RUBLI (rubli.xyz) en investigaciones de contratacion publica

---

RUBLI analiza 3,051,294 contratos federales mexicanos (2002-2025) y asigna a cada uno una puntuacion de riesgo basada en patrones estadisticos asociados a irregularidades documentadas. Esta guia explica como navegar la plataforma para generar pistas de investigacion.

---

## Como investigar un proveedor especifico

**Paso 1 — Perfil del proveedor**
Busca el nombre o RFC del proveedor en la barra de busqueda principal. El perfil muestra: volumen total de contratos, dependencias con las que opera, distribucion de riesgo de sus contratos y posicion en la cola de investigacion ARIA.

**Paso 2 — Red Thread (Hilo Rojo)**
Desde el perfil, accede a "Red Thread" para ver una narrativa cronologica del proveedor: como fue creciendo su participacion de mercado, en que momentos se concentraron contratos en una sola dependencia, y si existen contratos en periodos electorales o de emergencia. Esta vista esta disponible para proveedores clasificados en los niveles T1 y T2 de la cola ARIA.

**Paso 3 — Cola ARIA**
La seccion ARIA (/aria) presenta los 320 proveedores de maxima prioridad (T1) y los 1,234 del nivel T2. Puedes filtrar por patron de riesgo: empresa fantasma, monopolio sectorial, intermediario sospechoso, captura institucional. Cada proveedor en T1 tiene un memo de investigacion generado automaticamente.

---

## Como encontrar los casos mas graves en un sector

**Desde la pagina de sectores (/sectors):** selecciona el sector que te interesa (salud, infraestructura, energia, etc.). La vista muestra la distribucion de riesgo del sector, los proveedores con mayor concentracion de mercado y los contratos de riesgo critico ordenados por monto.

**Desde el perfil de sector:** el panel "Top proveedores por riesgo" lista a los proveedores con mayor puntuacion promedio y mayor volumen de contratos de riesgo critico. Este es el punto de entrada mas util para comenzar una investigacion sectorial.

---

## Como usar la cola ARIA para generar pistas

La cola ARIA (/aria) combina la puntuacion de riesgo del modelo con cruces contra registros externos (SAT EFOS, SFP) y analisis de patrones de red. Permite filtrar por:

- **P1 Monopolio:** proveedores con participacion de mercado anormalmente alta en un sector o dependencia
- **P2 Empresa fantasma:** proveedores con caracteristicas de factureras (RFC en lista SAT EFOS, pocos contratos, concentracion extrema)
- **P3 Intermediario:** proveedores que actuan como intermediarios entre la dependencia y otros proveedores
- **P6 Captura institucional:** dependencias donde un solo proveedor o grupo de proveedores concentra una fraccion desproporcionada del gasto

---

## Tres angulos de investigacion sugeridos

**1. Compras de emergencia repetidas al mismo proveedor**
Filtra en la cola ARIA por patron P2 (empresa fantasma) en el sector salud. Cruza con el periodo 2020-2021. La plataforma identifica proveedores que concentraron contratos de emergencia por COVID-19 con caracteristicas estadisticas similares a casos documentados de irregularidades.
*Funcion a usar: ARIA > filtro Sector=Salud, Patron=Fantasma, Periodo=2020-2021*

**2. Proveedores inhabilitados que siguen contratando**
La plataforma cruza con las 1,954 sanciones del registro SFP. Busca en el perfil de proveedor la seccion "Registros externos" para verificar si aparece en el listado de inhabilitados y si existen contratos posteriores a la fecha de sancion.
*Funcion a usar: Perfil de proveedor > Registros externos > SFP*

**3. Monopolio sectorial en tecnologia o servicios**
Identifica proveedores con alta puntuacion en el indicador `vendor_concentration` dentro del sector tecnologia. La plataforma detecta casos como el monopolio IT Toka (dependencias educativas) y el monopolio de vales Edenred. Busca proveedores donde un solo RFC concentra mas del 30% del gasto sectorial en una dependencia durante varios años consecutivos.
*Funcion a usar: Sector=Tecnologia > Top proveedores por concentracion*

---

## Preguntas frecuentes

**¿Esto prueba corrupcion?**
No. Las puntuaciones son indicadores estadisticos que miden similitud con patrones de casos documentados. Una puntuacion alta significa que el contrato o proveedor comparte caracteristicas con irregularidades conocidas. No implica responsabilidad penal ni administrativa. Para determinar responsabilidad se requiere investigacion adicional, acceso a documentos originales y, en su caso, proceso legal.

**¿Puedo citar las puntuaciones en una nota periodistica?**
Si, con la aclaracion correspondiente. La formula recomendada es: "segun el sistema de deteccion de patrones RUBLI, que analiza datos publicos de COMPRANET, este proveedor presenta una puntuacion de riesgo de [X], lo que indica que sus contratos comparten caracteristicas estadisticas con casos documentados de irregularidades. Esto no constituye prueba de conducta ilicita."

**¿Los datos son confiables?**
Los datos provienen de COMPRANET, el sistema oficial de compras del gobierno federal. RUBLI los procesa tal como estan disponibles publicamente, con las mismas limitaciones de la fuente original. Los registros de 2002 a 2010 tienen menor calidad (cobertura de RFC de 0.1%). Para contratos recientes (2018-2025) la calidad es sustancialmente mejor. Los montos superiores a 100,000 millones de pesos son rechazados como errores de captura.

**¿Como verifico un hallazgo?**
Descarga los datos de contrato directamente desde COMPRANET (datos.gob.mx) usando el numero de expediente. Solicita informacion adicional via transparencia (INFOMEX/SIPOT). Cruza con el Diario Oficial de la Federacion para verificar licitaciones.

---

*RUBLI es un proyecto de codigo abierto. El codigo fuente, la metodologia y los coeficientes del modelo estan disponibles publicamente en github.com/rodanaya/yangwenli bajo licencia Apache 2.0.*
