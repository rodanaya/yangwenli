#!/usr/bin/env python3
"""
GT Mining Batch CCC — ARIA T3 energy sector investigation (4 vendors)

Investigated 2026-03-20:
  v8245   CONSTRUCTORA SUBACUATICA DIAVAZ S.A DE C.V.              → SKIP (legitimate specialized subsea contractor)
  v24907  CONTROL Y MONTAJES INDUSTRIALES DE MEXICO, S.A. DE C.V.   → SKIP (structural energy supply concentration)
  v8393   PROTEXA S.A DE C.V.                                        → SKIP (legitimate pipeline contractor)
  v8180   CONSTRUCCIONES Y EQUIPOS LATINOAMERICANOS, S.A. DE C.V.   → SKIP (mixed institutional pattern, weak evidence)

Cases added: 0  |  Vendors skipped: 4

REASONING:
All four vendors are energy-sector specialists (subsea, pipeline, electrical installation, 
equipment manufacturing) that work primarily with PEMEX subsidiaries and CFE. They show 
100% or near-100% single-bid rates (14, 32, 6, 23 contracts respectively), BUT:

1. Procurement is through COMPETITIVE procedures (not direct awards) — suggests no DA loopholes
2. All are known/legitimate Mexican companies (DIAVAZ = marine specialist, PROTEXA = 
   infrastructure/pipeline firm, etc.)
3. Historical contracts are from 2002-2016 (low RFC coverage period: 0.1-15.7%)
4. SB + concentration pattern could reflect legitimate specialization (subsea work, 
   high-voltage installation, etc.) with naturally limited bidder pools
5. No corroborating evidence (news, audit findings, RFC inconsistencies, shell company indicators)
6. Similar legitimate multinationals (Schlumberger, Baker Hughes) also show high PEMEX SB rates 
   due to technical specialization

DECISION: Insufficient evidence for GT addition. Mark as reviewed/FP.
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 828:
        print(f"ERROR: max_id={max_id}, expected >= 828. Aborting.")
        conn.close()
        return

    print(f"Max GT case id: {max_id}")
    print("All 4 vendors reviewed: marking as FP (insufficient evidence for GT)\n")

    # v8245 - DIAVAZ
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: CONSTRUCTORA SUBACUATICA DIAVAZ — legitimate Mexican subsea/marine contractor. 14 contracts (2002-2010, 3.58B MXN) exclusively at PEMEX Exploracion y Produccion, 100% SB. However: (1) DIAVAZ is known specialized firm; (2) subsea work has naturally limited bidder pool; (3) no DA used (competitive procedures only); (4) old data period (0.1% RFC coverage) limits data quality; (5) pattern consistent with legitimate specialized supplier. No audit/news evidence of corruption. IPS=0.281 (low signal). SKIP.'
        WHERE vendor_id=?""",
        (8245,),
    )
    print("  v8245 DIAVAZ: SKIP (legitimate subsea contractor, 100% SB to PEMEX due to specialization)")

    # v24907 - CONTROL Y MONTAJES
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: CONTROL Y MONTAJES INDUSTRIALES DE MEXICO — electrical/industrial installation company. 32 contracts (2006-2016, 3.09B MXN), 100% SB, 84% concentrated at CFE (27 contracts, 2.93B). While concentration is high, consider: (1) all through competitive procedures (0% DA); (2) specialized industrial equipment/installation services (high-voltage, switchgear, controls) have naturally limited qualified bidders for CFE infrastructure; (3) low IPS (0.192); (4) no news/audit evidence; (5) CFE has legitimate structural need for specialized contractors. Without corroborating evidence, cannot classify as capture. SKIP.'
        WHERE vendor_id=?""",
        (24907,),
    )
    print("  v24907 CONTROL Y MONTAJES: SKIP (84% CFE but legitimate industrial installation specialist)")

    # v8393 - PROTEXA
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: PROTEXA S.A DE C.V. — known Mexican pipeline/infrastructure firm. 6 contracts (2002-2008, 3.10B MXN), 100% SB to PEMEX Exploracion y Produccion. Only 6 contracts but high average value (517M). Considerations: (1) pipeline/pressure equipment has specialized engineer/technical requirements; (2) small contract count suggests selective use, not systemic capture; (3) legitimate multinational pattern (similar to Weatherford, Halliburton for PEMEX); (4) no DA; (5) old data (2002-2008, 0.1% RFC coverage). Pattern is within legitimate specialization bounds. SKIP.'
        WHERE vendor_id=?""",
        (8393,),
    )
    print("  v8393 PROTEXA: SKIP (legitimate pipeline contractor, small contract count)")

    # v8180 - CONSTRUCCIONES Y EQUIPOS
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: CONSTRUCCIONES Y EQUIPOS LATINOAMERICANOS — industrial/construction equipment company. 23 contracts (2002-2010, 2.37B MXN), 82% SB, 82% concentrated at PEMEX Exploracion y Produccion (19 contracts, 2.29B MXN, 100% SB on those). Mixed pattern: (1) won some competitive bids at other PEMEX subsidiary (PEMEX Refinacion, 0% SB on those 3 contracts) and one at SADM water utility; (2) suggests not total monopoly, can compete elsewhere; (3) specialization in industrial equipment/construction may explain PEMEX concentration; (4) no DA; (5) old period. IPS=0.293 (borderline). Pattern consistent with specialized supplier concentration rather than systematic capture. SKIP.'
        WHERE vendor_id=?""",
        (8180,),
    )
    print("  v8180 CONSTRUCCIONES Y EQUIPOS: SKIP (mixed institutional pattern, can compete at other agencies)")

    conn.commit()
    conn.close()

    print(f"\nDone. Reviewed 4 vendors, marked all as reviewed/FP.")
    print("No cases added to GT. All marked as insufficient evidence for corruption classification.")


if __name__ == "__main__":
    main()
