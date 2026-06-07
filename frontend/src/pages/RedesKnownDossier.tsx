/**
 * RedesKnownDossier — /network — "LA TRAMA" (The Mesh)
 *
 * STEP 0 of the La Trama rebuild (2026-06-07). The previous surface
 * (Acts I–III pattern cards) was deleted in this commit because:
 *   - Acts I+II duplicated /patterns — both read the identical
 *     getPatternSpotlight() endpoint and rendered the same seven
 *     P1–P7 cards (redundancy audit, design council wf_7f8821ad).
 *   - Act III's "Flujo de Valor" Sankey labeled institutions from a
 *     hardcoded PATTERN_INSTITUTION map — illustrative, not data.
 *   - The buildCommunities() fallback corpus was fabricated MXN by
 *     its own admission and live whenever the backend was cold.
 *
 * Phase A replaces this skeleton with the real co-bidding mesh:
 *   RUNG 0  cluster index — ~220 renderable Louvain communities
 *   RUNG 1  CommunityForceGraph — real members + co_bidding_stats edges
 *   RUNG 2  actor view — VendorNetworkView promoted from ?vendor=
 *
 * The ?vendor=<id> drill-down (VendorNetworkView) is preserved — it
 * becomes RUNG 2 of the new ladder. See .claude/ACTIVE_WORK.md
 * "LA TRAMA · /network full redesign".
 */
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { VendorNetworkView } from '@/components/network/VendorNetworkView'
import { Network } from 'lucide-react'

export default function RedesKnownDossier() {
  const { i18n } = useTranslation('redes')
  const isEs = i18n.language.startsWith('es')

  // Vendor drill-down: /network?vendor=12345 → focused vendor network view
  const [searchParams] = useSearchParams()
  const vendorParam = searchParams.get('vendor')
  const vendorId = vendorParam ? parseInt(vendorParam, 10) : null
  if (vendorId !== null && Number.isFinite(vendorId) && vendorId > 0) {
    return <VendorNetworkView vendorId={vendorId} />
  }

  return (
    <div className="relative space-y-8 max-w-6xl mx-auto pb-12">
      <div className="border-b border-border/60 pb-8">
        <div
          className="flex items-center gap-3 mb-4"
          style={{
            fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            fontWeight: 400,
          }}
        >
          <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Folio·XIV</span>
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            <span>{isEs ? 'Inteligencia de red · ARIA' : 'Network intelligence · ARIA'}</span>
          </span>
        </div>

        <h1
          style={{
            fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(34px, 5vw, 60px)',
            lineHeight: 1.02,
            letterSpacing: '-0.012em',
          }}
          className="text-text-primary mb-4"
        >
          {isEs ? (
            <>
              La{' '}
              <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>
                red invisible.
              </span>
            </>
          ) : (
            <>
              The{' '}
              <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>
                invisible
              </span>{' '}
              network.
            </>
          )}
        </h1>
      </div>

      {/* Honest interim state — never invented data while the mesh is rebuilt */}
      <div className="rounded border border-border/60 bg-background px-6 py-10 text-center">
        <Network className="mx-auto mb-4 h-8 w-8 text-text-muted/40" aria-hidden="true" />
        <p
          className="text-text-primary mb-1"
          style={{ fontFamily: 'var(--font-family-serif)', fontStyle: 'italic', fontSize: '1.15rem' }}
        >
          {isEs ? 'La trama se está reconstruyendo' : 'The mesh is being rebuilt'}
        </p>
        <p className="text-[12px] text-text-muted font-mono max-w-xl mx-auto">
          {isEs
            ? 'Esta superficie se reemplaza por el grafo real de co-licitación: 351 mil aristas entre proveedores que licitan juntos.'
            : 'This surface is being replaced by the real co-bidding graph: 351K edges between vendors that bid together.'}
        </p>
      </div>
    </div>
  )
}
