---
name: rubli-react-301-debug
description: |
  Bisect React error #301 ("Too many re-renders. React limits the number
  of renders to prevent an infinite loop.") in the RUBLI frontend. Use
  this skill when the prod console shows a minified React error 301, when
  a /atlas or dashboard page goes blank after a frontend deploy, when the
  user reports "the page won't load" / "it's stuck loading" / "it's
  blank" right after a redesign or hook change. The skill encodes the
  bisection procedure that recovered prod after the OMEGA-N deploy went
  sideways and saves the next session from re-deriving it under pressure.
---

# Debug React Error #301 in RUBLI

React error #301 means "Too many re-renders" — a component (or chain
of components) is calling `setState` during render in a way that
triggers another render that calls `setState` again, infinitely.

In a minified prod build the error message is just the number; you
won't see the component stack without source maps. Trying to
debug by reading code alone is slow and often wrong. The bisection
procedure below recovered prod in ~10 minutes after OMEGA-N hit this
exact error on 2026-05-06.

---

## Symptoms to recognize

- Page renders briefly then goes blank
- Browser console shows `Minified React error #301; visit
  https://react.dev/errors/301`
- Redirecting to https://react.dev/errors/301 shows
  "Too many re-renders. React limits the number of renders..."
- The error appeared *after* a recent frontend deploy (correlated
  in time with new hooks, new context bridges, or new useEffect
  patterns)

---

## Step 1 — Restore prod immediately, don't debug live

The first move is always to revert prod to a known-good commit so
users see something. THEN debug.

```bash
ssh root@37.60.232.109 "cd /opt/rubli && \
  git fetch origin && \
  git reset --hard <last-good-sha> && \
  docker rm -f rubli-frontend rubli-backend rubli-caddy rubli-aria-cron rubli-backup-cron && \
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"

curl -sI https://rubli.xyz/  # confirm 200
curl -s https://rubli.xyz/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
```

Now you can debug calmly without users watching a blank page.

---

## Step 2 — Identify the suspect change set

```bash
cd D:/Python/yangwenli/.claude/worktrees/lucid-edison-ad6469
git log --oneline <last-good-sha>..<broken-sha>
git diff <last-good-sha> <broken-sha> --stat
```

Categorize each touched file by render-loop risk:

**High risk** (start here):
- New `useEffect` that calls `setState` (most common cause)
- New custom hook that returns a fresh array/object reference each
  render (ref churn → downstream useMemo invalidation → effect
  fires → state changes → render → repeat)
- New context provider whose value object is recreated each render
- New `useQueries` from TanStack Query with dynamic queries arrays
- New "bridge" component that syncs context to local state

**Medium risk**:
- New `useMemo` whose dep is an unstable reference
- New `useCallback` with non-stable deps
- New `useReducer` whose initial state involves a fresh object

**Low risk** (probably not the cause):
- Pure render changes (new JSX, new className)
- New props passed through to a child without state interaction
- New imports

---

## Step 3 — Bisect by short-circuiting suspects, not by reading

Reading hooks code to find a render loop is unreliable — the bug is
often in the interaction between two stable-looking hooks. **Disable
hooks one at a time**, redeploy, see if the page loads.

For each high-risk hook, replace its body with a stable empty
return:

```ts
// Original (suspect)
export function useTopVendorsByCluster(lens, clusterCodes) {
  const results = useQueries({ queries: clusterCodes.map(...) })
  const named = []
  for (const r of results) { ... }
  return named  // fresh array reference every render → suspect
}

// Bisect-disabled
const EMPTY: NamedVendorDot[] = []
export function useTopVendorsByCluster(_lens, _clusterCodes) {
  return EMPTY  // stable reference, no useQueries
}
```

For each high-risk component, gate the side-effect:

```tsx
// Original (suspect AtlasStoryBinding component)
export function AtlasStoryBinding({ activeStory, ... }) {
  useEffect(() => { dispatch(...) }, [activeStory, ...])
  return null
}

// Bisect-disabled
export function AtlasStoryBinding(_props: AtlasStoryBindingProps) {
  return null  // no effects, no dispatch
}
```

Ship one disable at a time, verify the page loads, then know which
one was the culprit. If the page loads after disabling N+M but not N
alone, the bug is in the interaction.

---

## Step 4 — Fix the actual cause

Once bisection identifies the culprit, the fixes by category:

### Custom hook returning fresh reference

Wrap with `useMemo` so the same input produces a stable reference:

```ts
return useMemo(() => {
  if (!query.data || query.data.length === 0) return EMPTY
  return query.data
}, [query.data])
```

Or — if the hook is only useful when an input is non-null — gate the
fetch + return EMPTY when the input is null:

```ts
export function useTopVendorsForCluster(lens, clusterCode: string | null) {
  const query = useQuery({
    queryKey: ['top-vendors', lens, clusterCode],
    enabled: !!clusterCode,  // skip fetch when null
    ...
  })
  return useMemo(() => query.data ?? EMPTY, [query.data])
}
```

### Context bridge effect with unstable deps

Make the deps explicit primitives, not objects:

```tsx
// BAD — state object reference may differ even if .lens is unchanged
useEffect(() => { setMode(state.lens) }, [state])

// GOOD — primitive comparison
useEffect(() => { setMode(state.lens) }, [state.lens, setMode])
```

If the bridge fires correctly but loops anyway, check whether
`setMode` triggers another effect that dispatches into context —
that's the cycle. Add a guard via `useRef`:

```tsx
const lastAppliedRef = useRef<string | null>(null)
useEffect(() => {
  if (lastAppliedRef.current === state.lens) return
  lastAppliedRef.current = state.lens
  setMode(state.lens)
}, [state.lens, setMode])
```

### `useQueries` with dynamic array

`useQueries` IDs queries by `queryKey` so dynamic arrays usually
work. But if the same render produces N=many queries each call, the
churn is real. Two fixes:

1. Reduce N — fetch only when needed (e.g. only the zoomed cluster,
   not all clusters at idle). This was the OMEGA-N → FIX2 fix.
2. Switch to a single `useQuery` keyed on a stable list and
   server-side join.

### Story-chapter effect cascade

The pattern that caused OMEGA-N: an effect on `[activeStory,
activeChapterIndex]` calls `setMode + setYearIndex + setPinnedCode`,
which the AtlasContextBridge then syncs back into context, which
fires more effects. Break the cycle by:

- Adding a `prevChapterRef` guard inside the chapter effect (only
  run when the chapter actually changed)
- Or removing the bridge for the relevant fields when a story is
  active

---

## Step 5 — Verify in dev before redeploying

After the fix, run the dev server (`npm run dev` from `frontend/`,
port 3009) and click around the formerly-broken surface. The bug
should not appear. Check the browser console — there should be no
yellow warnings about "infinite loop" or "exceeded recursive update
depth."

Only then redeploy. If you redeploy without dev verification, you
risk breaking prod again and having to bisect a second cycle.

---

## Step 6 — Commit with the diagnosis in the body

Even if you only ship the disable (not the full fix), document what
you found. The next session needs this:

```
fix(<surface>): short-circuit <hook> + <component> to escape React #301

OMEGA-N hit React error #301 in prod. Bisection identified two
suspects:

1. useTopVendorsByCluster returned a fresh `[]` every render via
   useQueries — referential churn flowed into ConcentrationConstellation
   props and downstream useMemos.
2. AtlasStoryBinding's useEffect dispatched into AtlasContext on
   every chapter change, combined with the chapter effect's own
   setMode/setYearIndex/setPinnedCode cascade.

This commit short-circuits both paths so prod renders again. Full
fix coming in a follow-up:
- Wrap the hook with useMemo to stabilize the empty-state reference
- Restore the binding inside a feature flag

BUILD_ID -> 2026-05-05-omega-N-FIX1.
```

---

## Prevention checklist

Before merging any commit that adds new hooks or context patterns:

- [ ] Every new `useEffect` deps are primitives or stable refs
- [ ] Every new custom hook returns a stable reference (or wraps with
  useMemo) when inputs are unchanged
- [ ] Every new `setState` inside an effect is gated by a
  comparison or `useRef` to prevent re-firing
- [ ] Run dev mode (`npm run dev`) and click through the touched
  surfaces — strict-mode double-render in dev catches some loops
- [ ] If you added a context provider, make sure `value` is wrapped
  in `useMemo`

The dev server's React strict-mode catches a meaningful fraction of
these before deploy. Use it.

---

## When this skill is NOT the answer

If the page is blank but the console doesn't show error 301:

- Check error 426 (Hydration mismatch) — different cause
- Check for an actual JS exception (TypeError, etc.) higher up in
  the console
- Check if the bundle hash actually changed (BUILD_ID bump
  forgotten → users seeing stale cache, the bug is "old code,"
  not new code)

If the page loads but interaction is buggy, that's not 301 — that's
a different failure mode and this skill won't help.
