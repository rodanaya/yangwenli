"""
ARIA Cases 566-569: March 17 2026 investigation session.

Cases:
  566: JOSE CARLOS REYES RAMIREZ - Persona Fisica Vehicle Maintenance Overpricing (283M)
       Colegio de Postgraduados; 500x price jump (0.3M->176.6M); 17x historical cost;
       previous vendor PALMA MOTORS did same work for 3.3M/yr
  567: KEY THINKING SA DE CV - IMSS Hospital Textiles Zero-Employee Shell (645.6M)
       Documented by Expansion/Aristegui/La Silla Rota 2017: zero employees, no assets,
       IMSS official fired for leaking bid info; continued winning contracts 2022-2024
  568: NANO ADN TECH SA DE CV - SEDATU Ex-Functionary Revolving Door (544.6M)
       Documented by El Universal/Aristegui: ex-SEDATU HR director's company;
       signed contract on non-working day Sept 16 2020; "DNA Tech" name doing HR outsourcing
  569: SINERGIA CONSULTORIA DE NEGOCIOS - SEP Educational TV Outsourcing (125M)
       Documented by Debate/Etcetera: Grupo Elektra-linked outsourcing company wins SEP TV
       production contracts; no media production expertise; single-bid 100% SEP capture

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

    note_566 = (
        "Persona fisica vehicle maintenance overpricing — 500x price jump at single university. "
        "3 contracts 2023-2025 at Colegio de Postgraduados Campus Montecillo. DA=100%. 283M total. "
        "Contract trajectory: 0.3M (2023) → 176.6M (2024) → 106.1M (2025). "
        "500-fold price increase in 12 months for the SAME SERVICE ('Mantenimiento Correctivo "
        "a Parque Vehicular'). "
        "HISTORICAL COMPARISON: Previous vendor PALMA MOTORS SA DE CV performed the same "
        "vehicle maintenance at Colegio de Postgraduados for 16.4M total across 5 contracts "
        "(2013-2017) = approximately 3.3M per year. "
        "JOSE CARLOS REYES RAMIREZ bills 176.6M in 2024 for the same service = "
        "53x more than the historical annual cost, or 17x more than the entire 5-year contract. "
        "A persona fisica (individual, not a company) executing these contracts lacks the "
        "corporate structure, fleet of mechanics, and equipment required for institutional "
        "vehicle fleet maintenance at this scale. "
        "This is almost certainly a front arrangement for massive overpricing of vehicle "
        "maintenance services at a federal research institution. "
        "Classification: P3 Persona Fisica Vehicle Maintenance Overpricing."
    )

    note_567 = (
        "Hospital textiles shell — zero employees, no assets, IMSS official fired for leaking. "
        "84 contracts 2014-2024, 645.6M MXN. DA=81% (68/84). "
        "EXTENSIVELY DOCUMENTED by major Mexican media (2017 scandal): "
        "(1) Expansion reported Key Thinking received 161M IMSS contract for hospital textiles "
        "(sheets, scrubs, uniforms for 63 warehouses) despite having ZERO employees on payroll. "
        "(2) Company filed tax declarations with NO ASSETS (no machinery, no buildings, no vehicles). "
        "(3) IMSS fired an official for leaking bidding information to the company. "
        "(4) Textile industry experts stated it was logistically 'complicated' to produce and "
        "deliver 1.5 million sheets to 63 warehouses nationwide without employees or assets. "
        "CONTINUED CONTRACTS DESPITE SCANDAL: After the 2017 media exposure, the company "
        "continued receiving contracts: 137.5M in 2022, and 231M across 7 DA contracts in 2024, "
        "expanding to Guardia Nacional (112.9M), ISSSTE, and state prison systems. "
        "A documented phantom company receiving 645M over 10 years with escalating post-scandal "
        "volumes is one of the most serious confirmed cases in this investigation. "
        "Sources: Expansion (expansion.mx/empresas/2017), La Silla Rota, Aristegui Noticias, Publimetro. "
        "Classification: P2/P3 Key Thinking Hospital Textiles Phantom Company."
    )

    note_568 = (
        "SEDATU revolving door outsourcing — ex-HR director's company, documented by press. "
        "4 contracts 2020-2023 at SEDATU exclusively, 544.6M MXN. DA=50%, SB=50%. "
        "DOCUMENTED by El Universal and Aristegui Noticias: "
        "(1) Company founded August 2013 as 'fiscal, legal and administrative advisory' firm. "
        "(2) ZERO government contracts for 7 years (2013-2020). "
        "(3) Francisco Javier Ruelas Arriaga, former Head of Human Resources at SEDATU "
        "(March 2013 - August 2019), became linked to the company post-departure. "
        "(4) First contract signed September 16, 2020 (a non-working day) for 59.2M MXN "
        "for 'Specialized Services with Third Parties' (labor outsourcing for ~140-350 workers). "
        "(5) Company had zero prior experience in outsourcing but won contract to manage "
        "hiring at the exact institution where its linked person ran HR for 6 years. "
        "CRITICAL NAME MISMATCH: 'Nano ADN Tech' (DNA Nanotechnology) is a meaningless name "
        "for an HR outsourcing company — another documented mismatch indicator. "
        "100% institution capture (all 4 contracts at SEDATU). "
        "Ex-government official's company dormant for 7 years → first contract at former employer → "
        "544M over 3 years: textbook revolving door capture. "
        "Sources: El Universal (eluniversal.com.mx), Aristegui Noticias. "
        "Classification: P6 SEDATU Revolving Door Outsourcing Capture."
    )

    note_569 = (
        "Grupo Elektra outsourcing company wins SEP educational TV contracts — industry mismatch. "
        "2 contracts 2019-2020 at SEP (Secretaria de Educacion Publica). SB=100%. 125M MXN. "
        "Contract: 'Servicio Integral Especializado para Coadyuvar con las Tareas de Produccion, "
        "Programacion y Optimizacion de la Transmision de Material' — educational TV production. "
        "DOCUMENTED by Debate.com.mx and Etcetera (2020): "
        "(1) SEP awarded 36M 'express contract' to Sinergia in consortium with Prime Show Productora. "
        "(2) Sinergia Consultoria is an OUTSOURCING COMPANY linked to GRUPO ELEKTRA "
        "(Ricardo Salinas Pliego's conglomerate) — primary clients: TV Azteca, Elektra, Banco Azteca, "
        "Afore Azteca, Seguros Azteca. "
        "(3) Company's core business is HR outsourcing, not educational media production. "
        "(4) Journalists identified this as a contract given to a Salinas-connected company "
        "for which it had no demonstrable expertise. "
        "CRITICAL MISMATCH: HR outsourcing firm wins educational television production contracts. "
        "Single-bid (100%) ensures no competition. The Grupo Elektra connection adds a "
        "conflict-of-interest dimension given Salinas Group's media interests (TV Azteca). "
        "Sources: Debate.com.mx (debate.com.mx/estados), Etcetera (etcetera.com.mx). "
        "Classification: P3/P1 SEP Educational TV Outsourcing — Elektra Connection."
    )

    cases = [
        (0, [(300690, "JOSE CARLOS REYES RAMIREZ", "high")],
         "JOSE CARLOS REYES RAMIREZ - Persona Fisica Vehicle Overpricing (283M)",
         "procurement_fraud", "high", note_566, 283000000, 2023, 2025),
        (1, [(132839, "KEY THINKING SA DE CV", "high")],
         "KEY THINKING - IMSS Hospital Textiles Phantom Company (645.6M)",
         "procurement_fraud", "confirmed_corrupt", note_567, 645600000, 2014, 2024),
        (2, [(258225, "NANO ADN TECH SA DE CV", "high")],
         "NANO ADN TECH - SEDATU Revolving Door Outsourcing (544.6M)",
         "procurement_fraud", "confirmed_corrupt", note_568, 544600000, 2020, 2023),
        (3, [(244707, "SINERGIA CONSULTORIA DE NEGOCIOS SA DE CV", "high")],
         "SINERGIA CONSULTORIA - SEP TV Production Elektra Connection (125M)",
         "procurement_fraud", "high", note_569, 125000000, 2019, 2020),
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
    # 2K17 INGENIERIA: data error (3.37B contract for 650m PVC pipe is decimal error)
    conn.execute("""
        UPDATE aria_queue SET fp_data_error=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=237384
    """, ("FP data_error: 2K17 INGENIERIA Y CONSTRUCCION SA DE CV — 3,368.6M contract for "
          "replacing 650 meters of PVC pipe and 11 manholes in Fronteras, Sonora is a decimal "
          "point error (should be ~3.37M, not 3,370M). Other 3 contracts are legitimate small "
          "municipal infrastructure (10.5M, 1.9M, 1.2M). Company is a real Sonora construction "
          "firm (CMIC Sonora member). Data error inflates total value artificially.",))

    # COBITER: legitimate pharma distributor
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=102498
    """, ("FP structural_monopoly: COBITER SA DE CV — legitimate pharmaceutical distributor. "
          "263 contracts 2011-2021 at 18 different health institutions (IMSS, ISSSTE, SEDENA, "
          "state health secretariats, national hospitals). 10-year track record. Most large "
          "contracts won via competitive licitacion. Only 66.5% DA rate. Multi-institutional "
          "diversification inconsistent with institutional capture. High risk score driven by "
          "vendor_concentration at IMSS — a model artifact for large legitimate pharma suppliers.",))
    print("Marked 2 FPs (1 data_error + 1 structural)")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        305228: (
            "CEUTICA MED SA DE CV: 2 contracts 2024, DA=100%, IMSS (449.7M) + ISSSTE (4.2M). "
            "Brand new vendor with no prior procurement history. 449.7M DA at IMSS for generic "
            "drugs in 2024. 'Ceutica' products found on online pharmacies (appears to be real "
            "brand). New vendor + very high DA + single institution = suspicious profile. "
            "No EFOS/SFP flags. Consolidada purchase scheme may explain DA mechanism."
        ),
        10015: (
            "RIO BRAVO CONSTRUCCIONES INDUSTRIALES SA DE CV: 8c 2002-2022, SB=100%, CAPUFE+BANOBRAS+SCT. "
            "Specializes in toll plaza construction (Tlalpan, Barranca Larga/Ventanilla 512M, "
            "Durango-Mazatlan). 20-year span. Based in Patzcuaro, Michoacan. 100% single-bid "
            "across 20 years at multiple institutions may reflect niche specialization (few firms "
            "build toll plazas) or bid suppression. 512M BANOBRAS Oaxaca contract (2022) is "
            "the largest red flag. Needs investigation of whether other toll plaza companies "
            "were excluded from bids."
        ),
        207312: (
            "CB SOLUCIONES TERMICAS SA DE CV: 5c 2017-2018, DA=80%, 146.1M. Boiler supplier. "
            "Main contract (145.9M) won via public tender, not DA. Short 2-year span. Other boiler "
            "vendors at IMSS have similar scale (URISA 281M, Quimica Apollo 341M). "
            "Specialized boiler supply is a relatively small market. Lower priority."
        ),
        306376: (
            "FMEDICAL SA DE CV: Single 129M single-bid contract 2024 at SSA for pharmaceutical "
            "logistics. CEO Fernando Padilla Farfan, website fmedical.mx. Has pharmacy management "
            "system SCALD for real-time drug inventory. Appears to be a real health logistics "
            "company. Single-bid may reflect market specialization. Lower priority."
        ),
        305124: (
            "CONSTRUCTORA E INMOBILIARIA CLAPA SA DE CV: 2c 2024, SB=100%, 318.6M at CONAGUA "
            "for canal construction. New vendor. But CONAGUA canal procurement in 2024 is "
            "SYSTEMICALLY 90% single-bid (28/31 canal contracts) — this is a CONAGUA-wide "
            "issue, not vendor-specific. Flag CONAGUA 2024 canal program rather than this vendor."
        ),
        139920: (
            "OMERCIALIZADORA OTHON SA DE CV: 3c 2014-2015, SB=100%, 170.1M at Q.Roo DIF. "
            "School breakfast program food supply. Company name MISSPELLED (missing 'C') in "
            "COMPRANET. Typo may be intentional (prevents tracking) or data entry error. "
            "170M in single-bid food contracts at one institution, then disappeared. "
            "No web presence under this name. Needs name correction and RFC verification."
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

    for offset in range(4):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 566-569 inserted.")


if __name__ == "__main__":
    run()
