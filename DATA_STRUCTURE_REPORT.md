# COMPRANET Data Structure Analysis Report
## Mexican Government Procurement Data (2002-2025)

**Analysis Date**: 2026-01-06
**Data Directory**: `D:\Python\yangwenli\original_data\`
**Sample Size**: 10,000 rows per file

---

## Executive Summary

COMPRANET data exists in **4 distinct structures** spanning 23 years:

| Structure | Years | Files | Columns | Format | Key Characteristics |
|-----------|-------|-------|---------|--------|---------------------|
| **A** | 2002-2010 | 2002.xlsx - 2009.xlsx | 13 | XLSX | Minimal fields, NO RFC, 100% UPPERCASE |
| **B** | 2010-2017 | 2010.xlsx - 2017.xlsx | 13 | XLSX | Same as A, 100% UPPERCASE |
| **C** | 2018-2022 | 2018.xlsx - 2022.xlsx | 45 | XLSX | Full detail, 66% RFC, 99% UPPERCASE |
| **D** | 2023-2025 | CSV files | 73 | CSV (latin-1) | Most complete, Ramo codes, Partida Especifica |

### Critical Findings

1. **NO TRILLION-PESO ERRORS FOUND** in sample data (unlike previous ogulin project)
2. **Structure A/B are identical** (13 columns, minimal metadata)
3. **Structure C introduced RFC** field (66% populated in 2018 sample)
4. **Structure D is most complete** with Ramo codes (100% populated) and Partida Especifica
5. **CSV encoding**: Latin-1 (not UTF-8)

---

## Amount Analysis Summary

### Critical Threshold Analysis

| Structure | Max Value | > 100B MXN | > 10B MXN | > 1B MXN | Mean | Median |
|-----------|-----------|------------|-----------|----------|------|--------|
| **A (2002)** | 1.87B MXN | 0 | 0 | 2 | 2.08M | 317K |
| **B (2010)** | 9.39B MXN | 0 | 0 | 6 | 7.22M | 1.14M |
| **C (2018)** | 907M MXN | 0 | 0 | 0 | 2.46M | 184K |
| **D (2023)** | 2.28B MXN | 0 | 0 | 3 | 2.14M | 142K |
| **D (2024)** | 1.02B MXN | 0 | 0 | 2 | 1.89M | 127K |

### Key Observations

1. **Structure B (2010)** has highest max value at 9.39B MXN (still below 10B FLAG threshold)
2. **No critical outliers** requiring rejection (> 100B MXN)
3. **No FLAG-level outliers** (> 10B MXN) in sample data
4. **Contract values are generally reasonable** across all periods
5. **Medians are low** (100K-1M range), indicating many small contracts

**WARNING**: This is sampled data (10K rows per file). Full dataset analysis required to catch all outliers.

---

## Column Comparison

### Structure A & B (2002-2017) - 13 Columns

```
1.  DEPENDENCIA / ENTIDAD
2.  NOMBRE UC
3.  CLAVE UC
4.  NÚMERO DE PROCEDIMIENTO
5.  TIPO DE PROCEDIMIENTO
6.  TIPO CONTRATACIÓN
7.  CARACTER
8.  NÚMERO DE CONTRATO
9.  REFERENCIA DE LA CONTRATACIÓN
10. FECHA DE SUSCRIPCIÓN DE CONTRATO
11. IMPORTE MN SIN IVA
12. RAZÓN SOCIAL
13. URL DEL CONTRATO
```

### Structure C (2018-2022) - 45 Columns (NEW)

**Added fields:**
- RFC (66.1% populated)
- RFC verificado en el SAT (100% - boolean flag)
- Partida-level fields (Clave CUCOP)
- Procedure details (Fecha de fallo, Fecha de apertura, Fecha de publicación)
- Contract lifecycle dates (inicio, fin, firma)
- Financial details (Contrato marco, Compra consolidada, Contrato plurianual)
- Vendor details (Estratificación, País, Folio RUPC)
- Program codes (Clave programa federal, Clave cartera SHCP)

**Key Null Rates (Structure C):**
- RFC: 33.9% null
- Fecha de fallo: 68.9% null
- Fecha de firma: 64.3% null
- Clave programa federal: 93.3% null
- Clave cartera SHCP: 99.3% null
- Crédito externo: 98.4% null

### Structure D (2023-2025) - 73 Columns (NEW)

**Major additions over Structure C:**
- **Clave Ramo** (100% populated - KEY IMPROVEMENT)
- **Descripción Ramo** (100% populated)
- **Partida específica** (100% populated - KEY IMPROVEMENT)
- **Tipo de Institución** (6 types)
- Detailed exception tracking (Artículo de excepción, Descripción excepción)
- Consolidation tracking (Proc. Consolidación fields)
- DRC (Documento de Contrato) status tracking
- Detailed modification tracking (Convenio modificatorio with amounts)
- Vendor auto-registration status

**Key Improvements:**
- **RFC**: Now lowercase field name "rfc" (vs "RFC")
- **100% Partida específica coverage** (665 unique values in sample)
- **Ramo codes present** in 100% of records (vs 0% in earlier structures)

**Key Null Rates (Structure D - 2023):**
- Artículo de excepción: 12.2% null (for competitive procedures)
- Fecha de apertura: 82.6% null (direct awards don't have this)
- Fecha de fallo: 80.1% null
- Fecha de firma: 72.5% null
- Convenio modificatorio fields: 72.4% null (most contracts have no modifications)

---

## Field Mapping for Unified Schema

### Contract Identification

| Field | Structure A/B | Structure C | Structure D |
|-------|---------------|-------------|-------------|
| **Procedure Number** | NÚMERO DE PROCEDIMIENTO | Número del procedimiento | Número de procedimiento |
| **Contract Number** | NÚMERO DE CONTRATO | Código del contrato (int) | Código del contrato (str) |
| **Contract Reference** | REFERENCIA DE LA CONTRATACIÓN | Referencia del expediente | Referencia del expediente |

### Institution/UC

| Field | Structure A/B | Structure C | Structure D |
|-------|---------------|-------------|-------------|
| **Institution** | DEPENDENCIA / ENTIDAD | Institución | Institución |
| **UC Code** | CLAVE UC | Clave de la UC | Clave de la UC |
| **UC Name** | NOMBRE UC | Nombre de la UC | Nombre de la UC |
| **Ramo Code** | N/A | N/A | **Clave Ramo** |
| **Ramo Description** | N/A | N/A | **Descripción Ramo** |

### Amounts

| Field | Structure A/B | Structure C | Structure D |
|-------|---------------|-------------|-------------|
| **Contract Amount** | IMPORTE MN SIN IVA | Importe del contrato | Importe DRC |
| **Currency** | Implicit (MXN) | Moneda del contrato | Moneda |

### Dates

| Field | Structure A/B | Structure C | Structure D |
|-------|---------------|-------------|-------------|
| **Signature Date** | FECHA DE SUSCRIPCIÓN DE CONTRATO | Fecha de firma del contrato | Fecha de firma del contrato |
| **Start Date** | N/A | Fecha de inicio del contrato | Fecha de inicio del contrato |
| **End Date** | N/A | Fecha de fin del contrato | Fecha de fin del contrato |
| **Publication Date** | N/A | Fecha de publicación | Fecha de publicación |
| **Apertura Date** | N/A | Fecha de apertura | Fecha de apertura |
| **Fallo Date** | N/A | Fecha de fallo | Fecha de fallo |

### Vendor

| Field | Structure A/B | Structure C | Structure D |
|-------|---------------|-------------|-------------|
| **Vendor Name** | RAZÓN SOCIAL | Proveedor o contratista | Proveedor o contratista |
| **RFC** | N/A | RFC | rfc (lowercase) |
| **RUPC Folio** | N/A | Folio en el RUPC | Folio en el RUPC |
| **Vendor Size** | N/A | Estratificación de la empresa | Estratificación |

### Procedure Type

| Field | Structure A/B | Structure C | Structure D |
|-------|---------------|-------------|-------------|
| **Tipo Procedimiento** | TIPO DE PROCEDIMIENTO | Tipo de procedimiento | Tipo Procedimiento |
| **Tipo Contratación** | TIPO CONTRATACIÓN | Tipo de contratación | Tipo de contratación |
| **Character** | CARACTER | Carácter del procedimiento | Carácter del procedimiento |
| **Participation Form** | N/A | Forma de participación | Forma de participación |

### Product/Service Classification

| Field | Structure A/B | Structure C | Structure D |
|-------|---------------|-------------|-------------|
| **Partida** | N/A | N/A | **Partida específica** |
| **CUCOP Code** | N/A | Clave CUCOP | N/A |

---

## Data Quality Issues

### 1. Encoding Issues

**CSV files (Structure D)** require `latin-1` encoding:
```python
df = pd.read_csv(file, encoding='latin-1')
```

UTF-8 fails with: `'utf-8' codec can't decode byte 0xf3`

**XLSX files** load correctly with default encoding.

### 2. Case Inconsistency

| Structure | Vendor Name Case | Notes |
|-----------|------------------|-------|
| A | 100.0% UPPERCASE | Consistent |
| B | 99.1% UPPERCASE | Mostly consistent |
| C | 98.6% UPPERCASE | Mostly consistent |
| D (2023) | 2.2% UPPERCASE | **MIXED CASE (new standard)** |
| D (2024) | 2.3% UPPERCASE | **MIXED CASE (new standard)** |

**Implication**: Vendor name matching must be case-insensitive.

### 3. RFC Data Quality

| Structure | RFC Field | Non-Null Rate | Unique Count (in 10K sample) |
|-----------|-----------|---------------|------------------------------|
| A | N/A | 0% | N/A |
| B | N/A | 0% | N/A |
| C | RFC | 66.1% | 1,482 |
| D (2023) | rfc | 100%* | 2,359 |
| D (2024) | rfc | 100%* | 2,313 |

*Note: 100% non-null doesn't mean 100% valid. Some may be placeholders or "N/A" strings.

### 4. Date Format Inconsistencies

**Structure A/B**:
- Already parsed as datetime by pandas/Excel

**Structure C**:
- Mixed formats: Some with "GMT" suffix, some without
- Example: `2018-07-31 00:00:00 GMT`

**Structure D**:
- Two different formats in same file:
  - ISO format: `2023-11-15 15:22:51` (Fecha de publicación)
  - DD/MM/YYYY: `28/02/2023` (Fecha de inicio)

**Recommendation**: Parse with `errors='coerce'` and `dayfirst=True` for DD/MM/YYYY format.

### 5. Missing Data Patterns

**High null-rate fields across all structures:**
- Clave programa federal: 93-95% null
- Clave cartera SHCP: 99% null
- Crédito externo: 98-100% null
- Organismo financiero: 100% null

**Procedure-specific fields** (null for direct awards):
- Fecha de fallo: 68-80% null
- Fecha de apertura: 82% null (Structure D)
- Forma de participación: 82% null (Structure D)

### 6. Column Name Variations

**Amount field name changes:**
- A/B: `IMPORTE MN SIN IVA`
- C: `Importe del contrato`
- D: `Importe DRC`

**RFC field case change:**
- C: `RFC` (uppercase)
- D: `rfc` (lowercase)

**Procedure number variations:**
- A/B: `NÚMERO DE PROCEDIMIENTO`
- C: `Número del procedimiento`
- D: `Número de procedimiento`

---

## Recommendations for ETL Pipeline

### 1. Encoding Handling
```python
def load_file(file_path):
    if file_path.endswith('.xlsx'):
        return pd.read_excel(file_path)
    else:  # CSV
        return pd.read_csv(file_path, encoding='latin-1', low_memory=False)
```

### 2. Amount Field Mapping
```python
def get_amount_column(df, year):
    if year <= 2017:
        return 'IMPORTE MN SIN IVA'
    elif year <= 2022:
        return 'Importe del contrato'
    else:
        return 'Importe DRC'
```

### 3. Vendor Name Normalization
```python
def normalize_vendor_name(name):
    # Convert to uppercase for consistency
    name = str(name).upper().strip()

    # Remove extra whitespace
    name = ' '.join(name.split())

    # Remove common suffixes for matching
    # (S.A. DE C.V., SA DE CV, etc.)

    return name
```

### 4. RFC Field Mapping
```python
def get_rfc(row, year):
    if year <= 2017:
        return None
    elif year <= 2022:
        return row.get('RFC')
    else:
        return row.get('rfc')
```

### 5. Date Parsing
```python
def parse_date(date_str):
    if pd.isna(date_str):
        return None

    # Try multiple formats
    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']:
        try:
            return pd.to_datetime(date_str, format=fmt, errors='coerce')
        except:
            continue

    # Fallback to automatic parsing
    return pd.to_datetime(date_str, errors='coerce', dayfirst=True)
```

### 6. Ramo Code Extraction
```python
def get_ramo_code(row, year):
    if year >= 2023:
        return row.get('Clave Ramo')
    else:
        # Must be derived from institution name/code
        # or left as NULL
        return None
```

### 7. Partida Extraction
```python
def get_partida(row, year):
    if year >= 2023:
        return row.get('Partida específica')
    elif year >= 2018:
        return row.get('Clave CUCOP')  # Different classification
    else:
        return None
```

---

## Data Validation Checklist

Before processing each file:

- [ ] Check encoding (latin-1 for CSV, default for XLSX)
- [ ] Identify structure based on column count (13/45/73)
- [ ] Map amount column correctly
- [ ] Apply amount validation thresholds
- [ ] Normalize vendor names to UPPERCASE
- [ ] Parse dates with appropriate format
- [ ] Extract RFC if available (check field name case)
- [ ] Handle null values in optional fields
- [ ] Verify currency field (should be MXN/pesos)
- [ ] Log any records exceeding 10B MXN threshold

---

## Structure-Specific Warnings

### Structure A/B (2002-2017)
- NO RFC data available
- NO partida/CUCOP classification
- NO procedure timeline dates (apertura, fallo)
- NO ramo codes (must derive from institution)
- Risk scores will be lower due to missing factors

### Structure C (2018-2022)
- RFC only 66% populated
- CUCOP classification (not same as Partida Específica)
- Still no ramo codes
- Many procedural fields have high null rates

### Structure D (2023-2025)
- BEST data quality
- 100% Partida Específica coverage
- 100% Ramo code coverage
- RFC field is lowercase "rfc"
- CSV encoding is latin-1 (NOT UTF-8)
- Mixed date formats within same file
- Many modification-related fields (72% null if no modifications)

---

## Next Steps

1. **Full Dataset Profiling**: Run amount validation on ALL records (not just samples)
2. **Vendor Deduplication**: Analyze vendor name variations and create normalized mapping
3. **Ramo Derivation**: For pre-2023 data, map institutions to ramo codes
4. **RFC Validation**: Check RFC format compliance (should match Mexican tax ID pattern)
5. **Outlier Investigation**: Investigate any contracts > 10B MXN
6. **Temporal Consistency**: Check for date anomalies (end before start, etc.)

---

**Report Generated**: 2026-01-06
**Data Quality Guardian**: Yang Wen-li Agent
**Sample Size**: 10,000 rows per structure
