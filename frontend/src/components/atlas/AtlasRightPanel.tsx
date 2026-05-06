/**
 * AtlasRightPanel — 320px context panel for the investigator console.
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § 4
 * Build: atlas-C-P1
 *
 * P1 ships the IDLE state only (§ 4.1) — global stats card.
 * HOVER_CLUSTER (§ 4.2), ZOOMED_CLUSTER (§ 4.3), SELECTING (§ 4.4)
 * states are implemented in P3.
 *
 * The ClusterDetailPanel modal still slides over this panel until P3.
 * That's expected — the plan explicitly calls it "visual ugly-but-shipping".
 *
 * Risk distribution uses DotBar from the canonical ui primitives.
 * Numbers in Playfair Display Italic 800 with tabular-nums.
 * Color via style={{ color: hex }} — NEVER via className (silently stripped).
 */

import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { DotBar } from '@/components/ui/DotBar'
import { useAtlasState } from './AtlasContext'

// ─────────────────────────────────────────────────────────────────────────────
// Static data for the IDLE panel — sourced from CLAUDE.md + memory
// ─────────────────────────────────────────────────────────────────────────────
const IDLE_STATS = {
  totalContracts: '3.06M',
  totalSpend: '$9.88T MXN',
  riskDistribution: [
    { label: { en: 'CRITICAL', es: 'CRÍTICO' }, pct: 6.0, count: '183K', color: '#ef4444' },
    { label: { en: 'HIGH',     es: 'ALTO' },    pct: 7.5, count: '229K', color: '#f59e0b' },
    { label: { en: 'MEDIUM',   es: 'MEDIO' },   pct: 26.8, count: '819K', color: '#a16207' },
    { label: { en: 'LOW',      es: 'BAJO' },    pct: 59.7, count: '1.83M', color: '#71717a' },
  ],
  topPatterns: [
    { code: 'P5', label: { en: 'Systematic Overpricing', es: 'Sobreprecio Sistemático' }, t1: 180 },
    { code: 'P7', label: { en: 'Contractor Networks',    es: 'Red de Contratistas' },      t1: 56 },
    { code: 'P6', label: { en: 'Institutional Capture',  es: 'Captura Institucional' },    t1: 31 },
  ],
  team: {
    t1Vendors: 314,
    centinelaReady: 984,
    gtCases: 1401,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface AtlasRightPanelProps {
  lang: 'en' | 'es'
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-section label
// ─────────────────────────────────────────────────────────────────────────────
function PanelSection({ label }: { label: string }) {
  return (
    <div
      className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] pt-4 pb-2 flex items-center gap-2"
      style={{ color: 'var(--color-text-muted)' }}
    >
      <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
      {label}
      <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// IDLE state content
// ─────────────────────────────────────────────────────────────────────────────
function IdlePanel({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  const ACCENT = '#a06820'

  return (
    <div className="px-4 pb-6">
      {/* Eyebrow */}
      <div
        className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] pt-5 pb-3"
        style={{ color: ACCENT }}
      >
        {lang === 'en' ? 'OBSERVATORY · ALL YEARS' : 'EL OBSERVATORIO · TODOS LOS AÑOS'}
      </div>

      {/* Headline number — Playfair Display Italic 800 */}
      <div>
        <div
          className="tabular-nums leading-none"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 800,
            fontStyle: 'italic',
            fontSize: 44,
            color: ACCENT,
          }}
        >
          {IDLE_STATS.totalContracts}
        </div>
        <div
          className="text-[12px] font-mono mt-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {lang === 'en' ? 'contracts analyzed' : 'contratos analizados'}
        </div>
        <div
          className="text-[11px] font-mono mt-0.5 font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {IDLE_STATS.totalSpend}
          <span
            className="font-normal ml-1 text-[9px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {lang === 'en' ? 'validated spend' : 'gasto validado'}
          </span>
        </div>
      </div>

      {/* ── RISK DISTRIBUTION ─────────────────────────────────────── */}
      <PanelSection label={lang === 'en' ? 'RISK DISTRIBUTION' : 'DISTRIBUCIÓN DE RIESGO'} />

      <div className="space-y-2">
        {IDLE_STATS.riskDistribution.map((r) => (
          <div key={r.label.en} className="space-y-1">
            <div className="flex items-center justify-between">
              <span
                className="text-[9px] font-mono font-bold uppercase tracking-[0.1em]"
                style={{ color: r.color }}
              >
                {r.label[lang]}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-mono font-bold tabular-nums"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {r.pct.toFixed(1)}%
                </span>
                <span
                  className="text-[9px] font-mono tabular-nums"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {r.count}
                </span>
              </div>
            </div>
            <DotBar
              value={r.pct}
              max={100}
              color={r.color}
            />
          </div>
        ))}

        {/* OECD benchmark anchor — turns 7.5% from a number into a finding */}
        <div
          className="text-[9px] font-mono mt-1.5 pt-1.5 border-t"
          style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
        >
          ↑ {lang === 'en' ? 'OECD: flag ≥15% high+crit' : 'OCDE: bandera ≥15% alto+crít'}
        </div>
      </div>

      {/* ── TOP PATTERNS ──────────────────────────────────────────── */}
      <PanelSection label={lang === 'en' ? 'TOP PATTERNS' : 'PRINCIPALES PATRONES'} />

      <div className="space-y-1">
        {IDLE_STATS.topPatterns.map((p) => (
          <div
            key={p.code}
            className="flex items-center justify-between py-1.5 px-2.5 rounded-sm cursor-pointer hover:bg-background-elevated/30 transition-colors"
            onClick={() => navigate(`/clusters#${p.code}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/clusters#${p.code}`) }}
            aria-label={`${p.code} — ${p.label[lang]}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[9px] font-mono font-bold uppercase tracking-[0.1em] flex-shrink-0"
                style={{ color: ACCENT }}
              >
                {p.code}
              </span>
              <span
                className="text-[11px] font-mono truncate"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {p.label[lang]}
              </span>
            </div>
            <span
              className="text-[9px] font-mono font-bold flex-shrink-0 ml-2 tabular-nums"
              style={{ color: '#dc2626' }}
            >
              {p.t1} T1
            </span>
          </div>
        ))}
      </div>

      {/* ── INVESTIGATION DESK ────────────────────────────────────── */}
      <PanelSection label={lang === 'en' ? 'INVESTIGATION DESK' : 'EQUIPO DE INVESTIGACIÓN'} />

      <div className="space-y-1.5">
        {[
          {
            value: IDLE_STATS.team.t1Vendors,
            suffix: { en: 'T1-prioritized vendors', es: 'vendedores T1 priorizados' },
          },
          {
            value: IDLE_STATS.team.centinelaReady,
            suffix: { en: 'CENTINELA verifications ready', es: 'verificaciones CENTINELA listas' },
          },
          {
            value: IDLE_STATS.team.gtCases,
            suffix: { en: 'GT cases documented', es: 'casos GT documentados' },
          },
        ].map((row) => (
          <div key={row.suffix.en} className="flex items-baseline gap-2">
            <span
              className="font-mono font-bold tabular-nums text-[16px] leading-none flex-shrink-0"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {row.value.toLocaleString()}
            </span>
            <span
              className="text-[10px] font-mono leading-tight"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {row.suffix[lang]}
            </span>
          </div>
        ))}
      </div>

      {/* ── ARIA CTA ──────────────────────────────────────────────── */}
      <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={() => navigate('/aria')}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm font-mono uppercase tracking-[0.1em] text-[10px] font-bold transition-opacity hover:opacity-85"
          style={{ background: ACCENT, color: 'white' }}
        >
          {lang === 'en' ? '→ Open investigation queue (ARIA)' : '→ Abrir cola de investigación (ARIA)'}
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AtlasRightPanel — routes to the correct state view
// ─────────────────────────────────────────────────────────────────────────────
export function AtlasRightPanel({ lang }: AtlasRightPanelProps) {
  const state = useAtlasState()
  const view = state.view

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {view.kind === 'idle' || view.kind === 'hover-cluster' ? (
        // P1: idle panel for both idle and hover-cluster states.
        // P3 will add the hover-cluster variant.
        <IdlePanel lang={lang} />
      ) : view.kind === 'zoomed-cluster' ? (
        // P3 will render the vendor list here.
        // For P1: show idle content with a note.
        <IdlePanel lang={lang} />
      ) : view.kind === 'selecting' ? (
        // P4 will render the selection summary here.
        // For P1: show idle content.
        <IdlePanel lang={lang} />
      ) : (
        <IdlePanel lang={lang} />
      )}
    </div>
  )
}
