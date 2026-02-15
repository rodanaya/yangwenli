"""
Seed Big Fish Evidence — Corroborated Investigation Cases

Seeds the 8 externally validated vendors into investigation_cases
with news_hits evidence and validation_status='corroborated'.

Run once: python backend/scripts/seed_big_fish_evidence.py
"""

import sqlite3
import json
import sys
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# ============================================================================
# BIG FISH DATA — 8 vendors with documented corruption investigations
# ============================================================================

BIG_FISH = [
    {
        "vendor_id": 286318,
        "vendor_name": "SERVICIOS INTEGRALES RETIMAR SA DE CV",
        "sector_id": 2,
        "score": 0.377,
        "value_b": 2.3,
        "news_hits": [
            {
                "source_url": "https://www.proceso.com.mx/nacional/2024/1/cartel-de-la-limpieza-ipn",
                "source_title": "Cartel de la Limpieza del IPN — sobornos y evasion fiscal",
                "source_type": "news",
                "summary": "Part of 'Cartel de la Limpieza' at IPN. Bribery and tax evasion charges filed.",
                "date_published": "2024-01-15",
                "credibility": "high",
            }
        ],
        "review_notes": "Cartel de la Limpieza IPN — bribery, tax evasion charges. 48 contracts, 2.3B MXN in education sector.",
    },
    {
        "vendor_id": 258499,
        "vendor_name": "ICA CONSTRUCTORA SA DE CV",
        "sector_id": 3,
        "score": 0.363,
        "value_b": 44.5,
        "news_hits": [
            {
                "source_url": "https://www.proceso.com.mx/nacional/2025/2/ica-proveedores",
                "source_title": "ICA sigue sin pagar a proveedores",
                "source_type": "news",
                "summary": "136M+ MXN owed to subcontractors, company fled offices. History of Line 12 Metro collapse.",
                "date_published": "2025-02-04",
                "credibility": "high",
            },
            {
                "source_url": "https://expansion.mx/empresas/2024/ica-deuda-fraude",
                "source_title": "ICA debt fraud and corporate flight",
                "source_type": "news",
                "summary": "Debt restructuring fraud, fled offices, 44.5B in government contracts.",
                "date_published": "2024-06-15",
                "credibility": "high",
            },
        ],
        "review_notes": "Debt fraud, fled offices, Line 12 Metro history. 16 contracts worth 44.5B MXN.",
    },
    {
        "vendor_id": 48064,
        "vendor_name": "COCONAL SAPI DE CV",
        "sector_id": 3,
        "score": 0.346,
        "value_b": 46.8,
        "related_vendor_ids": [104322, 312],
        "news_hits": [
            {
                "source_url": "https://www.elfinanciero.com.mx/nacional/2023/coconal-sfp-investigacion",
                "source_title": "SFP investiga a COCONAL y 15 empresas por corrupcion",
                "source_type": "news",
                "summary": "SFP corruption investigation implicating 15 companies in infrastructure procurement fraud.",
                "date_published": "2023-09-20",
                "credibility": "high",
            }
        ],
        "review_notes": "SFP corruption investigation, 15 companies implicated. 3 COCONAL entities: SAPI (48064), S.A.P.I. (104322), S.A. (312). Combined 46.8B MXN.",
    },
    {
        "vendor_id": 108513,
        "vendor_name": "MOTA-ENGIL MEXICO SA DE CV",
        "sector_id": 3,
        "score": 0.312,
        "value_b": 30.1,
        "news_hits": [
            {
                "source_url": "https://www.animalpolitico.com/2024/mota-engil-irregularidades",
                "source_title": "ASF documenta irregularidades de Mota-Engil",
                "source_type": "asf_audit",
                "summary": "ASF audit findings, previously barred from contracting. FGR fuel theft probe ongoing.",
                "date_published": "2024-03-10",
                "credibility": "high",
            }
        ],
        "review_notes": "ASF irregularities, previously barred from contracts, FGR fuel theft probe. 18 contracts, 30.1B MXN.",
    },
    {
        "vendor_id": 102627,
        "vendor_name": "TOKA INTERNACIONAL S A P I DE CV",
        "sector_id": 2,
        "score": 0.306,
        "value_b": 53.1,
        "news_hits": [
            {
                "source_url": "https://www.eluniversal.com.mx/nacion/toka-fraude-robo-datos",
                "source_title": "Toka Internacional — fraude y robo de datos",
                "source_type": "news",
                "summary": "Fraud and data theft allegations. 6.2B MXN in no-bid Segob contracts. Monopolistic practices.",
                "date_published": "2024-05-22",
                "credibility": "high",
            },
            {
                "source_url": "https://contralacorrupcion.mx/toka-contratos-directos-segob",
                "source_title": "Toka: 6.2B en contratos directos de Segob",
                "source_type": "investigative",
                "summary": "6.2B MXN in direct award contracts from Gobernacion. Data theft and fraud investigation.",
                "date_published": "2024-07-01",
                "credibility": "high",
            },
        ],
        "review_notes": "Fraud, data theft, 6.2B in no-bid Segob contracts. 1,954 contracts, 53.1B MXN total.",
    },
    {
        "vendor_id": 8002,
        "vendor_name": "COTEMAR, S. A. DE C. V.",
        "sector_id": 4,
        "score": 0.234,
        "value_b": 33.2,
        "news_hits": [
            {
                "source_url": "https://www.proceso.com.mx/nacional/2024/cotemar-irregular-intocable",
                "source_title": "Cotemar: irregular e intocable",
                "source_type": "investigative",
                "summary": "'Irregular and untouchable' — FGR+UIF investigation. 40B+ MXN in unverified PEMEX contracts.",
                "date_published": "2024-08-15",
                "credibility": "high",
            }
        ],
        "review_notes": "'Irregular and untouchable' — FGR+UIF investigation, 40B+ unverified PEMEX contracts. 51 contracts, 33.2B MXN.",
    },
    {
        "vendor_id": 43904,
        "vendor_name": "SIXSIGMA NETWORKS MEXICO",
        "sector_id": 7,
        "score": 0.278,
        "value_b": 27.0,
        "news_hits": [
            {
                "source_url": "https://www.elfinanciero.com.mx/economia/sixsigma-sat-licitacion",
                "source_title": "Sixsigma gano licitacion amañada del SAT",
                "source_type": "news",
                "summary": "Rigged SAT tender, ASF audit findings. 32.8B MXN total across entities.",
                "date_published": "2024-04-10",
                "credibility": "high",
            }
        ],
        "review_notes": "Rigged SAT tender, ASF findings. 147 contracts, 27.0B MXN. Related entity: SIXSIGMA NETWORKS MEXICO S.A. DE C.V. (17420).",
    },
    {
        "vendor_id": 44372,
        "vendor_name": "EDENRED MEXICO SA DE CV",
        "sector_id": 4,
        "score": 0.258,
        "value_b": 38.7,
        "news_hits": [
            {
                "source_url": "https://www.eleconomista.com.mx/empresas/edenred-monopolio-vales",
                "source_title": "Edenred Mexico — monopolistic control of voucher market",
                "source_type": "news",
                "summary": "Monopolistic market control of government voucher programs. Anti-corruption investigation ongoing.",
                "date_published": "2024-11-05",
                "credibility": "medium",
            }
        ],
        "review_notes": "Monopolistic market control, anti-corruption investigation. 2,939 contracts, 38.7B MXN.",
    },
]

# Map vendor_id -> existing investigation case id (from DB query)
EXISTING_CASE_MAP = {
    44372: 2,    # Edenred -> CASE-SAL-2026-00002
    102627: 17,  # Toka -> CASE-INF-2026-00002
    48064: 23,   # Coconal -> CASE-INF-2026-00008
}


def seed_big_fish():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    now = datetime.now().isoformat()
    updated = 0
    created = 0

    for fish in BIG_FISH:
        vendor_id = fish["vendor_id"]
        news_json = json.dumps(fish["news_hits"], ensure_ascii=False)

        if vendor_id in EXISTING_CASE_MAP:
            # Update existing investigation case
            case_db_id = EXISTING_CASE_MAP[vendor_id]
            cursor.execute("""
                UPDATE investigation_cases
                SET validation_status = 'corroborated',
                    is_reviewed = 1,
                    review_notes = ?,
                    news_hits = ?,
                    reviewed_at = ?,
                    reviewed_by = 'web_research_feb2026'
                WHERE id = ?
            """, (fish["review_notes"], news_json, now, case_db_id))
            updated += 1
            print(f"  Updated case #{case_db_id} for {fish['vendor_name']}")
        else:
            # Create new investigation case
            # Generate case_id based on sector
            sector_codes = {
                1: "SAL", 2: "EDU", 3: "INF", 4: "ENE",
                5: "DEF", 6: "TEC", 7: "HAC", 8: "GOB",
                9: "AGR", 10: "AMB", 11: "TRA", 12: "OTR",
            }
            sector_code = sector_codes.get(fish["sector_id"], "OTR")

            # Find next case number for this sector
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM investigation_cases
                WHERE case_id LIKE ?
            """, (f"CASE-{sector_code}-2026-%",))
            existing_count = cursor.fetchone()["cnt"]
            case_num = existing_count + 100  # offset to avoid collisions
            case_id = f"CASE-{sector_code}-2026-{case_num:05d}"

            # Get vendor stats
            cursor.execute("""
                SELECT total_contracts, total_value_mxn, avg_risk_score
                FROM vendor_stats WHERE vendor_id = ?
            """, (vendor_id,))
            stats = cursor.fetchone()
            total_contracts = stats["total_contracts"] if stats else 0
            total_value = stats["total_value_mxn"] if stats else 0
            avg_score = stats["avg_risk_score"] if stats else fish["score"]

            title = f"{fish['vendor_name']} - Externally Corroborated Investigation"
            summary = fish["review_notes"]

            cursor.execute("""
                INSERT INTO investigation_cases (
                    case_id, case_type, primary_sector_id,
                    suspicion_score, anomaly_score, confidence,
                    title, summary, narrative,
                    total_contracts, total_value_mxn, estimated_loss_mxn,
                    signals_triggered, risk_factor_counts,
                    priority, is_reviewed, validation_status,
                    review_notes, news_hits,
                    generated_at, reviewed_at, reviewed_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                case_id, "single_vendor", fish["sector_id"],
                fish["score"], fish["score"], 0.9,
                title, summary, f"# {title}\n\n{summary}\n\n## External Evidence\n\nCorroborated through web research (February 2026).",
                total_contracts, total_value, total_value * 0.1,  # conservative 10% estimated loss
                json.dumps(["vendor_concentration", "price_anomaly"]),
                json.dumps({"vendor_concentration": total_contracts}),
                5, 1, "corroborated",
                fish["review_notes"], news_json,
                now, now, "web_research_feb2026",
            ))

            new_case_id = cursor.lastrowid

            # Create case_vendors link
            cursor.execute("""
                INSERT OR IGNORE INTO case_vendors (
                    case_id, vendor_id, role,
                    contract_count, contract_value_mxn, avg_risk_score
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (new_case_id, vendor_id, "primary_suspect",
                  total_contracts, total_value, avg_score))

            # Also link related vendors if specified
            for related_id in fish.get("related_vendor_ids", []):
                cursor.execute("""
                    SELECT total_contracts, total_value_mxn, avg_risk_score
                    FROM vendor_stats WHERE vendor_id = ?
                """, (related_id,))
                rstats = cursor.fetchone()
                if rstats:
                    cursor.execute("""
                        INSERT OR IGNORE INTO case_vendors (
                            case_id, vendor_id, role,
                            contract_count, contract_value_mxn, avg_risk_score
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    """, (new_case_id, related_id, "corporate_sibling",
                          rstats["total_contracts"], rstats["total_value_mxn"],
                          rstats["avg_risk_score"]))

            created += 1
            print(f"  Created case {case_id} for {fish['vendor_name']}")

    conn.commit()
    conn.close()

    print(f"\nDone: {updated} cases updated, {created} cases created")
    print(f"Total corroborated: {updated + created}")


if __name__ == "__main__":
    print("Seeding big fish evidence into investigation_cases...")
    seed_big_fish()
