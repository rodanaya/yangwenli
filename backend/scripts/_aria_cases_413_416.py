"""
ARIA Cases 413-416: March 17 2026 investigation session.

Cases:
  413: COMERCIALIZADORA KUNEM - Tren Maya SEDENA hotel furnishing shell (296.7M)
  414: BERNARDO BONILLA MERCADO - SEDENA dental prosthetics monopoly, persona fisica (197.5M)
  415: FIGUEROA Y DE BUEN - SEMAR 141M DA fraud, incoherent title, no RFC (141.5M)
  416: Chiapas Street Lighting Ring - 4 shells at CHIS-Instituto Energias Renovables (149.1M)
       Ring: CORPORATIVO FEMM (176592) + DESARROLLOS VITA (177278) +
             ALTON SOLUCIONES (180945) + OP PACIFIC DISTRIBUTIONS (170158)

Also:
  - FP markings: APP highway SPVs + SUPRESORES DE FUEGO (data error) + TAX INMUEBLES
  - needs_review: DERSA INMOBILIARIA, MEDICAMENTOS NATURALES, ACTIFORT, SIIA, NARRO INTL
  - TOKA INTERNACIONAL 266550: tag as already in GT (case 12)

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

CHIAPAS_RING_IDS = [176592, 177278, 180945, 170158]  # FEMM, VITA, ALTON, OP PACIFIC

# needs_review vendors (no GT case, just update review_status)
NEEDS_REVIEW_IDS = [
    280913,  # DERSA INMOBILIARIA - real estate in gobernacion
    317548,  # MEDICAMENTOS NATURALES - pharma consolidated buy
    293677,  # ACTIFORT TEXTILERA - SEDENA textile supplier
    258214,  # SOLUCIONES INTELIGENTES AERONAUTICA - SEDENA aviation MRO, 71% SB
    58797,   # NARRO INTERNACIONAL - SEMAR IT, 100% DA
    34865,   # CONSTRUCTORA INFRAESTRUCTURA LATINOAMERICANA - El Realito dam
]

# False positives to mark
FP_STRUCTURAL = [227880, 231645]   # APP Arriaga-Tapachula + Conservacion Matehuala (PPP highway SPVs)
FP_DATA_ERROR = [32645]             # SUPRESORES DE FUEGO (1.26B decimal error for fire buckets)
FP_ROUTINE = [52567]                # TAX INMUEBLES (routine office rental)


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    # ── Case 413: COMERCIALIZADORA KUNEM ─────────────────────────────────────
    case_413_id = next_id
    case_413_str = f"CASE-{case_413_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_413_id, case_413_str,
        "COMERCIALIZADORA KUNEM - Tren Maya SEDENA Hotel Furnishing Shell",
        "ghost_company",
        "high",
        (
            "Company founded November 2021 (RFC CKU21112415A), first contracts 2023. "
            "Received 296.7M MXN in 5 contracts exclusively from SEDENA and FONART. "
            "Largest contract: 223M single LP for equipping 'six hotels near archaeological ruins' "
            "(Tren Maya-adjacent military construction). Additional contracts for military police "
            "facilities and FONART workshops. Brand-new company winning massive hotel furnishing "
            "contract for military-managed Tren Maya hotels is a classic ghost/intermediary pattern. "
            "Tren Maya-adjacent military construction is a known area of procurement opacity. "
            "100% SEDENA/FONART concentration, new incorporation immediately before contract cycle."
        ),
        296_700_000,
        2023, 2024,
    ))
    print(f"Inserted case {case_413_id}: KUNEM Tren Maya shell")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_413_str, 293236, "COMERCIALIZADORA KUNEM SA DE CV", "high", "aria_investigation"))

    rows_413 = conn.execute("SELECT id FROM contracts WHERE vendor_id=293236").fetchall()
    for row in rows_413:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_413_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=293236
    """, (f"KUNEM (293236): New 2021 company, 296.7M SEDENA for Tren Maya hotel furnishing. "
          f"Ghost company/intermediary — Case {case_413_id}.",))
    print(f"  Tagged {len(rows_413)} contracts for KUNEM")

    # ── Case 414: BERNARDO BONILLA MERCADO ───────────────────────────────────
    case_414_id = next_id + 1
    case_414_str = f"CASE-{case_414_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_414_id, case_414_str,
        "BERNARDO BONILLA MERCADO - SEDENA Dental Prosthetics Monopoly Persona Fisica",
        "procurement_fraud",
        "high",
        (
            "Individual person (persona fisica) monopolizing SEDENA military dental prosthetics "
            "supply with 197.5M MXN across 3 contracts (2019-2023). "
            "#1 dental vendor to SEDENA by total value (2x the second-largest vendor). "
            "66.7% single-bid rate: 2 of 3 competitive LP procedures had ZERO other bidders. "
            "No RFC on file. An individual dominating an institutional supply market for dental "
            "prosthetics across all SEDENA dental facilities is textbook single-institution capture. "
            "Consistent with a procurement ring within SEDENA's dental services unit where "
            "the individual serves as a front or gatekeeper. "
            "Natural person vendors receiving this scale of institutional contracts with no "
            "competition is a high-confidence corruption indicator."
        ),
        197_500_000,
        2019, 2023,
    ))
    print(f"Inserted case {case_414_id}: BERNARDO BONILLA MERCADO SEDENA dental")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_414_str, 243627, "BERNARDO BONILLA MERCADO", "high", "aria_investigation"))

    rows_414 = conn.execute("SELECT id FROM contracts WHERE vendor_id=243627").fetchall()
    for row in rows_414:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_414_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=243627
    """, (f"BERNARDO BONILLA MERCADO (243627): Persona fisica, 197.5M SEDENA dental monopoly, "
          f"66.7% single-bid rate. Case {case_414_id}.",))
    print(f"  Tagged {len(rows_414)} contracts for BONILLA MERCADO")

    # ── Case 415: FIGUEROA Y DE BUEN ─────────────────────────────────────────
    case_415_id = next_id + 2
    case_415_str = f"CASE-{case_415_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_415_id, case_415_str,
        "FIGUEROA Y DE BUEN - SEMAR 141M Direct Award Phantom Contract",
        "procurement_fraud",
        "high",
        (
            "100% direct award (3/3 contracts) to SEMAR (Secretaria de Marina / Navy). "
            "Main contract: 141.5M MXN DA with incoherent title 'Ciencias de la Salud, "
            "Sistema de Aire Acondicionado' (Health Sciences + Air Conditioning System) — "
            "two completely unrelated categories in one contract title suggests fabricated documentation. "
            "No RFC registered. All contract award dates are NULL. "
            "Two subsequent contracts are trivially small (83K and 94K for machinery maintenance), "
            "consistent with maintaining a vendor relationship after a one-shot large DA. "
            "Pattern: single massive direct award with fabricated/incoherent title, no RFC, "
            "null award dates, followed by token maintenance contracts = phantom contract fraud."
        ),
        141_500_000,
        2017, 2020,
    ))
    print(f"Inserted case {case_415_id}: FIGUEROA Y DE BUEN SEMAR phantom DA")

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)
    """, (case_415_str, 200407, "FIGUEROA Y DE BUEN SA DE CV", "high", "aria_investigation"))

    rows_415 = conn.execute("SELECT id FROM contracts WHERE vendor_id=200407").fetchall()
    for row in rows_415:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (case_415_str, row[0]))
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
        WHERE vendor_id=200407
    """, (f"FIGUEROA Y DE BUEN (200407): 141.5M DA SEMAR, incoherent title, no RFC, null dates. "
          f"Phantom contract. Case {case_415_id}.",))
    print(f"  Tagged {len(rows_415)} contracts for FIGUEROA Y DE BUEN")

    # ── Case 416: Chiapas Street Lighting Ring ────────────────────────────────
    case_416_id = next_id + 3
    case_416_str = f"CASE-{case_416_id}"
    conn.execute("""
        INSERT OR REPLACE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        case_416_id, case_416_str,
        "Chiapas Street Lighting Ring - 4 Shell Companies CHIS Instituto Energias Renovables",
        "ghost_company",
        "high",
        (
            "4-vendor shell company ring exclusively serving CHIS-Instituto de Energias Renovables "
            "(Chiapas state energy institute) for public street lighting (alumbrado publico). "
            "Vendors: CORPORATIVO FEMM SA DE CV (176592), DESARROLLOS Y FABRICACIONES VITA SA DE CV "
            "(177278), ALTON SOLUCIONES EMPRESARIALES INTEGRALES SA DE CV (180945), "
            "OP PACIFIC DISTRIBUTIONS SA DE CV (170158). "
            "Combined: 21 contracts, 149.1M MXN total. "
            "17 of 21 contracts awarded on SAME DAY: December 29 2016 (year-end budget dump). "
            "All 4 vendors: 100% direct award, single institution only (never appear elsewhere), "
            "identical work category (alumbrado publico), no RFC for any vendor. "
            "Classic contract-splitting ring: split the total budget across multiple shells to "
            "stay under direct-award thresholds while concentrating all payments in one day. "
            "The December 29 coordination of 17 contracts across 4 companies is statistically "
            "impossible by chance and confirms coordinated procurement fraud."
        ),
        149_100_000,
        2015, 2016,
    ))
    print(f"Inserted case {case_416_id}: Chiapas Street Lighting Ring (4 vendors)")

    tagged_416 = 0
    for vid in CHIAPAS_RING_IDS:
        vname = conn.execute("SELECT name FROM vendors WHERE id=?", (vid,)).fetchone()
        vname = vname[0] if vname else f"VENDOR_{vid}"
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)
        """, (case_416_str, vid, vname, "high", "aria_investigation"))

        rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
        for row in rows:
            conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                         (case_416_str, row[0]))
            tagged_416 += 1

        conn.execute("""
            UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
            WHERE vendor_id=?
        """, (
            f"Chiapas Street Lighting Ring (Case {case_416_id}): Part of 4-vendor shell ring "
            f"at CHIS-IER. 17/21 contracts Dec 29 2016. Combined 149.1M. 100% DA, no RFC.",
            vid
        ))
    print(f"  Tagged {tagged_416} contracts for Chiapas ring (4 vendors)")

    # ── False Positives ───────────────────────────────────────────────────────
    for vid in FP_STRUCTURAL:
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive',
            memo_text='PPP highway concession SPV (Asociacion Publico-Privada). Single-bid is structural for infrastructure PPPs.'
            WHERE vendor_id=?
        """, (vid,))
    print(f"Marked {len(FP_STRUCTURAL)} APP highway SPVs as fp_structural_monopoly")

    for vid in FP_DATA_ERROR:
        conn.execute("""
            UPDATE aria_queue SET fp_data_error=1, review_status='false_positive',
            memo_text='Likely decimal point error in Structure A data. 1.26B for fire suppressant buckets is implausible. Second contract at same institution for same product is 2.49M.'
            WHERE vendor_id=?
        """, (vid,))
    print(f"Marked {len(FP_DATA_ERROR)} vendors as fp_data_error")

    for vid in FP_ROUTINE:
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive',
            memo_text='Routine office space rental (arrendamiento de edificio) for CONAGUA. DA is standard for property leases. 1.57M total.'
            WHERE vendor_id=?
        """, (vid,))
    print(f"Marked {len(FP_ROUTINE)} routine vendors as false_positive")

    # ── needs_review (TOKA variant) ───────────────────────────────────────────
    conn.execute("""
        UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review',
        memo_text='Name variant of TOKA INTERNACIONAL (vendor_id=102627) already in GT case 12. Same entity, different RFC/name string. 113.7M at INAH for electronic meal vouchers.'
        WHERE vendor_id=266550
    """)
    print("Marked TOKA INTERNACIONAL 266550 as in_ground_truth (variant of case 12)")

    # ── needs_review for remaining suspects ──────────────────────────────────
    needs_review_notes = {
        280913: "DERSA INMOBILIARIA: Real estate company doing school maintenance for Estado de Mexico. 573.5M LP competitive. Industry mismatch flag but plausible facilities mgmt. needs_review.",
        317548: "MEDICAMENTOS NATURALES: 843.7M pharma to IMSS+19 institutions in 2025 consolidated buy. 37/38 LP competitive. Risk=1.0 is model artifact. Pattern matches legitimate consolidated procurement. needs_review.",
        293677: "ACTIFORT TEXTILERA: Textile supplier to SEDENA uniform manufacturing (fabrics, interlinings). 40% DA for 'partidas desiertas'. Coherent industry match. needs_review.",
        258214: "SOLUCIONES INTELIGENTES AERONAUTICA: SEDENA aviation MRO (Embraer/RR engines). 71.4% SB rate but highly specialized military aviation market. 444.4M. needs_review.",
        58797: "NARRO INTERNACIONAL: 3 DA IT contracts at SEMAR 2010, 67.4M total. No RFC (Structure A/B boundary). Company name suggests no IT specialization but defensa DA partially explained by security clearance. needs_review.",
        34865: "CONSTRUCTORA INFRA LATINOAMERICANA: 2 single-bid contracts 2008 (El Realito dam 549.7M + highway 100M). Real documented infrastructure projects, no RFC. needs_review.",
    }
    for vid, note in needs_review_notes.items():
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review', memo_text=? WHERE vendor_id=?
        """, (note, vid))
    print(f"Updated {len(needs_review_notes)} vendors to needs_review")

    conn.commit()
    print("\nCommitted.")

    # ── Verification ─────────────────────────────────────────────────────────
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max}")
    print(f"Total GT vendors: {total_v}")
    print(f"Total GT contracts: {total_c}")

    for case_str in [case_413_str, case_414_str, case_415_str, case_416_str]:
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        name = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {name[:55]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 413-416 inserted.")


if __name__ == "__main__":
    run()
