/**
 * InstitutionChapterSuppliers — Chapter III of institution dossier.
 *
 * Argument: WHO GETS THE MONEY. Vendor concentration, top suppliers,
 * dominance flags. Mirrors the Z2 "La Captura" view but in editorial
 * register inside the dossier scroll.
 */
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { InstitutionVendorListResponse } from '@/api/types'
import { RISK_COLORS, SECTOR_COLORS, SECTORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  FadeIn,
} from '@/components/dossier/primitives'

interface Props {
  institutionName: string
  sectorId?: number | null
  vendors: InstitutionVendorListResponse | null
  totalSpend: number
  totalVendors?: number
}

export function InstitutionChapterSuppliers({
  institutionName,
  sectorId,
  vendors,
  totalSpend,
  totalVendors,
}: Props) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const sectorCode = SECTORS.find((s) => s.id === (sectorId ?? undefined))?.code ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'

  const topN = (vendors?.data ?? []).slice(0, 12)
  const top10 = topN.slice(0, 10)
  const top10Spend = top10.reduce((s, v) => s + (v.total_value_mxn ?? 0), 0)
  const top10Share = totalSpend > 0 ? (top10Spend / totalSpend) * 100 : 0
  const top1 = top10[0]
  const top1Share = top1 && totalSpend > 0 ? ((top1.total_value_mxn ?? 0) / totalSpend) * 100 : 0

  const lede = buildLede({ institutionName, top1, top1Share, top10Share, totalVendors, lang })

  return (
    <ChapterShell id="suppliers">
      <ChapterHeading
        numeral="III"
        title={lang === 'es' ? 'Los Proveedores' : 'Suppliers'}
        subtitle={lang === 'es' ? 'Quién recibe el dinero' : 'Who gets the money'}
        sectorAccent={sectorAccent}
      />

      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={sectorAccent}>{lede}</LedeParagraph>
      </FadeIn>

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'Los diez mayores' : 'The top ten'} />
        <ul className="mt-7 max-w-3xl mx-auto space-y-2 list-none p-0">
          {top10.map((v, idx) => {
            const score = v.avg_risk_score ?? 0
            const riskLevel = score > 0 ? getRiskLevelFromScore(score) : 'low'
            const riskColor = RISK_COLORS[riskLevel]
            const share = totalSpend > 0 ? ((v.total_value_mxn ?? 0) / totalSpend) * 100 : 0
            const dominantBadge = share >= 10 ? (lang === 'es' ? 'DOMINANTE' : 'DOMINANT') : null
            return (
              <li key={v.vendor_id}>
                <SupplierRow
                  rank={idx + 1}
                  vendor={v}
                  share={share}
                  riskColor={riskColor}
                  dominantBadge={dominantBadge}
                  sectorAccent={sectorAccent}
                />
              </li>
            )
          })}
        </ul>
        {totalVendors && totalVendors > top10.length && (
          <div className="mt-5 text-center">
            <Link
              to={`/explore?i=${''}`}
              className="font-mono uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
              style={{
                fontSize: 10,
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
              }}
            >
              {lang === 'es'
                ? `+${formatNumber(totalVendors - top10.length)} proveedores más en el universo institucional`
                : `+${formatNumber(totalVendors - top10.length)} more suppliers in the institutional universe`}
            </Link>
          </div>
        )}
      </FadeIn>

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'Concentración' : 'Concentration'} />
        <div className="mt-7 max-w-3xl mx-auto">
          <ConcentrationBars
            top10Share={top10Share}
            top1Share={top1Share}
            sectorAccent={sectorAccent}
            lang={lang}
          />
        </div>
      </FadeIn>
    </ChapterShell>
  )
}

function SupplierRow({
  rank,
  vendor,
  share,
  riskColor,
  dominantBadge,
  sectorAccent,
}: {
  rank: number
  vendor: { vendor_id: number; vendor_name: string; total_value_mxn?: number; contract_count?: number; avg_risk_score?: number }
  share: number
  riskColor: string
  dominantBadge: string | null
  sectorAccent: string
}) {
  const navigate = useNavigate()
  const score = vendor.avg_risk_score ?? 0
  const riskPct = score > 0 ? Math.round(score * 100) : null
  return (
    <button
      type="button"
      onClick={() => navigate(`/vendors/${vendor.vendor_id}`)}
      className="w-full text-left flex items-baseline gap-3 px-3 py-2 rounded-sm hover:bg-background-card/60 transition-colors"
      style={{ borderLeft: `2px solid ${riskColor}`, background: 'none', border: 'none', cursor: 'pointer' }}
    >
      <span
        className="font-mono tabular-nums flex-shrink-0"
        style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 24 }}
      >
        {rank}
      </span>
      <span
        className="flex-1 min-w-0 truncate"
        style={{
          fontFamily: '"Source Serif Pro", Georgia, serif',
          fontSize: 14,
          color: 'var(--color-text-primary)',
        }}
      >
        {toTitleCase(formatVendorName(vendor.vendor_name, 80))}
      </span>
      {dominantBadge && (
        <span
          className="font-mono flex-shrink-0"
          style={{
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: sectorAccent,
            fontWeight: 700,
            padding: '2px 6px',
            background: `${sectorAccent}1f`,
            border: `1px solid ${sectorAccent}44`,
            borderRadius: 2,
          }}
        >
          {dominantBadge}
        </span>
      )}
      <span
        className="font-mono tabular-nums flex-shrink-0 text-right"
        style={{ fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 72 }}
      >
        {formatCompactMXN(vendor.total_value_mxn ?? 0)}
      </span>
      <span
        className="font-mono tabular-nums flex-shrink-0 text-right"
        style={{ fontSize: 11, color: sectorAccent, fontWeight: 700, minWidth: 48 }}
      >
        {share.toFixed(1)}%
      </span>
      <span
        className="font-mono tabular-nums flex-shrink-0 text-right"
        style={{ fontSize: 10, color: riskColor, fontWeight: 700, minWidth: 36 }}
      >
        {riskPct ?? '—'}
      </span>
    </button>
  )
}

function ConcentrationBars({
  top10Share,
  top1Share,
  sectorAccent,
  lang,
}: {
  top10Share: number
  top1Share: number
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  return (
    <div className="space-y-6">
      <ConcentrationRow
        label={lang === 'es' ? 'Top 10 proveedores' : 'Top 10 suppliers'}
        value={top10Share}
        sectorAccent={sectorAccent}
        lang={lang}
      />
      <ConcentrationRow
        label={lang === 'es' ? 'Proveedor #1' : 'Top supplier'}
        value={top1Share}
        sectorAccent={sectorAccent}
        lang={lang}
      />
    </div>
  )
}

function ConcentrationRow({
  label,
  value,
  sectorAccent,
  lang,
}: {
  label: string
  value: number
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="font-mono"
          style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}
        >
          {label}
        </span>
        <span
          className="tabular-nums"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 22,
            color: sectorAccent,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {value.toFixed(1)}
          <span
            className="font-mono"
            style={{ fontSize: 11, fontStyle: 'normal', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 4 }}
          >
            %
          </span>
        </span>
      </div>
      <div
        className="relative w-full"
        style={{ height: 6, background: 'var(--color-background-elevated)', border: '1px solid var(--color-border)' }}
      >
        <div className="absolute inset-y-0 left-0" style={{ width: `${clamped}%`, background: sectorAccent, opacity: 0.92 }} />
      </div>
      <p
        className="mt-1.5 font-mono"
        style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--color-text-muted)' }}
      >
        {lang === 'es' ? `▎ del gasto institucional total` : '▎ of total institutional spend'}
      </p>
    </div>
  )
}

function buildLede({
  institutionName,
  top1,
  top1Share,
  top10Share,
  totalVendors,
  lang,
}: {
  institutionName: string
  top1?: { vendor_name: string; total_value_mxn?: number }
  top1Share: number
  top10Share: number
  totalVendors?: number
  lang: 'en' | 'es'
}): string {
  const name = toTitleCase(institutionName)
  const top1Name = top1 ? toTitleCase(formatVendorName(top1.vendor_name, 80)) : null
  if (top1Name && top1Share >= 10) {
    return lang === 'es'
      ? `${name} reparte su gasto entre ${formatNumber(totalVendors ?? 0)} proveedores, pero ${top1Name} sola concentra el ${top1Share.toFixed(0)}% — los diez mayores acumulan el ${top10Share.toFixed(0)}%.`
      : `${name} spreads its spend across ${formatNumber(totalVendors ?? 0)} suppliers, but ${top1Name} alone concentrates ${top1Share.toFixed(0)}% — the top ten capture ${top10Share.toFixed(0)}%.`
  }
  return lang === 'es'
    ? `Los diez mayores proveedores de ${name} capturan el ${top10Share.toFixed(0)}% del gasto institucional, repartido entre ${formatNumber(totalVendors ?? 0)} proveedores en total.`
    : `${name}'s top ten suppliers capture ${top10Share.toFixed(0)}% of institutional spend, distributed among ${formatNumber(totalVendors ?? 0)} suppliers total.`
}

function toTitleCase(raw: string): string {
  if (!raw) return raw
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}
