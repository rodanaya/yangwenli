/**
 * SearchOverlay — quick-jump search at the top-left of /explore.
 *
 * Type "imss" → jumps to Z2 inside Salud.
 * Type "salud" → jumps to Z1.
 * Type "edenred" → jumps to Z2 inside the relevant sector.
 *
 * Hits the existing search endpoint. Results are de-duped + ranked by
 * entity type (sector → institution → vendor). Esc closes.
 */
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchApi, institutionApi } from '@/api/client'
import { SECTORS, getSectorName } from '@/lib/constants'
import { useExploreDispatch } from './ExploreState'

interface Result {
  kind: 'sector' | 'institution' | 'vendor'
  id: number
  label: string
  sectorCode?: string
  sectorId?: number
}

// Recent-jumps history — persists last 8 picks across sessions so the
// overlay opens with a "RECENT" pill list when the input is empty.
// Stored under the same `rubli_explore_*` namespace as the URL sync.
const RECENT_KEY = 'rubli_explore_recent_v1'
const RECENT_MAX = 8

function readRecent(): Result[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

function pushRecent(r: Result): void {
  try {
    const cur = readRecent()
    // De-dup by kind+id; prepend the new one.
    const filtered = cur.filter((x) => !(x.kind === r.kind && x.id === r.id))
    const next = [r, ...filtered].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* private mode — quietly skip */
  }
}

export function SearchOverlay({ lang }: { lang: 'en' | 'es' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [recent, setRecent] = useState<Result[]>(() => readRecent())
  const inputRef = useRef<HTMLInputElement>(null)
  const dispatch = useExploreDispatch()

  // Refresh recent every time the overlay opens — picks up changes from
  // other tabs (rare but possible).
  useEffect(() => {
    if (open) setRecent(readRecent())
  }, [open])

  // Cmd/Ctrl-K to open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
        setQ('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Focus when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Sectors are local — fast match
  const sectorMatches: Result[] = q.length >= 2
    ? SECTORS.filter((s) =>
        getSectorName(s.code, lang).toLowerCase().includes(q.toLowerCase()) ||
        s.code.toLowerCase().includes(q.toLowerCase()),
      ).map((s) => ({
        kind: 'sector' as const,
        id: s.id,
        label: getSectorName(s.code, lang),
        sectorCode: s.code,
        sectorId: s.id,
      }))
    : []

  // Backend search for vendors + institutions
  const { data: backendResults } = useQuery({
    queryKey: ['explore', 'search', q],
    queryFn: () => searchApi.federated(q, 10),
    enabled: q.length >= 2,
    staleTime: 60 * 1000,
  })

  const vendorMatches: Result[] = (backendResults?.vendors ?? [])
    .slice(0, 5)
    .map((v) => ({
      kind: 'vendor' as const,
      id: v.id,
      label: v.name,
    }))

  const institutionMatches: Result[] = (backendResults?.institutions ?? [])
    .slice(0, 5)
    .map((i) => ({
      kind: 'institution' as const,
      id: i.id,
      label: i.name,
      // sector_id is NOT on FederatedInstitutionResult; resolved on pick
      // via institutionApi.getById so the user lands inside the right Z1.
    }))

  const allResults: Result[] = [...sectorMatches, ...institutionMatches, ...vendorMatches]

  const onPick = async (r: Result) => {
    if (r.kind === 'sector' && r.sectorCode) {
      dispatch({ type: 'reset-to-system' })
      setTimeout(() => {
        dispatch({ type: 'drill-into-sector', sectorId: r.id, sectorCode: r.sectorCode! })
      }, 50)
    } else if (r.kind === 'institution') {
      // Resolve sector via institutionApi.getById (FederatedInstitutionResult
      // doesn't carry sector_id). Falls back to direct institution-focus
      // without sector context if the lookup fails.
      try {
        const inst = await institutionApi.getById(r.id)
        const sector = SECTORS.find((s) => s.id === inst.sector_id)
        if (sector) {
          dispatch({ type: 'reset-to-system' })
          setTimeout(() => {
            dispatch({ type: 'drill-into-sector', sectorId: sector.id, sectorCode: sector.code })
            setTimeout(() => {
              dispatch({ type: 'drill-into-institution', institutionId: r.id, institutionName: r.label })
            }, 100)
          }, 50)
        } else {
          dispatch({ type: 'drill-into-institution', institutionId: r.id, institutionName: r.label })
        }
      } catch {
        dispatch({ type: 'drill-into-institution', institutionId: r.id, institutionName: r.label })
      }
    } else if (r.kind === 'vendor') {
      // Vendor jump — leave context as-is, just drill into vendor at current level
      dispatch({ type: 'drill-into-vendor', vendorId: r.id, vendorName: r.label })
    }
    pushRecent(r)
    setRecent(readRecent())
    setOpen(false)
    setQ('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 transition-colors"
        style={{
          background: 'var(--color-background-card, #fff)',
          border: '1px solid var(--color-border)',
          borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: 'var(--font-family-mono, monospace)',
          letterSpacing: '0.06em',
        }}
        aria-label={lang === 'en' ? 'Search the map' : 'Buscar en el mapa'}
      >
        🔍 {lang === 'en' ? 'Search' : 'Buscar'}
        <span className="ml-1 px-1 py-0.5 text-[8px] font-mono opacity-70 border border-current rounded-sm">
          ⌘K
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => { setOpen(false); setQ('') }}
        >
          <div
            className="w-full max-w-[520px] mx-4"
            style={{
              background: 'var(--color-background, #faf9f6)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              boxShadow: '0 12px 40px rgba(0,0,0,0.20)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === 'en' ? 'Search sectors, institutions, vendors…' : 'Buscar sectores, instituciones, proveedores…'}
              className="w-full px-4 py-3 text-base bg-transparent border-b border-border outline-none"
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family-mono, monospace)',
              }}
            />
            <div className="max-h-[340px] overflow-y-auto">
              {allResults.length === 0 && q.length >= 2 && (
                <div className="px-4 py-3 text-xs text-text-muted">
                  {lang === 'en' ? 'No matches.' : 'Sin coincidencias.'}
                </div>
              )}
              {allResults.length === 0 && q.length < 2 && recent.length === 0 && (
                <div className="px-4 py-3 text-xs text-text-muted">
                  {lang === 'en' ? 'Type at least 2 characters.' : 'Escribe al menos 2 caracteres.'}
                </div>
              )}
              {q.length < 2 && recent.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted">
                    {lang === 'en' ? 'Recent' : 'Reciente'}
                  </div>
                  {recent.map((r, i) => (
                    <button
                      key={`recent-${r.kind}-${r.id}-${i}`}
                      type="button"
                      onClick={() => onPick(r)}
                      className="w-full text-left px-4 py-2 hover:bg-background-elevated transition-colors flex items-center gap-3"
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted w-20">
                        {r.kind === 'sector' ? (lang === 'en' ? 'Sector' : 'Sector') : r.kind === 'institution' ? (lang === 'en' ? 'Inst.' : 'Inst.') : (lang === 'en' ? 'Vendor' : 'Prov.')}
                      </span>
                      <span className="text-sm text-text-primary flex-1 truncate">{r.label}</span>
                      <span className="text-[9px] text-text-muted opacity-50">↻</span>
                    </button>
                  ))}
                </>
              )}
              {allResults.map((r) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  onClick={() => onPick(r)}
                  className="w-full text-left px-4 py-2 hover:bg-background-elevated transition-colors flex items-center gap-3"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted w-20">
                    {r.kind === 'sector' ? (lang === 'en' ? 'Sector' : 'Sector') : r.kind === 'institution' ? (lang === 'en' ? 'Inst.' : 'Inst.') : (lang === 'en' ? 'Vendor' : 'Prov.')}
                  </span>
                  <span className="text-sm text-text-primary flex-1 truncate">{r.label}</span>
                </button>
              ))}
            </div>
            <div className="px-4 py-2 text-[9px] font-mono text-text-muted border-t border-border opacity-70">
              {lang === 'en' ? 'esc to close · ↵ first result' : 'esc para cerrar · ↵ primer resultado'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
