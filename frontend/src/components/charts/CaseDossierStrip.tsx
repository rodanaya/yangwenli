/**
 * CaseDossierStrip — horizontal strip of case dossier cards.
 *
 * Compact editorial cards for corruption cases: case name, estimated
 * fraud, vendor count, sector tag, mini MiniRiskField fingerprint. Use
 * above detail pages (CaseLibrary, InvestigationIndex) or as a
 * "related cases" footer. No charts inside — the card IS the summary.
 */
import { MiniRiskField } from './MiniRiskField'
import { FONT_MONO, RISK_PALETTE, SECTOR_COLORS } from '@/lib/editorial'

export interface CaseDossier {
  id: string | number
  name: string
  sectorKey?: string           // e.g. "salud"
  caseType?: string            // e.g. "Ghost companies"
  estimatedFraudMxn?: number
  vendorCount?: number
  confidence?: 'confirmed_corrupt' | 'high' | 'medium' | 'low'
  /** Optional risk distribution for the fingerprint (pct values). */
  dist?: { critical: number; high: number; medium: number; low: number }
}

interface CaseDossierStripProps {
  cases: CaseDossier[]
  onSelect?: (dossier: CaseDossier) => void
  className?: string
  /** Card width in px (cards are horizontally scrollable). */
  cardWidth?: number
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(n)
}

const CONFIDENCE_PILL: Record<NonNullable<CaseDossier['confidence']>, { label: string; color: string }> = {
  confirmed_corrupt: { label: 'CONFIRMED', color: RISK_PALETTE.critical },
  high:              { label: 'HIGH',      color: RISK_PALETTE.critical },
  medium:            { label: 'MEDIUM',    color: RISK_PALETTE.high },
  low:               { label: 'LOW',       color: '#a16207' },
}

export function CaseDossierStrip({
  cases,
  onSelect,
  className,
  cardWidth = 260,
}: CaseDossierStripProps) {
  if (cases.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-zinc-500">
        No cases
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: 14,
        overflowX: 'auto',
        paddingBottom: 6,
        fontFamily: FONT_MONO,
      }}
    >
      {cases.map((c) => {
        const sectorColor = c.sectorKey ? SECTOR_COLORS[c.sectorKey] : undefined
        const pill = c.confidence ? CONFIDENCE_PILL[c.confidence] : null
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect?.(c)}
            style={{
              width: cardWidth,
              flex: `0 0 ${cardWidth}px`,
              textAlign: 'left',
              background: '#0c0c0f',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 2,
              padding: '12px 14px 10px',
              color: '#fafafa',
              cursor: onSelect ? 'pointer' : 'default',
              transition: 'border-color 160ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            aria-label={`Case ${c.name}`}
          >
            {/* Sector accent bar */}
            {sectorColor && (
              <div
                style={{
                  height: 2,
                  background: sectorColor,
                  marginBottom: 8,
                  width: 32,
                }}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
              <div style={{ fontSize: 8, letterSpacing: '0.15em', color: '#71717a', textTransform: 'uppercase' }}>
                {c.caseType ?? 'case'}
              </div>
              {pill && (
                <div style={{ fontSize: 8, letterSpacing: '0.1em', color: pill.color, fontWeight: 700 }}>
                  {pill.label}
                </div>
              )}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-family-serif, Georgia, serif)',
                fontSize: 14,
                lineHeight: 1.25,
                color: '#fafafa',
                marginTop: 6,
                marginBottom: 10,
                minHeight: 34,
              }}
            >
              {c.name}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: '#71717a' }}>est. fraud</div>
                <div style={{ fontSize: 15, color: RISK_PALETTE.critical, fontWeight: 700 }}>
                  {c.estimatedFraudMxn != null ? `$${formatCompact(c.estimatedFraudMxn)}` : '—'}
                </div>
                <div style={{ fontSize: 9, color: '#71717a', marginTop: 4 }}>
                  vendors: {c.vendorCount ?? '—'}
                </div>
              </div>
              <div style={{ opacity: 0.9 }}>
                <MiniRiskField
                  criticalPct={c.dist?.critical ?? 20}
                  highPct={c.dist?.high ?? 15}
                  mediumPct={c.dist?.medium ?? 25}
                  lowPct={c.dist?.low ?? 40}
                  seed={typeof c.id === 'number' ? c.id : c.id.length * 7}
                  width={72}
                  height={26}
                />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default CaseDossierStrip
