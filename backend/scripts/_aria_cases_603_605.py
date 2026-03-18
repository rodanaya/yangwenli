"""
ARIA Cases 603-605: March 17 2026 investigation session.

Cases:
  603: SEPIVER SA DE CV - Infrastructure Monopoly at INDEP + Ports 3.4B (53% SB)
  604: ECL GLOBAL GROUP NETWORK - Shell Company Network FONACOT+STPS 521M DA 2016-2017
  605: DESHIDRATADOS ALIMENTICIOS E INDUSTRIALES - Diconsa Food Capture 98% DA 234M

Run from backend/ directory.
"""

# Cases:
# CASE-603: VID 139838 SEPIVER SA DE CV
#   - 3.401B over 12 years: 1.0B at INDEP (Instituto para Devolver al Pueblo lo Robado,
#     risk=1.00), 478.5M at ASIPONA Dos, 313.7M at ASIPONA Ensenada, 286.1M at ASIPONA
#     Veracruz, 245.5M at ASA (airports). 53% single-bid rate. No RFC.
#   - INDEP manages confiscated/recovered federal assets — a major fraud risk institution.
#     Three contracts totaling 1.0B at INDEP (437.2M + 292.5M + 270.9M) all with risk=1.00.
#     Pattern: large infrastructure company with exclusive access to opaque government agencies
#     (port authorities, asset recovery institute, airports) via licitación pública single-bid.

# CASE-604: VIDs 192096 + 199576 - ECL GLOBAL GROUP NETWORK
#   - TECNOLOGIA ECL GLOBAL GROUP (VID 192096): 181.9M + 179.6M = 361.5M DA at FONACOT
#     (Instituto del Fondo Nacional para el Consumo de los Trabajadores) in 2016-2017
#   - ECL CONSULTORES GLOBAL GROUP ASSURANCE (VID 199576): 160.3M DA at STPS 2017
#   - Two entities with identical "ECL Global Group" branding, both using 100% direct award,
#     both appearing only in 2016-2017 window, capturing two related labor-sector institutions
#     (FONACOT = consumer credit for workers; STPS = Labor Ministry). P2 Ghost network.
#   - FONACOT and STPS are under the same federal "trabajo" sector umbrella — institutional
#     capture via related shell entities is a documented AMLO-era pattern.

# CASE-605: VID 38535 DESHIDRATADOS ALIMENTICIOS E INDUSTRIALES SA DE CV
#   - 234.2M, 49 contracts, 98% DA, 98% at one institution (Diconsa SA de CV), agricultura.
#   - Exclusively supplying dehydrated/processed foods to Diconsa via direct award 2010-2019.
#   - Diconsa is the rural food distribution parastatal at the center of the Segalmex scandal.
#     A 9-year single-institution capture with 98% DA rate is textbook P6 institutional fraud.
#   - Top contracts: 50M DA 2013, 25.9M DA 2014, 22.1M DA 2012 — all Diconsa, all DA.

# FPs (all structural monopoly):
# 154901 PROVEEDORA MARCEL INTERNACIONAL (SEDENA specialized defense supplier)
# 63849 DELOITTE CONSULTING GROUP (global consulting, legitimate)
# 32800 AXTEL (major Mexican telecom company, legitimate)
# 231130 AVACOR (SEDENA military equipment supplier, clearance required)

# Needs review:
# 69248, 7116, 1627, 50050, 12390, 136205, 50116, 219239,
# 252707, 105073, 71360, 267280, 137145, 20202, 44568, 30446

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_603 = (
        "SEPIVER SA DE CV — 3.4B infrastructure monopoly over 12 years, 53% single-bid rate. "
        "Key clients: INDEP (1.0B, risk=1.00, 3 contracts for seized-asset management institute), "
        "ASIPONA Dos 478.5M, ASIPONA Ensenada 313.7M, ASIPONA Veracruz 286.1M, ASA 245.5M. "
        "INDEP (Instituto para Devolver al Pueblo lo Robado) manages confiscated assets and is "
        "a high-risk institution. Single-bid licitaciones públicas across port authorities and "
        "INDEP suggest exclusive access arrangements. No RFC registered."
    )

    note_604 = (
        "ECL Global Group shell network: TECNOLOGIA ECL GLOBAL GROUP (VID 192096) wins 361.5M "
        "DA at FONACOT (181.9M+179.6M, 2016-2017) and ECL CONSULTORES GLOBAL GROUP ASSURANCE "
        "(VID 199576) wins 160.3M DA at STPS 2017. Two identically branded entities with shared "
        "'ECL Global Group' identity capture two affiliated labor-sector institutions via 100% DA. "
        "Both appear exclusively in 2016-2017 window then disappear. FONACOT (worker consumer "
        "credit) and STPS (Labor Ministry) are functionally linked institutions. P2 Ghost + "
        "related-entity capture. Total: 521.8M. No RFC on either entity."
    )

    note_605 = (
        "DESHIDRATADOS ALIMENTICIOS E INDUSTRIALES — 9-year exclusive Diconsa supplier: 49 "
        "contracts, 234.2M, 98% DA, 98% at Diconsa SA de CV (rural food parastatal). Top: "
        "50M DA 2013, 25.9M DA 2014, 22.1M DA 2012. Diconsa is the distribution arm of LICONSA "
        "and central to the Segalmex procurement fraud ecosystem. Textbook P6 institutional "
        "capture: dehydrated food supplier with single-institution total dependency and no "
        "competitive bidding across entire operating history 2010-2019."
    )

    cases = [
        (0, [(139838, "SEPIVER SA DE CV", "high")],
         "SEPIVER - Infrastructure Monopoly INDEP+Ports 3.4B (53% SB)",
         "procurement_fraud", "high", note_603, 3401500000, 2011, 2023),

        (1, [(192096, "TECNOLOGIA ECL GLOBAL GROUP S.A. DE C.V.", "high"),
             (199576, "ECL CONSULTORES, GLOBAL GROUP ASSURANCE SA DE CV", "high")],
         "ECL GLOBAL GROUP NETWORK - FONACOT+STPS Shell Capture 521.8M DA (2016-2017)",
         "ghost_company", "high", note_604, 521800000, 2016, 2017),

        (2, [(38535, "DESHIDRATADOS ALIMENTICIOS E INDUSTRIALES, S.A. DE C.V.", "high")],
         "DESHIDRATADOS ALIMENTICIOS - Diconsa Food Capture 234M 98% DA (2010-2019)",
         "procurement_fraud", "high", note_605, 234200000, 2010, 2019),
    ]

    for (offset, vendors, cname, ctype, conf, notes, fraud, yr1, yr2) in cases:
        case_id_int = next_id + offset
        case_id_str = f"CASE-{case_id_int}"
        conn.execute("""
            INSERT OR REPLACE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (case_id_int, case_id_str, cname, ctype, conf, notes, fraud, yr1, yr2))
        print(f"Inserted case {case_id_int}: {cname[:65]}")

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
            """, (notes[:500], vid))
            n_contracts = len(rows)
            print(f"  Tagged {n_contracts} contracts for vendor {vid} ({vname[:55]})")

    conn.commit()

    # FPs: structural monopolies
    fp_structural = [
        154901,   # PROVEEDORA MARCEL INTERNACIONAL (SEDENA defense supplier)
        63849,    # DELOITTE CONSULTING GROUP (major global consulting firm)
        32800,    # AXTEL (major Mexican telecom operator)
        231130,   # AVACOR (SEDENA/GN military equipment, clearance required)
    ]
    for vid in fp_structural:
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='fp_excluded'
            WHERE vendor_id=?
        """, (vid,))
    conn.commit()
    print(f"Marked {len(fp_structural)} FPs (structural_monopoly)")

    # Needs review
    needs_review = [
        69248,    # EDUARDO SERNA ROBLES (persona física 4.3B port - may be data issue)
        7116,     # CONSORCIO PAPELERO (stationery 782M 91% DA, investigate further)
        1627,     # EXTINGUE IRAPUATO (370M IMSS LP single-bid 2007 - investigate)
        50050,    # ARMSTRONG INTELLECTUAL CAPITAL SOLUTIONS (hacienda consulting)
        12390,    # GLOBAL TELECOMUNICATION GROUP (salud IT)
        136205,   # MERR INFORMATICA (hacienda IT 50% DA)
        50116,    # CONSTRUCCION Y CONSERVACION DE OBRAS (infra 96% SB)
        219239,   # GRUPO EMPRESARIAL GRECOPA (salud P3 100% DA)
        252707,   # PROYECTOS Y ASESORIAS ROAL (salud 100% SB)
        105073,   # OPERADORA GAS PREMIUM (salud gas 48% DA)
        71360,    # ADOLFO TREJO CASTORENA (persona física infra 431M)
        267280,   # AQUASEO (salud water P3 564M)
        137145,   # APP WHERE (hacienda IT 50% DA)
        20202,    # DISENOS Y CONFECCIONES OLIVIA (salud clothing mismatch)
        44568,    # FUMIGACIONES Y LIMPIEZA INTEGRAL (infra cleaning)
        30446,    # CASANOVA CHAPULTEPEC (trabajo 523M 23% SB)
    ]
    for vid in needs_review:
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review'
            WHERE vendor_id=? AND review_status='pending'
        """, (vid,))
    conn.commit()
    print(f"Marked {len(needs_review)} needs_review")

    # Verify
    print("\n--- VERIFICATION ---")
    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    n_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    n_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {max_id} | GT vendors: {n_vendors} | GT contracts: {n_contracts}")
    for row in conn.execute(
        "SELECT gtc.id, gtc.case_id, gtc.case_name, COUNT(DISTINCT gtv.vendor_id), COUNT(gcon.contract_id) "
        "FROM ground_truth_cases gtc "
        "LEFT JOIN ground_truth_vendors gtv ON gtc.case_id=gtv.case_id "
        "LEFT JOIN ground_truth_contracts gcon ON gtc.case_id=gcon.case_id "
        f"WHERE gtc.id >= {next_id} "
        "GROUP BY gtc.id"
    ).fetchall():
        print(f"  {row[1]}: {row[2][:65]} | {row[3]}v | {row[4]}c")

    conn.close()
    print(f"\nDone. Cases 603-605 inserted.")


if __name__ == "__main__":
    run()
