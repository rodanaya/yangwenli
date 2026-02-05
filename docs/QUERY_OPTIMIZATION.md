# Query Optimization Guide

> Performance tuning strategies for the RUBLI_NORMALIZED.db database.

---

## Overview

The database contains ~3.1 million contracts. Without proper optimization, queries can take 10+ seconds. This guide covers our optimization strategies.

---

## Index Strategy

### Current Indexes

```sql
-- Primary lookup indexes
CREATE INDEX idx_contracts_sector ON contracts(sector_id);
CREATE INDEX idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX idx_contracts_institution ON contracts(institution_id);
CREATE INDEX idx_contracts_year ON contracts(contract_year);

-- Filter indexes
CREATE INDEX idx_contracts_risk ON contracts(risk_level);
CREATE INDEX idx_contracts_amount ON contracts(amount_mxn);
CREATE INDEX idx_contracts_direct ON contracts(is_direct_award);
CREATE INDEX idx_contracts_single ON contracts(is_single_bid);

-- Compound indexes for common queries
CREATE INDEX idx_contracts_sector_year ON contracts(sector_id, contract_year);
CREATE INDEX idx_contracts_vendor_year ON contracts(vendor_id, contract_year);
```

### When to Add Indexes

Add an index when:
- Column appears in WHERE clause frequently
- Column is used in JOIN conditions
- Column is used in ORDER BY with LIMIT
- Cardinality is high (many distinct values)

Don't add indexes when:
- Table is small (<10K rows)
- Column has low cardinality (e.g., boolean)
- Heavy write workload (indexes slow INSERTs)

---

## Query Patterns

### Anti-Pattern: SELECT *

```sql
-- BAD: Fetches all columns
SELECT * FROM contracts WHERE sector_id = 1 LIMIT 100;

-- GOOD: Only fetch needed columns
SELECT id, contract_number, amount_mxn, vendor_id
FROM contracts
WHERE sector_id = 1
LIMIT 100;
```

### Anti-Pattern: Missing LIMIT

```sql
-- BAD: Can return millions of rows
SELECT * FROM contracts WHERE contract_year = 2024;

-- GOOD: Always paginate
SELECT * FROM contracts
WHERE contract_year = 2024
ORDER BY id
LIMIT 50 OFFSET 0;
```

### Anti-Pattern: OR with Different Columns

```sql
-- BAD: Can't use indexes efficiently
SELECT * FROM contracts
WHERE vendor_id = 123 OR institution_id = 456;

-- GOOD: Use UNION
SELECT * FROM contracts WHERE vendor_id = 123
UNION ALL
SELECT * FROM contracts WHERE institution_id = 456;
```

---

## EXPLAIN QUERY PLAN

Always check query plans for slow queries:

```sql
EXPLAIN QUERY PLAN
SELECT * FROM contracts
WHERE sector_id = 1 AND contract_year = 2024;
```

### Reading the Output

| Output | Meaning | Action |
|--------|---------|--------|
| `SCAN TABLE` | Full table scan | Add index |
| `SEARCH TABLE ... USING INDEX` | Index used | Good |
| `USING COVERING INDEX` | Index only | Excellent |
| `USE TEMP B-TREE FOR ORDER BY` | Sort in memory | Add compound index |

### Example Analysis

```sql
EXPLAIN QUERY PLAN
SELECT v.name, COUNT(*) as contracts
FROM contracts c
JOIN vendors v ON c.vendor_id = v.id
WHERE c.sector_id = 1
GROUP BY v.id
ORDER BY contracts DESC
LIMIT 10;

-- Output:
-- SEARCH TABLE contracts AS c USING INDEX idx_contracts_sector (sector_id=?)
-- SEARCH TABLE vendors AS v USING INTEGER PRIMARY KEY (rowid=?)
-- USE TEMP B-TREE FOR GROUP BY
-- USE TEMP B-TREE FOR ORDER BY
```

---

## Caching Strategy

### In-Memory Cache (Current Implementation)

```python
# sectors.py - 2-hour cache for sector statistics
SECTORS_CACHE_TTL = 7200

# Analysis overview - 1-hour cache
ANALYSIS_CACHE_TTL = 3600

# Vendor concentration - 2-hour cache
CONCENTRATION_CACHE_TTL = 7200
```

### When to Cache

| Query Type | Cache TTL | Rationale |
|------------|-----------|-----------|
| Dashboard aggregates | 1-2 hours | Changes infrequently |
| Sector statistics | 2 hours | Only changes with ETL |
| Vendor lists | No cache | Paginated, varies |
| Search results | No cache | User-specific |
| Analysis overview | 1 hour | Expensive query |

### Cache Invalidation

```python
# After ETL run, invalidate all caches
from api.routers.sectors import _cache
_cache.invalidate()  # Clear all

# Or invalidate specific patterns
_cache.invalidate("sectors")  # Clear sector caches
```

---

## Pre-computed Statistics

### vendor_stats Table

Instead of calculating on every request:

```sql
-- BAD: Calculate on demand (slow)
SELECT
    v.id,
    COUNT(c.id) as total_contracts,
    SUM(c.amount_mxn) as total_value,
    AVG(c.risk_score) as avg_risk
FROM vendors v
LEFT JOIN contracts c ON v.id = c.vendor_id
GROUP BY v.id;

-- GOOD: Pre-computed table (fast)
SELECT * FROM vendor_stats WHERE vendor_id = ?;
```

### Refreshing Pre-computed Data

```bash
# Run after ETL
python scripts/migrate_vendor_stats.py
```

---

## Pagination Best Practices

### Offset Pagination

Simple but slow for large offsets:

```sql
-- Page 1 (fast)
SELECT * FROM contracts ORDER BY id LIMIT 50 OFFSET 0;

-- Page 1000 (slow - must skip 49,950 rows)
SELECT * FROM contracts ORDER BY id LIMIT 50 OFFSET 49950;
```

### Keyset Pagination (Cursor-based)

Better for large datasets:

```sql
-- First page
SELECT * FROM contracts
ORDER BY id
LIMIT 50;

-- Next page (after id 12345)
SELECT * FROM contracts
WHERE id > 12345
ORDER BY id
LIMIT 50;
```

---

## Query Performance Benchmarks

| Query | Without Index | With Index | Notes |
|-------|--------------|------------|-------|
| Contracts by sector | 8.5s | 0.12s | Use sector_id index |
| Vendor by RFC | 4.2s | 0.05s | Use rfc index |
| High-risk contracts | 6.1s | 0.15s | Use risk_level index |
| Year-over-year stats | 12.3s | 0.8s | Pre-compute or cache |
| Vendor concentration | 15.2s | 2.1s | Complex; use cache |

---

## SQLite-Specific Optimizations

### PRAGMA Settings

```sql
-- Enable write-ahead logging (better concurrency)
PRAGMA journal_mode=WAL;

-- Increase cache size (default 2000 pages = 8MB)
PRAGMA cache_size=-64000;  -- 64MB

-- Use memory for temp tables
PRAGMA temp_store=MEMORY;

-- Analyze tables for query planner
ANALYZE;
```

### Connection Pooling

SQLite handles concurrent reads well but only one writer. For the API:

```python
# Use connection pooling with read-only connections
def get_db():
    conn = sqlite3.connect(
        DB_PATH,
        check_same_thread=False,
        timeout=30.0
    )
    conn.row_factory = sqlite3.Row
    return conn
```

---

## Monitoring Slow Queries

### Logging Slow Queries

```python
import time
import logging

logger = logging.getLogger(__name__)

def execute_with_timing(cursor, query, params=()):
    start = time.time()
    cursor.execute(query, params)
    elapsed = time.time() - start

    if elapsed > 1.0:  # Log queries over 1 second
        logger.warning(f"Slow query ({elapsed:.2f}s): {query[:100]}")

    return cursor
```

### Query Stats Table

```sql
CREATE TABLE IF NOT EXISTS query_stats (
    id INTEGER PRIMARY KEY,
    query_hash TEXT,
    execution_time REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Optimization Checklist

Before deploying new queries:

- [ ] Run EXPLAIN QUERY PLAN
- [ ] Verify indexes are used
- [ ] Add LIMIT for all list queries
- [ ] Consider caching for aggregates
- [ ] Test with production data volume
- [ ] Check for N+1 patterns
- [ ] Validate amount filters (<=100B)

---

*Last updated: January 2026*
