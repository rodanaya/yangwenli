# RUBLI Risk Scoring Methodology

## Aligning with International Procurement Integrity Standards

**Version:** 2.0.0
**Last Updated:** January 15, 2026
**Database:** RUBLI_NORMALIZED.db (3,110,017 contracts, 2002-2025)

---

## Executive Summary

RUBLI implements a **10-factor risk scoring methodology** aligned with international procurement integrity standards from the United Nations, World Bank, IMF, OECD, EU, and G20. This document provides full transparency on our scoring methodology, thresholds, and academic sources.

**Key Statistics (v2.0.0):**
- Total Contracts Analyzed: 3,110,017
- Low Risk (<0.2): 2,476,550 (79.6%)
- Medium Risk (0.2-0.4): 631,062 (20.3%)
- High Risk (0.4-0.6): 2,405 (0.08%)
- Critical Risk (>=0.6): 0 (0%)

**Implementation Status:**
- 8 of 10 factors fully implemented
- 2 factors inactive (no data available: Decision Period, Contract Modification)
- 3 factors added in v2.0.0: Short Ad Period, Threshold Splitting, Network Risk

---

## 1. International Framework Alignment

### 1.1 UNCITRAL Model Law on Public Procurement (2011)

The United Nations Commission on International Trade Law provides the foundational framework for public procurement integrity.

| UNCITRAL Principle | RUBLI Implementation | Indicator |
|-------------------|---------------------|-----------|
| **Value for Money** | Price anomaly detection | IQR-based overpricing flag |
| **Avoidance of Abuse** | Multi-factor risk scoring | 10-factor model |
| **Transparency** | Public tender tracking | Open vs. restricted procedure rate |
| **Objectivity** | Quantitative scoring | No subjective criteria |
| **Fairness** | Equal vendor analysis | All 320,429 vendors scored |
| **Competition** | Single-bid monitoring | Bidder count analysis |
| **Integrity** | Vendor concentration limits | Sector monopoly detection |

**Source:** [UNCITRAL Model Law 2011 (PDF)](https://uncitral.un.org/sites/uncitral.un.org/files/media-documents/uncitral/en/2011-model-law-on-public-procurement-e.pdf)

### 1.2 UNODC UNCAC Article 9 Compliance

The United Nations Office on Drugs and Crime provides anti-corruption guidelines under the UN Convention Against Corruption.

| UNCAC Article 9 Requirement | RUBLI Indicator | Data Field |
|----------------------------|-----------------|------------|
| Public distribution of procurement information | % tenders publicly advertised | `procedure_type` |
| Conditions for participation | Vendor eligibility tracking | `vendor_id` history |
| Objective and predetermined criteria | Documented scoring methodology | This document |
| Effective review mechanism | Appeal tracking | `contract_status` |
| Personnel integrity measures | Institution risk profiling | `institution_id` patterns |

**Source:** [UNODC Anti-Corruption Guidebook 2013 (PDF)](https://www.unodc.org/documents/corruption/Publications/2013/Guidebook_on_anti-corruption_in_public_procurement_and_the_management_of_public_finances.pdf)

### 1.3 G20 Principles for Promoting Integrity in Public Procurement (2015)

| G20 Principle | RUBLI Implementation |
|--------------|---------------------|
| **Transparency** | Open data API, public dashboard |
| **Good Governance** | Institution-level risk aggregation |
| **Integrity** | Vendor network analysis |
| **Accountability** | Audit trail in database |
| **Stakeholder Participation** | Public-facing platform |
| **Access** | % open vs restricted tenders tracked |
| **E-Procurement** | CompraNet data integration |
| **Capacity Building** | Educational components |
| **Risk Management** | 10-factor scoring model |
| **Debarment** | Vendor history tracking |

**Source:** [G20 Procurement Integrity Principles (PDF)](https://www.unodc.org/documents/corruption/G20-Anti-Corruption-Resources/Thematic-Areas/Public-Sector-Integrity-and-Transparency/G20-Principles_for_Promoting_Integrity_in_Public_Procurement_2015.pdf)

---

## 2. Risk Scoring Model

### 2.1 Ten-Factor Model (Research-Backed)

Our risk scoring model incorporates indicators from multiple international frameworks:

| # | Factor | Weight | Primary Source | Secondary Sources |
|---|--------|--------|----------------|-------------------|
| 1 | **Single Bidding** | 15% | OCDS Red Flags | World Bank, OECD |
| 2 | **Non-Open Procedure** | 15% | IMF CRI | UNCITRAL, EU Directive |
| 3 | **Price Anomaly** | 15% | EU OLAF | Statistical IQR method |
| 4 | **Vendor Concentration** | 10% | OECD | EU ARACHNE |
| 5 | **Short Advertisement Period** | 10% | IMF CRI | EU Directive 2014/24 |
| 6 | **Short Decision Period** | 10% | Fazekas et al. (2022) | IMF Working Paper |
| 7 | **Year-End Timing** | 5% | ASF Mexico | IMCO |
| 8 | **Contract Modification** | 10% | EU OLAF | OCDS |
| 9 | **Threshold Splitting** | 5% | OLAF | UNODC |
| 10 | **Winner/Subcontractor Links** | 5% | OLAF Collusion Flags | Network analysis |

### 2.2 Factor Definitions and Thresholds

#### Factor 1: Single Bidding (15%)
**Definition:** Contract awarded with only one bidder participating.

| Threshold | Score | Benchmark Source |
|-----------|-------|------------------|
| Multiple bidders (>1) | 0.00 | OECD norm |
| Single bidder | 0.15 | World Bank concern |

**Research Basis:**
- OECD reports average single-bid rates of 20-30% in developing economies
- World Bank INT identifies single bidding as top fraud marker
- OCDS Cardinal library flags all single-bid contracts

#### Factor 2: Non-Open Procedure (15%)
**Definition:** Contract awarded through restricted or direct award rather than open tender.

| Procedure Type | Score | Legal Basis |
|---------------|-------|-------------|
| Open tender (Licitacion Publica) | 0.00 | LAASSP Art. 26 |
| Restricted tender (Invitacion) | 0.08 | Below threshold |
| Direct award (Adjudicacion Directa) | 0.15 | Emergency only |

**Research Basis:**
- IMF CRI assigns highest weight to non-open procedures
- EU Directive 2014/24 mandates open procedures above thresholds
- Mexican LAASSP requires open tender for contracts >$2M MXN

#### Factor 3: Price Anomaly (15%)
**Definition:** Contract amount significantly above sector median using IQR method.

| Price Ratio | Score | Statistical Basis |
|-------------|-------|-------------------|
| Within Q3 + 1.5*IQR | 0.00 | Normal distribution |
| 1.5-2.0x sector median | 0.08 | Mild outlier |
| 2.0-3.0x sector median | 0.12 | Significant outlier |
| >3.0x sector median | 0.15 | Extreme outlier |

**Formula:**
```
IQR = Q3 - Q1 (Interquartile Range)
Upper Fence = Q3 + 1.5 * IQR
Price Ratio = contract_amount / sector_median
```

**Research Basis:**
- EU OLAF uses IQR method for price anomaly detection
- Tukey's method (1977) defines outliers at 1.5 IQR
- ARACHNE flags contracts >2x reference prices

#### Factor 4: Vendor Concentration (10%)
**Definition:** Percentage of sector contracts held by a single vendor.

| Concentration | Score | Market Impact |
|---------------|-------|---------------|
| <10% | 0.00 | Healthy competition |
| 10-20% | 0.05 | Moderate concentration |
| 20-30% | 0.07 | High concentration |
| >30% | 0.10 | Monopoly risk |

**Research Basis:**
- OECD defines >30% as "dominant position"
- EU ARACHNE Category 3: Concentration indicators
- OCDS red flag for vendor market share

#### Factor 5: Short Advertisement Period (10%)
**Definition:** Tender advertised for less than legally required minimum days.

| Days Advertised | Score | Legal Minimum |
|-----------------|-------|---------------|
| >=15 days | 0.00 | LAASSP compliant |
| 10-14 days | 0.05 | Below standard |
| 5-9 days | 0.08 | Significantly short |
| <5 days | 0.10 | Restricted access |

**Research Basis:**
- IMF CRI Factor: "short submission period"
- EU Directive requires minimum 35 days (reduced to 15 for electronic)
- Mexican LAASSP requires minimum 15 calendar days

#### Factor 6: Short Decision Period (10%)
**Definition:** Time between submission deadline and award significantly below average.

| Decision Days | Score | Statistical Basis |
|---------------|-------|-------------------|
| >Sector avg | 0.00 | Normal process |
| 50-100% of avg | 0.05 | Expedited |
| 25-50% of avg | 0.08 | Very fast |
| <25% of avg | 0.10 | Suspiciously fast |

**Research Basis:**
- Fazekas & Kocsis (2020): "Shorter decision periods correlate with favoritism"
- IMF Working Paper 2022/094: regression-based detection
- ARACHNE monitors evaluation timeline anomalies

#### Factor 7: Year-End Timing (5%)
**Definition:** Contract signed in December (budget exhaustion period).

| Month | Score | Fiscal Context |
|-------|-------|----------------|
| January-November | 0.00 | Normal timing |
| December | 0.05 | Year-end spike |

**Research Basis:**
- ASF Mexico audits show December spending spikes
- IMCO documents "Decembrinas" (year-end rush contracts)
- Budget exhaustion incentivizes hasty awards

#### Factor 8: Contract Modification (10%)
**Definition:** Contract amended after award, increasing value or scope.

| Modification | Score | Threshold |
|--------------|-------|-----------|
| No modification | 0.00 | Clean contract |
| <10% value increase | 0.03 | Minor change |
| 10-25% value increase | 0.06 | Significant change |
| >25% value increase | 0.10 | Major scope change |

**Research Basis:**
- EU OLAF: modifications >25% require new tender
- OCDS tracks amendmentDate and amendmentRationale
- Corruption often surfaces in post-award modifications

#### Factor 9: Threshold Splitting (5%)
**Definition:** Multiple contracts to same vendor just below tender threshold.

| Pattern | Score | Detection Method |
|---------|-------|------------------|
| No pattern | 0.00 | Normal |
| 2-3 contracts near threshold | 0.03 | Possible splitting |
| >3 contracts near threshold | 0.05 | Likely splitting |

**Research Basis:**
- OLAF identifies threshold splitting as bid manipulation
- UNODC: common technique to avoid open tender requirements
- Pattern detection within 30-day windows

#### Factor 10: Winner/Subcontractor Relationships (5%)
**Definition:** Network analysis reveals winner-loser relationships suggesting collusion.

| Relationship | Score | Network Indicator |
|--------------|-------|-------------------|
| No suspicious links | 0.00 | Independent bidders |
| Shared address/director | 0.03 | Potential link |
| Rotation pattern detected | 0.05 | Bid rigging indicator |

**Research Basis:**
- EU OLAF collusive bidding red flags
- Network centrality analysis
- Shared beneficial ownership detection

---

## 3. Risk Level Thresholds

### 3.1 Classification (International Benchmarks)

| Level | Score Range | Benchmark Source | Recommended Action |
|-------|-------------|------------------|-------------------|
| **LOW** | 0.00 - 0.20 | OECD norm (Nordic countries) | Standard monitoring |
| **MEDIUM** | 0.20 - 0.40 | OECD average | Watch list |
| **HIGH** | 0.40 - 0.60 | World Bank concern | Priority review |
| **CRITICAL** | 0.60 - 1.00 | TI extreme cases | Immediate investigation |

### 3.2 Sector-Level Thresholds

Based on RUBLI analysis of 3.1M contracts:

| Sector | Avg Risk | High Risk Count | Status |
|--------|----------|-----------------|--------|
| Hacienda | 0.315 | 11 | ELEVATED |
| Trabajo | 0.288 | 6 | ELEVATED |
| Agricultura | 0.286 | 10 | ELEVATED |
| Otros | 0.272 | 1,041 | MEDIUM |
| Tecnologia | 0.263 | 16 | MEDIUM |
| Salud | 0.260 | 511 | MEDIUM |
| Gobernacion | 0.260 | 46 | MEDIUM |
| Educacion | 0.257 | 34 | MEDIUM |
| Ambiente | 0.241 | 21 | MEDIUM |
| Defensa | 0.233 | 71 | MEDIUM |
| Energia | 0.231 | 61 | MEDIUM |
| Infraestructura | 0.167 | 171 | LOW |

---

## 4. EU ARACHNE Risk Categories

Our methodology aligns with the European Commission's ARACHNE system, which uses 100+ risk indicators across 7 categories:

| ARACHNE Category | Max Points | RUBLI Coverage | Indicators |
|------------------|------------|----------------|------------|
| **Procurement** | 50 | Full | Single bid, non-open, short periods |
| **Contract Management** | 50 | Partial | Modifications, amendments |
| **Concentration** | 50 | Full | Vendor market share |
| **Eligibility/Exclusion** | 50 | Partial | Vendor history |
| **Performance** | 50 | Limited | Contract completion |
| **Reputational** | 50 | Partial | Sanctions screening |
| **Fraud/Other** | 50 | Partial | Network analysis |

**Source:** [EU ARACHNE Documentation](https://employment-social-affairs.ec.europa.eu/policies-and-activities/funding/european-social-fund-plus-esf/what-arachne_en)

---

## 5. ISO Standards Alignment

### 5.1 ISO 37001:2016 Anti-Bribery Management Systems

| ISO 37001 Clause | RUBLI Implementation |
|------------------|---------------------|
| 4.1 Context | Mexican procurement environment analysis |
| 4.5 Bribery risk assessment | 10-factor scoring model |
| 8.2 Due diligence | Vendor concentration analysis |
| 8.3 Financial controls | Price anomaly detection |
| 8.9 Gifts, hospitality | Not applicable (data limitation) |
| 9.2 Internal audit | Database audit trails |
| 10.2 Corrective action | Investigation recommendations |

**Source:** [ISO 37001:2016](https://www.iso.org/standard/65034.html)

### 5.2 ISO 20400:2017 Sustainable Procurement

| ISO 20400 Principle | RUBLI Indicator |
|--------------------|-----------------|
| Accountability | Institution-level tracking |
| Transparency | Public data access |
| Ethical behavior | Vendor risk profiling |
| Respect for stakeholder interests | Human impact estimates |
| Respect for rule of law | Legal threshold compliance |
| Respect for international norms | Multi-framework alignment |
| Respect for human rights | Not applicable (data limitation) |

**Source:** [ISO 20400:2017](https://www.iso.org/standard/63026.html)

---

## 6. SDG 16 Indicators

RUBLI contributes to UN Sustainable Development Goal 16: Peace, Justice and Strong Institutions.

| SDG Target | Indicator | RUBLI Proxy |
|------------|-----------|-------------|
| **16.5** Reduce corruption | 16.5.1 Bribery prevalence | Contracts with risk > 0.5 |
| **16.5** Reduce corruption | 16.5.2 Business bribery | Vendor concentration |
| **16.6** Effective institutions | 16.6.1 Budget execution | Contract completion rates |
| **16.6** Effective institutions | 16.6.2 Public satisfaction | (Requires survey data) |
| **16.10** Access to information | 16.10.2 Public access | Open data API availability |

**Source:** [UN SDG 16 Metadata](https://unstats.un.org/sdgs/metadata/?Text=&Goal=16&Target=)

---

## 7. Corruption Cost Estimation

### 7.1 World Bank / IMF Methodology

The World Bank and IMF estimate corruption costs at 8-25% of procurement value:

| Risk Level | Loss Rate | Source |
|------------|-----------|--------|
| Low (0-0.25) | 5-8% | World Bank conservative |
| Medium (0.25-0.5) | 8-15% | IMF mid-range |
| High (0.5-0.7) | 15-20% | OECD construction average |
| Critical (0.7-1.0) | 20-30% | TI extreme cases |

### 7.2 RUBLI Loss Formula

```
loss_rate = 0.08 + (risk_score * 0.17)
estimated_loss = contract_value * loss_rate * risk_score
```

This provides:
- Minimum 8% base rate (World Bank floor)
- Maximum 25% for risk_score = 1.0 (TI ceiling)
- Scaled by risk_score for proportionality

**Sources:**
- World Bank INT: "Warning Signs of Fraud and Corruption" (2019)
- IMF Working Paper 2022/094: "Assessing Vulnerabilities to Corruption"
- Transparency International: Corruption Perceptions Index methodology

---

## 8. Mexico-Specific Considerations

### 8.1 Legal Framework

| Law | Relevance | Key Thresholds |
|-----|-----------|----------------|
| LAASSP | Federal procurement | Open tender > ~$2M MXN |
| LOPSRM | Public works | Construction-specific rules |
| LFACP | Anti-corruption | Sanctions framework |

### 8.2 CompraNet Integration

RUBLI processes data from Mexico's official e-procurement system:
- **Source:** CompraNet (compranet.hacienda.gob.mx)
- **Years:** 2002-2025
- **Records:** 3,110,072 contracts
- **Institutions:** 4,456 government entities
- **Vendors:** 320,429 unique suppliers

### 8.3 IMCO/OECD Studies

| Study | Key Finding | RUBLI Application |
|-------|-------------|-------------------|
| IMCO ICRM Index | 43-variable corruption index | Benchmark comparison |
| OECD CompraNet Review | E-procurement recommendations | Data quality assessment |
| Baker Institute Study | CFE/IMSS highest risk | Sector prioritization |

**Sources:**
- [OECD Mexico CompraNet Review (PDF)](https://www.oecd.org/content/dam/oecd/en/publications/reports/2018/01/mexico-s-e-procurement-system_g1g871f1/9789264287426-en.pdf)
- [UNODC Mexico UNCAC Assessment (PDF)](https://www.unodc.org/documents/corruption/Publications/2014/Legal_Assessment_of_Mexicos_compliance_with_article_9_of_the_UNCAC.pdf)

---

## 9. Full Academic Citations

### United Nations Framework

1. **UNCITRAL (2011).** *Model Law on Public Procurement.* United Nations Commission on International Trade Law. [PDF](https://uncitral.un.org/sites/uncitral.un.org/files/media-documents/uncitral/en/2011-model-law-on-public-procurement-e.pdf)

2. **UNODC (2013).** *Guidebook on Anti-Corruption in Public Procurement and the Management of Public Finances.* United Nations Office on Drugs and Crime. [PDF](https://www.unodc.org/documents/corruption/Publications/2013/Guidebook_on_anti-corruption_in_public_procurement_and_the_management_of_public_finances.pdf)

3. **UN (2015).** *Sustainable Development Goal 16: Peace, Justice and Strong Institutions.* [Metadata](https://unstats.un.org/sdgs/metadata/?Text=&Goal=16&Target=)

4. **UN Global Compact.** *Supply Chain Sustainability.* [Portal](https://unglobalcompact.org/what-is-gc/our-work/supply-chain)

### European Union Framework

5. **European Parliament (2014).** *Directive 2014/24/EU on Public Procurement.* [EUR-Lex](https://eur-lex.europa.eu/eli/dir/2014/24/oj/eng)

6. **European Commission.** *ARACHNE Risk Scoring Tool.* [Documentation](https://employment-social-affairs.ec.europa.eu/policies-and-activities/funding/european-social-fund-plus-esf/what-arachne_en)

7. **OLAF.** *Red Flags Library.* Anti-Fraud Knowledge Centre. [Library](https://antifraud-knowledge-centre.ec.europa.eu/library-good-practices-and-case-studies/good-practices/early-warning-red-flags_en)

### International Organizations

8. **Fazekas, M. & Kocsis, G. (2022).** *Assessing Vulnerabilities to Corruption in Public Procurement and Their Price Impact.* IMF Working Paper 2022/094. [Paper](https://www.imf.org/en/Publications/WP/Issues/2022/05/20/Assessing-Vulnerabilities-to-Corruption-in-Public-Procurement-and-Their-Price-Impact-518197)

9. **World Bank INT (2019).** *Warning Signs of Fraud and Corruption in Procurement.* [PDF](https://documents1.worldbank.org/curated/en/223241573576857116/pdf/Warning-Signs-of-Fraud-and-Corruption-in-Procurement.pdf)

10. **OECD (2023).** *Public Procurement Performance Report.* [PDF](https://www.oecd.org/content/dam/oecd/en/publications/reports/2023/08/public-procurement-performance_0ebfe3e7/0dde73f4-en.pdf)

11. **G20 (2015).** *Principles for Promoting Integrity in Public Procurement.* [PDF](https://www.unodc.org/documents/corruption/G20-Anti-Corruption-Resources/Thematic-Areas/Public-Sector-Integrity-and-Transparency/G20-Principles_for_Promoting_Integrity_in_Public_Procurement_2015.pdf)

### Standards & Tools

12. **ISO (2016).** *ISO 37001:2016 Anti-Bribery Management Systems.* [Standard](https://www.iso.org/standard/65034.html)

13. **ISO (2017).** *ISO 20400:2017 Sustainable Procurement Guidance.* [Standard](https://www.iso.org/standard/63026.html)

14. **Open Contracting Partnership (2024).** *Red Flags in Public Procurement Guide.* [PDF](https://www.open-contracting.org/wp-content/uploads/2024/12/OCP2024-RedFlagProcurement-1.pdf)

15. **Open Contracting Partnership (2024).** *Cardinal: Open Source Red Flag Library.* [Tool](https://www.open-contracting.org/2024/06/12/cardinal-an-open-source-library-to-calculate-public-procurement-red-flags/)

16. **IDB.** *Methodology for Assessing Procurement Systems (MAPS).* [Portal](https://www.mapsinitiative.org/methodology/)

### Mexico-Specific

17. **OECD (2018).** *Mexico's e-Procurement System: Redesigning CompraNet.* [PDF](https://www.oecd.org/content/dam/oecd/en/publications/reports/2018/01/mexico-s-e-procurement-system_g1g871f1/9789264287426-en.pdf)

18. **UNODC (2014).** *Legal Assessment of Mexico's Compliance with Article 9 of UNCAC.* [PDF](https://www.unodc.org/documents/corruption/Publications/2014/Legal_Assessment_of_Mexicos_compliance_with_article_9_of_the_UNCAC.pdf)

19. **IMCO / Baker Institute.** *Measuring Corruption in Mexico.* [Research](https://www.bakerinstitute.org/research/measuring-corruption-mexico)

20. **Transparency International.** *Corruption Perceptions Index - Mexico.* [Data](https://www.transparency.org/en/countries/mexico)

### Academic Research

21. **Gallego, J., Rivero, G., & Martinez, J. (2022).** *Preventing rather than punishing: An early warning model of malfeasance in public procurement.* EPJ Data Science. [Paper](https://epjdatascience.springeropen.com/articles/10.1140/epjds/s13688-022-00329-7)

22. **UNAM Research Group (2022).** *Machine Learning for Corruption Detection in Mexican Public Procurement.* [arXiv](https://arxiv.org/abs/2211.01478)

---

## 10. Technical Implementation

### 10.1 Database Schema

```sql
-- Risk score stored in contracts table
ALTER TABLE contracts ADD COLUMN risk_score REAL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN risk_factors TEXT;  -- JSON array of triggered factors

-- Risk calculation metadata
CREATE TABLE risk_calculations (
    id INTEGER PRIMARY KEY,
    calculation_date TIMESTAMP,
    methodology_version TEXT,
    contracts_processed INTEGER,
    avg_risk_score REAL
);
```

### 10.2 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/sectors/{id}/risk` | Sector risk summary |
| `GET /api/v1/vendors/{id}/risk` | Vendor risk profile |
| `GET /api/v1/contracts/{id}/risk` | Contract risk breakdown |
| `GET /api/v1/methodology` | This methodology document |

### 10.3 Calculation Script

**Location:** `backend/scripts/calculate_risk_scores.py`

**Performance:**
- 3,110,072 contracts processed
- 18 minutes 32 seconds
- 2,797 contracts/second

---

## 11. Limitations and Caveats

### 11.1 Data Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Missing bid counts | Cannot calculate single-bid rate for all contracts | Use procedure type as proxy |
| No contract text | Cannot analyze terms | Focus on metadata indicators |
| Limited amendment data | Under-detection of modifications | Conservative scoring |
| Historical gaps | Pre-2010 data quality varies | Weight recent data higher |

### 11.2 Methodological Limitations

| Limitation | Impact | Future Enhancement |
|------------|--------|-------------------|
| No network analysis yet | Missing collusion detection | Phase 4 planned |
| Sector medians may shift | Historical price comparisons | Rolling window calculation |
| Exchange rate volatility | USD conversion variability | Use contract-date rates |

### 11.3 Interpretation Guidelines

- **Risk score is NOT proof of corruption** - it indicates elevated risk warranting review
- **Low scores do not guarantee clean contracts** - new fraud patterns may emerge
- **Sector comparisons require context** - some sectors inherently have more complex procurement

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01 | Initial release with 10-factor model |

---

## Contact

**RUBLI Project**
Procurement Transparency Platform for Mexico
Database: RUBLI_NORMALIZED.db
Contracts: 3,110,072 (2002-2025)

---

*This methodology document is provided for transparency and reproducibility. All scoring is automated based on objective criteria without human judgment in individual contract assessments.*
