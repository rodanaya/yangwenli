import sqlite3, sys, os

DB = r"D:\Python\yangwenli\backend\RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id != 1381:
    print(f"ABORT: expected max_id=1381, got {max_id}.")
    sys.exit(1)
print(f"Max GT case id: {max_id}; inserting 1382-1387")

CASES = [
    (25407,  "MEDIA DIRECTA CPTM Tourism Media Fraud",
             "procurement_fraud", 2006, 2006, "confirmed_corrupt", 257_000_000,
             "SFP sanction 2007-08-28 SANCIONATORIA CON MULTA E INHABILITACION",
             None,
             "SFP-sanctioned vendor. Single 257M LP contract at Consejo de Promocion Turistica de Mexico 2006-07-13. 100% single-bid."),
    (169475, "VERIDOS MEXICO SRE Passport Booklet Capture",
             "institutional_capture", 2015, 2019, "high", 1_330_000_000,
             None,
             "SRE passport e-booklet contract with Bundesdruckerei-Giesecke+Devrient JV",
             "SRE 1285M LP 2015 + 7 DA follow-ups SHCP/SRE 2017-2019 for renewals (100% DA). Top_inst=SRE 0.75. Pattern P3 intermediary."),
    (10105,  "CONSTRUCTORA TORREBLANCA SCT-CAPUFE 16yr Single-Bid Capture",
             "single_bid_capture", 2002, 2018, "high", 1_511_500_000,
             None, None,
             "50 of 50 single-bid (100%) at SCT 676M + CICA 525M + CAPUFE 204M over 16 years. Cobidding shared procedure with GRUPO ASFALTOS PROCESADOS (vid=1120). Cover-bid ring pattern."),
    (1120,   "GRUPO ASFALTOS PROCESADOS SCT-CAPUFE Asphalt Bid Ring",
             "bid_rigging", 2002, 2020, "high", 989_800_000,
             None, None,
             "47 of 52 single-bid (90%) at CAPUFE 513M + SCT 476M over 18 years. Co-bids with TORREBLANCA vid=10105 on shared procedure; 10 total cobidders each with single appearance (cover-bidders). Fits SCT asphalt ring pattern (cases 501 640 921 1028 1359)."),
    (58832,  "ARRENDAMIENTO RENOVACION Y COMERCIALIZACION TLAX-Obras Capture",
             "single_bid_capture", 2012, 2016, "high", 212_600_000,
             None, None,
             "16 of 16 single-bid LP (100%), 76% captive to TLAX-Secretaria de Obras Publicas 211M n=11 during Marin era 2012-2016. Pattern P5 concentration."),
    (144302, "NEGOCIOS OPTIMUS JUMACE EPN-Era Agency Rotation",
             "procurement_fraud", 2014, 2017, "medium", 368_000_000,
             None, None,
             "Rotation across SRE 114M DA, Economia 81M DA, ProMexico 65M LP, CEAV 57M DA, CONAVI 51M LP - 5 EPN-era federal agencies 2014-2017. 4 of 8 direct-award, 100% DA for high-value. Agency-hopping consistent with Estafa Maestra pattern."),
]

SKIPS = [
    (89259,  "Single contract Financiera Rural 2012 - insufficient evidence"),
    (71613,  "ZLB UNIVERSAL 2 contracts 2011 Financiera Rural/SAE - no corroboration"),
    (19222,  "SOLUCIONES PEARSON likely Pearson Education brand SAT 2005-2006"),
    (265553, "GREEN ROBOT SAT-verified RFC 12 diverse cobidders only 3 contracts"),
    (23996,  "SWISS RE CAPITAL legitimate global reinsurer SHCP hedging"),
    (23695,  "FILTROS AZTLAN municipal water-filter single instance 2005-2006"),
    (250597, "TELECOMUNICACIONES DE MEXICO state-owned TELECOMM-Telegrafos"),
    (204738, "SACYR ALVARGA hospital concession 2008 single instance"),
    (307710, "SOCIEDAD HIPOTECARIA FEDERAL state development bank"),
    (37126,  "FTAPIAS Structure A 2002 single contract data noise"),
    (236547, "DEINASVEL SL foreign import single contract"),
    (239655, "COOPERATIVA LECHERA MLEKOVITA Polish dairy import single contract"),
    (8354,   "CONSTRUCTORA BAY PEMEX 2002 Structure A unreliable data period"),
]

conn.execute("BEGIN TRANSACTION")
try:
    total_contracts = 0
    for i, case in enumerate(CASES):
        vid, cname, ctype, yr_s, yr_e, conf, fraud_est, src_legal, src_news, notes = case
        case_id_num = max_id + 1 + i
        case_id_str = f"CASE-{case_id_num}"

        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
              (id, case_id, case_name, case_type, year_start, year_end, fraud_year_start, fraud_year_end,
               confidence_level, estimated_fraud_mxn, source_legal, source_news, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (case_id_num, case_id_str, cname, ctype, yr_s, yr_e, yr_s, yr_e,
              conf, fraud_est, src_legal, src_news, notes))

        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
              (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?, ?, ?, ?, 'aria_t3_mining')
        """, (case_id_num, vid, cname.split()[0], conf))

        rows = conn.execute("""
            SELECT id FROM contracts
            WHERE vendor_id=? AND amount_mxn > 0
              AND CAST(strftime('%Y', contract_date) AS INTEGER) BETWEEN ? AND ?
        """, (vid, yr_s, yr_e)).fetchall()
        for (ctr_id,) in rows:
            conn.execute("""
                INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id, evidence_strength, match_method)
                VALUES (?, ?, ?, 'aria_t3_mining')
            """, (case_id_num, ctr_id, conf))
        total_contracts += len(rows)
        print(f"  Case {case_id_num} v{vid} [{conf}]: linked {len(rows)} contracts ({yr_s}-{yr_e}) ${fraud_est/1e6:.0f}M")

    for i, case in enumerate(CASES):
        conn.execute("UPDATE aria_queue SET review_status='reviewed', reviewer_notes=?, in_ground_truth=1 WHERE vendor_id=?",
                     (f"GT:{max_id+1+i}", case[0]))

    for vid, reason in SKIPS:
        conn.execute("UPDATE aria_queue SET review_status='reviewed', reviewer_notes=? WHERE vendor_id=?",
                     (f"SKIP: {reason[:100]}", vid))
        print(f"  v{vid}: SKIP - {reason[:70]}")

    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    case_count = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    vendor_count = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    conn.execute("COMMIT")

    total_fraud = sum(c[6] for c in CASES)
    print(f"\n=== BATCH COMPLETE ===")
    print(f"Inserted {len(CASES)} cases (max_id {max_id} -> {new_max})")
    print(f"Linked {total_contracts} contracts")
    print(f"Skipped {len(SKIPS)} vendors")
    print(f"Total estimated fraud: ${total_fraud/1e9:.2f}B MXN")
    print(f"DB totals: {case_count} cases, {vendor_count} vendors")

except Exception as e:
    conn.execute("ROLLBACK")
    print(f"ERROR: {e}")
    raise
finally:
    conn.close()
