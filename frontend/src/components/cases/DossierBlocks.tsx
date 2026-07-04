/**
 * DossierBlocks — El Expediente (/cases/:slug) composition blocks.
 *
 *   CaseDocketRail           — sticky left identity rail (folio, seal, facts,
 *                              § jump links). ProPublica document-reader rail.
 *   MoneyBenchmark           — FT bullet: this case's loss vs the platform's
 *                              sector red-flag threshold, multiplier caption.
 *   CompranetVisibilityBanner— the honesty fix for "0 contracts · —": leads
 *                              with the evidentiary reach, prefers the API's
 *                              own compranet_note.
 *   LinkedVendorList         — EntityIdentityChip vendor rows (hard rule #1).
 *   KeepReadingFooter        — same-sector onward routing.
 */
import { Link } from 'react-router-dom'
import { formatCompactMXN } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import type { LinkedVendor, ScandalDetail, ScandalListItem } from '@/api/types'
import {
  dispositionFor,
  evidenceLabel,
  folio,
  fraudLabel,
  impunityGap,
  sectorRedFlag,
  sexenioLabel,
  visibilityMeta,
  type Lang,
} from './casesVocab'
import { DispositionSeal, SeverityDots } from './CasesShared'

// ─── CaseDocketRail ─────────────────────────────────────────────────────────

function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-mono uppercase"
      style={{ fontSize: 8.5, letterSpacing: '0.2em', color: 'var(--color-text-muted)', fontWeight: 500 }}
    >
      {children}
    </p>
  )
}

function RailDivider() {
  return <div aria-hidden="true" className="my-2 h-px" style={{ background: 'var(--color-border)' }} />
}

export function CaseDocketRail({
  scandal,
  totalCases,
  sectorName,
  sectorColor,
  sections,
  lang,
}: {
  scandal: ScandalDetail
  totalCases: number | null
  sectorName: string | null
  sectorColor: string | null
  sections: { id: string; numeral: string; label: string }[]
  lang: Lang
}) {
  const gap = impunityGap(scandal)
  const vis = visibilityMeta(scandal.compranet_visibility)
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
        padding: '16px 16px 14px',
        background: 'var(--color-background-card)',
      }}
    >
      <RailLabel>{lang === 'es' ? 'Expediente' : 'Case file'}</RailLabel>
      <p
        className="tabular-nums mt-0.5"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'normal',
          fontWeight: 800,
          fontSize: 20,
          color: 'var(--color-accent)',
          lineHeight: 1,
        }}
      >
        {folio(scandal.id).replace('EXP·', '#')}
        {totalCases ? (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}> / {totalCases}</span>
        ) : null}
      </p>
      {scandal.is_verified ? (
        <p
          className="font-mono mt-1"
          style={{ fontSize: 8.5, letterSpacing: '0.18em', color: 'var(--color-text-secondary)', fontWeight: 600 }}
        >
          {lang === 'es' ? 'VERIFICADO ✓' : 'VERIFIED ✓'}
        </p>
      ) : null}

      <RailDivider />
      <RailLabel>{lang === 'es' ? 'Estado judicial' : 'Legal status'}</RailLabel>
      <div className="mt-1.5">
        <DispositionSeal status={scandal.legal_status} lang={lang} size="md" />
      </div>
      {gap && gap.open && (
        <p
          className="mt-2"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'normal',
            fontSize: 13.5,
            lineHeight: 1.4,
            color: 'var(--color-text-primary)',
          }}
        >
          {lang === 'es'
            ? <><strong className="tabular-nums">{gap.years} años</strong> sin resolución firme</>
            : <><strong className="tabular-nums">{gap.years} years</strong> without a final disposition</>}
        </p>
      )}

      <RailDivider />
      {sectorName && (
        <>
          <RailLabel>{lang === 'es' ? 'Sector' : 'Sector'}</RailLabel>
          <p className="mt-1 flex items-center gap-1.5">
            <span
              aria-hidden="true"
              style={{ width: 7, height: 7, borderRadius: 999, background: sectorColor ?? 'var(--color-text-muted)', flexShrink: 0 }}
            />
            <span
              className="font-mono uppercase"
              style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--color-text-secondary)' }}
            >
              {sectorName}
            </span>
          </p>
          <div className="mt-2" />
        </>
      )}
      <RailLabel>{lang === 'es' ? 'Tipo' : 'Type'}</RailLabel>
      <p
        className="font-mono uppercase mt-1"
        style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--color-text-secondary)' }}
      >
        {fraudLabel(scandal.fraud_type, lang)}
      </p>
      <div className="mt-2" />
      <RailLabel>{lang === 'es' ? 'Sexenio' : 'Term'}</RailLabel>
      <p
        className="font-mono uppercase mt-1"
        style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--color-text-secondary)' }}
      >
        {sexenioLabel(scandal, lang)}
      </p>
      <div className="mt-2" />
      <RailLabel>{lang === 'es' ? 'Gravedad' : 'Severity'}</RailLabel>
      <div className="mt-1.5">
        <SeverityDots severity={scandal.severity} lang={lang} />
      </div>

      <RailDivider />
      <RailLabel>COMPRANET</RailLabel>
      <p className="mt-1 flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-flex items-end gap-[2px]">
          {[1, 2, 3].map((r) => (
            <span
              key={r}
              style={{
                width: 4,
                height: 3 + r * 3,
                background: r <= vis.rung ? 'var(--color-text-secondary)' : 'var(--color-border)',
              }}
            />
          ))}
        </span>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--color-text-secondary)' }}
        >
          {vis.label[lang]}
        </span>
      </p>
      {scandal.ground_truth_case_id != null && (
        <>
          <div className="mt-2" />
          <p
            className="font-mono"
            style={{ fontSize: 13, letterSpacing: '0.16em', color: 'var(--color-accent)', fontWeight: 700 }}
          >
            ▪ {lang === 'es' ? 'ENTRENAMIENTO GT' : 'GT TRAINING'}
          </p>
        </>
      )}

      <RailDivider />
      <RailLabel>{lang === 'es' ? 'En esta página' : 'On this page'}</RailLabel>
      <ul className="mt-1.5 space-y-1 list-none p-0">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="inline-flex items-baseline gap-1.5 hover:opacity-70 transition-opacity"
              style={{ textDecoration: 'none' }}
            >
              <span
                className="tabular-nums"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 800,
                  fontSize: 13,
                  color: 'var(--color-accent)',
                  minWidth: 18,
                }}
              >
                {s.numeral}.
              </span>
              <span
                className="font-mono uppercase"
                style={{ fontSize: 13, letterSpacing: '0.14em', color: 'var(--color-text-secondary)' }}
              >
                {s.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── MoneyBenchmark ─────────────────────────────────────────────────────────

export function MoneyBenchmark({
  amount,
  sectorId,
  sectorName,
  lang,
}: {
  amount: number
  sectorId: number | null
  sectorName: string | null
  lang: Lang
}) {
  const threshold = sectorRedFlag(sectorId)
  const multiplier = amount / threshold
  if (!Number.isFinite(multiplier) || multiplier <= 0) return null
  const scaleMax = Math.max(amount, threshold) * 1.08
  const casePct = (amount / scaleMax) * 100
  const tickPct = (threshold / scaleMax) * 100
  const sector = sectorName ?? (lang === 'es' ? 'el sector' : 'the sector')

  return (
    <div className="mt-4 max-w-xl">
      <div className="space-y-2.5">
        <div>
          <div
            className="flex items-baseline justify-between mb-1 font-mono uppercase"
            style={{ fontSize: 13, letterSpacing: '0.16em', color: 'var(--color-text-secondary)' }}
          >
            <span>{lang === 'es' ? 'Este caso' : 'This case'}</span>
            <span className="tabular-nums" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
              {formatCompactMXN(amount)}
            </span>
          </div>
          <div
            className="relative w-full"
            style={{ height: 8, background: 'var(--color-background-elevated)', border: '1px solid var(--color-border)' }}
            aria-hidden="true"
          >
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: `${casePct}%`, background: 'var(--color-text-primary)', opacity: 0.85 }}
            />
            {/* Red-flag threshold tick */}
            <div
              className="absolute"
              style={{
                left: `${tickPct}%`,
                top: -4,
                bottom: -4,
                width: 2,
                background: 'var(--color-risk-critical)',
              }}
            />
          </div>
          <div
            className="mt-1 flex items-baseline gap-1.5 font-mono uppercase"
            style={{ fontSize: 8.5, letterSpacing: '0.14em', color: 'var(--color-text-muted)' }}
          >
            <span aria-hidden="true" style={{ color: 'var(--color-risk-critical)' }}>▎</span>
            <span>
              {lang === 'es'
                ? `Umbral de alerta · ${formatCompactMXN(threshold)}`
                : `Red-flag threshold · ${formatCompactMXN(threshold)}`}
            </span>
          </div>
        </div>
      </div>
      {multiplier >= 1.5 && (
        <p
          className="mt-3"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'normal',
            fontSize: 14.5,
            lineHeight: 1.45,
            color: 'var(--color-text-primary)',
          }}
        >
          {lang === 'es'
            ? <><strong className="tabular-nums">{multiplier >= 10 ? Math.round(multiplier) : multiplier.toFixed(1)}×</strong> el umbral de revisión de la plataforma para contratos de {sector} — umbral interno, no una norma oficial.</>
            : <><strong className="tabular-nums">{multiplier >= 10 ? Math.round(multiplier) : multiplier.toFixed(1)}×</strong> the platform's review threshold for {sector} contracting — an internal benchmark, not an official norm.</>}
        </p>
      )}
    </div>
  )
}

// ─── CompranetVisibilityBanner ──────────────────────────────────────────────

export function CompranetVisibilityBanner({
  scandal,
  lang,
}: {
  scandal: ScandalDetail
  lang: Lang
}) {
  const vis = visibilityMeta(scandal.compranet_visibility)
  return (
    <div
      className="mb-4"
      style={{
        borderLeft: '2px solid rgba(160,104,32,0.45)',
        paddingLeft: 14,
        maxWidth: '64ch',
      }}
    >
      <p
        className="font-mono uppercase mb-1"
        style={{ fontSize: 13, letterSpacing: '0.2em', color: 'var(--color-accent)', fontWeight: 600 }}
      >
        ▎{lang === 'es' ? 'Visibilidad COMPRANET' : 'COMPRANET visibility'} · {vis.label[lang]}
      </p>
      <p
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'normal',
          fontSize: 14.5,
          lineHeight: 1.5,
          color: 'var(--color-text-secondary)',
        }}
      >
        {vis.body[lang]}
      </p>
      {/* compranet_note is analyst content authored in English only —
          lang="en" keeps screen readers correct on /es. */}
      {scandal.compranet_note && (
        <p
          lang="en"
          className="mt-1.5"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--color-text-muted)',
          }}
        >
          {scandal.compranet_note}
        </p>
      )}
    </div>
  )
}

// ─── LinkedVendorList ───────────────────────────────────────────────────────

export function LinkedVendorList({
  vendors,
  lang,
}: {
  vendors: LinkedVendor[]
  lang: Lang
}) {
  if (vendors.length === 0) return null
  const sorted = [...vendors].sort((a, b) => {
    if ((b.contract_count ?? 0) !== (a.contract_count ?? 0)) {
      return (b.contract_count ?? 0) - (a.contract_count ?? 0)
    }
    return (b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0)
  })
  return (
    <ul className="space-y-1.5 list-none p-0 m-0 max-w-2xl">
      {sorted.map((v, i) => (
        <li
          key={`${v.vendor_id ?? 'unmatched'}-${i}`}
          className="flex items-center gap-3 py-1.5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span className="flex-1 min-w-0">
            {v.vendor_id != null ? (
              <EntityIdentityChip
                type="vendor"
                id={v.vendor_id}
                name={v.vendor_name}
                riskScore={v.avg_risk_score}
                size="sm"
              />
            ) : (
              <span
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontStyle: 'normal',
                  fontSize: 14.5,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {v.vendor_name}
                <span
                  className="font-mono ml-2 uppercase"
                  style={{ fontSize: 8.5, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
                >
                  {lang === 'es' ? 'sin vínculo COMPRANET' : 'no COMPRANET link'}
                </span>
              </span>
            )}
          </span>
          <span
            className="font-mono flex-shrink-0 uppercase"
            style={{
              fontSize: 8.5,
              letterSpacing: '0.12em',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              padding: '2px 6px',
            }}
          >
            {evidenceLabel(v.evidence_strength, lang)}
          </span>
          <span
            className="font-mono tabular-nums flex-shrink-0 text-right"
            style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 96 }}
          >
            {v.contract_count > 0
              ? lang === 'es'
                ? `${v.contract_count} contratos`
                : `${v.contract_count} contracts`
              : lang === 'es'
                ? 'sin contratos en la ventana'
                : 'none in the window'}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── KeepReadingFooter ──────────────────────────────────────────────────────

export function KeepReadingFooter({
  current,
  allCases,
  lang,
}: {
  current: ScandalDetail
  allCases: ScandalListItem[] | undefined
  lang: Lang
}) {
  const sectorId = current.sector_id ?? current.sector_ids?.[0] ?? null
  const sector = sectorId != null ? SECTORS.find((s) => s.id === sectorId) : null

  const related = (allCases ?? [])
    .filter((c) => c.id !== current.id)
    .filter((c) =>
      sectorId != null
        ? c.sector_id === sectorId || (c.sector_ids ?? []).includes(sectorId)
        : true,
    )
    .sort((a, b) => (b.amount_mxn_low ?? 0) - (a.amount_mxn_low ?? 0))
    .slice(0, 3)

  if (related.length === 0) return null

  const heading = sector
    ? lang === 'es'
      ? `Sigue leyendo · más en ${sector.name}`
      : `Keep reading · more in ${sector.nameEN}`
    : lang === 'es'
      ? 'Sigue leyendo'
      : 'Keep reading'

  return (
    <section className="py-7" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div
        className="flex items-center gap-3 mb-3 font-mono uppercase"
        style={{ fontSize: 12, letterSpacing: '0.2em', color: 'var(--color-text-muted)', fontWeight: 600 }}
      >
        <span>{heading}</span>
        <span aria-hidden="true" className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
        {sector && (
          <EntityIdentityChip
            type="sector"
            id={sector.id}
            name={lang === 'es' ? sector.name : sector.nameEN}
            size="sm"
          />
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-3 list-none p-0 m-0">
        {related.map((c) => {
          const meta = dispositionFor(c.legal_status)
          return (
            <li
              key={c.id}
              className="p-3"
              style={{
                border: '1px solid var(--color-border)',
                boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
                borderLeft: `3px solid ${meta.ring ? 'var(--color-accent)' : meta.fill}`,
              }}
            >
              <EntityIdentityChip
                type="case"
                id={c.slug}
                name={lang === 'es' && c.name_es ? c.name_es : c.name_en}
                size="sm"
              />
              <p
                className="mt-1.5 font-mono tabular-nums"
                style={{ fontSize: 13, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}
              >
                {c.contract_year_start ?? '—'}
                {' · '}
                {c.amount_mxn_low ? formatCompactMXN(c.amount_mxn_low) : '—'}
              </p>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-center">
        <Link
          to="/cases"
          className="font-mono uppercase hover:opacity-70 transition-opacity"
          style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--color-text-primary)', fontWeight: 600, textDecoration: 'none' }}
        >
          {lang === 'es'
            ? `Ver los ${allCases?.length ?? 43} expedientes →`
            : `See all ${allCases?.length ?? 43} case files →`}
        </Link>
      </p>
      {(allCases ?? []).filter((c) => c.legal_status === 'convicted').length === 1 && (
        <p
          className="mt-4 text-center"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'normal',
            fontSize: 13.5,
            color: 'var(--color-text-muted)',
          }}
        >
          {lang === 'es'
            ? `Una condena en ${allCases!.length} casos. El registro es el argumento.`
            : `One conviction in ${allCases!.length} cases. The record is the argument.`}
        </p>
      )}
    </section>
  )
}
