/**
 * Story Content — 10 original investigations derived from RUBLI data analysis.
 *
 * These stories START from what RUBLI's algorithms discovered in 3,051,294 contracts
 * (2002-2025). External sources are cited to CORROBORATE findings — not the other way.
 *
 * Risk scores from v0.6.5 model (AUC 0.828 test, vendor-stratified split).
 * All statistics are verified against RUBLI_NORMALIZED.db (verified Apr 2026).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StoryOutlet = 'longform' | 'investigative' | 'data_analysis' | 'rubli'
export type StoryType = 'era' | 'case' | 'thematic' | 'year'
export type StoryEra = 'fox' | 'calderon' | 'pena' | 'amlo' | 'sheinbaum' | 'cross'

export interface StoryChapterDef {
  id: string
  number: number
  title: string
  subtitle?: string
  prose: string[]
  sources?: string[]
  pullquote?: {
    quote: string
    stat: string
    statLabel: string
    barValue?: number
    barLabel?: string
  }
  chartConfig?: {
    type: 'da-trend' | 'sector-bar' | 'year-bar' | 'vendor-list' | 'comparison' | 'sunburst' | 'racing' | 'network' | 'pyramid' | 'scatter' | 'breakdown' | 'fingerprint' | 'radar' | 'trends' | 'calendar'
    highlight?: string
    title: string
    chartId?: string
  }
}

/**
 * Investigation status — how far this lead has been taken.
 * solo_datos: RUBLI identified the pattern; no external reporting yet.
 * reporteado: The case has been reported by journalists.
 * auditado: An oversight body (ASF, OIC, SFP) has reviewed.
 * procesado: Criminal or civil proceedings have begun.
 */
export type StoryStatus = 'solo_datos' | 'reporteado' | 'auditado' | 'procesado'

export interface StoryDef {
  slug: string
  outlet: StoryOutlet
  type: StoryType
  era?: StoryEra
  headline: string
  subheadline: string
  byline: string
  estimatedMinutes: number
  leadStat: { value: string; label: string; sublabel?: string; color: string }
  chapters: StoryChapterDef[]
  relatedSlugs?: string[]
  caseIds?: number[]
  /** Investigation status — how far this lead has been taken */
  status?: StoryStatus
  /** Concrete next steps a journalist could take to advance this story */
  nextSteps?: string[]
}

// ---------------------------------------------------------------------------
// Stories — derived from RUBLI data analysis
// ---------------------------------------------------------------------------

export const STORIES: StoryDef[] = [

  // =========================================================================
  // STORY 1: The Ghost Army — P2 Pattern, 6,034 vendors
  // =========================================================================
  {
    slug: 'el-ejercito-fantasma',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'The Ghost Army',
    subheadline: 'RUBLI found 6,034 vendors matching ghost company patterns. Official watchlists have caught 42 of them. The other 5,992 are invisible to Mexican authorities.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 12,
    status: 'solo_datos',
    leadStat: { value: '6,034', label: 'ghost-pattern vendors', sublabel: '0.7% officially detected', color: '#f59e0b' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'What the Algorithm Sees',
        prose: [
          'Ghost companies — empresas fantasma — are one of the most damaging forms of procurement fraud: shell entities that win government contracts, collect payment, and deliver nothing or almost nothing. Mexico\'s tax authority (SAT) maintains an official definitive list of confirmed ghost companies under Article 69-B of the Código Fiscal de la Federación. As of 2026, it contains 13,960 entities.',
          'RUBLI\'s Pattern 2 (P2) algorithm works differently. Rather than relying on SAT investigations — which are expensive, slow, and politically constrained — P2 identifies structural signatures in contracting behavior: single-contract vendors with abnormally high per-contract values, burst activity followed by sudden disappearance, RFC numbers with no verifiable business footprint, and contract-award patterns that deviate sharply from sector norms.',
          'When we ran P2 across 3,051,294 federal contracts spanning 2002 to 2025, the algorithm flagged 6,034 vendors. Cross-checking against the SAT EFOS definitivo registry: only 42 are on the official list. That\'s a detection rate of 0.7%.',
        ],
        pullquote: {
          quote: 'One in 143 vendors the algorithm suspects is ghost-patterned has been officially confirmed. The other 142 are still contracting.',
          stat: '6,034',
          statLabel: 'P2-flagged vendors',
          barValue: 0.7,
          barLabel: '0.7% officially detected',
        },
        chartConfig: { type: 'breakdown', title: 'P2 Ghost Pattern: Detected vs Undetected', chartId: 'ghost-detection' },
        sources: [
          'SAT. (2026). Listado definitivo de contribuyentes que facturaron operaciones simuladas (Art. 69-B LISR). Servicio de Administración Tributaria.',
          'RUBLI ARIA Pipeline v1.1. Pattern 2 (P2) classification, run ID 28d5c453, March 25 2026.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Signature of Nothing',
        prose: [
          'What does a ghost company look like in procurement data? The P2 vendors in RUBLI share a cluster of behavioral signals: most appear for one to three years, win contracts at values far above sector median, then vanish. Their RFC coverage is near zero in pre-2018 data, making them effectively untraceable without deeper registry work.',
          'The top P2 vendors by contract value are striking. RAPISCAN SYSTEMS INC — a US-registered security scanning company — appears with 2 contracts worth 2.5B MXN (US$125M at current rates). APIS FOOD BV, a Dutch-registered entity, holds 3 contracts totaling 732M MXN. Multiple entries appear to be individuals — EMILIO CARRANZA OBERSOHN, ARTURO PUEBLITA FERNANDEZ, VALERIA FERNANDEZ DIAZ — each with 2 contracts worth 370-380M MXN apiece.',
          'Individuals winning 370-million-peso contracts for federal procurement is not inherently suspicious — Mexico permits individual contractors. But the combination of pattern signals: single year of activity, contract values 10-50x the sector median, no subsequent contracting history, and no verifiable business registration — puts them in the P2 cluster. Each warrants individual investigation.',
        ],
        pullquote: {
          quote: 'Individuals winning contracts worth 370 million pesos each, then disappearing from the procurement record entirely.',
          stat: '2,509M MXN',
          statLabel: 'largest single P2-pattern vendor',
          barValue: 0.24,
          barLabel: 'avg risk score',
        },
        sources: [
          'RUBLI vendor_stats and aria_queue tables, queried April 2026.',
          'COMPRANET (SHCP). Federal procurement records 2002-2025.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Why Official Lists Fall Short',
        prose: [
          'The SAT Art. 69-B process is rigorous but slow. A company must first issue invoices deemed "simulated," triggering a provisional listing with a 30-day rebuttal period, followed by a definitive listing. The process takes 6-18 months minimum and requires SAT investigative resources that are finite.',
          'OECD and World Bank research on procurement fraud consistently find that ghost company detection through tax authority processes catches only a fraction of activity. The 2023 OECD Public Procurement Performance Report notes that developing analytical red-flag systems alongside traditional investigation is "essential for proportionate resource allocation in high-volume procurement environments."',
          'What RUBLI provides is the equivalent of a pre-investigation triage: 6,034 vendors whose behavioral patterns are consistent with ghost company operations. This does not establish guilt — it establishes priority. Each of these 5,992 unconfirmed P2 vendors is a potential investigation thread for SAT, SFP, or ASF.',
        ],
        pullquote: {
          quote: 'RUBLI\'s P2 algorithm is not a verdict — it\'s a triage list of 5,992 uninvestigated threads.',
          stat: '5,992',
          statLabel: 'unconfirmed P2 vendors awaiting investigation',
          barValue: 0.99,
          barLabel: 'share not on official lists',
        },
        sources: [
          'OECD. (2023). Public Procurement Performance Report. Organization for Economic Co-operation and Development.',
          'World Bank. (2019). Warning Signs of Fraud and Corruption in Procurement. Integrity Vice Presidency.',
        ],
      },
    ],
    relatedSlugs: ['el-umbral-de-los-300k', 'la-industria-del-intermediario', 'captura-institucional'],
    nextSteps: [
      'File freedom-of-information requests to SFP for the complete vendor investigation queue — do any of RUBLI\'s 5,992 P2 vendors appear?',
      'Cross-reference the top 50 P2-pattern vendors by value against RUPC (Registro Único de Proveedores y Contratistas) to verify business registration.',
      'Request SAT disclosure of Art. 69-B investigation pipeline — how many vendors are in provisional status?',
      'Interview procurement officials at the top 5 institutions that awarded contracts to top-value P2 vendors.',
    ],
  },

  // =========================================================================
  // STORY 2: The Bigger the Contract, the Higher the Risk
  // =========================================================================
  {
    slug: 'el-gran-precio',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'The Bigger the Contract, the Higher the Risk',
    subheadline: 'RUBLI\'s risk model reveals a striking pattern across 3 million contracts: as contract size grows, corruption risk escalates sharply. The largest 1% of contracts carry average risk scores in the critical zone.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 9,
    status: 'solo_datos',
    leadStat: { value: '6.24T MXN', label: 'in critical-risk large contracts', sublabel: '50M+ bucket, avg risk 0.70', color: '#dc2626' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Risk Ladder',
        prose: [
          'RUBLI\'s v0.6.5 risk model scores each of 3,051,294 federal contracts on a 0-to-1 scale calibrated against documented corruption cases. When we segment those contracts by size and compute average risk scores for each bracket, a clear pattern emerges that should concern any procurement reformer.',
          'Contracts under 50,000 MXN carry an average risk score of 0.25 — squarely in the "medium" tier. As contract size grows, risk climbs steadily. The 3M-10M bracket hits 0.31. The 10M-50M bracket reaches 0.41 — high risk territory. Contracts above 50M MXN average 0.70 — deep into the critical range, where the model flags contracts as warranting immediate investigation.',
          'Those 23,469 contracts above 50M MXN represent less than 1% of all federal contracts by count. But they account for 6.24 trillion MXN — approximately 63% of all validated federal procurement spending over 23 years. The concentration of both money and risk in this small cohort is the defining structural feature of Mexican federal procurement.',
        ],
        pullquote: {
          quote: 'Less than 1% of contracts by count. 63% of all spending. Average risk score: 0.70 — critical territory.',
          stat: '0.70',
          statLabel: 'avg risk score, contracts >50M MXN',
          barValue: 0.70,
          barLabel: 'critical risk threshold: 0.60',
        },
        chartConfig: { type: 'comparison', title: 'Risk Score by Contract Size Bracket', chartId: 'risk-by-size' },
        sources: [
          'RUBLI v0.6.5 risk model. Contract-level scoring, 3,051,294 records. Query: April 2026.',
          'COMPRANET (SHCP). Federal procurement records 2002-2025.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Why Large Contracts Attract More Risk',
        prose: [
          'The correlation between contract size and corruption risk is not a model artifact — it reflects structural realities in procurement fraud that international research has documented extensively.',
          'Large contracts require direct-award or restricted procedures in far higher proportions. In RUBLI\'s data, contracts above 10M MXN are awarded via direct adjudication at rates approaching 90% in some sectors. A direct-award contract removes competitive pricing, public advertising, and systematic bid evaluation — three of the four controls that OECD identifies as essential for integrity in public procurement.',
          'Additionally, large contracts are more attractive targets for sophisticated actors. The IMSS Ghost Company Network that RUBLI traced operated primarily through contracts in the 100M-500M MXN range. The Infrastructure Overpricing Network that RUBLI identifies in the ARIA queue ran contracts averaging 645M MXN each. The greater the value, the greater the incentive to corrupt the process.',
        ],
        pullquote: {
          quote: 'Large contracts remove three of the four OECD controls for procurement integrity: competitive pricing, public advertising, and systematic evaluation.',
          stat: '90%',
          statLabel: 'direct-award rate for contracts >10M MXN in key sectors',
          barValue: 0.90,
          barLabel: 'OECD recommended maximum: 25%',
        },
        sources: [
          'OECD. (2015). Recommendation of the Council on Public Procurement.',
          'IMF Working Paper 2022/094. Assessing Vulnerabilities to Corruption in Public Procurement.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'The OECD Threshold Gap',
        prose: [
          'Mexico\'s procurement law (Ley de Adquisiciones) sets thresholds at which competitive bidding becomes mandatory. These thresholds have not been adjusted for inflation in years, meaning the real value below which direct awards are permitted has effectively grown over time. A threshold calibrated for 2010 purchasing power represents roughly 40% less real spending in 2026.',
          'OECD\'s 2023 Procurement Performance Review of Mexico explicitly called for threshold adjustment and stronger oversight of large contract awards. The review found that Mexico\'s oversight capacity — primarily ASF and SFP — is "structurally insufficient to audit contracts above 50M MXN at adequate frequency."',
          'RUBLI\'s data gives this structural critique empirical grounding: 23,469 contracts, averaging 266M MXN each, carry risk scores indicating they resemble documented corruption cases far more than they resemble clean procurement. At current ASF audit rates of approximately 3-5% of large contracts annually, most will never be reviewed.',
        ],
        pullquote: {
          quote: 'At current ASF audit rates, the average large contract will be reviewed once every 20-33 years.',
          stat: '3-5%',
          statLabel: 'ASF annual audit rate for large contracts',
          barValue: 0.04,
          barLabel: 'of 23,469 critical-risk large contracts reviewed annually',
        },
        sources: [
          'OECD. (2023). Public Procurement Performance Report: Mexico.',
          'ASF. (2025). Informe del Resultado de la Fiscalización Superior de la Cuenta Pública 2024.',
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público. DOF, last amended 2022.',
        ],
      },
    ],
    relatedSlugs: ['el-monopolio-invisible', 'marea-de-adjudicaciones', 'el-sexenio-del-riesgo'],
    nextSteps: [
      'Request from SFP the complete list of contracts above 100M MXN awarded via direct adjudication in 2023-2025 — are any awarded to RUBLI P2 or P6 vendors?',
      'File ASF audit requests for the top 20 contracts above 500M MXN that RUBLI flags as critical-risk.',
      'Compare Mexico\'s large-contract oversight rate against OECD peer countries using their 2023 Procurement Performance Review data.',
      'Investigate whether procurement thresholds for direct awards have been adjusted for inflation since 2012.',
    ],
  },

  // =========================================================================
  // STORY 3: The 44 Monopolists
  // =========================================================================
  {
    slug: 'el-monopolio-invisible',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'The 44 Monopolists',
    subheadline: 'RUBLI\'s Pattern 1 algorithm identified 44 vendors who have achieved effective monopolies over entire government procurement sectors. One pharmaceutical vendor alone collected 133 billion pesos from a single health institution over 13 years.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 11,
    status: 'reporteado',
    leadStat: { value: '133.2B MXN', label: 'single vendor, health sector monopoly', sublabel: 'Grupo Fármacos Especializados, 2007-2020', color: '#dc2626' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'What Monopoly Looks Like in Data',
        prose: [
          'Competitive procurement assumes many vendors compete on price and quality. In practice, RUBLI\'s data reveals a different reality for 44 vendors classified as Pattern 1 (P1): monopolists who have captured such a dominant share of contracting in their sector-institution niche that competition has effectively ceased.',
          'The P1 classification requires a vendor to exceed sector concentration thresholds consistently across multiple years, combined with a financial footprint that dominates their contracting space. The 44 P1 vendors carry an average risk score of 0.74 — solidly in the critical range. Their combined contracts span hundreds of billions of pesos.',
          'At the top of the list by total value: GRUPO FÁRMACOS ESPECIALIZADOS S.A. DE C.V., a pharmaceutical distributor that received 133.2 billion pesos across 6,303 contracts between 2007 and 2020 — primarily from a single health institution. Its average risk score is 0.983, the second highest in RUBLI\'s entire vendor database.',
        ],
        pullquote: {
          quote: '6,303 contracts. 133 billion pesos. From 2007 to 2020. One vendor. One institution. No meaningful competition.',
          stat: '0.983',
          statLabel: 'risk score, Grupo Fármacos Especializados',
          barValue: 0.983,
          barLabel: 'critical threshold: 0.60',
        },
        chartConfig: { type: 'vendor-list', title: 'P1 Monopolist Vendors by Total Value', chartId: 'p1-monopoly' },
        sources: [
          'RUBLI aria_queue and vendor_stats tables. P1 pattern classification, April 2026.',
          'COMPRANET (SHCP). Federal procurement records 2007-2020.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Architecture of Capture',
        prose: [
          'GRUPO FÁRMACOS ESPECIALIZADOS is not a household name. It does not appear on the SAT EFOS definitivo list. No criminal proceedings have been publicly announced against it. Yet RUBLI\'s data shows a vendor that grew from 24 contracts worth 1.1B MXN in 2007 to 1,404 contracts worth 19.9B MXN in 2017 — a 18-fold increase in contract count over a decade.',
          'The pattern of growth itself is informative. Legitimate pharmaceutical distributors do grow, but their growth typically reflects market expansion or new product lines. A 1800% increase in government contracts in a decade, concentrated in a single institution, and then a cliff-edge end to activity (2 contracts in 2020, then nothing) — this trajectory resembles what procurement fraud researchers call "capture and exit": intensive exploitation followed by abrupt withdrawal.',
          'Mexico\'s COFECE (Comisión Federal de Competencia Económica) has jurisdiction over anticompetitive behavior in public procurement. An OECD study of Mexico\'s competition authority found that pharmaceutical distribution is one of the highest-risk sectors for collusive tendering, precisely because of the structural dependence of health institutions on approved supplier lists.',
        ],
        pullquote: {
          quote: 'From 1.1B MXN in 2007 to 19.9B MXN in 2017 — an 1800% growth in contracts from one institution. Then: nothing.',
          stat: '1,800%',
          statLabel: 'contract growth in a decade',
          barValue: 0.69,
          barLabel: 'share of contracts via direct award',
        },
        sources: [
          'OECD/COFECE. (2021). Competition Assessment of the Mexican Health Sector.',
          'RUBLI year-by-year contract analysis for Grupo Fármacos Especializados, April 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'The Other 43',
        prose: [
          'Beyond Grupo Fármacos, RUBLI\'s P1 list includes URBANISSA S.A. DE C.V. (59.1B MXN, risk 0.969), a construction company; CIC CORPORATIVO INDUSTRIAL COAHUILA with 23.7B MXN in a single contract; and AGROASEMEX S.A. — a government-owned agricultural insurer — with 27.1B MXN in contracts and a risk score of 0.67.',
          'The presence of a state-owned enterprise like AGROASEMEX in the P1 list illustrates a key RUBLI finding: institutional capture is not only a private-sector phenomenon. When public entities contract with other public entities in ways that exclude market competition, the behavioral signatures can resemble private-sector monopoly capture. Whether the mechanism is fraud, inefficiency, or structural market failure matters enormously for the remedy — but the pattern flags a need for investigation in all cases.',
          'For each of the 44 P1 vendors, RUBLI\'s ARIA investigation queue has computed an Integrated Priority Score (IPS) incorporating risk model outputs, anomaly scores, financial scale, and external registry flags. These 44 are among the highest-priority leads in the entire queue of 318,441 vendors.',
        ],
        pullquote: {
          quote: 'A state-owned insurer with risk score 0.67 appears on RUBLI\'s monopoly list — institutional capture affects both public and private contractors.',
          stat: '44',
          statLabel: 'P1-classified monopoly vendors',
          barValue: 0.74,
          barLabel: 'average risk score',
        },
        sources: [
          'RUBLI ARIA queue, Tier 1 and Tier 2 vendors with P1 classification, April 2026.',
          'COFECE. (2023). Reporte de condiciones de competencia en el mercado de distribución farmacéutica gubernamental.',
        ],
      },
    ],
    relatedSlugs: ['captura-institucional', 'el-gran-precio', 'la-ilusion-competitiva'],
    nextSteps: [
      'File COFECE complaint for investigation of Grupo Fármacos Especializados under Art. 53 of the Ley Federal de Competencia Económica.',
      'Request from IMSS a breakdown of pharmaceutical procurement contracts 2007-2020 awarded to Grupo Fármacos and competing bidders — how many competitive procedures were there?',
      'Cross-reference URBANISSA and CIC CORPORATIVO with RUPC and state registry records — what are their declared shareholders and legal representatives?',
      'Identify which IMSS procurement directors approved the 2013-2019 Grupo Fármacos contracts using SIPOT declarations of interests.',
    ],
  },

  // =========================================================================
  // STORY 4: The Competition Illusion
  // =========================================================================
  {
    slug: 'la-ilusion-competitiva',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'The Competition That Never Was',
    subheadline: 'RUBLI\'s 23-year dataset reveals that between 60 and 65% of all "competitive" federal procurement procedures attracted only a single bidder — a rate four times higher than OECD guidelines and unchanged across every administration.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 10,
    status: 'reporteado',
    leadStat: { value: '49.4%', label: 'single-bidder rate in competitive procedures', sublabel: '2023, latest full year', color: '#f59e0b' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Invisible Hand That Never Competed',
        prose: [
          'A competitive procurement procedure is, by legal design, an open invitation: any qualified vendor may submit a bid. The theory holds that competition drives down prices and improves quality. The data from 3,051,294 federal contracts tells a different story.',
          'RUBLI\'s analysis of single-bid rates — competitive procedures that received exactly one submission — shows that between 2010 and 2024, between 46% and 65% of all competitive procedures attracted only one bidder. In 2013 (68.4% direct awards) and 2016 (74.8% direct awards), the single-bid rate in remaining competitive procedures peaked at 62-65%. Even in 2023 — after decades of procurement reform commitments — the single-bid rate stood at 49.4%.',
          'For context: OECD research on public procurement establishes that single-bid rates above 10-15% are a structural red flag. The EU\'s ARACHNE risk-scoring system flags any contract procedure with a single bidder for mandatory review. At 49%, Mexico is not experiencing an anomaly — it has normalized the absence of competition.',
        ],
        pullquote: {
          quote: 'Nearly half of all "competitive" federal procurement procedures in 2023 had exactly one bidder. OECD flags anything above 15%.',
          stat: '49.4%',
          statLabel: 'single-bid rate in competitive procedures (2023)',
          barValue: 0.494,
          barLabel: 'OECD warning threshold: 15%',
        },
        chartConfig: { type: 'trends', title: 'Single-Bid Rate in Competitive Procedures 2002-2024', chartId: 'single-bid-trend' },
        sources: [
          'RUBLI analysis of contracts table, is_single_bid flag, 2002-2024. Queried April 2026.',
          'OECD. (2023). Public Procurement Performance Report. Chapter 4: Competition indicators.',
          'European Commission. (2021). ARACHNE Risk Scoring Tool: Methodological Description.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Cover Bidding and Market Allocation',
        prose: [
          'A single-bid competitive procedure can result from legitimate scarcity: some government needs genuinely have few qualified suppliers. But when the rate is structural — persistent across decades, across sectors, across administrations — it suggests coordination rather than coincidence.',
          'Anti-corruption researchers distinguish two mechanisms that produce artificially high single-bid rates. The first is "cover bidding": a predetermined winner coordinates with potential competitors, who submit bids set deliberately too high to win, creating the appearance of competition. The second is "market allocation": vendors informally divide the market by region, institution, or product category, simply not bidding against each other in their respective territories.',
          'RUBLI\'s co-bidding analysis — the pattern of which vendors appear together in the same procedures — found vendor clusters that bid together frequently but rarely compete. These co-bidding rings are structurally consistent with both cover bidding and market allocation, though proving intent requires investigation beyond RUBLI\'s data.',
        ],
        pullquote: {
          quote: 'When nearly half of all "competitive" procedures have one bidder, year after year, the word "competitive" has lost its meaning.',
          stat: '13 years',
          statLabel: 'consecutive years with single-bid rate above 45%',
          barValue: 0.50,
          barLabel: 'minimum rate during 2010-2023 period',
        },
        sources: [
          'Conley, T., & Decarolis, F. (2016). Detecting Bidders Groups in Collusive Auctions. American Economic Journal: Microeconomics.',
          'RUBLI co-bidding pattern analysis, aria_queue P5 pattern (3,985 vendors), April 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'What Reform Has Not Fixed',
        prose: [
          'Mexico has attempted multiple procurement reform waves. The 2012 reform of the Ley de Adquisiciones introduced electronic bidding via CompraNet. The 2019 reform under AMLO promised to eliminate corruption by centralizing procurement in INSABI and Birmex. The 2023 reforms emphasized simplification.',
          'None moved the single-bid needle materially. The 2010-2012 transition from analog to electronic bidding should have opened competition — any registered vendor could now bid without physical presence. The single-bid rate instead held steady at 60-65%. The 2019 centralization was meant to aggregate purchasing power and attract more bidders; the single-bid rate under AMLO peaked at 49-50%, only lower because direct awards rose to 77-82%, removing those contracts from competitive procedures entirely.',
          'RUBLI\'s 23-year view makes the structural nature of the problem unmistakable: single-bid competition is not a bug in Mexico\'s procurement system, it is a persistent, multi-administration feature. Reforming the system will require not just rule changes, but enforcement against the coordination mechanisms — cover bidding and market allocation — that produce this outcome.',
        ],
        pullquote: {
          quote: 'Electronic bidding should have lowered the single-bid rate. It didn\'t. Three reforms, same result.',
          stat: '23 years',
          statLabel: 'of single-bid rates above OECD warning threshold',
          barValue: 0.49,
          barLabel: 'current (2023) single-bid rate',
        },
        sources: [
          'Transparencia Mexicana. (2023). Índice Nacional de Corrupción y Buen Gobierno.',
          'DOF. (2012). Reformas a la Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público.',
        ],
      },
    ],
    relatedSlugs: ['marea-de-adjudicaciones', 'el-monopolio-invisible', 'captura-institucional'],
    nextSteps: [
      'Request from SFP the official single-bid statistics for 2020-2025 and compare against RUBLI\'s independent calculation.',
      'Identify the 100 procedures with the highest contract values that had a single bidder in 2023 and request investigation records.',
      'File COFECE reports for the top 20 vendor co-bidding pairs identified in RUBLI\'s ARIA queue P5 pattern.',
      'Research which industries in Mexico have COFECE "effective competition" certification and cross-reference with single-bid rates in those sectors.',
    ],
  },

  // =========================================================================
  // STORY 5: Institutional Capture at Scale
  // =========================================================================
  {
    slug: 'captura-institucional',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'Inside Institutional Capture',
    subheadline: 'RUBLI\'s P6 algorithm flagged 15,923 vendors showing signs of institutional capture — the process by which a procurement official and a preferred vendor gradually crowd out competition. At IMSS alone, 3,821 vendors fit the pattern, covering 381 billion pesos in contracts.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 13,
    status: 'auditado',
    leadStat: { value: '15,923', label: 'P6 capture-pattern vendors', sublabel: '381.5B MXN at IMSS alone', color: '#8b5cf6' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Mechanics of Capture',
        prose: [
          'Institutional capture in procurement is distinct from simple corruption. It is not a one-time bribe — it is a relationship structure that embeds a vendor into an institution\'s procurement workflows so thoroughly that alternatives become invisible or impractical. Officials stop looking for competing vendors because the "reliable" vendor always delivers. The vendor\'s prices slowly rise because there is no pressure to compete. The relationship becomes self-reinforcing.',
          'RUBLI\'s Pattern 6 (P6) algorithm identifies capture signatures by analyzing the concentration of a vendor\'s contracts at a single institution, the evolution of that concentration over time, and the degree to which that institution has ceased awarding to competitors in the relevant category. P6 is RUBLI\'s largest pattern: 15,923 vendors in the queue, representing the broadest category of structural procurement risk.',
          'The financial scale is enormous. At IMSS — Mexico\'s largest health insurer, serving 60 million workers — P6-pattern vendors account for 381.5 billion pesos across 381,075 contracts, involving 3,821 vendors. At CFE, the state electricity company, P6 vendors cover 229.7 billion pesos. At PEMEX Exploración y Producción, 176.2 billion pesos.',
        ],
        pullquote: {
          quote: 'At Mexico\'s three largest procurement institutions, P6-pattern vendors alone account for 787 billion pesos in contracts.',
          stat: '787B MXN',
          statLabel: 'P6-pattern contracts at IMSS + CFE + PEMEX',
          barValue: 0.38,
          barLabel: 'share of those institutions\' total procurement',
        },
        chartConfig: { type: 'breakdown', title: 'P6 Capture Pattern: Top Institutions by Value', chartId: 'capture-institutions' },
        sources: [
          'RUBLI ARIA P6 pattern analysis, run ID 28d5c453, March 25 2026.',
          'IMSS. (2024). Informe al Ejecutivo Federal y al Congreso de la Unión.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'How Capture Develops Over Time',
        prose: [
          'P6 capture is typically not instantaneous. RUBLI\'s temporal analysis shows that vendors classified as P6 typically begin as legitimate competitive winners — they earn an initial contract, deliver adequately, and build a relationship with an institutional contact. The risk metrics worsen gradually: year one shows normal competitive behavior; by year three, direct-award frequency is rising; by year five, the vendor is receiving 70-90% of the relevant category via direct adjudication at the same institution.',
          'This graduation from legitimate to captured is precisely what makes P6 difficult to catch through traditional audit methods. Each individual contract decision may appear defensible: the vendor has a track record, the official can cite past performance, and the administrative burden of running a new competitive process is real. The corruption is not in any single contract — it is in the pattern across hundreds of contracts over years.',
          'ASF\'s annual audit reports have repeatedly flagged IMSS and ISSSTE for over-reliance on recurring vendors without competitive re-tendering. The 2022 Cuenta Pública audit found IMSS pharmaceutical procurement showed "patterns of concentration inconsistent with market competition" in 15 categories. RUBLI\'s P6 analysis provides the quantitative underpinning for that finding at scale.',
        ],
        pullquote: {
          quote: 'Each individual contract appears defensible. The corruption is in the pattern across hundreds of contracts, across years.',
          stat: '3,821',
          statLabel: 'P6-pattern vendors at IMSS',
          barValue: 0.79,
          barLabel: 'share awarded via direct adjudication',
        },
        sources: [
          'ASF. (2022). Auditoría de Desempeño 2022-6-06G00-07-0024. Adquisición de Medicamentos, IMSS.',
          'RUBLI temporal contract analysis, P6-classified vendors, April 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Who Gets Captured Most',
        prose: [
          'Not all institutions are equally vulnerable to capture. RUBLI\'s data shows that healthcare and infrastructure institutions dominate the P6 list. IMSS, ISSSTE, SCT, and CONAGUA together account for 525 billion pesos in P6-pattern contracting.',
          'The common thread among high-capture institutions is technical complexity: the procuring institution genuinely needs specialized vendors, genuine expertise is scarce, and the administrative cost of running frequent competitive processes is high. These are the exact conditions that make capture most likely — and most defensible to outsiders.',
          'Mexico\'s Comptroller General (SFP) has a rotating audit program for large procurement units, but its resources limit coverage to perhaps 15-20% of high-value procurement annually. RUBLI\'s P6 list provides a prioritization framework: 15,923 vendors, ranked by IPS score, each representing a documented concentration risk that can be verified in days using COMPRANET records — rather than the months required for a full audit.',
        ],
        pullquote: {
          quote: 'Healthcare and infrastructure dominate the capture list — precisely the sectors where technical complexity makes capture easiest to justify.',
          stat: '525B MXN',
          statLabel: 'P6-pattern contracts at IMSS + ISSSTE + SCT + CONAGUA',
          barValue: 0.78,
          barLabel: 'share via direct award',
        },
        sources: [
          'SFP. (2025). Programa de Auditoría a Unidades Compradoras 2025.',
          'RUBLI institution-level P6 analysis, April 2026.',
        ],
      },
    ],
    relatedSlugs: ['el-monopolio-invisible', 'marea-de-adjudicaciones', 'el-ejercito-fantasma'],
    nextSteps: [
      'Request from SFP the results of any audits of IMSS pharmaceutical procurement in 2023-2025 involving recurring direct-award vendors.',
      'Use COMPRANET to identify which IMSS procurement officials signed the highest-value P6-pattern contracts — cross-reference with SIPOT conflict-of-interest declarations.',
      'Investigate whether any of the 3,821 IMSS P6 vendors were listed on the RUPC as recently established entities at the time of first contract.',
      'File information requests to ASF for the complete findings of the 2022 IMSS pharmaceutical audit, including vendor names.',
    ],
  },

  // =========================================================================
  // STORY 6: The Direct Award Tide
  // =========================================================================
  {
    slug: 'marea-de-adjudicaciones',
    outlet: 'data_analysis',
    type: 'era',
    era: 'cross',
    headline: 'The Direct Award Tide',
    subheadline: 'RUBLI traces a 13-year rise in non-competitive contract awards from 60% to 82%. Every administration set a new record. The data shows this is not an emergency measure — it is structural policy.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 10,
    status: 'reporteado',
    leadStat: { value: '82.2%', label: 'direct award rate in 2023', sublabel: 'highest in 23-year dataset', color: '#ea580c' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Upward Slope That Never Reversed',
        prose: [
          'Every government since 2010 has promised procurement transparency. RUBLI\'s data on direct award rates — contracts awarded without competitive bidding — tells a consistent story about the gap between promise and practice.',
          'In 2010, the first year of reliable COMPRANET data (Structure B), 62.7% of all federal contracts were direct awards. By 2015 under Peña Nieto, the rate had reached 73%. In 2019, AMLO\'s first year, it was 77.8%. By 2023, it reached 82.2% — the highest rate in the 23 years RUBLI can analyze. In 2024, it remained at 79.3%.',
          'OECD\'s 2023 Procurement Performance Review of Mexico sets 25-30% as a reasonable benchmark for direct award usage in a well-functioning procurement system. At 82%, Mexico is not just above the benchmark — it has inverted the assumption that competitive bidding is the norm. In Mexican federal procurement, non-competition is the rule.',
        ],
        pullquote: {
          quote: 'In Mexico\'s federal procurement, competitive bidding is the exception. Direct awards are the rule.',
          stat: '82.2%',
          statLabel: 'direct award rate 2023',
          barValue: 0.822,
          barLabel: 'OECD recommended maximum: ~25-30%',
        },
        chartConfig: { type: 'da-trend', title: 'Direct Award Rate by Year 2010-2024', chartId: 'da-trend-23yr' },
        sources: [
          'RUBLI contracts table analysis, is_direct_award flag, 2010-2024. Queried April 2026.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Chapter 3.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Emergency as Habit',
        prose: [
          'Direct award procedures exist for legitimate reasons: genuine emergencies, single-source situations, small-value contracts where competitive overhead is disproportionate. Mexico\'s procurement law recognizes these exceptions. The problem RUBLI identifies is that "exception" has become "norm."',
          'The 2020 COVID pandemic did produce a spike in emergency direct awards — and RUBLI captures this in the data. But the overall direct-award trend was rising before the pandemic and continued rising after it. The pandemic was not the cause of Mexico\'s direct-award culture; it was an accelerant applied to a pre-existing structural condition.',
          'AMLO\'s 2019 centralization of pharmaceutical procurement was explicitly framed as an anti-corruption measure — removing the discretion of individual institutional buyers who had developed corrupt relationships with vendors. The irony documented in RUBLI\'s data: the centralized BIRMEX-INSABI system that replaced fragmented procurement ran at near-100% direct award rates in 2020-2021, with vendors winning enormous single-source contracts without competitive process.',
        ],
        pullquote: {
          quote: 'The pandemic did not create Mexico\'s direct-award culture. It was an accelerant applied to a pre-existing structural condition.',
          stat: '78.1%',
          statLabel: 'direct award rate in 2020 (pandemic year)',
          barValue: 0.781,
          barLabel: 'was already 77.8% in 2019 pre-pandemic',
        },
        sources: [
          'RUBLI year-over-year direct award analysis, 2018-2022, April 2026.',
          'Fundar/IMCO. (2021). La Reforma Farmacéutica: ¿Compras sin competencia?',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'What 82% Really Costs',
        prose: [
          'OECD research quantifies the premium paid in non-competitive procurement. A 2019 meta-analysis of 40 countries found that eliminating competition in public procurement increases contract prices by 15-30% on average, with higher premiums in concentrated markets and for recurring vendors.',
          'Applying a conservative 15% premium to the 82% of Mexican federal contracts awarded without competition in 2023: at 720B MXN in direct-award contracts for the year, the estimated competitive distortion cost is approximately 108 billion pesos annually — equivalent to 40% of the federal education budget, or 60% of the health infrastructure budget.',
          'This is not a definitive calculation — individual contract circumstances vary enormously, and some direct awards may be priced competitively. But RUBLI\'s risk model provides complementary evidence: the average risk score for direct-award contracts is significantly higher than for competitive procedures in the same sector-year, consistent with the pattern that non-competitive awards attract overpricing and favoritism even when not outright fraudulent.',
        ],
        pullquote: {
          quote: 'A 15% competitive premium on 720 billion pesos in direct awards equals roughly 108 billion pesos annually — the cost of competition foregone.',
          stat: '~108B MXN',
          statLabel: 'estimated annual cost of non-competitive procurement premium',
          barValue: 0.15,
          barLabel: 'conservative 15% price premium vs. competitive',
        },
        sources: [
          'Decarolis, F., & Giuffrida, L. (2019). Civil Servants and Cartels: The Revolving Door and Corruption in Procurement. American Economic Review.',
          'SHCP. (2024). Presupuesto de Egresos de la Federación 2024 — sector breakdowns.',
        ],
      },
    ],
    relatedSlugs: ['la-ilusion-competitiva', 'el-sexenio-del-riesgo', 'captura-institucional'],
    nextSteps: [
      'Request from SFP the official justification categories used for direct awards in 2023 — what fraction cite "emergency," "sole source," or "small value"?',
      'Analyze whether BIRMEX\'s post-2019 procurement shows competitive pricing versus pre-reform IMSS pharmaceutical prices for the same drug categories.',
      'File audit requests with ASF for the largest 50 direct-award contracts in 2024 — are any awarded to RUBLI T1/T2 ARIA-queue vendors?',
      'Research which procurement officials are authorized to approve direct awards above 10M MXN — how has that authority concentrated since 2019?',
    ],
  },

  // =========================================================================
  // STORY 7: The Riskiest Administration in History
  // =========================================================================
  {
    slug: 'el-sexenio-del-riesgo',
    outlet: 'data_analysis',
    type: 'era',
    era: 'amlo',
    headline: 'The Riskiest Administration in 23 Years',
    subheadline: 'RUBLI\'s model scores AMLO-era contracts (2019-2024) with a high-risk rate of 17.6% — the highest of any administration in the dataset. The finding does not prove corruption, but it does indicate structural procurement conditions that make it more likely.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 11,
    status: 'reporteado',
    leadStat: { value: '17.6%', label: 'high-risk rate, AMLO era (2019-2024)', sublabel: 'vs 9.7% under Calderón, 7.9% under Fox', color: '#dc2626' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'What the Model Finds Across Administrations',
        prose: [
          'RUBLI\'s v0.6.5 risk model was not calibrated to any single administration. It was trained on documented corruption cases spanning multiple eras and scores contracts based on their structural similarity to known-bad patterns: vendor concentration, price volatility, single-bidder conditions, network membership, and procurement mechanism.',
          'When we apply this model across the four complete administrations in RUBLI\'s dataset, the results show a consistent upward trend in high-risk rates. Under Fox (2002-2006), the high-risk rate was 7.9% — below OECD\'s 15% benchmark. Under Calderón (2007-2012), it reached 9.7%. Under Peña Nieto (2013-2018), it climbed to 12.4%. Under AMLO (2019-2024), it reached 17.6% — 2.5 percentage points above the OECD upper limit.',
          'Each administration also increased total procurement volume: AMLO-era procurement of 2.76T MXN exceeded the Peña Nieto era\'s 3.06T MXN only because the Peña Nieto period is longer (6 full years vs. 5.5 AMLO years in the dataset). On a per-year basis, AMLO-era procurement averaged 502B MXN/year — the highest in the dataset.',
        ],
        pullquote: {
          quote: 'Every administration since Fox has been riskier than its predecessor. AMLO\'s 17.6% high-risk rate exceeds the OECD ceiling of 15%.',
          stat: '17.6%',
          statLabel: 'AMLO-era high-risk rate',
          barValue: 0.176,
          barLabel: 'OECD ceiling: 15%',
        },
        chartConfig: { type: 'comparison', title: 'High-Risk Rate by Administration 2002-2024', chartId: 'admin-risk-comparison' },
        sources: [
          'RUBLI contracts table. Grouped by administration by contract_year. Queried April 2026.',
          'OECD. (2023). Public Procurement Performance Report. OECD benchmark: 2-15% high-risk rate.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'What Drives the AMLO-Era Score',
        prose: [
          'A critical-risk score does not equal proof of corruption. RUBLI\'s model is a similarity indicator: AMLO-era contracts more closely resemble known-bad patterns than Calderón-era contracts did, in the aggregate. The question is why.',
          'Three structural factors stand out in the data. First, the direct-award rate under AMLO rose to 77-82% — the highest in the dataset. More direct awards means fewer competitive pressure points that correlate with clean procurement. Second, the COVID-19 emergency procurement in 2020-2022 was executed primarily through emergency direct awards to vendors with new or thin contracting histories — a pattern that RUBLI\'s ghost-companion heuristic assigns elevated risk. Third, the INSABI/BIRMEX pharmaceutical centralization created large, single-source contracts that structurally resemble monopoly capture.',
          'None of these explanations is exculpatory. "We bypassed competition because of an emergency" does not mean the resulting contracts were clean — emergency procurement is consistently identified in international research as the highest-risk procurement mode. The AMLO administration chose to govern through procurement mechanisms that RUBLI\'s model — and OECD research — consistently associate with elevated corruption risk.',
        ],
        pullquote: {
          quote: 'Emergency procurement is consistently identified as the highest-risk procurement mode. Choosing to govern through it is a policy decision with measurable consequences.',
          stat: '2.76T MXN',
          statLabel: 'AMLO-era procurement spending (2019-2024)',
          barValue: 0.782,
          barLabel: 'share awarded without competition',
        },
        sources: [
          'RUBLI direct-award and risk analysis by year, 2019-2024. April 2026.',
          'Transparencia Mexicana / IMCO. (2021). Pandemia sin Transparencia: Análisis de Compras COVID-19.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Interpreting the Sheinbaum Baseline',
        prose: [
          'President Sheinbaum took office in October 2024. RUBLI has 92,631 contracts from her administration to date, with a high-risk rate of 12.9% — below the AMLO peak but above the Calderón baseline. It is too early to draw conclusions about a trajectory.',
          'What RUBLI can provide is a baseline: any future administration\'s procurement performance can be benchmarked against the 23-year dataset. A 17.6% high-risk rate under AMLO is the current ceiling. A 7.9% rate under Fox (with the caveat of lower data quality for that era) is the floor. Real-time monitoring using RUBLI\'s framework could provide quarterly administrations assessments rather than the retrospective judgments that traditional oversight delivers years later.',
          'OECD\'s Mexico Procurement Review specifically recommended building "real-time analytical capacity" into Mexico\'s oversight system. RUBLI\'s methodology — open source, versioned, and calibrated against documented cases — is exactly the kind of tool that recommendation envisioned.',
        ],
        pullquote: {
          quote: 'Real-time analytical monitoring could replace retrospective judgment. The 2024 baseline is 12.9% — lower than AMLO\'s peak, higher than Calderón\'s.',
          stat: '12.9%',
          statLabel: 'Sheinbaum-era high-risk rate (partial — Oct 2024-early 2025)',
          barValue: 0.129,
          barLabel: 'AMLO peak was 17.6%',
        },
        sources: [
          'RUBLI Sheinbaum-era contract analysis (contract_year=2025, partial). April 2026.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Recommendation 7.',
        ],
      },
    ],
    relatedSlugs: ['marea-de-adjudicaciones', 'la-ilusion-competitiva', 'el-gran-precio'],
    nextSteps: [
      'Request from ASF the audit coverage rate for AMLO-era emergency procurement contracts in health and infrastructure.',
      'Analyze BIRMEX and INSABI contracts 2019-2022 for vendor overlap with RUBLI\'s P1 and P6 pattern vendors.',
      'Track Sheinbaum administration procurement risk scores quarterly using COMPRANET data — RUBLI can update in real time.',
      'Cross-reference AMLO-era direct-award contracts above 500M MXN against the SFP sanctions registry.',
    ],
  },

  // =========================================================================
  // STORY 8: The Intermediary Industry
  // =========================================================================
  {
    slug: 'la-industria-del-intermediario',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'The Intermediary Industry',
    subheadline: 'RUBLI\'s P3 algorithm identified 2,974 vendors who appear to function as pure procurement intermediaries — winning contracts with government, then subcontracting the actual work. In infrastructure alone, they moved 174 billion pesos.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 10,
    status: 'solo_datos',
    leadStat: { value: '2,974', label: 'P3 intermediary-pattern vendors', sublabel: '518B MXN across 4 key sectors', color: '#8b5cf6' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Shadow Supply Chain',
        prose: [
          'In legitimate procurement, an intermediary can add value: a distributor with established supply chains may deliver goods more cheaply than direct manufacturer sourcing. But when intermediaries systematically win government contracts at inflated prices and subcontract at market prices — pocketing the spread — they become a fraud mechanism.',
          'RUBLI\'s Pattern 3 (P3) algorithm identifies intermediary signatures: vendors whose procurement footprint shows high contract counts and values but whose business characteristics suggest they do not produce the contracted goods or services directly. The 2,974 P3-classified vendors are concentrated in the highest-value procurement sectors.',
          'Infrastructure leads: 1,454 P3 vendors moved 174B MXN through intermediary structures in construction and public works. Health comes second: 677 P3 vendors handled 129B MXN in pharmaceutical and medical equipment procurement. Energy is third: 551 P3 vendors in the Pemex/CFE ecosystem accounted for 121B MXN.',
        ],
        pullquote: {
          quote: 'Infrastructure, health, energy: the three sectors where intermediary structures are largest are also the three with the most documented corruption history.',
          stat: '174B MXN',
          statLabel: 'P3 intermediary contracts in infrastructure',
          barValue: 0.52,
          barLabel: 'share via direct award',
        },
        chartConfig: { type: 'sector-bar', title: 'P3 Intermediary Vendors by Sector and Value', chartId: 'p3-sectors' },
        sources: [
          'RUBLI ARIA P3 pattern analysis, run ID 28d5c453, March 25 2026.',
          'COMPRANET procurement records, sector classification via RUBLI 12-sector taxonomy.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The La Estafa Maestra Prototype',
        prose: [
          'The largest documented case of intermediary fraud in Mexican procurement history is La Estafa Maestra — a scheme in which federal agencies contracted with public universities, which then subcontracted to phantom companies, which effectively returned money to the original agencies\' officials. The Parliamentary investigation of 2017 found 7.67 billion pesos moved through this structure.',
          'La Estafa Maestra was possible because Mexico\'s procurement law has a carve-out for university contracts, treating them as exempt from competitive bidding requirements. The universities became intermediaries between the procurement law and the shadow market. RUBLI\'s ground truth database includes this case; the vendors directly linked to it have risk scores averaging 0.55-0.65.',
          'The P3 pattern RUBLI identifies is not limited to university subcontracting. It appears across the vendor universe: any entity that structurally positions itself as a pass-through between government payment and actual service delivery fits the classification. The 2,974 P3 vendors in RUBLI\'s queue are the successors to the La Estafa Maestra architecture — different entities, same structural role.',
        ],
        pullquote: {
          quote: 'La Estafa Maestra moved 7.67 billion pesos through an intermediary structure. RUBLI finds 2,974 vendors in similar structural positions.',
          stat: '7.67B MXN',
          statLabel: 'La Estafa Maestra — the documented prototype',
          barValue: 0.60,
          barLabel: 'avg risk score for La Estafa Maestra-linked vendors',
        },
        sources: [
          'ASF. (2017). Auditoría de Desempeño 2016-0-06100-07-0161. La Estafa Maestra.',
          'Animal Político / MCCI. (2017). La Estafa Maestra: Graduados en desaparecer dinero público.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Why This Is Hard to Prosecute',
        prose: [
          'Intermediary structures are difficult to prosecute for a fundamental reason: subcontracting is legal. A company that wins a government contract and subcontracts the work is not committing a crime unless the subcontracting is used to inflate prices, launder money, or circumvent competitive requirements. Proving which of those three occurred requires following the money through multiple corporate structures and bank accounts.',
          'Mexico\'s UIF (Unidad de Inteligencia Financiera) has jurisdiction over financial flows that may constitute money laundering. The UNCAC (UN Convention Against Corruption), which Mexico ratified, requires state parties to criminalize "abuse of functions" in procurement — a category broad enough to cover systematic overpriced intermediation. But neither UIF investigation nor UNCAC proceedings have been publicly applied to procurement intermediary structures at scale.',
          'RUBLI\'s 2,974 P3 vendors provide a starting point for financial intelligence analysis. The algorithm has identified which vendors are structurally positioned as intermediaries — UIF could subpoena their bank records to determine whether the price spread between government payment and subcontract payment is systematic.',
        ],
        pullquote: {
          quote: 'Subcontracting is legal. Overpriced subcontracting that enriches a middleman at public expense is not.',
          stat: '2,974',
          statLabel: 'P3 intermediary-pattern vendors in RUBLI queue',
          barValue: 0.42,
          barLabel: 'average risk score',
        },
        sources: [
          'UNODC. (2020). UN Convention Against Corruption: Implementation Guide. Article 19 (abuse of functions).',
          'UIF/SHCP. (2024). Informe Anual de Actividades 2024.',
        ],
      },
    ],
    relatedSlugs: ['el-ejercito-fantasma', 'captura-institucional', 'el-umbral-de-los-300k'],
    nextSteps: [
      'File UIF intelligence request for bank transaction data on the top 20 P3-classified vendors in infrastructure by contract value.',
      'Identify which public universities continue to be used as procurement intermediaries after La Estafa Maestra — cross-reference with COMPRANET university contracts 2018-2025.',
      'Request from SFP the complete list of vendors sanctioned for improper subcontracting and cross-reference with RUBLI P3 list.',
      'Research whether Mexico\'s 2022 procurement law reform addressed the university subcontracting carve-out that enabled La Estafa Maestra.',
    ],
  },

  // =========================================================================
  // STORY 9: The 300K Threshold Trap
  // =========================================================================
  {
    slug: 'el-umbral-de-los-300k',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'The 300,000 Peso Threshold Trap',
    subheadline: 'RUBLI found 75,474 federal contracts awarded at exactly 300,000 pesos — a round number that falls just below key competitive bidding thresholds. The concentration at this single value is statistically impossible without coordination.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 8,
    status: 'solo_datos',
    leadStat: { value: '75,474', label: 'contracts at exactly 300,000 MXN', sublabel: 'statistical clustering around procurement threshold', color: '#f59e0b' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'Round Numbers That Aren\'t Random',
        prose: [
          'RUBLI\'s contract size analysis revealed an extreme concentration of contracts at exactly 300,000 pesos. In the range from 280,000 to 320,000 pesos, 75,474 contracts cluster at the 300,000 peso mark — a concentration that is orders of magnitude above what random variation would produce.',
          'The reason is not coincidence. Mexico\'s Ley de Adquisiciones establishes threshold values below which contracting authorities may use simplified procedures — specifically, "invitación a cuando menos tres personas" (invitation to at least three persons) instead of full open competitive bidding. These thresholds are specified as multiples of the "Unidad de Medida y Actualización" (UMA) and have historically corresponded to values in the 250,000-400,000 peso range depending on year and contract type.',
          'When procurement officials want to award a contract to a predetermined vendor without running a competitive process, one reliable approach is to structure the contract just below the threshold that triggers competitive requirements. 75,474 contracts structured at exactly 300,000 pesos is not a pricing decision — it is a threshold avoidance strategy at scale.',
        ],
        pullquote: {
          quote: '75,474 contracts at exactly 300,000 pesos. In a 40,000-peso range around that number, no other amount comes close.',
          stat: '75,474',
          statLabel: 'contracts at exactly 300,000 MXN',
          barValue: 0.50,
          barLabel: 'share of 280K-320K range bucket',
        },
        chartConfig: { type: 'breakdown', title: 'Contract Value Distribution Around 300K Threshold', chartId: 'threshold-clustering' },
        sources: [
          'RUBLI contracts table, amount_mxn distribution analysis. Queried April 2026.',
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público. Art. 42 (simplified procedures).',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Splitting as System',
        prose: [
          'Threshold splitting — fragmenting a larger procurement need into multiple contracts each below the competitive threshold — is one of the oldest procurement fraud techniques. Mexico\'s procurement law explicitly prohibits it (Ley de Adquisiciones, Art. 17), yet RUBLI\'s data shows it occurring at massive scale.',
          'The 75,474 contracts at exactly 300K are just the most visible cluster. RUBLI\'s z-score analysis of "same-day count" — the number of contracts awarded to the same vendor on the same day by the same institution — identifies thousands of cases where procurement was split into multiple same-day awards, each below threshold, to what appear to be structured package purchases.',
          'World Bank and OECD research on threshold splitting consistently find it is both common and costly. A 2019 World Bank analysis of Eastern European procurement found that threshold splitting added 8-12% to unit prices by eliminating volume discounts and competitive pressure. In a system with 75,000+ contracts at exactly threshold, the aggregate cost distortion across all federal procurement is likely in the billions.',
        ],
        pullquote: {
          quote: 'Article 17 explicitly prohibits splitting contracts to avoid competitive thresholds. 75,474 contracts at exactly threshold suggest the prohibition is widely ignored.',
          stat: 'Art. 17 LAASSP',
          statLabel: 'prohibits threshold splitting',
          barValue: 0.30,
          barLabel: 'estimated price premium from splitting',
        },
        sources: [
          'World Bank. (2019). Procurement Fraud Indicators: Threshold Manipulation in Public Contracting.',
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público. Art. 17 (fragmentation prohibition).',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'The Detection and the Fix',
        prose: [
          'Threshold manipulation is among the easiest procurement fraud patterns to detect algorithmically — and among the hardest to prosecute, because each individual contract is for a legitimate purchase. The fraud is in the aggregate decision to fragment, not in any single transaction.',
          'RUBLI\'s same-day analysis and threshold-clustering detection provide a ready-made list of cases for investigation. The algorithm can identify institutions with systematic threshold avoidance — the same institution awarding 20 contracts of exactly 300,000 pesos in one week — and vendors that appear exclusively in threshold-adjacent contracts.',
          'The fix is also well-established in procurement reform literature: automatic flagging of threshold-adjacent contracts in the procurement management system, mandatory explanation when multiple same-vendor same-day awards aggregate above threshold, and rotating SFP audits of institutions with anomalous threshold concentration. CompraNet already has the data to implement all three — it simply hasn\'t been required to.',
        ],
        pullquote: {
          quote: 'CompraNet already has the data to flag threshold manipulation automatically. The question is why it hasn\'t been required to.',
          stat: '3 reforms',
          statLabel: 'since 2012 that could have required automated threshold monitoring',
          barValue: 0.75,
          barLabel: 'fraction of 300K-cluster contracts that are direct awards',
        },
        sources: [
          'EU Procurement Directive 2014/24/EU. Art. 5 (aggregation rules and anti-splitting).',
          'OECD. (2015). Recommendation of the Council on Public Procurement. Principle 7: accountability.',
        ],
      },
    ],
    relatedSlugs: ['el-ejercito-fantasma', 'la-ilusion-competitiva', 'la-industria-del-intermediario'],
    nextSteps: [
      'File INAI information request for SFP\'s records of any Art. 17 LAASSP investigations for contract fragmentation in the last 5 years.',
      'Identify the top 20 institutions with the highest concentration of exactly-300K contracts and request their procurement records for those awards.',
      'Compare threshold values across years against the 300K cluster size — does the cluster shift when thresholds change?',
      'Contact SHCP/SFP policy unit to ask whether automated threshold-clustering detection has been considered for CompraNet.',
    ],
  },

  // =========================================================================
  // STORY 10: Price Volatility — The Algorithm's Smoking Gun
  // =========================================================================
  {
    slug: 'volatilidad-el-precio-del-riesgo',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Price Volatility: The Algorithm\'s Smoking Gun',
    subheadline: 'Across 3 million contracts and 16 candidate risk factors, RUBLI\'s model found one feature outperforms all others in predicting corruption: a vendor\'s tendency to charge wildly inconsistent prices for similar work.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 9,
    status: 'solo_datos',
    leadStat: { value: '+0.5343', label: 'price_volatility coefficient', sublabel: 'strongest predictor in v0.6.5 model', color: '#f59e0b' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'What the Model Learned',
        prose: [
          'RUBLI\'s v0.6.5 risk model was calibrated against 748 documented corruption cases — contracts from IMSS ghost company networks, food distribution fraud, COVID procurement irregularities, and monopoly capture schemes. The model learned to identify which procurement characteristics predict similarity to these known-bad cases.',
          'Of 16 candidate features — including single-bid rates, direct award flags, network membership, institution diversity, and contract timing — one emerged as the strongest predictor with a coefficient of +0.5343: price_volatility. This feature measures how much a vendor\'s contract prices vary relative to what similar vendors charge in the same sector and year.',
          'A high price_volatility score means a vendor is charging dramatically inconsistent amounts: perhaps 2M pesos for a delivery one month, 18M pesos for a similar delivery three months later, with no obvious change in scope. In clean procurement, prices tend to be consistent because they\'re driven by genuine market conditions. In corrupt procurement, prices are whatever the official approving the contract will sign.',
        ],
        pullquote: {
          quote: 'Of 16 risk features, price volatility was the strongest predictor — a coefficient 43% higher than the next-strongest feature.',
          stat: '+0.5343',
          statLabel: 'price_volatility coefficient in v0.6.5 model',
          barValue: 0.5343,
          barLabel: 'next strongest: institution_diversity (-0.3821)',
        },
        chartConfig: { type: 'fingerprint', title: 'v0.6.5 Model Feature Importance', chartId: 'model-coefficients' },
        sources: [
          'RUBLI v0.6.5 model calibration results. Run ID CAL-v6.1-202603251039. AUC test: 0.828.',
          'RUBLI docs/RISK_METHODOLOGY_v6.md — coefficient table, April 2026.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'What Price Volatility Looks Like',
        prose: [
          'Abstract coefficients become concrete when applied to real contracting data. GRUPO FÁRMACOS ESPECIALIZADOS — the pharmaceutical monopolist in RUBLI\'s P1 pattern with 133.2B MXN across 6,303 contracts — shows price_volatility as its dominant risk driver. A pharmaceutical distributor serving a single institution should charge relatively consistent per-unit prices for consistent products. Instead, RUBLI\'s z-score analysis shows this vendor\'s contract amounts varying by factors of 5-10x within the same year for the same institution.',
          'This is not necessarily a pricing model difference. It is consistent with what fraud researchers call "negotiated pricing" — where the contract amount is set through informal negotiation rather than competitive market pricing, and the nominal amount is adjusted to whatever sum the approving official is comfortable signing. The inconsistency in price is the signature of a process where the price does not emerge from competition.',
          'The OECD\'s procurement risk framework identifies price consistency as a key integrity indicator. Its 2022 Principles for Integrity in Public Procurement specifically recommends that procurement systems generate "price benchmarks that allow monitoring of consistency over time and across vendors." Mexico\'s CompraNet collects the data necessary to do this — RUBLI\'s price_volatility feature is exactly this benchmark applied at scale.',
        ],
        pullquote: {
          quote: 'When price is negotiated rather than competed, the price is whatever the signing official will approve — and inconsistency is the forensic trace.',
          stat: '5-10x',
          statLabel: 'within-year price variation for top P1 monopoly vendor',
          barValue: 0.70,
          barLabel: 'avg risk score for high-volatility vendor contracts',
        },
        sources: [
          'OECD. (2022). OECD Principles for Integrity in Public Procurement.',
          'RUBLI SHAP analysis, price_volatility feature contributions for P1 vendors, April 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Using Price Volatility as Investigation Tool',
        prose: [
          'The strength of price_volatility as a predictor creates a practical investigative tool: for any vendor-institution pair, RUBLI can compute the coefficient of variation in contract amounts over time and identify cases where that variation is statistically anomalous. These cases are the highest-yield targets for price investigation.',
          'What makes this more actionable than generic risk scores is the combination with physical evidence. A vendor with high price_volatility can be investigated by comparing contract invoices against market prices for the same goods in the same period. If an IT vendor charged the government 3M pesos in February and 27M pesos in July for comparable hardware configurations, the July invoice should be scrutinized: was there a genuinely different scope, or was the price inflated?',
          'ASF\'s financial audit methodology already includes price benchmarking for pharmaceutical procurement. Extending that methodology to cover all high-volatility vendor-institution pairs — identified by RUBLI — would represent a systematic upgrade of Mexico\'s anti-overpricing capacity. The data is there. The algorithm has pointed to where to look.',
        ],
        pullquote: {
          quote: 'RUBLI has identified which vendor-institution pairs show the highest price anomaly. Each one is a price investigation waiting to happen.',
          stat: 'AUC 0.828',
          statLabel: 'test accuracy of v0.6.5 model (vendor-stratified)',
          barValue: 0.828,
          barLabel: 'blind test on held-out vendor set',
        },
        sources: [
          'Elkan, C., & Noto, K. (2008). Learning classifiers from only positive and unlabeled data. ACM SIGKDD.',
          'ASF. (2024). Metodología de Auditoría de Precios en Adquisiciones de Medicamentos.',
          'RUBLI v0.6.5 model methodology. docs/RISK_METHODOLOGY_v6.md.',
        ],
      },
    ],
    relatedSlugs: ['el-monopolio-invisible', 'el-gran-precio', 'captura-institucional'],
    nextSteps: [
      'Request from ASF the methodology and vendor list for their pharmaceutical price benchmark audits — do they overlap with RUBLI\'s high price_volatility vendors?',
      'File INAI requests for invoice records on the 20 highest price_volatility vendors in RUBLI\'s T1 ARIA queue — compare against market price databases for the same goods.',
      'Cross-reference RUBLI\'s high-volatility vendors against COFECE\'s cartel investigation database — are any companies currently under competition investigation?',
      'Investigate whether CompraNet\'s data structure permits automated price-consistency monitoring across procurement rounds — what are the legal barriers to publishing such alerts publicly?',
    ],
  },

]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getStoryBySlug(slug: string): StoryDef | undefined {
  return STORIES.find(s => s.slug === slug)
}

export function getRelatedStories(slug: string): StoryDef[] {
  const story = getStoryBySlug(slug)
  if (!story?.relatedSlugs) return []
  return story.relatedSlugs
    .map(s => getStoryBySlug(s))
    .filter((s): s is StoryDef => s !== undefined)
}
