import { TableExportButton } from '@/components/TableExportButton'
import { MesetaRug } from '@/components/aria/MesetaRug'
import { bucketCounts } from '@/components/aria/disposition'
import { formatNumber } from '@/lib/utils'

/**
 * § EL REGISTRO header — the section's computed lede, the DISPOSICIÓN strip
 * (honest triage tally from t1_status_counts — NOT t1_reviewed_count, which
 * counts 299/299; audit F2), LA MESETA rug, the per-tier invariant line, and
 * the key line (legend, 0px from the marks it explains).
 * Thesis (graft from «El Despacho»): la máquina propone, el analista dispone.
 */

const OCHRE = '#a06820'

interface QueueRegisterHeaderProps {
  isEs: boolean
  totalLeads: number
  tierFilter: number | null
  novelOnly: boolean
  t1StatusCounts: Record<string, number> | null | undefined
  runDateline: string | null
  ipsValues: number[]
  novelLeadsT2: number | null
  tier1Count: number
  tier4Count: number
  onGoT2Disc: () => void
  onFilterNeedsReview: () => void
  exportData: Record<string, unknown>[]
}

export function QueueRegisterHeader({
  isEs,
  totalLeads,
  tierFilter,
  novelOnly,
  t1StatusCounts,
  runDateline,
  ipsValues,
  novelLeadsT2,
  tier1Count,
  tier4Count,
  onGoT2Disc,
  onFilterNeedsReview,
  exportData,
}: QueueRegisterHeaderProps) {
  const buckets = bucketCounts(t1StatusCounts)
  const openWork = buckets.por_revisar + buckets.pendiente
  const stripTotal = buckets.confirmada + openWork + buckets.descartada + buckets.pipeline
  const showStrip = (tierFilter === 1 || tierFilter == null) && stripTotal > 0

  const dateline = runDateline ? String(runDateline).slice(0, 10) : null

  const segs = [
    { n: buckets.confirmada, color: 'color-mix(in srgb, var(--color-risk-critical) 55%, transparent)', label: isEs ? 'confirmadas' : 'confirmed' },
    { n: openWork, color: OCHRE, label: isEs ? 'por revisar' : 'to review' },
    { n: buckets.descartada, color: 'var(--color-text-muted)', label: isEs ? 'descartadas' : 'dismissed' },
    { n: buckets.pipeline, color: 'var(--color-border)', label: 'pipeline' },
  ].filter((s) => s.n > 0)

  return (
    <div className="mb-3 pb-2 border-b border-border space-y-2">
      {/* Lede line: kicker + thesis + count + export */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] font-mono uppercase tracking-[0.15em] text-text-muted font-bold">
          {isEs ? '§ EL REGISTRO · ORDEN: IPS — INDICADOR DE PRIORIDAD' : '§ THE REGISTER · ORDER: IPS — PRIORITY INDICATOR'}
        </span>
        <span
          className="hidden md:inline text-[13px] text-text-muted"
          style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal' }}
        >
          {isEs ? 'la máquina propone, el analista dispone' : 'the machine proposes, the analyst disposes'}
        </span>
        <span className="ml-auto text-[13px] text-text-muted font-mono tabular-nums">
          {totalLeads > 0 ? `${formatNumber(totalLeads)} ${isEs ? 'proveedores' : 'vendors'}` : ''}
        </span>
        <TableExportButton
          data={exportData}
          filename="aria-queue"
          showXlsx={true}
          disabled={exportData.length === 0}
        />
        <span className="text-[13px] font-mono text-text-muted -ml-1">
          {isEs ? '· esta página' : '· this page'}
        </span>
      </div>

      {/* DISPOSICIÓN strip — honest T1 triage tally (audit F2 fix) */}
      {showStrip && (
        <div>
          <div
            className="flex h-2 rounded-sm overflow-hidden border border-border/60"
            role="img"
            aria-label={
              isEs
                ? `Disposición del Nivel 1: ${buckets.confirmada} confirmadas, ${openWork} por revisar, ${buckets.descartada} descartadas, ${buckets.pipeline} revisadas por pipeline`
                : `Tier 1 disposition: ${buckets.confirmada} confirmed, ${openWork} to review, ${buckets.descartada} dismissed, ${buckets.pipeline} pipeline-reviewed`
            }
          >
            {segs.map((s) => (
              <span
                key={s.label}
                style={{ width: `${(s.n / stripTotal) * 100}%`, background: s.color }}
                title={`${s.label} · ${s.n}`}
              />
            ))}
          </div>
          <p className="mt-1 text-[13px] font-mono text-text-muted flex items-center gap-1.5 flex-wrap">
            <span className="uppercase tracking-[0.12em] font-bold">{isEs ? 'DISPOSICIÓN T1' : 'T1 DISPOSITION'}</span>
            <span>
              {buckets.confirmada} {isEs ? 'confirmadas' : 'confirmed'} · {openWork}{' '}
              {isEs ? 'por revisar' : 'to review'} · {buckets.descartada} {isEs ? 'descartadas' : 'dismissed'}
              {buckets.pipeline > 0 ? ` · ${buckets.pipeline} pipeline` : ''}
            </span>
            {dateline && (
              <span className="text-text-muted/70">
                — {isEs ? 'al corte de la corrida' : 'as of run'} {dateline}
              </span>
            )}
            {openWork > 0 && tierFilter === 1 && (
              <button
                onClick={onFilterNeedsReview}
                className="font-bold uppercase tracking-[0.1em] transition-colors hover:opacity-80"
                style={{ color: OCHRE }}
              >
                {isEs ? `▸ ver por revisar (${openWork})` : `▸ view to-review (${openWork})`}
              </button>
            )}
          </p>
        </div>
      )}

      {/* Variant line + rug */}
      <div className="flex items-center gap-3 flex-wrap">
        {tierFilter === 1 && (
          <p className="text-[13px] text-text-secondary leading-snug min-w-0">
            {isEs ? (
              <>
                Las {formatNumber(tier1Count)} del Nivel 1 están ancladas a casos documentados — los
                descubrimientos del modelo viven en el{' '}
                <button onClick={onGoT2Disc} className="underline decoration-dotted underline-offset-2 hover:text-text-primary transition-colors">
                  Nivel 2{novelLeadsT2 != null ? ` (${formatNumber(novelLeadsT2)})` : ''}
                </button>
                .
              </>
            ) : (
              <>
                All {formatNumber(tier1Count)} Tier-1 vendors are anchored to documented cases — the
                model's own discoveries live in{' '}
                <button onClick={onGoT2Disc} className="underline decoration-dotted underline-offset-2 hover:text-text-primary transition-colors">
                  Tier 2{novelLeadsT2 != null ? ` (${formatNumber(novelLeadsT2)})` : ''}
                </button>
                .
              </>
            )}
          </p>
        )}
        {tierFilter === 2 && novelLeadsT2 != null && (
          <p className="text-[13px] text-text-secondary leading-snug">
            {novelOnly
              ? isEs
                ? `${formatNumber(novelLeadsT2)} descubrimientos del modelo — sin caso documentado · en calibración`
                : `${formatNumber(novelLeadsT2)} model discoveries — no documented case · in calibration`
              : isEs
                ? `Nivel 2: ${formatNumber(novelLeadsT2)} descubrimientos del modelo · el resto anclados en GT`
                : `Tier 2: ${formatNumber(novelLeadsT2)} model discoveries · the rest GT-anchored`}
          </p>
        )}
        {tierFilter === 4 && (
          <p
            className="text-[12px] text-text-secondary leading-snug"
            style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal' }}
          >
            {isEs
              ? `El fondo del embudo: ${formatNumber(tier4Count)} proveedores bajo el umbral de triaje — aparecen por transparencia del método.`
              : `The bottom of the funnel: ${formatNumber(tier4Count)} vendors below the triage threshold — shown for methodological transparency.`}
          </p>
        )}
        <div className="ml-auto">
          <MesetaRug values={ipsValues} isEs={isEs} />
        </div>
      </div>

      {/* Key line — the legend, 0px from the marks it explains */}
      <p className="text-[8.5px] font-mono text-text-muted tracking-[0.04em] leading-relaxed">
        {isEs
          ? 'CLAVES — Nº rango · GT/DISC procedencia · ·IPS milésimas · componente dominante · E efos sat definitivo · S sancionado sfp · W prensa centinela · LLM/PLT/STB memo (IA / plantilla / esbozo) · disposición = color del riel'
          : 'KEY — Nº rank · GT/DISC provenance · ·IPS mills · dominant component · E sat efos definitive · S sfp sanctioned · W centinela press · LLM/PLT/STB memo (AI / template / stub) · disposition = rail color'}
      </p>
    </div>
  )
}
