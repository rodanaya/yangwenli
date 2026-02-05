# Pattern Fix Guide for verified_vendor_data.py

**Generated:** 2026-01-14
**Total Patterns:** 5,000
**Problematic Patterns:** 322 (match individuals incorrectly)
**Good Patterns:** 1,844 (companies only)

---

## Summary

The `backend/scripts/verified_vendor_data.py` file contains SQL LIKE patterns that are too broad. This guide identifies the patterns that need manual fixing.

---

## Critical Patterns to Fix (Match 100+ Individuals)

| Pattern | Intended | Individuals | Companies | Fix Suggestion |
|---------|----------|-------------|-----------|----------------|
| `%ADO%` | Autobuses de Oriente | 7,956 | 13,331 | `%AUTOBUSES DE ORIENTE%` |
| `%EY%` | Ernst & Young | 5,186 | 1,126 | `%ERNST%YOUNG%` or `%E&Y%` |
| `%CISCO%` | Cisco Systems | 3,576 | 77 | `%CISCO SYSTEMS%` |
| `%AUDI%` | Volkswagen AG | 1,449 | 294 | `%AUDI MEXICO%` or `%AUDI,%` |
| `%ELIS%` | Elis SA | 655 | 57 | `%ELIS S%A%` |
| `%LEGO%` | Lego Group | 478 | 32 | `%LEGO MEXICO%` or `% LEGO %` |
| `%CIEL%` | Coca-Cola FEMSA | 379 | 32 | `%CIEL S%A%` or remove |
| `%ZEP%` | Zep Inc | 293 | 18 | REMOVE (matches ZEPEDA surname) |
| `%AGA%S%A%` | Linde plc | 202 | 480 | Review - partial fix needed |
| `%DE%LA%ROSA%` | De La Rosa | 190 | 127 | `%DULCES DE LA ROSA%` |
| `%CORONADO%` | Mondelez | 168 | 6 | REMOVE (common surname) |
| `%OSEL%` | Pinturas Osel | 126 | 19 | `%PINTURAS OSEL%` |
| `%DELL%` | Dell Technologies | 105 | 22 | `%DELL MEXICO%` or `%DELL,%` |
| `%MOCTEZUMA%` | Corp. Moctezuma | 103 | 18 | `%CEMENTOS MOCTEZUMA%` |

---

## High-Risk Patterns (Match 25-100 Individuals)

| Pattern | Intended | Individuals | Companies |
|---------|----------|-------------|-----------|
| `%INMOBILIA%` | Inmobilia | 92 | 1,474 |
| `%INMOBILIARIA%` | Various | 84 | 1,148 |
| `%CATL%` | Contemporary Amperex | 83 | 25 |
| `%ASUR%` | ASUR | 80 | 36 |
| `%LA%CORONA%` | Mondelez | 61 | 6 |
| `%POSADAS%` | Grupo Posadas | 56 | 9 |
| `%IAMS%` | Mars | 52 | 18 |
| `%INFRA%` | Infra SA | 52 | 1,046 |
| `%QUILL%` | Staples | 45 | 6 |
| `%IFF%` | International Flavors | 36 | 16 |
| `%SAP%` | SAP SE | 34 | 152 |
| `%HERMA%` | HERMA | 31 | 179 |
| `%GAYOSSO%` | Grupo Gayosso | 30 | 1 |
| `%ISCAR%` | IMC Group | 29 | 8 |
| `%INTEL%` | Intel Corporation | 27 | 475 |
| `%MABE%` | Mabe | 27 | 19 |
| `%ISS %` | ISS A/S | 27 | 21 |
| `%CRISA%` | Vitro | 27 | 10 |
| `%BARCEL%` | Grupo Bimbo | 26 | 6 |
| `%ROCHE%` | F. Hoffmann-La Roche | 25 | 22 |
| `%LTH%` | Clarios | 25 | 152 |
| `%LEONI%` | Leoni AG | 25 | 1 |

---

## Recommended Fixes by Category

### 1. Short Patterns (2-4 characters) - DELETE or EXPAND

These patterns are too short and match Spanish words or surnames:

```python
# DELETE these patterns entirely:
'%ADO%'      # matches -ADO verb endings
'%EY%'       # matches REYES, LEYES
'%ZEP%'      # matches ZEPEDA
'%IFF%'      # too short

# EXPAND these patterns:
'%SAP%'      -> '%SAP SE%' or '%SAP MEXICO%'
'%ISS %'     -> '%ISS A/S%' or '%ISS MEXICO%'
'%LTH%'      -> '%BATERIAS LTH%'
```

### 2. Common Surname Patterns - DELETE

```python
# DELETE - common Mexican surnames:
'%CORONADO%'     # surname
'%MOCTEZUMA%'    # surname + Aztec emperor
'%POSADAS%'      # surname
'%GAYOSSO%'      # surname
'%BARCEL%'       # matches BARCELATA, etc.
'%ROCHE%'        # matches LAROCHE, etc.
'%LEONI%'        # matches LEONIDES, etc.
```

### 3. Generic Business Terms - NARROW

```python
# NARROW these patterns:
'%INMOBILIA%'    -> Remove or use specific company name
'%INMOBILIARIA%' -> Remove or use specific company name
'%INFRA%'        -> '%INFRA S.A. DE C.V.%' (exact company)
```

### 4. Add Legal Suffix to Narrow

```python
# ADD legal suffix (S.A., S.A. DE C.V., etc.):
'%CISCO%'        -> '%CISCO SYSTEMS%' or '%CISCO,%S.A.%'
'%DELL%'         -> '%DELL MEXICO%' or '%DELL,%S.A.%'
'%INTEL%'        -> '%INTEL CORPORATION%' or '%INTEL,%S.A.%'
'%AUDI%'         -> '%AUDI MEXICO%' or '%AUDI,%S.A.%'
```

---

## How to Edit verified_vendor_data.py

### Location
```
backend/scripts/verified_vendor_data.py
```

### Structure
Each pattern looks like:
```python
{
    'vendor_pattern': '%CISCO%',           # <- FIX THIS
    'industry_id': 61,
    'industry_code': 'tecnologia',
    'corporate_group': 'Cisco Systems',
    'country': 'US',
    'source': 'Company website',
    'verified_date': '2026-01-09',
    'notes': 'Network equipment'
},
```

### Fix Example
Change:
```python
'vendor_pattern': '%CISCO%',
```
To:
```python
'vendor_pattern': '%CISCO SYSTEMS%',
```

---

## Validation After Fixes

After editing the patterns, run:

```bash
# Clear and re-apply corporate groups
python backend/scripts/fix_corporate_groups.py

# Rerun clustering
python backend/scripts/cluster_vendors_enhanced.py

# Check results
python -c "
import sqlite3
conn = sqlite3.connect('backend/RUBLI_NORMALIZED.db')
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM vendors WHERE corporate_group IS NOT NULL AND is_individual = 1')
errors = cursor.fetchone()[0]
print(f'Individuals with corporate_group (should be 0): {errors}')
"
```

---

## Priority Order for Fixing

1. **Critical (7,000+ matches):** `%ADO%`, `%EY%`
2. **High (1,000+ matches):** `%CISCO%`, `%AUDI%`, `%ELIS%`
3. **Medium (100+ matches):** `%LEGO%`, `%CIEL%`, `%ZEP%`, etc.
4. **Low (25-100 matches):** Review and fix as time permits

---

## Patterns That Work Well (Reference)

These patterns are correctly specific and can serve as examples:

```python
'%LABORATORIOS PISA%'      # Specific company name
'%EMPRESAS ICA%'           # Specific company name
'%GRUPO CARSO%'            # Specific group name
'%PEMEX%'                  # Well-known acronym
'%CFE%'                    # Well-known acronym
'%BIMBO%'                  # Distinctive brand name
```

The key is to use patterns that are **distinctive enough** to not match unrelated entities.
