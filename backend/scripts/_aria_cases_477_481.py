"""
ARIA Cases 477-481: March 17 2026 investigation session.

Cases:
  477: COMPAÑIA CONSTRUCTORA MAS - SCT/CAPUFE Highway Capture (2981M)
       No RFC, 92% SB rate, SCT 30/34 SB + CAPUFE 20/20 SB, 2002-2018
  478: DICIPA - Clinical Lab Services Medical Intermediary (10817M)
       No RFC, 1410 contracts, ISSSTE 4138M + IMSS 2564M + HGM 1205M, 2002-2025
  479: SINCRONIA MEDICA APLICADA - SEDENA Medical Institutional Capture (4254M)
       No RFC, SEDENA 3568M (84% concentration), portable radiology + medical supplies
  480: ESCORE ALIMENTOS - Hospital Food Supply Capture (1909M)
       No RFC, ISSSTE 698M (4/5 SB) + IMSS 484M (33 SB) + INM 174M
  481: CONSTRUCTORA ALMOZA - Sinaloa Infrastructure Monopoly (2078M)
       No RFC, 100% SB across all 53 contracts, water treatment + roads + public works

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    note_477 = (
        "Institutional capture at SCT (Secretaria de Comunicaciones y Transportes) "
        "and CAPUFE (Caminos y Puentes Federales) — highway construction. "
        "No RFC despite 2,981M MXN across 64 contracts (2002-2018). "
        "SCT: 34 contracts, 2,390M MXN — 30 single-bid (88% SB rate). "
        "CAPUFE: 20 contracts, 434M MXN — ALL 20 single-bid (100% SB rate). "
        "Sinaloa state infrastructure: 104M additional SB contract. "
        "Overall 92% single-bid rate across 64 contracts. "
        "Pattern: Road and highway construction company capturing federal "
        "highway agency procurement through consistently unopposed bidding. "
        "The 100% SB rate at CAPUFE combined with 88% SB at SCT over 16 years "
        "indicates systematic bid suppression or collusion with awarding officials. "
        "Classification: P6 SCT/CAPUFE Institutional Capture — highway construction."
    )

    note_478 = (
        "Major medical intermediary embedded across Mexican public health system. "
        "No RFC despite 10,817M MXN across 1,410 contracts (2002-2025). "
        "ISSSTE: 270 contracts, 4,138M MXN (SB=10, DA=69), 2002-2025. "
        "IMSS: 184 contracts, 2,564M MXN (SB=21, DA=122), 2002-2025. "
        "Hospital General de Mexico: 92 contracts, 1,205M MXN (SB=8, DA=69), 2011-2022. "
        "CENAPRECE: 8 contracts, 722M MXN (SB=4, DA=3), 2011-2018. "
        "Contract content: 'Servicio integral de laboratorio de analisis clinicos' "
        "(integrated clinical laboratory services) — clinical lab outsourcing. "
        "Pattern: Single company monopolizing clinical lab services across Mexico's "
        "largest public health insurers with no RFC over 23 continuous years. "
        "The 49% direct award rate combined with 10.8B scale and no RFC "
        "is consistent with a captured medical intermediary similar to Medi Access/RAAM networks. "
        "Classification: P3 Medical Intermediary — clinical laboratory capture across ISSSTE/IMSS/HGM."
    )

    note_479 = (
        "Institutional capture at SEDENA (Secretaria de la Defensa Nacional) "
        "— military medical equipment and supplies. "
        "No RFC despite 4,254M MXN across 154 contracts (2013-2025). "
        "SEDENA: 81 contracts, 3,568M MXN (SB=23, DA=21), 2013-2025 — 83.9% of total value. "
        "ISSSTE: 14 contracts, 381M MXN (SB=6, DA=5), 2016-2021. "
        "IMSS: 33 contracts, 154M MXN (SB=4, DA=28), 2015-2025. "
        "Contract content: 'UNIDAD RADIOLOGICA PORTATIL' (portable radiological units), "
        "'CONTRATACION DE UN SERVICIO DE ABASTECIMIENTO DE MATERIAL E INSUMOS DE' "
        "(supply of medical materials and inputs) — portable radiology and medical supplies. "
        "Pattern: A single company without RFC capturing 3.5B in military medical procurement. "
        "Medical equipment supply to SEDENA requires specialized military approval processes "
        "that limit open competition — making insider institutional capture plausible. "
        "12-year exclusive relationship with SEDENA (2013-2025) is unusual without formal qualification. "
        "Classification: P6 SEDENA Institutional Capture — military medical equipment and supplies."
    )

    note_480 = (
        "Hospital food supply capture across Mexican public health and social institutions. "
        "No RFC despite 1,909M MXN across 160 contracts (2008-2022). "
        "ISSSTE: 5 contracts, 698M MXN (SB=4, DA=0), 2008-2016 — 4 of 5 contracts single-bid. "
        "IMSS: 76 contracts, 484M MXN (SB=33, DA=12), 2009-2022 — 43% single-bid. "
        "Instituto Nacional de Migracion (INM): 3 contracts, 174M MXN — food for immigration detainees. "
        "Instituto Nacional de Psiquiatria: 6 contracts, 93M MXN. "
        "AICM: 2 contracts, 85M — employee cafeteria at airport. "
        "Instituto Nacional de Perinatologia: 2 contracts, 77M MXN. "
        "Pattern: Food catering company winning 698M at ISSSTE (4/5 SB) and 484M at IMSS "
        "with no RFC over 14 continuous years. "
        "Hospital food services are a known vulnerability — opaque specifications "
        "('servicio de alimentos') are difficult to compare across bidders, enabling "
        "specification tailoring to favor incumbent. "
        "Classification: P6 Hospital Food Supply Institutional Capture — ISSSTE/IMSS/INM."
    )

    note_481 = (
        "Sinaloa state infrastructure monopoly — water treatment, roads, public works. "
        "No RFC despite 2,078M MXN across 53 contracts (2007-2022). "
        "ALL 53 contracts are single-bid — 100% SB rate across all institutions. "
        "Comision Estatal de Agua Potable y Alcantarillado (Sinaloa): 5c, 437M SB, 2008-2009. "
        "SIN-Secretaria de Obras Publicas: 6c, 421M SB, 2014-2018. "
        "Secretaria de Infraestructura, Comunicaciones y Transportes (Sinaloa): 8c, 353M SB, 2019-2022. "
        "SCT federal: 19c, 338M SB, 2007-2017. "
        "Contract content: 'Terminacion de Planta Potabilizadora' (water treatment plant completion), "
        "acueducto (aqueduct), highway and road construction. "
        "Pattern: Single construction company winning all infrastructure tenders in Sinaloa "
        "without any competition over 15 years — across state water commission, state public works, "
        "state transport, and federal SCT. "
        "100% SB rate is statistically impossible without systematic bid suppression. "
        "Sinaloa state procurement during this period (overlapping with cartel-era governance) "
        "had documented vulnerability to contractor capture. "
        "Classification: P6 Sinaloa Infrastructure Monopoly — water and road construction."
    )

    cases = [
        (0, [(1106, "COMPANIA CONSTRUCTORA MAS SA DE CV", "high")],
         "COMPANIA CONSTRUCTORA MAS - SCT/CAPUFE Highway Institutional Capture",
         "procurement_fraud", "high", note_477, 2981000000, 2002, 2018),
        (1, [(4678, "DICIPA SA DE CV", "high")],
         "DICIPA - Clinical Lab Services Medical Intermediary",
         "procurement_fraud", "high", note_478, 10817000000, 2002, 2025),
        (2, [(121920, "SINCRONIA MEDICA APLICADA SA DE CV", "high")],
         "SINCRONIA MEDICA APLICADA - SEDENA Medical Institutional Capture",
         "procurement_fraud", "high", note_479, 4254000000, 2013, 2025),
        (3, [(35770, "ESCORE ALIMENTOS SA DE CV", "high")],
         "ESCORE ALIMENTOS - Hospital Food Supply Institutional Capture",
         "procurement_fraud", "high", note_480, 1909000000, 2008, 2022),
        (4, [(21123, "CONSTRUCTORA Y CRIBADOS ALMOZA SA DE CV", "high")],
         "CONSTRUCTORA ALMOZA - Sinaloa Infrastructure Monopoly",
         "procurement_fraud", "high", note_481, 2078000000, 2007, 2022),
    ]

    for (offset, vendors, cname, ctype, conf, notes, fraud, yr1, yr2) in cases:
        case_id_int = next_id + offset
        case_id_str = f"CASE-{case_id_int}"
        conn.execute("""
            INSERT OR REPLACE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (case_id_int, case_id_str, cname, ctype, conf, notes, fraud, yr1, yr2))
        print(f"Inserted case {case_id_int}: {cname[:60]}")

        for (vid, vname, strength) in vendors:
            conn.execute("""
                INSERT OR IGNORE INTO ground_truth_vendors
                (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                VALUES (?,?,?,?,?)
            """, (case_id_str, vid, vname, strength, "aria_investigation"))
            rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
            for row in rows:
                conn.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                    (case_id_str, row[0])
                )
            conn.execute("""
                UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
                WHERE vendor_id=?
            """, (f"GT Case {case_id_int}: {cname[:80]}", vid))
            n = conn.execute("SELECT COUNT(*) FROM contracts WHERE vendor_id=?", (vid,)).fetchone()[0]
            print(f"  Tagged {n} contracts for vendor {vid} ({vname[:50]})")

    # ── False positives ────────────────────────────────────────────────────────
    structural_fps = {
        4451: (
            "PHILIPS MEXICANA: Mexican subsidiary of Philips N.V. (Dutch multinational, top-10 "
            "global medical imaging company). ISSSTE 544M + IMSS 390M in CT scanners, MRI, "
            "ultrasound, X-ray and related OEM maintenance/spare parts. "
            "DA contracts are structural — Philips is sole authorized supplier for its own "
            "medical imaging equipment (CT, MRI, nuclear medicine). Low SB rate (6%) confirms "
            "competitive market for initial equipment procurement. Legitimate OEM relationship."
        ),
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))
    print(f"Marked {len(structural_fps)} structural FPs")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        44093: (
            "DERI MEX: No RFC. 504M across Sinaloa state health (216M SB 2012-2013), "
            "Chiapas state health (91M SB 2018), INSABI (88M DA 2021-2023), SSA (53M). "
            "Risk score 0.910 (highest in current batch). Medical supply company at multiple "
            "state health agencies. Investigate Sinaloa health relationship and INSABI DA contracts."
        ),
        91624: (
            "DISENO INGENIERIA Y MANUFACTURAS: No RFC. 814M — ISSSTE 402M (9 SB), "
            "AICM 143M, ASA 116M, FGR 47M, INIFED 41M, AIFA 21M. "
            "Civil engineering works at airports and ISSSTE facilities. "
            "73% single-bid overall. ISSSTE 402M all SB is suspicious. "
            "Airport concentration (AICM+ASA+AIFA = 285M) could be legitimate "
            "aeronautical civil works niche. Investigate ISSSTE relationship."
        ),
        248521: (
            "A2DAHT HEALTH MEXICO: RFC AHM100719LP6. 1128M across IMSS (217M), "
            "Bienestar (192M+171M), ISSSTE (90M), and others. "
            "Health-related company with RFC and diverse institution mix. "
            "Bienestar 363M in social programs warrants investigation. "
            "2019-2025 active. Investigate contract content and Bienestar relationship."
        ),
        37191: (
            "GRUPO BIOMEDICO EMPRESARIAL: No RFC. 750M — INCMNSZ 617M (8 contracts, "
            "ALL DA 2015-2024) + ISSSTE 103M. "
            "Medical equipment/biomedical at specialized research hospital. "
            "8 contracts ALL direct award at single elite medical institute is very suspicious. "
            "Investigate INCMNSZ DA justification and equipment categories."
        ),
    }
    for vid, memo in needs_review.items():
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review', memo_text=?
            WHERE vendor_id=? AND in_ground_truth=0
        """, (memo, vid))
    print(f"Marked {len(needs_review)} needs_review")

    conn.commit()
    print("\nCommitted.")

    # ── Verification ──────────────────────────────────────────────────────────
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max} | GT vendors: {total_v} | GT contracts: {total_c}")

    for offset in range(5):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 477-481 inserted.")


if __name__ == "__main__":
    run()
