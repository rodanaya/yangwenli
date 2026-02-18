# CRITICAL DATA QUALITY FINDINGS
## COMPRANET Source Data Analysis (2002-2025)

**Analysis Date**: 2026-01-06
**Data Guardian**: RUBLI Agent
**Status**: SAMPLE ANALYSIS COMPLETE - FULL VALIDATION REQUIRED

---

## CRITICAL FINDING: NO TRILLION-PESO ERRORS IN SAMPLES

**GOOD NEWS**: Unlike the previous ogulin project, the sampled data (10K rows per file) shows NO contracts exceeding critical thresholds.

### Amount Threshold Analysis (10K samples)

| Structure | Year Sample | Max Value | > 100B | > 10B | > 1B | Status |
|-----------|-------------|-----------|--------|-------|------|--------|
| A | 2002 | 1.87B MXN | 0 | 0 | 2 | PASS |
| B | 2010 | 9.39B MXN | 0 | 0 | 6 | PASS |
| C | 2018 | 907M MXN | 0 | 0 | 0 | PASS |
| D | 2023 | 2.28B MXN | 0 | 0 | 3 | PASS |
| D | 2024 | 1.02B MXN | 0 | 0 | 2 | PASS |

### WARNING: Sample vs Full Dataset

This is based on 10,000 row samples. The ogulin project had only 7 problematic contracts out of 3.1M total (0.0002%). Full dataset validation is REQUIRED.

**Action Required**:
```python
# Run full amount validation on ALL files
for file in all_files:
    df = load_file(file)
    outliers = df[df['amount'] > 100_000_000_000]
    if len(outliers) > 0:
        RAISE_ALERT_AND_INVESTIGATE(outliers)
```

---

## ENCODING ISSUE: CSV Files Require Latin-1

**Critical**: Structure D (2023-2025) CSV files FAIL with UTF-8 encoding.

```python
# WRONG - Will fail
df = pd.read_csv('Contratos_CompraNet2023.csv')  # UnicodeDecodeError

# CORRECT
df = pd.read_csv('Contratos_CompraNet2023.csv', encoding='latin-1')
```

**Error Message**: `'utf-8' codec can't decode byte 0xf3 in position 38: invalid continuation byte`

**Files Affected**:
- Contratos_CompraNet2023.csv
- Contratos_CompraNet2024.csv
- Contratos_CompraNet2025.csv

**Root Cause**: Spanish characters (ó, á, ñ, etc.) encoded in Latin-1/ISO-8859-1.

---

## DATA STRUCTURE EVOLUTION

### Structure Changes Over Time

| Period | Columns | Key Feature | Data Quality |
|--------|---------|-------------|--------------|
| 2002-2010 (A) | 13 | Minimal data | NO RFC, NO ramo, NO partida |
| 2010-2017 (B) | 13 | Same as A | NO RFC, NO ramo, NO partida |
| 2018-2022 (C) | 45 | RFC introduced | 66% RFC coverage, NO ramo |
| 2023-2025 (D) | 73 | Full metadata | 100% ramo, 100% partida, ~100% RFC |

### Critical Field Coverage by Period

| Field | 2002-2010 | 2010-2017 | 2018-2022 | 2023-2025 |
|-------|-----------|-----------|-----------|-----------|
| **Vendor RFC** | 0% | 0% | 66.1% | ~100% |
| **Ramo Code** | 0% | 0% | 0% | **100%** |
| **Partida Especifica** | 0% | 0% | 0% | **100%** |
| **CUCOP Code** | 0% | 0% | 100% | 0% |
| **Publication Date** | 0% | 0% | 99.9% | 100% |
| **Apertura Date** | 0% | 0% | 99.9% | 17.4% |
| **Fallo Date** | 0% | 0% | 31.1% | 19.9% |

**Implication**: Risk scoring for 2002-2017 will be LOWER due to missing fields.

---

## VENDOR NAME CASE INCONSISTENCY

### Case Analysis

| Period | Sample | UPPERCASE % | Mixed Case % |
|--------|--------|-------------|--------------|
| 2002-2010 | 2002 | 100.0% | 0.0% |
| 2010-2017 | 2010 | 99.1% | 0.9% |
| 2018-2022 | 2018 | 98.6% | 1.4% |
| 2023-2025 | 2023 | **2.2%** | **97.8%** |
| 2023-2025 | 2024 | **2.3%** | **97.7%** |

**Critical Change**: Starting in 2023, COMPRANET switched from UPPERCASE to Mixed Case vendor names.

**Examples**:
- Pre-2023: `LABORATORIOS DE BIOLOGICOS Y REACTIVOS DE MEXICO SA DE CV`
- Post-2023: `Emerson Process Management S.A. de C.V.`

**Impact**: Vendor matching MUST be case-insensitive.

```python
# Required normalization
vendor_name = str(vendor_name).upper().strip()
```

---

## RFC FIELD NAME CASE CHANGE

**Critical**: The RFC field name changed case between Structure C and D.

| Period | Field Name | Case |
|--------|-----------|------|
| 2018-2022 | `RFC` | UPPERCASE |
| 2023-2025 | `rfc` | lowercase |

**Code Impact**:
```python
def get_rfc(row, year):
    if year <= 2017:
        return None
    elif year <= 2022:
        return row.get('RFC')  # UPPERCASE
    else:
        return row.get('rfc')  # lowercase
```

---

## DATE FORMAT INCONSISTENCIES

### Multiple Formats in Structure D

Structure D (2023-2025) has **TWO different date formats in the same file**:

| Field | Format | Example |
|-------|--------|---------|
| Fecha de publicación | ISO with time | `2023-11-15 15:22:51` |
| Fecha de inicio | DD/MM/YYYY | `28/02/2023` |
| Fecha de fin | DD/MM/YYYY | `30/03/2023` |
| Fecha de apertura | ISO with time | `2023-05-02 16:30:00` |

**Parsing Strategy**:
```python
pd.to_datetime(date_str, errors='coerce', dayfirst=True)
```

### GMT Suffix in Structure C

Some dates in Structure C have "GMT" suffix:
- `2018-07-31 00:00:00 GMT`
- `2018-06-08 00:00:00 GMT`

**Note**: pandas `to_datetime` handles this automatically.

---

## AMOUNT COLUMN NAME CHANGES

**Critical**: The amount field name changes across structures.

| Period | Column Name |
|--------|-------------|
| 2002-2017 | `IMPORTE MN SIN IVA` |
| 2018-2022 | `Importe del contrato` |
| 2023-2025 | `Importe DRC` |

**Mapping Function Required**:
```python
AMOUNT_COLUMNS = {
    'A': 'IMPORTE MN SIN IVA',
    'B': 'IMPORTE MN SIN IVA',
    'C': 'Importe del contrato',
    'D': 'Importe DRC'
}
```

---

## NULL RATE PATTERNS

### High Null-Rate Fields (Safe to Ignore)

These fields are rarely populated and can be treated as optional:

| Field | Structure C | Structure D | Reason |
|-------|-------------|-------------|--------|
| Clave programa federal | 93.3% | 95.1% | Not all contracts tied to federal programs |
| Clave cartera SHCP | 99.3% | 99.1% | Investment projects only |
| Crédito externo | 98.4% | 100% | Foreign-financed contracts only |
| Organismo financiero | 99.9% | 100% | Foreign-financed contracts only |

### Procedure-Dependent Nulls

These fields are null for direct awards (adjudicación directa):

| Field | Structure C | Structure D | Null For |
|-------|-------------|-------------|----------|
| Fecha de fallo | 68.9% | 80.1% | Direct awards |
| Fecha de apertura | 0.1% | 82.6% | Direct awards |
| Forma de participación | 0.3% | 82.6% | Direct awards |

**Validation**: If `Tipo de procedimiento = "Adjudicación Directa"`, these SHOULD be null.

### Modification-Dependent Nulls

Structure D has many modification-related fields that are 72-98% null:

| Field Pattern | Null Rate | Reason |
|---------------|-----------|--------|
| Convenio modificatorio | 72.4% | Most contracts have no modifications |
| Código Ref. Contrato | 72.4% | Only populated if modified |
| Monto sin imp./mínimo | 72.4% | Framework contracts only |
| Código Ref. último convenio | 97.3% | Only if multiple modifications |

**Validation**: These are null for unmodified contracts - this is EXPECTED.

---

## RAMO CODE AVAILABILITY

**Critical Limitation**: Ramo codes only exist in Structure D (2023+).

| Period | Source | Availability |
|--------|--------|--------------|
| 2002-2017 | N/A | **Must derive from institution name** |
| 2018-2022 | N/A | **Must derive from institution name** |
| 2023-2025 | `Clave Ramo` | **100% populated** |

**Impact**:
- Pre-2023 sector classification must rely on institution name mapping
- Post-2023 can use direct ramo code lookup
- The 12-sector taxonomy relies on ramo codes, so pre-2023 classification is less reliable

**Derivation Required**:
```python
# For 2002-2022, must map institution to sector
INSTITUTION_TO_SECTOR = {
    'PEMEX': 'energia',
    'CFE': 'energia',
    'ISSSTE': 'salud',
    'IMSS': 'salud',
    # ... extensive mapping needed
}
```

---

## PARTIDA CLASSIFICATION INCONSISTENCY

**Warning**: Different classification systems used across periods.

| Period | Field | System | Coverage |
|--------|-------|--------|----------|
| 2002-2017 | N/A | None | 0% |
| 2018-2022 | `Clave CUCOP` | CUCOP Catalog | 100% |
| 2023-2025 | `Partida específica` | Budget Line Item | 100% |

**Incompatibility**: CUCOP codes and Partida Específica are **different classification systems**.

**Examples**:
- CUCOP: Product/service classification (e.g., "10101501" = Office Supplies)
- Partida: Budget classification (e.g., "21101" = Materials and Supplies)

**Impact**: Cannot merge these fields. Must maintain separate columns.

---

## STRUCTURE A/B ARE IDENTICAL

**Finding**: Structures A (2002-2010) and B (2010-2017) have IDENTICAL schemas.

Both have exactly 13 columns:
1. DEPENDENCIA / ENTIDAD
2. NOMBRE UC
3. CLAVE UC
4. NÚMERO DE PROCEDIMIENTO
5. TIPO DE PROCEDIMIENTO
6. TIPO CONTRATACIÓN
7. CARACTER
8. NÚMERO DE CONTRATO
9. REFERENCIA DE LA CONTRATACIÓN
10. FECHA DE SUSCRIPCIÓN DE CONTRATO
11. IMPORTE MN SIN IVA
12. RAZÓN SOCIAL
13. URL DEL CONTRATO

**Implication**: Can use the same parsing logic for 2002-2017.

---

## RECOMMENDED ETL VALIDATION STEPS

### Pre-Processing Checks

```python
def validate_file_before_processing(file_path, year):
    """Run these checks BEFORE ingestion"""

    # 1. Encoding check
    encoding = 'latin-1' if year >= 2023 else None

    # 2. Load sample
    sample = load_sample(file_path, nrows=10000, encoding=encoding)

    # 3. Identify structure
    num_cols = len(sample.columns)
    if num_cols == 13:
        structure = 'A/B'
    elif num_cols == 45:
        structure = 'C'
    elif num_cols == 73:
        structure = 'D'
    else:
        raise ValueError(f"Unexpected column count: {num_cols}")

    # 4. Validate amount column exists
    amount_col = get_amount_column(structure)
    if amount_col not in sample.columns:
        raise ValueError(f"Amount column '{amount_col}' not found")

    # 5. Check for critical outliers
    amounts = pd.to_numeric(sample[amount_col], errors='coerce')
    critical = (amounts > 100_000_000_000).sum()
    flagged = ((amounts > 10_000_000_000) & (amounts <= 100_000_000_000)).sum()

    return {
        'encoding': encoding,
        'structure': structure,
        'amount_column': amount_col,
        'critical_outliers': critical,
        'flagged_outliers': flagged
    }
```

### Amount Validation (CRITICAL)

```python
def validate_amount(amount, contract_id, year, sector):
    """Validate contract amount against thresholds"""

    # Convert to numeric
    amount = pd.to_numeric(amount, errors='coerce')

    if pd.isna(amount):
        return {'action': 'SET_TO_ZERO', 'reason': 'NULL_AMOUNT'}

    if amount < 0:
        return {'action': 'FLAG', 'reason': 'NEGATIVE_AMOUNT'}

    # CRITICAL: Reject amounts > 100B MXN (decimal errors)
    if amount > 100_000_000_000:
        return {
            'action': 'REJECT',
            'reason': 'EXCEEDS_100B_THRESHOLD',
            'value': amount,
            'contract_id': contract_id
        }

    # FLAG: Amounts > 10B MXN need manual review
    if amount > 10_000_000_000:
        return {
            'action': 'FLAG',
            'reason': 'EXCEEDS_10B_THRESHOLD',
            'value': amount,
            'contract_id': contract_id,
            'sector': sector
        }

    # Large but potentially valid
    if amount > 1_000_000_000:
        return {
            'action': 'ACCEPT',
            'reason': 'LARGE_BUT_VALID',
            'value': amount,
            'requires_review': True
        }

    # Normal amounts
    return {'action': 'ACCEPT', 'reason': 'NORMAL'}
```

### Vendor Name Normalization

```python
def normalize_vendor_name(name):
    """Normalize vendor name for deduplication"""

    if pd.isna(name):
        return None

    # Convert to uppercase
    name = str(name).upper().strip()

    # Remove extra whitespace
    name = ' '.join(name.split())

    # Remove common punctuation inconsistencies
    name = name.replace(',', '').replace('.', '')

    # TODO: Add fuzzy matching for:
    # - "S.A. DE C.V." vs "SA DE CV"
    # - "MÉXICO" vs "MEXICO"
    # - Abbreviation variations

    return name
```

### RFC Extraction

```python
def get_rfc_field(row, year):
    """Extract RFC based on year"""

    if year <= 2017:
        return None

    if year <= 2022:
        rfc = row.get('RFC')  # UPPERCASE field name
    else:
        rfc = row.get('rfc')  # lowercase field name

    # Validate RFC format (optional)
    if rfc and not is_valid_rfc_format(rfc):
        return None

    return rfc

def is_valid_rfc_format(rfc):
    """Validate Mexican RFC format"""
    import re

    if pd.isna(rfc) or rfc == '':
        return False

    # Persona moral (company): AAA010101AAA
    # Persona física (individual): AAAA010101AAA
    pattern = r'^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$'

    return bool(re.match(pattern, str(rfc).upper()))
```

---

## NEXT STEPS - REQUIRED ACTIONS

### 1. Full Dataset Amount Validation

Run amount validation on ALL 3.1M records:

```bash
python validate_all_amounts.py --threshold 100000000000 --flag 10000000000
```

Expected output:
- List of all contracts > 100B MXN (should be 0 or very few)
- List of all contracts > 10B MXN (for manual review)
- Statistical distribution by year and sector

### 2. Vendor Deduplication Analysis

Analyze vendor name variations:

```bash
python analyze_vendor_names.py --similarity 0.85
```

Expected output:
- Clusters of similar vendor names
- Suggested merges
- RFC conflicts (same RFC, different names)

### 3. Ramo Derivation for Pre-2023 Data

Create institution-to-ramo mapping:

```bash
python derive_ramo_codes.py --years 2002-2022
```

Strategy:
- Use institution name patterns
- Cross-reference with post-2023 data
- Manual verification of top institutions

### 4. RFC Validation

Validate RFC format and check for duplicates:

```bash
python validate_rfcs.py --check-sat-registry
```

Expected output:
- Invalid RFC formats
- Duplicate RFCs with different vendor names
- RFC vs vendor name mismatches

### 5. Date Consistency Checks

Validate date logic:

```bash
python validate_dates.py
```

Checks:
- End date >= Start date
- Signature date <= Start date
- Publication date <= Apertura date
- Apertura date <= Fallo date
- Temporal outliers (contracts from future/distant past)

---

## FILES GENERATED

| File | Purpose |
|------|---------|
| `DATA_STRUCTURE_REPORT.md` | Full structural analysis and field mappings |
| `CRITICAL_FINDINGS.md` | This document - data quality issues |
| `column_mapping.csv` | Detailed column mappings for ETL |
| `structure_analysis.json` | Raw analysis data (JSON) |
| `structure_analysis_output.txt` | Full console output |
| `analyze_structures.py` | Analysis script (reusable) |
| `column_mapping.py` | Mapping generation script |

---

## APPROVAL REQUIRED

Before proceeding with full ETL pipeline, please confirm:

- [ ] You have reviewed the amount validation thresholds (100B reject, 10B flag)
- [ ] You understand the encoding requirements (latin-1 for CSV)
- [ ] You acknowledge the RFC field name case change (RFC -> rfc)
- [ ] You accept the vendor name normalization approach (UPPERCASE)
- [ ] You understand the ramo code limitation for pre-2023 data
- [ ] You are aware of the CUCOP vs Partida classification incompatibility
- [ ] You want to proceed with full dataset validation

**Next Command**: If approved, run:
```bash
python backend/scripts/etl_pipeline.py --validate-amounts --dry-run
```

This will perform a dry-run of the full ETL pipeline with amount validation enabled.

---

**Data Quality Guardian**: RUBLI Agent
**Report Date**: 2026-01-06
**Confidence**: HIGH (based on 50K sampled records)
**Full Validation**: REQUIRED
