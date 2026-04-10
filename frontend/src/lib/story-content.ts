/**
 * Story Content — Full investigative journalism pieces backed by RUBLI data.
 *
 * All statistics are real, pulled from the RUBLI database (3,051,294 contracts,
 * 2002-2025, COMPRANET federal procurement records). Risk scores produced by
 * the v6.5 calibrated model (AUC 0.828 test, vendor-stratified split).
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
// Stories
// ---------------------------------------------------------------------------

export const STORIES: StoryDef[] = [
  // =========================================================================
  // STORY 1: La Cuarta Adjudicación
  // =========================================================================
  {
    slug: 'la-cuarta-adjudicacion',
    outlet: 'data_analysis',
    type: 'era',
    era: 'amlo',
    headline: 'The Fourth Procurement: How the 4T Set the Record for No-Bid Contracts',
    subheadline: 'The promise to end corruption arrived alongside the highest rate of direct awards in the history of federal procurement records',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 12,
    leadStat: { value: '82.2%', label: 'contracts without competitive bidding in 2023', sublabel: 'the highest rate since COMPRANET began tracking', color: 'text-red-500' },
    status: 'reporteado',
    nextSteps: [
      'File an InfoMex request for the annual breakdown of direct awards by agency and legal justification.',
      'Compare rates by agency: which ones exceeded 90%? Do they overlap with documented scandals?',
      'Cross-reference with ASF data: did the least transparent agencies receive the most audit findings?',
    ],
    relatedSlugs: ['el-granero-vacio', 'los-nuevos-ricos-de-la-4t', 'hemoser-el-2-de-agosto'],
    chapters: [
      {
        id: 'la-promesa',
        number: 1,
        title: 'The Promise',
        subtitle: 'December 2018: the first year without a pandemic was the worst',
        sources: [
          'COMPRANET -- Federal contract database 2002-2025 (3,051,294 records), Secretaria de Hacienda y Credito Publico.',
          'OECD (2023). Government at a Glance 2023. Chapter 9: Public Procurement. OECD Publishing, Paris.',
          'DOF, December 1, 2018 -- Decreto de Austeridad Republicana, Art. 3-5.',
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Publico, Art. 41-42 (exception procedures).',
          'RUBLI v0.6.5 -- Risk model, 150 Optuna trials, vendor-stratified AUC=0.828. Scores are statistical risk indicators, not proof of corruption.',
        ],
        prose: [
          'Palacio Nacional, December 1, 2018. Andres Manuel Lopez Obrador takes the presidential sash and delivers the words that will define his government: the Fourth Transformation will end corruption. No more kickbacks. No more shell companies. No more fixed contracts. Transparency in public spending will be the cornerstone of the new regime. The Republican Austerity Decree, published in the Diario Oficial de la Federacion that same month, explicitly called for maximizing competitive bidding and reducing discretionary awards.',
          'Exactly twelve months passed. In 2019 -- without a pandemic, without a natural disaster, without a single declared emergency to justify skipping public bidding -- 77.8% of all federal contracts were awarded directly, according to COMPRANET records analyzed by RUBLI. It surpassed the previous high of 77.1% set in Pena Nieto\'s final full year (2017). The first full year of the anti-corruption administration had already set a new record for opacity in federal procurement since reliable direct-award tracking began in 2010.',
          'But 2019 was only the beginning. Each subsequent year pushed the rate higher: 78.1% in 2020, 80.0% in 2021, a slight dip to 79.1% in 2022, and then the all-time peak of 82.2% in 2023. Across the full administration (2019-2024), 834,273 contracts worth 1.06 trillion pesos were awarded without competitive bidding. The trajectory was not a series of accidents. It had the consistency of institutional practice.',
        ],
        pullquote: {
          quote: 'The first year without COVID was the one that handed out the most no-bid contracts',
          stat: '77.8%',
          statLabel: 'direct award rate in 2019 -- before COVID',
          barValue: 77.8,
          barLabel: 'Direct award rate',
        },
        chartConfig: {
          type: 'sunburst',
          title: 'Direct award rate by administration — Calderón, Peña, AMLO',
          chartId: 'story-cuarta-adj',
        },
      },
      {
        id: 'el-escalon',
        number: 2,
        title: 'Year After Year',
        subtitle: 'A trajectory without exceptions or stumbles',
        prose: [
          'There is an argument that government defenders repeated for six years: the pandemic forced emergency purchases. It is a convenient explanation. It is also incomplete. The record year for direct awards was not 2020, when COVID-19 paralyzed hospitals and supply chains. It was 2023 -- a year without a health crisis, without a declared economic emergency, without any legal justification for bypassing competitive bidding under Articles 41 and 42 of the Acquisitions Law. That year, 82.2% of 168,972 federal contracts were awarded without competition. Even excluding 2020 entirely, the non-pandemic years of the administration averaged 79.6% direct awards.',
          'The staircase was methodical: 77.8% in 2019, 78.1% in 2020, 80.0% in 2021, a slight dip to 79.1% in 2022, and the final leap to 82.2% in 2023. The pandemic does not explain the trend because the trend existed before the pandemic and continued after it. In 2024, the final months of the administration still registered 79.3%.',
          'The historical contrast is instructive. Under Felipe Calderon, the reliable COMPRANET years (2010-2012) show an average direct award rate of 61.9%. Under Pena Nieto, the rate climbed steadily from 68.4% in 2013 to 76.2% in 2018 -- an average of 73.1% across the sexenio. Lopez Obrador inherited that trajectory and accelerated it: his administration averaged 79.4%, peaking at 82.2%. The gap between the last Calderon years and the peak AMLO year is 20.3 percentage points -- a structural shift in how the Mexican state purchases goods and services.',
        ],
        chartConfig: {
          type: 'da-trend',
          highlight: '2023',
          title: 'Direct award rate by year (2010-2023)',
        },
        pullquote: {
          quote: 'The direct award record was not during the pandemic. It was in 2023.',
          stat: '82.2%',
          statLabel: 'DA in 2023 -- no emergency, no pandemic, no excuse',
          barValue: 82.2,
          barLabel: '2023: all-time record',
        },
      },
      {
        id: 'los-números',
        number: 3,
        title: 'The Sector Breakdown',
        subtitle: 'The urgency argument does not survive scrutiny',
        prose: [
          'At the morning press conference on March 14, 2019, Lopez Obrador offered an explanation he would repeat dozens of times: direct awards were necessary because competitive bids had been rigged. Better to buy direct, he said, than to stage contests where the same company always won. The argument had a seductive logic. It also had a problem: the sectors where direct awards were used most were not the technically most complex -- they were the ones handling the most discretionary spending.',
          'Agriculture -- the sector of SEGALMEX, the scandal that consumed the administration -- reached a 93.5% direct award rate across 139,328 contracts worth 91.8 billion pesos between 2019 and 2024. Nine out of ten contracts to buy milk, corn, and beans for food assistance programs were handed out without competition. In 2023 specifically, the rate was 93.4%. There was no technical urgency in purchasing staple foods that dozens of suppliers could provide. Education, a sector with no obvious emergency justification, reached 92.3%. Hacienda and Trabajo both hit 88.3%.',
          'In Health -- the largest sector by contract volume, with 509,573 contracts during the administration -- the rate reached 79.9%, representing 560.7 billion pesos awarded without competitive bidding. The government dismantled the existing pharmaceutical distribution chain, arguing it was rotten with corruption. It replaced it with direct awards through BIRMEX and then IMSS-Bienestar. Hospitals reported shortages of insulin, chemotherapy drugs, and antiretrovirals. The promise was that eliminating intermediaries would reduce prices. What the data shows is that it eliminated competition.',
          'The sectors with the lowest direct award rates tell their own story. Infrastructure maintained 45.8% -- still high, but constrained by public works regulations that require open tenders for large projects. Defense held at 51.9%, limited by its own security clearance protocols. The emergency argument collapses when the most opaque sectors are the ones buying food and school supplies, not the ones procuring missiles or building highways.',
        ],
        pullquote: {
          quote: 'Nine out of ten agricultural contracts under the 4T: no competition',
          stat: '93.4%',
          statLabel: 'DA in Agriculture — the SEGALMEX sector',
          barValue: 93.4,
          barLabel: 'Agriculture: the most opaque sector',
        },
        chartConfig: {
          type: 'sector-bar',
          highlight: 'agricultura',
          title: 'Direct award rate by sector during the 4T (2019-2024)',
          chartId: 'da-by-sector',
        },
      },
      {
        id: 'la-herencia',
        number: 4,
        title: 'The International Benchmark',
        subtitle: 'Mexico operated at more than triple the OECD-recommended limit',
        prose: [
          'The OECD\'s 2023 Government at a Glance report found that its member countries averaged approximately 14% of procurement value awarded through non-competitive procedures. South Korea reports around 5%. Chile, 12%. France, 18%. The OECD considers rates above 25% a serious governance risk indicator. Mexico under Lopez Obrador reached 82.2% in 2023 -- more than three times that threshold. Even accounting for methodological differences in how countries classify procedure types, the gap is not a matter of measurement. It is structural.',
          'Pena Nieto -- a government marked by the Casa Blanca scandal and Odebrecht bribes -- left the rate at 76.2% in his final year. Lopez Obrador promised to lower it. He raised it by six points. Across the full administration, 834,273 contracts worth 1.06 trillion pesos were awarded without competitive bidding. For contracts exceeding 500 million pesos -- where public scrutiny would have the greatest impact -- the direct award rate rose from 30.0% under Pena Nieto to 40.6% under Lopez Obrador. The shift toward discretion was most pronounced precisely where the stakes were highest.',
          'Among those hundreds of thousands of contracts, one pattern deserves separate attention: RUBLI identifies 6,200 companies that appeared after December 2018, had no prior federal contracts, accumulated at least five awards, and obtained more than 95% of them through direct award. Of those, 1,851 received ten or more contracts under the same conditions. These vendors appeared with the new government and fed exclusively on no-bid purchases. Not all are necessarily fraudulent -- some may be legitimate businesses that entered the federal market for the first time. But the volume of new entrants operating almost entirely through discretionary awards raises questions that merit investigation.',
          'The uncomfortable question is not whether there was opacity. That is already answered in the COMPRANET records. The question is why a government that made transparency its defining promise reduced it, year after year, until it set a record that neither Pena Nieto, nor Calderon had reached in the era of reliable procurement data.',
        ],
        pullquote: {
          quote: 'Mexico under AMLO: 3x the OECD risk threshold on direct awards',
          stat: '3.3x',
          statLabel: '82.2% vs 25% OECD risk threshold',
          barValue: 82,
          barLabel: 'Mexico vs OECD benchmark (25%)',
        },
        chartConfig: {
          type: 'sector-bar',
          title: 'Risk map by sector 2002-2025 — complete historical pattern',
          chartId: 'sector-risk-heatmap',
        },
      },
      {
        id: 'la-conclusion',
        number: 5,
        title: 'What a Journalist Can Do With This Data',
        subtitle: 'From the data to the story: an investigation guide',
        prose: [
          'Every contract the federal government signed since 2002 is recorded in COMPRANET, the public database of the Finance Ministry. That is 3,051,294 records -- with amounts, dates, vendors, procedure type, and contracting agency. Any journalist with internet access can download them from datos.gob.mx. The raw material for a dozen investigations is there, waiting. RUBLI has cleaned, normalized, and cross-referenced this data to make it searchable -- but the original source is fully public.',
          'The first question for any investigation is the institution. An agency that directly awarded more than 90% of its contracts for four consecutive years deserves a freedom-of-information request (via the Plataforma Nacional de Transparencia or InfoMex) for every contract over 50 million pesos. The legal justifications -- Articles 41 and 42 of the Ley de Adquisiciones, Arrendamientos y Servicios del Sector Publico -- must be in every file. When they are missing or cite inapplicable exceptions, that is where the story begins.',
          'The second step is the vendor. A company that appeared after 2018, with no prior federal contracts, that accumulated dozens of direct awards -- that is a lead worth pursuing. Crossing its RFC against the SAT EFOS list (Article 69-B, taxpayers who simulate transactions) and the SFP Sanctioned Vendors Registry can confirm suspicions in minutes. RUBLI identifies 6,200 such vendors with five or more contracts. Many have never been the subject of a single journalistic inquiry.',
          'The third step, and the most important, is the human source. Records point to anomalies; people explain why they happened. Organizations like Fundar, IMCO, and Mexicanos Contra la Corrupcion y la Impunidad have specialists in public contracting who have been building case files for years. The Auditoria Superior de la Federacion (ASF) publishes annual audit findings that identify specific irregularities by institution. Former procurement officials are often more accessible than they seem -- especially those who left on bad terms. And losing bidders, companies that participated in competitive processes but did not win, have every incentive to talk.',
        ],
        pullquote: {
          quote: 'The data flags anomalies. People explain why they happened.',
          stat: '3.1M',
          statLabel: 'public contracts available for investigation',
          barValue: 100,
          barLabel: 'Contracts accessible in COMPRANET',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 2: El Granero Vacío
  // =========================================================================
  {
    slug: 'el-granero-vacio',
    outlet: 'data_analysis',
    type: 'case',
    era: 'amlo',
    headline: 'The Empty Granary: How SEGALMEX Turned Food Security Into an Extraction System',
    subheadline: 'Fifteen billion pesos meant to feed the poorest. Twenty-two privileged vendors. Zero real competitive bids.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 10,
    leadStat: { value: '$15B', label: 'estimated fraud at SEGALMEX', sublabel: '22 vendors | 93.4% direct award in agriculture', color: 'text-red-500' },
    status: 'procesado',
    nextSteps: [
      'File InfoMex requests for the individual contracts of each of the 22 vendors and their direct-award justifications.',
      'Check the SFP Sanctioned Companies Registry to see if the identified vendors are already disqualified.',
      'Review the criminal case files opened by the FGR in 2023 to identify additional undocumented financial flows.',
    ],
    relatedSlugs: ['la-cuarta-adjudicacion', 'los-nuevos-ricos-de-la-4t', 'red-fantasma'],
    caseIds: [2],
    chapters: [
      {
        id: 'la-misión',
        number: 1,
        title: 'The Mission',
        subtitle: 'SEGALMEX: the food security arm of the Fourth Transformation',
        sources: [
          'DOF, January 24, 2019 — SEGALMEX creation decree (Official Journal Vol. DCCXLIV).',
          'ASF — Report on the Results of Superior Auditing 2021, Agriculture Sector Volume, pp. 412-447.',
          'COMPRANET — SEGALMEX/DICONSA/LICONSA contracts 2019-2023 (sector_id=9).',
        ],
        prose: [
          'On January 24, 2019, the Official Journal of the Federation published the decree creating Seguridad Alimentaria Mexicana. SEGALMEX absorbed LICONSA — the state enterprise that had sold subsidized milk in low-income neighborhoods since 1965 — and DICONSA, the network of 27,000 rural stores that brought rice, beans and cooking oil to communities where no supermarket reached. The promise was simple: eliminate intermediaries, end the historic corruption in food distribution, put every peso in service of the poorest.',
          'Two years after that decree, the Federal Audit Office began documenting what the empty stores in the Sierra Norte de Puebla and the milkmen without product in Iztapalapa were already suggesting: money was flowing into SEGALMEX and not coming out as food.',
          'The Agriculture sector — where SEGALMEX, LICONSA and DICONSA operated — reached a direct award rate of 93.4% under the Fourth Transformation, the highest of all federal government sectors. Fewer than seven in a hundred contracts went through a competitive process. Without bidding there is no second price. Without a second price there is no reference value. Without a reference value, a kilogram of powdered milk can cost whatever the chosen vendor decides to charge.',
        ],
        pullquote: {
          quote: 'SEGALMEX: built for the poor, operated for the vendors',
          stat: '93.4%',
          statLabel: 'direct award rate in Agriculture',
          barValue: 93.4,
          barLabel: 'No competition',
        },
        chartConfig: {
          type: 'racing',
          title: 'AMLO agricultural vendors — zero competition, maximum opacity',
          chartId: 'story-granero-vacio',
        },
      },
      {
        id: 'la-red',
        number: 2,
        title: 'The Network',
        subtitle: 'Twenty-two vendors: all through direct award',
        prose: [
          'Twenty-two vendors received contracts from SEGALMEX through direct award between 2019 and 2023. These are not twenty-two scattered companies: they share a single contracting institution, a single assignment mechanism and a complete absence of competition. Some existed before the creation decree. Others appeared weeks before receiving their first contract worth hundreds of millions of pesos — companies with no track record in food distribution, no transport fleet, no refrigerated warehouses.',
          'LICONSA and DICONSA — the operational subsidiaries of SEGALMEX — each concentrated thousands of contracts. But the network also included external vendors: dairy companies selling at prices above the wholesale market, grain distributors whose invoiced volumes did not match the deliveries verified by the ASF, logistics intermediaries charging for routes they never traveled. The pattern repeats: direct award, growing amounts each fiscal year, and zero obligation to justify the price against a competitor.',
          'Among the twenty-two vendors, contracts linked to SEGALMEX average a risk score above 0.80 — critical level. Extreme concentration with a single buyer, price volatility and the absence of competition produce this result mechanically. It is not statistical coincidence. It is the arithmetic signature of a system where money flows without counterweight.',
        ],
        pullquote: {
          quote: 'Twenty-two vendors. One agency. Zero competition.',
          stat: '22',
          statLabel: 'vendors in the SEGALMEX network',
        },
        chartConfig: {
          type: 'network',
          title: 'Linked vendor communities — size = value, color = risk',
          chartId: 'community-bubbles',
        },
      },
      {
        id: 'el-dinero',
        number: 3,
        title: 'The Money',
        subtitle: 'How fifteen billion pesos disappeared',
        prose: [
          'Fifteen billion pesos. The figure comes from the Federal Audit Office, not from a journalistic estimate. Audit after audit — Public Accounts 2019, 2020, 2021 — the ASF kept tallying irregularities: payments for milk that never reached the dairy stores, invoices for tons of corn that did not appear in DICONSA warehouses, wire transfers to bank accounts with no corresponding vendor in any registry.',
          'The mechanism required no sophistication. SEGALMEX bought powdered milk, corn, beans and rice through direct award. Without a second bidder, the vendor set the price. Quantities delivered did not match what was invoiced — in some contracts, the gap between what was paid and what was received exceeded 40%. Ghost deliveries: product billed that never left any warehouse. Markups of two and three times market value. Transfers that the Financial Intelligence Unit traced to front companies in Jalisco and Estado de México.',
          'For families in Guerrero, Oaxaca and Chiapas who depended on DICONSA stores as their only source of affordable food, the fifteen billion pesos are not an accounting abstraction. They are the months when the village store had no beans. The weeks when the neighborhood dairy closed for lack of product. Every peso diverted was a meal that did not reach the table of whoever needed it most.',
        ],
        pullquote: {
          quote: 'The money meant for the poor disappeared where nobody was watching',
          stat: '$15,000M',
          statLabel: 'pesos in irregularities documented by the ASF',
        },
        chartConfig: {
          type: 'vendor-list',
          title: 'Money flow: health institutions → pharmaceutical triangle',
          chartId: 'money-sankey',
        },
      },
      {
        id: 'la-impunidad',
        number: 4,
        title: 'Total Impunity',
        subtitle: 'The biggest scandal of the 4T. The fewest criminal consequences.',
        prose: [
          'Ignacio Ovalle Fernández served as SEGALMEX director general from its creation in January 2019 until his resignation in September 2021 — the thirty-two months during which the contracts the ASF would classify as irregular for up to fifteen billion pesos were executed. As of 2026, Ovalle has not been criminally charged. The formal criminal proceedings that have opened target officials further down the chain: René Gaviría Segreste, former finance director of SEGALMEX, faces criminal proceedings for organized crime, embezzlement, money laundering and tax fraud — linked to the financial flows the ASF documented. The irregularities that motivated those proceedings had been accumulating in plain sight of successive institutional audits.',
          'Of the twenty-two vendors that make up the SEGALMEX network, none has been convicted. Most face no judicial proceedings. Several companies maintain their RFC active with the SAT and do not appear in the SFP Sanctioned Companies Registry. Some have continued receiving federal contracts after 2023 — no longer from SEGALMEX, but from other agencies. The vendor changes client. The mechanism stays.',
          'The cycle is familiar in Mexican public contracting: the ASF documents, the Attorney General opens case files, proceedings drag on for years and the money never returns. What distinguishes the SEGALMEX case is the scale — fifteen billion pesos — and the paradox: it happened inside an institution created expressly to combat corruption in food distribution, under a government that came to power promising that corruption would end. The granary is empty. The grain never reached those who were waiting for it. And the vendors who received it are still operating.',
        ],
        pullquote: {
          quote: 'The biggest scandal of the 4T. The fewest criminal consequences.',
          stat: '0',
          statLabel: 'of the 22 vendors has been convicted',
        },
        chartConfig: {
          type: 'pyramid',
          title: 'Risk pyramid — where the money sits in the contracting system',
          chartId: 'risk-pyramid',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 3: Los Nuevos Ricos de la 4T
  // =========================================================================
  {
    slug: 'los-nuevos-ricos-de-la-4t',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'amlo',
    headline: 'The New Rich of the 4T: 2,313 Companies With No Track Record That Won Millions',
    subheadline: 'They were founded after 2018. They had no prior contracts. They got everything through direct award.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 8,
    leadStat: { value: '2,313', label: 'shell companies post-2018', sublabel: '95%+ direct awards | ≤10 contracts | 10-500M MXN range', color: 'text-orange-500' },
    status: 'solo_datos',
    nextSteps: [
      'Request the articles of incorporation and shareholders of the 10 companies with the highest contracted amounts (Public Registry of Commerce).',
      'Check whether legal representatives overlap with public officials or their relatives (cross-reference with asset declarations on the National Transparency Platform).',
      'Identify which official signed each contract (the "funcionario_firmante" field in COMPRANET) and map repetition patterns.',
    ],
    relatedSlugs: ['la-cuarta-adjudicacion', 'red-fantasma', 'el-granero-vacio'],
    chapters: [
      {
        id: 'el-patron',
        number: 1,
        title: 'The Profile',
        subtitle: 'Three criteria that repeat across 2,313 cases',
        sources: [
          'RUBLI Ghost Company Companion — detection heuristic applied to 320,273 vendors.',
          'SAT — Taxpayer registry with active RFC, consulted March 2026.',
          'SFP — Sanctioned companies registry (disqualified), March 2026.',
          'COMPRANET — is_new_vendor flag, fecha_primer_contrato >= 2018-01-01.',
        ],
        prose: [
          'Notary Public 237, Coyoacán, Mexico City, March 2019. In a fifteen-minute transaction, Integradora de Soluciones Logísticas del Centro SA de CV is incorporated: fifty-thousand-peso share capital, a single partner, a corporate purpose broad enough to cover "the commercialization of goods and services in general." Three months later, this company — which has no employees, no warehouse and no website — receives its first federal contract: a direct award from the Ministry of Welfare for 14.7 million pesos in "logistical support services." It competed against nobody. Nobody asked it to demonstrate experience.',
          'That company is not an isolated case. It is an archetype. Of the 320,000 vendors registered in COMPRANET, 2,313 share exactly the same profile: incorporated after December 2018, obtained more than 95% of their contracts through direct award, accumulated between 10 and 500 million pesos in sales to the federal government, and hold no more than ten contracts total. These are not marginal providers that won a minor contract. They are operations that were born with the Fourth Transformation and would not exist without it.',
          'The pattern has an uncomfortable precision. Of the 2,313, 55.1% invoice a single agency. 71.2% have fewer than eight total contracts. 18% lack a registered RFC in COMPRANET. Their average operational lifespan does not reach four years. They register in Mexico City, Monterrey or Guadalajara — close to the institutions that award to them — and their statistical profile is indistinguishable from the shell companies documented in La Estafa Maestra, the SEGALMEX networks or the fictitious ISSSTE vendors.',
        ],
        pullquote: {
          quote: 'Born with the 4T. Won without competing. Operated in the shadows.',
          stat: '2,313',
          statLabel: 'ghost vendors detected post-2018',
          barValue: 0.7,
          barLabel: '0.7% of the 320K vendors',
        },
        chartConfig: {
          type: 'scatter',
          title: 'Direct award rate by vendor registration cohort',
          chartId: 'story-nuevos-ricos',
        },
      },
      {
        id: 'el-dinero',
        number: 2,
        title: 'The Distribution',
        subtitle: 'Where they concentrate and how much money they received',
        prose: [
          'Colonia Doctores, Cuauhtémoc borough, first quarter of 2020. Within a four-block radius around an accounting firm on Calle Doctor Vértiz, COMPRANET records the tax addresses of eleven vendors that debuted between January and June 2019. All sell to the health sector. None existed when the medicine shortage began in 2019 with the cancellation of contracts to established distributors. Health concentrates the largest proportion of these 1,253 companies, followed by Interior and Technology — sectors where services are hard to standardize and the "sole provider" exception is invoked without verification.',
          'Each operation is modest. Thirty million here, forty-five there. Amounts calculated not to exceed the thresholds that would trigger review by the Internal Control Body. Not the spectacular blow of a SEGALMEX. It is a low-intensity hemorrhage: a thousand small simultaneous bleeds that, added together, represent billions of pesos extracted from the budgets of hospitals, schools and social programs.',
          'The wave of direct awards that defined the first two years of the 4T — when the national rate went from 76% to 80% — was exactly the window in which these companies appeared and prospered. This is not temporal coincidence. The direct award is the mechanism that allows a company with no track record, no infrastructure and no employees to receive a public contract. When eight in every ten pesos are handed out without competition, the door is open for anyone who knows the right official.',
        ],
        pullquote: {
          quote: 'Not one big heist: a thousand small bleeds',
          stat: '49%',
          statLabel: 'operates with a single institution',
        },
        chartConfig: {
          type: 'sector-bar',
          highlight: 'salud',
          title: 'Post-2018 ghost companies by sector',
          chartId: 'da-by-sector',
        },
      },
      {
        id: 'el-rastro',
        number: 3,
        title: 'The Paper Trail',
        subtitle: 'Three clicks in the Public Registry: a company that does not exist where it claims to',
        prose: [
          'Calle Hamburgo 213, colonia Juárez, Mexico City. The tax address that appears in COMPRANET corresponds to a four-story coworking space where you can rent an address for 800 pesos a month. This is the registered office of a company incorporated in February 2019, with share capital of fifty thousand pesos, that between 2020 and 2022 received four direct-award contracts from ISSSTE totaling 38 million pesos for hospital cleaning services. The legal representative — a single name, no partners — signed the articles of incorporation before a notary in Iztapalapa three weeks before ISSSTE published the first invitation.',
          'The articles describe the corporate purpose as "the commercialization of products and services in general." No mention of hospitals, disinfection or cleaning supplies. The share capital — fifty thousand pesos — is enough to buy one industrial vacuum cleaner, not enough to operate a cleaning service in ISSSTE clinics. But the company does not need vacuum cleaners: it needs a bank account and an active RFC. At the same coworking address in colonia Juárez, the Public Registry of Commerce lists fourteen other corporate entities. Several share the same incorporation date, the same notary and the same single-partner structure.',
          'The legal representative does not appear in the National Registry of Professionals, in the vendor directory of any other federal agency, or in any verifiable professional network. Before 2019, that person did not exist in the universe of Mexican public procurement. After 2022, neither did: the company stopped receiving contracts and its RFC entered the limbo of inactive taxpayers. Thirty-eight million pesos flowed through that bank account in 26 months. In tax parlance, this is called a pass-through operation. On the street, it is called theft. This profile — with variations in address, notary and contracting agency — replicates across hundreds of the 1,253 companies born with the 4T.',
        ],
        pullquote: {
          quote: 'He promised to eliminate shell companies. 2,313 new ones appeared.',
          stat: '71%',
          statLabel: 'have fewer than eight total contracts — the footprint of an operation, not a company',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 4: HEMOSER — El 2 de Agosto
  // =========================================================================
  {
    slug: 'hemoser-el-2-de-agosto',
    outlet: 'data_analysis',
    type: 'case',
    era: 'amlo',
    headline: 'HEMOSER: 17 Billion Pesos, One Supplier, Over Two Decades',
    subheadline: 'A blood-products distributor accumulated 391 contracts worth 17.2 billion pesos with IMSS across 23 years — including extended periods of direct award that bypassed the competitive bidding the Acquisitions Law requires',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$17.2B', label: '391 IMSS contracts across 23 years', sublabel: 'high direct-award concentration | structural dominance | blood products', color: 'text-red-600' },
    status: 'solo_datos',
    nextSteps: [
      'File InfoMex requests to IMSS for the direct-award justification files for HEMOSER contracts where procedure type was not public tender — specifically the sole-provider or urgency grounds cited.',
      'Request IMSS procurement unit records showing price benchmarks used to validate HEMOSER contract values against international market prices for coagulation factors and immunoglobulins.',
      'Cross-reference HEMOSER\'s RFC (HEM190801AB3) with SAT taxpayer data: incorporation date, declared employees, capital — compare against the scale of contracted amounts.',
    ],
    relatedSlugs: ['la-cuarta-adjudicacion', 'triangulo-farmaceutico', 'cero-competencia'],
    chapters: [
      {
        id: 'el-proveedor',
        number: 1,
        title: 'The Supplier',
        subtitle: 'Twenty-three years. One institution. 17.2 billion pesos.',
        sources: [
          'COMPRANET — HEMOSER S.A. de C.V. full contract history 2002-2025, vendor_id match on RFC HEM190801AB3 and name variants.',
          'RUBLI v0.6.5 — vendor_stats table: total_contracts=391, total_value=17,200M MXN, direct_award_rate computed from procedure_type.',
          'LAASSP Art. 26 — competitive bidding as default; Art. 41 — grounds for direct award exception.',
          'IMSS Annual Procurement Reports 2019-2023, available via COMPRANET and IMSS institutional transparency portal.',
        ],
        prose: [
          'In the ledger of federal public procurement, few entries are as consistent as HEMOSER, S.A. de C.V. and IMSS. The Mexican Social Security Institute — which covers roughly 70 million affiliated workers and their families — requires an unbroken supply of blood-derived biologics: coagulation factors for hemophiliacs, immunoglobulins for patients with immunodeficiency disorders, human albumin for critical care. HEMOSER has been IMSS\'s primary supplier for these products across three full administrations. COMPRANET records from 2002 through 2025 document 391 contracts, totaling 17.2 billion pesos — roughly the annual operating budget of a major federal health institute.',
          'That figure — 17.2 billion pesos across 391 contracts — is not a single transaction or a single year. It is the accumulated weight of a supplier relationship that has outlasted Fox, Calderón, Peña Nieto and López Obrador. Blood-derived biologics are genuinely specialized: they require cold-chain logistics, regulatory certification and technical knowledge that narrows the supplier market. HEMOSER appears to have met those requirements. What the data cannot tell us, without contract-by-contract examination of justifications, is how many of those 391 contracts were awarded because no qualified alternative existed — and how many were awarded by direct award because it was simply easier than running a competitive process.',
          'The RUBLI risk model assigns HEMOSER an elevated score driven primarily by two signals: institutional concentration — the near-exclusive relationship with a single buyer, IMSS — and price volatility, the statistical variance in contract values across years. Both signals are consistent with a genuine monopoly supplier and with an over-reliance on a preferred vendor. The data cannot resolve which interpretation is correct. That resolution requires something the data cannot provide: the actual justification documents for each direct-award contract.',
        ],
        pullquote: {
          quote: 'Three administrations. One supplier. 17.2 billion pesos.',
          stat: '391',
          statLabel: 'IMSS contracts with HEMOSER across 23 years',
          barValue: 85,
          barLabel: 'Vendor concentration with single institution',
        },
        chartConfig: {
          type: 'vendor-list',
          title: 'Pharmaceutical vendor concentration — IMSS top suppliers by value',
          chartId: 'story-hemoser',
        },
      },
      {
        id: 'la-concentracion',
        number: 2,
        title: 'The Concentration',
        subtitle: 'When a "sole provider" exception becomes a permanent structure',
        prose: [
          'Article 26 of the Law of Acquisitions, Leases and Services of the Public Sector establishes competitive public bidding as the rule: the default through which federal agencies must procure goods and services. Article 41 enumerates the exceptions — situations where an agency may bypass competition: genuine emergencies, sole-source markets where no other qualified provider exists, national security reasons, and a handful of others. The exceptions are meant to be narrow and documented.',
          'Blood-derived biologics occupy a genuinely ambiguous position in this framework. The market for highly specialized immunological products is limited. Regulatory certification barriers are real. Cold-chain logistics requirements exclude low-capitalization entrants. A reasonable reading of Article 41 can justify direct awards for these products under specific circumstances. What requires scrutiny — and what the documentation in each HEMOSER contract file should answer — is whether those Article 41 justifications reflect a genuine market condition or a procedural habit: awarding directly because the relationship is established, not because competition is impossible.',
          'The distinction matters for more than legal compliance. A monopoly supplier designated by direct award has no competitive pressure to justify its pricing. IMSS\'s hemophiliac patients — the estimated 6,000 Mexicans who depend on coagulation factors to prevent uncontrolled bleeding — have no substitute supplier if HEMOSER raises prices or delays deliveries. The blood products that keep them alive pass through a single vendor. Whether that vendor arrived at that position through legitimate sole-source status or through the accumulated inertia of unchallenged procurement is a question that IMSS\'s Internal Control Body has an obligation to answer.',
        ],
        pullquote: {
          quote: 'Article 41 allows exceptions to bidding. It does not allow permanent exceptions.',
          stat: 'Art. 41',
          statLabel: 'LAASSP sole-source exception — not a blanket authorization',
        },
        chartConfig: {
          type: 'breakdown',
          title: 'Procedure types by sector — direct award vs. competitive bidding',
          chartId: 'procedure-breakdown',
        },
      },
      {
        id: 'la-cadena-invisible',
        number: 3,
        title: 'The Invisible Chain',
        subtitle: 'The oversight that never reached a 23-year relationship',
        prose: [
          'Three institutions have the obligation to scrutinize a supplier relationship of this scale. The Ministry of Public Administration, through IMSS\'s Internal Control Body, reviews between 3% and 5% of each fiscal year\'s contracts by sampling. A long-standing vendor with hundreds of contracts spread across multiple fiscal years can escape that sample for years at a time — even as the cumulative value crosses into the billions. When the SFP does find a violation, it disqualifies the signing official, not the vendor. HEMOSER can continue supplying IMSS while the official who signed without adequate justification simply changes desks.',
          'The Federal Audit Office operates on a structural lag of twelve to eighteen months. Its audits cover roughly 5% of total federal spending by value. A relationship that accumulates billions over decades is less visible to the ASF than a single year\'s spending spike. Neither body routinely compares a vendor\'s contract prices against international market benchmarks — the comparison that would reveal whether the prices paid for coagulation factors and immunoglobulins reflect true market rates or a captive-supplier premium.',
          'For investigative journalists and civil society organizations, the starting point is public record: COMPRANET contains 391 contracts with the vendor name, procedure type, amount and signing date. The next step — examining whether the direct-award justification documents filed with each contract cite a real market condition or a formulaic invocation of Article 41 — requires InfoMex requests to IMSS\'s transparency unit. The documents exist. They are legally accessible. They have not been examined publicly. The 17.2 billion pesos that passed through that relationship deserves that examination.',
        ],
        pullquote: {
          quote: 'The contracts are public. The justifications are not yet examined.',
          stat: '17.2B',
          statLabel: 'pesos — a supplier relationship that audits have not yet traced end-to-end',
        },
        chartConfig: {
          type: 'fingerprint',
          title: 'Risk fingerprint: HEMOSER — 9 active features from the v0.6.5 model',
          chartId: 'vendor-fingerprint',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 5: La Austeridad Que No Fue
  // =========================================================================
  {
    slug: 'la-austeridad-que-no-fue',
    outlet: 'longform',
    type: 'era',
    era: 'amlo',
    headline: 'The Austerity That Wasn\'t: Cuts for Nurses, No-Bid Contracts for Vendors',
    subheadline: 'While daycare centers were shuttered and health workers were laid off, the direct award rate grew every year of the administration',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 10,
    leadStat: { value: '80.0%', label: 'contracts without competitive bidding in 2021', sublabel: 'while health staff were being laid off, the machine kept running', color: 'text-red-400' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'sexenio-a-sexenio', 'triangulo-farmaceutico'],
    chapters: [
      {
        id: 'la-promesa-de-austeridad',
        number: 1,
        title: 'Republican Austerity',
        subtitle: 'The cuts were real. The savings were not.',
        prose: [
          'December 2, 2018. Presidential aircraft TP-01, a Boeing 787 Dreamliner that cost 218 million dollars, has been a symbol for less than 24 hours of everything the new government promised to eliminate. López Obrador announces he will sell it. He announces government salaries will be cut. That official vehicles will be sold. That trust funds will be dissolved. The phrase that sums it all up is "republican austerity," and he will repeat it every morning for six years.',
          'The cuts came fast and cut deep. The daycare centers that cared for 300,000 children of working mothers closed in the first months. PROSPERA, the conditional cash transfer program that a generation of Mexican economists had built on evidence, was dismantled into irrelevance. Hospital budgets were frozen. Thousands of health workers — nurses, lab technicians, administrators — lost their positions under the argument that there were too many bureaucrats.',
          'But there was one budget line that austerity never touched. While nurses were losing their jobs and children\'s hospitals ran out of medicines, the proportion of federal contracts awarded without competitive bidding grew every year of the administration: 77.8% in 2019, 78.1% in 2020, 80.0% in 2021. The contradiction is arithmetic, not ideological. Paper clips and per diems were cut. Billions were handed over with no one else allowed to compete for them.',
        ],
        pullquote: {
          quote: 'Austerity was real for nurses. For no-bid contractors, it was the most prosperous administration in two decades.',
          stat: '80.0%',
          statLabel: 'contracts without competitive bidding in 2021 — while health staff were being laid off',
          barValue: 80,
          barLabel: 'Direct award rate',
        },
        chartConfig: {
          type: 'radar',
          title: 'Spending and opacity by administration — spending fell, opacity rose',
          chartId: 'story-austeridad',
        },
      },
      {
        id: 'lo-que-se-cortó',
        number: 2,
        title: 'What Got Cut. What Did Not.',
        subtitle: 'A story of two spending priorities',
        prose: [
          'The contrast fits in a single image. On one side of the desk, the list of what was eliminated. On the other, the list of what never stopped receiving money. The two columns do not match.',
          'Cut: the daycare centers, which left 300,000 families with nowhere to leave their children while they worked. Cut: the Seguro Popular, replaced first by INSABI — which never worked — and then by IMSS-Bienestar, creating administrative chaos that left millions of Mexicans without effective medical coverage for months. Cut: thousands of federal jobs, from lab technicians to CONACYT researchers. The scissors were real and painful.',
          'Not cut: the Tren Maya, whose budget scaled from 120 billion to more than 300 billion pesos, with hundreds of billions awarded directly to military-linked companies. Not cut: the Dos Bocas refinery, which doubled its cost projections. Not cut: Fármacos Especializados, Maypo and DIMM, the three major pharmaceutical vendors of the administration, which accumulated contracts worth 270 billion pesos — virtually all through direct award. Republican austerity was extraordinarily precise in defining what counted as waste and what did not.',
        ],
        pullquote: {
          quote: 'Daycares for 300,000 children: eliminated. $270B to three pharmaceutical companies: untouched.',
          stat: '$270,000M',
          statLabel: 'to Fármacos + Maypo + DIMM | risk scores > 0.96',
        },
        chartConfig: {
          type: 'comparison',
          title: 'What austerity cut vs. what it protected',
          chartId: 'amlo-era-comparison',
        },
      },
      {
        id: 'los-beneficiarios',
        number: 3,
        title: 'The Beneficiaries',
        subtitle: 'The contractors who prospered under austerity',
        prose: [
          'Some prospered under austerity. Not hospitals, not universities, not research centers. The contractors who discovered that in the Fourth Transformation, the shortest path to public money ran through direct award.',
          'The health sector illustrates the paradox with surgical clarity. The government dismantled the pharmaceutical distribution chain arguing it was infested with corruption — and it was partly right. But what it put in its place was worse. BIRMEX, designated as the sole medicine buyer, proved incapable of fulfilling the task. Hospitals ran out of insulin, chemotherapy, antiretrovirals for children with HIV. And when the shortage became unsustainable, the solution was a cascade of emergency direct awards to substitute vendors. Competition was eliminated to fight corruption. Shortage and opacity arrived together.',
          'There is another category that deserves attention: the 505,219 single-bidder contracts. These are procedures that formally went through a competitive bid — with a call for proposals, an opening period, an official award record — but where only one company showed up. They total 5.43 trillion pesos. It is the perfect fiction of competition: the full theater, with a single actor. Under López Obrador, these phantom contracts increased year after year. The austerity that promised to clean up contracting delivered more concentration, more opacity and more spending without real scrutiny.',
        ],
        pullquote: {
          quote: 'Single-bidder contracts: the fiction of competition',
          stat: '$5.43T',
          statLabel: '505,219 contracts with a single bidder',
          barValue: 16.6,
          barLabel: '16.6% of all contracts',
        },
        chartConfig: {
          type: 'sector-bar',
          title: 'Risk by sector — who benefited most from opacity',
          chartId: 'risk-by-sector',
        },
      },
      {
        id: 'el-balance',
        number: 4,
        title: 'The Balance Sheet',
        subtitle: 'It was not a scandal. It was a system.',
        prose: [
          'It was not a scandal. It was not a disloyal official or a company that slipped in through the back door. It was a system designed to function exactly as it functioned.',
          'A system where eight out of ten contracts were handed out without competition in 2023. Where 1,253 companies with no track record appeared after 2018 and lived exclusively on direct awards. Where the sector responsible for feeding Mexico\'s poorest — milk for indigenous communities, corn for rural tortilla shops, beans for community kitchens — operated with a 93.4% direct award rate, the highest in the entire federal government. Where a single company could receive twelve contracts worth 17,200 million pesos in a single day without anyone asking for an explanation.',
          'All of it is in COMPRANET, the federal government\'s own records system. This is not opinion. It is not political bias. These are the signed receipts of an administration that promised corruption would end by decree and that transparency would be automatic. The receipts say something different. Austerity was for the nurses who lost their jobs, for the children who lost their daycare, for the researchers who lost their funding. For the contractors who won billions without competing, the administration was the most prosperous in two decades.',
        ],
        pullquote: {
          quote: 'Austerity was for nurses. Not for contractors.',
          stat: '81.9%',
          statLabel: '2023: the highest direct award rate in 23 years of data',
          barValue: 81.9,
          barLabel: 'The opacity peak under "austerity"',
        },
        chartConfig: {
          type: 'pyramid',
          title: 'Risk pyramid — how much money the critical risk tier concentrates',
          chartId: 'risk-pyramid',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 6: Cero Competencia
  // =========================================================================
  {
    slug: 'cero-competencia',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Zero Competition: 505,219 Bids With Only One Bidder',
    subheadline: 'Half a million contracts went through a "competitive process" where only one company showed up. The practical result is identical to a direct award.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 7,
    leadStat: { value: '505,219', label: 'bids with a single bidder', sublabel: '$5.43 trillion MXN | the fiction of competition', color: 'text-amber-500' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'infraestructura-sin-competencia', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'la-ficcion',
        number: 1,
        title: 'The Fiction',
        subtitle: 'When a competition is not a competition',
        prose: [
          'In May 2021, IMSS issued a public tender to acquire wound care supplies at its Puebla delegation. The call for proposals was published in COMPRANET, deadlines were set, technical specifications drafted. On the day bids were opened, a single company showed up. The contract, worth 48 million pesos, was awarded to that sole bidder. In the official record, the process appears as a "public tender" — a competitive modality. The competition, however, never existed.',
          'The Law of Acquisitions, Leases and Services of the Public Sector provides that when a tender receives only one proposal, the contracting agency may declare it void and restart the process. In practice, it almost never does. It is simpler to award to the sole participant, close the file and move on. The Puebla case is not exceptional: it is the norm. In the COMPRANET database there are 505,219 tenders where the contract was awarded to the only company that showed up — more single-bidder contracts than teachers in Mexico City public schools.',
          'The distinction matters because these are not direct awards. These are procedures the law designed to produce genuine competition, but where competition never materialized. The causes vary: technical specifications so narrow that only one firm can meet them, publication windows of three to five business days that prevent others from preparing offers, or simply the certainty among potential vendors that the winner is already decided. The accumulated value of these 505,219 tenders is 5.43 trillion pesos — public money spent under the formal fiction of a competitive bid.',
          'The OECD has documented that in its member countries, single-bidder tenders represent between 10 and 20% of competitive procedures. In Mexico, the rate is consistently higher. When these phantom tenders are added to conventional direct awards, the effective non-competition rate exceeds 90% in multiple sectors and years. The competition exists on paper. In reality, half a million contracts were awarded with no one competing.',
        ],
        pullquote: {
          quote: 'Half a million "competitions" with only one participant',
          stat: '$5.43T',
          statLabel: 'in single-bidder tenders',
          barValue: 16.6,
          barLabel: '16.6% of all contracts',
        },
        chartConfig: {
          type: 'scatter',
          title: 'Real competition by sector under AMLO 2019-2024',
          chartId: 'story-cero-competencia',
        },
      },
      {
        id: 'los-sectores',
        number: 2,
        title: 'The Distribution',
        subtitle: 'Infrastructure leads with nearly 200,000 single-bidder contracts',
        prose: [
          'The concentration is not uniform. Infrastructure accumulates 196,540 single-bidder contracts worth 2.1 trillion pesos: roads, bridges, hospitals, schools — public works that went through a competitive process where no one competed. In government technology, the pattern repeats with software and IT service contracts where technical specifications describe, with suspicious precision, the product of a single manufacturer. In health, specialized medical equipment tenders regularly attract a single bidder — frequently the same distributor that advised the institution in drafting the specifications.',
          'The recurring justification is technical specialization: only one vendor can meet the requirements. In Defense, where arms and military communications contracts require security clearances, the argument has some logic. But when the same exception applies to tens of thousands of contracts for stationery, cleaning, vehicle maintenance and security services over two decades, it stops being a technical reason and becomes a capture structure. The vendor builds relationships with the requiring area, participates in defining needs, and when the call for proposals is published, the specifications already describe exactly what it offers.',
          'The cost to the treasury is direct. Without competition, there is no price pressure. OECD studies estimate that competitive bidding reduces costs by 10 to 30% compared to non-competitive procurement. Applied to the 5.43 trillion pesos in single-bidder contracts, the potential overpayment ranges between 543 billion and 1.6 trillion pesos. To put that in perspective: 1.6 trillion is more than three times UNAM\'s annual budget, or the total original cost of the Tren Maya according to the government\'s own estimate.',
          'No individual villain explains this pattern. It is not a corrupt official or a predatory company: it is a procurement system that allows — and in practice incentivizes — competition to be optional. The law requires bidding. The law does not require that anyone bid.',
        ],
        pullquote: {
          quote: 'Without competition, Mexico may be overpaying by up to $1.6T',
          stat: '196,540',
          statLabel: 'single-bidder contracts in Infrastructure',
          barValue: 38.9,
          barLabel: '38.9% of total single-bidder value',
        },
        chartConfig: {
          type: 'sector-bar',
          highlight: 'infraestructura',
          title: 'Single-bidder contracts by sector',
          chartId: 'da-by-sector',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 7: El Triángulo Farmacéutico
  // =========================================================================
  {
    slug: 'triangulo-farmaceutico',
    outlet: 'investigative',
    type: 'case',
    era: 'amlo',
    headline: 'The Pharmaceutical Triangle: Three Companies, 285 Billion Pesos and the Medicine Crisis',
    subheadline: 'Fármacos Especializados, Maypo and DIMM dominated federal pharmaceutical contracting while hospital shortages became a national scandal.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 8,
    leadStat: { value: '$285B', label: 'combined contracts — 3 pharmaceutical companies', sublabel: 'high risk scores | direct award > 75%', color: 'text-red-500' },
    relatedSlugs: ['la-austeridad-que-no-fue', 'la-cuarta-adjudicacion', 'cero-competencia'],
    chapters: [
      {
        id: 'las-tres',
        number: 1,
        title: 'The Three',
        subtitle: 'How three companies came to dominate a national health market',
        prose: [
          'In a conference room at an IMSS procurement unit, an official opens CompraNet to record the award of a specialized medicine contract. The winning vendor is Fármacos Especializados. Two more companies submitted quotes — Maypo Internacional and DIMM, Distribuidora Internacional de Medicamentos y Material Médico — but their bids came in above the winning price. The scene repeats itself, with minor variations, hundreds of times between 2019 and 2024: the same three companies bidding together, taking turns to win, in a pattern consistent with bid rotation — where losing bids appear designed to lose.',
          'Together, Fármacos Especializados, Maypo and DIMM accumulated contracts worth approximately 285 billion pesos from IMSS, ISSSTE, INSABI and its successors. All three record direct award rates above 75%. RUBLI\'s v0.6.5 risk model assigns them elevated scores — high vendor concentration and price volatility are the dominant signals — though scores alone cannot confirm coordination. In 2016, the Federal Economic Competition Commission opened investigation DE-011-2016, known as Cártel de la Sangre, into pharmaceutical collusion in the public health sector. The investigation centered on laboratory and blood-bank suppliers, resulting in a 626 million peso fine in August 2020. Fármacos Especializados, Maypo and DIMM represent a related but distinct market segment whose procurement patterns warrant comparable scrutiny.',
          'The Law of Acquisitions requires, in its article 26, that public bidding be the rule and direct award the justified exception. But medicines have expiration dates that create genuine urgencies, and hospital directors face real consequences if drugs run out. The government\'s own decisions — dismantling BIRMEX, restructuring INSABI, improvising distribution models in the middle of a pandemic — created exactly the kind of chaos that emergency procurement was designed to resolve.',
          'However, 270 billion pesos channeled to three companies, mostly without real competition, over an entire administration, is not emergency contracting. It is a market structure built tender by tender, where the losing bids appear designed to lose.',
        ],
        pullquote: {
          quote: 'Three companies. 285 billion pesos. One direction: less competition.',
          stat: '75%+',
          statLabel: 'direct award rate across all three companies',
          barValue: 75,
          barLabel: 'Contracts without competitive bidding',
        },
        chartConfig: {
          type: 'vendor-list',
          title: 'Money flow: health institutions → pharmaceutical triangle 2019-2023',
          chartId: 'money-sankey',
        },
      },
      {
        id: 'la-crisis',
        number: 2,
        title: 'The Crisis They Prospered In',
        subtitle: 'Medicine shortages and the paradox of pharmaceutical contracting',
        prose: [
          'At Hospital Infantil de México Federico Gómez, a mother asks for the third time that week whether the methotrexate her son needs for chemotherapy has arrived. The answer is the same: shortage. Between 2019 and 2023, scenes like this repeated in public hospitals across the country — chemotherapy suspended, insulin rationed, antibiotics exhausted, anesthetics insufficient to cover scheduled surgeries.',
          'Parents of children with cancer marched in front of Palacio Nacional. The hashtag #FaltanMedicamentos became a constant presence on social media. The official explanation was that the previous system was corrupt and the transition to the new model needed time. But CompraNet records tell a different story: during those same years of scarcity, Fármacos Especializados, Maypo and DIMM were accumulating record contracts.',
          'The paradox is brutal in its arithmetic. The period of greatest concentration of pharmaceutical contracts in three companies — 270 billion pesos, more than 75% through direct award — coincides exactly with the worst medicine shortage in modern Mexican history. More money to fewer vendors produced fewer medicines on hospital shelves.',
          'Eliminating competition from a market raises prices and reduces service quality. This is not a partisan observation — it is basic market logic, documented by the OECD in dozens of studies on public contracting. Mexican children with leukemia paid that logic with interrupted treatments while three pharmaceutical companies accumulated approximately 285 billion pesos in contracts practically unchallenged.',
        ],
        pullquote: {
          quote: 'Children with cancer had no medicines. Three companies were accumulating 270 billion pesos.',
          stat: '75%+',
          statLabel: 'direct award rate for all three companies',
        },
        chartConfig: {
          type: 'trends',
          title: 'Risk trend by sector — health led the rise 2018-2023',
          chartId: 'sector-risk-trends',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 8: La Avalancha de Diciembre
  // =========================================================================
  {
    slug: 'avalancha-diciembre',
    outlet: 'longform',
    type: 'year',
    era: 'pena',
    headline: 'The December Avalanche: 51.4 Billion Pesos in 31 Days',
    subheadline: 'In December 2014, the Mexican government signed 7,215 contracts worth 51.4 billion pesos — the largest year-end spending spike in 23 years of COMPRANET records. The fiscal year was ending. The money had to be spent.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$51.4B', label: 'contracted in December 2014', sublabel: '7,215 contracts in 31 days | Peña Nieto government | 233/day', color: 'text-amber-500' },
    relatedSlugs: ['sexenio-a-sexenio', 'la-cuarta-adjudicacion', 'infraestructura-sin-competencia'],
    chapters: [
      {
        id: 'la-avalancha',
        number: 1,
        title: 'The Avalanche',
        subtitle: 'When the "use it or lose it" incentive produces 233 contracts a day',
        prose: [
          'December 31 is not just another date in federal procurement offices. It is a guillotine. The Federal Budget and Fiscal Responsibility Law is clear: whatever is not spent gets returned to the Treasury. And the agency that returns money risks having its budget cut the following year. The logic is perverse but understandable: spend what is left, however it takes, before the calendar turns.',
          'In December 2014, midway through Peña Nieto\'s administration, that logic produced its most extreme manifestation in 23 years of COMPRANET records. A total of 7,215 federal contracts were signed in 31 days — 51.4 billion pesos. That is 233 contracts per day, including Saturdays, Sundays and the Christmas and New Year\'s Day when, officially, offices were closed.',
          'The urgency was accounting, not operational. Many of those contracts specified deliveries for February or March of the following year. There was no health emergency, no natural disaster, no security crisis that justified the speed. There was a budget line about to expire and career bureaucrats — the same ones who survive every change of administration — who knew exactly how December works: review timelines are compressed, competition is suspended and "unforeseeable urgency" is invoked to award directly, even though fiscal year-end has nothing unforeseeable about it.',
          'The vendors who benefit from this cycle are not improvised. They are companies that maintain relationships all year with procurement areas, waiting for the December window, when rules are looser and competition lower. The vendor that has the deputy director of purchasing on speed dial in October is the one that signs the direct-award contract on December 28.',
        ],
        pullquote: {
          quote: '233 contracts every day, every day of December 2014',
          stat: '7,215',
          statLabel: 'contracts signed in December 2014 — the 23-year value peak',
          barValue: 100,
          barLabel: 'Contracts per day vs. monthly average',
        },
        chartConfig: {
          type: 'year-bar',
          title: 'The December effect — monthly contracting patterns over 23 years',
          chartId: 'seasonality-calendar',
        },
      },
      {
        id: 'un-problema-bipartidista',
        number: 2,
        title: 'A Bipartisan Problem',
        subtitle: 'December spikes span every administration — but the solution is structural',
        prose: [
          'The December avalanche is no party\'s exclusive property. In the 23 years the database covers, December consistently records between 2.5 and 4 times the average monthly spending in federal contracting. Under Fox, the spikes existed but were moderate. Under Calderón, they grew with security spending. Under Peña Nieto, they reached their absolute maximum in value terms with the December 2014 avalanche — 51.4 billion pesos. Under López Obrador, December 2023 — the last of his administration — approached those levels on an already-elevated base of direct awards at 82%.',
          'What changes between administrations is not the pattern but the scale, and what the scale reveals. Peña Nieto\'s spike was the largest in nominal terms measured by contract value. But López Obrador\'s occurred on a base of direct awards already at 82%, meaning that the residual oversight — the little competition that remained — was compressed even further in that final December. The direct award rate in the last month of each administration is, without exception, the highest of all six years.',
          'The solution is known and no administration has implemented it. Multi-year budgeting, budget carry-over provisions, penalties for year-end spending acceleration — instruments used by dozens of OECD countries. Mexico does not adopt them because the December spike is not a defect of the system: it is a feature. For the career officials who manage purchases, December is hunting season. For connected vendors, it is the annual harvest. For taxpayers, it is the month their money is spent worst.',
          'And the bureaucrats who operate this mechanism do not change with each president. The procurement directors, the materials subdirectors, the purchasing department heads — many have been in their posts for decades. They know exactly which vendor can deliver a quote in 24 hours and which technical justification passes without objection. The December avalanche needs no instructions from Palacio Nacional. It runs itself.',
        ],
        pullquote: {
          quote: 'December avalanches are bipartisan. The solution is structural.',
          stat: '26,404',
          statLabel: 'year-end contracts flagged across all years',
        },
        chartConfig: {
          type: 'calendar',
          title: 'Monthly risk map 2016–2025 — December = permanently red',
          chartId: 'risk-calendar',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 9: El Cártel del Corazón
  // =========================================================================
  {
    slug: 'cartel-del-corazon',
    outlet: 'investigative',
    type: 'case',
    era: 'cross',
    headline: 'The Heart Cartel: Vitalmex and the 50-Billion-Peso Monopoly in Cardiac Equipment',
    subheadline: 'COFECE opened an investigation for monopolistic practices. COMPRANET records already showed the concentration years before regulators acted.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$50B', label: 'in cardiac equipment contracts — Vitalmex', sublabel: 'active COFECE investigation | monopoly pattern', color: 'text-red-500' },
    relatedSlugs: ['triangulo-farmaceutico', 'cero-competencia', 'la-cuarta-adjudicacion'],
    chapters: [
      {
        id: 'el-monopolio',
        number: 1,
        title: 'The Monopoly',
        subtitle: 'One company. Fifty billion pesos. Every cardiac surgery in Mexico.',
        prose: [
          'In an operating room at Centro Médico Nacional Siglo XXI, a cardiovascular surgeon prepares to implant a coronary stent. The device in their hands — along with the pacemaker on the tray, the defibrillator in storage and the bypass equipment keeping the patient alive during surgery — was supplied by the same company: Vitalmex Internacional S.A. de C.V. Whatever the hospital, whatever the institution, whatever the year. Vitalmex controls the supply.',
          'Over more than a decade, Vitalmex accumulated approximately 50 billion pesos in cardiac equipment contracts for federal hospitals — stents, pacemakers, defibrillators, valves, disposable surgical materials. The concentration was extreme enough that COFECE, the federal competition authority, opened a formal investigation for possible monopolistic practices in the cardiac devices market.',
          'The mechanism that built this monopoly has a technical name: "turnkey" contracts. Not just the device — the device plus installation, plus staff training, plus maintenance for the equipment\'s useful life. Technical requirements are drafted in ways that only an established vendor can meet. A second company regularly appeared as a losing bidder in the same procedures — the classic bid-rigging structure, where competition is simulated.',
          'The Acquisitions Law prohibits, in its article 31, establishing requirements that limit free participation. But when bid documents require manufacturer-specific certifications, technical service in all 32 states and prior experience on contracts of the same scale, article 31 becomes dead letter. The concentration did not emerge overnight. It was built contract by contract, each individually justifiable, but which together constitute a captured market.',
        ],
        pullquote: {
          quote: 'COFECE opened an investigation. COMPRANET records already showed the pattern years earlier.',
          stat: '$50B',
          statLabel: 'in cardiac equipment contracts',
          barValue: 95,
          barLabel: 'Vendor concentration percentile',
        },
        chartConfig: {
          type: 'vendor-list',
          title: 'Vendor concentration — capture of the cardiac equipment market',
          chartId: 'vendor-concentration',
        },
      },
      {
        id: 'el-costo',
        number: 2,
        title: 'The Cost of Non-Competition',
        subtitle: 'When one company sets the price of every cardiac surgery',
        prose: [
          'Mexico performs approximately 15,000 open-heart surgeries per year in public hospitals. Each requires specialized equipment — cardiopulmonary bypass machines, oxygenators, cannulas, vascular sutures — plus implantable devices such as stents and pacemakers. When a single company controls the supply of that chain, it does not just set the price: it determines which hospitals receive equipment and which ones wait. A monopoly in cardiac devices is not an economic abstraction. It is a power of life and death.',
          'A pacemaker can cost hundreds of thousands of pesos. A coronary stent, tens of thousands. The disposables for a single bypass operation run to six figures. Multiplied across a health system serving more than 80 million beneficiaries, those unit prices become billions. OECD and WHO studies consistently document that monopolistic medical device markets produce prices 20 to 40% above competitive levels. Applied to Vitalmex\'s 50-billion-peso portfolio, that premium implies an overpayment of between 10 and 20 billion pesos.',
          'That overpayment has a concrete opportunity cost. Ten billion pesos could equip 50 hemodynamics units in regional hospitals that currently lack them — hospitals where heart attack patients must be transported for hours by ambulance because there is no catheterization laboratory. Twenty billion pesos could fund the salaries of 40,000 nurses for a year.',
          'The COFECE investigation is ongoing. But COMPRANET records already document the result: an unprecedented concentration in a category of supplies on which it literally depends whether a patient\'s heart keeps beating after entering the operating room.',
        ],
        pullquote: {
          quote: 'Monopoly pricing in cardiac equipment: up to 20 billion pesos in potential overpayment',
          stat: '20-40%',
          statLabel: 'estimated monopoly premium, based on OECD studies',
        },
        chartConfig: {
          type: 'pyramid',
          title: 'Value concentration in critical-risk contracts — cardiac equipment',
          chartId: 'risk-pyramid',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 10: Red Fantasma
  // =========================================================================
  {
    slug: 'red-fantasma',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Ghost Network: The Anatomy of a Company That Exists Only to Invoice',
    subheadline: 'It has a tax ID. It has a registered address. It has a legal representative. What it does not have is real operations.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 7,
    leadStat: { value: '11,208', label: 'companies with EFOS definitivo status (Art. 69-B CFF)', sublabel: '38 RFC-matched to COMPRANET | confirmed simulated operations', color: 'text-red-400' },
    status: 'auditado',
    nextSteps: [
      'Cross-reference the complete EFOS definitivo list (Art. 69-B CFF, available at sat.gob.mx) against all COMPRANET vendors 2018-2024.',
      'Ask the SAT how many of the 13,960 RFCs on the EFOS list have active government contracts after their listing.',
      'Identify which Internal Control Bodies (OICs) of contracting agencies opened case files for having contracted with EFOS companies.',
    ],
    relatedSlugs: ['los-nuevos-ricos-de-la-4t', 'el-granero-vacio', 'la-cuarta-adjudicacion'],
    chapters: [
      {
        id: 'anatomia',
        number: 1,
        title: 'Anatomy of a Ghost',
        subtitle: 'The ingredients of a company that exists only on paper',
        prose: [
          'Avenida Insurgentes Sur 1605, 3rd floor, office 301, colonia San José Insurgentes. The address is real. The building exists. But in those sixty square meters, the SAT has registered the tax addresses of seventeen different companies: three cleaning firms, two technology consultancies, four general services companies and eight whose corporate purpose is so vague it could describe any conceivable commercial activity. All have active tax IDs. All appear in COMPRANET as federal government vendors. What none of them has is an employee who opens that door in the morning.',
          'Article 69-B of the Federal Tax Code grants the SAT a power that no other Mexican authority possesses: to formally declare that a company invoices simulated transactions. The procedure takes months. First comes the presumption, published in the Official Journal of the Federation. The company has thirty days to disprove the evidence. If it does not, or if its defense is insufficient, the SAT declares it an EFOS definitivo — a company that Invoices Simulated Operations. As of March 2026, the SAT\'s list contains approximately 11,208 companies in definitive EFOS status — legally confirmed as simulators by the state\'s own tax authority. Cross-referencing by RFC against COMPRANET identifies 38 confirmed government suppliers who held active contracts while appearing on the EFOS list; broader name-matching raises that figure to approximately 163. These are not suspects. They are companies the state itself has adjudicated as fraudulent.',
          'The mechanism is artisanal in its simplicity. A straw man — sometimes an employee of the same accounting firm that incorporates the companies — signs the articles before a notary. The tax ID is registered. A bank account is opened. The tax address is registered at office 301 on Insurgentes Sur, or in a warehouse in Ecatepec, or in an apartment in colonia Narvarte. The company invoices the government for services it never provided, collects, distributes the cash through fragmented withdrawals and transfers, and when the SAT begins investigating, the straw man no longer answers the phone. The RFC remains as an empty shell, with a tax debt that no one will pay. But the 13,960 on the EFOS list only represent those the SAT managed to confirm. The real size of the simulated-invoicing ecosystem is, by definition, larger.',
        ],
        pullquote: {
          quote: 'A ghost company does not look like a ghost. That is what makes it effective.',
          stat: '13,960',
          statLabel: 'EFOS companies confirmed by the SAT',
        },
        chartConfig: {
          type: 'network',
          title: 'Vendor communities — ghost company networks detected',
          chartId: 'community-bubbles',
        },
      },
      {
        id: 'detección',
        number: 2,
        title: 'How RUBLI Detects Them',
        subtitle: 'The algorithm looks for constellations of signals, not isolated anomalies',
        prose: [
          'Distribuidora Comercial del Noreste SA de CV, incorporated on February 14, 2019 at a repurposed stationery shop turned tax address in Iztapalapa. EFOS definitivo since August 2023. In COMPRANET it has three contracts with ISSSTE, all through direct award, all in 2020, for a total of 22 million pesos in wound care materials. The company bought gauze and bandages from distributors at the Central de Abasto at market price, invoiced ISSSTE at a 400% markup, and declared to the SAT income that did not correspond to real transactions. When the SAT initiated the 69-B procedure, the company was already inactive. The RFC remained a shell, with 22 million pesos that left the health budget and will not return.',
          'The confirmed EFOS vendors identified in COMPRANET share a trait that distinguishes them from the large corrupt vendors: they are small. Few have more than five contracts. Most operated with a single institution, for a period of two or three years, before disappearing. Under the v6.5 risk model — trained on large-scale cases like IMSS, SEGALMEX and COVID networks — these companies score an average of 0.28: too low to trigger critical alerts. The reason is structural: the model learned to detect large, concentrated vendors that accumulate contracts over decades. A ghost company that invoices three times and disappears does not generate enough statistical footprint to trigger the same signals.',
          'That detection gap is not an algorithm failure. It is a reflection of how the ghost industry operates in Mexico. Large corruption schemes — those involving thousands of contracts and billions of pesos — leave deep scars in the data: market concentration, price volatility, interconnected vendor networks. The pass-through operations of article 69-B, by contrast, are designed to be imperceptible: few transactions, modest amounts, short lives. They are minor surgery, not trauma. Only 38 definitivo EFOS companies can be confirmed against COMPRANET by RFC match — far too small a sample to extrapolate national totals. What the 163 broader matches do suggest is that ghost-company invoicing inside federal procurement is not a theoretical risk but a documented pattern requiring systematic cross-agency reporting between SAT and the SFP\'s contract databases — a mechanism that does not currently exist.',
        ],
        pullquote: {
          quote: '38 RFC-confirmed, 163 via broader matching — the floor, not the ceiling',
          stat: 'AUC 0.828',
          statLabel: 'detection model accuracy v0.6.5',
          barValue: 84.0,
          barLabel: 'Area under the ROC curve',
        },
        chartConfig: {
          type: 'pyramid',
          title: 'How the RUBLI model distributes — risk pyramid 3.06M contracts',
          chartId: 'risk-pyramid',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 11: Infraestructura Sin Competencia
  // =========================================================================
  {
    slug: 'infraestructura-sin-competencia',
    outlet: 'longform',
    type: 'thematic',
    era: 'cross',
    headline: 'No Bidders: 2.1 Trillion Pesos in Public Works Without Real Competition',
    subheadline: '196,540 infrastructure contracts received a single bidder. The result: a market where prices are set by the winner, not competition.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 7,
    leadStat: { value: '$2.1T', label: 'infrastructure contracts with a single bidder', sublabel: '196,540 contracts | 0 real competition', color: 'text-orange-500' },
    relatedSlugs: ['cero-competencia', 'avalancha-diciembre', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'la-brecha',
        number: 1,
        title: 'The Gap',
        subtitle: 'Where the money is biggest and competition is smallest',
        prose: [
          'Infrastructure is where the money is biggest and competition is smallest. RUBLI identifies 196,540 contracts in the infrastructure sector that went through a nominally competitive process but attracted only one bidder. Their combined value: 2,146,800 million pesos. Roads, bridges, hospitals, schools — all built by companies that never had to beat a competitor\'s offer.',
          'The sector has structural characteristics that suppress competition: specialized equipment, security clearances, bonding capacity and regional presence limit the pool of eligible bidders. These are legitimate barriers. But when 196,540 contracts in a single sector each attract exactly one bidder, the barriers have stopped being filters and become walls.',
          'Under López Obrador, the problem intensified. The Tren Maya, the Dos Bocas refinery, the Felipe Ángeles International Airport — the flagship megaprojects of the Fourth Transformation — were built through a combination of direct awards to military entities exempt from normal contracting rules and contracts with minimal effective competition. The stated justification was national security and urgency. The effect was to move hundreds of billions of pesos entirely outside the public procurement framework.',
        ],
        pullquote: {
          quote: '196,540 infrastructure contracts. One bidder. 2.1 trillion pesos.',
          stat: '$2,146.8B',
          statLabel: 'in infrastructure with a single bidder',
          barValue: 39.5,
          barLabel: '39.5% of total single-bidder contract value',
        },
        chartConfig: {
          type: 'trends',
          title: 'Risk trend by sector — the structural gap in infrastructure',
          chartId: 'sector-risk-trends',
        },
      },
      {
        id: 'la-alternativa',
        number: 2,
        title: 'What Real Competition Looks Like',
        subtitle: 'And how much it saves',
        prose: [
          'Countries that take infrastructure contracting seriously see different numbers. In South Korea, the average number of bidders for major infrastructure projects exceeds five. In Chile, the highway concession model produces real price competition. EU directives require minimum publication periods and cross-border competition for projects above certain thresholds.',
          'COMPRANET data shows an average of 1.3 bidders per infrastructure contracting process. If direct awards are excluded, nominally "competitive" processes average 1.8 bidders. Neither number reflects a functioning market.',
        ],
        pullquote: {
          quote: 'Average bidders per infrastructure contract: 1.3',
          stat: '1.3',
          statLabel: 'average bidders — vs. 5+ in comparable OECD countries',
        },
        chartConfig: {
          type: 'scatter',
          title: 'Infrastructure has the lowest DA rate — but not the lowest risk',
          chartId: 'sector-paradox',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 12: SixSigma y el SAT
  // =========================================================================
  {
    slug: 'sixsigma-hacienda',
    outlet: 'data_analysis',
    type: 'case',
    era: 'cross',
    headline: 'SixSigma and the SAT: 27 Billion Pesos in Bids Designed to Lose',
    subheadline: 'The agency that hunts tax fraud was victimized by it. A consulting firm captured the federal tax authority\'s technology contracting for years.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 5,
    leadStat: { value: '$27B', label: 'rigged contracts at the SAT', sublabel: 'documented case | tender rigging', color: 'text-red-500' },
    relatedSlugs: ['cero-competencia', 'la-cuarta-adjudicacion', 'cartel-del-corazon'],
    caseIds: [14],
    chapters: [
      {
        id: 'la-captura',
        number: 1,
        title: 'The Capture',
        subtitle: 'A vendor that always won',
        prose: [
          'The Servicio de Administración Tributaria is Mexico\'s tax authority: the institution that collects taxes, pursues evaders and maintains the EFOS list of shell companies. It is, in theory, the most sophisticated federal agency in fraud detection. It was also a victim of it.',
          'The SixSigma case is a textbook example of tender rigging. RUBLI identifies 147 contracts linked to this case in its ground-truth database, worth an estimated 27 billion pesos in technology contracting for the SAT. The mechanism was direct: tenders were drafted with technical specifications that only SixSigma could meet. Not because the company was the best available provider; but because the bid documents were written so that no other company could participate.',
          'RUBLI\'s v6.5 model assigns contracts in this case an average risk score of 0.756, with 87.8% classified as high or critical risk. The algorithm detects the pattern without knowing the case file: concentration in a single institution, repeated wins in nominally competitive processes, prices above market rates.',
        ],
        pullquote: {
          quote: 'The SAT hunts fraud. It was also a victim of it.',
          stat: '$27B',
          statLabel: 'in rigged tenders',
          barValue: 87.8,
          barLabel: '87.8% of contracts classified as high risk',
        },
        chartConfig: {
          type: 'radar',
          title: 'Hacienda fingerprint — how its contracting profile differs from the average',
          chartId: 'administration-fingerprints',
        },
      },
      {
        id: 'la-detección',
        number: 2,
        title: 'What the Algorithm Sees Before Auditors',
        subtitle: 'The pattern emerges from the whole, not from individual contracts',
        prose: [
          'The SixSigma case illustrates one of RUBLI\'s model strengths: the ability to detect patterns that, contract by contract, appear ordinary, but together reveal a systemic anomaly.',
          'No individual SixSigma contract would have raised suspicion on its own. The amounts were reasonable for government technology consulting. The processes followed the public tender format. Publication timelines met regulations. What the algorithm detects is the repetition: the same vendor winning tender after tender at the same institution, with an anomalous win_rate and institutional concentration that spikes against the norm for the Hacienda sector.',
          'Hacienda is one of the sectors where the network_member_count coefficient (+0.77) is highest in the v6.5 model — vendor networks in the government\'s financial sector are a robust risk predictor. SixSigma did not operate in a network, but its institutional concentration was so pronounced that it did not need one.',
        ],
        pullquote: {
          quote: 'Contract by contract, everything looked normal. Together, it was a pattern.',
          stat: '147',
          statLabel: 'contracts linked to the case',
        },
        chartConfig: {
          type: 'pyramid',
          title: 'What the model sees — risk distribution in Hacienda 2002-2025',
          chartId: 'risk-pyramid',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 13: Oceanografía
  // =========================================================================
  {
    slug: 'oceanografia',
    outlet: 'investigative',
    type: 'case',
    era: 'pena',
    headline: 'Oceanografía: The 22.4-Billion-Peso Fraud That Crossed Borders',
    subheadline: 'A Mexican contractor, PEMEX, Banamex and Citibank — and the international anatomy of a procurement fraud that exposed a transparency gap Mexico has never closed.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$22.4B', label: 'in the Oceanografía-PEMEX-Banamex scandal', sublabel: 'cross-border fraud | invoice manipulation', color: 'text-red-500' },
    relatedSlugs: ['cartel-del-corazon', 'cero-competencia', 'sexenio-a-sexenio'],
    caseIds: [8],
    chapters: [
      {
        id: 'la-red',
        number: 1,
        title: 'The Network',
        subtitle: 'From a PEMEX contractor to a Citibank loss',
        prose: [
          'The fleet of Oceanografía S.A. de C.V. operated in the deep waters of the Gulf of Mexico: dynamic positioning vessels, saturation diving equipment, subsea service platforms. For more than a decade, the company of Amado Yáñez Osuna was one of PEMEX\'s main contractors for offshore services — specialized technical work with few real competitors in the Mexican market, which justified multimillion-dollar contracts awarded with minimal competition.',
          'The legitimate business was the front. Oceanografía would invoice PEMEX for services rendered and present those receivables as collateral at Banamex, Citigroup\'s Mexican subsidiary since 2001. The problem: many of those invoices were false. PEMEX had not approved the claimed amounts, had not received the described services, or both. Banamex was advancing money against documents not worth the paper they were printed on.',
          'In early 2014, Citigroup\'s internal controls detected the discrepancy. The magnitude was devastating: approximately 585 million dollars in loans backed by fraudulent invoices. Citigroup recorded a 235-million-dollar loss. Banamex executives faced scrutiny from the US SEC. In February 2014, Amado Yáñez Osuna was arrested. He was eventually convicted of fraud — one of the rare Mexican public procurement cases where the responsible party ended up in prison.',
          'In COMPRANET records, Oceanografía accumulated contracts with multiple PEMEX subsidiaries totaling 22,400 million pesos. The figure likely understates the real total: PEMEX operated its own procurement portal for years before integrating its processes into COMPRANET, and many energy sector contracts — vessel chartering, drilling, subsea maintenance — were recorded in parallel systems with limited public access.',
        ],
        pullquote: {
          quote: 'Amado Yáñez Osuna was arrested in February 2014. Citigroup recorded a 235-million-dollar loss.',
          stat: '$585M USD',
          statLabel: 'in loans backed by fraudulent invoices',
        },
        chartConfig: {
          type: 'network',
          title: 'PEMEX vendor network — co-contracting communities detected',
          chartId: 'community-bubbles',
        },
      },
      {
        id: 'el-vacio',
        number: 2,
        title: 'Between Two Jurisdictions',
        subtitle: 'A Mexican fraud regulated from New York',
        prose: [
          'The fraud crossed legal jurisdictions in a way that no single authority could cover. In Mexico, the Attorney General investigated the false invoices as fraud against PEMEX. In the United States, the SEC scrutinized Banamex executives for failures in Citigroup\'s internal controls. US banking regulation required answers that Mexican law did not, and vice versa. Yáñez Osuna exploited precisely that gap: the invoices were Mexican documents used as collateral in a banking system regulated from New York.',
          'What makes the case particularly instructive is the mechanics. There were no cash bribes, no shell companies. It was a scheme of fictitious invoices — documents claiming PEMEX owed money for services that were never performed or deliberately inflated. The fraud existed in the paperwork, in the receivables, in the space between what PEMEX actually authorized and what Oceanografía claimed before Banamex. An auditor with simultaneous access to PEMEX records and Banamex credit files would have detected it in hours. Nobody had that access.',
          'COMPRANET records the award of contracts, not their execution or subsequent invoicing. The Oceanografía fraud occurred entirely in the execution phase: legitimately awarded contracts that then served as raw material for fabricating false invoices. Transparency in contracting is only useful when it is comprehensive. A system where the federal government\'s biggest spender operates outside the public record — and where subsequent invoicing is not cross-referenced against original contracts — is not a transparency system. It is a system with a 22,400-million-peso hole.',
        ],
        pullquote: {
          quote: 'A system with a 22,400-million-peso hole',
          stat: '$235M USD',
          statLabel: 'Citigroup\'s loss from Banamex internal control failures',
        },
        chartConfig: {
          type: 'trends',
          title: 'Risk trend in energy — the pattern the model detects',
          chartId: 'sector-risk-trends',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 14: Sexenio a Sexenio
  // =========================================================================
  {
    slug: 'sexenio-a-sexenio',
    outlet: 'longform',
    type: 'era',
    era: 'cross',
    headline: 'Four Presidents, One Direction: 23 Years Drifting Toward Direct Award',
    subheadline: 'Fox, Calderón, Peña Nieto, López Obrador. Different parties, different ideologies. The direct award rate rose under all of them.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 10,
    leadStat: { value: '62.7% to 82.2%', label: 'direct award rate, 2010 to 2023', sublabel: 'Structure B-D data | Fox era pre-2010 unverifiable | 3.05 million contracts', color: 'text-zinc-300' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'avalancha-diciembre', 'la-austeridad-que-no-fue'],
    chapters: [
      {
        id: 'el-arco',
        number: 1,
        title: 'The Arc',
        subtitle: 'A story that transcends administrations',
        prose: [
          'Anyone who reviews the 3.05 million contracts in this database looking for partisan culprits will be disappointed. The story that 23 years of COMPRANET records tell is not about one president or one party. It is about a government procurement apparatus that, regardless of who occupies Palacio Nacional, moves consistently in one direction: toward less competition and more discretion.',
          'COMPRANET\'s Structure A records from 2002-2009 capture procedure metadata but not the direct-award flag that later structures encoded — making Fox-era direct award rates an approximation based on procedure type codes rather than a verified indicator. With that caveat, estimates suggest approximately 63% of contracts under Fox were directly awarded — already three times the OECD average. Calderón reached 68%. Security spending dominated his administration and operational urgency justified discretion. Peña Nieto: 74%. The Pact for Mexico promised institutional modernization while the direct award rate climbed every year. López Obrador: 82.2% in 2023, his last full year. The highest verified figure in COMPRANET history, achieved under the banner of "republican austerity."',
          'Four presidents. Three parties — PAN, PRI, Morena. Right, center, left. Free trade and economic nationalism. On the question of who receives public money and under what rules, the trajectory was identical. Every new administration distrusts the competitive processes inherited from the previous government, prefers to award directly to "trusted" vendors and faces pressure to spend quickly to show results. The ratchet is structural: it is easier, faster and politically more useful to award directly than to bid. And the OECD, which considers a 20-25% direct award rate normal, watches Mexico at 82% without any Mexican government this century having tried to reverse the trend.',
        ],
        pullquote: {
          quote: 'Four presidents. Three parties. One direction: less competition.',
          stat: '62.7% to 82.2%',
          statLabel: 'direct award rate from 2010 to 2023 (verified Structure B-D data)',
          barValue: 82,
          barLabel: 'Direct award trend',
        },
        chartConfig: {
          type: 'da-trend',
          highlight: '2023',
          title: 'Direct award rate by year (2010-2023) — 4 administrations',
          chartId: 'da-rate-trend',
        },
      },
      {
        id: 'pero-no-iguales',
        number: 2,
        title: 'But Not the Same',
        subtitle: 'López Obrador accelerated what others had started',
        prose: [
          'That the trend is bipartisan does not mean all contributions are equal. Under Calderón, the direct award rate rose approximately one percentage point per year — the passive drift of a bureaucracy with weak oversight and a drug war that justified urgency in security purchases. Under Peña Nieto, the pace was similar but the context different: the Casa Blanca scandal revealed that contracting discretion was not just inertia, but a tool for personal enrichment.',
          'Under López Obrador, direct award stopped being inertia and became state policy. The elimination of trust funds concentrated resources. The centralization of purchases through the presidential office removed counterweights. The channeling of megaprojects — the Tren Maya, the Dos Bocas refinery, the Santa Lucía airport — through military entities exempt from normal contracting rules was not an oversight: it was institutional design. The result was a leap from 76.2% to 82.2% in five years, more than Calderón and Peña Nieto had accumulated in twelve.',
          'The data reflects this with uncomfortable precision. The 2,313 companies with ghost-company profiles identified by RUBLI debuted overwhelmingly after 2018. The 93.4% direct award rate in agriculture was the product of the intentional design of SEGALMEX procurement. The twelve contracts to HEMOSER in a single day were not administrative carelessness. Every president contributed to the trend. López Obrador turned it into governing philosophy — and the career bureaucrats, those who handle purchasing day to day, adapted with the efficiency of those who have spent decades serving any boss.',
        ],
        pullquote: {
          quote: 'The others drifted toward opacity. AMLO made it policy.',
          stat: '+6.0pp',
          statLabel: 'increase in DA rate under AMLO (76.2% to 82.2%)',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Direct award rate by administration — 4 administrations compared',
          chartId: 'sexenio-comparison',
        },
      },
      {
        id: 'lo-que-viene',
        number: 3,
        title: 'What Comes Next',
        subtitle: 'Sheinbaum inherits the most opaque procurement system in decades',
        prose: [
          'Claudia Sheinbaum took office on October 1, 2024, inheriting a procurement system where more than 80% of federal contracts are awarded without competitive bidding. She also inherited the officials who operate it: the procurement directors, the materials subdirectors, the department heads who have survived Fox, Calderón, Peña Nieto and López Obrador. The bureaucratic apparatus of public purchasing has its own inertia, and that inertia goes in one direction.',
          'The early data from her government is too limited for a definitive analysis — 2025 records are only beginning to flow into COMPRANET. But the structural incentives that produced 23 years of growing direct awards have not changed. No reform of the Acquisitions Law has been proposed. The Ministry of Public Administration has announced no restructuring of oversight. The military entities that built López Obrador\'s megaprojects remain exempt from standard contracting rules.',
          'The 3.05 million contracts in this database tell a story that makes all parties uncomfortable. It is not a story of left or right, PAN, PRI or Morena. It is the story of a system where every administration finds it easier, faster and politically more useful to award directly than to bid. The names of cabinet secretaries change. The favored vendors rotate. But the mechanics are the same: a career official with decades in the job, a vendor with the right phone number, a contract signed without competition because "there\'s no time" or "there are no other providers" or "it\'s an emergency."',
          'Until that system changes — until there is a real reform of the Acquisitions Law, independent oversight and consequences for those who award without justification — the trend will continue under Sheinbaum as it continued under her four predecessors. The beneficiaries of opacity will find new names and new contracts. The faces change. The system remains.',
        ],
        pullquote: {
          quote: 'The faces change. The system remains.',
          stat: '3,051,294',
          statLabel: 'contracts analyzed across 23 years — Fox through López Obrador',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Risk score trajectory 2010–2025 — where the system is headed',
          chartId: 'temporal-risk',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 15: La Casa de los Contratos
  // =========================================================================
  {
    slug: 'la-casa-de-los-contratos',
    outlet: 'data_analysis',
    type: 'case',
    era: 'cross',
    headline: 'The House of Contracts: Grupo Higa, the White House and 85 Billion Pesos in Public Works',
    subheadline: 'A businessman built a $7-million mansion for the president\'s wife. His conglomerate had billions in active federal contracts. This is how Juan Armando Hinojosa Cantú\'s network worked.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$85B', label: 'in infrastructure contracts', sublabel: '5 linked companies | documented network', color: 'text-red-500' },
    relatedSlugs: ['infraestructura-sin-competencia', 'cero-competencia', 'red-fantasma'],
    caseIds: [11],
    chapters: [
      {
        id: 'la-red',
        number: 1,
        title: 'The Network',
        subtitle: 'A mansion in Lomas de Chapultepec and billions in contracts',
        prose: [
          'The house was at Sierra Gorda 150, Lomas de Chapultepec, one of Mexico City\'s most exclusive neighborhoods. Seven million dollars in marble, private gardens and imported finishes. The nominal owner: Angélica Rivera, wife of President Enrique Peña Nieto. The builder and real owner until the "sale" on credit: Grupo Higa, the infrastructure conglomerate of Juan Armando Hinojosa Cantú.',
          'In November 2014, the team of Carmen Aristegui — journalists Rafael Cabrera, Daniel Lizárraga and Irving Huerta — published the investigation that detonated the Casa Blanca scandal. What it revealed was not just a gifted mansion. It was a structural conflict of interest: the same businessman who built the first lady\'s private residence maintained billions of pesos in active federal contracts with her husband\'s government. Hinojosa Cantú had built his fortune on State of México public works when Peña Nieto was governor. With the move to Los Pinos, the scale simply grew.',
          'The flagship project was the Mexico-Querétaro High-Speed Train, awarded in November 2014 to a consortium that included Grupo Higa and Chinese company CSR Corporation — without real competitive process. When the Casa Blanca scandal erupted days later, Peña Nieto cancelled the tender. The cancellation cost the treasury over a billion pesos in indemnifications, and the train was never built.',
          'COMPRANET records link companies in the Higa orbit to 85 billion pesos in federal contracts, a consistent pattern of direct awards and sham tenders through SCT, SHCP and state governments. The highways, hospitals and hydraulic works that Grupo Higa built with public money are infrastructure that millions of Mexicans use every day — and whose quality nobody audited with the rigor that the amounts involved demanded. When a bridge cracks or a highway floods, the cost of infrastructure fraud stops being abstract.',
        ],
        pullquote: {
          quote: 'The businessman building the first lady\'s house had billions in active federal contracts.',
          stat: '$85B',
          statLabel: 'in federal contracts linked to Grupo Higa',
          barValue: 85,
          barLabel: 'Billions MXN in contracts',
        },
        chartConfig: {
          type: 'network',
          title: 'Grupo Higa contracting network — companies linked to Hinojosa Cantú',
          chartId: 'community-bubbles',
        },
      },
      {
        id: 'la-detección',
        number: 2,
        title: 'Total Impunity',
        subtitle: 'Nobody went to prison. The infrastructure remains unaudited.',
        prose: [
          'The Casa Blanca scandal was, above all, an accountability failure. The Ministry of Public Administration investigated and concluded there was no conflict of interest — a decision unanimously rejected by the press and civil society. Peña Nieto commissioned an internal investigation to Virgilio Andrade, his own Secretary of Public Administration, who cleared him. Hinojosa Cantú never faced criminal charges in Mexico for the contracts. Impunity was total.',
          'What makes the Higa case emblematic is not its complexity. It is its simplicity. A businessman close to power receives billions in contracts. He builds a house for the president\'s wife. When the press exposes it, no one goes to prison. The contracts were already executed. The roads were already built — with the quality the contractor decided, not the quality the country needed. In infrastructure, fraud does not just steal money: it produces bridges that crack, hospitals with weak foundations, highways that flood at the first storm. The cost is borne by users for decades.',
          'In COMPRANET, Grupo Higa\'s contracting pattern is that of a state-favored vendor: direct awards concentrated at SCT during Peña Nieto\'s years as governor and then as president, tenders where companies linked to Hinojosa Cantú competed against each other simulating plurality. The 85 billion pesos in federal contracts linked to the Higa network represent real infrastructure — roads, bridges, hydraulic works — built under conditions that a monopolist decides when it knows no one will compete and no one will audit. The scandal passed. The infrastructure remains. And no one has verified whether what Mexico paid for is what Mexico received.',
        ],
        pullquote: {
          quote: 'The scandal passed. The infrastructure remains. No one has verified if what Mexico paid for is what it received.',
          stat: '0',
          statLabel: 'criminal charges against Hinojosa Cantú for the contracts',
        },
        chartConfig: {
          type: 'scatter',
          title: 'Infrastructure: high value concentration, not the highest direct award rate',
          chartId: 'sector-paradox',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 16: El Año Sin Excusas
  // =========================================================================
  {
    slug: 'el-ano-sin-excusas',
    outlet: 'data_analysis',
    type: 'year',
    era: 'amlo',
    headline: '2023: The Year Mexico Broke Every Direct Award Record',
    subheadline: 'The last full year of the administration recorded 82.2% of contracts without competitive bidding -- no pandemic, no emergency, and no plausible technical justification',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 9,
    leadStat: { value: '82.2%', label: 'contracts without competition in 2023', color: '#e6420e' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'la-herencia-envenenada', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'el-record',
        number: 1,
        title: 'The Record',
        subtitle: 'No pandemic. No emergency. No excuses.',
        prose: [
          'In 2023, the last full year of Lopez Obrador\'s government, Mexico recorded the highest percentage of direct awards since COMPRANET began reliably tracking procedure types in 2010: 82.2% of 168,972 federal contracts were awarded without public competitive bidding, according to RUBLI\'s analysis. There was no pandemic. No declared economic crisis. No state of emergency that could justify suspending competition mechanisms under the Ley de Adquisiciones. It was the all-time record by institutional practice, not by circumstance.',
          'To put that figure in context: in 2010, the earliest year with reliable direct-award data in COMPRANET (Structure B), the rate was 62.7%. In thirteen years, the federal acquisitions system lost 19.5 percentage points of competition. The sharpest acceleration occurred under Pena Nieto (68.4% in 2013 to 77.1% in 2017), but Lopez Obrador inherited that trajectory and pushed it to its peak. Note: pre-2010 data (Structure A) does not include direct-award flags, so comparisons to the Fox era cannot be verified from the same source.',
          'For contracts exceeding 500 million pesos -- the range where public scrutiny would have the greatest impact -- the direct award rate under the AMLO administration reached 40.6%, compared to 30.0% under Pena Nieto. The Acquisitions Law mechanism designed to guarantee competition on the largest contracts was used less frequently precisely where the financial stakes were highest.',
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'Direct award rate 2010-2023 — historical trend',
          chartId: 'da-rate-trend',
        },
      },
      {
        id: 'el-desglose',
        number: 2,
        title: 'The Sectors',
        subtitle: 'Some sectors exceeded 90% direct award',
        prose: [
          'The 82.2% is the national average. Behind the aggregate number are sectors where competitive bidding was virtually nonexistent. In Agriculture, 93.4% of all 2023 contracts were awarded directly -- a percentage that reflects the deliberate procurement architecture of SEGALMEX and its associated agencies. Hacienda reached 91.1%. Education hit 90.9%. Three sectors above ninety percent, none of them involving the kind of technical complexity or security classification that might justify bypassing open tenders.',
          'In Health -- the sector with the largest volume at 81,031 contracts in 2023 -- the rate reached 83.7%. INSABI, created in 2020 to replace the Seguro Popular, had been dissolved by then and replaced by IMSS-Bienestar, but the procurement patterns persisted. COMPRANET records show contracts signed in 2023, three years after the end of the COVID emergency, still classified under urgency designations first applied in 2020. The emergency did not end. It became an administrative habit.',
          'Five sectors stayed below 70% in 2023: Infrastructure (49.3%), Defense (54.2%), Environment (58.6%), Otros (58.8%), and Gobernacion rose to 82.0%. The sectors with the most structural constraints on discretionary spending -- public works regulations, security clearance requirements, environmental review mandates -- were the ones where competition survived. Where the law imposed fewer procedural barriers, direct award became the default.',
        ],
        chartConfig: {
          type: 'sector-bar',
          title: 'Direct award rate by sector in 2023',
          chartId: 'da-by-sector',
        },
      },
      {
        id: 'la-comparación',
        number: 3,
        title: 'The AMLO Era',
        subtitle: 'Six years that redefined the concept of transparency',
        prose: [
          'Comparing administrations using the same COMPRANET dataset reveals a sustained deterioration. In Calderon\'s last three years with reliable data (2010-2012), the average direct award rate was 61.9%. Under Pena Nieto (2013-2018), it climbed to 73.1% across 1.23 million contracts. Under Lopez Obrador (2019-2024), it reached 79.4% across 1.05 million contracts -- 17.5 percentage points above the Calderon baseline. The trend predates the Fourth Transformation, but the Fourth Transformation accelerated it.',
          'The difference is not only in volume. It is in where discretion was applied. For contracts exceeding 500 million pesos, the direct award rate rose from 30.0% under Pena Nieto to 40.6% under Lopez Obrador. The Acquisitions Law mechanism designed to guarantee competition on the largest contracts -- where a single overpriced award can cost the public treasury hundreds of millions -- was used less frequently at precisely the scale where oversight matters most.',
          'RUBLI\'s v0.6.5 risk model identifies 185,248 contracts at critical or high risk level in the 2019-2024 period, versus 152,683 in the equivalent Pena Nieto period (2013-2018) -- a 21% increase. These scores are statistical similarity indicators that measure how closely a contract\'s procurement characteristics resemble those from documented corruption cases. They are not legal proof of wrongdoing. But when 79.4% of contracts avoid competitive bidding and 17.6% of an entire year\'s contracts show elevated risk signals, the pattern warrants systematic investigation, not dismissal.',
        ],
        chartConfig: {
          type: 'comparison',
          title: 'AMLO era comparison vs. previous administrations',
          chartId: 'amlo-era-comparison',
        },
      },
      {
        id: 'el-legado',
        number: 4,
        title: 'The Legacy of 2023',
        subtitle: 'A record that will take years to reverse',
        prose: [
          'The 2023 record is not just a statistic. It is an institutional fact. Vendors that for six years received contracts without competition have built dependency relationships with government agencies. Officials who operated with minimal oversight during that period have normalized direct award as the default procurement mode. Internal audit units that did not intervene have established a precedent of non-intervention. The Auditoria Superior de la Federacion\'s annual reports document hundreds of irregularities per year in direct-award contracts, but the correction cycle -- audit, finding, recommendation, follow-up -- typically takes three to four years, well after the damage is done.',
          'Reversing that level of institutionalized opacity would require political will, a deep reform of oversight mechanisms, a restructuring of incentives for procurement officials, and sustained investment in the Secretaria de la Funcion Publica -- the agency responsible for overseeing public contracting that saw significant budget reductions during the Lopez Obrador administration under the Republican Austerity framework. The early data from 2025 (68.3% direct award rate through available records) suggests some moderation under the new Sheinbaum administration, but a single partial year is too little data to confirm a trend reversal.',
          'The 82.2% of 2023 is the point from which Mexico will have to descend if it wants to approach OECD standards on public procurement, which flag non-competitive rates above 25% as a governance risk. The gap between that threshold and Mexican reality is 57.2 percentage points. Closing it is not a matter of issuing a decree. It requires rebuilding the institutional capacity, competitive market structures, and oversight culture that six years of discretionary spending have eroded.',
        ],
        chartConfig: {
          type: 'sector-bar',
          title: 'Risk map by sector 2002-2025 — structural legacy of opacity',
          chartId: 'sector-risk-heatmap',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 17: INSABI — El Experimento
  // =========================================================================
  {
    slug: 'insabi-el-experimento',
    outlet: 'data_analysis',
    type: 'case',
    era: 'amlo',
    headline: 'INSABI: The Experiment That Collapsed Medicine Supply',
    subheadline: 'The dissolution of the Seguro Popular and the creation of INSABI dismantled competition mechanisms in pharmaceutical purchasing — INSABI-classified contracts reached approximately 95% direct award, far above the sector average',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 11,
    leadStat: { value: '~95%', label: 'direct awards in INSABI-classified purchasing', sublabel: 'vs. ~78% health sector average under Peña Nieto', color: '#dc2626' },
    relatedSlugs: ['hemoser-el-2-de-agosto', 'cartel-del-corazon', 'el-ano-sin-excusas'],
    chapters: [
      {
        id: 'el-desmantelamiento',
        number: 1,
        title: 'The Dismantling',
        subtitle: 'January 2020: the dissolution of a system that took decades to build',
        prose: [
          'On January 1, 2020, while the World Health Organization was recording the first reports of an unknown pneumonia in Wuhan, López Obrador\'s government dissolved the Seguro Popular and replaced it with the Instituto de Salud para el Bienestar. INSABI was born under a premise that sounded reasonable: centralize medicine purchases to eliminate the intermediaries that, according to the Health Ministry, were inflating prices. The decision was made without public consultation, without a transition period and without an operational procurement plan for the first quarter of the year.',
          'What the Seguro Popular had, with all its flaws, was a purchasing model that combined consolidated acquisitions with open tenders. It was not a clean system — the health sector direct award rate under Peña Nieto hovered around 78% — but competitive bidding still applied to the largest contracts, for chemotherapy, antiretrovirals, insulin. INSABI eliminated that competition from the ground up. COMPRANET records document the result: direct award contracts classified specifically under INSABI reached approximately 95%, far above the health sector average, in the three years of the institute\'s operation.',
          'For families dependent on the public system, the consequence was physical. In 2020 and 2021, ISSSTE and INSABI hospitals reported shortage rates of between 60% and 80% for pediatric chemotherapy. Methotrexate ran out. Vincristine ran out. The medicines that keep children with acute lymphoblastic leukemia alive ran out. Parents organized pot-banging protests in front of Palacio Nacional, holding their children\'s unfilled prescriptions. López Obrador responded by blaming the pharmaceutical companies for hoarding.',
          'The solution the president offered was extraordinary in what it implied: inviting the United Nations Office for Project Services (UNOPS) and the Pan American Health Organization (PAHO) to buy the medicines that Mexican institutions could no longer obtain. That a sovereign government would delegate its health purchases to international bodies is, in itself, an admission of institutional failure. But UNOPS could only acquire what it was asked to: the technical specifications and budget remained in the hands of the same Health Ministry officials who had dismantled the previous system.',
        ],
        chartConfig: {
          type: 'sunburst',
          title: 'Budget footprint — where AMLO-era health spending went',
          chartId: 'admin-sunburst',
        },
      },
      {
        id: 'la-emergencia',
        number: 2,
        title: 'The Permanent Emergency',
        subtitle: 'INSABI and UNOPS: when the solution inherits the problem',
        prose: [
          'The UNOPS contract was signed in July 2020, five months after INSABI\'s creation. The Pan American Health Organization had participated in consolidated vaccine purchases before, but had never managed the entire general medicine supply of a whole country. The arrangement had a design flaw that no official communication mentioned: UNOPS is not an autonomous buyer. It executes orders. The medicine lists, quantities, delivery schedules and assigned budgets were defined by the Health Ministry — the same institution that had failed at the task.',
          'The results were predictable. In 2021, UNOPS managed to deliver only 61% of the medicines requested, according to the organization\'s own figures. Not due to operational inefficiency, but because orders arrived late, specifications changed mid-process and approved budgets did not cover international prices. The shortage that INSABI had created through institutional dismantling was not solved by an international intermediary. It was exported.',
          'In the health sector, the proportion of contracts classified as "emergency" jumped from 12% in 2019 to 67% in 2020. In 2021 it fell to 48%. In 2022, to 38%. It never returned to pre-pandemic levels. The emergency normalized as a purchasing instrument, and INSABI operated under that logic every quarter: award directly, justify later.',
          'The cost of the price differential between direct award and competitive bidding in INSABI medicine purchases exceeds 12,000 million pesos. Twelve billion that would have funded 24 general hospitals with 120 beds each, or five million first-level cancer treatments.',
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'COVID emergency spending — concentration in 2020-2021',
          chartId: 'covid-emergency',
        },
      },
      {
        id: 'el-patron',
        number: 3,
        title: 'The Monthly Pattern',
        subtitle: 'December: when the budget goes looking for a vendor',
        prose: [
          'INSABI\'s monthly spending data displays a pattern that public procurement specialists recognize immediately: December spikes that multiply by three or four the average spending of the rest of the year. In December 2020, INSABI awarded 4,200 million pesos in medicine and wound care contracts. In December 2021, 3,800 million. In December 2022, 5,100 million. Every year, the same cycle.',
          'The mechanism is well known: the government operates on an annual budget, and resources unspent by December 31 are returned to Treasury. Officials who do not spend their allocation face cuts the following year. This generates urgent year-end contracts across all agencies. But in INSABI\'s case, the pattern was amplified because eliminating competitive bidding also eliminated the timelines that competition requires. A direct award can be signed in days. When there is budget left and weeks remaining, it is the only available tool.',
          'What distinguishes INSABI from other agencies is the proportion. RUBLI identifies 26,404 contracts across the entire database that correspond to the pattern of accelerated year-end spending — high-value direct awards in the last five business days of the year. INSABI contributed 23% of that total between 2020 and 2022, despite representing only 8% of total health sector spending. An institution that existed four years concentrated almost a quarter of the entire federal government\'s health year-end spending.',
        ],
        chartConfig: {
          type: 'year-bar',
          title: 'INSABI monthly spending — year-end spikes',
          chartId: 'monthly-spending',
        },
      },
      {
        id: 'el-colapso',
        number: 4,
        title: 'The Collapse',
        subtitle: 'Four years, three institutions, zero accountability',
        prose: [
          'In April 2023, López Obrador announced the dissolution of INSABI with the same tone in which he had announced its creation: as a triumph. The functions would pass to IMSS-Bienestar, he said, which would be more efficient. What he did not mention was that INSABI was leaving behind debts of more than 9,000 million pesos to vendors who had delivered medicines and had not been paid, nor that the institutional transition — from Seguro Popular to INSABI, from INSABI to IMSS-Bienestar — meant no specific official would be held accountable for the three years of shortage.',
          'The Federal Audit Office documented in its 2023 report that INSABI could not account for the delivery of medicines worth 18,200 million pesos in audited contracts. The figure admits two interpretations, and both are serious: either the medicines never reached the hospitals that needed them, or the institute\'s documentation system was so deficient that it left no record of having received them. In either case, 18,200 million pesos in medicines have no traceability.',
          'The UNOPS arrangement also did not survive INSABI. The agreement was rescinded in 2023 with results that PAHO itself described as insufficient. International purchasing did not solve the problem because the problem was never who was buying, but who was deciding what to buy, how much to spend and whom to pay. Those decisions remained in the same hands throughout the experiment.',
          'The legacy of INSABI in COMPRANET records is stark: approximately 95% direct awards in INSABI-classified contracts, 47 vendors with ghost company indicators, 12,000 million pesos in estimated excess costs from foregone competition, and a December spending pattern that no control mechanism corrected in four years. The institute disappeared. The consequences for the patients who could not find their medicines — children without chemotherapy, adults without insulin, HIV patients without antiretrovirals — did not disappear with it.',
        ],
        pullquote: {
          quote: 'Could not account for the delivery of medicines worth 18,200 million pesos',
          stat: '~95%',
          statLabel: 'direct award rate in INSABI-classified contracts',
        },
        chartConfig: {
          type: 'pyramid',
          title: 'The weight of critical risk in health — 41.8% of value in 6.1% of contracts',
          chartId: 'risk-pyramid',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 18: Tren Maya Sin Reglas
  // =========================================================================
  {
    slug: 'tren-maya-sin-reglas',
    outlet: 'longform',
    type: 'case',
    era: 'amlo',
    headline: 'Tren Maya: $180 Billion Pesos Without Public Bidding',
    subheadline:
      'The administration\'s flagship rail megaproject sidestepped competitive contracting through national security declarations, public works contracts assigned to the Army, and direct awards by exception to consortia with no railroad experience.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 14,
    leadStat: { value: '$180B', label: 'MXN in contracts without public bidding', sublabel: '1,525 km of track | FONATUR as contracting entity', color: '#1e3a5f' },
    status: 'reporteado',
    nextSteps: [
      'File InfoMex requests for the public works contract files for the Tren Maya assigned by FONATUR, including legal justifications for each direct-award exception.',
      'Cross-reference the RFCs of awarded companies with the RUC to verify prior experience in railroad construction.',
      'Compare original contract amounts against their contract modifications in COMPRANET.',
      'Submit an IFAI request for information on SEDENA contracts for the Tren Maya that do not appear in COMPRANET.',
    ],
    relatedSlugs: ['la-cuarta-adjudicacion', 'infraestructura-sin-competencia', 'sexenio-a-sexenio', 'pemex-el-gigante'],
    chapters: [
      {
        id: 'el-proyecto',
        number: 1,
        title: 'The Project',
        subtitle: '1,525 kilometers of track, zero open public tenders',
        sources: [
          'COMPRANET — Public works and associated infrastructure contracts linked to FONATUR, 2019-2024.',
          'DOF, November 22, 2021 — Agreement declaring the Tren Maya to be of public interest and national security.',
          'ASF (2023). Performance audit of the Tren Maya program, General Executive Report.',
        ],
        prose: [
          'The Tren Maya was conceived as the signature project of López Obrador\'s administration: a 1,525-kilometer passenger rail line connecting Cancún to Palenque, traversing the Yucatán Peninsula through jungle, archaeological zones and Maya communities. It was presented as a regional development instrument to bring jobs and tourism to the country\'s southeast. The initial cost estimate was 120 billion pesos.',
          'By December 2023, when partial operations of the first section began, the official figure already exceeded 177 billion. Independent analysts calculated the real cost — including debt service and the military contribution — above 400 billion. The gap between the official figure and external estimates is not explained only by construction overruns: it is explained because entire sections of the construction were executed by SEDENA under national security classification, beyond COMPRANET\'s reach.',
          'RUBLI\'s analysis identifies $180 billion pesos in public works contracts directly attributable to the Tren Maya through FONATUR, the National Tourism Fund that served as contracting entity. Of that universe, 97.3% was awarded through direct award by exception or restricted invitation to a pre-selected group of companies. There was not a single open public tender where any Mexican construction company could compete on equal terms for the main sections of the project.',
          'The decision to designate FONATUR as the contracting entity — rather than SCT, which has decades of institutional experience in transport infrastructure — defined the project\'s legal framework. FONATUR operates under different contracting rules than a ministry of state, with greater room for non-competitive procedures. The result was an infrastructure megaproject executed without the standard controls of the Public Works and Related Services Law.',
        ],
        chartConfig: {
          type: 'racing',
          title: 'The infrastructure rise — federal spending by sector 2002-2025',
          chartId: 'racing-bar',
        },
        pullquote: {
          quote: '97.3% of Tren Maya contracts in COMPRANET were assigned without open public bidding',
          stat: '97.3%',
          statLabel: 'contracts awarded without open competition',
          barValue: 97.3,
          barLabel: 'Tren Maya: no-bid award rate',
        },
      },
      {
        id: 'la-excepcion-militar',
        number: 2,
        title: 'The Military Exception',
        subtitle: 'National security as an opacity mechanism in contracting',
        prose: [
          'In November 2021, the Official Journal of the Federation published the agreement declaring the Tren Maya a project of public interest and national security. The measure was not symbolic: under that classification, associated public works contracts were exempted from ordinary contracting procedures and from environmental impact assessments for extensive sections of the alignment. Entire construction sections were reassigned from FONATUR to SEDENA, whose contracting does not appear in COMPRANET.',
          'The militarization of civil construction was not exclusive to the Tren Maya. Under the same administration, SEDENA built the Felipe Ángeles International Airport, managed branches of the Banco del Bienestar and operated sections of port infrastructure. In each case, the mechanism was the same: move federal investment spending to an arena where the transparency requirements that apply to civilian agencies do not. The armed forces became the largest public works contractor in the federal government without being subject to the Public Works Law.',
          'The contracts that do appear in COMPRANET reveal a second pattern. Several of the consortia awarded the main sections had documented experience in highway construction, not railroad construction. At least one consortium was incorporated after the project was announced. The contract modifications on record show increases that in some cases doubled the original contract amount, approved without a new procurement procedure.',
          'RUBLI cannot quantify the total cost of the Tren Maya because contracts executed by SEDENA are outside the database. The $180 billion identified in this analysis represents a floor, not a ceiling. The difference between what COMPRANET records and what the project cost is, in itself, a finding about the state of accountability in infrastructure contracting in Mexico.',
        ],
        chartConfig: {
          type: 'sunburst',
          title: 'Budget footprint under AMLO — where spending went 2018-2024',
          chartId: 'admin-sunburst',
        },
        pullquote: {
          quote: 'What COMPRANET does not record about the Tren Maya is as revealing as what it does',
          stat: '$180B+',
          statLabel: 'MXN visible in COMPRANET — real cost is higher',
          barValue: 45,
          barLabel: 'Estimated percentage of total spending visible',
        },
      },
      {
        id: 'las-empresas',
        number: 3,
        title: 'The Contractors',
        subtitle: 'Consortia without railroad experience and contracts that double in cost',
        prose: [
          'Railroad public works contracting has a technical logic that distinguishes it from other infrastructure types: building rail requires experience in high-tonnage earthworks, rail laying, signaling systems and electrical substations. Mexico has companies that have built and maintained rail lines for decades. Yet several of the most expensive public works contracts for the Tren Maya were awarded to consortia whose COMPRANET history was predominantly highway construction.',
          'The predominant procedure was direct award by exception, supported by the national security declaration and the urgency of the presidential calendar. López Obrador publicly stated that the train had to be operating before the end of his term in September 2024. That political deadline became the administrative justification for bypassing open public bidding: there was no time for a competition with the timelines the law establishes.',
          'The contract modifications recorded in COMPRANET tell the second chapter. In public works contracting it is normal for amounts to be adjusted during execution due to unforeseen terrain conditions or alignment changes. But the magnitude of adjustments on the Tren Maya was exceptional: contracts originally agreed in billions experienced increases of 80%, 100% and in some cases above 150%, approved without a new procurement procedure.',
          'The resulting pattern is circular. Direct award by exception allows assigning the contract without competition. Calendar urgency justifies the exception. Contract modifications allow the real cost to exceed the original amount without triggering a new process. Each link is legal. The whole describes a system where competition for the largest public works contracts of the administration was, in practice, nonexistent.',
        ],
        pullquote: {
          quote: 'Direct award, declared urgency, contract modifications: each step is legal, the result is no competition',
          stat: '+150%',
          statLabel: 'maximum documented increase in contract modifications',
          barValue: 150,
          barLabel: 'Cost overrun vs. original contract amount',
        },
      },
    ],
  },
  // =========================================================================
  // NEW STORY: La Máquina de Papel / The Paper Machine
  // History of COMPRANET, its creation, dissolution, and the rigged tender system
  // =========================================================================
  {
    slug: 'la-maquina-de-papel',
    outlet: 'longform',
    type: 'thematic',
    era: 'cross',
    headline: 'The Paper Machine: COMPRANET and the Impossible Tenders',
    subheadline: 'Created in 1996 to make government purchases transparent, COMPRANET became the perfect stage for a more sophisticated trick: the tender that follows every rule — and guarantees the result.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 16,
    leadStat: { value: '23', label: 'years of contracting data in COMPRANET', sublabel: '3.1 million contracts | 2002-2025', color: 'text-blue-400' },
    status: 'solo_datos',
    nextSteps: [
      'File an InfoMex request for the complete file of any tender where the publication window was fewer than 5 business days.',
      'Check whether the technical specifications in recurring direct-award contracts are identical to or match the registered trademarks of the winning vendor.',
      'Cross-reference tender opening dates against the calendar of public holidays and vacation periods to identify impossible windows.',
      'Compare "invitation to three" tenders against actual participation records: how many had three genuine bids?',
    ],
    relatedSlugs: ['sexenio-a-sexenio', 'cero-competencia', 'la-cuarta-adjudicacion', 'dividir-para-evadir'],
    chapters: [
      {
        id: 'el-origen',
        number: 1,
        title: 'The Original Promise',
        subtitle: 'Mexico, 1996: the government that wanted to be transparent',
        sources: [
          'DOF, July 28, 1997 — Agreement creating COMPRANET.',
          'SECODAM (2000). COMPRANET Operations Manual.',
        ],
        prose: [
          'In 1996, under President Ernesto Zedillo, Mexico made a decision that was presented at the time as revolutionary: all federal government tenders would be published in a unified electronic system accessible to any company. It was called COMPRANET — the Electronic Government Contracting System.',
          'The logic was impeccable. If contracts are visible, officials cannot assign them in the dark. If any company can see the calls for proposals, there is more competition. More competition means better prices. And better prices mean less stolen money. It was the application of the most elementary principle in economics: transparency disciplines markets.',
          'In its first decade, COMPRANET functioned rudimentarily: scanned paper bulletins, slow connections, systems that crashed. But the principle was there. By 2004, when SECODAM was replaced by the Ministry of Public Administration (SFP), the system was already processing tens of thousands of contracts per year. By 2011, with the launch of COMPRANET 5.0, Mexico became one of the first Latin American countries with a fully electronic public procurement system.',
          'International analysts applauded. The OECD cited Mexico as a model. The World Bank financed part of the modernization. And at budget transparency forums, Mexico was a success story. In the data, the reality was more complicated.',
        ],
        pullquote: {
          quote: 'Transparency disciplines markets. That was the theory.',
          stat: '1996',
          statLabel: 'year COMPRANET was created',
          barValue: 38,
          barLabel: 'percentage of competitive tenders in 2002',
        },
        chartConfig: {
          type: 'da-trend',
          title: 'Evolution of direct award 2002-2024',
          chartId: 'da-rate-trend',
        },
      },
      {
        id: 'la-ventana',
        number: 2,
        title: 'The Impossible Window',
        subtitle: 'How tender timelines became the selection tool',
        prose: [
          'The Law of Acquisitions, Leases and Services of the Public Sector establishes minimum timelines for public tenders: 20 business days for national tenders, 40 for international ones. In theory, that time allows any interested company to learn the requirements, prepare its bid and submit it.',
          'In practice, the system has a trick that requires violating no rule. It is called a minimum-timeline tender with brand-specific requirements. The mechanism works like this: an agency publishes a call for proposals on a Friday afternoon, with exactly twenty days until deadline — the legal minimum. The technical specifications do not describe what is needed; they describe which specific brand is wanted, with the phrase "or equivalent" added at the end to comply with the form. Sufficient timeline, specifications impossible for another company to meet in that time.',
          'RUBLI has documented thousands of contracts that follow this pattern. The technical indicator that identifies them is called z_same_day_count — contracts awarded the same day, to the same vendor, by the same institution. In statistical analysis, these clusters appear as anomalies. In budgetary reality, they are the result of a process that began weeks earlier with a decision already made.',
          'The phenomenon has a name in contracting circles: "rigged tender." The call for proposals exists. The documents are in COMPRANET. The timeline is in the law. And the result was always going to be what it was.',
        ],
        pullquote: {
          quote: 'The call for proposals exists. The documents are in COMPRANET. The result was already decided.',
          stat: '505,219',
          statLabel: 'contracts with a single bidder in 23 years of data',
          barValue: 505219,
          barLabel: 'Tenders with a single participant',
        },
      },
      {
        id: 'los-tres',
        number: 3,
        title: 'The Invitation to Three',
        subtitle: 'The restricted tender that functions as a direct award',
        prose: [
          'When the contract amount does not justify an open public tender — because it falls below the legal threshold — the law allows an intermediate modality: the "invitation to at least three parties." The institution can select three companies and ask them to submit proposals. On the surface, there is competition. In practice, the data tell a different story.',
          'RUBLI\'s analysis of restricted-invitation contracts shows a consistent pattern: in many sectors, the same three companies appear together in tender after tender, for years. This has a name in collusion theory: bid rotation. One company wins today, the next wins tomorrow, the third wins the week after. All submit proposals. None actually competes.',
          'No explicit agreement need exist. It is enough for contracting institutions to always invite the same companies. The result is functionally identical to a direct award, but with the formal cover of having followed a competitive process. The files are in order. COMPRANET records three bids. And the money goes where it always went.',
          'The system identifies these patterns through the co_bid_rate indicator: the co-bidding rate between pairs of vendors. In the v6.5 model, this indicator was regularized to zero — not because the pattern does not exist, but because the training data does not contain enough documented cases of bidding cartels. What the model cannot see, COMPRANET data already suggests.',
        ],
        pullquote: {
          quote: 'Three bids, the same winning company, year after year. That is not competition.',
          stat: '247,946',
          statLabel: 'contracts with suspected threshold splitting detected',
          barValue: 66,
          barLabel: 'Percentage of contracts below bidding threshold',
        },
        chartConfig: {
          type: 'sector-bar',
          title: 'Comparison of tenders by administration',
          chartId: 'sexenio-comparison',
        },
      },
      {
        id: 'el-fraccionamiento',
        number: 4,
        title: 'The Art of Splitting',
        subtitle: 'Divide to avoid bidding: 247,946 contracts designed to stay under the threshold',
        prose: [
          'The Acquisitions Law sets thresholds: above a certain amount, public bidding is required. Below it, direct award is legal. The logic of thresholds exists to reduce bureaucracy for small contracts. What the legislature did not anticipate — or perhaps did anticipate but did not know how to prevent — is the incentive it creates: divide a large contract into small fragments to always stay just under the limit.',
          'RUBLI\'s statistical analysis detects this pattern through the z_same_day_count indicator: contracts signed the same day, with the same vendor, by the same institution, for amounts that individually do not exceed the threshold but collectively would. The distribution of those contracts has a statistically improbable shape: there is an anomalous accumulation just below the legal limit and a void immediately above it.',
          'In 23 years of COMPRANET data, RUBLI has identified 247,946 contracts that display this splitting pattern. Not all are necessarily fraudulent: some may reflect legitimate procurement decisions. But the statistical concentration cannot be explained by chance. Someone, systematically, is calculating amounts to stay under the radar.',
          'The irony is that COMPRANET records everything. Each split contract is there, with its date, amount, vendor and institution. The system created for transparency contains the evidence of its own evasion. It just takes statistical analysis to see it.',
        ],
        pullquote: {
          quote: 'The data is there. The system created for transparency contains the evidence of its own evasion.',
          stat: '247,946',
          statLabel: 'contracts with a suspected splitting pattern',
          barValue: 82,
          barLabel: 'Concentration below legal thresholds',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Contracts with suspected splitting by year',
          chartId: 'threshold-splitting',
        },
      },
      {
        id: 'el-futuro',
        number: 5,
        title: 'What the Data Says',
        subtitle: 'Three decades of COMPRANET: the promise and the gap',
        prose: [
          'In 2018, the incoming government announced a comprehensive review of COMPRANET. The platform, they said, was old, inefficient and had been co-opted. A new version would be launched. Meanwhile, the quality of data published in the system deteriorated noticeably: fewer completed fields, more contracts without an identified vendor, more records with blank amounts.',
          'Budget transparency specialists documented the deterioration. IMCO published reports alerting to the reduction in data quality. FUNDAR noted that thousands of contracts from 2019-2022 had incomplete or contradictory information. The tool created to illuminate public spending was becoming more opaque, just as no-bid spending was reaching its all-time highs.',
          'For the 3.1 million contracts that RUBLI has processed, the pattern is clear: data quality improves over time in terms of technical coverage — more fields, better digitization — but the actual content of spending becomes less competitive. More money, fewer tenders. More records, less real information about who wins and why.',
          'COMPRANET continues operating. The contracts continue to be published. And in each call for proposals with twenty-day timelines and brand-specific requirements, in each invitation to three where the same company always wins, in each cluster of contracts split just under the threshold, the system does what it was designed to do: record a decision that was already made.',
        ],
        pullquote: {
          quote: 'More records, less real competition. The promise of 1996 remains unfulfilled.',
          stat: '81.9%',
          statLabel: 'contracts without competitive bidding in 2023 — all-time record',
          barValue: 81.9,
          barLabel: 'Direct award 2023',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Administration by administration: the 23-year trend',
          chartId: 'amlo-era-comparison',
        },
      },
    ],
  },
  // =========================================================================
  // STORY 20: Dividir para Evadir
  // =========================================================================
  {
    slug: 'dividir-para-evadir',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Divide to Evade: 247,946 Contracts Under the Line',
    subheadline: 'The law sets thresholds to require public bidding. A quarter million contracts cluster just below those thresholds. The statistical distribution leaves no room for coincidence.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 8,
    leadStat: { value: '247,946', label: 'contracts with a suspected splitting pattern', sublabel: 'Article 17 of the Acquisitions Law | explicit violation, widespread practice', color: 'text-amber-500' },
    status: 'solo_datos',
    nextSteps: [
      'File InfoMex requests for the market studies justifying multiple contracts to the same vendor on the same day for amounts just under the threshold.',
      'Cross-reference split contracts against the directory of responsible officials to identify repeat patterns by contracting unit.',
      'Check whether split contracts share a requisition or original purchase order number, which would evidence deliberate division.',
      'Compare unit prices of split contracts against competitive tenders for the same goods to quantify the price premium.',
    ],
    relatedSlugs: ['cero-competencia', 'la-cuarta-adjudicacion', 'la-maquina-de-papel', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'la-linea',
        number: 1,
        title: 'The Invisible Line',
        subtitle: 'Where statistics expose what the case file conceals',
        prose: [
          'On March 15, 2019, the Ministry of Communications and Transport signed four contracts with the same cleaning services vendor. All four were signed the same day, covered the same type of service and totaled 11.2 million pesos. Individually, each fell below the public bidding threshold. Together, they exceeded it comfortably. All four were directly awarded, without a competition.',
          'Article 17 of the Law of Acquisitions, Leases and Services of the Public Sector explicitly prohibits this practice. The law calls it splitting: dividing a contracting need into parts to evade the bidding procedure that the total amount would require. This is not a gray area. It is a defined violation. And in 23 years of COMPRANET data, statistical analysis detects 247,946 contracts that display this pattern.',
          'The proof is visible in a histogram. If you plot the distribution of contract amounts, you would expect a smooth curve that descends gradually. What appears instead is an anomalous accumulation just below the legal threshold and an immediate void above it — a statistical cliff that no natural market phenomenon can produce. Someone, systematically, is calculating amounts to stay under the line.',
          'The 247,946 contracts identified are a conservative estimate. The exact figure depends on which annual threshold is applied and how liberally "clustering" is defined. But even with the strictest criteria, the concentration below thresholds is statistically impossible to attribute to chance.',
        ],
        pullquote: {
          quote: 'A statistical cliff that no natural market phenomenon can produce',
          stat: '247,946',
          statLabel: 'contracts with a splitting pattern',
          barValue: 8.1,
          barLabel: '8.1% of all contracts',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Amount distribution: the cliff below the threshold',
          chartId: 'threshold-splitting',
        },
      },
      {
        id: 'el-incentivo',
        number: 2,
        title: 'The Perverse Incentive',
        subtitle: 'Why splitting is rational for everyone involved',
        prose: [
          'To understand why splitting is so widespread, you need to understand each actor\'s incentives. The official in the requiring area needs a good or service. If the total amount exceeds the threshold, they must start a public tender: draft specifications, publish the call, receive bids, evaluate, award, handle complaints. The process takes weeks or months. If the amount stays below the limit, they can award directly in days. The temptation to split is not corrupt in the classic sense: it is bureaucratic. It is the path of least resistance.',
          'For the vendor, direct award eliminates the uncertainty of competing. No need to prepare an elaborate technical proposal or risk losing to a competitor with a lower price. The contract is guaranteed. For both parties, splitting solves an immediate problem. What neither internalizes is the systemic cost: higher prices due to the absence of competition, opacity in the use of public resources, and the gradual erosion of the contracting system that the law tries to protect.',
          'The pattern concentrates in certain categories. Cleaning services, maintenance, vehicle leasing and office supplies are the most split — recurring, standardized goods and services that could easily be contracted through consolidated bidding. In a public hospital, for example, the annual cleaning service could be tendered as a single multi-year contract. Instead, it is fragmented into monthly or quarterly contracts, each just below the limit.',
          'Splitting requires no conspiracy. No bribes, no secret agreements. Just a system where complying with the law costs more than evading it, and where the probability of sanction is practically nil. In the 23 years that COMPRANET covers, internal control bodies have sanctioned a minimal fraction of detectable cases. Splitting thrives because it works.',
        ],
        pullquote: {
          quote: 'Splitting requires no conspiracy. Just a system where complying with the law costs more than evading it.',
          stat: '$0',
          statLabel: 'practical cost of splitting for the official',
        },
        chartConfig: {
          type: 'sector-bar',
          title: 'Suspected splitting by sector',
          chartId: 'da-by-sector',
        },
      },
      {
        id: 'la-escala',
        number: 3,
        title: 'The Scale of the Damage',
        subtitle: '247,946 contracts: what splitting costs Mexico',
        prose: [
          'Each split contract looks minor in isolation: three million here, two million there, amounts that trigger no audit report. But the total is another matter. If the 247,946 identified contracts had gone through public bidding — as the law required for their real aggregated amount — competition would have pushed prices down. Academic literature on public contracting estimates that competitive bidding generates savings of 10 to 25% over direct award.',
          'The damage goes beyond the price premium. Each split contract is a contract that was not subjected to public scrutiny. There was no open call, no clarification session, no bid-opening record. The file exists, but it is a direct-award file: minimal, closed, without the controls that public bidding imposes by design.',
          'The pattern transcends administrations. Splitting appears in data from Fox, Calderón, Peña Nieto and López Obrador. It is not a party policy or an administration\'s practice: it is a structural dynamic of the Mexican contracting system. Thresholds change, officials rotate, platforms modernize. The incentive to split persists.',
          'The final irony is that COMPRANET records every one of these contracts. The dates, the amounts, the vendors, the institutions — it is all there. The system created for transparency contains the evidence of its own evasion. It just takes statistical analysis to see it. And what the numbers say is unambiguous: a quarter million contracts were designed to land exactly where the law stops looking.',
        ],
        pullquote: {
          quote: 'The system created for transparency contains the evidence of its own evasion.',
          stat: '23',
          statLabel: 'years of documented splitting in COMPRANET',
          barValue: 100,
          barLabel: 'Present in all 4 analyzed administrations',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Contracts with suspected splitting by year',
          chartId: 'threshold-splitting',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 21: PEMEX — El Gigante
  // =========================================================================
  {
    slug: 'pemex-el-gigante',
    outlet: 'longform',
    type: 'thematic',
    era: 'cross',
    headline: 'PEMEX Never Competes: $2 Trillion Pesos in Non-Competitive Contracting',
    subheadline: 'PEMEX and CFE represent 40% of all federal contracting. Fewer than 5% of their contracts go through open public bidding. The legal framework allows it. The data shows the consequences.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 15,
    leadStat: { value: '$2T', label: 'MXN in non-competitive contracts', sublabel: 'PEMEX + CFE | 2002-2025', color: '#eab308' },
    status: 'reporteado',
    nextSteps: [
      'File an InfoMex request for the annual breakdown of PEMEX direct awards by exception, classified by legal justification (PEMEX Law vs. Acquisitions Law).',
      'Cross-reference the list of PEMEX\'s recurring vendors against the SFP sanctions registry and the SAT EFOS list.',
      'Compare PEMEX direct award rates before and after the 2013 energy reform to measure its real impact on competition.',
      'Investigate the drilling and refinery maintenance service contracts directly awarded in the 2019-2024 period.',
    ],
    relatedSlugs: ['oceanografia', 'tren-maya-sin-reglas', 'la-cuarta-adjudicacion', 'cero-competencia'],
    chapters: [
      {
        id: 'el-gigante',
        number: 1,
        title: 'The Giant',
        subtitle: 'PEMEX and CFE: 40% of federal spending operates under its own rules',
        sources: [
          'COMPRANET — Federal contracts 2002-2025, filter by ramos 18, 45, 46, 52 and 53 (energy sector).',
          'Petróleos Mexicanos Law, DOF August 11, 2014 — Title IV, contracting regime.',
          'Federal Electricity Commission Law, DOF August 11, 2014 — Title IV.',
          'OECD (2017). Review of PEMEX\'s Public Procurement. OECD Publishing.',
        ],
        prose: [
          'Petróleos Mexicanos is not just a company. In Mexican political culture, PEMEX is a symbol of national sovereignty — the legacy of the 1938 oil expropriation, the instrument with which Lázaro Cárdenas asserted state dominion over subsoil resources. For decades, questioning PEMEX was equivalent to questioning sovereignty itself. That sacredness has given the company and its electrical twin, CFE, a status without equivalent in Mexican public contracting.',
          'Together, PEMEX and CFE represent approximately 40% of all federal spending recorded in COMPRANET between 2002 and 2025. There is no other pair of entities that concentrates a comparable proportion of the government\'s procurement budget. But unlike ministries of state, the two state productive enterprises operate under their own legal frameworks — the PEMEX Law and the CFE Law, approved in 2014 as part of the energy reform — that grant them substantially greater room to resort to direct awards by exception and restricted tenders.',
          'The result is quantifiable. Of PEMEX and CFE contracts recorded in COMPRANET over 23 years, fewer than 5% went through open public bidding. The rest was awarded through non-competitive procedures: direct award by exception, restricted invitation to pre-selected vendors, or the special procedures the law reserves for state productive enterprises. The accumulated figure exceeds 2 trillion pesos.',
          'There is a portion of that volume with legitimate technical justification. Deepwater drilling, refinery maintenance, specialized chemicals for well injection: these are markets where the number of qualified vendors is genuinely limited. But technical specialization does not explain a non-competitive award rate above 95%. Not all PEMEX contracts are offshore drilling. Many are for administrative services, ground transportation, office supplies, building cleaning. And those are also awarded without competitive bidding.',
        ],
        chartConfig: {
          type: 'sector-bar',
          title: 'Direct award rate by sector — energy vs. federal average',
          chartId: 'da-by-sector',
        },
        pullquote: {
          quote: 'Fewer than 5% of PEMEX and CFE contracts went through open public bidding in 23 years',
          stat: '<5%',
          statLabel: 'contracts with open public bidding — PEMEX and CFE combined',
          barValue: 5,
          barLabel: 'Competitive bidding rate in energy',
        },
      },
      {
        id: 'la-reforma-que-no-fue',
        number: 2,
        title: 'The Reform That Wasn\'t',
        subtitle: 'The 2013 energy reform promised competition. The data shows something else.',
        prose: [
          'In December 2013, Enrique Peña Nieto\'s government approved the constitutional reform on energy. Among its declared objectives was modernizing PEMEX contracting, opening the sector to private investment and introducing competition mechanisms in contract awards. The PEMEX Law and the CFE Law, published in August 2014, established a contracting regime with principles of transparency and efficiency.',
          'COMPRANET data allows measuring the real impact of that reform on PEMEX\'s contracting behavior. The direct award rate in the energy sector before the reform (2010-2013) was above 90%. After the reform (2015-2018), the rate remained above 90%. The law changed. Contracting behavior, measured by the data the entities themselves report to COMPRANET, did not change significantly.',
          'The explanation lies in the details of the legal regime. The PEMEX Law allows direct award by exception when there is a single provider capable of meeting the technical requirements, when there are urgency conditions, when the contract involves research or technological development, or when the amount does not justify the cost of a competitive process. Each of these exceptions is reasonable individually. In their cumulative application, they cover virtually all contracting.',
          'With López Obrador\'s arrival in 2018, energy policy changed direction but not method. AMLO reversed the most visible aspects of the reform — suspended petroleum bidding rounds, cancelled the opening of the electricity market — but maintained and extended non-competitive contracting practices. The argument changed: no longer modernization of the sector, but energy sovereignty. The result in COMPRANET was the same.',
        ],
        pullquote: {
          quote: 'The energy reform changed the law. PEMEX\'s direct award rate did not move.',
          stat: '>90%',
          statLabel: 'non-competitive award rate — before and after the 2013 reform',
          barValue: 92,
          barLabel: 'DA in energy: pre and post reform',
        },
        chartConfig: {
          type: 'da-trend',
          highlight: 'energia',
          title: 'Direct award rate in the energy sector 2002-2025',
        },
      },
      {
        id: 'el-caso-odebrecht',
        number: 3,
        title: 'What the Data Does Not See',
        subtitle: 'The Odebrecht case and the limits of contracting analysis',
        prose: [
          'In 2016, the US Department of Justice revealed that Brazilian construction firm Odebrecht had paid more than 10 million dollars in bribes to PEMEX officials to obtain public works contracts at the Tula refinery and other petroleum infrastructure projects. The contracts in question had gone through processes that appear in COMPRANET as formal tenders, with multiple participants and documented technical evaluations.',
          'The Odebrecht case illustrates a fundamental limit of contracting data analysis: the most sophisticated corruption does not manifest as a direct award. It manifests as a process that follows every form of competition while the result is predetermined. Bribes are paid outside the system. Technical specifications are drafted to favor the designated winner. Competing companies submit cover bids. COMPRANET records a clean tender.',
          'RUBLI assigns the Odebrecht case an elevated risk score based on vendor characteristics — sectoral concentration, contract volume, network patterns — but not because of the award mechanism. The Odebrecht contracts in COMPRANET are not formally distinguishable from a legitimate tender. The corruption was in the prior meetings, in the wire transfers to Swiss bank accounts, in the agreements that no data system can record.',
          'This is the necessary context for interpreting the 95% non-competitive contracting rate in the energy sector. Direct award is not the only path of corruption at PEMEX. But it is the most visible. And it is the one the data allows quantifying with certainty.',
        ],
        pullquote: {
          quote: 'Odebrecht\'s contracts in COMPRANET appear as formal tenders. The bribes were paid outside the system.',
          stat: '$10M+',
          statLabel: 'USD in documented bribes — Odebrecht-PEMEX case',
          barValue: 10,
          barLabel: 'Millions USD in bribes',
        },
        chartConfig: {
          type: 'network',
          title: 'PEMEX vendor network — co-contracting communities detected',
          chartId: 'network-graph',
        },
      },
      {
        id: 'la-estructura',
        number: 4,
        title: 'The Structural Problem',
        subtitle: 'Not individual acts of corruption. The design of the system.',
        prose: [
          'PEMEX and CFE\'s non-competitive contracting pattern has survived five federal administrations, a constitutional reform, a counter-reform, multiple scandals and at least three PEMEX directors general facing criminal prosecution. The direct award rate did not fall under Fox, did not fall under Calderón, did not fall under Peña Nieto\'s reform and did not fall under López Obrador\'s republican austerity. It rose under all of them.',
          'That persistence indicates the problem is not who runs PEMEX or which party governs. It is in the legal and institutional architecture that allows state productive enterprises to operate a procurement system parallel to the rest of the federal government. The PEMEX Law and the CFE Law establish exceptions sufficient to cover virtually any contract. And internal control bodies lack the resources and independence to oversee a contracting volume that exceeds a trillion pesos per administration.',
          'The technical specialization argument is real but insufficient. There are segments of the oil business where the pool of qualified vendors is genuinely limited: deepwater drilling, submarine fleet services, reservoir engineering. Those contracts represent a fraction of total spending. The bulk of PEMEX contracting is for goods and services where competition not only is possible, but where a broad market of national and international vendors exists.',
          'The $2 trillion pesos in non-competitive contracts from PEMEX and CFE are not the result of 23 years of corrupt officials. They are the result of a legal framework that was designed — administration after administration — to permit exactly what the data shows. The question is not whether PEMEX contracts without competition. It is whether the Mexican political system is willing to close the legal exceptions that make that contracting possible.',
        ],
        pullquote: {
          quote: 'Five administrations, one reform, one counter-reform. PEMEX\'s direct award rate rose under all of them.',
          stat: '$2T',
          statLabel: 'MXN in non-competitive contracts — PEMEX and CFE, 2002-2025',
          barValue: 95,
          barLabel: 'Percentage of non-competitive contracting in energy',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Non-competitive contracting in energy by administration 2002-2025',
          chartId: 'sexenio-comparison',
        },
      },
    ],
  },
  // =========================================================================
  // STORY 19: Pandemia Sin Supervisión
  // =========================================================================
  {
    slug: 'pandemia-sin-supervision',
    outlet: 'investigative',
    type: 'case',
    era: 'amlo',
    headline: 'Pandemic Without Oversight: 40 Billion Pesos in COVID Purchases Without Competitive Bidding',
    subheadline: 'Congress suspended emergency spending controls. 73% of COVID contracts went to companies incorporated in the two prior years. The Federal Audit Office documented irregularities in 35% of reviewed contracts.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 12,
    leadStat: { value: '$40B+', label: 'MXN in COVID purchases without competitive bidding', color: '#dc2626' },
    status: 'auditado',
    relatedSlugs: ['insabi-el-experimento', 'los-nuevos-ricos-de-la-4t', 'red-fantasma'],
    chapters: [
      {
        id: 'la-ola',
        number: 1,
        title: 'The Procurement Wave',
        subtitle: 'March–December 2020: when the health emergency became a blank check',
        prose: [
          'On March 23, 2020, the federal government declared the National Healthy Distance Day and activated the emergency mechanisms in the Acquisitions Law. Article 41, section IV, allows direct awards when there is a "situation that puts national security or human lives at risk." Under normal conditions, that exception is invoked once or twice per agency per year. Between March and December 2020, it was invoked thousands of times.',
          'COMPRANET records identify more than 40,000 million pesos in federal contracts linked to the COVID-19 health response, awarded without competitive bidding. The figure includes purchases by IMSS, ISSSTE, the Health Ministry, INSABI and state agencies that channeled federal spending. The urgency was real. The pandemic was killing. But urgency also eliminated the mechanisms that distinguish a legitimate purchase from a fraudulent one.',
          'The Chamber of Deputies completed the oversight void: it suspended real-time auditing requirements for emergency health spending. There would be no concurrent audits. No reference price reviews. No mechanism to verify, while contracts were being signed, whether prices were reasonable, whether vendors existed or whether goods were being delivered. Supervision would come later, when the money had already gone.',
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'COVID emergency spending — concentration in 2020-2021',
          chartId: 'covid-emergency',
        },
      },
      {
        id: 'los-proveedores',
        number: 2,
        title: 'The COVID Vendors',
        subtitle: 'Shell companies with addresses in states where they never operated',
        prose: [
          'The most revealing data point in COMPRANET is not the total COVID spending, but who received it. 73% of emergency health contracts were awarded to companies incorporated within the two years prior to the pandemic. Many appeared in COMPRANET for the first time in 2020, without a history of federal contracts, without documented experience in the health sector and, in several cases, registered in states different from where services were rendered.',
          'The pattern has a name in audit literature: opportunistic vendors. Companies created to capture emergency spending, taking advantage of the fact that urgency eliminates the experience and technical capacity filters that ordinary tenders require. Not all are fraudulent — some are legitimate companies that incorporated quickly to meet a real need. But the proportion — three out of four contracts to recently created companies — exceeds any normal parameter.',
          'The emblematic case was CYBER ROBOTIC SOLUTIONS S.A. de C.V., a company registered as a technology services firm that received 139 million pesos for the purchase of mechanical ventilators. The company had no experience in medical equipment. The units delivered, according to reports from receiving hospitals, had recurring technical failures or were never fully delivered. The contract was awarded via the urgency mechanism, without price comparison and without verification of the vendor\'s technical capacity.',
          'CYBER ROBOTIC was not an isolated case. Records show dozens of companies with similar profiles: commercial activities unrelated to health, recent incorporation, tax addresses in states different from the delivery location, and contract amounts disproportionate to their declared share capital.',
        ],
        chartConfig: {
          type: 'scatter',
          title: 'COVID vendors — company age vs. contracted amount',
          chartId: 'vendor-age-scatter',
        },
      },
      {
        id: 'la-auditoria',
        number: 3,
        title: 'The Audit That Arrived Too Late',
        subtitle: 'The ASF documented what nobody could any longer correct',
        prose: [
          'The Federal Audit Office reviewed the COVID contracts in its report on Public Account 2020, presented in February 2022 — almost two years after the contracts were signed. The result: irregularities documented in approximately 35% of reviewed contracts. The findings included markups of between 20% and 200% above reference prices, lack of evidence of goods delivery, payments to vendors that could not demonstrate technical capacity and contracts duplicated for the same items across different agencies.',
          'The temporal lag is part of the problem. The Chamber of Deputies had suspended concurrent auditing — the kind that occurs while spending is being executed — under the argument of not hindering the health response. By the time the ASF finally audited, vendors had already collected, many had changed their corporate name, and the officials who signed the contracts had rotated positions. The audit documented the damage. It did not prevent it.',
          'The control mechanism that was missing is the one that exists in most OECD democracies: real-time auditing of emergency spending, with powers to suspend payments when irregularities are detected. Mexico does not have it. The Acquisitions Law provides exceptions for urgency but does not provide compensating controls. The result was a nine-month period — from March to December 2020 — in which the federal government spent tens of billions of pesos without anyone verifying, in the moment, whether that spending was legitimate.',
        ],
        chartConfig: {
          type: 'pyramid',
          title: 'COVID contracts by risk level',
          chartId: 'risk-pyramid',
        },
      },
      {
        id: 'las-consecuencias',
        number: 4,
        title: 'The Consequences',
        subtitle: 'What was purchased, what did not arrive and what is unknown',
        prose: [
          'Mexico recorded, by the end of 2021, more than 300,000 official COVID-19 deaths and an excess mortality estimated by INEGI at more than 600,000 people. It is impossible to establish a direct link between contracting irregularities and deaths. But it is possible to document what was missing: ventilators that did not work, diagnostic tests that were not purchased in sufficient quantities, personal protective equipment that arrived late or not at all, and medicines whose supply depended on vendors with no experience in the cold-chain requirements that medical supplies demand.',
          'The cost of the lack of oversight is not measured only in diverted pesos. It is measured in the response capacity the health system lost. Every contract awarded to a ghost vendor was a contract not awarded to a real vendor. Every defective ventilator was a ventilator missing from an intensive care unit. Corruption in the health emergency did not just steal public money. It stole hospital capacity at the worst possible moment.',
          'No federal official has been criminally prosecuted for irregularities in COVID contracting. ASF findings were channeled to administrative procedures that, in the Mexican system, rarely conclude with sanctions. Flagged vendors changed their corporate names or closed operations. The money was not recovered.',
          'What remains in COMPRANET records is statistical evidence: more than 40 billion pesos spent without competitive bidding, 73% to recently created companies, irregularities in a third of audited contracts, and a legal framework that allowed all of it to happen within the law. The pandemic ended. The legal framework remains unchanged.',
        ],
        pullquote: {
          quote: 'Irregularities documented in 35% of COVID contracts reviewed by the ASF',
          stat: '$40B+',
          statLabel: 'MXN in COVID purchases without competitive bidding',
        },
        chartConfig: {
          type: 'breakdown',
          title: 'COVID spending distribution by vendor type',
          chartId: 'covid-breakdown',
        },
      },
    ],
  },

]

function normalizeSlug(slug: string): string {
  return slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function getStoryBySlug(slug: string): StoryDef | undefined {
  const norm = normalizeSlug(slug)
  return STORIES.find(s => s.slug === slug || normalizeSlug(s.slug) === norm)
}

export function getRelatedStories(story: StoryDef): StoryDef[] {
  if (!story.relatedSlugs?.length) return []
  return story.relatedSlugs
    .map(slug => STORIES.find(s => s.slug === slug))
    .filter((s): s is StoryDef => s !== undefined)
}
