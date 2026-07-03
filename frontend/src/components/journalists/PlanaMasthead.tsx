// ---------------------------------------------------------------------------
// PlanaMasthead — the front-page nameplate block.
//
// Eyebrow (folio frame) + edition line (with the live pulse + RUBLI mark) +
// nameplate (public name UNCHANGED — "Sala de Redacción / The Newsroom") +
// a computed thesis line + the Scotch rule (thick-over-thin, the newspaper
// signature). The thesis is the house inversion, computed from the status
// counts: at this data cut, none of the investigations has reached prosecution.
// ---------------------------------------------------------------------------

interface Counts {
  total: number
  procesado: number
  auditado: number
  reporteado: number
  soloDatos: number
}

export function PlanaMasthead({ lang, counts }: { lang: 'en' | 'es'; counts: Counts }) {
  const isEs = lang === 'es'
  const { total, procesado, auditado } = counts

  // Thesis — two branches. Today procesado === 0 (top rung of the ladder empty).
  const thesisLead =
    procesado === 0
      ? isEs
        ? `${total} investigaciones sobre el dinero federal — `
        : `${total} investigations into federal money — `
      : isEs
        ? `${total} investigaciones — `
        : `${total} investigations — `
  const thesisAccent =
    procesado === 0
      ? isEs
        ? '«ninguna ha llegado a proceso»'
        : '«none has reached prosecution»'
      : isEs
        ? `«${procesado} en proceso»`
        : `«${procesado} prosecuted»`
  const thesisTail =
    procesado === 0
      ? '.'
      : isEs
        ? `, ${auditado} bajo auditoría.`
        : `, ${auditado} under audit.`

  return (
    <header className="pt-12 sm:pt-16">
      {/* Eyebrow — the folio frame */}
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
        <span className="font-bold" style={{ color: 'var(--color-accent)' }}>
          {isEs ? 'LA PRIMERA PLANA' : 'THE FRONT PAGE'}
        </span>
        <span className="mx-1.5 opacity-50" aria-hidden="true">·</span>
        <span>COMPRANET 2002–2025</span>
        <span className="mx-1.5 opacity-50 hidden sm:inline" aria-hidden="true">·</span>
        <span className="hidden sm:inline tabular-nums">v0.8.5</span>
      </div>

      {/* Edition line — pulse + RUBLI at left, standing-edition dateline at right */}
      <div className="flex items-center justify-between gap-3 mb-3 text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-critical animate-pulse" aria-hidden="true" />
          <span className="font-bold tracking-[0.2em] text-text-secondary">RUBLI</span>
        </span>
        <span className="tabular-nums text-right">
          <span className="hidden sm:inline">{isEs ? 'EDICIÓN PERMANENTE · ' : 'STANDING EDITION · '}</span>
          {isEs ? 'CORTE DE DATOS 28·09·2025' : 'DATA CUT 2025·09·28'}
        </span>
      </div>

      {/* Nameplate — public name unchanged */}
      <h1
        className="text-text-primary"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(30px, 4.5vw, 48px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        {isEs ? 'Sala de Redacción' : 'The Newsroom'}
      </h1>

      {/* Thesis — the house inversion, one ochre normal-weight fragment */}
      <p
        className="mt-4 text-text-secondary"
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 'clamp(17px, 1.5vw, 20px)',
          lineHeight: 1.5,
          maxWidth: '68ch',
        }}
      >
        {thesisLead}
        <span style={{ color: 'var(--color-accent)', fontStyle: 'normal' }}>{thesisAccent}</span>
        {thesisTail}
      </p>

      {/* Scotch rule — thick over thin */}
      <div className="mt-6" aria-hidden="true">
        <div className="h-[2px] bg-text-primary/85" />
        <div className="h-px bg-border mt-[3px]" />
      </div>
    </header>
  )
}
