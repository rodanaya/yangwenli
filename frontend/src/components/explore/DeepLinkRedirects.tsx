/**
 * DeepLinkRedirects — `/vendors/:id` and `/institutions/:id` no longer
 * mount the legacy dossier pages directly. They mount these tiny
 * components, which fetch the entity to discover its position in the
 * universe (which sector → which institution → which vendor) and then
 * Navigate to the equivalent `/explore?…` deep link.
 *
 * The legacy dossier pages survive at `/print/vendors/:id` and
 * `/print/institutions/:id` for the printable-report use case described
 * in docs/RUBLI_v1.0_LAUNCH_PLAN.md.
 *
 * Why redirect instead of inline-rendering inside the universe:
 *   1. Single source of truth for the spatial map — every entity lives
 *      on one canvas, no off-route exits.
 *   2. Existing inbound links across the app (Watchlist, ARIA, Cases,
 *      Search) keep working — they hit the redirect and land deep
 *      inside the map.
 *   3. The printable surface stays cleanly addressable for export.
 *
 * Gap 2 of docs/SCAFFOLDING_OF_THE_UNIVERSE.md.
 */
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { vendorApi, institutionApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'

/**
 * Tiny visual while the entity fetch resolves. Honest about what's
 * happening — the page is computing the deep link, not stuck.
 */
function RedirectLoading({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-center min-h-[40vh] px-6"
      role="status"
      aria-live="polite"
    >
      <div className="text-center max-w-md">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
          Routing into the universe
        </div>
        <div className="text-sm text-text-secondary">{label}</div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// VendorDeepLinkRedirect — /vendors/:id → /explore?s=&i=&v=
// ──────────────────────────────────────────────────────────────────────

export function VendorDeepLinkRedirect() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const vendorId = Number(id)

  // `?print=1` opts out of the redirect → goes to the legacy dossier.
  // Useful when journalists explicitly want the printable surface.
  const wantsPrint = searchParams.get('print') === '1'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vendor-deep-link', vendorId],
    queryFn: () => vendorApi.getById(vendorId),
    enabled: !wantsPrint && Number.isFinite(vendorId) && vendorId > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  if (wantsPrint) {
    return <Navigate to={`/print/vendors/${vendorId}`} replace />
  }

  if (!Number.isFinite(vendorId) || vendorId <= 0) {
    return <Navigate to="/explore" replace />
  }

  if (isLoading) {
    return <RedirectLoading label="Finding this vendor on the map…" />
  }

  // On error, fall through to the printable dossier so the user still
  // gets the data they asked for — better than dumping them at Z0.
  if (isError || !data) {
    return <Navigate to={`/print/vendors/${vendorId}`} replace />
  }

  // Build the deep link. We use primary_sector_id for the sector code
  // and top_institutions[0].institution_id for the parent institution.
  // If primary_sector_id is missing, fall through to a bare ?v=… and
  // let the URL hydrator do its best (Z0 with v unresolved is the
  // worst case — never an "Open Z3 with no breadcrumbs" surprise).
  const sector = SECTORS.find((s) => s.id === data.primary_sector_id)
  const topInst = data.top_institutions?.[0]

  const params = new URLSearchParams()
  if (sector) params.set('s', sector.code)
  if (sector && topInst?.institution_id) params.set('i', String(topInst.institution_id))
  if (sector && topInst?.institution_id) params.set('v', String(vendorId))

  // If we couldn't resolve sector + institution at all, send to the
  // printable dossier — Z0 with no context is a worse UX than the
  // legacy page.
  if (!sector || !topInst?.institution_id) {
    return <Navigate to={`/print/vendors/${vendorId}`} replace />
  }

  return <Navigate to={`/explore?${params.toString()}`} replace />
}

// ──────────────────────────────────────────────────────────────────────
// InstitutionDeepLinkRedirect — /institutions/:id → /explore?s=&i=
// ──────────────────────────────────────────────────────────────────────

export function InstitutionDeepLinkRedirect() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const institutionId = Number(id)

  const wantsPrint = searchParams.get('print') === '1'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['institution-deep-link', institutionId],
    queryFn: () => institutionApi.getById(institutionId),
    enabled: !wantsPrint && Number.isFinite(institutionId) && institutionId > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  if (wantsPrint) {
    return <Navigate to={`/print/institutions/${institutionId}`} replace />
  }

  if (!Number.isFinite(institutionId) || institutionId <= 0) {
    return <Navigate to="/explore" replace />
  }

  if (isLoading) {
    return <RedirectLoading label="Finding this institution on the map…" />
  }

  if (isError || !data) {
    return <Navigate to={`/print/institutions/${institutionId}`} replace />
  }

  const sector = SECTORS.find((s) => s.id === data.sector_id)

  const params = new URLSearchParams()
  if (sector) params.set('s', sector.code)
  params.set('i', String(institutionId))

  if (!sector) {
    return <Navigate to={`/print/institutions/${institutionId}`} replace />
  }

  return <Navigate to={`/explore?${params.toString()}`} replace />
}
