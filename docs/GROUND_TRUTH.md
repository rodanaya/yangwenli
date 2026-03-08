# Ground Truth: Documented Corruption Cases

**Last Updated:** March 8, 2026 | **Cases:** 33 | **Matched Vendors:** 115 | **Active training cases:** 22 (Cases 1–22, excl. 16–19) | **Cases 26–33 added by ARIA pipeline + web research**

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

---

## Cases 23–25 (Added March 7, 2026)

### Case 23: BAHUD PROCESSING MEXICO — Banco del Bienestar Direct Award (2021)
| Property | Value |
|----------|-------|
| **Case ID** | BAHUD_BANCO_BIENESTAR_2021 |
| **Type** | Procurement fraud |
| **Amount** | 15,787M MXN (1 contract, direct award) |
| **RFC** | BPM1809043P8 (incorporated 2018, 3 yrs before contract) |
| **Confidence** | Medium |
| **Sector** | Hacienda |

Single 15.79B MXN direct-award contract from Banco del Bienestar to a company incorporated only 3 years prior. Matches ghost company fingerprint pattern (≤5 contracts, >50M MXN, all direct award).

---

### Case 24: CONSTRUCTORA GARZA PONCE — Nuevo León Infrastructure Capture (2006–2024)
| Property | Value |
|----------|-------|
| **Case ID** | GARZA_PONCE_NL_INFRA |
| **Type** | Institution capture |
| **Amount** | 13,825M MXN (22 contracts) |
| **Confidence** | Low |
| **Sector** | Infraestructura |

22 contracts at 100% risk score, 82.2% concentrated at NL-Secretaría de Infraestructura. Regional institution capture pattern spanning 18 years. Added at low confidence — concentration may reflect legitimate specialization rather than corruption.

---

### Case 25: BIRMEX VACCINE INTERMEDIARY — Suministrador de Vacunas (2018–2022)
| Property | Value |
|----------|-------|
| **Case ID** | BIRMEX_SUMINISTRADOR_VACUNAS_2018_2022 |
| **Type** | Overpricing / intermediary extraction |
| **Amount** | 5,910M MXN (11 direct-award contracts) |
| **RFC** | NULL (no RFC registered) |
| **Confidence** | Medium |
| **Sector** | Salud (BIRMEX) |

No-RFC intermediary inserted into BIRMEX vaccine supply chain. Received 22.8% of all BIRMEX spending 2018–2022. Sanofi supplied identical hexavalente vaccines simultaneously via direct contracts — consistent with intermediary resale at markup. First two contracts labeled "Asociación Público Privada" (unprecedented for vaccine procurement). Disappeared after 2022 AMLO procurement reform. Estimated markup: 295M–1.18B MXN (5–20% of 5.91B). No public investigation found as of Mar 2026. Two Lithuanian-registered companies (UAB JORINIS, ENTAFARMA UAB) also appeared at BIRMEX in 2021 — under investigation for related pattern.

**Matched Vendors (4 — multi-channel scheme):**

| Vendor | Vendor ID | Value | Role | Confidence |
|--------|-----------|-------|------|------------|
| SUMINISTRADOR DE VACUNAS, S.A. DE C.V. | 233284 | 5,910M MXN | Primary (2018–2022) | 1.0 |
| UAB JORINIS | 266933 | 1,986M MXN | Secondary (Jan–Feb 2021) | 0.85 |
| ENTAFARMA UAB | 267422 | 161M MXN | Secondary (Jan 2021) | 0.85 |
| KLASNIC SA DE CV (RFC: KLA080605QCA) | 266932 | 774M MXN | Secondary (Jan 2021) | 0.75 |

**Total scheme: ~8.8B MXN.** UAB JORINIS and ENTAFARMA UAB are Lithuanian-registered (UAB = uždaroji akcinė bendrovė) companies with no RFC that appeared in a single 2.78B MXN procedure (AA-012NEF001-E2-2021, Jan 22, 2021) at BIRMEX and disappeared immediately. KLASNIC is a domestic counterpart activated for the same transaction. All participated in procedure AA-012NEF001-E2-2021 simultaneously.

**Model blind spot documented:** UAB JORINIS scores only 7% risk despite Mahalanobis distance of 706 (p=4.6×10⁻¹⁴⁰) — one of the most statistically extreme contracts in the database. The logistic regression fails because vendor_concentration is near zero (single-use intermediary vs. large concentrated vendors in training data). The Mahalanobis distance correctly flags these contracts even when the risk score does not.

---

## Cases 26–27 (Added March 8, 2026 — ARIA Pipeline Discovery)

> These cases were discovered automatically by the ARIA investigation pipeline on 2026-03-08. Both are confirmed by formal SFP sanctions, making them the first cases added through automated detection rather than manual research.

### Case 26: MULTICORPORACION BREXOT — COVID ISSSTE Medical Equipment Fraud (2020)
| Property | Value |
|----------|-------|
| **Case ID** | MULTICORPORACION_BREXOT_COVID_ISSSTE_2020 |
| **Type** | Procurement fraud |
| **Amount** | 605M MXN (11 contracts, all direct award) |
| **RFC** | MBR1701305L9 |
| **Confidence** | High |
| **Sector** | Salud (ISSSTE) |

Company active for exactly 1 year (2020). Received 11 direct-award contracts from ISSSTE exclusively for COVID-era medical equipment: a 575M MXN contract for "EQUIPO MÉDICO," robot sanitization services (C-44 robots), and medical materials. All contracts in 2020, 100% direct award, 100% concentrated at ISSSTE. SFP imposed formal sanction: **SANCIONATORIA CON MULTA E INHABILITACIÓN** under RFC MBR1701305L9. Risk score 1.00, Mahalanobis norm 1.000, burst score 0.750 (sudden activity then disappears).

**Matched Vendors (1):**

| Vendor | Vendor ID | Contracts | Match Confidence |
|--------|-----------|-----------|-----------------|
| MULTICORPORACION BREXOT SA DE CV | 261748 | 11 | 0.99 |

**ARIA detection:** IPS=0.739, Pattern=P6 (Institution Capture), SFP external flag triggered.

---

### Case 27: GRUPO LABORATORIOS IMPERIALES PHARMA — Vaccine Intermediary SSA/IMSS (2018)
| Property | Value |
|----------|-------|
| **Case ID** | LABORATORIOS_IMPERIALES_PHARMA_VACCINE_2018 |
| **Type** | Overpricing / intermediary extraction |
| **Amount** | 1,265M MXN (24 contracts, 92% direct award) |
| **RFC** | GLI1705153K1 (incorporated 2017-05-15) |
| **Confidence** | High |
| **Sector** | Salud (SSA + IMSS) |

Company incorporated May 2017, received 24 contracts in 2018 for **national vaccine scheme supplies** (BCG, Triple Viral/MMR, Hepatitis B) from Secretaría de Salud and IMSS, then disappeared. 92% direct award. SFP imposed formal sanction: **SANCIONATORIA CON MULTA E INHABILITACIÓN** under RFC GLI1705153K1. Burst score 0.850 (single year burst, no activity before or after).

**Notable:** Operates in the same sector (salud, vaccines), same year (2018), and same institutional clients (SSA, IMSS) as Case 25 (BIRMEX Suministrador de Vacunas). Possible coordinated multi-channel vaccine intermediary network. Whereas Case 25 targeted BIRMEX, this vendor targeted the SSA/IMSS direct procurement channel simultaneously.

**Matched Vendors (1):**

| Vendor | Vendor ID | Contracts | Match Confidence |
|--------|-----------|-----------|-----------------|
| GRUPO LABORATORIOS IMPERIALES PHARMA SA DE CV | 236035 | 24 | 0.99 |

**ARIA detection:** IPS=0.730, Pattern=P3 (Single-Use Intermediary), SFP external flag triggered.

---

---

### Case 28: Confecciones Isaac — IMSS/Penal Uniform Overpricing (2010–2025)
| Property | Value |
|----------|-------|
| **Case ID** | CONFECCIONES_ISAAC_UNIFORM_OVERPRICING |
| **Type** | Overpricing |
| **Amount** | 1,112M MXN (137 contracts) |
| **RFC** | None registered |
| **Confidence** | Medium |
| **Sector** | Salud (IMSS) + Gobernacion (OADPRS) |

Confecciones Isaac SA de CV inflated uniform and clothing prices 10–429% above market rates across 137 contracts with IMSS and the federal prison system (OADPRS/Prevención y Readaptación Social). FGR opened criminal investigation after ASF confirmed price overruns in Cuenta Pública audits. No RFC on record — characteristic of opaque supplier. Pattern spans 11 sectors 2010–2025.

**Matched Vendors (1):**

| Vendor | Vendor ID | Contracts | Avg Risk Score |
|--------|-----------|-----------|----------------|
| CONFECCIONES ISAAC,S.A. DE C.V. | 58023 | 137 | 0.359 |

---

### Case 29: Zapata Internacional SA CV — PEMEX Ghost Company (SAT EFOS Definitivo)
| Property | Value |
|----------|-------|
| **Case ID** | ZAPATA_INTERNACIONAL_PEMEX_GHOST_EFOS |
| **Type** | Ghost company (EFOS) |
| **Amount** | 1,711M MXN (3 contracts) |
| **RFC** | None registered |
| **Confidence** | High |
| **Sector** | Energía (PEMEX-EP) |

SAT confirmed EFOS Definitivo (Art. 69-B). Received 3 PEMEX Exploración y Producción contracts in 2006–2007 for oil well drilling. Wells were non-performing. **Critical model blind spot:** v5.1 scores 0.005 (near-zero) because single-use vendor with only 3 contracts produces zero concentration signal — same failure pattern as BIRMEX intermediaries (Case 25).

**Matched Vendors (1):**

| Vendor | Vendor ID | Contracts | Risk Score |
|--------|-----------|-----------|------------|
| ZAPATA INTERNACIONAL SA CV | 27506 | 3 | 0.005 |

---

### Case 30: BIRMEX Medicine Overpricing Ring (2020–2025)
| Property | Value |
|----------|-------|
| **Case ID** | BIRMEX_MEDICINE_OVERPRICING_2025 |
| **Type** | Overpricing + document falsification |
| **Amount** | 7B+ MXN overpricing (26B MXN total purchase annulled) |
| **Confidence** | High |
| **Sector** | Salud |

BIRMEX annulled a 26B MXN consolidated medicine purchase after discovering 13B MXN overpricing across 175 medication codes. Biomics Lab México inhabilitada definitivamente by SFP (April 2025) after falsifying COFEPRIS registration documents. 59+ companies submitted false documentation. Four BIRMEX officials removed. Farmacéuticos Maypo under active SFP investigation (6.24B MXN AMLO-era contracts).

**Matched Vendors (2):**

| Vendor | Vendor ID | Contracts | Risk Score | Status |
|--------|-----------|-----------|------------|--------|
| BIOMICS LAB MEXICO SA DE CV | 258535 | 182 | 0.689 | SFP inhabilitada definitiva |
| FARMACEUTICOS MAYPO S.A DE C.V | 2873 | 18,772 | 0.664 | Under SFP investigation |

---

### Case 31: IMSS Diabetes/Insulin Ring — 19 Shell Companies (2022–2024)
| Property | Value |
|----------|-------|
| **Case ID** | IMSS_DIABETES_OVERPRICING_RING_2022_2024 |
| **Type** | Overpricing via newly created shell companies |
| **Amount** | 1,666M MXN across 1,382 contracts |
| **Confidence** | High |
| **Sector** | Salud (IMSS delegaciones estatales) |

IMSS awarded 1,666M MXN to 19 newly-created companies for diabetes/insulin medications at 678–1,022% above consolidated prices. Poyago charged 2,300 MXN for sitagliptina/metformina vs. 225 MXN consolidated price (1,022% markup). Ring linked to Amílcar Olán (former IMSS Tabasco official). Direct award rate rose from 80% (2018) to 95% (2023). Congressional complaint filed, MCCI investigation published May 2025.

**Matched Vendors (3):**

| Vendor | Vendor ID | Amount | RFC | Markup |
|--------|-----------|--------|-----|--------|
| POYAGO SA DE CV | 300207 | 373M | POY121128FY4 | 1,022% |
| GRUPO OSHERX SA DE CV | 281352 | 242M | GOS2202175F2 | 827% |
| PHARMA TRIMED SA DE CV | 286381 | 7M | PTR210715AA5 | 678% |

---

### Case 32: Konkistolo / FamilyDuck Simulated Competition Ring (2022–2025)
| Property | Value |
|----------|-------|
| **Case ID** | KONKISTOLO_SIMULATED_COMPETITION_RING_2022_2025 |
| **Type** | Bid rigging / simulated competition |
| **Amount** | 1,925M MXN across 5 companies |
| **Confidence** | High |
| **Sector** | Multiple |

Network of 5 recently-created companies simulating competition in federal tenders. Konkistolo: alleged majority owner reported identity theft; non-existent address. FamilyDuck (885M MXN) and Grupo Pelmu (515M MXN) appear as competitors in same procedures. **All score 0.000 in v5.1 — critical model blind spot** (new companies, no historical concentration). Adiam Abastecedora separately inhabilitada 15 months (SFP, Aug 2025) for mattress contract fraud (37.6M MXN). MCCI Anuario de la Corrupción 2025.

**Matched Vendors (5):**

| Vendor | Vendor ID | Amount | RFC | Risk Score |
|--------|-----------|--------|-----|------------|
| KONKISTOLO SA DE CV | 297273 | 243M | KON230118UV6 | **0.000** |
| COMERCIALIZADORA FAMILYDUCK SA DE CV | 293066 | 885M | CFA230107UC6 | **0.000** |
| GRUPO PELMU SA DE CV | 279096 | 515M | GPE050222296 | **0.000** |
| TODOLOGOS.COM SA DE CV | 288385 | 163M | TOD220214AR9 | **0.000** |
| ADIAM ABASTECEDORA DE INSUMOS Y ALIMENTOS MEXICO SA DE CV | 291049 | 119M | AAI211104U57 | 0.018 |

---

### Case 33: Cloud Enterprise Services — Guardia Nacional Drone Overpricing (2023)
| Property | Value |
|----------|-------|
| **Case ID** | CLOUD_ENTERPRISE_GN_DRONE_OVERPRICING_2023 |
| **Type** | Overpricing / false documentation |
| **Amount** | 125M MXN (25 contracts) |
| **Confidence** | Medium |
| **Sector** | Gobernacion (Guardia Nacional) |

Cloud Enterprise Services awarded GN drone contract (119.2M MXN, Oct 2023) despite not scoring highest in tender. Drone "airworthiness certificate" was an Israeli amateur registration stating the Colugo ARC53 Hybrid VTOL was "built by an amateur." Congressional complaint filed to SFP, FGR, SAT, SHCP, UIF (November 2023). Also held SEDENA and SHCP contracts. Owner: Enrique Ruiz Hernández.

**Matched Vendors (1):**

| Vendor | Vendor ID | Contracts | Risk Score |
|--------|-----------|-----------|------------|
| CLOUD ENTERPRISE SERVICES S DE RL DE CV | 142577 | 25 | 0.063 |

---

### Case 34: La Barredora Guinda — Tabasco EFOS Ghost Network (2020–2024)
| Property | Value |
|----------|-------|
| **Case ID** | BARREDORA_GUINDA_TABASCO_NETWORK_2024 |
| **Type** | Ghost company (EFOS) + bid rigging |
| **Amount** | 2,360M MXN (network of ~20 companies) |
| **Confidence** | High |
| **Sector** | Ambiente (Conagua) + state agencies |

Network of ~20 companies linked to Alejandro Márquez "El Ganso" (friend of ex-secretary Adán Augusto López) received 2.36B MXN from Conagua and state agencies in 6 states (Tabasco, Campeche, Chiapas, Hidalgo, Puebla, Quintana Roo). Lead company on SAT EFOS Definitivo list. Three linked companies bid together in Conagua river-cleaning procedure May 2024. MCCI investigation published February 2026.

**Matched Vendors (1, remainder not in DB):**

| Vendor | Vendor ID | Contracts | RFC | Risk Score |
|--------|-----------|-----------|-----|------------|
| COMERCIO Y CONSTRUCCION DE TABASCO SA DE CV | 248612 | 17 | CCT1808139U3 | 0.006 |

---

### Case 35: Clan Biomédica — Interacción Biomédica + 83 Shells (IPN/ISSSTE 2012–2023)
| Property | Value |
|----------|-------|
| **Case ID** | INTERACCION_BIOMEDICA_IPN_ISSSTE_GHOST_NETWORK |
| **Type** | Ghost company network + conflict of interest |
| **Amount** | 1,613M MXN (1.613B MXN from ISSSTE 2012–2019) |
| **Confidence** | High |
| **Sector** | Salud (ISSSTE) + Educacion (IPN) |

Javier Tapia Santoyo (ex-secretary of administration IPN, ex-treasurer ISSSTE) ran 84 shell companies headed by Interacción Biomédica SA de CV. Received 1.613B MXN from ISSSTE while serving as public official — direct conflict of interest. FGR indictment 2019 (FED/FECC/UNAI-CDMX/0000530/2019). **Tapia Santoyo formally vinculado a proceso March 6, 2026** (2 days before this entry). Company on SAT EFOS Definitivo. Case identified by TOJIL December 2023.

**Matched Vendors (1, underrepresented in DB due to Structure B coverage):**

| Vendor | Vendor ID | DB Contracts | Risk Score | Note |
|--------|-----------|-------------|------------|------|
| INTERACCION BIOMEDICA SA DE CV | 148296 | 41 | 0.180 | 1.613B MXN total; DB shows only 41M MXN |

---

*Ground truth is sourced from ASF audits, DOJ filings, investigative journalism (Animal Político, Aristegui Noticias, Proceso, MCCI), FGR investigations, SFP sanction registry, and SAT EFOS lists. All cases are publicly documented. Inclusion does not imply that every associated contract was corrupt — it indicates the vendor was involved in a documented corruption case.*
