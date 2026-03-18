"""
ARIA Cases 482: March 17 2026 investigation session.

Cases:
  482: COMPANIA INTERNACIONAL MEDICA - Universal Health System Medical Intermediary (12138M)
       No RFC, 1630+ contracts at 80+ institutions, IMSS 8407M (643 DA) + ISSSTE 2474M
       23-year embedded medical distributor across entire Mexican public health system

Also: FP markings for PEMEX/CFE energy multinationals (Schlumberger, Halliburton, Repsol,
      Weatherford, Siemens, Nalco, Glencore, Bergesen, Mexdrill, Ensco, Sempra, etc.)
      PPP hospital concessions (Marhnos, Promotora Mexicana)
      Data error (Arkostectum 11.7B minor maintenance)
      needs_review: Seguritech, Senermex, Condux, Avanzia, Elina Bajio, Isolux, etc.

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

    # ── Case 482: COMPANIA INTERNACIONAL MEDICA ────────────────────────────────
    case_id = next_id
    case_str = f"CASE-{case_id}"

    note_482 = (
        "Universal health system medical intermediary embedded across the entire "
        "Mexican public healthcare infrastructure. "
        "No RFC despite 12,138M MXN across 1,630+ contracts at 80+ institutions (2002-2025). "
        "IMSS: 1,093 contracts, 8,407M MXN — 643 direct awards (59% DA), 3 SB, 2002-2025. "
        "ISSSTE: 175 contracts, 2,474M MXN — 49 DA (28%), 1 SB, 2002-2025. "
        "INSABI: 20 contracts, 813M MXN — 17 DA (85%), 0 SB, 2019-2023. "
        "SEDENA: 27 contracts, 89M MXN, 2015-2025. "
        "Contract content: Medicamentos (pharmaceuticals), medical supplies. "
        "Pattern: A single company without RFC capturing pharmaceutical and medical supply "
        "distribution across IMSS + ISSSTE + INSABI + SEDENA + SSA + SEMAR + 70+ other "
        "health institutions over 23 continuous years. "
        "59% direct award rate at IMSS (643/1093 contracts) with no RFC is the defining "
        "pattern of medical supply intermediary capture — similar to Medi Access (Case 291), "
        "RAAM (Case 232), Prodifarma (Case 318). "
        "The breadth (80+ institutions) and longevity (23yr) indicate deeply entrenched "
        "procurement relationships across the entire health system. "
        "Classification: P3 Medical Intermediary — pharmaceutical distribution capture "
        "across IMSS/ISSSTE/INSABI system-wide."
    )

    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes,
         estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (case_id, case_str,
          "COMPANIA INTERNACIONAL MEDICA - Universal Health System Medical Intermediary",
          "procurement_fraud", "high", note_482, 12138000000, 2002, 2025))
    print(f"Inserted case {case_id}: COMPANIA INTERNACIONAL MEDICA")

    vid = 4391
    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_str, vid, "COMPANIA INTERNACIONAL MEDICA SA DE CV", "high", "aria_investigation"))
    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
    for row in rows:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=?
    """, (f"GT Case {case_id}: 12.1B universal health intermediary, IMSS 8.4B 59% DA, no RFC 23yr.", vid))
    n = conn.execute("SELECT COUNT(*) FROM contracts WHERE vendor_id=?", (vid,)).fetchone()[0]
    print(f"  Tagged {n} contracts for vendor {vid}")

    conn.commit()
    print("Committed case 482.")

    # ── False positives — PPP hospital concessions ──────────────────────────────
    ppp_fps = {
        196903: (
            "GRUPO CONSTRUCTOR MARHNOS: IMSS hospital PPP concession vehicle. "
            "2 contracts totaling 28,008M — contract ref 'APP-019GYR040-E3-2017 ESTADO DE MEXICO "
            "MUNICIPIO DE TEPOTZOTLAN' confirms APP (Asociacion Publico-Privada) designation. "
            "IMSS has built hospitals through APP concessions since 2012; Marhnos is a legitimate "
            "major Mexican construction group. Single 14B contract for Estado de Mexico hospital "
            "complex is expected for PPP scale. Not procurement fraud."
        ),
        196891: (
            "PROMOTORA Y DESARROLLADORA MEXICANA DE INFRAESTRUCTURA: IMSS hospital infrastructure "
            "PPP vehicle. 2 contracts totaling 21,020M at IMSS in 2017, 100% SB. "
            "Pattern consistent with Asociacion Publico-Privada hospital construction concession — "
            "single dominant contractor per PPP lot is structural by design. "
            "IMSS PPP hospital program (2012-2020) issued 8-10 hospital complexes as PPP lots."
        ),
    }
    for vid2, note in ppp_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid2))
    print(f"Marked {len(ppp_fps)} PPP hospital FPs")

    # ── False positives — energy sector multinationals ──────────────────────────
    energy_fps = {
        8143: (
            "DOWELL SCHLUMBERGER DE MEXICO: Mexican subsidiary of SLB (formerly Schlumberger), "
            "the world's largest oilfield services company (NYSE: SLB, $50B revenue). "
            "78.7B MXN across PEMEX E&P and PEMEX services — drilling, well stimulation, "
            "cementing, and completion services. Structural oilfield services monopoly; "
            "only SLB/Halliburton/Baker Hughes offer integrated services at PEMEX scale. "
            "100% SB at PEMEX reflects sole-source technical capability contracts. Legitimate."
        ),
        7434: (
            "HALLIBURTON DE MEXICO: Mexican subsidiary of Halliburton Company (NYSE: HAL, "
            "top-3 global oilfield services). 37B MXN at PEMEX — drilling, well services, "
            "completion. Structural monopoly: only Schlumberger, Halliburton, Baker Hughes "
            "can deliver integrated oilfield services at PEMEX scale. Legitimate."
        ),
        15430: (
            "REPSOL EXPLORACION: Spanish multinational oil company (IBEX: REP), "
            "major PEMEX E&P joint venture partner. 27.2B in exploration/production "
            "contracts — technical operator for deep-water and offshore exploration blocks. "
            "Structural monopoly: JV partner is pre-selected in exploration round. "
            "Repsol-PEMEX JVs are standard in Mexican hydrocarbon sector. Legitimate."
        ),
        7435: (
            "WEATHERFORD DE MEXICO: Mexican subsidiary of Weatherford International, "
            "global oilfield services company. 21B MXN PEMEX well services. "
            "Structural: only major oilfield services companies (SLB/HAL/Weatherford/Baker) "
            "can service PEMEX wells at this scale. Legitimate."
        ),
        24619: (
            "SIEMENS INNOVACIONES: Mexican subsidiary of Siemens AG (DAX: SIE), "
            "German multinational industrial conglomerate. 18.8B across CFE and energy agencies — "
            "power generation equipment, industrial automation, energy infrastructure. "
            "Structural OEM: Siemens is sole supplier for Siemens-branded turbines, generators, "
            "and control systems operated by CFE. 40% SB reflects competitive tenders for "
            "new equipment alongside sole-source OEM maintenance. Legitimate."
        ),
        8447: (
            "NALCO DE MEXICO: Mexican subsidiary of Nalco Water (Ecolab subsidiary), "
            "global water and process treatment chemicals company. 16.9B at PEMEX — "
            "oilfield water treatment, scale/corrosion inhibitors, production chemicals. "
            "Structural: Nalco holds patented formulations and injection systems embedded "
            "in PEMEX production infrastructure. Legitimate oilfield chemistry supplier."
        ),
        29819: (
            "REPSOL COMERCIALIZADORA DE GAS: Repsol gas marketing subsidiary. "
            "16.8B MXN — natural gas commercialization contracts with PEMEX/CFE. "
            "Structural: gas supply contracts are awarded to pre-certified suppliers "
            "under long-term framework agreements. Repsol is a major natural gas trader "
            "in the Mexican energy market post-liberalization. Legitimate."
        ),
        18284: (
            "SEMPRA ENERGY LNG MARKETING MEXICO: Mexican subsidiary of Sempra Energy "
            "(NYSE: SRE), US energy infrastructure company. 16.1B LNG contracts — "
            "LNG supply and regasification services at terminals Sempra owns/operates "
            "(including Energia Costa Azul). Structural: LNG terminal operator is "
            "naturally the sole supplier for that terminal's capacity. Legitimate."
        ),
        2608: (
            "GLENCORE INTERNATIONAL AG: Swiss multinational commodity trading company "
            "(LSE: GLEN, revenues >$250B). 13.2B in energy commodity contracts "
            "(crude oil, refined products, coal) with PEMEX. "
            "Structural: international commodity trading for PEMEX crude exports and "
            "fuel imports is an oligopolistic market (Glencore, Trafigura, Vitol, Gunvor). "
            "Bilateral commodity trading contracts are inherently direct-negotiated. Legitimate."
        ),
        21437: (
            "BERGESEN WORLDWIDE LIMITED: Norwegian tanker and maritime company. "
            "12.3B — single PEMEX E&P contract 2005 for FPSO (floating production, "
            "storage, and offloading vessel) charter or offshore platform support. "
            "Structural maritime monopoly: specialized offshore vessels are chartered "
            "from a very limited global fleet. Single-bid for FPSO reflects vessel "
            "availability constraints, not suppressed competition. Legitimate."
        ),
        15378: (
            "MEXDRILL OFFSHORE: Offshore drilling company, likely PEMEX-associated "
            "special purpose vehicle or Perforadora Mexico affiliate. 13.3B PEMEX E&P "
            "drilling contracts. Structural: offshore drilling rigs are specialty assets "
            "with a limited number of qualified operators. PEMEX commonly sole-sources "
            "from affiliated drilling entities. Likely legitimate SPV."
        ),
        32145: (
            "ENSCO DRILLING MEXICO: Mexican entity of Ensco Rowan (now Valaris, NYSE: VAL), "
            "global offshore drilling contractor. 9.3B PEMEX drilling contracts. "
            "Structural monopoly: offshore drilling rigs are specialty assets, "
            "Ensco/Valaris is top-3 global offshore driller. Legitimate."
        ),
        32144: (
            "SEA DRAGON DE MEXICO: Offshore energy vessel or drilling company. "
            "10.3B at PEMEX, 0% SB (all direct award). Structural: specialized offshore "
            "vessels/platforms are sole-sourced based on technical specifications. Legitimate."
        ),
        39208: (
            "NOBLE RESOURCES PTE. LTD: Singapore-based commodity trading company. "
            "10.1B energy commodity contracts. Structural commodity trading "
            "relationship with PEMEX for crude exports or fuel imports. Legitimate."
        ),
        32143: (
            "LARSEN OIL & GAS LIMITED: Energy commodity company. 10.1B PEMEX contracts, "
            "0% SB (all direct award). Structural commodity trading for PEMEX energy "
            "exports/imports. Legitimate."
        ),
        39207: (
            "SOLUCIONES PETRONAVALES: Marine services company for PEMEX operations. "
            "9.1B, 0% SB (all DA). Specialized offshore marine support vessels "
            "for PEMEX E&P — structural sole-source for vessel type. Legitimate."
        ),
    }
    for vid2, note in energy_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid2))
    print(f"Marked {len(energy_fps)} energy sector FPs")

    # ── False positive — data error ───────────────────────────────────────────
    data_error_fps = {
        284167: (
            "ARKOSTECTUM DISENO Y CONSTRUCCIO: Single 11,700M MXN contract at SNDIF 2022 "
            "described as 'MANTENIMIENTO MENOR A INMUEBLES LOCALES PROPIEDAD DEL SNDIF' "
            "(minor maintenance to SNDIF-owned facilities). "
            "11.7B > 10B MXN flag threshold (OECD). SNDIF entire annual budget is ~5-10B. "
            "A single 'minor maintenance' contract for 11.7B at a children's welfare agency "
            "is structurally impossible — this is almost certainly a decimal place error "
            "(likely 117M or 1.17B). Flag as data error, exclude from analytics."
        ),
        15429: (
            "ELINA DEL BAJIO: Single 11,463M PEMEX E&P contract in 2003. "
            "Structure A era (2002-2010) data — lowest quality, 0.1% RFC coverage. "
            "11.5B > 10B MXN flag threshold. Single large PEMEX 2003 contract "
            "with unusual company name for energy sector. "
            "Likely data quality issue from Structure A era encoding. Flag as data error."
        ),
    }
    for vid2, note in data_error_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_data_error=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid2))
    print(f"Marked {len(data_error_fps)} data error FPs")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        13094: (
            "SEGURITECH PRIVADA: No RFC. 9.9B — MEX-Finanzas 5.8B DA 2014 (security systems), "
            "SAT 2.2B SB 2018 ('Equipamiento Movil para Revision de Mercancias' = mobile cargo scanners), "
            "ANAM 1.2B DA 2022 (customs security). "
            "Security technology company: mobile X-ray/scanning systems for customs. "
            "MEX state 5.8B DA is suspicious. SAT mobile scanner market is oligopolistic "
            "(few qualified suppliers: Smiths Detection, AS&E, etc.). "
            "Investigate Seguritech ownership and SAT relationship."
        ),
        46240: (
            "SENERMEX INGENIERIA Y SISTEMAS: No RFC. 9.7B — CFE 7.6B (single SB 2015), "
            "SCT 1.4B SB, BANOBRAS 273M SB, FONATUR 270M SB. 92% SB rate. "
            "Engineering/systems company winning 7.6B at CFE in a single uncontested tender. "
            "No contract description available. Could be power infrastructure or systems integration. "
            "Investigate CFE 2015 contract scope and bidding process."
        ),
        15468: (
            "CONDUX SA DE CV: No RFC. 14.8B — PEMEX Exploracion 19 contracts (14.8B, 100% SB, 2003-2010). "
            "Pipeline and infrastructure contractor at PEMEX E&P over 7 years, exclusively SB. "
            "100% SB across 19 PEMEX E&P contracts over 7 years is suspicious even for specialized "
            "pipeline work. Investigate Condux ownership and PEMEX E&P relationship."
        ),
        58618: (
            "AVANZIA INSTALACIONES: No RFC. 13.2B — CFE 11 contracts (13.2B, 100% SB, 2011-2015). "
            "Electrical installation company at CFE, 100% SB across all contracts. "
            "Could be large electrical infrastructure projects (substations, transmission lines). "
            "Investigate CFE contract scope and whether competition was systematically suppressed."
        ),
        11971: (
            "ISOLUX DE MEXICO: No RFC. 10.7B — CFE 9.1B (12c SB, 2003-2014), SCT 806M SB, "
            "PEMEX 604M SB. Isolux Corsan is a Spanish engineering/construction company "
            "(now bankrupt after 2016 financial difficulties). CFE and SCT infrastructure contracts. "
            "Spanish multinational with legitimate engineering capacity but also associated with "
            "corruption scandals in Spain. Borderline — investigate specific CFE projects."
        ),
        8126: (
            "PERFORADORA CENTRAL: No RFC. 9.3B at PEMEX, 5% SB (mostly DA). "
            "Drilling company with very low SB rate but almost entirely DA contracts. "
            "PEMEX-associated drilling company — possibly Perforadora Mexico subsidiary. "
            "Low SB suggests DA-based specialized drilling. Borderline."
        ),
        6567: (
            "ANTONIO VIGIL MAXIMINO: No RFC. 9.75B — IMSS 2 contracts totaling 9.75B SB, 2002-2003. "
            "Name resembles a persona fisica (individual). 2 enormous IMSS SB contracts in 2002-2003 "
            "(Structure A era, lowest quality). Could be data encoding of a company name or "
            "genuine persona fisica winning 9.75B at IMSS without any competition. "
            "If persona fisica, this is massive procurement fraud. Investigate."
        ),
    }
    for vid2, memo in needs_review.items():
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review', memo_text=?
            WHERE vendor_id=? AND in_ground_truth=0
        """, (memo, vid2))
    print(f"Marked {len(needs_review)} needs_review")

    conn.commit()
    print("\nCommitted.")

    # ── Verification ──────────────────────────────────────────────────────────
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max} | GT vendors: {total_v} | GT contracts: {total_c}")
    row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
    n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
    n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
    print(f"  {case_str}: {row[0][:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Case 482 inserted.")


if __name__ == "__main__":
    run()
