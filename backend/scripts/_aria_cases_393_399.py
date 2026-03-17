"""
ARIA Cases 393-399: Merged batch from March 17 2026 investigation session.
Run from backend/ directory after DB is unlocked.

Cases:
  393: MARMOLES ARCA - COVID shell company, marble co. selling respirators to IMSS
  394: ESTRUCTURA Y BALANCE INDUSTRIAL - ghost renovation 345M ISSSTE daycare
  395: COMERCIALIZADORA ARNOLD & JELGA - IMSS pharma DA capture
  396: OPERADORA DE CENTRO DE MEZCLAS - IMSS pharma mixing single-bid monopoly
  397: ICA CONSTRUCTORA DE INFRAESTRUCTURA - NAICM single-bid mega-contracts
  398: SOS SISTEMAS OPCIONALES EN SALUD - IMSS 99% DA pharma capture
  399: JAVIER ESTRADA SALGADO - persona fisica 439M IMSS pharma distributor

ARIA updates (no GT cases):
  BMRN MEXICO (313628): false_positive + fp_patent_exception (BioMarin patented drugs)
  ENSAMBLADORA LATINOAMERICANA (294526): needs_review (SEDENA vehicles, verify capacity)
  CONSTRUCTORA MONTELIZ (239570): needs_review + new_vendor_risk=0 (1988 company, flag error)
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

CASES = [
    dict(
        id=393, case_id="CASE-393",
        case_name="MARMOLES ARCA - COVID Shell Industry Mismatch",
        case_type="ghost_company",
        confidence_level="high",
        notes=(
            "Marble/construction company (RFC MAR180611TWA, incorporated Jun 2018) received "
            "588M MXN in 100% direct-award IMSS contracts during COVID emergency period: "
            "210M MXN for respirators (contract 'RESPIRADORES'), 228.8M MXN unspecified medical "
            "(U200711), 150M MXN (U200667). All three contracts critical risk, all DA, all IMSS. "
            "Zero medical sector background. Classic COVID emergency procurement fraud: shell company "
            "exploiting emergency direct-award rules to supply critical medical equipment. "
            "Name 'MARMOLES ARCA' (Arch Marbles) is completely incompatible with medical supply."
        ),
        estimated_fraud_mxn=588_000_000,
        year_start=2019, year_end=2021,
        vendor_id=265454,
        vendor_name="MARMOLES ARCA S A P I DE CV",
        evidence_strength="strong",
        disposition="confirmed_corrupt",
        memo=(
            "MARMOLES ARCA S A P I DE CV (RFC MAR180611TWA, inc. Jun 2018): Marble/construction "
            "company receiving 588M MXN in 100% DA IMSS contracts including 210M MXN for "
            "RESPIRADORES during COVID. Three contracts all critical risk, zero medical background. "
            "Classic COVID fraud shell company. CONFIRMED CORRUPT - Case 393."
        ),
    ),
    dict(
        id=394, case_id="CASE-394",
        case_name="ESTRUCTURA Y BALANCE INDUSTRIAL - ISSSTE Daycare Ghost Renovation",
        case_type="ghost_company",
        confidence_level="high",
        notes=(
            "Company founded Feb 2020 (RFC EBI2002171E1), received 345M MXN ISSSTE contract for "
            "'institutional image change' (remodeling) of 2 childcare centers in Veracruz within "
            "2.5 years. Grossly disproportionate value: ~172M MXN per daycare facility. "
            "Contract escalation pattern: 21M (2021 maintenance) -> 345M (2022 renovation DA) -> "
            "0.4M -> 3M (2023 maintenance). 100% concentration at single ISSSTE Veracruz delegation. "
            "75% direct award rate. New company winning massive DA renovation contract is classic "
            "ghost contractor for public works overpricing fraud."
        ),
        estimated_fraud_mxn=300_000_000,
        year_start=2021, year_end=2023,
        vendor_id=277243,
        vendor_name="ESTRUCTURA Y BALANCE INDUSTRIAL SA DE CV",
        evidence_strength="high",
        disposition="confirmed_corrupt",
        memo=(
            "ESTRUCTURA Y BALANCE INDUSTRIAL (RFC EBI2002171E1, inc. Feb 2020): 345.8M DA from "
            "ISSSTE Veracruz for 'institutional image change' at 2 daycares (~172M per facility). "
            "New company, single-institution, contract spike. Classic ghost renovation contractor. "
            "CONFIRMED CORRUPT - Case 394."
        ),
    ),
    dict(
        id=395, case_id="CASE-395",
        case_name="COMERCIALIZADORA ARNOLD & JELGA - IMSS Pharmaceutical DA Capture",
        case_type="institutional_capture",
        confidence_level="medium",
        notes=(
            "Pharma comercializadora (RFC CAA1410095B1, registered 2014) with 95.2% DA rate at IMSS. "
            "First contract 2020 (6-year dormancy after registration). Explosive growth to 293M/yr "
            "by 2022, then decline. 633M MXN across 179 IMSS contracts, almost all DA for medicines "
            "and consumables. Contract splitting: up to 15 DA contracts per item in a single day. "
            "251M MXN Guardia Nacional body armor contract (2023, competitive bid) reveals intermediary "
            "nature - same company supplies medicine to IMSS and body armor to police. "
            "Classic IMSS DA pharma capture pattern with intermediary characteristics."
        ),
        estimated_fraud_mxn=400_000_000,
        year_start=2020, year_end=2024,
        vendor_id=259101,
        vendor_name="COMERCIALIZADORA ARNOLD & JELGA SA DE CV",
        evidence_strength="medium",
        disposition="needs_review",
        memo=(
            "COMERCIALIZADORA ARNOLD & JELGA (RFC CAA1410095B1): 179 IMSS contracts, 633M MXN, "
            "95.2% DA for meds and consumables. RFC 2014 but first contract 2020 (6yr gap). "
            "Peak 293M/yr 2022. 251M GN body armor contract exposes intermediary. "
            "Classic IMSS DA pharma capture. NEEDS_REVIEW - Case 395."
        ),
    ),
    dict(
        id=396, case_id="CASE-396",
        case_name="OPERADORA DE CENTRO DE MEZCLAS - IMSS Single-Bid Pharma Mixing",
        case_type="single_bid_monopoly",
        confidence_level="medium",
        notes=(
            "Short-lived vendor (active 2008-2010) with 10 IMSS contracts for pharmaceutical "
            "compounding/mixing services. 6.3B MXN primary contract is likely a Structure A "
            "decimal error (712x larger than the next largest contract at same hospital). "
            "Excluding probable data error, remaining 9 contracts total 8.3M MXN. "
            "100% single-bid rate (0% competitive), no RFC registered, vendor vanished after 3 years. "
            "P3 intermediary pattern - sole supplier of specialized IMSS mixing services. "
            "All contracts critical risk. Note: Main 6.3B contract likely data error."
        ),
        estimated_fraud_mxn=8_160_000,
        year_start=2008, year_end=2010,
        vendor_id=35996,
        vendor_name="OPERADORA DE CENTRO DE MEZCLAS, S.A. DE C.V.",
        evidence_strength="medium",
        disposition="needs_review",
        memo=(
            "OPERADORA DE CENTRO DE MEZCLAS: 10 IMSS contracts, pharma compounding. "
            "6.3B contract is likely Structure A decimal error. Remaining 8.3M, 100% single-bid, "
            "no RFC, active 2008-10 then vanished. Sole IMSS mixing supplier. "
            "NEEDS_REVIEW (possible data error in main contract) - Case 396."
        ),
    ),
    dict(
        id=397, case_id="CASE-397",
        case_name="ICA Constructora de Infraestructura - NAICM Single-Bid Mega-Contracts",
        case_type="single_bid_monopoly",
        confidence_level="medium",
        notes=(
            "ICA Group subsidiary exclusively contracted for NAICM (New International Airport of "
            "Mexico City). 3 contracts worth 16.6B MXN (2016-2018), all through 'international "
            "competitive tender' (licitación pública) but ALL three were single-bid (zero competing "
            "bidders). ICA group total at NAICM: 24.6B MXN across multiple entities. "
            "Combined with CICSA (92.2B), top 2 entities = 78% of 149.7B NAICM total. "
            "98.2% of NAICM contract value won via single-bid procedures. "
            "Last 2 contracts (9.1B) awarded months before AMLO cancellation in 2018. "
            "Parent entity ICA Constructora SA (vendor_id=258499) already in GT case_id=11."
        ),
        estimated_fraud_mxn=16_640_923_705,
        year_start=2016, year_end=2018,
        vendor_id=192250,
        vendor_name="ICA CONSTRUCTORA DE INFRAESTRUCTURA, S.A. DE C.V.",
        evidence_strength="medium",
        disposition="needs_review",
        memo=(
            "ICA CONSTRUCTORA DE INFRAESTRUCTURA: NAICM subsidiary. 3 contracts 16.6B MXN, "
            "all single-bid intl tenders. ICA group 24.6B + CICSA 92.2B = 78% NAICM. "
            "98.2% NAICM by value via single-bid. Parent in GT case 11. "
            "NEEDS_REVIEW - Case 397."
        ),
    ),
    dict(
        id=398, case_id="CASE-398",
        case_name="SOS Sistemas Opcionales en Salud - IMSS DA Pharma Capture",
        case_type="procurement_fraud",
        confidence_level="medium",
        notes=(
            "Health systems distributor (RFC SOS140225EF2) with 201 IMSS contracts worth 500M MXN, "
            "99% direct award rate (2023-2024). Additional 157M MXN at Secretaría de Planeación "
            "Finanzas (state health, 100% DA). 'SOS Sistemas Opcionales' name implies generic "
            "optional/alternative supplier. Extreme DA concentration at IMSS suggests institutional "
            "capture of DA procurement budget. Active only 2023-2024 (new entry into market). "
            "Pattern consistent with IMSS DA pharma distributor schemes."
        ),
        estimated_fraud_mxn=500_000_000,
        year_start=2023, year_end=2024,
        vendor_id=278912,
        vendor_name="SOS SISTEMAS OPCIONALES EN SALUD SA DE CV",
        evidence_strength="medium",
        disposition="needs_review",
        memo=(
            "SOS SISTEMAS OPCIONALES EN SALUD (RFC SOS140225EF2): 201 IMSS contracts, 500M MXN, "
            "99% DA (2023-24). Plus 157M state health 100% DA. New market entrant with extreme DA "
            "concentration. IMSS pharma capture pattern. NEEDS_REVIEW - Case 398."
        ),
    ),
    dict(
        id=399, case_id="CASE-399",
        case_name="Javier Estrada Salgado - Persona Fisica IMSS Pharma Proxy",
        case_type="procurement_fraud",
        confidence_level="medium",
        notes=(
            "Individual person (persona física, no RFC registered) distributing 439M MXN of "
            "medicine, lab materials, and medical supplies to IMSS via 481 solicitudes de "
            "cotización (quote-request mechanism, below-threshold DA). Active 2020-2022. "
            "Additional contracts at state health agencies (Sonora, Durango, Aguascalientes). "
            "A single individual accumulating 439M MXN in IMSS pharma contracts via below-threshold "
            "DA mechanism is highly suspicious. No RFC suggests informality or evasion. "
            "Pattern consistent with proxy/front person for organized below-threshold DA scheme, "
            "possibly to circumvent competitive bidding requirements."
        ),
        estimated_fraud_mxn=439_000_000,
        year_start=2020, year_end=2022,
        vendor_id=256744,
        vendor_name="JAVIER ESTRADA SALGADO",
        evidence_strength="medium",
        disposition="needs_review",
        memo=(
            "JAVIER ESTRADA SALGADO (persona fisica, no RFC): 481 IMSS solicitudes de cotizacion, "
            "439M MXN in meds/lab materials (2020-22). Below-threshold DA mechanism to avoid "
            "bidding. Individual as major pharma distributor = likely proxy front. "
            "NEEDS_REVIEW - Case 399."
        ),
    ),
]

# ARIA-only updates (not adding to GT cases)
ARIA_UPDATES = [
    dict(
        vendor_id=313628,
        review_status="false_positive",
        fp_patent_exception=1,
        memo=(
            "BMRN MEXICO S DE RL DE CV: Subsidiary of BioMarin Pharmaceutical (NASDAQ: BMRN). "
            "Supplies orphan/patented drugs: Sapropterin/Kuvan (PKU), Vimizim, Naglazyme. "
            "100% DA is legally required under Art. 41 LAASSP (unique supplier). "
            "Risk score 1.0 is model artifact (single institution, high concentration). "
            "FALSE POSITIVE - legitimate patent-protected pharmaceutical company."
        ),
    ),
    dict(
        vendor_id=294526,
        review_status="needs_review",
        fp_patent_exception=0,
        memo=(
            "ENSAMBLADORA LATINOAMERICANA DE MOTORES (RFC ELM170817QG5): 4 SEDENA contracts, "
            "2.05B MXN for military vehicles (6.5-ton trucks, pickup 4x4). All public tender. "
            "Main contract 2B MXN via licitacion publica (Oct 2023). SAPI structure (2017). "
            "Verify industrial capacity and ownership. Could be legitimate defense assembler "
            "or front company for vehicle import arbitrage. NEEDS_REVIEW."
        ),
    ),
    dict(
        vendor_id=239570,
        review_status="needs_review",
        new_vendor_risk=0,
        memo=(
            "CONSTRUCTORA MONTELIZ SA DE CV (RFC CMO881205669): Founded 1988, 37 years active. "
            "new_vendor_risk flag was INCORRECTLY set (model error - company predates 2018 filter). "
            "9 contracts at IMSS, 1B MXN, 44% DA. Main contract 968M MXN (2021) via licitacion. "
            "Verify scope and execution of 968M contract. NEEDS_REVIEW - new_vendor_risk corrected."
        ),
    ),
]


def run():
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max case ID: {max_id}")
    if max_id != 392:
        print(f"WARNING: Expected max_id=392, got {max_id}. Adjusting case IDs.")
        offset = max_id - 392
        for c in CASES:
            c["id"] += offset
        print(f"Adjusted IDs: {[c['id'] for c in CASES]}")

    # Insert GT cases
    print("\nInserting GT cases...")
    for c in CASES:
        # Check year_start/year_end columns exist
        cols = [r[1] for r in conn.execute("PRAGMA table_info(ground_truth_cases)").fetchall()]
        has_year = "year_start" in cols
        has_sector = "sector" in cols

        if has_year and has_sector:
            conn.execute("""
                INSERT OR REPLACE INTO ground_truth_cases
                (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, (c["id"], c["case_id"], c["case_name"], c["case_type"],
                  c["confidence_level"], c["notes"], c["estimated_fraud_mxn"],
                  c["year_start"], c["year_end"]))
        elif has_year:
            conn.execute("""
                INSERT OR REPLACE INTO ground_truth_cases
                (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, (c["id"], c["case_id"], c["case_name"], c["case_type"],
                  c["confidence_level"], c["notes"], c["estimated_fraud_mxn"],
                  c["year_start"], c["year_end"]))
        else:
            conn.execute("""
                INSERT OR REPLACE INTO ground_truth_cases
                (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
                VALUES (?,?,?,?,?,?,?)
            """, (c["id"], c["case_id"], c["case_name"], c["case_type"],
                  c["confidence_level"], c["notes"], c["estimated_fraud_mxn"]))

        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)
        """, (c["id"], c["vendor_id"], c["vendor_name"], c["evidence_strength"], "aria_investigation"))

        # Tag contracts
        rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (c["vendor_id"],)).fetchall()
        for row in rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (c["id"], row[0])
            )

        # Update ARIA queue
        conn.execute("""
            UPDATE aria_queue SET in_ground_truth=1, review_status=?, memo_text=?
            WHERE vendor_id=?
        """, (c["disposition"], c["memo"], c["vendor_id"]))

        contracts_tagged = len(rows)
        print(f"  [{c['id']}] {c['case_name'][:60]} => {c['disposition']} ({contracts_tagged} contracts)")

    # ARIA-only updates
    print("\nUpdating ARIA queue (non-GT vendors)...")
    for u in ARIA_UPDATES:
        conn.execute(
            "UPDATE aria_queue SET review_status=?, memo_text=? WHERE vendor_id=?",
            (u["review_status"], u["memo"], u["vendor_id"])
        )
        if u.get("fp_patent_exception"):
            conn.execute("UPDATE aria_queue SET fp_patent_exception=1 WHERE vendor_id=?", (u["vendor_id"],))
        if "new_vendor_risk" in u:
            conn.execute("UPDATE aria_queue SET new_vendor_risk=? WHERE vendor_id=?",
                         (u["new_vendor_risk"], u["vendor_id"]))
        print(f"  vendor {u['vendor_id']}: {u['review_status']}")

    conn.commit()

    # Verify
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max}")
    print(f"Total GT vendors: {total_vendors}")
    print(f"Total GT contracts: {total_contracts}")

    for c in CASES:
        r = conn.execute(
            "SELECT vendor_id, review_status, in_ground_truth FROM aria_queue WHERE vendor_id=?",
            (c["vendor_id"],)
        ).fetchone()
        if r:
            print(f"  v={r[0]}: status={r[1]}, gt={r[2]}")

    conn.close()
    print("\nDone. Cases 393-399 inserted, ARIA queue updated.")


if __name__ == "__main__":
    run()
