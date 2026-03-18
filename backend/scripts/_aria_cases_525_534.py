"""
ARIA Cases 525-534: March 17 2026 investigation session.

Cases:
  525: SERVICIO DE NANOLIMPIEZA - IPN Cleaning Shell (212M)
       RFC 2021, 118c ALL IPN, DA=65% SB=35%, cleaning 2023 — IPN cartel rotation
  526: DAGER LOGISTICA Y COMERCIO - SEGALMEX DA Cartel (210M)
       2c ALL DA at SEGALMEX, corn+warehouse 2020-2022
  527: GRUPO EMPRESARIAL GECS - IMSS DA Shell + COVID Opportunism (212M)
       No RFC, 98c DA=99% IMSS+COVID insumos, 109M single 2020 COVID DA
  528: DRAGADOS DESAZOLVES Y CAMINOS - CONAGUA Dredging SB Capture (215M)
       CONAGUA dredging ALL 2015-2018, 75% SB, Tabasco rivers — CONAGUA cartel
  529: BIOSISTEMAS Y SEGURIDAD PRIVADA - IMSS Pharma Industry Mismatch (471M)
       "Security" company selling medications at IMSS DA=85%, 224M single SB 2022
  530: ALMACEN DE GRANOS DE LA PENINSULA - SEGALMEX Warehouse Monopoly (566M)
       16c DA=75%, Diconsa→SEGALMEX→APB warehouse, peninsula grain 2014-2025
  531: EQUIPOS ALMAQ - CONAGUA Valley of Mexico Water SB Capture (575M)
       9c SB=89% CONAGUA+CAEM, dredging/drainage Valley of Mexico 2006-2018
  532: RICHMOND PUBLISHING - CONALITEG English Textbook DA Monopoly (405M)
       No RFC, 171c DA=99% ALL CONALITEG, English textbooks PRONI/Secundaria 2014-2021
  533: MEDIVIDA - IMSS Pharmaceutical DA Capture (422M)
       No RFC, 119c DA=98% IMSS=99% DA, 92c in 2023 = splitting, pharma+radiology
  534: HOSPITALARIO MED SALUS - IMSS Shell DA Pharmaceutical Capture (430M)
       RFC 2019, started 2023, 21c DA=100% IMSS+ISSSTE, new shell pharma ring

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

CONAGUA_CARTEL = (
    "Part of the CONAGUA hydraulic construction cartel: PAJEME (GT), PEREZ Y GIL (Case 439), "
    "URISA (Case 441), OZONE (Case 449), INGENIERIA SANITARIA (Case 450), "
    "COET TUBERIAS (Case 468), ARTEKK (Case 470), ARCOS (Case 472), "
    "MOLIENDAS TIZAYUCA (Case 473), CONTROL DE EROSION (Case 474), GEBAUDE (Case 475), "
    "AGUAS RECUPERADAS (Case 495), DRAGADOS DESAZOLVES Y CAMINOS (Case 528), "
    "EQUIPOS ALMAQ (Case 531). "
    "Each firm monopolizes a hydraulic sub-niche at CONAGUA through market allocation."
)

SEGALMEX_CARTEL = (
    "Part of the SEGALMEX/DICONSA food distribution cartel. "
    "Co-vendors include: COMERCIALIZADORA COLUMBIA (confirmed_corrupt), "
    "AGRO SERVICIOS A PRODUCTORES DEL VALLE (GT), MERCANTA (GT), "
    "PRIMOS AND COUSINS (Case 476), MAISON DE CHANCE (Case 491), "
    "BECADEHU (Case 496), CARREGIN (Case 497), TECHNOFOODS (Case 498), "
    "GRAMILPA (Case 507), DM MEXICANA (Case 508), GRUPO DRAKIR (Case 509), "
    "LONJA AGROPECUARIA DE JALISCO (Case 522), "
    "ALMACEN GRANOS PENINSULA (Case 530), DAGER LOGISTICA (Case 526). "
    "All win through direct awards at DICONSA/SEGALMEX/APB food program agencies."
)

IPN_CARTEL = (
    "Part of the IPN (Instituto Politecnico Nacional) maintenance/cleaning cartel. "
    "Co-vendors in same IPN contract rotation: "
    "IPN Cartel de la Limpieza (original GT case), GOTT UND GLUCK (Case 216), "
    "RAPAX (GT), LAMAP+ARMOT (Case 228), REISCO (Case 293), "
    "SERVICIO DE NANOLIMPIEZA (Case 525). "
    "Pattern: new shells replace previous shells when those are investigated."
)

IMSS_DA_RING = (
    "Part of the IMSS pharmaceutical/medical DA capture ring. "
    "Pattern: near-total direct awards at IMSS, competitive procurement elsewhere, "
    "industry name mismatch, no RFC or recent incorporation, COVID-era DA escalation. "
    "Related cases: GOTT UND GLUCK (Case 216), DLP Medical (Case 311), "
    "Prodifarma (Case 316), Landsteiner Scientific (Case 317), "
    "Soluglob Ikon (Case 292), KBN Medical (GT), Solomed (GT), "
    "EVOLUTION PROCES (Case 520), MEDIVIDA (Case 533), MED SALUS (Case 534)."
)


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    note_525 = (
        "IPN cleaning cartel — shell rotation to avoid investigation. "
        "RFC suggests incorporation 2021. 118 contracts at IPN exclusively (2023), 212M MXN. "
        "DA=65% (77/118 direct award), SB=35% (41/118 single bid). "
        "Contract content: cleaning and maintenance services at IPN facilities. "
        "118 fragmented contracts in a single year for the same institution is the "
        "defining pattern of contract splitting: the company artificially fragments "
        "a single service into 118 contracts to stay below review thresholds. "
        "The IPN cleaning cartel is one of the most documented patterns in this dataset: "
        "a rotation of shell companies wins IPN cleaning/maintenance contracts, "
        "each lasting 1-2 years before being replaced by the next shell. "
        "SERVICIO DE NANOLIMPIEZA follows in the footsteps of GOTT UND GLUCK (2019), "
        "RAPAX (2020-2021), LAMAP and ARMOT (2021-2022) — all GT cases, all IPN shells. "
        "The name 'NANOLIMPIEZA' (nanotechnology cleaning) is marketing theater: "
        "a cleaning service company using 'nano' branding to justify premium pricing "
        "for ordinary janitorial work. "
        + IPN_CARTEL +
        "Classification: P6 IPN Cleaning Shell — institutional capture + contract splitting."
    )

    note_526 = (
        "SEGALMEX direct award cartel member — corn and warehouse capture. "
        "2 contracts, 100% direct award, at SEGALMEX (Seguridad Alimentaria Mexicana). "
        "210M MXN across 2020 (warehouse services, 51M) and 2022 (corn acquisition, 158M). "
        "Contract content: "
        "'Servicio de almacenamiento de granos' (grain storage, 2020) and "
        "'Adquisicion de maiz blanco nacional, origen Sinaloa' (Sinaloa white corn, 2022). "
        "The Sinaloa white corn acquisition pattern in 2022 is at the heart of the "
        "SEGALMEX scandal: DAGER LOGISTICA receives a 158M direct award for Sinaloa corn "
        "in the same year and from the same institution as ACT AGROSERVICIOS (Case 499) "
        "and PURP SA DE CV (Case 500) — confirming this is a cartel of DA corn buyers "
        "coordinated at SEGALMEX in 2022. "
        + SEGALMEX_CARTEL +
        "Classification: P6 SEGALMEX DA Cartel — corn acquisition + warehouse."
    )

    note_527 = (
        "IMSS medical supply shell + COVID opportunism — near-total direct awards. "
        "No RFC. 98 contracts, 2018-2023, 212M MXN. DA=99% (97/98). "
        "Primary institutions: IMSS (90c, 176M, 100% DA) + SEGALMEX (2c, 33M COVID gel). "
        "Also EDUCAL, BANJERCITO (minor). "
        "Contract content: 'Material de curacion' (wound care materials) predominantly. "
        "Also: antibacterial gel for SEGALMEX during COVID (2020). "
        "Key COVID red flag: 109M IMSS DA contract for medical supplies in 2020 — "
        "this is the documented COVID-era emergency procurement abuse pattern where "
        "companies with no RFC received massive direct awards under emergency procedures. "
        "A company with no RFC winning 109M in a single DA at IMSS for wound care "
        "materials during COVID matches the confirmed IMSS COVID fraud cases. "
        "The cross-institutional pattern (IMSS + SEGALMEX + EDUCAL + BANJERCITO) "
        "at 99% DA shows a vendor with inside access to DA procurement across "
        "multiple unrelated government agencies — not a legitimate specialized supplier. "
        "Classification: P2 Ghost / P6 IMSS DA Shell — COVID procurement abuse + medical."
    )

    note_528 = (
        "CONAGUA dredging single-bid capture — Tabasco river maintenance monopoly. "
        "8 contracts at CONAGUA (100%), 2015-2018, 215M MXN. DA=25% (2/8), SB=75% (6/8). "
        "Contract content: dredging and maintenance of Tabasco rivers — "
        "'Desazolve del Rio Usumacinta', 'Desazolve del Rio Sabinal' — "
        "flood protection infrastructure for the most flood-prone state in Mexico. "
        "Tabasco is systematically prone to floods; CONAGUA spends heavily on "
        "river dredging there. DRAGADOS DESAZOLVES Y CAMINOS (Dredging, Sewage and Roads) "
        "is a company named for exactly this niche — specializing in Tabasco river dredging "
        "and capturing CONAGUA contracts through single-bid procedures. "
        "75% single-bid rate at a single agency over 4 years = CONAGUA cartel pattern. "
        + CONAGUA_CARTEL +
        "Classification: P1/P6 CONAGUA Tabasco Dredging Single-Bid Capture."
    )

    note_529 = (
        "IMSS pharmaceutical capture — industry mismatch (security company selling medications). "
        "70 contracts, 2022-2025, 471M MXN. DA=49% overall. "
        "IMSS-specific: 20 contracts, 375M, DA=85%. Also ISSSTE, INSABI, state health. "
        "Contract content: Medications (antibiotics, antivirals, specialized drugs) and "
        "a single 224M SB contract at IMSS for 'Suministro de medicamentos'. "
        "CRITICAL: The company is legally named 'BIOSISTEMAS Y SEGURIDAD PRIVADA' — "
        "'Security Systems and Private Security.' A PRIVATE SECURITY company selling "
        "hundreds of millions in medications is the most extreme industry mismatch "
        "in this dataset. There is no operational overlap between security services "
        "and pharmaceutical distribution. "
        "This is a shell company technique: register under a generic or misleading name "
        "to obscure the actual procurement activity and avoid matching with known patterns. "
        "The IMSS-specific DA=85% vs other institutions (where it wins competitively) "
        "confirms institution-specific capture rather than market monopoly. "
        + IMSS_DA_RING +
        "Classification: P3 Intermediary / Industry Mismatch — IMSS pharma capture."
    )

    note_530 = (
        "SEGALMEX/DICONSA grain warehouse monopoly — peninsula capture over 11 years. "
        "No RFC. 16 contracts across Diconsa (10c, 443M), SEGALMEX (2c, 72M), "
        "Alimentacion para el Bienestar (4c, 50M). 75% DA (12/16). 2014-2025. "
        "Contract content: 'Deposito mercantil y servicios conexos' — "
        "commercial grain warehousing for Diconsa/SEGALMEX rural food distribution. "
        "ALMACEN DE GRANOS DE LA PENINSULA (Peninsula Grain Warehouse) captures "
        "Yucatan Peninsula grain storage contracts for the national food program. "
        "The vendor survived the Diconsa→SEGALMEX→Alimentacion para el Bienestar "
        "organizational rebranding (2022) — demonstrating deep institutional capture "
        "that persists across administrative restructuring. "
        "11 consecutive years of DA contracts for the same service at the same "
        "institutional ecosystem is among the most sustained capture patterns in the dataset. "
        + SEGALMEX_CARTEL +
        "Classification: P6 SEGALMEX Peninsula Grain Warehouse Monopoly."
    )

    note_531 = (
        "CONAGUA Valley of Mexico water infrastructure single-bid capture. "
        "9 contracts, 2006-2018, 575M MXN. SB=89% (8/9). "
        "Institutions: CONAGUA (7c, 430M), CAEM (2c, 145M — Estado de Mexico water authority). "
        "Contract content: Dredging lagoons, channel revetment, drain construction — "
        "all in the Valley of Mexico flood control system (Chimalhuacan, Ixtapaluca areas). "
        "The Valley of Mexico (eastern Mexico City metro) is Mexico's most complex water "
        "management zone: massive drain systems prevent flooding of 20M+ population. "
        "EQUIPOS ALMAQ (Equipment Almaq) captures CONAGUA and CAEM single-bid contracts "
        "for this critical infrastructure through a 12-year monopoly. "
        "89% SB rate across 9 contracts at 2 water authorities in the same geographic area "
        "= classic CONAGUA cartel sub-niche allocation. "
        + CONAGUA_CARTEL +
        "Classification: P1/P6 CONAGUA Valley of Mexico Water Infrastructure Capture."
    )

    note_532 = (
        "CONALITEG English textbook direct award monopoly — PRONI/Secundaria program. "
        "No RFC. 171 contracts at CONALITEG (168c, 397M, 99% DA), 2014-2021. "
        "Contract content: English-language textbooks for "
        "'Programa Nacional de Ingles' (PRONI — national English learning program) "
        "and 'Secundaria' (secondary school). "
        "RICHMOND PUBLISHING is the English-language educational publishing brand of "
        "Editorial Santillana/Pearson — the same parent company whose main imprint "
        "is already in GT for CONALITEG 99% DA textbook capture. "
        "The CONALITEG publishing capture ecosystem has been extensively documented: "
        "major publishers receive direct awards for textbooks that should be competitively bid, "
        "justified under exceptions that are routinely abused. "
        "168 consecutive DA contracts at a single agency over 7 years = sustained monopoly. "
        "No RFC despite 405M in contracts suggests deliberate registration avoidance. "
        "Classification: P1 Monopoly — CONALITEG English textbook DA monopoly."
    )

    note_533 = (
        "IMSS pharmaceutical DA capture — 92 contracts in a single year = splitting. "
        "No RFC. 119 contracts, 2017-2025, 422M MXN. DA=98% (117/119). "
        "IMSS: 106 contracts, 318M, DA=99%. IMSS-Bienestar: 5c, 91M, 100% DA. "
        "92 contracts in 2023 alone (vs 14 in 2022, 11 in 2021) = explosive splitting. "
        "Contract content: Medications + 'Interpretacion remota de imagenes medicas' "
        "(remote medical imaging interpretation, IMSS-Bienestar 2024-2025). "
        "MEDIVIDA (Medi-Life) sells medications AND radiology interpretation services — "
        "an unusual combination suggesting the company fills whatever DA needs arise "
        "at IMSS/IMSS-Bienestar rather than having a coherent specialty. "
        "92 medication contracts split in 2023 = threshold splitting to stay below "
        "review thresholds for individual contracts. No RFC. "
        "The 99% DA rate at IMSS specifically (vs competitive bids at SEDENA, INCan) "
        "confirms institution-specific capture, not market monopoly. "
        + IMSS_DA_RING +
        "Classification: P6 IMSS DA Pharmaceutical Capture — splitting + industry mix."
    )

    note_534 = (
        "IMSS new shell pharmaceutical direct award ring — 2023 activation. "
        "RFC: HMS191003I71 (incorporated October 2019). "
        "21 contracts, 2023-2025, 430M MXN. DA=100% (all direct award). "
        "IMSS: 19c, 416M. ISSSTE: 2c, 14M. Zero competitive procedures. "
        "Company incorporated October 2019 — waited 3.5 years until 2023 for first contract, "
        "then immediately won 362M in IMSS DA medication contracts in Year 1. "
        "The 3.5-year dormancy followed by immediate massive DA access is a documented "
        "IMSS capture pattern: shells are registered and kept dormant until an insider "
        "contact opens the DA procurement pipeline. "
        "S de RL de CV structure is often used by smaller shells for reduced transparency. "
        "Largest single contract: 105M DA at IMSS for medications. "
        "100% direct award across all 21 contracts at 2 institutions = zero competitive bids. "
        + IMSS_DA_RING +
        "Classification: P2 Ghost / P6 IMSS Shell DA — new 2019 shell activated 2023."
    )

    cases = [
        (0, [(302054, "SERVICIO DE NANOLIMPIEZA SA DE CV", "high")],
         "SERVICIO DE NANOLIMPIEZA - IPN Cleaning Cartel Shell",
         "procurement_fraud", "high", note_525, 212000000, 2023, 2023),
        (1, [(261919, "DAGER LOGISTICA Y COMERCIO SA DE CV", "high")],
         "DAGER LOGISTICA Y COMERCIO - SEGALMEX DA Cartel Member",
         "procurement_fraud", "high", note_526, 210000000, 2020, 2022),
        (2, [(231401, "GRUPO EMPRESARIAL DE COMERCIO Y SERVICIOS GECS SA DE CV", "high")],
         "GRUPO EMPRESARIAL GECS - IMSS DA Shell + COVID Opportunism",
         "procurement_fraud", "high", note_527, 212000000, 2020, 2023),
        (3, [(154404, "DRAGADOS DESAZOLVES Y CAMINOS", "medium")],
         "DRAGADOS DESAZOLVES Y CAMINOS - CONAGUA Tabasco Dredging Capture",
         "procurement_fraud", "medium", note_528, 215000000, 2015, 2018),
        (4, [(132602, "BIOSISTEMAS Y SEGURIDAD PRIVADA SA DE CV", "high")],
         "BIOSISTEMAS Y SEGURIDAD PRIVADA - IMSS Pharma Industry Mismatch",
         "procurement_fraud", "high", note_529, 471000000, 2022, 2025),
        (5, [(126972, "Almacen de Granos de la Peninsula SA de CV", "high")],
         "ALMACEN DE GRANOS DE LA PENINSULA - SEGALMEX Warehouse Monopoly",
         "procurement_fraud", "high", note_530, 566000000, 2014, 2025),
        (6, [(24389, "EQUIPOS ALMAQ SA DE CV", "medium")],
         "EQUIPOS ALMAQ - CONAGUA Valley of Mexico Water SB Capture",
         "procurement_fraud", "medium", note_531, 575000000, 2006, 2018),
        (7, [(129625, "RICHMOND PUBLISHING SA DE CV", "high")],
         "RICHMOND PUBLISHING - CONALITEG English Textbook DA Monopoly",
         "procurement_fraud", "high", note_532, 405000000, 2014, 2021),
        (8, [(198907, "MEDIVIDA SA DE CV", "high")],
         "MEDIVIDA - IMSS Pharmaceutical DA Capture (422M)",
         "procurement_fraud", "high", note_533, 422000000, 2022, 2025),
        (9, [(296651, "HOSPITALARIO MED SALUS S DE RL DE CV", "high")],
         "HOSPITALARIO MED SALUS - IMSS Shell DA Pharmaceutical Capture",
         "procurement_fraud", "high", note_534, 430000000, 2023, 2025),
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
        1198: (
            "PAVIMENTOS DE QUERETARO SA DE CV: Structure A era data (2002-2009), no RFC. "
            "21c at SCT (18c), ISSSTE, CAPUFE. SB=100% — Structure A SB artifact. "
            "Highway construction + interchange work, geographically coherent (Queretaro/central Mexico). "
            "No DA. Pre-2010 single-bid rate reflects data recording limitations, not actual collusion. "
            "Legitimate regional highway construction firm in Structure A quality zone."
        ),
        10264: (
            "ALTA INGENIERIA 2000 SA DE CV: Structure A era data (2002-2008), no RFC confirmed. "
            "17c at SCT (14c), state infrastructure, Sonora. SB=100% — Structure A SB artifact. "
            "Diverse highway work: terracerias, pavimento, entronques, tunnel in Sonora. "
            "Multi-year (2002-2008), multi-type construction = legitimate regional infrastructure firm. "
            "Structure A SB data artifact. Legitimate Sonora regional highway contractor."
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
        11264: (
            "COMPANIA CONTRATISTA NACIONAL SA DE CV: No RFC. 7c 2003-2006, 696M, SB=100%. "
            "Diverse institutions: CONAGUA (344M desazolve 2006), SCT (178M), Jalisco (78M), "
            "CAPUFE (73M), AICM (15M), CAPFCE (7M). "
            "CONCERN: 344M CONAGUA 'desazolve de rios' single-bid 2006 = possible CONAGUA cartel. "
            "BUT: 6 different institutions is a protective signal for a Structure A era firm. "
            "Investigate: (a) is this CONAGUA contract documented in ASF audits? "
            "(b) does the company still exist and have RFC that links to known actors?"
        ),
        210478: (
            "PRODUCTOS Y EQUIPOS KITFLAT SA DE CV: 87c 2017-2025, 547M. Multi-institutional. "
            "INSABI (8c, 192M, 100% DA), IMSS (4c, 148M, 0% DA), SSA (6c, 112M). "
            "COVID-era spike: 477M of 547M total in 2020-2021. "
            "Protective: 8+ different institutions, competitive wins at IMSS. "
            "Suspicious: 100% DA at INSABI, 92M single COVID DA at SSA 2020. "
            "Investigate: RFC incorporation date relative to COVID. Pre-COVID track record?"
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

    for offset in range(10):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 525-534 inserted.")


if __name__ == "__main__":
    run()
