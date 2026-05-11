/**
 * useExploreUrlSync — bidirectional sync between ExploreState.stack and
 * the URL query string on /explore.
 *
 * URL format (compact + readable):
 *   /explore                                 → Z0 (system)
 *   /explore?s=salud                         → Z1 (sector salud)
 *   /explore?s=salud&i=251                   → Z2 (institution 251 inside salud)
 *   /explore?s=salud&i=251&v=29277           → Z3 (vendor 29277 inside institution 251)
 *   /explore?s=salud&i=251&v=29277&c=918273  → Z4 (contract 918273 of vendor 29277)
 *
 * Hydration on mount reads s,i,v and rebuilds the focus stack. Each
 * push/pop writes the URL via setSearchParams (replace mode so we don't
 * spam the back-button history with every drill).
 *
 * Names that aren't on the URL (institutionName, vendorName) are filled
 * with placeholders on hydration; they get replaced once the user
 * actually navigates again. This is a pragmatic trade-off — encoding
 * names would bloat the URL and require re-encoding when names change.
 */
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SECTORS } from '@/lib/constants'
import { useExploreState, useExploreDispatch, type Focus } from './ExploreState'

export function useExploreUrlSync(): void {
  const state = useExploreState()
  const dispatch = useExploreDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  // Track whether we've done initial hydration so the first URL→state
  // pass doesn't fight with the first state→URL pass.
  const hydratedRef = useRef(false)

  // ── URL → state (mount only) ─────────────────────────────────────────────
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    const sectorCode = searchParams.get('s')
    const institutionId = searchParams.get('i')
    const vendorId = searchParams.get('v')
    const contractId = searchParams.get('c')

    const stack: Focus[] = [{ level: 0, kind: 'system' }]

    if (sectorCode) {
      const sector = SECTORS.find((s) => s.code === sectorCode)
      if (sector) {
        stack.push({ level: 1, kind: 'sector', sectorId: sector.id, sectorCode })
      }
    }

    if (institutionId && stack.length > 1) {
      const id = Number(institutionId)
      if (Number.isFinite(id) && id > 0) {
        stack.push({
          level: 2,
          kind: 'institution',
          institutionId: id,
          institutionName: `Institution ${id}`, // placeholder — gets replaced on next drill
        })
      }
    }

    if (vendorId && stack.length > 2) {
      const id = Number(vendorId)
      if (Number.isFinite(id) && id > 0) {
        stack.push({
          level: 3,
          kind: 'vendor',
          vendorId: id,
          vendorName: `Vendor ${id}`,
        })
      }
    }

    if (contractId && stack.length > 3) {
      const id = Number(contractId)
      if (Number.isFinite(id) && id > 0) {
        stack.push({
          level: 4,
          kind: 'contract',
          contractId: id,
        })
      }
    }

    if (stack.length > 1) {
      dispatch({ type: 'hydrate-from-url', stack })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── state → URL (every change after hydration) ───────────────────────────
  useEffect(() => {
    if (!hydratedRef.current) return
    const next = new URLSearchParams(searchParams)

    // Walk the focus stack and write the level keys.
    let s: string | null = null
    let i: string | null = null
    let v: string | null = null
    let c: string | null = null
    for (const f of state.stack) {
      if (f.kind === 'sector') s = f.sectorCode
      else if (f.kind === 'institution') i = String(f.institutionId)
      else if (f.kind === 'vendor') v = String(f.vendorId)
      else if (f.kind === 'contract') c = String(f.contractId)
    }

    // Set or delete each key based on stack contents
    if (s) next.set('s', s); else next.delete('s')
    if (i) next.set('i', i); else next.delete('i')
    if (v) next.set('v', v); else next.delete('v')
    if (c) next.set('c', c); else next.delete('c')

    // Only write if something changed — avoids React Router warning loops.
    const cur = searchParams.toString()
    const nxt = next.toString()
    if (cur !== nxt) {
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stack])
}
