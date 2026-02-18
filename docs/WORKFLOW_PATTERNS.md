# Workflow Patterns for RUBLI

> Step-by-step guides for common development workflows.

---

## Table of Contents

1. [Adding New COMPRANET Data](#1-adding-new-compranet-data)
2. [Investigating a Suspicious Vendor](#2-investigating-a-suspicious-vendor)
3. [Adding a New API Endpoint](#3-adding-a-new-api-endpoint)
4. [Building a Dashboard Component](#4-building-a-dashboard-component)
5. [Modifying the Risk Model](#5-modifying-the-risk-model)
6. [Database Schema Changes](#6-database-schema-changes)

---

## 1. Adding New COMPRANET Data

**Scenario:** You've downloaded new procurement data and want to add it to the database.

### Step 1: Download and Place the File

```
Place the file in: original_data/
Example: original_data/Contratos_CompraNet2026.csv
```

### Step 2: Validate the Data

```
/validate-data original_data/Contratos_CompraNet2026.csv
```

Claude will:
- Profile the file (rows, columns, structure)
- Check for amounts > 100B MXN (reject) and > 10B MXN (flag)
- Identify duplicates and anomalies
- Ask for your approval on how to handle issues

### Step 3: Review and Approve

When Claude presents findings:
```
VALIDATION SUMMARY
==================
CRITICAL: 3 records exceed 100B MXN (likely decimal errors)
HIGH: 47 records between 10B-100B MXN (need review)
MEDIUM: 156 potential duplicate records

How should we proceed?
(a) Reject all > 100B, flag > 10B, and continue
(b) Show me the specific records first
(c) Cancel and investigate further
```

Choose your action. For safety, always review critical issues.

### Step 4: Run ETL

```
/etl
```

Claude will:
- Create a database backup
- Process the validated data
- Update single_bid flags
- Report summary statistics

### Step 5: Verify Results

After ETL completes, verify:
```sql
-- Check new record count
SELECT COUNT(*) FROM contracts WHERE year = 2026;

-- Verify no > 100B amounts
SELECT COUNT(*) FROM contracts
WHERE importe_contrato > 100000000000;  -- Should be 0
```

---

## 2. Investigating a Suspicious Vendor

**Scenario:** You've noticed a vendor winning many contracts and want to investigate.

### Step 1: Describe the Investigation

```
"I want to investigate vendor CONSTRUCCIONES DEL NORTE SA DE CV.
They seem to win a lot of contracts in Jalisco."
```

Claude will automatically invoke the **network-detective** agent.

### Step 2: Review Network Analysis

The agent will analyze:
- Win rate and single-bid rate
- Co-bidding patterns (who they bid with/against)
- Shared attributes (address, legal representative, RFC patterns)
- Institution relationships (which agencies award to them)

### Step 3: Respond to Questions

```
FINDINGS:
- Win rate: 78% (anomalous for competitive procedures)
- Co-bids with 3 other vendors but never loses to them
- Shares address with CONSTRUCTORA AZTECA at Av. Reforma 123

Questions:
1. Investigate the 3 co-bidding vendors as potential collusion ring?
2. Deep-dive on the shared address for shell company indicators?
3. Quantify financial impact of suspicious patterns?
```

Approve the investigations you want to pursue.

### Step 4: Document Findings

Ask Claude to create a summary:
```
"Create a findings summary for vendor CONSTRUCCIONES DEL NORTE
suitable for an investigation report."
```

---

## 3. Adding a New API Endpoint

**Scenario:** You need a new endpoint to return sector statistics for the dashboard.

### Step 1: Describe the Requirement

```
"I need an endpoint that returns sector statistics including:
- Total contracts per sector
- Total value per sector
- Average risk score per sector
- Year-over-year change"
```

Claude invokes the **api-designer** agent.

### Step 2: Answer Design Questions

```
CLARIFYING QUESTIONS:
1. Should this be paginated? Sectors are only 12 - probably not needed.
2. Include drill-down capability or just summary?
3. What time range? All time, current year, or configurable?
4. Cache this data? It changes daily but may be queried frequently.
```

Provide your answers.

### Step 3: Review the Design

Claude proposes:
```
ENDPOINT DESIGN
===============
GET /api/v1/sectors/statistics

Query Parameters:
- year (optional): Filter by year. Default: all years.

Response:
{
  "data": [
    {
      "sector_id": 1,
      "sector_name": "salud",
      "total_contracts": 245000,
      "total_value": 1234567890000,
      "avg_risk_score": 0.34,
      "yoy_change": 0.12
    },
    ...
  ],
  "generated_at": "2024-01-15T14:30:00Z"
}
```

Approve or request modifications.

### Step 4: Implement

Claude will write:
- Pydantic models for request/response
- FastAPI endpoint handler
- SQLAlchemy query
- Any necessary caching logic

### Step 5: Test

```
/dev backend
# Then in another terminal:
curl http://localhost:8001/api/v1/sectors/statistics
```

---

## 4. Building a Dashboard Component

**Scenario:** You need a visualization showing contract value by sector over time.

### Step 1: Describe the Visualization

```
"I need a dashboard component showing contract value trends by sector.
Should show 12 sectors over the past 10 years."
```

Claude invokes the **viz-storyteller** agent.

### Step 2: Answer Design Questions

```
VISUALIZATION QUESTIONS:
1. Who is the audience? (Journalists, policymakers, analysts?)
2. What's the key message? (Growth trends, anomalies, comparisons?)
3. Should users be able to interact? (Hover, click, filter?)
4. Mobile support needed?
```

### Step 3: Review Recommendation

```
RECOMMENDATION: Stacked Area Chart

Why:
- Shows part-to-whole (sector contribution to total)
- Reveals trends over time
- 12 sectors fits well with our color palette

Library: Recharts (lighter than D3 for this use case)

Alternative: Line chart with selector
- Cleaner for comparing specific sectors
- But loses part-to-whole relationship
```

Approve the recommended approach.

### Step 4: Implementation

Claude invokes **frontend-architect** and creates:
- React component with proper state management
- Data fetching with TanStack Query
- Responsive design
- Accessibility features (ARIA labels, keyboard navigation)

### Step 5: Review and Iterate

```
"The chart looks good but the colors are too similar for Salud and Gobernacion.
Can we adjust?"
```

Claude will explain the color constraints and propose solutions.

---

## 5. Modifying the Risk Model

**Scenario:** You want to add a new risk factor for contracts awarded before elections.

### Step 1: Describe the Factor

```
"I want to add a risk factor for contracts awarded in the 3 months
before federal elections. The hypothesis is that these have higher
corruption risk."
```

Claude invokes **risk-model-engineer**.

### Step 2: Answer Methodology Questions

```
RISK MODEL QUESTIONS:
1. What weight should this factor have? Current model sums to 100%.
2. Should it replace an existing factor or increase total weight?
3. Do we have election dates to validate against?
4. How do we handle state vs federal elections?
```

### Step 3: Review Proposed Design

```
PROPOSED FACTOR: Election Timing Risk

Calculation:
- 1.0 if contract awarded within 90 days before federal election
- 0.5 if within 180 days
- 0.0 otherwise

Proposed weight: 5% (reduce Year-end timing from 5% to 3%,
                      Threshold splitting from 5% to 2%)

Rationale: Based on IMCO Mexico research showing 23% higher
irregularity rates in pre-election periods.

Validation plan:
1. Test against known corruption cases
2. Check for sector-specific variations
3. Analyze false positive rate
```

Approve or modify.

### Step 4: Implementation and Testing

Claude will:
- Add the factor to the risk calculation
- Run validation against historical data
- Report on score distribution changes
- Identify any new false positives

---

## 6. Database Schema Changes

**Scenario:** You need to track contract amendments over time.

### Step 1: Describe the Requirement

```
"We need to track contract amendments - when contracts are modified
after initial award, including amount changes and reasons."
```

Claude invokes **schema-architect**.

### Step 2: Answer Design Questions

```
SCHEMA QUESTIONS:
1. One amendment record per change, or one record with history?
2. Should we track who approved the amendment?
3. Link to original contract by ID or procedure number?
4. Expected volume? (amendments per year)
```

### Step 3: Review Schema Design

```
PROPOSED SCHEMA

Option A: Normalized (recommended)
CREATE TABLE contract_amendments (
    id INTEGER PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    amendment_date DATE NOT NULL,
    original_amount DECIMAL(15,2),
    new_amount DECIMAL(15,2),
    amount_change DECIMAL(15,2),
    reason TEXT,
    approved_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_amendments_contract ON contract_amendments(contract_id);
CREATE INDEX idx_amendments_date ON contract_amendments(amendment_date);

Option B: Denormalized
Add columns to contracts table...

Trade-offs:
- A: Better for multiple amendments per contract, cleaner queries
- B: Simpler, but can't track multiple amendments
```

Approve your preferred approach.

### Step 4: Migration

Claude will:
- Create a backup
- Generate migration SQL
- Provide rollback SQL
- Update affected queries and models

---

## General Tips

### Before Starting Any Workflow

1. **Clear context** if switching tasks: `/clear`
2. **Be specific** about what you want
3. **Mention constraints** (time, compatibility, etc.)

### During the Workflow

1. **Ask questions** if you don't understand Claude's reasoning
2. **Request alternatives** if you don't like the first suggestion
3. **Provide feedback** so Claude can adjust

### After Completing

1. **Verify** the results match expectations
2. **Test** edge cases
3. **Document** any decisions made

---

*"The most dangerous thing is to win without thinking."* - RUBLI
