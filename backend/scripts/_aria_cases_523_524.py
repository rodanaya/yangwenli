"""
ARIA Cases 523-524: March 17 2026 investigation session.

Cases:
  523: GRUPO LOGISTICA FROS - LICONSA Milk Transport Shell (289M)
       RFC GLF181030, created Oct 2018, 10c all LICONSA, transport of milk 2019-2020
  524: MEDIGRAFICOS - IMSS Hemodialysis Direct Award Capture (700M)
       RFC MED1109146Q6, 21c 100% IMSS, DA=76%, hemodialysis services 2018-2021,
       name mismatch (medical graphics ≠ hemodialysis), disappeared 2022

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

    note_523 = (
        "LICONSA milk transport shell — created 2018, active 2019-2020. "
        "RFC: GLF181030 (founded October 2018). 10 contracts at LICONSA, 289M MXN. "
        "DA=40% (4/10 direct award), SB=30% (3/10 single bid). "
        "Contract content: 'Transporte y distribucion de leche producto comercial' — "
        "milk transport and distribution services for LICONSA's subsidized milk program. "
        "LICONSA (Leche Industrializada CONASUPO) distributes subsidized milk to "
        "low-income families across Mexico — a politically sensitive social program. "
        "Company created October 2018 wins first contracts within months in 2019, "
        "peaks in 2020, then disappears from procurement data — a 2-year operational "
        "window consistent with a shell company created specifically for LICONSA contracts. "
        "The LICONSA ecosystem has multiple confirmed capture vendors: "
        "MERCEDES LINARES VERGARA (Case 512, persona fisica 422M), "
        "TRANSPORTACION INTELIGENTE MP (Case 513, vehicle leasing 310M), "
        "GRUPO LOGISTICA FROS follows the same pattern: recently-created transport "
        "company winning milk distribution contracts through DA and SB at LICONSA. "
        "Classification: P6 LICONSA Milk Transport Shell — created for institutional capture."
    )

    note_524 = (
        "IMSS hemodialysis direct award capture — name mismatch + single institution. "
        "RFC: MED1109146Q6 (founded September 2011). 21 contracts at IMSS (100%), 700M MXN. "
        "DA=76% (16/21 direct award). 2018-2021 only — company inactive outside this window. "
        "Contract content: 'Hemodialisis Subrogada' — outsourced hemodialysis services. "
        "Hemodialysis is kidney dialysis for chronic renal failure patients — "
        "a high-value medical service with established competitive providers in Mexico "
        "(Fresenius Medical Care, Davita, hospital networks). "
        "CRITICAL RED FLAG: 'MEDIGRAFICOS' translates to 'Medical Graphics' — "
        "a company named for medical imaging/graphics work winning hemodialysis contracts "
        "is a definitive industry mismatch indicator. The legal name has NO relation to "
        "the actual service being provided (renal dialysis). "
        "This is a documented IMSS fraud pattern: front companies receive direct awards "
        "for specialized medical services regardless of their legal business name. "
        "76% DA at a single institution (IMSS) over 4 years with an industry-mismatched name "
        "matches the IMSS pharmaceutical/medical services capture ring. "
        "Incorporated 2011 but dormant until 2018 — the 7-year gap before first IMSS contract "
        "suggests the company was activated for IMSS access. "
        "Contract pattern: escalation 52.6M (2018) → 142.9M (2020 COVID) → decline (2021). "
        "COVID emergency procurement was used to expand DA capacity for hemodialysis contracts. "
        "Classification: P6 IMSS Hemodialysis Direct Award Capture — industry mismatch."
    )

    cases = [
        (0, [(247687, "GRUPO LOGISTICA FROS SA DE CV", "high")],
         "GRUPO LOGISTICA FROS - LICONSA Milk Transport Shell",
         "procurement_fraud", "high", note_523, 289000000, 2019, 2020),
        (1, [(226606, "MEDIGRAFICOS SA DE CV", "high")],
         "MEDIGRAFICOS - IMSS Hemodialysis DA Capture (700M)",
         "procurement_fraud", "high", note_524, 700000000, 2018, 2021),
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
        180953: (
            "CASONATO STEELCO SPA SA DE CV: Mexican subsidiary of Steelco SPA (Riese Pio X, Italy), "
            "part of the Miele Group (acquired 2017). World-leading manufacturer of hospital "
            "sterilization and decontamination equipment (autoclaves, washer-disinfectors). "
            "173 contracts 2016-2025 across IMSS, INSABI, ISSSTE, IMSS-Bienestar and national "
            "health institutes — all for hospital sterilization equipment and OEM maintenance. "
            "54% DA is structural: medical equipment OEM maintenance requires the original manufacturer. "
            "Multi-institution spread (9 health institutions) is protective. "
            "Legitimate multinational medical equipment manufacturer — structural OEM monopoly."
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
        1089: (
            "CAMINOS Y PAVIMENTOS DEL SUR SA DE CV: No RFC. 5c 2002-2005, 297M. "
            "CAPUFE (4c, 279M) + SCT (1c, 18M). SB=100%. Structure A era. "
            "Highway paving in southern Mexico. Small contract count + pre-2010 data = "
            "SB rate may be data artifact. Borderline GT — cannot confirm without RFC. "
            "Cross-reference: does this vendor match known Coahuila/southern highway cartel?"
        ),
        292872: (
            "CLIO CLIMATIZACION MEXICO SA DE CV: RFC CCM190913HI5, founded Sept 2019. "
            "3c 2023-2025, 253M. 100% IMSS for hospital HVAC systems. SB=67%. "
            "Only 3 contracts — too small to classify definitively. "
            "Specialized hospital HVAC is legitimately a niche with few qualified bidders. "
            "Monitor: future contracts at IMSS will clarify if this is capture or legitimate."
        ),
        3255: (
            "PLASTICOS REX SA DE CV: No RFC. 27c 2002-2008, 259M. 25/27 at CONAGUA. "
            "SB=96% but Structure A era data. Plastics supplier to water infrastructure. "
            "Key question: Is this the packaging company 'Plasticos Rex' (industry mismatch) "
            "or a PVC pipe manufacturer? Verify: if packaging company winning water "
            "infrastructure contracts = GT. If PVC pipe manufacturer = legitimate."
        ),
        1071: (
            "PAVIMENTOS Y MAQUINARIA SA DE CV: No RFC confirmed. 74c 2002-2023, 2,266M. "
            "SCT (49c, 1,648M) + CAPUFE (6c, 387M). SB=96% across 22 years. "
            "Likely Aguascalientes-based highway paving company. "
            "22-year track record is a protective signal but 96% SB over 74 contracts is high. "
            "Investigate: is this company in any ASF audit findings? RFC for ownership ties? "
            "If concentrated in one region with no FP signals, borderline GT highway capture."
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

    for offset in range(2):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 523-524 inserted.")


if __name__ == "__main__":
    run()
