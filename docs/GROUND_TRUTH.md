# Ground Truth: Documented Corruption Cases

**Last Updated:** February 9, 2026 | **Cases:** 9 | **Matched Vendors:** 17 | **Contracts:** 21,252

---

## Purpose

The ground truth dataset provides labeled examples of contracts associated with documented corruption cases. These labels serve as the positive class for training and validating the v4.0 risk model through Positive-Unlabeled (PU) learning.

**Important:** Ground truth labels indicate contracts from **vendors involved in documented cases**, not that every individual contract was corrupt. A vendor convicted of fraud may also have legitimate contracts in the database.

---

## Case Registry

### Case 1: COVID-19 Emergency Procurement Irregularities (2020-2021)

| Property | Value |
|----------|-------|
| **Case ID** | COVID_PROCUREMENT_2020_2021 |
| **Type** | Embezzlement |
| **Estimated Fraud** | 3.5B MXN |
| **Confidence** | Medium |
| **Sectors** | Salud |
| **Sources** | ASF Cuenta Publica 2020, IMCO, Transparencia Mexicana |

Emergency procurement during COVID-19 pandemic saw widespread irregularities: overpricing of medical supplies, direct awards without justification, contracts to newly created companies, and delivery failures. ASF identified over 500 observations across the health sector.

**Matched Vendors (5):**

| Vendor | Vendor ID | Contracts | Match Confidence |
|--------|-----------|-----------|-----------------|
| LOMEDIC SA DE CV | 26793 | ~289 | 0.95 |
| FARMACEUTICOS MAYPO SA DE CV | 42890 | ~141 | 0.95 |
| DISTRIBUIDORA INTERNACIONAL DE MEDICAMENTOS (DIMM) | 13885 | 4,333 | 0.95 |
| IMPORTADORA Y MANUFACTURERA BRULUART SA DE CV | 5196 | ~590 | 0.96 |
| EQUIPOS MEDICOS VIZCARRA SA DE CV | 14057 | — | 0.95 |

**Unmatched Vendors (3):** CYBER ROBOTICS SOLUTIONS, GRUPO FERSEO, COMERCIALIZADORA LEMANS

---

### Case 2: La Estafa Maestra (2013-2018)

| Property | Value |
|----------|-------|
| **Case ID** | ESTAFA_MAESTRA_2013_2018 |
| **Type** | Ghost companies |
| **Estimated Fraud** | 7.67B MXN |
| **Confidence** | High |
| **Sectors** | Multiple |
| **Sources** | ASF Cuenta Publica 2015-2017, Animal Politico |

Largest documented public procurement fraud scheme in Mexican history. Federal agencies contracted with public universities, which then subcontracted to shell companies that provided no services.

**Matched Vendors (2):**

| Vendor | Vendor ID | Contracts | Match Confidence |
|--------|-----------|-----------|-----------------|
| GRUPO CONSTRUCTOR ROGU SA DE CV | 4249 | ~5 | 0.85 |
| GRUPO CONSTRUCTOR CINCO SA DE CV | 16951 | ~5 | 0.98 |

**Unmatched Vendors (8):** Most Estafa Maestra shell companies don't appear in COMPRANET because they were subcontractors of universities, not direct government contractors.

---

### Case 3: IMSS Ghost Company Network (2012-2018)

| Property | Value |
|----------|-------|
| **Case ID** | IMSS_GHOST_COMPANIES_2012_2018 |
| **Type** | Ghost companies |
| **Estimated Fraud** | 2.8B MXN |
| **Confidence** | High |
| **Sectors** | Salud |
| **Sources** | ASF IMSS audits, Proceso, Animal Politico |

Network of shell companies that received contracts from IMSS for medical supplies, pharmaceuticals, and services. Many companies shared addresses, legal representatives, or were created shortly before receiving contracts.

**Matched Vendors (2):**

| Vendor | Vendor ID | Contracts | Match Confidence |
|--------|-----------|-----------|-----------------|
| DISTRIBUIDORA QUIRURGICA NACIONAL SA DE CV | 19852 | ~85 | 0.892 |
| LABORATORIOS PISA SA DE CV | 4335 | 9,281 | 0.99 |

**Note:** LABORATORIOS PISA is the dominant vendor in this case with 9,281 contracts — it significantly shapes the model's learned patterns.

---

### Case 4: Odebrecht-PEMEX Bribery Scheme (2010-2016)

| Property | Value |
|----------|-------|
| **Case ID** | ODEBRECHT_PEMEX_2010_2016 |
| **Type** | Bribery |
| **Estimated Fraud** | 2.1B MXN |
| **Confidence** | High |
| **Sectors** | Energia |
| **Sources** | DOJ Case 1:16-cr-00643, ASF PEMEX audits |

Brazilian construction conglomerate Odebrecht paid bribes to PEMEX officials in exchange for contracts. Part of broader Lava Jato investigation. DOJ documents confirm $10.5M USD in bribes to Mexican officials.

**Matched Vendors (2):**

| Vendor | Vendor ID | Contracts | Match Confidence |
|--------|-----------|-----------|-----------------|
| ALTOS HORNOS DE MEXICO SA DE CV | 209773 | ~2 | 0.98 |
| GRUPO TRADECO SA DE CV | 441 | ~33 | 0.95 |

---

### Case 5: Segalmex Food Distribution Fraud (2019-2023)

| Property | Value |
|----------|-------|
| **Case ID** | SEGALMEX |
| **Type** | Procurement fraud |
| **Estimated Fraud** | 15B MXN |
| **Confidence** | High |
| **Sectors** | Agricultura |
| **Sources** | ASF Cuenta Publica 2019-2021, FGR investigation |

Massive fraud in LICONSA milk distribution and DICONSA food distribution programs. Shell companies, overpriced procurement, ghost deliveries. Former director Ignacio Ovalle has active arrest warrant.

**Matched Vendors (3):**

| Vendor | Vendor ID | Contracts | Match Confidence |
|--------|-----------|-----------|-----------------|
| LICONSA SA DE CV | 10775 | 5,980 | 0.95 |
| DICONSA SA DE CV | 38534 | 106 | 0.95 |
| D'SAZON SEGURIDAD ALIMENTARIA SA DE CV | 229178 | 240 | 0.70 |

---

### Case 6: Grupo Higa / Casa Blanca (2010-2018)

| Property | Value |
|----------|-------|
| **Case ID** | GRUPO_HIGA |
| **Type** | Conflict of interest |
| **Estimated Fraud** | 8B MXN |
| **Confidence** | High |
| **Sectors** | Infraestructura |
| **Sources** | Aristegui Noticias, Animal Politico |

Constructora Teya (part of Grupo Higa) received government infrastructure and energy contracts while simultaneously building the presidential residence ("Casa Blanca").

**Matched Vendors (1):**

| Vendor | Vendor ID | Contracts | Match Confidence |
|--------|-----------|-----------|-----------------|
| CONSTRUCTORA TEYA SA DE CV | 42334 | 3 | 0.98 |

---

### Case 7: Oceanografia PEMEX Fraud (2008-2014)

| Property | Value |
|----------|-------|
| **Case ID** | OCEANOGRAFIA |
| **Type** | Procurement fraud / invoice fraud |
| **Estimated Fraud** | 8.5B MXN |
| **Confidence** | High |
| **Sectors** | Energia |
| **Sources** | Reuters, Bloomberg, WSJ, Citibank fraud claim |

Oceanografia inflated invoices to PEMEX for maritime services and used fraudulent accounts receivable documents to obtain financing from Citibank subsidiary Banamex.

**Matched Vendors (1):**

| Vendor | Vendor ID | Contracts | Match Confidence |
|--------|-----------|-----------|-----------------|
| OCEANOGRAFIA SA | 8362 | 2 | 0.98 |

---

### Case 8: Cyber Robotic IT Overpricing (2015-2024)

| Property | Value |
|----------|-------|
| **Case ID** | CYBER_ROBOTIC |
| **Type** | Overpricing |
| **Estimated Fraud** | 2B MXN |
| **Confidence** | Medium |
| **Sectors** | Tecnologia |
| **Sources** | ASF technology audits, Proceso, Animal Politico |

Cyber Robotic Solutions and related companies awarded overpriced IT contracts across multiple government agencies. Pattern of sole-source technology procurement at inflated prices.

**Matched Vendors (1):**

| Vendor | Vendor ID | Contracts | Match Confidence |
|--------|-----------|-----------|-----------------|
| CYBER ROBOTIC SOLUTIONS SA DE CV | 124393 | 139 | 0.95 |

---

### Case 9: PEMEX Emilio Lozoya Corruption (2012-2018)

| Property | Value |
|----------|-------|
| **Case ID** | PEMEX_LOZOYA |
| **Type** | Bribery |
| **Estimated Fraud** | 10B MXN |
| **Confidence** | High |
| **Sectors** | Energia |
| **Sources** | FGR case vs Lozoya, DOJ Odebrecht filings |

Emilio Lozoya (PEMEX director 2012-2016) facilitated overpriced acquisitions (Agronitrogenados from AHMSA, Fertinal) and accepted Odebrecht bribes.

**Matched Vendors (0):** All relevant vendors (AHMSA, Grupo Tradeco) are already matched under Case 4 (Odebrecht). This case is documented for completeness but does not contribute additional training data.

---

## Training Data Summary

### Distribution by Case

| Case | Contracts | % of Training | Key Pattern |
|------|-----------|--------------|-------------|
| IMSS Ghost Companies | 9,366 | 44.1% | Concentrated health vendor (Pisa) |
| Segalmex | 6,326 | 29.8% | Concentrated agriculture vendor (LICONSA) |
| COVID-19 Procurement | 5,371 | 25.3% | Multiple health vendors |
| IT Overpricing | 139 | 0.7% | Technology overpricing |
| Odebrecht-PEMEX | 35 | 0.2% | Energy bribery |
| Estafa Maestra | 10 | <0.1% | Ghost company network |
| Grupo Higa | 3 | <0.1% | Infrastructure conflict |
| Oceanografia | 2 | <0.1% | Energy invoice fraud |
| **Total** | **21,252** | **100%** | |

### Known Biases

1. **Concentration bias:** Three cases (IMSS, Segalmex, COVID) account for 99.1% of training contracts. The model's learned coefficients reflect these cases' characteristics.
2. **Sector bias:** Health (salud) and agriculture dominate. Infrastructure, technology, and defense are underrepresented.
3. **Vendor size bias:** The largest known-bad vendors (Pisa: 9,281, LICONSA: 5,980, DIMM: 4,333) are all large concentrated entities. The model may underperform on small vendor corruption.
4. **Pattern bias:** The training data primarily reflects vendor concentration and overpricing patterns. Collusion, bid-rigging, and conflict-of-interest patterns are underrepresented.

### Improving the Ground Truth

To reduce bias, prioritize adding cases that involve:
- **Infrastructure sector** corruption (construction cartel cases)
- **Defense sector** procurement irregularities
- **Small vendor** shell company networks
- **Bid-rigging** and collusion patterns (where co-bidding signals would be relevant)
- **Technology** overpricing beyond Cyber Robotic

---

## Database Schema

### ground_truth_cases

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| case_id | VARCHAR | Unique case identifier |
| case_name | VARCHAR | Human-readable name |
| case_type | VARCHAR | embezzlement, ghost_company, bribery, etc. |
| year_start | INTEGER | First year of corrupt activity |
| year_end | INTEGER | Last year of corrupt activity |
| estimated_fraud_mxn | REAL | Estimated fraud amount in MXN |
| source_asf | TEXT | ASF audit references |
| source_news | TEXT | News/journalism sources |
| source_legal | TEXT | Legal case references |
| confidence_level | VARCHAR | low, medium, high |
| notes | TEXT | Detailed case description |

### ground_truth_vendors

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| case_id | INTEGER FK | Links to ground_truth_cases.id |
| vendor_id | INTEGER FK | Links to vendors.id (NULL if unmatched) |
| vendor_name_source | VARCHAR | Name from source documents |
| rfc_source | VARCHAR | RFC from source documents |
| role | VARCHAR | primary, secondary, facilitator |
| evidence_strength | VARCHAR | direct, circumstantial, alleged |
| match_method | VARCHAR | name_exact, name_fuzzy, rfc, manual |
| match_confidence | REAL | 0-1 confidence in vendor match |

### ground_truth_contracts

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| case_id | INTEGER FK | Links to ground_truth_cases.id |
| contract_id | INTEGER FK | Links to contracts.id |
| evidence_strength | VARCHAR | How strongly this contract is linked |
| match_method | VARCHAR | vendor_match, procedure_match, manual |
| match_confidence | REAL | 0-1 confidence |

---

*Ground truth is sourced from ASF audits, DOJ filings, investigative journalism (Animal Politico, Aristegui Noticias), and FGR investigations. All cases are publicly documented. Inclusion does not imply that every associated contract was corrupt — it indicates the vendor was involved in a documented corruption case.*
