/**
 * VendorCommandPanel — the operational masthead body for the unified vendor
 * dossier. Replaces the six full-viewport narrative chapters (Subject /
 * Timeline / Network / Money / Pattern / Verdict) with two dense, gridded
 * reads an investigator can scan WITHOUT scrolling:
 *
 *   VendorStatStrip      — the decisive numbers in one aligned readout row.
 *   VendorDiagnosticGrid — a 2×2 grid of compact panels: why flagged (SHAP),
 *                          benchmark deviation (OECD), where the money goes
 *                          (top clients), and the risk shape over time.
 *
 * Folio register: mono labels (IBM Plex), tabular numbers, sector + risk
 * accents only, no green for low risk. Built 2026-06-03 (DESIGNUS — vendor
 * dossier operational rebuild; collapses the redundant story chapters that
 * duplicated the reference tabs below).
 */
import { useMemo } from 'react'
import type { VendorDetailResponse, VendorSHAPResponse } from '@/api/types'
import { DotBarRow } from '@/components/ui/DotBar'
import { EditorialAreaChart } from '@/components/charts/editorial'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import {
  RISK_COLORS,
  SECTOR_COLORS,
} from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD, formatNumber } from '@/lib/utils'
import { parseFactorLabel } from '@/lib/risk-factors'

// vendor_stats rate fields are corrupted on a slice of rows — some stored as a
// 0–1 fraction, some as a 0–100 percentage. Canonicalize to a 0–100 percentage.
// (Same defense as VendorEvidenceTab.normalizeRate; see MEMORY.md.)
function ratePct(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  const frac = v > 1 ? v / 100 : v
  return Math.max(0, Math.min(100, frac * 100))
}

interface InstitutionRow {
  institution_id: number
  institution_name: string
  total_value_mxn: number
}

interface TimelinePoint {
  year: number
  avg_risk_score?: number | null
  avg_risk?: number | null
}

// ─── Stat strip ──────────────────────────────────────────────────────────────

export function VendorStatStrip({
  vendor,
  lang,
}: {
  vendor: VendorDetailResponse
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const hr = ratePct(vendor.high_risk_pct)
  const da = ratePct(vendor.direct_award_pct)
  const sb = ratePct(vendor.single_bid_pct)
  const span =
    vendor.first_contract_year && vendor.last_contract_year
      ? vendor.last_contract_year - vendor.first_contract_year + 1
      : null

  // OECD limits: direct award ≤30%, single bid ≤10%.
  const daColor = da == null ? undefined : da > 30 ? RISK_COLORS.critical : da > 15 ? RISK_COLORS.high : undefined
  const sbColor = sb == null ? undefined : sb > 10 ? RISK_COLORS.critical : sb > 5 ? RISK_COLORS.high : undefined
  const hrColor = hr == null ? undefined : hr >= 60 ? RISK_COLORS.critical : hr >= 30 ? RISK_COLORS.high : undefined

  const cells: Array<{ label: string; value: string; sub?: string; color?: string } | null> = [
    {
      label: isEs ? 'Valor total' : 'Total value',
      value: formatCompactMXN(vendor.total_value_mxn ?? 0),
      sub: !isEs ? formatCompactUSD(vendor.total_value_mxn ?? 0) : undefined,
    },
    {
      label: isEs ? 'Contratos' : 'Contracts',
      value: formatNumber(vendor.total_contracts ?? 0),
    },
    hr == null ? null : {
      label: isEs ? 'Alto riesgo' : 'High-risk',
      value: `${Math.round(hr)}%`,
      sub: isEs ? 'de contratos' : 'of contracts',
      color: hrColor,
    },
    da == null ? null : {
      label: isEs ? 'Adj. directa' : 'Direct award',
      value: `${Math.round(da)}%`,
      sub: da > 30 ? `${(da / 30).toFixed(1)}× ${isEs ? 'OCDE' : 'OECD'}` : (isEs ? '≤30% OCDE' : '≤30% OECD'),
      color: daColor,
    },
    sb == null ? null : {
      label: isEs ? 'Único postor' : 'Single bid',
      value: `${Math.round(sb)}%`,
      sub: sb > 10 ? `${(sb / 10).toFixed(1)}× ${isEs ? 'OCDE' : 'OECD'}` : (isEs ? '≤10% OCDE' : '≤10% OECD'),
      color: sbColor,
    },
    {
      label: isEs ? 'Instituciones' : 'Institutions',
      value: formatNumber(vendor.total_institutions ?? 0),
    },
    span == null ? null : {
      label: isEs ? 'Periodo' : 'Span',
      value: `${vendor.first_contract_year}–${vendor.last_contract_year}`,
      sub: isEs ? `${span} año${span === 1 ? '' : 's'}` : `${span} yr${span === 1 ? '' : 's'}`,
    },
  ]
  const shown = cells.filter(Boolean) as Array<{ label: string; value: string; sub?: string; color?: string }>

  return (
    <div
      className="grid border-t border-b"
      style={{
        borderColor: 'var(--color-border)',
        gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))`,
      }}
    >
      {shown.map((c, i) => (
        <div
          key={c.label}
          className="px-3 py-3 sm:px-4 sm:py-4"
          style={{ borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)' }}
        >
          <div
            className="font-mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 500,
              marginBottom: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {c.label}
          </div>
          <div
            className="tabular-nums"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 'clamp(18px, 2vw, 24px)',
              lineHeight: 1,
              color: c.color ?? 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            {c.value}
          </div>
          {c.sub && (
            <div
              className="font-mono tabular-nums"
              style={{
                fontSize: 9,
                color: c.color ?? 'var(--color-text-muted)',
                marginTop: 4,
                opacity: c.color ? 0.85 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {c.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Diagnostic panel chrome ─────────────────────────────────────────────────

function Panel({
  label,
  accent,
  children,
}: {
  label: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        border: '1px solid var(--color-border)',
        boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.05)',
        borderRadius: 3,
        padding: '14px 16px 16px',
        background: 'var(--color-background-card, transparent)',
      }}
    >
      <div
        className="font-mono flex items-center gap-2"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: 999, background: accent }} />
        {label}
      </div>
      {children}
    </section>
  )
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--color-text-muted)' }}>
      {text}
    </p>
  )
}

// ─── Diagnostic grid ─────────────────────────────────────────────────────────

export function VendorDiagnosticGrid({
  vendor,
  shap,
  institutions,
  timeline,
  lang,
}: {
  vendor: VendorDetailResponse
  shap?: VendorSHAPResponse | null
  institutions: InstitutionRow[]
  timeline: TimelinePoint[]
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const sectorCode = vendor.primary_sector_name?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#a06820'

  const riskFactors = (shap?.top_risk_factors ?? []).slice(0, 4)
  const maxRisk = riskFactors.reduce((m, f) => Math.max(m, Math.abs(f.shap)), 0.001)

  const topInst = institutions.slice(0, 4)
  const totalValue = vendor.total_value_mxn || 0

  // OECD benchmark deltas
  const hr = ratePct(vendor.high_risk_pct)
  const da = ratePct(vendor.direct_award_pct)
  const sb = ratePct(vendor.single_bid_pct)
  const benchRows: Array<{ label: string; pct: number; limit: number; over: boolean }> = []
  if (da != null) benchRows.push({ label: isEs ? 'Adjudicación directa' : 'Direct award', pct: da, limit: 30, over: da > 30 })
  if (sb != null) benchRows.push({ label: isEs ? 'Único postor' : 'Single bid', pct: sb, limit: 10, over: sb > 10 })
  if (hr != null) benchRows.push({ label: isEs ? 'Alto riesgo' : 'High-risk', pct: hr, limit: 11, over: hr > 11 })

  const trend = useMemo(
    () =>
      timeline
        .map((p) => ({ year: p.year, avg: (p.avg_risk_score ?? p.avg_risk ?? 0) as number }))
        .filter((p) => Number.isFinite(p.avg))
        .sort((a, b) => a.year - b.year),
    [timeline],
  )
  const peak = trend.reduce<{ year: number; avg: number } | null>((mx, p) => (!mx || p.avg > mx.avg ? p : mx), null)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ─ Why flagged — top SHAP risk drivers ─ */}
      <Panel label={isEs ? 'Por qué está marcado' : 'Why flagged'} accent={RISK_COLORS.critical}>
        {riskFactors.length > 0 ? (
          <div className="space-y-2.5">
            {riskFactors.map((f) => (
              <DotBarRow
                key={f.factor}
                label={(isEs ? f.label_es : parseFactorLabel(f.factor).label) || f.factor}
                readout={`+${f.shap.toFixed(2)}`}
                value={Math.abs(f.shap)}
                max={maxRisk}
                color="var(--color-risk-critical)"
              />
            ))}
          </div>
        ) : (
          <EmptyNote text={isEs ? 'Sin factores de riesgo dominantes.' : 'No dominant risk drivers.'} />
        )}
      </Panel>

      {/* ─ Benchmark deviation vs OECD ─ */}
      <Panel label={isEs ? 'Desviación · OCDE' : 'Deviation · OECD'} accent={RISK_COLORS.high}>
        {benchRows.length > 0 ? (
          <div className="space-y-3">
            {benchRows.map((r) => {
              const color = r.over ? RISK_COLORS.critical : 'var(--color-text-muted)'
              return (
                <div key={r.label}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}>
                      {r.label}
                    </span>
                    <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color }}>
                      {Math.round(r.pct)}%
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> / {r.limit}%</span>
                    </span>
                  </div>
                  {/* track with limit tick */}
                  <div style={{ position: 'relative', height: 4, background: 'var(--color-border)', borderRadius: 999 }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, r.pct)}%`, background: color, borderRadius: 999 }} />
                    <div aria-hidden="true" style={{ position: 'absolute', top: -2, bottom: -2, left: `${Math.min(100, r.limit)}%`, width: 1, background: 'var(--color-text-muted)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyNote text={isEs ? 'Sin métricas de procedimiento.' : 'No procedure metrics.'} />
        )}
      </Panel>

      {/* ─ Where the money goes — top clients ─ */}
      <Panel label={isEs ? 'A dónde va el dinero' : 'Where the money goes'} accent={sectorAccent}>
        {topInst.length > 0 ? (
          <ul className="space-y-2">
            {topInst.map((inst) => {
              const share = totalValue > 0 ? (inst.total_value_mxn / totalValue) * 100 : 0
              return (
                <li key={inst.institution_id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <EntityIdentityChip type="institution" id={inst.institution_id} name={inst.institution_name} size="sm" />
                  </div>
                  <div className="flex items-baseline gap-2.5 flex-shrink-0 font-mono tabular-nums" style={{ fontSize: 11 }}>
                    <span style={{ color: share >= 40 ? RISK_COLORS.high : 'var(--color-text-secondary)', fontWeight: 600 }}>{Math.round(share)}%</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{formatCompactMXN(inst.total_value_mxn)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose por institución.' : 'No institutional breakdown.'} />
        )}
      </Panel>

      {/* ─ Risk shape over time ─ */}
      <Panel label={isEs ? 'Riesgo en el tiempo' : 'Risk over time'} accent={RISK_COLORS.critical}>
        {trend.length > 1 ? (
          <>
            <EditorialAreaChart
              data={trend}
              xKey="year"
              yKey="avg"
              colorToken="risk-critical"
              yFormat="pct"
              yDomain={[0, 1]}
              height={96}
            />
            {peak && (
              <p className="font-mono mt-2" style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                {isEs ? 'Pico' : 'Peak'} {Math.round(peak.avg * 100)}% · {peak.year} ·{' '}
                {trend[0].year}–{trend[trend.length - 1].year}
              </p>
            )}
          </>
        ) : (
          <EmptyNote text={isEs ? 'Actividad insuficiente para una serie.' : 'Insufficient activity for a series.'} />
        )}
      </Panel>
    </div>
  )
}
