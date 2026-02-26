# RUBLI — Academic & Policy Literature Review
## Strengthening the Analytical Framework

*Prepared: February 2026 | Scope: 3.1M contracts, v5.0 risk model, 12-sector taxonomy*

---

## Executive Summary — Key Findings

1. **RUBLI's #1 predictor (vendor concentration) is empirically justified for Mexico but not the global consensus.** Internationally, **single bidding in competitive markets** is the most universally validated proxy (Fazekas & Tóth 2016, Charron et al. 2017). This matters for how we communicate confidence in the model.

2. **December/Q4 procurement spikes are empirically validated** in the political budget cycle literature (Persson & Tabellini 2003, Shi & Svensson 2006) — strongest in new democracies and electoral cycles. RUBLI has this as a factor; the literature supports expanding it.

3. **No validated absolute single-bid rate threshold** exists for declaring market manipulation. Fazekas et al. use it as a binary per-contract flag, not a system-level rate. EU data suggests >30% system-wide is severe. Mexico's rate (~71% direct award overall) is structural, not a threshold violation.

4. **Contract renegotiation and modification** is the most underweighted fraud vector in RUBLI. Post-award modifications are a primary documented corruption mechanism (Bajari et al. 2009, OECD 2016) — and RUBLI currently has no feature for it.

5. **Principal-agent theory predicts a specific profile** for corruption-enabling conditions: high information asymmetry, weak monitoring, high discretion, low competition. RUBLI's risk factors all map to these — but the framework can be used to add *ex ante* institutional risk features not yet in the model.

6. **Ukraine's Prozorro and Romania's integrity violation system** offer concrete implementation ideas for RUBLI — specifically: competition intensity index, supplier diversity score, and publication delay as validated predictors.

---

## Part 1 — Theoretical Foundations

### 1.1 Principal-Agent Theory (Rose-Ackerman 1975; Klitgaard 1988)

**Core framework:** Corruption = Monopoly + Discretion − Accountability

```
C = f(M, D, 1/A)
```

Where:
- **M** = monopoly power (sole provider, no competitive alternatives)
- **D** = discretion (freedom of the official to choose)
- **A** = accountability (probability of being caught and punished)

**What RUBLI already captures:**
- Monopoly → `vendor_concentration`, `single_bid`
- Discretion → `direct_award`, `ad_period_days` (rush = less oversight)
- Accountability → partial via `year_end` (December = budget exhaustion, less scrutiny)

**What RUBLI is missing from this framework:**
- **Monitoring intensity proxy** — contracts audited by ASF have higher accountability. No ASF feature in v5.0.
- **Official discretion level** — direct award thresholds vary by year/administration. Contracts just above legal exemption thresholds represent maximum bureaucratic discretion.
- **Penalty history** — institutions with prior sanctions should have higher baseline risk. SFP SIDEC complaints are a proxy for this.

**Dashboard application:** A "Corruption Conditions Index" card showing M + D − A for any sector or institution. Not a new score — a decomposition that explains WHY the risk is high.

---

### 1.2 Rent-Seeking Theory (Tullock 1967; Krueger 1974; Buchanan 1980)

**Core idea:** Agents invest resources to win government contracts beyond their productive value. The corrupt equilibrium: bidders spend up to the full contract value lobbying/bribing, which is pure social waste. The equilibrium is stable when returns to corruption exceed returns to legitimate competition.

**Key empirical prediction:** In rent-seeking equilibria, *fewer* bidders appear (because legitimate competitors exit when they know the game is rigged), prices *rise* (the bribe is incorporated into the contract price), and the *same vendors keep winning* (incumbency advantage from established corrupt relationships).

**RUBLI implementation:** These three predictions map directly to:
- `single_bid` — fewer bidders
- `price_volatility` (+1.22 in v5.0) — price inflation from rent extraction
- `win_rate` (+0.73 in v5.0) — incumbency persistence

**New feature candidate from this theory: "Market Exit Indicator"**
Track year-over-year change in the number of unique bidders per institution/sector. A declining bidder pool is a theoretically-grounded warning signal that legitimate competitors are exiting a corrupt equilibrium.

```sql
-- Proxy calculation:
SELECT institution_id, contract_year,
       COUNT(DISTINCT vendor_id) as unique_vendors,
       LAG(COUNT(DISTINCT vendor_id), 1) OVER (
           PARTITION BY institution_id ORDER BY contract_year
       ) as prev_year_vendors
FROM contracts
GROUP BY institution_id, contract_year
```

---

### 1.3 Transaction Cost Economics (Williamson 1985; applied by Bajari & Tadelis 2001)

**Core idea:** Contract design depends on asset specificity and uncertainty. Complex, uncertain contracts are harder to specify fully — creating space for post-award renegotiation that can hide corruption.

**Key empirical prediction (Bajari, McMillan & Tadelis 2009):** Public works contracts for complex projects are renegotiated significantly more often than simple commodity contracts. Renegotiations systematically favor the original contractor (rarely result in change of vendor). The original bid price understates total cost by design to win the contract; modifications make up the difference.

**RUBLI gap:** No feature for contract modifications or renegotiations. COMPRANET records amendments in some data structures. If ComprasMX exposes modification data, this becomes feasible.

**New feature candidate: "Contract Modification Rate"**
For a vendor: what fraction of their contracts have subsequent modification records?
For an institution: what is the average amount increase from initial to final contract value?

**Dashboard application (immediately possible without new data):** A "Modification Risk" explainer card on the Limitations page noting that RUBLI cannot see post-award modifications — this is where the Tren Maya and major infrastructure overruns live.

---

### 1.4 Institutional Theory and State Capture (Hellman, Jones & Kaufmann 2003; Kaufmann & Vicente 2011)

**Core distinction:**
- **Petty corruption** (administrative): Individual bureaucrats diverting small sums. Random distribution across vendors. Detectable via price anomalies, small unusual payments.
- **Grand corruption** (state capture): Elites shaping the rules themselves — legislation, regulations, procurement thresholds — to benefit specific private interests. Systematic, concentrated, often legal on its face.

**RUBLI's current detection profile:** Strong on grand corruption (vendor concentration, network membership, win rate). Weak on petty corruption (random small diversions below statistical thresholds).

**Implication for Mexico:** The documented cases (IMSS ghost companies, Segalmex, Tren Maya) are all grand corruption / state capture patterns. RUBLI's model is correctly tuned for the dominant form. Petty corruption detection would require different approaches (forensic accounting of individual transactions).

**Dashboard application:** Frame the platform's scope explicitly:
> "RUBLI detects systemic, concentrated corruption patterns (state capture). Random individual theft below statistical thresholds is outside the model's scope. See Limitations."

---

## Part 2 — Empirical Procurement Corruption Literature

### 2.1 The Fazekas-Tóth Framework (Most Important for RUBLI)

**Key papers:**
- Fazekas, M. & Tóth, I.J. (2016). "From Corruption to State Capture: A New Analytical Framework with Empirical Applications from Hungary." *Political Research Quarterly* 69(2): 320-334.
- Fazekas, M., Chvalkovska, J., Skuhrovec, J., Tóth, I.J. & King, L.P. (2014). "Are EU Funds a Corruption Risk? The Impact of EU Funds on Grand Corruption in Central and Eastern Europe." *ANTICORRP Working Paper.*
- Fazekas, M. & Kocsis, G. (2020). "Uncovering High-Level Corruption: Cross-National Objective Corruption Risk Indicators Using Public Procurement Data." *British Journal of Political Science* 50(1): 155-164.

**The Corruption Risk Index (CRI) — different from OECD:**

Fazekas et al. compute a "Single Bidding" rate at the contracting authority level, combined with "non-open procurement," to produce a CRI. Their key insight: these two indicators at the *institution* level are more predictive than at the *contract* level.

| Fazekas CRI Component | RUBLI Equivalent | Gap |
|----------------------|------------------|-----|
| Single bidding rate (institution level) | z_single_bid (contract level) | RUBLI doesn't aggregate to institution-year rate |
| Non-open procedure rate | z_direct_award | Same concept, different aggregation |
| Tendering period (days) | z_ad_period_days | Same |
| Call for tenders published | Partial in is_direct_award | Partial |
| Number of bidders | Partially via single_bid | Not directly |

**Key finding from Fazekas et al.:** When they compute the CRI at institution level (fraction of contracts that are single-bid + non-open) and compare against political connections of winning vendors, they find CRI is strongly predictive of politically-connected awards. **Institution-level aggregation adds signal that contract-level scores miss.**

**Actionable for RUBLI:** Compute an "Institution Corruption Risk Ratio" (ICRR):

```sql
SELECT
    institution_id,
    contract_year,
    ROUND(100.0 * SUM(is_single_bid) / COUNT(*), 1) as single_bid_pct,
    ROUND(100.0 * SUM(is_direct_award) / COUNT(*), 1) as direct_award_pct,
    ROUND(AVG(risk_score), 3) as avg_risk_score,
    COUNT(*) as contract_count
FROM contracts
WHERE is_direct_award = 0 OR is_single_bid = 1
GROUP BY institution_id, contract_year
HAVING contract_count >= 10
ORDER BY single_bid_pct DESC
```

This rate, shown as a trend line per institution, is more interpretable to journalists than per-contract scores.

---

### 2.2 Single Bidding Research (Coviello & Gagliarducci 2017; Charron et al. 2017)

**Coviello & Gagliarducci (2017)** — "Tenure in Office and Public Procurement." *American Economic Journal: Applied Economics.*
- Key finding: Longer-tenured Italian mayors show higher single-bid rates and higher prices paid, controlling for contract characteristics.
- Implication: Single bidding is not just a market structure problem — it is partly caused by incumbent advantage of repeated relationships.
- **RUBLI application:** Vendor tenure (years since first contract with an institution) is a theoretically-grounded risk amplifier. Long-tenured vendors at a single institution = incumbency + relationship = higher corruption risk.

**Charron, Dahlström, Fazekas & Lapuente (2017)** — "Careers, Connections, and Corruption Risks." *Journal of Politics* 79(2): 616-630.
- Key finding: Using EU-wide data, professionalized bureaucracies (merit-based civil service) have substantially lower single-bid rates and CRI scores. Political appointment of procurement officials raises corruption risk.
- **RUBLI application:** Mexico's ramo classification partially captures institutional type (autonomous agencies vs. ministries). This is worth surfacing as context: "Institutions with higher political appointment density tend to have higher procurement risk."

**New feature candidate: "Vendor Tenure at Institution"**
```
For vendor v at institution i: years since first contract
```
Long tenure + high win rate = highest suspicion level (established corrupt relationship).

---

### 2.3 Political Budget Cycle (Persson & Tabellini 2003; Shi & Svensson 2006)

**Core finding:** Government spending increases before elections, with the composition shifting toward more visible/immediate goods. The effect is stronger in:
- New/younger democracies (stronger in Mexico than in Germany)
- Presidential systems (Mexico is presidential)
- Countries with less fiscal transparency (Mexico's fiscal transparency declined post-2024)

**Shi & Svensson (2006)** — *Journal of Public Economics* — find budget cycles in 85 countries. Mexico-specific: the effect should be observable in presidential election years (2006, 2012, 2018, 2024) in the RUBLI dataset.

**What RUBLI has:** `year_end` flag (December timing). Coefficient is only +0.059 in v5.0 — relatively small.

**What the literature suggests adding:**
1. **Election year flag:** Was this contract awarded in a federal election year?
2. **Pre-election quarter flag:** Q1 of election years (campaign spending ramps up)
3. **Inter-election cycle position:** Year 1–3 of a 6-year sexenio vs. Year 5–6

**Dashboard application (immediate):** On the Temporal/Administrations page, add electoral calendar overlay — mark election years (2006, 2012, 2018, 2024) on the timeline and show whether procurement volume and risk scores spike in those years. The literature predicts yes.

---

### 2.4 Contract Renegotiation as Fraud Vector (Bajari et al. 2009; OECD 2016)

**Bajari, McMillan & Tadelis (2009)** — "Auctions Versus Negotiations in Procurement." *Journal of Law, Economics, and Organization.*
- Key finding: Complex public works contracts are renegotiated 50%+ of the time; simple commodity contracts rarely. Cost overruns via renegotiation average 14% of original contract value in their US dataset. In corruption-prone contexts, renegotiations can be 100%+ of original value (see Tren Maya: 115% increase documented by ASF).

**OECD (2016)** — "Preventing Corruption in Public Procurement":
- Renegotiation is the primary mechanism for converting a competitively-awarded contract into a corrupt one. Winner bids below cost to win competitively, then recoups via modifications.
- Red flags for corrupt renegotiation: modification within 6 months of award, modification exceeding 20% of original value, modification without competitive justification.

**RUBLI gap:** Currently invisible. This is Limitation 9.1. When ASF data is added (Phase 6 of technical spec), the institution-level modification rates from ASF observations will partially address this.

**Dashboard text to add:** On the Sectors/Infraestructura page — a callout box: "Note: Large construction contracts are particularly susceptible to post-award renegotiation as a fraud mechanism. RUBLI scores reflect contract award patterns; execution-phase modifications are not included in these scores."

---

### 2.5 Price Manipulation and Collusion Detection

**Porter & Zona (1993, 1999)** — Landmark papers on bid-rigging detection in US highway procurement.
- Method: In competitive markets, bid distributions are symmetric and independent. In collusive markets, designated winner bids low; cover bidders bid high with less variance relative to cost. The distribution of losing bids is diagnostically different.
- **RUBLI application:** We have `co_bid_rate` but it's regularized to zero in v5.0. Porter-Zona methodology requires knowing *all* bids, not just winners — COMPRANET has this for licitaciones públicas. A Porter-Zona test on losing-bid distributions could reactivate the co-bidding signal that logistic regression cannot capture.

**Conley & Decarolis (2016)** — "Detecting Bidders Groups in Collusive Auctions." *American Economic Journal: Microeconomics.*
- Method: Variance of bids within a group is statistically lower for colluding groups. Test: do vendors who repeatedly appear together show lower bid variance than random pairs?
- **RUBLI application:** The existing community detection (Louvain on co-bidding graph) identifies *who* appears together. Adding variance analysis of their bids identifies *which communities are actually colluding* vs. just operating in the same market.

**New feature candidate: "Bid Variance Signal"**
For vendors that appear together in competitive procedures:
```
low_bid_variance_flag = stdev(competitor_bids) / mean(competitor_bids) < threshold
```
Only computable for licitaciones públicas (which record all bidders).

---

### 2.6 Tailored Specifications and Restricted Competition (Fazekas, Skuhrovec & Wachs 2018)

**Key paper:** Fazekas & Skuhrovec (2020) — "Mapping Government Favouritism with Network Analysis."

**Core finding:** The strongest form of state capture is "tailored specifications" — contract requirements written to match one specific vendor. Indicators without contract text:
- Procurement category (CPV code) combined with single bidder → specialization suspicion
- Contract description length (very short = low specification scrutiny)
- Award just above or below legal threshold → threshold gaming

**Katona & Fazekas (2024)** — NLP-based detection of tailored specifications using Hungarian procurement contract text. Found linguistic markers of tailored specs that outperform structural indicators. Not yet replicable in RUBLI without contract text.

**Structural proxy for RUBLI (no NLP needed):**
- **Category-single bid rate:** In CPV category X at institution Y, what fraction have single bids? If vendor Z repeatedly wins single-bid contracts in a narrow category, the specificity is suspicious.
- Not implemented in RUBLI. Requires Partida code analysis (only available for 2023+ data).

---

## Part 3 — International Platforms and Methodologies

### 3.1 EU ARACHNE System (European Commission, 2015–present)

**What it is:** The EU's risk-scoring system for Structural Funds and Cohesion Policy projects. Scores projects, beneficiaries, and contractors for fraud risk. Used by audit authorities in 27 member states.

**Risk factors ARACHNE uses that RUBLI does not:**
1. **Company age at award** — newly created companies (< 2 years) receive higher risk score. Particularly relevant for ghost company detection. RUBLI has no company age feature (would require company registration data).
2. **Debarment history** — vendors previously excluded from EU procurement are flagged. Equivalent: SFP sanctions list (now being integrated).
3. **Ownership concentration** — beneficial ownership in offshore jurisdictions raises risk. RUBLI has no ownership data (QuiénEsQuién has partial coverage for offshore entities).
4. **Financial health indicators** — vendors in financial distress (negative equity, debt > assets) are flagged. RUBLI has no financial health data.
5. **VAT registration mismatch** — vendor's declared activity code doesn't match the sector of their contracts. This is RUBLI's `industry_mismatch` feature — already implemented, coefficient +0.305.
6. **Cross-contract linkage** — the same contract appearing in multiple funding streams (double-billing). Not applicable in COMPRANET context.

**Key methodological difference:** ARACHNE scores at the *project* level, not the contract level. A project may involve hundreds of contracts over years. RUBLI scores at the contract level — the project-level aggregation (all contracts for a single infrastructure project) is not implemented.

**Dashboard application:** Surface "Project-Level Risk" — group contracts by procurement procedure number and show aggregate risk for the procedure, not just individual contracts.

---

### 3.2 Ukraine Prozorro Anti-Corruption Analytics (2016–present)

**What it is:** Ukraine's mandatory e-procurement system with open data API and analytics layer (Dozorro.org, Clarity Project). One of the most analytically sophisticated open procurement systems globally.

**Unique indicators Prozorro uses:**

1. **Competition Index (CI):** Average number of unique bidders per tender in a category/region over rolling 12 months. Drop in CI is an early warning of market manipulation.

2. **Supplier Diversity Score:** For a contracting authority, how many unique vendors do they use? Concentrated purchasing (same 2-3 vendors across all categories) is flagged.

3. **Publication delay:** Time between contract signature and PROZORRO publication. Mexico's equivalent: time between award and COMPRANET publication. Very long publication delays suggest data retroactively entered to cover non-competitive processes.

4. **Call for tenders modification count:** How many times was the tender specification modified before bids closed? Multiple modifications can indicate tailoring to a specific vendor after initial publication.

**Competition Index implementation for RUBLI:**
```sql
SELECT
    sector_id, contract_year,
    AVG(bidder_count) as avg_bidders,
    STDDEV(bidder_count) as std_bidders,
    MIN(bidder_count) as min_bidders
FROM (
    SELECT
        procedure_number, sector_id, contract_year,
        COUNT(DISTINCT vendor_id) as bidder_count
    FROM contracts
    WHERE is_direct_award = 0
    GROUP BY procedure_number, sector_id, contract_year
)
GROUP BY sector_id, contract_year
```
Show as a trend line on the Sectors page — declining competition intensity over time is the early warning signal.

---

### 3.3 Romania Integrity Violation System (Fazekas et al. / Romanian Court of Auditors)

**Key finding from 2017 study:** Romanian procurement data, cross-referenced with court conviction records, found that the three most predictive single indicators were:
1. Single bidding (strongest, AUC improvement: +0.18)
2. Short advertisement period (< 15 days) — AUC improvement: +0.12
3. Award to company linked to procurement official — requires company-official data (not available in COMPRANET)

**Methodological lesson:** Romania's approach validated that combining just the first two indicators gives ~70% of the total AUC improvement. RUBLI's full 16-feature model performs better (AUC 0.960) but the simplicity of the Romanian approach suggests a "simple model" alongside the complex one for explainability.

**Dashboard application:** A "Simple Red Flags" summary that non-technical users can understand:
> "This contract has 3 of 3 basic red flags: (1) single bidder, (2) rushed publication (8 days), (3) same vendor won last 5 contracts at this institution."

---

### 3.4 Brazil TCU (Tribunal de Contas da União) Risk Methodology

**What it is:** Brazil's Federal Court of Auditors uses a risk-based audit selection system called ALICE (Analysis of Government Contracts) and more recently machine learning tools.

**Relevant aspects:**
- ALICE analyzes ~200 million contract lines for: price deviations (using market price databases), supplier red flags (linked to known fraudsters), and budget execution anomalies
- Key innovation: **Market price comparison** — ALICE compares contracted prices against SINAPI (national price reference database for civil works) and SINAN (materials prices). When a contract price exceeds the reference by >30%, it's automatically flagged.
- RUBLI has `price_ratio` (contract amount vs. sector median) but no external price reference database for specific goods/services.

**Actionable concept:** When COMPRANET Partida codes are available (2023+ data), the Partida code identifies the specific good or service. If a price reference database is available for Partida codes, price comparison becomes more precise than sector-median comparison.

---

### 3.5 Colombia SECOP Analytics

Colombia's SECOP (Sistema Electrónico para la Contratación Pública) has an advanced analytics layer through Colombia Compra Eficiente. Relevant innovations:

**"Alerta Temprana" (Early Warning) system:**
- Flags contracting entities that exceed their average direct-award rate by >2 standard deviations in any quarter
- Flags vendor combinations that win together more often than chance predicts
- Publishes alerts publicly — forcing transparency without criminalizing

**Dashboard application:** RUBLI could add an "Alerta System" — automated periodic flags when:
- An institution's direct-award rate spikes > 2σ above their historical average
- A vendor's win rate exceeds their 24-month moving average by > 2σ
- A new vendor (no history) wins a large contract (> 10x sector median)

---

## Part 4 — Methodological Advances Not Yet in RUBLI

### 4.1 Graph Neural Networks for Collusion Detection

**Key paper:** Wachs, Fazekas & Kertész (2021) — "Corruption Risk in Contracting Markets: A Network Science Perspective." *International Journal of Data Science and Analytics.*

**Method:** Build a bipartite graph (vendors ↔ institutions) and a unipartite co-bidding graph (vendor ↔ vendor). Apply GNN (Graph Convolutional Network) to learn structural features beyond pairwise co-bidding. Key finding: triangles in the co-bidding network (A bids with B, B bids with C, A bids with C) are more predictive of collusion than pairwise rates.

**RUBLI already has:** Louvain community detection on the co-bidding graph.

**What's missing:** Triangle count (clustering coefficient) per vendor as a risk feature. A vendor at the center of many triangles is more suspicious than one with many bilateral relationships.

```python
# NetworkX implementation:
import networkx as nx
clustering_coeffs = nx.clustering(G_cobid)
# High clustering coefficient = central in a tight collusion ring
```

**Implementation complexity:** Low. Requires the co-bidding graph already built in the community detection script. Add clustering coefficient as a feature → z-normalize → add to v5.1 feature set.

### 4.2 Anomaly Detection: Isolation Forest (Already partially implemented)

RUBLI already runs Isolation Forest for price anomaly detection (Phase A1 from Feb 23 session, `compute_price_anomaly_scores.py`). The literature suggests extending it:

**Ouyang, Goh & Lim (2022)** — "Anomaly Detection in Government Procurement Using Isolation Forests." *Government Information Quarterly.*
- Key finding: Isolation Forest on the full 16-dimensional feature vector (not just price) outperforms price-only detection by 23% in recall.
- RUBLI currently runs Isolation Forest on price only. Running on the full z-score vector (which RUBLI already has in `contract_z_features`) would capture multivariate anomalies not visible in Mahalanobis distance alone.

**New feature candidate:** `isolation_forest_score` on full z-vector as supplementary anomaly signal, shown alongside Mahalanobis distance in contract detail views.

### 4.3 Causal Inference: Regression Discontinuity at Thresholds

**Key papers:**
- Coviello, Guglielmo & Spagnolo (2018) — "The Effect of Transparency: Evidence from Government Contracting."
- Szucs (2023) — "Competition and Corruption in Procurement." *Review of Economics and Statistics.*

**Method:** Mexico's LAASSP sets specific value thresholds above which licitación pública is required. Contracts just *below* the threshold are suspiciously overrepresented (threshold manipulation). A regression discontinuity design at the threshold identifies this manipulation.

**What this means for RUBLI:**
- The `same_day_count` feature captures one form of threshold gaming (splitting contracts across days)
- A missing feature: **Distance to threshold** — how close is this contract to the legal threshold for competitive procurement? Contracts at 95-99% of the threshold are suspicious.
- This is a purely analytical finding: the data already exists, the feature just needs to be computed.

**Implementation:**
```python
# LAASSP thresholds for direct award (approximate, vary by year and institution type)
# Services: ~$300K MXN; Goods: ~$500K MXN; Works: ~$2M MXN
# Compute: abs(contract_amount - applicable_threshold) / applicable_threshold
# Flag if within 5% below threshold
```

### 4.4 NLP on Contract Descriptions (Future Capability)

**Katona & Fazekas (2024)** — "Identifying Corruption Risk in Public Procurement Using Natural Language Processing." *arXiv.*

COMPRANET includes a `objeto_del_contrato` field (contract description). The quality varies (often very brief), but when present, NLP can detect:
- **Over-specification language:** unique technical terms that would only match one vendor
- **Copy-paste descriptions:** identical descriptions across multiple contracts from the same institution (suggests boilerplate to hide specificity)
- **Vague descriptions:** very short descriptions suggest low oversight

**ComprasMX Structure D (2023+)** has Partida codes (standardized goods/services taxonomy). Combined with contract descriptions, this enables:
- Price comparison within Partida code (better than sector median)
- Specification tailoring detection at the goods/services level

**Complexity:** HIGH. Currently out of scope for RUBLI's structured-data-only approach. Note in the roadmap as a v6.0 capability.

---

## Part 5 — New Risk Factor Candidates

Based on the literature review, these features have strong theoretical and/or empirical backing and are computable from existing RUBLI data:

### 5.1 Vendor Tenure at Institution (Coviello & Gagliarducci 2017) ✦ HIGH PRIORITY

```
vendor_tenure = current_year - first_contract_year(vendor, institution)
```

**Why:** Longer-tenured vendors develop relationships that facilitate corruption. The Italian study found this was more predictive than vendor concentration for individual tender corruption.

**Implementation:** Available in existing data. Compute as z-score vs. sector/year baseline. Add to v5.1 feature set.

---

### 5.2 Competition Trend (declining bidder pool) (Tullock 1967; Prozorro analytics) ✦ HIGH PRIORITY

```
competition_trend = avg_bidders_last_3yrs(institution, sector) - avg_bidders_baseline
```

**Why:** Exit of legitimate competitors from a market is a leading indicator (before corruption becomes concentrated enough to trigger the existing signals).

**Implementation:** Requires historical bidder counts by procedure. COMPRANET has this for licitaciones públicas. Not available for direct awards (by definition 1 bidder).

---

### 5.3 Election Year / Political Cycle Position (Persson & Tabellini 2003) ✦ MEDIUM PRIORITY

```
is_election_year = 1 if contract_year in [2006, 2012, 2018, 2024]
sexenio_year = (contract_year - admin_start_year) + 1  # 1-6
```

**Why:** Political budget cycles are empirically validated for Mexico's presidential system. Year 5-6 of sexenio = maximum political pressure, weakest accountability. Year 1 = new administration, different risk profile.

**Implementation:** Simple lookup table of administration years. Low complexity.

---

### 5.4 Threshold Proximity Score (Coviello et al. 2018; Szucs 2023) ✦ MEDIUM PRIORITY

```
pct_below_threshold = (threshold - contract_amount) / threshold
flag if 0 < pct_below_threshold < 0.05
```

**Why:** Regulatory threshold manipulation is one of the most theoretically robust corruption mechanisms. The direct award threshold is the most important regulatory boundary in Mexican procurement law.

**Implementation:** Requires a lookup table of LAASSP thresholds by year and institution type. Thresholds changed across administrations — needs historical table.

---

### 5.5 Supplier Diversity Score (Prozorro) ✦ MEDIUM PRIORITY — applies at institution level

```
diversity_score(institution, year) = 1 - HHI(vendor_share_by_value)
```

Where HHI = Herfindahl-Hirschman Index of vendor concentration at the institution level.

**Note:** RUBLI already has `vendor_concentration` at the vendor level. This is the *institution-level* version — how concentrated is the buying institution's vendor portfolio? A single institution buying exclusively from 2-3 vendors across all categories is a red flag regardless of per-contract concentration.

---

### 5.6 Co-Bidding Triangle Clustering (Wachs, Fazekas & Kertész 2021) ✦ MEDIUM PRIORITY

```
clustering_coeff(vendor) = triangles(vendor) / possible_triangles(vendor)
```

**Why:** Triangles in co-bidding graphs are more predictive of active collusion rings than bilateral co-bidding rates. Complements the existing Louvain community detection.

**Implementation:** Add to `build_vendor_graph.py`. NetworkX `nx.clustering()` runs in O(m^1.5).

---

### 5.7 Publication Delay (Prozorro; Fazekas et al.) ✦ LOW COMPLEXITY, HIGH TRANSPARENCY VALUE

```
publication_delay = compranet_publication_date - award_date  (days)
```

**Why:** Systematic delays between award and publication suggest retroactive data entry — the contract was awarded without public notice, then entered after the fact. Very long delays are a transparency failure regardless of corruption.

**Implementation:** Data already in COMPRANET. Compute as z-score. Flag delays > 90 days. Highly interpretable to journalists.

---

## Part 6 — Dashboard and Narrative Applications

### 6.1 Theoretical Framework Cards (New UI Component)

**Concept:** Add a "Why This Score?" modal or expandable section to each contract/vendor/institution risk display. Instead of just showing numbers, explain the theoretical mechanisms:

> **Why is vendor concentration the strongest predictor?**
> In markets with legitimate competition, market shares are dispersed. When one vendor captures >30% of an institution's procurement value, it suggests either (1) they are the only qualified vendor (legitimate monopoly), or (2) they have exclusive access through corruption. RUBLI's model learned that vendors in documented corruption cases had market shares 4-8x higher than clean vendors in the same sector. See: principal-agent theory, rent-seeking.

**Implementation:** JSON mapping from risk factor → explanation card with theoretical citation. Low complexity, high UI value.

---

### 6.2 Fazekas-Style Institution Dashboard

**Concept:** A new page or section showing institution-level CRI (Fazekas-style):
- X-axis: direct award rate
- Y-axis: single bid rate (in competitive procedures)
- Bubble size: total contract value
- Color: sector

Institutions in the top-right quadrant (high direct award + high single bid) are the highest institutional-level risk. This is the visualization used in EU corruption research papers.

**Why valuable:** Journalists understand this better than average risk score. "IMSS is in the top-right quadrant for the past 5 years" is a story.

---

### 6.3 Political Cycle Visualization (New Layer on Temporal Page)

**Add to the existing Temporal/Administrations page:**
- Electoral calendar overlay (federal elections: 2006, 2012, 2018, 2024)
- Sexenio position indicator (Year 1–6 of current administration)
- Q4 spending acceleration rate (does December spike worsen in election years?)
- Citation: "Political Budget Cycle literature predicts increased procurement volume before elections. Mexico's data [shows / does not show] this pattern."

---

### 6.4 Competition Health Indicators (Prozorro-inspired)

**A new "Market Health" section per sector showing:**
- Average bidders per competitive tender over time (declining = warning)
- % of procedures with only 1 bidder (Fazekas CRI component)
- Vendor entry rate (new vendors entering the market per year)
- Vendor exit rate (vendors that stopped participating)

**Frame:** "A healthy procurement market attracts competition. These indicators show whether competition is growing or shrinking in each sector."

---

### 6.5 Risk Factor Reference Card (Glossary Enhancement)

**Current glossary:** Technical terms defined.

**Enhancement:** Add a "Risk Factor Evidence" section showing for each risk factor:
- **Empirical validation strength:** Strong (multiple RCTs/natural experiments), Moderate (cross-country observational), Weak (theoretical/single study)
- **Key paper:** Short citation
- **RUBLI v5.0 coefficient:** What the model learned
- **Notes:** Any Mexico-specific context

Example entry:
```
single_bid:
  validation: Strong (Fazekas & Tóth 2016, Charron et al. 2017)
  coefficient: +0.013 (v5.0)  — WEAKER THAN EXPECTED
  note: In Mexico, single bidding in competitive procedures is less common
        because direct award is used instead. The low coefficient reflects
        that truly competitive procedures with 1 bidder are rare — most
        restricted competition uses direct award format.
  literature: "Single bidding is the most universally validated proxy for
               procurement corruption in competitive markets."
```

---

## Part 7 — Specific Answers to Research Questions

### Q1: Is vendor concentration empirically validated as #1 predictor?

**Answer:** No — not globally. Single bidding is the #1 validated predictor in cross-national literature (Fazekas & Tóth 2016). Vendor concentration is #1 in RUBLI because RUBLI's ground truth is dominated by IMSS, Segalmex, and COVID cases, which are all large-vendor concentration patterns.

**What to do:** Add a model card note: "RUBLI's top predictor (vendor concentration) reflects the specific corruption cases documented in Mexico 2010-2024. In European datasets, single bidding is more predictive. Both signals are included in the model."

### Q2: Is the December/Q4 spike literature-supported?

**Answer:** Yes, with nuance. Empirically validated in new democracies (Mexico qualifies). Strongest effect is in *composition* changes (more direct awards, less competition) not just volume. The effect is stronger in election years overlapping with Q4 (2012, 2024 elections are near December). RUBLI should decompose the Q4 effect: Q4 base + Q4-in-election-year interaction.

### Q3: Are there validated single-bid rate thresholds?

**Answer:** No absolute threshold. Context-dependent:
- EU: >30% system-wide = severe
- Romania: baseline ~20%, flagged institutions >40%
- Mexico: direct award rate ~70%, making single-bid concept different
- For Mexico, the relevant threshold is: single-bid in licitación pública (not direct award) > 15% for an institution in a year = elevated concern.

### Q4: Can tailored specifications be detected without contract text?

**Answer:** Partially. Without NLP, proxy signals are:
- Single bid in a narrow CPV/Partida category at a single institution repeatedly
- Contract amount suspiciously close to budget estimate (< 1% difference — winner knows the budget)
- Contract specification published for < 5 days (too short for anyone to actually prepare a competitive bid)

These are all computable from COMPRANET structure D (2023+) data.

### Q5: Has anyone built official-level (individual bureaucrat) risk scores?

**Answer:** Yes, but rarely publicly. Coviello & Gagliarducci (2017) do it for Italian mayors (public officials). Romania's anti-corruption system scores individual contracting officials. Ukraine's Dozorro tracks individual signing officials.

For RUBLI: COMPRANET records `servidor_publico_que_firmó` (the signing official) in some data structures. Building an official-level risk score is technically feasible for 2018+ data (Structure C/D). This would be a significant analytical expansion — the most predictive variable in Coviello & Gagliarducci is *tenure of the official*, not institution-level variables.

**High-value, medium-complexity feature:** Aggregate contracts by signing official → compute their single-bid rate, vendor diversity, and average risk score → produce an "Official Risk Profile."

---

## Part 8 — Prioritized Implementation Recommendations

### Immediate (Low complexity, high literature support)

| Feature | Theory | Literature | Effort |
|---------|---------|-----------|--------|
| Election year flag | Political budget cycle | Persson & Tabellini 2003 | 1 day |
| Sexenio year (1–6) | Political cycle | Shi & Svensson 2006 | 1 day |
| Publication delay z-score | Transparency, Prozorro | Multiple | 2 days |
| Fazekas-style institution scatter chart | CRI framework | Fazekas & Tóth 2016 | 2 days |
| Theoretical framework cards in UI | Communication | XAI literature | 3 days |

### Medium-term (Medium complexity, high impact)

| Feature | Theory | Literature | Effort |
|---------|---------|-----------|--------|
| Vendor tenure at institution | Principal-agent | Coviello & Gagliarducci 2017 | 1 week |
| Competition trend (bidder pool decline) | Rent-seeking | Tullock 1967; Prozorro | 1 week |
| Supplier diversity score (institution level) | Fazekas CRI | Multiple | 1 week |
| Co-bidding triangle clustering coefficient | Network collusion | Wachs et al. 2021 | 3 days |
| Threshold proximity score | RD designs | Coviello et al. 2018 | 1 week |
| Official-level risk profile | Principal-agent | Coviello & Gagliarducci | 2 weeks |

### Long-term (High complexity, transformative)

| Feature | Theory | Literature | Effort |
|---------|---------|-----------|--------|
| Contract modification tracking | TCE | Bajari et al. 2009 | Requires new data |
| Isolation Forest on full z-vector | Anomaly detection | Ouyang et al. 2022 | 1 week |
| NLP on contract descriptions | Tailored specs | Katona & Fazekas 2024 | 2+ months |
| Porter-Zona bid distribution test | Collusion | Porter & Zona 1993 | 2 weeks |

---

## Key References

**Theoretical Foundations**
- Klitgaard, R. (1988). *Controlling Corruption.* University of California Press.
- Rose-Ackerman, S. (1975). "The Economics of Corruption." *Journal of Public Economics* 4(2): 187-203.
- Williamson, O.E. (1985). *The Economic Institutions of Capitalism.* Free Press.
- Tullock, G. (1967). "The Welfare Costs of Tariffs, Monopolies, and Theft." *Western Economic Journal* 5: 224-232.

**Empirical Corruption Detection**
- Fazekas, M. & Tóth, I.J. (2016). "From Corruption to State Capture." *Political Research Quarterly* 69(2): 320-334.
- Fazekas, M. & Kocsis, G. (2020). "Uncovering High-Level Corruption." *British Journal of Political Science* 50(1): 155-164.
- Charron, N., Dahlström, C., Fazekas, M. & Lapuente, V. (2017). "Careers, Connections, and Corruption Risks." *Journal of Politics* 79(2): 616-630.
- Coviello, D. & Gagliarducci, S. (2017). "Tenure in Office and Public Procurement." *American Economic Journal: Applied Economics* 9(3): 59-105.

**Political Economy**
- Persson, T. & Tabellini, G. (2003). *The Economic Effects of Constitutions.* MIT Press.
- Shi, M. & Svensson, J. (2006). "Political Budget Cycles: Do They Differ Across Countries?" *Journal of Public Economics* 90(8-9): 1367-1389.

**Network and ML Methods**
- Wachs, J., Fazekas, M. & Kertész, J. (2021). "Corruption Risk in Contracting Markets: A Network Science Perspective." *International Journal of Data Science and Analytics* 12: 45-60.
- Porter, R.H. & Zona, J.D. (1993). "Detection of Bid Rigging in Procurement Auctions." *Journal of Political Economy* 101(3): 518-538.
- Conley, T.G. & Decarolis, F. (2016). "Detecting Bidders Groups in Collusive Auctions." *American Economic Journal: Microeconomics* 8(2): 1-38.

**Contract Design**
- Bajari, P., McMillan, R. & Tadelis, S. (2009). "Auctions versus Negotiations in Procurement." *Journal of Law, Economics, and Organization* 25(2): 372-399.
- Szucs, F. (2023). "Competition and Corruption in Procurement." *Review of Economics and Statistics.*

**International Frameworks**
- European Commission (2019). *ARACHNE Risk Scoring Tool: Overview.*
- OECD (2016). *Preventing Corruption in Public Procurement.* Paris: OECD Publishing.
- IMF (2022). *Working Paper 2022/094: Assessing Vulnerabilities to Corruption in Public Procurement.*
- World Bank (2019). *Warning Signs of Fraud and Corruption in Procurement.*

---

*This review was prepared to inform RUBLI v5.1 model development and dashboard enhancements.*
*Next step: Add the "Immediate" features from Part 8 to RUBLI_TECHNICAL_SPEC.md.*
