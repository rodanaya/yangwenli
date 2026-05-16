/**
 * Z1SectorMap — institutions of a single sector rendered as bodies in
 * space. The Z1 layer of the spatial-nav rebuild (docs/SPATIAL_NAV_PLAN.md).
 *
 * Reads from `/api/v1/atlas/sector-institutions` which pre-computes
 * (fx, fy) coordinates inside a 0..1 unit square per institution. This
 * component just renders them — sized by `size`, colored by risk level,
 * with hover/click affordances. The parent (Atlas page) handles the zoom
 * transition into and out of this layer.
 *
 * Layout: full SVG viewport scaled to the constellation's reference
 * box (840×220). Institutions placed at (fx*W, fy*H) with PAD padding
 * applied so bodies don't sit on the edge.
 *
 * Phase 1.3 — feature-flagged behind `?z1=true` on /atlas. Phase 2 will
 * promote it to the canonical Z1 surface for the sectors lens.
 */
import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { atlasApi, type SpatialInstitution } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import { RISK_COLORS, getRiskLevelFromScore, SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

// 2026-05-09: matches the new 840×540 canvas in ConcentrationConstellation.
const SVG_W = 840
const SVG_H = 540
const PAD_L = 16
const PAD_R = 200
const PAD_T = 16
const PAD_B = 28
const FIELD_W = SVG_W - PAD_L - PAD_R
const FIELD_H = SVG_H - PAD_T - PAD_B

// Body radius range — bumped 2026-05-09: dots felt like dust, not planets.
// Heaviest spender now ~22px, smallest ~5px in viewBox units (which scales
// proportionally with the SVG width). At 1300px container width that's
// ~34px / ~8px on screen — actually visible bodies.
const R_MIN = 5
const R_MAX = 22

interface Z1SectorMapProps {
  sectorId: number
  sectorCode: string
  /** Locale — controls label rendering. */
  lang: 'en' | 'es'
  /** Click handler for an institution body. The parent transitions to Z2. */
  onInstitutionClick?: (institutionId: number, institutionName: string) => void
  /** Hover handler — used for the briefing panel preview. */
  onInstitutionHover?: (institutionId: number | null) => void
  /** ID of the currently focused institution (drives the active-body ring). */
  focusedInstitutionId?: number | null
}

export const Z1SectorMap = memo(function Z1SectorMap({
  sectorId,
  sectorCode,
  lang,
  onInstitutionClick,
  onInstitutionHover,
  focusedInstitutionId,
}: Z1SectorMapProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['atlas', 'sector-institutions', sectorId],
    queryFn: () => atlasApi.getSectorInstitutionsSpatial({ sectorId, limit: 60 }),
    enabled: sectorId > 0 && sectorId <= 12,
    staleTime: 10 * 60 * 1000, // 10 min — layouts are stable across the day
  })

  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'

  const handleInstClick = useCallback(
    (inst: SpatialInstitution) => onInstitutionClick?.(inst.institution_id, inst.name),
    [onInstitutionClick],
  )

  if (isLoading) {
    return (
      <div className="w-full" style={{ aspectRatio: `${SVG_W} / ${SVG_H}` }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
          <text
            x={SVG_W / 2}
            y={SVG_H / 2}
            textAnchor="middle"
            fontSize={11}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-muted)"
          >
            {lang === 'en' ? 'Loading sector…' : 'Cargando sector…'}
          </text>
        </svg>
      </div>
    )
  }

  if (isError || !data || data.institutions.length === 0) {
    return (
      <div className="w-full" style={{ aspectRatio: `${SVG_W} / ${SVG_H}` }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
          <text
            x={SVG_W / 2}
            y={SVG_H / 2}
            textAnchor="middle"
            fontSize={11}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-muted)"
          >
            {lang === 'en' ? 'No institution data for this sector.' : 'Sin datos de instituciones.'}
          </text>
        </svg>
      </div>
    )
  }

  // Convert (fx, fy) [0..1] into viewport coords inside the field box.
  const xOf = (fx: number) => PAD_L + fx * FIELD_W
  const yOf = (fy: number) => PAD_T + fy * FIELD_H
  const rOf = (size: number) => R_MIN + (R_MAX - R_MIN) * size

  // Sector label in the top-left corner — matches the Z0 caption style.
  const sectorLabel = lang === 'en' ? data.sector_name_en : data.sector_name_es

  return (
    <div className="w-full relative" style={{ aspectRatio: `${SVG_W} / ${SVG_H}` }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-auto"
        role="img"
        aria-label={
          lang === 'en'
            ? `Z1 sub-constellation for sector ${sectorLabel}: ${data.total} institutions`
            : `Sub-constelación Z1 del sector ${sectorLabel}: ${data.total} instituciones`
        }
      >
        {/* Sector eyebrow — top left */}
        <text
          x={PAD_L}
          y={12}
          fontSize={9}
          fontFamily="var(--font-family-mono, monospace)"
          fontWeight={700}
          letterSpacing={1.2}
          fill={sectorAccent}
        >
          {sectorCode.toUpperCase()} · {sectorLabel.toUpperCase()}
        </text>
        <text
          x={PAD_L}
          y={SVG_H - 8}
          fontSize={9}
          fontFamily="var(--font-family-mono, monospace)"
          fill="var(--color-text-muted)"
        >
          {lang === 'en'
            ? `${data.total} institutions · drag to pan · click to drill in`
            : `${data.total} instituciones · arrastra para desplazar · clic para profundizar`}
        </text>

        {/* Bodies */}
        {data.institutions.map((inst) => {
          const cx = xOf(inst.fx)
          const cy = yOf(inst.fy)
          const r = rOf(inst.size)
          const riskLevel = getRiskLevelFromScore(inst.risk)
          const fill = RISK_COLORS[riskLevel]
          const isFocused = focusedInstitutionId === inst.institution_id
          return (
            <motion.g
              key={inst.institution_id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: Math.min(0.4, inst.size * 0.4) }}
            >
              {/* Halo on focus */}
              {isFocused && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 3}
                  fill="none"
                  stroke={sectorAccent}
                  strokeWidth={1.2}
                  opacity={0.85}
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={fill}
                opacity={0.92}
                stroke="var(--color-background, #faf9f6)"
                strokeWidth={0.6}
                style={{ cursor: 'pointer' }}
                onClick={() => handleInstClick(inst)}
                onMouseEnter={() => onInstitutionHover?.(inst.institution_id)}
                onMouseLeave={() => onInstitutionHover?.(null)}
                aria-label={`${inst.name} · ${formatCompactMXN(inst.total_amount_mxn)} · ${formatNumber(inst.total_contracts)} ${lang === 'en' ? 'contracts' : 'contratos'}`}
              />
              {/* Label every body that's at least medium-size.
                  Guard: skip if label would render above PAD_T or clip below SVG_H. */}
              {inst.size > 0.35 && cy - r - 5 > PAD_T && (
                <text
                  x={cx}
                  y={cy - r - 4}
                  textAnchor="middle"
                  fontSize={inst.size > 0.7 ? 11 : 9}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontWeight={700}
                  fill="var(--color-text-primary)"
                  style={{ pointerEvents: 'none' }}
                >
                  {shortLabel(inst.name)}
                </text>
              )}
              {/* Sub-label: contract count — only when it fits inside the SVG viewport */}
              {inst.size > 0.6 && cy + r + 12 < SVG_H && (
                <text
                  x={cx}
                  y={cy + r + 11}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-muted)"
                  style={{ pointerEvents: 'none' }}
                >
                  {formatNumber(inst.total_contracts)}
                </text>
              )}
            </motion.g>
          )
        })}
      </svg>
    </div>
  )
})

/**
 * Compact label for a body. Tries the first acronym-shape (uppercase
 * letters) of the institution name; falls back to truncated name.
 *
 *   "INSTITUTO MEXICANO DEL SEGURO SOCIAL" → "IMSS"
 *   "Comisión Federal de Electricidad"     → "CFE"
 *   "Petróleos Mexicanos"                  → "Petróleos…"
 */
// Spanish prepositions/articles excluded from acronyms (IMSS not IMDSS)
const STOP_WORDS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'E', 'EN', 'A'])

function shortLabel(name: string): string {
  const trimmed = name.trim()
  // Initials of multi-word ALL-CAPS names — skip Spanish stop-words
  const sigWords = trimmed
    .replace(/[,]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && w === w.toUpperCase() && !STOP_WORDS.has(w))
  if (sigWords.length >= 2 && sigWords.length <= 6) {
    return sigWords.map((w) => w[0]).join('').slice(0, 5)
  }
  // Mixed-case names: take first capital letter of each significant word
  const mixedWords = trimmed
    .split(/\s+/)
    .filter((w) => w.length >= 3 && /^[A-ZÁÉÍÓÚÑÜ]/.test(w) && !STOP_WORDS.has(w.toUpperCase()))
  if (mixedWords.length >= 2) {
    const initials = mixedWords.map((w) => w[0]).join('').slice(0, 5)
    if (initials.length >= 2) return initials
  }
  return trimmed.length > 14 ? trimmed.slice(0, 13) + '…' : trimmed
}
