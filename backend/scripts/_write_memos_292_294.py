"""Write ARIA investigation memos for GT cases 292-294 (Solomed, KBN Medical, Soluglob Ikon)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB = "RUBLI_NORMALIZED.db"

memos = {
    40859: (
        "needs_review",
        """CASO: SOLOMED S.A. DE C.V. — Concentración Sistémica en Suministros Médicos (2009-2025)

RESUMEN EJECUTIVO
Solomed S.A. de C.V. es un proveedor de suministros médicos (medicamentos, material de curación, bienes terapéuticos) que ha acumulado 111 contratos por 2,331 millones de pesos entre 2009 y 2025, operando con 19 instituciones distintas del sector salud. El modelo de riesgo v5.1 le asigna una puntuación crítica de 0.989 sobre 1.0. La empresa carece de RFC registrado en COMPRANET, lo que impide su verificación ante el SAT o el listado EFOS.

PATRONES DE CONTRATACIÓN
El 54% de los contratos (60 de 111) fueron adjudicaciones directas, superando la media sectorial. El cliente principal es el IMSS, que concentra los contratos de mayor valor: una compra consolidada en 2025 por 771 MDP (licitación), una adjudicación directa en 2025 por 714 MDP, y una compra del IMSS-Bienestar por 303 MDP. La empresa aparece en procedimientos tanto consolidados como individuales, lo que sugiere capacidad de acceso a múltiples modalidades de contratación.

SEÑALES DE ALERTA
1. Ausencia de RFC: Impide verificar si la empresa está inscrita en el SAT, si tiene empleados formales o si es una empresa fachada.
2. Concentración en IMSS: El IMSS representa el principal cliente en valor absoluto, con contratos recurrentes en 2025 bajo múltiples procedimientos simultáneos.
3. Tasa de adjudicación directa del 54%: Por encima de la media para el sector salud en el período analizado.
4. Puntuación IPS ARIA = 0.658 (Tier 2): Patrón estadístico consistente con concentración monopolística.
5. Distribución multi-institución sospechosa: Ganar contratos con 19 instituciones distintas sin RFC identificable sugiere una estructura comercial más sofisticada de lo esperado para una empresa sin trazabilidad fiscal.

CONTEXTO Y LIMITACIONES
No se encontraron notas periodísticas, resoluciones de la SFP ni auditorías ASF disponibles en COMPRANET que vinculen directamente a Solomed con irregularidades comprobadas. El alto volumen de contratos en 2025 puede corresponder a compras consolidadas legítimas del IMSS en las que Solomed participa como proveedor adjudicado en subasta inversa o contrato marco. La calificación de riesgo elevada es de naturaleza estadística; no constituye prueba de acto ilícito.

RECOMENDACIONES DE INVESTIGACIÓN
- Verificar registro ante el SAT mediante RFC alternativo o nombre social exacto.
- Solicitar a IMSS el expediente de los procedimientos 2025 (adjudicación directa 714 MDP) bajo la Ley de Transparencia.
- Cruzar con listado EFOS definitivo del SAT por nombre social.
- Consultar ASF Cuenta Pública 2021-2024, Sector Salud, para observaciones a IMSS sobre proveedores de medicamentos.
- Investigar si la empresa tiene relación con el grupo BIRMEX o con distribuidoras certificadas COFEPRIS.

CLASIFICACIÓN: needs_review | Confianza: media | Modelo: ARIA v1.0 | Fecha: 2026-03-08""",
    ),
    13414: (
        "needs_review",
        """CASO: KBN MEDICAL S.A. DE C.V. — Monopolio de Servicio Integral de Osteosíntesis y Endoprótesis ISSSTE (2003-2025)

RESUMEN EJECUTIVO
KBN Medical S.A. de C.V. es un proveedor especializado en servicios integrales de osteosíntesis y endoprótesis ortopédicas que concentra 13 contratos por 1,261 millones de pesos, con el ISSSTE como cliente casi exclusivo (46% del valor por institución). El modelo de riesgo v5.1 le asigna la puntuación máxima de 1.000. La empresa no cuenta con RFC en COMPRANET.

PATRONES DE CONTRATACIÓN
La secuencia contractual evidencia una relación recurrente con el ISSSTE desde al menos 2020:
- 2020: 537 MDP — licitación pública (Servicio Integral de Osteosíntesis y Endoprótesis Ortopédicas)
- 2022: 339 MDP — adjudicación directa (misma descripción)
- 2024: 161 MDP + 19 MDP — adjudicación directa (misma descripción)
- 2025: 180 MDP — licitación (misma descripción)

El patrón muestra alternancia entre licitación y adjudicación directa bajo el mismo objeto contractual con el mismo proveedor, lo que puede indicar fraccionamiento o uso de la modalidad directa para contratos de renovación sin competencia.

SEÑALES DE ALERTA
1. Proveedor único recurrente en nicho de alto valor: Los implantes ortopédicos (osteosíntesis, endoprótesis) son dispositivos médicos de alto costo con mercado concentrado; sin embargo, la adjudicación directa repetida al mismo proveedor es irregular.
2. Adjudicación directa por 339 MDP en 2022: Contratos de esta magnitud generalmente requieren licitación pública bajo LAASSP. La justificación de la directa debe documentarse.
3. Concentración institucional del 46%: El top_institution_ratio más alto entre los tres vendedores investigados, casi la mitad del valor total en una sola institución.
4. Ausencia de RFC: Sin verificación fiscal posible.
5. Puntuación IPS ARIA = 0.661 (Tier 2): Patrón de captura institucional.
6. Presencia mínima en 2003: Un contrato de 3 MDP en Servicios de Salud de Morelos sugiere historia previa al período de actividad principal.

CONTEXTO Y LIMITACIONES
El servicio de osteosíntesis bajo modelo integral (proveedor suministra implante + instrumento + soporte técnico) es una modalidad legítima en hospitales públicos mexicanos que reduce el costo de inventario. Sin embargo, la adjudicación directa repetida a un solo proveedor para contratos de cientos de millones de pesos es una práctica que debe escrutarse. No se identificaron expedientes públicos de sanción SFP ni notas de prensa sobre KBN Medical.

RECOMENDACIONES DE INVESTIGACIÓN
- Solicitar al ISSSTE los justificativos de adjudicación directa para los contratos de 2022 (339 MDP) y 2024 (161 MDP) bajo Art. 41 LAASSP.
- Verificar si KBN Medical está inscrita en el Registro de Proveedores del ISSSTE y si tiene representante legal identificado.
- Consultar ASF Cuenta Pública ISSSTE 2020-2024 para observaciones a contratos de adquisición de dispositivos médicos ortopédicos.
- Investigar posible relación con distribuidoras exclusivas de implantes (Zimmer Biomet, DePuy Synthes, Stryker México).
- Cruzar nombre social con el listado de empresas con vínculos con funcionarios ISSSTE (SFP declaraciones patrimoniales).

CLASIFICACIÓN: needs_review | Confianza: media | Modelo: ARIA v1.0 | Fecha: 2026-03-08""",
    ),
    108273: (
        "needs_review",
        """CASO: SOLUGLOB IKON SA DE CV — Servicio Médico Integral Capitado Multisector sin RFC (2013-2025)

RESUMEN EJECUTIVO
Soluglob Ikon SA de CV es una empresa que presta servicios médicos integrales (modelo capitado, tres niveles de atención) a instituciones de naturaleza muy diversa: NAFIN, INDEP (ex-SAE), Lotería Nacional, SEDENA, hospitales estatales y ISSSTE. Acumula 106 contratos por 2,351 millones de pesos entre 2013 y 2025. Carece de RFC en COMPRANET. El modelo de riesgo v5.1 le asigna 0.786 (alto).

PATRONES DE CONTRATACIÓN DE MAYOR RELEVANCIA
El contrato más grande y atípico es el de 2023 con el Instituto para Devolver al Pueblo lo Robado (INDEP) por 1,175 MDP, para servicio médico integral capitado de los fideicomisarios del Fondo de Pensiones del Sistema Banrural. El mismo servicio fue contratado con NAFIN en 2022 (510 MDP) y 2021 (429 MDP). Esto sugiere que Soluglob Ikon presta servicios médicos a trabajadores del sistema financiero del Estado bajo un modelo de iguala mensual — un nicho altamente rentable donde un solo proveedor atiende a toda una población cautiva.

SEÑALES DE ALERTA
1. Concentración top institucional del 60%: El cliente principal representa el 60% del valor total. Los contratos NAFIN-INDEP suman ~2,115 MDP de los 2,351 MDP totales.
2. Modelo capitado sin red propia visible: La descripción del contrato INDEP especifica explícitamente "red propia o red de terceros", lo que indica que Soluglob puede ser un intermediario que subcontrata servicios médicos, no un prestador directo.
3. Ausencia de RFC: Una empresa con contratos de 1,175 MDP debería tener un RFC perfectamente registrado. Su ausencia es inusual.
4. Diversidad de clientes institucionales incongruente: Ganar contratos con SEDENA, Lotería Nacional, NAFIN, INDEP, ISSSTE y hospitales estatales como proveedor de salud sin RFC identificable implica una red de relaciones institucionales poco común para una empresa mediana.
5. Tasa de adjudicación directa del 54.7%: Alta para contratos de esta magnitud.
6. Puntuación IPS ARIA = 0.651 (Tier 2): Patrón de concentración monopolística.

ANÁLISIS DEL CONTRATO INDEP-BANRURAL
El contrato de 2023 para el Fondo de Pensiones Banrural a través del INDEP es particularmente relevante: Banrural fue liquidado en 2003, y sus pensionados quedaron bajo administración de fideicomisos. Un contrato por 1,175 MDP para servicios médicos de una población cerrada de pensionados (estimada en no más de 50,000-80,000 personas) implica un costo per cápita de entre 14,700 y 23,500 pesos anuales — rango razonable para un plan médico privado, pero que requiere auditoría de la población atendida real versus facturada.

RECOMENDACIONES DE INVESTIGACIÓN
- Verificar registro de Soluglob Ikon ante el SAT mediante su nombre social exacto.
- Solicitar al INDEP el padrón de beneficiarios del Fondo Banrural y la auditoría del contrato de servicios médicos 2023.
- Consultar ASF Cuenta Pública NAFIN 2021-2022 para observaciones al contrato de servicio médico integral.
- Investigar si los contratos con SEDENA (2022, 2 MDP para medicamentos) corresponden a un nicho diferente o si son parte del mismo patrón.
- Cruzar nombre social con listado EFOS y SFP.
- Evaluar si la empresa cuenta con clínicas o red médica propia registrada ante la COFEPRIS.

CLASIFICACIÓN: needs_review | Confianza: media | Modelo: ARIA v1.0 | Fecha: 2026-03-08""",
    ),
}


def write_memos():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    for vendor_id, (status, memo_text) in memos.items():
        cur.execute(
            """UPDATE aria_queue
               SET memo_text=?, review_status=?, memo_generated_at=CURRENT_TIMESTAMP
               WHERE vendor_id=?""",
            (memo_text, status, vendor_id),
        )
        if cur.rowcount == 0:
            cur.execute(
                """INSERT OR IGNORE INTO aria_queue
                   (vendor_id, review_status, memo_text, memo_generated_at)
                   VALUES (?,?,?,CURRENT_TIMESTAMP)""",
                (vendor_id, status, memo_text),
            )
        print(f"  VID={vendor_id}: {status} — {'updated' if cur.rowcount else 'inserted'}")
    conn.commit()
    count = conn.execute(
        "SELECT COUNT(*) FROM aria_queue WHERE memo_text IS NOT NULL"
    ).fetchone()[0]
    print(f"Total memos with text in aria_queue: {count}")
    conn.close()


if __name__ == "__main__":
    write_memos()
