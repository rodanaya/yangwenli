import { useState } from 'react'
import { Scale, AlertTriangle, Github, BookOpen } from 'lucide-react'

// ============================================================================
// Terms of Use — RUBLI Mexican Procurement Analysis Platform
// Bilingual ES/EN (default ES — Mexican platform).
// ============================================================================

interface SectionProps {
  id: string
  title: string
  children: React.ReactNode
}

function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="font-editorial text-lg font-semibold text-text-primary mb-3 pb-2 border-b border-border">
        <a href={`#${id}`} className="hover:text-accent transition-colors no-underline">{title}</a>
      </h2>
      <div className="space-y-3 text-[15px] text-text-primary leading-relaxed">{children}</div>
    </section>
  )
}

export default function Terms() {
  const [lang, setLang] = useState<'en' | 'es'>('es')
  const isEs = lang === 'es'

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Scale className="h-5 w-5 text-accent" aria-hidden="true" />
              <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-primary">
                {isEs ? 'Términos de Uso' : 'Terms of Use'}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded border border-border bg-background-elevated p-0.5">
              <button
                onClick={() => setLang('es')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-sm transition-colors ${lang === 'es' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'}`}
              >
                ES
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-sm transition-colors ${lang === 'en' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'}`}
              >
                EN
              </button>
            </div>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-text-primary mb-2">
            {isEs ? 'Términos de Uso' : 'Terms of Use'}
          </h1>
          <p className="text-sm text-text-muted">
            {isEs ? 'Última actualización: Abril 2026 — Versión 1.0' : 'Last updated: April 2026 — Version 1.0'}
          </p>
        </div>

        {/* Risk-score disclaimer — promoted to editorial hero per Batch E critique */}
        <aside
          className="mb-12 border-l-4 pl-5 py-3"
          style={{ borderColor: 'var(--color-risk-high)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--color-risk-high)' }} aria-hidden="true" />
            <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-risk-high)' }}>
              {isEs ? 'Lo más importante' : 'Most important'}
            </p>
          </div>
          <p className="font-editorial text-xl sm:text-2xl font-semibold text-text-primary leading-tight mb-2">
            {isEs
              ? 'Las puntuaciones de riesgo no son prueba de irregularidades.'
              : 'Risk scores are not proof of wrongdoing.'}
          </p>
          <p className="text-[15px] text-text-secondary leading-relaxed">
            {isEs
              ? 'Los indicadores estadísticos de RUBLI miden la similitud con irregularidades documentadas. Una puntuación alta significa que las características del contrato se parecen a patrones problemáticos conocidos — no significa que el contrato, proveedor o institución sea corrupto. Las puntuaciones son herramientas para priorizar investigaciones, no veredictos.'
              : 'RUBLI\'s statistical risk indicators measure similarity to documented procurement irregularities. A high risk score means a contract\'s characteristics resemble known problematic patterns — it does not mean the contract, vendor, or institution is corrupt. Risk scores are tools for investigation triage, not verdicts.'}
          </p>
        </aside>

        <Section id="purpose" title={isEs ? '1. Propósito y alcance' : '1. Purpose and Scope'}>
          <p>
            {isEs
              ? <>RUBLI (<em>Red de Utilidad para la Búsqueda de Licitaciones Irregulares</em>) es una plataforma de investigación de código abierto y sin fines comerciales que analiza datos de contrataciones del gobierno federal mexicano para apoyar la transparencia, el periodismo de rendición de cuentas y la investigación académica.</>
              : <>RUBLI (<em>Red de Utilidad para la Búsqueda de Licitaciones Irregulares</em>) is a non-commercial, open-source research platform that analyses Mexican federal government procurement data to support transparency, accountability journalism, and academic research.</>}
          </p>
          <p>
            {isEs
              ? 'Estos términos rigen su uso de la plataforma web RUBLI y cualquier dato o resultado derivado de ella. Al acceder a RUBLI, usted acepta estos términos.'
              : 'These terms govern your use of the RUBLI web platform and any data or outputs derived from it. By accessing RUBLI, you agree to these terms.'}
          </p>
        </Section>

        <Section id="permitted" title={isEs ? '2. Usos permitidos' : '2. Permitted Uses'}>
          <p>{isEs ? 'Puede usar RUBLI y sus resultados para:' : 'You may use RUBLI and its outputs for:'}</p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            {isEs ? (
              <>
                <li>Investigación periodística y reportajes sobre contrataciones gubernamentales</li>
                <li>Investigación académica y no comercial</li>
                <li>Monitoreo del gasto público desde la sociedad civil</li>
                <li>Trabajo personal, educativo o sin fines de lucro relacionado con transparencia</li>
                <li>Desarrollo de herramientas de código abierto basadas en las mismas fuentes públicas</li>
              </>
            ) : (
              <>
                <li>Journalistic investigation and reporting on government procurement</li>
                <li>Academic and non-commercial research</li>
                <li>Civil society monitoring of public spending</li>
                <li>Personal, educational, or non-profit transparency work</li>
                <li>Developing open-source tools that build on the same public data sources</li>
              </>
            )}
          </ul>
        </Section>

        <Section id="prohibited" title={isEs ? '3. Usos prohibidos' : '3. Prohibited Uses'}>
          <p>{isEs ? <>Usted <strong className="text-text-primary">no puede</strong>:</> : <>You may <strong className="text-text-primary">not</strong>:</>}</p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            {isEs ? (
              <>
                <li>Redistribuir o revender datos o resultados de RUBLI con fines comerciales sin obtener una licencia separada</li>
                <li>Usar puntuaciones de riesgo o hallazgos para hacer acusaciones legales contra individuos o entidades sin corroboración independiente</li>
                <li>Presentar las puntuaciones de RUBLI como determinaciones oficiales del gobierno o como prueba de corrupción, fraude u otra actividad ilegal</li>
                <li>Hacer scraping de la plataforma de manera que degrade el servicio para otros usuarios</li>
                <li>Intentar reidentificar o desanonimizar cualquier dato personal enmascarado</li>
              </>
            ) : (
              <>
                <li>Redistribute or resell RUBLI data or outputs for commercial gain without obtaining a separate licence</li>
                <li>Use risk scores or findings to make legal accusations against individuals or entities without independent corroboration</li>
                <li>Present RUBLI risk scores as official government determinations or as proof of corruption, fraud, or any other illegal activity</li>
                <li>Scrape the platform in a manner that degrades service for other users</li>
                <li>Attempt to re-identify or deanonymise any masked personal data</li>
              </>
            )}
          </ul>
        </Section>

        <Section id="risk-scores" title={isEs ? '4. Naturaleza de las puntuaciones e indicadores' : '4. Nature of Risk Scores and Statistical Indicators'}>
          <p>
            {isEs
              ? 'Todas las puntuaciones de riesgo, indicadores estadísticos, alertas de anomalías y clasificaciones por niveles producidas por RUBLI son:'
              : 'All risk scores, statistical indicators, anomaly flags, and tier classifications produced by RUBLI are:'}
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>
              <strong className="text-text-primary">{isEs ? 'Probabilísticas, no deterministas' : 'Probabilistic, not deterministic'}</strong>{' '}
              {isEs ? '— reflejan patrones estadísticos en los datos, no hallazgos fácticos de mala conducta.' : '— they reflect statistical patterns in procurement data, not factual findings of misconduct.'}
            </li>
            <li>
              <strong className="text-text-primary">{isEs ? 'Entrenadas con casos documentados' : 'Trained on documented cases'}</strong>{' '}
              {isEs ? '— el modelo se calibró con casos públicamente documentados de corrupción y puede no capturar todas las formas de irregularidad.' : '— the model was calibrated against publicly documented corruption cases and may not capture all forms of procurement irregularity.'}
            </li>
            <li>
              <strong className="text-text-primary">{isEs ? 'Sujetas a limitaciones conocidas' : 'Subject to known limitations'}</strong>{' '}
              {isEs ? '— consulte la página de ' : '— see the '}
              <a href="/methodology" className="text-accent hover:text-accent-hover underline underline-offset-2">
                {isEs ? 'Metodología' : 'Methodology'}
              </a>{' '}
              {isEs ? 'para una discusión completa de limitaciones, puntos ciegos y advertencias sobre la calidad de los datos.' : 'page for a full discussion of model limitations, blind spots, and data quality caveats.'}
            </li>
            <li>
              <strong className="text-text-primary">{isEs ? 'No son opiniones legales' : 'Not legal opinions'}</strong>{' '}
              {isEs ? '— nada en esta plataforma constituye asesoramiento legal o un hallazgo formal de auditoría.' : '— nothing on this platform constitutes legal advice or a formal audit finding.'}
            </li>
          </ul>
        </Section>

        <Section id="sources" title={isEs ? '5. Fuentes de datos y atribución' : '5. Data Sources and Attribution'}>
          <p>
            {isEs ? 'Los datos subyacentes de RUBLI provienen de fuentes gubernamentales públicas:' : 'RUBLI\'s underlying data originates from publicly available government sources:'}
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li><strong className="text-text-primary">COMPRANET</strong> — Sistema Electrónico de Contrataciones Gubernamentales (SHCP / SFP)</li>
            <li><strong className="text-text-primary">SAT EFOS</strong> — Empresas que Facturan Operaciones Simuladas (SAT)</li>
            <li><strong className="text-text-primary">{isEs ? 'Sanciones SFP' : 'SFP Sanctions'}</strong> — Registro de Servidores Públicos Sancionados</li>
            <li><strong className="text-text-primary">RUPC</strong> — Registro Único de Proveedores y Contratistas</li>
            <li><strong className="text-text-primary">ASF</strong> — {isEs ? 'Reportes públicos de auditoría de la Auditoría Superior de la Federación' : 'Auditoría Superior de la Federación public audit reports'}</li>
          </ul>
          <p>
            {isEs
              ? 'Cuando publique hallazgos basados en datos de RUBLI, atribuya los datos originales a la fuente gubernamental correspondiente junto con una referencia a RUBLI.'
              : 'When publishing findings that rely on RUBLI data, please attribute the original data to the respective government source alongside a reference to RUBLI.'}
          </p>
        </Section>

        <Section id="warranty" title={isEs ? '6. Sin garantía' : '6. No Warranty'}>
          <p>
            {isEs
              ? <>RUBLI se proporciona <strong className="text-text-primary">"tal cual"</strong>, sin garantía de ningún tipo, expresa o implícita. Los mantenedores no hacen declaraciones sobre la exactitud, integridad o idoneidad para un propósito de cualquier dato o análisis presentado. Los datos pueden contener errores heredados de las fuentes gubernamentales originales.</>
              : <>RUBLI is provided <strong className="text-text-primary">"as is"</strong>, without warranty of any kind, express or implied. The maintainers make no representations about the accuracy, completeness, or fitness for purpose of any data or analysis presented. Data may contain errors inherited from the original government sources.</>}
          </p>
          <p>
            {isEs
              ? 'Usted usa RUBLI por su propia cuenta y riesgo. Los mantenedores no son responsables de ninguna pérdida o daño derivado de la confianza en la información presentada en esta plataforma.'
              : 'You use RUBLI at your own risk. The maintainers are not liable for any loss or damage arising from reliance on information presented on this platform.'}
          </p>
        </Section>

        <Section id="license" title={isEs ? '7. Licencia de código abierto' : '7. Open Source Licence'}>
          <p>
            {isEs ? 'El código fuente de RUBLI se publica bajo la ' : 'RUBLI\'s source code is released under the '}
            <strong className="text-text-primary">{isEs ? 'Licencia MIT' : 'MIT Licence'}</strong>.{' '}
            {isEs
              ? 'Es libre de inspeccionar, hacer fork y construir sobre el código de acuerdo con esa licencia. El texto de la licencia está disponible en el '
              : 'You are free to inspect, fork, and build upon the codebase in accordance with that licence. The licence text is available in the '}
            <a href="https://github.com/rodanaya/yangwenli/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline underline-offset-2">
              {isEs ? 'repositorio' : 'repository'}
            </a>.
          </p>
          <p>
            {isEs
              ? 'Los datos de contrataciones subyacentes son propiedad del gobierno federal mexicano y están sujetos a sus términos de datos abiertos. Los resultados derivados de RUBLI (puntuaciones, clasificaciones, análisis estadísticos) se publican bajo la misma Licencia MIT.'
              : 'The underlying procurement data is owned by the Mexican federal government and is subject to its open data terms. RUBLI\'s derived outputs (risk scores, classifications, statistical analyses) are released under the same MIT Licence.'}
          </p>
        </Section>

        <Section id="disclosure" title={isEs ? '8. Divulgación responsable' : '8. Responsible Disclosure'}>
          <p>
            {isEs
              ? 'Si identifica errores en los datos, problemas metodológicos o preocupaciones de privacidad, repórtelos a través de '
              : 'If you identify data errors, methodological issues, or privacy concerns, please report them via '}
            <a href="https://github.com/rodanaya/yangwenli/issues" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline underline-offset-2">
              GitHub Issues
            </a>.{' '}
            {isEs
              ? 'Tomamos en serio la calidad de los datos y nos esforzamos por atender los reportes sustantivos con prontitud.'
              : 'We take data quality seriously and aim to address substantive reports promptly.'}
          </p>
        </Section>

        <Section id="changes" title={isEs ? '9. Cambios a estos términos' : '9. Changes to These Terms'}>
          <p>
            {isEs
              ? 'Podemos actualizar estos términos para reflejar cambios en la funcionalidad de la plataforma o en la legislación aplicable. La fecha en la parte superior de esta página indica la revisión más reciente. El uso continuado de RUBLI después de las actualizaciones constituye aceptación de los términos revisados.'
              : 'We may update these terms to reflect changes in platform functionality or applicable law. The date at the top of this page indicates the most recent revision. Continued use of RUBLI after updates constitutes acceptance of the revised terms.'}
          </p>
        </Section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 items-center">
          <a
            href="https://github.com/rodanaya/yangwenli"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            {isEs ? 'Código fuente (MIT)' : 'Source code (MIT)'}
          </a>
          <a href="/privacy" className="text-xs text-text-secondary hover:text-text-primary transition-colors">
            {isEs ? 'Aviso de privacidad' : 'Privacy Policy'}
          </a>
          <a
            href="/methodology"
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            {isEs ? 'Metodología' : 'Methodology'}
          </a>
        </div>
      </div>
    </div>
  )
}
