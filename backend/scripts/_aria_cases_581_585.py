"""
ARIA Cases 581-585: March 17 2026 investigation session.

Cases:
  581: SERVICIOS EMPRESARIALES FERC - Rey del Outsourcing Network (1.03B)
       Jorge Salim Fahur Perez; 16-company 7.9B network; MCCI/La Chispa documented;
       ASF flagged; Banobras 449M + CENAGAS 193M + INIFAP 166M + ASEA 161M
  582: FRUITEX DE MEXICO - Diconsa 100% DA Food Segalmex Period (569M)
       All 41 contracts DA=100% at Diconsa 2017-2021; MCCI documented 3% commission
       payments to shells; peak Segalmex corruption period
  583: OVALO CP - INADEM/SE Consulting Capture (339M)
       2 years only 2014-2015; SE/INADEM/ProMexico ecosystem; 73% DA; INADEM dissolved
       for corruption; no RFC (possible shell); 6 institutions within one ministry
  584: ROMEDIC - Andy Lopez Beltran INSABI Medication Ghost (274M)
       Created Jan 2020; registered at ceramics store; COFEPRIS failed inspection;
       owner friend of Andy Lopez Beltran; MCCI/Latinus/Proceso documented
  585: ESPACIOS VERDES INTEGRALES - SEDEMA CDMX Capture (237M)
       3 years only 2014-2016; 100% at SEDEMA; disappeared; 71% SB + rotating DA;
       no web presence; short-lived shell pattern

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

    note_581 = (
        "Jorge Salim Fahur Perez outsourcing network — 7.9B network, ASF flagged, MCCI documented. "
        "7 contracts 2024-2025, 1,032.9M MXN. DA=14%, SB=86%. Sector: hacienda/financial. "
        "DOCUMENTED BY MCCI AND LA CHISPA: "
        "(1) Jorge Salim Fahur Perez, known as the 'Rey del Outsourcing' (King of Outsourcing), "
        "created a network of 16 companies that collectively received 7.9 billion MXN from "
        "4T-era federal agencies for outsourcing/personnel services. "
        "(2) SERVICIOS EMPRESARIALES FERC (RFC SEF191211A47, incorporated Dec 2019) is one of "
        "the 16 entities in the network. "
        "(3) In just 2 years (2024-2025), FERC received 1.03B across 7 institutions: "
        "Banobras (449M), CENAGAS (193M), INIFAP (166M), ASEA (161M), and others. "
        "(4) ASF (Auditoria Superior de la Federacion) flagged irregularities in the network. "
        "(5) MCCI published investigation documenting the structure of the outsourcing network, "
        "shell company creation timeline, and connections to 4T officials. "
        "86% single-bid rate across multi-institution contracts for a company less than 5 years old "
        "is inconsistent with legitimate outsourcing service delivery at scale. "
        "Classification: P3/P6 Rey del Outsourcing — MCCI documented, ASF flagged, multi-institution."
    )

    note_582 = (
        "Diconsa direct award food supply during peak Segalmex fraud period — 100% DA, 569M. "
        "41 contracts 2017-2021, 569.3M MXN. DA=100%, SB=0%. Exclusively at Diconsa. "
        "SEGALMEX FRAUD CONTEXT: "
        "(1) 41 contracts with 100% direct award rate to a single food supplier at Diconsa "
        "during the 2017-2021 period documented as the peak of Segalmex/Diconsa procurement fraud. "
        "(2) MCCI investigation documented that Diconsa food suppliers during this period "
        "systematically paid 3% commissions ('moche') to shell companies controlled by "
        "officials in exchange for guaranteed direct award contracts. "
        "(3) Fruitex de Mexico (dehydrated fruit manufacturer) is plausible as a food supplier, "
        "but 100% DA across 41 contracts at a single institution over 4 years — during the "
        "exact period of documented systemic Diconsa corruption — is a strong indicator of "
        "participation in the moche/commission scheme. "
        "(4) FGR issued 54 arrest warrants in the Segalmex ecosystem; the Diconsa supplier "
        "network was a documented vehicle for the fraud. "
        "100% DA + single institution + peak fraud period + MCCI-documented commission scheme "
        "makes this a credible case of Segalmex-era procurement capture. "
        "Classification: P6 Fruitex / Diconsa DA Capture — Segalmex period, MCCI documented."
    )

    note_583 = (
        "INADEM/Secretaria de Economia consulting capture — short-lived, 73% DA, 6 SE institutions. "
        "11 contracts 2014-2015, 338.6M MXN. DA=73%, SB=27%. Sector: hacienda. "
        "P3 INTERMEDIARY INDICATORS: "
        "(1) Active for only 2 years (2014-2015) — short lifespan typical of capture shells. "
        "(2) Received 339M from 6 institutions within a single ministry ecosystem: "
        "Secretaria de Economia, INADEM, ProMexico, CONAVI, Exportadora de Sal, Pronosticos. "
        "(3) 73% direct award rate for consulting services across the SE ministry. "
        "(4) No RFC found in the procurement records — possible shell company with limited identity. "
        "(5) INADEM (Instituto Nacional del Emprendedor) itself was dissolved in 2019 and "
        "investigations found systemic irregularities in its procurement during this period. "
        "Large contracts include 94.8M, 64.7M, and 54.1M DAs from SE and INADEM for consulting. "
        "Short operational span + multi-institution spread within a single ministry + high DA + "
        "no RFC + INADEM corruption context = P3 intermediary institutional capture pattern. "
        "Classification: P3 INADEM/SE Consulting Capture — INADEM dissolution, short-lived shell."
    )

    note_584 = (
        "Ghost company INSABI medication fraud — Andy Lopez Beltran connection, COFEPRIS failed. "
        "1 contract 2020-2022, 274.4M MXN. SB=100% (competitive bid). Sector: salud. "
        "EXTENSIVELY DOCUMENTED (MCCI, Latinus, Proceso, Corruptometro Tojil): "
        "(1) ROMEDIC SA DE CV was incorporated in January 2020 — immediately before the "
        "start of the INSABI/pandemic medication procurement wave. "
        "(2) COFEPRIS (Federal health sanitation regulator) conducted an inspection and "
        "found the company's registered address is a CERAMICS STORE (artesanias/decoracion), "
        "not a pharmaceutical warehouse or distributor. The company does not physically exist "
        "at its registered address. "
        "(3) Owner Jorge Amilcar Olan Aparicio is documented as a personal friend of "
        "Andy Lopez Beltran (President AMLO's son) with business connections to "
        "Alejandro Calderon Alipi (director of IMSS-Bienestar). "
        "(4) PAN congresswoman filed an FGR complaint against ROMEDIC for procurement fraud "
        "based on the COFEPRIS finding and the political connections. "
        "(5) MCCI investigation: company received 490M+ from INSABI and state governments "
        "despite failing sanitary requirements. "
        "Non-existent company address + political connections + COFEPRIS failed inspection + "
        "FGR complaint = confirmed ghost company for medication fraud. "
        "Classification: P2 ROMEDIC Ghost Medication Fraud — COFEPRIS confirmed, FGR complaint."
    )

    note_585 = (
        "SEDEMA CDMX single-institution green services capture — 3 years, disappeared, no web presence. "
        "7 contracts 2014-2016, 236.8M MXN. DA=29%, SB=71%. Sector: ambiente. "
        "P3 INTERMEDIARY PATTERN: "
        "(1) Company operated exclusively for CDMX Secretaria del Medio Ambiente (SEDEMA) "
        "for exactly 3 years (2014-2016) — 100% single-institution concentration. "
        "(2) Contracts for 'green services' (espacios verdes = green spaces/parks maintenance) "
        "alternate between direct award (29%) and sole-bidder licitaciones (71%) — a pattern "
        "suggesting institutional capture using both mechanisms. "
        "(3) Two largest contracts: 83.7M (DA) and 79.4M (SB) from SEDEMA in 2015-2016. "
        "(4) Company completely disappears from procurement records after 2016 — zero contracts "
        "at any institution after that year. "
        "(5) No web presence found under this name — consistent with a shell created for "
        "a specific institutional capture operation. "
        "Short lifespan + single-institution + alternating DA/SB mechanism + disappearance = "
        "classic P3 shell capture pattern at a CDMX environment institution. "
        "Classification: P3/P6 SEDEMA Green Services Capture — single-institution, short-lived."
    )

    cases = [
        (0, [(311653, "SERVICIOS EMPRESARIALES FERC SA DE CV", "high")],
         "SERV. EMPRESARIALES FERC - Rey del Outsourcing Network (1.03B)",
         "procurement_fraud", "high", note_581, 1032000000, 2024, 2025),
        (1, [(201072, "FRUITEX DE MEXICO SAPI DE CV", "high")],
         "FRUITEX DE MEXICO - Diconsa DA Capture Segalmex Period (569M)",
         "procurement_fraud", "high", note_582, 569000000, 2017, 2021),
        (2, [(127267, "OVALO CP S DE RL DE CV", "high")],
         "OVALO CP - INADEM/SE Consulting Capture (339M)",
         "procurement_fraud", "high", note_583, 338000000, 2014, 2015),
        (3, [(289187, "ROMEDIC SA DE CV", "high")],
         "ROMEDIC - Ghost Medication Fraud Andy Lopez Beltran Connection (274M)",
         "procurement_fraud", "confirmed_corrupt", note_584, 274000000, 2020, 2022),
        (4, [(127244, "ESPACIOS VERDES INTEGRALES SA DE CV", "high")],
         "ESPACIOS VERDES INTEGRALES - SEDEMA CDMX Green Services Capture (237M)",
         "procurement_fraud", "high", note_585, 237000000, 2014, 2016),
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
        119549: (
            "FP structural_monopoly: GAS LP DE MERIDA SA DE CV — regional LP gas distributor "
            "in Yucatan serving IMSS and ISSSTE medical facilities. 25 contracts 13 years across "
            "2 institutions (IMSS/ISSSTE). LP gas distribution is a regulated regional monopoly "
            "in Mexico with licensed distributors per zone. Specialized utility service with "
            "limited providers in the Merida region. No corruption indicators. 198.6M ISSSTE "
            "contract (2015) reflects multi-year regional gas supply agreement."
        ),
        101382: (
            "FP structural_monopoly: TDR TRANSPORTES SA DE CV — established Mexican logistics "
            "company (25+ years, tdr.com.mx), 361 employees, CANACAR member, Secretaria de "
            "Economia certified (UVSCTAT 289). 1.97B across 9 contracts (2010-2020) for SAE/INDEP "
            "(seized asset management/transport). Specialized niche: government asset custody and "
            "transport requires security certification. Legitimate large logistics operator with "
            "government certification serving a specialized government function at scale."
        ),
        256590: (
            "FP structural_monopoly: JANSSEN CILAG SA DE CV — Mexican subsidiary of Johnson & "
            "Johnson Innovative Medicine (RFC JCI78031351A, founded 1978). Major multinational "
            "pharmaceutical company. 32 contracts 617.1M across 13 institutions (IMSS, ISSSTE, "
            "INSABI, Hospital Juarez, INP) for oncology, psychiatry, specialty medications. "
            "41% DA reflects sole-source for patented specialty drugs (no therapeutic substitute). "
            "International pharmaceutical manufacturer with patent protections — structural monopoly."
        ),
        11234: (
            "FP structural_monopoly: DREDGING INTERNATIONAL MEXICO SA DE CV — Mexican subsidiary "
            "of DEME Group (Belgian multinational, 175+ years in maritime dredging, one of the "
            "world's largest dredging companies). 8 contracts (2003-2022), 1.18B for port deepening "
            "and maintenance dredging at Altamira, Lazaro Cardenas, Coatzacoalcos, Tampico, Tuxpan, "
            "and PEMEX facilities. 100% SB reflects extremely specialized nature of deep-water "
            "port dredging — only 3-4 companies worldwide can perform this work at scale. "
            "International specialized operator in a genuine technical monopoly."
        ),
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (note, vid))
    print(f"Marked {len(structural_fps)} FPs (all structural_monopoly)")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        127336: (
            "SERVICIOS INTEGRADOS GAMA SA DE CV: 18 contracts 2014-2022, DA=0%, SB=44%, 749.6M. "
            "Food supply to Coahuila state DIF programs (food packages for social programs). "
            "All competitive procedures, 44% single-bid — repeatedly wins uncontested at Coahuila. "
            "Principal: Gloria Leticia Gamez Aguilar. Regional grocery wholesaler (D&B registered). "
            "No EFOS/SFP/media hits. The single-bid pattern may reflect regional specialization "
            "or bid suppression. Needs comparison with other Coahuila DIF food suppliers."
        ),
        5704: (
            "SERVICIOS MEDICOS Y TECNICOS SA DE CV (SERVIMEDSA): 1,310 contracts 2002-2025, "
            "DA=44%, SB=4%, 1.38B. Medical equipment spare parts at IMSS (99% of contracts). "
            "Legitimate 24-year company (servimedsa.com.mx). One anomalous 748M contract in 2006 "
            "(Structure A) dwarfs all others (typical annual contracts 5-10M). The 748M contract "
            "is likely a data quality issue (Structure A era). Excluding it, legitimate IMSS "
            "spare parts supplier. Lower priority — data artifact likely explains anomaly."
        ),
        5685: (
            "FORMAS PARA CONTROL SA DE CV: 285 contracts 2002-2011, DA=1%, SB=2%, 312.8M. "
            "IMSS printed forms and administrative control documents supplier. Very low DA/SB — "
            "almost entirely competitive procurement. One 281.7M contract in 2002 (Structure A) "
            "dominates total; excluding it, typical contracts are 0.5-2.5M. Structure A decimal "
            "error likely for the 281.7M contract. Legitimate niche IMSS forms supplier. "
            "FP_DATA_ERROR candidate for the 281.7M contract; remainder is clean. Low priority."
        ),
        10156: (
            "PAVIASFALTOS SA DE CV: 39 contracts 2002-2014, DA=0%, SB=100%, 1.63B at SCT/CAPUFE. "
            "Road paving/asphalt company. 100% SB across all 39 competitive tenders over 13 years. "
            "Contracts range 44-207M for highway construction/maintenance. No web presence found. "
            "100% SB over 13 years at SCT/CAPUFE is a strong bid suppression signal — but could "
            "also reflect regional asphalt production dominance (limited plant availability). "
            "Needs RFC verification and investigation of whether competitors were excluded."
        ),
        276541: (
            "GRUPO CONSTRUCTOR CYGNY SA DE CV: 4 contracts 2021-2024, DA=25%, SB=75%, 125.9M. "
            "Small Chiapas construction company (RFC GCM090227571, 2009). Water/sanitation "
            "infrastructure and government building equipment. Clients: Comision Estatal de "
            "Caminos Chiapas, Gobierno Chiapas, Comision Estatal de Agua. 75% SB at state level. "
            "Insufficient evidence of corruption. Regional construction company with state contracts "
            "in Chiapas. Lower priority."
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
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 581-585 inserted.")


if __name__ == "__main__":
    run()
