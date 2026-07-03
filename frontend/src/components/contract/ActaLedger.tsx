/**
 * ActaLedger — «EL ACTA» / "The annotated record" (El Cotejo remake, P2+P6).
 *
 * Renders the contract as one archival document, with every risk-model
 * objection pinned in the right-hand margin next to the exact field it
 * indicts (ICIJ Pandora Papers annotated-document overlay mechanic). Merges
 * the former §1 facts grid + §2 RiskFactorLedger + OfficialCard +
 * ContractSignalTags into a single acta card — their logic survives
 * (severity ranking, factor localization, fallback basis, structural tags),
 * their geometry does not.
 *
 * Spec: contract-el-cotejo-fable-2026-07-02-spec.md §2.2, §3, §4.
 * Desktop: 3-column grid (label · value · margin), the margin rule running
 * the full acta height. Mobile (<768px): single column, label above value,
 * margin notes indented beneath their row.
 *
 * P6 (MonthBand): a rects+lines-only micro-strip on the FECHAS row — zero
 * <circle> anywhere in this file, per the platform's dot-grid ban.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { getAdministrationByYear } from '@/lib/administrations'
import { RISK_COLORS } from '@/lib/constants'
import { formatDate, formatMXN, formatNumber } from '@/lib/utils'
import {
  anchorRowOf,
  buildStructuralNotes,
  describeContractFactor,
  localizeProcedure,
  severityWord,
  type ActaRowKey,
  type DescribedFactor,
  type StructuralNote,
} from '@/lib/contract-format'
import type {
  ContractContextResponse,
  ContractDetail,
  ContractRiskBreakdownResponse,
  RiskExplanation,
} from '@/api/types'

const INK_BORDER = '1px solid var(--color-border)'
const INK_INSET = 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)'
const ERA: Record<string, string> = { A: '2002–2010', B: '2010–2017', C: '2018–2022', D: '2023–2025' }

const LABEL_STYLE: CSSProperties = {
  fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
  fontSize: 12,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
}
const VALUE_STYLE: CSSProperties = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontSize: 15,
  color: 'var(--color-text-primary)',
  lineHeight: 1.4,
}
const VALUE_MONO_STYLE: CSSProperties = {
  ...VALUE_STYLE,
  fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
  fontVariantNumeric: 'tabular-nums',
}
const SUBLINE_SERIF: CSSProperties = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontSize: 13,
  color: 'var(--color-text-secondary)',
  lineHeight: 1.4,
}
const SUBLINE_MONO: CSSProperties = {
  fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
  fontSize: 13,
  color: 'var(--color-text-secondary)',
}

// ── A unified margin note — normalizes a real risk factor and a structural
// flag to the same rendering shape (glyph + optional severity word + label
// + optional param + left-rule color). ──────────────────────────────────────
interface MarginNote {
  key: string
  glyph: '▲' | '·'
  severityLabel: string // '' when not a severity-ranked risk factor
  color: string
  label: string
  param?: string
  title?: string
  sortKey: number
}

function noteFromFactor(f: DescribedFactor, lang: 'en' | 'es'): MarginNote {
  const color = f.severity === 'alto' ? RISK_COLORS.critical : f.severity === 'medio' ? RISK_COLORS.medium : 'var(--color-text-muted)'
  return {
    key: f.code,
    glyph: f.severity ? '▲' : '·',
    severityLabel: severityWord(f.severity, lang),
    color,
    label: f.label,
    param: f.param ?? undefined,
    sortKey: f.sortKey,
  }
}

function noteFromStructural(n: StructuralNote): MarginNote {
  return {
    key: n.dedupeKey ?? n.label,
    glyph: n.glyph,
    severityLabel: '',
    color: n.color,
    label: n.label,
    title: n.title,
    sortKey: -1, // structural notes never outrank a real severity-ranked factor
  }
}

function MarginNoteRow({ note, mobile }: { note: MarginNote; mobile?: boolean }) {
  return (
    <div
      className={mobile ? 'flex items-baseline gap-2 py-1 pl-3' : 'flex items-baseline gap-2 py-1.5 pl-3'}
      style={{ borderLeft: `2px solid ${note.color}` }}
      title={note.title}
    >
      <span aria-hidden="true" style={{ fontSize: 12, color: note.color, fontWeight: 700, minWidth: 12, textAlign: 'center' }}>
        {note.glyph}
      </span>
      <span className="min-w-0">
        {note.severityLabel && (
          <span
            className="font-mono block"
            style={{ fontSize: 8.5, letterSpacing: '0.10em', fontWeight: 700, color: note.color }}
          >
            {note.severityLabel}
          </span>
        )}
        <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 12.5, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
          {note.label}
        </span>
        {note.param && (
          <span
            className="block font-mono tabular-nums"
            style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
          >
            {note.param}
          </span>
        )}
      </span>
    </div>
  )
}

// ── One acta row: label · value(+sublines) · margin(notes). Desktop renders
// the three as a 3-column grid row; mobile stacks them (label above value,
// margin indented beneath, no vertical rule). ───────────────────────────────
function ActaRow({
  label,
  value,
  sublines,
  notes,
  extra,
  last,
}: {
  label: string
  value: ReactNode
  sublines?: ReactNode[]
  notes: MarginNote[]
  extra?: ReactNode
  last?: boolean
}) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[108px_minmax(0,1fr)_236px] gap-x-4"
      style={{ paddingTop: 12, paddingBottom: 12 }}
    >
      <div className="md:pt-0.5" style={LABEL_STYLE}>{label}</div>
      <div
        className="min-w-0"
        style={{
          borderBottom: last ? undefined : '1px solid color-mix(in srgb, var(--color-border) 40%, transparent)',
          paddingBottom: 10,
        }}
      >
        {value}
        {sublines?.map((s, i) => <div key={i} className="mt-1">{s}</div>)}
        {extra && <div className="mt-2">{extra}</div>}
      </div>
      <div
        className="md:pl-4 mt-2 md:mt-0 md:border-l space-y-0.5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {notes.map((n) => <MarginNoteRow key={n.key} note={n} />)}
      </div>
    </div>
  )
}

// ── MonthBand micro-strip (P6) — rects + lines only, zero <circle>. ─────────
function MonthBand({
  width,
  awardDate,
  publicationDate,
  isYearEnd,
  publicationDelayDays,
  accent,
  lang,
}: {
  width: number
  awardDate: Date
  publicationDate: Date | null
  isYearEnd: boolean
  publicationDelayDays: number | null
  accent: string
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const H = 30
  const bandY = 10
  const bandH = 6
  const w = Math.max(120, width)

  const yearStart = new Date(Date.UTC(awardDate.getUTCFullYear(), 0, 1)).getTime()
  const yearEnd = new Date(Date.UTC(awardDate.getUTCFullYear(), 11, 31)).getTime()
  const span = Math.max(1, yearEnd - yearStart)
  const xOf = (d: Date) => (( d.getTime() - yearStart) / span) * w

  const quarterLabels = isEs ? ['ENE', 'ABR', 'JUL', 'OCT'] : ['JAN', 'APR', 'JUL', 'OCT']
  const quarterMonths = [0, 3, 6, 9]

  const awardX = xOf(awardDate)
  const novStart = xOf(new Date(Date.UTC(awardDate.getUTCFullYear(), 10, 1)))

  const pubSameYear = publicationDate && publicationDate.getUTCFullYear() === awardDate.getUTCFullYear()
  const pubX = pubSameYear && publicationDate ? xOf(publicationDate) : null
  const showDelayLabel = publicationDelayDays != null && publicationDelayDays > 30

  return (
    <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-hidden="true" style={{ display: 'block', marginTop: 6 }}>
      {isYearEnd && (
        <rect
          x={novStart}
          y={bandY}
          width={Math.max(0, w - novStart)}
          height={bandH}
          fill={RISK_COLORS.medium}
          opacity={0.18}
        />
      )}
      <rect x={0} y={bandY} width={w} height={bandH} fill="var(--color-border)" opacity={0.5} />
      {quarterMonths.map((m, i) => {
        const x = xOf(new Date(Date.UTC(awardDate.getUTCFullYear(), m, 1)))
        return (
          <g key={m}>
            <line x1={x} x2={x} y1={bandY - 2} y2={bandY + bandH + 2} stroke="var(--color-border)" strokeWidth={0.75} />
            <text x={x} y={H} textAnchor="start" fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace' fontSize={8} fill="var(--color-text-muted)">
              {quarterLabels[i]}
            </text>
          </g>
        )
      })}
      {/* Award tick */}
      <rect x={awardX - 1} y={bandY - 5} width={2} height={16} fill={accent} />
      {/* Publication tick + delay connector */}
      {pubX != null && (
        <rect x={pubX - 0.625} y={bandY - 1} width={1.25} height={12} fill="var(--color-text-muted)" />
      )}
      {showDelayLabel && pubX != null && (
        <line x1={awardX} x2={pubX} y1={bandY + bandH / 2} y2={bandY + bandH / 2} stroke="var(--color-text-muted)" strokeWidth={1} opacity={0.6} />
      )}
      {showDelayLabel && (
        <text
          x={Math.min(w - 4, (pubX ?? awardX) + 4)}
          y={bandY + bandH + 12}
          textAnchor={pubX != null && pubX > w - 40 ? 'end' : 'start'}
          fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
          fontSize={8}
          fill="var(--color-text-muted)"
        >
          {isEs ? `+${publicationDelayDays} días` : `+${publicationDelayDays} days`}
        </text>
      )}
    </svg>
  )
}

export function ActaLedger({
  contract,
  breakdown,
  explanation,
  context,
  riskPct,
  sectorAccent,
  lang,
}: {
  contract: ContractDetail
  breakdown: ContractRiskBreakdownResponse | undefined
  explanation: RiskExplanation | undefined
  context: ContractContextResponse | undefined
  riskPct: number | null
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const [shapOpen, setShapOpen] = useState(false)

  const valueColRef = useRef<HTMLDivElement>(null)
  const [valueColWidth, setValueColWidth] = useState(360)
  useEffect(() => {
    if (!valueColRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setValueColWidth(w)
    })
    ro.observe(valueColRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Factors + structural notes, routed to rows, deduped ──────────────────
  const described = (breakdown?.factors ?? [])
    .map((f) => describeContractFactor(f, lang))
    .sort((a, b) => b.sortKey - a.sortKey)

  const structural = buildStructuralNotes(contract, lang)
  const structuralPills = structural.filter((n) => n.kind === 'pill')
  const structuralMarginNotes = structural.filter((n) => n.kind === 'note')

  // dedupe: skip a structural note when a factor of its dedupeKey family
  // already anchors that same row.
  const factorFamilies = new Set(described.map((f) => f.code.split(':')[0]))
  const dedupedStructuralNotes = structuralMarginNotes.filter((n) => {
    if (!n.dedupeKey) return true
    return ![...factorFamilies].some((fam) => fam === n.dedupeKey || fam.startsWith(n.dedupeKey + '_') || (n.dedupeKey === 'threshold_split' && fam.startsWith('split_')))
  })

  const rowNotes: Record<ActaRowKey, MarginNote[]> = {
    monto: [], procedimiento: [], proveedor: [], institucion: [], fechas: [], general: [],
  }
  for (const f of described) {
    rowNotes[anchorRowOf(f)].push(noteFromFactor(f, lang))
  }
  for (const n of dedupedStructuralNotes) {
    rowNotes[n.row].push(noteFromStructural(n))
  }
  for (const key of Object.keys(rowNotes) as ActaRowKey[]) {
    rowNotes[key].sort((a, b) => b.sortKey - a.sortKey)
  }

  const hasAnyFactorBasis = described.length > 0
  // C1 boolean fallback basis, when the model recorded a score with no
  // itemized factors (RiskFactorLedger's exact fallback strings, kept).
  const fallbackBasis: string[] = []
  if (!hasAnyFactorBasis) {
    if (contract.is_direct_award) fallbackBasis.push(isEs ? 'adjudicación directa' : 'direct award')
    if (contract.is_single_bid) fallbackBasis.push(isEs ? 'postor único' : 'single bid')
    if (contract.is_year_end) fallbackBasis.push(isEs ? 'concentración fin de año' : 'year-end concentration')
    if (contract.pyod_is_outlier && contract.ensemble_anomaly_score != null) {
      fallbackBasis.push(
        isEs
          ? `valor atípico PyOD (${contract.ensemble_anomaly_score.toFixed(2)})`
          : `PyOD outlier (${contract.ensemble_anomaly_score.toFixed(2)})`,
      )
    }
  }

  // ── MONTO ──────────────────────────────────────────────────────────────
  const showOriginalCurrency = !!contract.currency && contract.currency !== 'MXN' && contract.amount_original != null
  const montoValue = (
    <span style={VALUE_MONO_STYLE}>{formatMXN(Number(contract.amount_mxn ?? 0))}</span>
  )
  const montoSublines: ReactNode[] = []
  if (showOriginalCurrency) {
    montoSublines.push(
      <span style={SUBLINE_MONO}>
        {isEs ? 'moneda original: ' : 'original currency: '}{contract.currency} {formatNumber(Number(contract.amount_original))}
      </span>,
    )
  }

  // ── PROCEDIMIENTO ──────────────────────────────────────────────────────
  const procedureLabel = localizeProcedure(contract.procedure_type_normalized ?? contract.procedure_type, lang)
  const exception = context?.official?.exception_article?.trim()
  const procSublines: ReactNode[] = []
  if (contract.procedure_number) {
    procSublines.push(<span style={SUBLINE_MONO}>Nº {contract.procedure_number}</span>)
  }
  if (exception) {
    procSublines.push(
      <span style={SUBLINE_SERIF}>{isEs ? 'Excepción legal: ' : 'Legal exception: '}{exception}</span>,
    )
  }
  const procedurePills = structuralPills.length > 0 ? (
    <div className="flex flex-wrap items-center gap-1.5">
      {structuralPills.map((p) => (
        <span
          key={p.label}
          className="font-mono"
          style={{
            fontSize: 13,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: p.color,
            background: `${p.color}1f`,
            border: `1px solid ${p.color}44`,
            padding: '2px 6px',
            borderRadius: 2,
          }}
          title={p.title}
        >
          {p.label}
        </span>
      ))}
    </div>
  ) : undefined

  // ── CATEGORÍA ──────────────────────────────────────────────────────────
  const categoryId = context?.official?.category_id
  const categoryName = isEs
    ? (context?.official?.category_name_es || context?.official?.category_name_en)
    : (context?.official?.category_name_en || context?.official?.category_name_es)
  const hasCategory = categoryId != null && !!categoryName

  // ── PROVEEDOR / INSTITUCIÓN ────────────────────────────────────────────
  const hasVendor = contract.vendor_id != null && !!contract.vendor_name
  const hasInstitution = contract.institution_id != null && !!contract.institution_name

  // ── RESPONSABLE ────────────────────────────────────────────────────────
  const officialName = context?.official?.responsible_uc?.trim()

  // ── FECHAS ─────────────────────────────────────────────────────────────
  const contractDate = contract.contract_date ? new Date(contract.contract_date) : null
  const awardDate = contract.award_date ? new Date(contract.award_date) : null
  const publicationDate = contract.publication_date ? new Date(contract.publication_date) : null
  const monthBandAnchor = awardDate ?? contractDate
  const hasAnyDate = !!(contractDate || awardDate || publicationDate)

  const admin = getAdministrationByYear(contract.contract_year)
  const term = admin ? (isEs ? admin.long : admin.short) : null
  const sexenioYear = contract.sexenio_year

  const politicalNote: MarginNote | null = (term || sexenioYear != null) ? {
    key: 'political-cycle',
    glyph: '·',
    severityLabel: '',
    color: 'var(--color-text-muted)',
    label: [term, sexenioYear != null ? (isEs ? `año ${sexenioYear} del sexenio` : `year ${sexenioYear} of the term`) : null]
      .filter(Boolean).join(' · '),
    sortKey: -2,
  } : null

  const fechasNotes = [...rowNotes.fechas]
  if (politicalNote) fechasNotes.push(politicalNote)

  // ── General objections block (unroutable factors) ─────────────────────
  const generalNotes = rowNotes.general

  // ── Data quality / era footer ──────────────────────────────────────────
  const struct = contract.source_structure
  const era = struct ? ERA[struct] : undefined
  const grade = contract.data_quality_grade
  const hasFooterStrip = !!grade || !!struct || !!contract.url

  const shapAvailable = Boolean(explanation?.explanation_available) && (explanation?.features?.length ?? 0) > 0

  const objectionCount = described.length

  return (
    <div>
      <div
        className="relative rounded-sm px-5 md:px-6"
        style={{ border: INK_BORDER, boxShadow: INK_INSET, background: 'var(--color-background-elevated)', paddingTop: 34, paddingBottom: 30 }}
      >
        <CropMark position="tl" />
        <CropMark position="tr" />
        <CropMark position="bl" />
        <CropMark position="br" />

        {/* Header strip */}
        <div
          className="absolute left-5 right-5 md:left-6 md:right-6 flex items-center justify-between gap-3 flex-wrap"
          style={{ top: 12, fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace', fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
        >
          <span>ACTA · CONT-{contract.id}</span>
          {struct && <span>COMPRANET · {isEs ? 'ESTRUCTURA' : 'STRUCTURE'} {struct}</span>}
        </div>

        {/* Rows */}
        <div>
          <ActaRow
            label={isEs ? 'MONTO' : 'AMOUNT'}
            value={montoValue}
            sublines={montoSublines}
            notes={rowNotes.monto}
          />
          <ActaRow
            label={isEs ? 'PROCEDIM.' : 'PROCEDURE'}
            value={<span style={VALUE_STYLE}>{procedureLabel}</span>}
            sublines={procSublines}
            extra={procedurePills}
            notes={rowNotes.procedimiento}
          />
          {hasCategory && (
            <ActaRow
              label={isEs ? 'CATEGORÍA' : 'CATEGORY'}
              value={<EntityIdentityChip type="category" id={categoryId as number} name={categoryName as string} size="sm" />}
              notes={[]}
            />
          )}
          {hasVendor && (
            <ActaRow
              label={isEs ? 'PROVEEDOR' : 'VENDOR'}
              value={
                <EntityIdentityChip
                  type="vendor"
                  id={contract.vendor_id as number}
                  name={contract.vendor_name as string}
                  riskScore={Number(contract.risk_score ?? 0) > 0 ? Number(contract.risk_score) : null}
                  fullName
                />
              }
              notes={rowNotes.proveedor}
            />
          )}
          {hasInstitution && (
            <ActaRow
              label={isEs ? 'INSTITUC.' : 'INSTITUTION'}
              value={
                <EntityIdentityChip
                  type="institution"
                  id={contract.institution_id as number}
                  name={contract.institution_name as string}
                  fullName
                />
              }
              notes={rowNotes.institucion}
            />
          )}
          {officialName && (
            <ActaRow
              label={isEs ? 'RESPONS.' : 'RESPONSIBLE'}
              value={
                <Link
                  to={`/officials/${encodeURIComponent(officialName)}`}
                  className="hover:opacity-70 transition-opacity"
                  style={{
                    display: 'inline-block',
                    textDecoration: 'none',
                    fontFamily: '"EB Garamond", Georgia, serif',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    fontSize: 18,
                    lineHeight: 1.2,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {officialName}
                </Link>
              }
              sublines={[
                <span className="font-mono" style={{ fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {isEs ? 'unidad responsable · autorizó la adjudicación' : 'responsible unit · authorized the award'}
                </span>,
              ]}
              notes={[]}
            />
          )}
          {hasAnyDate && (
            <ActaRow
              label={isEs ? 'FECHAS' : 'DATES'}
              last
              value={
                <div ref={valueColRef} className="space-y-0.5">
                  {contractDate && (
                    <div style={SUBLINE_MONO}>{isEs ? 'contrato ' : 'contract '}{formatDate(contract.contract_date as string)}</div>
                  )}
                  {awardDate && (
                    <div style={SUBLINE_MONO}>{isEs ? 'adjudicación ' : 'award '}{formatDate(contract.award_date as string)}</div>
                  )}
                  {publicationDate && (
                    <div style={SUBLINE_MONO}>{isEs ? 'publicación ' : 'publication '}{formatDate(contract.publication_date as string)}</div>
                  )}
                  {monthBandAnchor && (
                    <MonthBand
                      width={Math.min(valueColWidth, 360)}
                      awardDate={monthBandAnchor}
                      publicationDate={publicationDate}
                      isYearEnd={!!contract.is_year_end}
                      publicationDelayDays={contract.publication_delay_days ?? null}
                      accent={sectorAccent}
                      lang={lang}
                    />
                  )}
                </div>
              }
              notes={fechasNotes}
            />
          )}
        </div>

        {/* General objections — unroutable factors, same note anatomy */}
        {generalNotes.length > 0 && (
          <div className="mt-2 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="font-mono mb-2" style={{ fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              {isEs ? 'Objeciones generales' : 'General objections'}
            </div>
            <div className="space-y-0.5 max-w-md">
              {generalNotes.map((n) => <MarginNoteRow key={n.key} note={n} mobile />)}
            </div>
          </div>
        )}

        {/* No-factors fallback basis */}
        {!hasAnyFactorBasis && fallbackBasis.length > 0 && (
          <div className="mt-2 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {isEs ? `Señales registradas: ${fallbackBasis.join(' · ')}.` : `Recorded signals: ${fallbackBasis.join(' · ')}.`}
            </p>
          </div>
        )}

        {/* Null margin state — scored, zero factors, zero booleans */}
        {!hasAnyFactorBasis && fallbackBasis.length === 0 && riskPct != null && (
          <div className="mt-2 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontSize: 13, color: 'var(--color-text-muted)' }}>
              {isEs ? `Sin objeciones registradas — indicador ${riskPct}/100.` : `No recorded objections — ${riskPct}/100 indicator.`}
            </p>
          </div>
        )}

        {/* SHAP progressive enhancement (ported verbatim from RiskFactorLedger) */}
        {shapAvailable && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShapOpen((v) => !v)}
              aria-expanded={shapOpen}
              className="font-mono uppercase tracking-[0.10em] hover:opacity-70 transition-opacity cursor-pointer"
              style={{ fontSize: 12, color: 'var(--color-accent)', background: 'none', border: 'none', padding: '4px 0' }}
            >
              {shapOpen
                ? (isEs ? '⌃ Ocultar descomposición SHAP' : '⌃ Hide SHAP decomposition')
                : (isEs ? '⌄ Descomposición SHAP' : '⌄ SHAP decomposition')}
            </button>
            {shapOpen && (
              <ul className="mt-2 space-y-1.5 list-none p-0">
                {[...(explanation?.features ?? [])]
                  .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
                  .slice(0, 6)
                  .map((f, i) => {
                    const pos = f.contribution > 0
                    const c = pos ? RISK_COLORS.critical : 'var(--color-text-muted)'
                    return (
                      <li key={i} className="flex items-baseline gap-3 px-3 py-1.5" style={{ borderLeft: `2px solid ${c}` }}>
                        <span aria-hidden="true" style={{ fontSize: 13, color: c, fontWeight: 700, minWidth: 14 }}>
                          {pos ? '▲' : '▽'}
                        </span>
                        <span className="flex-1 min-w-0" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 13, color: 'var(--color-text-primary)' }}>
                          {f.label}
                        </span>
                        <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 13, color: c, fontWeight: 700 }}>
                          {pos ? '+' : ''}{f.contribution.toFixed(3)}
                        </span>
                      </li>
                    )
                  })}
              </ul>
            )}
          </div>
        )}

        {/* Footer strip */}
        {hasFooterStrip && (
          <div className="mt-6 pt-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
              {[
                grade ? (isEs ? `Calidad de datos ${grade}` : `Data quality ${grade}`) : null,
                struct ? `${isEs ? 'Estructura' : 'Structure'} ${struct}${era ? ` — ${era}` : ''}` : null,
              ].filter(Boolean).join(' · ')}
            </span>
            {contract.url && (
              <a
                href={contract.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
                style={{ fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'none' }}
              >
                ⧉ {isEs ? 'Documento' : 'Document'}
              </a>
            )}
          </div>
        )}
      </div>

      {objectionCount === 0 && <span className="sr-only" aria-hidden="true" />}
    </div>
  )
}

// ── Corner crop marks — same local pattern as SpectralRegister; PlateFrame's
// lens/year props don't fit this surface. ───────────────────────────────────
type CropPos = 'tl' | 'tr' | 'bl' | 'br'

function CropMark({ position }: { position: CropPos }) {
  const inset = 8
  const size = 14
  const stroke = 'rgba(160, 104, 32, 0.55)'
  const baseStyle: CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    pointerEvents: 'none',
  }
  const positions: Record<CropPos, CSSProperties> = {
    tl: { top: inset, left: inset, borderTop: `1px solid ${stroke}`, borderLeft: `1px solid ${stroke}` },
    tr: { top: inset, right: inset, borderTop: `1px solid ${stroke}`, borderRight: `1px solid ${stroke}` },
    bl: { bottom: inset, left: inset, borderBottom: `1px solid ${stroke}`, borderLeft: `1px solid ${stroke}` },
    br: { bottom: inset, right: inset, borderBottom: `1px solid ${stroke}`, borderRight: `1px solid ${stroke}` },
  }
  return <span aria-hidden="true" style={{ ...baseStyle, ...positions[position] }} />
}
