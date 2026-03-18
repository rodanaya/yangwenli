"""
ARIA Cases 511-514: March 17 2026 investigation session.

Cases:
  511: OPERA MARITIMA - IMIPAS Maritime Services Capture (416M)
       No RFC, single 416M SB at fisheries research institute 2025
  512: MERCEDES LINARES VERGARA - LICONSA Milk Distribution Persona Fisica (422M)
       No RFC, LICONSA 422M 24c DA=9 milk transport 2021-2025, individual person
  513: TRANSPORTACION INTELIGENTE MP - LICONSA Vehicle Leasing Capture (310M)
       No RFC, single 310M SB LICONSA vehicle leasing 2020
  514: INDUSTRIAS CAMPO FRESCO - SEGALMEX/DICONSA Bean Processing Cartel (304M)
       No RFC, SEGALMEX 212M DA + DICONSA 92M DA=71, 75c bean processing 2019-2021

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

    note_511 = (
        "IMIPAS maritime services institutional capture — 2025. "
        "No RFC despite 416M MXN in a single SB contract (2025). "
        "IMIPAS (Instituto Mexicano de Investigacion en Pesca y Acuacultura Sustentables, "
        "formerly INAPESCA) — the national fisheries research institute. "
        "Contract: 'EL IMIPAS REQUIERE REALIZAR LA CONTRATACION DE LOS SERVICIOS "
        "ESPECIALIZADOS PARA...' (IMIPAS requires specialized services for fisheries research). "
        "416M MXN in a single competitive procedure with no other bidders at a "
        "fisheries research institute is exceptional: research vessels, sonar equipment, "
        "and maritime research support are specialized but not unique. "
        "A company named 'Opera Maritima' (Maritime Operations) winning a single "
        "416M contract at IMIPAS as the sole bidder with no RFC in 2025 "
        "suggests either insider specification-writing (tailoring requirements to "
        "exclude competing maritime operators) or a connected vendor with exclusive "
        "access to IMIPAS procurement decision-makers. "
        "Classification: P6 IMIPAS Maritime Services Institutional Capture."
    )

    note_512 = (
        "LICONSA milk distribution capture by an individual person — 4-year operation. "
        "No RFC despite 422M MXN across 24 contracts (2021-2025). "
        "LICONSA: 24 contracts, 422M MXN (SB=1, DA=9). "
        "Contract content: 'SERVICIO DE TRANSPORTE Y DISTRIBUCION DE LECHE LIQUIDA "
        "EN CANASTILLAS' (milk transport and distribution in crates). "
        "MERCEDES LINARES VERGARA is a persona fisica (individual person), not a company. "
        "An individual winning 422M in government milk distribution contracts over 4 years "
        "through LICONSA is highly anomalous — logistics at this scale requires "
        "fleets of refrigerated vehicles, warehouses, and staffing that exceeds "
        "what any individual person could legitimately provide. "
        "The use of a persona fisica to capture government food distribution contracts "
        "is a documented corruption pattern: individuals acting as intermediaries "
        "who subcontract to actual operators while extracting rents as the registered vendor. "
        "9 direct awards to the same individual at LICONSA suggests repeated preferred "
        "access to DA procurement at the expense of competitive processes. "
        "Classification: P3 Individual Intermediary — LICONSA milk distribution capture."
    )

    note_513 = (
        "LICONSA vehicle leasing institutional capture — single massive contract. "
        "No RFC despite 310M MXN in a single SB contract (2020). "
        "LICONSA: 1 contract, 310M MXN single-bid (2020). "
        "Contract content: 'CONTRATACION PLURIANUAL DEL ARRENDAMIENTO SIN OPCION A COMPRA "
        "DE VEHICULOS' (multi-year vehicle leasing without purchase option). "
        "310M for multi-year vehicle leasing at LICONSA as the sole bidder in 2020 "
        "with no RFC is suspicious. Vehicle leasing for government agencies typically "
        "attracts multiple qualified fleet operators. "
        "The SB result on a pluriannual (multi-year) contract locks LICONSA into a "
        "single vendor for vehicle services with no competition for the contract duration. "
        "Company name 'Transportacion Inteligente MP' (Smart Transportation MP) — "
        "opaque name inconsistent with a major fleet operator. "
        "Classification: P6 LICONSA Vehicle Leasing Institutional Capture."
    )

    note_514 = (
        "SEGALMEX and DICONSA bean processing intermediary — 3-year operation. "
        "No RFC despite 304M MXN across 75 contracts (2019-2021). "
        "SEGALMEX: 3 contracts, 212M MXN — all direct award. "
        "DICONSA: 72 contracts, 92M MXN — DA=71 (99% DA). "
        "Contract content: 'SERVICIO INTEGRAL DE CRIBADO EMPAQUETADO Y PUESTA EN SITIO "
        "DE FRIJOL' (integrated bean sieving, packaging, and delivery service). "
        "Bean processing and packaging for DICONSA rural stores and SEGALMEX — "
        "the same food security infrastructure implicated in the Segalmex scandal. "
        "75 contracts across 3 years at 99% DA rate with no RFC is characteristic "
        "of a captured intermediary inserted into the DICONSA supply chain. "
        "Company name 'Industrias Campo Fresco' (Fresh Field Industries) — "
        "plausible agro-industrial name but the near-total DA capture and no RFC "
        "indicate this is a preferred intermediary rather than a competitive processor. "
        "Classification: P3 Intermediary + SEGALMEX/DICONSA bean processing cartel."
    )

    cases = [
        (0, [(318049, "OPERA MARITIMA SA DE CV", "high")],
         "OPERA MARITIMA - IMIPAS Maritime Services Institutional Capture",
         "procurement_fraud", "high", note_511, 416000000, 2025, 2025),
        (1, [(269700, "MERCEDES LINARES VERGARA", "high")],
         "MERCEDES LINARES VERGARA - LICONSA Milk Distribution Capture",
         "procurement_fraud", "high", note_512, 422000000, 2021, 2025),
        (2, [(264657, "TRANSPORTACION INTELIGENTE MP SA DE CV", "high")],
         "TRANSPORTACION INTELIGENTE MP - LICONSA Vehicle Leasing Capture",
         "procurement_fraud", "high", note_513, 310000000, 2020, 2020),
        (3, [(247667, "INDUSTRIAS CAMPO FRESCO SA DE CV", "high")],
         "INDUSTRIAS CAMPO FRESCO - SEGALMEX/DICONSA Bean Processing Cartel",
         "procurement_fraud", "high", note_514, 304000000, 2019, 2021),
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
    print("\nDone. Cases 511-514 inserted.")


if __name__ == "__main__":
    run()
