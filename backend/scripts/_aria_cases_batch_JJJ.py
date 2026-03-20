#!/usr/bin/env python3
"""
GT Mining Batch JJJ — ARIA T2 investigation (3 vendors)

Investigated 2026-03-20:
  v8137    MEXICO DRILLING LIMITED L.L.C.            -> SKIP (legitimate PEMEX drilling contractor, 2002-2006, competitive bids, pre-2010 era)
  v21398   GOIMAR S.A. DE C.V.                        -> SKIP (legitimate PEMEX supplier 2005-2009, P3 pattern unconfirmed, no DA/structural flags)
  v109268  METALURGICA MET-MEX PEÑOLES S.A. DE C.V.  -> SKIP (Grupo Peñoles = structural monopoly, exclusive precious metals supplier to Casa de Moneda)

Cases added: 0  |  Vendors skipped: 3
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 882:
        print(f"ERROR: max_id={max_id}, expected >= 882. Aborting.")
        conn.close()
        return

    # All three vendors fail criteria for GT inclusion
    # 1. v8137 (MEXICO DRILLING): Pre-2010 legacy PEMEX contractor
    #    - 14 contracts, 2002-2006, all competitive bids (0% DA)
    #    - No RFC (Structure A data, 0.1% coverage)
    #    - PEMEX EXPLORACION Y PRODUCCION specialized drilling
    #    - 43% SB rate but legitimate for era/institution
    #    - P6 pattern = false positive on legacy data
    # DECISION: SKIP - Legitimate specialized contractor, no corruption signal beyond pattern

    print("BATCH JJJ ASSESSMENT")
    print("=" * 80)
    print("\n1. MEXICO DRILLING LIMITED L.L.C. (v8137)")
    print("   Contracts: 14 | Value: 6.0B MXN | Years: 2002-2006")
    print("   Institution: PEMEX EXPLORACIÓN Y PRODUCCIÓN (all)")
    print("   Procedure: Licitación Pública (100% competitive, 0% DA)")
    print("   Single Bid Rate: 43% (but only 14 contracts, legacy era)")
    print("   RFC: None (Structure A data, 2002-2006)")
    print("   Assessment: Legitimate PEMEX drilling contractor")
    print("   Decision: SKIP - Specialized contractor, no DA/concentration signal")

    print("\n2. GOIMAR S.A. DE C.V. (v21398)")
    print("   Contracts: 8 | Value: 3.18B MXN | Years: 2005-2009")
    print("   Institution: PEMEX EXPLORACIÓN Y PRODUCCIÓN (all)")
    print("   Procedure: Licitación Pública (100% competitive, 0% DA)")
    print("   Single Bid Rate: 62% (but only 8 contracts, early period)")
    print("   RFC: None (Structure A data)")
    print("   Pattern: P3 Intermediary (unconfirmed by other signals)")
    print("   Assessment: Real PEMEX supplier 2005-2009, no evidence of shell status")
    print("   Decision: SKIP - P3 pattern alone insufficient, no DA or concentration")

    print("\n3. METALURGICA MET-MEX PEÑOLES S.A. DE C.V. (v109268)")
    print("   Contracts: 22 | Value: 2.66B MXN | Years: 2013-2025")
    print("   Institution: CASA DE MONEDA DE MÉXICO (95%)")
    print("   Procedure: Adjudicación Directa (95% DA in Casa de Moneda)")
    print("   Assessment: Grupo Peñoles = Mexico's 2nd-largest mining company")
    print("   - Sole legitimate supplier of precious metals to Casa de Moneda")
    print("   - Structural monopoly (no competition for precious metals)")
    print("   - DA justified by exclusive supplier status")
    print("   Decision: SKIP - Structural specialization (NOT corruption)")

    # Update ARIA queue to mark as reviewed/skipped
    skip_vendors = [8137, 21398, 109268]
    skip_notes = {
        8137: "PEMEX legacy contractor 2002-2006. Competitive bids, no DA, no RFC era. Legitimate specialist.",
        21398: "PEMEX supplier 2005-2009. P3 pattern unconfirmed. No DA, no concentration. Legitimate.",
        109268: "Grupo Penoles = structural precious metals monopoly for Casa de Moneda. DA justified. NOT corruption."
    }

    for vid in skip_vendors:
        conn.execute(
            """
            UPDATE aria_queue
            SET review_status = 'skipped',
                in_ground_truth = 0,
                reviewer_notes = ?
            WHERE vendor_id = ?
            """,
            (skip_notes[vid], vid)
        )

    conn.commit()
    print("\n" + "=" * 80)
    print("RESULT: 0 cases added, 3 vendors marked skipped")
    print("=" * 80)

    conn.close()


if __name__ == "__main__":
    main()
