/**
 * ChartCatalog — visual canon page rendering every canonical primitive
 * with sample data. Used as the reference that future sessions consult
 * before redesigning charts. Do NOT add this to the main nav.
 *
 * Route: /_dev/charts
 *
 * If a primitive isn't shown here, it isn't canonical. Adding a new chart
 * primitive? Add it here too with a clear "when to use" caption.
 */

import { DotBar, DotBarRow } from '@/components/ui/DotBar'
import { DotStrip as LegacyDotStrip } from '@/components/charts/DotStrip'
import {
  DotStrip,
  EditorialLineChart,
  EditorialAreaChart,
  EditorialSparkline,
} from '@/components/charts/editorial'

const SAMPLE_TIMESERIES = [
  { year: 2020, riskPct: 8.4, contracts: 124000 },
  { year: 2021, riskPct: 9.1, contracts: 138000 },
  { year: 2022, riskPct: 11.2, contracts: 142000 },
  { year: 2023, riskPct: 13.0, contracts: 151000 },
  { year: 2024, riskPct: 13.5, contracts: 148000 },
  { year: 2025, riskPct: 13.2, contracts: 159000 },
]

const SAMPLE_SECTOR_RANK = [
  { label: 'Salud', fraction: 0.92, colorToken: 'sector-salud' as const, valueLabel: '$2.1T' },
  { label: 'Energía', fraction: 0.78, colorToken: 'sector-energia' as const, valueLabel: '$1.7T' },
  { label: 'Infraestructura', fraction: 0.65, colorToken: 'sector-infraestructura' as const, valueLabel: '$1.4T' },
  { label: 'Educación', fraction: 0.48, colorToken: 'sector-educacion' as const, valueLabel: '$1.0T' },
  { label: 'Defensa', fraction: 0.31, colorToken: 'sector-defensa' as const, valueLabel: '$680B' },
]

const SAMPLE_RISK_RANK = [
  { label: 'Crítico', fraction: 0.06, colorToken: 'risk-critical' as const, valueLabel: '184K' },
  { label: 'Alto', fraction: 0.075, colorToken: 'risk-high' as const, valueLabel: '229K' },
  { label: 'Medio', fraction: 0.27, colorToken: 'risk-medium' as const, valueLabel: '821K' },
  { label: 'Bajo', fraction: 0.59, colorToken: 'risk-low' as const, valueLabel: '1.8M' },
]

const SAMPLE_LEGACY_DATA = [
  { label: 'Direct award', value: 78, color: 'var(--color-risk-high)', valueLabel: '78%' },
  { label: 'Restricted', value: 14, color: 'var(--color-text-muted)', valueLabel: '14%' },
  { label: 'Open tender', value: 8, color: 'var(--color-text-muted)', valueLabel: '8%' },
]

function Section({ title, when, children }: { title: string; when: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-6 pb-8">
      <div className="mb-4">
        <h2 className="text-lg font-serif">{title}</h2>
        <p className="text-xs text-text-muted mt-1 max-w-prose">
          <strong>Use when:</strong> {when}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    </section>
  )
}

function Example({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border-subtle p-4 bg-background-elevated">
      <div className="mb-3">{children}</div>
      <p className="text-[11px] font-mono text-text-muted">{caption}</p>
    </div>
  )
}

export default function ChartCatalog() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-widest font-mono text-text-muted">
          Internal · Visual canon · Not in main nav
        </p>
        <h1 className="text-3xl font-serif mt-2">Chart Catalog</h1>
        <p className="text-sm text-text-secondary max-w-prose mt-3">
          Every canonical primitive in this codebase, with sample data. If a chart you want to
          render isn't here, it isn't canonical — either add it here or use the closest match
          rather than inventing a local variant. The audit found ~50 inline <code>{'<circle>'}</code>{' '}
          dot strips across 25 files; this catalog exists to prevent the next 50.
        </p>
      </header>

      <Section
        title="DotBar"
        when="A single value-as-bar metric inside a row or stat. Pairs naturally with a label and a numeric readout. Default geometry N=22 dotR=2 dotGap=5; override only when matching a legacy bespoke layout."
      >
        <Example caption="<DotBar value={0.62} max={1} />  · canonical defaults">
          <DotBar value={0.62} max={1} ariaLabel="62 percent fill" />
        </Example>
        <Example caption="<DotBar value={0.35} max={1} color='var(--color-risk-high)' />">
          <DotBar value={0.35} max={1} color="var(--color-risk-high)" />
        </Example>
        <Example caption="<DotBar dots={20} dotR={3} dotGap={8} />  · custom geometry (legacy bridge)">
          <DotBar value={0.7} max={1} dots={20} dotR={3} dotGap={8} color="var(--color-risk-critical)" />
        </Example>
        <Example caption="<DotBarRow label readout value max />  · labeled wrapper">
          <DotBarRow
            label="Riesgo promedio"
            readout="0.62"
            value={0.62}
            max={1}
            color="var(--color-risk-high)"
          />
        </Example>
      </Section>

      <Section
        title="DotStrip — editorial (canonical)"
        when="Ranked list of entities or categories shown as proportion-filled rows. Replaces a horizontal bar chart for ≤10 rows. Bible §4 canonical: N=50 R=3 GAP=8."
      >
        <Example caption="rows + colorToken (sector palette)">
          <DotStrip rows={SAMPLE_SECTOR_RANK} />
        </Example>
        <Example caption="rows + colorToken (risk palette)">
          <DotStrip rows={SAMPLE_RISK_RANK} />
        </Example>
        <Example caption="with OECD reference mark at 0.13">
          <DotStrip
            rows={SAMPLE_SECTOR_RANK.slice(0, 3)}
            oecdMark={{ fraction: 0.13, label: 'OCDE · 13%' }}
          />
        </Example>
        <Example caption="orientation='vertical'  · time series columns">
          <DotStrip
            orientation="vertical"
            rows={SAMPLE_TIMESERIES.map((d) => ({
              label: String(d.year),
              fraction: d.riskPct / 20,
              colorToken: 'risk-high' as const,
              valueLabel: `${d.riskPct.toFixed(1)}%`,
            }))}
            N={20}
          />
        </Example>
      </Section>

      <Section
        title="DotStrip — legacy adapter"
        when="Caller already has raw values + arbitrary CSS colors from external lookup tables (GRADE_COLORS, PROCEDURE_COLORS, etc.) and migrating to semantic tokens isn't trivial. Renders through the editorial primitive internally — same visual output as canonical."
      >
        <Example caption="<DotStrip data={[{label, value, color, valueLabel}]} />">
          <LegacyDotStrip data={SAMPLE_LEGACY_DATA} />
        </Example>
      </Section>

      <Section
        title="EditorialLineChart"
        when="Multi-series time series. Token-locked stroke widths and grid styling. Hairline authority — 2px primary, 1.5px secondary."
      >
        <Example caption="single series, year over year">
          <EditorialLineChart
            data={SAMPLE_TIMESERIES}
            xKey="year"
            series={[{ key: 'riskPct', label: 'Riesgo %', colorToken: 'risk-high' }]}
            yFormat="pct"
            height={200}
          />
        </Example>
      </Section>

      <Section
        title="EditorialAreaChart"
        when="Single-series volume over time. Gradient fill carries the magnitude visually."
      >
        <Example caption="contracts over time, area fill">
          <EditorialAreaChart
            data={SAMPLE_TIMESERIES}
            xKey="year"
            yKey="contracts"
            colorToken="accent-data"
            yFormat="integer"
            height={200}
          />
        </Example>
      </Section>

      <Section
        title="EditorialSparkline"
        when="Inline cell-level trend (vendor rows, headline summary). No axes, no grid. 24/32/40/48 px heights only."
      >
        <Example caption="line · 40 px height">
          <EditorialSparkline data={SAMPLE_TIMESERIES} yKey="riskPct" colorToken="risk-high" height={40} />
        </Example>
        <Example caption="area · 32 px height">
          <EditorialSparkline
            data={SAMPLE_TIMESERIES}
            yKey="contracts"
            colorToken="accent-data"
            kind="area"
            height={32}
          />
        </Example>
      </Section>

      <Section
        title="Other canonical primitives (referenced, not rendered here)"
        when="These exist; render them in their natural pages with real data. Listed here so the catalog stays a complete index."
      >
        <Example caption="EditorialComposedChart  · @/components/charts/editorial">
          <p className="text-xs text-text-muted">
            Layered line + bar + scatter + area in one frame. For dashboards combining a primary
            series (e.g. risk %) with secondary context (e.g. contract volume).
          </p>
        </Example>
        <Example caption="EditorialScatterChart  · @/components/charts/editorial">
          <p className="text-xs text-text-muted">
            Two-axis distributions (e.g. price vs. risk score per vendor). Annotation API for
            quadrant callouts.
          </p>
        </Example>
        <Example caption="EditorialRadarChart  · @/components/charts/editorial">
          <p className="text-xs text-text-muted">
            Multi-dimensional vendor / institution comparison (5–8 axes). Use sparingly — radar
            charts are easy to misread.
          </p>
        </Example>
        <Example caption="EditorialHeatmap  · @/components/charts/editorial">
          <p className="text-xs text-text-muted">
            2D grids (sector × year, institution × month). Color via scaleToColor() — never raw
            hex per cell.
          </p>
        </Example>
        <Example caption="ChartFrame  · @/components/charts/editorial">
          <p className="text-xs text-text-muted">
            Editorial wrapper. Overline (mono caps), Playfair finding-first title, italic dek,
            mono source line. Wrap every chart in a frame on a page.
          </p>
        </Example>
      </Section>

      <footer className="mt-12 pt-6 border-t border-border text-[11px] font-mono text-text-muted">
        Last updated 2026-04-27. Add new primitives to this catalog before merging them.
      </footer>
    </div>
  )
}
