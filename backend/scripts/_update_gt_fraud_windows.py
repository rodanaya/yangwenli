"""
Contract-Level Labeling: Add fraud time windows to ground_truth_cases.

This is the most important structural fix for the v6.0 risk model. Currently,
ALL contracts from a ground-truth vendor are labeled "corrupt". This creates
40-50% label noise:
  - COVID case vendors have pre-2020 contracts labeled as COVID fraud
  - IMSS Ghost Company vendors (Pisa) have 9,173 contracts from 2002-2025
    but ghost scheme was 2012-2018
  - Segalmex vendors (LICONSA) have 5,858 contracts spanning 2002-2025
    but fraud was 2019-2023

After this script:
  - New columns: fraud_year_start, fraud_year_end, fraud_institution_ids,
    fraud_contract_types, label_scope_notes
  - A VIEW ground_truth_contracts_scoped restricts positive labels to within
    the fraud window
  - Expected reduction: ~80-100K contracts removed from positive labels
    (~30-35% noise reduction)

Usage:
    cd backend
    python scripts/_update_gt_fraud_windows.py              # dry run (default)
    python scripts/_update_gt_fraud_windows.py --apply       # apply changes
    python scripts/_update_gt_fraud_windows.py --stats-only  # just show stats
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3
import json
import argparse
import os
from pathlib import Path

DB_PATH = os.environ.get('DATABASE_PATH',
    str(Path(__file__).parent.parent / 'RUBLI_NORMALIZED.db'))

# ═══════════════════════════════════════════════════════════════════════════════
# FRAUD WINDOW DEFINITIONS
#
# For each case (by ground_truth_cases.id), define:
#   - fraud_year_start/end: the documented fraud period
#   - fraud_institution_ids: if fraud is institution-specific (JSON array or None)
#   - label_scope_notes: justification for the scoping decision
#
# THREE TIERS of scoping:
#   1. TIGHT: Cases with well-documented fraud periods (COVID, Segalmex, etc.)
#   2. MODERATE: Cases where we tighten 2002-2025 to a defensible sub-range
#   3. DEFAULT: For remaining cases, use the existing year_start/year_end
# ═══════════════════════════════════════════════════════════════════════════════

# Tier 1: TIGHT WINDOWS — well-documented fraud timelines
TIGHT_WINDOWS = {
    # Case 1: COVID-19 Emergency Procurement
    # Documented: 2020-2021 pandemic emergency, IMSS/INSABI focus
    # Problem: 5,472 contracts, only 218 in window (96% outside!)
    1: {
        'fraud_year_start': 2020,
        'fraud_year_end': 2022,  # extend to 2022 for delayed contracts
        'fraud_institution_ids': None,  # multiple institutions involved
        'label_scope_notes': (
            'COVID-19 emergency procurement fraud documented 2020-2021. '
            'Extended to 2022 for delayed delivery/payment contracts. '
            'Vendors like DIMM (4,305 ct) and Bruluart (584 ct) had extensive '
            'pre-COVID activity that is unrelated to pandemic fraud. '
            'Pre-2020 contracts are legitimate pharmaceutical distribution.'
        ),
    },

    # Case 3: IMSS Ghost Company Network
    # Documented: 2012-2018, Pisa and DIQN
    # Problem: 9,257 contracts, only 2,106 in window (77% outside!)
    3: {
        'fraud_year_start': 2012,
        'fraud_year_end': 2018,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'IMSS ghost company scheme documented 2012-2018. '
            'Laboratorios Pisa (9,173 ct) is a legitimate large pharma company '
            'that was implicated in the ghost invoice scheme during this period. '
            'Pisa contracts from 2002-2011 and 2019-2025 at children\'s hospitals '
            'are almost certainly legitimate. DIQN (84 ct) similarly scoped.'
        ),
    },

    # Case 5: Segalmex Food Distribution Fraud
    # Documented: 2019-2023, LICONSA/DICONSA/SEGALMEX
    # Problem: 6,986 contracts, only 2,232 in window (68% outside!)
    5: {
        'fraud_year_start': 2019,
        'fraud_year_end': 2023,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Segalmex fraud documented 2019-2023 (Ignacio Ovalle administration). '
            'LICONSA (5,858 ct) is a legitimate government parastatal distributing '
            'subsidized milk since the 1960s. Contracts 2002-2018 are routine milk '
            'deliveries, not procurement fraud. DICONSA similarly scoped. '
            'Small vendors (D SAZON, ABACOMEX) may have fraud spanning full range.'
        ),
    },

    # Case 12: Toka Government IT Monopoly
    # Documented: 2015-2024
    # Problem: 1,944 contracts, 225 outside (11.6%)
    12: {
        'fraud_year_start': 2015,
        'fraud_year_end': 2024,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Toka IT monopoly documented 2015-2024. '
            'Pre-2015 contracts (68) are from different business phase. '
            'Post-2024 may continue but 2025 data incomplete.'
        ),
    },

    # Case 15: Edenred Government Voucher Monopoly
    # Documented: 2010-2024
    15: {
        'fraud_year_start': 2010,
        'fraud_year_end': 2024,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Edenred voucher monopoly documented from 2010 when DA pattern '
            'intensified. 2025 contracts (459) may be continuation but '
            'data incomplete.'
        ),
    },
}

# Tier 2: MODERATE WINDOWS — tighten 2002-2025 based on documented evidence
# For cases with year_start=2002 and year_end=2025, we tighten based on:
# - When the vendor's suspicious DA pattern started
# - COFECE/ASF investigation dates
# - Case-specific evidence from notes
MODERATE_WINDOWS = {
    # Case 168: Farmaceuticos MAYPO — BIRMEX sub-contracting
    # Full span 2002-2025, 18,216 contracts
    # ASF documented the BIRMEX channel, but MAYPO was active since 2002
    # Tighten to 2010-2025 (DA pattern intensification period)
    168: {
        'fraud_year_start': 2010,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Farmaceuticos MAYPO BIRMEX sub-contracting documented by ASF '
            'Cuenta Publica 2022-2023. BIRMEX DA channel existed since ~2010. '
            'Pre-2010 contracts may include legitimate LP-era procurement. '
            'Conservative: keep 2010+ when DA pattern became systematic.'
        ),
    },

    # Case 204: Dentilab IMSS Dental Lab — 8,686 contracts 2002-2025
    # IMSS at 72%DA over 24 years — chronic capture, not time-limited fraud
    # Keep full span but add institution scoping
    204: {
        'fraud_year_start': 2002,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,  # multi-institution but IMSS-dominant
        'label_scope_notes': (
            'Dentilab chronic institution capture at IMSS (72%DA) over 24 years. '
            'Unlike time-limited fraud cases, this is a structural capture pattern. '
            'Keeping full window because the DA pattern is consistent across all years. '
            'Future: could scope to IMSS-only contracts (7,618 of 8,686).'
        ),
    },

    # Case 165: Vitalmex Group COFECE Cartel — 5,826 contracts 2002-2025
    # COFECE investigation IO-007-2014, final resolution 2019
    # Cartel likely operated from early 2000s through 2019 COFECE fine
    165: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2020,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Vitalmex medical equipment cartel documented by COFECE resolution '
            'IO-007-2014 (investigation opened 2014, final resolution 2019, '
            '626M MXN fine). Cartel coordination likely started mid-2000s. '
            'Post-2020 contracts may reflect changed behavior after COFECE action. '
            'Conservative window 2005-2020.'
        ),
    },

    # Case 104: Ralca IMSS/ISSSTE Pharma — 5,198 contracts 2002-2025
    # 68.5%DA, chronic capture — same as Dentilab pattern
    104: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Ralca 25.1B pharmaceutical dual-institution monopoly (IMSS 75%DA, '
            'ISSSTE 61%DA). Chronic capture pattern. '
            'Pre-2005 contracts (Structure A, 0.1% RFC coverage) are unreliable. '
            'Tightened from 2002 to 2005.'
        ),
    },

    # Case 102: Proquigama IMSS Pharma Ring — 3,401 contracts 2002-2025
    102: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Proquigama 87%DA at IMSS over 2,868 contracts. '
            'Chronic DA procurement capture. Pre-2005 data unreliable (Structure A). '
            'Tightened from 2002 to 2005.'
        ),
    },

    # Case 150: Baxter Dialysis Monopoly — 3,554 contracts 2002-2025
    # LEGITIMATE technology lock-in (peritoneal dialysis proprietary systems)
    # Case notes say "low fraud confidence" — tighten aggressively
    150: {
        'fraud_year_start': 2010,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Baxter peritoneal dialysis — notes state "legitimate technology lock-in, '
            'not deliberate corruption." Low fraud confidence. 75%DA reflects '
            'proprietary PD system lock-in (patients tied to Baxter consumables). '
            'Tightened to 2010+ when DA rates escalated. Pre-2010 were mostly LP.'
        ),
    },

    # Case 203: Productos Hospitalarios IMSS — 3,192 contracts 2002-2025
    203: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Productos Hospitalarios 68%DA at IMSS for sterile hospital services. '
            'Chronic institution capture. Pre-2005 Structure A data unreliable.'
        ),
    },

    # Case 152: Praxair Mexico — 2,794 contracts 2002-2025
    # Notes: "Low confidence" — industrial gas legitimate oligopoly
    152: {
        'fraud_year_start': 2010,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Praxair/Linde medical oxygen — legitimate oligopoly. '
            'Notes state "low confidence." PEMEX 6B LP contract (2005) was competitive. '
            'Tightened to 2010+ when DA rates for medical oxygen escalated.'
        ),
    },

    # Case 153: TELMEX — 2,392 contracts 2002-2025
    # Natural monopoly for fixed-line telecom
    153: {
        'fraud_year_start': 2008,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'TELMEX government telecom monopoly. Natural monopoly for last-mile '
            'fixed-line infrastructure. Pre-2008 contracts may reflect legitimate '
            'sole-source procurement before alternatives existed. '
            '77%DA partly justified by infrastructure monopoly.'
        ),
    },

    # Case 249: CONALITEG printing ecosystem — 2,443 contracts 2002-2025
    249: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'CONALITEG textbook printing ecosystem. 16 publishers/printers without RFC. '
            'Systemic compliance failure. Pre-2005 Structure A data unreliable.'
        ),
    },

    # Case 65: Falcon Medical Equipment — 1,796 contracts 2002-2025
    # Documents a "structural break" in 2010: 0%DA → 56-89%DA
    65: {
        'fraud_year_start': 2010,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Instrumentos y Equipos Falcon shows documented structural break: '
            '0%DA 2002-2009 → 56-89%DA from 2010 onwards. '
            'Pre-2010 contracts were fully competitive (LP) and should NOT be '
            'labeled as fraud. Scoped to 2010+ when DA capture began.'
        ),
    },

    # Case 66: Selecciones Medicas del Centro — 1,307 contracts 2002-2025
    # Same 2010 structural break as Case 65
    66: {
        'fraud_year_start': 2010,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Selecciones Medicas del Centro — identical 2010 structural break as '
            'Case 65 (Falcon): 0%DA 2007-2009 → 60-72%DA from 2010+. '
            'Pre-2010 contracts were legitimately competitive.'
        ),
    },

    # Case 145: Infra SA Medical Oxygen — 4,283 contracts 2003-2025
    # Notes document progressive capture: 0%DA in 2003 → 75%DA by 2024-2025
    145: {
        'fraud_year_start': 2010,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Infra SA medical oxygen shows progressive DA capture: '
            '0%DA in 2003 → 75%DA by 2024-2025. '
            'Pre-2010 contracts were mostly competitive (LP). '
            'Scoped to 2010+ when DA pattern became dominant.'
        ),
    },

    # Case 144: Abalat Blood Bank — 3,265 contracts 2005-2025
    144: {
        'fraud_year_start': 2008,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Abalat blood bank services at national health institutes 68%DA. '
            'Pre-2008 contracts may include legitimate startup phase.'
        ),
    },

    # Case 147: Galia Textil IMSS — 1,898 contracts 2002-2025
    147: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Galia Textil wound care materials at IMSS 67%DA. '
            'Chronic capture. Pre-2005 Structure A data unreliable.'
        ),
    },

    # Case 172: Comercializadora Productos Institucionales — 1,811 contracts 2002-2025
    172: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'CPI pharma 27%DA — lower DA but 24-year continuous supply to IMSS/ISSSTE. '
            'Pre-2005 Structure A data unreliable.'
        ),
    },

    # Case 205: Medigroup del Pacifico — 3,804 contracts 2005-2025
    205: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Medigroup del Pacifico 86%DA at IMSS over 21 years. '
            'Keeping existing 2005-2025 window. Chronic IMSS capture.'
        ),
    },

    # Case 259: Medical Dimegar — 1,353 contracts 2002-2025
    259: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Medical Dimegar IMSS 54%DA medical consumables. '
            'Pre-2005 Structure A data unreliable.'
        ),
    },

    # Case 88 & 67: Vitalmex Internacional (duplicates)
    88: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2020,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Vitalmex Internacional — part of COFECE cartel (Case 165). '
            'Scoped to 2005-2020 consistent with cartel investigation timeline.'
        ),
    },
    67: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2020,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Vitalmex Internacional — part of COFECE cartel (Case 165). '
            'Scoped to 2005-2020 consistent with cartel investigation timeline.'
        ),
    },

    # Case 84: Centrum Promotora — part of Vitalmex cartel
    84: {
        'fraud_year_start': 2005,
        'fraud_year_end': 2020,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Centrum Promotora Internacional — part of Vitalmex/COFECE cartel. '
            'Scoped to 2005-2020 consistent with cartel timeline.'
        ),
    },

    # Case 350: Probiomed — 1,616 contracts 2002-2025
    350: {
        'fraud_year_start': 2008,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Probiomed biosimilar concentration at IMSS. '
            'Pre-2008 unlikely to be relevant.'
        ),
    },

    # Case 351: Reactivos y Quimicos — 1,498 contracts 2002-2025
    351: {
        'fraud_year_start': 2008,
        'fraud_year_end': 2025,
        'fraud_institution_ids': None,
        'label_scope_notes': (
            'Reactivos y Quimicos hemodialysis/reagent monopoly. '
            'Pre-2008 unlikely to be relevant.'
        ),
    },
}

# Combine all explicit windows
EXPLICIT_WINDOWS = {**TIGHT_WINDOWS, **MODERATE_WINDOWS}


def get_connection(readonly=True):
    """Get database connection."""
    if readonly:
        conn = sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True)
    else:
        conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def check_columns_exist(conn):
    """Check if fraud window columns already exist."""
    cursor = conn.execute("PRAGMA table_info(ground_truth_cases)")
    columns = {row['name'] for row in cursor.fetchall()}
    needed = {'fraud_year_start', 'fraud_year_end', 'fraud_institution_ids',
              'fraud_contract_types', 'label_scope_notes'}
    existing = needed & columns
    missing = needed - columns
    return existing, missing


def add_columns(conn):
    """Add fraud window columns to ground_truth_cases."""
    columns_to_add = [
        ('fraud_year_start', 'INTEGER'),
        ('fraud_year_end', 'INTEGER'),
        ('fraud_institution_ids', 'TEXT'),     # JSON array of institution IDs
        ('fraud_contract_types', 'TEXT'),       # JSON array of contract type filters
        ('label_scope_notes', 'TEXT'),          # explanation of scoping decision
    ]

    existing, missing = check_columns_exist(conn)

    for col_name, col_type in columns_to_add:
        if col_name in missing:
            print(f"  Adding column: {col_name} ({col_type})")
            conn.execute(f"ALTER TABLE ground_truth_cases ADD COLUMN {col_name} {col_type}")
        else:
            print(f"  Column already exists: {col_name}")

    conn.commit()


def populate_explicit_windows(conn):
    """Set fraud windows for cases with explicit definitions."""
    updated = 0
    for case_id, window in EXPLICIT_WINDOWS.items():
        inst_ids_json = json.dumps(window.get('fraud_institution_ids')) \
            if window.get('fraud_institution_ids') else None
        contract_types_json = json.dumps(window.get('fraud_contract_types')) \
            if window.get('fraud_contract_types') else None

        conn.execute("""
            UPDATE ground_truth_cases
            SET fraud_year_start = ?,
                fraud_year_end = ?,
                fraud_institution_ids = ?,
                fraud_contract_types = ?,
                label_scope_notes = ?
            WHERE id = ?
        """, (
            window['fraud_year_start'],
            window['fraud_year_end'],
            inst_ids_json,
            contract_types_json,
            window.get('label_scope_notes', ''),
            case_id,
        ))

        if conn.execute("SELECT changes()").fetchone()[0] > 0:
            updated += 1

    conn.commit()
    return updated


def populate_default_windows(conn):
    """For cases without explicit windows, set defaults based on existing year_start/year_end.

    Strategy:
    - If year_start=2002 (Structure A era, unreliable data): bump to 2005
    - If window spans 20+ years: tighten end to min(year_end, 2025)
    - Copy year_start/year_end to fraud_year_start/fraud_year_end
    """
    # Get cases that don't have fraud windows yet
    rows = conn.execute("""
        SELECT id, case_name, year_start, year_end
        FROM ground_truth_cases
        WHERE fraud_year_start IS NULL
    """).fetchall()

    updated = 0
    for row in rows:
        case_id = row['id']
        ys = row['year_start']
        ye = row['year_end']

        if ys is None or ye is None:
            continue

        ys = int(ys)
        ye = int(ye)

        # Apply conservative defaults
        fraud_ys = ys
        fraud_ye = ye
        notes_parts = []

        # Rule 1: If year_start is 2002 or earlier, bump to 2005
        # (Structure A data quality is too poor for reliable labeling)
        if ys <= 2003:
            fraud_ys = max(ys, 2005)
            notes_parts.append(
                f'Bumped start from {ys} to {fraud_ys} '
                f'(Structure A data pre-2005 has 0.1% RFC coverage)'
            )

        # Rule 2: Cap end at 2025 (no future data)
        if ye > 2025:
            fraud_ye = 2025
            notes_parts.append(f'Capped end from {ye} to 2025')

        # If no changes, just copy with a note
        if not notes_parts:
            notes_parts.append(
                f'Default: copied from year_start/year_end ({ys}-{ye})'
            )

        label_notes = 'Auto-default: ' + '; '.join(notes_parts)

        conn.execute("""
            UPDATE ground_truth_cases
            SET fraud_year_start = ?,
                fraud_year_end = ?,
                label_scope_notes = ?
            WHERE id = ?
        """, (fraud_ys, fraud_ye, label_notes, case_id))

        updated += 1

    conn.commit()
    return updated


def create_scoped_view(conn):
    """Create the ground_truth_contracts_scoped view.

    This view restricts positive labels to contracts within the fraud window.
    It handles the dual-join pattern where ground_truth_vendors.case_id
    can match either ground_truth_cases.id or ground_truth_cases.case_id.
    """
    conn.execute("DROP VIEW IF EXISTS ground_truth_contracts_scoped")

    conn.execute("""
        CREATE VIEW ground_truth_contracts_scoped AS
        SELECT
            gtv.case_id as gtv_case_id,
            gtc.id as case_id,
            gtc.case_name,
            gtc.case_type,
            c.id as contract_id,
            c.vendor_id,
            c.contract_year,
            c.institution_id,
            c.amount_mxn,
            c.risk_score,
            c.is_direct_award,
            1 as is_positive_label
        FROM ground_truth_vendors gtv
        JOIN ground_truth_cases gtc
            ON (gtv.case_id = CAST(gtc.id AS TEXT) OR gtv.case_id = gtc.case_id)
        JOIN vendors v ON gtv.vendor_id = v.id
        JOIN contracts c ON c.vendor_id = v.id
        WHERE
            -- Apply temporal scoping using fraud windows (fall back to year_start/year_end)
            c.contract_year >= COALESCE(gtc.fraud_year_start, gtc.year_start, 1900)
            AND c.contract_year <= COALESCE(gtc.fraud_year_end, gtc.year_end, 2100)
            -- Apply institution scoping if specified
            AND (
                gtc.fraud_institution_ids IS NULL
                OR gtc.fraud_institution_ids = 'null'
                OR c.institution_id IN (
                    SELECT value FROM json_each(gtc.fraud_institution_ids)
                )
            )
    """)

    conn.commit()
    print("  Created VIEW ground_truth_contracts_scoped")


def _has_fraud_columns(conn):
    """Check if fraud_year_start column exists."""
    cursor = conn.execute("PRAGMA table_info(ground_truth_cases)")
    columns = {row['name'] for row in cursor.fetchall()}
    return 'fraud_year_start' in columns


def _build_scoping_case_expr(has_fraud_cols):
    """Build the SQL CASE expression for scoping year windows.

    When fraud columns exist, use COALESCE(fraud_year_start, year_start).
    When they don't (dry-run), build an in-memory CASE WHEN for the
    explicitly defined windows, falling back to year_start/year_end.
    """
    if has_fraud_cols:
        return (
            "COALESCE(gtc.fraud_year_start, gtc.year_start, 1900)",
            "COALESCE(gtc.fraud_year_end, gtc.year_end, 2100)"
        )

    # Build CASE expression from EXPLICIT_WINDOWS
    start_parts = []
    end_parts = []
    for case_id, w in EXPLICIT_WINDOWS.items():
        start_parts.append(f"WHEN gtc.id = {case_id} THEN {w['fraud_year_start']}")
        end_parts.append(f"WHEN gtc.id = {case_id} THEN {w['fraud_year_end']}")

    start_expr = f"CASE {' '.join(start_parts)} ELSE COALESCE(gtc.year_start, 1900) END"
    end_expr = f"CASE {' '.join(end_parts)} ELSE COALESCE(gtc.year_end, 2100) END"

    # Also apply the default rule: if year_start <= 2003, bump to 2005
    start_expr = f"CASE WHEN ({start_expr}) <= 2003 THEN 2005 ELSE ({start_expr}) END"

    return start_expr, end_expr


def compute_stats(conn):
    """Show before/after statistics."""
    print("\n" + "=" * 80)
    print("SCOPING IMPACT ANALYSIS")
    print("=" * 80)

    has_fraud_cols = _has_fraud_columns(conn)
    start_expr, end_expr = _build_scoping_case_expr(has_fraud_cols)

    # Overall counts
    row = conn.execute("""
        SELECT COUNT(DISTINCT c.id) as total
        FROM ground_truth_vendors gtv
        JOIN ground_truth_cases gtc
            ON (gtv.case_id = CAST(gtc.id AS TEXT) OR gtv.case_id = gtc.case_id)
        JOIN vendors v ON gtv.vendor_id = v.id
        JOIN contracts c ON c.vendor_id = v.id
    """).fetchone()
    total_unscoped = row['total']

    # Check if view exists
    view_exists = conn.execute("""
        SELECT name FROM sqlite_master
        WHERE type='view' AND name='ground_truth_contracts_scoped'
    """).fetchone()

    if view_exists:
        row = conn.execute(
            "SELECT COUNT(DISTINCT contract_id) as total FROM ground_truth_contracts_scoped"
        ).fetchone()
        total_scoped = row['total']
    else:
        # Simulate scoping
        row = conn.execute(f"""
            SELECT COUNT(DISTINCT c.id) as total
            FROM ground_truth_vendors gtv
            JOIN ground_truth_cases gtc
                ON (gtv.case_id = CAST(gtc.id AS TEXT) OR gtv.case_id = gtc.case_id)
            JOIN vendors v ON gtv.vendor_id = v.id
            JOIN contracts c ON c.vendor_id = v.id
            WHERE c.contract_year >= ({start_expr})
              AND c.contract_year <= ({end_expr})
        """).fetchone()
        total_scoped = row['total']

    removed = total_unscoped - total_scoped
    pct_removed = (removed / total_unscoped * 100) if total_unscoped > 0 else 0

    print(f"\n  Total GT contracts (unscoped): {total_unscoped:>10,}")
    print(f"  Total GT contracts (scoped):   {total_scoped:>10,}")
    print(f"  Contracts removed:             {removed:>10,} ({pct_removed:.1f}%)")

    # Average risk scores
    row_unscoped = conn.execute("""
        SELECT ROUND(AVG(c.risk_score), 4) as avg_risk
        FROM ground_truth_vendors gtv
        JOIN ground_truth_cases gtc
            ON (gtv.case_id = CAST(gtc.id AS TEXT) OR gtv.case_id = gtc.case_id)
        JOIN vendors v ON gtv.vendor_id = v.id
        JOIN contracts c ON c.vendor_id = v.id
        WHERE c.risk_score IS NOT NULL
    """).fetchone()

    if view_exists:
        row_scoped = conn.execute("""
            SELECT ROUND(AVG(c.risk_score), 4) as avg_risk
            FROM ground_truth_contracts_scoped gcs
            JOIN contracts c ON gcs.contract_id = c.id
            WHERE c.risk_score IS NOT NULL
        """).fetchone()
    else:
        row_scoped = conn.execute(f"""
            SELECT ROUND(AVG(c.risk_score), 4) as avg_risk
            FROM ground_truth_vendors gtv
            JOIN ground_truth_cases gtc
                ON (gtv.case_id = CAST(gtc.id AS TEXT) OR gtv.case_id = gtc.case_id)
            JOIN vendors v ON gtv.vendor_id = v.id
            JOIN contracts c ON c.vendor_id = v.id
            WHERE c.risk_score IS NOT NULL
              AND c.contract_year >= ({start_expr})
              AND c.contract_year <= ({end_expr})
        """).fetchone()

    print(f"\n  Avg risk score (unscoped): {row_unscoped['avg_risk']}")
    print(f"  Avg risk score (scoped):   {row_scoped['avg_risk']}")

    # Per-case breakdown for the top 15 most impacted cases
    print("\n" + "-" * 80)
    print("TOP 15 CASES BY CONTRACTS REMOVED")
    print("-" * 80)
    print(f"  {'ID':>4}  {'Case Name':<55} {'Total':>7} {'Scoped':>7} {'Removed':>7} {'%':>5}")
    print(f"  {'':->4}  {'':->55} {'':->7} {'':->7} {'':->7} {'':->5}")

    rows = conn.execute(f"""
        WITH unscoped AS (
            SELECT
                gtc.id as case_id,
                SUBSTR(gtc.case_name, 1, 55) as case_name,
                COUNT(DISTINCT c.id) as total_ct
            FROM ground_truth_cases gtc
            JOIN ground_truth_vendors gtv
                ON (gtv.case_id = CAST(gtc.id AS TEXT) OR gtv.case_id = gtc.case_id)
            JOIN vendors v ON gtv.vendor_id = v.id
            JOIN contracts c ON c.vendor_id = v.id
            GROUP BY gtc.id, gtc.case_name
        ),
        scoped AS (
            SELECT
                gtc.id as case_id,
                COUNT(DISTINCT c.id) as scoped_ct
            FROM ground_truth_cases gtc
            JOIN ground_truth_vendors gtv
                ON (gtv.case_id = CAST(gtc.id AS TEXT) OR gtv.case_id = gtc.case_id)
            JOIN vendors v ON gtv.vendor_id = v.id
            JOIN contracts c ON c.vendor_id = v.id
            WHERE c.contract_year >= ({start_expr})
              AND c.contract_year <= ({end_expr})
            GROUP BY gtc.id
        )
        SELECT
            u.case_id, u.case_name, u.total_ct,
            COALESCE(s.scoped_ct, 0) as scoped_ct,
            u.total_ct - COALESCE(s.scoped_ct, 0) as removed
        FROM unscoped u
        LEFT JOIN scoped s ON u.case_id = s.case_id
        WHERE u.total_ct - COALESCE(s.scoped_ct, 0) > 0
        ORDER BY removed DESC
        LIMIT 15
    """).fetchall()

    for row in rows:
        pct = (row['removed'] / row['total_ct'] * 100) if row['total_ct'] > 0 else 0
        print(f"  {row['case_id']:>4}  {row['case_name']:<55} {row['total_ct']:>7,} {row['scoped_ct']:>7,} {row['removed']:>7,} {pct:>4.1f}%")

    # Window coverage stats
    print("\n" + "-" * 80)
    print("WINDOW COVERAGE")
    print("-" * 80)

    if has_fraud_cols:
        row = conn.execute("""
            SELECT
                COUNT(*) as total_cases,
                SUM(CASE WHEN fraud_year_start IS NOT NULL THEN 1 ELSE 0 END) as with_fraud_window,
                SUM(CASE WHEN fraud_year_start IS NULL THEN 1 ELSE 0 END) as without_fraud_window
            FROM ground_truth_cases
        """).fetchone()

        print(f"  Total cases:              {row['total_cases']}")
        print(f"  With fraud window set:    {row['with_fraud_window']}")
        print(f"  Without fraud window:     {row['without_fraud_window']}")
    else:
        total_cases = conn.execute("SELECT COUNT(*) as n FROM ground_truth_cases").fetchone()['n']
        print(f"  Total cases:              {total_cases}")
        print(f"  (fraud_year_start column not yet created — showing simulation)")

    explicit_count = len(EXPLICIT_WINDOWS)
    print(f"  Explicitly defined:       {explicit_count}")


def main():
    parser = argparse.ArgumentParser(
        description='Add fraud time windows to ground_truth_cases for contract-level labeling'
    )
    parser.add_argument('--apply', action='store_true',
                        help='Apply changes to the database (default: dry run)')
    parser.add_argument('--stats-only', action='store_true',
                        help='Only show statistics, no changes')
    args = parser.parse_args()

    print("=" * 80)
    print("GROUND TRUTH FRAUD WINDOW SCOPING")
    print("=" * 80)
    print(f"  Database: {DB_PATH}")
    print(f"  Mode: {'APPLY' if args.apply else 'STATS ONLY' if args.stats_only else 'DRY RUN'}")
    print(f"  Explicit windows defined: {len(EXPLICIT_WINDOWS)} cases")

    if args.stats_only:
        with get_connection(readonly=True) as conn:
            compute_stats(conn)
        return

    if not args.apply:
        print("\n  DRY RUN — showing what would change. Use --apply to execute.\n")

        # Show the explicit windows that would be set
        print("-" * 80)
        print("TIER 1: TIGHT WINDOWS (well-documented fraud periods)")
        print("-" * 80)
        for case_id, w in sorted(TIGHT_WINDOWS.items()):
            print(f"  Case {case_id}: {w['fraud_year_start']}-{w['fraud_year_end']}")
            notes = w.get('label_scope_notes', '')
            if notes:
                # Wrap notes
                for i in range(0, len(notes), 75):
                    prefix = "    " if i > 0 else "    → "
                    print(f"{prefix}{notes[i:i+75]}")

        print()
        print("-" * 80)
        print("TIER 2: MODERATE WINDOWS (tightened from 2002-2025)")
        print("-" * 80)
        for case_id, w in sorted(MODERATE_WINDOWS.items()):
            print(f"  Case {case_id}: {w['fraud_year_start']}-{w['fraud_year_end']}")

        # Show impact simulation
        with get_connection(readonly=True) as conn:
            compute_stats(conn)

        print("\n  To apply these changes, run with --apply")
        return

    # APPLY MODE
    print("\n  Applying changes...")

    conn = get_connection(readonly=False)
    try:
        # Step 1: Add columns
        print("\nStep 1: Adding columns to ground_truth_cases...")
        add_columns(conn)

        # Step 2: Populate explicit windows
        print("\nStep 2: Setting explicit fraud windows...")
        n_explicit = populate_explicit_windows(conn)
        print(f"  Set explicit windows for {n_explicit} cases")

        # Step 3: Populate defaults for remaining cases
        print("\nStep 3: Setting default windows for remaining cases...")
        n_default = populate_default_windows(conn)
        print(f"  Set default windows for {n_default} cases")

        # Step 4: Create scoped view
        print("\nStep 4: Creating scoped view...")
        create_scoped_view(conn)

        # Step 5: Show stats
        compute_stats(conn)

        print("\n  DONE. Changes applied successfully.")
        print("  Next step: update calibrate_risk_model_v6_enhanced.py to use")
        print("  ground_truth_contracts_scoped instead of the unscoped join.")

    except Exception as e:
        conn.rollback()
        print(f"\n  ERROR: {e}")
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
