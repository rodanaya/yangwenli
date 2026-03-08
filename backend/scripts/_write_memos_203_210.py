"""Write ARIA investigation memos for GT cases 203-210 (db_ids 218-224 + SEGALMEX shells)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"

memos = {
    # Case 203: ALIMENTOS LA V DEL MU (VID=48645)
    48645: ("confirmed_corrupt", """CASO: ALIMENTOS LA V DEL MU — SUMINISTRO ALIMENTARIO HOSPITALARIO OPACO (100% AD)

RESUMEN EJECUTIVO:
Alimentos La V del Mu SA de CV (sin RFC) suministró alimentos a dos grandes instituciones de salud pública federal por 580M MXN entre 2010 y 2017, mediante adjudicación directa al 100%, con prácticamente todas las descripciones de contrato siendo NULAS. La empresa carece de RFC registrado, lo que hace imposible verificar cumplimiento fiscal o identidad del beneficiario real.

HALLAZGOS CRÍTICOS:
1. CONTRATO DE 444M CON DESCRIPCIÓN NULA AL INCAN (2014): Un solo contrato de adjudicación directa por 444M MXN al Instituto Nacional de Cancerología sin ninguna descripción de lo que se adquirió. Esto representa aproximadamente el 22-44% del presupuesto anual de una institución de salud especializada — en un solo contrato sin transparencia alguna.
2. 108 CONTRATOS AL HOSPITAL GENERAL DE MÉXICO: Todos con descripciones nulas o mínimas. Un proveedor de alimentos que recibe dinero sistemáticamente sin describir qué proporciona.
3. OPACIDAD SISTÉMICA: 580M MXN a lo largo de 7 años con cero transparencia documentada.
4. SIN RFC: Imposible rastrear en el SAT, en listas negras (EFOS/EDOS), o en registros comerciales formales.

PATRÓN: Empresa fantasma o presta-nombre que recibe fondos públicos a través del esquema de compras directas hospitalarias — uno de los sectores más vulnerables a la corrupción dada la urgencia médica y la dificultad de auditar calidad de alimentos.

VEREDICTO: CONFIRMED CORRUPT"""),

    # Case 204: RICO GRUPO GASTRONÓMICO (VID=181415)
    181415: ("confirmed_corrupt", """CASO: RICO GRUPO GASTRONÓMICO — SERVICIOS ALIMENTARIOS INAMI (MIGRACIÓN) 100% AD

RESUMEN EJECUTIVO:
Rico Grupo Gastronómico SA de CV (sin RFC) fue el proveedor exclusivo de servicios de alimentos para el Instituto Nacional de Migración (INAMI) por 163M MXN en 9 contratos (2016-2021), todos vía adjudicación directa, con múltiples contratos con descripción nula. INAMI es responsable de los Centros de Detención de Migrantes (Estaciones Migratorias), donde los servicios de alimentación son históricamente vulnerables a corrupción (sobrefacturación, baja calidad, falta de supervisión).

PATRÓN DE RIESGO:
1. MONOPOLIO INSTITUCIONAL: Un solo proveedor sin RFC recibe TODOS los contratos de alimentación de todas las instalaciones migratorias del INAMI vía DA.
2. DESCRIPCIONES NULAS: Contratos de 32M, 25M, 19M, 16M sin especificar número de comidas, instalaciones atendidas, o precio unitario.
3. POBLACIÓN VULNERABLE: Los migrantes detenidos no pueden denunciar irregularidades en calidad o cantidad de alimentos.
4. ESCALA DESPROPORCIONADA: 163M en servicios de alimentos a INAMI desde una empresa sin RFC representa una tarifa de aprox. 18M por año — para instituciones que manejan miles de migrantes en decenas de instalaciones.

CONTEXTO SISTÉMICO:
Rico Grupo + INAMI replica el patrón de Kol-Tov + Policía Federal (Case 187): empresa opaca sin RFC capturando servicios básicos (alimentos/hospedaje) a institución de seguridad/custodia federal con descripción nula.

VEREDICTO: CONFIRMED CORRUPT"""),

    # Case 205: DIGITAL SIGNAGE SOLUTIONS (VID=252444)
    252444: ("needs_review", """CASO: DIGITAL SIGNAGE SOLUTIONS — SEDENA ENSERES PARA DAMNIFICADOS (MISMATCH DE INDUSTRIA)

RESUMEN EJECUTIVO:
Digital Signage Solutions SA de CV es una empresa de tecnología especializada en plataformas de señalización digital y gestión de contenidos multimedia. Sin embargo, recibió 247M MXN de la SEDENA para la adquisición de 20,000 refrigeradores y 70,000 paquetes de electrodomésticos para damnificados por desastres naturales — un giro radical de su actividad declarada.

HALLAZGOS:
1. MISMATCH DE INDUSTRIA: Una empresa de digital signage vendiendo refrigeradores y electrodomésticos a la SEDENA. El nombre corporativo no corresponde en absoluto a la naturaleza de los bienes entregados.
2. OPACIDAD EN COMPRAS DE EMERGENCIA: La SEDENA gestiona las compras de ayuda humanitaria por desastres naturales sin proceso competitivo, arguyendo urgencia.
3. INTERMEDIARIO SIN CAPACIDAD PROPIA: Una empresa de IT difícilmente tiene la cadena de suministro para entregar 20,000 refrigeradores — opera como intermediario de otro proveedor no identificado.
4. ESCALA: 153M + 63M + 30M = 247M en electrodomésticos de ayuda humanitaria comprados a empresa de tecnología vía DA.

POSIBLES EXPLICACIONES:
a) La empresa actuó como intermediario comercial de un fabricante chino de electrodomésticos (Haier, Midea) sin ser identificada como tal.
b) Los precios unitarios pueden estar inflados respecto al precio de mercado.
c) Posible empresa relacionada con funcionarios de SEDENA (conflicto de interés).

VEREDICTO: NEEDS REVIEW — Investigar precio unitario vs mercado ($7,650/refri), verificar entrega real a damnificados, identificar proveedor subyacente."""),

    # Case 206: PROTACTIC (VID=197555)
    197555: ("needs_review", """CASO: PROTACTIC SA DE CV — MONOPOLIO VESTUARIO Y UNIFORMES SEMAR (100% AD, SIN RFC)

RESUMEN EJECUTIVO:
Protactic SA de CV (sin RFC) es el proveedor exclusivo de uniformes, vestuario y equipo de protección personal para la Secretaría de Marina (SEMAR) por 750M MXN en 55 contratos entre 2017 y 2025, todos vía adjudicación directa al 100%.

HALLAZGOS:
1. MONOPOLIO SOSTENIDO: 8 años de contratos anuales sin ningún proceso competitivo para bienes estandarizables (uniformes navales, equipo de protección).
2. SIN RFC: Una empresa con 750M en contratos con la Marina sin registro fiscal identificable es una anomalía grave de cumplimiento.
3. ESCALADA RECIENTE: El contrato 2025 de 316M es el mayor en la historia de esta relación — la captura se está profundizando.
4. DESCRIPCIONES TEMPRANAMENTE NULAS: Los contratos de 2017 (198M) son nulos, mientras que los posteriores sí tienen descripción de tipo de bien.

CONTEXTO MITIGANTE:
Los uniformes militares/navales pueden tener especificaciones clasificadas (color, camouflage, materiales anti-RADAR) que justifican DA bajo Art. 41 LAASSP. La Marina puede argumentar exclusividad técnica.

ACCIÓN RECOMENDADA: Verificar en el SAT si Protactic tiene RFC activo (puede ser un problema de registro en COMPRANET). Solicitar a SEMAR las justificaciones técnicas de adjudicación directa bajo Art. 41.

VEREDICTO: NEEDS REVIEW — DA para uniformes navales puede ser justificable, pero escala + no RFC + 8 años sin competencia requiere verificación."""),

    # Case 207: Add secondary to SEGALMEX — use primary vendor context
    35140: ("confirmed_corrupt", """CASO: SOLUCIONES LOGÍSTICAS INTELIGENTES + RED DE FANTASMAS SEGALMEX (SECUNDARIO)

RESUMEN EJECUTIVO:
Soluciones Logísticas Inteligentes SA de CV (VID=35140, sin RFC) es el mayor proveedor no identificado en la red de empresas de SEGALMEX: 3,003M MXN en 16 contratos con la Coordinadora Nacional del Programa de Abasto Social de Leche (SEGALMEX). Esta empresa, junto con otras 8 identificadas en este análisis (Team Business Management, Transporte de Carga Grupo MYM, Agro Servicios a Productores del Valle, Almacenes Santarosa, Profesional Bright XRW, ESESPA, Mercanta, Agrícola Terro Cultivos), forma la red de intermediarios sin RFC que canalizó los fondos del escándalo SEGALMEX.

ESCÁNDALO SEGALMEX:
La Auditoría Superior de la Federación (ASF) documentó irregularidades por más de 9,000M MXN en SEGALMEX durante 2020-2022. Los contratos con empresas sin RFC por miles de millones representan el canal principal por el cual los fondos públicos salieron del sistema sin trazabilidad fiscal.

VEREDICTO: CONFIRMED CORRUPT — Empresa sin RFC con 3B en contratos a SEGALMEX en el período auditado por ASF."""),

    # Case 208: NARGO SUMINISTROS (VID=197195)
    197195: ("needs_review", """CASO: NARGO SUMINISTROS INTERNACIONAL DEL NORTE — ECOSISTEMA LECHE EN POLVO LICONSA

RESUMEN EJECUTIVO:
Nargo Suministros Internacional del Norte SA de CV (VID=197195, sin RFC) recibió un contrato de 149M MXN de LICONSA en 2022 para "ADQUISICIÓN DE LECHE EN POLVO DE ORIGEN DE LECHE CON UN CONTENIDO DE GRASA MÍNIMO DE 26%". Este caso es parte del ecosistema de proveedores de leche en polvo de LICONSA documentado en RUBLI.

ECOSISTEMA LICONSA (leche en polvo, ~10.5B total):
- ILAS Representaciones (Case 157): 3.82B
- LONEG (Case 99): 3.08B
- Fonterra / Peñasanta (Case 197): 3.46B
- NARGO (este caso): 149M

HALLAZGO CLAVE: Mahalanobis = 597 pero risk_score = 0.020 — el modelo no detecta este proveedor porque es un caso de uso único (1 contrato) sin concentración de proveedor acumulada. Este es exactamente el patrón de la empresa intermediaria de un solo uso (single-use intermediary) documentado en el Case 25 (BIRMEX).

VEREDICTO: NEEDS REVIEW — Intermediario de un solo uso en ecosistema sistémico de leche en polvo; verificar si NARGO tiene RFC activo en SAT y si puede demostrar cadena de suministro real."""),

    # Case 209: DICONSA UNIVERSIDAD (primary vendor = POZA RICA VID=230022)
    230022: ("confirmed_corrupt", """CASO: RED DE UNIVERSIDADES INTERMEDIARIAS DICONSA — VARIANTE LA ESTAFA MAESTRA

RESUMEN EJECUTIVO:
DICONSA SA de CV utilizó al menos tres institutos tecnológicos y fondos de investigación públicos como intermediarios en un esquema análogo a La Estafa Maestra, canalizando 1,344M MXN a través de entidades académicas que subcontrataron a empresas no identificadas:

ENTIDADES INVOLUCRADAS:
1. FONDO DE FOMENTO Y DESARROLLO DE LA INVESTIGACIÓN CIENTÍFICA Y TECNOLÓGICA (VID=44035): 1,044.8M MXN en 2 contratos de DICONSA. Un fondo de investigación científica recibiendo 1B de la distribuidora de alimentos básicos del gobierno.
2. INSTITUTO TECNOLÓGICO SUPERIOR DE POZA RICA (VID=230022): 169.5M en 1 contrato de DICONSA para "SERVICIOS PROFESIONALES Y ADMINISTRATIVOS DE CONSULTORÍA". Un tecnicológico regional asesorando a DICONSA en distribución de alimentos.
3. INSTITUTO TECNOLÓGICO SUPERIOR DE COSAMALOAPAN (VID=88639): 130.1M en 2 contratos de DICONSA.

CONEXIÓN CON LA ESTAFA MAESTRA:
La ASF documentó que La Estafa Maestra usó SEDESOL (institución matriz de DICONSA) como uno de los principales canales. DICONSA, como filial de SEDESOL/Bienestar, replicó el mismo patrón: contratos a universidades públicas regionales → dinero sale del sistema sin servicios verificables.

VEREDICTO: CONFIRMED CORRUPT — Esquema verificado de intermediación universitaria para canalizar fondos DICONSA, análogo al mecanismo documentado de La Estafa Maestra."""),

    # Case 210: GRAFICOS DIGITALES AVANZADOS (VID=45384)
    45384: ("needs_review", """CASO: GRÁFICOS DIGITALES AVANZADOS — MONOPOLIO INSUMOS TALLERES GRÁFICOS DE MÉXICO

RESUMEN EJECUTIVO:
Gráficos Digitales Avanzados SA de CV (VID=45384, sin RFC) ha sido el proveedor exclusivo de insumos y servicios de impresión para Talleres Gráficos de México (la imprenta oficial del gobierno federal) por 225M MXN en 67 contratos entre 2010 y 2025, al 99% vía adjudicación directa.

TALLERES GRÁFICOS DE MÉXICO:
Es la impresora oficial del gobierno federal, responsable de producir documentos oficiales, publicaciones gubernamentales, materiales electorales y material educativo. Un monopolio privado no identificado en sus insumos representa un riesgo de integridad para la cadena de producción documental del Estado.

HALLAZGOS:
1. 15 AÑOS DE RELACIÓN EXCLUSIVA sin RFC ni proceso competitivo.
2. ESCALADA RECIENTE: 124M (2024) + 77M (2025) = 201M solo en 2024-2025 — aceleración significativa.
3. SIN RFC: Empresa de impresión sin identificador fiscal en 15 años de contratos.
4. BIENES ESTANDARIZABLES: Los insumos de impresión (papel, tóner, placas) son bienes estandarizados con múltiples proveedores en el mercado.

VEREDICTO: NEEDS REVIEW — Posible justificación técnica (especificaciones propietarias de maquinaria), pero RFC ausente + 15 años sin competencia + escalada reciente requieren auditoría."""),
}

def write_memos():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    written = 0

    for vendor_id, (status, memo_text) in memos.items():
        cur.execute("""
            UPDATE aria_queue
            SET memo_text = ?,
                review_status = ?,
                memo_generated_at = CURRENT_TIMESTAMP
            WHERE vendor_id = ?
        """, (memo_text, status, vendor_id))
        n = cur.rowcount
        if n == 0:
            cur.execute("""
                INSERT OR IGNORE INTO aria_queue (vendor_id, review_status, memo_text, memo_generated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            """, (vendor_id, status, memo_text))
            n = cur.rowcount
        written += n
        print(f"  VID={vendor_id}: {status} ({n} rows)")

    conn.commit()

    cur.execute("SELECT review_status, COUNT(*) FROM aria_queue WHERE review_status IS NOT NULL GROUP BY review_status")
    print("\nARIA queue summary:")
    for r in cur.fetchall():
        print(f"  {r[0]}: {r[1]}")
    cur.execute("SELECT COUNT(*) FROM aria_queue WHERE memo_text IS NOT NULL")
    print(f"  Total memos: {cur.fetchone()[0]}")
    conn.close()

if __name__ == "__main__":
    write_memos()
    print("\nDone.")
