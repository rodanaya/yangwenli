import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { caseLibraryApi } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react'

const SEVERITY_COLORS: Record<number, string> = {
  1: 'bg-muted text-muted-foreground',
  2: 'bg-yellow-500/20 text-yellow-400',
  3: 'bg-orange-500/20 text-orange-400',
  4: 'bg-red-500/20 text-red-400',
}

const LEGAL_STATUS_COLORS: Record<string, string> = {
  impunity: 'border-red-500/50 text-red-400',
  investigation: 'border-yellow-500/50 text-yellow-400',
  prosecuted: 'border-orange-500/50 text-orange-400',
  convicted: 'border-green-500/50 text-green-400',
  acquitted: 'border-blue-500/50 text-blue-400',
  dismissed: 'border-muted text-muted-foreground',
  unresolved: 'border-muted text-muted-foreground',
}

function formatMXN(n?: number | null): string {
  if (!n) return '?'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B MXN`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M MXN`
  return `$${n.toLocaleString()} MXN`
}

export default function CaseDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation('cases')
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases', 'detail', slug],
    queryFn: () => caseLibraryApi.getBySlug(slug!),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('detail.backToLibrary')}
        </Button>
        <div className="flex items-center gap-2 text-sm text-destructive p-4 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>Case not found.</span>
        </div>
      </div>
    )
  }

  const name = i18n.language === 'es' ? data.name_es : data.name_en
  const summary = i18n.language === 'es' && data.summary_es ? data.summary_es : data.summary_en

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/cases')}
        className="text-xs text-text-muted hover:text-accent mb-5 flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {t('detail.backToLibrary')}
      </button>

      {/* Title */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded ${SEVERITY_COLORS[data.severity] ?? SEVERITY_COLORS[2]}`}>
            {t(`severity.${data.severity}`)}
          </span>
          <Badge variant="outline" className="text-xs">
            {t(`fraudTypes.${data.fraud_type}`)}
          </Badge>
          <Badge variant="outline" className={`text-xs ${LEGAL_STATUS_COLORS[data.legal_status] ?? ''}`}>
            {t(`legalStatuses.${data.legal_status}`)}
          </Badge>
          {data.ground_truth_case_id != null && (
            <Link to="/methodology" className="no-underline">
              <Badge variant="outline" className="text-xs border-accent/50 text-accent hover:bg-accent/10 transition-colors cursor-pointer">
                {t('card.mlLinked')} — View in Model Validation
              </Badge>
            </Link>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold font-mono text-text-primary">{name}</h1>
          <AddToDossierButton
            entityType="note"
            entityId={data.id}
            entityName={data.name_en}
            className="flex-shrink-0"
          />
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-muted">
          {(data.contract_year_start || data.contract_year_end) && (
            <span>
              {data.contract_year_start}
              {data.contract_year_end && data.contract_year_end !== data.contract_year_start
                ? `–${data.contract_year_end}`
                : ''}
            </span>
          )}
          {data.discovery_year && <span>{t('card.discovered', { year: data.discovery_year })}</span>}
          <span>{t(`administrations.${data.administration}`)}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border border-border/60 rounded-lg p-4 mb-5">
        <p className="text-sm text-text-secondary leading-relaxed">{summary}</p>
      </div>

      {/* Amount + COMPRANET + Legal — info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {(data.amount_mxn_low || data.amount_mxn_high || data.amount_note) && (
          <div className="bg-card border border-border/50 rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
              {t('detail.amountNote')}
            </div>
            {data.amount_mxn_low && (
              <div className="text-sm font-mono text-text-primary">
                {formatMXN(data.amount_mxn_low)}
                {data.amount_mxn_high ? ` – ${formatMXN(data.amount_mxn_high)}` : '+'}
              </div>
            )}
            {data.amount_note && (
              <p className="text-[11px] text-text-muted mt-1">{data.amount_note}</p>
            )}
          </div>
        )}
        {data.compranet_note && (
          <div className="bg-card border border-border/50 rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
              {t('detail.compranetNote')}
            </div>
            <div className="text-[11px] text-text-secondary">{data.compranet_note}</div>
          </div>
        )}
        {data.legal_status_note && (
          <div className="bg-card border border-border/50 rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
              {t('detail.legalNote')}
            </div>
            <div className="text-[11px] text-text-secondary">{data.legal_status_note}</div>
          </div>
        )}
      </div>

      {/* Key Actors */}
      <section className="mb-6">
        <h2 className="text-sm font-bold font-mono text-text-primary mb-3">{t('detail.keyActors')}</h2>
        {data.key_actors.length === 0 ? (
          <p className="text-xs text-text-muted">{t('detail.noKeyActors')}</p>
        ) : (
          <div className="space-y-2">
            {data.key_actors.map((actor, i) => (
              <div key={i} className="flex gap-3 bg-card border border-border/40 rounded-lg p-3">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {t(`detail.roles.${actor.role}`)}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">{actor.name}</div>
                  {actor.title && <div className="text-[11px] text-text-muted">{actor.title}</div>}
                  {actor.note && <div className="text-[11px] text-text-secondary mt-0.5">{actor.note}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sources */}
      <section>
        <h2 className="text-sm font-bold font-mono text-text-primary mb-3">{t('detail.sources')}</h2>
        {data.sources.length === 0 ? (
          <p className="text-xs text-text-muted">{t('detail.noSources')}</p>
        ) : (
          <div className="space-y-2">
            {data.sources.map((src, i) => (
              <div key={i} className="flex gap-3 bg-card border border-border/40 rounded-lg p-3">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0 h-fit">
                  {t(`detail.sourceTypes.${src.type}`)}
                </Badge>
                <div>
                  <div className="text-xs font-medium text-text-primary">
                    {src.url ? (
                      <a href={src.url} target="_blank" rel="noopener noreferrer"
                        className="hover:text-accent flex items-center gap-1">
                        {src.title} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : src.title}
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {src.outlet}{src.date ? ` · ${src.date.slice(0, 7)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
