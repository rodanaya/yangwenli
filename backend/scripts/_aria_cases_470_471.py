"""
ARIA Cases 470-471: March 17 2026 investigation session.

Cases:
  470: ARTEKK CONSTRUCCIONES - CONAGUA Irrigation Canal Monopoly (638M)
       RFC present, 7 contracts ALL CONAGUA ALL SB, 100% concentration, 2018-2024
       Joins CONAGUA cartel cluster (Cases 437/439/441/449/450/468)
  471: IMPULSORA DE SERVICIOS TERRESTRES - CAPUFE Toll Services Capture (4786M)
       No RFC, 4327M SB at CAPUFE 2014 (single contract), + 400M + 42M SB same year
       Telepeaje and highway toll operations institutional capture

Also: FP markings (APP highway PPP, Airbus Helicopters Mexico, Seguros Comercial America,
      Acciona Infraestructuras, Norma Ediciones CONALITEG)
      needs_review: LABORATORIOS SERVET, BUFETE EMPRESARIAL GTI, MEDICA FARMA ARCAR,
                    GRUPO INDUSTRIAL POSEIDON, PRODUCTORA PROCESADORA AGRICOLA

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

    # ── Case 470: ARTEKK CONSTRUCCIONES ───────────────────────────────────────
    case_470_id = next_id
    case_470_str = f"CASE-{case_470_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_470_id, case_470_str,
        "ARTEKK CONSTRUCCIONES - CONAGUA Irrigation Canal Monopoly",
        "procurement_fraud",
        "high",
        (
            "Institutional capture at CONAGUA (Comision Nacional del Agua) — irrigation canal "
            "construction in Sinaloa/Nayarit region. "
            "RFC ACO090430TV6. 7 contracts, 638M MXN (2018-2024). "
            "100% CONAGUA concentration — never served any other institution. "
            "100% single-bid rate — all 7 contracts won without competition. "
            "Contract examples: "
            "270M SB (2023) 'Construccion de la Red de Distribucion de la Zona de Riego "
            "Seccion Rosario Segunda Etapa (La Pedreguera) — irrigation distribution network; "
            "250M SB (2024) 'Construccion del Canal Lateral Izquierdo 38+678' — irrigation canal; "
            "57M SB (2022) 'Rehabilitacion de la zona de riego del canal principal margen "
            "izquierda del Rio Baluarte' — canal rehabilitation. "
            "All contracts are large-scale irrigation infrastructure in Sinaloa. "
            "Pattern: ARTEKK CONSTRUCCIONES is the 6th confirmed member of the CONAGUA "
            "water/irrigation construction cartel: PAJEME (GT), PEREZ Y GIL (GT Case 439), "
            "URISA (GT Case 441), OZONE (GT Case 449), INGENIERIA SANITARIA (GT Case 450), "
            "COET TUBERIAS (GT Case 468). "
            "Each firm operates in a distinct hydraulic sub-niche (canals, pipelines, dredging, "
            "pumping stations, ecological equipment) and wins exclusively through single-bid "
            "competitive procedures — a market allocation cartel within CONAGUA. "
            "Classification: P6 CONAGUA Institutional Capture + CONAGUA cartel member."
        ),
        638_000_000,
        2018, 2024,
    ))
    print(f"Inserted case {case_470_id}: ARTEKK CONSTRUCCIONES CONAGUA")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_470_str, 223090, "ARTEKK CONSTRUCCIONES SA DE CV", "high", "aria_investigation"))
    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=223090").fetchall()
    for row in rows:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_470_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=223090
    """, (f"CONAGUA irrigation cartel (Case {case_470_id}): 638M 100% SB Sinaloa canals. "
          f"7th CONAGUA cartel member (Cases 437/439/441/449/450/468).",))
    print(f"  Tagged {len(rows)} contracts for ARTEKK CONSTRUCCIONES")

    # ── Case 471: IMPULSORA DE SERVICIOS TERRESTRES ───────────────────────────
    case_471_id = next_id + 1
    case_471_str = f"CASE-{case_471_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_471_id, case_471_str,
        "IMPULSORA DE SERVICIOS TERRESTRES - CAPUFE Toll Services Institutional Capture",
        "procurement_fraud",
        "high",
        (
            "Institutional capture at CAPUFE (Caminos y Puentes Federales de Ingresos y Servicios) "
            "— federal highway toll and electronic toll management services. "
            "No RFC despite 4,786M MXN across 5 contracts (2014-2019). "
            "Dominant contract: 4,327.4M MXN in a single Licitacion Publica at CAPUFE in 2014 "
            "(risk score 0.941) — single bidder, no competing vendors. "
            "Same day/year: two additional SB contracts at CAPUFE (399.6M + 42.2M) in 2014 — "
            "together representing 4,769M in SB contracts from CAPUFE in a single year. "
            "2019 follow-up: 9.4M DA for 'Adquisicion de antenas de telepeaje para la Red Propia' "
            "and 7.2M DA for 'Servicios para la Gestion de Cobro de Telepeaje, en la red de "
            "Autopistas Concesionadas a CAPUFE' — confirms the company operates toll/telepeaje systems. "
            "Pattern: A toll services operator winning 4.3B at CAPUFE as the sole bidder "
            "in a major public competitive procedure is extremely suspicious. "
            "CAPUFE manages federal toll roads and should attract multiple qualified highway "
            "services operators for a contract of this scale. "
            "No RFC despite being a substantial highway services company. "
            "The 2014 concentration (4.77B in one year from single agency) is exceptional. "
            "CAPUFE institutional capture is the pattern — 100% of vendor value at CAPUFE. "
            "Classification: P6 CAPUFE Institutional Capture in toll/highway services."
        ),
        4_769_000_000,
        2014, 2019,
    ))
    print(f"Inserted case {case_471_id}: IMPULSORA TERRESTRES CAPUFE")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_471_str, 126053, "IMPULSORA DE SERVICIOS TERRESTRES SA DE CV", "high",
          "aria_investigation"))
    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=126053").fetchall()
    for row in rows:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_471_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=126053
    """, (f"CAPUFE capture (Case {case_471_id}): 4327M SB + 400M SB 2014, telepeaje services. "
          f"No RFC. 100% CAPUFE concentration.",))
    print(f"  Tagged {len(rows)} contracts for IMPULSORA TERRESTRES")

    # ── False positives ────────────────────────────────────────────────────────
    structural_fps = {
        172456: (
            "APP COATZACOALCOS VILLAHERMOSA: PPP highway concession SPV for Coatzacoalcos-Villahermosa "
            "route (Tabasco/Veracruz). Single 4575M SCT contract 2016 — Asociacion Publico-Privada "
            "concession vehicle by structural design. Single-contract SPV is expected."
        ),
        47151: (
            "AIRBUS HELICOPTERS MEXICO: Mexican subsidiary of Airbus Helicopters (formerly Eurocopter). "
            "Structural monopoly — only Airbus can supply, maintain, and provide spare parts for Airbus "
            "military helicopters (H145, EC725 Caracal, etc.). SEDENA and SEMAR operate Airbus "
            "helicopter fleets; after-sales support is technically single-source. "
            "2162M across 175 DA contracts is legitimate OEM support. No competing supplier exists "
            "for Airbus-specific parts and services."
        ),
        177: (
            "SEGUROS COMERCIAL AMERICA (now HDI Seguros): Major Mexican insurance company. "
            "Government insurance procurement for assets, vehicles, infrastructure at PEMEX (2368M), "
            "CFE (1644M), SEP (638M). Structural oligopoly — Mexican government insurance market "
            "has 5-6 dominant carriers; SCA/HDI is one of the largest. PEMEX/CFE insurance "
            "procurement requires specialized industrial/energy risk coverage. Legitimate."
        ),
        51864: (
            "ACCIONA INFRAESTRUCTURAS MEXICO: Mexican subsidiary of Acciona S.A. (Spanish multinational, "
            "top-25 global contractor). 3588M at SCT 2011-2015 including 2684M (10 SB contracts). "
            "While 100% SB rate at SCT is elevated, Acciona specializes in large-scale infrastructure "
            "(tunnels, metro, highways) with limited direct competitors at certain project scales. "
            "Legitimate multinational — classify needs_review rather than confirmed corrupt."
        ),
        149947: (
            "NORMA EDICIONES SA DE CV: Educational publisher with 250 DA contracts (345M) at CONALITEG "
            "2015-2023. CONALITEG (Comision Nacional de Libros de Texto Gratuitos) commissions "
            "supplementary educational materials from approved publishers under framework agreements. "
            "DA contracts are structural — CONALITEG pre-approves publishers and then contracts "
            "directly per the approved catalog. Legitimate educational publisher relationship."
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
        316997: (
            "LABORATORIOS SERVET: RFC LSE041215CR4. 23 contracts 446M ALL in 2025 at IMSS/SSISSSTE/INSABI/INER. "
            "353M at IMSS (not SB, not DA — LP?), all risk=1.000. Investigate 2025 IMSS lab contract. "
            "All contracts in single year 2025 warrants deeper investigation."
        ),
        195420: (
            "BUFETE EMPRESARIAL GTI: No RFC. 17 contracts 1725M. Bienestar 818M (2 SB 2020-2024), "
            "SRE 468M (2 SB), ISSSTE 222M (SB), BANJERCITO 139M. 'Bufete Empresarial' = business consulting. "
            "Winning 818M in Bienestar social programs + 468M at SRE is suspicious. Investigate contract scope."
        ),
        44288: (
            "MEDICA FARMA ARCAR: No RFC. 216 contracts 4095M. IMSS 2633M (29% DA), INSABI 697M, "
            "BIRMEX 361M, ISSSTE 294M. Pharma/medical distributor no RFC 4B scale. "
            "Pattern similar to Medi Access/Prodifarma networks. Investigate IMSS relationship."
        ),
        246451: (
            "GRUPO INDUSTRIAL POSEIDON: RFC GIP870706PK9. 308 contracts 2909M. IMSS 2117M (mostly DA). "
            "INSABI 304M, SSISSSTE 203M, ISSSTE 180M. Medical supply conglomerate with RFC. "
            "High DA rate at IMSS (33%), moderate risk 0.678. Borderline — investigate DA justification."
        ),
        101029: (
            "PRODUCTORA PROCESADORA AGRICOLA DE MEXICO: No RFC. 18 contracts 649M. "
            "Aguascalientes state 298M (3 SB), Hidalgo 134M (SB), SEGALMEX 86M (DA), SEP 66M. "
            "Agricultural food processor with SEGALMEX connection (GT vendor). "
            "State-level SB contracts + SEGALMEX DA. Investigate Aguascalientes relationship."
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

    for case_str in [case_470_str, case_471_str]:
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        name = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {name[:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 470-471 inserted.")


if __name__ == "__main__":
    run()
