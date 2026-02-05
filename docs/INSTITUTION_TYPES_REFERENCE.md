# Institution Classification Taxonomy v2.0

> Reference documentation for the Yang Wen-li institution classification system.

**Version:** 2.0.0
**Last Updated:** January 16, 2026
**Total Institutions:** 4,456

---

## Overview

The Yang Wen-li platform classifies Mexican government institutions using a 19-type taxonomy aligned with Mexican administrative law and international anti-corruption standards. This classification enables:

- **Risk-adjusted scoring**: Institution type contributes to contract risk assessment
- **Comparative analysis**: Fair comparison between similar institutions
- **Trend identification**: Sector-specific procurement pattern detection

---

## Institution Types (19)

| ID | Code | Spanish Name | English Name | Risk Baseline |
|----|------|--------------|--------------|---------------|
| 1 | `federal_secretariat` | Secretaría Federal | Federal Secretariat | 0.15 |
| 2 | `federal_agency` | Organismo Federal | Federal Agency | 0.20 |
| 3 | `regulatory_agency` | Agencia Reguladora | Regulatory Agency | 0.15 |
| 4 | `state_enterprise_energy` | Empresa Estatal - Energía | State Enterprise (Energy) | 0.28 |
| 5 | `state_enterprise_infra` | Empresa Estatal - Infraestructura | State Enterprise (Infrastructure) | 0.25 |
| 6 | `state_enterprise_finance` | Empresa Estatal - Finanzas | State Enterprise (Finance) | 0.22 |
| 7 | `social_security` | Seguridad Social | Social Security | 0.25 |
| 8 | `health_institution` | Institución de Salud | Health Institution | 0.25 |
| 9 | `social_program` | Programa Social | Social Program | 0.30 |
| 10 | `autonomous_constitutional` | Organismo Constitucional Autónomo | Autonomous Constitutional Body | 0.10 |
| 11 | `judicial` | Poder Judicial | Judicial Branch | 0.10 |
| 12 | `legislative` | Poder Legislativo | Legislative Branch | 0.15 |
| 13 | `municipal` | Municipio | Municipality | 0.35 |
| 14 | `state_government` | Gobierno Estatal | State Government | 0.30 |
| 15 | `state_agency` | Organismo Estatal | State Agency | 0.30 |
| 16 | `military` | Fuerzas Armadas | Military | 0.15 |
| 17 | `research_education` | Investigación/Educación Superior | Research/Higher Education | 0.18 |
| 18 | `educational` | Institución Educativa | Educational Institution | 0.20 |
| 19 | `other` | Otros | Other | 0.25 |

### Risk Baseline Rationale

Risk baselines are derived from:
- **OECD procurement integrity studies** for Mexico
- **IMF Corruption Risk Index** methodology
- **ASF (Auditoría Superior de la Federación)** audit findings
- **IMCO (Instituto Mexicano para la Competitividad)** research

Lower baselines (0.10-0.15) indicate stronger oversight and transparency mechanisms.
Higher baselines (0.30-0.35) indicate weaker controls and historically higher audit finding rates.

---

## Size Tiers (5)

Institutions are classified by procurement volume:

| ID | Code | Spanish Name | Contract Range | Risk Adjustment |
|----|------|--------------|----------------|-----------------|
| 1 | `mega` | Mega | 100,000+ | +0.05 |
| 2 | `large` | Grande | 10,000 - 99,999 | +0.02 |
| 3 | `medium` | Mediano | 1,000 - 9,999 | 0.00 |
| 4 | `small` | Pequeño | 100 - 999 | -0.02 |
| 5 | `micro` | Micro | < 100 | -0.05 |

### Current Distribution

| Size Tier | Count | % of Total |
|-----------|-------|------------|
| Mega | 3 | 0.07% |
| Large | 38 | 0.85% |
| Medium | 190 | 4.26% |
| Small | 687 | 15.42% |
| Micro | 3,538 | 79.39% |

---

## Autonomy Levels (5)

Governance structure affects procurement independence:

| ID | Code | Spanish Name | Description | Risk Baseline |
|----|------|--------------|-------------|---------------|
| 1 | `full_autonomy` | Autonomía Plena | Constitutional autonomous bodies, supreme court | 0.10 |
| 2 | `technical_autonomy` | Autonomía Técnica | Regulatory agencies, central bank | 0.15 |
| 3 | `operational_autonomy` | Autonomía Operativa | Research institutions, universities | 0.20 |
| 4 | `dependent` | Dependiente | Federal secretariats, subordinate agencies | 0.25 |
| 5 | `subnational` | Subnacional | State and municipal governments | 0.30 |

### Mapping from Institution Type

| Institution Type | Default Autonomy Level |
|------------------|------------------------|
| `autonomous_constitutional` | `full_autonomy` |
| `judicial` | `full_autonomy` |
| `regulatory_agency` | `technical_autonomy` |
| `research_education` | `operational_autonomy` |
| `federal_secretariat` | `dependent` |
| `federal_agency` | `dependent` |
| `state_enterprise_*` | `dependent` |
| `social_security` | `dependent` |
| `health_institution` | `dependent` |
| `legislative` | `dependent` |
| `military` | `dependent` |
| `educational` | `dependent` |
| `social_program` | `dependent` |
| `other` | `dependent` |
| `municipal` | `subnational` |
| `state_government` | `subnational` |
| `state_agency` | `subnational` |

---

## Current Classification Statistics

### By Institution Type

| Type | Count | % |
|------|-------|---|
| municipal | 1,928 | 43.3% |
| state_agency | 1,078 | 24.2% |
| educational | 517 | 11.6% |
| other | 250 | 5.6% |
| federal_secretariat | 125 | 2.8% |
| health_institution | 99 | 2.2% |
| federal_agency | 83 | 1.9% |
| state_enterprise_infra | 77 | 1.7% |
| social_program | 72 | 1.6% |
| judicial | 55 | 1.2% |
| state_government | 52 | 1.2% |
| research_education | 42 | 0.9% |
| state_enterprise_energy | 27 | 0.6% |
| state_enterprise_finance | 19 | 0.4% |
| autonomous_constitutional | 16 | 0.4% |
| social_security | 10 | 0.2% |
| regulatory_agency | 3 | 0.1% |
| legislative | 2 | 0.04% |
| military | 1 | 0.02% |

*Last updated: January 19, 2026*

### By Size Tier

| Tier | Count | Total Contracts | Avg Risk Score |
|------|-------|-----------------|----------------|
| mega | 3 | 450,000+ | 0.32 |
| large | 38 | 1,200,000+ | 0.28 |
| medium | 190 | 800,000+ | 0.25 |
| small | 687 | 350,000+ | 0.22 |
| micro | 3,538 | 310,000+ | 0.19 |

---

## Risk Integration

Institution risk baseline is integrated into the 12-factor risk scoring model as Factor 11:

### Weight

- **Factor 11 (Institution Risk Baseline)**: 3% of total risk score

### Calculation

```python
# Only adds risk if institution baseline > 0.25 (average)
if institution_baseline > 0.25:
    contribution = (baseline - 0.25) / 0.10 * 0.03
    risk_score += min(contribution, 0.03)
```

### Impact

- Institutions with baseline = 0.10 (judicial, autonomous): No additional risk
- Institutions with baseline = 0.25 (average): No additional risk
- Institutions with baseline = 0.30 (social_program, state): +1.5% risk
- Institutions with baseline = 0.35 (municipal): +3.0% risk

---

## API Endpoints

### List Institutions

```
GET /api/v1/institutions
```

Query parameters:
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 50, max: 200)
- `institution_type` (str): Filter by type code
- `size_tier` (str): Filter by size tier
- `autonomy_level` (str): Filter by autonomy level
- `sector_id` (int): Filter by sector
- `state_code` (str): Filter by Mexican state
- `search` (str): Search institution name (min 3 chars)
- `min_contracts` (int): Minimum contract count
- `is_legally_decentralized` (bool): Filter by legal status

### Get Institution Detail

```
GET /api/v1/institutions/{id}
```

Returns full institution details including risk profile data.

### Get Institution Risk Profile

```
GET /api/v1/institutions/{id}/risk-profile
```

Returns detailed risk breakdown with:
- Risk baseline by type
- Size tier adjustment
- Autonomy baseline
- Effective combined risk
- Contract distribution by risk level

### List Institution Types

```
GET /api/v1/institutions/types
```

Returns all 19 institution types with risk baselines.

### List Size Tiers

```
GET /api/v1/institutions/size-tiers
```

Returns all 5 size tier definitions.

### List Autonomy Levels

```
GET /api/v1/institutions/autonomy-levels
```

Returns all 5 autonomy level definitions.

---

## Data Quality Notes

### Known Issues

1. **9 vendor-like records**: Some records appear to be vendors, not institutions
   - Pattern: Names containing "S.A. DE C.V." or "S.A.P.I."
   - Action: Flagged with `DATA_QUALITY_FLAG_VENDOR` in notes field
   - These are excluded from institution analytics

2. **"Other" category (250 records)**: Institutions that couldn't be automatically classified
   - Many are legitimate edge cases (international organizations, temporary bodies)
   - Manual review recommended for high-contract institutions

### Verification

Classification confidence is stored in `classification_confidence` field:
- 1.0: Manual verification or exact pattern match
- 0.85-0.95: High-confidence pattern match
- 0.60-0.85: Moderate confidence (single-word names assumed municipal)
- < 0.60: Low confidence, needs review

---

## Migration from v1.0

### Changes from v1.0

| v1.0 Type | v2.0 Type(s) | Notes |
|-----------|--------------|-------|
| `decentralized` | Split into functional types | Based on sector and function |
| (new) | `state_enterprise_energy` | PEMEX, CFE |
| (new) | `state_enterprise_infra` | Infrastructure SOEs |
| (new) | `state_enterprise_finance` | Financial SOEs |
| (new) | `health_institution` | Hospitals, health institutes |
| (new) | `social_program` | DIF, welfare programs |
| (new) | `research_education` | CONACYT, research centers |

### Migration Statistics

- **Before (v1.0)**: 13 types, 245 "decentralized"
- **After (v2.0)**: 19 types, 0 "decentralized"
- **Migration date**: January 16, 2026

---

## References

1. **Mexican Administrative Law**: Ley Orgánica de la Administración Pública Federal
2. **OECD**: Public Procurement in Mexico (2018)
3. **IMF**: Corruption Risk Index Methodology
4. **ASF**: Auditoría Superior de la Federación Annual Reports
5. **IMCO**: Instituto Mexicano para la Competitividad Studies

---

*This taxonomy is maintained as part of the Yang Wen-li procurement analysis platform.*
