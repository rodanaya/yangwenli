"""
fetch_qqw_data.py

Enrich high/critical-risk vendors with data from QuiénesQuién.wiki (QQW).

QQW is Mexico's corporate transparency platform — it aggregates COMPRANET
contracts with beneficial ownership data and procurement official identities.

This script:
1. Creates the vendor_qqw_data table (if absent)
2. Fetches the top-N high/critical risk vendors from our DB
3. Queries QQW autocomplete API by vendor name
4. Extracts: buyer institution, procurement official (contactPoint),
   contract value, supplier identifiers
5. Stores results for display in VendorProfile → External Records tab

API note: Only /api/v3/autocomplete/{query} is reliably accessible.
Ownership/persons detail endpoints returned 404 as of March 2026.

Run: cd backend && python -m scripts.fetch_qqw_data [--limit N]
"""

import argparse
import json
import logging
import sqlite3
import time
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

QQW_BASE = "https://quienesquienwiki.sociedad.info/api/v3"
QQW_AUTOCOMPLETE = QQW_BASE + "/autocomplete/{query}"

REQUEST_DELAY = 0.8   # seconds between API calls — be polite
TIMEOUT = 15          # seconds per request
MAX_RESULTS_PER_VENDOR = 20  # cap QQW contracts stored per vendor


# ── Schema ────────────────────────────────────────────────────────────────────

DDL = """
CREATE TABLE IF NOT EXISTS vendor_qqw_data (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id             INTEGER NOT NULL,
    vendor_name_rubli     TEXT,
    qqw_ocid              TEXT,
    qqw_contract_id       TEXT,
    qqw_supplier_id       TEXT,
    qqw_supplier_name     TEXT,
    supplier_rfc          TEXT,
    supplier_rupc_id      TEXT,
    buyer_id              TEXT,
    buyer_name            TEXT,
    buyer_institution     TEXT,
    contact_person_id     TEXT,
    contact_person_name   TEXT,
    contract_value        REAL,
    contract_currency     TEXT,
    contract_date         TEXT,
    source_run            TEXT,
    fetched_at            TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qqw_vendor_id ON vendor_qqw_data (vendor_id);
CREATE INDEX IF NOT EXISTS idx_qqw_contact   ON vendor_qqw_data (contact_person_id);
CREATE INDEX IF NOT EXISTS idx_qqw_supplier  ON vendor_qqw_data (qqw_supplier_id);
"""


def create_table(conn: sqlite3.Connection) -> None:
    conn.executescript(DDL)
    conn.commit()
    log.info("vendor_qqw_data table ready.")


# ── HTTP helper ───────────────────────────────────────────────────────────────

def qqw_autocomplete(query: str) -> dict:
    encoded = urllib.parse.quote(query, safe="")
    url = QQW_AUTOCOMPLETE.format(query=encoded)
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "RUBLI-procurement-analysis/1.0 (research; contact: rubli@example.com)",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            if resp.status != 200:
                log.warning("QQW returned %d for %r", resp.status, query)
                return {}
            raw = resp.read()
            return json.loads(raw)
    except Exception as exc:
        log.warning("QQW request failed for %r: %s", query, exc)
        return {}


# ── Parsing ───────────────────────────────────────────────────────────────────

def _val_from_amounts(amounts: list) -> tuple[float | None, str | None]:
    """Extract the first numeric contract value from an OCDS amounts list."""
    for item in amounts:
        amount = item.get("amount")
        currency = item.get("currency", "MXN")
        if amount is not None:
            try:
                return float(amount), str(currency)
            except (TypeError, ValueError):
                pass
    return None, None


def parse_qqw_response(data: dict, vendor_id: int, vendor_name: str) -> list[dict]:
    """Parse QQW OCDS autocomplete response into rows for the DB."""
    rows = []
    items = data.get("data", [])

    for item in items[:MAX_RESULTS_PER_VENDOR]:
        ocid = item.get("ocid", "")
        contract_id = item.get("id", "")

        # Normalise contracts field — QQW may return a list or a dict keyed by id
        raw_contracts = item.get("contracts", [])
        if isinstance(raw_contracts, dict):
            contracts_list = list(raw_contracts.values())
        else:
            contracts_list = raw_contracts if isinstance(raw_contracts, list) else []

        # Date: prefer contracts[].date, fall back to tender.tenderPeriod.startDate
        contract_date = None
        if contracts_list:
            first_c = contracts_list[0] if isinstance(contracts_list[0], dict) else {}
            contract_date = first_c.get("date") or first_c.get("dateSigned")
        if not contract_date:
            tp = item.get("tender", {}).get("tenderPeriod", {})
            contract_date = tp.get("startDate")

        # Normalise awards — also may be a dict
        raw_awards = item.get("awards", [])
        if isinstance(raw_awards, dict):
            awards = list(raw_awards.values())
        else:
            awards = raw_awards if isinstance(raw_awards, list) else []

        # Value: prefer awards, then contracts, then tender
        contract_value, contract_currency = None, None
        if awards:
            first_a = awards[0] if isinstance(awards[0], dict) else {}
            v = first_a.get("value") or {}
            if v.get("amount") is not None:
                contract_value = v.get("amount")
                contract_currency = v.get("currency", "MXN")
        if contract_value is None and contracts_list:
            first_c = contracts_list[0] if isinstance(contracts_list[0], dict) else {}
            v = first_c.get("value") or {}
            contract_value = v.get("amount")
            contract_currency = v.get("currency", "MXN")

        # Parties
        parties_raw = item.get("parties", {})

        # Buyer
        buyer_id, buyer_name, buyer_institution = "", "", ""
        contact_person_id, contact_person_name = "", ""

        if isinstance(parties_raw, list):
            # Some responses use a flat list
            for p in parties_raw:
                if "buyer" in p.get("roles", []):
                    buyer_id = p.get("id", "")
                    buyer_name = p.get("name", "")
                    member_of = p.get("memberOf", [{}])
                    if member_of:
                        buyer_institution = member_of[0].get("name", "") if isinstance(member_of, list) else member_of.get("name", "")
                    cp = p.get("contactPoint", {})
                    contact_person_id = cp.get("id", "")
                    contact_person_name = cp.get("name", "")
                    break
        else:
            # Nested object format
            buyer_obj = parties_raw.get("buyer", {})
            if isinstance(buyer_obj, dict):
                buyer_id = buyer_obj.get("id", "")
                buyer_name = buyer_obj.get("name", "")
                member_of = buyer_obj.get("memberOf") or []
                if member_of:
                    buyer_institution = member_of[0].get("name", "") if isinstance(member_of, list) else member_of.get("name", "")
                cp = buyer_obj.get("contactPoint", {})
                contact_person_id = cp.get("id", "")
                contact_person_name = cp.get("name", "")

        # Suppliers (may be nested under parties.suppliers.list or flat list)
        suppliers_list = []
        if isinstance(parties_raw, list):
            suppliers_list = [p for p in parties_raw if "supplier" in p.get("roles", [])]
        else:
            suppliers_wrapper = parties_raw.get("suppliers", {})
            if isinstance(suppliers_wrapper, dict):
                suppliers_list = suppliers_wrapper.get("list", [])
            elif isinstance(suppliers_wrapper, list):
                suppliers_list = suppliers_wrapper

        for supplier in suppliers_list:
            qqw_supplier_id = supplier.get("id", "")
            qqw_supplier_name = supplier.get("name", "")

            # Identifiers: prefer additionalIdentifiers with RFC scheme
            supplier_rfc = ""
            supplier_rupc_id = ""
            main_id = supplier.get("identifier", {})
            if main_id.get("scheme", "").upper() == "RUPC":
                supplier_rupc_id = main_id.get("id", "")
            elif main_id.get("scheme", "").upper() == "RFC":
                supplier_rfc = main_id.get("id", "")

            for add_id in supplier.get("additionalIdentifiers", []):
                if not isinstance(add_id, dict):
                    continue
                scheme = add_id.get("scheme", "").upper()
                if scheme == "RFC":
                    supplier_rfc = add_id.get("id", "")
                elif scheme == "RUPC":
                    supplier_rupc_id = add_id.get("id", "")

            rows.append({
                "vendor_id": vendor_id,
                "vendor_name_rubli": vendor_name,
                "qqw_ocid": ocid,
                "qqw_contract_id": contract_id,
                "qqw_supplier_id": qqw_supplier_id,
                "qqw_supplier_name": qqw_supplier_name,
                "supplier_rfc": supplier_rfc,
                "supplier_rupc_id": supplier_rupc_id,
                "buyer_id": buyer_id,
                "buyer_name": buyer_name,
                "buyer_institution": buyer_institution,
                "contact_person_id": contact_person_id,
                "contact_person_name": contact_person_name,
                "contract_value": contract_value,
                "contract_currency": contract_currency or "MXN",
                "contract_date": contract_date,
                "source_run": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            })

    return rows


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_high_risk_vendors(conn: sqlite3.Connection, limit: int) -> list[tuple[int, str, str | None]]:
    """Return (vendor_id, name, rfc) for high/critical-risk vendors."""
    cur = conn.execute(
        """
        SELECT v.id, v.name, v.rfc
        FROM vendors v
        JOIN vendor_stats vs ON vs.vendor_id = v.id
        WHERE vs.avg_risk_score >= 0.30
          AND vs.total_contracts >= 3
        ORDER BY vs.avg_risk_score DESC
        LIMIT ?
        """,
        (limit,),
    )
    return cur.fetchall()


def already_fetched(conn: sqlite3.Connection, vendor_id: int) -> bool:
    row = conn.execute(
        "SELECT 1 FROM vendor_qqw_data WHERE vendor_id = ? LIMIT 1", (vendor_id,)
    ).fetchone()
    return row is not None


def insert_rows(conn: sqlite3.Connection, rows: list[dict]) -> int:
    if not rows:
        return 0
    conn.executemany(
        """
        INSERT INTO vendor_qqw_data
          (vendor_id, vendor_name_rubli, qqw_ocid, qqw_contract_id,
           qqw_supplier_id, qqw_supplier_name, supplier_rfc, supplier_rupc_id,
           buyer_id, buyer_name, buyer_institution,
           contact_person_id, contact_person_name,
           contract_value, contract_currency, contract_date, source_run)
        VALUES
          (:vendor_id, :vendor_name_rubli, :qqw_ocid, :qqw_contract_id,
           :qqw_supplier_id, :qqw_supplier_name, :supplier_rfc, :supplier_rupc_id,
           :buyer_id, :buyer_name, :buyer_institution,
           :contact_person_id, :contact_person_name,
           :contract_value, :contract_currency, :contract_date, :source_run)
        """,
        rows,
    )
    conn.commit()
    return len(rows)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch QQW data for high-risk vendors")
    parser.add_argument("--limit", type=int, default=200, help="Max vendors to fetch (default 200)")
    parser.add_argument("--refresh", action="store_true", help="Re-fetch vendors already in DB")
    args = parser.parse_args()

    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    create_table(conn)

    vendors = get_high_risk_vendors(conn, args.limit)
    log.info("Processing %d high/critical-risk vendors ...", len(vendors))

    total_fetched = 0
    skipped = 0
    errors = 0

    for i, (vendor_id, vendor_name, vendor_rfc) in enumerate(vendors, 1):
        if not args.refresh and already_fetched(conn, vendor_id):
            skipped += 1
            continue

        # Use first significant token of vendor name for search (avoids SA/SAB noise)
        search_name = vendor_name.strip()
        # Strip common legal suffixes for better QQW match
        for suffix in (" SA DE CV", " S.A. DE C.V.", " SA", " SC", " SRL", " S DE RL"):
            if search_name.upper().endswith(suffix.upper()):
                search_name = search_name[: -len(suffix)].strip()
                break

        log.info("[%d/%d] Searching QQW for %r ...", i, len(vendors), search_name[:60])
        data = qqw_autocomplete(search_name)

        count = data.get("count", 0)
        if count == 0 or not data.get("data"):
            log.info("  → No results (count=%s)", count)
            # Insert a sentinel so we don't re-fetch on next run
            conn.execute(
                "INSERT INTO vendor_qqw_data (vendor_id, vendor_name_rubli, source_run) VALUES (?, ?, ?)",
                (vendor_id, vendor_name, datetime.now().strftime("%Y-%m-%dT%H:%M:%S")),
            )
            conn.commit()
        else:
            rows = parse_qqw_response(data, vendor_id, vendor_name)
            inserted = insert_rows(conn, rows)
            total_fetched += inserted
            log.info("  → %d QQW results, inserted %d rows", count, inserted)

        time.sleep(REQUEST_DELAY)

    conn.close()

    log.info("=" * 50)
    log.info("Done. Fetched: %d rows | Skipped: %d | Errors: %d", total_fetched, skipped, errors)
    log.info("Run 'python -m scripts.fetch_qqw_data --refresh' to re-fetch all.")


if __name__ == "__main__":
    main()
