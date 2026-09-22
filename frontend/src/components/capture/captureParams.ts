/**
 * URL-state helper for the two /captura registers.
 *
 * The film owns `?sort` / `?abrir`; the ledger owns `?registro` / `?dir` /
 * `?todas`. Both write with `replace: true`, so sorting a column or opening a
 * card never stacks a history entry the Back button has to walk out of.
 *
 * Lives apart from `captureAxis.tsx` for the same reason `cases/useMeasured.ts`
 * lives apart from `CasesShared.tsx`: a module that exports both components and
 * plain functions breaks Fast Refresh.
 */

/** Writer for one search param, leaving every other param untouched. */
export function makeSetParam(
  searchParams: URLSearchParams,
  setSearchParams: (next: URLSearchParams, opts?: { replace?: boolean }) => void,
) {
  return (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }
}
