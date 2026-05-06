/**
 * useVendorLevelDots — mock vendor-level dot generator for atlas-C-P2.
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § 2.4
 * Build: atlas-C-P2
 *
 * Returns a deterministic array of { id, x, y, riskScore, sectorColor, name }
 * placed in a tight Halton(2,3) lattice around the cluster's attractor point,
 * in the constellation's original viewport coordinates (before zoom transform).
 *
 * Top-10 vendors per cluster are seeded with known names from KNOWN_VENDORS.
 * The rest get synthetic IDs (mock-P5-11, mock-P5-12, …) with placeholder names.
 *
 * P3+ swap the mock → real data via a backend endpoint with no UI change:
 * same return shape, same useQuery key, same rendering code.
 */

import { useMemo } from 'react'

// ── Constellation layout constants (mirror ConcentrationConstellation.tsx) ──
const SVG_W = 840
const SVG_H = 220
const PAD_L = 16
const PAD_R = 200
const PAD_T = 16
const PAD_B = 28
const FIELD_W = SVG_W - PAD_L - PAD_R
const FIELD_H = SVG_H - PAD_T - PAD_B

/** Halton sequence for base b, index i (0-indexed). */
function halton(i: number, b: number): number {
  let f = 1
  let r = 0
  let n = i + 1
  while (n > 0) {
    f /= b
    r += f * (n % b)
    n = Math.floor(n / b)
  }
  return r
}

export interface VendorDot {
  id: string
  name: string
  riskScore: number
  sectorColor: string
  /** x in original SVG viewport coordinates (pre-zoom) */
  x: number
  /** y in original SVG viewport coordinates (pre-zoom) */
  y: number
  isMock: boolean
}

// Hard-coded top vendors per cluster (P-code → up to 10 entries).
// These match KNOWN_VENDORS so the right panel can display real blurbs.
const CLUSTER_TOP_VENDORS: Record<string, Array<{ id: string; name: string; riskScore: number; sectorColor: string }>> = {
  P5: [
    { id: '12345', name: 'Grupo Farmacos Especializados', riskScore: 0.92, sectorColor: '#dc2626' },
    { id: '12346', name: 'Toka Internacional',            riskScore: 0.97, sectorColor: '#8b5cf6' },
    { id: '12347', name: 'Microsoft México',              riskScore: 0.88, sectorColor: '#8b5cf6' },
    { id: '12348', name: 'Oracle México',                 riskScore: 0.85, sectorColor: '#8b5cf6' },
    { id: '12349', name: 'IBM México',                    riskScore: 0.83, sectorColor: '#8b5cf6' },
    { id: '12350', name: 'COTEMAR',                       riskScore: 0.79, sectorColor: '#eab308' },
    { id: '12351', name: 'Laboratorios PiSA',             riskScore: 0.75, sectorColor: '#dc2626' },
    { id: '12352', name: 'Farmacéuticos Maypo',           riskScore: 0.74, sectorColor: '#dc2626' },
    { id: '12353', name: 'DIMM',                          riskScore: 0.71, sectorColor: '#dc2626' },
    { id: '12354', name: 'HEMOSER',                       riskScore: 0.68, sectorColor: '#dc2626' },
  ],
  P7: [
    { id: '22345', name: 'Odebrecht',                     riskScore: 0.91, sectorColor: '#eab308' },
    { id: '22346', name: 'Grupo Higa',                    riskScore: 0.87, sectorColor: '#ea580c' },
    { id: '22347', name: 'Oceanografía',                  riskScore: 0.82, sectorColor: '#eab308' },
  ],
  P1: [
    { id: '32345', name: 'Toka Internacional',            riskScore: 0.97, sectorColor: '#8b5cf6' },
    { id: '32346', name: 'Edenred',                       riskScore: 0.96, sectorColor: '#16a34a' },
  ],
  P3: [
    { id: '42345', name: 'Constructora ARHNOS',           riskScore: 0.89, sectorColor: '#ea580c' },
    { id: '42346', name: 'Promotora y Desarrolladora MX', riskScore: 0.86, sectorColor: '#dc2626' },
    { id: '42347', name: 'CAABSA Constructora',           riskScore: 0.80, sectorColor: '#ea580c' },
    { id: '42348', name: 'GX2 Desarrollos',               riskScore: 0.77, sectorColor: '#ea580c' },
    { id: '42349', name: 'Técnicas Reunidas',             riskScore: 0.72, sectorColor: '#eab308' },
    { id: '42350', name: 'Pride International',           riskScore: 0.68, sectorColor: '#eab308' },
  ],
  P6: [
    { id: '52345', name: 'BIRMEX',                        riskScore: 0.74, sectorColor: '#dc2626' },
    { id: '52346', name: 'COMPHARMA',                     riskScore: 0.70, sectorColor: '#dc2626' },
    { id: '52347', name: 'PIHCSA',                        riskScore: 0.65, sectorColor: '#dc2626' },
  ],
  P2: [
    { id: '62345', name: 'HEMOSER',                       riskScore: 0.60, sectorColor: '#dc2626' },
  ],
  P4: [
    { id: '72345', name: 'Constructora ARHNOS',           riskScore: 0.62, sectorColor: '#ea580c' },
    { id: '72346', name: 'GX2 Desarrollos',               riskScore: 0.58, sectorColor: '#ea580c' },
    { id: '72347', name: 'CAABSA Constructora',           riskScore: 0.55, sectorColor: '#ea580c' },
  ],
}

// Cluster attractor coords for all modes (mirrors ConcentrationConstellation.tsx).
// Key: `${mode}:${code}` → { fx, fy } (0..1 fractions of FIELD_W×FIELD_H)
const ATTRACTOR_MAP: Record<string, { fx: number; fy: number }> = {
  // Patterns
  'patterns:P5':  { fx: 0.50, fy: 0.40 },
  'patterns:P7':  { fx: 0.78, fy: 0.22 },
  'patterns:P1':  { fx: 0.72, fy: 0.68 },
  'patterns:P3':  { fx: 0.22, fy: 0.28 },
  'patterns:P6':  { fx: 0.28, fy: 0.72 },
  'patterns:P2':  { fx: 0.55, fy: 0.78 },
  'patterns:P4':  { fx: 0.42, fy: 0.14 },
  // Sectors
  'sectors:salud':           { fx: 0.15, fy: 0.22 },
  'sectors:educacion':       { fx: 0.38, fy: 0.22 },
  'sectors:infraestructura': { fx: 0.62, fy: 0.22 },
  'sectors:energia':         { fx: 0.85, fy: 0.22 },
  'sectors:defensa':         { fx: 0.15, fy: 0.50 },
  'sectors:tecnologia':      { fx: 0.38, fy: 0.50 },
  'sectors:hacienda':        { fx: 0.62, fy: 0.50 },
  'sectors:gobernacion':     { fx: 0.85, fy: 0.50 },
  'sectors:agricultura':     { fx: 0.15, fy: 0.78 },
  'sectors:ambiente':        { fx: 0.38, fy: 0.78 },
  'sectors:trabajo':         { fx: 0.62, fy: 0.78 },
  'sectors:otros':           { fx: 0.85, fy: 0.78 },
  // Sexenios
  'sexenios:zedillo':   { fx: 0.08, fy: 0.50 },
  'sexenios:fox':       { fx: 0.22, fy: 0.50 },
  'sexenios:calderon':  { fx: 0.38, fy: 0.50 },
  'sexenios:pena':      { fx: 0.55, fy: 0.50 },
  'sexenios:amlo':      { fx: 0.72, fy: 0.50 },
  'sexenios:sheinbaum': { fx: 0.90, fy: 0.50 },
  // Categories
  'categories:medicamentos':   { fx: 0.18, fy: 0.22 },
  'categories:combustibles':   { fx: 0.42, fy: 0.22 },
  'categories:obra_publica':   { fx: 0.66, fy: 0.22 },
  'categories:tic':            { fx: 0.88, fy: 0.22 },
  'categories:serv_prof':      { fx: 0.18, fy: 0.50 },
  'categories:vehiculos':      { fx: 0.42, fy: 0.50 },
  'categories:equipo_medico':  { fx: 0.66, fy: 0.50 },
  'categories:alimentos':      { fx: 0.88, fy: 0.50 },
  'categories:vales':          { fx: 0.18, fy: 0.78 },
  'categories:telecom':        { fx: 0.42, fy: 0.78 },
  'categories:limpieza':       { fx: 0.66, fy: 0.78 },
  'categories:papeleria':      { fx: 0.88, fy: 0.78 },
}

/**
 * Returns a deterministic array of mock vendor dots for the given cluster.
 *
 * @param mode  Constellation mode (patterns / sectors / sexenios / categories)
 * @param code  Cluster code (P5, salud, amlo, …)
 * @param count Number of dots to generate (typically meta.t1, capped at 180)
 */
export function useVendorLevelDots(
  mode: string,
  code: string | null,
  count: number,
): VendorDot[] {
  return useMemo(() => {
    if (!code) return []

    const key = `${mode}:${code}`
    const attractor = ATTRACTOR_MAP[key]
    if (!attractor) {
      // Fall back to center if attractor unknown
      const fallback = { fx: 0.50, fy: 0.50 }
      return generateDots(code, fallback, count)
    }
    return generateDots(code, attractor, count)
  }, [mode, code, count])
}

function generateDots(
  code: string,
  attractor: { fx: number; fy: number },
  count: number,
): VendorDot[] {
  const CLUSTER_RADIUS = 60 // px in original viewport coords; spreads to ~144px at 2.4×
  const clampedCount = Math.min(count, 200)

  // Attractor centre in viewport coords
  const cx = PAD_L + attractor.fx * FIELD_W
  const cy = PAD_T + attractor.fy * FIELD_H

  // Seed known top-vendors first
  const topVendors = CLUSTER_TOP_VENDORS[code] ?? []
  const dots: VendorDot[] = []

  topVendors.forEach((v, i) => {
    // Place top vendors in an inner ring using Halton
    const angle = halton(i, 2) * Math.PI * 2
    const r = CLUSTER_RADIUS * 0.35 * Math.sqrt(halton(i, 3))
    dots.push({
      id: v.id,
      name: v.name,
      riskScore: v.riskScore,
      sectorColor: v.sectorColor,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      isMock: false,
    })
  })

  // Fill remaining slots with synthetic mock dots
  const remaining = clampedCount - topVendors.length
  const FALLBACK_COLORS = ['#dc2626', '#f59e0b', '#a16207', '#71717a']
  for (let i = 0; i < remaining; i++) {
    const hi = i + topVendors.length
    const angle = halton(hi, 2) * Math.PI * 2
    const r = CLUSTER_RADIUS * Math.sqrt(0.15 + halton(hi, 3) * 0.85)
    const riskScore = 0.3 + halton(hi, 5) * 0.65
    const colorIdx = riskScore >= 0.6 ? 0 : riskScore >= 0.4 ? 1 : riskScore >= 0.25 ? 2 : 3
    dots.push({
      id: `mock-${code}-${i}`,
      name: `Proveedor ${code}-${i + 1}`,
      riskScore,
      sectorColor: FALLBACK_COLORS[colorIdx],
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      isMock: true,
    })
  }

  return dots
}
