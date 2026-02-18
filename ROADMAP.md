# RUBLI Development Roadmap


**Total Steps:** 432
**Phases:** 5
**Current Status:** Phase 1 Complete (Data Infrastructure)

---

## Table of Contents

1. [Phase 2: Institution Classification](#phase-2-institution-classification) (Steps 1-68)
2. [Phase 3: Vendor Deduplication](#phase-3-vendor-deduplication) (Steps 69-152)
3. [Phase 4: Risk Scoring](#phase-4-risk-scoring) (Steps 153-228)
4. [Phase 5: API Development](#phase-5-api-development) (Steps 229-338)
5. [Phase 6: Frontend Dashboard](#phase-6-frontend-dashboard) (Steps 339-432)

---

# Phase 2: Institution Classification

**Objective:** Classify 4,456 government institutions into standardized categories.

## 2.1 Research & Design (Steps 1-15)

- [ ] **1.** Analyze existing institution data distribution
- [ ] **2.** Query unique institution names from database
- [ ] **3.** Identify naming patterns (acronyms, full names, variations)
- [ ] **4.** Research Mexican government structure (federal, state, municipal)
- [ ] **5.** Study SHCP organizational charts for federal entities
- [ ] **6.** Compile list of known autonomous institutions (INAI, INE, Banxico)
- [ ] **7.** Research decentralized organizations (IMSS, ISSSTE, PEMEX, CFE)
- [ ] **8.** Document state government naming conventions
- [ ] **9.** Document municipal government naming conventions
- [ ] **10.** Identify educational institutions (UNAM, IPN, universities)
- [ ] **11.** Identify health institutions (hospitals, clinics)
- [ ] **12.** Define institution taxonomy hierarchy
- [ ] **13.** Create institution_types lookup table schema
- [ ] **14.** Create institution_levels lookup table schema
- [ ] **15.** Document classification rules in markdown

## 2.2 Database Schema Updates (Steps 16-25)

- [ ] **16.** Create institution_types table
- [ ] **17.** Insert institution type seed data (federal, state, municipal, autonomous, etc.)
- [ ] **18.** Create institution_levels table
- [ ] **19.** Insert institution level seed data (secretariat, subsecretariat, directorate, etc.)
- [ ] **20.** Add institution_type_id column to institutions table
- [ ] **21.** Add institution_level_id column to institutions table
- [ ] **22.** Add parent_institution_id column for hierarchy
- [ ] **23.** Add is_decentralized boolean column
- [ ] **24.** Add is_autonomous boolean column
- [ ] **25.** Create indexes on new columns

## 2.3 Rule-Based Classifier Development (Steps 26-45)

- [ ] **26.** Create backend/scripts/classify_institutions.py
- [ ] **27.** Implement keyword extraction function
- [ ] **28.** Build federal secretariat detection rules (SECRETARIA DE...)
- [ ] **29.** Build federal subsecretariat detection rules (SUBSECRETARIA DE...)
- [ ] **30.** Build autonomous institution detection rules (BANCO DE MEXICO, INE, etc.)
- [ ] **31.** Build decentralized institution detection rules (IMSS, ISSSTE, PEMEX, CFE)
- [ ] **32.** Build state government detection rules (GOBIERNO DEL ESTADO DE...)
- [ ] **33.** Build municipal government detection rules (MUNICIPIO DE..., H. AYUNTAMIENTO)
- [ ] **34.** Build educational institution detection rules (UNIVERSIDAD, INSTITUTO, COLEGIO)
- [ ] **35.** Build health institution detection rules (HOSPITAL, CLINICA, CENTRO DE SALUD)
- [ ] **36.** Build military institution detection rules (SEDENA, SEMAR, EJERCITO)
- [ ] **37.** Build judiciary detection rules (SUPREMA CORTE, TRIBUNAL)
- [ ] **38.** Build legislative detection rules (CAMARA DE DIPUTADOS, SENADO)
- [ ] **39.** Implement rule priority ordering
- [ ] **40.** Implement confidence scoring for rule matches
- [ ] **41.** Create fallback classification logic
- [ ] **42.** Implement batch classification function
- [ ] **43.** Add logging for classification decisions
- [ ] **44.** Create classification report generator
- [ ] **45.** Test rule-based classifier on sample data

## 2.4 ML Classifier Development (Steps 46-60)

- [ ] **46.** Create training data from rule-classified institutions
- [ ] **47.** Export training dataset to CSV
- [ ] **48.** Implement text preprocessing (lowercase, remove accents, tokenize)
- [ ] **49.** Implement TF-IDF vectorization
- [ ] **50.** Split data into train/test sets (80/20)
- [ ] **51.** Train Naive Bayes classifier
- [ ] **52.** Train Random Forest classifier
- [ ] **53.** Train SVM classifier
- [ ] **54.** Evaluate model accuracy metrics
- [ ] **55.** Evaluate model precision/recall by class
- [ ] **56.** Select best performing model
- [ ] **57.** Implement model persistence (pickle/joblib)
- [ ] **58.** Create prediction function for new institutions
- [ ] **59.** Implement confidence threshold for ML predictions
- [ ] **60.** Create hybrid classifier (rules + ML fallback)

## 2.5 Validation & Deployment (Steps 61-68)

- [ ] **61.** Run full classification on all 4,456 institutions
- [ ] **62.** Generate classification distribution report
- [ ] **63.** Identify misclassified institutions manually
- [ ] **64.** Create override table for manual corrections
- [ ] **65.** Apply manual corrections
- [ ] **66.** Update institutions table with classifications
- [ ] **67.** Validate sector alignment with institution types
- [ ] **68.** Document classification methodology

---

# Phase 3: Vendor Deduplication

**Objective:** Identify and consolidate 320,429 vendor records into canonical entities.

## 3.1 Research & Analysis (Steps 69-82)

- [ ] **69.** Analyze vendor name distribution
- [ ] **70.** Identify common naming patterns
- [ ] **71.** Analyze RFC coverage by data structure
- [ ] **72.** Identify vendors with multiple RFC entries
- [ ] **73.** Analyze legal suffix variations (S.A., SA, S.A. DE C.V., etc.)
- [ ] **74.** Identify common misspellings and typos
- [ ] **75.** Analyze address data availability
- [ ] **76.** Analyze legal representative data availability
- [ ] **77.** Research Mexican company naming conventions
- [ ] **78.** Study RFC format validation rules
- [ ] **79.** Identify government-owned vendors (PEMEX subsidiaries, etc.)
- [ ] **80.** Research known vendor groups and conglomerates
- [ ] **81.** Define deduplication strategy
- [ ] **82.** Document matching rules and thresholds

## 3.2 Database Schema Updates (Steps 83-95)

- [ ] **83.** Create vendor_groups table for canonical vendors
- [ ] **84.** Add group_id column to vendors table
- [ ] **85.** Create vendor_aliases table for name variations
- [ ] **86.** Create vendor_merges table for audit trail
- [ ] **87.** Add normalized_name column to vendors table
- [ ] **88.** Add normalized_rfc column to vendors table
- [ ] **89.** Add legal_suffix column to vendors table
- [ ] **90.** Add base_name column (without legal suffix)
- [ ] **91.** Add phonetic_code column for sound-alike matching
- [ ] **92.** Add is_canonical boolean column
- [ ] **93.** Add merge_confidence column
- [ ] **94.** Create indexes on normalized columns
- [ ] **95.** Create views for deduplicated vendor analysis

## 3.3 Name Normalization (Steps 96-115)

- [ ] **96.** Create backend/scripts/vendor_normalization.py
- [ ] **97.** Implement uppercase conversion
- [ ] **98.** Implement accent/diacritic removal
- [ ] **99.** Implement whitespace normalization
- [ ] **100.** Implement punctuation removal
- [ ] **101.** Build legal suffix dictionary (S.A., S.A. DE C.V., S.C., etc.)
- [ ] **102.** Implement legal suffix extraction
- [ ] **103.** Implement legal suffix removal for base name
- [ ] **104.** Implement number word standardization (UNO -> 1)
- [ ] **105.** Implement common abbreviation expansion
- [ ] **106.** Implement stopword removal (DE, DEL, LA, EL)
- [ ] **107.** Implement Soundex phonetic encoding
- [ ] **108.** Implement Metaphone phonetic encoding
- [ ] **109.** Run normalization on all vendor names
- [ ] **110.** Update normalized_name column in database
- [ ] **111.** Generate normalization statistics report
- [ ] **112.** Identify normalization edge cases
- [ ] **113.** Handle special characters (/, &, -)
- [ ] **114.** Handle parenthetical text
- [ ] **115.** Validate normalization results

## 3.4 Matching Algorithm Development (Steps 116-135)

- [ ] **116.** Create backend/scripts/vendor_matching.py
- [ ] **117.** Implement exact match on normalized_name
- [ ] **118.** Implement exact match on RFC
- [ ] **119.** Implement Levenshtein distance calculation
- [ ] **120.** Implement Jaro-Winkler similarity
- [ ] **121.** Implement token-based Jaccard similarity
- [ ] **122.** Implement n-gram similarity
- [ ] **123.** Implement phonetic matching
- [ ] **124.** Define similarity threshold for each method
- [ ] **125.** Implement weighted ensemble scoring
- [ ] **126.** Implement blocking strategy (first letter, RFC prefix)
- [ ] **127.** Build candidate pair generator
- [ ] **128.** Implement parallel processing for matching
- [ ] **129.** Add progress tracking for large datasets
- [ ] **130.** Implement match result storage
- [ ] **131.** Create match review interface
- [ ] **132.** Implement accept/reject match functionality
- [ ] **133.** Build connected component detection for groups
- [ ] **134.** Handle transitive matches (A=B, B=C -> A=B=C)
- [ ] **135.** Test matching on sample dataset

## 3.5 Clustering & Group Formation (Steps 136-145)

- [ ] **136.** Create backend/scripts/vendor_clustering.py
- [ ] **137.** Build match graph from pairwise similarities
- [ ] **138.** Implement connected components algorithm
- [ ] **139.** Implement community detection (Louvain)
- [ ] **140.** Select canonical vendor for each group
- [ ] **141.** Criteria: most contracts, most recent RFC, longest name
- [ ] **142.** Create vendor_groups records
- [ ] **143.** Assign group_id to all vendors
- [ ] **144.** Generate group statistics report
- [ ] **145.** Identify suspicious large groups for review

## 3.6 Validation & Deployment (Steps 146-152)

- [ ] **146.** Run full deduplication pipeline
- [ ] **147.** Generate deduplication report
- [ ] **148.** Manually validate top 100 vendor groups
- [ ] **149.** Calculate deduplication impact on concentration metrics
- [ ] **150.** Create rollback procedure
- [ ] **151.** Update contract queries to use canonical vendors
- [ ] **152.** Document deduplication methodology

---

# Phase 4: Risk Scoring

**Objective:** Implement 10-factor risk scoring model aligned with IMF CRI.

## 4.1 Research & Design (Steps 153-165)

- [ ] **153.** Review RISK_METHODOLOGY.md documentation
- [ ] **154.** Analyze data availability for each factor
- [ ] **155.** Identify factors with sufficient data
- [ ] **156.** Identify factors with limited/no data
- [ ] **157.** Define calculation formulas for each factor
- [ ] **158.** Define sector-specific baselines approach
- [ ] **159.** Define score normalization method
- [ ] **160.** Define weight calibration strategy
- [ ] **161.** Research known Mexican corruption cases
- [ ] **162.** Compile validation dataset of known issues
- [ ] **163.** Define false positive tolerance threshold
- [ ] **164.** Define risk level thresholds (low/medium/high/critical)
- [ ] **165.** Document risk scoring design decisions

## 4.2 Database Schema Updates (Steps 166-175)

- [ ] **166.** Add risk_score column to contracts table
- [ ] **167.** Add risk_level column to contracts table
- [ ] **168.** Add risk_factors JSON column for factor breakdown
- [ ] **169.** Create risk_calculations audit table
- [ ] **170.** Create sector_baselines table
- [ ] **171.** Add risk_score column to vendors table (aggregated)
- [ ] **172.** Add risk_score column to institutions table (aggregated)
- [ ] **173.** Create risk_thresholds configuration table
- [ ] **174.** Create indexes on risk columns
- [ ] **175.** Create views for risk analysis

## 4.3 Baseline Calculation (Steps 176-185)

- [ ] **176.** Create backend/scripts/calculate_baselines.py
- [ ] **177.** Calculate sector-level average contract values
- [ ] **178.** Calculate sector-level median contract values
- [ ] **179.** Calculate sector-level IQR for outlier detection
- [ ] **180.** Calculate sector-level direct award rates
- [ ] **181.** Calculate sector-level single bid rates
- [ ] **182.** Calculate year-level averages for trend adjustment
- [ ] **183.** Store baselines in sector_baselines table
- [ ] **184.** Create baseline refresh procedure
- [ ] **185.** Document baseline methodology

## 4.4 Factor Implementation (Steps 186-210)

### Factor 1: Single Bidding (15%)
- [ ] **186.** Verify is_single_bid flag calculation
- [ ] **187.** Create single_bid_risk function
- [ ] **188.** Test single bid risk calculation

### Factor 2: Non-Open Procedure (15%)
- [ ] **189.** Map procedure_type to risk scores
- [ ] **190.** Create procedure_risk function
- [ ] **191.** Test procedure risk calculation

### Factor 3: Price Anomaly (15%)
- [ ] **192.** Implement IQR-based outlier detection
- [ ] **193.** Create price_anomaly_risk function
- [ ] **194.** Test price anomaly calculation

### Factor 4: Vendor Concentration (10%)
- [ ] **195.** Calculate vendor market share by sector
- [ ] **196.** Create concentration_risk function
- [ ] **197.** Test concentration risk calculation

### Factor 5: Short Advertisement Period (10%)
- [ ] **198.** Analyze advertisement date availability
- [ ] **199.** Create short_ad_risk function (or placeholder)
- [ ] **200.** Document data limitation

### Factor 6: Short Decision Period (10%)
- [ ] **201.** Analyze decision timeline data availability
- [ ] **202.** Create short_decision_risk function (or placeholder)
- [ ] **203.** Document data limitation

### Factor 7: Year-End Timing (5%)
- [ ] **204.** Implement December detection
- [ ] **205.** Create yearend_risk function
- [ ] **206.** Test year-end risk calculation

### Factor 8: Contract Modification (10%)
- [ ] **207.** Analyze amendment data availability
- [ ] **208.** Create modification_risk function (placeholder)
- [ ] **209.** Document data limitation

### Factor 9: Threshold Splitting (5%)
- [ ] **210.** Implement threshold splitting detection pattern

### Factor 10: Network Risk (5%)
- [ ] **211.** Implement vendor group risk calculation
- [ ] **212.** Create network_risk function
- [ ] **213.** Test network risk calculation

## 4.5 Score Aggregation (Steps 214-220)

- [ ] **214.** Create backend/scripts/calculate_risk_scores.py
- [ ] **215.** Implement weighted score aggregation
- [ ] **216.** Implement score normalization (0-1 scale)
- [ ] **217.** Implement risk level assignment
- [ ] **218.** Run risk calculation on all contracts
- [ ] **219.** Calculate vendor-level aggregate scores
- [ ] **220.** Calculate institution-level aggregate scores

## 4.6 Validation & Calibration (Steps 221-228)

- [ ] **221.** Analyze risk score distribution
- [ ] **222.** Identify high-risk contracts for review
- [ ] **223.** Validate against known corruption cases
- [ ] **224.** Adjust weights based on validation
- [ ] **225.** Calculate false positive rate
- [ ] **226.** Generate risk model performance report
- [ ] **227.** Create risk recalculation procedure
- [ ] **228.** Document final risk methodology

---

# Phase 5: API Development

**Objective:** Build FastAPI backend to serve data to frontend and external consumers.

## 5.1 Project Setup (Steps 229-245)

- [ ] **229.** Create backend/api directory structure
- [ ] **230.** Initialize FastAPI application
- [ ] **231.** Create main.py entry point
- [ ] **232.** Create config.py for settings
- [ ] **233.** Create database.py for connection management
- [ ] **234.** Implement connection pooling
- [ ] **235.** Create models directory for Pydantic schemas
- [ ] **236.** Create routers directory for endpoint groups
- [ ] **237.** Create services directory for business logic
- [ ] **238.** Create utils directory for helpers
- [ ] **239.** Set up CORS middleware
- [ ] **240.** Set up request logging middleware
- [ ] **241.** Set up error handling middleware
- [ ] **242.** Create health check endpoint
- [ ] **243.** Create API version prefix structure
- [ ] **244.** Set up OpenAPI documentation
- [ ] **245.** Create requirements.txt for API dependencies

## 5.2 Core Data Models (Steps 246-265)

- [ ] **246.** Create ContractBase Pydantic model
- [ ] **247.** Create ContractResponse model
- [ ] **248.** Create ContractListResponse model
- [ ] **249.** Create VendorBase Pydantic model
- [ ] **250.** Create VendorResponse model
- [ ] **251.** Create VendorDetailResponse model
- [ ] **252.** Create InstitutionBase Pydantic model
- [ ] **253.** Create InstitutionResponse model
- [ ] **254.** Create SectorBase Pydantic model
- [ ] **255.** Create SectorResponse model
- [ ] **256.** Create SectorStatisticsResponse model
- [ ] **257.** Create RiskScoreResponse model
- [ ] **258.** Create PaginationMeta model
- [ ] **259.** Create ErrorResponse model
- [ ] **260.** Create FilterParams model
- [ ] **261.** Create SortParams model
- [ ] **262.** Create DateRangeParams model
- [ ] **263.** Create AmountRangeParams model
- [ ] **264.** Create SearchParams model
- [ ] **265.** Create ExportParams model

## 5.3 Contract Endpoints (Steps 266-280)

- [ ] **266.** Create routers/contracts.py
- [ ] **267.** Implement GET /contracts (paginated list)
- [ ] **268.** Implement pagination logic
- [ ] **269.** Implement filtering by sector_id
- [ ] **270.** Implement filtering by year
- [ ] **271.** Implement filtering by vendor_id
- [ ] **272.** Implement filtering by institution_id
- [ ] **273.** Implement filtering by risk_level
- [ ] **274.** Implement filtering by amount range
- [ ] **275.** Implement sorting by multiple fields
- [ ] **276.** Implement GET /contracts/{id}
- [ ] **277.** Implement GET /contracts/search
- [ ] **278.** Implement full-text search
- [ ] **279.** Implement GET /contracts/statistics
- [ ] **280.** Add response caching for statistics

## 5.4 Vendor Endpoints (Steps 281-295)

- [ ] **281.** Create routers/vendors.py
- [ ] **282.** Implement GET /vendors (paginated list)
- [ ] **283.** Implement filtering by sector
- [ ] **284.** Implement filtering by risk level
- [ ] **285.** Implement sorting by contract count, value, risk
- [ ] **286.** Implement GET /vendors/{id}
- [ ] **287.** Implement GET /vendors/{id}/contracts
- [ ] **288.** Implement GET /vendors/{id}/institutions
- [ ] **289.** Implement GET /vendors/{id}/risk-profile
- [ ] **290.** Implement GET /vendors/{id}/related (same group)
- [ ] **291.** Implement GET /vendors/search
- [ ] **292.** Implement GET /vendors/top-by-value
- [ ] **293.** Implement GET /vendors/top-by-risk
- [ ] **294.** Implement GET /vendors/concentration
- [ ] **295.** Add response caching for top vendors

## 5.5 Institution Endpoints (Steps 296-305)

- [ ] **296.** Create routers/institutions.py
- [ ] **297.** Implement GET /institutions (paginated list)
- [ ] **298.** Implement filtering by type, level, sector
- [ ] **299.** Implement GET /institutions/{id}
- [ ] **300.** Implement GET /institutions/{id}/contracts
- [ ] **301.** Implement GET /institutions/{id}/vendors
- [ ] **302.** Implement GET /institutions/{id}/risk-profile
- [ ] **303.** Implement GET /institutions/search
- [ ] **304.** Implement GET /institutions/top-by-spending
- [ ] **305.** Implement GET /institutions/hierarchy

## 5.6 Sector & Analysis Endpoints (Steps 306-318)

- [ ] **306.** Create routers/sectors.py
- [ ] **307.** Implement GET /sectors
- [ ] **308.** Implement GET /sectors/{id}
- [ ] **309.** Implement GET /sectors/{id}/statistics
- [ ] **310.** Implement GET /sectors/{id}/trends
- [ ] **311.** Create routers/analysis.py
- [ ] **312.** Implement GET /analysis/overview
- [ ] **313.** Implement GET /analysis/risk-distribution
- [ ] **314.** Implement GET /analysis/vendor-concentration
- [ ] **315.** Implement GET /analysis/single-bid-rate
- [ ] **316.** Implement GET /analysis/direct-award-rate
- [ ] **317.** Implement GET /analysis/year-over-year
- [ ] **318.** Implement GET /analysis/anomalies

## 5.7 Export Endpoints (Steps 319-325)

- [ ] **319.** Create routers/export.py
- [ ] **320.** Implement GET /export/contracts/csv
- [ ] **321.** Implement GET /export/contracts/excel
- [ ] **322.** Implement GET /export/vendors/csv
- [ ] **323.** Implement GET /export/report/pdf
- [ ] **324.** Implement streaming for large exports
- [ ] **325.** Add export size limits

## 5.8 Testing & Documentation (Steps 326-338)

- [ ] **326.** Create tests directory structure
- [ ] **327.** Create test fixtures
- [ ] **328.** Write tests for contract endpoints
- [ ] **329.** Write tests for vendor endpoints
- [ ] **330.** Write tests for institution endpoints
- [ ] **331.** Write tests for analysis endpoints
- [ ] **332.** Write tests for export endpoints
- [ ] **333.** Achieve 80% test coverage
- [ ] **334.** Complete OpenAPI documentation
- [ ] **335.** Add example responses to docs
- [ ] **336.** Create API usage guide
- [ ] **337.** Set up API rate limiting
- [ ] **338.** Create deployment configuration

---

# Phase 6: Frontend Dashboard

**Objective:** Build React dashboard for data exploration and investigation.

## 6.1 Project Setup (Steps 339-355)

- [ ] **339.** Initialize React application with Vite
- [ ] **340.** Configure TypeScript
- [ ] **341.** Install and configure TailwindCSS
- [ ] **342.** Install component library (shadcn/ui)
- [ ] **343.** Install TanStack Query for data fetching
- [ ] **344.** Install TanStack Table for data grids
- [ ] **345.** Install Recharts for visualizations
- [ ] **346.** Install React Router for navigation
- [ ] **347.** Install Zustand for state management
- [ ] **348.** Configure ESLint and Prettier
- [ ] **349.** Create directory structure (components, pages, hooks, etc.)
- [ ] **350.** Create API client module
- [ ] **351.** Create type definitions from API schemas
- [ ] **352.** Set up error boundary
- [ ] **353.** Create loading state components
- [ ] **354.** Create empty state components
- [ ] **355.** Configure environment variables

## 6.2 Layout & Navigation (Steps 356-365)

- [ ] **356.** Create main layout component
- [ ] **357.** Create sidebar navigation
- [ ] **358.** Create top header bar
- [ ] **359.** Create breadcrumb component
- [ ] **360.** Implement responsive mobile menu
- [ ] **361.** Create page transition animations
- [ ] **362.** Implement theme (light/dark) toggle
- [ ] **363.** Create footer component
- [ ] **364.** Implement route guards
- [ ] **365.** Create 404 page

## 6.3 Dashboard Overview Page (Steps 366-380)

- [ ] **366.** Create Dashboard page component
- [ ] **367.** Create KPI card component
- [ ] **368.** Implement total contracts KPI
- [ ] **369.** Implement total value KPI
- [ ] **370.** Implement high-risk contracts KPI
- [ ] **371.** Implement single bid rate KPI
- [ ] **372.** Create sector distribution chart
- [ ] **373.** Create risk distribution chart
- [ ] **374.** Create year-over-year trend chart
- [ ] **375.** Create top vendors table widget
- [ ] **376.** Create recent contracts widget
- [ ] **377.** Create risk alerts widget
- [ ] **378.** Implement dashboard data refresh
- [ ] **379.** Add loading skeletons
- [ ] **380.** Make dashboard responsive

## 6.4 Contract Explorer Page (Steps 381-395)

- [ ] **381.** Create Contracts page component
- [ ] **382.** Create contract filter sidebar
- [ ] **383.** Implement sector filter
- [ ] **384.** Implement year filter
- [ ] **385.** Implement risk level filter
- [ ] **386.** Implement amount range filter
- [ ] **387.** Implement search input
- [ ] **388.** Create contracts data table
- [ ] **389.** Implement column sorting
- [ ] **390.** Implement pagination
- [ ] **391.** Implement row selection
- [ ] **392.** Create contract detail drawer
- [ ] **393.** Implement export selected
- [ ] **394.** Add URL state sync for filters
- [ ] **395.** Create saved filter presets

## 6.5 Vendor Profile Page (Steps 396-408)

- [ ] **396.** Create Vendor page component
- [ ] **397.** Create vendor header with key stats
- [ ] **398.** Create vendor risk score gauge
- [ ] **399.** Create contract history timeline
- [ ] **400.** Create sector distribution chart
- [ ] **401.** Create institution relationships table
- [ ] **402.** Create related vendors section
- [ ] **403.** Create risk factor breakdown
- [ ] **404.** Create contract value trend chart
- [ ] **405.** Implement vendor comparison mode
- [ ] **406.** Create vendor report export
- [ ] **407.** Add vendor to watchlist functionality
- [ ] **408.** Create vendor search autocomplete

## 6.6 Institution Profile Page (Steps 409-418)

- [ ] **409.** Create Institution page component
- [ ] **410.** Create institution header with hierarchy
- [ ] **411.** Create spending summary charts
- [ ] **412.** Create vendor concentration analysis
- [ ] **413.** Create procurement patterns chart
- [ ] **414.** Create risk profile visualization
- [ ] **415.** Create top vendors table
- [ ] **416.** Create contract history with filters
- [ ] **417.** Create institution comparison mode
- [ ] **418.** Create institution report export

## 6.7 Visualization Components (Steps 419-428)

- [ ] **419.** Create risk heatmap component
- [ ] **420.** Create sector comparison radar chart
- [ ] **421.** Create network graph component
- [ ] **422.** Create Sankey flow diagram
- [ ] **423.** Create geographic map (if location data)
- [ ] **424.** Create calendar heatmap
- [ ] **425.** Create treemap for sector breakdown
- [ ] **426.** Create sparkline components
- [ ] **427.** Implement chart download as PNG
- [ ] **428.** Create chart tooltip components

## 6.8 Final Polish & Deployment (Steps 429-432)

- [ ] **429.** Implement accessibility (WCAG 2.1)
- [ ] **430.** Add keyboard navigation
- [ ] **431.** Optimize bundle size
- [ ] **432.** Create production build configuration

---

# Appendix: Step Dependencies

```
Phase 2 (Institution Classification)
├── Steps 1-15: Research (independent)
├── Steps 16-25: Schema (depends on 1-15)
├── Steps 26-45: Rule-based (depends on 16-25)
├── Steps 46-60: ML (depends on 26-45)
└── Steps 61-68: Validation (depends on 46-60)

Phase 3 (Vendor Deduplication)
├── Steps 69-82: Research (independent)
├── Steps 83-95: Schema (depends on 69-82)
├── Steps 96-115: Normalization (depends on 83-95)
├── Steps 116-135: Matching (depends on 96-115)
├── Steps 136-145: Clustering (depends on 116-135)
└── Steps 146-152: Validation (depends on 136-145)

Phase 4 (Risk Scoring)
├── Steps 153-165: Research (independent)
├── Steps 166-175: Schema (depends on 153-165)
├── Steps 176-185: Baselines (depends on 166-175)
├── Steps 186-213: Factors (depends on 176-185, Phase 3)
├── Steps 214-220: Aggregation (depends on 186-213)
└── Steps 221-228: Validation (depends on 214-220)

Phase 5 (API Development)
├── Steps 229-245: Setup (independent)
├── Steps 246-265: Models (depends on 229-245)
├── Steps 266-280: Contract endpoints (depends on 246-265)
├── Steps 281-295: Vendor endpoints (depends on 246-265)
├── Steps 296-305: Institution endpoints (depends on 246-265)
├── Steps 306-318: Analysis endpoints (depends on Phase 4)
├── Steps 319-325: Export endpoints (depends on 266-305)
└── Steps 326-338: Testing (depends on all endpoints)

Phase 6 (Frontend Dashboard)
├── Steps 339-355: Setup (independent)
├── Steps 356-365: Layout (depends on 339-355)
├── Steps 366-380: Dashboard (depends on 356-365, Phase 5)
├── Steps 381-395: Contracts (depends on 356-365, Phase 5)
├── Steps 396-408: Vendors (depends on 356-365, Phase 5)
├── Steps 409-418: Institutions (depends on 356-365, Phase 5)
├── Steps 419-428: Visualizations (depends on 366-418)
└── Steps 429-432: Polish (depends on all)
```

---

# Parallel Execution Opportunities

The following can be executed in parallel:

| Track A | Track B |
|---------|---------|
| Phase 2 (Institution Classification) | Phase 3 (Vendor Deduplication) |
| API Setup (Steps 229-265) | Risk Scoring (Phase 4) |
| Frontend Setup (Steps 339-365) | API Endpoints (Steps 266-325) |

---

# Milestone Checkpoints

| Milestone | Steps Completed | Key Deliverable |
|-----------|-----------------|-----------------|
| M1: Institution Taxonomy | 68 | Classified institutions |
| M2: Vendor Deduplication | 152 | Canonical vendor records |
| M3: Risk Scores | 228 | Contract risk scores |
| M4: API MVP | 305 | Core endpoints working |
| M5: API Complete | 338 | All endpoints + tests |
| M6: Frontend MVP | 395 | Dashboard + Contracts |
| M7: Frontend Complete | 432 | Full application |

---

*"The fleet that survives is not the strongest, but the one that adapts."* - RUBLI
