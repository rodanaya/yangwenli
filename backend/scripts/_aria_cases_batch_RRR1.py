#!/usr/bin/env python3
"""
GT Mining Batch RRR1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v158910  TECNOLOGIA EN SEGURIDAD PRIVADA SSI  ADD  (AICM 99.5%, 1172M airport security SB/DA)
  v37190   CLINIC AND WORK LINE SA DE CV        ADD  (COFEPRIS 98.6%, 349M in 2 contracts)
  v138828  CIFO TECHNOLOGIES SA DE CV           ADD  (FONACOT 64%+QRO 19%=83%, 100% DA, 263M)
  v25396   PROYECCION Y ADMINISTRACION EMPR.    ADD  (COMESA/PEMEX 69.4% SB + CIATEQ 9.3%, 879M)
  v799     PRODUCTOS Y SERVICIOS DEL NOROESTE   SKIP (dispersed 116 ctrs, top=19%)
  v40934   BIOABAST SA DE CV                    SKIP (163 ctrs ISSSTE 34%+IMSS 27%, dispersed)

Cases added: 4  |  Vendors skipped: 2
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 952:
        print(f"ERROR: max_id={max_id}, expected >= 952. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3
    c4 = max_id + 4

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c4}")

    sql_case = (
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, year_start, year_end, "
        "confidence_level, estimated_fraud_mxn, source_news, notes) "
        "VALUES (?,?,?,?,?,?,?,?,?,?)"
    )
    sql_vendor = (
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, role, evidence_strength, "
        "match_method, match_confidence, notes) VALUES (?,?,?,?,?,?,?,?)"
    )

    # Case 1: TECNOLOGIA SSI - AICM airport security capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Mexico City Airport Security Single-Bid and DA Capture - Tecnologia SSI",
        "institutional_capture", 2015, 2021, "high", 1_172_000_000,
        "ARIA T3 queue pattern analysis",
        "TECNOLOGIA EN SEGURIDAD PRIVADA SSI SA DE CV (v158910): 11 contracts, 1178M total. "
        "Aeropuerto Internacional de la Ciudad de Mexico (AICM): "
        "5 contracts, 1172M (99.5%), DA=40%, SB=60% (2015-2021). "
        "Private security technology company with near-total concentration (99.5%) "
        "at Mexico City's international airport — Latin America's busiest airport. "
        "1172M in 5 contracts across 7 years via mixed SB and DA methods. "
        "Each contract averages 234M for security services/technology. "
        "Exclusive supply relationship at critical national infrastructure (airport).",
    ))
    conn.execute(sql_vendor, (
        c1, 158910, "TECNOLOGIA EN SEGURIDAD PRIVADA SSI SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "AICM 99.5%: 5 contracts 1172M, 60% SB + 40% DA 2015-2021",
    ))

    # Case 2: CLINIC AND WORK LINE - COFEPRIS health regulator capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "COFEPRIS Health Regulator Direct Award Capture - Clinic and Work Line",
        "institutional_capture", 2015, 2015, "high", 349_000_000,
        "ARIA T3 queue pattern analysis",
        "CLINIC AND WORK LINE SA DE CV (v37190): 21 contracts, 354M total. "
        "COFEPRIS (Comision Federal para la Proteccion contra Riesgos Sanitarios): "
        "2 contracts, 349M (98.6%), DA=50% (2015). "
        "Medical/clinical services company with 98.6% concentration at Mexico's "
        "federal health safety regulator (Mexican equivalent of the FDA) in a "
        "single year. Two large contracts totaling 349M at COFEPRIS in 2015, "
        "one via direct award. Health regulatory agency capture via concentrated "
        "contract awards to a single services provider.",
    ))
    conn.execute(sql_vendor, (
        c2, 37190, "CLINIC AND WORK LINE, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "COFEPRIS 98.6%: 2 contracts 349M, 50% DA in 2015",
    ))

    # Case 3: CIFO TECHNOLOGIES - FONACOT workers fund IT DA capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "FONACOT Workers Fund IT Direct Award Capture - CIFO Technologies",
        "institutional_capture", 2015, 2019, "high", 218_000_000,
        "ARIA T3 queue pattern analysis",
        "CIFO TECHNOLOGIES SA DE CV (v138828): 5 contracts, 263M total. "
        "FONACOT (Instituto del Fondo Nacional para el Consumo de los Trabajadores): "
        "1 contract, 168M DA (2015) = 63.9%. "
        "QRO-Instituto Queretano del Transporte: 50M DA (2017) = 19%. "
        "Gobierno del Estado de Oaxaca: 24M SB (2019) = 9.1%. "
        "Combined FONACOT + QRO Transport = 218M (82.9%), 100% DA at federal entities. "
        "IT company with direct award capture at Mexico's worker consumption fund, "
        "a financial institution serving 14M registered workers. "
        "Single 168M DA at FONACOT represents a major procurement irregularity.",
    ))
    conn.execute(sql_vendor, (
        c3, 138828, "CIFO TECHNOLOGIES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "FONACOT 63.9% DA + QRO 19% = 83%, 168M single DA 2015",
    ))

    # Case 4: PROYECCION Y ADMINISTRACION - COMESA/PEMEX administrative SB
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "PEMEX Exploration Subsidiary Administrative SB Capture - Proyeccion y Administracion",
        "single_bid_capture", 2006, 2010, "high", 692_000_000,
        "ARIA T3 queue pattern analysis",
        "PROYECCION Y ADMINISTRACION EMPRESARIAL SA DE CV (v25396): 12 contracts, 879M total. "
        "58.3% single-bid rate. COMESA (Compania Mexicana de Exploraciones SA): "
        "2 contracts, 610M SB (69.4%), 2006-2007. "
        "CIATEQ (Centro de Tecnologia Avanzada): 82M SB (9.3%). "
        "Combined COMESA + CIATEQ = 692M (78.7%). "
        "COMESA is a PEMEX exploration subsidiary. Administrative/business services "
        "company capturing PEMEX oil exploration subsidiary contracts via SB tenders "
        "alongside research center contracts (CIATEQ, CIATEC). "
        "610M to an administrative firm at PEMEX exploration subsidiary is anomalous.",
    ))
    conn.execute(sql_vendor, (
        c4, 25396, "PROYECCION Y ADMINISTRACION EMPRESARIAL SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "COMESA/PEMEX 69.4% SB + CIATEQ 9.3% = 78.7%, 610M SB 2006-2007",
    ))

    # Link contracts
    links = [
        (c1, 158910, 2015, 2021),
        (c2, 37190, 2015, 2015),
        (c3, 138828, 2015, 2019),
        (c4, 25396, 2006, 2010),
    ]
    total_linked = 0
    for case_id, vendor_id, yr_start, yr_end in links:
        rows = conn.execute(
            "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
            (vendor_id, yr_start, yr_end),
        ).fetchall()
        for (cid,) in rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (case_id, cid),
            )
        total_linked += len(rows)
        print(f"  Case {case_id} (v{vendor_id}): linked {len(rows)} contracts ({yr_start}-{yr_end})")

    for vid in [158910, 37190, 138828, 25396]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (799, "Dispersed multi-sector (Productos y Servicios del Noroeste), 116 contracts top=19%"),
        (40934, "Bioabast - 163 contracts dispersed ISSSTE 34%+IMSS 27%, health supply not concentrated enough"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 4 cases ({c1}-{c4}), linked {total_linked} contracts, skipped 2.")


if __name__ == "__main__":
    main()
