"""GT Batch I — T2 vendors with web evidence signals.
Investigated 5 T2 candidates; 2 ADDs, 1 SKIP WEAK, 2 SKIP FP.

ADDs:
  CASE-1423: MATERIALES Y CONSTRUCCIONES VILLA DE AGUAYO (vendor 10179)
             - Tamaulipas SCT/SOPDUE single-bid capture 2002-2010
             - 28/28 contracts is_single_bid=1, USD 1.35B MXN
             - Period aligns with Yarrington / E. Hernandez administrations
  CASE-1424: SERVICIOS ESPECIALIZADOS DE INVESTIGACION Y CUSTODIA (vendor 98356)
             - AMLO-era security/custody contractor
             - 703M at Instituto Devolver Pueblo Robado (2019-2020)
             - 770M at Banco del Bienestar (2020-2022)
             - 120M FGR cluster (2020-2022) same-day bursts
             - Cross-references CASE-743, 762, 709

SKIPs:
  v35776 QUADRUM — WEAK: diversified across 5+ institutions, generic web hit
  v22164 TECNICAS REUNIDAS — FP: Spanish engineering giant, legit PEMEX LP
  v9045  ICA FLUOR — FP: legitimate ICA-Fluor JV (US Fluor Corp partner),
                     all major contracts via Licitacion Publica
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
cur = conn.cursor()

cur.execute("SELECT MAX(id) FROM ground_truth_cases")
max_id_before = cur.fetchone()[0]
print(f"Max case id before: {max_id_before}")
assert max_id_before == 1422, f"Expected max_id=1422, got {max_id_before}"

case_1423 = {
    "id": 1423,
    "case_id": "CASE-1423",
    "case_name": "MATERIALES Y CONSTRUCCIONES VILLA DE AGUAYO Tamaulipas SCT/SOPDUE SB",
    "case_type": "single_bid_capture",
    "year_start": 2002,
    "year_end": 2010,
    "estimated_fraud_mxn": 1_349_000_000,
    "confidence_level": "medium",
    "notes": (
        "Tamaulipas construction vendor. 28/28 contracts flagged is_single_bid=1 "
        "(competitive Licitacion Publica but only 1 bidder per procedure). "
        "Concentrated at Tamaulipas SOPDUE/SDUE (702M) and federal SCT (436M), "
        "plus API Altamira (169M). Total 1.35B MXN over 2002-2010. "
        "Period aligns with Yarrington (1999-2005) and Eugenio Hernandez (2005-2011) "
        "administrations — both indicted (drug money / embezzlement). "
        "ARIA P2 Ghost pattern, IPS=0.761, web_evidence SHELL_SIGNAL. "
        "GT Batch I (May 15 2026)."
    ),
    "fraud_year_start": 2002,
    "fraud_year_end": 2010,
    "fraud_contract_types": "obra_publica",
    "label_scope_notes": "Window 2002-2010 covers full vendor activity at Tamaulipas state institutions and federal SCT.",
    "case_origin": "analyst_mining",
}

case_1424 = {
    "id": 1424,
    "case_id": "CASE-1424",
    "case_name": "SERVICIOS ESPECIALIZADOS DE INVESTIGACION Y CUSTODIA Banco Bienestar/IDPLR/FGR Multi-Inst Capture",
    "case_type": "institutional_capture",
    "year_start": 2019,
    "year_end": 2024,
    "estimated_fraud_mxn": 1_700_000_000,
    "confidence_level": "medium",
    "notes": (
        "Security/custody contractor with 3.6B MXN total over 2011-2024 (150 contracts). "
        "AMLO-era acceleration: 703M at Instituto para Devolver al Pueblo lo Robado "
        "(2019-2020), 770M at Banco del Bienestar (2020-2022). 120M FGR cluster "
        "(2020-2022) with same-day multi-contract bursts (Apr 14, 15, 20 2022). "
        "IMSS, INBAL, SAE additional flagship-institution presence. 36 contracts "
        "flagged is_single_bid=1. ARIA P5 pattern, IPS=0.65, web_evidence "
        "CORRUPTION_MENTION. Cross-references existing FGR/security cluster "
        "(CASE-743 IVG, CASE-762 Custodia Veilleur, CASE-709 Mitamex). "
        "GT Batch I (May 15 2026)."
    ),
    "fraud_year_start": 2019,
    "fraud_year_end": 2024,
    "fraud_contract_types": "servicios_seguridad_custodia",
    "label_scope_notes": "Window 2019-2024 captures AMLO-era flagship institution capture (IDPLR, Banco Bienestar, FGR).",
    "case_origin": "analyst_mining",
}

CASE_INSERT_SQL = """
INSERT OR IGNORE INTO ground_truth_cases (
    id, case_id, case_name, case_type, year_start, year_end,
    estimated_fraud_mxn, source_asf, source_news, source_legal,
    confidence_level, notes, created_at,
    fraud_year_start, fraud_year_end, fraud_institution_ids,
    fraud_contract_types, label_scope_notes, case_origin
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

VENDOR_INSERT_SQL = """
INSERT OR IGNORE INTO ground_truth_vendors (
    case_id, vendor_id, vendor_name_source, role,
    evidence_strength, match_method, match_confidence, notes,
    created_at, is_false_positive, curriculum_weight
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

now = datetime.now().isoformat(sep=" ", timespec="seconds")

for case in (case_1423, case_1424):
    cur.execute(CASE_INSERT_SQL, (
        case["id"], case["case_id"], case["case_name"], case["case_type"],
        case["year_start"], case["year_end"], case["estimated_fraud_mxn"],
        None, None, None,
        case["confidence_level"], case["notes"], now,
        case["fraud_year_start"], case["fraud_year_end"],
        None, case["fraud_contract_types"],
        case["label_scope_notes"], case["case_origin"],
    ))
    cid = case["case_id"]; cnm = case["case_name"]; print(f"Inserted {cid}: {cnm}")

vendor_links = [
    (1423, 10179, "MATERIALES Y CONSTRUCCIONES VILLA DE AGUAYO, S.A. DE C.V.",
     "primary", "high", "manual", 1.0,
     "P2 Ghost pattern; 28/28 single_bid contracts at Tamaulipas SOPDUE+SCT 2002-2010.",
     0, 0.5),
    (1424, 98356, "SERVICIOS ESPECIALIZADOS DE INVESTIGACION Y CUSTODIA, S.A. DE C.V.",
     "primary", "medium", "manual", 1.0,
     "P5 cross-institutional capture; 1.7B MXN AMLO-era flagship-institution awards.",
     0, 0.5),
]

for link in vendor_links:
    cur.execute(VENDOR_INSERT_SQL, (
        link[0], link[1], link[2], link[3], link[4], link[5], link[6],
        link[7], now, link[8], link[9],
    ))
    print(f"  linked vendor {link[1]} -> case {link[0]}")

for vid in (10179, 98356):
    cur.execute(
        "UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id = ?",
        (vid,)
    )
    print(f"  aria_queue.in_ground_truth=1 for vendor {vid}")

conn.commit()

cur.execute("SELECT MAX(id), COUNT(*) FROM ground_truth_cases")
print(f"Post-insert max_id, count: {cur.fetchone()}")
cur.execute("SELECT case_id, vendor_id FROM ground_truth_vendors WHERE case_id IN (1423, 1424)")
print(f"Linked vendors: {cur.fetchall()}")

conn.close()
print("Done.")
