/**
 * Sector Descriptions
 * Human-readable context for all 12 procurement sectors.
 */

export interface SectorDescription {
  short: string
  detail: string
  corruptionContext: string
}

export const SECTOR_DESCRIPTIONS: Record<string, SectorDescription> = {
  salud: {
    short: 'Covers IMSS, ISSSTE, and SSA — pharmaceuticals, medical equipment, and hospital services.',
    detail: 'The health sector encompasses Mexico\'s major social security institutions (IMSS, ISSSTE) and the federal health ministry (SSA). Procurement includes pharmaceuticals, medical devices, hospital construction, and healthcare services.',
    corruptionContext: 'Historically the highest-risk sector due to pharmaceutical monopolies, emergency purchasing exemptions, and the opaque nature of drug pricing. Multiple documented cases including IMSS ghost companies and COVID-era embezzlement.',
  },
  educacion: {
    short: 'SEP, universities, and research centers — textbooks, school construction, and educational technology.',
    detail: 'Includes the Ministry of Education (SEP), public universities, CONACYT, and educational support programs. Procurement covers textbooks, school infrastructure, laboratory equipment, and IT systems.',
    corruptionContext: 'Known for the "Estafa Maestra" scheme where public universities were used as intermediaries to funnel funds to shell companies. Education budgets are large and decentralized, creating oversight challenges.',
  },
  infraestructura: {
    short: 'SCT, CONAGUA, and housing agencies — roads, bridges, water systems, and public buildings.',
    detail: 'Covers the Ministry of Infrastructure (formerly SCT), CONAGUA (water), and federal housing agencies. Procurement includes highways, bridges, airports, water treatment plants, and urban development.',
    corruptionContext: 'High-value contracts with limited competition. The Grupo Higa / Casa Blanca scandal involved infrastructure contracts tied to political conflicts of interest. Large projects create opportunities for cost overruns and bid-rigging.',
  },
  energia: {
    short: 'PEMEX, CFE, and SENER — oil, gas, electricity generation, and energy infrastructure.',
    detail: 'Dominated by Mexico\'s state energy companies PEMEX (petroleum) and CFE (electricity), plus the energy ministry SENER. Procurement includes drilling equipment, refinery maintenance, power plants, and fuel distribution.',
    corruptionContext: 'PEMEX is Mexico\'s single largest procurement entity. The Odebrecht bribery scandal and Emilio Lozoya case directly involved PEMEX contracts. Oceanografia committed invoice fraud against PEMEX. Energy contracts are technically complex, making oversight difficult.',
  },
  defensa: {
    short: 'SEDENA and SEMAR — military equipment, vehicles, uniforms, and defense infrastructure.',
    detail: 'Covers the Ministry of Defense (SEDENA) and the Navy (SEMAR). Procurement includes weapons systems, military vehicles, uniforms, communications equipment, and base construction.',
    corruptionContext: 'National security exemptions limit transparency. High direct-award rates are structurally expected due to classified procurement, but this also reduces accountability. Limited vendor competition in specialized military equipment.',
  },
  tecnologia: {
    short: 'IT systems, software licenses, telecommunications, and digital government services.',
    detail: 'Cross-cutting sector covering government IT procurement including software development, cloud services, cybersecurity, telecommunications infrastructure, and digital transformation projects.',
    corruptionContext: 'IT contracts are prone to overpricing due to technical complexity and information asymmetry. The Cyber Robotic case involved systematic IT procurement overcharging. Sole-source justifications are common for proprietary technology.',
  },
  hacienda: {
    short: 'SHCP, SAT, and financial agencies — banking services, auditing, and fiscal infrastructure.',
    detail: 'Encompasses the Ministry of Finance (SHCP), tax administration (SAT), development banks, and financial regulatory bodies. Procurement includes financial systems, consulting services, and tax collection infrastructure.',
    corruptionContext: 'Financial sector procurement involves complex consulting and technology contracts where value is difficult to assess. The concentration of fiscal resources creates both high stakes and sophisticated fraud potential.',
  },
  gobernacion: {
    short: 'Presidency, SEGOB, judiciary, and congress — government operations and public administration.',
    detail: 'The broadest sector covering the presidency, interior ministry (SEGOB), federal courts, congress, electoral institutions (INE), and various autonomous bodies. Procurement spans office supplies to security systems.',
    corruptionContext: 'Diverse and decentralized procurement across many small agencies. Risk varies widely by institution type and size. Autonomous bodies have different oversight mechanisms than federal ministries.',
  },
  agricultura: {
    short: 'SADER, SEGALMEX, and rural development — food distribution, agricultural subsidies, and farming equipment.',
    detail: 'Covers the agriculture ministry (SADER), food distribution agency SEGALMEX (formerly LICONSA/DICONSA), and rural development programs. Procurement includes food staples, agricultural inputs, storage facilities, and distribution logistics.',
    corruptionContext: 'The Segalmex scandal is one of Mexico\'s largest recent corruption cases, involving billions in diverted food distribution funds. LICONSA and DICONSA have been implicated in procurement fraud. Rural areas face weaker institutional oversight.',
  },
  ambiente: {
    short: 'SEMARNAT, CONAFOR, and environmental agencies — conservation, waste management, and climate programs.',
    detail: 'Includes the environmental ministry (SEMARNAT), forestry commission (CONAFOR), and water/waste agencies. Procurement covers environmental monitoring, reforestation, waste treatment, and conservation programs.',
    corruptionContext: 'Relatively smaller procurement volumes but environmental permits and impact assessments create indirect corruption risks. Climate adaptation funding is growing rapidly with limited oversight frameworks.',
  },
  trabajo: {
    short: 'STPS, IMSS labor programs, and social security — workplace safety, training, and employment services.',
    detail: 'Covers the labor ministry (STPS), social security labor programs, and employment services. Procurement includes training programs, workplace safety equipment, labor dispute systems, and employment databases.',
    corruptionContext: 'Labor programs involve many small contracts across diverse regions. Training and consulting services are difficult to verify for quality and completion. Social program beneficiary lists can be manipulated.',
  },
  otros: {
    short: 'Agencies not classified under the 11 primary sectors — miscellaneous government procurement.',
    detail: 'Catch-all category for procurement from agencies that don\'t fit neatly into the 11 primary sectors. Includes specialized agencies, transitional entities, and procurement with ambiguous sector classification.',
    corruptionContext: 'The "Other" category may contain misclassified procurement that could hide sector-specific patterns. Data quality tends to be lower for these contracts, making risk assessment less reliable.',
  },
}

/**
 * Get sector description by code.
 * Returns a default description if sector code is unknown.
 */
export function getSectorDescription(sectorCode: string): SectorDescription {
  return SECTOR_DESCRIPTIONS[sectorCode] || {
    short: 'Government procurement sector.',
    detail: 'No detailed description available for this sector.',
    corruptionContext: 'Risk assessment follows standard methodology.',
  }
}
