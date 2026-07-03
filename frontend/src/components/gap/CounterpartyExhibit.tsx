/**
 * CounterpartyExhibit — «La Contraparte Ausente» (gap redesign, 2026-07-03).
 *
 * The vendor blind spot as a designed document exhibit (ICIJ/FOIA redaction
 * mechanic), not an apology box: the file names the buyer/sector/rule/scale, but
 * NOT the seller — the OCR PDFs don't cleanly separate vendor names. The document
 * shows its own gap. `efos_count` (0 here — the names are too garbled to cross-check
 * against SAT EFOS, which is itself the point) and `young_vendor_count` are the two
 * vendor-side signals that survive.
 */
import { RISK_COLORS } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'

function CheckLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5 border-b border-border/60">
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted w-24 shrink-0">{label}</span>
      <span className="text-accent-data" aria-hidden="true">✓</span>
      <span className="text-[13px] text-text-secondary">{value}</span>
    </div>
  )
}

export function CounterpartyExhibit({ youngCount, efosCount, lang }: {
  youngCount: number; efosCount: number; lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  return (
    <div>
      <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-text-muted font-mono mb-4">
        {es ? 'LO QUE EL EXPEDIENTE PUEDE NOMBRAR — Y LO QUE NO' : 'WHAT THE FILE CAN NAME — AND WHAT IT CAN’T'}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* left — on the record */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary mb-2">
            {es ? 'Consta en el expediente' : 'On the record'}
          </div>
          <CheckLine label={es ? 'Comprador' : 'Buyer'} value={es ? 'institución y siglas' : 'institution and initials'} />
          <CheckLine label="Sector" value={es ? 'clasificación de ramo' : 'ministry classification'} />
          <CheckLine label={es ? 'Regla' : 'Rule'} value={es ? 'artículo de excepción invocado' : 'exception article invoked'} />
          <CheckLine label={es ? 'Escala' : 'Scale'} value={es ? 'monto (OCR del PDF de fallo)' : 'amount (OCR of award PDF)'} />
        </div>
        {/* right — not reliably on the record */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary mb-2">
            {es ? 'No consta con fiabilidad' : 'Not reliably on the record'}
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted mb-2">{es ? 'Vendedor' : 'Seller'}</div>
          {/* redaction bars — rectangles by design (not DotBar) */}
          <div className="space-y-1.5" aria-hidden="true">
            {[['82%', '58%'], ['66%', '40%', '20%'], ['74%']].map((row, r) => (
              <div key={r} className="flex gap-1.5">
                {row.map((w, i) => (
                  <span key={i} style={{ width: w, height: 11, background: 'var(--color-text-muted)', borderRadius: 1, opacity: 0.55 }} className="inline-block" />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 font-mono text-[11.5px] text-text-muted break-all">Companiadistribuidoraycconstructorahbasac</div>
          <div className="mt-1 text-[10px] text-text-muted leading-snug">
            {es
              ? 'texto real extraído por OCR de un PDF de fallo — los nombres de proveedor no se separan limpiamente'
              : 'real text extracted by OCR from an award PDF — vendor names don’t separate cleanly'}
          </div>
        </div>
      </div>

      {/* what still matches */}
      <div className="mt-5 pt-4 border-t border-border">
        <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary mb-2">{es ? 'Lo que aún cruza' : 'What still matches'}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg tabular-nums" style={{ color: RISK_COLORS.medium }}>{formatNumber(youngCount)}</span>
            <span className="text-[12px] text-text-secondary">{es ? 'adjudicaciones a empresas constituidas hace <3 años' : 'awards to companies formed <3 years ago'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg tabular-nums text-text-muted">{formatNumber(efosCount)}</span>
            <span className="text-[12px] text-text-secondary">
              {es
                ? 'cruces confirmados con la lista EFOS del SAT — los nombres OCR son demasiado parciales para cruzar con fiabilidad'
                : 'confirmed matches to SAT’s EFOS list — the OCR names are too partial to cross-check reliably'}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm text-text-secondary leading-relaxed">
        {es
          ? 'Lea esta página por el patrón institucional — quién compró, cómo y bajo qué regla — no como un padrón de proveedores.'
          : 'Read this page for the institutional pattern — who bought, how, and under what rule — not as a vendor ledger.'}
      </p>
    </div>
  )
}
