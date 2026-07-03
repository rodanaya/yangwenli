/**
 * Press / Prensa — the public press kit for journalists (launch, 2026-07-03).
 *
 * Rewritten from docs/press/* which were stale (model v6.5, Jun 11) and carried the
 * author's real GitHub URL. This page uses CURRENT v0.8.5 figures and is fully
 * pseudonymous — no author name, no rodanaya link (anonymous launch). Bilingual via
 * lang conditionals (no new i18n keys); folio aesthetic, no green for low risk.
 */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Newspaper, Quote, Search, FlaskConical, AlertTriangle, Mail } from 'lucide-react'
import { PageFooter } from '@/components/layout/PageFooter'
import { RISK_COLORS } from '@/lib/constants'

function Section({ id, icon: Icon, kicker, title, children }: {
  id: string; icon: React.ComponentType<{ className?: string }>; kicker: string; title: string; children: React.ReactNode
}) {
  return (
    <section id={id} className="space-y-3">
      <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.22em] uppercase text-text-muted font-mono">
        <Icon className="w-3 h-3" /> {kicker}
      </div>
      <h2 className="font-serif text-2xl text-text-primary">{title}</h2>
      <div className="space-y-3 text-sm text-text-secondary leading-relaxed max-w-[68ch]">{children}</div>
    </section>
  )
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-border rounded-sm p-4 bg-surface">
      <div className="font-serif text-2xl text-text-primary tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.12em] text-text-muted leading-snug">{label}</div>
    </div>
  )
}

export default function Press() {
  const { i18n } = useTranslation()
  const es = i18n.language === 'es'

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-12">
      {/* masthead */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.22em] uppercase text-text-muted font-mono">
          <Newspaper className="w-3 h-3" /> {es ? 'RUBLI · KIT DE PRENSA' : 'RUBLI · PRESS KIT'}
        </div>
        <h1 className="font-serif text-4xl text-text-primary">{es ? 'Prensa' : 'Press'}</h1>
        <p className="text-text-secondary leading-relaxed max-w-[68ch]">
          {es
            ? 'RUBLI es una plataforma independiente de código abierto que analiza el gasto en contratación pública federal de México. Esta página reúne lo esencial para periodistas: cifras verificables, cómo citar correctamente los indicadores, y las limitaciones que deben acompañar cualquier nota.'
            : 'RUBLI is an independent, open-source platform that analyzes Mexican federal procurement spending. This page gathers what journalists need: verifiable figures, how to cite the indicators correctly, and the limitations that must accompany any story.'}
        </p>
        <p className="text-xs text-text-muted font-mono">
          {es ? 'Plataforma:' : 'Platform:'} <a href="https://rubli.xyz" className="text-accent hover:underline">rubli.xyz</a>
          <span className="opacity-40"> · </span>{es ? 'Licencia' : 'License'} Apache 2.0
          <span className="opacity-40"> · </span>{es ? 'Modelo v0.8.5' : 'Model v0.8.5'}
        </p>
      </header>

      {/* the figures */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Figure value="3,058,286" label={es ? 'contratos federales · 2002–2025' : 'federal contracts · 2002–2025'} />
        <Figure value="~9.9T MXN" label={es ? 'valor agregado validado' : 'validated aggregate value'} />
        <Figure value="11%" label={es ? 'tasa de alto riesgo (rango OCDE 2–15%)' : 'high-risk rate (OECD range 2–15%)'} />
        <Figure value="0.785" label={es ? 'AUC-ROC en prueba (v0.8.5)' : 'test AUC-ROC (v0.8.5)'} />
      </div>

      <Section id="what" icon={Newspaper} kicker={es ? 'EN RESUMEN' : 'IN BRIEF'} title={es ? 'Qué es RUBLI' : 'What RUBLI is'}>
        <p>
          {es
            ? 'RUBLI aplica un modelo estadístico a los datos públicos de contratación (CompraNet) para ordenar por riesgo más de tres millones de contratos federales celebrados entre 2002 y 2025. Cada contrato y proveedor recibe un indicador de riesgo entre 0 y 1 que refleja su similitud con patrones de irregularidades ya documentadas: empresas fantasma, monopolización de proveedores, intermediarios, sobreprecio, captura institucional y abuso de la adjudicación directa.'
            : 'RUBLI applies a statistical model to public procurement data (CompraNet) to rank more than three million federal contracts awarded between 2002 and 2025 by risk. Each contract and vendor gets a risk indicator between 0 and 1 reflecting its resemblance to already-documented irregularity patterns: ghost vendors, vendor monopolization, intermediaries, overpricing, institutional capture, and abuse of direct award.'}
        </p>
        <p className="text-text-primary">
          {es
            ? 'No reemplaza la investigación periodística: indica dónde mirar. Un indicador alto significa que un contrato comparte características estadísticas con casos conocidos de irregularidades. No es prueba de nada.'
            : 'It does not replace reporting — it indicates where to look. A high indicator means a contract shares statistical characteristics with known irregularity cases. It is not proof of anything.'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <Figure value="5.2%" label={es ? 'riesgo crítico (≥0.60)' : 'critical risk (≥0.60)'} />
          <Figure value="5.9%" label={es ? 'riesgo alto (≥0.40)' : 'high risk (≥0.40)'} />
          <Figure value="299" label={es ? 'proveedores T1 (máxima prioridad)' : 'T1 vendors (top priority)'} />
          <Figure value="1,488" label={es ? 'proveedores T2' : 'T2 vendors'} />
        </div>
      </Section>

      <Section id="cite" icon={Quote} kicker={es ? 'PARA CITAR' : 'HOW TO CITE'} title={es ? 'Cómo citar los indicadores' : 'How to cite the indicators'}>
        <p>{es ? 'Fórmula recomendada, con la aclaración correspondiente:' : 'Recommended formula, with the appropriate caveat:'}</p>
        <blockquote className="border-l-2 pl-4 italic text-text-primary" style={{ borderColor: RISK_COLORS.critical }}>
          {es
            ? '«Según el sistema de detección de patrones RUBLI, que analiza datos públicos de CompraNet, este proveedor presenta un indicador de riesgo de [X] — es decir, sus contratos comparten características estadísticas con casos documentados de irregularidades. Esto no constituye prueba de conducta ilícita.»'
            : '"According to the RUBLI pattern-detection system, which analyzes public CompraNet data, this vendor shows a risk indicator of [X] — meaning its contracts share statistical characteristics with documented irregularity cases. This does not constitute proof of wrongdoing."'}
        </blockquote>
        <p>
          {es
            ? 'Use «indicador de riesgo», nunca «probabilidad de corrupción». Los puntajes son indicadores estadísticos, no determinaciones de responsabilidad.'
            : 'Use "risk indicator," never "probability of corruption." The scores are statistical indicators, not determinations of liability.'}
        </p>
      </Section>

      <Section id="use" icon={Search} kicker={es ? 'FLUJO DE TRABAJO' : 'WORKFLOW'} title={es ? 'Cómo usarlo en una investigación' : 'How to use it in an investigation'}>
        <ol className="list-decimal pl-5 space-y-2">
          <li>{es ? <>Busca un proveedor o institución en la barra principal → su <strong className="text-text-primary">expediente</strong> muestra volumen, dependencias, distribución de riesgo y posición en la cola ARIA.</> : <>Search a vendor or institution in the main bar → its <strong className="text-text-primary">dossier</strong> shows volume, buyers, risk distribution, and ARIA-queue position.</>}</li>
          <li>{es ? <>Abre <Link to="/aria" className="text-accent hover:underline">La Cola (ARIA)</Link> → los proveedores de máxima prioridad, filtrables por patrón (fantasma, monopolio, intermediario, captura).</> : <>Open <Link to="/aria" className="text-accent hover:underline">the ARIA queue</Link> → the highest-priority vendors, filterable by pattern (ghost, monopoly, intermediary, capture).</>}</li>
          <li>{es ? <>Explora <Link to="/sectors" className="text-accent hover:underline">Sectores</Link> e <Link to="/institutions" className="text-accent hover:underline">Instituciones</Link> para hallar la mayor concentración de gasto señalado.</> : <>Explore <Link to="/sectors" className="text-accent hover:underline">Sectors</Link> and <Link to="/institutions" className="text-accent hover:underline">Institutions</Link> to find the heaviest concentration of flagged spending.</>}</li>
          <li>{es ? <>Verifica cada hallazgo contra la fuente: descarga el expediente en datos.gob.mx y solicita documentos vía transparencia (SIPOT).</> : <>Verify every finding against the source: download the record on datos.gob.mx and request documents via freedom-of-information (SIPOT).</>}</li>
        </ol>
      </Section>

      <Section id="method" icon={FlaskConical} kicker={es ? 'EL MÉTODO' : 'THE METHOD'} title={es ? 'Cómo funciona el modelo' : 'How the model works'}>
        <p>
          {es
            ? 'RUBLI usa regresión logística ElasticNet con corrección PU-learning (Elkan & Noto 2008) sobre 18 señales estandarizadas (puntuaciones Z) por sector y año — de modo que una adjudicación directa en Defensa, donde es la norma, no se penaliza igual que una en Educación, donde es la excepción. Entrenado con 1,427 casos documentados y una separación estricta por proveedor (ningún proveedor aparece a la vez en entrenamiento y prueba).'
            : 'RUBLI uses ElasticNet logistic regression with PU-learning correction (Elkan & Noto 2008) over 18 standardized (z-score) signals by sector and year — so a direct award in Defense, where it is the norm, is not penalized like one in Education, where it is the exception. Trained on 1,427 documented cases with a strict per-vendor split (no vendor appears in both training and test).'}
        </p>
        <p className="text-xs text-text-muted font-mono">
          {es ? 'Metodología completa, coeficientes y limitaciones:' : 'Full methodology, coefficients, and limitations:'}{' '}
          <Link to="/methodology" className="text-accent hover:underline">rubli.xyz/methodology</Link>
        </p>
      </Section>

      <Section id="limits" icon={AlertTriangle} kicker={es ? 'IMPORTANTE' : 'IMPORTANT'} title={es ? 'Limitaciones que deben citarse' : 'Limitations that must be cited'}>
        <ul className="space-y-2">
          <li>{es ? <><strong className="text-text-primary">El fraude en ejecución es invisible.</strong> RUBLI ve la adjudicación, no la obra. Infraestructura y construcción están subestimados.</> : <><strong className="text-text-primary">Fraud during execution is invisible.</strong> RUBLI sees the award, not the work. Infrastructure and construction are underestimated.</>}</li>
          <li>{es ? <><strong className="text-text-primary">Correlación no es causalidad.</strong> Un indicador alto no es determinación de responsabilidad ni prueba de conducta ilícita.</> : <><strong className="text-text-primary">Correlation is not causation.</strong> A high indicator is not a determination of liability or proof of wrongdoing.</>}</li>
          <li>{es ? <><strong className="text-text-primary">Las etiquetas vienen de escándalos de alto perfil.</strong> El modelo detecta bien patrones similares a casos públicos; puede pasar por alto corrupción de pequeña escala.</> : <><strong className="text-text-primary">Training labels come from high-profile scandals.</strong> The model detects patterns similar to public cases well; it can miss small-scale corruption.</>}</li>
          <li>{es ? <><strong className="text-text-primary">La calidad de datos varía por periodo.</strong> Los registros 2002–2010 tienen cobertura de RFC de 0.1%; sus puntajes son menos confiables.</> : <><strong className="text-text-primary">Data quality varies by period.</strong> 2002–2010 records have 0.1% RFC coverage; their scores are less reliable.</>}</li>
          <li>{es ? <><strong className="text-text-primary">No hay identificación definitiva de proveedores.</strong> El mismo proveedor puede aparecer bajo distintas grafías entre años.</> : <><strong className="text-text-primary">No definitive vendor identity.</strong> The same vendor can appear under different spellings across years.</>}</li>
        </ul>
      </Section>

      <Section id="contact" icon={Mail} kicker={es ? 'CONTACTO' : 'CONTACT'} title={es ? 'Acceso y contacto' : 'Access and contact'}>
        <p>
          {es
            ? 'RUBLI es de uso gratuito, sin registro, en rubli.xyz. Es un proyecto independiente de código abierto (Apache 2.0); no recibe financiamiento de partidos ni de dependencias gubernamentales. El equipo publica de forma seudónima para proteger la independencia del trabajo.'
            : 'RUBLI is free to use, no sign-up, at rubli.xyz. It is an independent open-source project (Apache 2.0); it receives no funding from political parties or government agencies. The team publishes pseudonymously to protect the independence of the work.'}
        </p>
        <p className="text-xs text-text-muted font-mono">
          {es ? 'Consultas de prensa:' : 'Press inquiries:'} <span className="text-text-secondary">prensa@rubli.xyz</span>
          <span className="opacity-40"> · </span>{es ? 'Repositorio de código: enlazado en el sitio' : 'Code repository: linked on the site'}
        </p>
      </Section>

      <PageFooter />
    </div>
  )
}
