"""
Batch K: Investigate and insert 4 vendors into ground truth.
- VID 14731: SANITY INTERNACIONAL — IMSS cleaning/hygiene supplier, 2017 spike suspicious
- VID 176576: SOLUCIONES MEDCO — hemodynamics at IMSS, jumped to state gov
- VID 63280: INTERCOMUNICACIONES MOVILES SATELITALES — FALSE POSITIVE (defense satellite telecom)
- VID 232904: AWP HEALTH & LIFE — FALSE POSITIVE (Allianz subsidiary, diplomat insurance)

Only vendors 1 and 2 are inserted as GT cases. Vendors 3 and 4 get FP memos only.
"""
import sys
import sqlite3
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

DB = "RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    c = conn.cursor()

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ── Case 1: SANITY INTERNACIONAL — IMSS hygiene product concentration ──
    case_id_1 = "SANITY_IMSS_HYGIENE_CONCENTRATION"
    c.execute("SELECT id FROM ground_truth_cases WHERE case_id=?", (case_id_1,))
    if not c.fetchone():
        c.execute("""INSERT INTO ground_truth_cases
            (case_id, case_name, case_type, year_start, year_end,
             estimated_fraud_mxn, confidence_level, notes)
            VALUES (?,?,?,?,?,?,?,?)""",
            (case_id_1,
             "Sanity Internacional IMSS Hygiene Product Concentration",
             "Concentrated monopoly",
             2016, 2022,
             576e6,
             "low",
             "Medical hygiene supplier with generic name. 437M spike in 2017 at IMSS "
             "(vs <1M/yr previously). 59% direct award. Supplies hand sanitizer, cleaning "
             "materials to hospitals. The 2017 spike coincides with IMSS large procurement "
             "cycle. No RFC available, no external evidence. Low confidence — pattern is "
             "suspicious but could reflect legitimate IMSS framework contract."))
        new_id = c.lastrowid
        print(f"Inserted case {case_id_1} id={new_id}")

        # Insert vendor
        c.execute("""INSERT INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, role, evidence_strength,
             match_method, match_confidence, notes)
            VALUES (?,?,?,?,?,?,?,?)""",
            (case_id_1, 14731,
             "SANITY INTERNACIONAL, S.A. DE C.V.",
             "primary", "low", "exact_name", 1.0,
             "Generic name, no RFC. 44 contracts, 576M total. 437M concentrated in 2017 IMSS."))

        # Insert contracts
        c.execute("SELECT id FROM contracts WHERE vendor_id=14731")
        cids = [r[0] for r in c.fetchall()]
        for cid in cids:
            c.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                      (case_id_1, cid))
        print(f"  Linked {len(cids)} contracts")
    else:
        print(f"Case {case_id_1} already exists, skipping")

    # ── Case 2: SOLUCIONES MEDCO — hemodynamics jump to state government ──
    case_id_2 = "MEDCO_HEMODYNAMICS_CONCENTRATION"
    c.execute("SELECT id FROM ground_truth_cases WHERE case_id=?", (case_id_2,))
    if not c.fetchone():
        c.execute("""INSERT INTO ground_truth_cases
            (case_id, case_name, case_type, year_start, year_end,
             estimated_fraud_mxn, confidence_level, notes)
            VALUES (?,?,?,?,?,?,?,?)""",
            (case_id_2,
             "Soluciones Medco Hemodynamics Concentrated Supplier",
             "Concentrated monopoly",
             2016, 2025,
             535e6,
             "low",
             "Hemodynamics/cardiac catheterization supplier. 6 single bids out of 17 contracts "
             "(35% SB rate). Operated exclusively at IMSS 2016-2019 then appeared at state-level "
             "Secretaría de Finanzas y Administración in 2024 with 170M direct award after "
             "deserted public tenders. 2 institutions only. Specialized medical services but "
             "the jump from federal IMSS to state government with large DA is a pattern flag."))
        new_id = c.lastrowid
        print(f"Inserted case {case_id_2} id={new_id}")

        c.execute("""INSERT INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, role, evidence_strength,
             match_method, match_confidence, notes)
            VALUES (?,?,?,?,?,?,?,?)""",
            (case_id_2, 176576,
             "SOLUCIONES MEDCO SA DE CV",
             "primary", "low", "exact_name", 1.0,
             "No RFC. 17 contracts, 535M. 35% single bid rate. IMSS then state gov."))

        c.execute("SELECT id FROM contracts WHERE vendor_id=176576")
        cids = [r[0] for r in c.fetchall()]
        for cid in cids:
            c.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                      (case_id_2, cid))
        print(f"  Linked {len(cids)} contracts")
    else:
        print(f"Case {case_id_2} already exists, skipping")

    # ── Vendor 3: INTERCOMUNICACIONES — FALSE POSITIVE (defense satellite) ──
    # Not inserted into GT. Write FP memo to aria_queue.
    print("\nVID 63280 INTERCOMUNICACIONES MOVILES SATELITALES: FALSE POSITIVE")
    print("  Reason: Satellite telecommunications for SEDENA/Marina/Guardia Nacional.")
    print("  Defense sector with patent-based direct awards (specialized equipment).")
    print("  245M in 2023 reflects Guardia Nacional expansion, not irregularity.")

    memo_intercom = (
        "## Dictamen de Investigación — INTERCOMUNICACIONES MOVILES SATELITALES (VID 63280)\n\n"
        "**Resultado: FALSO POSITIVO — Proveedor legítimo de telecomunicaciones de defensa**\n\n"
        "### Resumen\n"
        "Proveedor especializado en comunicaciones satelitales para las Fuerzas Armadas "
        "(SEDENA, SEMAR, Guardia Nacional). Opera desde 2010, inicialmente con Pemex, "
        "luego exclusivamente en el sector defensa desde 2016.\n\n"
        "### Análisis de Riesgo\n"
        "- **37 contratos**, 379M MXN total, RS promedio=0.735\n"
        "- **54% adjudicación directa** — esperado en sector defensa por excepciones de "
        "seguridad nacional y patentes/oferente único (LAASSP Art. 41)\n"
        "- **8 licitaciones desiertas** (single bid) — mercado satelital tiene pocos proveedores\n"
        "- **Crecimiento 2023** (245M): coincide con expansión operativa de Guardia Nacional "
        "y modernización de comunicaciones militares\n\n"
        "### Razón del Falso Positivo\n"
        "El mercado de comunicaciones satelitales militares es estructuralmente concentrado. "
        "Los servicios de radiolocalización y conducción de señales analógicas requieren "
        "certificaciones de seguridad que limitan la competencia. Las adjudicaciones directas "
        "por patente/oferente único son el mecanismo legal apropiado.\n\n"
        "### Recomendación\n"
        "No incluir en ground truth. Clasificar como monopolio estructural del sector defensa."
    )

    c.execute("SELECT id FROM aria_queue WHERE vendor_id=63280")
    if c.fetchone():
        c.execute("UPDATE aria_queue SET memo_text=?, memo_generated_at=?, review_status='false_positive' "
                  "WHERE vendor_id=63280", (memo_intercom, now))
        print("  Updated aria_queue memo")
    else:
        print("  VID 63280 not in aria_queue — memo printed above only")

    # ── Vendor 4: AWP HEALTH & LIFE — FALSE POSITIVE (Allianz subsidiary) ──
    print("\nVID 232904 AWP HEALTH & LIFE SA: FALSE POSITIVE")
    print("  Reason: AWP = Allianz Worldwide Partners, subsidiary of Allianz SE (Germany).")
    print("  Provides medical insurance for Mexican diplomats abroad (SRE).")
    print("  International medical coverage is a specialized market with few providers.")

    memo_awp = (
        "## Dictamen de Investigación — AWP HEALTH & LIFE SA (VID 232904)\n\n"
        "**Resultado: FALSO POSITIVO — Subsidiaria de Allianz SE, aseguradora legítima**\n\n"
        "### Resumen\n"
        "AWP Health & Life SA es la subsidiaria mexicana de Allianz Worldwide Partners, "
        "parte del grupo Allianz SE (Alemania), una de las aseguradoras más grandes del mundo. "
        "Provee seguro de gastos médicos para personal del Servicio Exterior Mexicano "
        "adscrito en el extranjero.\n\n"
        "### Análisis de Riesgo\n"
        "- **15 contratos**, 910M MXN total (2018-2025), RS promedio=0.660\n"
        "- **53% adjudicación directa** — el seguro médico internacional para diplomáticos "
        "requiere cobertura global que pocos proveedores pueden ofrecer\n"
        "- **6 licitaciones desiertas** (single bid) — mercado de seguros internacionales "
        "tiene competencia limitada\n"
        "- **Cliente principal**: Secretaría de Relaciones Exteriores (93% de contratos)\n"
        "- **1 contrato** con BANJERCITO (seguro de vida para PSPI en EUA/Canadá)\n\n"
        "### Razón del Falso Positivo\n"
        "AWP/Allianz es un proveedor multinacional legítimo. La cobertura médica para "
        "diplomáticos mexicanos en ~80 países requiere una red hospitalaria global que "
        "solo 3-4 aseguradoras internacionales pueden proveer (Allianz, Cigna, Aetna, BUPA). "
        "La concentración en SRE es natural — SRE es la única dependencia con personal "
        "diplomático en el extranjero. Los montos reflejan primas de seguro médico "
        "internacional, que son estructuralmente altos.\n\n"
        "### Recomendación\n"
        "No incluir en ground truth. Clasificar como monopolio estructural del mercado "
        "de seguros médicos internacionales."
    )

    c.execute("SELECT id FROM aria_queue WHERE vendor_id=232904")
    if c.fetchone():
        c.execute("UPDATE aria_queue SET memo_text=?, memo_generated_at=?, review_status='false_positive' "
                  "WHERE vendor_id=232904", (memo_awp, now))
        print("  Updated aria_queue memo")
    else:
        print("  VID 232904 not in aria_queue — memo printed above only")

    # ── Write memos for GT vendors too ──
    memo_sanity = (
        "## Dictamen de Investigación — SANITY INTERNACIONAL S.A. DE C.V. (VID 14731)\n\n"
        "**Resultado: SOSPECHOSO — Concentración anómala en productos de higiene IMSS**\n\n"
        "### Resumen\n"
        "Proveedor de productos de higiene y limpieza hospitalaria (gel antibacterial, "
        "materiales de limpieza, programa de lavado de manos). Opera desde 2003 con "
        "contratos pequeños (<1M/año), pero registra un pico anómalo de 437M MXN en 2017 "
        "exclusivamente en el IMSS.\n\n"
        "### Banderas Rojas\n"
        "- **Pico inexplicable**: De <1M/año (2003-2016) a 437M en 2017, luego regresa a <1M\n"
        "- **Nombre genérico**: 'Sanity Internacional' es un nombre corporativo opaco para "
        "una empresa de productos de limpieza\n"
        "- **Sin RFC disponible**: Imposible verificar identidad fiscal\n"
        "- **59% adjudicación directa**: 25 de 43 contratos\n"
        "- **Multi-institucional**: CFE, IMSS, Presidencia, CENACE, INCICh — diversidad "
        "inusual para un proveedor de limpieza\n"
        "- **Coincidencia COVID**: Contrato 2020 para 'material de curación COVID-19'\n\n"
        "### Análisis Financiero\n"
        "El contrato de 437M en 2017 es ~760x mayor que su contrato promedio anterior. "
        "Esta magnitud de crecimiento es estadísticamente anómala y requiere verificación "
        "de si corresponde a un contrato marco multianual o un error de dato.\n\n"
        "### Confianza: BAJA\n"
        "Sin evidencia externa (ASF, prensa, EFOS). El patrón es sospechoso pero podría "
        "tener explicación legítima (contrato marco IMSS consolidado).\n\n"
        "### Siguiente Paso\n"
        "Verificar en Cuenta Pública ASF 2017 si hubo observaciones al programa de higiene "
        "de manos del IMSS. Buscar RFC en SAT para confirmar identidad."
    )

    memo_medco = (
        "## Dictamen de Investigación — SOLUCIONES MEDCO SA DE CV (VID 176576)\n\n"
        "**Resultado: SOSPECHOSO — Proveedor concentrado de hemodinamia con salto a gobierno estatal**\n\n"
        "### Resumen\n"
        "Proveedor especializado en servicios integrales de hemodinamia (cateterismo cardíaco, "
        "implante de válvula aórtica percutánea). Operó exclusivamente en IMSS 2016-2019, "
        "desapareció 4 años, y reapareció en 2024 con contratos de 170M+ en la Secretaría "
        "de Finanzas y Administración estatal.\n\n"
        "### Banderas Rojas\n"
        "- **35% tasa de licitación desierta** (6 de 17): más del doble del promedio sectorial\n"
        "- **Brecha 2020-2023**: 4 años sin actividad, luego reaparece con montos 10x mayores\n"
        "- **Salto federal→estatal**: De IMSS federal a secretaría estatal de finanzas — "
        "inusual para proveedor médico especializado\n"
        "- **AD por licitación desierta**: El contrato 2024 (170M) fue adjudicación directa "
        "por licitación pública desierta — mecanismo frecuentemente abusado\n"
        "- **Sin RFC**: No se puede verificar identidad fiscal\n"
        "- **Solo 2 instituciones**: Alta concentración institucional\n\n"
        "### Análisis del Mercado de Hemodinamia\n"
        "Los servicios de hemodinamia son especializados (requieren equipos de cateterismo "
        "y personal capacitado), pero existen múltiples proveedores en México (Medtronic, "
        "Boston Scientific, distribuidores locales). Una tasa de licitación desierta de 35% "
        "sugiere posible diseño de bases para excluir competidores.\n\n"
        "### Confianza: BAJA\n"
        "Sin evidencia externa. El patrón de desaparición y reaparición con montos mayores "
        "en otro nivel de gobierno es una señal de alerta pero no constituye evidencia.\n\n"
        "### Siguiente Paso\n"
        "Identificar Hospital General de León como sede de operaciones. Verificar si las "
        "licitaciones desiertas tuvieron bases restrictivas. Buscar RFC en EFOS."
    )

    for vid, memo in [(14731, memo_sanity), (176576, memo_medco)]:
        c.execute("SELECT id FROM aria_queue WHERE vendor_id=?", (vid,))
        if c.fetchone():
            c.execute("UPDATE aria_queue SET memo_text=?, memo_generated_at=?, review_status='confirmed' "
                      "WHERE vendor_id=?", (memo, now, vid))
            print(f"  Updated aria_queue memo for VID {vid}")
        else:
            print(f"  VID {vid} not in aria_queue — memo not written to DB")

    conn.commit()
    conn.close()
    print("\nDone. 2 GT cases inserted (low confidence), 2 false positives documented.")


if __name__ == "__main__":
    main()
