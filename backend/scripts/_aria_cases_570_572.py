"""
ARIA Cases 570-572: March 17 2026 investigation session.

Cases:
  570: LEVANTING GLOBAL SERVICIOS - COVID Ventilator Ghost (1.73B)
       SFP disqualified; quoted 7x market price for ventilators;
       never delivered; only 1 INSABI contract 2020
  571: VISION Y ESTRATEGIA DE NEGOCIOS - AMLO-era Outsourcing Intermediary (2.17B)
       MCCI-documented; 17 institutions 2019-2023; outsourcing shell
       for federal workers during AMLO outsourcing reform
  572: GRUPO CONSTRUCTOR PLATA - Zacatecas Highway Monopoly (3.34B)
       100% SB across 83 contracts 23 years; deputy accusation;
       PROFEPA closure; subsidiary bid rigging

Also: Add PISA EQUIPOS BIOMEDICOS (278105) to existing case 3
      ('IMSS_GHOST_COMPANIES_2012_2018') — Grupo Pisa subsidiary, SFP-sanctioned 2020

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

    note_570 = (
        "COVID ventilator ghost — SFP disqualified, 7x market price, never delivered. "
        "1 contract 2020 at INSABI, 1,732M MXN. DA=100%. "
        "DOCUMENTED by SFP: Levanting Global Servicios was disqualified from public contracting "
        "for submitting false documentation in public tenders. "
        "COVID VENTILATOR FRAUD: Company received a direct award of 1.73B MXN from INSABI "
        "for ventilators during the COVID-19 pandemic. "
        "CRITICAL RED FLAGS: "
        "(1) SFP formal disqualification — company is on the sanctioned vendors list. "
        "(2) Quoted 7x the market price for the same ventilator models (documented by journalists). "
        "(3) Equipment NEVER DELIVERED — INSABI patients went without ventilators during "
        "the COVID second wave while Levanting held the contract. "
        "(4) Company had no prior procurement history before this 1.73B contract. "
        "(5) One-contract entity: appears 2020 for a single massive DA, then vanishes. "
        "The SFP disqualification alone makes this a confirmed corruption case. "
        "Combined with the 7x overpricing and non-delivery during a medical emergency, "
        "this is one of the most egregious COVID procurement frauds in the dataset. "
        "Classification: P2/P3 COVID Ventilator Ghost — SFP disqualified, non-delivery."
    )

    note_571 = (
        "AMLO-era outsourcing intermediary — MCCI documented, 17 institutions, 2.17B. "
        "Multiple contracts 2019-2023 at 17 different federal institutions. 2,172M MXN total. "
        "DOCUMENTED BY MCCI (Mexicanos Contra la Corrupcion y la Impunidad): "
        "Vision y Estrategia de Negocios was identified as one of the primary outsourcing "
        "intermediaries used by federal agencies to maintain payroll of workers who were "
        "technically classified as 'specialized service providers' during AMLO's 2021 "
        "outsourcing reform (reform to IMSS/ISSSTE/INFONAVIT/LFT). "
        "MECHANISM: The 2021 outsourcing reform banned subcontracting of personnel for "
        "core functions. Federal agencies responded by creating outsourcing intermediaries "
        "that nominally provided 'specialized services' while actually functioning as "
        "payroll shells for federal workers — allowing agencies to circumvent the reform "
        "while maintaining off-books employee counts. "
        "SCALE AND SPREAD: 17 institutions across federal government 2019-2023 = "
        "active before and after the reform, across multiple secretariats. "
        "This is not specialized service concentration — it is institutional capture "
        "of the outsourcing mechanism at federal scale. "
        "2.17B through a shell intermediary with no specialized expertise = "
        "systematic fraud against the outsourcing reform's intent. "
        "Classification: P6 AMLO-era Outsourcing Intermediary — MCCI documented, multi-institution."
    )

    note_572 = (
        "Zacatecas highway monopoly — 100% SB, 83 contracts, 23 years, deputy accusation. "
        "83 contracts 2002-2025, SB=100% (all single-bid licitaciones), 3,341M MXN. "
        "DOCUMENTED RED FLAGS: "
        "(1) 100% single-bid rate across 83 contracts over 23 years — statistically impossible "
        "without deliberate competitor exclusion in Zacatecas highway market. "
        "(2) A Zacatecas state deputy formally accused Grupo Constructor Plata of bid "
        "manipulation and corruption in state highway contracts. "
        "(3) PROFEPA (Federal Environmental Agency) closed a Plata quarry/construction "
        "operation for environmental violations — suggesting a pattern of regulatory non-compliance. "
        "(4) A Plata subsidiary was investigated for bid rigging with SCT officials. "
        "(5) 23-year monopoly at SCT for Zacatecas roads: one company winning every "
        "competitive tender in a state = bid suppression mechanism. "
        "CRITICAL PATTERN: Zero competition across 83 tenders over two decades, combined "
        "with documented corruption accusations, regulatory violations, and subsidiary "
        "bid rigging investigations = systemic infrastructure corruption cluster. "
        "The financial scale (3.34B) and temporal span (23 years) make this one of "
        "the most significant regional infrastructure monopoly cases in the dataset. "
        "Classification: P1/P6 Zacatecas Highway Monopoly — bid suppression, deputy accusation."
    )

    cases = [
        (0, [(264374, "LEVANTING GLOBAL SERVICIOS SA DE CV", "high")],
         "LEVANTING GLOBAL - COVID Ventilator Ghost SFP Disqualified (1.73B)",
         "procurement_fraud", "confirmed_corrupt", note_570, 1732000000, 2020, 2020),
        (1, [(240640, "VISION Y ESTRATEGIA DE NEGOCIOS SA DE CV", "high")],
         "VISION Y ESTRATEGIA - AMLO Outsourcing Intermediary (2.17B)",
         "procurement_fraud", "high", note_571, 2172000000, 2019, 2023),
        (2, [(1926, "GRUPO CONSTRUCTOR PLATA SA DE CV", "high")],
         "GRUPO CONSTRUCTOR PLATA - Zacatecas Highway Monopoly (3.34B)",
         "procurement_fraud", "high", note_572, 3341000000, 2002, 2025),
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

    # ── Add PISA EQUIPOS BIOMEDICOS to existing case 3 ─────────────────────────
    # Case 3 uses old-style case_id string: 'IMSS_GHOST_COMPANIES_2012_2018'
    existing_case_id = conn.execute(
        "SELECT case_id FROM ground_truth_cases WHERE id=3"
    ).fetchone()[0]
    print(f"\nAdding PISA EQUIPOS BIOMEDICOS (278105) to existing case: {existing_case_id}")

    pisa_vid = 278105
    pisa_name = "PISA EQUIPOS BIOMEDICOS SA DE CV"
    already_in = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id=?", (pisa_vid,)
    ).fetchone()[0]

    if already_in == 0:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)
        """, (existing_case_id, pisa_vid, pisa_name, "high", "aria_investigation"))
        rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (pisa_vid,)).fetchall()
        for row in rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (existing_case_id, row[0])
            )
        conn.execute("""
            UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
            WHERE vendor_id=?
        """, (f"GT Case 3 (PISA GROUP): {pisa_name}", pisa_vid))
        n = conn.execute("SELECT COUNT(*) FROM contracts WHERE vendor_id=?", (pisa_vid,)).fetchone()[0]
        print(f"  Tagged {n} contracts for vendor {pisa_vid} ({pisa_name})")
    else:
        print(f"  Already in GT, skipping.")

    # ── False positives ────────────────────────────────────────────────────────
    structural_fps = {
        93723: (
            "FP structural_monopoly: GTECH SERVICIOS SA DE CV — Mexican subsidiary of GTECH "
            "(acquired by IGT/International Game Technology 2015). Sole authorized provider of "
            "lottery terminal infrastructure, software, and maintenance for Pronosticos Deportivos "
            "and Loteria Nacional since 1987. State lottery contracts are by definition single-source "
            "(the state lottery system can only run on the contracted vendor's proprietary platform). "
            "Structural regulatory monopoly, not corruption."
        ),
        114972: (
            "FP structural_monopoly: STARCOM WORLDWIDE SA DE CV — subsidiary of Publicis Groupe "
            "(France), one of the world's 4 largest advertising agency networks. Mexico Tourism "
            "Board (SECTUR/CPTM) media planning contracts. Tourism promotion contracts are awarded "
            "via AOR (Agency of Record) framework — winner handles all media buying for the "
            "government client. Single-source reflects AOR structure, not bid suppression. "
            "International agency network with global media buying scale — legitimate."
        ),
        45345: (
            "FP structural_monopoly: HAVAS MEDIA MEXICO SA DE CV — subsidiary of Havas Media Group "
            "(Vivendi/Bolloré), global media agency network. SECTUR/CPTM tourism advertising and "
            "media planning contracts. Same AOR framework as Starcom. Havas and Starcom alternate "
            "as AOR for Mexican tourism promotion — both are legitimate global advertising agencies. "
            "International agency structure explains concentration."
        ),
        54887: (
            "FP structural_monopoly: INDRA SISTEMAS SA — Spanish technology and defense conglomerate "
            "(listed on Madrid Stock Exchange). Mexico contracts for SAT customs technology (SAAI system), "
            "electoral technology (INE/IFE), defense and aviation systems. Indra holds exclusive "
            "maintenance contracts for its own proprietary government systems (SAAI customs platform). "
            "International defense/IT vendor with legitimate government technology contracts. "
            "Structural: government cannot switch customs/electoral systems mid-deployment."
        ),
        6118: (
            "FP structural_monopoly: SUN MICROSYSTEMS DE MEXICO SA DE CV — Oracle Corporation "
            "(acquired Sun Microsystems 2010). Pre-acquisition contracts for Sun Solaris servers, "
            "SPARC hardware, and Java enterprise systems. Post-2010 activity continues under Oracle "
            "Mexico entity. Government IT infrastructure contracts for installed Solaris/SPARC base "
            "require Sun/Oracle maintenance — structural single-source situation post-installation. "
            "International IT vendor; contracts predate and follow Oracle acquisition."
        ),
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (note, vid))
    print(f"\nMarked {len(structural_fps)} FPs (all structural_monopoly)")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        38232: (
            "LEONES CORPORATIVO SA DE CV: 1 contract 2021, SB=100%, 3.16B at SAT for "
            "security guard services at 373 customs offices and tax facilities nationwide. "
            "Single-bid win of 3.16B at SAT via restricted licitacion. Private security "
            "for SAT facilities is a legitimate large-scale procurement. However: "
            "3.16B to a single company via SB for SAT security raises concentration concerns. "
            "Needs investigation: Was SB due to restricted participation (security clearance "
            "requirements)? Were other security firms excluded? Any SAT official connections?"
        ),
        5185: (
            "EQUIMED SA DE CV: 38 contracts 2002-2008, DA=0%, 3.72B. Pharmaceutical distributor. "
            "All contracts via competitive licitacion (no direct awards). Active 2002-2008 "
            "exclusively in Structure A/B data. 3.72B via competitive procurement suggests "
            "legitimate large-scale pharma distribution. Low priority — clean procurement "
            "methods, no DA, Structure A data quality limits analysis. Needs RFC verification."
        ),
        10336: (
            "CONSTRUCCIONES Y PUENTES CHIHUAHUA SA DE CV: 54 contracts 2002-2010, SB=100%, "
            "DA=0%, 2.12B at SCT (Chihuahua/Sonora region). All single-bid licitaciones for "
            "highway and bridge construction. Active 2002-2010 only (Structure A). Structure A "
            "data quality issue: SB inflation is common in 2002-2010 data due to encoding "
            "problems. The 100% SB over 8 years at SCT in northern Mexico may reflect "
            "geographic dominance (few heavy construction firms in Chihuahua) or bid suppression. "
            "Company ceased operations 2010. Needs comparison with other Chihuahua SCT vendors."
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

    for offset in range(3):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    # Check PISA EQUIPOS link
    pisa_check = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id=278105"
    ).fetchone()[0]
    print(f"  PISA EQUIPOS BIOMEDICOS (278105) in GT: {pisa_check > 0}")

    conn.close()
    print("\nDone. Cases 570-572 inserted + PISA EQUIPOS added to case 3.")


if __name__ == "__main__":
    run()
