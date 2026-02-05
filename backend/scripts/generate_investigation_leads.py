#!/usr/bin/env python3
"""
Investigation Leads Generator

Auto-generate prioritized investigation leads based on detected patterns.
This is the core output for users: actionable leads for manual review.

Lead Types:
1. Top Risk Contracts - Highest risk scores with full factor breakdown
2. Suspicious Clusters - Co-bidding groups with rotation patterns
3. Concentration Alerts - Vendors dominating institutions
4. Price Outliers - Contracts with extreme price hypotheses
5. Year-End Patterns - December contracts with elevated risk

Each lead includes:
- Specific entities (contracts, vendors, institutions)
- Evidence summary
- Risk indicators
- Recommended verification steps

Usage:
    python backend/scripts/generate_investigation_leads.py [--top 20] [--output-dir reports]
"""

import sqlite3
import argparse
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def get_connection() -> sqlite3.Connection:
    """Get database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def print_section(title: str):
    """Print formatted section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def generate_top_risk_contracts(conn: sqlite3.Connection, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Lead Type 1: Top Risk Contracts

    Highest risk score contracts with full breakdown.
    """
    print_section(f"LEAD TYPE 1: Top {limit} Risk Contracts")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            c.id,
            c.contract_number,
            c.procedure_number,
            c.title,
            c.amount_mxn,
            c.contract_year,
            c.contract_date,
            c.risk_score,
            c.risk_level,
            c.risk_factors,
            c.is_direct_award,
            c.is_single_bid,
            c.is_year_end,
            v.name as vendor_name,
            v.rfc as vendor_rfc,
            i.name as institution_name,
            s.name_es as sector_name,
            ph.hypothesis_type as price_hypothesis,
            ph.confidence as price_confidence
        FROM contracts c
        LEFT JOIN vendors v ON c.vendor_id = v.id
        LEFT JOIN institutions i ON c.institution_id = i.id
        LEFT JOIN sectors s ON c.sector_id = s.id
        LEFT JOIN price_hypotheses ph ON c.id = ph.contract_id
        WHERE c.risk_score IS NOT NULL
          AND c.amount_mxn > 1000000  -- At least 1M MXN
          AND c.amount_mxn < 100000000000
        ORDER BY c.risk_score DESC, c.amount_mxn DESC
        LIMIT ?
    """, (limit,))

    leads = []
    for row in cursor.fetchall():
        factors = row['risk_factors'].split(',') if row['risk_factors'] else []

        lead = {
            'lead_type': 'top_risk_contract',
            'priority': 'HIGH' if row['risk_score'] >= 0.5 else 'MEDIUM',
            'contract_id': row['id'],
            'contract_number': row['contract_number'],
            'procedure_number': row['procedure_number'],
            'title': (row['title'] or '')[:100],
            'amount_mxn': row['amount_mxn'],
            'amount_display': f"{row['amount_mxn']/1e6:.1f}M MXN" if row['amount_mxn'] < 1e9 else f"{row['amount_mxn']/1e9:.2f}B MXN",
            'year': row['contract_year'],
            'date': row['contract_date'],
            'risk_score': row['risk_score'],
            'risk_level': row['risk_level'],
            'risk_factors': factors,
            'vendor_name': row['vendor_name'],
            'vendor_rfc': row['vendor_rfc'],
            'institution_name': row['institution_name'],
            'sector': row['sector_name'],
            'is_direct_award': bool(row['is_direct_award']),
            'is_single_bid': bool(row['is_single_bid']),
            'is_year_end': bool(row['is_year_end']),
            'price_hypothesis': row['price_hypothesis'],
            'price_confidence': row['price_confidence'],
            'verification_steps': [
                f"Search: '{row['vendor_name']}' corrupcion OR investigacion",
                "Check ASF audit reports for this institution",
                "Review vendor's other contracts for patterns",
                "Verify price reasonableness for sector/category"
            ]
        }
        leads.append(lead)

        if len(leads) <= 10:
            print(f"\n  {len(leads)}. [{lead['priority']}] Risk: {lead['risk_score']:.3f}")
            print(f"     Amount: {lead['amount_display']} | {lead['year']}")
            print(f"     Vendor: {(lead['vendor_name'] or 'Unknown')[:45]}")
            print(f"     Institution: {(lead['institution_name'] or 'Unknown')[:45]}")
            print(f"     Factors: {', '.join(factors[:5])}")

    return leads


def generate_suspicious_clusters(conn: sqlite3.Connection, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Lead Type 2: Suspicious Vendor Clusters

    Groups of vendors with high co-bidding rates suggesting coordination.
    """
    print_section(f"LEAD TYPE 2: Top {limit} Suspicious Clusters")
    cursor = conn.cursor()

    # Find high co-bidding pairs
    cursor.execute("""
        WITH vendor_procs AS (
            SELECT vendor_id, COUNT(DISTINCT procedure_number) as proc_count
            FROM contracts
            WHERE procedure_number IS NOT NULL AND procedure_number != ''
            GROUP BY vendor_id
            HAVING proc_count >= 5
        ),
        co_bids AS (
            SELECT
                c1.vendor_id as v1,
                c2.vendor_id as v2,
                COUNT(DISTINCT c1.procedure_number) as co_bid_count
            FROM contracts c1
            JOIN contracts c2 ON c1.procedure_number = c2.procedure_number
            JOIN vendors vn1 ON c1.vendor_id = vn1.id
            JOIN vendors vn2 ON c2.vendor_id = vn2.id
            WHERE c1.vendor_id < c2.vendor_id
              AND c1.procedure_number IS NOT NULL
              AND vn1.is_individual = 0
              AND vn2.is_individual = 0
            GROUP BY c1.vendor_id, c2.vendor_id
            HAVING co_bid_count >= 5
        )
        SELECT
            cb.v1, cb.v2, cb.co_bid_count,
            vp1.proc_count as v1_procs,
            vp2.proc_count as v2_procs,
            v1n.name as v1_name,
            v2n.name as v2_name,
            CAST(cb.co_bid_count AS REAL) / MIN(vp1.proc_count, vp2.proc_count) as min_rate
        FROM co_bids cb
        JOIN vendor_procs vp1 ON cb.v1 = vp1.vendor_id
        JOIN vendor_procs vp2 ON cb.v2 = vp2.vendor_id
        JOIN vendors v1n ON cb.v1 = v1n.id
        JOIN vendors v2n ON cb.v2 = v2n.id
        WHERE CAST(cb.co_bid_count AS REAL) / MIN(vp1.proc_count, vp2.proc_count) >= 0.5
        ORDER BY min_rate DESC, co_bid_count DESC
        LIMIT ?
    """, (limit,))

    leads = []
    for row in cursor.fetchall():
        rate = row['min_rate'] * 100

        # Get combined contract value for this pair
        cursor.execute("""
            SELECT
                COUNT(*) as total_contracts,
                SUM(amount_mxn) as total_value
            FROM contracts
            WHERE vendor_id IN (?, ?)
              AND amount_mxn > 0
              AND amount_mxn < 100000000000
        """, (row['v1'], row['v2']))

        stats = cursor.fetchone()

        lead = {
            'lead_type': 'suspicious_cluster',
            'priority': 'HIGH' if rate >= 80 else 'MEDIUM',
            'vendor_1_id': row['v1'],
            'vendor_1_name': row['v1_name'],
            'vendor_2_id': row['v2'],
            'vendor_2_name': row['v2_name'],
            'co_bid_count': row['co_bid_count'],
            'co_bid_rate': rate,
            'v1_procedures': row['v1_procs'],
            'v2_procedures': row['v2_procs'],
            'combined_contracts': stats['total_contracts'],
            'combined_value_b': (stats['total_value'] or 0) / 1e9,
            'pattern': 'High co-bidding rate suggests coordinated bidding',
            'risk_indicators': [
                'Appear together frequently',
                f'Co-bid rate: {rate:.0f}%',
                'May indicate collusion or related entities'
            ],
            'verification_steps': [
                "Check if vendors share address or legal representative",
                "Look for complementary bidding patterns",
                "Check RFC similarity for related entities",
                f"Search: '{row['v1_name'][:20]}' '{row['v2_name'][:20]}'"
            ]
        }
        leads.append(lead)

        if len(leads) <= 10:
            print(f"\n  {len(leads)}. [{lead['priority']}] Co-bid rate: {rate:.0f}%")
            print(f"     Vendor 1: {row['v1_name'][:40]}")
            print(f"     Vendor 2: {row['v2_name'][:40]}")
            print(f"     Co-bids: {row['co_bid_count']} | Combined value: {lead['combined_value_b']:.1f}B MXN")

    return leads


def generate_concentration_alerts(conn: sqlite3.Connection, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Lead Type 3: Vendor Concentration Alerts

    Vendors with dominant market share at specific institutions.
    """
    print_section(f"LEAD TYPE 3: Top {limit} Concentration Alerts")
    cursor = conn.cursor()

    cursor.execute("""
        WITH inst_totals AS (
            SELECT
                institution_id,
                COUNT(*) as total_contracts,
                SUM(amount_mxn) as total_value
            FROM contracts
            WHERE institution_id IS NOT NULL
              AND amount_mxn > 0
              AND amount_mxn < 100000000000
            GROUP BY institution_id
            HAVING total_contracts >= 100
        ),
        vendor_shares AS (
            SELECT
                c.institution_id,
                c.vendor_id,
                COUNT(*) as vendor_contracts,
                SUM(c.amount_mxn) as vendor_value,
                t.total_contracts,
                t.total_value
            FROM contracts c
            JOIN inst_totals t ON c.institution_id = t.institution_id
            WHERE c.vendor_id IS NOT NULL
              AND c.amount_mxn > 0
            GROUP BY c.institution_id, c.vendor_id
        )
        SELECT
            vs.institution_id,
            vs.vendor_id,
            vs.vendor_contracts,
            vs.vendor_value,
            vs.total_contracts,
            vs.total_value,
            CAST(vs.vendor_value AS REAL) / vs.total_value as value_share,
            v.name as vendor_name,
            v.rfc as vendor_rfc,
            i.name as institution_name
        FROM vendor_shares vs
        JOIN vendors v ON vs.vendor_id = v.id
        JOIN institutions i ON vs.institution_id = i.id
        WHERE CAST(vs.vendor_value AS REAL) / vs.total_value >= 0.25
        ORDER BY value_share DESC
        LIMIT ?
    """, (limit,))

    leads = []
    for row in cursor.fetchall():
        share_pct = row['value_share'] * 100

        # Get average risk score for this vendor at this institution
        cursor.execute("""
            SELECT AVG(risk_score) as avg_risk
            FROM contracts
            WHERE vendor_id = ? AND institution_id = ?
              AND risk_score IS NOT NULL
        """, (row['vendor_id'], row['institution_id']))

        avg_risk = cursor.fetchone()['avg_risk'] or 0

        lead = {
            'lead_type': 'concentration_alert',
            'priority': 'HIGH' if share_pct >= 40 else 'MEDIUM',
            'vendor_id': row['vendor_id'],
            'vendor_name': row['vendor_name'],
            'vendor_rfc': row['vendor_rfc'],
            'institution_id': row['institution_id'],
            'institution_name': row['institution_name'],
            'vendor_contracts': row['vendor_contracts'],
            'vendor_value_b': row['vendor_value'] / 1e9,
            'total_contracts': row['total_contracts'],
            'total_value_b': row['total_value'] / 1e9,
            'value_share_pct': share_pct,
            'avg_risk_score': avg_risk,
            'pattern': f'Vendor controls {share_pct:.0f}% of institution value',
            'risk_indicators': [
                f'{share_pct:.0f}% market share (>{30}% is concerning)',
                f'{row["vendor_contracts"]:,} contracts',
                f'Average risk: {avg_risk:.3f}'
            ],
            'verification_steps': [
                "Check for direct award patterns",
                "Review competitive procedure outcomes",
                "Look for specification manipulation indicators",
                "Compare prices to sector benchmarks"
            ]
        }
        leads.append(lead)

        if len(leads) <= 10:
            print(f"\n  {len(leads)}. [{lead['priority']}] Share: {share_pct:.0f}%")
            print(f"     Vendor: {row['vendor_name'][:40]}")
            print(f"     Institution: {row['institution_name'][:40]}")
            print(f"     Value: {lead['vendor_value_b']:.1f}B / {lead['total_value_b']:.1f}B MXN")

    return leads


def generate_price_outliers(conn: sqlite3.Connection, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Lead Type 4: Price Outlier Leads

    Contracts with extreme price hypotheses from IQR analysis.
    """
    print_section(f"LEAD TYPE 4: Top {limit} Price Outliers")
    cursor = conn.cursor()

    # Check if price_hypotheses table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='price_hypotheses'
    """)

    if not cursor.fetchone():
        print("  Price hypotheses table not found. Run price_hypothesis_engine.py first.")
        return []

    cursor.execute("""
        SELECT
            ph.id,
            ph.hypothesis_id,
            ph.contract_id,
            ph.hypothesis_type,
            ph.confidence,
            ph.explanation,
            ph.recommended_action,
            ph.amount_mxn,
            c.contract_number,
            c.procedure_number,
            c.title,
            c.contract_year,
            c.risk_score,
            c.risk_level,
            v.name as vendor_name,
            i.name as institution_name,
            s.name_es as sector_name
        FROM price_hypotheses ph
        JOIN contracts c ON ph.contract_id = c.id
        LEFT JOIN vendors v ON c.vendor_id = v.id
        LEFT JOIN institutions i ON c.institution_id = i.id
        LEFT JOIN sectors s ON c.sector_id = s.id
        WHERE ph.confidence >= 0.85
          AND ph.amount_mxn > 10000000  -- At least 10M MXN
        ORDER BY ph.amount_mxn DESC
        LIMIT ?
    """, (limit,))

    leads = []
    for row in cursor.fetchall():
        lead = {
            'lead_type': 'price_outlier',
            'priority': 'HIGH' if row['confidence'] >= 0.95 else 'MEDIUM',
            'hypothesis_id': row['hypothesis_id'],
            'contract_id': row['contract_id'],
            'contract_number': row['contract_number'],
            'title': (row['title'] or '')[:100],
            'amount_mxn': row['amount_mxn'],
            'amount_display': f"{row['amount_mxn']/1e6:.1f}M MXN" if row['amount_mxn'] < 1e9 else f"{row['amount_mxn']/1e9:.2f}B MXN",
            'year': row['contract_year'],
            'hypothesis_type': row['hypothesis_type'],
            'confidence': row['confidence'],
            'explanation': row['explanation'][:200] if row['explanation'] else '',
            'risk_score': row['risk_score'],
            'risk_level': row['risk_level'],
            'vendor_name': row['vendor_name'],
            'institution_name': row['institution_name'],
            'sector': row['sector_name'],
            'recommended_action': row['recommended_action'],
            'verification_steps': [
                "Compare to similar contracts in sector",
                "Check vendor's pricing history",
                "Review justification documents if available",
                "Compare to market reference prices"
            ]
        }
        leads.append(lead)

        if len(leads) <= 10:
            print(f"\n  {len(leads)}. [{lead['priority']}] {lead['hypothesis_type']}")
            print(f"     Amount: {lead['amount_display']} | Confidence: {row['confidence']:.2f}")
            print(f"     Vendor: {(row['vendor_name'] or 'Unknown')[:40]}")
            print(f"     Sector: {row['sector_name']}")

    return leads


def generate_year_end_leads(conn: sqlite3.Connection, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Lead Type 5: Year-End Pattern Leads

    December contracts with elevated risk indicators.
    """
    print_section(f"LEAD TYPE 5: Top {limit} Year-End Patterns")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            c.id,
            c.contract_number,
            c.procedure_number,
            c.title,
            c.amount_mxn,
            c.contract_year,
            c.contract_date,
            c.risk_score,
            c.risk_level,
            c.risk_factors,
            c.is_direct_award,
            c.is_single_bid,
            v.name as vendor_name,
            i.name as institution_name,
            s.name_es as sector_name
        FROM contracts c
        LEFT JOIN vendors v ON c.vendor_id = v.id
        LEFT JOIN institutions i ON c.institution_id = i.id
        LEFT JOIN sectors s ON c.sector_id = s.id
        WHERE c.is_year_end = 1
          AND c.risk_score >= 0.3
          AND c.amount_mxn > 10000000  -- At least 10M MXN
          AND c.amount_mxn < 100000000000
          AND c.contract_year >= 2018
        ORDER BY c.risk_score DESC, c.amount_mxn DESC
        LIMIT ?
    """, (limit,))

    leads = []
    for row in cursor.fetchall():
        factors = row['risk_factors'].split(',') if row['risk_factors'] else []

        # Check for compounding factors
        compounding = []
        if row['is_direct_award']:
            compounding.append('Direct award')
        if row['is_single_bid']:
            compounding.append('Single bid')
        if 'short_ad' in row['risk_factors']:
            compounding.append('Short advertisement')

        lead = {
            'lead_type': 'year_end_pattern',
            'priority': 'HIGH' if len(compounding) >= 2 else 'MEDIUM',
            'contract_id': row['id'],
            'contract_number': row['contract_number'],
            'title': (row['title'] or '')[:100],
            'amount_mxn': row['amount_mxn'],
            'amount_display': f"{row['amount_mxn']/1e6:.1f}M MXN" if row['amount_mxn'] < 1e9 else f"{row['amount_mxn']/1e9:.2f}B MXN",
            'year': row['contract_year'],
            'date': row['contract_date'],
            'risk_score': row['risk_score'],
            'risk_level': row['risk_level'],
            'risk_factors': factors,
            'compounding_factors': compounding,
            'vendor_name': row['vendor_name'],
            'institution_name': row['institution_name'],
            'sector': row['sector_name'],
            'pattern': 'December contract with elevated risk',
            'risk_indicators': [
                'Year-end budget exhaustion timing',
                f'Risk score: {row["risk_score"]:.3f}',
                f'Compounding: {", ".join(compounding) if compounding else "None"}'
            ],
            'verification_steps': [
                "Check if similar contracts were available earlier in year",
                "Review urgency justification",
                "Compare to non-December contracts from same vendor",
                "Check for budget cycle patterns"
            ]
        }
        leads.append(lead)

        if len(leads) <= 10:
            print(f"\n  {len(leads)}. [{lead['priority']}] Risk: {row['risk_score']:.3f}")
            print(f"     Amount: {lead['amount_display']} | {row['contract_date']}")
            print(f"     Vendor: {(row['vendor_name'] or 'Unknown')[:40]}")
            print(f"     Compounding: {', '.join(compounding) if compounding else 'None'}")

    return leads


def main():
    parser = argparse.ArgumentParser(description='Generate prioritized investigation leads')
    parser.add_argument('--top', type=int, default=20, help='Number of leads per category')
    parser.add_argument('--output-dir', type=str, default='reports', help='Output directory')
    parser.add_argument('--json-output', action='store_true', help='Output JSON report')
    args = parser.parse_args()

    print("=" * 70)
    print("  INVESTIGATION LEADS GENERATOR")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")
    print(f"Leads per category: {args.top}")
    print("\nGenerating prioritized investigation leads...")
    print("Each lead includes verification steps for manual review.")

    conn = get_connection()

    try:
        all_leads = {
            'timestamp': datetime.now().isoformat(),
            'database': str(DB_PATH),
            'leads_per_category': args.top,
            'categories': {}
        }

        # Generate all lead types
        all_leads['categories']['top_risk_contracts'] = generate_top_risk_contracts(conn, args.top)
        all_leads['categories']['suspicious_clusters'] = generate_suspicious_clusters(conn, args.top)
        all_leads['categories']['concentration_alerts'] = generate_concentration_alerts(conn, args.top)
        all_leads['categories']['price_outliers'] = generate_price_outliers(conn, args.top)
        all_leads['categories']['year_end_patterns'] = generate_year_end_leads(conn, args.top)

        # Summary
        print("\n" + "=" * 70)
        print("  LEAD GENERATION SUMMARY")
        print("=" * 70)

        total_leads = 0
        high_priority = 0

        print("\n  Leads by category:")
        for category, leads in all_leads['categories'].items():
            count = len(leads)
            high = sum(1 for l in leads if l.get('priority') == 'HIGH')
            total_leads += count
            high_priority += high
            print(f"    {category}: {count} leads ({high} high priority)")

        print(f"\n  Total leads generated: {total_leads}")
        print(f"  High priority leads: {high_priority}")

        # Create prioritized list for manual review
        priority_leads = []
        for category, leads in all_leads['categories'].items():
            for lead in leads[:5]:  # Top 5 from each category
                priority_leads.append({
                    'category': category,
                    **lead
                })

        # Sort by priority and risk score
        priority_leads.sort(key=lambda x: (
            0 if x.get('priority') == 'HIGH' else 1,
            -(x.get('risk_score') or 0)
        ))

        all_leads['priority_leads'] = priority_leads[:20]

        print("\n  TOP 10 PRIORITY LEADS FOR MANUAL REVIEW:")
        print("  " + "-" * 66)
        for i, lead in enumerate(priority_leads[:10], 1):
            print(f"\n  {i}. [{lead['priority']}] {lead['category']}")
            if 'vendor_name' in lead:
                print(f"     Vendor: {(lead.get('vendor_name') or 'Unknown')[:45]}")
            if 'amount_display' in lead:
                print(f"     Amount: {lead['amount_display']}")
            if 'verification_steps' in lead:
                print(f"     First step: {lead['verification_steps'][0][:50]}")

        # Save results
        if args.json_output:
            output_dir = Path(args.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            output_file = output_dir / f"investigation_leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(all_leads, f, indent=2, ensure_ascii=False, default=str)
            print(f"\n  Results saved to: {output_file}")

        # Also create a simple CSV for easy review
        if args.json_output:
            csv_file = output_dir / f"priority_leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            with open(csv_file, 'w', encoding='utf-8') as f:
                f.write("priority,category,vendor,institution,amount,risk_score,first_step\n")
                for lead in priority_leads[:50]:
                    vendor = (lead.get('vendor_name') or lead.get('vendor_1_name') or '').replace(',', ';')[:50]
                    inst = (lead.get('institution_name') or '').replace(',', ';')[:50]
                    amount = lead.get('amount_display') or lead.get('combined_value_b', '')
                    risk = lead.get('risk_score') or lead.get('co_bid_rate') or lead.get('value_share_pct') or ''
                    step = (lead.get('verification_steps', [''])[0]).replace(',', ';')[:60]
                    f.write(f"{lead['priority']},{lead['category']},{vendor},{inst},{amount},{risk},{step}\n")
            print(f"  CSV for review: {csv_file}")

        print("\n" + "=" * 70)
        print("  Investigation leads generation complete!")
        print("=" * 70)
        print("\n  NEXT STEPS:")
        print("  1. Review the top 20 priority leads")
        print("  2. Google vendor names + 'corrupcion' / 'investigacion'")
        print("  3. Check ASF audit reports for flagged institutions")
        print("  4. Document findings in backend/data/case_studies/")
        print("  5. Track precision: % of leads with verifiable concerns")

        return all_leads

    finally:
        conn.close()


if __name__ == '__main__':
    main()
