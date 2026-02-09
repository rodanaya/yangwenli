#!/usr/bin/env python3
"""
MCP Server for Yang Wen-li Procurement Analysis Platform.

This server exposes procurement analysis tools to Claude Code via the
Model Context Protocol (MCP). It wraps the FastAPI backend endpoints
to provide natural language access to:
- Contract search and analysis
- Vendor profiling and investigation
- Risk assessment and patterns
- Network visualization data
- Collusion detection

Usage:
    python backend/mcp_server.py

Registration with Claude Code:
    claude mcp add --transport stdio --scope project rubli-procurement -- python backend/mcp_server.py
"""

import json
import sys
import sqlite3
from pathlib import Path
from typing import Any, Optional
from datetime import datetime

# MCP SDK imports
try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import Tool, TextContent
except ImportError:
    print("Error: MCP SDK not installed. Run: pip install mcp", file=sys.stderr)
    sys.exit(1)

# Database path
DB_PATH = Path(__file__).parent / "RUBLI_NORMALIZED.db"

# Amount validation thresholds
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN

# Create server instance
server = Server("rubli-procurement")


def get_db_connection():
    """Get a database connection with row factory."""
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def format_currency(amount: float) -> str:
    """Format amount as currency string."""
    if amount >= 1_000_000_000:
        return f"${amount/1_000_000_000:.2f}B MXN"
    elif amount >= 1_000_000:
        return f"${amount/1_000_000:.2f}M MXN"
    else:
        return f"${amount:,.2f} MXN"


def format_percentage(value: float) -> str:
    """Format as percentage string."""
    return f"{value:.1f}%"


# =============================================================================
# TOOL DEFINITIONS
# =============================================================================

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available MCP tools."""
    return [
        Tool(
            name="search_contracts",
            description="""Search Mexican government procurement contracts with filters.

Supports filtering by:
- sector_id: 1-12 (salud, educacion, infraestructura, energia, defensa, tecnologia, hacienda, gobernacion, agricultura, ambiente, trabajo, otros)
- year: 2002-2025
- risk_level: low, medium, high, critical
- vendor_name: partial name match
- institution_name: partial name match
- min_amount/max_amount: contract value range in MXN
- is_direct_award: true/false for direct award contracts
- is_single_bid: true/false for single-bidder contracts

Returns up to 20 contracts with risk scores and key details.""",
            inputSchema={
                "type": "object",
                "properties": {
                    "sector_id": {"type": "integer", "minimum": 1, "maximum": 12, "description": "Sector ID (1-12)"},
                    "year": {"type": "integer", "minimum": 2002, "maximum": 2026, "description": "Contract year"},
                    "risk_level": {"type": "string", "enum": ["low", "medium", "high", "critical"], "description": "Risk level filter"},
                    "vendor_name": {"type": "string", "description": "Partial vendor name search"},
                    "institution_name": {"type": "string", "description": "Partial institution name search"},
                    "min_amount": {"type": "number", "description": "Minimum contract value in MXN"},
                    "max_amount": {"type": "number", "description": "Maximum contract value in MXN"},
                    "is_direct_award": {"type": "boolean", "description": "Filter for direct award contracts"},
                    "is_single_bid": {"type": "boolean", "description": "Filter for single-bid contracts"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 50, "default": 20, "description": "Max results"}
                }
            }
        ),
        Tool(
            name="get_contract_details",
            description="""Get detailed information about a specific contract including full risk breakdown.

Returns:
- Contract metadata (title, amount, dates)
- Vendor and institution information
- Risk score with factor breakdown
- Procedure type and flags
- Data quality indicators""",
            inputSchema={
                "type": "object",
                "properties": {
                    "contract_id": {"type": "integer", "description": "Contract ID to retrieve"}
                },
                "required": ["contract_id"]
            }
        ),
        Tool(
            name="search_vendors",
            description="""Search vendors by name, RFC, or contract metrics.

Supports filtering by:
- search: partial name or RFC match
- min_contracts: minimum number of contracts
- min_value: minimum total contract value
- has_rfc: whether vendor has RFC registered

Returns vendor profiles with aggregate statistics.""",
            inputSchema={
                "type": "object",
                "properties": {
                    "search": {"type": "string", "minLength": 2, "description": "Search term for name or RFC"},
                    "min_contracts": {"type": "integer", "minimum": 1, "description": "Minimum contract count"},
                    "min_value": {"type": "number", "description": "Minimum total value in MXN"},
                    "has_rfc": {"type": "boolean", "description": "Filter for vendors with RFC"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 50, "default": 20}
                }
            }
        ),
        Tool(
            name="get_vendor_profile",
            description="""Get comprehensive profile for a specific vendor.

Returns:
- Basic info (name, RFC, industry classification)
- Contract statistics (total count, value, average)
- Risk metrics (average score, high-risk count, trend)
- Institution relationships
- Top risk factors affecting this vendor""",
            inputSchema={
                "type": "object",
                "properties": {
                    "vendor_id": {"type": "integer", "description": "Vendor ID to retrieve"}
                },
                "required": ["vendor_id"]
            }
        ),
        Tool(
            name="get_sector_risk_summary",
            description="""Get risk summary for a sector or all sectors.

Returns:
- Total contracts and value
- Risk distribution (low/medium/high/critical counts)
- Average risk score
- Direct award and single-bid rates
- Comparison to other sectors

Sector IDs: 1=salud, 2=educacion, 3=infraestructura, 4=energia, 5=defensa,
6=tecnologia, 7=hacienda, 8=gobernacion, 9=agricultura, 10=ambiente,
11=trabajo, 12=otros""",
            inputSchema={
                "type": "object",
                "properties": {
                    "sector_id": {"type": "integer", "minimum": 1, "maximum": 12, "description": "Sector ID (omit for all sectors)"},
                    "year": {"type": "integer", "minimum": 2002, "maximum": 2026, "description": "Filter by year"}
                }
            }
        ),
        Tool(
            name="detect_collusion_patterns",
            description="""Analyze co-bidding patterns for a vendor to detect potential collusion.

Identifies:
- Vendors that frequently bid together
- Win/loss ratios when co-bidding
- Potential cover bidding (always losing)
- Bid rotation patterns (alternating wins)

Returns relationship strength and suspicious pattern alerts.""",
            inputSchema={
                "type": "object",
                "properties": {
                    "vendor_id": {"type": "integer", "description": "Vendor ID to analyze"},
                    "min_procedures": {"type": "integer", "minimum": 1, "default": 3, "description": "Minimum shared procedures"}
                },
                "required": ["vendor_id"]
            }
        ),
        Tool(
            name="analyze_institution",
            description="""Analyze an institution's vendor network and concentration.

Returns:
- Top vendors by contract value
- Vendor concentration index (HHI)
- Direct award rates
- Risk distribution among vendors

Useful for identifying potential favoritism or market concentration.""",
            inputSchema={
                "type": "object",
                "properties": {
                    "institution_id": {"type": "integer", "description": "Institution ID to analyze"},
                    "year": {"type": "integer", "minimum": 2002, "maximum": 2026, "description": "Filter by year"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20}
                },
                "required": ["institution_id"]
            }
        ),
        Tool(
            name="get_network_graph",
            description="""Get network graph data showing vendor-institution relationships.

Can be centered on:
- A specific vendor (shows their institution connections)
- A specific institution (shows their vendor connections)
- No center (shows top connections by value)

Returns nodes and links for visualization.""",
            inputSchema={
                "type": "object",
                "properties": {
                    "vendor_id": {"type": "integer", "description": "Center on this vendor"},
                    "institution_id": {"type": "integer", "description": "Center on this institution"},
                    "sector_id": {"type": "integer", "minimum": 1, "maximum": 12, "description": "Filter by sector"},
                    "year": {"type": "integer", "minimum": 2002, "maximum": 2026, "description": "Filter by year"},
                    "min_contracts": {"type": "integer", "default": 10, "description": "Minimum contracts for inclusion"},
                    "limit": {"type": "integer", "minimum": 10, "maximum": 100, "default": 50}
                }
            }
        ),
        Tool(
            name="get_top_risk_contracts",
            description="""Get contracts with highest risk scores for investigation.

Returns top contracts by risk score with:
- Full risk factor breakdown
- Vendor and institution details
- Contract amounts and dates

Useful for prioritizing investigations.""",
            inputSchema={
                "type": "object",
                "properties": {
                    "sector_id": {"type": "integer", "minimum": 1, "maximum": 12, "description": "Filter by sector"},
                    "year": {"type": "integer", "minimum": 2002, "maximum": 2026, "description": "Filter by year"},
                    "min_amount": {"type": "number", "description": "Minimum contract value"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 50, "default": 20}
                }
            }
        ),
        Tool(
            name="get_database_stats",
            description="""Get overview statistics of the procurement database.

Returns:
- Total contracts, vendors, institutions
- Date range coverage
- Value totals
- Risk distribution overview
- Data quality metrics""",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
    ]


# =============================================================================
# TOOL IMPLEMENTATIONS
# =============================================================================

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    try:
        if name == "search_contracts":
            result = await search_contracts(arguments)
        elif name == "get_contract_details":
            result = await get_contract_details(arguments)
        elif name == "search_vendors":
            result = await search_vendors(arguments)
        elif name == "get_vendor_profile":
            result = await get_vendor_profile(arguments)
        elif name == "get_sector_risk_summary":
            result = await get_sector_risk_summary(arguments)
        elif name == "detect_collusion_patterns":
            result = await detect_collusion_patterns(arguments)
        elif name == "analyze_institution":
            result = await analyze_institution(arguments)
        elif name == "get_network_graph":
            result = await get_network_graph(arguments)
        elif name == "get_top_risk_contracts":
            result = await get_top_risk_contracts(arguments)
        elif name == "get_database_stats":
            result = await get_database_stats(arguments)
        else:
            result = f"Unknown tool: {name}"

        return [TextContent(type="text", text=result)]

    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]


async def search_contracts(args: dict) -> str:
    """Search contracts with filters."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        conditions = ["(c.amount_mxn IS NULL OR c.amount_mxn <= ?)"]
        params = [MAX_CONTRACT_VALUE]

        if args.get("sector_id"):
            conditions.append("c.sector_id = ?")
            params.append(args["sector_id"])

        if args.get("year"):
            conditions.append("c.contract_year = ?")
            params.append(args["year"])

        if args.get("risk_level"):
            conditions.append("c.risk_level = ?")
            params.append(args["risk_level"].lower())

        if args.get("vendor_name"):
            conditions.append("v.name LIKE ?")
            params.append(f"%{args['vendor_name']}%")

        if args.get("institution_name"):
            conditions.append("i.name LIKE ?")
            params.append(f"%{args['institution_name']}%")

        if args.get("min_amount"):
            conditions.append("c.amount_mxn >= ?")
            params.append(args["min_amount"])

        if args.get("max_amount"):
            conditions.append("c.amount_mxn <= ?")
            params.append(args["max_amount"])

        if args.get("is_direct_award") is not None:
            conditions.append("c.is_direct_award = ?")
            params.append(1 if args["is_direct_award"] else 0)

        if args.get("is_single_bid") is not None:
            conditions.append("c.is_single_bid = ?")
            params.append(1 if args["is_single_bid"] else 0)

        where_clause = " AND ".join(conditions)
        limit = min(args.get("limit", 20), 50)

        query = f"""
            SELECT
                c.id, c.contract_number, c.title, c.amount_mxn,
                c.contract_date, c.contract_year,
                c.risk_score, c.risk_level, c.risk_factors,
                c.is_direct_award, c.is_single_bid,
                v.name as vendor_name, v.id as vendor_id,
                i.name as institution_name, i.id as institution_id,
                s.name_es as sector_name
            FROM contracts c
            LEFT JOIN vendors v ON c.vendor_id = v.id
            LEFT JOIN institutions i ON c.institution_id = i.id
            LEFT JOIN sectors s ON c.sector_id = s.id
            WHERE {where_clause}
            ORDER BY c.risk_score DESC NULLS LAST, c.amount_mxn DESC
            LIMIT ?
        """
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()

        if not rows:
            return "No contracts found matching the criteria."

        # Format results
        results = [f"Found {len(rows)} contracts:\n"]

        for i, row in enumerate(rows, 1):
            risk_emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(row["risk_level"], "⚪")
            amount_str = format_currency(row["amount_mxn"] or 0)

            results.append(f"""
{i}. **{row['title'][:60]}...**
   Contract ID: {row['id']} | {row['contract_year']}
   Amount: {amount_str}
   Vendor: {row['vendor_name']} (ID: {row['vendor_id']})
   Institution: {row['institution_name']} (ID: {row['institution_id']})
   Sector: {row['sector_name']}
   Risk: {risk_emoji} {row['risk_level'].upper()} ({row['risk_score']:.2f})
   Flags: {'Direct Award ' if row['is_direct_award'] else ''}{'Single Bid' if row['is_single_bid'] else ''}
   Factors: {row['risk_factors'] or 'None'}
""")

        return "".join(results)

    finally:
        conn.close()


async def get_contract_details(args: dict) -> str:
    """Get detailed contract information."""
    contract_id = args.get("contract_id")
    if not contract_id:
        return "Error: contract_id is required"

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                c.*,
                v.name as vendor_name, v.rfc as vendor_rfc,
                i.name as institution_name, i.institution_type,
                s.name_es as sector_name
            FROM contracts c
            LEFT JOIN vendors v ON c.vendor_id = v.id
            LEFT JOIN institutions i ON c.institution_id = i.id
            LEFT JOIN sectors s ON c.sector_id = s.id
            WHERE c.id = ?
        """, (contract_id,))

        row = cursor.fetchone()
        if not row:
            return f"Contract {contract_id} not found."

        # Parse risk factors
        risk_factors = row["risk_factors"].split(",") if row["risk_factors"] else []

        result = f"""
# Contract Details: {row['id']}

## Basic Information
- **Title**: {row['title']}
- **Contract Number**: {row['contract_number'] or 'N/A'}
- **Procedure Number**: {row['procedure_number'] or 'N/A'}
- **Amount**: {format_currency(row['amount_mxn'] or 0)}
- **Date**: {row['contract_date']} ({row['contract_year']})
- **Sector**: {row['sector_name']}

## Parties
- **Vendor**: {row['vendor_name']} (ID: {row['vendor_id']})
  - RFC: {row['vendor_rfc'] or 'Not registered'}
- **Institution**: {row['institution_name']} (ID: {row['institution_id']})
  - Type: {row['institution_type'] or 'Unknown'}

## Procedure
- **Type**: {row['procedure_type'] or 'Unknown'}
- **Direct Award**: {'Yes' if row['is_direct_award'] else 'No'}
- **Single Bid**: {'Yes' if row['is_single_bid'] else 'No'}
- **Year-End Contract**: {'Yes' if row['is_year_end'] else 'No'}

## Risk Assessment
- **Risk Score**: {row['risk_score']:.3f}
- **Risk Level**: {row['risk_level'].upper() if row['risk_level'] else 'Unknown'}
- **Confidence**: {row['risk_confidence'] or 'N/A'}

### Risk Factors Triggered:
"""
        if risk_factors:
            for factor in risk_factors:
                factor = factor.strip()
                if factor:
                    result += f"- {factor}\n"
        else:
            result += "- No risk factors triggered\n"

        result += f"""
## Data Quality
- **Quality Score**: {row['data_quality_score'] or 'N/A'}
- **Quality Grade**: {row['data_quality_grade'] or 'N/A'}
- **Source Structure**: {row['source_structure'] or 'Unknown'}
"""

        return result

    finally:
        conn.close()


async def search_vendors(args: dict) -> str:
    """Search vendors with filters."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        conditions = ["1=1"]
        params = []

        if args.get("search"):
            conditions.append("(v.name LIKE ? OR v.name_normalized LIKE ? OR v.rfc LIKE ?)")
            pattern = f"%{args['search']}%"
            params.extend([pattern, pattern, pattern])

        if args.get("has_rfc") is not None:
            if args["has_rfc"]:
                conditions.append("v.rfc IS NOT NULL AND v.rfc != ''")
            else:
                conditions.append("(v.rfc IS NULL OR v.rfc = '')")

        where_clause = " AND ".join(conditions)
        limit = min(args.get("limit", 20), 50)

        # Get stats conditions
        stats_conditions = []
        stats_params = []

        if args.get("min_contracts"):
            stats_conditions.append("s.total_contracts >= ?")
            stats_params.append(args["min_contracts"])

        if args.get("min_value"):
            stats_conditions.append("s.total_value_mxn >= ?")
            stats_params.append(args["min_value"])

        stats_where = " AND ".join(stats_conditions) if stats_conditions else "1=1"

        query = f"""
            SELECT
                v.id, v.name, v.rfc,
                s.total_contracts, s.total_value_mxn,
                s.avg_risk_score, s.high_risk_pct,
                s.direct_award_pct,
                s.first_contract_year, s.last_contract_year
            FROM vendors v
            JOIN vendor_stats s ON v.id = s.vendor_id
            WHERE {where_clause} AND {stats_where}
            ORDER BY s.total_value_mxn DESC
            LIMIT ?
        """

        cursor.execute(query, params + stats_params + [limit])
        rows = cursor.fetchall()

        if not rows:
            return "No vendors found matching the criteria."

        results = [f"Found {len(rows)} vendors:\n"]

        for i, row in enumerate(rows, 1):
            results.append(f"""
{i}. **{row['name']}**
   ID: {row['id']} | RFC: {row['rfc'] or 'Not registered'}
   Contracts: {row['total_contracts']:,} ({row['first_contract_year']}-{row['last_contract_year']})
   Total Value: {format_currency(row['total_value_mxn'] or 0)}
   Avg Risk: {row['avg_risk_score']:.3f} | High Risk: {format_percentage(row['high_risk_pct'])}
   Direct Award Rate: {format_percentage(row['direct_award_pct'])}
""")

        return "".join(results)

    finally:
        conn.close()


async def get_vendor_profile(args: dict) -> str:
    """Get comprehensive vendor profile."""
    vendor_id = args.get("vendor_id")
    if not vendor_id:
        return "Error: vendor_id is required"

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get vendor basic info
        cursor.execute("""
            SELECT
                v.id, v.name, v.rfc, v.name_normalized,
                vc.industry_code, vi.name_es as industry_name
            FROM vendors v
            LEFT JOIN vendor_classifications vc ON v.id = vc.vendor_id
            LEFT JOIN vendor_industries vi ON vc.industry_id = vi.id
            WHERE v.id = ?
        """, (vendor_id,))

        vendor = cursor.fetchone()
        if not vendor:
            return f"Vendor {vendor_id} not found."

        # Get statistics
        cursor.execute("""
            SELECT
                COUNT(*) as total_contracts,
                COALESCE(SUM(amount_mxn), 0) as total_value,
                COALESCE(AVG(amount_mxn), 0) as avg_value,
                COALESCE(AVG(risk_score), 0) as avg_risk,
                SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) as high_risk_count,
                SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
                SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bids,
                MIN(contract_year) as first_year,
                MAX(contract_year) as last_year,
                COUNT(DISTINCT institution_id) as institutions
            FROM contracts
            WHERE vendor_id = ?
            AND (amount_mxn IS NULL OR amount_mxn <= ?)
        """, (vendor_id, MAX_CONTRACT_VALUE))

        stats = cursor.fetchone()
        total = stats["total_contracts"] or 0

        # Get top institutions
        cursor.execute("""
            SELECT i.name, COUNT(*) as cnt, SUM(c.amount_mxn) as value
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE c.vendor_id = ?
            AND (c.amount_mxn IS NULL OR c.amount_mxn <= ?)
            GROUP BY i.id, i.name
            ORDER BY value DESC
            LIMIT 5
        """, (vendor_id, MAX_CONTRACT_VALUE))

        top_institutions = cursor.fetchall()

        # Get risk factors
        cursor.execute("""
            SELECT risk_factors FROM contracts
            WHERE vendor_id = ?
            AND risk_factors IS NOT NULL AND risk_factors != ''
        """, (vendor_id,))

        from collections import Counter
        factor_counts = Counter()
        for row in cursor.fetchall():
            for f in row["risk_factors"].split(","):
                f = f.strip()
                if f:
                    factor_counts[f] += 1

        result = f"""
# Vendor Profile: {vendor['name']}

## Basic Information
- **Vendor ID**: {vendor['id']}
- **RFC**: {vendor['rfc'] or 'Not registered'}
- **Industry**: {vendor['industry_name'] or 'Unclassified'} ({vendor['industry_code'] or 'N/A'})

## Contract Statistics
- **Total Contracts**: {total:,}
- **Active Years**: {stats['first_year']} - {stats['last_year']}
- **Total Value**: {format_currency(stats['total_value'])}
- **Average Contract**: {format_currency(stats['avg_value'])}
- **Institutions Served**: {stats['institutions']}

## Risk Metrics
- **Average Risk Score**: {stats['avg_risk']:.3f}
- **High/Critical Risk Contracts**: {stats['high_risk_count']:,} ({format_percentage(stats['high_risk_count'] / max(1, total) * 100)})
- **Direct Award Rate**: {format_percentage(stats['direct_awards'] / max(1, total) * 100)}
- **Single Bid Rate**: {format_percentage(stats['single_bids'] / max(1, total) * 100)}

## Top Institutions
"""
        for inst in top_institutions:
            result += f"- {inst['name']}: {inst['cnt']} contracts, {format_currency(inst['value'] or 0)}\n"

        result += "\n## Common Risk Factors\n"
        if factor_counts:
            for factor, count in factor_counts.most_common(5):
                result += f"- {factor}: {count} occurrences\n"
        else:
            result += "- No risk factors recorded\n"

        return result

    finally:
        conn.close()


async def get_sector_risk_summary(args: dict) -> str:
    """Get sector risk summary."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        conditions = ["(amount_mxn IS NULL OR amount_mxn <= ?)"]
        params = [MAX_CONTRACT_VALUE]

        sector_id = args.get("sector_id")
        if sector_id:
            conditions.append("sector_id = ?")
            params.append(sector_id)

        if args.get("year"):
            conditions.append("contract_year = ?")
            params.append(args["year"])

        where_clause = " AND ".join(conditions)

        # Get overall stats
        cursor.execute(f"""
            SELECT
                COUNT(*) as total,
                COALESCE(SUM(amount_mxn), 0) as total_value,
                COALESCE(AVG(risk_score), 0) as avg_risk,
                SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low_count,
                SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium_count,
                SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high_count,
                SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical_count,
                SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
                SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bids
            FROM contracts
            WHERE {where_clause}
        """, params)

        stats = cursor.fetchone()
        total = stats["total"] or 1

        if sector_id:
            # Get sector name
            cursor.execute("SELECT name_es FROM sectors WHERE id = ?", (sector_id,))
            sector = cursor.fetchone()
            sector_name = sector["name_es"] if sector else f"Sector {sector_id}"
            title = f"# Risk Summary: {sector_name}"
        else:
            title = "# Risk Summary: All Sectors"

        result = f"""
{title}

## Overall Statistics
- **Total Contracts**: {stats['total']:,}
- **Total Value**: {format_currency(stats['total_value'])}
- **Average Risk Score**: {stats['avg_risk']:.3f}

## Risk Distribution
- 🟢 Low Risk: {stats['low_count']:,} ({format_percentage(stats['low_count']/total*100)})
- 🟡 Medium Risk: {stats['medium_count']:,} ({format_percentage(stats['medium_count']/total*100)})
- 🟠 High Risk: {stats['high_count']:,} ({format_percentage(stats['high_count']/total*100)})
- 🔴 Critical Risk: {stats['critical_count']:,} ({format_percentage(stats['critical_count']/total*100)})

## Procedure Metrics
- **Direct Awards**: {stats['direct_awards']:,} ({format_percentage(stats['direct_awards']/total*100)})
- **Single Bids**: {stats['single_bids']:,} ({format_percentage(stats['single_bids']/total*100)})
"""

        if not sector_id:
            # Add per-sector breakdown
            cursor.execute(f"""
                SELECT
                    s.id, s.name_es,
                    COUNT(*) as cnt,
                    COALESCE(SUM(c.amount_mxn), 0) as value,
                    COALESCE(AVG(c.risk_score), 0) as avg_risk,
                    SUM(CASE WHEN c.risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) as high_risk
                FROM contracts c
                JOIN sectors s ON c.sector_id = s.id
                WHERE {where_clause}
                GROUP BY s.id, s.name_es
                ORDER BY avg_risk DESC
            """, params)

            result += "\n## By Sector (sorted by risk)\n"
            for row in cursor.fetchall():
                risk_pct = row["high_risk"] / max(1, row["cnt"]) * 100
                result += f"- **{row['name_es']}**: {row['cnt']:,} contracts, avg risk {row['avg_risk']:.3f}, {format_percentage(risk_pct)} high-risk\n"

        return result

    finally:
        conn.close()


async def detect_collusion_patterns(args: dict) -> str:
    """Analyze co-bidding patterns."""
    vendor_id = args.get("vendor_id")
    if not vendor_id:
        return "Error: vendor_id is required"

    min_procedures = args.get("min_procedures", 3)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get vendor name
        cursor.execute("SELECT name FROM vendors WHERE id = ?", (vendor_id,))
        vendor = cursor.fetchone()
        if not vendor:
            return f"Vendor {vendor_id} not found."

        # Get total procedures
        cursor.execute("""
            SELECT COUNT(DISTINCT procedure_number)
            FROM contracts
            WHERE vendor_id = ?
            AND procedure_number IS NOT NULL AND procedure_number != ''
        """, (vendor_id,))
        total_procedures = cursor.fetchone()[0] or 0

        # Find co-bidders
        cursor.execute("""
            WITH target_procedures AS (
                SELECT DISTINCT procedure_number
                FROM contracts
                WHERE vendor_id = ?
                AND procedure_number IS NOT NULL AND procedure_number != ''
            ),
            co_bids AS (
                SELECT
                    c.vendor_id as co_vendor_id,
                    v.name as co_vendor_name,
                    c.procedure_number,
                    c.vendor_id = (
                        SELECT vendor_id FROM contracts c2
                        WHERE c2.procedure_number = c.procedure_number
                        ORDER BY c2.amount_mxn DESC LIMIT 1
                    ) as is_winner
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                WHERE c.procedure_number IN (SELECT procedure_number FROM target_procedures)
                AND c.vendor_id != ?
            )
            SELECT
                co_vendor_id,
                co_vendor_name,
                COUNT(DISTINCT procedure_number) as co_bid_count,
                SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) as win_count
            FROM co_bids
            GROUP BY co_vendor_id, co_vendor_name
            HAVING co_bid_count >= ?
            ORDER BY co_bid_count DESC
            LIMIT 20
        """, (vendor_id, vendor_id, min_procedures))

        co_bidders = cursor.fetchall()

        result = f"""
# Co-Bidding Analysis: {vendor['name']}

**Vendor ID**: {vendor_id}
**Total Competitive Procedures**: {total_procedures}
**Co-bidders Found**: {len(co_bidders)}

## Frequent Co-Bidders
"""

        suspicious_patterns = []

        for row in co_bidders:
            co_bid_count = row["co_bid_count"]
            win_count = row["win_count"]
            win_ratio = win_count / co_bid_count if co_bid_count > 0 else 0

            # Determine relationship strength
            if co_bid_count >= 20:
                strength = "🔴 VERY STRONG"
            elif co_bid_count >= 10:
                strength = "🟠 STRONG"
            elif co_bid_count >= 5:
                strength = "🟡 MODERATE"
            else:
                strength = "🟢 WEAK"

            result += f"""
### {row['co_vendor_name']} (ID: {row['co_vendor_id']})
- Shared Procedures: {co_bid_count}
- Their Win Rate: {format_percentage(win_ratio * 100)}
- Relationship: {strength}
"""

            # Detect patterns
            if co_bid_count >= 5 and win_ratio < 0.1:
                suspicious_patterns.append(f"⚠️ **POTENTIAL COVER BIDDER**: {row['co_vendor_name']} wins <10% when bidding against target")

            if co_bid_count >= 10 and 0.4 < win_ratio < 0.6:
                suspicious_patterns.append(f"⚠️ **POTENTIAL BID ROTATION**: {row['co_vendor_name']} has ~50% win rate over {co_bid_count} co-bids")

        if suspicious_patterns:
            result += "\n## 🚨 Suspicious Patterns Detected\n"
            for pattern in suspicious_patterns:
                result += f"{pattern}\n"
        else:
            result += "\n## Patterns\nNo suspicious patterns detected with current thresholds.\n"

        return result

    finally:
        conn.close()


async def analyze_institution(args: dict) -> str:
    """Analyze institution's vendor network."""
    institution_id = args.get("institution_id")
    if not institution_id:
        return "Error: institution_id is required"

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get institution info
        cursor.execute("""
            SELECT id, name, institution_type
            FROM institutions WHERE id = ?
        """, (institution_id,))

        inst = cursor.fetchone()
        if not inst:
            return f"Institution {institution_id} not found."

        # Build conditions
        conditions = ["c.institution_id = ?", "(c.amount_mxn IS NULL OR c.amount_mxn <= ?)"]
        params = [institution_id, MAX_CONTRACT_VALUE]

        if args.get("year"):
            conditions.append("c.contract_year = ?")
            params.append(args["year"])

        where_clause = " AND ".join(conditions)
        limit = min(args.get("limit", 20), 100)

        # Get vendor breakdown
        cursor.execute(f"""
            SELECT
                v.id, v.name,
                COUNT(c.id) as contract_count,
                COALESCE(SUM(c.amount_mxn), 0) as total_value,
                COALESCE(AVG(c.risk_score), 0) as avg_risk,
                SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
                MIN(c.contract_year) as first_year,
                MAX(c.contract_year) as last_year
            FROM contracts c
            JOIN vendors v ON c.vendor_id = v.id
            WHERE {where_clause}
            GROUP BY v.id, v.name
            ORDER BY total_value DESC
            LIMIT ?
        """, params + [limit])

        vendors = cursor.fetchall()

        # Calculate totals and concentration
        total_value = sum(v["total_value"] for v in vendors)
        total_contracts = sum(v["contract_count"] for v in vendors)

        # HHI calculation
        hhi = 0
        if total_value > 0:
            for v in vendors:
                share = v["total_value"] / total_value
                hhi += share ** 2

        result = f"""
# Institution Analysis: {inst['name']}

**Institution ID**: {institution_id}
**Type**: {inst['institution_type'] or 'Unknown'}

## Summary
- **Total Vendors**: {len(vendors)}
- **Total Contracts**: {total_contracts:,}
- **Total Value**: {format_currency(total_value)}
- **Concentration Index (HHI)**: {hhi:.4f} {'⚠️ HIGH' if hhi > 0.25 else '✓ OK' if hhi < 0.15 else '⚡ MODERATE'}

## Top Vendors by Value
"""

        for i, v in enumerate(vendors[:10], 1):
            share = v["total_value"] / total_value * 100 if total_value > 0 else 0
            da_rate = v["direct_awards"] / max(1, v["contract_count"]) * 100

            result += f"""
{i}. **{v['name']}** (ID: {v['id']})
   - Contracts: {v['contract_count']:,} ({v['first_year']}-{v['last_year']})
   - Value: {format_currency(v['total_value'])} ({format_percentage(share)} of total)
   - Avg Risk: {v['avg_risk']:.3f}
   - Direct Award Rate: {format_percentage(da_rate)}
"""

        # Concentration warning
        if vendors and vendors[0]["total_value"] / max(1, total_value) > 0.3:
            result += f"\n⚠️ **CONCENTRATION WARNING**: Top vendor holds {format_percentage(vendors[0]['total_value'] / total_value * 100)} of contract value\n"

        return result

    finally:
        conn.close()


async def get_network_graph(args: dict) -> str:
    """Get network graph data."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        conditions = ["(c.amount_mxn IS NULL OR c.amount_mxn <= ?)"]
        params = [MAX_CONTRACT_VALUE]

        if args.get("sector_id"):
            conditions.append("c.sector_id = ?")
            params.append(args["sector_id"])

        if args.get("year"):
            conditions.append("c.contract_year = ?")
            params.append(args["year"])

        where_clause = " AND ".join(conditions)
        min_contracts = args.get("min_contracts", 10)
        limit = min(args.get("limit", 50), 100)

        vendor_id = args.get("vendor_id")
        institution_id = args.get("institution_id")

        if vendor_id:
            # Center on vendor
            cursor.execute(f"""
                SELECT
                    v.id as vendor_id, v.name as vendor_name,
                    i.id as institution_id, i.name as institution_name,
                    COUNT(c.id) as contracts,
                    COALESCE(SUM(c.amount_mxn), 0) as value,
                    COALESCE(AVG(c.risk_score), 0) as avg_risk
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                JOIN institutions i ON c.institution_id = i.id
                WHERE c.vendor_id = ? AND {where_clause}
                GROUP BY v.id, v.name, i.id, i.name
                HAVING contracts >= ?
                ORDER BY value DESC
                LIMIT ?
            """, (vendor_id, *params, min_contracts, limit))

            title = f"Network centered on Vendor {vendor_id}"

        elif institution_id:
            # Center on institution
            cursor.execute(f"""
                SELECT
                    i.id as institution_id, i.name as institution_name,
                    v.id as vendor_id, v.name as vendor_name,
                    COUNT(c.id) as contracts,
                    COALESCE(SUM(c.amount_mxn), 0) as value,
                    COALESCE(AVG(c.risk_score), 0) as avg_risk
                FROM contracts c
                JOIN institutions i ON c.institution_id = i.id
                JOIN vendors v ON c.vendor_id = v.id
                WHERE c.institution_id = ? AND {where_clause}
                GROUP BY i.id, i.name, v.id, v.name
                HAVING contracts >= ?
                ORDER BY value DESC
                LIMIT ?
            """, (institution_id, *params, min_contracts, limit))

            title = f"Network centered on Institution {institution_id}"
        else:
            # Top connections
            cursor.execute(f"""
                SELECT
                    v.id as vendor_id, v.name as vendor_name,
                    i.id as institution_id, i.name as institution_name,
                    COUNT(c.id) as contracts,
                    COALESCE(SUM(c.amount_mxn), 0) as value,
                    COALESCE(AVG(c.risk_score), 0) as avg_risk
                FROM contracts c
                JOIN vendors v ON c.vendor_id = v.id
                JOIN institutions i ON c.institution_id = i.id
                WHERE {where_clause}
                GROUP BY v.id, v.name, i.id, i.name
                HAVING contracts >= ?
                ORDER BY value DESC
                LIMIT ?
            """, (*params, min_contracts, limit * 2))

            title = "Top Vendor-Institution Connections"

        rows = cursor.fetchall()

        if not rows:
            return "No network connections found matching criteria."

        # Build nodes and links
        vendors = {}
        institutions = {}
        links = []

        for row in rows:
            vid = row["vendor_id"]
            iid = row["institution_id"]

            if vid not in vendors:
                vendors[vid] = {"name": row["vendor_name"], "value": 0, "contracts": 0}
            vendors[vid]["value"] += row["value"]
            vendors[vid]["contracts"] += row["contracts"]

            if iid not in institutions:
                institutions[iid] = {"name": row["institution_name"], "value": 0, "contracts": 0}
            institutions[iid]["value"] += row["value"]
            institutions[iid]["contracts"] += row["contracts"]

            links.append({
                "vendor": row["vendor_name"],
                "institution": row["institution_name"],
                "contracts": row["contracts"],
                "value": row["value"],
                "avg_risk": row["avg_risk"]
            })

        result = f"""
# {title}

## Summary
- **Vendors**: {len(vendors)}
- **Institutions**: {len(institutions)}
- **Connections**: {len(links)}
- **Total Value**: {format_currency(sum(l['value'] for l in links))}

## Top Connections by Value
"""

        for i, link in enumerate(sorted(links, key=lambda x: x["value"], reverse=True)[:15], 1):
            result += f"""
{i}. {link['vendor']} ↔ {link['institution']}
   - {link['contracts']} contracts, {format_currency(link['value'])}
   - Avg Risk: {link['avg_risk']:.3f}
"""

        return result

    finally:
        conn.close()


async def get_top_risk_contracts(args: dict) -> str:
    """Get highest risk contracts."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        conditions = ["(c.amount_mxn IS NULL OR c.amount_mxn <= ?)", "c.risk_score IS NOT NULL"]
        params = [MAX_CONTRACT_VALUE]

        if args.get("sector_id"):
            conditions.append("c.sector_id = ?")
            params.append(args["sector_id"])

        if args.get("year"):
            conditions.append("c.contract_year = ?")
            params.append(args["year"])

        if args.get("min_amount"):
            conditions.append("c.amount_mxn >= ?")
            params.append(args["min_amount"])

        where_clause = " AND ".join(conditions)
        limit = min(args.get("limit", 20), 50)

        cursor.execute(f"""
            SELECT
                c.id, c.title, c.amount_mxn, c.contract_year,
                c.risk_score, c.risk_level, c.risk_factors,
                v.name as vendor_name, v.id as vendor_id,
                i.name as institution_name,
                s.name_es as sector_name
            FROM contracts c
            LEFT JOIN vendors v ON c.vendor_id = v.id
            LEFT JOIN institutions i ON c.institution_id = i.id
            LEFT JOIN sectors s ON c.sector_id = s.id
            WHERE {where_clause}
            ORDER BY c.risk_score DESC
            LIMIT ?
        """, params + [limit])

        rows = cursor.fetchall()

        if not rows:
            return "No contracts found matching criteria."

        result = f"# Top {len(rows)} Highest Risk Contracts\n\n"

        for i, row in enumerate(rows, 1):
            risk_emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(row["risk_level"], "⚪")

            result += f"""
## {i}. Contract ID: {row['id']} {risk_emoji}
**Risk Score**: {row['risk_score']:.3f} ({row['risk_level'].upper()})

- **Title**: {row['title'][:80]}...
- **Amount**: {format_currency(row['amount_mxn'] or 0)}
- **Year**: {row['contract_year']}
- **Sector**: {row['sector_name']}
- **Vendor**: {row['vendor_name']} (ID: {row['vendor_id']})
- **Institution**: {row['institution_name']}

**Risk Factors**: {row['risk_factors'] or 'None'}

---
"""

        return result

    finally:
        conn.close()


async def get_database_stats(args: dict) -> str:
    """Get database overview statistics."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Contract stats
        cursor.execute("""
            SELECT
                COUNT(*) as total_contracts,
                COUNT(DISTINCT vendor_id) as total_vendors,
                COUNT(DISTINCT institution_id) as total_institutions,
                MIN(contract_year) as min_year,
                MAX(contract_year) as max_year,
                COALESCE(SUM(CASE WHEN amount_mxn <= ? THEN amount_mxn ELSE 0 END), 0) as total_value,
                SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low_risk,
                SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
                SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
                SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical_risk,
                SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
                SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bids,
                COALESCE(AVG(risk_score), 0) as avg_risk
            FROM contracts
        """, (MAX_CONTRACT_VALUE,))

        stats = cursor.fetchone()
        total = stats["total_contracts"] or 1

        # Sector breakdown
        cursor.execute("""
            SELECT s.name_es, COUNT(*) as cnt
            FROM contracts c
            JOIN sectors s ON c.sector_id = s.id
            GROUP BY s.id, s.name_es
            ORDER BY cnt DESC
        """)
        sectors = cursor.fetchall()

        result = f"""
# Yang Wen-li Database Statistics

## Overview
- **Database**: RUBLI_NORMALIZED.db
- **Total Contracts**: {stats['total_contracts']:,}
- **Total Vendors**: {stats['total_vendors']:,}
- **Total Institutions**: {stats['total_institutions']:,}
- **Date Range**: {stats['min_year']} - {stats['max_year']}
- **Total Value**: {format_currency(stats['total_value'])}

## Risk Distribution
- 🟢 Low Risk: {stats['low_risk']:,} ({format_percentage(stats['low_risk']/total*100)})
- 🟡 Medium Risk: {stats['medium_risk']:,} ({format_percentage(stats['medium_risk']/total*100)})
- 🟠 High Risk: {stats['high_risk']:,} ({format_percentage(stats['high_risk']/total*100)})
- 🔴 Critical Risk: {stats['critical_risk']:,} ({format_percentage(stats['critical_risk']/total*100)})

**Average Risk Score**: {stats['avg_risk']:.3f}

## Procedure Metrics
- **Direct Awards**: {stats['direct_awards']:,} ({format_percentage(stats['direct_awards']/total*100)})
- **Single Bids**: {stats['single_bids']:,} ({format_percentage(stats['single_bids']/total*100)})

## Contracts by Sector
"""
        for sector in sectors:
            result += f"- {sector['name_es']}: {sector['cnt']:,}\n"

        result += f"""
## Risk Model
- **Version**: 3.3 (with co-bidding detection)
- **Factors**: 8 base factors + 4 bonus factors
- **Last Updated**: {datetime.now().strftime('%Y-%m-%d')}
"""

        return result

    finally:
        conn.close()


# =============================================================================
# MAIN
# =============================================================================

async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
