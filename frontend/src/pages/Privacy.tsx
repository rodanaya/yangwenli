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
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <Shield className="h-5 w-5 text-amber-500/80" aria-hidden="true" />
            <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-white/30">
              Privacy Policy
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Privacy &amp; Data Protection
          </h1>
          <p className="text-sm text-white/40">
            Last updated: April 2026 &mdash; Version 1.0
          </p>
          <p className="text-[11px] text-white/30 mt-1">
            Una versión en español está disponible a solicitud / Spanish version available on request.
          </p>
        </div>

        {/* Summary card */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4 mb-10">
          <p className="text-sm text-white/70 leading-relaxed">
            <span className="font-semibold text-amber-400/80">TL;DR:</span>{' '}
            RUBLI processes <strong className="text-white/80">public procurement records</strong> from
            the Mexican federal government. We do not collect personal information about visitors.
            We do not use tracking cookies or analytics. The only personal-adjacent data we hold
            are the <strong className="text-white/80">public tax IDs (RFC) of legal entities</strong> (companies),
            which are published by the government in the COMPRANET database.
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        <Section title="1. Who We Are (Data Controller)">
          <p>
            RUBLI is an open-source, non-commercial research platform for the analysis of Mexican
            federal government procurement data. The project is maintained voluntarily by contributors
            and is not affiliated with any government agency, political party, or commercial entity.
          </p>
          <p>
            For data-related enquiries, contact us via{' '}
            <a
              href="https://github.com/rodanaya/yangwenli/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2"
            >
              GitHub Issues
            </a>
            . We aim to respond within 30 days.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="2. What Data We Process">
          <div className="space-y-4">
            <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-blue-400/70" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">Procurement Records</span>
              </div>
              <p>
                Approximately 3.1 million contract records sourced from{' '}
                <strong className="text-white/75">COMPRANET</strong> (the Mexican federal procurement
                system, <em>Sistema Electrónico de Contrataciones Gubernamentales</em>), covering
                2002–2025. This data is published by the federal government under its open data
                programme and is freely accessible at{' '}
                <a
                  href="https://compranet.hacienda.gob.mx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2"
                >
                  compranet.hacienda.gob.mx
                </a>
                .
              </p>
            </div>

            <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-green-400/70" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">Public Sanctions Registries</span>
              </div>
              <p>
                We also incorporate data from the SAT EFOS list (empresas que facturan
                operaciones simuladas), the SFP sanctions registry (Secretaría de la Función
                Pública), RUPC (registro único de proveedores y contratistas), and ASF audit
                findings — all of which are public registries published by the Mexican government.
              </p>
            </div>

            <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-amber-400/70" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">RFC — Legal Entities Only</span>
              </div>
              <p>
                COMPRANET records include the{' '}
                <strong className="text-white/75">RFC (Registro Federal de Contribuyentes)</strong> —
                the Mexican tax identifier — of vendors and contracting institutions. RUBLI only
                displays and processes RFCs belonging to <strong className="text-white/75">legal
                entities</strong> (<em>personas morales</em>: companies, NGOs, government agencies).
              </p>
              <p className="mt-2">
                RFCs belonging to <strong className="text-white/75">natural persons</strong> (<em>personas
                físicas</em>) are <strong className="text-white/75">masked or excluded</strong> from
                display. The RFC of a persona física encodes the holder's birth date and name initials
                and is therefore personal data under LFPDPPP. We treat it accordingly.
              </p>
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="3. Legal Basis">
          <p>
            Our processing of public procurement data is grounded in:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>
              <strong className="text-white/80">Legitimate interest / public interest research</strong>{' '}
              under Art. 10 of the LFPDPPP, which permits processing without consent when the
              purpose is journalistic, historical, statistical, or scientific research activity in
              the public interest.
            </li>
            <li>
              The <strong className="text-white/80">open data mandate</strong> of the Mexican
              federal government (<em>Política de Datos Abiertos</em>, DOF 2015), which requires
              COMPRANET data to be published in machine-readable formats for reuse.
            </li>
            <li>
              <strong className="text-white/80">Accountability and transparency</strong> as recognised
              in Art. 6 of the Mexican Constitution and the Ley General de Transparencia y Acceso
              a la Información Pública.
            </li>
          </ul>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="4. Visitor Data — What We Do NOT Collect">
          <p>We do not:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>Require user registration or login</li>
            <li>Set advertising or tracking cookies</li>
            <li>Use third-party analytics (no Google Analytics, Mixpanel, or equivalent)</li>
            <li>Record IP addresses in association with browsing activity</li>
            <li>Sell or share visitor data with any third party</li>
          </ul>
          <p className="mt-3">
            We use a minimal functional cookie{' '}
            <Tag>rubli_seen_intro</Tag>
            {' '}stored in <Tag>localStorage</Tag> to remember whether you have seen the
            introduction screen. This contains no personal data, does not expire server-side,
            and is never transmitted to our servers.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="5. Data Retention &amp; Storage">
          <p>
            Procurement records are retained as long as the platform is operational and the
            source data remains publicly available from COMPRANET. The database is rebuilt
            periodically from source files and does not contain any data beyond what is
            published in the official government systems.
          </p>
          <p>
            No visitor data is stored server-side. Server logs, if any, are retained for
            no longer than 30 days for operational purposes only and are not linked to
            browsing activity.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="6. Your Rights (LFPDPPP — ARCO)">
          <p>
            Under the LFPDPPP you have the right to{' '}
            <strong className="text-white/80">Access, Rectification, Cancellation, and Opposition</strong>{' '}
            (ARCO rights) with respect to your personal data.
          </p>
          <p>
            Because RUBLI derives its data from public government sources, the primary mechanism
            for correcting errors in procurement records is through COMPRANET or the relevant
            contracting institution. However, if you believe RUBLI holds or displays personal data
            about you that is inaccurate or should be removed, please open a{' '}
            <a
              href="https://github.com/rodanaya/yangwenli/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2"
            >
              GitHub Issue
            </a>{' '}
            labelled <Tag>privacy</Tag>. We will respond within 30 days.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="7. Third-Party Services">
          <p>
            The RUBLI platform does not embed third-party services that collect personal data
            (e.g., embedded maps, social media buttons, or chat widgets). All data processing
            occurs on the RUBLI server infrastructure.
          </p>
          <p>
            The source code is hosted on GitHub. GitHub's own privacy policy applies to
            activity on github.com.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="8. Changes to This Policy">
          <p>
            We may update this policy to reflect changes in the platform or applicable law.
            The date at the top of this page indicates the most recent revision. Material changes
            will be announced via the project's GitHub repository.
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
            Source code (MIT)
          </a>
          <a
            href="/terms"
            className="text-xs text-white/35 hover:text-white/60 transition-colors"
          >
            Terms of Use
          </a>
          <a
            href="/methodology"
            className="text-xs text-white/35 hover:text-white/60 transition-colors"
          >
            Methodology
          </a>
        </div>
      </div>
    </div>
  )
}
