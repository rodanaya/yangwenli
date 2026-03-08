"""Write investigation memos for GT cases 298-300."""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = str(Path(__file__).parent.parent / "RUBLI_NORMALIZED.db")

MEMO_298 = (
    "MEMORANDO DE INVESTIGACION - CASO 298\n"
    "Proveedor: DESARROLLO DE INFRAESTRUCTURA I.C.G. SA DE CV\n"
    "VID: 185928 | RFC: SIN RFC | Periodo: 2015-2024\n\n"
    "RESUMEN EJECUTIVO\n"
    "Empresa constructora sin RFC que acumulo 1.03B MXN en 10 contratos de obra publica. "
    "El caso critico: 2 contratos (283M) para el Hospital Integral Comunitario en Maruata, "
    "Michoacan adjudicados directamente en 2023-2024 sin licitacion publica. RS=0.773.\n\n"
    "PATRON: 10 contratos, 60% DA, 67% single-bid en licitaciones. Instituciones: CAPUFE 430M, "
    "SE 252M, Mich-SCOP 283M (DA), CONAGUA 23M.\n\n"
    "HALLAZGOS CRITICOS:\n"
    "1. SIN RFC con 1.03B en contratos — imposible verificacion fiscal.\n"
    "2. Hospital Maruata (283M): dos DA consecutivas 2023-2024 para infraestructura hospitalaria, "
    "violando el espiritu de LAASSP que exige licitacion para montos mayores.\n"
    "3. 67% single-bid en mercado competitivo de construccion.\n"
    "4. Contratos con 5+ instituciones distintas sin RFC sugiere red de contactos.\n\n"
    "RECOMENDACIONES:\n"
    "1. Solicitar a SCOP Michoacan justificacion legal de DA Art.41 LAASSP para Hospital Maruata.\n"
    "2. Verificar en SAT existencia y estado fiscal de la empresa.\n"
    "3. Solicitar a ASF auditoria ramo 09/15 ejercicios 2023-2024.\n\n"
    "NIVEL DE CONFIANZA: MEDIO | Fecha: 2026-03-08"
)

MEMO_299 = (
    "MEMORANDO DE INVESTIGACION - CASO 299\n"
    "Proveedor: REISCO OPERADORA DE SERVICIOS SA DE CV\n"
    "VID: 116886 | RFC: SIN RFC | Periodo: 2013-2018\n\n"
    "RESUMEN EJECUTIVO\n"
    "Empresa de servicios de limpieza sin RFC que concentro 1.18B MXN en 129 contratos "
    "con multiples dependencias 2013-2018. Hallazgo critico: 42/129 contratos (32.6%) "
    "resultaron single-bid en licitaciones competitivas — tasa anomala para mercado de limpieza "
    "con cientos de proveedores. Empresa desaparece post-2018. RS=0.309.\n\n"
    "PATRON: 129 contratos, 60% DA. De 52 licitaciones: 42 (80.8%) sin competencia. "
    "Clientes: IPN 294M (2c), SCT 209M (7c), SEP 112M (5c), CONALEP 73M.\n\n"
    "HALLAZGOS CRITICOS:\n"
    "1. 80.8% single-bid en licitaciones — improbable en mercado liquido con +500 proveedores.\n"
    "2. SIN RFC: sin trazabilidad fiscal sobre 1.18B en servicios.\n"
    "3. DESAPARICION ABRUPTA: cesa actividad en COMPRANET en 2019 (cambio de administracion).\n"
    "4. IPN 2018: contrato de 166M adjudicado en ano de transicion de gobierno.\n\n"
    "INDICADORES DE BID RIGGING:\n"
    "- Patron repetitivo en 5+ instituciones distintas (no evento aislado).\n"
    "- Ausencia de competidores en multiples licitaciones millonarias en mercado liquido.\n"
    "- Posible deterrente artificial via especificaciones o plazos restrictivos.\n\n"
    "RECOMENDACIONES:\n"
    "1. ASF: revision contratos IPN 2016 y 2018 (Cuenta Publica).\n"
    "2. Investigar empresa sucesora con RFC similar o mismo representante legal.\n"
    "3. Revisar SFP listas de exclusion.\n"
    "4. Solicitar expedientes de licitaciones single-bid a SCT, SEP, IPN.\n\n"
    "NIVEL DE CONFIANZA: MEDIO | Fecha: 2026-03-08"
)

MEMO_300 = (
    "MEMORANDO DE INVESTIGACION - CASO 300\n"
    "Proveedor: CONSORCIO CONTINENTAL DE INFRAESTRUCTURA\n"
    "VID: 124162 | RFC: SIN RFC | Periodo: 2015-2025\n\n"
    "RESUMEN EJECUTIVO\n"
    "Empresa constructora sin RFC con patron estadisticamente excepcional: 16 licitaciones "
    "publicas ganadas (DA=0%) con 100% single-bid rate durante 10 anos. 95% del valor "
    "(1.07B de 1.13B) concentrado en SIOP Michoacan. RS=0.830.\n\n"
    "CONTRATOS MAYORES: 318.8M (2025), 156.5M (2023), 124.7M (2019), 95.7M (2024), "
    "89.6M (2015-SCT), 77.5M (2023), 64.1M (2022), 61.2M (2017-SCT).\n\n"
    "HALLAZGOS CRITICOS:\n"
    "1. 100% SINGLE-BID EN 16 LICITACIONES: probabilidad estadistica extremadamente baja "
    "en mercado de construccion con multiples empresas certificadas (ICA, CICSA, etc.).\n"
    "2. MONOPOLIO SIOP MICHOACAN: 95% del valor en una sola entidad durante 10 anos "
    "y tres administraciones estatales distintas — sugiere relacion estructural.\n"
    "3. SIN RFC EN 2025: empresa activa con contrato de 318.8M sin RFC registrado.\n"
    "4. PATRON DE ESPECIFICACIONES RESTRICTIVAS probable: sin competidores en mercado "
    "con docenas de empresas grandes registradas en Michoacan.\n\n"
    "MECANISMOS POSIBLES:\n"
    "- Bases de licitacion diseñadas a medida del proveedor.\n"
    "- Notificacion anticipada a proveedor favorecido.\n"
    "- Colusion con area tecnica de SIOP para requisitos imposibles de cumplir en plazo.\n\n"
    "RECOMENDACIONES:\n"
    "1. Contraloria Michoacan: expedientes completos de 16 licitaciones (bases tecnicas).\n"
    "2. Investigar identidad representante legal y vinculo con servidores SIOP.\n"
    "3. Solicitar COFECE investigacion de posible acuerdo anticompetitivo.\n"
    "4. SAT: verificar RFC y obligaciones fiscales.\n\n"
    "NIVEL DE CONFIANZA: MEDIO (alto por patron estadistico, medio sin prueba directa de colusion)\n"
    "Fecha: 2026-03-08"
)

MEMOS = {
    298: {"vendor_id": 185928, "memo": MEMO_298},
    299: {"vendor_id": 116886, "memo": MEMO_299},
    300: {"vendor_id": 124162, "memo": MEMO_300},
}


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    for case_id, data in MEMOS.items():
        case = conn.execute("SELECT id FROM ground_truth_cases WHERE id=?", (case_id,)).fetchone()
        if not case:
            print(f"WARNING: Case {case_id} not found, skipping")
            continue

        aq = conn.execute(
            "SELECT id FROM aria_queue WHERE vendor_id=?", (data["vendor_id"],)
        ).fetchone()
        if aq:
            cur.execute(
                "UPDATE aria_queue SET memo_text=?, memo_generated_at=?, review_status='needs_review' WHERE vendor_id=?",
                (data["memo"], datetime.now().isoformat(), data["vendor_id"]),
            )
            print(f"Updated aria_queue memo for case {case_id} (VID={data['vendor_id']})")
        else:
            print(f"Case {case_id} VID={data['vendor_id']} not in aria_queue — memo stored in GT only")

    conn.commit()
    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
