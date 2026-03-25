"""

Backfill vendors.rfc from external registry sources.



For vendors where rfc IS NULL, attempts to fill from:

  1. company_registry (already vendor_id-linked, highest confidence)

  2. rupc_vendors (matched by normalized company name)

  3. sat_efos_vendors (matched by normalized company name)



Only backfills when confidence is high (exact match from a trusted

registry).  Skips test/generic RFCs.



Usage:

    python -m scripts._backfill_vendor_rfc              # dry-run

    python -m scripts._backfill_vendor_rfc --execute    # write to DB

"""



import os

import re

import sqlite3

import sys

import unicodedata

from collections import Counter





DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")



# RFCs to skip -- test data, generic, or SAT placeholder values

SKIP_RFCS = {

    "XAXX010101000",

    "XEXX010101000",

    "0000000000000",

    "000000000000",

    "XXXX000000XX0",

}



# Pattern for valid Mexican RFC: 3-4 letters + 6 digits + 3 alphanumeric

RFC_PATTERN = re.compile(r"^[A-Z&]{3,4}\d{6}[A-Z0-9]{3}$")





def get_db_path() -> str:

    if len(sys.argv) > 1 and not sys.argv[1].startswith("--"):

        return sys.argv[1]

    return os.environ.get("DATABASE_PATH", DB_DEFAULT)





def normalize_name(name: str) -> str:

    """Normalize company name for matching: uppercase, strip accents,

    remove common suffixes and punctuation."""

    if not name:

        return ""

    # Remove accents

    nfkd = unicodedata.normalize("NFKD", name)

    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))

    s = ascii_str.upper().strip()

    # Remove common Mexican corporate suffixes

    for suffix in [

        " SA DE CV", " S A DE C V", " S.A. DE C.V.", " SA DE C V",

        " S DE RL DE CV", " S. DE R.L. DE C.V.", " S DE RL",

        " SC", " S.C.", " AC", " A.C.",

        " SAS", " S.A.S.", " SPR DE RL", " S.P.R. DE R.L.",

    ]:

        if s.endswith(suffix.upper()):

            s = s[: -len(suffix)]

            break

    # Remove punctuation, collapse whitespace

    s = re.sub(r"[^A-Z0-9 ]", "", s)

    s = re.sub(r"\s+", " ", s).strip()

    return s





def is_valid_rfc(rfc: str) -> bool:

    """Check if RFC looks like a valid Mexican RFC."""

    if not rfc or len(rfc) < 12 or len(rfc) > 13:

        return False

    rfc_upper = rfc.upper().strip()

    if rfc_upper in SKIP_RFCS:

        return False

    if rfc_upper.startswith("000"):

        return False

    return bool(RFC_PATTERN.match(rfc_upper))





def run(execute: bool = False):

    db_path = get_db_path()

    print(f"Database: {db_path}")

    conn = sqlite3.connect(db_path)

    conn.execute("PRAGMA journal_mode=WAL")

    cur = conn.cursor()



    # -- Current state --

    cur.execute("SELECT COUNT(*) FROM vendors")

    total_vendors = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM vendors WHERE rfc IS NOT NULL AND rfc != ''")

    have_rfc = cur.fetchone()[0]

    need_rfc = total_vendors - have_rfc

    print(f"\nVendors: {total_vendors:,} total, {have_rfc:,} with RFC ({100*have_rfc/total_vendors:.1f}%)")

    print(f"Missing RFC: {need_rfc:,}")



    # Collect all backfill candidates: vendor_id -> (rfc, source, confidence)

    backfill = {}



    # -- Source 1: company_registry (already vendor_id-linked) --

    cur.execute("""

        SELECT cr.vendor_id, cr.rfc

        FROM company_registry cr

        JOIN vendors v ON cr.vendor_id = v.id

        WHERE cr.rfc IS NOT NULL AND cr.rfc != ''

          AND (v.rfc IS NULL OR v.rfc = '')

    """)

    cr_count = 0

    for vid, rfc in cur.fetchall():

        if is_valid_rfc(rfc):

            backfill[vid] = (rfc.upper().strip(), "company_registry", 1.0)

            cr_count += 1

    print(f"\nSource 1 - company_registry: {cr_count} candidates")



    # -- Source 2: rupc_vendors (match by normalized name) --

    cur.execute("""

        SELECT id, name FROM vendors

        WHERE (rfc IS NULL OR rfc = '')

    """)

    name_to_vendors = {}

    for vid, vname in cur.fetchall():

        if vid in backfill:

            continue

        norm = normalize_name(vname or "")

        if norm:

            name_to_vendors.setdefault(norm, []).append(vid)



    cur.execute("""

        SELECT rfc, company_name FROM rupc_vendors

        WHERE rfc IS NOT NULL AND rfc != ''

    """)

    rupc_matches = 0

    for rfc, company_name in cur.fetchall():

        if not is_valid_rfc(rfc):

            continue

        norm = normalize_name(company_name or "")

        if norm and norm in name_to_vendors:

            for vid in name_to_vendors[norm]:

                if vid not in backfill:

                    backfill[vid] = (rfc.upper().strip(), "rupc_vendors", 0.95)

                    rupc_matches += 1

    print(f"Source 2 - rupc_vendors (name match): {rupc_matches} candidates")



    # -- Source 3: sat_efos_vendors (match by normalized name) --

    cur.execute("""

        SELECT rfc, company_name FROM sat_efos_vendors

        WHERE rfc IS NOT NULL AND rfc != ''

    """)

    efos_matches = 0

    for rfc, company_name in cur.fetchall():

        if not is_valid_rfc(rfc):

            continue

        norm = normalize_name(company_name or "")

        if norm and norm in name_to_vendors:

            for vid in name_to_vendors[norm]:

                if vid not in backfill:

                    backfill[vid] = (rfc.upper().strip(), "sat_efos_vendors", 0.90)

                    efos_matches += 1

    print(f"Source 3 - sat_efos_vendors (name match): {efos_matches} candidates")



    # -- Dedup: check no RFC collision with existing vendors --

    cur.execute("SELECT rfc FROM vendors WHERE rfc IS NOT NULL AND rfc != ''")

    existing_rfcs = {r[0].upper().strip() for r in cur.fetchall()}



    final_backfill = {}

    collisions = 0

    for vid, (rfc, source, conf) in backfill.items():

        if rfc in existing_rfcs:

            collisions += 1

            continue

        final_backfill[vid] = (rfc, source, conf)

        existing_rfcs.add(rfc)  # prevent double-assignment



    print(f"\nCollisions with existing RFCs (skipped): {collisions}")

    print(f"Final backfill candidates: {len(final_backfill)}")



    # -- Summary by source --

    by_source = Counter(src for _, src, _ in final_backfill.values())

    for src, cnt in by_source.most_common():

        print(f"  {src}: {cnt}")



    # -- Sample matches --

    if final_backfill:

        print(f"\nSample backfills (first 15):")

        print(f"  {'Vendor ID':>10}  {'RFC':<14}  {'Source':<20}  {'Vendor Name'}")

        print(f"  {'-'*10}  {'-'*13}  {'-'*19}  {'-'*40}")

        shown = 0

        for vid, (rfc, source, conf) in final_backfill.items():

            if shown >= 15:

                break

            cur.execute("SELECT name FROM vendors WHERE id = ?", (vid,))

            row = cur.fetchone()

            vname = row[0][:40] if row and row[0] and len(row[0]) > 40 else (row[0] if row else "?")

            print(f"  {vid:>10}  {rfc:<14}  {source:<20}  {vname}")

            shown += 1



    # -- Execute --

    if execute and final_backfill:

        print(f"\nUpdating {len(final_backfill)} vendors ...")

        conn.execute("PRAGMA synchronous=OFF")

        conn.execute("BEGIN TRANSACTION")

        updated = 0

        for vid, (rfc, source, conf) in final_backfill.items():

            cur.execute(

                "UPDATE vendors SET rfc = ? WHERE id = ? AND (rfc IS NULL OR rfc = '')",

                (rfc, vid),

            )

            updated += cur.rowcount

        conn.commit()

        conn.execute("PRAGMA synchronous=FULL")

        print(f"  Updated {updated} vendors.")



        # Verify

        cur.execute("SELECT COUNT(*) FROM vendors WHERE rfc IS NOT NULL AND rfc != ''")

        new_have = cur.fetchone()[0]

        print(f"  RFC coverage: {have_rfc:,} -> {new_have:,} ({100*new_have/total_vendors:.1f}%)")

    elif not execute:

        print(f"\n[DRY RUN] Pass --execute to write changes.")

    else:

        print(f"\nNo candidates to backfill.")



    conn.close()





if __name__ == "__main__":

    execute_flag = "--execute" in sys.argv

    run(execute=execute_flag)

