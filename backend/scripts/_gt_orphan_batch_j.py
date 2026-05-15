"""GT Orphan Batch J -- Link 72 orphan GT cases to their vendor IDs.

After this batch the orphan count should drop from 225 -> ~153.
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from datetime import datetime
from pathlib import Path

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))
from scripts.gt_fp_framework import (
    STRUCTURAL_FP_VENDOR_IDS,
    assert_not_structural_fp,
)

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"

# (case_db_id, vendor_id, vendor_name_source, match_term, value_match_pct)
MATCHES = [
    (407, 180945, "ALTON SOLUCIONES EMPRESARIALES INTEGRALES SA DE CV", "ALTON SOLUCIONES", 1.00),
    (410, 289467, "INTELIGENCIA COMERCIAL USTER DEL NORTE SA DE CV",    "USTER DEL NORTE",  1.00),
    (417, 249015, "ASPID SA DE CV",                                     "ASPID",            1.00),
    (426, 303894, "ALATOR MEDICAL S A P I DE CV",                       "ALATOR MEDICAL",   1.00),
    (440, 22870,  "J.P.G. CONSTRUCCIONES, S.A. DE C.V.",                "J.P.G.",           1.00),
    (502, 10179,  "MATERIALES Y CONSTRUCCIONES VILLA DE AGUAYO, S.A. DE C.V.", "MATERIALES VILLA DE AGUAYO", 1.00),
    (552, 226282, "GIB SA DE CV",                                       "GIB SA DE CV",     1.03),
    (577, 246299, "CENTRO AGROPECUARIO CASA AGRO SA DE CV",             "CASA AGRO",        1.00),
    (578, 43561,  "VECOLAB COMERCIALIZADORA DE MEXICO SA DE CV",        "VECOLAB",          0.65),
    (581, 311653, "SERVICIOS EMPRESARIALES FERC SA DE CV",              "FERC",             1.00),
    (604, 192096, "TECNOLOGIA ECL GLOBAL GROUP S.A. DE C.V.",           "ECL GLOBAL GROUP", 0.69),
    (607, 219239, "GRUPO EMPRESARIAL GRECOPA SA DE CV",                 "GRECOPA",          1.00),
    (660, 11785,  "CONSTRUCTORA GURRIA Y ASOCIADOS, S.A. DE C.V.",      "CONSTRUCTORA GURRIA", 1.00),
    (707, 177256, "GLUCK CHEMISTRY, S. DE .R.L. DE C.V.",               "GLUCK CHEMISTRY",  None),
    (890, 38721,  "ABASTECEDORA ARAGONESA, S.A. DE C.V.",               "ABASTECEDORA ARAGONESA", 1.85),
    (1079, 67240, "DRAGADOS ECOLOGICOS GENERALES NORTE SA DE CV",       "DRAGADOS ECOLOGICOS", 1.00),
    (1104, 30689, "MAC FORMAS Y PRODUCTOS ESPECIALES, S.A. DE C.V.",    "MAC FORMAS",       1.00),
    (1107, 3985,  "CONSTRUCTORA GALLO MEDA, S.A. DE C.V.",              "CONSTRUCTORA GALLO MEDA", 1.00),
    (1124, 266963, "SEYOBIC DE MEXICO SA DE CV",                        "SEYOBIC",          1.00),
    (1161, 197373, "COMERCIALIZADORA DONCACAHUATO S DE RL DE CV",       "DONCACAHUATO",     1.00),
    (1171, 172656, "LAS ARACELIS, S.P.R. DE R.L.",                      "LAS ARACELIS",     1.00),
    (1184, 297372, "LENIMENTUS CONSULTORIA ESPECIALIZADA SA DE CV",     "LENIMENTUS",       1.00),
    (1220, 314043, "COPAS CONSTRUCCIONES Y LOGISTICA SA DE CV",         "COPAS CONSTRUCCIONES", 1.00),
    (1222, 45029,  "COMERCIALIZADORA ELORO, S.A.",                      "COMERCIALIZADORA ELORO", 1.00),
    (1245, 45873,  "SEMILLAS CONCENTRADAS OJO DE AGUA, S.P.R. DE R.I.", "SEMILLAS CONCENTRADAS OJO DE AGUA", 1.11),
    (1254, 29314,  "CONSTRUCTORA JAQUENAVY, S.A. DE C.V.",              "CONSTRUCTORA JAQUENAVY", 1.51),
    (1265, 256433, "CONSTRUCCIONES MARCKSA SA DE CV",                   "CONSTRUCCIONES MARCKSA", 1.07),
    (1306, 16168,  "GAMEROS Y LUEVANO CONSTRUCCIONES, S. A. DE C. V.",  "GAMEROS Y LUEVANO", 1.38),
    (1338, 36477,  "GIMSA CONSTRUCCIONES INTEGRALES DEL GOLFO S.A. DE C.V.", "GIMSA CONSTRUCCIONES", 1.51),
    (1352, 5797,   "PUBLIC HEALTH SUPPLY AND EQUIPMENT DE MEXICO S.A DE C.V", "PUBLIC HEALTH SUPPLY", 1.14),
    (421, 278991, "IMPULSO METROPOLITANO, MANTENIMIENTO Y SERVICIOS INTEGRALES", "IMPULSO METROPOLITANO", 1.00),
    (423, 268433, "REGIOMONTANA DE CONSTRUCCION Y SERVICIOS S A P I DE CV",      "REGIOMONTANA",          1.00),
    (442, 56590,  "EXINSA",                                                       "EXINSA",                1.07),
    (446, 66,     "CONSTRUCCIONES Y DRAGADOS DEL SURESTE S.A. DE C.V",            "DRAGADOS DEL SURESTE",  0.85),
    (485, 5372,   "HI-TEC MEDICAL, S.A. DE C.V.",                                 "HI-TEC MEDICAL",        1.00),
    (488, 10323,  "CONSTRUCTORA AZACAN SA  DE CV",                                "CONSTRUCTORA AZACAN",   1.00),
    (493, 42704,  "PRO INMUNE",                                                    "PRO INMUNE",           1.00),
    (521, 210900, "ALMACENADORA SUR SA DE CV ORGANIZACION AUXILIAR DEL CREDITO",  "ALMACENADORA SUR",      1.00),
    (569, 244707, "SINERGIA CONSULTORIA DE NEGOCIOS SA DE CV",                    "SINERGIA CONSULTORIA",  1.00),
    (598, 46363,  "Lacandonia Operadora de Viajes S.A. de C.V.",                  "LACANDONIA",            1.07),
    (599, 38250,  "JOBAMEX SEGURIDAD PRIVADA, S.A. DE C.V.",                      "JOBAMEX",               1.05),
    (602, 198361, "LORE SOLUCIONES INTEGRALES EMPRESARIALES DE SINALOA, S.A.",    "LORE SOLUCIONES",       1.00),
    (639, 49745,  "PROVETECNIA",                                                   "PROVETECNIA",          1.00),
    (640, 1103,   "TECNOASFALTOS Y TERRACERIAS, S.A. DE C.V.",                    "TECNOASFALTOS",         1.00),
    (645, 11483,  "CAL Y MAYOR Y ASOCIADOS, S.C.",                                "CAL Y MAYOR",           1.00),
    (646, 47917,  "GENESIS HEALTHCARE ADVISERS",                                  "GENESIS HEALTHCARE",    1.00),
    (649, 38709,  "GSI SEGURIDAD PRIVADA, S. A. DE C. V.",                        "GSI SEGURIDAD",         1.00),
    (657, 99083,  "CONSTRUIDEAS INNOVACION Y DESARROLLO",                         "CONSTRUIDEAS",          1.00),
    (663, 13423,  "SERVIPRO DE MEXICO, S.A DE C.V.",                              "SERVIPRO",              1.00),
    (678, 44496,  "ABASTECEDOR CORPORATIVO",                                       "ABASTECEDOR CORPORATIVO", 1.00),
    (692, 4444,   "DEWIMED, S.A.",                                                 "DEWIMED",              1.00),
    (698, 49570,  "Rocher Ingenieria",                                             "ROCHER INGENIERIA",    1.00),
    (709, 4092,   "ORGANIZACION MITAMEX, S.A. DE C.V.",                           "MITAMEX",               1.00),
    (715, 18711,  "ALVAREZ Y FERREIRA PROC. TEC. Y LEG. ASOC., S.A. DE C.V",      "ALVAREZ Y FERREIRA",    1.00),
    (1065, 63556, "VISION BIOMEDICA",                                              "VISION BIOMEDICA",     1.00),
    (1096, 53364, "CONSTRUCTORA ESCALANTE SA DE CV",                               "CONSTRUCTORA ESCALANTE", 1.00),
    (1108, 3315,  "CONSEER, S. A. DE C. V.",                                       "CONSEER",              1.00),
    (1109, 96175, "AXMILAB",                                                       "AXMILAB",              1.00),
    (1111, 5243,  "ENDOMEDICA S.A. DE C.V.",                                       "ENDOMEDICA",           1.00),
    (1117, 2904,  "OBRAS MARITIMAS HB, S.A. DE C.V.",                              "OBRAS MARITIMAS HB",   1.00),
    (1119, 59456, "PHOENIX FARMACEUTICA",                                          "PHOENIX FARMACEUTICA", 1.00),
    (1138, 228486, "RETO INDUSTRIAL, S.A. DE C.V. Y AXTEL, S.A.B. DE C.V.",       "RETO INDUSTRIAL",       1.00),
    (1148, 29297, "LEVBETH MEDICAL, S. A. DE C. V.",                               "LEVBETH MEDICAL",      1.00),
    (1156, 18245, "INTERCABLE, S.A. DE C.V.",                                      "INTERCABLE",           1.00),
    (1157, 35183, "BARMEX, S.A. DE C.V.",                                          "BARMEX",               1.00),
    (1170, 12991, "ENTER COMPUTADORAS Y SERVICIOS S.A. DE C.V.",                   "ENTER COMPUTADORAS",   1.00),
    (1182, 51326, "SIECP SERVICIOS DE INGENIERIA EDIFICACION Y CONSTRUCCION",      "SIECP",                1.00),
    (1212, 58772, "PROMARSA CORPORATIVO",                                          "PROMARSA",             1.00),
    (1214, 118975, "MEXICANA DE INDUSTRIAS Y MARCAS, S.A. DE C.V.",                "MEXICANA DE INDUSTRIAS Y MARCAS", 1.00),
    (1276, 75573, "REPUBLICA FARMACEUTICA",                                        "REPUBLICA FARMACEUTICA", 1.07),
    (1343, 4355,  "CORPORACION ARMO, S.A. DE C.V.",                                "CORPORACION ARMO",     1.25),
]

VENDOR_INSERT_SQL = """
INSERT OR IGNORE INTO ground_truth_vendors (
    case_id, vendor_id, vendor_name_source, role,
    evidence_strength, match_method, match_confidence, notes,
    created_at, is_false_positive, curriculum_weight
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

EVIDENCE_FROM_CONFIDENCE = {
    "confirmed_corrupt": ("strong", 0.8),
    "high":              ("strong", 0.8),
    "medium":            ("medium", 0.5),
    "low":               ("low",    0.2),
}


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA synchronous = OFF")
    conn.execute("PRAGMA journal_mode = WAL")
    cur = conn.cursor()
    now = datetime.now().isoformat(sep=" ", timespec="seconds")

    inserted = 0
    skipped_fp = 0
    skipped_dup = 0
    skipped_no_case = 0
    aria_updated = 0

    print(f"Processing {len(MATCHES)} orphan->vendor links...")
    print()

    for case_db_id, vendor_id, vname_source, match_term, value_match_pct in MATCHES:
        row = cur.execute(
            "SELECT case_id, case_name, confidence_level FROM ground_truth_cases WHERE id = ?",
            (case_db_id,),
        ).fetchone()
        if not row:
            print(f"[SKIP] case_db_id={case_db_id}: not found in ground_truth_cases")
            skipped_no_case += 1
            continue
        case_id_str, case_name, confidence = row

        try:
            assert_not_structural_fp(vendor_id, conn)
        except ValueError as e:
            print(f"[SKIP-FP] case={case_id_str} vendor={vendor_id}: {e}")
            skipped_fp += 1
            continue

        evidence_strength, curriculum_weight = EVIDENCE_FROM_CONFIDENCE.get(
            (confidence or "medium").lower(), ("medium", 0.5)
        )

        if value_match_pct is not None:
            value_str = f"value_match={value_match_pct:.2f}"
        else:
            value_str = "ghost_company_low_db_total"
        notes = (
            f"GT Orphan Batch J -- name-match link. Term=[{match_term}]; "
            f"{value_str}; case.confidence_level={confidence}."
        )

        existing = cur.execute(
            "SELECT id FROM ground_truth_vendors WHERE case_id = ? AND vendor_id = ?",
            (case_db_id, vendor_id),
        ).fetchone()
        if existing:
            print(f"[DUP] case={case_id_str} vendor={vendor_id}: link already exists, skipping")
            skipped_dup += 1
            continue

        match_confidence = value_match_pct if value_match_pct is not None else 0.7
        if match_confidence > 1.0:
            match_confidence = 1.0

        cur.execute(VENDOR_INSERT_SQL, (
            case_db_id,
            vendor_id,
            vname_source,
            "primary",
            evidence_strength,
            "name_contains_batch_j",
            match_confidence,
            notes,
            now,
            0,
            curriculum_weight,
        ))
        inserted += 1
        print(
            f"[ADD] case={case_id_str:<28} v{vendor_id:>7} "
            f"({evidence_strength}, w={curriculum_weight}) -> {vname_source[:50]}"
        )

        cur.execute(
            "UPDATE aria_queue SET in_ground_truth = 1 WHERE vendor_id = ?",
            (vendor_id,),
        )
        aria_updated += cur.rowcount

    conn.commit()

    orphan_after = cur.execute("""
        SELECT COUNT(*) FROM ground_truth_cases gtc
        WHERE NOT EXISTS (
            SELECT 1 FROM ground_truth_vendors gtv WHERE gtv.case_id = gtc.id
        )
    """).fetchone()[0]

    print()
    print("=" * 60)
    print(f"Inserted:          {inserted}")
    print(f"Skipped (FP):      {skipped_fp}")
    print(f"Skipped (dup):     {skipped_dup}")
    print(f"Skipped (no case): {skipped_no_case}")
    print(f"aria_queue rows updated: {aria_updated}")
    print(f"Orphan cases remaining:  {orphan_after} (was 225 before batch)")
    print("=" * 60)

    conn.close()


if __name__ == "__main__":
    main()
