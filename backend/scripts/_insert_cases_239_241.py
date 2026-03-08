"""Insert GT cases 239-241.

Case 239: APLICACIONES MEDICAS INTEGRALES - Monopolio Anestesia IMSS/ISSSTE (11B)
Case 240: CELGENE LOGISTICS SARL - Entidad Offshore Luxemburgo Medicamentos IMSS (2B)
Case 241: NIZA NUDEE ASOCIADOS - Refacciones Equipo Medico IMSS 2B Sin RFC
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"


def insert_case(cur, case_id, case_name, case_type, year_start, year_end,
                estimated_fraud_mxn, confidence_level, notes):
    cur.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
           (case_id, case_name, case_type, year_start, year_end,
            estimated_fraud_mxn, confidence_level, notes)
           VALUES (?,?,?,?,?,?,?,?)""",
        (case_id, case_name, case_type, year_start, year_end,
         estimated_fraud_mxn, confidence_level, notes)
    )
    row = cur.execute(
        "SELECT id FROM ground_truth_cases WHERE case_id=?", (case_id,)
    ).fetchone()
    return row[0]


def insert_vendor(cur, case_db_id, vendor_id, vendor_name_source, rfc_source,
                  role, evidence_strength, match_method, match_confidence, notes):
    cur.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
           (case_id, vendor_id, vendor_name_source, rfc_source, role,
            evidence_strength, match_method, match_confidence, notes)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (case_db_id, vendor_id, vendor_name_source, rfc_source, role,
         evidence_strength, match_method, match_confidence, notes)
    )


def link_contracts(cur, case_db_id, vendor_id):
    cur.execute(
        """INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
           SELECT ?, c.id FROM contracts c WHERE c.vendor_id=?""",
        (case_db_id, vendor_id)
    )
    return cur.rowcount


conn = sqlite3.connect(DB)
cur = conn.cursor()

# ─────────────────────────────────────────────────────────────────────────────
# CASE 239: APLICACIONES MEDICAS INTEGRALES — Monopolio Anestesia IMSS/ISSSTE
# ─────────────────────────────────────────────────────────────────────────────
case_239_id = insert_case(
    cur,
    case_id="AMI_ANESTESIA_IMSS_ISSSTE_MONOPOLIO",
    case_name="Aplicaciones Medicas Integrales — Monopolio Servicio Integral Anestesia IMSS/ISSSTE (11B)",
    case_type="institution_capture",
    year_start=2005,
    year_end=2023,
    estimated_fraud_mxn=0,
    confidence_level="medium",
    notes=(
        "Aplicaciones Medicas Integrales SA de CV (VID=6285, sin RFC) obtuvo contratos "
        "de monopolio para servicios integrales de anestesia en IMSS e ISSSTE durante 20+ "
        "anos. Contratos clave: mar-2005 5.882B LP IMSS (Servicio Integral Vaporizadores "
        "Sevoflurano), dic-2006 1.152B LP ISSSTE (Servicio Integral Anestesia), nov-2017 "
        "717M LP ISSSTE. Total: 11.017B en 263 contratos. Patron de captura institucional: "
        "misma empresa gana licitaciones publicas en dos grandes instituciones de salud por "
        "mas de dos decadas. Sin RFC registrado. Requiere benchmarking de precios de "
        "anestesia para cuantificar fraude potencial."
    )
)
insert_vendor(
    cur, case_239_id,
    vendor_id=6285,
    vendor_name_source="APLICACIONES MEDICAS INTEGRALES SA DE CV",
    rfc_source=None,
    role="beneficiary",
    evidence_strength="medium",
    match_method="name_exact",
    match_confidence=0.95,
    notes=(
        "263 contratos, 11.017B MXN, DA=27%. Contratos LP dominantes: 5.882B IMSS "
        "mar-2005, 1.152B ISSSTE dic-2006, 717M ISSSTE nov-2017. Monopolio de "
        "hecho en anestesia hospitalaria publica federal. Sin RFC."
    )
)
linked_239 = link_contracts(cur, case_239_id, 6285)
print(f"Case 239 (AMI Anestesia): db_id={case_239_id}, contracts linked={linked_239}")

# ─────────────────────────────────────────────────────────────────────────────
# CASE 240: CELGENE LOGISTICS SARL — Entidad Offshore Luxemburgo Medicamentos IMSS
# ─────────────────────────────────────────────────────────────────────────────
case_240_id = insert_case(
    cur,
    case_id="CELGENE_LOGISTICS_SARL_OFFSHORE_IMSS",
    case_name="Celgene Logistics SARL — Entidad Offshore Luxemburgo Suministro Medicamentos IMSS (2B)",
    case_type="overpricing",
    year_start=2020,
    year_end=2022,
    estimated_fraud_mxn=0,
    confidence_level="low",
    notes=(
        "Celgene Logistics SARL (VID=253837, sin RFC, SARL=forma corporativa Luxemburgo/"
        "Francia) recibio 2.002B en 54 contratos de IMSS para medicamentos. Contratos "
        "relevantes: may-2020 657M LP IMSS (MEDICAMENTOS), dic-2022 220M LP, ene-2022 "
        "210M LP. Celgene fue adquirida por Bristol Myers Squibb en 2019. Una subsidiaria "
        "'Logistics' offshore de Luxemburgo (no la farmaceutica directamente) canalizando "
        "2B en compras publicas mexicanas sin RFC es un esquema potencial de extraccion "
        "offshore. Revlimid (lenalidomida) es patentado y puede justificar DA en contratos "
        "especificos, pero la estructura juridica es atipica. Confianza baja — posible "
        "suministro legitimo de oncologicos patentados."
    )
)
insert_vendor(
    cur, case_240_id,
    vendor_id=253837,
    vendor_name_source="CELGENE LOGISTICS SARL",
    rfc_source=None,
    role="intermediary",
    evidence_strength="low",
    match_method="name_exact",
    match_confidence=0.90,
    notes=(
        "54 contratos, 2.002B MXN, DA=43%. SARL = Societe a Responsabilite Limitee "
        "(Luxemburgo/Francia). Sin RFC mexicano. Subsidiaria 'Logistics' (no la "
        "farmaceutica principal Celgene/BMS) como canal de cobro es estructura atipica. "
        "Confianza baja: medicamentos oncologicos patentados pueden justificar DA."
    )
)
linked_240 = link_contracts(cur, case_240_id, 253837)
print(f"Case 240 (Celgene SARL Offshore): db_id={case_240_id}, contracts linked={linked_240}")

# ─────────────────────────────────────────────────────────────────────────────
# CASE 241: NIZA NUDEE ASOCIADOS — Refacciones Equipo Medico IMSS 2B Sin RFC
# ─────────────────────────────────────────────────────────────────────────────
case_241_id = insert_case(
    cur,
    case_id="NIZA_NUDEE_REFACCIONES_EQUIPO_MEDICO_IMSS",
    case_name="Niza Nudee Asociados — Refacciones Equipo Medico IMSS 2B Sin RFC",
    case_type="overpricing",
    year_start=2013,
    year_end=2018,
    estimated_fraud_mxn=0,
    confidence_level="low",
    notes=(
        "Niza Nudee Asociados SA de CV (VID=119824, sin RFC; 'Nudee' es voz zapoteca "
        "de Oaxaca) gano ene-2013 un contrato LP de 2.011B con IMSS para 'ADQUISICION: "
        "REFACC PARA EQ MEDICO' (refacciones para equipo medico). Contratos complementarios "
        "2018: dos contratos ~2M para mantenimiento equipos medicos IMSS. Total: 15 "
        "contratos, 2.025B. Un contrato de 2.011B para refacciones de equipo medico es "
        "inusualmente grande — uno de los mayores contratos individuales en el sector. "
        "Empresa sin RFC, nombre con termino zapoteca, origen Oaxaca. DA=20%, LP dominante. "
        "Confianza baja: falta evidencia de sobreprecio especifico o investigacion publica."
    )
)
insert_vendor(
    cur, case_241_id,
    vendor_id=119824,
    vendor_name_source="NIZA NUDEE ASOCIADOS SA DE CV",
    rfc_source=None,
    role="beneficiary",
    evidence_strength="low",
    match_method="name_exact",
    match_confidence=0.85,
    notes=(
        "15 contratos, 2.025B MXN, DA=20%. Contrato principal ene-2013: 2.011B LP IMSS "
        "refacciones equipo medico. Sin RFC. 'Nudee' termino zapoteca (Oaxaca). Ausencia "
        "de RFC y magnitud del contrato unico generan alerta. Sin investigacion publica "
        "conocida."
    )
)
linked_241 = link_contracts(cur, case_241_id, 119824)
print(f"Case 241 (Niza Nudee Refacciones): db_id={case_241_id}, contracts linked={linked_241}")

# ─────────────────────────────────────────────────────────────────────────────
# Commit and report
# ─────────────────────────────────────────────────────────────────────────────
conn.commit()

total_cases = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
total_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]

print()
print(f"GT final state: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts")

# Verify inserted cases
print()
print("Inserted cases:")
for cid in ["AMI_ANESTESIA_IMSS_ISSSTE_MONOPOLIO",
            "CELGENE_LOGISTICS_SARL_OFFSHORE_IMSS",
            "NIZA_NUDEE_REFACCIONES_EQUIPO_MEDICO_IMSS"]:
    r = conn.execute(
        "SELECT id, case_id, case_name, confidence_level FROM ground_truth_cases WHERE case_id=?",
        (cid,)
    ).fetchone()
    print(f"  {r}")

conn.close()
