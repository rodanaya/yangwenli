// Auto-generated from RUBLI_NORMALIZED.db — do not edit manually
// Run backend/_admin_intel.py to regenerate

export interface AdminVendorEntry {
  name: string
  total_mxn: number
  contracts: number
  risk_pct: number
}

export interface AdminEraIntel {
  top_vendors: AdminVendorEntry[]
  gt_cases: number
  est_fraud_mxn: number
  dec_spike_pct: number
}

export const ADMIN_INTELLIGENCE: Record<string, AdminEraIntel> = {
  fox: {
    top_vendors: [
      { name: "REPSOL EXPLORACION, S.A.", total_mxn: 27244198348, contracts: 1, risk_pct: 100.0 },
      { name: "COAHUILA INDUSTRIAL MINERA S.A DE C.V.", total_mxn: 24656000000, contracts: 2, risk_pct: 100.0 },
      { name: "SEMPRA ENERGY LNG MARKETING MEXICO, S. DE R.L. DE C.V.", total_mxn: 16071819813, contracts: 1, risk_pct: 100.0 },
      { name: "COTEMAR, S. A. DE C. V.", total_mxn: 12523360548, contracts: 24, risk_pct: 68.6 },
      { name: "BERGESEN WORLDWIDE LIMITED.", total_mxn: 12326167398, contracts: 1, risk_pct: 100.0 },
      { name: "HALLIBURTON DE MEXICO, S. DE R.L. DE C.V.", total_mxn: 11822575576, contracts: 48, risk_pct: 63.9 },
    ],
    gt_cases: 268,
    est_fraud_mxn: 1077756882214,
    dec_spike_pct: 14.0,
  },

  calderon: {
    top_vendors: [
      { name: "MANTENIMIENTO EXPRESS MARITIMO S.A.P.I DE C.V.", total_mxn: 70516311420, contracts: 9, risk_pct: 23.7 },
      { name: "DOWELL SCHLUMBERGER DE MEXICO, S.A.DEC.V.", total_mxn: 68029761171, contracts: 35, risk_pct: 75.6 },
      { name: "URBANISSA SA DE CV", total_mxn: 57992479197, contracts: 4, risk_pct: 65.3 },
      { name: "CONSTRUCTORA ARHNOS , S.A DE C.V.", total_mxn: 32014332069, contracts: 6, risk_pct: 56.1 },
      { name: "INGENIEROS CIVILES ASOCIADOS, S.A. DE C.V.", total_mxn: 26442143264, contracts: 44, risk_pct: 97.0 },
      { name: "HALLIBURTON DE MEXICO, S. DE R.L. DE C.V.", total_mxn: 25174123661, contracts: 34, risk_pct: 70.0 },
    ],
    gt_cases: 371,
    est_fraud_mxn: 764471909731,
    dec_spike_pct: 11.4,
  },

  pena_nieto: {
    top_vendors: [
      { name: "OPERADORA CICSA, S.A DE C.V.", total_mxn: 92741920368, contracts: 13, risk_pct: 44.3 },
      { name: "GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.", total_mxn: 80185990823, contracts: 3451, risk_pct: 98.4 },
      { name: "FARMACEUTICOS MAYPO S.A DE C.V", total_mxn: 34916962513, contracts: 3283, risk_pct: 52.0 },
      { name: "DISTRIBUIDORA INTERNACIONAL DE MEDICAMENTOS Y EQUIPO MEDICO, S.A. DE C.V.", total_mxn: 29380591965, contracts: 2886, risk_pct: 52.8 },
      { name: "CIC CORPORATIVO INDUSTRIAL COAHUILA SA DE CV", total_mxn: 23738400000, contracts: 1, risk_pct: 100.0 },
      { name: "CONSTRUCCIONES Y MAQUINARIA GUTIERREZ, S.A. DE C.V.", total_mxn: 22724480775, contracts: 9, risk_pct: 83.8 },
    ],
    gt_cases: 397,
    est_fraud_mxn: 519406741710,
    dec_spike_pct: 6.3,
  },

  amlo: {
    top_vendors: [
      { name: "TOKA INTERNACIONAL S A P I DE CV", total_mxn: 41704088816, contracts: 1499, risk_pct: 90.8 },
      { name: "FARMACEUTICOS MAYPO S.A DE C.V", total_mxn: 35800545303, contracts: 12485, risk_pct: 50.6 },
      { name: "GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.", total_mxn: 33277969668, contracts: 2044, risk_pct: 100.0 },
      { name: "ALSTOM TRANSPORT MEXICO SA DE CV", total_mxn: 31520457949, contracts: 1, risk_pct: 100.0 },
      { name: "ICA CONSTRUCTORA SA DE CV", total_mxn: 28540056004, contracts: 14, risk_pct: 92.2 },
      { name: "CURRIE & BROWN - MEXICO SA DE CV", total_mxn: 25808388810, contracts: 2, risk_pct: 64.2 },
    ],
    gt_cases: 284,
    est_fraud_mxn: 353786429349,
    dec_spike_pct: 5.2,
  },

  sheinbaum: {
    top_vendors: [
      { name: "OPERADORA CICSA, S.A DE C.V.", total_mxn: 27451532410, contracts: 1, risk_pct: 100.0 },
      { name: "LABORATORIOS PISA, S.A. DE C.V.", total_mxn: 19459626162, contracts: 391, risk_pct: 25.3 },
      { name: "ICA CONSTRUCTORA SA DE CV", total_mxn: 15937568115, contracts: 2, risk_pct: 100.0 },
      { name: "ASTRAZENECA", total_mxn: 11864357341, contracts: 87, risk_pct: 70.3 },
      { name: "BRISTOL MYERS SQUIBB DE MEXICO S. DE R.L. DE C.V.", total_mxn: 8834065894, contracts: 61, risk_pct: 44.4 },
      { name: "BOEHRINGER INGELHEIM MEXICO SA DE CV", total_mxn: 8496428458, contracts: 120, risk_pct: 94.9 },
    ],
    gt_cases: 7,
    est_fraud_mxn: 6161500000,
    dec_spike_pct: 0,
  },
}
