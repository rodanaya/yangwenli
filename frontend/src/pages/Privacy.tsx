import { useState } from 'react'
import { Shield, Database, FileText, Github, Lock } from 'lucide-react'

// ============================================================================
// Privacy Policy — RUBLI Mexican Procurement Analysis Platform
// Relevant law: LFPDPPP (Ley Federal de Protección de Datos Personales en
// Posesión de los Particulares), Mexico, 2010.
// Legal basis: Art. 10 LFPDPPP — legitimate interest / public interest research.
// ============================================================================

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="mb-10">
      <h2 className="text-base font-semibold text-white/90 mb-3 pb-2 border-b border-white/[0.07]">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-white/60 leading-relaxed">{children}</div>
    </section>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-white/[0.07] border border-white/[0.10] text-white/55 text-[11px] font-mono px-1.5 py-0.5 mx-0.5">
      {children}
    </span>
  )
}

export default function Privacy() {
  const [lang, setLang] = useState<'en' | 'es'>('es')
  const isEs = lang === 'es'

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Shield className="h-5 w-5 text-amber-500/80" aria-hidden="true" />
              <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-white/30">
                {isEs ? 'Aviso de Privacidad' : 'Privacy Policy'}
              </span>
            </div>
            {/* Language toggle */}
            <div className="flex items-center gap-1 rounded border border-white/10 bg-white/[0.04] p-0.5">
              <button
                onClick={() => setLang('es')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${lang === 'es' ? 'bg-amber-500/20 text-amber-400' : 'text-white/30 hover:text-white/60'}`}
              >
                ES
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${lang === 'en' ? 'bg-amber-500/20 text-amber-400' : 'text-white/30 hover:text-white/60'}`}
              >
                EN
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isEs ? 'Privacidad y Protección de Datos' : 'Privacy & Data Protection'}
          </h1>
          <p className="text-sm text-white/40">
            {isEs ? 'Última actualización: Abril 2026 — Versión 1.0' : 'Last updated: April 2026 — Version 1.0'}
          </p>
        </div>

        {/* Summary card */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4 mb-10">
          <p className="text-sm text-white/70 leading-relaxed">
            <span className="font-semibold text-amber-400/80">TL;DR{isEs ? '' : ':'}:</span>{' '}
            {isEs
              ? <>RUBLI procesa <strong className="text-white/80">registros públicos de contrataciones</strong> del gobierno federal mexicano. No recopilamos información personal de visitantes. No usamos cookies de rastreo ni analíticas. Los únicos datos de carácter personal que manejamos son los <strong className="text-white/80">RFC públicos de personas morales</strong> (empresas), publicados por el gobierno en COMPRANET.</>
              : <>RUBLI processes <strong className="text-white/80">public procurement records</strong> from the Mexican federal government. We do not collect personal information about visitors. We do not use tracking cookies or analytics. The only personal-adjacent data we hold are the <strong className="text-white/80">public tax IDs (RFC) of legal entities</strong> (companies), which are published by the government in the COMPRANET database.</>
            }
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        <Section title={isEs ? '1. Quiénes somos (Responsable del tratamiento)' : '1. Who We Are (Data Controller)'}>
          <p>
            {isEs
              ? 'RUBLI es una plataforma de investigación de código abierto y sin fines de lucro para el análisis de datos de contrataciones del gobierno federal mexicano. El proyecto es mantenido de forma voluntaria por colaboradores y no está afiliado a ninguna entidad gubernamental, partido político o empresa comercial.'
              : 'RUBLI is an open-source, non-commercial research platform for the analysis of Mexican federal government procurement data. The project is maintained voluntarily by contributors and is not affiliated with any government agency, political party, or commercial entity.'
            }
          </p>
          <p>
            {isEs ? 'Para consultas relacionadas con datos, contáctenos a través de ' : 'For data-related enquiries, contact us via '}
            <a href="https://github.com/rodanaya/yangwenli/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2">
              GitHub Issues
            </a>
            {isEs ? '. Nos comprometemos a responder en un plazo de 30 días.' : '. We aim to respond within 30 days.'}
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title={isEs ? '2. Qué datos tratamos' : '2. What Data We Process'}>
          <div className="space-y-4">
            <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-blue-400/70" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">{isEs ? 'Registros de contrataciones' : 'Procurement Records'}</span>
              </div>
              <p>
                {isEs
                  ? <>Aproximadamente 3.1 millones de contratos obtenidos de <strong className="text-white/75">COMPRANET</strong> (Sistema Electrónico de Contrataciones Gubernamentales), que abarca 2002–2025. Estos datos son publicados por el gobierno federal bajo su programa de datos abiertos y están disponibles gratuitamente en <a href="https://compranet.hacienda.gob.mx" target="_blank" rel="noopener noreferrer" className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2">compranet.hacienda.gob.mx</a>.</>
                  : <>Approximately 3.1 million contract records sourced from <strong className="text-white/75">COMPRANET</strong> (the Mexican federal procurement system, <em>Sistema Electrónico de Contrataciones Gubernamentales</em>), covering 2002–2025. This data is published by the federal government under its open data programme and is freely accessible at <a href="https://compranet.hacienda.gob.mx" target="_blank" rel="noopener noreferrer" className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2">compranet.hacienda.gob.mx</a>.</>
                }
              </p>
            </div>

            <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-green-400/70" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">{isEs ? 'Registros públicos de sanciones' : 'Public Sanctions Registries'}</span>
              </div>
              <p>
                {isEs
                  ? 'También incorporamos datos del listado SAT EFOS (empresas que facturan operaciones simuladas), el registro de inhabilitados de la SFP (Secretaría de la Función Pública), RUPC (Registro Único de Proveedores y Contratistas) y hallazgos de la ASF — todos ellos registros públicos del gobierno mexicano.'
                  : "We also incorporate data from the SAT EFOS list (empresas que facturan operaciones simuladas), the SFP sanctions registry (Secretaría de la Función Pública), RUPC (registro único de proveedores y contratistas), and ASF audit findings — all of which are public registries published by the Mexican government."
                }
              </p>
            </div>

            <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-amber-400/70" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">{isEs ? 'RFC — Solo personas morales' : 'RFC — Legal Entities Only'}</span>
              </div>
              <p>
                {isEs
                  ? <>Los registros de COMPRANET incluyen el <strong className="text-white/75">RFC (Registro Federal de Contribuyentes)</strong> de los proveedores e instituciones contratantes. RUBLI solo muestra y procesa RFCs pertenecientes a <strong className="text-white/75">personas morales</strong> (empresas, ONG, dependencias gubernamentales).</>
                  : <>COMPRANET records include the <strong className="text-white/75">RFC (Registro Federal de Contribuyentes)</strong> — the Mexican tax identifier — of vendors and contracting institutions. RUBLI only displays and processes RFCs belonging to <strong className="text-white/75">legal entities</strong> (<em>personas morales</em>: companies, NGOs, government agencies).</>
                }
              </p>
              <p className="mt-2">
                {isEs
                  ? <>Los RFCs de <strong className="text-white/75">personas físicas</strong> son <strong className="text-white/75">enmascarados o excluidos</strong> del sistema. El RFC de una persona física codifica su fecha de nacimiento e iniciales del nombre, por lo que constituye dato personal conforme a la LFPDPPP. Lo tratamos en consecuencia.</>
                  : <>RFCs belonging to <strong className="text-white/75">natural persons</strong> (<em>personas físicas</em>) are <strong className="text-white/75">masked or excluded</strong> from display. The RFC of a persona física encodes the holder's birth date and name initials and is therefore personal data under LFPDPPP. We treat it accordingly.</>
                }
              </p>
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title={isEs ? '3. Base legal' : '3. Legal Basis'}>
          <p>{isEs ? 'Nuestro tratamiento de datos públicos de contrataciones se fundamenta en:' : 'Our processing of public procurement data is grounded in:'}</p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>
              <strong className="text-white/80">{isEs ? 'Interés legítimo / investigación de interés público' : 'Legitimate interest / public interest research'}</strong>{' '}
              {isEs
                ? 'conforme al Art. 10 de la LFPDPPP, que permite el tratamiento sin consentimiento cuando el fin es periodístico, histórico, estadístico o de investigación científica de interés público.'
                : 'under Art. 10 of the LFPDPPP, which permits processing without consent when the purpose is journalistic, historical, statistical, or scientific research activity in the public interest.'
              }
            </li>
            <li>
              {isEs
                ? <><strong className="text-white/80">El mandato de datos abiertos</strong> del gobierno federal mexicano (<em>Política de Datos Abiertos</em>, DOF 2015), que obliga a publicar los datos de COMPRANET en formatos reutilizables.</>
                : <>The <strong className="text-white/80">open data mandate</strong> of the Mexican federal government (<em>Política de Datos Abiertos</em>, DOF 2015), which requires COMPRANET data to be published in machine-readable formats for reuse.</>
              }
            </li>
            <li>
              <strong className="text-white/80">{isEs ? 'Rendición de cuentas y transparencia' : 'Accountability and transparency'}</strong>{' '}
              {isEs
                ? 'reconocidas en el Art. 6 de la Constitución Mexicana y la Ley General de Transparencia y Acceso a la Información Pública.'
                : 'as recognised in Art. 6 of the Mexican Constitution and the Ley General de Transparencia y Acceso a la Información Pública.'
              }
            </li>
          </ul>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title={isEs ? '4. Datos de visitantes — Lo que NO recopilamos' : '4. Visitor Data — What We Do NOT Collect'}>
          <p>{isEs ? 'No realizamos ninguna de las siguientes acciones:' : 'We do not:'}</p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            {isEs ? <>
              <li>Requerir registro o inicio de sesión de los usuarios</li>
              <li>Instalar cookies publicitarias o de rastreo</li>
              <li>Usar analíticas de terceros (sin Google Analytics, Mixpanel ni equivalentes)</li>
              <li>Registrar direcciones IP asociadas a la actividad de navegación</li>
              <li>Vender o compartir datos de visitantes con terceros</li>
            </> : <>
              <li>Require user registration or login</li>
              <li>Set advertising or tracking cookies</li>
              <li>Use third-party analytics (no Google Analytics, Mixpanel, or equivalent)</li>
              <li>Record IP addresses in association with browsing activity</li>
              <li>Sell or share visitor data with any third party</li>
            </>}
          </ul>
          <p className="mt-3">
            {isEs
              ? <>Podemos almacenar preferencias funcionales mínimas (idioma, vista guardada) en <Tag>localStorage</Tag> del navegador. No contienen datos personales, permanecen en su dispositivo y nunca se transmiten a nuestros servidores.</>
              : <>We may store minimal functional preferences (language, saved view) in browser <Tag>localStorage</Tag>. These contain no personal data, stay on your device, and are never transmitted to our servers.</>
            }
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title={isEs ? '5. Retención y almacenamiento de datos' : '5. Data Retention & Storage'}>
          <p>
            {isEs
              ? 'Los registros de contrataciones se conservan mientras la plataforma esté en funcionamiento y los datos fuente estén disponibles en COMPRANET. La base de datos se reconstruye periódicamente a partir de los archivos fuente y no contiene datos más allá de los publicados en los sistemas gubernamentales oficiales.'
              : 'Procurement records are retained as long as the platform is operational and the source data remains publicly available from COMPRANET. The database is rebuilt periodically from source files and does not contain any data beyond what is published in the official government systems.'
            }
          </p>
          <p>
            {isEs
              ? 'No se almacenan datos de visitantes en el servidor. Los registros del servidor, en su caso, se conservan por no más de 30 días con fines operativos exclusivamente y no están vinculados a la actividad de navegación.'
              : 'No visitor data is stored server-side. Server logs, if any, are retained for no longer than 30 days for operational purposes only and are not linked to browsing activity.'
            }
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title={isEs ? '6. Sus derechos (LFPDPPP — ARCO)' : '6. Your Rights (LFPDPPP — ARCO)'}>
          <p>
            {isEs
              ? <> Conforme a la LFPDPPP, usted tiene derecho de <strong className="text-white/80">Acceso, Rectificación, Cancelación y Oposición</strong> (derechos ARCO) respecto a sus datos personales.</>
              : <>Under the LFPDPPP you have the right to <strong className="text-white/80">Access, Rectification, Cancellation, and Opposition</strong> (ARCO rights) with respect to your personal data.</>
            }
          </p>
          <p>
            {isEs
              ? <>Dado que RUBLI deriva sus datos de fuentes gubernamentales públicas, el mecanismo principal para corregir errores en los registros de contrataciones es a través de COMPRANET o la institución contratante correspondiente. Sin embargo, si considera que RUBLI conserva o muestra datos personales suyos que son inexactos o deben eliminarse, abra un </>
              : <>Because RUBLI derives its data from public government sources, the primary mechanism for correcting errors in procurement records is through COMPRANET or the relevant contracting institution. However, if you believe RUBLI holds or displays personal data about you that is inaccurate or should be removed, please open a </>
            }
            <a href="https://github.com/rodanaya/yangwenli/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2">
              {isEs ? 'issue en GitHub' : 'GitHub Issue'}
            </a>{' '}
            {isEs ? <>etiquetado <Tag>privacy</Tag>. Responderemos en un plazo de 30 días.</> : <>labelled <Tag>privacy</Tag>. We will respond within 30 days.</>}
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title={isEs ? '7. Servicios de terceros' : '7. Third-Party Services'}>
          <p>
            {isEs
              ? 'La plataforma RUBLI no integra servicios de terceros que recopilen datos personales (por ejemplo, mapas incrustados, botones de redes sociales o widgets de chat). Todo el procesamiento de datos ocurre en la infraestructura de servidores de RUBLI.'
              : 'The RUBLI platform does not embed third-party services that collect personal data (e.g., embedded maps, social media buttons, or chat widgets). All data processing occurs on the RUBLI server infrastructure.'
            }
          </p>
          <p>
            {isEs
              ? "El código fuente está alojado en GitHub. La política de privacidad propia de GitHub aplica a la actividad en github.com."
              : "The source code is hosted on GitHub. GitHub's own privacy policy applies to activity on github.com."
            }
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title={isEs ? '8. Cambios a este aviso' : '8. Changes to This Policy'}>
          <p>
            {isEs
              ? 'Podemos actualizar este aviso para reflejar cambios en la plataforma o en la legislación aplicable. La fecha en la parte superior de esta página indica la revisión más reciente. Los cambios sustanciales se anunciarán a través del repositorio de GitHub del proyecto.'
              : 'We may update this policy to reflect changes in the platform or applicable law. The date at the top of this page indicates the most recent revision. Material changes will be announced via the project\'s GitHub repository.'
            }
          </p>
        </Section>

        {/* Footer links */}
        <div className="mt-12 pt-6 border-t border-white/[0.07] flex flex-wrap gap-4 items-center">
          <a
            href="https://github.com/rodanaya/yangwenli"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            {isEs ? 'Código fuente (MIT)' : 'Source code (MIT)'}
          </a>
          <a href="/terms" className="text-xs text-white/35 hover:text-white/60 transition-colors">
            {isEs ? 'Términos de uso' : 'Terms of Use'}
          </a>
          <a href="/methodology" className="text-xs text-white/35 hover:text-white/60 transition-colors">
            {isEs ? 'Metodología' : 'Methodology'}
          </a>
        </div>
      </div>
    </div>
  )
}
