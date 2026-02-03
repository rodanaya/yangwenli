"""
Investigation Dossier Generator
================================
Generates qualitative investigation dossiers (narratives) for investigation cases.

Each dossier includes:
- Executive summary for editorial meetings
- Key statistics table
- Vendor details with risk metrics
- Suspicious patterns detected
- Investigation questions
- Validation search queries

Author: Yang Wen-li Project
Date: 2026-02-03
"""

import sqlite3
import os
import json
from datetime import datetime
from typing import Dict, List, Optional
from textwrap import dedent

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')

# Target sectors
TARGET_SECTORS = [1, 3]  # Salud, Infraestructura


def get_case_level_explanation(cursor: sqlite3.Cursor, case_id: int, vendors: List) -> Optional[str]:
    """
    Get aggregated SHAP explanation for the entire case based on primary vendors.

    Returns:
        Markdown formatted case-level explanation or None if not available
    """
    if not vendors:
        return None

    # Get sector_id from case
    cursor.execute("SELECT primary_sector_id FROM investigation_cases WHERE id = ?", (case_id,))
    case_row = cursor.fetchone()
    if not case_row:
        return None
    sector_id = case_row['primary_sector_id']

    # Get SHAP explanations for primary suspects
    primary_vendors = [v for v in vendors if v['role'] == 'primary_suspect'][:3]
    if not primary_vendors:
        primary_vendors = vendors[:3]

    # Aggregate top features across vendors
    feature_contributions = {}

    for v in primary_vendors:
        cursor.execute("""
            SELECT top_features, ensemble_score
            FROM vendor_investigation_features
            WHERE vendor_id = ? AND sector_id = ?
        """, (v['vendor_id'], sector_id))
        row = cursor.fetchone()

        if row and row['top_features']:
            try:
                top_features = json.loads(row['top_features'])
                for tf in top_features[:5]:
                    feature = tf.get('feature', '')
                    contribution = tf.get('contribution', 0)
                    if feature not in feature_contributions:
                        feature_contributions[feature] = []
                    feature_contributions[feature].append({
                        'contribution': contribution,
                        'comparison': tf.get('comparison', ''),
                        'vendor_name': v['vendor_name']
                    })
            except:
                pass

    if not feature_contributions:
        return None

    # Sort by total contribution across vendors
    sorted_features = sorted(
        feature_contributions.items(),
        key=lambda x: sum(abs(c['contribution']) for c in x[1]),
        reverse=True
    )

    # Build explanation
    explanation_parts = []
    explanation_parts.append("The ML model flagged this case based on the following combined signals:\n")

    for i, (feature, contributions) in enumerate(sorted_features[:5], 1):
        feature_display = feature.replace('_', ' ').title()
        avg_contribution = sum(c['contribution'] for c in contributions) / len(contributions)
        direction = "+" if avg_contribution > 0 else ""

        # Get example comparison from first vendor
        example_comparison = contributions[0]['comparison'] if contributions else ''

        vendor_names = [c['vendor_name'][:25] for c in contributions[:2]]
        vendor_str = ", ".join(vendor_names)

        explanation_parts.append(
            f"**{i}. {feature_display}** (avg contribution: {direction}{avg_contribution:.3f})\n"
            f"   - {example_comparison}\n"
            f"   - Affects: {vendor_str}\n"
        )

    return "\n".join(explanation_parts)


def get_vendor_explanation(cursor: sqlite3.Cursor, vendor_id: int, sector_id: int) -> Optional[str]:
    """
    Get SHAP-based explanation for why a vendor was flagged.

    Returns:
        Markdown formatted explanation or None if not available
    """
    cursor.execute("""
        SELECT top_features, explanation, ensemble_score,
               single_bid_ratio, direct_award_ratio, high_conf_hypothesis_count,
               total_contracts, total_value_mxn, avg_risk_score
        FROM vendor_investigation_features
        WHERE vendor_id = ? AND sector_id = ?
    """, (vendor_id, sector_id))

    row = cursor.fetchone()
    if not row or not row['top_features']:
        return None

    try:
        top_features = json.loads(row['top_features'])
    except:
        return None

    if not top_features:
        return None

    # Build "Why This Vendor Was Flagged" section
    explanation_parts = ["#### Why This Vendor Was Flagged\n"]

    # Add overall context
    score = row['ensemble_score'] or 0
    if score >= 0.6:
        risk_level = "CRITICAL"
    elif score >= 0.4:
        risk_level = "HIGH"
    elif score >= 0.2:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    explanation_parts.append(f"This vendor scored **{score:.3f}** ({risk_level} risk) based on the following factors:\n")

    # Add top contributing features
    for i, tf in enumerate(top_features[:5], 1):
        feature_name = tf.get('feature', '')
        contribution = tf.get('contribution', 0)
        comparison = tf.get('comparison', '')
        value = tf.get('value', 0)

        # Format feature name nicely
        feature_display = feature_name.replace('_', ' ').title()

        # Direction indicator
        direction = "+" if contribution > 0 else ""

        # Get additional context based on feature type
        context = ""
        if feature_name == 'single_bid_ratio':
            actual_pct = (row['single_bid_ratio'] or 0) * 100
            context = f" ({actual_pct:.0f}% of contracts were single-bid)"
        elif feature_name == 'direct_award_ratio':
            actual_pct = (row['direct_award_ratio'] or 0) * 100
            context = f" ({actual_pct:.0f}% direct awards)"
        elif feature_name == 'high_conf_hypothesis_count':
            count = row['high_conf_hypothesis_count'] or 0
            context = f" ({count:,} price anomalies flagged)"
        elif feature_name == 'total_value_mxn':
            value_str = f"${row['total_value_mxn']/1e9:.2f}B" if row['total_value_mxn'] >= 1e9 else f"${row['total_value_mxn']/1e6:.1f}M"
            context = f" (total value: {value_str})"
        elif feature_name == 'avg_risk_score':
            context = f" (avg risk: {row['avg_risk_score']:.3f})"

        explanation_parts.append(
            f"{i}. **{feature_display}**: {direction}{contribution:.3f} - {comparison}{context}\n"
        )

    return "\n".join(explanation_parts)


def generate_dossiers(sector_ids: Optional[List[int]] = None) -> int:
    """
    Generate dossiers for all cases in specified sectors.
    """
    if sector_ids is None:
        sector_ids = TARGET_SECTORS

    print(f"Starting dossier generation for sectors: {sector_ids}")
    print(f"Database: {DB_PATH}")
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    sector_list = ','.join(str(s) for s in sector_ids)

    # Get all cases
    cursor.execute(f"""
        SELECT
            ic.id, ic.case_id, ic.case_type, ic.primary_sector_id,
            ic.suspicion_score, ic.anomaly_score, ic.confidence,
            ic.title, ic.total_contracts, ic.total_value_mxn,
            ic.estimated_loss_mxn, ic.date_range_start, ic.date_range_end,
            ic.signals_triggered, ic.risk_factor_counts, ic.priority,
            s.name_es as sector_name, s.code as sector_code
        FROM investigation_cases ic
        JOIN sectors s ON ic.primary_sector_id = s.id
        WHERE ic.primary_sector_id IN ({sector_list})
        ORDER BY ic.suspicion_score DESC
    """)

    cases = cursor.fetchall()
    print(f"Found {len(cases)} cases to process")

    processed = 0
    for case in cases:
        print(f"  Generating dossier for {case['case_id']}...")

        # Generate narrative
        narrative = generate_narrative(cursor, case)

        # Generate summary
        summary = generate_summary(cursor, case)

        # Generate questions
        questions = generate_questions(cursor, case)

        # Generate external source queries
        external_sources = generate_search_queries(cursor, case)

        # Update case with narrative and summary
        cursor.execute("""
            UPDATE investigation_cases
            SET narrative = ?, summary = ?, external_sources = ?
            WHERE id = ?
        """, (narrative, summary, json.dumps(external_sources), case['id']))

        # Save questions
        for q in questions:
            cursor.execute("""
                INSERT INTO case_questions (case_id, question_type, question_text, supporting_evidence, priority)
                VALUES (?, ?, ?, ?, ?)
            """, (case['id'], q['type'], q['text'], json.dumps(q.get('evidence', [])), q.get('priority', 3)))

        processed += 1

    conn.commit()
    print(f"\nGenerated dossiers for {processed} cases")

    # Print sample dossier
    if cases:
        print("\n" + "="*60)
        print("SAMPLE DOSSIER (TOP CASE)")
        print("="*60)
        cursor.execute("SELECT narrative FROM investigation_cases WHERE id = ?", (cases[0]['id'],))
        row = cursor.fetchone()
        if row:
            print(row['narrative'][:3000] + "..." if len(row['narrative']) > 3000 else row['narrative'])

    conn.close()
    return processed


def generate_narrative(cursor: sqlite3.Cursor, case: sqlite3.Row) -> str:
    """
    Generate the full markdown investigation dossier.
    """
    case_id = case['case_id']
    sector_name = case['sector_name']

    # Get vendors for this case
    cursor.execute("""
        SELECT cv.*, v.name as vendor_name, v.rfc
        FROM case_vendors cv
        JOIN vendors v ON cv.vendor_id = v.id
        WHERE cv.case_id = ?
        ORDER BY cv.contract_value_mxn DESC
    """, (case['id'],))
    vendors = cursor.fetchall()

    # Get top institutions
    if vendors:
        vendor_ids = [v['vendor_id'] for v in vendors]
        placeholders = ','.join(['?'] * len(vendor_ids))
        cursor.execute(f"""
            SELECT i.name, COUNT(*) as cnt, SUM(c.amount_mxn) as total
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE c.vendor_id IN ({placeholders}) AND c.sector_id = ?
            GROUP BY c.institution_id
            ORDER BY total DESC
            LIMIT 5
        """, vendor_ids + [case['primary_sector_id']])
        top_institutions = cursor.fetchall()
    else:
        top_institutions = []

    # Parse JSON fields
    signals = json.loads(case['signals_triggered']) if case['signals_triggered'] else []
    risk_factors = json.loads(case['risk_factor_counts']) if case['risk_factor_counts'] else {}

    # Format values
    total_value = case['total_value_mxn'] or 0
    estimated_loss = case['estimated_loss_mxn'] or 0

    if total_value >= 1e9:
        value_str = f"${total_value/1e9:.2f} billion MXN"
    else:
        value_str = f"${total_value/1e6:.1f} million MXN"

    if estimated_loss >= 1e9:
        loss_str = f"${estimated_loss/1e9:.2f} billion MXN"
    else:
        loss_str = f"${estimated_loss/1e6:.1f} million MXN"

    # Build narrative
    narrative = f"""# Investigation Case: {case_id}

## Executive Summary

**{case['title']}**

This case involves {len(vendors)} vendor(s) with **{case['total_contracts']:,} contracts** totaling **{value_str}** in the **{sector_name}** sector between {case['date_range_start'] or 'N/A'} and {case['date_range_end'] or 'N/A'}.

The case has a **suspicion score of {case['suspicion_score']:.2f}** (scale 0-1), placing it in the **{"CRITICAL" if case['suspicion_score'] >= 0.6 else "HIGH" if case['suspicion_score'] >= 0.4 else "MEDIUM"}** risk category.

**Estimated potential loss: {loss_str}** (based on IMF corruption impact methodology)

---

## Key Statistics

| Metric | Value |
|--------|-------|
| **Case ID** | {case_id} |
| **Case Type** | {case['case_type'].replace('_', ' ').title()} |
| **Sector** | {sector_name} |
| **Total Contracts** | {case['total_contracts']:,} |
| **Total Value** | {value_str} |
| **Estimated Loss** | {loss_str} |
| **Date Range** | {case['date_range_start'] or 'N/A'} to {case['date_range_end'] or 'N/A'} |
| **Suspicion Score** | {case['suspicion_score']:.3f} |
| **Anomaly Score (ML)** | {case['anomaly_score']:.3f} |
| **Confidence** | {case['confidence']:.0%} |
| **Priority** | {"★" * case['priority']} ({case['priority']}/5) |

---

## Vendors Involved

"""

    for i, v in enumerate(vendors, 1):
        role_emoji = "🔴" if v['role'] == 'primary_suspect' else "🟠"
        v_value = v['contract_value_mxn'] or 0
        v_value_str = f"${v_value/1e9:.2f}B" if v_value >= 1e9 else f"${v_value/1e6:.1f}M"

        narrative += f"""### {i}. {v['vendor_name']} {role_emoji}

- **RFC:** {v['rfc'] or 'Not available'}
- **Role:** {v['role'].replace('_', ' ').title()}
- **Contracts:** {v['contract_count'] or 0:,}
- **Total Value:** {v_value_str}
- **Avg Risk Score:** {(v['avg_risk_score'] or 0):.3f}

"""
        # Add SHAP explanation if available
        vendor_explanation = get_vendor_explanation(cursor, v['vendor_id'], case['primary_sector_id'])
        if vendor_explanation:
            narrative += vendor_explanation + "\n"

    narrative += """---

## Top Government Clients

| Institution | Contracts | Total Value |
|-------------|-----------|-------------|
"""

    for inst in top_institutions:
        inst_value = inst['total'] or 0
        inst_value_str = f"${inst_value/1e9:.2f}B" if inst_value >= 1e9 else f"${inst_value/1e6:.1f}M"
        narrative += f"| {inst['name'][:50]} | {inst['cnt']:,} | {inst_value_str} |\n"

    narrative += """
---

## Why This Case Was Flagged (ML Explanation)

"""

    # Get aggregated SHAP explanations for the case
    case_explanation = get_case_level_explanation(cursor, case['id'], vendors)
    if case_explanation:
        narrative += case_explanation
    else:
        narrative += "*SHAP explanations not available. Run anomaly detector with SHAP enabled.*\n"

    narrative += """
---

## Suspicious Patterns Detected

"""

    signal_descriptions = {
        'high_single_bid_rate': '**High Single Bid Rate:** Over 50% of contracts were awarded with only one bidder, indicating possible restricted competition or bid rigging.',
        'high_direct_award_rate': '**High Direct Award Rate:** Over 70% of contracts were direct awards, bypassing competitive processes.',
        'multiple_price_anomalies': '**Multiple Price Anomalies:** Numerous contracts flagged for pricing significantly above sector medians.',
        'year_end_concentration': '**Year-End Concentration:** Over 30% of contracts awarded in December, suggesting budget exhaustion pressure.',
        'high_avg_risk_score': '**High Average Risk Score:** Contracts consistently show elevated risk across multiple factors.',
        'corporate_group_pattern': '**Corporate Group Pattern:** Multiple related entities receiving contracts, potentially fragmenting awards to avoid scrutiny.',
        'multi_entity_anomaly': '**Multi-Entity Anomaly:** Several related vendors show anomalous patterns simultaneously.',
        'coordinated_bidding': '**Coordinated Bidding:** Evidence of vendors repeatedly participating in same tenders together.',
        'network_anomaly': '**Network Anomaly:** Unusual co-bidding network patterns detected.',
    }

    if signals:
        for signal in signals:
            desc = signal_descriptions.get(signal, f'**{signal.replace("_", " ").title()}**')
            narrative += f"- {desc}\n"
    else:
        narrative += "- No specific patterns flagged (general anomaly detection triggered)\n"

    narrative += """
### Risk Factor Counts

"""

    if risk_factors:
        for factor, count in risk_factors.items():
            narrative += f"- **{factor.replace('_', ' ').title()}:** {count:,}\n"

    narrative += """
---

## Investigation Questions

*These questions are designed to guide investigative journalists in verifying the patterns detected.*

"""

    return narrative


def generate_summary(cursor: sqlite3.Cursor, case: sqlite3.Row) -> str:
    """
    Generate a 1-2 paragraph executive summary suitable for editorial meetings.
    """
    total_value = case['total_value_mxn'] or 0
    estimated_loss = case['estimated_loss_mxn'] or 0

    if total_value >= 1e9:
        value_str = f"${total_value/1e9:.2f} billion"
    else:
        value_str = f"${total_value/1e6:.1f} million"

    if estimated_loss >= 1e9:
        loss_str = f"${estimated_loss/1e9:.2f} billion"
    else:
        loss_str = f"${estimated_loss/1e6:.1f} million"

    signals = json.loads(case['signals_triggered']) if case['signals_triggered'] else []

    # Get primary vendor name
    cursor.execute("""
        SELECT v.name FROM case_vendors cv
        JOIN vendors v ON cv.vendor_id = v.id
        WHERE cv.case_id = ?
        ORDER BY cv.contract_value_mxn DESC
        LIMIT 1
    """, (case['id'],))
    primary = cursor.fetchone()
    primary_name = primary['name'] if primary else "Unknown"

    signal_text = ""
    if 'high_single_bid_rate' in signals:
        signal_text += "high single-bid rates, "
    if 'high_direct_award_rate' in signals:
        signal_text += "excessive direct awards, "
    if 'multiple_price_anomalies' in signals:
        signal_text += "pricing anomalies, "
    if 'year_end_concentration' in signals:
        signal_text += "year-end contract clustering, "
    signal_text = signal_text.rstrip(", ") or "anomalous procurement patterns"

    summary = f"""Investigation case {case['case_id']} flags {primary_name} and related entities for {value_str} MXN in {case['sector_name']} sector procurement ({case['date_range_start']} to {case['date_range_end']}). The case achieved a suspicion score of {case['suspicion_score']:.2f}/1.0 based on {signal_text}.

Using IMF-aligned corruption impact methodology, estimated potential losses range up to {loss_str} MXN. Key investigation angles include verifying competitive bidding processes, examining vendor relationships, and comparing contract pricing to market rates."""

    return summary


def generate_questions(cursor: sqlite3.Cursor, case: sqlite3.Row) -> List[Dict]:
    """
    Generate investigation questions based on detected patterns.
    """
    questions = []
    signals = json.loads(case['signals_triggered']) if case['signals_triggered'] else []
    risk_factors = json.loads(case['risk_factor_counts']) if case['risk_factor_counts'] else {}

    # Get vendors
    cursor.execute("""
        SELECT cv.*, v.name as vendor_name, v.rfc
        FROM case_vendors cv
        JOIN vendors v ON cv.vendor_id = v.id
        WHERE cv.case_id = ?
    """, (case['id'],))
    vendors = cursor.fetchall()
    primary_vendor = vendors[0] if vendors else None

    # Generic questions for all cases
    questions.append({
        'type': 'procedures',
        'text': f"Were competitive bidding procedures properly followed for contracts with {primary_vendor['vendor_name'] if primary_vendor else 'these vendors'}? Request procurement files to verify.",
        'evidence': ['Case suspicion score above threshold'],
        'priority': 5
    })

    # Signal-specific questions
    if 'high_single_bid_rate' in signals:
        single_bid_count = risk_factors.get('single_bid', 0)
        questions.append({
            'type': 'procedures',
            'text': f"Why did {single_bid_count:,} contracts have only a single bidder? Were tender requirements designed to exclude other vendors?",
            'evidence': [f"{single_bid_count} single-bid contracts detected"],
            'priority': 5
        })

    if 'high_direct_award_rate' in signals:
        da_count = risk_factors.get('direct_award', 0)
        questions.append({
            'type': 'procedures',
            'text': f"What justifications were provided for {da_count:,} direct award contracts? Do they meet legal thresholds under LAASSP Article 41?",
            'evidence': [f"{da_count} direct awards detected"],
            'priority': 4
        })

    if 'multiple_price_anomalies' in signals:
        hyp_count = risk_factors.get('price_hypothesis', 0)
        questions.append({
            'type': 'pricing',
            'text': f"Contract pricing shows {hyp_count:,} statistical anomalies above sector medians. Were market price studies conducted? Can the institution justify these prices?",
            'evidence': [f"{hyp_count} price anomalies flagged"],
            'priority': 5
        })

    if 'year_end_concentration' in signals:
        ye_count = risk_factors.get('year_end', 0)
        questions.append({
            'type': 'timing',
            'text': f"Why were {ye_count:,} contracts ({(ye_count / (case['total_contracts'] or 1) * 100):.0f}%) signed in December? Was this driven by budget exhaustion rather than actual need?",
            'evidence': [f"Year-end concentration detected"],
            'priority': 3
        })

    if 'corporate_group_pattern' in signals or case['case_type'] == 'corporate_group':
        group_size = risk_factors.get('group_members', len(vendors))
        questions.append({
            'type': 'relationships',
            'text': f"This case involves {group_size} related corporate entities. Were procuring officials aware of these relationships? Did they fragment contracts to avoid oversight thresholds?",
            'evidence': [f"{group_size} related entities identified"],
            'priority': 4
        })

    # Relationship questions
    if primary_vendor:
        questions.append({
            'type': 'relationships',
            'text': f"Are there any personal or financial connections between officials at the procuring institutions and {primary_vendor['vendor_name']}? Check SAT records, corporate registries.",
            'evidence': ['Standard due diligence check'],
            'priority': 4
        })

    # Verification question
    questions.append({
        'type': 'verification',
        'text': "Have any of these contracts or vendors been flagged in ASF (Superior Audit) reports or SFP investigations?",
        'evidence': ['Cross-reference with audit databases'],
        'priority': 3
    })

    return questions


def generate_search_queries(cursor: sqlite3.Cursor, case: sqlite3.Row) -> List[Dict]:
    """
    Generate search queries for external validation.
    """
    queries = []

    # Get vendors
    cursor.execute("""
        SELECT v.name, v.rfc FROM case_vendors cv
        JOIN vendors v ON cv.vendor_id = v.id
        WHERE cv.case_id = ?
    """, (case['id'],))
    vendors = cursor.fetchall()

    # Get top institutions
    if vendors:
        vendor_ids_str = ','.join([str(v['rfc']) for v in vendors if v['rfc']])
        cursor.execute("""
            SELECT DISTINCT i.name FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE c.vendor_id IN (
                SELECT vendor_id FROM case_vendors WHERE case_id = ?
            ) AND c.sector_id = ?
            LIMIT 3
        """, (case['id'], case['primary_sector_id']))
        institutions = [r['name'] for r in cursor.fetchall()]
    else:
        institutions = []

    for vendor in vendors[:3]:  # Top 3 vendors
        vendor_name = vendor['name']
        short_name = vendor_name.split(',')[0].split(' S.')[0][:30]

        queries.append({
            'query': f'"{short_name}" corrupcion Mexico',
            'purpose': 'Search for corruption allegations'
        })

        queries.append({
            'query': f'"{short_name}" licitacion irregularidad',
            'purpose': 'Search for procurement irregularities'
        })

        if vendor['rfc']:
            queries.append({
                'query': f'{vendor["rfc"]} SAT empresa fantasma',
                'purpose': 'Check for ghost company status'
            })

    for inst in institutions[:2]:
        short_inst = inst.split(' DE ')[0][:30] if ' DE ' in inst else inst[:30]
        queries.append({
            'query': f'"{short_inst}" auditoria ASF irregularidades',
            'purpose': 'Search for audit findings'
        })

    return queries


if __name__ == "__main__":
    print("="*60)
    print("INVESTIGATION DOSSIER GENERATOR")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    start = datetime.now()
    generate_dossiers(TARGET_SECTORS)
    elapsed = (datetime.now() - start).total_seconds()
    print(f"\nDossier generation completed in {elapsed:.1f} seconds")
