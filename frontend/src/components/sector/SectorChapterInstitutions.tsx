/**
 * SectorChapterInstitutions — Chapter III of sector dossier.
 *
 * Argument: WHO SPENDS in this sector. Top institutions ranked by spend,
 * with their share-of-sector + HR% as the procurement signature.
 */
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SpatialInstitution } from '@/api/client'
import { RISK_COLORS, SECTOR_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  FadeIn,
} from '@/components/dossier/primitives'

interface Props {
  sectorCode: string
  sectorName: string
  institutions: SpatialInstitution[]
  totalSpend: number
  totalInstitutions: number
}

export function SectorChapterInstitutions({
  sectorCode,
  sectorName,
  institutions,
  totalSpend,
  totalInstitutions,
}: Props) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'

  // Top-10 by spend
  const top10 = [...institutions]
    .sort((a, b) => b.total_amount_mxn - a.total_amount_mxn)
    .slice(0, 10)
  const top10Spend = top10.reduce((s, i) => s + i.total_amount_mxn, 0)
  const top10Share = totalSpend > 0 ? (top10Spend / totalSpend) * 100 : 0
  const top1 = top10[0]
  const top1Share = top1 && totalSpend > 0 ? (top1.total_amount_mxn / totalSpend) * 100 : 0

  const lede = buildLede({ sectorName, top1, top1Share, top10Share, totalInstitutions, lang })

  return (
    <ChapterShell id="institutions">
      <ChapterHeading
        numeral="III"
        title={lang === 'es' ? 'Las Instituciones' : 'Institutions'}
        subtitle={lang === 'es' ? 'Quién gasta' : 'Who spends'}
        sectorAccent={sectorAccent}
      />
      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={sectorAccent}>{lede}</LedeParagraph>
      </FadeIn>

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'Las diez mayores' : 'The top ten'} />
        <ul className="mt-7 max-w-3xl mx-auto space-y-2 list-none p-0">
          {top10.map((inst, idx) => {
            const share = totalSpend > 0 ? (inst.total_amount_mxn / totalSpend) * 100 : 0
            const dominantBadge = share >= 10 ? (lang === 'es' ? 'DOMINANTE' : 'DOMINANT') : null
            const riskLevel = inst.risk > 0 ? getRiskLevelFromScore(inst.risk) : 'low'
            const riskColor = RISK_COLORS[riskLevel]
            return (
              <li key={inst.institution_id}>
                <InstitutionRow
                  rank={idx + 1}
                  institution={inst}
                  share={share}
                  riskColor={riskColor}
                  dominantBadge={dominantBadge}
                  sectorAccent={sectorAccent}
                />
              </li>
            )
          })}
        </ul>
      </FadeIn>

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'Concentración' : 'Concentration'} />
        <div className="mt-7 max-w-3xl mx-auto space-y-6">
          <ConcentrationRow
            label={lang === 'es' ? 'Top 10 instituciones' : 'Top 10 institutions'}
            value={top10Share}
            sectorAccent={sectorAccent}
            lang={lang}
          />
          <ConcentrationRow
            label={lang === 'es' ? 'Institución #1' : 'Top institution'}
            value={top1Share}
            sectorAccent={sectorAccent}
            lang={lang}
          />
        </div>
      </FadeIn>
    </ChapterShell>
  )
}

function InstitutionRow({
  rank,
  institution,
  share,
  riskColor,
  dominantBadge,
  sectorAccent,
}: {
  rank: number
  institution: SpatialInstitution
  share: number
  riskColor: string
  dominantBadge: string | null
  sectorAccent: string
}) {
  const navigate = useNavigate()
  const riskPct = institution.risk > 0 ? Math.round(institution.risk * 100) : null
  return (
    <button
      type="button"
      onClick={() => navigate(`/institutions/${institution.institution_id}`)}
      className="w-full text-left flex items-baseline gap-3 px-3 py-2 rounded-sm hover:bg-background-card/60 transition-colors"
      style={{ borderLeft: `2px solid ${riskColor}`, background: 'none', border: 'none', cursor: 'pointer' }}
    >
      <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 24 }}>{rank}</span>
      <span
        className="flex-1 min-w-0 truncate"
        style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontSize: 14, color: 'var(--color-text-primary)' }}
      >
        {toTitleCase(institution.name)}
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
        {formatCompactMXN(institution.total_amount_mxn)}
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
          <span className="font-mono" style={{ fontSize: 11, fontStyle: 'normal', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 4 }}>
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
        {lang === 'es' ? '▎ del gasto sectorial total' : '▎ of total sector spend'}
      </p>
    </div>
  )
}

function buildLede({
  sectorName,
  top1,
  top1Share,
  top10Share,
  totalInstitutions,
  lang,
}: {
  sectorName: string
  top1?: SpatialInstitution
  top1Share: number
  top10Share: number
  totalInstitutions: number
  lang: 'en' | 'es'
}): string {
  const top1Name = top1 ? toTitleCase(top1.name) : null
  if (top1Name && top1Share >= 25) {
    return lang === 'es'
      ? `Aunque ${sectorName} agrupa ${formatNumber(totalInstitutions)} instituciones, ${top1Name} concentra por sí sola el ${top1Share.toFixed(0)}% del gasto — las diez mayores acumulan el ${top10Share.toFixed(0)}%.`
      : `Although ${sectorName} groups ${formatNumber(totalInstitutions)} institutions, ${top1Name} alone concentrates ${top1Share.toFixed(0)}% of the spend — the top ten capture ${top10Share.toFixed(0)}%.`
  }
  return lang === 'es'
    ? `Las diez mayores instituciones de ${sectorName} concentran el ${top10Share.toFixed(0)}% del gasto sectorial, repartido entre ${formatNumber(totalInstitutions)} instituciones en total.`
    : `${sectorName}'s top ten institutions concentrate ${top10Share.toFixed(0)}% of sector spend, distributed across ${formatNumber(totalInstitutions)} institutions total.`
}

function toTitleCase(raw: string): string {
  if (!raw) return raw
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}
