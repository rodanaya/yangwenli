# Vendor Classification Methodology

> *"Facts over guesses. Every classification must have a verified source."*

This document describes the methodology used to classify vendors in the RUBLI procurement analysis platform.

---

## 1. Overview

### Purpose
Enable industry-aware risk scoring and cross-sector analysis by classifying vendors into verified industry categories.

### Coverage Statistics
| Metric | Value |
|--------|-------|
| Total vendors in database | 320,429 |
| Verified classifications | 45,603 (14.23%) |
| Verified patterns | 5,000 |
| Industry categories | 35 |
| Unverified classifications | 0 (all reverted) |

### Key Principle
**NO pattern-matching guesses.** Every classification must have:
- A documented online source
- Verification date
- Corporate group information (when applicable)
- Country of ownership

---

## 2. Verification Process

### 2.1 WebSearch Research Protocol

For each vendor or industry category, we perform systematic online research:

```
Step 1: Search "[Company Name] Mexico company" OR "[Industry] market leaders 2025"
Step 2: Find official company information from multiple sources
Step 3: Identify parent company/corporate group
Step 4: Note country of ultimate ownership
Step 5: Document all sources with URLs
```

### 2.2 Source Quality Hierarchy

Sources are ranked by reliability:

| Tier | Source Type | Examples | Confidence |
|------|-------------|----------|------------|
| 1 | Official filings | SEC, BMV, company annual reports | 0.98 |
| 2 | Company websites | Official corporate pages | 0.95 |
| 3 | Market research | Grand View Research, MarketsandMarkets, Mordor Intelligence | 0.92 |
| 4 | Industry directories | BNamericas, Bloomberg, Reuters | 0.90 |
| 5 | Business news | Financial Times, Wall Street Journal | 0.85 |

### 2.3 Verification Requirements

A classification is marked `verified_online` only when:
- At least 2 independent sources confirm the information
- The company's industry/sector is unambiguous
- Corporate ownership structure is documented
- Sources are from the last 3 years

---

## 3. Data Structure

### 3.1 VERIFIED_VENDORS Schema

Each verified vendor pattern in `backend/scripts/verified_vendor_data.py` contains:

```python
{
    'vendor_pattern': '%COMPANY NAME%',     # SQL LIKE pattern
    'industry_id': 1021,                    # FK to industry taxonomy
    'industry_code': 'farmaceutico',        # Human-readable code
    'corporate_group': 'Parent Company',    # Corporate parent
    'country': 'MX',                        # ISO 2-letter country code
    'source': 'grandviewresearch.com',      # Verification source
    'verified_date': '2026-01-13',          # When research was done
    'notes': 'Additional context'           # Market share, acquisitions, etc.
}
```

### 3.2 Database Tables

```sql
-- Industry taxonomy
vendor_industries (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50),           -- e.g., 'farmaceutico'
    name_es VARCHAR(200),       -- Spanish name
    name_en VARCHAR(200),       -- English name
    sector_affinity INTEGER,    -- Expected sector_id
    description TEXT
)

-- Vendor classifications
vendor_classifications (
    vendor_id INTEGER PRIMARY KEY,
    industry_id INTEGER,
    industry_code VARCHAR(50),
    industry_confidence REAL,   -- 0.0 - 1.0
    industry_source VARCHAR(50), -- 'verified_online'
    industry_rule VARCHAR(200)  -- Pattern that matched
)
```

---

## 4. Industry Taxonomy

### 4.1 Industry Categories (1001-1035)

| ID | Code | Description | Sector Affinity |
|----|------|-------------|-----------------|
| 1001 | servicios_petroleros | Oil & Gas Services | energia (4) |
| 1002 | perforacion | Drilling Services | energia (4) |
| 1003 | cerrajeria_herrajes | Door/Window Hardware | infraestructura (3) |
| 1004 | pinturas_recubrimientos | Paints & Coatings | infraestructura (3) |
| 1005 | iluminacion | Lighting Equipment | infraestructura (3) |
| 1006 | pisos_revestimientos | Flooring/Coverings | infraestructura (3) |
| 1007 | plomeria_griferia | Plumbing Fixtures | infraestructura (3) |
| 1008 | aislamiento_termico | Thermal Insulation | infraestructura (3) |
| 1009 | adhesivos_selladores | Adhesives & Sealants | infraestructura (3) |
| 1010 | equipo_lavanderia | Commercial Laundry | otros (12) |
| 1011 | herramientas_electricas | Power Tools | otros (12) |
| 1012 | herramientas_manuales | Hand Tools | otros (12) |
| 1013 | equipo_soldadura | Welding Equipment | infraestructura (3) |
| 1014 | compresores_neumatica | Compressors/Pneumatics | infraestructura (3) |
| 1015 | bombas_industriales | Industrial Pumps | infraestructura (3) |
| 1016 | valvulas_industriales | Industrial Valves | infraestructura (3) |
| 1017 | rodamientos | Bearings | infraestructura (3) |
| 1018 | sistemas_transportadores | Conveyor Systems | infraestructura (3) |
| 1019 | robots_industriales | Industrial Robots | tecnologia (6) |
| 1020 | plc_automatizacion | PLC/Automation | tecnologia (6) |
| 1021 | sensores_industriales | Industrial Sensors | tecnologia (6) |
| 1022 | motores_electricos | Electric Motors | energia (4) |
| 1023 | reductores_engranajes | Industrial Gears | infraestructura (3) |
| 1024 | sistemas_hidraulicos | Hydraulic Systems | infraestructura (3) |
| 1025 | transformadores | Power Transformers | energia (4) |
| 1026 | cables_industriales | Industrial Cables | energia (4) |
| 1027 | refrigeracion_comercial | Commercial Refrigeration | otros (12) |
| 1028 | equipo_procesamiento_alimentos | Food Processing | agricultura (9) |
| 1029 | maquinaria_empaque | Packaging Machinery | otros (12) |
| 1030 | filtracion_industrial | Industrial Filtration | infraestructura (3) |
| 1031 | equipo_manejo_materiales | Material Handling | infraestructura (3) |
| 1032 | generacion_energia | Power Generation | energia (4) |
| 1033 | compresores_industriales | Industrial Compressors | infraestructura (3) |
| 1034 | calderas_industriales | Industrial Boilers | energia (4) |
| 1035 | sistemas_climatizacion | HVAC Systems | infraestructura (3) |

### 4.2 Sector Affinity Mappings

Industry classifications map to the 12-sector COMPRANET taxonomy:

| Sector ID | Sector Name | Related Industries |
|-----------|-------------|-------------------|
| 1 | salud | Medical equipment, pharmaceuticals |
| 2 | educacion | Educational supplies |
| 3 | infraestructura | Construction, materials, industrial equipment |
| 4 | energia | Oil/gas, power generation, electrical |
| 5 | defensa | Defense equipment |
| 6 | tecnologia | Software, automation, robotics |
| 7 | hacienda | Financial services |
| 8 | gobernacion | Government services |
| 9 | agricultura | Food processing, agriculture |
| 10 | ambiente | Environmental services |
| 11 | trabajo | Labor services |
| 12 | otros | Misc. commercial equipment |

---

## 5. How to Add New Verified Vendors

### Step 1: Research the Vendor

```bash
# Use WebSearch to find company information
Search: "[VENDOR NAME] Mexico company industry"
Search: "[VENDOR NAME] corporate parent owner"
```

### Step 2: Document Findings

Collect the following information:
- Official company name
- Industry/sector
- Parent company (if applicable)
- Country of headquarters/ownership
- Source URLs (minimum 2)

### Step 3: Add to verified_vendor_data.py

```python
# Add to VERIFIED_VENDORS list in backend/scripts/verified_vendor_data.py
{
    'vendor_pattern': '%NEW VENDOR NAME%',
    'industry_id': XXXX,           # Use existing industry_id or create new
    'industry_code': 'code_here',
    'corporate_group': 'Parent Company Name',
    'country': 'XX',               # ISO 2-letter code
    'source': 'source1.com, source2.com',
    'verified_date': 'YYYY-MM-DD',
    'notes': 'Market position, key facts'
}
```

### Step 4: Apply Classifications

```bash
cd backend
python -c "
import sqlite3
import sys
sys.path.insert(0, 'scripts')
from verified_vendor_data import VERIFIED_VENDORS

conn = sqlite3.connect('RUBLI_NORMALIZED.db')
cursor = conn.cursor()

# Apply new pattern
pattern = VERIFIED_VENDORS[-1]  # Get last added pattern
cursor.execute('''
    UPDATE vendor_classifications
    SET industry_id = ?,
        industry_code = ?,
        industry_confidence = 0.95,
        industry_source = 'verified_online',
        industry_rule = ?
    WHERE vendor_id IN (
        SELECT id FROM vendors WHERE name LIKE ?
    ) AND industry_id IS NULL
''', (pattern['industry_id'], pattern['industry_code'],
      f\"pattern:{pattern['vendor_pattern']}\", pattern['vendor_pattern']))

conn.commit()
print(f'Updated {cursor.rowcount} vendors')
conn.close()
"
```

### Step 5: Verify Application

```sql
SELECT v.name, vc.industry_code, vc.industry_source
FROM vendors v
JOIN vendor_classifications vc ON v.id = vc.vendor_id
WHERE v.name LIKE '%NEW VENDOR NAME%';
```

---

## 6. Quality Assurance

### 6.1 Confidence Levels

| Confidence | Meaning | Source Requirement |
|------------|---------|-------------------|
| 0.95+ | Verified online | 2+ independent sources |
| 0.80-0.94 | High confidence | 1 reliable source |
| 0.50-0.79 | Pattern match | Name pattern only |
| < 0.50 | Unverified | No reliable source |

### 6.2 Data Quality Rules

1. **Never classify without verification** - If sources cannot be found, leave unclassified
2. **Prefer specific over generic** - Use most specific industry code applicable
3. **Document corporate groups** - Track parent companies for network analysis
4. **Update annually** - Verify classifications remain accurate

### 6.3 Rollback Procedure

If classifications need to be reverted:

```sql
-- Revert specific industry
UPDATE vendor_classifications
SET industry_id = NULL, industry_code = NULL,
    industry_confidence = NULL, industry_source = NULL
WHERE industry_id = XXXX;

-- Full rollback to backup
-- Restore from: backend/RUBLI_NORMALIZED.db.backup_20260113_143919
```

---

## 7. Major Verified Companies

### Global Market Leaders by Industry

| Industry | Top Companies | Total Market |
|----------|---------------|--------------|
| Oil & Gas Services | Schlumberger, Halliburton, Baker Hughes | $150B+ |
| Industrial Automation | Siemens, ABB, Rockwell, Fanuc | $200B+ |
| Power Generation | GE Vernova (34%), Siemens Energy (24%), Mitsubishi (27%) | $75B |
| Material Handling | Toyota Industries ($16.8B), KION ($9.2B), Jungheinrich | $178B |
| Industrial Compressors | Atlas Copco (18-22%), Ingersoll Rand (15-20%) | $40B |
| Commercial Refrigeration | Hussmann/Panasonic, Carrier/Haier, Daikin | $45B |

### Mexican Companies

| Company | Industry | Corporate Group |
|---------|----------|-----------------|
| CICSA | Construction | Grupo Carso |
| Condumex | Industrial Cables | Grupo Carso |
| Laboratorios PiSA | Pharmaceuticals | Independent |
| COTEMAR | Offshore Services | Independent |

---

## 8. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-13 | Initial 5,000 verified patterns |

---

*"The most important thing is not to classify, but to classify correctly."* - RUBLI methodology
