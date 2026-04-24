import { Scale, AlertTriangle, Github, BookOpen } from 'lucide-react'

// ============================================================================
// Terms of Use — RUBLI Mexican Procurement Analysis Platform
// ============================================================================

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="mb-10">
      <h2 className="text-base font-semibold text-text-primary mb-3 pb-2 border-b border-border">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-text-primary leading-relaxed">{children}</div>
    </section>
  )
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <Scale className="h-5 w-5 text-amber-500/80" aria-hidden="true" />
            <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-primary">
              Terms of Use
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Terms of Use
          </h1>
          <p className="text-sm text-text-primary">
            Last updated: April 2026 &mdash; Version 1.0
          </p>
        </div>

        {/* Risk score disclaimer — most important thing to communicate */}
        <div className="rounded-lg border border-orange-500/25 bg-orange-500/[0.04] p-4 mb-10">
          <div className="flex gap-3">
            <AlertTriangle className="h-4 w-4 text-orange-400/80 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-text-primary leading-relaxed">
              <span className="font-semibold text-orange-400/80">Risk scores are not proof of wrongdoing.</span>{' '}
              RUBLI's statistical risk indicators measure similarity to documented procurement
              irregularities. A high risk score means a contract's characteristics resemble
              known problematic patterns — it does <strong className="text-text-primary">not</strong> mean
              the contract, vendor, or institution is corrupt. Risk scores are tools for
              investigation triage, not verdicts.
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        <Section title="1. Purpose and Scope">
          <p>
            RUBLI (<em>Red de Utilidad para la Búsqueda de Licitaciones Irregulares</em>) is a
            non-commercial, open-source research platform that analyses Mexican federal
            government procurement data to support transparency, accountability journalism,
            and academic research.
          </p>
          <p>
            These terms govern your use of the RUBLI web platform and any data or outputs
            derived from it. By accessing RUBLI, you agree to these terms.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="2. Permitted Uses">
          <p>You may use RUBLI and its outputs for:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>Journalistic investigation and reporting on government procurement</li>
            <li>Academic and non-commercial research</li>
            <li>Civil society monitoring of public spending</li>
            <li>Personal, educational, or non-profit transparency work</li>
            <li>Developing open-source tools that build on the same public data sources</li>
          </ul>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="3. Prohibited Uses">
          <p>You may <strong className="text-text-primary">not</strong>:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>
              Redistribute or resell RUBLI data or outputs for commercial gain without
              obtaining a separate licence
            </li>
            <li>
              Use risk scores or findings to make legal accusations against individuals
              or entities without independent corroboration
            </li>
            <li>
              Present RUBLI risk scores as official government determinations or as proof
              of corruption, fraud, or any other illegal activity
            </li>
            <li>
              Scrape the platform in a manner that degrades service for other users
            </li>
            <li>
              Attempt to re-identify or deanonymise any masked personal data
            </li>
          </ul>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="4. Nature of Risk Scores and Statistical Indicators">
          <p>
            All risk scores, statistical indicators, anomaly flags, and tier classifications
            produced by RUBLI are:
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>
              <strong className="text-text-primary">Probabilistic, not deterministic</strong> — they
              reflect statistical patterns in procurement data, not factual findings of misconduct.
            </li>
            <li>
              <strong className="text-text-primary">Trained on documented cases</strong> — the model
              was calibrated against publicly documented corruption cases and may not capture
              all forms of procurement irregularity.
            </li>
            <li>
              <strong className="text-text-primary">Subject to known limitations</strong> — see the{' '}
              <a href="/methodology" className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2">
                Methodology
              </a>{' '}
              page for a full discussion of model limitations, blind spots, and data quality
              caveats.
            </li>
            <li>
              <strong className="text-text-primary">Not legal opinions</strong> — nothing on this
              platform constitutes legal advice or a formal audit finding.
            </li>
          </ul>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="5. Data Sources and Attribution">
          <p>
            RUBLI's underlying data originates from publicly available government sources:
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>
              <strong className="text-text-primary">COMPRANET</strong> — Sistema Electrónico de
              Contrataciones Gubernamentales (SHCP / Secretaría de la Función Pública)
            </li>
            <li>
              <strong className="text-text-primary">SAT EFOS</strong> — Empresas que Facturan
              Operaciones Simuladas (Servicio de Administración Tributaria)
            </li>
            <li>
              <strong className="text-text-primary">SFP Sanctions</strong> — Registro de
              Servidores Públicos Sancionados
            </li>
            <li>
              <strong className="text-text-primary">RUPC</strong> — Registro Único de Proveedores
              y Contratistas
            </li>
            <li>
              <strong className="text-text-primary">ASF</strong> — Auditoría Superior de la
              Federación public audit reports
            </li>
          </ul>
          <p>
            When publishing findings that rely on RUBLI data, please attribute the
            original data to the respective government source alongside a reference to RUBLI.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="6. No Warranty">
          <p>
            RUBLI is provided <strong className="text-text-primary">"as is"</strong>, without
            warranty of any kind, express or implied. The maintainers make no representations
            about the accuracy, completeness, or fitness for purpose of any data or analysis
            presented. Data may contain errors inherited from the original government sources.
          </p>
          <p>
            You use RUBLI at your own risk. The maintainers are not liable for any loss or
            damage arising from reliance on information presented on this platform.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="7. Open Source Licence">
          <p>
            RUBLI's source code is released under the{' '}
            <strong className="text-text-primary">MIT Licence</strong>. You are free to inspect,
            fork, and build upon the codebase in accordance with that licence. The licence
            text is available in the{' '}
            <a
              href="https://github.com/rodanaya/yangwenli/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2"
            >
              repository
            </a>
            .
          </p>
          <p>
            The underlying procurement data is owned by the Mexican federal government and
            is subject to its open data terms. RUBLI's derived outputs (risk scores,
            classifications, statistical analyses) are released under the same MIT Licence.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="8. Responsible Disclosure">
          <p>
            If you identify data errors, methodological issues, or privacy concerns, please
            report them via{' '}
            <a
              href="https://github.com/rodanaya/yangwenli/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2"
            >
              GitHub Issues
            </a>
            . We take data quality seriously and aim to address substantive reports promptly.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="9. Changes to These Terms">
          <p>
            We may update these terms to reflect changes in platform functionality or
            applicable law. The date at the top of this page indicates the most recent
            revision. Continued use of RUBLI after updates constitutes acceptance of the
            revised terms.
          </p>
        </Section>

        {/* Footer links */}
        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 items-center">
          <a
            href="https://github.com/rodanaya/yangwenli"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-text-primary hover:text-text-primary transition-colors"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            Source code (MIT)
          </a>
          <a
            href="/privacy"
            className="text-xs text-text-primary hover:text-text-primary transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="/methodology"
            className="flex items-center gap-1.5 text-xs text-text-primary hover:text-text-primary transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Methodology
          </a>
        </div>
      </div>
    </div>
  )
}
