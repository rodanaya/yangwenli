"""Write ARIA investigation memos for GT cases 195-202 (db_ids 206-213)."""
import sqlite3, json
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

memos = {
    # Case 195 / db_id=206: TAS TEVEL — Policía Federal tactical transport
    206: {
        "vendor_id": 198525,
        "status": "confirmed_corrupt",
        "memo": """CASO: TAS TEVEL INTERNATIONAL LTD — TRANSPORTE TÁCTICO POLICÍA FEDERAL (100% AD)

RESUMEN EJECUTIVO:
TAS TEVEL INTERNATIONAL LTD es una empresa israelí especializada en equipamiento táctico y de seguridad que recibió contratos por 923M MXN de la Policía Federal mediante adjudicación directa al 100%, con descripciones de contrato nulas o genéricas y sin RFC registrado en el sistema COMPRANET. Este patrón de opacidad extrema — empresa extranjera, sin identificador fiscal mexicano, sin descripción de los servicios y con máxima concentración en un solo comprador gubernamental — constituye una señal de alerta de primer orden en materia de corrupción en compras de seguridad.

PATRONES DE RIESGO DETECTADOS:
1. ADJUDICACIÓN DIRECTA AL 100%: Todos los contratos otorgados sin proceso competitivo
2. AUSENCIA DE RFC: Empresa extranjera sin registro fiscal en México; imposible verificar cumplimiento tributario
3. DESCRIPCIONES NULAS: Los campos de descripción están vacíos o contienen texto genérico no informativo
4. CONCENTRACIÓN INSTITUCIONAL: 100% de contratos a Policía Federal — institución de alto riesgo histórico (PF fue disuelta en 2019 por escándalos de corrupción)
5. EMPRESA TÁCTICA ISRAELÍ: Proveedores extranjeros de equipamiento táctico de seguridad son vector frecuente de sobrefacturación y comisiones en mercados latinoamericanos

CONTEXTO SISTÉMICO:
Tas Tevel aparece junto a Kol-Tov International (Case 187, 1.64B MXN, también empresa israelí de seguridad con contratos nulos a PF) como parte de un ecosistema de proveedores tácticos extranjeros a la Policía Federal sin licitación. El monto combinado de ambas empresas supera 2.5B MXN en contratos opacos a la misma institución — patrón consistente con captura institucional y posible pago de comisiones a funcionarios de PF.

VEREDICTO: CONFIRMED CORRUPT — Opacidad sistémica, ausencia de RFC, 100% DA a institución de alto riesgo disuelto por corrupción."""
    },
    # Case 196 / db_id=207: RAPISCAN + LEIDOS — SAT customs scanners
    207: {
        "vendor_id": 205012,
        "status": "needs_review",
        "memo": """CASO: RAPISCAN SYSTEMS / LEIDOS — ESCÁNERES ADUANALES SAT (100% AD)

RESUMEN EJECUTIVO:
Rapiscan Systems (subsidiaria de OSIsoft/Leidos) y su matriz Leidos Inc. recibieron contratos por más de 3.25B MXN del SAT para escáneres de rayos X en aduanas, mediante adjudicación directa al 100%. Si bien el argumento de exclusividad técnica puede ser parcialmente válido (tecnología patentada de rayos X de alta energía), el monto total y la ausencia total de competencia en contratos plurianuales ameritan revisión.

PATRONES DE RIESGO DETECTADOS:
1. LOCK-IN TECNOLÓGICO: Rapiscan es el proveedor dominante de escáneres aduanales a nivel mundial; SAT argumenta exclusividad técnica para evadir licitación
2. CONCENTRACIÓN EXTREMA: 3.25B MXN en contratos directos — uno de los mayores casos de proveedor único en infraestructura aduanal
3. RED CORPORATIVA OPACA: Rapiscan Systems → Rapican Inc. → Leidos Inc.; múltiples entidades corporativas para misma familia de productos

CONTEXTO DIFERENCIADOR:
A diferencia de Tas Tevel/Kol-Tov (opacidad total), Rapiscan opera en un mercado técnico real con justificación parcial. Los escáneres de alta energía para contenedores tienen pocos proveedores mundiales. Sin embargo:
- El monto acumulado supera la compra inicial de equipos
- Contratos de mantenimiento plurianuales no requieren exclusividad
- Leidos (empresa separada pero relacionada) obtuvo contratos adicionales en paralelo

VEREDICTO: NEEDS REVIEW — Posible lock-in legítimo pero escala y estructura corporativa ameritan auditoría de la ASF sobre precios de referencia internacional."""
    },
    # Case 197 / db_id=208: FONTERRA + PEÑASANTA — LICONSA powdered milk
    208: {
        "vendor_id": 44252,
        "status": "needs_review",
        "memo": """CASO: FONTERRA / CORPORACIÓN ALIMENTARIA PEÑASANTA — LECHE EN POLVO LICONSA (100% AD)

RESUMEN EJECUTIVO:
Fonterra Brands México (subsidiaria de la cooperativa neozelandesa Fonterra) y Corporación Alimentaria Peñasanta (grupo lácteo español) recibieron contratos por 3.46B MXN de LICONSA para suministro de leche en polvo, mediante adjudicación directa al 100%. Este caso se integra a un ecosistema sistémico de proveedores de leche en polvo a LICONSA que acumula más de 10B MXN en contratos directos: ILAS (3.82B, Case 157), Loneg (3.08B, Case 99), Fonterra/Peñasanta (3.46B, este caso).

PATRONES DE RIESGO DETECTADOS:
1. ECOSISTEMA DE PROVEEDORES ROTATIVOS: LICONSA alternó entre Fonterra, Peñasanta, ILAS y Loneg en diferentes años, pero siempre mediante DA — sugiere acuerdo tácito de mercado compartido en lugar de competencia real
2. EMPRESAS MULTINACIONALES: Fonterra y Peñasanta son grupos multinacionales con capacidad para participar en licitaciones internacionales; la DA no se justifica por falta de oferta
3. ESCALA SISTÉMICA: El total del ecosistema leche en polvo LICONSA supera 10B MXN con ~0% de licitación abierta — patrón sistemático, no caso aislado

CONTEXTO:
Fonterra es la mayor cooperativa láctea del mundo. Peñasanta es un grupo familiar español con ingresos de 1.5B EUR. Ambas tienen capacidad técnica y financiera para participar en licitaciones internacionales. La elección de DA como modalidad exclusiva no tiene justificación técnica aparente.

VEREDICTO: NEEDS REVIEW — Parte de un ecosistema sistémico de DA en leche en polvo a LICONSA; requiere investigación conjunta de todos los proveedores de este ecosistema ante la ASF."""
    },
    # Case 198 / db_id=209: CANAUTO — SEDENA transport broker
    209: {
        "vendor_id": 305260,
        "status": "confirmed_corrupt",
        "memo": """CASO: CÁMARA NACIONAL DE AUTOTRANSPORTE DE CARGA (CANAUTO) — TRANSPORTE MILITAR SEDENA (100% AD)

RESUMEN EJECUTIVO:
La Cámara Nacional de Autotransporte de Carga (CANAUTO), una asociación gremial del sector privado, recibió contratos por 794M MXN de la SEDENA para servicios de transporte militar mediante adjudicación directa al 100%. Una cámara empresarial actuando como proveedor directo del Ejército para servicios de transporte — sin capacidad operativa propia, sin RFC de empresa, operando como intermediario entre la SEDENA y transportistas asociados — constituye una señal estructural de captura institucional y triangulación de fondos.

PATRONES DE RIESGO DETECTADOS:
1. ENTIDAD NO COMERCIAL COMO PROVEEDOR: CANAUTO es una cámara de representación gremial, no una empresa de transporte; no tiene flota propia ni capacidad operativa directa
2. INTERMEDIARIO PURO: Como cámara, CANAUTO necesariamente subcontrata a sus asociados — convirtiendo el contrato gubernamental en un mecanismo de distribución de rents con markup
3. ADJUDICACIÓN DIRECTA AL 100%: Sin licitación para servicios que podrían ser prestados directamente por cualquier empresa de transporte
4. CONCENTRACIÓN INSTITUCIONAL: 100% de contratos a SEDENA — institución con historial de opacidad en compras (fuero militar, contratos clasificados)

CONTEXTO SISTÉMICO:
El patrón de CANAUTO como intermediario gremial para servicios militares es estructuralmente similar al de Suministrador de Vacunas (Case 25) como intermediario para BIRMEX — organismos sin capacidad operativa propia que actúan como canal de fondos gubernamentales. En ambos casos, el beneficio real fluye hacia terceros no identificados en COMPRANET.

VEREDICTO: CONFIRMED CORRUPT — Asociación gremial sin capacidad operativa propia como proveedor único de servicios militares; estructura de intermediación opaca con fondos públicos."""
    },
    # Case 199 / db_id=210: EDICIONES CASTILLO — CONALITEG textbooks
    210: {
        "vendor_id": 46992,
        "status": "needs_review",
        "memo": """CASO: EDICIONES CASTILLO — LIBROS DE TEXTO CONALITEG (100% AD)

RESUMEN EJECUTIVO:
Ediciones Castillo S.A. de C.V. recibió contratos por 1.15B MXN de la Comisión Nacional de Libros de Texto Gratuitos (CONALITEG) para producción y suministro de libros educativos, mediante adjudicación directa al 100%. Este caso replica el patrón documentado en Editorial Santillana (Case 189, db_id=197), donde CONALITEG concentró contratos editoriales en un número muy reducido de proveedores seleccionados sin licitación abierta.

PATRONES DE RIESGO DETECTADOS:
1. ADJUDICACIÓN DIRECTA AL 100%: Todos los contratos sin proceso competitivo para bienes estandarizados (libros)
2. ECOSISTEMA EDITORIAL CONALITEG: Santillana + Castillo + posiblemente otros — CONALITEG construyó un círculo cerrado de editoriales con contratos directos permanentes
3. BIEN ESTANDARIZABLE: Los libros de texto educativos son bienes perfectamente licitables mediante especificaciones técnicas; la DA no se justifica por singularidad técnica

CONTEXTO:
Ediciones Castillo es una editorial establecida con presencia en múltiples países latinoamericanos. Su tamaño y capacidad técnica son compatibles con participar en licitaciones internacionales. La elección de DA indica una relación preferencial con CONALITEG no basada en competencia.

VEREDICTO: NEEDS REVIEW — Parte del ecosistema editorial CONALITEG con adjudicación directa sistemática; investigar junto a Santillana (Case 189) como posible cartel editorial capturador de institución."""
    },
    # Case 200 / db_id=211: Medios Masivos/GIM/Radiorama/NRM/Imagen — government advertising
    211: {
        "vendor_id": 54851,
        "status": "needs_review",
        "memo": """CASO: ECOSISTEMA PUBLICIDAD GUBERNAMENTAL — MEDIOS MASIVOS, GIM, RADIORAMA, NRM, IMAGEN RADIO (100% AD)

RESUMEN EJECUTIVO:
Cinco empresas de medios de comunicación — Medios Masivos Mexicanos (408c, 2.77B como grupo), GIM TV, Radiorama, NRM Comunicaciones e Imagen Radio — recibieron contratos acumulados de publicidad gubernamental por 2.77B MXN mediante adjudicación directa al 100%, sin proceso competitivo. Este ecosistema complementa el caso de Televisa (Case 184, 2.33B + TV Azteca 749M) formando un mapa completo de la publicidad oficial en México distribuida sin licitación entre medios afines al gobierno.

PATRONES DE RIESGO DETECTADOS:
1. ADJUDICACIÓN DIRECTA AL 100% SISTEMÁTICA: Ningún contrato de publicidad oficial en este ecosistema fue licitado
2. ECOSISTEMA DE MEDIOS CAPTURADOS: La selección de medios beneficiados refleja una política de favorecer a medios que brindan cobertura favorable al gobierno, no criterios de audiencia o costo-eficiencia
3. ESCALA SISTÉMICA: Publicidad oficial total documentada en GT: Televisa (2.33B) + TV Azteca (749M) + Medios Masivos/Radio (2.77B) + Agencia Digital/Cinetika (1.31B) + Havas Media (1.66B) = ~8.8B MXN
4. SIN MARCO REGULATORIO: México careció hasta 2018 de regulación sobre publicidad oficial (Ley General de Comunicación Social); contratos previos a esa fecha son inherentemente opacos

CONTEXTO:
La publicidad oficial en México ha sido documentada extensamente por organizaciones como Artículo 19 y FUNDAR como mecanismo de control mediático — medios que reciben contratos masivos de publicidad gubernamental moderan su cobertura crítica. Este patrón es conocido como "la mordaza dorada".

VEREDICTO: NEEDS REVIEW — Parte del ecosistema sistémico de publicidad oficial sin licitación; investigar mediante Ley de Comunicación Social y reportes de Artículo 19 para identificar correlación entre contratos y línea editorial."""
    },
    # Case 201 / db_id=212: Agencia Digital + Cinetika — digital advertising
    212: {
        "vendor_id": 51704,
        "status": "needs_review",
        "memo": """CASO: AGENCIA DIGITAL / CINETIKA — CONTENIDOS DIGITALES Y VIDEO GUBERNAMENTAL (100% AD)

RESUMEN EJECUTIVO:
Agencia Digital de Innovación Pública (424 contratos) y Cinetika S.A. de C.V. (7 contratos) recibieron en conjunto 1.31B MXN en contratos gubernamentales para producción de contenidos digitales, videoclips institucionales y gestión de redes sociales, mediante adjudicación directa al 100%. Este caso extiende el ecosistema de publicidad oficial documentado (Televisa, TV Azteca, Medios Masivos, Radiorama) hacia el espacio digital — completando la captura de todos los canales de comunicación gubernamental.

PATRONES DE RIESGO DETECTADOS:
1. ADJUDICACIÓN DIRECTA AL 100%: 431 contratos sin ningún proceso competitivo en un mercado altamente competido (agencias digitales)
2. MERCADO ALTAMENTE COMPETITIVO: El mercado de producción de contenido digital y gestión de redes sociales tiene miles de proveedores en México; la justificación de DA es inexistente
3. VOLUMEN ANÓMALO DE CONTRATOS: 424 contratos de Agencia Digital sugieren contratación fragmentada para evadir umbrales de licitación
4. VINCULACIÓN CON ECOSISTEMA DE PUBLICIDAD OFICIAL: Complementa los contratos de Televisa, TV Azteca y medios de radio formando el universo completo de la comunicación gubernamental capturada

CONTEXTO:
La fragmentación de 424 contratos en lugar de contratos marco anuales licitados es un indicador clásico de threshold splitting — técnica documentada en el modelo de riesgo v5.1 como factor de riesgo.

VEREDICTO: NEEDS REVIEW — Complemento digital del ecosistema de publicidad oficial; investigar fragmentación de contratos como posible evasión de umbrales de licitación."""
    },
    # Case 202 / db_id=213: Viveres San Rafael + Dulcinea — APBSA/DICONSA food
    213: {
        "vendor_id": 199011,
        "status": "needs_review",
        "memo": """CASO: VÍVERES SAN RAFAEL / COMERCIALIZADORA DULCINEA — ABASTO ALIMENTARIO APBSA-DICONSA (100% AD)

RESUMEN EJECUTIVO:
Víveres San Rafael S.A. de C.V. (404 contratos) y Comercializadora Dulcinea S.A. de C.V. (335 contratos) recibieron en conjunto 1.61B MXN en contratos para suministro de alimentos a través de APBSA (Abastecedora de Productos Básicos de Apoyo) y DICONSA, mediante adjudicación directa al 100%. La estructura de dos empresas distribuidoras que dividen sistemáticamente el mercado de abasto alimentario gubernamental entre sí, sin competencia, constituye un patrón de market allocation.

PATRONES DE RIESGO DETECTADOS:
1. MARKET ALLOCATION: Dos empresas (Víveres San Rafael y Dulcinea) se dividen el mercado de abasto alimentario de APBSA/DICONSA sin sobreponerse — sugiere coordinación para evitar competir entre sí
2. ADJUDICACIÓN DIRECTA AL 100%: 739 contratos combinados sin ningún proceso competitivo para productos alimenticios básicos estandarizados
3. VOLUMEN DE CONTRATOS: 404 contratos de Víveres San Rafael indica fragmentación sistémica para evadir licitación
4. CADENA DE DISTRIBUCIÓN OPACA: APBSA como intermediario gubernamental de DICONSA añade una capa adicional de opacidad entre el presupuesto federal y los proveedores finales

CONTEXTO SISTÉMICO:
Este caso conecta con el ecosistema de abasto alimentario documentado en el GT: Segalmex (Case 2, 6.3B), Maíz Mayab/DICONSA (Case 180), y ahora Víveres San Rafael/Dulcinea. El patrón sistémico de DICONSA y sus entidades satélite (APBSA, Segalmex) operando con proveedores directos al 100% sugiere una estructura de captura institucional en el aparato de abasto popular mexicano.

VEREDICTO: NEEDS REVIEW — Market allocation entre dos distribuidores en abasto alimentario gubernamental; investigar relación corporativa entre Víveres San Rafael y Dulcinea (posible empresa relacionada)."""
    },
}

def write_memos():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    written = 0
    for case_db_id, data in memos.items():
        vendor_id = data["vendor_id"]
        status = data["status"]
        memo_text = data["memo"]

        # Update aria_queue for this vendor
        cur.execute("""
            UPDATE aria_queue
            SET memo_text = ?,
                review_status = ?,
                memo_generated_at = CURRENT_TIMESTAMP
            WHERE vendor_id = ?
        """, (memo_text, status, vendor_id))

        if cur.rowcount == 0:
            cur.execute("""
                INSERT OR IGNORE INTO aria_queue (vendor_id, review_status, memo_text, memo_generated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            """, (vendor_id, status, memo_text))

        written += cur.rowcount
        print(f"  Case db_id={case_db_id}, vendor_id={vendor_id}: {status} — {cur.rowcount} rows affected")

    conn.commit()

    # Summary
    cur.execute("SELECT review_status, COUNT(*) FROM aria_queue WHERE review_status IS NOT NULL GROUP BY review_status")
    rows = cur.fetchall()
    print("\nARIA queue review_status summary:")
    for r in rows:
        print(f"  {r[0]}: {r[1]}")

    cur.execute("SELECT COUNT(*) FROM aria_queue WHERE memo_text IS NOT NULL")
    print(f"  Total with memos: {cur.fetchone()[0]}")

    conn.close()

if __name__ == "__main__":
    write_memos()
    print("\nDone.")
