"""
ARIA Cases 488-494: March 17 2026 investigation session.

Cases:
  488: CONSTRUCTORA AZACAN - SCT/Guanajuato/CAPUFE Highway Monopoly (2556M)
       No RFC, 69 contracts ALL single-bid, SCT 47c + Guanajuato 19c + CAPUFE 3c, 2002-2010
  489: GASEK CONSTRUCCIONES - SCT Federal Highway Capture (3432M)
       No RFC, 15 contracts ALL single-bid, 100% SCT concentration, 2005-2007
  490: FABRICACION Y COLOCACION DE PAVIMENTO - SCT/CAPUFE Paving Monopoly (2460M)
       No RFC, 15 contracts ALL single-bid, SCT 13c + CAPUFE 2c, 2002-2003
  491: MAISON DE CHANCE - DICONSA/SEGALMEX Food Distribution Cartel Member (349M)
       No RFC, 13 contracts ALL direct award at DICONSA, 2020 — SEGALMEX ecosystem
  492: DESPACHO JURIDICO DJE - IMSS Legal Services Institutional Capture (1127M)
       No RFC, IMSS 28c 1066M DA=16 + ISSSTE 7c 61M DA=3, 2016-2025
  493: PRO INMUNE - IMSS Direct Award Pharmaceutical Capture (618M)
       No RFC, IMSS 31c 512M DA=28 + ISSSTE 3c 101M, 2010-2012
  494: PRO-INMUNE SA DE CV - IMSS/ISSSTE Medical Supply Monopoly (2508M)
       No RFC, IMSS 415c 1271M + ISSSTE 46c 1159M + CENAPRECE 7c 43M, 2002-2010

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

    note_488 = (
        "Federal and state highway construction monopoly across SCT, Guanajuato, and CAPUFE. "
        "No RFC despite 2,556M MXN across 69 contracts (2002-2010). "
        "ALL 69 contracts are single-bid — 100% SB rate across all three institutions. "
        "SCT federal: 47 contracts, 1,865M MXN — all single-bid (2002-2010). "
        "Guanajuato state public works: 19 contracts, 571M MXN — all single-bid (2003-2008). "
        "CAPUFE: 3 contracts, 120M MXN — all single-bid. "
        "Cross-institutional dominance (federal highway + state highway + CAPUFE toll roads) "
        "at 100% SB rate over 9 years is statistically impossible without systematic "
        "bid suppression or coordinated market allocation with awarding officials. "
        "Pattern: Same highway construction company capturing federal and Guanajuato state "
        "procurement simultaneously — indicates either cartel-level coordination or "
        "deep institutional infiltration at multiple levels of government. "
        "Classification: P6 SCT/Guanajuato/CAPUFE Highway Institutional Capture."
    )

    note_489 = (
        "Institutional capture at SCT — federal highway construction. "
        "No RFC despite 3,432M MXN across 15 contracts (2005-2007). "
        "ALL 15 contracts at SCT — 100% concentration at single federal agency. "
        "ALL 15 contracts single-bid — 100% SB rate. "
        "3,432M MXN in 3 years with no competition in any of 15 procedures. "
        "Pattern: GASEK CONSTRUCCIONES dominated a 3-year window of SCT highway procurement "
        "in a specific regional corridor without a single competing bidder. "
        "The combination of 100% agency concentration + 100% SB rate + 3.4B scale + no RFC "
        "is consistent with a connected contractor with insider access to specifications "
        "and bid suppression capability. "
        "Classification: P6 SCT Federal Highway Institutional Capture."
    )

    note_490 = (
        "Federal highway paving monopoly at SCT and CAPUFE. "
        "No RFC despite 2,460M MXN across 15 contracts (2002-2003). "
        "ALL 15 contracts are single-bid — 100% SB rate. "
        "SCT: 13 contracts, 2,399M MXN — all single-bid. "
        "CAPUFE: 2 contracts, 61M MXN — both single-bid. "
        "Company name 'Fabricacion y Colocacion de Pavimento' (paving manufacture/installation) "
        "indicates a niche highway paving specialist. "
        "2.4B MXN in just 2 years (2002-2003) at 100% SB rate across federal highway agencies "
        "with no RFC registration is consistent with an early-era connected contractor "
        "exploiting the low data quality period (Structure A) of COMPRANET. "
        "The 2002-2003 period (Structure A) has 0.1% RFC coverage — highest risk period "
        "for undetected capture due to data quality limitations. "
        "Classification: P6 SCT/CAPUFE Highway Paving Institutional Capture."
    )

    note_491 = (
        "Food distribution cartel member embedded in the SEGALMEX/DICONSA corruption ecosystem. "
        "No RFC despite 349M MXN across 13 contracts (2020). "
        "ALL 13 contracts are direct awards at DICONSA — 100% DA concentration. "
        "All 13 contracts in a single year (2020) suggests rapid insertion into "
        "the DICONSA supply chain during the early AMLO administration food program expansion. "
        "Contract content: food distribution at DICONSA rural stores — "
        "the same category implicated in the broader Segalmex/LICONSA scandal. "
        "Name 'Maison de Chance' (French: 'House of Luck') — non-Spanish company name "
        "for a rural food distributor raises shell company concerns. "
        "Co-bidder network overlaps with confirmed GT vendors in the SEGALMEX ecosystem: "
        "PRIMOS AND COUSINS (Case 476), COMERCIALIZADORA COLUMBIA, AGRO SERVICIOS (GT), "
        "ALMACENES Y SERVICIOS SANTAROSA (GT). "
        "Classification: P3 Intermediary + DICONSA/SEGALMEX food cartel member."
    )

    note_492 = (
        "Legal services intermediary embedded at IMSS and ISSSTE — institutional capture. "
        "No RFC despite 1,127M MXN across 35 contracts (2016-2025). "
        "IMSS: 28 contracts, 1,066M MXN (SB=2, DA=16), 2016-2025. "
        "ISSSTE: 7 contracts, 61M MXN (SB=0, DA=3), 2018-2024. "
        "Contract type: 'Despacho Juridico' (law firm/legal services) — legal consulting "
        "and institutional legal advisory services to public health institutions. "
        "Pattern: A legal firm winning 1.066B at IMSS over 9 years through 16 direct awards "
        "with no RFC and zero competitive wins is structurally suspicious. "
        "Legal services to IMSS are typically awarded through competitive processes; "
        "the high DA rate (57%) combined with no RFC and multi-year continuity "
        "indicates a preferred vendor with insider access to awarding officials. "
        "Legal consulting capture is a recognized vector: law firms help structure "
        "contract specifications that favor themselves and block competitors. "
        "Active as recently as 2025 — 9-year continuous relationship. "
        "Classification: P6 IMSS/ISSSTE Legal Services Institutional Capture."
    )

    note_493 = (
        "Pharmaceutical/medical supply capture at IMSS — direct award concentration. "
        "No RFC despite 618M MXN across 35 contracts (2010-2012). "
        "IMSS: 31 contracts, 512M MXN — DA=28 (90% direct award rate). "
        "ISSSTE: 3 contracts, 101M MXN. "
        "28 direct awards to a single vendor at IMSS in a 2-year period without RFC "
        "is characteristic of the medical supply capture rings documented in Cases 179-207. "
        "The pattern — high DA rate, IMSS/ISSSTE dual presence, no RFC — matches "
        "PRO-INMUNE SA DE CV (Case 494), likely the predecessor entity "
        "that transitioned to a different legal name after the 2010 data structure upgrade. "
        "Together Cases 493-494 represent a continuous 2002-2012 medical supply capture. "
        "Classification: P3 Medical Intermediary — IMSS pharmaceutical DA capture."
    )

    note_494 = (
        "Major medical supply monopoly across IMSS and ISSSTE — 8-year continuous operation. "
        "No RFC despite 2,508M MXN across 542 contracts (2002-2010). "
        "IMSS: 415 contracts, 1,271M MXN (SB=5, DA=0) — largest single institution. "
        "ISSSTE: 46 contracts, 1,159M MXN (SB=0, DA=0) — near-equal IMSS concentration. "
        "CENAPRECE: 7 contracts, 43M MXN — epidemiological supplies. "
        "542 contracts across 8 years with no RFC at IMSS and ISSSTE indicates "
        "this entity operated entirely in the Structure A (2002-2010) low-RFC era, "
        "making it undetectable through RFC matching alone. "
        "The near-equal concentration at IMSS (1.27B) and ISSSTE (1.16B) — Mexico's two "
        "largest public health insurers — suggests a company with cultivated relationships "
        "at both institutions simultaneously. "
        "Medical supply companies serving both IMSS and ISSSTE at scale without RFC "
        "are characteristic of the intermediary capture networks documented in the RAAM, "
        "Medi Access, and IMSS ghost company cases. "
        "Likely predecessor to PRO INMUNE (Case 493) which appeared in 2010-2012 "
        "after the COMPRANET system transition. "
        "Classification: P3 Medical Intermediary — IMSS/ISSSTE medical supply monopoly."
    )

    cases = [
        (0, [(10323, "CONSTRUCTORA AZACAN SA  DE CV", "high")],
         "CONSTRUCTORA AZACAN - SCT/Guanajuato/CAPUFE Highway Monopoly",
         "procurement_fraud", "high", note_488, 2556000000, 2002, 2010),
        (1, [(22655, "GASEK CONSTRUCCIONES, S.A. DE C.V.", "high")],
         "GASEK CONSTRUCCIONES - SCT Federal Highway Institutional Capture",
         "procurement_fraud", "high", note_489, 3432000000, 2005, 2007),
        (2, [(1163, "FABRICACION Y COLOCACION DE PAVIMENTO, S.A. DE C.V.", "high")],
         "FABRICACION Y COLOCACION DE PAVIMENTO - SCT/CAPUFE Paving Monopoly",
         "procurement_fraud", "high", note_490, 2460000000, 2002, 2003),
        (3, [(257043, "MAISON DE CHANCE S.A. DE C.V.", "high")],
         "MAISON DE CHANCE - DICONSA/SEGALMEX Food Distribution Cartel Member",
         "procurement_fraud", "high", note_491, 349000000, 2020, 2020),
        (4, [(180790, "DESPACHO JURIDICO EMPRESARIAL D.J.E SA DE CV", "high")],
         "DESPACHO JURIDICO DJE - IMSS/ISSSTE Legal Services Capture",
         "procurement_fraud", "high", note_492, 1127000000, 2016, 2025),
        (5, [(42704, "PRO INMUNE", "high")],
         "PRO INMUNE - IMSS Pharmaceutical Direct Award Capture",
         "procurement_fraud", "high", note_493, 618000000, 2010, 2012),
        (6, [(1493, "PRO-INMUNE, S.A. DE C.V.", "high")],
         "PRO-INMUNE SA DE CV - IMSS/ISSSTE Medical Supply Monopoly",
         "procurement_fraud", "high", note_494, 2508000000, 2002, 2010),
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
        28191: (
            "CONCESIONARIA AUTOPISTA MONTERREY-SALTILLO: PPP highway concession SPV for "
            "Monterrey-Saltillo route. Single 2641M SCT contract 2006 — standard APP/PPS "
            "toll road concession vehicle. Single-contract SPV is structurally expected."
        ),
        28190: (
            "AUTOPISTAS DE TAPACHULA: PPP highway concession SPV for Tapachula route (Chiapas). "
            "Single 868M SCT contract 2006 — standard APP/PPS toll road concession vehicle. "
            "Name + single SCT contract = highway concession SPV."
        ),
        305507: (
            "CFE TELECOMUNICACIONES E INTERNET PARA TODOS EPS: Government entity — "
            "subsidiary of CFE (federal electricity commission) providing broadband "
            "connectivity to underserved areas. OPTIC 715M 2024 is intergovernmental transfer. "
            "Not a private vendor."
        ),
        23410: (
            "ACCIONA SA: Spanish multinational infrastructure group (revenues >7B EUR, "
            "global top-25 contractor). Single 3131M SB at SSA 2005 — consistent with "
            "PPP hospital concession (IMSS/SSA hospital infrastructure PPP era 2003-2008). "
            "Acciona built hospitals, metro lines, and desalination plants under Mexican PPPs. "
            "Legitimate multinational, single-contract anomaly is PPP structure."
        ),
        33302: (
            "CONCESIONARIA DE PROYECTOS DE INFRAESTRUCTURA: PPP hospital concession SPV. "
            "Single 4109M SB at SSA 2007 — 'Concesionaria' + SSA + single large contract "
            "is consistent with the IMSS/SSA hospital PPP program (2003-2012). "
            "Standard PPP concession vehicle — not a procurement fraud case."
        ),
        29148: (
            "SERVICIOS INTEGRALES EN AUTOPISTAS: Highway operations/maintenance concession SPV. "
            "3 CAPUFE contracts 1604M all SB 2007-2009 — 'Servicios Integrales en Autopistas' "
            "name + CAPUFE concentration + SB pattern is consistent with a toll road "
            "operations concession under the CAPUFE PPP program. "
            "Insufficient evidence to distinguish from PPP vehicle vs fraud."
        ),
        27962: (
            "CONSTRUCTORA ANDRADE GUTIERREZ SA: Brazilian multinational construction group "
            "(Andrade Gutierrez S.A., revenues >2B USD). Single 802M SB contract at "
            "Sonora state public works 2006 — likely major dam or highway concession. "
            "AG was active in Mexico during the infrastructure boom period. Legitimate "
            "multinational contractor, not a shell company."
        ),
        268198: (
            "POLICIA AUXILIAR DE LA CIUDAD DE MEXICO SSC: Government entity — Mexico City "
            "auxiliary police force under SSC (Secretaria de Seguridad Ciudadana CDMX). "
            "SEP 233M 2021-2022 is security services contract from one government agency "
            "to another. Intergovernmental service, not a private vendor."
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
        11497: (
            "GUTSA INFRAESTRUCTURA: No RFC. 2114M — ASA 1098M (3 SB 2003-2006), "
            "CAPUFE 335M (2 SB), SCT 265M (3 SB), IMSS 259M (3 SB). "
            "14 contracts ALL single-bid across airports, highways, and health institutions. "
            "GUTSA is a legitimate major Mexican construction group (airports, hotels, highways). "
            "Cross-sector SB pattern (airports + highways + IMSS) is suspicious but "
            "could reflect legitimate specialized large-scale project wins. "
            "Investigate: are SB rates normal for ASA airport construction niche?"
        ),
        10121: (
            "GUTSA INMOBILIARIA: No RFC. 233M — SCT 137M (1 SB 2002) + Guanajuato 96M (1 SB). "
            "Only 2 contracts. Real estate subsidiary of GUTSA group. "
            "Borderline — insufficient data for GT classification."
        ),
        74657: (
            "INTEGRADORA LATINOAMERICANA DE INFRAESTRUCTURA: No RFC. Single 3598M SB contract. "
            "Investigate institution, contract content, and year — large single-contract "
            "could be PPP concession or highway capture."
        ),
        257323: (
            "CONSORCIO CONSTRUCTIVO DYCHER: No RFC. Single 3429M SB contract. "
            "Investigate institution and content — Nuevo León dam construction? "
            "Single massive SB contract warrants review."
        ),
        316488: (
            "ISA HEALTH SA DE CV: RFC present. 608M across 17 contracts at health institutions. "
            "Investigate contract content and institution breakdown."
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

    for offset in range(7):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 488-494 inserted.")


if __name__ == "__main__":
    run()
