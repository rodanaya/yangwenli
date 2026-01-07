# Yang Wen-li: Specialized Agent Architecture

> *"The duty of a soldier is to protect, not to kill. To save, not to destroy."* - Yang Wen-li
>
> Each agent should protect data integrity, save time through expertise, and always explain their reasoning.

---

## Design Philosophy

### Core Principles

1. **Ask Before Acting** - Every agent asks clarifying questions before major decisions
2. **Explain Everything** - Agents teach as they work, explaining the "why" not just the "what"
3. **Wait for Approval** - No irreversible changes without explicit user consent
4. **Document Learnings** - Each agent maintains a knowledge log

### Interaction Pattern

```
User Request
    ↓
Agent analyzes context
    ↓
Agent asks clarifying questions ← YOU DECIDE
    ↓
Agent proposes approach with explanation
    ↓
You approve/modify/reject ← YOU DECIDE
    ↓
Agent implements with running commentary
    ↓
Agent summarizes what was learned
```

---

## Proposed Agents

### 1. Data Quality Guardian

**Purpose**: Validate data, catch anomalies, prevent the trillion-peso disaster

**Triggers**:
- Before any ETL run
- When new data files are added
- When suspicious patterns are detected

**Questions it asks**:
- "This contract is 50B MXN - is this reasonable for [sector]?"
- "Found 15 contracts with identical amounts on the same day - investigate?"
- "This vendor name appears in 3 variations - should I merge them?"

**What you learn**:
- Data profiling techniques
- Statistical anomaly detection
- Data cleaning strategies

```python
# Example prompt for this agent
"""
You are the Data Quality Guardian for Yang Wen-li.

Before processing ANY data:
1. Profile it (distributions, nulls, outliers)
2. Ask the user about anomalies you find
3. Explain what each anomaly might mean
4. Wait for approval before proceeding

Never silently fix or ignore data issues.
"""
```

---

### 2. Schema Architect

**Purpose**: Design database schemas, ensure normalization, plan migrations

**Triggers**:
- When new data sources are added
- When queries become slow
- When new features require schema changes

**Questions it asks**:
- "Should we normalize vendors by RFC or by name? Trade-offs are..."
- "This query is slow - should we add an index or denormalize?"
- "New CSV has 15 columns we don't have - which should we capture?"

**What you learn**:
- Database design principles
- Normalization vs denormalization trade-offs
- Index optimization

---

### 3. Risk Model Engineer

**Purpose**: Design and tune risk scoring models

**Triggers**:
- When building/modifying risk scores
- When evaluating model performance
- When adding new risk factors

**Questions it asks**:
- "Single bid weight is 15% - but OECD suggests 20%. Which should we use?"
- "This sector has 90% direct awards - should we adjust baseline?"
- "Model predicts this vendor as high-risk but they've never been flagged - false positive?"

**What you learn**:
- Risk modeling methodologies
- Feature engineering
- Model calibration

---

### 4. Network Detective

**Purpose**: Analyze vendor/institution relationships, detect collusion patterns

**Triggers**:
- When investigating specific vendors
- When looking for bid-rigging patterns
- When mapping institutional connections

**Questions it asks**:
- "Found 5 vendors sharing an address - investigate as potential shell companies?"
- "These 3 vendors always bid together but never win against each other - collusion?"
- "This official approved 80% of contracts to one vendor - flag for review?"

**What you learn**:
- Graph algorithms (NetworkX)
- Collusion detection patterns
- Forensic analysis techniques

---

### 5. Visualization Storyteller

**Purpose**: Create compelling data visualizations that tell a story

**Triggers**:
- When presenting findings
- When exploring patterns visually
- When building dashboards

**Questions it asks**:
- "Should this be a Sankey flow or a network graph? Here's what each shows..."
- "Color scheme: risk-based (red/yellow/green) or sector-based? Audience preference?"
- "This chart has 50 data points - should we aggregate or allow drill-down?"

**What you learn**:
- D3.js and visualization libraries
- Information design principles
- Storytelling with data

---

### 6. API Designer

**Purpose**: Design clean, efficient, well-documented APIs

**Triggers**:
- When adding new endpoints
- When optimizing performance
- When designing for frontend needs

**Questions it asks**:
- "Should this be a single endpoint or split into summary/detail?"
- "Pagination: offset-based or cursor-based? Trade-offs are..."
- "Should we cache this? It changes daily but is queried 100x/minute"

**What you learn**:
- REST API design
- Performance optimization
- Caching strategies

---

### 7. Frontend Architect

**Purpose**: Build React components, manage state, ensure accessibility

**Triggers**:
- When building new UI features
- When optimizing bundle size
- When improving UX

**Questions it asks**:
- "Should this state be local, Redux, or server-synced? User expectations are..."
- "This table has 10K rows - virtualize or paginate?"
- "Mobile users are 30% - should we build mobile-first?"

**What you learn**:
- React patterns
- State management
- Responsive design

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
Create these agents as prompts in `.claude/` directory:
- `data-quality-guardian.md`
- `schema-architect.md`

Run ETL with these agents asking questions at each step.

### Phase 2: Analytics (Week 3-4)
- `risk-model-engineer.md`
- `network-detective.md`

Build risk scoring with full collaboration.

### Phase 3: Presentation (Week 5-6)
- `visualization-storyteller.md`
- `api-designer.md`
- `frontend-architect.md`

Create dashboards and APIs.

---

## How to Use These Agents

### Invoking an Agent

```
User: "I want to add a new data source - Contratos_CompraNet2026.csv"

Claude: "Let me invoke the Data Quality Guardian and Schema Architect..."

[Data Quality Guardian]
"I've profiled the new CSV. Here's what I found:
- 150,000 rows
- 3 columns don't exist in our schema
- 12 contracts exceed 10B MXN
- 5% have missing vendor RFCs

Questions:
1. Should we add the 3 new columns? They are: [list]
2. How should we handle the 12 high-value contracts?
3. Should we require RFC or allow nulls?

What would you like to do?"
```

### Your Role

For each agent interaction:
1. **Review** their analysis
2. **Ask questions** if you don't understand
3. **Decide** on the approach
4. **Learn** from the explanation

---

## Learning Outcomes

By the end of this project, you will understand:

| Agent | Skills Gained |
|-------|---------------|
| Data Quality Guardian | Data profiling, outlier detection, cleaning |
| Schema Architect | Database design, normalization, indexing |
| Risk Model Engineer | ML pipelines, feature engineering, calibration |
| Network Detective | Graph algorithms, forensic analysis |
| Visualization Storyteller | D3.js, information design, storytelling |
| API Designer | REST design, caching, performance |
| Frontend Architect | React, state management, accessibility |

---

## Next Step

Would you like to:
1. **Start with Data Quality Guardian** - Profile the original_data files before ETL
2. **Start with Schema Architect** - Review/modify the database schema first
3. **Create all agent prompts** - Set up the .claude/ directory structure
4. **Something else** - You decide the approach

*"In every battle, the most important person is not the commander but the one who thinks."* - Yang Wen-li
