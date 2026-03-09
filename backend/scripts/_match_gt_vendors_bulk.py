"""
Bulk match ground truth cases to vendor_id.
Inserts vendor rows into ground_truth_vendors and sets vendor_id for 145 unmatched cases.

Run: cd backend && python scripts/_match_gt_vendors_bulk.py
"""
import sqlite3

DB = "RUBLI_NORMALIZED.db"

# (case_id, vendor_name_source, vendor_id, match_method, evidence_strength, role)
# vendor_id=None means insert row but no match in DB
MATCHES = [
    # === Cases 378-392 (recent) ===
    (392, "INGENIERIA Y DESARROLLO INMOBILIARIO DE MEXICO SA DE CV", 121, "name_contains", "high", "primary"),
    (391, "PRODUCTOS Y ESTRUCTURAS DE CONCRETO SA DE CV", 19007, "name_contains", "high", "primary"),
    (390, "TECNOPROGRAMACION HUMANA ESPECIALIZADA EN SISTEMAS OPERATIVO", 1314, "name_contains", "high", "primary"),
    (389, "GRUPO DE TECNOLOGIA CIBERNETICA SA DE CV", 2423, "name_contains", "high", "primary"),
    (388, "RINOACERO SA DE CV", 37422, "name_contains", "high", "primary"),
    (387, "CONTROLADORA DE OPERACIONES DE INFRAESTRUCTURAS SA DE CV", 29587, "name_contains", "high", "primary"),
    (386, "ABASTOS Y DISTRIBUCIONES INSTITUCIONALES SA DE CV", 6784, "name_contains", "high", "primary"),
    (385, "TIENDAS SORIANA SA DE CV", 35078, "name_contains", "high", "primary"),
    (384, "DRUGSTORE INCORPORATED SAPI DE CV", 96101, "name_contains", "high", "primary"),
    (383, "COMERCIALIZADORA ELECTRICA DE GUADALAJARA", 92745, "name_contains", "high", "primary"),
    (382, "NUTRIBLEND SAPI DE CV", 309677, "name_contains", "high", "primary"),
    (381, "MK HUMANA SA DE CV", 26289, "name_contains", "high", "primary"),
    (380, "ROHJAN SA DE CV", 155562, "name_contains", "high", "primary"),
    (379, "NITROMED SA DE CV", 263351, "name_contains", "high", "primary"),
    (378, "COMERCIALIZADORA DE NEGOCIOS DIVERSOS SA DE CV", 264903, "name_contains", "high", "primary"),
    (377, "COCINAS INDUSTRIALES MULTIFUNCIONALES DE CALIDAD SA DE CV", 35563, "name_contains", "high", "primary"),

    # === Cases 361-376 ===
    (376, "SOLUCIONES MEDCO SA DE CV", 176576, "name_contains", "high", "primary"),
    (375, "SANITY INTERNACIONAL SA DE CV", 14731, "name_contains", "high", "primary"),
    (374, "INGENIERIA PROYECTOS Y CONSTRUCCIONES IPC SA DE CV", 43223, "name_contains", "high", "primary"),
    (373, "ARMOR LIFE LAB SA DE CV", 234430, "name_contains", "high", "primary"),
    (372, "MICROSCOPIA ELECTRONICA E INSUMOS SA DE CV", 6811, "name_contains", "high", "primary"),
    (371, "NEURONIC MEXICANA SA DE CV", 5402, "name_contains", "high", "primary"),
    (370, "DESARROLLO Y CONSTRUCCIONES URBANAS SA DE CV", 11494, "name_contains", "high", "primary"),
    (369, "CALZADA CONSTRUCCIONES SA DE CV", 18935, "name_contains", "high", "primary"),
    (368, "CONSTRUCCIONES Y TRITURACIONES SA DE CV", 11432, "name_contains", "high", "primary"),
    (367, "CONSTRUCCIONES ALDESEM SA DE CV", 49212, "name_contains", "high", "primary"),
    (366, "GUTSA INFRAESTRUCTURA SA DE CV", 11497, "name_contains", "high", "primary"),
    (365, "DL MEDICA SA DE CV", 246450, "name_contains", "high", "primary"),
    (364, "PCC CORPORACION SA DE CV", 10616, "name_contains", "medium", "primary"),
    (363, "CONSTRUCTORA Y PAVIMENTADORA VISE SA DE CV", 1144, "name_contains", "high", "primary"),
    (362, "TECNICOS ESPECIALIZADOS DE CHIAPAS SA DE CV", 16324, "name_contains", "high", "primary"),
    (361, "CONSTRUCTORA Y PERFORADORA LATINA SA DE CV", 18363, "name_contains", "high", "primary"),

    # === Cases 344-360 ===
    (360, "PROC MINA S DE RL DE CV", 228202, "name_contains", "high", "primary"),
    (359, "INFRALUX SA DE CV", 140538, "name_contains", "high", "primary"),
    (358, "ZURICH PHARMA SA DE CV", 198864, "name_contains", "high", "primary"),
    (357, "LABORATORIOS SAN ANGEL SA", 194723, "name_contains", "high", "primary"),
    (356, "COMERCIALIZADORA BREVER SA DE CV", 13330, "name_contains", "high", "primary"),
    (355, "EPCCOR SA DE CV", 105180, "name_contains", "high", "primary"),
    (354, "ANGAR AZCAPOTZALCO", 55419, "name_contains", "high", "primary"),
    (353, "LUIS GABRIEL CARDENAS PEREZ", None, "unmatched", "medium", "primary"),
    (352, "SUMINISTRO PARA USO MEDICO Y HOSPITALARIO", 5267, "name_contains", "high", "primary"),
    (351, "REACTIVOS Y QUIMICOS SA DE CV", 5957, "name_contains", "high", "primary"),
    (350, "PROBIOMED SA DE CV", 5212, "name_contains", "high", "primary"),
    (345, "SERVICIO DE TRANSPORTE SA DE CV", 5985, "name_contains", "high", "primary"),
    (344, "PROMOTORA Y DESARROLLADORA MEXICANA SA DE CV", 30845, "name_contains", "high", "primary"),

    # === Cases 326-329 ===
    (329, "INOVAMEDIK SA DE CV", 89613, "name_contains", "high", "primary"),
    (328, "VANTAGE SERVICIOS INTEGRALES DE SALUD SA DE CV", 173854, "name_contains", "high", "primary"),
    (327, "HUMAN CORPORIS SA DE CV", 201986, "name_contains", "high", "primary"),
    (326, "PROACON MEXICO", 126363, "name_contains", "high", "primary"),

    # === Cases 104-124 ===
    (124, "WALA SERVICIOS MEXICO SA DE CV", 305455, "name_contains", "high", "primary"),
    (123, "AIRBUS SLC SA DE CV", 43963, "name_contains", "high", "primary"),
    (122, "SUMINISTROS MEDICOS DEL CENTRO SA DE CV", 11640, "name_contains", "high", "primary"),
    (121, "GRUPO UNIMEDICAL SOLUCIONES SA DE CV", 30834, "name_contains", "high", "primary"),
    (120, "OPERADORA DE PROGRAMAS DE ABASTO MULTIPLE SA DE CV", 29085, "name_contains", "high", "primary"),
    (119, "EFECTIVALE SA DE CV", 64, "name_contains", "high", "primary"),
    (118, "Televisa", 46629, "name_contains", "high", "primary"),
    (117, "ESTUDIOS AZTECA SA DE CV", 45436, "name_contains", "high", "primary"),
    (116, "BRAND AND PUSH SA DE CV", 292227, "name_contains", "high", "primary"),
    (115, "CORPORATIVO INAGRO COMERCIAL SA DE CV", 73979, "name_contains", "high", "primary"),
    (114, "GRANOS Y SERVICIOS OMEGA SA DE CV", 80024, "name_contains", "high", "primary"),
    (113, "PROCESAR SA DE CV", 63937, "name_contains", "high", "primary"),
    (112, "CARREY SA DE CV", 124451, "name_contains", "high", "primary"),
    (111, "ADACA MEDICAL SA DE CV", 279307, "name_contains", "high", "primary"),
    (110, "PHARMA TYCSA", 43971, "name_contains", "high", "primary"),
    (109, "ASOKAM SA DE CV", 30829, "name_contains", "high", "primary"),
    (108, "CREATIVIDAD Y ESPECTACULOS SA DE CV", 5608, "name_contains", "high", "primary"),
    (107, "OPERBES SA DE CV", 38555, "name_contains", "high", "primary"),
    (106, "ORACLE DE MEXICO SA DE CV", 10484, "name_contains", "high", "primary"),
    (105, "COMERCIALIZADORA PENTAMED SA DE CV", 35812, "name_contains", "high", "primary"),
    (104, "RALCA SA DE CV", 1544, "name_contains", "high", "primary"),

    # === Cases 93-103 ===
    (103, "DELMAN INTERNACIONAL SA DE CV", 17657, "name_contains", "high", "primary"),
    (102, "PROQUIGAMA SA DE CV", 5214, "name_contains", "high", "primary"),
    (101, "TOTAL FARMA SA DE CV", 124647, "name_contains", "high", "primary"),
    (100, "CONSORCIO LAMAT TRAMO 1 SAPI DE CV", 293248, "name_contains", "high", "primary"),
    (99, "PRODUCTOS LONEG SA DE CV", 274892, "name_contains", "high", "primary"),
    (98, "SAGO MEDICAL SERVICE SA DE CV", 278036, "name_contains", "high", "primary"),
    (97, "GRUPO FARMACEUTICO TOTALFARMA SA DE CV", 258353, "name_contains", "high", "primary"),
    (96, "EJIDO MAZAHUA", 283521, "name_contains", "high", "primary"),
    (95, "COMERCIALIZADORA MORAIRA SA DE CV", 265626, "name_contains", "high", "primary"),
    (94, "OZORE GESTION DE AGUA SA DE CV", 287458, "name_contains", "high", "primary"),
    (93, "VITALMEX COMERCIAL SA DE CV", 35633, "name_contains", "high", "primary"),

    # === Cases 84-92 ===
    (92, "GRUPO VITALMEX SA DE CV", 28769, "name_contains", "high", "primary"),
    (91, "NOVAG INFANCIA SA DE CV", 5222, "name_contains", "high", "primary"),
    (90, "LABORATORIOS JAYOR SA DE CV", 13491, "name_contains", "high", "primary"),
    (89, "ULTRA LABORATORIOS SA DE CV", 19551, "name_contains", "high", "primary"),
    (88, "VITALMEX INTERNACIONAL SA DE CV", 4325, "name_contains", "high", "primary"),
    (87, "GRUPO JACARIC SA DE CV", 168261, "name_contains", "high", "primary"),
    (86, "GNK LOGISTICA SA DE CV", 227470, "name_contains", "high", "primary"),
    (85, "RICARDO URIBE CASTILLO", 239305, "name_contains", "high", "primary"),
    (84, "CENTRUM PROMOTORA INTERNACIONAL SA DE CV", 4715, "name_contains", "high", "primary"),

    # === Cases 55-83 ===
    (83, "SERVICIOS DE FARMACIA PREFARMA SA DE CV", 127800, "name_contains", "high", "primary"),
    (82, "MEBCO S DE RL DE CV", 251926, "name_contains", "high", "primary"),
    (81, "BUFFINGTON BIOTECH SA DE CV", 304280, "name_contains", "high", "primary"),
    (80, "COMERCIALIZADORA ARVIEN SA DE CV", 131163, "name_contains", "high", "primary"),
    (79, "COMERCIALIZADORA COLUMBIA SA DE CV", 61022, "name_contains", "high", "primary"),
    (78, "PROVEGLIA SA DE CV", 300233, "name_contains", "high", "primary"),
    (77, "ABASTO Y SUMINISTRO EN FARMACOS GADEC SA DE CV", 223741, "name_contains", "high", "primary"),
    (76, "DISIMED SA DE CV", 4488, "name_contains", "high", "primary"),
    (75, "INTERMET SA DE CV", 6996, "name_contains", "high", "primary"),
    (74, "MULTIEQUIPOS Y MEDICAMENTOS SA DE CV", 149087, "name_contains", "high", "primary"),
    (73, "ANGEL ANGUIANO MARTINEZ", 167733, "name_contains", "high", "primary"),
    (72, "PUERTA DEL SOL CAPITAL SA DE CV", 280939, "name_contains", "high", "primary"),
    (71, "TRANS CE CARGO S DE RL DE CV", 241330, "name_contains", "high", "primary"),
    (70, "ELEMENTCO SAPI DE CV", 294524, "name_contains", "high", "primary"),
    (69, "PREVENCION Y SOLUCIONES K-B SA DE CV", 264752, "name_contains", "high", "primary"),
    (68, "ATLANTIS OPERADORA SERVICIOS DE SALUD SA DE CV", 259351, "name_contains", "high", "primary"),
    (67, "VITALMEX INTERNACIONAL SA DE CV", 4325, "name_contains", "high", "primary"),
    (66, "SELECCIONES MEDICAS DEL CENTRO SA DE CV", 31371, "name_contains", "high", "primary"),
    (65, "INSTRUMENTOS Y EQUIPOS FALCON SA DE CV", 1361, "name_contains", "high", "primary"),
    (64, "HEMOSER SA DE CV", 6038, "name_contains", "high", "primary"),
    (63, "TRIARA COM SA DE CV", 87141, "name_contains", "high", "primary"),
    (62, "PHARMAJAL SERVICIOS INTEGRALES FARMACEUTICOS SA DE CV", 310412, "name_contains", "high", "primary"),
    (61, "LOGISTICA Y TRANSPORTE PARA LA INDUSTRIA DE LA SALUD SAPI DE CV", 246015, "name_contains", "high", "primary"),
    (60, "RHINNO SMART SA DE CV", 261043, "name_contains", "high", "primary"),
    (59, "HEALTH & PHARMA CONTROL SA DE CV", 278669, "name_contains", "high", "primary"),
    (58, "ALMACENAJE Y DISTRIBUCION AVIOR SA DE CV", 280146, "name_contains", "high", "primary"),
    (57, "GRUPO C.E.N. SA DE CV", 124907, "name_contains", "high", "primary"),
    (56, "COMERCIALIZADORA HAGRE SA DE CV", 168672, "name_contains", "high", "primary"),
    (55, "VICTOR MANUEL ZARATE MARTINEZ", 176835, "name_contains", "high", "primary"),

    # === Cases 36-54 ===
    (54, "FRANCISCO HERRERA OREA", 194352, "name_contains", "high", "primary"),
    (53, "GRUPO ACOPIADOR 24 DE AGOSTO SA DE CV", 121130, "name_contains", "high", "primary"),
    (52, "NGBS MEXICO SA DE CV", 117824, "name_contains", "high", "primary"),
    (51, "PHARMA MANAGEMENT AND INNOVATION SA DE CV", 288231, "name_contains", "high", "primary"),
    (50, "TRENDY MEDIA SA DE CV", 49941, "name_contains", "high", "primary"),
    (49, "WHITEMED SA DE CV", 312747, "name_contains", "high", "primary"),
    (48, "PROCESADORA DE CARNICOS DERIVADOS Y GRANOS DEL CENTRO SA DE CV", 151581, "name_contains", "high", "primary"),
    (47, "GRUPO FARMACEUTICO SIGMUN SA DE CV", 306926, "name_contains", "high", "primary"),
    (46, "COMERCIALIZADORA REALZA SA DE CV", 236890, "name_contains", "high", "primary"),
    (45, "MATTE BRANDING SA DE CV", 265577, "name_contains", "high", "primary"),
    (44, "INTEGMEV SA DE CV", 296952, "name_contains", "high", "primary"),
    (43, "GAMS SOLUTIONS SA DE CV", 235708, "name_contains", "high", "primary"),
    (42, "MEDNES SOLUTIONS SA DE CV", None, "unmatched", "high", "primary"),
    (41, "GRUPO GOI SP SA DE CV", 258886, "name_contains", "high", "primary"),
    (40, "DRIVE PRODUCCIONES SA DE CV", 245743, "name_contains", "high", "primary"),
    (39, "ADIBSA CONSTRUCCIONES SA DE CV", 267054, "name_contains", "high", "primary"),
    (38, "GRUPO ZOHMEX SA DE CV", 254344, "name_contains", "high", "primary"),
    (37, "GRUPO INDUSTRIAL ASAD SA DE CV", 148733, "name_contains", "high", "primary"),
    (36, "GRUPO FARMACOS ESPECIALIZADOS SA DE CV", 29277, "name_contains", "high", "primary"),

    # === Cases 30-35 ===
    (35, "INTERACCION BIOMEDICA SA DE CV", 148296, "name_contains", "high", "primary"),
    (34, "LA BARREDORA GUINDA", None, "unmatched", "high", "primary"),  # EFOS ghost network - no single vendor
    (33, "CLOUD ENTERPRISE SERVICES S DE RL DE CV", 142577, "name_contains", "high", "primary"),
    # Cases 30, 31, 32 are multi-vendor ring cases - need individual vendor matching later
    (32, "KONKISTOLO / FAMILYDUCK RING", None, "unmatched", "high", "primary"),
    (31, "IMSS DIABETES/INSULIN RING", None, "unmatched", "high", "primary"),
    (30, "BIRMEX MEDICINE OVERPRICING RING", None, "unmatched", "high", "primary"),

    # === Case 9 ===
    (9, "PEMEX EMILIO LOZOYA", None, "unmatched", "high", "primary"),  # Lozoya is a person, not vendor
]


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    inserted = 0
    matched = 0
    skipped = 0

    for case_id, vendor_name, vendor_id, match_method, evidence, role in MATCHES:
        # Check if this case already has a vendor entry
        existing = conn.execute(
            "SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id = ? AND vendor_name_source = ?",
            (case_id, vendor_name)
        ).fetchone()[0]
        if existing:
            skipped += 1
            continue

        conn.execute("""
            INSERT INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, match_method, evidence_strength, role, match_confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (case_id, vendor_id, vendor_name, match_method, evidence, role, 0.90 if vendor_id else None))
        inserted += 1
        if vendor_id:
            matched += 1

    conn.commit()

    # Sync in_ground_truth on aria_queue
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth = 1
        WHERE vendor_id IN (SELECT vendor_id FROM ground_truth_vendors WHERE vendor_id IS NOT NULL)
        AND in_ground_truth = 0
    """)
    aria_synced = conn.total_changes
    conn.commit()

    # Stats
    remaining = conn.execute("""
        SELECT COUNT(*) FROM (
            SELECT gc.id FROM ground_truth_cases gc
            LEFT JOIN ground_truth_vendors gv ON gv.case_id = gc.id AND gv.vendor_id IS NOT NULL
            GROUP BY gc.id HAVING COUNT(gv.vendor_id) = 0
        )
    """).fetchone()[0]

    total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_matched = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL").fetchone()[0]

    print(f"Inserted: {inserted} vendor rows ({matched} with vendor_id match)")
    print(f"Skipped (already exist): {skipped}")
    print(f"ARIA synced: {aria_synced} rows")
    print(f"GT totals: {total_vendors} vendor rows, {total_matched} matched")
    print(f"Remaining unmatched cases: {remaining}")

    conn.close()


if __name__ == "__main__":
    main()
